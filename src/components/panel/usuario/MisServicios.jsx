import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient';
import Loading from '../../loading/Loading'; // 👈 IMPORTAR
import './MisServicios.css';

const MisServicios = () => {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchServicios = async () => {
      setLoading(true);
      const user = (await supabase.auth.getUser()).data.user;

      const { data, error } = await supabase
        .from('servicios')
        .select(`
          id,
          nombre,
          descripcion,
          direccion_escrita,
          categoria_id,
          creado_en,
          estado,
          suspendido_por,
          categorias (nombre)
        `)
        .eq('usuario_id', user.id)
        .order('creado_en', { ascending: false });

      if (error) {
        console.error("Error cargando servicios:", error.message);
      } else {
        setServicios(data);
      }
      setLoading(false);
    };

    fetchServicios();
  }, []);

  const handleEliminar = async (id) => {
    const confirmado = window.confirm('¿Querés eliminar este servicio definitivamente?');
    if (confirmado) {
      const { error } = await supabase.from('servicios').delete().eq('id', id);
      if (error) {
        alert("Error al eliminar: " + error.message);
      } else {
        setServicios((prev) => prev.filter((s) => s.id !== id));
      }
    }
  };

  const handleSuspender = async (id, estadoActual, suspendidoPor) => {
    if (estadoActual === 'suspendido' && suspendidoPor === 'admin') {
      alert("Este servicio fue suspendido por un administrador. No podés reactivarlo.");
      return;
    }

    const nuevoEstado = estadoActual === 'suspendido' ? 'activo' : 'suspendido';
    const nuevoSuspendidoPor = nuevoEstado === 'suspendido' ? 'usuario' : null;

    const { error } = await supabase
      .from('servicios')
      .update({ estado: nuevoEstado, suspendido_por: nuevoSuspendidoPor })
      .eq('id', id);

    if (error) {
      alert("Error al suspender: " + error.message);
    } else {
      setServicios((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, estado: nuevoEstado, suspendido_por: nuevoSuspendidoPor }
            : s
        )
      );
    }
  };

  // 👇 REEMPLAZAR ESTE BLOQUE
  if (loading) {
    return <Loading message="Cargando tus servicios..." />;
  }

  if (servicios.length === 0) {
    return (
      <div className="usuario-misservicios-vacio">
        <p>No tenés servicios publicados todavía.</p>
        <button
          className="usuario-btn-publicar"
          onClick={() => navigate('/publicar', { state: { desde: 'panel' } })}
        >
          + Publicar nuevo servicio
        </button>
      </div>
    );
  }

  return (
    <div className="usuario-misservicios-container">
      <div className="usuario-misservicios-header">
        <h2>Mis Servicios</h2>
        <button
          className="usuario-btn-publicar"
          onClick={() => navigate('/publicar', { state: { desde: 'panel' } })}
        >
          + Publicar Servicio
        </button>
      </div>

      <div className="usuario-misservicios-grid">
        {servicios.map((servicio) => (
          <div key={servicio.id} className="usuario-servicio-item">
            <h3>{servicio.nombre}</h3>
            <p><strong>Categoría:</strong> {servicio.categorias?.nombre || "Sin categoría"}</p>
            <p>{servicio.descripcion}</p>
            <p><strong>Ubicación:</strong> {servicio.direccion_escrita}</p>
            <p><strong>Estado:</strong> {servicio.estado || "activo"}</p>
            {servicio.suspendido_por === 'admin' && (
              <p className="usuario-servicio-suspendido-admin">
                🔒 Suspendido por el administrador
              </p>
            )}
            <p><small>Creado: {new Date(servicio.creado_en).toLocaleDateString()}</small></p>

            <div className="usuario-servicio-acciones">
              <Link to={`/panel/editar-servicio/${servicio.id}`} className="usuario-btn-editar">
                Editar
              </Link>
              <button
                className="usuario-btn-suspender"
                onClick={() =>
                  handleSuspender(servicio.id, servicio.estado, servicio.suspendido_por)
                }
                disabled={
                  servicio.suspendido_por === 'admin' ||
                  servicio.estado === 'suspendido_por_admin'
                }
              >
                {servicio.suspendido_por === 'admin' ||
                servicio.estado === 'suspendido_por_admin'
                  ? 'Suspendido por admin'
                  : servicio.estado === 'suspendido'
                  ? 'Reactivar'
                  : 'Suspender'}
              </button>

              <button
                className="usuario-btn-eliminar"
                onClick={() => handleEliminar(servicio.id)}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MisServicios;