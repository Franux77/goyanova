// Catálogo de íconos (Material Icons) con palabras en español para buscarlos.
// Cada ícono: nombre técnico, cómo se llama en criollo y palabras para encontrarlo.

const i = (nombre, titulo, palabras) => ({ nombre, titulo, palabras });

export const GRUPOS_ICONOS = [
  {
    clave: 'comida',
    titulo: 'Comida y bebida',
    iconos: [
      i('restaurant', 'Restaurante', 'restaurante comida cubiertos almuerzo cena rotiseria comedor'),
      i('fastfood', 'Comida rápida', 'hamburguesa papas fritas comida rapida lomito pancho'),
      i('local_pizza', 'Pizza', 'pizza pizzeria prepizza'),
      i('lunch_dining', 'Sándwich', 'sandwich hamburguesa lomito almuerzo'),
      i('dinner_dining', 'Plato de comida', 'plato pastas comida casera vianda cena guiso'),
      i('ramen_dining', 'Sopa / fideos', 'sopa fideos ramen guiso caldo'),
      i('rice_bowl', 'Bowl', 'bowl arroz ensalada saludable'),
      i('bakery_dining', 'Panadería', 'pan panaderia facturas medialunas chipa'),
      i('cake', 'Torta', 'torta reposteria cumpleanos postre pasteleria dulce'),
      i('icecream', 'Helado', 'helado heladeria postre palito'),
      i('cookie', 'Galletita', 'galletita galletas dulce alfajor golosina'),
      i('egg', 'Huevo', 'huevo huevos maples granja'),
      i('egg_alt', 'Huevo frito', 'desayuno huevo'),
      i('breakfast_dining', 'Desayuno', 'desayuno tostadas merienda'),
      i('brunch_dining', 'Brunch', 'brunch merienda'),
      i('local_cafe', 'Café', 'cafe cafeteria taza merienda'),
      i('coffee', 'Taza', 'taza cafe te mate'),
      i('emoji_food_beverage', 'Té', 'te infusion mate'),
      i('local_bar', 'Tragos', 'tragos bar coctel barra bartender'),
      i('wine_bar', 'Vino', 'vino copa vinoteca'),
      i('sports_bar', 'Cerveza', 'cerveza chopp cerveceria'),
      i('liquor', 'Bebidas alcohólicas', 'bebidas licor alcohol drugstore'),
      i('local_drink', 'Bebida', 'bebida jugo vaso agua'),
      i('kebab_dining', 'Brochette', 'brochette carne asado parrilla'),
      i('outdoor_grill', 'Parrilla', 'parrilla asado parrillero choripan'),
      i('set_meal', 'Menú', 'menu pescado plato del dia'),
      i('soup_kitchen', 'Olla', 'olla comida casera guiso'),
      i('takeout_dining', 'Para llevar', 'para llevar delivery vianda comida'),
      i('restaurant_menu', 'Menú de restaurante', 'menu carta cubiertos'),
      i('eco', 'Hoja', 'vegano vegetariano natural organico dietetica fruta verduleria saludable'),
      i('no_food', 'Sin TACC', 'sin tacc celiaco sin gluten'),
      i('kitchen', 'Cocina', 'cocina heladera'),
      i('blender', 'Licuadora', 'licuados batidos smoothies'),
      i('microwave', 'Microondas', 'microondas electrodomestico'),
    ],
  },
  {
    clave: 'comercio',
    titulo: 'Negocios y compras',
    iconos: [
      i('storefront', 'Local / tienda', 'tienda local negocio comercio almacen kiosco'),
      i('store', 'Negocio', 'negocio tienda comercio'),
      i('local_grocery_store', 'Almacén', 'almacen supermercado changuito despensa mayorista'),
      i('shopping_cart', 'Carrito', 'carrito compras super'),
      i('shopping_bag', 'Bolsa de compras', 'bolsa compras ropa regalos boutique'),
      i('local_mall', 'Shopping', 'shopping compras regaleria'),
      i('local_convenience_store', 'Kiosco', 'kiosco drugstore 24 horas golosinas'),
      i('card_giftcard', 'Regalo', 'regalo regaleria souvenir sorpresa'),
      i('redeem', 'Regalo con moño', 'regalo canje souvenir'),
      i('sell', 'Etiqueta de precio', 'venta precio oferta etiqueta'),
      i('local_offer', 'Oferta', 'oferta descuento promo'),
      i('inventory_2', 'Caja / mercadería', 'caja mercaderia deposito mayorista paquete'),
      i('point_of_sale', 'Caja registradora', 'caja registradora cobro'),
      i('local_pharmacy', 'Farmacia', 'farmacia remedios medicamentos'),
      i('local_florist', 'Flores', 'flores floreria vivero plantas ramo'),
      i('liquor', 'Vinoteca', 'vinoteca bebidas licoreria'),
      i('local_gas_station', 'Estación de servicio', 'nafta combustible estacion de servicio surtidor'),
      i('auto_stories', 'Catálogo', 'catalogo revista venta por catalogo'),
      i('menu_book', 'Libro', 'libro libreria lectura'),
      i('toys', 'Juguetes', 'juguetes jugueteria ninos'),
      i('cruelty_free', 'Conejo', 'mascotas veterinaria conejo animales'),
      i('celebration', 'Cotillón', 'cotillon fiesta globos cumpleanos'),
      i('chair', 'Mueble', 'mueble muebleria silla sillon hogar'),
      i('bed', 'Cama', 'cama colchones colchoneria dormitorio'),
      i('weekend', 'Sillón', 'sillon tapiceria living'),
      i('light', 'Lámpara', 'lampara iluminacion casa de electricidad'),
      i('tv', 'Televisor', 'tv televisor electrodomesticos'),
      i('kitchen', 'Heladera', 'heladera electrodomesticos'),
      i('hardware', 'Ferretería', 'ferreteria herramientas tornillos'),
      i('format_paint', 'Pinturería', 'pintureria pintura rodillo'),
    ],
  },
  {
    clave: 'ropa',
    titulo: 'Ropa y belleza',
    iconos: [
      i('checkroom', 'Ropa', 'ropa perchero indumentaria feria tienda de ropa'),
      i('dry_cleaning', 'Ropa colgada', 'lavanderia tintoreria ropa'),
      i('woman', 'Mujer', 'ropa de mujer femenino dama'),
      i('man', 'Hombre', 'ropa de hombre masculino caballero'),
      i('child_care', 'Bebé', 'bebe ropa infantil ninos'),
      i('diamond', 'Joya', 'joyeria joyas anillo diamante'),
      i('watch', 'Reloj', 'reloj relojeria'),
      i('content_cut', 'Tijera', 'tijera peluqueria corte barberia costura'),
      i('face', 'Cara', 'cara rostro estetica'),
      i('face_retouching_natural', 'Estética facial', 'estetica facial cosmetologia belleza maquillaje'),
      i('face_3', 'Peinado', 'peinado peluqueria pelo'),
      i('spa', 'Spa', 'spa masajes relax bienestar aromaticas'),
      i('self_improvement', 'Meditación', 'yoga meditacion relax pilates'),
      i('brush', 'Pincel', 'maquillaje pincel arte pintura'),
      i('back_hand', 'Mano', 'manicura unas manos'),
      i('visibility', 'Ojo', 'pestanas lashista cejas mirada optica'),
      i('soap', 'Jabón', 'jabon higiene cosmetica limpieza'),
      i('sanitizer', 'Perfume / spray', 'perfume fragancia aromatizante spray'),
      i('local_laundry_service', 'Lavarropas', 'lavanderia lavarropas lavado'),
      i('iron', 'Plancha', 'planchado costura modista'),
      i('ice_skating', 'Zapato', 'zapato calzado zapateria'),
      i('backpack', 'Mochila', 'mochila marroquineria bolso cartera'),
    ],
  },
  {
    clave: 'hogar',
    titulo: 'Hogar y oficios',
    iconos: [
      i('handyman', 'Herramientas', 'herramientas arreglos oficios mantenimiento changas'),
      i('build', 'Llave inglesa', 'mecanico arreglos reparacion taller'),
      i('construction', 'Construcción', 'construccion albanil obra constructora'),
      i('plumbing', 'Plomería', 'plomero plomeria cano agua gasista'),
      i('electrical_services', 'Electricidad', 'electricista electricidad enchufe instalacion'),
      i('bolt', 'Rayo', 'electricidad energia luz'),
      i('carpenter', 'Carpintería', 'carpintero carpinteria madera muebles'),
      i('format_paint', 'Pintura', 'pintor pintura rodillo pintar'),
      i('roofing', 'Techos', 'techista techo zingueria'),
      i('foundation', 'Cimientos', 'construccion obra cimientos'),
      i('architecture', 'Arquitectura', 'arquitecto planos diseno'),
      i('engineering', 'Ingeniería', 'ingeniero tecnico'),
      i('hvac', 'Aire acondicionado', 'aire acondicionado refrigeracion climatizacion'),
      i('ac_unit', 'Frío', 'refrigeracion frio aire'),
      i('cleaning_services', 'Limpieza', 'limpieza empleada domestica limpiar'),
      i('pest_control', 'Fumigación', 'fumigacion plagas insectos'),
      i('yard', 'Jardín', 'jardin jardinero jardineria'),
      i('grass', 'Pasto', 'pasto cortador de pasto cesped desmalezado'),
      i('fence', 'Cerca', 'rejas herreria cerco'),
      i('window', 'Ventana', 'ventana vidrio vidriero aberturas'),
      i('door_front', 'Puerta', 'puerta aberturas cerrajeria'),
      i('key', 'Llave', 'llave cerrajero cerrajeria'),
      i('lock', 'Candado', 'cerradura seguridad'),
      i('home_repair_service', 'Caja de herramientas', 'reparaciones del hogar servicios del hogar'),
      i('water_drop', 'Gota de agua', 'agua pileta tanque'),
      i('pool', 'Pileta', 'pileta piscina natacion'),
      i('house', 'Casa', 'casa hogar vivienda'),
      i('home', 'Inicio / hogar', 'hogar casa'),
      i('apartment', 'Departamento', 'departamento edificio alquiler inmobiliaria'),
      i('cottage', 'Casa quinta', 'casa quinta cabana campo'),
      i('real_estate_agent', 'Inmobiliaria', 'inmobiliaria venta alquiler propiedades'),
      i('chair_alt', 'Silla', 'silla tapizado muebles'),
      i('recycling', 'Reciclaje', 'reciclaje chatarra metales'),
      i('delete', 'Residuos', 'residuos basura volquete'),
    ],
  },
  {
    clave: 'transporte',
    titulo: 'Autos y transporte',
    iconos: [
      i('directions_car', 'Auto', 'auto coche vehiculo agencia'),
      i('local_taxi', 'Taxi / remis', 'remis remisero taxi uber traslado'),
      i('car_repair', 'Taller mecánico', 'taller mecanico reparacion auto'),
      i('car_crash', 'Chapa y pintura', 'chapista chapa choque'),
      i('local_car_wash', 'Lavadero', 'lavadero lavado de autos'),
      i('tire_repair', 'Gomería', 'gomeria goma cubierta neumatico'),
      i('oil_barrel', 'Lubricentro', 'lubricentro aceite cambio de aceite'),
      i('two_wheeler', 'Moto', 'moto motos motocicleta'),
      i('pedal_bike', 'Bicicleta', 'bicicleta bici bicicleteria'),
      i('electric_scooter', 'Monopatín', 'monopatin scooter'),
      i('local_shipping', 'Camión / flete', 'flete fletes mudanza camion envio logistica'),
      i('delivery_dining', 'Delivery', 'delivery cadete envio moto'),
      i('airport_shuttle', 'Combi', 'combi traslado excursion minibus'),
      i('directions_bus', 'Colectivo', 'colectivo omnibus micro'),
      i('local_parking', 'Estacionamiento', 'estacionamiento cochera garage'),
      i('garage', 'Garaje', 'garaje cochera'),
      i('flight', 'Avión', 'avion vuelo viaje turismo aereo'),
      i('directions_boat', 'Lancha', 'lancha barco paseo en lancha nautica'),
      i('sailing', 'Velero', 'velero nautica rio'),
      i('kayaking', 'Kayak', 'kayak canoa remo'),
      i('inventory', 'Paquetería', 'paqueteria encomienda mensajeria'),
      i('mail', 'Mensajería', 'mensajeria cartas correo'),
    ],
  },
  {
    clave: 'salud',
    titulo: 'Salud',
    iconos: [
      i('medical_services', 'Botiquín', 'salud medico consultorio enfermeria'),
      i('local_hospital', 'Hospital', 'hospital sanatorio clinica guardia'),
      i('health_and_safety', 'Cuidado', 'salud seguridad cuidado'),
      i('medication', 'Remedio', 'remedio medicamento farmacia'),
      i('vaccines', 'Vacuna', 'vacuna inyectable enfermeria'),
      i('monitor_heart', 'Corazón', 'cardiologia corazon'),
      i('favorite', 'Corazón lleno', 'corazon salud amor'),
      i('psychology', 'Psicología', 'psicologo psicologia terapia mente'),
      i('accessible', 'Discapacidad', 'kinesiologia rehabilitacion accesible'),
      i('elderly', 'Adulto mayor', 'geriatria adulto mayor cuidador'),
      i('pregnant_woman', 'Embarazo', 'ginecologia embarazo obstetricia'),
      i('sentiment_satisfied', 'Sonrisa', 'odontologo dentista sonrisa'),
      i('biotech', 'Laboratorio', 'analisis clinicos laboratorio extraccion'),
      i('science', 'Ciencia', 'laboratorio ciencia quimica'),
      i('hearing', 'Oído', 'otorrino oido audiologia'),
      i('visibility', 'Vista', 'oftalmologia optica vista'),
      i('local_pharmacy', 'Cruz de farmacia', 'farmacia ortopedia'),
      i('emergency', 'Emergencia', 'emergencia ambulancia urgencia'),
      i('restaurant', 'Nutrición', 'nutricionista dieta'),
    ],
  },
  {
    clave: 'educacion',
    titulo: 'Educación y profesionales',
    iconos: [
      i('school', 'Educación', 'escuela educacion clases instituto'),
      i('menu_book', 'Libro abierto', 'apoyo escolar clases particulares estudio'),
      i('history_edu', 'Escritura', 'profesor maestra particular tareas'),
      i('calculate', 'Calculadora', 'contador contable matematica impuestos'),
      i('gavel', 'Martillo de juez', 'abogado legal juicio escribano'),
      i('balance', 'Balanza', 'abogado justicia mediacion'),
      i('work', 'Maletín', 'trabajo profesional empleo oficina'),
      i('business_center', 'Oficina', 'oficina empresa consultora'),
      i('badge', 'Credencial', 'seguridad vigilancia credencial'),
      i('security', 'Escudo', 'seguridad privada vigilancia alarmas'),
      i('campaign', 'Megáfono', 'marketing publicidad agencia de marketing'),
      i('trending_up', 'Crecimiento', 'marketing ventas negocio'),
      i('design_services', 'Diseño', 'diseno grafico logo disenador'),
      i('photo_camera', 'Cámara de fotos', 'fotografo fotografia fotos sesion'),
      i('videocam', 'Video', 'video filmacion editor de video'),
      i('movie', 'Película', 'cine edicion video'),
      i('code', 'Código', 'programador desarrollador web software'),
      i('language', 'Página web', 'pagina web sitio web internet'),
      i('translate', 'Idiomas', 'idiomas ingles traductor traduccion'),
      i('account_balance', 'Banco', 'banco financiera prestamos'),
      i('payments', 'Pagos', 'pagos prestamista dinero cobranzas'),
      i('savings', 'Ahorro', 'ahorro finanzas'),
      i('shield', 'Seguro', 'seguros aseguradora agencia de seguros'),
      i('support_agent', 'Atención al cliente', 'atencion call center vendedor vendedora'),
      i('child_friendly', 'Niñera', 'ninera cuidado de ninos'),
      i('child_care', 'Jardín maternal', 'jardin maternal guarderia bebe'),
    ],
  },
  {
    clave: 'tecnologia',
    titulo: 'Tecnología',
    iconos: [
      i('smartphone', 'Celular', 'celular telefono casa de celulares fundas'),
      i('phone_android', 'Celular Android', 'celular reparacion de celulares'),
      i('computer', 'Computadora', 'computadora pc reparacion de pc'),
      i('laptop', 'Notebook', 'notebook laptop'),
      i('devices', 'Dispositivos', 'tecnologia dispositivos'),
      i('print', 'Impresora', 'impresiones fotocopias imprenta'),
      i('local_printshop', 'Imprenta', 'imprenta impresiones 3d'),
      i('router', 'Router / internet', 'internet wifi router telefonia'),
      i('wifi', 'WiFi', 'wifi internet conexion'),
      i('headphones', 'Auriculares', 'auriculares audio musica'),
      i('speaker', 'Parlante', 'parlante sonido audio'),
      i('videogame_asset', 'Joystick', 'videojuegos gamer consolas juegos'),
      i('memory', 'Chip', 'electronica componentes insumos electronicos'),
      i('cable', 'Cable', 'cables electronica'),
      i('camera_indoor', 'Cámara de seguridad', 'camaras de seguridad vigilancia'),
      i('solar_power', 'Energía solar', 'paneles solares energia'),
      i('battery_charging_full', 'Batería', 'bateria baterias cargadores'),
      i('live_tv', 'TV digital', 'tv digital cable streaming'),
    ],
  },
  {
    clave: 'eventos',
    titulo: 'Eventos y entretenimiento',
    iconos: [
      i('celebration', 'Fiesta', 'fiesta eventos cumpleanos celebracion'),
      i('cake', 'Cumpleaños', 'cumpleanos torta fiesta infantil'),
      i('music_note', 'Música', 'musica musicos banda'),
      i('queue_music', 'DJ', 'dj musica para fiestas'),
      i('mic', 'Micrófono', 'locutor cantante karaoke conduccion'),
      i('piano', 'Piano', 'piano clases de musica'),
      i('nightlife', 'Boliche', 'boliche noche baile bar'),
      i('theater_comedy', 'Teatro', 'teatro shows comedia'),
      i('attractions', 'Juegos', 'juegos inflables parque diversiones'),
      i('sports_esports', 'Gamer', 'videojuegos gamer'),
      i('casino', 'Casino', 'casino juegos de azar'),
      i('emoji_events', 'Trofeo', 'trofeo torneo premios'),
      i('event', 'Calendario', 'eventos agenda reservas turnos'),
      i('festival', 'Carpa', 'eventos carpa festival salon'),
      i('liquor', 'Barra', 'barra de tragos bartender'),
      i('room_service', 'Servicio de mozo', 'mozo catering servicio para eventos'),
      i('flatware', 'Cubiertos', 'catering vajilla alquiler'),
      i('light_mode', 'Iluminación', 'sonido e iluminacion luces'),
      i('photo_camera', 'Fotos', 'fotografo eventos'),
      i('child_care', 'Infantil', 'animacion infantil ninos'),
    ],
  },
  {
    clave: 'deportes',
    titulo: 'Deportes y turismo',
    iconos: [
      i('fitness_center', 'Gimnasio', 'gimnasio gym pesas musculacion entrenador'),
      i('sports_soccer', 'Fútbol', 'futbol cancha alquiler de canchas'),
      i('sports_tennis', 'Tenis / pádel', 'tenis padel'),
      i('sports_basketball', 'Básquet', 'basquet basket'),
      i('sports_volleyball', 'Vóley', 'voley'),
      i('sports_martial_arts', 'Artes marciales', 'artes marciales karate boxeo'),
      i('sports_mma', 'Boxeo', 'boxeo guantes'),
      i('pool', 'Natación', 'natacion pileta'),
      i('directions_run', 'Correr', 'running correr funcional crossfit'),
      i('sports_gymnastics', 'Gimnasia', 'gimnasia danza baile'),
      i('self_improvement', 'Yoga', 'yoga pilates meditacion'),
      i('hiking', 'Senderismo', 'senderismo trekking caminata'),
      i('phishing', 'Pesca', 'pesca pescador guia de pesca articulos de pesca'),
      i('kayaking', 'Kayak', 'kayak remo'),
      i('beach_access', 'Playa', 'playa sombrilla verano'),
      i('travel_explore', 'Turismo', 'turismo viajes agencia excursiones'),
      i('luggage', 'Valija', 'valija viaje equipaje'),
      i('hotel', 'Hotel', 'hotel hospedaje alojamiento'),
      i('bed', 'Hospedaje', 'hostel hospedaje posada'),
      i('cabin', 'Cabaña', 'cabana cabanas campo'),
      i('holiday_village', 'Complejo', 'complejo cabanas vacaciones'),
      i('nature_people', 'Camping', 'camping carpa acampar aire libre'),
      i('map', 'Mapa', 'mapa guia turistico recorrido'),
      i('landscape', 'Paisaje', 'paisaje naturaleza turismo'),
      i('bedroom_parent', 'Alojamiento', 'alojamiento temporario departamento'),
    ],
  },
  {
    clave: 'campo',
    titulo: 'Campo, plantas y mascotas',
    iconos: [
      i('pets', 'Mascotas', 'mascotas perro gato veterinaria tienda de mascotas'),
      i('cruelty_free', 'Animales', 'animales conejo mascota'),
      i('agriculture', 'Tractor', 'agro campo agropecuario tractor'),
      i('grass', 'Pasto', 'forraje pasto campo'),
      i('eco', 'Hoja', 'ecologico natural verde'),
      i('park', 'Árbol', 'arbol vivero plantas parque'),
      i('forest', 'Bosque', 'bosque arboles maderera'),
      i('local_florist', 'Flor', 'flores plantas vivero floreria'),
      i('spa', 'Hojas', 'aromaticas hierbas plantas'),
      i('egg', 'Granja', 'granja huevos gallinas'),
      i('water', 'Agua', 'agua rio riego'),
      i('wb_sunny', 'Sol', 'sol verano clima'),
    ],
  },
  {
    clave: 'otros',
    titulo: 'Otros',
    iconos: [
      i('category', 'Categoría', 'categoria general varios otros'),
      i('star', 'Estrella', 'destacado estrella premium'),
      i('lightbulb', 'Idea', 'idea emprendimiento'),
      i('palette', 'Paleta de colores', 'arte pintura cuadros decoracion'),
      i('brush', 'Arte', 'arte artesania manualidades'),
      i('auto_awesome', 'Brillos', 'decoracion novedades brillo'),
      i('church', 'Iglesia', 'iglesia santeria religion'),
      i('volunteer_activism', 'Ayuda', 'solidario donaciones ayuda'),
      i('handshake', 'Acuerdo', 'servicios generales acuerdo negocios'),
      i('groups', 'Grupo de personas', 'personas grupo comunidad'),
      i('person', 'Persona', 'persona profesional'),
      i('place', 'Ubicación', 'lugar ubicacion local'),
      i('schedule', 'Reloj', 'horario turnos 24 horas'),
      i('local_phone', 'Teléfono', 'telefono telefonia claro personal'),
      i('confirmation_number', 'Entrada', 'entradas tickets'),
      i('sports_motorsports', 'Casco', 'motos repuestos casco'),
      i('straighten', 'Regla', 'medidas costura'),
      i('texture', 'Tela', 'telas cortinados textil'),
      i('blur_on', 'Bordado', 'bordados estampados'),
      i('candlestick_chart', 'Velas', 'velas artesanales'),
      i('local_activity', 'Cupón', 'cupon souvenir'),
    ],
  },
];

const normalizar = (t) =>
  String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

// Lista plana sin repetidos (el primero que aparece manda)
export const TODOS_LOS_ICONOS = (() => {
  const vistos = new Map();
  GRUPOS_ICONOS.forEach((g) =>
    g.iconos.forEach((ic) => {
      const previo = vistos.get(ic.nombre);
      if (previo) {
        previo.palabras += ` ${ic.palabras} ${ic.titulo}`;
      } else {
        vistos.set(ic.nombre, { ...ic, grupo: g.clave, palabras: `${ic.palabras} ${ic.titulo}` });
      }
    })
  );
  return [...vistos.values()].map((ic) => ({ ...ic, buscable: normalizar(`${ic.palabras} ${ic.nombre.replace(/_/g, ' ')}`) }));
})();

/** Busca íconos por palabras en español (o el nombre técnico en inglés) */
export const buscarIconos = (texto, limite = 60) => {
  const q = normalizar(texto);
  if (q.length < 2) return [];
  const palabras = q.split(/\s+/).filter((p) => p.length >= 2);

  return TODOS_LOS_ICONOS.map((ic) => {
    let puntos = 0;
    if (normalizar(ic.titulo) === q) puntos += 10;
    // Solo cuenta si alguna palabra EMPIEZA así ("uñas" no debe encontrar "medialunas")
    if (` ${ic.buscable}`.includes(` ${q}`)) puntos += 6;
    palabras.forEach((p) => {
      const raiz = p.length > 5 ? p.slice(0, 5) : p;
      if (ic.buscable.split(' ').some((w) => w.startsWith(raiz))) puntos += 3;
    });
    return { ic, puntos };
  })
    .filter((r) => r.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, limite)
    .map((r) => r.ic);
};

/** Íconos que van con el nombre de una categoría (para sugerir) */
export const sugerirIconos = (nombreCategoria, limite = 8) => buscarIconos(nombreCategoria, limite);

export const tituloDeIcono = (nombre) => TODOS_LOS_ICONOS.find((ic) => ic.nombre === nombre)?.titulo || nombre;
