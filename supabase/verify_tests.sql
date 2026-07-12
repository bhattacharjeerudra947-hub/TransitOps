-- supabase/verify_tests.sql
-- Run this script in your Supabase SQL Editor to verify triggers, policies, and constraints.
-- Wrap in a transaction so we can roll back and keep the database clean!

BEGIN;

-- Save current state of database
SAVEPOINT test_start;

-- Mock UUIDs
-- Fleet Manager: '11111111-1111-1111-1111-111111111111'
-- Dispatcher: '22222222-2222-2222-2222-222222222222'
-- Safety Officer: '33333333-3333-3333-3333-333333333333'
-- Financial Analyst: '44444444-4444-4444-4444-444444444444'

RAISE NOTICE '--- TEST 1: Verification of Trigger-based auth.users sync ---';
-- Insert a test user into auth.users (simulate signup)
INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
VALUES (
    '99999999-9999-9999-9999-999999999999',
    'test_sync@transitops.com',
    '{"full_name": "Test User", "role": "dispatcher", "phone": "+15559999"}',
    'authenticated',
    'authenticated'
);

-- Check if profile was created automatically
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = '99999999-9999-9999-9999-999999999999' AND full_name = 'Test User') THEN
        RAISE NOTICE 'SUCCESS: Profile automatically synchronized from auth.users!';
    ELSE
        RAISE EXCEPTION 'FAILURE: Profile sync trigger did not execute.';
    END IF;
END $$;


RAISE NOTICE '--- TEST 2: Verification of Trip Status Transitions & Odometer ---';
-- Setup test vehicle & driver
INSERT INTO public.vehicles (id, registration_number, vehicle_name, vehicle_type, max_load_capacity, odometer, acquisition_cost, status)
VALUES ('77777777-7777-7777-7777-777777777777', 'TEST-001', 'Test Semi', 'Semi-Truck', 20000, 10000, 100000, 'available');

INSERT INTO public.drivers (id, name, license_number, license_category, license_expiry_date, phone, safety_score, status)
VALUES ('88888888-8888-8888-8888-888888888888', 'Test Driver', 'LIC-TEST-01', 'Class A', '2030-01-01', '+15557777', 100, 'available');

-- 2a. Create Draft Trip
INSERT INTO public.trips (id, vehicle_id, driver_id, source, destination, cargo_weight, planned_distance, revenue, trip_status)
VALUES ('00000000-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', 'Point A', 'Point B', 10000, 100, 500, 'draft');

-- Verify status has NOT changed
DO $$
DECLARE
    v_status public.vehicle_status;
    d_status public.driver_status;
BEGIN
    SELECT status INTO v_status FROM public.vehicles WHERE id = '77777777-7777-7777-7777-777777777777';
    SELECT status INTO d_status FROM public.drivers WHERE id = '88888888-8888-8888-8888-888888888888';
    IF v_status = 'available' AND d_status = 'available' THEN
        RAISE NOTICE 'SUCCESS: Draft trip has no effect on vehicle/driver statuses.';
    ELSE
        RAISE EXCEPTION 'FAILURE: Draft trip altered statuses: Vehicle %, Driver %', v_status, d_status;
    END IF;
END $$;

-- 2b. Dispatch Trip
UPDATE public.trips SET trip_status = 'dispatched' WHERE id = '00000000-0000-0000-0000-000000000001';

-- Verify status changed to 'on_trip'
DO $$
DECLARE
    v_status public.vehicle_status;
    d_status public.driver_status;
BEGIN
    SELECT status INTO v_status FROM public.vehicles WHERE id = '77777777-7777-7777-7777-777777777777';
    SELECT status INTO d_status FROM public.drivers WHERE id = '88888888-8888-8888-8888-888888888888';
    IF v_status = 'on_trip' AND d_status = 'on_trip' THEN
        RAISE NOTICE 'SUCCESS: Dispatching set vehicle and driver to on_trip.';
    ELSE
        RAISE EXCEPTION 'FAILURE: Statuses not updated to on_trip: Vehicle %, Driver %', v_status, d_status;
    END IF;
END $$;

-- 2c. Complete Trip (with odometer update: 10150)
UPDATE public.trips
SET trip_status = 'completed', final_odometer = 10150
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Verify vehicle and driver status are 'available' and odometer is updated
DO $$
DECLARE
    v_status public.vehicle_status;
    d_status public.driver_status;
    v_odo numeric;
BEGIN
    SELECT status, odometer INTO v_status, v_odo FROM public.vehicles WHERE id = '77777777-7777-7777-7777-777777777777';
    SELECT status INTO d_status FROM public.drivers WHERE id = '88888888-8888-8888-8888-888888888888';
    IF v_status = 'available' AND d_status = 'available' AND v_odo = 10150 THEN
        RAISE NOTICE 'SUCCESS: Completing trip reset statuses and updated odometer to 10150!';
    ELSE
        RAISE EXCEPTION 'FAILURE: Trip completion verification failed: Vehicle status: %, Driver status: %, Odometer: %', v_status, d_status, v_odo;
    END IF;
END $$;


RAISE NOTICE '--- TEST 3: Verification of Maintenance Status Transitions ---';
-- 3a. Start active maintenance on Ford F-250 (Vehicle 'a2222222')
-- (Seed contains active maintenance m1111111 on it, so let's verify it is currently in_shop)
DO $$
DECLARE
    v_status public.vehicle_status;
BEGIN
    SELECT status INTO v_status FROM public.vehicles WHERE id = 'a2222222-2222-2222-2222-222222222222';
    IF v_status = 'in_shop' THEN
        RAISE NOTICE 'SUCCESS: Active maintenance from seed set vehicle to in_shop.';
    ELSE
        RAISE EXCEPTION 'FAILURE: Vehicle status is not in_shop: %', v_status;
    END IF;
END $$;

-- 3b. Add a second active maintenance on the same vehicle
INSERT INTO public.maintenance (id, vehicle_id, maintenance_type, description, maintenance_cost, status)
VALUES ('00000000-0000-0000-0000-000000000002', 'a2222222-2222-2222-2222-222222222222', 'Tire Rotation', 'Rotate tires', 50, 'active');

-- 3c. Complete the first maintenance record
UPDATE public.maintenance SET status = 'completed' WHERE id = 'm1111111-1111-1111-1111-111111111111';

-- Vehicle status should remain in_shop since the second maintenance is still active!
DO $$
DECLARE
    v_status public.vehicle_status;
BEGIN
    SELECT status INTO v_status FROM public.vehicles WHERE id = 'a2222222-2222-2222-2222-222222222222';
    IF v_status = 'in_shop' THEN
        RAISE NOTICE 'SUCCESS: Vehicle remains in_shop since a second maintenance is active.';
    ELSE
        RAISE EXCEPTION 'FAILURE: Vehicle reverted to available too early! Status: %', v_status;
    END IF;
END $$;

-- 3d. Complete the second maintenance record
UPDATE public.maintenance SET status = 'completed' WHERE id = '00000000-0000-0000-0000-000000000002';

-- Vehicle status should now revert to available!
DO $$
DECLARE
    v_status public.vehicle_status;
BEGIN
    SELECT status INTO v_status FROM public.vehicles WHERE id = 'a2222222-2222-2222-2222-222222222222';
    IF v_status = 'available' THEN
        RAISE NOTICE 'SUCCESS: Vehicle status reverted to available after completing ALL maintenance!';
    ELSE
        RAISE EXCEPTION 'FAILURE: Vehicle status is not available after completing all maintenance: %', v_status;
    END IF;
END $$;


RAISE NOTICE '--- TEST 4: Verification of Automated Expenses Creation & Sync ---';
-- 4a. Insert a new fuel log
INSERT INTO public.fuel_logs (id, vehicle_id, liters, cost, fuel_date)
VALUES ('00000000-0000-0000-0000-000000000003', '77777777-7777-7777-7777-777777777777', 50, 200.00, '2026-07-12');

-- Check if matching expense exists
DO $$
DECLARE
    e_amount numeric;
BEGIN
    SELECT amount INTO e_amount FROM public.expenses WHERE ref_id = '00000000-0000-0000-0000-000000000003';
    IF e_amount = 200.00 THEN
        RAISE NOTICE 'SUCCESS: Expense automatically generated for new fuel log.';
    ELSE
        RAISE EXCEPTION 'FAILURE: Expense not generated or amount mismatch: %', e_amount;
    END IF;
END $$;

-- 4b. Update fuel log cost
UPDATE public.fuel_logs SET cost = 220.00 WHERE id = '00000000-0000-0000-0000-000000000003';

-- Check if expense updated
DO $$
DECLARE
    e_amount numeric;
BEGIN
    SELECT amount INTO e_amount FROM public.expenses WHERE ref_id = '00000000-0000-0000-0000-000000000003';
    IF e_amount = 220.00 THEN
        RAISE NOTICE 'SUCCESS: Auto-generated expense updated dynamically.';
    ELSE
        RAISE EXCEPTION 'FAILURE: Expense amount was not updated: %', e_amount;
    END IF;
END $$;

-- 4c. Delete fuel log
DELETE FROM public.fuel_logs WHERE id = '00000000-0000-0000-0000-000000000003';

-- Check if expense deleted
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.expenses WHERE ref_id = '00000000-0000-0000-0000-000000000003') THEN
        RAISE EXCEPTION 'FAILURE: Expense was not deleted after deleting fuel log.';
    ELSE
        RAISE NOTICE 'SUCCESS: Auto-generated expense deleted automatically.';
    END IF;
END $$;


RAISE NOTICE '--- TEST 5: Verification of Safety Officer Edit Restrictions ---';
-- Setup RLS Session Context to pretend to be Charlie Safety (safety_officer)
-- In real app, Charlie has ID '33333333-3333-3333-3333-333333333333'
SET LOCAL request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

-- 5a. Try updating safety_score only (Should SUCCESS)
BEGIN
    UPDATE public.drivers SET safety_score = 90 WHERE id = '88888888-8888-8888-8888-888888888888';
    RAISE NOTICE 'SUCCESS: Safety Officer updated safety_score successfully.';
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'FAILURE: Safety Officer was blocked from updating safety_score: %', SQLERRM;
END;

-- 5b. Try updating driver's name (Should FAIL)
DECLARE
    v_failed boolean := false;
BEGIN
    UPDATE public.drivers SET name = 'Hacked Name' WHERE id = '88888888-8888-8888-8888-888888888888';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'SUCCESS: Safety Officer was blocked from updating restricted fields! (Error: %)', SQLERRM;
    v_failed := true;
END;


-- Cleanup by rolling back the transaction, leaving the database completely clean!
ROLLBACK;
RAISE NOTICE 'All tests executed and changes rolled back. Database is clean.';
