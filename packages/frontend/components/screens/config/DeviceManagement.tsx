'use client';

import { buildApiUrl } from '../../../utils/api-config';
import { useEffect, useMemo, useState } from 'react';
import { Edit, Plus, Power, PowerOff, Save, Search, Tablet, Trash2, X } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { publicApiToken } from '../../../utils/backend/info';
import SystemAdminPageHeader from '../../shared/SystemAdminPageHeader';
import HeaderRefreshButton from '../../shared/HeaderRefreshButton';
import HeaderInfoTips from '../../shared/HeaderInfoTips';
import GridActionIconButton from '../../shared/GridActionIconButton';

interface CompanyRow {
  id: string;
  company_name: string;
  company_code: string;
}

interface DeviceTypeRow {
  id: string;
  lookup_key: string;
  lookup_label: string;
}

interface WorkLocationRow {
  id: string;
  company_id: string | null;
  work_location_name: string;
  work_location_code: string;
  geofence_polygon?: any;
}

interface DeviceRow {
  id: string;
  company_id: string;
  company_name: string;
  device_serial_number: string | null;
  device_name: string | null;
  device_ip: string | null;
  device_location: string | null;
  device_model: string | null;
  device_type_id: string | null;
  device_type_label: string | null;
  work_location_id: string | null;
  work_location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
}

interface DeviceFormState {
  id: string | null;
  company_id: string;
  device_serial_number: string;
  device_name: string;
  device_ip: string;
  device_location: string;
  device_model: string;
  device_type_id: string;
  work_location_id: string;
  latitude: string;
  longitude: string;
  is_active: boolean;
}

const PAGE_SIZE = 10;

interface GeoPoint {
  lat: number;
  lng: number;
}

function getToken() {
  return localStorage.getItem('tt-access-token') || localStorage.getItem('access_token') || publicApiToken;
}

function isValidIpv4(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const match = trimmed.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  for (let i = 1; i <= 4; i += 1) {
    const n = Number(match[i]);
    if (!Number.isInteger(n) || n < 0 || n > 255) return false;
  }
  return true;
}

function toUpperAlphanumeric(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9/-]/g, '');
}

function makeEmptyForm(defaultCompanyId = ''): DeviceFormState {
  return {
    id: null,
    company_id: defaultCompanyId,
    device_serial_number: '',
    device_name: '',
    device_ip: '',
    device_location: '',
    device_model: '',
    device_type_id: '',
    work_location_id: '',
    latitude: '',
    longitude: '',
    is_active: true,
  };
}

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
  const ring =
    parsed.type === 'Polygon'
      ? parsed.coordinates?.[0]
      : parsed.type === 'MultiPolygon'
        ? parsed.coordinates?.[0]?.[0]
        : null;
  if (!Array.isArray(ring)) return [];
  const points = ring
    .map((pair: any) => ({ lng: Number(pair?.[0]), lat: Number(pair?.[1]) }))
    .filter((p: GeoPoint) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (points.length >= 2) {
    const first = points[0];
    const last = points[points.length - 1];
    if (first.lat === last.lat && first.lng === last.lng) {
      return points.slice(0, -1);
    }
  }
  return points;
}

function DeviceMapClickCapture({ onPick }: { onPick: (lat: string, lng: string) => void }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat.toFixed(6), event.latlng.lng.toFixed(6));
    },
  });
  return null;
}

function DeviceMapAutoFit({
  polygonPoints,
  marker,
}: {
  polygonPoints: GeoPoint[];
  marker: GeoPoint | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (polygonPoints.length >= 2) {
      map.fitBounds(
        polygonPoints.map((point) => [point.lat, point.lng] as [number, number]),
        { padding: [20, 20] }
      );
      return;
    }
    if (marker) {
      map.setView([marker.lat, marker.lng], 17);
    }
  }, [map, polygonPoints, marker]);
  return null;
}

function DeviceMapPicker({
  geofencePolygon,
  latitude,
  longitude,
  onPick,
}: {
  geofencePolygon: any;
  latitude: string;
  longitude: string;
  onPick: (lat: string, lng: string) => void;
}) {
  const polygonPoints = useMemo(() => parseGeofencePoints(geofencePolygon), [geofencePolygon]);
  const [center, setCenter] = useState<LatLngExpression>([-2.17, -79.92]);
  const [zoom, setZoom] = useState(14);

  useEffect(() => {
    if (!polygonPoints.length) return;
    const avgLat = polygonPoints.reduce((acc, p) => acc + p.lat, 0) / polygonPoints.length;
    const avgLng = polygonPoints.reduce((acc, p) => acc + p.lng, 0) / polygonPoints.length;
    setCenter([avgLat, avgLng]);
    setZoom(16);
  }, [polygonPoints]);

  const markerLat = latitude.trim() === '' ? null : Number(latitude);
  const markerLng = longitude.trim() === '' ? null : Number(longitude);
  const marker: GeoPoint | null =
    Number.isFinite(markerLat) && Number.isFinite(markerLng)
      ? { lat: Number(markerLat), lng: Number(markerLng) }
      : null;

  const polygonPositions = polygonPoints.map((point) => [point.lat, point.lng] as [number, number]);

  return (
    <div className="space-y-2 md:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-medium">Ubicacion por mapa</label>
        <button
          type="button"
          onClick={() => {
            if (!polygonPoints.length) return;
            const avgLat = polygonPoints.reduce((acc, p) => acc + p.lat, 0) / polygonPoints.length;
            const avgLng = polygonPoints.reduce((acc, p) => acc + p.lng, 0) / polygonPoints.length;
            onPick(avgLat.toFixed(6), avgLng.toFixed(6));
          }}
          disabled={!polygonPoints.length}
          className="px-2 py-1 text-xs border rounded bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          Usar centro de geocerca
        </button>
      </div>

      <div className="rounded-md border bg-white overflow-hidden">
        <MapContainer center={center} zoom={zoom} className="h-[300px] w-full">
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <DeviceMapClickCapture onPick={onPick} />
          <DeviceMapAutoFit polygonPoints={polygonPoints} marker={marker} />
          {polygonPositions.length >= 2 && (
            <Polygon
              positions={polygonPositions}
              pathOptions={{ color: '#059669', fillColor: '#10b981', fillOpacity: 0.2, weight: 3 }}
            />
          )}
          {marker && (
            <CircleMarker
              center={[marker.lat, marker.lng]}
              radius={8}
              pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 1, weight: 2 }}
            />
          )}
        </MapContainer>
      </div>
      <div className="text-xs text-gray-600">
        Seleccione la localidad y luego haga clic en el mapa OpenStreetMap para fijar latitud/longitud.
      </div>
    </div>
  );
}
export function DeviceManagement() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceTypeRow[]>([]);
  const [workLocations, setWorkLocations] = useState<WorkLocationRow[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<DeviceFormState>(makeEmptyForm());

  const request = async (path: string, init?: RequestInit) => {
    const response = await fetch(buildApiUrl(`${path}`), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
        ...(init?.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
    return payload;
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogsPayload, devicesPayload] = await Promise.all([
        request('/time-clock-devices/catalogs'),
        request('/time-clock-devices?include_inactive=true'),
      ]);

      const nextCompanies = (catalogsPayload?.companies || []) as CompanyRow[];
      setCompanies(nextCompanies);
      setDeviceTypes((catalogsPayload?.device_types || []) as DeviceTypeRow[]);
      setWorkLocations((catalogsPayload?.work_locations || []) as WorkLocationRow[]);
      setDevices((devicesPayload?.devices || []) as DeviceRow[]);

      if (!form.company_id && nextCompanies.length > 0) {
        setForm((prev) => ({ ...prev, company_id: nextCompanies[0].id }));
      }
    } catch (err: any) {
      setError(err?.message || 'Error cargando dispositivos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    return devices.filter((row) => {
      const text = `${row.device_name || ''} ${row.device_serial_number || ''} ${row.device_ip || ''} ${row.company_name || ''} ${row.work_location_name || ''}`.toLowerCase();
      const searchOk = !searchTerm.trim() || text.includes(searchTerm.toLowerCase());
      const companyOk = companyFilter === 'all' || String(row.company_id || '') === companyFilter;
      const statusOk =
        statusFilter === 'all' ||
        (statusFilter === 'active' && row.is_active) ||
        (statusFilter === 'inactive' && !row.is_active);
      return searchOk && companyOk && statusOk;
    });
  }, [devices, searchTerm, companyFilter, statusFilter]);

  const companyFilterOptions = useMemo(
    () =>
      [...companies].sort((a, b) =>
        String(a.company_name || a.company_code || '').localeCompare(String(b.company_name || b.company_code || ''))
      ),
    [companies]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const selectedWorkLocation = useMemo(
    () => workLocations.find((item) => item.id === form.work_location_id) || null,
    [form.work_location_id, workLocations]
  );

  const openCreate = () => {
    setForm(makeEmptyForm(companies[0]?.id || ''));
    setModalOpen(true);
    setModalError(null);
  };

  const openEdit = (row: DeviceRow) => {
    setForm({
      id: row.id,
      company_id: row.company_id,
      device_serial_number: row.device_serial_number || '',
      device_name: row.device_name || '',
      device_ip: row.device_ip || '',
      device_location: row.device_location || '',
      device_model: row.device_model || '',
      device_type_id: row.device_type_id || '',
      work_location_id: row.work_location_id || '',
      latitude: row.latitude !== null && row.latitude !== undefined ? String(row.latitude) : '',
      longitude: row.longitude !== null && row.longitude !== undefined ? String(row.longitude) : '',
      is_active: row.is_active,
    });
    setModalOpen(true);
    setModalError(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSaving(false);
    setModalError(null);
  };

  const removeDevice = async (row: DeviceRow) => {
    if (!window.confirm(`¿Desea eliminar el dispositivo "${row.device_name || row.device_serial_number || row.id}"?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await request(`/time-clock-devices/${row.id}`, { method: 'DELETE' });
      setSuccess('Dispositivo eliminado correctamente.');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Error eliminando dispositivo');
    }
  };

  const toggleDeviceStatus = async (row: DeviceRow) => {
    setError(null);
    setSuccess(null);
    try {
      await request(`/time-clock-devices/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          company_id: row.company_id,
          device_serial_number: row.device_serial_number || null,
          device_name: row.device_name || row.device_serial_number || 'DISPOSITIVO',
          device_ip: row.device_ip || null,
          device_location: row.device_location || null,
          device_model: row.device_model || null,
          device_type_id: row.device_type_id || null,
          work_location_id: row.work_location_id || null,
          latitude: row.latitude,
          longitude: row.longitude,
          is_active: !row.is_active,
        }),
      });
      setSuccess(`Dispositivo ${row.is_active ? 'desactivado' : 'activado'} correctamente.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Error actualizando estado del dispositivo');
    }
  };

  const saveDevice = async () => {
    const payload = {
      company_id: form.company_id,
      device_serial_number: form.device_serial_number.trim() || null,
      device_name: form.device_name.trim(),
      device_ip: form.device_ip.trim() || null,
      device_location: form.device_location.trim() || null,
      device_model: form.device_model.trim() || null,
      device_type_id: form.device_type_id || null,
      work_location_id: form.work_location_id || null,
      latitude: form.latitude.trim() === '' ? null : Number(form.latitude),
      longitude: form.longitude.trim() === '' ? null : Number(form.longitude),
      is_active: form.is_active,
    };

    if (!payload.company_id) {
      setModalError('Debe seleccionar empresa.');
      return;
    }
    if (!payload.device_name) {
      setModalError('Debe ingresar nombre del dispositivo.');
      return;
    }
    if (!payload.work_location_id) {
      setModalError('Debe seleccionar una localidad.');
      return;
    }
    if (!isValidIpv4(form.device_ip)) {
      setModalError('La IP debe tener formato x.x.x.x y cada número entre 0 y 255.');
      return;
    }
    if (form.device_serial_number && !/^[A-Z0-9/-]+$/.test(form.device_serial_number)) {
      setModalError('El serial solo puede contener A-Z, 0-9, "-" y "/".');
      return;
    }
    if (form.device_model && !/^[A-Z0-9/-]+$/.test(form.device_model)) {
      setModalError('El modelo solo puede contener A-Z, 0-9, "-" y "/".');
      return;
    }
    if (payload.latitude !== null && (!Number.isFinite(payload.latitude) || payload.latitude < -90 || payload.latitude > 90)) {
      setModalError('La latitud debe estar entre -90 y 90.');
      return;
    }
    if (payload.longitude !== null && (!Number.isFinite(payload.longitude) || payload.longitude < -180 || payload.longitude > 180)) {
      setModalError('La longitud debe estar entre -180 y 180.');
      return;
    }
    if (payload.latitude === null || payload.longitude === null) {
      setModalError('Debe seleccionar la ubicacion del dispositivo en el mapa.');
      return;
    }

    setSaving(true);
    setModalError(null);
    setSuccess(null);
    try {
      if (form.id) {
        await request(`/time-clock-devices/${form.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await request('/time-clock-devices', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setSuccess('Dispositivo guardado correctamente.');
      closeModal();
      await loadData();
    } catch (err: any) {
      setModalError(err?.message || 'Error guardando dispositivo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-full space-y-6">
      <SystemAdminPageHeader
        icon={Tablet}
        title="Gestión de Dispositivos"
        subtitle="Administra los dispositivos de marcación (tablets, kioscos)"
        rightSlot={(
          <>
            <HeaderInfoTips
              items={[
                {
                  title: 'Información',
                  text: 'Gestiona los dispositivos de marcación, su conectividad y su asignación a localidades.',
                  variant: 'info',
                },
                {
                  title: 'Warning',
                  text: 'Antes de eliminar un dispositivo, verifica que no esté siendo usado en operación activa.',
                  variant: 'warning',
                },
              ]}
            />
            <HeaderRefreshButton onClick={() => void loadData()} label="Actualizar" />
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0074D9] text-white text-sm font-medium hover:bg-[#0066C0]"
            >
              <Plus className="size-4" />
              Registrar Dispositivo
            </button>
          </>
        )}
      />

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

      <div className="rounded-lg border bg-white p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full rounded-md border py-2 pl-9 pr-3 text-sm"
                placeholder="Buscar por dispositivo..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={companyFilter}
              onChange={(event) => {
                setCompanyFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">Todas las empresas</option>
              {companyFilterOptions.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.company_name || company.company_code || company.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | 'active' | 'inactive');
                setPage(1);
              }}
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>

        </div>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h2 className="mb-4 text-2xl font-semibold">Dispositivos de Marcación</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3 text-left">Nombre</th>
                <th className="py-2 pr-3 text-left">Serial</th>
                <th className="py-2 pr-3 text-left">Empresa</th>
                <th className="py-2 pr-3 text-left">Tipo</th>
                <th className="py-2 pr-3 text-left">IP / Host</th>
                <th className="py-2 pr-3 text-left">Ubicación</th>
                <th className="py-2 pr-3 text-left">Localidad</th>
                <th className="py-2 pr-3 text-left">Lat / Lng</th>
                <th className="py-2 pr-3 text-left">Modelo</th>
                <th className="py-2 pr-3 text-left">Estado</th>
                <th className="w-[110px] py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-6 text-center text-gray-500">Cargando dispositivos...</td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-6 text-center text-gray-500">No existen dispositivos</td>
                </tr>
              ) : (
                paged.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 pr-3">
                      <span className="inline-flex items-center gap-2">
                        <Tablet className="size-4 text-gray-500" />
                        {row.device_name || '-'}
                      </span>
                    </td>
                    <td className="py-3 pr-3">{row.device_serial_number || '-'}</td>
                    <td className="py-3 pr-3">{row.company_name}</td>
                    <td className="py-3 pr-3">{row.device_type_label || '-'}</td>
                    <td className="py-3 pr-3">{row.device_ip || '-'}</td>
                    <td className="py-3 pr-3">{row.device_location || '-'}</td>
                    <td className="py-3 pr-3">{row.work_location_name || '-'}</td>
                    <td className="py-3 pr-3">
                      {row.latitude !== null && row.longitude !== null ? `${row.latitude}, ${row.longitude}` : '-'}
                    </td>
                    <td className="py-3 pr-3">{row.device_model || '-'}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                          row.is_active ? 'border-green-300 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-700'
                        }`}
                      >
                        {row.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <GridActionIconButton
                          onClick={() => openEdit(row)}
                          icon={<Edit className="size-4" />}
                          label="Editar"
                          tone="blue"
                        />
                        <GridActionIconButton
                          onClick={() => void toggleDeviceStatus(row)}
                          icon={row.is_active ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                          label={row.is_active ? 'Desactivar' : 'Activar'}
                          tone={row.is_active ? 'red' : 'green'}
                        />
                        <GridActionIconButton
                          onClick={() => void removeDevice(row)}
                          icon={<Trash2 className="size-4" />}
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

        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>Página {page} de {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              className="rounded border px-3 py-1.5 disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Anterior
            </button>
            <button
              className="rounded border px-3 py-1.5 disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative w-full max-w-6xl rounded-xl border bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h3 className="text-lg font-semibold">{form.id ? 'Editar Dispositivo' : 'Nuevo Dispositivo'}</h3>
              <button onClick={closeModal} className="rounded p-1.5 hover:bg-gray-100">
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-3">
              {modalError && (
                <div className="md:col-span-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {modalError}
                </div>
              )}

              {/* Fila 1: Empresa - Localidad - Tipo */}
              <div>
                <label className="text-sm font-medium">Empresa</label>
                <select
                  value={form.company_id}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      company_id: event.target.value,
                      work_location_id: '',
                      latitude: '',
                      longitude: '',
                    }))
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Seleccione</option>
                  {companies.map((item) => (
                    <option key={item.id} value={item.id}>{item.company_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Localidad</label>
                <select
                  value={form.work_location_id}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      work_location_id: event.target.value,
                      latitude: '',
                      longitude: '',
                    }))
                  }
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Seleccione</option>
                  {workLocations
                    .filter((item) => !form.company_id || item.company_id === form.company_id)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.work_location_name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Tipo de Dispositivo</label>
                <select
                  value={form.device_type_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, device_type_id: event.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Seleccione</option>
                  {deviceTypes.map((item) => (
                    <option key={item.id} value={item.id}>{item.lookup_label}</option>
                  ))}
                </select>
              </div>

              {/* Fila 2: Nombre - Serial - IP */}
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <input
                  value={form.device_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, device_name: event.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Serial</label>
                <input
                  value={form.device_serial_number}
                  onChange={(event) => setForm((prev) => ({ ...prev, device_serial_number: toUpperAlphanumeric(event.target.value) }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="ABC123"
                />
                <div className="mt-1 text-xs text-gray-500">Permitido: A-Z, 0-9, "-" y "/"</div>
              </div>
              <div>
                <label className="text-sm font-medium">IP / Host</label>
                <input
                  value={form.device_ip}
                  onChange={(event) => setForm((prev) => ({ ...prev, device_ip: event.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="192.168.1.10"
                />
                <div className="mt-1 text-xs text-gray-500">Formato: x.x.x.x (cada valor 0-255)</div>
              </div>

              {/* Fila 3: Ubicación - Modelo - Activo */}
              <div>
                <label className="text-sm font-medium">Ubicación</label>
                <input
                  value={form.device_location}
                  onChange={(event) => setForm((prev) => ({ ...prev, device_location: event.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Modelo</label>
                <input
                  value={form.device_model}
                  onChange={(event) => setForm((prev) => ({ ...prev, device_model: toUpperAlphanumeric(event.target.value) }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="TABLET"
                />
                <div className="mt-1 text-xs text-gray-500">Permitido: A-Z, 0-9, "-" y "/"</div>
              </div>
              <div>
                <label className="text-sm font-medium">Activo</label>
                <label className="mt-1 w-full inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[42px] bg-white">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                    className="size-4 rounded border-gray-300 text-[#0074D9] focus:ring-[#0074D9]"
                  />
                  Activo
                </label>
              </div>

              {/* Fila 4: Latitud / Longitud */}
              <div>
                <label className="text-sm font-medium">Latitud</label>
                <input
                  value={form.latitude}
                  readOnly
                  className="mt-1 w-full rounded-md border bg-gray-50 px-3 py-2 text-sm"
                  placeholder="Seleccione un punto en el mapa"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Longitud</label>
                <input
                  value={form.longitude}
                  readOnly
                  className="mt-1 w-full rounded-md border bg-gray-50 px-3 py-2 text-sm"
                  placeholder="Seleccione un punto en el mapa"
                />
              </div>
              <div />

              {/* Mapa */}
              <DeviceMapPicker
                geofencePolygon={selectedWorkLocation?.geofence_polygon}
                latitude={form.latitude}
                longitude={form.longitude}
                onPick={(lat, lng) => setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))}
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
              <button onClick={closeModal} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
              <button
                onClick={() => void saveDevice()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-[#0074D9] px-4 py-2 text-sm text-white hover:bg-[#0066C0] disabled:opacity-50"
              >
                <Save className="size-4" />
                {saving ? 'Guardando...' : 'Guardar Dispositivo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



