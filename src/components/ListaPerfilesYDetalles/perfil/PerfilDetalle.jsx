import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient';

import NavbarPerfil from '../NavbarPerfil';
import ResumenPerfil from './ResumenPerfil';
import SobrePerfil from './SobrePerfil';
import DisponibilidadPerfil from './DisponibilidadPerfilRobusto';
import GaleriaTrabajos from './GaleriaTrabajos';
import OpinionesSection from './OpinionesSection';

import './PerfilDetalle.css';

const PerfilDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerfil = async () => {
      setLoading(true);

      try {
        const [
          { data: perfilData, error: perfilError },
          { data: imagenesData, error: imagenesError },
          { data: disponibilidadData, error: disponibilidadError },
          { data: opinionesData, error: opinionesError }
        ] = await Promise.all([
          supabase.from('servicios')
            .select(`
              *,
              usuario:perfiles_usuarios (
                id,
                nombre,
                apellido,
                foto_url,
                email,
                telefono
              ),
              categoria:categorias ( nombre )
            `)
            .eq('id', id)
            .single(),
          supabase.from('imagenes_servicio')
            .select('url, orden')
            .eq('servicio_id', id)
            .order('orden', { ascending: true }),
          supabase.from('disponibilidades')
            .select('*')
            .eq('servicio_id', id)
            .order('dia', { ascending: true })
            .order('hora_inicio', { ascending: true }),
          supabase.from('opiniones')
            .select('*')
            .eq('servicio_id', id)
            .order('fecha', { ascending: false })
        ]);

        if (perfilError || imagenesError || disponibilidadError || opinionesError) {
          throw perfilError || imagenesError || disponibilidadError || opinionesError;
        }

        const opiniones = (opinionesData || []).map(o => ({
          nombre: o.nombre_completo,
          texto: o.comentario,
          rating: o.puntuacion,
          fecha: o.fecha
        }));

        const perfilSeteado = {
          ...perfilData,
          imagenes: imagenesData?.map(img => img.url) || [],
          disponibilidad: disponibilidadData || [],
          opiniones
        };

        setPerfil(perfilSeteado);

      } catch (error) {
        setPerfil(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchPerfil();
  }, [id]);

  if (loading) {
  return (
    <>
      <NavbarPerfil />
      <div className="detalle-container" style={{ marginTop: '80px' }}>
        <div className="perfil-loader-container">
          <div className="perfil-loader">
            <div className="perfil-loader-ring"></div>
            <div className="perfil-loader-ring"></div>
            <div className="perfil-loader-ring"></div>
            <div className="perfil-loader-pulse"></div>
          </div>
          <p className="perfil-loader-text">Cargando perfil...</p>
        </div>
      </div>
    </>
  );
}

  if (!perfil) {
  const handleVolverClick = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <NavbarPerfil />
      <div className="detalle-container" style={{ textAlign: 'center', padding: '2rem', marginTop: '80px' }}>
        <h2>⚠️ Perfil no encontrado</h2>
        <button onClick={handleVolverClick} className="back-buttonn">
          ← Volver
        </button>
      </div>
    </>
  );
}


  const manejarVerTodasOpiniones = () => {
    navigate(`/perfil/${id}/opiniones`);
  };

  const handleVerEnMapa = () => {
    navigate('/explorar', {
      state: { perfilId: perfil.id, latitud: perfil.latitud, longitud: perfil.longitud }
    });
  };

  return (
    <>
      <NavbarPerfil />
      <div className="detalle-container" style={{ marginTop: '80px' }}>
        <ResumenPerfil perfil={perfil} />

        <SobrePerfil
          perfil={perfil}
          onVerEnMapa={handleVerEnMapa}
        />

        <DisponibilidadPerfil perfil={perfil} />

        {perfil.imagenes.length > 0 && (
          <GaleriaTrabajos imagenes={perfil.imagenes} />
        )}

        <OpinionesSection
          opiniones={perfil.opiniones || []}
          servicioPropietarioId={perfil.usuario?.id}
          onVerTodas={manejarVerTodasOpiniones}
        />
      </div>
    </>
  );
};

export default PerfilDetalle;