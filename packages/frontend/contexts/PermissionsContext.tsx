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
const EXCLUDED_MENU_ROUTES = new Set([
  '/dashboard/org/employees',
  '/dashboard/config/shifts',
]);
const EXCLUDED_SCREEN_KEYS = new Set([
  'ORG_EMPLOYEES',
  'SCHEDULE_MANAGEMENT',
]);
const APPROVAL_ALLOWED_ROLES = new Set(['SUPERVISOR', 'RHADMIN']);

function applySupervisorMenuOverrides(screens: MenuScreen[]): MenuScreen[] {
  return screens.map((screen) => {
    const next = { ...screen };

    if (next.menu_group_key === 'EMPLOYEE') {
      next.menu_group_name = 'Aprobar';
    }

    if (
      next.screen_key === 'REQUESTS_MANAGEMENT' ||
      next.screen_key === 'ATT_APPROVALS' ||
      next.route_path === '/dashboard/attendance/approvals' ||
      next.route_path === '/dashboard/employees/requests'
    ) {
      next.screen_name = 'Aprobar Justificaciones';
      next.menu_label = 'Justificaciones';
      next.route_path = '/dashboard/attendance/approvals';
    }

    if (
      next.screen_key === 'SHIFT_CHANGE_APPROVALS' ||
      next.route_path === '/dashboard/employees/shift-change-approvals'
    ) {
      next.screen_name = 'Aprobar Cambio de turnos';
      next.menu_label = 'Cambio de turnos';
      next.route_path = '/dashboard/employees/shift-change-approvals';
    }

    if (
      next.screen_key === 'EMPLOYEE_MANAGEMENT' ||
      next.screen_key === 'TIME_PUNCH_CHANGE_APPROVALS' ||
      next.route_path === '/dashboard/employees/manage' ||
      next.route_path === '/dashboard/employees/time-punch-change-approvals'
    ) {
      next.screen_name = 'Aprobar Marcaciones';
      next.menu_label = 'Marcaciones';
      next.route_path = '/dashboard/employees/time-punch-change-approvals';
    }

    return next;
  });
}

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
        const currentRoleKey = String(profile?.role_key || '').trim().toUpperCase();
        const filteredScreens = sortedScreens.filter((screen: MenuScreen) => {
          if (EXCLUDED_MENU_ROUTES.has(screen.route_path) || EXCLUDED_SCREEN_KEYS.has(screen.screen_key)) {
            return false;
          }
          if (screen.screen_key === 'REQUESTS_MANAGEMENT' && !APPROVAL_ALLOWED_ROLES.has(currentRoleKey)) {
            return false;
          }
          return true;
        });

        const roleAdjustedScreens =
          currentRoleKey === 'SUPERVISOR' || currentRoleKey === 'RHADMIN'
            ? applySupervisorMenuOverrides(filteredScreens)
            : filteredScreens;

        const dedupedScreens = Array.from(
          roleAdjustedScreens.reduce((acc, screen) => {
            const dedupeKey = `${screen.menu_group_key}::${(screen.menu_label || '').trim().toUpperCase()}`;
            const existing = acc.get(dedupeKey);
            if (!existing) {
              acc.set(dedupeKey, screen);
              return acc;
            }
            if (screen.screen_sort_order < existing.screen_sort_order) {
              acc.set(dedupeKey, screen);
            }
            return acc;
          }, new Map<string, MenuScreen>()).values()
        );

        if (isMounted) {
          setMenuScreens(dedupedScreens);
          console.log('✅ Pantallas cargadas y ordenadas:', dedupedScreens.length);
          console.log('📋 Pantallas:', dedupedScreens);
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
