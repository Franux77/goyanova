// src/components/mapa/ScrollControl.jsx
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

const ScrollControl = () => {
  const map = useMap();

  useEffect(() => {
    const handleMouseOver = () => map.scrollWheelZoom.enable();
    const handleMouseOut = () => map.scrollWheelZoom.disable();

    const container = map.getContainer();
    container.addEventListener('mouseover', handleMouseOver);
    container.addEventListener('mouseout', handleMouseOut);

    return () => {
      container.removeEventListener('mouseover', handleMouseOver);
      container.removeEventListener('mouseout', handleMouseOut);
    };
  }, [map]);

  return null;
};

export default ScrollControl;
