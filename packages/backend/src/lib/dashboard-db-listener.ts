import { Client } from 'pg';
import { databaseUrl } from './db.js';
import { publishTenantDashboardEvent } from './dashboard-events.js';

const CHANNEL = 'employee_time_punches_changed';
const DEFAULT_RECONNECT_MS = 5000;
const DEFAULT_DEBOUNCE_MS = 750;

type PunchNotificationPayload = {
  operation?: string;
  tenant_id?: string | null;
  employee_id?: string | null;
  punch_id?: string | null;
  punch_datetime?: string | null;
  emitted_at?: string | null;
};

let started = false;
let client: Client | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
const tenantDebounceTimers = new Map<string, NodeJS.Timeout>();
const pendingTenantEmployees = new Map<string, Set<string>>();

function getDebounceMs(): number {
  const parsed = Number(process.env.DASHBOARD_DB_NOTIFY_DEBOUNCE_MS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_DEBOUNCE_MS;
}

function getReconnectMs(): number {
  const parsed = Number(process.env.DASHBOARD_DB_NOTIFY_RECONNECT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RECONNECT_MS;
}

function parsePayload(rawPayload: string | undefined): PunchNotificationPayload | null {
  if (!rawPayload) return null;
  try {
    return JSON.parse(rawPayload) as PunchNotificationPayload;
  } catch (error) {
    console.warn('[dashboard-db-listener] Payload invalido recibido por NOTIFY:', error);
    return null;
  }
}

function scheduleDashboardEvent(payload: PunchNotificationPayload) {
  const tenantId = String(payload.tenant_id || '').trim();
  if (!tenantId) return;

  const employeeId = String(payload.employee_id || '').trim();
  if (employeeId) {
    if (!pendingTenantEmployees.has(tenantId)) pendingTenantEmployees.set(tenantId, new Set());
    pendingTenantEmployees.get(tenantId)!.add(employeeId);
  }

  const existingTimer = tenantDebounceTimers.get(tenantId);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(() => {
    tenantDebounceTimers.delete(tenantId);
    const employees = pendingTenantEmployees.get(tenantId) || new Set<string>();
    pendingTenantEmployees.delete(tenantId);
    const employeeForEvent = employees.size === 1 ? Array.from(employees)[0] : null;
    publishTenantDashboardEvent(tenantId, 'employee_time_punches_changed', employeeForEvent);
  }, getDebounceMs());

  tenantDebounceTimers.set(tenantId, timer);
}

async function connectListener() {
  if (!started) return;

  const nextClient = new Client({
    connectionString: databaseUrl,
    ssl: false,
  });

  nextClient.on('notification', (message) => {
    if (message.channel !== CHANNEL) return;
    const payload = parsePayload(message.payload);
    if (payload) scheduleDashboardEvent(payload);
  });

  nextClient.on('error', (error) => {
    console.error('[dashboard-db-listener] Conexion LISTEN con error:', error);
    void reconnectListener();
  });

  nextClient.on('end', () => {
    if (started) void reconnectListener();
  });

  try {
    await nextClient.connect();
    await nextClient.query(`LISTEN ${CHANNEL}`);
    client = nextClient;
    console.log(`[dashboard-db-listener] Escuchando canal PostgreSQL: ${CHANNEL}`);
  } catch (error) {
    console.error('[dashboard-db-listener] No se pudo iniciar LISTEN:', error);
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
  if (currentClient) {
    await currentClient.end().catch(() => undefined);
  }
  scheduleReconnect();
}

export function startDashboardDbListener() {
  if (started) return;
  started = true;
  void connectListener();
}

export async function stopDashboardDbListener() {
  started = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  for (const timer of tenantDebounceTimers.values()) clearTimeout(timer);
  tenantDebounceTimers.clear();
  pendingTenantEmployees.clear();
  const currentClient = client;
  client = null;
  if (currentClient) await currentClient.end().catch(() => undefined);
}
