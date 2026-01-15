import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { Button } from './ui/button';
import { 
  Bell, 
  LogOut, 
  User, 
  Menu, 
  ChevronRight, 
  ChevronDown,
  Search, 
  AlertCircle
} from 'lucide-react';
import { Badge } from './ui/badge';
import logoTurnos from 'figma:asset/17ccf6801f7c83b8bea74fbd52400e5b6ac4d64a.png';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';
import { Toaster } from './ui/sonner';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb';
import { getIconComponent } from '../utils/iconMapper';
import Dashboard from './Dashboard';
import Mantenimiento from './Mantenimiento';
import Configuracion from './Configuracion';
import Perfiles from './Perfiles';
import Empresas from './Empresas';
import Empleados from './Empleados';
import Procesos from './Procesos';
import Seguridad from './Seguridad';
import Usuarios from './Usuarios';
import Reporteria from './Reporteria';
import Sincronizacion from './Sincronizacion';
import Solicitudes from './Requerimientos';

// Mapeo de módulos (en producción vendría de lookup_values)
const MODULE_LABELS: { [key: string]: string } = {
  'mod-1': 'Dashboard',
  'mod-2': 'Mantenimiento',
  'mod-3': 'Configuración',
  'mod-4': 'Perfiles',
  'mod-5': 'Empresas',
  'mod-6': 'Empleados',
  'mod-7': 'Procesos',
  'mod-8': 'Seguridad',
  'mod-9': 'Usuarios',
};

// Mapeo de screen_key a componente y tab
const SCREEN_COMPONENT_MAP: { [key: string]: { component: string; tab?: string } } = {
  'DASH_MAIN': { component: 'dashboard' },
  'MANT_HOLIDAYS': { component: 'mantenimiento', tab: 'feriados' },
  'MANT_CATALOGS': { component: 'mantenimiento', tab: 'catalogos' },
  'MANT_JUSTIFICATIONS': { component: 'mantenimiento', tab: 'justificaciones' },
  'CONF_SHIFTS': { component: 'configuracion', tab: 'turnos' },
  'CONF_PARAMS': { component: 'configuracion', tab: 'parametros' },
  'CONF_DEVICES': { component: 'configuracion', tab: 'dispositivos' },
  'CONF_MOVEMENTS': { component: 'configuracion', tab: 'movimientos' },
  'CONF_NOVELTIES': { component: 'configuracion', tab: 'novedades' },
  'PERF_LIST': { component: 'perfiles', tab: 'listado' },
  'PERF_PARAMS': { component: 'perfiles', tab: 'parametros' },
  'PERF_SHIFTS': { component: 'perfiles', tab: 'turnos' },
  'PERF_NOVELTIES': { component: 'perfiles', tab: 'novedades' },
  'EMP_COMPANY': { component: 'empresas', tab: 'empresas' },
  'EMP_LOCATION': { component: 'empresas', tab: 'localidades' },
  'EMP_DEPARTMENT': { component: 'empresas', tab: 'departamentos' },
  'EMP_AREA': { component: 'empresas', tab: 'areas' },
  'EMP_POSITION': { component: 'empresas', tab: 'cargos' },
  'EMP_PAYROLL_ROLE': { component: 'empresas', tab: 'roles' },
  'EMP_COST_CENTER': { component: 'empresas', tab: 'centros' },
  'EMP_GROUP': { component: 'empresas', tab: 'grupos' },
  'EMPL_LIST': { component: 'empleados', tab: 'listado' },
  'EMPL_SHIFTS': { component: 'empleados', tab: 'horarios' },
  'EMPL_PUNCHES': { component: 'empleados', tab: 'marcaciones' },
  'EMPL_JUSTIFICATIONS': { component: 'empleados', tab: 'justificaciones' },
  'EMPL_PLAN_AI': { component: 'empleados', tab: 'planificacion-ia' },
  'REQ_PERMITS': { component: 'solicitudes', tab: 'permisos' },
  'REQ_JUSTIFICATIONS': { component: 'solicitudes', tab: 'justificaciones-sol' },
  'REQ_SHIFT_CHANGES': { component: 'solicitudes', tab: 'cambios' },
  'REQ_REGULARIZATION': { component: 'solicitudes', tab: 'regularizacion' },
  'PROC_PURGE': { component: 'procesos', tab: 'depuracion' },
  'PROC_SETTLEMENT': { component: 'procesos', tab: 'liquidacion' },
  'PROC_GENERATION': { component: 'procesos', tab: 'generacion' },
  'PROC_APPROVAL': { component: 'procesos', tab: 'aprobacion' },
  'PROC_ADMIN': { component: 'procesos', tab: 'administracion' },
  'SYNC_IMPORT_EMP': { component: 'sincronizacion', tab: 'importacion-empleados' },
  'SYNC_IMPORT_PUNCHES': { component: 'sincronizacion', tab: 'importacion-marcaciones' },
  'SYNC_EXPORT_PAYROLL': { component: 'sincronizacion', tab: 'exportacion-nomina' },
  'RPT_AVAILABLE': { component: 'reportes', tab: 'disponibles' },
  'RPT_ATTENDANCE': { component: 'reportes', tab: 'asistencia' },
  'RPT_NOVELTIES': { component: 'reportes', tab: 'novedades' },
  'RPT_ANALYTICS': { component: 'reportes', tab: 'analiticos' },
  'SEC_DASHBOARD': { component: 'seguridad', tab: 'dashboard' },
  'SEC_SCREENS': { component: 'seguridad', tab: 'pantallas' },
  'SEC_ACTIONS': { component: 'seguridad', tab: 'acciones' },
  'SEC_SCREEN_ACTIONS': { component: 'seguridad', tab: 'pantalla-acciones' },
  'SEC_ROLES': { component: 'seguridad', tab: 'roles' },
  'SEC_ROLE_PERMS': { component: 'seguridad', tab: 'permisos-rol' },
  'SEC_USER_ROLES': { component: 'seguridad', tab: 'asignacion-roles' },
  'SEC_SCOPES': { component: 'seguridad', tab: 'scopes' },
  'SEC_COPY_PERMS': { component: 'seguridad', tab: 'copiar-permisos' },
  'SEC_AUDIT': { component: 'seguridad', tab: 'auditoria' },
  'USR_COPY_PERMS': { component: 'usuarios', tab: 'copiar-permisos' },
  'USR_ACTION_PERMS': { component: 'usuarios', tab: 'acciones' },
  'USR_INFO_PERMS': { component: 'usuarios', tab: 'informacion' },
  'USR_PRINT_PERMS': { component: 'usuarios', tab: 'impresion' },
};

interface MenuItem {
  moduleId: string;
  moduleLabel: string;
  screens: {
    screenKey: string;
    screenName: string;
    icon: any;
    component: string;
    tab?: string;
  }[];
}

const mockNotifications = [
  { id: 1, message: '5 empleados con atraso hoy', time: 'Hace 10 min', unread: true, type: 'warning' },
  { id: 2, message: 'Turno nocturno completado', time: 'Hace 1 hora', unread: true, type: 'success' },
  { id: 3, message: 'Nueva solicitud de sobretiempo', time: 'Hace 2 horas', unread: false, type: 'info' },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const { effectivePermissions, isLoading } = usePermissions();
  const [currentScreen, setCurrentScreen] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unreadCount] = useState(2);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  // Construir menú dinámicamente desde permisos efectivos
  const menuItems: MenuItem[] = useMemo(() => {
    if (isLoading || effectivePermissions.length === 0) return [];

    // Agrupar screens por módulo
    const moduleMap = new Map<string, MenuItem>();

    effectivePermissions.forEach(perm => {
      const moduleId = perm.module_id;
      const moduleLabel = MODULE_LABELS[moduleId] || moduleId;
      const mapping = SCREEN_COMPONENT_MAP[perm.screen_key];

      if (!mapping) {
        console.warn(`No component mapping for screen: ${perm.screen_key}`);
        return;
      }

      if (!moduleMap.has(moduleId)) {
        moduleMap.set(moduleId, {
          moduleId,
          moduleLabel,
          screens: []
        });
      }

      const module = moduleMap.get(moduleId)!;
      module.screens.push({
        screenKey: perm.screen_key,
        screenName: perm.screen_name,
        icon: getIconComponent(perm.icon_key),
        component: mapping.component,
        tab: mapping.tab
      });
    });

    // Convertir a array y ordenar
    return Array.from(moduleMap.values());
  }, [effectivePermissions, isLoading]);

  // Establecer pantalla inicial
  useEffect(() => {
    if (!currentScreen && menuItems.length > 0) {
      const firstScreen = menuItems[0]?.screens[0];
      if (firstScreen) {
        setCurrentScreen(firstScreen.screenKey);
        // Expandir el primer módulo
        setExpandedModules([menuItems[0].moduleId]);
      }
    }
  }, [menuItems, currentScreen]);

  // Encontrar el módulo y screen actual
  const currentModule = useMemo(() => {
    for (const module of menuItems) {
      const screen = module.screens.find(s => s.screenKey === currentScreen);
      if (screen) {
        return { module, screen };
      }
    }
    return null;
  }, [menuItems, currentScreen]);

  const handleModuleClick = (moduleId: string) => {
    if (expandedModules.includes(moduleId)) {
      setExpandedModules(expandedModules.filter(id => id !== moduleId));
    } else {
      setExpandedModules([...expandedModules, moduleId]);
    }
  };

  const handleScreenClick = (moduleId: string, screenKey: string) => {
    setCurrentScreen(screenKey);
    // Asegurar que el módulo esté expandido
    if (!expandedModules.includes(moduleId)) {
      setExpandedModules([...expandedModules, moduleId]);
    }
  };

  const renderContent = () => {
    if (!currentModule) {
      return <Dashboard />;
    }

    const { screen } = currentModule;
    const pageTitle = screen.screenName;

    switch (screen.component) {
      case 'dashboard':
        return <Dashboard />;
      case 'mantenimiento':
        return <Mantenimiento activeTab={screen.tab || 'feriados'} title={pageTitle} />;
      case 'configuracion':
        return <Configuracion activeTab={screen.tab || 'dispositivos'} title={pageTitle} />;
      case 'perfiles':
        return <Perfiles activeTab={screen.tab || 'listado'} title={pageTitle} />;
      case 'empresas':
        return <Empresas activeTab={screen.tab || 'empresas'} title={pageTitle} />;
      case 'empleados':
        return <Empleados activeTab={screen.tab || 'listado'} title={pageTitle} />;
      case 'solicitudes':
        return <Solicitudes activeTab={screen.tab || 'permisos'} title={pageTitle} />;
      case 'procesos':
        return <Procesos activeTab={screen.tab || 'depuracion'} title={pageTitle} />;
      case 'sincronizacion':
        return <Sincronizacion activeTab={screen.tab || 'importacion-empleados'} title={pageTitle} />;
      case 'reportes':
        return <Reporteria activeTab={screen.tab || 'disponibles'} title={pageTitle} />;
      case 'seguridad':
        return <Seguridad activeTab={screen.tab || 'dashboard'} title={pageTitle} />;
      case 'usuarios':
        return <Usuarios activeTab={screen.tab || 'copiar-permisos'} title={pageTitle} />;
      default:
        return <Dashboard />;
    }
  };

  // Si está cargando permisos, mostrar loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando permisos...</p>
        </div>
      </div>
    );
  }

  // Si no tiene permisos, mostrar mensaje
  if (menuItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sin Permisos Asignados</h2>
          <p className="text-muted-foreground mb-6">
            Tu usuario no tiene permisos configurados. Contacta al administrador del sistema.
          </p>
          <Button onClick={signOut}>Cerrar Sesión</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      
      {/* Demo Banner */}
      <div className="bg-gradient-to-r from-[#0074D9] to-[#2ECC71] text-white py-2 px-6 fixed top-0 left-0 right-0 z-50 shadow-lg">
        <div className="flex items-center justify-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span className="font-medium">MODO DEMOSTRACIÓN</span>
          <span className="hidden md:inline">- Sistema basado en permisos dinámicos</span>
        </div>
      </div>

      {/* Top Bar - Fixed */}
      <div className="bg-white border-b border-border fixed top-10 left-0 right-0 z-40 shadow-sm">
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-accent"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <img src={logoTurnos} alt="Turnos Titanium Logo" className="w-10 h-10 rounded-xl shadow-md" />
              <div>
                <h1 className="text-lg text-foreground">Turnos Titanium</h1>
                <p className="text-xs text-muted-foreground">Sistema de Control de Asistencias</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Global Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empleado, turno..."
                className="pl-10 w-80 bg-muted/50 border-border"
              />
            </div>

            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-accent">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 px-1.5 min-w-5 h-5 bg-destructive border-2 border-white">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="end">
                <div className="p-4 border-b border-border">
                  <h3 className="text-sm">Notificaciones</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{unreadCount} sin leer</p>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {mockNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-colors ${
                        notif.unread ? 'bg-accent/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          notif.type === 'warning' ? 'bg-yellow-500' :
                          notif.type === 'success' ? 'bg-green-600' :
                          'bg-info'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm text-foreground">{notif.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-border">
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    Ver todas las notificaciones
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* User Menu */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/50 border border-border hover:border-primary/30 transition-colors">
              <div className="bg-primary p-2 rounded-full">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-sm">
                <p className="text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </div>

            {/* Logout */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={signOut} 
              title="Cerrar Sesión"
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sidebar - Fixed */}
      <div
        className={`fixed left-0 top-26 bottom-0 w-72 bg-white border-r border-border transition-all duration-300 shadow-sm ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="p-4 h-full flex flex-col">
          <div className="flex-1 space-y-1 overflow-y-auto">
            {menuItems.map((module) => {
              const isExpanded = expandedModules.includes(module.moduleId);
              const hasMultipleScreens = module.screens.length > 1;

              // Si el módulo solo tiene una pantalla, mostrarla directamente
              if (!hasMultipleScreens) {
                const screen = module.screens[0];
                const Icon = screen.icon;
                const isActive = currentScreen === screen.screenKey;

                return (
                  <button
                    key={module.moduleId}
                    onClick={() => handleScreenClick(module.moduleId, screen.screenKey)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group ${
                      isActive
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : ''
                    }`} />
                    <span className="text-sm flex-1 text-left">{module.moduleLabel}</span>
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </button>
                );
              }

              // Si tiene múltiples pantallas, mostrar menú expandible
              return (
                <div key={module.moduleId}>
                  {/* Module Header */}
                  <button
                    onClick={() => handleModuleClick(module.moduleId)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all group text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <div className="w-5 h-5" /> {/* Spacer for alignment */}
                    <span className="text-sm flex-1 text-left font-medium">{module.moduleLabel}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`} />
                  </button>

                  {/* Screens */}
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {module.screens.map((screen) => {
                        const Icon = screen.icon;
                        const isActive = currentScreen === screen.screenKey;
                        
                        return (
                          <button
                            key={screen.screenKey}
                            onClick={() => handleScreenClick(module.moduleId, screen.screenKey)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm ${
                              isActive
                                ? 'bg-secondary text-white shadow-sm'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />
                            <span className="text-left">{screen.screenName}</span>
                            {isActive && (
                              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-border space-y-2">
            <div className="px-4 py-3 bg-muted/50 rounded-xl">
              <p className="text-xs text-muted-foreground">Empresa</p>
              <p className="text-sm text-foreground mt-0.5">{user?.company}</p>
              {user?.area && (
                <>
                  <p className="text-xs text-muted-foreground mt-2">Área</p>
                  <p className="text-sm text-foreground mt-0.5">{user.area}</p>
                </>
              )}
            </div>
            <div className="px-4 py-2 text-center">
              <p className="text-xs text-muted-foreground">v2.0.0 - Permission Driven</p>
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div
        className={`pt-26 transition-all duration-300 ${
          sidebarOpen ? 'ml-72' : 'ml-0'
        }`}
      >
        {/* Breadcrumbs */}
        <div className="bg-white border-b border-border px-6 py-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#" className="text-muted-foreground hover:text-foreground">
                  Inicio
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              {currentModule && (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#" className="text-muted-foreground hover:text-foreground">
                      {currentModule.module.moduleLabel}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-foreground">
                      {currentModule.screen.screenName}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Content Area */}
        <div className="p-6 min-h-[calc(100vh-12rem)]">
          {renderContent()}
        </div>

        {/* Footer */}
        <footer className="border-t border-border bg-white py-4 px-6">
          <p className="text-center text-xs text-gray-500">
            Designed by <span className="text-[#0074D9] font-medium">Titanium-Labs Corp.</span> 2025 - Permission-Driven Architecture
          </p>
        </footer>
      </div>
    </div>
  );
}