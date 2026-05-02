/**
 * Config > Shift Constructor
 * Constructor unificado de turnos
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import { ShiftConstructorManagement } from '@/components/screens/config/ShiftConstructorManagement';

export default function ConfigShiftConstructorPage() {
  return (
    <ScreenPageShell
      screenKey="SHIFT_CONSTRUCTOR_MANAGEMENT"
      title="Constructor de Turnos"
      description="Gestión unificada de turnos desde el constructor"
    >
      <ShiftConstructorManagement />
    </ScreenPageShell>
  );
}
