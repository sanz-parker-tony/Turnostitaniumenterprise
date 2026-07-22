import { Router, Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { resolveEffectiveAttendanceTimeZone, resolveRequiredEffectiveNumberSetting } from '../lib/effective-settings.js';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { resolveAuthorizedEmployeeIds } from '../lib/user-data-scope.js';

const router = Router();

const PUNCH_KEY_GROUP_KEY = 'PUNCH_KEY';
const PUNCH_SOURCE_GROUP_KEY = 'PUNCH_SOURCE';
const TIME_PUNCH_STATUS_GROUP_KEY = 'TIME_PUNCH_STATUS';
const REQUEST_STATUS_GROUP_KEY = 'REQUEST_STATUS';
const ABSENCE_DISCOUNT_METHOD_GROUP_KEY = 'JUSTIFY_METHOD';
const SHIFT_CHANGE_REQUEST_STATUS_GROUP_KEY = 'SHIFT_CHANGE_REQUEST_STATUS';
const TIME_PUNCH_CHANGE_REQUEST_TYPE_GROUP_KEY = 'TIME_PUNCH_CHANGE_REQUEST_TYPE';
const TIME_PUNCH_CHANGE_REQUEST_STATUS_GROUP_KEY = 'TIME_PUNCH_CHANGE_REQUEST_STATUS';
const USER_NOTIFICATION_TYPE_GROUP_KEY = 'USER_NOTIFICATION_TYPE';
const REQUEST_SUPPORT_DOCS_PATH_SETTING_KEY = 'REQUEST_SUPPORT_DOCS_PATH';
const REQUEST_SUPPORT_DOCS_MAX_SIZE_SETTING_KEY = 'REQUEST_SUPPORT_DOCS_MAX_SIZE_BYTES';
const FIXED_NOTES = 'marcaci\u00f3n manual v\u00eda web';
const MIN_MINUTES_BETWEEN_VALID_PUNCHES_SETTING_KEY = 'MIN_MINUTES_BETWEEN_VALID_PUNCHES';
const ROUTE_TRACKING_NOTES = 'marcacion de recorrido - fuera de recinto autorizado';

async function validateEventPunchSelection(params: {
  tenantId: string;
  employeeId: string;
  attendanceEventId: string;
  targetPunchId: string | null;
}): Promise<string | null> {
  const rulesResult = await pool.query(
    `
      SELECT punch_key_lookup_id
      FROM public.attendance_event_punch_keys
      WHERE tenant_id = $1::uuid
        AND attendance_event_id = $2::uuid
        AND is_active = true
    `,
    [params.tenantId, params.attendanceEventId]
  );

  const configuredPunchKeyIds = new Set(
    rulesResult.rows.map((row) => String(row.punch_key_lookup_id))
  );
  if (configuredPunchKeyIds.size > 0 && !params.targetPunchId) {
    return 'target_punch_id es obligatorio para justificar este evento';
  }
  if (!params.targetPunchId) return null;

  const targetPunchResult = await pool.query(
    `
      SELECT id, punch_key_lookup_id
      FROM public.employee_time_punches
      WHERE id = $1::uuid
        AND tenant_id = $2::uuid
        AND employee_id = $3::uuid
        AND is_active = true
      LIMIT 1
    `,
    [params.targetPunchId, params.tenantId, params.employeeId]
  );
  const targetPunch = targetPunchResult.rows[0];
  if (!targetPunch) return 'target_punch_id no corresponde al empleado';
  if (
    configuredPunchKeyIds.size > 0 &&
    !configuredPunchKeyIds.has(String(targetPunch.punch_key_lookup_id || ''))
  ) {
    return 'La marcación seleccionada no corresponde al evento indicado';
  }
  return null;
}

type EmployeeContext = {
  user_id: string;
  tenant_id: string;
  employee_id: string;
  employee_code: string | null;
  employee_name: string | null;
  employee_lastname: string | null;
  employee_photo_path: string | null;
  company_id: string | null;
  company_name: string | null;
  employee_profile_id: string | null;
};

type UserContext = {
  user_id: string;
  tenant_id: string;
  email: string | null;
};

const REQUESTS_APPROVAL_SCREEN_KEYS = ['REQUESTS_MANAGEMENT', 'ATT_APPROVALS'];
const SHIFT_CHANGE_APPROVAL_SCREEN_KEYS = ['SHIFT_CHANGE_APPROVALS'];
const TIME_PUNCH_APPROVAL_SCREEN_KEYS = ['TIME_PUNCH_CHANGE_APPROVALS'];

function getActor(req: Request): string {
  const user = (req as any).user;
  return user?.email || user?.id || 'system';
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTomorrowIsoDate(): string {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  return toLocalIsoDate(now);
}

function diffDaysInclusive(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) return Number.NaN;
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

function normalizeIsoDateInput(value: any): string | null {
  const raw = normalizeNullableText(value);
  if (!raw) return null;
  if (isIsoDate(raw)) return raw;
  const datePart = raw.slice(0, 10);
  return isIsoDate(datePart) ? datePart : null;
}

function normalizeNullableText(value: any): string | null {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  const next = repairCommonMojibake(raw);
  return next || null;
}

function truncateNullableText(value: any, maxLength: number): string | null {
  const raw = normalizeNullableText(value);
  if (!raw) return null;
  return raw.length > maxLength ? raw.slice(0, maxLength) : raw;
}

function getHeaderValue(req: Request, headerName: string): string | null {
  const value = req.headers[headerName.toLowerCase()];
  if (Array.isArray(value)) return normalizeNullableText(value[0]);
  return normalizeNullableText(value);
}

function getClientIp(req: Request): string | null {
  const forwardedFor = getHeaderValue(req, 'x-forwarded-for');
  const raw =
    forwardedFor?.split(',')[0]?.trim() ||
    getHeaderValue(req, 'cf-connecting-ip') ||
    getHeaderValue(req, 'x-real-ip') ||
    req.socket.remoteAddress ||
    null;
  if (!raw) return null;
  return raw.replace(/^::ffff:/, '').slice(0, 64);
}

function detectDeviceType(value: any, userAgent: string | null): string | null {
  const explicit = normalizeNullableText(value)?.toLowerCase();
  if (explicit && ['mobile', 'tablet', 'desktop', 'biometric', 'kiosk', 'other'].includes(explicit)) {
    return explicit;
  }

  const ua = (userAgent || '').toLowerCase();
  if (!ua) return explicit || null;
  if (/ipad|tablet|kindle|silk/.test(ua)) return 'tablet';
  if (/mobi|iphone|android.*mobile|windows phone/.test(ua)) return 'mobile';
  if (/android/.test(ua)) return 'tablet';
  return 'desktop';
}

function normalizeClientMetadata(value: any): Record<string, any> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const json = JSON.stringify(value);
  if (json.length <= 8000) return value;
  return {
    truncated: true,
    original_size_bytes: Buffer.byteLength(json, 'utf8'),
  };
}

function resolvePunchClientInfo(req: Request) {
  const bodyMetadata = normalizeClientMetadata(req.body?.client_metadata);
  const headerUserAgent = getHeaderValue(req, 'user-agent');
  const clientUserAgent = truncateNullableText(req.body?.client_user_agent || bodyMetadata?.user_agent || headerUserAgent, 2000);
  const clientDeviceType = detectDeviceType(req.body?.client_device_type || bodyMetadata?.device_type, clientUserAgent);
  const clientPlatform = truncateNullableText(req.body?.client_platform || bodyMetadata?.platform, 120);
  const clientAppInstanceId = truncateNullableText(req.body?.client_app_instance_id || bodyMetadata?.app_instance_id, 80);
  const clientIp = getClientIp(req);

  const clientMetadata = {
    ...(bodyMetadata || {}),
    server_received_at: new Date().toISOString(),
    http_user_agent: headerUserAgent,
    ip_source: clientIp ? 'request_headers' : null,
  };

  return {
    clientIp,
    clientUserAgent,
    clientDeviceType,
    clientPlatform,
    clientAppInstanceId,
    clientMetadata,
  };
}

function repairCommonMojibake(value: string): string {
  if (!value) return value;
  if (!/[ÃÂâ€]/.test(value)) return value;
  const repaired = Buffer.from(value, 'latin1').toString('utf8');
  return repaired.includes('�') ? value : repaired;
}

function normalizeNullableTimeInput(value: any): string | null {
  const raw = normalizeNullableText(value);
  if (!raw) return null;

  const strict24 = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (strict24) {
    const hh = String(Number(strict24[1])).padStart(2, '0');
    const mm = strict24[2];
    const ss = strict24[3] || '00';
    return `${hh}:${mm}:${ss}`;
  }

  const ampm = raw.match(/^(\d{1,2}):([0-5]\d)\s*([AaPp][Mm])$/);
  if (ampm) {
    let hour = Number(ampm[1]);
    const minute = ampm[2];
    const marker = ampm[3].toUpperCase();
    if (hour < 1 || hour > 12) return null;
    if (marker === 'AM') {
      if (hour === 12) hour = 0;
    } else if (hour !== 12) {
      hour += 12;
    }
    return `${String(hour).padStart(2, '0')}:${minute}:00`;
  }

  return null;
}

function parseNullableCoordinate(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : Number.NaN;
}

function standardizeCoordinate(value: number): number {
  // Seis decimales preservan la posición informada con resolución submétrica
  // y evitan almacenar cantidades variables de decimales entre dispositivos.
  return Number(value.toFixed(6));
}

type GeoPoint = { lng: number; lat: number };
const EARTH_RADIUS_METERS = 6371000;
const DEFAULT_GEOFENCE_TOLERANCE_METERS = 25;
const MAX_GEOFENCE_TOLERANCE_METERS = 50;

function toFiniteGeoPoint(value: any): GeoPoint | null {
  const lng = Number(value?.[0]);
  const lat = Number(value?.[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

function parseGeofencePolygonToRings(rawValue: any): GeoPoint[][] {
  if (rawValue === undefined || rawValue === null) return [];

  let parsed: any = rawValue;
  if (typeof rawValue === 'string') {
    try {
      parsed = JSON.parse(rawValue);
    } catch {
      return [];
    }
  }
  if (!parsed || typeof parsed !== 'object') return [];

  const rings: GeoPoint[][] = [];

  const pushRing = (ring: any[]) => {
    if (!Array.isArray(ring)) return;
    const points = ring.map((item) => toFiniteGeoPoint(item)).filter((p): p is GeoPoint => Boolean(p));
    if (points.length < 3) return;
    const first = points[0];
    const last = points[points.length - 1];
    if (first.lng === last.lng && first.lat === last.lat) {
      points.pop();
    }
    if (points.length >= 3) rings.push(points);
  };

  if (parsed.type === 'Polygon' && Array.isArray(parsed.coordinates?.[0])) {
    pushRing(parsed.coordinates[0]);
  } else if (parsed.type === 'MultiPolygon' && Array.isArray(parsed.coordinates)) {
    for (const polygon of parsed.coordinates) {
      if (Array.isArray(polygon?.[0])) pushRing(polygon[0]);
    }
  }

  return rings;
}

function isPointInsideRing(pointLng: number, pointLat: number, ring: GeoPoint[]): boolean {
  let inside = false;
  let j = ring.length - 1;
  for (let i = 0; i < ring.length; i += 1) {
    const xi = ring[i].lng;
    const yi = ring[i].lat;
    const xj = ring[j].lng;
    const yj = ring[j].lat;
    const intersects =
      yi > pointLat !== yj > pointLat &&
      pointLng < ((xj - xi) * (pointLat - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
    j = i;
  }
  return inside;
}

function clampGeofenceToleranceMeters(accuracyMeters: number | null): number {
  if (!Number.isFinite(accuracyMeters || Number.NaN) || accuracyMeters === null) {
    return DEFAULT_GEOFENCE_TOLERANCE_METERS;
  }
  return Math.min(
    MAX_GEOFENCE_TOLERANCE_METERS,
    Math.max(DEFAULT_GEOFENCE_TOLERANCE_METERS, Math.ceil(accuracyMeters))
  );
}

function geoPointToLocalMeters(point: GeoPoint, origin: GeoPoint): { x: number; y: number } {
  const latRadians = (origin.lat * Math.PI) / 180;
  return {
    x: (((point.lng - origin.lng) * Math.PI) / 180) * EARTH_RADIUS_METERS * Math.cos(latRadians),
    y: (((point.lat - origin.lat) * Math.PI) / 180) * EARTH_RADIUS_METERS,
  };
}

function distancePointToSegmentMeters(point: GeoPoint, start: GeoPoint, end: GeoPoint): number {
  const origin = point;
  const p = { x: 0, y: 0 };
  const a = geoPointToLocalMeters(start, origin);
  const b = geoPointToLocalMeters(end, origin);
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = p.x - a.x;
  const wy = p.y - a.y;
  const segmentLengthSquared = vx * vx + vy * vy;

  if (segmentLengthSquared <= Number.EPSILON) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }

  const projection = Math.max(0, Math.min(1, (wx * vx + wy * vy) / segmentLengthSquared));
  const projectedX = a.x + projection * vx;
  const projectedY = a.y + projection * vy;
  return Math.hypot(p.x - projectedX, p.y - projectedY);
}

function minDistanceToRingMeters(pointLng: number, pointLat: number, ring: GeoPoint[]): number {
  const point = { lng: pointLng, lat: pointLat };
  let minDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < ring.length; i += 1) {
    const start = ring[i];
    const end = ring[(i + 1) % ring.length];
    minDistance = Math.min(minDistance, distancePointToSegmentMeters(point, start, end));
  }
  return minDistance;
}

function resolveWorkLocationForPoint(params: {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  locations: Array<{ id: string; work_location_name: string | null; geofence_polygon: any; time_zone?: string | null }>;
}): {
  inside: boolean;
  work_location_id: string | null;
  work_location_name: string | null;
  time_zone: string | null;
  nearest_work_location_id: string | null;
  nearest_work_location_name: string | null;
  distance_to_nearest_location_meters: number | null;
  message: string;
} {
  const toleranceMeters = clampGeofenceToleranceMeters(params.accuracyMeters ?? null);
  let nearestLocation: {
    id: string;
    work_location_name: string | null;
    time_zone?: string | null;
    distanceMeters: number;
  } | null = null;

  for (const location of params.locations) {
    const rings = parseGeofencePolygonToRings(location.geofence_polygon);
    for (const ring of rings) {
      if (isPointInsideRing(params.longitude, params.latitude, ring)) {
        const name = location.work_location_name || location.id;
        return {
          inside: true,
          work_location_id: location.id,
          work_location_name: location.work_location_name || null,
          time_zone: normalizeNullableText(location.time_zone),
          nearest_work_location_id: location.id,
          nearest_work_location_name: location.work_location_name || null,
          distance_to_nearest_location_meters: 0,
          message: `Está dentro de la localización ${name}`,
        };
      }

      const distanceMeters = minDistanceToRingMeters(params.longitude, params.latitude, ring);
      if (
        Number.isFinite(distanceMeters) &&
        (!nearestLocation || distanceMeters < nearestLocation.distanceMeters)
      ) {
        nearestLocation = {
          id: location.id,
          work_location_name: location.work_location_name || null,
          time_zone: location.time_zone,
          distanceMeters,
        };
      }
    }
  }

  if (nearestLocation && nearestLocation.distanceMeters <= toleranceMeters) {
    const name = nearestLocation.work_location_name || nearestLocation.id;
    return {
      inside: true,
      work_location_id: nearestLocation.id,
      work_location_name: nearestLocation.work_location_name,
      time_zone: normalizeNullableText(nearestLocation.time_zone),
      nearest_work_location_id: nearestLocation.id,
      nearest_work_location_name: nearestLocation.work_location_name,
      distance_to_nearest_location_meters: Math.round(nearestLocation.distanceMeters),
      message: `Está dentro de la localización ${name} por tolerancia GPS (${Math.round(nearestLocation.distanceMeters)} m del polígono)`,
    };
  }

  return {
    inside: false,
    work_location_id: null,
    work_location_name: null,
    time_zone: null,
    nearest_work_location_id: nearestLocation?.id || null,
    nearest_work_location_name: nearestLocation?.work_location_name || null,
    distance_to_nearest_location_meters: nearestLocation && Number.isFinite(nearestLocation.distanceMeters)
      ? Math.round(nearestLocation.distanceMeters)
      : null,
    message: 'No está dentro de ninguna localización predefinida',
  };
}

function isValidDateTime(value: string): boolean {
  const date = new Date(value);
  return Number.isFinite(date.getTime());
}

function toSnapshotTimestamp(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hour}${minute}${second}`;
}

function sanitizeEmployeeCode(value: string | null | undefined): string {
  const raw = String(value || '').trim();
  if (!raw) return 'EMP';
  const normalized = raw.replace(/[^A-Za-z0-9_-]/g, '');
  return normalized || 'EMP';
}

function parseBase64Snapshot(snapshotBase64: string): Buffer {
  const trimmed = String(snapshotBase64 || '').trim();
  if (!trimmed) throw new Error('snapshot_base64 vacio');
  const dataPart = trimmed.startsWith('data:')
    ? (trimmed.split(',', 2)[1] || '')
    : trimmed;
  if (!dataPart) throw new Error('snapshot_base64 sin contenido');
  return Buffer.from(dataPart, 'base64');
}

function parseBase64Document(documentBase64: string): Buffer {
  const trimmed = String(documentBase64 || '').trim();
  if (!trimmed) throw new Error('support_document_base64 vacio');
  const dataPart = trimmed.startsWith('data:')
    ? (trimmed.split(',', 2)[1] || '')
    : trimmed;
  if (!dataPart) throw new Error('support_document_base64 sin contenido');
  return Buffer.from(dataPart, 'base64');
}

function sanitizeSupportDocumentName(value: string | null | undefined): string {
  const raw = String(value || '').trim();
  if (!raw) return 'respaldo.pdf';
  const sanitized = raw
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
  const withExt = sanitized.toLowerCase().endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;
  return withExt || 'respaldo.pdf';
}

function toDocumentDateStamp(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

async function resolveSupportDocumentStorageConfig(
  tenantId: string
): Promise<{ absolutePath: string; maxSizeBytes: number }> {
  const settingsResult = await pool.query(
    `
      SELECT
        ss.id,
        ss.setting_key,
        ss.default_value,
        ts.setting_value AS tenant_value
      FROM public.system_settings ss
      LEFT JOIN public.tenant_settings ts
        ON ts.system_setting_id = ss.id
       AND ts.tenant_id = $1::uuid
       AND ts.is_active = true
      WHERE ss.setting_key = ANY($2::text[])
        AND ss.is_active = true
    `,
    [tenantId, [REQUEST_SUPPORT_DOCS_PATH_SETTING_KEY, REQUEST_SUPPORT_DOCS_MAX_SIZE_SETTING_KEY]]
  );

  let configuredPath = '';
  let configuredMaxSize = '';

  for (const row of settingsResult.rows) {
    const key = String(row.setting_key || '').trim().toUpperCase();
    const resolvedValue = normalizeNullableText(row.tenant_value) || normalizeNullableText(row.default_value) || '';
    if (key === REQUEST_SUPPORT_DOCS_PATH_SETTING_KEY) configuredPath = resolvedValue;
    if (key === REQUEST_SUPPORT_DOCS_MAX_SIZE_SETTING_KEY) configuredMaxSize = resolvedValue;
  }

  if (!configuredPath) {
    throw new Error(`No existe una configuracion activa para ${REQUEST_SUPPORT_DOCS_PATH_SETTING_KEY}`);
  }
  const absolutePath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);

  const parsedMax = Number(configuredMaxSize);
  if (!Number.isFinite(parsedMax) || parsedMax <= 0) {
    throw new Error(`La configuracion ${REQUEST_SUPPORT_DOCS_MAX_SIZE_SETTING_KEY} no es valida`);
  }
  const maxSizeBytes = Math.trunc(parsedMax);

  return { absolutePath, maxSizeBytes };
}

async function saveRequestSupportDocument(params: {
  tenantId: string;
  section: 'absence_requests' | 'shift_change_requests' | 'time_punch_change_requests';
  employeeCode: string | null | undefined;
  requestDate: string | Date;
  fileName: string;
  mimeType: string;
  fileBase64: string;
}): Promise<{
  support_document_path: string;
  support_document_name: string;
  support_document_mime: string;
  support_document_size_bytes: number;
}> {
  const mimeType = String(params.mimeType || '').trim().toLowerCase();
  if (mimeType !== 'application/pdf') {
    throw new Error('Solo se permiten documentos PDF');
  }

  const buffer = parseBase64Document(params.fileBase64);
  if (!buffer.length) {
    throw new Error('El documento PDF está vacío');
  }

  const config = await resolveSupportDocumentStorageConfig(params.tenantId);
  if (buffer.length > config.maxSizeBytes) {
    throw new Error(`El documento supera el tamaño máximo permitido (${config.maxSizeBytes} bytes)`);
  }

  const safeName = sanitizeSupportDocumentName(params.fileName);
  const dateStamp = toDocumentDateStamp(params.requestDate);
  const employeeCode = sanitizeEmployeeCode(params.employeeCode);
  const storedName = `${employeeCode}_${dateStamp}_${randomUUID()}.pdf`;

  const relativePath = path
    .join(params.tenantId, params.section, storedName)
    .split(path.sep)
    .join('/');
  const absoluteFilePath = path.join(config.absolutePath, relativePath);

  await fs.mkdir(path.dirname(absoluteFilePath), { recursive: true });
  await fs.writeFile(absoluteFilePath, buffer);

  return {
    support_document_path: relativePath,
    support_document_name: safeName,
    support_document_mime: mimeType,
    support_document_size_bytes: buffer.length,
  };
}

async function savePunchSnapshot(params: {
  snapshotBase64: string;
  employeeCode: string | null | undefined;
  punchId: string;
  punchDateTime: string | Date;
}): Promise<{ directory: string; fileName: string; fullPath: string }> {
  const buffer = parseBase64Snapshot(params.snapshotBase64);
  const stamp = toSnapshotTimestamp(params.punchDateTime);
  const employeeCode = sanitizeEmployeeCode(params.employeeCode);
  const fileName = `${employeeCode}_${stamp}_${params.punchId}.jpg`;
  const directory = path.resolve(process.cwd(), 'punches_snapshoots');
  const fullPath = path.join(directory, fileName);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(fullPath, buffer);
  return { directory, fileName, fullPath };
}

async function saveRouteTrackingSnapshot(params: {
  snapshotBase64: string;
  employeeCode: string | null | undefined;
  trackingPointId: string;
  trackingDateTime: string | Date;
}): Promise<{ directory: string; fileName: string; relativePath: string; fullPath: string }> {
  const buffer = parseBase64Snapshot(params.snapshotBase64);
  const stamp = toSnapshotTimestamp(params.trackingDateTime);
  const employeeCode = sanitizeEmployeeCode(params.employeeCode);
  const fileName = `${employeeCode}_${stamp}_${params.trackingPointId}.jpg`;
  const folder = path.join('punches_snapshoots', 'route_tracking');
  const directory = path.resolve(process.cwd(), folder);
  const fullPath = path.join(directory, fileName);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(fullPath, buffer);
  return {
    directory,
    fileName,
    relativePath: path.join(folder, fileName).split(path.sep).join('/'),
    fullPath,
  };
}

async function isLookupValueInGroupByKey(
  lookupValueId: string,
  lookupGroupKey: string,
  tenantId: string
): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT lv.id
      FROM public.lookup_values lv
      INNER JOIN public.lookup_groups lg
        ON lg.id = lv.lookup_group_id
      WHERE lv.id = $1::uuid
        AND lg.lookup_group_key = $2
        AND lv.is_active = true
        AND (lv.tenant_id IS NULL OR lv.tenant_id = $3::uuid)
      LIMIT 1
    `,
    [lookupValueId, lookupGroupKey, tenantId]
  );
  return Boolean(result.rows[0]);
}

async function isJustifyMethodAllowed(params: {
  tenantId: string;
  justificationTypeId: string;
  attendanceEventId: string;
  justifyMethodId: string;
}): Promise<boolean> {
  const isCatalogMethod = await isLookupValueInGroupByKey(
    params.justifyMethodId,
    ABSENCE_DISCOUNT_METHOD_GROUP_KEY,
    params.tenantId
  );
  if (!isCatalogMethod) return false;

  const result = await pool.query(
    `
      WITH active_rules AS (
        SELECT
          justification_type_id,
          attendance_event_id,
          justify_method_id
        FROM public.absence_justify_method_rules
        WHERE tenant_id = $1::uuid
          AND is_active = true
      ),
      justification_rules AS (
        SELECT justify_method_id
        FROM active_rules
        WHERE justification_type_id = $2::uuid
      ),
      event_rules AS (
        SELECT justify_method_id
        FROM active_rules
        WHERE attendance_event_id = $3::uuid
      )
      SELECT CASE
        WHEN EXISTS (SELECT 1 FROM justification_rules)
          THEN EXISTS (
            SELECT 1 FROM justification_rules
            WHERE justify_method_id = $4::uuid
          )
        WHEN EXISTS (SELECT 1 FROM event_rules)
          THEN EXISTS (
            SELECT 1 FROM event_rules
            WHERE justify_method_id = $4::uuid
          )
        ELSE true
      END AS allowed
    `,
    [
      params.tenantId,
      params.justificationTypeId,
      params.attendanceEventId,
      params.justifyMethodId,
    ]
  );
  return result.rows[0]?.allowed === true;
}

async function resolveRequestStatusIdByKeys(
  tenantId: string,
  keys: string[]
): Promise<string | null> {
  if (keys.length === 0) return null;
  const normalized = keys.map((key) => key.trim().toUpperCase()).filter(Boolean);
  if (normalized.length === 0) return null;

  const result = await pool.query(
    `
      SELECT lv.id
      FROM public.lookup_values lv
      INNER JOIN public.lookup_groups lg
        ON lg.id = lv.lookup_group_id
      WHERE lg.lookup_group_key = $1
        AND lv.is_active = true
        AND (lv.tenant_id IS NULL OR lv.tenant_id = $2::uuid)
        AND UPPER(lv.lookup_key) = ANY ($3::text[])
      ORDER BY
        CASE
          WHEN UPPER(lv.lookup_key) = $4 THEN 0
          ELSE 1
        END,
        lv.sort_order ASC
      LIMIT 1
    `,
    [REQUEST_STATUS_GROUP_KEY, tenantId, normalized, normalized[0]]
  );
  return result.rows[0]?.id || null;
}

async function resolveDefaultRequestStatusId(tenantId: string): Promise<string | null> {
  const byPending = await resolveRequestStatusIdByKeys(tenantId, [
    'ENVIADA',
    'ENVIADO',
    'SENT',
    'PENDING',
    'PENDIENTE',
    'REQUESTED',
    'SOLICITADO',
  ]);
  if (byPending) return byPending;

  const fallback = await pool.query(
    `
      SELECT lv.id
      FROM public.lookup_values lv
      INNER JOIN public.lookup_groups lg
        ON lg.id = lv.lookup_group_id
      WHERE lg.lookup_group_key = $1
        AND lv.is_active = true
        AND (lv.tenant_id IS NULL OR lv.tenant_id = $2::uuid)
      ORDER BY lv.sort_order ASC, lv.lookup_label ASC
      LIMIT 1
    `,
    [REQUEST_STATUS_GROUP_KEY, tenantId]
  );
  return fallback.rows[0]?.id || null;
}

async function resolveLookupValueIdByGroupKeyAndKeys(
  tenantId: string,
  groupKey: string,
  keys: string[]
): Promise<string | null> {
  const normalized = keys.map((key) => String(key || '').trim().toUpperCase()).filter(Boolean);
  if (normalized.length === 0) return null;

  const result = await pool.query(
    `
      SELECT lv.id
      FROM public.lookup_values lv
      INNER JOIN public.lookup_groups lg
        ON lg.id = lv.lookup_group_id
      WHERE lg.lookup_group_key = $1
        AND lv.is_active = true
        AND UPPER(lv.lookup_key) = ANY($2::text[])
        AND (lv.tenant_id IS NULL OR lv.tenant_id = $3::uuid)
      ORDER BY
        CASE WHEN lv.tenant_id = $3::uuid THEN 0 ELSE 1 END,
        lv.sort_order ASC
      LIMIT 1
    `,
    [groupKey, normalized, tenantId]
  );

  return result.rows[0]?.id || null;
}

async function resolveLookupValueIdByGroupMetadata(
  tenantId: string,
  groupKey: string,
  metadataKey: string,
  metadataValue: string
): Promise<string | null> {
  const result = await pool.query(
    `
      SELECT lv.id
      FROM public.lookup_values lv
      INNER JOIN public.lookup_groups lg
        ON lg.id = lv.lookup_group_id
      WHERE lg.lookup_group_key = $1
        AND lg.is_active = true
        AND lv.is_active = true
        AND (lv.tenant_id IS NULL OR lv.tenant_id = $2::uuid)
        AND UPPER(COALESCE(lv.metadata ->> $3, '')) = UPPER($4)
      ORDER BY
        CASE WHEN lv.tenant_id = $2::uuid THEN 0 ELSE 1 END,
        lv.sort_order ASC
      LIMIT 1
    `,
    [groupKey, tenantId, metadataKey, metadataValue]
  );

  return result.rows[0]?.id || null;
}

async function resolveShiftChangeRequestStatusId(
  tenantId: string,
  keys: string[]
): Promise<string | null> {
  const specializedStatusId = await resolveLookupValueIdByGroupKeyAndKeys(
    tenantId,
    SHIFT_CHANGE_REQUEST_STATUS_GROUP_KEY,
    keys
  );
  if (specializedStatusId) return specializedStatusId;

  return resolveLookupValueIdByGroupKeyAndKeys(
    tenantId,
    REQUEST_STATUS_GROUP_KEY,
    keys
  );
}

function isPendingRequestStatusKey(statusKey: string | null | undefined): boolean {
  const key = String(statusKey || '').trim().toUpperCase();
  return ['PENDING', 'PENDIENTE', 'ENVIADA', 'ENVIADO', 'SENT', 'REQUESTED', 'SOLICITADO'].includes(key);
}

function isClosedRequestStatusKey(statusKey: string | null | undefined): boolean {
  const key = String(statusKey || '').trim().toUpperCase();
  return ['APPROVED', 'APROBADO', 'REJECTED', 'RECHAZADO', 'CANCELLED', 'CANCELED', 'CANCELADO'].includes(key);
}

function isApprovedShiftChangeStatusKey(statusKey: string | null | undefined): boolean {
  const key = String(statusKey || '').trim().toUpperCase();
  return ['APPROVED', 'APROBADO'].includes(key);
}

function isEditableShiftChangeStatusKey(statusKey: string | null | undefined): boolean {
  const key = String(statusKey || '').trim().toUpperCase();
  return [
    'PENDING',
    'PENDIENTE',
    'IN_REVIEW',
    'EN_REVISION',
    'EN_REVISIÓN',
  ].includes(key);
}

function normalizeBooleanInput(value: any): boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value;
  const raw = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'si', 'y'].includes(raw)) return true;
  if (['false', '0', 'no', 'n'].includes(raw)) return false;
  return null;
}

function isEditableTimePunchChangeStatusKey(statusKey: string | null | undefined): boolean {
  const key = String(statusKey || '').trim().toUpperCase();
  return [
    'PENDING',
    'PENDIENTE',
    'IN_REVIEW',
    'EN_REVISION',
    'EN_REVISIÓN',
    'REQUESTED',
    'SOLICITADO',
  ].includes(key);
}

function isClosedTimePunchChangeStatusKey(statusKey: string | null | undefined): boolean {
  const key = String(statusKey || '').trim().toUpperCase();
  return [
    'APPROVED',
    'APROBADO',
    'REJECTED',
    'RECHAZADO',
    'DENEGADO',
    'CANCELLED',
    'CANCELED',
    'CANCELADO',
  ].includes(key);
}

type TimePunchRequestedValues = {
  company_id?: string;
  punch_datetime?: string;
  punch_time_zone?: string | null;
  punch_key?: number;
  time_clock_device_id?: string | null;
  punch_source_id?: string | null;
  time_punch_status_id?: string | null;
  notes?: string | null;
  is_active?: boolean;
};

async function normalizeTimePunchRequestedValues(params: {
  tenantId: string;
  employeeId: string;
  defaultCompanyId: string | null;
  requestTypeKey: string;
  rawValues: any;
  targetCompanyId?: string | null;
}): Promise<TimePunchRequestedValues> {
  const raw = params.rawValues;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('requested_values debe ser un objeto JSON');
  }

  const normalized: TimePunchRequestedValues = {};
  const requestTypeKey = String(params.requestTypeKey || '').trim().toUpperCase();

  const companyIdRaw = normalizeNullableText(raw.company_id);
  const companyId = companyIdRaw || params.targetCompanyId || params.defaultCompanyId || null;
  if (requestTypeKey === 'CREATE_PUNCH') {
    if (!companyId) throw new Error('No se pudo determinar company_id para crear la marcacion');
    const employeeCompanies = await getEmployeeCompanies(params.tenantId, params.employeeId);
    const hasCompany = employeeCompanies.some((row) => row.company_id === companyId);
    if (!hasCompany) throw new Error('company_id no pertenece a las empresas asignadas al empleado');
    normalized.company_id = companyId;
  }

  const punchDateTimeRaw = normalizeNullableText(raw.punch_datetime);
  if (punchDateTimeRaw) {
    const date = new Date(punchDateTimeRaw);
    if (!Number.isFinite(date.getTime())) {
      throw new Error('requested_values.punch_datetime es invalido');
    }
    normalized.punch_datetime = date.toISOString();
  }

  if (raw.punch_time_zone !== undefined || raw.client_time_zone !== undefined) {
    normalized.punch_time_zone = normalizeNullableText(raw.punch_time_zone) || normalizeNullableText(raw.client_time_zone) || null;
  }

  const punchKeyLookupId = normalizeNullableText(raw.punch_key_lookup_id);
  const punchKeyRaw = raw.punch_key;
  if (punchKeyLookupId) {
    const punchKeyLookupResult = await pool.query(
      `
        SELECT (lv.metadata->>'device_code')::integer AS device_code
        FROM public.lookup_values lv
        INNER JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
        WHERE lv.id = $1::uuid
          AND lg.lookup_group_key = $2
          AND lg.is_active = true
          AND lv.is_active = true
          AND (lv.tenant_id IS NULL OR lv.tenant_id = $3::uuid)
          AND COALESCE(lv.metadata->>'device_code', '') ~ '^[0-9]+$'
        LIMIT 1
      `,
      [punchKeyLookupId, PUNCH_KEY_GROUP_KEY, params.tenantId]
    );
    const row = punchKeyLookupResult.rows[0];
    if (!row || !Number.isFinite(Number(row.device_code))) {
      throw new Error('requested_values.punch_key_lookup_id no es valido');
    }
    normalized.punch_key = Math.trunc(Number(row.device_code));
  } else if (punchKeyRaw !== undefined && punchKeyRaw !== null && String(punchKeyRaw).trim() !== '') {
    const parsedPunchKey = Number(punchKeyRaw);
    if (!Number.isFinite(parsedPunchKey)) {
      throw new Error('requested_values.punch_key debe ser numerico');
    }
    normalized.punch_key = Math.trunc(parsedPunchKey);
  }

  if (raw.time_punch_status_id !== undefined) {
    const nextStatusId = normalizeNullableText(raw.time_punch_status_id);
    if (nextStatusId) {
      const statusResult = await pool.query(
        `
          SELECT lv.id
          FROM public.lookup_values lv
          INNER JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
          WHERE lv.id = $1::uuid
            AND lg.lookup_group_key = $2
            AND lg.is_active = true
            AND lv.is_active = true
            AND (lv.tenant_id IS NULL OR lv.tenant_id = $3::uuid)
          LIMIT 1
        `,
        [nextStatusId, TIME_PUNCH_STATUS_GROUP_KEY, params.tenantId]
      );
      if (!statusResult.rows[0]) {
        throw new Error('requested_values.time_punch_status_id no es valido');
      }
      normalized.time_punch_status_id = nextStatusId;
    } else {
      normalized.time_punch_status_id = null;
    }
  }

  if (raw.punch_source_id !== undefined) {
    const nextSourceId = normalizeNullableText(raw.punch_source_id);
    if (nextSourceId) {
      const sourceResult = await pool.query(
        `
          SELECT lv.id
          FROM public.lookup_values lv
          INNER JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
          WHERE lv.id = $1::uuid
            AND lg.lookup_group_key = $2
            AND lg.is_active = true
            AND lv.is_active = true
            AND (lv.tenant_id IS NULL OR lv.tenant_id = $3::uuid)
          LIMIT 1
        `,
        [nextSourceId, PUNCH_SOURCE_GROUP_KEY, params.tenantId]
      );
      if (!sourceResult.rows[0]) {
        throw new Error('requested_values.punch_source_id no es valido');
      }
      normalized.punch_source_id = nextSourceId;
    } else {
      normalized.punch_source_id = null;
    }
  }

  if (raw.time_clock_device_id !== undefined) {
    const nextDeviceId = normalizeNullableText(raw.time_clock_device_id);
    if (nextDeviceId) {
      const effectiveCompanyId = companyId || params.targetCompanyId || params.defaultCompanyId || null;
      const deviceResult = await pool.query(
        `
          SELECT id
          FROM public.time_clock_devices
          WHERE id = $1::uuid
            AND tenant_id = $2::uuid
            AND ($3::uuid IS NULL OR company_id = $3::uuid)
            AND is_active = true
          LIMIT 1
        `,
        [nextDeviceId, params.tenantId, effectiveCompanyId]
      );
      if (!deviceResult.rows[0]) {
        throw new Error('requested_values.time_clock_device_id no es valido');
      }
      normalized.time_clock_device_id = nextDeviceId;
    } else {
      normalized.time_clock_device_id = null;
    }
  }

  if (raw.notes !== undefined) {
    normalized.notes = normalizeNullableText(raw.notes);
  }

  if (raw.is_active !== undefined) {
    const parsedActive = normalizeBooleanInput(raw.is_active);
    if (parsedActive === null) {
      throw new Error('requested_values.is_active debe ser booleano');
    }
    normalized.is_active = parsedActive;
  }

  if (requestTypeKey === 'CREATE_PUNCH') {
    if (!normalized.punch_datetime) throw new Error('requested_values.punch_datetime es obligatorio');
    if (!Number.isFinite(Number(normalized.punch_key))) throw new Error('requested_values.punch_key es obligatorio');
    if (normalized.is_active === undefined) normalized.is_active = true;
  } else if (requestTypeKey === 'UPDATE_PUNCH') {
    const hasEditableFields =
      normalized.punch_datetime !== undefined ||
      normalized.punch_key !== undefined ||
      normalized.time_clock_device_id !== undefined ||
      normalized.punch_source_id !== undefined ||
      normalized.time_punch_status_id !== undefined ||
      normalized.notes !== undefined ||
      normalized.is_active !== undefined;
    if (!hasEditableFields) {
      throw new Error('requested_values debe incluir al menos un campo para actualizar');
    }
  } else if (requestTypeKey === 'TOGGLE_ACTIVE') {
    if (normalized.is_active === undefined) {
      throw new Error('requested_values.is_active es obligatorio para activar/desactivar');
    }
  } else {
    throw new Error('Tipo de solicitud de marcacion no soportado');
  }

  return normalized;
}

async function resolveEmployeeContext(req: Request): Promise<EmployeeContext | null> {
  const user = (req as any).user;
  if (!user?.id) return null;

  const result = await pool.query(
    `
      SELECT
        u.id AS user_id,
        u.tenant_id,
        e.id AS employee_id,
        e.employee_code,
        e.employee_name,
        e.employee_lastname,
        e.employee_photo_path,
        ec.company_id,
        ec.employee_profile_id,
        c.company_name
      FROM public.users u
      INNER JOIN public.employees e
        ON e.user_id = u.id
       AND e.tenant_id = u.tenant_id
       AND e.is_active = true
      LEFT JOIN LATERAL (
        SELECT company_id, employee_profile_id
        FROM public.employee_companies ec
        WHERE ec.tenant_id = u.tenant_id
          AND ec.employee_id = e.id
          AND ec.is_active = true
        ORDER BY ec.created_at DESC NULLS LAST
        LIMIT 1
      ) ec ON true
      LEFT JOIN public.companies c
        ON c.id = ec.company_id
      WHERE u.auth_user_id = $1
        AND u.is_active = true
      LIMIT 1
    `,
    [user.id]
  );

  return (result.rows[0] as EmployeeContext | undefined) || null;
}

async function resolveUserContext(req: Request): Promise<UserContext | null> {
  const user = (req as any).user;
  if (!user?.id) return null;

  const result = await pool.query(
    `
      SELECT
        u.id AS user_id,
        u.tenant_id,
        u.email
      FROM public.users u
      WHERE u.auth_user_id = $1
        AND u.is_active = true
      LIMIT 1
    `,
    [user.id]
  );

  return (result.rows[0] as UserContext | undefined) || null;
}

async function hasScreenActionPermissionForUser(
  tenantId: string,
  userId: string,
  screenKeys: string[],
  actionKey: string
): Promise<boolean> {
  if (!screenKeys.length || !actionKey) return false;

  const result = await pool.query(
    `
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r
        ON r.id = ur.role_id
       AND r.is_active = true
      JOIN public.role_screen_actions rsa
        ON rsa.tenant_id = ur.tenant_id
       AND rsa.role_id = ur.role_id
       AND rsa.is_active = true
       AND rsa.is_allowed = true
      JOIN public.screen_actions sa
        ON sa.id = rsa.screen_action_id
       AND sa.is_active = true
      JOIN public.screens s
        ON s.id = sa.screen_id
       AND s.is_active = true
      JOIN public.actions a
        ON a.id = sa.action_id
       AND a.is_active = true
      WHERE ur.tenant_id = $1::uuid
        AND ur.user_id = $2::uuid
        AND ur.is_active = true
        AND (ur.valid_from IS NULL OR ur.valid_from <= now())
        AND (ur.valid_to IS NULL OR ur.valid_to >= now())
        AND s.screen_key = ANY($3::text[])
        AND a.action_key = $4
      LIMIT 1
    `,
    [tenantId, userId, screenKeys, actionKey]
  );

  return result.rows.length > 0;
}

async function assertApproverActionPermission(params: {
  userContext: UserContext;
  screenKeys: string[];
  actionKey: string;
  errorMessage: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const allowed = await hasScreenActionPermissionForUser(
    params.userContext.tenant_id,
    params.userContext.user_id,
    params.screenKeys,
    params.actionKey
  );
  if (allowed) return { ok: true };
  return { ok: false, status: 403, error: params.errorMessage };
}

async function resolveApproverContext(req: Request): Promise<{
  userContext: UserContext;
} | null> {
  const userContext = await resolveUserContext(req);
  if (!userContext) return null;
  return { userContext };
}

async function resolveManagedEmployeeIdsForApprover(
  tenantId: string,
  userId: string
): Promise<string[]> {
  return resolveAuthorizedEmployeeIds(pool, tenantId, userId);
}

async function resolveAssignedApproverUserIds(
  tenantId: string,
  employeeId: string
): Promise<string[]> {
  const result = await pool.query(
    `
      SELECT DISTINCT ur.user_id::text AS user_id
      FROM public.user_role_employee_assignments ura
      JOIN public.user_roles ur
        ON ur.id = ura.user_role_id
       AND ur.tenant_id = ura.tenant_id
       AND ur.is_active = true
       AND (ur.valid_from IS NULL OR ur.valid_from <= now())
       AND (ur.valid_to IS NULL OR ur.valid_to >= now())
      JOIN public.roles r
        ON r.id = ur.role_id
       AND r.is_active = true
       AND r.is_employee_access_target = true
      JOIN public.users u
        ON u.id = ur.user_id
       AND u.is_active = true
      WHERE ura.tenant_id = $1::uuid
        AND ura.employee_id = $2::uuid
        AND ura.is_active = true
    `,
    [tenantId, employeeId]
  );

  return result.rows
    .map((row) => String(row.user_id || '').trim())
    .filter(Boolean);
}

async function getEmployeeCompanies(tenantId: string, employeeId: string) {
  const result = await pool.query(
    `
      SELECT DISTINCT
        ec.company_id,
        ec.employee_profile_id,
        c.company_name
      FROM public.employee_companies ec
      INNER JOIN public.companies c
        ON c.id = ec.company_id
      WHERE ec.tenant_id = $1
        AND ec.employee_id = $2
        AND ec.is_active = true
      ORDER BY c.company_name ASC
    `,
    [tenantId, employeeId]
  );
  return result.rows;
}

async function findRecentValidPunch(params: {
  tenantId: string;
  employeeId: string;
  validStatusId: string | null;
  punchDateTime: Date;
  minMinutesBetweenPunches: number;
}) {
  if (!params.validStatusId || params.minMinutesBetweenPunches <= 0) return null;

  const result = await pool.query(
    `
      SELECT id, punch_datetime, punch_key
      FROM public.employee_time_punches
      WHERE tenant_id = $1::uuid
        AND employee_id = $2::uuid
        AND time_punch_status_id = $3::uuid
        AND is_active = true
        AND punch_datetime <= $4::timestamptz
        AND punch_datetime >= ($4::timestamptz - ($5::numeric * interval '1 minute'))
      ORDER BY punch_datetime DESC
      LIMIT 1
    `,
    [
      params.tenantId,
      params.employeeId,
      params.validStatusId,
      params.punchDateTime.toISOString(),
      params.minMinutesBetweenPunches,
    ]
  );

  return result.rows[0] || null;
}

async function createRouteTrackingPoint(params: {
  context: EmployeeContext;
  companyId: string;
  trackingDateTime: Date;
  clientTimeZone: string | null;
  latitud: number;
  longitud: number;
  locationAccuracyMeters: number | null;
  snapshotBase64: string;
  actor: string;
  locationValidation: {
    nearest_work_location_id: string | null;
    distance_to_nearest_location_meters: number | null;
    message: string;
  };
  reason: string;
}) {
  const trackingStatusId = await resolveLookupValueIdByGroupKeyAndKeys(
    params.context.tenant_id,
    'ROUTE_TRACKING_STATUS',
    ['ROUTE_POINT_VALID']
  );
  const effectiveTimeZone = params.clientTimeZone || await resolveEffectiveAttendanceTimeZone(pool, {
    tenantId: params.context.tenant_id,
    companyId: params.companyId,
    employeeProfileId: params.context.employee_profile_id,
    employeeId: params.context.employee_id,
  });

  const insertResult = await pool.query(
    `
      INSERT INTO public.employee_route_tracking_points (
        id,
        tenant_id,
        company_id,
        employee_id,
        tracking_datetime,
        tracking_time_zone,
        latitud,
        longitud,
        location_accuracy_meters,
        tracking_status_id,
        nearest_work_location_id,
        distance_to_nearest_location_meters,
        notes,
        is_active,
        created_by
      )
      VALUES (
        gen_random_uuid(),
        $1,$2,$3,$4::timestamptz,$5,$6,$7,$8,$9,$10,$11,$12,true,$13
      )
      RETURNING *
    `,
    [
      params.context.tenant_id,
      params.companyId,
      params.context.employee_id,
      params.trackingDateTime.toISOString(),
      effectiveTimeZone,
      params.latitud,
      params.longitud,
      params.locationAccuracyMeters,
      trackingStatusId,
      params.locationValidation.nearest_work_location_id,
      params.locationValidation.distance_to_nearest_location_meters,
      `${ROUTE_TRACKING_NOTES}. ${params.reason}`,
      params.actor,
    ]
  );

  const trackingPoint = insertResult.rows[0];
  try {
    const snapshot = await saveRouteTrackingSnapshot({
      snapshotBase64: params.snapshotBase64,
      employeeCode: params.context.employee_code,
      trackingPointId: trackingPoint.id,
      trackingDateTime: trackingPoint.tracking_datetime,
    });

    const updateResult = await pool.query(
      `
        UPDATE public.employee_route_tracking_points
           SET snapshot_path = $4,
               updated_by = $5,
               updated_at = now()
         WHERE id = $1
           AND tenant_id = $2
           AND employee_id = $3
         RETURNING *
      `,
      [
        trackingPoint.id,
        params.context.tenant_id,
        params.context.employee_id,
        snapshot.relativePath,
        params.actor,
      ]
    );

    return {
      trackingPoint: updateResult.rows[0] || trackingPoint,
      snapshot,
      trackingTimeZone: effectiveTimeZone,
    };
  } catch (snapshotErr) {
    await pool.query(
      `
        DELETE FROM public.employee_route_tracking_points
        WHERE id = $1
          AND tenant_id = $2
          AND employee_id = $3
      `,
      [trackingPoint.id, params.context.tenant_id, params.context.employee_id]
    );
    throw snapshotErr;
  }
}

router.get('/mark/context', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({
        error: 'No existe empleado asociado al usuario autenticado',
      });
    }

    const [companiesResult, devicesResult, lookupResult] = await Promise.all([
      getEmployeeCompanies(context.tenant_id, context.employee_id),
      pool.query(
        `
          SELECT
            id,
            company_id,
            device_name,
            device_serial_number,
            device_location,
            device_ip
          FROM public.time_clock_devices
          WHERE tenant_id = $1
            AND is_active = true
            AND ($2::uuid IS NULL OR company_id = $2::uuid)
          ORDER BY device_name ASC, device_serial_number ASC
        `,
        [context.tenant_id, context.company_id]
      ),
      pool.query(
        `
          SELECT
            lv.id,
            lv.lookup_key,
            lv.lookup_label,
            lv.lookup_short_label,
            lv.sort_order,
            lv.lookup_group_id,
            lg.lookup_group_key,
            CASE
              WHEN lg.lookup_group_key = 'PUNCH_KEY'
               AND COALESCE(lv.metadata->>'device_code', '') ~ '^[0-9]+$'
                THEN (lv.metadata->>'device_code')::integer
              ELSE NULL
            END AS punch_key_value
            ,NULLIF(lv.metadata->>'direction', '') AS movement_direction
            ,NULLIF(lv.metadata->>'icon_key', '') AS icon_key
            ,NULLIF(lv.metadata->>'kiosk_column', '') AS kiosk_column
          FROM public.lookup_values lv
          INNER JOIN public.lookup_groups lg
            ON lg.id = lv.lookup_group_id
           AND lg.is_active = true
          WHERE lg.lookup_group_key = ANY($1::text[])
            AND lv.is_active = true
            AND (lv.tenant_id IS NULL OR lv.tenant_id = $2::uuid)
          ORDER BY lg.lookup_group_key ASC, lv.sort_order ASC, lv.lookup_label ASC
        `,
        [
          [PUNCH_KEY_GROUP_KEY, PUNCH_SOURCE_GROUP_KEY, TIME_PUNCH_STATUS_GROUP_KEY],
          context.tenant_id,
        ]
      ),
    ]);

    const rows = lookupResult.rows;

    return res.status(200).json({
      success: true,
      employee: {
        id: context.employee_id,
        employee_code: context.employee_code,
        employee_name: context.employee_name,
        employee_lastname: context.employee_lastname,
        employee_photo_path: context.employee_photo_path,
        company_id: context.company_id,
        company_name: context.company_name,
        employee_profile_id: context.employee_profile_id,
      },
      companies: companiesResult,
      devices: devicesResult.rows,
      punch_keys: rows.filter((r) => r.lookup_group_key === PUNCH_KEY_GROUP_KEY),
      punch_sources: rows.filter((r) => r.lookup_group_key === PUNCH_SOURCE_GROUP_KEY),
      punch_statuses: rows.filter((r) => r.lookup_group_key === TIME_PUNCH_STATUS_GROUP_KEY),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/mark/history', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({
        error: 'No existe empleado asociado al usuario autenticado',
      });
    }

    const from = normalizeNullableText(req.query.from);
    const to = normalizeNullableText(req.query.to);
    const limitRaw = Number(req.query.limit ?? 200);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, Math.trunc(limitRaw))) : 200;

    const params: any[] = [context.tenant_id, context.employee_id];
    let whereExtra = '';

    if (from) {
      if (!isIsoDate(from)) return res.status(400).json({ error: 'from debe tener formato YYYY-MM-DD' });
      params.push(`${from}T00:00:00`);
      whereExtra += ` AND p.punch_datetime >= $${params.length}::timestamptz`;
    }
    if (to) {
      if (!isIsoDate(to)) return res.status(400).json({ error: 'to debe tener formato YYYY-MM-DD' });
      params.push(`${to}T23:59:59`);
      whereExtra += ` AND p.punch_datetime <= $${params.length}::timestamptz`;
    }

    params.push(limit);

    const result = await pool.query(
      `
        SELECT
          p.id,
          p.company_id,
          c.company_name,
          p.time_clock_device_id,
          d.device_name,
          d.device_serial_number,
          p.punch_datetime,
          p.punch_time_zone,
          p.punch_key,
          mv.id AS punch_key_lookup_id,
          mv.lookup_label AS movement_label,
          p.punch_source_id,
          src.lookup_label AS punch_source_label,
          p.time_punch_status_id,
          st.lookup_label AS time_punch_status_label,
          p.service_ticket_number,
          p.notes,
          p.latitud,
          p.longitud,
          p.is_active
        FROM public.employee_time_punches p
        LEFT JOIN public.companies c
          ON c.id = p.company_id
        LEFT JOIN public.time_clock_devices d
          ON d.id = p.time_clock_device_id
        LEFT JOIN public.lookup_values src
          ON src.id = p.punch_source_id
        LEFT JOIN public.lookup_values st
          ON st.id = p.time_punch_status_id
        LEFT JOIN public.lookup_values mv
          ON mv.id = p.punch_key_lookup_id
        WHERE p.tenant_id = $1
          AND p.employee_id = $2
          ${whereExtra}
        ORDER BY p.punch_datetime DESC, p.created_at DESC
        LIMIT $${params.length}
      `,
      params
    );

    return res.status(200).json({
      success: true,
      punches: result.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.post('/mark/punch', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({
        error: 'No existe empleado asociado al usuario autenticado',
      });
    }

    const actor = getActor(req);
    const companyIdRequested = normalizeNullableText(req.body?.company_id);
    const requestedDeviceId = normalizeNullableText(req.body?.time_clock_device_id);
    const punchKeyLookupId = normalizeNullableText(req.body?.punch_key_lookup_id);
    const timePunchStatusId = normalizeNullableText(req.body?.time_punch_status_id);
    const punchDateTimeRaw = normalizeNullableText(req.body?.punch_datetime);
    const clientTimeZone = normalizeNullableText(req.body?.client_time_zone);
    const snapshotBase64 = normalizeNullableText(req.body?.snapshot_base64);
    const latitud = parseNullableCoordinate(req.body?.latitud);
    const longitud = parseNullableCoordinate(req.body?.longitud);
    const locationAccuracyMeters = parseNullableCoordinate(req.body?.location_accuracy_meters);
    const clientInfo = resolvePunchClientInfo(req);
    const notes = FIXED_NOTES;
    let punchDateTime = new Date();

    if (punchDateTimeRaw) {
      const parsedClientDate = new Date(punchDateTimeRaw);
      if (!Number.isFinite(parsedClientDate.getTime())) {
        return res.status(400).json({ error: 'punch_datetime es invalido' });
      }

      const maxClientDriftMs = 10 * 60 * 1000;
      if (Math.abs(Date.now() - parsedClientDate.getTime()) > maxClientDriftMs) {
        return res.status(400).json({
          error: 'La hora del dispositivo no coincide con la hora del sistema. Sincronice el reloj y reintente.',
        });
      }

      punchDateTime = parsedClientDate;
    }

    if (!snapshotBase64) {
      return res.status(400).json({ error: 'snapshot_base64 es obligatorio para registrar la marcacion' });
    }
    if (latitud === null || longitud === null) {
      return res.status(400).json({ error: 'latitud y longitud son obligatorias para registrar la marcacion' });
    }
    if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
      return res.status(400).json({ error: 'latitud/longitud deben ser numericas' });
    }
    if (latitud < -90 || latitud > 90) {
      return res.status(400).json({ error: 'latitud fuera de rango (-90 a 90)' });
    }
    if (longitud < -180 || longitud > 180) {
      return res.status(400).json({ error: 'longitud fuera de rango (-180 a 180)' });
    }
    if (locationAccuracyMeters !== null && (!Number.isFinite(locationAccuracyMeters) || locationAccuracyMeters < 0)) {
      return res.status(400).json({ error: 'location_accuracy_meters debe ser numerico mayor o igual a 0' });
    }
    const storedLatitude = standardizeCoordinate(latitud);
    const storedLongitude = standardizeCoordinate(longitud);

    const employeeCompanies = await getEmployeeCompanies(context.tenant_id, context.employee_id);
    const defaultCompanyId = context.company_id || employeeCompanies[0]?.company_id || null;
    const companyId = companyIdRequested || defaultCompanyId;
    if (!companyId) {
      return res.status(400).json({
        error: 'No se pudo determinar la empresa del empleado',
      });
    }

    const selectedEmployeeCompany = employeeCompanies.find((row) => row.company_id === companyId) || null;
    const hasCompany = Boolean(selectedEmployeeCompany);
    if (!hasCompany) {
      return res.status(400).json({
        error: 'La empresa seleccionada no esta asignada al empleado',
      });
    }
    const employeeProfileId = selectedEmployeeCompany?.employee_profile_id || context.employee_profile_id || null;

    if (!punchKeyLookupId) {
      return res.status(400).json({ error: 'punch_key_lookup_id es obligatorio' });
    }

    const punchKeyLookupResult = await pool.query(
      `
        SELECT
          lv.id,
          lv.lookup_label,
          CASE
            WHEN COALESCE(lv.metadata->>'device_code', '') ~ '^[0-9]+$'
              THEN (lv.metadata->>'device_code')::integer
            ELSE NULL
          END AS punch_key_value
        FROM public.lookup_values lv
        INNER JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
        WHERE lv.id = $1
          AND lg.lookup_group_key = $2
          AND lg.is_active = true
          AND lv.is_active = true
          AND (lv.tenant_id IS NULL OR lv.tenant_id = $3::uuid)
        LIMIT 1
      `,
      [punchKeyLookupId, PUNCH_KEY_GROUP_KEY, context.tenant_id]
    );
    const punchKeyRow = punchKeyLookupResult.rows[0];
    if (!punchKeyRow || !Number.isFinite(Number(punchKeyRow.punch_key_value))) {
      return res.status(400).json({
        error: 'El tipo de marcacion seleccionado no es valido',
      });
    }
    const punchKey = Math.trunc(Number(punchKeyRow.punch_key_value));

    const normalizedSourceId = await resolveLookupValueIdByGroupMetadata(
      context.tenant_id,
      PUNCH_SOURCE_GROUP_KEY,
      'usage_key',
      'EMPLOYEE_WEB_PUNCH'
    );
    if (!normalizedSourceId) {
      return res.status(400).json({ error: 'No existe una fuente de marcacion web configurada' });
    }

    let requestedStatusId: string | null = null;
    if (timePunchStatusId) {
      const statusResult = await pool.query(
        `
          SELECT lv.id
          FROM public.lookup_values lv
          INNER JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
          WHERE lv.id = $1
            AND lg.lookup_group_key = $2
            AND lg.is_active = true
            AND lv.is_active = true
            AND (lv.tenant_id IS NULL OR lv.tenant_id = $3::uuid)
          LIMIT 1
        `,
        [timePunchStatusId, TIME_PUNCH_STATUS_GROUP_KEY, context.tenant_id]
      );
      if (!statusResult.rows[0]) return res.status(400).json({ error: 'time_punch_status_id no valido' });
      requestedStatusId = statusResult.rows[0].id;
    }

    const workLocationsResult = await pool.query(
      `
        SELECT
          wl.id,
          wl.work_location_name,
          wl.time_zone,
          wl.geofence_polygon
        FROM public.work_locations wl
        WHERE wl.tenant_id = $1::uuid
          AND wl.is_active = true
          AND wl.geofence_polygon IS NOT NULL
          AND (wl.company_id IS NULL OR wl.company_id = $2::uuid)
        ORDER BY wl.work_location_name ASC
      `,
      [context.tenant_id, companyId]
    );
    const locationValidation = resolveWorkLocationForPoint({
      latitude: latitud,
      longitude: longitud,
      accuracyMeters: locationAccuracyMeters,
      locations: workLocationsResult.rows,
    });
    const shouldCreateRouteTracking = workLocationsResult.rows.length === 0 || !locationValidation.inside || !locationValidation.work_location_id;
    if (shouldCreateRouteTracking) {
      const routeLocationValidation = {
        ...locationValidation,
        message: workLocationsResult.rows.length === 0
          ? 'No existen localizaciones activas con geocerca configurada; se registra como recorrido'
          : 'La ubicacion no esta dentro de un recinto valido; se registra como recorrido',
      };
      const routeResult = await createRouteTrackingPoint({
        context,
        companyId,
        trackingDateTime: punchDateTime,
        clientTimeZone,
        latitud: storedLatitude,
        longitud: storedLongitude,
        locationAccuracyMeters,
        snapshotBase64,
        actor,
        locationValidation: routeLocationValidation,
        reason: routeLocationValidation.message,
      });

      return res.status(201).json({
        success: true,
        route_tracking: true,
        route_tracking_point: routeResult.trackingPoint,
        client_time_zone: clientTimeZone || null,
        tracking_time_zone: routeResult.trackingTimeZone,
        location_validation: routeLocationValidation,
        message: 'Marcacion registrada como punto de recorrido. No afecta asistencia.',
        snapshot: {
          file_name: routeResult.snapshot.fileName,
          folder: 'punches_snapshoots/route_tracking',
          path: routeResult.snapshot.relativePath,
        },
      });
    }

    const resolvedDeviceResult = await pool.query(
      `
        SELECT
          d.id,
          d.device_name,
          d.device_serial_number,
          d.device_location,
          d.work_location_id,
          wl.work_location_name
        FROM public.time_clock_devices d
        LEFT JOIN public.work_locations wl
          ON wl.id = d.work_location_id
         AND wl.tenant_id = d.tenant_id
        WHERE d.tenant_id = $1
          AND d.company_id = $2
          AND d.is_active = true
          AND d.work_location_id = $3
        ORDER BY
          CASE WHEN $4::text IS NOT NULL AND d.id::text = $4::text THEN 0 ELSE 1 END,
          CASE WHEN d.latitude IS NOT NULL AND d.longitude IS NOT NULL THEN 0 ELSE 1 END,
          CASE
            WHEN d.latitude IS NOT NULL AND d.longitude IS NOT NULL
              THEN ((d.latitude - $5::double precision) * (d.latitude - $5::double precision))
                 + ((d.longitude - $6::double precision) * (d.longitude - $6::double precision))
            ELSE NULL
          END ASC NULLS LAST,
          d.device_name ASC,
          d.device_serial_number ASC NULLS LAST,
          d.created_at ASC
        LIMIT 1
      `,
      [
        context.tenant_id,
        companyId,
        locationValidation.work_location_id,
        requestedDeviceId,
        latitud,
        longitud,
      ]
    );
    const resolvedDevice = resolvedDeviceResult.rows[0] || null;
    if (!resolvedDevice?.id) {
      return res.status(422).json({
        error: 'No existe un dispositivo activo asociado a la localizacion validada de la marcacion',
        location_validation: locationValidation,
      });
    }
    const resolvedDeviceId = String(resolvedDevice.id);

    const validStatusId = await resolveLookupValueIdByGroupKeyAndKeys(
      context.tenant_id,
      'TIME_PUNCH_STATUS',
      ['VALID']
    );
    const normalizedStatusId = validStatusId || requestedStatusId || null;
    const effectivePunchTimeZone = locationValidation.time_zone || clientTimeZone || await resolveEffectiveAttendanceTimeZone(pool, {
      tenantId: context.tenant_id,
      companyId,
      employeeProfileId,
      employeeId: context.employee_id,
    });

    const minMinutesBetweenValidPunches = await resolveRequiredEffectiveNumberSetting(pool, {
      tenantId: context.tenant_id,
      companyId,
      employeeProfileId,
      employeeId: context.employee_id,
      settingKey: MIN_MINUTES_BETWEEN_VALID_PUNCHES_SETTING_KEY,
      min: 0,
      max: 1440,
    });

    if (normalizedStatusId && validStatusId && normalizedStatusId === validStatusId) {
      const recentValidPunch = await findRecentValidPunch({
        tenantId: context.tenant_id,
        employeeId: context.employee_id,
        validStatusId,
        punchDateTime,
        minMinutesBetweenPunches: minMinutesBetweenValidPunches,
      });

      if (recentValidPunch) {
        return res.status(409).json({
          error: `Ya existe una marcación válida reciente. Deben pasar al menos ${minMinutesBetweenValidPunches} minutos entre marcaciones válidas.`,
          duplicate_guard: {
            min_minutes_between_valid_punches: minMinutesBetweenValidPunches,
            last_punch_id: recentValidPunch.id,
            last_punch_datetime: recentValidPunch.punch_datetime,
          },
        });
      }
    }

    const insertResult = await pool.query(
      `
        INSERT INTO public.employee_time_punches (
          id,
          tenant_id,
          company_id,
          employee_id,
          time_clock_device_id,
          punch_datetime,
          punch_time_zone,
          punch_key,
          punch_key_lookup_id,
          punch_source_id,
          time_punch_status_id,
          notes,
          latitud,
          longitud,
          location_accuracy_meters,
          client_ip,
          client_user_agent,
          client_device_type,
          client_platform,
          client_app_instance_id,
          client_metadata,
          is_active,
          created_by
        )
        VALUES (
          gen_random_uuid(),
          $1,$2,$3,$4,$5::timestamptz,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb,true,$21
        )
        RETURNING *
      `,
      [
        context.tenant_id,
        companyId,
        context.employee_id,
        resolvedDeviceId,
        punchDateTime.toISOString(),
        effectivePunchTimeZone,
        punchKey,
        punchKeyRow.id,
        normalizedSourceId,
        normalizedStatusId,
        notes,
        storedLatitude,
        storedLongitude,
        locationAccuracyMeters,
        clientInfo.clientIp,
        clientInfo.clientUserAgent,
        clientInfo.clientDeviceType,
        clientInfo.clientPlatform,
        clientInfo.clientAppInstanceId,
        JSON.stringify(clientInfo.clientMetadata),
        actor,
      ]
    );

    const punch = insertResult.rows[0];
    try {
      const snapshot = await savePunchSnapshot({
        snapshotBase64,
        employeeCode: context.employee_code,
        punchId: punch.id,
        punchDateTime: punch.punch_datetime,
      });
      return res.status(201).json({
        success: true,
        punch,
        client_time_zone: clientTimeZone || null,
        punch_time_zone: effectivePunchTimeZone,
        location_validation: locationValidation,
        device_resolution: {
          requested_time_clock_device_id: requestedDeviceId,
          time_clock_device_id: resolvedDeviceId,
          device_name: resolvedDevice.device_name || null,
          device_serial_number: resolvedDevice.device_serial_number || null,
          device_location: resolvedDevice.device_location || null,
          work_location_id: resolvedDevice.work_location_id || null,
          work_location_name: resolvedDevice.work_location_name || null,
        },
        client_info: {
          client_ip: clientInfo.clientIp,
          client_device_type: clientInfo.clientDeviceType,
          client_platform: clientInfo.clientPlatform,
          client_app_instance_id: clientInfo.clientAppInstanceId,
        },
        snapshot: {
          file_name: snapshot.fileName,
          folder: 'punches_snapshoots',
        },
      });
    } catch (snapshotErr: any) {
      await pool.query(
        `
          DELETE FROM public.employee_time_punches
          WHERE id = $1
            AND tenant_id = $2
            AND employee_id = $3
        `,
        [punch.id, context.tenant_id, context.employee_id]
      );
      return res.status(500).json({
        error: `No se pudo guardar la captura de camara: ${snapshotErr?.message || 'error desconocido'}`,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.patch('/mark/history/:id', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({
        error: 'No existe empleado asociado al usuario autenticado',
      });
    }

    const punchId = normalizeNullableText(req.params.id);
    if (!punchId) return res.status(400).json({ error: 'id es obligatorio' });

    const actor = getActor(req);
    const notes = req.body?.notes === undefined ? undefined : normalizeNullableText(req.body?.notes);
    const isActive = req.body?.is_active;
    const deviceId = req.body?.time_clock_device_id === undefined ? undefined : normalizeNullableText(req.body?.time_clock_device_id);
    const punchSourceId = req.body?.punch_source_id === undefined ? undefined : normalizeNullableText(req.body?.punch_source_id);
    const statusId = req.body?.time_punch_status_id === undefined ? undefined : normalizeNullableText(req.body?.time_punch_status_id);
    const punchKeyLookupId = req.body?.punch_key_lookup_id === undefined ? undefined : normalizeNullableText(req.body?.punch_key_lookup_id);
    const latitud = req.body?.latitud === undefined ? undefined : parseNullableCoordinate(req.body?.latitud);
    const longitud = req.body?.longitud === undefined ? undefined : parseNullableCoordinate(req.body?.longitud);

    const currentResult = await pool.query(
      `
        SELECT id, company_id
        FROM public.employee_time_punches
        WHERE id = $1
          AND tenant_id = $2
          AND employee_id = $3
        LIMIT 1
      `,
      [punchId, context.tenant_id, context.employee_id]
    );
    const current = currentResult.rows[0];
    if (!current) return res.status(404).json({ error: 'Marcacion no encontrada' });

    if (deviceId !== undefined && deviceId !== null) {
      const deviceResult = await pool.query(
        `
          SELECT id
          FROM public.time_clock_devices
          WHERE id = $1
            AND tenant_id = $2
            AND company_id = $3
            AND is_active = true
          LIMIT 1
        `,
        [deviceId, context.tenant_id, current.company_id]
      );
      if (!deviceResult.rows[0]) return res.status(400).json({ error: 'time_clock_device_id no valido' });
    }

    if (punchSourceId !== undefined && punchSourceId !== null) {
      const sourceResult = await pool.query(
        `
          SELECT id
          FROM public.lookup_values value
          JOIN public.lookup_groups group_row
            ON group_row.id = value.lookup_group_id
           AND group_row.lookup_group_key = $2
          WHERE value.id = $1
            AND value.is_active = true
            AND (value.tenant_id IS NULL OR value.tenant_id = $3::uuid)
          LIMIT 1
        `,
        [punchSourceId, PUNCH_SOURCE_GROUP_KEY, context.tenant_id]
      );
      if (!sourceResult.rows[0]) return res.status(400).json({ error: 'punch_source_id no valido' });
    }

    if (statusId !== undefined && statusId !== null) {
      const statusResult = await pool.query(
        `
          SELECT id
          FROM public.lookup_values value
          JOIN public.lookup_groups group_row
            ON group_row.id = value.lookup_group_id
           AND group_row.lookup_group_key = $2
          WHERE value.id = $1
            AND value.is_active = true
            AND (value.tenant_id IS NULL OR value.tenant_id = $3::uuid)
          LIMIT 1
        `,
        [statusId, TIME_PUNCH_STATUS_GROUP_KEY, context.tenant_id]
      );
      if (!statusResult.rows[0]) return res.status(400).json({ error: 'time_punch_status_id no valido' });
    }
    if (latitud !== undefined && latitud !== null && !Number.isFinite(latitud)) {
      return res.status(400).json({ error: 'latitud debe ser numerica' });
    }
    if (longitud !== undefined && longitud !== null && !Number.isFinite(longitud)) {
      return res.status(400).json({ error: 'longitud debe ser numerica' });
    }
    if (latitud !== undefined && latitud !== null && (latitud < -90 || latitud > 90)) {
      return res.status(400).json({ error: 'latitud fuera de rango (-90 a 90)' });
    }
    if (longitud !== undefined && longitud !== null && (longitud < -180 || longitud > 180)) {
      return res.status(400).json({ error: 'longitud fuera de rango (-180 a 180)' });
    }

    let resolvedPunchKeyId: string | null = null;
    if (punchKeyLookupId !== undefined && punchKeyLookupId !== null) {
      const movementResult = await pool.query(
        `
          SELECT value.id
          FROM public.lookup_values value
          JOIN public.lookup_groups group_row
            ON group_row.id = value.lookup_group_id
           AND group_row.lookup_group_key = $2
          WHERE value.id = $1
            AND value.is_active = true
            AND (value.tenant_id IS NULL OR value.tenant_id = $3::uuid)
          LIMIT 1
        `,
        [punchKeyLookupId, PUNCH_KEY_GROUP_KEY, context.tenant_id]
      );
      const movement = movementResult.rows[0];
      if (!movement?.id) {
        return res.status(400).json({ error: 'punch_key_lookup_id no valido' });
      }
      resolvedPunchKeyId = String(movement.id);
    }

    const updates: string[] = [];
    const params: any[] = [punchId, context.tenant_id, context.employee_id];
    let paramIndex = params.length + 1;

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(notes);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(Boolean(isActive));
    }
    if (deviceId !== undefined) {
      updates.push(`time_clock_device_id = $${paramIndex++}`);
      params.push(deviceId);
    }
    if (punchSourceId !== undefined) {
      updates.push(`punch_source_id = $${paramIndex++}`);
      params.push(punchSourceId);
    }
    if (statusId !== undefined) {
      updates.push(`time_punch_status_id = $${paramIndex++}`);
      params.push(statusId);
    }
    if (resolvedPunchKeyId !== null) {
      updates.push(`punch_key_lookup_id = $${paramIndex++}`);
      params.push(resolvedPunchKeyId);
    }
    if (latitud !== undefined) {
      updates.push(`latitud = $${paramIndex++}`);
      params.push(latitud);
    }
    if (longitud !== undefined) {
      updates.push(`longitud = $${paramIndex++}`);
      params.push(longitud);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
    }

    updates.push(`updated_by = $${paramIndex++}`);
    params.push(actor);
    updates.push('updated_at = now()');

    const result = await pool.query(
      `
        UPDATE public.employee_time_punches
        SET ${updates.join(', ')}
        WHERE id = $1
          AND tenant_id = $2
          AND employee_id = $3
        RETURNING *
      `,
      params
    );
    return res.status(200).json({ success: true, punch: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.delete('/mark/history/:id', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({
        error: 'No existe empleado asociado al usuario autenticado',
      });
    }

    const punchId = normalizeNullableText(req.params.id);
    if (!punchId) return res.status(400).json({ error: 'id es obligatorio' });

    const result = await pool.query(
      `
        DELETE FROM public.employee_time_punches
        WHERE id = $1
          AND tenant_id = $2
          AND employee_id = $3
        RETURNING id
      `,
      [punchId, context.tenant_id, context.employee_id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Marcacion no encontrada' });
    return res.status(200).json({ success: true, deleted_id: result.rows[0].id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/my-punches', async (req: Request, res: Response) => {
  const nextReq = req as Request & { query: any };
  nextReq.query.from = normalizeNullableText(req.query.from) || normalizeNullableText(req.query.date_from) || undefined;
  nextReq.query.to = normalizeNullableText(req.query.to) || normalizeNullableText(req.query.date_to) || undefined;

  try {
    const context = await resolveEmployeeContext(nextReq);
    if (!context) return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });

    const from = normalizeNullableText(nextReq.query.from);
    const to = normalizeNullableText(nextReq.query.to);
    const limitRaw = Number(nextReq.query.limit ?? 5);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, Math.trunc(limitRaw))) : 5;

    const params: any[] = [context.tenant_id, context.employee_id];
    let whereExtra = '';
    if (from && isIsoDate(from)) {
      params.push(`${from}T00:00:00`);
      whereExtra += ` AND p.punch_datetime >= $${params.length}::timestamptz`;
    }
    if (to && isIsoDate(to)) {
      params.push(`${to}T23:59:59`);
      whereExtra += ` AND p.punch_datetime <= $${params.length}::timestamptz`;
    }
    params.push(limit);

    const result = await pool.query(
      `
        SELECT
          p.id,
          p.punch_datetime,
          p.punch_time_zone,
          p.punch_key,
          p.notes,
          p.latitud,
          p.longitud,
          src.lookup_key AS source_code,
          src.lookup_label AS source_name,
          st.lookup_label AS status_name
        FROM public.employee_time_punches p
        LEFT JOIN public.lookup_values src ON src.id = p.punch_source_id
        LEFT JOIN public.lookup_values st ON st.id = p.time_punch_status_id
        WHERE p.tenant_id = $1
          AND p.employee_id = $2
          ${whereExtra}
        ORDER BY p.punch_datetime DESC
        LIMIT $${params.length}
      `,
      params
    );
    return res.status(200).json({ ok: true, data: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/requests/catalogs', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const [justificationsResult, attendanceEventsResult, statusesResult, discountMethodsResult, discountMethodRulesResult, recentPunchesResult] = await Promise.all([
      pool.query(
        `
          SELECT
            jt.id,
            jt.justification_name,
            jt.justification_short_name,
            jt.attendance_event_id,
            ae.event_name,
            ae.event_short_name
          FROM public.justification_types jt
          LEFT JOIN public.attendance_events ae
            ON ae.id = jt.attendance_event_id
          WHERE jt.tenant_id = $1
            AND jt.is_active = true
            AND (
              jt.attendance_event_id IS NULL
              OR ae.allows_employee_request = true
            )
          ORDER BY jt.justification_name ASC
        `,
        [context.tenant_id]
      ),
      pool.query(
        `
          SELECT
            ae.id,
            ae.event_name,
            ae.event_short_name,
            EXISTS (
              SELECT 1
              FROM public.attendance_event_punch_keys rule
              WHERE rule.tenant_id = ae.tenant_id
                AND rule.attendance_event_id = ae.id
                AND rule.is_active = true
            ) AS requires_target_punch,
            COALESCE((
              SELECT jsonb_agg(rule.punch_key_lookup_id ORDER BY rule.created_at, rule.id)
              FROM public.attendance_event_punch_keys rule
              WHERE rule.tenant_id = ae.tenant_id
                AND rule.attendance_event_id = ae.id
                AND rule.is_active = true
            ), '[]'::jsonb) AS compatible_punch_key_ids
          FROM public.attendance_events ae
          WHERE ae.tenant_id = $1
            AND ae.is_active = true
            AND ae.allows_employee_request = true
          ORDER BY ae.event_name ASC
        `,
        [context.tenant_id]
      ),
      pool.query(
        `
          SELECT
            lv.id,
            lv.lookup_key,
            lv.lookup_label,
            lv.sort_order
          FROM public.lookup_values lv
          INNER JOIN public.lookup_groups lg
            ON lg.id = lv.lookup_group_id
          WHERE lg.lookup_group_key = $1
            AND lv.is_active = true
            AND (lv.tenant_id IS NULL OR lv.tenant_id = $2::uuid)
          ORDER BY lv.sort_order ASC, lv.lookup_label ASC
        `,
        [REQUEST_STATUS_GROUP_KEY, context.tenant_id]
      ),
      pool.query(
        `
          SELECT
            lv.id,
            lv.lookup_key,
            lv.lookup_label,
            lv.lookup_short_label,
            lv.sort_order
          FROM public.lookup_values lv
          INNER JOIN public.lookup_groups lg
            ON lg.id = lv.lookup_group_id
          WHERE lg.lookup_group_key = $1
            AND lv.is_active = true
            AND (lv.tenant_id IS NULL OR lv.tenant_id = $2::uuid)
          ORDER BY lv.sort_order ASC, lv.lookup_label ASC
        `,
        [ABSENCE_DISCOUNT_METHOD_GROUP_KEY, context.tenant_id]
      ),
      pool.query(
        `
          SELECT
            justification_type_id,
            attendance_event_id,
            justify_method_id,
            sort_order
          FROM public.absence_justify_method_rules
          WHERE tenant_id = $1::uuid
            AND is_active = true
          ORDER BY sort_order ASC, created_at ASC
        `,
        [context.tenant_id]
      ),
      pool.query(
        `
          SELECT
            p.id,
            p.punch_datetime,
            p.punch_key,
            p.punch_key_lookup_id,
            movement.lookup_label AS movement_label
          FROM public.employee_time_punches p
          LEFT JOIN public.lookup_values movement
            ON movement.id = p.punch_key_lookup_id
          WHERE p.tenant_id = $1::uuid
            AND p.employee_id = $2::uuid
            AND p.is_active = true
            AND p.punch_datetime >= CURRENT_DATE - INTERVAL '90 days'
          ORDER BY p.punch_datetime DESC, p.created_at DESC
          LIMIT 300
        `,
        [context.tenant_id, context.employee_id]
      ),
    ]);

    return res.status(200).json({
      success: true,
      employee: {
        id: context.employee_id,
        company_id: context.company_id,
        company_name: context.company_name,
        employee_code: context.employee_code,
        employee_name: context.employee_name,
        employee_lastname: context.employee_lastname,
      },
      justification_types: justificationsResult.rows,
      attendance_events: attendanceEventsResult.rows,
      request_statuses: statusesResult.rows,
      discount_methods: discountMethodsResult.rows,
      transaction_types: discountMethodsResult.rows,
      discount_method_rules: discountMethodRulesResult.rows,
      recent_punches: recentPunchesResult.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/requests', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const from = normalizeNullableText(req.query.from);
    const to = normalizeNullableText(req.query.to);
    const requestId = normalizeNullableText(req.query.request_id);
    const statusId = normalizeNullableText(req.query.request_status_id);
    const includeInactive = String(req.query.include_inactive || '').toLowerCase() === 'true';

    const params: any[] = [context.tenant_id, context.employee_id, includeInactive];
    let whereExtra = '';

    if (requestId) {
      params.push(requestId);
      whereExtra += ` AND r.id = $${params.length}::uuid`;
    }
    if (from && !requestId) {
      if (!isIsoDate(from)) return res.status(400).json({ error: 'from debe tener formato YYYY-MM-DD' });
      params.push(`${from}T00:00:00`);
      whereExtra += ` AND r.start_datetime >= $${params.length}::timestamptz`;
    }
    if (to && !requestId) {
      if (!isIsoDate(to)) return res.status(400).json({ error: 'to debe tener formato YYYY-MM-DD' });
      params.push(`${to}T23:59:59`);
      whereExtra += ` AND r.end_datetime <= $${params.length}::timestamptz`;
    }
    if (statusId) {
      params.push(statusId);
      whereExtra += ` AND r.request_status_id = $${params.length}::uuid`;
    }

    const result = await pool.query(
      `
        SELECT
          r.id,
          r.company_id,
          c.company_name,
          r.employee_id,
          r.justification_type_id,
          jt.justification_name,
          jt.justification_short_name,
          r.attendance_event_id,
          ae.event_name,
          ae.event_short_name,
          r.target_punch_id,
          target_punch.punch_datetime AS target_punch_datetime,
          target_punch.punch_key AS target_punch_key,
          r.justify_method_id,
          trx.lookup_key AS justify_method_key,
          trx.lookup_label AS justify_method_label,
          r.start_datetime,
          r.end_datetime,
          r.start_time,
          r.end_time,
          r.notes,
          r.support_document_path,
          r.support_document_name,
          r.support_document_mime,
          r.support_document_size_bytes,
          r.request_status_id,
          rs.lookup_key AS request_status_key,
          rs.lookup_label AS request_status_label,
          r.approval_notes,
          r.approved_by,
          au.display_name AS approved_by_display_name,
          au.username AS approved_by_username,
          r.approved_at,
          r.is_active,
          r.created_at,
          r.updated_at
        FROM public.employee_absence_requests r
        LEFT JOIN public.companies c
          ON c.id = r.company_id
        LEFT JOIN public.justification_types jt
          ON jt.id = r.justification_type_id
        LEFT JOIN public.attendance_events ae
          ON ae.id = r.attendance_event_id
        LEFT JOIN public.employee_time_punches target_punch
          ON target_punch.id = r.target_punch_id
         AND target_punch.tenant_id = r.tenant_id
        LEFT JOIN public.lookup_values trx
          ON trx.id = r.justify_method_id
        LEFT JOIN public.lookup_values rs
          ON rs.id = r.request_status_id
        LEFT JOIN public.users au
          ON au.id = r.approved_by
        WHERE r.tenant_id = $1
          AND r.employee_id = $2
          AND ($3::boolean = true OR r.is_active = true)
          ${whereExtra}
        ORDER BY r.created_at DESC, r.start_datetime DESC
      `,
      params
    );

    return res.status(200).json({
      success: true,
      requests: result.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/requests/:id/support-document', async (req: Request, res: Response) => {
  try {
    const employeeContext = await resolveEmployeeContext(req);
    const approverContext = await resolveApproverContext(req);
    const tenantId = employeeContext?.tenant_id || approverContext?.userContext.tenant_id || null;
    if (!tenantId) {
      return res.status(403).json({ error: 'No existe contexto de acceso para descargar adjuntos' });
    }

    const requestId = normalizeNullableText(req.params.id);
    if (!requestId) return res.status(400).json({ error: 'id es obligatorio' });

    const requestResult = await pool.query(
      `
        SELECT
          employee_id,
          support_document_path,
          support_document_name,
          support_document_mime
        FROM public.employee_absence_requests
        WHERE id = $1::uuid
          AND tenant_id = $2::uuid
        LIMIT 1
      `,
      [requestId, tenantId]
    );

    const found = requestResult.rows[0];
    if (!found) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    const canAccessAsOwner = Boolean(
      employeeContext && String(found.employee_id || '') === String(employeeContext.employee_id || '')
    );
    const canAccessAsApprover = approverContext
      ? (
          (await hasScreenActionPermissionForUser(
            approverContext.userContext.tenant_id,
            approverContext.userContext.user_id,
            REQUESTS_APPROVAL_SCREEN_KEYS,
            'VIEW'
          )) &&
          (await resolveManagedEmployeeIdsForApprover(
            approverContext.userContext.tenant_id,
            approverContext.userContext.user_id
          )).includes(String(found.employee_id || ''))
        )
      : false;
    if (!canAccessAsOwner && !canAccessAsApprover) {
      return res.status(403).json({ error: 'No tiene permisos para ver el adjunto de esta solicitud' });
    }

    const rawSupportPath = String(found.support_document_path || '').trim();
    if (!rawSupportPath) {
      return res.status(404).json({ error: 'La solicitud no tiene documento adjunto' });
    }

    const supportPath = rawSupportPath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!supportPath || supportPath.includes('..')) {
      return res.status(400).json({ error: 'Ruta de documento adjunto invalida' });
    }
    if (!supportPath.startsWith(`${tenantId}/`)) {
      return res.status(403).json({ error: 'Ruta de documento no permitida para este tenant' });
    }

    const config = await resolveSupportDocumentStorageConfig(tenantId);
    const absoluteFilePath = path.join(config.absolutePath, supportPath);
    await fs.access(absoluteFilePath);

    const fileName = sanitizeSupportDocumentName(found.support_document_name || 'respaldo.pdf')
      .replace(/"/g, '');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    if (found.support_document_mime) {
      res.setHeader('Content-Type', String(found.support_document_mime));
    }
    return res.sendFile(absoluteFilePath);
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return res.status(404).json({ error: 'Archivo adjunto no encontrado' });
    }
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.post('/requests', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const justificationTypeId = normalizeNullableText(req.body?.justification_type_id);
    const attendanceEventId = normalizeNullableText(req.body?.attendance_event_id);
    const targetPunchId = normalizeNullableText(req.body?.target_punch_id);
    const justifyMethodId = normalizeNullableText(req.body?.justify_method_id);
    const startDateTime = normalizeNullableText(req.body?.start_datetime);
    const endDateTime = normalizeNullableText(req.body?.end_datetime);
    const startTime = normalizeNullableTimeInput(req.body?.start_time);
    const endTime = normalizeNullableTimeInput(req.body?.end_time);
    const notes = normalizeNullableText(req.body?.notes);
    const supportDocumentNameInput = normalizeNullableText(req.body?.support_document_name);
    const supportDocumentMimeInput = normalizeNullableText(req.body?.support_document_mime);
    const supportDocumentBase64Input = normalizeNullableText(req.body?.support_document_base64);
    const actor = getActor(req);

    if (req.body?.request_status_id !== undefined) {
      return res.status(400).json({
        error: 'request_status_id no puede ser definido por el empleado',
      });
    }
    if (req.body?.approval_notes !== undefined || req.body?.approved_by !== undefined || req.body?.approved_at !== undefined) {
      return res.status(400).json({
        error: 'Los datos de aprobación solo pueden ser definidos por Supervisor/RRHH',
      });
    }

    if (!context.company_id) {
      return res.status(400).json({ error: 'El empleado no tiene empresa activa asignada' });
    }
    if (!justificationTypeId) return res.status(400).json({ error: 'justification_type_id es obligatorio' });
    if (!attendanceEventId) return res.status(400).json({ error: 'attendance_event_id es obligatorio' });
    if (!justifyMethodId) return res.status(400).json({ error: 'justify_method_id es obligatorio' });
    if (!startDateTime || !isValidDateTime(startDateTime)) return res.status(400).json({ error: 'start_datetime invalido' });
    if (!endDateTime || !isValidDateTime(endDateTime)) return res.status(400).json({ error: 'end_datetime invalido' });
    if (new Date(startDateTime).getTime() > new Date(endDateTime).getTime()) {
      return res.status(400).json({ error: 'El rango de fechas es invalido' });
    }
    if (req.body?.start_time !== undefined && startTime === null) {
      return res.status(400).json({ error: 'start_time inválido (use HH24:MI:SS)' });
    }
    if (req.body?.end_time !== undefined && endTime === null) {
      return res.status(400).json({ error: 'end_time inválido (use HH24:MI:SS)' });
    }

    const [justificationResult, eventResult] = await Promise.all([
      pool.query(
        `
          SELECT id, attendance_event_id
          FROM public.justification_types
          WHERE id = $1
            AND tenant_id = $2
            AND is_active = true
          LIMIT 1
        `,
        [justificationTypeId, context.tenant_id]
      ),
      pool.query(
        `
          SELECT ae.id, ae.event_short_name
          FROM public.attendance_events ae
          WHERE ae.id = $1
            AND ae.tenant_id = $2
            AND ae.is_active = true
            AND ae.allows_employee_request = true
          LIMIT 1
        `,
        [attendanceEventId, context.tenant_id]
      ),
    ]);

    const justification = justificationResult.rows[0];
    if (!justification) return res.status(400).json({ error: 'justification_type_id no valido' });
    const attendanceEvent = eventResult.rows[0];
    if (!attendanceEvent) return res.status(400).json({ error: 'attendance_event_id no valido' });

    const punchSelectionError = await validateEventPunchSelection({
      tenantId: context.tenant_id,
      employeeId: context.employee_id,
      attendanceEventId,
      targetPunchId,
    });
    if (punchSelectionError) return res.status(400).json({ error: punchSelectionError });

    if (justification.attendance_event_id && justification.attendance_event_id !== attendanceEventId) {
      return res.status(400).json({
        error: 'El tipo de justificacion seleccionado no corresponde al evento indicado',
      });
    }

    const isValidTransactionType = await isJustifyMethodAllowed({
      tenantId: context.tenant_id,
      justificationTypeId,
      attendanceEventId,
      justifyMethodId,
    });
    if (!isValidTransactionType) {
      return res.status(400).json({ error: 'justify_method_id no valido' });
    }

    const pendingStatusId = await resolveDefaultRequestStatusId(context.tenant_id);
    if (!pendingStatusId) {
      return res.status(400).json({ error: 'No existe estado de solicitud configurado' });
    }

    let supportDoc: {
      support_document_path: string;
      support_document_name: string;
      support_document_mime: string;
      support_document_size_bytes: number;
    } | null = null;

    if (supportDocumentBase64Input) {
      supportDoc = await saveRequestSupportDocument({
        tenantId: context.tenant_id,
        section: 'absence_requests',
        employeeCode: context.employee_code,
        requestDate: startDateTime,
        fileName: supportDocumentNameInput || 'respaldo-solicitud.pdf',
        mimeType: supportDocumentMimeInput || 'application/pdf',
        fileBase64: supportDocumentBase64Input,
      });
    }

    const insertResult = await pool.query(
      `
        INSERT INTO public.employee_absence_requests (
          id,
          tenant_id,
          company_id,
          employee_id,
          justification_type_id,
          attendance_event_id,
          target_punch_id,
          justify_method_id,
          start_datetime,
          end_datetime,
          start_time,
          end_time,
          notes,
          support_document_path,
          support_document_name,
          support_document_mime,
          support_document_size_bytes,
          request_status_id,
          is_active,
          created_by
        )
        VALUES (
          gen_random_uuid(),
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,true,$18
        )
        RETURNING *
      `,
      [
        context.tenant_id,
        context.company_id,
        context.employee_id,
        justificationTypeId,
        attendanceEventId,
        targetPunchId,
        justifyMethodId,
        startDateTime,
        endDateTime,
        startTime,
        endTime,
        notes,
        supportDoc?.support_document_path || null,
        supportDoc?.support_document_name || null,
        supportDoc?.support_document_mime || null,
        supportDoc?.support_document_size_bytes || null,
        pendingStatusId,
        actor,
      ]
    );

    const requestRow = insertResult.rows[0];
    const notificationTypeId = await resolveLookupValueIdByGroupKeyAndKeys(
      context.tenant_id,
      USER_NOTIFICATION_TYPE_GROUP_KEY,
      ['ABSENCE_REQUEST_CREATED']
    );
    if (notificationTypeId) {
      const recipientUserIds = await resolveAssignedApproverUserIds(
        context.tenant_id,
        context.employee_id
      );
      const employeeName = `${context.employee_name || ''} ${context.employee_lastname || ''}`.trim();
      const title = 'Nueva solicitud de justificación o permiso';
      const message = `${employeeName || 'Un empleado'} envió una solicitud desde ${String(startDateTime).slice(0, 10)} hasta ${String(endDateTime || startDateTime).slice(0, 10)}.`;

      for (const recipientUserId of recipientUserIds) {
        if (recipientUserId === context.user_id) continue;
        await pool.query(
          `
            INSERT INTO public.user_notifications (
              id, tenant_id, user_id, notification_type_id, title, message,
              icon_key, ref_table, ref_id, is_read, is_active, created_by
            )
            VALUES (
              gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4, $5,
              'FileCheck', 'employee_absence_requests', $6::uuid, false, true, $7
            )
          `,
          [
            context.tenant_id,
            recipientUserId,
            notificationTypeId,
            title,
            message,
            requestRow.id,
            actor,
          ]
        );
      }
    }

    return res.status(201).json({ success: true, request: requestRow });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.patch('/requests/:id', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const requestId = normalizeNullableText(req.params.id);
    if (!requestId) return res.status(400).json({ error: 'id es obligatorio' });

    if (req.body?.request_status_id !== undefined) {
      return res.status(400).json({
        error: 'request_status_id no puede ser modificado por el empleado',
      });
    }
    if (req.body?.approval_notes !== undefined || req.body?.approved_by !== undefined || req.body?.approved_at !== undefined) {
      return res.status(400).json({
        error: 'Los datos de aprobación solo pueden ser modificados por Supervisor/RRHH',
      });
    }

    const currentResult = await pool.query(
      `
        SELECT
          r.id,
          r.justification_type_id,
          r.attendance_event_id,
          r.target_punch_id,
          r.justify_method_id,
          rs.lookup_key AS request_status_key
        FROM public.employee_absence_requests r
        LEFT JOIN public.lookup_values rs
          ON rs.id = r.request_status_id
        WHERE r.id = $1
          AND r.tenant_id = $2
          AND r.employee_id = $3
        LIMIT 1
      `,
      [requestId, context.tenant_id, context.employee_id]
    );
    const current = currentResult.rows[0];
    if (!current) return res.status(404).json({ error: 'Solicitud no encontrada' });

    const statusKey = String(current.request_status_key || '').toUpperCase();
    if (!isPendingRequestStatusKey(statusKey)) {
      return res.status(400).json({ error: 'Solo se pueden modificar solicitudes en estado Pendiente' });
    }

    const justificationTypeId = req.body?.justification_type_id === undefined ? undefined : normalizeNullableText(req.body?.justification_type_id);
    const attendanceEventId = req.body?.attendance_event_id === undefined ? undefined : normalizeNullableText(req.body?.attendance_event_id);
    const targetPunchId = req.body?.target_punch_id === undefined ? undefined : normalizeNullableText(req.body?.target_punch_id);
    const justifyMethodId =
      req.body?.justify_method_id === undefined ? undefined : normalizeNullableText(req.body?.justify_method_id);
    const startDateTime = req.body?.start_datetime === undefined ? undefined : normalizeNullableText(req.body?.start_datetime);
    const endDateTime = req.body?.end_datetime === undefined ? undefined : normalizeNullableText(req.body?.end_datetime);
    const startTime = req.body?.start_time === undefined ? undefined : normalizeNullableTimeInput(req.body?.start_time);
    const endTime = req.body?.end_time === undefined ? undefined : normalizeNullableTimeInput(req.body?.end_time);
    const notes = req.body?.notes === undefined ? undefined : normalizeNullableText(req.body?.notes);
    const supportDocumentNameInput =
      req.body?.support_document_name === undefined ? undefined : normalizeNullableText(req.body?.support_document_name);
    const supportDocumentMimeInput =
      req.body?.support_document_mime === undefined ? undefined : normalizeNullableText(req.body?.support_document_mime);
    const supportDocumentBase64Input =
      req.body?.support_document_base64 === undefined ? undefined : normalizeNullableText(req.body?.support_document_base64);
    const removeSupportDocument = req.body?.remove_support_document === true;
    const isActive = req.body?.is_active;

    if (startDateTime && !isValidDateTime(startDateTime)) return res.status(400).json({ error: 'start_datetime invalido' });
    if (endDateTime && !isValidDateTime(endDateTime)) return res.status(400).json({ error: 'end_datetime invalido' });
    if (startDateTime && endDateTime && new Date(startDateTime).getTime() > new Date(endDateTime).getTime()) {
      return res.status(400).json({ error: 'El rango de fechas es invalido' });
    }
    if (req.body?.start_time !== undefined && startTime === null) {
      return res.status(400).json({ error: 'start_time inválido (use HH24:MI:SS)' });
    }
    if (req.body?.end_time !== undefined && endTime === null) {
      return res.status(400).json({ error: 'end_time inválido (use HH24:MI:SS)' });
    }

    const effectiveAttendanceEventId = attendanceEventId ?? current.attendance_event_id;
    if (effectiveAttendanceEventId) {
      const validation = await pool.query(
        `
          SELECT ae.id, ae.event_short_name
          FROM public.attendance_events ae
          WHERE ae.id = $1
            AND ae.tenant_id = $2
            AND ae.is_active = true
            AND ae.allows_employee_request = true
          LIMIT 1
        `,
        [effectiveAttendanceEventId, context.tenant_id]
      );
      if (!validation.rows[0]) return res.status(400).json({ error: 'attendance_event_id no valido' });
    }

    const effectiveTargetPunchId = targetPunchId === undefined ? current.target_punch_id : targetPunchId;
    if (effectiveAttendanceEventId) {
      const punchSelectionError = await validateEventPunchSelection({
        tenantId: context.tenant_id,
        employeeId: context.employee_id,
        attendanceEventId: effectiveAttendanceEventId,
        targetPunchId: effectiveTargetPunchId,
      });
      if (punchSelectionError) return res.status(400).json({ error: punchSelectionError });
    }

    const effectiveJustificationTypeId = justificationTypeId ?? current.justification_type_id;
    if (effectiveJustificationTypeId) {
      const validation = await pool.query(
        `
          SELECT id, attendance_event_id
          FROM public.justification_types
          WHERE id = $1
            AND tenant_id = $2
            AND is_active = true
          LIMIT 1
        `,
        [effectiveJustificationTypeId, context.tenant_id]
      );
      const justification = validation.rows[0];
      if (!justification) return res.status(400).json({ error: 'justification_type_id no valido' });
      if (justification.attendance_event_id && justification.attendance_event_id !== effectiveAttendanceEventId) {
        return res.status(400).json({
          error: 'El tipo de justificacion seleccionado no corresponde al evento indicado',
        });
      }
    }

    const effectiveJustifyMethodId = justifyMethodId ?? current.justify_method_id;
    if (effectiveJustifyMethodId) {
      const isValidTransactionType = await isJustifyMethodAllowed({
        tenantId: context.tenant_id,
        justificationTypeId: effectiveJustificationTypeId,
        attendanceEventId: effectiveAttendanceEventId,
        justifyMethodId: effectiveJustifyMethodId,
      });
      if (!isValidTransactionType) {
        return res.status(400).json({ error: 'justify_method_id no valido' });
      }
    }

    const updates: string[] = [];
    const params: any[] = [requestId, context.tenant_id, context.employee_id];
    let paramIndex = params.length + 1;

    let supportDoc: {
      support_document_path: string;
      support_document_name: string;
      support_document_mime: string;
      support_document_size_bytes: number;
    } | null = null;
    if (supportDocumentBase64Input) {
      supportDoc = await saveRequestSupportDocument({
        tenantId: context.tenant_id,
        section: 'absence_requests',
        employeeCode: context.employee_code,
        requestDate: startDateTime || endDateTime || new Date(),
        fileName: supportDocumentNameInput || 'respaldo-solicitud.pdf',
        mimeType: supportDocumentMimeInput || 'application/pdf',
        fileBase64: supportDocumentBase64Input,
      });
    }

    if (justificationTypeId !== undefined) {
      updates.push(`justification_type_id = $${paramIndex++}`);
      params.push(justificationTypeId);
    }
    if (attendanceEventId !== undefined) {
      updates.push(`attendance_event_id = $${paramIndex++}`);
      params.push(attendanceEventId);
    }
    if (targetPunchId !== undefined) {
      updates.push(`target_punch_id = $${paramIndex++}`);
      params.push(targetPunchId);
    }
    if (justifyMethodId !== undefined) {
      updates.push(`justify_method_id = $${paramIndex++}`);
      params.push(justifyMethodId);
    }
    if (startDateTime !== undefined) {
      updates.push(`start_datetime = $${paramIndex++}`);
      params.push(startDateTime);
    }
    if (endDateTime !== undefined) {
      updates.push(`end_datetime = $${paramIndex++}`);
      params.push(endDateTime);
    }
    if (startTime !== undefined) {
      updates.push(`start_time = $${paramIndex++}`);
      params.push(startTime);
    }
    if (endTime !== undefined) {
      updates.push(`end_time = $${paramIndex++}`);
      params.push(endTime);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(notes);
    }
    if (supportDoc) {
      updates.push(`support_document_path = $${paramIndex++}`);
      params.push(supportDoc.support_document_path);
      updates.push(`support_document_name = $${paramIndex++}`);
      params.push(supportDoc.support_document_name);
      updates.push(`support_document_mime = $${paramIndex++}`);
      params.push(supportDoc.support_document_mime);
      updates.push(`support_document_size_bytes = $${paramIndex++}`);
      params.push(supportDoc.support_document_size_bytes);
    } else if (removeSupportDocument) {
      updates.push('support_document_path = NULL');
      updates.push('support_document_name = NULL');
      updates.push('support_document_mime = NULL');
      updates.push('support_document_size_bytes = NULL');
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(Boolean(isActive));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
    }

    updates.push(`updated_by = $${paramIndex++}`);
    params.push(getActor(req));
    updates.push('updated_at = now()');

    const result = await pool.query(
      `
        UPDATE public.employee_absence_requests
        SET ${updates.join(', ')}
        WHERE id = $1
          AND tenant_id = $2
          AND employee_id = $3
        RETURNING *
      `,
      params
    );

    return res.status(200).json({ success: true, request: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.patch('/requests/:id/cancel', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const requestId = normalizeNullableText(req.params.id);
    if (!requestId) return res.status(400).json({ error: 'id es obligatorio' });

    const currentResult = await pool.query(
      `
        SELECT
          r.id,
          rs.lookup_key AS request_status_key
        FROM public.employee_absence_requests r
        LEFT JOIN public.lookup_values rs
          ON rs.id = r.request_status_id
        WHERE r.id = $1
          AND r.tenant_id = $2
          AND r.employee_id = $3
        LIMIT 1
      `,
      [requestId, context.tenant_id, context.employee_id]
    );
    const current = currentResult.rows[0];
    if (!current) return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (!isPendingRequestStatusKey(current.request_status_key)) {
      return res.status(400).json({ error: 'Solo se pueden cancelar solicitudes en estado Pendiente' });
    }

    const cancelStatusId =
      (await resolveRequestStatusIdByKeys(context.tenant_id, ['CANCELLED', 'CANCELED', 'ANULADO', 'CANCELADO'])) ||
      null;
    if (!cancelStatusId) return res.status(400).json({ error: 'No existe estado de cancelacion configurado' });

    const result = await pool.query(
      `
        UPDATE public.employee_absence_requests
        SET
          request_status_id = $4,
          updated_by = $5,
          updated_at = now()
        WHERE id = $1
          AND tenant_id = $2
          AND employee_id = $3
        RETURNING *
      `,
      [requestId, context.tenant_id, context.employee_id, cancelStatusId, getActor(req)]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Solicitud no encontrada' });
    return res.status(200).json({ success: true, request: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.delete('/requests/:id', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }
    const requestId = normalizeNullableText(req.params.id);
    if (!requestId) return res.status(400).json({ error: 'id es obligatorio' });

    const currentResult = await pool.query(
      `
        SELECT
          r.id,
          rs.lookup_key AS request_status_key
        FROM public.employee_absence_requests r
        LEFT JOIN public.lookup_values rs
          ON rs.id = r.request_status_id
        WHERE r.id = $1
          AND r.tenant_id = $2
          AND r.employee_id = $3
        LIMIT 1
      `,
      [requestId, context.tenant_id, context.employee_id]
    );
    const current = currentResult.rows[0];
    if (!current) return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (!isPendingRequestStatusKey(current.request_status_key)) {
      return res.status(400).json({ error: 'Solo se pueden eliminar solicitudes en estado Pendiente' });
    }

    const result = await pool.query(
      `
        DELETE FROM public.employee_absence_requests
        WHERE id = $1
          AND tenant_id = $2
          AND employee_id = $3
        RETURNING id
      `,
      [requestId, context.tenant_id, context.employee_id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Solicitud no encontrada' });
    return res.status(200).json({ success: true, deleted_id: result.rows[0].id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/requests/approvals', async (req: Request, res: Response) => {
  try {
    const userContext = await resolveUserContext(req);
    if (!userContext) {
      return res.status(403).json({ error: 'No existe usuario interno asociado al autenticado' });
    }

    const canViewApprovals = await assertApproverActionPermission({
      userContext,
      screenKeys: REQUESTS_APPROVAL_SCREEN_KEYS,
      actionKey: 'VIEW',
      errorMessage: 'No tiene permiso VIEW para la pantalla de aprobaciones',
    });
    if (!canViewApprovals.ok) {
      return res.status(canViewApprovals.status).json({ error: canViewApprovals.error });
    }
    const managedEmployeeIds = await resolveManagedEmployeeIdsForApprover(
      userContext.tenant_id,
      userContext.user_id
    );
    if (managedEmployeeIds.length === 0) {
      return res.status(200).json({ success: true, requests: [] });
    }

    const status = String(req.query.status || 'pending').toUpperCase();
    const statusKeys =
      status === 'APPROVED'
        ? ['APPROVED', 'APROBADO']
        : status === 'REJECTED'
        ? ['REJECTED', 'RECHAZADO']
        : status === 'ALL'
        ? []
        : ['ENVIADA', 'ENVIADO', 'SENT', 'PENDING', 'PENDIENTE', 'REQUESTED', 'SOLICITADO', 'IN_REVIEW', 'EN_REVISION', 'EN_REVISIÓN'];

    const params: any[] = [userContext.tenant_id, managedEmployeeIds];
    let whereStatus = '';

    if (statusKeys.length > 0) {
      params.push(statusKeys);
      whereStatus = ` AND UPPER(COALESCE(rs.lookup_key, '')) = ANY ($${params.length}::text[])`;
    }

    const result = await pool.query(
      `
        SELECT
          r.id,
          r.company_id,
          c.company_name,
          r.employee_id,
          e.employee_code,
          e.employee_name,
          e.employee_lastname,
          u.display_name AS employee_user_display_name,
          u.username AS employee_username,
          r.justification_type_id,
          jt.justification_name,
          r.attendance_event_id,
          ae.event_name,
          r.justify_method_id,
          jm.lookup_label AS justify_method_label,
          r.start_datetime,
          r.end_datetime,
          r.start_time,
          r.end_time,
          r.notes,
          r.support_document_path,
          r.support_document_name,
          r.support_document_mime,
          r.support_document_size_bytes,
          r.request_status_id,
          rs.lookup_key AS request_status_key,
          rs.lookup_label AS request_status_label,
          r.approval_notes,
          r.approved_by,
          au.display_name AS approved_by_display_name,
          au.username AS approved_by_username,
          r.approved_at,
          r.is_active,
          r.created_at,
          r.updated_at
        FROM public.employee_absence_requests r
        LEFT JOIN public.companies c ON c.id = r.company_id
        LEFT JOIN public.employees e ON e.id = r.employee_id
        LEFT JOIN public.users u
          ON u.id = e.user_id
        LEFT JOIN public.justification_types jt ON jt.id = r.justification_type_id
        LEFT JOIN public.attendance_events ae ON ae.id = r.attendance_event_id
        LEFT JOIN public.lookup_values jm ON jm.id = r.justify_method_id
        LEFT JOIN public.lookup_values rs ON rs.id = r.request_status_id
        LEFT JOIN public.users au ON au.id = r.approved_by
        WHERE r.tenant_id = $1::uuid
          AND r.employee_id = ANY($2::uuid[])
          AND r.is_active = true
          ${whereStatus}
        ORDER BY r.created_at DESC
      `,
      params
    );

    return res.status(200).json({ success: true, requests: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/requests/approvals/catalogs', async (req: Request, res: Response) => {
  try {
    const userContext = await resolveUserContext(req);
    if (!userContext) {
      return res.status(403).json({ error: 'No existe usuario interno asociado al autenticado' });
    }
    const canViewApprovals = await assertApproverActionPermission({
      userContext,
      screenKeys: REQUESTS_APPROVAL_SCREEN_KEYS,
      actionKey: 'VIEW',
      errorMessage: 'No tiene permiso VIEW para la pantalla de aprobaciones',
    });
    if (!canViewApprovals.ok) {
      return res.status(canViewApprovals.status).json({ error: canViewApprovals.error });
    }

    const methods = await pool.query(
      `
        SELECT
          lv.id,
          lv.lookup_key,
          lv.lookup_label,
          lv.lookup_short_label,
          lv.sort_order
        FROM public.lookup_values lv
        INNER JOIN public.lookup_groups lg
          ON lg.id = lv.lookup_group_id
        WHERE lg.lookup_group_key = $1
          AND lv.is_active = true
          AND (lv.tenant_id IS NULL OR lv.tenant_id = $2::uuid)
        ORDER BY lv.sort_order ASC, lv.lookup_label ASC
      `,
      [ABSENCE_DISCOUNT_METHOD_GROUP_KEY, userContext.tenant_id]
    );

    return res.status(200).json({ success: true, discount_methods: methods.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.patch('/requests/:id/review-fields', async (req: Request, res: Response) => {
  try {
    const userContext = await resolveUserContext(req);
    if (!userContext) {
      return res.status(403).json({ error: 'No existe usuario interno asociado al autenticado' });
    }
    const canEditApprovals = await assertApproverActionPermission({
      userContext,
      screenKeys: REQUESTS_APPROVAL_SCREEN_KEYS,
      actionKey: 'EDIT',
      errorMessage: 'No tiene permiso EDIT para revisar solicitudes',
    });
    if (!canEditApprovals.ok) {
      return res.status(canEditApprovals.status).json({ error: canEditApprovals.error });
    }
    const managedEmployeeIds = await resolveManagedEmployeeIdsForApprover(
      userContext.tenant_id,
      userContext.user_id
    );
    if (managedEmployeeIds.length === 0) {
      return res.status(403).json({ error: 'No tiene empleados asignados para revisión' });
    }

    const requestId = normalizeNullableText(req.params.id);
    if (!requestId) return res.status(400).json({ error: 'id es obligatorio' });

    const justifyMethodId =
      req.body?.justify_method_id === undefined ? undefined : normalizeNullableText(req.body?.justify_method_id);
    const approvalNotes =
      req.body?.approval_notes === undefined ? undefined : normalizeNullableText(req.body?.approval_notes);

    if (justifyMethodId === undefined && approvalNotes === undefined) {
      return res.status(400).json({ error: 'Debe enviar justify_method_id o approval_notes' });
    }

    const currentResult = await pool.query(
      `
        SELECT
          r.id,
          rs.lookup_key AS request_status_key
        FROM public.employee_absence_requests r
        LEFT JOIN public.lookup_values rs ON rs.id = r.request_status_id
        WHERE r.id = $1::uuid
          AND r.tenant_id = $2::uuid
          AND r.employee_id = ANY($3::uuid[])
        LIMIT 1
      `,
      [requestId, userContext.tenant_id, managedEmployeeIds]
    );
    const current = currentResult.rows[0];
    if (!current) return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (isClosedRequestStatusKey(current.request_status_key)) {
      return res.status(400).json({ error: 'La solicitud ya tiene estado final' });
    }

    if (justifyMethodId) {
      const isValid = await isLookupValueInGroupByKey(
        justifyMethodId,
        ABSENCE_DISCOUNT_METHOD_GROUP_KEY,
        userContext.tenant_id
      );
      if (!isValid) return res.status(400).json({ error: 'justify_method_id no valido' });
    }

    const updates: string[] = [];
    const params: any[] = [requestId, userContext.tenant_id];
    let next = 3;

    if (justifyMethodId !== undefined) {
      updates.push(`justify_method_id = $${next++}::uuid`);
      params.push(justifyMethodId);
    }
    if (approvalNotes !== undefined) {
      updates.push(`approval_notes = $${next++}`);
      params.push(approvalNotes);
    }

    updates.push(`updated_by = $${next++}`);
    params.push(getActor(req));
    updates.push('updated_at = now()');

    const updated = await pool.query(
      `
        UPDATE public.employee_absence_requests
        SET ${updates.join(', ')}
        WHERE id = $1::uuid
          AND tenant_id = $2::uuid
        RETURNING *
      `,
      params
    );

    return res.status(200).json({ success: true, request: updated.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.patch('/requests/:id/decision', async (req: Request, res: Response) => {
  try {
    const userContext = await resolveUserContext(req);
    if (!userContext) {
      return res.status(403).json({ error: 'No existe usuario interno asociado al autenticado' });
    }

    const managedEmployeeIds = await resolveManagedEmployeeIdsForApprover(
      userContext.tenant_id,
      userContext.user_id
    );
    if (managedEmployeeIds.length === 0) {
      return res.status(403).json({ error: 'No tiene empleados asignados para aprobación' });
    }

    const requestId = normalizeNullableText(req.params.id);
    const decision = String(req.body?.decision || '').toUpperCase();
    const approvalNotes = normalizeNullableText(req.body?.approval_notes);
    const justifyMethodId = normalizeNullableText(req.body?.justify_method_id);
    if (!requestId) return res.status(400).json({ error: 'id es obligatorio' });
    if (!['APPROVE', 'REJECT'].includes(decision)) {
      return res.status(400).json({ error: 'decision debe ser APPROVE o REJECT' });
    }
    const decisionActionKey = decision === 'APPROVE' ? 'APPROVE' : 'REJECT';
    const canDecide = await assertApproverActionPermission({
      userContext,
      screenKeys: REQUESTS_APPROVAL_SCREEN_KEYS,
      actionKey: decisionActionKey,
      errorMessage: `No tiene permiso ${decisionActionKey} para aprobar solicitudes`,
    });
    if (!canDecide.ok) {
      return res.status(canDecide.status).json({ error: canDecide.error });
    }
    const resolvedApprovalNotes =
      approvalNotes || (decision === 'APPROVE' ? 'Aprobada por supervisor' : 'Denegada por supervisor');

    const currentResult = await pool.query(
      `
        SELECT
          r.id,
          r.request_status_id,
          rs.lookup_key AS request_status_key,
          e.user_id AS employee_user_id
        FROM public.employee_absence_requests r
        LEFT JOIN public.lookup_values rs ON rs.id = r.request_status_id
        LEFT JOIN public.employees e
          ON e.id = r.employee_id
         AND e.tenant_id = r.tenant_id
        WHERE r.id = $1::uuid
          AND r.tenant_id = $2::uuid
          AND r.employee_id = ANY($3::uuid[])
        LIMIT 1
      `,
      [requestId, userContext.tenant_id, managedEmployeeIds]
    );
    const current = currentResult.rows[0];
    if (!current) return res.status(404).json({ error: 'Solicitud no encontrada' });

    const currentStatusKey = String(current.request_status_key || '').toUpperCase();
    if (isClosedRequestStatusKey(currentStatusKey)) {
      return res.status(400).json({ error: 'La solicitud ya tiene estado final' });
    }

    if (justifyMethodId) {
      const isValid = await isLookupValueInGroupByKey(
        justifyMethodId,
        ABSENCE_DISCOUNT_METHOD_GROUP_KEY,
        userContext.tenant_id
      );
      if (!isValid) return res.status(400).json({ error: 'justify_method_id no valido' });
    }

    const targetStatusId =
      decision === 'APPROVE'
        ? await resolveRequestStatusIdByKeys(userContext.tenant_id, ['APPROVED', 'APROBADO'])
        : await resolveRequestStatusIdByKeys(userContext.tenant_id, ['REJECTED', 'RECHAZADO']);

    if (!targetStatusId) {
      return res.status(400).json({ error: 'No existe estado de decisión configurado' });
    }

    const updated = await pool.query(
      `
        UPDATE public.employee_absence_requests
        SET
          request_status_id = $3::uuid,
          approval_notes = $4,
          justify_method_id = COALESCE($5::uuid, justify_method_id),
          approved_by = $6::uuid,
          approved_at = now(),
          updated_by = $7,
          updated_at = now()
        WHERE id = $1::uuid
          AND tenant_id = $2::uuid
        RETURNING *
      `,
      [
        requestId,
        userContext.tenant_id,
        targetStatusId,
        resolvedApprovalNotes,
        justifyMethodId,
        userContext.user_id,
        getActor(req),
      ]
    );

    const notificationTypeId = await resolveLookupValueIdByGroupKeyAndKeys(
      userContext.tenant_id,
      USER_NOTIFICATION_TYPE_GROUP_KEY,
      ['ABSENCE_REQUEST_DECIDED']
    );
    if (notificationTypeId && current.employee_user_id) {
      await pool.query(
        `
          INSERT INTO public.user_notifications (
            id, tenant_id, user_id, notification_type_id, title, message,
            icon_key, ref_table, ref_id, is_read, is_active, created_by
          )
          VALUES (
            gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4, $5,
            'FileCheck', 'employee_absence_requests', $6::uuid, false, true, $7
          )
        `,
        [
          userContext.tenant_id,
          current.employee_user_id,
          notificationTypeId,
          decision === 'APPROVE' ? 'Solicitud de permiso o justificación aprobada' : 'Solicitud de permiso o justificación denegada',
          resolvedApprovalNotes,
          requestId,
          getActor(req),
        ]
      );
    }

    return res.status(200).json({ success: true, request: updated.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/my-requests', async (req: Request, res: Response) => {
  try {
    const nextReq = req as Request & { query: any };
    nextReq.query.from = normalizeNullableText(req.query.from) || normalizeNullableText(req.query.date_from) || undefined;
    nextReq.query.to = normalizeNullableText(req.query.to) || normalizeNullableText(req.query.date_to) || undefined;

    const context = await resolveEmployeeContext(nextReq);
    if (!context) return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });

    const from = normalizeNullableText(nextReq.query.from);
    const to = normalizeNullableText(nextReq.query.to);
    const params: any[] = [context.tenant_id, context.employee_id];
    let whereExtra = '';
    if (from && isIsoDate(from)) {
      params.push(`${from}T00:00:00`);
      whereExtra += ` AND r.start_datetime >= $${params.length}::timestamptz`;
    }
    if (to && isIsoDate(to)) {
      params.push(`${to}T23:59:59`);
      whereExtra += ` AND r.end_datetime <= $${params.length}::timestamptz`;
    }

    const result = await pool.query(
      `
        SELECT
          r.id,
          r.start_datetime,
          r.end_datetime,
          r.notes,
          r.support_document_path,
          r.support_document_name,
          r.support_document_mime,
          r.support_document_size_bytes,
          r.approval_notes,
          r.approved_by,
          au.display_name AS approved_by_display_name,
          au.username AS approved_by_username,
          r.approved_at,
          trx.lookup_label AS justify_method_label,
          jt.justification_name,
          ae.event_name,
          rs.lookup_label AS request_status_label
        FROM public.employee_absence_requests r
        LEFT JOIN public.lookup_values trx ON trx.id = r.justify_method_id
        LEFT JOIN public.justification_types jt ON jt.id = r.justification_type_id
        LEFT JOIN public.attendance_events ae ON ae.id = r.attendance_event_id
        LEFT JOIN public.lookup_values rs ON rs.id = r.request_status_id
        LEFT JOIN public.users au ON au.id = r.approved_by
        WHERE r.tenant_id = $1
          AND r.employee_id = $2
          ${whereExtra}
        ORDER BY r.created_at DESC
      `,
      params
    );
    return res.status(200).json({ ok: true, data: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/my-shifts', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const fromQuery =
      normalizeNullableText(req.query.from) ||
      normalizeNullableText(req.query.date_from) ||
      normalizeNullableText(req.query.start_date);
    const toQuery =
      normalizeNullableText(req.query.to) ||
      normalizeNullableText(req.query.date_to) ||
      normalizeNullableText(req.query.end_date);
    const now = new Date();
    const defaultFrom = getTomorrowIsoDate();
    const defaultTo = toLocalIsoDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
    const dateFrom = fromQuery || defaultFrom;
    const dateTo = toQuery || defaultTo;

    if (!isIsoDate(dateFrom) || !isIsoDate(dateTo)) {
      return res.status(400).json({ error: 'from/to deben tener formato YYYY-MM-DD' });
    }
    if (dateFrom < defaultFrom) {
      return res.status(400).json({ error: `from no puede ser menor a ${defaultFrom}` });
    }
    if (dateTo < dateFrom) {
      return res.status(400).json({ error: 'to no puede ser menor que from' });
    }
    if (diffDaysInclusive(dateFrom, dateTo) > 7) {
      return res.status(400).json({ error: 'El rango máximo permitido es de 7 días' });
    }

    const shiftsResult = await pool.query(
      `
        SELECT
          p.id AS plan_id,
          p.shift_date,
          p.company_id,
          c.company_name,
          p.shift_id AS original_shift_id,
          base_shift.company_id AS original_shift_company_id,
          base_shift.shift_name AS original_shift_name,
          base_shift.shift_short_name AS original_shift_short_name,
          COALESCE(approved_req.requested_shift_id, p.shift_id) AS shift_id,
          effective_shift.company_id AS shift_company_id,
          effective_shift.shift_name,
          effective_shift.shift_short_name,
          effective_shift.start_time,
          effective_shift.work_minutes,
          effective_shift.shift_icon_key,
          effective_shift.shift_bg_color,
          effective_shift.shift_text_color,
          latest_req.id AS open_request_id,
          latest_req.shift_date AS open_request_shift_date,
          latest_req.reason AS open_request_reason,
          latest_req.support_document_name AS open_request_support_document_name,
          latest_req.support_document_mime AS open_request_support_document_mime,
          latest_req.requested_shift_id AS open_requested_shift_id,
          latest_req.requested_shift_name AS open_requested_shift_name,
          latest_req.requested_shift_short_name AS open_requested_shift_short_name,
          latest_req.request_status_id AS open_request_status_id,
          latest_req.request_status_key AS open_request_status_key,
          latest_req.request_status_label AS open_request_status_label
        FROM public.employee_shift_plans p
        INNER JOIN public.shifts base_shift
          ON base_shift.id = p.shift_id
        LEFT JOIN public.companies c
          ON c.id = p.company_id
        LEFT JOIN LATERAL (
          SELECT
            r.id,
            r.shift_date,
            r.reason,
            r.support_document_name,
            r.support_document_mime,
            r.requested_shift_id,
            rsf.shift_name AS requested_shift_name,
            rsf.shift_short_name AS requested_shift_short_name,
            r.request_status_id,
            UPPER(COALESCE(rsv.lookup_key, '')) AS request_status_key,
            rsv.lookup_label AS request_status_label
          FROM public.employee_shift_change_requests r
          LEFT JOIN public.shifts rsf
            ON rsf.id = r.requested_shift_id
          LEFT JOIN public.lookup_values rsv
            ON rsv.id = r.request_status_id
          WHERE r.tenant_id = p.tenant_id
            AND r.employee_id = p.employee_id
            AND r.shift_date = p.shift_date
            AND r.is_active = true
            AND UPPER(COALESCE(rsv.lookup_key, '')) IN ('PENDING', 'PENDIENTE', 'IN_REVIEW', 'EN_REVISION', 'EN_REVISIÓN')
          ORDER BY r.created_at DESC
          LIMIT 1
        ) latest_req ON true
        LEFT JOIN LATERAL (
          SELECT
            r.requested_shift_id
          FROM public.employee_shift_change_requests r
          LEFT JOIN public.lookup_values rsv
            ON rsv.id = r.request_status_id
          WHERE r.tenant_id = p.tenant_id
            AND r.employee_id = p.employee_id
            AND r.shift_date = p.shift_date
            AND r.is_active = true
            AND UPPER(COALESCE(rsv.lookup_key, '')) IN ('APPROVED', 'APROBADO')
          ORDER BY r.approved_at DESC NULLS LAST, r.updated_at DESC NULLS LAST, r.created_at DESC
          LIMIT 1
        ) approved_req ON true
        INNER JOIN public.shifts effective_shift
          ON effective_shift.id = COALESCE(approved_req.requested_shift_id, p.shift_id)
        WHERE p.tenant_id = $1::uuid
          AND p.employee_id = $2::uuid
          AND p.is_active = true
          AND p.shift_date >= $3::date
          AND p.shift_date <= $4::date
        ORDER BY p.shift_date ASC
      `,
      [context.tenant_id, context.employee_id, dateFrom, dateTo]
    );

    const companyIds = Array.from(
      new Set(
        shiftsResult.rows
          .map((row) => row.company_id as string | null)
          .concat(shiftsResult.rows.map((row) => row.original_shift_company_id as string | null))
          .concat(shiftsResult.rows.map((row) => row.shift_company_id as string | null))
          .filter((value): value is string => Boolean(value))
      )
    );
    if (companyIds.length === 0 && context.company_id) {
      companyIds.push(context.company_id);
    }

    let availableShifts: any[] = [];
    if (companyIds.length > 0) {
      const availableResult = await pool.query(
        `
          SELECT
            s.id,
            s.company_id,
            c.company_name,
            s.shift_name,
            s.shift_short_name,
            s.start_time,
            s.work_minutes,
            s.shift_icon_key,
            s.shift_bg_color,
            s.shift_text_color
          FROM public.shifts s
          LEFT JOIN public.companies c
            ON c.id = s.company_id
          WHERE s.tenant_id = $1::uuid
            AND s.is_active = true
            AND s.company_id = ANY($2::uuid[])
          ORDER BY c.company_name ASC, s.shift_name ASC
        `,
        [context.tenant_id, companyIds]
      );
      availableShifts = availableResult.rows;
    }

    return res.status(200).json({
      success: true,
      date_from: dateFrom,
      date_to: dateTo,
      employee: {
        id: context.employee_id,
        employee_code: context.employee_code,
        employee_name: context.employee_name,
        employee_lastname: context.employee_lastname,
      },
      shifts: shiftsResult.rows,
      available_shifts: availableShifts,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/request-shift-change/approvals', async (req: Request, res: Response) => {
  try {
    const approver = await resolveApproverContext(req);
    if (!approver) {
      return res.status(403).json({ error: 'No tiene permisos para aprobar/denegar cambios de turno' });
    }
    const canViewApprovals = await assertApproverActionPermission({
      userContext: approver.userContext,
      screenKeys: SHIFT_CHANGE_APPROVAL_SCREEN_KEYS,
      actionKey: 'VIEW',
      errorMessage: 'No tiene permiso VIEW para la pantalla de aprobación de turnos',
    });
    if (!canViewApprovals.ok) {
      return res.status(canViewApprovals.status).json({ error: canViewApprovals.error });
    }
    const managedEmployeeIds = await resolveManagedEmployeeIdsForApprover(
      approver.userContext.tenant_id,
      approver.userContext.user_id
    );
    if (managedEmployeeIds.length === 0) {
      return res.status(200).json({ success: true, requests: [] });
    }

    const status = String(req.query.status || 'pending').trim().toUpperCase();
    const statusKeys =
      status === 'APPROVED'
        ? ['APPROVED', 'APROBADO']
        : status === 'REJECTED'
        ? ['REJECTED', 'RECHAZADO', 'DENEGADO']
        : status === 'ALL'
        ? []
        : ['PENDING', 'PENDIENTE', 'IN_REVIEW', 'EN_REVISION', 'EN_REVISIÓN', 'REQUESTED', 'SOLICITADO'];

    const params: any[] = [approver.userContext.tenant_id, managedEmployeeIds];
    let whereStatus = '';
    if (statusKeys.length > 0) {
      params.push(statusKeys);
      whereStatus = ` AND UPPER(COALESCE(st.lookup_key, '')) = ANY($${params.length}::text[])`;
    }

    const result = await pool.query(
      `
        SELECT
          r.id,
          r.tenant_id,
          r.company_id,
          c.company_name,
          r.employee_id,
          e.employee_code,
          e.employee_name,
          e.employee_lastname,
          eu.display_name AS employee_user_display_name,
          eu.username AS employee_username,
          r.shift_date,
          r.current_shift_id,
          cs.shift_name AS current_shift_name,
          cs.shift_short_name AS current_shift_short_name,
          cs.start_time AS current_shift_start_time,
          cs.work_minutes AS current_shift_work_minutes,
          cs.shift_icon_key AS current_shift_icon_key,
          cs.shift_bg_color AS current_shift_bg_color,
          cs.shift_text_color AS current_shift_text_color,
          r.requested_shift_id,
          rsf.shift_name AS requested_shift_name,
          rsf.shift_short_name AS requested_shift_short_name,
          rsf.start_time AS requested_shift_start_time,
          rsf.work_minutes AS requested_shift_work_minutes,
          rsf.shift_icon_key AS requested_shift_icon_key,
          rsf.shift_bg_color AS requested_shift_bg_color,
          rsf.shift_text_color AS requested_shift_text_color,
          r.reason,
          r.support_document_path,
          r.support_document_name,
          r.support_document_mime,
          r.support_document_size_bytes,
          r.request_status_id,
          st.lookup_key AS request_status_key,
          st.lookup_label AS request_status_label,
          r.supervisor_notes,
          r.approved_by,
          au.display_name AS approved_by_display_name,
          au.username AS approved_by_username,
          r.approved_at,
          r.created_at,
          r.updated_at
        FROM public.employee_shift_change_requests r
        LEFT JOIN public.companies c
          ON c.id = r.company_id
        LEFT JOIN public.employees e
          ON e.id = r.employee_id
        LEFT JOIN public.users eu
          ON eu.id = e.user_id
        LEFT JOIN public.shifts cs
          ON cs.id = r.current_shift_id
        LEFT JOIN public.shifts rsf
          ON rsf.id = r.requested_shift_id
        LEFT JOIN public.lookup_values st
          ON st.id = r.request_status_id
        LEFT JOIN public.users au
          ON au.id = r.approved_by
        WHERE r.tenant_id = $1::uuid
          AND r.employee_id = ANY($2::uuid[])
          AND r.is_active = true
          ${whereStatus}
        ORDER BY r.created_at DESC, r.shift_date DESC
      `,
      params
    );

    return res.status(200).json({
      success: true,
      requests: result.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/my-shift-changes', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const fromQuery =
      normalizeNullableText(req.query.from) ||
      normalizeNullableText(req.query.date_from) ||
      normalizeNullableText(req.query.start_date);
    const toQuery =
      normalizeNullableText(req.query.to) ||
      normalizeNullableText(req.query.date_to) ||
      normalizeNullableText(req.query.end_date);
    const requestId = normalizeNullableText(req.query.request_id);

    const now = new Date();
    const defaultFrom = getTomorrowIsoDate();
    const defaultTo = toLocalIsoDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
    const dateFrom = fromQuery || defaultFrom;
    const dateTo = toQuery || defaultTo;

    if (!requestId && (!isIsoDate(dateFrom) || !isIsoDate(dateTo))) {
      return res.status(400).json({ error: 'from/to deben tener formato YYYY-MM-DD' });
    }
    if (!requestId && dateFrom < defaultFrom) {
      return res.status(400).json({ error: `from no puede ser menor a ${defaultFrom}` });
    }
    if (!requestId && dateTo < dateFrom) {
      return res.status(400).json({ error: 'to no puede ser menor que from' });
    }
    if (!requestId && diffDaysInclusive(dateFrom, dateTo) > 7) {
      return res.status(400).json({ error: 'El rango máximo permitido es de 7 días' });
    }

    const requestFilter = requestId
      ? 'AND r.id = $3::uuid'
      : `AND r.shift_date >= $3::date
          AND r.shift_date <= $4::date
          AND UPPER(COALESCE(st.lookup_key, '')) IN ('PENDING', 'PENDIENTE', 'IN_REVIEW', 'EN_REVISION', 'EN_REVISIÓN')`;
    const queryParams = requestId
      ? [context.tenant_id, context.employee_id, requestId]
      : [context.tenant_id, context.employee_id, dateFrom, dateTo];

    const result = await pool.query(
      `
        SELECT
          r.id,
          r.shift_date,
          r.company_id,
          c.company_name,
          r.current_shift_id,
          cs.shift_name AS current_shift_name,
          cs.shift_short_name AS current_shift_short_name,
          r.requested_shift_id,
          rsf.shift_name AS requested_shift_name,
          rsf.shift_short_name AS requested_shift_short_name,
          r.reason,
          r.support_document_path,
          r.support_document_name,
          r.support_document_mime,
          r.support_document_size_bytes,
          r.request_status_id,
          st.lookup_key AS request_status_key,
          st.lookup_label AS request_status_label,
          r.supervisor_notes,
          r.approved_by,
          au.display_name AS approved_by_display_name,
          au.username AS approved_by_username,
          r.approved_at,
          r.created_at,
          r.updated_at
        FROM public.employee_shift_change_requests r
        LEFT JOIN public.companies c
          ON c.id = r.company_id
        LEFT JOIN public.shifts cs
          ON cs.id = r.current_shift_id
        LEFT JOIN public.shifts rsf
          ON rsf.id = r.requested_shift_id
        LEFT JOIN public.lookup_values st
          ON st.id = r.request_status_id
        LEFT JOIN public.users au
          ON au.id = r.approved_by
        WHERE r.tenant_id = $1::uuid
          AND r.employee_id = $2::uuid
          AND r.is_active = true
          ${requestFilter}
        ORDER BY r.shift_date DESC, r.created_at DESC
      `,
      queryParams
    );

    return res.status(200).json({
      success: true,
      date_from: dateFrom,
      date_to: dateTo,
      shift_changes: result.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.post('/request-shift-change', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const actor = getActor(req);
    const shiftDate = normalizeIsoDateInput(req.body?.shift_date || req.body?.request_date);
    const currentShiftIdInput = normalizeNullableText(req.body?.current_shift_id);
    const requestedShiftId = normalizeNullableText(req.body?.requested_shift_id);
    const reason = normalizeNullableText(req.body?.reason);
    const supportDocumentNameInput = normalizeNullableText(req.body?.support_document_name);
    const supportDocumentMimeInput = normalizeNullableText(req.body?.support_document_mime);
    const supportDocumentBase64Input = normalizeNullableText(req.body?.support_document_base64);

    if (!shiftDate) {
      return res.status(400).json({ error: 'shift_date es obligatorio en formato YYYY-MM-DD' });
    }
    const tomorrow = getTomorrowIsoDate();
    if (shiftDate < tomorrow) {
      return res.status(400).json({ error: `No se puede solicitar cambio para turnos pasados. Fecha mínima: ${tomorrow}` });
    }
    if (!requestedShiftId) {
      return res.status(400).json({ error: 'requested_shift_id es obligatorio' });
    }
    if (!reason) {
      return res.status(400).json({ error: 'reason es obligatorio' });
    }

    const planResult = await pool.query(
      `
        SELECT
          p.id,
          p.company_id,
          p.shift_id,
          s.company_id AS shift_company_id
        FROM public.employee_shift_plans p
        LEFT JOIN public.shifts s
          ON s.id = p.shift_id
         AND s.tenant_id = p.tenant_id
        WHERE p.tenant_id = $1::uuid
          AND p.employee_id = $2::uuid
          AND p.shift_date = $3::date
          AND p.is_active = true
        ORDER BY p.created_at DESC
        LIMIT 1
      `,
      [context.tenant_id, context.employee_id, shiftDate]
    );
    const plan = planResult.rows[0];
    if (!plan) {
      return res.status(400).json({ error: 'No existe turno asignado para la fecha indicada' });
    }

    const currentShiftId = currentShiftIdInput || plan.shift_id;
    if (requestedShiftId === currentShiftId) {
      return res.status(400).json({ error: 'El turno solicitado debe ser diferente al turno actual' });
    }

    const validRequestedShiftCompanyIds = Array.from(new Set([plan.company_id, plan.shift_company_id].filter(Boolean)));
    const requestedShiftResult = await pool.query(
      `
        SELECT id
        FROM public.shifts
        WHERE id = $1::uuid
          AND tenant_id = $2::uuid
          AND company_id = ANY($3::uuid[])
          AND is_active = true
        LIMIT 1
      `,
      [requestedShiftId, context.tenant_id, validRequestedShiftCompanyIds]
    );
    if (!requestedShiftResult.rows[0]) {
      return res.status(400).json({ error: 'requested_shift_id no valido para la empresa del empleado' });
    }

    const openExists = await pool.query(
      `
        SELECT r.id
        FROM public.employee_shift_change_requests r
        LEFT JOIN public.lookup_values st
          ON st.id = r.request_status_id
        WHERE r.tenant_id = $1::uuid
          AND r.employee_id = $2::uuid
          AND r.shift_date = $3::date
          AND r.is_active = true
          AND UPPER(COALESCE(st.lookup_key, '')) IN ('PENDING', 'PENDIENTE', 'IN_REVIEW', 'EN_REVISION', 'EN_REVISIÓN')
        ORDER BY r.created_at DESC
        LIMIT 1
      `,
      [context.tenant_id, context.employee_id, shiftDate]
    );
    let supportDoc: {
      support_document_path: string;
      support_document_name: string;
      support_document_mime: string;
      support_document_size_bytes: number;
    } | null = null;
    if (supportDocumentBase64Input) {
      supportDoc = await saveRequestSupportDocument({
        tenantId: context.tenant_id,
        section: 'shift_change_requests',
        employeeCode: context.employee_code,
        requestDate: shiftDate,
        fileName: supportDocumentNameInput || 'respaldo-cambio-turno.pdf',
        mimeType: supportDocumentMimeInput || 'application/pdf',
        fileBase64: supportDocumentBase64Input,
      });
    }

    if (openExists.rows[0]?.id) {
      const existingRequestId = String(openExists.rows[0].id);
      const updates: string[] = [
        'requested_shift_id = $4::uuid',
        'reason = $5',
      ];
      const updateParams: any[] = [
        existingRequestId,
        context.tenant_id,
        context.employee_id,
        requestedShiftId,
        reason,
      ];
      let next = 6;

      if (supportDoc) {
        updates.push(`support_document_path = $${next++}`);
        updateParams.push(supportDoc.support_document_path);
        updates.push(`support_document_name = $${next++}`);
        updateParams.push(supportDoc.support_document_name);
        updates.push(`support_document_mime = $${next++}`);
        updateParams.push(supportDoc.support_document_mime);
        updates.push(`support_document_size_bytes = $${next++}`);
        updateParams.push(supportDoc.support_document_size_bytes);
      }

      updates.push(`updated_by = $${next++}`);
      updateParams.push(actor);
      updates.push('updated_at = now()');

      const updatedExisting = await pool.query(
        `
          UPDATE public.employee_shift_change_requests
          SET ${updates.join(', ')}
          WHERE id = $1::uuid
            AND tenant_id = $2::uuid
            AND employee_id = $3::uuid
            AND is_active = true
          RETURNING *
        `,
        updateParams
      );

      return res.status(200).json({
        success: true,
        reused_existing: true,
        request: updatedExisting.rows[0] || null,
      });
    }

    const pendingStatusId = await resolveShiftChangeRequestStatusId(
      context.tenant_id,
      ['PENDING', 'PENDIENTE']
    );
    if (!pendingStatusId) {
      return res.status(400).json({ error: 'No existe estado PENDING para cambio de turno' });
    }

    const inserted = await pool.query(
      `
        INSERT INTO public.employee_shift_change_requests (
          id,
          tenant_id,
          company_id,
          employee_id,
          shift_date,
          current_shift_id,
          requested_shift_id,
          reason,
          support_document_path,
          support_document_name,
          support_document_mime,
          support_document_size_bytes,
          request_status_id,
          is_active,
          created_by
        )
        VALUES (
          gen_random_uuid(),
          $1::uuid, $2::uuid, $3::uuid, $4::date, $5::uuid, $6::uuid, $7, $8, $9, $10, $11, $12::uuid, true, $13
        )
        RETURNING *
      `,
      [
        context.tenant_id,
        plan.company_id,
        context.employee_id,
        shiftDate,
        currentShiftId,
        requestedShiftId,
        reason,
        supportDoc?.support_document_path || null,
        supportDoc?.support_document_name || null,
        supportDoc?.support_document_mime || null,
        supportDoc?.support_document_size_bytes || null,
        pendingStatusId,
        actor,
      ]
    );
    const requestRow = inserted.rows[0];

    const notificationTypeId = await resolveLookupValueIdByGroupKeyAndKeys(
      context.tenant_id,
      USER_NOTIFICATION_TYPE_GROUP_KEY,
      ['SHIFT_CHANGE_REQUEST_CREATED']
    );
    if (notificationTypeId) {
      const recipientUserIds = await resolveAssignedApproverUserIds(
        context.tenant_id,
        context.employee_id
      );

      const title = 'Nueva solicitud de cambio de turno';
      const message = `${context.employee_name || ''} ${context.employee_lastname || ''}`.trim() +
        ` solicita cambio de turno para ${shiftDate}.`;

      for (const recipientUserId of recipientUserIds) {
        if (recipientUserId === context.user_id) continue;
        await pool.query(
          `
            INSERT INTO public.user_notifications (
              id,
              tenant_id,
              user_id,
              notification_type_id,
              title,
              message,
              icon_key,
              ref_table,
              ref_id,
              is_read,
              is_active,
              created_by
            )
            VALUES (
              gen_random_uuid(),
              $1::uuid, $2::uuid, $3::uuid, $4, $5, 'ArrowLeftRight',
              'employee_shift_change_requests', $6::uuid, false, true, $7
            )
          `,
          [
            context.tenant_id,
            recipientUserId,
            notificationTypeId,
            title,
            message,
            requestRow.id,
            actor,
          ]
        );
      }
    }

    return res.status(201).json({ success: true, request: requestRow });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/request-shift-change/:id/support-document', async (req: Request, res: Response) => {
  try {
    const employeeContext = await resolveEmployeeContext(req);
    const approverContext = await resolveApproverContext(req);
    const tenantId = employeeContext?.tenant_id || approverContext?.userContext.tenant_id || null;
    if (!tenantId) {
      return res.status(403).json({ error: 'No existe contexto de acceso para descargar adjuntos' });
    }

    const requestId = normalizeNullableText(req.params.id);
    if (!requestId) return res.status(400).json({ error: 'id es obligatorio' });

    const requestResult = await pool.query(
      `
        SELECT
          employee_id,
          support_document_path,
          support_document_name,
          support_document_mime
        FROM public.employee_shift_change_requests
        WHERE id = $1::uuid
          AND tenant_id = $2::uuid
          AND is_active = true
        LIMIT 1
      `,
      [requestId, tenantId]
    );

    const found = requestResult.rows[0];
    if (!found) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    const canAccessAsOwner = Boolean(
      employeeContext && String(found.employee_id || '') === String(employeeContext.employee_id || '')
    );
    const canAccessAsApprover = approverContext
      ? (
          (await hasScreenActionPermissionForUser(
            approverContext.userContext.tenant_id,
            approverContext.userContext.user_id,
            SHIFT_CHANGE_APPROVAL_SCREEN_KEYS,
            'VIEW'
          )) &&
          (await resolveManagedEmployeeIdsForApprover(
            approverContext.userContext.tenant_id,
            approverContext.userContext.user_id
          )).includes(String(found.employee_id || ''))
        )
      : false;
    if (!canAccessAsOwner && !canAccessAsApprover) {
      return res.status(403).json({ error: 'No tiene permisos para ver el adjunto de esta solicitud' });
    }

    const rawSupportPath = String(found.support_document_path || '').trim();
    if (!rawSupportPath) {
      return res.status(404).json({ error: 'La solicitud no tiene documento adjunto' });
    }

    const supportPath = rawSupportPath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!supportPath || supportPath.includes('..')) {
      return res.status(400).json({ error: 'Ruta de documento adjunto invalida' });
    }
    if (!supportPath.startsWith(`${tenantId}/`)) {
      return res.status(403).json({ error: 'Ruta de documento no permitida para este tenant' });
    }

    const config = await resolveSupportDocumentStorageConfig(tenantId);
    const absoluteFilePath = path.join(config.absolutePath, supportPath);
    await fs.access(absoluteFilePath);

    const fileName = sanitizeSupportDocumentName(found.support_document_name || 'respaldo-cambio-turno.pdf')
      .replace(/"/g, '');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    if (found.support_document_mime) {
      res.setHeader('Content-Type', String(found.support_document_mime));
    }
    return res.sendFile(absoluteFilePath);
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return res.status(404).json({ error: 'Archivo adjunto no encontrado' });
    }
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.patch('/request-shift-change/:id', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const requestId = normalizeNullableText(req.params.id);
    if (!requestId) {
      return res.status(400).json({ error: 'id es obligatorio' });
    }

    const actor = getActor(req);
    const requestedShiftIdInput = normalizeNullableText(req.body?.requested_shift_id);
    const reasonInput = req.body?.reason;
    const reason = reasonInput === undefined ? undefined : normalizeNullableText(reasonInput);
    const supportDocumentNameInput = normalizeNullableText(req.body?.support_document_name);
    const supportDocumentMimeInput = normalizeNullableText(req.body?.support_document_mime);
    const supportDocumentBase64Input = normalizeNullableText(req.body?.support_document_base64);
    const clearSupportDocument = req.body?.clear_support_document === true;

    const requestResult = await pool.query(
      `
        SELECT
          r.id,
          r.shift_date,
          r.company_id,
          r.current_shift_id,
          cs.company_id AS current_shift_company_id,
          r.request_status_id,
          UPPER(COALESCE(st.lookup_key, '')) AS request_status_key
        FROM public.employee_shift_change_requests r
        LEFT JOIN public.shifts cs
          ON cs.id = r.current_shift_id
         AND cs.tenant_id = r.tenant_id
        LEFT JOIN public.lookup_values st
          ON st.id = r.request_status_id
        WHERE r.id = $1::uuid
          AND r.tenant_id = $2::uuid
          AND r.employee_id = $3::uuid
          AND r.is_active = true
        LIMIT 1
      `,
      [requestId, context.tenant_id, context.employee_id]
    );
    const requestRow = requestResult.rows[0];
    if (!requestRow) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    if (!isEditableShiftChangeStatusKey(requestRow.request_status_key)) {
      return res.status(400).json({ error: 'La solicitud ya fue respondida y no puede editarse' });
    }

    if (reasonInput !== undefined && !reason) {
      return res.status(400).json({ error: 'reason no puede estar vacio' });
    }

    if (requestedShiftIdInput && requestedShiftIdInput === requestRow.current_shift_id) {
      return res.status(400).json({ error: 'El turno solicitado debe ser diferente al turno actual' });
    }

    if (requestedShiftIdInput) {
      const validRequestedShiftCompanyIds = Array.from(new Set([requestRow.company_id, requestRow.current_shift_company_id].filter(Boolean)));
      const requestedShiftResult = await pool.query(
        `
          SELECT id
          FROM public.shifts
          WHERE id = $1::uuid
            AND tenant_id = $2::uuid
            AND company_id = ANY($3::uuid[])
            AND is_active = true
          LIMIT 1
        `,
        [requestedShiftIdInput, context.tenant_id, validRequestedShiftCompanyIds]
      );
      if (!requestedShiftResult.rows[0]) {
        return res.status(400).json({ error: 'requested_shift_id no valido para la empresa del empleado' });
      }
    }

    let supportDoc: {
      support_document_path: string;
      support_document_name: string;
      support_document_mime: string;
      support_document_size_bytes: number;
    } | null = null;
    if (supportDocumentBase64Input) {
      supportDoc = await saveRequestSupportDocument({
        tenantId: context.tenant_id,
        section: 'shift_change_requests',
        employeeCode: context.employee_code,
        requestDate: requestRow.shift_date,
        fileName: supportDocumentNameInput || 'respaldo-cambio-turno.pdf',
        mimeType: supportDocumentMimeInput || 'application/pdf',
        fileBase64: supportDocumentBase64Input,
      });
    }

    const updates: string[] = [];
    const params: any[] = [requestId, context.tenant_id, context.employee_id];
    let next = 4;

    if (requestedShiftIdInput) {
      updates.push(`requested_shift_id = $${next++}::uuid`);
      params.push(requestedShiftIdInput);
    }
    if (reason !== undefined) {
      updates.push(`reason = $${next++}`);
      params.push(reason);
    }
    if (supportDoc) {
      updates.push(`support_document_path = $${next++}`);
      params.push(supportDoc.support_document_path);
      updates.push(`support_document_name = $${next++}`);
      params.push(supportDoc.support_document_name);
      updates.push(`support_document_mime = $${next++}`);
      params.push(supportDoc.support_document_mime);
      updates.push(`support_document_size_bytes = $${next++}`);
      params.push(supportDoc.support_document_size_bytes);
    } else if (clearSupportDocument) {
      updates.push('support_document_path = NULL');
      updates.push('support_document_name = NULL');
      updates.push('support_document_mime = NULL');
      updates.push('support_document_size_bytes = NULL');
    }

    updates.push(`updated_by = $${next++}`);
    params.push(actor);
    updates.push('updated_at = now()');

    const updated = await pool.query(
      `
        UPDATE public.employee_shift_change_requests
        SET ${updates.join(', ')}
        WHERE id = $1::uuid
          AND tenant_id = $2::uuid
          AND employee_id = $3::uuid
          AND is_active = true
        RETURNING *
      `,
      params
    );

    return res.status(200).json({ success: true, request: updated.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.delete('/request-shift-change/:id', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const requestId = normalizeNullableText(req.params.id);
    if (!requestId) {
      return res.status(400).json({ error: 'id es obligatorio' });
    }

    const actor = getActor(req);

    const requestResult = await pool.query(
      `
        SELECT
          r.id,
          UPPER(COALESCE(st.lookup_key, '')) AS request_status_key
        FROM public.employee_shift_change_requests r
        LEFT JOIN public.lookup_values st
          ON st.id = r.request_status_id
        WHERE r.id = $1::uuid
          AND r.tenant_id = $2::uuid
          AND r.employee_id = $3::uuid
          AND r.is_active = true
        LIMIT 1
      `,
      [requestId, context.tenant_id, context.employee_id]
    );
    const requestRow = requestResult.rows[0];
    if (!requestRow) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    if (!isEditableShiftChangeStatusKey(requestRow.request_status_key)) {
      return res.status(400).json({ error: 'La solicitud ya fue respondida y no puede eliminarse' });
    }

    const cancelledStatusId = await resolveShiftChangeRequestStatusId(
      context.tenant_id,
      ['CANCELLED', 'CANCELED', 'CANCELADO']
    );

    await pool.query(
      `
        UPDATE public.employee_shift_change_requests
        SET
          is_active = false,
          request_status_id = COALESCE($4::uuid, request_status_id),
          updated_by = $5,
          updated_at = now()
        WHERE id = $1::uuid
          AND tenant_id = $2::uuid
          AND employee_id = $3::uuid
          AND is_active = true
      `,
      [requestId, context.tenant_id, context.employee_id, cancelledStatusId, actor]
    );

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.patch('/request-shift-change/:id/decision', async (req: Request, res: Response) => {
  try {
    const userContext = await resolveUserContext(req);
    if (!userContext) {
      return res.status(403).json({ error: 'No existe usuario interno asociado al autenticado' });
    }

    const managedEmployeeIds = await resolveManagedEmployeeIdsForApprover(
      userContext.tenant_id,
      userContext.user_id
    );
    if (managedEmployeeIds.length === 0) {
      return res.status(403).json({ error: 'No tiene empleados asignados para aprobación' });
    }

    const requestId = normalizeNullableText(req.params.id);
    const decision = String(req.body?.decision || '').trim().toUpperCase();
    const supervisorNotes = normalizeNullableText(req.body?.supervisor_notes);

    if (!requestId) return res.status(400).json({ error: 'id es obligatorio' });
    if (!['APPROVE', 'REJECT'].includes(decision)) {
      return res.status(400).json({ error: 'decision debe ser APPROVE o REJECT' });
    }
    const decisionActionKey = decision === 'APPROVE' ? 'APPROVE' : 'REJECT';
    const canDecide = await assertApproverActionPermission({
      userContext,
      screenKeys: SHIFT_CHANGE_APPROVAL_SCREEN_KEYS,
      actionKey: decisionActionKey,
      errorMessage: `No tiene permiso ${decisionActionKey} para aprobar cambios de turno`,
    });
    if (!canDecide.ok) {
      return res.status(canDecide.status).json({ error: canDecide.error });
    }

    const currentResult = await pool.query(
      `
        SELECT
          r.id,
          r.tenant_id,
          r.company_id,
          r.employee_id,
          r.shift_date,
          r.current_shift_id,
          r.requested_shift_id,
          UPPER(COALESCE(st.lookup_key, '')) AS request_status_key,
          e.user_id AS employee_user_id
        FROM public.employee_shift_change_requests r
        LEFT JOIN public.lookup_values st
          ON st.id = r.request_status_id
        LEFT JOIN public.employees e
          ON e.id = r.employee_id
         AND e.tenant_id = r.tenant_id
        WHERE r.id = $1::uuid
          AND r.tenant_id = $2::uuid
          AND r.employee_id = ANY($3::uuid[])
          AND r.is_active = true
        LIMIT 1
      `,
      [requestId, userContext.tenant_id, managedEmployeeIds]
    );

    const current = currentResult.rows[0];
    if (!current) return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (!isEditableShiftChangeStatusKey(current.request_status_key)) {
      return res.status(400).json({ error: 'La solicitud ya tiene decisión final' });
    }

    const approvedStatusId = await resolveShiftChangeRequestStatusId(
      userContext.tenant_id,
      ['APPROVED', 'APROBADO']
    );
    const rejectedStatusId = await resolveShiftChangeRequestStatusId(
      userContext.tenant_id,
      ['REJECTED', 'RECHAZADO', 'DENEGADO']
    );
    const decisionStatusId = decision === 'APPROVE' ? approvedStatusId : rejectedStatusId;
    if (!decisionStatusId) {
      return res.status(400).json({ error: 'No existe estado destino configurado para la decisión' });
    }
    if (decision === 'APPROVE' && !approvedStatusId) {
      return res.status(400).json({ error: 'No existe estado APPROVED/APROBADO configurado' });
    }
    if (decision === 'REJECT' && !rejectedStatusId) {
      return res.status(400).json({ error: 'No existe estado REJECTED/RECHAZADO configurado' });
    }

    if (decision === 'APPROVE') {
      await pool.query(
        `
          UPDATE public.employee_shift_plans
          SET
            shift_id = $5::uuid,
            updated_by = $6,
            updated_at = now()
          WHERE tenant_id = $1::uuid
            AND company_id = $2::uuid
            AND employee_id = $3::uuid
            AND shift_date = $4::date
            AND is_active = true
        `,
        [
          current.tenant_id,
          current.company_id,
          current.employee_id,
          current.shift_date,
          current.requested_shift_id,
          getActor(req),
        ]
      );
    }

    const decisionTag = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const auditNotes = supervisorNotes ? `${decisionTag}: ${supervisorNotes}` : decisionTag;

    const updated = await pool.query(
      `
        UPDATE public.employee_shift_change_requests
        SET
          request_status_id = $3::uuid,
          supervisor_notes = $4,
          approved_by = $5::uuid,
          approved_at = now(),
          updated_by = $6,
          updated_at = now()
        WHERE id = $1::uuid
          AND tenant_id = $2::uuid
          AND is_active = true
        RETURNING *
      `,
      [
        requestId,
        userContext.tenant_id,
        decisionStatusId,
        auditNotes,
        userContext.user_id,
        getActor(req),
      ]
    );

    const notificationTypeId = await resolveLookupValueIdByGroupKeyAndKeys(
      userContext.tenant_id,
      USER_NOTIFICATION_TYPE_GROUP_KEY,
      ['SHIFT_CHANGE_REQUEST_DECIDED']
    );
    if (notificationTypeId && current.employee_user_id) {
      const decisionMessage = supervisorNotes || (
        decision === 'APPROVE'
          ? `El cambio de turno del ${String(current.shift_date).slice(0, 10)} fue aprobado.`
          : `El cambio de turno del ${String(current.shift_date).slice(0, 10)} fue denegado.`
      );
      await pool.query(
        `
          INSERT INTO public.user_notifications (
            id, tenant_id, user_id, notification_type_id, title, message,
            icon_key, ref_table, ref_id, is_read, is_active, created_by
          )
          VALUES (
            gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4, $5,
            'ArrowLeftRight', 'employee_shift_change_requests', $6::uuid, false, true, $7
          )
        `,
        [
          userContext.tenant_id,
          current.employee_user_id,
          notificationTypeId,
          decision === 'APPROVE' ? 'Solicitud de cambio de turno aprobada' : 'Solicitud de cambio de turno denegada',
          decisionMessage,
          requestId,
          getActor(req),
        ]
      );
    }

    return res.status(200).json({ success: true, request: updated.rows[0] || null });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/time-punch-requests/catalogs', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const [typesResult, statusesResult, punchKeysResult, punchStatusesResult, recentPunchesResult] = await Promise.all([
      pool.query(
        `
          SELECT lv.id, lv.lookup_key, lv.lookup_label, lv.lookup_short_label, lv.sort_order
          FROM public.lookup_values lv
          INNER JOIN public.lookup_groups lg
            ON lg.id = lv.lookup_group_id
          WHERE lg.lookup_group_key = $1
            AND lv.is_active = true
            AND (lv.tenant_id IS NULL OR lv.tenant_id = $2::uuid)
          ORDER BY lv.sort_order ASC, lv.lookup_label ASC
        `,
        [TIME_PUNCH_CHANGE_REQUEST_TYPE_GROUP_KEY, context.tenant_id]
      ),
      pool.query(
        `
          SELECT lv.id, lv.lookup_key, lv.lookup_label, lv.lookup_short_label, lv.sort_order,
                 (lv.metadata->>'device_code')::integer AS device_code
          FROM public.lookup_values lv
          INNER JOIN public.lookup_groups lg
            ON lg.id = lv.lookup_group_id
          WHERE lg.lookup_group_key = $1
            AND lv.is_active = true
            AND (lv.tenant_id IS NULL OR lv.tenant_id = $2::uuid)
          ORDER BY lv.sort_order ASC, lv.lookup_label ASC
        `,
        [TIME_PUNCH_CHANGE_REQUEST_STATUS_GROUP_KEY, context.tenant_id]
      ),
      pool.query(
        `
          SELECT lv.id, lv.lookup_key, lv.lookup_label, lv.lookup_short_label, lv.sort_order,
                 (lv.metadata->>'device_code')::integer AS device_code
          FROM public.lookup_values lv
          INNER JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
          WHERE lg.lookup_group_key = $1
            AND lg.is_active = true
            AND lv.is_active = true
            AND (lv.tenant_id IS NULL OR lv.tenant_id = $2::uuid)
            AND COALESCE(lv.metadata->>'device_code', '') ~ '^[0-9]+$'
          ORDER BY lv.sort_order ASC, lv.lookup_label ASC
        `,
        [PUNCH_KEY_GROUP_KEY, context.tenant_id]
      ),
      pool.query(
        `
          SELECT lv.id, lv.lookup_key, lv.lookup_label, lv.lookup_short_label, lv.sort_order,
                 (lv.metadata->>'device_code')::integer AS device_code
          FROM public.lookup_values lv
          INNER JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
          WHERE lg.lookup_group_key = $1
            AND lg.is_active = true
            AND lv.is_active = true
            AND (lv.tenant_id IS NULL OR lv.tenant_id = $2::uuid)
          ORDER BY lv.sort_order ASC, lv.lookup_label ASC
        `,
        [TIME_PUNCH_STATUS_GROUP_KEY, context.tenant_id]
      ),
      pool.query(
        `
          SELECT
            p.id,
            p.company_id,
            c.company_name,
            p.time_clock_device_id,
            d.device_name,
            p.punch_datetime,
            p.punch_time_zone,
            p.punch_key,
            mv.lookup_label AS punch_key_label,
            p.time_punch_status_id,
            st.lookup_label AS time_punch_status_label,
            p.notes,
            p.is_active
          FROM public.employee_time_punches p
          LEFT JOIN public.companies c
            ON c.id = p.company_id
          LEFT JOIN public.time_clock_devices d
            ON d.id = p.time_clock_device_id
          LEFT JOIN public.lookup_values st
            ON st.id = p.time_punch_status_id
          LEFT JOIN public.lookup_values mv
            ON mv.id = p.punch_key_lookup_id
          WHERE p.tenant_id = $1::uuid
            AND p.employee_id = $2::uuid
          ORDER BY p.punch_datetime DESC
          LIMIT 180
        `,
        [context.tenant_id, context.employee_id]
      ),
    ]);

    return res.status(200).json({
      success: true,
      employee: {
        id: context.employee_id,
        employee_code: context.employee_code,
        employee_name: context.employee_name,
        employee_lastname: context.employee_lastname,
      },
      request_types: typesResult.rows,
      request_statuses: statusesResult.rows,
      punch_keys: punchKeysResult.rows,
      punch_statuses: punchStatusesResult.rows,
      recent_punches: recentPunchesResult.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/time-punch-requests', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const from = normalizeNullableText(req.query.from) || normalizeNullableText(req.query.date_from);
    const to = normalizeNullableText(req.query.to) || normalizeNullableText(req.query.date_to);
    const requestId = normalizeNullableText(req.query.request_id);
    const status = String(req.query.status || 'ALL').trim().toUpperCase();
    const statusKeys =
      status === 'PENDING'
        ? ['PENDING', 'PENDIENTE', 'IN_REVIEW', 'EN_REVISION', 'EN_REVISIÓN', 'REQUESTED', 'SOLICITADO']
        : status === 'APPROVED'
        ? ['APPROVED', 'APROBADO']
        : status === 'REJECTED'
        ? ['REJECTED', 'RECHAZADO', 'DENEGADO']
        : status === 'CANCELLED'
        ? ['CANCELLED', 'CANCELED', 'CANCELADO']
        : [];

    const params: any[] = [context.tenant_id, context.employee_id];
    let whereExtra = '';
    if (requestId) {
      params.push(requestId);
      whereExtra += ` AND r.id = $${params.length}::uuid`;
    }
    if (from && isIsoDate(from) && !requestId) {
      params.push(`${from}T00:00:00`);
      whereExtra += ` AND r.created_at >= $${params.length}::timestamptz`;
    }
    if (to && isIsoDate(to) && !requestId) {
      params.push(`${to}T23:59:59`);
      whereExtra += ` AND r.created_at <= $${params.length}::timestamptz`;
    }
    if (statusKeys.length > 0 && !requestId) {
      params.push(statusKeys);
      whereExtra += ` AND UPPER(COALESCE(st.lookup_key, '')) = ANY($${params.length}::text[])`;
    }

    const result = await pool.query(
      `
        SELECT
          r.id,
          r.company_id,
          c.company_name,
          r.employee_id,
          r.target_punch_id,
          r.request_type_id,
          rt.lookup_key AS request_type_key,
          rt.lookup_label AS request_type_label,
          r.reason,
          r.current_values,
          r.requested_values,
          r.request_status_id,
          st.lookup_key AS request_status_key,
          st.lookup_label AS request_status_label,
          r.supervisor_notes,
          r.approved_by,
          au.display_name AS approved_by_display_name,
          au.username AS approved_by_username,
          r.approved_at,
          r.support_document_path,
          r.support_document_name,
          r.support_document_mime,
          r.support_document_size_bytes,
          r.is_active,
          r.created_at,
          r.updated_at,
          p.punch_datetime AS target_punch_datetime,
          p.punch_key AS target_punch_key,
          pm.lookup_label AS target_punch_key_label,
          p.is_active AS target_punch_is_active
        FROM public.employee_time_punch_change_requests r
        LEFT JOIN public.companies c
          ON c.id = r.company_id
        LEFT JOIN public.lookup_values rt
          ON rt.id = r.request_type_id
        LEFT JOIN public.lookup_values st
          ON st.id = r.request_status_id
        LEFT JOIN public.users au
          ON au.id = r.approved_by
        LEFT JOIN public.employee_time_punches p
          ON p.id = r.target_punch_id
        LEFT JOIN public.lookup_values pm
          ON pm.id = p.punch_key_lookup_id
        WHERE r.tenant_id = $1::uuid
          AND r.employee_id = $2::uuid
          ${whereExtra}
        ORDER BY r.created_at DESC
      `,
      params
    );

    return res.status(200).json({ success: true, requests: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.post('/time-punch-requests', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const requestTypeId = normalizeNullableText(req.body?.request_type_id);
    const targetPunchId = normalizeNullableText(req.body?.target_punch_id);
    const reason = normalizeNullableText(req.body?.reason);
    const supportDocumentNameInput = normalizeNullableText(req.body?.support_document_name);
    const supportDocumentMimeInput = normalizeNullableText(req.body?.support_document_mime);
    const supportDocumentBase64Input = normalizeNullableText(req.body?.support_document_base64);
    const actor = getActor(req);

    if (!requestTypeId) return res.status(400).json({ error: 'request_type_id es obligatorio' });
    if (!reason) return res.status(400).json({ error: 'reason es obligatorio' });

    const requestTypeResult = await pool.query(
      `
        SELECT lv.id, UPPER(COALESCE(lv.lookup_key, '')) AS request_type_key
        FROM public.lookup_values lv
        INNER JOIN public.lookup_groups lg
          ON lg.id = lv.lookup_group_id
        WHERE lv.id = $1::uuid
          AND lg.lookup_group_key = $2
          AND lv.is_active = true
          AND (lv.tenant_id IS NULL OR lv.tenant_id = $3::uuid)
        LIMIT 1
      `,
      [requestTypeId, TIME_PUNCH_CHANGE_REQUEST_TYPE_GROUP_KEY, context.tenant_id]
    );
    const requestType = requestTypeResult.rows[0];
    if (!requestType) {
      return res.status(400).json({ error: 'request_type_id no es valido' });
    }

    let targetPunch: any = null;
    if (targetPunchId) {
      const targetResult = await pool.query(
        `
          SELECT
            p.id,
            p.company_id,
            p.time_clock_device_id,
            p.punch_datetime,
            p.punch_time_zone,
            p.punch_key,
            p.punch_source_id,
            p.time_punch_status_id,
            p.notes,
            p.is_active
          FROM public.employee_time_punches p
          WHERE p.id = $1::uuid
            AND p.tenant_id = $2::uuid
            AND p.employee_id = $3::uuid
          LIMIT 1
        `,
        [targetPunchId, context.tenant_id, context.employee_id]
      );
      targetPunch = targetResult.rows[0] || null;
      if (!targetPunch) {
        return res.status(400).json({ error: 'target_punch_id no es valido para el empleado' });
      }
    }

    if (['UPDATE_PUNCH', 'TOGGLE_ACTIVE'].includes(requestType.request_type_key) && !targetPunch) {
      return res.status(400).json({ error: 'target_punch_id es obligatorio para este tipo de solicitud' });
    }

    const normalizedRequestedValues = await normalizeTimePunchRequestedValues({
      tenantId: context.tenant_id,
      employeeId: context.employee_id,
      defaultCompanyId: context.company_id,
      requestTypeKey: requestType.request_type_key,
      rawValues: req.body?.requested_values,
      targetCompanyId: targetPunch?.company_id || null,
    });

    if (
      requestType.request_type_key === 'TOGGLE_ACTIVE' &&
      targetPunch &&
      normalizedRequestedValues.is_active === targetPunch.is_active
    ) {
      return res.status(400).json({ error: 'El valor solicitado de is_active es igual al actual' });
    }

    const pendingStatusId = await resolveLookupValueIdByGroupKeyAndKeys(
      context.tenant_id,
      TIME_PUNCH_CHANGE_REQUEST_STATUS_GROUP_KEY,
      ['PENDING', 'PENDIENTE', 'REQUESTED', 'SOLICITADO']
    );
    if (!pendingStatusId) {
      return res.status(400).json({ error: 'No existe estado PENDING para solicitudes de marcacion' });
    }

    let supportDoc: {
      support_document_path: string;
      support_document_name: string;
      support_document_mime: string;
      support_document_size_bytes: number;
    } | null = null;
    if (supportDocumentBase64Input) {
      supportDoc = await saveRequestSupportDocument({
        tenantId: context.tenant_id,
        section: 'time_punch_change_requests',
        employeeCode: context.employee_code,
        requestDate: normalizedRequestedValues.punch_datetime || new Date(),
        fileName: supportDocumentNameInput || 'respaldo-marcacion.pdf',
        mimeType: supportDocumentMimeInput || 'application/pdf',
        fileBase64: supportDocumentBase64Input,
      });
    }

    const companyIdForRequest =
      normalizedRequestedValues.company_id || targetPunch?.company_id || context.company_id || null;
    if (!companyIdForRequest) {
      return res.status(400).json({ error: 'No se pudo determinar la empresa de la solicitud' });
    }

    const currentValues = targetPunch
      ? {
          company_id: targetPunch.company_id,
          time_clock_device_id: targetPunch.time_clock_device_id,
          punch_datetime: targetPunch.punch_datetime,
          punch_time_zone: targetPunch.punch_time_zone,
          punch_key: targetPunch.punch_key,
          punch_source_id: targetPunch.punch_source_id,
          time_punch_status_id: targetPunch.time_punch_status_id,
          notes: targetPunch.notes,
          is_active: targetPunch.is_active,
        }
      : null;

    const insertResult = await pool.query(
      `
        INSERT INTO public.employee_time_punch_change_requests (
          id,
          tenant_id,
          company_id,
          employee_id,
          target_punch_id,
          request_type_id,
          reason,
          current_values,
          requested_values,
          request_status_id,
          support_document_path,
          support_document_name,
          support_document_mime,
          support_document_size_bytes,
          is_active,
          created_by
        )
        VALUES (
          gen_random_uuid(),
          $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6, $7::jsonb, $8::jsonb, $9::uuid,
          $10, $11, $12, $13, true, $14
        )
        RETURNING *
      `,
      [
        context.tenant_id,
        companyIdForRequest,
        context.employee_id,
        targetPunchId,
        requestTypeId,
        reason,
        currentValues ? JSON.stringify(currentValues) : null,
        JSON.stringify(normalizedRequestedValues),
        pendingStatusId,
        supportDoc?.support_document_path || null,
        supportDoc?.support_document_name || null,
        supportDoc?.support_document_mime || null,
        supportDoc?.support_document_size_bytes || null,
        actor,
      ]
    );

    const requestRow = insertResult.rows[0];

    const notificationTypeId = await resolveLookupValueIdByGroupKeyAndKeys(
      context.tenant_id,
      USER_NOTIFICATION_TYPE_GROUP_KEY,
      ['TIME_PUNCH_CHANGE_REQUEST_CREATED']
    );
    if (notificationTypeId) {
      const recipientUserIds = await resolveAssignedApproverUserIds(
        context.tenant_id,
        context.employee_id
      );

      const title = 'Nueva solicitud de cambio de marcacion';
      const message = `${context.employee_name || ''} ${context.employee_lastname || ''}`.trim() +
        ' envio una solicitud de cambio de marcacion.';

      for (const recipientUserId of recipientUserIds) {
        if (recipientUserId === context.user_id) continue;
        await pool.query(
          `
            INSERT INTO public.user_notifications (
              id,
              tenant_id,
              user_id,
              notification_type_id,
              title,
              message,
              icon_key,
              ref_table,
              ref_id,
              is_read,
              is_active,
              created_by
            )
            VALUES (
              gen_random_uuid(),
              $1::uuid, $2::uuid, $3::uuid, $4, $5, 'ClipboardCheck',
              'employee_time_punch_change_requests', $6::uuid, false, true, $7
            )
          `,
          [
            context.tenant_id,
            recipientUserId,
            notificationTypeId,
            title,
            message,
            requestRow.id,
            actor,
          ]
        );
      }
    }

    return res.status(201).json({ success: true, request: requestRow });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.patch('/time-punch-requests/:id', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const requestId = normalizeNullableText(req.params.id);
    if (!requestId) return res.status(400).json({ error: 'id es obligatorio' });

    const reasonInput = req.body?.reason;
    const reason = reasonInput === undefined ? undefined : normalizeNullableText(reasonInput);
    const requestedValuesInput = req.body?.requested_values;
    const supportDocumentNameInput = normalizeNullableText(req.body?.support_document_name);
    const supportDocumentMimeInput = normalizeNullableText(req.body?.support_document_mime);
    const supportDocumentBase64Input = normalizeNullableText(req.body?.support_document_base64);
    const clearSupportDocument = req.body?.clear_support_document === true;
    const actor = getActor(req);

    const currentResult = await pool.query(
      `
        SELECT
          r.id,
          r.company_id,
          r.target_punch_id,
          r.request_type_id,
          UPPER(COALESCE(rt.lookup_key, '')) AS request_type_key,
          UPPER(COALESCE(st.lookup_key, '')) AS request_status_key
        FROM public.employee_time_punch_change_requests r
        LEFT JOIN public.lookup_values rt
          ON rt.id = r.request_type_id
        LEFT JOIN public.lookup_values st
          ON st.id = r.request_status_id
        WHERE r.id = $1::uuid
          AND r.tenant_id = $2::uuid
          AND r.employee_id = $3::uuid
          AND r.is_active = true
        LIMIT 1
      `,
      [requestId, context.tenant_id, context.employee_id]
    );
    const current = currentResult.rows[0];
    if (!current) return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (!isEditableTimePunchChangeStatusKey(current.request_status_key)) {
      return res.status(400).json({ error: 'La solicitud ya fue procesada y no puede editarse' });
    }
    if (reasonInput !== undefined && !reason) {
      return res.status(400).json({ error: 'reason no puede quedar vacio' });
    }

    let targetPunch: any = null;
    if (current.target_punch_id) {
      const targetResult = await pool.query(
        `
          SELECT id, company_id, is_active
          FROM public.employee_time_punches
          WHERE id = $1::uuid
            AND tenant_id = $2::uuid
            AND employee_id = $3::uuid
          LIMIT 1
        `,
        [current.target_punch_id, context.tenant_id, context.employee_id]
      );
      targetPunch = targetResult.rows[0] || null;
    }
    if (['UPDATE_PUNCH', 'TOGGLE_ACTIVE'].includes(current.request_type_key) && !targetPunch) {
      return res.status(400).json({ error: 'La marcacion objetivo ya no existe para esta solicitud' });
    }

    let normalizedRequestedValues: TimePunchRequestedValues | null = null;
    if (requestedValuesInput !== undefined) {
      normalizedRequestedValues = await normalizeTimePunchRequestedValues({
        tenantId: context.tenant_id,
        employeeId: context.employee_id,
        defaultCompanyId: context.company_id,
        requestTypeKey: current.request_type_key,
        rawValues: requestedValuesInput,
        targetCompanyId: targetPunch?.company_id || current.company_id || null,
      });
      if (
        current.request_type_key === 'TOGGLE_ACTIVE' &&
        targetPunch &&
        normalizedRequestedValues.is_active === targetPunch.is_active
      ) {
        return res.status(400).json({ error: 'El valor solicitado de is_active es igual al actual' });
      }
    }

    let supportDoc: {
      support_document_path: string;
      support_document_name: string;
      support_document_mime: string;
      support_document_size_bytes: number;
    } | null = null;
    if (supportDocumentBase64Input) {
      supportDoc = await saveRequestSupportDocument({
        tenantId: context.tenant_id,
        section: 'time_punch_change_requests',
        employeeCode: context.employee_code,
        requestDate: new Date(),
        fileName: supportDocumentNameInput || 'respaldo-marcacion.pdf',
        mimeType: supportDocumentMimeInput || 'application/pdf',
        fileBase64: supportDocumentBase64Input,
      });
    }

    const updates: string[] = [];
    const params: any[] = [requestId, context.tenant_id, context.employee_id];
    let next = 4;

    if (reason !== undefined) {
      updates.push(`reason = $${next++}`);
      params.push(reason);
    }
    if (normalizedRequestedValues) {
      updates.push(`requested_values = $${next++}::jsonb`);
      params.push(JSON.stringify(normalizedRequestedValues));
      if (normalizedRequestedValues.company_id) {
        updates.push(`company_id = $${next++}::uuid`);
        params.push(normalizedRequestedValues.company_id);
      }
    }
    if (supportDoc) {
      updates.push(`support_document_path = $${next++}`);
      params.push(supportDoc.support_document_path);
      updates.push(`support_document_name = $${next++}`);
      params.push(supportDoc.support_document_name);
      updates.push(`support_document_mime = $${next++}`);
      params.push(supportDoc.support_document_mime);
      updates.push(`support_document_size_bytes = $${next++}`);
      params.push(supportDoc.support_document_size_bytes);
    } else if (clearSupportDocument) {
      updates.push('support_document_path = NULL');
      updates.push('support_document_name = NULL');
      updates.push('support_document_mime = NULL');
      updates.push('support_document_size_bytes = NULL');
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
    }

    updates.push(`updated_by = $${next++}`);
    params.push(actor);
    updates.push('updated_at = now()');

    const updated = await pool.query(
      `
        UPDATE public.employee_time_punch_change_requests
        SET ${updates.join(', ')}
        WHERE id = $1::uuid
          AND tenant_id = $2::uuid
          AND employee_id = $3::uuid
          AND is_active = true
        RETURNING *
      `,
      params
    );

    return res.status(200).json({ success: true, request: updated.rows[0] || null });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.delete('/time-punch-requests/:id', async (req: Request, res: Response) => {
  try {
    const context = await resolveEmployeeContext(req);
    if (!context) {
      return res.status(403).json({ error: 'No existe empleado asociado al usuario autenticado' });
    }

    const requestId = normalizeNullableText(req.params.id);
    if (!requestId) return res.status(400).json({ error: 'id es obligatorio' });

    const currentResult = await pool.query(
      `
        SELECT
          r.id,
          UPPER(COALESCE(st.lookup_key, '')) AS request_status_key
        FROM public.employee_time_punch_change_requests r
        LEFT JOIN public.lookup_values st
          ON st.id = r.request_status_id
        WHERE r.id = $1::uuid
          AND r.tenant_id = $2::uuid
          AND r.employee_id = $3::uuid
          AND r.is_active = true
        LIMIT 1
      `,
      [requestId, context.tenant_id, context.employee_id]
    );
    const current = currentResult.rows[0];
    if (!current) return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (!isEditableTimePunchChangeStatusKey(current.request_status_key)) {
      return res.status(400).json({ error: 'Solo se pueden cancelar solicitudes en estado pendiente' });
    }

    const cancelledStatusId = await resolveLookupValueIdByGroupKeyAndKeys(
      context.tenant_id,
      TIME_PUNCH_CHANGE_REQUEST_STATUS_GROUP_KEY,
      ['CANCELLED', 'CANCELED', 'CANCELADO']
    );

    await pool.query(
      `
        UPDATE public.employee_time_punch_change_requests
        SET
          is_active = false,
          request_status_id = COALESCE($4::uuid, request_status_id),
          updated_by = $5,
          updated_at = now()
        WHERE id = $1::uuid
          AND tenant_id = $2::uuid
          AND employee_id = $3::uuid
      `,
      [requestId, context.tenant_id, context.employee_id, cancelledStatusId, getActor(req)]
    );

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/time-punch-requests/approvals/catalogs', async (req: Request, res: Response) => {
  try {
    const approver = await resolveApproverContext(req);
    if (!approver) {
      return res.status(403).json({ error: 'No tiene permisos para revisar solicitudes de marcacion' });
    }
    const canViewApprovals = await assertApproverActionPermission({
      userContext: approver.userContext,
      screenKeys: TIME_PUNCH_APPROVAL_SCREEN_KEYS,
      actionKey: 'VIEW',
      errorMessage: 'No tiene permiso VIEW para la pantalla de aprobación de marcaciones',
    });
    if (!canViewApprovals.ok) {
      return res.status(canViewApprovals.status).json({ error: canViewApprovals.error });
    }

    const [typesResult, statusesResult, punchKeysResult, punchStatusesResult] = await Promise.all([
      pool.query(
        `
          SELECT lv.id, lv.lookup_key, lv.lookup_label, lv.lookup_short_label, lv.sort_order
          FROM public.lookup_values lv
          INNER JOIN public.lookup_groups lg
            ON lg.id = lv.lookup_group_id
          WHERE lg.lookup_group_key = $1
            AND lv.is_active = true
            AND (lv.tenant_id IS NULL OR lv.tenant_id = $2::uuid)
          ORDER BY lv.sort_order ASC, lv.lookup_label ASC
        `,
        [TIME_PUNCH_CHANGE_REQUEST_TYPE_GROUP_KEY, approver.userContext.tenant_id]
      ),
      pool.query(
        `
          SELECT lv.id, lv.lookup_key, lv.lookup_label, lv.lookup_short_label, lv.sort_order
          FROM public.lookup_values lv
          INNER JOIN public.lookup_groups lg
            ON lg.id = lv.lookup_group_id
          WHERE lg.lookup_group_key = $1
            AND lv.is_active = true
            AND (lv.tenant_id IS NULL OR lv.tenant_id = $2::uuid)
          ORDER BY lv.sort_order ASC, lv.lookup_label ASC
        `,
        [TIME_PUNCH_CHANGE_REQUEST_STATUS_GROUP_KEY, approver.userContext.tenant_id]
      ),
      pool.query(
        `
          SELECT lv.id, lv.lookup_key, lv.lookup_label, lv.lookup_short_label, lv.sort_order,
                 (lv.metadata->>'device_code')::integer AS device_code
          FROM public.lookup_values lv
          INNER JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
          WHERE lg.lookup_group_key = $1
            AND lg.is_active = true
            AND lv.is_active = true
            AND (lv.tenant_id IS NULL OR lv.tenant_id = $2::uuid)
            AND COALESCE(lv.metadata->>'device_code', '') ~ '^[0-9]+$'
          ORDER BY lv.sort_order ASC, lv.lookup_label ASC
        `,
        [PUNCH_KEY_GROUP_KEY, approver.userContext.tenant_id]
      ),
      pool.query(
        `
          SELECT lv.id, lv.lookup_key, lv.lookup_label, lv.lookup_short_label, lv.sort_order
          FROM public.lookup_values lv
          INNER JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
          WHERE lg.lookup_group_key = $1
            AND lg.is_active = true
            AND lv.is_active = true
            AND (lv.tenant_id IS NULL OR lv.tenant_id = $2::uuid)
          ORDER BY lv.sort_order ASC, lv.lookup_label ASC
        `,
        [TIME_PUNCH_STATUS_GROUP_KEY, approver.userContext.tenant_id]
      ),
    ]);

    return res.status(200).json({
      success: true,
      request_types: typesResult.rows,
      request_statuses: statusesResult.rows,
      punch_keys: punchKeysResult.rows,
      punch_statuses: punchStatusesResult.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/time-punch-requests/approvals', async (req: Request, res: Response) => {
  try {
    const approver = await resolveApproverContext(req);
    if (!approver) {
      return res.status(403).json({ error: 'No tiene permisos para aprobar/denegar cambios de marcacion' });
    }
    const canViewApprovals = await assertApproverActionPermission({
      userContext: approver.userContext,
      screenKeys: TIME_PUNCH_APPROVAL_SCREEN_KEYS,
      actionKey: 'VIEW',
      errorMessage: 'No tiene permiso VIEW para la pantalla de aprobación de marcaciones',
    });
    if (!canViewApprovals.ok) {
      return res.status(canViewApprovals.status).json({ error: canViewApprovals.error });
    }
    const managedEmployeeIds = await resolveManagedEmployeeIdsForApprover(
      approver.userContext.tenant_id,
      approver.userContext.user_id
    );
    if (managedEmployeeIds.length === 0) {
      return res.status(200).json({ success: true, requests: [] });
    }

    const status = String(req.query.status || 'PENDING').trim().toUpperCase();
    const statusKeys =
      status === 'APPROVED'
        ? ['APPROVED', 'APROBADO']
        : status === 'REJECTED'
        ? ['REJECTED', 'RECHAZADO', 'DENEGADO']
        : status === 'CANCELLED'
        ? ['CANCELLED', 'CANCELED', 'CANCELADO']
        : status === 'ALL'
        ? []
        : ['PENDING', 'PENDIENTE', 'IN_REVIEW', 'EN_REVISION', 'EN_REVISIÓN', 'REQUESTED', 'SOLICITADO'];

    const includeInactive = status === 'CANCELLED' || status === 'ALL';
    const params: any[] = [approver.userContext.tenant_id, includeInactive, managedEmployeeIds];
    let whereStatus = '';
    if (statusKeys.length > 0) {
      params.push(statusKeys);
      whereStatus = ` AND UPPER(COALESCE(st.lookup_key, '')) = ANY($${params.length}::text[])`;
    }

    const result = await pool.query(
      `
        SELECT
          r.id,
          r.tenant_id,
          r.company_id,
          c.company_name,
          r.employee_id,
          e.employee_code,
          e.employee_name,
          e.employee_lastname,
          eu.display_name AS employee_user_display_name,
          eu.username AS employee_username,
          r.target_punch_id,
          r.request_type_id,
          rt.lookup_key AS request_type_key,
          rt.lookup_label AS request_type_label,
          r.reason,
          r.current_values,
          r.requested_values,
          r.request_status_id,
          st.lookup_key AS request_status_key,
          st.lookup_label AS request_status_label,
          r.supervisor_notes,
          r.approved_by,
          au.display_name AS approved_by_display_name,
          au.username AS approved_by_username,
          r.approved_at,
          r.support_document_path,
          r.support_document_name,
          r.support_document_mime,
          r.support_document_size_bytes,
          r.is_active,
          r.created_at,
          r.updated_at,
          p.punch_datetime AS target_punch_datetime,
          p.punch_key AS target_punch_key,
          pm.lookup_label AS target_punch_key_label,
          p.is_active AS target_punch_is_active
        FROM public.employee_time_punch_change_requests r
        LEFT JOIN public.companies c
          ON c.id = r.company_id
        LEFT JOIN public.employees e
          ON e.id = r.employee_id
        LEFT JOIN public.users eu
          ON eu.id = e.user_id
        LEFT JOIN public.lookup_values rt
          ON rt.id = r.request_type_id
        LEFT JOIN public.lookup_values st
          ON st.id = r.request_status_id
        LEFT JOIN public.users au
          ON au.id = r.approved_by
        LEFT JOIN public.employee_time_punches p
          ON p.id = r.target_punch_id
        LEFT JOIN public.lookup_values pm
          ON pm.id = p.punch_key_lookup_id
        WHERE r.tenant_id = $1::uuid
          AND ($2::boolean = true OR r.is_active = true)
          AND r.employee_id = ANY($3::uuid[])
          ${whereStatus}
        ORDER BY r.created_at DESC
      `,
      params
    );

    return res.status(200).json({ success: true, requests: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.get('/time-punch-requests/:id/support-document', async (req: Request, res: Response) => {
  try {
    const employeeContext = await resolveEmployeeContext(req);
    const approverContext = await resolveApproverContext(req);
    const tenantId = employeeContext?.tenant_id || approverContext?.userContext.tenant_id || null;
    if (!tenantId) {
      return res.status(403).json({ error: 'No existe contexto de acceso para descargar adjuntos' });
    }

    const requestId = normalizeNullableText(req.params.id);
    if (!requestId) return res.status(400).json({ error: 'id es obligatorio' });

    const requestResult = await pool.query(
      `
        SELECT
          employee_id,
          support_document_path,
          support_document_name,
          support_document_mime
        FROM public.employee_time_punch_change_requests
        WHERE id = $1::uuid
          AND tenant_id = $2::uuid
        LIMIT 1
      `,
      [requestId, tenantId]
    );

    const found = requestResult.rows[0];
    if (!found) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    const canAccessAsOwner = Boolean(
      employeeContext && String(found.employee_id || '') === String(employeeContext.employee_id || '')
    );
    const canAccessAsApprover = approverContext
      ? (
          (await hasScreenActionPermissionForUser(
            approverContext.userContext.tenant_id,
            approverContext.userContext.user_id,
            TIME_PUNCH_APPROVAL_SCREEN_KEYS,
            'VIEW'
          )) &&
          (await resolveManagedEmployeeIdsForApprover(
            approverContext.userContext.tenant_id,
            approverContext.userContext.user_id
          )).includes(String(found.employee_id || ''))
        )
      : false;
    if (!canAccessAsOwner && !canAccessAsApprover) {
      return res.status(403).json({ error: 'No tiene permisos para ver el adjunto de esta solicitud' });
    }

    const rawSupportPath = String(found.support_document_path || '').trim();
    if (!rawSupportPath) {
      return res.status(404).json({ error: 'La solicitud no tiene documento adjunto' });
    }

    const supportPath = rawSupportPath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!supportPath || supportPath.includes('..')) {
      return res.status(400).json({ error: 'Ruta de documento adjunto invalida' });
    }
    if (!supportPath.startsWith(`${tenantId}/`)) {
      return res.status(403).json({ error: 'Ruta de documento no permitida para este tenant' });
    }

    const config = await resolveSupportDocumentStorageConfig(tenantId);
    const absoluteFilePath = path.join(config.absolutePath, supportPath);
    await fs.access(absoluteFilePath);

    const fileName = sanitizeSupportDocumentName(found.support_document_name || 'respaldo-marcacion.pdf')
      .replace(/"/g, '');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    if (found.support_document_mime) {
      res.setHeader('Content-Type', String(found.support_document_mime));
    }
    return res.sendFile(absoluteFilePath);
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return res.status(404).json({ error: 'Archivo adjunto no encontrado' });
    }
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

router.patch('/time-punch-requests/:id/decision', async (req: Request, res: Response) => {
  try {
    const approver = await resolveApproverContext(req);
    if (!approver) {
      return res.status(403).json({ error: 'No tiene permisos para aprobar/denegar cambios de marcacion' });
    }
    const managedEmployeeIds = await resolveManagedEmployeeIdsForApprover(
      approver.userContext.tenant_id,
      approver.userContext.user_id
    );
    if (managedEmployeeIds.length === 0) {
      return res.status(403).json({ error: 'No tiene empleados asignados para aprobación' });
    }

    const requestId = normalizeNullableText(req.params.id);
    const decision = String(req.body?.decision || '').trim().toUpperCase();
    const supervisorNotes = normalizeNullableText(req.body?.supervisor_notes);
    if (!requestId) return res.status(400).json({ error: 'id es obligatorio' });
    if (!['APPROVE', 'REJECT'].includes(decision)) {
      return res.status(400).json({ error: 'decision debe ser APPROVE o REJECT' });
    }
    const decisionActionKey = decision === 'APPROVE' ? 'APPROVE' : 'REJECT';
    const canDecide = await assertApproverActionPermission({
      userContext: approver.userContext,
      screenKeys: TIME_PUNCH_APPROVAL_SCREEN_KEYS,
      actionKey: decisionActionKey,
      errorMessage: `No tiene permiso ${decisionActionKey} para aprobar cambios de marcacion`,
    });
    if (!canDecide.ok) {
      return res.status(canDecide.status).json({ error: canDecide.error });
    }
    if (decision === 'REJECT' && !supervisorNotes) {
      return res.status(400).json({ error: 'supervisor_notes es obligatorio para denegar' });
    }

    const currentResult = await pool.query(
      `
        SELECT
          r.id,
          r.tenant_id,
          r.company_id,
          r.employee_id,
          r.target_punch_id,
          r.current_values,
          r.requested_values,
          UPPER(COALESCE(rt.lookup_key, '')) AS request_type_key,
          UPPER(COALESCE(st.lookup_key, '')) AS request_status_key,
          e.user_id AS employee_user_id
        FROM public.employee_time_punch_change_requests r
        LEFT JOIN public.lookup_values rt
          ON rt.id = r.request_type_id
        LEFT JOIN public.lookup_values st
          ON st.id = r.request_status_id
        LEFT JOIN public.employees e
          ON e.id = r.employee_id
        WHERE r.id = $1::uuid
          AND r.tenant_id = $2::uuid
          AND r.employee_id = ANY($3::uuid[])
          AND r.is_active = true
        LIMIT 1
      `,
      [requestId, approver.userContext.tenant_id, managedEmployeeIds]
    );
    const current = currentResult.rows[0];
    if (!current) return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (isClosedTimePunchChangeStatusKey(current.request_status_key)) {
      return res.status(400).json({ error: 'La solicitud ya tiene estado final' });
    }

    const approvedStatusId = await resolveLookupValueIdByGroupKeyAndKeys(
      approver.userContext.tenant_id,
      TIME_PUNCH_CHANGE_REQUEST_STATUS_GROUP_KEY,
      ['APPROVED', 'APROBADO']
    );
    const rejectedStatusId = await resolveLookupValueIdByGroupKeyAndKeys(
      approver.userContext.tenant_id,
      TIME_PUNCH_CHANGE_REQUEST_STATUS_GROUP_KEY,
      ['REJECTED', 'RECHAZADO', 'DENEGADO']
    );
    const decisionStatusId = decision === 'APPROVE' ? approvedStatusId : rejectedStatusId;
    if (!decisionStatusId) {
      return res.status(400).json({ error: 'No existe estado destino configurado para la decision' });
    }

    const requestedValues = current.requested_values || {};
    if (decision === 'APPROVE') {
      if (current.request_type_key === 'CREATE_PUNCH') {
        if (!requestedValues.punch_datetime || !Number.isFinite(Number(requestedValues.punch_key))) {
          return res.status(400).json({ error: 'requested_values incompleto para crear marcacion' });
        }
        const approvedPunchSourceId =
          normalizeNullableText(requestedValues.punch_source_id) ||
          (await resolveLookupValueIdByGroupMetadata(
            approver.userContext.tenant_id,
            PUNCH_SOURCE_GROUP_KEY,
            'usage_key',
            'EMPLOYEE_WEB_PUNCH'
          ));
        if (!approvedPunchSourceId) {
          return res.status(400).json({ error: 'No existe una fuente de marcacion web configurada' });
        }
        await pool.query(
          `
            INSERT INTO public.employee_time_punches (
              id,
              tenant_id,
              company_id,
              employee_id,
              time_clock_device_id,
              punch_datetime,
              punch_time_zone,
              punch_key,
              punch_source_id,
              time_punch_status_id,
              service_ticket_number,
              notes,
              is_active,
              created_by
            )
            VALUES (
              gen_random_uuid(),
              $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::timestamptz, $6, $7::integer, $8::uuid, $9::uuid,
              NULL, $10, $11::boolean, $12
            )
          `,
          [
            current.tenant_id,
            requestedValues.company_id || current.company_id,
            current.employee_id,
            requestedValues.time_clock_device_id || null,
            requestedValues.punch_datetime,
            requestedValues.punch_time_zone || await resolveEffectiveAttendanceTimeZone(pool, {
              tenantId: current.tenant_id,
              companyId: requestedValues.company_id || current.company_id,
              employeeId: current.employee_id,
            }),
            Math.trunc(Number(requestedValues.punch_key)),
            approvedPunchSourceId,
            requestedValues.time_punch_status_id || null,
            normalizeNullableText(requestedValues.notes) || 'Marcacion creada por aprobacion',
            requestedValues.is_active === false ? false : true,
            getActor(req),
          ]
        );
      } else if (current.request_type_key === 'UPDATE_PUNCH' || current.request_type_key === 'TOGGLE_ACTIVE') {
        if (!current.target_punch_id) {
          return res.status(400).json({ error: 'No existe target_punch_id para aplicar la aprobacion' });
        }
        const targetResult = await pool.query(
          `
            SELECT id
            FROM public.employee_time_punches
            WHERE id = $1::uuid
              AND tenant_id = $2::uuid
              AND employee_id = $3::uuid
            LIMIT 1
          `,
          [current.target_punch_id, current.tenant_id, current.employee_id]
        );
        if (!targetResult.rows[0]) {
          return res.status(400).json({ error: 'La marcacion objetivo ya no existe para aplicar la aprobacion' });
        }

        const updates: string[] = [];
        const params: any[] = [current.target_punch_id, current.tenant_id, current.employee_id];
        let next = 4;

        if (requestedValues.punch_datetime) {
          updates.push(`punch_datetime = $${next++}::timestamptz`);
          params.push(requestedValues.punch_datetime);
        }
        if (requestedValues.punch_time_zone !== undefined) {
          updates.push(`punch_time_zone = $${next++}`);
          params.push(requestedValues.punch_time_zone || null);
        }
        if (requestedValues.punch_key !== undefined) {
          updates.push(`punch_key = $${next++}::integer`);
          params.push(Math.trunc(Number(requestedValues.punch_key)));
        }
        if (requestedValues.time_clock_device_id !== undefined) {
          updates.push(`time_clock_device_id = $${next++}::uuid`);
          params.push(requestedValues.time_clock_device_id || null);
        }
        if (requestedValues.punch_source_id !== undefined) {
          updates.push(`punch_source_id = $${next++}::uuid`);
          params.push(requestedValues.punch_source_id || null);
        }
        if (requestedValues.time_punch_status_id !== undefined) {
          updates.push(`time_punch_status_id = $${next++}::uuid`);
          params.push(requestedValues.time_punch_status_id || null);
        }
        if (requestedValues.notes !== undefined) {
          updates.push(`notes = $${next++}`);
          params.push(normalizeNullableText(requestedValues.notes));
        }
        if (requestedValues.is_active !== undefined) {
          updates.push(`is_active = $${next++}::boolean`);
          params.push(Boolean(requestedValues.is_active));
        }

        if (updates.length > 0) {
          updates.push(`updated_by = $${next++}`);
          params.push(getActor(req));
          updates.push('updated_at = now()');

          await pool.query(
            `
              UPDATE public.employee_time_punches
              SET ${updates.join(', ')}
              WHERE id = $1::uuid
                AND tenant_id = $2::uuid
                AND employee_id = $3::uuid
            `,
            params
          );
        }
      }
    }

    const finalNotes =
      supervisorNotes ||
      (decision === 'APPROVE' ? 'Aprobada por supervisor' : 'Denegada por supervisor');

    const updated = await pool.query(
      `
        UPDATE public.employee_time_punch_change_requests
        SET
          request_status_id = $3::uuid,
          supervisor_notes = $4,
          approved_by = $5::uuid,
          approved_at = now(),
          updated_by = $6,
          updated_at = now()
        WHERE id = $1::uuid
          AND tenant_id = $2::uuid
        RETURNING *
      `,
      [
        requestId,
        approver.userContext.tenant_id,
        decisionStatusId,
        finalNotes,
        approver.userContext.user_id,
        getActor(req),
      ]
    );

    const notificationTypeId = await resolveLookupValueIdByGroupKeyAndKeys(
      approver.userContext.tenant_id,
      USER_NOTIFICATION_TYPE_GROUP_KEY,
      ['TIME_PUNCH_CHANGE_REQUEST_DECIDED']
    );
    if (notificationTypeId && current.employee_user_id) {
      await pool.query(
        `
          INSERT INTO public.user_notifications (
            id,
            tenant_id,
            user_id,
            notification_type_id,
            title,
            message,
            icon_key,
            ref_table,
            ref_id,
            is_read,
            is_active,
            created_by
          )
          VALUES (
            gen_random_uuid(),
            $1::uuid, $2::uuid, $3::uuid, $4, $5, 'ClipboardCheck',
            'employee_time_punch_change_requests', $6::uuid, false, true, $7
          )
        `,
        [
          approver.userContext.tenant_id,
          current.employee_user_id,
          notificationTypeId,
          decision === 'APPROVE' ? 'Solicitud de marcacion aprobada' : 'Solicitud de marcacion denegada',
          finalNotes,
          requestId,
          getActor(req),
        ]
      );
    }

    return res.status(200).json({ success: true, request: updated.rows[0] || null });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

export default router;


