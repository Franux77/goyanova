// src/components/publicar/utils/validacionesServicio.js

export const validarCamposRequeridos = (formData, setErrores) => {
  const nuevosErrores = {};

  if (!formData.nombre?.trim()) nuevosErrores.nombre = "El nombre es obligatorio";
  if (!formData.tipo) nuevosErrores.tipo = "Selecciona si es un producto o servicio";
  if (!formData.categoria) nuevosErrores.categoria = "Selecciona una categoría";
  if (!formData.descripcion?.trim()) nuevosErrores.descripcion = "La descripción es obligatoria";
  if (!formData.direccion_escrita?.trim()) nuevosErrores.direccion_escrita = "La dirección es obligatoria";
  if (!formData.ubicacion?.lat || !formData.ubicacion?.lng)
    nuevosErrores.ubicacion = "Debes fijar la ubicación en el mapa";

  // 🔹 Validación de disponibilidad
  if (!formData.tipoDisponibilidad) {
    nuevosErrores.tipoDisponibilidad = "Debes seleccionar un tipo de disponibilidad";
  } else if (formData.tipoDisponibilidad !== "whatsapp" && formData.tipoDisponibilidad !== "no_disponible") {
    // 🔹 Si requiere horarios, validar que existan días con turnos completos
    const horarios = formData.horarios || {};
    const diasConTurnos = Object.keys(horarios).filter(
      (dia) => Array.isArray(horarios[dia]) && horarios[dia].some(t => t.inicio && t.fin)
    );

    if (diasConTurnos.length === 0) {
      nuevosErrores.tipoDisponibilidad = "Debes configurar al menos un día con horarios completos";
    }
  }

 // 🔹 Validación de WhatsApp (acepta números internacionales)
const numeroLimpio = (formData.whatsapp || "").replace(/\D/g, "");
if (!numeroLimpio) {
  nuevosErrores.whatsapp = "El número de WhatsApp es obligatorio";
} else if (numeroLimpio.length < 10) {
  nuevosErrores.whatsapp = "El número debe tener al menos 10 dígitos (incluyendo código de país)";
} else if (numeroLimpio.length > 15) {
  nuevosErrores.whatsapp = "El número no puede tener más de 15 dígitos";
}

  setErrores(nuevosErrores);
  return { esValido: Object.keys(nuevosErrores).length === 0, nuevosErrores };
};

// 🔹 Validación de turnos (mejorada para detectar días activos sin horarios)
export const validarTurnos = (turnos, diasActivos, tipoDisponibilidad) => {
  const erroresTurnos = [];
  const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  // Si es "consultar" o "no disponible", no validar turnos
  if (tipoDisponibilidad === "whatsapp" || tipoDisponibilidad === "no_disponible") {
    return erroresTurnos;
  }

  // 🔹 Contar días activos (aquellos que tienen al menos un turno completo en horarios)
  let diasConTurnosCompletos = 0;

  diasSemana.forEach((dia) => {
    const diaKey = dia.toLowerCase();
    const bloques = (turnos?.[diaKey] || []).filter((t) => t.inicio && t.fin);

    // Si el día está activo pero no tiene turnos completos
    if (diasActivos[dia] && bloques.length === 0) {
      erroresTurnos.push(`${dia}: debe tener al menos un turno completo con inicio y fin`);
    }

    // Contar días con turnos completos
    if (bloques.length > 0) {
      diasConTurnosCompletos++;
    }

    // Validar turnos existentes
    bloques.forEach((t, i) => {
      if (!t.inicio || !t.fin) {
        erroresTurnos.push(`${dia} - Turno ${i + 1}: completá hora de inicio y fin`);
      }
      
      if (t.inicio >= t.fin) {
        erroresTurnos.push(`${dia} - Turno ${i + 1}: la hora de inicio debe ser menor que la de fin`);
      }
      
      if (i > 0 && bloques[i - 1].fin > t.inicio) {
        erroresTurnos.push(`${dia} - Turno ${i + 1}: se superpone con el turno anterior`);
      }
    });
  });

  // 🔹 Validar que haya al menos un día con turnos completos
  if (diasConTurnosCompletos === 0) {
    erroresTurnos.push("Debes activar al menos un día de la semana y configurar sus horarios");
  }

  return erroresTurnos;
};

// 🔹 Validación específica de disponibilidad (no se usa actualmente pero se mantiene por compatibilidad)
export const validarDisponibilidad = (formData) => {
  const errores = [];
  const tipoDisponibilidad = formData.tipoDisponibilidad;

  if (!tipoDisponibilidad) {
    errores.push("Debes seleccionar un tipo de disponibilidad");
    return errores;
  }

  if (tipoDisponibilidad === "whatsapp" || tipoDisponibilidad === "no_disponible") {
    return errores;
  }

  const horarios = formData.horarios || {};
  const diasConHorarios = Object.keys(horarios).filter(
    (dia) => Array.isArray(horarios[dia]) && horarios[dia].length > 0
  );

  if (diasConHorarios.length === 0) {
    errores.push("Debes activar al menos un día de la semana y configurar sus horarios");
    return errores;
  }

  diasConHorarios.forEach((dia) => {
    const turnos = horarios[dia] || [];
    const turnosCompletos = turnos.filter((t) => t.inicio && t.fin);

    if (turnosCompletos.length === 0) {
      const diaNombre = dia.charAt(0).toUpperCase() + dia.slice(1);
      errores.push(`${diaNombre}: debe tener al menos un turno completo (inicio y fin)`);
    }

    turnosCompletos.forEach((turno, idx) => {
      const diaNombre = dia.charAt(0).toUpperCase() + dia.slice(1);
      
      if (turno.inicio && turno.fin && turno.inicio >= turno.fin) {
        errores.push(`${diaNombre} - Turno ${idx + 1}: la hora de inicio debe ser anterior a la hora de fin`);
      }

      if (idx > 0 && turnosCompletos[idx - 1].fin > turno.inicio) {
        errores.push(`${diaNombre} - Turno ${idx + 1}: se superpone con el turno anterior`);
      }
    });
  });

  return errores;
};