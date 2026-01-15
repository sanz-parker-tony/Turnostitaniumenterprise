import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { getIconComponent } from '../utils/iconMapper';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from './ui/breadcrumb';
import { Menu, Search, Bell, User, LogOut, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { Toaster } from 'sonner@2.0.3';
import logoTurnos from 'figma:asset/17ccf6801f7c83b8bea74fbd52400e5b6ac4d64a.png';
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
import Suscripciones from './Suscripciones';

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

// Mapeo actualizado de screen_key a componente y tab
// Ahora usa los screen_keys reales de la base de datos
const SCREEN_COMPONENT_MAP: { [key: string]: { component: string; tab?: string } } = {
  // Dashboard
  'DASH_MAIN': { component: 'dashboard' },
  'DASH_ALERTS': { component: 'dashboard', tab: 'alertas' },
  'DASH_TRENDS': { component: 'dashboard', tab: 'tendencias' },
  
  // Organización (antes Empresas)
  'ORG_COMPANIES': { component: 'empresas', tab: 'empresas' },
  'ORG_WORK_LOCATIONS': { component: 'empresas', tab: 'localidades' },
  'ORG_DEPARTMENTS': { component: 'empresas', tab: 'departamentos' },
  'ORG_AREAS': { component: 'empresas', tab: 'areas' },
  'ORG_JOB_TITLES': { component: 'empresas', tab: 'cargos' },
  'ORG_PAYROLL_GROUPS': { component: 'empresas', tab: 'roles' },
  'ORG_COST_CENTERS': { component: 'empresas', tab: 'centros' },
  'ORG_WORK_GROUPS': { component: 'empresas', tab: 'grupos' },
  
  // Mantenimiento
  'MAINT_HOLIDAYS': { component: 'mantenimiento', tab: 'feriados' },
  'MAINT_LOOKUPS': { component: 'mantenimiento', tab: 'catalogos' },
  'MAINT_JUSTIFICATION_REASONS': { component: 'mantenimiento', tab: 'justificaciones' },
  'MANT_HOLIDAYS': { component: 'mantenimiento', tab: 'feriados' },
  'MANT_CATALOGS': { component: 'mantenimiento', tab: 'catalogos' },
  'MANT_JUSTIFICATIONS': { component: 'mantenimiento', tab: 'justificaciones' },
  'MANT_ATT_EVENTS': { component: 'mantenimiento', tab: 'eventos' },
  'MANT_MESSAGES': { component: 'mantenimiento', tab: 'mensajes' },
  'MANT_ATT_MOVEMENTS': { component: 'mantenimiento', tab: 'movimientos' },
  
  // Configuración
  'CONF_WORK_PATTERNS': { component: 'configuracion', tab: 'turnos' },
  'CONF_PARAMS': { component: 'configuracion', tab: 'parametros' },
  'CONF_DEVICES': { component: 'configuracion', tab: 'dispositivos' },
  'CONF_MOVEMENTS': { component: 'configuracion', tab: 'movimientos' },
  'CONF_ATT_NOVELTIES': { component: 'configuracion', tab: 'novedades' },
  'CONF_ATT_PROCESS': { component: 'configuracion', tab: 'procesos' },
  'CONF_TENANT_SETTINGS': { component: 'configuracion', tab: 'tenant' },
  'CONF_SURCHARGES': { component: 'configuracion', tab: 'recargos' },
  'CONF_SHIFTS': { component: 'configuracion', tab: 'turnos' },
  
  // Perfiles
  'PROF_LIST': { component: 'perfiles', tab: 'listado' },
  'PROF_PARAMS': { component: 'perfiles', tab: 'parametros' },
  'PROF_WORK_PATTERNS': { component: 'perfiles', tab: 'turnos' },
  'PROF_NOVELTIES': { component: 'perfiles', tab: 'novedades' },
  
  // Empleados
  'EMPL_LIST': { component: 'empleados', tab: 'listado' },
  'EMPL_WORK_PATTERNS': { component: 'empleados', tab: 'horarios' },
  'EMPL_PUNCHES': { component: 'empleados', tab: 'marcaciones' },
  'EMPL_JUSTIFICATIONS': { component: 'empleados', tab: 'justificaciones' },
  'EMPL_PLAN_AI': { component: 'empleados', tab: 'planificacion-ia' },
  'EMPL_PROFILE_SETTINGS': { component: 'empleados', tab: 'configuracion-perfil' },
  'EMPL_ASSIGN_COMPANY': { component: 'empleados', tab: 'asignar-empresa' },
  'EMPL_DOCUMENTS': { component: 'empleados', tab: 'documentos' },
  'EMPL_PROFILES': { component: 'empleados', tab: 'perfiles' },
  'EMPL_ABSENCE_REQUESTS': { component: 'empleados', tab: 'solicitudes-ausencia' },
  
  // Asistencia
  'ATT_TIME_PUNCHES': { component: 'empleados', tab: 'marcaciones' },
  'ATT_ANOMALIES': { component: 'empleados', tab: 'anomalias' },
  'ATT_SHIFT_PLANS': { component: 'empleados', tab: 'planificacion' },
  'ATT_APPROVALS': { component: 'empleados', tab: 'aprobaciones' },
  'ATT_CALC_RESULTS': { component: 'empleados', tab: 'calculos' },
  'ATT_PROCESS_RUNS': { component: 'procesos', tab: 'ejecuciones' },
  
  // Requerimientos
  'REQ_PERMITS': { component: 'solicitudes', tab: 'permisos' },
  'REQ_JUSTIFICATIONS': { component: 'solicitudes', tab: 'justificaciones-sol' },
  'REQ_SHIFT_CHANGES': { component: 'solicitudes', tab: 'cambios' },
  'REQ_REGULARIZATIONS': { component: 'solicitudes', tab: 'regularizacion' },
  
  // Procesos
  'PROC_ATT_PURGE': { component: 'procesos', tab: 'depuracion' },
  'PROC_ATT_SETTLEMENT': { component: 'procesos', tab: 'liquidacion' },
  'PROC_GENERATION': { component: 'procesos', tab: 'generacion' },
  'PROC_APPROVAL': { component: 'procesos', tab: 'aprobacion' },
  'PROC_ADMIN': { component: 'procesos', tab: 'administracion' },
  
  // Sincronización
  'SYNC_IMPORT_EMP': { component: 'sincronizacion', tab: 'importacion-empleados' },
  'SYNC_IMPORT_PUNCHES': { component: 'sincronizacion', tab: 'importacion-marcaciones' },
  'SYNC_EXPORT_PAYROLL': { component: 'sincronizacion', tab: 'exportacion-nomina' },
  
  // Reportes
  'RPT_REPORT_CATALOG': { component: 'reportes', tab: 'disponibles' },
  'RPT_ATTENDANCE_REPORT': { component: 'reportes', tab: 'asistencia' },
  'RPT_NOVELTIES_REPORT': { component: 'reportes', tab: 'novedades' },
  'RPT_ANALYTICS': { component: 'reportes', tab: 'analiticos' },
  'RPT_CATALOG': { component: 'reportes', tab: 'catalogo' },
  'RPT_EXECUTIONS': { component: 'reportes', tab: 'ejecuciones' },
  'RPT_PARAMETERS': { component: 'reportes', tab: 'parametros' },
  'RPT_PERMISSIONS': { component: 'reportes', tab: 'permisos-reportes' },
  
  // Seguridad
  'SEC_SCREENS': { component: 'seguridad', tab: 'pantallas' },
  'SEC_ACTIONS': { component: 'seguridad', tab: 'acciones' },
  'SEC_SCREEN_ACTIONS': { component: 'seguridad', tab: 'pantalla-acciones' },
  'SEC_ROLES': { component: 'seguridad', tab: 'roles' },
  'SEC_ROLE_SCREEN_ACTIONS': { component: 'seguridad', tab: 'permisos-rol' },
  'SEC_USER_ROLES': { component: 'seguridad', tab: 'asignacion-roles' },
  'SEC_USER_ROLE_SCOPES': { component: 'seguridad', tab: 'scopes' },
  'SEC_AUDIT_LOG': { component: 'seguridad', tab: 'auditoria' },
  'SEC_COPY_PERMS': { component: 'usuarios', tab: 'copiar-permisos' },
  'SEC_AUDIT': { component: 'seguridad', tab: 'auditoria' },
  'SEC_MENU_GROUPS': { component: 'seguridad', tab: 'grupos-menu' },
  'SEC_TENANT_MEMBERS': { component: 'seguridad', tab: 'miembros-tenant' },
  'SEC_ROLE_PERMS': { component: 'seguridad', tab: 'permisos-rol' },
  'SEC_SCOPES': { component: 'seguridad', tab: 'scopes' },
  'SEC_LOGIN_SESSIONS': { component: 'seguridad', tab: 'sesiones' },
  
  // Suscripciones
  'SUB_PLANS': { component: 'suscripciones', tab: 'planes' },
  'SUB_TENANT_SUBS': { component: 'suscripciones', tab: 'tenant-subs' },
  'SUB_TRANSACTIONS': { component: 'suscripciones', tab: 'transacciones' },
};

interface MenuItem {
  groupKey: string;
  groupName: string;
  groupIcon: any;
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
  const { user, profile, signOut } = useAuth();
  const { menuScreens, isLoading } = usePermissions();
  const [currentScreen, setCurrentScreen] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unreadCount] = useState(2);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // Construir menú dinámicamente desde permisos efectivos
  const menuItems: MenuItem[] = useMemo(() => {
    if (isLoading || menuScreens.length === 0) {
      console.log('📋 Menu vacío - isLoading:', isLoading, 'screens:', menuScreens.length);
      return [];
    }

    console.log('🔨 Construyendo menú con', menuScreens.length, 'pantallas');

    // Agrupar screens por menu_group
    const groupMap = new Map<string, MenuItem>();

    menuScreens.forEach(screen => {
      const groupKey = screen.menu_group_key;
      const groupName = screen.menu_group_name;
      const groupIcon = screen.menu_group_icon;
      const mapping = SCREEN_COMPONENT_MAP[screen.screen_key];

      // Log para depurar
      console.log('🔍 Processing screen:', {
        screen_key: screen.screen_key,
        screen_name: screen.screen_name,
        screen_icon_key: screen.screen_icon_key,
        menu_group_icon: groupIcon
      });

      if (!mapping) {
        console.warn(`⚠️ No component mapping for screen: ${screen.screen_key}`);
        return;
      }

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          groupKey,
          groupName,
          groupIcon,
          screens: []
        });
      }

      const group = groupMap.get(groupKey)!;
      group.screens.push({
        screenKey: screen.screen_key,
        screenName: screen.screen_name,
        icon: getIconComponent(screen.screen_icon_key),
        component: mapping.component,
        tab: mapping.tab
      });
    });

    const items = Array.from(groupMap.values());
    console.log('✅ Menu construido con', items.length, 'grupos');
    return items;
  }, [menuScreens, isLoading]);

  // Establecer pantalla inicial
  useEffect(() => {
    if (!currentScreen && menuItems.length > 0) {
      const firstScreen = menuItems[0]?.screens[0];
      if (firstScreen) {
        console.log('🎯 Estableciendo pantalla inicial:', firstScreen.screenKey);
        setCurrentScreen(firstScreen.screenKey);
        setExpandedGroups([menuItems[0].groupKey]);
      }
    }
  }, [menuItems, currentScreen]);

  // Encontrar el grupo y screen actual
  const currentGroup = useMemo(() => {
    for (const group of menuItems) {
      const screen = group.screens.find(s => s.screenKey === currentScreen);
      if (screen) {
        return { group, screen };
      }
    }
    return null;
  }, [menuItems, currentScreen]);

  const handleGroupClick = (groupKey: string) => {
    if (expandedGroups.includes(groupKey)) {
      setExpandedGroups(expandedGroups.filter(k => k !== groupKey));
    } else {
      setExpandedGroups([...expandedGroups, groupKey]);
    }
  };

  const handleScreenClick = (groupKey: string, screenKey: string) => {
    console.log('🖱️ Click en pantalla:', screenKey);
    setCurrentScreen(screenKey);
    setExpandedGroups([groupKey]);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0074D9] mx-auto mb-4"></div>
            <p className="text-gray-500">Cargando permisos...</p>
          </div>
        </div>
      );
    }

    if (!currentGroup) {
      return <Dashboard />;
    }

    const { screen } = currentGroup;
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
      case 'suscripciones':
        return <Suscripciones activeTab={screen.tab || 'planes'} title={pageTitle} />;
      default:
        return <Dashboard />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block size-12 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Cargando permisos...</p>
        </div>
      </div>
    );
  }

  if (menuItems.length === 0 && !isLoading) {
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
                <p className="text-foreground">{profile?.display_name || user?.email}</p>
                <p className="text-xs text-muted-foreground capitalize">Administrador</p>
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
        className={`fixed left-0 top-26 bottom-0 w-72 bg-white border-r border-gray-200/80 transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="px-4 py-5 h-full flex flex-col">
          <div className="flex-1 space-y-1.5 overflow-y-auto pr-2">
            {menuItems.map((group) => {
              const isExpanded = expandedGroups.includes(group.groupKey);
              const hasMultipleScreens = group.screens.length > 1;

              if (!hasMultipleScreens) {
                const screen = group.screens[0];
                const Icon = getIconComponent(group.groupIcon);
                const isActive = currentScreen === screen.screenKey;

                return (
                  <button
                    key={group.groupKey}
                    onClick={() => handleScreenClick(group.groupKey, screen.screenKey)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative group ${
                      isActive
                        ? 'bg-[#0074D9]/[0.06] text-[#0074D9]'
                        : 'text-[#2F3A45] hover:bg-gray-50'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-[#0074D9] rounded-r-full" />
                    )}
                    <Icon className={`w-5 h-5 flex-shrink-0 ${
                      isActive ? 'text-[#0074D9]' : 'text-[#6B7280]'
                    }`} />
                    <span className={`text-[15px] flex-1 text-left ${
                      isActive ? 'font-semibold' : 'font-medium'
                    }`}>{group.groupName}</span>
                  </button>
                );
              }

              const hasActiveScreen = group.screens.some(s => s.screenKey === currentScreen);

              return (
                <div key={group.groupKey} className="mb-2">
                  <button
                    onClick={() => handleGroupClick(group.groupKey)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all group ${
                      hasActiveScreen 
                        ? 'text-[#2F3A45]' 
                        : 'text-[#2F3A45] hover:bg-gray-50'
                    }`}
                  >
                    {(() => {
                      const GroupIcon = getIconComponent(group.groupIcon);
                      return <GroupIcon className={`w-5 h-5 flex-shrink-0 ${
                        hasActiveScreen ? 'text-[#0074D9]' : 'text-[#6B7280]'
                      }`} />;
                    })()}
                    
                    <span className="font-semibold text-[15px] flex-1 text-left leading-[1.4]">
                      {group.groupName}
                    </span>
                    
                    <ChevronDown className={`w-4 h-4 transition-all duration-200 ${
                      isExpanded ? 'rotate-180 text-[#0074D9]' : 'text-[#9CA3AF]'
                    }`} />
                  </button>

                  {isExpanded && (
                    <div className="mt-1 space-y-1 pl-9">
                      {group.screens.map((screen) => {
                        const Icon = screen.icon;
                        const isActive = currentScreen === screen.screenKey;
                        
                        return (
                          <button
                            key={screen.screenKey}
                            onClick={() => handleScreenClick(group.groupKey, screen.screenKey)}
                            className={`w-full flex items-center gap-2.5 pl-4 pr-3 py-2.5 rounded-lg transition-all relative ${
                              isActive
                                ? 'bg-[#0074D9]/[0.06] text-[#0074D9]'
                                : 'text-[#6B7280] hover:bg-gray-50 hover:text-[#2F3A45]'
                            }`}
                          >
                            {isActive && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-[#0074D9] rounded-r-full" />
                            )}
                            <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#0074D9]' : 'text-[#6B7280]'}`} />
                            <span className={`text-[14px] text-left leading-[1.5] ${
                              isActive ? 'font-medium' : 'font-normal'
                            }`}>{screen.screenName}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-gray-200/80 space-y-2">
            <div className="px-4 py-3 bg-gray-50/50 rounded-lg">
              <p className="text-xs text-[#6B7280]">Empresa</p>
              <p className="text-sm text-[#2F3A45] mt-0.5 font-medium">{profile?.tenant_name || 'Empresa Demo'}</p>
              <p className="text-xs text-[#6B7280] mt-2">Usuario</p>
              <p className="text-sm text-[#2F3A45] mt-0.5 font-medium">{profile?.username || user?.email}</p>
            </div>
            <div className="px-4 py-2 text-center">
              <p className="text-xs text-[#9CA3AF]">v2.0.0 - Permission Driven</p>
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
              {currentGroup && (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#" className="text-muted-foreground hover:text-foreground">
                      {currentGroup.group.groupName}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-foreground">
                      {currentGroup.screen.screenName}
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
