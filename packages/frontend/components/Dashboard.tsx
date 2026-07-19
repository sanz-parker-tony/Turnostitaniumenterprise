/**
 * Dashboard - Pagina principal del sistema
 * Renderiza modulos segun rol.
 */

'use client';

import { buildApiUrl } from '../utils/api-config';
import { formatClientDateTime, formatClientTime24, formatStandardDate } from '../utils/date-time';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import {
  Users,
  Building2,
  Clock,
  FileText,
  Calendar,
  TrendingUp,
  AlertCircle,
  Shield,
  Settings,
  BarChart3,
  LogIn,
  LogOut,
  Utensils,
  UtensilsCrossed,
  Fingerprint,
  DoorOpen,
  DoorClosed,
  ArrowRightCircle,
  ArrowLeftCircle,
  MapPin,
  Plane,
  Baby,
  Stethoscope,
  UserX,
  CalendarCheck2,
  RefreshCw,
  Cake,
  Clock3,
  CheckCircle,
  AtSign,
  BriefcaseBusiness,
  CalendarCheck,
  Network,
  CalendarDays,
  CircleDot,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Eye,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import SystemAdminPageHeader from './shared/SystemAdminPageHeader';
import KioskRequests from './kiosk/KioskRequests';
import KioskShiftChange from './kiosk/KioskShiftChange';
import KioskTimePunchRequests from './kiosk/KioskTimePunchRequests';
import { StandardDateInput, StandardTimeInput } from './ui/standard-date-input';

const RoleInfo = ({ roleKey }: { roleKey: string | undefined }) => {
  const roleInfo: Record<string, { title: string; description: string; icon: any; color: string }> = {
    SYSTEM_ADMIN: {
      title: 'Administrador del Sistema',
      description: 'Acceso completo a configuracion de seguridad y administracion del sistema',
      icon: Shield,
      color: 'text-red-600',
    },
    TENANT_ADMIN: {
      title: 'Administrador de Tenant',
      description: 'Gestion de estructura organizacional, configuracion y mantenimiento',
      icon: Settings,
      color: 'text-purple-600',
    },
    RRHH_ADMIN: {
      title: 'Administrador de RRHH',
      description: 'Control de asistencias, reportes y gestion de empleados',
      icon: Users,
      color: 'text-blue-600',
    },
    SUPERVISOR: {
      title: 'Supervisor',
      description: 'Visualizacion de asistencias y reportes de su area',
      icon: BarChart3,
      color: 'text-green-600',
    },
    EMPLOYEE: {
      title: 'Empleado',
      description: 'Acceso al kiosco para registro de asistencia',
      icon: Clock,
      color: 'text-orange-600',
    },
  };

  const info = roleInfo[roleKey || ''] || roleInfo.EMPLOYEE;
  const Icon = info.icon;

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
      <div className="p-3 rounded-lg bg-gray-100">
        <Icon className={`h-8 w-8 ${info.color}`} />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-lg">{info.title}</h3>
        <p className="text-sm text-muted-foreground">{info.description}</p>
      </div>
    </div>
  );
};

function statusPillClass(statusKey: string | null | undefined): string {
  const key = String(statusKey || '').toUpperCase();
  if (['APPROVED', 'APROBADO'].includes(key)) return 'bg-green-100 text-green-700';
  if (['REJECTED', 'RECHAZADO', 'DENIED'].includes(key)) return 'bg-red-100 text-red-700';
  if (['PENDING', 'PENDIENTE', 'IN_REVIEW', 'EN_REVISION'].includes(key)) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

function formatDate(value: string | null | undefined): string {
  return formatStandardDate(value);
}

function isPendingIncident(incident: any): boolean {
  if (!incident?.request_id) return true;
  const status = String(incident?.request_status_key || incident?.request_status_label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
  if (!status) return true;
  return [
    'PENDING',
    'PENDIENTE',
    'IN_REVIEW',
    'EN_REVISION',
    'ENVIADA',
    'ENVIADO',
    'SENT',
    'REQUESTED',
    'SOLICITADO',
    'SOLICITADA',
  ].includes(status) || status.includes('PENDIENT');
}

function formatDateTime(value: string | null | undefined): string {
  return formatClientDateTime(value);
}

function formatShiftTime(value: string | null | undefined): string {
  if (!value) return '--:--';
  return String(value).slice(0, 5);
}

type EmployeeCalendarEvent = {
  date: string;
  icon_key?: string | null;
  title?: string | null;
  subtitle?: string | null;
  bg_color?: string | null;
  text_color?: string | null;
  sort_datetime?: string | null;
  status_key?: string | null;
  request_kind?: string | null;
};

function requestStatusVisual(statusKey: string | null | undefined) {
  const key = String(statusKey || '').trim().toUpperCase();
  if (['APPROVED', 'APROBADO'].includes(key)) {
    return { bg_color: '#DCFCE7', text_color: '#166534', labelClass: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  }
  if (['PENDING', 'PENDIENTE', 'IN_REVIEW', 'EN_REVISION', 'EN_REVISIÓN', 'REQUESTED', 'SOLICITADO', 'ENVIADA', 'ENVIADO', 'SENT'].includes(key)) {
    return { bg_color: '#FEE2E2', text_color: '#991B1B', labelClass: 'bg-red-100 text-red-700 border-red-200' };
  }
  if (['REJECTED', 'RECHAZADO', 'DENIED', 'DENEGADO'].includes(key)) {
    return { bg_color: '#FFE4E6', text_color: '#9F1239', labelClass: 'bg-rose-100 text-rose-700 border-rose-200' };
  }
  return { bg_color: '#F1F5F9', text_color: '#475569', labelClass: 'bg-slate-100 text-slate-700 border-slate-200' };
}

function toLocalIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const EMPLOYEE_CALENDAR_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  DOOROPEN: DoorOpen,
  DOORCLOSED: DoorClosed,
  ARROWRIGHTCIRCLE: ArrowRightCircle,
  ARROWLEFTCIRCLE: ArrowLeftCircle,
  UTENSILS: Utensils,
  LOGIN: LogIn,
  LOGOUT: LogOut,
  UTENSILSCROSSED: UtensilsCrossed,
  FINGERPRINT: Fingerprint,
  PLANE: Plane,
  BABY: Baby,
  STETHOSCOPE: Stethoscope,
  USERX: UserX,
  CALENDARCHECK2: CalendarCheck2,
  REFRESHCW: RefreshCw,
  CAKE: Cake,
  CLOCK3: Clock3,
  CALENDARDAYS: Calendar,
  FILECHECK: FileText,
};

function normalizeIconKey(raw: string | null | undefined): string {
  return String(raw || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function iconFromCalendarKey(raw: string | null | undefined) {
  const key = normalizeIconKey(raw);
  const explicit = EMPLOYEE_CALENDAR_ICON_MAP[key];
  if (explicit) return explicit;
  const compact = String(raw || '').trim().replace(/[^a-zA-Z0-9]/g, '');
  if (!compact) return CircleDot;
  const pascal = compact.charAt(0).toUpperCase() + compact.slice(1);
  const dynamic = (LucideIcons as Record<string, any>)[pascal];
  return dynamic || CircleDot;
}

function EmployeeMonthlyEventsCalendar({
  year,
  month,
  events,
  emptyLabel,
}: {
  year: number;
  month: number;
  events: EmployeeCalendarEvent[];
  emptyLabel: string;
}) {
  const cursor = new Date(year, Math.max(0, month - 1), 1);
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const leadingDays = (start.getDay() + 6) % 7;
  const totalDays = end.getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < leadingDays; i += 1) cells.push(null);
  for (let day = 1; day <= totalDays; day += 1) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
  while (cells.length % 7 !== 0) cells.push(null);

  const eventMap = new Map<string, EmployeeCalendarEvent[]>();
  for (const event of events || []) {
    const key = String(event?.date || '').slice(0, 10);
    if (!key) continue;
    const list = eventMap.get(key) || [];
    list.push(event);
    eventMap.set(key, list);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold text-muted-foreground">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((name, idx) => (
          <div key={`${name}-${idx}`} className="rounded bg-muted/40 px-1 py-1 text-center">{name}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="h-24 rounded border border-dashed bg-muted/10 sm:h-28" />;
          }
          const key = date.toISOString().slice(0, 10);
          const dayEvents = [...(eventMap.get(key) || [])].sort((a, b) => {
            const left = String(a?.sort_datetime || '');
            const right = String(b?.sort_datetime || '');
            if (left && right) return left.localeCompare(right);
            return String(a?.subtitle || '').localeCompare(String(b?.subtitle || ''));
          });
          const visibleEvents = dayEvents.length > 4 ? dayEvents.slice(0, 3) : dayEvents.slice(0, 4);
          const overflowCount = Math.max(0, dayEvents.length - visibleEvents.length);
          const isToday = key === new Date().toISOString().slice(0, 10);
          return (
            <div
              key={key}
              className={`h-24 rounded border p-1.5 sm:h-28 ${isToday ? 'border-blue-400 bg-blue-50' : 'border-border bg-background'}`}
            >
              <div className="text-xs font-semibold">{date.getDate()}</div>
              <div className="mt-1 h-[calc(100%-14px)] flex items-center justify-center">
                <div className="grid grid-cols-2 gap-1.5 place-items-center w-[60px]">
                {visibleEvents.map((event, eventIndex) => {
                  const Icon = iconFromCalendarKey(event?.icon_key);
                  return (
                    <div
                      key={`${key}-${eventIndex}`}
                      className="size-[26px] rounded flex items-center justify-center"
                      style={{
                        backgroundColor: event?.bg_color || '#E5E7EB',
                        color: event?.text_color || '#111827',
                      }}
                      title={`${event?.title || 'Evento'}${event?.subtitle ? ` - ${event.subtitle}` : ''}`}
                    >
                      <Icon className="size-[18px]" />
                    </div>
                  );
                })}
                {overflowCount > 0 ? (
                  <div className="size-[26px] rounded bg-muted text-muted-foreground text-xs flex items-center justify-center" title={`+${overflowCount} eventos`}>
                    +{overflowCount}
                  </div>
                ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {(!events || events.length === 0) ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : null}
    </div>
  );
}

function EmployeeHome({
  payload,
  rangeLoading,
  onRangeChange,
  onIncidentFlowClosed,
}: {
  payload: any;
  rangeLoading: boolean;
  onRangeChange: (from: string, to: string) => void;
  onIncidentFlowClosed: () => void;
}) {
  const [incidentFlow, setIncidentFlow] = useState<{
    target: 'TIME_PUNCH_REQUEST' | 'SHIFT_CHANGE' | 'JUSTIFICATION';
    search: string;
  } | null>(null);
  const employee = payload?.employee || {};
  const employeeCompany = payload?.employee_company || {};
  const recentPunches = (payload?.recent_punches || []) as any[];
  const week = payload?.week || {};
  const weekDays = (week?.days || []) as any[];
  const requests = (payload?.requests || []) as any[];
  const holidays = (payload?.holidays || []) as any[];
  const calendarMonth = payload?.calendars?.month || payload?.month || {};
  const module2PunchEventsRaw = (payload?.calendars?.modules?.module2_punches || []) as EmployeeCalendarEvent[];
  const module3ShiftEventsRaw = (payload?.calendars?.modules?.module3_shifts || []) as EmployeeCalendarEvent[];
  const module4RequestEventsRaw = (payload?.calendars?.modules?.module4_requests || []) as EmployeeCalendarEvent[];
  const module5HolidayEventsRaw = (payload?.calendars?.modules?.module5_holidays || []) as EmployeeCalendarEvent[];
  const plusEvents = (payload?.attendance_impact?.plus_events || []) as any[];
  const minusEvents = (payload?.attendance_impact?.minus_events || []) as any[];
  const incidents = (payload?.incidents || []) as any[];
  const pendingIncidents = incidents.filter(isPendingIncident);
  const selectedRange = payload?.range || {};
  const plusDisplayEvents = plusEvents.length > 0 ? plusEvents : [
    { key: 'ordinary_minutes', label: 'Jornada ordinaria', total_hours: 0 },
    { key: 'night_minutes', label: 'Jornada nocturna', total_hours: 0 },
    { key: 'extra_50_minutes', label: 'Horas extras 50%', total_hours: 0 },
    { key: 'extra_100_minutes', label: 'Horas extras 100%', total_hours: 0 },
  ];
  const minusDisplayEvents = minusEvents.length > 0 ? minusEvents : [
    { key: 'late_minutes', label: 'Atrasos', total_hours: 0 },
    { key: 'absence_minutes', label: 'Faltas', total_hours: 0 },
    { key: 'early_departure_minutes', label: 'Salidas anticipadas', total_hours: 0 },
  ];
  const maxPlusHours = plusDisplayEvents.reduce((acc, row) => Math.max(acc, Number(row?.total_hours || 0)), 0) || 1;
  const maxMinusHours = minusDisplayEvents.reduce((acc, row) => Math.max(acc, Number(row?.total_hours || 0)), 0) || 1;
  const totalWorkedHours = plusDisplayEvents.reduce((sum, row) => sum + Number(row?.total_hours || 0), 0);
  const totalNotWorkedHours = minusDisplayEvents.reduce((sum, row) => sum + Number(row?.total_hours || 0), 0);
  const toDateKey = (value: string | null | undefined) => String(value || '').slice(0, 10);
  const toPunchHourLabel = (row: any): string => {
    const subtitle = String(row?.subtitle || '').trim();
    if (/^\d{2}:\d{2}$/.test(subtitle)) return subtitle;

    const source = String(row?.sort_datetime || row?.punch_datetime || row?.datetime || '').trim();
    const match = source.match(/(?:T|\s)(\d{2}:\d{2})/);
    if (match?.[1]) return match[1];

    const subtitleMatch = subtitle.match(/(?:T|\s)(\d{2}:\d{2})/);
    if (subtitleMatch?.[1]) return subtitleMatch[1];
    return subtitle;
  };

  const module2PunchEvents = module2PunchEventsRaw.length > 0
    ? module2PunchEventsRaw.map((row: any) => ({
      ...row,
      subtitle: toPunchHourLabel(row),
    }))
    : recentPunches.flatMap((row: any) => {
      const date = toDateKey(row?.punch_datetime);
      if (!date) return [];
      const key = Number(row?.punch_key);
      const icon_key =
        key === 1 ? 'DoorOpen'
          : key === 2 ? 'Utensils'
            : key === 3 ? 'UtensilsCrossed'
              : key === 4 ? 'DoorClosed'
                : key === 5 ? 'ArrowRightCircle'
                  : key === 6 ? 'ArrowLeftCircle'
                    : 'Fingerprint';
      return [{
        date,
        icon_key,
        bg_color: [1, 2, 5].includes(key) ? '#DCFCE7' : '#FEE2E2',
        text_color: [1, 2, 5].includes(key) ? '#166534' : '#991B1B',
        title: row?.movement_label || 'Marcacion',
        subtitle: String(row?.punch_datetime || '').slice(11, 16),
        sort_datetime: String(row?.punch_datetime || ''),
      }];
    }).sort((a: any, b: any) => String(a?.sort_datetime || '').localeCompare(String(b?.sort_datetime || '')));

  const module3ShiftEvents = module3ShiftEventsRaw.length > 0
    ? module3ShiftEventsRaw
    : weekDays.flatMap((day: any) => {
      const date = toDateKey(day?.date);
      const shift = day?.shift;
      if (!date || !shift) return [];
      const startTime = String(shift?.effective_start_time || '').slice(0, 5) || '--:--';
      return [{
        date,
        icon_key: shift?.effective_shift_icon_key || 'Clock3',
        bg_color: shift?.effective_shift_bg_color || '#DCFCE7',
        text_color: shift?.effective_shift_text_color || '#14532D',
        title: shift?.effective_shift_short_name || shift?.effective_shift_name || 'Turno',
        subtitle: startTime,
      }];
    });

  const module4RequestEvents = module4RequestEventsRaw.length > 0
    ? module4RequestEventsRaw.map((row) => ({
      ...row,
      ...requestStatusVisual(row.status_key),
    }))
    : requests.flatMap((row: any) => {
      const date = toDateKey(row?.start_datetime || row?.shift_date || row?.request_datetime || row?.created_at);
      if (!date) return [];
      return [{
        date,
        icon_key: row?.shift_date ? 'RefreshCw' : row?.target_punch_id || row?.request_datetime ? 'ClipboardCheck' : 'FileCheck',
        ...requestStatusVisual(row?.request_status_key),
        title: row?.justification_name || row?.event_name || row?.request_type_label || (row?.shift_date ? 'Cambio de turno' : 'Solicitud'),
        subtitle: row?.request_status_label || row?.request_status_key || '-',
        status_key: row?.request_status_key || null,
      }];
    });

  const module5HolidayEvents = module5HolidayEventsRaw.length > 0
    ? module5HolidayEventsRaw
    : holidays.flatMap((row: any) => {
      const date = toDateKey(row?.holiday_date);
      if (!date) return [];
      return [{
        date,
        icon_key: row?.holiday_type_icon_key || 'CalendarDays',
        bg_color: '#DCFCE7',
        text_color: row?.holiday_type_icon_color || '#166534',
        title: row?.holiday_name || 'Feriado',
      }];
    });
  const todayIso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const mobileRequestRows = requests.slice(0, 6);
  const upcomingShiftDays = ((payload?.upcoming_shift_days || weekDays) as any[])
    .filter((day) => String(day?.date || '') >= todayIso)
    .slice(0, 8);
  const upcomingRangeLabel = upcomingShiftDays.length > 0
    ? `${formatDate(upcomingShiftDays[0]?.date)} – ${formatDate(upcomingShiftDays[upcomingShiftDays.length - 1]?.date)}`
    : 'Desde hoy';
  const requestTitle = (row: any) => {
    if (row?.shift_date) return 'Cambio de turno';
    if (row?.target_punch_id || row?.request_type_label || row?.request_datetime) return 'Gestión de marcación';
    return row?.justification_name || row?.event_name || 'Justificación o permiso';
  };
  const requestDate = (row: any) => row?.start_datetime || row?.shift_date || row?.request_datetime || row?.created_at;

  const shiftRangeByWeek = (direction: -1 | 1) => {
    const from = new Date(`${selectedRange.from}T00:00:00`);
    if (Number.isNaN(from.getTime())) return;
    const targetMonday = new Date(from);
    targetMonday.setDate(targetMonday.getDate() - ((targetMonday.getDay() + 6) % 7));
    targetMonday.setDate(targetMonday.getDate() + direction * 7);
    const targetSunday = new Date(targetMonday);
    targetSunday.setDate(targetSunday.getDate() + 6);
    const today = new Date(`${selectedRange.today}T00:00:00`);
    if (direction > 0 && targetMonday > today) return;
    const targetTo = targetSunday > today ? today : targetSunday;
    onRangeChange(toLocalIsoDate(targetMonday), toLocalIsoDate(targetTo));
  };

  const goToCurrentWeek = () => {
    const today = new Date(`${selectedRange.today}T00:00:00`);
    if (Number.isNaN(today.getTime())) return;
    const monday = new Date(today);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    onRangeChange(toLocalIsoDate(monday), selectedRange.today);
  };

  const openIncidentJustification = (incident: any) => {
    const params = new URLSearchParams();
    params.set('open_popup', '1');
    params.set('source', 'my-incidents');
    if (incident?.incident_date) params.set('date', String(incident.incident_date));

    if (incident?.request_target === 'TIME_PUNCH_REQUEST') {
      if (incident?.request_id) {
        params.set('request_id', String(incident.request_id));
        params.set('mode', 'view');
      } else {
        params.set('mode', 'create');
        params.set('request_type_key', String(incident?.suggested_request_type_key || 'CREATE_PUNCH'));
        if (incident?.suggested_punch_key) params.set('punch_key', String(incident.suggested_punch_key));
        if (incident?.last_punch_id) params.set('context_punch_id', String(incident.last_punch_id));
        params.set('incident', String(incident?.event_name || 'Incidencia de marcación'));
        params.set('reason', String(incident?.notes || 'Regularización de una incidencia de marcación.'));
      }
      setIncidentFlow({ target: 'TIME_PUNCH_REQUEST', search: params.toString() });
      return;
    }

    if (incident?.request_target === 'SHIFT_CHANGE') {
      params.set('mode', incident?.request_id ? 'view' : 'create');
      if (incident?.request_id) params.set('request_id', String(incident.request_id));
      if (incident?.shift_id) params.set('current_shift_id', String(incident.shift_id));
      if (incident?.notes) params.set('reason', String(incident.notes));
      setIncidentFlow({ target: 'SHIFT_CHANGE', search: params.toString() });
      return;
    }

    if (incident?.request_id) {
      params.set('request_id', String(incident.request_id));
      params.set('mode', 'view');
    } else {
      params.set('mode', 'create');
      params.set('date', String(incident?.incident_date || ''));
      if (incident?.attendance_event_id) params.set('attendance_event_id', String(incident.attendance_event_id));
      if (incident?.justification_type_id) params.set('justification_type_id', String(incident.justification_type_id));
      if (incident?.calculation_id) params.set('calculation_id', String(incident.calculation_id));
      params.set('incident', String(incident?.event_name || 'Incidencia de asistencia'));
      if (Number(incident?.minutes || 0) > 0) params.set('minutes', String(incident.minutes));
      if (incident?.notes) params.set('detail', String(incident.notes));
      if (incident?.start_date) params.set('start_date', String(incident.start_date));
      if (incident?.end_date) params.set('end_date', String(incident.end_date));
      if (incident?.start_time) params.set('start_time', String(incident.start_time));
      if (incident?.end_time) params.set('end_time', String(incident.end_time));
    }
    setIncidentFlow({ target: 'JUSTIFICATION', search: params.toString() });
  };

  const closeIncidentFlow = () => {
    setIncidentFlow(null);
    onIncidentFlowClosed();
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3" aria-label="Resumen de asistencia por rango de fechas">
        <div className="flex flex-col gap-3 rounded-xl border bg-white p-3 shadow-sm sm:p-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Resumen de mi asistencia</h2>
            <p className="text-xs text-muted-foreground">Las incidencias, horas trabajadas y tiempos no laborados corresponden al mismo período.</p>
          </div>
          <div className="grid w-full grid-cols-[36px_minmax(0,1fr)_minmax(0,1fr)_36px] items-end gap-1.5 sm:gap-2 lg:w-auto lg:min-w-[560px] lg:grid-cols-[36px_minmax(145px,1fr)_minmax(145px,1fr)_36px_auto]">
            <button
              type="button"
              onClick={() => shiftRangeByWeek(-1)}
              disabled={rangeLoading}
              className="flex h-9 w-9 items-center justify-center rounded-md border bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              aria-label="Semana anterior"
              title="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <label className="min-w-0 space-y-1 text-xs text-slate-600">
              <span className="block">Desde</span>
              <StandardDateInput
                value={selectedRange.from || ''}
                max={selectedRange.to || selectedRange.today || ''}
                onValueChange={(value) => onRangeChange(value, selectedRange.to)}
                disabled={rangeLoading}
                className="h-9 w-full min-w-0 rounded-md border bg-white px-1.5 text-xs text-slate-900 disabled:opacity-60 sm:px-2 sm:text-sm"
              />
            </label>
            <label className="min-w-0 space-y-1 text-xs text-slate-600">
              <span className="block">Hasta</span>
              <StandardDateInput
                value={selectedRange.to || ''}
                min={selectedRange.from || ''}
                max={selectedRange.today || ''}
                onValueChange={(value) => onRangeChange(selectedRange.from, value)}
                disabled={rangeLoading}
                className="h-9 w-full min-w-0 rounded-md border bg-white px-1.5 text-xs text-slate-900 disabled:opacity-60 sm:px-2 sm:text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => shiftRangeByWeek(1)}
              disabled={rangeLoading || !selectedRange.can_navigate_next_week}
              className="flex h-9 w-9 items-center justify-center rounded-md border bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Semana siguiente"
              title={!selectedRange.can_navigate_next_week ? 'No hay navegación a semanas futuras' : 'Semana siguiente'}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {!selectedRange.is_current_week ? (
              <button
                type="button"
                onClick={goToCurrentWeek}
                disabled={rangeLoading}
                className="col-span-4 h-8 justify-self-end rounded-md border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 lg:col-span-1 lg:h-9 lg:justify-self-stretch lg:whitespace-nowrap"
              >
                <span className="lg:hidden">Semana actual</span>
                <span className="hidden lg:inline">Última semana</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-4 xl:grid-cols-3 ${rangeLoading ? 'opacity-60' : ''}`} aria-busy={rangeLoading}>
          <Card className={`border-amber-200 ${pendingIncidents.length === 0 ? 'hidden md:block' : ''}`}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="md:hidden">Mis incidencias pendientes</span>
                    <span className="hidden md:inline">Mis incidencias</span>
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs">Selecciona una fila para gestionar el requerimiento correspondiente.</CardDescription>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                  <span className="md:hidden">{pendingIncidents.length}</span>
                  <span className="hidden md:inline">{incidents.length}</span>
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              {incidents.length === 0 ? (
                <div className="rounded-lg bg-emerald-50 px-3 py-4 text-center text-xs text-emerald-700">
                  No tienes incidencias en este período.
                </div>
              ) : (
                <div className="max-h-72 divide-y overflow-y-auto rounded-lg border">
                  {incidents.map((incident: any, index: number) => (
                    <button
                      type="button"
                      key={incident.id || `${incident.incident_date}-${incident.event_short_name}-${index}`}
                      onClick={() => openIncidentJustification(incident)}
                      className={`group w-full items-center gap-2 bg-white px-3 py-2.5 text-left hover:bg-amber-50 ${isPendingIncident(incident) ? 'flex' : 'hidden md:flex'}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-semibold text-slate-900">{incident.event_name}</span>
                          {incident.request_status_label || incident.request_status_key ? (
                            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] ${statusPillClass(incident.request_status_key || incident.request_status_label)}`}>
                              {incident.request_status_label || incident.request_status_key}
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-600">
                              {incident.request_target === 'TIME_PUNCH_REQUEST'
                                ? 'Gestionar marcación'
                                : incident.request_target === 'SHIFT_CHANGE'
                                  ? 'Cambiar turno'
                                  : 'Justificar'}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[10px] text-slate-500">
                          {formatDate(incident.incident_date)}
                          {Number(incident.minutes || 0) > 0 ? ` · ${Number(incident.minutes).toFixed(0)} min` : ''}
                          {incident.punch_count ? ` · ${incident.punch_count} marcaciones` : ''}
                        </p>
                        {incident.notes ? (
                          <p className="mt-0.5 truncate text-[10px] text-slate-600" title={incident.notes}>{incident.notes}</p>
                        ) : null}
                      </div>
                      {incident.request_id ? (
                        <Eye className="h-4 w-4 shrink-0 text-blue-600" aria-label="Ver detalle de la solicitud" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-amber-600 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-emerald-200">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-600" />Mis horas trabajadas</span>
                <span className="text-sm text-emerald-700">{totalWorkedHours.toFixed(2)} h</span>
              </CardTitle>
              <CardDescription className="text-xs">Distribución de jornada y sobretiempos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-1">
              {plusDisplayEvents.map((row) => {
                const pct = Number(row.total_hours || 0) > 0
                  ? Math.max(4, Math.round((Number(row.total_hours || 0) / maxPlusHours) * 100))
                  : 0;
                return (
                  <div key={row.key || row.attendance_event_id || row.label}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-slate-700">{row.label || row.event_short_name || row.event_name}</span>
                      <span className="shrink-0 font-semibold text-emerald-700">{Number(row.total_hours || 0).toFixed(2)} h</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded bg-emerald-50">
                      <div className="h-full rounded bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-rose-200">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-rose-600" />Mis tiempos no laborados</span>
                <span className="text-sm text-rose-700">{totalNotWorkedHours.toFixed(2)} h</span>
              </CardTitle>
              <CardDescription className="text-xs">Atrasos, faltas, salidas y otras afectaciones.</CardDescription>
            </CardHeader>
            <CardContent className="max-h-72 space-y-3 overflow-y-auto p-4 pt-1">
              {minusDisplayEvents.map((row) => {
                const pct = Number(row.total_hours || 0) > 0
                  ? Math.max(4, Math.round((Number(row.total_hours || 0) / maxMinusHours) * 100))
                  : 0;
                return (
                  <div key={row.key || row.attendance_event_id || row.label}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-slate-700">{row.label || row.event_short_name || row.event_name}</span>
                      <span className="shrink-0 font-semibold text-rose-700">{Number(row.total_hours || 0).toFixed(2)} h</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded bg-rose-50">
                      <div className="h-full rounded bg-rose-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="space-y-3 md:hidden">
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-blue-700" />
              Estado de requerimientos
            </CardTitle>
            <CardDescription className="text-xs">Cambios de turno, marcaciones, justificaciones y permisos.</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {mobileRequestRows.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">No hay requerimientos recientes.</p>
            ) : (
              <div className="divide-y overflow-hidden rounded-lg border">
                {mobileRequestRows.map((row: any, index: number) => {
                  const visual = requestStatusVisual(row?.request_status_key);
                  const RequestIcon = row?.shift_date ? RefreshCw : row?.target_punch_id || row?.request_datetime ? Fingerprint : FileText;
                  return (
                    <div key={row?.id || `request-${index}`} className="flex items-center gap-2 bg-white px-2.5 py-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: visual.bg_color, color: visual.text_color }}>
                        <RequestIcon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-900">{requestTitle(row)}</p>
                        <p className="text-[10px] text-slate-500">{formatDate(requestDate(row))}</p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] ${visual.labelClass}`}>
                        {row?.request_status_label || row?.request_status_key || '-'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="h-4 w-4 text-emerald-700" />
              Próximos turnos
            </CardTitle>
            <CardDescription className="text-xs">{upcomingRangeLabel}</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {upcomingShiftDays.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">No hay turnos asignados desde hoy.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {upcomingShiftDays.map((day: any) => {
                  const shift = day?.shift;
                  const ShiftIcon = iconFromCalendarKey(shift?.effective_shift_icon_key || 'Clock3');
                  return (
                    <div key={day.date} className="flex min-w-0 items-center gap-2 rounded-lg border p-2">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                        style={{
                          backgroundColor: shift?.effective_shift_bg_color || '#F1F5F9',
                          color: shift?.effective_shift_text_color || '#475569',
                        }}
                      >
                        <ShiftIcon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold capitalize text-slate-500">{day.weekday_label || formatDate(day.date)}</p>
                        <p className="truncate text-[11px] font-semibold text-slate-900">
                          {shift?.effective_shift_short_name || shift?.effective_shift_name || 'Sin turno'}
                        </p>
                        <p className="text-[9px] text-slate-500">{formatDate(day.date)} · {formatShiftTime(shift?.effective_start_time)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="hidden space-y-6 md:block">
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="punches" className="w-full">
            <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start">
              <TabsTrigger value="punches">Módulo 2: Marcaciones</TabsTrigger>
              <TabsTrigger value="shifts">Módulo 3: Turnos asignados</TabsTrigger>
              <TabsTrigger value="requests">Módulo 4: Solicitudes</TabsTrigger>
              <TabsTrigger value="holidays">Módulo 5: Feriados</TabsTrigger>
            </TabsList>

            <TabsContent value="punches" className="space-y-4">
              <div>
                <CardTitle>Modulo 2: Marcaciones</CardTitle>
                <CardDescription>Iconos de entrada, salida y lunch por día</CardDescription>
              </div>
              <EmployeeMonthlyEventsCalendar
                year={Number(calendarMonth?.year) || new Date().getFullYear()}
                month={Number(calendarMonth?.month) || (new Date().getMonth() + 1)}
                events={module2PunchEvents}
                emptyLabel="Sin marcaciones del mes."
              />
            </TabsContent>

            <TabsContent value="shifts" className="space-y-4">
              <div>
                <CardTitle>Modulo 3: Turnos asignados</CardTitle>
                <CardDescription>Turnos del mes con icono y color por turno</CardDescription>
              </div>
              <EmployeeMonthlyEventsCalendar
                year={Number(calendarMonth?.year) || new Date().getFullYear()}
                month={Number(calendarMonth?.month) || (new Date().getMonth() + 1)}
                events={module3ShiftEvents}
                emptyLabel="Sin turnos asignados en el mes."
              />
            </TabsContent>

            <TabsContent value="requests" className="space-y-4">
              <div>
                <CardTitle>Modulo 4: Solicitudes</CardTitle>
                <CardDescription>Justificaciones, permisos y cambios de turno</CardDescription>
              </div>
              <EmployeeMonthlyEventsCalendar
                year={Number(calendarMonth?.year) || new Date().getFullYear()}
                month={Number(calendarMonth?.month) || (new Date().getMonth() + 1)}
                events={module4RequestEvents}
                emptyLabel="Sin solicitudes del mes."
              />
            </TabsContent>

            <TabsContent value="holidays" className="space-y-4">
              <div>
                <CardTitle>Modulo 5: Feriados</CardTitle>
                <CardDescription>Feriados aplicables, cumpleaños y reuniones</CardDescription>
              </div>
              <EmployeeMonthlyEventsCalendar
                year={Number(calendarMonth?.year) || new Date().getFullYear()}
                month={Number(calendarMonth?.month) || (new Date().getMonth() + 1)}
                events={module5HolidayEvents}
                emptyLabel="Sin feriados del mes."
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
      {incidentFlow ? (
        <div className="hidden" aria-hidden="true">
          {incidentFlow.target === 'TIME_PUNCH_REQUEST' ? (
            <KioskTimePunchRequests
              deepLinkSearch={incidentFlow.search}
              onPopupClose={closeIncidentFlow}
            />
          ) : incidentFlow.target === 'SHIFT_CHANGE' ? (
            <KioskShiftChange
              deepLinkSearch={incidentFlow.search}
              onPopupClose={closeIncidentFlow}
            />
          ) : (
            <KioskRequests
              deepLinkSearch={incidentFlow.search}
              onPopupClose={closeIncidentFlow}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

const SYSTEM_ADMIN_CHART_COLORS = [
  '#2563eb',
  '#059669',
  '#f59e0b',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#ea580c',
  '#4f46e5',
  '#16a34a',
  '#be123c',
  '#0f766e',
  '#6d28d9',
];

const SUPERVISOR_ISSUE_PIE_CONFIG = [
  { eventKey: 'FALTA', label: 'Faltas', color: '#dc2626' },
  { eventKey: 'ATRASO', label: 'Atrasos no just.', color: '#f59e0b' },
  { eventKey: 'SALIDA_ANTICIPADA', label: 'Salidas anticipadas', color: '#f97316' },
  { eventKey: 'JUSTIFICADO', label: 'Justificados', color: '#22c55e' },
];

const SUPERVISOR_NO_ISSUE_COLOR = '#e2e8f0';

const SUPERVISOR_SURCHARGE_PIE_CONFIG = [
  { key: 'ordinary_minutes', label: 'Jornada ordinaria', detail: 'Sin recargo', color: '#10b981' },
  { key: 'night_minutes', label: 'Jornada nocturna', detail: 'Recargo 25%', color: '#22c55e' },
  { key: 'extra_50_minutes', label: 'Horas extra 50%', detail: 'Recargo 50%', color: '#06b6d4' },
  { key: 'extra_100_minutes', label: 'Horas extra 100%', detail: 'Recargo 100%', color: '#7c3aed' },
];

const LATEST_PUNCH_LIMIT_OPTIONS = [10, 25, 50, 100];

function formatMetric(value: unknown): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('es-EC');
}

function formatPercent(value: unknown): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '0%';
  return `${num.toLocaleString('es-EC', { maximumFractionDigits: 1 })}%`;
}

function formatHours(value: unknown): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '0 h';
  return `${num.toLocaleString('es-EC', { maximumFractionDigits: 1 })} h`;
}

function formatTimeOnly(value: string | null | undefined): string {
  return formatClientTime24(value, 'es-EC');
}

function formatPunchTimeCompact(value: string | null | undefined): string {
  return formatClientTime24(value, 'es-EC');
}

function normalizeMovementLabel(row: any): string {
  const raw = String(row.movement_label || '').trim();
  const key = raw.toUpperCase();
  if (key === 'ENTRADA A TRABAJO' || key === 'ENTRADA TRABAJO') return 'Entrada de trabajo';
  if (key === 'SALIDA') return 'Salida de trabajo';
  return raw || `Movimiento ${row.punch_key}`;
}

function isLateEvent(eventKey: string | null | undefined): boolean {
  return String(eventKey || '').toUpperCase().startsWith('ATRASO');
}

function formatLatestPunchDescription(row: any): string {
  if (String(row.event_key || '').toUpperCase() === 'NO_APLICA') {
    return `${formatPunchTimeCompact(row.punch_datetime)} ${normalizeMovementLabel(row)} | No aplica en turno`;
  }

  const movementLabel = String(row.movement_label || '').trim().toUpperCase();
  const isWorkdayExit = Number(row.punch_key) === 4 || movementLabel === 'SALIDA';
  const shiftLabel = isWorkdayExit ? 'Salida turno' : 'Entrada turno';
  const shiftTime = isWorkdayExit ? row.shift_work_end_time : row.shift_start_time;
  const markingLocation = row.device_work_location_short_name || row.device_work_location_name || row.device_location || 'Sin localidad de marcación';
  const parts = [
    `${formatPunchTimeCompact(row.punch_datetime)} ${normalizeMovementLabel(row)} (${formatTimeOnly(shiftTime)} ${shiftLabel})`,
    markingLocation,
  ];

  if (row.is_holiday) {
    parts.push(`Feriado: ${row.holiday_name || 'Sí'}`, `Trabaja feriados: ${row.work_on_holidays ? 'Sí' : 'No'}`);
  }
  if (isLateEvent(row.event_key)) {
    const statusKey = String(row.late_justification_status_key || '').toUpperCase();
    parts.push(['APPROVED', 'APROBADO'].includes(statusKey) ? 'Justificado' : 'Por justificar');
  } else if (row.has_approved_leave) {
    parts.push(`Permiso: ${row.approved_leave_name || 'Aprobado'}`);
  }

  return `${parts.slice(0, 2).join(' - ')}${parts.length > 2 ? ` | ${parts.slice(2).join(' | ')}` : ''}`;
}

function eventLabel(eventKey: string | null | undefined, row?: any): string {
  const key = String(eventKey || '').toUpperCase();
  if (key === 'FALTA') return 'Falta';
  if (key.startsWith('ATRASO')) return 'Atraso';
  if (key === 'SALIDA_ANTICIPADA') return 'Salida anticipada';
  if (key === 'PERMISO_APROBADO') return 'Permiso aprobado';
  if (key === 'FERIADO') return 'Feriado';
  if (key === 'NO_APLICA') return 'No aplica';
  if (key === 'NO_LABORAL') return 'No laboral';
  return row?.has_approved_punch_change ? 'Justificada' : 'Ok';
}

function eventPillClass(eventKey: string | null | undefined, row?: any): string {
  const key = String(eventKey || '').toUpperCase();
  if (key === 'FALTA') return 'bg-red-100 text-red-700';
  if (key === 'ATRASO_JUSTIFICADO') return 'bg-emerald-100 text-emerald-700';
  if (key === 'ATRASO_JUSTIFICACION_PENDIENTE') return 'bg-red-100 text-red-700';
  if (key === 'ATRASO') return 'bg-red-100 text-red-700';
  if (key === 'SALIDA_ANTICIPADA') {
    const statusKey = String(row?.early_departure_justification_status_key || '').toUpperCase();
    return ['APPROVED', 'APROBADO'].includes(statusKey) ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';
  }
  if (key === 'PERMISO_APROBADO') return 'bg-blue-100 text-blue-700';
  if (key === 'FERIADO') return 'bg-violet-100 text-violet-700';
  if (key === 'NO_APLICA') return 'bg-slate-100 text-slate-700';
  if (key === 'NO_LABORAL') return 'bg-slate-100 text-slate-700';
  return 'bg-emerald-100 text-emerald-700';
}

function timeInputToMinutes(value: string): number | null {
  const match = String(value || '').match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function dateTimeToLocalMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.getHours() * 60 + date.getMinutes();
  }
  const match = String(value).match(/(?:T|\s)(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function getDefaultLatestPunchesFromTime(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '07:00';
  if (hour < 15) return '12:00';
  if (hour < 17) return '15:00';
  if (hour < 20) return '17:00';
  return '23:00';
}

function SupervisorIssuesPie({
  rows,
  total,
  populationLabel = 'empleados con turno',
}: {
  rows: Array<{ eventKey: string; label: string; color: string; affected: number }>;
  total: number;
  populationLabel?: string;
}) {
  const safeTotal = Math.max(0, Math.trunc(Number(total || 0)));
  const totalAffected = rows.reduce((sum, row) => sum + Math.max(0, Math.trunc(Number(row.affected || 0))), 0);
  const noIssueCount = Math.max(0, safeTotal - totalAffected);
  const data = [
    ...rows
    .map((row) => ({
      ...row,
      value: Math.max(0, Math.trunc(Number(row.affected || 0))),
      percent: safeTotal > 0 ? (Math.max(0, Math.trunc(Number(row.affected || 0))) / safeTotal) * 100 : 0,
    }))
    .filter((row) => row.value > 0),
    ...(noIssueCount > 0 ? [{
      eventKey: 'SIN_NOVEDAD',
      label: 'Sin novedad',
      color: SUPERVISOR_NO_ISSUE_COLOR,
      affected: noIssueCount,
      value: noIssueCount,
      percent: safeTotal > 0 ? (noIssueCount / safeTotal) * 100 : 0,
    }] : []),
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <div className="rounded-lg border bg-white p-3">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={58}
              outerRadius={92}
              paddingAngle={data.length > 1 ? 2 : 0}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`${entry.eventKey}-${index}`}
                  fill={entry.color}
                />
              ))}
            </Pie>
            <RechartsTooltip
              formatter={(value: unknown, name: unknown, item: any) => [
                `${formatMetric(value)} (${formatPercent(item?.payload?.percent)})`,
                String(name),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="text-center">
          <p className="text-2xl font-bold">{formatPercent(safeTotal > 0 ? (totalAffected / safeTotal) * 100 : 0)}</p>
          <p className="text-xs text-muted-foreground">{formatMetric(totalAffected)} incidencias / {formatMetric(safeTotal)} {populationLabel}</p>
        </div>
      </div>
      <div className="grid content-center gap-2">
        {rows.map((row) => {
          const percent = safeTotal > 0 ? (Number(row.affected || 0) / safeTotal) * 100 : 0;
          return (
            <div key={row.eventKey} className="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                <span className="truncate font-medium">{row.label}</span>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold">{formatMetric(row.affected)} / {formatMetric(safeTotal)}</p>
                <p className="text-xs text-muted-foreground">{formatPercent(percent)}</p>
              </div>
            </div>
          );
        })}
        {safeTotal > 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: SUPERVISOR_NO_ISSUE_COLOR }} />
              <span className="truncate font-medium">Sin novedad</span>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-semibold">{formatMetric(noIssueCount)} / {formatMetric(safeTotal)}</p>
              <p className="text-xs text-muted-foreground">{formatPercent(safeTotal > 0 ? (noIssueCount / safeTotal) * 100 : 0)}</p>
            </div>
          </div>
        ) : null}
        {data.length === 0 ? (
          <p className="rounded-lg border bg-white px-3 py-2 text-sm text-muted-foreground">Sin novedades operativas detectadas hoy.</p>
        ) : null}
      </div>
    </div>
  );
}

function SupervisorSurchargePie({
  rows,
}: {
  rows: Array<{ key: string; label: string; detail: string; color: string; minutes: number }>;
}) {
  const totalMinutes = rows.reduce((sum, row) => sum + Math.max(0, Math.trunc(Number(row.minutes || 0))), 0);
  const data = rows
    .map((row) => ({
      ...row,
      value: Math.max(0, Math.trunc(Number(row.minutes || 0))),
      hours: Math.max(0, Number(row.minutes || 0)) / 60,
      percent: totalMinutes > 0 ? (Math.max(0, Math.trunc(Number(row.minutes || 0))) / totalMinutes) * 100 : 0,
    }))
    .filter((row) => row.value > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <div className="rounded-lg border bg-white p-3">
        <ResponsiveContainer width="100%" height={170}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={45}
              outerRadius={72}
              paddingAngle={data.length > 1 ? 2 : 0}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={`${entry.key}-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip
              formatter={(value: unknown, name: unknown, item: any) => [
                `${formatHours(Number(value || 0) / 60)} (${formatPercent(item?.payload?.percent)})`,
                String(name),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="text-center">
          <p className="text-2xl font-bold">{formatHours(totalMinutes / 60)}</p>
          <p className="text-xs text-muted-foreground">Total horas laboradas</p>
        </div>
      </div>
      <div className="grid content-center gap-2">
        {rows.map((row) => {
          const minutes = Math.max(0, Math.trunc(Number(row.minutes || 0)));
          const percent = totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0;
          return (
            <div key={row.key} className="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.detail}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold">{formatHours(minutes / 60)}</p>
                <p className="text-xs text-muted-foreground">{formatPercent(percent)}</p>
              </div>
            </div>
          );
        })}
        {data.length === 0 ? (
          <p className="rounded-lg border bg-white px-3 py-2 text-sm text-muted-foreground">Sin horas laboradas registradas hoy.</p>
        ) : null}
      </div>
    </div>
  );
}

function SupervisorPeriodLineChart({
  title,
  description,
  rows,
  lines,
  valueFormatter,
}: {
  title: string;
  description: string;
  rows: any[];
  lines: Array<{ key: string; label: string; color: string }>;
  valueFormatter: (value: unknown) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} interval={0} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
            <RechartsTooltip
              formatter={(value: unknown, name: unknown) => [valueFormatter(value), String(name)]}
              labelFormatter={(label) => `Periodo: ${label}`}
            />
            <Legend />
            {lines.map((line) => (
              <Line key={line.key} type="monotone" dataKey={line.key} name={line.label} stroke={line.color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function SupervisorBreakdownRanking({
  title,
  rows,
  segments,
  valueFormatter,
}: {
  title: string;
  rows: any[];
  segments: Array<{ key: string; label: string; color: string }>;
  valueFormatter: (value: unknown) => string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos para el periodo.</p>
        ) : rows.slice(0, 5).map((row, index) => {
          const values = segments.map((segment) => ({
            ...segment,
            value: Math.max(0, Number(row?.[segment.key] || 0)),
          }));
          const total = values.reduce((sum, segment) => sum + segment.value, 0);

          return (
            <div key={`${title}-${index}`} className="rounded-lg border bg-white p-2.5">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.name || 'Sin nombre'}</p>
                  {row.employee_code ? <p className="text-xs text-muted-foreground">{row.employee_code}</p> : null}
                </div>
                <span className="shrink-0 text-xs font-semibold text-slate-600">{valueFormatter(total)}</span>
              </div>
              <div className="flex h-7 overflow-hidden rounded-md bg-slate-100" aria-label={`Distribución de ${row.name || 'ranking'}`}>
                {values.filter((segment) => segment.value > 0).map((segment) => {
                  const percent = total > 0 ? (segment.value / total) * 100 : 0;
                  return (
                    <div
                      key={segment.key}
                      className="min-w-0 cursor-help transition-opacity hover:opacity-80"
                      style={{ backgroundColor: segment.color, width: `${percent}%` }}
                      title={`${segment.label}: ${valueFormatter(segment.value)} (${formatPercent(percent)})`}
                      aria-label={`${segment.label}: ${valueFormatter(segment.value)}, ${formatPercent(percent)}`}
                    />
                  );
                })}
                {total === 0 ? <div className="w-full bg-slate-100" title="Sin valores para el periodo" /> : null}
              </div>
            </div>
          );
        })}
        {rows.length > 0 ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
            {segments.map((segment) => (
              <div key={segment.key} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: segment.color }} />
                <span>{segment.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SupervisorHome({
  payload,
  periodInterval,
  onPeriodIntervalChange,
}: {
  payload: any;
  periodInterval: 'last_7_days' | 'last_4_weeks';
  onPeriodIntervalChange: (interval: 'last_7_days' | 'last_4_weeks') => void;
}) {
  const [latestPunchesFromTime, setLatestPunchesFromTime] = useState(() => getDefaultLatestPunchesFromTime());
  const [latestPunchesLimit, setLatestPunchesLimit] = useState(10);
  const todayIssues = Array.isArray(payload?.today_issues) ? payload.today_issues : [];
  const latestPunches = Array.isArray(payload?.latest_punches) ? payload.latest_punches : [];
  const periodAnalytics = payload?.period_analytics || {};
  const periodSummary = periodAnalytics?.summary || {};
  const periodSeries = Array.isArray(periodAnalytics?.series) ? periodAnalytics.series : [];
  const periodRankings = periodAnalytics?.rankings || {};
  const assignedEmployees = Math.max(0, Number(payload?.metrics?.assigned_employees || 0));
  const hasScheduledEmployeesMetric = payload?.metrics?.today_scheduled_employees !== undefined && payload?.metrics?.today_scheduled_employees !== null;
  const scheduledEmployeesToday = Math.max(0, Number(payload?.metrics?.today_scheduled_employees || 0));
  const issuePopulation = hasScheduledEmployeesMetric ? scheduledEmployeesToday : assignedEmployees;
  const surchargeHours = payload?.surcharge_hours || {};

  const issuePieRows = useMemo(() => (
    SUPERVISOR_ISSUE_PIE_CONFIG.map((config) => ({
      ...config,
      affected:
        config.eventKey === 'FALTA'
          ? Number(payload?.metrics?.today_absences || 0)
          : config.eventKey === 'ATRASO'
            ? Number(payload?.metrics?.today_late || 0)
            : config.eventKey === 'SALIDA_ANTICIPADA'
              ? Number(payload?.metrics?.today_early_departures || 0)
              : Number(payload?.metrics?.today_justified || 0),
    }))
  ), [payload?.metrics?.today_absences, payload?.metrics?.today_late, payload?.metrics?.today_early_departures, payload?.metrics?.today_justified]);

  const surchargeRows = useMemo(() => (
    SUPERVISOR_SURCHARGE_PIE_CONFIG.map((config) => ({
      ...config,
      minutes: Math.max(0, Number(surchargeHours?.[config.key] || 0)),
    }))
  ), [surchargeHours]);

  const filteredLatestPunches = useMemo(() => {
    const fromMinutes = timeInputToMinutes(latestPunchesFromTime);
    if (fromMinutes === null) return latestPunches;

    return latestPunches.filter((row: any) => {
      const punchMinutes = dateTimeToLocalMinutes(row?.punch_datetime);
      return punchMinutes !== null && punchMinutes >= fromMinutes;
    });
  }, [latestPunches, latestPunchesFromTime]);

  const visibleLatestPunches = filteredLatestPunches.slice(0, latestPunchesLimit);

  const periodIssueRows = SUPERVISOR_ISSUE_PIE_CONFIG.map((config) => ({
    ...config,
    affected:
      config.eventKey === 'FALTA'
        ? Number(periodSummary?.absences || 0)
        : config.eventKey === 'ATRASO'
          ? Number(periodSummary?.late || 0)
          : Number(periodSummary?.early_departures || 0),
  }));
  const periodSurchargeRows = SUPERVISOR_SURCHARGE_PIE_CONFIG.map((config) => ({
    ...config,
    minutes: Math.max(0, Number(periodSummary?.[config.key] || 0)),
  }));
  const intervalLabel = periodInterval === 'last_4_weeks' ? 'Últimas 4 semanas' : 'Últimos 7 días';
  const intervalDescription = periodInterval === 'last_4_weeks'
    ? 'Semanas ISO acumuladas hasta el día anterior.'
    : 'Desde hace siete días hasta el día anterior.';
  const issueLines = SUPERVISOR_ISSUE_PIE_CONFIG.map((config) => ({
    key: config.eventKey === 'FALTA' ? 'absences' : config.eventKey === 'ATRASO' ? 'late' : 'early_departures',
    label: config.label,
    color: config.color,
  }));
  const surchargeLines = SUPERVISOR_SURCHARGE_PIE_CONFIG.map((config) => ({
    key: config.key,
    label: config.label,
    color: config.color,
  }));

  return (
    <div className="space-y-4">
      <div className="grid items-stretch gap-4 xl:grid-cols-2">
        <div className="flex h-full flex-col gap-4">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Faltas, atrasos y salidas anticipadas</CardTitle>
              <CardDescription>Porcentaje de empleados con novedad frente a empleados con turno activo hoy.</CardDescription>
            </CardHeader>
            <CardContent>
              <SupervisorIssuesPie rows={issuePieRows} total={issuePopulation} />
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Horas con recargo</CardTitle>
              <CardDescription>Jornada ordinaria, nocturna y horas extras registradas contra turnos del día.</CardDescription>
            </CardHeader>
            <CardContent>
              <SupervisorSurchargePie rows={surchargeRows} />
            </CardContent>
          </Card>
        </div>

        <Card className="flex h-full flex-col">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Últimas marcaciones del día</CardTitle>
                <CardDescription>Se refresca automáticamente para reflejar nuevas marcaciones.</CardDescription>
              </div>
              <div className="grid shrink-0 grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Mostrar
                  <select
                    value={latestPunchesLimit}
                    onChange={(event) => setLatestPunchesLimit(Number(event.target.value))}
                    className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    {LATEST_PUNCH_LIMIT_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Evaluar desde
                  <StandardTimeInput
                    value={latestPunchesFromTime}
                    onValueChange={setLatestPunchesFromTime}
                    className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex-1">
            {filteredLatestPunches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {latestPunchesFromTime ? `Sin marcaciones registradas desde ${latestPunchesFromTime}.` : 'Sin marcaciones registradas hoy.'}
              </p>
            ) : (
              <div className="max-h-[760px] space-y-2 overflow-y-auto pr-1">
                {visibleLatestPunches.map((row: any) => (
                  <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.employee_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatLatestPunchDescription(row)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${eventPillClass(row.event_key, row)}`}>
                      {eventLabel(row.event_key, row)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {filteredLatestPunches.length > visibleLatestPunches.length ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Mostrando {formatMetric(visibleLatestPunches.length)} de {formatMetric(filteredLatestPunches.length)} marcaciones filtradas.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border bg-white px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Análisis histórico</p>
          <p className="text-xs text-muted-foreground">{intervalDescription}</p>
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Intervalo
          <select
            value={periodInterval}
            onChange={(event) => onPeriodIntervalChange(event.target.value as 'last_7_days' | 'last_4_weeks')}
            className="h-9 min-w-48 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="last_7_days">Últimos 7 días</option>
            <option value="last_4_weeks">Últimas 4 semanas</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Faltas, atrasos y salidas anticipadas</CardTitle>
            <CardDescription>{intervalLabel}: distribución sobre turnos planificados.</CardDescription>
          </CardHeader>
          <CardContent>
            <SupervisorIssuesPie rows={periodIssueRows} total={Number(periodSummary?.planned || 0)} populationLabel="turnos planificados" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Horas con recargo</CardTitle>
            <CardDescription>{intervalLabel}: jornada ordinaria, nocturna y horas extra registradas.</CardDescription>
          </CardHeader>
          <CardContent>
            <SupervisorSurchargePie rows={periodSurchargeRows} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SupervisorPeriodLineChart
          title="Ausentismo"
          description={`${intervalLabel}: atrasos, faltas y salidas anticipadas.`}
          rows={periodSeries}
          lines={issueLines}
          valueFormatter={formatMetric}
        />
        <SupervisorPeriodLineChart
          title="Horas con recargo"
          description={`${intervalLabel}: 0%, 25%, 50% y 100% de recargo.`}
          rows={periodSeries.map((row: any) => ({
            ...row,
            ordinary_minutes: Number(row?.ordinary_minutes || 0) / 60,
            night_minutes: Number(row?.night_minutes || 0) / 60,
            extra_50_minutes: Number(row?.extra_50_minutes || 0) / 60,
            extra_100_minutes: Number(row?.extra_100_minutes || 0) / 60,
          }))}
          lines={surchargeLines}
          valueFormatter={formatHours}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <SupervisorBreakdownRanking
          title="Áreas con mayor ausentismo"
          rows={periodRankings.area_absence || []}
          segments={issueLines}
          valueFormatter={formatMetric}
        />
        <SupervisorBreakdownRanking
          title="Áreas con más recargo"
          rows={periodRankings.area_surcharge || []}
          segments={surchargeLines}
          valueFormatter={(value) => formatHours(Number(value || 0) / 60)}
        />
        <SupervisorBreakdownRanking
          title="Empleados con mayor ausentismo"
          rows={periodRankings.employee_absence || []}
          segments={issueLines}
          valueFormatter={formatMetric}
        />
        <SupervisorBreakdownRanking
          title="Empleados con más recargo"
          rows={periodRankings.employee_surcharge || []}
          segments={surchargeLines}
          valueFormatter={(value) => formatHours(Number(value || 0) / 60)}
        />
      </div>
    </div>
  );
}

function SystemAdminInsights({
  payload,
  selectedYear,
  weekStep,
}: {
  payload: any;
  selectedYear: number;
  weekStep: number;
}) {
  const metrics = payload?.metrics || {};
  const diagnostics = payload?.diagnostics || {};
  const employeesSeries = Array.isArray(payload?.weekly_employees) ? payload.weekly_employees : [];
  const punchesSeries = Array.isArray(payload?.weekly_punches) ? payload.weekly_punches : [];
  const deviceDistribution = Array.isArray(payload?.device_distribution_90d) ? payload.device_distribution_90d : [];
  const topCompanies = Array.isArray(payload?.top_companies_30d) ? payload.top_companies_30d : [];
  const staleDevices = Array.isArray(payload?.stale_devices) ? payload.stale_devices : [];
  const unsupervisedEmployees = Array.isArray(payload?.unsupervised_employees) ? payload.unsupervised_employees : [];

  const activeCompanies = Number(diagnostics.active_companies || metrics.active_companies || 0);
  const companiesWithActivity7d = Number(diagnostics.companies_with_activity_7d || 0);
  const activeDevices = Number(diagnostics.active_devices || metrics.active_devices || 0);
  const devicesReporting24h = Number(diagnostics.devices_reporting_24h || 0);
  const activeEmployees = Number(diagnostics.active_employees || metrics.active_employees || 0);
  const employeesWithoutSupervisor = Number(diagnostics.employees_without_supervisor || 0);
  const employeesWithoutUser = Number(diagnostics.employees_without_user || 0);
  const employeesWithoutCompany = Number(diagnostics.employees_without_company || 0);
  const employeesWithIncompleteOrg = Number(diagnostics.employees_with_incomplete_org || 0);
  const usersWithoutRole = Number(diagnostics.users_without_role || 0);

  const companyActivityRate7d = activeCompanies > 0 ? (companiesWithActivity7d / activeCompanies) * 100 : 0;
  const deviceReportingRate24h = activeDevices > 0 ? (devicesReporting24h / activeDevices) * 100 : 0;
  const supervisionCoverageRate = activeEmployees > 0 ? ((activeEmployees - employeesWithoutSupervisor) / activeEmployees) * 100 : 0;
  const dataIssueCount = employeesWithoutSupervisor + employeesWithoutUser + employeesWithoutCompany + employeesWithIncompleteOrg + usersWithoutRole;
  const controlScore = Math.max(0, Math.min(100, Math.round((companyActivityRate7d * 0.25) + (deviceReportingRate24h * 0.35) + (supervisionCoverageRate * 0.4))));

  const healthCards = [
    {
      title: 'Score de seguimiento',
      value: `${controlScore}%`,
      detail: 'Combina adopcion multiempresa, conectividad y supervision.',
      tone: controlScore >= 80 ? 'text-emerald-700' : controlScore >= 60 ? 'text-amber-700' : 'text-red-700',
    },
    {
      title: 'Empresas con actividad 7d',
      value: `${formatMetric(companiesWithActivity7d)} / ${formatMetric(activeCompanies)}`,
      detail: `${formatPercent(companyActivityRate7d)} de adopcion multiempresa reciente.`,
      tone: 'text-blue-700',
    },
    {
      title: 'Marcaciones 24h',
      value: formatMetric(diagnostics.punches_24h),
      detail: `${formatMetric(diagnostics.punches_7d)} marcaciones en 7 dias.`,
      tone: 'text-slate-800',
    },
    {
      title: 'Dispositivos reportando 24h',
      value: `${formatMetric(devicesReporting24h)} / ${formatMetric(activeDevices)}`,
      detail: `${formatPercent(deviceReportingRate24h)} conectividad reciente.`,
      tone: 'text-cyan-700',
    },
  ];

  const connectivityCards = [
    { title: 'Activos', value: activeDevices, detail: 'Dispositivos configurados activos' },
    { title: 'Reportando 24h', value: devicesReporting24h, detail: 'Con marcaciones recientes' },
    { title: 'Sin registrar 72h', value: diagnostics.devices_without_punch_72h, detail: 'Riesgo de desconexion o no uso' },
    { title: 'Nunca reportaron', value: diagnostics.devices_never_reported, detail: 'Instalados sin primera marcacion' },
  ];

  const qualityCards = [
    { title: 'Empleados sin supervisor', value: employeesWithoutSupervisor, detail: 'No estan bajo seguimiento activo' },
    { title: 'Empleados sin usuario', value: employeesWithoutUser, detail: 'No pueden operar autoservicio' },
    { title: 'Empleados sin empresa', value: employeesWithoutCompany, detail: 'Sin asignacion laboral activa' },
    { title: 'Org. incompleta', value: employeesWithIncompleteOrg, detail: 'Faltan localidad, depto. o area' },
    { title: 'Usuarios sin rol', value: usersWithoutRole, detail: 'Acceso sin permiso funcional' },
  ];

  return (
    <div className="space-y-4 print:space-y-3">
      <Card className="border-blue-100 bg-gradient-to-r from-white to-blue-50/40 print:shadow-none">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Diagnostico de producto</div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Eficiencia del software como herramienta de seguimiento y control</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Lectura ejecutiva de adopcion, conectividad remota, supervision y calidad de datos para visitas a clientes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 print:hidden"
          >
            Imprimir dashboard
          </button>
        </CardContent>
      </Card>

      <Tabs defaultValue="salud" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 print:hidden">
          <TabsTrigger value="salud">Salud</TabsTrigger>
          <TabsTrigger value="adopcion">Adopcion</TabsTrigger>
          <TabsTrigger value="conectividad">Conectividad</TabsTrigger>
          <TabsTrigger value="control">Calidad y control</TabsTrigger>
        </TabsList>

        <TabsContent value="salud" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {healthCards.map((card) => (
              <Card key={card.title} className="print:shadow-none">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                  <p className={`mt-2 text-3xl font-semibold tracking-tight ${card.tone}`}>{card.value}</p>
                  <p className="mt-2 text-xs leading-tight text-muted-foreground">{card.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="print:shadow-none">
              <CardHeader>
                <CardTitle>Performance de marcaciones ({selectedYear})</CardTitle>
                <CardDescription>Volumen semanal global. Permite detectar caidas o picos anormales de uso.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={punchesSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week_label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="punches" name="Marcaciones" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="print:shadow-none">
              <CardHeader>
                <CardTitle>Resumen operativo global</CardTitle>
                <CardDescription>Indicadores base para evaluar si el producto esta vivo y generando control.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricBox title="Empresas activas" value={metrics.active_companies} detail={`Actividad 30d: ${formatMetric(metrics.active_companies_with_activity_30d)}`} />
                  <MetricBox title="Empleados activos" value={metrics.active_employees} detail={`Usuarios activos: ${formatMetric(metrics.active_users)}`} />
                  <MetricBox title="Marcaciones 30d" value={metrics.total_punches_30d} detail={`Hoy: ${formatMetric(metrics.total_punches_today)}`} />
                  <MetricBox title="Promedio por empleado 30d" value={metrics.avg_punches_per_employee_30d} detail="Intensidad de uso del sistema" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="adopcion" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="print:shadow-none">
              <CardHeader>
                <CardTitle>Top empresas por marcaciones (30 dias)</CardTitle>
                <CardDescription>Empresas con mayor uso real del producto OnPremise.</CardDescription>
              </CardHeader>
              <CardContent className="h-[340px]">
                {topCompanies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin actividad de empresas para el periodo.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCompanies.slice(0, 8)} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="company_name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={58} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip formatter={(value: any) => [`${formatMetric(value)} marcaciones`, 'Volumen']} />
                      <Bar dataKey="punches_30d" name="Marcaciones 30d" radius={[6, 6, 0, 0]}>
                        {topCompanies.slice(0, 8).map((_: any, idx: number) => (
                          <Cell key={`company-bar-${idx}`} fill={SYSTEM_ADMIN_CHART_COLORS[idx % SYSTEM_ADMIN_CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="print:shadow-none">
              <CardHeader>
                <CardTitle>Crecimiento de empleados ({selectedYear})</CardTitle>
                <CardDescription>Nuevos registros semanales de empleados activos. Salto semanas: cada {weekStep}.</CardDescription>
              </CardHeader>
              <CardContent className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={employeesSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week_label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="new_employees" name="Nuevos" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conectividad" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {connectivityCards.map((card) => (
              <MetricBox key={card.title} title={card.title} value={card.value} detail={card.detail} />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
            <Card className="print:shadow-none">
              <CardHeader>
                <CardTitle>Dispositivos con mas horas sin registrar marcaciones</CardTitle>
                <CardDescription>Ranking de mayor a menor tiempo desde la ultima marcacion recibida.</CardDescription>
              </CardHeader>
              <CardContent>
                <StaleDevicesTable staleDevices={staleDevices} />
              </CardContent>
            </Card>

            <Card className="print:shadow-none">
              <CardHeader>
                <CardTitle>Marcaciones por dispositivo (90 dias)</CardTitle>
                <CardDescription>Concentracion de uso por origen.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                {deviceDistribution.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin marcaciones registradas para el periodo.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={deviceDistribution} dataKey="punches" nameKey="device_name" cx="50%" cy="47%" innerRadius={48} outerRadius={76} paddingAngle={2} strokeWidth={0}>
                        {deviceDistribution.map((_: any, idx: number) => (
                          <Cell key={`device-cell-${idx}`} fill={SYSTEM_ADMIN_CHART_COLORS[idx % SYSTEM_ADMIN_CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" height={28} />
                      <RechartsTooltip formatter={(value: any, _: any, row: any) => [`${formatMetric(value)} marcaciones`, row?.payload?.device_name]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="control" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {qualityCards.map((card) => (
              <MetricBox key={card.title} title={card.title} value={card.value} detail={card.detail} warning={Number(card.value || 0) > 0} />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="print:shadow-none">
              <CardHeader>
                <CardTitle>Empleados sin supervision asignada</CardTitle>
                <CardDescription>Muestra personas activas que no estan cubiertas por un supervisor/RRHH autorizado.</CardDescription>
              </CardHeader>
              <CardContent>
                {unsupervisedEmployees.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No se detectan empleados activos sin supervision.</p>
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                    <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                      <span>Empleado</span>
                      <span>Empresa</span>
                      <span>Localidad</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {unsupervisedEmployees.map((row: any, index: number) => (
                        <div key={`${row.employee_code || index}-${row.company_name}`} className="grid grid-cols-[1fr_1fr_1fr] gap-2 px-3 py-2 text-xs">
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-slate-800">{`${row.employee_lastname || ''} ${row.employee_name || ''}`.trim() || '-'}</span>
                            <span className="block truncate text-slate-500">Codigo: {row.employee_code || '-'}</span>
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-slate-700">{row.company_name || '-'}</span>
                          </span>
                          <span className="truncate text-slate-600">{row.work_location_name || '-'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print:shadow-none">
              <CardHeader>
                <CardTitle>Semaforo de diagnostico</CardTitle>
                <CardDescription>Lectura rapida para conversaciones con el cliente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <DiagnosticLine label="Adopcion multiempresa" value={companyActivityRate7d} goodAt={75} />
                <DiagnosticLine label="Conectividad remota" value={deviceReportingRate24h} goodAt={75} />
                <DiagnosticLine label="Cobertura de supervision" value={supervisionCoverageRate} goodAt={90} />
                <div className={`rounded-lg border p-3 text-sm ${dataIssueCount > 0 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                  <div className="font-semibold">Incidencias de datos: {formatMetric(dataIssueCount)}</div>
                  <div className="mt-1 text-xs opacity-80">Suma empleados sin supervisor, sin usuario, sin empresa, org. incompleta y usuarios sin rol.</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricBox({ title, value, detail, warning = false }: { title: string; value: unknown; detail: string; warning?: boolean }) {
  return (
    <Card className="print:shadow-none">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className={`mt-2 text-2xl font-semibold tracking-tight ${warning ? 'text-amber-700' : 'text-slate-900'}`}>{formatMetric(value)}</p>
        <p className="mt-2 text-xs leading-tight text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function StaleDevicesTable({ staleDevices }: { staleDevices: any[] }) {
  if (staleDevices.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin dispositivos activos para evaluar.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-[42px_1.3fr_1fr_0.8fr_0.7fr] gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
        <span>#</span>
        <span>Dispositivo</span>
        <span>Empresa / Localidad</span>
        <span>Ultima marcacion</span>
        <span className="text-right">Horas</span>
      </div>
      <div className="divide-y divide-slate-100">
        {staleDevices.map((device: any, index: number) => {
          const hours = Number(device.hours_without_punch);
          const hasNeverPunched = Boolean(device.never_punched) || device.last_punch_datetime === null;
          return (
            <div key={device.device_id || `${device.device_name}-${index}`} className="grid grid-cols-[42px_1.3fr_1fr_0.8fr_0.7fr] gap-2 px-3 py-2 text-xs">
              <span className="font-semibold text-slate-500">{index + 1}</span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-slate-800">{device.device_name || '-'}</span>
                <span className="block truncate text-slate-500">Serial: {device.device_serial_number || '-'}</span>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-slate-700">{device.company_name || '-'}</span>
                <span className="block truncate text-slate-500">{device.location_name || '-'}</span>
              </span>
              <span className="text-slate-600">{hasNeverPunched ? 'Nunca' : formatClientDateTime(device.last_punch_datetime)}</span>
              <span className="text-right font-semibold text-amber-700">{hasNeverPunched ? 'Sin registros' : formatMetric(hours)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DiagnosticLine({ label, value, goodAt }: { label: string; value: number; goodAt: number }) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const isGood = safeValue >= goodAt;
  const isMedium = safeValue >= Math.max(50, goodAt - 20);
  const color = isGood ? 'bg-emerald-500' : isMedium ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-600">{formatPercent(safeValue)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

function TenantAdminInsights({
  payload,
  selectedMonth,
  onMonthChange,
}: {
  payload: any;
  selectedMonth: string;
  onMonthChange: (value: string) => void;
}) {
  const metrics = payload?.metrics || {};
  const tenant = payload?.tenant || {};
  const companyActivity = Array.isArray(payload?.company_activity) ? payload.company_activity : [];
  const locationActivity = Array.isArray(payload?.location_activity) ? payload.location_activity : [];
  const punchSources = Array.isArray(payload?.punch_sources) ? payload.punch_sources : [];
  const deviceHealth = Array.isArray(payload?.device_health) ? payload.device_health : [];
  const dailyPunches = Array.isArray(payload?.weekly_punches) ? payload.weekly_punches : [];

  const activeEmployees = Number(metrics.active_employees || 0);
  const employeesPunched30d = Number(metrics.employees_punched_30d || 0);
  const activeDevices = Number(metrics.active_devices || 0);
  const devicesReporting24h = Number(metrics.devices_reporting_24h || 0);
  const activeWorkLocations = Number(metrics.active_work_locations || 0);
  const workLocationsWithActivity30d = Number(metrics.work_locations_with_activity_30d || 0);
  const employeesWithUser = Number(metrics.employees_with_user || 0);
  const totalPunches30d = Number(metrics.total_punches_30d || 0);
  const virtualPunches30d = Number(metrics.virtual_location_punches_30d || 0);

  const markingCoverageRate = activeEmployees > 0 ? (employeesPunched30d / activeEmployees) * 100 : 0;
  const deviceReportingRate = activeDevices > 0 ? (devicesReporting24h / activeDevices) * 100 : 0;
  const locationActivityRate = activeWorkLocations > 0 ? (workLocationsWithActivity30d / activeWorkLocations) * 100 : 0;
  const userCoverageRate = activeEmployees > 0 ? (employeesWithUser / activeEmployees) * 100 : 0;
  const virtualPunchRate = totalPunches30d > 0 ? (virtualPunches30d / totalPunches30d) * 100 : 0;
  const customerScore = Math.max(0, Math.min(100, Math.round(
    (markingCoverageRate * 0.35) +
    (deviceReportingRate * 0.30) +
    (locationActivityRate * 0.20) +
    (userCoverageRate * 0.15)
  )));

  const healthCards = [
    {
      title: 'Score de uso del cliente',
      value: `${customerScore}%`,
      detail: 'Combina marcación, conectividad, recintos activos y usuarios.',
      tone: customerScore >= 80 ? 'text-emerald-700' : customerScore >= 60 ? 'text-amber-700' : 'text-red-700',
    },
    {
      title: 'Empleados marcando 30d',
      value: `${formatMetric(employeesPunched30d)} / ${formatMetric(activeEmployees)}`,
      detail: `${formatPercent(markingCoverageRate)} de cobertura real de uso.`,
      tone: 'text-blue-700',
    },
    {
      title: 'Recintos con actividad 30d',
      value: `${formatMetric(workLocationsWithActivity30d)} / ${formatMetric(activeWorkLocations)}`,
      detail: `${formatPercent(locationActivityRate)} de localidades operativas activas.`,
      tone: 'text-cyan-700',
    },
    {
      title: 'Dispositivos reportando 24h',
      value: `${formatMetric(devicesReporting24h)} / ${formatMetric(activeDevices)}`,
      detail: `${formatPercent(deviceReportingRate)} conectividad reciente.`,
      tone: 'text-emerald-700',
    },
  ];

  return (
    <div className="space-y-4 print:space-y-3">
      <Card className="border-emerald-100 bg-gradient-to-r from-white to-emerald-50/40 print:shadow-none">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Diagnóstico de adopción</div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Uso, actividad y desempeño de la aplicación</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Vista ejecutiva para justificar la inversión: empresas, recintos, dispositivos, usuarios y marcaciones reales.
            </p>
            <p className="mt-1 text-xs text-slate-500">Cliente: {tenant.tenant_name || 'Tenant actual'}</p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <label className="text-xs text-muted-foreground">
              Mes calendario
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => onMonthChange(event.target.value)}
                className="ml-2 h-9 rounded-md border border-input bg-background px-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              Imprimir dashboard
            </button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="salud" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 print:hidden">
          <TabsTrigger value="salud">Salud operativa</TabsTrigger>
          <TabsTrigger value="empresas">Empresas</TabsTrigger>
          <TabsTrigger value="recintos">Recintos y origen</TabsTrigger>
          <TabsTrigger value="dispositivos">Dispositivos</TabsTrigger>
        </TabsList>

        <TabsContent value="salud" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {healthCards.map((card) => (
              <Card key={card.title} className="print:shadow-none">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                  <p className={`mt-2 text-3xl font-semibold tracking-tight ${card.tone}`}>{card.value}</p>
                  <p className="mt-2 text-xs leading-tight text-muted-foreground">{card.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="print:shadow-none">
              <CardHeader>
                <CardTitle>Marcaciones últimos 30 días</CardTitle>
                <CardDescription>Volumen diario para detectar adopción, caídas o picos operativos.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyPunches} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day_label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="punches" name="Marcaciones" stroke="#059669" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="print:shadow-none">
              <CardHeader>
                <CardTitle>Resumen de estructura y uso</CardTitle>
                <CardDescription>Indicadores de cobertura para evaluar madurez operativa del cliente.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricBox title="Empresas activas" value={metrics.active_companies} detail={`Empleados activos: ${formatMetric(metrics.active_employees)}`} />
                  <MetricBox title="Usuarios del sistema" value={metrics.active_users} detail={`Empleados con usuario: ${formatMetric(metrics.employees_with_user)}`} />
                  <MetricBox title="Marcaciones 30d" value={metrics.total_punches_30d} detail={`Hoy: ${formatMetric(metrics.total_punches_today)}`} />
                  <MetricBox title="Recintos virtuales" value={metrics.virtual_work_locations} detail={`${formatMetric(metrics.virtual_location_employees_30d)} empleados marcaron allí`} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="empresas" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
            <Card className="print:shadow-none">
              <CardHeader>
                <CardTitle>Uso por empresa</CardTitle>
                <CardDescription>Marcaciones acumuladas en los últimos 30 días.</CardDescription>
              </CardHeader>
              <CardContent className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={companyActivity.slice(0, 10)} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="company_name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={58} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip formatter={(value: any) => [`${formatMetric(value)} marcaciones`, 'Volumen']} />
                    <Bar dataKey="punches_30d" name="Marcaciones 30d" radius={[6, 6, 0, 0]}>
                      {companyActivity.slice(0, 10).map((_: any, idx: number) => (
                        <Cell key={`tenant-company-bar-${idx}`} fill={SYSTEM_ADMIN_CHART_COLORS[idx % SYSTEM_ADMIN_CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="print:shadow-none">
              <CardHeader>
                <CardTitle>Empresas, empleados y capacidad</CardTitle>
                <CardDescription>Relación entre estructura configurada y uso real.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border">
                  <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_0.8fr] gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                    <span>Empresa</span><span>Empleados</span><span>Recintos</span><span>Disp.</span><span>Marc. 30d</span>
                  </div>
                  <div className="max-h-[360px] divide-y divide-slate-100 overflow-y-auto">
                    {companyActivity.map((row: any, index: number) => (
                      <div key={row.company_id || index} className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_0.8fr] gap-2 px-3 py-2 text-xs">
                        <span className="truncate font-semibold text-slate-800">{row.company_name || '-'}</span>
                        <span>{formatMetric(row.employees)}</span>
                        <span>{formatMetric(row.locations)}</span>
                        <span>{formatMetric(row.devices)}</span>
                        <span className="font-semibold text-emerald-700">{formatMetric(row.punches_30d)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recintos" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricBox title="Recintos configurados" value={metrics.active_work_locations} detail={`Con geocerca: ${formatMetric(metrics.geofenced_work_locations)}`} />
            <MetricBox title="Recintos virtuales" value={metrics.virtual_work_locations} detail="Sin geocerca configurada" warning={Number(metrics.virtual_work_locations || 0) > 0} />
            <MetricBox title="Marcaciones virtuales 30d" value={metrics.virtual_location_punches_30d} detail={`${formatPercent(virtualPunchRate)} de la marcación global`} />
            <MetricBox title="Empleados en virtuales" value={metrics.virtual_location_employees_30d} detail="Empleados únicos marcando en esos recintos" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="print:shadow-none">
              <CardHeader>
                <CardTitle>Actividad por recinto</CardTitle>
                <CardDescription>Recintos con mayor uso, empleados únicos y condición de geocerca.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border">
                  <div className="grid grid-cols-[1.1fr_1fr_0.8fr_0.6fr_0.8fr] gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                    <span>Recinto</span><span>Empresa</span><span>Tipo</span><span>Empl.</span><span>Marc. 30d</span>
                  </div>
                  <div className="max-h-[360px] divide-y divide-slate-100 overflow-y-auto">
                    {locationActivity.map((row: any, index: number) => (
                      <div key={row.work_location_id || index} className="grid grid-cols-[1.1fr_1fr_0.8fr_0.6fr_0.8fr] gap-2 px-3 py-2 text-xs">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-slate-800">{row.work_location_name || '-'}</span>
                          <span className="block truncate text-slate-500">{row.work_location_code || '-'}</span>
                        </span>
                        <span className="truncate text-slate-700">{row.company_name || '-'}</span>
                        <span className={row.is_virtual_location ? 'text-amber-700' : 'text-emerald-700'}>{row.location_kind || '-'}</span>
                        <span>{formatMetric(row.employees_punched_30d)}</span>
                        <span className="font-semibold text-emerald-700">{formatMetric(row.punches_30d)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="print:shadow-none">
              <CardHeader>
                <CardTitle>Marcaciones según origen</CardTitle>
                <CardDescription>Distribución por fuente de marcación en los últimos 30 días.</CardDescription>
              </CardHeader>
              <CardContent className="h-[360px]">
                {punchSources.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin marcaciones registradas para el periodo.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={punchSources} dataKey="punches_30d" nameKey="source_name" cx="50%" cy="47%" innerRadius={54} outerRadius={84} paddingAngle={2} strokeWidth={0}>
                        {punchSources.map((_: any, idx: number) => (
                          <Cell key={`tenant-source-cell-${idx}`} fill={SYSTEM_ADMIN_CHART_COLORS[idx % SYSTEM_ADMIN_CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" height={28} />
                      <RechartsTooltip formatter={(value: any, _: any, row: any) => [`${formatMetric(value)} marcaciones`, row?.payload?.source_name]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dispositivos" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricBox title="Dispositivos activos" value={metrics.active_devices} detail="Registrados para marcación" />
            <MetricBox title="Reportando 24h" value={metrics.devices_reporting_24h} detail={`${formatPercent(deviceReportingRate)} conectividad reciente`} />
            <MetricBox title="Sin registrar 72h" value={metrics.devices_without_punch_72h} detail="Riesgo de desconexión o no uso" warning={Number(metrics.devices_without_punch_72h || 0) > 0} />
            <MetricBox title="Nunca reportaron" value={metrics.devices_never_reported} detail="Instalados sin primera marcación" warning={Number(metrics.devices_never_reported || 0) > 0} />
          </div>

          <Card className="print:shadow-none">
            <CardHeader>
              <CardTitle>Dispositivos con más horas sin registrar marcaciones</CardTitle>
              <CardDescription>Ranking de mayor a menor tiempo desde la última marcación recibida.</CardDescription>
            </CardHeader>
            <CardContent>
              <StaleDevicesTable staleDevices={deviceHealth} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function Dashboard() {
  const { profile, session } = useAuth();
  const { menuScreens } = usePermissions();

  const isEmployee = profile?.role_key === 'EMPLOYEE';
  const isSystemAdmin = profile?.role_key === 'SYSTEM_ADMIN';
  const isTenantAdmin = profile?.role_key === 'TENANT_ADMIN';
  const isSupervisor = profile?.role_key === 'SUPERVISOR';

  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [employeePayload, setEmployeePayload] = useState<any>(null);
  const [employeeRefreshKey, setEmployeeRefreshKey] = useState(0);
  const [employeeRange, setEmployeeRange] = useState(() => {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const current = new Date(`${today}T12:00:00`);
    const monday = new Date(current);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return { from: toLocalIsoDate(monday), to: today };
  });
  const [systemAdminLoading, setSystemAdminLoading] = useState(false);
  const [systemAdminError, setSystemAdminError] = useState<string | null>(null);
  const [systemAdminPayload, setSystemAdminPayload] = useState<any>(null);
  const [tenantAdminLoading, setTenantAdminLoading] = useState(false);
  const [tenantAdminError, setTenantAdminError] = useState<string | null>(null);
  const [tenantAdminPayload, setTenantAdminPayload] = useState<any>(null);
  const [supervisorLoading, setSupervisorLoading] = useState(false);
  const [supervisorError, setSupervisorError] = useState<string | null>(null);
  const [supervisorPayload, setSupervisorPayload] = useState<any>(null);
  const [supervisorPeriodInterval, setSupervisorPeriodInterval] = useState<'last_7_days' | 'last_4_weeks'>('last_7_days');
  const [systemAdminYear, setSystemAdminYear] = useState(new Date().getFullYear());
  const [systemAdminWeekStep, setSystemAdminWeekStep] = useState(1);
  const [tenantAdminMonth, setTenantAdminMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const navigateWithoutReload = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  useEffect(() => {
    let mounted = true;

    const loadEmployee = async () => {
      if (!isEmployee) return;
      if (!session?.access_token) return;
      try {
        if (mounted) {
          setEmployeeLoading(true);
          setEmployeeError(null);
        }
        const query = new URLSearchParams({ from: employeeRange.from, to: employeeRange.to });
        const resp = await fetch(buildApiUrl(`/dashboard/employee-summary?${query.toString()}`), {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data?.error || 'No se pudo cargar la informacion del empleado');
        if (mounted) setEmployeePayload(data);
      } catch (e: any) {
        if (mounted) setEmployeeError(e?.message || 'Error cargando dashboard de empleado');
      } finally {
        if (mounted) setEmployeeLoading(false);
      }
    };

    void loadEmployee();
    return () => {
      mounted = false;
    };
  }, [isEmployee, session?.access_token, employeeRange.from, employeeRange.to, employeeRefreshKey]);

  useEffect(() => {
    let mounted = true;

    const loadSystemAdmin = async () => {
      if (!isSystemAdmin) return;
      if (!session?.access_token) return;
      try {
        if (mounted) {
          setSystemAdminLoading(true);
          setSystemAdminError(null);
        }
        const resp = await fetch(
          buildApiUrl(`/dashboard/system-admin-summary?year=${systemAdminYear}&week_step=${systemAdminWeekStep}`),
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }
        );
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data?.error || 'No se pudo cargar la analitica global');
        if (mounted) setSystemAdminPayload(data);
      } catch (e: any) {
        if (mounted) setSystemAdminError(e?.message || 'Error cargando dashboard de SYSTEM_ADMIN');
      } finally {
        if (mounted) setSystemAdminLoading(false);
      }
    };

    void loadSystemAdmin();
    return () => {
      mounted = false;
    };
  }, [isSystemAdmin, session?.access_token, systemAdminYear, systemAdminWeekStep]);

  useEffect(() => {
    let mounted = true;

    const loadTenantAdmin = async () => {
      if (!isTenantAdmin) return;
      if (!session?.access_token) return;
      try {
        if (mounted) {
          setTenantAdminLoading(true);
          setTenantAdminError(null);
        }
        const resp = await fetch(buildApiUrl(`/dashboard/tenant-admin-summary?month=${tenantAdminMonth}`), {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data?.error || 'No se pudo cargar el dashboard del cliente');
        if (mounted) setTenantAdminPayload(data);
      } catch (e: any) {
        if (mounted) setTenantAdminError(e?.message || 'Error cargando dashboard de TENANT_ADMIN');
      } finally {
        if (mounted) setTenantAdminLoading(false);
      }
    };

    void loadTenantAdmin();
    return () => {
      mounted = false;
    };
  }, [isTenantAdmin, session?.access_token, tenantAdminMonth]);

  useEffect(() => {
    let mounted = true;
    let realtimeVersion = 0;
    let retryTimerId: number | undefined;
    let summaryAbortController: AbortController | undefined;
    let eventsAbortController: AbortController | undefined;

    const loadSupervisor = async (showLoading = true) => {
      if (!isSupervisor) return;
      if (!session?.access_token) return;
      try {
        summaryAbortController?.abort();
        summaryAbortController = new AbortController();
        if (mounted && showLoading) {
          setSupervisorLoading(true);
          setSupervisorError(null);
        }
        const resp = await fetch(buildApiUrl(`/dashboard/supervisor-summary?interval=${supervisorPeriodInterval}`), {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: summaryAbortController.signal,
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data?.error || 'No se pudo cargar el dashboard de supervisor');
        const nextVersion = Number(data?.realtime?.version);
        if (Number.isFinite(nextVersion)) realtimeVersion = Math.max(realtimeVersion, nextVersion);
        if (mounted) {
          setSupervisorPayload(data);
          setSupervisorError(null);
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError' && mounted) setSupervisorError(e?.message || 'Error cargando dashboard de supervisor');
      } finally {
        if (mounted && showLoading) setSupervisorLoading(false);
      }
    };

    const waitForSupervisorEvent = async () => {
      if (!isSupervisor || !session?.access_token || !mounted) return;
      try {
        eventsAbortController?.abort();
        eventsAbortController = new AbortController();
        const resp = await fetch(buildApiUrl(`/dashboard/supervisor-events?since=${realtimeVersion}`), {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: eventsAbortController.signal,
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data?.error || 'No se pudo escuchar cambios del dashboard');
        const nextVersion = Number(data?.version);
        if (Number.isFinite(nextVersion) && nextVersion > realtimeVersion) {
          realtimeVersion = nextVersion;
          await loadSupervisor(false);
        }
        if (mounted) void waitForSupervisorEvent();
      } catch (e: any) {
        if (e?.name === 'AbortError' || !mounted) return;
        retryTimerId = window.setTimeout(() => {
          void loadSupervisor(false);
          void waitForSupervisorEvent();
        }, 5000);
      }
    };

    const startSupervisorDashboard = async () => {
      await loadSupervisor();
      if (mounted) void waitForSupervisorEvent();
    };

    void startSupervisorDashboard();

    return () => {
      mounted = false;
      summaryAbortController?.abort();
      eventsAbortController?.abort();
      if (retryTimerId !== undefined) window.clearTimeout(retryTimerId);
    };
  }, [isSupervisor, session?.access_token, supervisorPeriodInterval]);

  const defaultStats = [
    {
      title: 'Empleados Activos',
      value: '0',
      icon: Users,
      description: 'Total de empleados registrados',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Turnos Hoy',
      value: '0',
      icon: Clock,
      description: 'Turnos programados para hoy',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Departamentos',
      value: '0',
      icon: Building2,
      description: 'Departamentos activos',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Reportes Pendientes',
      value: '0',
      icon: FileText,
      description: 'Reportes por revisar',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];
  const metrics = systemAdminPayload?.metrics || {};
  const systemAdminStats = [
    {
      title: 'Empresas Activas',
      value: formatMetric(metrics.active_companies),
      icon: Building2,
      description: `Con actividad 30d: ${formatMetric(metrics.active_companies_with_activity_30d)}`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Empleados Activos',
      value: formatMetric(metrics.active_employees),
      icon: Users,
      description: `Usuarios activos: ${formatMetric(metrics.active_users)}`,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Marcaciones Año',
      value: formatMetric(metrics.total_punches_year),
      icon: Fingerprint,
      description: `Hoy: ${formatMetric(metrics.total_punches_today)}`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Dispositivos Activos',
      value: formatMetric(metrics.active_devices),
      icon: Network,
      description: `Promedio 30d: ${formatMetric(metrics.avg_punches_per_employee_30d)}`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];
  const stats = isSystemAdmin ? systemAdminStats : defaultStats;

  const getMenuGroupsByRole = (roleKey: string | undefined) => {
    const menuMap: Record<string, string[]> = {
      SYSTEM_ADMIN: ['SECURITY'],
      TENANT_ADMIN: ['MAINT', 'CONFIG', 'ORG'],
      RRHH_ADMIN: ['DASH', 'ATTENDANCE', 'REPORTS'],
      SUPERVISOR: ['DASH', 'ATTENDANCE', 'REPORTS'],
      EMPLOYEE: ['KIOSK'],
    };
    return menuMap[roleKey || ''] || [];
  };

  const expectedGroups = getMenuGroupsByRole(profile?.role_key);
  const systemAdminYearOptions = [systemAdminYear - 2, systemAdminYear - 1, systemAdminYear, systemAdminYear + 1]
    .filter((v, i, arr) => arr.indexOf(v) === i);
  const employeeCompanySummary = employeePayload?.employee_company || {};
  const employeeOrganizationRoute =
    employeeCompanySummary.organization_route ||
    [
      employeeCompanySummary.work_location_name,
      employeeCompanySummary.department_name,
      employeeCompanySummary.area_name,
      employeeCompanySummary.job_title_name,
    ].filter(Boolean).join(' / ');

  return (
    <div className="p-5 max-w-full space-y-4">
      <div className={isEmployee ? 'hidden' : ''}>
      <SystemAdminPageHeader
        icon={BarChart3}
        title={isSupervisor ? 'Dashboard de Supervisor' : `Bienvenido, ${profile?.display_name || 'Usuario'}`}
        subtitle={isSystemAdmin
          ? 'Analitica global de adopcion, crecimiento y uso operativo del sistema'
          : isTenantAdmin
            ? 'Diagnóstico de uso, desempeño, empresas, recintos y dispositivos del cliente'
          : isSupervisor
            ? 'Asistencia operativa, novedades, marcaciones y tendencias del equipo asignado'
          : employeeOrganizationRoute || 'Ruta organizacional no configurada'}
        rightSlot={isSystemAdmin ? (
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground flex items-center gap-2">
              Anio
              <select
                value={systemAdminYear}
                onChange={(e) => setSystemAdminYear(Number(e.target.value))}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                {systemAdminYearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground flex items-center gap-2">
              Salto semanas
              <select
                value={systemAdminWeekStep}
                onChange={(e) => setSystemAdminWeekStep(Number(e.target.value))}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                {[1, 2, 4, 8].map((step) => (
                  <option key={step} value={step}>Cada {step}</option>
                ))}
              </select>
            </label>
          </div>
        ) : isSupervisor ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="flex h-[68px] min-w-[108px] flex-col justify-center rounded-lg border bg-white px-3 py-2">
              <p className="text-[13px] leading-none text-muted-foreground">Empleados</p>
              <p className="mt-2 text-base font-semibold leading-none">{formatMetric(supervisorPayload?.metrics?.today_scheduled_employees ?? supervisorPayload?.metrics?.assigned_employees)}</p>
            </div>
            <div className="flex h-[68px] min-w-[108px] flex-col justify-center rounded-lg border bg-white px-3 py-2">
              <p className="text-[13px] leading-none text-muted-foreground">Atrasos no just.</p>
              <p className="mt-2 text-base font-semibold leading-none text-red-700">{formatMetric(supervisorPayload?.metrics?.today_late)}</p>
            </div>
            <div className="flex h-[68px] min-w-[108px] flex-col justify-center rounded-lg border bg-white px-3 py-2">
              <p className="text-[13px] leading-none text-muted-foreground">Faltas no just.</p>
              <p className="mt-2 text-base font-semibold leading-none text-red-700">{formatMetric(supervisorPayload?.metrics?.today_absences)}</p>
            </div>
            <div className="flex h-[68px] min-w-[108px] flex-col justify-center rounded-lg border bg-white px-3 py-2">
              <p className="text-[13px] leading-none text-muted-foreground">Actualizado</p>
              <p className="mt-2 text-base font-semibold leading-none">{supervisorLoading ? 'Actualizando...' : formatTimeOnly(supervisorPayload?.generated_at)}</p>
            </div>
          </div>
        ) : undefined}
      />
      </div>

      {!isSystemAdmin && !isTenantAdmin && !isSupervisor && String(profile?.role_key || '').toUpperCase() !== 'EMPLOYEE' ? <RoleInfo roleKey={profile?.role_key} /> : null}

      {isSupervisor ? (
        supervisorError ? (
          <Card><CardContent className="pt-6"><p className="text-sm text-red-600">{supervisorError}</p></CardContent></Card>
        ) : (
          <SupervisorHome
            payload={supervisorPayload}
            periodInterval={supervisorPeriodInterval}
            onPeriodIntervalChange={setSupervisorPeriodInterval}
          />
        )
      ) : isEmployee ? (
        employeeLoading && !employeePayload ? (
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Cargando informacion del empleado...</p></CardContent></Card>
        ) : employeeError && !employeePayload ? (
          <Card><CardContent className="pt-6"><p className="text-sm text-red-600">{employeeError}</p></CardContent></Card>
        ) : (
          <EmployeeHome
            payload={employeePayload}
            rangeLoading={employeeLoading}
            onRangeChange={(from, to) => setEmployeeRange({ from, to })}
            onIncidentFlowClosed={() => setEmployeeRefreshKey((current) => current + 1)}
          />
        )
      ) : (
        <>
          {!isSystemAdmin && !isTenantAdmin && !isSupervisor ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                      <div className={`${stat.bgColor} p-2 rounded-lg`}>
                        <Icon className={`h-4 w-4 ${stat.color}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <p className="text-xs text-muted-foreground">{stat.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : null}

          {isTenantAdmin ? (
            tenantAdminLoading ? (
              <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Cargando diagnóstico del cliente...</p></CardContent></Card>
            ) : tenantAdminError ? (
              <Card><CardContent className="pt-6"><p className="text-sm text-red-600">{tenantAdminError}</p></CardContent></Card>
            ) : (
              <TenantAdminInsights
                payload={tenantAdminPayload}
                selectedMonth={tenantAdminMonth}
                onMonthChange={setTenantAdminMonth}
              />
            )
          ) : null}

          {isSystemAdmin ? (
            systemAdminLoading ? (
              <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Cargando analitica global...</p></CardContent></Card>
            ) : systemAdminError ? (
              <Card><CardContent className="pt-6"><p className="text-sm text-red-600">{systemAdminError}</p></CardContent></Card>
            ) : (
              <SystemAdminInsights
                payload={systemAdminPayload}
                selectedYear={systemAdminYear}
                weekStep={systemAdminWeekStep}
              />
            )
          ) : null}

          {!isSystemAdmin && !isTenantAdmin && !isSupervisor && (
            <Card>
              <CardHeader>
                <CardTitle>Acceso Rapido a Pantallas</CardTitle>
                <CardDescription>Tienes acceso a {menuScreens.length} pantallas del sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {menuScreens.slice(0, 8).map((screen) => (
                    <button
                      key={screen.screen_key}
                      onClick={() => navigateWithoutReload(screen.route_path)}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{screen.screen_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{screen.menu_group_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

    </div>
  );
}


