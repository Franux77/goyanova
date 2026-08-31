import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Contacto.css';

const Contacto = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', email: '', mensaje: '' });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');
  const navRef = useRef();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [menuOpen]);

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

  const handleVolverClick = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navLinks = [
    { to: '/', label: 'Inicio', icon: 'home' },
    { to: '/nosotros', label: 'Nosotros', icon: 'group' },
    { to: '/explorar', label: 'Mapa', icon: 'map' },
    { to: '/panel/dashboard', label: 'Mi Cuenta', icon: 'dashboard' },
  ];

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
      <nav ref={navRef} className={`navbar-contacto ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="navbar-container">
          <button className="navbar-back-btn" onClick={handleVolverClick} aria-label="Volver">
            <span className="material-icons">arrow_back</span>
            <span className="back-label">Volver</span>
          </button>

          <ul className="navbar-links-desktop">
            {navLinks.map((link) => (
              <li key={link.to} className="nav-item">
                <Link 
                  to={link.to}
                  className={`nav-link ${location.pathname === link.to ? 'nav-link-active' : ''}`}
                >
                  <span className="material-icons nav-link-icon">{link.icon}</span>
                  <span className="nav-link-text">{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          <button
            className={`navbar-hamburger ${menuOpen ? 'hamburger-active' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menú"
          >
            <span className="hamburger-linee"></span>
            <span className="hamburger-linee"></span>
            <span className="hamburger-linee"></span>
          </button>
        </div>
      </nav>

      {/* Menú móvil */}
      <div className={`mobile-sidebar ${menuOpen ? 'mobile-sidebar-open' : ''}`}>
        <div className="mobile-sidebar-header">
          <div className="sidebar-brand">
            <span className="material-icons brand-icon-mobile">menu_book</span>
            <h3>Navegación</h3>
          </div>
          <button 
            className="sidebar-close-btn"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <ul className="mobile-sidebar-links">
          {navLinks.map((link) => (
            <li key={link.to} className="mobile-nav-item">
              <Link 
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`mobile-nav-link ${location.pathname === link.to ? 'mobile-nav-active' : ''}`}
              >
                <span className="material-icons mobile-nav-icon">{link.icon}</span>
                <span className="mobile-nav-text">{link.label}</span>
                <span className="material-icons mobile-nav-arrow">chevron_right</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div 
        className={`navbar-overlay ${menuOpen ? 'navbar-overlay-visible' : ''}`}
        onClick={() => setMenuOpen(false)}
      />

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