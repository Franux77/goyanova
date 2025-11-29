import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import Login from './auth/login/login';

// Panels por rol
import AdminPanel from './components/panel/admin/PanelAdmin';
import UsuarioPanel from './components/panel/usuario/PanelUsuario';

// Otros componentes y páginas públicas
import HomePage from './components/home/Home';

const RouterApp = () => (
  <BrowserRouter>
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<HomePage />} />

      {/* Admin -> validado por correo en ProtectedRoute */}
      <Route
        element={<ProtectedRoute allowedRoles={['admin']} redirectPath="/" />}
      >
        <Route path="/admin/*" element={<AdminPanel />} />
      </Route>

      {/* Usuario (rol cliente o prestador) */}
      <Route
        element={<ProtectedRoute allowedRoles={['cliente', 'prestador']} redirectPath="/" />}
      >
        <Route path="/usuario/*" element={<UsuarioPanel />} />
      </Route>

      {/* Ruta catch-all */}
      <Route path="*" element={<div>404 - Página no encontrada</div>} />
    </Routes>
  </BrowserRouter>
);

export default RouterApp;
