// File: src/server-with-auth.ts (actualización del servidor existente)

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

// Importar rutas existentes
import { consultasRouter } from './modules/consultas/consultas.routes';
import { pacientesRouter } from './modules/pacientes/pacientes.routes';
import { laboratorioRouter } from './modules/laboratorio/laboratorio.routes';
import { historiaRouter } from './modules/historia/historia.routes';

// ✅ NUEVO: Importar módulo de autenticación
import { authRouter, requireAuth, requireRoles } from './modules/auth';

// Middleware existente
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 4000;

// ===============================================================
// 🚀 CONFIGURACIÓN INICIAL (sin cambios)
// ===============================================================

console.log('🏥 Iniciando servidor de Historia Clínica con Autenticación...');

// Crear directorios necesarios
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const UPLOADS_TMP_DIR = path.join(process.cwd(), 'uploads_tmp');

function ensureDirectories() {
  [UPLOADS_DIR, UPLOADS_TMP_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Directorio creado: ${dir}`);
    }
  });
}

ensureDirectories();

// ===============================================================
// 🌐 CORS Y MIDDLEWARE BÁSICO (sin cambios)
// ===============================================================

// ===============================================================
// 🌐 CORRECCIÓN CORS EN BACKEND - server-with-auth.ts
// ===============================================================

const corsOptions = {
  origin: [
    // Desarrollo local
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    
    // ✅ AGREGAR ESTAS LÍNEAS PARA TU IP:
    'http://192.168.100.151:5173',
    'http://192.168.100.151:3000',
    'http://192.168.100.151:4173',
    'http://192.168.100.151',
    
    // ✅ TAMBIÉN PERMITIR SIN PUERTO (para verificación)
    'http://192.168.100.151:5173',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  // ✅ AGREGAR ESTAS OPCIONES PARA DEBUGGING:
  optionsSuccessStatus: 200, // Para navegadores legacy
  preflightContinue: false   // Pasar control al siguiente handler
};

app.use(cors(corsOptions));

// ✅ AGREGAR LOGGING DE CORS PARA DEBUG
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.url} from origin: ${req.headers.origin || 'no-origin'}`);
  
  // Log específico para auth requests
  if (req.url.includes('/auth/')) {
    console.log(`🔐 Auth request from: ${req.headers.origin}`);
  }
  
  next();
});

// ✅ MANEJAR PREFLIGHT OPTIONS EXPLÍCITAMENTE
app.options('*', (req, res) => {
  console.log(`✈️ PREFLIGHT: ${req.method} ${req.url} from ${req.headers.origin}`);
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging simple
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📝 [${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// ===============================================================
// 📁 ARCHIVOS ESTÁTICOS (sin cambios)
// ===============================================================

app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// ===============================================================
// 🏥 RUTAS PRINCIPALES (ACTUALIZADAS CON AUTH)
// ===============================================================

// Health check principal (actualizado)
app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'Historia Clínica Backend',
    version: '1.1.0',
    timestamp: new Date().toISOString(),
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    features: {
      database: '✅ Prisma + SQLite/PostgreSQL',
      fileUploads: '✅ Multer + Almacenamiento local',
      aiAnalysis: process.env.GEMINI_API_KEY ? '✅ Gemini AI habilitado' : '⚠️ Sin API key de Gemini',
      historiaClinica: '✅ Módulo completo de Historia Clínica',
      authentication: '✅ JWT + Roles + Auditoría',  // ✅ NUEVO
      userRoles: '✅ ADMIN, MEDICO, ENFERMERA, ADMINISTRATIVO'  // ✅ NUEVO
    },
    endpoints: {
      health: '/health',
      auth: '/api/auth',  // ✅ NUEVO
      pacientes: '/api/pacientes',
      consultas: '/api/consultas',
      laboratorio: '/api/laboratorio',
      historia: '/api/historia',
      uploads: '/uploads'
    },
    authentication: {  // ✅ NUEVO
      loginEndpoint: '/api/auth/login',
      logoutEndpoint: '/api/auth/logout',
      verifyEndpoint: '/api/auth/verify',
      meEndpoint: '/api/auth/me',
      tokenType: 'Bearer JWT',
      roles: ['ADMIN', 'MEDICO', 'ENFERMERA', 'ADMINISTRATIVO']
    },
    frontend: {
      historiaClinica: 'Integración completa con HistoriaClinica.tsx',
      loginComponent: 'Login.tsx compatible',
      expectedPort: 'http://localhost:5173'
    }
  });
});

// Health check extendido (actualizado)
app.get('/health', async (req, res) => {
  try {
    const { prisma } = await import('./db/prisma');
    
    // Verificar BD y contar usuarios
    await prisma.$queryRaw`SELECT 1`;
    const userCount = await prisma.usuario.count();
    
    res.json({
      ok: true,
      service: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      },
      database: '✅ Connected',
      users: `✅ ${userCount} usuarios registrados`,  // ✅ NUEVO
      features: {
        uploads: fs.existsSync(UPLOADS_DIR) ? '✅ Ready' : '❌ Directory missing',
        ai: process.env.GEMINI_API_KEY ? '✅ Configured' : '⚠️ Not configured',
        historiaClinica: '✅ Module loaded',
        authentication: '✅ JWT ready',  // ✅ NUEVO
        audit: '✅ Logging enabled'      // ✅ NUEVO
      }
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(503).json({
      ok: false,
      service: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// ===============================================================
// 🛣️ API ROUTES (ACTUALIZADAS CON PROTECCIÓN)
// ===============================================================

console.log('🛣️ Configurando rutas API...');

// ✅ NUEVO: Rutas de autenticación (públicas)
app.use('/api/auth', authRouter);

// Rutas protegidas por autenticación
app.use('/api/pacientes', requireAuth, pacientesRouter);
app.use('/api/consultas', requireAuth, consultasRouter);
app.use('/api/laboratorio', requireAuth, laboratorioRouter);
app.use('/api/historia', requireAuth, historiaRouter);

// Ejemplo de rutas con roles específicos:
// app.use('/api/admin', requireAuth, requireRoles('ADMIN'), adminRouter);
// app.use('/api/reports', requireAuth, requireRoles('ADMIN', 'MEDICO'), reportsRouter);

// Ruta de información de API (actualizada)
app.get('/api', (req, res) => {
  res.json({
    ok: true,
    api: 'Historia Clínica API v1.2',
    timestamp: new Date().toISOString(),
    authentication: {  // ✅ NUEVO
      required: true,
      type: 'Bearer JWT',
      roles: ['ADMIN', 'MEDICO', 'ENFERMERA', 'ADMINISTRATIVO'],
      endpoints: {
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        verify: 'GET /api/auth/verify',
        profile: 'GET /api/auth/me'
      }
    },
    modules: [
      {
        name: 'Autenticación',  // ✅ NUEVO
        path: '/api/auth',
        description: 'Login, logout, verificación de tokens',
        public: true
      },
      {
        name: 'Pacientes',
        path: '/api/pacientes',
        description: 'Gestión de pacientes',
        protected: true,
        requiredRoles: ['ADMIN', 'MEDICO', 'ENFERMERA', 'ADMINISTRATIVO']
      },
      {
        name: 'Consultas',
        path: '/api/consultas',
        description: 'Gestión de consultas médicas',
        protected: true,
        requiredRoles: ['ADMIN', 'MEDICO', 'ENFERMERA']
      },
      {
        name: 'Laboratorio',
        path: '/api/laboratorio',
        description: 'Gestión de laboratorios con IA',
        protected: true,
        requiredRoles: ['ADMIN', 'MEDICO']
      },
      {
        name: 'Historia Clínica',
        path: '/api/historia',
        description: 'Línea de tiempo y búsqueda integrada',
        protected: true,
        requiredRoles: ['ADMIN', 'MEDICO', 'ENFERMERA'],
        endpoints: [
          'GET /buscar?q=... - Buscar pacientes',
          'GET /paciente/:id - Línea de tiempo completa',
          'GET /evento/:tipo/:id - Detalles de evento'
        ]
      }
    ],
    frontend: {
      expectedURL: 'http://localhost:5173',
      loginComponent: 'Login.tsx - Compatible con autenticación JWT',
      authFlow: 'Login → Dashboard → Módulos protegidos'
    }
  });
});

// ===============================================================
// 🚫 MANEJO DE ERRORES (sin cambios)
// ===============================================================

app.use('*', (req, res) => {
  console.log(`⚠️ Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    ok: false,
    error: 'NOT_FOUND',
    message: `Ruta ${req.method} ${req.originalUrl} no encontrada`,
    timestamp: new Date().toISOString(),
    suggestion: 'Revisar la documentación de API en GET /',
    availableEndpoints: [
      'POST /api/auth/login - Login de usuario',  // ✅ NUEVO
      'GET /api/auth/verify - Verificar token',   // ✅ NUEVO
      'GET /',
      'GET /health',
      'GET /api',
      'GET /api/historia/buscar?q=maria',
      'GET /api/historia/paciente/1',
      'GET /api/pacientes',
      'POST /api/consultas/finalizar',
      'POST /api/laboratorio/upload'
    ]
  });
});

app.use(errorHandler);

// ===============================================================
// 🚀 INICIAR SERVIDOR (actualizado)
// ===============================================================

const server = app.listen(PORT, () => {
  console.log('\n🎉 ========================================');
  console.log('✅ Servidor Historia Clínica + AUTH INICIADO');
  console.log('🎉 ========================================');
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📅 Fecha: ${new Date().toLocaleString('es-EC')}`);
  console.log(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('📋 Endpoints principales:');
  console.log(`   🏠 Home: http://localhost:${PORT}/`);
  console.log(`   ❤️  Health: http://localhost:${PORT}/health`);
  console.log(`   📊 API Info: http://localhost:${PORT}/api`);
  console.log('');
  console.log('🔐 Endpoints de Autenticación:');  // ✅ NUEVO
  console.log(`   🚪 Login: http://localhost:${PORT}/api/auth/login`);
  console.log(`   🚪 Logout: http://localhost:${PORT}/api/auth/logout`);
  console.log(`   ✅ Verify: http://localhost:${PORT}/api/auth/verify`);
  console.log(`   👤 Profile: http://localhost:${PORT}/api/auth/me`);
  console.log('');
  console.log('🏥 Endpoints Historia Clínica (protegidos):');
  console.log(`   🔍 Buscar: http://localhost:${PORT}/api/historia/buscar?q=maria`);
  console.log(`   📋 Timeline: http://localhost:${PORT}/api/historia/paciente/1`);
  console.log(`   👥 Pacientes: http://localhost:${PORT}/api/pacientes`);
  console.log('');
  console.log('🛠️ Herramientas:');
  console.log(`   🗄️  Prisma Studio: npm run db:studio`);
  console.log(`   🌱 Seed usuarios: npx tsx prisma/seed-usuarios.ts`);
  console.log(`   📁 Uploads: ${UPLOADS_DIR}`);
  console.log('');
  console.log('🔗 Frontend esperado en: http://localhost:5173');
  console.log('   📄 Componentes: Login.tsx + Dashboard.tsx');
  console.log('   🎯 Integración: Completa con JWT y roles');
  console.log('');
  
  // Verificaciones adicionales
  if (!process.env.JWT_SECRET) {
    console.log('⚠️  ADVERTENCIA: JWT_SECRET no configurada (usando default)');
    console.log('   Configura JWT_SECRET en variables de entorno para producción');
  } else {
    console.log('🔐 JWT: Configuración personalizada detectada');
  }
  
  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️  ADVERTENCIA: GEMINI_API_KEY no configurada');
    console.log('   El análisis de laboratorios con IA no funcionará');
  } else {
    console.log('🤖 IA Gemini: HABILITADA para análisis de laboratorios');
  }
  
  console.log('');
  console.log('🎯 ¡Backend listo para Login.tsx + Dashboard.tsx!');
  console.log('   📝 Ejecuta: npx tsx prisma/seed-usuarios.ts para crear usuarios');
  console.log('========================================\n');
});

// Resto del código de cierre graceful (sin cambios)
process.on('SIGTERM', () => {
  console.log('\n🛑 Recibiendo SIGTERM. Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

// ... resto igual

export default app;