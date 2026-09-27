// Service worker mínimo de GoyaNova.
// Su único propósito hoy es cumplir el requisito técnico para que el navegador
// pueda ofrecer la instalación de la app (evento "beforeinstallprompt"). A propósito
// NO cachea nada: cada pedido va directo a la red, así nadie queda nunca "pegado"
// viendo una versión vieja del sitio después de un deploy nuevo.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
