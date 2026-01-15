/**
 * Pricing Page - Turnos Titanium
 * Página de selección de planes
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Clock } from 'lucide-react';

// Tipos
type BillingCycle = 'MONTHLY' | 'YEARLY';

interface Plan {
  id: string;
  key: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  maxUsers: number | null;
  maxEmployees: number | null;
  isFeatured: boolean;
  trialDays: number;
}

// Mock data (esto vendrá de Supabase después)
const PLANS: Plan[] = [
  {
    id: '1',
    key: 'FREE',
    name: 'Plan Gratuito',
    description: 'Perfecto para probar Turnos Titanium',
    priceMonthly: 0,
    priceYearly: 0,
    maxUsers: 3,
    maxEmployees: 10,
    trialDays: 0,
    isFeatured: false,
    features: [
      'Dashboard básico',
      'Gestión de turnos',
      '1 empresa',
      'Hasta 10 empleados',
      'Soporte por email',
    ],
  },
  {
    id: '2',
    key: 'STARTER',
    name: 'Plan Starter',
    description: 'Ideal para pequeñas empresas',
    priceMonthly: 29.99,
    priceYearly: 299.0,
    maxUsers: 10,
    maxEmployees: 50,
    trialDays: 14,
    isFeatured: false,
    features: [
      'Todo en Free',
      'Reportes básicos',
      'Hasta 3 empresas',
      'Hasta 50 empleados',
      'Soporte prioritario',
      '14 días de prueba gratis',
    ],
  },
  {
    id: '3',
    key: 'PROFESSIONAL',
    name: 'Plan Professional',
    description: 'Para empresas en crecimiento',
    priceMonthly: 79.99,
    priceYearly: 799.0,
    maxUsers: 50,
    maxEmployees: 500,
    trialDays: 30,
    isFeatured: true,
    features: [
      'Todo en Starter',
      'Reportes avanzados',
      'API Access',
      'Integraciones',
      'Hasta 10 empresas',
      'Hasta 500 empleados',
      'Soporte 24/7',
      '30 días de prueba gratis',
    ],
  },
  {
    id: '4',
    key: 'ENTERPRISE',
    name: 'Plan Enterprise',
    description: 'Solución completa para grandes organizaciones',
    priceMonthly: 299.99,
    priceYearly: 2999.0,
    maxUsers: null,
    maxEmployees: null,
    trialDays: 30,
    isFeatured: false,
    features: [
      'Todo en Professional',
      'Usuarios ilimitados',
      'Empresas ilimitadas',
      'Personalización completa',
      'Implementación dedicada',
      'Gerente de cuenta',
      'SLA garantizado',
      '30 días de prueba gratis',
    ],
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');

  const getPrice = (plan: Plan) => {
    return billingCycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;
  };

  const getSavings = (plan: Plan) => {
    const yearlyMonthly = plan.priceYearly / 12;
    const savings = plan.priceMonthly - yearlyMonthly;
    const percentage = (savings / plan.priceMonthly) * 100;
    return percentage > 0 ? Math.round(percentage) : 0;
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
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Iniciar Sesión
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0074D9] to-[#0056A3] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Elige el plan perfecto para tu empresa
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            Comienza gratis y escala según tus necesidades
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-lg p-1">
            <button
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-6 py-3 rounded-lg transition-all ${
                billingCycle === 'MONTHLY'
                  ? 'bg-white text-[#0074D9]'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingCycle('YEARLY')}
              className={`px-6 py-3 rounded-lg transition-all relative ${
                billingCycle === 'YEARLY'
                  ? 'bg-white text-[#0074D9]'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Anual
              <span className="absolute -top-2 -right-2 bg-[#2ECC71] text-white text-xs px-2 py-1 rounded-full">
                Ahorra 17%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl shadow-lg overflow-hidden ${
                plan.isFeatured ? 'ring-2 ring-[#2ECC71] relative' : ''
              }`}
            >
              {plan.isFeatured && (
                <div className="bg-[#2ECC71] text-white text-center py-2 text-sm font-semibold">
                  ⭐ MÁS POPULAR
                </div>
              )}

              <div className="p-6">
                {/* Plan Header */}
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 text-sm mb-6 h-10">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-gray-900">
                      ${getPrice(plan).toFixed(0)}
                    </span>
                    <span className="text-gray-600">
                      /{billingCycle === 'YEARLY' ? 'año' : 'mes'}
                    </span>
                  </div>
                  {billingCycle === 'YEARLY' && getSavings(plan) > 0 && (
                    <p className="text-sm text-[#2ECC71] mt-1">
                      Ahorras {getSavings(plan)}% vs. mensual
                    </p>
                  )}
                  {billingCycle === 'YEARLY' && plan.priceYearly > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      ${(plan.priceYearly / 12).toFixed(2)}/mes facturado anualmente
                    </p>
                  )}
                </div>

                {/* CTA Button */}
                <Link
                  href={`/signup?plan=${plan.key}&cycle=${billingCycle}`}
                  className={`block w-full text-center py-3 rounded-lg font-semibold transition-colors mb-6 ${
                    plan.isFeatured
                      ? 'bg-[#2ECC71] text-white hover:bg-[#27AE60]'
                      : plan.key === 'FREE'
                      ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      : 'bg-[#0074D9] text-white hover:bg-[#0056A3]'
                  }`}
                >
                  {plan.key === 'FREE' ? 'Comenzar Gratis' : 
                   plan.trialDays > 0 ? `Probar ${plan.trialDays} días gratis` : 'Comenzar Ahora'}
                </Link>

                {/* Features */}
                <div className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check className="size-5 text-[#2ECC71] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Limits */}
                {(plan.maxUsers || plan.maxEmployees) && (
                  <div className="mt-6 pt-6 border-t border-gray-200 text-xs text-gray-500">
                    {plan.maxUsers && <p>Hasta {plan.maxUsers} usuarios</p>}
                    {plan.maxEmployees && <p>Hasta {plan.maxEmployees} empleados</p>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">
            ¿Tienes más de 500 empleados? Contáctanos para un plan personalizado
          </p>
          <Link
            href="mailto:sales@turnostitanium.com"
            className="text-[#0074D9] hover:underline font-semibold"
          >
            Hablar con Ventas →
          </Link>
        </div>
      </div>
    </div>
  );
}
