/**
 * Config > Calendars
 * Gestión de calendarios laborales
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function ConfigCalendarsPage() {
  return (
    <ScreenPageShell
      screenKey="CALENDAR_MANAGEMENT"
      title="Calendarios Laborales"
      description="Gestión de calendarios y días laborables"
    >
      <UnderConstruction
        screenName="Gestión de Calendarios Laborales"
        screenKey="CALENDAR_MANAGEMENT"
        description="Esta pantalla permitirá configurar calendarios laborales: definir semanas laborales, días de descanso, feriados por país/región, calendarios personalizados por empresa o departamento."
      />
    </ScreenPageShell>
  );
}
