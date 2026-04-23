/**
 * PermissionsContext - Gestión de permisos y menú dinámico
 * Carga las pantallas permitidas para el usuario basándose en role_screen_actions
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

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
  const { user, profile, session } = useAuth();
  const [menuScreens, setMenuScreens] = useState<MenuScreen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Listener para evento de recarga de permisos
  useEffect(() => {
    const handlePermissionsReload = () => {
      console.log('🔄 [PERMISSIONS] Evento de recarga detectado');
      setReloadTrigger(prev => prev + 1);
    };

    window.addEventListener('permissions-reload', handlePermissionsReload);
    
    return () => {
      window.removeEventListener('permissions-reload', handlePermissionsReload);
    };
  }, []);

  // Cargar menú cuando el usuario/rol cambia o cuando se dispara recarga
  useEffect(() => {
    let isMounted = true; // ✅ Flag dentro del useEffect
    
    const loadMenuScreens = async () => {
      if (!user || !profile?.role_key || !session?.access_token) {
        console.log('⚠️ No hay usuario o rol, limpiando menú');
        if (isMounted) {
          setMenuScreens([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        if (isMounted) setIsLoading(true);
        console.log('🔄 Cargando pantallas del menú por backend endpoint para rol:', profile.role_key);

        const response = await fetch('http://localhost:3001/users/menu-screens', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!isMounted) {
          console.log('🛑 Componente desmontado - cancelando carga de menú');
          return;
        }

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          console.error('❌ Error al cargar pantallas desde backend:', payload);
          if (isMounted) {
            setMenuScreens([]);
            setIsLoading(false);
          }
          return;
        }

        const screens = Array.isArray(payload?.screens) ? payload.screens : [];
        const sortedScreens = screens.sort((a: MenuScreen, b: MenuScreen) => {
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
  }, [user, profile?.role_key, session?.access_token, reloadTrigger]);

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
    setReloadTrigger(prev => prev + 1);
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
