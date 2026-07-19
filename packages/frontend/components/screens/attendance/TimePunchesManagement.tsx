'use client';

import { buildApiUrl } from '../../../utils/api-config';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { publicApiToken } from '../../../utils/backend/info';
import { formatClientDateTime } from '../../../utils/date-time';
import { StandardDateInput } from '../../ui/standard-date-input';

interface CompanyRow {
  id: string;
  company_name: string;
  company_code: string | null;
}

interface WorkLocationRow {
  id: string;
  company_id: string | null;
  work_location_name: string | null;
  work_location_code: string | null;
}

interface PayrollGroupRow {
  id: string;
  company_id: string | null;
  payroll_group_name: string | null;
  payroll_group_code: string | null;
}

interface InconsistencyRow {
  id: string;
  company_id: string;
  company_name: string | null;
  employee_id: string;
  employee_code: string | null;
  employee_name: string | null;
  employee_lastname: string | null;
  work_location_id: string | null;
  work_location_name: string | null;
  payroll_group_id: string | null;
  payroll_group_name: string | null;
  movement_id: string;
  movement_short_name: string | null;
  movement_name: string | null;
  start_key: number;
  end_key: number;
  missing_punch_key: number;
  inconsistency_type: 'MISSING_START' | 'MISSING_END';
  punch_datetime: string;
  punch_time_zone: string | null;
  detected_punch_key: number;
}

function getToken() {
  return localStorage.getItem('tt-access-token') || publicApiToken;
}

function toDisplayDateTime(value: string | null | undefined, timeZone?: string | null): string {
  return formatClientDateTime(value, 'es-EC', timeZone || undefined);
}

function fullEmployeeName(row: InconsistencyRow): string {
  const label = `${row.employee_lastname || ''} ${row.employee_name || ''}`.trim();
  return label || row.employee_code || row.employee_id;
}

function toIsoDate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(isoDate: string, days: number): string {
  const base = new Date(`${isoDate}T00:00:00`);
  if (!Number.isFinite(base.getTime())) return isoDate;
  base.setDate(base.getDate() + days);
  return toIsoDate(base);
}

export function TimePunchesManagement() {
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [workLocations, setWorkLocations] = useState<WorkLocationRow[]>([]);
  const [payrollGroups, setPayrollGroups] = useState<PayrollGroupRow[]>([]);
  const [rows, setRows] = useState<InconsistencyRow[]>([]);

  const [companyId, setCompanyId] = useState('');
  const [workLocationId, setWorkLocationId] = useState('');
  const [payrollGroupId, setPayrollGroupId] = useState('');
  const [dateFrom, setDateFrom] = useState(() => toIsoDate(new Date()));
  const [dateTo, setDateTo] = useState(() => addDays(toIsoDate(new Date()), 1));
  const [searchTerm, setSearchTerm] = useState('');

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

  const processInconsistencies = async (nextCompanyId?: string) => {
    const effectiveCompanyId = nextCompanyId ?? companyId;
    if (!effectiveCompanyId) {
      setRows([]);
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccess(null);
    try {
      const query = new URLSearchParams();
      query.set('company_id', effectiveCompanyId);
      if (workLocationId) query.set('work_location_id', workLocationId);
      if (payrollGroupId) query.set('payroll_group_id', payrollGroupId);
      if (dateFrom) query.set('date_from', dateFrom);
      if (dateTo) query.set('date_to', dateTo);

      const payload = await request(`/employee-time-punches/debug/unpaired?${query.toString()}`);
      setRows((payload?.inconsistencies || []) as InconsistencyRow[]);
    } catch (err: any) {
      setRows([]);
      setError(err?.message || 'Error procesando depuracion');
    } finally {
      setProcessing(false);
    }
  };

  const sendNotifications = async () => {
    if (!companyId) return;

    setNotifying(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = await request('/employee-time-punches/debug/notify', {
        method: 'POST',
        body: JSON.stringify({
          company_id: companyId,
          work_location_id: workLocationId || null,
          payroll_group_id: payrollGroupId || null,
          date_from: dateFrom || null,
          date_to: dateTo || null,
        }),
      });

      const total = Number(payload?.total_inconsistencies || 0);
      const notified = Number(payload?.notified_count || 0);
      const skipped = Number(payload?.skipped_without_user || 0);
      const skippedAlreadyNotified = Number(payload?.skipped_already_notified || 0);
      setSuccess(
        `Notificaciones enviadas: ${notified}. Inconsistencias evaluadas: ${total}. Ya notificadas previamente: ${skippedAlreadyNotified}. Sin usuario asociado: ${skipped}.`
      );
    } catch (err: any) {
      setError(err?.message || 'Error enviando notificaciones');
    } finally {
      setNotifying(false);
    }
  };

  const loadCatalogs = async () => {
    setLoadingCatalogs(true);
    setError(null);
    try {
      const payload = await request('/employee-time-punches/debug/catalogs');
      const nextCompanies = (payload?.companies || []) as CompanyRow[];
      const nextWorkLocations = (payload?.work_locations || []) as WorkLocationRow[];
      const nextPayrollGroups = (payload?.payroll_groups || []) as PayrollGroupRow[];

      setCompanies(nextCompanies);
      setWorkLocations(nextWorkLocations);
      setPayrollGroups(nextPayrollGroups);

      const defaultCompanyId = companyId || nextCompanies[0]?.id || '';
      setCompanyId(defaultCompanyId);
      setWorkLocationId('');
      setPayrollGroupId('');
      setRows([]);
    } catch (err: any) {
      setError(err?.message || 'Error cargando catalogos de depuracion');
    } finally {
      setLoadingCatalogs(false);
    }
  };

  useEffect(() => {
    void loadCatalogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const workLocationsByCompany = useMemo(() => {
    if (!companyId) return workLocations;
    return workLocations.filter((row) => !row.company_id || row.company_id === companyId);
  }, [companyId, workLocations]);

  const payrollGroupsByCompany = useMemo(() => {
    if (!companyId) return payrollGroups;
    return payrollGroups.filter((row) => !row.company_id || row.company_id === companyId);
  }, [companyId, payrollGroups]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const employee = fullEmployeeName(row).toLowerCase();
      const text = `${employee} ${row.company_name || ''} ${row.work_location_name || ''} ${row.payroll_group_name || ''} ${row.movement_short_name || ''} ${row.movement_name || ''}`.toLowerCase();
      return text.includes(q);
    });
  }, [rows, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Depuracion de Marcaciones</h1>
          <p className="text-muted-foreground mt-1">
            Proceso para detectar marcaciones con pareja no formada segun movimientos configurados.
          </p>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

      <div className="rounded-lg border bg-white p-5">
        <h2 className="mb-1 text-2xl font-semibold">Criterios de Busqueda</h2>
        <p className="text-muted-foreground mb-4">
          Filtra por empresa, localidad y rol de pago para procesar inconsistencias.
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Empresa *</label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={companyId}
              onChange={(event) => {
                const nextCompanyId = event.target.value;
                setCompanyId(nextCompanyId);
                setWorkLocationId('');
                setPayrollGroupId('');
                setRows([]);
              }}
              disabled={loadingCatalogs}
            >
              <option value="">-- Seleccionar --</option>
              {companies.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.company_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Localidad</label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={workLocationId}
              onChange={(event) => {
                setWorkLocationId(event.target.value);
                setRows([]);
              }}
              disabled={loadingCatalogs}
            >
              <option value="">Todos</option>
              {workLocationsByCompany.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.work_location_name || row.work_location_code || row.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Rol de pago</label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={payrollGroupId}
              onChange={(event) => {
                setPayrollGroupId(event.target.value);
                setRows([]);
              }}
              disabled={loadingCatalogs}
            >
              <option value="">Todos</option>
              {payrollGroupsByCompany.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.payroll_group_name || row.payroll_group_code || row.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Desde</label>
            <StandardDateInput
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={dateFrom}
              onValueChange={(nextFrom) => {
                setDateFrom(nextFrom);
                setDateTo((prevTo) => {
                  if (!nextFrom) return prevTo;
                  if (!prevTo) return addDays(nextFrom, 1);
                  return nextFrom > prevTo ? addDays(nextFrom, 1) : prevTo;
                });
                setRows([]);
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Hasta</label>
            <StandardDateInput
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={dateTo}
              onValueChange={(value) => {
                setDateTo(value);
                setRows([]);
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Buscar en resultados</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full rounded-md border py-2 pl-9 pr-3 text-sm"
                placeholder="Empleado, movimiento, localidad..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => void processInconsistencies()}
            disabled={processing || loadingCatalogs || !companyId}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${processing ? 'animate-spin' : ''}`} />
            {processing ? 'Procesando...' : 'Procesar'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Inconsistencias de Marcaciones</h2>
          <div className="inline-flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-900">
            <AlertTriangle className="size-4" />
            {filteredRows.length} inconsistencia(s)
          </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3 text-left">Fecha/Hora</th>
                <th className="py-2 pr-3 text-left">Empleado</th>
                <th className="py-2 pr-3 text-left">Empresa</th>
                <th className="py-2 pr-3 text-left">Localidad</th>
                <th className="py-2 pr-3 text-left">Rol de pago</th>
                <th className="py-2 pr-3 text-left">Movimiento</th>
                <th className="py-2 pr-3 text-left">Clave detectada</th>
                <th className="py-2 pr-3 text-left">Clave faltante</th>
                <th className="py-2 pr-3 text-left">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {loadingCatalogs || processing ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    Procesando depuracion...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    Sin inconsistencias para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 pr-3">{toDisplayDateTime(row.punch_datetime, row.punch_time_zone)}</td>
                    <td className="py-3 pr-3">
                      {fullEmployeeName(row)}
                      {row.employee_code ? <span className="ml-2 text-xs text-gray-500">({row.employee_code})</span> : null}
                    </td>
                    <td className="py-3 pr-3">{row.company_name || '-'}</td>
                    <td className="py-3 pr-3">{row.work_location_name || '-'}</td>
                    <td className="py-3 pr-3">{row.payroll_group_name || '-'}</td>
                    <td className="py-3 pr-3">
                      {(row.movement_short_name || '-') + (row.movement_name ? ` - ${row.movement_name}` : '')}
                    </td>
                    <td className="py-3 pr-3">{row.detected_punch_key}</td>
                    <td className="py-3 pr-3 font-semibold text-red-700">{row.missing_punch_key}</td>
                    <td className="py-3 pr-3">
                      <span className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                        {row.inconsistency_type === 'MISSING_START' ? 'Falta inicio' : 'Falta cierre'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => void sendNotifications()}
            disabled={notifying || processing || loadingCatalogs || !companyId || rows.length === 0}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <AlertTriangle className={`size-4 ${notifying ? 'animate-pulse' : ''}`} />
            {notifying ? 'Enviando...' : 'Enviar notificacion'}
          </button>
        </div>
      </div>
    </div>
  );
}
