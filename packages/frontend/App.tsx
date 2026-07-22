/**
 * App.tsx - Turnos Titanium Enterprise
 * Flujo: Login -> Wizard si esta pendiente -> Pantalla inicial por perfil
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

const DEFAULT_DASHBOARD_ROUTE = '/dashboard';
function getConfiguredHomeRoute(profile: any) {
  const configured = String(profile?.ui_home_route || '').trim();
  return configured.startsWith('/') ? configured : DEFAULT_DASHBOARD_ROUTE;
}

function AppContent() {
  const { user, session, profile, userRoles, isLoading, isPostLoginResolving } = useAuth();
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
    if (!user || !session?.access_token || profile?.ui_dashboard_mode !== 'PLATFORM') return;

    const bootstrapKey = 'bootstrap_screens_done_v4';
    if (sessionStorage.getItem(bootstrapKey)) return;
    sessionStorage.setItem(bootstrapKey, 'true');

    const authHeader = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    };

    const endpoints = [
      'bootstrap-screens/ensure-system-settings',
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
  }, [user, session?.access_token, profile?.ui_dashboard_mode]);

  useEffect(() => {
    if (!user && !isLoading) {
      console.log('[APP] No hay usuario - reseteando estados');
      setCheckingWizard(false);
      setShowWizard(false);
      setMustChangePassword(false);
      setWizardCompleted(null);
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('tt-post-login-route');
        window.sessionStorage.removeItem('tt-post-login-resolving');
      }
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.history.replaceState({}, '', '/login');
        setCurrentPath('/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (!user || isLoading) return;
    if (typeof window !== 'undefined') {
      const pendingPostLoginRoute = window.sessionStorage.getItem('tt-post-login-route');
      if (pendingPostLoginRoute && window.location.pathname !== pendingPostLoginRoute) {
        window.sessionStorage.removeItem('tt-post-login-route');
        window.history.replaceState({}, '', pendingPostLoginRoute);
        setCurrentPath(pendingPostLoginRoute);
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }
      if (pendingPostLoginRoute && window.location.pathname === pendingPostLoginRoute) {
        window.sessionStorage.removeItem('tt-post-login-route');
      }

      let cachedRoleKey = '';
      try {
        const cachedProfile = localStorage.getItem('user_profile');
        cachedRoleKey = cachedProfile ? String(JSON.parse(cachedProfile)?.role_key || '') : '';
      } catch {
        cachedRoleKey = '';
      }
      const primaryRoleKey = String(profile?.role_key || cachedRoleKey || userRoles[0] || '')
        .trim()
        .toUpperCase();
      const roleKeys = [
        primaryRoleKey,
        ...userRoles,
      ]
        .map((role) => String(role || '').trim().toUpperCase())
        .filter(Boolean);

      if (window.location.pathname === '/login') {
        if (!primaryRoleKey && roleKeys.length === 0) return;
        let cachedProfile: any = null;
        try {
          cachedProfile = JSON.parse(localStorage.getItem('user_profile') || 'null');
        } catch {
          cachedProfile = null;
        }
        const landingPath = getConfiguredHomeRoute(profile || cachedProfile);
        window.history.replaceState({}, '', landingPath);
        setCurrentPath(landingPath);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }
  }, [user, profile?.role_key, profile?.ui_home_route, userRoles, isLoading]);

  useEffect(() => {
    if (!user || isLoading || !session?.access_token || !profile) {
      console.log('[WIZARD] Esperando datos antes de verificar:', {
        hasUser: !!user,
        hasProfile: !!profile,
        isLoading,
        hasAccessToken: !!session?.access_token,
      });
      return;
    }

    let isMounted = true;

    const checkWizardStatus = async () => {
      // El onboarding crea el tenant y su primer administrador. Por diseño solo
      // corresponde al perfil de administración de plataforma configurado en BD.
      // Un administrador de tenant ya pertenece a una organización existente y
      // nunca debe ser enviado a este asistente.
      if (profile.ui_dashboard_mode !== 'PLATFORM') {
        setWizardCompleted(true);
        setShowWizard(false);
        setCheckingWizard(false);
        return;
      }

      try {
        setCheckingWizard(true);
        console.log('[WIZARD] Verificando estado del onboarding...');
        const response = await fetch(buildApiUrl('/bootstrap/wizard-state'), {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await response.json().catch(() => ({}));

        if (!isMounted) return;

        if (!response.ok) {
          throw new Error(data?.error || 'No se pudo verificar el onboarding');
        }

        console.log('[WIZARD] Estado actual:', data);

        const completed = data?.onboardingStatus === 'COMPLETED';
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
  }, [user, profile, isLoading, session?.access_token]);

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

  if (isPostLoginResolving) {
    return <LoadingScreen label="Entrando..." detail="Resolviendo pantalla inicial..." />;
  }

  if (currentPath === '/login') {
    return <LoadingScreen label="Entrando..." detail="Redirigiendo a la pantalla inicial..." />;
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
