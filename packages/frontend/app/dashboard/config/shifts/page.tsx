/**
 * Config > Shifts
 * Gestión de turnos de trabajo
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function ConfigShiftsPage() {
  return (
    <ScreenPageShell
      screenKey="SCHEDULE_MANAGEMENT"
      title="Horarios y Turnos"
      description="Gestión de horarios y turnos de trabajo"
    >
      <UnderConstruction
        screenName="Gestión de Horarios y Turnos"
        screenKey="SCHEDULE_MANAGEMENT"
        description="Esta pantalla permitirá crear y configurar los horarios de trabajo: turnos rotativos, turnos fijos, horarios flexibles, tolerancias de entrada/salida, breaks, comidas, y horas extras."
      />
    </ScreenPageShell>
  );
}