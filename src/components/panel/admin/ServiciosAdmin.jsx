// src/components/panel/admin/ServiciosAdmin.jsx - VERSIÓN CORREGIDA
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
  const [cargandoInicial, setCargandoInicial] = useState(true); // 👈 NUEVO
  const serviciosPorPagina = 15;
  const navigate = useNavigate();

  const fetchServicios = async () => {
    try {
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

      if (error) {
        console.error('Error al cargar servicios:', error);
        return;
      }

      const { data: suspensionesData } = await supabase
        .from('suspensiones')
        .select('entidad_id, motivo')
        .eq('entidad', 'servicio');

      const suspendidosIds = suspensionesData?.map(s => s.entidad_id) || [];

      const serviciosMapeados = (serviciosData || []).map(s => {
        const suspension = suspensionesData?.find(x => x.entidad_id === s.id);

        const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
        const horarios = diasSemana.reduce((acc, dia) => {
          const turnosDia = (s.disponibilidades || [])
            .filter(d => d.dia?.toLowerCase() === dia.toLowerCase())
            .map(d => ({ inicio: d.hora_inicio || '', fin: d.hora_fin || '' }));
          if (turnosDia.length) acc[dia] = turnosDia;
          return acc;
        }, {});

        let tipoDisponibilidad = s.disponibilidades?.[0]?.tipo || "horarios";
        let mensaje = s.disponibilidades?.[0]?.mensaje || "";

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
    } catch (error) {
      console.error('Error inesperado:', error);
    } finally {
      setCargandoInicial(false); // 👈 SIEMPRE se ejecuta
    }
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

  // 👇 LÓGICA CORREGIDA
  if (cargandoInicial) {
    return <Loading message="Cargando servicios..." />;
  }

  return (
    <section className="sadmin-servicios">
      <h2 className="sadmin-servicios__titulo">Gestión de Servicios</h2>

      <div className="sadmin-servicios__resumen">
        <div className="sadmin-resumen-card">
          <span className="sadmin-resumen-card__label">Total</span>
          <strong className="sadmin-resumen-card__value">{resumen.total}</strong>
        </div>
        <div className="sadmin-resumen-card sadmin-resumen-card--suspendidos">
          <span className="sadmin-resumen-card__label">Suspendidos</span>
          <strong className="sadmin-resumen-card__value">{resumen.suspendidos}</strong>
        </div>
        <div className="sadmin-resumen-card sadmin-resumen-card--activos">
          <span className="sadmin-resumen-card__label">Activos</span>
          <strong className="sadmin-resumen-card__value">{resumen.activos}</strong>
        </div>
      </div>

      <div className="sadmin-servicios__controles">
        <input
          type="search"
          placeholder="Buscar servicio..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="sadmin-input"
        />
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="sadmin-select"
        >
          <option value="todos">Todos</option>
          <option value="activo">Activo</option>
          <option value="suspendido">Suspendido</option>
        </select>
      </div>

      <div className="sadmin-servicios__lista">
        {serviciosPaginados.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#666'
          }}>
            <span className="material-icons" style={{ fontSize: '80px', opacity: 0.3 }}>
              inbox
            </span>
            <p className="sadmin-sin-resultados">
              {servicios.length === 0 
                ? 'No hay servicios registrados aún.' 
                : 'No se encontraron servicios con esos filtros.'}
            </p>
          </div>
        ) : (
          serviciosPaginados.map(s => (
            <article key={s.id} className="sadmin-card">
              <div className="sadmin-card__info">
                <div className="sadmin-card__header">
                  <h3 className="sadmin-card__nombre">{s.nombre}</h3>
                  <span className={`sadmin-badge sadmin-badge--${s.estado}`}>
                    {s.estado}
                  </span>
                </div>
                <p className="sadmin-card__categoria">
                  <span className="material-icons sadmin-card__icon">category</span>
                  {s.categoria}
                </p>
                {s.estado === 'suspendido' && s.motivoSuspension && (
                  <p className="sadmin-card__motivo">
                    <span className="material-icons sadmin-card__icon">info</span>
                    {s.motivoSuspension}
                  </p>
                )}
                {s.suspendido_por && (
                  <p className="sadmin-card__suspendido-por">
                    Suspendido por: <strong>{s.suspendido_por}</strong>
                  </p>
                )}
              </div>
              <div className="sadmin-card__acciones">
                <button 
                  className="sadmin-btn sadmin-btn--editar" 
                  onClick={() => editarServicio(s.id)}
                  title="Editar"
                >
                  <span className="material-icons">edit</span>
                </button>
                <button 
                  className="sadmin-btn sadmin-btn--eliminar" 
                  onClick={() => eliminarServicio(s.id)}
                  title="Eliminar"
                >
                  <span className="material-icons">delete</span>
                </button>
                {s.estado === 'activo' ? (
                  <button 
                    className="sadmin-btn sadmin-btn--suspender" 
                    onClick={() => suspenderServicio(s.id)}
                    title="Suspender"
                  >
                    <span className="material-icons">block</span>
                  </button>
                ) : (
                  <button 
                    className="sadmin-btn sadmin-btn--habilitar" 
                    onClick={() => habilitarServicio(s.id)}
                    title="Habilitar"
                  >
                    <span className="material-icons">check_circle</span>
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {totalPaginas > 1 && (
        <nav className="sadmin-paginacion">
          {Array.from({ length: totalPaginas }, (_, i) => (
            <button
              key={i}
              className={`sadmin-paginacion__btn ${paginaActual === i + 1 ? 'sadmin-paginacion__btn--activo' : ''}`}
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