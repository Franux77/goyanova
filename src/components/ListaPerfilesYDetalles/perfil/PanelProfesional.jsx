import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import './PanelProfesional.css';

const PanelProfesional = ({ perfilId }) => {
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      if (!perfilId) return;
      try {
        setCargando(true);
        const { data, error } = await supabase.rpc('obtener_estadisticas_servicio', {
          p_servicio_id: perfilId
        });
        if (error) throw error;
        setStats(data);
      } catch (err) {
        console.error('Error cargando estadísticas:', err);
        setStats({ error: 'No pudimos cargar tus estadísticas' });
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [perfilId]);

  if (cargando) {
    return (
      <section className="panel-profesional">
        <p className="panel-profesional-cargando">Cargando estadísticas...</p>
      </section>
    );
  }

  if (stats?.error) {
    return null; // no es el dueño, o no autenticado: no se muestra nada
  }

  if (stats && stats.habilitado === false) {
    return (
      <section className="panel-profesional panel-profesional-bloqueado">
        <h3>Estadísticas de tu perfil</h3>
        <p>
          Con el Plan Destacado o superior vas a ver cuánta gente vio tu
          perfil y cuántos hicieron clic en tu WhatsApp este mes.
        </p>
      </section>
    );
  }

  return (
    <section className="panel-profesional">
      <h3>Estadísticas de tu perfil</h3>

      <div className="estadisticas">
        <div className="estadistica-item">
          <strong className="estadistica-numero visitas">{stats?.visitas_mes ?? 0}</strong>
          <p>Visitas este mes</p>
        </div>

        <div className="estadistica-item">
          <strong className="estadistica-numero trabajos">{stats?.clics_whatsapp_mes ?? 0}</strong>
          <p>Clics a WhatsApp este mes</p>
        </div>
      </div>

      <div className="resumen-profesional">
        <p>
          <strong>Total histórico:</strong> {stats?.visitas_totales ?? 0} visitas ·{' '}
          {stats?.clics_whatsapp_totales ?? 0} clics a WhatsApp
        </p>
      </div>
    </section>
  );
};

export default PanelProfesional;