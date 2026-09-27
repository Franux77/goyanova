import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, rpcWithRetry } from '../../utils/supabaseClient';
import './ResenaQR.css';

function obtenerDispositivoId() {
  const CLAVE = 'goyanova_dispositivo_id';
  let id = localStorage.getItem(CLAVE);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLAVE, id);
  }
  return id;
}

export default function ResenaQR() {
  const { servicioId } = useParams();
  const [servicio, setServicio] = useState(null);
  const [cargandoServicio, setCargandoServicio] = useState(true);
  const [puntuacion, setPuntuacion] = useState(0);
  const [hoverEstrella, setHoverEstrella] = useState(0);
  const [comentario, setComentario] = useState('');
  const [nombre, setNombre] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargarServicio() {
      const { data, error } = await supabase
        .from('servicios')
        .select('id, nombre, foto_portada')
        .eq('id', servicioId)
        .single();

      if (error || !data) {
        setError('No pudimos encontrar este servicio.');
      } else {
        setServicio(data);
      }
      setCargandoServicio(false);
    }
    cargarServicio();
  }, [servicioId]);

  async function enviarResena(e) {
    e.preventDefault();
    setError('');

    if (puntuacion === 0) {
      setError('Elegí una cantidad de estrellas antes de enviar.');
      return;
    }

    setEnviando(true);
    const dispositivoId = obtenerDispositivoId();

    const { error } = await rpcWithRetry('crear_opinion_qr', {
      p_servicio_id: servicioId,
      p_puntuacion: puntuacion,
      p_comentario: comentario,
      p_nombre: nombre,
      p_dispositivo_id: dispositivoId,
    });

    setEnviando(false);

    if (error) {
      setError(
        error.message?.includes('hace poco')
          ? error.message
          : 'No pudimos guardar tu reseña. Probá de nuevo en un momento.'
      );
      return;
    }

    setEnviado(true);
  }

  if (cargandoServicio) {
    return <div className="resenaqr-pantalla resenaqr-cargando">Cargando...</div>;
  }

  if (!servicio) {
    return (
      <div className="resenaqr-pantalla">
        <p className="resenaqr-error">{error || 'Servicio no encontrado.'}</p>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="resenaqr-pantalla resenaqr-gracias">
        <span className="material-icons resenaqr-icono-check">check_circle</span>
        <h1>¡Gracias por tu opinión!</h1>
        <p>
          Tu reseña para <strong>{servicio.nombre}</strong> ya quedó publicada.
        </p>
        <Link to="/" className="resenaqr-link-inicio">
          Conocé más de GoyaNova
        </Link>
      </div>
    );
  }

  return (
    <div className="resenaqr-pantalla">
      <div className="resenaqr-card">
        {servicio.foto_portada && (
          <img
            src={servicio.foto_portada}
            alt={servicio.nombre}
            className="resenaqr-logo"
          />
        )}
        <h1>{servicio.nombre}</h1>
        <p className="resenaqr-subtitulo">¿Cómo fue tu experiencia?</p>

        <form onSubmit={enviarResena} className="resenaqr-form">
          <div className="resenaqr-estrellas">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className="material-icons resenaqr-estrella"
                data-activa={n <= (hoverEstrella || puntuacion)}
                onClick={() => setPuntuacion(n)}
                onMouseEnter={() => setHoverEstrella(n)}
                onMouseLeave={() => setHoverEstrella(0)}
              >
                star
              </span>
            ))}
          </div>

          <input
            type="text"
            placeholder="Tu nombre (opcional)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="resenaqr-input"
            maxLength={80}
          />

          <textarea
            placeholder="Contanos algo más (opcional)"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className="resenaqr-textarea"
            maxLength={500}
            rows={3}
          />

          {error && <p className="resenaqr-error">{error}</p>}

          <button type="submit" className="resenaqr-boton" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar reseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
