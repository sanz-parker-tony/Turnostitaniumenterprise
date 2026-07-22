/**
 * KIOSK Layout - Layout específico para módulo EMPLOYEE
 * Validación de rol EMPLOYEE + layout propio (modo terminal)
 */

'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import logoTurnos from 'figma:asset/17ccf6801f7c83b8bea74fbd52400e5b6ac4d64a.png';

export default function KioskLayout({ children }: { children: ReactNode }) {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  const isEmployeeSelfService = profile?.is_employee_self_service === true;

  useEffect(() => {
    // Redirect si no hay sesión
    if (!isLoading && !user) {
      console.warn('[KIOSK] Usuario no autenticado, redirect /login');
      router.push('/login');
      return;
    }

    if (!isLoading && profile && !isEmployeeSelfService) {
      console.warn('[KIOSK] El perfil no tiene habilitado el autoservicio, redirect /dashboard');
      router.push('/dashboard');
    }
  }, [user, profile, isEmployeeSelfService, isLoading, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="inline-block size-12 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-300">Cargando...</p>
        </div>
      </div>
    );
  }

  // Sin acceso
  if (!isEmployeeSelfService) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center max-w-md bg-gray-800 p-8 rounded-lg">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-white">Acceso Restringido</h2>
          <p className="text-gray-300 mb-6">
            El módulo KIOSK está disponible solo para empleados.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0074D9] text-white rounded-lg hover:bg-[#0056A3] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Layout KIOSK (modo terminal)
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header KIOSK */}
      <header className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoTurnos} alt="Turnos Titanium Logo" className="w-10 h-10 rounded-xl shadow-md" />
            <div>
              <h1 className="text-xl font-bold text-white">KIOSK - Autoservicio</h1>
              <p className="text-sm text-gray-400">Portal de Empleado</p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Dashboard
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}
