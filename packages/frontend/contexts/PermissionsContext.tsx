/**
 * PermissionsContext - Gestión de permisos y menú dinámico
 * Carga las pantallas permitidas para el usuario basándose en role_screen_actions
 */

'use client';

import { buildApiUrl } from '../utils/api-config';
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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
  loadError: string | null;
  reload: () => Promise<void>;
  getFirstAvailableScreen: () => MenuScreen | null;
  getScreenByPath: (path: string) => MenuScreen | null;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [menuScreens, setMenuScreens] = useState<MenuScreen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const hasLoadedMenuRef = useRef(false);
  const lastMenuIdentityRef = useRef('');

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
      if (!user || !session?.access_token) {
        console.log('⚠️ No hay usuario o rol, limpiando menú');
        if (isMounted) {
          setMenuScreens([]);
          setLoadError(null);
          setIsLoading(false);
          hasLoadedMenuRef.current = false;
          lastMenuIdentityRef.current = '';
        }
        return;
      }

      // The backend resolves roles from the signed identity. Do not block the
      // menu while the visual profile is recovering after a transient outage.
      const menuIdentity = `${user.id}:${session.access_token}`;
      const isNewMenuIdentity = lastMenuIdentityRef.current !== menuIdentity;
      const shouldShowBlockingLoading = isNewMenuIdentity || !hasLoadedMenuRef.current;

      try {
        if (isMounted && shouldShowBlockingLoading) setIsLoading(true);
        if (isMounted && isNewMenuIdentity) setMenuScreens([]);
        if (isMounted) setLoadError(null);
        console.log('[PERMISSIONS] Cargando pantallas autorizadas desde el backend');

        let response: Response | null = null;
        let payload: any = {};
        const retryDelays = [0, 350, 900];

        for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
          if (retryDelays[attempt] > 0) {
            await new Promise((resolve) => window.setTimeout(resolve, retryDelays[attempt]));
          }
          if (!isMounted) return;

          try {
            response = await fetch(buildApiUrl('/users/menu-screens'), {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });
            payload = await response.json().catch(() => ({}));

            if (response.ok || response.status === 401 || response.status === 403) {
              break;
            }
          } catch (requestError) {
            response = null;
            payload = { error: requestError instanceof Error ? requestError.message : String(requestError) };
          }
        }

        if (!isMounted) {
          console.log('🛑 Componente desmontado - cancelando carga de menú');
          return;
        }

        if (!response?.ok) {
          console.error('❌ Error al cargar pantallas desde backend:', payload);
          throw new Error(
            payload?.error ||
            (response ? `No se pudo cargar el menú (HTTP ${response.status})` : 'No se pudo conectar con el backend para cargar el menú')
          );
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
          setLoadError(null);
          hasLoadedMenuRef.current = true;
          lastMenuIdentityRef.current = menuIdentity;
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
          if (shouldShowBlockingLoading) setMenuScreens([]);
          setLoadError(error?.message || 'No se pudo cargar el menú autorizado');
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
  }, [user, session?.access_token, reloadTrigger]);

  // Obtener la primera pantalla disponible (ordenada)
  const getFirstAvailableScreen = (): MenuScreen | null => {
    return menuScreens.length > 0 ? menuScreens[0] : null;
  };

  // Obtener pantalla por ruta
  const getScreenByPath = (path: string): MenuScreen | null => {
    const target = normalizePath(path);
    return (
      menuScreens.find((screen) => normalizePath(screen.route_path) === target) ||
      null
    );
  };

  // Función de reload manual (se usa raramente)
  const reload = async () => {
    console.log('🔄 Reload manual solicitado');
    setReloadTrigger(prev => prev + 1);
  };

  const value: PermissionsContextType = {
    menuScreens,
    isLoading,
    loadError,
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
  const normalizePath = (path: string): string => {
    const raw = String(path || '').trim();
    if (!raw) return '';
    const noHash = raw.split('#')[0];
    const noQuery = noHash.split('?')[0];
    const decoded = decodeURIComponent(noQuery);
    if (decoded.length > 1 && decoded.endsWith('/')) return decoded.slice(0, -1);
    return decoded;
  };
