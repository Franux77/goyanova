import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { FiAlertCircle, FiEye, FiCheck, FiX, FiClock, FiEyeOff, FiTrash2, FiShield } from 'react-icons/fi';
import Loading from '../../loading/Loading';
import './ReportesAdmin.css';

const ReportesAdmin = () => {
  const [reportes, setReportes] = useState([]);
  const [filtro, setFiltro] = useState('pendiente');
  const [loading, setLoading] = useState(true);
  const [reporteSeleccionado, setReporteSeleccionado] = useState(null);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarReportes();
  }, [filtro]);

  const cargarReportes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("reportes")
        .select(`
          *,
          reportante:perfiles_usuarios!reportes_reportante_id_fkey(nombre, apellido, email),
          servicio:servicios(
            nombre, 
            estado, 
            usuario_id, 
            oculto_por_reportes, 
            reportes_acumulados
          )
        `)
        .order("prioridad", { ascending: false })
        .order("fecha_creacion", { ascending: false });

      if (filtro !== 'todos') {
        query = query.eq('estado', filtro);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReportes(data || []);
    } catch (err) {
      alert('❌ Error al cargar reportes. Verifica tus permisos de admin.');
    } finally {
      setLoading(false);
    }
  };

  const marcarComoRevisando = async (reporteId) => {
    setProcesando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('reportes')
        .update({
          estado: 'revisando',
          revisado_por: user?.id
        })
        .eq('id', reporteId);

      if (error) throw error;

      await cargarReportes();
    } catch (err) {
      alert('❌ Error al actualizar el reporte: ' + err.message);
    } finally {
      setProcesando(false);
    }
  };

  const tomarAccion = async (reporteId, accion, motivo = '') => {
    if (!window.confirm(`¿Estás seguro de realizar esta acción: ${accion}?`)) {
      return;
    }

    setProcesando(true);
    try {
      const reporte = reportes.find(r => r.id === reporteId);
      
      let updateServicio = {};
      let crearSuspension = false;
      let diasSuspension = 0;
      let tipoSuspension = '';
      let nuevoEstadoReporte = 'resuelto';
      let accionTomada = '';

      switch (accion) {
        case 'advertir':
          accionTomada = 'Advertencia enviada al dueño';
          await supabase.from('notificaciones').insert({
            usuario_id: reporte.servicio.usuario_id,
            titulo: '⚠️ Advertencia sobre tu servicio',
            mensaje: `Tu servicio "${reporte.servicio.nombre}" ha recibido un reporte. Por favor revisa el contenido y asegúrate de cumplir con nuestras políticas.`,
            tipo: 'advertencia',
            leida: false
          });
          break;

        case 'ocultar':
          updateServicio = {
            oculto_por_reportes: true,
            fecha_ocultamiento: new Date().toISOString()
          };
          accionTomada = 'Servicio ocultado manualmente por admin';
          break;

        case 'suspender_7':
          updateServicio = { estado: 'suspendido' };
          crearSuspension = true;
          diasSuspension = 7;
          tipoSuspension = 'temporal';
          accionTomada = 'Servicio suspendido por 7 días';
          await supabase.from('notificaciones').insert({
            usuario_id: reporte.servicio.usuario_id,
            titulo: '🚫 Tu servicio ha sido suspendido por 7 días',
            mensaje: `Tu servicio "${reporte.servicio.nombre}" ha sido suspendido por 7 días. ${motivo || 'Violación de políticas de la plataforma.'}`,
            tipo: 'suspension',
            leida: false
          });
          break;

        case 'suspender_30':
          updateServicio = { estado: 'suspendido' };
          crearSuspension = true;
          diasSuspension = 30;
          tipoSuspension = 'temporal';
          accionTomada = 'Servicio suspendido por 30 días';
          await supabase.from('notificaciones').insert({
            usuario_id: reporte.servicio.usuario_id,
            titulo: '🚫 Suspensión de 30 días',
            mensaje: `Tu servicio "${reporte.servicio.nombre}" ha sido suspendido por 30 días. ${motivo || 'Violación grave de políticas.'}`,
            tipo: 'suspension',
            leida: false
          });
          break;

        case 'eliminar':
          updateServicio = { estado: 'eliminado' };
          crearSuspension = true;
          tipoSuspension = 'permanente';
          accionTomada = 'Servicio eliminado permanentemente';
          await supabase.from('notificaciones').insert({
            usuario_id: reporte.servicio.usuario_id,
            titulo: '❌ Tu servicio ha sido eliminado',
            mensaje: `Tu servicio "${reporte.servicio.nombre}" ha sido eliminado permanentemente. ${motivo || 'Violación grave y reiterada de políticas.'}`,
            tipo: 'eliminacion',
            leida: false
          });
          break;

        case 'rechazar':
          nuevoEstadoReporte = 'rechazado';
          accionTomada = 'Reporte rechazado - No se encontró violación';
          
          const { data: reportesRestantes } = await supabase
            .from('reportes')
            .select('id')
            .eq('servicio_id', reporte.servicio_id)
            .eq('estado', 'pendiente')
            .neq('id', reporteId);
          
          if (reportesRestantes.length === 0 && reporte.servicio.oculto_por_reportes) {
            updateServicio = {
              oculto_por_reportes: false,
              fecha_ocultamiento: null,
              reportes_acumulados: 0
            };
            await supabase.from('notificaciones').insert({
              usuario_id: reporte.servicio.usuario_id,
              titulo: '✅ Tu servicio ha sido restaurado',
              mensaje: `Tras revisar los reportes, tu servicio "${reporte.servicio.nombre}" ha sido restaurado.`,
              tipo: 'info',
              leida: false
            });
          }
          break;

        default:
          throw new Error('Acción no válida');
      }

      if (Object.keys(updateServicio).length > 0) {
        const { error: errorServicio } = await supabase
          .from('servicios')
          .update(updateServicio)
          .eq('id', reporte.servicio_id);
        
        if (errorServicio) throw errorServicio;
      }

      if (crearSuspension) {
        const fechaFin = diasSuspension > 0 
          ? new Date(Date.now() + diasSuspension * 24 * 60 * 60 * 1000).toISOString()
          : null;

        const { data: { user } } = await supabase.auth.getUser();

        const { error: errorSuspension } = await supabase.from('suspensiones').insert({
          entidad: 'servicio',
          entidad_id: reporte.servicio_id,
          motivo: motivo || accionTomada,
          tipo_suspension: tipoSuspension,
          dias_suspension: diasSuspension || null,
          fecha_inicio: new Date().toISOString(),
          fecha_fin: fechaFin,
          activa: true,
          creado_por: user?.id
        });

        if (errorSuspension) throw errorSuspension;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { error: errorReporte } = await supabase
        .from('reportes')
        .update({
          estado: nuevoEstadoReporte,
          fecha_resolucion: new Date().toISOString(),
          accion_tomada: accionTomada,
          revisado_por: user?.id
        })
        .eq('id', reporteId);

      if (errorReporte) throw errorReporte;

      await supabase.from('historial_moderacion').insert({
        moderador_id: user.id,
        accion: accionTomada,
        entidad_tipo: 'servicio',
        entidad_id: reporte.servicio_id,
        detalles: `Reporte #${reporteId.slice(0, 8)} - ${motivo || 'Sin detalles adicionales'}`
      });

      alert('✅ Acción completada exitosamente');
      await cargarReportes();
      setReporteSeleccionado(null);

    } catch (err) {
      alert('❌ Error al procesar la acción: ' + err.message);
    } finally {
      setProcesando(false);
    }
  };

  const restaurarServicio = async (servicioId, servicioNombre, usuarioId) => {
    if (!window.confirm('¿Restaurar este servicio y resolver todos sus reportes pendientes?')) {
      return;
    }

    try {
      await supabase
        .from('servicios')
        .update({
          estado: 'activo',
          oculto_por_reportes: false,
          fecha_ocultamiento: null,
          reportes_acumulados: 0
        })
        .eq('id', servicioId);

      await supabase
        .from('reportes')
        .update({
          estado: 'rechazado',
          accion_tomada: 'Servicio restaurado - Reportes desestimados',
          fecha_resolucion: new Date().toISOString()
        })
        .eq('servicio_id', servicioId)
        .in('estado', ['pendiente', 'revisando']);

      await supabase
        .from('suspensiones')
        .update({ activa: false })
        .eq('entidad', 'servicio')
        .eq('entidad_id', servicioId)
        .eq('activa', true);

      await supabase.from('notificaciones').insert({
        usuario_id: usuarioId,
        titulo: '✅ Tu servicio ha sido restaurado',
        mensaje: `Tu servicio "${servicioNombre}" ha sido completamente restaurado y todos los reportes han sido desestimados.`,
        tipo: 'info',
        leida: false
      });

      alert('✅ Servicio restaurado correctamente');
      await cargarReportes();
    } catch (err) {
      alert('❌ Error al restaurar el servicio');
    }
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      pendiente: { color: '#ff9800', icon: FiClock, texto: 'Pendiente' },
      revisando: { color: '#2196f3', icon: FiEye, texto: 'En revisión' },
      resuelto: { color: '#4caf50', icon: FiCheck, texto: 'Resuelto' },
      rechazado: { color: '#f44336', icon: FiX, texto: 'Rechazado' }
    };
    const badge = badges[estado] || badges.pendiente;
    const Icon = badge.icon;
    return (
      <span className="rpa-estado-badge" style={{ backgroundColor: badge.color }}>
        <Icon size={14} />
        {badge.texto}
      </span>
    );
  };

  const getPrioridadBadge = (prioridad) => {
    const colores = {
      urgente: '#d32f2f',
      alta: '#f57c00',
      media: '#fbc02d',
      baja: '#7cb342'
    };
    return (
      <span 
        className="rpa-prioridad-badge" 
        style={{ backgroundColor: colores[prioridad] || colores.baja }}
      >
        {prioridad?.toUpperCase() || 'BAJA'}
      </span>
    );
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const obtenerEtiquetaCategoria = (categoria) => {
    const etiquetas = {
      spam: 'Spam',
      informacion_falsa: 'Información falsa',
      negocio_cerrado: 'Negocio cerrado',
      suplantacion: 'Suplantación',
      contenido_inapropiado: 'Contenido inapropiado',
      abuso_precio: 'Abuso de precio',
      ilegal: 'Actividad ilegal',
      ofensivo: 'Contenido ofensivo',
      acoso: 'Acoso',
      irrelevante: 'Irrelevante',
      otro: 'Otro'
    };
    return etiquetas[categoria] || categoria;
  };

 if (loading) {
    return <Loading message="Cargando reportes..." />;
  }

  return (
    <div className="rpa-container">
      <div className="rpa-header">
        <h1>
          <FiAlertCircle size={28} />
          Gestión de Reportes
        </h1>
        <div className="rpa-stats">
          <div className="rpa-stat-card">
            <span className="rpa-stat-numero">
              {reportes.filter(r => r.estado === 'pendiente').length}
            </span>
            <span className="rpa-stat-label">Pendientes</span>
          </div>
          <div className="rpa-stat-card rpa-stat-urgente">
            <span className="rpa-stat-numero">
              {reportes.filter(r => r.prioridad === 'urgente').length}
            </span>
            <span className="rpa-stat-label">Urgentes</span>
          </div>
        </div>
      </div>

      <div className="rpa-filtros">
        <button
          className={filtro === 'pendiente' ? 'rpa-filtro-activo' : ''}
          onClick={() => setFiltro('pendiente')}
        >
          Pendientes
        </button>
        <button
          className={filtro === 'revisando' ? 'rpa-filtro-activo' : ''}
          onClick={() => setFiltro('revisando')}
        >
          En revisión
        </button>
        <button
          className={filtro === 'resuelto' ? 'rpa-filtro-activo' : ''}
          onClick={() => setFiltro('resuelto')}
        >
          Resueltos
        </button>
        <button
          className={filtro === 'todos' ? 'rpa-filtro-activo' : ''}
          onClick={() => setFiltro('todos')}
        >
          Todos
        </button>
      </div>

      <div className="rpa-lista">
        {reportes.length === 0 ? (
          <div className="rpa-vacio">
            <FiAlertCircle size={48} color="#ccc" />
            <p>No hay reportes {filtro !== 'todos' && `en estado "${filtro}"`}</p>
          </div>
        ) : (
          reportes.map((reporte) => (
            <div key={reporte.id} className="rpa-card">
              <div className="rpa-card-header">
                <div className="rpa-info-principal">
                  {getPrioridadBadge(reporte.prioridad)}
                  {getEstadoBadge(reporte.estado)}
                  {reporte.servicio?.oculto_por_reportes && (
                    <span className="rpa-badge-oculto">
                      <FiEyeOff size={14} /> Oculto
                    </span>
                  )}
                  {reporte.servicio?.estado === 'suspendido' && (
                    <span className="rpa-badge-suspendido">
                      <FiShield size={14} /> Suspendido
                    </span>
                  )}
                </div>
                <span className="rpa-fecha">
                  {formatearFecha(reporte.fecha_creacion)}
                </span>
              </div>

              <div className="rpa-card-body">
                <div className="rpa-detalle">
                  <strong>Servicio:</strong> {reporte.servicio?.nombre || 'N/A'}
                  {reporte.servicio?.reportes_acumulados > 0 && (
                    <span className="rpa-contador-reportes">
                      ({reporte.servicio.reportes_acumulados} reportes totales)
                    </span>
                  )}
                </div>
                <div className="rpa-detalle">
                  <strong>Categoría:</strong> {obtenerEtiquetaCategoria(reporte.categoria)}
                </div>
                {reporte.descripcion && (
                  <div className="rpa-descripcion">
                    <strong>Descripción:</strong>
                    <p>{reporte.descripcion}</p>
                  </div>
                )}
              </div>

              <div className="rpa-card-footer">
                <button
                  className="rpa-btn-ver-detalle"
                  onClick={() => setReporteSeleccionado(reporte)}
                >
                  <FiEye size={16} />
                  Ver detalle
                </button>

                {reporte.estado === 'pendiente' && (
                  <>
                    <button
                      className="rpa-btn-accion rpa-revision"
                      onClick={() => marcarComoRevisando(reporte.id)}
                      disabled={procesando}
                      title="Marcar como en revisión"
                    >
                      <FiClock size={16} />
                      En revisión
                    </button>
                    <button
                      className="rpa-btn-accion rpa-advertir"
                      onClick={() => tomarAccion(reporte.id, 'advertir')}
                      disabled={procesando}
                    >
                      ⚠️ Advertir
                    </button>
                    <button
                      className="rpa-btn-accion rpa-ocultar"
                      onClick={() => tomarAccion(reporte.id, 'ocultar')}
                      disabled={procesando}
                    >
                      <FiEyeOff size={16} />
                      Ocultar
                    </button>
                    <button
                      className="rpa-btn-accion rpa-suspender"
                      onClick={() => tomarAccion(reporte.id, 'suspender_7')}
                      disabled={procesando}
                    >
                      🚫 Suspender 7d
                    </button>
                    <button
                      className="rpa-btn-accion rpa-rechazar"
                      onClick={() => tomarAccion(reporte.id, 'rechazar')}
                      disabled={procesando}
                    >
                      <FiX size={16} />
                      Rechazar
                    </button>
                  </>
                )}

                {(reporte.servicio?.estado === 'suspendido' || reporte.servicio?.oculto_por_reportes) && (
                  <button
                    className="rpa-btn-accion rpa-restaurar"
                    onClick={() => restaurarServicio(
                      reporte.servicio_id, 
                      reporte.servicio.nombre,
                      reporte.servicio.usuario_id
                    )}
                    disabled={procesando}
                  >
                    ✅ Restaurar servicio
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {reporteSeleccionado && (
        <div className="rpa-modal-overlay" onClick={() => setReporteSeleccionado(null)}>
          <div className="rpa-modal-detalle" onClick={(e) => e.stopPropagation()}>
            <button className="rpa-modal-cerrar" onClick={() => setReporteSeleccionado(null)}>
              <FiX size={24} />
            </button>

            <h2>Detalle del Reporte</h2>

            <div className="rpa-detalle-seccion">
              <h3>Información General</h3>
              <div className="rpa-detalle-grid">
                <div className="rpa-detalle-item">
                  <label>ID del Reporte:</label>
                  <span style={{ fontSize: '0.85em', wordBreak: 'break-all' }}>
                    {reporteSeleccionado.id}
                  </span>
                </div>
                <div className="rpa-detalle-item">
                  <label>Fecha:</label>
                  <span>{formatearFecha(reporteSeleccionado.fecha_creacion)}</span>
                </div>
                <div className="rpa-detalle-item">
                  <label>Estado:</label>
                  {getEstadoBadge(reporteSeleccionado.estado)}
                </div>
                <div className="rpa-detalle-item">
                  <label>Prioridad:</label>
                  {getPrioridadBadge(reporteSeleccionado.prioridad)}
                </div>
              </div>
            </div>

            <div className="rpa-detalle-seccion">
              <h3>Contenido Reportado</h3>
              <div className="rpa-detalle-grid">
                <div className="rpa-detalle-item">
                  <label>Tipo:</label>
                  <span>{reporteSeleccionado.tipo_contenido === 'servicio' ? 'Servicio' : 'Comentario'}</span>
                </div>
                <div className="rpa-detalle-item">
                  <label>Servicio:</label>
                  <span>{reporteSeleccionado.servicio?.nombre || 'N/A'}</span>
                </div>
                <div className="rpa-detalle-item">
                  <label>Estado del servicio:</label>
                  <span>
                    {reporteSeleccionado.servicio?.estado || 'N/A'}
                    {reporteSeleccionado.servicio?.oculto_por_reportes && ' (Oculto)'}
                  </span>
                </div>
                <div className="rpa-detalle-item">
                  <label>Reportes acumulados:</label>
                  <span>{reporteSeleccionado.servicio?.reportes_acumulados || 0}</span>
                </div>
                <div className="rpa-detalle-item">
                  <label>Categoría:</label>
                  <span>{obtenerEtiquetaCategoria(reporteSeleccionado.categoria)}</span>
                </div>
              </div>
            </div>

            {reporteSeleccionado.descripcion && (
              <div className="rpa-detalle-seccion">
                <h3>Descripción del Reporte</h3>
                <p className="rpa-detalle-texto">{reporteSeleccionado.descripcion}</p>
              </div>
            )}

            <div className="rpa-detalle-seccion">
              <h3>Reportante</h3>
              <div className="rpa-detalle-grid">
                <div className="rpa-detalle-item">
                  <label>Nombre:</label>
                  <span>
                    {reporteSeleccionado.reportante ? 
                      `${reporteSeleccionado.reportante.nombre} ${reporteSeleccionado.reportante.apellido}` 
                      : 
                      'Usuario Anónimo'
                    }
                  </span>
                </div>
                {reporteSeleccionado.reportante?.email && (
                  <div className="rpa-detalle-item">
                    <label>Email:</label>
                    <span>{reporteSeleccionado.reportante.email}</span>
                  </div>
                )}
              </div>
            </div>

            {reporteSeleccionado.accion_tomada && (
              <div className="rpa-detalle-seccion">
                <h3>Acción Tomada</h3>
                <p className="rpa-detalle-texto">{reporteSeleccionado.accion_tomada}</p>
                {reporteSeleccionado.fecha_resolucion && (
                  <p className="rpa-fecha-resolucion">
                    Resuelta el: {formatearFecha(reporteSeleccionado.fecha_resolucion)}
                  </p>
                )}
              </div>
            )}

            <div className="rpa-modal-acciones-completas">
              <h3>Acciones Disponibles</h3>
              <div className="rpa-acciones-grid">
                <button
                  className="rpa-btn-modal-accion rpa-advertir"
                  onClick={() => tomarAccion(reporteSeleccionado.id, 'advertir')}
                  disabled={procesando || reporteSeleccionado.estado !== 'pendiente'}
                >
                  ⚠️ Advertir al dueño
                </button>
                <button
                  className="rpa-btn-modal-accion rpa-ocultar"
                  onClick={() => tomarAccion(reporteSeleccionado.id, 'ocultar')}
                  disabled={procesando || reporteSeleccionado.estado !== 'pendiente'}
                >
                  <FiEyeOff /> Ocultar servicio
                </button>
                <button
                  className="rpa-btn-modal-accion rpa-suspender"
                  onClick={() => tomarAccion(reporteSeleccionado.id, 'suspender_7')}
                  disabled={procesando || reporteSeleccionado.estado !== 'pendiente'}
                >
                  🚫 Suspender 7 días
                </button>
                <button
                  className="rpa-btn-modal-accion rpa-suspender-30"
                  onClick={() => tomarAccion(reporteSeleccionado.id, 'suspender_30')}
                  disabled={procesando || reporteSeleccionado.estado !== 'pendiente'}
                >
                  🚫 Suspender 30 días
                </button>
                <button
                  className="rpa-btn-modal-accion rpa-eliminar"
                  onClick={() => tomarAccion(reporteSeleccionado.id, 'eliminar')}
                  disabled={procesando || reporteSeleccionado.estado !== 'pendiente'}
                >
                  <FiTrash2 /> Eliminar permanente
                </button>
                <button
                  className="rpa-btn-modal-accion rpa-rechazar"
                  onClick={() => tomarAccion(reporteSeleccionado.id, 'rechazar')}
                  disabled={procesando}
                >
                  <FiX /> Rechazar reporte
                </button>
              </div>

              {(reporteSeleccionado.servicio?.estado === 'suspendido' || 
                reporteSeleccionado.servicio?.oculto_por_reportes) && (
                <button
                  className="rpa-btn-modal-accion rpa-restaurar-full"
                  onClick={() => {
                    setReporteSeleccionado(null);
                    restaurarServicio(
                      reporteSeleccionado.servicio_id,
                      reporteSeleccionado.servicio.nombre,
                      reporteSeleccionado.servicio.usuario_id
                    );
                  }}
                  disabled={procesando}
                >
                  ✅ Restaurar Servicio Completamente
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportesAdmin;