import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import BottomNav from '../navegacion/BottomNav';
import MasSheetPublico from '../navegacion/MasSheetPublico';
import './Navbar.css';

const Navbar = () => {
  const { user, perfil, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [masAbierto, setMasAbierto] = useState(false);

  const obtenerRutaPanel = () => {
    if (!perfil) return '/';
    const esAdmin = perfil.estado === 'admin' || perfil.rol === 'admin';
    return esAdmin ? '/panel/admin/dashboard' : '/panel/dashboard';
  };

  const tieneAccesoPanel = perfil && (perfil.estado === 'admin' || perfil.rol === 'admin' || perfil.estado === 'activo');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleBuscar = () => {
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollToCategorias: true } });
      return;
    }
    const categoriasSection = document.getElementById('categorias');
    if (categoriasSection) {
      categoriasSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <img
            src="/assets/GoyaNova_20250918_144009_0000.png"
            alt="GoyaNova"
            className="navbar-logo-img"
          />
          <span className="navbar-logo-text">GoyaNova</span>
        </Link>

        <nav className="nav-menu">
          <ul>
            <li>
              <Link to="/nosotros">Nosotros</Link>
            </li>
            <li>
              <Link to="/contacto">Contacto</Link>
            </li>
            <li>
              <Link to="/ayuda">Ayuda</Link>
            </li>
            {tieneAccesoPanel && (
              <li>
                <button className="btn-link" onClick={() => navigate(obtenerRutaPanel())}>
                  Mi Cuenta
                </button>
              </li>
            )}
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

      {/* Bottom nav mobile — fuera del <header> a propósito: el header tiene
          backdrop-filter, que crea un "containing block" nuevo para los hijos
          position:fixed y los pega arriba en vez de dejarlos fijos a la
          pantalla. Por eso van como hermanos, no adentro. */}
      <BottomNav
        variante="bottom-nav-publico"
        items={[
          { to: '/ayuda', label: 'Ayuda', icon: 'help' },
          { to: '/explorar', label: 'Mapa', icon: 'map' },
          { to: '/publicar', label: 'Publicar', icon: 'add_circle', destacado: true },
          { label: 'Buscar', icon: 'search', onClick: handleBuscar },
        ]}
        onMas={() => setMasAbierto(true)}
        masActivo={masAbierto}
      />
      <MasSheetPublico
        abierto={masAbierto}
        onClose={() => setMasAbierto(false)}
        rutaPanel={obtenerRutaPanel()}
      />
    </>
  );
};

export default Navbar;
