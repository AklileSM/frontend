import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { Role } from '../../context/AuthContext';

const hasRequiredRole = (userRole: Role, required?: Role[] | undefined) => {
  if (!required || required.length === 0) return true;
  return required.includes(userRole);
};

const ProtectedRoute: React.FC<{ children: React.ReactElement; roles?: Role[] }> = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user && !hasRequiredRole(user.role, roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
