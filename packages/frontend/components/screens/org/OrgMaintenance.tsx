'use client';

import { buildApiUrl } from '../../../utils/api-config';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Plus, Save, X, Pencil, Power, Search, Trash2 } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { publicApiToken } from '../../../utils/backend/info';
import SystemAdminPageHeader from '../../shared/SystemAdminPageHeader';
import HeaderInfoTips from '../../shared/HeaderInfoTips';
import HeaderRefreshButton from '../../shared/HeaderRefreshButton';
import GridActionIconButton from '../../shared/GridActionIconButton';

type EntityKey =
  | 'companies'
  | 'work-locations'
  | 'departments'
  | 'areas'
  | 'cost-centers'
  | 'payroll-groups'
  | 'employees'
  | 'employee-profiles'
  | 'job-titles'
  | 'work-groups'
  | 'shifts'
  | 'employee-companies';

interface OrgMaintenanceProps {
  initialEntity?: EntityKey;
  hideEntityTabs?: boolean;
  hideTopHeader?: boolean;
  pageTitle?: string;
  pageDescription?: string;
}

type FieldType = 'text' | 'number' | 'date' | 'time' | 'boolean' | 'select';

interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  optionsKey?: string;
  defaultValue?: any;
}

interface EntityConfig {
  key: EntityKey;
  title: string;
  description: string;
  fields: FieldConfig[];
  tableColumns: string[];
}

interface EmployeePhotoStorageInfo {
  configured_value: string;
  source: 'TENANT' | 'SYSTEM' | 'FALLBACK';
  absolute_path: string;
  validation_rules?: EmployeePhotoValidationRules;
  validation_sources?: Record<string, 'TENANT' | 'SYSTEM' | 'FALLBACK'>;
}

interface EmployeePhotoValidationRules {
  max_file_size_bytes: number;
  min_width: number;
  min_height: number;
  max_width: number;
  max_height: number;
  min_aspect_ratio: number;
  max_aspect_ratio: number;
}

interface GeoPoint {
  lat: number;
  lng: number;
}

type ApiErrorWithMeta = Error & { code?: string; details?: string };

const SHIFT_ICON_OPTIONS = [
  { id: 'Sun', label: 'Sol (Manana)' },
  { id: 'Sunset', label: 'Atardecer' },
  { id: 'Moon', label: 'Cuarto de luna' },
  { id: 'Coffee', label: 'Taza caliente' },
  { id: 'Briefcase', label: 'Maletin / Oficina' },
];

const STATIC_CATALOGS: Record<string, any[]> = {
  shift_icons: SHIFT_ICON_OPTIONS,
};

const FALLBACK_EMPLOYEE_PHOTO_RULES: EmployeePhotoValidationRules = {
  max_file_size_bytes: 5 * 1024 * 1024,
  min_width: 450,
  min_height: 600,
  max_width: 2000,
  max_height: 2600,
  min_aspect_ratio: 0.68,
  max_aspect_ratio: 0.82,
};

function parseGeofencePoints(rawValue: any): GeoPoint[] {
  if (!rawValue) return [];

  let parsed: any = rawValue;
  if (typeof rawValue === 'string') {
    try {
      parsed = JSON.parse(rawValue);
    } catch {
      return [];
    }
  }

  if (!parsed || typeof parsed !== 'object') return [];

  const readRing = (ring: any[]): GeoPoint[] =>
    ring
      .map((pair) => ({
        lng: Number(pair?.[0]),
        lat: Number(pair?.[1]),
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

  if (parsed.type === 'Polygon' && Array.isArray(parsed.coordinates?.[0])) {
    const ring = readRing(parsed.coordinates[0]);
    if (ring.length >= 2) {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first.lat === last.lat && first.lng === last.lng) {
        return ring.slice(0, -1);
      }
    }
    return ring;
  }

  if (parsed.type === 'MultiPolygon' && Array.isArray(parsed.coordinates?.[0]?.[0])) {
    const ring = readRing(parsed.coordinates[0][0]);
    if (ring.length >= 2) {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first.lat === last.lat && first.lng === last.lng) {
        return ring.slice(0, -1);
      }
    }
    return ring;
  }

  return [];
}

function toGeofenceGeoJson(points: GeoPoint[]) {
  if (points.length < 3) return null;
  const closedRing = [...points, points[0]].map((p) => [Number(p.lng.toFixed(6)), Number(p.lat.toFixed(6))]);
  return {
    type: 'Polygon',
    coordinates: [closedRing],
  };
}

function PolygonMapClickCapture({ onAddPoint }: { onAddPoint: (point: GeoPoint) => void }) {
  useMapEvents({
    click(event) {
      onAddPoint({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });
  return null;
}

function PolygonMapAutoFit({ points }: { points: GeoPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    const bounds = points.map((p) => [p.lat, p.lng] as [number, number]);
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, points]);
  return null;
}

function PolygonMapViewController({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom]);
  return null;
}

function PolygonMapResizeInvalidator() {
  const map = useMap();
  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 120);
    return () => window.clearTimeout(timer);
  }, [map]);
  return null;
}

function PolygonEditorField({
  value,
  onChange,
  large = false,
  locationSearchQuery = '',
  locationSearchCountryCode = '',
}: {
  value: any;
  onChange: (next: any) => void;
  large?: boolean;
  locationSearchQuery?: string;
  locationSearchCountryCode?: string;
}) {
  const [points, setPoints] = useState<GeoPoint[]>(() => parseGeofencePoints(value));
  const [center, setCenter] = useState<LatLngExpression>([-2.17, -79.92]);
  const [zoom, setZoom] = useState(16);
  const [mapSearchTerm, setMapSearchTerm] = useState('');
  const [mapSearchLoading, setMapSearchLoading] = useState(false);
  const [mapSearchError, setMapSearchError] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState<
    Array<{ display_name: string; lat: string; lon: string }>
  >([]);
  const [showMapSearchResults, setShowMapSearchResults] = useState(false);
  const lastAutoCenterQueryRef = useRef('');

  useEffect(() => {
    const nextPoints = parseGeofencePoints(value);
    setPoints(nextPoints);
    if (nextPoints.length > 0) {
      const avgLat = nextPoints.reduce((acc, p) => acc + p.lat, 0) / nextPoints.length;
      const avgLng = nextPoints.reduce((acc, p) => acc + p.lng, 0) / nextPoints.length;
      setCenter([avgLat, avgLng]);
    }
  }, [value]);

  const commitPoints = (nextPoints: GeoPoint[]) => {
    setPoints(nextPoints);
    onChange(toGeofenceGeoJson(nextPoints));
  };

  const centerFromSearchResult = (
    row: { display_name: string; lat: string; lon: string },
    nextZoom = 18
  ) => {
    const lat = Number(row.lat);
    const lng = Number(row.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    setCenter([lat, lng]);
    setZoom(nextZoom);
    return true;
  };

  const searchMapLocation = async (query: string, limit = 8) => {
    const params = new URLSearchParams({
      format: 'json',
      limit: String(limit),
      q: query,
    });
    const countryCode = locationSearchCountryCode.trim().toLowerCase();
    if (countryCode) {
      params.set('countrycodes', countryCode);
    }

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    return Array.isArray(payload) ? payload : [];
  };

  const handleMapSearch = async () => {
    const query = mapSearchTerm.trim();
    if (!query) {
      setMapSearchResults([]);
      setMapSearchError('');
      return;
    }

    setMapSearchLoading(true);
    setMapSearchError('');
    try {
      const rows = await searchMapLocation(query);
      setMapSearchResults(rows);
      setShowMapSearchResults(rows.length > 0);

      if (rows.length > 0) {
        centerFromSearchResult(rows[0], 18);
      }
    } catch (error: any) {
      setMapSearchResults([]);
      setMapSearchError(error?.message || 'No se pudo consultar el mapa');
    } finally {
      setMapSearchLoading(false);
    }
  };

  const applySearchResult = (row: { display_name: string; lat: string; lon: string }) => {
    if (!centerFromSearchResult(row, 19)) return;
    setShowMapSearchResults(false);
  };

  const centerOnLocationContext = async () => {
    const query = locationSearchQuery.trim();
    if (!query) {
      setMapSearchError('Seleccione país, provincia, ciudad o ingrese una dirección');
      return;
    }

    setMapSearchTerm(query);
    setMapSearchLoading(true);
    setMapSearchError('');
    try {
      const rows = await searchMapLocation(query, 5);
      setMapSearchResults(rows);
      setShowMapSearchResults(rows.length > 1);
      if (rows.length === 0 || !centerFromSearchResult(rows[0], 18)) {
        setMapSearchError('No se encontró una ubicación cercana con esos datos');
      }
    } catch (error: any) {
      setMapSearchResults([]);
      setMapSearchError(error?.message || 'No se pudo consultar el mapa');
    } finally {
      setMapSearchLoading(false);
    }
  };

  useEffect(() => {
    const query = locationSearchQuery.trim();
    if (!query || points.length > 0 || lastAutoCenterQueryRef.current === query) return;

    const timer = window.setTimeout(() => {
      lastAutoCenterQueryRef.current = query;
      void centerOnLocationContext();
    }, 700);

    return () => window.clearTimeout(timer);
  }, [locationSearchQuery, points.length]);

  const polygonPositions = points.map((point) => [point.lat, point.lng] as [number, number]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <input
          type="text"
          value={mapSearchTerm}
          onChange={(event) => setMapSearchTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleMapSearch();
            }
          }}
          placeholder="Buscar en mapa por nombre (ej. Plastigama Duran)"
          className="w-full border rounded px-2 py-1.5 text-sm bg-white"
        />
        <button
          type="button"
          className="w-full sm:w-auto px-3 py-2 text-sm border rounded bg-white hover:bg-gray-50 disabled:opacity-60"
          onClick={() => void handleMapSearch()}
          disabled={mapSearchLoading}
        >
          {mapSearchLoading ? 'Buscando...' : 'Buscar lugar'}
        </button>
      </div>

      {mapSearchError ? (
        <div className="text-xs text-red-600">{mapSearchError}</div>
      ) : null}

      {mapSearchResults.length > 0 ? (
        <div className="rounded border bg-white">
          <button
            type="button"
            onClick={() => setShowMapSearchResults((prev) => !prev)}
            className="w-full px-2 py-1.5 text-left text-xs bg-gray-50 hover:bg-gray-100"
          >
            {showMapSearchResults ? 'Ocultar resultados' : 'Mostrar resultados'} ({mapSearchResults.length})
          </button>
          {showMapSearchResults ? (
            <div className="max-h-28 overflow-auto">
              {mapSearchResults.map((row, idx) => (
                <button
                  key={`${row.lat}-${row.lon}-${idx}`}
                  type="button"
                  onClick={() => applySearchResult(row)}
                  className="block w-full text-left text-xs px-2 py-1.5 hover:bg-sky-50 border-t"
                >
                  {row.display_name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          className="w-full px-2 py-2 text-sm border rounded bg-white hover:bg-gray-50"
          onClick={() => commitPoints(points.slice(0, -1))}
          disabled={points.length === 0}
        >
          Deshacer vertice
        </button>
        <button
          type="button"
          className="w-full px-2 py-2 text-sm border rounded bg-white hover:bg-gray-50"
          onClick={() => commitPoints([])}
          disabled={points.length === 0}
        >
          Limpiar
        </button>
        <button
          type="button"
          className="w-full px-2 py-2 text-sm border rounded bg-white hover:bg-gray-50"
          onClick={() => void centerOnLocationContext()}
          disabled={mapSearchLoading || !locationSearchQuery.trim()}
        >
          Centrar en direccion
        </button>
      </div>

      <div className="text-xs text-gray-600">
        Clic sobre el mapa OpenStreetMap para agregar vertices. Vertices: {points.length}
      </div>

      <div className={large ? 'space-y-3' : 'grid grid-cols-1 lg:grid-cols-3 gap-3'}>
        <div className={`${large ? '' : 'lg:col-span-2'} rounded-md border bg-white overflow-hidden`}>
          <MapContainer
            center={center}
            zoom={zoom}
            className={large ? 'h-[58vh] min-h-[520px] w-full' : 'h-[320px] w-full'}
            maxZoom={22}
            minZoom={3}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxNativeZoom={19}
              maxZoom={22}
            />
            <PolygonMapResizeInvalidator />
            <PolygonMapViewController center={center} zoom={zoom} />
            <PolygonMapClickCapture onAddPoint={(point) => commitPoints([...points, point])} />
            <PolygonMapAutoFit points={points} />
            {polygonPositions.length >= 2 && (
              <Polygon
                positions={polygonPositions}
                pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.22, weight: 3 }}
              />
            )}
            {points.map((point, idx) => (
              <CircleMarker
                key={`${point.lat}-${point.lng}-${idx}`}
                center={[point.lat, point.lng]}
                radius={6}
                pathOptions={{ color: '#1d4ed8', fillColor: '#1d4ed8', fillOpacity: 1, weight: 2 }}
              />
            ))}
          </MapContainer>
        </div>

        {large ? (
          <details className="rounded-md border bg-white">
            <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Ver GeoJSON del poligono
            </summary>
            <textarea
              value={JSON.stringify(toGeofenceGeoJson(points), null, 2) || 'null'}
              readOnly
              className="h-[140px] w-full border-0 border-t px-2 py-1.5 text-xs bg-gray-50 font-mono resize-none"
              placeholder="GeoJSON del poligono"
            />
          </details>
        ) : (
          <textarea
            value={JSON.stringify(toGeofenceGeoJson(points), null, 2) || 'null'}
            readOnly
            className="h-[320px] w-full border rounded px-2 py-1.5 text-xs bg-gray-50 font-mono resize-none"
            placeholder="GeoJSON del poligono"
          />
        )}
      </div>
    </div>
  );
}

function getToken() {
  return (
    localStorage.getItem('tt-access-token') ||
    localStorage.getItem('access_token') ||
    publicApiToken
  );
}

function getAlternateToken(currentToken: string) {
  const primary = localStorage.getItem('tt-access-token') || '';
  const secondary = localStorage.getItem('access_token') || '';
  if (primary && primary !== currentToken) return primary;
  if (secondary && secondary !== currentToken) return secondary;
  return '';
}

const ENTITY_CONFIGS: EntityConfig[] = [
  {
    key: 'companies',
    title: 'Empresa',
    description: 'Gestión de empresas del tenant',
    fields: [
      { key: 'company_name', label: 'Nombre', type: 'text', required: true },
      { key: 'company_short_name', label: 'Nombre corto', type: 'text', required: true },
      { key: 'company_code', label: 'Código', type: 'text', required: true },
      { key: 'company_address_line1', label: 'Dirección 1', type: 'text' },
      { key: 'company_address_line2', label: 'Dirección 2', type: 'text' },
      { key: 'company_country_id', label: 'País', type: 'select', optionsKey: 'countries' },
      { key: 'company_state_id', label: 'Provincia/Estado', type: 'select', optionsKey: 'states' },
      { key: 'company_city_id', label: 'Ciudad', type: 'select', optionsKey: 'cities' },
      { key: 'company_postal_code', label: 'Código postal', type: 'text' },
      { key: 'company_phone', label: 'Teléfono', type: 'text' },
      { key: 'is_active', label: 'Activo', type: 'boolean' },
    ],
    tableColumns: ['company_code', 'company_name', 'company_short_name', 'company_phone', 'is_active'],
  },
  {
    key: 'work-locations',
    title: 'Work Locations',
    description: 'Gestión de localizaciones de trabajo',
    fields: [
      { key: 'company_id', label: 'Empresa', type: 'select', required: true, optionsKey: 'companies' },
      { key: 'work_location_name', label: 'Nombre', type: 'text', required: true },
      { key: 'work_location_short_name', label: 'Nombre corto', type: 'text', required: true },
      { key: 'work_location_code', label: 'Código', type: 'text', required: true },
      { key: 'country_id', label: 'País', type: 'select', optionsKey: 'countries' },
      { key: 'state_id', label: 'Provincia/Estado', type: 'select', optionsKey: 'states' },
      { key: 'city_id', label: 'Ciudad', type: 'select', optionsKey: 'cities' },
      { key: 'address_line1', label: 'Dirección', type: 'text' },
      { key: 'time_zone', label: 'Zona horaria', type: 'select', optionsKey: 'attendance_timezones' },
      { key: 'is_active', label: 'Activo', type: 'boolean' },
      { key: 'geofence_polygon', label: 'Poligono (GeoJSON)', type: 'text' },
    ],
    tableColumns: ['work_location_code', 'work_location_name', 'company_id', 'country_id', 'state_id', 'city_id', 'time_zone', 'geofence_polygon', 'is_active'],
  },
  {
    key: 'departments',
    title: 'Departments',
    description: 'Primer nivel de jerarquía',
    fields: [
      { key: 'department_name', label: 'Nombre', type: 'text', required: true },
      { key: 'department_short_name', label: 'Nombre corto', type: 'text', required: true },
      { key: 'department_code', label: 'Código', type: 'text', required: true },
      { key: 'is_active', label: 'Activo', type: 'boolean' },
    ],
    tableColumns: ['department_code', 'department_name', 'department_short_name', 'is_active'],
  },
  {
    key: 'areas',
    title: 'Areas',
    description: 'Segundo nivel de jerarquía',
    fields: [
      { key: 'area_name', label: 'Nombre', type: 'text', required: true },
      { key: 'area_short_name', label: 'Nombre corto', type: 'text', required: true },
      { key: 'area_code', label: 'Código', type: 'text', required: true },
      { key: 'payroll_group_id', label: 'Grupo de nómina', type: 'select', optionsKey: 'payroll_groups' },
      { key: 'is_active', label: 'Activo', type: 'boolean' },
    ],
    tableColumns: ['area_code', 'area_name', 'area_short_name', 'payroll_group_id', 'is_active'],
  },
  {
    key: 'cost-centers',
    title: 'Cost Centers',
    description: 'Centros de costo',
    fields: [
      { key: 'cost_center_name', label: 'Nombre', type: 'text', required: true },
      { key: 'cost_center_short_name', label: 'Nombre corto', type: 'text', required: true },
      { key: 'cost_center_code', label: 'Código', type: 'text', required: true },
      { key: 'homologation_code', label: 'Código homologación', type: 'text' },
      { key: 'gl_account_code', label: 'Cuenta GL', type: 'text' },
      { key: 'is_active', label: 'Activo', type: 'boolean' },
    ],
    tableColumns: ['cost_center_code', 'cost_center_name', 'homologation_code', 'gl_account_code', 'is_active'],
  },
  {
    key: 'payroll-groups',
    title: 'Payroll Groups',
    description: 'Grupos de nómina',
    fields: [
      { key: 'payroll_group_name', label: 'Nombre', type: 'text', required: true },
      { key: 'payroll_group_short_name', label: 'Nombre corto', type: 'text', required: true },
      { key: 'payroll_group_code', label: 'Código', type: 'text', required: true },
      { key: 'is_active', label: 'Activo', type: 'boolean' },
    ],
    tableColumns: ['payroll_group_code', 'payroll_group_name', 'payroll_group_short_name', 'is_active'],
  },
  {
    key: 'employees',
    title: 'Employees',
    description: 'Datos personales de empleados',
    fields: [
      { key: 'employee_code', label: 'Codigo empleado', type: 'text', required: true },
      { key: 'employee_lastname', label: 'Apellidos', type: 'text', required: true },
      { key: 'employee_name', label: 'Nombres', type: 'text', required: true },
      { key: 'employee_birthday', label: 'Fecha nacimiento', type: 'date' },
      { key: 'employee_gender_id', label: 'Genero', type: 'select', optionsKey: 'genders' },
      { key: 'employee_is_model', label: 'Empleado modelo', type: 'boolean', defaultValue: false },
      { key: 'employee_observations', label: 'Observaciones', type: 'text' },
      { key: 'employee_photo_path', label: 'Ruta foto', type: 'text' },
      { key: 'is_active', label: 'Activo', type: 'boolean', defaultValue: true },
    ],
    tableColumns: ['employee_code', 'employee_lastname', 'employee_name', 'employee_birthday', 'employee_gender_id', 'employee_is_model', 'is_active'],
  },
  {
    key: 'employee-profiles',
    title: 'Employee Profiles',
    description: 'Perfiles de empleado',
    fields: [
      { key: 'profile_name', label: 'Nombre', type: 'text', required: true },
      { key: 'profile_short_name', label: 'Nombre corto', type: 'text', required: true },
      { key: 'employee_profile_code', label: 'Código', type: 'text', required: true },
      { key: 'is_active', label: 'Activo', type: 'boolean' },
    ],
    tableColumns: ['employee_profile_code', 'profile_name', 'profile_short_name', 'is_active'],
  },
  {
    key: 'job-titles',
    title: 'Job Titles',
    description: 'Cargos organizacionales',
    fields: [
      { key: 'job_title_name', label: 'Nombre', type: 'text', required: true },
      { key: 'job_title_short_name', label: 'Nombre corto', type: 'text', required: true },
      { key: 'job_title_code', label: 'Código', type: 'text', required: true },
      { key: 'is_active', label: 'Activo', type: 'boolean' },
    ],
    tableColumns: ['job_title_code', 'job_title_name', 'job_title_short_name', 'is_active'],
  },
  {
    key: 'work-groups',
    title: 'Work Groups',
    description: 'Grupos de trabajo',
    fields: [
      { key: 'work_group_name', label: 'Nombre', type: 'text', required: true },
      { key: 'work_group_short_name', label: 'Nombre corto', type: 'text', required: true },
      { key: 'work_group_code', label: 'Código', type: 'text', required: true },
      { key: 'payroll_group_id', label: 'Grupo de nómina', type: 'select', optionsKey: 'payroll_groups' },
      { key: 'is_active', label: 'Activo', type: 'boolean' },
    ],
    tableColumns: ['work_group_code', 'work_group_name', 'work_group_short_name', 'payroll_group_id', 'is_active'],
  },
  {
    key: 'shifts',
    title: 'Horarios',
    description: 'Gestion de horarios y turnos de trabajo',
    fields: [
      { key: 'company_id', label: 'Empresa', type: 'select', required: true, optionsKey: 'companies' },
      { key: 'payroll_group_id', label: 'Grupo de nomina', type: 'select', optionsKey: 'payroll_groups' },
      { key: 'shift_name', label: 'Nombre del horario', type: 'text', required: true },
      { key: 'shift_short_name', label: 'Nombre corto', type: 'text', required: true },
      { key: 'shift_icon_key', label: 'Icono', type: 'select', optionsKey: 'shift_icons', required: true, defaultValue: 'Sun' },
      { key: 'start_time', label: 'Hora inicio', type: 'time', required: true },
      { key: 'work_minutes', label: 'Minutos trabajo', type: 'number', required: true },
      { key: 'lunch_minutes', label: 'Minutos almuerzo', type: 'number', required: true, defaultValue: 0 },
      { key: 'entry_grace_minutes', label: 'Tolerancia entrada (min)', type: 'number', required: true, defaultValue: 0 },
      { key: 'exit_grace_minutes', label: 'Tolerancia salida (min)', type: 'number', required: true, defaultValue: 0 },
      { key: 'is_active', label: 'Activo', type: 'boolean', defaultValue: true },
    ],
    tableColumns: ['shift_short_name', 'shift_name', 'shift_icon_key', 'company_id', 'start_time', 'work_minutes', 'lunch_minutes', 'entry_grace_minutes', 'exit_grace_minutes', 'is_active'],
  },
  {
    key: 'employee-companies',
    title: 'Employee Companies',
    description: 'Asignaciones laborales por compañía',
    fields: [
      { key: 'employee_id', label: 'Empleado', type: 'select', required: true, optionsKey: 'employees' },
      { key: 'company_id', label: 'Empresa', type: 'select', required: true, optionsKey: 'companies' },
      { key: 'employee_profile_id', label: 'Perfil', type: 'select', optionsKey: 'employee_profiles' },
      { key: 'work_group_id', label: 'Grupo trabajo', type: 'select', optionsKey: 'work_groups' },
      { key: 'work_location_id', label: 'Localización', type: 'select', optionsKey: 'work_locations' },
      { key: 'department_id', label: 'Departamento', type: 'select', optionsKey: 'departments' },
      { key: 'area_id', label: 'Área', type: 'select', optionsKey: 'areas' },
      { key: 'cost_center_id', label: 'Centro costo', type: 'select', optionsKey: 'cost_centers' },
      { key: 'payroll_group_id', label: 'Grupo nómina', type: 'select', optionsKey: 'payroll_groups' },
      { key: 'contract_type_id', label: 'Tipo contrato', type: 'select', optionsKey: 'contract_types' },
      { key: 'salary_amount', label: 'Salario', type: 'number' },
      { key: 'hire_date', label: 'Fecha ingreso', type: 'date' },
      { key: 'termination_date', label: 'Fecha salida', type: 'date' },
      { key: 'work_on_holidays', label: 'Trabaja feriados', type: 'boolean' },
      { key: 'is_active', label: 'Activo', type: 'boolean' },
    ],
    tableColumns: ['employee_id', 'company_id', 'department_id', 'area_id', 'payroll_group_id', 'employee_profile_id', 'is_active'],
  },
];

export function OrgMaintenance({
  initialEntity = 'companies',
  hideEntityTabs = false,
  hideTopHeader = false,
  pageTitle,
  pageDescription,
}: OrgMaintenanceProps) {
  const [entity, setEntity] = useState<EntityKey>(initialEntity);
  const [items, setItems] = useState<any[]>([]);
  const [catalogs, setCatalogs] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [photoRules, setPhotoRules] = useState<EmployeePhotoValidationRules>(FALLBACK_EMPLOYEE_PHOTO_RULES);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);

  const config = useMemo(
    () => ENTITY_CONFIGS.find((entry) => entry.key === entity) || ENTITY_CONFIGS[0],
    [entity]
  );

  useEffect(() => {
    setEntity(initialEntity);
  }, [initialEntity]);

  const request = async (path: string, init?: RequestInit) => {
    const callWithToken = async (token: string) => {
      try {
        return await fetch(buildApiUrl(`${path}`), {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...(init?.headers || {}),
          },
        });
      } catch (networkErr: any) {
        const err = new Error(
          'Error de conexion con backend (Failed to fetch). Verifique que el backend este activo y que el payload no exceda el limite configurado.'
        ) as ApiErrorWithMeta;
        err.code = 'NETWORK_FETCH_ERROR';
        err.details = networkErr?.message || null;
        throw err;
      }
    };

    const primaryToken = getToken();
    let response: Response;
    response = await callWithToken(primaryToken);
    if (response.status === 401) {
      const alternateToken = getAlternateToken(primaryToken);
      if (alternateToken) {
        response = await callWithToken(alternateToken);
      }
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const apiError = new Error(payload?.error || `HTTP ${response.status}`) as ApiErrorWithMeta;
      apiError.code = payload?.error_code;
      apiError.details = payload?.details;
      throw apiError;
    }

    return payload;
  };

  const createPhotoValidationError = (message: string): ApiErrorWithMeta => {
    const err = new Error(message) as ApiErrorWithMeta;
    err.code = 'PHOTO_DIMENSIONS_INVALID';
    return err;
  };

  const formatPhotoUploadError = (rawError: any): string => {
    const err = rawError as ApiErrorWithMeta;
    const code = String(err?.code || '').toUpperCase();

    if (code === 'PHOTO_TOO_LARGE') return `Error por peso: ${err.message}`;
    if (code === 'PHOTO_DIMENSIONS_INVALID') return err.message || 'Error por tamano de imagen.';
    if (code === 'PHOTO_PERMISSION_DENIED') {
      return `Error por permiso de carpeta destino: ${err.message}${
        err.details ? ` Detalle: ${err.details}` : ''
      }`;
    }
    if (code === 'PHOTO_INVALID_FORMAT') return 'Error de formato: use JPG, PNG o WEBP.';
    if (code === 'NETWORK_FETCH_ERROR') return `${err.message}${err.details ? ` Detalle: ${err.details}` : ''}`;
    if (code === 'PHOTO_STORAGE_ERROR') {
      return `Error de almacenamiento en carpeta destino: ${err.message}${
        err.details ? ` Detalle: ${err.details}` : ''
      }`;
    }
    return err?.message || 'Error cargando la foto';
  };

  const setPhotoPreview = (nextUrl: string) => {
    setPhotoPreviewUrl((prev) => {
      if (prev && prev.startsWith('blob:') && prev !== nextUrl) {
        URL.revokeObjectURL(prev);
      }
      return nextUrl;
    });
  };

  const clearPhotoPreview = () => {
    setPhotoPreview('');
  };

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsDataURL(file);
    });

  const normalizeDateInputValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().slice(0, 10);
  };

  const getImageDimensions = (file: File) =>
    new Promise<{ width: number; height: number }>((resolve, reject) => {
      const localUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const width = image.naturalWidth;
        const height = image.naturalHeight;
        URL.revokeObjectURL(localUrl);
        resolve({ width, height });
      };
      image.onerror = () => {
        URL.revokeObjectURL(localUrl);
        reject(new Error('No se pudo leer la resolución de la imagen'));
      };
      image.src = localUrl;
    });

  const loadEmployeePhotoPreview = async (employeeId: string, photoPath?: string) => {
    if (!employeeId || !photoPath) {
      clearPhotoPreview();
      return;
    }

    try {
      const response = await fetch(buildApiUrl(`/organization/employees/${employeeId}/photo`), {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        clearPhotoPreview();
        return;
      }

      const imageBlob = await response.blob();
      if (!imageBlob.size) {
        clearPhotoPreview();
        return;
      }

      const objectUrl = URL.createObjectURL(imageBlob);
      setPhotoPreview(objectUrl);
    } catch (err) {
      console.error('Error cargando preview de foto del empleado:', err);
      clearPhotoPreview();
    }
  };

  const CATALOG_ENTITY_PATHS: Record<string, string> = {
    companies: 'companies',
    departments: 'departments',
    areas: 'areas',
    cost_centers: 'cost-centers',
    payroll_groups: 'payroll-groups',
    employees: 'employees',
    employee_profiles: 'employee-profiles',
    work_groups: 'work-groups',
    work_locations: 'work-locations',
    job_titles: 'job-titles',
  };

  const LOOKUP_GROUP_BY_OPTIONS_KEY: Record<string, string> = {
    contract_types: 'CONTRACT_TYPE',
    genders: 'GENDER',
    attendance_timezones: 'ATTENDANCE_TIMEZONE',
    countries: 'COUNTRY',
    states: 'STATE',
    cities: 'CITY',
  };

  const getRequiredCatalogKeys = () => {
    return Array.from(
      new Set(
        config.fields
          .filter((field) => field.type === 'select' && field.optionsKey)
          .map((field) => field.optionsKey as string)
      )
    );
  };

  const isGeoCatalogKey = (key: string) => key === 'countries' || key === 'states' || key === 'cities';

  const shouldUseTableGeoCatalogs = entity === 'companies' || entity === 'work-locations';

  const loadCatalogsByEntityFallback = async () => {
    const keys = getRequiredCatalogKeys();
    const entityKeys = keys.filter((key) => key in CATALOG_ENTITY_PATHS);
    const lookupKeys = keys.filter((key) =>
      key in LOOKUP_GROUP_BY_OPTIONS_KEY && !(shouldUseTableGeoCatalogs && isGeoCatalogKey(key))
    );

    if (entityKeys.length === 0 && lookupKeys.length === 0) return;

    const entityResults = await Promise.all(
      entityKeys.map(async (key) => {
        const entityPath = CATALOG_ENTITY_PATHS[key];
        const payload = await request(`/organization/${entityPath}?active_only=true`);
        return [key, payload.items || []] as const;
      })
    );

    const lookupResults = await Promise.all(
      lookupKeys.map(async (key) => {
        const groupKey = LOOKUP_GROUP_BY_OPTIONS_KEY[key];
        const payload = await request(`/lookup-values?group=${groupKey}`);
        const values = (payload.values || []).filter((value: any) => value?.is_active !== false);
        return [key, values] as const;
      })
    );

    const catalogsByKey = {
      ...Object.fromEntries([...entityResults, ...lookupResults]),
      ...STATIC_CATALOGS,
    };
    setCatalogs((prev) => ({
      ...prev,
      ...catalogsByKey,
    }));

    if (entity === 'shifts') {
      try {
        const payload = await request('/organization/employee-companies?active_only=true');
        const employeeCompanies = payload.items || [];
        const companies = (catalogsByKey.companies || []) as any[];
        const payrollGroups = (catalogsByKey.payroll_groups || []) as any[];

        const companyById = new Map<string, any>();
        companies.forEach((company: any) => {
          if (company?.id) companyById.set(company.id, company);
        });

        const payrollGroupById = new Map<string, any>();
        payrollGroups.forEach((group: any) => {
          if (group?.id) payrollGroupById.set(group.id, group);
        });

        const combinationsMap = new Map<string, any>();
        employeeCompanies.forEach((row: any) => {
          if (!row?.company_id) return;
          const company = companyById.get(row.company_id);
          if (!company?.id) return;

          const payrollGroup = row.payroll_group_id ? payrollGroupById.get(row.payroll_group_id) : null;
          const comboKey = `${company.id}::${payrollGroup?.id || 'NULL'}`;
          if (!combinationsMap.has(comboKey)) {
            combinationsMap.set(comboKey, {
              company_id: company.id,
              company_code: company.company_code || null,
              company_name: company.company_name || null,
              payroll_group_id: payrollGroup?.id || null,
              payroll_group_code: payrollGroup?.payroll_group_code || null,
              payroll_group_name: payrollGroup?.payroll_group_name || null,
            });
          }
        });

        setCatalogs((prev) => ({
          ...prev,
          employee_company_combinations: Array.from(combinationsMap.values()),
        }));
      } catch (comboFallbackErr) {
        console.error('Error construyendo combinaciones employee_companies en fallback:', comboFallbackErr);
      }
    }
  };

  const loadGeoCatalogsFallback = async () => {
    const payload = await request('/organization/holidays/location-catalogs');
    const geoCatalogs = payload?.catalogs || {};
    setCatalogs((prev) => ({
      ...prev,
      countries: geoCatalogs.countries || prev.countries || [],
      states: geoCatalogs.states || prev.states || [],
      cities: geoCatalogs.cities || prev.cities || [],
    }));
  };

  const loadCatalogs = async () => {
    try {
      const payload = await request('/organization/catalogs');
      const catalogs = {
        ...(payload.catalogs || {}),
        ...STATIC_CATALOGS,
      };
      setCatalogs(catalogs);

      const requiredKeys = getRequiredCatalogKeys();
      const missingRequired = requiredKeys.some((key) => !(key in catalogs));
      if (missingRequired) {
        await loadCatalogsByEntityFallback();
      }

      if (shouldUseTableGeoCatalogs) {
        const geoEmpty =
          !Array.isArray(catalogs.countries) || catalogs.countries.length === 0 ||
          !Array.isArray(catalogs.states) || catalogs.states.length === 0 ||
          !Array.isArray(catalogs.cities) || catalogs.cities.length === 0;
        if (geoEmpty) {
          await loadGeoCatalogsFallback();
        }
      }
    } catch (err: any) {
      console.error('Error cargando catálogos ORG:', err);
      try {
        await loadCatalogsByEntityFallback();
        if (shouldUseTableGeoCatalogs) {
          await loadGeoCatalogsFallback();
        }
      } catch (fallbackErr) {
        console.error('Error cargando catálogos por fallback:', fallbackErr);
      }
    }
  };

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await request(`/organization/${entity}`);
      setItems(payload.items || []);
    } catch (err: any) {
      setError(err.message || 'Error cargando registros');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogs();
  }, [entity]);

  const loadEmployeePhotoRules = async () => {
    if (entity !== 'employees') return;
    try {
      const payload = (await request('/organization/employees/photo-storage')) as EmployeePhotoStorageInfo;
      const effectiveRules: EmployeePhotoValidationRules = {
        ...FALLBACK_EMPLOYEE_PHOTO_RULES,
        ...(payload.validation_rules || {}),
      };
      setPhotoRules(effectiveRules);
    } catch (err) {
      console.error('Error cargando reglas de fotos:', err);
    }
  };

  const validateEmployeePhotoFile = async (file: File) => {
    if (file.size > photoRules.max_file_size_bytes) {
      const err = new Error(
        `Error por peso: la foto supera ${Math.round(photoRules.max_file_size_bytes / (1024 * 1024))} MB.`
      ) as ApiErrorWithMeta;
      err.code = 'PHOTO_TOO_LARGE';
      throw err;
    }

    const { width, height } = await getImageDimensions(file);
    const enforcedMinWidth = Math.min(photoRules.min_width, 450);
    const enforcedMinHeight = Math.min(photoRules.min_height, 600);
    if (width < enforcedMinWidth || height < enforcedMinHeight) {
      throw createPhotoValidationError(
        `Error por tamano (resolucion minima): requerido ${enforcedMinWidth}x${enforcedMinHeight}px, actual ${width}x${height}px.`
      );
    }

    if (width > photoRules.max_width || height > photoRules.max_height) {
      throw createPhotoValidationError(
        `Error por tamano (resolucion maxima): permitido ${photoRules.max_width}x${photoRules.max_height}px.`
      );
    }

    if (height <= width) {
      throw createPhotoValidationError('Error por tamano (orientacion): la foto debe ser vertical tipo carnet.');
    }

    const ratio = width / height;
    if (ratio < photoRules.min_aspect_ratio || ratio > photoRules.max_aspect_ratio) {
      throw createPhotoValidationError(
        'Error por tamano (proporcion): la foto debe tener proporcion tipo carnet (aprox. 3:4).',
      );
    }
  };

  const uploadEmployeePhotoFile = async (file: File): Promise<string> => {
    await validateEmployeePhotoFile(file);
    const fileBase64 = await toBase64(file);
    const payload = await request('/organization/employees/upload-photo', {
      method: 'POST',
      body: JSON.stringify({
        file_name: file.name,
        mime_type: file.type,
        file_base64: fileBase64,
      }),
    });

    return String(payload.photo_path || '');
  };

  useEffect(() => {
    loadItems();
    setShowForm(false);
    setEditingId(null);
    setFormData({});
    setSearchTerm('');
    setStatusFilter('all');
    setSelectedPhotoFile(null);
    clearPhotoPreview();
    if (entity === 'employees') {
      loadEmployeePhotoRules();
    }
  }, [entity]);

  useEffect(() => {
    return () => {
      clearPhotoPreview();
    };
  }, []);

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const searchOk =
        !q ||
        config.tableColumns.some((column) =>
          String(item[column] ?? '').toLowerCase().includes(q)
        );

      const statusOk =
        !('is_active' in item) ||
        statusFilter === 'all' ||
        (statusFilter === 'active' && item.is_active === true) ||
        (statusFilter === 'inactive' && item.is_active === false);

      return searchOk && statusOk;
    });
  }, [items, config.tableColumns, searchTerm, statusFilter]);

  const getColumnHeaderLabel = (column: string) => {
    if (column === 'is_active') return 'Estado';
    const field = getFieldByKey(column);
    if (field?.label) return field.label;
    return column
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getCreateButtonLabel = () => {
    const labelsByEntity: Partial<Record<EntityKey, string>> = {
      companies: 'Nueva Empresa',
      'work-locations': 'Nueva Localización',
      departments: 'Nuevo Departamento',
      areas: 'Nueva Área',
      'work-groups': 'Nuevo Grupo de Trabajo',
      'payroll-groups': 'Nuevo Grupo de Nómina',
      'job-titles': 'Nuevo Cargo',
      'cost-centers': 'Nuevo Centro de Costo',
      'employee-profiles': 'Nuevo Perfil',
    };
    return labelsByEntity[entity] || 'Nuevo';
  };

  const shouldSplitSearchAndDataModules = (
    entity === 'companies' ||
    entity === 'work-locations' ||
    entity === 'departments' ||
    entity === 'areas' ||
    entity === 'work-groups' ||
    entity === 'payroll-groups' ||
    entity === 'job-titles' ||
    entity === 'cost-centers' ||
    entity === 'employee-profiles'
  );

  const layoutClassName = hideTopHeader
    ? 'w-full max-w-full space-y-2'
    : 'p-6 max-w-full space-y-6';

  const openCreate = () => {
    const initial: Record<string, any> = {};
    config.fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        initial[field.key] = field.defaultValue;
      } else if (field.type === 'boolean') {
        initial[field.key] = true;
      } else {
        initial[field.key] = '';
      }
    });

    setFormData(initial);
    setEditingId(null);
    setShowForm(true);
    setSelectedPhotoFile(null);
    clearPhotoPreview();
  };

  const openEdit = (item: any) => {
    const initial: Record<string, any> = {};
    config.fields.forEach((field) => {
      const value = item[field.key];
      if (field.type === 'date') {
        initial[field.key] = normalizeDateInputValue(value);
      } else {
        initial[field.key] = value === null || value === undefined ? '' : value;
      }
    });

    setFormData(initial);
    setEditingId(item.id);
    setShowForm(true);
    setSelectedPhotoFile(null);
    if (entity === 'employees') {
      void loadEmployeePhotoPreview(item.id, item.employee_photo_path);
    } else {
      clearPhotoPreview();
    }
  };

  const handleUploadEmployeePhoto = async () => {
    if (!selectedPhotoFile) {
      setError('Seleccione una foto antes de subirla');
      return;
    }

    setPhotoUploading(true);
    setError(null);
    try {
      const uploadedPath = await uploadEmployeePhotoFile(selectedPhotoFile);
      setFormData((prev) => ({
        ...prev,
        employee_photo_path: uploadedPath,
      }));
      setSelectedPhotoFile(null);
    } catch (err: any) {
      setError(formatPhotoUploadError(err));
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      for (const field of config.fields) {
        if (field.required) {
          const value = formData[field.key];
          if (value === undefined || value === null || String(value).trim() === '') {
            throw new Error(`Campo obligatorio: ${field.label}`);
          }
        }
      }

      const payload = { ...formData };
      config.fields.forEach((field) => {
        if (field.type === 'number' && payload[field.key] !== '' && payload[field.key] !== null) {
          payload[field.key] = Number(payload[field.key]);
        }
        if (field.type === 'boolean') {
          payload[field.key] = payload[field.key] === true || payload[field.key] === 'true';
        }
      });

      if (entity === 'work-locations') {
        const polygonValue = payload.geofence_polygon;
        if (polygonValue === '' || polygonValue === undefined) {
          payload.geofence_polygon = null;
        } else if (typeof polygonValue === 'string') {
          try {
            payload.geofence_polygon = JSON.parse(polygonValue);
          } catch {
            throw new Error('El poligono debe ser un GeoJSON valido');
          }
        }
      }

      if (entity === 'employees' && selectedPhotoFile) {
        setPhotoUploading(true);
        try {
          const uploadedPath = await uploadEmployeePhotoFile(selectedPhotoFile);
          payload.employee_photo_path = uploadedPath;
          setFormData((prev) => ({ ...prev, employee_photo_path: uploadedPath }));
          setSelectedPhotoFile(null);
        } finally {
          setPhotoUploading(false);
        }
      }

      if (editingId) {
        await request(`/organization/${entity}/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await request(`/organization/${entity}`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({});
      await Promise.all([loadItems(), loadCatalogs()]);
    } catch (err: any) {
      setError(formatPhotoUploadError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: any) => {
    setError(null);
    const nextIsActive = !item.is_active;
    try {
      const payload = await request(`/organization/${entity}/${item.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: nextIsActive }),
      });
      const updatedItem = payload?.item;
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? {
                ...row,
                ...(updatedItem || {}),
                is_active: typeof updatedItem?.is_active === 'boolean' ? updatedItem.is_active : nextIsActive,
              }
            : row
        )
      );
    } catch (err: any) {
      setError(err.message || 'Error actualizando estado');
    }
  };

  const handleDelete = async (item: any) => {
    setError(null);
    const confirmed = window.confirm('Esta accion eliminara el registro de forma permanente. Deseas continuar?');
    if (!confirmed) return;

    try {
      await request(`/organization/${entity}/${item.id}`, {
        method: 'DELETE',
      });
      await loadItems();
    } catch (err: any) {
      setError(err.message || 'Error eliminando registro');
    }
  };

  const getShiftCombinations = () => {
    return catalogs.employee_company_combinations || [];
  };

  const getShiftCompanyOptions = () => {
    const companies = (catalogs.companies || []) as any[];
    const baseOptions = [...companies].sort((a, b) =>
      String(a.company_name || '').localeCompare(String(b.company_name || ''))
    );
    if (baseOptions.length === 0) return baseOptions;

    return [
      { id: '0', company_code: '0', company_name: '[TODAS LAS EMPRESAS]' },
      ...baseOptions,
    ];
  };

  const getShiftPayrollGroupOptions = () => {
    const combinations = getShiftCombinations();
    const selectedCompanyId = formData.company_id;
    const filtered = selectedCompanyId && selectedCompanyId !== '0'
      ? combinations.filter((combo: any) => combo.company_id === selectedCompanyId)
      : combinations;

    const map = new Map<string, any>();
    filtered.forEach((combo: any) => {
      if (!combo?.payroll_group_id) return;
      if (!map.has(combo.payroll_group_id)) {
        map.set(combo.payroll_group_id, {
          id: combo.payroll_group_id,
          payroll_group_code: combo.payroll_group_code,
          payroll_group_name: combo.payroll_group_name,
        });
      }
    });

    const baseOptions = Array.from(map.values()).sort((a, b) =>
      String(a.payroll_group_name || '').localeCompare(String(b.payroll_group_name || ''))
    );
    if (baseOptions.length === 0) return baseOptions;

    return [
      { id: '0', payroll_group_code: '0', payroll_group_name: '[TODOS LOS GRUPOS DE NOMINA]' },
      ...baseOptions,
    ];
  };

  const normalizeLookupText = (value: any) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  const TIMEZONE_COUNTRY_KEY_PREFIXES: Record<string, string[]> = {
    AR: ['ARGENTINA'],
    CL: ['CHILE'],
    CO: ['COLOMBIA'],
    EC: ['ECUADOR'],
    PE: ['PERU'],
    US: ['USA', 'UNITED_STATES', 'ESTADOS_UNIDOS'],
  };

  const getFilteredTimezoneOptions = (baseOptions: any[]) => {
    if (entity !== 'work-locations') return baseOptions;

    const selectedCountryId = String(formData.country_id || '');
    if (!selectedCountryId) return [];

    const selectedCountry = (catalogs.countries || []).find(
      (country: any) => String(country?.id || '') === selectedCountryId
    );
    if (!selectedCountry) return [];

    const countryShortLabel = normalizeLookupText(selectedCountry.lookup_short_label);
    const countryTokens = new Set(
      [
        selectedCountry.lookup_label,
        selectedCountry.lookup_short_label,
        selectedCountry.lookup_key,
        ...(TIMEZONE_COUNTRY_KEY_PREFIXES[countryShortLabel] || []),
      ]
        .map((token) => normalizeLookupText(token))
        .filter(Boolean)
    );

    const filtered = baseOptions.filter((option: any) => {
      const timezoneKey = normalizeLookupText(option.lookup_key);
      const timezoneCountryLabel = normalizeLookupText(String(option.lookup_label || '').split('-')[0]);
      return (
        countryTokens.has(timezoneCountryLabel) ||
        Array.from(countryTokens).some((token) => timezoneKey === token || timezoneKey.startsWith(`${token}_`))
      );
    });

    const uniqueByTimezone = new Map<string, any>();
    filtered.forEach((option: any) => {
      const timezoneValue = String(option.lookup_short_label || option.lookup_key || option.id || '');
      if (!timezoneValue || uniqueByTimezone.has(timezoneValue)) return;
      uniqueByTimezone.set(timezoneValue, {
        ...option,
        label: timezoneValue,
      });
    });

    return Array.from(uniqueByTimezone.values());
  };

  const getSelectOptions = (key?: string) => {
    if (!key) return [];

    if (entity === 'shifts' && key === 'companies') {
      return getShiftCompanyOptions();
    }

    if (entity === 'shifts' && key === 'payroll_groups') {
      return getShiftPayrollGroupOptions();
    }

    const baseOptions = catalogs[key] || [];

    if (key === 'attendance_timezones') {
      return getFilteredTimezoneOptions(baseOptions);
    }

    if (key === 'states') {
      const selectedCountryId = String(formData.company_country_id || formData.country_id || '');
      if (!selectedCountryId) return [];
      return baseOptions.filter((option: any) => String(option?.country_id || '') === selectedCountryId);
    }

    if (key === 'cities') {
      const selectedStateId = String(formData.company_state_id || formData.state_id || '');
      if (selectedStateId) {
        return baseOptions.filter((option: any) => String(option?.state_id || '') === selectedStateId);
      }
      return [];
    }

    return baseOptions;
  };

  const getFieldByKey = (fieldKey: string) => {
    return config.fields.find((field) => field.key === fieldKey);
  };

  const getOptionLabel = (option: any) => {
    return (
      option.label ||
      option.lookup_label ||
      option.company_name ||
      option.department_name ||
      option.area_name ||
      option.cost_center_name ||
      option.payroll_group_name ||
      option.profile_name ||
      option.work_group_name ||
      option.work_location_name ||
      option.job_title_name ||
      (option.employee_code
        ? `${option.employee_code} - ${option.employee_lastname || ''} ${option.employee_name || ''}`.trim()
        : null) ||
      option.lookup_key ||
      option.id
    );
  };

  const getOptionValue = (field: FieldConfig, option: any) => {
    if (field.key === 'time_zone') {
      return String(option.lookup_short_label || option.lookup_key || option.value || option.id || '');
    }
    return String(option.id || '');
  };

  const findOptionById = (optionsKey: string, value: any) => {
    const selectedValue = String(value || '');
    if (!selectedValue) return null;
    return (catalogs[optionsKey] || []).find((option: any) => String(option?.id || '') === selectedValue) || null;
  };

  const getWorkLocationMapSearchContext = () => {
    const country = findOptionById('countries', formData.country_id);
    const state = findOptionById('states', formData.state_id);
    const city = findOptionById('cities', formData.city_id);
    const parts = [
      formData.address_line1,
      city ? getOptionLabel(city) : '',
      state ? getOptionLabel(state) : '',
      country ? getOptionLabel(country) : '',
    ]
      .map((part) => String(part || '').trim())
      .filter(Boolean);

    const countryCode = String(country?.lookup_short_label || '').trim().toLowerCase();

    return {
      query: parts.join(', '),
      countryCode: /^[a-z]{2}$/i.test(countryCode) ? countryCode : '',
    };
  };

  const getFormModalClassName = () => {
    const isSimpleMaintenanceEntity =
      entity === 'departments' ||
      entity === 'areas' ||
      entity === 'work-groups' ||
      entity === 'payroll-groups' ||
      entity === 'job-titles' ||
      entity === 'cost-centers' ||
      entity === 'employee-profiles';

    if (isSimpleMaintenanceEntity) {
      return 'relative w-full max-w-xl max-h-[96vh] overflow-hidden rounded-lg border bg-white shadow-2xl flex flex-col';
    }
    if (entity === 'companies') {
      return 'relative w-full max-w-5xl max-h-[96vh] overflow-hidden rounded-lg border bg-white shadow-2xl flex flex-col';
    }
    return 'relative w-full max-w-[96vw] max-h-[96vh] overflow-hidden rounded-lg border bg-white shadow-2xl flex flex-col';
  };

  const getFormGridClassName = () => {
    if (entity === 'work-locations') {
      return 'grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-4 items-start';
    }
    if (entity === 'companies') {
      return 'grid grid-cols-1 md:grid-cols-2 gap-3';
    }
    if (
      entity === 'departments' ||
      entity === 'areas' ||
      entity === 'work-groups' ||
      entity === 'payroll-groups' ||
      entity === 'job-titles' ||
      entity === 'cost-centers' ||
      entity === 'employee-profiles'
    ) {
      return 'grid grid-cols-1 gap-3';
    }
    return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3';
  };

  const isDependentGeoSelectDisabled = (fieldKey: string) => {
    if (fieldKey === 'company_state_id') return !formData.company_country_id;
    if (fieldKey === 'company_city_id') return !formData.company_state_id;
    if (fieldKey === 'state_id') return !formData.country_id;
    if (fieldKey === 'city_id') return !formData.state_id;
    if (fieldKey === 'time_zone' && entity === 'work-locations') return !formData.country_id;
    return false;
  };

  const getFormTitle = () => {
    if (entity === 'companies') {
      return editingId ? 'Editar Empresa' : 'Nueva Empresa';
    }
    if (entity === 'departments') {
      return editingId ? 'Editar Departamento' : 'Nuevo Departamento';
    }
    if (entity === 'areas') {
      return editingId ? 'Editar Área' : 'Nueva Área';
    }
    return editingId ? `Editar ${config.title}` : `Nuevo ${config.title}`;
  };

  const formatCellValue = (column: string, rawValue: any) => {
    const field = getFieldByKey(column);

    if (!field) {
      return String(rawValue ?? '');
    }

    if (column === 'is_active') {
      const isActive = rawValue === true;
      return (
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
            isActive ? 'border-green-300 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-700'
          }`}
        >
          {isActive ? 'Activo' : 'Inactivo'}
        </span>
      );
    }

    if (field.type === 'boolean') {
      return rawValue === true ? 'Sí' : 'No';
    }

    if (field.type === 'select') {
      if (!rawValue) return '';
      const options = field.optionsKey ? (catalogs[field.optionsKey] || []) : [];
      const selected = options.find((option: any) => getOptionValue(field, option) === String(rawValue));
      return selected ? String(getOptionLabel(selected)) : String(rawValue);
    }

    if (column === 'geofence_polygon') {
      return rawValue ? 'Definido' : 'No definido';
    }

    return String(rawValue ?? '');
  };

  return (
    <div className={layoutClassName}>
      {!hideTopHeader && (
        <SystemAdminPageHeader
          icon={Building2}
          title={pageTitle || config.title}
          subtitle={pageDescription || config.description}
          rightSlot={(
            <>
              <HeaderInfoTips
                items={[
                  {
                    title: 'Información',
                    text: 'Administra empresas del tenant y su estado operativo.',
                    variant: 'info',
                  },
                  {
                    title: 'Warning',
                    text: 'Antes de desactivar o eliminar, valida impactos en localizaciones y empleados relacionados.',
                    variant: 'warning',
                  },
                  {
                    title: 'Tip',
                    text: 'Usa búsqueda y estado para filtrar rápidamente registros de empresa.',
                    variant: 'tip',
                  },
                ]}
              />
              <HeaderRefreshButton onClick={() => void loadItems()} loading={loading} label="Recargar" />
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0074D9] text-white text-sm font-medium hover:bg-[#0066C0]"
              >
                <Plus className="size-4" />
                {getCreateButtonLabel()}
              </button>
            </>
          )}
        />
      )}

      {!hideEntityTabs && (
        <div className="flex flex-wrap gap-2">
          {ENTITY_CONFIGS.map((entry) => (
            <button
              key={entry.key}
              onClick={() => setEntity(entry.key)}
              className={`px-3 py-1.5 rounded-md text-sm border ${
                entity === entry.key
                  ? 'bg-[#0074D9] text-white border-[#0074D9]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {entry.title}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowForm(false);
              setEditingId(null);
              clearPhotoPreview();
            }}
          />
          <div className={getFormModalClassName()}>
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <h3 className="text-base font-semibold text-gray-900">
                {getFormTitle()}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  clearPhotoPreview();
                }}
                className="p-1.5 rounded hover:bg-gray-200"
                title="Cerrar"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
              <div className={getFormGridClassName()}>
              {config.fields.map((field) => (
                <div
                  key={field.key}
                  className={`space-y-1 ${
                    entity === 'work-locations'
                      ? field.key === 'geofence_polygon'
                        ? 'min-w-0 xl:col-start-2 xl:row-start-1 xl:row-span-12'
                        : 'xl:col-start-1'
                      : ''
                  }`}
                >
                  <label className="text-xs font-medium text-gray-700">
                    {field.label} {field.required && '*'}
                  </label>

                  {entity === 'employees' && field.key === 'employee_photo_path' ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={formData[field.key] ?? ''}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, [field.key]: event.target.value }))
                        }
                        placeholder="Ruta relativa de la foto"
                        className="w-full border rounded px-2 py-1.5 text-sm bg-white"
                      />
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          setSelectedPhotoFile(file);
                          if (file) {
                            const localUrl = URL.createObjectURL(file);
                            setPhotoPreview(localUrl);
                          } else {
                            clearPhotoPreview();
                          }
                        }}
                        className="w-full border rounded px-2 py-1.5 text-sm bg-white"
                      />
                      <p className="text-xs text-gray-600">
                        Formato carnet recomendado: vertical 3:4, resolución entre {photoRules.min_width}x{photoRules.min_height} y {photoRules.max_width}x{photoRules.max_height} px, máximo {Math.round(photoRules.max_file_size_bytes / (1024 * 1024))} MB.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleUploadEmployeePhoto}
                          disabled={photoUploading}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs bg-white hover:bg-gray-100 disabled:opacity-50"
                        >
                          {photoUploading ? 'Subiendo...' : 'Subir Foto'}
                        </button>
                        {selectedPhotoFile ? (
                          <span className="text-xs text-gray-600">{selectedPhotoFile.name}</span>
                        ) : formData[field.key] ? (
                          <span className="text-xs text-gray-600">{String(formData[field.key])}</span>
                        ) : null}
                      </div>
                      {photoPreviewUrl && (
                        <img
                          src={photoPreviewUrl}
                          alt="Preview"
                          className="h-20 w-20 object-cover rounded border"
                        />
                      )}
                    </div>
                  ) : entity === 'work-locations' && field.key === 'geofence_polygon' ? (
                    <PolygonEditorField
                      value={formData[field.key]}
                      onChange={(nextValue) =>
                        setFormData((prev) => ({ ...prev, [field.key]: nextValue }))
                      }
                      locationSearchQuery={getWorkLocationMapSearchContext().query}
                      locationSearchCountryCode={getWorkLocationMapSearchContext().countryCode}
                      large
                    />
                  ) : field.type === 'select' ? (

                    <select
                      value={formData[field.key] ?? ''}
                      disabled={isDependentGeoSelectDisabled(field.key)}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (entity === 'shifts' && field.key === 'company_id') {
                          setFormData((prev) => ({
                            ...prev,
                            company_id: value,
                            payroll_group_id: '',
                          }));
                          return;
                        }
                        if (field.key === 'company_country_id') {
                          setFormData((prev) => ({
                            ...prev,
                            company_country_id: value,
                            company_state_id: '',
                            company_city_id: '',
                          }));
                          return;
                        }
                        if (field.key === 'company_state_id') {
                          setFormData((prev) => ({
                            ...prev,
                            company_state_id: value,
                            company_city_id: '',
                          }));
                          return;
                        }
                        if (field.key === 'country_id') {
                          setFormData((prev) => ({
                            ...prev,
                            country_id: value,
                            state_id: '',
                            city_id: '',
                            time_zone: '',
                          }));
                          return;
                        }
                        if (field.key === 'state_id') {
                          setFormData((prev) => ({
                            ...prev,
                            state_id: value,
                            city_id: '',
                          }));
                          return;
                        }
                        setFormData((prev) => ({ ...prev, [field.key]: value }));
                      }}
                      className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Seleccionar --</option>
                      {getSelectOptions(field.optionsKey).map((option: any) => (
                        <option key={option.id} value={getOptionValue(field, option)}>
                          {getOptionLabel(option)}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'boolean' ? (
                    <label className="w-full inline-flex items-center gap-2 rounded border border-gray-300 px-3 py-2 text-sm bg-white min-h-[38px]">
                      <input
                        type="checkbox"
                        checked={Boolean(formData[field.key] ?? true)}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, [field.key]: event.target.checked }))
                        }
                        className="size-4 rounded border-gray-300 text-[#0074D9] focus:ring-[#0074D9]"
                      />
                      <span className="text-gray-700">{field.label || 'Activo'}</span>
                    </label>
                  ) : (
                    <input
                      type={
                        field.type === 'number'
                          ? 'number'
                          : field.type === 'date'
                            ? 'date'
                            : field.type === 'time'
                              ? 'time'
                              : 'text'
                      }
                      value={formData[field.key] ?? ''}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, [field.key]: event.target.value }))
                      }
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex items-center gap-2 border-t bg-white px-4 py-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                <Save className="size-4" />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  clearPhotoPreview();
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-gray-100"
              >
                <X className="size-4" />
                Cancelar
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {shouldSplitSearchAndDataModules ? (
        <>
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="grid w-full max-w-3xl grid-cols-1 gap-3 md:grid-cols-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar..."
                    className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </div>
              <span className="text-sm text-gray-500">
                {filteredItems.length} de {items.length}
              </span>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <div className="overflow-auto border rounded-md">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {config.tableColumns.map((column) => (
                      <th key={column} className="text-left px-3 py-2 border-b font-semibold text-gray-700">
                        {getColumnHeaderLabel(column)}
                      </th>
                    ))}
                    <th className="w-[120px] text-center px-3 py-2 border-b font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={config.tableColumns.length + 1} className="px-3 py-6 text-center text-gray-500">
                        Cargando...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={config.tableColumns.length + 1} className="px-3 py-6 text-center text-gray-500">
                        {searchTerm ? 'No hay resultados' : 'Sin registros'}
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        {config.tableColumns.map((column) => (
                          <td key={column} className="px-3 py-2 border-b text-gray-700">
                            {formatCellValue(column, item[column])}
                          </td>
                        ))}
                        <td className="px-3 py-2 border-b">
                          <div className="flex items-center justify-center gap-1.5">
                            <GridActionIconButton
                              onClick={() => openEdit(item)}
                              icon={<Pencil className="size-3" />}
                              label="Editar"
                              tone="blue"
                            />
                            {config.tableColumns.includes('is_active') && 'is_active' in item && (
                              <GridActionIconButton
                                onClick={() => handleToggleStatus(item)}
                                icon={<Power className="size-3" />}
                                label={item.is_active ? 'Desactivar' : 'Activar'}
                                tone={item.is_active ? 'red' : 'green'}
                              />
                            )}
                            <GridActionIconButton
                              onClick={() => handleDelete(item)}
                              icon={<Trash2 className="size-3" />}
                              label="Eliminar"
                              tone="red"
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border bg-white p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="grid w-full max-w-3xl grid-cols-1 gap-3 md:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar..."
                  className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
            <span className="text-sm text-gray-500">
              {filteredItems.length} de {items.length}
            </span>
          </div>

          <div className="overflow-auto border rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {config.tableColumns.map((column) => (
                    <th key={column} className="text-left px-3 py-2 border-b font-semibold text-gray-700">
                      {getColumnHeaderLabel(column)}
                    </th>
                  ))}
                  <th className="w-[120px] text-center px-3 py-2 border-b font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={config.tableColumns.length + 1} className="px-3 py-6 text-center text-gray-500">
                      Cargando...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={config.tableColumns.length + 1} className="px-3 py-6 text-center text-gray-500">
                      {searchTerm ? 'No hay resultados' : 'Sin registros'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {config.tableColumns.map((column) => (
                        <td key={column} className="px-3 py-2 border-b text-gray-700">
                          {formatCellValue(column, item[column])}
                        </td>
                      ))}
                      <td className="px-3 py-2 border-b">
                        <div className="flex items-center justify-center gap-1.5">
                          <GridActionIconButton
                            onClick={() => openEdit(item)}
                            icon={<Pencil className="size-3" />}
                            label="Editar"
                            tone="blue"
                          />
                          {config.tableColumns.includes('is_active') && 'is_active' in item && (
                            <GridActionIconButton
                              onClick={() => handleToggleStatus(item)}
                              icon={<Power className="size-3" />}
                              label={item.is_active ? 'Desactivar' : 'Activar'}
                              tone={item.is_active ? 'red' : 'green'}
                            />
                          )}
                          <GridActionIconButton
                            onClick={() => handleDelete(item)}
                            icon={<Trash2 className="size-3" />}
                            label="Eliminar"
                            tone="red"
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}





