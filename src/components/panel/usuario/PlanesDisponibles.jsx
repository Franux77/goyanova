// src/components/panel/usuario/PlanesDisponibles.jsx
//
// Vidriera de planes. NO tiene nada hardcodeado: lee planes_membresia
// y cotizacion_usd. Si mañana cambiás un precio o un beneficio desde la
// base, acá se refleja solo.
//
// Muestra el plan actual del usuario marcado como "Tu plan actual".

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import BotonPagarMembresia from './BotonPagarMembresia';
import './PlanesDisponibles.css';

const PlanesDisponibles = ({ membresia, onPagoIniciado }) => {
  const [planes, setPlanes] = useState([]);
  const [cotizacion, setCotizacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);

        const [planesRes, cotRes] = await Promise.all([
          supabase
            .from('planes_membresia')
            .select('*')
            .eq('activo', true)
            .eq('visible_publico', true)
            .order('orden', { ascending: true }),
          supabase
            .from('cotizacion_usd')
            .select('valor_ars, valor_manual, usar_manual, redondeo_ars, actualizado_en')
            .eq('id', 1)
            .single()
        ]);

        if (planesRes.error) throw planesRes.error;

        setPlanes(planesRes.data || []);
        setCotizacion(cotRes.data || null);
      } catch (err) {
        console.error('Error cargando planes:', err);
        setError('No pudimos cargar los planes. Recargá la página.');
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  // Misma fórmula que usa la edge function al cobrar
  const convertirUsd = (usd) => {
    if (!usd || Number(usd) <= 0 || !cotizacion) return null;
    const valor = cotizacion.usar_manual
      ? Number(cotizacion.valor_manual)
      : Number(cotizacion.valor_ars);
    if (!valor || valor <= 0) return null;
    const redondeo = Number(cotizacion.redondeo_ars) || 100;
    return Math.round((Number(usd) * valor) / redondeo) * redondeo;
  };

  // Precio final en pesos de un plan.
  // Si tiene precio_usd, convierte. Si no, usa el precio fijo en ARS.
  const precioEnPesos = (plan, campoUsd = 'precio_usd') => {
    const usd = plan?.[campoUsd];
    if (usd && Number(usd) > 0) return convertirUsd(usd);
    if (campoUsd === 'precio_usd' && plan?.precio && Number(plan.precio) > 0) {
      return Number(plan.precio);
    }
    return null;
  };

  const formatearPesos = (n) =>
    n == null ? null : '$' + n.toLocaleString('es-AR');

  const esPlanActual = (plan) => {
    if (!membresia) return plan.tipo === 'gratis';
    // Sin membresía premium activa => está en el gratuito
    if (!membresia.es_premium) return plan.tipo === 'gratis';
    return membresia.tipo === plan.tipo;
  };

  if (loading) {
    return (
      <div className="planes-loading">
        <div className="planes-spinner" />
        <p>Cargando planes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="planes-error">
        <span className="material-icons">error_outline</span>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="planes-disponibles">
      <div className="planes-header">
        <h2>Elegí tu plan</h2>
        <p>Más visibilidad, más servicios y más fotos para que te encuentren.</p>
      </div>

      <div className="planes-grid">
        {planes.map((plan) => {
          const actual = esPlanActual(plan);
          const precioArs = precioEnPesos(plan);
          const listaArs = precioEnPesos(plan, 'precio_lista_usd');
          // Es gratis solo si no tiene NINGÚN precio, ni en dólares ni en pesos
          const gratis = !precioArs || precioArs <= 0;
          // Muestra el precio en dólares como principal solo si está fijado en USD
          const enDolares = plan.precio_usd && Number(plan.precio_usd) > 0;
          const beneficios = Array.isArray(plan.beneficios) ? plan.beneficios : [];

          return (
            <div
              key={plan.id}
              className={`plan-card ${actual ? 'plan-actual' : ''}`}
              style={{ '--plan-color': plan.color_acento || '#2563EB' }}
            >
              {actual && (
                <div className="plan-badge-actual">
                  <span className="material-icons">check_circle</span>
                  Tu plan actual
                </div>
              )}

              {plan.tiene_badge && plan.badge_texto && !actual && (
                <div className="plan-badge-tipo">{plan.badge_texto}</div>
              )}

              <h3 className="plan-nombre">{plan.nombre}</h3>

              {plan.descripcion && (
                <p className="plan-descripcion">{plan.descripcion}</p>
              )}

              <div className="plan-precio">
                {gratis ? (
                  <span className="plan-precio-gratis">Gratis</span>
                ) : enDolares ? (
                  <>
                    {plan.precio_lista_usd &&
                      Number(plan.precio_lista_usd) > Number(plan.precio_usd) && (
                        <span className="plan-precio-tachado">
                          USD {Number(plan.precio_lista_usd).toFixed(2)}
                        </span>
                      )}
                    <div className="plan-precio-principal">
                      <span className="plan-precio-usd">
                        USD {Number(plan.precio_usd).toFixed(0)}
                      </span>
                      <span className="plan-precio-periodo">
                        /{plan.duracion_dias} días
                      </span>
                    </div>
                    {precioArs && (
                      <span className="plan-precio-ars">
                        ≈ {formatearPesos(precioArs)} ARS
                        {listaArs && listaArs > precioArs && (
                          <s className="plan-precio-ars-tachado">
                            {formatearPesos(listaArs)}
                          </s>
                        )}
                      </span>
                    )}
                  </>
                ) : (
                  <div className="plan-precio-principal">
                    <span className="plan-precio-usd">
                      {formatearPesos(precioArs)}
                    </span>
                    <span className="plan-precio-periodo">
                      /{plan.duracion_dias} días
                    </span>
                  </div>
                )}
              </div>

              <div className="plan-limites">
                <div className="plan-limite">
                  <span className="material-icons">library_add</span>
                  <span>
                    {plan.limite_servicios}{' '}
                    {plan.limite_servicios === 1 ? 'servicio' : 'servicios'}
                  </span>
                </div>
                <div className="plan-limite">
                  <span className="material-icons">photo_library</span>
                  <span>{plan.limite_fotos} fotos c/u</span>
                </div>
              </div>

              <ul className="plan-beneficios">
                {beneficios.map((b, i) => (
                  <li key={i}>
                    <span className="material-icons">check</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div className="plan-accion">
                {actual ? (
                  <div className="plan-actual-msg">
                    <span className="material-icons">verified</span>
                    Activo
                  </div>
                ) : plan.es_comprable ? (
                  <BotonPagarMembresia
                    plan={plan}
                    precioArs={precioArs}
                    onPagoIniciado={onPagoIniciado}
                  />
                ) : gratis ? (
                  <div className="plan-actual-msg plan-msg-gris">
                    Plan base
                  </div>
                ) : (
                  <div className="plan-actual-msg plan-msg-gris">
                    Próximamente
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {cotizacion?.actualizado_en && (
        <p className="planes-nota-cotizacion">
          Los precios están en dólares. El cobro se hace en pesos al valor del
          dólar oficial ({formatearPesos(
            Math.round(
              cotizacion.usar_manual
                ? Number(cotizacion.valor_manual)
                : Number(cotizacion.valor_ars)
            )
          )}), actualizado el{' '}
          {new Date(cotizacion.actualizado_en).toLocaleDateString('es-AR')}.
        </p>
      )}
    </div>
  );
};

export default PlanesDisponibles;