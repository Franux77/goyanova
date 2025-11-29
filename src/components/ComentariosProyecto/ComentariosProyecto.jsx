import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import './ComentariosProyecto.css';

const ComentariosProyecto = () => {
  const [comentarios, setComentarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [expandidos, setExpandidos] = useState({});
  const [estadisticas, setEstadisticas] = useState(null);
  const [comentariosMostrados, setComentariosMostrados] = useState(6);
  const COMENTARIOS_POR_PAGINA = 6;
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre_completo: '',
    email: '',
    comentario: '',
    puntuacion: 5
  });
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Estado del modal de reporte
  const [mostrarModalReporte, setMostrarModalReporte] = useState(false);
  const [comentarioAReportar, setComentarioAReportar] = useState(null);
  const [motivoReporte, setMotivoReporte] = useState('');
  const [descripcionReporte, setDescripcionReporte] = useState('');
  const [enviandoReporte, setEnviandoReporte] = useState(false);

  // Cargar comentarios públicos
  useEffect(() => {
    cargarComentarios();
    cargarEstadisticas();
  }, []);

  const cargarComentarios = async () => {
    try {
      const { data, error } = await supabase
        .from('comentarios_publicos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setComentarios(data || []);
    } catch (error) {
      console.error('Error al cargar comentarios:', error);
    } finally {
      setLoading(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      // Obtener IP del usuario (aproximado)
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();

      // Llamar a la función RPC con validaciones
      const { data, error } = await supabase.rpc('crear_comentario_validado', {
        p_nombre_completo: formData.nombre_completo,
        p_email: formData.email,
        p_comentario: formData.comentario,
        p_puntuacion: formData.puntuacion,
        p_ip_address: ip,
        p_user_agent: navigator.userAgent
      });

      if (error) throw error;

      if (data.success) {
        setMensaje({
          tipo: 'success',
          texto: '¡Gracias por tu comentario! Será visible una vez aprobado por nuestro equipo.'
        });
        setFormData({
          nombre_completo: '',
          email: '',
          comentario: '',
          puntuacion: 5
        });
        setMostrarFormulario(false);
        
        // Recargar después de 2 segundos
        setTimeout(() => {
          cargarComentarios();
          cargarEstadisticas();
        }, 2000);
      } else {
        setMensaje({
          tipo: 'error',
          texto: data.error || 'Error al enviar el comentario'
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setMensaje({
        tipo: 'error',
        texto: 'Ocurrió un error. Por favor, intenta nuevamente.'
      });
    } finally {
      setEnviando(false);
    }
  };

  const handleEnviarReporte = async () => {
    if (!motivoReporte) return;
    
    setEnviandoReporte(true);
    try {
      const { error } = await supabase.from('reportes_comentarios').insert({
        comentario_id: comentarioAReportar.id,
        motivo: motivoReporte,
        descripcion: descripcionReporte,
        ip_address: await fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => d.ip),
        user_agent: navigator.userAgent
      });
      
      if (error) throw error;
      
      setMensaje({
        tipo: 'success',
        texto: 'Reporte enviado correctamente. Gracias por ayudarnos a mantener la comunidad segura.'
      });
      setMostrarModalReporte(false);
      setMotivoReporte('');
      setDescripcionReporte('');
      setComentarioAReportar(null);
    } catch (error) {
      console.error('Error al reportar:', error);
      setMensaje({
        tipo: 'error',
        texto: 'Error al enviar el reporte. Intenta nuevamente.'
      });
    } finally {
      setEnviandoReporte(false);
    }
  };

  const toggleExpandir = (id) => {
    setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const cargarMasComentarios = () => {
    setComentariosMostrados(prev => prev + COMENTARIOS_POR_PAGINA);
  };

  const renderEstrellas = (puntuacion) => {
    return [...Array(5)].map((_, i) => (
      <span
        key={i}
        className="material-icons comentarios-proyecto-estrella"
        style={{ color: i < puntuacion ? '#FFB800' : '#e0e0e0' }}
      >
        star
      </span>
    ));
  };

  const formatearFecha = (fecha) => {
    const date = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora - date;
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias === 0) return 'Hoy';
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `Hace ${diffDias} días`;
    if (diffDias < 30) return `Hace ${Math.floor(diffDias / 7)} semanas`;
    if (diffDias < 365) return `Hace ${Math.floor(diffDias / 30)} meses`;
    
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const truncarTexto = (texto, maxLength = 120) => {
    if (texto.length <= maxLength) return texto;
    return texto.substring(0, maxLength) + '...';
  };

  // Filtrar comentarios a mostrar según paginación
  const comentariosVisibles = comentarios.slice(0, comentariosMostrados);
  const hayMasComentarios = comentarios.length > comentariosMostrados;

  return (
    <section className="comentarios-proyecto-section">
      <div className="comentarios-proyecto-header">
        <div className="comentarios-proyecto-header-content">
          <div className="comentarios-proyecto-header-badge">
            <span className="material-icons">forum</span>
            <span>Opiniones Reales</span>
          </div>
          <h2 className="comentarios-proyecto-title">
            ¿Qué dicen sobre <span className="comentarios-proyecto-title-gradient">GoyaNova</span>?
          </h2>
          <p className="comentarios-proyecto-description">
            Cada comentario nos ayuda a mejorar y construir una mejor plataforma para Goya.
            Tu opinión es muy valiosa para nosotros.
          </p>

          {estadisticas && (
            <div className="comentarios-proyecto-estadisticas-grid">
              <div className="comentarios-proyecto-stat-card">
                <span className="material-icons comentarios-proyecto-stat-icon">comment</span>
                <div className="comentarios-proyecto-stat-content">
                  <span className="comentarios-proyecto-stat-number">{estadisticas.total_comentarios}</span>
                  <span className="comentarios-proyecto-stat-label">Comentarios</span>
                </div>
              </div>
              <div className="comentarios-proyecto-stat-card">
                <span className="material-icons comentarios-proyecto-stat-icon">star</span>
                <div className="comentarios-proyecto-stat-content">
                  <span className="comentarios-proyecto-stat-number">{estadisticas.puntuacion_promedio}</span>
                  <span className="comentarios-proyecto-stat-label">Promedio</span>
                </div>
              </div>
              <div className="comentarios-proyecto-stat-card">
                <span className="material-icons comentarios-proyecto-stat-icon">people</span>
                <div className="comentarios-proyecto-stat-content">
                  <span className="comentarios-proyecto-stat-number">{estadisticas.usuarios_unicos}</span>
                  <span className="comentarios-proyecto-stat-label">Usuarios</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Botón para mostrar formulario */}
      {!mostrarFormulario && (
        <div className="comentarios-proyecto-accion-comentar">
          <button
            className="comentarios-proyecto-btn-comentar"
            onClick={() => setMostrarFormulario(true)}
          >
            <span className="material-icons">rate_review</span>
            <span>Dejar tu Comentario</span>
          </button>
        </div>
      )}

      {/* Formulario de comentario */}
      {mostrarFormulario && (
        <div className="comentarios-proyecto-formulario-container">
          <div className="comentarios-proyecto-formulario-header">
            <h3>Comparte tu Experiencia</h3>
            <button
              className="comentarios-proyecto-btn-cerrar-form"
              onClick={() => {
                setMostrarFormulario(false);
                setMensaje({ tipo: '', texto: '' });
              }}
            >
              <span className="material-icons">close</span>
            </button>
          </div>

          {mensaje.texto && (
            <div className={`comentarios-proyecto-mensaje-alert ${mensaje.tipo}`}>
              <span className="material-icons">
                {mensaje.tipo === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{mensaje.texto}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="comentarios-proyecto-comentario-form">
            <div className="comentarios-proyecto-form-row">
              <div className="comentarios-proyecto-form-group">
                <label>
                  <span className="material-icons">person</span>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={formData.nombre_completo}
                  onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                  placeholder="Juan Pérez"
                  required
                  minLength={3}
                  maxLength={100}
                />
              </div>

              <div className="comentarios-proyecto-form-group">
                <label>
                  <span className="material-icons">email</span>
                  Email (opcional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="tu@email.com"
                  maxLength={100}
                />
              </div>
            </div>

            <div className="comentarios-proyecto-form-group">
              <label>
                <span className="material-icons">star</span>
                Puntuación *
              </label>
              <div className="comentarios-proyecto-puntuacion-selector">
                <div className="comentarios-proyecto-estrellas-container">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      className={`comentarios-proyecto-estrella-btn ${formData.puntuacion >= num ? 'activa' : ''}`}
                      onClick={() => setFormData({ ...formData, puntuacion: num })}
                    >
                      <span className="material-icons">star</span>
                    </button>
                  ))}
                </div>
                <span className="comentarios-proyecto-puntuacion-texto">
                  {formData.puntuacion === 1 && 'Muy malo'}
                  {formData.puntuacion === 2 && 'Malo'}
                  {formData.puntuacion === 3 && 'Regular'}
                  {formData.puntuacion === 4 && 'Bueno'}
                  {formData.puntuacion === 5 && 'Excelente'}
                </span>
              </div>
            </div>

            <div className="comentarios-proyecto-form-group">
              <label>
                <span className="material-icons">chat</span>
                Tu Comentario *
              </label>
              <textarea
                value={formData.comentario}
                onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
                placeholder="Cuéntanos tu experiencia con GoyaNova..."
                required
                minLength={10}
                maxLength={1000}
                rows={5}
              />
              <span className="comentarios-proyecto-caracteres-count">
                {formData.comentario.length} / 1000 caracteres
              </span>
            </div>

            <div className="comentarios-proyecto-form-actions">
              <button
                type="button"
                className="comentarios-proyecto-btn-cancelar"
                onClick={() => {
                  setMostrarFormulario(false);
                  setMensaje({ tipo: '', texto: '' });
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="comentarios-proyecto-btn-enviar"
                disabled={enviando}
              >
                {enviando ? (
                  <>
                    <span className="material-icons comentarios-proyecto-rotating">refresh</span>
                    Enviando...
                  </>
                ) : (
                  <>
                    <span className="material-icons">send</span>
                    Enviar Comentario
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de comentarios */}
      <div className="comentarios-proyecto-comentarios-lista">
        {loading ? (
          <div className="comentarios-proyecto-loading-container">
            <span className="material-icons comentarios-proyecto-rotating">refresh</span>
            <p>Cargando comentarios...</p>
          </div>
        ) : comentarios.length === 0 ? (
          <div className="comentarios-proyecto-sin-comentarios">
            <span className="material-icons">chat_bubble_outline</span>
            <p>Sé el primero en dejar un comentario</p>
          </div>
        ) : (
          <>
            {comentariosVisibles.map((comentario) => {
              const esLargo = comentario.comentario.length > 120;
              const expandido = expandidos[comentario.id];

              return (
                <div key={comentario.id} className="comentarios-proyecto-comentario-card">
                  <div className="comentarios-proyecto-comentario-header-card">
                    <div className="comentarios-proyecto-usuario-info">
                      {comentario.foto_usuario ? (
                        <img
                          src={comentario.foto_usuario}
                          alt={comentario.nombre_completo}
                          className="comentarios-proyecto-usuario-avatar"
                        />
                      ) : (
                        <div className="comentarios-proyecto-usuario-avatar-placeholder">
                          <span className="material-icons">person</span>
                        </div>
                      )}
                      <div className="comentarios-proyecto-usuario-detalles">
                        <h4 className="comentarios-proyecto-usuario-nombre">{comentario.nombre_completo}</h4>
                        <div className="comentarios-proyecto-comentario-meta">
                          <span className="comentarios-proyecto-comentario-fecha">
                            {formatearFecha(comentario.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="comentarios-proyecto-rating-reportar-container">
                      <div className="comentarios-proyecto-comentario-rating">
                        {renderEstrellas(comentario.puntuacion)}
                      </div>
                      
                      {/* Botón Reportar - Siempre visible */}
                      <button
                        className="comentarios-proyecto-btn-reportar-visible"
                        onClick={() => {
                          setComentarioAReportar(comentario);
                          setMostrarModalReporte(true);
                        }}
                        title="Reportar comentario"
                      >
                        <span className="material-icons">flag</span>
                      </button>
                    </div>
                  </div>

                  <div className="comentarios-proyecto-comentario-body">
                    <p className="comentarios-proyecto-comentario-texto">
                      {expandido || !esLargo
                        ? comentario.comentario
                        : truncarTexto(comentario.comentario)}
                      {esLargo && (
                        <button
                          className="comentarios-proyecto-btn-ver-mas"
                          onClick={() => toggleExpandir(comentario.id)}
                        >
                          {expandido ? (
                            <>
                              Ver menos
                              <span className="material-icons">expand_less</span>
                            </>
                          ) : (
                            <>
                              Ver más
                              <span className="material-icons">expand_more</span>
                            </>
                          )}
                        </button>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Botón para cargar más comentarios */}
            {hayMasComentarios && (
              <div className="comentarios-proyecto-ver-mas-container">
                <button
                  className="comentarios-proyecto-btn-ver-mas-comentarios"
                  onClick={cargarMasComentarios}
                >
                  <span>Ver más comentarios</span>
                  <span className="material-icons">expand_more</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Reporte */}
      {mostrarModalReporte && comentarioAReportar && (
        <div 
          className="comentarios-proyecto-modal-overlay" 
          onClick={() => setMostrarModalReporte(false)}
        >
          <div 
            className="comentarios-proyecto-modal" 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="comentarios-proyecto-modal-title">
              <span className="material-icons">flag</span>
              Reportar Comentario
            </h3>
            
            <p className="comentarios-proyecto-modal-desc">
              Por favor selecciona el motivo por el cual deseas reportar este comentario.
              Tu reporte nos ayuda a mantener una comunidad segura.
            </p>

            <div className="comentarios-proyecto-motivos-grid">
              {[
                { id: 'spam', label: 'Spam o publicidad' },
                { id: 'ofensivo', label: 'Contenido ofensivo' },
                { id: 'falso', label: 'Información falsa' },
                { id: 'inapropiado', label: 'Contenido inapropiado' },
                { id: 'otro', label: 'Otro motivo' }
              ].map(motivo => (
                <button
                  key={motivo.id}
                  className={`comentarios-proyecto-motivo-btn ${motivoReporte === motivo.id ? 'selected' : ''}`}
                  onClick={() => setMotivoReporte(motivo.id)}
                >
                  {motivo.label}
                </button>
              ))}
            </div>

            <textarea
              className="comentarios-proyecto-modal-textarea"
              value={descripcionReporte}
              onChange={(e) => setDescripcionReporte(e.target.value)}
              placeholder="Describe el problema (opcional)"
            />

            <div className="comentarios-proyecto-modal-actions">
              <button
                className="comentarios-proyecto-btn-modal-cancelar"
                onClick={() => {
                  setMostrarModalReporte(false);
                  setMotivoReporte('');
                  setDescripcionReporte('');
                  setComentarioAReportar(null);
                }}
              >
                Cancelar
              </button>
              <button
                className="comentarios-proyecto-btn-modal-enviar"
                disabled={!motivoReporte || enviandoReporte}
                onClick={handleEnviarReporte}
              >
                {enviandoReporte ? 'Enviando...' : 'Enviar Reporte'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ComentariosProyecto;