import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Contacto.css';
import NavbarGeneral from '../home/NavbarGeneral';

const Contacto = () => {
  const [form, setForm] = useState({ nombre: '', email: '', mensaje: '' });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');

    try {
      const response = await fetch('/.netlify/functions/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        setEnviado(true);
        setForm({ nombre: '', email: '', mensaje: '' });
        setTimeout(() => setEnviado(false), 5000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al enviar');
      }
    } catch (error) {
      console.error('Error al enviar el formulario de contacto:', error);
      setError('Hubo un error al enviar el mensaje. Por favor, intenta de nuevo o escríbenos directamente al email.');
    } finally {
      setEnviando(false);
    }
  };

  const contactInfo = [
    { 
      icon: 'phone', 
      label: 'WhatsApp', 
      value: '+54 3777 59-9800', 
      href: 'https://wa.me/5493777599800',
      description: 'Te respondemos a la brevedad'
    },
    { 
      icon: 'email', 
      label: 'Email', 
      value: 'goyanovasoporte@gmail.com', 
      href: 'mailto:goyanovasoporte@gmail.com',
      description: 'Te respondemos dentro de las 24-48 horas hábiles'
    },
    { 
      icon: 'location_on', 
      label: 'Ubicación', 
      value: 'Goya, Corrientes, Argentina', 
      href: '#',
      description: 'Equipo con base en Goya, Corrientes'
    },
  ];

  return (
    <div className="contacto-page">
      <NavbarGeneral />

      {/* Contenido Principal */}
      <div className="contacto-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="material-icons">waving_hand</span>
              <span>Estamos aquí para ayudarte</span>
            </div>
            <h1 className="hero-title">
              Conectemos y conversemos
            </h1>
            <p className="hero-description">
              Somos el equipo de GoyaNova, trabajando en la plataforma de servicios locales de Goya. Si tenés dudas, sugerencias o querés colaborar con el proyecto, no dudes en contactarnos. Toda idea y comentario es bienvenido.
            </p>
          </div>
          <div className="hero-decoration">
            <div className="decoration-circle circle-1"></div>
            <div className="decoration-circle circle-2"></div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="contact-main-section">
          <div className="contact-grid">
            {/* Contact Info Cards */}
            <div className="contact-info-container">
              <h2 className="section-title">Formas de Contacto</h2>
              <p className="section-subtitle">Elegí la forma que prefieras para comunicarte</p>
              
              <div className="info-cards">
                {contactInfo.map((info, index) => (
                  <a 
                    key={index} 
                    href={info.href}
                    className="info-card"
                    onClick={(e) => info.href === '#' && e.preventDefault()}
                  >
                    <div className="info-icon-wrapper">
                      <span className="material-icons info-icon">{info.icon}</span>
                    </div>
                    <div className="info-text">
                      <h3 className="info-label">{info.label}</h3>
                      <p className="info-value">{info.value}</p>
                      <p className="info-description">{info.description}</p>
                    </div>
                    {info.href !== '#' && (
                      <span className="material-icons info-arrow">arrow_forward</span>
                    )}
                  </a>
                ))}
              </div>

              {/* Hours Card */}
              <div className="hours-card">
                <div className="hours-icon-wrapper">
                  <span className="material-icons">schedule</span>
                </div>
                <div className="hours-content">
                  <h3 className="hours-title">Horario de Atención</h3>
                  <p className="hours-text">
                    Atendemos de lunes a viernes de 9:00 a 13:00 hs y de 15:00 a 19:00 hs (hora Argentina). 
                    Fuera de ese horario, podés dejarnos tu mensaje y te responderemos en la próxima franja disponible.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="contact-form-container">
              <div className="form-header">
                <h2 className="form-title">Envianos un Mensaje</h2>
                <p className="form-subtitle">Completá el formulario y te responderemos a la brevedad</p>
              </div>

              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="nombre" className="form-label">
                    <span className="material-icons label-icon">person</span>
                    <span className="label-text">Nombre Completo</span>
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    className="form-input"
                    placeholder="Ej: Juan Pérez"
                    value={form.nombre}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    <span className="material-icons label-icon">email</span>
                    <span className="label-text">Correo Electrónico</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="form-input"
                    placeholder="tu@email.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="mensaje" className="form-label">
                    <span className="material-icons label-icon">message</span>
                    <span className="label-text">Mensaje</span>
                  </label>
                  <textarea
                    id="mensaje"
                    name="mensaje"
                    className="form-textarea"
                    placeholder="Contanos qué necesitás..."
                    value={form.mensaje}
                    onChange={handleChange}
                    rows={6}
                    required
                  />
                </div>

                <button type="submit" className="form-submit-btn" disabled={enviando}>
                  {enviando ? (
                    <>
                      <span className="material-icons spinner-icon">refresh</span>
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-icons">send</span>
                      <span>Enviar Mensaje</span>
                    </>
                  )}
                </button>

                {enviado && (
                  <div className="success-message">
                    <span className="material-icons">check_circle</span>
                    <span>¡Mensaje enviado! Te responderemos a la brevedad.</span>
                  </div>
                )}

                {error && (
                  <div className="error-message">
                    <span className="material-icons">error</span>
                    <span>{error}</span>
                  </div>
                )}
              </form>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="faq-section">
          <h2 className="faq-title">Preguntas Frecuentes</h2>
          <div className="faq-grid">
            <div className="faq-card">
              <span className="material-icons faq-icon">schedule</span>
              <h3>¿Cuánto tardan en responder?</h3>
              <p>Dentro de nuestro horario de atención (9 a 13 y 15 a 19 hs) respondemos a la brevedad. Si es urgente, escribinos por WhatsApp.</p>
            </div>
            <div className="faq-card">
              <span className="material-icons faq-icon">local_offer</span>
              <h3>¿GoyaNova es gratis?</h3>
              <p>Sí, es completamente gratis para usuarios. Hay membresías premium opcionales para destacar servicios.</p>
            </div>
            <div className="faq-card">
              <span className="material-icons faq-icon">lightbulb</span>
              <h3>¿Puedo sugerir mejoras?</h3>
              <p>¡Por supuesto! Valoramos mucho el feedback de la comunidad. Cada sugerencia nos ayuda a mejorar la plataforma.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Contacto;