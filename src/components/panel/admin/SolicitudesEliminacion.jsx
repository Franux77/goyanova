import React, { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import './SolicitudesEliminacion.css';
import Loading from '../../loading/Loading';

const SolicitudesEliminacion = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const fetchSolicitudes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('solicitudes_eliminacion')
        .select(`
          *,
          opiniones (
            id,
            comentario,
            nombre_completo,
            puntuacion,
            servicio_id,
            servicios (
              id,
              nombre,
              tipo,
              usuario_id
            )
          )
        `)
        .order('fecha', { ascending: false });

      if (error) throw error;
      setSolicitudes(data || []);
    } catch (err) {
      console.error('Error al cargar solicitudes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolicitudes();

    // Suscripción en tiempo real
    const channel = supabase
      .channel('solicitudes-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solicitudes_eliminacion'
        },
        () => {
          fetchSolicitudes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const manejarSolicitud = async (id, accion) => {
    const solicitud = solicitudes.find(s => s.id === id);
    
    if (!solicitud) {
      alert('Solicitud no encontrada');
      return;
    }

    // Verificar si la opinión existe
    if (!solicitud.opiniones || !solicitud.opiniones.id) {
      alert('⚠️ La opinión asociada ya no existe o fue eliminada previamente');
      
      // Actualizar el estado a "aceptada" ya que la opinión no existe
      const { error } = await supabase
        .from('solicitudes_eliminacion')
        .update({ estado: 'aceptada' })
        .eq('id', id);
      
      if (!error) {
        fetchSolicitudes();
      }
      return;
    }

    const confirmMsg =
      accion === 'aprobada'
        ? `¿Estás seguro de aprobar y ELIMINAR PERMANENTEMENTE la opinión del servicio "${solicitud.opiniones?.servicios?.nombre || 'Desconocido'}"?`
        : '¿Estás seguro de rechazar la solicitud?';
    
    if (!window.confirm(confirmMsg)) return;

    setProcesando(true);

    try {
      if (accion === 'aprobada') {
        // IMPORTANTE: Usar servicio de edge function o llamar a un RPC
        // porque RLS no permite que admins eliminen opiniones directamente
        
        const { error: rpcError } = await supabase.rpc('eliminar_opinion_admin', {
          opinion_id: solicitud.opinion_id
        });

        if (rpcError) {
          // Si falla el RPC, intentar con DELETE directo (requiere RLS ajustada)
          const { error: delError } = await supabase
            .from('opiniones')
            .delete()
            .eq('id', solicitud.opinion_id);

          if (delError) {
            throw new Error(`No se pudo eliminar la opinión: ${delError.message}`);
          }
        }
      }

      // Actualizar estado de la solicitud
      const nuevoEstado = accion === 'aprobada' ? 'aceptada' : 'rechazada';
      
      const { error: updateError } = await supabase
        .from('solicitudes_eliminacion')
        .update({ estado: nuevoEstado })
        .eq('id', id);

      if (updateError) {
        throw new Error(`Error al actualizar solicitud: ${updateError.message}`);
      }

      alert(
        accion === 'aprobada' 
          ? '✅ Opinión eliminada exitosamente' 
          : '❌ Solicitud rechazada'
      );

      setModalAbierto(null);
      fetchSolicitudes();
    } catch (err) {
      console.error('Error:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setProcesando(false);
    }
  };

  const obtenerColorEstado = (estado) => {
    switch (estado) {
      case 'pendiente':
        return 'estado-pendiente';
      case 'aceptada':
        return 'estado-aceptada';
      case 'rechazada':
        return 'estado-rechazada';
      default:
        return '';
    }
  };

  if (loading) {
  return <Loading message="Cargando solicitudes..." />;
}

  if (!solicitudes.length) {
    return (
      <div className="sol-empty">
        <span className="material-icons">inbox</span>
        <h3>No hay solicitudes</h3>
        <p>Todas las solicitudes han sido procesadas</p>
      </div>
    );
  }

  return (
    <div className="sol-container">
      <header className="sol-header">
        <h2>Solicitudes de Eliminación</h2>
        <div className="sol-stats">
  <div className="stat-item">
    <span className="stat-number">{solicitudes.length}</span>
    <span className="stat-labell">Todas</span>
  </div>
  <div className="stat-item">
    <span className="stat-number">
      {solicitudes.filter(s => s.estado === 'pendiente').length}
    </span>
    <span className="stat-labell">Pendientes</span>
  </div>
  <div className="stat-item">
    <span className="stat-number">
      {solicitudes.filter(s => s.estado === 'aceptada').length}
    </span>
    <span className="stat-labell">Aceptadas</span>
  </div>
  <div className="stat-item">
    <span className="stat-number">
      {solicitudes.filter(s => s.estado === 'rechazada').length}
    </span>
    <span className="stat-labell">Rechazadas</span>
  </div>
</div>

      </header>

      <div className="sol-grid">
        {solicitudes.map((solicitud) => {
          const opinionExiste = solicitud.opiniones && solicitud.opiniones.id;
          const servicio = solicitud.opiniones?.servicios;
          
          return (
            <article
              key={solicitud.id}
              className={`sol-card ${obtenerColorEstado(solicitud.estado)}`}
              onClick={() => setModalAbierto(solicitud)}
            >
              <div className="sol-card-header">
                <div className="sol-usuario">
                  <span className="material-icons">account_circle</span>
                  <span>{solicitud.opiniones?.nombre_completo || 'Usuario'}</span>
                </div>
                <span className={`sol-badge ${obtenerColorEstado(solicitud.estado)}`}>
                  {solicitud.estado}
                </span>
              </div>

              <div className="sol-card-body">
                {/* Info del servicio */}
                {servicio && (
                  <div className="sol-servicio-info">
                    <span className="material-icons">store</span>
                    <strong>{servicio.nombre}</strong>
                    <span className="tipo-badge">{servicio.tipo}</span>
                  </div>
                )}

                <p className="sol-comentario">
                  {opinionExiste 
                    ? `"${solicitud.opiniones.comentario}"` 
                    : '⚠️ Opinión ya eliminada o no encontrada'}
                </p>
                
                {opinionExiste && (
                  <div className="sol-puntuacion">
                    {'★'.repeat(solicitud.opiniones.puntuacion || 0)}
                    {'☆'.repeat(5 - (solicitud.opiniones.puntuacion || 0))}
                  </div>
                )}

                <div className="sol-tipo">
                  <span className="material-icons">label</span>
                  {solicitud.tipo}
                </div>
              </div>

              <div className="sol-card-footer">
                <span className="sol-fecha">
                  <span className="material-icons">schedule</span>
                  {new Date(solicitud.fecha).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
                <span className="sol-ver-mas">Ver detalles →</span>
              </div>
            </article>
          );
        })}
      </div>

      {/* Modal de detalles */}
      {modalAbierto && (
        <div className="sol-modal-overlay" onClick={() => setModalAbierto(null)}>
          <div className="sol-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="sol-modal-close"
              onClick={() => setModalAbierto(null)}
            >
              <span className="material-icons">close</span>
            </button>

            <h3 className="sol-modal-title">Detalles de la Solicitud</h3>

            <div className="sol-modal-content">
              {/* Info del servicio */}
              {modalAbierto.opiniones?.servicios && (
                <div className="sol-modal-section destacado">
                  <label>Servicio Afectado</label>
                  <p>
                    <strong>{modalAbierto.opiniones.servicios.nombre}</strong>
                    <span className="tipo-badge">{modalAbierto.opiniones.servicios.tipo}</span>
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#666' }}>
                    ID: {modalAbierto.opiniones.servicios.id}
                  </p>
                </div>
              )}

              <div className="sol-modal-section">
                <label>Usuario que dejó la opinión</label>
                <p>{modalAbierto.opiniones?.nombre_completo || 'Desconocido'}</p>
              </div>

              <div className="sol-modal-section">
                <label>Comentario Original</label>
                <p className="sol-modal-comentario">
                  {modalAbierto.opiniones?.comentario || '⚠️ Opinión ya eliminada o no encontrada'}
                </p>
              </div>

              {modalAbierto.opiniones?.puntuacion && (
                <div className="sol-modal-section">
                  <label>Puntuación</label>
                  <div className="sol-puntuacion-grande">
                    {'★'.repeat(modalAbierto.opiniones.puntuacion)}
                    {'☆'.repeat(5 - modalAbierto.opiniones.puntuacion)}
                  </div>
                </div>
              )}

              <div className="sol-modal-section">
                <label>Tipo de Solicitud</label>
                <p className="sol-modal-tipo">{modalAbierto.tipo}</p>
              </div>

              {modalAbierto.comentario && (
                <div className="sol-modal-section">
                  <label>Comentario Adicional del Solicitante</label>
                  <p>{modalAbierto.comentario}</p>
                </div>
              )}

              <div className="sol-modal-section">
                <label>Estado</label>
                <span className={`sol-badge ${obtenerColorEstado(modalAbierto.estado)}`}>
                  {modalAbierto.estado}
                </span>
              </div>

              <div className="sol-modal-section">
                <label>Fecha de Solicitud</label>
                <p>
                  {new Date(modalAbierto.fecha).toLocaleString('es-AR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div className="sol-modal-section">
                <label>ID de Opinión</label>
                <p style={{ fontSize: '0.85rem', color: '#666' }}>
                  {modalAbierto.opinion_id || 'No disponible'}
                </p>
              </div>
            </div>

            {modalAbierto.estado === 'pendiente' && (
              <div className="sol-modal-actions">
                <button
                  className="sol-btn sol-btn-rechazar"
                  onClick={() => manejarSolicitud(modalAbierto.id, 'rechazada')}
                  disabled={procesando}
                >
                  <span className="material-icons">close</span>
                  {procesando ? 'Procesando...' : 'Rechazar'}
                </button>
                <button
                  className="sol-btn sol-btn-aprobar"
                  onClick={() => manejarSolicitud(modalAbierto.id, 'aprobada')}
                  disabled={procesando}
                >
                  <span className="material-icons">check</span>
                  {procesando ? 'Procesando...' : 'Aprobar y Eliminar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SolicitudesEliminacion;