import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './Home.css';
import SaludoUsuario from './SaludoUsuario';
import CategoryList from './CategoryList';
import TypeSelector from './TypeSelector';
import { useAuth } from '../../auth/useAuth';
import ModalCodigoPromo from '../../auth/login/ModalCodigoPromo';
import MapaHome from './MapaHome';
import HistoriasHome from './HistoriasHome';
import CampanaCodigos from './CampanaCodigos';
import ResenasHome from './ResenasHome';
import PedidoResena from './PedidoResena';
import { BienvenidaGoya, ComoFunciona, PreguntasFrecuentes } from './BienvenidaGoya';
import useCampanaCodigos from '../../hooks/useCampanaCodigos';
import { supabase } from '../../utils/supabaseClient';
import { useInstalarApp } from '../../utils/instalarApp';

const Home = () => {
  const [selectedType, setSelectedType] = useState('servicio');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, perfil } = useAuth();
  const campana = useCampanaCodigos();

  const [mostrarModalCodigo, setMostrarModalCodigo] = useState(false);
  const [esPremium, setEsPremium] = useState(false);
  const { yaInstalada, puedeInstalar, instalar } = useInstalarApp();
  const mostrarBotonInstalar = !yaInstalada;
    const [mostrarTutoriales, setMostrarTutoriales] = useState(false);
  const verificacionRealizada = useRef(false);

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
          .neq('tipo_membresia', 'gratis') // el plan Free no cuenta como plan activo
          .gte('fecha_fin', new Date().toISOString())
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          setEsPremium(false);
          return;
        }

        const tieneMembresiaActiva = data?.estado === 'activa';
        setEsPremium(tieneMembresiaActiva);

      } catch {
        setEsPremium(false);
      }
    };

    verificarMembresia();

    return () => {
      verificacionRealizada.current = false;
    };
  }, [user?.id]);


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

    if (location.state?.scrollToCategorias) {
      setTimeout(() => {
        const categoriasSection = document.getElementById('categorias');
        if (categoriasSection) {
          categoriasSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  // Si Chrome ya permite instalar, se instala directo; si no, la página con los pasos
  const handleInstalarApp = async () => {
    if (puedeInstalar) {
      const resultado = await instalar();
      if (resultado !== 'no-disponible') return;
    }
    navigate('/instalar');
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

  const handleScrollComoFunciona = () => {
    document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

    return (
    <div className="home">
      <HistoriasHome />
      <SaludoUsuario />

      <BienvenidaGoya
        onComoFunciona={handleScrollComoFunciona}
        mostrarInstalar={mostrarBotonInstalar}
        onInstalar={handleInstalarApp}
      />

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

      <CampanaCodigos
        campana={campana}
        user={user}
        esPremium={esPremium}
        onCanjeado={() => setEsPremium(true)}
      />

      <div className="home-fila-pc">
      <ResenasHome />


            <section className={`goya-tutorial-section ${mostrarTutoriales ? 'abierta' : ''}`}>
        <button
          className="goya-tutorial-toggle"
          onClick={() => setMostrarTutoriales(!mostrarTutoriales)}
        >
          <span className="goya-tutorial-toggle-icon material-icons">school</span>
          <div className="goya-tutorial-toggle-text">
            <strong>¿Primera vez en GoyaNova?</strong>
            <span>Mirá tutoriales rápidos de cómo funciona</span>
          </div>
          <span className={`material-icons goya-tutorial-chevron ${mostrarTutoriales ? 'rotado' : ''}`}>
            expand_more
          </span>
        </button>

        <div className={`goya-tutorial-collapse ${mostrarTutoriales ? 'abierta' : ''}`}>
          <div className="goya-tutorial-grid">
            <a href="https://youtube.com/shorts/bCaEG8LHVas?si=lf55jmfh6iYVdGiS" target="_blank" rel="noopener noreferrer" className="goya-tutorial-card goya-card-cliente">
              <span className="material-icons goya-card-icon">play_circle_filled</span>
              <div className="goya-card-content">
                <strong>Como usar GoyaNova</strong>
                <span>Para toda persona que necesita algo</span>
              </div>
              <div className="goya-card-badge">Ver video</div>
            </a>

            <a href="https://youtube.com/shorts/hiLk1hVl6Kc?si=gdAuLmKyr0t01VMS" target="_blank" rel="noopener noreferrer" className="goya-tutorial-card goya-card-prestador">
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
        </div>
      </section>
     

      </div>

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
        <h2>{selectedType === 'servicio' ? 'Oficios y servicios' : 'Negocios y productos'}</h2>
        <p className="categorias-explicacion">
          {selectedType === 'servicio'
            ? 'Personas que hacen un trabajo: arreglos, clases, belleza, salud, fletes…'
            : 'Lugares y emprendimientos que venden: comida, ropa, tiendas, artesanías…'}
        </p>
        <CategoryList type={selectedType} onSelectCategory={handleSelectCategory} />
      </section>

      <ComoFunciona onPublicar={handlePublicarClick} />
      <PreguntasFrecuentes />

      <PedidoResena />


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
                .neq('tipo_membresia', 'gratis') // el plan Free no cuenta como plan activo
                .gte('fecha_fin', new Date().toISOString())
                .maybeSingle();

              setEsPremium(data?.estado === 'activa');
            } catch {
              // Error silencioso
            }
          }}
        />
      )}
    </div>
  );
};

export default Home;