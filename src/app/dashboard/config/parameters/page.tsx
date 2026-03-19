/**
 * Config > Parameters
 * Parámetros generales del sistema
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function ConfigParametersPage() {
  return (
    <ScreenPageShell
      screenKey="CONF_PARAMS"
      title="Parámetros Generales"
      description="Configuración de parámetros del sistema"
    >
      <UnderConstruction
        screenName="Parámetros de Configuración"
        screenKey="CONF_PARAMS"
        description="Esta pantalla permitirá gestionar todos los parámetros configurables del sistema usando el catálogo SYSTEM, con jerarquía de prioridad: employee_profile > company > tenant."
      />
    </ScreenPageShell>
  );
}