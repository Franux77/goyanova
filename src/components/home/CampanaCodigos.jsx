import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import './CampanaCodigos.css';

// Botón llamativo del Home + modal de canje de código de la campaña.
// Solo se muestra si el Panel Admin tiene la campaña activa y la cuenta no tiene plan.
// Props: campana (resultado de useCampanaCodigos), user, esPremium, onCanjeado

const PASOS = [
  { icono: 'content_copy', titulo: 'Copiá el código', texto: 'Lo encontrás en nuestra historia de Instagram.' },
  { icono: 'keyboard', titulo: 'Pegalo acá', texto: 'Escribilo en el cuadro de abajo. Te mostramos qué plan te da.' },
  { icono: 'check_circle', titulo: 'Tocá “Canjear”', texto: 'Tu plan se activa al instante, sin tarjeta.' },
];

const formatearFin = (fin) => {
  if (!fin) return null;
  const f = new Date(fin);
  return f.toLocaleString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
};

const useCuentaRegresiva = (fin) => {
  const [restante, setRestante] = useState(null);
  useEffect(() => {
    if (!fin) { setRestante(null); return undefined; }
    const calc = () => {
      const ms = new Date(fin).getTime() - Date.now();
      if (ms <= 0) { setRestante(null); return; }
      setRestante({
        h: Math.floor(ms / 3600000),
        m: Math.floor((ms % 3600000) / 60000),
        s: Math.floor((ms % 60000) / 1000),
      });
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [fin]);
  return restante;
};

const CampanaCodigos = ({ campana, user, esPremium, onCanjeado }) => {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [info, setInfo] = useState(null); // respuesta de consultar_codigo
  const [canjeando, setCanjeando] = useState(false);
  const [exito, setExito] = useState(null); // respuesta de canjear_codigo
  const [errorCanje, setErrorCanje] = useState('');
  const peticion = useRef(0);
  const restante = useCuentaRegresiva(campana?.fin);

  const visible = !!(campana?.activa && user && !esPremium);

  // Verificar el código mientras escribe (con debounce)
  useEffect(() => {
    if (!abierto || exito) return undefined;
    const limpio = codigo.trim();
    if (limpio.length < 4) { setInfo(null); setVerificando(false); return undefined; }
    const id = ++peticion.current;
    setVerificando(true);
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc('consultar_codigo', { p_codigo: limpio });
      if (id !== peticion.current) return;
      setInfo(error ? { ok: false, mensaje: 'No pudimos verificar el código. Probá de nuevo.' } : data);
      setVerificando(false);
    }, 500);
    return () => clearTimeout(t);
  }, [codigo, abierto, exito]);

  // Bloquear el scroll del fondo con el modal abierto
  useEffect(() => {
    if (!abierto) return undefined;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previo; };
  }, [abierto]);

  // Si la campaña se apaga con el modal abierto, se cierra solo
  useEffect(() => {
    if (!visible && abierto && !exito) setAbierto(false);
  }, [visible, abierto, exito]);

  const cerrar = () => {
    setAbierto(false);
    if (exito && onCanjeado) onCanjeado();
    setCodigo(''); setInfo(null); setExito(null); setErrorCanje('');
  };

  const canjear = async () => {
    if (!info?.ok || canjeando) return;
    setCanjeando(true);
    setErrorCanje('');
    const { data, error } = await supabase.rpc('canjear_codigo', { p_codigo: codigo.trim() });
    setCanjeando(false);
    if (error || !data) { setErrorCanje('Ocurrió un error. Probá de nuevo en un momento.'); return; }
    if (!data.ok) { setErrorCanje(data.mensaje || 'No se pudo canjear el código.'); setInfo(data); return; }
    setExito(data);
    campana.refrescar?.();
  };

  const irA = (ruta) => { cerrar(); navigate(ruta); };

  // Si ya canjeó (esPremium pasa a true) pero el modal de éxito sigue abierto, hay que mantenerlo
  if (!visible && !(abierto && exito)) return null;

  const planInfo = exito || (info?.ok ? info : null);
  const finTexto = formatearFin(campana?.fin);

  return (
    <>
      {visible && (
        <section className="campcod-banner" aria-label="Código promocional">
          <button type="button" className="campcod-boton" onClick={() => setAbierto(true)}>
            <span className="campcod-boton-brillo" />
            <span className="campcod-boton-icono"><span className="material-icons">redeem</span></span>
            <span className="campcod-boton-textos">
              <span className="campcod-boton-etiqueta">Promo por tiempo limitado</span>
              <span className="campcod-boton-titulo">¡Tenemos un regalo para vos!</span>
              <span className="campcod-boton-sub">
                {restante
                  ? `Termina en ${String(restante.h).padStart(2, '0')}:${String(restante.m).padStart(2, '0')}:${String(restante.s).padStart(2, '0')}`
                  : 'Canjeá tu código y probá un plan gratis'}
              </span>
            </span>
            <span className="material-icons campcod-boton-flecha">chevron_right</span>
          </button>
        </section>
      )}

      {abierto && (
        <div className="campcod-overlay" onClick={cerrar} role="presentation">
          <div className="campcod-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="campcod-cerrar" onClick={cerrar} aria-label="Cerrar">
              <span className="material-icons">close</span>
            </button>

            {!exito ? (
              <>
              <div className="campcod-cuerpo">
                <header className="campcod-header">
                  <span className="campcod-header-icono"><span className="material-icons">card_giftcard</span></span>
                  <h2>Canjeá tu código</h2>
                  <p>Probá un plan de GoyaNova gratis y mirá cómo se ve tu servicio con todos los beneficios.</p>
                  {finTexto && (
                    <span className="campcod-vigencia">
                      <span className="material-icons">schedule</span> Disponible hasta el {finTexto}
                    </span>
                  )}
                  {campana?.cupos > 0 && (
                    <span className="campcod-cupos">
                      <span className="material-icons">local_fire_department</span>
                      Quedan {campana.cupos} {campana.cupos === 1 ? 'cupo' : 'cupos'} en total
                    </span>
                  )}
                </header>

                <ol className="campcod-pasos">
                  {PASOS.map((p, i) => (
                    <li key={p.titulo} className="campcod-paso">
                      <span className="campcod-paso-num">{i + 1}</span>
                      <span className="campcod-paso-cuerpo">
                        <strong>{p.titulo}</strong>
                        <small>{p.texto}</small>
                      </span>
                      <span className="material-icons campcod-paso-icono">{p.icono}</span>
                    </li>
                  ))}
                </ol>

                <div className="campcod-campo">
                  <label htmlFor="campcod-input">Tu código</label>
                  <div className="campcod-input-wrap">
                    <input
                      id="campcod-input"
                      type="text"
                      value={codigo}
                      onChange={(e) => { setCodigo(e.target.value.toUpperCase().replace(/\s/g, '')); setErrorCanje(''); }}
                      placeholder="Ej: GOYAIMP30"
                      maxLength={20}
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck="false"
                      disabled={canjeando}
                    />
                    <span className="campcod-estado">
                      {verificando && <span className="campcod-spinner" />}
                      {!verificando && info?.ok && <span className="material-icons campcod-ok">check_circle</span>}
                      {!verificando && info && !info.ok && codigo.trim().length >= 4 && <span className="material-icons campcod-mal">cancel</span>}
                    </span>
                  </div>

                  {!verificando && info && !info.ok && codigo.trim().length >= 4 && (
                    <div className="campcod-msg campcod-msg-error">
                      <span className="material-icons">error_outline</span>
                      <span>{info.mensaje}</span>
                    </div>
                  )}
                  {errorCanje && !(info && !info.ok) && (
                    <div className="campcod-msg campcod-msg-error">
                      <span className="material-icons">error_outline</span><span>{errorCanje}</span>
                    </div>
                  )}
                </div>

                {planInfo && (
                  <div className="campcod-plan">
                    <div className="campcod-plan-top">
                      <span className="campcod-plan-chip">Código disponible</span>
                      <h3>Plan {planInfo.plan_nombre}</h3>
                      <p className="campcod-plan-dias">
                        <strong>{planInfo.dias}</strong> {planInfo.dias === 1 ? 'día' : 'días'} gratis
                      </p>
                    </div>
                    <ul className="campcod-plan-lista">
                      <li><span className="material-icons">build</span> Hasta <b>{planInfo.limite_servicios}</b> servicios publicados</li>
                      <li><span className="material-icons">photo_library</span> Hasta <b>{planInfo.limite_fotos}</b> fotos por servicio</li>
                      {planInfo.aparece_primero && <li><span className="material-icons">trending_up</span> Aparecés primero en las búsquedas</li>}
                      {planInfo.badge_texto && <li><span className="material-icons">verified</span> Insignia “{planInfo.badge_texto}”</li>}
                    </ul>
                  </div>
                )}

                <p className="campcod-nota">Un código por cuenta. Se puede canjear solo si no tenés un plan pago activo.</p>
              </div>
              <div className="campcod-pie">
                <button
                  type="button"
                  className="campcod-canjear"
                  onClick={canjear}
                  disabled={!info?.ok || canjeando}
                >
                  {canjeando ? <><span className="campcod-spinner campcod-spinner-blanco" /> Canjeando...</> : <><span className="material-icons">redeem</span> Activar beneficio</>}
                </button>
                <button type="button" className="campcod-secundario" onClick={cerrar} disabled={canjeando}>
                  Ahora no
                </button>
              </div>
              </>
            ) : (
              <>
              <div className="campcod-cuerpo">
                <header className="campcod-header campcod-header-exito">
                  <span className="campcod-header-icono campcod-header-icono-ok"><span className="material-icons">celebration</span></span>
                  <h2>¡Listo, ya tenés tu plan!</h2>
                  <p>
                    Plan <b>{exito.plan_nombre}</b> activo por <b>{exito.dias} {exito.dias === 1 ? 'día' : 'días'}</b>
                    {exito.fecha_fin && <> (hasta el {new Date(exito.fecha_fin).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })})</>}.
                  </p>
                </header>

                <h4 className="campcod-tips-titulo">Aprovechalo así</h4>
                <ul className="campcod-tips">
                  <li>
                    <span className="material-icons">add_circle_outline</span>
                    <span><b>Publicá tu servicio u oficio.</b> Tocá “Publicar un Servicio” en el inicio. Podés cargar hasta {exito.limite_servicios}.</span>
                  </li>
                  <li>
                    <span className="material-icons">photo_library</span>
                    <span><b>Sumá fotos.</b> Al publicar, en el paso de imágenes: hasta {exito.limite_fotos} por servicio. Los que tienen buenas fotos reciben más contactos.</span>
                  </li>
                  {exito.aparece_primero && (
                    <li>
                      <span className="material-icons">trending_up</span>
                      <span><b>Mirá cómo salís primero.</b> Entrá a Explorar: tus servicios aparecen destacados arriba.</span>
                    </li>
                  )}
                  <li>
                    <span className="material-icons">card_membership</span>
                    <span><b>Controlá tus días.</b> En Mi Panel &gt; Mi Membresía ves tu plan y cuánto te queda.</span>
                  </li>
                  <li>
                    <span className="material-icons">dashboard</span>
                    <span><b>Seguí tus resultados.</b> En Mi Panel &gt; Dashboard ves cómo le va a tus publicaciones.</span>
                  </li>
                </ul>

              </div>
              <div className="campcod-pie">
                <button type="button" className="campcod-canjear" onClick={() => irA('/publicar')}>
                  <span className="material-icons">add_circle_outline</span> Publicar mi servicio ahora
                </button>
                <button type="button" className="campcod-secundario" onClick={() => irA('/panel/mi-membresia')}>
                  Ver mi membresía
                </button>
              </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CampanaCodigos;
