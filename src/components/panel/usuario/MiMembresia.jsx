import React, { useState, useEffect } from 'react';
import BotonPagarMembresia from './BotonPagarMembresia';
import { useAuth } from '../../../auth/useAuth';
import { supabase } from '../../../utils/supabaseClient';
import Loading from '../../loading/Loading'; // 👈 IMPORTAR
import './MiMembresia.css';

const MiMembresia = () => {
  const { user } = useAuth();
  const [membresia, setMembresia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalCancelar, setModalCancelar] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  // ============================================
  // CARGAR MEMBRESÍA DEL USUARIO
  // ============================================
  const cargarMembresia = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      console.log('📊 Cargando membresía del usuario:', user.id);
      
      const { data, error } = await supabase
        .rpc('obtener_membresia_usuario', {
          p_usuario_id: user.id
        });

      if (error) {
        console.error('❌ Error al cargar membresía:', error);
        throw error;
      }

      setMembresia(data);
      console.log('✅ Membresía cargada:', data);
    } catch (error) {
      console.error('❌ Error crítico al cargar membresía:', error);
      // Si falla, poner valores por defecto
      setMembresia({
        tiene_membresia: false,
        tipo: 'gratis',
        limite_fotos: 5,
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
// DETECTAR RETORNO DE MERCADO PAGO
// ============================================
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const pagoStatus = params.get('pago');

  if (pagoStatus) {
    // Limpiar URL
    window.history.replaceState({}, '', window.location.pathname);

    // Mostrar mensaje según el estado
    if (pagoStatus === 'exito') {
      alert('✅ ¡Pago exitoso! Tu membresía Premium se está activando. Puede demorar unos segundos.');
      // Recargar membresía después de 3 segundos
      setTimeout(() => {
        cargarMembresia();
      }, 3000);
    } else if (pagoStatus === 'pendiente') {
      alert('⏳ Tu pago está pendiente de confirmación. Te avisaremos cuando se procese.');
    } else if (pagoStatus === 'error') {
      alert('❌ Hubo un problema con tu pago. Por favor, intentá nuevamente.');
    }
  }
}, []);
  // ============================================
  // CALCULAR PORCENTAJE DE TIEMPO RESTANTE
  // ============================================
  const calcularPorcentaje = () => {
    if (!membresia?.dias_restantes) return 0;
    const diasTotal = membresia.tipo === 'codigo_gratis' ? 90 : 365;
    return Math.max(0, Math.min(100, (membresia.dias_restantes / diasTotal) * 100));
  };

  // ============================================
  // CANCELAR MEMBRESÍA
  // ============================================
  const handleCancelarMembresia = async () => {
    if (!membresia?.es_premium) return;

    try {
      setCancelando(true);
      console.log('🚫 Cancelando membresía...');

      const { error } = await supabase
        .from('membresias')
        .update({ 
          estado: 'cancelada',
          cancelado_por: user.id,
          fecha_cancelacion: new Date().toISOString(),
          motivo_cancelacion: 'Cancelado por el usuario'
        })
        .eq('usuario_id', user.id)
        .eq('estado', 'activa');

      if (error) throw error;

      console.log('✅ Membresía cancelada exitosamente');
      alert('✅ Membresía cancelada con éxito.\n\nTus beneficios Premium finalizarán al vencer el período actual.');
      
      setModalCancelar(false);
      cargarMembresia();

    } catch (error) {
      console.error('❌ Error al cancelar membresía:', error);
      alert('❌ Error al cancelar la membresía. Intenta nuevamente.');
    } finally {
      setCancelando(false);
    }
  };

  // ============================================
  // LOADING - 👇 REEMPLAZAR ESTE BLOQUE
  // ============================================
  if (loading) {
    return <Loading message="Cargando tu membresía..." />;
  }

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

        {/* Botón cancelar (solo si es premium y no es admin) */}
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
            <span className="membresia-icono">
              {membresia?.es_premium ? '⭐' : '🆓'}
            </span>
            <div className="tipo-text">
              <h2 className="membresia-tipo-titulo">
                {membresia?.tipo === 'manual_admin' ? 'Premium VIP' :
                 membresia?.tipo === 'pago' ? 'Premium Pago' :
                 membresia?.tipo === 'codigo_gratis' ? 'Premium Promocional' : 
                 'Plan Gratuito'}
              </h2>
              {membresia?.badge && (
                <span className="membresia-badge">{membresia.badge}</span>
              )}
            </div>
          </div>

          {membresia?.es_premium && (
            <div className="membresia-estado-badge">
              <span className="material-icons">verified</span>
              <span>Activo</span>
            </div>
          )}
        </div>

        {/* Tiempo Restante (solo premium) */}
        {membresia?.es_premium && membresia?.dias_restantes !== undefined && (
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
                    ? `Nivel ${membresia.prioridad_nivel} - Apareces primero` 
                    : 'Solo usuarios Premium'}
                </small>
              </div>
            </div>

            <div className="beneficio-item">
              <span className="material-icons beneficio-icon activo">check_circle</span>
              <div className="beneficio-text">
                <strong>Límite de fotos</strong>
                <small>Hasta {membresia?.limite_fotos || 5} fotos por servicio</small>
              </div>
            </div>

            {membresia?.badge && (
              <div className="beneficio-item">
                <span className="material-icons beneficio-icon activo">check_circle</span>
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
                <strong>Estadísticas avanzadas</strong>
                <small>
                  {membresia?.es_premium ? 'Acceso completo' : 'Solo usuarios Premium'}
                </small>
              </div>
            </div>

            <div className="beneficio-item">
              <span className={`material-icons beneficio-icon ${membresia?.es_premium ? 'activo' : 'inactivo'}`}>
                {membresia?.es_premium ? 'check_circle' : 'cancel'}
              </span>
              <div className="beneficio-text">
                <strong>Soporte prioritario</strong>
                <small>
                  {membresia?.es_premium ? 'Atención preferencial' : 'Solo usuarios Premium'}
                </small>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ============================================
          INFO ADICIONAL PARA USUARIOS GRATUITOS
          ============================================ */}
      {/* ============================================
    SECCIÓN PARA OBTENER PREMIUM
    ============================================ */}
{(!membresia?.tiene_membresia || membresia.tipo === 'gratis' || membresia.tipo === 'codigo_gratis') && (
  <div className="upgrade-section">
    <div className="upgrade-header">
      <div className="upgrade-icon">
        <span className="material-icons">rocket_launch</span>
      </div>
      <div className="upgrade-content">
        <h3>🚀 Potenciá tu visibilidad con Premium</h3>
        <p>Con Premium, tus servicios aparecen primero en todas las búsquedas y tenés acceso a beneficios exclusivos.</p>
      </div>
    </div>

    <div className="upgrade-beneficios-grid">
      <div className="beneficio-upgrade">
        <span className="material-icons">verified</span>
        <div>
          <strong>Prioridad máxima</strong>
          <small>Aparecés primero siempre</small>
        </div>
      </div>
      <div className="beneficio-upgrade">
        <span className="material-icons">photo_library</span>
        <div>
          <strong>Hasta 20 fotos</strong>
          <small>Mostrá más de tu trabajo</small>
        </div>
      </div>
      <div className="beneficio-upgrade">
        <span className="material-icons">workspace_premium</span>
        <div>
          <strong>Badge Premium</strong>
          <small>Destacate con insignia exclusiva</small>
        </div>
      </div>
      <div className="beneficio-upgrade">
        <span className="material-icons">support_agent</span>
        <div>
          <strong>Soporte prioritario</strong>
          <small>Atención preferencial</small>
        </div>
      </div>
    </div>

    {/* Botón de pago */}
    <BotonPagarMembresia 
      membresia={membresia} 
      onPagoIniciado={() => {
        console.log('🚀 Redirigiendo a Mercado Pago...');
      }}
    />

    <div className="upgrade-cta">
      <span className="material-icons">info</span>
      <span>También podés obtener Premium con códigos promocionales en folletos locales</span>
    </div>
  </div>
)}

      {/* ============================================
          TABLA COMPARATIVA
          ============================================ */}
      <div className="comparativa-planes">
        <h2>Comparación de Planes</h2>
        <div className="tabla-responsive">
          <table className="tabla-planes">
            <thead>
              <tr>
                <th>Característica</th>
                <th>Gratis</th>
                <th className="plan-premium">Premium</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Publicar servicios</td>
                <td><span className="check">✓</span></td>
                <td><span className="check">✓</span></td>
              </tr>
              <tr>
                <td>Fotos por servicio</td>
                <td>5 fotos</td>
                <td className="highlight">10-20 fotos</td>
              </tr>
              <tr>
                <td>Prioridad en resultados</td>
                <td><span className="cross">✗</span></td>
                <td><span className="check premium-check">✓</span></td>
              </tr>
              <tr>
                <td>Badge en publicaciones</td>
                <td><span className="cross">✗</span></td>
                <td><span className="check premium-check">✓</span></td>
              </tr>
              <tr>
                <td>Estadísticas avanzadas</td>
                <td><span className="cross">✗</span></td>
                <td><span className="check premium-check">✓</span></td>
              </tr>
              <tr>
                <td>Soporte prioritario</td>
                <td><span className="cross">✗</span></td>
                <td><span className="check premium-check">✓</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================
          MODAL CANCELAR MEMBRESÍA
          ============================================ */}
      {modalCancelar && (
        <div className="modal-overlay" onClick={() => !cancelando && setModalCancelar(false)}>
          <div className="modal-content modal-cancelar" onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-header-cancelar">
              <span className="material-icons icon-warning">warning</span>
              <h3>¿Cancelar Membresía Premium?</h3>
            </div>

            <div className="modal-body-cancelar">
              <p>Estás a punto de cancelar tu membresía Premium.</p>
              
              <div className="info-box-warning">
                <span className="material-icons">info</span>
                <div>
                  <strong>¿Qué pasará?</strong>
                  <ul>
                    <li>Mantendrás tus beneficios hasta: <strong>{new Date(membresia?.fecha_fin).toLocaleDateString('es-AR')}</strong></li>
                    <li>Después de esa fecha, volverás al plan gratuito</li>
                    <li>Perderás prioridad en búsquedas y badges exclusivos</li>
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
                No, mantener Premium
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