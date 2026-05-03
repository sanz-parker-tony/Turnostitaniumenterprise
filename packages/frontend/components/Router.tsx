/**
 * Router - Sistema de routing dinámico basado en permisos
 * Lee las pantallas desde PermissionsContext y renderiza la correcta
 */

'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '../contexts/PermissionsContext';
import { Dashboard } from './Dashboard';

// Importar todas las pantallas
import { CatalogManagement } from './screens/maintenance/CatalogManagement';
import { AttendanceEventsManagement } from './screens/maintenance/AttendanceEventsManagement';
import { SystemSettingsManagement } from './screens/maintenance/SystemSettingsManagement';
import { RolesManagement } from './screens/maintenance/RolesManagement';
import { ScopeTypesManagement } from './screens/maintenance/ScopeTypesManagement';
import { UsersManagement } from './screens/maintenance/UsersManagement';
import { SystemSettingsAdmin } from './screens/config/SystemSettingsAdmin';
import { TenantSettings } from './screens/config/TenantSettings';
import { ShiftConstructorManagement } from './screens/config/ShiftConstructorManagement';
import { CalendarManagement } from './screens/config/CalendarManagement';
import { DeviceManagement } from './screens/config/DeviceManagement';
import { PayrollIntegration } from './screens/config/PayrollIntegration';
import { WorkPatternsManagement } from './screens/config/WorkPatternsManagement';
import { OrgStructure } from './screens/org/OrgStructure';
import { OrgMaintenance } from './screens/org/OrgMaintenance';
import { EmployeeCompaniesManagement } from './screens/org/EmployeeCompaniesManagement';
import { EmployeeProfilesManagement } from './screens/org/EmployeeProfilesManagement';
import { EmployeeShiftPlanningManagement } from './screens/employees/EmployeeShiftPlanningManagement';
import { TimePunchesManagement } from './screens/attendance/TimePunchesManagement';
import TenantsManagement from './security/TenantsManagement';
import { MenuGroupsManagement } from './screens/security/MenuGroupsManagement';
import { ScreensManagement } from './screens/security/ScreensManagement';
import { ActionsManagement } from './screens/security/ActionsManagement';
import { ScreenActionsManagement } from './screens/security/ScreenActionsManagement';
import { RoleScreenActionsManagement } from './screens/security/RoleScreenActionsManagement';

export function Router() {
  const { menuScreens, isLoading, getFirstAvailableScreen } = usePermissions();
  const [currentPath, setCurrentPath] = useState('');

  // Detectar cambios de ruta
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Ruta inicial
      setCurrentPath(window.location.pathname);
      
      // Escuchar cambios de ruta
      const handleRouteChange = () => {
        setCurrentPath(window.location.pathname);
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

    // ── Configuración ──────────────────────────────────────────────────────
    '/dashboard/config/tenant-settings': <TenantSettings />,
    '/dashboard/config/shifts':          <ShiftConstructorManagement />,
    '/dashboard/config/shift-constructor': <ShiftConstructorManagement />,
    '/dashboard/config/calendars':       <CalendarManagement />,
    '/dashboard/config/devices':         <DeviceManagement />,
    '/dashboard/config/payroll':         <PayrollIntegration />,
    '/dashboard/config/work-patterns':   <WorkPatternsManagement />,

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
    '/dashboard/attendance/shifts': <EmployeeShiftPlanningManagement />,
    '/dashboard/attendance/timeclock': <TimePunchesManagement />,
    '/dashboard/attendance/time-punches': <TimePunchesManagement />,

    // ── Seguridad ──────────────────────────────────────────────────────────────
    '/dashboard/security/tenants':              <TenantsManagement />,
    '/dashboard/security/roles':               <RolesManagement />,
    '/dashboard/security/scopes':              <ScopeTypesManagement />,
    '/dashboard/security/tenant-members':      <UsersManagement />,
    '/dashboard/security/menu-groups':         <MenuGroupsManagement />,
    '/dashboard/security/screens':             <ScreensManagement />,
    '/dashboard/security/actions':             <ActionsManagement />,
    '/dashboard/security/screen-actions':      <ScreenActionsManagement />,
    '/dashboard/security/role-screen-actions': <RoleScreenActionsManagement />,
  };

  // Si la ruta existe en el mapa, renderizarla
  if (routeMap[currentPath]) {
    console.log('✅ Renderizando componente para:', currentPath);
    return routeMap[currentPath];
  }

  // Si no encuentra la ruta, mostrar dashboard por defecto
  console.log('📊 Ruta no encontrada, renderizando Dashboard por defecto');
  return <Dashboard />;
}
