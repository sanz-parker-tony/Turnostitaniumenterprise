/**
 * Dashboard Principal - Home para TODOS los roles
 * Contenido dinÃ¡mico segÃºn rol del usuario
 */

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import LayoutNew from '@/components/LayoutNewAppRouter';
import Link from 'next/link';
import { 
  Clock, AlertTriangle, Calendar, TrendingUp, Users, 
  Shield, Settings, FileText, CheckCircle, XCircle,
  ArrowRight, ClipboardList, FileCheck, MapPin, ChevronLeft, ChevronRight
} from 'lucide-react';
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
            {dashboardType === 'RRHH_ADMIN' && 'Panel de RRHH - GestiÃ³n de personal y aprobaciones'}
            {dashboardType === 'SYSTEM_ADMIN' && 'Panel de AdministraciÃ³n - ConfiguraciÃ³n del sistema'}
            {dashboardType === 'TENANT_ADMIN' && 'Panel de AdministraciÃ³n - GestiÃ³n del tenant'}
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
  const plusEvents = (payload?.attendance_impact?.plus_events || []) as any[];
  const minusEvents = (payload?.attendance_impact?.minus_events || []) as any[];

  const maxPlusHours = plusEvents.reduce((acc, row) => Math.max(acc, Number(row?.total_hours || 0)), 0) || 1;
  const maxMinusHours = minusEvents.reduce((acc, row) => Math.max(acc, Number(row?.total_hours || 0)), 0) || 1;

  const fmtDateTime = (value: string | null | undefined) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const fmtDate = (value: string | null | undefined) => {
    if (!value) return '-';
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return date.toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const fmtHours = (value: any) => `${Number(value || 0).toFixed(2)} h`;

  const statusColor = (statusKey: string | null | undefined) => {
    const key = String(statusKey || '').toUpperCase();
    if (['APPROVED', 'APROBADO'].includes(key)) return 'bg-green-100 text-green-700';
    if (['REJECTED', 'RECHAZADO', 'DENIED'].includes(key)) return 'bg-red-100 text-red-700';
    if (['PENDING', 'PENDIENTE', 'IN_REVIEW', 'EN_REVISION', 'EN_REVISI�N'].includes(key)) return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-700';
  };

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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Modulo 1 � Empleado y Empleado Empresa</h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 text-sm">
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Empleado</h3>
            <div className="space-y-2 text-gray-700">
              <div><span className="text-gray-500">Codigo:</span> {employee.employee_code || '-'}</div>
              <div><span className="text-gray-500">Nombre:</span> {employee.employee_lastname || ''} {employee.employee_name || ''}</div>
              <div><span className="text-gray-500">Genero:</span> {employee.gender_label || '-'}</div>
              <div><span className="text-gray-500">Telefono:</span> {employee.phone || '-'}</div>
              <div><span className="text-gray-500">Nacimiento:</span> {fmtDate(employee.birth_date)}</div>
              <div><span className="text-gray-500">Usuario:</span> {employee.user_display_name || employee.user_email || '-'}</div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Empleado Empresa</h3>
            <div className="space-y-2 text-gray-700">
              <div><span className="text-gray-500">Empresa:</span> {employeeCompany.company_name || '-'}</div>
              <div><span className="text-gray-500">Perfil:</span> {employeeCompany.employee_profile_name || '-'}</div>
              <div><span className="text-gray-500">Cargo:</span> {employeeCompany.job_title_name || '-'}</div>
              <div><span className="text-gray-500">Departamento / Area:</span> {employeeCompany.department_name || '-'} / {employeeCompany.area_name || '-'}</div>
              <div><span className="text-gray-500">Localizacion:</span> {employeeCompany.work_location_name || '-'}</div>
              <div><span className="text-gray-500">Provincia / Canton:</span> {employeeCompany.state_label || '-'} / {employeeCompany.city_label || '-'}</div>
              <div><span className="text-gray-500">Fecha Ingreso:</span> {fmtDate(employeeCompany.hire_date)}</div>
              <div><span className="text-gray-500">Trabaja Feriados:</span> {employeeCompany.work_on_holidays ? 'Si' : 'No'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Modulo 2 � 10 marcaciones mas recientes</h2>
          <div className="space-y-2">
            {recentPunches.length === 0 ? (
              <p className="text-sm text-gray-500">Sin marcaciones recientes.</p>
            ) : recentPunches.map((row) => (
              <div key={row.id} className="rounded-md border border-gray-200 px-3 py-2 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">{row.movement_label || `Movimiento ${row.punch_key}`}</div>
                  <div className="text-xs text-gray-500">{fmtDateTime(row.punch_datetime)}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${statusColor(row.time_punch_status_key)}`}>
                  {row.time_punch_status_label || '-'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Modulo 3 � Turnos semana actual (Semana {week.iso_week || '-'}-{week.iso_year || '-'})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
            {weekDays.map((day) => (
              <div key={day.date} className="rounded-md border border-gray-200 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{day.weekday_label}</span>
                  <span className="text-xs text-gray-500">{fmtDate(day.date)}</span>
                </div>
                {day.shift ? (
                  <div className="mt-1 text-sm">
                    <span className="font-medium">{day.shift.effective_shift_name || day.shift.planned_shift_name || '-'}</span>
                    <span className="text-gray-500"> � {formatShiftTime(day.shift.effective_start_time)} � {day.shift.effective_work_minutes ?? 0} min</span>
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-gray-500">Sin turno</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Modulo 4 � Solicitudes (justificaciones y permisos)</h2>
          <div className="space-y-2">
            {requests.length === 0 ? (
              <p className="text-sm text-gray-500">Sin solicitudes registradas.</p>
            ) : requests.map((row) => (
              <div key={row.id} className="rounded-md border border-gray-200 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {row.justification_name || row.event_name || 'Solicitud'}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColor(row.request_status_key)}`}>
                    {row.request_status_label || '-'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {fmtDateTime(row.start_datetime)} - {fmtDateTime(row.end_datetime)}
                </div>
                {row.notes ? <div className="text-xs text-gray-700 mt-1">{row.notes}</div> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Modulo 5 � Feriados aplicables del mes en curso</h2>
          <div className="space-y-2">
            {holidays.length === 0 ? (
              <p className="text-sm text-gray-500">No hay feriados aplicables este mes.</p>
            ) : holidays.map((row) => (
              <div key={`${row.id}-${row.holiday_date}`} className="rounded-md border border-gray-200 px-3 py-2">
                <div className="text-sm font-medium text-gray-900">{row.holiday_name || '-'}</div>
                <div className="text-xs text-gray-500">{fmtDate(row.holiday_date)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Modulo 6 � Tiempos por novedades que suman (mes)</h2>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Modulo 7 � Tiempos por novedades que restan (mes)</h2>
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
          title="AnomalÃ­as"
          value="8"
          description="Requieren revisiÃ³n"
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

      {/* Accesos RÃ¡pidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickAccessCard
          title="Aprobar Solicitudes"
          count={12}
          href="/dashboard/attendance/approvals"
        />
        <QuickAccessCard
          title="Revisar AnomalÃ­as"
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
          title="Logs de AuditorÃ­a"
          value="1,234"
          description="Eventos registrados"
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickAccessCard
          title="ConfiguraciÃ³n Tenant"
          href="/dashboard/config/tenant-settings"
        />
        <QuickAccessCard
          title="Dispositivos"
          href="/dashboard/config/devices"
        />
        <QuickAccessCard
          title="AuditorÃ­a"
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
        Usa el menÃº lateral para acceder a las funcionalidades del sistema
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
        Ir a mÃ³dulo
        <ArrowRight className="w-4 h-4 ml-2" />
      </div>
    </Link>
  );
}


