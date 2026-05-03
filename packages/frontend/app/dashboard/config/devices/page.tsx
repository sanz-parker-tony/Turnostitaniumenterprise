/**
 * Config > Devices
 * Gestión de dispositivos de marcación
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import { DeviceManagement } from '@/components/screens/config/DeviceManagement';

export default function ConfigDevicesPage() {
  return (
    <ScreenPageShell
      screenKey="DEVICE_MANAGEMENT"
      title="Gestión de Dispositivos"
      description="Administra los dispositivos de marcación (tablets, kioscos)"
    >
      <DeviceManagement />
    </ScreenPageShell>
  );
}

