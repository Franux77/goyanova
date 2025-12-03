import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient';
import { useAuth } from '../../../auth/useAuth';
import './PanelUsuario.css';

const ADMIN_EMAIL = "12torresfranco@gmail.com";

// 👇 QUITÉ 'publicar' de aquí
const enlaces = [
  { to: 'dashboard', label: 'Inicio', icon: 'dashboard' },
  { type: 'button', action: 'publicar' },
  { to: 'mis-servicios', label: 'Mis Servicios', icon: 'work' },
  { to: 'mi-membresia', label: 'Mi Membresía', icon: 'card_membership' },
  { to: 'notificaciones', label: 'Notificaciones', icon: 'notifications' },
  { to: 'opiniones', label: 'Opiniones', icon: 'star' },
  { to: 'perfil', label: 'Perfil', icon: 'person' },
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

  const [misServicios, setMisServicios] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [loadingServicios, setLoadingServicios] = useState(true);
  const [loadingNotificaciones, setLoadingNotificaciones] = useState(true);

  useEffect(() => {
    if (user) {
      setIsAdmin(user.email === ADMIN_EMAIL);
    }
  }, [user]);

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

  // 👇 FUNCIÓN NUEVA PARA VALIDAR ANTES DE PUBLICAR
  const handleIrAPublicar = async () => {
    try {
      if (!user) {
        alert('Debes iniciar sesión');
        return;
      }

      const { data, error } = await supabase
        .rpc('puede_publicar_servicio', {
          p_usuario_id: user.id
        });

      if (error) throw error;

      if (data.puede_publicar) {
        navigate('/panel/publicar');
      } else {
        navigate('/panel/mi-membresia');
      }
      
      closeSidebar();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al verificar límites');
    }
  };

  return (
    <div className="panel-usuario-layout">
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

      {isMobile && sidebarOpen && (
        <div className="panel-overlay" onClick={closeSidebar} />
      )}

      <aside className={`panel-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
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

        <nav className="panel-sidebar-nav">
          <div className="panel-nav-section">
  <span className="panel-nav-section-title">MENÚ PRINCIPAL</span>
  {enlaces.map((item, index) => {
    // 👇 Si es el marcador especial, renderizar el botón
    if (item.type === 'button' && item.action === 'publicar') {
      return (
        <button
          key={`button-${index}`}
          className="panel-nav-link"
          onClick={handleIrAPublicar}
          style={{ border: 'none', background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          <span className="material-icons panel-nav-icon">add_circle</span>
          <span className="panel-nav-text">Publicar Servicio</span>
          <span className="material-icons panel-nav-arrow">chevron_right</span>
        </button>
      );
    }
    
    // 👇 Si es un enlace normal
    return (
      <NavLink
        key={item.to}
        to={`/panel/${item.to}`}
        className={({ isActive }) =>
          `panel-nav-link ${isActive ? 'nav-link-active' : ''}`
        }
        onClick={closeSidebar}
      >
        <span className="material-icons panel-nav-icon">{item.icon}</span>
        <span className="panel-nav-text">{item.label}</span>
        <span className="material-icons panel-nav-arrow">chevron_right</span>
      </NavLink>
    );
  })}
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

        <div className="panel-sidebar-footer">
          <div className="panel-footer-brand">
            <span className="panel-footer-logo">GoyaNova</span>
          </div>
        </div>
      </aside>

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