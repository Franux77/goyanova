import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useAuth } from '../../../auth/useAuth';
import Loading from '../../loading/Loading';
import './Solicitudes.css';

// Mismos estados que usa Opiniones.jsx para solicitudes_eliminacion
const ESTADO_LABEL = {
  pendiente: { texto: 'En revisión', clase: 'sol-badge-pendiente', icono: 'schedule' },
  aceptada: { texto: 'Aceptada', clase: 'sol-badge-aceptada', icono: 'check_circle' },
  denegada: { texto: 'Rechazada', clase: 'sol-badge-denegada', icono: 'cancel' },
};

const Solicitudes = () => {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    if (!user?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('solicitudes_eliminacion')
      .select(`
        id, tipo, motivo, comentario, estado, fecha,
        opiniones ( comentario, nombre_completo, servicio_id, servicios ( nombre ) )
      `)
      .eq('solicitante_id', user.id)
      .order('fecha', { ascending: false });

    if (error) {
      console.error('Error cargando solicitudes:', error);
      setSolicitudes([]);
    } else {
      setSolicitudes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargar();

    const channel = supabase
      .channel('mis-solicitudes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitudes_eliminacion' },
        () => cargar()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const cancelarSolicitud = async (id) => {
    if (!window.confirm('¿Cancelar esta solicitud de eliminación?')) return;

    const { error } = await supabase
      .from('solicitudes_eliminacion')
      .delete()
      .eq('id', id)
      .eq('estado', 'pendiente');

    if (error) {
      alert('No se pudo cancelar la solicitud');
      return;
    }
    cargar();
  };

  if (loading) {
    return <Loading message="Cargando tus solicitudes..." />;
  }

  return (
    <div className="sol-container">
      <div className="sol-header">
        <h1>
          <span className="material-icons">delete_outline</span>
          Mis Solicitudes de Eliminación
        </h1>
        <p className="sol-subtitle">
          Pedidos que hiciste para eliminar opiniones sobre tus servicios
        </p>
      </div>

      {solicitudes.length === 0 ? (
        <div className="sol-vacio">
          <span className="material-icons">inbox</span>
          <p>No tenés solicitudes de eliminación</p>
        </div>
      ) : (
        <div className="sol-lista">
          {solicitudes.map((s) => {
            const estado = ESTADO_LABEL[s.estado] || ESTADO_LABEL.pendiente;
            const servicioNombre = s.opiniones?.servicios?.nombre;

            return (
              <div key={s.id} className="sol-card">
                <div className="sol-card-header">
                  <span className="sol-tipo">{s.tipo || 'Motivo no especificado'}</span>
                  <span className={`sol-badge ${estado.clase}`}>
                    <span className="material-icons">{estado.icono}</span>
                    {estado.texto}
                  </span>
                </div>

                {servicioNombre && (
                  <p className="sol-servicio">
                    <span className="material-icons">store</span>
                    {servicioNombre}
                  </p>
                )}

                {s.opiniones?.comentario && (
                  <p className="sol-opinion-original">
                    <strong>Opinión reportada:</strong> "{s.opiniones.comentario}"
                  </p>
                )}

                {s.comentario && (
                  <p className="sol-comentario">
                    <strong>Tu comentario:</strong> {s.comentario}
                  </p>
                )}

                <div className="sol-card-footer">
                  <p className="sol-fecha">
                    {new Date(s.fecha).toLocaleDateString('es-AR', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                  {s.estado === 'pendiente' && (
                    <button
                      className="sol-btn-cancelar"
                      onClick={() => cancelarSolicitud(s.id)}
                    >
                      <span className="material-icons">close</span>
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Solicitudes;