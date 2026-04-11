/**
 * Config > Parameters
 * Parámetros generales del sistema — post-migración 003_SETTINGS_REFACTOR
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import { SystemSettingsAdmin } from '@/components/screens/config/SystemSettingsAdmin';

export default function ConfigParametersPage() {
  return (
    <ScreenPageShell
      screenKey="CONF_PARAMS"
      title="Parámetros de Configuración"
      description="Catálogo maestro de parámetros y gestión de overrides jerárquicos"
    >
      <SystemSettingsAdmin />
    </ScreenPageShell>
  );
}
