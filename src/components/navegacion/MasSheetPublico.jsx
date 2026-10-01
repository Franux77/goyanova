import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import './MasSheetPublico.css';

/**
 * Hoja inferior que abre el botón "Más" del BottomNav en las páginas públicas
 * (Home, Perfil Detalle, Category Page). Reemplaza al menú hamburguesa que
 * existía antes en mobile.
 */
const MasSheetPublico = ({ abierto, onClose, rutaPanel }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const yaEstaEnInicio = location.pathname === '/';

  if (!abierto) return null;

  const handleSalir = () => {
    onClose();
    logout();
    navigate('/');
  };

  const opciones = [
    { to: '/nosotros', label: 'Nosotros', icon: 'group' },
    { to: '/contacto', label: 'Contacto', icon: 'phone_in_talk' },
    { to: '/ayuda', label: 'Ayuda', icon: 'help' },
    ...(user ? [{ to: rutaPanel, label: 'Mi Cuenta', icon: 'dashboard' }] : []),
  ];

  return (
    <>
      <div className="massheet-overlay" onClick={onClose} />
      <div className="massheet-contenido">
        <div className="massheet-header">
          <h3>Más opciones</h3>
          <button className="massheet-cerrar" onClick={onClose} aria-label="Cerrar">
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="massheet-lista">
          {opciones.map((op) => (
            <Link key={op.to} to={op.to} onClick={onClose} className="massheet-item">
              <span className="material-icons massheet-item-icon">{op.icon}</span>
              <span>{op.label}</span>
            </Link>
          ))}
        </div>

        <div className="massheet-footer">
          {!yaEstaEnInicio && (
            <Link to="/" onClick={onClose} className="massheet-footer-item">
              <span className="material-icons">home</span>
              <span>Volver al inicio</span>
            </Link>
          )}

          {user ? (
            <button className="massheet-footer-item massheet-salir" onClick={handleSalir}>
              <span className="material-icons">logout</span>
              <span>Cerrar sesión</span>
            </button>
          ) : (
            <Link to="/login" onClick={onClose} className="massheet-footer-item massheet-ingresar">
              <span className="material-icons">login</span>
              <span>Iniciar sesión</span>
            </Link>
          )}
        </div>
      </div>
    </>
  );
};

export default MasSheetPublico;
