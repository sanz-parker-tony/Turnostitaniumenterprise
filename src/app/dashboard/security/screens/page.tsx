/**
 * Security > Screens
 * Gestión de pantallas del sistema
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function SecurityScreensPage() {
  return (
    <ScreenPageShell
      screenKey="SEC_SCREENS"
      title="Pantallas"
      description="Gestión de pantallas del sistema"
    >
      <UnderConstruction
        screenName="Gestión de Pantallas"
        screenKey="SEC_SCREENS"
        description="Esta pantalla permitirá administrar todas las pantallas del sistema: crear nuevas, modificar rutas, cambiar iconos, asignar a grupos de menú, y configurar el orden de visualización."
      />
    </ScreenPageShell>
  );
}