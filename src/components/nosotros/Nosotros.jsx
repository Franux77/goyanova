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
    { to: '/panel/dashboard', label: 'Mi Cuenta', icon: 'dashboard' },
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
              GoyaNova nació de la necesidad de conectar a la gente de Goya de forma directa y sin complicaciones. Creado por un joven desarrollador goyano con pasión por la tecnología y ganas de innovar.
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
                Somos dos jóvenes de Goya de poco más de 20 años
. El proyecto nació cuando Franco, apasionado del desarrollo técnico, se capacitó de forma autodidacta en programación y herramientas de IA, mientras que Maxi aportó el impulso clave para la organización y la estrategia comercial en las calles goyanas
. No somos una multinacional ni una corporación gigante, pero justamente eso hace que GoyaNova sea especial: es una plataforma desarrollada a pulmón, con dedicación real y el genuino deseo de potenciar el trabajo en nuestra comunidad.
              </p>
              {/* <p>
                No soy un profesional con años de experiencia ni una empresa grande, pero justamente eso es lo que hace 
                este proyecto especial: está hecho con dedicación, pasión y el genuino deseo de ayudar a mi comunidad.
              </p> */}
            </div>

            <div className="story-card">
              <div className="story-icon-wrapper">
                <span className="material-icons">psychology</span>
              </div>
              <h2>¿Por qué GoyaNova?</h2>
              <p>
                La idea surgió pensando en la vida cotidiana de nuestra ciudad. Si tenés ganas de comer churros, buscás 'churros' y listo: te aparecen al instante las opciones locales. Queríamos llevar ese tradicional 'boca a boca' goyano directamente a la pantalla del celular
. Creamos un espacio donde todos los oficios, comercios y servicios independientes de Goya están en un solo lugar
. El prestador publica su trabajo, el vecino o turista lo encuentra al instante y se comunican directo por WhatsApp de forma gratuita y libre de comisiones intermedias
.
              </p>
              {/* <p>
                Quería crear algo 100% goyano, donde toda la información esté en un solo lugar y la conexión sea instantánea. 
                Un emprendedor publica su servicio, la gente lo encuentra fácilmente, y se contactan directo. Así de simple.
              </p> */}
            </div>

            <div className="story-card">
              <div className="story-icon-wrapper">
                <span className="material-icons">rocket_launch</span>
              </div>
              <h2>Mi visión del proyecto</h2>
              <p>
                GoyaNova es nuestro primer gran desarrollo tecnológico y asumimos el compromiso de mejorarlo día a día
. Creemos firmemente en el poder de la tecnología para innovar y facilitarle la vida a los vecinos de nuestra ciudad
. Nuestro objetivo es que cualquier persona encuentre lo que necesita de forma rápida y directa, transformándose en la herramienta de referencia para Goya y ayudando a los trabajadores locales a tener la visibilidad digital que merecen
.
              </p>
              {/* <p>
                Mi objetivo es que cualquier persona pueda encontrar lo que necesita de forma rápida y directa, ya sea lo que necesite (es más natural, servicios/productos ya está implícito) Y de paso, ayudar a emprendedores locales a tener más visibilidad sin costos 
                excesivos.
              </p> */}
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
              <p>Contacto instantáneo por WhatsApp con un solo clic. Sin formularios lentos ni intermediarios en el medio
.</p>
            </div>

            <div className="value-card">
              <span className="material-icons value-icon">location_city</span>
              <h3>Modelo "Cero Comisiones</h3>
              <p>Apoyamos el valor del esfuerzo local. El prestador del servicio conserva siempre el 100% de su tarifa cobrada
.</p>
            </div>

            <div className="value-card">
              <span className="material-icons value-icon">trending_up</span>
              <h3>Identidad Goyana</h3>
              <p>Hecho en Goya, por goyanos y para goyanos
. Un ecosistema diseñado exclusivamente para las necesidades reales de nuestra comunidad
.</p>
            </div>

            <div className="value-card">
              <span className="material-icons value-icon">volunteer_activism</span>
              <h3>Infraestructura Inclusiva</h3>
              <p>Un directorio web de navegación rápida, liviano, de carga inmediata y 100% gratuito para todos los usuarios de la ciudad
.</p>
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
                <p>Todo comenzó cuando Franco realizó su primer curso de programación. Al descubrir la Inteligencia Artificial como una potente herramienta de aprendizaje autodidacta, empezó a experimentar con código, construyendo las bases técnicas del proyecto.</p>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <h3>2024 - Aprendizaje y Práctica</h3>
                <p>Durante este año, Franco continuó perfeccionando sus habilidades de desarrollo diariamente, diseñando pequeños sistemas de turnos y aplicaciones web interactivas para dominar tecnologías modernas. Fue el año clave para consolidar la capacidad técnica necesaria antes de dar el gran salto.</p>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-content">
                <h3>Finales de 2024 - Nace la Idea</h3>
                <p>Con la experiencia de programación consolidada y detectando la desconexión que existía en el ecosistema local, decidimos unir fuerzas con Maxi para crear algo mucho más grande: una plataforma integral y 100% goyana que conecte directamente a los vecinos con los servicios, comercios y oficios de la ciudad.</p>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot active"></div>
              <div className="timeline-content">
                <h3>2025 - GoyaNova en Marcha</h3>
                <p>La plataforma hoy ya es una realidad en funcionamiento y constante evolución. Seguimos optimizando el código, mejorando la velocidad de los servidores de Netlify y Supabase, y escuchando con atención el feedback de cada trabajador y vecino de Goya para incorporar mejoras semana tras semana.</p>
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
              Tu opinión, sugerencias y apoyo son el motor principal para que este directorio siga creciendo. Si tenés una idea para mejorar la plataforma, encontraste algún detalle técnico en la web o simplemente querés saludarnos y sumarte a la red, no dudes en ponerte en contacto con nosotros.
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
