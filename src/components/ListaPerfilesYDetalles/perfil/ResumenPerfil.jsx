import React, { useState } from 'react';
import { FaStar, FaWhatsapp } from 'react-icons/fa';
import MenuOpciones from './MenuOpciones';
import ModalReporte from './ModalReporte';
import './ResumenPerfil.css';

const coloresSuaves = [
  '#e3f2fd', '#e8f5e9', '#f3e5f5', '#fff9c4', '#ffe0b2', '#e1bee7', '#b2dfdb'
];

const getColorAleatorio = () =>
  coloresSuaves[Math.floor(Math.random() * coloresSuaves.length)];

const getIniciales = (texto) => {
  if (!texto) return '?';
  const palabras = texto.split(' ');
  if (palabras.length === 1) return palabras[0][0].toUpperCase();
  return (palabras[0][0] + palabras[1][0]).toUpperCase();
};

const ResumenPerfil = ({ perfil }) => {
  const [modalReporteAbierto, setModalReporteAbierto] = useState(false);
  const [descripcionExpandida, setDescripcionExpandida] = useState(false);

  if (!perfil) return null;

  const rating = perfil.opiniones?.length
    ? Math.round(perfil.opiniones.reduce((sum, o) => sum + (o.rating || 0), 0) / perfil.opiniones.length)
    : 0;

  const estrellas = Array.from({ length: rating }, (_, i) => (
    <FaStar key={i} color="#ffc107" size={16} />
  ));

  const foto = perfil.foto_portada || perfil.usuario?.foto_url || '';
  const descripcion = perfil.descripcion || 'Sin descripción';
  const mostrarVerMas = descripcion.length > 120;

  const whatsappNumero = perfil.contacto_whatsapp || '549000000000';
  const contactoUrl = `https://wa.me/${whatsappNumero}`;

  const handleCompartir = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: perfil.nombre,
          text: `Mira este servicio: ${perfil.nombre}`,
          url: url
        });
      } catch (err) {
        console.log('Error al compartir:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copiado al portapapeles');
    }
  };

  return (
    <>
      <div className="resumen-lista">
        <MenuOpciones
          onReportar={() => setModalReporteAbierto(true)}
          onCompartir={handleCompartir}
          tipo="servicio"
        />

        {/* Badge Premium - Esquina inferior derecha */}
        {perfil.es_premium && perfil.badge_texto && (
          <div className="resumen-badge-premium-perfil">
            <span className="material-icons resumen-badge-star-icon">star</span>
            <span className="resumen-badge-label">{perfil.badge_texto}</span>
          </div>
        )}

        {/* Foto o placeholder */}
        {foto ? (
          <img src={foto} alt={perfil.nombre} className="resumen-foto-perfil" />
        ) : (
          <div
            className="resumen-placeholder-perfil"
            style={{ backgroundColor: getColorAleatorio() }}
          >
            {getIniciales(perfil.nombre)}
          </div>
        )}

        {/* Contenido */}
        <div className="resumen-contenido-perfil">
          <h2 className="resumen-titulo-perfil">{perfil.nombre}</h2>

          {/* Descripción con Ver más */}
          <div>
            <p className={`resumen-descripcion-perfil ${descripcionExpandida ? 'expanded' : ''}`}>
              {descripcion}
            </p>
            {!descripcionExpandida && mostrarVerMas && (
              <div className="resumen-gradient-descripcion"></div>
            )}
            {mostrarVerMas && (
              <button 
                className="resumen-ver-mas-btn" 
                onClick={() => setDescripcionExpandida(!descripcionExpandida)}
              >
                {descripcionExpandida ? 'Ver menos' : 'Ver más'}
              </button>
            )}
          </div>

          {/* Estrellas */}
          <div className="resumen-estrellas-perfil">{estrellas}</div>

          {/* Botón WhatsApp */}
          {perfil.mostrar_boton_whatsapp && (
            <a 
              href={contactoUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="resumen-btn-contacto"
            >
              <FaWhatsapp /> Contactar
            </a>
          )}
        </div>
      </div>

      <ModalReporte
        isOpen={modalReporteAbierto}
        onClose={() => setModalReporteAbierto(false)}
        tipoContenido="servicio"
        contenidoId={perfil.id}
        servicioId={perfil.id}
        nombreServicio={perfil.nombre}
      />
    </>
  );
};

export default ResumenPerfil;