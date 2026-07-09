/**
 * Router - Sistema de routing dinámico basado en permisos
 * Lee las pantallas desde PermissionsContext y renderiza la correcta
 */

'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '../contexts/PermissionsContext';
import { useAuth } from '../contexts/AuthContext';
import { Dashboard } from './Dashboard';
import { Construction, Wrench, ArrowLeft } from 'lucide-react';

// Importar todas las pantallas
import { CatalogManagement } from './screens/maintenance/CatalogManagement';
import { AttendanceEventsManagement } from './screens/maintenance/AttendanceEventsManagement';
import { SystemSettingsManagement } from './screens/maintenance/SystemSettingsManagement';
import { RolesManagement } from './screens/maintenance/RolesManagement';
import { ScopeTypesManagement } from './screens/maintenance/ScopeTypesManagement';
import { UsersManagement } from './screens/maintenance/UsersManagement';
import { MigrationDiagnosticManagement } from './screens/maintenance/MigrationDiagnosticManagement';
import { SystemSettingsAdmin } from './screens/config/SystemSettingsAdmin';
import { TenantSettings } from './screens/config/TenantSettings';
import { ShiftConstructorManagement } from './screens/config/ShiftConstructorManagement';
import { CalendarManagement } from './screens/config/CalendarManagement';
import { DeviceManagement } from './screens/config/DeviceManagement';
import { PayrollIntegration } from './screens/config/PayrollIntegration';
import { WorkPatternsManagement } from './screens/config/WorkPatternsManagement';
import { ProfileAttendanceEventsManagement } from './screens/config/ProfileAttendanceEventsManagement';
import { OrgStructure } from './screens/org/OrgStructure';
import { OrgMaintenance } from './screens/org/OrgMaintenance';
import { EmployeeCompaniesManagement } from './screens/org/EmployeeCompaniesManagement';
import { EmployeeProfilesManagement } from './screens/org/EmployeeProfilesManagement';
import { EmployeeShiftPlanningManagement } from './screens/employees/EmployeeShiftPlanningManagement';
import { TimePunchesManagement } from './screens/attendance/TimePunchesManagement';
import ShiftChangeApprovalsManagement from './screens/attendance/ShiftChangeApprovalsManagement';
import TenantsManagement from './security/TenantsManagement';
import SystemLanguagesAdmin from './admin/SystemLanguagesAdmin';
import SecurityAuthorizationCatalog from './screens/security/SecurityAuthorizationCatalog';
import { ScreenActionsManagement } from './screens/security/ScreenActionsManagement';
import { RoleScreenActionsManagement } from './screens/security/RoleScreenActionsManagement';
import SubscriptionPlansManagement from './screens/security/SubscriptionPlansManagement';
import SecurityUserScopesManagement from './screens/security/SecurityUserScopesManagement';
import SecurityUserEmployeeAccessManagement from './screens/security/SecurityUserEmployeeAccessManagement';
import SecurityRolePermissionsManagement from './screens/security/SecurityRolePermissionsManagement';
import MessageKeysManagement from './screens/security/MessageKeysManagement';
import TranslationsManagement from './screens/security/TranslationsManagement';
import SystemReportsManagement from './screens/security/SystemReportsManagement';
import KioskPunch from './kiosk/KioskPunch';
import KioskPunchHistory from './kiosk/KioskPunchHistory';
import KioskRequests from './kiosk/KioskRequests';
import KioskShiftChange from './kiosk/KioskShiftChange';
import KioskTimePunchRequests from './kiosk/KioskTimePunchRequests';
import RequestsApprovalsManagement from './screens/attendance/RequestsApprovalsManagement';
import TimePunchChangeApprovalsManagement from './screens/attendance/TimePunchChangeApprovalsManagement';
import EmployeeRouteTrackingReport from './screens/reports/EmployeeRouteTrackingReport';
import EmployeeOvertimeReports from './screens/reports/EmployeeOvertimeReports';
import EmployeeAnomalyReports from './screens/reports/EmployeeAnomalyReports';

function InvalidRouteFallback({ path }: { path: string }) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Ruta no encontrada</h1>
        <p className="mt-2 text-sm text-gray-600">
          La ruta solicitada no esta registrada en el router de la aplicacion.
        </p>
        <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700">
          {path || '/'}
        </p>
        <button
          onClick={() => {
            window.history.replaceState({}, '', '/dashboard');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Dashboard
        </button>
      </div>
    </div>
  );
}

export function Router() {
  const { menuScreens, isLoading } = usePermissions();
  const { profile } = useAuth();
  const [currentPath, setCurrentPath] = useState('');
  const roleKey = String(profile?.role_key || '').trim().toUpperCase();
  const isApprovalRole = roleKey === 'SUPERVISOR' || roleKey === 'RRHH_ADMIN' || roleKey === 'RHADMIN';

  const normalizePath = (path: string) => {
    if (!path) return '';
    if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
    return path;
  };

  // Detectar cambios de ruta
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Ruta inicial
      setCurrentPath(normalizePath(window.location.pathname));
      
      // Escuchar cambios de ruta
      const handleRouteChange = () => {
        setCurrentPath(normalizePath(window.location.pathname));
      };
      
      window.addEventListener('popstate', handleRouteChange);
      return () => window.removeEventListener('popstate', handleRouteChange);
    }
  }, []);

  // ✅ Redirigir a dashboard si la ruta es raíz (DENTRO DE useEffect)
  useEffect(() => {
    if (currentPath === '/' || currentPath === '') {
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/dashboard');
        setCurrentPath('/dashboard');
      }
    }
  }, [currentPath]);

  // Mientras carga los permisos
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando permisos...</p>
        </div>
      </div>
    );
  }

  // Si no hay pantallas disponibles (no debería pasar)
  if (menuScreens.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No tienes permisos para acceder a ninguna pantalla.</p>
          <p className="text-sm text-muted-foreground mt-2">Contacta al administrador del sistema.</p>
        </div>
      </div>
    );
  }

  console.log('🔀 Ruta actual:', currentPath);

  // Mapeo de rutas a componentes
  const routeMap: Record<string, JSX.Element> = {
    '/dashboard': <Dashboard />,

    // ── Mantenimiento ──────────────────────────────────────────────────────
    '/dashboard/maintenance/parameters':      <SystemSettingsManagement />,
    '/dashboard/maintenance/catalogs':        <CatalogManagement />,
    '/dashboard/maintenance/attendance-events': <AttendanceEventsManagement />,
    '/dashboard/maintenance/roles':           <RolesManagement />,
    '/dashboard/maintenance/scopes':          <ScopeTypesManagement />,
    '/dashboard/maintenance/users':           <UsersManagement />,
    '/dashboard/maintenance/diagnostic':      <MigrationDiagnosticManagement />,

    // ── Configuración ──────────────────────────────────────────────────────
    '/dashboard/config/tenant-settings': <TenantSettings />,
    '/dashboard/config/shifts':          <ShiftConstructorManagement />,
    '/dashboard/config/shift-constructor': <ShiftConstructorManagement />,
    '/dashboard/config/calendars':       <CalendarManagement />,
    '/dashboard/config/devices':         <DeviceManagement />,
    '/dashboard/config/payroll':         <PayrollIntegration />,
    '/dashboard/config/work-patterns':   <WorkPatternsManagement />,
    '/dashboard/config/profile-attendance-events': <ProfileAttendanceEventsManagement />,

    // ── Organización ───────────────────────────────────────────────────────
    '/dashboard/org/structure': <OrgStructure />,
    '/dashboard/org/companies': <OrgMaintenance initialEntity="companies" hideEntityTabs pageTitle="Empresas" pageDescription="Gestión de empresas del tenant" />,
    '/dashboard/org/work-locations': <OrgMaintenance initialEntity="work-locations" hideEntityTabs pageTitle="Localizaciones" pageDescription="Gestión de localizaciones de trabajo" />,
    '/dashboard/org/departments': <OrgMaintenance initialEntity="departments" hideEntityTabs pageTitle="Departamentos" pageDescription="Gestión de departamentos organizacionales" />,
    '/dashboard/org/areas': <OrgMaintenance initialEntity="areas" hideEntityTabs pageTitle="Áreas" pageDescription="Gestión de áreas organizacionales" />,
    '/dashboard/org/work-groups': <OrgMaintenance initialEntity="work-groups" hideEntityTabs pageTitle="Grupos de Trabajo" pageDescription="Gestión de grupos de trabajo" />,
    '/dashboard/org/payroll-groups': <OrgMaintenance initialEntity="payroll-groups" hideEntityTabs pageTitle="Grupos de Nómina" pageDescription="Gestión de grupos de nómina" />,
    '/dashboard/org/job-titles': <OrgMaintenance initialEntity="job-titles" hideEntityTabs pageTitle="Cargos" pageDescription="Gestión de cargos organizacionales" />,
    '/dashboard/org/cost-centers': <OrgMaintenance initialEntity="cost-centers" hideEntityTabs pageTitle="Centros de Costo" pageDescription="Gestión de centros de costo" />,
    '/dashboard/org/employee-profiles': <EmployeeProfilesManagement />,
    '/dashboard/org/employee-companies': <EmployeeCompaniesManagement />,

    // ── Empleados ────────────────────────────────────────────────────────────
    '/dashboard/employees/shift-planning': <EmployeeShiftPlanningManagement />,
    '/dashboard/employees/shift-change-approvals': <ShiftChangeApprovalsManagement />,
    '/dashboard/employees/manage': isApprovalRole ? <TimePunchChangeApprovalsManagement /> : <TimePunchesManagement />,
    '/dashboard/employees/requests': <RequestsApprovalsManagement />,
    '/dashboard/employees/time-punch-change-approvals': <TimePunchChangeApprovalsManagement />,
    '/dashboard/attendance/shifts': <EmployeeShiftPlanningManagement />,
    '/dashboard/attendance/timeclock': <TimePunchesManagement />,
    '/dashboard/attendance/time-punches': <TimePunchesManagement />,
    '/dashboard/attendance/approvals': <RequestsApprovalsManagement />,
    '/dashboard/reports/attendance': <EmployeeOvertimeReports />,
    '/dashboard/reports/route-tracking': <EmployeeRouteTrackingReport />,
    '/dashboard/reports/overtime': <EmployeeOvertimeReports />,
    '/dashboard/reports/anomalies': <EmployeeAnomalyReports />,

    // ── Kiosko ───────────────────────────────────────────────────────────────
    '/dashboard/kiosk/timeclock': <KioskPunch />,
    '/dashboard/kiosk/attendance': <KioskPunchHistory />,
    '/dashboard/kiosk/requests': <KioskRequests />,
    '/dashboard/kiosk/shift-change': <KioskShiftChange />,
    '/dashboard/kiosk/time-punch-requests': <KioskTimePunchRequests />,
    '/kiosk/punch': <KioskPunch />,
    '/kiosk/timeclock': <KioskPunch />,
    '/kiosk/timelclock': <KioskPunch />,
    '/kiosk/attendance': <KioskPunchHistory />,
    '/kiosk/my-punches': <KioskPunchHistory />,
    '/kiosk/requests': <KioskRequests />,
    '/kiosk/shift-change': <KioskShiftChange />,
    '/kiosk/time-punch-requests': <KioskTimePunchRequests />,

    // ── Seguridad ──────────────────────────────────────────────────────────────
    '/dashboard/security/tenants':              <TenantsManagement />,
    '/dashboard/security/languages':            <SystemLanguagesAdmin />,
    '/dashboard/security/roles':               <RolesManagement />,
    '/dashboard/security/scopes':              <ScopeTypesManagement />,
    '/dashboard/security/tenant-members':      <UsersManagement />,
    '/dashboard/security/menu-groups':         <SecurityAuthorizationCatalog />,
    '/dashboard/security/screens':             <SecurityAuthorizationCatalog />,
    '/dashboard/security/actions':             <SecurityAuthorizationCatalog />,
    '/dashboard/security/screen-actions':      <ScreenActionsManagement />,
    '/dashboard/security/role-screen-actions': <RoleScreenActionsManagement />,
    '/dashboard/security/role-permissions':    <SecurityRolePermissionsManagement />,
    '/dashboard/security/subscription-plans':  <SubscriptionPlansManagement />,
    '/dashboard/security/user-role-scopes':    <SecurityUserScopesManagement />,
    '/dashboard/security/user-employee-access': <SecurityUserEmployeeAccessManagement />,
    '/dashboard/security/message-keys':        <MessageKeysManagement />,
    '/dashboard/security/messages':            <MessageKeysManagement />,
    '/dashboard/security/translations':        <TranslationsManagement />,
    '/dashboard/security/system-reports':      <SystemReportsManagement />,
  };

  const screenComponentMap: Record<string, JSX.Element> = {
    OVERTIME_REPORTS: <EmployeeOvertimeReports />,
    ATTENDANCE_ANOMALY_REPORTS: <EmployeeAnomalyReports />,
    ROUTE_TRACKING_REPORT: <EmployeeRouteTrackingReport />,
  };

  const menuScreen = menuScreens.find((screen) => normalizePath(screen.route_path) === currentPath);
  const configuredComponent = menuScreen ? screenComponentMap[menuScreen.screen_key] : null;
  const isShellRoute = currentPath === '/dashboard';
  const isKioskRoute = currentPath === '/kiosk/punch' || currentPath === '/kiosk/timeclock';
  const isConfiguredRoute = Boolean(menuScreen);

  if (configuredComponent) {
    console.log('âœ… Renderizando componente configurado para:', menuScreen?.screen_key);
    return configuredComponent;
  }

  // Si la ruta existe en el mapa, renderizarla
  if (routeMap[currentPath] && (isConfiguredRoute || isShellRoute || isKioskRoute)) {
    console.log('✅ Renderizando componente para:', currentPath);
    return routeMap[currentPath];
  }

  // Si la ruta existe en permisos pero no tiene componente implementado
  if (menuScreen) {
    return (
      <div className="min-h-[520px] w-full flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Construction className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pantalla en construcción</h1>
              <p className="text-sm text-gray-500">Esta opción de menú está habilitada, pero su vista aún no está implementada.</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Nombre</p>
              <p className="text-sm font-semibold text-gray-900">{menuScreen.screen_name}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Clave</p>
              <p className="text-sm font-mono text-gray-900">{menuScreen.screen_key}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-gray-500">Ruta</p>
              <p className="text-sm font-mono text-gray-900">{menuScreen.route_path}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-gray-600">
            <Wrench className="w-4 h-4 text-amber-600" />
            Solicita al equipo técnico implementar el componente de esta pantalla en el router.
          </div>

          <div className="mt-6">
            <button
              onClick={() => {
                window.history.pushState({}, '', '/dashboard');
                setCurrentPath('/dashboard');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
  return <InvalidRouteFallback path={currentPath} />;
}
