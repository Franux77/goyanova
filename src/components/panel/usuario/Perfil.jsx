import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useAuth } from '../../../auth/useAuth';
import './Perfil.css';
import Loading from '../../loading/Loading';

const Perfil = () => {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [fotoPreview, setFotoPreview] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchPerfil = async () => {
      const { data, error } = await supabase
        .from('perfiles_usuarios')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error al traer perfil:', error.message);
        return;
      }

      setPerfil(data);
      setFotoPreview(data.foto_url || '');
    };

    fetchPerfil();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPerfil((prev) => ({ ...prev, [name]: value }));
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFotoPreview(url);
      setPerfil((prev) => ({ ...prev, foto_file: file })); 
    }
  };

  const handleGuardar = async () => {
    try {
      let foto_url = perfil.foto_url;
      if (perfil.foto_file) {
        const { data: fotoData, error: uploadError } = await supabase.storage
          .from('fotos-usuarios')
          .upload(`perfil/${user.id}.png`, perfil.foto_file, { upsert: true });

        if (uploadError) throw uploadError;

        const { publicUrl } = supabase.storage.from('fotos-usuarios').getPublicUrl(`perfil/${user.id}.png`);
        foto_url = publicUrl;
      }

      const { error } = await supabase
        .from('perfiles_usuarios')
        .update({
          nombre: perfil.nombre,
          apellido: perfil.apellido,
          email: perfil.email,
          telefono: perfil.telefono,
          edad: perfil.edad,
          foto_url,
        })
        .eq('id', user.id);

      if (error) throw error;

      setPerfil((prev) => ({ ...prev, foto_url }));
      setModoEdicion(false);
      alert('Perfil actualizado correctamente');
    } catch (err) {
      console.error('Error al actualizar perfil:', err.message);
      alert('Error al actualizar perfil');
    }
  };

  const handleCancelar = () => {
    setModoEdicion(false);
    setFotoPreview(perfil.foto_url || '');
  };

  const generarColorAleatorio = (seed) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = `hsl(${hash % 360}, 70%, 50%)`;
    return color;
  };

  const obtenerIniciales = (nombre, apellido) => {
    return `${nombre?.[0] || ''}${apellido?.[0] || ''}`.toUpperCase();
  };

  if (!perfil) return <Loading message="Cargando perfil..." />;

  return (
    <div className="usuario-perfil-container">
      <h2 className="usuario-perfil-titulo">Mi Perfil</h2>

      <div className="usuario-perfil-card">
        <div className="usuario-perfil-foto">
          {fotoPreview ? (
            <img src={fotoPreview} alt="Foto de perfil" />
          ) : (
            <div
              className="usuario-perfil-foto-placeholder"
              style={{
                backgroundColor: generarColorAleatorio(perfil.nombre + perfil.apellido),
              }}
            >
              {obtenerIniciales(perfil.nombre, perfil.apellido)}
            </div>
          )}
          {modoEdicion && (
            <label className="usuario-perfil-upload">
              Cambiar foto
              <input type="file" accept="image/*" onChange={handleFotoChange} />
            </label>
          )}
        </div>

        <div className="usuario-perfil-formulario">
          {[
            { label: 'Nombre', name: 'nombre', type: 'text' },
            { label: 'Apellido', name: 'apellido', type: 'text' },
            { label: 'Email', name: 'email', type: 'email' },
            { label: 'Teléfono', name: 'telefono', type: 'text' },
            { label: 'Edad', name: 'edad', type: 'number' },
          ].map((campo) => (
            <div key={campo.name} className="usuario-perfil-campo">
              <label>{campo.label}</label>
              {modoEdicion ? (
                <input
                  type={campo.type}
                  name={campo.name}
                  value={perfil[campo.name] || ''}
                  onChange={handleChange}
                />
              ) : (
                <p>{perfil[campo.name] ?? <em className="usuario-perfil-placeholder">No especificado</em>}</p>
              )}
            </div>
          ))}

          <div className="usuario-perfil-acciones">
            {modoEdicion ? (
              <>
                <button className="btn-guardar" onClick={handleGuardar}>Guardar</button>
                <button className="btn-cancelar" onClick={handleCancelar}>Cancelar</button>
              </>
            ) : (
              <button className="btn-editar2" onClick={() => setModoEdicion(true)}>Editar perfil</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
