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
  const [guardando, setGuardando] = useState(false);

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
    // ✅ Validación de edad mínima
    if (perfil.edad && Number(perfil.edad) < 12) {
      alert('⚠️ La edad mínima permitida es 12 años');
      return;
    }

    setGuardando(true);
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
      alert('✅ Perfil actualizado correctamente');
    } catch (err) {
      console.error('Error al actualizar perfil:', err.message);
      alert('❌ Error al actualizar perfil');
    } finally {
      setGuardando(false);
    }
  };

  const handleCancelar = () => {
    setModoEdicion(false);
    setFotoPreview(perfil.foto_url || '');
    // Restaurar datos originales
    const fetchPerfil = async () => {
      const { data } = await supabase
        .from('perfiles_usuarios')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) setPerfil(data);
    };
    fetchPerfil();
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

  const campos = [
    { 
      label: 'Nombre', 
      name: 'nombre', 
      type: 'text', 
      icon: 'person',
      placeholder: 'Tu nombre'
    },
    { 
      label: 'Apellido', 
      name: 'apellido', 
      type: 'text', 
      icon: 'badge',
      placeholder: 'Tu apellido'
    },
    { 
      label: 'Email', 
      name: 'email', 
      type: 'email', 
      icon: 'email',
      placeholder: 'tu@email.com'
    },
    { 
      label: 'Teléfono', 
      name: 'telefono', 
      type: 'tel', 
      icon: 'phone',
      placeholder: '3777123456'
    },
    { 
      label: 'Edad', 
      name: 'edad', 
      type: 'number', 
      icon: 'cake',
      placeholder: 'Tu edad (mínimo 12 años)',
      min: 12
    },
  ];

  return (
    <div className="goya-perfil-container">
      {/* Header */}
      <div className="goya-perfil-header">
        <div className="goya-perfil-header-info">
          <h2>Mi Perfil</h2>
          <p>Gestiona tu información personal</p>
        </div>
        {!modoEdicion && (
          <button 
            className="goya-perfil-btn-editar-header" 
            onClick={() => setModoEdicion(true)}
          >
            <span className="material-icons">edit</span>
            Editar
          </button>
        )}
      </div>

      <div className="goya-perfil-grid">
        {/* Card Foto de Perfil */}
        <div className="goya-perfil-foto-card">
          <div className="goya-perfil-foto-wrapper">
            {fotoPreview ? (
              <img src={fotoPreview} alt="Foto de perfil" className="goya-perfil-foto" />
            ) : (
              <div
                className="goya-perfil-foto-placeholder"
                style={{
                  backgroundColor: generarColorAleatorio(perfil.nombre + perfil.apellido),
                }}
              >
                {obtenerIniciales(perfil.nombre, perfil.apellido)}
              </div>
            )}
            
            {modoEdicion && (
              <label className="goya-perfil-foto-overlay">
                <span className="material-icons">photo_camera</span>
                <span>Cambiar foto</span>
                <input type="file" accept="image/*" onChange={handleFotoChange} />
              </label>
            )}
          </div>

          <div className="goya-perfil-foto-info">
            <h3>{perfil.nombre} {perfil.apellido}</h3>
            <p className="goya-perfil-foto-email">{perfil.email}</p>
            <div className="goya-perfil-foto-stats">
              <div className="goya-stat-item">
                <span className="material-icons">calendar_today</span>
                <span>Miembro desde {new Date(perfil.creado_en).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Información Personal */}
        <div className="goya-perfil-info-card">
          <div className="goya-perfil-info-header">
            <h3>
              <span className="material-icons">info</span>
              Información Personal
            </h3>
          </div>

          <div className="goya-perfil-form">
            {campos.map((campo) => (
              <div key={campo.name} className="goya-perfil-field">
                <label>
                  <span className="material-icons">{campo.icon}</span>
                  {campo.label}
                </label>
                {modoEdicion ? (
                  <input
                    type={campo.type}
                    name={campo.name}
                    value={perfil[campo.name] || ''}
                    onChange={handleChange}
                    placeholder={campo.placeholder}
                    className="goya-perfil-input"
                    min={campo.min || undefined}
                  />
                ) : (
                  <div className="goya-perfil-value">
                    {perfil[campo.name] || <em className="goya-perfil-empty">No especificado</em>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Botones de acción */}
          {modoEdicion && (
            <div className="goya-perfil-actions">
              <button 
                className="goya-perfil-btn-guardar" 
                onClick={handleGuardar}
                disabled={guardando}
              >
                {guardando ? (
                  <>
                    <span className="goya-spinner"></span>
                    Guardando...
                  </>
                ) : (
                  <>
                    <span className="material-icons">save</span>
                    Guardar cambios
                  </>
                )}
              </button>
              <button 
                className="goya-perfil-btn-cancelar" 
                onClick={handleCancelar}
                disabled={guardando}
              >
                <span className="material-icons">close</span>
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card Seguridad (opcional) */}
      <div className="goya-perfil-security-card">
        <div className="goya-security-header">
          <span className="material-icons">security</span>
          <div>
            <h3>Seguridad de la cuenta</h3>
            <p>Tu cuenta está protegida</p>
          </div>
        </div>
        <div className="goya-security-items">
          <div className="goya-security-item">
            <span className="material-icons">check_circle</span>
            <span>Email verificado</span>
          </div>
          <div className="goya-security-item">
            <span className="material-icons">lock</span>
            <span>Contraseña segura</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Perfil;