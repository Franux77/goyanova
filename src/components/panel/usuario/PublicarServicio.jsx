import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient';
import PublicarServicioForm from '../../publicar/PublicarServicioForm';
import Loading from '../../loading/Loading';
import './PublicarServicio.css';

const PublicarServicio = () => {
  const navigate = useNavigate();
  const [verificando, setVerificando] = useState(true);
  const [puedePublicar, setPuedePublicar] = useState(false);
  const [limitesInfo, setLimitesInfo] = useState(null);

  useEffect(() => {
    const verificarLimite = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error('Error al obtener usuario:', userError);
          setVerificando(false);
          return;
        }

        const { data, error } = await supabase
          .rpc('puede_publicar_servicio', {
            p_usuario_id: user.id
          });

        if (error) throw error;

        setLimitesInfo(data);
        setPuedePublicar(data.puede_publicar);
      } catch (error) {
        console.error('❌ Error al verificar límite:', error);
        setPuedePublicar(false);
      } finally {
        setVerificando(false);
      }
    };

    verificarLimite();
  }, []);

  if (verificando) {
    return <Loading message="Verificando límites..." fullScreen={false} />;
  }

  // Si no puede publicar, mostrar mensaje de límite alcanzado
  if (!puedePublicar) {
    return (
      <div className="limite-alcanzado-container">
        <div className="limite-alcanzado-card">
          <div className="limite-icono">
            <span className="material-icons">block</span>
          </div>
          
          <h2>Has alcanzado tu límite de servicios</h2>
          
          <div className="limite-info">
            <div className="info-item">
              <span className="material-icons">check_circle</span>
              <div>
                <strong>Servicios activos</strong>
                <span>{limitesInfo?.servicios_actuales || 0} publicados</span>
              </div>
            </div>
            <div className="info-item">
              <span className="material-icons">info</span>
              <div>
                <strong>Límite de tu plan</strong>
                <span>{limitesInfo?.limite_servicios || 2} servicios</span>
              </div>
            </div>
          </div>

          <div className="limite-mensaje">
            <p>
              Con tu plan <strong>{limitesInfo?.tipo_membresia === 'gratis' ? 'Gratuito' : limitesInfo?.tipo_membresia}</strong>, 
              puedes publicar hasta <strong>{limitesInfo?.limite_servicios || 2} servicios</strong>.
            </p>
            <p>
              Para publicar más servicios, mejorá tu plan a Premium y disfrutá de beneficios exclusivos.
            </p>
          </div>

          <div className="limite-acciones">
            <button 
              className="btn-mejorar-plan"
              onClick={() => navigate('/panel/mi-membresia')}
            >
              <span className="material-icons">workspace_premium</span>
              Mejorar a Premium
            </button>
            <button 
              className="btn-ver-servicios"
              onClick={() => navigate('/panel/mis-servicios')}
            >
              <span className="material-icons">list</span>
              Ver mis servicios
            </button>
          </div>

          <div className="limite-beneficios">
            <h3>
              <span className="material-icons">star</span>
              Beneficios Premium
            </h3>
            <ul>
              <li><span className="material-icons">check</span> Hasta 10-999 servicios publicados</li>
              <li><span className="material-icons">check</span> Hasta 20 fotos por servicio</li>
              <li><span className="material-icons">check</span> Prioridad en búsquedas y mapas</li>
              <li><span className="material-icons">check</span> Badge exclusivo en tus publicaciones</li>
              <li><span className="material-icons">check</span> Soporte prioritario</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Si puede publicar, mostrar el formulario
  return (
    <div className="publicar-servicio-wrapper">
      <PublicarServicioForm />
    </div>
  );
};

export default PublicarServicio;