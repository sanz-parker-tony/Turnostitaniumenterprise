/**
 * Security > Role Permissions
 * Asignación de permisos a roles
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function SecurityRolePermissionsPage() {
  return (
    <ScreenPageShell
      screenKey="SEC_ROLE_PERMS"
      title="Permisos por Rol"
      description="Asignación de permisos a roles del sistema"
    >
      <UnderConstruction
        screenName="Asignación de Permisos a Roles"
        screenKey="SEC_ROLE_PERMS"
        description="Esta interfaz permitirá configurar qué pantallas y acciones (CREATE, READ, UPDATE, DELETE, EXPORT) tiene acceso cada rol, con una matriz visual para facilitar la configuración masiva."
      />
    </ScreenPageShell>
  );
}