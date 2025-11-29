import React, { useState, useEffect } from 'react';
import { supabase, selectWithRetry, updateWithRetry, deleteWithRetry } from '../../../utils/supabaseClient';
import './MensajesSoporte.css';
import Loading from '../../loading/Loading';

const MensajesSoporte = () => {
  const [mensajes, setMensajes] = useState([]);
  const [mensajeSeleccionado, setMensajeSeleccionado] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [estadisticas, setEstadisticas] = useState({
    pendientes: 0,
    en_proceso: 0,
    resueltos: 0,
    total: 0
  });

  useEffect(() => {
    cargarMensajes();
    cargarEstadisticas();
  }, [filtroEstado, filtroPrioridad]);

  const cargarMensajes = async () => {
    try {
      setCargando(true);
      
      let query = supabase
        .from('mensajes_soporte')
        .select(`
          *,
          perfiles_usuarios!mensajes_soporte_usuario_id_fkey (
            nombre,
            apellido,
            email
          ),
          respondido:perfiles_usuarios!mensajes_soporte_respondido_por_fkey (
            nombre,
            apellido
          )
        `)
        .order('created_at', { ascending: false });

      if (filtroEstado !== 'todos') {
        query = query.eq('estado', filtroEstado);
      }

      if (filtroPrioridad !== 'todos') {
        query = query.eq('prioridad', filtroPrioridad);
      }

      // 🆕 Usar selectWithRetry
      const result = await selectWithRetry(query);

      if (result.error) {
        console.error('Error al cargar mensajes:', result.error);
        setMensajes([]);
      } else {
        setMensajes(result.data || []);
      }

    } catch (error) {
      console.error('Error al cargar mensajes:', error);
      alert('Error al cargar mensajes');
    } finally {
      setCargando(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      // 🆕 Usar selectWithRetry
      const result = await selectWithRetry(
        supabase
          .from('mensajes_soporte')
          .select('estado')
      );

      if (result.error) {
        console.error('Error al cargar estadísticas:', result.error);
        return;
      }

      const data = result.data || [];
      const stats = {
        pendientes: data.filter(m => m.estado === 'pendiente').length,
        en_proceso: data.filter(m => m.estado === 'en_proceso').length,
        resueltos: data.filter(m => m.estado === 'resuelto').length,
        total: data.length
      };

      setEstadisticas(stats);

    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const cambiarEstado = async (mensajeId, nuevoEstado) => {
    try {
      // 🆕 Usar updateWithRetry
      const { error } = await updateWithRetry(
        supabase
          .from('mensajes_soporte')
          .update({ 
            estado: nuevoEstado,
            updated_at: new Date().toISOString()
          })
          .eq('id', mensajeId)
      );

      if (error) throw error;

      await cargarMensajes();
      await cargarEstadisticas();

      if (mensajeSeleccionado?.id === mensajeId) {
        setMensajeSeleccionado({ ...mensajeSeleccionado, estado: nuevoEstado });
      }

    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('Error al cambiar estado');
    }
  };

  const cambiarPrioridad = async (mensajeId, nuevaPrioridad) => {
    try {
      // 🆕 Usar updateWithRetry
      const { error } = await updateWithRetry(
        supabase
          .from('mensajes_soporte')
          .update({ 
            prioridad: nuevaPrioridad,
            updated_at: new Date().toISOString()
          })
          .eq('id', mensajeId)
      );

      if (error) throw error;

      await cargarMensajes();

      if (mensajeSeleccionado?.id === mensajeId) {
        setMensajeSeleccionado({ ...mensajeSeleccionado, prioridad: nuevaPrioridad });
      }

    } catch (error) {
      console.error('Error al cambiar prioridad:', error);
      alert('Error al cambiar prioridad');
    }
  };

  const enviarRespuesta = async (e) => {
    e.preventDefault();

    if (!respuesta.trim()) {
      alert('Por favor, escribe una respuesta');
      return;
    }

    try {
      setEnviandoRespuesta(true);

      const { data: { user } } = await supabase.auth.getUser();

      // 🆕 Usar updateWithRetry
      const { error: updateError } = await updateWithRetry(
        supabase
          .from('mensajes_soporte')
          .update({
            respuesta: respuesta,
            estado: 'resuelto',
            respondido_por: user.id,
            fecha_respuesta: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', mensajeSeleccionado.id)
      );

      if (updateError) throw updateError;

      await enviarEmailRespuesta(mensajeSeleccionado, respuesta);

      alert('Respuesta enviada con éxito');
      setRespuesta('');
      setMensajeSeleccionado(null);
      await cargarMensajes();
      await cargarEstadisticas();

    } catch (error) {
      console.error('Error al enviar respuesta:', error);
      alert('Error al enviar respuesta');
    } finally {
      setEnviandoRespuesta(false);
    }
  };

  const enviarEmailRespuesta = async (mensaje, respuestaTexto) => {
    const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY;
    const BREVO_SENDER = import.meta.env.VITE_BREVO_SENDER_EMAIL || 'goyanovasoporte@gmail.com';

    try {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: {
            name: 'Soporte GoyaNova',
            email: BREVO_SENDER,
          },
          to: [
            {
              email: mensaje.email,
              name: mensaje.nombre,
            }
          ],
          subject: `Re: ${mensaje.asunto}`,
          htmlContent: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                .ms-container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .ms-header { background: linear-gradient(135deg, #1774f6 0%, #0d5dd9 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .ms-content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
                .ms-footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
                .ms-message-box { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 3px solid #1774f6; margin: 20px 0; }
                .ms-response-box { background: #e3f2fd; padding: 15px; border-radius: 6px; border-left: 3px solid #1774f6; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="ms-container">
                <div class="ms-header">
                  <h1>✅ Respuesta a tu Consulta</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Equipo de Soporte GoyaNova</p>
                </div>
                
                <div class="ms-content">
                  <h2 style="color: #1774f6;">¡Hola ${mensaje.nombre}!</h2>
                  <p>Hemos revisado tu consulta y aquí está nuestra respuesta:</p>
                  
                  <div class="ms-message-box">
                    <strong>Tu consulta original:</strong><br>
                    <strong>Asunto:</strong> ${mensaje.asunto}<br>
                    <strong>Mensaje:</strong><br>
                    ${mensaje.mensaje.replace(/\n/g, '<br>')}
                  </div>
                  
                  <div class="ms-response-box">
                    <strong>📩 Nuestra Respuesta:</strong><br><br>
                    ${respuestaTexto.replace(/\n/g, '<br>')}
                  </div>
                  
                  <p>Si necesitas más ayuda o tienes alguna duda adicional, no dudes en contactarnos nuevamente.</p>
                  
                  <p style="margin-top: 30px;">
                    Saludos cordiales,<br>
                    <strong>Equipo de Soporte GoyaNova</strong>
                  </p>
                </div>
                
                <div class="ms-footer">
                  <p><strong>GoyaNova</strong></p>
                  <p>📧 ${BREVO_SENDER}</p>
                  <p style="margin-top: 10px; color: #999;">Este email fue enviado en respuesta a tu consulta #${mensaje.id.substring(0, 8)}</p>
                </div>
              </div>
            </body>
            </html>
          `
        }),
      });
    } catch (error) {
      console.error('Error al enviar email:', error);
    }
  };

  const eliminarMensaje = async (mensajeId) => {
    if (!confirm('¿Estás seguro de eliminar este mensaje? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      // 🆕 Usar deleteWithRetry
      const { error } = await deleteWithRetry(
        supabase
          .from('mensajes_soporte')
          .delete()
          .eq('id', mensajeId)
      );

      if (error) throw error;

      alert('Mensaje eliminado');
      setMensajeSeleccionado(null);
      await cargarMensajes();
      await cargarEstadisticas();

    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar mensaje');
    }
  };

  const mensajesFiltrados = mensajes.filter(mensaje => {
    if (!busqueda) return true;
    
    const searchLower = busqueda.toLowerCase();
    return (
      mensaje.nombre.toLowerCase().includes(searchLower) ||
      mensaje.email.toLowerCase().includes(searchLower) ||
      mensaje.asunto.toLowerCase().includes(searchLower) ||
      mensaje.mensaje.toLowerCase().includes(searchLower)
    );
  });

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pendiente': return '#ffc107';
      case 'en_proceso': return '#2196F3';
      case 'resuelto': return '#4caf50';
      case 'cerrado': return '#9e9e9e';
      default: return '#666';
    }
  };

  const getPrioridadColor = (prioridad) => {
    switch (prioridad) {
      case 'urgente': return '#f44336';
      case 'alta': return '#ff9800';
      case 'normal': return '#2196F3';
      case 'baja': return '#9e9e9e';
      default: return '#666';
    }
  };

  const getEstadoIcono = (estado) => {
    switch (estado) {
      case 'pendiente': return 'schedule';
      case 'en_proceso': return 'hourglass_empty';
      case 'resuelto': return 'check_circle';
      case 'cerrado': return 'archive';
      default: return 'help';
    }
  };

  return (
    <div className="ms-admin-container">
      <div className="ms-admin-header">
        <div className="ms-admin-titulo-section">
          <span className="material-icons ms-admin-header-icon">support_agent</span>
          <div>
            <h1 className="ms-admin-titulo">Mensajes de Soporte</h1>
            <p className="ms-admin-subtitulo">Gestiona las consultas de los usuarios</p>
          </div>
        </div>

        <div className="ms-admin-stats">
          <div className="ms-admin-stat-card ms-stat-pendiente">
            <span className="material-icons">schedule</span>
            <div>
              <div className="ms-stat-numero">{estadisticas.pendientes}</div>
              <div className="ms-stat-label">Pendientes</div>
            </div>
          </div>
          <div className="ms-admin-stat-card ms-stat-proceso">
            <span className="material-icons">hourglass_empty</span>
            <div>
              <div className="ms-stat-numero">{estadisticas.en_proceso}</div>
              <div className="ms-stat-label">En Proceso</div>
            </div>
          </div>
          <div className="ms-admin-stat-card ms-stat-resuelto">
            <span className="material-icons">check_circle</span>
            <div>
              <div className="ms-stat-numero">{estadisticas.resueltos}</div>
              <div className="ms-stat-label">Resueltos</div>
            </div>
          </div>
          <div className="ms-admin-stat-card ms-stat-total">
            <span className="material-icons">all_inbox</span>
            <div>
              <div className="ms-stat-numero">{estadisticas.total}</div>
              <div className="ms-stat-label">Total</div>
            </div>
          </div>
        </div>
      </div>

      <div className="ms-admin-filtros">
        <div className="ms-admin-buscador-wrapper">
          <span className="material-icons ms-admin-buscador-icon">search</span>
          <input
            type="search"
            placeholder="Buscar por nombre, email, asunto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="ms-admin-buscador"
          />
        </div>

        <select 
          value={filtroEstado} 
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="ms-admin-select"
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_proceso">En Proceso</option>
          <option value="resuelto">Resuelto</option>
          <option value="cerrado">Cerrado</option>
        </select>

        <select 
          value={filtroPrioridad} 
          onChange={(e) => setFiltroPrioridad(e.target.value)}
          className="ms-admin-select"
        >
          <option value="todos">Todas las prioridades</option>
          <option value="urgente">Urgente</option>
          <option value="alta">Alta</option>
          <option value="normal">Normal</option>
          <option value="baja">Baja</option>
        </select>

        <button onClick={cargarMensajes} className="ms-admin-btn-refrescar">
          <span className="material-icons">refresh</span>
          Actualizar
        </button>
      </div>

      <div className="ms-admin-contenido">
        <div className="ms-admin-lista">
          {cargando ? (
            <div className="loading-container">
              <Loading />
            </div>
          ) : mensajesFiltrados.length === 0 ? (
            <div className="ms-admin-empty">
              <span className="material-icons ms-admin-empty-icon">inbox</span>
              <p>No hay mensajes que mostrar</p>
            </div>
          ) : (
            mensajesFiltrados.map(mensaje => (
              <div
                key={mensaje.id}
                className={`ms-admin-mensaje-item ${mensajeSeleccionado?.id === mensaje.id ? 'ms-mensaje-activo' : ''}`}
                onClick={() => setMensajeSeleccionado(mensaje)}
              >
                <div className="ms-mensaje-header">
                  <div className="ms-mensaje-usuario">
                    <span className="material-icons ms-usuario-icon">account_circle</span>
                    <div>
                      <div className="ms-usuario-nombre">{mensaje.nombre}</div>
                      <div className="ms-usuario-email">{mensaje.email}</div>
                    </div>
                  </div>
                  <div className="ms-mensaje-badges">
                    <span 
                      className="ms-badge ms-badge-estado"
                      style={{ backgroundColor: getEstadoColor(mensaje.estado) }}
                    >
                      <span className="material-icons">{getEstadoIcono(mensaje.estado)}</span>
                      {mensaje.estado}
                    </span>
                    <span 
                      className="ms-badge ms-badge-prioridad"
                      style={{ backgroundColor: getPrioridadColor(mensaje.prioridad) }}
                    >
                      {mensaje.prioridad}
                    </span>
                  </div>
                </div>
                <div className="ms-mensaje-asunto">{mensaje.asunto}</div>
                <div className="ms-mensaje-preview">{mensaje.mensaje.substring(0, 100)}...</div>
                <div className="ms-mensaje-footer">
                  <span className="material-icons">schedule</span>
                  {new Date(mensaje.created_at).toLocaleString('es-AR')}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="ms-admin-detalle">
          {!mensajeSeleccionado ? (
            <div className="ms-detalle-empty">
              <span className="material-icons ms-detalle-empty-icon">mail_outline</span>
              <p>Selecciona un mensaje para ver los detalles</p>
            </div>
          ) : (
            <>
              <div className="ms-detalle-header">
                <div className="ms-detalle-titulo-section">
                  <h2 className="ms-detalle-titulo">{mensajeSeleccionado.asunto}</h2>
                  <div className="ms-detalle-meta">
                    <span className="material-icons">schedule</span>
                    {new Date(mensajeSeleccionado.created_at).toLocaleString('es-AR')}
                  </div>
                </div>
                <button 
                  onClick={() => eliminarMensaje(mensajeSeleccionado.id)}
                  className="ms-btn-eliminar"
                  title="Eliminar mensaje"
                >
                  <span className="material-icons">delete</span>
                </button>
              </div>

              <div className="ms-detalle-usuario-info">
                <div className="ms-info-item">
                  <span className="material-icons">person</span>
                  <div>
                    <div className="ms-info-label">Usuario</div>
                    <div className="ms-info-value">{mensajeSeleccionado.nombre}</div>
                  </div>
                </div>
                <div className="ms-info-item">
                  <span className="material-icons">email</span>
                  <div>
                    <div className="ms-info-label">Email</div>
                    <div className="ms-info-value">
                      <a href={`mailto:${mensajeSeleccionado.email}`}>{mensajeSeleccionado.email}</a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ms-detalle-controles">
                <div className="ms-control-group">
                  <label className="ms-control-label">Estado:</label>
                  <select
                    value={mensajeSeleccionado.estado}
                    onChange={(e) => cambiarEstado(mensajeSeleccionado.id, e.target.value)}
                    className="ms-control-select"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_proceso">En Proceso</option>
                    <option value="resuelto">Resuelto</option>
                    <option value="cerrado">Cerrado</option>
                  </select>
                </div>

                <div className="ms-control-group">
                  <label className="ms-control-label">Prioridad:</label>
                  <select
                    value={mensajeSeleccionado.prioridad}
                    onChange={(e) => cambiarPrioridad(mensajeSeleccionado.id, e.target.value)}
                    className="ms-control-select"
                  >
                    <option value="baja">Baja</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="ms-detalle-mensaje">
                <h3 className="ms-seccion-titulo">Mensaje:</h3>
                <div className="ms-mensaje-contenido">
                  {mensajeSeleccionado.mensaje}
                </div>
              </div>

              {mensajeSeleccionado.respuesta && (
                <div className="ms-detalle-respuesta-enviada">
                  <h3 className="ms-seccion-titulo">Respuesta Enviada:</h3>
                  <div className="ms-respuesta-contenido">
                    {mensajeSeleccionado.respuesta}
                  </div>
                  <div className="ms-respuesta-meta">
                    <span className="material-icons">check_circle</span>
                    Respondido el {new Date(mensajeSeleccionado.fecha_respuesta).toLocaleString('es-AR')}
                    {mensajeSeleccionado.respondido && (
                      <> por {mensajeSeleccionado.respondido.nombre} {mensajeSeleccionado.respondido.apellido}</>
                    )}
                  </div>
                </div>
              )}

              {!mensajeSeleccionado.respuesta && (
                <form onSubmit={enviarRespuesta} className="ms-form-respuesta">
                  <h3 className="ms-seccion-titulo">Enviar Respuesta:</h3>
                  <textarea
                    value={respuesta}
                    onChange={(e) => setRespuesta(e.target.value)}
                    placeholder="Escribe tu respuesta aquí..."
                    className="ms-textarea-respuesta"
                    rows={8}
                    required
                  />
                  <button 
                    type="submit" 
                    className="ms-btn-enviar-respuesta"
                    disabled={enviandoRespuesta}
                  >
                    {enviandoRespuesta ? (
                      <>
                        <span className="material-icons ms-spinner-icon">refresh</span>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <span className="material-icons">send</span>
                        Enviar Respuesta
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MensajesSoporte;