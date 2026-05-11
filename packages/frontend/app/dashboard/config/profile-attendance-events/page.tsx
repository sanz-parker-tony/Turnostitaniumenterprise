/**
 * Config > Novedades por Perfil
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import { ProfileAttendanceEventsManagement } from '@/components/screens/config/ProfileAttendanceEventsManagement';

export default function ConfigProfileAttendanceEventsPage() {
  return (
    <ScreenPageShell
      screenKey="CONF_PROFILE_ATT_EVENTS"
      title="Novedades por Perfil"
      description="Asigna novedades de asistencia a perfiles de empleado"
    >
      <ProfileAttendanceEventsManagement />
    </ScreenPageShell>
  );
}
