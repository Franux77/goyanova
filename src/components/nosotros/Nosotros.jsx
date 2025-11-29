import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Nosotros.css';
import ComentariosProyecto from '../ComentariosProyecto/ComentariosProyecto';

const Nosotros = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
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
    { to: '/explorar', label: 'Mapa', icon: 'map' },
    { to: '/contacto', label: 'Contacto', icon: 'phone_in_talk' },
    { to: '/panel/dashboard', label: 'Mi Panel', icon: 'dashboard' },
  ];

  return (
    <div className="nosotros-page">
      <nav ref={navRef} className={`navbar-nosotros ${scrolled ? 'navbar-scrolled' : ''}`}>
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
      <div className="nosotros-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="material-icons">emoji_people</span>
              <span>La historia detrás de GoyaNova</span>
            </div>
            <h1 className="hero-title">
              Un Proyecto
              <span className="hero-gradient"> Goyano</span>
            </h1>
            <p className="hero-description">
              GoyaNova nació de la necesidad de conectar a la gente de Goya de forma directa y sin complicaciones. Un joven desarrollador con pasión por la tecnología y ganas de innovar.
            </p>
          </div>
          <div className="hero-decoration">
            <div className="decoration-circle circle-1"></div>
            <div className="decoration-circle circle-2"></div>
            <div className="decoration-circle circle-3"></div>
          </div>
        </section>

        {/* Historia Personal */}
        <section className="story-section">
          <div className="story-container">
            <div className="story-card">
              <div className="story-icon-wrapper">
                <span className="material-icons">lightbulb</span>
              </div>
              <h2>¿Cómo empezó todo?</h2>
              <p>
                Soy un joven de Goya de poco más de 20 años. Hace aproximadamente un año hice un curso de programación 
                que me abrió los ojos a un mundo de posibilidades. Desde entonces, con la ayuda de herramientas de IA 
                y mucho aprendizaje autodidacta, fui mejorando día a día.
              </p>
              <p>
                No soy un profesional con años de experiencia ni una empresa grande, pero justamente eso es lo que hace 
                este proyecto especial: está hecho con dedicación, pasión y el genuino deseo de ayudar a mi comunidad.
              </p>
            </div>

            <div className="story-card">
              <div className="story-icon-wrapper">
                <span className="material-icons">psychology</span>
              </div>
              <h2>¿Por qué GoyaNova?</h2>
              <p>
                La idea surgió pensando en algo simple: ¿querés churros? Buscás "churros" y listo. Ves si están disponibles, 
                qué días atienden, si tienen buenas opiniones, y lo más importante: contacto directo por WhatsApp. 
                Sin perder tiempo con mensajes dentro de la plataforma.
              </p>
              <p>
                Quería crear algo 100% goyano, donde toda la información esté en un solo lugar y la conexión sea instantánea. 
                Un emprendedor publica su servicio, la gente lo encuentra fácilmente, y se contactan directo. Así de simple.
              </p>
            </div>

            <div className="story-card">
              <div className="story-icon-wrapper">
                <span className="material-icons">rocket_launch</span>
              </div>
              <h2>Mi visión del proyecto</h2>
              <p>
                Este es mi primer proyecto grande y estoy comprometido a mejorarlo constantemente. La tecnología me apasiona 
                por su capacidad de innovar y facilitar la vida de las personas. GoyaNova es mi forma de aportar algo 
                útil a Goya.
              </p>
              <p>
                Mi objetivo es que cualquier persona pueda encontrar lo que necesita de forma rápida y directa, ya sean 
                servicios o productos. Y de paso, ayudar a emprendedores locales a tener más visibilidad sin costos 
                excesivos.
              </p>
            </div>
          </div>
        </section>

        {/* Valores */}
        <section className="values-section">
          <h2 className="values-title">Los Pilares de GoyaNova</h2>
          <div className="values-grid">
            <div className="value-card">
              <span className="material-icons value-icon">handshake</span>
              <h3>Conexión Directa</h3>
              <p>WhatsApp directo, sin intermediarios ni mensajes dentro de la plataforma. Contacto real e inmediato.</p>
            </div>

            <div className="value-card">
              <span className="material-icons value-icon">location_city</span>
              <h3>100% Goyano</h3>
              <p>Hecho en Goya, para Goya. Enfocado en nuestra comunidad local y sus necesidades específicas.</p>
            </div>

            <div className="value-card">
              <span className="material-icons value-icon">trending_up</span>
              <h3>Mejora Continua</h3>
              <p>Siempre escuchando feedback y agregando mejoras. Este proyecto crece con tu ayuda.</p>
            </div>

            <div className="value-card">
              <span className="material-icons value-icon">volunteer_activism</span>
              <h3>Accesible para Todos</h3>
              <p>Gratis para usuarios, con opciones premium accesibles para emprendedores que quieran destacar.</p>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="timeline-section">
          <h2 className="timeline-title">El Recorrido hasta Hoy</h2>
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <h3>Finales de 2023 - El Comienzo</h3>
                <p>Hice mi primer curso de programación. Descubrí la IA como herramienta de aprendizaje y empecé a experimentar con código.</p>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <h3>2024 - Aprendizaje y Práctica</h3>
                <p>Mejoré mis habilidades día a día. Creé páginas de turnos y otros proyectos pequeños para practicar y aprender nuevos lenguajes.</p>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <h3>Finales de 2024 - Nace la Idea</h3>
                <p>Decidí crear algo más grande: una plataforma completa para conectar a la gente de Goya con servicios y productos locales.</p>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot active"></div>
              <div className="timeline-content">
                <h3>2025 - GoyaNova en Marcha</h3>
                <p>La plataforma está funcionando y creciendo. Sigo agregando mejoras constantemente y escuchando feedback de los usuarios.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== NUEVA SECCIÓN: COMENTARIOS ===== */}
        <ComentariosProyecto />

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-content">
            <span className="material-icons cta-icon">favorite</span>
            <h2 className="cta-title">¿Querés ser parte de esto?</h2>
            <p className="cta-description">
              Tu feedback, tus sugerencias y tu apoyo son fundamentales para que GoyaNova crezca. 
              Si tenés ideas, encontraste algún error o simplemente querés saludar, no dudes en contactarme.
            </p>
            <div className="cta-buttons">
              <Link to="/contacto" className="cta-btn cta-primary">
                <span className="material-icons">mail</span>
                Contactarme
              </Link>
              <Link to="/explorar" className="cta-btn cta-secondary">
                <span className="material-icons">explore</span>
                Explorar Mapa
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Nosotros;
