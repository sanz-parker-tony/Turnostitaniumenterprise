/**
 * SystemInitialSetup.tsx - Turnos Titanium Enterprise
 * Pantalla inicial post-instalación On-Premise
 */

import { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Server, Database, Shield, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import logoTurnos from 'figma:asset/17ccf6801f7c83b8bea74fbd52400e5b6ac4d64a.png';

interface SystemInitialSetupProps {
  onStartConfiguration: () => void;
  onAccessAsAdmin: () => void;
}

export default function SystemInitialSetup({ onStartConfiguration, onAccessAsAdmin }: SystemInitialSetupProps) {
  useEffect(() => {
    console.log('🏁 SystemInitialSetup: Componente montado');
  }, []);

  const handleStartConfig = () => {
    console.log('🚀 SystemInitialSetup: Usuario hizo clic en "Iniciar configuración"');
    onStartConfiguration();
  };

  const handleAccessAdmin = () => {
    console.log('🔑 SystemInitialSetup: Usuario hizo clic en "Acceder como administrador"');
    onAccessAsAdmin();
  };

  const systemComponents = [
    { label: 'Instalación verificada', status: 'ok' as const, icon: CheckCircle2 },
    { label: 'Base de datos operativa', status: 'ok' as const, icon: Database },
    { label: 'Componentes del sistema activos', status: 'ok' as const, icon: Server },
    { label: 'Configuración inicial pendiente', status: 'pending' as const, icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Encabezado Institucional */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <img 
              src={logoTurnos} 
              alt="Turnos Titanium" 
              className="w-16 h-16 rounded-xl shadow-md" 
            />
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">
                Turnos Titanium
              </h1>
              <p className="text-base text-gray-600 mt-1">
                Plataforma Empresarial de Control de Asistencias y Turnos
              </p>
            </div>
          </div>
          
          {/* Información Contextual */}
          <div className="flex items-center gap-6 text-sm text-gray-500 ml-20">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Modalidad: On-Premise</span>
            </div>
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span>Estado: Configuración inicial pendiente</span>
            </div>
          </div>
        </div>

        {/* Bloque Principal: Estado del Sistema */}
        <Card className="border-2 mb-6">
          <CardContent className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Estado del sistema
            </h2>
            
            <div className="space-y-4 mb-8">
              {systemComponents.map((component, index) => {
                const Icon = component.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200"
                  >
                    <div className="flex-shrink-0">
                      {component.status === 'ok' ? (
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-green-700" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-amber-700" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-medium text-gray-900">
                        {component.label}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {component.status === 'ok' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                          Verificado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 border border-amber-200">
                          Requerido
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mensaje Informativo */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <p className="text-base text-gray-800 leading-relaxed">
                Para comenzar a operar, es necesario completar la configuración inicial del sistema.
                Este proceso lo guiará paso a paso y puede completarse ahora o más adelante.
              </p>
            </div>

            {/* Acciones Principales */}
            <div className="flex items-center gap-4">
              <Button
                onClick={handleStartConfig}
                size="lg"
                className="flex-1 bg-[#0074D9] hover:bg-[#0074D9]/90 text-white font-medium py-6 text-base"
              >
                Iniciar configuración del sistema
              </Button>
              <Button
                onClick={handleAccessAdmin}
                variant="outline"
                size="lg"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-6 text-base"
              >
                Acceder como administrador
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer Discreto */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Turnos Titanium Enterprise v2.5.1 · Instalación On-Premise
          </p>
          <p className="text-xs text-gray-400 mt-1">
            © 2025 Titanium-Labs Corp. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}