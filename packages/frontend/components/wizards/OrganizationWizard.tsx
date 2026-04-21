/**
 * OrganizationWizard.tsx
 * Wizard de 3 pasos para configuración organizacional
 * Ejecuta: TENANT_ADMIN
 * Ubicación: Menú ORGANIZATION → Asistente de Configuración
 */

import { useState } from 'react';
import { X, Building2, Network, Users } from 'lucide-react';

interface OrganizationWizardProps {
  onClose: () => void;
  onComplete?: () => void;
}

export default function OrganizationWizard({ onClose, onComplete }: OrganizationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    { id: 1, name: 'Empresa', icon: Building2 },
    { id: 2, name: 'Organización', icon: Network },
    { id: 3, name: 'Empleados', icon: Users }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Asistente de Configuración Organizacional</h2>
            <p className="text-sm text-gray-600 mt-1">Configure su empresa, estructura y empleados</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex flex-col items-center ${step.id <= currentStep ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step.id === currentStep 
                      ? 'bg-blue-600 text-white' 
                      : step.id < currentStep 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs mt-1 font-medium">{step.name}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-24 h-0.5 mx-4 ${step.id < currentStep ? 'bg-green-600' : 'bg-gray-300'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {currentStep === 1 && (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 mx-auto text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Paso 1: Configurar Empresa</h3>
                <p className="text-gray-600">Componente WizardStepCompany irá aquí</p>
              </div>
            )}
            {currentStep === 2 && (
              <div className="text-center py-12">
                <Network className="w-16 h-16 mx-auto text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Paso 2: Estructura Organizacional</h3>
                <p className="text-gray-600">Componente WizardStepStructure irá aquí</p>
              </div>
            )}
            {currentStep === 3 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Paso 3: Empleados</h3>
                <p className="text-gray-600">Componente WizardStepEmployees irá aquí</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Atrás
          </button>
          <div className="text-sm text-gray-600">
            Paso {currentStep} de {steps.length}
          </div>
          <button
            onClick={() => {
              if (currentStep === steps.length) {
                onComplete?.();
                onClose();
              } else {
                setCurrentStep(currentStep + 1);
              }
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            {currentStep === steps.length ? 'Finalizar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}
