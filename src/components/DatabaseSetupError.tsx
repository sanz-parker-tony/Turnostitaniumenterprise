/**
 * DatabaseSetupError - Mensaje de error cuando falta ejecutar migraciones
 */

import { AlertTriangle, Database, FileCode, ArrowRight } from 'lucide-react';

export function DatabaseSetupError() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-red-100 rounded-lg">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Base de Datos No Configurada
            </h1>
            <p className="text-sm text-slate-600">
              Se requiere ejecutar las migraciones SQL
            </p>
          </div>
        </div>

        {/* Error Description */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800 font-medium mb-2">
            ❌ Error: Tenant SYSTEM no encontrado
          </p>
          <p className="text-sm text-red-700">
            La base de datos está vacía o no se han ejecutado las migraciones de inicialización.
          </p>
        </div>

        {/* Instructions */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Instrucciones de Configuración
            </h2>
            
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">
                    Abrir Supabase SQL Editor
                  </h3>
                  <p className="text-sm text-slate-600">
                    Ve a tu proyecto en Supabase Dashboard → SQL Editor
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">
                    Ejecutar Migración SEED
                  </h3>
                  <p className="text-sm text-slate-600 mb-2">
                    Copiar y ejecutar el archivo de migración:
                  </p>
                  <div className="bg-slate-900 text-slate-100 px-4 py-3 rounded font-mono text-sm">
                    /supabase/migrations/002_SEED_COMPLETE.sql
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">
                    Verificar Instalación
                  </h3>
                  <p className="text-sm text-slate-600 mb-2">
                    Ejecutar esta query para verificar:
                  </p>
                  <div className="bg-slate-900 text-slate-100 px-4 py-3 rounded font-mono text-xs overflow-x-auto">
                    SELECT COUNT(*) FROM tenants WHERE tenant_key = 'SYSTEM';
                  </div>
                  <p className="text-sm text-slate-600 mt-2">
                    Resultado esperado: <span className="font-semibold text-green-600">1</span>
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">
                    Refrescar Aplicación
                  </h3>
                  <p className="text-sm text-slate-600">
                    Presiona <kbd className="px-2 py-1 bg-slate-200 rounded text-xs font-mono">F5</kbd> para recargar la página
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Credentials Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              🔐 Credenciales Iniciales
            </h3>
            <div className="space-y-1 text-sm">
              <p className="text-blue-800">
                <span className="font-semibold">Email:</span> system.admin@titanium-labs.com
              </p>
              <p className="text-blue-800">
                <span className="font-semibold">Password:</span> Titanium2026!
              </p>
              <p className="text-xs text-blue-600 mt-2">
                ⚠️ Deberás cambiar la contraseña en el primer login
              </p>
            </div>
          </div>

          {/* Documentation Link */}
          <div className="border-t pt-4">
            <a
              href="/SETUP_DATABASE.md"
              target="_blank"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <FileCode className="w-4 h-4" />
              Ver documentación completa
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center">
          <p className="text-sm text-slate-500">
            Turnos Titanium Enterprise - Configuración Inicial
          </p>
        </div>
      </div>
    </div>
  );
}
