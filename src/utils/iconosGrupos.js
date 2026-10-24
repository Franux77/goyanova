// Ícono para cada grupo de categorías (si no está en la lista, usa uno genérico)
export const ICONOS_GRUPO = {
  'Agropecuario': 'agriculture',
  'Arte y Decoración': 'palette',
  'Automotor': 'directions_car',
  'Belleza y Estética': 'face_retouching_natural',
  'Comercios': 'storefront',
  'Comidas': 'restaurant',
  'Deportes y Bienestar': 'fitness_center',
  'Educación': 'school',
  'Entretenimiento': 'celebration',
  'Eventos': 'celebration',
  'Financiero': 'account_balance',
  'Gastronomía': 'restaurant',
  'Hogar': 'chair',
  'Hogar y Construcción': 'construction',
  'Librería y Papelería': 'menu_book',
  'Mantenimiento': 'build',
  'Mascotas': 'pets',
  'Profesionales': 'work',
  'Ropa y Accesorios': 'checkroom',
  'Salud': 'medical_services',
  'Tecnología': 'devices',
  'Tiendas': 'shopping_bag',
  'Transporte': 'local_shipping',
  'Turismo': 'travel_explore',
};

export const iconoDeGrupo = (grupo) => ICONOS_GRUPO[grupo] || 'sell';
