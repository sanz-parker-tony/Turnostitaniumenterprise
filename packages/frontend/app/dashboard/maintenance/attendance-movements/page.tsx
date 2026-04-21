/**
 * Maintenance > Attendance Movements
 * Gestión de tipos de movimientos de asistencia
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function MaintenanceAttendanceMovementsPage() {
  return (
    <ScreenPageShell
      screenKey="MAINT_ATT_MOVEMENTS"
      title="Movimientos de Asistencia"
      description="Gestión de tipos de movimientos de asistencia"
    >
      <UnderConstruction
        screenName="Movimientos de Asistencia"
        screenKey="MAINT_ATT_MOVEMENTS"
        description="Esta pantalla permitirá gestionar los tipos de movimientos que afectan las asistencias: ajustes, correcciones, justificaciones, ausencias, permisos, incapacidades, vacaciones, etc."
      />
    </ScreenPageShell>
  );
}