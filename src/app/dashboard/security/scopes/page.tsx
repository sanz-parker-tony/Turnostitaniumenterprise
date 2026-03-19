/**
 * Security > Scopes
 * Gestión de alcances de acceso
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function SecurityScopesPage() {
  return (
    <ScreenPageShell
      screenKey="SEC_SCOPES"
      title="Scopes"
      description="Gestión de alcances de acceso (empresas, departamentos, etc.)"
    >
      <UnderConstruction
        screenName="Gestión de Scopes"
        screenKey="SEC_SCOPES"
        description="Esta pantalla permitirá definir y gestionar los tipos de alcance (scope_types) que determinan el nivel de acceso a datos: SYSTEM (todo), TENANT (tenant completo), COMPANY (empresa), DEPARTMENT (departamento), etc."
      />
    </ScreenPageShell>
  );
}