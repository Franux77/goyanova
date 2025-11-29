// CategoriasAdmin.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../../utils/supabaseClient";
import "./CategoriasAdmin.css";
import { materialIconsList } from "../../../utils/materialIconsList";
import Loading from '../../loading/Loading';

const CategoriasAdmin = () => {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todas");
  const [paginaActual, setPaginaActual] = useState(1);
  const [editando, setEditando] = useState(null);
  const [reasignarId, setReasignarId] = useState(null);
  const categoriasPorPagina = 10;

  // Cargar categorías
  useEffect(() => {
    const fetchCategorias = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("categorias")
        .select("id, nombre, descripcion, tipo, estado, color, icon");

      if (error) {
        console.error("Error cargando categorías:", error.message);
      } else {
        const adaptadas = data.map((cat) => ({
          ...cat,
          activa: cat.estado === "activa",
        }));
        setCategorias(adaptadas);
      }
      setLoading(false);
    };

    fetchCategorias();
  }, []);

  const resumen = {
    activas: categorias.filter((c) => c.activa).length,
    suspendidas: categorias.filter((c) => !c.activa).length,
    servicios: categorias.filter((c) => c.tipo === "servicio").length,
    productos: categorias.filter((c) => c.tipo === "producto").length,
  };

  const filtrarCategorias = () => {
    return categorias.filter((cat) => {
      const coincideBusqueda = cat.nombre
        .toLowerCase()
        .includes(busqueda.toLowerCase());
      const coincideTipo = filtroTipo === "todas" || cat.tipo === filtroTipo;
      return coincideBusqueda && coincideTipo;
    });
  };

  const categoriasFiltradas = filtrarCategorias();
  const totalPaginas = Math.ceil(
    categoriasFiltradas.length / categoriasPorPagina
  );
  const categoriasPaginadas = categoriasFiltradas.slice(
    (paginaActual - 1) * categoriasPorPagina,
    paginaActual * categoriasPorPagina
  );

  // Suspender / Activar categoría
  const toggleEstado = async (id, activaActual, nombre) => {
    const accion = activaActual ? "suspender" : "activar";
    if (
      !window.confirm(
        `¿Seguro que querés ${accion} la categoría "${nombre}"?`
      )
    )
      return;

    const nuevoEstado = activaActual ? "suspendida" : "activa";

    const { error } = await supabase
      .from("categorias")
      .update({ estado: nuevoEstado })
      .eq("id", id);

    if (error) {
      console.error("Error actualizando estado:", error.message);
      return;
    }

    setCategorias((prev) =>
      prev.map((cat) =>
        cat.id === id ? { ...cat, activa: !activaActual } : cat
      )
    );
  };

  // Eliminar categoría con validación
  const eliminarCategoria = async (id, nombre) => {
    const { data: servicios, error: errorServicios } = await supabase
      .from("servicios")
      .select("id")
      .eq("categoria_id", id);

    if (errorServicios) {
      console.error("Error verificando servicios:", errorServicios.message);
      return;
    }

    if (servicios.length > 0) {
      alert(
        `La categoría "${nombre}" tiene servicios asignados. Reasignalos antes de eliminar.`
      );
      setReasignarId(id);
      return;
    }

    if (
      !window.confirm(`¿Seguro que querés eliminar la categoría "${nombre}"?`)
    )
      return;

    const { error } = await supabase.from("categorias").delete().eq("id", id);
    if (error) {
      console.error("Error eliminando categoría:", error.message);
      return;
    }
    setCategorias((prev) => prev.filter((cat) => cat.id !== id));
  };

  // Guardar cambios en edición
  const guardarEdicion = async () => {
    const { id, nombre, descripcion, tipo, color, icon } = editando;

    if (!nombre.trim()) {
      alert("El nombre no puede estar vacío.");
      return;
    }

    if (id) {
      const { error } = await supabase
        .from("categorias")
        .update({ nombre, descripcion, tipo, color, icon })
        .eq("id", id);

      if (error) {
        console.error("Error guardando cambios:", error.message);
        return;
      }

      setCategorias((prev) =>
        prev.map((cat) => (cat.id === id ? { ...editando } : cat))
      );
    } else {
      const { data, error } = await supabase
        .from("categorias")
        .insert([
          {
            nombre,
            descripcion,
            tipo,
            color,
            icon,
            estado: "activa",
          },
        ])
        .select();

      if (error) {
        console.error("Error creando categoría:", error.message);
        return;
      }

      setCategorias((prev) => [...prev, { ...data[0], activa: true }]);
    }

    setEditando(null);
  };

  return (
    <section className="ca-categorias-admin">
      <h2 className="ca-categorias-admin__titulo">Gestión de Categorías</h2>

      {/* Resumen */}
      <div className="ca-categorias-admin__resumen">
        <div className="ca-resumen-card">
          Activas:<br />
          <strong>{resumen.activas}</strong>
        </div>
        <div className="ca-resumen-card">
          Suspendidas:<br />
          <strong>{resumen.suspendidas}</strong>
        </div>
        <div className="ca-resumen-card">
          Servicios:<br />
          <strong>{resumen.servicios}</strong>
        </div>
        <div className="ca-resumen-card">
          Productos:<br />
          <strong>{resumen.productos}</strong>
        </div>
      </div>

      {/* Controles */}
      <div className="ca-categorias-admin__controles">
        <input
          type="search"
          placeholder="Buscar categoría..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="ca-input"
        />
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="ca-select"
        >
          <option value="todas">Todas</option>
          <option value="servicio">Servicios</option>
          <option value="producto">Productos</option>
        </select>

        <button
          className="ca-btn-agregar"
          onClick={() =>
            setEditando({
              id: null,
              nombre: "",
              descripcion: "",
              tipo: "servicio",
              color: "#000000",
              icon: "",
              activa: true,
            })
          }
        >
          <span className="material-icons">add_circle</span> Agregar
        </button>
      </div>

      {/* Lista */}
      <div className="ca-categorias-admin__lista">
        {loading ? (
  <Loading message="Cargando categorías..." />
) : categoriasFiltradas.length === 0 ? (
          <p className="ca-sin-resultados">No se encontraron categorías.</p>
        ) : (
          categoriasPaginadas.map((cat) => (
            <article key={cat.id} className="ca-categoria-card">
              <div className="ca-categoria-info">
                <strong className="ca-categoria-nombre">{cat.nombre}</strong>
                <p>{cat.descripcion}</p>
                <p
                  className={`ca-categoria-estado ${
                    cat.activa ? "ca-activa" : "ca-suspendida"
                  }`}
                >
                  {cat.activa ? "Activa" : "Suspendida"}
                </p>
                <p>Tipo: {cat.tipo}</p>
              </div>
              <div className="ca-categoria-acciones">
                <button
                  className={`ca-btn-toggle ${
                    cat.activa ? "ca-btn-suspender" : "ca-btn-habilitar"
                  }`}
                  onClick={() => toggleEstado(cat.id, cat.activa, cat.nombre)}
                >
                  {cat.activa ? "Suspender" : "Habilitar"}
                </button>
                <button
                  className="ca-btn-editar"
                  onClick={() => setEditando({ ...cat })}
                >
                  Editar
                </button>
                <button
                  className="ca-btn-eliminar"
                  onClick={() => eliminarCategoria(cat.id, cat.nombre)}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <nav className="ca-categorias-admin__paginacion">
          {Array.from({ length: totalPaginas }, (_, i) => (
            <button
              key={i}
              className={`ca-btn-paginacion ${
                paginaActual === i + 1 ? "ca-activo" : ""
              }`}
              onClick={() => setPaginaActual(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </nav>
      )}

      {/* Modal edición */}
      {editando && (
        <div className="ca-modal">
          <div className="ca-modal-content ca-form-avanzado">
            <h3>{editando.id ? "Editar Categoría" : "Nueva Categoría"}</h3>

            <label>Nombre</label>
            <input
              value={editando.nombre}
              onChange={(e) =>
                setEditando({ ...editando, nombre: e.target.value })
              }
              placeholder="Nombre de la categoría"
              className="ca-input"
            />
            {categorias.some(
              (c) =>
                c.nombre.toLowerCase() === editando.nombre.toLowerCase() &&
                c.id !== editando.id
            ) && (
              <p className="ca-error">⚠ Ya existe una categoría con este nombre.</p>
            )}

            <label>Descripción</label>
            <textarea
              value={editando.descripcion || ""}
              onChange={(e) =>
                setEditando({ ...editando, descripcion: e.target.value })
              }
              placeholder="Breve descripción"
              className="ca-textarea"
            />

            <label>Tipo</label>
            <select
              value={editando.tipo}
              onChange={(e) =>
                setEditando({ ...editando, tipo: e.target.value })
              }
              className="ca-select"
            >
              <option value="servicio">Servicio</option>
              <option value="producto">Producto</option>
            </select>

            <label>Color</label>
            <div className="ca-color-picker">
              <input
                type="color"
                value={editando.color || "#000000"}
                onChange={(e) =>
                  setEditando({ ...editando, color: e.target.value })
                }
              />
              <input
                type="text"
                value={editando.color || ""}
                onChange={(e) =>
                  setEditando({ ...editando, color: e.target.value })
                }
                placeholder="#000000"
                className="ca-input-color"
              />
            </div>

            <label>Ícono</label>
            <div className="ca-icon-search">
              <input
                type="text"
                placeholder="Buscar ícono..."
                value={editando.icon || ""}
                onChange={(e) =>
                  setEditando({ ...editando, icon: e.target.value })
                }
                className="ca-input"
              />
              <div className="ca-icon-preview">
                <span className="material-icons">{editando.icon}</span>
              </div>
            </div>

            {/* Grid de íconos con KEY ÚNICO */}
            <div className="ca-icon-grid">
              {materialIconsList
                .filter((icon) =>
                  icon.toLowerCase().includes(editando.icon?.toLowerCase() || "")
                )
                .map((iconName, index) => (
                  <span
                    key={`icon-${index}-${iconName}`}
                    className={`material-icons ca-icon-item ${
                      editando.icon === iconName ? "ca-icon-activo" : ""
                    }`}
                    title={iconName}
                    onClick={() => setEditando({ ...editando, icon: iconName })}
                  >
                    {iconName}
                  </span>
                ))}
            </div>

            <div className="ca-modal-acciones">
              <button
                onClick={() => {
                  const nombreRepetido = categorias.some(
                    (c) =>
                      c.nombre.toLowerCase() === editando.nombre.toLowerCase() &&
                      c.id !== editando.id
                  );

                  if (nombreRepetido) {
                    alert("No se puede guardar: nombre ya en uso.");
                    return;
                  }
                  guardarEdicion();
                }}
              >
                Guardar
              </button>
              <button onClick={() => setEditando(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal reasignación */}
      {reasignarId && (
        <div className="ca-modal">
          <div className="ca-modal-content">
            <h3>Reasignar servicios</h3>
            <p>
              Seleccioná una categoría destino para mover los servicios antes de
              eliminar la categoría.
            </p>
            <select
              onChange={async (e) => {
                const nuevaCat = e.target.value;
                if (!nuevaCat) return;

                await supabase
                  .from("servicios")
                  .update({ categoria_id: nuevaCat })
                  .eq("categoria_id", reasignarId);

                await supabase.from("categorias").delete().eq("id", reasignarId);

                setCategorias((prev) =>
                  prev.filter((cat) => cat.id !== reasignarId)
                );
                setReasignarId(null);
              }}
            >
              <option value="">-- Seleccionar categoría --</option>
              {categorias
                .filter((c) => c.id !== reasignarId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </select>
            <button onClick={() => setReasignarId(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </section>
  );
};

export default CategoriasAdmin;