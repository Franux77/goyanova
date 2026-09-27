import React, { useState, useRef, useEffect } from 'react';
import './AsistenteChat.css';

const IconoAsistente = ({ tamano = 40 }) => (
  <svg width={tamano} height={tamano} viewBox="0 0 64 64" fill="none">
    <path
      d="M32 6c-11 0-19.5 7.3-19.5 17.3 0 6.2 3.3 11.6 8.5 14.9-.3 2.6-1.4 5.3-3.6 7.6 3.6-.3 7-1.5 9.8-3.2 1.5.3 3.1.5 4.8.5 11 0 19.5-7.3 19.5-17.3S43 6 32 6Z"
      fill="#1774f6"
    />
    <rect x="19" y="17" width="26" height="18" rx="9" fill="white" />
    <rect x="10" y="21" width="6" height="10" rx="3" fill="#1774f6" />
    <rect x="48" y="21" width="6" height="10" rx="3" fill="#1774f6" />
    <line x1="32" y1="17" x2="32" y2="11" stroke="#1774f6" strokeWidth="2.2" />
    <circle cx="32" cy="9" r="2.4" fill="#1774f6" />
    <g className="asistente-ojos-grupo">
      <circle cx="26.5" cy="26" r="2.6" fill="#1774f6" className="asistente-ojo" />
      <circle cx="37.5" cy="26" r="2.6" fill="#1774f6" className="asistente-ojo" />
    </g>
    <path d="M27 31.5c1.8 1.6 6.2 1.6 8 0" stroke="#1774f6" strokeWidth="1.8" strokeLinecap="round" fill="none" />
  </svg>
);
const MENSAJE_BIENVENIDA = {
  role: 'assistant',
  content: '¡Hola! 👋 Soy el asistente de GoyaNova. Puedo ayudarte a publicar un servicio, encontrar algo, reportar contenido, entender los planes o cualquier duda sobre la plataforma. ¿En qué te ayudo?'
};

const MARGEN = 16;
const TAMANO_BOTON = 50;
const ZONA_CERRAR_ALTO = 70;
const ZONA_CERRAR_ANCHO = 160;

// Se resetea al recargar la página, pero sobrevive a navegar entre rutas (el componente se desmonta fuera del Inicio)
let ocultoEnEstaCarga = false;

const limitarAPantalla = ({ top, left }) => ({
  top: Math.min(Math.max(top, MARGEN), window.innerHeight - TAMANO_BOTON - MARGEN),
  left: Math.min(Math.max(left, MARGEN), window.innerWidth - TAMANO_BOTON - MARGEN)
});

const dentroDeZonaCerrar = (clientX, clientY) => {
  const centro = window.innerWidth / 2;
  return (
    clientY > window.innerHeight - ZONA_CERRAR_ALTO &&
    clientX > centro - ZONA_CERRAR_ANCHO / 2 &&
    clientX < centro + ZONA_CERRAR_ANCHO / 2
  );
};

const escaparHtml = (texto) =>
  texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatearMensaje = (texto) =>
  escaparHtml(texto).replace(
    /(https?:\/\/[^\s]+)/g,
    (coincidencia) => {
      // Separar puntuación final (. , ; : ! ? ) ]) que no es parte real del link,
      // para que no quede pegada dentro del href ni del texto visible.
      const puntuacionFinal = coincidencia.match(/[.,;:!?)\]]+$/);
      const sufijo = puntuacionFinal ? puntuacionFinal[0] : '';
      const url = sufijo ? coincidencia.slice(0, -sufijo.length) : coincidencia;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; font-weight: 600;">${url}</a>${sufijo}`;
    }
  );

const AsistenteChat = () => {
  const [abierto, setAbierto] = useState(false);
  const [ocultoPorUsuario, setOcultoPorUsuario] = useState(ocultoEnEstaCarga);
  const [mostrandoZonaCerrar, setMostrandoZonaCerrar] = useState(false);
  const [sobreZonaCerrar, setSobreZonaCerrar] = useState(false);
  const [mensajes, setMensajes] = useState([MENSAJE_BIENVENIDA]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const scrollRef = useRef(null);
  const botonRef = useRef(null);

  const [pos, setPos] = useState(() => {
    const guardada = localStorage.getItem('asistente_pos');
    if (guardada) {
      try {
        const p = JSON.parse(guardada);
        // Compatibilidad con el formato viejo {lado, top} → lo convertimos a {top, left}
        if (p.lado) {
          const left = p.lado === 'right'
            ? window.innerWidth - TAMANO_BOTON - MARGEN
            : MARGEN;
          return limitarAPantalla({ top: p.top, left });
        }
        // Se limita por si la ventana ahora es más chica que cuando se guardó
        return limitarAPantalla(p);
      } catch { /* ignorar */ }
    }
    return {
      top: window.innerHeight - TAMANO_BOTON - MARGEN * 2,
      left: window.innerWidth - TAMANO_BOTON - MARGEN
    };
  });

  const arrastrando = useRef(false);
  const movioSeDeVerdad = useRef(false);
  const offsetInicial = useRef({ x: 0, y: 0 });
  // Ref además del estado: los listeners de window se registran una sola vez y leerían un estado viejo
  const sobreZonaCerrarRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, abierto]);

  const iniciarArrastre = (clientX, clientY) => {
    arrastrando.current = true;
    movioSeDeVerdad.current = false;
    const rect = botonRef.current.getBoundingClientRect();
    offsetInicial.current = { x: clientX - rect.left, y: clientY - rect.top };
  };

  const moverArrastre = (clientX, clientY) => {
    if (!arrastrando.current) return;
    movioSeDeVerdad.current = true;

    // Recién se muestra al arrastrar, así un simple clic no la hace parpadear
    setMostrandoZonaCerrar(true);
    const sobreZona = dentroDeZonaCerrar(clientX, clientY);
    sobreZonaCerrarRef.current = sobreZona;
    setSobreZonaCerrar(sobreZona);

    setPos(limitarAPantalla({
      top: clientY - offsetInicial.current.y,
      left: clientX - offsetInicial.current.x
    }));
  };

  const terminarArrastre = () => {
    if (!arrastrando.current) return;
    arrastrando.current = false;
    setMostrandoZonaCerrar(false);
    setSobreZonaCerrar(false);

    if (sobreZonaCerrarRef.current) {
      sobreZonaCerrarRef.current = false;
      ocultoEnEstaCarga = true;
      setOcultoPorUsuario(true);
      return;
    }

    setPos(prev => {
      localStorage.setItem('asistente_pos', JSON.stringify(prev));
      return prev;
    });
  };

  useEffect(() => {
    const onMouseMove = (e) => moverArrastre(e.clientX, e.clientY);
    const onMouseUp = () => terminarArrastre();
    const onTouchMove = (e) => {
      const t = e.touches[0];
      if (t) moverArrastre(t.clientX, t.clientY);
    };
    const onTouchEnd = () => terminarArrastre();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  const handleClickBoton = () => {
    // Si se movió de verdad (arrastre), no abrir el chat con ese mismo clic
    if (movioSeDeVerdad.current) {
      movioSeDeVerdad.current = false;
      return;
    }
    setAbierto(true);
  };

  const enviarMensaje = async () => {
    const contenido = texto.trim();
    if (!contenido || cargando) return;

    const nuevosMensajes = [...mensajes, { role: 'user', content: contenido }];
    setMensajes(nuevosMensajes);
    setTexto('');
    setCargando(true);

    try {
      const res = await fetch('/api/asistente-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensajes: nuevosMensajes
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await res.json();

      if (data.error === 'limite_alcanzado') {
        setMensajes(prev => [...prev, {
          role: 'assistant',
          content: 'Estoy con mucha consulta en este momento 🙏 Mientras tanto, escribinos directo por WhatsApp: https://wa.me/5493777599800'
        }]);
      } else if (data.error === 'servicio_no_disponible') {
        setMensajes(prev => [...prev, {
          role: 'assistant',
          content: 'El servicio de IA está temporalmente caído. Probá de nuevo en un momento, o escribinos directo por WhatsApp: https://wa.me/5493777599800'
        }]);
      } else if (data.error) {
        setMensajes(prev => [...prev, { role: 'assistant', content: 'Perdón, no pude procesar eso ahora. Si necesitás una respuesta rápida, escribinos por WhatsApp: https://wa.me/5493777599800' }]);
      } else {
        setMensajes(prev => [...prev, { role: 'assistant', content: data.respuesta }]);
      }
    } catch {
      setMensajes(prev => [...prev, { role: 'assistant', content: 'No pude conectarme en este momento. Si necesitás ayuda, escribinos por WhatsApp: https://wa.me/5493777599800' }]);
    } finally {
      setCargando(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje();
    }
  };

  const estiloBoton = {
    top: pos.top,
    left: pos.left
  };

  // El panel se ancla abajo, del mismo lado de la pantalla donde quedó el botón
  const ladoPanel = pos.left < window.innerWidth / 2 ? 'left' : 'right';

  const estiloPanel = {
    bottom: MARGEN,
    [ladoPanel]: MARGEN
  };

  return (
    <>
      {!ocultoPorUsuario && (
        <div className="asistente-fab-wrapper" style={estiloBoton}>
          <button
            ref={botonRef}
            className={`asistente-fab ${abierto ? 'oculto' : ''}`}
            onMouseDown={(e) => iniciarArrastre(e.clientX, e.clientY)}
            onTouchStart={(e) => {
              const t = e.touches[0];
              if (t) iniciarArrastre(t.clientX, t.clientY);
            }}
            onClick={handleClickBoton}
            aria-label="Abrir asistente"
          >
            <IconoAsistente tamano={38} />
            <span className="asistente-fab-online"></span>
          </button>
        </div>
      )}

      {mostrandoZonaCerrar && (
        <div className={`asistente-zona-cerrar ${sobreZonaCerrar ? 'activa' : ''}`}>
          <span className="material-icons">close</span>
          Soltar para ocultar
        </div>
      )}

      {abierto && (
        <div className="asistente-panel" style={estiloPanel}>
          <div className="asistente-header">
            <div className="asistente-header-info">
              <IconoAsistente tamano={30} />
              <div>
                <strong>Asistente GoyaNova</strong>
                <span>Te ayudo con lo que necesites</span>
              </div>
            </div>
            <button className="asistente-cerrar" onClick={() => setAbierto(false)}>
              <span className="material-icons">close</span>
            </button>
          </div>

          <div className="asistente-mensajes">
            {mensajes.map((m, i) => (
              <div
                key={i}
                className={`asistente-burbuja ${m.role}`}
                dangerouslySetInnerHTML={{ __html: formatearMensaje(m.content) }}
              />
            ))}
            {cargando && (
              <div className="asistente-burbuja assistant asistente-escribiendo">
                <span></span><span></span><span></span>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          <div className="asistente-input-row">
            <input
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribí tu pregunta..."
              disabled={cargando}
            />
            <button onClick={enviarMensaje} disabled={cargando || !texto.trim()}>
              <span className="material-icons">send</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AsistenteChat;