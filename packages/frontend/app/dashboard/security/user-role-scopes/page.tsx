'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import SecurityUserScopesManagement from '@/components/screens/security/SecurityUserScopesManagement';

export default function SecurityUserRoleScopesPage() {
  return (
    <ScreenPageShell
      screenKey="SEC_USER_ROLE_SCOPES"
      title="Alcances por usuario"
      description="Asigna alcances organizacionales para roles SUPERVISOR y RRHH_ADMIN"
    >
      <SecurityUserScopesManagement />
    </ScreenPageShell>
  );
}
