import { supabase } from '../supabase/supabaseClient';

/**
 * Suspende todos los servicios de un usuario
 */
export const suspenderServiciosUsuario = async (usuarioId, motivo = 'Usuario suspendido') => {
  try {
    const { data, error } = await supabase
      .from('servicios')
      .update({
        estado: 'suspendido',
        suspendido_por: 'sistema',
        motivo_suspension: motivo
      })
      .eq('usuario_id', usuarioId)
      .neq('estado', 'suspendido');

    if (error) throw error;

    console.log(`Servicios suspendidos para usuario ${usuarioId}:`, data);
    return { success: true, data };
  } catch (error) {
    console.error('Error al suspender servicios:', error);
    return { success: false, error };
  }
};

/**
 * Reactiva todos los servicios de un usuario
 */
export const reactivarServiciosUsuario = async (usuarioId) => {
  try {
    const { data, error } = await supabase
      .from('servicios')
      .update({
        estado: 'activo',
        suspendido_por: null,
        motivo_suspension: null
      })
      .eq('usuario_id', usuarioId)
      .eq('estado', 'suspendido');

    if (error) throw error;

    console.log(`Servicios reactivados para usuario ${usuarioId}:`, data);
    return { success: true, data };
  } catch (error) {
    console.error('Error al reactivar servicios:', error);
    return { success: false, error };
  }
};

/**
 * Crea una suspensión completa (usuario + servicios)
 */
export const crearSuspensionCompleta = async ({
  usuarioId,
  motivo,
  dias = null,
  creadoPor = null
}) => {
  try {
    const fechaInicio = new Date();
    let fechaFin = null;
    let tipoSuspension = 'permanente';

    if (dias && dias > 0) {
      tipoSuspension = 'temporal';
      fechaFin = new Date();
      fechaFin.setDate(fechaFin.getDate() + dias);
    }

    // Crear registro de suspensión
    const { data: suspension, error: suspensionError } = await supabase
      .from('suspensiones')
      .insert({
        entidad: 'usuario',
        entidad_id: usuarioId,
        motivo: motivo,
        dias_suspension: dias,
        fecha_inicio: fechaInicio.toISOString(),
        fecha_fin: fechaFin?.toISOString(),
        tipo_suspension: tipoSuspension,
        activa: true,
        creado_por: creadoPor
      })
      .select()
      .single();

    if (suspensionError) throw suspensionError;

    // Suspender servicios
    await suspenderServiciosUsuario(usuarioId, motivo);

    // Actualizar estado del perfil
    await supabase
      .from('perfiles_usuarios')
      .update({ estado: 'suspendido' })
      .eq('id', usuarioId);

    return {
      success: true,
      suspension,
      message: `Usuario suspendido ${tipoSuspension === 'temporal' ? `por ${dias} días` : 'permanentemente'}`
    };
  } catch (error) {
    console.error('Error al crear suspensión completa:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Levanta una suspensión (reactiva usuario + servicios)
 */
export const levantarSuspension = async (usuarioId) => {
  try {
    // Desactivar todas las suspensiones activas
    const { error: suspensionError } = await supabase
      .from('suspensiones')
      .update({ activa: false })
      .eq('entidad', 'usuario')
      .eq('entidad_id', usuarioId)
      .eq('activa', true);

    if (suspensionError) throw suspensionError;

    // Reactivar servicios
    await reactivarServiciosUsuario(usuarioId);

    // Actualizar estado del perfil
    await supabase
      .from('perfiles_usuarios')
      .update({ estado: 'activo' })
      .eq('id', usuarioId);

    return {
      success: true,
      message: 'Suspensión levantada exitosamente'
    };
  } catch (error) {
    console.error('Error al levantar suspensión:', error);
    return {
      success: false,
      error: error.message
    };
  }
};