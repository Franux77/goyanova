import React, { useState } from "react";
import "./Paso5ResumenConfirmacion.css";

const Paso5ResumenConfirmacion = ({ formData, setErroresGlobales }) => {
  const [modalImagen, setModalImagen] = useState(null);

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
      <h3>Paso 5: Resumen Final</h3>

      <div className="paso5-group">
        <h4>Información Básica</h4>
        <p><strong>Nombre:</strong> {nombre || "No proporcionado"}</p>
        <p><strong>Tipo:</strong> {tipo || "No proporcionado"}</p>
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
        <h4>Foto portada</h4>
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
        <h4>Imágenes de tus trabajos</h4>
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

      <div className="paso5-group">
        <h4>Disponibilidad</h4>
        {renderDisponibilidad()}
      </div>

      <div className="paso5-group">
        <h4>Contacto</h4>
        <p><strong>WhatsApp:</strong> {whatsapp || <span style={{ color: "red" }}>No proporcionado</span>}</p>
        <p><strong>Email:</strong> {email || "No proporcionado"}</p>
        <p><strong>Instagram:</strong> {instagram || "No proporcionado"}</p>
        <p><strong>Facebook:</strong> {facebook || "No proporcionado"}</p>
      </div>

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