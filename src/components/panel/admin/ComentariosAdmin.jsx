import React, { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../../../utils/supabaseClient';
import './ComentariosAdmin.css';
import Loading from '../../loading/Loading';

const LINK_RESENA_GOYANOVA = 'https://goyanova.com.ar/resena-goyanova';

const MAX_RESPUESTA = 600;

// Respuestas rápidas: se tocan, se cargan en el cuadro (se pueden retocar) y se confirma.
// {nombre} se reemplaza por el primer nombre de quien comentó. Editá el texto acá libremente.
const RESPUESTAS_RAPIDAS = [
  { id: 'gracias', label: 'Gracias', icono: 'favorite', texto: '¡Gracias por tu comentario, {nombre}! Nos alegra mucho que te guste GoyaNova. 💙' },
  { id: 'info', label: 'Más info', icono: 'info', texto: '¡Hola {nombre}! Gracias por escribirnos. Te vamos a contactar a la brevedad con toda la información. También podés escribirnos por WhatsApp desde la sección Contacto.' },
  { id: 'publicar', label: 'Publicar servicio', icono: 'storefront', texto: '¡Hola {nombre}! Publicar tu servicio o comercio en GoyaNova es gratis: registrate, tocá "Publicar" y completá los pasos. Si necesitás ayuda, escribinos.' },
  { id: 'sugerencia', label: 'Sugerencia', icono: 'lightbulb', texto: '¡Gracias por tu sugerencia, {nombre}! La tomamos en cuenta para seguir mejorando GoyaNova.' },
  { id: 'disculpas', label: 'Disculpas', icono: 'sentiment_dissatisfied', texto: 'Lamentamos lo que te pasó, {nombre}. Escribinos por Contacto o WhatsApp así lo resolvemos lo antes posible.' },
  { id: 'bienvenida', label: 'Bienvenido/a', icono: 'waving_hand', texto: '¡Bienvenido/a a GoyaNova, {nombre}! Cualquier duda que tengas, estamos para ayudarte.' },
];

const primerNombre = (nombreCompleto = '') => nombreCompleto.trim().split(/\s+/)[0] || '';

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
  const [copiadoResena, setCopiadoResena] = useState(false);
  const qrResenaRef = useRef(null);

  useEffect(() => {
    cargarDatos();
    // Antes el cleanup se devolvía desde suscribirseACambios (nadie lo usaba), así
    // que el canal quedaba vivo al cambiar de sección y al volver explotaba.
    const cancelar = suscribirseACambios();
    return cancelar;
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
    // Nombre único por montaje: evita reusar un canal ya suscripto
    const canal = supabase
      .channel(`comentarios_changes_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comentarios_proyecto'
        },
        (payload) => {
          // console.log('Cambio detectado:', payload);
          cargarDatos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  };

  const abrirModalAccion = (comentario, tipoAccion) => {
    setComentarioSeleccionado(comentario);
    setAccion(tipoAccion);
    // Al editar una respuesta ya enviada, se precarga el texto actual
    setNotas(tipoAccion === 'responder' ? (comentario.respuesta_admin || '') : '');
    setModalAbierto(true);
  };

  const usarRespuestaRapida = (plantilla) => {
    const nombre = primerNombre(comentarioSeleccionado?.nombre_completo);
    // Si no hay nombre, evita quedar "¡Hola !" / "Gracias, !"
    const texto = plantilla.texto.replace('{nombre}', nombre).replace(/,?\s+([,!.])/g, '$1');
    setNotas(texto.slice(0, MAX_RESPUESTA));
  };

  const quitarRespuesta = async () => {
    if (!comentarioSeleccionado) return;
    setProcesando(true);
    try {
      const { data, error } = await supabase.rpc('responder_comentario', {
        p_comentario_id: comentarioSeleccionado.id,
        p_respuesta: ''
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Error al quitar la respuesta');
      mostrarMensaje('success', 'Respuesta eliminada');
      cargarDatos();
      cerrarModal();
    } catch (error) {
      console.error('Error al quitar respuesta:', error);
      mostrarMensaje('error', error.message || 'Error al quitar la respuesta');
    } finally {
      setProcesando(false);
    }
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
      } else if (accion === 'responder') {
        if (!notas.trim()) {
          mostrarMensaje('error', 'Escribí o elegí una respuesta');
          return;
        }

        const { data, error } = await supabase.rpc('responder_comentario', {
          p_comentario_id: comentarioSeleccionado.id,
          p_respuesta: notas
        });

        if (error) throw error;

        if (data.success) {
          mostrarMensaje('success', 'Respuesta publicada');
          cargarDatos();
          cerrarModal();
        } else {
          throw new Error(data.error || 'Error al responder');
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

  const handleCopiarLinkResena = async () => {
    // navigator.clipboard solo existe en contexto seguro (https o localhost).
    // Si el panel se abre por http:// en una IP local (celular en la misma red,
    // por ejemplo) esa API no está disponible y hay que copiar "a mano" con un
    // textarea temporal + execCommand, que sí funciona ahí.
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(LINK_RESENA_GOYANOVA);
      } else {
        const textareaTemporal = document.createElement('textarea');
        textareaTemporal.value = LINK_RESENA_GOYANOVA;
        textareaTemporal.style.position = 'fixed';
        textareaTemporal.style.opacity = '0';
        document.body.appendChild(textareaTemporal);
        textareaTemporal.focus();
        textareaTemporal.select();
        const copiadoOk = document.execCommand('copy');
        document.body.removeChild(textareaTemporal);
        if (!copiadoOk) throw new Error('execCommand copy falló');
      }
      setCopiadoResena(true);
      mostrarMensaje('success', 'Link copiado al portapapeles');
      setTimeout(() => setCopiadoResena(false), 2000);
    } catch (error) {
      console.error('Error al copiar el link:', error);
      mostrarMensaje('error', `No pudimos copiarlo automáticamente. Copiá manualmente: ${LINK_RESENA_GOYANOVA}`);
    }
  };

  const handleDescargarQRResena = () => {
    const canvas = qrResenaRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const enlaceDescarga = document.createElement('a');
    enlaceDescarga.href = url;
    enlaceDescarga.download = 'qr-resena-goyanova.png';
    enlaceDescarga.click();
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
            <span className="material-icons title-icon">reviews</span>
            Reseñas sobre GoyaNova
          </h1>
          <p className="admin-page-subtitle">
            Opiniones sobre la plataforma en sí (no sobre un servicio puntual) — moderalas y compartí el QR para juntar más
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

      {/* Reseña rápida: QR + link directo */}
      <div className="comentariosAdmin-resenaQR-card">
        <div className="comentariosAdmin-resenaQR-info">
          <h2>
            <span className="material-icons">qr_code_2</span>
            Reseña rápida por QR
          </h2>
          <p>
            QR y link directo para que cualquiera deje una opinión sobre GoyaNova en segundos,
            sin tener que buscarla en la página "Nosotros". Ideal para eventos, redes o pedirlo
            directo a un usuario.
          </p>
          <div className="comentariosAdmin-resenaQR-acciones">
            <button className="comentariosAdmin-btn-secundario" onClick={handleDescargarQRResena}>
              <span className="material-icons">download</span>
              Descargar QR
            </button>
            <div className="comentariosAdmin-resenaQR-linkBox">
              <input type="text" value={LINK_RESENA_GOYANOVA} readOnly className="comentariosAdmin-resenaQR-linkInput" />
              <button className="comentariosAdmin-btn-secundario" onClick={handleCopiarLinkResena}>
                <span className="material-icons">{copiadoResena ? 'check' : 'content_copy'}</span>
                {copiadoResena ? 'Copiado' : 'Copiar link'}
              </button>
            </div>
          </div>
        </div>
        <div className="comentariosAdmin-resenaQR-canvas" ref={qrResenaRef}>
          <QRCodeCanvas value={LINK_RESENA_GOYANOVA} size={150} level="M" marginSize={2} />
        </div>
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

                {comentario.respuesta_admin && (
                  <div className="respuesta-admin-box">
                    <span className="material-icons">reply</span>
                    <div>
                      <strong>Respuesta de GoyaNova</strong>
                      <p>{comentario.respuesta_admin}</p>
                      {comentario.respuesta_fecha && (
                        <small>{formatearFecha(comentario.respuesta_fecha)}</small>
                      )}
                    </div>
                  </div>
                )}

                <div className="comentario-actions-admin">
                  {comentario.estado === 'aprobado' && (
                    <button
                      className="b-btn-action b-btn-responder"
                      onClick={() => abrirModalAccion(comentario, 'responder')}
                    >
                      <span className="material-icons">reply</span>
                      {comentario.respuesta_admin ? 'Editar respuesta' : 'Responder'}
                    </button>
                  )}
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
                {accion === 'responder' && 'Responder Comentario'}
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

              {accion === 'responder' && (
                <div className="form-group-modal">
                  <label>Respuestas rápidas (tocá una y confirmá):</label>
                  <div className="respuestas-rapidas-grid">
                    {RESPUESTAS_RAPIDAS.map((plantilla) => (
                      <button
                        key={plantilla.id}
                        type="button"
                        className="respuesta-rapida-chip"
                        onClick={() => usarRespuestaRapida(plantilla)}
                      >
                        <span className="material-icons">{plantilla.icono}</span>
                        {plantilla.label}
                      </button>
                    ))}
                  </div>

                  <label htmlFor="respuesta-admin-texto">Respuesta que verá todo el mundo en la página:</label>
                  <textarea
                    id="respuesta-admin-texto"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value.slice(0, MAX_RESPUESTA))}
                    placeholder="Escribí tu respuesta o elegí una rápida..."
                    rows={5}
                    maxLength={MAX_RESPUESTA}
                  />
                  <span className="respuesta-contador">{notas.length} / {MAX_RESPUESTA}</span>
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
              {accion === 'responder' && comentarioSeleccionado?.respuesta_admin && (
                <button
                  className="b-btn-modal b-btn-cancelar"
                  onClick={quitarRespuesta}
                  disabled={procesando}
                >
                  Quitar respuesta
                </button>
              )}
              <button
                className={`b-btn-modal ${
                  accion === 'aprobar' ? 'b-btn-confirmar-aprobar' :
                  accion === 'rechazar' ? 'b-btn-confirmar-rechazar' :
                  accion === 'responder' ? 'b-btn-confirmar-responder' :
                  'b-btn-confirmar-eliminar'
                }`}
                onClick={ejecutarAccion}
                disabled={procesando || ((accion === 'rechazar' || accion === 'responder') && !notas.trim())}
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
                    {accion === 'responder' && 'Confirmar y enviar'}
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