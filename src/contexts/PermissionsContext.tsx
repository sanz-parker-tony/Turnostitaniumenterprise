/**
 * PermissionsContext - Gestión de permisos y menú dinámico
 * Carga las pantallas permitidas para el usuario basándose en role_screen_actions
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

export interface MenuScreen {
  screen_key: string;
  screen_name: string;
  menu_label: string; // ✅ Nombre corto para el menú
  screen_icon_key: string;
  route_path: string;
  menu_group_key: string;
  menu_group_name: string;
  menu_group_icon: string;
  menu_group_sort_order: number;
  screen_sort_order: number;
}

interface PermissionsContextType {
  menuScreens: MenuScreen[];
  isLoading: boolean;
  reload: () => Promise<void>;
  getFirstAvailableScreen: () => MenuScreen | null;
  getScreenByPath: (path: string) => MenuScreen | null;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [menuScreens, setMenuScreens] = useState<MenuScreen[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar menú cuando el usuario/rol cambia
  useEffect(() => {
    let isMounted = true; // ✅ Flag dentro del useEffect
    
    const loadMenuScreens = async () => {
      if (!user || !profile?.role_key) {
        console.log('⚠️ No hay usuario o rol, limpiando menú');
        if (isMounted) {
          setMenuScreens([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        if (isMounted) setIsLoading(true);
        console.log('🔄 Cargando pantallas del menú para rol:', profile.role_key);

        // PASO 1: Obtener el tenant SYSTEM primero (los roles base están ahí)
        const { data: systemTenant, error: systemTenantError } = await supabase
          .from('tenants')
          .select('id')
          .eq('tenant_key', 'SYSTEM')
          .maybeSingle();

        if (!isMounted) {
          console.log('🛑 Componente desmontado - cancelando carga de menú (paso 1)');
          return;
        }

        if (systemTenantError || !systemTenant) {
          console.error('❌ Error al obtener tenant SYSTEM:', systemTenantError);
          console.error('⚠️  ACCIÓN REQUERIDA: Ejecutar /supabase/migrations/002_SEED_COMPLETE.sql');
          console.error('📖 Ver instrucciones en /SETUP_DATABASE.md');
          if (isMounted) {
            setMenuScreens([]);
            setIsLoading(false);
          }
          return;
        }

        console.log('✅ Tenant SYSTEM encontrado:', systemTenant.id);

        // PASO 2: Buscar el rol en el tenant SYSTEM (donde están los roles base)
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('id')
          .eq('role_key', profile.role_key)
          .eq('tenant_id', systemTenant.id)
          .maybeSingle();

        if (!isMounted) {
          console.log('🛑 Componente desmontado - cancelando carga de menú (paso 2)');
          return;
        }

        if (roleError || !roleData) {
          console.error('❌ Error al obtener rol:', roleError);
          if (isMounted) {
            setMenuScreens([]);
            setIsLoading(false);
          }
          return;
        }

        console.log('✅ Rol encontrado:', roleData.id);

        // PASO 3: Obtener pantallas autorizadas para este rol
        const { data: screenData, error: screenError } = await supabase
          .from('role_screen_actions')
          .select(`
            screen_action_id,
            is_allowed,
            screen_actions!inner (
              screen_id,
              action_id,
              screens!inner (
                id,
                screen_key,
                screen_name,
                menu_label,
                route_path,
                icon_key,
                sort_order,
                menu_group_id,
                system_menu_groups!inner (
                  id,
                  menu_group_key,
                  menu_group_name,
                  icon_key,
                  sort_order
                )
              ),
              actions!inner (
                action_key
              )
            )
          `)
          .eq('role_id', roleData.id)
          .eq('tenant_id', systemTenant.id)
          .eq('is_allowed', true)
          .eq('is_active', true);

        if (!isMounted) {
          console.log('🛑 Componente desmontado - cancelando carga de menú (paso 3)');
          return;
        }

        if (screenError) {
          console.error('❌ Error al cargar pantallas:', screenError);
          if (isMounted) {
            setMenuScreens([]);
            setIsLoading(false);
          }
          return;
        }

        console.log('📊 Datos crudos de pantallas:', screenData);

        // Procesar y eliminar duplicados
        const screenMap = new Map<string, MenuScreen>();

        screenData?.forEach((item: any) => {
          const screen = item.screen_actions?.screens;
          const menuGroup = screen?.system_menu_groups;
          const action = item.screen_actions?.actions;

          if (!screen || !menuGroup) {
            console.warn('⚠️ Item sin screen o menuGroup:', item);
            return;
          }

          // Solo agregar si es la acción VIEW (para el menú)
          if (action?.action_key !== 'VIEW') {
            return;
          }

          const screenKey = screen.screen_key;

          if (!screenMap.has(screenKey)) {
            screenMap.set(screenKey, {
              screen_key: screen.screen_key,
              screen_name: screen.screen_name,
              menu_label: screen.menu_label, // ✅ Nombre corto para el menú
              screen_icon_key: screen.icon_key || 'Circle',
              route_path: screen.route_path,
              menu_group_key: menuGroup.menu_group_key,
              menu_group_name: menuGroup.menu_group_name,
              menu_group_icon: menuGroup.icon_key || 'Folder',
              menu_group_sort_order: menuGroup.sort_order,
              screen_sort_order: screen.sort_order,
            });
          }
        });

        const uniqueScreens = Array.from(screenMap.values());

        // Ordenar por grupo y luego por pantalla
        const sortedScreens = uniqueScreens.sort((a, b) => {
          if (a.menu_group_sort_order !== b.menu_group_sort_order) {
            return a.menu_group_sort_order - b.menu_group_sort_order;
          }
          return a.screen_sort_order - b.screen_sort_order;
        });

        if (isMounted) {
          setMenuScreens(sortedScreens);
          console.log('✅ Pantallas cargadas y ordenadas:', sortedScreens.length);
          console.log('📋 Pantallas:', sortedScreens);
        }
      } catch (error: any) {
        // ✅ Ignorar AbortError - es normal cuando se desmonta el componente
        if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
          console.log('🛑 Carga de menú cancelada (componente desmontado)');
          return;
        }
        
        console.error('❌ Error al cargar menú:', error);
        if (isMounted) {
          setMenuScreens([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadMenuScreens();
    
    return () => {
      console.log('🧹 Limpiando - componente desmontado');
      isMounted = false;
    };
  }, [user, profile?.role_key]);

  // Obtener la primera pantalla disponible (ordenada)
  const getFirstAvailableScreen = (): MenuScreen | null => {
    return menuScreens.length > 0 ? menuScreens[0] : null;
  };

  // Obtener pantalla por ruta
  const getScreenByPath = (path: string): MenuScreen | null => {
    return menuScreens.find(screen => screen.route_path === path) || null;
  };

  // Función de reload manual (se usa raramente)
  const reload = async () => {
    console.log('🔄 Reload manual solicitado');
    // Forzar recarga cambiando el estado de profile
    // El useEffect detectará el cambio y recargará automáticamente
  };

  const value: PermissionsContextType = {
    menuScreens,
    isLoading,
    reload,
    getFirstAvailableScreen,
    getScreenByPath,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions debe usarse dentro de PermissionsProvider');
  }
  return context;
}