// src/components/panel/admin/ServiciosAdmin.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';
import './ServiciosAdmin.css';
import Loading from '../../loading/Loading';

const ServiciosAdmin = () => {
  const [servicios, setServicios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [paginaActual, setPaginaActual] = useState(1);
  const serviciosPorPagina = 15;
  const navigate = useNavigate();

  const fetchServicios = async () => {
    const { data: serviciosData, error } = await supabase
      .from('servicios')
      .select(`
        id,
        nombre,
        estado,
        suspendido_por,
        categoria_id,
        categorias(nombre),
        disponibilidades(
          id,
          tipo,
          mensaje,
          dia,
          turno,
          hora_inicio,
          hora_fin
        )
      `)
      .order('creado_en', { ascending: false });

    if (error) return;

    const { data: suspensionesData } = await supabase
      .from('suspensiones')
      .select('entidad_id, motivo')
      .eq('entidad', 'servicio');

    const suspendidosIds = suspensionesData?.map(s => s.entidad_id) || [];

    const serviciosMapeados = serviciosData.map(s => {
      const suspension = suspensionesData.find(x => x.entidad_id === s.id);

      const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
      const horarios = diasSemana.reduce((acc, dia) => {
        const turnosDia = s.disponibilidades
          .filter(d => d.dia?.toLowerCase() === dia.toLowerCase())
          .map(d => ({ inicio: d.hora_inicio || '', fin: d.hora_fin || '' }));
        if (turnosDia.length) acc[dia] = turnosDia;
        return acc;
      }, {});

      let tipoDisponibilidad = s.disponibilidades[0]?.tipo || "horarios";
      let mensaje = s.disponibilidades[0]?.mensaje || "";

      return {
        ...s,
        categoria: s.categorias?.nombre || 'Sin categoría',
        estado: suspendidosIds.includes(s.id) ? 'suspendido' : s.estado || 'activo',
        motivoSuspension: suspension?.motivo || null,
        formDataParaEditar: {
          tipoDisponibilidad,
          mensaje,
          horarios
        }
      };
    });

    setServicios(serviciosMapeados);
  };

  useEffect(() => {
    fetchServicios();
  }, []);

  const filtrarServicios = () => {
    return servicios.filter(s => {
      const coincideBusqueda = s.nombre.toLowerCase().includes(busqueda.toLowerCase());
      const coincideEstado = filtroEstado === 'todos' || s.estado === filtroEstado;
      return coincideBusqueda && coincideEstado;
    });
  };

  const serviciosFiltrados = filtrarServicios();
  const totalPaginas = Math.ceil(serviciosFiltrados.length / serviciosPorPagina);
  const serviciosPaginados = serviciosFiltrados.slice(
    (paginaActual - 1) * serviciosPorPagina,
    paginaActual * serviciosPorPagina
  );

  const resumen = {
    total: servicios.length,
    suspendidos: servicios.filter(s => s.estado === 'suspendido').length,
    activos: servicios.filter(s => s.estado === 'activo').length,
  };

  const eliminarServicio = async (id) => {
    if (!window.confirm('¿Deseas eliminar este servicio?')) return;

    try {
      const { error } = await supabase
        .from('servicios')
        .delete()
        .eq('id', id);

      if (error) {
        alert(`No se pudo eliminar el servicio: ${error.message}`);
        return;
      }

      await fetchServicios();
      alert('Servicio eliminado con éxito.');
    } catch {
      alert('Error inesperado al intentar eliminar el servicio.');
    }
  };

  const suspenderServicio = async (id) => {
    if (!window.confirm('¿Deseas suspender este servicio?')) return;

    let motivo = prompt(
      'Ingrese el motivo de la suspensión (opcional):',
      'Motivo de suspensión de su servicio fue por incumplimiento de normativas de la web y servicios a la comunidad.'
    );
    if (!motivo)
      motivo = 'Motivo de suspensión de su servicio fue por incumplimiento de normativas de la web y servicios a la comunidad.';

    // 🔹 Actualiza estado y marca quién suspendió
    await supabase
      .from('servicios')
      .update({ estado: 'suspendido', suspendido_por: 'admin' })
      .eq('id', id);

    await supabase
      .from('suspensiones')
      .insert([{ entidad: 'servicio', entidad_id: id, motivo, fecha: new Date().toISOString() }]);

    fetchServicios();
  };

  const habilitarServicio = async (id) => {
    if (!window.confirm('¿Deseas habilitar este servicio?')) return;

    // 🔹 Restaura el estado y borra la marca de suspensión
    await supabase
      .from('servicios')
      .update({ estado: 'activo', suspendido_por: null })
      .eq('id', id);

    await supabase
      .from('suspensiones')
      .delete()
      .eq('entidad', 'servicio')
      .eq('entidad_id', id);

    fetchServicios();
  };

  const editarServicio = (id) => {
    navigate(`/panel/admin/publicar/${id}`);
  };
if (!servicios.length && busqueda === '') {
    return <Loading message="Cargando servicios..." />;
  }
  return (
    <section className="sa-servicios-admin">
      <h2>Gestión de Servicios</h2>

      <div className="sa-servicios-admin__resumen">
        <div className="sa-resumen-card">Total:<br /><strong>{resumen.total}</strong></div>
        <div className="sa-resumen-card">Suspendidos:<br /><strong>{resumen.suspendidos}</strong></div>
        <div className="sa-resumen-card">Activos:<br /><strong>{resumen.activos}</strong></div>
      </div>

      <div className="sa-servicios-admin__controles">
        <input
          type="search"
          placeholder="Buscar por título..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="sa-input"
        />
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="sa-select"
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="suspendido">Suspendido</option>
        </select>
      </div>

      <div className="sa-servicios-admin__lista">
        {serviciosPaginados.length === 0 ? (
          <p>No se encontraron servicios.</p>
        ) : (
          serviciosPaginados.map(s => (
            <article key={s.id} className="sa-servicio-card">
              <div className="sa-detalle-servicio">
                <strong>{s.nombre}</strong>{' '}
                <span className={`sa-estado sa-estado--${s.estado}`}>({s.estado})</span>
                <p>Categoría: {s.categoria}</p>
                {s.estado === 'suspendido' && s.motivoSuspension && (
                  <p className="sa-motivo">Motivo: {s.motivoSuspension}</p>
                )}
                {s.suspendido_por && (
                  <p className="sa-motivo"><em>Suspensión por: {s.suspendido_por}</em></p>
                )}
              </div>
              <div className="sa-acciones">
                <button className="sa-btn-editar" onClick={() => editarServicio(s.id)}>Editar</button>
                <button className="sa-btn-eliminar" onClick={() => eliminarServicio(s.id)}>Eliminar</button>
                {s.estado === 'activo' ? (
                  <button className="sa-btn-suspender" onClick={() => suspenderServicio(s.id)}>Suspender</button>
                ) : (
                  <button className="sa-btn-habilitar" onClick={() => habilitarServicio(s.id)}>Habilitar</button>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {totalPaginas > 1 && (
        <nav className="sa-servicios-admin__paginacion">
          {Array.from({ length: totalPaginas }, (_, i) => (
            <button
              key={i}
              className={`sa-btn-paginacion ${paginaActual === i + 1 ? 'sa-activo' : ''}`}
              onClick={() => setPaginaActual(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </nav>
      )}
    </section>
  );
};

export default ServiciosAdmin;
