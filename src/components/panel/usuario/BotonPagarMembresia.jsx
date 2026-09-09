// src/components/panel/usuario/BotonPagarMembresia.jsx
//
// v2: ahora recibe el plan como prop y le manda el plan_id a la edge
// function. Ya no tiene el precio escrito a mano (aquel "USD 7/mes" que
// no coincidía con lo que se cobraba).
//
// Si lo usás sin prop `plan`, sigue funcionando como antes: la edge
// function cae al plan 'pago' por defecto.

import React, { useState } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import './BotonPagarMembresia.css';

const BotonPagarMembresia = ({ plan, precioArs, onPagoIniciado }) => {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);

  const handlePagar = async () => {
    try {
      setProcesando(true);
      setError(null);

      const { data: { session }, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Tenés que iniciar sesión para contratar un plan.');
      }

      const { data, error: functionError } = await supabase.functions.invoke(
        'crear-preferencia-pago',
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: plan?.id ? { plan_id: plan.id } : {}
        }
      );

      if (functionError) {
        console.error('Error de la función:', functionError);
        if (functionError.message?.includes('FunctionsRelayError')) {
          throw new Error('El servicio de pagos no está disponible. Escribinos y lo resolvemos.');
        }
        if (functionError.message?.includes('FunctionsFetchError')) {
          throw new Error('Error de conexión. Revisá tu internet y probá de nuevo.');
        }
        throw new Error(functionError.message || 'No pudimos iniciar el pago');
      }

      if (!data) throw new Error('No hubo respuesta del servidor');
      if (data.error) throw new Error(data.error);
      if (!data.init_point) throw new Error('Mercado Pago no devolvió el link de pago');

      if (onPagoIniciado) onPagoIniciado(plan);

      window.location.href = data.init_point;

    } catch (err) {
      console.error('Error al procesar pago:', err);
      setError(err.message || 'Error al procesar el pago. Intentá nuevamente.');
      setProcesando(false);
    }
  };

  const formatearPesos = (n) =>
    n == null ? null : '$' + Number(n).toLocaleString('es-AR');

  return (
    <div className="btn-plan-wrapper">
      <button
        className="btn-contratar-plan"
        onClick={handlePagar}
        disabled={procesando}
        style={{ '--btn-color': plan?.color_acento || '#2563EB' }}
      >
        {procesando ? (
          <>
            <span className="spinner-small" />
            <span>Redirigiendo a Mercado Pago...</span>
          </>
        ) : (
          <>
            <span className="material-icons">shopping_cart</span>
            <span>
              Contratar{plan?.nombre ? ` ${plan.nombre}` : ''}
            </span>
          </>
        )}
      </button>

      {!procesando && precioArs && (
        <span className="btn-plan-precio-nota">
          Pagás {formatearPesos(precioArs)} ARS
        </span>
      )}

      <div className="btn-plan-seguridad">
        <span className="material-icons">lock</span>
        <span>Pago seguro con Mercado Pago</span>
      </div>

      {error && (
        <div className="error-pago">
          <span className="material-icons">error</span>
          <div className="error-content">
            <strong>No se pudo iniciar el pago</strong>
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotonPagarMembresia;   