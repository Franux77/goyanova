import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import './BienvenidaGoya.css';

// Los números se guardan un rato para no consultarlos en cada visita
const CLAVE_CACHE = 'goyanova_numeros_home_v3';
const CACHE_MS = 30 * 60 * 1000;

const traerNumeros = async () => {
  try {
    const guardado = localStorage.getItem(CLAVE_CACHE);
    if (guardado) {
      const { data, t } = JSON.parse(guardado);
      if (Date.now() - t < CACHE_MS) return data;
    }
  } catch {
    // sin caché, se consulta igual
  }

  const contar = (consulta) => consulta.then(({ count, error }) => (error ? null : count));
  const servicios = await contar(
    supabase
      .from('servicios')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'activo')
      .eq('oculto_por_reportes', false)
  );

  const data = { servicios };
  try {
    localStorage.setItem(CLAVE_CACHE, JSON.stringify({ data, t: Date.now() }));
  } catch {
    // modo privado: no pasa nada
  }
  return data;
};

/* ------------------------------------------------------------
   Bienvenida: qué es GoyaNova, en una mirada
   ------------------------------------------------------------ */
export const BienvenidaGoya = ({ onComoFunciona, mostrarInstalar, onInstalar }) => {
  const [numeros, setNumeros] = useState(null);

  useEffect(() => {
    let activo = true;
    traerNumeros().then((n) => activo && setNumeros(n));
    return () => {
      activo = false;
    };
  }, []);

  const cantidad = numeros?.servicios > 0 ? numeros.servicios : null;

  // Franja chica: explica qué es sin empujar el mapa y las categorías hacia abajo
  return (
    <section className="bg-intro" aria-labelledby="bg-intro-titulo">
      <h1 id="bg-intro-titulo" className="bg-intro-titulo">
        Todo Goya, en un solo lugar
      </h1>
      <p className="bg-intro-texto">
        {cantidad ? <><strong>{cantidad}</strong> oficios y comercios de la ciudad. </> : 'Oficios y comercios de la ciudad. '}
        Escribiles <strong>directo por WhatsApp</strong>, gratis.
      </p>

      <div className="bg-intro-fila">
        <button type="button" className="bg-chip bg-chip-boton" onClick={onComoFunciona}>
          <span className="material-icons">help_outline</span>
          ¿Cómo funciona?
        </button>
        {mostrarInstalar && (
          <button type="button" className="bg-chip bg-chip-boton" onClick={onInstalar}>
            <span className="material-icons">get_app</span>
            Descargar app
          </button>
        )}
      </div>
    </section>
  );
};

/* ------------------------------------------------------------
   Cómo funciona: para quien busca y para quien ofrece
   ------------------------------------------------------------ */
const PASOS_BUSCAR = [
  { icono: 'search', titulo: 'Buscá', texto: 'Por categoría, por nombre o en el mapa.' },
  { icono: 'star_rate', titulo: 'Compará', texto: 'Mirá fotos, ubicación y opiniones de vecinos.' },
  { icono: 'chat', titulo: 'Escribí', texto: 'Hablás directo por WhatsApp y arreglás vos.' },
];

const PASOS_OFRECER = [
  { icono: 'person_add', texto: 'Creá tu cuenta gratis' },
  { icono: 'add_photo_alternate', texto: 'Publicá con fotos, horarios y ubicación' },
  { icono: 'notifications_active', texto: 'Los clientes te escriben a tu WhatsApp' },
];

export const ComoFunciona = ({ onPublicar }) => (
  <section id="como-funciona" className="bg-como" aria-labelledby="bg-como-titulo">
    <h2 id="bg-como-titulo" className="bg-titulo-seccion">¿Cómo funciona?</h2>

    <div className="bg-como-grid">
      <div className="bg-como-tarjeta">
        <div className="bg-como-cabecera">
          <span className="material-icons bg-como-icono bg-azul">person_search</span>
          <div>
            <strong>Si buscás algo</strong>
            <span>Es gratis y no necesitás cuenta</span>
          </div>
        </div>
        <ol className="bg-pasos">
          {PASOS_BUSCAR.map((p, i) => (
            <li key={p.titulo}>
              <span className="bg-paso-num">{i + 1}</span>
              <div>
                <strong>{p.titulo}</strong>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-como-tarjeta bg-como-ofrecer">
        <div className="bg-como-cabecera">
          <span className="material-icons bg-como-icono bg-verde">engineering</span>
          <div>
            <strong>Si ofrecés algo</strong>
            <span>Un oficio, un servicio o lo que vendés</span>
          </div>
        </div>
        <ul className="bg-checks">
          {PASOS_OFRECER.map((p) => (
            <li key={p.texto}>
              <span className="material-icons">{p.icono}</span>
              {p.texto}
            </li>
          ))}
        </ul>
        <button type="button" className="bg-btn bg-btn-verde" onClick={onPublicar}>
          <span className="material-icons">add_circle</span>
          Publicar gratis
        </button>
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------
   Preguntas frecuentes (las dudas de quien llega por primera vez)
   ------------------------------------------------------------ */
const PREGUNTAS = [
  {
    p: '¿Qué es GoyaNova?',
    r: 'Una guía de Goya hecha por goyanos: reúne oficios, profesionales, comercios y emprendimientos de la ciudad para que los encuentres rápido y los contactes directo.',
  },
  {
    p: '¿Tengo que pagar para buscar o contactar?',
    r: 'No. Buscar, ver perfiles y escribir por WhatsApp es gratis y no hace falta crear una cuenta. GoyaNova no cobra comisiones por los trabajos.',
  },
  {
    p: '¿Cuánto cuesta publicar?',
    r: 'Podés publicar gratis con el Plan Free. Si querés más publicaciones o destacarte en las búsquedas, hay planes Premium.',
  },
  {
    p: '¿Cómo sé si un servicio es confiable?',
    r: 'Mirá las opiniones y calificaciones de otros vecinos en cada perfil. Si ves algo raro, podés reportarlo y lo revisamos.',
  },
  {
    p: '¿Funciona en el celular?',
    r: 'Sí. Podés usarlo desde el navegador o instalarlo como app en tu pantalla de inicio, sin ocupar casi espacio.',
  },
];

export const PreguntasFrecuentes = () => {
  const [abierta, setAbierta] = useState(null);

  return (
    <section className="bg-faq" aria-labelledby="bg-faq-titulo">
      <h2 id="bg-faq-titulo" className="bg-titulo-seccion">Preguntas frecuentes</h2>
      <div className="bg-faq-lista">
        {PREGUNTAS.map((item, i) => {
          const abiertaEsta = abierta === i;
          return (
            <div key={item.p} className={`bg-faq-item ${abiertaEsta ? 'abierta' : ''}`}>
              <button
                type="button"
                className="bg-faq-pregunta"
                aria-expanded={abiertaEsta}
                onClick={() => setAbierta(abiertaEsta ? null : i)}
              >
                {item.p}
                <span className="material-icons">expand_more</span>
              </button>
              <div className="bg-faq-respuesta">
                <p>{item.r}</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="bg-faq-mas">
        ¿Otra duda? <Link to="/ayuda">Centro de ayuda</Link> · <Link to="/nosotros">Conocé el proyecto</Link>
      </p>
    </section>
  );
};
