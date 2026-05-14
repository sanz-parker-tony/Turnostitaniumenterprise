/**
 * AppHeader - Header con breadcrumbs y notificaciones
 */

'use client';

import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { useState, useEffect, useRef } from 'react';
import { Bell, ChevronRight, Home, LogOut, User } from 'lucide-react';
import { SidebarTrigger } from './ui/sidebar';
import { Separator } from './ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export function AppHeader() {
  const { profile, signOut } = useAuth();
  const { getScreenByPath, menuScreens } = usePermissions();
  const [currentPath, setCurrentPath] = useState('');
  const [isElevated, setIsElevated] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  // Detectar ruta actual
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname);
      
      const handleLocationChange = () => {
        setCurrentPath(window.location.pathname);
      };
      
      window.addEventListener('popstate', handleLocationChange);
      return () => window.removeEventListener('popstate', handleLocationChange);
    }
  }, []);

  useEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;

    const scrollContainer = headerEl.closest('[data-slot="sidebar-inset"]') as HTMLElement | null;

    const readScrollTop = () => (scrollContainer ? scrollContainer.scrollTop : window.scrollY);
    const updateShadow = () => {
      const next = readScrollTop() > 0;
      setIsElevated((prev) => (prev === next ? prev : next));
    };

    updateShadow();

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateShadow, { passive: true });
      return () => scrollContainer.removeEventListener('scroll', updateShadow);
    }

    window.addEventListener('scroll', updateShadow, { passive: true });
    return () => window.removeEventListener('scroll', updateShadow);
  }, []);

  // Obtener información de la pantalla actual
  const currentScreen = getScreenByPath(currentPath);

  const handleLogout = async () => {
    await signOut();
    // Ya no es necesario redirigir aquí - el AuthContext lo maneja
  };

  const handleNavigateHome = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/dashboard');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 bg-background/95 transition-shadow ${
        isElevated ? 'shadow-sm' : 'shadow-none'
      }`}
    >
      <div className="flex items-center gap-2 flex-1">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-6" />
        
        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink 
                onClick={handleNavigateHome}
                className="flex items-center gap-1 cursor-pointer"
              >
                <Home className="h-3.5 w-3.5" />
                Inicio
              </BreadcrumbLink>
            </BreadcrumbItem>
            
            {currentScreen && (
              <>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink className="text-muted-foreground">
                    {currentScreen.menu_group_name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium">
                    {currentScreen.screen_name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right side - Notifications & User */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                0
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-4 text-center text-sm text-muted-foreground">
              No hay notificaciones nuevas
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{profile?.display_name}</p>
                <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
                <p className="text-xs leading-none text-muted-foreground mt-1">
                  <Badge variant="outline" className="text-xs">
                    {profile?.role_name}
                  </Badge>
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
