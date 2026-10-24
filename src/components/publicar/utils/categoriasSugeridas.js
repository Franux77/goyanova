// Sugerencias de categoría según lo que la persona escribe (nombre y descripción).
//
// Mucha gente elige cualquier categoría porque no encuentra la suya o no entiende
// la diferencia. Acá se comparan sus palabras con el nombre de cada categoría y con
// las palabras que la gente usa de verdad ("pasto", "corte de pelo", "tortas"...).

// Saca acentos, pasa a minúscula y deja solo letras y números
export const normalizar = (texto) =>
  String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Palabras que no ayudan a decidir la categoría
const VACIAS = new Set((
  'de la el los las un una y o a en con sin por para del al que se su sus mi mis tu tus te le lo ' +
  'es son soy somos hay muy mas todo toda todos todas tipo tipos cosa cosas etc ' +
  'servicio servicios venta ventas vendo vendemos hago hacemos ofrezco ofrecemos brindamos realizamos ' +
  'realizo trabajo trabajos trabajamos tenemos tengo general calidad precio precios mejor mejores ' +
  'goya corrientes domicilio pedido pedidos consulta consultas whatsapp local negocio emprendimiento ' +
  'atencion cliente clientes dia dias hora horas casa hogar personas persona'
).split(' '));

// Palabras que usa la gente → categoría (escrita como está en la base, sin acentos).
// Si una categoría no existe en la base, simplemente se ignora.
const SINONIMOS = {
  'barberia': ['barber', 'barbero', 'barba', 'corte de pelo', 'cortes de pelo', 'degradado', 'fade', 'perfilado'],
  'peluqueria femenina': ['peluqueria', 'alisado', 'keratina', 'tintura', 'mechas', 'peinado', 'brushing', 'trenzas', 'colorimetria'],
  'manicura': ['unas', 'uñas', 'esmaltado', 'kapping', 'soft gel', 'semipermanente', 'manicuria'],
  'manicura y pedicura': ['pedicura', 'pies'],
  'lashista': ['pestanas', 'pestañas', 'lifting', 'extensiones de pestanas'],
  'depilacion': ['depilacion', 'cera', 'laser'],
  'maquillaje profesional': ['maquillaje', 'make up', 'maquilladora'],
  'servicio de estetica': ['estetica', 'limpieza facial', 'facial', 'cosmetologa'],
  'masajista spa': ['masaje', 'masajes', 'descontracturante', 'spa', 'reflexologia'],
  'cortador de pasto': ['pasto', 'cesped', 'desmalezado', 'desmalezar', 'yuyos', 'bordeadora', 'corte de pasto'],
  'jardinero': ['jardin', 'jardineria', 'poda', 'podar', 'paisajismo', 'plantar'],
  'plomero': ['plomeria', 'cano', 'canos', 'canilla', 'perdida de agua', 'destapacion', 'destapaciones', 'sanitario', 'tanque de agua', 'termotanque'],
  'electricista': ['electricidad', 'tablero', 'tableros', 'instalacion electrica', 'toma corriente', 'ventilador de techo', 'cableado'],
  'tecnico en refrigeracion': ['aire acondicionado', 'aires acondicionados', 'heladera', 'heladeras', 'refrigeracion', 'split', 'carga de gas'],
  'reparacion de electrodomesticos': ['lavarropas', 'secarropas', 'microondas', 'electrodomestico', 'electrodomesticos', 'cocina', 'horno'],
  'albanil': ['albanileria', 'revoque', 'contrapiso', 'ladrillo', 'mamposteria', 'obra', 'ceramica', 'colocacion de ceramicos'],
  'constructora': ['construccion', 'construcciones', 'obra completa', 'casas llave en mano'],
  'pintor pintureria': ['pintura', 'pintar', 'pintor', 'pintureria', 'impermeabilizacion'],
  'carpinteria': ['carpintero', 'muebles', 'madera', 'placard', 'mueble a medida', 'muebles a medida'],
  'herreria': ['herrero', 'rejas', 'reja', 'porton', 'portones', 'soldadura', 'soldador', 'estructuras metalicas'],
  'cerrajeria': ['cerrajero', 'llave', 'llaves', 'cerradura', 'cerraduras'],
  'vidriero': ['vidrio', 'vidrios', 'espejo', 'espejos', 'mampara'],
  'fumigacion': ['fumigar', 'plagas', 'cucarachas', 'ratas', 'desinfeccion'],
  'limpieza domestica': ['limpieza', 'planchado', 'empleada domestica', 'limpieza de casas'],
  'lavanderia tintoreria': ['lavanderia', 'tintoreria', 'lavado de ropa'],
  'tapizado': ['tapiceria', 'tapicero', 'tapizar', 'sillon', 'sillones'],
  'remiseros': ['remis', 'remisero', 'uber', 'taxi', 'traslado', 'traslados', 'viajes a', 'pasajeros', 'chofer'],
  'fletes y mudanzas': ['flete', 'fletes', 'mudanza', 'mudanzas', 'camioneta', 'acarreo'],
  'deliverys': ['delivery', 'mandados', 'cadete', 'cadeteria', 'envios en moto'],
  'mensajeria': ['mensajeria', 'encomienda', 'encomiendas'],
  'taller mecanico autos y motos': ['mecanico', 'mecanica', 'motor', 'moto', 'motos', 'service de auto', 'embrague', 'frenos'],
  'electricidad del automotor': ['electricidad del auto', 'alternador', 'burro de arranque', 'bateria'],
  'gomeria': ['goma', 'gomas', 'cubierta', 'cubiertas', 'neumatico', 'neumaticos', 'pinchadura'],
  'lavadero de autos': ['lavado de autos', 'lavar el auto', 'lavadero', 'detailing', 'tapizado del auto'],
  'chapista': ['chapa', 'chapa y pintura', 'abolladura'],
  'reparacion de celulares': ['celular', 'celulares', 'pantalla', 'modulo', 'cambio de pantalla', 'pin de carga'],
  'reparacion de pc': ['computadora', 'computadoras', 'notebook', 'notebooks', 'pc', 'formateo', 'servicio tecnico informatico', 'camaras de seguridad'],
  'apoyo escolar': ['clases particulares', 'clases de apoyo', 'apoyo', 'tarea', 'tareas', 'profesor', 'profesora', 'matematica', 'ingles'],
  'maestras particulares': ['maestra', 'maestra particular', 'primaria'],
  'cursos y capacitaciones': ['curso', 'cursos', 'taller', 'talleres', 'capacitacion'],
  'clases de baile y danza': ['baile', 'danza', 'zumba', 'ritmos'],
  'gimnasio': ['gym', 'gimnasio', 'musculacion'],
  'entrenador personal': ['personal trainer', 'entrenamiento personalizado', 'entrenador'],
  'yoga y pilates': ['yoga', 'pilates', 'meditacion', 'reiki'],
  'ninera': ['ninera', 'niñera', 'cuidado de ninos', 'babysitter'],
  'cuidador de personas': ['cuidado de adultos', 'adultos mayores', 'acompanante terapeutico', 'cuidadora'],
  'enfermeria': ['enfermera', 'enfermero', 'inyectable', 'inyectables', 'curaciones'],
  'nutricionista': ['nutricion', 'dieta', 'plan de alimentacion'],
  'psicologo': ['psicologa', 'psicologia', 'terapia'],
  'odontologo': ['dentista', 'odontologia', 'odontologa'],
  'kinesiologia': ['kinesiologo', 'kinesiologa', 'rehabilitacion'],
  'veterinario': ['veterinaria', 'vacuna', 'vacunas', 'castracion'],
  'peluqueria canina': ['bano de perros', 'corte canino', 'peluqueria de mascotas', 'grooming'],
  'paseador de perros': ['paseo de perros', 'paseador'],
  'adiestramiento canino': ['adiestrador', 'adiestramiento'],
  'animacion infantil': ['animador', 'animadora', 'animacion', 'payaso', 'cumpleanos infantiles', 'pelotero'],
  'alquiler de salones': ['salon', 'salon de fiestas', 'quincho'],
  // Varios servicios para una fiesta (mozos, barra, parrillero...) van acá;
  // "Catering" queda para quien solo hace la comida del evento.
  'servicios para eventos': ['servicio para eventos', 'servicios para eventos', 'eventos', 'mozo', 'mozos', 'moza', 'barra de tragos', 'bartender', 'parrillero', 'organizacion de eventos', 'locutor', 'conduccion de eventos'],
  'catering': ['catering', 'lunch', 'bocaditos', 'comida para eventos', 'finger food'],
  'dj': ['dj', 'musica para fiestas'],
  'sonido e iluminacion': ['sonido', 'iluminacion', 'luces'],
  'fotografo': ['fotografia', 'fotos de eventos', 'sesion de fotos', 'fotografa'],
  'alquiler de juegos para eventos': ['inflable', 'inflables', 'castillo inflable', 'metegol'],
  'decoracion de eventos': ['decoracion de fiestas', 'ambientacion', 'globos'],
  'desarrollador web': ['pagina web', 'paginas web', 'sitio web', 'tienda online', 'programador'],
  'disenador grafico': ['diseno grafico', 'logo', 'logos', 'flyer', 'flyers', 'identidad visual'],
  'community manager': ['redes sociales', 'manejo de redes', 'contenido para redes'],
  'editor de video': ['edicion de video', 'editor', 'videos'],
  'abogado': ['abogada', 'legal', 'juicio', 'sucesiones', 'divorcio'],
  'contador': ['contadora', 'impuestos', 'monotributo', 'afip', 'arca', 'contable'],
  'inmobiliaria': ['propiedades', 'venta de casas', 'alquiler de casas', 'lotes'],
  'alojamiento temporario': ['alojamiento', 'departamento temporario', 'alquiler por dia', 'alquiler temporario'],
  'cabanas': ['cabana', 'cabañas'],
  'agencia de viajes': ['paquetes turisticos', 'pasajes', 'vuelos', 'agencia de turismo'],
  'excursiones turisticas': ['excursion', 'excursiones', 'paseos', 'ecoturismo'],
  'guia de pesca': ['pesca', 'pescador', 'guia de pesca'],
  'costura y modisteria': ['costura', 'costurera', 'modista', 'arreglo de ropa', 'arreglos de ropa', 'ropa a medida'],
  'bordados y estampados': ['bordado', 'bordados', 'estampado', 'estampados', 'sublimacion', 'vinilo textil'],
  'zapateros': ['arreglo de zapatos', 'zapatero'],
  'relojeria': ['reloj', 'relojes'],
  // Negocios / productos
  'reposteria': ['torta', 'tortas', 'alfajor', 'alfajores', 'pastafrola', 'budin', 'budines', 'cupcakes', 'tartas dulces', 'mesa dulce'],
  'comida dulce': ['dulces', 'golosinas caseras', 'chocotorta'],
  'panaderias': ['pan', 'panaderia', 'facturas', 'chipa', 'chipas', 'bizcochitos', 'prepizza'],
  'pizzeria': ['pizza', 'pizzas'],
  'comidas rapidas': ['hamburguesa', 'hamburguesas', 'lomito', 'lomitos', 'pancho', 'panchos', 'papas fritas', 'sandwich', 'milanesa'],
  'comidas caseras': ['comida casera', 'guiso', 'empanadas', 'tartas', 'comida para llevar'],
  'viandas': ['vianda', 'viandas', 'menu del dia', 'menu semanal'],
  'rotiseria': ['rotiseria', 'pollo al spiedo', 'minutas'],
  'heladerias': ['helado', 'helados', 'heladeria', 'palito'],
  'carniceria': ['carne', 'carnes', 'cortes de carne', 'asado'],
  'verduleria y fruteria': ['verdura', 'verduras', 'fruta', 'frutas', 'verduleria'],
  'kiosco': ['kiosco', 'golosinas', 'cigarrillos', 'bebidas'],
  'comidas sin tacc': ['celiaco', 'celiacos', 'sin tacc', 'sin gluten'],
  'comidas veganas': ['vegano', 'vegana', 'vegetariano'],
  'dietetica': ['dietetica', 'semillas', 'granola', 'frutos secos'],
  'feria de ropa': ['feria', 'fardo', 'fardos', 'ropa usada', 'americana'],
  'ropa de mujer': ['ropa de mujer', 'ropa femenina', 'vestidos'],
  'ropa de hombre': ['ropa de hombre', 'ropa masculina'],
  'ropa infantil': ['ropa de ninos', 'ropa infantil', 'bebes'],
  'indumentaria deportiva': ['botines', 'camisetas de futbol', 'ropa deportiva', 'deportiva'],
  'calzados zapateria': ['zapatillas', 'zapatos', 'sandalias', 'calzado'],
  'bijouterie': ['aros', 'collares', 'pulseras', 'bijou'],
  'artesanias': ['artesania', 'artesanal', 'artesanales', 'hecho a mano', 'palma', 'tejido', 'tejidos', 'crochet'],
  'velas artesanales': ['vela', 'velas'],
  'souvenirs': ['souvenir', 'recuerdos'],
  'regaleria': ['regalos', 'regalo', 'gift'],
  'cotillon': ['cotillon', 'piñata', 'pinata', 'globos', 'descartables de cumple'],
  'fotocopias e impresiones': ['fotocopia', 'fotocopias', 'impresion', 'impresiones', 'stickers', 'plastificado'],
  'libreria': ['libreria', 'utiles escolares', 'cuadernos'],
  'plantas': ['planta', 'plantas', 'plantines', 'suculentas', 'cactus', 'macetas'],
  'productos de limpieza': ['lavandina', 'detergente', 'suavizante', 'limpieza del hogar', 'aromatizante', 'aromatizantes', 'difusores'],
  'perfumes y cosmeticos': ['perfume', 'perfumes', 'cosmeticos', 'maquillajes', 'cremas'],
  'casa de celulares': ['fundas', 'funda', 'cargador', 'cargadores', 'accesorios de celular', 'auriculares'],
  'tienda de mascotas': ['alimento para perros', 'alimento balanceado', 'accesorios para mascotas'],
  'forrajeria': ['forraje', 'forrajes', 'alimento para aves', 'maiz', 'afrecho'],
  'productos agropecuarios': ['huevos', 'maples', 'miel', 'granja'],
  'bazar': ['bazar', 'vajilla', 'ollas', 'utensilios'],
  'ferreteria': ['ferreteria', 'herramientas', 'tornillos'],
  'muebleria': ['muebleria', 'colchones', 'sillas', 'mesas'],
  'casa de electrodomesticos': ['electrodomesticos nuevos', 'televisores', 'smart tv'],
  'suplementos de entrenamiento': ['proteina', 'creatina', 'suplementos'],
};

// Corta las palabras para que "helado" y "heladerías" se reconozcan
// (y que el plural no cambie nada: "ropas" = "ropa")
const raiz = (palabra) => {
  const singular = palabra.length > 3 && palabra.endsWith('s') ? palabra.slice(0, -1) : palabra;
  return singular.length > 5 ? singular.slice(0, 5) : singular;
};

const palabrasDe = (texto) =>
  normalizar(texto)
    .split(' ')
    .filter((p) => p.length >= 3 && !VACIAS.has(p));

/** Prepara la lista de categorías una sola vez (palabras y raíces de cada una) */
export const prepararCategorias = (categorias) =>
  categorias.map((cat) => {
    const nombreNorm = normalizar(cat.nombre);
    const propias = palabrasDe(cat.nombre);
    const sinonimos = (SINONIMOS[nombreNorm] || SINONIMOS[nombreNorm.replace(/ \/ /g, ' ')] || []).map(normalizar);
    return {
      cat,
      nombreNorm,
      raicesPropias: new Set(propias.map(raiz)),
      frases: sinonimos.filter((s) => s.includes(' ')),
      raicesSinonimos: new Set(sinonimos.filter((s) => !s.includes(' ')).map(raiz)),
    };
  });

/** Puntaje de qué tanto el texto habla de una categoría */
const puntuar = (prep, textoNorm, raices) => {
  let puntos = 0;
  if (prep.nombreNorm.length > 3 && textoNorm.includes(prep.nombreNorm)) puntos += 6;
  prep.frases.forEach((f) => {
    if (textoNorm.includes(f)) puntos += 4;
  });
  raices.forEach((r) => {
    if (prep.raicesPropias.has(r)) puntos += 3;
    else if (prep.raicesSinonimos.has(r)) puntos += 2;
  });
  return puntos;
};

/**
 * Devuelve las categorías que mejor encajan con el texto, de mayor a menor.
 * `tipoPreferido` sube un poco las del tipo elegido (oficio / negocio).
 */
export const sugerirCategorias = (texto, preparadas, { limite = 4, tipoPreferido = '' } = {}) => {
  const textoNorm = normalizar(texto);
  if (textoNorm.length < 3) return [];
  const raices = new Set(palabrasDe(texto).map(raiz));

  return preparadas
    .map((prep) => {
      let puntos = puntuar(prep, textoNorm, raices);
      if (puntos > 0 && tipoPreferido && prep.cat.tipo === tipoPreferido) puntos += 1;
      return { cat: prep.cat, puntos };
    })
    .filter((r) => r.puntos >= 2)
    .sort((a, b) => b.puntos - a.puntos || a.cat.nombre.localeCompare(b.cat.nombre, 'es'))
    .slice(0, limite);
};

/** Qué tanto encaja una categoría puntual con el texto */
export const puntajeCategoria = (texto, prep) => {
  if (!prep) return 0;
  const textoNorm = normalizar(texto);
  const raices = new Set(palabrasDe(texto).map(raiz));
  return puntuar(prep, textoNorm, raices);
};

/** Buscador: por nombre, grupo o palabras que usa la gente */
export const buscarCategorias = (busqueda, preparadas, limite = 12) => {
  const q = normalizar(busqueda);
  if (q.length < 2) return [];
  const raices = new Set(palabrasDe(busqueda).map(raiz));

  return preparadas
    .map((prep) => {
      let puntos = 0;
      if (prep.nombreNorm.startsWith(q)) puntos += 10;
      else if (prep.nombreNorm.includes(q)) puntos += 7;
      if (normalizar(prep.cat.grupo).includes(q)) puntos += 2;
      prep.frases.forEach((f) => {
        if (f.includes(q) || q.includes(f)) puntos += 4;
      });
      raices.forEach((r) => {
        if (prep.raicesPropias.has(r)) puntos += 3;
        else if (prep.raicesSinonimos.has(r)) puntos += 3;
      });
      // También "empieza con" en sinónimos sueltos (ej: "pas" → pasto)
      if (q.length >= 3 && !puntos) {
        for (const r of prep.raicesSinonimos) {
          if (r.startsWith(q.slice(0, 5))) {
            puntos += 2;
            break;
          }
        }
      }
      return { cat: prep.cat, puntos };
    })
    .filter((r) => r.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos || a.cat.nombre.localeCompare(b.cat.nombre, 'es'))
    .slice(0, limite)
    .map((r) => r.cat);
};
