import { Client } from 'pg';
import { databaseUrl } from './db.js';
import { publishTenantShiftPlanningEvent, ShiftPlanningEvent } from './shift-planning-events.js';

const CHANNEL = 'shift_planning_changed';
const DEFAULT_RECONNECT_MS = 5000;

let started = false;
let client: Client | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

function getReconnectMs(): number {
  const parsed = Number(process.env.SHIFT_PLANNING_DB_NOTIFY_RECONNECT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RECONNECT_MS;
}

function parsePayload(rawPayload: string | undefined): ShiftPlanningEvent | null {
  if (!rawPayload) return null;
  try {
    return JSON.parse(rawPayload) as ShiftPlanningEvent;
  } catch (error) {
    console.warn('[shift-planning-db-listener] Payload invalido recibido por NOTIFY:', error);
    return null;
  }
}

async function connectListener() {
  if (!started) return;
  const nextClient = new Client({ connectionString: databaseUrl, ssl: false });

  nextClient.on('notification', (message) => {
    if (message.channel !== CHANNEL) return;
    const payload = parsePayload(message.payload);
    if (payload) publishTenantShiftPlanningEvent(payload);
  });
  nextClient.on('error', (error) => {
    console.error('[shift-planning-db-listener] Conexion LISTEN con error:', error);
    void reconnectListener();
  });
  nextClient.on('end', () => {
    if (started) void reconnectListener();
  });

  try {
    await nextClient.connect();
    await nextClient.query(`LISTEN ${CHANNEL}`);
    client = nextClient;
    console.log(`[shift-planning-db-listener] Escuchando canal PostgreSQL: ${CHANNEL}`);
  } catch (error) {
    console.error('[shift-planning-db-listener] No se pudo iniciar LISTEN:', error);
    await nextClient.end().catch(() => undefined);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (!started || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectListener();
  }, getReconnectMs());
}

async function reconnectListener() {
  if (!started) return;
  const currentClient = client;
  client = null;
  if (currentClient) await currentClient.end().catch(() => undefined);
  scheduleReconnect();
}

export function startShiftPlanningDbListener() {
  if (started) return;
  started = true;
  void connectListener();
}

export async function stopShiftPlanningDbListener() {
  started = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  const currentClient = client;
  client = null;
  if (currentClient) await currentClient.end().catch(() => undefined);
}
