// Mock Database Engine using LocalStorage
const STORAGE_PREFIX = 'transitops_db_';

const DEFAULT_USERS = [
  // Original local storage accounts
  { id: 'usr-1', name: 'Frank Miller', email: 'manager@transitops.com', passwordHash: 'manager123', role: 'Fleet Manager' },
  { id: 'usr-2', name: 'Dave R.', email: 'driver@transitops.com', passwordHash: 'driver123', role: 'Driver' },
  { id: 'usr-3', name: 'Sarah Connor', email: 'safety@transitops.com', passwordHash: 'safety123', role: 'Safety Officer' },
  { id: 'usr-4', name: 'Fiona Gallagher', email: 'finance@transitops.com', passwordHash: 'finance123', role: 'Financial Analyst' },
  // Supabase seeded accounts (so they also work in offline mode)
  { id: 'usr-supabase-1', name: 'Alice Manager', email: 'manager@transitops.com', passwordHash: 'password123', role: 'Fleet Manager' },
  { id: 'usr-supabase-2', name: 'Bob Dispatcher', email: 'dispatcher@transitops.com', passwordHash: 'password123', role: 'Driver' },
  { id: 'usr-supabase-3', name: 'Charlie Safety', email: 'safety@transitops.com', passwordHash: 'password123', role: 'Safety Officer' },
  { id: 'usr-supabase-4', name: 'Diana Analyst', email: 'analyst@transitops.com', passwordHash: 'password123', role: 'Financial Analyst' }
];

const DEFAULT_VEHICLES = [
  { id: 'veh-1', regNumber: 'VAN-01', name: 'Delivery Van 1', type: 'Van', maxLoadKg: 800, odometer: 125000, acquisitionCost: 28000, status: 'Available', region: 'North' },
  { id: 'veh-2', regNumber: 'TRK-02', name: 'Flatbed Truck 2', type: 'Truck', maxLoadKg: 3500, odometer: 85000, acquisitionCost: 55000, status: 'On Trip', region: 'South' },
  { id: 'veh-3', regNumber: 'SEM-03', name: 'Heavy Semi-Trailer 3', type: 'Semi-Trailer', maxLoadKg: 15000, odometer: 245000, acquisitionCost: 120000, status: 'In Shop', region: 'East' },
  { id: 'veh-4', regNumber: 'BOX-04', name: 'Box Truck 4', type: 'Box Truck', maxLoadKg: 5000, odometer: 95000, acquisitionCost: 45000, status: 'Available', region: 'West' },
  { id: 'veh-5', regNumber: 'VAN-05', name: 'Courier Van 5', type: 'Van', maxLoadKg: 600, odometer: 310000, acquisitionCost: 25000, status: 'Retired', region: 'North' }
];

const DEFAULT_DRIVERS = [
  { id: 'drv-1', name: 'John Doe', licenseNumber: 'DL-98231', licenseCategory: 'Commercial Class A', licenseExpiryDate: '2027-12-15', contactNumber: '555-0192', safetyScore: 92, status: 'Available' },
  { id: 'drv-2', name: 'Jane Smith', licenseNumber: 'DL-45612', licenseCategory: 'Commercial Class A', licenseExpiryDate: '2026-08-30', contactNumber: '555-0144', safetyScore: 96, status: 'On Trip' },
  { id: 'drv-3', name: 'Bob Johnson', licenseNumber: 'DL-78901', licenseCategory: 'Standard Class C', licenseExpiryDate: '2026-04-10', contactNumber: '555-0187', safetyScore: 78, status: 'Off Duty' },
  { id: 'drv-4', name: 'Alice Cooper', licenseNumber: 'DL-11223', licenseCategory: 'Commercial Class A', licenseExpiryDate: '2025-06-01', contactNumber: '555-0133', safetyScore: 54, status: 'Suspended' } // Expired License
];

const DEFAULT_TRIPS = [
  {
    id: 'trp-1',
    source: 'Warehouse A (North)',
    destination: 'Distribution Center 1',
    vehicleId: 'veh-2',
    driverId: 'drv-2',
    cargoWeightKg: 2800,
    plannedDistanceKm: 180,
    actualDistanceKm: 0,
    fuelConsumed: 0,
    status: 'Dispatched',
    createdAt: '2026-07-11T09:30:00Z',
    completedAt: null,
    revenue: 550
  },
  {
    id: 'trp-2',
    source: 'Port East',
    destination: 'Warehouse B (South)',
    vehicleId: 'veh-1',
    driverId: 'drv-1',
    cargoWeightKg: 450,
    plannedDistanceKm: 120,
    actualDistanceKm: 125,
    fuelConsumed: 15.5,
    status: 'Completed',
    createdAt: '2026-07-10T08:00:00Z',
    completedAt: '2026-07-10T11:45:00Z',
    revenue: 400
  },
  {
    id: 'trp-3',
    source: 'Factory West',
    destination: 'Retail Hub 4',
    vehicleId: 'veh-4',
    driverId: 'drv-3',
    cargoWeightKg: 3000,
    plannedDistanceKm: 340,
    actualDistanceKm: 0,
    fuelConsumed: 0,
    status: 'Draft',
    createdAt: '2026-07-12T06:00:00Z',
    completedAt: null,
    revenue: 900
  }
];

const DEFAULT_MAINTENANCE = [
  { id: 'mnt-1', vehicleId: 'veh-3', type: 'Engine Overhaul', description: 'Replaced head gasket and timing belt.', cost: 2450, status: 'Active', openedAt: '2026-07-08T10:00:00Z', closedAt: null },
  { id: 'mnt-2', vehicleId: 'veh-1', type: 'Brake Service', description: 'Replaced front brake pads and rotors.', cost: 450, status: 'Closed', openedAt: '2026-07-01T08:00:00Z', closedAt: '2026-07-02T16:00:00Z' }
];

const DEFAULT_FUEL_LOGS = [
  { id: 'fl-1', vehicleId: 'veh-1', liters: 45, cost: 90, date: '2026-07-01' },
  { id: 'fl-2', vehicleId: 'veh-1', liters: 50, cost: 100, date: '2026-07-05' },
  { id: 'fl-3', vehicleId: 'veh-2', liters: 120, cost: 252, date: '2026-07-10' }
];

const DEFAULT_EXPENSES = [
  { id: 'exp-1', vehicleId: 'veh-1', type: 'Toll', amount: 15.50, date: '2026-07-01' },
  { id: 'exp-2', vehicleId: 'veh-2', type: 'Other', amount: 35.00, date: '2026-07-10' }
];

const SEED_DATA = {
  users: DEFAULT_USERS,
  vehicles: DEFAULT_VEHICLES,
  drivers: DEFAULT_DRIVERS,
  trips: DEFAULT_TRIPS,
  maintenance: DEFAULT_MAINTENANCE,
  fuelLogs: DEFAULT_FUEL_LOGS,
  expenses: DEFAULT_EXPENSES
};

// Initialize DB if not present
export const initDb = (force = false) => {
  Object.keys(SEED_DATA).forEach(key => {
    const storageKey = STORAGE_PREFIX + key;
    if (force || localStorage.getItem(storageKey) === null) {
      localStorage.setItem(storageKey, JSON.stringify(SEED_DATA[key]));
    }
  });
};

export const getCollection = (collectionName) => {
  initDb();
  const data = localStorage.getItem(STORAGE_PREFIX + collectionName);
  return data ? JSON.parse(data) : [];
};

export const saveCollection = (collectionName, data) => {
  localStorage.setItem(STORAGE_PREFIX + collectionName, JSON.stringify(data));
};

export const resetDb = () => {
  initDb(true);
};

// Trigger initialization immediately
initDb();
