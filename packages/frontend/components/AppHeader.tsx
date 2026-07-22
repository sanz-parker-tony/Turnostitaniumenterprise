/**
 * AppHeader - Header con breadcrumbs y notificaciones
 */

'use client';

import { API_BASE_URL } from '../utils/api-config';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { useState, useEffect, useRef } from 'react';
import { BarChart3, Bell, ChevronRight, Home, Info, KeyRound, LogOut, User } from 'lucide-react';
import { SidebarTrigger } from './ui/sidebar';
import { Separator } from './ui/separator';
import { formatClientDateTime } from '../utils/date-time';
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
import ChangePasswordModal from './ChangePasswordModal';
import titaniumLogo from '../assets/17ccf6801f7c83b8bea74fbd52400e5b6ac4d64a.png';

type UserNotification = {
  id: string;
  title: string;
  message: string;
  icon_key: string | null;
  is_read: boolean;
  created_at: string;
  action?: {
    required: boolean;
    label: string;
    url: string;
  } | null;
};

type EmployeeHeaderIdentity = {
  fullName: string;
  code: string;
  company: string;
};


function getReadableDateTime(value: string): string {
  return formatClientDateTime(value);
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
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [employeeOrganizationRoute, setEmployeeOrganizationRoute] = useState('');
  const [employeeHeaderIdentity, setEmployeeHeaderIdentity] = useState<EmployeeHeaderIdentity>({
    fullName: '',
    code: '',
    company: '',
  });
  const headerRef = useRef<HTMLElement | null>(null);
  const notificationVersionRef = useRef(0);

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
  const isEmployee = profile?.is_employee_self_service === true;
  const compactUserName = String(profile?.display_name || profile?.email || 'Usuario').trim();

  useEffect(() => {
    let mounted = true;

    const loadEmployeeHeader = async () => {
      if (!isEmployee || !session?.access_token) {
        if (mounted) {
          setEmployeeOrganizationRoute('');
          setEmployeeHeaderIdentity({ fullName: '', code: '', company: '' });
        }
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/dashboard/employee-summary`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !mounted) return;
        const employee = payload?.employee || {};
        const company = payload?.employee_company || {};
        const organizationRoute = String(
          company.organization_route || [
            company.work_location_name,
            company.department_name,
            company.area_name,
            company.job_title_name,
          ].filter(Boolean).join(' / ')
        ).trim();
        setEmployeeOrganizationRoute(organizationRoute);
        setEmployeeHeaderIdentity({
          fullName: `${employee.employee_name || ''} ${employee.employee_lastname || ''}`.trim(),
          code: String(employee.employee_code || '').trim(),
          company: String(company.company_name || '').trim(),
        });
      } catch {
        if (mounted) {
          setEmployeeOrganizationRoute('');
          setEmployeeHeaderIdentity({ fullName: '', code: '', company: '' });
        }
      }
    };

    void loadEmployeeHeader();
    return () => {
      mounted = false;
    };
  }, [isEmployee, session?.access_token]);

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

  const handleNavigateProfile = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/dashboard/profile');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const loadNotifications = async () => {
    const token = session?.access_token || localStorage.getItem('tt-access-token');
    if (!token) return;

    setLoadingNotifications(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/me?include_read=false&limit=20`,
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
      const nextVersion = Number(payload?.realtime?.version || 0);
      if (Number.isFinite(nextVersion)) {
        notificationVersionRef.current = Math.max(notificationVersionRef.current, nextVersion);
      }
    } finally {
      setLoadingNotifications(false);
    }
  };

  const openNotificationAction = (item: UserNotification) => {
    const target = String(item.action?.url || '').trim();
    if (!target.startsWith('/') || target.startsWith('//')) return;
    window.history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleNotificationSelection = async (item: UserNotification) => {
    // Una acción requerida conserva la notificación hasta que el proceso de
    // negocio quede realmente resuelto; abrirla no equivale a atenderla.
    if (!item.action?.required && !item.is_read) await markNotificationAsRead(item.id);
    if (item.action?.url) openNotificationAction(item);
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

    await loadNotifications();
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

    await loadNotifications();
  };

  useEffect(() => {
    if (!session?.access_token) return;
    let active = true;
    let waitController: AbortController | null = null;
    let retryTimer: number | null = null;

    const waitBeforeRetry = () => new Promise<void>((resolve) => {
      retryTimer = window.setTimeout(resolve, 3000);
    });

    const listenForNotifications = async () => {
      await loadNotifications();
      while (active) {
        const token = session?.access_token || localStorage.getItem('tt-access-token');
        if (!token) return;
        waitController = new AbortController();
        try {
          const response = await fetch(
            `${API_BASE_URL}/notifications/events?since=${notificationVersionRef.current}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              signal: waitController.signal,
            }
          );
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
          const nextVersion = Number(payload?.version || 0);
          if (Number.isFinite(nextVersion) && nextVersion > notificationVersionRef.current) {
            notificationVersionRef.current = nextVersion;
            await loadNotifications();
          }
        } catch (error: any) {
          if (!active || error?.name === 'AbortError') return;
          await waitBeforeRetry();
          if (active) await loadNotifications();
        }
      }
    };

    void listenForNotifications();

    const refreshUnreadNotifications = () => {
      if (document.visibilityState === 'visible') {
        void loadNotifications();
      }
    };
    window.addEventListener('focus', refreshUnreadNotifications);
    document.addEventListener('visibilitychange', refreshUnreadNotifications);

    return () => {
      active = false;
      waitController?.abort();
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      window.removeEventListener('focus', refreshUnreadNotifications);
      document.removeEventListener('visibilitychange', refreshUnreadNotifications);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  useEffect(() => {
    if (notificationsOpen) {
      void loadNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationsOpen]);

  return (
    <>
      <header
        ref={headerRef}
        className={`sticky top-0 z-30 flex h-16 shrink-0 items-center gap-1 border-b px-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 bg-background/95 transition-shadow sm:gap-2 sm:px-4 ${isEmployee ? 'sm:h-[72px]' : 'sm:h-16'} ${
          isElevated ? 'shadow-sm' : 'shadow-none'
        }`}
      >
      <div className="flex h-full min-w-0 flex-1 items-center gap-1.5 overflow-hidden sm:gap-2">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <button
          type="button"
          onClick={handleNavigateHome}
          className="flex h-full w-full min-w-0 flex-1 items-center gap-2 overflow-hidden rounded px-1 py-0.5 text-left hover:bg-muted sm:hidden"
          title={`Turnos Titanium · ${employeeHeaderIdentity.fullName || compactUserName}`}
          aria-label={`Ir al inicio. Empleado: ${employeeHeaderIdentity.fullName || compactUserName}`}
        >
          <img src={titaniumLogo} alt="Turnos Titanium" className="h-9 w-9 shrink-0 rounded-md" />
          <span className="block min-w-0 flex-1 leading-none">
            <span className="block truncate text-sm font-bold leading-tight text-slate-900">
              {isEmployee ? employeeHeaderIdentity.fullName || compactUserName : compactUserName}
            </span>
            {isEmployee ? (
              <span className="mt-1 block truncate text-[10px] font-normal leading-tight text-slate-500">
                Código: {employeeHeaderIdentity.code || '-'} · Empresa: {employeeHeaderIdentity.company || '-'}
              </span>
            ) : null}
          </span>
        </button>

        {isEmployee ? (
          <button
            type="button"
            onClick={handleNavigateHome}
            className="hidden min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-muted sm:flex"
            title={`Bienvenido, ${employeeHeaderIdentity.fullName || compactUserName}`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <BarChart3 className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-lg font-bold leading-tight text-slate-900">
                Bienvenido, {employeeHeaderIdentity.fullName || compactUserName}
              </span>
              <span className="block max-w-[58vw] truncate text-[11px] text-slate-500">
                {employeeOrganizationRoute || 'Ruta organizacional no configurada'}
              </span>
            </span>
          </button>
        ) : (
          <Separator orientation="vertical" className="hidden h-6 sm:block" />
        )}
        
        {/* Breadcrumbs */}
        <Breadcrumb className={isEmployee ? 'hidden' : 'hidden min-w-0 overflow-hidden sm:block'}>
          <BreadcrumbList className="min-w-0 flex-nowrap overflow-hidden">
            <BreadcrumbItem>
              <BreadcrumbLink 
                onClick={handleNavigateHome}
                className="flex items-center gap-1 cursor-pointer"
              >
                <Home className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Inicio</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            
            {currentScreen && (
              <>
                <BreadcrumbSeparator className="hidden sm:list-item">
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem className="hidden sm:inline-flex">
                  <BreadcrumbLink className="text-muted-foreground">
                    {currentScreen.menu_group_name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="block max-w-[38vw] truncate font-medium sm:max-w-none">
                    {currentScreen.screen_name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right side - Notifications & User */}
      <div className="relative z-10 ml-1 flex shrink-0 items-center gap-0.5 bg-background/95 sm:gap-2">
        {/* Notifications */}
        <DropdownMenu onOpenChange={setNotificationsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[calc(100vw-1rem)] max-w-80">
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
                    if (!item.action?.url) event.preventDefault();
                    void handleNotificationSelection(item);
                  }}
                >
                  <div className="w-full flex items-center justify-between gap-2">
                    <span className="text-sm font-medium leading-tight">{item.title || 'Notificacion'}</span>
                    {!item.is_read && <span className="h-2 w-2 rounded-full bg-red-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-normal">{item.message}</p>
                  {item.action?.url ? (
                    <span className="text-xs font-medium text-primary">
                      {item.action.label}{item.action.required ? ' · Acción requerida' : ''}
                    </span>
                  ) : null}
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
            <DropdownMenuContent align="end" className="w-[calc(100vw-1rem)] max-w-80">
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
              {isEmployee ? (
                <>
                  <DropdownMenuItem onClick={handleNavigateProfile} className="cursor-pointer">
                    <Info className="mr-2 h-4 w-4" />
                    Más información…
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem onClick={() => setChangePasswordOpen(true)} className="cursor-pointer">
                <KeyRound className="mr-2 h-4 w-4" />
                Cambiar contraseña
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
      </header>
      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        mode="authenticated"
      />
    </>
  );
}
