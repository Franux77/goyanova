import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/useAuth';
import { useInstalarApp } from '../../../utils/instalarApp';
import './MenuMapa.css';

/**
 * Menú del mapa (botón ☰). Mismo estilo que la hoja "Más" del resto de la web:
 * en el celular sube desde abajo, en la PC se abre como una tarjeta debajo del botón.
 */
const MenuMapa = ({ abierto, onCerrar, rutaPanel, esPC }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { yaInstalada } = useInstalarApp();

  useEffect(() => {
    if (!abierto) return undefined;
    const alTeclear = (e) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  const salir = () => {
    onCerrar();
    logout();
    navigate('/');
  };

  const principales = [
    { to: '/', label: 'Inicio', icon: 'home' },
    { to: '/publicar', label: 'Publicar gratis', icon: 'add_business', verde: true },
  ];

  const opciones = [
    { to: '/nosotros', label: 'Nosotros', icon: 'group' },
    { to: '/contacto', label: 'Contacto', icon: 'phone_in_talk' },
    { to: '/ayuda', label: 'Ayuda', icon: 'help' },
    ...(yaInstalada ? [] : [{ to: '/instalar', label: 'Instalar la app', icon: 'install_mobile' }]),
  ];

  return (
    <>
      <div className={`mm-fondo ${esPC ? 'mm-fondo-pc' : ''}`} onClick={onCerrar} />
      <div className={`mm-menu ${esPC ? 'mm-pc' : 'mm-cel'}`} role="dialog" aria-label="Menú">
        {!esPC && <span className="mm-manija" aria-hidden="true" />}

        <div className="mm-cabecera">
          <img src="/assets/GoyaNova_20250918_144009_0000.png" alt="" />
          <div>
            <strong>GoyaNova</strong>
            <span>{user ? 'Tu sesión está abierta' : 'Oficios y negocios de Goya'}</span>
          </div>
          <button type="button" className="mm-cerrar" onClick={onCerrar} aria-label="Cerrar menú">
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="mm-principales">
          {principales.map((op) => (
            <Link
              key={op.to}
              to={op.to}
              onClick={onCerrar}
              className={`mm-mosaico ${op.verde ? 'mm-verde' : ''}`}
            >
              <span className="material-icons">{op.icon}</span>
              <span>{op.label}</span>
            </Link>
          ))}
        </div>

        <nav className="mm-lista">
          {opciones.map((op) => (
            <Link key={op.to} to={op.to} onClick={onCerrar} className="mm-item">
              <span className="material-icons mm-item-icono">{op.icon}</span>
              <span>{op.label}</span>
              <span className="material-icons mm-flecha">chevron_right</span>
            </Link>
          ))}
        </nav>

        <div className="mm-pie">
          {user ? (
            <>
              <Link to={rutaPanel} onClick={onCerrar} className="mm-pie-item">
                <span className="material-icons">dashboard</span>
                <span>Mi cuenta</span>
              </Link>
              <button type="button" className="mm-pie-item mm-salir" onClick={salir}>
                <span className="material-icons">logout</span>
                <span>Cerrar sesión</span>
              </button>
            </>
          ) : (
            <Link to="/login" onClick={onCerrar} className="mm-pie-item">
              <span className="material-icons">login</span>
              <span>Iniciar sesión</span>
            </Link>
          )}
        </div>
      </div>
    </>
  );
};

export default MenuMapa;
