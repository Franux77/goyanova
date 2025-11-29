import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import './Navbar.css';

const Navbar = () => {
  const { user, perfil, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Bloquea scroll del body cuando el menú está abierto
  useEffect(() => {
    const preventScroll = (e) => e.preventDefault();

    if (menuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.addEventListener('touchmove', preventScroll, { passive: false });
    } else {
      document.body.style.overflow = 'auto';
      document.body.style.position = '';
      document.body.style.width = '';
      document.removeEventListener('touchmove', preventScroll);
    }

    return () => document.removeEventListener('touchmove', preventScroll);
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/');
  };

  const obtenerRutaPanel = () => {
    if (!perfil) return '/';
    const esAdmin = perfil.estado === 'admin' || perfil.rol === 'admin';
    return esAdmin ? '/panel/admin/dashboard' : '/panel/dashboard';
  };

  const tieneAccesoPanel = perfil && (perfil.estado === 'admin' || perfil.rol === 'admin' || perfil.estado === 'activo');

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={() => setMenuOpen(false)}>
          <img
            src="/assets/GoyaNova_20250918_144009_0000.png"
            alt="GoyaNova"
            className="navbar-logo-img"
          />
          <span className="navbar-logo-text">GoyaNova</span>
        </Link>

        <button
          className={`hamburger ${menuOpen ? 'open' : ''}`}
          aria-label="Menú"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav className={`nav-menu ${menuOpen ? 'active' : ''}`}>
          <ul>
            <li>
              <Link to="/nosotros" onClick={() => setMenuOpen(false)}>Nosotros</Link>
            </li>
            <li>
              <Link to="/contacto" onClick={() => setMenuOpen(false)}>Contacto</Link>
            </li>
            {/* 🆕 LINK DE AYUDA */}
            <li>
              <Link to="/ayuda" onClick={() => setMenuOpen(false)}>Ayuda</Link>
            </li>
            {tieneAccesoPanel && (
              <li>
                <button
                  className="btn-link"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(obtenerRutaPanel());
                  }}
                >
                  Mi Panel
                </button>
              </li>
            )}
            <li className="mobile-auth">
              {!user ? (
                <Link to="/login" className="btn-loginnav" onClick={() => setMenuOpen(false)}>
                  Iniciar sesión
                </Link>
              ) : (
                <button className="btn-logout" onClick={handleLogout}>Cerrar sesión</button>
              )}
            </li>
          </ul>
        </nav>

        <div className="auth-section">
          {!user ? (
            <Link to="/login" className="btn-loginnav">Iniciar sesión</Link>
          ) : (
            <button className="btn-logout" onClick={handleLogout}>Cerrar sesión</button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;