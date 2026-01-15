/**
 * Config > Parameters
 * Parámetros generales del sistema
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';

export default function ConfigParametersPage() {
  return (
    <ScreenPageShell
      screenKey="CONF_PARAMS"
      title="Parámetros Generales"
      description="Configuración de parámetros del sistema"
    />
  );
}
