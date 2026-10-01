import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import './ActividadAdmin.css';

const MIN = 60 * 1000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

const FILTROS = [
  { clave: 'todos', texto: 'Todos', test: () => true },
  { clave: 'linea', texto: 'En línea', test: (ms) => ms !== null && ms <= 5 * MIN },
  { clave: 'hoy', texto: 'Últimas 24 h', test: (ms) => ms !== null && ms <= DIA },
  { clave: 'semana', texto: 'Esta semana', test: (ms) => ms !== null && ms <= 7 * DIA },
  { clave: 'mes', texto: 'Este mes', test: (ms) => ms !== null && ms <= 30 * DIA },
  { clave: 'inactivos', texto: 'Inactivos (+30 días)', test: (ms) => ms === null || ms > 30 * DIA },
];

const haceCuanto = (ms) => {
  if (ms === null) return 'Nunca entró';
  if (ms < 2 * MIN) return 'Ahora mismo';
  if (ms < HORA) return `Hace ${Math.floor(ms / MIN)} min`;
  if (ms < DIA) { const h = Math.floor(ms / HORA); return `Hace ${h} ${h === 1 ? 'hora' : 'horas'}`; }
  if (ms < 30 * DIA) { const d = Math.floor(ms / DIA); return `Hace ${d} ${d === 1 ? 'día' : 'días'}`; }
  const m = Math.floor(ms / (30 * DIA));
  return `Hace ${m} ${m === 1 ? 'mes' : 'meses'}`;
};

const estadoDe = (ms) => {
  if (ms !== null && ms <= 5 * MIN) return 'linea';
  if (ms !== null && ms <= DIA) return 'hoy';
  if (ms !== null && ms <= 7 * DIA) return 'semana';
  if (ms !== null && ms <= 30 * DIA) return 'mes';
  return 'inactivo';
};

const ActividadAdmin = () => {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [ahora, setAhora] = useState(Date.now());
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 30;

  const cargar = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('admin_actividad_usuarios');
    if (err) {
      setError('No se pudo cargar la actividad.');
    } else {
      setDatos(data);
      setError('');
    }
    setAhora(Date.now());
    setCargando(false);
  }, []);

  // Carga inicial y refresco cada minuto
  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 60 * 1000);
    return () => clearInterval(id);
  }, [cargar]);

  const usuarios = useMemo(() => {
    const lista = (datos?.usuarios || []).map((u) => {
      const ms = u.ultima_conexion ? Math.max(0, ahora - new Date(u.ultima_conexion).getTime()) : null;
      return { ...u, ms };
    });
    const f = FILTROS.find((x) => x.clave === filtro) || FILTROS[0];
    const q = busqueda.trim().toLowerCase();
    return lista.filter((u) => f.test(u.ms) && (!q ||
      `${u.nombre || ''} ${u.apellido || ''} ${u.email || ''}`.toLowerCase().includes(q)));
  }, [datos, filtro, busqueda, ahora]);

  useEffect(() => { setPagina(1); }, [filtro, busqueda]);

  const r = datos?.resumen;
  const visibles = usuarios.slice(0, pagina * POR_PAGINA);

  const tarjetas = r ? [
    { clave: 'linea', icono: 'bolt', valor: r.en_linea, texto: 'En línea ahora', sub: 'últimos 5 min', color: 'verde' },
    { clave: 'hoy', icono: 'today', valor: r.hoy, texto: 'Últimas 24 h', sub: `${pct(r.hoy, r.total)}% del total`, color: 'azul' },
    { clave: 'semana', icono: 'date_range', valor: r.semana, texto: 'Esta semana', sub: `${pct(r.semana, r.total)}% del total`, color: 'azul' },
    { clave: 'mes', icono: 'calendar_month', valor: r.mes, texto: 'Este mes', sub: `${pct(r.mes, r.total)}% del total`, color: 'violeta' },
    { clave: 'inactivos', icono: 'bedtime', valor: r.inactivos, texto: 'Inactivos', sub: 'más de 30 días', color: 'gris' },
    { clave: 'todos', icono: 'group', valor: r.total, texto: 'Registrados', sub: `+${r.nuevos_semana} esta semana`, color: 'celeste' },
  ] : [];

  return (
    <div className="actividad-admin">
      <header className="actividad-cab">
        <div>
          <h1>Actividad de usuarios</h1>
          <p>Quién se mantiene activo y hace cuánto entró, del más reciente al más antiguo.</p>
        </div>
        <button type="button" className="actividad-refrescar" onClick={cargar} title="Actualizar">
          <span className="material-icons">refresh</span>
        </button>
      </header>

      {cargando && <p className="actividad-estado">Cargando…</p>}
      {error && <p className="actividad-estado actividad-error">{error}</p>}

      {r && (
        <>
          <div className="actividad-tarjetas">
            {tarjetas.map((t) => (
              <button
                key={t.clave}
                type="button"
                className={`actividad-tarjeta c-${t.color} ${filtro === t.clave ? 'sel' : ''}`}
                onClick={() => setFiltro(t.clave)}
              >
                <span className="material-icons">{t.icono}</span>
                <strong>{t.valor}</strong>
                <span className="t">{t.texto}</span>
                <small>{t.sub}</small>
              </button>
            ))}
          </div>

          <p className="actividad-nota">
            “Última conexión” toma la actividad más reciente dentro de la app o el último inicio de sesión.
            Cuenta usuarios registrados; las visitas sin cuenta no se pueden medir desde acá.
          </p>

          <div className="actividad-barra">
            <div className="actividad-filtros">
              {FILTROS.map((f) => (
                <button
                  key={f.clave}
                  type="button"
                  className={filtro === f.clave ? 'sel' : ''}
                  onClick={() => setFiltro(f.clave)}
                >
                  {f.texto}
                </button>
              ))}
            </div>
            <input
              type="search"
              className="actividad-buscar"
              placeholder="Buscar por nombre o email…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <ul className="actividad-lista">
            {visibles.map((u) => (
              <li key={u.id} className="actividad-fila">
                <span className={`actividad-punto e-${estadoDe(u.ms)}`} aria-hidden="true" />
                <div className="actividad-avatar">{(u.nombre || u.email || '?').charAt(0).toUpperCase()}</div>
                <div className="actividad-datos">
                  <strong>
                    {[u.nombre, u.apellido].filter(Boolean).join(' ') || 'Sin nombre'}
                    {u.rol === 'admin' && <span className="actividad-admin-tag">admin</span>}
                  </strong>
                  <span>{u.email}</span>
                </div>
                <span className={`actividad-plan ${u.plan === 'Free' ? 'free' : 'pago'}`}>{u.plan}</span>
                <div className="actividad-cuando">
                  <strong className={`e-${estadoDe(u.ms)}`}>{haceCuanto(u.ms)}</strong>
                  <small>
                    {u.ultima_conexion
                      ? new Date(u.ultima_conexion).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </small>
                </div>
              </li>
            ))}
            {!cargando && usuarios.length === 0 && <li className="actividad-vacio">No hay usuarios en este filtro.</li>}
          </ul>

          {visibles.length < usuarios.length && (
            <button type="button" className="actividad-mas" onClick={() => setPagina((p) => p + 1)}>
              Ver más ({usuarios.length - visibles.length} restantes)
            </button>
          )}
        </>
      )}
    </div>
  );
};

const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

export default ActividadAdmin;
