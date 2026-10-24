// "Tu mes en GoyaNova": cuántas personas vieron cada publicación y tocaron WhatsApp.
// Se muestra a todos los planes: es la forma de que el dueño vea que GoyaNova le trae clientes.
// Debajo, la oferta "Destacá tu publicación 7 días" (se pide por WhatsApp y el admin la
// activa desde Membresías asignando el Plan Destacado por 7 días).
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient';
import './TuMesGoyaNova.css';

// Cambiá estos valores cuando quieras (precio en pesos; null = "consultanos")
// activa: false = la oferta no se muestra (se usa hasta terminar el cobro con Mercado Pago)
export const OFERTA_DESTACADO = {
  activa: false,
  dias: 15,
  precio: 7900,
  whatsapp: '5493777599800',
};

const mesActual = () =>
  new Date().toLocaleDateString('es-AR', { month: 'long', timeZone: 'America/Argentina/Buenos_Aires' });

const Comparacion = ({ ahora, antes }) => {
  if (!antes && !ahora) return null;
  if (!antes) return <small className="tm-comp sube">nuevo este mes</small>;
  const dif = ahora - antes;
  if (dif === 0) return <small className="tm-comp">igual que el mes pasado</small>;
  return (
    <small className={`tm-comp ${dif > 0 ? 'sube' : 'baja'}`}>
      {dif > 0 ? `↑ ${dif}` : `↓ ${Math.abs(dif)}`} vs. mes pasado
    </small>
  );
};

const TuMesGoyaNova = ({ esPremium = false, email = '' }) => {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    let activo = true;
    supabase.rpc('mis_estadisticas_mes').then(({ data, error }) => {
      if (activo && !error && Array.isArray(data)) setDatos(data);
    }, () => {});
    return () => {
      activo = false;
    };
  }, []);

  // Sin publicaciones no hay nada que mostrar (el panel ya invita a publicar)
  if (!datos || datos.length === 0) return null;

  const visitas = datos.reduce((s, d) => s + Number(d.visitas_mes || 0), 0);
  const clics = datos.reduce((s, d) => s + Number(d.clics_mes || 0), 0);
  const visitasAntes = datos.reduce((s, d) => s + Number(d.visitas_mes_anterior || 0), 0);
  const clicsAntes = datos.reduce((s, d) => s + Number(d.clics_mes_anterior || 0), 0);
  const activas = datos.filter((d) => d.estado === 'activo');
  const principal = activas[0] || datos[0];

  const textoWsp = `Hola GoyaNova, quiero destacar mi publicación "${principal.nombre}" por ${OFERTA_DESTACADO.dias} días.${email ? ` Mi mail de la cuenta es ${email}.` : ''}`;
  const enlaceOferta = `https://wa.me/${OFERTA_DESTACADO.whatsapp}?text=${encodeURIComponent(textoWsp)}`;
  const precio = OFERTA_DESTACADO.precio
    ? Number(OFERTA_DESTACADO.precio).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
    : null;

  return (
    <section className="tm" aria-labelledby="tm-titulo">
      <div className="tm-cabecera">
        <h2 id="tm-titulo">
          <span className="material-icons">insights</span>
          Tu {mesActual()} en GoyaNova
        </h2>
        {datos.length > 1 && <span className="tm-cantidad">{datos.length} publicaciones</span>}
      </div>

      <div className="tm-numeros">
        <div className="tm-numero">
          <span className="material-icons">visibility</span>
          <strong>{visitas}</strong>
          <span>{visitas === 1 ? 'persona vio' : 'veces vieron'} tu perfil</span>
          <Comparacion ahora={visitas} antes={visitasAntes} />
        </div>
        <div className="tm-numero tm-numero-wsp">
          <span className="material-icons">chat</span>
          <strong>{clics}</strong>
          <span>{clics === 1 ? 'persona tocó' : 'personas tocaron'} tu WhatsApp</span>
          <Comparacion ahora={clics} antes={clicsAntes} />
        </div>
      </div>

      {datos.length > 1 && (
        <ul className="tm-lista">
          {datos.map((d) => (
            <li key={d.id}>
              <span className="tm-lista-nombre">{d.nombre}</span>
              <span><span className="material-icons">visibility</span>{d.visitas_mes}</span>
              <span><span className="material-icons">chat</span>{d.clics_mes}</span>
            </li>
          ))}
        </ul>
      )}

      {visitas === 0 && (
        <p className="tm-consejo">
          <span className="material-icons">lightbulb</span>
          Todavía nadie vio tu perfil este mes. Sumá fotos y una buena descripción, y compartí tu link en tus redes.
        </p>
      )}

      {OFERTA_DESTACADO.activa && !esPremium && activas.length > 0 && (
        <div className="tm-oferta">
          <div className="tm-oferta-textos">
            <span className="tm-oferta-etiqueta">Nuevo</span>
            <strong>Destacá tu publicación {OFERTA_DESTACADO.dias} días</strong>
            <p>
              Subís arriba en tu categoría, con pin azul en el mapa e insignia de Destacado.
              {precio ? <> Solo <b>{precio}</b>, sin suscripción.</> : ' Pago único, sin suscripción.'}
            </p>
          </div>
          <div className="tm-oferta-acciones">
            <a href={enlaceOferta} target="_blank" rel="noopener noreferrer" className="tm-boton">
              <span className="material-icons">rocket_launch</span>
              Lo quiero
            </a>
            <button type="button" className="tm-boton-sec" onClick={() => navigate('/panel/mi-membresia')}>
              Ver planes
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default TuMesGoyaNova;
