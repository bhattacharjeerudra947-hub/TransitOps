-- 20260712000003_rls_policies.sql

-- ==========================================
-- Enable Row Level Security (RLS)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Profiles Policies
-- ==========================================

-- Anyone authenticated can view user profiles
CREATE POLICY select_profiles ON public.profiles
    FOR SELECT TO authenticated USING (true);

-- User can create their own profile, or Fleet Manager can create profiles
CREATE POLICY insert_profiles ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id OR public.get_user_role() = 'fleet_manager');

-- User can update their own profile, or Fleet Manager can update
CREATE POLICY update_profiles ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id OR public.get_user_role() = 'fleet_manager')
    WITH CHECK (auth.uid() = id OR public.get_user_role() = 'fleet_manager');

-- Only Fleet Manager can delete profiles
CREATE POLICY delete_profiles ON public.profiles
    FOR DELETE TO authenticated USING (public.get_user_role() = 'fleet_manager');

-- ==========================================
-- Vehicles Policies
-- ==========================================

-- Fleet Managers and Dispatchers can view vehicles
CREATE POLICY select_vehicles ON public.vehicles
    FOR SELECT TO authenticated USING (public.get_user_role() IN ('fleet_manager', 'dispatcher'));

-- Only Fleet Manager can insert/update/delete vehicles
CREATE POLICY insert_vehicles ON public.vehicles
    FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'fleet_manager');

CREATE POLICY update_vehicles ON public.vehicles
    FOR UPDATE TO authenticated
    USING (public.get_user_role() = 'fleet_manager')
    WITH CHECK (public.get_user_role() = 'fleet_manager');

CREATE POLICY delete_vehicles ON public.vehicles
    FOR DELETE TO authenticated USING (public.get_user_role() = 'fleet_manager');

-- ==========================================
-- Drivers Policies
-- ==========================================

-- Fleet Managers, Dispatchers, and Safety Officers can view drivers
CREATE POLICY select_drivers ON public.drivers
    FOR SELECT TO authenticated USING (public.get_user_role() IN ('fleet_manager', 'dispatcher', 'safety_officer'));

-- Only Fleet Manager can insert/delete drivers
CREATE POLICY insert_drivers ON public.drivers
    FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'fleet_manager');

CREATE POLICY delete_drivers ON public.drivers
    FOR DELETE TO authenticated USING (public.get_user_role() = 'fleet_manager');

-- Fleet Managers and Safety Officers can update drivers (Safety Officer changes are restricted by trigger)
CREATE POLICY update_drivers ON public.drivers
    FOR UPDATE TO authenticated
    USING (public.get_user_role() IN ('fleet_manager', 'safety_officer'))
    WITH CHECK (public.get_user_role() IN ('fleet_manager', 'safety_officer'));

-- ==========================================
-- Trips Policies
-- ==========================================

-- Fleet Managers, Dispatchers, and Financial Analysts can view trips
CREATE POLICY select_trips ON public.trips
    FOR SELECT TO authenticated USING (public.get_user_role() IN ('fleet_manager', 'dispatcher', 'financial_analyst'));

-- Fleet Managers and Dispatchers can insert/update trips
CREATE POLICY insert_trips ON public.trips
    FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('fleet_manager', 'dispatcher'));

CREATE POLICY update_trips ON public.trips
    FOR UPDATE TO authenticated
    USING (public.get_user_role() IN ('fleet_manager', 'dispatcher'))
    WITH CHECK (public.get_user_role() IN ('fleet_manager', 'dispatcher'));

-- Only Fleet Manager can delete trips
CREATE POLICY delete_trips ON public.trips
    FOR DELETE TO authenticated USING (public.get_user_role() = 'fleet_manager');

-- ==========================================
-- Maintenance Policies
-- ==========================================

-- Fleet Managers, Safety Officers, and Financial Analysts can view maintenance logs
CREATE POLICY select_maintenance ON public.maintenance
    FOR SELECT TO authenticated USING (public.get_user_role() IN ('fleet_manager', 'safety_officer', 'financial_analyst'));

-- Fleet Managers and Safety Officers can write/modify maintenance logs
CREATE POLICY insert_maintenance ON public.maintenance
    FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('fleet_manager', 'safety_officer'));

CREATE POLICY update_maintenance ON public.maintenance
    FOR UPDATE TO authenticated
    USING (public.get_user_role() IN ('fleet_manager', 'safety_officer'))
    WITH CHECK (public.get_user_role() IN ('fleet_manager', 'safety_officer'));

CREATE POLICY delete_maintenance ON public.maintenance
    FOR DELETE TO authenticated USING (public.get_user_role() IN ('fleet_manager', 'safety_officer'));

-- ==========================================
-- Fuel Logs Policies
-- ==========================================

-- Fleet Managers and Financial Analysts can view fuel logs
CREATE POLICY select_fuel_logs ON public.fuel_logs
    FOR SELECT TO authenticated USING (public.get_user_role() IN ('fleet_manager', 'financial_analyst'));

-- Only Fleet Manager can write fuel logs
CREATE POLICY insert_fuel_logs ON public.fuel_logs
    FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'fleet_manager');

CREATE POLICY update_fuel_logs ON public.fuel_logs
    FOR UPDATE TO authenticated
    USING (public.get_user_role() = 'fleet_manager')
    WITH CHECK (public.get_user_role() = 'fleet_manager');

CREATE POLICY delete_fuel_logs ON public.fuel_logs
    FOR DELETE TO authenticated USING (public.get_user_role() = 'fleet_manager');

-- ==========================================
-- Expenses Policies
-- ==========================================

-- Fleet Managers and Financial Analysts can view expenses
CREATE POLICY select_expenses ON public.expenses
    FOR SELECT TO authenticated USING (public.get_user_role() IN ('fleet_manager', 'financial_analyst'));

-- Only Fleet Manager can write expenses (Note: system auto-generation runs via SECURITY DEFINER triggers and is exempt from direct write limits)
CREATE POLICY insert_expenses ON public.expenses
    FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'fleet_manager');

CREATE POLICY update_expenses ON public.expenses
    FOR UPDATE TO authenticated
    USING (public.get_user_role() = 'fleet_manager')
    WITH CHECK (public.get_user_role() = 'fleet_manager');

CREATE POLICY delete_expenses ON public.expenses
    FOR DELETE TO authenticated USING (public.get_user_role() = 'fleet_manager');
