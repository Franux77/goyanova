import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient';
import Loading from '../../loading/Loading';
import './MisServicios.css';

const MisServicios = () => {
  const [servicios, setServicios] = useState([]);
  const [serviciosFiltrados, setServiciosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandidos, setExpandidos] = useState({});
  const [busqueda, setBusqueda] = useState('');
  const navigate = useNavigate();

  // 👇 AGREGAR ESTA FUNCIÓN COMPLETA AQUÍ
const handleIrAPublicar = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert('Debes iniciar sesión para publicar');
      return;
    }

    const { data, error } = await supabase
      .rpc('puede_publicar_servicio', {
        p_usuario_id: user.id
      });

    if (error) throw error;

    if (data.puede_publicar) {
      // ✅ Puede publicar -> ir al formulario
      navigate('/panel/publicar');
    } else {
      // ❌ No puede publicar -> ir a membresía
      navigate('/panel/mi-membresia');
    }
  } catch (error) {
    console.error('Error al verificar límite:', error);
    alert('Error al verificar límites. Intenta nuevamente.');
  }
};

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
        setServiciosFiltrados(data);
      }
      setLoading(false);
    };

    fetchServicios();
  }, []);

  // Filtrar servicios en tiempo real
  useEffect(() => {
    if (!busqueda.trim()) {
      setServiciosFiltrados(servicios);
      return;
    }

    const terminoBusqueda = busqueda.toLowerCase().trim();
    
    const resultados = servicios.filter((servicio) => {
      const nombre = servicio.nombre?.toLowerCase() || '';
      const descripcion = servicio.descripcion?.toLowerCase() || '';
      const categoria = servicio.categorias?.nombre?.toLowerCase() || '';
      const direccion = servicio.direccion_escrita?.toLowerCase() || '';
      
      return (
        nombre.includes(terminoBusqueda) ||
        descripcion.includes(terminoBusqueda) ||
        categoria.includes(terminoBusqueda) ||
        direccion.includes(terminoBusqueda)
      );
    });

    setServiciosFiltrados(resultados);
  }, [busqueda, servicios]);

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

  const toggleExpandir = (id) => {
    setExpandidos(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const truncarTexto = (texto, limite = 100) => {
    if (!texto || texto.length <= limite) return texto;
    return texto.substring(0, limite) + '...';
  };

  const limpiarBusqueda = () => {
    setBusqueda('');
  };

  if (loading) {
    return <Loading message="Cargando tus servicios..." />;
  }

  if (servicios.length === 0) {
    return (
      <div className="goya-servicios-vacio">
        <div className="goya-vacio-icono">
          <span className="material-icons">inventory_2</span>
        </div>
        <h3>No tenés servicios publicados</h3>
        <p>Empezá a publicar tus servicios y llegá a más clientes</p>
<button
  className="goya-btn-publicar-vacio"
  onClick={handleIrAPublicar}
>
  <span className="material-icons">add_circle</span>
  Publicar mi primer servicio
</button>
      </div>
    );
  }

  return (
    <div className="goya-servicios-container">
      {/* Header con contador */}
      <div className="goya-servicios-header">
        <div className="goya-header-info">
          <h2>Mis Servicios</h2>
          <span className="goya-contador-badge">{servicios.length}</span>
        </div>
<button
  className="goya-btn-nuevo"
  onClick={handleIrAPublicar}
>
  <span className="material-icons">add</span>
  Nuevo
</button>
      </div>

      {/* Buscador */}
      <div className="goya-buscador-container">
        <div className="goya-buscador-input-wrapper">
          <span className="material-icons goya-buscador-icono">search</span>
          <input
            type="text"
            className="goya-buscador-input"
            placeholder="Buscar por nombre, descripción, categoría o ubicación..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button 
              className="goya-buscador-limpiar"
              onClick={limpiarBusqueda}
              title="Limpiar búsqueda"
            >
              <span className="material-icons">close</span>
            </button>
          )}
        </div>
        
        {busqueda && (
          <div className="goya-buscador-resultados">
            <span className="material-icons">info</span>
            <span>
              {serviciosFiltrados.length === 0 
                ? 'No se encontraron servicios' 
                : `${serviciosFiltrados.length} ${serviciosFiltrados.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}`
              }
            </span>
          </div>
        )}
      </div>

      {/* Lista de servicios */}
      {serviciosFiltrados.length === 0 ? (
        <div className="goya-sin-resultados">
          <span className="material-icons">search_off</span>
          <h3>No se encontraron servicios</h3>
          <p>Intentá con otros términos de búsqueda</p>
          <button 
            className="goya-btn-limpiar-busqueda"
            onClick={limpiarBusqueda}
          >
            Limpiar búsqueda
          </button>
        </div>
      ) : (
        <div className="goya-servicios-lista">
          {serviciosFiltrados.map((servicio) => {
            const descripcionCompleta = servicio.descripcion || '';
            const esLargo = descripcionCompleta.length > 100;
            const mostrarCompleto = expandidos[servicio.id];

            return (
              <div key={servicio.id} className="goya-servicio-card">
                {/* Badge de estado */}
                <div className="goya-card-badges">
                  {servicio.estado === 'suspendido' && (
                    <span className={`goya-badge ${servicio.suspendido_por === 'admin' ? 'goya-badge-admin' : 'goya-badge-suspendido'}`}>
                      <span className="material-icons">pause_circle</span>
                      {servicio.suspendido_por === 'admin' ? 'Suspendido por Admin' : 'Suspendido'}
                    </span>
                  )}
                  {servicio.estado === 'activo' && (
                    <span className="goya-badge goya-badge-activo">
                      <span className="material-icons">check_circle</span>
                      Activo
                    </span>
                  )}
                </div>

                {/* Contenido principal */}
                <div className="goya-card-contentt">
                  <div className="goya-card-main">
                    <h3 className="goya-card-titulo">{servicio.nombre}</h3>
                    
                    <div className="goya-card-meta">
                      <div className="goya-meta-item">
                        <span className="material-icons">category</span>
                        <span>{servicio.categorias?.nombre || "Sin categoría"}</span>
                      </div>
                      <div className="goya-meta-item">
                        <span className="material-icons">location_on</span>
                        <span>{servicio.direccion_escrita}</span>
                      </div>
                      <div className="goya-meta-item">
                        <span className="material-icons">calendar_today</span>
                        <span>{new Date(servicio.creado_en).toLocaleDateString('es-AR')}</span>
                      </div>
                    </div>

                    {descripcionCompleta && (
                      <div className="goya-card-descripcion">
                        <p>
                          {mostrarCompleto ? descripcionCompleta : truncarTexto(descripcionCompleta, 100)}
                        </p>
                        {esLargo && (
                          <button
                            className="goya-btn-ver-mas"
                            onClick={() => toggleExpandir(servicio.id)}
                          >
                            {mostrarCompleto ? 'Ver menos' : 'Ver más'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="goya-card-acciones">
                    <Link 
                      to={`/panel/editar-servicio/${servicio.id}`} 
                      className="goya-btn-accion goya-btn-editar"
                      title="Editar servicio"
                    >
                      <span className="material-icons">edit</span>
                      <span className="goya-btn-text">Editar</span>
                    </Link>

                    <button
                      className={`goya-btn-accion ${servicio.estado === 'suspendido' ? 'goya-btn-reactivar' : 'goya-btn-suspender'}`}
                      onClick={() => handleSuspender(servicio.id, servicio.estado, servicio.suspendido_por)}
                      disabled={servicio.suspendido_por === 'admin'}
                      title={servicio.suspendido_por === 'admin' ? 'Bloqueado por admin' : (servicio.estado === 'suspendido' ? 'Reactivar' : 'Suspender')}
                    >
                      <span className="material-icons">
                        {servicio.estado === 'suspendido' ? 'play_circle' : 'pause_circle'}
                      </span>
                      <span className="goya-btn-text">
                        {servicio.estado === 'suspendido' ? 'Reactivar' : 'Pausar'}
                      </span>
                    </button>

                    <button
                      className="goya-btn-accion goya-btn-eliminar"
                      onClick={() => handleEliminar(servicio.id)}
                      title="Eliminar servicio"
                    >
                      <span className="material-icons">delete</span>
                      <span className="goya-btn-text">Eliminar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MisServicios;