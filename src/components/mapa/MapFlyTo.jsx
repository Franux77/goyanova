// src/components/mapa/MapFlyTo.jsx
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

const MapFlyTo = ({ target, onComplete }) => {
  const map = useMap();

  useEffect(() => {
    if (!target) return;

    // Extraer lat/lng de target
    const lat = target.latitud ?? target.lat ?? target.latitude;
    const lng = target.longitud ?? target.lng ?? target.longitude;

    if (lat !== undefined && lng !== undefined) {
      map.flyTo([lat, lng], 18, { animate: true });

      if (onComplete) {
        const timer = setTimeout(onComplete, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [target, map, onComplete]);

  return null;
};

export default MapFlyTo;
