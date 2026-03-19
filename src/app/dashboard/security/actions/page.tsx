/**
 * Security > Actions
 * Gestión de acciones del sistema
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function SecurityActionsPage() {
  return (
    <ScreenPageShell
      screenKey="SEC_ACTIONS"
      title="Acciones"
      description="Gestión de acciones disponibles en el sistema"
    >
      <UnderConstruction
        screenName="Gestión de Acciones"
        screenKey="SEC_ACTIONS"
        description="Esta pantalla permitirá gestionar todas las acciones (CREATE, READ, UPDATE, DELETE, EXPORT, etc.) disponibles en el sistema para asignar a roles."
      />
    </ScreenPageShell>
  );
}