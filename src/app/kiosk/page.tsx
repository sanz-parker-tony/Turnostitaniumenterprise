/**
 * /kiosk - Portal de Autoservicio para Empleados
 * Redirige automáticamente a /kiosk/punch
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function KioskPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/kiosk/punch');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="text-center">
        <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
        <p className="text-gray-700 text-lg">Cargando portal KIOSK...</p>
      </div>
    </div>
  );
}
