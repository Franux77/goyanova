import React, { useState, useEffect, useRef } from 'react';
import './GaleriaTrabajos.css';

const GaleriaTrabajos = ({ imagenes = [] }) => {
  const [imagenActiva, setImagenActiva] = useState(null);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [indiceActual, setIndiceActual] = useState(0);
  const carruselRef = useRef(null);

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
      
      // Calcular el índice actual basado en el scroll
      const anchoCard = 150 + 13; // ancho + gap (0.8rem ≈ 13px)
      const indice = Math.round(el.scrollLeft / anchoCard);
      setIndiceActual(indice);
    }
  };

  const scrollHaciaImagen = (indice) => {
    const el = carruselRef.current;
    if (el) {
      const anchoCard = 150 + 13;
      el.scrollTo({
        left: indice * anchoCard,
        behavior: 'smooth'
      });
    }
  };

  const irSiguiente = () => {
    if (indiceActual < imagenes.length - 1) {
      scrollHaciaImagen(indiceActual + 1);
    }
  };

  const irAnterior = () => {
    if (indiceActual > 0) {
      scrollHaciaImagen(indiceActual - 1);
    }
  };

  if (!imagenes.length) return null;

  return (
    <div className="galeria-contenedor-principal">
      <h3 className="galeria-titulo-principal">
        <span className="material-icons galeria-icono-titulo">photo_library</span>
        Trabajos Realizados
      </h3>

      <div className="galeria-carrusel-wrapper">
        {imagenes.length > 1 && indiceActual > 0 && (
          <button className="galeria-flecha galeria-flecha-izq" onClick={irAnterior}>
            <span className="material-icons">chevron_left</span>
          </button>
        )}

        <div className="galeria-carrusel-scroll" ref={carruselRef} onScroll={manejarScroll}>
          {imagenes.map((img, index) => (
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

        {imagenes.length > 1 && indiceActual < imagenes.length - 1 && (
          <button className="galeria-flecha galeria-flecha-der" onClick={irSiguiente}>
            <span className="material-icons">chevron_right</span>
          </button>
        )}
      </div>

      {imagenes.length > 2 && (
        <div className="galeria-scroll-barra">
          <div className="galeria-scroll-indicador" style={{ width: `${scrollPercent}%` }} />
        </div>
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