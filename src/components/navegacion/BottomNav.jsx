import React from 'react';
import { NavLink } from 'react-router-dom';
import './BottomNav.css';

/**
 * Barra de navegación inferior, solo mobile (el CSS de cada página que la usa
 * decide a qué ancho aparece, vía la clase `variante`).
 *
 * items: [{ to, icon, label, end?, destacado?, siempreActivo? } | { onClick, icon, label, activo?, destacado? }]
 *   - con `to` se renderiza como NavLink (navega a una ruta).
 *   - con `onClick` (sin `to`) se renderiza como botón: una acción en la propia
 *     página (ej: abrir un buscador o hacer scroll a una sección).
 *   - `destacado: true` resalta el ícono con un círculo de color (para la acción
 *     principal, ej: "Publicar").
 *   - `siempreActivo: true` fuerza el estilo "seleccionado" (fondito celeste)
 *     aunque la ruta actual no sea exactamente esa (ej: "Inicio" en Categoría/
 *     Perfil, que visualmente debe verse como el ítem por defecto, tal cual
 *     se ve naturalmente en Panel).
 * onMas: función que abre el panel/hoja de "Más opciones".
 * masActivo: si el panel de Más está abierto (resalta el ícono).
 * variante: clase extra para que cada página controle su propio breakpoint
 *           sin pisar el CSS de las demás (ej: "bottom-nav-publico", "bottom-nav-panel").
 */
const BottomNav = ({ items, onMas, masActivo = false, variante }) => {
  return (
    <nav className={`bottom-nav ${variante || ''}`}>
      {items.map((item) => {
        const contenido = (
          <>
            <span className={`bottom-nav-icon-wrap ${item.destacado ? 'bottom-nav-icon-destacado' : ''}`}>
              <span className="material-icons">{item.icon}</span>
            </span>
            {!item.destacado && <span className="bottom-nav-label">{item.label}</span>}
          </>
        );
        const claseItem = `bottom-nav-item ${item.destacado ? 'bottom-nav-item-destacado' : ''}`;

        if (item.to) {
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              aria-label={item.label}
              className={({ isActive }) =>
                `${claseItem} ${isActive || item.siempreActivo ? 'bottom-nav-item-active' : ''}`
              }
            >
              {contenido}
            </NavLink>
          );
        }

        return (
          <button
            key={item.label}
            type="button"
            aria-label={item.label}
            className={`${claseItem} ${item.activo ? 'bottom-nav-item-active' : ''}`}
            onClick={item.onClick}
          >
            {contenido}
          </button>
        );
      })}

      <button
        type="button"
        className={`bottom-nav-item bottom-nav-item-mas ${masActivo ? 'bottom-nav-item-active' : ''}`}
        onClick={onMas}
        aria-label="Más opciones"
      >
        <span className="bottom-nav-icon-wrap">
          <span className="material-icons">more_horiz</span>
        </span>
        <span className="bottom-nav-label">Más</span>
      </button>
    </nav>
  );
};

export default BottomNav;
