import React, { useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../utils/supabaseClient';
import './RequierePerfilCompleto.css';

const RequierePerfilCompleto = ({ children }) => {
  const { user, perfil } = useAuth();
  const [completadoLocal, setCompletadoLocal] = useState(false);
  const [telefono, setTelefono] = useState('');
  const [edad, setEdad] = useState('');
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Admins nunca se bloquean. Si ya tiene los datos, pasa directo.
  const perfilCompleto =
    perfil?.rol === 'admin' ||
    completadoLocal ||
    (perfil?.edad != null && perfil?.telefono && perfil.telefono.trim() !== '');

  if (!perfil || perfilCompleto) {
    return children;
  }

  const handleGuardar = async (e) => {
    e.preventDefault();
    setError('');

    if (!telefono.trim()) {
      setError('Ingresá tu número de teléfono.');
      return;
    }
    if (!edad || Number(edad) < 18) {
      setError('Debés tener al menos 18 años para publicar un servicio.');
      return;
    }
    if (!aceptaTerminos) {
      setError('Debés aceptar los Términos y la Política de Privacidad.');
      return;
    }

    setGuardando(true);
    try {
      const { error: updateError } = await supabase
        .from('perfiles_usuarios')
        .update({ telefono: telefono.trim(), edad: Number(edad) })
        .eq('id', user.id);

      if (updateError) throw updateError;
      setCompletadoLocal(true);
        } catch (err) {
      if (import.meta.env.DEV) console.error('Error guardando perfil:', err);
      setError('No pudimos guardar tus datos. Intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="completar-perfil-overlay">
      <div className="completar-perfil-box">
        <h2>Completá tu perfil</h2>
        <p>Antes de publicar un servicio en GoyaNova, necesitamos estos datos.</p>

        {error && <div className="completar-perfil-error">{error}</div>}

        <form onSubmit={handleGuardar}>
          <input
            type="tel"
            placeholder="Teléfono *"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            disabled={guardando}
            required
          />
          <input
            type="number"
            placeholder="Edad *"
            min="18"
            value={edad}
            onChange={(e) => setEdad(e.target.value)}
            disabled={guardando}
            required
          />
          <label className="completar-perfil-checkbox">
            <input
              type="checkbox"
              checked={aceptaTerminos}
              onChange={(e) => setAceptaTerminos(e.target.checked)}
              disabled={guardando}
            />
            <span>
              Acepto los{' '}
              <a href="/terminos" target="_blank" rel="noopener noreferrer">Términos y Condiciones</a>
              {' '}y la{' '}
              <a href="/privacidad" target="_blank" rel="noopener noreferrer">Política de Privacidad</a>
            </span>
          </label>
          <button type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Continuar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RequierePerfilCompleto;