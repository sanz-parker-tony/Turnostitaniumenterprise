/**
 * OrganizationWizard.tsx
 * Wizard de 3 pasos para configuracion organizacional
 * Ejecuta: TENANT_ADMIN
 * Ubicacion: Menu ORGANIZATION -> Asistente de Configuracion
 */

import { useMemo, useState } from 'react';
import { X, Building2, Network, Users, CheckCircle2 } from 'lucide-react';
import WizardStepCompany from '../wizard/WizardStepCompany';
import WizardStepStructure from '../wizard/WizardStepStructure';
import WizardStepEmployees from '../wizard/WizardStepEmployees';

interface OrganizationWizardProps {
  onClose: () => void;
  onComplete?: () => void;
}

export default function OrganizationWizard({ onClose, onComplete }: OrganizationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = useMemo(() => [
    { id: 1, name: 'Empresa', icon: Building2 },
    { id: 2, name: 'Estructura', icon: Network },
    { id: 3, name: 'Empleados', icon: Users }
  ], []);

  const markStepAsCompleted = (stepId: number) => {
    setCompletedSteps((prev) => {
      if (prev.includes(stepId)) {
        return prev;
      }
      return [...prev, stepId];
    });
  };

  const handleStepComplete = (stepId: number) => {
    markStepAsCompleted(stepId);
    if (stepId < steps.length) {
      setCurrentStep(stepId + 1);
      return;
    }

    onComplete?.();
    onClose();
  };

  const handleGoBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const isStepCompleted = (stepId: number) => completedSteps.includes(stepId);

  return (
    <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-slate-200">
        <div className="px-8 py-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Asistente de Configuracion Organizacional</h2>
            <p className="text-sm text-slate-600 mt-1">
              Configure empresa, localizacion y jerarquia organizacional
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-8 py-5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex flex-col items-center ${step.id <= currentStep ? 'text-[#0F4C81]' : 'text-slate-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step.id === currentStep
                      ? 'bg-[#0F4C81] text-white'
                      : isStepCompleted(step.id)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                  }`}>
                    {isStepCompleted(step.id) ? <CheckCircle2 className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                  </div>
                  <span className="text-xs mt-1 font-medium">{step.name}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-24 h-0.5 mx-4 ${isStepCompleted(step.id) ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
          <div className="max-w-4xl mx-auto">
            {currentStep === 1 && (
              <WizardStepCompany
                mode="organization"
                onComplete={() => handleStepComplete(1)}
              />
            )}

            {currentStep === 2 && (
              <WizardStepStructure
                mode="organization"
                onComplete={() => handleStepComplete(2)}
                onGoBack={handleGoBack}
              />
            )}

            {currentStep === 3 && (
              <WizardStepEmployees
                mode="organization"
                onComplete={() => handleStepComplete(3)}
                onGoBack={handleGoBack}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
