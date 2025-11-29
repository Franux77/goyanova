import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../auth/useAuth';
import NavbarGeneral from '../home/NavbarGeneral'; // 🔥 Importar aquí
import Loading from '../loading/Loading';
import './AyudaPublica.css';

const AyudaPublica = () => {
  const { user } = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const [expandido, setExpandido] = useState(null);
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [categoriasFaqs, setCategoriasFaqs] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [tutoriales, setTutoriales] = useState([]);
  const [form, setForm] = useState({ nombre: '', email: '', asunto: '', mensaje: '' });
  const [enviando, setEnviando] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);

      // Cargar categorías
      const { data: cats } = await supabase
        .from('categorias_faqs')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true });

      setCategoriasFaqs(cats || []);

      // Cargar FAQs - Solo las visibles públicamente
      const { data: faqsData } = await supabase
        .from('faqs')
        .select(`
          *,
          categorias_faqs (
            nombre,
            icono
          )
        `)
        .eq('activo', true)
        .eq('visible', true)
        .order('orden', { ascending: true });

      setFaqs(faqsData || []);

      // Cargar tutoriales - Solo los visibles públicamente
      const { data: tutData } = await supabase
        .from('tutoriales')
        .select('*')
        .eq('activo', true)
        .eq('visible', true)
        .order('orden', { ascending: true });

      setTutoriales(tutData || []);

    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const enviarEmailBrevo = async (datos) => {
    const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY;
    const BREVO_SENDER = import.meta.env.VITE_BREVO_SENDER_EMAIL || 'goyanovasoporte@gmail.com';

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: 'GoyaNova Ayuda', email: BREVO_SENDER },
          to: [{ email: BREVO_SENDER, name: 'Soporte GoyaNova' }],
          subject: `[Ayuda Pública] ${datos.asunto}`,
          htmlContent: `
            <h2>Nueva Consulta desde Ayuda Pública</h2>
            <p><strong>Nombre:</strong> ${datos.nombre}</p>
            <p><strong>Email:</strong> ${datos.email}</p>
            <p><strong>Asunto:</strong> ${datos.asunto}</p>
            <p><strong>Mensaje:</strong></p>
            <p>${datos.mensaje.replace(/\n/g, '<br>')}</p>
            <p><em>Usuario ${user ? 'logueado' : 'no logueado'}</em></p>
          `,
          replyTo: { email: datos.email, name: datos.nombre }
        }),
      });

      if (response.ok) {
        // Email confirmación al usuario
        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'api-key': BREVO_API_KEY,
          },
          body: JSON.stringify({
            sender: { name: 'Soporte GoyaNova', email: BREVO_SENDER },
            to: [{ email: datos.email, name: datos.nombre }],
            subject: 'Recibimos tu consulta - GoyaNova',
            htmlContent: `
              <h2>¡Hola ${datos.nombre}!</h2>
              <p>Hemos recibido tu consulta y te responderemos en menos de 24 horas.</p>
              <h3>Resumen:</h3>
              <p><strong>Asunto:</strong> ${datos.asunto}</p>
              <p><strong>Mensaje:</strong> ${datos.mensaje}</p>
            `
          }),
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error Brevo:', error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setMensajeEstado(null);

    try {
      // Guardar en base de datos
      const { error: dbError } = await supabase
        .from('mensajes_soporte')
        .insert([{
          usuario_id: user?.id || null,
          nombre: form.nombre,
          email: form.email,
          asunto: form.asunto,
          mensaje: form.mensaje,
          estado: 'pendiente'
        }]);

      if (dbError) throw dbError;

      // Enviar email
      const emailEnviado = await enviarEmailBrevo(form);

      if (emailEnviado) {
        setMensajeEstado({
          tipo: 'exito',
          mensaje: '¡Mensaje enviado! Te responderemos en menos de 24 horas.'
        });
        setForm({ nombre: '', email: '', asunto: '', mensaje: '' });
      } else {
        throw new Error('Error al enviar email');
      }
    } catch (error) {
      console.error('Error:', error);
      setMensajeEstado({
        tipo: 'error',
        mensaje: 'Error al enviar. Intenta de nuevo o escríbenos a goyanovasoporte@gmail.com'
      });
    } finally {
      setEnviando(false);
      setTimeout(() => setMensajeEstado(null), 5000);
    }
  };

  const togglePregunta = (id) => {
    setExpandido(expandido === id ? null : id);
  };

  const abrirTutorial = async (tutorial) => {
    try {
      await supabase.rpc('incrementar_vistas_tutorial', { tutorial_id: tutorial.id });
    } catch (error) {
      console.error('Error al incrementar vistas:', error);
    }
    
    if (tutorial.url) {
      window.open(tutorial.url, '_blank');
    }
  };

  const faqsFiltradas = faqs.filter(faq => {
    const categoriaMatch = categoriaActiva === 'todas' || 
      faq.categorias_faqs?.nombre === categoriaActiva;
    
    const busquedaMatch = !busqueda || 
      faq.pregunta.toLowerCase().includes(busqueda.toLowerCase()) ||
      faq.respuesta.toLowerCase().includes(busqueda.toLowerCase());
    
    return categoriaMatch && busquedaMatch;
  });

  const faqsAgrupadas = faqsFiltradas.reduce((acc, faq) => {
    const catNombre = faq.categorias_faqs?.nombre || 'General';
    if (!acc[catNombre]) {
      acc[catNombre] = {
        nombre: catNombre,
        icono: faq.categorias_faqs?.icono || '📋',
        preguntas: []
      };
    }
    acc[catNombre].preguntas.push(faq);
    return acc;
  }, {});

  if (cargando) {
    return <Loading message="Cargando centro de ayuda..." />;
  }

  return (
    <>
      {/* 🔥 NavbarGeneral SOLO aquí */}
      <NavbarGeneral />
      
      <div className="ayuda-publica-page">
        
        {/* Hero */}
        <section className="ayuda-hero">
          <div className="ayuda-hero-content">
            <span className="material-icons ayuda-hero-icon">help_center</span>
            <h1>¿Cómo podemos ayudarte?</h1>
            <p>Encontrá respuestas, guías y tutoriales para usar GoyaNova</p>
            {user && (
              <Link to="/panel/ayuda" className="ayuda-link-panel">
                <span className="material-icons">dashboard</span>
                Ir a mi Centro de Ayuda
              </Link>
            )}
          </div>
        </section>

        <div className="ayuda-container">
          
          {/* Accesos Rápidos */}
          <section className="ayuda-quick-access">
            <div className="quick-card">
              <span className="material-icons">person_add</span>
              <h3>Registrá tu servicio</h3>
              <p>Aprendé a publicar en 5 minutos</p>
              <a href="#tutoriales" className="quick-link">Ver tutorial →</a>
            </div>
            
            <div className="quick-card">
              <span className="material-icons">search</span>
              <h3>Buscá profesionales</h3>
              <p>Encontrá lo que necesitás</p>
              <a href="#faqs" className="quick-link">Ver guía →</a>
            </div>
            
            <div className="quick-card">
              <span className="material-icons">email</span>
              <h3>Ayuda personalizada</h3>
              <p>Respuesta en 24 horas</p>
              <Link to="/contacto" className="quick-link">Contactar →</Link>
            </div>
          </section>

          {/* Buscador */}
          <div className="ayuda-buscador-wrapper">
            <span className="material-icons ayuda-buscador-icon">search</span>
            <input
              type="search"
              placeholder="Buscá tu pregunta..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="ayuda-buscador"
            />
          </div>

          {/* Filtros */}
          <div className="ayuda-categorias">
            <button
              onClick={() => setCategoriaActiva('todas')}
              className={`ayuda-btn-categoria ${categoriaActiva === 'todas' ? 'activa' : ''}`}
            >
              Todas
            </button>
            {categoriasFaqs.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoriaActiva(cat.nombre)}
                className={`ayuda-btn-categoria ${categoriaActiva === cat.nombre ? 'activa' : ''}`}
              >
                {cat.icono} {cat.nombre}
              </button>
            ))}
          </div>

          {/* FAQs */}
          <section id="faqs" className="ayuda-section">
            <div className="section-header">
              <span className="material-icons">quiz</span>
              <h2>Preguntas Frecuentes</h2>
            </div>
            
            {Object.keys(faqsAgrupadas).length === 0 ? (
              <p className="no-content">No se encontraron resultados para "{busqueda}"</p>
            ) : (
              Object.values(faqsAgrupadas).map((categoria, idx) => (
                <div key={idx} className="ayuda-categoria-grupo">
                  <h3 className="ayuda-categoria-titulo">
                    <span>{categoria.icono}</span>
                    {categoria.nombre}
                  </h3>
                  
                  {categoria.preguntas.map(pregunta => (
                    <div key={pregunta.id} className="faq-item">
                      <button
                        onClick={() => togglePregunta(pregunta.id)}
                        className="faq-question"
                      >
                        <span>{pregunta.pregunta}</span>
                        <span className="material-icons">
                          {expandido === pregunta.id ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>
                      
                      {expandido === pregunta.id && (
                        <div className="faq-answer">
                          <p>{pregunta.respuesta}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </section>

          {/* Tutoriales */}
          <section id="tutoriales" className="ayuda-section">
            <div className="section-header">
              <span className="material-icons">school</span>
              <h2>Tutoriales y Guías</h2>
            </div>
            
            {tutoriales.length === 0 ? (
              <p className="no-content">No hay tutoriales disponibles.</p>
            ) : (
              <div className="tutoriales-grid">
                {tutoriales.map(tutorial => (
                  <div key={tutorial.id} className="tutorial-card">
                    <div className="tutorial-thumbnail">
                      {tutorial.thumbnail ? (
                        <img src={tutorial.thumbnail} alt={tutorial.titulo} />
                      ) : (
                        <div className="tutorial-placeholder">
                          <span className="material-icons">
                            {tutorial.tipo === 'video' ? 'play_circle' : 'description'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="tutorial-content">
                      <h3>{tutorial.titulo}</h3>
                      <p>{tutorial.descripcion}</p>
                      <button 
                        onClick={() => abrirTutorial(tutorial)}
                        className="btn-ver-tutorial"
                      >
                        <span className="material-icons">
                          {tutorial.tipo === 'video' ? 'play_arrow' : 'article'}
                        </span>
                        {tutorial.tipo === 'video' ? 'Ver video' : 'Leer guía'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Formulario */}
          <section className="ayuda-section">
            <div className="section-header">
              <span className="material-icons">mail</span>
              <h2>¿Necesitás más ayuda?</h2>
            </div>

            <p className="ayuda-intro">
              Completá el formulario y te responderemos en menos de 24 horas.
            </p>

            {mensajeEstado && (
              <div className={`mensaje-estado ${mensajeEstado.tipo}`}>
                <span className="material-icons">
                  {mensajeEstado.tipo === 'exito' ? 'check_circle' : 'error'}
                </span>
                <span>{mensajeEstado.mensaje}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="ayuda-form">
              <div className="form-row">
                <div className="form-group">
                  <label>
                    <span className="material-icons">person</span>
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    <span className="material-icons">email</span>
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  <span className="material-icons">subject</span>
                  Asunto
                </label>
                <input
                  type="text"
                  name="asunto"
                  value={form.asunto}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <span className="material-icons">message</span>
                  Mensaje
                </label>
                <textarea
                  name="mensaje"
                  value={form.mensaje}
                  onChange={handleChange}
                  required
                  rows={6}
                />
              </div>

              <button type="submit" className="btn-enviar" disabled={enviando}>
                {enviando ? (
                  <>
                    <span className="material-icons spinning">refresh</span>
                    Enviando...
                  </>
                ) : (
                  <>
                    <span className="material-icons">send</span>
                    Enviar mensaje
                  </>
                )}
              </button>
            </form>

            <div className="contacto-alternativo">
              <p>O escríbenos directamente a:</p>
              <a href="mailto:goyanovasoporte@gmail.com">
                <span className="material-icons">email</span>
                goyanovasoporte@gmail.com
              </a>
            </div>
          </section>

        </div>
      </div>
    </>
  );
};

export default AyudaPublica;