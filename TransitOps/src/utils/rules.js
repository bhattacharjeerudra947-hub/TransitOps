// TransitOps - Central Business Rules Engine
export const SYSTEM_DATE = '2026-07-12';

// Check if a driver's license is expired relative to current date (2026-07-12)
export const isLicenseExpired = (expiryDate) => {
  if (!expiryDate) return true;
  return new Date(expiryDate) < new Date(SYSTEM_DATE);
};

// Check if license expires in the next 30 days
export const isLicenseExpiringSoon = (expiryDate) => {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const current = new Date(SYSTEM_DATE);
  const diffTime = expiry - current;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 30;
};

// Rule #2 & #4: Vehicle is eligible for dispatch only if status is 'Available'
export const canAssignVehicle = (vehicle) => {
  return vehicle && vehicle.status === 'Available';
};

// Rule #3 & #4: Driver is eligible only if Available, not Suspended, and license is not expired
export const canAssignDriver = (driver) => {
  if (!driver) return false;
  if (driver.status !== 'Available') return false;
  if (isLicenseExpired(driver.licenseExpiryDate)) return false;
  return true;
};

// Rule #5: Cargo weight must not exceed vehicle's max load capacity
export const isWithinLoadCapacity = (cargoWeightKg, vehicle) => {
  if (!vehicle) return false;
  return Number(cargoWeightKg) <= Number(vehicle.maxLoadKg);
};
