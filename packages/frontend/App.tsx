/**
 * App.tsx - Turnos Titanium Enterprise
 * Flujo: Login -> Wizard si esta pendiente -> Dashboard
 */

import { buildApiUrl } from './utils/api-config';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import Login from './components/Login';
import ChangePasswordModal from './components/ChangePasswordModal';
import TenantSetupWizard from './components/TenantSetupWizard';
import { DashboardLayout } from './components/DashboardLayout';
import { Toaster } from 'sonner';
import { ApiClient } from './lib/api-client';

function LoadingScreen({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">{label}</p>
        <p className="text-xs text-gray-400 mt-2">{detail}</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, session, profile, isLoading } = useAuth();
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [checkingWizard, setCheckingWizard] = useState(false);
  const [wizardCompleted, setWizardCompleted] = useState<boolean | null>(null);
  const [currentPath, setCurrentPath] = useState(() =>
    typeof window === 'undefined' ? '/' : window.location.pathname
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncPath = () => setCurrentPath(window.location.pathname);
    syncPath();
    window.addEventListener('popstate', syncPath);
    return () => window.removeEventListener('popstate', syncPath);
  }, []);

  useEffect(() => {
    if (!user || !session?.access_token) return;

    const bootstrapKey = 'bootstrap_screens_done_v4';
    if (sessionStorage.getItem(bootstrapKey)) return;
    sessionStorage.setItem(bootstrapKey, 'true');

    const authHeader = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    };

    const endpoints = [
      'bootstrap/ensure-system-settings-screen',
      'bootstrap/ensure-maintenance-screens',
      'bootstrap/ensure-security-screens',
      'bootstrap/ensure-org-maintenance-screen',
    ];

    Promise.allSettled(
      endpoints.map((endpoint) =>
        fetch(buildApiUrl(`/${endpoint}`), {
          method: 'POST',
          headers: authHeader,
        }).then((response) => response.json())
      )
    )
      .then((results) => {
        const anyCreated = results.some(
          (result) => result.status === 'fulfilled' && result.value?.any_created
        );
        console.log('[BOOTSTRAP] Pantallas verificadas. Nuevas creadas:', anyCreated);
        if (anyCreated) {
          window.dispatchEvent(new Event('permissions-reload'));
        }
      })
      .catch((error) => {
        console.warn('[BOOTSTRAP] Error en bootstrap de pantallas:', error);
      });
  }, [user, session?.access_token]);

  useEffect(() => {
    if (!user && !isLoading) {
      console.log('[APP] No hay usuario - reseteando estados');
      setCheckingWizard(false);
      setShowWizard(false);
      setMustChangePassword(false);
      setWizardCompleted(null);
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.history.replaceState({}, '', '/login');
        setCurrentPath('/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (!user || isLoading) return;
    if (typeof window !== 'undefined' && window.location.pathname === '/login') {
      window.history.replaceState({}, '', '/dashboard');
      setCurrentPath('/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (!user || isLoading || !session?.access_token) {
      console.log('[WIZARD] Esperando datos antes de verificar:', {
        hasUser: !!user,
        hasProfile: !!profile,
        isLoading,
        hasAccessToken: !!session?.access_token,
      });
      return;
    }

    let isMounted = true;

    const resolveTenantId = async (): Promise<string | null> => {
      if (profile?.tenant_id) {
        return profile.tenant_id;
      }

      const cachedProfile = localStorage.getItem('user_profile');
      if (cachedProfile) {
        try {
          const parsed = JSON.parse(cachedProfile);
          if (parsed?.tenant_id) {
            console.log('[WIZARD] tenant_id recuperado desde cache local.');
            return parsed.tenant_id;
          }
        } catch (error) {
          console.warn('[WIZARD] user_profile invalido en localStorage:', error);
        }
      }

      const { data, error } = await ApiClient
        .from('users_with_primary_role')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .limit(1)
        .single();

      if (error) {
        console.warn('[WIZARD] No se pudo resolver tenant_id por auth_user_id:', error);
        return null;
      }

      return data?.tenant_id ?? null;
    };

    const checkWizardStatus = async () => {
      try {
        setCheckingWizard(true);
        console.log('[WIZARD] Verificando estado del onboarding...');
        const tenantId = await resolveTenantId();
        if (!tenantId) {
          console.warn('[WIZARD] tenant_id no disponible. Mostrando wizard por seguridad.');
          setWizardCompleted(false);
          setShowWizard(true);
          return;
        }

        console.log('[WIZARD] Tenant ID del usuario:', tenantId);

        const { data, error } = await ApiClient
          .from('tenant_onboarding')
          .select('onboarding_status, current_step, completion_percentage')
          .eq('tenant_id', tenantId)
          .limit(1)
          .single();

        if (!isMounted) return;

        if (error) {
          if (error.code === 'PGRST116') {
            console.log('[WIZARD] No hay registro de onboarding. Mostrando wizard.');
            setWizardCompleted(false);
            setShowWizard(true);
            return;
          }

          console.error('[WIZARD] Error al verificar wizard:', error);
          setWizardCompleted(false);
          setShowWizard(true);
          return;
        }

        console.log('[WIZARD] Estado actual:', data);

        const completed = data?.onboarding_status === 'COMPLETED';
        setWizardCompleted(completed);
        setShowWizard(!completed);
      } catch (error) {
        if (!isMounted) return;
        console.error('[WIZARD] Error verificando wizard:', error);
        setWizardCompleted(false);
        setShowWizard(true);
      } finally {
        if (isMounted) {
          setCheckingWizard(false);
        }
      }
    };

    checkWizardStatus();

    return () => {
      isMounted = false;
    };
  }, [user, profile?.tenant_id, isLoading, session?.access_token]);

  const handlePasswordChanged = async () => {
    setMustChangePassword(false);
    setCheckingWizard(false);
  };

  const handleWizardComplete = () => {
    setWizardCompleted(true);
    setShowWizard(false);
  };

  if (isLoading || checkingWizard) {
    return <LoadingScreen label="Cargando..." detail={isLoading ? 'Auth...' : 'Wizard...'} />;
  }

  if (!user) {
    return <Login />;
  }

  if (currentPath === '/login') {
    return <LoadingScreen label="Entrando..." detail="Redirigiendo al dashboard..." />;
  }

  if (mustChangePassword) {
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

  if (showWizard || wizardCompleted === false) {
    return <TenantSetupWizard onComplete={handleWizardComplete} />;
  }

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
