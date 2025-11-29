// src/components/mapa/BarraBusquedaExplorar.jsx
import React from 'react';
import './BarraBusquedaExplorar.css';

const BarraBusquedaExplorar = ({ query, setQuery }) => {
  return (
    <div className="search-explorar-container">
      <div className="search-explorar-box">
        <svg className="search-explorar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          className="search-explorar-input"
          placeholder="Buscar por nombre, descripción, categoría..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            className="search-explorar-clear"
            onClick={() => setQuery('')}
            aria-label="Limpiar búsqueda"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default BarraBusquedaExplorar;