/**
 * Security > Audit
 * Auditoría de acciones del sistema
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function SecurityAuditPage() {
  return (
    <ScreenPageShell
      screenKey="SEC_AUDIT"
      title="Auditoría"
      description="Registro de acciones y cambios en el sistema"
    >
      <UnderConstruction
        screenName="Auditoría del Sistema"
        screenKey="SEC_AUDIT"
        description="Esta pantalla mostrará un log completo de todas las acciones realizadas en el sistema: creación, modificación y eliminación de registros, con información del usuario, fecha/hora, y detalles de los cambios."
      />
    </ScreenPageShell>
  );
}