/**
 * Dashboard - Pagina principal del sistema
 * Renderiza modulos segun rol.
 */

'use client';

import { buildApiUrl } from '../utils/api-config';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
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
  Activity,
  TrendingDown,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import SystemAdminPageHeader from './shared/SystemAdminPageHeader';

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
  if (!value) return '-';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('es-EC', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
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
};

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
            return <div key={`empty-${idx}`} className="h-20 rounded border border-dashed bg-muted/10" />;
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
              className={`h-20 rounded border p-1 ${isToday ? 'border-blue-400 bg-blue-50' : 'border-border bg-background'}`}
            >
              <div className="text-[10px] font-semibold">{date.getDate()}</div>
              <div className="mt-1 h-[calc(100%-14px)] flex items-center justify-center">
                <div className="grid grid-cols-2 gap-1 place-items-center w-[46px]">
                {visibleEvents.map((event, eventIndex) => {
                  const Icon = iconFromCalendarKey(event?.icon_key);
                  return (
                    <div
                      key={`${key}-${eventIndex}`}
                      className="size-5 rounded flex items-center justify-center"
                      style={{
                        backgroundColor: event?.bg_color || '#E5E7EB',
                        color: event?.text_color || '#111827',
                      }}
                      title={`${event?.title || 'Evento'}${event?.subtitle ? ` - ${event.subtitle}` : ''}`}
                    >
                      <Icon className="size-3.5" />
                    </div>
                  );
                })}
                {overflowCount > 0 ? (
                  <div className="size-5 rounded bg-muted text-muted-foreground text-[10px] flex items-center justify-center" title={`+${overflowCount} eventos`}>
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

function EmployeeHome({ payload }: { payload: any }) {
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

  const maxPlusHours = plusEvents.reduce((acc, row) => Math.max(acc, Number(row?.total_hours || 0)), 0) || 1;
  const maxMinusHours = minusEvents.reduce((acc, row) => Math.max(acc, Number(row?.total_hours || 0)), 0) || 1;
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
    ? module4RequestEventsRaw
    : requests.flatMap((row: any) => {
      const date = toDateKey(row?.start_datetime || row?.shift_date);
      if (!date) return [];
      return [{ date, icon_key: 'FileCheck', bg_color: '#FEF3C7', text_color: '#92400E', title: row?.justification_name || row?.event_name || 'Solicitud' }];
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
  const resolveProfileIcon = (name: string, fallback: any) => (LucideIcons as Record<string, any>)[name] || fallback;

  const employeeTopItems = [
    { icon: resolveProfileIcon('IdCard', FileText), value: employee.employee_code || '-', title: 'Codigo', color: 'bg-blue-100 text-blue-700' },
    { icon: resolveProfileIcon('VenusAndMars', Shield), value: employee.gender_label || '-', title: 'Genero', color: 'bg-violet-100 text-violet-700' },
    { icon: Cake, value: formatDate(employee.birth_date), title: 'Nacimiento', color: 'bg-pink-100 text-pink-700' },
    { icon: resolveProfileIcon('FileBadge', Users), value: `${employee.employee_lastname || ''} ${employee.employee_name || ''}`.trim() || '-', title: 'Nombre', color: 'bg-indigo-100 text-indigo-700' },
    { icon: resolveProfileIcon('Smartphone', ArrowRightCircle), value: employee.phone || '-', title: 'Telefono', color: 'bg-emerald-100 text-emerald-700' },
    { icon: AtSign, value: employee.user_display_name || employee.user_email || '-', title: 'Usuario', color: 'bg-cyan-100 text-cyan-700' },
  ];

  const employeeCompanyTopItems = [
    { icon: Building2, value: employeeCompany.company_name || '-', title: 'Empresa', color: 'bg-slate-100 text-slate-700' },
    { icon: BriefcaseBusiness, value: employeeCompany.job_title_name || '-', title: 'Cargo', color: 'bg-orange-100 text-orange-700' },
    { icon: MapPin, value: employeeCompany.work_location_name || '-', title: 'Localizacion', color: 'bg-teal-100 text-teal-700' },
    { icon: CalendarCheck, value: formatDate(employeeCompany.hire_date), title: 'Fecha Ingreso', color: 'bg-fuchsia-100 text-fuchsia-700' },
    { icon: resolveProfileIcon('UserRoundCheck', BarChart3), value: employeeCompany.employee_profile_name || '-', title: 'Perfil', color: 'bg-amber-100 text-amber-700' },
    { icon: Network, value: `${employeeCompany.department_name || '-'} / ${employeeCompany.area_name || '-'}`, title: 'Posicion Organizacional', color: 'bg-lime-100 text-lime-700' },
    { icon: resolveProfileIcon('MapPinned', MapPin), value: `${employeeCompany.state_label || '-'} / ${employeeCompany.city_label || '-'}`, title: 'Alcance Geografico', color: 'bg-sky-100 text-sky-700' },
    { icon: CalendarDays, value: employeeCompany.work_on_holidays ? 'Trabaja feriados: Si' : 'Trabaja feriados: No', title: 'Trabaja Feriados', color: employeeCompany.work_on_holidays ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 2xl:grid-cols-4 gap-4">
        <Card className="2xl:col-span-2">
          <CardHeader>
            <CardTitle>Modulo 1: Empleado y Empleado Empresa</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 xl:grid-cols-2 gap-6 text-sm">
            <div className="rounded-lg border p-4">
              <p className="font-semibold">Empleado</p>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                {employeeTopItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={`emp-top-${index}`} className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-2" title={item.title}>
                      <span className={`inline-flex size-7 items-center justify-center rounded-full ${item.color}`}>
                        <Icon className="size-4" />
                      </span>
                      <span className="text-sm truncate">{item.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <p className="font-semibold">Empleado Empresa</p>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                {employeeCompanyTopItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={`empco-top-${index}`} className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-2" title={item.title}>
                      <span className={`inline-flex size-7 items-center justify-center rounded-full ${item.color}`}>
                        <Icon className="size-4" />
                      </span>
                      <span className="text-sm truncate">{item.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Modulo 6: Tiempos por novedades que suman (mes)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plusEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin novedades que suman en el mes.</p>
            ) : plusEvents.map((row) => {
              const pct = Math.max(6, Math.round((Number(row.total_hours || 0) / maxPlusHours) * 100));
              return (
                <div key={row.attendance_event_id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{row.event_short_name || row.event_name}</span>
                    <span className="font-medium text-emerald-700">{Number(row.total_hours || 0).toFixed(2)} h</span>
                  </div>
                  <div className="h-2 rounded bg-emerald-50 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modulo 7: Tiempos por novedades que restan (mes)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {minusEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin novedades que restan en el mes.</p>
            ) : minusEvents.map((row) => {
              const pct = Math.max(6, Math.round((Number(row.total_hours || 0) / maxMinusHours) * 100));
              return (
                <div key={row.attendance_event_id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{row.event_short_name || row.event_name}</span>
                    <span className="font-medium text-rose-700">{Number(row.total_hours || 0).toFixed(2)} h</span>
                  </div>
                  <div className="h-2 rounded bg-rose-50 overflow-hidden">
                    <div className="h-full bg-rose-500 rounded" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Modulo 2: Marcaciones</CardTitle>
            <CardDescription>Iconos de entrada, salida y lunch por dia</CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeMonthlyEventsCalendar
              year={Number(calendarMonth?.year) || new Date().getFullYear()}
              month={Number(calendarMonth?.month) || (new Date().getMonth() + 1)}
              events={module2PunchEvents}
              emptyLabel="Sin marcaciones del mes."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modulo 3: Turnos asignados</CardTitle>
            <CardDescription>Turnos del mes con icono y color por turno</CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeMonthlyEventsCalendar
              year={Number(calendarMonth?.year) || new Date().getFullYear()}
              month={Number(calendarMonth?.month) || (new Date().getMonth() + 1)}
              events={module3ShiftEvents}
              emptyLabel="Sin turnos asignados en el mes."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Modulo 4: Solicitudes</CardTitle>
            <CardDescription>Justificaciones, permisos y cambios de turno</CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeMonthlyEventsCalendar
              year={Number(calendarMonth?.year) || new Date().getFullYear()}
              month={Number(calendarMonth?.month) || (new Date().getMonth() + 1)}
              events={module4RequestEvents}
              emptyLabel="Sin solicitudes del mes."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modulo 5: Feriados</CardTitle>
            <CardDescription>Feriados aplicables, cumpleanos y reuniones</CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeMonthlyEventsCalendar
              year={Number(calendarMonth?.year) || new Date().getFullYear()}
              month={Number(calendarMonth?.month) || (new Date().getMonth() + 1)}
              events={module5HolidayEvents}
              emptyLabel="Sin feriados del mes."
            />
          </CardContent>
        </Card>
      </div>
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
  { eventKey: 'ATRASO', label: 'Atrasos', color: '#f59e0b' },
  { eventKey: 'SALIDA_ANTICIPADA', label: 'Salidas anticipadas', color: '#f97316' },
];

const ISSUE_PIE_REST_COLOR = '#e2e8f0';

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
  if (!value) return '--:--';
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
  }
  const match = String(value).match(/(?:T|\s)(\d{2}:\d{2})/);
  return match?.[1] || String(value).slice(0, 5);
}

function eventLabel(eventKey: string | null | undefined): string {
  const key = String(eventKey || '').toUpperCase();
  if (key === 'FALTA') return 'Falta';
  if (key === 'ATRASO') return 'Atraso';
  if (key === 'SALIDA_ANTICIPADA') return 'Salida anticipada';
  if (key === 'PERMISO_APROBADO') return 'Permiso aprobado';
  if (key === 'FERIADO') return 'Feriado';
  if (key === 'NO_LABORAL') return 'No laboral';
  return 'Normal';
}

function eventPillClass(eventKey: string | null | undefined): string {
  const key = String(eventKey || '').toUpperCase();
  if (key === 'FALTA') return 'bg-red-100 text-red-700';
  if (key === 'ATRASO') return 'bg-amber-100 text-amber-700';
  if (key === 'SALIDA_ANTICIPADA') return 'bg-orange-100 text-orange-700';
  if (key === 'PERMISO_APROBADO') return 'bg-blue-100 text-blue-700';
  if (key === 'FERIADO') return 'bg-violet-100 text-violet-700';
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

function getWeekdayInitial(value: unknown): string {
  const raw = String(value || '');
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  const labels = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  return labels[date.getDay()] || '';
}

function withTrendLabels(rows: any[], type: 'daily' | 'weekly'): any[] {
  return rows.map((row, index) => ({
    ...row,
    axis_label: type === 'daily'
      ? getWeekdayInitial(row.bucket_start) || row.label || ''
      : `W${index + 1}`,
  }));
}

function SupervisorMiniLine({
  data,
  dataKey,
  stroke,
  unitLabel,
  axisLabel,
}: {
  data: any[];
  dataKey: string;
  stroke: string;
  unitLabel: string;
  axisLabel: string;
}) {
  const isPercent = dataKey === 'absence_rate';
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{unitLabel}</span>
        <span>{data.length > 0 ? axisLabel : 'Sin datos'}</span>
      </div>
      <ResponsiveContainer width="100%" height={72}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="axis_label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#64748b' }}
          interval={0}
          height={20}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 9, fill: '#64748b' }}
          width={30}
          domain={isPercent ? [0, 100] : [0, 'auto']}
          tickFormatter={(value: unknown) => isPercent ? `${Number(value)}%` : `${Number(value)}h`}
          tickCount={3}
        />
        <Line type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={2} dot={false} />
        <RechartsTooltip
          formatter={(value: unknown) => [dataKey === 'absence_rate' ? formatPercent(value) : formatHours(value), unitLabel]}
          labelFormatter={(_, items) => {
            const payload = items?.[0]?.payload;
            return payload?.label || payload?.bucket_start || 'Periodo';
          }}
        />
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
}

function RankingList({
  title,
  rows,
  valueKey,
  valueFormatter,
}: {
  title: string;
  rows: any[];
  valueKey: string;
  valueFormatter: (value: unknown) => string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos para el periodo.</p>
        ) : rows.slice(0, 5).map((row, index) => (
          <div key={`${title}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{row.name || 'Sin nombre'}</p>
              {row.employee_code ? <p className="text-xs text-muted-foreground">{row.employee_code}</p> : null}
            </div>
            <span className="shrink-0 font-semibold">{valueFormatter(row[valueKey])}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SupervisorIssuePie({
  label,
  affected,
  total,
  color,
}: {
  label: string;
  affected: number;
  total: number;
  color: string;
}) {
  const safeTotal = Math.max(0, Math.trunc(Number(total || 0)));
  const safeAffected = Math.max(0, Math.min(safeTotal, Math.trunc(Number(affected || 0))));
  const unaffected = Math.max(0, safeTotal - safeAffected);
  const percent = safeTotal > 0 ? (safeAffected / safeTotal) * 100 : 0;
  const data = safeTotal > 0
    ? [
      { name: label, value: safeAffected },
      { name: 'Sin novedad', value: unaffected },
    ]
    : [{ name: 'Sin empleados', value: 1 }];

  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{label}</p>
        <span className="text-xs text-muted-foreground">{safeAffected}/{safeTotal}</span>
      </div>
      <div className="mt-2 grid grid-cols-[88px_1fr] items-center gap-3">
        <ResponsiveContainer width="100%" height={88}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={24}
              outerRadius={40}
              paddingAngle={safeAffected > 0 && unaffected > 0 ? 2 : 0}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`${label}-${entry.name}`}
                  fill={safeTotal === 0 ? ISSUE_PIE_REST_COLOR : index === 0 ? color : ISSUE_PIE_REST_COLOR}
                />
              ))}
            </Pie>
            <RechartsTooltip formatter={(value: unknown, name: unknown) => [`${formatMetric(value)} personas`, String(name)]} />
          </PieChart>
        </ResponsiveContainer>
        <div>
          <p className="text-2xl font-bold" style={{ color }}>{formatPercent(percent)}</p>
          <p className="text-xs text-muted-foreground">del total de empleados</p>
        </div>
      </div>
    </div>
  );
}

function SupervisorHome({ payload }: { payload: any }) {
  const [latestPunchesFromTime, setLatestPunchesFromTime] = useState('');
  const todayIssues = Array.isArray(payload?.today_issues) ? payload.today_issues : [];
  const latestPunches = Array.isArray(payload?.latest_punches) ? payload.latest_punches : [];
  const last7Days = Array.isArray(payload?.trends?.last_7_days) ? payload.trends.last_7_days : [];
  const last4Weeks = Array.isArray(payload?.trends?.last_4_weeks) ? payload.trends.last_4_weeks : [];
  const last7DaysChart = withTrendLabels(last7Days, 'daily');
  const last4WeeksChart = withTrendLabels(last4Weeks, 'weekly');
  const rankings = payload?.rankings || {};
  const assignedEmployees = Math.max(0, Number(payload?.metrics?.assigned_employees || 0));

  const issuePieRows = useMemo(() => (
    SUPERVISOR_ISSUE_PIE_CONFIG.map((config) => {
      const employeeIds = new Set(
        todayIssues
          .filter((row: any) => String(row?.event_key || '').toUpperCase() === config.eventKey)
          .map((row: any) => String(row?.employee_id || '').trim())
          .filter(Boolean)
      );

      return {
        ...config,
        affected: employeeIds.size,
      };
    })
  ), [todayIssues]);

  const filteredLatestPunches = useMemo(() => {
    const fromMinutes = timeInputToMinutes(latestPunchesFromTime);
    if (fromMinutes === null) return latestPunches;

    return latestPunches.filter((row: any) => {
      const punchMinutes = dateTimeToLocalMinutes(row?.punch_datetime);
      return punchMinutes !== null && punchMinutes >= fromMinutes;
    });
  }, [latestPunches, latestPunchesFromTime]);

  const kpis = [
    {
      title: 'Ausentismo 7 dias',
      value: formatPercent(last7Days[last7Days.length - 1]?.absence_rate),
      detail: `${formatMetric(last7Days.reduce((sum: number, row: any) => sum + Number(row.absences || 0), 0))} faltas`,
      data: last7DaysChart,
      dataKey: 'absence_rate',
      unitLabel: '% ausentismo',
      axisLabel: 'Dias',
      stroke: '#dc2626',
      icon: UserX,
    },
    {
      title: 'Ausentismo 4 semanas',
      value: formatPercent(last4Weeks[last4Weeks.length - 1]?.absence_rate),
      detail: `${formatMetric(last4Weeks.reduce((sum: number, row: any) => sum + Number(row.absences || 0), 0))} faltas`,
      data: last4WeeksChart,
      dataKey: 'absence_rate',
      unitLabel: '% ausentismo',
      axisLabel: 'Semanas',
      stroke: '#f97316',
      icon: TrendingDown,
    },
    {
      title: 'Horas extra 7 dias',
      value: formatHours(last7Days.reduce((sum: number, row: any) => sum + Number(row.overtime_hours || 0), 0)),
      detail: 'Acumulado semanal',
      data: last7DaysChart,
      dataKey: 'overtime_hours',
      unitLabel: 'horas extra',
      axisLabel: 'Dias',
      stroke: '#2563eb',
      icon: Clock3,
    },
    {
      title: 'Horas extra 4 semanas',
      value: formatHours(last4Weeks.reduce((sum: number, row: any) => sum + Number(row.overtime_hours || 0), 0)),
      detail: 'Acumulado mensual',
      data: last4WeeksChart,
      dataKey: 'overtime_hours',
      unitLabel: 'horas extra',
      axisLabel: 'Semanas',
      stroke: '#7c3aed',
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Faltas, atrasos y salidas anticipadas</CardTitle>
            <CardDescription>Porcentaje de empleados con novedad frente al total asignado.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 lg:grid-cols-3">
              {issuePieRows.map((row) => (
                <SupervisorIssuePie
                  key={row.eventKey}
                  label={row.label}
                  affected={row.affected}
                  total={assignedEmployees}
                  color={row.color}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Últimas 10 marcaciones del día</CardTitle>
                <CardDescription>Se refresca automáticamente para reflejar nuevas marcaciones.</CardDescription>
              </div>
              <label className="flex shrink-0 flex-col gap-1 text-xs font-medium text-slate-600">
                Evaluar desde
                <input
                  type="time"
                  value={latestPunchesFromTime}
                  onChange={(event) => setLatestPunchesFromTime(event.target.value)}
                  className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredLatestPunches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {latestPunchesFromTime ? `Sin marcaciones registradas desde ${latestPunchesFromTime}.` : 'Sin marcaciones registradas hoy.'}
              </p>
            ) : filteredLatestPunches.map((row: any) => (
              <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.employee_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeOnly(row.punch_datetime)} - {row.movement_label || `Movimiento ${row.punch_key}`} - {row.area_name || 'Sin área'}
                    {row.is_holiday ? ` - Feriado: ${row.holiday_name || 'Si'} - Trabaja feriados: ${row.work_on_holidays ? 'Si' : 'No'}` : ''}
                    {row.has_approved_leave ? ` - Permiso: ${row.approved_leave_name || 'Aprobado'}` : ''}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${eventPillClass(row.event_key)}`}>
                  {eventLabel(row.event_key)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground">{kpi.detail}</p>
                <SupervisorMiniLine data={kpi.data} dataKey={kpi.dataKey} stroke={kpi.stroke} unitLabel={kpi.unitLabel} axisLabel={kpi.axisLabel} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <RankingList title="Areas con mayor ausentismo" rows={rankings.area_absence || []} valueKey="absence_rate" valueFormatter={formatPercent} />
        <RankingList title="Areas con mas horas extra" rows={rankings.area_overtime || []} valueKey="overtime_hours" valueFormatter={formatHours} />
        <RankingList title="Empleados con mayor ausentismo" rows={rankings.employee_absence || []} valueKey="absences" valueFormatter={(v) => `${formatMetric(v)} faltas`} />
        <RankingList title="Empleados con mas horas extra" rows={rankings.employee_overtime || []} valueKey="overtime_hours" valueFormatter={formatHours} />
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
  const employeesSeries = Array.isArray(payload?.weekly_employees) ? payload.weekly_employees : [];
  const punchesSeries = Array.isArray(payload?.weekly_punches) ? payload.weekly_punches : [];
  const deviceDistribution = Array.isArray(payload?.device_distribution_90d) ? payload.device_distribution_90d : [];
  const topTenants = Array.isArray(payload?.top_tenants_30d) ? payload.top_tenants_30d : [];

  const kpiCards = [
    {
      title: 'Tenants Activos',
      value: formatMetric(metrics.active_tenants),
      detail: `Con actividad 30d: ${formatMetric(metrics.active_tenants_with_activity_30d)} (${metrics.tenant_activity_rate_30d || 0}%)`,
    },
    {
      title: 'Empleados Activos',
      value: formatMetric(metrics.active_employees),
      detail: `Usuarios activos: ${formatMetric(metrics.active_users)}`,
    },
    {
      title: 'Marcaciones',
      value: formatMetric(metrics.total_punches_year),
      detail: `Hoy: ${formatMetric(metrics.total_punches_today)} | 30d: ${formatMetric(metrics.total_punches_30d)}`,
    },
    {
      title: 'Capacidad Operativa',
      value: formatMetric(metrics.active_devices),
      detail: `Disp. activos | Prom. 30d por empl: ${formatMetric(metrics.avg_punches_per_employee_30d)}`,
    },
    {
      title: 'Ausencias Pendientes',
      value: formatMetric(metrics.pending_absence_requests),
      detail: 'Solicitudes globales pendientes',
    },
    {
      title: 'Cambios de Turno Pendientes',
      value: formatMetric(metrics.pending_shift_change_requests),
      detail: 'Solicitudes globales pendientes',
    },
  ];

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">KPIs Operativos</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pt-0 pb-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            {kpiCards.map((kpi) => (
              <div key={kpi.title} className="rounded-lg border bg-card p-2">
                <p className="text-xs text-muted-foreground">{kpi.title}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight">{kpi.value}</p>
                <p className="mt-1 text-[10px] text-muted-foreground leading-tight">{kpi.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-[340px] flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="whitespace-nowrap">Marcaciones por Dispositivo (90 dias)</CardTitle>
            <CardDescription>Participacion porcentual por origen de dispositivo.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {deviceDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin marcaciones registradas para el periodo.</p>
            ) : (
              <div className="h-full rounded-xl border bg-gradient-to-br from-slate-50 to-white p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceDistribution}
                      dataKey="punches"
                      nameKey="device_name"
                      cx="50%"
                      cy="47%"
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {deviceDistribution.map((_: any, idx: number) => (
                        <Cell key={`device-cell-${idx}`} fill={SYSTEM_ADMIN_CHART_COLORS[idx % SYSTEM_ADMIN_CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={28} />
                    <RechartsTooltip formatter={(value: any, _: any, row: any) => [`${formatMetric(value)} marcaciones`, row?.payload?.device_name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-[340px] flex flex-col">
          <CardHeader>
            <CardTitle>Top Tenants por Marcaciones (30 dias)</CardTitle>
            <CardDescription>Volumen de uso por tenant en el ultimo mes.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {topTenants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin actividad de tenants para el periodo.</p>
            ) : (
              <div className="h-full rounded-xl border bg-white p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topTenants.slice(0, 8)} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tenant_name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={58} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip formatter={(value: any) => [`${formatMetric(value)} marcaciones`, 'Volumen']} />
                    <Bar dataKey="punches_30d" name="Marcaciones 30d" radius={[6, 6, 0, 0]}>
                      {topTenants.slice(0, 8).map((_: any, idx: number) => (
                        <Cell key={`tenant-bar-${idx}`} fill={SYSTEM_ADMIN_CHART_COLORS[idx % SYSTEM_ADMIN_CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-[340px] flex flex-col">
          <CardHeader>
            <CardTitle>Incremento de Empleados por Semana ({selectedYear})</CardTitle>
            <CardDescription>Nuevos registros semanales de empleados activos.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={employeesSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week_label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="new_employees" name="Nuevos" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Incremento de Marcaciones por Semana ({selectedYear})</CardTitle>
            <CardDescription>Volumen semanal global de marcaciones.</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={punchesSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week_label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="punches" name="Semanal" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nuevos Empleados por Semana ({selectedYear})</CardTitle>
            <CardDescription>Vista en barras para variacion semanal.</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
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
    </div>
  );
}

export function Dashboard() {
  const { profile, session } = useAuth();
  const { menuScreens } = usePermissions();

  const isEmployee = profile?.role_key === 'EMPLOYEE';
  const isSystemAdmin = profile?.role_key === 'SYSTEM_ADMIN';
  const isSupervisor = profile?.role_key === 'SUPERVISOR';

  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [employeePayload, setEmployeePayload] = useState<any>(null);
  const [systemAdminLoading, setSystemAdminLoading] = useState(false);
  const [systemAdminError, setSystemAdminError] = useState<string | null>(null);
  const [systemAdminPayload, setSystemAdminPayload] = useState<any>(null);
  const [supervisorLoading, setSupervisorLoading] = useState(false);
  const [supervisorError, setSupervisorError] = useState<string | null>(null);
  const [supervisorPayload, setSupervisorPayload] = useState<any>(null);
  const [systemAdminYear, setSystemAdminYear] = useState(new Date().getFullYear());
  const [systemAdminWeekStep, setSystemAdminWeekStep] = useState(1);

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
        const resp = await fetch(buildApiUrl('/dashboard/employee-summary'), {
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
  }, [isEmployee, session?.access_token]);

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
        const resp = await fetch(buildApiUrl('/dashboard/supervisor-summary'), {
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

    void loadSupervisor();
    void waitForSupervisorEvent();

    return () => {
      mounted = false;
      summaryAbortController?.abort();
      eventsAbortController?.abort();
      if (retryTimerId !== undefined) window.clearTimeout(retryTimerId);
    };
  }, [isSupervisor, session?.access_token]);

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
      title: 'Tenants Activos',
      value: formatMetric(metrics.active_tenants),
      icon: Building2,
      description: `Con actividad 30d: ${formatMetric(metrics.active_tenants_with_activity_30d)}`,
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

  return (
    <div className="p-5 max-w-full space-y-4">
      <SystemAdminPageHeader
        icon={BarChart3}
        title={isSupervisor ? 'Dashboard de Supervisor' : `Bienvenido, ${profile?.display_name || 'Usuario'}`}
        subtitle={isSystemAdmin
          ? 'Analitica global de adopcion, crecimiento y uso operativo del sistema'
          : isSupervisor
            ? 'Asistencia operativa, novedades, marcaciones y tendencias del equipo asignado'
          : 'Sistema Enterprise de Control de Asistencias y Turnos de Trabajo'}
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
          <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
            <div className="rounded-lg border bg-white px-3 py-2">
              <p className="text-muted-foreground">Empleados</p>
              <p className="text-lg font-semibold">{formatMetric(supervisorPayload?.metrics?.assigned_employees)}</p>
            </div>
            <div className="rounded-lg border bg-white px-3 py-2">
              <p className="text-muted-foreground">Areas</p>
              <p className="text-lg font-semibold">{formatMetric(supervisorPayload?.metrics?.assigned_areas)}</p>
            </div>
            <div className="rounded-lg border bg-white px-3 py-2">
              <p className="text-muted-foreground">Faltas hoy</p>
              <p className="text-lg font-semibold text-red-700">{formatMetric(supervisorPayload?.metrics?.today_absences)}</p>
            </div>
            <div className="rounded-lg border bg-white px-3 py-2">
              <p className="text-muted-foreground">Actualizado</p>
              <p className="text-sm font-semibold">{supervisorLoading ? 'Actualizando...' : formatTimeOnly(supervisorPayload?.generated_at)}</p>
            </div>
          </div>
        ) : undefined}
      />

      {!isSystemAdmin && !isSupervisor ? <RoleInfo roleKey={profile?.role_key} /> : null}

      {isSupervisor ? (
        supervisorError ? (
          <Card><CardContent className="pt-6"><p className="text-sm text-red-600">{supervisorError}</p></CardContent></Card>
        ) : (
          <SupervisorHome payload={supervisorPayload} />
        )
      ) : isEmployee ? (
        employeeLoading ? (
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Cargando informacion del empleado...</p></CardContent></Card>
        ) : employeeError ? (
          <Card><CardContent className="pt-6"><p className="text-sm text-red-600">{employeeError}</p></CardContent></Card>
        ) : (
          <EmployeeHome payload={employeePayload} />
        )
      ) : (
        <>
          {!isSystemAdmin && !isSupervisor ? (
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

          {!isSystemAdmin && !isSupervisor && (
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
                      onClick={() => { window.location.href = screen.route_path; }}
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

      {!isSupervisor ? (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-blue-900 mb-2">Informacion del Sistema</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-blue-800">
                  <div><span className="font-medium">Usuario:</span> {profile?.email}</div>
                  <div><span className="font-medium">Rol:</span> {profile?.role_name}</div>
                  <div><span className="font-medium">Tenant:</span> {profile?.tenant_name}</div>
                  <div><span className="font-medium">Pantallas:</span> {menuScreens.length}</div>
                </div>
              </div>

              <div>
                <p className="text-sm text-blue-900 font-medium mb-2">Grupos de Menu Asignados:</p>
                <div className="flex flex-wrap gap-2">
                  {expectedGroups.map((group) => (
                    <span key={group} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">{group}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      ) : null}
    </div>
  );
}


