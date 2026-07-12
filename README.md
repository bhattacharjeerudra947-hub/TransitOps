# TransitOps - Fleet Management Backend

TransitOps is a full-stack transport and fleet management system designed to simplify and digitize daily logistics operations. This directory contains the complete Supabase backend database schema, enums, triggers, RLS policies, and seed data.

---

## Schema Architecture

The backend database consists of **7 main tables** (plus Supabase's built-in `auth.users`), using UUID primary keys (`gen_random_uuid()`), and fully normalized relationships:

```mermaid
erDiagram
    auth_users ||--|| profiles : "1:1 Link (id)"
    vehicles ||--o{ trips : "1:N (vehicle_id)"
    vehicles ||--o{ maintenance : "1:N (vehicle_id)"
    vehicles ||--o{ fuel_logs : "1:N (vehicle_id)"
    vehicles ||--o{ expenses : "1:N (vehicle_id)"
    drivers ||--o{ trips : "1:N (driver_id)"
    trips ||--o{ fuel_logs : "1:N (trip_id)"
    
    profiles {
        uuid id PK
        text email UNIQUE
        text full_name
        user_role role
        text phone
        timestamptz created_at
        timestamptz updated_at
    }
    
    vehicles {
        uuid id PK
        text registration_number UNIQUE
        text vehicle_name
        text vehicle_type
        numeric max_load_capacity
        numeric odometer
        numeric acquisition_cost
        vehicle_status status
        timestamptz created_at
        timestamptz updated_at
    }
    
    drivers {
        uuid id PK
        text name
        text license_number UNIQUE
        text license_category
        date license_expiry_date
        text phone
        numeric safety_score
        driver_status status
        timestamptz created_at
        timestamptz updated_at
    }
    
    trips {
        uuid id PK
        uuid vehicle_id FK
        uuid driver_id FK
        text source
        text destination
        numeric cargo_weight
        numeric planned_distance
        numeric revenue
        trip_status trip_status
        timestamptz start_time
        timestamptz end_time
        numeric final_odometer
        numeric fuel_used
        timestamptz created_at
        timestamptz updated_at
    }
    
    maintenance {
        uuid id PK
        uuid vehicle_id FK
        text maintenance_type
        text description
        numeric maintenance_cost
        maintenance_status status
        date start_date
        date end_date
        timestamptz created_at
        timestamptz updated_at
    }
    
    fuel_logs {
        uuid id PK
        uuid vehicle_id FK
        uuid trip_id FK
        numeric liters
        numeric cost
        date fuel_date
        timestamptz created_at
        timestamptz updated_at
    }
    
    expenses {
        uuid id PK
        uuid vehicle_id FK
        expense_type expense_type
        numeric amount
        text description
        date expense_date
        uuid ref_id
        timestamptz created_at
        timestamptz updated_at
    }
```

---

## User Roles & Row Level Security (RLS)

Four specific user roles are enforced at the database level via Postgres RLS policies:
1. **Fleet Manager (`fleet_manager`)**: Complete read/write access to all tables.
2. **Dispatcher (`dispatcher`)**: Can read vehicles/drivers and create/update trips.
3. **Safety Officer (`safety_officer`)**: Can read drivers/maintenance, write to maintenance, and update drivers' `safety_score` (other columns are restricted).
4. **Financial Analyst (`financial_analyst`)**: Read-only access to expenses, fuel logs, and trip revenue/cost data. No write access to operational data.

### RLS Permissions Matrix

| Table | Fleet Manager | Dispatcher | Safety Officer | Financial Analyst | Users (Self) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **profiles** | CRUD | — | — | — | Read (All) / Update (Self) |
| **vehicles** | CRUD | Read | — | — | — |
| **drivers** | CRUD | Read | Read / Update* | — | — |
| **trips** | CRUD | Create / Update | — | Read | — |
| **maintenance** | CRUD | — | CRUD | Read | — |
| **fuel_logs** | CRUD | — | — | Read | — |
| **expenses** | CRUD | — | — | Read | — |

> [!NOTE]
> `*` Safety Officers can only modify the `safety_score` field on driver records. An active trigger blocks updates to other fields.

---

## Trigger-Based Business Logic

The backend includes several triggers to automate state management and maintain financial logs:

1. **Odometer & Trip Dispatches**:
   - Dispatching a trip (`trip_status` -> `'dispatched'`) sets the vehicle and driver status to `'on_trip'`.
   - Completing or cancelling a trip sets both vehicle and driver to `'available'`.
   - Completing a trip updates the vehicle's `odometer` if the trip's `final_odometer` is higher than the vehicle's current odometer.
2. **Maintenance Status**:
   - Starting active maintenance sets the vehicle status to `'in_shop'`.
   - Completing maintenance sets the vehicle status back to `'available'` **only if no other maintenance records for that vehicle remain active**.
3. **Auto-Populating Expenses**:
   - Creating a `fuel_logs` entry auto-creates an expense of type `'fuel'`.
   - Creating a `maintenance` entry auto-creates an expense of type `'maintenance'`.
   - Updating or deleting these entries automatically syncs or removes the corresponding expense record.
4. **Safety Score Restrict**:
   - Restricts Safety Officers from modifying any columns on `drivers` other than `safety_score` (and `updated_at`).

---

## How to Run Migrations via Supabase CLI

### Prerequisites
- Node.js installed.
- Supabase CLI installed (runnable via `npx`).

### Local Development Setup

1. **Initialize Supabase**:
   If starting from scratch in this repository:
   ```bash
   npx supabase init
   ```

2. **Start Local Supabase Environment**:
   Ensure Docker is running on your machine:
   ```bash
   npx supabase start
   ```

3. **Apply Migrations**:
   The migrations in `supabase/migrations` will automatically apply when the database starts. If you have a running instance and want to reset it:
   ```bash
   npx supabase db reset
   ```
   This command resets the local database, applies all migration files in order, and populates the database using `supabase/seed.sql`.

4. **Verify Database Status**:
   ```bash
   npx supabase status
   ```

---

## Design Assumptions

1. **Security Definer Triggers**: Helper triggers (such as updating vehicle status upon dispatching a trip) are executed as `SECURITY DEFINER`. This is necessary because dispatchers have no direct update permissions on `vehicles`, but dispatching a trip must update the vehicle's state.
2. **Delete Behaviors**:
   - Deleting a vehicle deletes all its logs and expenses (`ON DELETE CASCADE`), but you cannot delete a vehicle with active trips (`ON DELETE RESTRICT`).
   - Deleting a driver with active trips is blocked (`ON DELETE RESTRICT`).
   - Deleting a trip will set its reference on fuel logs to NULL (`ON DELETE SET NULL`), preserving the fuel log and its corresponding expense as historic records.
3. **Sign-up Profile Sync**: When a user registers through Supabase auth, their profile is automatically generated in `public.profiles` via a trigger. If no role is passed in the signup metadata, it defaults to `dispatcher`.
