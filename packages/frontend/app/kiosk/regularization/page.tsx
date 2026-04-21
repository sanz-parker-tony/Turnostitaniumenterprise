/**
 * /kiosk/regularization - Regularización de Marcaciones
 * Ruta protegida (requiere autenticación previa desde /kiosk/punch)
 */

'use client';

import KioskRegularization from '@/components/kiosk/KioskRegularization';

export default function KioskRegularizationPage() {
  return <KioskRegularization />;
}
