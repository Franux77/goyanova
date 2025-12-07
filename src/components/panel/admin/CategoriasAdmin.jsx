// CategoriasAdmin.jsx
import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../../utils/supabaseClient";
import "./CategoriasAdmin.css";
import { materialIconsList } from "../../../utils/materialIconsList";
import Loading from '../../loading/Loading';

// Función para normalizar texto (quitar acentos, minúsculas, etc)
const normalizarTexto = (texto) => {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

// Función para calcular similitud entre strings (Levenshtein simplificado)
const similitudTexto = (a, b) => {
  a = normalizarTexto(a);
  b = normalizarTexto(b);
  
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.8;
  
  let matches = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) matches++;
  }
  return matches / Math.max(a.length, b.length);
};

// Función para buscar iconos en múltiples fuentes online
const buscarIconosOnline = async (query) => {
  try {
    const queryNorm = normalizarTexto(query);
    let resultados = new Set();

    // ==========================================
    // FUENTE 1: materialIconsList (local/importado)
    // ==========================================
    if (materialIconsList && materialIconsList.length > 0) {
      materialIconsList.forEach(icon => {
        const iconNorm = normalizarTexto(icon);
        if (iconNorm.includes(queryNorm) || similitudTexto(icon, query) > 0.6) {
          resultados.add(icon);
        }
      });
    }

    // ==========================================
    // FUENTE 2: Material Icons desde GitHub (JSON estático)
    // ==========================================
    try {
      const responseMaterial = await fetch(
        'https://raw.githubusercontent.com/google/material-design-icons/master/font/MaterialIcons-Regular.codepoints'
      );
      
      if (responseMaterial.ok) {
        const texto = await responseMaterial.text();
        const lineas = texto.split('\n');
        
        lineas.forEach(linea => {
          const [nombre] = linea.split(' ');
          if (nombre) {
            const nombreNorm = normalizarTexto(nombre);
            if (nombreNorm.includes(queryNorm) || similitudTexto(nombre, query) > 0.6) {
              resultados.add(nombre);
            }
          }
        });
      }
    } catch (err) {
      //console.log('Material Icons GitHub no disponible');
    }

    // ==========================================
    // FUENTE 3: Iconify API (busca en múltiples librerías)
    // ==========================================
    try {
      const responseIconify = await fetch(
        `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=50&prefix=ic,material-icons`
      );
      
      if (responseIconify.ok) {
        const data = await responseIconify.json();
        if (data.icons) {
          data.icons.forEach(icon => {
            // Extraer solo el nombre del icono (después de ":")
            const nombre = icon.split(':')[1] || icon;
            resultados.add(nombre);
          });
        }
      }
    } catch (err) {
      //console.log('Iconify API no disponible');
    }

    // ==========================================
    // FUENTE 4: Material Design Icons (MDI) Community
    // ==========================================
    try {
      const responseMDI = await fetch(
        `https://raw.githubusercontent.com/Templarian/MaterialDesign/master/meta.json`
      );
      
      if (responseMDI.ok) {
        const dataMDI = await responseMDI.json();
        dataMDI.forEach(icon => {
          const nombre = icon.name;
          const nombreNorm = normalizarTexto(nombre);
          
          // Buscar en nombre y aliases/tags
          const enNombre = nombreNorm.includes(queryNorm);
          const enTags = icon.tags?.some(tag => 
            normalizarTexto(tag).includes(queryNorm)
          );
          
          if (enNombre || enTags || similitudTexto(nombre, query) > 0.6) {
            // Convertir formato MDI a Material Icons (quitar guiones)
            const nombreMaterial = nombre.replace(/-/g, '_');
            resultados.add(nombreMaterial);
          }
        });
      }
    } catch (err) {
      //console.log('MDI no disponible');
    }

    // ==========================================
    // FUENTE 5: Búsqueda en traducción español-inglés (API)
    // ==========================================
    try {
      // Intentar traducir la query al inglés para mejor búsqueda
      const terminosRelacionados = obtenerTerminosRelacionados(query);
      
      for (const termino of terminosRelacionados) {
        // Buscar iconos relacionados con términos en inglés
        const responseTranslate = await fetch(
          `https://api.iconify.design/search?query=${encodeURIComponent(termino)}&limit=30&prefix=material-icons`
        );
        
        if (responseTranslate.ok) {
          const data = await responseTranslate.json();
          if (data.icons) {
            data.icons.forEach(icon => {
              const nombre = icon.split(':')[1] || icon;
              resultados.add(nombre);
            });
          }
        }
      }
    } catch (err) {
      //console.log('Búsqueda por términos relacionados no disponible');
    }

    // ==========================================
    // FALLBACK: Lista expandida local
    // ==========================================
    if (resultados.size === 0) {
      const iconosComplementarios = [
        // Bebidas y comida
        'wine_bar', 'liquor', 'sports_bar', 'local_drink', 'emoji_food_beverage',
        'local_cafe', 'coffee', 'coffee_maker', 'free_breakfast', 'local_bar',
        'tapas', 'brunch_dining', 'lunch_dining', 'dinner_dining', 'breakfast_dining',
        'ramen_dining', 'rice_bowl', 'bakery_dining', 'local_pizza', 'restaurant',
        'flatware', 'kitchen', 'microwave', 'blender', 'cake', 'icecream',
        // Rostro y emociones
        'face', 'sentiment_satisfied', 'sentiment_very_satisfied', 'mood', 'emoji_emotions',
        'sentiment_neutral', 'sentiment_dissatisfied', 'face_retouching_natural',
        'face_2', 'face_3', 'face_4', 'face_5', 'face_6', 'mask_face',
        // Copa y vasos específicos
        'wine_bar', 'local_bar', 'liquor', 'sports_bar', 'local_drink',
        // Más iconos útiles
        'celebration', 'party_mode', 'nightlife', 'festival', 'volunteer_activism'
      ];
      
      iconosComplementarios.forEach(icon => {
        const iconNorm = normalizarTexto(icon);
        if (iconNorm.includes(queryNorm) || similitudTexto(icon, query) > 0.6) {
          resultados.add(icon);
        }
      });
    }

    return Array.from(resultados).slice(0, 80); // Aumentar límite a 80
    
  } catch (error) {
    //console.log('Búsqueda online no disponible, usando búsqueda local');
    return [];
  }
};

// Función auxiliar para obtener términos relacionados en inglés
const obtenerTerminosRelacionados = (query) => {
  const mapa = {
    'copa': ['cup', 'wine', 'glass', 'drink', 'bar'],
    'vaso': ['glass', 'cup', 'drink', 'beverage'],
    'vino': ['wine', 'bar', 'drink', 'liquor'],
    'cerveza': ['beer', 'bar', 'drink', 'pub'],
    'bebida': ['drink', 'beverage', 'bar', 'liquid'],
    'cara': ['face', 'head', 'emoji', 'mood', 'sentiment'],
    'rostro': ['face', 'portrait', 'head', 'avatar'],
    'comida': ['food', 'meal', 'dining', 'restaurant', 'eat'],
    'casa': ['home', 'house', 'building', 'residential'],
    'auto': ['car', 'vehicle', 'automobile', 'drive'],
    'telefono': ['phone', 'mobile', 'call', 'smartphone'],
    'musica': ['music', 'audio', 'sound', 'song'],
    'libro': ['book', 'read', 'library', 'literature'],
    'tienda': ['store', 'shop', 'market', 'retail'],
    'reloj': ['clock', 'time', 'watch', 'schedule'],
  };
  
  const queryNorm = normalizarTexto(query);
  
  // Buscar coincidencias exactas o parciales
  for (const [espanol, ingles] of Object.entries(mapa)) {
    if (normalizarTexto(espanol).includes(queryNorm) || 
        queryNorm.includes(normalizarTexto(espanol))) {
      return ingles;
    }
  }
  
  return [query]; // Devolver la query original si no hay mapeo
};

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
  const [busquedaOnline, setBusquedaOnline] = useState(false);
  const [sugerenciaTermino, setSugerenciaTermino] = useState('');
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
    // Comida
    'pollo': ['restaurant', 'fastfood', 'egg', 'dining', 'lunch_dining'],
    'comida': ['restaurant', 'fastfood', 'dining', 'local_dining', 'restaurant_menu'],
    'pizza': ['local_pizza', 'restaurant', 'fastfood'],
    'cafe': ['local_cafe', 'coffee', 'coffee_maker'],
    'desayuno': ['breakfast_dining', 'local_cafe', 'coffee'],
    'almuerzo': ['lunch_dining', 'restaurant', 'local_dining'],
    'cena': ['dinner_dining', 'restaurant', 'local_dining'],
    'hamburguesa': ['fastfood', 'lunch_dining'],
    'pastel': ['cake', 'bakery_dining'],
    'panaderia': ['bakery_dining', 'storefront'],
    'heladeria': ['icecream', 'store'],
    'bar': ['local_bar', 'nightlife', 'wine_bar'],
    'restaurante': ['restaurant', 'local_dining', 'restaurant_menu'],
    
    // Transporte
    'auto': ['directions_car', 'local_taxi', 'drive_eta', 'car_rental'],
    'coche': ['directions_car', 'local_taxi', 'drive_eta'],
    'taxi': ['local_taxi', 'drive_eta'],
    'moto': ['two_wheeler', 'motorcycle', 'moped'],
    'motocicleta': ['motorcycle', 'two_wheeler'],
    'bicicleta': ['pedal_bike', 'directions_bike'],
    'bici': ['pedal_bike', 'directions_bike'],
    'avion': ['flight', 'flight_takeoff', 'local_airport'],
    'vuelo': ['flight', 'flight_takeoff', 'flight_land'],
    'aeropuerto': ['local_airport', 'flight'],
    'tren': ['train', 'tram', 'subway'],
    'colectivo': ['directions_bus', 'airport_shuttle'],
    'autobus': ['directions_bus', 'airport_shuttle'],
    'barco': ['directions_boat', 'sailing', 'ferry'],
    'delivery': ['delivery_dining', 'local_shipping'],
    'envio': ['local_shipping', 'delivery_dining'],
    
    // Lugares
    'casa': ['home', 'house', 'cottage', 'apartment'],
    'hogar': ['home', 'house'],
    'edificio': ['apartment', 'business', 'domain'],
    'departamento': ['apartment', 'house'],
    'tienda': ['store', 'storefront', 'local_mall'],
    'negocio': ['business', 'storefront', 'store'],
    'supermercado': ['local_grocery_store', 'shopping_cart'],
    'mercado': ['store', 'local_grocery_store'],
    'compras': ['shopping_cart', 'shopping_bag', 'local_mall'],
    'farmacia': ['local_pharmacy', 'medical_services'],
    'hospital': ['local_hospital', 'medical_services'],
    'hotel': ['hotel', 'local_hotel'],
    'oficina': ['business', 'work', 'business_center'],
    'escuela': ['school', 'local_library'],
    'universidad': ['school', 'account_balance'],
    'banco': ['account_balance', 'local_atm'],
    'iglesia': ['church', 'temple_buddhist'],
    'museo': ['museum', 'account_balance'],
    'parque': ['park', 'nature', 'landscape'],
    'playa': ['beach_access', 'waves'],
    
    // Servicios
    'herramienta': ['build', 'construction', 'handyman'],
    'construccion': ['construction', 'engineering', 'architecture'],
    'electricidad': ['electrical_services', 'flash_on'],
    'electricista': ['electrical_services', 'build'],
    'plomeria': ['plumbing', 'water_drop'],
    'plomero': ['plumbing', 'handyman'],
    'carpinteria': ['carpenter', 'construction'],
    'carpintero': ['carpenter', 'handyman'],
    'limpieza': ['cleaning_services', 'dry_cleaning'],
    'lavanderia': ['local_laundry_service', 'dry_cleaning'],
    'tintoreria': ['dry_cleaning', 'local_laundry_service'],
    'reparacion': ['build', 'handyman', 'construction'],
    'mantenimiento': ['handyman', 'build', 'settings'],
    'pintura': ['format_paint', 'brush', 'palette'],
    'pintor': ['format_paint', 'brush'],

    // Bebidas y recipientes (NUEVO)
    'copa': ['wine_bar', 'local_bar', 'liquor', 'emoji_food_beverage'],
    'vaso': ['local_bar', 'local_drink', 'emoji_food_beverage', 'liquor'],
    'vino': ['wine_bar', 'liquor', 'local_bar'],
    'cerveza': ['sports_bar', 'local_bar', 'liquor'],
    'bebida': ['local_drink', 'local_bar', 'emoji_food_beverage', 'liquor'],
    'trago': ['local_bar', 'liquor', 'wine_bar'],
    'cocktail': ['local_bar', 'liquor', 'nightlife'],
    'taza': ['local_cafe', 'coffee', 'emoji_food_beverage'],
    'jarra': ['local_bar', 'liquor', 'local_drink'],
    
    // Salud y Fitness
    'gimnasio': ['fitness_center', 'sports_gymnastics'],
    'deporte': ['fitness_center', 'sports_soccer'],
    'natacion': ['pool', 'waves'],
    'piscina': ['pool', 'hot_tub'],
    'spa': ['spa', 'hot_tub', 'self_improvement'],
    'yoga': ['self_improvement', 'spa'],
    'futbol': ['sports_soccer', 'sports_football'],
    'tenis': ['sports_tennis'],
    'basquet': ['sports_basketball'],
    'basketball': ['sports_basketball'],
    'medico': ['medical_services', 'local_hospital'],
    'doctor': ['medical_services', 'local_hospital'],
    'enfermero': ['medical_services', 'health_and_safety'],
    'medicamento': ['medications', 'local_pharmacy'],
    'pastilla': ['medications', 'local_pharmacy'],
    
    // Tecnología
    'computadora': ['computer', 'laptop'],
    'ordenador': ['computer', 'laptop'],
    'celular': ['smartphone', 'phone_android'],
    'telefono': ['phone', 'smartphone', 'call'],
    'tablet': ['tablet', 'phone_android'],
    'internet': ['wifi', 'router', 'signal_wifi_4_bar'],
    'wifi': ['wifi', 'router', 'signal_wifi_4_bar'],
    'bluetooth': ['bluetooth', 'headset'],
    'auriculares': ['headphones', 'headset', 'earbuds'],
    'television': ['tv', 'live_tv'],
    'tele': ['tv', 'live_tv'],
    
    // Comunicación
    'email': ['email', 'mail', 'send'],
    'correo': ['email', 'mail', 'send'],
    'mensaje': ['message', 'textsms', 'chat'],
    'chat': ['chat', 'message', 'forum'],
    'llamada': ['call', 'phone', 'video_call'],
    
    // Entretenimiento
    'pelicula': ['movie', 'theaters', 'live_tv'],
    'cine': ['theaters', 'movie'],
    'musica': ['music_note', 'audiotrack', 'library_music'],
    'cancion': ['music_note', 'audiotrack'],
    'radio': ['radio', 'podcasts'],
    'fiesta': ['celebration', 'party_mode', 'cake'],
    'juego': ['games', 'sports_esports', 'casino'],
    'videojuego': ['sports_esports', 'videogame_asset'],
    
    // Documentos
    'documento': ['description', 'article', 'assignment'],
    'archivo': ['folder', 'insert_drive_file'],
    'carpeta': ['folder', 'folder_open'],
    'pdf': ['picture_as_pdf', 'description'],
    
    // Seguridad
    'seguridad': ['security', 'lock', 'shield'],
    'candado': ['lock', 'vpn_key'],
    'llave': ['vpn_key', 'key'],
    'alarma': ['alarm', 'notification_important'],
    
    // Otros comunes
    'paquete': ['inventory_2', 'package_2', 'local_shipping'],
    'caja': ['inventory_2', 'archive'],
    'calendario': ['calendar_month', 'event', 'today'],
    'reloj': ['access_time', 'watch', 'schedule'],
    'tiempo': ['access_time', 'schedule', 'timer'],
    'dinero': ['attach_money', 'payment', 'monetization_on'],
    'pago': ['payment', 'credit_card', 'account_balance_wallet'],
    'tarjeta': ['credit_card', 'card_membership'],
    'efectivo': ['attach_money', 'local_atm'],
    'configuracion': ['settings', 'tune', 'build_circle'],
    'ajustes': ['settings', 'tune'],
    'buscar': ['search', 'manage_search'],
    'usuario': ['person', 'account_circle'],
    'perfil': ['person', 'account_circle'],
    'grupo': ['group', 'people'],
    'favorito': ['favorite', 'star'],
    'estrella': ['star', 'grade'],
    'like': ['thumb_up', 'favorite'],
    'compartir': ['share', 'ios_share'],
    'descarga': ['download', 'cloud_download'],
    'subir': ['upload', 'cloud_upload'],
    'foto': ['photo', 'camera_alt', 'image'],
    'camara': ['photo_camera', 'camera_alt'],
    'imagen': ['image', 'photo', 'collections'],
    'video': ['videocam', 'movie', 'video_library'],
    'ubicacion': ['location_on', 'place', 'map'],
    'mapa': ['map', 'explore'],
    'notificacion': ['notifications', 'notification_important'],
    'campana': ['notifications', 'notification_add'],
    'luz': ['lightbulb', 'wb_incandescent', 'flash_on'],
    'lampara': ['lightbulb', 'wb_incandescent'],
    'bateria': ['battery_full', 'battery_charging_full'],
    'energia': ['bolt', 'flash_on', 'power'],
    'clima': ['wb_sunny', 'wb_cloudy', 'ac_unit'],
    'sol': ['wb_sunny', 'light_mode'],
    'lluvia': ['weather_snowy', 'thunderstorm'],
    'nube': ['cloud', 'wb_cloudy'],
    'mascota': ['pets', 'cruelty_free'],
    'perro': ['pets'],
    'gato': ['pets'],
    'animal': ['pets', 'cruelty_free'],
    
    // Armas y seguridad (ejemplos solicitados)
    'arma': ['security', 'shield', 'gpp_good'],
    'pistola': ['security', 'shield'],
    'proteccion': ['shield', 'security', 'verified_user'],
    
    // Cara y rostro (AGREGAR)
    'cara': ['face', 'sentiment_satisfied', 'mood', 'emoji_emotions', 'face_retouching_natural'],
    'rostro': ['face', 'sentiment_satisfied', 'mood', 'portrait', 'face_2'],
    'emoji': ['emoji_emotions', 'sentiment_satisfied', 'mood', 'face'],
    'sonrisa': ['sentiment_satisfied', 'sentiment_very_satisfied', 'mood_good'],
    
    // Oficios
    'oficio': ['work', 'engineering', 'handyman', 'construction'],
    'trabajo': ['work', 'business_center', 'badge'],
    'profesion': ['work', 'school', 'badge'],
    'obrero': ['construction', 'engineering'],
    'mecanico': ['build', 'construction', 'engineering'],
    
    // Limpieza específica
    'trapeador': ['cleaning_services', 'dry_cleaning'],
    'escoba': ['cleaning_services'],
    'trapo': ['cleaning_services', 'dry_cleaning'],
    'limpiar': ['cleaning_services'],
  };

  const buscarIconosInteligente = async (query) => {
    if (!query || query.length < 2) {
      setBusquedaOnline(false);
      setSugerenciaTermino('');
      return iconosExtendidos;
    }

    const queryNormalizado = normalizarTexto(query);
    let resultados = new Set();
    let mejorSugerencia = '';
    let mejorSimilitud = 0;

    // 1. Buscar coincidencias exactas en términos españoles
    Object.keys(terminosEspanol).forEach(termino => {
      const terminoNorm = normalizarTexto(termino);
      const similitud = similitudTexto(termino, query);
      
      if (terminoNorm === queryNormalizado || terminoNorm.includes(queryNormalizado)) {
        terminosEspanol[termino].forEach(icono => resultados.add(icono));
      }
      
      // Guardar mejor sugerencia
      if (similitud > mejorSimilitud && similitud > 0.5) {
        mejorSimilitud = similitud;
        mejorSugerencia = termino;
      }
    });

    // 2. Buscar directamente en nombres de iconos (inglés)
    iconosExtendidos.forEach(icono => {
      if (normalizarTexto(icono).includes(queryNormalizado)) {
        resultados.add(icono);
      }
    });

    // 3. Búsqueda difusa si hay pocos resultados
    if (resultados.size < 3) {
      Object.keys(terminosEspanol).forEach(termino => {
        const similitud = similitudTexto(termino, query);
        if (similitud > 0.6) {
          terminosEspanol[termino].forEach(icono => resultados.add(icono));
        }
      });
      
      iconosExtendidos.forEach(icono => {
        const similitud = similitudTexto(icono, query);
        if (similitud > 0.7) {
          resultados.add(icono);
        }
      });
    }

    // 4. Si no hay resultados, buscar online
    if (resultados.size === 0) {
      setBusquedaOnline(true);
      setCargandoIconos(true);
      
      const iconosOnline = await buscarIconosOnline(query);
      setCargandoIconos(false);
      
      if (iconosOnline.length > 0) {
        setSugerenciaTermino('');
        return iconosOnline;
      } else if (mejorSugerencia) {
        setSugerenciaTermino(mejorSugerencia);
      }
    } else {
      setBusquedaOnline(false);
      setSugerenciaTermino('');
    }

    return Array.from(resultados);
  };

  // Actualizar búsqueda en tiempo real
  useEffect(() => {
    const buscar = async () => {
      const resultados = await buscarIconosInteligente(busquedaIcono);
      setIconosAPI(resultados);
    };
    
    // Debounce para no hacer requests constantemente
    const timer = setTimeout(() => {
      buscar();
    }, 400);
    
    return () => clearTimeout(timer);
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
            <article 
              key={cat.id} 
              className="ca-categoria-card"
              style={{
                '--card-color': cat.color || '#1774f6',
                '--card-color-light': cat.color ? `${cat.color}99` : '#45B7D1'
              }}
            >
              <div className="ca-categoria-header">
                <div className="ca-categoria-icono">
                  {cat.icon ? (
                    <span className="material-icons">{cat.icon}</span>
                  ) : (
                    <span className="material-icons">category</span>
                  )}
                </div>
                <div className="ca-categoria-info">
                  <h3 className="ca-categoria-nombre">{cat.nombre}</h3>
                  <div className="ca-categoria-meta">
                    <span
                      className={`ca-categoria-estado ${
                        cat.activa ? "ca-activa" : "ca-suspendida"
                      }`}
                    >
                      <span className="material-icons" style={{ fontSize: '14px' }}>
                        {cat.activa ? "check_circle" : "cancel"}
                      </span>
                      {cat.activa ? "Activa" : "Suspendida"}
                    </span>
                    <span className="ca-categoria-tipo">
                      {cat.tipo === 'servicio' ? 'Servicio' : 'Producto'}
                    </span>
                  </div>
                </div>
              </div>
              
              {cat.descripcion && (
                <p className="ca-categoria-desc">{cat.descripcion}</p>
              )}
              
              <div className="ca-categoria-acciones">
                <button
                  className={`ca-btn-icon ${
                    cat.activa ? "ca-btn-suspender" : "ca-btn-habilitar"
                  }`}
                  onClick={() => toggleEstado(cat.id, cat.activa, cat.nombre)}
                  title={cat.activa ? "Suspender" : "Habilitar"}
                >
                  <span className="material-icons">
                    {cat.activa ? "block" : "check_circle"}
                  </span>
                </button>
                <button
                  className="ca-btn-icon ca-btn-editar"
                  onClick={() => {
                    setEditando({ ...cat });
                    setBusquedaIcono("");
                  }}
                  title="Editar"
                >
                  <span className="material-icons">edit</span>
                </button>
                <button
                  className="ca-btn-icon ca-btn-eliminar"
                  onClick={() => eliminarCategoria(cat.id, cat.nombre)}
                  title="Eliminar"
                >
                  <span className="material-icons">delete</span>
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
              <p className="ca-error">Ya existe una categoría con este nombre.</p>
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
                  placeholder="Buscar: pollo, pizza, auto, casa, teléfono, música..."
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
                      {cargandoIconos ? (
                        <span>Buscando iconos online...</span>
                      ) : busquedaOnline ? (
                        <span>{iconosFiltrados.length} iconos encontrados online</span>
                      ) : (
                        <span>{iconosFiltrados.length} iconos encontrados</span>
                      )}
                    </div>
                  )}
                </div>
                {sugerenciaTermino && (
                  <div className="ca-icon-sugerencia" style={{ 
                    fontSize: '12px', 
                    color: '#666', 
                    marginTop: '4px' 
                  }}>
                    ¿Quisiste decir "<strong 
                      onClick={() => setBusquedaIcono(sugerenciaTermino)}
                      style={{ cursor: 'pointer' }}
                    >{sugerenciaTermino}</strong>"?
                  </div>
                )}
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
                    {cargandoIconos ? (
                      <>
                        <span className="material-icons" style={{ fontSize: '48px', color: '#4ECDC4', animation: 'spin 1s linear infinite' }}>
                          refresh
                        </span>
                        <p>Buscando "{busquedaIcono}" en Material Icons...</p>
                      </>
                    ) : (
                      <>
                        <span className="material-icons" style={{ fontSize: '48px', color: '#ccc' }}>
                          search_off
                        </span>
                        <p>No se encontraron iconos para "{busquedaIcono}"</p>
                        {sugerenciaTermino && (
                          <p style={{ color: '#4ECDC4', marginTop: '8px' }}>
                            ¿Quisiste decir "<strong 
                              onClick={() => setBusquedaIcono(sugerenciaTermino)}
                              style={{ cursor: 'pointer' }}
                            >{sugerenciaTermino}</strong>"?
                          </p>
                        )}
                        <small>
                          Ejemplos: copa, vino, bebida, taza, vaso, pollo, pizza, edificio, 
                          limpieza, herramienta, oficina, trabajo
                        </small>
                        <small style={{ display: 'block', marginTop: '8px', color: '#888' }}>
                          La búsqueda incluye Material Icons completo online
                        </small>
                      </>
                    )}
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