import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Plus, Edit, Trash2, Shield, Lock, Users, Monitor, MousePointerClick, 
  Search, Download, ChevronLeft, ChevronRight, Save, X, Copy, CheckCircle, 
  AlertCircle, Eye, Building, Briefcase, MapPin, DollarSign, UserCircle,
  Activity, FileText, Settings, ShieldAlert
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';
import CopiarPermisos from './security/CopiarPermisos';
import SuperAdminOnly from './security/SuperAdminOnly';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// TIPOS Y DATOS MOCK
// ============================================================================

interface Screen {
  id: string;
  screen_key: string;
  screen_name: string;
  module_id: string;
  route_path: string;
  sort_order: number;
  is_active: boolean;
}

interface Action {
  id: string;
  action_key: string;
  action_name: string;
  is_active: boolean;
}

interface ScreenAction {
  id: string;
  screen_id: string;
  action_id: string;
  ui_element_key: string;
  is_active: boolean;
}

interface Role {
  id: string;
  tenant_id: string;
  role_key: string;
  role_name: string;
  role_scope_id: string;
  is_active: boolean;
}

interface RoleScreenAction {
  id: string;
  tenant_id: string;
  role_id: string;
  screen_action_id: string;
  is_allowed: boolean;
  is_active: boolean;
}

interface UserRole {
  id: string;
  tenant_id: string;
  user_id: string;
  role_id: string;
  company_id: string | null;
  is_active: boolean;
}

interface UserRoleScope {
  id: string;
  tenant_id: string;
  user_role_id: string;
  scope_type_id: string;
  scope_entity_id: string;
  is_active: boolean;
}

// MOCK DATA - Módulos (de lookup_values)
const mockModules = [
  { id: 'mod-1', lookup_key: 'DASHBOARD', lookup_label: 'Dashboard' },
  { id: 'mod-2', lookup_key: 'MANTENIMIENTO', lookup_label: 'Mantenimiento' },
  { id: 'mod-3', lookup_key: 'CONFIGURACION', lookup_label: 'Configuración' },
  { id: 'mod-4', lookup_key: 'PERFILES', lookup_label: 'Perfiles' },
  { id: 'mod-5', lookup_key: 'EMPRESAS', lookup_label: 'Empresas' },
  { id: 'mod-6', lookup_key: 'EMPLEADOS', lookup_label: 'Empleados' },
  { id: 'mod-7', lookup_key: 'PROCESOS', lookup_label: 'Procesos' },
  { id: 'mod-8', lookup_key: 'SEGURIDAD', lookup_label: 'Seguridad' },
  { id: 'mod-9', lookup_key: 'USUARIOS', lookup_label: 'Usuarios' },
];

// MOCK DATA - Screens (SYSTEM)
const mockScreens: Screen[] = [
  { id: 'scr-1', screen_key: 'DASH_MAIN', screen_name: 'Dashboard Principal', module_id: 'mod-1', route_path: '/dashboard', sort_order: 1, is_active: true },
  { id: 'scr-2', screen_key: 'MANT_HOLIDAYS', screen_name: 'Feriados', module_id: 'mod-2', route_path: '/mantenimiento/feriados', sort_order: 2, is_active: true },
  { id: 'scr-3', screen_key: 'MANT_CATALOGS', screen_name: 'Catálogos', module_id: 'mod-2', route_path: '/mantenimiento/catalogos', sort_order: 3, is_active: true },
  { id: 'scr-4', screen_key: 'CONF_SHIFTS', screen_name: 'Turnos', module_id: 'mod-3', route_path: '/configuracion/turnos', sort_order: 4, is_active: true },
  { id: 'scr-5', screen_key: 'CONF_PARAMS', screen_name: 'Parámetros Generales', module_id: 'mod-3', route_path: '/configuracion/parametros', sort_order: 5, is_active: true },
  { id: 'scr-6', screen_key: 'PERF_LIST', screen_name: 'Listado de Perfiles', module_id: 'mod-4', route_path: '/perfiles', sort_order: 6, is_active: true },
  { id: 'scr-7', screen_key: 'EMP_COMPANY', screen_name: 'Empresas', module_id: 'mod-5', route_path: '/empresas/empresas', sort_order: 7, is_active: true },
  { id: 'scr-8', screen_key: 'EMP_LOCATION', screen_name: 'Localidades', module_id: 'mod-5', route_path: '/empresas/localidades', sort_order: 8, is_active: true },
  { id: 'scr-9', screen_key: 'EMPL_LIST', screen_name: 'Listado de Empleados', module_id: 'mod-6', route_path: '/empleados', sort_order: 9, is_active: true },
  { id: 'scr-10', screen_key: 'EMPL_SHIFTS', screen_name: 'Planificación de Turnos', module_id: 'mod-6', route_path: '/empleados/planificacion', sort_order: 10, is_active: true },
  { id: 'scr-11', screen_key: 'PROC_SYNC', screen_name: 'Sincronización de Marcaciones', module_id: 'mod-7', route_path: '/procesos/sincronizacion', sort_order: 11, is_active: true },
  { id: 'scr-12', screen_key: 'SEC_SCREENS', screen_name: 'Pantallas', module_id: 'mod-8', route_path: '/seguridad/pantallas', sort_order: 12, is_active: true },
  { id: 'scr-13', screen_key: 'SEC_ACTIONS', screen_name: 'Acciones', module_id: 'mod-8', route_path: '/seguridad/acciones', sort_order: 13, is_active: true },
  { id: 'scr-14', screen_key: 'SEC_ROLES', screen_name: 'Roles', module_id: 'mod-8', route_path: '/seguridad/roles', sort_order: 14, is_active: true },
  { id: 'scr-15', screen_key: 'USR_USERS', screen_name: 'Usuarios', module_id: 'mod-9', route_path: '/usuarios', sort_order: 15, is_active: true },
];

// MOCK DATA - Actions (SYSTEM)
const mockActions: Action[] = [
  { id: 'act-1', action_key: 'VIEW', action_name: 'Ver/Consultar', is_active: true },
  { id: 'act-2', action_key: 'CREATE', action_name: 'Crear', is_active: true },
  { id: 'act-3', action_key: 'UPDATE', action_name: 'Actualizar', is_active: true },
  { id: 'act-4', action_key: 'DELETE', action_name: 'Eliminar', is_active: true },
  { id: 'act-5', action_key: 'EXPORT', action_name: 'Exportar', is_active: true },
  { id: 'act-6', action_key: 'IMPORT', action_name: 'Importar', is_active: true },
  { id: 'act-7', action_key: 'RUN', action_name: 'Ejecutar Proceso', is_active: true },
  { id: 'act-8', action_key: 'APPROVE', action_name: 'Aprobar', is_active: true },
  { id: 'act-9', action_key: 'REVERSE', action_name: 'Reversar', is_active: true },
];

// MOCK DATA - Screen Actions (SYSTEM)
const mockScreenActions: ScreenAction[] = [
  { id: 'sa-1', screen_id: 'scr-4', action_id: 'act-1', ui_element_key: 'btn_view', is_active: true },
  { id: 'sa-2', screen_id: 'scr-4', action_id: 'act-2', ui_element_key: 'btn_create', is_active: true },
  { id: 'sa-3', screen_id: 'scr-4', action_id: 'act-3', ui_element_key: 'btn_edit', is_active: true },
  { id: 'sa-4', screen_id: 'scr-4', action_id: 'act-4', ui_element_key: 'btn_delete', is_active: true },
  { id: 'sa-5', screen_id: 'scr-4', action_id: 'act-5', ui_element_key: 'btn_export', is_active: true },
  { id: 'sa-6', screen_id: 'scr-9', action_id: 'act-1', ui_element_key: 'btn_view', is_active: true },
  { id: 'sa-7', screen_id: 'scr-9', action_id: 'act-2', ui_element_key: 'btn_create', is_active: true },
  { id: 'sa-8', screen_id: 'scr-9', action_id: 'act-3', ui_element_key: 'btn_edit', is_active: true },
  { id: 'sa-9', screen_id: 'scr-11', action_id: 'act-7', ui_element_key: 'btn_run', is_active: true },
  { id: 'sa-10', screen_id: 'scr-11', action_id: 'act-5', ui_element_key: 'btn_export', is_active: true },
];

// MOCK DATA - Roles (TENANT)
const mockRoles: Role[] = [
  { id: 'rol-1', tenant_id: 'ten-1', role_key: 'ADMIN_TENANT', role_name: 'Administrador del Tenant', role_scope_id: 'scope-sys', is_active: true },
  { id: 'rol-2', tenant_id: 'ten-1', role_key: 'SUPERVISOR', role_name: 'Supervisor', role_scope_id: 'scope-ten', is_active: true },
  { id: 'rol-3', tenant_id: 'ten-1', role_key: 'PAYROLL', role_name: 'Nómina', role_scope_id: 'scope-ten', is_active: true },
  { id: 'rol-4', tenant_id: 'ten-1', role_key: 'EMPLOYEE_KIOSK', role_name: 'Empleado - Kiosko', role_scope_id: 'scope-ten', is_active: true },
  { id: 'rol-5', tenant_id: 'ten-1', role_key: 'EMPLOYEE_PORTAL', role_name: 'Empleado - Portal', role_scope_id: 'scope-ten', is_active: true },
];

// MOCK DATA - Usuarios
const mockUsers = [
  { id: 'usr-1', username: 'admin@titanium.com', display_name: 'Carlos Administrador', email: 'admin@titanium.com' },
  { id: 'usr-2', username: 'supervisor@titanium.com', display_name: 'María Supervisora', email: 'supervisor@titanium.com' },
  { id: 'usr-3', username: 'payroll@titanium.com', display_name: 'Ana Nómina', email: 'payroll@titanium.com' },
];

// MOCK DATA - Empresas
const mockCompanies = [
  { id: 'comp-1', company_name: 'Titanium Corp' },
  { id: 'comp-2', company_name: 'Titanium Services' },
];

// MOCK DATA - Scope Types
const mockScopeTypes = [
  { id: 'st-1', scope_type_key: 'COMPANY', scope_type_name: 'Empresa' },
  { id: 'st-2', scope_type_key: 'DEPARTMENT', scope_type_name: 'Departamento' },
  { id: 'st-3', scope_type_key: 'AREA', scope_type_name: 'Área' },
  { id: 'st-4', scope_type_key: 'COST_CENTER', scope_type_name: 'Centro de Costo' },
  { id: 'st-5', scope_type_key: 'WORK_LOCATION', scope_type_name: 'Localidad' },
  { id: 'st-6', scope_type_key: 'PAYROLL_GROUP', scope_type_name: 'Grupo de Nómina' },
  { id: 'st-7', scope_type_key: 'EMPLOYEE_PROFILE', scope_type_name: 'Perfil de Empleado' },
  { id: 'st-8', scope_type_key: 'EMPLOYEE', scope_type_name: 'Empleado' },
];

const ITEMS_PER_PAGE = 10;

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function Seguridad({ activeTab: initialTab = 'dashboard', title = 'Seguridad' }: { activeTab?: string; title?: string }) {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // ✅ Verificar si el usuario es Super Admin
  const isSuperAdmin = profile?.is_super_admin === true || profile?.role_scope === 'SYSTEM';
  
  console.log('[SEGURIDAD] Validación Super Admin:', {
    is_super_admin: profile?.is_super_admin,
    role_scope: profile?.role_scope,
    isSuperAdmin,
    activeTab,
    profile
  });
  
  // Sincronizar con prop externo
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Estados para diálogos
  const [screenDialog, setScreenDialog] = useState<{ open: boolean; item: Screen | null }>({ open: false, item: null });
  const [actionDialog, setActionDialog] = useState<{ open: boolean; item: Action | null }>({ open: false, item: null });
  const [screenActionDialog, setScreenActionDialog] = useState<{ open: boolean; screen: Screen | null }>({ open: false, screen: null });
  const [roleDialog, setRoleDialog] = useState<{ open: boolean; item: Role | null }>({ open: false, item: null });
  const [userRoleDialog, setUserRoleDialog] = useState<{ open: boolean; userId: string | null }>({ open: false, userId: null });
  const [scopeDialog, setScopeDialog] = useState<{ open: boolean; userRoleId: string | null }>({ open: false, userRoleId: null });
  
  // Estado para matriz de permisos
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [permissionMatrix, setPermissionMatrix] = useState<{ [key: string]: boolean }>({});

  // Función para filtrar y paginar
  const filterAndPaginate = (data: any[], searchField: string = 'name') => {
    let filtered = data.filter(item => {
      const searchValue = item[searchField] || item.screen_name || item.action_name || item.role_name || '';
      const codeValue = item.screen_key || item.action_key || item.role_key || '';
      const matchesSearch = searchValue.toLowerCase().includes(searchTerm.toLowerCase()) ||
        codeValue.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && item.is_active) || 
        (statusFilter === 'inactive' && !item.is_active);
      
      return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedData = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return { data: paginatedData, total: filtered.length, totalPages };
  };

  // Componente de paginación
  const Pagination = ({ totalPages }: { totalPages: number }) => (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="text-sm text-muted-foreground">
        Página {currentPage} de {totalPages || 1}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          Siguiente
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const screens = filterAndPaginate(mockScreens, 'screen_name');
  const actions = filterAndPaginate(mockActions, 'action_name');
  const roles = filterAndPaginate(mockRoles, 'role_name');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-1">Control de acceso, permisos y alcance de datos por rol</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1); setSearchTerm(''); setStatusFilter('all'); }}>
        {/* TabsList oculto - el menú lateral maneja la navegación */}
        <TabsList className="hidden">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="pantallas">Pantallas</TabsTrigger>
          <TabsTrigger value="acciones">Acciones</TabsTrigger>
          <TabsTrigger value="pantalla-acciones">Pantalla-Acciones</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permisos-rol">Permisos por Rol</TabsTrigger>
          <TabsTrigger value="asignacion-roles">Asignación de Roles</TabsTrigger>
          <TabsTrigger value="scopes">Scopes</TabsTrigger>
          <TabsTrigger value="copiar-permisos">Copiar Permisos</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoría</TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* DASHBOARD */}
        {/* ================================================================ */}
        <TabsContent value="dashboard" className="mt-6 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Roles Activos</CardDescription>
                <CardTitle className="text-3xl text-[#0074D9]">
                  {mockRoles.filter(r => r.is_active).length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Total de {mockRoles.length} roles
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Pantallas del Sistema</CardDescription>
                <CardTitle className="text-3xl text-[#2ECC71]">
                  {mockScreens.filter(s => s.is_active).length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Monitor className="w-3 h-3" />
                  {mockModules.length} módulos
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Acciones Disponibles</CardDescription>
                <CardTitle className="text-3xl text-[#0074D9]">
                  {mockActions.filter(a => a.is_active).length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <MousePointerClick className="w-3 h-3" />
                  CRUD + Procesos
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Usuarios con Roles</CardDescription>
                <CardTitle className="text-3xl text-[#2ECC71]">
                  {mockUsers.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Usuarios activos
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alertas y resumen */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  Alertas de Seguridad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900">Roles sin permisos asignados</p>
                    <p className="text-xs text-amber-700 mt-1">2 roles no tienen permisos configurados</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">Usuarios sin scopes</p>
                    <p className="text-xs text-blue-700 mt-1">1 usuario operativo sin scopes de datos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Módulos Protegidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mockModules.slice(0, 5).map(mod => (
                    <div key={mod.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{mod.lookup_label}</span>
                      <Badge className="bg-green-600 text-white">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Protegido
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumen de configuración */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumen de Configuración</CardTitle>
              <CardDescription>Estado actual del sistema de seguridad</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-[#0074D9]">{mockScreenActions.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Screen-Actions</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-[#2ECC71]">12</div>
                  <div className="text-xs text-muted-foreground mt-1">Permisos Configurados</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-[#0074D9]">8</div>
                  <div className="text-xs text-muted-foreground mt-1">Scope Types</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-[#2ECC71]">0</div>
                  <div className="text-xs text-muted-foreground mt-1">Pantallas sin acciones</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* PANTALLAS (SCREENS) - SYSTEM */}
        {/* ================================================================ */}
        <TabsContent value="pantallas" className="mt-6 space-y-4">
          {!isSuperAdmin ? (
            <SuperAdminOnly
              userEmail={profile?.email}
              tenantName={profile?.tenant_name}
              feature="Gestión de Pantallas del Sistema"
              description="Esta pantalla permite configurar las pantallas del sistema y solo puede ser accedida por el Super Admin."
            />
          ) : (
            <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar pantallas del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-screens">Nombre / Código</Label>
                  <Search className="absolute left-3 top-9 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-screens"
                    placeholder="Buscar pantalla..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="status-screens">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-screens">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Exportar</Label>
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Pantallas del Sistema (SYSTEM)</CardTitle>
                  <CardDescription>Catálogo de pantallas y transacciones</CardDescription>
                </div>
                <Button size="sm" onClick={() => setScreenDialog({ open: true, item: null })}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Pantalla
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Ruta</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {screens.data.map((screen: Screen) => {
                    const module = mockModules.find(m => m.id === screen.module_id);
                    return (
                      <TableRow key={screen.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">{screen.screen_key}</TableCell>
                        <TableCell className="font-medium">{screen.screen_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{module?.lookup_label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{screen.route_path}</TableCell>
                        <TableCell className="text-center">{screen.sort_order}</TableCell>
                        <TableCell>
                          <Badge className={screen.is_active ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'}>
                            {screen.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="hover:bg-accent"
                              onClick={() => setScreenDialog({ open: true, item: screen })}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:bg-destructive/10 hover:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Desactivar pantalla?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    La pantalla será desactivada. Los permisos asociados permanecerán pero no estarán disponibles.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive hover:bg-destructive/90">Desactivar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Pagination totalPages={screens.totalPages} />
            </CardContent>
          </Card>
          </>
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* ACCIONES (ACTIONS) - SYSTEM */}
        {/* ================================================================ */}
        <TabsContent value="acciones" className="mt-6 space-y-4">
          {!isSuperAdmin ? (
            <SuperAdminOnly
              userEmail={profile?.email}
              tenantName={profile?.tenant_name}
              feature="Gestión de Acciones del Sistema"
              description="Esta pantalla permite configurar las acciones (CRUD, procesos, etc.) del sistema y solo puede ser accedida por el Super Admin."
            />
          ) : (
            <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar acciones disponibles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-actions">Nombre / Código</Label>
                  <Search className="absolute left-3 top-9 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-actions"
                    placeholder="Buscar acción..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="status-actions">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-actions">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Exportar</Label>
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Acciones del Sistema (SYSTEM)</CardTitle>
                  <CardDescription>Catálogo de acciones disponibles (CRUD, procesos, etc.)</CardDescription>
                </div>
                <Button size="sm" onClick={() => setActionDialog({ open: true, item: null })}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Acción
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actions.data.map((action: Action) => {
                    const actionType = 
                      ['CREATE', 'UPDATE', 'DELETE'].includes(action.action_key) ? 'CRUD' :
                      ['RUN', 'APPROVE', 'REVERSE'].includes(action.action_key) ? 'Proceso' :
                      ['EXPORT', 'IMPORT'].includes(action.action_key) ? 'Transferencia' : 'Consulta';
                    
                    return (
                      <TableRow key={action.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">{action.action_key}</TableCell>
                        <TableCell className="font-medium">{action.action_name}</TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              actionType === 'CRUD' ? 'bg-blue-600 text-white' :
                              actionType === 'Proceso' ? 'bg-purple-600 text-white' :
                              actionType === 'Transferencia' ? 'bg-orange-600 text-white' :
                              'bg-gray-600 text-white'
                            }
                          >
                            {actionType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={action.is_active ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'}>
                            {action.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="hover:bg-accent"
                              onClick={() => setActionDialog({ open: true, item: action })}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:bg-destructive/10 hover:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Desactivar acción?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    La acción será desactivada. No estará disponible para asignar a pantallas.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive hover:bg-destructive/90">Desactivar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Pagination totalPages={actions.totalPages} />
            </CardContent>
          </Card>
          </>
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* PANTALLA-ACCIONES (SCREEN_ACTIONS) - SYSTEM */}
        {/* ================================================================ */}
        <TabsContent value="pantalla-acciones" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mapeo Pantalla-Acción (SYSTEM)</CardTitle>
              <CardDescription>Define qué acciones están disponibles en cada pantalla</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Seleccionar Pantalla</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una pantalla" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockScreens.filter(s => s.is_active).map(screen => (
                      <SelectItem key={screen.id} value={screen.id}>
                        {screen.screen_name} ({screen.screen_key})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Acciones Asignadas</h3>
                  <Button size="sm" onClick={() => setScreenActionDialog({ open: true, screen: mockScreens[3] })}>
                    <Plus className="w-4 h-4 mr-2" />
                    Asignar Acciones
                  </Button>
                </div>

                <div className="space-y-2">
                  {mockScreenActions
                    .filter(sa => sa.screen_id === 'scr-4')
                    .map(sa => {
                      const action = mockActions.find(a => a.id === sa.action_id);
                      return (
                        <div key={sa.id} className="flex items-center justify-between p-3 bg-white border rounded">
                          <div className="flex items-center gap-3">
                            <MousePointerClick className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm">{action?.action_name}</div>
                              <div className="text-xs text-muted-foreground">UI Element: {sa.ui_element_key}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={sa.is_active ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'}>
                              {sa.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                            <Button variant="ghost" size="icon" className="hover:bg-destructive/10 hover:text-destructive">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* ROLES (TENANT) */}
        {/* ================================================================ */}
        <TabsContent value="roles" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar roles del tenant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-roles">Nombre / Código</Label>
                  <Search className="absolute left-3 top-9 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-roles"
                    placeholder="Buscar rol..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="status-roles">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-roles">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Exportar</Label>
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Roles del Tenant</CardTitle>
                  <CardDescription>Gestión de roles y niveles de acceso</CardDescription>
                </div>
                <Button size="sm" onClick={() => setRoleDialog({ open: true, item: null })}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Rol
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.data.map((role: Role) => (
                    <TableRow key={role.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">{role.role_key}</TableCell>
                      <TableCell className="font-medium">{role.role_name}</TableCell>
                      <TableCell>
                        <Badge className={role.role_scope_id === 'scope-sys' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}>
                          {role.role_scope_id === 'scope-sys' ? 'SYSTEM' : 'TENANT'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={role.is_active ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'}>
                          {role.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => setRoleDialog({ open: true, item: role })}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="hover:bg-destructive/10 hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Desactivar rol?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  El rol será desactivado. Los usuarios asignados perderán los permisos asociados.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive hover:bg-destructive/90">Desactivar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination totalPages={roles.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* PERMISOS POR ROL (ROLE_SCREEN_ACTIONS) - TENANT */}
        {/* ================================================================ */}
        <TabsContent value="permisos-rol" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Matriz de Permisos por Rol</CardTitle>
              <CardDescription>Configura qué acciones puede ejecutar cada rol en cada pantalla</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Seleccionar Rol</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockRoles.filter(r => r.is_active).map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.role_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-6">
                  <Button variant="outline" size="sm">
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar desde otro rol
                  </Button>
                  <Button variant="outline" size="sm">
                    Permitir todo
                  </Button>
                  <Button variant="outline" size="sm">
                    Bloquear todo
                  </Button>
                  <Button size="sm" className="bg-[#0074D9] hover:bg-[#0074D9]/90">
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </div>
              </div>

              {selectedRole && (
                <div className="border rounded-lg">
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow className="hover:bg-transparent border-border">
                          <TableHead className="w-[200px]">Pantalla</TableHead>
                          <TableHead className="text-center w-20">Ver</TableHead>
                          <TableHead className="text-center w-20">Crear</TableHead>
                          <TableHead className="text-center w-20">Editar</TableHead>
                          <TableHead className="text-center w-20">Eliminar</TableHead>
                          <TableHead className="text-center w-20">Exportar</TableHead>
                          <TableHead className="text-center w-20">Importar</TableHead>
                          <TableHead className="text-center w-20">Ejecutar</TableHead>
                          <TableHead className="text-center w-20">Aprobar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mockScreens.filter(s => s.is_active).map(screen => {
                          const module = mockModules.find(m => m.id === screen.module_id);
                          return (
                            <TableRow key={screen.id} className="hover:bg-muted/50">
                              <TableCell>
                                <div>
                                  <div className="font-medium text-sm">{screen.screen_name}</div>
                                  <div className="text-xs text-muted-foreground">{module?.lookup_label}</div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}

              {!selectedRole && (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Seleccione un rol para configurar permisos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* ASIGNACIÓN DE ROLES (USER_ROLES) - TENANT */}
        {/* ================================================================ */}
        <TabsContent value="asignacion-roles" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Asignación de Roles a Usuarios</CardTitle>
              <CardDescription>Asigna uno o más roles a cada usuario (opcionalmente por empresa)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockUsers.map(user => (
                  <div key={user.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#0074D9] flex items-center justify-center text-white">
                          {user.display_name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-medium">{user.display_name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setUserRoleDialog({ open: true, userId: user.id })}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Asignar Rol
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Permisos Efectivos
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium mb-2">Roles Asignados:</div>
                      {/* Mock: mostrar roles asignados */}
                      <div className="flex items-center justify-between p-3 bg-white border rounded">
                        <div className="flex items-center gap-3">
                          <Shield className="w-4 h-4 text-[#0074D9]" />
                          <div>
                            <div className="text-sm font-medium">Administrador del Tenant</div>
                            <div className="text-xs text-muted-foreground">Scope: Todas las empresas</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-600 text-white">Activo</Badge>
                          <Button variant="ghost" size="icon" className="hover:bg-destructive/10 hover:text-destructive">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* SCOPES (USER_ROLE_SCOPES) - TENANT */}
        {/* ================================================================ */}
        <TabsContent value="scopes" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alcance de Datos por Asignación de Rol</CardTitle>
              <CardDescription>Define a qué datos puede acceder cada usuario según sus roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Seleccionar Usuario y Rol</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione una asignación usuario-rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ur-1">Carlos Administrador - Administrador del Tenant</SelectItem>
                      <SelectItem value="ur-2">María Supervisora - Supervisor (Titanium Corp)</SelectItem>
                      <SelectItem value="ur-3">Ana Nómina - Nómina (Titanium Corp)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Scopes Asignados</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Copy className="w-4 h-4 mr-2" />
                        Heredar scopes
                      </Button>
                      <Button size="sm" onClick={() => setScopeDialog({ open: true, userRoleId: 'ur-2' })}>
                        <Plus className="w-4 h-4 mr-2" />
                        Asignar Scope
                      </Button>
                    </div>
                  </div>

                  <Tabs defaultValue="company" className="w-full">
                    <TabsList className="grid grid-cols-4 w-full">
                      <TabsTrigger value="company">
                        <Building className="w-4 h-4 mr-2" />
                        Empresas
                      </TabsTrigger>
                      <TabsTrigger value="department">
                        <Briefcase className="w-4 h-4 mr-2" />
                        Departamentos
                      </TabsTrigger>
                      <TabsTrigger value="location">
                        <MapPin className="w-4 h-4 mr-2" />
                        Localidades
                      </TabsTrigger>
                      <TabsTrigger value="payroll">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Grupos Nómina
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="company" className="space-y-2 mt-4">
                      {mockCompanies.map(company => (
                        <div key={company.id} className="flex items-center justify-between p-3 bg-white border rounded">
                          <div className="flex items-center gap-3">
                            <Building className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{company.company_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-600 text-white">Asignado</Badge>
                            <Button variant="ghost" size="icon" className="hover:bg-destructive/10 hover:text-destructive">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="department" className="mt-4">
                      <div className="text-center py-8 text-muted-foreground">
                        <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay departamentos asignados</p>
                      </div>
                    </TabsContent>

                    <TabsContent value="location" className="mt-4">
                      <div className="text-center py-8 text-muted-foreground">
                        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay localidades asignadas</p>
                      </div>
                    </TabsContent>

                    <TabsContent value="payroll" className="mt-4">
                      <div className="text-center py-8 text-muted-foreground">
                        <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay grupos de nómina asignados</p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* COPIAR PERMISOS */}
        {/* ================================================================ */}
        <TabsContent value="copiar-permisos" className="mt-6">
          <CopiarPermisos />
        </TabsContent>

        {/* ================================================================ */}
        {/* AUDITORÍA (AUDIT_LOG) - Solo lectura */}
        {/* ================================================================ */}
        <TabsContent value="auditoria" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros de Auditoría</CardTitle>
              <CardDescription>Consulta el registro de acciones del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label>Fecha Desde</Label>
                  <Input type="date" />
                </div>
                <div>
                  <Label>Fecha Hasta</Label>
                  <Input type="date" />
                </div>
                <div>
                  <Label>Usuario</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los usuarios</SelectItem>
                      {mockUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Acción</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las acciones</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="export">Exportación</SelectItem>
                      <SelectItem value="delete">Eliminación</SelectItem>
                      <SelectItem value="process">Ejecución Proceso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Registro de Auditoría</CardTitle>
                  <CardDescription>Historial de acciones sensibles del sistema</CardDescription>
                </div>
                <Button size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Log
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead className="text-right">Detalles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="hover:bg-muted/50">
                    <TableCell className="text-sm">2026-01-02 09:15:23</TableCell>
                    <TableCell>Carlos Administrador</TableCell>
                    <TableCell>
                      <Badge className="bg-blue-600 text-white">EXPORT</Badge>
                    </TableCell>
                    <TableCell className="text-sm">Reporte de Asistencia</TableCell>
                    <TableCell className="text-sm">Titanium Corp</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-muted/50">
                    <TableCell className="text-sm">2026-01-02 08:45:12</TableCell>
                    <TableCell>María Supervisora</TableCell>
                    <TableCell>
                      <Badge className="bg-purple-600 text-white">RUN</Badge>
                    </TableCell>
                    <TableCell className="text-sm">Sincronización Marcaciones</TableCell>
                    <TableCell className="text-sm">Titanium Corp</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-muted/50">
                    <TableCell className="text-sm">2026-01-01 16:30:45</TableCell>
                    <TableCell>Ana Nómina</TableCell>
                    <TableCell>
                      <Badge className="bg-red-600 text-white">DELETE</Badge>
                    </TableCell>
                    <TableCell className="text-sm">Marcación Manual</TableCell>
                    <TableCell className="text-sm">Titanium Corp</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <Pagination totalPages={3} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ================================================================ */}
      {/* DIÁLOGOS */}
      {/* ================================================================ */}

      {/* Dialog: Screen */}
      <Dialog open={screenDialog.open} onOpenChange={(open) => !open && setScreenDialog({ open: false, item: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{screenDialog.item ? 'Editar Pantalla' : 'Nueva Pantalla'}</DialogTitle>
            <DialogDescription>Configuración de pantalla del sistema (SYSTEM)</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="screen-key">Código (screen_key)</Label>
                <Input id="screen-key" placeholder="CONF_SHIFTS" defaultValue={screenDialog.item?.screen_key} />
              </div>
              <div>
                <Label htmlFor="screen-module">Módulo</Label>
                <Select defaultValue={screenDialog.item?.module_id}>
                  <SelectTrigger id="screen-module">
                    <SelectValue placeholder="Seleccionar módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockModules.map(mod => (
                      <SelectItem key={mod.id} value={mod.id}>{mod.lookup_label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="screen-name">Nombre</Label>
              <Input id="screen-name" placeholder="Configuración de Turnos" defaultValue={screenDialog.item?.screen_name} />
            </div>
            <div>
              <Label htmlFor="screen-route">Ruta</Label>
              <Input id="screen-route" placeholder="/configuracion/turnos" defaultValue={screenDialog.item?.route_path} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="screen-order">Orden</Label>
                <Input id="screen-order" type="number" defaultValue={screenDialog.item?.sort_order || 1} />
              </div>
              <div className="flex items-center gap-2 pt-8">
                <Switch id="screen-active" defaultChecked={screenDialog.item?.is_active !== false} />
                <Label htmlFor="screen-active">Activo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScreenDialog({ open: false, item: null })}>Cancelar</Button>
            <Button className="bg-[#0074D9] hover:bg-[#0074D9]/90">
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Action */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, item: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionDialog.item ? 'Editar Acción' : 'Nueva Acción'}</DialogTitle>
            <DialogDescription>Configuración de acción del sistema (SYSTEM)</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="action-key">Código (action_key)</Label>
              <Input id="action-key" placeholder="CREATE" defaultValue={actionDialog.item?.action_key} />
            </div>
            <div>
              <Label htmlFor="action-name">Nombre</Label>
              <Input id="action-name" placeholder="Crear" defaultValue={actionDialog.item?.action_name} />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="action-active" defaultChecked={actionDialog.item?.is_active !== false} />
              <Label htmlFor="action-active">Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, item: null })}>Cancelar</Button>
            <Button className="bg-[#0074D9] hover:bg-[#0074D9]/90">
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Asignar Acciones a Pantalla */}
      <Dialog open={screenActionDialog.open} onOpenChange={(open) => !open && setScreenActionDialog({ open: false, screen: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Asignar Acciones a Pantalla</DialogTitle>
            <DialogDescription>
              Pantalla: {screenActionDialog.screen?.screen_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {mockActions.filter(a => a.is_active).map(action => (
                  <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox />
                      <div>
                        <div className="font-medium text-sm">{action.action_name}</div>
                        <div className="text-xs text-muted-foreground">{action.action_key}</div>
                      </div>
                    </div>
                    <div>
                      <Input placeholder="btn_create" className="w-32 text-xs" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScreenActionDialog({ open: false, screen: null })}>Cancelar</Button>
            <Button className="bg-[#0074D9] hover:bg-[#0074D9]/90">
              <Save className="w-4 h-4 mr-2" />
              Guardar Asignaciones
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Role */}
      <Dialog open={roleDialog.open} onOpenChange={(open) => !open && setRoleDialog({ open: false, item: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{roleDialog.item ? 'Editar Rol' : 'Nuevo Rol'}</DialogTitle>
            <DialogDescription>Configuración de rol del tenant</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="role-key">Código (role_key)</Label>
              <Input id="role-key" placeholder="SUPERVISOR" defaultValue={roleDialog.item?.role_key} />
            </div>
            <div>
              <Label htmlFor="role-name">Nombre</Label>
              <Input id="role-name" placeholder="Supervisor" defaultValue={roleDialog.item?.role_name} />
            </div>
            <div>
              <Label htmlFor="role-scope">Scope</Label>
              <Select defaultValue={roleDialog.item?.role_scope_id || 'scope-ten'}>
                <SelectTrigger id="role-scope">
                  <SelectValue placeholder="Seleccionar scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scope-sys">SYSTEM</SelectItem>
                  <SelectItem value="scope-ten">TENANT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plantilla (opcional)</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Ninguna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguna</SelectItem>
                  <SelectItem value="admin">Admin - Acceso completo</SelectItem>
                  <SelectItem value="supervisor">Supervisor - Consulta y gestión</SelectItem>
                  <SelectItem value="payroll">Nómina - Procesos y reportes</SelectItem>
                  <SelectItem value="kiosk">Kiosko - Solo consulta personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="role-active" defaultChecked={roleDialog.item?.is_active !== false} />
              <Label htmlFor="role-active">Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog({ open: false, item: null })}>Cancelar</Button>
            <Button className="bg-[#0074D9] hover:bg-[#0074D9]/90">
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Asignar Rol a Usuario */}
      <Dialog open={userRoleDialog.open} onOpenChange={(open) => !open && setUserRoleDialog({ open: false, userId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Rol a Usuario</DialogTitle>
            <DialogDescription>Configure el rol y opcionalmente la empresa asociada</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="ur-role">Rol</Label>
              <Select>
                <SelectTrigger id="ur-role">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {mockRoles.filter(r => r.is_active).map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.role_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ur-company">Empresa (opcional)</Label>
              <Select>
                <SelectTrigger id="ur-company">
                  <SelectValue placeholder="Todas las empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las empresas</SelectItem>
                  {mockCompanies.map(company => (
                    <SelectItem key={company.id} value={company.id}>{company.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Dejar en "Todas" si el rol aplica a todo el tenant
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="ur-active" defaultChecked />
              <Label htmlFor="ur-active">Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserRoleDialog({ open: false, userId: null })}>Cancelar</Button>
            <Button className="bg-[#0074D9] hover:bg-[#0074D9]/90">
              <Save className="w-4 h-4 mr-2" />
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Asignar Scopes */}
      <Dialog open={scopeDialog.open} onOpenChange={(open) => !open && setScopeDialog({ open: false, userRoleId: null })}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Asignar Scopes de Datos</DialogTitle>
            <DialogDescription>Seleccione las entidades a las que este usuario-rol tendrá acceso</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4">
              <Label>Tipo de Scope</Label>
              <Select defaultValue="st-1">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mockScopeTypes.map(st => (
                    <SelectItem key={st.id} value={st.id}>{st.scope_type_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg p-4">
              <div className="space-y-2">
                {mockCompanies.map(company => (
                  <div key={company.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                    <Checkbox />
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{company.company_name}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScopeDialog({ open: false, userRoleId: null })}>Cancelar</Button>
            <Button className="bg-[#0074D9] hover:bg-[#0074D9]/90">
              <Save className="w-4 h-4 mr-2" />
              Guardar Scopes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
