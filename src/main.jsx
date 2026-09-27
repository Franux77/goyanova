import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { NotificationProvider } from './contexts/NotificationsProvider.jsx';
import 'leaflet/dist/leaflet.css';


createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <NotificationProvider>
      <Router>
        <App />
      </Router>
    </NotificationProvider>
  </AuthProvider>
);

// Registra el service worker solo en producción: es lo que le falta al sitio para que
// el navegador ofrezca instalar GoyaNova como app (evento "beforeinstallprompt"). En
// desarrollo se deja sin registrar para no interferir con el hot-reload de Vite —
// probar la instalación real requiere un build de producción (npm run build + preview),
// no el servidor de desarrollo.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('[GoyaNova] No se pudo registrar el service worker:', err);
    });
  });
}