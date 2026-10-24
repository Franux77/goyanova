import React, { useEffect, useMemo, useState } from 'react';
import SelectorIcono from './SelectorIcono';
import {
  NOMBRE_TIPO,
  DESCRIPCION_TIPO,
  PALETA,
  buscarParecidas,
  grupoParecido,
  colorDelGrupo,
  colorValido,
  normalizar,
} from './utilsCategorias';

/* Formulario para crear o editar una categoría.
   Avisa en el momento si ya existe una parecida (también suspendidas). */
const FormCategoria = ({ inicial, categorias, conteos, guardando, onGuardar, onCerrar, onEditarOtra, onReactivar }) => {
  const [datos, setDatos] = useState(inicial);
  const [grupoNuevo, setGrupoNuevo] = useState('');
  const [creandoGrupo, setCreandoGrupo] = useState(false);
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  const cambiar = (campo, valor) => setDatos((d) => ({ ...d, [campo]: valor }));

  useEffect(() => {
    const alTeclear = (e) => e.key === 'Escape' && onCerrar();
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', alTeclear);
    return () => {
      document.body.style.overflow = previo;
      window.removeEventListener('keydown', alTeclear);
    };
  }, [onCerrar]);

  const parecidas = useMemo(
    () => buscarParecidas(datos.nombre, categorias, datos.id),
    [datos.nombre, categorias, datos.id]
  );
  const repetidaExacta = parecidas.find((p) => p.nivel === 3);

  const grupos = useMemo(() => {
    const set = new Set(categorias.filter((c) => c.tipo === datos.tipo && c.grupo).map((c) => c.grupo.trim()));
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [categorias, datos.tipo]);

  const parecidoAlNuevo = grupoNuevo ? grupoParecido(grupoNuevo, grupos) : null;
  const colorSugerido = datos.grupo ? colorDelGrupo(datos.grupo, datos.tipo, categorias) : null;

  const errores = {
    nombre: !datos.nombre.trim()
      ? 'Poné un nombre'
      : repetidaExacta
        ? `Ya existe "${repetidaExacta.cat.nombre}"`
        : '',
    grupo: !datos.grupo ? 'Elegí un grupo' : '',
    icono: !datos.icon ? 'Elegí un ícono' : '',
    color: !colorValido(datos.color) ? 'El color no es válido' : '',
  };
  const hayErrores = Object.values(errores).some(Boolean);

  const elegirGrupo = (g) => {
    setDatos((d) => {
      const sugerido = colorDelGrupo(g, d.tipo, categorias);
      // Si todavía no eligió color a mano, usa el del grupo
      return { ...d, grupo: g, color: d.colorTocado || !sugerido ? d.color : sugerido };
    });
  };

  const confirmarGrupoNuevo = () => {
    const nombre = grupoNuevo.trim().replace(/\s+/g, ' ');
    if (!nombre) return;
    const existente = grupos.find((g) => normalizar(g) === normalizar(nombre));
    elegirGrupo(existente || nombre.charAt(0).toUpperCase() + nombre.slice(1));
    setGrupoNuevo('');
    setCreandoGrupo(false);
  };

  const guardar = () => {
    setIntentoGuardar(true);
    if (hayErrores) return;
    onGuardar({
      ...datos,
      nombre: datos.nombre.trim().replace(/\s+/g, ' '),
      descripcion: datos.descripcion?.trim() || null,
    });
  };

  const tipoCambiado = inicial.id && inicial.tipo !== datos.tipo;
  const publicaciones = inicial.id ? conteos[inicial.id]?.total || 0 : 0;

  return (
    <div className="cat-modal-fondo" onClick={onCerrar}>
      <div className="cat-modal cat-form" role="dialog" aria-modal="true" aria-labelledby="cat-form-titulo" onClick={(e) => e.stopPropagation()}>
        <header className="cat-modal-cabecera">
          <div>
            <h3 id="cat-form-titulo">{datos.id ? 'Editar categoría' : 'Nueva categoría'}</h3>
            {datos.id && (
              <p>{publicaciones === 1 ? '1 publicación usa esta categoría' : `${publicaciones} publicaciones usan esta categoría`}</p>
            )}
          </div>
          <button type="button" className="cat-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <span className="material-icons">close</span>
          </button>
        </header>

        <div className="cat-modal-cuerpo">
          {/* Vista previa */}
          <div className="cat-preview">
            <div className="cat-preview-pin" style={{ background: datos.color }}>
              <span className="material-icons">{datos.icon || 'category'}</span>
              <i style={{ borderTopColor: datos.color }} />
            </div>
            <div className="cat-preview-tarjeta">
              <span className="cat-preview-icono" style={{ background: `${datos.color}1f`, color: datos.color }}>
                <span className="material-icons">{datos.icon || 'category'}</span>
              </span>
              <div>
                <strong>{datos.nombre.trim() || 'Nombre de la categoría'}</strong>
                <small>{NOMBRE_TIPO[datos.tipo]}{datos.grupo ? ` · ${datos.grupo}` : ''}</small>
              </div>
            </div>
            <p className="cat-preview-nota">Así se ve en el mapa y en el inicio</p>
          </div>

          {/* Tipo */}
          <section className="cat-campo">
            <span className="cat-label">¿Es un oficio o un negocio?</span>
            <div className="cat-tipos">
              {['servicio', 'producto'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`cat-tipo ${datos.tipo === t ? 'activo' : ''}`}
                  onClick={() => setDatos((d) => ({ ...d, tipo: t, grupo: d.tipo === t ? d.grupo : null }))}
                >
                  <span className="material-icons">{t === 'servicio' ? 'handyman' : 'storefront'}</span>
                  <span>
                    <strong>{NOMBRE_TIPO[t]}</strong>
                    <small>{DESCRIPCION_TIPO[t]}</small>
                  </span>
                </button>
              ))}
            </div>
            {tipoCambiado && publicaciones > 0 && (
              <p className="cat-aviso">
                <span className="material-icons">info</span>
                Las {publicaciones} publicaciones de esta categoría también van a pasar a {NOMBRE_TIPO[datos.tipo]}.
              </p>
            )}
          </section>

          {/* Nombre */}
          <section className="cat-campo">
            <label className="cat-label" htmlFor="cat-nombre">Nombre</label>
            <input
              id="cat-nombre"
              type="text"
              value={datos.nombre}
              onChange={(e) => cambiar('nombre', e.target.value.slice(0, 60))}
              placeholder="Ej: Golosinería, Electricista, Heladería"
              className={intentoGuardar && errores.nombre ? 'error' : ''}
              autoFocus={!datos.id}
            />
            <small className="cat-ayuda">Como lo buscaría la gente. En singular o como se dice en Goya.</small>

            {parecidas.length > 0 && (
              <div className={`cat-parecidas ${repetidaExacta ? 'grave' : ''}`}>
                <p className="cat-parecidas-titulo">
                  <span className="material-icons">{repetidaExacta ? 'error' : 'content_copy'}</span>
                  {repetidaExacta ? 'Esta categoría ya existe' : '¿No será alguna de estas? Ya existen:'}
                </p>
                <ul>
                  {parecidas.map(({ cat, motivo }) => (
                    <li key={cat.id}>
                      <span className="cat-mini-icono" style={{ background: cat.color || '#64748b' }}>
                        <span className="material-icons">{cat.icon || 'category'}</span>
                      </span>
                      <div className="cat-parecida-textos">
                        <strong>{cat.nombre}</strong>
                        <small>
                          {NOMBRE_TIPO[cat.tipo]} · {cat.grupo || 'Sin grupo'} · {conteos[cat.id]?.total || 0} publ.
                          {!cat.activa && <em> · Suspendida</em>} · {motivo}
                        </small>
                      </div>
                      {!cat.activa ? (
                        <button type="button" className="cat-boton-sec" onClick={() => onReactivar(cat)}>
                          Reactivar
                        </button>
                      ) : (
                        <button type="button" className="cat-boton-sec" onClick={() => onEditarOtra(cat)}>
                          Ver
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Grupo */}
          <section className="cat-campo">
            <span className="cat-label">Grupo</span>
            <small className="cat-ayuda">Agrupa las categorías parecidas en la lista que ve la gente al publicar.</small>
            <div className="cat-chips">
              {grupos.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`cat-chip ${datos.grupo === g ? 'activo' : ''}`}
                  onClick={() => elegirGrupo(g)}
                >
                  {datos.grupo === g && <span className="material-icons">check</span>}
                  {g}
                </button>
              ))}
              {datos.grupo && !grupos.includes(datos.grupo) && (
                <button type="button" className="cat-chip activo">
                  <span className="material-icons">check</span>
                  {datos.grupo} <em>(nuevo)</em>
                </button>
              )}
              <button type="button" className="cat-chip cat-chip-nuevo" onClick={() => setCreandoGrupo((v) => !v)}>
                <span className="material-icons">add</span>
                Nuevo grupo
              </button>
            </div>
            {creandoGrupo && (
              <div className="cat-grupo-nuevo">
                <div className="cat-fila">
                  <input
                    type="text"
                    value={grupoNuevo}
                    onChange={(e) => setGrupoNuevo(e.target.value.slice(0, 40))}
                    onKeyDown={(e) => e.key === 'Enter' && confirmarGrupoNuevo()}
                    placeholder="Nombre del grupo"
                    autoFocus
                  />
                  <button type="button" className="cat-boton" onClick={confirmarGrupoNuevo} disabled={!grupoNuevo.trim()}>
                    Usar
                  </button>
                </div>
                {parecidoAlNuevo && (
                  <p className="cat-aviso">
                    <span className="material-icons">info</span>
                    Ya existe el grupo <strong>{parecidoAlNuevo}</strong>.{' '}
                    <button type="button" className="cat-link-inline" onClick={() => { elegirGrupo(parecidoAlNuevo); setCreandoGrupo(false); setGrupoNuevo(''); }}>
                      Usar ese
                    </button>
                  </p>
                )}
              </div>
            )}
            {intentoGuardar && errores.grupo && <p className="cat-error">{errores.grupo}</p>}
          </section>

          {/* Ícono */}
          <section className="cat-campo">
            <span className="cat-label">Ícono</span>
            <SelectorIcono
              valor={datos.icon}
              color={colorValido(datos.color) ? datos.color : '#64748b'}
              nombreCategoria={`${datos.nombre} ${datos.grupo || ''}`}
              onElegir={(icon) => setDatos((d) => ({ ...d, icon, iconType: 'icons' }))}
            />
            {intentoGuardar && errores.icono && <p className="cat-error">{errores.icono}</p>}
          </section>

          {/* Color */}
          <section className="cat-campo">
            <span className="cat-label">Color</span>
            {colorSugerido && colorSugerido !== datos.color?.toLowerCase() && (
              <button
                type="button"
                className="cat-sugerencia-color"
                onClick={() => setDatos((d) => ({ ...d, color: colorSugerido, colorTocado: true }))}
              >
                <span style={{ background: colorSugerido }} />
                Usar el color del grupo {datos.grupo}
              </button>
            )}
            <div className="cat-paleta">
              {PALETA.map((p) => (
                <button
                  key={p.color}
                  type="button"
                  className={`cat-color ${datos.color?.toLowerCase() === p.color ? 'activo' : ''}`}
                  style={{ background: p.color }}
                  onClick={() => setDatos((d) => ({ ...d, color: p.color, colorTocado: true }))}
                  title={p.nombre}
                  aria-label={p.nombre}
                >
                  {datos.color?.toLowerCase() === p.color && <span className="material-icons">check</span>}
                </button>
              ))}
              <label className="cat-color cat-color-libre" title="Otro color">
                <input
                  type="color"
                  value={colorValido(datos.color) && datos.color.length === 7 ? datos.color : '#1774f6'}
                  onChange={(e) => setDatos((d) => ({ ...d, color: e.target.value, colorTocado: true }))}
                  aria-label="Elegir otro color"
                />
                <span className="material-icons">colorize</span>
              </label>
            </div>
          </section>

          {/* Descripción */}
          <section className="cat-campo">
            <label className="cat-label" htmlFor="cat-desc">
              Descripción <span className="cat-opcional">Opcional</span>
            </label>
            <textarea
              id="cat-desc"
              rows={2}
              value={datos.descripcion || ''}
              onChange={(e) => cambiar('descripcion', e.target.value.slice(0, 200))}
              placeholder="Qué entra en esta categoría. Ej: Venta de golosinas, chocolates y snacks."
            />
          </section>
        </div>

        <footer className="cat-modal-pie">
          {intentoGuardar && hayErrores && (
            <p className="cat-error cat-error-pie">Revisá: {Object.values(errores).filter(Boolean).join(' · ')}</p>
          )}
          <div className="cat-fila cat-fila-final">
            <button type="button" className="cat-boton-sec" onClick={onCerrar}>
              Cancelar
            </button>
            <button type="button" className="cat-boton" onClick={guardar} disabled={guardando}>
              <span className="material-icons">{guardando ? 'hourglass_top' : 'save'}</span>
              {guardando ? 'Guardando…' : datos.id ? 'Guardar cambios' : 'Crear categoría'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default FormCategoria;
