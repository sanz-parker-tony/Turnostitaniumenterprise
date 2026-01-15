/**
 * App.tsx - Turnos Titanium Enterprise
 * Aplicación On-Premise con autenticación Supabase
 */

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import SystemInitialSetup from './components/SystemInitialSetup';
import ConfigurationWizard from './components/ConfigurationWizard';
import Login from './components/Login';
import LayoutNew from './components/LayoutNew';
import GetAccessToken from './components/GetAccessToken';
import { projectId, publicAnonKey } from './utils/supabase/info';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [showInitialSetup, setShowInitialSetup] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [wizardCompleted, setWizardCompleted] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // ✅ VERIFICAR ESTADO REAL DEL ONBOARDING EN EL BACKEND
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    setCheckingOnboarding(true);
    
    try {
      console.log('🔍 Verificando estado del onboarding en el backend...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/bootstrap/wizard-state`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      ).catch(() => null);

      if (!response || !response.ok) {
        // Si el endpoint devuelve 410 (sistema activado), ir al login
        if (response && response.status === 410) {
          console.log('✅ Sistema ya activado (410), mostrando login');
          setWizardCompleted(true);
          setShowInitialSetup(false);
          setShowLogin(true);
          localStorage.setItem('turnosTitanium_wizardCompleted', 'true');
          setCheckingOnboarding(false);
          return;
        }
        
        // Si no responde, verificar localStorage como fallback
        const localCompleted = localStorage.getItem('turnosTitanium_wizardCompleted');
        if (localCompleted === 'true') {
          console.log('✅ Wizard completado (localStorage), mostrando login');
          setWizardCompleted(true);
          setShowInitialSetup(false);
          setShowLogin(true);
        } else {
          console.log('⚠️ No se pudo verificar estado, mostrando setup inicial');
        }
        setCheckingOnboarding(false);
        return;
      }

      const data = await response.json().catch(() => ({}));
      console.log('📊 Estado del onboarding:', data);

      // Si el onboarding está COMPLETED, ir directo al login
      if (data.onboardingStatus === 'COMPLETED') {
        console.log('✅ Onboarding COMPLETED (backend), mostrando login');
        setWizardCompleted(true);
        setShowInitialSetup(false);
        setShowLogin(true);
        localStorage.setItem('turnosTitanium_wizardCompleted', 'true');
      } else {
        console.log('⚠️ Onboarding en progreso, mostrando setup inicial');
      }
    } catch (error) {
      console.error('❌ Error verificando estado del onboarding:', error);
      
      // Fallback a localStorage
      const localCompleted = localStorage.getItem('turnosTitanium_wizardCompleted');
      if (localCompleted === 'true') {
        console.log('✅ Wizard completado (localStorage fallback), mostrando login');
        setWizardCompleted(true);
        setShowInitialSetup(false);
        setShowLogin(true);
      }
    } finally {
      setCheckingOnboarding(false);
    }
  };

  // Verificar si el wizard ya fue completado (solo localStorage como backup)
  useEffect(() => {
    console.log('🎬 AppContent: useEffect inicial ejecutado');
    const completed = localStorage.getItem('turnosTitanium_wizardCompleted');
    console.log('📦 localStorage wizardCompleted:', completed);
    if (completed === 'true') {
      console.log('✅ Wizard ya completado, mostrando login');
      setWizardCompleted(true);
      setShowInitialSetup(false);
      setShowLogin(true);
    } else {
      console.log('⚠️ Wizard NO completado, mostrando setup inicial');
    }
  }, []);

  // Log del estado actual
  useEffect(() => {
    console.log('📊 AppContent Estado:', {
      isLoading,
      user: !!user,
      showInitialSetup,
      showWizard,
      showLogin,
      wizardCompleted
    });
  }, [isLoading, user, showInitialSetup, showWizard, showLogin, wizardCompleted]);

  // Si está cargando, mostrar spinner
  if (isLoading || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block size-12 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">
            {checkingOnboarding ? 'Verificando configuración del sistema...' : 'Cargando sistema...'}
          </p>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado
  if (!user) {
    // Mostrar wizard de configuración
    if (showWizard) {
      return (
        <ConfigurationWizard
          onComplete={() => {
            setShowWizard(false);
            setShowLogin(true);
            localStorage.setItem('turnosTitanium_wizardCompleted', 'true');
          }}
        />
      );
    }

    // Mostrar pantalla inicial si no se ha accedido al login
    if (showInitialSetup && !showLogin) {
      return (
        <SystemInitialSetup
          onStartConfiguration={() => {
            setShowInitialSetup(false);
            setShowWizard(true);
          }}
          onAccessAsAdmin={() => {
            setShowInitialSetup(false);
            setShowLogin(true);
          }}
        />
      );
    }

    // Mostrar login
    return <Login />;
  }

  // Usuario autenticado: mostrar dashboard
  return (
    <>
      <LayoutNew />
      {/* Helper para obtener access_token (solo para testing) */}
      <GetAccessToken />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <AppContent />
      </PermissionsProvider>
    </AuthProvider>
  );
}