/**
 * Security > Login Sessions
 * Gestión de sesiones activas
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';

export default function SecurityLoginSessionsPage() {
  return (
    <ScreenPageShell
      screenKey="SEC_LOGIN_SESSIONS"
      title="Sesiones Activas"
      description="Gestión y monitoreo de sesiones de usuario"
    />
  );
}
