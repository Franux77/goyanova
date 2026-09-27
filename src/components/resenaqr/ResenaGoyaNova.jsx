import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import './ResenaGoyaNova.css';

/**
 * Reseña rápida de GoyaNova (la plataforma en sí, no un prestador puntual).
 * Pensada para el QR/link directo del Panel Admin: sin login, sin scroll,
 * un formulario cortito que va directo al mismo circuito de comentarios
 * moderados que ya usa la sección "Nosotros" (tabla comentarios_publicos,
 * vía la función crear_comentario_validado).
 */
export default function ResenaGoyaNova() {
  const [puntuacion, setPuntuacion] = useState(0);
  const [hoverEstrella, setHoverEstrella] = useState(0);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  async function enviarResena(e) {
    e.preventDefault();
    setError('');

    if (puntuacion === 0) {
      setError('Elegí una cantidad de estrellas antes de enviar.');
      return;
    }
    if (nombre.trim().length < 3) {
      setError('Contanos tu nombre completo (mínimo 3 caracteres).');
      return;
    }
    if (comentario.trim().length < 10) {
      setError('El comentario debe tener al menos 10 caracteres.');
      return;
    }

    setEnviando(true);

    let ip = null;
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      ({ ip } = await ipResponse.json());
    } catch {
      // sin IP no rompemos nada, la función RPC la acepta null
    }

    const { data, error: rpcError } = await supabase.rpc('crear_comentario_validado', {
      p_nombre_completo: nombre.trim(),
      p_email: email.trim() || null,
      p_comentario: comentario.trim(),
      p_puntuacion: puntuacion,
      p_ip_address: ip,
      p_user_agent: navigator.userAgent
    });

    setEnviando(false);

    if (rpcError || !data?.success) {
      setError(data?.error || 'No pudimos guardar tu reseña. Probá de nuevo en un momento.');
      return;
    }

    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="resenagn-pantalla">
        <div className="resenagn-card resenagn-gracias">
          <span className="material-icons resenagn-icono-check">check_circle</span>
          <h1>¡Gracias por tu opinión!</h1>
          <p>Tu reseña sobre GoyaNova va a verse en la web una vez que la revisemos.</p>
          <Link to="/nosotros" className="resenagn-link-inicio">
            Conocé más de GoyaNova
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="resenagn-pantalla">
      <div className="resenagn-card">
        <img
          src="/assets/GoyaNova_20250918_144009_0000.png"
          alt="GoyaNova"
          className="resenagn-logo"
        />
        <h1>¿Qué te pareció GoyaNova?</h1>
        <p className="resenagn-subtitulo">Tu opinión nos ayuda a mejorar la plataforma</p>

        <form onSubmit={enviarResena} className="resenagn-form">
          <div className="resenagn-estrellas">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className="material-icons resenagn-estrella"
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
            placeholder="Tu nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="resenagn-input"
            maxLength={100}
            required
          />

          <input
            type="email"
            placeholder="Tu email (opcional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="resenagn-input"
            maxLength={100}
          />

          <textarea
            placeholder="Contanos tu experiencia con GoyaNova..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className="resenagn-textarea"
            maxLength={1000}
            rows={4}
            required
          />

          {error && <p className="resenagn-error">{error}</p>}

          <button type="submit" className="resenagn-boton" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar reseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
