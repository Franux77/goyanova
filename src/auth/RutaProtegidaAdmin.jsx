import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';

const ADMIN_EMAILS = [
  '12torresfranco@gmail.com',
  'claudiaoviedo509@gmail.com',
  'maximocenturion.07@gmail.com'
];

const ProtectedRoute = ({
  allowedRoles = [],
  redirectPath = '/no-autorizado',
  children,
}) => {
  const { user, loading, error } = useAuth();

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error de autenticación: {error.message || 'Intente nuevamente.'}</div>;
  if (!user) return <Navigate to="/login" replace />;

  const rol = ADMIN_EMAILS.some(email => email.toLowerCase() === user.email?.toLowerCase()) ? 'admin' : 'usuario';

  // Si no está en allowedRoles, redirigimos
  if (allowedRoles.length > 0 && !allowedRoles.includes(rol)) {
    return <Navigate to={redirectPath} replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
