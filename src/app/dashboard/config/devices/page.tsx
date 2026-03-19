/**
 * Config > Devices
 * Gestión de dispositivos de marcación
 */

'use client';

import ScreenPageShell from '@/components/ScreenPageShell';
import UnderConstruction from '@/components/UnderConstruction';

export default function ConfigDevicesPage() {
  return (
    <ScreenPageShell
      screenKey="DEVICE_MANAGEMENT"
      title="Dispositivos"
      description="Gestión de dispositivos de marcación"
    >
      <UnderConstruction
        screenName="Gestión de Dispositivos"
        screenKey="DEVICE_MANAGEMENT"
        description="Esta pantalla permitirá administrar los dispositivos de marcación: relojes checadores biométricos, tablets, terminales móviles, configuración de IP, sincronización y pruebas de conexión."
      />
    </ScreenPageShell>
  );
}