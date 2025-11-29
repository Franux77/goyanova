// src/components/mapa/DetallesServicio.jsx
import React, { useState, useEffect } from 'react';
import './DetallesServicio.css';
import { X, Star, Mail, Instagram, Facebook } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const coloresSuaves = [
  '#A5D6A7', '#81D4FA', '#CE93D8', '#FFF59D', '#FFAB91', '#B39DDB', '#80CBC4'
];

const getColorPorId = (id) => {
  if (!id) return coloresSuaves[0];
  const index = Math.abs(id.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % coloresSuaves.length;
  return coloresSuaves[index];
};

const getIniciales = (texto) => {
  if (!texto) return '?';
  const palabras = texto.trim().split(' ').filter(Boolean);
  if (palabras.length === 1) return palabras[0][0].toUpperCase();
  return (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase();
};

const DetallesServicio = ({ perfil, visible, onClose, categoriasMap }) => {
  const navigate = useNavigate();
  const [mostrarMas, setMostrarMas] = useState(false);
  const [animarEntrada, setAnimarEntrada] = useState(false);

  // Resetear estado cuando cambia la visibilidad
  useEffect(() => {
    if (visible) {
      setMostrarMas(false);
      // Activar animación inmediatamente
      setTimeout(() => setAnimarEntrada(true), 10);
    } else {
      setAnimarEntrada(false);
    }
  }, [visible, perfil?.id]);

  if (!perfil || !visible) return null;

  const {
    nombre = '',
    descripcion = '',
    direccion_escrita = '',
    categoria_id,
    contacto_whatsapp,
    contacto_email,
    contacto_instagram,
    contacto_facebook,
    foto_portada,
    ratingPromedio = 0
  } = perfil;

  const categoriaNombre = categoriasMap?.[categoria_id]?.nombre || 'Sin categoría';
  
  const foto =
    foto_portada && foto_portada.trim() !== '' && foto_portada.toLowerCase() !== 'empty'
      ? foto_portada
      : null;

  const totalStars = 5;
  const estrellasArray = Array.from({ length: totalStars }, (_, i) => i < Math.round(ratingPromedio));

  const handleVerPerfil = () => {
    navigate(`/perfil/${perfil.id}`);
  };

  const handleClose = () => {
    setAnimarEntrada(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  return (
    <div 
      className={`detalles-overlay ${animarEntrada ? 'detalles-overlay-visible' : ''}`}
      onClick={handleClose}
    >
      <div 
  className={`detalles-modal ${animarEntrada ? 'detalles-modal-visible' : ''}`}
  onClick={(e) => e.stopPropagation()}
>
  <button className="cerrar-btn" onClick={handleClose} aria-label="Cerrar">
    <X size={24} />
  </button>

  {/* 🆕 Badge Premium - Esquina superior izquierda */}
  {perfil.es_premium && perfil.badge_texto && (
    <div className="badge-detalles-premium">
      <span className="material-icons badge-detalles-star">star</span>
      <span className="badge-detalles-label">{perfil.badge_texto}</span>
    </div>
  )}

  {foto ? (
    <img src={foto} alt={`Foto de ${nombre}`} className="detalles-img" />
  ) : (
    <div
      className="sin-imagen-iniciales"
      style={{ backgroundColor: getColorPorId(perfil.id) }}
    >
      {getIniciales(nombre)}
    </div>
  )}

  <div className="detalles-contenido">
    <h2 className="detalles-nombre">{nombre}</h2>

          <div className="detalles-meta">
            <span className="categoria">{categoriaNombre}</span>
            
            <button className="btn-ver-perfil" onClick={handleVerPerfil}>
              Ver perfil completo
            </button>

            <div className="rating">
              {estrellasArray.map((isFilled, index) => (
                <Star
                  key={index}
                  className="estrella"
                  fill={isFilled ? '#fbc02d' : 'none'}
                  stroke={isFilled ? '#fbc02d' : '#ccc'}
                  strokeWidth={1.5}
                />
              ))}
              {ratingPromedio > 0 && (
                <span className="rating-numero">({ratingPromedio.toFixed(1)})</span>
              )}
            </div>
          </div>

          {direccion_escrita && (
            <div className="direccion-container">
              <span className="material-icons direccion-icon">place</span>
              <p className="direccion">{direccion_escrita}</p>
            </div>
          )}

          {descripcion && (
            <div className="descripcion-wrapper">
              <p className={`descripcion-texto ${mostrarMas ? 'expandida' : ''}`}>
                {descripcion}
              </p>
              {descripcion.length > 100 && (
                <button
                  className="btn-ver-mas"
                  onClick={() => setMostrarMas(!mostrarMas)}
                >
                  {mostrarMas ? 'Ver menos' : 'Ver más'}
                </button>
              )}
            </div>
          )}

          {(contacto_whatsapp || contacto_email || contacto_instagram || contacto_facebook) && (
            <div className="contactos-botones">
              {contacto_whatsapp && (
                <a
                  href={`https://wa.me/${contacto_whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-contacto whatsapp"
                  title="WhatsApp"
                >
                  <FaWhatsapp size={20} />
                </a>
              )}

              {contacto_email && (
                <a 
                  href={`mailto:${contacto_email}`} 
                  className="btn-contacto email"
                  title="Email"
                >
                  <Mail size={20} />
                </a>
              )}

              {contacto_instagram && (
                <a
                  href={`https://instagram.com/${contacto_instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-contacto instagram"
                  title="Instagram"
                >
                  <Instagram size={20} />
                </a>
              )}

              {contacto_facebook && (
                <a
                  href={`https://facebook.com/${contacto_facebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-contacto facebook"
                  title="Facebook"
                >
                  <Facebook size={20} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetallesServicio;