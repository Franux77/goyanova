import React from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import './MapaHome.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Corrige la ruta del ícono por defecto de Leaflet
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const position = [-29.1425, -59.2625]; // Coordenadas de Goya

// Pin propio con forma de marcador de lugar (no un punto de "ubicación en vivo" tipo GPS,
// para que quede claro que es solo el punto fijo de la ciudad de Goya en el mapa — este
// componente nunca pide ni usa la ubicación real de quien lo mira).
const iconoPin = L.divIcon({
  className: 'mapa-home-pin-wrapper',
  html: `
    <svg width="30" height="40" viewBox="0 0 30 40" class="mapa-home-pin-svg">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.7 23.3 0 15 0Z" fill="#1774f6" stroke="#ffffff" stroke-width="2"/>
      <circle cx="15" cy="15" r="5.5" fill="#ffffff"/>
    </svg>`,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -38]
});

export default function MapaHome({ onExplorarClick }) {
  return (
    <div className="mapa-home-marco">
      <div className="mapa-home-container">
        <MapContainer
          center={position}
          zoom={13}
          scrollWheelZoom={false}
          dragging={false}
          touchZoom={false}
          doubleClickZoom={false}
          boxZoom={false}
          keyboard={false}
          className="mapa-home"
          attributionControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position} icon={iconoPin}>
            <Popup>Goya, Corrientes</Popup>
          </Marker>
        </MapContainer>

        <div className="mapa-home-vignette" />

        <button
          className="btn-explorar"
          onClick={onExplorarClick}
          aria-label="Explorar servicios en el mapa"
        >
          Explorar
        </button>

        <div className="vista-previa">
          <h4>Mapa de Goya</h4>
          <p>Encuentra servicios cerca de tu ubicación</p>
        </div>
      </div>
    </div>
  );
}
