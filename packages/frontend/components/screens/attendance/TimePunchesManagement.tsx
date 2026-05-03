'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Edit, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
import { publicApiToken } from '../../../utils/backend/info';

interface CompanyRow {
  id: string;
  company_name: string;
  company_code: string;
}

interface EmployeeRow {
  id: string;
  employee_code: string | null;
  employee_name: string | null;
  employee_lastname: string | null;
  company_id: string | null;
  company_name: string | null;
}

interface DeviceRow {
  id: string;
  company_id: string | null;
  device_name: string | null;
  device_serial_number: string | null;
}

interface LookupRow {
  id: string;
  lookup_key: string;
  lookup_label: string;
  sort_order?: number;
  punch_key_value?: number;
}

interface TimePunchRow {
  id: string;
  company_id: string;
  company_name: string;
  employee_id: string;
  employee_code: string | null;
  employee_name: string | null;
  employee_lastname: string | null;
  time_clock_device_id: string | null;
  device_name: string | null;
  device_serial_number: string | null;
  punch_datetime: string;
  punch_key: number;
  punch_source_id: string | null;
  punch_source_label: string | null;
  time_punch_status_id: string | null;
  time_punch_status_label: string | null;
  service_ticket_number: number | null;
  notes: string | null;
  is_active: boolean;
}

interface FormState {
  id: string | null;
  company_id: string;
  employee_id: string;
  time_clock_device_id: string;
  punch_datetime: string;
  punch_key: string;
  punch_source_id: string;
  time_punch_status_id: string;
  service_ticket_number: string;
  notes: string;
  is_active: boolean;
}

const PAGE_SIZE = 12;

function getToken() {
  return localStorage.getItem('tt-access-token') || publicApiToken;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function toDisplayDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  return date.toLocaleString('es-EC', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function makeEmptyForm(defaultCompanyId = ''): FormState {
  return {
    id: null,
    company_id: defaultCompanyId,
    employee_id: '',
    time_clock_device_id: '',
    punch_datetime: '',
    punch_key: '',
    punch_source_id: '',
    time_punch_status_id: '',
    service_ticket_number: '',
    notes: '',
    is_active: true,
  };
}

export function TimePunchesManagement() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [punchKeys, setPunchKeys] = useState<LookupRow[]>([]);
  const [punchSources, setPunchSources] = useState<LookupRow[]>([]);
  const [punchStatuses, setPunchStatuses] = useState<LookupRow[]>([]);
  const [punches, setPunches] = useState<TimePunchRow[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(makeEmptyForm());

  const request = async (path: string, init?: RequestInit) => {
    const response = await fetch(`http://localhost:3001${path}`, {
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
      const query = new URLSearchParams({ include_inactive: 'true' });
      if (dateFrom) query.set('date_from', `${dateFrom}T00:00:00`);
      if (dateTo) query.set('date_to', `${dateTo}T23:59:59`);

      const [catalogsPayload, punchesPayload] = await Promise.all([
        request('/employee-time-punches/catalogs'),
        request(`/employee-time-punches?${query.toString()}`),
      ]);

      const nextCompanies = (catalogsPayload?.companies || []) as CompanyRow[];
      setCompanies(nextCompanies);
      setEmployees((catalogsPayload?.employees || []) as EmployeeRow[]);
      setDevices((catalogsPayload?.devices || []) as DeviceRow[]);
      setPunchKeys((catalogsPayload?.punch_keys || []) as LookupRow[]);
      setPunchSources((catalogsPayload?.punch_sources || []) as LookupRow[]);
      setPunchStatuses((catalogsPayload?.punch_statuses || []) as LookupRow[]);
      setPunches((punchesPayload?.punches || []) as TimePunchRow[]);

      if (!form.company_id && nextCompanies.length > 0) {
        setForm((prev) => ({ ...prev, company_id: nextCompanies[0].id }));
      }
    } catch (err: any) {
      setError(err?.message || 'Error cargando marcaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredPunches = useMemo(() => {
    return punches.filter((row) => {
      const text = `${row.employee_code || ''} ${row.employee_name || ''} ${row.employee_lastname || ''} ${row.company_name || ''} ${row.device_name || ''} ${row.device_serial_number || ''}`.toLowerCase();
      const searchOk = !searchTerm.trim() || text.includes(searchTerm.toLowerCase());
      const statusOk =
        statusFilter === 'all' ||
        (statusFilter === 'active' && row.is_active) ||
        (statusFilter === 'inactive' && !row.is_active);
      return searchOk && statusOk;
    });
  }, [punches, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPunches.length / PAGE_SIZE));
  const pagedPunches = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredPunches.slice(start, start + PAGE_SIZE);
  }, [filteredPunches, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const employeesByCompany = useMemo(() => {
    if (!form.company_id) return employees;
    return employees.filter((item) => !item.company_id || item.company_id === form.company_id);
  }, [employees, form.company_id]);

  const devicesByCompany = useMemo(() => {
    if (!form.company_id) return devices;
    return devices.filter((item) => !item.company_id || item.company_id === form.company_id);
  }, [devices, form.company_id]);

  const punchKeyOptions = useMemo(() => {
    return punchKeys
      .map((item) => {
        const numericFromKey = Number(item.lookup_key);
        const punchKeyValue = Number.isFinite(numericFromKey)
          ? Math.trunc(numericFromKey)
          : Number.isFinite(Number(item.punch_key_value))
            ? Math.trunc(Number(item.punch_key_value))
            : Number.isFinite(Number(item.sort_order))
              ? Math.trunc(Number(item.sort_order))
              : null;
        return {
          ...item,
          punchKeyValue,
        };
      })
      .filter((item) => item.punchKeyValue !== null);
  }, [punchKeys]);

  const hasCurrentPunchKeyOption = useMemo(() => {
    return punchKeyOptions.some((item) => String(item.punchKeyValue) === form.punch_key);
  }, [punchKeyOptions, form.punch_key]);

  const openCreate = () => {
    setForm(makeEmptyForm(companies[0]?.id || ''));
    setModalOpen(true);
    setModalError(null);
  };

  const openEdit = (row: TimePunchRow) => {
    setForm({
      id: row.id,
      company_id: row.company_id,
      employee_id: row.employee_id,
      time_clock_device_id: row.time_clock_device_id || '',
      punch_datetime: toDateTimeLocal(row.punch_datetime),
      punch_key: String(row.punch_key),
      punch_source_id: row.punch_source_id || '',
      time_punch_status_id: row.time_punch_status_id || '',
      service_ticket_number: row.service_ticket_number === null ? '' : String(row.service_ticket_number),
      notes: row.notes || '',
      is_active: row.is_active,
    });
    setModalOpen(true);
    setModalError(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalError(null);
    setSaving(false);
  };

  const removePunch = async (row: TimePunchRow) => {
    if (!window.confirm('¿Desea eliminar esta marcación?')) return;
    setError(null);
    setSuccess(null);
    try {
      await request(`/employee-time-punches/${row.id}`, { method: 'DELETE' });
      setSuccess('Marcación eliminada correctamente.');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Error eliminando marcación');
    }
  };

  const savePunch = async () => {
    const punchKey = Number(form.punch_key);
    const serviceTicket = form.service_ticket_number === '' ? null : Number(form.service_ticket_number);

    if (!form.company_id) {
      setModalError('Debe seleccionar empresa.');
      return;
    }
    if (!form.employee_id) {
      setModalError('Debe seleccionar empleado.');
      return;
    }
    if (!form.punch_datetime) {
      setModalError('Debe ingresar fecha/hora de marcación.');
      return;
    }
    if (!Number.isFinite(punchKey)) {
      setModalError('El campo Punch Key debe ser numérico.');
      return;
    }
    if (serviceTicket !== null && !Number.isFinite(serviceTicket)) {
      setModalError('El número de ticket debe ser numérico.');
      return;
    }

    const payload = {
      company_id: form.company_id,
      employee_id: form.employee_id,
      time_clock_device_id: form.time_clock_device_id || null,
      punch_datetime: new Date(form.punch_datetime).toISOString(),
      punch_key: Math.trunc(punchKey),
      punch_source_id: form.punch_source_id || null,
      time_punch_status_id: form.time_punch_status_id || null,
      service_ticket_number: serviceTicket === null ? null : Math.trunc(serviceTicket),
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    };

    setSaving(true);
    setModalError(null);
    setSuccess(null);
    try {
      if (form.id) {
        await request(`/employee-time-punches/${form.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await request('/employee-time-punches', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setSuccess('Marcación guardada correctamente.');
      closeModal();
      await loadData();
    } catch (err: any) {
      setModalError(err?.message || 'Error guardando marcación');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marcaciones</h1>
          <p className="text-muted-foreground mt-1">Gestión de marcaciones de asistencia por empleado</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-[#0074D9] px-4 py-2 text-sm text-white hover:bg-[#0066C0]"
        >
          <Plus className="size-4" />
          Registrar Marcación
        </button>
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

      <div className="rounded-lg border bg-white p-5">
        <h2 className="mb-1 text-2xl font-semibold">Criterios de Búsqueda</h2>
        <p className="text-muted-foreground mb-4">Filtrar por empleado, estado y rango de fechas</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="text-sm font-medium">Descripción</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full rounded-md border py-2 pl-9 pr-3 text-sm"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Estado</label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | 'active' | 'inactive');
                setPage(1);
              }}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Desde</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Hasta</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
          >
            <RefreshCw className="size-4" />
            Recargar
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h2 className="mb-4 text-2xl font-semibold">Listado de Marcaciones</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3 text-left">Fecha/Hora</th>
                <th className="py-2 pr-3 text-left">Empleado</th>
                <th className="py-2 pr-3 text-left">Empresa</th>
                <th className="py-2 pr-3 text-left">Dispositivo</th>
                <th className="py-2 pr-3 text-left">Punch Key</th>
                <th className="py-2 pr-3 text-left">Fuente</th>
                <th className="py-2 pr-3 text-left">Estado</th>
                <th className="py-2 pr-3 text-left">Activo</th>
                <th className="py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">Cargando marcaciones...</td>
                </tr>
              ) : pagedPunches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">No hay marcaciones</td>
                </tr>
              ) : (
                pagedPunches.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 pr-3">{toDisplayDateTime(row.punch_datetime)}</td>
                    <td className="py-3 pr-3">
                      {`${row.employee_lastname || ''} ${row.employee_name || ''}`.trim() || row.employee_code || row.employee_id}
                    </td>
                    <td className="py-3 pr-3">{row.company_name}</td>
                    <td className="py-3 pr-3">{row.device_name || row.device_serial_number || '-'}</td>
                    <td className="py-3 pr-3">{row.punch_key}</td>
                    <td className="py-3 pr-3">{row.punch_source_label || '-'}</td>
                    <td className="py-3 pr-3">{row.time_punch_status_label || '-'}</td>
                    <td className="py-3 pr-3">{row.is_active ? 'Sí' : 'No'}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(row)}
                          className="inline-flex items-center justify-center rounded border p-1.5 hover:bg-gray-100"
                          title="Editar"
                        >
                          <Edit className="size-4" />
                        </button>
                        <button
                          onClick={() => void removePunch(row)}
                          className="inline-flex items-center justify-center rounded border border-red-200 p-1.5 text-red-700 hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 className="size-4" />
                        </button>
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
          <div className="relative w-full max-w-4xl rounded-xl border bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-blue-700" />
                <h3 className="text-lg font-semibold">{form.id ? 'Editar Marcación' : 'Nueva Marcación'}</h3>
              </div>
              <button onClick={closeModal} className="rounded p-1.5 hover:bg-gray-100">
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2">
              {modalError && (
                <div className="md:col-span-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {modalError}
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Empresa *</label>
                <select
                  value={form.company_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, company_id: event.target.value, employee_id: '', time_clock_device_id: '' }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">-- Seleccione --</option>
                  {companies.map((item) => (
                    <option key={item.id} value={item.id}>{item.company_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Empleado *</label>
                <select
                  value={form.employee_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, employee_id: event.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">-- Seleccione --</option>
                  {employeesByCompany.map((item) => (
                    <option key={item.id} value={item.id}>
                      {`${item.employee_lastname || ''} ${item.employee_name || ''}`.trim() || item.employee_code || item.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Fecha/Hora *</label>
                <input
                  type="datetime-local"
                  value={form.punch_datetime}
                  onChange={(event) => setForm((prev) => ({ ...prev, punch_datetime: event.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Punch Key *</label>
                <select
                  value={form.punch_key}
                  onChange={(event) => setForm((prev) => ({ ...prev, punch_key: event.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">-- Seleccione --</option>
                  {form.punch_key && !hasCurrentPunchKeyOption ? (
                    <option value={form.punch_key}>{`Punch Key actual (${form.punch_key})`}</option>
                  ) : null}
                  {punchKeyOptions.map((item) => (
                    <option key={item.id} value={String(item.punchKeyValue)}>
                      {item.lookup_label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Dispositivo</label>
                <select
                  value={form.time_clock_device_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, time_clock_device_id: event.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">-- No aplica --</option>
                  {devicesByCompany.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.device_name || item.device_serial_number || item.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">N° Ticket Servicio</label>
                <input
                  type="number"
                  value={form.service_ticket_number}
                  onChange={(event) => setForm((prev) => ({ ...prev, service_ticket_number: event.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Fuente</label>
                <select
                  value={form.punch_source_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, punch_source_id: event.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">-- No aplica --</option>
                  {punchSources.map((item) => (
                    <option key={item.id} value={item.id}>{item.lookup_label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Estado Marcación</label>
                <select
                  value={form.time_punch_status_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, time_punch_status_id: event.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">-- No aplica --</option>
                  {punchStatuses.map((item) => (
                    <option key={item.id} value={item.id}>{item.lookup_label}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  rows={3}
                />
              </div>

              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                  />
                  Activo
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
              <button onClick={closeModal} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
              <button
                onClick={() => void savePunch()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-[#0074D9] px-4 py-2 text-sm text-white hover:bg-[#0066C0] disabled:opacity-50"
              >
                <Save className="size-4" />
                {saving ? 'Guardando...' : 'Guardar Marcación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
