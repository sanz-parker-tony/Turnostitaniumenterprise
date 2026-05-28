/**
 * Dashboard Principal - Home para TODOS los roles
 * Contenido dinamico segun rol del usuario
 */

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import LayoutNew from '@/components/LayoutNewAppRouter';
import Link from 'next/link';
import { 
  Clock, AlertTriangle, Calendar, TrendingUp, Users, 
  Shield, Settings, FileText, CheckCircle, XCircle,
  ArrowRight, ClipboardList, FileCheck, MapPin, ChevronLeft, ChevronRight,
  LogIn, LogOut, Utensils, UtensilsCrossed, Fingerprint, Plane, Baby, Stethoscope, UserX,
  DoorOpen, DoorClosed, ArrowRightCircle, ArrowLeftCircle,
  CalendarCheck2, RefreshCw, Cake, Clock3, CircleDot,
  AtSign, Building2, BriefcaseBusiness, CalendarCheck, Network, CalendarDays
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TenantSummaryShift {
  id: string;
  shift_name: string;
  shift_short_name: string;
  start_time: string | null;
  work_minutes: number | null;
  shift_icon_key: string | null;
  shift_bg_color: string | null;
  shift_text_color: string | null;
}

interface TenantSummaryWorkPattern {
  id: string;
  pattern_name: string;
  pattern_short_name: string;
  cycle_length_days: number;
  work_days_per_cycle: number;
  rest_days_per_cycle: number;
}

interface TenantSummaryHoliday {
  id: string;
  holiday_date: string;
  holiday_name: string;
  company_name: string | null;
}

interface TenantSummaryDevice {
  id: string;
  company_name: string | null;
  device_name: string | null;
  device_serial_number: string | null;
  work_location_name: string | null;
  geofence_polygon: any;
  latitude: number | null;
  longitude: number | null;
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatShiftTime(value: string | null | undefined): string {
  if (!value) return '--:--';
  return String(value).slice(0, 5);
}

function dayShortName(date: Date): string {
  return date.toLocaleDateString('es-EC', { weekday: 'short' }).replace('.', '');
}

export default function DashboardPage() {
  const { user, profile, userRoles, isLoading: authLoading } = useAuth();
  const { menuScreens, isLoading: permsLoading } = usePermissions();
  const router = useRouter();
  const [dashboardType, setDashboardType] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (!authLoading && userRoles) {
      // Determinar tipo de dashboard por prioridad de rol
      // Nota: TENANT_ADMIN debe tener prioridad sobre EMPLOYEE para mostrar su tablero administrativo.
      if (userRoles.includes('SYSTEM_ADMIN')) {
        setDashboardType('SYSTEM_ADMIN');
      } else if (userRoles.includes('TENANT_ADMIN')) {
        setDashboardType('TENANT_ADMIN');
      } else if (userRoles.includes('RRHH_ADMIN')) {
        setDashboardType('RRHH_ADMIN');
      } else if (userRoles.includes('EMPLOYEE')) {
        setDashboardType('EMPLOYEE');
      } else {
        setDashboardType('DEFAULT');
      }
    }
  }, [user, authLoading, userRoles, router]);

  // Loading state
  if (authLoading || permsLoading || !dashboardType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block size-12 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <LayoutNew>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Bienvenido, {profile?.full_name || 'Usuario'}
          </h1>
          <p className="text-gray-600 mt-2">
            {dashboardType === 'EMPLOYEE' && 'Panel de autoservicio - Gestiona tus asistencias y solicitudes'}
            {dashboardType === 'RRHH_ADMIN' && 'Panel de RRHH - Gestion de personal y aprobaciones'}
            {dashboardType === 'SYSTEM_ADMIN' && 'Panel de Administracion - Configuracion del sistema'}
            {dashboardType === 'TENANT_ADMIN' && 'Panel de Administracion - Gestion del tenant'}
            {dashboardType === 'DEFAULT' && 'Panel principal'}
          </p>
        </div>

        {/* Dashboard EMPLOYEE */}
        {dashboardType === 'EMPLOYEE' && <EmployeeDashboard />}

        {/* Dashboard RRHH_ADMIN */}
        {dashboardType === 'RRHH_ADMIN' && <RRHHDashboard />}

        {/* Dashboard SYSTEM_ADMIN */}
        {dashboardType === 'SYSTEM_ADMIN' && <SystemAdminDashboard />}

        {/* Dashboard TENANT_ADMIN */}
        {dashboardType === 'TENANT_ADMIN' && <TenantAdminDashboard menuScreens={menuScreens} />}

        {/* Dashboard DEFAULT */}
        {dashboardType === 'DEFAULT' && <DefaultDashboard />}
      </div>
    </LayoutNew>
  );
}

// ============================================================================
// EMPLOYEE DASHBOARD - Tarjetas + CTAs a KIOSK
// ============================================================================

function EmployeeDashboard() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!session?.access_token) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        if (mounted) {
          setLoading(true);
          setError(null);
        }

        const resp = await fetch('http://localhost:3001/dashboard/employee-summary', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          throw new Error(data?.error || 'No se pudo cargar la informacion del empleado');
        }
        if (mounted) setPayload(data);
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Error cargando dashboard de empleado');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [session?.access_token]);

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

  const fmtDate = (value: string | null | undefined) => {
    if (!value) return '-';
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return date.toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const fmtHours = (value: any) => `${Number(value || 0).toFixed(2)} h`;
  const resolveProfileIcon = (name: string, fallback: any) => (LucideIcons as Record<string, any>)[name] || fallback;

  const employeeTopItems = [
    { icon: resolveProfileIcon('IdCard', FileText), value: employee.employee_code || '-', title: 'Codigo', color: 'bg-blue-100 text-blue-700' },
    { icon: resolveProfileIcon('VenusAndMars', Shield), value: employee.gender_label || '-', title: 'Genero', color: 'bg-violet-100 text-violet-700' },
    { icon: Cake, value: fmtDate(employee.birth_date), title: 'Nacimiento', color: 'bg-pink-100 text-pink-700' },
    { icon: resolveProfileIcon('FileBadge', Users), value: `${employee.employee_lastname || ''} ${employee.employee_name || ''}`.trim() || '-', title: 'Nombre', color: 'bg-indigo-100 text-indigo-700' },
    { icon: resolveProfileIcon('Smartphone', ArrowRightCircle), value: employee.phone || '-', title: 'Telefono', color: 'bg-emerald-100 text-emerald-700' },
    { icon: AtSign, value: employee.user_display_name || employee.user_email || '-', title: 'Usuario', color: 'bg-cyan-100 text-cyan-700' },
  ];

  const employeeCompanyTopItems = [
    { icon: Building2, value: employeeCompany.company_name || '-', title: 'Empresa', color: 'bg-slate-100 text-slate-700' },
    { icon: BriefcaseBusiness, value: employeeCompany.job_title_name || '-', title: 'Cargo', color: 'bg-orange-100 text-orange-700' },
    { icon: MapPin, value: employeeCompany.work_location_name || '-', title: 'Localizacion', color: 'bg-teal-100 text-teal-700' },
    { icon: CalendarCheck, value: fmtDate(employeeCompany.hire_date), title: 'Fecha Ingreso', color: 'bg-fuchsia-100 text-fuchsia-700' },
    { icon: resolveProfileIcon('UserRoundCheck', ClipboardList), value: employeeCompany.employee_profile_name || '-', title: 'Perfil', color: 'bg-amber-100 text-amber-700' },
    { icon: Network, value: `${employeeCompany.department_name || '-'} / ${employeeCompany.area_name || '-'}`, title: 'Posicion Organizacional', color: 'bg-lime-100 text-lime-700' },
    { icon: resolveProfileIcon('MapPinned', MapPin), value: `${employeeCompany.state_label || '-'} / ${employeeCompany.city_label || '-'}`, title: 'Alcance Geografico', color: 'bg-sky-100 text-sky-700' },
    { icon: CalendarDays, value: employeeCompany.work_on_holidays ? 'Trabaja feriados: Si' : 'Trabaja feriados: No', title: 'Trabaja Feriados', color: employeeCompany.work_on_holidays ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700' },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-sm text-gray-500">Cargando home de empleado...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 2xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 2xl:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Modulo 1 - Empleado y Empleado Empresa</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 text-sm">
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Empleado</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {employeeTopItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={`emp-top-${index}`} className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-2" title={item.title}>
                      <span className={`inline-flex size-7 items-center justify-center rounded-full ${item.color}`}>
                        <Icon className="size-4" />
                      </span>
                      <span className="text-gray-800 text-sm truncate">{item.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Empleado Empresa</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {employeeCompanyTopItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={`empco-top-${index}`} className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-2" title={item.title}>
                      <span className={`inline-flex size-7 items-center justify-center rounded-full ${item.color}`}>
                        <Icon className="size-4" />
                      </span>
                      <span className="text-gray-800 text-sm truncate">{item.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Modulo 6 - Tiempos por novedades que suman (mes)</h2>
          <div className="space-y-3">
            {plusEvents.length === 0 ? (
              <p className="text-sm text-gray-500">Sin novedades que suman en el mes.</p>
            ) : plusEvents.map((row) => {
              const pct = Math.max(6, Math.round((Number(row.total_hours || 0) / maxPlusHours) * 100));
              return (
                <div key={row.attendance_event_id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-800">{row.event_short_name || row.event_name}</span>
                    <span className="font-medium text-emerald-700">{fmtHours(row.total_hours)}</span>
                  </div>
                  <div className="h-2 rounded bg-emerald-50 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Modulo 7 - Tiempos por novedades que restan (mes)</h2>
          <div className="space-y-3">
            {minusEvents.length === 0 ? (
              <p className="text-sm text-gray-500">Sin novedades que restan en el mes.</p>
            ) : minusEvents.map((row) => {
              const pct = Math.max(6, Math.round((Number(row.total_hours || 0) / maxMinusHours) * 100));
              return (
                <div key={row.attendance_event_id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-800">{row.event_short_name || row.event_name}</span>
                    <span className="font-medium text-rose-700">{fmtHours(row.total_hours)}</span>
                  </div>
                  <div className="h-2 rounded bg-rose-50 overflow-hidden">
                    <div className="h-full bg-rose-500 rounded" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-6">
        <EmployeeCalendarModuleCard
          title="Modulo 2 - Marcaciones"
          subtitle="Iconos de entrada, salida y lunch"
          year={Number(calendarMonth?.year) || new Date().getFullYear()}
          month={Number(calendarMonth?.month) || (new Date().getMonth() + 1)}
          events={module2PunchEvents}
          emptyLabel="Sin marcaciones del mes."
        />
        <EmployeeCalendarModuleCard
          title="Modulo 3 - Turnos asignados"
          subtitle="Turnos del mes por dia (color del turno)"
          year={Number(calendarMonth?.year) || new Date().getFullYear()}
          month={Number(calendarMonth?.month) || (new Date().getMonth() + 1)}
          events={module3ShiftEvents}
          emptyLabel="Sin turnos asignados en el mes."
        />
        <EmployeeCalendarModuleCard
          title="Modulo 4 - Solicitudes"
          subtitle="Justificaciones, permisos y cambios de turno"
          year={Number(calendarMonth?.year) || new Date().getFullYear()}
          month={Number(calendarMonth?.month) || (new Date().getMonth() + 1)}
          events={module4RequestEvents}
          emptyLabel="Sin solicitudes registradas en el mes."
        />
        <EmployeeCalendarModuleCard
          title="Modulo 5 - Feriados"
          subtitle="Feriados aplicables, cumpleanos y reuniones"
          year={Number(calendarMonth?.year) || new Date().getFullYear()}
          month={Number(calendarMonth?.month) || (new Date().getMonth() + 1)}
          events={module5HolidayEvents}
          emptyLabel="Sin feriados aplicables en el mes."
        />
      </div>
    </div>
  );
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
  FILECHECK: FileCheck,
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

function EmployeeCalendarModuleCard({
  title,
  subtitle,
  year,
  month,
  events,
  emptyLabel,
}: {
  title: string;
  subtitle: string;
  year: number;
  month: number;
  events: EmployeeCalendarEvent[];
  emptyLabel: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="text-xs text-gray-500 mt-1 mb-4">{subtitle}</p>
      <EmployeeMonthlyEventsCalendar year={year} month={month} events={events} emptyLabel={emptyLabel} />
    </div>
  );
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
      <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold text-gray-500">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((name, idx) => (
          <div key={`${name}-${idx}`} className="rounded bg-gray-50 px-1 py-1 text-center">{name}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="h-20 rounded border border-dashed border-gray-200 bg-gray-50" />;
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
              className={`h-20 rounded border p-1 ${isToday ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}`}
            >
              <div className="text-[10px] font-semibold text-gray-700">{date.getDate()}</div>
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
                  <div className="size-5 rounded bg-gray-100 text-gray-600 text-[10px] flex items-center justify-center" title={`+${overflowCount} eventos`}>
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
        <p className="text-xs text-gray-500">{emptyLabel}</p>
      ) : null}
    </div>
  );
}
// RRHH DASHBOARD - Cola de aprobaciones
// ============================================================================

function RRHHDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Clock className="w-6 h-6 text-amber-600" />}
          title="Pendientes Aprobar"
          value="12"
          description="Solicitudes en espera"
          color="amber"
        />
        <StatCard
          icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
          title="Anomalias"
          value="8"
          description="Requieren revision"
          color="red"
        />
        <StatCard
          icon={<Users className="w-6 h-6 text-blue-600" />}
          title="Empleados Activos"
          value="245"
          description="En el sistema"
          color="blue"
        />
        <StatCard
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
          title="Aprobadas Hoy"
          value="18"
          description="Solicitudes procesadas"
          color="green"
        />
      </div>

      {/* Accesos Rapidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickAccessCard
          title="Aprobar Solicitudes"
          count={12}
          href="/dashboard/attendance/approvals"
        />
        <QuickAccessCard
          title="Revisar Anomalias"
          count={8}
          href="/dashboard/attendance/anomalies"
        />
        <QuickAccessCard
          title="Solicitudes de Ausencia"
          count={5}
          href="/dashboard/employees/absence-requests"
        />
      </div>
    </div>
  );
}

// ============================================================================
// SYSTEM_ADMIN DASHBOARD
// ============================================================================

function SystemAdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Settings className="w-6 h-6 text-blue-600" />}
          title="Sistema Operativo"
          value="100%"
          description="Todos los servicios OK"
          color="green"
        />
        <StatCard
          icon={<Users className="w-6 h-6 text-purple-600" />}
          title="Dispositivos"
          value="15"
          description="Conectados"
          color="purple"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6 text-green-600" />}
          title="Procesos Hoy"
          value="3"
          description="Ejecutados exitosamente"
          color="green"
        />
        <StatCard
          icon={<Shield className="w-6 h-6 text-amber-600" />}
          title="Logs de Auditoria"
          value="1,234"
          description="Eventos registrados"
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickAccessCard
          title="Configuracion Tenant"
          href="/dashboard/config/tenant-settings"
        />
        <QuickAccessCard
          title="Dispositivos"
          href="/dashboard/config/devices"
        />
        <QuickAccessCard
          title="Auditoria"
          href="/dashboard/security/audit"
        />
      </div>
    </div>
  );
}

// ============================================================================
// TENANT_ADMIN DASHBOARD
// ============================================================================

function TenantAdminDashboard({
  menuScreens,
}: {
  menuScreens: Array<{ screen_key: string; route_path: string; menu_label?: string; menu_group_key?: string }>;
}) {
  const { session } = useAuth();
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [tenantSummary, setTenantSummary] = useState<any>(null);
  const [monthCursor, setMonthCursor] = useState<Date>(() => {
    const base = new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    let mounted = true;

    const loadSummary = async () => {
      if (!session?.access_token) {
        if (mounted) setLoadingSummary(false);
        return;
      }
      try {
        if (mounted) {
          setLoadingSummary(true);
          setSummaryError(null);
        }

        const month = toMonthKey(monthCursor);
        const resp = await fetch(`http://localhost:3001/dashboard/tenant-admin-summary?month=${encodeURIComponent(month)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          throw new Error(payload?.error || 'No se pudo cargar el resumen del tenant');
        }
        if (mounted) setTenantSummary(payload);
      } catch (e: any) {
        if (mounted) setSummaryError(e?.message || 'Error cargando resumen del tenant');
      } finally {
        if (mounted) setLoadingSummary(false);
      }
    };

    void loadSummary();
    return () => {
      mounted = false;
    };
  }, [session?.access_token, monthCursor]);

  const tenant = tenantSummary?.tenant || {};
  const metrics = tenantSummary?.metrics || {};
  const shifts = (tenantSummary?.shifts || []) as TenantSummaryShift[];
  const workPatterns = (tenantSummary?.work_patterns || []) as TenantSummaryWorkPattern[];
  const monthCalendar = (tenantSummary?.calendar?.holidays || []) as TenantSummaryHoliday[];
  const mapDevices = (tenantSummary?.devices || []) as TenantSummaryDevice[];

  const quickLinks = menuScreens
    .filter((screen) => screen.route_path && screen.route_path !== '/dashboard')
    .sort((a, b) => (a.menu_label || a.screen_key).localeCompare(b.menu_label || b.screen_key))
    .slice(0, 6);

  const organizationSnapshot = [
    { label: 'Empresas', value: metrics?.active_companies ?? 0 },
    { label: 'Ubicaciones', value: metrics?.active_work_locations ?? 0 },
    { label: 'Departamentos', value: metrics?.active_departments ?? 0 },
    { label: 'Areas', value: metrics?.active_areas ?? 0 },
    { label: 'Centros de Costo', value: metrics?.active_cost_centers ?? 0 },
    { label: 'Grupos de Nomina', value: metrics?.active_payroll_groups ?? 0 },
    { label: 'Grupos de Trabajo', value: metrics?.active_work_groups ?? 0 },
    { label: 'Perfiles', value: metrics?.active_employee_profiles ?? 0 },
    { label: 'Cargos', value: metrics?.active_job_titles ?? 0 },
    { label: 'Empleados Activos', value: metrics?.active_employees ?? 0 },
  ];

  const planningSnapshot = [
    { label: 'Turnos Activos', value: metrics?.active_shifts ?? 0 },
    { label: 'Patrones de Trabajo Activos', value: metrics?.active_work_patterns ?? 0 },
  ];

  const calendarSnapshot = [
    { label: 'Feriados Activos', value: metrics?.active_holidays ?? 0 },
    { label: 'Feriados del Anio', value: metrics?.holidays_current_year ?? 0 },
    { label: 'Feriados Proximos (90 dias)', value: metrics?.holidays_next_90_days ?? 0 },
    {
      label: 'Proximo Feriado',
      value:
        metrics?.next_holiday_date && metrics?.next_holiday_name
          ? `${metrics.next_holiday_name} (${metrics.next_holiday_date})`
          : '-',
    },
  ];

  const monthTitle = monthCursor.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informacion del Tenant</h3>
        {loadingSummary ? (
          <p className="text-sm text-gray-500">Cargando informacion...</p>
        ) : summaryError ? (
          <p className="text-sm text-red-600">{summaryError}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Tenant</p>
              <p className="font-semibold text-gray-900">{tenant?.tenant_name || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Clave</p>
              <p className="font-semibold text-gray-900">{tenant?.tenant_key || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Idioma</p>
              <p className="font-semibold text-gray-900">{tenant?.language_code || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Estado</p>
              <p className="font-semibold text-gray-900">{tenant?.is_active ? 'Activo' : 'Inactivo'}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="w-6 h-6 text-blue-600" />}
          title="Usuarios Activos"
          value={String(metrics?.active_users ?? 0)}
          description="Usuarios activos del tenant"
          color="blue"
        />
        <StatCard
          icon={<Users className="w-6 h-6 text-green-600" />}
          title="Empleados Activos"
          value={String(metrics?.active_employees ?? 0)}
          description="Empleados activos del tenant"
          color="green"
        />
        <StatCard
          icon={<Shield className="w-6 h-6 text-purple-600" />}
          title="Roles Activos"
          value={String(metrics?.active_roles ?? 0)}
          description="Roles configurados"
          color="purple"
        />
        <StatCard
          icon={<Settings className="w-6 h-6 text-amber-600" />}
          title="Empresas Activas"
          value={String(metrics?.active_companies ?? 0)}
          description="Empresas habilitadas"
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<FileText className="w-6 h-6 text-amber-600" />}
          title="Solicitudes de Permiso"
          value={String(metrics?.pending_absence_requests ?? 0)}
          description="Pendientes de aprobacion"
          color="amber"
        />
        <StatCard
          icon={<Calendar className="w-6 h-6 text-purple-600" />}
          title="Cambios de Turno"
          value={String(metrics?.pending_shift_change_requests ?? 0)}
          description="Pendientes de aprobacion"
          color="purple"
        />
        <StatCard
          icon={<Settings className="w-6 h-6 text-blue-600" />}
          title="Parametros Tenant"
          value={String(metrics?.tenant_setting_overrides ?? 0)}
          description="Overrides activos"
          color="blue"
        />
        <StatCard
          icon={<Users className="w-6 h-6 text-green-600" />}
          title="Miembros Tenant"
          value={String(metrics?.tenant_members ?? 0)}
          description="Miembros vinculados"
          color="green"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Estructura organizacional (solo lectura)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {organizationSnapshot.map((item) => (
            <div key={item.label} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-xl font-semibold text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Planificacion</h3>
          <div className="space-y-3">
            {planningSnapshot.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                <span className="text-sm text-gray-600">{item.label}</span>
                <span className="text-sm font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Calendario</h3>
          <div className="space-y-3">
            {calendarSnapshot.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                <span className="text-sm text-gray-600">{item.label}</span>
                <span className="text-sm font-semibold text-gray-900 text-right">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Turnos existentes</h3>
          {shifts.length === 0 ? (
            <p className="text-sm text-gray-500">No existen turnos activos.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="rounded-md border border-gray-200 px-3 py-2"
                  style={{ backgroundColor: shift.shift_bg_color || '#F8FAFC', color: shift.shift_text_color || '#111827' }}
                >
                  <p className="text-sm font-semibold">{shift.shift_name}</p>
                  <p className="text-xs opacity-90">
                    {shift.shift_short_name} · {formatShiftTime(shift.start_time)} · {shift.work_minutes ?? 0} min
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Patrones de trabajo existentes</h3>
          {workPatterns.length === 0 ? (
            <p className="text-sm text-gray-500">No existen patrones activos.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {workPatterns.map((pattern) => (
                <div key={pattern.id} className="rounded-md border border-gray-200 px-3 py-2">
                  <p className="text-sm font-semibold text-gray-900">{pattern.pattern_name}</p>
                  <p className="text-xs text-gray-600">
                    {pattern.pattern_short_name} · Ciclo {pattern.cycle_length_days} dias · Trabajo {pattern.work_days_per_cycle} / Descanso {pattern.rest_days_per_cycle}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Calendario del mes ({monthTitle})</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              <ChevronLeft className="size-4" />
              Anterior
            </button>
            <button
              onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Siguiente
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        <CalendarMonthPanel month={monthCursor} holidays={monthCalendar} />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dispositivos existentes en mapa</h3>
        <DevicesMapPanel devices={mapDevices} />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Accesos rapidos</h3>
        {quickLinks.length === 0 ? (
          <p className="text-sm text-gray-500">No hay modulos disponibles para este rol.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((screen) => (
              <QuickAccessCard
                key={`${screen.screen_key}-${screen.route_path}`}
                title={screen.menu_label || screen.screen_key}
                href={screen.route_path}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarMonthPanel({
  month,
  holidays,
}: {
  month: Date;
  holidays: TenantSummaryHoliday[];
}) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const leadingDays = (start.getDay() + 6) % 7;
  const totalDays = end.getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < leadingDays; i += 1) cells.push(null);
  for (let day = 1; day <= totalDays; day += 1) cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  while (cells.length % 7 !== 0) cells.push(null);

  const holidayByDate = new Map<string, TenantSummaryHoliday[]>();
  holidays.forEach((row) => {
    const key = row.holiday_date?.slice(0, 10);
    if (!key) return;
    const list = holidayByDate.get(key) || [];
    list.push(row);
    holidayByDate.set(key, list);
  });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-gray-500">
        {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((name) => (
          <div key={name} className="rounded bg-gray-50 px-2 py-1 text-center">{name}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="h-24 rounded border border-dashed border-gray-200 bg-gray-50" />;
          }
          const key = date.toISOString().slice(0, 10);
          const entries = holidayByDate.get(key) || [];
          const isToday = key === new Date().toISOString().slice(0, 10);
          return (
            <div
              key={key}
              className={`h-24 rounded border px-2 py-1 ${isToday ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">{date.getDate()}</span>
                <span className="text-[10px] text-gray-500">{dayShortName(date)}</span>
              </div>
              <div className="mt-1 space-y-1 overflow-hidden">
                {entries.slice(0, 2).map((entry) => (
                  <div key={entry.id} className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800 truncate" title={entry.holiday_name}>
                    {entry.holiday_name}
                  </div>
                ))}
                {entries.length > 2 ? (
                  <div className="text-[10px] text-gray-500">+{entries.length - 2} mas</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DevicesMapPanel({ devices }: { devices: TenantSummaryDevice[] }) {
  const withGeo = devices.filter((row) => row.latitude !== null && row.longitude !== null);
  const minLat = withGeo.length ? Math.min(...withGeo.map((d) => Number(d.latitude))) : 0;
  const maxLat = withGeo.length ? Math.max(...withGeo.map((d) => Number(d.latitude))) : 0;
  const minLng = withGeo.length ? Math.min(...withGeo.map((d) => Number(d.longitude))) : 0;
  const maxLng = withGeo.length ? Math.max(...withGeo.map((d) => Number(d.longitude))) : 0;
  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="rounded-lg border border-gray-200 bg-slate-50 p-3 min-h-[260px] relative overflow-hidden">
        {withGeo.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">
            No hay dispositivos con coordenadas para mostrar en mapa.
          </div>
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.15),_transparent_60%)]" />
            {withGeo.map((row) => {
              const x = ((Number(row.longitude) - minLng) / lngRange) * 100;
              const y = 100 - ((Number(row.latitude) - minLat) / latRange) * 100;
              const safeX = Math.min(96, Math.max(4, x));
              const safeY = Math.min(96, Math.max(4, y));
              const title = `${row.device_name || row.device_serial_number || row.id} (${row.latitude}, ${row.longitude})`;
              return (
                <div key={row.id} className="absolute" style={{ left: `${safeX}%`, top: `${safeY}%`, transform: 'translate(-50%, -50%)' }} title={title}>
                  <MapPin className="size-5 text-blue-700 drop-shadow" />
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-3 max-h-[260px] overflow-auto">
        <div className="space-y-2">
          {devices.length === 0 ? (
            <p className="text-sm text-gray-500">No existen dispositivos activos.</p>
          ) : (
            devices.map((row) => (
              <div key={row.id} className="rounded border border-gray-200 px-3 py-2">
                <p className="text-sm font-semibold text-gray-900">{row.device_name || row.device_serial_number || 'Dispositivo'}</p>
                <p className="text-xs text-gray-600">
                  {row.company_name || '-'} · {row.work_location_name || 'Sin localidad'}
                </p>
                <p className="text-xs text-gray-600">
                  Coordenadas: {row.latitude !== null && row.longitude !== null ? `${row.latitude}, ${row.longitude}` : 'No configuradas'}
                </p>
                <p className="text-xs text-gray-500">
                  Geocerca: {row.geofence_polygon ? 'Definida' : 'No definida'}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
function DefaultDashboard() {
  return (
    <div className="text-center py-12">
      <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard Principal</h2>
      <p className="text-gray-600">
        Usa el menu lateral para acceder a las funcionalidades del sistema
      </p>
    </div>
  );
}

// ============================================================================
// COMPONENTES REUTILIZABLES
// ============================================================================

function StatCard({ icon, title, value, description, color }: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  color: 'amber' | 'red' | 'blue' | 'green' | 'purple';
}) {
  const bgColors = {
    amber: 'bg-amber-50',
    red: 'bg-red-50',
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    purple: 'bg-purple-50',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-lg ${bgColors[color]}`}>
          {icon}
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mt-4">{value}</h3>
      <p className="text-sm font-medium text-gray-700 mt-1">{title}</p>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
  );
}

function CTACard({ title, description, icon, href, buttonText }: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  buttonText: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#0074D9] text-white rounded-lg hover:bg-[#0056A3] transition-colors text-sm font-medium"
      >
        {buttonText}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function QuickAccessCard({ title, count, href }: {
  title: string;
  count?: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow block"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {count !== undefined && (
          <span className="px-3 py-1 bg-[#0074D9] text-white rounded-full text-sm font-medium">
            {count}
          </span>
        )}
      </div>
      <div className="flex items-center text-[#0074D9] text-sm font-medium">
        Ir a modulo
        <ArrowRight className="w-4 h-4 ml-2" />
      </div>
    </Link>
  );
}





