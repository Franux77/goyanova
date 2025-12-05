import React, { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useAuth } from '../../../auth/useAuth';
import './Opiniones.css';
import Loading from '../../loading/Loading';

const calcularPromedio = (opiniones) => {
  if (!opiniones.length) return 0;
  const total = opiniones.reduce((sum, op) => sum + (op.puntuacion || 0), 0);
  return (total / opiniones.length).toFixed(1);
};

const ordenarPorFecha = (opiniones) =>
  [...opiniones].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

const Opiniones = () => {
  const { user } = useAuth();
  const [opiniones, setOpiniones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respuestasEditando, setRespuestasEditando] = useState({});
  const [eliminacionForm, setEliminacionForm] = useState({});

  const cargarOpiniones = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data: servicios, error: serviciosError } = await supabase
        .from('servicios')
        .select('id, nombre, tipo')
        .eq('usuario_id', user.id);

      if (serviciosError) throw serviciosError;
      const servicioIds = servicios?.map((s) => s.id) || [];
      
      if (!servicioIds.length) {
        setOpiniones([]);
        setLoading(false);
        return;
      }

      const { data: opinionesData, error: opinionesError } = await supabase
        .from('opiniones')
        .select(`
          *,
          servicios (
            id,
            nombre,
            tipo
          )
        `)
        .in('servicio_id', servicioIds);

      if (opinionesError) throw opinionesError;

      if (!opinionesData || opinionesData.length === 0) {
        setOpiniones([]);
        setLoading(false);
        return;
      }

      const opinionIds = opinionesData.map(op => op.id);

      const { data: solicitudes, error: solicitudesError } = await supabase
        .from('solicitudes_eliminacion')
        .select('*')
        .in('opinion_id', opinionIds);

      if (solicitudesError) throw solicitudesError;

      const opinionesConSolicitud = opinionesData.map(op => {
        const solicitud = solicitudes?.find(s => s.opinion_id === op.id);
        return {
          ...op,
          solicitud_id: solicitud?.id || null,
          solicitud_enviada: !!solicitud,
          solicitud_tipo: solicitud?.tipo || '',
          solicitud_comentario: solicitud?.comentario || '',
          solicitud_estado: solicitud?.estado || ''
        };
      });

      setOpiniones(ordenarPorFecha(opinionesConSolicitud));
    } catch (err) {
      console.error('Error al cargar opiniones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarOpiniones();

    const opinionesChannel = supabase
      .channel('opiniones-user-changes')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'opiniones'
        },
        () => {
          // console.log('Opinión eliminada detectada');
          cargarOpiniones();
        }
      )
      .subscribe();

    const solicitudesChannel = supabase
      .channel('solicitudes-user-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'solicitudes_eliminacion'
        },
        (payload) => {
          // console.log('Nueva solicitud detectada:', payload);
          cargarOpiniones();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'solicitudes_eliminacion'
        },
        (payload) => {
          // console.log('Solicitud actualizada detectada:', payload);
          cargarOpiniones();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'solicitudes_eliminacion'
        },
        (payload) => {
          // console.log('Solicitud eliminada detectada:', payload);
          cargarOpiniones();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(opinionesChannel);
      supabase.removeChannel(solicitudesChannel);
    };
  }, [user]);

  const handleResponder = (id) => {
    setRespuestasEditando((prev) => ({
      ...prev,
      [id]: opiniones.find((op) => op.id === id)?.respuesta || '',
    }));
  };

  const enviarRespuesta = async (id) => {
    const respuesta = respuestasEditando[id];
    if (!respuesta?.trim()) {
      alert('Escribe una respuesta');
      return;
    }

    const { error } = await supabase
      .from('opiniones')
      .update({ respuesta: respuesta.trim(), fecha_respuesta: new Date() })
      .eq('id', id);

    if (error) {
      alert('Error al enviar respuesta');
      return;
    }

    setOpiniones((prev) =>
      prev.map((op) =>
        op.id === id ? { ...op, respuesta: respuesta.trim(), fecha_respuesta: new Date() } : op
      )
    );
    setRespuestasEditando((prev) => ({ ...prev, [id]: undefined }));
    alert('✅ Respuesta enviada');
  };

  const solicitarEliminacion = async (opinionId) => {
    const formData = eliminacionForm[opinionId];
    if (!formData?.tipo) {
      alert('⚠️ Debes seleccionar un tipo de motivo');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('solicitudes_eliminacion')
        .insert([{
          opinion_id: opinionId,
          solicitante_id: user.id,
          tipo: formData.tipo,
          comentario: formData.comentario?.trim() || '',
          estado: 'pendiente'
        }])
        .select();

      if (error) throw error;

      // console.log('Solicitud creada:', data);
      alert('✅ Solicitud enviada. Un administrador la revisará.');
      
      // Forzar recarga inmediata
      await cargarOpiniones();
      setEliminacionForm((prev) => ({ ...prev, [opinionId]: undefined }));
    } catch (err) {
      console.error('Error al enviar solicitud:', err);
      alert('❌ Hubo un error al enviar la solicitud.');
    }
  };

  const cancelarSolicitud = async (solicitudId) => {
    if (!window.confirm('¿Cancelar esta solicitud de eliminación?')) return;

    try {
      const { error } = await supabase
        .from('solicitudes_eliminacion')
        .delete()
        .eq('id', solicitudId)
        .eq('estado', 'pendiente');

      if (error) throw error;

      // console.log('Solicitud cancelada:', solicitudId);
      alert('✅ Solicitud cancelada');
      
      // Forzar recarga inmediata
      await cargarOpiniones();
    } catch (err) {
      console.error('Error al cancelar solicitud:', err);
      alert('❌ No se pudo cancelar la solicitud');
    }
  };

  if (loading) {
  return <Loading message="Cargando opiniones..." />;
}

  const promedio = calcularPromedio(opiniones);

  return (
    <div className="panel-opiniones-container">
      <div className="opiniones-header">
        <h2 className="panel-opiniones-titulo">
          <span className="titulo-icon">📝</span>
          Opiniones Recibidas
        </h2>
      </div>

      <div className="panel-opiniones-resumen">
        <div className="resumen-card">
          <span className="resumen-icon">⭐</span>
          <div className="resumen-content">
            <span className="resumen-valor">{promedio}</span>
            <span className="resumen-label">Promedio</span>
          </div>
        </div>
        <div className="resumen-card">
          <span className="resumen-icon">💬</span>
          <div className="resumen-content">
            <span className="resumen-valor">{opiniones.length}</span>
            <span className="resumen-label">Opiniones</span>
          </div>
        </div>
      </div>

      {opiniones.length === 0 ? (
        <div className="opiniones-empty">
          <span className="empty-icon">📭</span>
          <h3>No hay opiniones aún</h3>
          <p>Cuando recibas opiniones aparecerán aquí</p>
        </div>
      ) : (
        <div className="panel-opiniones-lista">
          {opiniones.map((op) => (
            <div className="panel-opinion-card" key={op.id}>
              {op.servicios && (
                <div className="opinion-servicio-badge">
                  <span className="material-icons">store</span>
                  <span className="servicio-nombre">{op.servicios.nombre}</span>
                  <span className="servicio-tipo">{op.servicios.tipo}</span>
                </div>
              )}

              <div className="panel-opinion-header">
                <div className="opinion-usuario">
                  <span className="material-icons">account_circle</span>
                  <span className="opinion-nombre">{op.nombre_completo}</span>
                </div>
                <span className="opinion-fecha">
                  {op.fecha ? new Date(op.fecha).toLocaleDateString('es-AR') : '-'}
                </span>
              </div>

              <div className="panel-opinion-estrellas">
                <div className="estrellas">
                  {'★'.repeat(op.puntuacion || 0)}
                  {'☆'.repeat(5 - (op.puntuacion || 0))}
                </div>
                {op.verificada && (
                  <span className="opinion-verificada">
                    <span className="material-icons">verified</span>
                    Verificada
                  </span>
                )}
              </div>

              <p className="panel-opinion-comentario">
                <span className="material-icons">format_quote</span>
                {op.comentario}
              </p>

              {op.respuesta && (
                <div className="panel-opinion-respuesta">
                  <div className="respuesta-header">
                    <span className="material-icons">reply</span>
                    <strong>Tu respuesta:</strong>
                  </div>
                  <p>{op.respuesta}</p>
                </div>
              )}

              <div className="panel-opinion-footer">
                {respuestasEditando[op.id] !== undefined ? (
                  <div className="respuesta-form">
                    <textarea
                      value={respuestasEditando[op.id]}
                      onChange={(e) =>
                        setRespuestasEditando((prev) => ({
                          ...prev,
                          [op.id]: e.target.value
                        }))
                      }
                      placeholder="Escribe tu respuesta..."
                      rows={3}
                    />
                    <div className="respuesta-actions">
                      <button 
                        className="btn-primary" 
                        onClick={() => enviarRespuesta(op.id)}
                      >
                        <span className="material-icons">send</span>
                        Enviar
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() =>
                          setRespuestasEditando((prev) => ({ ...prev, [op.id]: undefined }))
                        }
                      >
                        <span className="material-icons">close</span>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="acciones-botones">
                    <button 
                      className="btn-responder"
                      onClick={() => handleResponder(op.id)}
                    >
                      <span className="material-icons">{op.respuesta ? 'edit' : 'reply'}</span>
                      {op.respuesta ? 'Editar respuesta' : 'Responder'}
                    </button>

                    {op.respuesta && (
                      <button
                        className="btn-eliminar-respuesta"
                        onClick={async () => {
                          if (!window.confirm('¿Seguro que deseas eliminar tu respuesta?')) return;
                          const { error } = await supabase
                            .from('opiniones')
                            .update({ respuesta: null, fecha_respuesta: null })
                            .eq('id', op.id);
                          if (!error) {
                            setOpiniones(prev =>
                              prev.map(o =>
                                o.id === op.id ? { ...o, respuesta: null, fecha_respuesta: null } : o
                              )
                            );
                            alert('✅ Respuesta eliminada');
                          }
                        }}
                      >
                        <span className="material-icons">delete_outline</span>
                        Eliminar respuesta
                      </button>
                    )}

                    {!op.solicitud_enviada ? (
                      eliminacionForm[op.id] ? (
                        <div className="form-eliminacion">
                          <h4>
                            <span className="material-icons">report_problem</span>
                            Solicitar eliminación
                          </h4>
                          <select
                            value={eliminacionForm[op.id].tipo}
                            onChange={(e) =>
                              setEliminacionForm((prev) => ({
                                ...prev,
                                [op.id]: { ...prev[op.id], tipo: e.target.value }
                              }))
                            }
                          >
                            <option value="">Seleccionar motivo</option>
                            <option value="Spam">Spam</option>
                            <option value="Ofensivo">Ofensivo</option>
                            <option value="Inapropiado">Inapropiado</option>
                            <option value="Otro">Otro</option>
                          </select>
                          <textarea
                            placeholder="Comentario adicional (opcional)"
                            value={eliminacionForm[op.id].comentario || ''}
                            onChange={(e) =>
                              setEliminacionForm((prev) => ({
                                ...prev,
                                [op.id]: { ...prev[op.id], comentario: e.target.value }
                              }))
                            }
                            rows={2}
                          />
                          <div className="form-actions">
                            <button 
                              className="btn-danger"
                              onClick={() => solicitarEliminacion(op.id)}
                            >
                              <span className="material-icons">send</span>
                              Enviar solicitud
                            </button>
                            <button
                              className="btn-secondary"
                              onClick={() =>
                                setEliminacionForm((prev) => ({ ...prev, [op.id]: undefined }))
                              }
                            >
                              <span className="material-icons">close</span>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="btn-solicitar-eliminacion"
                          onClick={() =>
                            setEliminacionForm((prev) => ({
                              ...prev,
                              [op.id]: { tipo: '', comentario: '' }
                            }))
                          }
                        >
                          <span className="material-icons">report</span>
                          Solicitar eliminación
                        </button>
                      )
                    ) : (
                      <div className="solicitud-estado-container">
                        <div className={`solicitud-estado estado-${op.solicitud_estado}`}>
                          <span className="material-icons">
                            {op.solicitud_estado === 'pendiente' && 'schedule'}
                            {op.solicitud_estado === 'aceptada' && 'check_circle'}
                            {op.solicitud_estado === 'denegada' && 'cancel'}
                          </span>
                          <span>
                            {op.solicitud_estado === 'pendiente' && 'En revisión'}
                            {op.solicitud_estado === 'aceptada' && 'Solicitud aceptada'}
                            {op.solicitud_estado === 'denegada' && 'Solicitud rechazada'}
                          </span>
                        </div>
                        {op.solicitud_estado === 'pendiente' && op.solicitud_id && (
                          <button
                            className="btn-cancelar-solicitud"
                            onClick={() => cancelarSolicitud(op.solicitud_id)}
                          >
                            <span className="material-icons">close</span>
                            Cancelar solicitud
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Opiniones;