import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';

// Estado de la campaña de códigos promocionales (se maneja solo desde el Panel Admin).
// La verdad la decide el servidor (estado_campana_codigos). El hook:
//  - consulta al montar, cada 60 s y al volver a la pestaña
//  - programa un refresco justo en el momento de inicio/fin para que el botón
//    aparezca o desaparezca solo, sin recargar.
const VACIO = { activa: false, habilitada: false, inicio: null, fin: null, cupos: 0 };

const useCampanaCodigos = () => {
  const [estado, setEstado] = useState(VACIO);
  const [cargando, setCargando] = useState(true);
  const temporizador = useRef(null);

  const refrescar = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('estado_campana_codigos');
      if (error || !data) {
        setEstado(VACIO);
        return;
      }
      setEstado({
        activa: !!data.activa,
        habilitada: !!data.habilitada,
        inicio: data.inicio || null,
        fin: data.fin || null,
        cupos: data.cupos || 0,
      });

      // Refresco programado en el próximo cambio (inicio o fin)
      if (temporizador.current) clearTimeout(temporizador.current);
      const ahoraServidor = data.ahora ? new Date(data.ahora).getTime() : Date.now();
      const desfase = Date.now() - ahoraServidor;
      const candidatos = [data.inicio, data.fin]
        .filter(Boolean)
        .map((f) => new Date(f).getTime() + desfase - Date.now())
        .filter((ms) => ms > 0 && ms < 2147483000);
      if (data.habilitada && candidatos.length) {
        temporizador.current = setTimeout(refrescar, Math.min(...candidatos) + 500);
      }
    } catch {
      setEstado(VACIO);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    refrescar();
    const intervalo = setInterval(refrescar, 60000);
    const alVolver = () => {
      if (document.visibilityState === 'visible') refrescar();
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [refrescar]);

  return { ...estado, cargando, refrescar };
};

export default useCampanaCodigos;
