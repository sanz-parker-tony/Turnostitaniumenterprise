/**
 * Maintenance > Justification Types
 * Gestión de tipos de justificación
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function MaintenanceJustificationTypesPage() {
  return (
    <ScreenPageShell
      screenKey="MAINT_JUSTIFICATIONS"
      title="Tipos de Justificación"
      description="Gestión de tipos de justificación de inasistencias"
    >
      <UnderConstruction
        screenName="Tipos de Justificación"
        screenKey="MAINT_JUSTIFICATIONS"
        description="Esta pantalla permitirá configurar los tipos de justificaciones válidas para ausencias: enfermedad, cita médica, trámite personal, emergencia familiar, etc., con sus códigos y reglas de aplicación."
      />
    </ScreenPageShell>
  );
}