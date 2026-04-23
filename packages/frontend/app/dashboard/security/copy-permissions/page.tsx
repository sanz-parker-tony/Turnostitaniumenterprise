/**
 * Security > Copy Permissions
 * Copiar permisos entre usuarios
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function SecurityCopyPermissionsPage() {
  return (
    <ScreenPageShell
      screenKey="SEC_COPY_PERMS"
      title="Copiar Permisos"
      description="Herramienta para copiar permisos entre usuarios"
    >
      <UnderConstruction
        screenName="Copiar Permisos de Usuario"
        screenKey="SEC_COPY_PERMS"
        description="Esta utilidad permitirá copiar rápidamente todos los roles y permisos de un usuario a otro(s), ideal para configurar nuevos empleados con perfiles similares."
      />
    </ScreenPageShell>
  );
}