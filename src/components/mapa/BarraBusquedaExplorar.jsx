// src/components/mapa/BarraBusquedaExplorar.jsx
import React from 'react';
import './BarraBusquedaExplorar.css';

const BarraBusquedaExplorar = ({ query, setQuery }) => {
  // Textos rotativos para el placeholder (adaptados al contexto del mapa)
  const placeholderTexts = [
    'Busca lo que deseas...',
    'Busca por nombres de servicios',
    'Busca por nombres de productos',
    'Buscar por categoria',
    'Encuentra servicios cerca de ti...',
    'Explora negocios en tu zona...',
  ];

  return (
    <div className="search-explorar-container">
      <div className="search-explorar-box">
        <svg className="search-explorar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        
        {/* Placeholder animado */}
        {query === '' && (
          <div className="animated-placeholder-explorar">
            <div className="placeholder-text-explorar">
              {placeholderTexts.map((text, index) => (
                <span key={index}>
                  {text}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <input
          type="text"
          className="search-explorar-input"
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