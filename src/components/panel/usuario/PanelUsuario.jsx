import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient';
import { useAuth } from '../../../auth/useAuth';
import BottomNav from '../../navegacion/BottomNav';
import MasSheetPanel from '../../navegacion/MasSheetPanel';
import './PanelUsuario.css';

const ADMIN_EMAILS = [
  '12torresfranco@gmail.com',
  'claudiaoviedo509@gmail.com',
  'maximocenturion.07@gmail.com'
];

// 👇 QUITÉ 'publicar' de aquí
const enlaces = [
  { to: 'dashboard', label: 'Inicio', icon: 'dashboard' },
  { type: 'button', action: 'publicar' },
  { to: 'mis-servicios', label: 'Mis Servicios', icon: 'work' },
    { to: 'mi-membresia', label: 'Mi Membresía', icon: 'card_membership' },
  { to: 'verificacion', label: 'Badge Verificado', icon: 'verified' },
  { to: 'notificaciones', label: 'Notificaciones', icon: 'notifications' },
  { to: 'opiniones', label: 'Opiniones', icon: 'star' },
  { to: 'perfil', label: 'Perfil', icon: 'person' },
  { to: 'configuracion', label: 'Configuración', icon: 'settings' },
  { to: 'ayuda', label: 'Ayuda / Soporte', icon: 'help' },
];

const PanelUsuario = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isAdmin, setIsAdmin] = useState(false);
  const [masAbierto, setMasAbierto] = useState(false);

  const location = useLocation();

  const [misServicios, setMisServicios] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [loadingServicios, setLoadingServicios] = useState(true);
  const [loadingNotificaciones, setLoadingNotificaciones] = useState(true);

  useEffect(() => {
    if (user) {
      const esAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === user.email?.toLowerCase());
      setIsAdmin(esAdmin);
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

  const handleSalir = async () => {
    closeSidebar();
    await logout();
    navigate('/');
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
            onClick={() => setMasAbierto(true)}
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
        </nav>

        <div className="panel-sidebar-footer">
          <NavLink
            to="/"
            className="panel-footer-link panel-footer-link-home"
            onClick={closeSidebar}
          >
            <span className="material-icons">home</span>
            <span>Volver al inicio</span>
          </NavLink>
          <button
            type="button"
            className="panel-footer-link panel-footer-link-logout"
            onClick={handleSalir}
          >
            <span className="material-icons">logout</span>
            <span>Salir</span>
          </button>
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

      {isMobile && (
        <BottomNav
          variante="bottom-nav-panel-usuario"
          items={[
            { to: '/panel/dashboard', label: 'Inicio', icon: 'home', end: true },
            { to: '/panel/mis-servicios', label: 'Servicios', icon: 'work' },
            { to: '/panel/notificaciones', label: 'Avisos', icon: 'notifications' },
          ]}
          onMas={() => setMasAbierto(true)}
          masActivo={masAbierto}
        />
      )}

      <MasSheetPanel
        abierto={masAbierto}
        onClose={() => setMasAbierto(false)}
        titulo="Mi Panel"
        subtitulo="Usuario"
        cambiarModo={
          isAdmin
            ? { nombre: 'Cambiar a Panel Admin', icon: 'admin_panel_settings', onClick: handleCambiarAAdmin }
            : null
        }
        items={enlaces.map((item, index) =>
          item.type === 'button' && item.action === 'publicar'
            ? { label: 'Publicar Servicio', icon: 'add_circle', onClick: handleIrAPublicar, key: `btn-${index}` }
            : { to: `/panel/${item.to}`, label: item.label, icon: item.icon }
        )}
        onSalir={handleSalir}
      />
    </div>
  );
};

export default PanelUsuario;