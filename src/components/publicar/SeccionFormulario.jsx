import React from 'react';
import './SeccionFormulario.css';

const SeccionFormulario = ({ titulo, id, children }) => {
  return (
    <section id={id} className="publi-seccion">
      <h2 className="publi-seccion-titulo">{titulo}</h2>
      <div className="publi-seccion-contenido">
        {children}
      </div>
    </section>
  );
};

export default SeccionFormulario;
