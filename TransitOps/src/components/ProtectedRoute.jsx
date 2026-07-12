import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0a0f1d] text-cyan-400">
        <div className="text-center">
          <div className="pulse-dot mr-2"></div>
          <span className="font-semibold text-lg tracking-wider">Verifying Session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login but save the current location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // User is logged in but doesn't have permission for this route
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
