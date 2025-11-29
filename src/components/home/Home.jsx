import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Home.css';
import SaludoUsuario from './SaludoUsuario';
import CategoryList from './CategoryList';
import TypeSelector from './TypeSelector';
import { useAuth } from '../../auth/useAuth';
import ModalCodigoPromo from '../../auth/login/ModalCodigoPromo';
import MapaHome from './MapaHome';
import { supabase } from '../../utils/supabaseClient';

const Home = () => {
  const [selectedType, setSelectedType] = useState('servicio');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, perfil, loading } = useAuth();

  const [mostrarModalCodigo, setMostrarModalCodigo] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState(null);
  const [esPremium, setEsPremium] = useState(false);
  
  const verificacionRealizada = useRef(false);
  const intervaloCuentaRegresiva = useRef(null);

  const diasDesdeRegistro = perfil?.creado_en 
    ? Math.floor((Date.now() - new Date(perfil.creado_en).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  
  const esUsuarioNuevo = diasDesdeRegistro <= 5;

  useEffect(() => {
    if (!user?.id || verificacionRealizada.current) {
      return;
    }

    const verificarMembresia = async () => {
      try {
        verificacionRealizada.current = true;
        
        const { data, error } = await supabase
          .from('membresias')
          .select('estado, tipo_membresia, fecha_fin')
          .eq('usuario_id', user.id)
          .eq('estado', 'activa')
          .gte('fecha_fin', new Date().toISOString())
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          setEsPremium(false);
          return;
        }

        const tieneMembresiaActiva = data?.estado === 'activa';
        setEsPremium(tieneMembresiaActiva);

      } catch (err) {
        setEsPremium(false);
      }
    };

    verificarMembresia();

    return () => {
      verificacionRealizada.current = false;
    };
  }, [user?.id]);

  const mostrarBanner = user && !esPremium && esUsuarioNuevo;

  useEffect(() => {
    if (intervaloCuentaRegresiva.current) {
      clearInterval(intervaloCuentaRegresiva.current);
      intervaloCuentaRegresiva.current = null;
    }

    if (!mostrarBanner || !perfil?.creado_en) {
      setTiempoRestante(null);
      return;
    }

    const calcularTiempoRestante = () => {
      const fechaRegistro = new Date(perfil.creado_en);
      const fechaLimite = new Date(fechaRegistro.getTime() + (5 * 24 * 60 * 60 * 1000));
      const ahora = Date.now();
      const diferencia = fechaLimite - ahora;

      if (diferencia <= 0) {
        setTiempoRestante(null);
        if (intervaloCuentaRegresiva.current) {
          clearInterval(intervaloCuentaRegresiva.current);
          intervaloCuentaRegresiva.current = null;
        }
        return;
      }

      const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
      const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);

      setTiempoRestante({ dias, horas, minutos, segundos });
    };

    calcularTiempoRestante();
    intervaloCuentaRegresiva.current = setInterval(calcularTiempoRestante, 1000);

    return () => {
      if (intervaloCuentaRegresiva.current) {
        clearInterval(intervaloCuentaRegresiva.current);
        intervaloCuentaRegresiva.current = null;
      }
    };
  }, [mostrarBanner, perfil?.creado_en]);

  useEffect(() => {
    if (!user || esPremium) return;

    const debeMoverse = sessionStorage.getItem('mostrar_modal_promo');
    
    if (debeMoverse === 'true') {
      setTimeout(() => {
        setMostrarModalCodigo(true);
        sessionStorage.removeItem('mostrar_modal_promo');
      }, 800);
    }
  }, [user, esPremium]);

  useEffect(() => {
    if (location.state?.scrollToCategory) {
      const { type, categoryName } = location.state;
      setSelectedType(type);
      
      setTimeout(() => {
        const targetCard = document.querySelector(`[data-category="${categoryName}"]`);
        
        if (targetCard) {
          const yOffset = -120;
          const y = targetCard.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        } else {
          const categoriasSection = document.getElementById('categorias');
          if (categoriasSection) {
            categoriasSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 400);
      
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSelectCategory = (category) => {
    navigate(`/categoria/${selectedType}/${category}`, {
      state: {
        fromHome: true,
        type: selectedType,
        categoryName: category
      }
    });
  };

  const handlePublicarClick = () => {
    if (user) {
      navigate('/publicar');
    } else {
      navigate('/login');
    }
  };

  const handleExplorarClick = () => {
    navigate('/explorar');
  };

  const handleScrollCategorias = () => {
    const categoriasSection = document.getElementById('categorias');
    if (categoriasSection) {
      categoriasSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="home">
      <SaludoUsuario />

      {/* 🆕 HERO MEJORADO */}
      <section className="goya-hero-section">
        <div className="goya-hero-content">
          <div className="goya-hero-badge">
            <span className="material-icons">location_on</span>
            Servicios locales en Goya, Corrientes
          </div>
          
          <h1 className="goya-hero-title">
            Encontrá el profesional que necesitás
          </h1>
          
          <p className="goya-hero-description">
            Plomeros, electricistas, pintores y más. <strong>Contacto directo por WhatsApp</strong>, sin intermediarios.
          </p>
          
          <div className="goya-hero-benefits">
            <div className="goya-benefit-item">
              <span className="material-icons">check_circle</span>
              <span>Gratis</span>
            </div>
            <div className="goya-benefit-item">
              <span className="material-icons">check_circle</span>
              <span>Sin comisiones</span>
            </div>
            <div className="goya-benefit-item">
              <span className="material-icons">check_circle</span>
              <span>Directo</span>
            </div>
          </div>
          
          <div className="goya-hero-actions">
            <a
              href="#categorias"
              className="goya-btn-hero-primary"
              onClick={(e) => {
                e.preventDefault();
                handleScrollCategorias();
              }}
            >
              <span className="material-icons">search</span>
              Buscar
            </a>
            <button
              className="goya-btn-hero-secondary"
              onClick={handlePublicarClick}
            >
              <span className="material-icons">add_circle</span>
              Publicar
            </button>
          </div>
        </div>
      </section>

      {/* 🆕 CÓMO FUNCIONA - Compacto */}
      <section className="goya-howworks-section">
        <h2 className="goya-section-title">¿Cómo funciona?</h2>
        
        <div className="goya-howworks-grid">
          {/* Para Clientes */}
          <div className="goya-howworks-card">
            <div className="goya-card-header">
              <span className="material-icons goya-card-icon goya-icon-client">person_search</span>
              <h3>Clientes</h3>
            </div>
            <div className="goya-steps-list">
              <div className="goya-step-item">
                <div className="goya-step-number">1</div>
                <div className="goya-step-text">
                  <strong>Buscá</strong>
                  <p>Por categoría o mapa</p>
                </div>
              </div>
              <div className="goya-step-item">
                <div className="goya-step-number">2</div>
                <div className="goya-step-text">
                  <strong>Mirá perfiles</strong>
                  <p>Fotos y opiniones</p>
                </div>
              </div>
              <div className="goya-step-item">
                <div className="goya-step-number">3</div>
                <div className="goya-step-text">
                  <strong>Contactá</strong>
                  <p>Directo por WhatsApp</p>
                </div>
              </div>
            </div>
          </div>

          {/* Para Profesionales */}
          <div className="goya-howworks-card">
            <div className="goya-card-header">
              <span className="material-icons goya-card-icon goya-icon-professional">engineering</span>
              <h3>Profesionales</h3>
            </div>
            <div className="goya-steps-list">
              <div className="goya-step-item">
                <div className="goya-step-number">1</div>
                <div className="goya-step-text">
                  <strong>Registrate</strong>
                  <p>Cuenta gratis</p>
                </div>
              </div>
              <div className="goya-step-item">
                <div className="goya-step-number">2</div>
                <div className="goya-step-text">
                  <strong>Publicá</strong>
                  <p>Con fotos y detalles</p>
                </div>
              </div>
              <div className="goya-step-item">
                <div className="goya-step-number">3</div>
                <div className="goya-step-text">
                  <strong>Recibí consultas</strong>
                  <p>Clientes reales</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🆕 BANNER PROYECTO LOCAL - Compacto */}
      <section className="goya-local-banner">
        <div className="goya-local-content">
          <span className="material-icons goya-local-icon">favorite</span>
          <div className="goya-local-text">
            <strong>Proyecto 100% local de Goya</strong>
            <p>Creado por un joven correntino para conectar nuestra ciudad</p>
          </div>
        </div>
        <button className="goya-local-btn" onClick={handlePublicarClick}>
          Sumate gratis
        </button>
      </section>

      {mostrarBanner && tiempoRestante && (
        <section className="promo-code-banner">
          <div className="banner-content">
            <span className="material-icons banner-icon">redeem</span>
            
            <div className="banner-info">
              <div className="banner-text">
                <strong>¡Oferta por Tiempo Limitado!</strong>
                <p>Aplicá tu código promocional y obtené Premium gratis</p>
              </div>
              
              <div className="countdown-timer">
                <div className="countdown-item">
                  <span className="countdown-numero">{tiempoRestante.dias}</span>
                  <span className="countdown-label">días</span>
                </div>
                <span className="countdown-separador">:</span>
                <div className="countdown-item">
                  <span className="countdown-numero">{String(tiempoRestante.horas).padStart(2, '0')}</span>
                  <span className="countdown-label">hrs</span>
                </div>
                <span className="countdown-separador">:</span>
                <div className="countdown-item">
                  <span className="countdown-numero">{String(tiempoRestante.minutos).padStart(2, '0')}</span>
                  <span className="countdown-label">min</span>
                </div>
                <span className="countdown-separador">:</span>
                <div className="countdown-item">
                  <span className="countdown-numero">{String(tiempoRestante.segundos).padStart(2, '0')}</span>
                  <span className="countdown-label">seg</span>
                </div>
              </div>
            </div>
            
            <button 
              className="btn-aplicar-codigo"
              onClick={() => setMostrarModalCodigo(true)}
            >
              <span className="material-icons">redeem</span>
              Aplicar Código
            </button>
          </div>
          
          <div className="banner-footer">
            <span className="material-icons">info</span>
            <span>Buscá códigos en folletos de GoyaNova o en nuestras redes sociales</span>
          </div>
        </section>
      )}

      <section className="map-section">
        <MapaHome onExplorarClick={handleExplorarClick} />
      </section>

      <section className="publicar-servicio-section" style={{ textAlign: 'center', margin: '0' }}>
        <button
          className="btn-publicar-servicio"
          onClick={handlePublicarClick}
        >
          Publicar un Servicio
        </button>
      </section>

      <section className="category-section">
        <TypeSelector
          selectedType={selectedType}
          onSelectType={(type) => setSelectedType(type)}
        />
      </section>

      <section id="categorias" className="category-section">
        <h2>Categorías de {selectedType === 'servicio' ? 'Servicios' : 'Productos'}</h2>
        <CategoryList type={selectedType} onSelectCategory={handleSelectCategory} />
      </section>

      {mostrarBanner && (
        <button 
          className="floating-promo-btn"
          onClick={() => setMostrarModalCodigo(true)}
          title="Aplicá tu código antes que expire"
        >
          <span className="material-icons">redeem</span>
          <span className="floating-text">
            {tiempoRestante && tiempoRestante.dias === 0 
              ? '¡Último día!' 
              : `${tiempoRestante?.dias || 0} días`}
          </span>
        </button>
      )}

      {mostrarModalCodigo && user && !esPremium && (
        <ModalCodigoPromo
          user={user}
          esNuevoUsuario={esUsuarioNuevo}
          onClose={async () => {
            setMostrarModalCodigo(false);
            
            try {
              const { data } = await supabase
                .from('membresias')
                .select('estado, fecha_fin')
                .eq('usuario_id', user.id)
                .eq('estado', 'activa')
                .gte('fecha_fin', new Date().toISOString())
                .maybeSingle();

              setEsPremium(data?.estado === 'activa');
            } catch (err) {
              // Error silencioso
            }
          }}
        />
      )}
    </div>
  );
};

export default Home;