import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../../utils/supabaseClient';
import { FaStar } from 'react-icons/fa';
import { AuthContext } from '../../../../auth/AuthContext';
import './OpinionesCompletas.css';
import Loading from '../../../loading/Loading';

const OpinionesCompletas = () => {
  const { perfilId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const usuarioLogueadoId = user?.id;

  const [opiniones, setOpiniones] = useState([]);
  const [expandida, setExpandida] = useState({});
  const [paginaActual, setPaginaActual] = useState(1);
  const [cargando, setCargando] = useState(true);

  const comentariosPorPagina = 6;

  useEffect(() => {
    const fetchOpiniones = async () => {
      setCargando(true);
      try {
        const { data = [], error } = await supabase
          .from('opiniones')
          .select('*, usuario:perfiles_usuarios(id, nombre, apellido)')
          .eq('servicio_id', perfilId)
          .order('puntuacion', { ascending: false })
          .order('fecha', { ascending: false });

        if (error) throw error;
        setOpiniones(data);
      } catch {
        setOpiniones([]);
      } finally {
        setCargando(false);
      }
    };

    if (perfilId) fetchOpiniones();
  }, [perfilId]);

  // PAGINACIÓN
  const totalPaginas = Math.ceil(opiniones.length / comentariosPorPagina);
  const comentariosPaginados = opiniones.slice(
    (paginaActual - 1) * comentariosPorPagina,
    paginaActual * comentariosPorPagina
  );

  const handlePaginaSiguiente = () => {
    if (paginaActual < totalPaginas) setPaginaActual((prev) => prev + 1);
  };

  const handlePaginaAnterior = () => {
    if (paginaActual > 1) setPaginaActual((prev) => prev - 1);
  };

  const toggleExpandir = (index) => {
    setExpandida((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const eliminarComentario = async (opinionId) => {
    if (!window.confirm('¿Querés eliminar tu comentario? Esta acción no se puede deshacer.')) return;
    const { error } = await supabase
      .from('opiniones')
      .delete()
      .eq('id', opinionId)
      .eq('usuario_id', usuarioLogueadoId);

    if (!error) {
      setOpiniones(prev => prev.filter(op => op.id !== opinionId));
    } else {
      alert('No se pudo eliminar el comentario.');
    }
  };

  if (cargando) {
  return <Loading message="Cargando opiniones..." />;
}

  // RETURN COMPLETO de OpinionesCompletas.jsx con clases únicas

return (
  <div className="opiniones-completas-wrapper-main">
    <div className="opiniones-completas-encabezado">
      <h2>Todas las Opiniones</h2>
      <button
        className="opiniones-completas-btn-volver"
        onClick={() => navigate(-1)}
      >
        ← Volver
      </button>
    </div>

    {opiniones.length === 0 ? (
      <p className="opiniones-completas-sin-mensaje">⚠️ No hay opiniones todavía.</p>
    ) : (
      <ul className="opiniones-completas-lista">
        {comentariosPaginados.map((op, i) => {
          const texto = op?.comentario || '';
          const esLargo = texto.length > 200;
          const mostrarCompleto = expandida[i];
          const nombreCompleto = op?.usuario ? `${op.usuario.nombre} ${op.usuario.apellido || ''}` : op?.nombre_completo || 'Anónimo';
          const esMiComentario = op.usuario_id === usuarioLogueadoId;

          return (
            <li key={op.id || i} className="opinion-completa-card">
              <div className="opinion-completa-header">
                <span className="opinion-completa-nombre-usuario">{nombreCompleto}</span>
                <div className="opinion-completa-estrellas">
                  {[...Array(5)].map((_, idx) => (
                    <FaStar
                      key={idx}
                      size={14}
                      color={idx < (op?.puntuacion || 0) ? '#f5a623' : '#ddd'}
                    />
                  ))}
                </div>
              </div>

              <p className={`opinion-completa-texto ${mostrarCompleto ? 'expandida' : ''}`}>
                {mostrarCompleto || !esLargo ? texto : `${texto.slice(0, 200)}...`}
              </p>

              {esLargo && (
                <button
                  className="opinion-completa-btn-ver-mas"
                  onClick={() => toggleExpandir(i)}
                  type="button"
                >
                  {mostrarCompleto ? 'Ver menos' : 'Ver más'}
                </button>
              )}

              <div className="opinion-completa-footer">
                <span className="opinion-completa-fecha">
                  {op?.fecha ? new Date(op.fecha).toLocaleDateString('es-AR') : 'Sin fecha'}
                </span>

                {esMiComentario && (
                  <button
                    className="opinion-completa-btn-eliminar"
                    onClick={() => eliminarComentario(op.id)}
                    type="button"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    )}

    {totalPaginas > 1 && (
      <div className="opiniones-completas-paginacion">
        <button
          onClick={handlePaginaAnterior}
          disabled={paginaActual === 1}
          className="opiniones-completas-btn-paginacion"
          type="button"
        >
          Anterior
        </button>
        <span className="opiniones-completas-pagina-actual">
          {`Página ${paginaActual} de ${totalPaginas}`}
        </span>
        <button
          onClick={handlePaginaSiguiente}
          disabled={paginaActual === totalPaginas}
          className="opiniones-completas-btn-paginacion"
          type="button"
        >
          Siguiente
        </button>
      </div>
    )}
  </div>
);
};

export default OpinionesCompletas;
