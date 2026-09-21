// PublicarServicioForm.jsx - COMPLETO
import React, { useState, useEffect, useRef, forwardRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient";
import { useCaracteristicasPlan } from "../../hooks/useCaracteristicasPlan";

import Paso1InfoBasica from "./Paso1InfoBasica";
import Paso2ImagenesUbicacion from "./Paso2ImagenesUbicacion";
import Paso3DetallesDisponibilidad from "./Paso3DetallesDisponibilidad";
import Paso4ContactoOpciones from "./Paso4ContactoOpciones";
import Paso5ResumenConfirmacion from "./Paso5ResumenConfirmacion";
import Loading from '../loading/Loading';

import { actualizarDatosSeguro } from "./utils/helpers";
import { validarCamposRequeridos, validarTurnos } from "./utils/validacionesServicio";
import { cargarServicioDesdeDB, publicarServicio } from "./utils/serviciosService";

import "./PublicarServicioForm.css";

const SeccionFormulario = forwardRef(({ children, id }, ref) => (
  <section id={id} ref={ref} className="psf-seccion">{children}</section>
));

const pasos = [
  { componente: Paso1InfoBasica, titulo: "Información Básica" },
  { componente: Paso2ImagenesUbicacion, titulo: "Imágenes y Ubicación" },
  { componente: Paso3DetallesDisponibilidad, titulo: "Detalles y Disponibilidad" },
  { componente: Paso4ContactoOpciones, titulo: "Opciones de Contacto" },
  { componente: Paso5ResumenConfirmacion, titulo: "Resumen y Confirmación" },
];

const CLAVE_BORRADOR = 'goyanova_borrador_publicar';

const CAMPOS_BORRADOR = [
  'nombre', 'tipo', 'categoria', 'descripcion', 'direccion_escrita', 'ubicacion',
  'tipoDisponibilidad', 'horarios', 'diasActivos', 'mensaje', 'whatsapp', 'prefijo',
  'email', 'instagram', 'facebook', 'metodos_pago', 'acepta_cuotas', 'hace_envios',
  'alcance_envio', 'sitio_web', 'whatsapp_mensaje_personalizado'
];

const borradorTieneContenido = (borrador) => {
  if (!borrador) return false;
  return Boolean(
    borrador.nombre?.trim() ||
    borrador.descripcion?.trim() ||
    borrador.direccion_escrita?.trim() ||
    borrador.whatsapp?.trim()
  );
};

const cargarBorrador = () => {
  try {
    const guardado = localStorage.getItem(CLAVE_BORRADOR);
    if (!guardado) return null;
    const parseado = JSON.parse(guardado);
    return borradorTieneContenido(parseado) ? parseado : null;
  } catch {
    return null;
  }
};

const PublicarServicioForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [hayBorradorRestaurado, setHayBorradorRestaurado] = useState(false);

  const [formData, setFormData] = useState(() => {
    const base = {
      nombre: "",
      tipo: "",
      categoria: "",
      descripcion: "",
      portadaFile: null,
      imagenesFiles: [],
      imagenesPreview: [],
      portadaAEliminar: null,
      imagenesAEliminar: [],
      imagenesDB: [],
      // 🆕 foto de referencia de ubicación (Impulso+)
      referenciaFile: null,
      referenciaPreview: null,
      referenciaDB: null,
      referenciaAEliminar: null,
      direccion_escrita: "",
      ubicacion: { lat: null, lng: null, referencia: "" },
      tipoDisponibilidad: "",
      horarios: {},
      diasActivos: {},
      mensaje: "",
      whatsapp: "",
      prefijo: "",
      email: "",
      instagram: "",
      facebook: "",
      // 🆕 campos habilitados por plan (Paso 4)
      metodos_pago: [],
      acepta_cuotas: false,
      hace_envios: false,
      alcance_envio: null,
      sitio_web: "",
      whatsapp_mensaje_personalizado: "",
    };

    // Solo restauramos borrador si es un servicio NUEVO (no edición)
    if (!id) {
      const borrador = cargarBorrador();
      if (borrador) {
        return { ...base, ...borrador };
      }
    }

    return base;
  });

  const setFormDataSeguro = actualizarDatosSeguro(setFormData);

  // 🆕 Autoguardado del borrador (solo texto, nunca archivos) — cada vez que cambia algo
  useEffect(() => {
    if (id) return; // no autoguardar cuando se está EDITANDO un servicio existente

    const timeout = setTimeout(() => {
      const borrador = {};
      CAMPOS_BORRADOR.forEach((campo) => {
        borrador[campo] = formData[campo];
      });

      try {
        if (borradorTieneContenido(borrador)) {
          localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(borrador));
        } else {
          localStorage.removeItem(CLAVE_BORRADOR);
        }
      } catch {
        // si falla (ej. localStorage lleno), no rompemos nada
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [formData, id]);

  // 🆕 Detectar si al entrar había un borrador restaurado, para avisar al usuario
  useEffect(() => {
    if (!id && cargarBorrador()) {
      setHayBorradorRestaurado(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [errores, setErrores] = useState({});
  const [publicando, setPublicando] = useState(false);
  const [errorModal, setErrorModal] = useState(null);
  const [pasoActivo, setPasoActivo] = useState(0);
  const seccionesRefs = useRef([]);
  const observerRef = useRef(null);
  const [membresiaUsuario, setMembresiaUsuario] = useState(null);
  const [limiteImagenes, setLimiteImagenes] = useState(5);
  const [cargado, setCargado] = useState(false);
  const [cargando, setCargando] = useState(false);

  // 🆕 Características del plan activo, para gatear campos del formulario
  const { tiene: tieneCaracteristica } = useCaracteristicasPlan();

  // ------------------ IntersectionObserver ------------------
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibles = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visibles.length > 0) {
          const nuevoPaso = seccionesRefs.current.findIndex((r) => r === visibles[0].target);
          if (nuevoPaso !== -1 && nuevoPaso !== pasoActivo) setPasoActivo(nuevoPaso);
        }
      },
      { root: null, rootMargin: "0px", threshold: 0.5 }
    );

    observerRef.current = observer;
    seccionesRefs.current.forEach((ref) => ref && observer.observe(ref));
    return () => observer.disconnect();
  }, [pasoActivo]);

  // ------------------ CARGAR SERVICIO ------------------
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    const cargarServicio = async () => {
      if (!id || cargado || cargando) return;
      
      setCargando(true);
      
      try {
        await cargarServicioDesdeDB(id, setFormData);
        setCargado(true);
      } catch (error) {
        alert(`Error al cargar el servicio: ${error.message}`);
      } finally {
        setCargando(false);
      }
    };

    cargarServicio();
  }, [id, cargado, cargando]);

  // ------------------ OBTENER MEMBRESÍA ------------------
  useEffect(() => {
    const obtenerMembresia = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.warn('⚠️ Usuario no autenticado');
          setMembresiaUsuario('Gratis - 5 fotos');
          setLimiteImagenes(5);
          return;
        }

        const { data: membresia, error: membresiaError } = await supabase
          .rpc('obtener_membresia_usuario', { p_usuario_id: user.id });

        if (membresiaError) {
          console.error('❌ Error al cargar membresía:', membresiaError);
          setMembresiaUsuario('Gratis - 5 fotos');
          setLimiteImagenes(5);
          return;
        }

        if (membresia) {
          const badgeFormulario = membresia.badge_formulario || 'Gratis - 5 fotos';
          
          setMembresiaUsuario(badgeFormulario);
          setLimiteImagenes(membresia.limite_fotos || 5);
        } else {
          setMembresiaUsuario('Gratis - 5 fotos');
          setLimiteImagenes(5);
        }
      } catch (err) {
        console.error('💥 Error crítico al obtener membresía:', err);
        setMembresiaUsuario('Gratis - 5 fotos');
        setLimiteImagenes(5);
      }
    };

    obtenerMembresia();
  }, []);

  // ------------------ useMemo ------------------
  const propsPaso = useMemo(() => ({
    formData,
    setFormData: setFormDataSeguro,
    errores,
    setErrores,
    irAlSiguientePaso: () => {
      if (pasoActivo < pasos.length - 1) {
        const siguiente = pasoActivo + 1;
        setPasoActivo(siguiente);
        seccionesRefs.current[siguiente]?.scrollIntoView({ behavior: "smooth" });
      }
    },
    limiteImagenes,
    membresiaUsuario,
    // 🆕 gating por plan
    puedeFotoReferencia: tieneCaracteristica('foto_referencia_ubicacion'),
  }), [formData, setFormDataSeguro, errores, limiteImagenes, membresiaUsuario, pasoActivo, tieneCaracteristica]);

  const handlePublicar = async () => {
    const { esValido, nuevosErrores } = validarCamposRequeridos(formData, setErrores);

    let erroresTurnos = [];
    
    if (formData.tipoDisponibilidad !== "whatsapp" && formData.tipoDisponibilidad !== "no_disponible") {
      const diasActivos = formData.diasActivos || {};
      erroresTurnos = validarTurnos(formData.horarios, diasActivos, formData.tipoDisponibilidad);
    }

    const todosErrores = { ...nuevosErrores };
    if (erroresTurnos.length) todosErrores.erroresTurnos = erroresTurnos;

    if (Object.keys(todosErrores).length) {
      setErrores(todosErrores);

      const primerError = Object.keys(todosErrores)[0];
      const indicePaso = pasos.findIndex((_, i) =>
        seccionesRefs.current[i]?.querySelector(`[name="${primerError}"]`)
      );
      if (indicePaso !== -1) {
        seccionesRefs.current[indicePaso]?.scrollIntoView({ behavior: "smooth" });
        setPasoActivo(indicePaso);
      }

      const listaErrores = Object.values(todosErrores)
        .flatMap(e => Array.isArray(e) ? e : [e])
        .map((e, i) => <li key={i}>{e}</li>);

      setErrorModal(<ul>{listaErrores}</ul>);
      return;
    }

    localStorage.removeItem(CLAVE_BORRADOR);
    await publicarServicio(formData, id, navigate, setErrorModal, setPublicando);
  };

  if (cargando) {
    return <Loading message="Cargando servicio..." fullScreen={true} />;
  }

  return (
    <div className="psf-container">
      {/* 🔹 NAVBAR MÓVIL - Solo botón volver */}
      <nav className="psf-navbar-simple-mobile">
        <button className="psf-boton-volver-mobile" onClick={() => navigate(-1)}>
          <span className="material-icons">arrow_back</span>
          Volver
        </button>
      </nav>

      {hayBorradorRestaurado && !id && (
        <div className="psf-borrador-aviso">
          <span className="material-icons">restore</span>
          <span>Recuperamos lo que habías completado antes. Las fotos las tenés que volver a cargar.</span>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(CLAVE_BORRADOR);
              window.location.reload();
            }}
          >
            Empezar de cero
          </button>
        </div>
      )}

      <main className="psf-main">
        {pasos.map(({ componente: PasoComponente }, idx) => (
          <SeccionFormulario
            key={idx}
            id={`psf-seccion-${idx}`}
            ref={(el) => (seccionesRefs.current[idx] = el)}
          >
            <PasoComponente {...propsPaso} />
          </SeccionFormulario>
        ))}
        <div className="psf-controles-final">
          <button
            type="button"
            className="psf-btn-siguiente"
            onClick={handlePublicar}
          >
            {id ? "Actualizar Servicio" : "Publicar Servicio"}
          </button>
        </div>
      </main>

      {publicando && (
        <Loading 
          message={id ? "Actualizando servicio..." : "Publicando servicio..."} 
          fullScreen={true} 
        />
      )}

      {errorModal && (
        <div className="modal-errorr show">
          <div className="modal-contenidoo">
            <h3>❌ Errores encontrados</h3>
            {errorModal}
            <button onClick={() => setErrorModal(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicarServicioForm;