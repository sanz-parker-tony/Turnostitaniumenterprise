'use client';

import { buildApiUrl } from '../../../utils/api-config';
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import { divIcon } from 'leaflet';
import { MapPinned, RefreshCw, Search } from 'lucide-react';
import { publicApiToken } from '../../../utils/backend/info';
import { formatClientDateTime } from '../../../utils/date-time';

interface EmployeeOption {
  employee_id: string;
  employee_code: string | null;
  employee_name: string | null;
  employee_lastname: string | null;
  company_name: string | null;
  work_location_name: string | null;
  department_name: string | null;
  area_name: string | null;
}

interface RoutePoint {
  id: string;
  point_type: 'ATTENDANCE' | 'ROUTE_TRACKING';
  event_datetime: string;
  event_time_zone: string | null;
  latitud: number;
  longitud: number;
  location_accuracy_meters: number | null;
  event_label: string | null;
  status_label: string | null;
  location_label: string | null;
  distance_to_nearest_location_meters: number | null;
  notes: string | null;
  snapshot_path: string | null;
}

interface NumberedRoutePoint {
  point: RoutePoint;
  sequence: number;
  position: [number, number];
  duplicateCount: number;
}

interface MapFocusTarget {
  position: [number, number];
  sequence: number;
}

function getToken() {
  return localStorage.getItem('tt-access-token') || localStorage.getItem('access_token') || publicApiToken;
}

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fullEmployeeName(employee: EmployeeOption | null | undefined): string {
  if (!employee) return '';
  const name = `${employee.employee_lastname || ''} ${employee.employee_name || ''}`.trim();
  return name || employee.employee_code || employee.employee_id;
}

function pointColor(pointType: RoutePoint['point_type']): string {
  return pointType === 'ROUTE_TRACKING' ? '#2563eb' : '#16a34a';
}

function pointLabel(point: RoutePoint): string {
  return point.point_type === 'ROUTE_TRACKING' ? 'Recorrido' : (point.event_label || 'Asistencia');
}

function coordinateKey(point: RoutePoint): string {
  return `${Number(point.latitud).toFixed(6)},${Number(point.longitud).toFixed(6)}`;
}

function duplicateMarkerOffset(duplicateIndex: number, duplicateCount: number): { x: number; y: number } {
  if (duplicateCount <= 1) return { x: 0, y: 0 };
  const angle = ((Math.PI * 2) / duplicateCount) * duplicateIndex - Math.PI / 2;
  const radius = duplicateCount <= 4 ? 36 : 48;
  return {
    x: Math.round(Math.cos(angle) * radius),
    y: Math.round(Math.sin(angle) * radius),
  };
}

function visualDuplicatePosition(point: RoutePoint, duplicateIndex: number, duplicateCount: number): [number, number] {
  const latitud = Number(point.latitud);
  const longitud = Number(point.longitud);
  if (duplicateCount <= 1) return [latitud, longitud];

  const offset = duplicateMarkerOffset(duplicateIndex, duplicateCount);
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = metersPerDegreeLat * Math.cos((latitud * Math.PI) / 180);
  const metersPerPixel = 6;

  return [
    latitud - (offset.y * metersPerPixel) / metersPerDegreeLat,
    longitud + (offset.x * metersPerPixel) / metersPerDegreeLng,
  ];
}

function numberedPointIcon(point: RoutePoint, sequence: number) {
  const color = pointColor(point.point_type);

  return divIcon({
    className: 'employee-route-numbered-marker',
    html: `
      <div style="
        align-items:center;
        background:${color};
        border:2px solid #ffffff;
        border-radius:9999px;
        box-shadow:0 2px 8px rgba(15,23,42,0.35);
        color:#ffffff;
        display:flex;
        font-size:11px;
        font-weight:700;
        height:28px;
        justify-content:center;
        line-height:1;
        width:28px;
      ">${sequence}</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    tooltipAnchor: [0, -16],
  });
}

function MapBounds({ positions }: { positions: LatLngExpression[] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 16);
      return;
    }
    map.fitBounds(positions as LatLngBoundsExpression, { padding: [28, 28] });
  }, [map, positions]);

  return null;
}

function MapFocusController({ target }: { target: MapFocusTarget | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    const mapMaxZoom = map.getMaxZoom();
    const zoom = Number.isFinite(mapMaxZoom) ? mapMaxZoom : 19;
    map.flyTo(target.position, zoom, { animate: true, duration: 0.8 });
  }, [map, target]);

  return null;
}

function PointDetails({ point, sequence }: { point: RoutePoint; sequence: number }) {
  const contextLabel = point.point_type === 'ROUTE_TRACKING'
    ? 'Fuera de recinto autorizado'
    : point.location_label || 'Sin recinto asociado';
  const statusLabel = point.point_type === 'ROUTE_TRACKING'
    ? point.status_label || 'Punto de recorrido registrado'
    : point.status_label;
  const notesLabel = point.point_type === 'ROUTE_TRACKING'
    ? 'marcación de recorrido'
    : point.notes;

  return (
    <div className="space-y-1 text-xs">
      <p className="font-semibold">{sequence}. {pointLabel(point)}</p>
      <p>{formatClientDateTime(point.event_datetime, 'es-EC', point.event_time_zone || undefined)}</p>
      <p>{contextLabel}</p>
      {statusLabel ? <p>Estado: {statusLabel}</p> : null}
      <p>{Number(point.latitud).toFixed(6)}, {Number(point.longitud).toFixed(6)}</p>
      {notesLabel ? <p>Notas: {notesLabel}</p> : null}
    </div>
  );
}

export default function EmployeeRouteTrackingReport() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState(() => toIsoDate(new Date()));
  const [dateTo, setDateTo] = useState(() => toIsoDate(new Date()));
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [employee, setEmployee] = useState<EmployeeOption | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapFocusTarget, setMapFocusTarget] = useState<MapFocusTarget | null>(null);

  const request = async (path: string) => {
    const response = await fetch(buildApiUrl(path), {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
    return payload;
  };

  const loadEmployees = async (nextSearch = searchTerm) => {
    setLoadingEmployees(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (nextSearch.trim()) query.set('search', nextSearch.trim());
      const payload = await request(`/route-tracking/employees?${query.toString()}`);
      const nextEmployees = (payload?.employees || []) as EmployeeOption[];
      setEmployees(nextEmployees);
      if (!selectedEmployeeId && nextEmployees[0]?.employee_id) {
        setSelectedEmployeeId(nextEmployees[0].employee_id);
      }
    } catch (requestError: any) {
      setEmployees([]);
      setError(requestError?.message || 'No se pudieron cargar empleados');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const loadRoute = async () => {
    if (!selectedEmployeeId) {
      setPoints([]);
      setEmployee(null);
      return;
    }

    setLoadingRoute(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.set('employee_id', selectedEmployeeId);
      query.set('date_from', dateFrom);
      query.set('date_to', dateTo);
      const payload = await request(`/route-tracking/employee-route?${query.toString()}`);
      setEmployee((payload?.employee || null) as EmployeeOption | null);
      setPoints(((payload?.points || []) as RoutePoint[]).filter((point) => Number.isFinite(Number(point.latitud)) && Number.isFinite(Number(point.longitud))));
    } catch (requestError: any) {
      setPoints([]);
      setEmployee(null);
      setError(requestError?.message || 'No se pudo cargar la ruta');
    } finally {
      setLoadingRoute(false);
    }
  };

  useEffect(() => {
    void loadEmployees('');
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) void loadRoute();
  }, [selectedEmployeeId]);

  const numberedPoints = useMemo<NumberedRoutePoint[]>(() => {
    const totals = new Map<string, number>();
    const occurrences = new Map<string, number>();

    points.forEach((point) => {
      const key = coordinateKey(point);
      totals.set(key, (totals.get(key) || 0) + 1);
    });

    return points.map((point, index) => {
      const key = coordinateKey(point);
      const duplicateIndex = occurrences.get(key) || 0;
      occurrences.set(key, duplicateIndex + 1);

      return {
        point,
        sequence: index + 1,
        position: visualDuplicatePosition(point, duplicateIndex, totals.get(key) || 1),
        duplicateCount: totals.get(key) || 1,
      };
    });
  }, [points]);
  const positions = useMemo<LatLngExpression[]>(
    () => numberedPoints.map((point) => point.position),
    [numberedPoints]
  );
  const routeLinePositions = useMemo<LatLngExpression[]>(
    () => numberedPoints.map((point) => point.position),
    [numberedPoints]
  );
  const routeTrackingCount = points.filter((point) => point.point_type === 'ROUTE_TRACKING').length;
  const attendanceCount = points.filter((point) => point.point_type === 'ATTENDANCE').length;

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-0 flex-col gap-4 overflow-hidden">
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <MapPinned className="size-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Ruta recorrida por empleado</h1>
                <p className="text-sm text-slate-600">Une puntos de recorrido y marcaciones de asistencia solo para visualización geográfica.</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
            <div className="rounded-lg border px-3 py-2">
              <p className="text-xs text-slate-500">Puntos</p>
              <p className="font-semibold">{points.length}</p>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <p className="text-xs text-slate-500">Recorrido</p>
              <p className="font-semibold text-blue-700">{routeTrackingCount}</p>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <p className="text-xs text-slate-500">Asistencia</p>
              <p className="font-semibold text-emerald-700">{attendanceCount}</p>
            </div>
          </div>
        </div>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
          <div>
            <label className="text-sm font-medium text-slate-700">Empleado</label>
            <div className="mt-1 flex gap-2">
              <select
                value={selectedEmployeeId}
                onChange={(event) => setSelectedEmployeeId(event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-md border px-3 text-sm"
                disabled={loadingEmployees}
              >
                <option value="">-- Seleccionar --</option>
                {employees.map((row) => (
                  <option key={row.employee_id} value={row.employee_id}>
                    {fullEmployeeName(row)}{row.employee_code ? ` (${row.employee_code})` : ''}
                  </option>
                ))}
              </select>
              <div className="relative w-48">
                <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void loadEmployees();
                  }}
                  placeholder="Buscar"
                  className="h-10 w-full rounded-md border py-2 pl-8 pr-2 text-sm"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void loadRoute()}
              disabled={loadingRoute || !selectedEmployeeId}
              className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${loadingRoute ? 'animate-spin' : ''}`} />
              Consultar
            </button>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="min-h-0 overflow-hidden rounded-xl border bg-white shadow-sm">
          {positions.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Sin puntos geográficos para el rango seleccionado.
            </div>
          ) : (
            <MapContainer center={positions[0]} zoom={14} maxZoom={19} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
              <MapBounds positions={positions} />
              <MapFocusController target={mapFocusTarget} />
              {routeLinePositions.length > 1 ? <Polyline positions={routeLinePositions} pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.75 }} /> : null}
              {numberedPoints.map(({ point, sequence, position, duplicateCount }) => (
                <Marker
                  key={`${point.point_type}-${point.id}`}
                  position={position}
                  icon={numberedPointIcon(point, sequence)}
                >
                  <Tooltip direction="top" opacity={1} sticky>
                    <PointDetails point={point} sequence={sequence} />
                  </Tooltip>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        <div className="flex min-h-0 flex-col rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">{employee ? fullEmployeeName(employee) : 'Detalle de puntos'}</h2>
          <p className="mb-3 text-sm text-slate-500">{employee?.company_name || ''}</p>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {points.length === 0 ? (
              <p className="rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-500">Sin puntos para mostrar.</p>
            ) : numberedPoints.map(({ point, sequence, position, duplicateCount }) => (
              <div
                key={`${point.point_type}-list-${point.id}`}
                role="button"
                tabIndex={0}
                onClick={() => setMapFocusTarget({ position, sequence })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setMapFocusTarget({ position, sequence });
                  }
                }}
                className="cursor-pointer rounded-lg border px-3 py-2 text-left text-sm transition hover:border-blue-300 hover:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-2">
                    <span
                      className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-sm"
                      style={{ backgroundColor: pointColor(point.point_type) }}
                    >
                      {sequence}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{pointLabel(point)}</p>
                      <p className="text-xs text-slate-500">{formatClientDateTime(point.event_datetime, 'es-EC', point.event_time_zone || undefined)}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${point.point_type === 'ROUTE_TRACKING' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {point.point_type === 'ROUTE_TRACKING' ? 'Recorrido' : 'Asistencia'}
                  </span>
                </div>
                {point.point_type === 'ROUTE_TRACKING' ? (
                  <>
                    <p className="mt-1 text-xs text-slate-600">fuera de recinto autorizado</p>
                    <p className="text-xs text-slate-500">{Number(point.latitud).toFixed(6)}, {Number(point.longitud).toFixed(6)}</p>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-xs text-slate-600">{point.location_label || 'Sin recinto asociado'}</p>
                    <p className="text-xs text-slate-500">{Number(point.latitud).toFixed(6)}, {Number(point.longitud).toFixed(6)}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="shrink-0 text-center text-sm text-slate-500">
        Titanium Labs Corp.&trade; 2026 &copy; | Todos los derechos reservados
      </footer>
    </div>
  );
}
