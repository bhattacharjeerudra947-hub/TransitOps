import { supabase } from '../supabaseClient';
import { getCollection, saveCollection } from './mockDb';
import { canAssignVehicle, canAssignDriver, isWithinLoadCapacity, SYSTEM_DATE } from '../utils/rules';

// ==========================================================
// 1. Connection Ping and Fallback Controller
// ==========================================================
let useSupabase = false;

const generateLocalId = (prefix) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

const hasConfig = 
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_URL !== 'http://localhost:54321' &&
  import.meta.env.VITE_SUPABASE_ANON_KEY && 
  import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your-supabase-anon-key-here' &&
  import.meta.env.VITE_SUPABASE_ANON_KEY !== 'placeholder-key' &&
  import.meta.env.VITE_SUPABASE_ANON_KEY !== 'placeholder-anon-key';

export const checkConnection = async () => {
  if (!hasConfig) {
    console.warn('TransitOps: Supabase is not configured. Running in local storage mode.');
    useSupabase = false;
    return false;
  }
  try {
    const { error } = await Promise.race([
      supabase.from('vehicles').select('id').limit(1),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500))
    ]);
    if (error) throw error;
    useSupabase = true;
    console.log('TransitOps: Successfully connected to Supabase database.');
    return true;
  } catch (err) {
    console.warn('TransitOps: Supabase connection failed. Falling back to LocalStorage DB:', err.message);
    useSupabase = false;
    return false;
  }
};

// Check connection immediately on load
checkConnection();

// Expose status state
export const isUsingSupabase = () => useSupabase;

// ==========================================================
// 2. Enum & Data Mapping Utilities (Frontend <-> DB Converter)
// ==========================================================
export const mapDbRoleToFrontend = (role) => {
  switch (role) {
    case 'fleet_manager': return 'Fleet Manager';
    case 'dispatcher': return 'Driver';
    case 'safety_officer': return 'Safety Officer';
    case 'financial_analyst': return 'Financial Analyst';
    default: return role;
  }
};

export const mapFrontendRoleToDb = (role) => {
  switch (role) {
    case 'Fleet Manager': return 'fleet_manager';
    case 'Driver': return 'dispatcher';
    case 'Safety Officer': return 'safety_officer';
    case 'Financial Analyst': return 'financial_analyst';
    default: return 'dispatcher';
  }
};

const mapDbVehicleStatusToFrontend = (status) => {
  if (status === 'on_trip') return 'On Trip';
  if (status === 'in_shop') return 'In Shop';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const mapFrontendVehicleStatusToDb = (status) => {
  if (status === 'On Trip') return 'on_trip';
  if (status === 'In Shop') return 'in_shop';
  return status.toLowerCase();
};

const mapDbDriverStatusToFrontend = (status) => {
  if (status === 'on_trip') return 'On Trip';
  if (status === 'off_duty') return 'Off Duty';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const mapFrontendDriverStatusToDb = (status) => {
  if (status === 'On Trip') return 'on_trip';
  if (status === 'Off Duty') return 'off_duty';
  return status.toLowerCase();
};

const mapDbTripStatusToFrontend = (status) => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const mapFrontendTripStatusToDb = (status) => {
  return status.toLowerCase();
};

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

const mapDriverFromDb = (dbDrv) => {
  if (!dbDrv) return null;
  return {
    id: dbDrv.id,
    name: dbDrv.name,
    licenseNumber: dbDrv.license_number,
    licenseCategory: dbDrv.license_category,
    licenseExpiryDate: dbDrv.license_expiry_date,
    phone: dbDrv.phone || '',
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
    actualDistanceKm: Number(dbTrp.final_odometer ? dbTrp.final_odometer - (dbTrp.final_odometer - dbTrp.planned_distance) : 0),
    fuelConsumed: Number(dbTrp.fuel_used || 0),
    status: mapDbTripStatusToFrontend(dbTrp.trip_status),
    createdAt: dbTrp.created_at,
    completedAt: dbTrp.end_time,
    revenue: Number(dbTrp.revenue)
  };
};

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
// 3. Unified API Repository
// ==========================================================

export const authApi = {
  login: async (email, password) => {
    if (useSupabase) {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw new Error(authError.message);

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
    } else {
      await delay(100);
      const users = getCollection('users');
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user || user.passwordHash !== password) throw new Error('Invalid email or password');
      const { passwordHash, ...userResponse } = user;
      localStorage.setItem('transitops_local_user', JSON.stringify(userResponse));
      return userResponse;
    }
  },

  logout: async () => {
    if (useSupabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
      return true;
    } else {
      await delay(50);
      localStorage.removeItem('transitops_local_user');
      return true;
    }
  },

  getCurrentUser: async () => {
    if (useSupabase) {
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
    } else {
      await delay(50);
      const localUser = localStorage.getItem('transitops_local_user');
      return localUser ? JSON.parse(localUser) : null;
    }
  }
};

export const vehiclesApi = {
  getAll: async () => {
    if (useSupabase) {
      const { data, error } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data.map(mapVehicleFromDb);
    } else {
      await delay(50);
      return getCollection('vehicles');
    }
  },

  getById: async (id) => {
    if (useSupabase) {
      const { data, error } = await supabase.from('vehicles').select('*').eq('id', id).single();
      if (error) throw new Error(error.message);
      return mapVehicleFromDb(data);
    } else {
      await delay(30);
      const vehicles = getCollection('vehicles');
      return vehicles.find(v => v.id === id) || null;
    }
  },

  create: async (vehicleData) => {
    if (useSupabase) {
      const dbPayload = mapVehicleToDb(vehicleData);
      const { data, error } = await supabase.from('vehicles').insert([dbPayload]).select().single();
      if (error) {
        if (error.code === '23505') throw new Error(`Vehicle with registration number "${vehicleData.regNumber}" already exists.`);
        throw new Error(error.message);
      }
      return mapVehicleFromDb(data);
    } else {
      await delay(50);
      const vehicles = getCollection('vehicles');
      const isDuplicate = vehicles.some(v => v.regNumber.toUpperCase() === vehicleData.regNumber.toUpperCase());
      if (isDuplicate) throw new Error(`Vehicle with registration number "${vehicleData.regNumber}" already exists.`);
      
      const newVeh = {
        ...vehicleData,
        id: generateLocalId('veh'),
        odometer: Number(vehicleData.odometer) || 0,
        acquisitionCost: Number(vehicleData.acquisitionCost) || 0,
        maxLoadKg: Number(vehicleData.maxLoadKg) || 0,
        status: vehicleData.status || 'Available'
      };
      vehicles.push(newVeh);
      saveCollection('vehicles', vehicles);
      return newVeh;
    }
  },

  update: async (id, vehicleData) => {
    if (useSupabase) {
      const dbPayload = mapVehicleToDb(vehicleData);
      const { data, error } = await supabase.from('vehicles').update(dbPayload).eq('id', id).select().single();
      if (error) {
        if (error.code === '23505') throw new Error(`Vehicle with registration number "${vehicleData.regNumber}" already exists.`);
        throw new Error(error.message);
      }
      return mapVehicleFromDb(data);
    } else {
      await delay(50);
      const vehicles = getCollection('vehicles');
      const index = vehicles.findIndex(v => v.id === id);
      if (index === -1) throw new Error('Vehicle not found');

      const isDuplicate = vehicles.some(v => v.id !== id && v.regNumber.toUpperCase() === vehicleData.regNumber.toUpperCase());
      if (isDuplicate) throw new Error(`Vehicle with registration number "${vehicleData.regNumber}" already exists.`);

      const updated = { ...vehicles[index], ...vehicleData, odometer: Number(vehicleData.odometer), acquisitionCost: Number(vehicleData.acquisitionCost), maxLoadKg: Number(vehicleData.maxLoadKg) };
      vehicles[index] = updated;
      saveCollection('vehicles', vehicles);
      return updated;
    }
  },

  retire: async (id) => {
    if (useSupabase) {
      const { data, error } = await supabase.from('vehicles').update({ status: 'retired' }).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return mapVehicleFromDb(data);
    } else {
      await delay(50);
      const vehicles = getCollection('vehicles');
      const index = vehicles.findIndex(v => v.id === id);
      if (index === -1) throw new Error('Vehicle not found');
      vehicles[index].status = 'Retired';
      saveCollection('vehicles', vehicles);
      return vehicles[index];
    }
  }
};

export const driversApi = {
  getAll: async () => {
    if (useSupabase) {
      const { data, error } = await supabase.from('drivers').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data.map(mapDriverFromDb);
    } else {
      await delay(50);
      return getCollection('drivers');
    }
  },

  create: async (driverData) => {
    if (useSupabase) {
      const dbPayload = mapDriverToDb(driverData);
      const { data, error } = await supabase.from('drivers').insert([dbPayload]).select().single();
      if (error) {
        if (error.code === '23505') throw new Error(`Driver with license number "${driverData.licenseNumber}" already exists.`);
        throw new Error(error.message);
      }
      return mapDriverFromDb(data);
    } else {
      await delay(50);
      const drivers = getCollection('drivers');
      const isDuplicate = drivers.some(d => d.licenseNumber.toUpperCase() === driverData.licenseNumber.toUpperCase());
      if (isDuplicate) throw new Error(`Driver with license number "${driverData.licenseNumber}" already exists.`);

      const newDrv = { ...driverData, id: generateLocalId('drv'), safetyScore: Number(driverData.safetyScore) || 100, status: driverData.status || 'Available' };
      drivers.push(newDrv);
      saveCollection('drivers', drivers);
      return newDrv;
    }
  },

  update: async (id, driverData) => {
    if (useSupabase) {
      const dbPayload = mapDriverToDb(driverData);
      const { data, error } = await supabase.from('drivers').update(dbPayload).eq('id', id).select().single();
      if (error) {
        if (error.code === '23505') throw new Error(`Driver with license number "${driverData.licenseNumber}" already exists.`);
        throw new Error(error.message);
      }
      return mapDriverFromDb(data);
    } else {
      await delay(50);
      const drivers = getCollection('drivers');
      const index = drivers.findIndex(d => d.id === id);
      if (index === -1) throw new Error('Driver not found');

      const isDuplicate = drivers.some(d => d.id !== id && d.licenseNumber.toUpperCase() === driverData.licenseNumber.toUpperCase());
      if (isDuplicate) throw new Error(`Driver with license number "${driverData.licenseNumber}" already exists.`);

      const updated = { ...drivers[index], ...driverData, safetyScore: Number(driverData.safetyScore) };
      drivers[index] = updated;
      saveCollection('drivers', drivers);
      return updated;
    }
  }
};

export const tripsApi = {
  getAll: async () => {
    if (useSupabase) {
      const { data, error } = await supabase.from('trips').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data.map(mapTripFromDb);
    } else {
      await delay(50);
      return getCollection('trips');
    }
  },

  create: async (tripData) => {
    if (useSupabase) {
      const vFe = await vehiclesApi.getById(tripData.vehicleId);
      const { data: dbDrv } = await supabase.from('drivers').select('*').eq('id', tripData.driverId).single();
      const dFe = mapDriverFromDb(dbDrv);

      if (!vFe) throw new Error('Selected vehicle does not exist.');
      if (!dFe) throw new Error('Selected driver does not exist.');

      if (!isWithinLoadCapacity(tripData.cargoWeightKg, vFe)) {
        throw new Error(`Cargo weight (${tripData.cargoWeightKg} kg) exceeds vehicle capacity (${vFe.maxLoadKg} kg).`);
      }

      if (tripData.status === 'Dispatched') {
        if (!canAssignVehicle(vFe)) throw new Error('Vehicle is currently unavailable.');
        if (!canAssignDriver(dFe)) throw new Error('Driver is currently unavailable or expired.');
      }

      const rev = Number(tripData.revenue) || (Number(tripData.plannedDistanceKm) * 2.5 + Number(tripData.cargoWeightKg) * 0.1);
      const dbPayload = {
        vehicle_id: tripData.vehicleId,
        driver_id: tripData.driverId,
        source: tripData.source,
        destination: tripData.destination,
        cargo_weight: Number(tripData.cargoWeightKg),
        planned_distance: Number(tripData.plannedDistanceKm),
        revenue: rev,
        trip_status: mapFrontendTripStatusToDb(tripData.status),
        start_time: tripData.status === 'Dispatched' ? new Date().toISOString() : null
      };

      const { data, error } = await supabase.from('trips').insert([dbPayload]).select().single();
      if (error) throw new Error(error.message);

      if (tripData.status === 'Dispatched') {
        await supabase.from('vehicles').update({ status: 'on_trip' }).eq('id', tripData.vehicleId);
        await supabase.from('drivers').update({ status: 'on_trip' }).eq('id', tripData.driverId);
      }
      return mapTripFromDb(data);
    } else {
      await delay(50);
      const trips = getCollection('trips');
      const vehicles = getCollection('vehicles');
      const drivers = getCollection('drivers');

      const veh = vehicles.find(v => v.id === tripData.vehicleId);
      const drv = drivers.find(d => d.id === tripData.driverId);

      if (!veh || !drv) throw new Error('Invalid vehicle or driver assignment.');
      if (!isWithinLoadCapacity(tripData.cargoWeightKg, veh)) throw new Error('Weight capacity check failed.');

      if (tripData.status === 'Dispatched') {
        if (!canAssignVehicle(veh) || !canAssignDriver(drv)) throw new Error('Vehicle/Driver unavailable.');
        veh.status = 'On Trip';
        drv.status = 'On Trip';
        saveCollection('vehicles', vehicles);
        saveCollection('drivers', drivers);
      }

      const rev = Number(tripData.revenue) || (Number(tripData.plannedDistanceKm) * 2.5 + Number(tripData.cargoWeightKg) * 0.1);
      const newTrip = {
        ...tripData,
        id: generateLocalId('trp'),
        cargoWeightKg: Number(tripData.cargoWeightKg),
        plannedDistanceKm: Number(tripData.plannedDistanceKm),
        actualDistanceKm: 0,
        fuelConsumed: 0,
        revenue: rev,
        createdAt: new Date().toISOString(),
        completedAt: null
      };
      trips.push(newTrip);
      saveCollection('trips', trips);
      return newTrip;
    }
  },

  dispatch: async (id) => {
    if (useSupabase) {
      const { data: dbTrip } = await supabase.from('trips').select('*').eq('id', id).single();
      if (!dbTrip) throw new Error('Trip not found');

      const vFe = await vehiclesApi.getById(dbTrip.vehicle_id);
      const { data: dbDrv } = await supabase.from('drivers').select('*').eq('id', dbTrip.driver_id).single();
      const dFe = mapDriverFromDb(dbDrv);

      if (!canAssignVehicle(vFe) || !canAssignDriver(dFe)) throw new Error('Driver/Vehicle not available.');

      const { data, error } = await supabase.from('trips').update({ trip_status: 'dispatched', start_time: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw new Error(error.message);

      await supabase.from('vehicles').update({ status: 'on_trip' }).eq('id', dbTrip.vehicle_id);
      await supabase.from('drivers').update({ status: 'on_trip' }).eq('id', dbTrip.driver_id);
      return mapTripFromDb(data);
    } else {
      await delay(50);
      const trips = getCollection('trips');
      const trip = trips.find(t => t.id === id);
      if (!trip) throw new Error('Trip not found');

      const vehicles = getCollection('vehicles');
      const drivers = getCollection('drivers');
      const veh = vehicles.find(v => v.id === trip.vehicleId);
      const drv = drivers.find(d => d.id === trip.driverId);

      if (!veh || !drv || !canAssignVehicle(veh) || !canAssignDriver(drv)) throw new Error('Fleet assets unavailable.');

      trip.status = 'Dispatched';
      veh.status = 'On Trip';
      drv.status = 'On Trip';

      saveCollection('trips', trips);
      saveCollection('vehicles', vehicles);
      saveCollection('drivers', drivers);
      return trip;
    }
  },

  complete: async (id, completionData) => {
    if (useSupabase) {
      const { data: dbTrip } = await supabase.from('trips').select('*').eq('id', id).single();
      const actualDistance = Number(completionData.actualDistanceKm);
      const fuelConsumed = Number(completionData.fuelConsumed);
      const fuelCost = Number(completionData.fuelCost) || (fuelConsumed * 2.0);

      const { data: dbVeh } = await supabase.from('vehicles').select('*').eq('id', dbTrip.vehicle_id).single();
      const newOdo = Number(dbVeh.odometer) + actualDistance;

      const { data, error } = await supabase.from('trips').update({
        trip_status: 'completed',
        end_time: new Date().toISOString(),
        final_odometer: newOdo,
        fuel_used: fuelConsumed
      }).eq('id', id).select().single();

      if (error) throw new Error(error.message);

      await supabase.from('vehicles').update({ odometer: newOdo, status: 'available' }).eq('id', dbTrip.vehicle_id);
      await supabase.from('drivers').update({ status: 'available' }).eq('id', dbTrip.driver_id);

      if (fuelConsumed > 0) {
        await supabase.from('fuel_logs').insert([{ vehicle_id: dbTrip.vehicle_id, trip_id: id, liters: fuelConsumed, cost: fuelCost, fuel_date: SYSTEM_DATE }]);
        await supabase.from('expenses').insert([{ vehicle_id: dbTrip.vehicle_id, expense_type: 'fuel', amount: fuelCost, description: `Fuel for Trip #${id.substring(0,8)}`, expense_date: SYSTEM_DATE, ref_id: id }]);
      }
      return mapTripFromDb(data);
    } else {
      await delay(50);
      const trips = getCollection('trips');
      const trip = trips.find(t => t.id === id);
      if (!trip || trip.status !== 'Dispatched') throw new Error('Dispatched trip not found');

      const actualDistance = Number(completionData.actualDistanceKm);
      const fuelConsumed = Number(completionData.fuelConsumed);
      const fuelCost = Number(completionData.fuelCost) || (fuelConsumed * 2.0);

      trip.status = 'Completed';
      trip.actualDistanceKm = actualDistance;
      trip.fuelConsumed = fuelConsumed;
      trip.completedAt = new Date().toISOString();

      const vehicles = getCollection('vehicles');
      const drivers = getCollection('drivers');
      const veh = vehicles.find(v => v.id === trip.vehicleId);
      const drv = drivers.find(d => d.id === trip.driverId);

      if (veh) {
        veh.odometer = (veh.odometer || 0) + actualDistance;
        veh.status = 'Available';
      }
      if (drv) drv.status = 'Available';

      if (fuelConsumed > 0 && veh) {
        const fuelLogs = getCollection('fuelLogs');
        fuelLogs.push({ id: generateLocalId('fl'), vehicleId: veh.id, liters: fuelConsumed, cost: fuelCost, date: SYSTEM_DATE });
        saveCollection('fuelLogs', fuelLogs);
      }

      saveCollection('trips', trips);
      if (veh) saveCollection('vehicles', vehicles);
      if (drv) saveCollection('drivers', drivers);
      return trip;
    }
  },

  cancel: async (id) => {
    if (useSupabase) {
      const { data: dbTrip } = await supabase.from('trips').select('*').eq('id', id).single();
      const oldStatus = dbTrip.trip_status;

      const { data, error } = await supabase.from('trips').update({ trip_status: 'cancelled', end_time: new Date().toISOString() }).eq('id', id).select().single();
      if (error) throw new Error(error.message);

      if (oldStatus === 'dispatched') {
        await supabase.from('vehicles').update({ status: 'available' }).eq('id', dbTrip.vehicle_id);
        await supabase.from('drivers').update({ status: 'available' }).eq('id', dbTrip.driver_id);
      }
      return mapTripFromDb(data);
    } else {
      await delay(50);
      const trips = getCollection('trips');
      const trip = trips.find(t => t.id === id);
      if (!trip) throw new Error('Trip not found');

      const oldStatus = trip.status;
      trip.status = 'Cancelled';

      if (oldStatus === 'Dispatched') {
        const vehicles = getCollection('vehicles');
        const drivers = getCollection('drivers');
        const veh = vehicles.find(v => v.id === trip.vehicleId);
        const drv = drivers.find(d => d.id === trip.driverId);

        if (veh) veh.status = 'Available';
        if (drv) drv.status = 'Available';

        saveCollection('vehicles', vehicles);
        saveCollection('drivers', drivers);
      }

      saveCollection('trips', trips);
      return trip;
    }
  }
};

export const maintenanceApi = {
  getAll: async () => {
    if (useSupabase) {
      const { data, error } = await supabase.from('maintenance').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data.map(mapMaintenanceFromDb);
    } else {
      await delay(50);
      return getCollection('maintenance');
    }
  },

  create: async (logData) => {
    if (useSupabase) {
      const dbPayload = {
        vehicle_id: logData.vehicleId,
        maintenance_type: logData.type,
        description: logData.description,
        maintenance_cost: Number(logData.cost) || 0,
        status: 'active',
        start_date: SYSTEM_DATE
      };
      const { data, error } = await supabase.from('maintenance').insert([dbPayload]).select().single();
      if (error) throw new Error(error.message);

      await supabase.from('vehicles').update({ status: 'in_shop' }).eq('id', logData.vehicleId);
      return mapMaintenanceFromDb(data);
    } else {
      await delay(50);
      const maintenance = getCollection('maintenance');
      const vehicles = getCollection('vehicles');
      const veh = vehicles.find(v => v.id === logData.vehicleId);

      if (!veh || veh.status === 'Retired') throw new Error('Vehicle ineligible for repairs.');

      const newLog = {
        ...logData,
        id: generateLocalId('mnt'),
        cost: Number(logData.cost) || 0,
        status: 'Active',
        openedAt: new Date().toISOString(),
        closedAt: null
      };

      veh.status = 'In Shop';
      maintenance.push(newLog);

      saveCollection('maintenance', maintenance);
      saveCollection('vehicles', vehicles);
      return newLog;
    }
  },

  close: async (id, closeData) => {
    if (useSupabase) {
      const { data: dbLog } = await supabase.from('maintenance').select('*').eq('id', id).single();
      const { data, error } = await supabase.from('maintenance').update({
        status: 'completed',
        maintenance_cost: Number(closeData.cost),
        description: closeData.description,
        end_date: SYSTEM_DATE
      }).eq('id', id).select().single();

      if (error) throw new Error(error.message);

      const { data: dbVeh } = await supabase.from('vehicles').select('status').eq('id', dbLog.vehicle_id).single();
      if (dbVeh && dbVeh.status === 'in_shop') {
        await supabase.from('vehicles').update({ status: 'available' }).eq('id', dbLog.vehicle_id);
      }

      await supabase.from('expenses').insert([{
        vehicle_id: dbLog.vehicle_id,
        expense_type: 'maintenance',
        amount: Number(closeData.cost),
        description: `Maint: ${dbLog.maintenance_type} - ${closeData.description}`,
        expense_date: SYSTEM_DATE,
        ref_id: id
      }]);

      return mapMaintenanceFromDb(data);
    } else {
      await delay(50);
      const maintenance = getCollection('maintenance');
      const log = maintenance.find(m => m.id === id);
      if (!log || log.status !== 'Active') throw new Error('Active repair log not found');

      log.status = 'Closed';
      log.cost = Number(closeData.cost);
      log.description = closeData.description;
      log.closedAt = new Date().toISOString();

      const vehicles = getCollection('vehicles');
      const veh = vehicles.find(v => v.id === log.vehicleId);
      if (veh && veh.status === 'In Shop') {
        veh.status = 'Available';
      }

      const expenses = getCollection('expenses');
      expenses.push({
        id: generateLocalId('exp'),
        vehicleId: log.vehicleId,
        type: 'Other',
        amount: Number(closeData.cost),
        date: SYSTEM_DATE
      });

      saveCollection('maintenance', maintenance);
      saveCollection('vehicles', vehicles);
      saveCollection('expenses', expenses);
      return log;
    }
  }
};

export const fuelExpensesApi = {
  getFuelLogs: async () => {
    if (useSupabase) {
      const { data, error } = await supabase.from('fuel_logs').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data.map(mapFuelFromDb);
    } else {
      await delay(50);
      return getCollection('fuelLogs');
    }
  },

  createFuelLog: async (fuelData) => {
    if (useSupabase) {
      const { data, error } = await supabase.from('fuel_logs').insert([{
        vehicle_id: fuelData.vehicleId,
        liters: Number(fuelData.liters),
        cost: Number(fuelData.cost),
        fuel_date: fuelData.date || SYSTEM_DATE
      }]).select().single();

      if (error) throw new Error(error.message);

      await supabase.from('expenses').insert([{
        vehicle_id: fuelData.vehicleId,
        expense_type: 'fuel',
        amount: Number(fuelData.cost),
        description: `Fuel purchase - ${fuelData.liters} L`,
        expense_date: fuelData.date || SYSTEM_DATE,
        ref_id: data.id
      }]);
      return mapFuelFromDb(data);
    } else {
      await delay(50);
      const fuelLogs = getCollection('fuelLogs');
      const newLog = {
        id: generateLocalId('fl'),
        vehicleId: fuelData.vehicleId,
        liters: Number(fuelData.liters),
        cost: Number(fuelData.cost),
        date: fuelData.date || SYSTEM_DATE
      };
      fuelLogs.push(newLog);
      saveCollection('fuelLogs', fuelLogs);
      return newLog;
    }
  },

  getExpenses: async () => {
    if (useSupabase) {
      const { data, error } = await supabase.from('expenses').select('*').neq('expense_type', 'fuel').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data.map(mapExpenseFromDb);
    } else {
      await delay(50);
      return getCollection('expenses');
    }
  },

  createExpense: async (expenseData) => {
    if (useSupabase) {
      const mappedType = expenseData.type === 'Toll' ? 'toll' : 'parking';
      const { data, error } = await supabase.from('expenses').insert([{
        vehicle_id: expenseData.vehicleId,
        expense_type: mappedType,
        amount: Number(expenseData.amount),
        description: expenseData.type,
        expense_date: expenseData.date || SYSTEM_DATE
      }]).select().single();

      if (error) throw new Error(error.message);
      return mapExpenseFromDb(data);
    } else {
      await delay(50);
      const expenses = getCollection('expenses');
      const newExp = {
        id: generateLocalId('exp'),
        vehicleId: expenseData.vehicleId,
        type: expenseData.type,
        amount: Number(expenseData.amount),
        date: expenseData.date || SYSTEM_DATE
      };
      expenses.push(newExp);
      saveCollection('expenses', expenses);
      return newExp;
    }
  }
};
