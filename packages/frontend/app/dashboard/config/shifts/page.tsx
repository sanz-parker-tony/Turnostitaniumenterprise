/**
 * Config > Shifts
 * Gestión de turnos de trabajo
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import { ShiftManagement } from '@/components/screens/config/ShiftManagement';

export default function ConfigShiftsPage() {
  return (
    <ScreenPageShell
      screenKey="SCHEDULE_MANAGEMENT"
      title="Horarios y Turnos"
      description="Gestión de horarios y turnos de trabajo"
    >
      <ShiftManagement showHeader={false} />
    </ScreenPageShell>
  );
}
