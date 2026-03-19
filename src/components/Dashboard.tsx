/**
 * Dashboard - Página principal del sistema
 * Muestra información relevante según el rol del usuario
 */

'use client';

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
  BarChart3
} from 'lucide-react';

// Componente para mostrar información por rol
const RoleInfo = ({ roleKey }: { roleKey: string | undefined }) => {
  const roleInfo: Record<string, { title: string; description: string; icon: any; color: string }> = {
    'SYSTEM_ADMIN': {
      title: 'Administrador del Sistema',
      description: 'Acceso completo a configuración de seguridad y administración del sistema',
      icon: Shield,
      color: 'text-red-600',
    },
    'TENANT_ADMIN': {
      title: 'Administrador de Tenant',
      description: 'Gestión de estructura organizacional, configuración y mantenimiento',
      icon: Settings,
      color: 'text-purple-600',
    },
    'RRHH_ADMIN': {
      title: 'Administrador de RRHH',
      description: 'Control de asistencias, reportes y gestión de empleados',
      icon: Users,
      color: 'text-blue-600',
    },
    'SUPERVISOR': {
      title: 'Supervisor',
      description: 'Visualización de asistencias y reportes de su área',
      icon: BarChart3,
      color: 'text-green-600',
    },
    'EMPLOYEE': {
      title: 'Empleado',
      description: 'Acceso al kiosco para registro de asistencia',
      icon: Clock,
      color: 'text-orange-600',
    },
  };

  const info = roleInfo[roleKey || ''] || roleInfo['EMPLOYEE'];
  const Icon = info.icon;

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
      <div className={`p-3 rounded-lg bg-gray-100`}>
        <Icon className={`h-8 w-8 ${info.color}`} />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-lg">{info.title}</h3>
        <p className="text-sm text-muted-foreground">{info.description}</p>
      </div>
    </div>
  );
};

export function Dashboard() {
  const { profile } = useAuth();
  const { menuScreens } = usePermissions();

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

  // Grupos de menú por rol
  const getMenuGroupsByRole = (roleKey: string | undefined) => {
    const menuMap: Record<string, string[]> = {
      'SYSTEM_ADMIN': ['SECURITY'],
      'TENANT_ADMIN': ['MAINT', 'CONFIG', 'ORG'],
      'RRHH_ADMIN': ['DASH', 'ATTENDANCE', 'REPORTS'],
      'SUPERVISOR': ['DASH', 'ATTENDANCE', 'REPORTS'],
      'EMPLOYEE': ['KIOSK'],
    };
    return menuMap[roleKey || ''] || [];
  };

  const expectedGroups = getMenuGroupsByRole(profile?.role_key);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bienvenido, {profile?.display_name}
        </h1>
        <p className="text-gray-600">
          Sistema Enterprise de Control de Asistencias y Turnos de Trabajo
        </p>
      </div>

      {/* Role Info */}
      <RoleInfo roleKey={profile?.role_key} />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Calendar/Schedule */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Turnos de la Semana
            </CardTitle>
            <CardDescription>
              Vista general de los turnos programados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <div className="text-center">
                <Calendar className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm">No hay turnos programados</p>
                <p className="text-xs mt-2">Los turnos aparecerán aquí una vez configurados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Actividad Reciente
            </CardTitle>
            <CardDescription>
              Últimas acciones en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">No hay actividad reciente</p>
                  <p className="text-xs mt-2">Las acciones del sistema aparecerán aquí</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle>Acceso Rápido a Pantallas</CardTitle>
          <CardDescription>
            Tienes acceso a {menuScreens.length} pantallas del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {menuScreens.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">No hay pantallas disponibles</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {menuScreens.slice(0, 8).map((screen) => (
                <button
                  key={screen.screen_key}
                  onClick={() => window.location.href = screen.route_path}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{screen.screen_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{screen.menu_group_name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Información del Sistema
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-blue-800">
                  <div>
                    <span className="font-medium">Usuario:</span> {profile?.email}
                  </div>
                  <div>
                    <span className="font-medium">Rol:</span> {profile?.role_name}
                  </div>
                  <div>
                    <span className="font-medium">Tenant:</span> {profile?.tenant_name}
                  </div>
                  <div>
                    <span className="font-medium">Pantallas:</span> {menuScreens.length}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-blue-900 font-medium mb-2">
                  Grupos de Menú Asignados:
                </p>
                <div className="flex flex-wrap gap-2">
                  {expectedGroups.map(group => (
                    <span key={group} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      {group}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-blue-900 font-medium mb-2">Roles en el Sistema:</p>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li><strong>SYSTEM_ADMIN:</strong> Acceso a SECURITY (configuración de seguridad y permisos)</li>
                  <li><strong>TENANT_ADMIN:</strong> Acceso a MAINT, CONFIG, ORG (estructura y configuración)</li>
                  <li><strong>RRHH_ADMIN / SUPERVISOR:</strong> Acceso a DASH, ATTENDANCE, REPORTS (operación diaria)</li>
                  <li><strong>EMPLOYEE:</strong> Acceso a KIOSK (marcaje y consultas personales)</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}