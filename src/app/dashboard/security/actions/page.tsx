/**
 * Security > Actions
 * Gestión de acciones del sistema
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';

export default function SecurityActionsPage() {
  return (
    <ScreenPageShell
      screenKey="SEC_ACTIONS"
      title="Acciones"
      description="Gestión de acciones disponibles en el sistema"
    />
  );
}
