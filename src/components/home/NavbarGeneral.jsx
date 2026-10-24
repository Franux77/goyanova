import React, { useState, useEffect, useCallback } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import MenuMapa from '../mapa/ui/MenuMapa';
import './NavbarGeneral.css';

// Barra de arriba de las páginas informativas (Ayuda, Contacto, Nosotros).
// En el celular el menú ☰ abre la misma hoja que usa el mapa.

const TITULOS = {
  '/ayuda': 'Centro de ayuda',
  '/contacto': 'Contacto',
  '/nosotros': 'Nosotros',
};

const ENLACES = [
  { to: '/', label: 'Inicio', icon: 'home' },
  { to: '/explorar', label: 'Mapa', icon: 'map' },
  { to: '/nosotros', label: 'Nosotros', icon: 'group' },
  { to: '/contacto', label: 'Contacto', icon: 'phone_in_talk' },
  { to: '/ayuda', label: 'Ayuda', icon: 'help' },
];

const NavbarGeneral = () => {
  const { user, perfil } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [conSombra, setConSombra] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const alScrollear = () => setConSombra(window.scrollY > 8);
    alScrollear();
    window.addEventListener('scroll', alScrollear, { passive: true });
    return () => window.removeEventListener('scroll', alScrollear);
  }, []);

  // Al cambiar de página se cierra el menú
  useEffect(() => setMenuAbierto(false), [location.pathname]);

  useEffect(() => {
    if (!menuAbierto) return undefined;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
    };
  }, [menuAbierto]);

  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);

  const volver = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const esAdmin = perfil && (perfil.estado === 'admin' || perfil.rol === 'admin');
  const rutaPanel = esAdmin ? '/panel/admin/dashboard' : '/panel/dashboard';
  const titulo = TITULOS[location.pathname] || 'GoyaNova';

  return (
    <>
      <header className={`ng-barra ${conSombra ? 'con-sombra' : ''}`}>
        <div className="ng-interior">
          <div className="ng-izquierda">
            <button type="button" className="ng-volver" onClick={volver} aria-label="Volver">
              <span className="material-icons">arrow_back</span>
            </button>
            <Link to="/" className="ng-marca" aria-label="GoyaNova, ir al inicio">
              <img src="/assets/GoyaNova_20250918_144009_0000.png" alt="" />
              <span className="ng-marca-textos">
                <span className="ng-marca-nombre">GoyaNova</span>
                <strong className="ng-marca-titulo">{titulo}</strong>
              </span>
            </Link>
          </div>

          <nav className="ng-enlaces" aria-label="Secciones">
            {ENLACES.map((e) => (
              <NavLink
                key={e.to}
                to={e.to}
                end={e.to === '/'}
                className={({ isActive }) => `ng-enlace ${isActive ? 'activo' : ''}`}
              >
                <span className="material-icons">{e.icon}</span>
                {e.label}
              </NavLink>
            ))}
          </nav>

          <div className="ng-derecha">
            {user ? (
              <Link to={rutaPanel} className="ng-cuenta">
                <span className="material-icons">account_circle</span>
                Mi cuenta
              </Link>
            ) : (
              <Link to="/login" className="ng-cuenta">
                Iniciar sesión
              </Link>
            )}
            <Link to="/publicar" className="ng-publicar">
              <span className="material-icons">add</span>
              Publicar gratis
            </Link>
            <button
              type="button"
              className="ng-menu"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú"
              aria-expanded={menuAbierto}
            >
              <span className="material-icons">menu</span>
            </button>
          </div>
        </div>
      </header>

      <MenuMapa abierto={menuAbierto} onCerrar={cerrarMenu} rutaPanel={rutaPanel} esPC={false} />
    </>
  );
};

export default NavbarGeneral;
