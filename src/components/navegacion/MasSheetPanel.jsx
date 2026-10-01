import React from 'react';
import { Link } from 'react-router-dom';
import { formatearBadge } from '../../utils/contadoresPanel';
import './MasSheetPanel.css';

/**
 * Hoja inferior que abre el botón "Más" del BottomNav en Panel Usuario y
 * Panel Admin — mismo patrón que MasSheetPublico (sube desde abajo, no tapa
 * nada, "Volver al inicio" y "Salir" fijos al pie), pero con el listado de
 * secciones de cada panel en vez del menú público.
 *
 * items: [{ to, label, icon, badge? } | { onClick, label, icon, badge? }]
 *   `badge` (número, opcional): numerito al final de la fila.
 * cambiarModo (opcional): { nombre, icon, onClick } — ej. "Cambiar a Panel Admin"
 */
const MasSheetPanel = ({
  abierto,
  onClose,
  titulo,
  subtitulo,
  cambiarModo,
  items = [],
  onSalir,
}) => {
  if (!abierto) return null;

  const handleSalir = () => {
    onClose();
    onSalir();
  };

  return (
    <>
      <div className="massheet-overlay" onClick={onClose} />
      <div className="massheet-contenido massheet-panel">
        <div className="massheet-header">
          <div className="massheet-panel-brand">
            <span className="material-icons massheet-panel-brand-icon">storefront</span>
            <div>
              <h3>{titulo}</h3>
              {subtitulo && <span className="massheet-panel-subtitulo">{subtitulo}</span>}
            </div>
          </div>
          <button className="massheet-cerrar" onClick={onClose} aria-label="Cerrar">
            <span className="material-icons">close</span>
          </button>
        </div>

        {cambiarModo && (
          <button type="button" className="massheet-panel-cambiar-modo" onClick={cambiarModo.onClick}>
            <span className="material-icons">{cambiarModo.icon}</span>
            <span>{cambiarModo.nombre}</span>
          </button>
        )}

        <div className="massheet-lista massheet-panel-lista">
          {items.map((item) =>
            item.to ? (
              <Link key={item.to} to={item.to} onClick={onClose} className="massheet-item">
                <span className="material-icons massheet-item-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge > 0 && <span className="massheet-panel-badge">{formatearBadge(item.badge)}</span>}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                className="massheet-item massheet-item-boton"
                onClick={() => {
                  onClose();
                  item.onClick();
                }}
              >
                <span className="material-icons massheet-item-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          )}
        </div>

        <div className="massheet-footer">
          <Link to="/" onClick={onClose} className="massheet-footer-item massheet-footer-home">
            <span className="material-icons">home</span>
            <span>Volver al inicio</span>
          </Link>

          <button className="massheet-footer-item massheet-salir" onClick={handleSalir}>
            <span className="material-icons">logout</span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default MasSheetPanel;
