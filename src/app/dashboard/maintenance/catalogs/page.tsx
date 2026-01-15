/**
 * Maintenance > Catalogs
 * Gestión de catálogos del sistema
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';

export default function MaintenanceCatalogsPage() {
  return (
    <ScreenPageShell
      screenKey="MAINT_CATALOGS"
      title="Catálogos"
      description="Gestión de catálogos y lookups del sistema"
    />
  );
}
