// src/components/publicar/utils/helpers.js

// 🔹 Normaliza los nombres de los días
export const normalizarDia = (dia) => {
  if (!dia) return null;
  const d = dia.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const dias = {
    lunes: "Lunes",
    martes: "Martes",
    miercoles: "Miércoles",
    jueves: "Jueves",
    viernes: "Viernes",
    sabado: "Sábado",
    domingo: "Domingo",
  };
  return dias[d] || dia;
};

// 🔹 Compara si dos objetos son iguales (deep)
export const deepEqual = (a, b) => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

// 🔹 Función genérica para actualizar estado de forma segura
export const actualizarDatosSeguro = (setFormData) => (nuevosDatos) => {
  if (typeof nuevosDatos === "function") {
    setFormData((prev) => {
      const resultado = nuevosDatos(prev);
      if (resultado === undefined) return prev;
      const next =
        typeof resultado === "object" && resultado !== null && !Array.isArray(resultado)
          ? { ...prev, ...resultado }
          : resultado;
      return deepEqual(prev, next) ? prev : next;
    });
  } else if (typeof nuevosDatos === "object" && nuevosDatos !== null) {
    setFormData((prev) => {
      const next = { ...prev, ...nuevosDatos };
      return deepEqual(prev, next) ? prev : next;
    });
  } else {
    setFormData((prev) => (deepEqual(prev, nuevosDatos) ? prev : nuevosDatos));
  }
};
