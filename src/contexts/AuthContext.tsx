/**
 * Auth Context - Turnos Titanium
 * Context global para manejar autenticación con Supabase
 */

'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, getCurrentUserProfile } from '@/lib/supabase';

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
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateTenantInfo: (tenantId: string, tenantName: string) => void;  // ✅ NUEVO
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar perfil del usuario (simplificado - usa solo Auth)
  const loadProfile = async (currentUser: User) => {
    try {
      console.log('📋 Buscando perfil en BD para auth_user_id:', currentUser.id);
      
      // ✅ PASO 1: Consultar la tabla users
      const { data: existingUser, error: queryError } = await supabase
        .from('users_with_primary_role')
        .select('id, auth_user_id, tenant_id, tenant_name, username, email, display_name, preferred_language_code, last_login_at, created_at, role_key, role_name, role_scope, is_super_admin')
        .eq('auth_user_id', currentUser.id)
        .single();

      if (queryError && queryError.code !== 'PGRST116') {
        // Error diferente a "not found"
        console.error('❌ Error al consultar usuario:', queryError);
        throw queryError;
      }

      if (existingUser) {
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
        
        // Actualizar last_login_at
        await supabase
          .from('users')
          .update({ 
            last_login_at: new Date().toISOString(),
            updated_by: existingUser.username,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id);
        
        return;
      }

      // ⚠️ PASO 2: Usuario NO encontrado - Crear perfil básico (solo para nuevos usuarios)
      console.warn('⚠️ Usuario NO encontrado en BD, creando perfil temporal');
      
      const tempProfile: UserProfile = {
        id: currentUser.id,
        auth_user_id: currentUser.id,
        tenant_id: 'default', // Se obtendrá de los permisos
        tenant_name: 'Empresa Demo',
        username: currentUser.email?.split('@')[0] || 'usuario',
        email: currentUser.email || '',
        display_name: currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || 'Usuario',
        preferred_language_code: 'es',
        last_login_at: new Date().toISOString(),
        created_at: currentUser.created_at || new Date().toISOString()
      };
      
      console.log('⚠️ Perfil temporal creado:', tempProfile);
      setProfile(tempProfile);
      localStorage.setItem('user_profile', JSON.stringify(tempProfile));
    } catch (error) {
      console.error('❌ Error al cargar perfil:', error);
    }
  };

  // Refrescar perfil
  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user);
    }
  };

  // Inicializar sesión
  useEffect(() => {
    console.log('🔐 AuthContext: Inicializando...');
    
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 AuthContext: Sesión inicial obtenida:', session ? 'Sí' : 'No');
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('🔐 AuthContext: Cargando perfil para sesión existente');
        loadProfile(session.user);
      }
      
      console.log('🔐 AuthContext: Inicialización completa, isLoading = false');
      setIsLoading(false);
    });

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 AuthContext: Auth event:', event);
      console.log('🔐 AuthContext: Session:', session ? 'Sí' : 'No');
      
      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔐 AuthContext: SIGNED_IN - Cargando perfil');
        setIsLoading(true); // ✅ Mostrar loading mientras carga el perfil
        await loadProfile(session.user);
        console.log('🔐 AuthContext: Perfil cargado, estableciendo isLoading = false');
        setIsLoading(false); // ✅ CRÍTICO: Establecer isLoading = false después de cargar
        console.log('🔐 AuthContext: isLoading establecido en false');
      }

      if (event === 'SIGNED_OUT') {
        console.log('🔐 AuthContext: SIGNED_OUT - Limpiando datos');
        setProfile(null);
        localStorage.removeItem('user_profile');
        setIsLoading(false); // ✅ Asegurar que no quede en loading
        // El componente App.tsx manejará la redirección basándose en user === null
      }

      if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('🔐 AuthContext: TOKEN_REFRESHED - Recargando perfil');
        await loadProfile(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign out
  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error al cerrar sesión:', error);
        throw error;
      }

      setUser(null);
      setSession(null);
      setProfile(null);
      localStorage.removeItem('user_profile');
      
      // El componente App.tsx detectará user === null y mostrará Login
    } catch (error) {
      console.error('Error en signOut:', error);
    } finally {
      setIsLoading(false);
    }
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
    isLoading,
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