// src/App.jsx - RUTAS PROTEGIDAS CORREGIDAS
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import { useMantenimiento } from './hooks/useMantenimiento';
import ModalMantenimiento from './components/ModalMantenimiento';
import InstallPWAModal from './components/InstallPWAModal';

// Componentes de carga inmediata
import Navbar from './components/home/Navbar';
import BannerUpgrade from './components/home/BannerUpgrade';
import NavbarCategory from './components/ListaPerfilesYDetalles/NavbarCategory';
import Home from './components/home/Home';
import ProtectedRoute from './auth/ProtectedRoute';
import RutaProtegidaAdmin from './auth/RutaProtegidaAdmin';
import Loading from './components/loading/Loading';
import Footer from './components/footer/Footer';
import Login from './auth/login/login';
import Register from './auth/login/Register';
import ResetPassword from './auth/login/ResetPassword';
import DashboardAdmin from './components/panel/admin/DashboardAdmin';

// Componentes sin lazy loading
import CategoryPage from './components/ListaPerfilesYDetalles/CategoryPage';
import ExplorarMapa from './components/mapa/ExplorarMapa';
import PublicarServicioForm from './components/publicar/PublicarServicioForm';
import FinalizacionExitosa from './components/publicar/FinalizacionExitosa';

// Lazy loading componentes secundarios
const Contacto = lazy(() => import('./components/contacto/Contacto'));
const Nosotros = lazy(() => import('./components/nosotros/Nosotros'));
const AyudaPublica = lazy(() => import('./components/ayuda/AyudaPublica'));
const PerfilDetalle = lazy(() => import('./components/ListaPerfilesYDetalles/perfil/PerfilDetalle'));
const OpinionesCompletas = lazy(() => import('./components/ListaPerfilesYDetalles/perfil/opinion/OpinionesCompletas'));

// Panel Usuario
const PanelUsuario = lazy(() => import('./components/panel/usuario/PanelUsuario'));
const Dashboard = lazy(() => import('./components/panel/usuario/Dashboard'));
const MisServicios = lazy(() => import('./components/panel/usuario/MisServicios'));
const Perfil = lazy(() => import('./components/panel/usuario/Perfil'));
const Opiniones = lazy(() => import('./components/panel/usuario/Opiniones'));
const Solicitudes = lazy(() => import('./components/panel/usuario/Solicitudes'));
const Configuracion = lazy(() => import('./components/panel/usuario/Configuracion'));
const Notificaciones = lazy(() => import('./components/panel/usuario/Notificaciones'));
const AyudaSoporte = lazy(() => import('./components/panel/usuario/AyudaSoporte'));
const MiMembresia = lazy(() => import('./components/panel/usuario/MiMembresia'));

// Panel Admin
const PanelAdmin = lazy(() => import('./components/panel/admin/PanelAdmin'));
const UsuariosAdmin = lazy(() => import('./components/panel/admin/UsuariosAdmin'));
const ServiciosAdmin = lazy(() => import('./components/panel/admin/ServiciosAdmin'));
const ComentariosAdmin = lazy(() => import('./components/panel/admin/ComentariosAdmin'));
const SolicitudesEliminacion = lazy(() => import('./components/panel/admin/SolicitudesEliminacion'));
const ReportesAdmin = lazy(() => import('./components/panel/admin/ReportesAdmin'));
const CodigosPromocionalesAdmin = lazy(() => import('./components/panel/admin/CodigosPromocionalesAdmin'));
const MembresiasAdmin = lazy(() => import('./components/panel/admin/MembresiasAdmin'));
const CategoriasAdmin = lazy(() => import('./components/panel/admin/CategoriasAdmin'));
const ConfiguracionAdmin = lazy(() => import('./components/panel/admin/ConfiguracionAdmin'));
const GestionFAQs = lazy(() => import('./components/panel/admin/GestionFAQs'));
const GestionTutoriales = lazy(() => import('./components/panel/admin/GestionTutoriales'));
const GestionMensajesSoporte = lazy(() => import('./components/panel/admin/MensajesSoporte'));

const RouteLoadingIndicator = ({ children }) => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      {isTransitioning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #1774f6, #00d4ff)',
          zIndex: 99999,
          boxShadow: '0 0 10px rgba(23, 116, 246, 0.5)',
          animation: 'loadingBar 0.8s ease-in-out infinite'
        }} />
      )}
      {children}
    </>
  );
};

const AppContent = () => {
  const location = useLocation();
  const { user, perfil, loading: authLoading } = useAuth();
  const { config, loading: mantenimientoLoading, enMantenimiento, puedeAcceder } = useMantenimiento(user?.id);
  
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  const isHome = location.pathname === '/';
  const isCategoria = location.pathname.startsWith('/categoria');
  const isAdmin = perfil?.rol === 'admin';
  
  const mostrarFooter = location.pathname === '/';
  const rutasExceptuadas = ['/login', '/register', '/reset-password'];
  const esRutaExceptuada = rutasExceptuadas.some(ruta => location.pathname.startsWith(ruta));

  useEffect(() => {
    if (!authLoading && !mantenimientoLoading && !initialLoadComplete) {
      setInitialLoadComplete(true);
    }
  }, [authLoading, mantenimientoLoading, initialLoadComplete]);

  const mostrarLoadingGlobal = !initialLoadComplete && 
                                (authLoading || mantenimientoLoading) && 
                                !esRutaExceptuada;

  const mostrarMantenimiento = initialLoadComplete && 
                                enMantenimiento && 
                                !esRutaExceptuada && 
                                !isAdmin && 
                                !puedeAcceder;

  if (mostrarLoadingGlobal) {
    return <Loading message="Cargando GoyaNova..." fullScreen={true} />;
  }

  if (mostrarMantenimiento) {
    return <ModalMantenimiento config={config} />;
  }

  return (
    <>
      <InstallPWAModal />
      
      {/* 🆕 BANNER UPGRADE arriba de todo */}
      {isHome && <BannerUpgrade user={user} />}
      
      {isHome && <Navbar />}
      {isCategoria && <NavbarCategory />}

      {enMantenimiento && isAdmin && !esRutaExceptuada && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
          color: 'white',
          padding: '14px 20px',
          textAlign: 'center',
          fontSize: '15px',
          fontWeight: '700',
          zIndex: 99999,
          boxShadow: '0 4px 12px rgba(255, 152, 0, 0.5)',
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          borderBottom: '3px solid rgba(255, 255, 255, 0.3)',
          animation: 'bannerPulse 3s infinite'
        }}>
          🔧 MODO MANTENIMIENTO ACTIVO - Solo visible para administradores
          <div style={{
            fontSize: '11px',
            marginTop: '4px',
            opacity: '0.9',
            fontWeight: '500',
            letterSpacing: '0.5px'
          }}>
            Los usuarios normales están viendo el modal de mantenimiento
          </div>
        </div>
      )}

      <main style={enMantenimiento && isAdmin && !esRutaExceptuada ? { marginTop: '68px' } : {}}>
        <RouteLoadingIndicator>
          <Suspense fallback={null}>
            <Routes>
              {/* ✅ RUTAS PÚBLICAS */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/categoria/:tipo/:categoria" element={<CategoryPage />} />
              <Route path="/perfil/:id" element={<PerfilDetalle />} />
              <Route path="/perfil/:perfilId/opiniones" element={<OpinionesCompletas />} />
              <Route path="/contacto" element={<Contacto />} />
              <Route path="/nosotros" element={<Nosotros />} />
              <Route path="/ayuda" element={<AyudaPublica />} />
              <Route path="/explorar" element={<ExplorarMapa />} />

              {/* 🔒 RUTA /PUBLICAR AHORA PROTEGIDA */}
              <Route
                path="/publicar"
                element={
                  <ProtectedRoute allowedRoles={['usuario', 'admin']}>
                    <PublicarServicioForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/publicar/finalizado"
                element={
                  <ProtectedRoute allowedRoles={['usuario', 'admin']}>
                    <FinalizacionExitosa />
                  </ProtectedRoute>
                }
              />

              {/* 🔒 PANEL USUARIO PROTEGIDO */}
              <Route
                path="/panel/*"
                element={
                  <ProtectedRoute allowedRoles={['usuario', 'admin']}>
                    <PanelUsuario />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="mis-servicios" element={<MisServicios />} />
                <Route path="editar-servicio/:id" element={<PublicarServicioForm />} />
                <Route path="publicar" element={<PublicarServicioForm />} />
                <Route path="perfil" element={<Perfil />} />
                <Route path="opiniones" element={<Opiniones />} />
                <Route path="solicitudes" element={<Solicitudes />} />
                <Route path="configuracion" element={<Configuracion />} />
                <Route path="notificaciones" element={<Notificaciones />} />
                <Route path="ayuda" element={<AyudaSoporte />} />
                <Route path="mi-membresia" element={<MiMembresia />} />
              </Route>

              {/* 🔒 PANEL ADMIN PROTEGIDO */}
              <Route
                path="/panel/admin/*"
                element={
                  <RutaProtegidaAdmin>
                    <PanelAdmin />
                  </RutaProtegidaAdmin>
                }
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<DashboardAdmin />} />
                <Route path="usuarios" element={<UsuariosAdmin />} />
                <Route path="servicios" element={<ServiciosAdmin />} />
                <Route path="categorias" element={<CategoriasAdmin />} />
                <Route path="comentarios" element={<ComentariosAdmin />} />
                <Route path="solicitudes-eliminacion" element={<SolicitudesEliminacion />} />
                <Route path="reportes" element={<ReportesAdmin />} />
                <Route path="codigos" element={<CodigosPromocionalesAdmin />} />
                <Route path="membresias" element={<MembresiasAdmin />} />
                <Route path="faqs" element={<GestionFAQs />} />
                <Route path="tutoriales" element={<GestionTutoriales />} />
                <Route path="mensajes-soporte" element={<GestionMensajesSoporte />} />
                <Route path="configuracion" element={<ConfiguracionAdmin />} />
                <Route path="publicar" element={<PublicarServicioForm />} />
                <Route path="publicar/:id" element={<PublicarServicioForm />} />
              </Route>

              <Route path="/no-autorizado" element={<h2>No autorizado</h2>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </RouteLoadingIndicator>
      </main>

      {mostrarFooter && <Footer />}

      <style>{`
        @keyframes bannerPulse {
          0%, 100% { 
            opacity: 1;
            transform: translateY(0);
          }
          50% { 
            opacity: 0.95;
            transform: translateY(-1px);
          }
        }

        @keyframes loadingBar {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </>
  );
};

const App = () => <AppContent />;

export default App;