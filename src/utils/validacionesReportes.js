import { supabase } from './supabaseClient';

/**
 * Verifica si el usuario puede reportar (rate limiting)
 * Máximo 5 reportes por hora
 */
export const puedeReportar = async (usuarioId) => {
  try {
    const unaHoraAtras = new Date();
    unaHoraAtras.setHours(unaHoraAtras.getHours() - 1);

    const { data, error } = await supabase
      .from('reportes')
      .select('id')
      .eq('reportante_id', usuarioId)
      .gte('fecha_creacion', unaHoraAtras.toISOString());

    if (error) {
      // Si es error de permisos RLS, permitir por defecto
      if (error.code === 'PGRST301' || error.message?.includes('permission')) {
        return true;
      }
      throw error;
    }

    return (data?.length || 0) < 5;
  } catch (err) {
    // En caso de error, permitir para no bloquear al usuario
    return true;
  }
};

/**
 * Verifica si ya reportó este contenido específico
 */
export const yaReporto = async (usuarioId, tipoContenido, contenidoId) => {
  try {
    const { data, error } = await supabase
      .from('reportes')
      .select('id')
      .eq('reportante_id', usuarioId)
      .eq('tipo_contenido', tipoContenido)
      .eq('contenido_id', contenidoId)
      .maybeSingle(); // Cambiar a maybeSingle para que no falle si no encuentra

    if (error) {
      // Si es error de permisos RLS, permitir reportar
      if (error.code === 'PGRST301' || error.message?.includes('permission')) {
        return false;
      }
      
      // Otros errores
      if (error.code !== 'PGRST116') {
        throw error;
      }
    }

    return !!data;
  } catch (err) {
    // En caso de error, permitir reportar (false = no ha reportado)
    return false;
  }
};

/**
 * Calcula prioridad automática basada en cantidad de reportes
 */
export const calcularPrioridad = async (tipoContenido, contenidoId) => {
  try {
    // Convertir UUID a string por si acaso
    const contenidoIdStr = String(contenidoId);

    const { data, error } = await supabase
      .from('reporte_metricas')
      .select('total_reportes')
      .eq('tipo_contenido', tipoContenido)
      .eq('contenido_id', contenidoIdStr)
      .maybeSingle(); // Cambiar a maybeSingle

    if (error) {
      // Si es error de permisos RLS, retornar prioridad baja
      if (error.code === 'PGRST301' || error.message?.includes('permission')) {
        return 'baja';
      }
      
      // Otros errores no críticos
      if (error.code !== 'PGRST116') {
        throw error;
      }
    }

    const total = data?.total_reportes || 0;

    if (total >= 10) return 'urgente';
    if (total >= 5) return 'alta';
    if (total >= 3) return 'media';
    return 'baja';
  } catch (err) {
    // En caso de error, retornar prioridad baja por defecto
    return 'baja';
  }
};