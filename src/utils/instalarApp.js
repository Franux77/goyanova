// Instalación de GoyaNova como app (PWA), en un solo lugar.
//
// Chrome avisa que se puede instalar con el evento "beforeinstallprompt" UNA sola vez
// por carga de página, y recién cuando la persona ya interactuó con el sitio. Si nadie
// lo está escuchando en ese momento, se pierde y solo queda mostrar el tutorial.
// Por eso se escucha acá apenas arranca la app (ver main.jsx) y se comparte con el
// modal, el Home y la página /instalar.
import { useEffect, useState } from 'react';

const CLAVE_INSTALADA = 'pwa-installed';

let promptGuardado = null;
let instalada = false;
const oyentes = new Set();

const avisar = () => oyentes.forEach((fn) => fn());

export const esIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const corriendoComoApp = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

const leerInstalada = () => {
  try {
    return localStorage.getItem(CLAVE_INSTALADA) === 'true';
  } catch {
    return false;
  }
};

const marcarInstalada = () => {
  instalada = true;
  promptGuardado = null;
  window.__pwaPrompt = null;
  try {
    localStorage.setItem(CLAVE_INSTALADA, 'true');
  } catch {
    // modo privado
  }
  avisar();
};

let iniciado = false;
export const iniciarCapturaInstalacion = () => {
  if (iniciado || typeof window === 'undefined') return;
  iniciado = true;
  instalada = corriendoComoApp() || leerInstalada();

  window.addEventListener('beforeinstallprompt', (e) => {
    // Se frena el cartelito propio de Chrome: lo ofrece nuestro modal
    e.preventDefault();
    promptGuardado = e;
    window.__pwaPrompt = e; // compatibilidad con código viejo
    // Si Chrome ofrece instalar, es que en este dispositivo no está instalada
    if (!corriendoComoApp()) instalada = false;
    avisar();
  });

  window.addEventListener('appinstalled', marcarInstalada);

  // Android: Chrome puede decir si la app ya está instalada (usa "related_applications")
  if (navigator.getInstalledRelatedApps && !instalada) {
    navigator
      .getInstalledRelatedApps()
      .then((apps) => {
        if (apps?.length) marcarInstalada();
      })
      .catch(() => {});
  }
};

/** Abre el cartel nativo de instalación. Devuelve 'accepted', 'dismissed' o 'no-disponible'. */
export const instalarApp = async () => {
  const prompt = promptGuardado;
  if (!prompt) return 'no-disponible';
  try {
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    // El mismo aviso no se puede usar dos veces
    promptGuardado = null;
    window.__pwaPrompt = null;
    if (outcome === 'accepted') marcarInstalada();
    else avisar();
    return outcome;
  } catch {
    promptGuardado = null;
    avisar();
    return 'no-disponible';
  }
};

/** Estado de instalación, actualizado en vivo. */
export const useInstalarApp = () => {
  const leer = () => ({
    puedeInstalar: !!promptGuardado,
    yaInstalada: instalada || corriendoComoApp(),
  });
  const [estado, setEstado] = useState(leer);

  useEffect(() => {
    const fn = () => setEstado(leer());
    oyentes.add(fn);
    fn();
    return () => oyentes.delete(fn);
  }, []);

  return { ...estado, esIOS: esIOS(), instalar: instalarApp };
};
