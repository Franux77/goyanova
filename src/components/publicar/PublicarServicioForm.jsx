// PublicarServicioForm.jsx
import React, { useState, useEffect, useRef, forwardRef, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient";

import Paso1InfoBasica from "./Paso1InfoBasica";
import Paso2ImagenesUbicacion from "./Paso2ImagenesUbicacion";
import Paso3DetallesDisponibilidad from "./Paso3DetallesDisponibilidad";
import Paso4ContactoOpciones from "./Paso4ContactoOpciones";
import Paso5ResumenConfirmacion from "./Paso5ResumenConfirmacion";

import { normalizarDia, actualizarDatosSeguro } from "./utils/helpers";
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

  // 🔹 NUEVO: Estados para membresía
  const [membresiaUsuario, setMembresiaUsuario] = useState(null);
  const [limiteImagenes, setLimiteImagenes] = useState(5);

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

  // ------------------ Cargar servicio si existe ------------------
  const [cargado, setCargado] = useState(false);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    let mounted = true;
    if (id && !cargado && mounted) {
      cargarServicioDesdeDB(id, setFormData);
      setCargado(true);
    }
    return () => { mounted = false; };
  }, [id, cargado]);

  // ------------------ 🔹 OBTENER MEMBRESÍA DEL USUARIO ------------------
useEffect(() => {
  const obtenerMembresia = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error obteniendo usuario:', userError);
        setMembresiaUsuario('Gratis');
        setLimiteImagenes(5);
        return;
      }

      // 🔹 Usar la vista optimizada
      const { data: membresia, error: membresiaError } = await supabase
        .from('vista_membresias_activas')
        .select('tipo_membresia, limite_fotos, badge_texto')
        .eq('usuario_id', user.id)
        .order('fecha_fin', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (membresiaError) {
        console.error('Error obteniendo membresía:', membresiaError);
        setMembresiaUsuario('Gratis');
        setLimiteImagenes(5);
        return;
      }

      if (membresia) {
        // ✅ Usar badge_texto si existe, sino mapear tipo_membresia
        let nombreAmigable = membresia.badge_texto || membresia.tipo_membresia;
        
        // 🔹 Mapeo de nombres técnicos a amigables (fallback)
        if (!membresia.badge_texto) {
          const mapeoNombres = {
            'manual_admin': 'Premium VIP',
            'codigo_gratis': 'Promoción',
            'codigo_promocion': 'Promoción',
            'premium_pago': 'Premium Pago',
            'gratis': 'Gratis'
          };
          nombreAmigable = mapeoNombres[membresia.tipo_membresia] || membresia.tipo_membresia;
        }

        setMembresiaUsuario(nombreAmigable);
        setLimiteImagenes(membresia.limite_fotos || 5);
        console.log('✅ Membresía activa:', nombreAmigable, '| Límite:', membresia.limite_fotos);
      } else {
        setMembresiaUsuario('Gratis');
        setLimiteImagenes(5);
        console.log('ℹ️ Sin membresía activa → Plan Gratis (límite: 5)');
      }
    } catch (err) {
      console.error('Error:', err);
      setMembresiaUsuario('Gratis');
      setLimiteImagenes(5);
    }
  };

  obtenerMembresia();
}, []);

  const irAlSiguientePaso = () => {
    if (pasoActivo < pasos.length - 1) {
      const siguiente = pasoActivo + 1;
      setPasoActivo(siguiente);
      seccionesRefs.current[siguiente]?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const propsPaso = useMemo(() => ({
    formData,
    setFormData: setFormDataSeguro,
    errores,
    setErrores,
    irAlSiguientePaso,
    limiteImagenes,       // 🔹 NUEVO
    membresiaUsuario      // 🔹 NUEVO
  }), [formData, setFormDataSeguro, errores, limiteImagenes, membresiaUsuario]);

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

  return (
    <div className="psf-container">
      <nav className="psf-navbar">
        <button className="psf-volver" onClick={() => navigate(-1)}>← Volver</button>
        <div className="psf-logo">GoyaNova</div>
        <div className="psf-pasos-bar">
          {pasos.map(({ titulo }, i) => (
            <div
              key={i}
              className={`psf-paso ${pasoActivo === i ? "activo" : ""}`}
              title={titulo}
              onClick={() => seccionesRefs.current[i]?.scrollIntoView({ behavior: "smooth" })}
            >
              {i + 1}
            </div>
          ))}
        </div>
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
        <div className="overlay-publicando">
          <div className="spinner"></div>
          <p>Publicando tu servicio...</p>
        </div>
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