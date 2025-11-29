// src/components/mapa/UbicacionActual.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useMap, Circle, Marker } from 'react-leaflet';
import { Locate } from 'lucide-react';
import L from 'leaflet';
import './UbicacionActual.css';

const UbicacionActual = () => {
  const map = useMap();
  const [ubicacion, setUbicacion] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const timeoutRef = useRef(null);
  const watchIdRef = useRef(null);

  // Icono para el marcador de ubicación actual (punto azul)
  const ubicacionIcon = L.divIcon({
    className: 'ubicacion-actual-marker',
    html: `
      <div class="punto-azul">
        <div class="punto-azul-interior"></div>
        <div class="pulso-azul"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  // Obtener ubicación SIN centrar el mapa (solo detecta)
  const obtenerUbicacionSilenciosa = () => {
    if (!navigator.geolocation || cargando) return;

    setCargando(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        setUbicacion({
          lat: latitude,
          lng: longitude,
          accuracy: accuracy,
        });
        
        setCargando(false);
      },
      (err) => {
        setCargando(false);
        
        // No mostrar errores en carga silenciosa
        console.warn('Geolocalización no disponible:', err.code);
      },
      {
        enableHighAccuracy: false, // Más rápido, menos preciso
        timeout: 5000, // Timeout reducido
        maximumAge: 30000, // Cache de 30 segundos
      }
    );
  };

  // Volver a mi ubicación (cuando el usuario toca el botón)
  const volverAMiUbicacion = () => {
    if (cargando) return;

    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización');
      return;
    }

    // Si ya tenemos ubicación, centrar inmediatamente
    if (ubicacion) {
      map.flyTo([ubicacion.lat, ubicacion.lng], 16, {
        animate: true,
        duration: 0.8,
      });
      
      // Actualizar ubicación en segundo plano
      setTimeout(() => {
        obtenerUbicacionConPrecision();
      }, 300);
    } else {
      // No tenemos ubicación, obtenerla con precisión y centrar
      obtenerUbicacionConPrecision(true);
    }
  };

  // Obtener ubicación CON centrado (cuando el usuario presiona el botón)
  const obtenerUbicacionConPrecision = (centrar = false) => {
    if (cargando) return;

    setCargando(true);
    setError(null);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        setUbicacion({
          lat: latitude,
          lng: longitude,
          accuracy: accuracy,
        });
        
        if (centrar) {
          map.flyTo([latitude, longitude], 16, {
            animate: true,
            duration: 0.8,
          });
        }
        
        setCargando(false);
      },
      (err) => {
        setCargando(false);
        
        if (err.code === 1) {
          setError('Permiso denegado. Activa la ubicación');
        } else if (err.code === 2) {
          setError('Ubicación no disponible');
        } else if (err.code === 3) {
          setError('Tiempo agotado');
        } else {
          setError('Error al obtener ubicación');
        }
        
        console.error('Error de geolocalización:', err);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 5000,
      }
    );
  };

  // Detección inicial SILENCIOSA (sin zoom, solo muestra el punto azul)
  useEffect(() => {
    // Esperar 500ms antes de detectar (deja que el mapa se renderice primero)
    const initTimer = setTimeout(() => {
      obtenerUbicacionSilenciosa();
    }, 500);

    return () => {
      clearTimeout(initTimer);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Auto-cerrar mensajes de error después de 4 segundos
  useEffect(() => {
    if (error) {
      timeoutRef.current = setTimeout(() => {
        setError(null);
      }, 4000);
      
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [error]);

  return (
    <>
      {/* Botón flotante para volver a la ubicación */}
      <button
        className={`boton-ubicacion-actual ${cargando ? 'cargando' : ''} ${ubicacion ? 'ubicacion-activa' : ''}`}
        onClick={volverAMiUbicacion}
        title="Volver a mi ubicación"
        disabled={cargando}
      >
        <Locate 
          size={20} 
          className={ubicacion ? 'ubicacion-activa' : ''}
        />
      </button>

      {/* Mostrar error temporal */}
      {error && (
        <div className="ubicacion-error-toast">
          <span className="material-icons">error_outline</span>
          <span>{error}</span>
        </div>
      )}

      {/* Marcador y círculo de precisión en el mapa */}
      {ubicacion && (
        <>
          {/* Círculo de precisión */}
          <Circle
            center={[ubicacion.lat, ubicacion.lng]}
            radius={ubicacion.accuracy}
            pathOptions={{
              color: '#4A90E2',
              fillColor: '#4A90E2',
              fillOpacity: 0.1,
              weight: 1,
            }}
          />
          
          {/* Marcador de ubicación */}
          <Marker
            position={[ubicacion.lat, ubicacion.lng]}
            icon={ubicacionIcon}
          />
        </>
      )}
    </>
  );
};

export default UbicacionActual;