// src/components/ListaPerfilesYDetalles/perfil/EstadoActividad.jsx
//
// Punto verde "En línea" o gris "Activo hace X". Nada pesado: solo
// lee un timestamp que ya vino con el perfil, no hace ninguna
// consulta nueva ni se conecta a nada.

import React from 'react';
import './EstadoActividad.css';

const UMBRAL_EN_LINEA_MIN = 5;

const formatearHaceTiempo = (fecha) => {
  const diffMs = Date.now() - new Date(fecha).getTime();
  const minutos = Math.floor(diffMs / 60000);

  if (minutos < 1) return 'Activo recién';
  if (minutos < 60) return `Activo hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Activo hace ${horas}h`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'Activo ayer';
  if (dias < 30) return `Activo hace ${dias} días`;

  return 'Activo hace un tiempo';
};

// esPremium: solo se muestra en planes pagos
// ultimaActividad: timestamp, puede ser null si nunca se registró
const EstadoActividad = ({ ultimaActividad, esPremium }) => {
  if (!esPremium || !ultimaActividad) return null;

  const minutos = Math.floor((Date.now() - new Date(ultimaActividad).getTime()) / 60000);
  const enLinea = minutos < UMBRAL_EN_LINEA_MIN;

  return (
    <div className={`estado-actividad ${enLinea ? 'en-linea' : 'desconectado'}`}>
      <span className="estado-actividad-punto" />
      <span className="estado-actividad-texto">
        {enLinea ? 'En línea' : formatearHaceTiempo(ultimaActividad)}
      </span>
    </div>
  );
};

export default EstadoActividad;