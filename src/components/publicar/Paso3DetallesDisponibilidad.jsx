import React, { useState, useEffect, useMemo, useRef } from "react";
import "./Paso3DetallesDisponibilidad.css";
import { normalizarDia } from "./utils/helpers";

const diasSemana = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

const deepEqual = (a, b) => {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
};

const mapDisponibilidadToForm = (disponibilidades = []) => {
  const horarios = {};
  disponibilidades.forEach((fila) => {
    const diaRaw = fila.dia;
    if (!diaRaw) return;
    const dia = String(diaRaw).trim().toLowerCase();
    if (!horarios[dia]) horarios[dia] = [];
    horarios[dia].push({
      inicio: fila.hora_inicio ?? fila.inicio ?? "",
      fin: fila.hora_fin ?? fila.fin ?? "",
      turno: fila.turno ?? null,
      titulo:
        fila.titulo ||
        (fila.tipo === "horarios"
          ? "Horario fijo"
          : fila.tipo === "por_turnos"
          ? "Se trabaja por turnos"
          : "Disponible por pedido"),
    });
  });

  const filaConMensaje = disponibilidades.find(
    (d) => d.mensaje && d.mensaje.trim() !== ""
  );

  return {
    tipoDisponibilidad: disponibilidades[0]?.tipo || "horarios",
    mensaje: filaConMensaje?.mensaje || "",
    horarios,
  };
};

const normalizeTipo = (tipo) => {
  const t = String(tipo || "").toLowerCase();
  if (["horarios", "horario"].includes(t)) return "horario";
  if (["por_turnos", "turnos"].includes(t)) return "turnos";
  if (["por_pedido", "pedido"].includes(t)) return "pedido";
  if (["whatsapp", "consultar"].includes(t)) return "consultar";
  if (["no_disponible", "nodisp"].includes(t)) return "nodisp";
  return t || "horario";
};

const normalizeHorariosObj = (horariosObj = {}) => {
  const normalized = {};
  Object.keys(horariosObj || {}).forEach((k) => {
    const diaKey = normalizarDia(k).toLowerCase();
    const arr = Array.isArray(horariosObj[k]) ? horariosObj[k] : [];
    normalized[diaKey] = arr.map((t) => ({
      inicio: t.inicio ?? "",
      fin: t.fin ?? "",
      turno: t.turno ?? null,
      titulo: t.titulo ?? "",
    }));
  });
  return normalized;
};

export default function Paso3Disponibilidad({ formData = {}, setFormData }) {
  const mountedRef = useRef(false);
  const prevDataRef = useRef(formData);
  const lastPayloadRef = useRef(null);
  const updatingFromStateRef = useRef(false);

  const normalized = useMemo(() => {
    const hasHorariosObj = formData?.horarios && Object.keys(formData.horarios).length > 0;
    const hasDisponibilidades = Array.isArray(formData?.disponibilidades) && formData.disponibilidades.length > 0;

    if (hasHorariosObj) {
      return {
        tipo: normalizeTipo(formData.tipoDisponibilidad || formData.tipo),
        mensaje: formData.mensaje || "",
        horarios: normalizeHorariosObj(formData.horarios),
      };
    }

    if (hasDisponibilidades) {
      const mapped = mapDisponibilidadToForm(formData.disponibilidades);
      return {
        tipo: normalizeTipo(mapped.tipoDisponibilidad),
        mensaje: mapped.mensaje || "",
        horarios: normalizeHorariosObj(mapped.horarios),
      };
    }

    return { tipo: "horario", mensaje: "", horarios: {} };
  }, [formData]);

  const [modo, setModo] = useState(normalized.tipo);
  const [mensaje, setMensaje] = useState(normalized.mensaje);

  const [diasActivos, setDiasActivos] = useState(() => {
    const activos = {};
    diasSemana.forEach((dia) => {
      const diaKey = dia.toLowerCase();
      const horariosDia = normalized.horarios[diaKey];
      activos[dia] = Array.isArray(horariosDia) && horariosDia.length > 0;
    });
    return activos;
  });

  const [turnos, setTurnos] = useState(() => {
    const turnosIniciales = {};
    diasSemana.forEach((dia) => {
      const diaKey = dia.toLowerCase();
      const horariosDia = normalized.horarios[diaKey];
      
      if (Array.isArray(horariosDia) && horariosDia.length > 0) {
        turnosIniciales[dia] = horariosDia.map((t) => ({
          inicio: t.inicio || "",
          fin: t.fin || "",
        }));
      } else {
        turnosIniciales[dia] = [{ inicio: "", fin: "" }];
      }
    });
    return turnosIniciales;
  });

  const [modalDia, setModalDia] = useState(null);
  const [copiarAResto, setCopiarAResto] = useState(false);
  const [errores, setErrores] = useState({});

  useEffect(() => {
    if (!formData || updatingFromStateRef.current) return;

    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    const currentPayload = {
      tipoDisponibilidad: formData.tipoDisponibilidad,
      mensaje: formData.mensaje,
      horarios: formData.horarios,
      disponibilidades: formData.disponibilidades,
    };

    if (deepEqual(currentPayload, lastPayloadRef.current)) {
      return;
    }

    const prevHorarios = prevDataRef.current?.horarios;
    const prevTipo = prevDataRef.current?.tipoDisponibilidad;
    const prevMensaje = prevDataRef.current?.mensaje;

    const currentHorarios = formData.horarios;
    const currentTipo = formData.tipoDisponibilidad;
    const currentMensaje = formData.mensaje;

    const tieneHorariosReales = currentHorarios && Object.keys(currentHorarios).length > 0;

    const esCambioExterno = 
      prevTipo !== currentTipo || 
      (!tieneHorariosReales && !deepEqual(prevHorarios, currentHorarios));

    if (!esCambioExterno && prevMensaje === currentMensaje) {
      return;
    }

    prevDataRef.current = formData;

    const nuevoTipo = normalizeTipo(currentTipo || formData.tipo);
    const nuevoMensaje = currentMensaje || "";
    const nuevosHorarios = normalizeHorariosObj(currentHorarios || {});

    const nuevoDiasActivos = {};
    const nuevosTurnos = {};

    diasSemana.forEach((dia) => {
      const diaKey = dia.toLowerCase();
      const horariosDia = nuevosHorarios[diaKey];

      if (Array.isArray(horariosDia) && horariosDia.length > 0) {
        nuevoDiasActivos[dia] = true;
        nuevosTurnos[dia] = horariosDia.map((t) => ({
          inicio: t.inicio || "",
          fin: t.fin || "",
        }));
      } else {
        nuevoDiasActivos[dia] = diasActivos[dia] || false;
        nuevosTurnos[dia] = turnos[dia] || [{ inicio: "", fin: "" }];
      }
    });

    if (modo !== nuevoTipo) {
      setModo(nuevoTipo);
    }
    
    if (mensaje !== nuevoMensaje && !modalDia) {
      setMensaje(nuevoMensaje);
    }
    
    if (!modalDia) {
      if (!deepEqual(diasActivos, nuevoDiasActivos)) {
        setDiasActivos(nuevoDiasActivos);
      }
      
      if (!deepEqual(turnos, nuevosTurnos)) {
        setTurnos(nuevosTurnos);
      }
    }

  }, [formData, modalDia, modo, mensaje, diasActivos, turnos]);

  useEffect(() => {
    if (!mountedRef.current || modalDia) return;

    let payload;

    if (modo === "consultar" || modo === "nodisp") {
      const tipoFinal = modo === "consultar" ? "whatsapp" : "no_disponible";
      const tituloFinal = modo === "consultar" ? "Consultar disponibilidad por Whatsapp" : "Este servicio está fuera de servicio";

      payload = {
        tipoDisponibilidad: tipoFinal,
        mensaje: null,
        horarios: {},
        diasActivos: {},
        disponibilidades: [
          {
            dia: null,
            inicio: null,
            fin: null,
            turno: null,
            titulo: tituloFinal,
            tipo: tipoFinal,
          },
        ],
      };
    } else {
      const horariosLimpios = {};

      diasSemana.forEach((dia) => {
        if (diasActivos[dia]) {
          const bloques = (turnos[dia] || []).filter((t) => t.inicio && t.fin);

          if (bloques.length > 0) {
            const diaKey = dia.toLowerCase();
            horariosLimpios[diaKey] = bloques.map(({ inicio, fin }, idx) => ({
              inicio: inicio.length === 5 ? `${inicio}:00` : inicio,
              fin: fin.length === 5 ? `${fin}:00` : fin,
              turno: modo === "turnos" ? idx + 1 : null,
              titulo:
                modo === "horario"
                  ? "Horario fijo"
                  : modo === "turnos"
                  ? "Se trabaja por turnos"
                  : "Disponible por pedido",
              tipo:
                modo === "horario"
                  ? "horarios"
                  : modo === "turnos"
                  ? "por_turnos"
                  : "por_pedido",
            }));
          }
        }
      });

      const tipoFinal =
        modo === "horario"
          ? "horarios"
          : modo === "turnos"
          ? "por_turnos"
          : "por_pedido";

      const mensajeFinal = (modo === "turnos" || modo === "pedido") ? (mensaje?.trim() || null) : null;

      payload = {
        tipoDisponibilidad: tipoFinal,
        mensaje: mensajeFinal,
        horarios: horariosLimpios,
        diasActivos,
        disponibilidades: Object.entries(horariosLimpios).flatMap(([dia, arr]) =>
          arr.map((h) => ({ ...h, dia }))
        ),
      };
    }

    if (deepEqual(payload, lastPayloadRef.current)) {
      return;
    }

    lastPayloadRef.current = payload;

    if (typeof setFormData === "function") {
      updatingFromStateRef.current = true;
      
      setFormData((prev) => {
        const prevSubset = {
          tipoDisponibilidad: prev?.tipoDisponibilidad,
          mensaje: prev?.mensaje,
          horarios: prev?.horarios,
          diasActivos: prev?.diasActivos,
          disponibilidades: prev?.disponibilidades,
        };

        if (deepEqual(prevSubset, payload)) {
          updatingFromStateRef.current = false;
          return prev;
        }

        const newData = { ...(prev || {}), ...payload };
        
        setTimeout(() => {
          updatingFromStateRef.current = false;
        }, 0);
        
        return newData;
      });
    }
  }, [modo, diasActivos, turnos, mensaje, modalDia, setFormData]);

  const handleChangeTurno = (dia, i, campo, valor) => {
    const nuevos = [...(turnos[dia] || [])];
    nuevos[i] = { ...nuevos[i], [campo]: valor };
    setTurnos((prev) => ({ ...prev, [dia]: nuevos }));

    if (valor) {
      setErrores((prev) => {
        const nuevo = { ...prev };
        delete nuevo[`${dia}-${i}-${campo}`];
        delete nuevo[`${dia}-${i}-rango`];
        delete nuevo[`${dia}-${i}-superposicion`];
        return nuevo;
      });
    }
  };

  const agregarTurno = (dia) => {
    if ((turnos[dia] || []).length >= 2) return;
    setTurnos((prev) => ({
      ...prev,
      [dia]: [...(prev[dia] || []), { inicio: "", fin: "" }],
    }));
  };

  const eliminarTurno = (dia, i) => {
    setTurnos((prev) => {
      const nuevos = [...(prev[dia] || [])];
      nuevos.splice(i, 1);
      return { ...prev, [dia]: nuevos.length ? nuevos : [{ inicio: "", fin: "" }] };
    });
    
    setErrores((prev) => {
      const nuevo = { ...prev };
      delete nuevo[`${dia}-${i}-inicio`];
      delete nuevo[`${dia}-${i}-fin`];
      delete nuevo[`${dia}-${i}-rango`];
      delete nuevo[`${dia}-${i}-superposicion`];
      return nuevo;
    });
  };

  const guardarModal = () => {
    if (!modalDia) return;
    
    const turnosDelDia = turnos[modalDia] || [];
    const erroresValidacion = {};

    turnosDelDia.forEach((turno, idx) => {
      if (!turno.inicio) {
        erroresValidacion[`${modalDia}-${idx}-inicio`] = "Hora de inicio requerida";
      }
      if (!turno.fin) {
        erroresValidacion[`${modalDia}-${idx}-fin`] = "Hora de fin requerida";
      }
      
      if (turno.inicio && turno.fin && turno.inicio >= turno.fin) {
        erroresValidacion[`${modalDia}-${idx}-rango`] = "La hora de inicio debe ser menor que la de fin";
      }

      if (idx > 0 && turnosDelDia[idx - 1].fin && turno.inicio) {
        if (turnosDelDia[idx - 1].fin > turno.inicio) {
          erroresValidacion[`${modalDia}-${idx}-superposicion`] = "Se superpone con el turno anterior";
        }
      }
    });

    if (Object.keys(erroresValidacion).length > 0) {
      setErrores((prev) => ({ ...prev, ...erroresValidacion }));
      return;
    }

    if (copiarAResto) {
      const copia = { ...turnos };
      diasSemana.forEach((dia) => {
        if (dia !== modalDia && diasActivos[dia])
          copia[dia] = turnos[modalDia].map((t) => ({ ...t }));
      });
      setTurnos(copia);
    }

    const nuevosErrores = { ...errores };
    Object.keys(nuevosErrores).forEach((key) => {
      if (key.startsWith(modalDia)) delete nuevosErrores[key];
    });
    setErrores(nuevosErrores);
    setModalDia(null);
    setCopiarAResto(false);
  };

  return (
    <div className="paso3-wrapper">
      <h2 className="paso3-titulo">Paso 3: ¿Cuándo trabajás?</h2>

      <div className="opciones-disponibilidad">
        {["horario", "turnos", "pedido", "consultar", "nodisp"].map((op) => (
          <button key={op} className={modo === op ? "activa" : ""} onClick={() => setModo(op)}>
            {op === "horario" && "Siempre el mismo horario"}
{op === "turnos" && "Trabajo por turnos"}
{op === "pedido" && "Solo con pedido"}
{op === "consultar" && "Consultame por WhatsApp"}
{op === "nodisp" && "Cerrado ahora"}
          </button>
        ))}
      </div>

      {(modo === "horario" || modo === "turnos" || modo === "pedido") && (
        <div className="bloque-horario">
          {(modo === "pedido" || modo === "turnos") && (
            <div className="mensaje-pedido-info">
              <p><strong>{modo === "pedido" ? "📦 Por pedido" : "⏰ Por turnos"}</strong></p>
              <textarea
  placeholder="Ej: Pedí 2 días antes. Entrego sábados y domingos - Trabajo con seña"
  className="mensaje-textarea"
  value={mensaje}
  onChange={(e) => setMensaje(e.target.value)}
/>
            </div>
          )}

          <p className="subtitulo">Marcá los días que trabajás y tus horarios:</p>

          {Object.values(diasActivos).every(v => !v) && (
            <div className="alerta-sin-dias">
              ⚠️ Debes activar al menos un día de la semana
            </div>
          )}

          <ul className="lista-dias">
            {diasSemana.map((dia) => {
              const tieneHorarios = diasActivos[dia] && (turnos[dia] || []).some(t => t.inicio && t.fin);
              const sinCompletarTurnos = diasActivos[dia] && !tieneHorarios;

              return (
                <li key={dia} className={`item-dia ${!diasActivos[dia] ? "inactivo" : ""} ${sinCompletarTurnos ? "incompleto" : ""}`}>
                  <div className="dia-info" onClick={() => diasActivos[dia] && setModalDia(dia)}>
                    <span>{dia}</span>
                    {diasActivos[dia] ? (
                      <span className={`cantidad-turnos ${sinCompletarTurnos ? "advertencia" : ""}`}>
                        {tieneHorarios ? `${turnos[dia]?.filter(t => t.inicio && t.fin).length || 0} turno(s)` : "⚠️ Sin horarios"}
                      </span>
                    ) : (
                      <span className="off">OFF</span>
                    )}
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={!!diasActivos[dia]}
                      onChange={(e) =>
                        setDiasActivos((prev) => ({ ...prev, [dia]: e.target.checked }))
                      }
                    />
                    <span className="slider" />
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {modo === "consultar" && (
        <div className="bloque-consultar">
          <p className="subtitulo">📅 Consultar por WhatsApp la disponibilidad.</p>
        </div>
      )}

      {modo === "nodisp" && (
        <div className="bloque-nodisp">
          <p>⛔ No disponible actualmente para contratación.</p>
        </div>
      )}

      {modalDia && (
        <div className="modal-dia">
          <div className="modal-contenido">
            <h3>¿Qué horario tenés el {modalDia}?</h3>
            {(turnos[modalDia] || []).map((turno, i) => (
              <div key={i} className="grupo-turno">
                <div className="inputs-horario">
                  <input
                    type="time"
                    value={turno.inicio || ""}
                    onChange={(e) => handleChangeTurno(modalDia, i, "inicio", e.target.value)}
                    className={errores[`${modalDia}-${i}-inicio`] ? "input-error" : ""}
                  />
                  <span>→</span>
                  <input
                    type="time"
                    value={turno.fin || ""}
                    onChange={(e) => handleChangeTurno(modalDia, i, "fin", e.target.value)}
                    className={errores[`${modalDia}-${i}-fin`] ? "input-error" : ""}
                  />
                  {turnos[modalDia].length > 1 && (
                    <button 
                      className="btn-remove" 
                      onClick={() => eliminarTurno(modalDia, i)}
                      type="button"
                    >
                      🗑️
                    </button>
                  )}
                </div>
                
                {errores[`${modalDia}-${i}-inicio`] && (
                  <small className="error-text">{errores[`${modalDia}-${i}-inicio`]}</small>
                )}
                {errores[`${modalDia}-${i}-fin`] && (
                  <small className="error-text">{errores[`${modalDia}-${i}-fin`]}</small>
                )}
                {errores[`${modalDia}-${i}-rango`] && (
                  <small className="error-text">{errores[`${modalDia}-${i}-rango`]}</small>
                )}
                {errores[`${modalDia}-${i}-superposicion`] && (
                  <small className="error-text">{errores[`${modalDia}-${i}-superposicion`]}</small>
                )}
              </div>
            ))}

            {(turnos[modalDia]?.length || 0) < 2 && (
              <button className="btn-add" onClick={() => agregarTurno(modalDia)} type="button">
  + Agregar otro horario
</button>
            )}

            <label className="checkbox-copy">
              <input
                type="checkbox"
                checked={copiarAResto}
                onChange={(e) => setCopiarAResto(e.target.checked)}
              />
              Usar este horario para todos los días
            </label>

            <div className="footer-botones">
              <button 
                className="btn-cancelar" 
                onClick={() => {
                  const nuevosErrores = { ...errores };
                  Object.keys(nuevosErrores).forEach((key) => {
                    if (key.startsWith(modalDia)) delete nuevosErrores[key];
                  });
                  setErrores(nuevosErrores);
                  setModalDia(null);
                  setCopiarAResto(false);
                }}
                type="button"
              >
                Cancelar
              </button>
              <button className="btn-guardar" onClick={guardarModal} type="button">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}