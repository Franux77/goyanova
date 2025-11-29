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