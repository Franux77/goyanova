// src/components/ListaPerfilesYDetalles/PerfilCard.jsx
import React, { useState } from 'react';
import './PerfilCard.css';
import { FaStar, FaStarHalfAlt, FaWhatsapp } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';


const generarColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

const obtenerIniciales = (nombre) => {
  if (!nombre) return '?';
  const palabras = nombre.split(' ');
  return palabras.map((w) => w[0].toUpperCase()).join('');
};

const renderStars = (rating) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      stars.push(<FaStar key={i} color="#f1c40f" size={16} />);
    } else if (i - rating <= 0.5) {
      stars.push(<FaStarHalfAlt key={i} color="#f1c40f" size={16} />);
    } else {
      stars.push(<FaStar key={i} color="#ccc" size={16} />);
    }
  }
  return stars;
};

const PerfilCard = ({
  id,
  fotoPerfil,
  nombre,
  descripcionServicio,
  rating = 0,
  contacto = {},
  totalOpiniones = 0,
  latitud,
  longitud,
  esPremium,
  badgeTexto
}) => {
  const navigate = useNavigate();
  const [mostrarMas, setMostrarMas] = useState(false);

  const descripcionCorta = descripcionServicio
    ? descripcionServicio.slice(0, 100)
    : 'Sin descripción disponible';

  const whatsappLink = contacto.whatsapp
    ? `https://wa.me/${contacto.whatsapp}?text=${encodeURIComponent(
        `Hola ${nombre || 'Hola'}, vi tu perfil y me interesa tu servicio.`
      )}`
    : '#';

  return (
    <div className="perfil-card-nuevo">
      {/* 🆕 Badge FUERA de foto - esquina card */}
      {esPremium && badgeTexto && (
        <div className="badge-perfil-card-top">
          <span className="material-icons badge-perfil-icon">star</span>
          <span className="badge-perfil-text">{badgeTexto}</span>
        </div>
      )}

      <div className="perfil-card-foto">
        {fotoPerfil ? (
          <img src={fotoPerfil} alt={nombre || 'Perfil'} />
        ) : (
          <div
            className="perfil-placeholder"
            style={{ backgroundColor: generarColor(nombre || 'Servicio') }}
          >
            {obtenerIniciales(nombre)}
          </div>
        )}
      </div>

      <div className="perfil-card-contenido">
        <div className="perfil-card-texto">
          <h3>{nombre || 'Sin nombre'}</h3>

          <p className={`descripcion ${mostrarMas ? 'expandida' : ''}`}>
            {mostrarMas ? descripcionServicio : descripcionCorta}
          </p>

          {descripcionServicio && descripcionServicio.length > 100 && (
            <button
              className="btn-ver-masc"
              onClick={() => setMostrarMas(!mostrarMas)}
            >
              {mostrarMas ? 'Ver menos' : 'Ver más'}
            </button>
          )}

          <div className="perfil-card-rating">
            {renderStars(rating)}
            <span className="rating-text">
              {rating.toFixed(1)} ({totalOpiniones})
            </span>
          </div>
        </div>

        <div className="perfil-card-botones">
          <button
            className="btn-ver-mapa"
            onClick={() =>
              navigate('/explorar', {
                state: { perfilId: id, latitud, longitud },
              })
            }
          >
            Ver en el mapa
          </button>
          
          <button className="btn-verr" onClick={() => navigate(`/perfil/${id}`)}>
            Ver perfil
          </button>

          {contacto.whatsapp && (
            <a
              className="btn-wsp"
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaWhatsapp /> Contactar
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerfilCard;