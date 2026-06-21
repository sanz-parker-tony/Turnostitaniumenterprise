'use client';

import { buildApiUrl } from '../../utils/api-config';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, RefreshCw, Trash2, Paperclip, Clock3, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/backend/client';
import { formatClientDateTime, getClientTimeZone, toClientDateTimeLocal } from '@/utils/date-time';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LookupItem {
  id: string;
  lookup_key: string;
  lookup_label: string;
  lookup_short_label?: string | null;
  sort_order?: number | null;
}

interface PunchRow {
  id: string;
  company_id: string | null;
  company_name: string | null;
  punch_datetime: string;
  punch_time_zone?: string | null;
  punch_key: number;
  punch_key_label: string | null;
  time_punch_status_id: string | null;
  time_punch_status_label: string | null;
  notes: string | null;
  is_active: boolean;
}

interface RequestRow {
  id: string;
  company_id: string | null;
  company_name: string | null;
  target_punch_id: string | null;
  request_type_id: string;
  request_type_key: string | null;
  request_type_label: string | null;
  reason: string | null;
  current_values: Record<string, any> | null;
  requested_values: Record<string, any> | null;
  request_status_key: string | null;
  request_status_label: string | null;
  supervisor_notes: string | null;
  approved_by_display_name: string | null;
  approved_by_username: string | null;
  approved_at: string | null;
  support_document_name: string | null;
  support_document_mime: string | null;
  created_at: string | null;
}

type PopupMode = 'create' | 'edit';
type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'ALL';

interface EmployeeContext {
  id: string;
  employee_code: string | null;
  employee_name: string | null;
  employee_lastname: string | null;
}

type PopupForm = {
  id: string | null;
  request_type_id: string;
  target_punch_id: string;
  reason: string;
  punch_datetime: string;
  punch_key: string;
  time_punch_status_id: string;
  notes: string;
  is_active: boolean;
};

function normalizeStatus(statusKey: string | null | undefined): string {
  return String(statusKey || '').trim().toUpperCase();
}

function isEditableStatus(statusKey: string | null | undefined): boolean {
  const key = normalizeStatus(statusKey);
  return ['PENDING', 'PENDIENTE', 'IN_REVIEW', 'EN_REVISION', 'REQUESTED', 'SOLICITADO'].includes(key);
}

function statusBadgeClass(statusKey: string | null | undefined): string {
  const key = normalizeStatus(statusKey);
  if (['APPROVED', 'APROBADO'].includes(key)) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (['REJECTED', 'RECHAZADO', 'DENEGADO'].includes(key)) return 'bg-rose-100 text-rose-700 border-rose-200';
  if (['CANCELLED', 'CANCELED', 'CANCELADO'].includes(key)) return 'bg-slate-200 text-slate-700 border-slate-300';
  return 'bg-blue-100 text-blue-700 border-blue-200';
}

function toDateTimeLocal(value: string | null | undefined, timeZone?: string | null): string {
  return toClientDateTimeLocal(value, timeZone || undefined);
}

function formatDateTime(value: string | null | undefined, timeZone?: string | null): string {
  return formatClientDateTime(value, 'es-EC', timeZone || undefined);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultRange() {
  const from = new Date();
  const to = new Date(from);
  to.setDate(to.getDate() + 6);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

function formatPunchLabel(punch: PunchRow): string {
  const label = punch.punch_key_label || `Movimiento ${punch.punch_key}`;
  return `${formatDateTime(punch.punch_datetime, punch.punch_time_zone)} - ${label}${punch.is_active ? '' : ' (inactiva)'}`;
}

function emptyForm(defaultTypeId = ''): PopupForm {
  return {
    id: null,
    request_type_id: defaultTypeId,
    target_punch_id: '',
    reason: '',
    punch_datetime: '',
    punch_key: '',
    time_punch_status_id: '',
    notes: '',
    is_active: true,
  };
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const payload = result.includes(',') ? result.split(',', 2)[1] : result;
      resolve(payload);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo PDF'));
    reader.readAsDataURL(file);
  });
}

export default function KioskTimePunchRequests() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [requestTypes, setRequestTypes] = useState<LookupItem[]>([]);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [punchKeys, setPunchKeys] = useState<LookupItem[]>([]);
  const [punchStatuses, setPunchStatuses] = useState<LookupItem[]>([]);
  const [recentPunches, setRecentPunches] = useState<PunchRow[]>([]);
  const [employee, setEmployee] = useState<EmployeeContext | null>(null);

  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [query, setQuery] = useState('');
  const [rangeFrom, setRangeFrom] = useState(getDefaultRange().from);
  const [rangeTo, setRangeTo] = useState(getDefaultRange().to);

  const [popupOpen, setPopupOpen] = useState(false);
  const [popupMode, setPopupMode] = useState<PopupMode>('create');
  const [popupForm, setPopupForm] = useState<PopupForm>(emptyForm());
  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [clearSupport, setClearSupport] = useState(false);

  const getAuthToken = async (): Promise<string> => {
    const api = createClient();
    const {
      data: { session },
    } = await api.auth.getSession();
    const token =
      session?.access_token ||
      localStorage.getItem('tt-access-token') ||
      localStorage.getItem('access_token');
    if (!token) throw new Error('No hay sesion activa');
    return token;
  };

  const request = async (path: string, init?: RequestInit) => {
    const token = await getAuthToken();
    const response = await fetch(buildApiUrl(`/kiosk${path}`), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
    return payload;
  };

  const loadCatalogs = async () => {
    const payload = await request('/time-punch-requests/catalogs');
    setRequestTypes((payload?.request_types || []) as LookupItem[]);
    setPunchKeys((payload?.punch_keys || []) as LookupItem[]);
    setPunchStatuses((payload?.punch_statuses || []) as LookupItem[]);
    setRecentPunches((payload?.recent_punches || []) as PunchRow[]);
    setEmployee((payload?.employee || null) as EmployeeContext | null);
  };

  const loadRows = async () => {
    const qs = new URLSearchParams();
    qs.set('status', status);
    if (rangeFrom) qs.set('from', rangeFrom);
    if (rangeTo) qs.set('to', rangeTo);
    const payload = await request(`/time-punch-requests?${qs.toString()}`);
    setRows((payload?.requests || []) as RequestRow[]);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadCatalogs(), loadRows()]);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cargar solicitudes de marcacion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading) return;
    void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadCatalogs(), loadRows()]);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo refrescar');
    } finally {
      setRefreshing(false);
    }
  };

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const requested = JSON.stringify(row.requested_values || {}).toLowerCase();
      return (
        String(row.request_type_label || '').toLowerCase().includes(q) ||
        String(row.reason || '').toLowerCase().includes(q) ||
        String(row.company_name || '').toLowerCase().includes(q) ||
        requested.includes(q)
      );
    });
  }, [rows, query]);

  const requestTypeKeyById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of requestTypes) {
      map.set(item.id, String(item.lookup_key || '').toUpperCase());
    }
    return map;
  }, [requestTypes]);

  const punchKeyLabelByValue = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of punchKeys) {
      if (!Number.isFinite(Number(item.sort_order))) continue;
      map.set(Math.trunc(Number(item.sort_order)), item.lookup_label || item.lookup_key);
    }
    return map;
  }, [punchKeys]);

  const openSupportDocument = async (row: RequestRow) => {
    if (!row.support_document_name) return;
    try {
      const token = await getAuthToken();
      const response = await fetch(buildApiUrl(`/kiosk/time-punch-requests/${row.id}/support-document`), {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || `HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const fileUrl = window.URL.createObjectURL(blob);
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(fileUrl), 60_000);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo abrir el adjunto');
    }
  };

  const openCreatePopup = () => {
    const defaultType = requestTypes[0]?.id || '';
    setPopupMode('create');
    setPopupForm(emptyForm(defaultType));
    setSupportFile(null);
    setClearSupport(false);
    setPopupOpen(true);
  };

  const openEditPopup = (row: RequestRow) => {
    const rv = row.requested_values || {};
    const nextForm: PopupForm = {
      id: row.id,
      request_type_id: row.request_type_id,
      target_punch_id: row.target_punch_id || '',
      reason: row.reason || '',
      punch_datetime: toDateTimeLocal(
        rv.punch_datetime || row.current_values?.punch_datetime || null,
        rv.punch_time_zone || row.current_values?.punch_time_zone || null
      ),
      punch_key:
        rv.punch_key !== undefined && rv.punch_key !== null
          ? String(rv.punch_key)
          : row.current_values?.punch_key !== undefined && row.current_values?.punch_key !== null
          ? String(row.current_values?.punch_key)
          : '',
      time_punch_status_id: String(rv.time_punch_status_id || row.current_values?.time_punch_status_id || ''),
      notes: String(rv.notes || row.current_values?.notes || ''),
      is_active:
        rv.is_active !== undefined && rv.is_active !== null
          ? Boolean(rv.is_active)
          : row.current_values?.is_active !== undefined
          ? Boolean(row.current_values?.is_active)
          : true,
    };

    setPopupMode('edit');
    setPopupForm(nextForm);
    setSupportFile(null);
    setClearSupport(false);
    setPopupOpen(true);
  };

  const closePopup = () => {
    setPopupOpen(false);
    setSaving(false);
    setSupportFile(null);
    setClearSupport(false);
  };

  const selectedRequestTypeKey = requestTypeKeyById.get(popupForm.request_type_id) || '';
  const selectedTargetPunch = useMemo(
    () => recentPunches.find((item) => item.id === popupForm.target_punch_id) || null,
    [popupForm.target_punch_id, recentPunches]
  );

  useEffect(() => {
    if (selectedRequestTypeKey !== 'TOGGLE_ACTIVE' || !selectedTargetPunch) return;
    const requestedActive = !selectedTargetPunch.is_active;
    if (popupForm.is_active !== requestedActive) {
      setPopupForm((prev) => ({ ...prev, is_active: requestedActive }));
    }
  }, [selectedRequestTypeKey, selectedTargetPunch?.id, selectedTargetPunch?.is_active, popupForm.is_active]);

  const submitPopup = async () => {
    if (!popupForm.request_type_id) {
      toast.error('Debe seleccionar tipo de solicitud');
      return;
    }
    if (!popupForm.reason.trim()) {
      toast.error('Debe ingresar el motivo');
      return;
    }

    const requestedValues: Record<string, any> = {};
    if (selectedRequestTypeKey === 'CREATE_PUNCH' || selectedRequestTypeKey === 'UPDATE_PUNCH') {
      if (!popupForm.punch_datetime) {
        toast.error('Debe seleccionar fecha y hora de marcacion');
        return;
      }
      if (!popupForm.punch_key) {
        toast.error('Debe seleccionar movimiento');
        return;
      }

      requestedValues.punch_datetime = new Date(popupForm.punch_datetime).toISOString();
      requestedValues.punch_time_zone = getClientTimeZone();
      requestedValues.punch_key = Math.trunc(Number(popupForm.punch_key));
      requestedValues.time_punch_status_id = popupForm.time_punch_status_id || null;
      requestedValues.notes = popupForm.notes.trim() || null;
      requestedValues.is_active = popupForm.is_active;
      if (selectedRequestTypeKey === 'UPDATE_PUNCH') {
        if (!popupForm.target_punch_id) {
          toast.error('Debe seleccionar la marcacion a modificar');
          return;
        }
      }
    }

    if (selectedRequestTypeKey === 'TOGGLE_ACTIVE') {
      if (!popupForm.target_punch_id) {
        toast.error('Debe seleccionar la marcacion objetivo');
        return;
      }
      if (selectedTargetPunch && popupForm.is_active === selectedTargetPunch.is_active) {
        toast.error('La solicitud debe cambiar el estado actual de la marcacion');
        return;
      }
      requestedValues.is_active = popupForm.is_active;
    }

    const payload: Record<string, any> = {
      request_type_id: popupForm.request_type_id,
      target_punch_id: popupForm.target_punch_id || null,
      reason: popupForm.reason.trim(),
      requested_values: requestedValues,
    };

    if (supportFile) {
      payload.support_document_name = supportFile.name;
      payload.support_document_mime = supportFile.type || 'application/pdf';
      payload.support_document_base64 = await fileToBase64(supportFile);
    } else if (popupMode === 'edit' && clearSupport) {
      payload.clear_support_document = true;
    }

    setSaving(true);
    try {
      if (popupMode === 'create') {
        await request('/time-punch-requests', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Solicitud registrada correctamente');
      } else {
        await request(`/time-punch-requests/${popupForm.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('Solicitud actualizada correctamente');
      }
      closePopup();
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo guardar la solicitud');
    } finally {
      setSaving(false);
    }
  };

  const removeRequest = async (row: RequestRow) => {
    if (!window.confirm('Desea cancelar esta solicitud?')) return;
    try {
      await request(`/time-punch-requests/${row.id}`, { method: 'DELETE' });
      toast.success('Solicitud cancelada');
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cancelar la solicitud');
    }
  };

  const renderRequestedSummary = (row: RequestRow) => {
    const rv = row.requested_values || {};
    const movement = rv.punch_key !== undefined ? punchKeyLabelByValue.get(Number(rv.punch_key)) || `#${rv.punch_key}` : null;

    return (
      <div className="space-y-1 text-sm text-slate-700">
        {rv.punch_datetime ? (
          <div>
            <span className="font-medium">Fecha/Hora:</span> {formatDateTime(rv.punch_datetime, rv.punch_time_zone)}
          </div>
        ) : null}
        {movement ? <div><span className="font-medium">Movimiento:</span> {movement}</div> : null}
        {rv.is_active !== undefined ? <div><span className="font-medium">Activo:</span> {rv.is_active ? 'Si' : 'No'}</div> : null}
        {rv.notes ? <div><span className="font-medium">Notas:</span> {String(rv.notes)}</div> : null}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-gray-600">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
        Cargando solicitudes de marcacion...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Solicitar cambios de marcaciones</CardTitle>
              <CardDescription>
                Registra solicitudes para nueva marcacion, cambio de movimiento/hora o activar/desactivar una marcacion.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-sm space-y-1">
                <span className="block text-slate-700">Desde</span>
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(event) => setRangeFrom(event.target.value)}
                  className="h-10 border rounded-md px-3"
                />
              </label>
              <label className="text-sm space-y-1">
                <span className="block text-slate-700">Hasta</span>
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(event) => setRangeTo(event.target.value)}
                  className="h-10 border rounded-md px-3"
                />
              </label>
              <Button onClick={() => void refresh()} disabled={refreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Consultar
              </Button>
            </div>
            <Button onClick={openCreatePopup}>
              <Plus className="mr-2 h-4 w-4" /> Nueva solicitud
            </Button>
          </div>

          {employee ? (
            <div className="rounded-xl border bg-slate-50 px-4 py-3 text-sm">
              <span className="font-semibold">
                {(employee.employee_name || '').trim()} {(employee.employee_lastname || '').trim()}
              </span>
              <span className="mx-2 text-slate-400">·</span>
              <span className="text-slate-700">Código: {employee.employee_code || '-'}</span>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={status === 'PENDING' ? 'default' : 'outline'} onClick={() => setStatus('PENDING')}>Pendientes</Button>
            <Button size="sm" variant={status === 'APPROVED' ? 'default' : 'outline'} onClick={() => setStatus('APPROVED')}>Aprobadas</Button>
            <Button size="sm" variant={status === 'REJECTED' ? 'default' : 'outline'} onClick={() => setStatus('REJECTED')}>Denegadas</Button>
            <Button size="sm" variant={status === 'CANCELLED' ? 'default' : 'outline'} onClick={() => setStatus('CANCELLED')}>Canceladas</Button>
            <Button size="sm" variant={status === 'ALL' ? 'default' : 'outline'} onClick={() => setStatus('ALL')}>Todas</Button>
          </div>

          <input
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por tipo, motivo o empresa..."
          />

          {filteredRows.length === 0 ? (
            <div className="rounded-lg border bg-slate-50 p-5 text-sm text-slate-600">No hay solicitudes para el filtro actual.</div>
          ) : (
            <div className="space-y-3">
              {filteredRows.map((row) => {
                const editable = isEditableStatus(row.request_status_key);
                return (
                  <div key={row.id} className="rounded-lg border bg-white p-4">
                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900">{row.request_type_label || '-'}</div>
                        <div className="text-xs text-slate-500">Creada: {formatDateTime(row.created_at)} - Empresa: {row.company_name || '-'}</div>
                      </div>
                      <span className={`rounded border px-2 py-1 text-xs font-medium ${statusBadgeClass(row.request_status_key)}`}>
                        {row.request_status_label || '-'}
                      </span>
                    </div>

                    <div className="mb-3 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Motivo:</span> {row.reason || '-'}
                    </div>

                    {row.target_punch_id ? (
                      <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                        <span className="font-medium text-slate-800">Marcacion objetivo:</span>{' '}
                        {formatDateTime((row.current_values || {}).punch_datetime || null, (row.current_values || {}).punch_time_zone || null)}
                      </div>
                    ) : null}

                    <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-3">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-900">Valores solicitados</div>
                      {renderRequestedSummary(row)}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      {row.support_document_name ? (
                        <button
                          type="button"
                          onClick={() => void openSupportDocument(row)}
                          className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700 hover:bg-blue-100"
                          title={row.support_document_name || ''}
                        >
                          <Paperclip className="h-3.5 w-3.5" /> Ver adjunto
                        </button>
                      ) : (
                        <span className="text-slate-500">Sin adjunto</span>
                      )}

                      {editable ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openEditPopup(row)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void removeRequest(row)}>
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> Cancelar
                          </Button>
                        </>
                      ) : (
                        <div className="text-xs text-slate-600">
                          Decision: {row.approved_at ? formatDateTime(row.approved_at) : '-'} - {row.supervisor_notes || '-'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={popupOpen} onOpenChange={(next) => !saving && setPopupOpen(next)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{popupMode === 'create' ? 'Nueva solicitud de marcacion' : 'Editar solicitud de marcacion'}</DialogTitle>
            <DialogDescription>
              Define el tipo de solicitud y los valores que el supervisor debe aprobar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Tipo de solicitud</span>
              <select
                className="w-full rounded border border-slate-300 px-3 py-2"
                value={popupForm.request_type_id}
                onChange={(e) =>
                  setPopupForm((prev) => ({
                    ...prev,
                    request_type_id: e.target.value,
                    target_punch_id: '',
                  }))
                }
                disabled={popupMode === 'edit'}
              >
                <option value="">Seleccione...</option>
                {requestTypes.map((item) => (
                  <option key={item.id} value={item.id}>{item.lookup_label}</option>
                ))}
              </select>
            </label>

            {(selectedRequestTypeKey === 'UPDATE_PUNCH' || selectedRequestTypeKey === 'TOGGLE_ACTIVE') ? (
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Marcacion objetivo</span>
                <select
                  className="w-full rounded border border-slate-300 px-3 py-2"
                  value={popupForm.target_punch_id}
                  onChange={(e) => {
                    const targetPunchId = e.target.value;
                    const punch = recentPunches.find((item) => item.id === targetPunchId) || null;
                    setPopupForm((prev) => ({
                      ...prev,
                      target_punch_id: targetPunchId,
                      is_active: selectedRequestTypeKey === 'TOGGLE_ACTIVE' && punch ? !punch.is_active : prev.is_active,
                    }));
                  }}
                >
                  <option value="">Seleccione...</option>
                  {recentPunches.map((item) => (
                    <option key={item.id} value={item.id}>{formatPunchLabel(item)}</option>
                  ))}
                </select>
              </label>
            ) : <div />}

            {(selectedRequestTypeKey === 'CREATE_PUNCH' || selectedRequestTypeKey === 'UPDATE_PUNCH') ? (
              <>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Fecha y hora</span>
                  <input
                    type="datetime-local"
                    className="w-full rounded border border-slate-300 px-3 py-2"
                    value={popupForm.punch_datetime}
                    onChange={(e) => setPopupForm((prev) => ({ ...prev, punch_datetime: e.target.value }))}
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Movimiento</span>
                  <select
                    className="w-full rounded border border-slate-300 px-3 py-2"
                    value={popupForm.punch_key}
                    onChange={(e) => setPopupForm((prev) => ({ ...prev, punch_key: e.target.value }))}
                  >
                    <option value="">Seleccione...</option>
                    {punchKeys.map((item) => (
                      <option key={item.id} value={String(item.sort_order || '')}>
                        {item.lookup_label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Estado de marcacion (opcional)</span>
                  <select
                    className="w-full rounded border border-slate-300 px-3 py-2"
                    value={popupForm.time_punch_status_id}
                    onChange={(e) => setPopupForm((prev) => ({ ...prev, time_punch_status_id: e.target.value }))}
                  >
                    <option value="">Sin cambio</option>
                    {punchStatuses.map((item) => (
                      <option key={item.id} value={item.id}>{item.lookup_label}</option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}

            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Motivo</span>
              <textarea
                className="min-h-[84px] w-full rounded border border-slate-300 px-3 py-2"
                value={popupForm.reason}
                onChange={(e) => setPopupForm((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Describe por que solicitas este cambio"
              />
            </label>

            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Notas de la marcacion (opcional)</span>
              <textarea
                className="min-h-[72px] w-full rounded border border-slate-300 px-3 py-2"
                value={popupForm.notes}
                onChange={(e) => setPopupForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={popupForm.is_active}
                onChange={(e) => setPopupForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                disabled={selectedRequestTypeKey === 'TOGGLE_ACTIVE'}
              />
              <span className="text-slate-700">
                {selectedRequestTypeKey === 'TOGGLE_ACTIVE'
                  ? popupForm.is_active
                    ? 'Solicitar activacion de la marcacion'
                    : 'Solicitar inactivacion de la marcacion'
                  : 'Marcacion activa'}
              </span>
            </label>

            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Adjuntar respaldo PDF (opcional)</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setSupportFile(file);
                  if (file) setClearSupport(false);
                }}
              />
            </label>

            {popupMode === 'edit' ? (
              <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
                <input
                  type="checkbox"
                  checked={clearSupport}
                  onChange={(e) => setClearSupport(e.target.checked)}
                />
                <span className="text-slate-700">Quitar adjunto actual</span>
              </label>
            ) : null}

            {selectedTargetPunch ? (
              <div className="md:col-span-2 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <div className="mb-1 font-semibold text-slate-900">Marcacion actual seleccionada</div>
                <div className="flex items-center gap-2">
                  <Clock3 className="h-3.5 w-3.5" />
                  <span>{formatPunchLabel(selectedTargetPunch)}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-500">se aplicara al aprobar</span>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closePopup} disabled={saving}>Cancelar</Button>
            <Button onClick={() => void submitPopup()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {popupMode === 'create' ? 'Enviar solicitud' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
