/**
 * Sign Up Page - Turnos Titanium
 * Registro de nuevo tenant con simulación de pago
 */

'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock, ArrowLeft, CreditCard, Building2, User, Mail, Lock, Check } from 'lucide-react';

// Componente interno que usa useSearchParams
function SignUpForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const planKey = searchParams.get('plan') || 'FREE';
  const billingCycle = searchParams.get('cycle') || 'MONTHLY';

  const [step, setStep] = useState<'account' | 'company' | 'payment' | 'processing'>('account');
  const [formData, setFormData] = useState({
    // Account info
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    
    // Company info
    companyName: '',
    companySize: '',
    industry: '',
    
    // Payment info (simulado)
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCVV: '',
    billingAddress: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Plan info (mock - vendría de Supabase)
  const planInfo = {
    FREE: { name: 'Plan Gratuito', price: 0, trial: 0 },
    STARTER: { name: 'Plan Starter', price: billingCycle === 'YEARLY' ? 299 : 29.99, trial: 14 },
    PROFESSIONAL: { name: 'Plan Professional', price: billingCycle === 'YEARLY' ? 799 : 79.99, trial: 30 },
    ENTERPRISE: { name: 'Plan Enterprise', price: billingCycle === 'YEARLY' ? 2999 : 299.99, trial: 30 },
  }[planKey as keyof typeof planInfo] || { name: 'Plan Gratuito', price: 0, trial: 0 };

  const needsPayment = planInfo.price > 0 && planInfo.trial === 0;

  // Validaciones
  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (step === 'account') {
      if (!formData.email) newErrors.email = 'Email requerido';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Email inválido';
      }
      
      if (!formData.password) newErrors.password = 'Contraseña requerida';
      else if (formData.password.length < 8) {
        newErrors.password = 'Mínimo 8 caracteres';
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
      
      if (!formData.fullName) newErrors.fullName = 'Nombre requerido';
    }

    if (step === 'company') {
      if (!formData.companyName) newErrors.companyName = 'Nombre de empresa requerido';
    }

    if (step === 'payment' && needsPayment) {
      if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, '').length !== 16) {
        newErrors.cardNumber = 'Número de tarjeta inválido';
      }
      if (!formData.cardName) newErrors.cardName = 'Nombre requerido';
      if (!formData.cardExpiry || !/^\d{2}\/\d{2}$/.test(formData.cardExpiry)) {
        newErrors.cardExpiry = 'Formato MM/AA';
      }
      if (!formData.cardCVV || formData.cardCVV.length !== 3) {
        newErrors.cardCVV = 'CVV inválido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;

    if (step === 'account') {
      setStep('company');
    } else if (step === 'company') {
      if (needsPayment) {
        setStep('payment');
      } else {
        handleSubmit();
      }
    } else if (step === 'payment') {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!acceptedTerms) {
      alert('Debes aceptar los términos y condiciones');
      return;
    }

    setStep('processing');

    // Simulación de creación de tenant
    // TODO: Conectar con Supabase y llamar a create_tenant_with_subscription
    try {
      // Simular delay de procesamiento
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock de respuesta exitosa
      console.log('Creating tenant with:', {
        email: formData.email,
        fullName: formData.fullName,
        companyName: formData.companyName,
        planKey,
        billingCycle,
      });

      // Redirigir al onboarding
      router.push('/onboarding');
    } catch (error) {
      console.error('Error creating tenant:', error);
      setStep('payment');
      alert('Error al crear la cuenta. Por favor intenta nuevamente.');
    }
  };

  const formatCardNumber = (value: string) => {
    return value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/landing" className="flex items-center gap-2">
              <Clock className="size-8 text-[#0074D9]" />
              <span className="text-2xl font-bold text-gray-900">Turnos Titanium</span>
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-gray-900 text-sm">
              ¿Ya tienes cuenta? <span className="font-semibold">Inicia sesión</span>
            </Link>
          </div>
        </nav>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-8">
              {/* Progress Steps */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  {['account', 'company', needsPayment ? 'payment' : null].filter(Boolean).map((s, idx, arr) => (
                    <div key={s} className="flex items-center flex-1">
                      <div className={`flex items-center justify-center size-10 rounded-full ${
                        step === s ? 'bg-[#0074D9] text-white' : 
                        arr.indexOf(step) > idx ? 'bg-[#2ECC71] text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {arr.indexOf(step) > idx ? <Check className="size-5" /> : idx + 1}
                      </div>
                      {idx < arr.length - 1 && (
                        <div className={`h-1 flex-1 mx-2 ${
                          arr.indexOf(step) > idx ? 'bg-[#2ECC71]' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className={step === 'account' ? 'text-[#0074D9] font-semibold' : 'text-gray-600'}>
                    Cuenta
                  </span>
                  <span className={step === 'company' ? 'text-[#0074D9] font-semibold' : 'text-gray-600'}>
                    Empresa
                  </span>
                  {needsPayment && (
                    <span className={step === 'payment' ? 'text-[#0074D9] font-semibold' : 'text-gray-600'}>
                      Pago
                    </span>
                  )}
                </div>
              </div>

              {/* Step: Account */}
              {step === 'account' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Crea tu cuenta</h2>
                    <p className="text-gray-600">Comienza con {planInfo.name}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre completo
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                        placeholder="Juan Pérez"
                      />
                    </div>
                    {errors.fullName && <p className="text-red-600 text-sm mt-1">{errors.fullName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                        placeholder="juan@empresa.com"
                      />
                    </div>
                    {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Contraseña
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                        placeholder="••••••••"
                      />
                    </div>
                    {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Confirmar contraseña
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                        placeholder="••••••••"
                      />
                    </div>
                    {errors.confirmPassword && <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>}
                  </div>
                </div>
              )}

              {/* Step: Company */}
              {step === 'company' && (
                <div className="space-y-6">
                  <div>
                    <button
                      onClick={() => setStep('account')}
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                    >
                      <ArrowLeft className="size-4" />
                      Volver
                    </button>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Información de la empresa</h2>
                    <p className="text-gray-600">Cuéntanos sobre tu organización</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre de la empresa
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                        placeholder="Mi Empresa S.A."
                      />
                    </div>
                    {errors.companyName && <p className="text-red-600 text-sm mt-1">{errors.companyName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tamaño de la empresa
                    </label>
                    <select
                      value={formData.companySize}
                      onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="1-10">1-10 empleados</option>
                      <option value="11-50">11-50 empleados</option>
                      <option value="51-200">51-200 empleados</option>
                      <option value="201-500">201-500 empleados</option>
                      <option value="500+">Más de 500 empleados</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Industria (opcional)
                    </label>
                    <select
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="retail">Retail</option>
                      <option value="hospitality">Hospitalidad</option>
                      <option value="healthcare">Salud</option>
                      <option value="manufacturing">Manufactura</option>
                      <option value="services">Servicios</option>
                      <option value="other">Otra</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Step: Payment (solo si needsPayment) */}
              {step === 'payment' && needsPayment && (
                <div className="space-y-6">
                  <div>
                    <button
                      onClick={() => setStep('company')}
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                    >
                      <ArrowLeft className="size-4" />
                      Volver
                    </button>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Información de pago</h2>
                    <p className="text-gray-600">Ingresa los datos de tu tarjeta (simulado)</p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      ⚠️ <strong>Modo Demo:</strong> Este es un formulario simulado. No se procesarán pagos reales.
                      Puedes usar cualquier número de tarjeta de prueba.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Número de tarjeta
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.cardNumber}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          cardNumber: formatCardNumber(e.target.value.replace(/\D/g, '').substring(0, 16))
                        })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent font-mono"
                        placeholder="4242 4242 4242 4242"
                        maxLength={19}
                      />
                    </div>
                    {errors.cardNumber && <p className="text-red-600 text-sm mt-1">{errors.cardNumber}</p>}
                    <p className="text-xs text-gray-500 mt-1">Usa: 4242 4242 4242 4242 (tarjeta de prueba)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre en la tarjeta
                    </label>
                    <input
                      type="text"
                      value={formData.cardName}
                      onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                      placeholder="JUAN PEREZ"
                    />
                    {errors.cardName && <p className="text-red-600 text-sm mt-1">{errors.cardName}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Expiración
                      </label>
                      <input
                        type="text"
                        value={formData.cardExpiry}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          cardExpiry: formatExpiry(e.target.value)
                        })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent font-mono"
                        placeholder="MM/AA"
                        maxLength={5}
                      />
                      {errors.cardExpiry && <p className="text-red-600 text-sm mt-1">{errors.cardExpiry}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        CVV
                      </label>
                      <input
                        type="text"
                        value={formData.cardCVV}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          cardCVV: e.target.value.replace(/\D/g, '').substring(0, 3)
                        })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent font-mono"
                        placeholder="123"
                        maxLength={3}
                      />
                      {errors.cardCVV && <p className="text-red-600 text-sm mt-1">{errors.cardCVV}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Processing */}
              {step === 'processing' && (
                <div className="text-center py-12">
                  <div className="size-16 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Creando tu cuenta...</h2>
                  <p className="text-gray-600">Por favor espera un momento</p>
                </div>
              )}

              {/* Terms & Actions */}
              {step !== 'processing' && (
                <div className="mt-8 space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-1 size-4 text-[#0074D9] border-gray-300 rounded focus:ring-[#0074D9]"
                    />
                    <span className="text-sm text-gray-600">
                      Acepto los{' '}
                      <Link href="/terms" className="text-[#0074D9] hover:underline">
                        términos y condiciones
                      </Link>{' '}
                      y la{' '}
                      <Link href="/privacy" className="text-[#0074D9] hover:underline">
                        política de privacidad
                      </Link>
                    </span>
                  </label>

                  <button
                    onClick={handleNext}
                    disabled={!acceptedTerms}
                    className="w-full bg-[#0074D9] text-white py-3 rounded-lg hover:bg-[#0056A3] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
                  >
                    {step === 'payment' || (step === 'company' && !needsPayment) 
                      ? 'Crear Cuenta' 
                      : 'Continuar'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-8">
              <h3 className="font-bold text-gray-900 mb-4">Resumen</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-semibold">{planInfo.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Facturación</span>
                  <span className="font-semibold">{billingCycle === 'YEARLY' ? 'Anual' : 'Mensual'}</span>
                </div>
                {planInfo.trial > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Período de prueba</span>
                    <span className="font-semibold text-[#2ECC71]">{planInfo.trial} días gratis</span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-baseline">
                  <span className="text-gray-600">Total</span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      ${planInfo.price.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {billingCycle === 'YEARLY' ? '/año' : '/mes'}
                    </div>
                  </div>
                </div>
              </div>

              {planInfo.trial > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    <Check className="inline size-4 mr-1" />
                    No se te cobrará nada hoy. Tu prueba de {planInfo.trial} días comienza inmediatamente.
                  </p>
                </div>
              )}

              {planInfo.price === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <Check className="inline size-4 mr-1" />
                    Plan gratuito para siempre. Sin tarjeta de crédito requerida.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente wrapper con Suspense
export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="size-16 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  );
}
