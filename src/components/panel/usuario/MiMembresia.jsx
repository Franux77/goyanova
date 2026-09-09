import React, { useState, useEffect } from 'react';
import PlanesDisponibles from './PlanesDisponibles';
import { useAuth } from '../../../auth/useAuth';
import { supabase } from '../../../utils/supabaseClient';
import Loading from '../../loading/Loading';
import './MiMembresia.css';

const MiMembresia = () => {
  const { user } = useAuth();
  const [membresia, setMembresia] = useState(null);
  const [planActual, setPlanActual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalCancelar, setModalCancelar] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [serviciosActuales, setServiciosActuales] = useState(0);
  const [limitesInfo, setLimitesInfo] = useState(null);

  // ============================================
  // CARGAR MEMBRESÍA DEL USUARIO
  // ============================================
  const cargarMembresia = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .rpc('obtener_membresia_usuario', {
          p_usuario_id: user.id
        });

      if (error) {
        console.error('❌ Error al cargar membresía:', error);
        throw error;
      }

      setMembresia(data);
    } catch (error) {
      console.error('❌ Error crítico al cargar membresía:', error);
      // Si falla, poner valores por defecto
      setMembresia({
        tiene_membresia: false,
        tipo: 'gratis',
        limite_fotos: 5,
        limite_servicios: 1,
        prioridad_nivel: 0,
        es_premium: false,
        badge: null,
        dias_restantes: null,
        fecha_fin: null
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarMembresia();
  }, [user]);

  // ============================================
  // CARGAR DATOS DEL PLAN ACTUAL
  // (nombre real, duración y color — ya no hardcodeados)
  // ============================================
  useEffect(() => {
    const cargarPlan = async () => {
      if (!membresia?.tipo) return;

      try {
        const { data, error } = await supabase
          .from('planes_membresia')
          .select('id, tipo, nombre, duracion_dias, color_acento, beneficios')
          .eq('tipo', membresia.tipo)
          .maybeSingle();

        if (error) throw error;
        setPlanActual(data);
      } catch (err) {
        console.error('❌ Error al cargar el plan:', err);
        setPlanActual(null);
      }
    };

    cargarPlan();
  }, [membresia?.tipo]);

  // ============================================
  // CARGAR SERVICIOS ACTUALES DEL USUARIO
  // ============================================
  useEffect(() => {
    const cargarServiciosActuales = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .rpc('puede_publicar_servicio', {
            p_usuario_id: user.id
          });

        if (error) throw error;

        setServiciosActuales(data.servicios_actuales || 0);
        setLimitesInfo(data);
      } catch (error) {
        console.error('❌ Error al cargar servicios:', error);
        setServiciosActuales(0);
      }
    };

    cargarServiciosActuales();
  }, [user]);

  // ============================================
  // DETECTAR RETORNO DE MERCADO PAGO
  // ============================================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pagoStatus = params.get('pago');

    if (pagoStatus) {
      // Limpiar URL
      window.history.replaceState({}, '', window.location.pathname);

      if (pagoStatus === 'exito') {
        alert('✅ ¡Pago exitoso! Tu plan se está activando. Puede demorar unos segundos.');
        setTimeout(() => {
          cargarMembresia();
        }, 3000);
      } else if (pagoStatus === 'pendiente') {
        alert('⏳ Tu pago está pendiente de confirmación. Te avisamos cuando se procese.');
      } else if (pagoStatus === 'error') {
        alert('❌ Hubo un problema con tu pago. Por favor, intentá nuevamente.');
      }
    }
  }, []);

  // ============================================
  // CALCULAR PORCENTAJE DE TIEMPO RESTANTE
  // Usa la duración real del plan, no un número fijo
  // ============================================
  const calcularPorcentaje = () => {
    if (!membresia?.dias_restantes) return 0;
    const diasTotal = planActual?.duracion_dias > 0 ? planActual.duracion_dias : 30;
    return Math.max(0, Math.min(100, (membresia.dias_restantes / diasTotal) * 100));
  };

  // ============================================
  // NOMBRE DEL PLAN (sale de la base)
  // ============================================
  const nombrePlan = planActual?.nombre
    || (membresia?.es_premium ? 'Plan Premium' : 'Plan Free');

  // ============================================
  // CANCELAR MEMBRESÍA
  // ============================================
  const handleCancelarMembresia = async () => {
    if (!membresia?.es_premium) return;

    try {
      setCancelando(true);

      // Ahora vía RPC: marca la cancelación pero respeta los días ya pagados
      const { data, error } = await supabase.rpc('cancelar_mi_membresia', {
        p_motivo: 'Cancelado por el usuario'
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'No se pudo cancelar');

      alert(`✅ ${data.message}`);

      setModalCancelar(false);
      cargarMembresia();

    } catch (error) {
      console.error('❌ Error al cancelar membresía:', error);
      alert(`❌ ${error.message || 'Error al cancelar la membresía. Intentá nuevamente.'}`);
    } finally {
      setCancelando(false);
    }
  };

  // ============================================
  // LOADING
  // ============================================
  if (loading) {
    return <Loading message="Cargando tu membresía..." />;
  }

  const limiteServicios = limitesInfo?.limite_servicios
    ?? membresia?.limite_servicios
    ?? 1;

  return (
    <div className="mi-membresia-container">

      {/* ============================================
          HEADER
          ============================================ */}
      <div className="membresia-header">
        <div className="header-info">
          <h1 className="membresia-title">
            <span className="material-icons">card_membership</span>
            Mi Membresía
          </h1>
          <p className="membresia-subtitle">Gestiona tu plan y beneficios</p>
        </div>

        {/* Botón cancelar (solo si es premium y no es VIP de admin) */}
        {membresia?.es_premium && membresia?.tipo !== 'manual_admin' && (
          <button
            className="btn-cancelar-header"
            onClick={() => setModalCancelar(true)}
          >
            <span className="material-icons">cancel</span>
            Cancelar Membresía
          </button>
        )}
      </div>

      {/* ============================================
          CARD PRINCIPAL DE MEMBRESÍA
          ============================================ */}
      <div className={`membresia-card ${membresia?.es_premium ? 'membresia-premium' : 'membresia-gratis'}`}>

        {/* Header del Card */}
        <div className="membresia-card-header">
          <div className="membresia-tipo-info">
            <span className="material-icons membresia-icono">
              {membresia?.es_premium ? 'diamond' : 'money_off'}
            </span>

            <div className="tipo-text">
              <h2 className="membresia-tipo-titulo">{nombrePlan}</h2>
              {membresia?.badge && (
                <span className="membresia-badge">{membresia.badge}</span>
              )}
            </div>
          </div>

          <div className="membresia-estado-badge">
            <span className="material-icons">verified</span>
            <span>Activo</span>
          </div>
        </div>

        {/* Tiempo Restante (solo planes con vencimiento) */}
        {membresia?.es_premium && membresia?.dias_restantes !== null && membresia?.dias_restantes !== undefined && (
          <>
            <div className="membresia-tiempo">
              <div className="tiempo-info">
                <span className="tiempo-numero">{Math.floor(membresia.dias_restantes)}</span>
                <span className="tiempo-label">días restantes</span>
              </div>
              <div className="tiempo-fecha">
                <span className="material-icons">event</span>
                <span>Expira: {new Date(membresia.fecha_fin).toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}</span>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="membresia-progreso">
              <div
                className="membresia-progreso-bar"
                style={{ width: `${calcularPorcentaje()}%` }}
              />
            </div>
          </>
        )}

        {/* Sin vencimiento (plan gratuito) */}
        {!membresia?.es_premium && (
          <div className="membresia-tiempo">
            <div className="tiempo-fecha">
              <span className="material-icons">all_inclusive</span>
              <span>Sin vencimiento</span>
            </div>
          </div>
        )}

        {/* Beneficios */}
        <div className="membresia-beneficios">
          <h3>
            <span className="material-icons">star</span>
            Tus Beneficios Actuales
          </h3>
          <div className="beneficios-grid">

            <div className="beneficio-item">
              <span className={`material-icons beneficio-icon ${membresia?.es_premium ? 'activo' : 'inactivo'}`}>
                {membresia?.es_premium ? 'check_circle' : 'cancel'}
              </span>
              <div className="beneficio-text">
                <strong>Prioridad en resultados</strong>
                <small>
                  {membresia?.es_premium
                    ? `Nivel ${membresia.prioridad_nivel} - Aparecés primero`
                    : 'Solo con planes pagos'}
                </small>
              </div>
            </div>

            <div className="beneficio-item">
              <span className="material-icons beneficio-icon activo">photo_library</span>
              <div className="beneficio-text">
                <strong>Límite de fotos</strong>
                <small>Hasta {membresia?.limite_fotos || 5} fotos por servicio</small>
              </div>
            </div>

            <div className="beneficio-item">
              <span className="material-icons beneficio-icon activo">library_add</span>
              <div className="beneficio-text">
                <strong>Límite de servicios</strong>
                <small>
                  Hasta {limiteServicios} {limiteServicios === 1 ? 'servicio' : 'servicios'}
                </small>
              </div>
            </div>

            {membresia?.badge && (
              <div className="beneficio-item">
                <span className="material-icons beneficio-icon activo">workspace_premium</span>
                <div className="beneficio-text">
                  <strong>Badge exclusivo</strong>
                  <small>"{membresia.badge}" en tus publicaciones</small>
                </div>
              </div>
            )}

            <div className="beneficio-item">
              <span className={`material-icons beneficio-icon ${membresia?.es_premium ? 'activo' : 'inactivo'}`}>
                {membresia?.es_premium ? 'check_circle' : 'cancel'}
              </span>
              <div className="beneficio-text">
                <strong>Soporte prioritario</strong>
                <small>
                  {membresia?.es_premium ? 'Atención preferencial' : 'Solo con planes pagos'}
                </small>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ============================================
          SECCIÓN DE SERVICIOS PUBLICADOS
          ============================================ */}
      <div className="servicios-publicados-section">
        <div className="servicios-header">
          <h2>
            <span className="material-icons">feed</span>
            Servicios Publicados
          </h2>
          <p className="servicios-subtitle">Gestiona cuántos servicios puedes publicar</p>
        </div>

        <div className="servicios-info-card">
          <div className="servicios-contador">
            <div className="contador-circular">
              <svg viewBox="0 0 36 36" className="circular-chart">
                <path
                  className="circle-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="circle"
                  strokeDasharray={`${Math.min(100, (serviciosActuales / limiteServicios) * 100)}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="contador-texto">
                <span className="numero-grande">{serviciosActuales}</span>
                <span className="numero-total">/{limiteServicios}</span>
              </div>
            </div>

            <div className="contador-detalles">
              <div className="detalle-item">
                <span className="material-icons">check_circle</span>
                <div>
                  <strong>Servicios activos</strong>
                  <small>{serviciosActuales} publicados</small>
                </div>
              </div>
              <div className="detalle-item">
                <span className="material-icons">add_circle</span>
                <div>
                  <strong>Disponibles</strong>
                  <small>{Math.max(0, limiteServicios - serviciosActuales)} restantes</small>
                </div>
              </div>
            </div>
          </div>

          {serviciosActuales >= limiteServicios && (
            <div className="alerta-limite-alcanzado">
              <span className="material-icons">warning</span>
              <div>
                <strong>Alcanzaste tu límite</strong>
                <p>Para publicar más servicios, mejorá tu plan</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================
          PLANES DISPONIBLES
          ============================================ */}
      <PlanesDisponibles
        membresia={membresia}
        onPagoIniciado={() => {}}
      />

      {/* ============================================
          MODAL CANCELAR MEMBRESÍA
          ============================================ */}
      {modalCancelar && (
        <div className="modal-overlay" onClick={() => !cancelando && setModalCancelar(false)}>
          <div className="modal-content modal-cancelar" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header-cancelar">
              <span className="material-icons icon-warning">warning</span>
              <h3>¿Cancelar tu plan?</h3>
            </div>

            <div className="modal-body-cancelar">
              <p>Estás a punto de cancelar tu plan actual.</p>

              <div className="info-box-warning">
                <span className="material-icons">info</span>
                <div>
                  <strong>¿Qué pasará?</strong>
                  <ul>
                    <li>Conservás todos los beneficios hasta la fecha de vencimiento</li>
                    <li>No se te va a renovar automáticamente</li>
                    <li>Después de esa fecha volvés al Plan Free</li>
                    <li>Ahí perdés prioridad en búsquedas y el badge</li>
                  </ul>
                </div>
              </div>

              <p className="confirmacion-text">¿Estás seguro de continuar?</p>
            </div>

            <div className="modal-actions-cancelar">
              <button
                className="btn-volver"
                onClick={() => setModalCancelar(false)}
                disabled={cancelando}
              >
                No, mantener mi plan
              </button>
              <button
                className="btn-confirmar-cancelar"
                onClick={handleCancelarMembresia}
                disabled={cancelando}
              >
                {cancelando ? (
                  <>
                    <span className="spinner-small"></span>
                    Cancelando...
                  </>
                ) : (
                  <>
                    <span className="material-icons">cancel</span>
                    Sí, cancelar
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default MiMembresia;