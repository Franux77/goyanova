import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SobrePerfil.css';

const SobrePerfil = ({ perfil, onVerEnMapa }) => {
  const navigate = useNavigate();
  const [mostrarReferencia, setMostrarReferencia] = useState(false);
  const [zoomAbierto, setZoomAbierto] = useState(false);

  if (!perfil) return null;

  const tipoTexto = perfil.tipo?.nombre || perfil.tipo || 'No especificado';
  const categoriaTexto = perfil.categoria?.nombre || perfil.categoria || 'No especificada';
  const direccionEscrita = perfil.direccion_escrita || perfil.direccion || 'No especificada';
  const referencia = perfil.referencia || 'No tiene referencia';
  const latitud = perfil.latitud ?? perfil.ubicacion?.lat ?? -29.1218;
  const longitud = perfil.longitud ?? perfil.ubicacion?.lng ?? -59.2479;

  // 🆕 Foto de referencia de ubicación (Impulso+)
  const fotoReferencia = perfil.foto_referencia_ubicacion;

  // 🆕 Contacto y redes — antes solo se mostraban en el popup del mapa
  const tieneWeb = perfil.sitio_web && perfil.sitio_web.trim() !== '';
  const tieneInstagram = perfil.contacto_instagram && perfil.contacto_instagram.trim() !== '';
  const tieneFacebook = perfil.contacto_facebook && perfil.contacto_facebook.trim() !== '';
  const tieneEmail = perfil.contacto_email && perfil.contacto_email.trim() !== '';
  const tieneContactoExtra = tieneWeb || tieneInstagram || tieneFacebook || tieneEmail;

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

  const urlInstagram = tieneInstagram
    ? `https://instagram.com/${perfil.contacto_instagram.replace('@', '').trim()}`
    : null;
  const urlFacebook = tieneFacebook
    ? `https://facebook.com/${perfil.contacto_facebook.trim()}`
    : null;
  const urlWeb = tieneWeb
    ? (perfil.sitio_web.startsWith('http') ? perfil.sitio_web : `https://${perfil.sitio_web}`)
    : null;

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

      {perfil.reglas_devoluciones && perfil.reglas_devoluciones.trim() !== '' && (
        <div className="sobre-bloque-info sobre-reglas-bloque">
          <p className="sobre-redes-titulo">
            <span className="material-icons" style={{ fontSize: '1.1rem', verticalAlign: 'middle', marginRight: '0.3rem' }}>gavel</span>
            <strong>Reglas y devoluciones</strong>
          </p>
          <p style={{ whiteSpace: 'pre-line' }}>{perfil.reglas_devoluciones}</p>
        </div>
      )}

      {/* 🆕 Contacto y redes sociales */}
      {tieneContactoExtra && (
        <div className="sobre-bloque-info">
          <p className="sobre-redes-titulo"><strong>Más formas de contacto</strong></p>
          <div className="sobre-redes-lista">
            {tieneEmail && (
              <a href={`mailto:${perfil.contacto_email}`} className="sobre-red-item sobre-red-email">
                <span className="material-icons">mail</span>
                <span>{perfil.contacto_email}</span>
              </a>
            )}
            {tieneInstagram && (
              <a href={urlInstagram} target="_blank" rel="noopener noreferrer" className="sobre-red-item sobre-red-instagram">
                <span className="material-icons">photo_camera</span>
                <span>Instagram</span>
              </a>
            )}
            {tieneFacebook && (
              <a href={urlFacebook} target="_blank" rel="noopener noreferrer" className="sobre-red-item sobre-red-facebook">
                <span className="material-icons">thumb_up</span>
                <span>Facebook</span>
              </a>
            )}
            {tieneWeb && (
              <a href={urlWeb} target="_blank" rel="noopener noreferrer" className="sobre-red-item sobre-red-web">
                <span className="material-icons">language</span>
                <span>Sitio web</span>
              </a>
            )}
          </div>
        </div>
      )}

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

      {/* 🆕 Foto de referencia del local — ancho completo, arriba de los botones de mapa */}
      {fotoReferencia && (
        <div className="sobre-referencia-wrapper">
          <button
            className="sobre-btn-referencia"
            onClick={() => setMostrarReferencia(!mostrarReferencia)}
          >
            <span className="material-icons sobre-icono-boton">photo_camera</span>
            {mostrarReferencia ? 'Ocultar foto del local' : 'Ver foto de referencia del local'}
            <span className={`material-icons sobre-flecha-referencia ${mostrarReferencia ? 'abierta' : ''}`}>
              expand_more
            </span>
          </button>

          <div className={`sobre-referencia-panel ${mostrarReferencia ? 'abierto' : ''}`}>
            <img
              src={fotoReferencia}
              alt="Referencia del local"
              className="sobre-referencia-imagen"
              onClick={() => setZoomAbierto(true)}
              loading="lazy"
            />
          </div>
        </div>
      )}

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

      {/* 🆕 Zoom de la foto de referencia */}
      {zoomAbierto && fotoReferencia && (
        <div className="sobre-referencia-zoom-overlay" onClick={() => setZoomAbierto(false)}>
          <button className="sobre-referencia-zoom-cerrar" onClick={() => setZoomAbierto(false)}>
            <span className="material-icons">close</span>
          </button>
          <img src={fotoReferencia} alt="Referencia del local ampliada" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </section>
  );
};

export default SobrePerfil;