import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/useAuth';
import './PanelAdmin.css';

const PanelAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

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

  const secciones = [
    { nombre: 'Panel Inicio', ruta: '/panel/admin/dashboard', icono: 'dashboard' },
    { nombre: 'Usuarios', ruta: '/panel/admin/usuarios', icono: 'people' },
    { nombre: 'Servicios', ruta: '/panel/admin/servicios', icono: 'build' },
    { nombre: 'Categorías', ruta: '/panel/admin/categorias', icono: 'folder' },
    { nombre: 'Comentarios', ruta: '/panel/admin/comentarios', icono: 'forum' },
    { nombre: 'Códigos Promo', ruta: '/panel/admin/codigos', icono: 'confirmation_number' },
        { nombre: 'Membresías', ruta: '/panel/admin/membresias', icono: 'card_membership' },
    { nombre: 'Verificaciones', ruta: '/panel/admin/verificaciones', icono: 'verified' },
    { nombre: 'Solicitudes', ruta: '/panel/admin/solicitudes-eliminacion', icono: 'delete' },
    { nombre: 'Reportes', ruta: '/panel/admin/reportes', icono: 'warning' },
    // 👇 NUEVAS SECCIONES DE AYUDA Y SOPORTE
    { nombre: 'FAQs', ruta: '/panel/admin/faqs', icono: 'quiz' },
    { nombre: 'Tutoriales', ruta: '/panel/admin/tutoriales', icono: 'video_library' },
    { nombre: 'Mensajes Soporte', ruta: '/panel/admin/mensajes-soporte', icono: 'support_agent' },
    // 👆 FIN NUEVAS SECCIONES
    { nombre: 'Configuración', ruta: '/panel/admin/configuracion', icono: 'settings' },
  ];

  const handleCambiarModo = () => {
    navigate('/panel/dashboard');
    closeSidebar();
  };

  return (
    <div className="panel-admin-layout">
      {/* Header móvil */}
      {isMobile && (
        <header className="admin-mobile-header">
          <button
            className="panel-hamburger-btn"
            onClick={toggleSidebar}
            aria-label="Abrir menú"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
          
          <div className="admin-mobile-logo">
            <img 
              src="/assets/GoyaNova_20250918_144009_0000.png" 
              alt="Logo GoyaNova" 
              className="admin-logo-img-mobile"
            />
            <span className="admin-logo-text-mobile">GoyaNova</span>
          </div>

          <div className="admin-mobile-spacer"></div>
        </header>
      )}

      {/* Overlay */}
      {isMobile && sidebarOpen && (
        <div className="admin-overlay" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Header del sidebar */}
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-brand">
            <div className="admin-brand-logo">
              <img 
                src="/assets/GoyaNova_20250918_144009_0000.png" 
                alt="Logo" 
                className="admin-logo-img"
              />
            </div>
            <div className="admin-brand-content">
              <h2 className="admin-brand-text">Panel Admin</h2>
              <span className="admin-brand-subtitle">Administración</span>
            </div>
          </div>
          
          {isMobile && (
            <button 
              className="admin-close-btn"
              onClick={closeSidebar}
              aria-label="Cerrar menú"
            >
              <span className="material-icons">close</span>
            </button>
          )}
        </div>

        {/* Botón cambiar a modo usuario */}
        <div className="admin-modo-switch">
          <button 
            className="admin-cambiar-modo-btn"
            onClick={handleCambiarModo}
          >
            <span className="material-icons">swap_horiz</span>
            <div className="cambiar-modo-text">
              <span className="modo-label">Cambiar a</span>
              <span className="modo-nombre">Panel Usuario</span>
            </div>
          </button>
        </div>

        {/* Navegación */}
        <nav className="admin-sidebar-nav">
          <div className="admin-nav-section">
            <span className="admin-nav-section-title">ADMINISTRACIÓN</span>
            {secciones.map((item) => (
              <NavLink
                key={item.ruta}
                to={item.ruta}
                className={({ isActive }) =>
                  `admin-nav-link ${isActive ? 'nav-link-active' : ''}`
                }
                onClick={closeSidebar}
                end={item.ruta === '/panel/admin/dashboard'}
              >
                <span className="material-icons admin-nav-icon">{item.icono}</span>
                <span className="admin-nav-text">{item.nombre}</span>
                <span className="material-icons admin-nav-arrow">chevron_right</span>
              </NavLink>
            ))}
          </div>

          <div className="admin-nav-divider"></div>

          <div className="admin-nav-section">
            <NavLink 
              to="/" 
              className="admin-nav-link admin-nav-link-home"
              onClick={closeSidebar}
            >
              <span className="material-icons admin-nav-icon">home</span>
              <span className="admin-nav-text">Volver al inicio</span>
              <span className="material-icons admin-nav-arrow">chevron_right</span>
            </NavLink>
          </div>
        </nav>

        {/* Footer del sidebar */}
        <div className="admin-sidebar-footer">
          <div className="admin-footer-brand">
            <span className="admin-footer-logo">GoyaNova</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default PanelAdmin;