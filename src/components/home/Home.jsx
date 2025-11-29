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
  const { user, perfil, loading } = useAuth(); // 🔴 AGREGADO loading aquí

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
    console.log('🏠 [HOME] Componente montado');
    console.log('👤 [HOME] User:', user?.id);
    console.log('📝 [HOME] Perfil:', perfil?.id);
    console.log('⏳ [HOME] Loading:', loading);
    
    return () => {
      console.log('👋 [HOME] Componente desmontado');
    };
  }, []);

  useEffect(() => {
    console.log('🔄 [HOME] Cambio en auth:', {
      user: user?.id,
      perfil: perfil?.id,
      loading
    });
  }, [user, perfil, loading]);

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

      <section className="hero">
        <div className="hero-content">
          <h1>GoyaNova es para satisfacer tus necesidades</h1>
          <p>Puedes buscar desde servicios hasta productos cerca tuyo en Goya, con contacto directo sin perder tiempo.</p>
          
          <a
            href="#categorias"
            className="btn-primaryy"
            onClick={(e) => {
              e.preventDefault();
              handleScrollCategorias();
            }}
          >
            Explorar Categorías
          </a>
        </div>
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