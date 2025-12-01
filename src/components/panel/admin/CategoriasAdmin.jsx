// CategoriasAdmin.jsx
import React, { useState, useEffect, useMemo } from "react";
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
  const [busquedaIcono, setBusquedaIcono] = useState("");
  const [iconosAPI, setIconosAPI] = useState([]);
  const [cargandoIconos, setCargandoIconos] = useState(false);
  const categoriasPorPagina = 10;

  // Colores predefinidos modernos
  const coloresPredefinidos = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", 
    "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2",
    "#F8B739", "#52B788", "#E76F51", "#2A9D8F",
    "#E9C46A", "#F4A261", "#264653", "#FF5A5F",
    "#00A699", "#FC642D", "#484848", "#767676",
    "#FFB400", "#FF385C", "#00D1C1", "#8B5CF6",
    "#EC4899", "#10B981", "#F59E0B", "#3B82F6",
    "#EF4444", "#8B5A00", "#059669", "#7C3AED"
  ];

  // Lista extendida de iconos de Material Icons (400+)
  const iconosExtendidos = [
    // Comida y Restaurantes
    'restaurant', 'local_dining', 'fastfood', 'local_pizza', 'lunch_dining',
    'dinner_dining', 'breakfast_dining', 'brunch_dining', 'restaurant_menu',
    'local_cafe', 'local_bar', 'local_drink', 'coffee', 'coffee_maker',
    'emoji_food_beverage', 'cake', 'bakery_dining', 'ramen_dining', 'rice_bowl',
    'egg', 'egg_alt', 'icecream', 'kitchen', 'microwave', 'blender',
    
    // Transporte
    'directions_car', 'local_taxi', 'drive_eta', 'car_rental', 'two_wheeler',
    'motorcycle', 'moped', 'electric_bike', 'electric_scooter', 'pedal_bike',
    'directions_bike', 'flight', 'flight_takeoff', 'flight_land', 'local_airport',
    'airplanemode_active', 'train', 'tram', 'subway', 'directions_bus',
    'airport_shuttle', 'local_shipping', 'directions_boat', 'sailing', 'ferry',
    'delivery_dining', 'electric_car', 'electric_moped', 'electric_rickshaw',
    
    // Lugares y Edificios
    'home', 'house', 'cottage', 'apartment', 'villa', 'gite', 'cabin',
    'store', 'storefront', 'local_mall', 'shopping_cart', 'local_grocery_store',
    'local_convenience_store', 'local_pharmacy', 'local_hospital', 'local_hotel',
    'hotel', 'business', 'domain', 'account_balance', 'museum', 'church',
    'temple_buddhist', 'temple_hindu', 'mosque', 'synagogue', 'castle',
    'school', 'local_library', 'location_city', 'warehouse', 'factory',
    
    // Compras y Pagos
    'shopping_bag', 'card_giftcard', 'redeem', 'payment', 'credit_card',
    'account_balance_wallet', 'currency_exchange', 'point_of_sale', 'receipt',
    'local_atm', 'money', 'paid', 'sell', 'discount', 'loyalty',
    
    // Servicios y Herramientas
    'build', 'construction', 'handyman', 'plumbing', 'electrical_services',
    'carpenter', 'architecture', 'engineering', 'cleaning_services', 'dry_cleaning',
    'local_laundry_service', 'local_car_wash', 'garage', 'oil_barrel', 'propane_tank',
    'hardware', 'home_repair_service', 'pest_control', 'roofing', 'hvac',
    
    // Salud y Fitness
    'fitness_center', 'pool', 'spa', 'hot_tub', 'sports_gymnastics',
    'sports_martial_arts', 'sports_kabaddi', 'sports_soccer', 'sports_tennis',
    'sports_basketball', 'sports_baseball', 'sports_volleyball', 'sports_hockey',
    'sports_handball', 'sports_cricket', 'sports_rugby', 'sports_football',
    'sports_golf', 'sports_mma', 'self_improvement', 'psychology', 'medications',
    'medical_services', 'local_pharmacy', 'vaccines', 'health_and_safety',
    
    // Educación y Libros
    'school', 'menu_book', 'book', 'library_books', 'auto_stories', 'import_contacts',
    'chrome_reader_mode', 'local_library', 'science', 'biotech', 'calculate',
    'functions', 'history_edu', 'psychology_alt', 'science', 'sketch',
    
    // Tecnología y Dispositivos
    'computer', 'laptop', 'tablet', 'phone_android', 'phone_iphone', 'smartphone',
    'watch', 'tv', 'speaker', 'headphones', 'headset', 'earbuds', 'keyboard',
    'mouse', 'router', 'wifi', 'signal_wifi_4_bar', 'bluetooth', 'usb',
    'memory', 'storage', 'sd_card', 'sim_card', 'phonelink', 'cast', 'videogame_asset',
    
    // Comunicación
    'email', 'mail', 'send', 'chat', 'message', 'textsms', 'comment', 'forum',
    'call', 'phone', 'contacts', 'contact_phone', 'contact_mail', 'perm_phone_msg',
    'voicemail', 'video_call', 'duo', 'rss_feed', 'alternate_email',
    
    // Tiempo y Calendario
    'event', 'today', 'calendar_month', 'date_range', 'schedule', 'alarm',
    'access_time', 'timer', 'hourglass_empty', 'update', 'history', 'watch_later',
    'pending', 'event_available', 'event_busy', 'event_note',
    
    // Entretenimiento
    'movie', 'theaters', 'live_tv', 'videocam', 'music_note', 'audiotrack',
    'album', 'library_music', 'piano', 'mic', 'radio', 'podcasts', 'party_mode',
    'nightlife', 'casino', 'sports_esports', 'games', 'toys', 'celebration',
    
    // Naturaleza y Clima
    'wb_sunny', 'wb_cloudy', 'cloud', 'ac_unit', 'beach_access', 'waves',
    'water_drop', 'thunderstorm', 'weather_snowy', 'foggy', 'filter_drama',
    'park', 'nature', 'nature_people', 'eco', 'energy_savings_leaf', 'forest',
    'local_florist', 'yard', 'grass', 'landscape', 'terrain', 'hiking',
    
    // Mascotas y Animales
    'pets', 'cruelty_free', 'pet_supplies',
    
    // Documentos y Archivos
    'description', 'article', 'assignment', 'folder', 'folder_open', 'insert_drive_file',
    'picture_as_pdf', 'file_present', 'attachment', 'upload_file', 'download',
    'cloud_upload', 'cloud_download', 'save', 'backup', 'archive',
    
    // Seguridad
    'lock', 'lock_open', 'security', 'shield', 'verified_user', 'vpn_key',
    'key', 'password', 'fingerprint', 'admin_panel_settings', 'gpp_good',
    
    // Social y Personas
    'person', 'group', 'people', 'family_restroom', 'escalator_warning',
    'pregnant_woman', 'wc', 'accessibility', 'accessible', 'elderly',
    
    // Acciones
    'add_circle', 'remove_circle', 'check_circle', 'cancel', 'close',
    'done', 'clear', 'refresh', 'sync', 'replay', 'undo', 'redo',
    'favorite', 'star', 'bookmark', 'flag', 'share', 'thumb_up',
    
    // Navegación
    'home', 'search', 'explore', 'map', 'navigation', 'near_me', 'place',
    'my_location', 'gps_fixed', 'directions', 'arrow_forward', 'arrow_back',
    
    // Negocios
    'work', 'business_center', 'badge', 'card_membership', 'corporate_fare',
    'attach_money', 'monetization_on', 'trending_up', 'bar_chart', 'analytics',
    'assessment', 'insights', 'query_stats', 'leaderboard', 'show_chart',
    
    // Configuración
    'settings', 'tune', 'build_circle', 'manage_accounts', 'admin_panel_settings',
    'display_settings', 'phonelink_setup', 'wifi_tethering', 'developer_mode',
    
    // Otros
    'lightbulb', 'wb_incandescent', 'flash_on', 'category', 'label', 'local_offer',
    'style', 'palette', 'brush', 'format_paint', 'photo_camera', 'camera_alt',
    'photo', 'image', 'collections', 'photo_library', 'burst_mode', 'panorama',
    'print', 'qr_code', 'qr_code_scanner', 'code', 'terminal', 'bug_report'
  ];

  // Mapeo español-inglés para búsqueda inteligente
  const terminosEspanol = {
    'pollo': ['restaurant', 'fastfood', 'egg', 'dining', 'restaurant_menu', 'lunch_dining'],
    'comida': ['restaurant', 'fastfood', 'dining', 'local_dining', 'restaurant_menu', 'lunch_dining', 'dinner_dining'],
    'pizza': ['local_pizza', 'restaurant', 'fastfood', 'dining', 'restaurant_menu'],
    'cafe': ['local_cafe', 'coffee', 'coffee_maker', 'emoji_food_beverage'],
    'auto': ['directions_car', 'local_taxi', 'drive_eta', 'car_rental', 'electric_car'],
    'coche': ['directions_car', 'local_taxi', 'drive_eta', 'car_rental'],
    'moto': ['two_wheeler', 'motorcycle', 'moped', 'electric_bike', 'sports_motorsports'],
    'bicicleta': ['pedal_bike', 'directions_bike', 'electric_bike'],
    'bici': ['pedal_bike', 'directions_bike', 'electric_bike'],
    'avion': ['flight', 'flight_takeoff', 'flight_land', 'local_airport', 'airplanemode_active'],
    'casa': ['home', 'house', 'cottage', 'apartment', 'villa'],
    'tienda': ['store', 'storefront', 'local_mall', 'shopping_cart'],
    'compras': ['shopping_cart', 'shopping_bag', 'local_mall', 'storefront'],
    'paquete': ['inventory_2', 'package_2', 'local_shipping', 'inbox', 'inventory'],
    'calendario': ['calendar_month', 'event', 'today', 'date_range', 'schedule'],
    'reloj': ['access_time', 'watch', 'timer', 'schedule', 'alarm'],
    'telefono': ['phone', 'smartphone', 'call', 'phone_android', 'phone_iphone'],
    'email': ['email', 'mail', 'send', 'alternate_email'],
    'correo': ['email', 'mail', 'send', 'alternate_email'],
    'musica': ['music_note', 'audiotrack', 'album', 'library_music', 'piano'],
    'libro': ['book', 'menu_book', 'library_books', 'auto_stories', 'import_contacts'],
    'salud': ['local_hospital', 'medical_services', 'health_and_safety', 'vaccines', 'medications'],
    'hospital': ['local_hospital', 'medical_services', 'emergency'],
    'gimnasio': ['fitness_center', 'sports_gymnastics', 'self_improvement'],
    'herramienta': ['build', 'construction', 'handyman', 'hardware', 'engineering'],
    'construccion': ['construction', 'engineering', 'architecture', 'carpenter', 'roofing'],
    'limpieza': ['cleaning_services', 'dry_cleaning', 'local_laundry_service'],
    'dinero': ['attach_money', 'payment', 'credit_card', 'account_balance_wallet', 'monetization_on'],
    'pago': ['payment', 'credit_card', 'point_of_sale', 'account_balance_wallet'],
    'seguridad': ['security', 'lock', 'shield', 'verified_user', 'gpp_good'],
    'configuracion': ['settings', 'tune', 'build_circle', 'manage_accounts'],
  };

  // Buscar iconos con términos en español e inglés
  const buscarIconosInteligente = (query) => {
    if (!query || query.length < 2) {
      return iconosExtendidos;
    }

    const queryLower = query.toLowerCase();
    let resultados = new Set();

    // Buscar en términos en español
    Object.keys(terminosEspanol).forEach(termino => {
      if (termino.includes(queryLower) || queryLower.includes(termino)) {
        terminosEspanol[termino].forEach(icono => resultados.add(icono));
      }
    });

    // Buscar directamente en nombres de iconos (inglés)
    iconosExtendidos.forEach(icono => {
      if (icono.toLowerCase().includes(queryLower)) {
        resultados.add(icono);
      }
    });

    // Si hay resultados, retornarlos, sino retornar búsqueda simple
    return resultados.size > 0 
      ? Array.from(resultados)
      : iconosExtendidos.filter(icon => 
          icon.toLowerCase().includes(queryLower)
        );
  };

  // Actualizar búsqueda en tiempo real
  useEffect(() => {
    const resultados = buscarIconosInteligente(busquedaIcono);
    setIconosAPI(resultados);
  }, [busquedaIcono]);

  // Lista filtrada de iconos para mostrar
  const iconosFiltrados = useMemo(() => {
    const iconosBase = busquedaIcono ? iconosAPI : iconosExtendidos;
    return [...new Set(iconosBase)];
  }, [busquedaIcono, iconosAPI]);

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
          onClick={() => {
            setEditando({
              id: null,
              nombre: "",
              descripcion: "",
              tipo: "servicio",
              color: "#FF6B6B",
              icon: "",
              activa: true,
            });
            setBusquedaIcono("");
          }}
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
                <p className="ca-categoria-desc">{cat.descripcion}</p>
                <p
                  className={`ca-categoria-estado ${
                    cat.activa ? "ca-activa" : "ca-suspendida"
                  }`}
                >
                  {cat.activa ? "Activa" : "Suspendida"}
                </p>
                <p className="ca-categoria-tipo">Tipo: {cat.tipo}</p>
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
                  onClick={() => {
                    setEditando({ ...cat });
                    setBusquedaIcono("");
                  }}
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

      {/* Modal edición - MEJORADO */}
      {editando && (
        <div className="ca-modal" onClick={() => setEditando(null)}>
          <div className="ca-modal-content ca-form-avanzado" onClick={(e) => e.stopPropagation()}>
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
            <div className="ca-color-section">
              <div className="ca-color-predefinidos">
                {coloresPredefinidos.map((color, idx) => (
                  <button
                    key={idx}
                    className={`ca-color-swatch ${editando.color === color ? 'ca-color-seleccionado' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditando({ ...editando, color })}
                    title={color}
                  />
                ))}
              </div>
              <div className="ca-color-personalizado">
                <label>Color personalizado</label>
                <div className="ca-color-picker">
                  <input
                    type="color"
                    value={editando.color || "#FF6B6B"}
                    onChange={(e) =>
                      setEditando({ ...editando, color: e.target.value })
                    }
                    className="ca-input-color-picker"
                  />
                  <input
                    type="text"
                    value={editando.color || ""}
                    onChange={(e) =>
                      setEditando({ ...editando, color: e.target.value })
                    }
                    placeholder="#FF6B6B"
                    className="ca-input-color"
                  />
                  <div 
                    className="ca-color-preview" 
                    style={{ backgroundColor: editando.color }}
                  />
                </div>
              </div>
            </div>

            <label>Ícono</label>
            <div className="ca-icon-section">
              <div className="ca-icon-search">
                <input
                  type="text"
                  placeholder="🔍 Buscar: pollo, pizza, auto, casa, teléfono, música..."
                  value={busquedaIcono}
                  onChange={(e) => setBusquedaIcono(e.target.value)}
                  className="ca-input"
                />
                <div className="ca-icon-preview-header">
                  {editando.icon && (
                    <div className="ca-icon-seleccionado-preview">
                      <span 
                        className="material-icons"
                        style={{ color: editando.color, fontSize: '32px' }}
                      >
                        {editando.icon}
                      </span>
                      <small>{editando.icon}</small>
                    </div>
                  )}
                  {busquedaIcono && (
                    <div className="ca-icon-contador">
                      {iconosFiltrados.length} iconos encontrados
                    </div>
                  )}
                </div>
              </div>

              {/* Grid de íconos mejorado */}
              <div className="ca-icon-grid-mejorado">
                {iconosFiltrados.length > 0 ? (
                  iconosFiltrados.map((iconName) => (
                    <div
                      key={iconName}
                      className={`ca-icon-card ${
                        editando.icon === iconName ? "ca-icon-card-activo" : ""
                      }`}
                      onClick={() => setEditando({ ...editando, icon: iconName })}
                      title={iconName}
                    >
                      <span
                        className="material-icons ca-icon-item-mejorado"
                        style={{
                          color: editando.icon === iconName ? editando.color : '#555'
                        }}
                      >
                        {iconName}
                      </span>
                      <small className="ca-icon-nombre">{iconName}</small>
                    </div>
                  ))
                ) : busquedaIcono ? (
                  <div className="ca-sin-iconos">
<span className="material-icons" style={{ fontSize: '48px', color: '#ccc' }}>
search_off
</span>
<p>No se encontraron iconos para "{busquedaIcono}"</p>
<small>Intenta con: pollo, pizza, auto, casa, teléfono, música, comida, tienda</small>
</div>
) : null}
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
            className="ca-btn-submit"
          >
            Guardar
          </button>
          <button onClick={() => setEditando(null)} className="ca-btn-cancelar">
            Cancelar
          </button>
        </div>
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
