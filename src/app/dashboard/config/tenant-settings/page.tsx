/**
 * Config > Tenant Settings - SYSTEM_ADMIN Home
 * Configuración del tenant
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';

export default function ConfigTenantSettingsPage() {
  return (
    <ScreenPageShell
      screenKey="CONF_TENANT_SETTINGS"
      title="Configuración del Tenant"
      description="Configuración general del tenant"
    />
  );
}
