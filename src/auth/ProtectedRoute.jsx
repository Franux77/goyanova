import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useSuspension } from './useSuspension';
import SuspensionModal from './login/SuspensionModal';

const ProtectedRoute = ({
  allowedRoles = [],
  redirectPath = '/no-autorizado',
  children,
}) => {
  const { user, perfil, loading: authLoading, error, signOut } = useAuth();
  const { suspensionActiva, loading: suspensionLoading, estaSuspendido } = useSuspension(user?.id);

  // Loading
  if (authLoading || suspensionLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 15px'
          }}></div>
          <p style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>
            Verificando acceso...
          </p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error de autenticación
  if (error) {
    return <div>Error de autenticación: {error.message || 'Intente nuevamente.'}</div>;
  }

  // No autenticado
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Esperar a que cargue el perfil
  if (!perfil) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <p>Cargando perfil...</p>
      </div>
    );
  }

  // Determinar si es admin por estado o rol
  const esAdmin = perfil.estado === 'admin' || perfil.rol === 'admin';

  // ADMINS NUNCA SE BLOQUEAN POR SUSPENSIÓN
  if (esAdmin) {
    if (allowedRoles.length > 0 && !allowedRoles.includes('admin')) {
      return <Navigate to={redirectPath} replace />;
    }
    return children ? children : <Outlet />;
  }

  // USUARIOS NORMALES - Verificar suspensión
  if (estaSuspendido) {
    return (
      <SuspensionModal
        suspension={suspensionActiva}
        onCerrarSesion={async () => {
          await signOut();
        }}
        onContactarSoporte={() => {
          window.location.href = 'mailto:graficoemprendedorr@gmail.com?subject=Consulta sobre suspensión de cuenta';
        }}
      />
    );
  }

  // Validar roles para usuarios normales
  if (allowedRoles.length > 0 && !allowedRoles.includes('usuario')) {
    return <Navigate to={redirectPath} replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;