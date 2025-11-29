// src/components/mapa/FiltrosExplorar.jsx
import React, { useEffect } from 'react';
import './FiltrosExplorar.css';

const FiltrosExplorar = ({
  tipo,
  setTipo,
  categoria,
  setCategoria,
  calificacion,
  setCalificacion,
  categoriasDisponibles,
}) => {
  
  useEffect(() => {
    if (!tipo) {
      setCategoria('');
    }
  }, [tipo, setCategoria]);

  const handleTipoChange = (e) => {
    const nuevoTipo = e.target.value;
    setTipo(nuevoTipo);
    if (!nuevoTipo) {
      setCategoria('');
    }
  };

  return (
    <div className="filtros-explorar-container">
      <div className="filtro-explorar-wrapper">
        <svg className="filtro-explorar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
        <select
          className="filtro-explorar-select"
          value={tipo}
          onChange={handleTipoChange}
        >
          <option value="">Tipo</option>
          <option value="servicio">🛠️ Servicios</option>
          <option value="producto">📦 Productos</option>
        </select>
      </div>

      <div className="filtro-explorar-wrapper">
        <svg className="filtro-explorar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <select
          className="filtro-explorar-select"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          disabled={!tipo}
        >
          <option value="">Categoría</option>
          {categoriasDisponibles.map((cat) => (
            <option key={cat.id} value={cat.nombre}>
              {cat.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="filtro-explorar-wrapper">
        <svg className="filtro-explorar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        <select
          className="filtro-explorar-select"
          value={calificacion}
          onChange={(e) => setCalificacion(e.target.value)}
        >
          <option value="">Calificación</option>
          <option value="mayor">⬆️ Mayor a menor</option>
          <option value="menor">⬇️ Menor a mayor</option>
        </select>
      </div>
    </div>
  );
};

export default FiltrosExplorar;