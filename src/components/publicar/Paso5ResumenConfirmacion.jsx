import React, { useState, useEffect } from "react";
import "./Paso5ResumenConfirmacion.css";
import { supabase } from "../../utils/supabaseClient";
import { useCaracteristicasPlan } from "../../hooks/useCaracteristicasPlan";
import { analizarWhatsapp } from "../../utils/whatsapp";

const Paso5ResumenConfirmacion = ({ formData, setErroresGlobales }) => {
  const [modalImagen, setModalImagen] = useState(null);
  const { tiene, cargando: cargandoPlan } = useCaracteristicasPlan();
  const [etiquetasPago, setEtiquetasPago] = useState({});

  // Qué habilita el plan (lo mismo que se usa al guardar: si el plan no lo
  // incluye, ese dato no se guarda, así que tampoco se muestra acá)
  const puedePagos = !cargandoPlan && tiene("metodos_pago_formulario");
  const puedeEnvios = !cargandoPlan && tiene("envios_formulario");
  const puedeSitioWeb = !cargandoPlan && tiene("link_sitio_web");
  const puedeMensajeWsp = !cargandoPlan && tiene("whatsapp_mensaje_personalizado");
  const puedeReglas = !cargandoPlan && tiene("reglas_devoluciones");
  const puedeFotoReferencia = !cargandoPlan && tiene("foto_referencia_ubicacion");

  const metodosElegidos = formData.metodos_pago || [];

  // Nombres lindos de los métodos de pago ("transferencia" → "Transferencia bancaria")
  useEffect(() => {
    if (!puedePagos || metodosElegidos.length === 0) return;
    let activo = true;
    supabase
      .from("metodos_pago_catalogo")
      .select("codigo, etiqueta")
      .then(({ data }) => {
        if (!activo || !data) return;
        const mapa = {};
        data.forEach((m) => (mapa[m.codigo] = m.etiqueta));
        setEtiquetasPago(mapa);
      });
    return () => {
      activo = false;
    };
  }, [puedePagos, metodosElegidos.length]);

  const ALCANCES = { ciudad: "Dentro de la ciudad", provincia: "Dentro de la provincia", nacional: "A todo el país" };
  const fotoReferencia = formData.referenciaPreview || formData.referenciaDB;

  const extrasPlan = [
    puedeSitioWeb && formData.sitio_web && { icono: "language", titulo: "Sitio web", texto: formData.sitio_web },
    puedePagos && metodosElegidos.length > 0 && {
      icono: "payments",
      titulo: "Métodos de pago",
      texto: metodosElegidos.map((c) => etiquetasPago[c] || c).join(", ") + (formData.acepta_cuotas ? " · Acepta cuotas" : ""),
    },
    puedePagos && metodosElegidos.length === 0 && formData.acepta_cuotas && { icono: "payments", titulo: "Pagos", texto: "Acepta cuotas" },
    puedeEnvios && formData.hace_envios && {
      icono: "local_shipping",
      titulo: "Envíos",
      texto: ALCANCES[formData.alcance_envio] || "Hace envíos (falta elegir a dónde)",
    },
    puedeMensajeWsp && formData.whatsapp_mensaje_personalizado?.trim() && {
      icono: "chat",
      titulo: "Mensaje automático de WhatsApp",
      texto: `"${formData.whatsapp_mensaje_personalizado.trim()}"`,
    },
    puedeReglas && formData.reglas_devoluciones?.trim() && {
      icono: "gavel",
      titulo: "Reglas, devoluciones y condiciones",
      texto: formData.reglas_devoluciones.trim(),
    },
  ].filter(Boolean);

  const hayAlgoDelPlan = puedePagos || puedeEnvios || puedeSitioWeb || puedeMensajeWsp || puedeReglas;

  const {
    nombre,
    tipo,
    categoria,
    descripcion,
    direccion_escrita,
    imagenesPreview,
    tipoDisponibilidad,
    horarios,
    mensajePedido,
    whatsapp,
    email,
    instagram,
    facebook,
    ubicacion,
    fotoPortada,
    portadaPreview,
  } = formData;

  const renderDisponibilidad = () => {
    if (!tipoDisponibilidad) return <p>No se ha seleccionado disponibilidad.</p>;

    const renderTurnos = (turnos) =>
      turnos.length === 0 ? (
        <p className="paso5-no-disponible">Sin turnos definidos.</p>
      ) : (
        turnos.map((turno, i) => {
          const inicio = (turno.inicio || turno.hora_inicio || "").slice(0, 5);
          const fin = (turno.fin || turno.hora_fin || "").slice(0, 5);
          return (
            <span key={i} className="paso5-turno">
              {inicio} - {fin}
            </span>
          );
        })
      );

    switch (tipoDisponibilidad) {
      case "horarios":
        return (
          <div className="paso5-disponibilidad-box">
            <p><strong>Tipo:</strong> Horario fijo semanal</p>
            {Object.entries(horarios || {}).map(([dia, turnos]) => (
              <div key={dia} className="paso5-dia">
                <strong>{dia.charAt(0).toUpperCase() + dia.slice(1)}:</strong>
                {renderTurnos(turnos)}
              </div>
            ))}
          </div>
        );
      case "por_turnos":
        return (
          <div className="paso5-disponibilidad-box">
            <p><strong>Tipo:</strong> Por turnos</p>
            {Object.entries(horarios || {}).map(([dia, turnos]) => (
              <div key={dia} className="paso5-dia">
                <strong>{dia.charAt(0).toUpperCase() + dia.slice(1)}:</strong>
                {turnos.length === 0 ? (
                  <p className="paso5-no-disponible">Sin turnos definidos.</p>
                ) : (
                  turnos.map((turno, i) => {
                    const inicio = (turno.inicio || turno.hora_inicio || "").slice(0, 5);
                    const fin = (turno.fin || turno.hora_fin || "").slice(0, 5);
                    return (
                      <span key={i} className="paso5-turno">
                        {inicio && fin ? `${inicio} - ${fin}` : "Sin horario"}
                      </span>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        );
      case "por_pedido":
        return (
          <div className="paso5-disponibilidad-box">
            <p><strong>Tipo:</strong> Por pedido anticipado</p>
            <p style={{ marginBottom: "1rem" }}>
              {mensajePedido ? <em>{mensajePedido}</em> : <em>Se trabaja por pedidos anticipados.</em>}
            </p>
            {Object.entries(horarios || {}).map(([dia, turnos]) => (
              <div key={dia} className="paso5-dia">
                <strong>{dia.charAt(0).toUpperCase() + dia.slice(1)}:</strong>
                {renderTurnos(turnos)}
              </div>
            ))}
          </div>
        );
      case "whatsapp":
        return (
          <div className="paso5-disponibilidad-box">
            <p><strong>Tipo:</strong> Consultar por WhatsApp</p>
            <p><em>Consultar por whatsapp disponibilidad</em></p>
          </div>
        );
      case "no_disponible":
        return (
          <div className="paso5-disponibilidad-box">
            <p><strong>Tipo:</strong> No disponible</p>
            <p><em>Actualmente este servicio no tiene disponibilidad.</em></p>
          </div>
        );
      default:
        return <p>No se ha seleccionado disponibilidad.</p>;
    }
  };

  const validarAntesDePublicar = () => {
    const errores = {};
    if (!nombre || nombre.trim().length < 3) errores.nombre = "Nombre obligatorio";
    if (!tipo) errores.tipo = "Tipo obligatorio";
    if (!categoria) errores.categoria = "Categoría obligatoria";
    if (!descripcion || descripcion.trim().length < 10) errores.descripcion = "Descripción obligatoria";
    if (!direccion_escrita || direccion_escrita.trim().length < 5) errores.direccion = "Dirección obligatoria";
    if (!ubicacion?.lat || !ubicacion?.lng) errores.ubicacion = "Ubicación obligatoria";
    if (!whatsapp || whatsapp.replace(/\D/g, "").length < 10) errores.whatsapp = "WhatsApp obligatorio y debe ser válido";

    if (setErroresGlobales) setErroresGlobales(errores);
    return Object.keys(errores).length === 0;
  };

  return (
    <div className="paso5-resumen-container">

      <div className="paso5-group">
        <h4>Datos principales</h4>
        <p><strong>Nombre:</strong> {nombre || "No proporcionado"}</p>
        <p><strong>Tipo:</strong> {tipo === "servicio" ? "Oficio o servicio" : tipo === "producto" ? "Negocio o productos" : "No proporcionado"}</p>
        <p><strong>Categoría:</strong> {formData.categoriaNombre || "No proporcionada"}</p>
        <p><strong>Descripción:</strong> {descripcion || "No proporcionada"}</p>
        <p><strong>Dirección:</strong> {direccion_escrita || "No proporcionada"}</p>
        <p><strong>Referencia:</strong> {ubicacion?.referencia || "Sin referencia"}</p>
      </div>

      {ubicacion?.lat && ubicacion?.lng ? (
        <div className="paso5-mini-mapa">
          <iframe
            title="Mapa de ubicación"
            width="100%"
            height="200"
            style={{ border: 0, borderRadius: "10px" }}
            loading="lazy"
            allowFullScreen
            src={`https://maps.google.com/maps?q=${ubicacion.lat},${ubicacion.lng}&z=15&output=embed`}
          ></iframe>
          <div style={{ marginTop: "8px" }}>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${ubicacion.lat},${ubicacion.lng}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver en Google Maps
            </a>
          </div>
        </div>
      ) : <p className="Ubi"><strong>Ubicación:</strong> No disponible.</p>}

      <div className="paso5-group">
        <h4>Tu foto principal</h4>
        {formData.portadaPreview ? (
          <div className="paso5-imagenes-carrusel">
            <div 
              className="paso5-imagen-wrapper"
              onClick={() => setModalImagen(formData.portadaPreview)}
              style={{ cursor: 'pointer' }}
            >
              <img
                src={formData.portadaPreview}
                alt="Portada del servicio"
                className="paso5-imagen"
              />
            </div>
          </div>
        ) : (
          <p className="paso5-sin-imagen">Todavía no subiste una portada.</p>
        )}
      </div>

      <div className="paso5-group">
        <h4>Más fotos</h4>
        {formData.imagenesPreview && formData.imagenesPreview.length > 0 ? (
          <div className="paso5-imagenes-carrusel">
            {formData.imagenesPreview.map((src, i) => (
              <div 
                key={i} 
                className="paso5-imagen-wrapper"
                onClick={() => setModalImagen(src)}
                style={{ cursor: 'pointer' }}
              >
                <img
                  src={src}
                  alt={`Imagen ${i + 1}`}
                  className="paso5-imagen"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="paso5-sin-imagen">Todavía no subiste imágenes de trabajos.</p>
        )}
      </div>

      {puedeFotoReferencia && (
        <div className="paso5-group">
          <h4>Foto del frente o del lugar</h4>
          {fotoReferencia ? (
            <div className="paso5-imagenes-carrusel">
              <div
                className="paso5-imagen-wrapper"
                onClick={() => setModalImagen(fotoReferencia)}
                style={{ cursor: "pointer" }}
              >
                <img src={fotoReferencia} alt="Foto de referencia del lugar" className="paso5-imagen" />
              </div>
            </div>
          ) : (
            <p className="paso5-sin-imagen">No agregaste foto de referencia (es opcional).</p>
          )}
        </div>
      )}

      <div className="paso5-group">
        <h4>Cuándo trabajás</h4>
        {renderDisponibilidad()}
      </div>

      <div className="paso5-group">
        <h4>Cómo te contactan</h4>
        <p><strong>WhatsApp:</strong> {whatsapp ? (formData.whatsappExtranjero ? `+${whatsapp}` : analizarWhatsapp(whatsapp).visible || whatsapp) : <span style={{ color: "#dc2626" }}>Falta completar</span>}</p>
        <p><strong>Email:</strong> {email || "No proporcionado"}</p>
        <p><strong>Instagram:</strong> {instagram || "No proporcionado"}</p>
        <p><strong>Facebook:</strong> {facebook || "No proporcionado"}</p>
      </div>

      {hayAlgoDelPlan && (
        <div className="paso5-group psf-resumen-plan">
          <h4>
            <span className="material-icons">workspace_premium</span>
            Lo que suma tu plan
          </h4>
          {extrasPlan.length > 0 ? (
            <ul className="psf-resumen-extras">
              {extrasPlan.map((x) => (
                <li key={x.titulo}>
                  <span className="material-icons">{x.icono}</span>
                  <div>
                    <strong>{x.titulo}</strong>
                    <p>{x.texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="paso5-sin-imagen">
              Tu plan te deja agregar pagos, envíos y más en la sección "Redes y más datos". Todavía no completaste nada.
            </p>
          )}
        </div>
      )}

      {modalImagen && (
        <div className="paso5-modal-overlay" onClick={() => setModalImagen(null)}>
          <div className="paso5-modal-contenido" onClick={(e) => e.stopPropagation()}>
            <button className="paso5-modal-close" onClick={() => setModalImagen(null)}>×</button>
            <img src={modalImagen} alt="Vista ampliada" className="paso5-modal-imagen" />
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(Paso5ResumenConfirmacion);