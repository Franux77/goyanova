import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import './NavbarGeneral.css';

const NavbarGeneral = () => {
  const { user, perfil, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef();

  // Detectar scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Bloquear scroll cuando el menú está abierto
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/');
  };

  const handleGoBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const obtenerRutaPanel = () => {
    if (!perfil) return '/';
    const esAdmin = perfil.estado === 'admin' || perfil.rol === 'admin';
    return esAdmin ? '/panel/admin/dashboard' : '/panel/dashboard';
  };

  const tieneAccesoPanel = perfil && (
    perfil.estado === 'admin' || 
    perfil.rol === 'admin' || 
    perfil.estado === 'activo'
  );

  // Determinar el título según la ruta
  const obtenerTitulo = () => {
    if (location.pathname === '/ayuda') return 'Centro de Ayuda';
    if (location.pathname === '/contacto') return 'Contacto';
    if (location.pathname === '/nosotros') return 'Nosotros';
    if (location.pathname === '/explorar') return 'Explorar Mapa';
    return 'GoyaNova';
  };

  const navLinks = [
    { to: '/', label: 'Inicio', icon: 'home' },
    { to: '/nosotros', label: 'Nosotros', icon: 'info' },
    { to: '/contacto', label: 'Contacto', icon: 'email' },
    { to: '/ayuda', label: 'Ayuda', icon: 'help' },
    { to: '/explorar', label: 'Explorar', icon: 'map' },
  ];

  return (
    <>
      <nav
        ref={navRef}
        className={`navbar-general ${scrolled ? 'navbar-scrolled' : ''}`}
      >
        <div className="navbar-general-container">
          {/* Botón Volver */}
          <button
            className="navbar-general-btn-back"
            onClick={handleGoBack}
            aria-label="Volver"
          >
            <span className="material-icons">arrow_back</span>
            <span className="navbar-general-back-label">Volver</span>
          </button>

          {/* Logo (solo visible en desktop) */}
          {/* <Link to="/" className="navbar-general-logo" onClick={() => setMenuOpen(false)}>
            <img
              src="/assets/GoyaNova_20250918_144009_0000.png"
              alt="GoyaNova"
              className="navbar-general-logo-img"
            />
            <span className="navbar-general-logo-text">{obtenerTitulo()}</span>
          </Link> */}

          {/* Links Desktop */}
          <ul className="navbar-general-links-desktop">
            {navLinks.map((link) => (
              <li key={link.to} className="navbar-general-item">
                <Link
                  to={link.to}
                  className={`navbar-general-link ${
                    location.pathname === link.to ? 'navbar-general-link-active' : ''
                  }`}
                >
                  <span className="material-icons navbar-general-link-icon">{link.icon}</span>
                  <span className="navbar-general-link-text">{link.label}</span>
                </Link>
              </li>
            ))}

            {tieneAccesoPanel && (
              <li className="navbar-general-item">
                <button
                  className="navbar-general-btn-link"
                  onClick={() => navigate(obtenerRutaPanel())}
                >
                  <span className="material-icons">dashboard</span>
                  <span>Mi Panel</span>
                </button>
              </li>
            )}
          </ul>

          {/* Auth Desktop */}
          <div className="navbar-general-auth-section">
            {!user ? (
              <Link to="/login" className="navbar-general-btn-login">
                Iniciar sesión
              </Link>
            ) : (
              <button className="navbar-general-btn-logout" onClick={handleLogout}>
                Cerrar sesión
              </button>
            )}
          </div>

          {/* Hamburguesa */}
          <button
            className={`navbar-general-hamburger ${menuOpen ? 'open' : ''}`}
            aria-label="Menú"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Sidebar Móvil */}
      <div
        className={`navbar-general-mobile-sidebar ${
          menuOpen ? 'navbar-general-mobile-sidebar-open' : ''
        }`}
      >
        <div className="navbar-general-mobile-sidebar-header">
          <div className="navbar-general-sidebar-brand">
            <span className="material-icons navbar-general-brand-icon-mobile">menu_book</span>
            <h3>Navegación</h3>
          </div>
          <button
            className="navbar-general-sidebar-close-btn"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <ul className="navbar-general-mobile-sidebar-links">
          {navLinks.map((link) => (
            <li key={link.to} className="navbar-general-mobile-nav-item">
              <Link
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`navbar-general-mobile-nav-link ${
                  location.pathname === link.to ? 'navbar-general-mobile-nav-active' : ''
                }`}
              >
                <span className="material-icons navbar-general-mobile-nav-icon">{link.icon}</span>
                <span className="navbar-general-mobile-nav-text">{link.label}</span>
                <span className="material-icons navbar-general-mobile-nav-arrow">
                  chevron_right
                </span>
              </Link>
            </li>
          ))}

          {tieneAccesoPanel && (
            <li className="navbar-general-mobile-nav-item">
              <button
                className="navbar-general-mobile-btn-link"
                onClick={() => {
                  setMenuOpen(false);
                  navigate(obtenerRutaPanel());
                }}
              >
                <span className="material-icons navbar-general-mobile-nav-icon">dashboard</span>
                <span className="navbar-general-mobile-nav-text">Mi Panel</span>
                <span className="material-icons navbar-general-mobile-nav-arrow">
                  chevron_right
                </span>
              </button>
            </li>
          )}
        </ul>

        {/* Auth Móvil */}
        <div className="navbar-general-mobile-auth">
          {!user ? (
            <Link
              to="/login"
              className="navbar-general-btn-login"
              onClick={() => setMenuOpen(false)}
            >
              Iniciar sesión
            </Link>
          ) : (
            <button className="navbar-general-btn-logout" onClick={handleLogout}>
              Cerrar sesión
            </button>
          )}
        </div>
      </div>

      {/* Overlay */}
      <div
        className={`navbar-general-overlay ${
          menuOpen ? 'navbar-general-overlay-visible' : ''
        }`}
        onClick={() => setMenuOpen(false)}
      />
    </>
  );
};

export default NavbarGeneral;