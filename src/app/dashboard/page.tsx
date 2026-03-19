/**
 * Dashboard Principal - Home para TODOS los roles
 * Contenido dinámico según rol del usuario
 */

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import LayoutNew from '@/components/LayoutNewAppRouter';
import Link from 'next/link';
import { 
  Clock, AlertTriangle, Calendar, TrendingUp, Users, 
  Shield, Settings, FileText, CheckCircle, XCircle,
  ArrowRight, ClipboardList, FileCheck
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
      if (userRoles.includes('EMPLOYEE')) {
        setDashboardType('EMPLOYEE');
      } else if (userRoles.includes('TENANT_ADMIN')) {
        setDashboardType('TENANT_ADMIN');
      } else if (userRoles.includes('SYSTEM_ADMIN')) {
        setDashboardType('SYSTEM_ADMIN');
      } else if (userRoles.includes('RRHH_ADMIN')) {
        setDashboardType('RRHH_ADMIN');
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
            {dashboardType === 'RRHH_ADMIN' && 'Panel de RRHH - Gestión de personal y aprobaciones'}
            {dashboardType === 'SYSTEM_ADMIN' && 'Panel de Administración - Configuración del sistema'}
            {dashboardType === 'TENANT_ADMIN' && 'Panel de Administración - Gestión del tenant'}
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
        {dashboardType === 'TENANT_ADMIN' && <TenantAdminDashboard />}

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
  return (
    <div className="space-y-6">
      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<AlertTriangle className="w-6 h-6 text-amber-600" />}
          title="Inconsistencias"
          value="3"
          description="Pendientes por regularizar"
          color="amber"
        />
        <StatCard
          icon={<XCircle className="w-6 h-6 text-red-600" />}
          title="Inasistencias"
          value="2"
          description="Requieren justificación"
          color="red"
        />
        <StatCard
          icon={<Calendar className="w-6 h-6 text-blue-600" />}
          title="Turno Actual"
          value="Mañana"
          description="08:00 - 17:00"
          color="blue"
        />
        <StatCard
          icon={<Clock className="w-6 h-6 text-green-600" />}
          title="Última Marcación"
          value="08:15"
          description="Hoy - Entrada"
          color="green"
        />
      </div>

      {/* CTAs a KIOSK */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CTACard
          title="Marcación de Asistencia"
          description="Registra tu entrada o salida"
          icon={<Clock className="w-8 h-8 text-[#0074D9]" />}
          href="/kiosk/punch"
          buttonText="Ir a Marcación"
        />
        <CTACard
          title="Regularización"
          description="Corrige marcaciones inconsistentes"
          icon={<FileCheck className="w-8 h-8 text-amber-600" />}
          href="/kiosk/regularization"
          buttonText="Regularizar"
        />
        <CTACard
          title="Justificar Inasistencia"
          description="Justifica ausencias o llegadas tarde"
          icon={<ClipboardList className="w-8 h-8 text-red-600" />}
          href="/kiosk/justification"
          buttonText="Justificar"
        />
        <CTACard
          title="Solicitar Permiso"
          description="Solicita permisos o licencias"
          icon={<FileText className="w-8 h-8 text-purple-600" />}
          href="/kiosk/permission"
          buttonText="Solicitar"
        />
        <CTACard
          title="Cambio de Turno"
          description="Solicita cambios en tu horario"
          icon={<Calendar className="w-8 h-8 text-indigo-600" />}
          href="/kiosk/shift-change"
          buttonText="Solicitar Cambio"
        />
        <CTACard
          title="Mis Solicitudes"
          description="Ver estado de solicitudes"
          icon={<CheckCircle className="w-8 h-8 text-green-600" />}
          href="/kiosk/requests"
          buttonText="Ver Solicitudes"
        />
      </div>

      {/* Últimas Marcaciones */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Últimas Marcaciones</h2>
        <div className="space-y-3">
          {[
            { date: 'Hoy', time: '08:15', type: 'Entrada', status: 'success' },
            { date: 'Ayer', time: '17:30', type: 'Salida', status: 'success' },
            { date: 'Ayer', time: '08:05', type: 'Entrada', status: 'success' },
            { date: '10 Ene', time: '--:--', type: 'Sin marcar', status: 'error' },
          ].map((record, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  record.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-sm font-medium text-gray-900">{record.date}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">{record.time}</span>
                <span className={`text-sm font-medium ${
                  record.status === 'success' ? 'text-gray-900' : 'text-red-600'
                }`}>{record.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
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
          title="Anomalías"
          value="8"
          description="Requieren revisión"
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

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickAccessCard
          title="Aprobar Solicitudes"
          count={12}
          href="/dashboard/attendance/approvals"
        />
        <QuickAccessCard
          title="Revisar Anomalías"
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
          title="Logs de Auditoría"
          value="1,234"
          description="Eventos registrados"
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickAccessCard
          title="Configuración Tenant"
          href="/dashboard/config/tenant-settings"
        />
        <QuickAccessCard
          title="Dispositivos"
          href="/dashboard/config/devices"
        />
        <QuickAccessCard
          title="Auditoría"
          href="/dashboard/security/audit"
        />
      </div>
    </div>
  );
}

// ============================================================================
// TENANT_ADMIN DASHBOARD
// ============================================================================

function TenantAdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="w-6 h-6 text-blue-600" />}
          title="Usuarios Activos"
          value="45"
          description="Miembros del tenant"
          color="blue"
        />
        <StatCard
          icon={<Shield className="w-6 h-6 text-purple-600" />}
          title="Roles"
          value="8"
          description="Roles configurados"
          color="purple"
        />
        <StatCard
          icon={<Settings className="w-6 h-6 text-green-600" />}
          title="Pantallas"
          value="52"
          description="Screens disponibles"
          color="green"
        />
        <StatCard
          icon={<FileText className="w-6 h-6 text-amber-600" />}
          title="Eventos Audit"
          value="892"
          description="Esta semana"
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickAccessCard
          title="Usuarios Tenant"
          href="/dashboard/security/tenant-members"
        />
        <QuickAccessCard
          title="Roles y Permisos"
          href="/dashboard/security/roles"
        />
        <QuickAccessCard
          title="Auditoría"
          href="/dashboard/security/audit"
        />
      </div>
    </div>
  );
}

// ============================================================================
// DEFAULT DASHBOARD
// ============================================================================

function DefaultDashboard() {
  return (
    <div className="text-center py-12">
      <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard Principal</h2>
      <p className="text-gray-600">
        Usa el menú lateral para acceder a las funcionalidades del sistema
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
        Ir a módulo
        <ArrowRight className="w-4 h-4 ml-2" />
      </div>
    </Link>
  );
}