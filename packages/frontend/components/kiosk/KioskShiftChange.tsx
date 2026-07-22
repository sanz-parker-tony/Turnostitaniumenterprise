'use client';

import { buildApiUrl } from '../../utils/api-config';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, CircleDot, FileText, Loader2, MessageSquareText, RefreshCw, Send, Trash2 } from 'lucide-react';
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
import { StandardDateInput } from '@/components/ui/standard-date-input';
import { formatClientDateTime, formatStandardDate } from '@/utils/date-time';

interface ShiftPlanRow {
  plan_id: string;
  shift_date: string;
  company_id: string;
  company_name: string | null;
  shift_id: string;
  shift_company_id?: string | null;
  original_shift_id: string;
  original_shift_company_id?: string | null;
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

function getInitialRange(deepLinkSearch?: string) {
  const fallback = getDefaultRange();
  if (deepLinkSearch === undefined && typeof window === 'undefined') return fallback;
  const date = new URLSearchParams(deepLinkSearch ?? window.location.search).get('date') || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < fallback.from) return fallback;
  return { from: date, to: date };
}

function getDeepLinkShiftPlan(deepLinkSearch?: string): ShiftPlanRow | null {
  if (deepLinkSearch === undefined && typeof window === 'undefined') return null;
  const params = new URLSearchParams(deepLinkSearch ?? window.location.search);
  const requestId = params.get('request_id');
  const requestedMode = params.get('mode');
  const shouldOpen = params.get('open_popup') === '1' || Boolean(requestId || requestedMode);
  const shiftDate = params.get('date') || '';
  if (!shouldOpen || !shiftDate) return null;

  const shiftId = params.get('current_shift_id') || '';
  return {
    plan_id: '',
    shift_date: shiftDate,
    company_id: '',
    company_name: null,
    shift_id: shiftId,
    original_shift_id: shiftId,
    original_shift_name: null,
    original_shift_short_name: null,
    shift_name: 'Cargando turno asignado…',
    shift_short_name: null,
    start_time: null,
    work_minutes: null,
    shift_icon_key: null,
    shift_bg_color: null,
    shift_text_color: null,
    open_request_id: requestId,
    open_request_shift_date: shiftDate,
    open_request_reason: params.get('reason'),
    open_request_support_document_name: null,
    open_request_support_document_mime: null,
    open_requested_shift_id: params.get('requested_shift_id'),
    open_requested_shift_name: null,
    open_requested_shift_short_name: null,
    open_request_status_key: null,
    open_request_status_label: null,
  };
}

function getDeepLinkShiftDialogMode(deepLinkSearch?: string): RequestDialogMode {
  if (deepLinkSearch === undefined && typeof window === 'undefined') return 'create';
  const params = new URLSearchParams(deepLinkSearch ?? window.location.search);
  return params.get('request_id') || params.get('mode') === 'view' ? 'view' : 'create';
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
  return formatStandardDate(value);
}

function formatDateLong(value: string) {
  return formatStandardDate(value);
}

function shortRequestId(value: string | null | undefined): string {
  const raw = String(value || '').trim().replace(/-/g, '');
  if (!raw) return '-';
  return `SC-${raw.slice(0, 8).toUpperCase()}`;
}

function formatDateTime(value: string | null) {
  return formatClientDateTime(value);
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

type KioskShiftChangeProps = {
  deepLinkSearch?: string;
  onPopupClose?: () => void;
};

export default function KioskShiftChange({
  deepLinkSearch,
  onPopupClose,
}: KioskShiftChangeProps = {}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [rangeFrom, setRangeFrom] = useState(() => getInitialRange(deepLinkSearch).from);
  const [rangeTo, setRangeTo] = useState(() => getInitialRange(deepLinkSearch).to);
  const minFromDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toIsoDate(d);
  }, []);

  const [employee, setEmployee] = useState<EmployeeContext | null>(null);
  const [shifts, setShifts] = useState<ShiftPlanRow[]>([]);
  const [availableShifts, setAvailableShifts] = useState<AvailableShiftRow[]>([]);
  const [shiftChanges, setShiftChanges] = useState<ShiftChangeRow[]>([]);

  const [selectedPlan, setSelectedPlan] = useState<ShiftPlanRow | null>(() => getDeepLinkShiftPlan(deepLinkSearch));
  const [dialogMode, setDialogMode] = useState<RequestDialogMode>(() => getDeepLinkShiftDialogMode(deepLinkSearch));
  const [selectedRequest, setSelectedRequest] = useState<ShiftChangeRow | null>(null);
  const [requestedShiftId, setRequestedShiftId] = useState('');
  const [draftRequestedShiftByDate, setDraftRequestedShiftByDate] = useState<Record<string, string>>({});
  const [reason, setReason] = useState(() => {
    if (deepLinkSearch === undefined && typeof window === 'undefined') return '';
    return new URLSearchParams(deepLinkSearch ?? window.location.search).get('reason') || '';
  });
  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [clearSupportDocument, setClearSupportDocument] = useState(false);
  const requestCellClickTimers = useRef<Record<string, number>>({});
  const deepLinkHandled = useRef(false);

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
    const linkedRequestId = deepLinkSearch !== undefined || typeof window !== 'undefined'
      ? new URLSearchParams(deepLinkSearch ?? window.location.search).get('request_id')
      : null;
    if (linkedRequestId) qs.set('request_id', linkedRequestId);
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
    const validCompanyIds = new Set(
      [selectedPlan.company_id, selectedPlan.original_shift_company_id, selectedPlan.shift_company_id].filter(Boolean)
    );
    return availableShifts.filter(
      (row) => validCompanyIds.has(row.company_id) && row.id !== selectedPlan.shift_id
    );
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

  useEffect(() => {
    return () => {
      Object.values(requestCellClickTimers.current).forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  const getSelectableShiftsForPlan = (plan: ShiftPlanRow) => {
    const validCompanyIds = new Set(
      [plan.company_id, plan.original_shift_company_id, plan.shift_company_id].filter(Boolean)
    );
    return availableShifts.filter(
      (row) => validCompanyIds.has(row.company_id) && row.id !== plan.shift_id
    );
  };

  const beginRequest = (plan: ShiftPlanRow, initialRequestedShiftId = '') => {
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
    setRequestedShiftId(initialRequestedShiftId);
    setReason('');
  };

  useEffect(() => {
    if (loading || deepLinkHandled.current || (deepLinkSearch === undefined && typeof window === 'undefined')) return;

    const params = new URLSearchParams(deepLinkSearch ?? window.location.search);
    const mode = params.get('mode');
    const requestId = params.get('request_id');
    const shiftDate = params.get('date') || '';
    if (!mode && !requestId) return;

    deepLinkHandled.current = true;
    if (requestId) {
      const existing = shiftChanges.find((row) => row.id === requestId);
      if (!existing) {
        toast.error('No se encontró la solicitud de turno vinculada con esta incidencia');
        return;
      }
      openRequestFromHistory(existing);
      setDialogMode('view');
      return;
    }

    if (mode !== 'create') return;
    const plan = shifts.find((row) => row.shift_date === shiftDate);
    if (!plan) {
      toast.error('No existe un turno futuro asignado para precargar esta solicitud');
      return;
    }
    beginRequest(plan, params.get('requested_shift_id') || '');
    setReason(params.get('reason') || `Solicitud relacionada con el turno asignado para ${shiftDate}.`);
  }, [loading, shifts, shiftChanges, deepLinkSearch]);

  const cycleDraftRequestedShift = (plan: ShiftPlanRow) => {
    const options = getSelectableShiftsForPlan(plan);
    if (options.length === 0) {
      toast.error('No hay turnos disponibles para solicitar en esta fecha');
      return;
    }

    setDraftRequestedShiftByDate((current) => {
      const currentIndex = options.findIndex((shift) => shift.id === current[plan.shift_date]);
      const nextShift = options[(currentIndex + 1) % options.length];
      return { ...current, [plan.shift_date]: nextShift.id };
    });
  };

  const clearDraftRequestedShift = (shiftDate: string) => {
    const existingTimer = requestCellClickTimers.current[shiftDate];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      delete requestCellClickTimers.current[shiftDate];
    }

    setDraftRequestedShiftByDate((current) => {
      if (!current[shiftDate]) return current;
      const next = { ...current };
      delete next[shiftDate];
      return next;
    });
  };

  const scheduleDraftShiftCycle = (plan: ShiftPlanRow) => {
    const existingTimer = requestCellClickTimers.current[plan.shift_date];
    if (existingTimer) window.clearTimeout(existingTimer);

    requestCellClickTimers.current[plan.shift_date] = window.setTimeout(() => {
      cycleDraftRequestedShift(plan);
      delete requestCellClickTimers.current[plan.shift_date];
    }, 220);
  };

  const openDraftRequest = (plan: ShiftPlanRow) => {
    const existingTimer = requestCellClickTimers.current[plan.shift_date];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      delete requestCellClickTimers.current[plan.shift_date];
    }

    const options = getSelectableShiftsForPlan(plan);
    const selectedDraftShiftId = draftRequestedShiftByDate[plan.shift_date];
    const initialRequestedShiftId = options.some((shift) => shift.id === selectedDraftShiftId)
      ? selectedDraftShiftId
      : options[0]?.id || '';
    beginRequest(plan, initialRequestedShiftId);
  };

  const finishDialog = (force: boolean) => {
    if (saving && !force) return;
    setSelectedPlan(null);
    setSelectedRequest(null);
    setDialogMode('create');
    setRequestedShiftId('');
    setReason('');
    setSupportFile(null);
    setClearSupportDocument(false);
    onPopupClose?.();
  };

  const closeDialog = () => finishDialog(false);

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
      finishDialog(true);
      if (!onPopupClose) await Promise.all([loadShifts(), loadShiftChanges()]);
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
      finishDialog(true);
      if (!onPopupClose) await Promise.all([loadShifts(), loadShiftChanges()]);
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
      finishDialog(true);
      if (!onPopupClose) await Promise.all([loadShifts(), loadShiftChanges()]);
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
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Turnos y Solicitud de Cambio</CardTitle>
              <CardDescription>
                <span className="md:hidden">Compara el turno asignado con el solicitado en columnas paralelas para cada fecha.</span>
                <span className="hidden md:inline">Visualiza tus turnos por fecha. En la fila inferior, haz clic para alternar el turno y doble clic para solicitar el cambio.</span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:px-6 sm:pb-6">
          <div className="flex w-full flex-wrap items-end gap-2">
            <label className="w-full space-y-1 text-sm min-[420px]:w-auto">
              <span className="block text-slate-700">Desde</span>
              <StandardDateInput
                value={rangeFrom}
                min={minFromDate}
                max={rangeTo || undefined}
                onValueChange={(nextFrom) => {
                  setRangeFrom(nextFrom);
                  if (!nextFrom) return;
                  const maxTo = addDays(nextFrom, 6);
                  if (!rangeTo || rangeTo < nextFrom) {
                    setRangeTo(nextFrom);
                  } else if (rangeTo > maxTo) {
                    setRangeTo(maxTo);
                  }
                }}
                className="h-10 w-full rounded-md border px-3"
              />
            </label>
            <label className="w-full space-y-1 text-sm min-[420px]:w-auto">
              <span className="block text-slate-700">Hasta</span>
              <StandardDateInput
                value={rangeTo}
                min={rangeFrom || minFromDate}
                max={rangeFrom ? addDays(rangeFrom, 6) : addDays(minFromDate, 6)}
                onValueChange={(nextTo) => {
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
                className="h-10 w-full rounded-md border px-3"
              />
            </label>
            <Button
              className="w-full min-[420px]:w-auto"
              onClick={() => void refresh()}
              disabled={loading || refreshing || saving}
            >
              {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Consultar
            </Button>
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
          ) : dateColumns.length === 0 ? (
            <div className="rounded-xl border py-10 text-center text-slate-600">No hay turnos en el rango seleccionado.</div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                <div className="grid grid-cols-2 gap-2 px-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>Turno asignado</span>
                  <span>Turno solicitado</span>
                </div>

                {dateColumns.map((dateIso) => {
                  const plan = shiftsByDate.get(dateIso);
                  const row = openShiftChangesByDate.get(dateIso);
                  const draftShiftId = draftRequestedShiftByDate[dateIso];
                  const draftShift = draftShiftId ? availableShiftById.get(draftShiftId) || null : null;
                  const planVisual = plan
                    ? getShiftVisual(plan.shift_icon_key, plan.shift_bg_color, plan.shift_text_color)
                    : null;
                  const PlanIcon = planVisual?.Icon || CircleDot;
                  const requested = row ? availableShiftById.get(row.requested_shift_id) : null;
                  const requestVisual = row
                    ? getShiftVisual(
                        requested?.shift_icon_key || null,
                        requested?.shift_bg_color || '#EEF2FF',
                        requested?.shift_text_color || '#1E293B'
                      )
                    : draftShift
                    ? getShiftVisual(
                        draftShift.shift_icon_key,
                        draftShift.shift_bg_color,
                        draftShift.shift_text_color
                      )
                    : null;
                  const RequestIcon = requestVisual?.Icon || ArrowLeftRight;

                  return (
                    <section key={`mobile-${dateIso}`} className="overflow-hidden rounded-xl border bg-white shadow-sm">
                      <div className="border-b bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-700">
                        {formatDateShort(dateIso)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-2">
                        {plan ? (
                          <button
                            type="button"
                            onClick={() => beginRequest(plan)}
                            className="flex min-h-[142px] min-w-0 flex-col items-center justify-center rounded-xl border p-2 text-center transition active:scale-[0.99]"
                            style={{ backgroundColor: planVisual?.bgColor, color: planVisual?.textColor }}
                            aria-label={`${formatDateLong(dateIso)}. Turno asignado: ${formatShiftLabel(plan)}. Abrir solicitud de cambio.`}
                          >
                            <PlanIcon className="h-5 w-5" style={{ color: planVisual?.iconColor }} />
                            <span className="mt-1 max-w-full truncate text-xs font-semibold">
                              {plan.shift_short_name || plan.shift_name}
                            </span>
                            <span className="mt-1 line-clamp-2 text-[10px] opacity-80">{plan.shift_name}</span>
                            <span className="mt-1 text-[10px] font-medium opacity-80">{plan.start_time || '-'}</span>
                            <span className="mt-2 rounded-md border border-current/20 bg-white/60 px-2 py-1 text-[10px] font-semibold">
                              Solicitar cambio
                            </span>
                          </button>
                        ) : (
                          <div className="min-h-[142px] rounded-xl border border-dashed bg-slate-50" />
                        )}

                        {row ? (
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
                            className="flex min-h-[142px] min-w-0 cursor-pointer flex-col items-center justify-center rounded-xl border p-2 text-center transition active:scale-[0.99]"
                            style={{ backgroundColor: requestVisual?.bgColor, color: requestVisual?.textColor }}
                            aria-label={`Abrir solicitud ${shortRequestId(row.id)} para ${formatDateLong(dateIso)}`}
                          >
                            <RequestIcon className="h-5 w-5" style={{ color: requestVisual?.iconColor }} />
                            <span className="mt-1 max-w-full truncate text-xs font-semibold">
                              {row.requested_shift_short_name || row.requested_shift_name || '-'}
                            </span>
                            <span className="mt-1 text-[10px] font-semibold text-indigo-700">{shortRequestId(row.id)}</span>
                            <span className={`mt-1 text-[10px] font-semibold ${statusTextClass(row.request_status_key || row.request_status_label)}`}>
                              {row.request_status_label || row.request_status_key || '-'}
                            </span>
                            <div className="mt-2 flex items-center justify-center gap-1">
                              <span className="rounded-md border border-current/20 bg-white/70 px-2 py-1 text-[10px] font-semibold">
                                Ver detalle
                              </span>
                              {row.support_document_name ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void openSupportDocument(row.id);
                                  }}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-rose-200 bg-white/80 text-rose-700"
                                  aria-label={`Abrir PDF adjunto ${row.support_document_name}`}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                              {isPendingShiftChangeStatus(row.request_status_key, row.request_status_label) ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void deleteOpenRequestFromRow(row);
                                  }}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-rose-200 bg-white/80 text-rose-700"
                                  aria-label="Eliminar solicitud pendiente"
                                  disabled={saving}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : plan ? (
                          <div
                            className="flex min-h-[142px] min-w-0 flex-col items-center justify-center rounded-xl border p-2 text-center"
                            style={
                              requestVisual
                                ? { backgroundColor: requestVisual.bgColor, color: requestVisual.textColor }
                                : { backgroundColor: '#F1F5F9', color: '#475569' }
                            }
                          >
                            <RequestIcon className="h-5 w-5" style={{ color: requestVisual?.iconColor }} />
                            <span className="mt-1 max-w-full truncate text-xs font-semibold">
                              {draftShift?.shift_short_name || draftShift?.shift_name || 'Elegir turno'}
                            </span>
                            <span className="mt-1 line-clamp-2 text-[10px] opacity-80">
                              {draftShift?.shift_name || 'Selecciona una opción'}
                            </span>
                            <div className="mt-2 flex w-full items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => cycleDraftRequestedShift(plan)}
                                className="min-w-0 flex-1 rounded-md border border-current/25 bg-white/75 px-1 py-1 text-[10px] font-semibold"
                              >
                                {draftShift ? 'Cambiar' : 'Elegir'}
                              </button>
                              <button
                                type="button"
                                onClick={() => openDraftRequest(plan)}
                                disabled={!draftShift}
                                className="inline-flex h-7 w-7 items-center justify-center justify-self-center rounded-md border border-blue-300 bg-blue-600 text-white disabled:cursor-not-allowed disabled:opacity-40"
                                title="Solicitar cambio"
                                aria-label={`Solicitar cambio de turno para ${formatDateLong(dateIso)}`}
                              >
                                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                              {draftShift ? (
                                <button
                                  type="button"
                                  onClick={() => clearDraftRequestedShift(dateIso)}
                                  className="inline-flex h-7 w-7 items-center justify-center justify-self-center rounded-md border border-rose-200 bg-white/80 text-rose-700"
                                  title="Deshacer selección"
                                  aria-label={`Deshacer turno solicitado para ${formatDateLong(dateIso)}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <div className="min-h-[142px] rounded-xl border border-dashed bg-slate-50" />
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>

              <div className="hidden rounded-xl border overflow-x-auto overscroll-x-contain md:block">
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
            </>
          )}
        </CardContent>
      </Card>

      <Card className="hidden md:block">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle>Solicitudes abiertas de cambio</CardTitle>
          <CardDescription>
            Clic: alternar turno. Doble clic: abrir la solicitud. Supr: deshacer. En celular, usa los botones.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:px-6 sm:pb-6">
          {dateColumns.length === 0 ? (
            <div className="border rounded-lg py-8 text-center text-slate-600">
              No hay fechas de turnos en el rango seleccionado.
            </div>
          ) : (
            <div className="rounded-xl border overflow-x-auto overscroll-x-contain">
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
                        const plan = shiftsByDate.get(dateIso);
                        const draftShiftId = draftRequestedShiftByDate[dateIso];
                        const draftShift = draftShiftId ? availableShiftById.get(draftShiftId) || null : null;
                        const visual = draftShift
                          ? getShiftVisual(
                              draftShift.shift_icon_key,
                              draftShift.shift_bg_color,
                              draftShift.shift_text_color
                            )
                          : null;
                        const DraftIcon = visual?.Icon || ArrowLeftRight;

                        return (
                          <td key={`req-empty-${dateIso}`} className="p-2 align-top">
                            {plan ? (
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={(event) => {
                                  event.currentTarget.focus();
                                  if (event.detail === 1) scheduleDraftShiftCycle(plan);
                                }}
                                onDoubleClick={() => openDraftRequest(plan)}
                                onKeyDown={(event) => {
                                  if (event.key === ' ') {
                                    event.preventDefault();
                                    cycleDraftRequestedShift(plan);
                                  }
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    openDraftRequest(plan);
                                  }
                                  if (event.key === 'Delete' || event.key === 'Backspace') {
                                    event.preventDefault();
                                    clearDraftRequestedShift(dateIso);
                                  }
                                }}
                                className="group relative h-[98px] w-full cursor-pointer rounded-xl border border-slate-200 p-2 text-center transition hover:border-blue-300 hover:ring-2 hover:ring-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                                style={
                                  visual
                                    ? { backgroundColor: visual.bgColor, color: visual.textColor }
                                    : { backgroundColor: '#F1F5F9', color: '#475569' }
                                }
                                title="Clic para alternar; doble clic para solicitar; Supr para deshacer"
                                aria-label={`${formatDateLong(dateIso)}. ${
                                  draftShift ? `Turno solicitado: ${formatShiftLabel(draftShift)}.` : 'Sin turno seleccionado.'
                                } Clic para alternar; doble clic para solicitar; Supr para deshacer.`}
                              >
                                <div className="flex h-full flex-col items-center justify-center gap-1">
                                  <div className="inline-flex items-center justify-center gap-1.5">
                                    <DraftIcon
                                      className="h-4 w-4"
                                      style={visual ? { color: visual.iconColor } : undefined}
                                    />
                                    <span className="text-xs font-semibold">
                                      {draftShift?.shift_short_name || draftShift?.shift_name || 'Elegir turno'}
                                    </span>
                                  </div>
                                  <span className="max-w-[112px] truncate text-[10px] opacity-80">
                                    {draftShift ? draftShift.shift_name : 'Clic para alternar'}
                                  </span>
                                  {draftShift ? (
                                    <div className="mt-0.5 flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          openDraftRequest(plan);
                                        }}
                                        onDoubleClick={(event) => event.stopPropagation()}
                                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-current/30 bg-white/70 hover:bg-white"
                                        title="Solicitar cambio"
                                        aria-label={`Solicitar cambio de turno para ${formatDateLong(dateIso)}`}
                                      >
                                        <Send className="h-3 w-3" aria-hidden="true" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          clearDraftRequestedShift(dateIso);
                                        }}
                                        onDoubleClick={(event) => event.stopPropagation()}
                                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-rose-300 bg-white/80 text-rose-700 hover:bg-rose-50"
                                        title="Deshacer selección"
                                        aria-label={`Deshacer turno solicitado para ${formatDateLong(dateIso)}`}
                                      >
                                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-medium text-blue-700">Doble clic para solicitar</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="h-[98px] rounded-xl border border-dashed border-slate-200 bg-slate-100/90" />
                            )}
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
        <DialogContent className="sm:max-w-2xl">
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
                className="block min-h-10 w-full max-w-full rounded-md border px-3 py-1 text-xs sm:text-sm"
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
              <Button onClick={() => void submitRequest()} disabled={saving || loading}>
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

