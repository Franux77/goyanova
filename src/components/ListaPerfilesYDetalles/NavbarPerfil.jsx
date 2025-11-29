import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import './NavbarCategory.css';

const ADMIN_EMAIL = "12torresfranco@gmail.com";

const NavbarPerfil = () => {
  const { user } = useAuth();
  const [rol, setRol] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef();

  useEffect(() => {
    if (user) {
      setRol(user.email === ADMIN_EMAIL ? "admin" : "prestador");
    } else {
      setRol(null);
    }
  }, [user]);

  const obtenerRutaPanel = () => {
    if (!rol) return '/';
    return rol === 'admin' ? '/panel/admin' : '/panel/dashboard';
  };

  const rutaPanel = obtenerRutaPanel();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  const handleVolverClick = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navLinks = [
    { to: '/', label: 'Inicio', icon: 'home' },
    { to: '/nosotros', label: 'Nosotros', icon: 'group' },
    { to: '/contacto', label: 'Contacto', icon: 'phone_in_talk' },
    { to: '/explorar', label: 'Mapa', icon: 'map' },
  ];

  return (
    <>
      <nav
        ref={navRef}
        className={`nav-shared ${scrolled ? 'nav-shared-scrolled' : ''}`}
      >
        <div className="nav-shared-container">
          {/* Botón Volver */}
          <button
            className="nav-shared-back-btn"
            onClick={handleVolverClick}
            aria-label="Volver"
          >
            <span className="material-icons">arrow_back</span>
            <span className="nav-shared-back-label">Volver</span>
          </button>

          {/* Links de navegación - Desktop */}
          <ul className="nav-shared-links-desktop">
            {navLinks.map((link) => (
              <li key={link.to} className="nav-shared-item">
                <Link
                  to={link.to}
                  className={`nav-shared-link ${location.pathname === link.to ? 'nav-shared-link-active' : ''}`}
                >
                  <span className="material-icons nav-shared-link-icon">{link.icon}</span>
                  <span className="nav-shared-link-text">{link.label}</span>
                </Link>
              </li>
            ))}

            {rol && (
              <li className="nav-shared-item">
                <Link
                  to={rutaPanel}
                  className={`nav-shared-link ${location.pathname.includes('/panel') ? 'nav-shared-link-active' : ''}`}
                >
                  <span className="material-icons nav-shared-link-icon">dashboard</span>
                  <span className="nav-shared-link-text">Mi Panel</span>
                </Link>
              </li>
            )}
          </ul>

          {/* Botón de autenticación / Menú hamburguesa */}
          <div className="nav-shared-actions">
            {!user && (
              <Link to="/login" className="nav-shared-login-btn">
                <span className="material-icons">login</span>
                <span>Ingresar</span>
              </Link>
            )}

            <button
              className={`nav-shared-hamburger ${menuOpen ? 'nav-shared-hamburger-active' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menú"
            >
              <span className="nav-shared-hamburger-line"></span>
              <span className="nav-shared-hamburger-line"></span>
              <span className="nav-shared-hamburger-line"></span>
            </button>
          </div>
        </div>
      </nav>

      {/* Menú móvil deslizable */}
      <div className={`nav-shared-mobile-sidebar ${menuOpen ? 'nav-shared-mobile-sidebar-open' : ''}`}>
        <div className="nav-shared-mobile-sidebar-header">
          <div className="nav-shared-sidebar-brand">
            <span className="material-icons nav-shared-brand-icon-mobile">menu_book</span>
            <h3>Navegación</h3>
          </div>
          <button
            className="nav-shared-sidebar-close-btn"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <ul className="nav-shared-mobile-sidebar-links">
          {navLinks.map((link) => (
            <li key={link.to} className="nav-shared-mobile-nav-item">
              <Link
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`nav-shared-mobile-nav-link ${location.pathname === link.to ? 'nav-shared-mobile-nav-active' : ''}`}
              >
                <span className="material-icons nav-shared-mobile-nav-icon">{link.icon}</span>
                <span className="nav-shared-mobile-nav-text">{link.label}</span>
                <span className="material-icons nav-shared-mobile-nav-arrow">chevron_right</span>
              </Link>
            </li>
          ))}

          {rol && (
            <li className="nav-shared-mobile-nav-item">
              <Link
                to={rutaPanel}
                onClick={() => setMenuOpen(false)}
                className={`nav-shared-mobile-nav-link ${location.pathname.includes('/panel') ? 'nav-shared-mobile-nav-active' : ''}`}
              >
                <span className="material-icons nav-shared-mobile-nav-icon">dashboard</span>
                <span className="nav-shared-mobile-nav-text">Mi Panel</span>
                <span className="material-icons nav-shared-mobile-nav-arrow">chevron_right</span>
              </Link>
            </li>
          )}
        </ul>

        {!user && (
          <div className="nav-shared-mobile-sidebar-footer">
            <Link
              to="/login"
              className="nav-shared-mobile-login-btn"
              onClick={() => setMenuOpen(false)}
            >
              <span className="material-icons">login</span>
              <span>Iniciar sesión</span>
            </Link>
          </div>
        )}
      </div>

      {/* Overlay oscuro */}
      <div
        className={`nav-shared-overlay ${menuOpen ? 'nav-shared-overlay-visible' : ''}`}
        onClick={() => setMenuOpen(false)}
      />
    </>
  );
};

export default NavbarPerfil;