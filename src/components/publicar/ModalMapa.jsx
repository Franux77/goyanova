// src/componentes/publicar/ModalMapa.jsx
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ModalMapa.css';

const ModalMapa = ({ onGuardar, onCerrar, ubicacion }) => {
  const mapaRef = useRef(null);
  const mapaInstanciaRef = useRef(null);
  const ubicacionUsuarioRef = useRef(null);
  const marcadorRef = useRef(null);
  const [coordenadas, setCoordenadas] = useState(
    ubicacion?.lat && ubicacion?.lng
      ? { lat: ubicacion.lat, lng: ubicacion.lng }
      : null
  );

  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'prompt') {
          navigator.geolocation.getCurrentPosition(() => {}, () => {});
        }
      });
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        ubicacionUsuarioRef.current = coords;
        iniciarMapa(coords);
      },
      () => {
        const coords = [-29.1406, -59.2651]; // fallback
        ubicacionUsuarioRef.current = coords;
        iniciarMapa(coords);
      }
    );

    return () => {
      if (mapaInstanciaRef.current) {
        mapaInstanciaRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (ubicacion?.lat && ubicacion?.lng && mapaInstanciaRef.current) {
      setCoordenadas({ lat: ubicacion.lat, lng: ubicacion.lng });
      mapaInstanciaRef.current.setView([ubicacion.lat, ubicacion.lng], 15);
    }
  }, [ubicacion]);

  const iniciarMapa = (centro) => {
    if (mapaInstanciaRef.current) return;

    const mapa = L.map(mapaRef.current, { zoomControl: true }).setView(centro, 15);
    mapaInstanciaRef.current = mapa;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapa);

    // Marcador tradicional, inicial en el centro
    const marcador = L.marker(mapa.getCenter(), { draggable: false }).addTo(mapa);
    marcadorRef.current = marcador;

    mapa.on('move', () => {
      const centroMapa = mapa.getCenter();
      marcador.setLatLng(centroMapa);
      setCoordenadas({ lat: centroMapa.lat, lng: centroMapa.lng });
    });

    // Punto azul de ubicación actual
    if (ubicacionUsuarioRef.current) {
      L.circleMarker(ubicacionUsuarioRef.current, {
        radius: 8,
        color: '#3399ff',
        fillColor: '#3399ff',
        fillOpacity: 0.8,
      }).addTo(mapa);
    }
  };

  const volverAMiUbicacion = () => {
    if (mapaInstanciaRef.current && ubicacionUsuarioRef.current) {
      mapaInstanciaRef.current.setView(ubicacionUsuarioRef.current, 16);
    }
  };

  const confirmarUbicacion = () => {
    if (coordenadas) {
      onGuardar(coordenadas.lat, coordenadas.lng);
    }
  };

  return (
    <div className="modal-mapa-leaflet">
      <p className="instruccion-mapa">
        Mové el mapa hasta ubicar tu servicio, el marcador se mantiene en el centro.
      </p>

      <div
        id="mapa"
        ref={mapaRef}
        style={{ height: '400px', width: '100%' }}
      ></div>

      {coordenadas && (
        <p style={{ textAlign: 'center', marginTop: '10px', fontWeight: 'bold' }}>
          Coordenadas seleccionadas: <br />
          Lat: {coordenadas.lat.toFixed(6)} | Lng: {coordenadas.lng.toFixed(6)}
        </p>
      )}

      <div className="acciones-mapa">
        <button onClick={volverAMiUbicacion} className="btn-volver">Mi ubicación</button>
        <button onClick={confirmarUbicacion} className="btn-confirmar">Confirmar</button>
        <button onClick={onCerrar} className="btn-cerrar">Cancelar</button>
      </div>
    </div>
  );
};

export default ModalMapa;
