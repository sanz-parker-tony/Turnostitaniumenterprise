/**
 * Employees > List
 * Listado y gestión de empleados
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';

export default function EmployeesListPage() {
  return (
    <ScreenPageShell
      screenKey="EMPL_LIST"
      title="Empleados"
      description="Gestión de empleados del sistema"
    />
  );
}
