import React from 'react';
import { useNavigate } from 'react-router-dom';
import './SobrePerfil.css';

const SobrePerfil = ({ perfil, onVerEnMapa }) => {
  const navigate = useNavigate();
  if (!perfil) return null;

  const tipoTexto = perfil.tipo?.nombre || perfil.tipo || 'No especificado';
  const categoriaTexto = perfil.categoria?.nombre || perfil.categoria || 'No especificada';
  const direccionEscrita = perfil.direccion_escrita || perfil.direccion || 'No especificada';
  const referencia = perfil.referencia || 'No tiene referencia';
  const latitud = perfil.latitud ?? perfil.ubicacion?.lat ?? -29.1218;
  const longitud = perfil.longitud ?? perfil.ubicacion?.lng ?? -59.2479;

  const handleVerGoogle = () => {
    const url = `https://www.google.com/maps?q=${latitud},${longitud}`;
    window.open(url, '_blank');
  };

  const handleVerMapaWeb = () => {
    if (typeof onVerEnMapa === 'function') {
      onVerEnMapa(perfil);
    } else {
      navigate('/explorar', {
        state: {
          perfilId: perfil.id,
          latitud,
          longitud,
        },
      });
    }
  };

  return (
    <section className="sobre-seccion-detalle">
      <h3 className="sobre-titulo-principal">
        <span className="material-icons sobre-icono-titulo">info</span>
        Detalle del servicio
      </h3>

      <div className="sobre-bloque-info">
        <p><strong>Tipo:</strong> {tipoTexto}</p>
        <p><strong>Categoría:</strong> {categoriaTexto}</p>
      </div>

      <div className="sobre-bloque-info">
        <p><strong>Dirección:</strong> {direccionEscrita}</p>
        <p><strong>Referencia:</strong> {referencia}</p>
      </div>

      <div className="sobre-mapa-container">
        <iframe
          title="Mapa ubicación"
          width="100%"
          height="220"
          style={{ border: 0, borderRadius: '10px' }}
          loading="lazy"
          allowFullScreen
          src={`https://maps.google.com/maps?q=${latitud},${longitud}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
        ></iframe>
      </div>

      <p className="sobre-texto-ubicacion">
        <span className="material-icons sobre-icono-ubicacion">place</span>
        ¿Dónde querés ver la ubicación?
      </p>
      
      <div className="sobre-botones-wrapper">
        <button className="sobre-btn-google" onClick={handleVerGoogle}>
          <span className="material-icons sobre-icono-boton">map</span>
          Google Maps
        </button>
        <button className="sobre-btn-web" onClick={handleVerMapaWeb}>
          <span className="material-icons sobre-icono-boton">public</span>
          Ver en GoyaNova
        </button>
      </div>
    </section>
  );
};

export default SobrePerfil;