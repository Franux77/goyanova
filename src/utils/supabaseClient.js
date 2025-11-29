import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERROR: Variables de entorno de Supabase no configuradas correctamente')
}

// ============================================
// 🆕 CLIENTE MEJORADO CON RETRY AUTOMÁTICO
// ============================================
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    // 🆕 Headers personalizados
    headers: {
      'x-client-info': 'goya-nova-web',
    },
  },
  db: {
    // 🆕 Schema por defecto
    schema: 'public',
  },
  // 🆕 Opciones de realtime (si lo usas)
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// ============================================
// 🆕 WRAPPER PARA QUERIES CON RETRY AUTOMÁTICO
// ============================================
let isRefreshingToken = false;
let refreshPromise = null;

/**
 * Ejecuta una query de Supabase con retry automático si falla por token expirado
 * @param {Function} queryFn - Función que ejecuta la query
 * @param {number} maxRetries - Intentos máximos (default: 1)
 * @returns {Promise} Resultado de la query
 */
export const executeWithRetry = async (queryFn, maxRetries = 1) => {
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const result = await queryFn();

      // Si hay error de autenticación, intentar refresh
      if (result.error) {
        const isAuthError = 
          result.error.message?.includes('JWT') ||
          result.error.message?.includes('expired') ||
          result.error.message?.includes('invalid') ||
          result.error.code === 'PGRST301' || // JWT expired
          result.error.code === '401';

        if (isAuthError && attempt < maxRetries) {
          console.warn(`⚠️ Error de autenticación detectado, refrescando token (intento ${attempt + 1}/${maxRetries})`);
          
          // Evitar múltiples refreshes simultáneos
          if (!isRefreshingToken) {
            isRefreshingToken = true;
            refreshPromise = refreshToken();
          }

          const refreshSuccess = await refreshPromise;
          isRefreshingToken = false;
          refreshPromise = null;

          if (refreshSuccess) {
            attempt++;
            continue; // Reintentar query
          } else {
            console.error('❌ No se pudo refrescar el token');
            return result; // Devolver error original
          }
        }
      }

      return result;
    } catch (err) {
      console.error('❌ Error ejecutando query:', err.message);
      if (attempt >= maxRetries) {
        throw err;
      }
      attempt++;
    }
  }
};

/**
 * Refresca el token de autenticación
 * @returns {Promise<boolean>} true si fue exitoso
 */
const refreshToken = async () => {
  try {
    console.log('🔄 Refrescando token de sesión...');
    const { data, error } = await supabase.auth.refreshSession();

    if (error || !data.session) {
      console.error('❌ Error al refrescar token:', error?.message);
      return false;
    }

    console.log('✅ Token refrescado exitosamente');
    return true;
  } catch (err) {
    console.error('❌ Error crítico al refrescar token:', err.message);
    return false;
  }
};

// ============================================
// 🆕 HELPERS MEJORADOS PARA QUERIES
// ============================================

/**
 * SELECT con retry automático
 * @example
 * const { data, error } = await selectWithRetry(
 *   supabase.from('perfiles_usuarios').select('*').eq('id', userId)
 * );
 */
export const selectWithRetry = async (query) => {
  return executeWithRetry(() => query);
};

/**
 * INSERT con retry automático
 */
export const insertWithRetry = async (query) => {
  return executeWithRetry(() => query);
};

/**
 * UPDATE con retry automático
 */
export const updateWithRetry = async (query) => {
  return executeWithRetry(() => query);
};

/**
 * DELETE con retry automático
 */
export const deleteWithRetry = async (query) => {
  return executeWithRetry(() => query);
};

/**
 * RPC (stored procedures) con retry automático
 */
export const rpcWithRetry = async (functionName, params = {}) => {
  return executeWithRetry(() => supabase.rpc(functionName, params));
};

// ============================================
// 🆕 FUNCIÓN AUXILIAR PARA OBTENER URL PÚBLICA
// ============================================
/**
 * Obtiene URL pública de una imagen con validación
 * @param {string} path - Ruta del archivo (ej: 'servicios/imagen.jpg')
 * @param {string} bucket - Nombre del bucket (default: 'imagenes')
 * @returns {string|null} URL pública o null si falla
 */
export const getPublicUrl = (path, bucket = 'imagenes') => {
  if (!path || typeof path !== 'string') {
    console.warn('⚠️ Path inválido para getPublicUrl:', path);
    return null;
  }

  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || null;
  } catch (err) {
    console.error('❌ Error obteniendo URL pública:', err.message);
    return null;
  }
};

/**
 * Obtiene URLs públicas de múltiples archivos
 * @param {string[]} paths - Array de rutas
 * @param {string} bucket - Nombre del bucket
 * @returns {string[]} Array de URLs públicas
 */
export const getPublicUrls = (paths, bucket = 'imagenes') => {
  if (!Array.isArray(paths)) return [];
  return paths.map(path => getPublicUrl(path, bucket)).filter(Boolean);
};

// ============================================
// 🆕 VALIDAR SESIÓN ACTIVA
// ============================================
/**
 * Verifica si hay una sesión válida activa
 * @returns {Promise<boolean>}
 */
export const hasValidSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) return false;

    // Verificar si el token está por expirar (menos de 5 minutos)
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = expiresAt - now;

    return timeRemaining > 300; // Más de 5 minutos
  } catch {
    return false;
  }
};

// ============================================
// 🆕 OBTENER USUARIO ACTUAL
// ============================================
/**
 * Obtiene el usuario actual de forma segura
 * @returns {Promise<Object|null>}
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('❌ Error obteniendo usuario:', error.message);
      return null;
    }
    return user;
  } catch (err) {
    console.error('❌ Error crítico obteniendo usuario:', err.message);
    return null;
  }
};

// ============================================
// EXPORTS
// ============================================
export default supabase;