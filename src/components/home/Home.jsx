import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [mostrarBotonInstalar, setMostrarBotonInstalar] = useState(false);
  
  const verificacionRealizada = useRef(false);
  const intervaloCuentaRegresiva = useRef(null);

  const diasDesdeRegistro = perfil?.creado_en 
    ? Math.floor((Date.now() - new Date(perfil.creado_en).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  
  const esUsuarioNuevo = diasDesdeRegistro <= 5;

  // Capturar evento de instalación PWA
  useEffect(() => {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches 
                      || window.navigator.standalone
                      || localStorage.getItem('pwa-installed') === 'true';
    
    if (isInstalled) {
      setMostrarBotonInstalar(false);
      return;
    }

    setMostrarBotonInstalar(true);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setMostrarBotonInstalar(true);
      
      // 🔥 Compartir con el modal
      window.__pwaPrompt = e;
    };

    // 🔥 Verificar si ya existe el prompt
    if (window.__pwaPrompt) {
      setDeferredPrompt(window.__pwaPrompt);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

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

  const handleInstalarApp = async () => {
    // 🔥 Verificar también window.__pwaPrompt
    const promptToUse = deferredPrompt || window.__pwaPrompt;
    
    if (promptToUse) {
      try {
        promptToUse.prompt();
        const { outcome } = await promptToUse.userChoice;
        
        if (outcome === 'accepted') {
          console.log('✅ App instalada desde Hero');
          localStorage.setItem('pwa-installed', 'true');
          setMostrarBotonInstalar(false);
          setDeferredPrompt(null);
          window.__pwaPrompt = null;
        } else {
          console.log('⚠️ Usuario rechazó instalación desde Hero');
          // Si rechaza, el prompt sigue disponible para reintentar
        }
        
        return;
      } catch (err) {
        console.error('Error en prompt nativo:', err);
      }
    }

    // Si no hay prompt, mostrar instrucciones
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOSDevice) {
      alert('📱 Para instalar en iPhone/iPad:\n\n1. Tocá el botón "Compartir" ⎙ (abajo)\n2. Desplazate y tocá "Agregar a pantalla de inicio"\n3. Tocá "Agregar"\n\n¡Es gratis y accedés más rápido!');
    } else {
      alert('💻 Para instalar GoyaNova:\n\n1. Abrí el menú de Chrome (⋮) arriba a la derecha\n2. Seleccioná "Instalar aplicación" o "Agregar a pantalla de inicio"\n3. Confirmá tocando "Instalar"\n\n¡Es gratis y accedés más rápido!');
    }
  };

  const handlePublicarClick = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('puede_publicar_servicio', {
          p_usuario_id: user.id
        });

      if (error) {
        console.error('Error al verificar límite:', error);
        navigate('/publicar');
        return;
      }

      if (!data.puede_publicar) {
        const confirmar = window.confirm(
          `Has alcanzado tu límite de servicios (${data.servicios_actuales}/${data.limite_servicios}).\n\n` +
          `¿Querés ir a Mi Membresía para mejorar tu plan?`
        );
        
        if (confirmar) {
          navigate('/panel/mi-membresia');
        }
        return;
      }

      navigate('/publicar');
    } catch (err) {
      console.error('Error inesperado:', err);
      navigate('/publicar');
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

      {/* ESTE ES EL BOTÓN GIGANTE QUE QUERÍAS MANTENER: */}
      <section className="publicar-servicio-hero">
        <button
          className="btn-publicar-hero"
          onClick={handlePublicarClick}
        >
          <span className="material-icons">add_circle_outline</span>
          <span className="btn-text">Publicar un Servicio</span>
          <span className="btn-shine"></span>
        </button>
      </section>

    
      <section className="goya-tutorial-section">
        <h2 className="goya-tutorial-title">¿Primera vez en GoyaNova?</h2>
        <p className="goya-tutorial-subtitle">Mirá estos tutoriales rápidos para ver como funciona GoyaNova</p>
        
        <div className="goya-tutorial-grid">
          <a href="https://youtube.com/tu-video-cliente" target="_blank" rel="noopener noreferrer" className="goya-tutorial-card goya-card-cliente">
            <span className="material-icons goya-card-icon">play_circle_filled</span>
            <div className="goya-card-content">
              <strong>Como usar GoyaNova</strong>
              <span>Para toda persona que necesita algo</span>
            </div>
            <div className="goya-card-badge">Ver video</div>
          </a>

          <a href="https://youtube.com/tu-video-prestador" target="_blank" rel="noopener noreferrer" className="goya-tutorial-card goya-card-prestador">
            <span className="material-icons goya-card-icon">play_circle_filled</span>
            <div className="goya-card-content">
              <strong>Como publicar servicios</strong>
              <span>Para toda persona que ofrece algo</span>
            </div>
            <div className="goya-card-badge">Ver video</div>
          </a>
        </div>

        <p className="goya-tutorial-note">
          <span className="material-icons">lightbulb</span>
          Podés usar GoyaNova de ambas formas: buscar Y publicar servicios
        </p>
      </section>
     

      <section className="goya-hero-section">
        <div className="goya-hero-content">
          <div className="goya-hero-badge">
            <span className="material-icons">location_on</span>
            Servicios en Goya, Corrientes
          </div>
          
          {/* TEXTO SIMPLIFICADO: Directo al grano */}
          <h1 className="goya-hero-title">
            Encontrá lo que buscás, rápido.
          </h1>
          
          <p className="goya-hero-description">
            Profesionales, comida y oficios. <strong>Trato directo por WhatsApp</strong>, sin vueltas.
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
          
          <p className="goya-hero-descriptionn">
            <strong>Comienza ahora por</strong>
          </p>

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
            {/* Mantenemos este botón secundario por si bajaron mucho, pero el importante es el de arriba */}
            <button
              className="goya-btn-hero-secondary"
              onClick={handlePublicarClick}
            >
              <span className="material-icons">add_circle</span>
              Publicar
            </button>
          </div>

          <div className="goya-hero-footer">
            <p className="goya-hero-info-text">
              ¿Dudas? <Link to="/nosotros" className="goya-hero-link">Conocé el proyecto</Link>
            </p>
            
            {mostrarBotonInstalar && (
              <button className="goya-hero-install-btn" onClick={handleInstalarApp}>
                <span className="material-icons">get_app</span>
                Descargar App
              </button>
            )}
          </div>
        </div>
      </section>

      {/* <section className="goya-howworks-section">
        <h2 className="goya-section-title">¿Cómo funciona?</h2>
        
        <div className="goya-howworks-grid">
          <div className="goya-howworks-card">
            <div className="goya-card-header">
              <span className="material-icons goya-card-icon goya-icon-client">person_search</span>
              <h3>Soy Cliente</h3>
            </div>
            <div className="goya-steps-list">
              <div className="goya-step-item">
                <div className="goya-step-number">1</div>
                <div className="goya-step-text">
                  <strong>Buscá</strong>
                  <p>Lo que necesitás</p>
                </div>
              </div>
              <div className="goya-step-item">
                <div className="goya-step-number">2</div>
                <div className="goya-step-text">
                  <strong>Mirá</strong>
                  <p>Fotos y opiniones</p>
                </div>
              </div>
              <div className="goya-step-item">
                <div className="goya-step-number">3</div>
                <div className="goya-step-text">
                  <strong>Mandá WhatsApp</strong>
                  <p>Y arreglá directo</p>
                </div>
              </div>
            </div>
          </div> */}

          {/* <div className="goya-howworks-card">
            <div className="goya-card-header">
              <span className="material-icons goya-card-icon goya-icon-professional">engineering</span>
              <h3>Soy prestador</h3>
            </div>
            <div className="goya-steps-list">
              <div className="goya-step-item">
                <div className="goya-step-number">1</div>
                <div className="goya-step-text">
                  <strong>Registrate</strong>
                  <p>Es gratis</p>
                </div>
              </div>
              <div className="goya-step-item">
                <div className="goya-step-number">2</div>
                <div className="goya-step-text">
                  <strong>Publicá</strong>
                  <p>Tus servicios</p>
                </div>
              </div>
              <div className="goya-step-item">
                <div className="goya-step-number">3</div>
                <div className="goya-step-text">
                  <strong>Trabajá</strong>
                  <p>Te escriben los clientes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* <section className="goya-local-banner">
        <div className="goya-local-content">
          <span className="material-icons goya-local-icon">favorite</span>
          <div className="goya-local-text">
            <strong>De Goya, para Goya</strong>
            <p>Conectamos vecinos sin intermediarios.</p>
          </div>
        </div>
        <button className="goya-local-btn" onClick={handlePublicarClick}>
          Sumate Gratis
        </button>
      </section> */}

      {mostrarBanner && tiempoRestante && (
        <section className="promo-code-banner">
          <div className="banner-content">
            <span className="material-icons banner-icon">redeem</span>
            
            <div className="banner-info">
              <div className="banner-text">
                <strong>¡Tenés una Promo!</strong>
                <p>Usá tu código para ser Premium gratis</p>
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
              Usar Código
            </button>
          </div>
          
          <div className="banner-footer">
            <span className="material-icons">info</span>
            <span>Buscá códigos en nuestras redes sociales</span>
          </div>
        </section>
      )}

      <section className="map-section">
        <MapaHome onExplorarClick={handleExplorarClick} />
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
          title="Usá tu código"
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