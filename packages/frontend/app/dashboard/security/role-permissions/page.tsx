/**
 * Security > Role Permissions
 * Asignación de permisos a roles
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import SecurityRolePermissionsManagement from '@/components/screens/security/SecurityRolePermissionsManagement';

export default function SecurityRolePermissionsPage() {
  return (
    <ScreenPageShell
      screenKey="SEC_ROLE_PERMS"
      title="Permisos por Rol"
      description="Autorizacion de roles sobre pantallas y acciones (TENANT_ADMIN)"
    >
      <SecurityRolePermissionsManagement />
    </ScreenPageShell>
  );
}
