/**
 * Security > Screen Actions
 * Asignación de acciones a pantallas
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function SecurityScreenActionsPage() {
  return (
    <ScreenPageShell
      screenKey="SEC_SCREEN_ACTIONS"
      title="Acciones por Pantalla"
      description="Asignación de acciones disponibles por pantalla"
    >
      <UnderConstruction
        screenName="Acciones por Pantalla"
        screenKey="SEC_SCREEN_ACTIONS"
        description="Esta pantalla permitirá definir qué acciones (CREATE, READ, UPDATE, DELETE, EXPORT, IMPORT, etc.) están disponibles en cada pantalla del sistema, configurando las relaciones de la tabla screen_actions."
      />
    </ScreenPageShell>
  );
}