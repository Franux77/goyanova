import React from 'react';
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

export default function MapaHome({ onExplorarClick }) {
  return (
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
        <Marker position={position}>
          <Popup>Goya, Corrientes</Popup>
        </Marker>
      </MapContainer>

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
  );
}
