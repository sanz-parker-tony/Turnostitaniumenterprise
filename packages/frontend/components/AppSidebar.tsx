/**
 * AppSidebar - Sidebar dinámico basado en RBAC
 * 
 * ROLES Y SUS MENÚS:
 * - SYSTEM_ADMIN: SECURITY
 * - TENANT_ADMIN: MAINT, CONFIG, ORG
 * - RRHH_ADMIN: APROVE, PROCESSES, REPORTS
 * - SUPERVISOR: APROVE, PROCESSES, REPORTS
 * - EMPLOYEE: KIOSK
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions, MenuScreen } from '../contexts/PermissionsContext';
import { Building2, AlertTriangle, Database } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from './ui/sidebar';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';

interface GroupedMenuScreens {
  [groupKey: string]: {
    groupName: string;
    groupIcon: string;
    screens: MenuScreen[];
    sortOrder: number;
  };
}

// Helper para obtener ícono dinámico
const getDynamicIcon = (iconName: string) => {
  const Icon = (LucideIcons as any)[iconName] || LucideIcons.CircleDot;
  return Icon;
};

export function AppSidebar() {
  const { profile } = useAuth();
  const { menuScreens, isLoading } = usePermissions();
  const [currentPath, setCurrentPath] = useState('');
  const [openGroup, setOpenGroup] = useState<string>('');

  // Agrupar pantallas por grupo de menú
  const groupedScreens: GroupedMenuScreens = menuScreens.reduce((acc, screen) => {
    const groupKey = screen.menu_group_key;
    
    if (!acc[groupKey]) {
      acc[groupKey] = {
        groupName: screen.menu_group_name,
        groupIcon: screen.menu_group_icon,
        screens: [],
        sortOrder: screen.menu_group_sort_order,
      };
    }
    
    acc[groupKey].screens.push(screen);
    return acc;
  }, {} as GroupedMenuScreens);

  // Ordenar los grupos por sortOrder
  const sortedGroups = Object.entries(groupedScreens).sort(
    ([, a], [, b]) => a.sortOrder - b.sortOrder
  );

  // Detectar ruta actual y abrir grupo correspondiente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      setCurrentPath(path);
      
      // Encontrar el grupo de la pantalla actual
      const currentScreen = menuScreens.find(s => s.route_path === path);
      if (currentScreen && !openGroup) {
        setOpenGroup(currentScreen.menu_group_key);
      }
      
      // Listener para cambios de ruta
      const handleLocationChange = () => {
        const newPath = window.location.pathname;
        setCurrentPath(newPath);
        
        // Actualizar grupo abierto según la nueva ruta
        const screen = menuScreens.find(s => s.route_path === newPath);
        if (screen) {
          setOpenGroup(screen.menu_group_key);
        }
      };
      
      window.addEventListener('popstate', handleLocationChange);
      return () => window.removeEventListener('popstate', handleLocationChange);
    }
  }, [menuScreens, openGroup]);

  // Manejar navegación a pantalla
  const handleNavigate = (screen: MenuScreen) => {
    // Abrir solo el grupo de esta pantalla
    setOpenGroup(screen.menu_group_key);
    
    // Actualizar ruta actual
    setCurrentPath(screen.route_path);
    
    // Navegar SIN recargar la página (usar History API)
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', screen.route_path);
      
      // Disparar evento personalizado para que el Router lo detecte
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Log para debugging
  useEffect(() => {
    if (!isLoading && menuScreens.length > 0) {
      console.log('📋 MENÚ CARGADO:', {
        rol: profile?.role_key,
        totalPantallas: menuScreens.length,
        grupos: Object.keys(groupedScreens),
        primeraRuta: menuScreens[0]?.route_path,
      });
    }
  }, [isLoading, menuScreens, profile]);

  return (
    <Sidebar collapsible="icon" className="border-r">
      {/* Header */}
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#0074D9] text-white">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Turnos Titanium</span>
                <span className="truncate text-xs">{profile?.tenant_name || 'Enterprise'}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Content - Sin scroll interno */}
      <SidebarContent className="overflow-visible">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 gap-3">
            <div className="size-8 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin"></div>
            <div className="text-sm text-muted-foreground">Cargando menú...</div>
          </div>
        ) : sortedGroups.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-sm text-muted-foreground text-center">
              <p className="font-medium mb-1">No hay pantallas disponibles</p>
              <p className="text-xs">Contacta al administrador</p>
            </div>
          </div>
        ) : (
          <Accordion
            type="single"
            collapsible
            value={openGroup}
            onValueChange={setOpenGroup}
            className="w-full"
          >
            {sortedGroups.map(([groupKey, group]) => {
              const GroupIcon = getDynamicIcon(group.groupIcon);
              
              return (
                <AccordionItem key={groupKey} value={groupKey} className="border-0">
                  <SidebarGroup>
                    <SidebarGroupLabel asChild>
                      <AccordionTrigger className="px-2 py-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md transition-colors [&[data-state=open]>svg]:rotate-90">
                        <div className="flex items-center gap-2 flex-1">
                          <GroupIcon className="size-4" />
                          <span className="text-sm font-medium">{group.groupName}</span>
                        </div>
                      </AccordionTrigger>
                    </SidebarGroupLabel>
                    
                    <AccordionContent className="pb-0">
                      <SidebarMenuSub>
                        {group.screens.map((screen) => {
                          const ScreenIcon = getDynamicIcon(screen.screen_icon_key);
                          const isActive = currentPath === screen.route_path;
                          
                          return (
                            <SidebarMenuSubItem key={screen.screen_key}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isActive}
                              >
                                <button
                                  onClick={() => handleNavigate(screen)}
                                  className="w-full"
                                >
                                  <ScreenIcon className="size-4" />
                                  <span>{screen.menu_label}</span>
                                </button>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </AccordionContent>
                  </SidebarGroup>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" className="text-xs text-muted-foreground">
              <div className="flex flex-col text-left w-full">
                <div className="font-medium text-foreground truncate">{profile?.display_name}</div>
                <div className="text-xs truncate">{profile?.role_name}</div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
