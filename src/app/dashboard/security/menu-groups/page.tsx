/**
 * Security > Menu Groups
 * Gestión de grupos de menú
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function SecurityMenuGroupsPage() {
  return (
    <ScreenPageShell
      screenKey="SEC_MENU_GROUPS"
      title="Grupos de Menú"
      description="Gestión de grupos de menú del sistema"
    >
      <UnderConstruction
        screenName="Gestión de Grupos de Menú"
        screenKey="SEC_MENU_GROUPS"
        description="Esta pantalla permitirá crear y modificar los grupos de menú del sistema (SECURITY, MAINTENANCE, CONFIG, etc.), configurando su nombre, icono, orden de visualización y descripción."
      />
    </ScreenPageShell>
  );
}