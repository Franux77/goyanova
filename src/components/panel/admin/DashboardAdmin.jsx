import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import Loading from '../../loading/Loading';
import './DashboardAdmin.css';

const ACCESOS = [
  { key: 'novedades', icon: 'newspaper', label: 'Novedades', url: '/panel/admin/novedades' },
  { key: 'verificaciones', icon: 'verified', label: 'Verificaciones', url: '/panel/admin/verificaciones' },
  { key: 'codigos', icon: 'local_offer', label: 'Códigos Promocionales', url: '/panel/admin/codigos' },
  { key: 'membresias', icon: 'card_membership', label: 'Membresías', url: '/panel/admin/membresias' },
  { key: 'usuarios', icon: 'group', label: 'Usuarios', url: '/panel/admin/usuarios' },
  { key: 'servicios', icon: 'work', label: 'Servicios', url: '/panel/admin/servicios' },
  { key: 'suspensiones', icon: 'gavel', label: 'Sanciones', url: '/panel/admin/suspensiones' }
];

const DashboardAdmin = () => {
  const [filtro, setFiltro] = useState('mes');
  const [stats, setStats] = useState({
    totalUsuarios: 0,
    totalServicios: 0,
    serviciosActivos: 0,
    totalOpiniones: 0,
    promedioRating: 0,
    usuariosPremium: 0,
    ingresoTotal: 0,
    verificacionesPendientes: 0,
    suspensionesTotales: 0,
    usuariosNuevos: 0,
    serviciosNuevos: 0,
    pagosCompletados: 0
  });

  const [distribPlanes, setDistribPlanes] = useState({
    free: 0,
    impulso: 0,
    destacado: 0,
    elite: 0
  });

  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('visión');
  const [accesoSeleccionado, setAccesoSeleccionado] = useState(null);
  const [novedadesHoy, setNovedadesHoy] = useState(null);

  useEffect(() => {
    const ahora = new Date();
    const ar = new Date(ahora.getTime() - 3 * 3600000);
    const inicio = new Date(Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth(), ar.getUTCDate(), 3));
    supabase
      .rpc('admin_novedades', { p_desde: inicio.toISOString(), p_hasta: ahora.toISOString() })
      .then(({ data, error }) => { if (!error && data) setNovedadesHoy(Number(data.total) || 0); }, () => {});
  }, []);

    const [nombreAdmin, setNombreAdmin] = useState('');

  const obtenerSaludo = () => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return { texto: 'Buenos días', icono: 'wb_sunny' };
    if (hora >= 12 && hora < 19) return { texto: 'Buenas tardes', icono: 'wb_twilight' };
    return { texto: 'Buenas noches', icono: 'nights_stay' };
  };

  const saludo = obtenerSaludo();

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  const getFechaRango = () => {
    const ahora = new Date();
    const inicio = new Date();

    switch (filtro) {
      case 'dia':
        inicio.setHours(0, 0, 0, 0);
        break;
      case 'semana': {
        const dia = ahora.getDay();
        inicio.setDate(ahora.getDate() - dia);
        inicio.setHours(0, 0, 0, 0);
        break;
      }
      case 'mes':
        inicio.setDate(1);
        inicio.setHours(0, 0, 0, 0);
        break;
      case 'año':
        inicio.setMonth(0);
        inicio.setDate(1);
        inicio.setHours(0, 0, 0, 0);
        break;
      default:
        break;
    }

    return { inicio: inicio.toISOString() };
  };

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { inicio } = getFechaRango();

            const { data: perfilAdmin } = await supabase
        .from('perfiles_usuarios')
        .select('nombre')
        .eq('id', user.id)
        .single();
      setNombreAdmin(perfilAdmin?.nombre || 'Admin');

      // 👤 Usuarios
      const { data: usuarios } = await supabase
        .from('perfiles_usuarios')
        .select('id, creado_en');

      const usuariosNuevos = usuarios?.filter(u =>
        new Date(u.creado_en) >= new Date(inicio)
      ).length || 0;

      // 📊 Servicios
      const { data: servicios } = await supabase
        .from('servicios')
        .select('id, estado, creado_en');

      const serviciosActivos = servicios?.filter(s => s.estado === 'activo').length || 0;
      const serviciosNuevos = servicios?.filter(s =>
        new Date(s.creado_en) >= new Date(inicio)
      ).length || 0;

      // ⭐ Opiniones (columna correcta: fecha, no creada_en)
      const { data: opiniones } = await supabase
        .from('opiniones')
        .select('puntuacion, fecha');

      const totalOpiniones = opiniones?.length || 0;
      const sumaRatings = opiniones?.reduce((sum, op) => sum + (op.puntuacion || 0), 0) || 0;
      const promedio = totalOpiniones > 0 ? (sumaRatings / totalOpiniones).toFixed(2) : 0;

      // 💎 Membresías activas (columna correcta: estado, no activa)
      const { data: membresiasActivas } = await supabase
        .from('membresias')
        .select('id, plan_id')
        .eq('estado', 'activa');

      const usuariosPremium = membresiasActivas?.length || 0;

      // 💰 Pagos (columnas correctas: monto, created_at)
      const { data: pagos } = await supabase
        .from('pagos_mp')
        .select('monto, created_at')
        .eq('estado', 'completado');

      const pagosFiltrados = pagos?.filter(p =>
        new Date(p.created_at) >= new Date(inicio)
      ) || [];

      const pagosCompletados = pagosFiltrados.length;
      const ingresoTotal = pagosFiltrados.reduce((sum, p) => sum + (Number(p.monto) || 0), 0).toFixed(2);

      // ✅ Verificaciones pendientes
      const { count: verifPendientes } = await supabase
        .from('solicitudes_verificacion')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente_admin');

      // ⛔ Suspensiones totales
      const { count: suspTotal } = await supabase
        .from('suspensiones')
        .select('*', { count: 'exact', head: true })
        .eq('activa', true);

      // 📈 Distribución de planes (columna correcta: estado)
      const { data: todasMembresias } = await supabase
        .from('membresias')
        .select('plan_id')
        .eq('estado', 'activa');

      const distribucion = { free: 0, impulso: 0, destacado: 0, elite: 0 };
      todasMembresias?.forEach(m => {
        if (m.plan_id === 1) distribucion.free++;
        else if (m.plan_id === 2) distribucion.impulso++;
        else if (m.plan_id === 3) distribucion.destacado++;
        else if (m.plan_id === 4) distribucion.elite++;
      });

      setStats({
        totalUsuarios: usuarios?.length || 0,
        totalServicios: servicios?.length || 0,
        serviciosActivos,
        totalOpiniones,
        promedioRating: promedio,
        usuariosPremium,
        ingresoTotal,
        verificacionesPendientes: verifPendientes || 0,
        suspensionesTotales: suspTotal || 0,
        usuariosNuevos,
        serviciosNuevos,
        pagosCompletados
      });

      setDistribPlanes(distribucion);

      // 🔔 Notificaciones
      const { data: notifs } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('usuario_id', user.id)
        .order('creada_en', { ascending: false })
        .limit(5);

      setNotificaciones(notifs || []);

    } catch (err) {
      console.error('Error al cargar dashboard admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHoras < 24) return `${diffHoras}h`;
    if (diffDias < 7) return `${diffDias}d`;
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  };

  const toggleAcceso = (key) => {
    setAccesoSeleccionado(prev => (prev === key ? null : key));
  };

  if (loading) {
    return <Loading message="Cargando panel..." />;
  }

  const totalPlanes = Object.values(distribPlanes).reduce((a, b) => a + b, 0) || 1;
  const accesoActivo = ACCESOS.find(a => a.key === accesoSeleccionado);

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-saludo">
          <span className="material-icons admin-saludo-icon">{saludo.icono}</span>
          <h1>
            <span className="admin-saludo-texto">{saludo.texto},</span>{' '}
            <span className="admin-saludo-nombre">{nombreAdmin}</span>
          </h1>
        </div>
        <p>Panel de Control · Gestión de GoyaNova</p>
      </div>

      {/* FILTROS DE FECHA */}
      <div className="admin-filtros">
        {['dia', 'semana', 'mes', 'año'].map(f => (
          <button
            key={f}
            className={`filtro-btn ${filtro === f ? 'activo' : ''}`}
            onClick={() => setFiltro(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* TABS */}
      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'visión' ? 'active' : ''}`}
          onClick={() => setActiveTab('visión')}
        >
          <span className="material-icons">dashboard</span>
          Visión
        </button>
        <button
          className={`tab-btn ${activeTab === 'planes' ? 'active' : ''}`}
          onClick={() => setActiveTab('planes')}
        >
          <span className="material-icons">pie_chart</span>
          Planes
        </button>
        <button
          className={`tab-btn ${activeTab === 'alertas' ? 'active' : ''}`}
          onClick={() => setActiveTab('alertas')}
        >
          <span className="material-icons">warning</span>
          Alertas
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'visión' && (
        <div className="tab-content">
          <a href="/panel/admin/novedades" style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: 12, padding: '10px 14px', marginBottom: 12, textDecoration: 'none', fontWeight: 600 }}>
            <span className="material-icons">newspaper</span>
            <span style={{ flex: 1 }}>Novedades de hoy{novedadesHoy !== null ? `: ${novedadesHoy}` : ''}</span>
            <span className="material-icons">chevron_right</span>
          </a>
          {/* STATS GRID COMPACTO */}
          <div className="admin-stats-compact">
            <div className="stat-mini">
              <span className="material-icons">people</span>
              <div>
                <p>Usuarios</p>
                <h4>{stats.totalUsuarios}</h4>
                <span className="stat-mini-detail">+{stats.usuariosNuevos} nuevo</span>
              </div>
            </div>

            <div className="stat-mini">
              <span className="material-icons">inventory_2</span>
              <div>
                <p>Servicios</p>
                <h4>{stats.serviciosActivos}</h4>
                <span className="stat-mini-detail">+{stats.serviciosNuevos} nuevo</span>
              </div>
            </div>

            <div className="stat-mini">
              <span className="material-icons">diamond</span>
              <div>
                <p>Premium</p>
                <h4>{stats.usuariosPremium}</h4>
                <span className="stat-mini-detail">{((stats.usuariosPremium / stats.totalUsuarios) * 100 || 0).toFixed(0)}%</span>
              </div>
            </div>

            <div className="stat-mini">
              <span className="material-icons">trending_up</span>
              <div>
                <p>Ingresos</p>
                <h4>${stats.ingresoTotal}</h4>
                <span className="stat-mini-detail">{stats.pagosCompletados} pagos</span>
              </div>
            </div>

            <div className="stat-mini">
              <span className="material-icons">star_rate</span>
              <div>
                <p>Rating</p>
                <h4>{stats.promedioRating}</h4>
                <span className="stat-mini-detail">{stats.totalOpiniones} opiniones</span>
              </div>
            </div>

            <div className="stat-mini">
              <span className="material-icons">verified</span>
              <div>
                <p>Verificar</p>
                <h4>{stats.verificacionesPendientes}</h4>
                <span className="stat-mini-detail">pendientes</span>
              </div>
            </div>
          </div>

          {/* ACCESOS RÁPIDOS con panel expandible */}
          <div className="admin-shortcuts">
            <h3>Accesos Rápidos</h3>
            <div className="shortcuts-mini-grid">
              {ACCESOS.map(a => (
                <button
                  key={a.key}
                  className={`shortcut-mini ${accesoSeleccionado === a.key ? 'seleccionado' : ''}`}
                  onClick={() => toggleAcceso(a.key)}
                >
                  <span className="material-icons">{a.icon}</span>
                </button>
              ))}
            </div>

            <div className={`shortcut-expand ${accesoActivo ? 'abierto' : ''}`}>
              {accesoActivo && (
                <a href={accesoActivo.url} className="shortcut-expand-link">
                  <span className="material-icons">{accesoActivo.icon}</span>
                  <span className="shortcut-expand-text">Entrar a {accesoActivo.label}</span>
                  <span className="material-icons shortcut-expand-arrow">arrow_forward</span>
                </a>
              )}
            </div>
          </div>

          {/* NOTIFICACIONES */}
          <div className="admin-notif-compact">
            <h3>Últimas</h3>
            {notificaciones.length === 0 ? (
              <p className="notif-empty-text">Sin notificaciones</p>
            ) : (
              <div className="notif-list-compact">
                {notificaciones.map((notif) => (
                  <div key={notif.id} className="notif-item-compact">
                    <span className="material-icons">
                      {notif.tipo === 'advertencia' ? 'warning' : 'info'}
                    </span>
                    <div>
                      <p>{notif.titulo}</p>
                      <span>{formatearFecha(notif.creada_en)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'planes' && (
        <div className="tab-content">
          <div className="distrib-compact">
            {Object.entries(distribPlanes).map(([plan, count]) => {
              const colores = {
                free: '#6B7280',
                impulso: '#3B82F6',
                destacado: '#8B5CF6',
                elite: '#F59E0B'
              };
              const porcentaje = (count / totalPlanes) * 100 || 0;

              return (
                <div key={plan} className="distrib-item-compact">
                  <div className="distrib-header-compact">
                    <span>{plan.charAt(0).toUpperCase() + plan.slice(1)}</span>
                    <strong>{count}</strong>
                  </div>
                  <div className="distrib-bar-mini">
                    <div
                      className="distrib-fill"
                      style={{ width: `${porcentaje}%`, background: colores[plan] }}
                    />
                  </div>
                  <span className="distrib-pct">{porcentaje.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'alertas' && (
        <div className="tab-content">
          <div className="alerts-compact">
            {stats.verificacionesPendientes > 0 && (
              <div className="alert-badge warning">
                <span className="material-icons">assignment</span>
                <div>
                  <strong>{stats.verificacionesPendientes}</strong>
                  <p>Verificaciones</p>
                </div>
              </div>
            )}
            {stats.suspensionesTotales > 0 && (
              <div className="alert-badge critical">
                <span className="material-icons">block</span>
                <div>
                  <strong>{stats.suspensionesTotales}</strong>
                  <p>Suspensiones</p>
                </div>
              </div>
            )}
            {stats.verificacionesPendientes === 0 && stats.suspensionesTotales === 0 && (
              <div className="alert-badge success">
                <span className="material-icons">check_circle</span>
                <div>
                  <strong>Todo OK</strong>
                  <p>Sin alertas</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAdmin;