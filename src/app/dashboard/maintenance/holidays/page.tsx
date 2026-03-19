/**
 * Maintenance > Holidays
 * Gestión de feriados
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function MaintenanceHolidaysPage() {
  return (
    <ScreenPageShell
      screenKey="MAINT_HOLIDAYS"
      title="Feriados"
      description="Gestión de feriados y días no laborables"
    >
      <UnderConstruction
        screenName="Gestión de Feriados"
        screenKey="MAINT_HOLIDAYS"
        description="Esta pantalla permitirá administrar el calendario de feriados y días no laborables por país/región, definiendo fechas, tipos (nacional, local, flotante), y si aplican pago doble o descanso compensatorio."
      />
    </ScreenPageShell>
  );
}