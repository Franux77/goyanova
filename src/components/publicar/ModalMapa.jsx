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
  const [coordenadas, setCoordenadas] = useState(null);
  const [cargandoUbicacion, setCargandoUbicacion] = useState(true);

  useEffect(() => {
    // 🔹 PRIORIDAD 1: Si ya tiene ubicación previa (editando), úsala
    if (ubicacion?.lat && ubicacion?.lng) {
      const coords = [ubicacion.lat, ubicacion.lng];
      setCoordenadas({ lat: ubicacion.lat, lng: ubicacion.lng });
      
      // 🔹 Obtener ubicación actual del usuario en paralelo (para el punto azul)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            ubicacionUsuarioRef.current = [pos.coords.latitude, pos.coords.longitude];
            iniciarMapa(coords); // Inicia en las coordenadas guardadas
          },
          () => {
            ubicacionUsuarioRef.current = coords; // Fallback: usar las coords guardadas
            iniciarMapa(coords);
          }
        );
      } else {
        iniciarMapa(coords);
      }
      
      setCargandoUbicacion(false);
      return;
    }

    // 🔹 PRIORIDAD 2: Si NO hay ubicación previa, obtener ubicación actual
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
        setCoordenadas({ lat: coords[0], lng: coords[1] });
        iniciarMapa(coords);
        setCargandoUbicacion(false);
      },
      () => {
        // Fallback: coordenadas por defecto (Goya, Corrientes)
        const coords = [-29.1406, -59.2651];
        ubicacionUsuarioRef.current = coords;
        setCoordenadas({ lat: coords[0], lng: coords[1] });
        iniciarMapa(coords);
        setCargandoUbicacion(false);
      }
    );

    return () => {
      if (mapaInstanciaRef.current) {
        try {
          mapaInstanciaRef.current.off();
          mapaInstanciaRef.current.remove();
          mapaInstanciaRef.current = null;
        } catch (error) {
          // console.warn('Error al limpiar el mapa:', error);
        }
      }
    };
  }, [ubicacion]);

  const iniciarMapa = (centro) => {
    if (mapaInstanciaRef.current) return;

    // Asegurarse de que el contenedor esté limpio
    const container = mapaRef.current;
    if (!container) return;
    
    // Limpiar cualquier instancia previa de Leaflet en el contenedor
    if (container._leaflet_id) {
      delete container._leaflet_id;
    }

    const mapa = L.map(container, { zoomControl: false }).setView(centro, 16);
    mapaInstanciaRef.current = mapa;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapa);

    // 🔴 Marcador principal (pin rojo) en el centro
    const marcador = L.marker(centro, { draggable: false }).addTo(mapa);
    marcadorRef.current = marcador;

    // Actualizar coordenadas cuando se mueve el mapa
    mapa.on('move', () => {
      const centroMapa = mapa.getCenter();
      marcador.setLatLng(centroMapa);
      setCoordenadas({ lat: centroMapa.lat, lng: centroMapa.lng });
    });

    // 🔵 Punto azul de ubicación actual del usuario
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

  const acercarMapa = () => {
    if (mapaInstanciaRef.current) {
      mapaInstanciaRef.current.zoomIn();
    }
  };

  const alejarMapa = () => {
    if (mapaInstanciaRef.current) {
      mapaInstanciaRef.current.zoomOut();
    }
  };

  return (
    <div className="modal-mapa-overlay" onClick={onCerrar}>
      <div className="modal-mapa-contenido" onClick={(e) => e.stopPropagation()}>
        {/* Header del modal */}
        <div className="modal-mapa-header">
          <div className="modal-mapa-titulo">
            <span className="material-icons">location_on</span>
            <h3>Selecciona tu ubicación</h3>
          </div>
          <button onClick={onCerrar} className="modal-mapa-cerrar-x" aria-label="Cerrar">
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Instrucciones */}
        <div className="modal-mapa-instrucciones">
          <span className="material-icons">info</span>
          <p>Arrastra el mapa para posicionar el marcador en tu ubicación exacta</p>
        </div>

        {/* Contenedor del mapa */}
        <div className="modal-mapa-wrapper">
          {cargandoUbicacion && (
            <div className="modal-mapa-cargando">
              <div className="spinner-mapa"></div>
              <p>Cargando ubicación...</p>
            </div>
          )}
          <div
            id="mapa"
            ref={mapaRef}
            className="modal-mapa-leaflet"
          ></div>

          {/* Controles de zoom personalizados */}
          <div className="modal-mapa-zoom-controles">
            <button onClick={acercarMapa} className="zoom-btn" aria-label="Acercar">
              <span className="material-icons">add</span>
            </button>
            <button onClick={alejarMapa} className="zoom-btn" aria-label="Alejar">
              <span className="material-icons">remove</span>
            </button>
          </div>

          {/* Botón mi ubicación flotante */}
          <button onClick={volverAMiUbicacion} className="modal-mapa-mi-ubicacion" aria-label="Mi ubicación">
            <span className="material-icons">my_location</span>
          </button>
        </div>

        {/* Coordenadas seleccionadas */}
        {coordenadas && (
          <div className="modal-mapa-coordenadas">
            <span className="material-icons">pin_drop</span>
            <div className="coordenadas-texto">
              <span>Lat: {coordenadas.lat.toFixed(6)}</span>
              <span>Lng: {coordenadas.lng.toFixed(6)}</span>
            </div>
          </div>
        )}

        {/* Footer con acciones */}
        <div className="modal-mapa-footer">
          <button onClick={onCerrar} className="btn-cancelar-mapa">
            <span className="material-icons">close</span>
            Cancelar
          </button>
          <button onClick={confirmarUbicacion} className="btn-confirmar-mapa">
            <span className="material-icons">check_circle</span>
            Confirmar ubicación
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalMapa;