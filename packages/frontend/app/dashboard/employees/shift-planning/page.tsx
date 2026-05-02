'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import { EmployeeShiftPlanningManagement } from '@/components/screens/employees/EmployeeShiftPlanningManagement';

export default function EmployeesShiftPlanningPage() {
  return (
    <ScreenPageShell
      screenKey="EMPLOYEE_SHIFT_PLANNING"
      title="Planificación Turnos"
      description="Planificación de turnos por empleado"
    >
      <EmployeeShiftPlanningManagement />
    </ScreenPageShell>
  );
}
