/**
 * TenantSetupWizard.tsx
 * Wizard de 2 pasos para configuración inicial del tenant
 * Ejecutado por system.admin después de cambiar contraseña
 * Paso 1: Datos del Tenant
 * Paso 2: Usuario tenant.admin
 */

import { useState, useEffect } from 'react';
import { Building2, User, CheckCircle2, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import logoTurnos from 'figma:asset/17ccf6801f7c83b8bea74fbd52400e5b6ac4d64a.png';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { ApiClient } from '../lib/api-client';

interface TenantSetupWizardProps {
  onComplete: () => void;
}

export default function TenantSetupWizard({ onComplete }: TenantSetupWizardProps) {
  const { session } = useAuth(); // Obtener session del AuthContext
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingState, setCheckingState] = useState(true);

  // Paso 1: Datos del Tenant
  const [tenantData, setTenantData] = useState({
    tenant_key: '',
    tenant_name: '',
    default_language: 'ES'
  });

  // Paso 2: Usuario tenant.admin
  const [adminData, setAdminData] = useState({
    username: 'tenant.admin',
    email: '',
    display_name: '',
    password: '',
    confirmPassword: ''
  });

  // Estados separados para mostrar/ocultar contraseñas
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verificar si el wizard está IN_PROGRESS al cargar
  useEffect(() => {
    let isMounted = true; // ✅ Flag para evitar updates después de desmontar
    
    const checkWizardState = async () => {
      try {
        if (!isMounted) return;
        
        console.log('🔍 Verificando estado del wizard al cargar...');
        
        if (!session) {
          console.warn('⚠️ No hay sesión disponible, cerrando wizard');
          if (isMounted) {
            setCheckingState(false);
            onComplete();
          }
          return;
        }
        
        console.log('✅ Sesión disponible, consultando estado del wizard desde BD');
        
        // Obtener el perfil del usuario para tener el tenant_id
        const { data: { user } } = await ApiClient.auth.getUser();
        
        if (!isMounted) return;
        
        if (!user) {
          console.warn('⚠️ No hay usuario, cerrando wizard');
          if (isMounted) {
            setCheckingState(false);
            onComplete();
          }
          return;
        }

        // Obtener perfil del usuario
        const { data: profile, error: profileError } = await ApiClient
          .from('users')
          .select('tenant_id')
          .eq('auth_user_id', user.id)
          .limit(1)
          .single();

        if (!isMounted) return;

        if (profileError || !profile) {
          // Ignorar AbortError
          if (profileError?.message?.includes('AbortError') || profileError?.message?.includes('aborted')) {
            console.log('🛑 Consulta cancelada (componente desmontado)');
            return;
          }
          console.error('❌ Error obteniendo perfil:', profileError);
          if (isMounted) {
            setCheckingState(false);
            onComplete();
          }
          return;
        }

        console.log('📋 Tenant ID del usuario:', profile.tenant_id);

        // Consultar estado del onboarding
        const { data: onboarding, error: onboardingError } = await ApiClient
          .from('tenant_onboarding')
          .select('onboarding_status, current_step')
          .eq('tenant_id', profile.tenant_id)
          .limit(1)
          .single();

        if (!isMounted) return;

        if (onboardingError) {
          // Ignorar AbortError
          if (onboardingError?.message?.includes('AbortError') || onboardingError?.message?.includes('aborted')) {
            console.log('🛑 Consulta cancelada (componente desmontado)');
            return;
          }
          
          // Si no encuentra registro, cerrar wizard completando
          if (onboardingError.code === 'PGRST116') {
            console.log('✅ No hay registro de onboarding - Finalizando wizard');
            if (isMounted) {
              setCheckingState(false);
              onComplete(); // ✅ Ejecutar onComplete para finalizar correctamente
            }
            return;
          }
          
          console.error('❌ Error obteniendo estado del wizard:', onboardingError);
          if (isMounted) {
            setCheckingState(false);
            onComplete();
          }
          return;
        }

        console.log('📊 Estado del wizard:', onboarding);
        
        // ✅ CRÍTICO: Si está COMPLETED, cerrar el wizard ejecutando onComplete
        if (!onboarding || onboarding.onboarding_status === 'COMPLETED') {
          console.log('✅ Onboarding COMPLETED - Finalizando wizard');
          if (isMounted) {
            setCheckingState(false);
            onComplete(); // ✅ Ejecutar onComplete para finalizar correctamente
          }
          return;
        }
        
        // Si está IN_PROGRESS, verificar si ya existe tenant
        if (onboarding.onboarding_status === 'IN_PROGRESS') {
          console.log('⚠️ Wizard IN_PROGRESS detectado, verificando datos del tenant...');
          
          // Obtener datos del tenant
          const { data: tenant, error: tenantError } = await ApiClient
            .from('tenants')
            .select('tenant_key, tenant_name')
            .eq('id', profile.tenant_id)
            .limit(1)
            .single();

          if (!isMounted) return;

          if (tenantError) {
            // Ignorar AbortError
            if (tenantError?.message?.includes('AbortError') || tenantError?.message?.includes('aborted')) {
              console.log('🛑 Consulta cancelada (componente desmontado)');
              return;
            }
            console.error('❌ Error obteniendo tenant:', tenantError);
          } else if (tenant && tenant.tenant_key && tenant.tenant_key !== 'SYSTEM') {
            // Si el tenant ya existe y NO es SYSTEM, pre-llenar datos
            console.log('📋 Info del tenant:', tenant);
            if (isMounted) {
              setTenantData({
                tenant_key: tenant.tenant_key,
                tenant_name: tenant.tenant_name,
                default_language: 'ES'
              });
              
              // Saltar directo al PASO 2
              console.log('⏭️ Saltando directo al PASO 2 (crear admin)');
              setCurrentStep(2);
              toast.info('Continuando con la creación del administrador');
            }
          } else {
            // Tenant es SYSTEM - pre-llenar con SYSTEM
            console.log('📝 Tenant SYSTEM detectado - Pre-llenando formulario');
            if (isMounted && tenant) {
              setTenantData({
                tenant_key: 'SYSTEM',
                tenant_name: tenant.tenant_name || '',
                default_language: 'ES'
              });
            }
          }
        } else {
          // NOT_STARTED o cualquier otro estado - cerrar wizard
          console.log('ℹ️ Estado del wizard:', onboarding?.onboarding_status, '- Cerrando wizard');
          if (isMounted) {
            onComplete();
          }
        }
      } catch (error: any) {
        if (!isMounted) return;
        
        // Ignorar AbortError
        if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
          console.log('🛑 Consulta cancelada (componente desmontado)');
          return;
        }
        
        console.warn('⚠️ Error verificando estado del wizard:', error);
        // En caso de error, cerrar el wizard para no bloquear al usuario
        if (isMounted) {
          onComplete();
        }
      } finally {
        if (isMounted) {
          setCheckingState(false);
        }
      }
    };
    
    checkWizardState();
    
    // ✅ Cleanup: marcar como desmontado
    return () => {
      isMounted = false;
    };
  }, [session]); // ✅ QUITAR onComplete de las dependencias - causa bucle infinito

  const steps = [
    { id: 1, name: 'Configurar Tenant', icon: Building2 },
    { id: 2, name: 'Crear Administrador', icon: User }
  ];

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('📝 Guardando datos del tenant...');

      if (!session?.access_token) {
        throw new Error('No hay sesión activa');
      }

      // Sanitizar tenant_key: convertir a mayúsculas y reemplazar guiones/espacios por guiones bajos
      const sanitizedTenantKey = tenantData.tenant_key
        .toUpperCase()
        .replace(/[\s-]/g, '_')  // Reemplazar espacios y guiones por _
        .replace(/[^A-Z0-9_]/g, '');  // Eliminar cualquier otro carácter no permitido

      console.log('🔧 Tenant key sanitizado:', sanitizedTenantKey);

      const response = await fetch(
        `http://localhost:3001/make-server-e19f2094/bootstrap/step1-tenant`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...tenantData,
            tenant_key: sanitizedTenantKey
          })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error guardando tenant');
      }

      const result = await response.json();
      console.log('✅ Tenant guardado:', result);

      toast.success('Datos del tenant guardados correctamente');
      setCurrentStep(2);
    } catch (err: any) {
      console.error('❌ Error en paso 1:', err);
      toast.error(err.message || 'Error guardando datos del tenant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🔍 Validando formulario paso 2...');
    console.log('📋 Datos del admin:', { 
      username: adminData.username, 
      email: adminData.email, 
      display_name: adminData.display_name,
      passwordLength: adminData.password.length,
      confirmPasswordLength: adminData.confirmPassword.length,
      passwordsMatch: adminData.password === adminData.confirmPassword
    });

    // Validar que todos los campos estén completos
    if (!adminData.email || !adminData.email.trim()) {
      console.error('❌ El email está vacío');
      toast.error('El correo electrónico es obligatorio');
      return;
    }

    // Validar formato de email (regex permisivo que acepta puntos)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminData.email.trim())) {
      console.error('❌ El email no tiene formato válido');
      toast.error('El correo electrónico no tiene un formato válido');
      return;
    }

    if (!adminData.display_name || !adminData.display_name.trim()) {
      console.error('❌ El nombre completo está vacío');
      toast.error('El nombre completo es obligatorio');
      return;
    }

    if (!adminData.password) {
      console.error('❌ La contraseña está vacía');
      toast.error('La contraseña es obligatoria');
      return;
    }

    if (adminData.password.length < 8) {
      console.error('❌ La contraseña es muy corta');
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    // Validar que las contraseñas coincidan
    if (adminData.password !== adminData.confirmPassword) {
      console.error('❌ Las contraseñas no coinciden');
      toast.error('Las contraseñas no coinciden');
      return;
    }

    // Prevenir double-submit
    if (isLoading) {
      console.log('⚠️ Ya hay una petición en curso, ignorando...');
      return;
    }

    console.log('✅ Validación exitosa, iniciando petición...');
    setIsLoading(true);

    try {
      console.log('📝 Creando usuario tenant.admin...');
      
      if (!session?.access_token) {
        throw new Error('No hay sesión activa');
      }
      
      console.log('📤 Payload a enviar:', {
        username: adminData.username,
        email: adminData.email.trim(),
        display_name: adminData.display_name.trim(),
        password: '***' + adminData.password.slice(-3) // Solo mostrar últimos 3 caracteres
      });

      const response = await fetch(
        `http://localhost:3001/make-server-e19f2094/bootstrap/step2-admin`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: adminData.username,
            email: adminData.email.trim(),
            display_name: adminData.display_name.trim(),
            password: adminData.password
          })
        }
      );

      console.log('📥 Respuesta recibida, status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error HTTP:', response.status, errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        throw new Error(errorData.error || 'Error creando usuario tenant.admin');
      }

      const result = await response.json();
      console.log('✅ Usuario tenant.admin creado:', result);

      toast.success('Configuración completada exitosamente');
      
      // Esperar 1 segundo y completar
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (err: any) {
      console.error('❌ Error en paso 2:', err);
      toast.error(err.message || 'Error creando usuario administrador');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={logoTurnos} alt="Turnos Titanium" className="h-16 w-16" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración Inicial</h1>
          <p className="text-gray-600">Configure su empresa y cree el usuario administrador</p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex flex-col items-center ${step.id <= currentStep ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    step.id === currentStep 
                      ? 'bg-blue-600 text-white' 
                      : step.id < currentStep 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step.id < currentStep ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <step.icon className="w-6 h-6" />
                    )}
                  </div>
                  <span className="text-sm mt-2 font-medium">{step.name}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-32 h-0.5 mx-4 ${step.id < currentStep ? 'bg-green-600' : 'bg-gray-300'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* PASO 1: Datos del Tenant */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Datos de su Empresa</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código del Tenant *
                </label>
                <input
                  type="text"
                  value={tenantData.tenant_key}
                  onChange={(e) => {
                    const sanitized = e.target.value
                      .toUpperCase()
                      .replace(/[\s-]/g, '_')
                      .replace(/[^A-Z0-9_]/g, '');
                    setTenantData({ ...tenantData, tenant_key: sanitized });
                  }}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="EMPRESA_01"
                  maxLength={20}
                />
                <p className="text-xs text-gray-500 mt-1">Solo letras mayúsculas, números y guiones bajos (A-Z, 0-9, _)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Empresa *
                </label>
                <input
                  type="text"
                  value={tenantData.tenant_name}
                  onChange={(e) => setTenantData({ ...tenantData, tenant_name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Mi Empresa S.A."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Idioma por Defecto
                </label>
                <select
                  value={tenantData.default_language}
                  onChange={(e) => setTenantData({ ...tenantData, default_language: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="ES">Español</option>
                  <option value="EN">English</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <span>Continuar</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* PASO 2: Usuario tenant.admin */}
          {currentStep === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Usuario Administrador</h2>
                <p className="text-sm text-gray-600">Este usuario tendrá acceso completo a la configuración operativa</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de Usuario
                </label>
                <input
                  type="text"
                  value={adminData.username}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">Nombre de usuario predefinido</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo Electrónico *
                </label>
                <input
                  type="text"
                  value={adminData.email}
                  onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="admin@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={adminData.display_name}
                  onChange={(e) => setAdminData({ ...adminData, display_name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminData.password}
                    onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={adminData.confirmPassword}
                    onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Repita la contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Atrás</span>
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Finalizando...</span>
                    </>
                  ) : (
                    <>
                      <span>Finalizar Configuración</span>
                      <CheckCircle2 className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
