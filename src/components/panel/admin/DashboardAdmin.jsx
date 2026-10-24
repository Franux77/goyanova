// DashboardAdmin.jsx — Inicio del Panel Admin
// Primero lo que hay que hacer (pendientes), después los números y al final
// accesos a todas las secciones con nombres claros.
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient';
import Loading from '../../loading/Loading';
import './DashboardAdminPanel.css';

// Lo que necesita atención (las claves son las de los contadores del menú)
const PENDIENTES = [
  { clave: 'reportes', icono: 'flag', titulo: 'Reportes', texto: (n) => `${n} ${n === 1 ? 'reporte' : 'reportes'} de publicaciones para revisar`, ruta: '/panel/admin/reportes', tono: 'rojo' },
  { clave: 'verificaciones', icono: 'verified', titulo: 'Verificaciones', texto: (n) => `${n} ${n === 1 ? 'pedido' : 'pedidos'} de badge verificado`, ruta: '/panel/admin/verificaciones', tono: 'azul' },
  { clave: 'solicitudes', icono: 'person_remove', titulo: 'Bajas de cuenta', texto: (n) => `${n} ${n === 1 ? 'solicitud' : 'solicitudes'} de eliminación`, ruta: '/panel/admin/solicitudes-eliminacion', tono: 'rojo' },
  { clave: 'mensajes', icono: 'support_agent', titulo: 'Soporte', texto: (n) => `${n} ${n === 1 ? 'mensaje' : 'mensajes'} sin responder`, ruta: '/panel/admin/mensajes-soporte', tono: 'ambar' },
  { clave: 'comentarios', icono: 'reviews', titulo: 'Reseñas', texto: (n) => `${n} ${n === 1 ? 'reseña' : 'reseñas'} de GoyaNova para aprobar`, ruta: '/panel/admin/comentarios', tono: 'verde' },
  { clave: 'asistente', icono: 'smart_toy', titulo: 'Asistente IA', texto: (n) => `${n} ${n === 1 ? 'pregunta' : 'preguntas'} que no supo responder`, ruta: '/panel/admin/asistente', tono: 'violeta' },
  { clave: 'novedades', icono: 'newspaper', titulo: 'Novedades', texto: (n) => `${n} ${n === 1 ? 'cambio' : 'cambios'} sin ver en la plataforma`, ruta: '/panel/admin/novedades', tono: 'azul' },
];

// Todas las secciones, agrupadas por para qué sirven
const SECCIONES = [
  {
    titulo: 'Contenido',
    items: [
      { icono: 'build', nombre: 'Publicaciones', detalle: 'Ver, editar y suspender', ruta: '/panel/admin/servicios', clave: 'servicios' },
      { icono: 'folder', nombre: 'Categorías', detalle: 'Rubros y grupos', ruta: '/panel/admin/categorias' },
      { icono: 'newspaper', nombre: 'Novedades', detalle: 'Qué cambió hoy', ruta: '/panel/admin/novedades', clave: 'novedades' },
      { icono: 'reviews', nombre: 'Reseñas GoyaNova', detalle: 'Aprobar opiniones', ruta: '/panel/admin/comentarios', clave: 'comentarios' },
    ],
  },
  {
    titulo: 'Personas',
    items: [
      { icono: 'people', nombre: 'Usuarios', detalle: 'Cuentas registradas', ruta: '/panel/admin/usuarios', clave: 'usuarios' },
      { icono: 'verified', nombre: 'Verificaciones', detalle: 'Badge verificado', ruta: '/panel/admin/verificaciones', clave: 'verificaciones' },
      { icono: 'flag', nombre: 'Reportes', detalle: 'Denuncias de publicaciones', ruta: '/panel/admin/reportes', clave: 'reportes' },
      { icono: 'gavel', nombre: 'Sanciones', detalle: 'Suspensiones activas', ruta: '/panel/admin/suspensiones' },
      { icono: 'person_remove', nombre: 'Bajas de cuenta', detalle: 'Pedidos de eliminación', ruta: '/panel/admin/solicitudes-eliminacion', clave: 'solicitudes' },
    ],
  },
  {
    titulo: 'Planes y ventas',
    items: [
      { icono: 'card_membership', nombre: 'Membresías', detalle: 'Planes de los usuarios', ruta: '/panel/admin/membresias' },
      { icono: 'confirmation_number', nombre: 'Códigos promo', detalle: 'Crear y ver canjes', ruta: '/panel/admin/codigos' },
    ],
  },
  {
    titulo: 'Ayuda',
    items: [
      { icono: 'support_agent', nombre: 'Mensajes de soporte', detalle: 'Responder consultas', ruta: '/panel/admin/mensajes-soporte', clave: 'mensajes' },
      { icono: 'smart_toy', nombre: 'Asistente IA', detalle: 'Enseñarle respuestas', ruta: '/panel/admin/asistente', clave: 'asistente' },
      { icono: 'quiz', nombre: 'Preguntas frecuentes', detalle: 'FAQs del centro de ayuda', ruta: '/panel/admin/faqs' },
      { icono: 'video_library', nombre: 'Tutoriales', detalle: 'Videos de ayuda', ruta: '/panel/admin/tutoriales' },
    ],
  },
  {
    titulo: 'Sistema',
    items: [
      { icono: 'monitor_heart', nombre: 'Actividad', detalle: 'Visitas y uso', ruta: '/panel/admin/actividad' },
      { icono: 'settings', nombre: 'Configuración', detalle: 'Ajustes generales', ruta: '/panel/admin/configuracion' },
    ],
  },
];

const PERIODOS = [
  { clave: 'dia', titulo: 'Hoy', frase: 'hoy' },
  { clave: 'semana', titulo: 'Semana', frase: 'esta semana' },
  { clave: 'mes', titulo: 'Mes', frase: 'este mes' },
  { clave: 'año', titulo: 'Año', frase: 'este año' },
];

const COLORES_PLAN = { free: '#94a3b8', impulso: '#3b82f6', destacado: '#8b5cf6', elite: '#f59e0b' };

const inicioDelPeriodo = (periodo) => {
  const inicio = new Date();
  if (periodo === 'dia') inicio.setHours(0, 0, 0, 0);
  if (periodo === 'semana') {
    inicio.setDate(inicio.getDate() - inicio.getDay());
    inicio.setHours(0, 0, 0, 0);
  }
  if (periodo === 'mes') {
    inicio.setDate(1);
    inicio.setHours(0, 0, 0, 0);
  }
  if (periodo === 'año') {
    inicio.setMonth(0, 1);
    inicio.setHours(0, 0, 0, 0);
  }
  return inicio;
};

const hace = (fecha) => {
  if (!fecha) return '';
  const min = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
  return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
};

const pesos = (n) => Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const DashboardAdmin = () => {
  const { contadores = {} } = useOutletContext() || {};
  const [periodo, setPeriodo] = useState('mes');
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [nombreAdmin, setNombreAdmin] = useState('');
  const [notificaciones, setNotificaciones] = useState([]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const desde = inicioDelPeriodo(periodo);

      const [perfil, usuarios, servicios, opiniones, membresias, pagos, suspensiones, notifs] = await Promise.all([
        supabase.from('perfiles_usuarios').select('nombre').eq('id', user.id).single(),
        supabase.from('perfiles_usuarios').select('id, creado_en'),
        supabase.from('servicios').select('id, estado, creado_en'),
        supabase.from('opiniones').select('puntuacion, fecha'),
        supabase.from('membresias').select('id, plan_id').eq('estado', 'activa'),
        supabase.from('pagos_mp').select('monto, created_at').eq('estado', 'completado'),
        supabase.from('suspensiones').select('id', { count: 'exact', head: true }).eq('activa', true),
        supabase.from('notificaciones').select('*').eq('usuario_id', user.id).order('creada_en', { ascending: false }).limit(5),
      ]);

      setNombreAdmin(perfil.data?.nombre || 'Admin');

      const enPeriodo = (fecha) => fecha && new Date(fecha) >= desde;
      const listaUsuarios = usuarios.data || [];
      const listaServicios = servicios.data || [];
      const listaOpiniones = opiniones.data || [];
      const listaPagos = (pagos.data || []).filter((p) => enPeriodo(p.created_at));

      const planes = { free: 0, impulso: 0, destacado: 0, elite: 0 };
      (membresias.data || []).forEach((m) => {
        if (m.plan_id === 1) planes.free += 1;
        else if (m.plan_id === 2) planes.impulso += 1;
        else if (m.plan_id === 3) planes.destacado += 1;
        else if (m.plan_id === 4) planes.elite += 1;
      });

      const suma = listaOpiniones.reduce((s, o) => s + (o.puntuacion || 0), 0);

      setDatos({
        usuarios: listaUsuarios.length,
        usuariosNuevos: listaUsuarios.filter((u) => enPeriodo(u.creado_en)).length,
        publicacionesActivas: listaServicios.filter((s) => s.estado === 'activo').length,
        publicacionesNuevas: listaServicios.filter((s) => enPeriodo(s.creado_en)).length,
        opiniones: listaOpiniones.length,
        opinionesNuevas: listaOpiniones.filter((o) => enPeriodo(o.fecha)).length,
        promedio: listaOpiniones.length ? (suma / listaOpiniones.length).toFixed(1) : '–',
        ingresos: listaPagos.reduce((s, p) => s + (Number(p.monto) || 0), 0),
        pagos: listaPagos.length,
        planes,
        pagosPlanes: planes.impulso + planes.destacado + planes.elite,
        sanciones: suspensiones.count || 0,
      });
      setNotificaciones(notifs.data || []);
    } catch (err) {
      console.error('Error al cargar el panel:', err);
    } finally {
      setCargando(false);
    }
  }, [periodo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const hora = new Date().getHours();
  const saludo = hora >= 5 && hora < 12 ? 'Buenos días' : hora < 19 && hora >= 12 ? 'Buenas tardes' : 'Buenas noches';
  const fechaHoy = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  const pendientes = PENDIENTES.filter((p) => (contadores[p.clave] || 0) > 0);
  const totalPendientes = pendientes.reduce((s, p) => s + contadores[p.clave], 0);
  const frasePeriodo = PERIODOS.find((p) => p.clave === periodo)?.frase;
  const totalPlanes = datos ? Object.values(datos.planes).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="dsh">
      {/* Saludo */}
      <header className="dsh-cabecera">
        <div>
          <p className="dsh-fecha">{fechaHoy}</p>
          <h1>
            {saludo}{nombreAdmin ? `, ${nombreAdmin}` : ''}
          </h1>
          <p className="dsh-sub">
            {totalPendientes > 0
              ? `Tenés ${totalPendientes} ${totalPendientes === 1 ? 'cosa' : 'cosas'} para revisar.`
              : 'Está todo al día.'}
          </p>
        </div>
        <div className="dsh-cabecera-acciones">
          <Link to="/" className="dsh-boton-sec">
            <span className="material-icons">public</span>
            Ver el sitio
          </Link>
          <Link to="/panel/admin/servicios" className="dsh-boton">
            <span className="material-icons">search</span>
            Buscar publicación
          </Link>
        </div>
      </header>

      {/* Pendientes */}
      <section className="dsh-bloque">
        <h2 className="dsh-titulo">
          <span className="material-icons">checklist</span>
          Para revisar
        </h2>
        {pendientes.length === 0 ? (
          <div className="dsh-al-dia">
            <span className="material-icons">task_alt</span>
            <div>
              <strong>Todo al día</strong>
              <p>No hay reportes, verificaciones ni mensajes esperando.</p>
            </div>
          </div>
        ) : (
          <div className="dsh-pendientes">
            {pendientes.map((p) => (
              <Link key={p.clave} to={p.ruta} className={`dsh-pendiente tono-${p.tono}`}>
                <span className="dsh-pendiente-icono">
                  <span className="material-icons">{p.icono}</span>
                </span>
                <span className="dsh-pendiente-textos">
                  <strong>{p.titulo}</strong>
                  <small>{p.texto(contadores[p.clave])}</small>
                </span>
                <span className="dsh-pendiente-num">{contadores[p.clave]}</span>
                <span className="material-icons dsh-flecha">chevron_right</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Números */}
      <section className="dsh-bloque">
        <div className="dsh-titulo-fila">
          <h2 className="dsh-titulo">
            <span className="material-icons">insights</span>
            Cómo viene GoyaNova
          </h2>
          <div className="dsh-periodos" role="group" aria-label="Período">
            {PERIODOS.map((p) => (
              <button key={p.clave} type="button" className={periodo === p.clave ? 'activo' : ''} onClick={() => setPeriodo(p.clave)}>
                {p.titulo}
              </button>
            ))}
          </div>
        </div>

        {cargando && !datos ? (
          <Loading message="Cargando números..." />
        ) : datos ? (
          <div className={`dsh-numeros ${cargando ? 'cargando' : ''}`}>
            <Link to="/panel/admin/usuarios" className="dsh-numero">
              <span className="material-icons">people</span>
              <strong>{datos.usuarios}</strong>
              <span>Usuarios</span>
              <small className={datos.usuariosNuevos ? 'sube' : ''}>+{datos.usuariosNuevos} {frasePeriodo}</small>
            </Link>
            <Link to="/panel/admin/servicios" className="dsh-numero">
              <span className="material-icons">storefront</span>
              <strong>{datos.publicacionesActivas}</strong>
              <span>Publicaciones activas</span>
              <small className={datos.publicacionesNuevas ? 'sube' : ''}>+{datos.publicacionesNuevas} {frasePeriodo}</small>
            </Link>
            <Link to="/panel/admin/membresias" className="dsh-numero">
              <span className="material-icons">payments</span>
              <strong>{pesos(datos.ingresos)}</strong>
              <span>Ingresos</span>
              <small>{datos.pagos} {datos.pagos === 1 ? 'pago' : 'pagos'} {frasePeriodo}</small>
            </Link>
            <Link to="/panel/admin/membresias" className="dsh-numero">
              <span className="material-icons">workspace_premium</span>
              <strong>{datos.pagosPlanes}</strong>
              <span>Con plan pago</span>
              <small>Impulso, Destacado o Elite</small>
            </Link>
            <div className="dsh-numero">
              <span className="material-icons">star</span>
              <strong>{datos.promedio}</strong>
              <span>Calificación promedio</span>
              <small>{datos.opiniones} opiniones · +{datos.opinionesNuevas} {frasePeriodo}</small>
            </div>
            <Link to="/panel/admin/suspensiones" className="dsh-numero">
              <span className="material-icons">gavel</span>
              <strong>{datos.sanciones}</strong>
              <span>Sanciones activas</span>
              <small>usuarios suspendidos</small>
            </Link>
          </div>
        ) : (
          <p className="dsh-vacio">No pudimos cargar los números. <button type="button" onClick={cargar}>Reintentar</button></p>
        )}

        {datos && totalPlanes > 0 && (
          <div className="dsh-planes">
            <p>Membresías activas por plan</p>
            <div className="dsh-planes-barra" role="img" aria-label="Distribución de planes">
              {Object.entries(datos.planes).map(([plan, n]) =>
                n > 0 ? <span key={plan} style={{ width: `${(n / totalPlanes) * 100}%`, background: COLORES_PLAN[plan] }} /> : null
              )}
            </div>
            <ul>
              {Object.entries(datos.planes).map(([plan, n]) => (
                <li key={plan}>
                  <i style={{ background: COLORES_PLAN[plan] }} />
                  {plan.charAt(0).toUpperCase() + plan.slice(1)} <strong>{n}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Todas las secciones */}
      <section className="dsh-bloque">
        <h2 className="dsh-titulo">
          <span className="material-icons">apps</span>
          Todas las secciones
        </h2>
        <div className="dsh-secciones">
          {SECCIONES.map((g) => (
            <div key={g.titulo} className="dsh-grupo">
              <h3>{g.titulo}</h3>
              <div className="dsh-accesos">
                {g.items.map((it) => (
                  <Link key={it.ruta} to={it.ruta} className="dsh-acceso">
                    <span className="material-icons dsh-acceso-icono">{it.icono}</span>
                    <span className="dsh-acceso-textos">
                      <strong>{it.nombre}</strong>
                      <small>{it.detalle}</small>
                    </span>
                    {it.clave && contadores[it.clave] > 0 && <span className="dsh-badge">{contadores[it.clave]}</span>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Avisos recibidos */}
      {notificaciones.length > 0 && (
        <section className="dsh-bloque">
          <h2 className="dsh-titulo">
            <span className="material-icons">notifications</span>
            Tus últimos avisos
          </h2>
          <ul className="dsh-avisos">
            {notificaciones.map((n) => (
              <li key={n.id}>
                <span className={`material-icons ${n.tipo === 'advertencia' ? 'alerta' : ''}`}>
                  {n.tipo === 'advertencia' ? 'warning' : 'info'}
                </span>
                <span className="dsh-aviso-texto">{n.titulo}</span>
                <small>{hace(n.creada_en)}</small>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default DashboardAdmin;
