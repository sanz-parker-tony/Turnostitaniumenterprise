/**
 * Security > Login Sessions
 * Gestión de sesiones activas
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function SecurityLoginSessionsPage() {
  return (
    <ScreenPageShell
      screenKey="SEC_LOGIN_SESSIONS"
      title="Sesiones Activas"
      description="Gestión y monitoreo de sesiones de usuario"
    >
      <UnderConstruction
        screenName="Sesiones de Usuario Activas"
        screenKey="SEC_LOGIN_SESSIONS"
        description="Esta pantalla mostrará todas las sesiones activas del sistema, con información del usuario, IP, navegador, hora de login, y la capacidad de forzar el cierre de sesiones por seguridad."
      />
    </ScreenPageShell>
  );
}