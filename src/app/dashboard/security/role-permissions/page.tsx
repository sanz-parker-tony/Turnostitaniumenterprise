/**
 * Security > Role Permissions
 * Asignación de permisos a roles
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';

export default function SecurityRolePermissionsPage() {
  return (
    <ScreenPageShell
      screenKey="SEC_ROLE_PERMS"
      title="Permisos por Rol"
      description="Asignación de permisos a roles del sistema"
    />
  );
}
