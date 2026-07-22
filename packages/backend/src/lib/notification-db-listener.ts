import { Client } from 'pg';
import { databaseUrl } from './db.js';
import { publishUserNotificationEvent } from './notification-events.js';

const CHANNEL = 'user_notifications_changed';
const DEFAULT_RECONNECT_MS = 5000;

type NotificationPayload = {
  operation?: string | null;
  tenant_id?: string | null;
  user_id?: string | null;
  notification_id?: string | null;
  emitted_at?: string | null;
};

let started = false;
let client: Client | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

function getReconnectMs(): number {
  const parsed = Number(process.env.NOTIFICATION_DB_NOTIFY_RECONNECT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RECONNECT_MS;
}

function parsePayload(rawPayload: string | undefined): NotificationPayload | null {
  if (!rawPayload) return null;
  try {
    return JSON.parse(rawPayload) as NotificationPayload;
  } catch (error) {
    console.warn('[notification-db-listener] Payload invalido recibido por NOTIFY:', error);
    return null;
  }
}

async function connectListener() {
  if (!started) return;

  const nextClient = new Client({ connectionString: databaseUrl, ssl: false });

  nextClient.on('notification', (message) => {
    if (message.channel !== CHANNEL) return;
    const payload = parsePayload(message.payload);
    if (!payload) return;
    publishUserNotificationEvent(
      payload.tenant_id,
      payload.user_id,
      'user_notifications_changed',
      payload.notification_id || null,
      payload.operation || null
    );
  });

  nextClient.on('error', (error) => {
    console.error('[notification-db-listener] Conexion LISTEN con error:', error);
    void reconnectListener();
  });

  nextClient.on('end', () => {
    if (started) void reconnectListener();
  });

  try {
    await nextClient.connect();
    await nextClient.query(`LISTEN ${CHANNEL}`);
    client = nextClient;
    console.log(`[notification-db-listener] Escuchando canal PostgreSQL: ${CHANNEL}`);
  } catch (error) {
    console.error('[notification-db-listener] No se pudo iniciar LISTEN:', error);
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

export function startNotificationDbListener() {
  if (started) return;
  started = true;
  void connectListener();
}

export async function stopNotificationDbListener() {
  started = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  const currentClient = client;
  client = null;
  if (currentClient) await currentClient.end().catch(() => undefined);
}
