/**
 * Security > Screen Actions
 * Asignación de acciones a pantallas
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';

export default function SecurityScreenActionsPage() {
  return (
    <ScreenPageShell
      screenKey="SEC_SCREEN_ACTIONS"
      title="Acciones por Pantalla"
      description="Asignación de acciones disponibles por pantalla"
    />
  );
}
