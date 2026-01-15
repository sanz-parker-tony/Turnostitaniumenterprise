/**
 * /system/setup - Wizard de Configuración Inicial
 * 
 * ACCESO: SOLO para IT/SYSTEM_ADMIN durante instalación inicial
 * URL: /system/setup
 * 
 * Este wizard se ejecuta UNA SOLA VEZ durante la instalación del sistema.
 * Los usuarios normales NUNCA deben ver esta pantalla.
 * 
 * NOTA: El middleware ya verifica la BD, pero este componente hace
 *       una verificación adicional por seguridad.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import ConfigurationWizard from '@/components/ConfigurationWizard';

export default function SystemSetupPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  async function checkSystemStatus() {
    try {
      const supabase = createClient();

      // Verificar estado del wizard en la base de datos
      const { data: tenantOnboarding, error } = await supabase
        .from('tenant_onboarding')
        .select('onboarding_status')
        .limit(1)
        .single();

      if (error) {
        console.error('[SYSTEM_SETUP] Error consultando tenant_onboarding:', error);
        // Si hay error, asumir que no existe y permitir setup
        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }

      // Si el wizard ya está completado, redirigir a login
      if (tenantOnboarding?.onboarding_status === 'COMPLETED') {
        console.warn('[SYSTEM_SETUP] ⛔ Wizard ya completado, redirigiendo a /login');
        router.push('/login');
        return;
      }

      // Permitir acceso al wizard
      console.log('[SYSTEM_SETUP] ✅ Wizard NO completado, permitir acceso');
      setIsAuthorized(true);
    } catch (error) {
      console.error('[SYSTEM_SETUP] Error verificando estado:', error);
      // En caso de error, redirigir a login por seguridad
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  }

  const handleWizardComplete = () => {
    console.log('[SYSTEM_SETUP] ✅ Wizard completado, redirigiendo a /login');
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Verificando estado del sistema...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Ya redirigió
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <ConfigurationWizard onComplete={handleWizardComplete} />
    </div>
  );
}