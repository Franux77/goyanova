// PublicarServicioForm.jsx - COMPLETO
import React, { useState, useEffect, useLayoutEffect, useRef, forwardRef, useMemo } from "react";
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
import "./PublicarFormTema.css";

const SeccionFormulario = forwardRef(({ children, id, numero, seccion, completa }, ref) => (
  <section id={id} ref={ref} className={`psf-seccion ${completa ? "completa" : ""}`} aria-labelledby={`${id}-titulo`}>
    <header className="psf-seccion-cabecera">
      <span className={`psf-seccion-numero ${completa ? "ok" : ""}`} aria-hidden="true">
        {completa ? <span className="material-icons">check</span> : numero}
      </span>
      <div className="psf-seccion-titulos">
        <h2 id={`${id}-titulo`}>
          {seccion.titulo}
          {seccion.opcional && <span className="psf-opcional">Opcional</span>}
        </h2>
        <p>{seccion.subtitulo}</p>
      </div>
    </header>
    <div className="psf-seccion-cuerpo">{children}</div>
  </section>
));

const tieneHorarioCompleto = (fd) => {
  if (!fd.tipoDisponibilidad) return false;
  if (["whatsapp", "consultar", "no_disponible", "nodisp"].includes(fd.tipoDisponibilidad)) return true;
  return Object.values(fd.horarios || {}).some(
    (turnos) => Array.isArray(turnos) && turnos.some((t) => t.inicio && t.fin)
  );
};

// Orden del formulario: primero lo que hace falta para que te encuentren y te escriban,
// después lo que suma (fotos, ubicación, horarios) y al final lo opcional.
const SECCIONES = [
  {
    clave: "que",
    corto: "Qué ofrecés",
    titulo: "¿Qué ofrecés?",
    subtitulo: "Lo básico para que te encuentren. Todo lo que no dice «Opcional» hay que completarlo.",
    render: (p) => <Paso1InfoBasica {...p} parte="info" />,
    completa: (fd) =>
      Boolean(fd.tipo && fd.categoria && fd.nombre?.trim().length >= 3 && fd.descripcion?.trim().length >= 10),
  },
  {
    clave: "contacto",
    corto: "WhatsApp",
    titulo: "¿Dónde te escriben?",
    subtitulo: "Los clientes te contactan directo a tu WhatsApp.",
    render: (p) => <Paso4ContactoOpciones {...p} parte="whatsapp" />,
    completa: (fd) => (fd.whatsapp || "").replace(/\D/g, "").length >= 10,
  },
  {
    clave: "fotos",
    corto: "Fotos",
    titulo: "Fotos",
    subtitulo: "Las publicaciones con fotos reciben muchas más consultas.",
    opcional: true,
    render: (p) => <Paso2ImagenesUbicacion {...p} />,
    completa: (fd) =>
      Boolean(fd.portadaFile || fd.portadaPreview || fd.portadaDB || (fd.imagenesPreview || []).length),
  },
  {
    clave: "ubicacion",
    corto: "Ubicación",
    titulo: "¿Dónde estás?",
    subtitulo: "Para aparecer en el mapa y que lleguen fácil.",
    render: (p) => <Paso1InfoBasica {...p} parte="ubicacion" />,
    completa: (fd) =>
      Boolean(fd.direccion_escrita?.trim().length >= 5 && fd.ubicacion?.lat && fd.ubicacion?.lng),
  },
  {
    clave: "horarios",
    corto: "Horarios",
    titulo: "¿Cuándo atendés?",
    subtitulo: "Así saben cuándo escribirte o pasar.",
    render: (p) => <Paso3DetallesDisponibilidad {...p} />,
    completa: tieneHorarioCompleto,
  },
  {
    clave: "extras",
    corto: "Redes",
    titulo: "Redes y más datos",
    subtitulo: "Instagram, Facebook, email y lo que habilite tu plan.",
    opcional: true,
    render: (p) => <Paso4ContactoOpciones {...p} parte="extras" />,
    completa: (fd) => Boolean(fd.email || fd.instagram || fd.facebook),
  },
  {
    clave: "resumen",
    corto: "Revisar",
    titulo: "Revisá y publicá",
    subtitulo: "Mirá cómo quedó antes de publicar.",
    render: (p) => <Paso5ResumenConfirmacion {...p} />,
    completa: () => false,
  },
];

const OBLIGATORIAS = SECCIONES.filter((s) => !s.opcional && s.clave !== "resumen");

const CLAVE_BORRADOR = 'goyanova_borrador_publicar';

const CAMPOS_BORRADOR = [
  'nombre', 'tipo', 'categoria', 'descripcion', 'direccion_escrita', 'ubicacion',
  'tipoDisponibilidad', 'horarios', 'diasActivos', 'mensaje', 'whatsapp', 'whatsappTexto',
  'whatsappExtranjero', 'prefijo', 'categoriaNombre',
  'email', 'instagram', 'facebook', 'metodos_pago', 'acepta_cuotas', 'hace_envios',
  'alcance_envio', 'sitio_web', 'whatsapp_mensaje_personalizado', 'reglas_devoluciones'
];

const borradorTieneContenido = (borrador) => {
  if (!borrador) return false;
  return Boolean(
    borrador.nombre?.trim() ||
    borrador.descripcion?.trim() ||
    borrador.direccion_escrita?.trim() ||
    borrador.whatsapp?.trim() ||
    borrador.whatsappTexto?.trim()
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
  const chipsRef = useRef(null);
  const contenedorRef = useRef(null);
  const barraRef = useRef(null);
  const [altoBarra, setAltoBarra] = useState(0);
  const [membresiaUsuario, setMembresiaUsuario] = useState(null);
  const [limiteImagenes, setLimiteImagenes] = useState(5);
  const [cargado, setCargado] = useState(false);
  const [cargando, setCargando] = useState(false);

  // 🆕 Características del plan activo, para gatear campos del formulario
  const { tiene: tieneCaracteristica } = useCaracteristicasPlan();

  // ------------------ Sección visible (para la barra de arriba) ------------------
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibles = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visibles.length > 0) {
          const nuevoPaso = seccionesRefs.current.findIndex((r) => r === visibles[0].target);
          if (nuevoPaso !== -1) setPasoActivo(nuevoPaso);
        }
      },
      // Cuenta como "actual" la sección que ocupa la franja de arriba de la pantalla
      { root: null, rootMargin: "-25% 0px -60% 0px", threshold: 0 }
    );

    observerRef.current = observer;
    seccionesRefs.current.forEach((ref) => ref && observer.observe(ref));
    return () => observer.disconnect();
  }, [cargando]);

  // Mantener visible el botón de la sección actual en la barra.
  // Solo se desplaza la fila de botones hacia los costados (nunca la página).
  useEffect(() => {
    const fila = chipsRef.current;
    const boton = fila?.querySelector(`[data-idx="${pasoActivo}"]`);
    if (!fila || !boton) return;
    const destino = boton.offsetLeft - fila.clientWidth / 2 + boton.offsetWidth / 2;
    // Sin animación: un desplazamiento animado acá frenaba el scroll de la página
    fila.scrollLeft = Math.max(0, destino);
  }, [pasoActivo]);

  // La barra va fija arriba con el mismo ancho que el formulario (también dentro
  // del Panel, que tiene menú al costado). Se deja un espacio igual a su alto.
  useLayoutEffect(() => {
    const contenedor = contenedorRef.current;
    const barra = barraRef.current;
    if (!contenedor || !barra) return undefined;

    const acomodar = () => {
      const r = contenedor.getBoundingClientRect();
      barra.style.left = `${r.left}px`;
      barra.style.width = `${r.width}px`;
      setAltoBarra(barra.offsetHeight);
    };

    acomodar();
    const observador = new ResizeObserver(acomodar);
    observador.observe(contenedor);
    observador.observe(barra);
    window.addEventListener("resize", acomodar);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", acomodar);
    };
  }, [cargando]);

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

  const irASeccion = (idx) => {
    setPasoActivo(idx);
    seccionesRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ------------------ useMemo ------------------
  const propsPaso = useMemo(() => ({
    formData,
    setFormData: setFormDataSeguro,
    errores,
    setErrores,
    irAlSiguientePaso: () => {
      if (pasoActivo < SECCIONES.length - 1) irASeccion(pasoActivo + 1);
    },
    limiteImagenes,
    membresiaUsuario,
    // 🆕 gating por plan
    puedeFotoReferencia: tieneCaracteristica('foto_referencia_ubicacion'),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [formData, setFormDataSeguro, errores, limiteImagenes, membresiaUsuario, pasoActivo, tieneCaracteristica]);

  const estados = SECCIONES.map((s) => s.completa(formData));
  const obligatoriasListas = OBLIGATORIAS.filter((s) => s.completa(formData)).length;
  const progreso = Math.round((obligatoriasListas / OBLIGATORIAS.length) * 100);
  const todoListo = obligatoriasListas === OBLIGATORIAS.length;

  const handlePublicar = async () => {
    const { nuevosErrores } = validarCamposRequeridos(formData, setErrores);

    let erroresTurnos = [];

    if (formData.tipoDisponibilidad !== "whatsapp" && formData.tipoDisponibilidad !== "no_disponible") {
      const diasActivos = formData.diasActivos || {};
      erroresTurnos = validarTurnos(formData.horarios, diasActivos, formData.tipoDisponibilidad);
    }

    const todosErrores = { ...nuevosErrores };
    if (erroresTurnos.length) todosErrores.erroresTurnos = erroresTurnos;

    if (Object.keys(todosErrores).length) {
      setErrores(todosErrores);

      // Lleva a la primera sección que tiene algo para corregir
      const camposConError = Object.keys(todosErrores);
      const indicePaso = SECCIONES.findIndex((_, i) =>
        camposConError.some((campo) => seccionesRefs.current[i]?.querySelector(`[name="${campo}"]`))
      );
      const destino = indicePaso !== -1 ? indicePaso : todosErrores.erroresTurnos || todosErrores.tipoDisponibilidad
        ? SECCIONES.findIndex((s) => s.clave === "horarios")
        : -1;
      if (destino !== -1) irASeccion(destino);

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
    <div className="psf-container" ref={contenedorRef}>
      {/* Barra de arriba (siempre visible): volver, progreso, guardar y atajos a cada sección */}
      <nav className="psf-barra" ref={barraRef} aria-label="Secciones del formulario">
        <div className="psf-barra-fila">
          <button type="button" className="psf-volver" onClick={() => navigate(-1)} aria-label="Volver">
            <span className="material-icons">arrow_back</span>
          </button>
          <div className="psf-barra-titulos">
            <strong>{id ? "Editar publicación" : "Nueva publicación"}</strong>
            <span>
              {id
                ? "Cambiá lo que quieras y tocá Guardar"
                : todoListo
                  ? "¡Todo listo para publicar!"
                  : `${obligatoriasListas} de ${OBLIGATORIAS.length} pasos obligatorios`}
            </span>
          </div>
          {id || todoListo ? (
            <button type="button" className="psf-barra-guardar" onClick={handlePublicar}>
              <span className="material-icons">{id ? "save" : "rocket_launch"}</span>
              {id ? "Guardar" : "Publicar"}
            </button>
          ) : (
            <span className="psf-barra-porcentaje">{progreso}%</span>
          )}
        </div>
        <div
          className="psf-progreso"
          role="progressbar"
          aria-valuenow={progreso}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progreso de la publicación"
        >
          <span style={{ width: `${progreso}%` }} />
        </div>
        <div className="psf-atajos" ref={chipsRef}>
          {SECCIONES.map((s, idx) => (
            <button
              key={s.clave}
              type="button"
              data-idx={idx}
              className={`psf-atajo ${pasoActivo === idx ? "activo" : ""} ${estados[idx] ? "ok" : ""}`}
              onClick={() => irASeccion(idx)}
              aria-current={pasoActivo === idx ? "step" : undefined}
            >
              <span className="psf-atajo-num" aria-hidden="true">
                {estados[idx] ? <span className="material-icons">check</span> : idx + 1}
              </span>
              {s.corto}
            </button>
          ))}
        </div>
      </nav>
      <div className="psf-barra-espacio" style={{ height: altoBarra }} aria-hidden="true" />

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
        {SECCIONES.map((seccion, idx) => (
          <SeccionFormulario
            key={seccion.clave}
            id={`psf-seccion-${idx}`}
            ref={(el) => (seccionesRefs.current[idx] = el)}
            numero={idx + 1}
            seccion={seccion}
            completa={estados[idx]}
          >
            {seccion.render(propsPaso)}
          </SeccionFormulario>
        ))}
        <div className="psf-controles-final">
          {!todoListo && (
            <p className="psf-controles-aviso">
              <span className="material-icons">info</span>
              Te falta completar:{" "}
              {OBLIGATORIAS.filter((s) => !s.completa(formData)).map((s) => s.corto).join(", ")}
            </p>
          )}
          <button
            type="button"
            className="psf-btn-siguiente"
            onClick={handlePublicar}
          >
            <span className="material-icons">{id ? "save" : "rocket_launch"}</span>
            {id ? "Guardar cambios" : "Publicar ahora"}
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
        <div className="modal-errorr show" role="alertdialog" aria-modal="true" aria-labelledby="psf-errores-titulo">
          <div className="modal-contenidoo">
            <span className="material-icons psf-errores-icono">priority_high</span>
            <h3 id="psf-errores-titulo">Faltan algunos datos</h3>
            {errorModal}
            <button onClick={() => setErrorModal(null)}>Entendido, lo corrijo</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicarServicioForm;
