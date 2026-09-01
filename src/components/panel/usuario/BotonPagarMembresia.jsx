import React, { useState } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import './BotonPagarMembresia.css';

const BotonPagarMembresia = ({ membresia, onPagoIniciado }) => {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);

  const handlePagar = async () => {
    try {
      setProcesando(true);
      setError(null);

      // console.log('💳 Iniciando proceso de pago...');
      // console.log('📊 Estado actual de membresía:', membresia);

      // Obtener token de sesión actual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No estás autenticado. Por favor, iniciá sesión nuevamente.');
      }

      // console.log('🔑 Sesión obtenida, llamando a Edge Function...');

      // Llamar a la Edge Function para crear preferencia de pago
      const { data, error: functionError } = await supabase.functions.invoke(
        'crear-preferencia-pago',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );

      // console.log('📡 Respuesta de Edge Function:', { data, error: functionError });

      if (functionError) {
        console.error('❌ Error de la función:', functionError);
        
        // Mostrar mensaje de error más detallado
        if (functionError.message?.includes('FunctionsRelayError')) {
          throw new Error('La función de pago no está disponible. Por favor, contactá a soporte.');
        } else if (functionError.message?.includes('FunctionsFetchError')) {
          throw new Error('Error de conexión. Verificá tu internet y probá nuevamente.');
        } else {
          throw new Error(functionError.message || 'Error al procesar el pago');
        }
      }

      if (!data) {
        throw new Error('No se recibió respuesta del servidor');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // console.log('✅ Preferencia creada exitosamente:', data);

      // Notificar al componente padre que el pago se inició
      if (onPagoIniciado) {
        onPagoIniciado();
      }

      // Redirigir a Mercado Pago
      if (data.init_point) {
        // console.log('🚀 Redirigiendo a Mercado Pago...');
        window.location.href = data.init_point;
      } else {
        throw new Error('No se recibió URL de pago de Mercado Pago');
      }

    } catch (err) {
      console.error('❌ Error al procesar pago:', err);
      setError(err.message || 'Error al procesar el pago. Intentá nuevamente.');
      setProcesando(false);
    }
  };

  // Si ya tiene membresía Premium de pago activa
  if (membresia?.tipo === 'pago' && membresia?.es_premium) {
    return (
      <div className="info-membresia-activa">
        <span className="material-icons">check_circle</span>
        <p>Ya tenés una membresía Premium activa</p>
      </div>
    );
  }

  // Si tiene membresía promocional
  if (membresia?.tipo === 'codigo_gratis' && membresia?.es_premium) {
    return (
      <div className="info-membresia-promocional">
        <span className="material-icons">local_offer</span>
        <p>Tenés una membresía promocional activa. Cuando expire, podrás adquirir Premium.</p>
      </div>
    );
  }

  // Si tiene membresía VIP manual
  if (membresia?.tipo === 'manual_admin' && membresia?.es_premium) {
    return (
      <div className="info-membresia-vip">
        <span className="material-icons">workspace_premium</span>
        <p>Tenés una membresía VIP especial</p>
      </div>
    );
  }

  return (
    <div className="boton-pagar-container">
      {/* Badge de descuento */}
      <div className="promo-badge">
        <span className="material-icons">local_fire_department</span>
        <div className="promo-text">
          <strong>¡OFERTA DE LANZAMIENTO!</strong>
          <span>Precio exclusivo hasta agotar stock</span>
        </div>
      </div>

      {/* Botón principal */}
      <button 
        className="btn-pagar-premium"
        onClick={handlePagar}
        disabled={procesando}
      >
        <div className="btn-content">
          {procesando ? (
            <>
              <span className="spinner-small"></span>
              <span>Procesando pago...</span>
            </>
          ) : (
            <>
              <div className="precio-section">
                <div className="precio-actual-wrapper">
                  <span className="material-icons">workspace_premium</span>
                  <span className="precio-actual">USD 7/mes</span>
                </div>
                <span className="precio-nota">Precio sin impuestos</span>
              </div>
              <div className="btn-cta-wrapper">
                <span className="material-icons btn-icon">shopping_cart</span>
                <span className="btn-cta">ADQUIRIR PREMIUM AHORA</span>
                <span className="material-icons btn-arrow">arrow_forward</span>
              </div>
            </>
          )}
        </div>
      </button>

      {error && (
        <div className="error-pago">
          <span className="material-icons">error</span>
          <div className="error-content">
            <strong>Error al procesar el pago</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Información adicional */}
      <div className="info-promocion">
        <div className="info-item">
          <span className="material-icons">schedule</span>
          <span>Oferta por tiempo limitado</span>
        </div>
        <div className="info-item">
          <span className="material-icons">lock</span>
          <span>Pago seguro con Mercado Pago</span>
        </div>
        <div className="info-item">
          <span className="material-icons">trending_up</span>
          <span>Precio aumentará próximamente</span>
        </div>
      </div>

      <div className="aviso-precio">
        <span className="material-icons">info</span>
        <p>Este precio especial es solo para los primeros usuarios. Los nuevos miembros pagarán el precio regular.</p>
      </div>
    </div>
  );
};

export default BotonPagarMembresia;