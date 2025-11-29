import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import './ComentariosAdmin.css';
import Loading from '../../loading/Loading';

const ComentariosAdmin = () => {
  const [comentarios, setComentarios] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [comentarioSeleccionado, setComentarioSeleccionado] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [accion, setAccion] = useState(null);
  const [notas, setNotas] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    cargarDatos();
    suscribirseACambios();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      await Promise.all([
        cargarComentarios(),
        cargarEstadisticas()
      ]);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarComentarios = async () => {
    try {
      const { data, error } = await supabase
        .from('comentarios_proyecto')
        .select(`
          *,
          perfiles_usuarios!comentarios_proyecto_usuario_id_fkey (
            nombre,
            apellido,
            foto_url
          ),
          moderado:perfiles_usuarios!comentarios_proyecto_moderado_por_fkey (
            nombre,
            apellido
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComentarios(data || []);
    } catch (error) {
      console.error('Error al cargar comentarios:', error);
      mostrarMensaje('error', 'Error al cargar comentarios');
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const { data, error } = await supabase
        .from('estadisticas_comentarios')
        .select('*')
        .single();

      if (error) throw error;
      setEstadisticas(data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const suscribirseACambios = () => {
    const subscription = supabase
      .channel('comentarios_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comentarios_proyecto'
        },
        (payload) => {
          console.log('Cambio detectado:', payload);
          cargarDatos();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const abrirModalAccion = (comentario, tipoAccion) => {
    setComentarioSeleccionado(comentario);
    setAccion(tipoAccion);
    setNotas('');
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setComentarioSeleccionado(null);
    setAccion(null);
    setNotas('');
  };

  const ejecutarAccion = async () => {
    if (!comentarioSeleccionado) return;

    setProcesando(true);
    try {
      if (accion === 'aprobar') {
        const { data, error } = await supabase.rpc('aprobar_comentario', {
          p_comentario_id: comentarioSeleccionado.id,
          p_notas: notas || null
        });

        if (error) throw error;

        if (data.success) {
          mostrarMensaje('success', 'Comentario aprobado exitosamente');
          cargarDatos();
          cerrarModal();
        } else {
          throw new Error(data.error || 'Error al aprobar');
        }
      } else if (accion === 'rechazar') {
        if (!notas.trim()) {
          mostrarMensaje('error', 'Debes especificar un motivo');
          return;
        }

        const { data, error } = await supabase.rpc('rechazar_comentario', {
          p_comentario_id: comentarioSeleccionado.id,
          p_motivo: notas
        });

        if (error) throw error;

        if (data.success) {
          mostrarMensaje('success', 'Comentario rechazado');
          cargarDatos();
          cerrarModal();
        } else {
          throw new Error(data.error || 'Error al rechazar');
        }
      } else if (accion === 'eliminar') {
        const { error } = await supabase
          .from('comentarios_proyecto')
          .delete()
          .eq('id', comentarioSeleccionado.id);

        if (error) throw error;

        mostrarMensaje('success', 'Comentario eliminado');
        cargarDatos();
        cerrarModal();
      }
    } catch (error) {
      console.error('Error al ejecutar acción:', error);
      mostrarMensaje('error', error.message || 'Error al procesar la acción');
    } finally {
      setProcesando(false);
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  const comentariosFiltrados = comentarios.filter(c => {
    const cumpleFiltro = filtroEstado === 'todos' || c.estado === filtroEstado;
    const cumpleBusqueda = busqueda === '' || 
      c.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.comentario.toLowerCase().includes(busqueda.toLowerCase());
    return cumpleFiltro && cumpleBusqueda;
  });

  const renderEstrellas = (puntuacion) => {
    return [...Array(5)].map((_, i) => (
      <span
        key={i}
        className="material-icons estrella-admin"
        style={{ color: i < puntuacion ? '#FFB800' : '#e0e0e0' }}
      >
        star
      </span>
    ));
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      pendiente: { clase: 'badge-warning', texto: 'Pendiente', icono: 'schedule' },
      aprobado: { clase: 'badge-success', texto: 'Aprobado', icono: 'check_circle' },
      rechazado: { clase: 'badge-danger', texto: 'Rechazado', icono: 'cancel' }
    };
    return badges[estado] || badges.pendiente;
  };

  if (loading) {
  return <Loading message="Cargando comentarios..." />;
}

  return (
    <div className="comentarios-admin-container">
      {/* Header */}
      <div className="admin-content-header">
        <div className="header-left">
          <h1 className="admin-page-title">
            <span className="material-icons title-icon">forum</span>
            Moderación de Comentarios
          </h1>
          <p className="admin-page-subtitle">
            Gestiona las opiniones sobre GoyaNova
          </p>
        </div>
        <button 
          className="b-btn-refresh"
          onClick={cargarDatos}
          disabled={loading}
        >
          <span className="material-icons">refresh</span>
          Actualizar
        </button>
      </div>

      {/* Mensaje de feedback */}
      {mensaje.texto && (
        <div className={`admin-alert admin-alert-${mensaje.tipo}`}>
          <span className="material-icons">
            {mensaje.tipo === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* Estadísticas */}
      {estadisticas && (
        <div className="stats-grid">
          <div className="stat-card-admin">
            <div className="stat-card-header">
              <span className="material-icons stat-card-icon">comment</span>
              <span className="stat-card-value">{estadisticas.total_comentarios}</span>
            </div>
            <span className="stat-card-label">Total Comentarios</span>
          </div>

          <div className="stat-card-admin stat-warning">
            <div className="stat-card-header">
              <span className="material-icons stat-card-icon">schedule</span>
              <span className="stat-card-value">{estadisticas.pendientes}</span>
            </div>
            <span className="stat-card-label">Pendientes</span>
          </div>

          <div className="stat-card-admin stat-success">
            <div className="stat-card-header">
              <span className="material-icons stat-card-icon">check_circle</span>
              <span className="stat-card-value">{estadisticas.aprobados}</span>
            </div>
            <span className="stat-card-label">Aprobados</span>
          </div>

          <div className="stat-card-admin stat-danger">
            <div className="stat-card-header">
              <span className="material-icons stat-card-icon">cancel</span>
              <span className="stat-card-value">{estadisticas.rechazados}</span>
            </div>
            <span className="stat-card-label">Rechazados</span>
          </div>

          <div className="stat-card-admin stat-info">
            <div className="stat-card-header">
              <span className="material-icons stat-card-icon">star</span>
              <span className="stat-card-value">{estadisticas.puntuacion_promedio}</span>
            </div>
            <span className="stat-card-label">Promedio</span>
          </div>

          <div className="stat-card-admin stat-primary">
            <div className="stat-card-header">
              <span className="material-icons stat-card-icon">flag</span>
              <span className="stat-card-value">{estadisticas.reportados}</span>
            </div>
            <span className="stat-card-label">Reportados</span>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="admin-filters">
        <div className="filter-group">
          <label>
            <span className="material-icons">filter_list</span>
            Estado:
          </label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="filter-select"
          >
            <option value="todos">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="aprobado">Aprobados</option>
            <option value="rechazado">Rechazados</option>
          </select>
        </div>

        <div className="filter-group">
          <label>
            <span className="material-icons">search</span>
            Buscar:
          </label>
          <input
            type="text"
            placeholder="Buscar por nombre o comentario..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="filter-input"
          />
        </div>
      </div>

      {/* Lista de comentarios */}
      <div className="comentarios-admin-lista">
        {comentariosFiltrados.length === 0 ? (
          <div className="admin-empty-state">
            <span className="material-icons">chat_bubble_outline</span>
            <p>No hay comentarios que mostrar</p>
          </div>
        ) : (
          comentariosFiltrados.map(comentario => {
            const badge = getEstadoBadge(comentario.estado);
            
            return (
              <div key={comentario.id} className="comentario-admin-card">
                <div className="comentario-admin-header">
                  <div className="usuario-info-admin">
                    {comentario.perfiles_usuarios?.foto_url ? (
                      <img
                        src={comentario.perfiles_usuarios.foto_url}
                        alt={comentario.nombre_completo}
                        className="usuario-avatar-admin"
                      />
                    ) : (
                      <div className="usuario-avatar-placeholder-admin">
                        <span className="material-icons">person</span>
                      </div>
                    )}
                    <div className="usuario-detalles-admin">
                      <h4>{comentario.nombre_completo}</h4>
                      <span className="fecha-admin">
                        {formatearFecha(comentario.created_at)}
                      </span>
                      {comentario.email && (
                        <span className="email-admin">{comentario.email}</span>
                      )}
                    </div>
                  </div>

                  <div className="comentario-meta-admin">
                    <span className={`estado-badge ${badge.clase}`}>
                      <span className="material-icons">{badge.icono}</span>
                      {badge.texto}
                    </span>
                    {comentario.reportado && (
                      <span className="badge-reportado">
                        <span className="material-icons">flag</span>
                        {comentario.reportes_count} reportes
                      </span>
                    )}
                  </div>
                </div>

                <div className="comentario-body-admin">
                  <div className="puntuacion-admin">
                    {renderEstrellas(comentario.puntuacion)}
                  </div>
                  <p className="comentario-texto-admin">{comentario.comentario}</p>

                  {comentario.notas_moderacion && (
                    <div className="notas-moderacion">
                      <span className="material-icons">note</span>
                      <div>
                        <strong>Notas del moderador:</strong>
                        <p>{comentario.notas_moderacion}</p>
                        {comentario.moderado && (
                          <small>
                            Por: {comentario.moderado.nombre} {comentario.moderado.apellido}
                            {' - '}
                            {formatearFecha(comentario.fecha_moderacion)}
                          </small>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="comentario-actions-admin">
                  {comentario.estado === 'pendiente' && (
                    <>
                      <button
                        className="b-btn-action b-btn-aprobar"
                        onClick={() => abrirModalAccion(comentario, 'aprobar')}
                      >
                        <span className="material-icons">check_circle</span>
                        Aprobar
                      </button>
                      <button
                        className="b-btn-action b-btn-rechazar"
                        onClick={() => abrirModalAccion(comentario, 'rechazar')}
                      >
                        <span className="material-icons">cancel</span>
                        Rechazar
                      </button>
                    </>
                  )}
                  <button
                    className="b-btn-action b-btn-eliminar"
                    onClick={() => abrirModalAccion(comentario, 'eliminar')}
                  >
                    <span className="material-icons">delete</span>
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de confirmación */}
      {modalAbierto && (
        <div className="admin-modal-overlay" onClick={cerrarModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>
                {accion === 'aprobar' && 'Aprobar Comentario'}
                {accion === 'rechazar' && 'Rechazar Comentario'}
                {accion === 'eliminar' && 'Eliminar Comentario'}
              </h3>
              <button className="b-btn-close-modal" onClick={cerrarModal}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="admin-modal-body">
              {comentarioSeleccionado && (
                <div className="comentario-preview">
                  <p><strong>De:</strong> {comentarioSeleccionado.nombre_completo}</p>
                  <p><strong>Comentario:</strong></p>
                  <p className="comentario-texto-preview">{comentarioSeleccionado.comentario}</p>
                </div>
              )}

              {accion === 'rechazar' && (
                <div className="form-group-modal">
                  <label>Motivo del rechazo (obligatorio):</label>
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Explica por qué se rechaza este comentario..."
                    rows={4}
                    required
                  />
                </div>
              )}

              {accion === 'aprobar' && (
                <div className="form-group-modal">
                  <label>Notas (opcional):</label>
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Agrega notas si lo deseas..."
                    rows={3}
                  />
                </div>
              )}

              {accion === 'eliminar' && (
                <div className="alert-warning">
                  <span className="material-icons">warning</span>
                  <p>Esta acción no se puede deshacer. El comentario será eliminado permanentemente.</p>
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                className="b-btn-modal b-btn-cancelar"
                onClick={cerrarModal}
                disabled={procesando}
              >
                Cancelar
              </button>
              <button
                className={`b-btn-modal ${
                  accion === 'aprobar' ? 'b-btn-confirmar-aprobar' :
                  accion === 'rechazar' ? 'b-btn-confirmar-rechazar' :
                  'b-btn-confirmar-eliminar'
                }`}
                onClick={ejecutarAccion}
                disabled={procesando || (accion === 'rechazar' && !notas.trim())}
              >
                {procesando ? (
                  <>
                    <span className="material-icons rotating">refresh</span>
                    Procesando...
                  </>
                ) : (
                  <>
                    {accion === 'aprobar' && 'Aprobar'}
                    {accion === 'rechazar' && 'Rechazar'}
                    {accion === 'eliminar' && 'Eliminar'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComentariosAdmin;