import { getCollection, saveCollection } from './mockDb';
import { canAssignVehicle, canAssignDriver, isWithinLoadCapacity, SYSTEM_DATE } from '../utils/rules';

const generateLocalId = (prefix) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
const delay = (ms = 80) => new Promise(resolve => setTimeout(resolve, ms));

export const checkConnection = async () => {
  return false;
};

export const isUsingSupabase = () => false;

export const authApi = {
  login: async (email, password) => {
    await delay(100);
    const users = getCollection('users');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.passwordHash !== password) throw new Error('Invalid email or password');
    const { passwordHash, ...userResponse } = user;
    localStorage.setItem('transitops_local_user', JSON.stringify(userResponse));
    return userResponse;
  },

  logout: async () => {
    await delay(50);
    localStorage.removeItem('transitops_local_user');
    return true;
  },

  getCurrentUser: async () => {
    await delay(50);
    const localUser = localStorage.getItem('transitops_local_user');
    return localUser ? JSON.parse(localUser) : null;
  }
};

export const vehiclesApi = {
  getAll: async () => {
    await delay(100);
    return getCollection('vehicles');
  },

  getById: async (id) => {
    await delay(50);
    const list = getCollection('vehicles');
    return list.find(v => v.id === id) || null;
  },

  create: async (vehicleData) => {
    await delay(100);
    const list = getCollection('vehicles');
    const id = generateLocalId('veh');
    const newVeh = { id, ...vehicleData };
    list.unshift(newVeh);
    saveCollection('vehicles', list);
    return newVeh;
  },

  update: async (id, vehicleData) => {
    await delay(100);
    const list = getCollection('vehicles');
    const idx = list.findIndex(v => v.id === id);
    if (idx === -1) throw new Error('Vehicle not found');
    const updatedVeh = { ...list[idx], ...vehicleData };
    list[idx] = updatedVeh;
    saveCollection('vehicles', list);
    return updatedVeh;
  },

  delete: async (id) => {
    await delay(100);
    const list = getCollection('vehicles');
    const filtered = list.filter(v => v.id !== id);
    saveCollection('vehicles', filtered);
    return true;
  }
};

export const driversApi = {
  getAll: async () => {
    await delay(100);
    return getCollection('drivers');
  },

  create: async (driverData) => {
    await delay(100);
    const list = getCollection('drivers');
    const id = generateLocalId('drv');
    const newDrv = { id, ...driverData };
    list.unshift(newDrv);
    saveCollection('drivers', list);
    return newDrv;
  },

  update: async (id, driverData) => {
    await delay(100);
    const list = getCollection('drivers');
    const idx = list.findIndex(d => d.id === id);
    if (idx === -1) throw new Error('Driver not found');
    const updatedDrv = { ...list[idx], ...driverData };
    list[idx] = updatedDrv;
    saveCollection('drivers', list);
    return updatedDrv;
  },

  delete: async (id) => {
    await delay(100);
    const list = getCollection('drivers');
    const filtered = list.filter(d => d.id !== id);
    saveCollection('drivers', filtered);
    return true;
  }
};

export const tripsApi = {
  getAll: async () => {
    await delay(100);
    return getCollection('trips');
  },

  create: async (tripData) => {
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
  },

  dispatch: async (id) => {
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
  },

  complete: async (id, completionData) => {
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
  },

  cancel: async (id) => {
    await delay(50);
    const trips = getCollection('trips');
    const trip = trips.find(t => t.id === id);
    if (!trip) throw new Error('Trip not found');

    const oldStatus = trip.status;
    trip.status = 'Cancelled';
    trip.completedAt = new Date().toISOString();

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
};

export const maintenanceApi = {
  getAll: async () => {
    await delay(50);
    return getCollection('maintenance');
  },

  create: async (logData) => {
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
  },

  close: async (id, closeData) => {
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
};

export const fuelExpensesApi = {
  getFuelLogs: async () => {
    await delay(100);
    return getCollection('fuelLogs');
  },

  addFuelLog: async (logData) => {
    await delay(100);
    const list = getCollection('fuelLogs');
    const id = generateLocalId('fl');
    const newLog = { id, ...logData };
    list.push(newLog);
    saveCollection('fuelLogs', list);
    return newLog;
  },

  deleteFuelLog: async (id) => {
    await delay(100);
    const list = getCollection('fuelLogs');
    const filtered = list.filter(l => l.id !== id);
    saveCollection('fuelLogs', filtered);
    return true;
  },

  getExpenses: async () => {
    await delay(100);
    return getCollection('expenses');
  },

  addExpense: async (expData) => {
    await delay(100);
    const list = getCollection('expenses');
    const id = generateLocalId('exp');
    const newExp = { id, ...expData };
    list.push(newExp);
    saveCollection('expenses', list);
    return newExp;
  },

  deleteExpense: async (id) => {
    await delay(100);
    const list = getCollection('expenses');
    const filtered = list.filter(e => e.id !== id);
    saveCollection('expenses', filtered);
    return true;
  }
};
