import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './VisorHistorias.css';

// Visor tipo Instagram. Recibe una lista de reels y el índice de arranque.
// Cada reel: { reel_id, servicio_id, servicio_nombre, video_url }
const VisorHistorias = ({ reels, indiceInicial = 0, onClose }) => {
  const [indice, setIndice] = useState(indiceInicial);
  const [progreso, setProgreso] = useState(0);
  const videoRef = useRef(null);
  const navigate = useNavigate();

  const reelActual = reels[indice];

  useEffect(() => {
    setProgreso(0);
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }
  }, [indice]);

  const siguiente = () => {
    if (indice < reels.length - 1) {
      setIndice(indice + 1);
    } else {
      onClose();
    }
  };

  const anterior = () => {
    if (indice > 0) setIndice(indice - 1);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.duration) {
      setProgreso((video.currentTime / video.duration) * 100);
    }
  };

  const irAlPerfil = () => {
    onClose();
    navigate(`/perfil/${reelActual.servicio_id}`);
  };

  if (!reelActual) return null;

  return (
    <div className="visorhist-overlay" onClick={onClose}>
      <div className="visorhist-contenido" onClick={(e) => e.stopPropagation()}>

        <div className="visorhist-barras">
          {reels.map((_, i) => (
            <div key={i} className="visorhist-barra-track">
              <div
                className="visorhist-barra-fill"
                style={{
                  width: i < indice ? '100%' : i === indice ? `${progreso}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        <div className="visorhist-header">
          <span className="visorhist-nombre">{reelActual.servicio_nombre}</span>
          <button className="visorhist-cerrar" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <video
          ref={videoRef}
          key={reelActual.reel_id}
          src={reelActual.video_url}
          className="visorhist-video"
          playsInline
          autoPlay
          onTimeUpdate={handleTimeUpdate}
          onEnded={siguiente}
        />

        <div className="visorhist-zona-izq" onClick={anterior} />
        <div className="visorhist-zona-der" onClick={siguiente} />

        <button className="visorhist-btn-perfil" onClick={irAlPerfil}>
          Ver perfil completo
          <span className="material-icons">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};

export default VisorHistorias;