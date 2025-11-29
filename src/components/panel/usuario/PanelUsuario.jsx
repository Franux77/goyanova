import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient';
import { useAuth } from '../../../auth/useAuth';
import './PanelUsuario.css';

const ADMIN_EMAIL = "12torresfranco@gmail.com";

const enlaces = [
  { to: 'dashboard', label: 'Inicio', icon: 'dashboard' },
  { to: 'mis-servicios', label: 'Mis Servicios', icon: 'work' },
  { to: 'mi-membresia', label: 'Mi Membresía', icon: 'card_membership' },
  { to: 'perfil', label: 'Perfil', icon: 'person' },
  { to: 'opiniones', label: 'Opiniones', icon: 'star' },
  { to: 'notificaciones', label: 'Notificaciones', icon: 'notifications' },
  { to: 'configuracion', label: 'Configuración', icon: 'settings' },
  { to: 'ayuda', label: 'Ayuda / Soporte', icon: 'help' },
];

const PanelUsuario = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isAdmin, setIsAdmin] = useState(false);

  const location = useLocation();

  // Estado para datos reales
  const [misServicios, setMisServicios] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [loadingServicios, setLoadingServicios] = useState(true);
  const [loadingNotificaciones, setLoadingNotificaciones] = useState(true);

  // Verificar si es admin
  useEffect(() => {
    if (user) {
      setIsAdmin(user.email === ADMIN_EMAIL);
    }
  }, [user]);

  // Manejo de responsive
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => {
    if (isMobile) setSidebarOpen(false);
  };

  // Bloquear scroll cuando sidebar está abierto en móvil
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, sidebarOpen]);

  // Cargar servicios del usuario
  useEffect(() => {
    if (!user) return;
    const fetchServicios = async () => {
      setLoadingServicios(true);
      const { data, error } = await supabase
        .from('servicios')
        .select('*')
        .eq('usuario_id', user.id)
        .order('creado_en', { ascending: false });

      if (error) console.error(error);
      else setMisServicios(data || []);
      setLoadingServicios(false);
    };
    fetchServicios();
  }, [user]);

  // Cargar notificaciones del usuario
  useEffect(() => {
    if (!user) return;
    const fetchNotificaciones = async () => {
      setLoadingNotificaciones(true);
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('usuario_id', user.id)
        .order('creada_en', { ascending: false });

      if (error) console.error(error);
      else setNotificaciones(data || []);
      setLoadingNotificaciones(false);
    };
    fetchNotificaciones();
  }, [user]);

  const handleCambiarAAdmin = () => {
    navigate('/panel/admin/dashboard');
    closeSidebar();
  };

  return (
    <div className="panel-usuario-layout">
      {/* Header móvil */}
      {isMobile && (
        <header className="panel-mobile-header">
          <button
  className="panel-hamburger-btn"
  onClick={toggleSidebar}
  aria-label="Abrir menú"
>
  <span className="hamburger-line"></span>
  <span className="hamburger-line"></span>
  <span className="hamburger-line"></span>
</button>
          
          <div className="panel-mobile-logo">
            <img 
              src="/assets/GoyaNova_20250918_144009_0000.png" 
              alt="Logo GoyaNova" 
              className="panel-logo-img-mobile"
            />
            <span className="panel-logo-text">GoyaNova</span>
          </div>

          <div className="panel-mobile-spacer"></div>
        </header>
      )}

      {/* Overlay */}
      {isMobile && sidebarOpen && (
        <div className="panel-overlay" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside className={`panel-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Header del sidebar */}
        <div className="panel-sidebar-header">
          <div className="panel-sidebar-brand">
            <div className="panel-brand-logo">
              <img 
                src="/assets/GoyaNova_20250918_144009_0000.png" 
                alt="Logo" 
                className="panel-logo-img"
              />
            </div>
            <div className="panel-brand-content">
              <h2 className="panel-brand-text">Mi Panel</h2>
              <span className="panel-brand-subtitle">Usuario</span>
            </div>
          </div>
          
          {isMobile && (
            <button 
              className="panel-close-btn"
              onClick={closeSidebar}
              aria-label="Cerrar menú"
            >
              <span className="material-icons">close</span>
            </button>
          )}
        </div>

        {/* Botón cambiar a modo admin - SOLO para admins */}
        {isAdmin && (
          <div className="panel-modo-switch">
            <button 
              className="panel-cambiar-modo-btn"
              onClick={handleCambiarAAdmin}
            >
              <span className="material-icons">admin_panel_settings</span>
              <div className="cambiar-modo-text">
                <span className="modo-label">Cambiar a</span>
                <span className="modo-nombre">Panel Admin</span>
              </div>
            </button>
          </div>
        )}

        {/* Navegación */}
        <nav className="panel-sidebar-nav">
          <div className="panel-nav-section">
            <span className="panel-nav-section-title">MENÚ PRINCIPAL</span>
            {enlaces.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={`/panel/${to}`}
                className={({ isActive }) =>
                  `panel-nav-link ${isActive ? 'nav-link-active' : ''}`
                }
                onClick={closeSidebar}
              >
                <span className="material-icons panel-nav-icon">{icon}</span>
                <span className="panel-nav-text">{label}</span>
                <span className="material-icons panel-nav-arrow">chevron_right</span>
              </NavLink>
            ))}
          </div>

          <div className="panel-nav-divider"></div>

          <div className="panel-nav-section">
            <NavLink 
              to="/" 
              className="panel-nav-link panel-nav-link-home"
              onClick={closeSidebar}
            >
              <span className="material-icons panel-nav-icon">home</span>
              <span className="panel-nav-text">Volver al inicio</span>
              <span className="material-icons panel-nav-arrow">chevron_right</span>
            </NavLink>
          </div>
        </nav>

        {/* Footer del sidebar */}
        <div className="panel-sidebar-footer">
          <div className="panel-footer-brand">
            <span className="panel-footer-logo">GoyaNova</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="panel-main-content">
        <Outlet
          context={{
            misServicios,
            loadingServicios,
            notificaciones,
            loadingNotificaciones,
          }}
          key={location.pathname}
        />
      </main>
    </div>
  );
};

export default PanelUsuario;