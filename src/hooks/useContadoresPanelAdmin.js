import { supabase } from '../utils/supabaseClient';
import useContadoresPanel from './useContadoresPanel';

// Cuenta filas de una tabla; `filtrar(consulta, desde)` agrega los filtros.
const contarFilas = (tabla, filtrar) => async (desde) => {
  const consulta = supabase.from(tabla).select('id', { count: 'exact', head: true });
  const { count, error } = await filtrar(consulta, desde);
  if (error) throw error;
  return count;
};

/**
 * Numeritos del menú de Panel Admin.
 *  - "nuevos" desde la última vez que se abrió la sección: usuarios, servicios
 *  - "pendientes" de revisar: reseñas GoyaNova, preguntas del asistente sin
 *    respuesta, verificaciones, solicitudes de eliminación, reportes y mensajes de soporte
 * Las claves coinciden con `clave` en las secciones de PanelAdmin.jsx.
 */
const definiciones = {
  usuarios: {
    ruta: '/panel/admin/usuarios',
    tipo: 'nuevos',
    contar: contarFilas('perfiles_usuarios', (q, desde) => q.gt('creado_en', desde)),
  },
  servicios: {
    ruta: '/panel/admin/servicios',
    tipo: 'nuevos',
    contar: contarFilas('servicios', (q, desde) => q.gt('creado_en', desde)),
  },
  comentarios: {
    ruta: '/panel/admin/comentarios',
    tipo: 'pendientes',
    contar: contarFilas('comentarios_proyecto', (q) => q.eq('estado', 'pendiente')),
  },
  asistente: {
    ruta: '/panel/admin/asistente',
    tipo: 'pendientes',
    contar: contarFilas('asistente_preguntas_sin_respuesta', (q) => q.eq('estado', 'pendiente')),
  },
  verificaciones: {
    ruta: '/panel/admin/verificaciones',
    tipo: 'pendientes',
    // Misma función que usa la pantalla de Verificaciones.
    contar: async () => {
      const { data, error } = await supabase.rpc('listar_solicitudes_verificacion_pendientes');
      if (error) throw error;
      return (data || []).length;
    },
  },
  solicitudes: {
    ruta: '/panel/admin/solicitudes-eliminacion',
    tipo: 'pendientes',
    contar: contarFilas('solicitudes_eliminacion', (q) => q.eq('estado', 'pendiente')),
  },
  reportes: {
    ruta: '/panel/admin/reportes',
    tipo: 'pendientes',
    contar: contarFilas('reportes', (q) => q.eq('estado', 'pendiente')),
  },
  mensajes: {
    ruta: '/panel/admin/mensajes-soporte',
    tipo: 'pendientes',
    contar: contarFilas('mensajes_soporte', (q) => q.eq('estado', 'pendiente')),
  },
};

const useContadoresPanelAdmin = (user) => useContadoresPanel(user?.id, definiciones);

export default useContadoresPanelAdmin;
