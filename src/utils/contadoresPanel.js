// Utilidades de los numeritos (badges) de los menús de Panel Usuario y Panel Admin.

const PREFIJO = 'gn_visto_';

// Última vez que se abrió una sección ("visto"). La primera vez que se consulta
// se toma "ahora" como punto de partida, así no aparecen cientos de "nuevos" de golpe.
export const leerVisto = (clave) => {
  const ahora = new Date().toISOString();
  try {
    const guardado = localStorage.getItem(PREFIJO + clave);
    if (guardado) return guardado;
    localStorage.setItem(PREFIJO + clave, ahora);
  } catch {
    // Sin localStorage (modo privado, etc.): simplemente no se muestran "nuevos".
  }
  return ahora;
};

export const marcarVisto = (clave) => {
  try {
    localStorage.setItem(PREFIJO + clave, new Date().toISOString());
  } catch {
    // Sin localStorage: no pasa nada, solo no se recuerda la visita.
  }
};

// 3 -> "3", 150 -> "99+"
export const formatearBadge = (n) => (n > 99 ? '99+' : String(n));
