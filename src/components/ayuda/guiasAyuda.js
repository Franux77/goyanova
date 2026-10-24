// Guías paso a paso del Centro de Ayuda. Están en el código (no en la base)
// porque describen pantallas de la web: si cambia una pantalla, se cambia acá.

export const GUIAS = [
  {
    id: 'buscar',
    icono: 'travel_explore',
    color: '#1774f6',
    titulo: 'Encontrar un oficio o negocio',
    resumen: 'Buscá por categoría o por nombre y escribile directo.',
    pasos: [
      'En el inicio, elegí una categoría (por ejemplo Plomería o Panadería) o escribí lo que necesitás en el buscador.',
      'Usá Oficios o Negocios para ver solo lo que te interesa.',
      'Tocá una publicación para ver fotos, horarios, dirección y opiniones.',
      'Tocá «WhatsApp» y le escribís directo, sin intermediarios.',
    ],
    accion: { texto: 'Ir al inicio', to: '/' },
    palabras: 'buscar busco encontrar categoria oficio negocio contacto whatsapp',
  },
  {
    id: 'mapa',
    icono: 'map',
    color: '#0ea5e9',
    titulo: 'Usar el mapa',
    resumen: 'Mirá qué hay cerca y cómo llegar.',
    pasos: [
      'Entrá a «Explorar mapa». Cada puntito de color es un lugar.',
      'Acercá el mapa con los dedos: los puntitos se convierten en íconos de cada rubro.',
      'Filtrá por Oficios, Negocios o una categoría, o buscá por nombre.',
      'Tocá un lugar para ver su ficha: desde ahí le escribís por WhatsApp o tocás «Cómo llegar».',
      'En el celular, el botón «Ver lugares» de abajo muestra todo en una lista.',
    ],
    accion: { texto: 'Abrir el mapa', to: '/explorar' },
    palabras: 'mapa explorar cerca ubicacion como llegar direccion',
  },
  {
    id: 'publicar',
    icono: 'storefront',
    color: '#10b981',
    titulo: 'Publicar tu servicio gratis',
    resumen: 'En pocos minutos aparecés en la web y en el mapa.',
    pasos: [
      'Creá tu cuenta o iniciá sesión.',
      'Tocá «Publicar» y contá qué ofrecés: nombre, categoría y una descripción.',
      'Poné tu WhatsApp: los clientes te escriben directo ahí.',
      'Subí fotos y marcá dónde estás en el mapa.',
      'Agregá tus horarios y tus redes, revisá y publicá.',
      'Después podés editar todo desde Mi panel → Mis servicios.',
    ],
    accion: { texto: 'Publicar ahora', to: '/publicar' },
    palabras: 'publicar publico servicio negocio emprendimiento gratis editar fotos categoria',
  },
  {
    id: 'instalar',
    icono: 'install_mobile',
    color: '#8b5cf6',
    titulo: 'Instalar GoyaNova en el celular',
    resumen: 'Tenela como una app, con su ícono en la pantalla.',
    pasos: [
      'Android (Chrome): si ves el botón «Instalar ahora» acá abajo, tocalo. Si no, abrí el menú ⋮ de Chrome → «Instalar app» / «Agregar a pantalla principal».',
      'iPhone (Safari): tocá el botón Compartir ↑ → «Agregar a inicio» → «Agregar».',
      'Listo: GoyaNova aparece con su ícono, como cualquier app. No ocupa casi lugar.',
    ],
    accion: { texto: 'Ver guía con imágenes', to: '/instalar' },
    instalar: true,
    palabras: 'instalar app aplicacion celular descargar icono pantalla android iphone',
  },
  {
    id: 'resenas',
    icono: 'reviews',
    color: '#f59e0b',
    titulo: 'Dejar una opinión',
    resumen: 'Ayudá a otros vecinos contando cómo te fue.',
    pasos: [
      'Entrá a la publicación del lugar o del profesional.',
      'Bajá hasta la parte de opiniones y tocá «Dejá tu opinión».',
      'Elegí las estrellas y contá en pocas palabras cómo te fue.',
      'Si el negocio tiene un código QR de GoyaNova, escanealo y opinás directo.',
    ],
    palabras: 'opinion reseña resena estrellas calificar comentario qr',
  },
  {
    id: 'planes',
    icono: 'workspace_premium',
    color: '#ec4899',
    titulo: 'Planes y destacados',
    resumen: 'Publicar es gratis. Los planes te dan más visibilidad.',
    pasos: [
      'Con el plan gratis publicás 1 servicio, sin comisiones.',
      'Los planes pagos suman más servicios y fotos, y te muestran destacado en búsquedas y categorías.',
      'Los contratás desde Mi panel → Membresía y pagás con Mercado Pago.',
      'El plan se activa solo apenas se aprueba el pago.',
    ],
    accion: { texto: 'Ver planes', to: '/panel/mi-membresia' },
    palabras: 'plan planes premium destacado pagar pago mercado pago membresia precio comision',
  },
  {
    id: 'cuenta',
    icono: 'manage_accounts',
    color: '#64748b',
    titulo: 'Tu cuenta y contraseña',
    resumen: 'Entrar, recuperar la contraseña y cambiar tus datos.',
    pasos: [
      '¿Te olvidaste la contraseña? En «Iniciar sesión» tocá «¿Olvidaste tu contraseña?» y seguí el mail que te llega.',
      'Para cambiarla: Mi panel → Configuración.',
      'Tus datos personales se cambian en Mi panel → Perfil.',
      'Tu email y tu teléfono personal no se muestran al público: solo el WhatsApp de tu publicación.',
    ],
    accion: { texto: 'Iniciar sesión', to: '/login' },
    palabras: 'cuenta contraseña clave olvide entrar login perfil datos email privacidad eliminar',
  },
];

// Ícono de Material para cada categoría de preguntas (las de la base traen emoji)
export const iconoCategoriaFaq = (nombre = '') => {
  const n = nombre.toLowerCase();
  if (n.includes('pago') || n.includes('factur')) return 'payments';
  if (n.includes('técnic') || n.includes('tecnic')) return 'build';
  if (n.includes('cuenta') || n.includes('privacidad')) return 'lock';
  if (n.includes('public')) return 'edit_note';
  return 'help';
};

export const normalizar = (texto = '') =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
