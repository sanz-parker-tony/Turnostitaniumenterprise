/**
 * EmployeeProfilesManagement - Gestion de Perfiles de Empleado
 * Pantalla ORG para TENANT_ADMIN
 */

'use client';

import { OrgMaintenance } from './OrgMaintenance';

export function EmployeeProfilesManagement() {
  return (
    <OrgMaintenance
      initialEntity="employee-profiles"
      hideEntityTabs
      pageTitle="Perfiles de Empleado"
      pageDescription="Gestion de perfiles de empleados del tenant"
    />
  );
}

