/**
 * Maintenance > Messages
 * Gestión de mensajes del sistema
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function MaintenanceMessagesPage() {
  return (
    <ScreenPageShell
      screenKey="MAINT_MESSAGES"
      title="Mensajes"
      description="Gestión de mensajes y notificaciones del sistema"
    >
      <UnderConstruction
        screenName="Gestión de Mensajes"
        screenKey="MAINT_MESSAGES"
        description="Esta pantalla permitirá administrar los mensajes (message_keys) y sus traducciones multiidioma del sistema, usados para etiquetas, validaciones, notificaciones y textos de interfaz."
      />
    </ScreenPageShell>
  );
}