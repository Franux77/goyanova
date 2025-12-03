// PublicarServicioForm.jsx - COMPLETO
import React, { useState, useEffect, useRef, forwardRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient";

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

const PublicarServicioForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
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
  });

  const setFormDataSeguro = actualizarDatosSeguro(setFormData);

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
        setMembresiaUsuario('Gratis');
        setLimiteImagenes(6);
        return;
      }

      console.log('🔍 Consultando membresía para usuario:', user.id);

      // ✅ OPCIÓN 1: Usar la vista actualizada
      const { data: membresia, error: membresiaError } = await supabase
        .from('vista_membresias_activas')
        .select('tipo_membresia, limite_fotos, limite_servicios, badge_texto')
        .eq('usuario_id', user.id)
        .order('fecha_fin', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('📊 Resultado de membresía:', membresia);

      if (membresiaError) {
        console.error('❌ Error al cargar membresía:', membresiaError);
        // Si falla, usar plan gratuito por defecto
        const { data: planGratis } = await supabase
          .from('planes_membresia')
          .select('limite_fotos, limite_servicios')
          .eq('tipo', 'gratis')
          .eq('activo', true)
          .single();

        setMembresiaUsuario('Gratis');
        setLimiteImagenes(planGratis?.limite_fotos || 6);
        return;
      }

      if (membresia) {
        let nombreAmigable = membresia.badge_texto || membresia.tipo_membresia;
        
        if (!membresia.badge_texto) {
          const mapeoNombres = {
            'manual_admin': 'Premium VIP',
            'codigo_gratis': 'Promoción',
            'codigo_promocion': 'Promoción',
            'pago': 'Premium Pago',
            'gratis': 'Gratis'
          };
          nombreAmigable = mapeoNombres[membresia.tipo_membresia] || membresia.tipo_membresia;
        }

        console.log('✅ Membresía aplicada:', {
          tipo: nombreAmigable,
          limite_fotos: membresia.limite_fotos,
          limite_servicios: membresia.limite_servicios
        });

        setMembresiaUsuario(nombreAmigable);
        setLimiteImagenes(membresia.limite_fotos || 6);
      } else {
        // No tiene membresía activa, buscar plan gratuito
        console.log('⚠️ No hay membresía activa, usando plan gratuito');
        const { data: planGratis } = await supabase
          .from('planes_membresia')
          .select('limite_fotos')
          .eq('tipo', 'gratis')
          .eq('activo', true)
          .single();

        setMembresiaUsuario('Gratis');
        setLimiteImagenes(planGratis?.limite_fotos || 6);
      }
    } catch (err) {
      console.error('💥 Error crítico al obtener membresía:', err);
      setMembresiaUsuario('Gratis');
      setLimiteImagenes(6);
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
    membresiaUsuario
  }), [formData, setFormDataSeguro, errores, limiteImagenes, membresiaUsuario, pasoActivo]);

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