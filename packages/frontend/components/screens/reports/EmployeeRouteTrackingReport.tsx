'use client';

import { buildApiUrl } from '../../../utils/api-config';
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
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

  const positions = useMemo<LatLngExpression[]>(
    () => points.map((point) => [Number(point.latitud), Number(point.longitud)]),
    [points]
  );
  const routeTrackingCount = points.filter((point) => point.point_type === 'ROUTE_TRACKING').length;
  const attendanceCount = points.filter((point) => point.point_type === 'ATTENDANCE').length;

  return (
    <div className="space-y-4">
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

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {positions.length === 0 ? (
            <div className="flex h-[540px] items-center justify-center text-sm text-slate-500">
              Sin puntos geográficos para el rango seleccionado.
            </div>
          ) : (
            <MapContainer center={positions[0]} zoom={14} className="h-[540px] w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapBounds positions={positions} />
              {positions.length > 1 ? <Polyline positions={positions} pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.75 }} /> : null}
              {points.map((point, index) => (
                <CircleMarker
                  key={`${point.point_type}-${point.id}`}
                  center={[Number(point.latitud), Number(point.longitud)]}
                  radius={index === 0 || index === points.length - 1 ? 8 : 6}
                  pathOptions={{ color: pointColor(point.point_type), fillColor: pointColor(point.point_type), fillOpacity: 0.9 }}
                >
                  <Popup>
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold">{index + 1}. {pointLabel(point)}</p>
                      <p>{formatClientDateTime(point.event_datetime, 'es-EC', point.event_time_zone || undefined)}</p>
                      <p>{point.location_label || 'Sin recinto asociado'}</p>
                      {point.distance_to_nearest_location_meters !== null ? <p>Distancia a recinto: {Math.round(Number(point.distance_to_nearest_location_meters))} m</p> : null}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">{employee ? fullEmployeeName(employee) : 'Detalle de puntos'}</h2>
          <p className="mb-3 text-sm text-slate-500">{employee?.company_name || ''}</p>
          <div className="max-h-[500px] space-y-2 overflow-y-auto pr-1">
            {points.length === 0 ? (
              <p className="rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-500">Sin puntos para mostrar.</p>
            ) : points.map((point, index) => (
              <div key={`${point.point_type}-list-${point.id}`} className="rounded-lg border px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{index + 1}. {pointLabel(point)}</p>
                    <p className="text-xs text-slate-500">{formatClientDateTime(point.event_datetime, 'es-EC', point.event_time_zone || undefined)}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${point.point_type === 'ROUTE_TRACKING' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {point.point_type === 'ROUTE_TRACKING' ? 'Recorrido' : 'Asistencia'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{point.location_label || 'Sin recinto asociado'}</p>
                <p className="text-xs text-slate-500">{Number(point.latitud).toFixed(6)}, {Number(point.longitud).toFixed(6)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
