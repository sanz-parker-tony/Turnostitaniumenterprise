/**
 * Maintenance > Attendance Events
 * Gestión de eventos de asistencia
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function MaintenanceAttendanceEventsPage() {
  return (
    <ScreenPageShell
      screenKey="MAINT_ATT_EVENTS"
      title="Eventos de Asistencia"
      description="Gestión de eventos de asistencia"
    >
      <UnderConstruction
        screenName="Eventos de Asistencia"
        screenKey="MAINT_ATT_EVENTS"
        description="Esta pantalla permitirá definir y configurar los tipos de eventos de asistencia: entrada, salida, break, comida, etc., con sus códigos, descripciones y reglas de aplicación."
      />
    </ScreenPageShell>
  );
}