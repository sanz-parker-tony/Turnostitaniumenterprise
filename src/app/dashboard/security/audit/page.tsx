/**
 * Security > Audit
 * Auditoría de acciones del sistema
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';

export default function SecurityAuditPage() {
  return (
    <ScreenPageShell
      screenKey="SEC_AUDIT"
      title="Auditoría"
      description="Registro de acciones y cambios en el sistema"
    />
  );
}
