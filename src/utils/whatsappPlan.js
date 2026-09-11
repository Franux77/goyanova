// src/utils/whatsappPlan.js

// Devuelve el nivel de destaque del botón de WhatsApp según el plan del servicio
export const getNivelWhatsapp = (badgeTexto) => {
  if (badgeTexto === 'Elite') return 'elite';
  if (badgeTexto === 'Destacado') return 'destacado';
  if (badgeTexto === 'Verificado') return 'impulso';
  return '';
};