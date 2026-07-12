-- 20260712000002_triggers.sql

-- ==========================================
-- Helper Functions & Trigger Templates
-- ==========================================

-- Helper function to get the current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Template trigger function to set updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Auto-update updated_at triggers
-- ==========================================

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
CREATE TRIGGER trg_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
CREATE TRIGGER trg_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
CREATE TRIGGER trg_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
CREATE TRIGGER trg_maintenance_updated_at BEFORE UPDATE ON public.maintenance FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
CREATE TRIGGER trg_fuel_logs_updated_at BEFORE UPDATE ON public.fuel_logs FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- ==========================================
-- Trigger: auth.users sync to public.profiles
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, phone)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'dispatcher'::public.user_role),
    COALESCE(new.phone, new.raw_user_meta_data->>'phone', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- Trigger: Trip status changes (SECURITY DEFINER to bypass RLS for Dispatchers)
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_trip_status_change()
RETURNS trigger AS $$
BEGIN
  -- 1. Dispatching a trip: Sets vehicle and driver to 'on_trip'
  IF new.trip_status = 'dispatched' AND (tg_op = 'INSERT' OR old.trip_status IS DISTINCT FROM 'dispatched') THEN
    UPDATE public.vehicles
    SET status = 'on_trip'
    WHERE id = new.vehicle_id;

    UPDATE public.drivers
    SET status = 'on_trip'
    WHERE id = new.driver_id;
  END IF;

  -- 2. Completing or cancelling a trip: Reverts both to 'available' and updates odometer
  IF new.trip_status IN ('completed', 'cancelled') AND (tg_op = 'INSERT' OR old.trip_status IS DISTINCT FROM new.trip_status) THEN
    UPDATE public.vehicles
    SET status = 'available'
    WHERE id = new.vehicle_id;

    UPDATE public.drivers
    SET status = 'available'
    WHERE id = new.driver_id;

    -- Update vehicle odometer if final_odometer is higher
    IF new.final_odometer IS NOT NULL THEN
      UPDATE public.vehicles
      SET odometer = GREATEST(odometer, new.final_odometer)
      WHERE id = new.vehicle_id AND odometer < new.final_odometer;
    END IF;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_trip_status_change
  AFTER INSERT OR UPDATE ON public.trips
  FOR EACH ROW EXECUTE PROCEDURE public.handle_trip_status_change();

-- ==========================================
-- Trigger: Maintenance status changes (SECURITY DEFINER to bypass RLS for Safety Officers)
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_maintenance_status_change()
RETURNS trigger AS $$
BEGIN
  -- 1. Starting active maintenance: Sets vehicle to 'in_shop'
  IF new.status = 'active' AND (tg_op = 'INSERT' OR old.status IS DISTINCT FROM 'active') THEN
    UPDATE public.vehicles
    SET status = 'in_shop'
    WHERE id = new.vehicle_id;
  END IF;

  -- 2. Completing maintenance: Reverts vehicle to 'available' only if no other active maintenance exists
  IF new.status = 'completed' AND (tg_op = 'INSERT' OR old.status IS DISTINCT FROM 'completed') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.maintenance
      WHERE vehicle_id = new.vehicle_id
        AND status = 'active'
        AND id != new.id
    ) THEN
      UPDATE public.vehicles
      SET status = 'available'
      WHERE id = new.vehicle_id;
    END IF;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_maintenance_status_change
  AFTER INSERT OR UPDATE ON public.maintenance
  FOR EACH ROW EXECUTE PROCEDURE public.handle_maintenance_status_change();

-- ==========================================
-- Triggers: Expense Auto-creation & Lifecycle Sync (SECURITY DEFINER)
-- ==========================================

-- Sync fuel logs to expenses
CREATE OR REPLACE FUNCTION public.sync_fuel_log_to_expense()
RETURNS trigger AS $$
BEGIN
  IF tg_op = 'INSERT' THEN
    INSERT INTO public.expenses (vehicle_id, expense_type, amount, description, expense_date, ref_id)
    VALUES (
      new.vehicle_id,
      'fuel'::public.expense_type,
      new.cost,
      'Fuel Log: ' || new.liters || ' liters',
      new.fuel_date,
      new.id
    );
  ELSIF tg_op = 'UPDATE' THEN
    UPDATE public.expenses
    SET
      vehicle_id = new.vehicle_id,
      amount = new.cost,
      description = 'Fuel Log: ' || new.liters || ' liters',
      expense_date = new.fuel_date
    WHERE ref_id = new.id;
  ELSIF tg_op = 'DELETE' THEN
    DELETE FROM public.expenses WHERE ref_id = old.id;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_fuel_log_to_expense
  AFTER INSERT OR UPDATE OR DELETE ON public.fuel_logs
  FOR EACH ROW EXECUTE PROCEDURE public.sync_fuel_log_to_expense();

-- Sync maintenance records to expenses
CREATE OR REPLACE FUNCTION public.sync_maintenance_to_expense()
RETURNS trigger AS $$
BEGIN
  IF tg_op = 'INSERT' THEN
    INSERT INTO public.expenses (vehicle_id, expense_type, amount, description, expense_date, ref_id)
    VALUES (
      new.vehicle_id,
      'maintenance'::public.expense_type,
      new.maintenance_cost,
      'Maintenance: ' || new.maintenance_type || COALESCE(' - ' || new.description, ''),
      new.start_date,
      new.id
    );
  ELSIF tg_op = 'UPDATE' THEN
    UPDATE public.expenses
    SET
      vehicle_id = new.vehicle_id,
      amount = new.maintenance_cost,
      description = 'Maintenance: ' || new.maintenance_type || COALESCE(' - ' || new.description, ''),
      expense_date = new.start_date
    WHERE ref_id = new.id;
  ELSIF tg_op = 'DELETE' THEN
    DELETE FROM public.expenses WHERE ref_id = old.id;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_maintenance_to_expense
  AFTER INSERT OR UPDATE OR DELETE ON public.maintenance
  FOR EACH ROW EXECUTE PROCEDURE public.sync_maintenance_to_expense();

-- ==========================================
-- Trigger: Enforce Safety Officer Edit Constraints
-- ==========================================

CREATE OR REPLACE FUNCTION public.restrict_driver_update_for_safety_officer()
RETURNS trigger AS $$
DECLARE
  current_role public.user_role;
BEGIN
  -- Retrieve current user role
  current_role := public.get_user_role();

  IF current_role = 'safety_officer' THEN
    -- Check if any column other than safety_score or updated_at is changed
    IF (new.id IS DISTINCT FROM old.id) OR
       (new.name IS DISTINCT FROM old.name) OR
       (new.license_number IS DISTINCT FROM old.license_number) OR
       (new.license_category IS DISTINCT FROM old.license_category) OR
       (new.license_expiry_date IS DISTINCT FROM old.license_expiry_date) OR
       (new.phone IS DISTINCT FROM old.phone) OR
       (new.status IS DISTINCT FROM old.status) OR
       (new.created_at IS DISTINCT FROM old.created_at) THEN
      RAISE EXCEPTION 'Permission Denied: Safety Officers are restricted to modifying safety_score only on drivers.';
    END IF;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_restrict_driver_update_safety_officer
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE PROCEDURE public.restrict_driver_update_for_safety_officer();
