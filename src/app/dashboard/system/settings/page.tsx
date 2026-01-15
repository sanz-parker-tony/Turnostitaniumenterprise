/**
 * /dashboard/system/settings - Configuración General
 * 
 * Configuraciones generales del sistema
 * Acceso: SOLO SYSTEM_ADMIN
 */

'use client';

import { ArrowLeft, Settings } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/system"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="size-4" />
          Volver a Configuración del Sistema
        </Link>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Settings className="size-5 text-gray-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Configuración General
          </h1>
        </div>
        <p className="text-gray-600">
          Parámetros del sistema y preferencias
        </p>
      </div>

      {/* Placeholder */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
        <Settings className="size-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Próximamente
        </h2>
        <p className="text-gray-600 max-w-md mx-auto">
          La configuración general del sistema estará disponible próximamente.
        </p>
      </div>
    </div>
  );
}
