'use client';

import { buildApiUrl } from '../../utils/api-config';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, CircleDot, FileText, Loader2, MessageSquareText, RefreshCw, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/backend/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ShiftPlanRow {
  plan_id: string;
  shift_date: string;
  company_id: string;
  company_name: string | null;
  shift_id: string;
  original_shift_id: string;
  original_shift_name: string | null;
  original_shift_short_name: string | null;
  shift_name: string;
  shift_short_name: string | null;
  start_time: string | null;
  work_minutes: number | null;
  shift_icon_key: string | null;
  shift_bg_color: string | null;
  shift_text_color: string | null;
  open_request_id: string | null;
  open_request_shift_date: string | null;
  open_request_reason: string | null;
  open_request_support_document_name: string | null;
  open_request_support_document_mime: string | null;
  open_requested_shift_id: string | null;
  open_requested_shift_name: string | null;
  open_requested_shift_short_name: string | null;
  open_request_status_key: string | null;
  open_request_status_label: string | null;
}

interface AvailableShiftRow {
  id: string;
  company_id: string;
  company_name: string | null;
  shift_name: string;
  shift_short_name: string | null;
  start_time: string | null;
  work_minutes: number | null;
  shift_icon_key: string | null;
  shift_bg_color: string | null;
  shift_text_color: string | null;
}

interface ShiftChangeRow {
  id: string;
  shift_date: string;
  company_id: string;
  current_shift_id: string;
  requested_shift_id: string;
  current_shift_name: string | null;
  requested_shift_name: string | null;
  reason: string | null;
  support_document_name: string | null;
  support_document_mime: string | null;
  request_status_key: string | null;
  request_status_label: string | null;
  supervisor_notes: string | null;
  approved_by_display_name: string | null;
  approved_by_username: string | null;
  approved_at: string | null;
}

type RequestDialogMode = 'create' | 'edit' | 'view';

interface EmployeeContext {
  id: string;
  employee_code: string | null;
  employee_name: string | null;
  employee_lastname: string | null;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDateOnly(value: string): string {
  return String(value || '').slice(0, 10);
}

function getDefaultRange() {
  const from = new Date();
  from.setDate(from.getDate() + 1);
  const to = new Date(from);
  to.setDate(to.getDate() + 6);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

function addDays(isoDate: string, days: number): string {
  const base = new Date(`${isoDate}T00:00:00`);
  if (!Number.isFinite(base.getTime())) return isoDate;
  base.setDate(base.getDate() + days);
  return toIsoDate(base);
}

function diffDaysInclusive(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) return Number.NaN;
  const diff = Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
  return diff + 1;
}

function formatDateShort(value: string) {
  const dateOnly = String(value || '').slice(0, 10);
  const date = new Date(`${dateOnly}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString('es-EC', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function formatDateLong(value: string) {
  const dateOnly = String(value || '').slice(0, 10);
  const date = new Date(`${dateOnly}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString('es-EC', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function shortRequestId(value: string | null | undefined): string {
  const raw = String(value || '').trim().replace(/-/g, '');
  if (!raw) return '-';
  return `SC-${raw.slice(0, 8).toUpperCase()}`;
}

function formatDateTime(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return date.toLocaleString('es-EC');
}

function statusClass(statusKey: string | null | undefined) {
  const key = String(statusKey || '').toUpperCase();
  if (key.includes('APPROV') || key.includes('APROBAD')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (key.includes('REJECT') || key.includes('DENEG')) return 'bg-rose-100 text-rose-700 border-rose-200';
  if (key.includes('REVIEW') || key.includes('REVISION')) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-blue-100 text-blue-700 border-blue-200';
}

function statusTextClass(statusKey: string | null | undefined) {
  const key = String(statusKey || '').toUpperCase();
  if (key.includes('APPROV') || key.includes('APROBAD')) return 'text-emerald-700';
  if (key.includes('REJECT') || key.includes('DENEG')) return 'text-rose-700';
  if (key.includes('REVIEW') || key.includes('REVISION')) return 'text-amber-700';
  return 'text-blue-700';
}

function normalizeStatusKey(statusKey: string | null | undefined, statusLabel?: string | null): string {
  const key = String(statusKey || '').trim().toUpperCase();
  if (key) return key;
  return String(statusLabel || '').trim().toUpperCase();
}

function isEditableShiftChangeStatus(statusKey: string | null | undefined, statusLabel?: string | null): boolean {
  const key = normalizeStatusKey(statusKey, statusLabel);
  return ['PENDING', 'PENDIENTE', 'IN_REVIEW', 'EN_REVISION', 'EN_REVISIÓN'].includes(key);
}

function isPendingShiftChangeStatus(statusKey: string | null | undefined, statusLabel?: string | null): boolean {
  const key = normalizeStatusKey(statusKey, statusLabel);
  return ['PENDING', 'PENDIENTE'].includes(key);
}

function isAnsweredShiftChangeStatus(statusKey: string | null | undefined, statusLabel?: string | null): boolean {
  return !isEditableShiftChangeStatus(statusKey, statusLabel);
}

function resolveIconComponent(iconKey?: string | null) {
  const raw = String(iconKey || '').trim();
  if (!raw) return CircleDot;
  const compact = raw.replace(/[^a-zA-Z0-9]/g, '');
  const pascal = compact.charAt(0).toUpperCase() + compact.slice(1);
  const icon = (LucideIcons as Record<string, any>)[pascal];
  return icon || CircleDot;
}

function getShiftVisual(shiftIconKey?: string | null, bgColor?: string | null, textColor?: string | null) {
  return {
    Icon: resolveIconComponent(shiftIconKey),
    bgColor: String(bgColor || '#F1F5F9'),
    textColor: String(textColor || '#0F172A'),
    iconColor: String(textColor || '#0F172A'),
  };
}

function formatShiftLabel(shift?: Pick<AvailableShiftRow, 'shift_name' | 'shift_short_name'> | null): string {
  if (!shift) return '-';
  return shift.shift_short_name ? `${shift.shift_name} (${shift.shift_short_name})` : shift.shift_name;
}

export default function KioskShiftChange() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [rangeFrom, setRangeFrom] = useState(getDefaultRange().from);
  const [rangeTo, setRangeTo] = useState(getDefaultRange().to);
  const minFromDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toIsoDate(d);
  }, []);

  const [employee, setEmployee] = useState<EmployeeContext | null>(null);
  const [shifts, setShifts] = useState<ShiftPlanRow[]>([]);
  const [availableShifts, setAvailableShifts] = useState<AvailableShiftRow[]>([]);
  const [shiftChanges, setShiftChanges] = useState<ShiftChangeRow[]>([]);

  const [selectedPlan, setSelectedPlan] = useState<ShiftPlanRow | null>(null);
  const [dialogMode, setDialogMode] = useState<RequestDialogMode>('create');
  const [selectedRequest, setSelectedRequest] = useState<ShiftChangeRow | null>(null);
  const [requestedShiftId, setRequestedShiftId] = useState('');
  const [reason, setReason] = useState('');
  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [clearSupportDocument, setClearSupportDocument] = useState(false);

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

  const request = async (path: string, init?: RequestInit) => {
    const api = createClient();
    const {
      data: { session },
    } = await api.auth.getSession();
    const token =
      session?.access_token ||
      localStorage.getItem('tt-access-token') ||
      localStorage.getItem('access_token');
    if (!token) throw new Error('No hay sesión activa');

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

  const openSupportDocument = async (requestId: string) => {
    try {
      const api = createClient();
      const {
        data: { session },
      } = await api.auth.getSession();
      const token =
        session?.access_token ||
        localStorage.getItem('tt-access-token') ||
        localStorage.getItem('access_token');
      if (!token) throw new Error('No hay sesión activa');

      const doFetch = async (bearer: string) =>
        fetch(buildApiUrl(`/kiosk/request-shift-change/${requestId}/support-document`), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${bearer}`,
          },
        });

      let response = await doFetch(token);
      if (response.status === 401 && session?.access_token && token !== session.access_token) {
        response = await doFetch(session.access_token);
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const fileUrl = window.URL.createObjectURL(blob);
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(fileUrl), 60_000);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo abrir el adjunto PDF');
    }
  };

  const loadShifts = async () => {
    const qs = new URLSearchParams();
    qs.set('from', rangeFrom);
    qs.set('to', rangeTo);
    const payload = await request(`/kiosk/my-shifts?${qs.toString()}`);
    setShifts((payload?.shifts || []) as ShiftPlanRow[]);
    setAvailableShifts((payload?.available_shifts || []) as AvailableShiftRow[]);
    setEmployee((payload?.employee || null) as EmployeeContext | null);
  };

  const loadShiftChanges = async () => {
    const qs = new URLSearchParams();
    qs.set('from', rangeFrom);
    qs.set('to', rangeTo);
    const payload = await request(`/kiosk/my-shift-changes?${qs.toString()}`);
    setShiftChanges((payload?.shift_changes || []) as ShiftChangeRow[]);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadShifts(), loadShiftChanges()]);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cargar la información de turnos');
    } finally {
      setLoading(false);
    }
  };

  const validateRange = (from: string, to: string): string | null => {
    if (!from || !to) return 'Debes seleccionar desde y hasta';
    if (from < minFromDate) return `La fecha inicial mínima es ${minFromDate}`;
    if (to < from) return 'La fecha final no puede ser menor a la fecha inicial';
    const days = diffDaysInclusive(from, to);
    if (!Number.isFinite(days) || days <= 0) return 'Rango de fechas inválido';
    if (days > 7) return 'El rango máximo permitido es de 7 días';
    return null;
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    const rangeError = validateRange(rangeFrom, rangeTo);
    if (rangeError) {
      toast.error(rangeError);
      return;
    }
    setRefreshing(true);
    try {
      await Promise.all([loadShifts(), loadShiftChanges()]);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo refrescar');
    } finally {
      setRefreshing(false);
    }
  };

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, ShiftPlanRow>();
    shifts.forEach((row) => map.set(row.shift_date, row));
    return map;
  }, [shifts]);

  const dateColumns = useMemo(() => shifts.map((row) => row.shift_date), [shifts]);

  const selectableShifts = useMemo(() => {
    if (!selectedPlan) return [];
    return availableShifts.filter((row) => row.company_id === selectedPlan.company_id);
  }, [availableShifts, selectedPlan]);

  const shiftChangesById = useMemo(() => {
    const map = new Map<string, ShiftChangeRow>();
    shiftChanges.forEach((row) => {
      map.set(row.id, row);
    });
    return map;
  }, [shiftChanges]);

  const openShiftChangesByDate = useMemo(() => {
    const map = new Map<string, ShiftChangeRow>();
    shiftChanges.forEach((row) => {
      if (!row.shift_date) return;
      const existing = map.get(row.shift_date);
      if (!existing) {
        map.set(row.shift_date, row);
        return;
      }
      const existingTime = new Date(existing.created_at || 0).getTime();
      const rowTime = new Date(row.created_at || 0).getTime();
      if (rowTime > existingTime) {
        map.set(row.shift_date, row);
      }
    });
    return map;
  }, [shiftChanges]);

  const availableShiftById = useMemo(() => {
    const map = new Map<string, AvailableShiftRow>();
    for (const row of availableShifts) {
      map.set(row.id, row);
    }
    return map;
  }, [availableShifts]);

  const selectedShiftOption = useMemo(() => {
    if (!requestedShiftId) return null;
    return availableShiftById.get(requestedShiftId) || null;
  }, [availableShiftById, requestedShiftId]);

  const beginRequest = (plan: ShiftPlanRow) => {
    const existing =
      openShiftChangesByDate.get(plan.shift_date) ||
      (plan.open_request_id ? shiftChangesById.get(plan.open_request_id) || null : null);

    if (existing) {
      setSelectedPlan({
        ...plan,
        open_request_id: existing.id,
        open_request_shift_date: existing.shift_date,
        open_request_reason: existing.reason,
        open_request_support_document_name: existing.support_document_name,
        open_request_support_document_mime: existing.support_document_mime,
        open_requested_shift_id: existing.requested_shift_id,
        open_requested_shift_name: existing.requested_shift_name,
        open_requested_shift_short_name: existing.requested_shift_short_name,
        open_request_status_key: existing.request_status_key,
        open_request_status_label: existing.request_status_label,
      });
      setSelectedRequest(existing);
    } else {
      setSelectedPlan(plan);
      setSelectedRequest(null);
    }
    setSupportFile(null);
    setClearSupportDocument(false);

    if (existing) {
      setDialogMode(isEditableShiftChangeStatus(existing.request_status_key, existing.request_status_label) ? 'edit' : 'view');
      setRequestedShiftId(existing.requested_shift_id || '');
      setReason(existing.reason || '');
      return;
    }

    setDialogMode('create');
    setRequestedShiftId('');
    setReason('');
  };

  const closeDialog = () => {
    if (saving) return;
    setSelectedPlan(null);
    setSelectedRequest(null);
    setDialogMode('create');
    setRequestedShiftId('');
    setReason('');
    setSupportFile(null);
    setClearSupportDocument(false);
  };

  const submitRequest = async () => {
    if (!selectedPlan) return;
    if (!requestedShiftId) return toast.error('Selecciona el turno solicitado');
    if (!reason.trim()) return toast.error('Debes indicar un motivo');
    if (supportFile && supportFile.type !== 'application/pdf') {
      return toast.error('El respaldo debe ser un archivo PDF');
    }

    setSaving(true);
    try {
      const supportDocumentBase64 = supportFile ? await fileToBase64(supportFile) : null;
      await request('/kiosk/request-shift-change', {
        method: 'POST',
        body: JSON.stringify({
          shift_date: normalizeDateOnly(selectedPlan.shift_date),
          current_shift_id: selectedPlan.shift_id,
          requested_shift_id: requestedShiftId,
          reason: reason.trim(),
          support_document_name: supportFile?.name || null,
          support_document_mime: supportFile?.type || null,
          support_document_base64: supportDocumentBase64,
        }),
      });
      toast.success('Solicitud de cambio enviada');
      closeDialog();
      await Promise.all([loadShifts(), loadShiftChanges()]);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo enviar la solicitud');
    } finally {
      setSaving(false);
    }
  };

  const saveExistingRequest = async () => {
    if (!selectedPlan?.open_request_id) return;
    if (!requestedShiftId) return toast.error('Selecciona el turno solicitado');
    if (!reason.trim()) return toast.error('Debes indicar un motivo');
    if (supportFile && supportFile.type !== 'application/pdf') {
      return toast.error('El respaldo debe ser un archivo PDF');
    }

    setSaving(true);
    try {
      const supportDocumentBase64 = supportFile ? await fileToBase64(supportFile) : null;
      await request(`/kiosk/request-shift-change/${selectedPlan.open_request_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          requested_shift_id: requestedShiftId,
          reason: reason.trim(),
          clear_support_document: clearSupportDocument,
          support_document_name: supportFile?.name || null,
          support_document_mime: supportFile?.type || null,
          support_document_base64: supportDocumentBase64,
        }),
      });
      toast.success('Solicitud actualizada');
      closeDialog();
      await Promise.all([loadShifts(), loadShiftChanges()]);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo actualizar la solicitud');
    } finally {
      setSaving(false);
    }
  };

  const deleteExistingRequest = async () => {
    if (!selectedPlan?.open_request_id) return;
    if (!window.confirm('¿Confirmas eliminar esta solicitud de cambio?')) return;

    setSaving(true);
    try {
      await request(`/kiosk/request-shift-change/${selectedPlan.open_request_id}`, {
        method: 'DELETE',
      });
      toast.success('Solicitud eliminada');
      closeDialog();
      await Promise.all([loadShifts(), loadShiftChanges()]);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo eliminar la solicitud');
    } finally {
      setSaving(false);
    }
  };

  const deleteOpenRequestFromRow = async (row: ShiftChangeRow) => {
    if (!isPendingShiftChangeStatus(row.request_status_key, row.request_status_label)) return;
    if (!window.confirm('¿Confirmas eliminar esta solicitud de cambio?')) return;

    setSaving(true);
    try {
      await request(`/kiosk/request-shift-change/${row.id}`, {
        method: 'DELETE',
      });
      toast.success('Solicitud eliminada');
      if (selectedPlan?.open_request_id === row.id) {
        closeDialog();
      }
      await Promise.all([loadShifts(), loadShiftChanges()]);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo eliminar la solicitud');
    } finally {
      setSaving(false);
    }
  };

  const openRequestFromHistory = (row: ShiftChangeRow) => {
    const planFromDate = shiftsByDate.get(row.shift_date);
    const basePlan: ShiftPlanRow =
      planFromDate || {
        plan_id: `hist-${row.id}`,
        shift_date: row.shift_date,
        company_id: row.company_id,
        company_name: null,
        shift_id: row.current_shift_id,
        original_shift_id: row.current_shift_id,
        original_shift_name: row.current_shift_name,
        original_shift_short_name: row.current_shift_name,
        shift_name: row.current_shift_name || '-',
        shift_short_name: row.current_shift_name,
        start_time: null,
        work_minutes: null,
        shift_icon_key: null,
        shift_bg_color: null,
        shift_text_color: null,
        open_request_id: row.id,
        open_request_shift_date: row.shift_date,
        open_request_reason: row.reason,
        open_request_support_document_name: row.support_document_name,
        open_request_support_document_mime: row.support_document_mime,
        open_requested_shift_id: row.requested_shift_id,
        open_requested_shift_name: row.requested_shift_name,
        open_requested_shift_short_name: row.requested_shift_name,
        open_request_status_key: row.request_status_key,
        open_request_status_label: row.request_status_label,
      };

    setSelectedPlan({
      ...basePlan,
      open_request_id: row.id,
      open_request_shift_date: row.shift_date,
      open_request_reason: row.reason,
      open_request_support_document_name: row.support_document_name,
      open_request_support_document_mime: row.support_document_mime,
      open_requested_shift_id: row.requested_shift_id,
      open_requested_shift_name: row.requested_shift_name,
      open_requested_shift_short_name: row.requested_shift_name,
      open_request_status_key: row.request_status_key,
      open_request_status_label: row.request_status_label,
    });
    setSelectedRequest(row);
    setSupportFile(null);
    setClearSupportDocument(false);
    setRequestedShiftId(row.requested_shift_id || '');
    setReason(row.reason || '');
    setDialogMode(isEditableShiftChangeStatus(row.request_status_key, row.request_status_label) ? 'edit' : 'view');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-blue-600" />
            Turnos y Solicitud de Cambio
          </CardTitle>
          <CardDescription>
            Visualiza tus turnos por fecha y haz clic en una celda para solicitar cambio (incluye turno Libre).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm space-y-1">
              <span className="block text-slate-700">Desde</span>
              <input
                type="date"
                value={rangeFrom}
                min={minFromDate}
                max={rangeTo || undefined}
                onChange={(event) => {
                  const nextFrom = event.target.value;
                  setRangeFrom(nextFrom);
                  if (!nextFrom) return;
                  const maxTo = addDays(nextFrom, 6);
                  if (!rangeTo || rangeTo < nextFrom) {
                    setRangeTo(nextFrom);
                  } else if (rangeTo > maxTo) {
                    setRangeTo(maxTo);
                  }
                }}
                className="h-10 border rounded-md px-3"
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="block text-slate-700">Hasta</span>
              <input
                type="date"
                value={rangeTo}
                min={rangeFrom || minFromDate}
                max={rangeFrom ? addDays(rangeFrom, 6) : addDays(minFromDate, 6)}
                onChange={(event) => {
                  const nextTo = event.target.value;
                  if (!rangeFrom) {
                    setRangeTo(nextTo);
                    return;
                  }
                  const maxTo = addDays(rangeFrom, 6);
                  if (nextTo > maxTo) {
                    setRangeTo(maxTo);
                  } else {
                    setRangeTo(nextTo);
                  }
                }}
                className="h-10 border rounded-md px-3"
              />
            </label>
            <Button onClick={() => void refresh()} disabled={loading || refreshing || saving}>
              {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Consultar
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

          {loading ? (
            <div className="py-14 flex justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="rounded-xl border overflow-x-auto">
              {dateColumns.length === 0 ? (
                <div className="py-10 text-center text-slate-600">No hay turnos en el rango seleccionado.</div>
              ) : (
                <table className="min-w-max w-full">
                  <thead>
                    <tr className="bg-slate-100 border-b">
                      {dateColumns.map((dateIso) => (
                        <th key={dateIso} className="px-2 py-2 text-center min-w-[140px]">
                          <div className="text-xs font-semibold text-slate-700">{formatDateShort(dateIso)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {dateColumns.map((dateIso) => {
                        const plan = shiftsByDate.get(dateIso);
                        if (!plan) {
                          return (
                            <td key={`empty-${dateIso}`} className="p-2 align-top">
                              <div className="h-[88px] rounded-xl border border-dashed border-slate-300 bg-slate-50" />
                            </td>
                          );
                        }

                        const visual = getShiftVisual(plan.shift_icon_key, plan.shift_bg_color, plan.shift_text_color);
                        const Icon = visual.Icon;
                        return (
                          <td key={plan.plan_id} className="p-2 align-top">
                            <button
                              type="button"
                              onClick={() => beginRequest(plan)}
                              className="group w-full h-[116px] rounded-xl border p-2 text-center transition hover:ring-2 hover:ring-blue-300 border-slate-200"
                              style={{
                                backgroundColor: visual.bgColor,
                                color: visual.textColor,
                              }}
                              title="Solicitar cambio de turno"
                            >
                              <div className="h-full flex flex-col items-center justify-center">
                                <div className="inline-flex items-center gap-1.5 justify-center">
                                  <Icon className="w-4 h-4" style={{ color: visual.iconColor }} />
                                  <span className="text-xs font-semibold">
                                    {plan.shift_short_name || plan.shift_name}
                                  </span>
                                </div>
                                <div className="mt-1 text-xs font-medium text-center">{plan.shift_name}</div>
                                <div className="mt-1 text-[11px] opacity-80 text-center">{plan.start_time || '-'}</div>
                              </div>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes abiertas de cambio</CardTitle>
          <CardDescription>
            Fila de solicitudes por fecha. Bloques grises = sin solicitud abierta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dateColumns.length === 0 ? (
            <div className="border rounded-lg py-8 text-center text-slate-600">
              No hay fechas de turnos en el rango seleccionado.
            </div>
          ) : (
            <div className="rounded-xl border overflow-x-auto">
              <table className="min-w-max w-full">
                <thead>
                  <tr className="bg-slate-100 border-b">
                    {dateColumns.map((dateIso) => (
                      <th key={`req-head-${dateIso}`} className="px-2 py-2 text-center min-w-[140px]">
                        <div className="text-xs font-semibold text-slate-700">{formatDateShort(dateIso)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {dateColumns.map((dateIso) => {
                      const row = openShiftChangesByDate.get(dateIso);
                      if (!row) {
                        return (
                          <td key={`req-empty-${dateIso}`} className="p-2 align-top">
                            <div className="h-[98px] rounded-xl border border-slate-200 bg-slate-100/90" />
                          </td>
                        );
                      }

                      const requested = availableShiftById.get(row.requested_shift_id);
                      const visual = getShiftVisual(
                        requested?.shift_icon_key || null,
                        requested?.shift_bg_color || '#EEF2FF',
                        requested?.shift_text_color || '#1E293B'
                      );
                      const Icon = visual.Icon;

                      return (
                        <td key={`req-${row.id}`} className="p-2 align-top">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => openRequestFromHistory(row)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                openRequestFromHistory(row);
                              }
                            }}
                            className="relative w-full h-[98px] rounded-xl border p-2 transition text-center hover:ring-2 hover:ring-blue-300 cursor-pointer"
                            style={{ backgroundColor: visual.bgColor, color: visual.textColor }}
                            title="Abrir solicitud de cambio"
                          >
                            {isPendingShiftChangeStatus(row.request_status_key, row.request_status_label) ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void deleteOpenRequestFromRow(row);
                                }}
                                className="absolute bottom-1.5 right-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-rose-700 hover:opacity-80"
                                title="Eliminar solicitud pendiente"
                                aria-label="Eliminar solicitud pendiente"
                                disabled={saving}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : null}
                            <div className="h-full flex flex-col items-center justify-center gap-1">
                              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
                                <Icon className="w-3.5 h-3.5" />
                                <span>{row.requested_shift_short_name || row.requested_shift_name || '-'}</span>
                              </div>
                              <span className="text-[10px] font-semibold text-indigo-700">
                                {shortRequestId(row.id)}
                              </span>
                              <span className={`text-[10px] font-semibold ${statusTextClass(row.request_status_key || row.request_status_label)}`}>
                                {row.request_status_label || row.request_status_key || '-'}
                              </span>
                              <div className="inline-flex items-center gap-2 text-[10px] text-slate-700">
                                <span
                                  className={`inline-flex items-center gap-1 ${
                                    row.reason ? 'text-slate-700' : 'text-slate-400'
                                  }`}
                                >
                                  <MessageSquareText className="w-3 h-3" />
                                  Texto
                                </span>
                                {row.support_document_name ? (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void openSupportDocument(row.id);
                                    }}
                                    className="inline-flex items-center gap-1 text-rose-700 hover:text-rose-800 hover:underline"
                                    title={row.support_document_name}
                                    aria-label={`Abrir PDF adjunto ${row.support_document_name}`}
                                  >
                                    <FileText className="w-3 h-3" />
                                    PDF
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-rose-300">
                                    <FileText className="w-3 h-3" />
                                    PDF
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedPlan)} onOpenChange={(open) => (!open ? closeDialog() : null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create'
                ? 'Solicitar cambio de turno'
                : dialogMode === 'edit'
                ? 'Editar solicitud de cambio'
                : 'Detalle de solicitud'}
            </DialogTitle>
            <DialogDescription>
              {selectedPlan
                ? `${formatDateLong(selectedPlan.shift_date)} · Turno en plan: ${selectedPlan.shift_name}`
                : 'Seleccione los datos de la solicitud'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {selectedPlan?.open_request_id ? (
              <div className="rounded-md border bg-slate-50 p-3 text-xs space-y-1">
                <div>
                  Solicitud: <span className="font-semibold">{shortRequestId(selectedPlan.open_request_id)}</span>
                </div>
                <div>
                  Estado:{' '}
                  <span className={`inline-flex rounded-full border px-2 py-0.5 ${statusClass(selectedPlan.open_request_status_key || selectedPlan.open_request_status_label)}`}>
                    {selectedPlan.open_request_status_label || selectedPlan.open_request_status_key || '-'}
                  </span>
                </div>
              </div>
            ) : null}

            <label className="text-sm space-y-1 block">
              <span className="block text-slate-700">Turno solicitado</span>
              <Select
                value={requestedShiftId}
                onValueChange={(value) => setRequestedShiftId(value)}
                disabled={dialogMode === 'view' || saving}
              >
                <SelectTrigger className="w-full">
                  {selectedShiftOption ? (
                    (() => {
                      const visual = getShiftVisual(
                        selectedShiftOption.shift_icon_key,
                        selectedShiftOption.shift_bg_color,
                        selectedShiftOption.shift_text_color
                      );
                      const Icon = visual.Icon;
                      return (
                        <div
                          className="inline-flex w-full items-center gap-2 rounded-md px-2 py-1"
                          style={{ backgroundColor: visual.bgColor, color: visual.textColor }}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{formatShiftLabel(selectedShiftOption)}</span>
                        </div>
                      );
                    })()
                  ) : (
                    <SelectValue placeholder="Seleccionar..." />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {selectableShifts.map((shift) => {
                    const visual = getShiftVisual(shift.shift_icon_key, shift.shift_bg_color, shift.shift_text_color);
                    const Icon = visual.Icon;
                    return (
                      <SelectItem key={shift.id} value={shift.id}>
                        <span
                          className="inline-flex w-full items-center gap-2 rounded-md px-2 py-1"
                          style={{ backgroundColor: visual.bgColor, color: visual.textColor }}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{formatShiftLabel(shift)}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </label>

            <label className="text-sm space-y-1 block">
              <span className="block text-slate-700">Motivo de la solicitud</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="border rounded-md px-3 py-2 w-full min-h-[90px]"
                placeholder="Describe por qué requieres el cambio de turno..."
                disabled={dialogMode === 'view' || saving}
              />
            </label>

            <label className="text-sm space-y-1 block">
              <span className="block text-slate-700">Respaldo PDF (opcional)</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => setSupportFile(event.target.files?.[0] || null)}
                className="h-10 border rounded-md px-3 py-1 w-full"
                disabled={dialogMode === 'view' || saving}
              />
              <span className="text-xs text-slate-500">
                {supportFile
                  ? `Nuevo archivo: ${supportFile.name}`
                  : selectedRequest?.support_document_name || selectedPlan?.open_request_support_document_name
                  ? `Actual: ${selectedRequest?.support_document_name || selectedPlan?.open_request_support_document_name}`
                  : 'Puede adjuntar un PDF de respaldo'}
              </span>
            </label>

            {dialogMode !== 'view' && (selectedRequest?.support_document_name || selectedPlan?.open_request_support_document_name) ? (
              <label className="text-xs inline-flex items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  checked={clearSupportDocument}
                  onChange={(event) => setClearSupportDocument(event.target.checked)}
                  disabled={saving}
                />
                Quitar respaldo PDF actual
              </label>
            ) : null}

            {dialogMode === 'view' && isAnsweredShiftChangeStatus(selectedPlan?.open_request_status_key, selectedPlan?.open_request_status_label) ? (
              <div className="rounded-md border bg-slate-50 p-3 text-xs text-slate-600">
                Solicitud respondida: se mantiene solo para referencia y no puede editarse ni eliminarse.
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Cancelar
            </Button>
            {dialogMode === 'create' ? (
              <Button onClick={() => void submitRequest()} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Enviar solicitud
              </Button>
            ) : null}
            {dialogMode === 'edit' ? (
              <>
                <Button onClick={() => void saveExistingRequest()} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Guardar cambios
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

