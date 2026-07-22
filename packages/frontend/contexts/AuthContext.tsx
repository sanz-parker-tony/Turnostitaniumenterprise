/**
 * Auth Context - Turnos Titanium Enterprise
 * Context global para manejar autenticación con ApiClient
 * Version: 1.0.0
 */

'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ApiClient } from '../lib/api-client';
import { buildApiUrl } from '../utils/api-config';

interface User {
  id: string;
  email?: string;
}

interface Session {
  access_token: string;
  token_type?: string;
  user: User;
}

interface UserProfile {
  id: string;
  auth_user_id: string;
  tenant_id: string;
  tenant_name: string;
  username: string;
  email: string;
  display_name: string;
  preferred_language_code: string;
  last_login_at: string | null;
  created_at: string;
  is_super_admin?: boolean;  // ✅ Indica si tiene rol SYSTEM
  role_scope?: 'SYSTEM' | 'TENANT';  // ✅ Scope del rol principal
  role_key?: string;  // ✅ Key del rol principal
  role_name?: string;
  data_scope?: 'ALL' | 'DIRECT_REPORTS' | 'SELF';
  is_tenant_administrator?: boolean;
  is_employee_self_service?: boolean;
  ui_dashboard_mode?: 'PLATFORM' | 'TENANT' | 'WORKFORCE' | 'SELF' | 'GENERIC';
  ui_home_route?: string;
  role_keys?: string[];
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  userRoles: string[];  // ✅ NUEVO: Array de role_keys del usuario
  isLoading: boolean;
  isPostLoginResolving: boolean;
  authStatusMessage: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateTenantInfo: (tenantId: string, tenantName: string) => void;  // ✅ NUEVO
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const POST_LOGIN_ROUTE_KEY = 'tt-post-login-route';
const POST_LOGIN_RESOLVING_KEY = 'tt-post-login-resolving';
const DEFAULT_DASHBOARD_ROUTE = '/dashboard';
const KIOSK_TIMECLOCK_ROUTES = new Set([
  '/dashboard/kiosk/timeclock',
  '/kiosk/timeclock',
]);

function clearBrowserSessionState() {
  if (typeof window === 'undefined') return;

  [
    'tt-access-token',
    'tt-auth-user',
    'access_token',
    'user_profile',
    'bootstrapToken',
    'tenant_id',
    'turnosTitanium_tenantId',
    'turnosTitanium_tenantName',
    'turnosTitanium_wizardState',
    'turnosTitanium_wizardCompleted',
    'wizard_completed',
  ].forEach((key) => window.localStorage.removeItem(key));

  [
    'bootstrap_screens_done_v4',
    POST_LOGIN_ROUTE_KEY,
    POST_LOGIN_RESOLVING_KEY,
  ].forEach((key) => window.sessionStorage.removeItem(key));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);  // ✅ NUEVO
  const [isLoading, setIsLoading] = useState(true);
  const [isPostLoginResolving, setIsPostLoginResolving] = useState(false);
  const [authStatusMessage, setAuthStatusMessage] = useState('Inicializando autenticacion...');

  // Cargar perfil del usuario (simplificado - usa solo Auth)
  const loadProfile = async (currentUser: User): Promise<UserProfile | null> => {
    try {
      setAuthStatusMessage('Ejecutando query: buscar perfil por auth_user_id...');
      console.log('📋 Buscando perfil en BD para auth_user_id:', currentUser.id);
      
      // El perfil propio se obtiene por un endpoint autenticado que resuelve la
      // identidad desde el token. No requiere privilegios de administración de usuarios.
      const { data: sessionData } = await ApiClient.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        throw new Error('No existe una sesión activa para cargar el perfil');
      }

      const profileResponse = await fetch(buildApiUrl('/users/profile'), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profilePayload = await profileResponse.json().catch(() => ({}));
      const existingUser = profileResponse.ok ? profilePayload?.profile : null;
      const queryError = profileResponse.ok
        ? null
        : {
            message: profilePayload?.error || `No se pudo cargar el perfil (HTTP ${profileResponse.status})`,
            code: profileResponse.status === 404 ? 'PGRST116' : `HTTP_${profileResponse.status}`,
          };

      if (queryError) {
        console.error('❌ Error al consultar el perfil propio:', queryError);
        throw queryError;
      }

      if (existingUser) {
        setAuthStatusMessage('Perfil encontrado. Preparando sesion...');
        // ✅ Usuario encontrado en BD - tenant_name ya viene en la vista
        console.log('✅ Usuario encontrado en BD:', existingUser);

        const formattedProfile: UserProfile = {
          id: existingUser.id,
          auth_user_id: existingUser.auth_user_id,
          tenant_id: existingUser.tenant_id,
          tenant_name: existingUser.tenant_name || 'Sin Tenant',
          username: existingUser.username,
          email: existingUser.email,
          display_name: existingUser.display_name,
          preferred_language_code: existingUser.preferred_language_code,
          last_login_at: existingUser.last_login_at,
          created_at: existingUser.created_at,
          is_super_admin: existingUser.is_super_admin,
          role_scope: existingUser.role_scope,
          role_key: existingUser.role_key,
          role_name: existingUser.role_name,
          data_scope: existingUser.data_scope,
          is_tenant_administrator: existingUser.is_tenant_administrator,
          is_employee_self_service: existingUser.is_employee_self_service,
          ui_dashboard_mode: existingUser.ui_dashboard_mode,
          ui_home_route: existingUser.ui_home_route,
          role_keys: Array.isArray(existingUser.role_keys) ? existingUser.role_keys : []
        };
        
        console.log('✅ Perfil cargado desde BD:', formattedProfile);
        setProfile(formattedProfile);
        localStorage.setItem('user_profile', JSON.stringify(formattedProfile));
        
        // ✅ Establecer userRoles array (por ahora solo el rol principal)
        const resolvedRoleKeys = Array.from(new Set([
          ...(Array.isArray(existingUser.role_keys) ? existingUser.role_keys : []),
          existingUser.role_key,
        ].map((role) => String(role || '').trim().toUpperCase()).filter(Boolean)));
        if (resolvedRoleKeys.length > 0) {
          setUserRoles(resolvedRoleKeys);
          console.log('✅ Roles establecidos:', resolvedRoleKeys);
        } else {
          setUserRoles([]);
        }
        
        return formattedProfile;
      }

      // ⚠️ PASO 2: Usuario NO encontrado en BD
      console.warn('⚠️ Usuario NO encontrado en BD');
      
      // No crear perfil temporal - el usuario debería existir en la BD
      throw new Error('Usuario no encontrado en la base de datos. Por favor contacta al administrador.');
    } catch (error: any) {
      // ✅ Ignorar AbortError - es normal cuando se desmonta el componente
      if (error?.name === 'AbortError') {
        console.log('🛑 Carga de perfil cancelada (componente desmontado)');
        return null;
      }
      console.error('❌ Error al cargar perfil:', error);
      // No bloquear el flujo, permitir continuar
      return null;
    } finally {
      setAuthStatusMessage('');
    }
  };

  // Refrescar perfil
  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user);
    }
  };

  const resolveUserRoleKeys = async (loadedProfile: UserProfile | null): Promise<string[]> => {
    const roleKeys = new Set<string>();

    (loadedProfile?.role_keys || []).forEach((roleKey) => {
      const normalizedRoleKey = String(roleKey || '').trim().toUpperCase();
      if (normalizedRoleKey) roleKeys.add(normalizedRoleKey);
    });

    const profileRoleKey = String(loadedProfile?.role_key || '').trim().toUpperCase();
    if (profileRoleKey) roleKeys.add(profileRoleKey);

    return Array.from(roleKeys);
  };

  const resolvePostLoginRoute = async (loadedProfile: UserProfile | null, accessToken: string | null | undefined): Promise<string> => {
    const configuredHome = String(loadedProfile?.ui_home_route || '').trim();
    if (configuredHome.startsWith('/')) return configuredHome;

    if (!accessToken) {
      return DEFAULT_DASHBOARD_ROUTE;
    }

    try {
      const response = await fetch(buildApiUrl('/users/menu-screens'), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.warn('[AUTH] No se pudo resolver menu post-login:', payload);
        return DEFAULT_DASHBOARD_ROUTE;
      }

      const screens = Array.isArray(payload?.screens) ? payload.screens : [];
      const hasKioskTimeclock = screens.some((screen: any) => {
        const screenKey = String(screen?.screen_key || '').trim().toUpperCase();
        const routePath = String(screen?.route_path || '').trim();
        return screenKey === 'KIOSK_TIMECLOCK' || KIOSK_TIMECLOCK_ROUTES.has(routePath);
      });

      return hasKioskTimeclock
        ? String(screens.find((screen: any) => KIOSK_TIMECLOCK_ROUTES.has(String(screen?.route_path || '').trim()))?.route_path || DEFAULT_DASHBOARD_ROUTE)
        : DEFAULT_DASHBOARD_ROUTE;
    } catch (error) {
      console.warn('[AUTH] Error resolviendo ruta post-login:', error);
      return DEFAULT_DASHBOARD_ROUTE;
    }
  };

  // Sign in
  const signIn = async (email: string, password: string) => {
    const { data, error } = await ApiClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  };

  // Inicializar sesión
  useEffect(() => {
    console.log('🔐 AuthContext: Inicializando...');
    
    let isInitialized = false; // ✅ Flag para evitar múltiples inicializaciones
    
    // Obtener sesión actual
    ApiClient.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 AuthContext: Sesión inicial obtenida:', session ? 'Sí' : 'No');
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('🔐 AuthContext: Cargando perfil para sesión existente');
        loadProfile(session.user).finally(() => {
          setIsLoading(false);
          isInitialized = true;
        });
      } else {
        setIsLoading(false);
        setAuthStatusMessage('');
        isInitialized = true;
      }
    });

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = ApiClient.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 AuthContext: Auth event:', event);
      
      // ✅ IGNORAR TOKEN_REFRESHED completamente - NO causa re-renders
      if (event === 'TOKEN_REFRESHED') {
        console.log('🔐 AuthContext: TOKEN_REFRESHED - Ignorado (no afecta UI)');
        return; // ✅ Salir inmediatamente sin tocar el estado
      }
      
      // ✅ IGNORAR eventos duplicados durante inicialización
      if (!isInitialized && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
        console.log('🔐 AuthContext: Evento ignorado durante inicialización');
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'SIGNED_IN' && session?.user) {
        // El flujo explicito de signIn() carga el perfil una sola vez.
        // Evita carreras donde el evento SIGNED_IN desmonta Login con isLoading global.
        setAuthStatusMessage('');
      }

      if (event === 'SIGNED_OUT') {
        console.log('🔐 AuthContext: SIGNED_OUT - Limpiando datos');
        setProfile(null);
        setUserRoles([]);
        setIsPostLoginResolving(false);
        clearBrowserSessionState();
        setIsLoading(false);
        setAuthStatusMessage('');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign out
  const signOut = async () => {
    console.log('🚪 [LOGOUT] Iniciando cierre de sesión...');
    
    // 1. Limpiar estado local PRIMERO (para que React renderice Login inmediatamente)
    setUser(null);
    setSession(null);
    setProfile(null);
    setUserRoles([]);
    setIsPostLoginResolving(false);
    
    // 2. Limpiar localStorage/sessionStorage
    clearBrowserSessionState();
    
    console.log('✅ [LOGOUT] Estado local y localStorage limpiados');
    
    // 3. Cerrar sesión en ApiClient en segundo plano (no esperar)
    ApiClient.auth.signOut().catch(err => {
      console.error('⚠️ [LOGOUT] Error al cerrar sesión en ApiClient (ignorado):', err);
    });
    
    console.log('✅ [LOGOUT] Logout completado - React mostrará Login');
    // ✅ NO recargamos la página - dejamos que React renderice Login naturalmente
  };

  // Actualizar información del tenant
  const updateTenantInfo = useCallback((tenantId: string, tenantName: string) => {
    setProfile(currentProfile => {
      // ✅ Evitar actualización si los valores ya son iguales
      if (currentProfile?.tenant_id === tenantId && currentProfile?.tenant_name === tenantName) {
        return currentProfile;
      }
      
      if (!currentProfile) {
        return null;
      }
      
      const updatedProfile: UserProfile = {
        ...currentProfile,
        tenant_id: tenantId,
        tenant_name: tenantName
      };
      localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      return updatedProfile;
    });
  }, []);

  const value = {
    user,
    session,
    profile,
    userRoles,  // ✅ NUEVO
    isLoading,
    isPostLoginResolving,
    authStatusMessage,
    signIn: async (email: string, password: string) => {
      try {
        setIsPostLoginResolving(true);
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(POST_LOGIN_RESOLVING_KEY);
          window.sessionStorage.removeItem(POST_LOGIN_ROUTE_KEY);
        }
        setAuthStatusMessage('Ejecutando query de login...');
        const { data, error } = await ApiClient.auth.signInWithPassword({ email, password });
        
        if (error) {
          setAuthStatusMessage('El query de login respondio con error.');
          console.error('Error al iniciar sesión:', error);
          throw error;
        }

        if (data.session) {
          setSession(data.session);
        }

        if (data.user) {
          setUser(data.user);
          setAuthStatusMessage('Login correcto. Cargando perfil...');
          console.log('🔐 AuthContext: SIGNED_IN - Cargando perfil');
          const loadedProfile = await loadProfile(data.user);
          const roleKeys = await resolveUserRoleKeys(loadedProfile);
          setUserRoles(roleKeys);
          const routeAfterLogin = await resolvePostLoginRoute(loadedProfile, data.session?.access_token);

          if (typeof window !== 'undefined') {
            if (routeAfterLogin !== DEFAULT_DASHBOARD_ROUTE) {
              window.sessionStorage.setItem(POST_LOGIN_ROUTE_KEY, routeAfterLogin);
            } else {
              window.sessionStorage.removeItem(POST_LOGIN_ROUTE_KEY);
            }
            window.history.replaceState({}, '', routeAfterLogin);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        } else if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(POST_LOGIN_ROUTE_KEY);
        }
      } catch (error) {
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(POST_LOGIN_RESOLVING_KEY);
          window.sessionStorage.removeItem(POST_LOGIN_ROUTE_KEY);
        }
        console.error('Error en signIn:', error);
        throw error;
      } finally {
        setIsPostLoginResolving(false);
        setAuthStatusMessage('');
      }
    },
    signOut,
    refreshProfile,
    updateTenantInfo  // ✅ NUEVO
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook para usar el contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
}


