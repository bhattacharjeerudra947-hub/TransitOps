-- 20260712000000_extensions_and_enums.sql

-- Enable pgcrypto for gen_random_uuid() (standard, but safe to verify)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create User Role enum
CREATE TYPE public.user_role AS ENUM (
    'fleet_manager',
    'dispatcher',
    'safety_officer',
    'financial_analyst'
);

-- Create Vehicle Status enum
CREATE TYPE public.vehicle_status AS ENUM (
    'available',
    'on_trip',
    'in_shop',
    'retired'
);

-- Create Driver Status enum
CREATE TYPE public.driver_status AS ENUM (
    'available',
    'on_trip',
    'off_duty',
    'suspended'
);

-- Create Trip Status enum
CREATE TYPE public.trip_status AS ENUM (
    'draft',
    'dispatched',
    'completed',
    'cancelled'
);

-- Create Maintenance Status enum
CREATE TYPE public.maintenance_status AS ENUM (
    'active',
    'completed'
);

-- Create Expense Type enum
CREATE TYPE public.expense_type AS ENUM (
    'fuel',
    'maintenance',
    'toll',
    'parking',
    'repair',
    'insurance'
);
