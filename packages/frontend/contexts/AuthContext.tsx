/**
 * Auth Context - Turnos Titanium Enterprise
 * Context global para manejar autenticación con ApiClient
 * Version: 1.0.0
 */

'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ApiClient } from '../lib/api-client';

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
  role_name?: string;  // ✅ Nombre del rol principal
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
      
      // ✅ PASO 1: Buscar por auth_user_id primero
      const { data: existingUser, error: queryError } = await ApiClient
        .from('users_with_primary_role')
        .select('id, auth_user_id, tenant_id, tenant_name, username, email, display_name, preferred_language_code, last_login_at, created_at, role_key, role_name, role_scope, is_super_admin')
        .eq('auth_user_id', currentUser.id)
        .limit(1)
        .single();

      if (queryError) {
        // Si es error de "no encontrado", intentar por email
        if (queryError.code === 'PGRST116' && currentUser.email) {
          setAuthStatusMessage('No se encontro por auth_user_id. Ejecutando query por email...');
          console.log('🔍 Usuario no encontrado por auth_user_id, buscando por email:', currentUser.email);
          
          const { data: userByEmail, error: emailError } = await ApiClient
            .from('users_with_primary_role')
            .select('id, auth_user_id, tenant_id, tenant_name, username, email, display_name, preferred_language_code, last_login_at, created_at, role_key, role_name, role_scope, is_super_admin')
            .eq('email', currentUser.email)
            .limit(1)
            .single();

          if (emailError) {
            if (emailError.code !== 'PGRST116') {
              console.error('❌ Error al consultar usuario por email:', emailError);
            }
            // Usuario no existe en BD - esto es normal en algunos casos
            console.warn('⚠️ Usuario no encontrado en BD');
            return;
          }

          if (userByEmail) {
            setAuthStatusMessage('Usuario encontrado. Actualizando auth_user_id...');
            console.log('✅ Usuario encontrado por email, vinculando auth_user_id...');
            
            // Actualizar el auth_user_id en la tabla users
            setAuthStatusMessage('Actualizando auth_user_id...');
            await ApiClient
              .from('users')
              .update({ 
                auth_user_id: currentUser.id,
                updated_by: userByEmail.username,
                updated_at: new Date().toISOString()
              })
              .eq('id', userByEmail.id);

            console.log('✅ auth_user_id vinculado correctamente');
            
            // Usar este usuario para continuar
            const formattedProfile: UserProfile = {
              id: userByEmail.id,
              auth_user_id: currentUser.id,
              tenant_id: userByEmail.tenant_id,
              tenant_name: userByEmail.tenant_name || 'Sin Tenant',
              username: userByEmail.username,
              email: userByEmail.email,
              display_name: userByEmail.display_name,
              preferred_language_code: userByEmail.preferred_language_code,
              last_login_at: userByEmail.last_login_at,
              created_at: userByEmail.created_at,
              is_super_admin: userByEmail.is_super_admin,
              role_scope: userByEmail.role_scope,
              role_key: userByEmail.role_key,
              role_name: userByEmail.role_name
            };
            
            console.log('✅ Perfil cargado desde BD:', formattedProfile);
            setProfile(formattedProfile);
            localStorage.setItem('user_profile', JSON.stringify(formattedProfile));
            
            if (userByEmail.role_key) {
              setUserRoles([userByEmail.role_key]);
              console.log('✅ Roles establecidos:', [userByEmail.role_key]);
            } else {
              setUserRoles([]);
            }
            
            // Actualizar last_login_at
            setAuthStatusMessage('Actualizando ultimo login...');
            await ApiClient
              .from('users')
              .update({ 
                last_login_at: new Date().toISOString(),
                updated_by: userByEmail.username,
                updated_at: new Date().toISOString()
              })
              .eq('id', userByEmail.id);

            return formattedProfile;
          }
          return null;
        } else {
          console.error('❌ Error al consultar usuario:', queryError);
          throw queryError;
        }
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
          role_name: existingUser.role_name
        };
        
        console.log('✅ Perfil cargado desde BD:', formattedProfile);
        setProfile(formattedProfile);
        localStorage.setItem('user_profile', JSON.stringify(formattedProfile));
        
        // ✅ Establecer userRoles array (por ahora solo el rol principal)
        if (existingUser.role_key) {
          setUserRoles([existingUser.role_key]);
          console.log('✅ Roles establecidos:', [existingUser.role_key]);
        } else {
          setUserRoles([]);
        }
        
        // Actualizar last_login_at
        setAuthStatusMessage('Actualizando ultimo login...');
        await ApiClient
          .from('users')
          .update({ 
            last_login_at: new Date().toISOString(),
            updated_by: existingUser.username,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id);
        
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
    const profileRoleKey = String(loadedProfile?.role_key || '').trim().toUpperCase();
    const roleKeys = new Set<string>();

    if (profileRoleKey) {
      roleKeys.add(profileRoleKey);
    }

    if (!loadedProfile?.id) {
      return Array.from(roleKeys);
    }

    const { data, error } = await ApiClient
      .from('user_roles')
      .select('roles:role_id(role_key)')
      .eq('user_id', loadedProfile.id);

    if (error) {
      console.warn('[AUTH] No se pudieron resolver roles asignados para post-login:', error);
      return Array.from(roleKeys);
    }

    (data || []).forEach((item: any) => {
      const assignedRoles = Array.isArray(item?.roles) ? item.roles : [item?.roles];
      assignedRoles.forEach((assignedRole: any) => {
        const assignedRoleKey = String(assignedRole?.role_key || '').trim().toUpperCase();
        if (assignedRoleKey) {
          roleKeys.add(assignedRoleKey);
        }
      });
    });

    return Array.from(roleKeys);
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
          const primaryRoleKey = String(loadedProfile?.role_key || roleKeys[0] || '').trim().toUpperCase();
          const isEmployee = primaryRoleKey === 'EMPLOYEE';
          const routeAfterLogin =
            isEmployee
              ? '/dashboard/kiosk/timeclock'
              : '/dashboard';

          if (typeof window !== 'undefined') {
            if (isEmployee) {
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


