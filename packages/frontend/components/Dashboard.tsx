/**
 * Dashboard - Pagina principal del sistema
 * Renderiza modulos segun rol.
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
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
} from 'lucide-react';

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
  if (['PENDING', 'PENDIENTE', 'IN_REVIEW', 'EN_REVISION', 'EN_REVISIÓN'].includes(key)) return 'bg-amber-100 text-amber-700';
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

function EmployeeHome({ payload }: { payload: any }) {
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modulo 1: Empleado y Empleado Empresa</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 xl:grid-cols-2 gap-6 text-sm">
          <div className="rounded-lg border p-4 space-y-2">
            <p className="font-semibold">Empleado</p>
            <p><span className="text-gray-500">Codigo:</span> {employee.employee_code || '-'}</p>
            <p><span className="text-gray-500">Nombre:</span> {employee.employee_lastname || ''} {employee.employee_name || ''}</p>
            <p><span className="text-gray-500">Genero:</span> {employee.gender_label || '-'}</p>
            <p><span className="text-gray-500">Telefono:</span> {employee.phone || '-'}</p>
            <p><span className="text-gray-500">Nacimiento:</span> {formatDate(employee.birth_date)}</p>
            <p><span className="text-gray-500">Usuario:</span> {employee.user_display_name || employee.user_email || '-'}</p>
          </div>
          <div className="rounded-lg border p-4 space-y-2">
            <p className="font-semibold">Empleado Empresa</p>
            <p><span className="text-gray-500">Empresa:</span> {employeeCompany.company_name || '-'}</p>
            <p><span className="text-gray-500">Perfil:</span> {employeeCompany.employee_profile_name || '-'}</p>
            <p><span className="text-gray-500">Cargo:</span> {employeeCompany.job_title_name || '-'}</p>
            <p><span className="text-gray-500">Departamento / Area:</span> {employeeCompany.department_name || '-'} / {employeeCompany.area_name || '-'}</p>
            <p><span className="text-gray-500">Localizacion:</span> {employeeCompany.work_location_name || '-'}</p>
            <p><span className="text-gray-500">Provincia / Canton:</span> {employeeCompany.state_label || '-'} / {employeeCompany.city_label || '-'}</p>
            <p><span className="text-gray-500">Fecha Ingreso:</span> {formatDate(employeeCompany.hire_date)}</p>
            <p><span className="text-gray-500">Trabaja Feriados:</span> {employeeCompany.work_on_holidays ? 'Si' : 'No'}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Modulo 2: 10 marcaciones mas recientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentPunches.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin marcaciones recientes.</p>
            ) : recentPunches.map((row) => (
              <div key={row.id} className="rounded-md border px-3 py-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{row.movement_label || `Movimiento ${row.punch_key}`}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(row.punch_datetime)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${statusPillClass(row.time_punch_status_key)}`}>
                  {row.time_punch_status_label || '-'}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modulo 3: Turnos semana actual (Semana {week.iso_week || '-'}-{week.iso_year || '-'})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {weekDays.map((day) => (
              <div key={day.date} className="rounded-md border px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{day.weekday_label}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(day.date)}</span>
                </div>
                {day.shift ? (
                  <p className="text-sm mt-1">
                    <span className="font-medium">{day.shift.effective_shift_name || day.shift.planned_shift_name || '-'}</span>
                    <span className="text-muted-foreground"> · {formatShiftTime(day.shift.effective_start_time)} · {day.shift.effective_work_minutes ?? 0} min</span>
                  </p>
                ) : (
                  <p className="text-sm mt-1 text-muted-foreground">Sin turno</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Modulo 4: Solicitudes de justificaciones y permisos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin solicitudes registradas.</p>
            ) : requests.map((row) => (
              <div key={row.id} className="rounded-md border px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{row.justification_name || row.event_name || 'Solicitud'}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusPillClass(row.request_status_key)}`}>
                    {row.request_status_label || '-'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{formatDateTime(row.start_datetime)} - {formatDateTime(row.end_datetime)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modulo 5: Feriados aplicables del mes en curso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {holidays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay feriados aplicables este mes.</p>
            ) : holidays.map((row) => (
              <div key={`${row.id}-${row.holiday_date}`} className="rounded-md border px-3 py-2">
                <p className="text-sm font-medium">{row.holiday_name || '-'}</p>
                <p className="text-xs text-muted-foreground">{formatDate(row.holiday_date)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
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
    </div>
  );
}

export function Dashboard() {
  const { profile, session } = useAuth();
  const { menuScreens } = usePermissions();

  const isEmployee = profile?.role_key === 'EMPLOYEE';

  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [employeePayload, setEmployeePayload] = useState<any>(null);

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
        const resp = await fetch('http://localhost:3001/dashboard/employee-summary', {
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

  const stats = [
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bienvenido, {profile?.display_name}</h1>
        <p className="text-gray-600">Sistema Enterprise de Control de Asistencias y Turnos de Trabajo</p>
      </div>

      <RoleInfo roleKey={profile?.role_key} />

      {isEmployee ? (
        employeeLoading ? (
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Cargando informacion del empleado...</p></CardContent></Card>
        ) : employeeError ? (
          <Card><CardContent className="pt-6"><p className="text-sm text-red-600">{employeeError}</p></CardContent></Card>
        ) : (
          <EmployeeHome payload={employeePayload} />
        )
      ) : (
        <>
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
        </>
      )}

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
    </div>
  );
}
