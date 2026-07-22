import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Importar rotas principales
import mainRouter from './index.js';
import { setupSwagger } from './swagger.js';
import { startDashboardDbListener, stopDashboardDbListener } from './lib/dashboard-db-listener.js';
import { startNotificationDbListener, stopNotificationDbListener } from './lib/notification-db-listener.js';
import { assertAuthConfiguration } from './lib/postgres-client.js';

// Cargar variables de entorno desde packages/backend/.env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({
  path: path.resolve(__dirname, '../.env.local'),
  override: process.env.NODE_ENV !== 'production',
});

const app = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3001;
assertAuthConfiguration();

const allowedOrigins = String(process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
if (allowedOrigins.length === 0) {
  throw new Error('FRONTEND_URL debe contener al menos un origen permitido');
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(
  cors({
    origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origen no autorizado por CORS'));
    },
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Bootstrap-Token'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

// Photo uploads are sent as base64 JSON payloads, so we need a higher body limit.
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

setupSwagger(app, mainRouter);

// ============================================================================
// REGISTRAR RUTAS
// ============================================================================

// Rutas principales (todas las rutas de la app)
app.use('/', mainRouter);

// Rutas legacy (para compatibilidad con paths legacy)
//app.use('/make-server-e19f2094', mainRouter);

// ============================================================================
// ERROR HANDLING Y 404
// ============================================================================

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method,
    hint: 'Las rutas pueden estar bajo /make-server-e19f2094 o / dependiendo de la configuración',
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  startDashboardDbListener();
  startNotificationDbListener();
  console.log(`
╔════════════════════════════════════════════════════╗
║  🚀 Backend Local - Turnos Titanium Enterprise   ║
╠════════════════════════════════════════════════════╣
║  Puerto: ${PORT}
║  URL: http://localhost:${PORT}
║  Health: http://localhost:${PORT}/health
║  Modo: Desarrollo (local con PostgreSQL propio)
║
║  Rutas disponibles:
║    GET  /health                      → Health check
║    POST /bootstrap/ensure-system-admin  → Crear system.admin
║    GET  /bootstrap/wizard-state      → Estado del wizard
║    POST /bootstrap/step1-tenant      → Paso 1 wizard
║    POST /bootstrap/step2-admin       → Paso 2 wizard
║    GET  /tenant/settings             → Parámetros sistema
║    
║  Nota: Las rutas también están disponibles bajo:
║    /* (para compatibilidad)
║
╚════════════════════════════════════════════════════╝
  `);
});

const shutdown = async () => {
  await Promise.all([stopDashboardDbListener(), stopNotificationDbListener()]);
  process.exit(0);
};

process.once('SIGINT', () => {
  void shutdown();
});

process.once('SIGTERM', () => {
  void shutdown();
});

