/**
 * Permissions Context - Turnos Titanium
 * Context global para manejar permisos dinámicos basados en SQL functions
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

// ============================================================================
// TIPOS
// ============================================================================

export interface MenuScreen {
  screen_key: string;
  screen_name: string;
  screen_icon_key: string;  // ✅ Ícono individual de la pantalla
  route_path: string;  // ✅ Ruta de la pantalla
  menu_group_key: string;
  menu_group_name: string;
  menu_group_icon: string;  // ✅ Ícono del grupo de menú
  tenant_id: string;  // ✅ NUEVO: ID del tenant
  tenant_name: string;  // ✅ NUEVO: Nombre del tenant
}

export interface ScreenAction {
  action_key: string;
  action_name: string;
}

export interface AccessibleEntity {
  entity_id: string;
  entity_name: string;
}

interface PermissionsContextType {
  menuScreens: MenuScreen[];
  tenantId: string | null;  // ✅ NUEVO: Exponer tenant_id
  tenantName: string | null;  // ✅ NUEVO: Exponer tenant_name
  isLoading: boolean;
  hasPermission: (screenKey: string, actionKey: string) => Promise<boolean>;
  getScreenActions: (screenKey: string) => Promise<ScreenAction[]>;
  getAccessibleEntities: (entityType: 'COMPANY' | 'LOCATION' | 'DEPARTMENT' | 'AREA') => Promise<AccessibleEntity[]>;
  canAccessEntity: (scopeType: string, entityId: string) => Promise<boolean>;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  const [menuScreens, setMenuScreens] = useState<MenuScreen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);

  // Obtener el access token actual
  const getAccessToken = () => {
    return session?.access_token || '';
  };

  // Cargar pantallas del menú
  const loadMenuScreens = async () => {
    if (!user || !session) {
      console.log('⏸️ No hay usuario o sesión, limpiando pantallas');
      setMenuScreens([]);
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔄 Cargando pantallas del menú para:', user.email);
      
      // ✅ USAR VERSIÓN CON PARÁMETRO (la que existe en BD)
      const { data, error } = await supabase.rpc('get_user_screens', {
        p_user_email: user.email
      });

      if (error) {
        console.error('❌ Error al cargar pantallas:', error);
        console.error('❌ Detalle del error:', JSON.stringify(error, null, 2));
        setMenuScreens([]);
        setIsLoading(false);
        return;
      }

      console.log('✅ Pantallas cargadas:', data?.length || 0);
      console.log('📋 Primeras 3 pantallas:', data?.slice(0, 3));
      
      if (data && data.length > 0) {
        console.log('  - Primera pantalla completa:', data[0]);
        console.log('  - Todas las keys:', Object.keys(data[0]));
      }
      
      setMenuScreens(data || []);
    } catch (error) {
      console.error('❌ Error en loadMenuScreens:', error);
      setMenuScreens([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh permisos
  const refreshPermissions = async () => {
    console.log('🔄 Refrescando permisos...');
    setIsLoading(true);
    try {
      await loadMenuScreens();
    } catch (error) {
      console.error('❌ Error refrescando permisos:', error);
      setIsLoading(false);
    }
    // Note: loadMenuScreens ya maneja setIsLoading(false) internamente
  };

  // Cargar permisos al iniciar sesión
  useEffect(() => {
    if (user && session) {
      refreshPermissions();
    } else {
      setMenuScreens([]);
      setIsLoading(false);
    }
  }, [user?.id, session?.access_token]);

  // Verificar si tiene permiso para una acción específica
  const hasPermission = async (screenKey: string, actionKey: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('user_has_permission', {
        p_user_email: user.email,
        p_screen_key: screenKey,
        p_action_key: actionKey
      });

      if (error) {
        console.error('Error verificando permiso:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error en hasPermission:', error);
      return false;
    }
  };

  // Obtener acciones permitidas para una pantalla
  const getScreenActions = async (screenKey: string): Promise<ScreenAction[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase.rpc('get_user_screen_actions', {
        p_user_email: user.email,
        p_screen_key: screenKey
      });

      if (error) {
        console.error('Error obteniendo acciones de pantalla:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error en getScreenActions:', error);
      return [];
    }
  };

  // Obtener entidades accesibles
  const getAccessibleEntities = async (
    entityType: 'COMPANY' | 'LOCATION' | 'DEPARTMENT' | 'AREA'
  ): Promise<AccessibleEntity[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase.rpc('get_user_accessible_entities', {
        p_user_email: user.email,
        p_entity_type: entityType
      });

      if (error) {
        console.error('Error obteniendo entidades accesibles:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error en getAccessibleEntities:', error);
      return [];
    }
  };

  // Verificar si puede acceder a una entidad específica
  const canAccessEntity = async (scopeType: string, entityId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('user_can_access_entity', {
        p_user_email: user.email,
        p_scope_type: scopeType,
        p_entity_id: entityId
      });

      if (error) {
        console.error('Error verificando acceso a entidad:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error en canAccessEntity:', error);
      return false;
    }
  };

  const value: PermissionsContextType = {
    menuScreens,
    tenantId,
    tenantName,
    isLoading,
    hasPermission,
    getScreenActions,
    getAccessibleEntities,
    canAccessEntity,
    refreshPermissions
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions debe usarse dentro de PermissionsProvider');
  }
  return context;
}