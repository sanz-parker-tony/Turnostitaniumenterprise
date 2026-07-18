'use client';

import { buildApiUrl } from '../../utils/api-config';
import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Loader2, Pencil, Plus, RefreshCw, Trash2, FileText, Eye, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/backend/client';
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

interface CatalogItem {
  id: string;
  justification_name?: string;
  attendance_event_id?: string | null;
  event_name?: string;
  lookup_label?: string;
  lookup_key?: string;
}

interface RequestRow {
  id: string;
  company_name: string | null;
  justification_type_id: string;
  justification_name: string | null;
  attendance_event_id: string;
  event_name: string | null;
  justify_method_id: string | null;
  justify_method_key: string | null;
  justify_method_label: string | null;
  start_datetime: string;
  end_datetime: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  support_document_path: string | null;
  support_document_name: string | null;
  support_document_mime: string | null;
  request_status_key: string | null;
  request_status_label: string | null;
  approval_notes: string | null;
  approved_by: string | null;
  approved_by_display_name: string | null;
  approved_by_username: string | null;
  approved_at: string | null;
}

type PopupMode = 'create' | 'edit' | 'view';

interface EmployeeContext {
  id: string;
  company_id?: string | null;
  company_name?: string | null;
  employee_code?: string | null;
  employee_name?: string | null;
  employee_lastname?: string | null;
}

interface DiscountMethodRule {
  justification_type_id: string | null;
  attendance_event_id: string | null;
  justify_method_id: string;
  sort_order: number;
}

type PopupForm = {
  id: string | null;
  justification_type_id: string;
  attendance_event_id: string;
  justify_method_id: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  notes: string;
};

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function toDateOnly(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function getDefaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

function normalizeStatus(statusKey: string | null | undefined, statusLabel: string | null | undefined): string {
  return String(statusKey || statusLabel || '').trim().toUpperCase();
}

function isEditableStatus(statusKey: string | null | undefined, statusLabel: string | null | undefined): boolean {
  const key = normalizeStatus(statusKey, statusLabel);
  return ['PENDING', 'PENDIENTE', 'ENVIADA', 'ENVIADO', 'SENT', 'REQUESTED', 'SOLICITADO'].includes(key);
}

function isReviewedStatus(statusKey: string | null | undefined, statusLabel: string | null | undefined): boolean {
  const key = normalizeStatus(statusKey, statusLabel);
  return ['APPROVED', 'APROBADO', 'REJECTED', 'RECHAZADO', 'DENEGADO'].includes(key);
}

function statusBadgeClass(statusKey: string | null | undefined, statusLabel: string | null | undefined): string {
  const key = normalizeStatus(statusKey, statusLabel);
  if (['APPROVED', 'APROBADO'].includes(key)) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (['REJECTED', 'RECHAZADO', 'DENEGADO'].includes(key)) return 'bg-rose-100 text-rose-700 border-rose-200';
  if (['IN_REVIEW', 'EN_REVISION', 'EN_REVISIÓN'].includes(key)) return 'bg-amber-100 text-amber-700 border-amber-200';
  if (isEditableStatus(statusKey, statusLabel)) return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return date.toLocaleString('es-EC');
}

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return date.toLocaleDateString('es-EC');
}

function normalizeTimeForApi(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const strict24 = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (strict24) {
    return `${String(Number(strict24[1])).padStart(2, '0')}:${strict24[2]}`;
  }
  const ampm = raw.match(/^(\d{1,2}):([0-5]\d)\s*([AaPp][Mm])$/);
  if (ampm) {
    let hour = Number(ampm[1]);
    const minute = ampm[2];
    const marker = ampm[3].toUpperCase();
    if (marker === 'AM') {
      if (hour === 12) hour = 0;
    } else if (hour !== 12) {
      hour += 12;
    }
    return `${String(hour).padStart(2, '0')}:${minute}`;
  }
  return raw;
}

export default function KioskRequests() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [justifications, setJustifications] = useState<CatalogItem[]>([]);
  const [events, setEvents] = useState<CatalogItem[]>([]);
  const [discountMethods, setDiscountMethods] = useState<CatalogItem[]>([]);
  const [discountMethodRules, setDiscountMethodRules] = useState<DiscountMethodRule[]>([]);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [employee, setEmployee] = useState<EmployeeContext | null>(null);

  const [rangeFrom, setRangeFrom] = useState(getDefaultRange().from);
  const [rangeTo, setRangeTo] = useState(getDefaultRange().to);

  const [popupOpen, setPopupOpen] = useState(false);
  const [popupMode, setPopupMode] = useState<PopupMode>('create');
  const [popupForm, setPopupForm] = useState<PopupForm>({
    id: null,
    justification_type_id: '',
    attendance_event_id: '',
    justify_method_id: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    notes: '',
  });
  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [removeSupport, setRemoveSupport] = useState(false);
  const [editingRequestSnapshot, setEditingRequestSnapshot] = useState<RequestRow | null>(null);

  const getAuthToken = async (): Promise<string> => {
    const api = createClient();
    const { data: { session } } = await api.auth.getSession();
    const token =
      session?.access_token ||
      localStorage.getItem('tt-access-token') ||
      localStorage.getItem('access_token');
    if (!token) throw new Error('No hay sesión activa');
    return token;
  };

  const request = async (path: string, init?: RequestInit) => {
    const token = await getAuthToken();

    const doFetch = async (bearer: string) => {
      const response = await fetch(buildApiUrl(`${path}`), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearer}`,
          ...(init?.headers || {}),
        },
      });
      const payload = await response.json().catch(() => ({}));
      return { response, payload };
    };

    let { response, payload } = await doFetch(token);
    if (response.status === 401 && session?.access_token && token !== session.access_token) {
      const retry = await doFetch(session.access_token);
      response = retry.response;
      payload = retry.payload;
    }
    if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
    return payload;
  };

  const openSupportDocument = async (row: RequestRow) => {
    if (!row.support_document_name) return;
    try {
      const token = await getAuthToken();
      const response = await fetch(buildApiUrl(`/kiosk/requests/${row.id}/support-document`), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
      toast.error(err?.message || 'No se pudo abrir el archivo adjunto');
    }
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const payload = result.includes(',') ? result.split(',', 2)[1] : result;
        resolve(payload);
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo PDF'));
      reader.readAsDataURL(file);
    });

  const loadCatalogs = async () => {
    const payload = await request('/kiosk/requests/catalogs');
    const nextJustifications = (payload?.justification_types || []) as CatalogItem[];
    const nextEvents = (payload?.attendance_events || []) as CatalogItem[];
    const nextDiscountMethods = (payload?.discount_methods || payload?.transaction_types || []) as CatalogItem[];

    setJustifications(nextJustifications);
    setEvents(nextEvents);
    setDiscountMethods(nextDiscountMethods);
    setDiscountMethodRules((payload?.discount_method_rules || []) as DiscountMethodRule[]);
    setEmployee((payload?.employee || null) as EmployeeContext | null);
  };

  const loadRows = async () => {
    const qs = new URLSearchParams();
    if (rangeFrom) qs.set('from', rangeFrom);
    if (rangeTo) qs.set('to', rangeTo);
    const payload = await request(`/kiosk/requests?${qs.toString()}`);
    setRows((payload?.requests || []) as RequestRow[]);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadCatalogs(), loadRows()]);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cargar justificaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshRows = async () => {
    setRefreshing(true);
    try {
      await loadRows();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo refrescar');
    } finally {
      setRefreshing(false);
    }
  };

  const discountMethodLabelById = useMemo(() => {
    const map = new Map<string, string>();
    discountMethods.forEach((item) => {
      if (item.id) map.set(item.id, item.lookup_label || item.lookup_key || item.id);
    });
    return map;
  }, [discountMethods]);

  const mobileHistoryRows = useMemo(() => rows.slice(0, 10), [rows]);

  const allowedDiscountMethods = useMemo(() => {
    const justificationRules = discountMethodRules.filter(
      (rule) => rule.justification_type_id === popupForm.justification_type_id
    );
    const eventRules = discountMethodRules.filter(
      (rule) => rule.attendance_event_id === popupForm.attendance_event_id
    );
    const applicableRules = justificationRules.length > 0 ? justificationRules : eventRules;
    if (applicableRules.length === 0) return discountMethods;

    const allowedIds = new Set(applicableRules.map((rule) => rule.justify_method_id));
    return discountMethods.filter((method) => allowedIds.has(method.id));
  }, [
    discountMethods,
    discountMethodRules,
    popupForm.justification_type_id,
    popupForm.attendance_event_id,
  ]);

  useEffect(() => {
    if (popupMode === 'view' || allowedDiscountMethods.length === 0) return;
    if (allowedDiscountMethods.some((method) => method.id === popupForm.justify_method_id)) return;
    setPopupForm((prev) => ({
      ...prev,
      justify_method_id: allowedDiscountMethods[0]?.id || '',
    }));
  }, [allowedDiscountMethods, popupForm.justify_method_id, popupMode]);

  const openCreatePopup = () => {
    const firstJustification = justifications[0]?.id || '';
    const firstEvent = justifications[0]?.attendance_event_id || events[0]?.id || '';
    const firstDiscount = discountMethods[0]?.id || '';

    setPopupMode('create');
    setPopupForm({
      id: null,
      justification_type_id: firstJustification,
      attendance_event_id: firstEvent,
      justify_method_id: firstDiscount,
      start_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      notes: '',
    });
    setSupportFile(null);
    setRemoveSupport(false);
    setEditingRequestSnapshot(null);
    setPopupOpen(true);
  };

  const openEditPopup = (row: RequestRow) => {
    setPopupMode('edit');
    setPopupForm({
      id: row.id,
      justification_type_id: row.justification_type_id,
      attendance_event_id: row.attendance_event_id,
      justify_method_id: row.justify_method_id || '',
      start_date: toDateOnly(row.start_datetime),
      end_date: toDateOnly(row.end_datetime),
      start_time: row.start_time || toDateTimeLocal(row.start_datetime).slice(11, 16) || '',
      end_time: row.end_time || toDateTimeLocal(row.end_datetime).slice(11, 16) || '',
      notes: row.notes || '',
    });
    setSupportFile(null);
    setRemoveSupport(false);
    setEditingRequestSnapshot(row);
    setPopupOpen(true);
  };

  const openViewPopup = (row: RequestRow) => {
    setPopupMode('view');
    setPopupForm({
      id: row.id,
      justification_type_id: row.justification_type_id,
      attendance_event_id: row.attendance_event_id,
      justify_method_id: row.justify_method_id || '',
      start_date: toDateOnly(row.start_datetime),
      end_date: toDateOnly(row.end_datetime),
      start_time: row.start_time || toDateTimeLocal(row.start_datetime).slice(11, 16) || '',
      end_time: row.end_time || toDateTimeLocal(row.end_datetime).slice(11, 16) || '',
      notes: row.notes || '',
    });
    setSupportFile(null);
    setRemoveSupport(false);
    setEditingRequestSnapshot(row);
    setPopupOpen(true);
  };

  const closePopup = () => {
    if (saving) return;
    setPopupOpen(false);
    setSupportFile(null);
    setRemoveSupport(false);
    setEditingRequestSnapshot(null);
  };

  const onChangeJustification = (value: string) => {
    const found = justifications.find((item) => item.id === value);
    setPopupForm((prev) => ({
      ...prev,
      justification_type_id: value,
      attendance_event_id: found?.attendance_event_id || prev.attendance_event_id,
    }));
  };

  const submitPopup = async () => {
    if (!popupForm.justification_type_id) return toast.error('Selecciona tipo de justificación');
    if (!popupForm.attendance_event_id) return toast.error('Selecciona evento de asistencia');
    if (!popupForm.justify_method_id) return toast.error('Selecciona método de descuento');
    if (!popupForm.start_date) return toast.error('Selecciona fecha de inicio');
    if (!popupForm.end_date) return toast.error('Selecciona fecha de fin');
    if (supportFile && supportFile.type !== 'application/pdf') return toast.error('El respaldo debe ser PDF');

    const resolvedStartTime = normalizeTimeForApi(popupForm.start_time || '00:00') || '00:00';
    const resolvedEndTime = normalizeTimeForApi(popupForm.end_time || '23:59') || '23:59';
    const startDateTimeIso = new Date(`${popupForm.start_date}T${resolvedStartTime}:00`).toISOString();
    const endDateTimeIso = new Date(`${popupForm.end_date}T${resolvedEndTime}:00`).toISOString();

    setSaving(true);
    try {
      const supportDocumentBase64 = supportFile ? await fileToBase64(supportFile) : null;

      if (popupMode === 'create') {
        await request('/kiosk/requests', {
          method: 'POST',
          body: JSON.stringify({
            justification_type_id: popupForm.justification_type_id,
            attendance_event_id: popupForm.attendance_event_id,
            justify_method_id: popupForm.justify_method_id,
            start_datetime: startDateTimeIso,
            end_datetime: endDateTimeIso,
            start_time: normalizeTimeForApi(popupForm.start_time || '') || null,
            end_time: normalizeTimeForApi(popupForm.end_time || '') || null,
            notes: popupForm.notes || null,
            support_document_name: supportFile?.name || null,
            support_document_mime: supportFile?.type || null,
            support_document_base64: supportDocumentBase64,
          }),
        });
        toast.success('Justificación enviada');
      } else {
        if (!popupForm.id) throw new Error('No se pudo identificar la solicitud a editar');
        await request(`/kiosk/requests/${popupForm.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            justification_type_id: popupForm.justification_type_id,
            attendance_event_id: popupForm.attendance_event_id,
            justify_method_id: popupForm.justify_method_id,
            start_datetime: startDateTimeIso,
            end_datetime: endDateTimeIso,
            start_time: normalizeTimeForApi(popupForm.start_time || '') || null,
            end_time: normalizeTimeForApi(popupForm.end_time || '') || null,
            notes: popupForm.notes || null,
            remove_support_document: removeSupport,
            support_document_name: supportFile?.name || null,
            support_document_mime: supportFile?.type || null,
            support_document_base64: supportDocumentBase64,
          }),
        });
        toast.success('Justificación actualizada');
      }

      closePopup();
      await loadRows();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo guardar la solicitud');
    } finally {
      setSaving(false);
    }
  };

  const deleteRequest = async (row: RequestRow): Promise<boolean> => {
    if (!window.confirm('¿Confirmas eliminar esta solicitud de justificación?')) return false;

    setSaving(true);
    try {
      await request(`/kiosk/requests/${row.id}`, { method: 'DELETE' });
      toast.success('Justificación eliminada');
      await loadRows();
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo eliminar la solicitud');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Justificar ausentismo</CardTitle>
              <CardDescription>
                Historial de solicitudes de justificación con estado y trazabilidad de aprobación.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 pt-0 sm:px-6 sm:pb-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex w-full flex-wrap items-end gap-2 lg:w-auto">
              <label className="w-full space-y-1 text-sm min-[420px]:w-auto">
                <span className="block text-slate-700">Desde</span>
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(event) => setRangeFrom(event.target.value)}
                  className="h-10 w-full rounded-md border px-3"
                />
              </label>
              <label className="w-full space-y-1 text-sm min-[420px]:w-auto">
                <span className="block text-slate-700">Hasta</span>
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(event) => setRangeTo(event.target.value)}
                  className="h-10 w-full rounded-md border px-3"
                />
              </label>
              <Button
                className="w-full min-[420px]:w-auto"
                onClick={() => void refreshRows()}
                disabled={refreshing || saving}
              >
                {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Consultar
              </Button>
            </div>
            <div className="flex w-full items-end gap-2 sm:w-auto">
              <Button className="w-full sm:w-auto" onClick={openCreatePopup} disabled={saving || loading}>
                <Plus className="w-4 h-4 mr-2" />
                Nueva justificación
              </Button>
            </div>
          </div>
          {employee ? (
            <div className="hidden rounded-xl border bg-slate-50 px-4 py-3 text-sm sm:block">
              <span className="font-semibold">
                {(employee.employee_name || '').trim()} {(employee.employee_lastname || '').trim()}
              </span>
              <span className="mx-2 text-slate-400">·</span>
              <span className="text-slate-700">Código: {employee.employee_code || '-'}</span>
            </div>
          ) : null}

          {loading ? (
            <div className="py-14 flex justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-600 py-8 text-center">No hay solicitudes de justificación en el rango seleccionado.</p>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border bg-white md:hidden">
                <div className="border-b bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Últimas 10 justificaciones</p>
                </div>
                <div className="divide-y">
                  {mobileHistoryRows.map((row) => (
                    <button
                      key={`mobile-${row.id}`}
                      type="button"
                      onClick={() => openViewPopup(row)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                    >
                      <span className="w-[4.5rem] shrink-0 text-[10px] font-medium text-slate-500">
                        {formatDateOnly(row.start_datetime)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-blue-700 underline-offset-2 group-hover:underline">
                        {row.justification_name || row.event_name || 'Justificación'}
                      </span>
                      <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] ${statusBadgeClass(row.request_status_key, row.request_status_label)}`}>
                        {row.request_status_label || row.request_status_key || '-'}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    </button>
                  ))}
                </div>
                {rows.length > mobileHistoryRows.length ? (
                  <p className="border-t bg-slate-50 px-3 py-1.5 text-[10px] text-slate-500">
                    Ajusta el rango de fechas para consultar justificaciones anteriores.
                  </p>
                ) : null}
              </div>

              <div className="hidden overflow-x-auto border rounded-lg md:block">
              <table className="min-w-[1100px] w-full table-fixed text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="text-left px-3 py-2 w-[9%]">Desde</th>
                    <th className="text-left px-3 py-2 w-[9%]">Hasta</th>
                    <th className="text-left px-3 py-2 w-[15%]">Justificación</th>
                    <th className="text-left px-3 py-2 w-[13%]">Evento</th>
                    <th className="text-left px-3 py-2 w-[13%]">Método descuento</th>
                    <th className="text-left px-3 py-2 w-[16%]">Motivo</th>
                    <th className="text-center px-2 py-2 w-[4%]">Adjunto</th>
                    <th className="text-left px-3 py-2 w-[9%]">Estado</th>
                    <th className="text-right px-3 py-2 w-[8%]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const canModify = isEditableStatus(row.request_status_key, row.request_status_label);
                    const canViewReviewed = isReviewedStatus(row.request_status_key, row.request_status_label);
                    return (
                      <tr key={row.id} className="border-t align-top">
                        <td className="px-3 py-2 break-words" title={formatDateTime(row.start_datetime)}>{formatDateTime(row.start_datetime)}</td>
                        <td className="px-3 py-2 break-words" title={formatDateTime(row.end_datetime)}>{formatDateTime(row.end_datetime)}</td>
                        <td className="px-3 py-2 break-words">{row.justification_name || '-'}</td>
                        <td className="px-3 py-2 break-words">{row.event_name || '-'}</td>
                        <td className="px-3 py-2 break-words">
                          {row.justify_method_label || (row.justify_method_id ? discountMethodLabelById.get(row.justify_method_id) : null) || row.justify_method_key || '-'}
                        </td>
                        <td className="px-3 py-2 break-words">{row.notes || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap text-center">
                          {row.support_document_name ? (
                            <button
                              type="button"
                              onClick={() => void openSupportDocument(row)}
                              disabled={saving}
                              className="inline-flex items-center justify-center text-blue-700 hover:opacity-80 disabled:text-slate-400"
                              title={row.support_document_name}
                              aria-label={`Abrir adjunto ${row.support_document_name}`}
                            >
                              {String(row.support_document_mime || '').toLowerCase() === 'application/pdf' ? (
                                <FileText className="w-3.5 h-3.5" />
                              ) : (
                                <Paperclip className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`inline-flex rounded-full border px-2 py-1 text-xs ${statusBadgeClass(row.request_status_key, row.request_status_label)}`}>
                            {row.request_status_label || row.request_status_key || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex justify-end gap-1 flex-nowrap">
                            {canViewReviewed ? (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openViewPopup(row)}
                                disabled={saving}
                                title="Ver detalle de solicitud y resolución"
                              >
                                <Eye className="w-4 h-4 text-slate-700" />
                              </Button>
                            ) : null}
                            {!canViewReviewed && canModify ? (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openEditPopup(row)}
                                  disabled={saving}
                                  title="Editar solicitud enviada"
                                >
                                  <Pencil className="w-4 h-4 text-blue-600" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => void deleteRequest(row)}
                                  disabled={saving}
                                  title="Eliminar solicitud enviada"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={popupOpen} onOpenChange={(open) => (!open ? closePopup() : null)}>
        <DialogContent
          className={
            popupMode === 'view'
              ? 'h-[94svh] w-[96vw] !max-w-[1280px] grid-rows-[auto_minmax(0,1fr)_auto] !overflow-hidden p-3 sm:!max-w-[1280px] sm:p-5'
              : 'w-[96vw] !max-w-[1280px] sm:!max-w-[1280px]'
          }
        >
          <DialogHeader>
            <DialogTitle>
              {popupMode === 'create'
                ? 'Nueva justificación de ausentismo'
                : popupMode === 'edit'
                ? 'Editar justificación de ausentismo'
                : 'Detalle de justificación de ausentismo'}
            </DialogTitle>
            <DialogDescription>
              No se muestran campos de estado/aprobación porque esos datos los gestiona el Supervisor.
            </DialogDescription>
          </DialogHeader>

          {popupMode === 'view' && editingRequestSnapshot ? (
            <div className="min-h-0 overflow-hidden rounded-xl border bg-slate-50 p-2.5 sm:p-4">
              <dl className="grid h-full min-h-0 grid-cols-2 content-start gap-2 text-xs sm:grid-cols-4 sm:text-sm">
                <div className="col-span-2 flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2 sm:col-span-4">
                  <dt className="font-medium text-slate-500">Estado</dt>
                  <dd>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusBadgeClass(editingRequestSnapshot.request_status_key, editingRequestSnapshot.request_status_label)}`}>
                      {editingRequestSnapshot.request_status_label || editingRequestSnapshot.request_status_key || '-'}
                    </span>
                  </dd>
                </div>
                <div className="rounded-lg bg-white px-2.5 py-2 sm:col-span-2">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Justificación</dt>
                  <dd className="mt-0.5 truncate font-semibold text-slate-900">{editingRequestSnapshot.justification_name || '-'}</dd>
                </div>
                <div className="rounded-lg bg-white px-2.5 py-2 sm:col-span-2">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Evento</dt>
                  <dd className="mt-0.5 truncate font-semibold text-slate-900">{editingRequestSnapshot.event_name || '-'}</dd>
                </div>
                <div className="rounded-lg bg-white px-2.5 py-2 sm:col-span-2">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Desde</dt>
                  <dd className="mt-0.5 text-slate-800">{formatDateTime(editingRequestSnapshot.start_datetime)}</dd>
                </div>
                <div className="rounded-lg bg-white px-2.5 py-2 sm:col-span-2">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Hasta</dt>
                  <dd className="mt-0.5 text-slate-800">{formatDateTime(editingRequestSnapshot.end_datetime)}</dd>
                </div>
                <div className="col-span-2 rounded-lg bg-white px-2.5 py-2 sm:col-span-4">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Método de descuento</dt>
                  <dd className="mt-0.5 truncate text-slate-800">
                    {editingRequestSnapshot.justify_method_label ||
                      (editingRequestSnapshot.justify_method_id
                        ? discountMethodLabelById.get(editingRequestSnapshot.justify_method_id)
                        : null) ||
                      editingRequestSnapshot.justify_method_key ||
                      '-'}
                  </dd>
                </div>
                <div className="col-span-2 min-h-0 rounded-lg bg-white px-2.5 py-2 sm:col-span-4">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Motivo / notas</dt>
                  <dd className="mt-0.5 max-h-16 overflow-y-auto whitespace-pre-wrap break-words text-slate-800">
                    {editingRequestSnapshot.notes || '-'}
                  </dd>
                </div>
                <div className="col-span-2 rounded-lg bg-white px-2.5 py-2 sm:col-span-2">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Aprobador</dt>
                  <dd className="mt-0.5 truncate text-slate-800">
                    {editingRequestSnapshot.approved_by_display_name ||
                      editingRequestSnapshot.approved_by_username ||
                      editingRequestSnapshot.approved_by ||
                      'Pendiente'}
                  </dd>
                </div>
                <div className="col-span-2 rounded-lg bg-white px-2.5 py-2 sm:col-span-2">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Fecha de decisión</dt>
                  <dd className="mt-0.5 text-slate-800">{formatDateTime(editingRequestSnapshot.approved_at)}</dd>
                </div>
                <div className="col-span-2 rounded-lg bg-white px-2.5 py-2 sm:col-span-4">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Resolución</dt>
                  <dd className="mt-0.5 max-h-12 overflow-y-auto whitespace-pre-wrap break-words text-slate-800">
                    {editingRequestSnapshot.approval_notes || 'Sin resolución todavía.'}
                  </dd>
                </div>
                {editingRequestSnapshot.support_document_name ? (
                  <div className="col-span-2 sm:col-span-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void openSupportDocument(editingRequestSnapshot)}
                      disabled={saving}
                    >
                      <Paperclip className="h-4 w-4" />
                      Ver respaldo PDF
                    </Button>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}

          <div className={popupMode === 'view' ? 'hidden' : 'grid grid-cols-1 md:grid-cols-12 gap-3'}>
            <label className="text-sm space-y-1 md:col-span-4">
              <span className="block text-slate-700">Tipo de justificación</span>
              <select
                value={popupForm.justification_type_id}
                onChange={(event) => onChangeJustification(event.target.value)}
                className="h-10 border rounded-md px-3 w-full"
                disabled={saving || popupMode === 'view'}
              >
                <option value="">Seleccionar...</option>
                {justifications.map((item) => (
                  <option key={item.id} value={item.id}>{item.justification_name || item.id}</option>
                ))}
              </select>
            </label>

            <label className="text-sm space-y-1 md:col-span-4">
              <span className="block text-slate-700">Evento de asistencia</span>
              <select
                value={popupForm.attendance_event_id}
                onChange={(event) => setPopupForm((prev) => ({ ...prev, attendance_event_id: event.target.value }))}
                className="h-10 border rounded-md px-3 w-full"
                disabled={saving || popupMode === 'view'}
              >
                <option value="">Seleccionar...</option>
                {events.map((item) => (
                  <option key={item.id} value={item.id}>{item.event_name || item.id}</option>
                ))}
              </select>
            </label>

            <label className="text-sm space-y-1 md:col-span-4">
              <span className="block text-slate-700">Método de descuento</span>
              <select
                value={popupForm.justify_method_id}
                onChange={(event) => setPopupForm((prev) => ({ ...prev, justify_method_id: event.target.value }))}
                className="h-10 border rounded-md px-3 w-full"
                disabled={saving || popupMode === 'view'}
              >
                <option value="">Seleccionar...</option>
                {allowedDiscountMethods.map((item) => (
                  <option key={item.id} value={item.id}>{item.lookup_label || item.lookup_key || item.id}</option>
                ))}
              </select>
            </label>

            <label className="text-sm space-y-1 md:col-span-4">
              <span className="block text-slate-700">Desde</span>
              <input
                type="date"
                value={popupForm.start_date}
                onChange={(event) => setPopupForm((prev) => ({ ...prev, start_date: event.target.value }))}
                className="h-10 border rounded-md px-3 w-full"
                disabled={saving || popupMode === 'view'}
              />
            </label>

            <label className="text-sm space-y-1 md:col-span-4">
              <span className="block text-slate-700">Hasta</span>
              <input
                type="date"
                value={popupForm.end_date}
                onChange={(event) => setPopupForm((prev) => ({ ...prev, end_date: event.target.value }))}
                className="h-10 border rounded-md px-3 w-full"
                disabled={saving || popupMode === 'view'}
              />
            </label>

            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:col-span-4">
              <label className="text-sm space-y-1">
                <span className="block text-slate-700">Hora inicio</span>
                <input
                  type="time"
                  value={popupForm.start_time}
                  onChange={(event) => setPopupForm((prev) => ({ ...prev, start_time: event.target.value }))}
                  className="h-10 border rounded-md px-3 w-full"
                  disabled={saving || popupMode === 'view'}
                />
              </label>

              <label className="text-sm space-y-1">
                <span className="block text-slate-700">Hora fin</span>
                <input
                  type="time"
                  value={popupForm.end_time}
                  onChange={(event) => setPopupForm((prev) => ({ ...prev, end_time: event.target.value }))}
                  className="h-10 border rounded-md px-3 w-full"
                  disabled={saving || popupMode === 'view'}
                />
              </label>
            </div>

            <label className="text-sm space-y-1 md:col-span-12">
              <span className="block text-slate-700">Motivo / notas</span>
              <textarea
                value={popupForm.notes}
                onChange={(event) => setPopupForm((prev) => ({ ...prev, notes: event.target.value }))}
                className="border rounded-md px-3 py-2 w-full min-h-[90px]"
                disabled={saving || popupMode === 'view'}
              />
            </label>

            <label className="text-sm space-y-1 md:col-span-12">
              <span className="block text-slate-700">Respaldo PDF (opcional)</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => setSupportFile(event.target.files?.[0] || null)}
                className="block min-h-10 w-full max-w-full rounded-md border px-3 py-1 text-xs sm:text-sm"
                disabled={saving || popupMode === 'view'}
              />
              <span className="text-xs text-slate-500">
                {supportFile
                  ? `Nuevo archivo: ${supportFile.name}`
                  : editingRequestSnapshot?.support_document_name
                  ? `Archivo actual: ${editingRequestSnapshot.support_document_name}`
                  : 'Sin archivo adjunto'}
              </span>
            </label>

            {popupMode === 'edit' && editingRequestSnapshot?.support_document_name ? (
              <label className="md:col-span-12 inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={removeSupport}
                  onChange={(event) => setRemoveSupport(event.target.checked)}
                  disabled={saving}
                />
                Quitar documento actual
              </label>
            ) : null}

            {popupMode === 'view' ? (
              <div className="md:col-span-12 rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-700 space-y-1">
                <div>
                  Estado:{' '}
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusBadgeClass(editingRequestSnapshot?.request_status_key, editingRequestSnapshot?.request_status_label)}`}>
                    {editingRequestSnapshot?.request_status_label || editingRequestSnapshot?.request_status_key || '-'}
                  </span>
                </div>
                <div>Aprobador: {editingRequestSnapshot?.approved_by_display_name || editingRequestSnapshot?.approved_by_username || editingRequestSnapshot?.approved_by || '-'}</div>
                <div>Fecha decisión: {formatDateTime(editingRequestSnapshot?.approved_at)}</div>
                <div>Observación aprobación/rechazo: {editingRequestSnapshot?.approval_notes || '-'}</div>
                <div>
                  Respaldo:{' '}
                  {editingRequestSnapshot?.support_document_name ? (
                    <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs bg-white text-slate-700">
                      <FileText className="w-3.5 h-3.5" />
                      {editingRequestSnapshot.support_document_name}
                    </span>
                  ) : (
                    '-'
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="flex-row justify-end gap-2">
            {popupMode === 'view' && editingRequestSnapshot && isEditableStatus(editingRequestSnapshot.request_status_key, editingRequestSnapshot.request_status_label) ? (
              <>
                <Button variant="outline" onClick={() => openEditPopup(editingRequestSnapshot)} disabled={saving}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (await deleteRequest(editingRequestSnapshot)) closePopup();
                  }}
                  disabled={saving}
                  className="text-rose-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              </>
            ) : null}
            <Button variant="outline" onClick={closePopup} disabled={saving}>
              {popupMode === 'view' ? 'Cerrar' : 'Cancelar'}
            </Button>
            {popupMode !== 'view' ? (
              <Button onClick={() => void submitPopup()} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {popupMode === 'create' ? 'Enviar solicitud' : 'Guardar cambios'}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
