import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import './ModalCodigoPromo.css';

// ============================================
// MODAL DE CÓDIGO PROMOCIONAL
// ============================================
// Usado tanto para registro con Google como Email
// Aparece SOLO UNA VEZ después del primer login

const ModalCodigoPromo = ({ user, onClose, esNuevoUsuario = false }) => {
  // ============================================
  // ESTADOS
  // ============================================
  const [codigoInput, setCodigoInput] = useState('');
  const [verificandoCodigo, setVerificandoCodigo] = useState(false);
  const [codigoValido, setCodigoValido] = useState(null);
  const [infoCodigo, setInfoCodigo] = useState(null);
  const [aplicando, setAplicando] = useState(false);

  // ============================================
  // VERIFICAR CÓDIGO EN TIEMPO REAL
  // ============================================
  const verificarCodigo = async (codigo) => {
    if (!codigo || codigo.length < 4) {
      setCodigoValido(null);
      setInfoCodigo(null);
      return;
    }

    try {
      setVerificandoCodigo(true);
      // console.log('🔍 Verificando código:', codigo);
      
      const { data, error } = await supabase
        .from('codigos_promocionales')
        .select('codigo, descripcion, duracion_dias, usos_maximos, usos_actuales, activo')
        .eq('codigo', codigo.toUpperCase())
        .maybeSingle();

      if (error) {
        console.error('❌ Error consultando código:', error.message);
        setCodigoValido(false);
        setInfoCodigo({ mensaje: 'Error al verificar código' });
        return;
      }

      if (!data) {
        setCodigoValido(false);
        setInfoCodigo({ mensaje: 'Código no encontrado' });
        // console.log('❌ Código no existe:', codigo);
        return;
      }

      if (!data.activo) {
        setCodigoValido(false);
        setInfoCodigo({ mensaje: 'Código desactivado' });
        // console.log('⚠️ Código desactivado:', codigo);
        return;
      }

      if (data.usos_actuales >= data.usos_maximos) {
        setCodigoValido(false);
        setInfoCodigo({ mensaje: 'Código agotado' });
        // console.log('⚠️ Código sin usos disponibles:', data);
        return;
      }

      setCodigoValido(true);
      setInfoCodigo({
        mensaje: `¡Válido! ${data.duracion_dias} días Premium gratis`,
        dias: data.duracion_dias,
        descripcion: data.descripcion
      });
      // console.log('✅ Código válido:', data);
      
    } catch (err) {
      console.error('❌ Error inesperado verificando código:', err);
      setCodigoValido(false);
      setInfoCodigo({ mensaje: 'Error al verificar' });
    } finally {
      setVerificandoCodigo(false);
    }
  };

  // ============================================
  // EFECTO: VERIFICAR CÓDIGO CON DEBOUNCE
  // ============================================
  useEffect(() => {
    const timer = setTimeout(() => {
      if (codigoInput) {
        verificarCodigo(codigoInput);
      } else {
        setCodigoValido(null);
        setInfoCodigo(null);
      }
    }, 500); // Espera 500ms después de que el usuario deja de escribir

    return () => clearTimeout(timer);
  }, [codigoInput]);

  // ============================================
  // APLICAR CÓDIGO PROMOCIONAL
  // ============================================
  const handleAplicarCodigo = async () => {
    if (!codigoValido) {
      console.warn('⚠️ Intento de aplicar código inválido');
      return;
    }

    if (!user?.id) {
      console.error('❌ No hay usuario autenticado');
      alert('Error: Usuario no autenticado');
      return;
    }

    try {
      setAplicando(true);
      // console.log('🎁 Aplicando código:', codigoInput.toUpperCase());
      // console.log('   - Usuario ID:', user.id);
      // console.log('   - Días:', infoCodigo.dias);

      const { data, error } = await supabase.rpc('aplicar_codigo_promocional', {
        p_codigo: codigoInput.toUpperCase(),
        p_usuario_id: user.id
      });

      if (error) {
        console.error('❌ Error en RPC aplicar_codigo_promocional:', error);
        throw error;
      }

      if (!data) {
        console.error('❌ RPC no devolvió datos');
        throw new Error('No se recibió respuesta del servidor');
      }

      // console.log('📊 Respuesta del servidor:', data);

      if (data.success) {
        // console.log('✅ Código aplicado exitosamente');
        // console.log('   - Días otorgados:', infoCodigo.dias);
        // console.log('   - Nueva fecha vencimiento:', data.nueva_fecha_vencimiento || 'N/A');
        
        alert(`✅ ¡Código aplicado con éxito!\n\n🎉 Recibiste ${infoCodigo.dias} días Premium gratis\n\n¡Disfrutá de todos los beneficios!`);
        
        // Limpiar TODAS las flags de storage
        // console.log('🧹 Limpiando flags de storage...');
        sessionStorage.removeItem('nuevo_usuario_google');
        sessionStorage.removeItem('mostrar_modal_promo');
        localStorage.removeItem('pendiente_modal_promo');
        
        onClose();
      } else {
        console.warn('⚠️ El servidor rechazó el código:', data.error || data.message);
        alert('❌ ' + (data.error || data.message || 'Error al aplicar código'));
      }
    } catch (error) {
      console.error('❌ Error aplicando código:', error);
      
      // Mensajes de error específicos
      let mensajeError = 'Error al aplicar el código';
      
      if (error.message?.includes('already used')) {
        mensajeError = 'Este código ya fue usado';
      } else if (error.message?.includes('expired')) {
        mensajeError = 'Este código expiró';
      } else if (error.message?.includes('not found')) {
        mensajeError = 'Código no encontrado';
      } else if (error.message) {
        mensajeError = error.message;
      }
      
      alert('❌ ' + mensajeError);
    } finally {
      setAplicando(false);
      // console.log('🏁 Proceso de aplicación finalizado');
    }
  };

  // ============================================
  // OMITIR CÓDIGO
  // ============================================
  const handleOmitir = () => {
    // console.log('⏭️  Usuario omitió el código promocional');
    
    // Limpiar TODAS las flags de storage
    // console.log('🧹 Limpiando flags de storage...');
    sessionStorage.removeItem('nuevo_usuario_google');
    sessionStorage.removeItem('mostrar_modal_promo');
    localStorage.removeItem('pendiente_modal_promo');
    
    onClose();
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="modal-codigo-promo-overlay">
      <div className="modal-codigo-promo-content">
        
        {/* HEADER */}
        <div className="modal-codigo-promo-header">
          <div className="welcome-icon">🎉</div>
          <h2>¡Bienvenido a GoyaNova!</h2>
          <p>
            {esNuevoUsuario 
              ? 'Tu cuenta está lista para usar' 
              : '¿Tenés un código promocional?'}
          </p>
        </div>

        {/* BODY */}
        <div className="modal-codigo-promo-body">
          
          {/* Info del código */}
          <div className="promo-info">
            <span className="material-icons">redeem</span>
            <div>
              <strong>¿Tienes un código promocional?</strong>
              <p>Obtén beneficios Premium gratis por tiempo limitado</p>
            </div>
          </div>

          {/* Input del código */}
          <div className="codigo-input-group">
            <label>Código Promocional (opcional)</label>
            <div className="codigo-input-wrapper">
              <input
                type="text"
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value.toUpperCase())}
                placeholder="Ej: GOYA01"
                maxLength="10"
                disabled={aplicando}
                autoFocus={false}
              />
              
              {/* Indicadores de estado */}
              {verificandoCodigo && (
                <span className="input-status">
                  <div className="spinner-mini"></div>
                </span>
              )}
              {!verificandoCodigo && codigoValido === true && (
                <span className="input-status status-ok">
                  <span className="material-icons">check_circle</span>
                </span>
              )}
              {!verificandoCodigo && codigoValido === false && codigoInput && (
                <span className="input-status status-error">
                  <span className="material-icons">cancel</span>
                </span>
              )}
            </div>

            {/* Mensaje de éxito */}
            {infoCodigo && codigoValido && (
              <div className="codigo-mensaje exito">
                <span className="material-icons">celebration</span>
                <span>{infoCodigo.mensaje}</span>
              </div>
            )}

            {/* Mensaje de error */}
            {infoCodigo && !codigoValido && codigoInput && (
              <div className="codigo-mensaje error">
                <span className="material-icons">error_outline</span>
                <span>{infoCodigo.mensaje}</span>
              </div>
            )}
          </div>

          {/* Beneficios Premium */}
          <div className="beneficios-preview">
            <h4>Beneficios Premium:</h4>
            <ul>
              <li>
                <span className="material-icons">star</span> 
                Aparece primero en búsquedas
              </li>
              <li>
                <span className="material-icons">image</span> 
                Hasta 10 fotos por servicio
              </li>
              <li>
                <span className="material-icons">verified</span> 
                Badge "Promoción"
              </li>
            </ul>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="modal-codigo-promo-actions">
          <button 
            className="btn-omitir"
            onClick={handleOmitir}
            disabled={aplicando}
          >
            {codigoInput ? 'Continuar sin código' : 'Continuar'}
          </button>
          
          {codigoInput && (
            <button 
              className="btn-aplicar"
              onClick={handleAplicarCodigo}
              disabled={!codigoValido || aplicando}
            >
              {aplicando ? (
                <>
                  <span className="spinner-btn"></span>
                  Aplicando...
                </>
              ) : (
                'Aplicar Código'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalCodigoPromo;