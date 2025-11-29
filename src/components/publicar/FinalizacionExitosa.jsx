import React, { useEffect, useState } from 'react';
import './FinalizacionExitosa.css';
import { FaCheckCircle } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';

const FinalizacionExitosa = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [contexto, setContexto] = useState({
    esActualizacion: false,
    origenPanel: null, // 'admin', 'usuario', null
    servicioId: null
  });

  useEffect(() => {
    // Obtener el contexto desde el state de navegación
    const state = location.state || {};
    setContexto({
      esActualizacion: state.esActualizacion || false,
      origenPanel: state.origenPanel || null,
      servicioId: state.servicioId || null
    });
  }, [location]);

  const handleVolverAlPanel = () => {
    // Navegar al panel correspondiente sin posibilidad de retroceder al formulario
    if (contexto.origenPanel === 'admin') {
      navigate('/panel/admin/servicios', { replace: true });
    } else if (contexto.origenPanel === 'usuario') {
      navigate('/panel/mis-servicios', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  const handleVerServicio = () => {
    // Ver el servicio publicado/actualizado
    if (contexto.servicioId) {
      navigate(`/perfil/${contexto.servicioId}`, { replace: true });
    }
  };

  const handlePublicarOtro = () => {
    // Ir a publicar otro servicio desde cero
    if (contexto.origenPanel === 'admin') {
      navigate('/panel/admin/publicar', { replace: true });
    } else if (contexto.origenPanel === 'usuario') {
      navigate('/panel/publicar', { replace: true });
    } else {
      navigate('/publicar', { replace: true });
    }
  };

  const handleVolverAlInicio = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="finalizacion-container">
      <div className="finalizacion-card">
        <FaCheckCircle className="icono-check" />
        
        {/* Mensaje dinámico según el contexto */}
        <h2>
          {contexto.esActualizacion 
            ? '¡Servicio actualizado con éxito!' 
            : '¡Servicio publicado con éxito!'}
        </h2>
        
        <p>
          {contexto.esActualizacion
            ? 'Los cambios ya están visibles en tu publicación.'
            : 'Tu publicación ya está visible para los usuarios de Goya.'}
        </p>

        <div className="finalizacion-buttons">
          {/* Botón principal: Volver al panel o inicio */}
          <button onClick={handleVolverAlPanel} className="btn-finalizar btn-primary">
            {contexto.origenPanel === 'admin' && 'Volver a Servicios (Admin)'}
            {contexto.origenPanel === 'usuario' && 'Volver a Mis Servicios'}
            {!contexto.origenPanel && 'Volver al Inicio'}
          </button>

          {/* Botón para ver el servicio */}
          {contexto.servicioId && (
            <button onClick={handleVerServicio} className="btn-finalizar btn-secondary">
              Ver mi servicio
            </button>
          )}

          {/* Botón para publicar otro (solo si no es actualización) */}
          {!contexto.esActualizacion && (
            <button onClick={handlePublicarOtro} className="btn-finalizar btn-secondary">
              Publicar otro servicio
            </button>
          )}

          {/* Botón alternativo para ir al inicio */}
          {contexto.origenPanel && (
            <button onClick={handleVolverAlInicio} className="btn-finalizar btn-text">
              Ir al inicio
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinalizacionExitosa;