import React from 'react';
import './ServicioCard.css';

const ServicioCard = ({ servicio }) => {
  if (!servicio) return <div className="card-servicio-loading">Cargando servicio...</div>;

  const categoria = servicio.categoria ? servicio.categoria.toLowerCase() : '';

  return (
    <div className="card-servicio test-css-debug">
      <div className="card-servicio-header">
        <h3 className="card-servicio-titulo">{servicio.nombre}</h3>
      </div>

      <div className="card-servicio-categoria">{categoria}</div>

      {servicio.descripcion && (
        <div className="card-servicio-descripcion">{servicio.descripcion}</div>
      )}

      <div className="card-servicio-footer">
        {servicio.ubicacion && (
          <span className="card-servicio-ubicacion">{servicio.ubicacion}</span>
        )}
        {servicio.precio && (
          <span className="card-servicio-precio">{servicio.precio}</span>
        )}
      </div>
    </div>
  );
};

export default ServicioCard;
