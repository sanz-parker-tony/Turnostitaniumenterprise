/**
 * Organization > Companies
 * Gestión de empresas
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function OrgCompaniesPage() {
  return (
    <ScreenPageShell
      screenKey="ORG_STRUCTURE"
      title="Estructura Organizacional"
      description="Gestión de la estructura organizacional completa"
    >
      <UnderConstruction
        screenName="Estructura Organizacional"
        screenKey="ORG_STRUCTURE"
        description="Esta pantalla mostrará una vista jerárquica completa de la organización: empresas, departamentos, áreas, centros de costos, localidades, grupos de nómina y puestos de trabajo."
      />
    </ScreenPageShell>
  );
}