/**
 * App.tsx - Turnos Titanium Enterprise
 * Flujo: Login → Wizard (si necesita) → Dashboard
 * Build: v2.0.0 - Simplified
 */

import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import Login from './components/Login';
import ChangePasswordModal from './components/ChangePasswordModal';
import TenantSetupWizard from './components/TenantSetupWizard';
import { DashboardLayout } from './components/DashboardLayout';
import { projectId } from './utils/supabase/info';
import { Toaster } from 'sonner';
import { supabase } from './lib/supabase';

// Suprimir AbortError en consola
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  const errorString = String(args[0]);
  const ignoredPatterns = ['AbortError', 'signal is aborted', 'user aborted', 'The user aborted', 'cancelled'];
  const shouldIgnore = ignoredPatterns.some(pattern => 
    errorString.toLowerCase().includes(pattern.toLowerCase()) ||
    args[0]?.name?.toLowerCase().includes(pattern.toLowerCase()) ||
    args[0]?.message?.toLowerCase().includes(pattern.toLowerCase())
  );
  if (!shouldIgnore) originalConsoleError.apply(console, args);
};

console.warn = (...args) => {
  const warnString = String(args[0]);
  if (!warnString.toLowerCase().includes('aborterror') && 
      !warnString.toLowerCase().includes('signal is aborted')) {
    originalConsoleWarn.apply(console, args);
  }
};

function AppContent() {
  const { user, profile, isLoading, signOut } = useAuth();
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [checkingWizard, setCheckingWizard] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  // ✅ Cache del estado del wizard en localStorage
  const [wizardCompleted, setWizardCompleted] = useState<boolean | null>(() => {
    const cached = localStorage.getItem('wizard_completed');
    return cached ? cached === 'true' : null;
  });

  // Obtener access token cuando hay usuario
  useEffect(() => {
    if (user) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.access_token) {
          console.log('🔑 Access token obtenido');
          setAccessToken(session.access_token);
        }
      });
    } else {
      setAccessToken(null);
    }
  }, [user]);

  // Resetear estados cuando no hay usuario
  useEffect(() => {
    if (!user && !isLoading) {
      console.log('🔄 No hay usuario - reseteando estados');
      setCheckingWizard(false);
      setShowWizard(false);
      setMustChangePassword(false);
    }
  }, [user, isLoading]);

  // ✅ Verificar estado del wizard cuando el usuario está autenticado
  useEffect(() => {
    if (user && profile && !isLoading && accessToken) {
      console.log('✅ Usuario y perfil cargados');
      
      // Si ya sabemos que el wizard está completado, NO mostrar wizard y NO verificar más
      if (wizardCompleted === true) {
        console.log('✅ [WIZARD] Ya está completado (cache local) - Saltando verificación');
        setCheckingWizard(false);
        setShowWizard(false);
        return; // ✅ SALIR SIN VERIFICAR - El wizard está completado
      }
      
      let isMounted = true; // ✅ Flag para evitar updates después de desmontar
      
      // Verificar estado del wizard en la BD (solo si no está cacheado)
      const checkWizardStatus = async () => {
        try {
          if (!isMounted) return; // ✅ Salir si ya se desmontó
          
          setCheckingWizard(true);
          console.log('🔍 [WIZARD] Verificando estado del onboarding...');
          console.log('📋 [WIZARD] Tenant ID del usuario:', profile.tenant_id);
          
          const { data, error } = await supabase
            .from('tenant_onboarding')
            .select('onboarding_status, current_step, completion_percentage')
            .eq('tenant_id', profile.tenant_id)
            .limit(1)
            .single();
          
          if (!isMounted) return; // ✅ Salir si se desmontó durante la consulta
          
          if (error) {
            // Si es AbortError, ignorar silenciosamente
            if (error.message?.includes('AbortError') || error.message?.includes('aborted')) {
              console.log('🛑 Consulta cancelada (componente desmontado)');
              return;
            }
            
            // Si no encuentra registro (PGRST116), marcar como completado y NO mostrar wizard
            if (error.code === 'PGRST116') {
              console.log('✅ [WIZARD] No hay registro - Marcando como completado');
              setWizardCompleted(true);
              localStorage.setItem('wizard_completed', 'true');
              setShowWizard(false);
              setCheckingWizard(false);
              return;
            }
            
            console.error('❌ Error al verificar wizard:', error);
            // En caso de error, asumir completado para no bloquear
            setWizardCompleted(true);
            localStorage.setItem('wizard_completed', 'true');
            setShowWizard(false);
            setCheckingWizard(false);
            return;
          }
          
          console.log('📊 [WIZARD] Estado actual:', data);
          
          if (!data) {
            // No hay registro de onboarding - marcar como completado
            console.log('✅ [WIZARD] No hay registro - Marcando como completado');
            setWizardCompleted(true);
            localStorage.setItem('wizard_completed', 'true');
            setShowWizard(false);
            setCheckingWizard(false);
            return;
          }
          
          if (data.onboarding_status === 'COMPLETED') {
            // Wizard completado - marcar como completado y NO mostrar wizard
            console.log('✅ [WIZARD] COMPLETED detectado - Marcando como completado y ocultando wizard');
            setWizardCompleted(true);
            localStorage.setItem('wizard_completed', 'true');
            setShowWizard(false);
            setCheckingWizard(false);
          } else {
            // Wizard pendiente (IN_PROGRESS o NOT_STARTED) - mostrar wizard
            console.log('⚠️ [WIZARD] Pendiente (', data.onboarding_status, ') - Mostrando wizard');
            setWizardCompleted(false);
            setShowWizard(true);
            setCheckingWizard(false);
          }
        } catch (error: any) {
          if (!isMounted) return; // ✅ Salir si se desmontó
          
          // Ignorar AbortError
          if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
            console.log('🛑 Consulta cancelada (componente desmontado)');
            return;
          }
          
          console.error('❌ Error verificando wizard:', error);
          // En caso de error, asumir completado para no bloquear
          setWizardCompleted(true);
          localStorage.setItem('wizard_completed', 'true');
          setShowWizard(false);
          setCheckingWizard(false);
        }
      };
      
      // ✅ Ejecutar con debounce para evitar múltiples verificaciones rápidas
      const timeoutId = setTimeout(() => {
        checkWizardStatus();
      }, 100);
      
      // ✅ Cleanup: cancelar timeout y marcar como desmontado
      return () => {
        isMounted = false;
        clearTimeout(timeoutId);
      };
    }
  }, [user, profile, isLoading, accessToken, wizardCompleted]);

  const handlePasswordChanged = async () => {
    console.log('✅ Contraseña cambiada exitosamente');
    setMustChangePassword(false);
    setCheckingWizard(false); // Ir directo al dashboard
  };

  const handleWizardComplete = async () => {
    console.log('✅ Wizard completado exitosamente');
    
    // ✅ CRÍTICO: Marcar wizard como completado en cache local
    setWizardCompleted(true);
    localStorage.setItem('wizard_completed', 'true');
    
    setShowWizard(false);
    await signOut();
  };

  // Spinner de carga
  if (isLoading || checkingWizard) {
    // ✅ DEBUG: Log detallado para identificar por qué está cargando
    console.log('🔄 [APP] LOADING STATE:', { isLoading, checkingWizard, hasUser: !!user, hasProfile: !!profile });
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
          {/* Debug info en desarrollo */}
          <p className="text-xs text-gray-400 mt-2">
            {isLoading ? 'Auth...' : checkingWizard ? 'Wizard...' : 'Inicializando...'}
          </p>
        </div>
      </div>
    );
  }

  // Si no hay usuario, mostrar login
  if (!user) {
    console.log('🔓 [APP] No hay usuario, mostrando Login');
    return <Login />;
  }

  // Modal de cambio de contraseña
  if (mustChangePassword) {
    console.log('🔐 [APP] Mostrando cambio de contraseña');
    return (
      <>
        <Login />
        <ChangePasswordModal
          isOpen={true}
          onClose={() => {}}
          onPasswordChanged={handlePasswordChanged}
        />
      </>
    );
  }

  // Wizard de configuración
  if (showWizard) {
    console.log('🧙 [APP] Mostrando wizard');
    return <TenantSetupWizard onComplete={handleWizardComplete} />;
  }

  // Dashboard
  console.log('📊 [APP] Mostrando Dashboard');
  return <DashboardLayout />;
}

export default function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <AppContent />
        <Toaster position="top-right" richColors />
      </PermissionsProvider>
    </AuthProvider>
  );
}