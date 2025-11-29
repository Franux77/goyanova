import React, { useState, useEffect, useRef } from 'react';
import './GaleriaTrabajos.css';

const GaleriaTrabajos = ({ imagenes = [] }) => {
  const [verMas, setVerMas] = useState(false);
  const [imagenActiva, setImagenActiva] = useState(null);
  const [scrollPercent, setScrollPercent] = useState(0);
  const carruselRef = useRef(null);

  const imagenesMostradas = verMas ? imagenes : imagenes.slice(0, 10);

  const abrirModal = (imgUrl) => {
    setImagenActiva(imgUrl);
    document.body.style.overflow = 'hidden';
  };

  const cerrarModal = () => {
    setImagenActiva(null);
    document.body.style.overflow = 'auto';
  };

  useEffect(() => {
    if (!imagenActiva) return;
    const manejarEscape = (e) => e.key === 'Escape' && cerrarModal();
    window.addEventListener('keydown', manejarEscape);
    return () => window.removeEventListener('keydown', manejarEscape);
  }, [imagenActiva]);

  const manejarScroll = () => {
    const el = carruselRef.current;
    if (el) {
      const porcentaje = (el.scrollLeft / (el.scrollWidth - el.clientWidth)) * 100;
      setScrollPercent(porcentaje);
    }
  };

  if (!imagenes.length) return null;

  return (
    <div className="galeria-contenedor-principal">
      <h3 className="galeria-titulo-principal">
        <span className="material-icons galeria-icono-titulo">photo_library</span>
        Trabajos Realizados
      </h3>

      <div className="galeria-carrusel-scroll" ref={carruselRef} onScroll={manejarScroll}>
        {imagenesMostradas.map((img, index) => (
          <div
            className="galeria-item-card"
            key={index}
            onClick={() => abrirModal(img)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && abrirModal(img)}
          >
            <img src={img} alt={`Trabajo ${index + 1}`} loading="lazy" />
          </div>
        ))}
      </div>

      {imagenesMostradas.length > 2 && (
        <div className="galeria-scroll-barra">
          <div className="galeria-scroll-indicador" style={{ width: `${scrollPercent}%` }} />
        </div>
      )}

      {imagenes.length > 10 && (
        <button className="galeria-btn-ver-mas" onClick={() => setVerMas(!verMas)}>
          <span className="material-icons galeria-icono-ver-mas">
            {verMas ? 'expand_less' : 'expand_more'}
          </span>
          {verMas ? 'Ver menos' : 'Ver más'}
        </button>
      )}

      {imagenActiva && (
        <div className="galeria-modal-overlay" onClick={cerrarModal}>
          <div className="galeria-modal-contenido" onClick={(e) => e.stopPropagation()}>
            <button className="galeria-modal-cerrar" onClick={cerrarModal}>
              <span className="material-icons galeria-icono-cerrar">close</span>
            </button>
            <img src={imagenActiva} alt="Trabajo ampliado" className="galeria-modal-imagen" />
          </div>
        </div>
      )}
    </div>
  );
};

export default GaleriaTrabajos;