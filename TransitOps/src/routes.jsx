import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// View Imports
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
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Gated Application Shell */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard available to all logged-in roles */}
        <Route index element={<Dashboard />} />

        {/* Vehicles Registry: Fleet Manager only */}
        <Route
          path="vehicles"
          element={
            <ProtectedRoute allowedRoles={['Fleet Manager']}>
              <VehiclesList />
            </ProtectedRoute>
          }
        />

        {/* Driver Management: Safety Officer and Fleet Manager */}
        <Route
          path="drivers"
          element={
            <ProtectedRoute allowedRoles={['Safety Officer', 'Fleet Manager']}>
              <DriversList />
            </ProtectedRoute>
          }
        />

        {/* Trip Management: Driver and Fleet Manager */}
        <Route
          path="trips"
          element={
            <ProtectedRoute allowedRoles={['Driver', 'Fleet Manager']}>
              <TripsList />
            </ProtectedRoute>
          }
        />

        {/* Maintenance Logs: Fleet Manager only */}
        <Route
          path="maintenance"
          element={
            <ProtectedRoute allowedRoles={['Fleet Manager']}>
              <MaintenanceList />
            </ProtectedRoute>
          }
        />

        {/* Fuel & Expenses: Financial Analyst and Fleet Manager */}
        <Route
          path="expenses"
          element={
            <ProtectedRoute allowedRoles={['Financial Analyst', 'Fleet Manager']}>
              <ExpensesList />
            </ProtectedRoute>
          }
        />

        {/* Reports & Analytics: Financial Analyst and Fleet Manager */}
        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={['Financial Analyst', 'Fleet Manager']}>
              <Reports />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback Catch-All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
