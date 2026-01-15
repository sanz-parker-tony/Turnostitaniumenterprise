/**
 * Onboarding Wizard - Turnos Titanium
 * Configuración inicial post-registro
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Building2, Users, Calendar, Rocket, ArrowRight } from 'lucide-react';

type OnboardingStep = 'welcome' | 'company' | 'departments' | 'shifts' | 'complete';

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    // Company details
    companyAddress: '',
    companyPhone: '',
    companyWebsite: '',
    
    // Departments
    departments: [] as string[],
    
    // Sample shift created
    shiftCreated: false,
  });

  const steps: { key: OnboardingStep; title: string; icon: any }[] = [
    { key: 'welcome', title: 'Bienvenida', icon: Rocket },
    { key: 'company', title: 'Empresa', icon: Building2 },
    { key: 'departments', title: 'Departamentos', icon: Users },
    { key: 'shifts', title: 'Turnos', icon: Calendar },
    { key: 'complete', title: 'Completado', icon: Check },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    setCompletedSteps((prev) => new Set(prev).add(currentStep));

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].key);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleComplete = () => {
    // TODO: Actualizar tenant_onboarding en BD
    router.push('/dashboard');
  };

  const addDepartment = (name: string) => {
    if (name && !formData.departments.includes(name)) {
      setFormData({
        ...formData,
        departments: [...formData.departments, name],
      });
    }
  };

  const removeDepartment = (name: string) => {
    setFormData({
      ...formData,
      departments: formData.departments.filter((d) => d !== name),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0074D9] to-[#0056A3] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="bg-white/20 backdrop-blur-sm rounded-full h-2 overflow-hidden">
            <div
              className="bg-white h-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-4">
            {steps.map((step) => {
              const Icon = step.icon;
              const isCompleted = completedSteps.has(step.key);
              const isCurrent = step.key === currentStep;

              return (
                <div key={step.key} className="flex flex-col items-center">
                  <div
                    className={`size-10 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-[#2ECC71] text-white'
                        : isCurrent
                        ? 'bg-white text-[#0074D9]'
                        : 'bg-white/30 text-white'
                    }`}
                  >
                    {isCompleted ? <Check className="size-5" /> : <Icon className="size-5" />}
                  </div>
                  <span className="text-xs text-white mt-2 hidden sm:block">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* Welcome Step */}
          {currentStep === 'welcome' && (
            <div className="text-center">
              <div className="size-20 bg-gradient-to-br from-[#0074D9] to-[#2ECC71] rounded-full flex items-center justify-center mx-auto mb-6">
                <Rocket className="size-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                ¡Bienvenido a Turnos Titanium!
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Vamos a configurar tu cuenta en solo unos minutos. 
                Este asistente te guiará a través de los pasos esenciales para comenzar.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
                <div className="bg-blue-50 rounded-lg p-4">
                  <Building2 className="size-8 text-[#0074D9] mx-auto mb-2" />
                  <p className="text-sm font-semibold">Configura tu empresa</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <Users className="size-8 text-[#2ECC71] mx-auto mb-2" />
                  <p className="text-sm font-semibold">Crea departamentos</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <Calendar className="size-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold">Define turnos</p>
                </div>
              </div>
              <button
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#0074D9] text-white rounded-lg hover:bg-[#0056A3] transition-colors text-lg font-semibold"
              >
                Comenzar
                <ArrowRight className="size-5" />
              </button>
              <p className="text-sm text-gray-500 mt-4">Tomará aproximadamente 3-5 minutos</p>
            </div>
          )}

          {/* Company Step */}
          {currentStep === 'company' && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Detalles de la empresa</h2>
                <p className="text-gray-600">Completa la información de tu organización</p>
              </div>

              <div className="space-y-6 max-w-xl">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Dirección de la empresa
                  </label>
                  <input
                    type="text"
                    value={formData.companyAddress}
                    onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                    placeholder="Av. Principal 123, Ciudad"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Teléfono de contacto
                  </label>
                  <input
                    type="tel"
                    value={formData.companyPhone}
                    onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sitio web (opcional)
                  </label>
                  <input
                    type="url"
                    value={formData.companyWebsite}
                    onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                    placeholder="https://www.empresa.com"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={handleSkip}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Omitir por ahora
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 px-6 py-3 bg-[#0074D9] text-white rounded-lg hover:bg-[#0056A3] transition-colors font-semibold"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Departments Step */}
          {currentStep === 'departments' && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Departamentos</h2>
                <p className="text-gray-600">Crea los departamentos de tu empresa</p>
              </div>

              <div className="max-w-xl">
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Agregar departamento
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="dept-input"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                      placeholder="Ej: Ventas, Recursos Humanos"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.currentTarget;
                          addDepartment(input.value);
                          input.value = '';
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('dept-input') as HTMLInputElement;
                        addDepartment(input.value);
                        input.value = '';
                      }}
                      className="px-6 py-3 bg-[#2ECC71] text-white rounded-lg hover:bg-[#27AE60] transition-colors"
                    >
                      Agregar
                    </button>
                  </div>
                </div>

                {/* Suggestions */}
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-2">Sugerencias comunes:</p>
                  <div className="flex flex-wrap gap-2">
                    {['Administración', 'Ventas', 'Operaciones', 'Soporte', 'Marketing'].map((dept) => (
                      <button
                        key={dept}
                        onClick={() => addDepartment(dept)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                      >
                        + {dept}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Department List */}
                {formData.departments.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Departamentos creados ({formData.departments.length})
                    </p>
                    <div className="space-y-2">
                      {formData.departments.map((dept) => (
                        <div
                          key={dept}
                          className="flex items-center justify-between bg-blue-50 rounded-lg px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <Users className="size-5 text-[#0074D9]" />
                            <span className="font-medium text-gray-900">{dept}</span>
                          </div>
                          <button
                            onClick={() => removeDepartment(dept)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={handleSkip}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Omitir por ahora
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 px-6 py-3 bg-[#0074D9] text-white rounded-lg hover:bg-[#0056A3] transition-colors font-semibold"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Shifts Step */}
          {currentStep === 'shifts' && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Turnos de trabajo</h2>
                <p className="text-gray-600">Define los horarios de tu empresa</p>
              </div>

              <div className="max-w-xl">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Crear turno de ejemplo</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nombre del turno
                      </label>
                      <input
                        type="text"
                        defaultValue="Turno Matutino"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Código
                      </label>
                      <input
                        type="text"
                        defaultValue="MAT"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Hora inicio
                      </label>
                      <input
                        type="time"
                        defaultValue="08:00"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Hora fin
                      </label>
                      <input
                        type="time"
                        defaultValue="16:00"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setFormData({ ...formData, shiftCreated: true })}
                    className="w-full px-4 py-2 bg-[#2ECC71] text-white rounded-lg hover:bg-[#27AE60] transition-colors"
                  >
                    Crear Turno
                  </button>
                </div>

                {formData.shiftCreated && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-green-800">
                      <Check className="size-5" />
                      <span className="font-semibold">Turno creado exitosamente</span>
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-600">
                  💡 <strong>Tip:</strong> Podrás crear más turnos y personalizarlos desde el módulo de Configuración.
                </p>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={handleSkip}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Omitir por ahora
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 px-6 py-3 bg-[#0074D9] text-white rounded-lg hover:bg-[#0056A3] transition-colors font-semibold"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {currentStep === 'complete' && (
            <div className="text-center">
              <div className="size-20 bg-gradient-to-br from-[#2ECC71] to-[#27AE60] rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="size-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                ¡Todo listo!
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Tu cuenta está configurada y lista para usar. 
                Ahora puedes comenzar a gestionar turnos, empleados y mucho más.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
                <div className="bg-green-50 rounded-lg p-4">
                  <Check className="size-6 text-[#2ECC71] mx-auto mb-2" />
                  <p className="text-sm font-semibold">Cuenta creada</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <Check className="size-6 text-[#2ECC71] mx-auto mb-2" />
                  <p className="text-sm font-semibold">Empresa configurada</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <Check className="size-6 text-[#2ECC71] mx-auto mb-2" />
                  <p className="text-sm font-semibold">Listo para comenzar</p>
                </div>
              </div>

              <button
                onClick={handleComplete}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#0074D9] to-[#2ECC71] text-white rounded-lg hover:shadow-lg transition-all text-lg font-semibold"
              >
                Ir al Dashboard
                <Rocket className="size-5" />
              </button>

              <p className="text-sm text-gray-500 mt-6">
                Siempre podrás modificar esta configuración desde los módulos de la aplicación
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
