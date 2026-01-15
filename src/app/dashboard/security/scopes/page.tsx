/**
 * Security > Scopes
 * Gestión de alcances de acceso
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';

export default function SecurityScopesPage() {
  return (
    <ScreenPageShell
      screenKey="SEC_SCOPES"
      title="Scopes"
      description="Gestión de alcances de acceso (empresas, departamentos, etc.)"
    />
  );
}
