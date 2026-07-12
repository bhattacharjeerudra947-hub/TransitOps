-- 20260712000001_tables_and_indexes.sql

-- 1. Profiles Table (linked to auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role public.user_role NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Vehicles Table
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_number TEXT UNIQUE NOT NULL,
    vehicle_name TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    max_load_capacity NUMERIC NOT NULL CHECK (max_load_capacity > 0),
    odometer NUMERIC NOT NULL DEFAULT 0 CHECK (odometer >= 0),
    acquisition_cost NUMERIC NOT NULL CHECK (acquisition_cost >= 0),
    status public.vehicle_status NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Drivers Table
CREATE TABLE public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    license_number TEXT UNIQUE NOT NULL,
    license_category TEXT NOT NULL,
    license_expiry_date DATE NOT NULL,
    phone TEXT,
    safety_score NUMERIC DEFAULT 100 CHECK (safety_score >= 0 AND safety_score <= 100),
    status public.driver_status NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Trips Table
CREATE TABLE public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES public.vehicles ON DELETE RESTRICT NOT NULL,
    driver_id UUID REFERENCES public.drivers ON DELETE RESTRICT NOT NULL,
    source TEXT NOT NULL,
    destination TEXT NOT NULL,
    cargo_weight NUMERIC NOT NULL CHECK (cargo_weight > 0),
    planned_distance NUMERIC NOT NULL CHECK (planned_distance > 0),
    revenue NUMERIC NOT NULL DEFAULT 0 CHECK (revenue >= 0),
    trip_status public.trip_status NOT NULL DEFAULT 'draft',
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    final_odometer NUMERIC CHECK (final_odometer >= 0),
    fuel_used NUMERIC CHECK (fuel_used >= 0),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    -- Add a check that final_odometer is specified on completion and is valid
    CONSTRAINT check_trip_dates CHECK (
        (start_time IS NULL OR end_time IS NULL) OR (start_time <= end_time)
    )
);

-- 5. Maintenance Table
CREATE TABLE public.maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES public.vehicles ON DELETE CASCADE NOT NULL,
    maintenance_type TEXT NOT NULL,
    description TEXT,
    maintenance_cost NUMERIC NOT NULL DEFAULT 0 CHECK (maintenance_cost >= 0),
    status public.maintenance_status NOT NULL DEFAULT 'active',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    -- Check that end date is after start date
    CONSTRAINT check_maintenance_dates CHECK (
        (start_date IS NULL OR end_date IS NULL) OR (start_date <= end_date)
    )
);

-- 6. Fuel Logs Table
CREATE TABLE public.fuel_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES public.vehicles ON DELETE CASCADE NOT NULL,
    trip_id UUID REFERENCES public.trips ON DELETE SET NULL,
    liters NUMERIC NOT NULL CHECK (liters > 0),
    cost NUMERIC NOT NULL CHECK (cost >= 0),
    fuel_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 7. Expenses Table
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES public.vehicles ON DELETE CASCADE NOT NULL,
    expense_type public.expense_type NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    description TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    ref_id UUID, -- For linking automated expenses
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for performance on FKs and frequently filtered columns

-- Profiles Indexes
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Vehicles Indexes
CREATE INDEX idx_vehicles_status ON public.vehicles(status);
CREATE INDEX idx_vehicles_registration_number ON public.vehicles(registration_number);

-- Drivers Indexes
CREATE INDEX idx_drivers_status ON public.drivers(status);
CREATE INDEX idx_drivers_license_number ON public.drivers(license_number);

-- Trips Indexes
CREATE INDEX idx_trips_vehicle_id ON public.trips(vehicle_id);
CREATE INDEX idx_trips_driver_id ON public.trips(driver_id);
CREATE INDEX idx_trips_trip_status ON public.trips(trip_status);
CREATE INDEX idx_trips_start_time ON public.trips(start_time);

-- Maintenance Indexes
CREATE INDEX idx_maintenance_vehicle_id ON public.maintenance(vehicle_id);
CREATE INDEX idx_maintenance_status ON public.maintenance(status);

-- Fuel Logs Indexes
CREATE INDEX idx_fuel_logs_vehicle_id ON public.fuel_logs(vehicle_id);
CREATE INDEX idx_fuel_logs_trip_id ON public.fuel_logs(trip_id);

-- Expenses Indexes
CREATE INDEX idx_expenses_vehicle_id ON public.expenses(vehicle_id);
CREATE INDEX idx_expenses_expense_type ON public.expenses(expense_type);
CREATE INDEX idx_expenses_ref_id ON public.expenses(ref_id);
CREATE INDEX idx_expenses_expense_date ON public.expenses(expense_date);
