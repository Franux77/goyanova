import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { leerVisto, marcarVisto } from '../utils/contadoresPanel';

const INTERVALO_MS = 60000;

/**
 * Cuenta cosas para mostrar numeritos en el menú de un panel.
 *
 * definiciones: { [clave]: { ruta, tipo, contar } }
 *   - tipo 'pendientes': lo que espera acción (ej: reportes sin revisar).
 *     contar() devuelve el total.
 *   - tipo 'nuevos': lo creado desde la última vez que se abrió la sección `ruta`.
 *     contar(desdeISO) devuelve cuántos hay desde esa fecha. Al entrar a la
 *     sección el número se limpia solo.
 * dependencias: texto que cambia cuando hay que volver a contar (ej: ids de servicios).
 * suscribir: (refrescar) => función de limpieza. Opcional, para refrescar al instante.
 *
 * Devuelve { [clave]: número }. Se actualiza al cambiar de página, al volver a la
 * pestaña y cada 60 segundos.
 */
const useContadoresPanel = (userId, definiciones, dependencias = '', suscribir = null) => {
  const { pathname } = useLocation();
  const [contadores, setContadores] = useState({});

  const defsRef = useRef(definiciones);
  const rutaRef = useRef(pathname);
  const suscribirRef = useRef(suscribir);
  const rutaAnteriorRef = useRef(pathname);

  // Debe ir antes de los efectos que usan los refs: deja siempre los valores al día.
  useEffect(() => {
    defsRef.current = definiciones;
    rutaRef.current = pathname;
    suscribirRef.current = suscribir;
  });

  const refrescar = useCallback(async () => {
    if (!userId) return;
    const defs = defsRef.current;
    const ruta = rutaRef.current;

    const filas = await Promise.all(
      Object.entries(defs).map(async ([clave, def]) => {
        try {
          if (def.tipo === 'nuevos') {
            const claveVisto = `${userId}_${clave}`;
            // Sección abierta ahora mismo: no hay nada "nuevo" para avisar.
            if (ruta.startsWith(def.ruta)) {
              marcarVisto(claveVisto);
              return [clave, 0];
            }
            return [clave, (await def.contar(leerVisto(claveVisto))) || 0];
          }
          return [clave, (await def.contar()) || 0];
        } catch (error) {
          console.warn(`[contadores] no se pudo contar "${clave}":`, error?.message || error);
          return [clave, null];
        }
      })
    );

    setContadores((prev) => {
      const siguiente = { ...prev };
      filas.forEach(([clave, cantidad]) => {
        if (cantidad !== null) siguiente[clave] = cantidad;
      });
      return siguiente;
    });
  }, [userId]);

  // Al cambiar de página (o cuando cambian las dependencias): cierra la visita
  // de la sección que se dejó y vuelve a contar.
  useEffect(() => {
    if (userId) {
      Object.entries(defsRef.current).forEach(([clave, def]) => {
        if (
          def.tipo === 'nuevos' &&
          rutaAnteriorRef.current.startsWith(def.ruta) &&
          !pathname.startsWith(def.ruta)
        ) {
          marcarVisto(`${userId}_${clave}`);
        }
      });
    }
    rutaAnteriorRef.current = pathname;
    refrescar();
  }, [pathname, dependencias, userId, refrescar]);

  // Cada tanto, y al volver a la pestaña.
  useEffect(() => {
    if (!userId) return undefined;
    const alVolver = () => {
      if (document.visibilityState === 'visible') refrescar();
    };
    const timer = setInterval(alVolver, INTERVALO_MS);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [userId, refrescar]);

  // Actualización instantánea (realtime), si el panel la pide.
  useEffect(() => {
    if (!userId || !suscribirRef.current) return undefined;
    return suscribirRef.current(refrescar);
  }, [userId, refrescar]);

  return contadores;
};

export default useContadoresPanel;
