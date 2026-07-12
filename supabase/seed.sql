-- supabase/seed.sql

-- Clear any existing seed data (with CASCADE to clean dependants)
DELETE FROM auth.users WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444'
);
DELETE FROM public.vehicles CASCADE;
DELETE FROM public.drivers CASCADE;

-- ==========================================================
-- 1. Seed Auth Users (will automatically trigger profiles sync)
-- ==========================================================

-- Standard Supabase Auth encryption for password "password123"
-- Encrypted password: '$2a$10$w8.jE1kI1i/89pQj20gUie62P20e.Z.1yG265.L2xH/67pP42m66O'
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'manager@transitops.com',
    '$2a$10$w8.jE1kI1i/89pQj20gUie62P20e.Z.1yG265.L2xH/67pP42m66O',
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Alice Manager", "role": "fleet_manager", "phone": "+15550101"}',
    'authenticated',
    'authenticated'
),
(
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'dispatcher@transitops.com',
    '$2a$10$w8.jE1kI1i/89pQj20gUie62P20e.Z.1yG265.L2xH/67pP42m66O',
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Bob Dispatcher", "role": "dispatcher", "phone": "+15550102"}',
    'authenticated',
    'authenticated'
),
(
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'safety@transitops.com',
    '$2a$10$w8.jE1kI1i/89pQj20gUie62P20e.Z.1yG265.L2xH/67pP42m66O',
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Charlie Safety", "role": "safety_officer", "phone": "+15550103"}',
    'authenticated',
    'authenticated'
),
(
    '44444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'analyst@transitops.com',
    '$2a$10$w8.jE1kI1i/89pQj20gUie62P20e.Z.1yG265.L2xH/67pP42m66O',
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Diana Analyst", "role": "financial_analyst", "phone": "+15550104"}',
    'authenticated',
    'authenticated'
);

-- ==========================================================
-- 2. Seed Vehicles
-- ==========================================================
INSERT INTO public.vehicles (id, registration_number, vehicle_name, vehicle_type, max_load_capacity, odometer, acquisition_cost, status)
VALUES
(
    'a1111111-1111-1111-1111-111111111111',
    'TX-9087',
    'Peterbilt 579 Semi-Truck',
    'Semi-Truck',
    20000.0,
    15000.0,
    120000.00,
    'available'
),
(
    'a2222222-2222-2222-2222-222222222222',
    'CA-5564',
    'Ford F-250 Super Duty',
    'Pickup',
    3000.0,
    42000.0,
    45000.00,
    'available' -- started as available, maintenance will set to in_shop
),
(
    'a3333333-3333-3333-3333-333333333333',
    'NY-3321',
    'Freightliner Cascadia',
    'Semi-Truck',
    22000.0,
    85000.0,
    135000.00,
    'available' -- started as available, active trip will set to on_trip
),
(
    'a4444444-4444-4444-4444-444444444444',
    'FL-1122',
    'Volvo VNL 860',
    'Semi-Truck',
    21000.0,
    120000.0,
    110000.00,
    'retired'
);

-- ==========================================================
-- 3. Seed Drivers
-- ==========================================================
INSERT INTO public.drivers (id, name, license_number, license_category, license_expiry_date, phone, safety_score, status)
VALUES
(
    'd1111111-1111-1111-1111-111111111111',
    'John Doe',
    'DL-998877',
    'Class A CDL',
    '2028-05-15',
    '+15559901',
    95.0,
    'available'
),
(
    'd2222222-2222-2222-2222-222222222222',
    'Jane Smith',
    'DL-665544',
    'Class A CDL',
    '2029-10-20',
    '+15559902',
    98.0,
    'available' -- started as available, active trip will set to on_trip
),
(
    'd3333333-3333-3333-3333-333333333333',
    'Mike Johnson',
    'DL-223344',
    'Class B CDL',
    '2027-03-01',
    '+15559903',
    80.0,
    'off_duty'
),
(
    'd4444444-4444-4444-4444-444444444444',
    'Robert Miller',
    'DL-112233',
    'Class A CDL',
    '2027-08-11',
    '+15559904',
    72.0,
    'suspended'
);

-- ==========================================================
-- 4. Seed Trips
-- ==========================================================

-- Completed Trip: Odometer was 14500 when started, vehicle odometer will not change here since it's already 15000
INSERT INTO public.trips (id, vehicle_id, driver_id, source, destination, cargo_weight, planned_distance, revenue, trip_status, start_time, end_time, final_odometer, fuel_used)
VALUES
(
    't1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'd1111111-1111-1111-1111-111111111111',
    'Dallas, TX',
    'Houston, TX',
    18000.0,
    240.0,
    1200.00,
    'completed',
    now() - interval '2 days',
    now() - interval '2 days' + interval '5 hours',
    14740.0, -- final_odometer is less than vehicle's current 15000, so vehicle odometer stays 15000
    45.0
);

-- Active Trip: This will trigger the vehicle (a3333333) and driver (d2222222) status to change to 'on_trip'
INSERT INTO public.trips (id, vehicle_id, driver_id, source, destination, cargo_weight, planned_distance, revenue, trip_status, start_time)
VALUES
(
    't2222222-2222-2222-2222-222222222222',
    'a3333333-3333-3333-3333-333333333333',
    'd2222222-2222-2222-2222-222222222222',
    'Los Angeles, CA',
    'Phoenix, AZ',
    21000.0,
    370.0,
    1800.00,
    'dispatched',
    now() - interval '5 hours'
);

-- Draft Trip: No changes to vehicles/drivers
INSERT INTO public.trips (id, vehicle_id, driver_id, source, destination, cargo_weight, planned_distance, revenue, trip_status)
VALUES
(
    't3333333-3333-3333-3333-333333333333',
    'a1111111-1111-1111-1111-111111111111',
    'd1111111-1111-1111-1111-111111111111',
    'Chicago, IL',
    'Detroit, MI',
    15000.0,
    280.0,
    1400.00,
    'draft'
);

-- ==========================================================
-- 5. Seed Maintenance
-- ==========================================================

-- Completed Maintenance: No change to vehicle status (stays 'available' or whatever it was)
INSERT INTO public.maintenance (id, vehicle_id, maintenance_type, description, maintenance_cost, status, start_date, end_date)
VALUES
(
    'm2222222-2222-2222-2222-222222222222',
    'a1111111-1111-1111-1111-111111111111',
    'Brake Replacement',
    'Replaced front axle brake pads',
    800.00,
    'completed',
    current_date - 10,
    current_date - 9
);

-- Active Maintenance: This will trigger the vehicle (a2222222) status to change to 'in_shop'
INSERT INTO public.maintenance (id, vehicle_id, maintenance_type, description, maintenance_cost, status, start_date)
VALUES
(
    'm1111111-1111-1111-1111-111111111111',
    'a2222222-2222-2222-2222-222222222222',
    'Engine Oil Change & Filter',
    'Routine 40k engine maintenance',
    150.00,
    'active',
    current_date
);

-- ==========================================================
-- 6. Seed Fuel Logs
-- ==========================================================

-- Inserting this fuel log will automatically trigger the creation of a matching expense of type 'fuel'
INSERT INTO public.fuel_logs (id, vehicle_id, trip_id, liters, cost, fuel_date)
VALUES
(
    'f1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    't1111111-1111-1111-1111-111111111111',
    45.0,
    180.00,
    current_date - 2
);

-- ==========================================================
-- 7. Seed Standalone Expenses (Not auto-created by triggers)
-- ==========================================================
INSERT INTO public.expenses (id, vehicle_id, expense_type, amount, description, expense_date)
VALUES
(
    'e1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'insurance',
    1200.00,
    'Annual commercial vehicle insurance premium',
    current_date - 15
),
(
    'e2222222-2222-2222-2222-222222222222',
    'a3333333-3333-3333-3333-333333333333',
    'toll',
    35.50,
    'I-80 Toll highway fees',
    current_date - 1
);
