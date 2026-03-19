/**
 * Maintenance > Catalogs
 * Gestión de catálogos del sistema
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function MaintenanceCatalogsPage() {
  return (
    <ScreenPageShell
      screenKey="MAINT_CATALOGS"
      title="Catálogos"
      description="Gestión de catálogos y lookups del sistema"
    >
      <UnderConstruction
        screenName="Gestión de Catálogos"
        screenKey="MAINT_CATALOGS"
        description="Esta pantalla permitirá administrar todos los catálogos (lookup_groups) y sus valores (lookup_values) del sistema, incluyendo el catálogo especial SYSTEM para configuraciones."
      />
    </ScreenPageShell>
  );
}