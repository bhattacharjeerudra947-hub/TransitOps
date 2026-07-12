# TransitOps — Complete Supabase Frontend Code Walkthrough

This document contains the step-by-step code files to build the React SPA frontend, fully integrated with your Supabase backend database schema. Copy and paste these files in the logical order below.

---

## 1. Project Dependencies Configuration
Add these dependencies to your `package.json` and run `npm install`:
```json
"dependencies": {
  "lucide-react": "^1.24.0",
  "react": "^19.2.7",
  "react-dom": "^19.2.7",
  "react-hook-form": "^7.81.0",
  "react-router-dom": "^7.18.1",
  "recharts": "^3.9.2",
  "zod": "^4.4.3",
  "zustand": "^5.0.14",
  "@supabase/supabase-js": "^2.43.0"
}
```

---

## 2. Environment Variables (`.env`)
Create a `.env` file in the root of your project (parallel to `package.json`):
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

---

## 3. Global Styling System (`src/index.css`)
Ensure your `src/index.css` file contains the custom tokens, cards, badges, and layout utility classes:
*(Refer to your project's local `src/index.css` file to see the complete 800-line custom stylesheet containing glassmorphic styling, sidebars, headers, and scrollbars)*

---

## 4. Shared Business Rules Engine (`src/utils/rules.js`)
Create `src/utils/rules.js`. This centralizes core business compliance rules:
```javascript
export const SYSTEM_DATE = '2026-07-12';

// Check if license is expired relative to 2026-07-12
export const isLicenseExpired = (expiryDate) => {
  if (!expiryDate) return true;
  return new Date(expiryDate) < new Date(SYSTEM_DATE);
};

// Check if license expires in next 30 days
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

// Rule #5: Cargo weight must not exceed vehicle's max capacity
export const isWithinLoadCapacity = (cargoWeightKg, vehicle) => {
  if (!vehicle) return false;
  return Number(cargoWeightKg) <= Number(vehicle.maxLoadKg);
};
```

---

## 5. Supabase Connection Script (`src/supabaseClient.js`)
Create `src/supabaseClient.js` to establish connection parameters:
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
```

---

## 6. Supabase API Repository Adapter (`src/api/api.js`)
Create `src/api/api.js`. This file converts frontend objects to database snake_case tables and enforces rule constraints:
*(Copy this complete file from your local `src/api/api.js` workspace copy)*

---

## 7. Session Auth Context (`src/context/AuthContext.jsx`)
Create `src/context/AuthContext.jsx` to manage sessions via Supabase Client SDK:
```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const currentUser = await authApi.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const loggedUser = await authApi.login(email, password);
      setUser(loggedUser);
      return loggedUser;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole: (roles) => {
      if (!user) return false;
      if (Array.isArray(roles)) {
        return roles.includes(user.role);
      }
      return user.role === roles;
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export default AuthContext;
```

---

## 8. Security Guard Interceptor (`src/components/ProtectedRoute.jsx`)
Create `src/components/ProtectedRoute.jsx` to block unauthorized role routes:
```javascript
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0f1d', color: '#06b6d4' }}>
        <div>
          <div className="pulse-dot mr-2"></div>
          <span style={{ fontWeight: 600, fontSize: '1.125rem', letterSpacing: '0.05em' }}>Verifying Session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
```

---

## 9. Layout Sidebar Shell (`src/components/Layout.jsx`)
Create `src/components/Layout.jsx`. It builds a responsive side drawer and dynamically gates navigations by role:
*(Copy from local workspace: `src/components/Layout.jsx`)*

---

## 10. Application Route Trees (`src/routes.jsx`)
Create `src/routes.jsx` to define views mapping:
```javascript
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Views
import Login from './features/auth/Login';
import Unauthorized from './features/auth/Unauthorized';
import Dashboard from './features/dashboard/Dashboard';
import VehiclesList from './features/vehicles/VehiclesList';
import DriversList from './features/drivers/DriversList';
import TripsList from './features/trips/TripsList';
import MaintenanceList from './features/maintenance/MaintenanceList';
import ExpensesList from './features/expenses/ExpensesList';
import Reports from './features/reports/Reports';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="vehicles" element={<ProtectedRoute allowedRoles={['Fleet Manager']}><VehiclesList /></ProtectedRoute>} />
        <Route path="drivers" element={<ProtectedRoute allowedRoles={['Safety Officer', 'Fleet Manager']}><DriversList /></ProtectedRoute>} />
        <Route path="trips" element={<ProtectedRoute allowedRoles={['Driver', 'Fleet Manager']}><TripsList /></ProtectedRoute>} />
        <Route path="maintenance" element={<ProtectedRoute allowedRoles={['Fleet Manager']}><MaintenanceList /></ProtectedRoute>} />
        <Route path="expenses" element={<ProtectedRoute allowedRoles={['Financial Analyst', 'Fleet Manager']}><ExpensesList /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute allowedRoles={['Financial Analyst', 'Fleet Manager']}><Reports /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

---

## 11. Application DOM Entry Point (`src/App.jsx`)
Overwrite `src/App.jsx` to mount our runtime router:
```javascript
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

---

## 12. Feature Screen Components (UI Views)
Create the remaining views in their modular features subfolders:

- `src/features/auth/Login.jsx` (Sign-in view with automated quick profile switchers)
- `src/features/auth/Unauthorized.jsx` (Blocked page redirect shield)
- `src/features/dashboard/Dashboard.jsx` (Overview KPI panels & cost SVG graphs)
- `src/features/vehicles/VehiclesList.jsx` (Vehicle inventory, edit modals, retire tools)
- `src/features/drivers/DriversList.jsx` (Drivers tracking panel with license expiration alerts)
- `src/features/trips/TripsList.jsx` (Kanban layout dispatches, load validations)
- `src/features/maintenance/MaintenanceList.jsx` (Workshop logging and auto status gating)
- `src/features/expenses/ExpensesList.jsx` (Toll expense registries and fuel inputs)
- `src/features/reports/Reports.jsx` (Cost analysis reports and CSV downloading utilities)
