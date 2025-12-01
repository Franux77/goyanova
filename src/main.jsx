import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { NotificationProvider } from './contexts/NotificationsProvider.jsx';
import 'leaflet/dist/leaflet.css';

// Silenciar todas las salidas de consola temporalmente (comentario global)
// Para habilitar logs, quitar este bloque o condicionar por entorno.
if (typeof window !== 'undefined') {
  ['log', 'info', 'debug', 'warn', 'error'].forEach(fn => {
    try { console[fn] = () => {}; } catch (e) { /* noop */ }
  });
}

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <NotificationProvider>
      <Router>
        <App />
      </Router>
    </NotificationProvider>
  </AuthProvider>
);