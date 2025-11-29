import React, { useState } from 'react';
import './OpinionesList.css';

const OpinionesList = ({ opiniones }) => {
  const [expandir, setExpandir] = useState({});

  const toggleExpandir = (index) => {
    setExpandir((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <ul className="opiniones-lista-completa">
      {opiniones.map((opinion, index) => {
        const textoLargo = opinion.texto.length > 250;
        const mostrarTexto = expandir[index] ? opinion.texto : opinion.texto.slice(0, 250);
        const mostrarBoton = textoLargo;

        return (
          <li key={index} className="opinion-item">
            <div className="opinion-header">
              <strong>{opinion.nombre}</strong>
              <span className="estrellas">{'⭐'.repeat(opinion.rating)}</span>
              <small className="fecha">{opinion.fecha}</small>
            </div>
            <p className="opinion-texto">
              {mostrarTexto}
              {mostrarBoton && (
                <button className="ver-mas-btn" onClick={() => toggleExpandir(index)}>
                  {expandir[index] ? ' Ver menos' : '...ver más'}
                </button>
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
};

export default OpinionesList;
