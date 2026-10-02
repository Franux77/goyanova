import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
import imageCompression from 'browser-image-compression';
import { supabase } from '../../../utils/supabaseClient';
import { AuthContext } from '../../../auth/AuthContext';
import { limpiarTexto } from '../../../utils/limpiarTexto';
import './OpinionesSection.css';

// ========== VALIDACIONES PROFESIONALES ==========
const VALIDACIONES = {
  MIN_CARACTERES: 10,
  MAX_CARACTERES: 250,
  MAX_PALABRAS: 100,
  MAX_OPINIONES_DIA: 3,
  MIN_SEGUNDOS_ENTRE_OPINIONES: 30,

  PALABRAS_PROHIBIDAS: [
    'idiota', 'estupido', 'imbecil', 'tonto', 'basura', 'mierda',
    'pendejo', 'boludo', 'pelotudo', 'gil', 'tarado', 'cagon'
  ],

  PATRON_SPAM: /(.)\1{4,}/i,
  PATRON_MAYUSCULAS_EXCESIVAS: /[A-Z]{10,}/,
  PATRON_SIGNOS_REPETIDOS: /[!?]{3,}/,
  PATRON_SOLO_EMOJIS: /^[\p{Emoji}\s]+$/u,
  PATRON_URL: /(https?:\/\/[^\s]+)/g,
  PATRON_EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  PATRON_TELEFONO: /(\+?\d{2,4}[\s-]?)?\d{6,}/g,
};

// 🆕 Foto adjunta a la opinión
const FOTO_MAX_BYTES = 8 * 1024 * 1024; // 8MB, mismo límite del bucket

const validarComentario = (texto) => {
  const errores = [];
  const textoLimpio = texto.trim();

  if (textoLimpio.length < VALIDACIONES.MIN_CARACTERES) {
    errores.push(`El comentario debe tener al menos ${VALIDACIONES.MIN_CARACTERES} caracteres`);
  }

  if (textoLimpio.length > VALIDACIONES.MAX_CARACTERES) {
    errores.push(`El comentario no puede superar los ${VALIDACIONES.MAX_CARACTERES} caracteres`);
  }

  const palabras = textoLimpio.split(/\s+/).filter(p => p.length > 0);
  if (palabras.length > VALIDACIONES.MAX_PALABRAS) {
    errores.push(`El comentario no puede tener más de ${VALIDACIONES.MAX_PALABRAS} palabras`);
  }

  if (VALIDACIONES.PATRON_SOLO_EMOJIS.test(textoLimpio)) {
    errores.push('El comentario no puede contener solo emojis');
  }

  if (VALIDACIONES.PATRON_SPAM.test(textoLimpio)) {
    errores.push('El comentario contiene caracteres repetidos excesivamente');
  }

  if (VALIDACIONES.PATRON_MAYUSCULAS_EXCESIVAS.test(textoLimpio)) {
    errores.push('El comentario contiene demasiadas mayúsculas seguidas');
  }

  if (VALIDACIONES.PATRON_SIGNOS_REPETIDOS.test(textoLimpio)) {
    errores.push('El comentario contiene signos de puntuación excesivos');
  }

  const textoMinusculas = textoLimpio.toLowerCase();
  const insultosEncontrados = VALIDACIONES.PALABRAS_PROHIBIDAS.filter(palabra =>
    textoMinusculas.includes(palabra)
  );
  if (insultosEncontrados.length > 0) {
    errores.push('El comentario contiene lenguaje inapropiado');
  }

  if (VALIDACIONES.PATRON_URL.test(textoLimpio)) {
    errores.push('No se permiten enlaces en los comentarios');
  }

  if (VALIDACIONES.PATRON_EMAIL.test(textoLimpio)) {
    errores.push('No se permiten correos electrónicos en los comentarios');
  }

  if (VALIDACIONES.PATRON_TELEFONO.test(textoLimpio)) {
    errores.push('No se permiten números de teléfono en los comentarios');
  }

  return { valido: errores.length === 0, errores };
};

const OpinionesSection = ({ servicioPropietarioId }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const maxMostrar = 3;
  const limiteTexto = 130;

  const [expandida, setExpandida] = useState({});
  const [comentario, setComentario] = useState('');
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(null);
  const [opiniones, setOpiniones] = useState([]);
  const [respuestasEditando, setRespuestasEditando] = useState({});
  const [erroresValidacion, setErroresValidacion] = useState([]);
  const [contadorCaracteres, setContadorCaracteres] = useState(0);

  // 🆕 Foto adjunta
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [comprimiendoFoto, setComprimiendoFoto] = useState(false);
  const [enviando, setEnviando] = useState(false);
    const [zoomAbierto, setZoomAbierto] = useState(null); // 🆕 url de la foto en zoom

  const { user } = useContext(AuthContext);
  const isLoggedIn = !!user;

  const usuarioLogueado = {
    id: user?.id,
    nombre: user?.user_metadata?.nombre || user?.email
  };

  const esMiServicio = React.useMemo(() => {
    return isLoggedIn && String(usuarioLogueado?.id) === String(servicioPropietarioId);
  }, [isLoggedIn, usuarioLogueado?.id, servicioPropietarioId]);

  useEffect(() => {
    const fetchOpiniones = async () => {
      const { data, error } = await supabase
        .from('opiniones')
        .select(`
          id,
          comentario,
          puntuacion,
          fecha,
          respuesta,
          fecha_respuesta,
          foto_url,
          usuario:perfiles_usuarios (
            id,
            nombre,
            apellido
          )
        `)
        .eq('servicio_id', id)
        .order('fecha', { ascending: false });

      if (!error) setOpiniones(data || []);
    };
    fetchOpiniones();
  }, [id]);

  const toggleExpandir = (index) => {
    setExpandida(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleCambioComentario = (e) => {
    const nuevoTexto = limpiarTexto(e.target.value);
    setComentario(nuevoTexto);
    setContadorCaracteres(nuevoTexto.length);

    if (erroresValidacion.length > 0) {
      setErroresValidacion([]);
    }
  };

  // 🆕 Elegir foto: comprime y muestra preview antes de publicar
  const handleElegirFoto = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    if (archivo.size > FOTO_MAX_BYTES * 3) {
      // Antes de comprimir, cortamos archivos absurdamente pesados
      setErroresValidacion(['La imagen es demasiado pesada. Probá con otra.']);
      return;
    }

    setComprimiendoFoto(true);
    try {
      const comprimida = await imageCompression(archivo, {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.85
      });

      if (fotoPreview) URL.revokeObjectURL(fotoPreview);
      setFotoFile(comprimida);
      setFotoPreview(URL.createObjectURL(comprimida));
    } catch (err) {
      console.error('Error comprimiendo la foto:', err);
      setErroresValidacion(['No se pudo procesar la imagen. Probá con otra.']);
    } finally {
      setComprimiendoFoto(false);
    }
  };

  const quitarFoto = () => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFotoFile(null);
    setFotoPreview(null);
  };

  const validarLimiteOpinionesDia = async (usuarioId) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('opiniones')
      .select('id')
      .eq('usuario_id', usuarioId)
      .gte('fecha', hoy.toISOString());

    if (error) return true;

    return (data?.length || 0) < VALIDACIONES.MAX_OPINIONES_DIA;
  };

  const validarTiempoEntreOpiniones = async (usuarioId) => {
    const { data, error } = await supabase
      .from('opiniones')
      .select('fecha')
      .eq('usuario_id', usuarioId)
      .order('fecha', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return true;

    const ultimaOpinion = new Date(data[0].fecha);
    const ahora = new Date();
    const segundosTranscurridos = (ahora - ultimaOpinion) / 1000;

    return segundosTranscurridos >= VALIDACIONES.MIN_SEGUNDOS_ENTRE_OPINIONES;
  };

  const handleEnviarComentario = async () => {
    setErroresValidacion([]);

    if (!isLoggedIn) {
      if (window.confirm('Debes iniciar sesión para dejar una opinión. ¿Querés iniciar sesión ahora?')) {
        navigate('/login');
      }
      return;
    }

    if (esMiServicio) {
      setErroresValidacion(['No podés comentar tu propio servicio']);
      return;
    }

    if (rating === 0) {
      setErroresValidacion(['Debes seleccionar una calificación (estrellas)']);
      return;
    }

    const { valido, errores } = validarComentario(comentario);
    if (!valido) {
      setErroresValidacion(errores);
      return;
    }

    const todasOpinionesTexto = opiniones.map(op => (op.comentario || '').trim().toLowerCase());
    if (todasOpinionesTexto.includes(comentario.trim().toLowerCase())) {
      setErroresValidacion(['Este comentario ya fue enviado anteriormente']);
      return;
    }

    const puedeOpinarHoy = await validarLimiteOpinionesDia(usuarioLogueado.id);
    if (!puedeOpinarHoy) {
      setErroresValidacion([`Ya has enviado el máximo de ${VALIDACIONES.MAX_OPINIONES_DIA} opiniones hoy`]);
      return;
    }

    const tiempoValido = await validarTiempoEntreOpiniones(usuarioLogueado.id);
    if (!tiempoValido) {
      setErroresValidacion([`Debes esperar ${VALIDACIONES.MIN_SEGUNDOS_ENTRE_OPINIONES} segundos entre opiniones`]);
      return;
    }

    setEnviando(true);

    try {
      // 🆕 Subir la foto primero (si hay), así insertamos la URL de una
      let fotoUrlFinal = null;
      if (fotoFile) {
        const ext = 'jpg';
        const ruta = `${usuarioLogueado.id}/${id}_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('opiniones-fotos')
          .upload(ruta, fotoFile, { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('opiniones-fotos')
          .getPublicUrl(ruta);

        fotoUrlFinal = urlData.publicUrl;
      }

      const nuevaOpinion = {
        nombre_completo: usuarioLogueado?.nombre || user?.email || 'Anónimo',
        comentario: comentario.trim(),
        puntuacion: rating,
        servicio_id: id,
        fecha: new Date().toISOString(),
        usuario_id: usuarioLogueado?.id,
        foto_url: fotoUrlFinal,
      };

      const { data, error } = await supabase
        .from('opiniones')
        .insert([nuevaOpinion])
        .select(`
          id,
          comentario,
          puntuacion,
          fecha,
          respuesta,
          fecha_respuesta,
          foto_url,
          usuario:perfiles_usuarios ( id, nombre, apellido )
        `);

      if (error) throw error;

      if (data?.length) {
        setOpiniones(prev => [data[0], ...prev]);
        setComentario('');
        setRating(0);
        setHover(null);
        setContadorCaracteres(0);
        setErroresValidacion([]);
        quitarFoto();
        alert('¡Opinión enviada correctamente!');
      }
    } catch (err) {
      console.error('Error al guardar opinión:', err);
      setErroresValidacion(['No se pudo guardar la opinión. Intenta de nuevo.']);
    } finally {
      setEnviando(false);
    }
  };

  const handleResponder = (opinionId) => {
    if (opiniones.find(op => op.id === opinionId)?.respuesta) return;
    setRespuestasEditando((prev) => ({
      ...prev,
      [opinionId]: '',
    }));
  };

  const enviarRespuesta = async (opinionId) => {
    const respuesta = respuestasEditando[opinionId]?.trim();

    if (!respuesta) {
      alert('La respuesta no puede estar vacía');
      return;
    }

    const { valido, errores } = validarComentario(respuesta);
    if (!valido) {
      alert('Respuesta inválida: ' + errores.join(', '));
      return;
    }

    const { error } = await supabase
      .from('opiniones')
      .update({ respuesta, fecha_respuesta: new Date() })
      .eq('id', opinionId);

    if (error) {
      console.error('Error al enviar respuesta:', error);
      alert('No se pudo enviar la respuesta');
      return;
    }

    setOpiniones(prev =>
      prev.map(op =>
        op.id === opinionId ? { ...op, respuesta, fecha_respuesta: new Date() } : op
      )
    );
    setRespuestasEditando(prev => ({ ...prev, [opinionId]: undefined }));
  };

  const opinionesMostradas = opiniones.slice(0, maxMostrar);

  return (
    <section className="opiniones-seccion-container" aria-label="Sección de opiniones">
      <h3 className="opiniones-seccion-titulo">Opiniones</h3>

      {opiniones.length === 0 ? (
        <p className="opiniones-mensaje-sin">No hay opiniones aún.</p>
      ) : (
        <ul className="opiniones-lista-items">
          {opinionesMostradas.map((opinion, i) => {
            const texto = opinion.comentario || '';
            const esLargo = texto.length > limiteTexto;
            const mostrarCompleto = expandida[i];
            const esMiComentario = !!usuarioLogueado?.id && !!opinion.usuario?.id && String(opinion.usuario.id) === String(usuarioLogueado.id);

            return (
              <li key={opinion.id || i} className="opinion-card-item">
                <div className="opinion-card-header">
                  <span className="opinion-usuario-nombre">
                    {opinion.usuario?.nombre
                      ? `${opinion.usuario.nombre} ${opinion.usuario.apellido || ''}`
                      : 'Anónimo'}
                  </span>

                  <div className="opinion-estrellas-rating">
                    {[...Array(5)].map((_, idx) => (
                      <FaStar
                        key={idx}
                        size={14}
                        color={idx < opinion.puntuacion ? '#f5a623' : '#ddd'}
                      />
                    ))}
                  </div>
                </div>

                <p className={`opinion-texto-contenido ${mostrarCompleto ? 'expandida' : ''}`}>
                  {mostrarCompleto || !esLargo ? texto : texto.slice(0, limiteTexto) + '...'}
                </p>

                {esLargo && (
                  <button className="opinion-btn-ver-mas" onClick={() => toggleExpandir(i)}>
                    {mostrarCompleto ? 'Ver menos' : 'Ver más'}
                  </button>
                )}

                                {/* 🆕 Foto adjunta a la opinión — abre en zoom, no en pestaña nueva */}
                {opinion.foto_url && (
                  <button
                    type="button"
                    className="opinion-foto-link"
                    onClick={() => setZoomAbierto(opinion.foto_url)}
                  >
                    <img
                      src={opinion.foto_url}
                      alt="Foto adjunta a la opinión"
                      className="opinion-foto-adjunta"
                      loading="lazy"
                    />
                  </button>
                )}

                <div className="opinion-footer-acciones">
                  <span className="opinion-fecha-publicacion">
                    {opinion.fecha ? new Date(opinion.fecha).toLocaleDateString('es-AR') : 'Sin fecha'}
                  </span>

                  {esMiComentario && (
                    <button
                      className="opinion-btn-eliminar-propio"
                      onClick={async () => {
                        if (!window.confirm('¿Querés eliminar tu comentario? Esta acción no se puede deshacer.')) return;

                        try {
                          const { error } = await supabase
                            .from('opiniones')
                            .delete()
                            .eq('id', opinion.id);
                          if (error) throw error;

                          setOpiniones(prev => prev.filter(op => op.id !== opinion.id));
                          alert('Comentario eliminado correctamente.');
                        } catch (err) {
                          console.error('Error al eliminar comentario:', err);
                          alert('No se pudo eliminar el comentario.');
                        }
                      }}
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                {opinion.respuesta && (
                  <div className="opinion-respuesta-dueno">
                    <strong>Respuesta:</strong> {opinion.respuesta}

                    {esMiServicio && (
                      <button
                        className="opinion-btn-eliminar-respuesta"
                        onClick={async () => {
                          if (!window.confirm('¿Querés eliminar tu respuesta? Esta acción no se puede deshacer.')) return;

                          try {
                            const { error } = await supabase
                              .from('opiniones')
                              .update({ respuesta: null, fecha_respuesta: null })
                              .eq('id', opinion.id);

                            if (error) throw error;

                            setOpiniones(prev =>
                              prev.map(op =>
                                op.id === opinion.id
                                  ? { ...op, respuesta: null, fecha_respuesta: null }
                                  : op
                              )
                            );

                            alert('Respuesta eliminada correctamente.');
                          } catch (err) {
                            console.error('Error al eliminar respuesta:', err);
                            alert('No se pudo eliminar la respuesta.');
                          }
                        }}
                      >
                        Eliminar respuesta
                      </button>
                    )}
                  </div>
                )}

                {esMiServicio && !opinion.respuesta && (
                  <div className="opinion-input-respuesta-container">
                    {respuestasEditando[opinion.id] !== undefined ? (
                      <>
                        <input
                          type="text"
                          className="opinion-input-respuesta-texto"
                          value={respuestasEditando[opinion.id]}
                          onChange={(e) =>
                            setRespuestasEditando(prev => ({
                              ...prev,
                              [opinion.id]: limpiarTexto(e.target.value),
                            }))
                          }
                          placeholder="Escribí tu respuesta..."
                          maxLength={VALIDACIONES.MAX_CARACTERES}
                        />

                        <div className="opinion-respuesta-botones">
                          <button
                            className="opinion-btn-cancelar-respuesta"
                            onClick={() =>
                              setRespuestasEditando(prev => ({ ...prev, [opinion.id]: undefined }))
                            }
                          >
                            Cancelar
                          </button>
                          <button className="opinion-btn-enviar-respuesta" onClick={() => enviarRespuesta(opinion.id)}>
                            Enviar
                          </button>
                        </div>
                      </>
                    ) : (
                      <button className="opinion-btn-responder" onClick={() => handleResponder(opinion.id)}>
                        Responder
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {opiniones.length > maxMostrar && (
        <button
          className="opiniones-btn-ver-todas"
          onClick={() => navigate(`/perfil/${id}/opiniones`)}
        >
          Ver todas las opiniones
        </button>
      )}

      <div className="opiniones-nueva-caja">
        <h4 className="opiniones-nueva-titulo">Dejá tu opinión</h4>

        {erroresValidacion.length > 0 && (
          <div className="opiniones-errores-validacion">
            {erroresValidacion.map((error, idx) => (
              <p key={idx}>⚠️ {error}</p>
            ))}
          </div>
        )}

        <div className="opiniones-rating-input">
          {[...Array(5)].map((_, i) => {
            const valor = i + 1;
            return (
              <label key={i}>
                <input
                  type="radio"
                  name="rating"
                  value={valor}
                  onClick={() => setRating(valor)}
                  disabled={!isLoggedIn || esMiServicio}
                />
                <FaStar
                  size={20}
                  color={valor <= (hover || rating) ? '#f5a623' : '#ddd'}
                  onMouseEnter={() => !esMiServicio && setHover(valor)}
                  onMouseLeave={() => !esMiServicio && setHover(null)}
                  style={{ cursor: (!isLoggedIn || esMiServicio) ? 'not-allowed' : 'pointer' }}
                />
              </label>
            );
          })}
        </div>

        <div className="opiniones-textarea-wrapper">
          <textarea
            className="opiniones-textarea-input"
            placeholder={
              !isLoggedIn
                ? 'Debes iniciar sesión para comentar...'
                : esMiServicio
                ? 'No podés comentar tu propio servicio.'
                : 'Escribí tu opinión...'
            }
            value={comentario}
            onChange={handleCambioComentario}
            disabled={!isLoggedIn || esMiServicio}
            maxLength={VALIDACIONES.MAX_CARACTERES}
          />
          <div className="opiniones-contador-caracteres">
            <span className={contadorCaracteres > VALIDACIONES.MAX_CARACTERES - 50 ? 'advertencia' : ''}>
              {contadorCaracteres}/{VALIDACIONES.MAX_CARACTERES}
            </span>
          </div>
        </div>

        {/* 🆕 Adjuntar foto, con preview antes de publicar */}
        {isLoggedIn && !esMiServicio && (
          <div className="opiniones-foto-adjunta-wrapper">
            {!fotoPreview ? (
              <label className={`opiniones-btn-adjuntar-foto ${comprimiendoFoto ? 'deshabilitado' : ''}`}>
                <span className="material-icons">add_a_photo</span>
                {comprimiendoFoto ? 'Procesando...' : 'Adjuntar una foto (opcional)'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleElegirFoto}
                  disabled={comprimiendoFoto}
                  style={{ display: 'none' }}
                />
              </label>
            ) : (
              <div className="opiniones-preview-foto">
                <img src={fotoPreview} alt="Vista previa" />
                <button
                  type="button"
                  className="opiniones-preview-foto-quitar"
                  onClick={quitarFoto}
                  title="Quitar foto"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
            )}
          </div>
        )}

        <button
          className="opiniones-btn-enviar-comentario"
          onClick={
            !isLoggedIn
              ? () => navigate('/login')
              : handleEnviarComentario
          }
          disabled={esMiServicio || enviando}
        >
          {!isLoggedIn
            ? 'Iniciar sesión para comentar'
            : esMiServicio
            ? 'No podés comentar'
            : enviando
            ? 'Enviando...'
            : 'Enviar'}
        </button>
      </div>
      {/* 🆕 Zoom de la foto de opinión */}
      {zoomAbierto && (
        <div className="opinion-zoom-overlay" onClick={() => setZoomAbierto(null)}>
          <button className="opinion-zoom-cerrar" onClick={() => setZoomAbierto(null)}>
            <span className="material-icons">close</span>
          </button>
          <img src={zoomAbierto} alt="Foto ampliada" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </section>
  );
};

export default OpinionesSection;