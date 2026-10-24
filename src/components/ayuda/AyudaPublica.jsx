import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../auth/useAuth';
import { llamarEmail } from '../../utils/llamarEmail';
import { useInstalarApp } from '../../utils/instalarApp';
import NavbarGeneral from '../home/NavbarGeneral';
import { GUIAS, iconoCategoriaFaq, normalizar } from './guiasAyuda';
import './AyudaPublica.css';

const WHATSAPP_SOPORTE = '5493777599800';
const EMAIL_SOPORTE = 'goyanovasoporte@gmail.com';
const SUGERENCIAS = ['Publicar', 'Contraseña', 'Mapa', 'Instalar', 'Planes', 'Fotos'];

const linkWhatsApp = (texto) =>
  `https://wa.me/${WHATSAPP_SOPORTE}?text=${encodeURIComponent(texto)}`;

/* ---------- Ventana con los pasos de una guía ---------- */
const VentanaGuia = ({ guia, onCerrar }) => {
  const { puedeInstalar, yaInstalada, instalar } = useInstalarApp();

  useEffect(() => {
    const alTeclear = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alTeclear);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = overflowPrevio;
    };
  }, [onCerrar]);

  return (
    <div className="ay-modal-fondo" onClick={onCerrar}>
      <div
        className="ay-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ay-modal-titulo"
        onClick={(e) => e.stopPropagation()}
        style={{ '--ay-color': guia.color }}
      >
        <span className="ay-manija" aria-hidden="true" />
        <div className="ay-modal-cabecera">
          <span className="ay-guia-icono">
            <span className="material-icons">{guia.icono}</span>
          </span>
          <div>
            <h2 id="ay-modal-titulo">{guia.titulo}</h2>
            <p>{guia.resumen}</p>
          </div>
          <button type="button" className="ay-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <span className="material-icons">close</span>
          </button>
        </div>

        <ol className="ay-pasos">
          {guia.pasos.map((paso, i) => (
            <li key={i}>
              <span className="ay-paso-num">{i + 1}</span>
              <p>{paso}</p>
            </li>
          ))}
        </ol>

        <div className="ay-modal-acciones">
          {guia.instalar && yaInstalada && (
            <p className="ay-instalada">
              <span className="material-icons">check_circle</span>
              Ya tenés GoyaNova instalada en este dispositivo.
            </p>
          )}
          {guia.instalar && !yaInstalada && puedeInstalar && (
            <button type="button" className="ay-boton ay-boton-principal" onClick={instalar}>
              <span className="material-icons">download</span>
              Instalar ahora
            </button>
          )}
          {guia.accion && (
            <Link
              to={guia.accion.to}
              className={`ay-boton ${guia.instalar && puedeInstalar ? 'ay-boton-sec' : 'ay-boton-principal'}`}
              onClick={onCerrar}
            >
              {guia.accion.texto}
              <span className="material-icons">arrow_forward</span>
            </Link>
          )}
          <a
            className="ay-link-ayuda"
            href={linkWhatsApp(`Hola GoyaNova, necesito ayuda con: ${guia.titulo}`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            ¿Seguís con dudas? Escribinos por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

/* ---------- Una pregunta frecuente ---------- */
const Pregunta = ({ faq, abierta, onAlternar }) => (
  <div className={`ay-faq ${abierta ? 'abierta' : ''}`}>
    <button type="button" className="ay-faq-pregunta" onClick={onAlternar} aria-expanded={abierta}>
      <span>{faq.pregunta}</span>
      <span className="material-icons">expand_more</span>
    </button>
    {abierta && <p className="ay-faq-respuesta">{faq.respuesta}</p>}
  </div>
);

const AyudaPublica = () => {
  const { user } = useAuth();
  const { yaInstalada } = useInstalarApp();
  const [busqueda, setBusqueda] = useState('');
  const [faqAbierta, setFaqAbierta] = useState(null);
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [categoriasFaqs, setCategoriasFaqs] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [tutoriales, setTutoriales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guiaAbierta, setGuiaAbierta] = useState(null);
  const cerrarGuia = useCallback(() => setGuiaAbierta(null), []);

  const [formAbierto, setFormAbierto] = useState(false);
  const [form, setForm] = useState({ nombre: '', email: '', asunto: '', mensaje: '' });
  const [enviando, setEnviando] = useState(false);
  const [estadoEnvio, setEstadoEnvio] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const cargar = async () => {
      try {
        const [cats, preguntas, tuts] = await Promise.all([
          supabase.from('categorias_faqs').select('*').eq('activo', true).order('orden', { ascending: true }),
          supabase
            .from('faqs')
            .select('*, categorias_faqs (nombre, icono)')
            .eq('activo', true)
            .eq('visible', true)
            .order('orden', { ascending: true }),
          supabase.from('tutoriales').select('*').eq('activo', true).eq('visible', true).order('orden', { ascending: true }),
        ]);
        setCategoriasFaqs(cats.data || []);
        setFaqs(preguntas.data || []);
        setTutoriales(tuts.data || []);
      } catch (error) {
        console.error('Error al cargar la ayuda:', error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  // Si hay sesión, el formulario ya viene con el nombre y el email
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      nombre: f.nombre || user.user_metadata?.nombre || user.user_metadata?.full_name || '',
      email: f.email || user.email || '',
    }));
  }, [user]);

  const texto = normalizar(busqueda.trim());
  const buscando = texto.length > 1;

  const guiasEncontradas = useMemo(() => {
    if (!buscando) return GUIAS;
    return GUIAS.filter((g) =>
      normalizar(`${g.titulo} ${g.resumen} ${g.palabras} ${g.pasos.join(' ')}`).includes(texto)
    );
  }, [buscando, texto]);

  const faqsFiltradas = useMemo(
    () =>
      faqs.filter((f) => {
        const enCategoria = buscando || categoriaActiva === 'todas' || f.categorias_faqs?.nombre === categoriaActiva;
        const coincide = !buscando || normalizar(`${f.pregunta} ${f.respuesta}`).includes(texto);
        return enCategoria && coincide;
      }),
    [faqs, categoriaActiva, buscando, texto]
  );

  const sinResultados = buscando && guiasEncontradas.length === 0 && faqsFiltradas.length === 0;

  const cambiarCampo = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const enviarConsulta = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setEstadoEnvio(null);
    try {
      const { error } = await supabase.from('mensajes_soporte').insert([
        {
          usuario_id: user?.id || null,
          nombre: form.nombre,
          email: form.email,
          asunto: form.asunto,
          mensaje: form.mensaje,
          estado: 'pendiente',
        },
      ]);
      if (error) throw error;

      // El servidor arma los mails (aviso a soporte + confirmación al visitante)
      const { ok } = await llamarEmail({
        tipo: 'contacto',
        origen: 'publica',
        nombre: form.nombre,
        email: form.email,
        asunto: form.asunto,
        mensaje: form.mensaje,
      });
      if (!ok) throw new Error('No se pudo enviar el mail');

      setEstadoEnvio('ok');
      setForm((f) => ({ ...f, asunto: '', mensaje: '' }));
    } catch (error) {
      console.error('Error al enviar la consulta:', error);
      setEstadoEnvio('error');
    } finally {
      setEnviando(false);
    }
  };

  const abrirTutorial = async (tutorial) => {
    try {
      await supabase.rpc('incrementar_vistas_tutorial', { tutorial_id: tutorial.id });
    } catch {
      // contar la vista no es importante
    }
    if (tutorial.url) window.open(tutorial.url, '_blank', 'noopener');
  };

  return (
    <>
      <NavbarGeneral />

      <div className="ay-pagina">
        {/* ---------- Encabezado con buscador ---------- */}
        <header className="ay-hero">
          <div className="ay-hero-interior">
            <span className="ay-etiqueta">
              <span className="material-icons">support_agent</span>
              Centro de ayuda
            </span>
            <h1>¿En qué te ayudamos?</h1>
            <p>Guías cortas, respuestas a lo que más nos preguntan y una persona del otro lado si la necesitás.</p>

            <div className="ay-buscador">
              <span className="material-icons">search</span>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Ej: cómo publico, olvidé mi contraseña…"
                aria-label="Buscar en la ayuda"
              />
              {busqueda && (
                <button type="button" onClick={() => setBusqueda('')} aria-label="Borrar búsqueda">
                  <span className="material-icons">close</span>
                </button>
              )}
            </div>

            <div className="ay-sugerencias">
              {SUGERENCIAS.map((s) => (
                <button key={s} type="button" onClick={() => setBusqueda(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="ay-contenido">
          {sinResultados ? (
            <div className="ay-vacio">
              <span className="material-icons">search_off</span>
              <h2>No encontramos «{busqueda}»</h2>
              <p>Probá con otra palabra o preguntanos directamente.</p>
              <div className="ay-vacio-acciones">
                <button type="button" className="ay-boton ay-boton-sec" onClick={() => setBusqueda('')}>
                  Ver toda la ayuda
                </button>
                <a
                  className="ay-boton ay-boton-wsp"
                  href={linkWhatsApp(`Hola GoyaNova, tengo una consulta: ${busqueda}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="material-icons">chat</span>
                  Preguntar por WhatsApp
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* ---------- Guías ---------- */}
              {guiasEncontradas.length > 0 && (
                <section className="ay-seccion" aria-labelledby="ay-guias">
                  <div className="ay-seccion-titulo">
                    <h2 id="ay-guias">{buscando ? 'Guías' : 'Guías rápidas'}</h2>
                    {!buscando && <p>Paso a paso, en menos de un minuto.</p>}
                  </div>
                  <div className="ay-guias">
                    {guiasEncontradas.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        className="ay-guia"
                        style={{ '--ay-color': g.color }}
                        onClick={() => setGuiaAbierta(g)}
                      >
                        <span className="ay-guia-icono">
                          <span className="material-icons">{g.icono}</span>
                        </span>
                        <span className="ay-guia-textos">
                          <strong>{g.titulo}</strong>
                          <span>{g.resumen}</span>
                        </span>
                        <span className="ay-guia-pie">
                          {g.instalar && yaInstalada ? 'Ya instalada ✓' : `${g.pasos.length} pasos`}
                          <span className="material-icons">arrow_forward</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* ---------- Preguntas frecuentes ---------- */}
              {!cargando && faqs.length > 0 && (buscando ? faqsFiltradas.length > 0 : true) && (
                <section className="ay-seccion" aria-labelledby="ay-faqs">
                  <div className="ay-seccion-titulo">
                    <h2 id="ay-faqs">Preguntas frecuentes</h2>
                  </div>

                  {!buscando && (
                    <div className="ay-pestanas" role="tablist">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={categoriaActiva === 'todas'}
                        className={categoriaActiva === 'todas' ? 'activa' : ''}
                        onClick={() => setCategoriaActiva('todas')}
                      >
                        Todas
                      </button>
                      {categoriasFaqs.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          role="tab"
                          aria-selected={categoriaActiva === cat.nombre}
                          className={categoriaActiva === cat.nombre ? 'activa' : ''}
                          onClick={() => setCategoriaActiva(cat.nombre)}
                        >
                          <span className="material-icons">{iconoCategoriaFaq(cat.nombre)}</span>
                          {cat.nombre}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="ay-faqs">
                    {faqsFiltradas.map((faq) => (
                      <Pregunta
                        key={faq.id}
                        faq={faq}
                        abierta={faqAbierta === faq.id}
                        onAlternar={() => setFaqAbierta(faqAbierta === faq.id ? null : faq.id)}
                      />
                    ))}
                  </div>
                </section>
              )}
              {cargando && (
                <div className="ay-cargando" aria-live="polite">
                  <span className="ay-esqueleto" />
                  <span className="ay-esqueleto" />
                  <span className="ay-esqueleto" />
                </div>
              )}

              {/* ---------- Tutoriales (si el admin cargó alguno) ---------- */}
              {!buscando && tutoriales.length > 0 && (
                <section className="ay-seccion" aria-labelledby="ay-tutoriales">
                  <div className="ay-seccion-titulo">
                    <h2 id="ay-tutoriales">Videos y tutoriales</h2>
                  </div>
                  <div className="ay-tutoriales">
                    {tutoriales.map((t) => (
                      <button key={t.id} type="button" className="ay-tutorial" onClick={() => abrirTutorial(t)}>
                        {t.thumbnail ? (
                          <img src={t.thumbnail} alt="" loading="lazy" />
                        ) : (
                          <span className="ay-tutorial-icono">
                            <span className="material-icons">{t.tipo === 'video' ? 'play_circle' : 'article'}</span>
                          </span>
                        )}
                        <span className="ay-tutorial-textos">
                          <strong>{t.titulo}</strong>
                          {t.descripcion && <span>{t.descripcion}</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* ---------- Contacto ---------- */}
          <section className="ay-seccion ay-contacto" aria-labelledby="ay-contacto">
            <div className="ay-seccion-titulo">
              <h2 id="ay-contacto">¿Necesitás hablar con alguien?</h2>
              <p>Somos de Goya y te respondemos nosotros, no un robot.</p>
            </div>

            <div className="ay-canales">
              <a
                className="ay-canal ay-canal-wsp"
                href={linkWhatsApp('Hola GoyaNova, tengo una consulta')}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="ay-canal-icono">
                  <span className="material-icons">chat</span>
                </span>
                <span className="ay-canal-textos">
                  <strong>WhatsApp</strong>
                  <span>La forma más rápida</span>
                </span>
                <span className="material-icons ay-canal-flecha">arrow_forward</span>
              </a>

              <button
                type="button"
                className={`ay-canal ${formAbierto ? 'activo' : ''}`}
                onClick={() => setFormAbierto((v) => !v)}
                aria-expanded={formAbierto}
              >
                <span className="ay-canal-icono">
                  <span className="material-icons">mail</span>
                </span>
                <span className="ay-canal-textos">
                  <strong>Escribinos un mensaje</strong>
                  <span>Te respondemos por mail en menos de 24 h</span>
                </span>
                <span className="material-icons ay-canal-flecha">{formAbierto ? 'expand_less' : 'expand_more'}</span>
              </button>

              {user && (
                <Link to="/panel/ayuda" className="ay-canal">
                  <span className="ay-canal-icono">
                    <span className="material-icons">confirmation_number</span>
                  </span>
                  <span className="ay-canal-textos">
                    <strong>Mis consultas</strong>
                    <span>Seguí tus mensajes desde tu panel</span>
                  </span>
                  <span className="material-icons ay-canal-flecha">arrow_forward</span>
                </Link>
              )}
            </div>

            {formAbierto && (
              <div className="ay-form-caja">
                {estadoEnvio === 'ok' ? (
                  <div className="ay-enviado">
                    <span className="material-icons">mark_email_read</span>
                    <h3>¡Recibimos tu mensaje!</h3>
                    <p>Te respondemos a <strong>{form.email}</strong> en menos de 24 horas.</p>
                    <button type="button" className="ay-boton ay-boton-sec" onClick={() => setEstadoEnvio(null)}>
                      Enviar otro mensaje
                    </button>
                  </div>
                ) : (
                  <form className="ay-form" onSubmit={enviarConsulta}>
                    <div className="ay-form-fila">
                      <label>
                        <span>Tu nombre</span>
                        <input name="nombre" value={form.nombre} onChange={cambiarCampo} required autoComplete="name" />
                      </label>
                      <label>
                        <span>Tu email</span>
                        <input
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={cambiarCampo}
                          required
                          autoComplete="email"
                        />
                      </label>
                    </div>
                    <label>
                      <span>Asunto</span>
                      <input
                        name="asunto"
                        value={form.asunto}
                        onChange={cambiarCampo}
                        required
                        placeholder="Ej: No puedo subir fotos"
                      />
                    </label>
                    <label>
                      <span>Contanos qué pasó</span>
                      <textarea name="mensaje" value={form.mensaje} onChange={cambiarCampo} required rows={5} />
                    </label>

                    {estadoEnvio === 'error' && (
                      <p className="ay-error" role="alert">
                        <span className="material-icons">error</span>
                        No se pudo enviar. Probá de nuevo o escribinos a {EMAIL_SOPORTE}.
                      </p>
                    )}

                    <button type="submit" className="ay-boton ay-boton-principal" disabled={enviando}>
                      <span className="material-icons">{enviando ? 'hourglass_top' : 'send'}</span>
                      {enviando ? 'Enviando…' : 'Enviar mensaje'}
                    </button>
                  </form>
                )}
              </div>
            )}

            <p className="ay-email-directo">
              También podés escribir a <a href={`mailto:${EMAIL_SOPORTE}`}>{EMAIL_SOPORTE}</a>
            </p>
          </section>
        </main>
      </div>

      {guiaAbierta && <VentanaGuia guia={guiaAbierta} onCerrar={cerrarGuia} />}
    </>
  );
};

export default AyudaPublica;
