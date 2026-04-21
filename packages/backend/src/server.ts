import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Importar rotas principales
import mainRouter from './index.js';

// Cargar variables de entorno desde packages/backend/.env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '../.env.local') });

process.env.DATABASE_URL ||= 'postgresql://postgres:51mul4cr05.5n9r-2025@192.168.71.104:5432/tt_db';
process.env.Postgres_URL ||= process.env.DATABASE_URL;
process.env.Postgres_SERVICE_ROLE_KEY ||= 'local-postgres';
process.env.Postgres_ANON_KEY ||= 'local-postgres';

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: '*',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Bootstrap-Token'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// REGISTRAR RUTAS
// ============================================================================

// Rutas principales (todas las rutas de la app)
app.use('/', mainRouter);

// Rutas legacy (para compatibilidad con paths legacy)
app.use('/make-server-e19f2094', mainRouter);

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
║    /make-server-e19f2094/* (para compatibilidad)
║
╚════════════════════════════════════════════════════╝
  `);
});

