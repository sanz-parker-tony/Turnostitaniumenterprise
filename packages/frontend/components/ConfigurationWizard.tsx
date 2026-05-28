/**
 * ConfigurationWizard.tsx - Turnos Titanium Enterprise
 * Wizard de Activación Inicial del Sistema (BLOQUEANTE - Ejecución Única)
 * 
 * REGLAS:
 * - NO permite navegación fuera del wizard hasta completar
 * - Stepper es SOLO INDICADOR (no clickeable)
 * - Navegación secuencial: solo "Guardar y continuar" / "Volver atrás"
 * - Cada paso persiste en BD antes de avanzar
 * - Controlado por tenant_onboarding.current_step
 */

import { buildApiUrl } from '../utils/api-config';
import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import logoTurnos from 'figma:asset/17ccf6801f7c83b8bea74fbd52400e5b6ac4d64a.png';
import { projectId, publicApiToken } from '../utils/backend/info';
import WizardStepTenant from './wizard/WizardStepTenant';
import WizardStepCompany from './wizard/WizardStepCompany';
import WizardStepStructure from './wizard/WizardStepStructure';
import WizardStepEmployees from './wizard/WizardStepEmployees';
import WizardStepAdminUser from './wizard/WizardStepAdminUser';

type StepStatus = 'completed' | 'active' | 'locked';

interface WizardStep {
  id: number;
  key: string;
  name: string;
  status: StepStatus;
  isOneTime?: boolean;
}

interface ConfigurationWizardProps {
  onComplete?: () => void; // ✅ Hacer opcional
}

export default function ConfigurationWizard({ onComplete }: ConfigurationWizardProps) {
  const [steps, setSteps] = useState<WizardStep[]>([
    { id: 1, key: 'tenant', name: 'Tenant', status: 'active', isOneTime: true },
    { id: 2, key: 'company', name: 'Empresa', status: 'locked' },
    { id: 3, key: 'structure', name: 'Estructura', status: 'locked' },
    { id: 4, key: 'employees', name: 'Empleados', status: 'locked' },
    { id: 5, key: 'administrator', name: 'Administrador', status: 'locked' }
  ]);

  const [currentStepId, setCurrentStepId] = useState(1);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const [adminCredentials, setAdminCredentials] = useState<{ email: string; username: string } | null>(null);

  // Mapeo de pasos del backend a IDs del wizard
  const stepKeyToId: Record<string, number> = {
    'TENANT': 1,
    'COMPANY': 2,
    'STRUCTURE': 3,
    'EMPLOYEES': 4,
    'ADMINISTRATOR': 5,
    'ADMIN': 5 // ✅ COMPATIBILIDAD: Aceptar 'ADMIN' como alias de 'ADMINISTRATOR'
  };

  // Cargar estado del wizard desde el backend
  useEffect(() => {
    loadWizardStateFromBackend();
  }, []);

  const loadWizardStateFromBackend = async () => {
    setIsLoadingState(true);
    try {
      console.log('📊 Cargando estado del wizard desde backend...');
      
      // ✅ SIMPLIFICADO: Solo intentar cargar el estado, sin auto-redirect
      const response = await fetch(
        buildApiUrl(`/bootstrap/wizard-state`),
        {
          headers: {
            'Authorization': `Bearer ${publicApiToken}`
          }
        }
      ).catch(() => null);

      // Si falla, empezar desde el principio
      if (!response || !response.ok) {
        console.log('⚠️ No se pudo cargar estado, empezando desde paso 1');
        setIsLoadingState(false);
        return;
      }

      const data = await response.json().catch(() => ({ currentStep: 'TENANT', completedSteps: [] }));
      console.log('✅ Estado del wizard obtenido:', data);

      // Convertir current_step del backend a stepId
      const currentStepKey = data.currentStep || 'TENANT';
      const newCurrentStepId = stepKeyToId[currentStepKey] || 1;
      const completedSteps = data.completedSteps || [];

      console.log(`📍 Paso actual: ${currentStepKey} (ID: ${newCurrentStepId})`);
      console.log('✅ Pasos completados:', completedSteps);

      // Actualizar estados de los pasos
      const updatedSteps = steps.map(step => {
        const stepKey = step.key.toUpperCase();
        
        if (completedSteps.includes(stepKey)) {
          return { ...step, status: 'completed' as StepStatus };
        } else if (step.id === newCurrentStepId) {
          return { ...step, status: 'active' as StepStatus };
        } else if (step.id < newCurrentStepId) {
          return { ...step, status: 'completed' as StepStatus };
        } else {
          return { ...step, status: 'locked' as StepStatus };
        }
      });

      console.log('📋 Steps actualizados desde backend:', updatedSteps);

      setSteps(updatedSteps);
      setCurrentStepId(newCurrentStepId);
      
      // Guardar también en localStorage como respaldo
      saveWizardState(updatedSteps, newCurrentStepId);

    } catch (error: any) {
      console.error('❌ Error cargando estado del wizard:', error);
      
      // Fallback: intentar cargar desde localStorage
      console.log('⚠️ Fallback: intentando cargar desde localStorage...');
      const savedState = localStorage.getItem('turnosTitanium_wizardState');
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          setSteps(parsed.steps);
          setCurrentStepId(parsed.currentStepId);
          console.log('✅ Estado cargado desde localStorage (fallback)');
        } catch (localStorageError) {
          console.error('❌ Error en fallback de localStorage:', localStorageError);
        }
      }
    } finally {
      setIsLoadingState(false);
    }
  };

  // Guardar estado del wizard
  const saveWizardState = (updatedSteps: WizardStep[], currentId: number) => {
    const state = {
      steps: updatedSteps,
      currentStepId: currentId
    };
    localStorage.setItem('turnosTitanium_wizardState', JSON.stringify(state));
  };

  const handleStepComplete = async (stepId: number, data?: any) => {
    console.log(`✅ Paso ${stepId} completado, avanzando...`);
    console.log('📊 Data recibida:', data);
    console.log('📋 Steps actuales:', steps);
    console.log('🔢 currentStepId actual:', currentStepId);
    
    const updatedSteps = steps.map(step => {
      if (step.id === stepId) {
        return { ...step, status: 'completed' as StepStatus };
      }
      if (step.id === stepId + 1) {
        return { ...step, status: 'active' as StepStatus };
      }
      return step;
    });

    console.log('📋 Steps actualizados:', updatedSteps);

    setSteps(updatedSteps);

    if (stepId < steps.length) {
      const nextStepId = stepId + 1;
      console.log(`➡️ Cambiando a paso ${nextStepId}`);
      setCurrentStepId(nextStepId);
      saveWizardState(updatedSteps, nextStepId);
      console.log(`✅ Estado guardado, nuevo paso: ${nextStepId}`);
    } else {
      // ========================================
      // ÚLTIMO PASO (PASO 5) COMPLETADO
      // ========================================
      console.log('🎉 ¡Wizard completado! Usuario administrador creado');
      console.log('🔑 Email del admin:', data?.adminEmail);
      console.log('👤 Username del admin:', data?.adminUsername);
      
      // Guardar credenciales para mostrar en mensaje de finalización
      setAdminCredentials({
        email: data?.adminEmail || '',
        username: data?.adminUsername || ''
      });
      
      saveWizardState(updatedSteps, stepId);
      setShowCompletionMessage(true);
      
      // Marcar setup como completado en backend
      const tenantId = localStorage.getItem('turnosTitanium_tenantId');
      if (tenantId) {
        try {
          console.log('📡 Marcando setup como completado en backend...');
          const response = await fetch(
            buildApiUrl(`/setup/complete`),
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicApiToken}`
              },
              body: JSON.stringify({ tenant_id: tenantId })
            }
          );

          const result = await response.json();
          
          if (result.ok) {
            console.log('✅ Setup marcado como completado en backend');
          } else {
            console.error('⚠️ Error al marcar setup como completado:', result.error);
          }
        } catch (error) {
          console.error('⚠️ Error llamando a /setup/complete:', error);
          // No bloqueamos el flujo si falla esto
        }
      }
      
      // Limpiar datos del wizard y redirigir al login
      setTimeout(() => {
        localStorage.setItem('turnosTitanium_wizardCompleted', 'true');
        localStorage.removeItem('turnosTitanium_wizardState');
        localStorage.removeItem('bootstrapToken'); // Ya no es necesario
        console.log('✅ Wizard marcado como completado, redirigiendo a login...');
        onComplete?.(); // ✅ Llamar solo si onComplete está definido
        
        // ✅ Fallback: si no hay onComplete, redirigir directamente
        if (!onComplete) {
          window.location.href = '/login?setup=completed';
        }
      }, 5000); // 5 segundos para que el usuario lea las credenciales
    }
  };

  // ELIMINADO: handleCompleteLater - el wizard es BLOQUEANTE

  const handleGoBack = () => {
    if (currentStepId > 1) {
      console.log(`⬅️ Volviendo del paso ${currentStepId} al paso ${currentStepId - 1}`);
      
      const prevStepId = currentStepId - 1;
      
      // Marcar el paso anterior como activo
      const updatedSteps = steps.map(step => {
        if (step.id === prevStepId) {
          return { ...step, status: 'active' as StepStatus };
        }
        if (step.id === currentStepId) {
          // El paso actual mantiene su estado de completado si lo estaba
          const wasCompleted = step.status === 'completed';
          return { ...step, status: (wasCompleted ? 'completed' : 'locked') as StepStatus };
        }
        return step;
      });

      setSteps(updatedSteps);
      setCurrentStepId(prevStepId);
      saveWizardState(updatedSteps, prevStepId);
    }
  };

  const currentStep = steps.find(s => s.id === currentStepId);

  console.log('🎯 Renderizando wizard - currentStepId:', currentStepId);
  console.log('🎯 currentStep:', currentStep);

  const renderStepContent = () => {
    console.log('🎨 Renderizando contenido para step:', currentStep?.key);
    
    switch (currentStep?.key) {
      case 'tenant':
        console.log('🏢 Renderizando WizardStepTenant');
        return (
          <WizardStepTenant 
            onComplete={(data) => handleStepComplete(1, data)}
            onGoBack={undefined} // Paso 1 no tiene volver atrás
          />
        );
      case 'company':
        console.log('🏭 Renderizando WizardStepCompany');
        return (
          <WizardStepCompany 
            onComplete={(data) => handleStepComplete(2, data)}
            onGoBack={handleGoBack}
          />
        );
      case 'structure':
        console.log('🏗️ Renderizando WizardStepStructure');
        return (
          <WizardStepStructure 
            onComplete={(data) => handleStepComplete(3, data)}
            onGoBack={handleGoBack}
          />
        );
      case 'employees':
        console.log('👥 Renderizando WizardStepEmployees');
        return (
          <WizardStepEmployees 
            onComplete={(data) => handleStepComplete(4, data)}
            onGoBack={handleGoBack}
          />
        );
      case 'administrator':
        console.log('👤 Renderizando WizardStepAdminUser');
        return (
          <WizardStepAdminUser 
            onComplete={(data) => handleStepComplete(5, data)}
            onGoBack={handleGoBack}
          />
        );
      default:
        console.log('❌ No se encontró step para key:', currentStep?.key);
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      {isLoadingState ? (
        /* Pantalla de carga mientras obtiene el estado */
        <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-16 text-center">
          <div className="flex justify-center mb-6">
            <img 
              src={logoTurnos} 
              alt="Turnos Titanium" 
              className="w-16 h-16 rounded-xl shadow-md"
            />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Cargando estado del wizard...
          </h2>
          <div className="inline-flex items-center gap-3 text-sm text-gray-500">
            <div className="w-5 h-5 border-2 border-[#0074D9] border-t-transparent rounded-full animate-spin"></div>
            Obteniendo información del sistema...
          </div>
        </div>
      ) : (
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg">
        {/* Header Corporativo */}
        <div className="text-center pt-12 pb-8 border-b border-gray-200">
          <div className="flex justify-center mb-4">
            <img 
              src={logoTurnos} 
              alt="Turnos Titanium" 
              className="w-16 h-16 rounded-xl shadow-md"
            />
          </div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Turnos Titanium Enterprise
          </h1>
          <p className="text-base text-gray-600">
            {showCompletionMessage ? '✓ Activación completada' : 'Activación inicial del sistema'}
          </p>
        </div>

        {!showCompletionMessage ? (
          <>
            {/* Barra de Pasos Horizontal - SOLO INDICADOR (no clickeable) */}
            <div className="px-12 py-8 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                  const isCompleted = step.status === 'completed';
                  const isActive = step.status === 'active';
                  const isLocked = step.status === 'locked';

                  return (
                    <div key={step.id} className="flex items-center flex-1">
                      {/* Step Circle - NO CLICKEABLE */}
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`
                            w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold mb-2 transition-all
                            ${isCompleted ? 'bg-green-600 text-white' : ''}
                            ${isActive ? 'bg-[#0074D9] text-white shadow-md ring-4 ring-blue-100' : ''}
                            ${isLocked ? 'bg-gray-200 text-gray-400 border-2 border-gray-300' : ''}
                          `}
                        >
                          {isCompleted ? '✓' : isLocked ? <Lock className="w-4 h-4" /> : step.id}
                        </div>
                        <span
                          className={`text-xs font-medium text-center ${
                            isActive ? 'text-gray-900 font-semibold' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                          }`}
                        >
                          {step.name}
                        </span>
                      </div>

                      {/* Connector Line */}
                      {index < steps.length - 1 && (
                        <div 
                          className={`flex-1 h-px mx-2 mb-6 ${
                            isCompleted ? 'bg-green-600' : 'bg-gray-300'
                          }`} 
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contenido del Paso Activo */}
            <div className="px-12 py-8">
              {renderStepContent()}
            </div>
          </>
        ) : (
          /* Mensaje de Finalización */
          <div className="px-12 py-16 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              ✅ Sistema Activado Exitosamente
            </h2>
            
            <p className="text-base text-gray-600 mb-2 max-w-2xl mx-auto">
              El usuario administrador ha sido creado correctamente.
            </p>

            {/* Credenciales de acceso */}
            {adminCredentials && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6 mb-4 max-w-2xl mx-auto">
                <p className="text-sm font-semibold text-green-900 mb-3">
                  🔑 Credenciales de Acceso
                </p>
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-700 w-24">Usuario:</span>
                    <code className="bg-white px-3 py-1 rounded border border-green-300 text-gray-900 font-mono">
                      {adminCredentials.username || adminCredentials.email}
                    </code>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-700 w-24">Email:</span>
                    <code className="bg-white px-3 py-1 rounded border border-green-300 text-gray-900 font-mono">
                      {adminCredentials.email}
                    </code>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 mb-4 max-w-2xl mx-auto text-left">
              <p className="text-sm text-blue-900">
                <strong className="font-semibold">Próximos pasos:</strong>
              </p>
              <ul className="mt-2 space-y-1 ml-4 list-disc text-sm text-blue-800">
                <li>Inicie sesión con las credenciales mostradas arriba</li>
                <li>Cree usuarios adicionales con diferentes roles</li>
                <li>Registre más empleados según sea necesario</li>
                <li>Configure turnos y horarios de trabajo</li>
              </ul>
            </div>
            
            <p className="text-sm text-gray-500 max-w-2xl mx-auto mt-4">
              Será redirigido al inicio de sesión en unos momentos...
            </p>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                <div className="w-5 h-5 border-2 border-[#2ECC71] border-t-transparent rounded-full animate-spin"></div>
                Finalizando configuración...
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
