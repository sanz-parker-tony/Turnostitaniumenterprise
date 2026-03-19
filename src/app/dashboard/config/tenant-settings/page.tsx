/**
 * Config > Tenant Settings - SYSTEM_ADMIN Home
 * Configuración del tenant
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function ConfigTenantSettingsPage() {
  return (
    <ScreenPageShell
      screenKey="TENANT_SETTINGS"
      title="Configuración del Tenant"
      description="Configuración general del tenant"
    >
      <UnderConstruction
        screenName="Configuración del Tenant"
        screenKey="TENANT_SETTINGS"
        description="Esta pantalla permitirá configurar los datos generales del tenant: nombre, logo, información de contacto, zona horaria, moneda, y preferencias del sistema."
      />
    </ScreenPageShell>
  );
}