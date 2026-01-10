// src/componentes/publicar/ModalMapa.jsx
import React, { useEffect, useRef, useState } from 'react';
import './ModalMapa.css';

const ModalMapa = ({ onGuardar, onCerrar, ubicacion }) => {
  const mapaRef = useRef(null);
  const mapaInstanciaRef = useRef(null);
  const marcadorCentroRef = useRef(null);
  const marcadorUsuarioRef = useRef(null);
  const ubicacionUsuarioRef = useRef(null);
  const [coordenadas, setCoordenadas] = useState(null);
  const [cargandoUbicacion, setCargandoUbicacion] = useState(true);
  const [errorMapa, setErrorMapa] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) throw new Error('Falta la API key de Google Maps');

        // 1. Determinar coordenadas iniciales
        let coordsIniciales;

        // Intentar usar ubicación existente o geolocalización
        if (ubicacion?.lat && ubicacion?.lng) {
          coordsIniciales = { lat: ubicacion.lat, lng: ubicacion.lng };
          setCoordenadas(coordsIniciales);
        } else if (navigator.geolocation) {
          try {
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
                enableHighAccuracy: false
              });
            });
            coordsIniciales = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            ubicacionUsuarioRef.current = coordsIniciales;
            setCoordenadas(coordsIniciales);
          } catch (error) {
            // Fallback si falla GPS
            coordsIniciales = { lat: -29.1406, lng: -59.2651 };
            ubicacionUsuarioRef.current = coordsIniciales;
            setCoordenadas(coordsIniciales);
          }
        } else {
          coordsIniciales = { lat: -29.1406, lng: -59.2651 };
          ubicacionUsuarioRef.current = coordsIniciales;
          setCoordenadas(coordsIniciales);
        }

        // 2. Función para crear el mapa
        const crearMapa = () => {
          if (!isMounted || !mapaRef.current) return;
          
          // Verificación de seguridad extra
          if (!window.google || !window.google.maps) return;

          const map = new window.google.maps.Map(mapaRef.current, {
            center: coordsIniciales,
            zoom: 18,
            
            // --- CONFIGURACIÓN CRÍTICA ---
            mapTypeId: 'hybrid', // Modo satélite híbrido (con calles)
            gestureHandling: 'greedy', // IMPORTANTE: Permite mover con un solo dedo en celular
            disableDefaultUI: false, // Dejar controles básicos
            
            // Simplificamos controles para evitar el error 'TOP_RIGHT' undefined
            mapTypeControl: false, // Ocultamos el selector de mapa (ya está en híbrido)
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: false, // Usamos tus botones personalizados
            mapId: 'DEMO_MAP_ID' 
          });

          mapaInstanciaRef.current = map;

          // Marcador Rojo (Centro)
          const marcadorCentro = new window.google.maps.Marker({
            position: coordsIniciales,
            map: map,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#FF0000',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#FFFFFF'
            },
            zIndex: 1000
          });
          marcadorCentroRef.current = marcadorCentro;

          // Marcador Azul (Usuario)
          if (ubicacionUsuarioRef.current && (!ubicacion?.lat || !ubicacion?.lng)) {
            const marcadorUsuario = new window.google.maps.Marker({
              position: ubicacionUsuarioRef.current,
              map: map,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#3399ff',
                fillOpacity: 0.8,
                strokeWeight: 2,
                strokeColor: '#FFFFFF'
              },
              zIndex: 999
            });
            marcadorUsuarioRef.current = marcadorUsuario;
          }

          // Listener de movimiento
          map.addListener('center_changed', () => {
            if (!isMounted) return;
            const centro = map.getCenter();
            const nuevasCoordenadas = {
              lat: centro.lat(),
              lng: centro.lng()
            };
            marcadorCentro.setPosition(nuevasCoordenadas);
            setCoordenadas(nuevasCoordenadas);
          });

          if (isMounted) setCargandoUbicacion(false);
        };

        // 3. Lógica de carga del Script (Optimizada)
        if (window.google?.maps) {
          crearMapa();
        } else {
          const scriptExistente = document.querySelector('script[src*="maps.googleapis.com"]');
          if (scriptExistente) {
             // Si existe pero no cargó, le agregamos el listener
            scriptExistente.addEventListener('load', crearMapa);
          } else {
            const script = document.createElement('script');
            // Quitamos loading=async para forzar carga síncrona de recursos si es posible y evitar race conditions
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = crearMapa;
            script.onerror = () => {
              if (isMounted) {
                setErrorMapa('Error de conexión con Google Maps');
                setCargandoUbicacion(false);
              }
            };
            document.head.appendChild(script);
          }
        }

      } catch (error) {
        console.error(error);
        if (isMounted) {
          setErrorMapa(error.message);
          setCargandoUbicacion(false);
        }
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (marcadorCentroRef.current) marcadorCentroRef.current.setMap(null);
      if (marcadorUsuarioRef.current) marcadorUsuarioRef.current.setMap(null);
    };
  }, [ubicacion]);

  // Funciones de control manual
  const volverAMiUbicacion = () => {
    if (mapaInstanciaRef.current && ubicacionUsuarioRef.current) {
      mapaInstanciaRef.current.panTo(ubicacionUsuarioRef.current);
      mapaInstanciaRef.current.setZoom(18);
    }
  };

  const confirmarUbicacion = () => {
    if (coordenadas) onGuardar(coordenadas.lat, coordenadas.lng);
  };

  const acercarMapa = () => {
    if (mapaInstanciaRef.current) mapaInstanciaRef.current.setZoom(mapaInstanciaRef.current.getZoom() + 1);
  };

  const alejarMapa = () => {
    if (mapaInstanciaRef.current) mapaInstanciaRef.current.setZoom(mapaInstanciaRef.current.getZoom() - 1);
  };

  return (
    <div className="modal-mapa-overlay" onClick={onCerrar}>
      <div className="modal-mapa-contenido" onClick={(e) => e.stopPropagation()}>
        <div className="modal-mapa-header">
          <div className="modal-mapa-titulo">
            <span className="material-icons">location_on</span>
            <h3>Ubicación exacta</h3>
          </div>
          <button onClick={onCerrar} className="modal-mapa-cerrar-x">
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="modal-mapa-instrucciones">
          <span className="material-icons">touch_app</span>
          <p>Mueve el mapa para ajustar el marcador rojo</p>
        </div>

        <div className="modal-mapa-wrapper">
          {cargandoUbicacion && (
            <div className="modal-mapa-cargando">
              <div className="spinner-mapa"></div>
              <p>Cargando satélite...</p>
            </div>
          )}
          
          {errorMapa && (
            <div className="modal-mapa-error">
              <span className="material-icons">error</span>
              <p>{errorMapa}</p>
            </div>
          )}

          <div ref={mapaRef} className="modal-mapa-leaflet" style={{ width: '100%', height: '100%' }} />

          <div className="modal-mapa-zoom-controles">
            <button onClick={acercarMapa} className="zoom-btn"><span className="material-icons">add</span></button>
            <button onClick={alejarMapa} className="zoom-btn"><span className="material-icons">remove</span></button>
          </div>

          {ubicacionUsuarioRef.current && (
            <button onClick={volverAMiUbicacion} className="modal-mapa-mi-ubicacion">
              <span className="material-icons">my_location</span>
            </button>
          )}
        </div>

        <div className="modal-mapa-footer">
          <button onClick={onCerrar} className="btn-cancelar-mapa">Cancelar</button>
          <button onClick={confirmarUbicacion} className="btn-confirmar-mapa" disabled={!coordenadas}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalMapa;