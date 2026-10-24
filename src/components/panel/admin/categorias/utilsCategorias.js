// Ayudas del panel de categorías: buscar parecidas, colores y chequeos.
import { normalizar, prepararCategorias, buscarCategorias } from '../../../publicar/utils/categoriasSugeridas';

export const NOMBRE_TIPO = { servicio: 'Oficios', producto: 'Negocios' };
export const DESCRIPCION_TIPO = {
  servicio: 'Lo hace una persona: arreglos, clases, belleza, salud, fletes, eventos…',
  producto: 'Se venden cosas: comida, ropa, tiendas, artesanías, plantas…',
};

// Paleta con nombre, para elegir sin pensar en códigos
export const PALETA = [
  { color: '#1774f6', nombre: 'Azul' },
  { color: '#0ea5e9', nombre: 'Celeste' },
  { color: '#06b6d4', nombre: 'Turquesa' },
  { color: '#10b981', nombre: 'Verde' },
  { color: '#16a34a', nombre: 'Verde oscuro' },
  { color: '#84cc16', nombre: 'Lima' },
  { color: '#eab308', nombre: 'Amarillo' },
  { color: '#f59e0b', nombre: 'Ámbar' },
  { color: '#f97316', nombre: 'Naranja' },
  { color: '#ef4444', nombre: 'Rojo' },
  { color: '#e11d48', nombre: 'Frambuesa' },
  { color: '#ec4899', nombre: 'Rosa' },
  { color: '#d946ef', nombre: 'Fucsia' },
  { color: '#8b5cf6', nombre: 'Violeta' },
  { color: '#6366f1', nombre: 'Índigo' },
  { color: '#a16207', nombre: 'Marrón' },
  { color: '#64748b', nombre: 'Gris' },
  { color: '#1e293b', nombre: 'Negro' },
];

const raiz = (p) => {
  const s = p.length > 3 && p.endsWith('s') ? p.slice(0, -1) : p;
  return s.length > 5 ? s.slice(0, 5) : s;
};

const distancia = (a, b) => {
  const m = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j += 1) m[0][j] = j;
  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      m[i][j] = b[i - 1] === a[j - 1]
        ? m[i - 1][j - 1]
        : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    }
  }
  return m[b.length][a.length];
};

const palabras = (t) => normalizar(t).split(' ').filter((p) => p.length >= 3);

/**
 * Categorías que se parecen a un nombre (para no crear repetidas).
 * Mira las de los dos tipos y también las suspendidas.
 * Devuelve [{ cat, motivo, nivel }] donde nivel 3 = igual, 2 = muy parecida, 1 = relacionada.
 */
export const buscarParecidas = (nombre, categorias, idActual = null) => {
  const q = normalizar(nombre);
  if (q.length < 3) return [];
  const relacionadas = new Set(
    buscarCategorias(nombre, prepararCategorias(categorias), 6).map((c) => c.id)
  );

  return categorias
    .filter((c) => c.id !== idActual)
    .map((cat) => {
      const n = normalizar(cat.nombre);
      if (n === q) return { cat, nivel: 3, motivo: 'Se llama igual' };
      if ((n.length >= 4 && q.includes(n)) || (q.length >= 4 && n.includes(q))) {
        return { cat, nivel: 2, motivo: 'Un nombre contiene al otro' };
      }
      // La primera palabra es la que define el rubro ("Golosinas" ≈ "Golosinería";
      // "Peluquería canina" no se parece a "Adiestramiento canino")
      const primeraC = raiz(palabras(cat.nombre)[0] || '');
      const primeraQ = raiz(palabras(nombre)[0] || '');
      if (primeraC.length >= 4 && primeraC === primeraQ) {
        return { cat, nivel: 2, motivo: 'Empiezan igual' };
      }
      const parecido = 1 - distancia(q, n) / Math.max(q.length, n.length);
      if (parecido >= 0.72) return { cat, nivel: 2, motivo: 'Se escriben casi igual' };
      if (relacionadas.has(cat.id)) return { cat, nivel: 1, motivo: 'Es del mismo rubro' };
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => b.nivel - a.nivel || a.cat.nombre.localeCompare(b.cat.nombre, 'es'))
    .slice(0, 6);
};

/** Grupos parecidos a uno nuevo (para no crear "Gastronomia" si ya existe "Gastronomía") */
export const grupoParecido = (nombre, grupos) => {
  const q = normalizar(nombre);
  if (q.length < 3) return null;
  return (
    grupos.find((g) => {
      const n = normalizar(g);
      if (n === q) return true;
      return 1 - distancia(q, n) / Math.max(q.length, n.length) >= 0.75;
    }) || null
  );
};

/** El color que más se usa en un grupo (para sugerirlo y que el grupo quede parejo) */
export const colorDelGrupo = (grupo, tipo, categorias) => {
  const cuenta = {};
  categorias
    .filter((c) => c.grupo === grupo && c.tipo === tipo && c.color)
    .forEach((c) => {
      const k = c.color.toLowerCase();
      cuenta[k] = (cuenta[k] || 0) + 1;
    });
  const [mejor] = Object.entries(cuenta).sort((a, b) => b[1] - a[1]);
  return mejor ? mejor[0] : null;
};

export const colorValido = (c) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c || '');

// ¿El ícono existe en la fuente que usa el mapa? (si no, se ve el texto en vez del dibujo)
const cacheIconos = new Map();
export const iconoSeVeEnMapa = (nombre) => {
  if (!nombre || typeof document === 'undefined') return false;
  if (cacheIconos.has(nombre)) return cacheIconos.get(nombre);
  const s = document.createElement('span');
  s.className = 'material-icons';
  s.style.cssText = 'position:absolute;left:-9999px;top:0;font-size:24px;white-space:nowrap';
  s.textContent = nombre;
  document.body.appendChild(s);
  const ok = s.getBoundingClientRect().width <= 30;
  s.remove();
  cacheIconos.set(nombre, ok);
  return ok;
};

export { normalizar };
