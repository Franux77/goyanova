// src/components/mapa/CardPerfilExplorar.jsx
import React from 'react';
import './CardPerfilExplorar.css';
import { Star, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';

const coloresPastel = [
  '#FFE5E5', '#E5F5FF', '#FFE5F5', '#FFFBE5', '#E5FFE5', '#F5E5FF', '#E5F5F5'
];

const getColorPorId = (id) => {
  if (!id) return coloresPastel[0];
  const index = Math.abs(id.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % coloresPastel.length;
  return coloresPastel[index];
};

const getIniciales = (nombre) => {
  if (!nombre) return '?';
  const palabras = nombre.trim().split(' ').filter(Boolean);
  if (palabras.length === 1) return palabras[0][0].toUpperCase();
  return (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase();
};

const CardPerfilExplorar = ({ perfil = {}, categoriasMap = {}, onLocalizar }) => {
  const navigate = useNavigate();
  const { 
    id, 
    nombre = 'Sin nombre', 
    categoria_id, 
    descripcion = '', 
    contacto_whatsapp,
    foto_portada,
    es_premium,
    badge_texto,
    opiniones = []
  } = perfil;

  const nombreCategoria = categoriasMap[categoria_id]?.nombre || '';
  
  const foto = foto_portada && 
    foto_portada.trim() !== '' && 
    foto_portada.toLowerCase() !== 'empty' 
      ? foto_portada 
      : null;

  const rating = opiniones?.length > 0
    ? opiniones.reduce((sum, o) => sum + o.puntuacion, 0) / opiniones.length
    : 0;

  const handleVerPerfil = () => navigate(`/perfil/${id}`);

  const descripcionCorta = descripcion && descripcion.length > 120 
    ? descripcion.substring(0, 120) + '...' 
    : descripcion;

  return (
    <div className="card-perfil-explorar">
      {/* 🆕 Badge Premium - Esquina superior derecha */}
      {es_premium && badge_texto && (
        <div className="badge-explorar-premium">
          <span className="material-icons badge-explorar-star">star</span>
          <span className="badge-explorar-label">{badge_texto}</span>
        </div>
      )}

      {/* Imagen o iniciales */}
      <div className="card-perfil-imagen-container">
        {foto ? (
          <img 
            src={foto} 
            alt={nombre} 
            className="card-perfil-imagen" 
            loading="lazy" 
          />
        ) : (
          <div
            className="card-perfil-iniciales"
            style={{ backgroundColor: getColorPorId(id) }}
          >
            <span>{getIniciales(nombre)}</span>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="card-perfil-contenido">
        <div className="card-perfil-header">
          <h3 className="card-perfil-titulo">{nombre}</h3>
          {nombreCategoria && (
            <span className="card-perfil-categoria-badge">
              {nombreCategoria}
            </span>
          )}
        </div>

        {rating > 0 && (
          <div className="card-perfil-rating">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                size={14}
                className="estrella-icon"
                fill={i < Math.round(rating) ? '#FFC107' : 'none'}
                stroke={i < Math.round(rating) ? '#FFC107' : '#E0E0E0'}
                strokeWidth={1.5}
              />
            ))}
            <span className="rating-numero">({rating.toFixed(1)})</span>
          </div>
        )}

        {descripcion && (
          <p className="card-perfil-descripcion">{descripcionCorta}</p>
        )}

        <div className="card-perfil-acciones">
          {contacto_whatsapp && (
            <a
              href={`https://wa.me/${contacto_whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-accion btn-whatsapp"
              title="WhatsApp"
              onClick={(e) => e.stopPropagation()}
            >
              <FaWhatsapp size={18} />
            </a>
          )}

          <button
            className="btn-accion btn-localizar"
            onClick={(e) => {
              e.stopPropagation();
              if (typeof onLocalizar === 'function') onLocalizar(perfil);
            }}
            title="Localizar en mapa"
          >
            <MapPin size={16} />
          </button>

          <button 
            className="btn-accion btn-ver-perfil"
            onClick={(e) => {
              e.stopPropagation();
              handleVerPerfil();
            }}
          >
            Ver perfil
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardPerfilExplorar;