import { supabase } from '../supabaseClient';
import { canAssignVehicle, canAssignDriver, isWithinLoadCapacity, SYSTEM_DATE } from '../utils/rules';

// ==========================================================
// 1. Enum & Data Mapping Utilities (Frontend <-> DB Converter)
// ==========================================================

// Map Supabase snake_case roles to UI display text
export const mapDbRoleToFrontend = (role) => {
  switch (role) {
    case 'fleet_manager': return 'Fleet Manager';
    case 'dispatcher': return 'Driver';
    case 'safety_officer': return 'Safety Officer';
    case 'financial_analyst': return 'Financial Analyst';
    default: return role;
  }
};

// Map UI display text roles to database snake_case
export const mapFrontendRoleToDb = (role) => {
  switch (role) {
    case 'Fleet Manager': return 'fleet_manager';
    case 'Driver': return 'dispatcher';
    case 'Safety Officer': return 'safety_officer';
    case 'Financial Analyst': return 'financial_analyst';
    default: return 'dispatcher';
  }
};

// Map vehicle status (lower_case <-> Title Case)
const mapDbVehicleStatusToFrontend = (status) => {
  if (status === 'on_trip') return 'On Trip';
  if (status === 'in_shop') return 'In Shop';
  return status.charAt(0).toUpperCase() + status.slice(1); // available, retired
};

const mapFrontendVehicleStatusToDb = (status) => {
  if (status === 'On Trip') return 'on_trip';
  if (status === 'In Shop') return 'in_shop';
  return status.toLowerCase(); // available, retired
};

// Map driver status (lower_case <-> Title Case)
const mapDbDriverStatusToFrontend = (status) => {
  if (status === 'on_trip') return 'On Trip';
  if (status === 'off_duty') return 'Off Duty';
  return status.charAt(0).toUpperCase() + status.slice(1); // available, suspended
};

const mapFrontendDriverStatusToDb = (status) => {
  if (status === 'On Trip') return 'on_trip';
  if (status === 'Off Duty') return 'off_duty';
  return status.toLowerCase(); // available, suspended
};

// Map trip status (lower_case <-> Title Case)
const mapDbTripStatusToFrontend = (status) => {
  return status.charAt(0).toUpperCase() + status.slice(1); // draft, dispatched, completed, cancelled
};

const mapFrontendTripStatusToDb = (status) => {
  return status.toLowerCase(); // draft, dispatched, completed, cancelled
};

// Map vehicle details (including [Region] virtual field in name)
const mapVehicleFromDb = (dbVeh) => {
  if (!dbVeh) return null;
  let region = 'North';
  let name = dbVeh.vehicle_name;
  const match = dbVeh.vehicle_name.match(/^\[(North|South|East|West)\]\s*(.*)$/);
  if (match) {
    region = match[1];
    name = match[2];
  }
  return {
    id: dbVeh.id,
    regNumber: dbVeh.registration_number,
    name: name,
    type: dbVeh.vehicle_type,
    maxLoadKg: Number(dbVeh.max_load_capacity),
    odometer: Number(dbVeh.odometer),
    acquisitionCost: Number(dbVeh.acquisition_cost),
    status: mapDbVehicleStatusToFrontend(dbVeh.status),
    region: region
  };
};

const mapVehicleToDb = (feVeh) => {
  if (!feVeh) return null;
  const nameDb = `[${feVeh.region || 'North'}] ${feVeh.name}`;
  return {
    registration_number: feVeh.regNumber,
    vehicle_name: nameDb,
    vehicle_type: feVeh.type,
    max_load_capacity: Number(feVeh.maxLoadKg),
    odometer: Number(feVeh.odometer),
    acquisition_cost: Number(feVeh.acquisitionCost),
    status: mapFrontendVehicleStatusToDb(feVeh.status)
  };
};

// Map driver details
const mapDriverFromDb = (dbDrv) => {
  if (!dbDrv) return null;
  return {
    id: dbDrv.id,
    name: dbDrv.name,
    licenseNumber: dbDrv.license_number,
    licenseCategory: dbDrv.license_category,
    licenseExpiryDate: dbDrv.license_expiry_date,
    contactNumber: dbDrv.phone || '',
    safetyScore: Number(dbDrv.safety_score),
    status: mapDbDriverStatusToFrontend(dbDrv.status)
  };
};

const mapDriverToDb = (feDrv) => {
  if (!feDrv) return null;
  return {
    name: feDrv.name,
    license_number: feDrv.licenseNumber,
    license_category: feDrv.licenseCategory,
    license_expiry_date: feDrv.licenseExpiryDate,
    phone: feDrv.contactNumber,
    safety_score: Number(feDrv.safetyScore),
    status: mapFrontendDriverStatusToDb(feDrv.status)
  };
};

// Map Trip Details
const mapTripFromDb = (dbTrp) => {
  if (!dbTrp) return null;
  return {
    id: dbTrp.id,
    vehicleId: dbTrp.vehicle_id,
    driverId: dbTrp.driver_id,
    source: dbTrp.source,
    destination: dbTrp.destination,
    cargoWeightKg: Number(dbTrp.cargo_weight),
    plannedDistanceKm: Number(dbTrp.planned_distance),
    actualDistanceKm: Number(dbTrp.final_odometer ? dbTrp.final_odometer - (dbTrp.final_odometer - dbTrp.planned_distance) : 0), // virtual estimate
    fuelConsumed: Number(dbTrp.fuel_used || 0),
    status: mapDbTripStatusToFrontend(dbTrp.trip_status),
    createdAt: dbTrp.created_at,
    completedAt: dbTrp.end_time,
    revenue: Number(dbTrp.revenue)
  };
};

// Map Maintenance Logs
const mapMaintenanceFromDb = (dbMaint) => {
  if (!dbMaint) return null;
  return {
    id: dbMaint.id,
    vehicleId: dbMaint.vehicle_id,
    type: dbMaint.maintenance_type,
    description: dbMaint.description || '',
    cost: Number(dbMaint.maintenance_cost),
    status: dbMaint.status === 'active' ? 'Active' : 'Closed',
    openedAt: dbMaint.start_date,
    closedAt: dbMaint.end_date
  };
};

// Map Fuel Logs
const mapFuelFromDb = (dbFuel) => {
  if (!dbFuel) return null;
  return {
    id: dbFuel.id,
    vehicleId: dbFuel.vehicle_id,
    liters: Number(dbFuel.liters),
    cost: Number(dbFuel.cost),
    date: dbFuel.fuel_date
  };
};

// Map Expenses (excluding direct fuel which has separate panel)
const mapExpenseFromDb = (dbExp) => {
  if (!dbExp) return null;
  return {
    id: dbExp.id,
    vehicleId: dbExp.vehicle_id,
    type: dbExp.expense_type === 'toll' ? 'Toll' : 'Other',
    amount: Number(dbExp.amount),
    date: dbExp.expense_date
  };
};

// ==========================================================
// 2. Authentication Supabase Endpoints
// ==========================================================
export const authApi = {
  login: async (email, password) => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (authError) throw new Error(authError.message);

    // Profile contains user role parameters
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) throw new Error('User profile record not found: ' + profileError.message);

    return {
      id: profile.id,
      email: profile.email,
      name: profile.full_name || profile.email,
      role: mapDbRoleToFrontend(profile.role)
    };
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    return true;
  },

  getCurrentUser: async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) return null;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) return null;

    return {
      id: profile.id,
      email: profile.email,
      name: profile.full_name || profile.email,
      role: mapDbRoleToFrontend(profile.role)
    };
  }
};

// ==========================================================
// 3. Vehicles Registry Supabase APIs
// ==========================================================
export const vehiclesApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return data.map(mapVehicleFromDb);
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return mapVehicleFromDb(data);
  },

  create: async (vehicleData) => {
    const dbPayload = mapVehicleToDb(vehicleData);

    const { data, error } = await supabase
      .from('vehicles')
      .insert([dbPayload])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error(`Vehicle with registration number "${vehicleData.regNumber}" already exists.`);
      }
      throw new Error(error.message);
    }
    return mapVehicleFromDb(data);
  },

  update: async (id, vehicleData) => {
    const dbPayload = mapVehicleToDb(vehicleData);

    const { data, error } = await supabase
      .from('vehicles')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error(`Vehicle with registration number "${vehicleData.regNumber}" already exists.`);
      }
      throw new Error(error.message);
    }
    return mapVehicleFromDb(data);
  },

  retire: async (id) => {
    const { data, error } = await supabase
      .from('vehicles')
      .update({ status: 'retired' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapVehicleFromDb(data);
  }
};

// ==========================================================
// 4. Drivers Management Supabase APIs
// ==========================================================
export const driversApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data.map(mapDriverFromDb);
  },

  create: async (driverData) => {
    const dbPayload = mapDriverToDb(driverData);

    const { data, error } = await supabase
      .from('drivers')
      .insert([dbPayload])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error(`Driver with license number "${driverData.licenseNumber}" already exists.`);
      }
      throw new Error(error.message);
    }
    return mapDriverFromDb(data);
  },

  update: async (id, driverData) => {
    const dbPayload = mapDriverToDb(driverData);

    const { data, error } = await supabase
      .from('drivers')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error(`Driver with license number "${driverData.licenseNumber}" already exists.`);
      }
      throw new Error(error.message);
    }
    return mapDriverFromDb(data);
  }
};

// ==========================================================
// 5. Trips Management & Rules Engine Supabase APIs
// ==========================================================
export const tripsApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data.map(mapTripFromDb);
  },

  create: async (tripData) => {
    // 1. Fetch vehicle & driver records
    const vFe = await vehiclesApi.getById(tripData.vehicleId);
    const { data: dbDrv, error: drvErr } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', tripData.driverId)
      .single();

    if (!vFe) throw new Error('Selected vehicle does not exist.');
    if (drvErr || !dbDrv) throw new Error('Selected driver does not exist.');
    const dFe = mapDriverFromDb(dbDrv);

    // Rule #5: Cargo capacity check
    if (!isWithinLoadCapacity(tripData.cargoWeightKg, vFe)) {
      throw new Error(`Cargo weight (${tripData.cargoWeightKg} kg) exceeds vehicle max capacity (${vFe.maxLoadKg} kg).`);
    }

    // Rules #2 & #3: eligibility gates if direct dispatch
    if (tripData.status === 'Dispatched') {
      if (!canAssignVehicle(vFe)) throw new Error(`Vehicle is unavailable (Status: ${vFe.status})`);
      if (!canAssignDriver(dFe)) throw new Error(`Driver is unavailable or has expired license.`);
    }

    const calculatedRevenue = Number(tripData.revenue) || (Number(tripData.plannedDistanceKm) * 2.5 + Number(tripData.cargoWeightKg) * 0.1);

    const dbPayload = {
      vehicle_id: tripData.vehicleId,
      driver_id: tripData.driverId,
      source: tripData.source,
      destination: tripData.destination,
      cargo_weight: Number(tripData.cargoWeightKg),
      planned_distance: Number(tripData.plannedDistanceKm),
      revenue: calculatedRevenue,
      trip_status: mapFrontendTripStatusToDb(tripData.status),
      start_time: tripData.status === 'Dispatched' ? new Date().toISOString() : null
    };

    // Insert Trip
    const { data: newDbTrip, error: tripError } = await supabase
      .from('trips')
      .insert([dbPayload])
      .select()
      .single();

    if (tripError) throw new Error(tripError.message);

    // Rule #6: Transition vehicle & driver to on_trip
    if (tripData.status === 'Dispatched') {
      await supabase.from('vehicles').update({ status: 'on_trip' }).eq('id', tripData.vehicleId);
      await supabase.from('drivers').update({ status: 'on_trip' }).eq('id', tripData.driverId);
    }

    return mapTripFromDb(newDbTrip);
  },

  dispatch: async (id) => {
    // 1. Fetch trip
    const { data: dbTrip, error: tripErr } = await supabase.from('trips').select('*').eq('id', id).single();
    if (tripErr || !dbTrip) throw new Error('Trip not found');

    if (dbTrip.trip_status !== 'draft') throw new Error('Only draft trips can be dispatched.');

    // 2. Fetch vehicle & driver
    const vFe = await vehiclesApi.getById(dbTrip.vehicle_id);
    const { data: dbDrv } = await supabase.from('drivers').select('*').eq('id', dbTrip.driver_id).single();
    const dFe = mapDriverFromDb(dbDrv);

    // Rules #2 & #3 check
    if (!canAssignVehicle(vFe)) throw new Error(`Vehicle "${vFe.regNumber}" is not available.`);
    if (!canAssignDriver(dFe)) throw new Error(`Driver "${dFe.name}" is not available or license expired.`);

    // 3. Perform dispatch transaction
    const { data: updatedTrip, error: updateErr } = await supabase
      .from('trips')
      .update({ trip_status: 'dispatched', start_time: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);

    // Rule #6
    await supabase.from('vehicles').update({ status: 'on_trip' }).eq('id', dbTrip.vehicle_id);
    await supabase.from('drivers').update({ status: 'on_trip' }).eq('id', dbTrip.driver_id);

    return mapTripFromDb(updatedTrip);
  },

  complete: async (id, completionData) => {
    // 1. Fetch Trip details
    const { data: dbTrip, error: tripErr } = await supabase.from('trips').select('*').eq('id', id).single();
    if (tripErr || !dbTrip) throw new Error('Trip not found');

    if (dbTrip.trip_status !== 'dispatched') throw new Error('Only dispatched trips can be completed.');

    const actualDistance = Number(completionData.actualDistanceKm);
    const fuelConsumed = Number(completionData.fuelConsumed);
    const fuelCost = Number(completionData.fuelCost) || (fuelConsumed * 2.0);

    if (isNaN(actualDistance) || actualDistance <= 0) throw new Error('Actual distance must be a positive number.');
    if (isNaN(fuelConsumed) || fuelConsumed < 0) throw new Error('Fuel consumed must be a non-negative number.');

    // 2. Fetch active vehicle odometer
    const { data: dbVeh } = await supabase.from('vehicles').select('*').eq('id', dbTrip.vehicle_id).single();
    if (!dbVeh) throw new Error('Vehicle not found.');

    const newOdometer = Number(dbVeh.odometer) + actualDistance;

    // 3. Complete Trip
    const { data: completedTrip, error: updateErr } = await supabase
      .from('trips')
      .update({
        trip_status: 'completed',
        end_time: new Date().toISOString(),
        final_odometer: newOdometer,
        fuel_used: fuelConsumed
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);

    // Rule #7: Restore statuses to available
    await supabase.from('vehicles').update({ odometer: newOdometer, status: 'available' }).eq('id', dbTrip.vehicle_id);
    await supabase.from('drivers').update({ status: 'available' }).eq('id', dbTrip.driver_id);

    // 4. Save Fuel log entry
    if (fuelConsumed > 0) {
      await supabase.from('fuel_logs').insert([{
        vehicle_id: dbTrip.vehicle_id,
        trip_id: id,
        liters: fuelConsumed,
        cost: fuelCost,
        fuel_date: SYSTEM_DATE
      }]);

      // Map automated expense entry under fuel type
      await supabase.from('expenses').insert([{
        vehicle_id: dbTrip.vehicle_id,
        expense_type: 'fuel',
        amount: fuelCost,
        description: `Fuel for Trip #${id.substring(0,8)}`,
        expense_date: SYSTEM_DATE,
        ref_id: id
      }]);
    }

    return mapTripFromDb(completedTrip);
  },

  cancel: async (id) => {
    const { data: dbTrip, error: tripErr } = await supabase.from('trips').select('*').eq('id', id).single();
    if (tripErr || !dbTrip) throw new Error('Trip not found');

    if (dbTrip.trip_status !== 'dispatched' && dbTrip.trip_status !== 'draft') {
      throw new Error('Only draft or dispatched trips can be cancelled.');
    }

    const oldStatus = dbTrip.trip_status;

    // Cancel Trip
    const { data: cancelledTrip, error: updateErr } = await supabase
      .from('trips')
      .update({ trip_status: 'cancelled', end_time: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw new Error(updateErr.message);

    // Rule #8: Restore statuses if dispatched
    if (oldStatus === 'dispatched') {
      await supabase.from('vehicles').update({ status: 'available' }).eq('id', dbTrip.vehicle_id);
      await supabase.from('drivers').update({ status: 'available' }).eq('id', dbTrip.driver_id);
    }

    return mapTripFromDb(cancelledTrip);
  }
};

// ==========================================================
// 6. Maintenance Logs Supabase APIs
// ==========================================================
export const maintenanceApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('maintenance')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data.map(mapMaintenanceFromDb);
  },

  create: async (logData) => {
    // Check vehicle eligibility
    const vFe = await vehiclesApi.getById(logData.vehicleId);
    if (!vFe) throw new Error('Vehicle not found.');
    if (vFe.status === 'Retired') throw new Error('Cannot log maintenance on retired vehicles.');

    const dbPayload = {
      vehicle_id: logData.vehicleId,
      maintenance_type: logData.type,
      description: logData.description,
      maintenance_cost: Number(logData.cost) || 0,
      status: 'active',
      start_date: SYSTEM_DATE
    };

    const { data: newLog, error: logError } = await supabase
      .from('maintenance')
      .insert([dbPayload])
      .select()
      .single();

    if (logError) throw new Error(logError.message);

    // Rule #9: Vehicle transitions to in_shop status
    await supabase.from('vehicles').update({ status: 'in_shop' }).eq('id', logData.vehicleId);

    return mapMaintenanceFromDb(newLog);
  },

  close: async (id, closeData) => {
    const { data: dbLog, error: fetchErr } = await supabase.from('maintenance').select('*').eq('id', id).single();
    if (fetchErr || !dbLog) throw new Error('Log not found.');

    if (dbLog.status !== 'active') throw new Error('Record is already closed.');

    // Close log
    const { data: closedLog, error: closeError } = await supabase
      .from('maintenance')
      .update({
        status: 'completed',
        maintenance_cost: Number(closeData.cost),
        description: closeData.description,
        end_date: SYSTEM_DATE
      })
      .eq('id', id)
      .select()
      .single();

    if (closeError) throw new Error(closeError.message);

    // Rule #10: Close maintenance -> restore vehicle status to available
    const { data: dbVeh } = await supabase.from('vehicles').select('status').eq('id', dbLog.vehicle_id).single();
    if (dbVeh && dbVeh.status === 'in_shop') {
      await supabase.from('vehicles').update({ status: 'available' }).eq('id', dbLog.vehicle_id);
    }

    // Insert to expense ledger
    await supabase.from('expenses').insert([{
      vehicle_id: dbLog.vehicle_id,
      expense_type: 'maintenance',
      amount: Number(closeData.cost),
      description: `Maint: ${dbLog.maintenance_type} - ${closeData.description}`,
      expense_date: SYSTEM_DATE,
      ref_id: id
    }]);

    return mapMaintenanceFromDb(closedLog);
  }
};

// ==========================================================
// 7. Fuel & Expenses Ledger Supabase APIs
// ==========================================================
export const fuelExpensesApi = {
  getFuelLogs: async () => {
    const { data, error } = await supabase
      .from('fuel_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data.map(mapFuelFromDb);
  },

  createFuelLog: async (fuelData) => {
    const { data: newFuelLog, error: fuelError } = await supabase
      .from('fuel_logs')
      .insert([{
        vehicle_id: fuelData.vehicleId,
        liters: Number(fuelData.liters),
        cost: Number(fuelData.cost),
        fuel_date: fuelData.date || SYSTEM_DATE
      }])
      .select()
      .single();

    if (fuelError) throw new Error(fuelError.message);

    // Synchronize to expense rolls
    await supabase.from('expenses').insert([{
      vehicle_id: fuelData.vehicleId,
      expense_type: 'fuel',
      amount: Number(fuelData.cost),
      description: `Fuel purchase - ${fuelData.liters} L`,
      expense_date: fuelData.date || SYSTEM_DATE,
      ref_id: newFuelLog.id
    }]);

    return mapFuelFromDb(newFuelLog);
  },

  getExpenses: async () => {
    // Filter out fuel expense_type to prevent double ledger rollups in Expenses view
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .neq('expense_type', 'fuel')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data.map(mapExpenseFromDb);
  },

  createExpense: async (expenseData) => {
    const mappedType = expenseData.type === 'Toll' ? 'toll' : 'parking';

    const { data: newExp, error: expError } = await supabase
      .from('expenses')
      .insert([{
        vehicle_id: expenseData.vehicleId,
        expense_type: mappedType,
        amount: Number(expenseData.amount),
        description: expenseData.type,
        expense_date: expenseData.date || SYSTEM_DATE
      }])
      .select()
      .single();

    if (expError) throw new Error(expError.message);
    return mapExpenseFromDb(newExp);
  }
};
