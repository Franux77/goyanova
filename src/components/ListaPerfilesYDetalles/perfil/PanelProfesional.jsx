import React from 'react';
import './PanelProfesional.css';

const PanelProfesional = ({ perfilId }) => {
  const trabajosRealizados = 512;
  const valoracionPromedio = 4.7;
  const visitasPerfil = 1234;

  return (
    <section className="panel-profesional">
      <h3>Panel Profesional - Perfil ID: {perfilId}</h3>
      
      <div className="estadisticas">
        <div className="estadistica-item">
          <strong className="estadistica-numero trabajos">{trabajosRealizados}</strong>
          <p>Trabajos realizados</p>
        </div>

        <div className="estadistica-item">
          <strong className="estadistica-numero valoracion">{valoracionPromedio.toFixed(1)}</strong>
          <p>Valoración promedio</p>
        </div>

        <div className="estadistica-item">
          <strong className="estadistica-numero visitas">{visitasPerfil}</strong>
          <p>Visitas al perfil</p>
        </div>
      </div>

      <div className="resumen-profesional">
        <p><strong>Resumen profesional:</strong></p>
        <p>
          Este panel puede incluir detalles adicionales sobre la experiencia, certificaciones, proyectos destacados y cualquier otra información que ayude a potenciar la confianza y decisión de los clientes.
        </p>
      </div>
    </section>
  );
};

export default PanelProfesional;
