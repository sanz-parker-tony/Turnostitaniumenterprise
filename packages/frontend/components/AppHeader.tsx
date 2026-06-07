/**
 * AppHeader - Header con breadcrumbs y notificaciones
 */

'use client';

import { API_BASE_URL } from '../utils/api-config';
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
import { DevicePermissionToolbar } from './shared/DevicePermissionToolbar';

type UserNotification = {
  id: string;
  title: string;
  message: string;
  icon_key: string | null;
  is_read: boolean;
  created_at: string;
};


function getReadableDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString('es-EC', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AppHeader() {
  const { profile, signOut, session } = useAuth();
  const { getScreenByPath, menuScreens } = usePermissions();
  const [currentPath, setCurrentPath] = useState('');
  const [isElevated, setIsElevated] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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
  const roleKey = String(profile?.role_key || '').trim().toUpperCase();
  const showDevicePermissionToolbar = roleKey === 'EMPLOYEE';
  const isKioskPunchRoute = [
    '/dashboard/kiosk/timeclock',
    '/kiosk/punch',
    '/kiosk/timeclock',
  ].includes(currentPath);

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

  const loadNotifications = async (includeRead = false) => {
    const token = session?.access_token || localStorage.getItem('tt-access-token');
    if (!token) return;

    setLoadingNotifications(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/me?include_read=${includeRead ? 'true' : 'false'}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return;

      setNotifications(Array.isArray(payload?.notifications) ? payload.notifications : []);
      setUnreadCount(Number(payload?.unread_count || 0));
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    const token = session?.access_token || localStorage.getItem('tt-access-token');
    if (!token) return;

    await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    await loadNotifications(notificationsOpen);
  };

  const markAllAsRead = async () => {
    const token = session?.access_token || localStorage.getItem('tt-access-token');
    if (!token) return;

    await fetch(`${API_BASE_URL}/notifications/me/read-all`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    await loadNotifications(notificationsOpen);
  };

  useEffect(() => {
    if (!session?.access_token) return;
    void loadNotifications(false);

    const timer = window.setInterval(() => {
      void loadNotifications(false);
    }, 30000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  useEffect(() => {
    if (notificationsOpen) {
      void loadNotifications(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationsOpen]);

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
        {showDevicePermissionToolbar && !isKioskPunchRoute ? <DevicePermissionToolbar /> : null}

        {/* Notifications */}
        <DropdownMenu onOpenChange={setNotificationsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {unreadCount > 0 && (
              <>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    void markAllAsRead();
                  }}
                >
                  Marcar todas como leidas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {loadingNotifications ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Cargando...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No hay notificaciones nuevas</div>
            ) : (
              notifications.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  className="flex flex-col items-start gap-1 py-2"
                  onSelect={(event) => {
                    event.preventDefault();
                    if (!item.is_read) {
                      void markNotificationAsRead(item.id);
                    }
                  }}
                >
                  <div className="w-full flex items-center justify-between gap-2">
                    <span className="text-sm font-medium leading-tight">{item.title || 'Notificacion'}</span>
                    {!item.is_read && <span className="h-2 w-2 rounded-full bg-red-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-normal">{item.message}</p>
                  <span className="text-[11px] text-muted-foreground">{getReadableDateTime(item.created_at)}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
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
            {showDevicePermissionToolbar && !isKioskPunchRoute ? (
              <>
                <div className="px-2 py-1.5">
                  <DevicePermissionToolbar variant="panel" />
                </div>
                <DropdownMenuSeparator />
              </>
            ) : null}
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
