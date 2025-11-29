// src/components/mapa/PanelInferiorResultados.jsx
import React from 'react';
import './Explorar.css';

const PanelInferiorResultados = ({ servicios, categoriasMap }) => {
  return (
    <div className="panel-resultados">
      {servicios.map((item, idx) => {
        const categoriaNombre = categoriasMap[item.categoria_id]?.nombre || 'Cargando categoría...';
        return (
          <div className="card-servicio" key={idx}>
            <h3>{item.nombre}</h3>
            <p><strong>Categoría:</strong> {categoriaNombre}</p>
            <p><strong>Descripción:</strong> {item.descripcion}</p>
          </div>
        );
      })}
    </div>
  );
};

export default PanelInferiorResultados;
