/**
 * UnderConstruction - Componente para pantallas pendientes de implementación
 * Muestra un mensaje elegante cuando una pantalla no está lista
 */

'use client';

import { Construction, AlertCircle, ArrowLeft, Home } from 'lucide-react';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';

interface UnderConstructionProps {
  screenName?: string;
  screenKey?: string;
  description?: string;
  estimatedDate?: string;
}

export default function UnderConstruction({
  screenName = 'Esta pantalla',
  screenKey,
  description,
  estimatedDate,
}: UnderConstructionProps) {
  const router = useRouter();

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Card principal */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden">
          {/* Header con gradiente */}
          <div className="bg-gradient-to-r from-[#0074D9] to-[#2ECC71] p-8 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                <Construction className="w-12 h-12" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Pantalla en Construcción</h1>
                <p className="text-white/90 mt-1">Próximamente disponible</p>
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-8 space-y-6">
            {/* Información de la pantalla */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    {screenName}
                  </h2>
                  {screenKey && (
                    <p className="text-sm font-mono text-gray-600 mb-2">
                      {screenKey}
                    </p>
                  )}
                  <p className="text-gray-700">
                    {description || 'Esta funcionalidad está actualmente en desarrollo y estará disponible próximamente.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Estado del desarrollo */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Estado del Desarrollo
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-[#0074D9] to-[#2ECC71] h-full rounded-full animate-pulse"
                    style={{ width: '35%' }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-600">35%</span>
              </div>
            </div>

            {/* Características planificadas */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Características Planificadas
              </h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-[#0074D9]" />
                  <span>Interfaz de usuario completa y responsive</span>
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-[#0074D9]" />
                  <span>Operaciones CRUD con validación completa</span>
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-[#0074D9]" />
                  <span>Control de permisos basado en roles</span>
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-[#0074D9]" />
                  <span>Exportación de datos y reportes</span>
                </li>
              </ul>
            </div>

            {/* Fecha estimada */}
            {estimatedDate && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-green-700">Fecha estimada de lanzamiento:</span>{' '}
                  {estimatedDate}
                </p>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Regresar
              </Button>
              <Button
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-[#0074D9] hover:bg-[#0056A3]"
              >
                <Home className="w-4 h-4 mr-2" />
                Ir al Dashboard
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-8 py-4">
            <p className="text-sm text-gray-600 text-center">
              ¿Necesita esta funcionalidad con urgencia?{' '}
              <a href="mailto:soporte@titanium-labs.com" className="text-[#0074D9] hover:underline font-medium">
                Contáctenos
              </a>
            </p>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Turnos Titanium Enterprise • Sistema en Construcción
          </p>
        </div>
      </div>
    </div>
  );
}
