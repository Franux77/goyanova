# Mi-directorio-goya

> Documentación generada automáticamente el 05/03/2026

## 🛠️ Stack Tecnológico

- **React**
- **Vite**
- **Supabase**
- **React Router**
- **Mapas**

## ✨ Funcionalidades del Sistema

- ⚙️ Funciones SQL (RPC)
- ⭐ Sistema de membresías
- 🎟️ Códigos promocionales
- 👤 Perfil de usuario
- 💬 Comentarios y opiniones
- 💳 Pago con Mercado Pago
- 📋 Publicación de servicios
- 📷 Subida de imágenes
- 🔍 Búsqueda y filtros
- 🔐 Autenticación
- 🔔 Notificaciones
- 🗺️ Mapa / Geolocalización
- 🛡️ Panel de administración

## 📄 Páginas y Rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Página principal / Home |
| `/admin/*` | — |
| `/ayuda` | — |
| `/categoria/:tipo/:categoria` | — |
| `/contacto` | — |
| `/explorar` | — |
| `/login` | Inicio de sesión |
| `/no-autorizado` | — |
| `/nosotros` | — |
| `/panel/*` | — |
| `/panel/admin/*` | — |
| `/perfil/:id` | Perfil público de un usuario |
| `/perfil/:perfilId/opiniones` | — |
| `/publicar` | — |
| `/publicar/finalizado` | — |
| `/register` | — |
| `/reset-password` | — |
| `/usuario/*` | — |

## 🧩 Componentes Principales

| Componente | Archivo |
|------------|---------|
| `Contacto` | `src\App.jsx` |
| `Nosotros` | `src\App.jsx` |
| `AyudaPublica` | `src\App.jsx` |
| `PerfilDetalle` | `src\App.jsx` |
| `OpinionesCompletas` | `src\App.jsx` |
| `PanelUsuario` | `src\App.jsx` |
| `Dashboard` | `src\App.jsx` |
| `MisServicios` | `src\App.jsx` |
| `Perfil` | `src\App.jsx` |
| `Opiniones` | `src\App.jsx` |
| `Solicitudes` | `src\App.jsx` |
| `Configuracion` | `src\App.jsx` |
| `Notificaciones` | `src\App.jsx` |
| `AyudaSoporte` | `src\App.jsx` |
| `MiMembresia` | `src\App.jsx` |
| `PanelAdmin` | `src\App.jsx` |
| `UsuariosAdmin` | `src\App.jsx` |
| `ServiciosAdmin` | `src\App.jsx` |
| `ComentariosAdmin` | `src\App.jsx` |
| `SolicitudesEliminacion` | `src\App.jsx` |
| `ReportesAdmin` | `src\App.jsx` |
| `CodigosPromocionalesAdmin` | `src\App.jsx` |
| `MembresiasAdmin` | `src\App.jsx` |
| `CategoriasAdmin` | `src\App.jsx` |
| `ConfiguracionAdmin` | `src\App.jsx` |
| `GestionFAQs` | `src\App.jsx` |
| `GestionTutoriales` | `src\App.jsx` |
| `GestionMensajesSoporte` | `src\App.jsx` |
| `RouteLoadingIndicator` | `src\App.jsx` |
| `AppContent` | `src\App.jsx` |
| `App` | `src\App.jsx` |
| `AuthContext` | `src\auth\AuthContext.jsx` |
| `AuthProvider` | `src\auth\AuthContext.jsx` |
| `Login` | `src\auth\login\login.jsx` |
| `ModalCodigoPromo` | `src\auth\login\ModalCodigoPromo.jsx` |
| `Register` | `src\auth\login\Register.jsx` |
| `ResetPassword` | `src\auth\login\ResetPassword.jsx` |
| `SuspensionModal` | `src\auth\login\SuspensionModal.jsx` |
| `ProtectedRoute` | `src\auth\ProtectedRoute.jsx` |
| `ComentariosProyecto` | `src\components\ComentariosProyecto\ComentariosProyecto.jsx` |

## 🗄️ Base de Datos (Supabase)

### Tablas utilizadas

- `categorias`
- `categorias_faqs`
- `codigos_promocionales`
- `comentarios_proyecto`
- `comentarios_publicos`
- `configuracion_sistema`
- `disponibilidades`
- `estadisticas_comentarios`
- `faqs`
- `fotos-usuarios`
- `historial_membresias`
- `historial_moderacion`
- `imagenes`
- `imagenes_servicio`
- `membresias`
- `mensajes_soporte`
- `notificaciones`
- `opiniones`
- `perfiles_usuarios`
- `reporte_metricas`
- `reportes`
- `reportes_comentarios`
- `servicios`
- `solicitudes_eliminacion`
- `suspensiones`
- `tutoriales`

### Funciones SQL (RPC)

- `aplicar_codigo_promocional()`
- `aprobar_comentario()`
- `cancelar_membresia()`
- `crear_comentario_validado()`
- `crear_membresia_manual()`
- `eliminar_opinion_admin()`
- `eliminar_usuario_completo()`
- `incrementar_vistas_tutorial()`
- `obtener_membresia_usuario()`
- `puede_publicar_servicio()`
- `rechazar_comentario()`

## 🚀 Comandos disponibles

```bash
npm run dev             # vite
npm run build           # vite build
npm run lint            # eslint .
npm run preview         # vite preview
```

## 💻 Instalación y uso local

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd mi-directorio-goya

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Completar los valores en .env.local

# 4. Correr en desarrollo
npm run dev
```

## 📁 Estructura del Proyecto

```
mi-directorio-goya/
├── auth
│   └── login
│       └── ModalCodigoPromoGoogle
├── eslint.config.js
├── estructuragoya.txt
├── generate-readme.cjs
├── index.html
├── manifest.json
├── package.json
├── public
│   ├── assets
│   │   ├── 20260121_152102_0000.png
│   │   ├── favicon.ico
│   │   ├── GoyaNova_20250918_144009_0000.png
│   │   ├── GoyaNova_20251222_205000_0000.png
│   │   ├── GoyaNova_Blanco.png
│   │   ├── GoyaNova_Blanco_Maskable.png
│   │   └── IMG_20251214_152221_302.webp
│   ├── google2ae942aae60591aa.html
│   ├── robots.txt
│   ├── sitemap.xml
│   └── _redirects
├── README.md
├── src
│   ├── App.css
│   ├── App.jsx
│   ├── assets
│   │   ├── GoyaNova_20250918_144009_0000.png
│   │   ├── image.png
│   │   ├── Imagen de WhatsApp 2025-09-18 a las 14.33.45_37c6ee86.jpg
│   │   ├── LOGO.jpg
│   │   └── react.svg
│   ├── auth
│   │   ├── AuthContext.jsx
│   │   ├── login
│   │   │   ├── Login.css
│   │   │   ├── login.jsx
│   │   │   ├── ModalCodigoPromo.css
│   │   │   ├── ModalCodigoPromo.jsx
│   │   │   ├── Register.css
│   │   │   ├── Register.jsx
│   │   │   ├── ResetPassword.css
│   │   │   ├── ResetPassword.jsx
│   │   │   ├── SuspensionModal.css
│   │   │   └── SuspensionModal.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── RutaProtegidaAdmin.jsx
│   │   ├── useAuth.js
│   │   └── useSuspension.js
│   ├── components
│   │   ├── ayuda
│   │   │   ├── AyudaPublica.css
│   │   │   └── AyudaPublica.jsx
│   │   ├── ComentariosProyecto
│   │   │   ├── ComentariosProyecto.css
│   │   │   └── ComentariosProyecto.jsx
│   │   ├── contacto
│   │   │   ├── Contacto.css
│   │   │   └── Contacto.jsx
│   │   ├── footer
│   │   │   ├── Footer.css
│   │   │   └── Footer.jsx
│   │   ├── home
│   │   │   ├── BannerUpgrade.css
│   │   │   ├── BannerUpgrade.jsx
│   │   │   ├── BuscadorCategorias.jsx
│   │   │   ├── CategoryCard.css
│   │   │   ├── CategoryCard.jsx
│   │   │   ├── CategoryList.css
│   │   │   ├── CategoryList.jsx
│   │   │   ├── Home.css
│   │   │   ├── Home.jsx
│   │   │   ├── MapaHome.css
│   │   │   ├── MapaHome.jsx
│   │   │   ├── Navbar.css
│   │   │   ├── Navbar.jsx
│   │   │   ├── NavbarGeneral.css
│   │   │   ├── NavbarGeneral.jsx
│   │   │   ├── SaludoUsuario.css
│   │   │   ├── SaludoUsuario.jsx
│   │   │   ├── TypeSelector.css
│   │   │   └── TypeSelector.jsx
│   │   ├── InstallPWAModal.css
│   │   ├── InstallPWAModal.jsx
│   │   ├── ListaPerfilesYDetalles
│   │   │   ├── CategoryPage.css
│   │   │   ├── CategoryPage.jsx
│   │   │   ├── CategoryPageWrapper.jsx
│   │   │   ├── NavbarCategory.css
│   │   │   ├── NavbarCategory.jsx
│   │   │   ├── NavbarPerfil.jsx
│   │   │   ├── perfil
│   │   │   │   ├── DisponibilidadPerfilRobusto.css
│   │   │   │   ├── DisponibilidadPerfilRobusto.jsx
│   │   │   │   ├── GaleriaTrabajos.css
│   │   │   │   ├── GaleriaTrabajos.jsx
│   │   │   │   ├── MenuOpciones.css
│   │   │   │   ├── MenuOpciones.jsx
│   │   │   │   ├── ModalReporte.css
│   │   │   │   ├── ModalReporte.jsx
│   │   │   │   ├── opinion
│   │   │   │   ├── OpinionesSection.css
│   │   │   │   ├── OpinionesSection.jsx
│   │   │   │   ├── PanelProfesional.css
│   │   │   │   ├── PanelProfesional.jsx
│   │   │   │   ├── PerfilDetalle.css
│   │   │   │   ├── PerfilDetalle.jsx
│   │   │   │   ├── ResumenPerfil.css
│   │   │   │   ├── ResumenPerfil.jsx
│   │   │   │   ├── SobrePerfil.css
│   │   │   │   └── SobrePerfil.jsx
│   │   │   ├── PerfilCard.css
│   │   │   └── PerfilCard.jsx
│   │   ├── loading
│   │   │   ├── Loading.css
│   │   │   └── Loading.jsx
│   │   ├── mapa
│   │   │   ├── BarraBusquedaExplorar.css
│   │   │   ├── BarraBusquedaExplorar.jsx
│   │   │   ├── CardPerfilExplorar.css
│   │   │   ├── CardPerfilExplorar.jsx
│   │   │   ├── DetallesServicio.css
│   │   │   ├── DetallesServicio.jsx
│   │   │   ├── ExplorarMapa.css
│   │   │   ├── ExplorarMapa.jsx
│   │   │   ├── FiltrosExplorar.css
│   │   │   ├── FiltrosExplorar.jsx
│   │   │   ├── ListaPerfilesExplorar.css
│   │   │   ├── ListaPerfilesExplorar.jsx
│   │   │   ├── MapFlyTo.jsx
│   │   │   ├── MarkerCluster.css
│   │   │   ├── PanelInferiorResultados.jsx
│   │   │   ├── ScrollControl.jsx
│   │   │   ├── UbicacionActual.css
│   │   │   └── UbicacionActual.jsx
│   │   ├── ModalMantenimiento.css
│   │   ├── ModalMantenimiento.jsx
│   │   ├── nosotros
│   │   │   ├── Nosotros.css
│   │   │   └── Nosotros.jsx
│   │   ├── panel
│   │   │   ├── admin
│   │   │   │   ├── CategoriasAdmin.css
│   │   │   │   ├── CategoriasAdmin.jsx
│   │   │   │   ├── CodigosPromocionalesAdmin.css
│   │   │   │   ├── CodigosPromocionalesAdmin.jsx
│   │   │   │   ├── ComentariosAdmin.css
│   │   │   │   ├── ComentariosAdmin.jsx
│   │   │   │   ├── ConfiguracionAdmin.css
│   │   │   │   ├── ConfiguracionAdmin.jsx
│   │   │   │   ├── DashboardAdmin.css
│   │   │   │   ├── DashboardAdmin.jsx
│   │   │   │   ├── GestionFAQs.css
│   │   │   │   ├── GestionFAQs.jsx
│   │   │   │   ├── GestionTutoriales.css
│   │   │   │   ├── GestionTutoriales.jsx
│   │   │   │   ├── MembresiasAdmin.css
│   │   │   │   ├── MembresiasAdmin.jsx
│   │   │   │   ├── MensajesSoporte.css
│   │   │   │   ├── MensajesSoporte.jsx
│   │   │   │   ├── PanelAdmin.css
│   │   │   │   ├── PanelAdmin.jsx
│   │   │   │   ├── ReportesAdmin.css
│   │   │   │   ├── ReportesAdmin.jsx
│   │   │   │   ├── ServiciosAdmin.css
│   │   │   │   ├── ServiciosAdmin.jsx
│   │   │   │   ├── SolicitudesEliminacion.css
│   │   │   │   ├── SolicitudesEliminacion.jsx
│   │   │   │   ├── UsuariosAdmin.css
│   │   │   │   └── UsuariosAdmin.jsx
│   │   │   └── usuario
│   │   │       ├── AyudaSoporte.css
│   │   │       ├── AyudaSoporte.jsx
│   │   │       ├── BotonPagarMembresia.css
│   │   │       ├── BotonPagarMembresia.jsx
│   │   │       ├── components
│   │   │       ├── Configuracion.css
│   │   │       ├── Configuracion.jsx
│   │   │       ├── Dashboard.css
│   │   │       ├── Dashboard.jsx
│   │   │       ├── MiMembresia.css
│   │   │       ├── MiMembresia.jsx
│   │   │       ├── MisServicios.css
│   │   │       ├── MisServicios.jsx
│   │   │       ├── Notificaciones.css
│   │   │       ├── Notificaciones.jsx
│   │   │       ├── Opiniones.css
│   │   │       ├── Opiniones.jsx
│   │   │       ├── PanelUsuario.css
│   │   │       ├── PanelUsuario.jsx
│   │   │       ├── Perfil.css
│   │   │       ├── Perfil.jsx
│   │   │       ├── PublicarServicio.css
│   │   │       ├── PublicarServicio.jsx
│   │   │       ├── ServicioCard.css
│   │   │       ├── ServicioCard.jsx
│   │   │       └── Solicitudes.jsx
│   │   └── publicar
│   │       ├── FinalizacionExitosa.css
│   │       ├── FinalizacionExitosa.jsx
│   │       ├── ModalMapa.css
│   │       ├── ModalMapa.jsx
│   │       ├── Paso1InfoBasica.css
│   │       ├── Paso1InfoBasica.jsx
│   │       ├── Paso2ImagenesUbicacion.css
│   │       ├── Paso2ImagenesUbicacion.jsx
│   │       ├── Paso3DetallesDisponibilidad.css
│   │       ├── Paso3DetallesDisponibilidad.jsx
│   │       ├── Paso4ContactoOpciones.css
│   │       ├── Paso4ContactoOpciones.jsx
│   │       ├── Paso5ResumenConfirmacion.css
│   │       ├── Paso5ResumenConfirmacion.jsx
│   │       ├── PublicarServicioForm.css
│   │       ├── PublicarServicioForm.jsx
│   │       ├── SeccionFormulario.css
│   │       ├── SeccionFormulario.jsx
│   │       └── utils
│   │           ├── helpers.js
│   │           ├── serviciosService.js
│   │           └── validacionesServicio.js
│   ├── contexts
│   │   ├── NotificationsProvider.css
│   │   └── NotificationsProvider.jsx
│   ├── hooks
│   │   └── useMantenimiento.js
│   ├── index.css
│   ├── main.jsx
│   ├── RouterApp.jsx
│   └── utils
│       ├── materialIconsList.js
│       ├── supabaseClient.js
│       ├── suspensionUtils.js
│       └── validacionesReportes.js
└── vite.config.js
```

## ✅ Checklist de pruebas

### Como usuario registrado

- [ ] Registro con email y contraseña
- [ ] Login con email y contraseña
- [ ] Login con Google (si está habilitado)
- [ ] Modal de código promocional al registrarse
- [ ] Ver y editar perfil propio
- [ ] Publicar un servicio (nombre, descripción, fotos, mapa)
- [ ] Editar un servicio publicado
- [ ] Eliminar un servicio
- [ ] Ver límite de servicios según membresía
- [ ] Ver límite de fotos según membresía
- [ ] Comentar el perfil de otro usuario
- [ ] No poder comentar el propio perfil
- [ ] Ver sección Mi Membresía
- [ ] Pagar membresía Premium (Mercado Pago)
- [ ] Verificar activación de Premium después del pago
- [ ] Cancelar membresía
- [ ] Aplicar código promocional
- [ ] Ver notificaciones
- [ ] Buscar servicios por categoría / filtros

### Como administrador

- [ ] Acceder al panel de administración
- [ ] Ver listado de usuarios
- [ ] Gestionar membresías manualmente
- [ ] Moderar comentarios
- [ ] Ver reportes
- [ ] Gestionar códigos promocionales
- [ ] Activar/desactivar modo mantenimiento
- [ ] Suspender usuarios

---

*README generado automáticamente con `node generate-readme.js`*
