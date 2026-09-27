import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import './AsistenteAdmin.css';
import Loading from '../../loading/Loading';

const AsistenteAdmin = () => {
  const [pestania, setPestania] = useState('conocimiento'); // 'conocimiento' | 'sin-respuesta' | 'calidad'
  const [loading, setLoading] = useState(true);
  const [conocimiento, setConocimiento] = useState([]);
  const [preguntasSinRespuesta, setPreguntasSinRespuesta] = useState([]);
  const [valoraciones, setValoraciones] = useState([]);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const [modalAbierto, setModalAbierto] = useState(false);
  const [itemEditando, setItemEditando] = useState(null); // null = nuevo
  const [formTitulo, setFormTitulo] = useState('');
  const [formContenido, setFormContenido] = useState('');
  const [formOrden, setFormOrden] = useState(0);
  const [guardando, setGuardando] = useState(false);

  const [filtroEstadoPreguntas, setFiltroEstadoPreguntas] = useState('pendiente');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      await Promise.all([cargarConocimiento(), cargarPreguntasSinRespuesta(), cargarValoraciones()]);
    } finally {
      setLoading(false);
    }
  };

  const cargarConocimiento = async () => {
    try {
      const { data, error } = await supabase
        .from('asistente_conocimiento')
        .select('*')
        .order('orden', { ascending: true });
      if (error) throw error;
      setConocimiento(data || []);
    } catch (error) {
      console.error('Error al cargar conocimiento del asistente:', error);
      mostrarMensaje('error', 'Error al cargar el conocimiento del asistente');
    }
  };

  const cargarPreguntasSinRespuesta = async () => {
    try {
      const { data, error } = await supabase
        .from('asistente_preguntas_sin_respuesta')
        .select('*')
        .order('creado_en', { ascending: false });
      if (error) throw error;
      setPreguntasSinRespuesta(data || []);
    } catch (error) {
      console.error('Error al cargar preguntas sin respuesta:', error);
      mostrarMensaje('error', 'Error al cargar las preguntas sin respuesta');
    }
  };

  const cargarValoraciones = async () => {
    try {
      const { data, error } = await supabase
        .from('asistente_valoraciones')
        .select('*')
        .order('creado_en', { ascending: false })
        .limit(100);
      if (error) throw error;
      setValoraciones(data || []);
    } catch (error) {
      console.error('Error al cargar valoraciones:', error);
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  const abrirModalNuevo = () => {
    setItemEditando(null);
    setFormTitulo('');
    setFormContenido('');
    setFormOrden(conocimiento.length > 0 ? Math.max(...conocimiento.map(c => c.orden)) + 10 : 10);
    setModalAbierto(true);
  };

  const abrirModalEditar = (item) => {
    setItemEditando(item);
    setFormTitulo(item.titulo);
    setFormContenido(item.contenido);
    setFormOrden(item.orden);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setItemEditando(null);
  };

  const guardarConocimiento = async () => {
    if (!formTitulo.trim() || !formContenido.trim()) {
      mostrarMensaje('error', 'Completá el título y el contenido');
      return;
    }
    setGuardando(true);
    try {
      if (itemEditando) {
        const { error } = await supabase
          .from('asistente_conocimiento')
          .update({
            titulo: formTitulo.trim(),
            contenido: formContenido.trim(),
            orden: Number(formOrden) || 0,
            actualizado_en: new Date().toISOString()
          })
          .eq('id', itemEditando.id);
        if (error) throw error;
        mostrarMensaje('success', 'Información actualizada');
      } else {
        const { error } = await supabase
          .from('asistente_conocimiento')
          .insert({
            titulo: formTitulo.trim(),
            contenido: formContenido.trim(),
            orden: Number(formOrden) || 0
          });
        if (error) throw error;
        mostrarMensaje('success', 'Información agregada al asistente');
      }
      cerrarModal();
      cargarConocimiento();
    } catch (error) {
      console.error('Error al guardar conocimiento:', error);
      mostrarMensaje('error', 'No se pudo guardar. Intentá de nuevo');
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (item) => {
    try {
      const { error } = await supabase
        .from('asistente_conocimiento')
        .update({ activo: !item.activo, actualizado_en: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;
      cargarConocimiento();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      mostrarMensaje('error', 'No se pudo cambiar el estado');
    }
  };

  const eliminarConocimiento = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.titulo}" del conocimiento del asistente?`)) return;
    try {
      const { error } = await supabase
        .from('asistente_conocimiento')
        .delete()
        .eq('id', item.id);
      if (error) throw error;
      mostrarMensaje('success', 'Eliminado');
      cargarConocimiento();
    } catch (error) {
      console.error('Error al eliminar:', error);
      mostrarMensaje('error', 'No se pudo eliminar');
    }
  };

  const marcarResuelta = async (pregunta) => {
    try {
      const { error } = await supabase
        .from('asistente_preguntas_sin_respuesta')
        .update({ estado: 'resuelta' })
        .eq('id', pregunta.id);
      if (error) throw error;
      cargarPreguntasSinRespuesta();
    } catch (error) {
      console.error('Error al marcar como resuelta:', error);
      mostrarMensaje('error', 'No se pudo actualizar');
    }
  };

  const eliminarPregunta = async (pregunta) => {
    if (!window.confirm('¿Eliminar esta pregunta de la lista?')) return;
    try {
      const { error } = await supabase
        .from('asistente_preguntas_sin_respuesta')
        .delete()
        .eq('id', pregunta.id);
      if (error) throw error;
      cargarPreguntasSinRespuesta();
    } catch (error) {
      console.error('Error al eliminar pregunta:', error);
      mostrarMensaje('error', 'No se pudo eliminar');
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-AR', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const preguntasFiltradas = preguntasSinRespuesta.filter(p =>
    filtroEstadoPreguntas === 'todas' || p.estado === filtroEstadoPreguntas
  );

  const pendientesCount = preguntasSinRespuesta.filter(p => p.estado === 'pendiente').length;

  if (loading) {
    return <Loading message="Cargando el asistente..." />;
  }

  return (
    <div className="asistente-admin-container">
      <div className="admin-content-header">
        <div className="header-left">
          <h1 className="admin-page-title">
            <span className="material-icons title-icon">smart_toy</span>
            Asistente IA
          </h1>
          <p className="admin-page-subtitle">
            Administrá lo que sabe el asistente y revisá qué preguntas no pudo responder
          </p>
        </div>
        <button className="b-btn-refresh" onClick={cargarDatos} disabled={loading}>
          <span className="material-icons">refresh</span>
          Actualizar
        </button>
      </div>

      {mensaje.texto && (
        <div className={`admin-alert admin-alert-${mensaje.tipo}`}>
          <span className="material-icons">{mensaje.tipo === 'success' ? 'check_circle' : 'error'}</span>
          <span>{mensaje.texto}</span>
        </div>
      )}

      <div className="asistenteAdmin-tabs">
        <button
          className={`asistenteAdmin-tab ${pestania === 'conocimiento' ? 'activa' : ''}`}
          onClick={() => setPestania('conocimiento')}
        >
          <span className="material-icons">menu_book</span>
          Conocimiento
        </button>
        <button
          className={`asistenteAdmin-tab ${pestania === 'sin-respuesta' ? 'activa' : ''}`}
          onClick={() => setPestania('sin-respuesta')}
        >
          <span className="material-icons">help_outline</span>
          Preguntas sin respuesta
          {pendientesCount > 0 && <span className="asistenteAdmin-tab-badge">{pendientesCount}</span>}
        </button>
        <button
          className={`asistenteAdmin-tab ${pestania === 'calidad' ? 'activa' : ''}`}
          onClick={() => setPestania('calidad')}
        >
          <span className="material-icons">star</span>
          Calidad
        </button>
      </div>

      {pestania === 'conocimiento' && (
        <div className="asistenteAdmin-panel">
          <div className="asistenteAdmin-panel-header">
            <p className="asistenteAdmin-panel-desc">
              Esto se suma automáticamente a lo que ya sabe el asistente. Usalo para cargar funciones nuevas,
              aclaraciones o cualquier dato que quieras que conozca. Solo se usa lo que está marcado como activo.
            </p>
            <button className="b-btn-primario" onClick={abrirModalNuevo}>
              <span className="material-icons">add</span>
              Agregar información
            </button>
          </div>

          {conocimiento.length === 0 ? (
            <div className="admin-empty-state">
              <span className="material-icons">menu_book</span>
              <p>Todavía no agregaste conocimiento extra. El asistente usa la base que ya tiene cargada.</p>
            </div>
          ) : (
            <div className="asistenteAdmin-lista">
              {conocimiento.map(item => (
                <div key={item.id} className={`asistenteAdmin-card ${!item.activo ? 'inactiva' : ''}`}>
                  <div className="asistenteAdmin-card-header">
                    <h3>{item.titulo}</h3>
                    <div className="asistenteAdmin-card-acciones">
                      <button
                        className={`asistenteAdmin-btn-toggle ${item.activo ? 'on' : 'off'}`}
                        onClick={() => toggleActivo(item)}
                        title={item.activo ? 'Desactivar' : 'Activar'}
                      >
                        <span className="material-icons">{item.activo ? 'toggle_on' : 'toggle_off'}</span>
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </button>
                      <button className="asistenteAdmin-btn-icono" onClick={() => abrirModalEditar(item)} title="Editar">
                        <span className="material-icons">edit</span>
                      </button>
                      <button className="asistenteAdmin-btn-icono peligro" onClick={() => eliminarConocimiento(item)} title="Eliminar">
                        <span className="material-icons">delete</span>
                      </button>
                    </div>
                  </div>
                  <p className="asistenteAdmin-card-contenido">{item.contenido}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {pestania === 'sin-respuesta' && (
        <div className="asistenteAdmin-panel">
          <div className="asistenteAdmin-panel-header">
            <p className="asistenteAdmin-panel-desc">
              Acá aparecen las preguntas que el asistente no supo responder y mandó al usuario a WhatsApp.
              Revisalas y agregá la información que falte desde la pestaña Conocimiento.
            </p>
            <select
              value={filtroEstadoPreguntas}
              onChange={(e) => setFiltroEstadoPreguntas(e.target.value)}
              className="filter-select"
            >
              <option value="pendiente">Pendientes</option>
              <option value="resuelta">Resueltas</option>
              <option value="todas">Todas</option>
            </select>
          </div>

          {preguntasFiltradas.length === 0 ? (
            <div className="admin-empty-state">
              <span className="material-icons">check_circle</span>
              <p>No hay preguntas para mostrar acá.</p>
            </div>
          ) : (
            <div className="asistenteAdmin-lista">
              {preguntasFiltradas.map(pregunta => (
                <div key={pregunta.id} className="asistenteAdmin-pregunta-card">
                  <div className="asistenteAdmin-pregunta-header">
                    <span className={`estado-badge ${pregunta.estado === 'pendiente' ? 'badge-warning' : 'badge-success'}`}>
                      <span className="material-icons">{pregunta.estado === 'pendiente' ? 'schedule' : 'check_circle'}</span>
                      {pregunta.estado === 'pendiente' ? 'Pendiente' : 'Resuelta'}
                    </span>
                    <span className="asistenteAdmin-pregunta-fecha">{formatearFecha(pregunta.creado_en)}</span>
                  </div>
                  <p className="asistenteAdmin-pregunta-texto">
                    <strong>Preguntó:</strong> {pregunta.pregunta}
                  </p>
                  {pregunta.respuesta_dada && (
                    <p className="asistenteAdmin-pregunta-respuesta">
                      <strong>El asistente respondió:</strong> {pregunta.respuesta_dada}
                    </p>
                  )}
                  <div className="asistenteAdmin-pregunta-acciones">
                    {pregunta.estado === 'pendiente' && (
                      <button className="b-btn-action b-btn-aprobar" onClick={() => marcarResuelta(pregunta)}>
                        <span className="material-icons">check_circle</span>
                        Marcar resuelta
                      </button>
                    )}
                    <button className="b-btn-action b-btn-eliminar" onClick={() => eliminarPregunta(pregunta)}>
                      <span className="material-icons">delete</span>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {pestania === 'calidad' && (
        <div className="asistenteAdmin-panel">
          <div className="asistenteAdmin-panel-header">
            <p className="asistenteAdmin-panel-desc">
              Cada respuesta del asistente tiene estrellas opcionales para calificarla (nunca se le pregunta
              al usuario por texto, así no molesta). Acá ves el promedio y las últimas calificaciones.
            </p>
          </div>

          {valoraciones.length === 0 ? (
            <div className="admin-empty-state">
              <span className="material-icons">star_outline</span>
              <p>Todavía no hay calificaciones de usuarios.</p>
            </div>
          ) : (
            <>
              <div className="asistenteAdmin-calidad-resumen">
                <div className="asistenteAdmin-calidad-promedio">
                  <span className="asistenteAdmin-calidad-numero">
                    {(valoraciones.reduce((acc, v) => acc + v.valoracion, 0) / valoraciones.length).toFixed(1)}
                  </span>
                  <span className="material-icons">star</span>
                  <span className="asistenteAdmin-calidad-total">({valoraciones.length} calificaciones)</span>
                </div>
                <div className="asistenteAdmin-calidad-barras">
                  {[5, 4, 3, 2, 1].map(n => {
                    const cantidad = valoraciones.filter(v => v.valoracion === n).length;
                    const porcentaje = valoraciones.length ? (cantidad / valoraciones.length) * 100 : 0;
                    return (
                      <div key={n} className="asistenteAdmin-calidad-fila">
                        <span>{n} <span className="material-icons">star</span></span>
                        <div className="asistenteAdmin-calidad-barra-fondo">
                          <div className="asistenteAdmin-calidad-barra-relleno" style={{ width: `${porcentaje}%` }} />
                        </div>
                        <span>{cantidad}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="asistenteAdmin-lista">
                {valoraciones.slice(0, 30).map(v => (
                  <div key={v.id} className="asistenteAdmin-pregunta-card">
                    <div className="asistenteAdmin-pregunta-header">
                      <span className="asistenteAdmin-calidad-estrellas">
                        {[1, 2, 3, 4, 5].map(n => (
                          <span key={n} className="material-icons" style={{ color: n <= v.valoracion ? '#ffb800' : '#e2e8f0', fontSize: '16px' }}>star</span>
                        ))}
                      </span>
                      <span className="asistenteAdmin-pregunta-fecha">{formatearFecha(v.creado_en)}</span>
                    </div>
                    {v.pregunta && <p className="asistenteAdmin-pregunta-texto"><strong>Preguntó:</strong> {v.pregunta}</p>}
                    {v.respuesta && <p className="asistenteAdmin-pregunta-respuesta">{v.respuesta}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {modalAbierto && (
        <div className="admin-modal-overlay" onClick={cerrarModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{itemEditando ? 'Editar información' : 'Agregar información'}</h3>
              <button className="b-btn-close-modal" onClick={cerrarModal}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="form-group-modal">
                <label>Título (breve, para identificarlo):</label>
                <input
                  type="text"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder="Ej: Descuentos por pago anual"
                  maxLength={120}
                />
              </div>
              <div className="form-group-modal">
                <label>Contenido (lo que el asistente va a poder responder):</label>
                <textarea
                  value={formContenido}
                  onChange={(e) => setFormContenido(e.target.value)}
                  placeholder="Escribí la información tal cual querés que la sepa el asistente..."
                  rows={6}
                />
              </div>
              <div className="form-group-modal">
                <label>Orden (menor número aparece primero, opcional):</label>
                <input
                  type="number"
                  value={formOrden}
                  onChange={(e) => setFormOrden(e.target.value)}
                />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="b-btn-modal b-btn-cancelar" onClick={cerrarModal} disabled={guardando}>
                Cancelar
              </button>
              <button className="b-btn-modal b-btn-confirmar-aprobar" onClick={guardarConocimiento} disabled={guardando}>
                {guardando ? (
                  <>
                    <span className="material-icons rotating">refresh</span>
                    Guardando...
                  </>
                ) : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AsistenteAdmin;
