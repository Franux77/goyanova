import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import './AyudaSoporte.css';
import Loading from '../../loading/Loading';

const AyudaSoporte = () => {
  const [busqueda, setBusqueda] = useState('');
  const [expandido, setExpandido] = useState(null);
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [mostrarTutoriales, setMostrarTutoriales] = useState(true);
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
      const { data: cats, error: errorCats } = await supabase
        .from('categorias_faqs')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (errorCats) throw errorCats;
      setCategoriasFaqs(cats || []);

      // Cargar FAQs
      const { data: faqsData, error: errorFaqs } = await supabase
        .from('faqs')
        .select(`
          *,
          categorias_faqs (
            nombre,
            icono
          )
        `)
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (errorFaqs) throw errorFaqs;
      setFaqs(faqsData || []);

      // Cargar tutoriales
      const { data: tutData, error: errorTut } = await supabase
        .from('tutoriales')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (errorTut) throw errorTut;
      setTutoriales(tutData || []);

    } catch (error) {
      // console.error('Error al cargar datos:', error);
      setMensajeEstado({
        tipo: 'error',
        mensaje: 'Error al cargar la información. Por favor, recarga la página.'
      });
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
          sender: {
            name: 'GoyaNova Ayuda',
            email: BREVO_SENDER,
          },
          to: [
            {
              email: BREVO_SENDER,
              name: 'Soporte GoyaNova',
            },
          ],
          subject: `[Ayuda] ${datos.asunto}`,
          htmlContent: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                .ayuda-container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .ayuda-header { background: linear-gradient(135deg, #1774f6 0%, #0d5dd9 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .ayuda-header h1 { margin: 0; font-size: 24px; }
                .ayuda-content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
                .ayuda-field { margin-bottom: 20px; }
                .ayuda-field-label { font-weight: 600; color: #1774f6; margin-bottom: 5px; }
                .ayuda-field-value { background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 3px solid #1774f6; }
                .ayuda-footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
                .ayuda-info-box { background: #e3f2fd; border-left: 4px solid #1774f6; padding: 15px; margin-top: 20px; border-radius: 4px; }
              </style>
            </head>
            <body>
              <div class="ayuda-container">
                <div class="ayuda-header">
                  <h1>🆘 Nueva Consulta de Ayuda</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Centro de Soporte - Panel Usuario</p>
                </div>
                
                <div class="ayuda-content">
                  <div class="ayuda-field">
                    <div class="ayuda-field-label">👤 Nombre del Usuario:</div>
                    <div class="ayuda-field-value">${datos.nombre}</div>
                  </div>
                  
                  <div class="ayuda-field">
                    <div class="ayuda-field-label">📧 Email de Contacto:</div>
                    <div class="ayuda-field-value">${datos.email}</div>
                  </div>
                  
                  <div class="ayuda-field">
                    <div class="ayuda-field-label">📋 Asunto:</div>
                    <div class="ayuda-field-value">${datos.asunto}</div>
                  </div>
                  
                  <div class="ayuda-field">
                    <div class="ayuda-field-label">💬 Mensaje:</div>
                    <div class="ayuda-field-value">${datos.mensaje.replace(/\n/g, '<br>')}</div>
                  </div>
                  
                  <div class="ayuda-info-box">
                    <strong>ℹ️ Información adicional:</strong><br>
                    Fecha: ${new Date().toLocaleString('es-AR')}<br>
                    Origen: Panel de Usuario - Sección Ayuda y Soporte
                  </div>
                </div>
                
                <div class="ayuda-footer">
                  <p><strong>GoyaNova</strong></p>
                  <p>Este email fue enviado automáticamente desde el Centro de Ayuda</p>
                  <p style="color: #999; margin-top: 10px;">Por favor, responde directamente a ${datos.email}</p>
                </div>
              </div>
            </body>
            </html>
          `,
          replyTo: {
            email: datos.email,
            name: datos.nombre,
          }
        }),
      });

      if (response.ok) {
        // Email de confirmación al usuario
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
                email: datos.email,
                name: datos.nombre,
              }
            ],
            subject: 'Recibimos tu consulta - GoyaNova',
            htmlContent: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <style>
                  body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                  .ayuda-container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .ayuda-header { background: linear-gradient(135deg, #1774f6 0%, #0d5dd9 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                  .ayuda-content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
                  .ayuda-success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
                  .ayuda-message { text-align: center; font-size: 16px; margin: 20px 0; }
                  .ayuda-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                  .ayuda-footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
                  .ayuda-btn { display: inline-block; background: #1774f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                </style>
              </head>
              <body>
                <div class="ayuda-container">
                  <div class="ayuda-header">
                    <h1>✅ Consulta Recibida</h1>
                  </div>
                  
                  <div class="ayuda-content">
                    <div class="ayuda-success-icon">✓</div>
                    
                    <div class="ayuda-message">
                      <h2 style="color: #1774f6; margin-bottom: 10px;">¡Hola ${datos.nombre}!</h2>
                      <p>Hemos recibido tu consulta y nuestro equipo la está revisando.</p>
                      <p><strong>Te responderemos en menos de 24 horas.</strong></p>
                    </div>
                    
                    <div class="ayuda-details">
                      <h3 style="color: #1774f6; margin-top: 0;">📋 Resumen de tu consulta:</h3>
                      <p><strong>Asunto:</strong> ${datos.asunto}</p>
                      <p><strong>Mensaje:</strong></p>
                      <p style="background: white; padding: 15px; border-radius: 6px; border-left: 3px solid #1774f6;">${datos.mensaje.replace(/\n/g, '<br>')}</p>
                      <p style="font-size: 12px; color: #666; margin-top: 15px;">Enviado el: ${new Date().toLocaleString('es-AR')}</p>
                    </div>
                    
                    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 20px; border-radius: 4px;">
                      <strong>💡 Consejo:</strong> Revisá tu carpeta de spam por si nuestra respuesta llega ahí.
                    </div>
                  </div>
                  
                  <div class="ayuda-footer">
                    <p><strong>GoyaNova</strong></p>
                    <p>Equipo de Soporte</p>
                    <p style="margin-top: 10px;">📧 ${BREVO_SENDER}</p>
                  </div>
                </div>
              </body>
              </html>
            `
          }),
        });

        return true;
      } else {
        throw new Error('Error al enviar email');
      }
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
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();

      // Guardar en base de datos
      const { error: dbError } = await supabase
        .from('mensajes_soporte')
        .insert([
          {
            usuario_id: user?.id || null,
            nombre: form.nombre,
            email: form.email,
            asunto: form.asunto,
            mensaje: form.mensaje,
            estado: 'pendiente'
          }
        ]);

      if (dbError) throw dbError;

      // Enviar emails con Brevo
      const emailEnviado = await enviarEmailBrevo(form);

      if (emailEnviado) {
        setMensajeEstado({
          tipo: 'exito',
          mensaje: '¡Mensaje enviado con éxito! Te responderemos en menos de 24 horas.'
        });
        setForm({ nombre: '', email: '', asunto: '', mensaje: '' });
      } else {
        throw new Error('Error al enviar email');
      }

    } catch (error) {
      console.error('Error:', error);
      setMensajeEstado({
        tipo: 'error',
        mensaje: 'Hubo un error al enviar el mensaje. Por favor, intenta de nuevo o escríbenos directamente a goyanovasoporte@gmail.com'
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
    // Incrementar vistas
    try {
      await supabase.rpc('incrementar_vistas_tutorial', { tutorial_id: tutorial.id });
    } catch (error) {
      console.error('Error al incrementar vistas:', error);
    }
    
    window.open(tutorial.url, '_blank');
  };

  const faqsFiltradas = faqs.filter(faq => {
    const categoriaMatch = categoriaActiva === 'todas' || 
      faq.categorias_faqs?.nombre === categoriaActiva;
    
    const busquedaMatch = !busqueda || 
      faq.pregunta.toLowerCase().includes(busqueda.toLowerCase()) ||
      faq.respuesta.toLowerCase().includes(busqueda.toLowerCase());
    
    return categoriaMatch && busquedaMatch;
  });

  // Agrupar FAQs por categoría
  const faqsAgrupadas = faqsFiltradas.reduce((acc, faq) => {
    const catNombre = faq.categorias_faqs?.nombre || 'Sin categoría';
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
    <div className="ayuda-soporte-container">
      {/* Header */}
      <div className="ayuda-soporte-header">
        <span className="material-icons ayuda-soporte-header-icon">help_center</span>
        <h1 className="ayuda-soporte-titulo">Centro de Ayuda y Soporte</h1>
        <p className="ayuda-soporte-subtitulo">Encontrá respuestas rápidas o contactanos para ayuda personalizada</p>
      </div>

      {/* Buscador */}
      <div className="ayuda-soporte-buscador-wrapper">
        <span className="material-icons ayuda-soporte-buscador-icon">search</span>
        <input
          type="search"
          placeholder="Buscá tu pregunta..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="ayuda-soporte-buscador"
        />
      </div>

      {/* Filtros de Categoría */}
      <div className="ayuda-soporte-categorias">
        <button
          onClick={() => setCategoriaActiva('todas')}
          className={`ayuda-soporte-btn-categoria ${categoriaActiva === 'todas' ? 'ayuda-soporte-btn-categoria-activa' : ''}`}
        >
          Todas
        </button>
        {categoriasFaqs.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategoriaActiva(cat.nombre)}
            className={`ayuda-soporte-btn-categoria ${categoriaActiva === cat.nombre ? 'ayuda-soporte-btn-categoria-activa' : ''}`}
          >
            {cat.icono} {cat.nombre}
          </button>
        ))}
      </div>

      {/* FAQs */}
      <div className="ayuda-soporte-seccion">
        <div className="ayuda-soporte-seccion-header">
          <span className="material-icons ayuda-soporte-seccion-icon">book</span>
          <h2 className="ayuda-soporte-seccion-titulo">Preguntas Frecuentes</h2>
        </div>

        {Object.keys(faqsAgrupadas).length === 0 ? (
          <p className="ayuda-soporte-no-resultados">No se encontraron resultados para "{busqueda}"</p>
        ) : (
          Object.values(faqsAgrupadas).map((categoria, idx) => (
            <div key={idx} className="ayuda-soporte-categoria-grupo">
              <h3 className="ayuda-soporte-categoria-titulo">
                <span className="ayuda-soporte-categoria-icono">{categoria.icono}</span>
                {categoria.nombre}
              </h3>
              
              {categoria.preguntas.map(pregunta => (
                <div key={pregunta.id} className="ayuda-soporte-faq-item">
                  <button
                    onClick={() => togglePregunta(pregunta.id)}
                    className="ayuda-soporte-faq-pregunta"
                  >
                    <span className="ayuda-soporte-faq-pregunta-texto">{pregunta.pregunta}</span>
                    <span className="material-icons ayuda-soporte-faq-icono">
                      {expandido === pregunta.id ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                  
                  {expandido === pregunta.id && (
                    <div className="ayuda-soporte-faq-respuesta">
                      {pregunta.respuesta}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Tutoriales */}
      <div className="ayuda-soporte-seccion">
        <div className="ayuda-soporte-seccion-header">
          <span className="material-icons ayuda-soporte-seccion-icon">video_library</span>
          <h2 className="ayuda-soporte-seccion-titulo">Tutoriales y Guías</h2>
          <button
            onClick={() => setMostrarTutoriales(!mostrarTutoriales)}
            className="ayuda-soporte-btn-toggle"
          >
            {mostrarTutoriales ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        {mostrarTutoriales && (
          <div className="ayuda-soporte-tutoriales-grid">
            {tutoriales.map(tutorial => (
              <div key={tutorial.id} className="ayuda-soporte-tutorial-card">
                <div className="ayuda-soporte-tutorial-thumbnail">
                  <img 
                    src={tutorial.thumbnail} 
                    alt={tutorial.titulo}
                    className="ayuda-soporte-tutorial-imagen"
                  />
                  <div className="ayuda-soporte-tutorial-overlay">
                    <span className="material-icons ayuda-soporte-play-icon">
                      {tutorial.tipo === 'video' ? 'play_circle' : 'description'}
                    </span>
                    <span className="ayuda-soporte-duracion">
                      {tutorial.tipo === 'video' ? tutorial.duracion : tutorial.paginas}
                    </span>
                  </div>
                </div>
                <div className="ayuda-soporte-tutorial-contenido">
                  <h4 className="ayuda-soporte-tutorial-titulo">{tutorial.titulo}</h4>
                  <p className="ayuda-soporte-tutorial-descripcion">{tutorial.descripcion}</p>
                  <button 
                    onClick={() => abrirTutorial(tutorial)}
                    className="ayuda-soporte-btn-ver-tutorial"
                  >
                    <span className="material-icons">
                      {tutorial.tipo === 'video' ? 'play_arrow' : 'article'}
                    </span>
                    {tutorial.tipo === 'video' ? 'Ver video' : 'Ver documento'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formulario de Contacto */}
      <div className="ayuda-soporte-seccion">
        <div className="ayuda-soporte-seccion-header">
          <span className="material-icons ayuda-soporte-seccion-icon">mail</span>
          <h2 className="ayuda-soporte-seccion-titulo">¿Necesitás más ayuda?</h2>
        </div>

        <p className="ayuda-soporte-contacto-intro">
          Si no encontraste la respuesta que buscabas, completá el formulario y nuestro equipo te responderá en menos de 24 horas.
        </p>

        {mensajeEstado && (
          <div className={`ayuda-soporte-mensaje-estado ${mensajeEstado.tipo === 'exito' ? 'ayuda-soporte-mensaje-exito' : 'ayuda-soporte-mensaje-error'}`}>
            <span className="material-icons ayuda-soporte-mensaje-icono">
              {mensajeEstado.tipo === 'exito' ? 'check_circle' : 'error'}
            </span>
            <span>{mensajeEstado.mensaje}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="ayuda-soporte-formulario">
          <div className="ayuda-soporte-form-row">
            <div className="ayuda-soporte-form-group">
              <label className="ayuda-soporte-label">
                <span className="material-icons ayuda-soporte-label-icon">person</span>
                Nombre completo
              </label>
              <input
                type="text"
                name="nombre"
                placeholder="Tu nombre"
                value={form.nombre}
                onChange={handleChange}
                required
                className="ayuda-soporte-input"
              />
            </div>

            <div className="ayuda-soporte-form-group">
              <label className="ayuda-soporte-label">
                <span className="material-icons ayuda-soporte-label-icon">email</span>
                Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={handleChange}
                required
                className="ayuda-soporte-input"
              />
            </div>
          </div>

          <div className="ayuda-soporte-form-group">
            <label className="ayuda-soporte-label">
              <span className="material-icons ayuda-soporte-label-icon">subject</span>
              Asunto
            </label>
            <input
              type="text"
              name="asunto"
              placeholder="¿En qué podemos ayudarte?"
              value={form.asunto}
              onChange={handleChange}
              required
              className="ayuda-soporte-input"
            />
          </div>

          <div className="ayuda-soporte-form-group">
            <label className="ayuda-soporte-label">
              <span className="material-icons ayuda-soporte-label-icon">message</span>
              Mensaje
            </label>
            <textarea
              name="mensaje"
              placeholder="Describí tu consulta con el mayor detalle posible..."
              value={form.mensaje}
              onChange={handleChange}
              required
              rows={6}
              className="ayuda-soporte-textarea"
            />
          </div>

          <button 
            type="submit" 
            className={`ayuda-soporte-btn-enviar ${enviando ? 'ayuda-soporte-btn-enviando' : ''}`}
            disabled={enviando}
          >
            {enviando ? (
              <>
                <span className="material-icons ayuda-soporte-spinner-icon">refresh</span>
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

        <div className="ayuda-soporte-contacto-alternativo">
          <p className="ayuda-soporte-contacto-texto">
            También podés escribirnos directamente a
          </p>
          <a href="mailto:goyanovasoporte@gmail.com" className="ayuda-soporte-email-link">
            <span className="material-icons">email</span>
            goyanovasoporte@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default AyudaSoporte;