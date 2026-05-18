'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import SecurityUserEmployeeAccessManagement from '@/components/screens/security/SecurityUserEmployeeAccessManagement';

export default function SecurityUserEmployeeAccessPage() {
  return (
    <ScreenPageShell
      screenKey="SEC_USER_EMPLOYEE_ACCESS"
      title="Acceso empleados"
      description="Gestiona el listado de empleados autorizados por usuario objetivo"
    >
      <SecurityUserEmployeeAccessManagement />
    </ScreenPageShell>
  );
}
