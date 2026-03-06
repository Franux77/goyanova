#!/usr/bin/env node

/**
 * generate-readme.js
 * Analizá tu proyecto y generá un README completo automáticamente.
 * 
 * USO:
 *   node generate-readme.js
 * 
 * O agregalo a tu package.json:
 *   "scripts": { "readme": "node generate-readme.js" }
 *   npm run readme
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURACIÓN
// ============================================================
const ROOT = process.cwd();
const OUTPUT_FILE = path.join(ROOT, 'README.md');

const IGNORAR_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.vite', 
  'coverage', '.netlify', '.vercel', '__pycache__'
]);

const IGNORAR_ARCHIVOS = new Set([
  '.DS_Store', 'Thumbs.db', '.env', '.env.local',
  '.env.production', 'package-lock.json', 'yarn.lock'
]);

const EXTENSIONES_CODIGO = new Set([
  '.jsx', '.js', '.ts', '.tsx', '.css', '.html', '.json'
]);

// ============================================================
// UTILIDADES
// ============================================================
function leerArchivoSeguro(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function recorrerDirectorio(dir, archivos = [], nivel = 0) {
  if (nivel > 6) return archivos;
  
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return archivos;
  }

  for (const entry of entries) {
    if (IGNORAR_DIRS.has(entry.name) || IGNORAR_ARCHIVOS.has(entry.name)) continue;
    if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;

    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT, fullPath);

    if (entry.isDirectory()) {
      recorrerDirectorio(fullPath, archivos, nivel + 1);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (EXTENSIONES_CODIGO.has(ext)) {
        archivos.push({ path: relPath, fullPath, ext, name: entry.name });
      }
    }
  }

  return archivos;
}

function generarArbolDirectorio(dir, prefix = '', nivel = 0) {
  if (nivel > 4) return '';
  
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return '';
  }

  entries = entries.filter(e => 
    !IGNORAR_DIRS.has(e.name) && 
    !e.name.startsWith('.') &&
    e.name !== 'package-lock.json'
  );

  let resultado = '';
  entries.forEach((entry, i) => {
    const esUltimo = i === entries.length - 1;
    const conector = esUltimo ? '└── ' : '├── ';
    const nuevoPrefix = prefix + (esUltimo ? '    ' : '│   ');
    
    resultado += `${prefix}${conector}${entry.name}\n`;
    
    if (entry.isDirectory()) {
      resultado += generarArbolDirectorio(
        path.join(dir, entry.name), 
        nuevoPrefix, 
        nivel + 1
      );
    }
  });

  return resultado;
}

// ============================================================
// ANÁLISIS DE CÓDIGO
// ============================================================
function extraerComponentes(contenido, archivo) {
  const componentes = [];
  
  // Componentes funcionales: const/function NombreComponente
  const regexFC = /(?:export\s+default\s+function|export\s+(?:const|function)\s+|const\s+)([A-Z][a-zA-Z0-9]*)\s*(?:=\s*(?:\(|React\.memo)|[\s(])/g;
  let match;
  while ((match = regexFC.exec(contenido)) !== null) {
    if (!componentes.includes(match[1])) {
      componentes.push(match[1]);
    }
  }

  return componentes;
}

function extraerImports(contenido) {
  const imports = new Set();
  const regex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(contenido)) !== null) {
    if (!match[1].startsWith('.') && !match[1].startsWith('/')) {
      imports.add(match[1].split('/')[0]);
    }
  }
  return [...imports];
}

function extraerRutas(contenido) {
  const rutas = [];
  // React Router: <Route path="..." / path="..."
  const regex = /path=['"](\/[^'"]*)['"]/g;
  let match;
  while ((match = regex.exec(contenido)) !== null) {
    rutas.push(match[1]);
  }
  return rutas;
}

function extraerSupabaseCalls(contenido) {
  const calls = new Set();
  
  // .from('tabla')
  const fromRegex = /\.from\(['"]([^'"]+)['"]\)/g;
  let match;
  while ((match = fromRegex.exec(contenido)) !== null) {
    calls.add(`tabla: ${match[1]}`);
  }
  
  // .rpc('funcion')
  const rpcRegex = /\.rpc\(['"]([^'"]+)['"]/g;
  while ((match = rpcRegex.exec(contenido)) !== null) {
    calls.add(`rpc: ${match[1]}`);
  }

  // supabase.functions.invoke
  const funcRegex = /functions\.invoke\(['"]([^'"]+)['"]/g;
  while ((match = funcRegex.exec(contenido)) !== null) {
    calls.add(`edge-function: ${match[1]}`);
  }

  return [...calls];
}

function detectarFuncionalidad(contenido, nombreArchivo) {
  const funcionalidades = [];
  const lower = contenido.toLowerCase();
  const nombre = nombreArchivo.toLowerCase();

  const detecciones = [
    { keywords: ['mercadopago', 'mp_access', 'init_point', 'preferencia'], label: '💳 Pago con Mercado Pago' },
    { keywords: ['supabase.auth', 'signin', 'signup', 'signout'], label: '🔐 Autenticación' },
    { keywords: ['upload', 'storage', 'imagen', 'foto'], label: '📷 Subida de imágenes' },
    { keywords: ['membresia', 'premium', 'plan'], label: '⭐ Sistema de membresías' },
    { keywords: ['mapa', 'leaflet', 'mapbox', 'geoloc', 'lat', 'lng'], label: '🗺️ Mapa / Geolocalización' },
    { keywords: ['comentario', 'opinion', 'resena', 'reseña'], label: '💬 Comentarios y opiniones' },
    { keywords: ['notificacion', 'notification'], label: '🔔 Notificaciones' },
    { keywords: ['admin', 'moderac', 'panel'], label: '🛡️ Panel de administración' },
    { keywords: ['codigo_promocional', 'promo', 'descuento'], label: '🎟️ Códigos promocionales' },
    { keywords: ['servicio', 'publicar', 'publicacion'], label: '📋 Publicación de servicios' },
    { keywords: ['perfil', 'usuario', 'profile'], label: '👤 Perfil de usuario' },
    { keywords: ['buscar', 'busqueda', 'search', 'filtro'], label: '🔍 Búsqueda y filtros' },
    { keywords: ['webhook'], label: '🔗 Webhooks' },
    { keywords: ['rpc(', '.rpc('], label: '⚙️ Funciones SQL (RPC)' },
  ];

  for (const { keywords, label } of detecciones) {
    if (keywords.some(kw => lower.includes(kw))) {
      if (!funcionalidades.includes(label)) {
        funcionalidades.push(label);
      }
    }
  }

  return funcionalidades;
}

// ============================================================
// ANÁLISIS DE PACKAGE.JSON
// ============================================================
function analizarPackageJson() {
  const pkgPath = path.join(ROOT, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return {
      nombre: pkg.name || 'sin-nombre',
      version: pkg.version || '1.0.0',
      descripcion: pkg.description || '',
      scripts: pkg.scripts || {},
      dependencias: Object.keys(pkg.dependencies || {}),
      devDependencias: Object.keys(pkg.devDependencies || {}),
    };
  } catch {
    return null;
  }
}

// ============================================================
// ANÁLISIS DE VARIABLES DE ENTORNO
// ============================================================
function analizarEnvExample() {
  const envPaths = [
    path.join(ROOT, '.env.example'),
    path.join(ROOT, '.env.local.example'),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const contenido = leerArchivoSeguro(envPath);
      return contenido.split('\n')
        .filter(l => l.trim() && !l.startsWith('#'))
        .map(l => l.split('=')[0].trim());
    }
  }

  // Intentar extraer del código
  const vars = new Set();
  const archivos = recorrerDirectorio(ROOT);
  for (const archivo of archivos.slice(0, 20)) {
    const contenido = leerArchivoSeguro(archivo.fullPath);
    const regex = /import\.meta\.env\.([A-Z_]+)|process\.env\.([A-Z_]+)/g;
    let match;
    while ((match = regex.exec(contenido)) !== null) {
      vars.add(match[1] || match[2]);
    }
  }

  return [...vars];
}

// ============================================================
// ANÁLISIS DE RUTAS / PÁGINAS
// ============================================================
function analizarRutas(archivos) {
  const todasRutas = new Set();
  
  for (const archivo of archivos) {
    if (archivo.ext === '.jsx' || archivo.ext === '.tsx') {
      const contenido = leerArchivoSeguro(archivo.fullPath);
      if (contenido.includes('<Route') || contenido.includes('createBrowserRouter')) {
        const rutas = extraerRutas(contenido);
        rutas.forEach(r => todasRutas.add(r));
      }
    }
  }

  return [...todasRutas].sort();
}

// ============================================================
// GENERADOR PRINCIPAL
// ============================================================
function generarReadme() {
  console.log('🔍 Analizando proyecto...\n');

  const pkg = analizarPackageJson();
  const archivos = recorrerDirectorio(ROOT);
  const envVars = analizarEnvExample();
  const rutas = analizarRutas(archivos);

  console.log(`📁 Archivos encontrados: ${archivos.length}`);

  // Analizar todos los archivos
  const todosFuncionalidades = new Set();
  const todosSupabaseCalls = new Set();
  const todosComponentes = [];
  const archivosPorCarpeta = {};

  for (const archivo of archivos) {
    const contenido = leerArchivoSeguro(archivo.fullPath);
    if (!contenido) continue;

    // Carpeta
    const carpeta = path.dirname(archivo.path).split(path.sep)[0] || 'raíz';
    if (!archivosPorCarpeta[carpeta]) archivosPorCarpeta[carpeta] = [];
    archivosPorCarpeta[carpeta].push(archivo.name);

    // Funcionalidades
    const funcs = detectarFuncionalidad(contenido, archivo.name);
    funcs.forEach(f => todosFuncionalidades.add(f));

    // Supabase
    const calls = extraerSupabaseCalls(contenido);
    calls.forEach(c => todosSupabaseCalls.add(c));

    // Componentes
    if (archivo.ext === '.jsx' || archivo.ext === '.tsx') {
      const comps = extraerComponentes(contenido, archivo.name);
      comps.forEach(c => {
        if (!todosComponentes.find(x => x.nombre === c)) {
          todosComponentes.push({ nombre: c, archivo: archivo.path });
        }
      });
    }
  }

  // Detectar tecnologías
  const techs = [];
  if (pkg) {
    if (pkg.dependencias.includes('react')) techs.push('React');
    if (pkg.devDependencias.includes('vite')) techs.push('Vite');
    if (pkg.dependencias.includes('@supabase/supabase-js')) techs.push('Supabase');
    if (pkg.dependencias.some(d => d.includes('mercadopago') || d.includes('mercado'))) techs.push('Mercado Pago');
    if (pkg.dependencias.includes('react-router-dom')) techs.push('React Router');
    if (pkg.dependencias.some(d => d.includes('leaflet') || d.includes('mapbox'))) techs.push('Mapas');
    if (pkg.dependencias.some(d => d.includes('tailwind'))) techs.push('Tailwind CSS');
  }

  // Separar tablas y RPCs de Supabase
  const tablas = [...todosSupabaseCalls].filter(c => c.startsWith('tabla:')).map(c => c.replace('tabla: ', ''));
  const rpcs = [...todosSupabaseCalls].filter(c => c.startsWith('rpc:')).map(c => c.replace('rpc: ', ''));
  const edgeFunctions = [...todosSupabaseCalls].filter(c => c.startsWith('edge-function:')).map(c => c.replace('edge-function: ', ''));

  const nombreProyecto = pkg?.nombre || path.basename(ROOT);
  const arbolDir = generarArbolDirectorio(ROOT);

  // ============================================================
  // CONSTRUIR README
  // ============================================================
  const fechaHoy = new Date().toLocaleDateString('es-AR', { 
    day: '2-digit', month: '2-digit', year: 'numeric' 
  });

  let readme = `# ${nombreProyecto.charAt(0).toUpperCase() + nombreProyecto.slice(1)}

> Documentación generada automáticamente el ${fechaHoy}

`;

  if (pkg?.descripcion) {
    readme += `${pkg.descripcion}\n\n`;
  }

  // Stack tecnológico
  if (techs.length > 0) {
    readme += `## 🛠️ Stack Tecnológico\n\n`;
    techs.forEach(t => readme += `- **${t}**\n`);
    readme += '\n';
  }

  // Funcionalidades
  if (todosFuncionalidades.size > 0) {
    readme += `## ✨ Funcionalidades del Sistema\n\n`;
    [...todosFuncionalidades].sort().forEach(f => readme += `- ${f}\n`);
    readme += '\n';
  }

  // Rutas / Páginas
  if (rutas.length > 0) {
    readme += `## 📄 Páginas y Rutas\n\n`;
    readme += `| Ruta | Descripción |\n`;
    readme += `|------|-------------|\n`;
    
    const descripciones = {
      '/': 'Página principal / Home',
      '/login': 'Inicio de sesión',
      '/registro': 'Registro de usuario',
      '/panel': 'Panel de usuario',
      '/panel/mi-membresia': 'Gestión de membresía del usuario',
      '/panel/mis-servicios': 'Servicios publicados por el usuario',
      '/panel/perfil': 'Perfil del usuario',
      '/admin': 'Panel de administración',
      '/admin/usuarios': 'Gestión de usuarios (admin)',
      '/admin/membresias': 'Gestión de membresías (admin)',
      '/servicios': 'Listado de servicios',
      '/servicio/:id': 'Detalle de un servicio',
      '/perfil/:id': 'Perfil público de un usuario',
    };

    rutas.forEach(ruta => {
      const desc = descripciones[ruta] || '—';
      readme += `| \`${ruta}\` | ${desc} |\n`;
    });
    readme += '\n';
  }

  // Componentes principales
  if (todosComponentes.length > 0) {
    readme += `## 🧩 Componentes Principales\n\n`;
    readme += `| Componente | Archivo |\n`;
    readme += `|------------|---------|\n`;
    todosComponentes
      .filter(c => !c.nombre.match(/^[a-z]/))
      .slice(0, 40)
      .forEach(c => {
        readme += `| \`${c.nombre}\` | \`${c.archivo}\` |\n`;
      });
    readme += '\n';
  }

  // Base de datos - Tablas
  if (tablas.length > 0) {
    const tablasUnicas = [...new Set(tablas)].sort();
    readme += `## 🗄️ Base de Datos (Supabase)\n\n`;
    readme += `### Tablas utilizadas\n\n`;
    tablasUnicas.forEach(t => readme += `- \`${t}\`\n`);
    readme += '\n';
  }

  // RPCs
  if (rpcs.length > 0) {
    const rpcsUnicas = [...new Set(rpcs)].sort();
    readme += `### Funciones SQL (RPC)\n\n`;
    rpcsUnicas.forEach(r => readme += `- \`${r}()\`\n`);
    readme += '\n';
  }

  // Edge Functions
  if (edgeFunctions.length > 0) {
    const efsUnicas = [...new Set(edgeFunctions)].sort();
    readme += `### Edge Functions\n\n`;
    efsUnicas.forEach(ef => readme += `- \`${ef}\`\n`);
    readme += '\n';
  }

  // Variables de entorno
  if (envVars.length > 0) {
    readme += `## ⚙️ Variables de Entorno\n\n`;
    readme += `Crear archivo \`.env.local\` en la raíz con:\n\n`;
    readme += '```env\n';
    envVars.forEach(v => readme += `${v}=\n`);
    readme += '```\n\n';
  }

  // Scripts disponibles
  if (pkg?.scripts && Object.keys(pkg.scripts).length > 0) {
    readme += `## 🚀 Comandos disponibles\n\n`;
    readme += '```bash\n';
    Object.entries(pkg.scripts).forEach(([cmd, script]) => {
      readme += `npm run ${cmd.padEnd(15)} # ${script}\n`;
    });
    readme += '```\n\n';
  }

  // Cómo correr el proyecto
  readme += `## 💻 Instalación y uso local\n\n`;
  readme += '```bash\n';
  readme += `# 1. Clonar el repositorio\n`;
  readme += `git clone <url-del-repo>\n`;
  readme += `cd ${nombreProyecto}\n\n`;
  readme += `# 2. Instalar dependencias\n`;
  readme += `npm install\n\n`;
  readme += `# 3. Configurar variables de entorno\n`;
  readme += `cp .env.example .env.local\n`;
  readme += `# Completar los valores en .env.local\n\n`;
  readme += `# 4. Correr en desarrollo\n`;
  readme += `npm run dev\n`;
  readme += '```\n\n';

  // Estructura del proyecto
  readme += `## 📁 Estructura del Proyecto\n\n`;
  readme += '```\n';
  readme += `${nombreProyecto}/\n`;
  readme += arbolDir;
  readme += '```\n\n';

  // Checklist de pruebas para usuario
  readme += `## ✅ Checklist de pruebas\n\n`;
  readme += `### Como usuario registrado\n\n`;
  
  const checklistUsuario = [
    '[ ] Registro con email y contraseña',
    '[ ] Login con email y contraseña',
    '[ ] Login con Google (si está habilitado)',
    '[ ] Modal de código promocional al registrarse',
    '[ ] Ver y editar perfil propio',
    '[ ] Publicar un servicio (nombre, descripción, fotos, mapa)',
    '[ ] Editar un servicio publicado',
    '[ ] Eliminar un servicio',
    '[ ] Ver límite de servicios según membresía',
    '[ ] Ver límite de fotos según membresía',
    '[ ] Comentar el perfil de otro usuario',
    '[ ] No poder comentar el propio perfil',
    '[ ] Ver sección Mi Membresía',
    '[ ] Pagar membresía Premium (Mercado Pago)',
    '[ ] Verificar activación de Premium después del pago',
    '[ ] Cancelar membresía',
    '[ ] Aplicar código promocional',
    '[ ] Ver notificaciones',
    '[ ] Buscar servicios por categoría / filtros',
  ];

  checklistUsuario.forEach(item => readme += `- ${item}\n`);

  readme += `\n### Como administrador\n\n`;
  
  const checklistAdmin = [
    '[ ] Acceder al panel de administración',
    '[ ] Ver listado de usuarios',
    '[ ] Gestionar membresías manualmente',
    '[ ] Moderar comentarios',
    '[ ] Ver reportes',
    '[ ] Gestionar códigos promocionales',
    '[ ] Activar/desactivar modo mantenimiento',
    '[ ] Suspender usuarios',
  ];

  checklistAdmin.forEach(item => readme += `- ${item}\n`);

  readme += `\n---\n\n`;
  readme += `*README generado automáticamente con \`node generate-readme.js\`*\n`;

  // ============================================================
  // GUARDAR
  // ============================================================
  fs.writeFileSync(OUTPUT_FILE, readme, 'utf-8');

  console.log('\n✅ README.md generado exitosamente!\n');
  console.log(`📊 Resumen del análisis:`);
  console.log(`   - Archivos analizados: ${archivos.length}`);
  console.log(`   - Componentes encontrados: ${todosComponentes.length}`);
  console.log(`   - Tablas de BD detectadas: ${[...new Set(tablas)].length}`);
  console.log(`   - RPCs detectadas: ${[...new Set(rpcs)].length}`);
  console.log(`   - Rutas detectadas: ${rutas.length}`);
  console.log(`   - Funcionalidades: ${todosFuncionalidades.size}`);
  console.log(`\n📄 Archivo guardado en: ${OUTPUT_FILE}\n`);
}

// Ejecutar
generarReadme();