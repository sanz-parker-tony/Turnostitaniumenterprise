/**
 * Config > Payroll Integration
 * Integración con sistema de nómina
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function ConfigPayrollPage() {
  return (
    <ScreenPageShell
      screenKey="PAYROLL_INTEGRATION"
      title="Integración con Nómina"
      description="Configuración de integración con sistemas de nómina"
    >
      <UnderConstruction
        screenName="Integración con Nómina"
        screenKey="PAYROLL_INTEGRATION"
        description="Esta pantalla permitirá configurar la integración con sistemas externos de nómina: mapeo de campos, formatos de exportación, credenciales API, pruebas de conexión y sincronización automática."
      />
    </ScreenPageShell>
  );
}
