/**
 * getSidebarData.ts - Turnos Titanium Enterprise
 * Versión simplificada: obtiene sidebar usando get_user_screens() RPC
 * (Compatible con PermissionsContext actual)
 */

import { createClient } from '@supabase/supabase-js';
import { SCREEN_ROUTE_MAP } from '../auth/role-router';

// ============================================================================
// TIPOS
// ============================================================================

export interface SidebarScreen {
  screenKey: string;
  screenName: string;
  screenTranslation: string | null;
  iconKey: string;
  routePath: string;
  sortOrder: number;
}

export interface SidebarGroup {
  groupKey: string;
  groupName: string;
  groupTranslation: string | null;
  iconKey: string;
  screens: SidebarScreen[];
  sortOrder: number;
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

export async function getSidebarDataFromRPC(languageCode: string = 'es'): Promise<SidebarGroup[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    // Obtener usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user?.email) {
      console.error('[SIDEBAR] Error obteniendo usuario:', userError);
      return [];
    }

    console.log('[SIDEBAR] Cargando sidebar para:', user.email);

    // Usar RPC con parámetro (la versión que existe en BD)
    const { data: screens, error } = await supabase.rpc('get_user_screens', {
      p_user_email: user.email
    });

    if (error) {
      console.error('[SIDEBAR] Error llamando get_user_screens:', error);
      return [];
    }

    if (!screens || screens.length === 0) {
      console.warn('[SIDEBAR] get_user_screens retornó vacío');
      return [];
    }

    console.log('[SIDEBAR] Screens desde RPC:', screens.length);
    console.log('[SIDEBAR] Primera screen:', screens[0]);
    console.log('[SIDEBAR] Campos disponibles:', Object.keys(screens[0]));

    // Agrupar por menu_group_key
    const groupsMap = new Map<string, SidebarGroup>();

    screens.forEach((screen: any) => {
      const groupKey = screen.menu_group_key;

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          groupKey,
          groupName: screen.menu_group_name,
          groupTranslation: null, // No viene de la función actual
          iconKey: screen.menu_group_icon,
          screens: [],
          sortOrder: screen.menu_group_display_order || 0,
        });
      }

      const group = groupsMap.get(groupKey)!;

      group.screens.push({
        screenKey: screen.screen_key,
        screenName: screen.screen_name,
        screenTranslation: null, // No viene de la función actual
        iconKey: screen.screen_icon_key,
        routePath: screen.screen_route || SCREEN_ROUTE_MAP[screen.screen_key] || '/dashboard',
        sortOrder: screen.screen_display_order || 0,
      });
    });

    // Ordenar
    const groups = Array.from(groupsMap.values())
      .sort((a, b) => a.sortOrder - b.sortOrder);

    groups.forEach(group => {
      group.screens.sort((a, b) => a.sortOrder - b.sortOrder);
    });

    console.log('[SIDEBAR] Grupos desde RPC:', groups.length);
    return groups;
  } catch (err) {
    console.error('[SIDEBAR] Error inesperado en RPC:', err);
    return [];
  }
}
