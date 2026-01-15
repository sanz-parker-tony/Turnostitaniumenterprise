import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, Edit, Trash2, Shield, MousePointerClick, Search, Download, ChevronLeft, ChevronRight, Users, FileText, Filter } from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

// Mock data - Transacciones completas del sistema
const mockTransactions = [
  // Dashboard
  { id: 1, module: 'Dashboard', code: 'DASH_MAIN', description: 'Dashboard Principal', type: 'menu', active: true },
  
  // Mantenimiento
  { id: 2, module: 'Mantenimiento', code: 'MANT_FER', description: 'Feriados', type: 'tab', active: true },
  { id: 3, module: 'Mantenimiento', code: 'MANT_CAT', description: 'Catálogos', type: 'tab', active: true },
  { id: 4, module: 'Mantenimiento', code: 'MANT_JUST', description: 'Motivos de Justificación', type: 'tab', active: true },
  
  // Configuración
  { id: 5, module: 'Configuración', code: 'CONF_ACC', description: 'Accesos', type: 'tab', active: true },
  { id: 6, module: 'Configuración', code: 'CONF_TURN', description: 'Turnos', type: 'tab', active: true },
  { id: 7, module: 'Configuración', code: 'CONF_PARAM', description: 'Parámetros Generales', type: 'tab', active: true },
  { id: 8, module: 'Configuración', code: 'CONF_NOV', description: 'Novedades', type: 'tab', active: true },
  
  // Perfiles
  { id: 9, module: 'Perfiles', code: 'PERF_LIST', description: 'Listado', type: 'tab', active: true },
  { id: 10, module: 'Perfiles', code: 'PERF_PARAM', description: 'Parámetros x Perfil', type: 'tab', active: true },
  { id: 11, module: 'Perfiles', code: 'PERF_TURN', description: 'Turnos x Perfil', type: 'tab', active: true },
  { id: 12, module: 'Perfiles', code: 'PERF_NOV', description: 'Novedades x Perfil', type: 'tab', active: true },
  
  // Empresa
  { id: 13, module: 'Empresa', code: 'EMP_EMPRESA', description: 'Empresas', type: 'tab', active: true },
  { id: 14, module: 'Empresa', code: 'EMP_LOCAL', description: 'Localidades', type: 'tab', active: true },
  { id: 15, module: 'Empresa', code: 'EMP_DEPTO', description: 'Departamentos', type: 'tab', active: true },
  { id: 16, module: 'Empresa', code: 'EMP_AREA', description: 'Áreas', type: 'tab', active: true },
  { id: 17, module: 'Empresa', code: 'EMP_CARGO', description: 'Cargos', type: 'tab', active: true },
  { id: 18, module: 'Empresa', code: 'EMP_ROL', description: 'Roles de Pago', type: 'tab', active: true },
  { id: 19, module: 'Empresa', code: 'EMP_CENTRO', description: 'Centros de Costo', type: 'tab', active: true },
  { id: 20, module: 'Empresa', code: 'EMP_GRUPO', description: 'Grupos', type: 'tab', active: true },
  
  // Empleados
  { id: 21, module: 'Empleados', code: 'EMPL_LIST', description: 'Listado de Empleados', type: 'menu', active: true },
  { id: 22, module: 'Empleados', code: 'EMPL_PLAN', description: 'Planificación de Turnos', type: 'tab', active: true },
  { id: 23, module: 'Empleados', code: 'EMPL_AUSEN', description: 'Ausencias', type: 'tab', active: true },
  { id: 24, module: 'Empleados', code: 'EMPL_NOV', description: 'Novedades', type: 'tab', active: true },
  { id: 25, module: 'Empleados', code: 'EMPL_MARC', description: 'Revisión de Marcaciones', type: 'tab', active: true },
  
  // Procesos
  { id: 26, module: 'Procesos', code: 'PROC_SYNC', description: 'Sincronización de Marcaciones', type: 'menu', active: true },
  { id: 27, module: 'Procesos', code: 'PROC_IMP', description: 'Importación de Datos', type: 'tab', active: true },
  { id: 28, module: 'Procesos', code: 'PROC_LIQ', description: 'Liquidación de Novedades', type: 'tab', active: true },
  
  // Seguridades
  { id: 29, module: 'Seguridades', code: 'SEG_TRANS', description: 'Transacciones', type: 'tab', active: true },
  { id: 30, module: 'Seguridades', code: 'SEG_OPC', description: 'Opciones', type: 'tab', active: true },
  
  // Usuarios
  { id: 31, module: 'Usuarios', code: 'USR_LIST', description: 'Listado de Usuarios', type: 'menu', active: true },
  { id: 32, module: 'Usuarios', code: 'USR_PERM_ACC', description: 'Permiso de Acciones', type: 'tab', active: true },
  { id: 33, module: 'Usuarios', code: 'USR_PERM_INFO', description: 'Permisos a la Información', type: 'tab', active: true },
  { id: 34, module: 'Usuarios', code: 'USR_PERM_IMP', description: 'Permisos de Impresión', type: 'tab', active: true },
];

const mockOptions = [
  // Acciones de Mantenimiento
  { id: 1, transaction: 'MANT_FER', code: 'BTN_NEW', description: 'Nuevo Feriado', action: 'create', active: true },
  { id: 2, transaction: 'MANT_FER', code: 'BTN_EDIT', description: 'Editar Feriado', action: 'update', active: true },
  { id: 3, transaction: 'MANT_FER', code: 'BTN_DELETE', description: 'Eliminar Feriado', action: 'delete', active: true },
  { id: 4, transaction: 'MANT_FER', code: 'BTN_EXPORT', description: 'Exportar Feriados', action: 'export', active: true },
  { id: 5, transaction: 'MANT_CAT', code: 'BTN_NEW', description: 'Nuevo Catálogo', action: 'create', active: true },
  { id: 6, transaction: 'MANT_CAT', code: 'BTN_EDIT', description: 'Editar Catálogo', action: 'update', active: true },
  { id: 7, transaction: 'MANT_CAT', code: 'BTN_DELETE', description: 'Eliminar Catálogo', action: 'delete', active: true },
  { id: 8, transaction: 'MANT_CAT', code: 'BTN_EXPORT', description: 'Exportar Catálogos', action: 'export', active: true },
  
  // Acciones de Configuración
  { id: 9, transaction: 'CONF_ACC', code: 'BTN_NEW', description: 'Nuevo Acceso', action: 'create', active: true },
  { id: 10, transaction: 'CONF_ACC', code: 'BTN_EDIT', description: 'Editar Acceso', action: 'update', active: true },
  { id: 11, transaction: 'CONF_ACC', code: 'BTN_DELETE', description: 'Eliminar Acceso', action: 'delete', active: true },
  { id: 12, transaction: 'CONF_ACC', code: 'BTN_EXPORT', description: 'Exportar Accesos', action: 'export', active: true },
  { id: 13, transaction: 'CONF_TURN', code: 'BTN_CREATE', description: 'Crear Turno', action: 'create', active: true },
  { id: 14, transaction: 'CONF_TURN', code: 'BTN_EDIT', description: 'Editar Turno', action: 'update', active: true },
  { id: 15, transaction: 'CONF_TURN', code: 'BTN_DELETE', description: 'Eliminar Turno', action: 'delete', active: true },
  { id: 16, transaction: 'CONF_TURN', code: 'BTN_EXPORT', description: 'Exportar Turnos', action: 'export', active: true },
  
  // Acciones de Perfiles
  { id: 17, transaction: 'PERF_LIST', code: 'BTN_NEW', description: 'Nuevo Perfil', action: 'create', active: true },
  { id: 18, transaction: 'PERF_LIST', code: 'BTN_EDIT', description: 'Editar Perfil', action: 'update', active: true },
  { id: 19, transaction: 'PERF_LIST', code: 'BTN_DELETE', description: 'Eliminar Perfil', action: 'delete', active: true },
  { id: 20, transaction: 'PERF_LIST', code: 'BTN_EXPORT', description: 'Exportar Perfiles', action: 'export', active: true },
  
  // Acciones de Empresa
  { id: 21, transaction: 'EMP_EMPRESA', code: 'BTN_NEW', description: 'Nueva Empresa', action: 'create', active: true },
  { id: 22, transaction: 'EMP_EMPRESA', code: 'BTN_EDIT', description: 'Editar Empresa', action: 'update', active: true },
  { id: 23, transaction: 'EMP_EMPRESA', code: 'BTN_DELETE', description: 'Eliminar Empresa', action: 'delete', active: true },
  { id: 24, transaction: 'EMP_EMPRESA', code: 'BTN_EXPORT', description: 'Exportar Empresas', action: 'export', active: true },
  { id: 25, transaction: 'EMP_LOCAL', code: 'BTN_NEW', description: 'Nueva Localidad', action: 'create', active: true },
  { id: 26, transaction: 'EMP_LOCAL', code: 'BTN_EDIT', description: 'Editar Localidad', action: 'update', active: true },
  { id: 27, transaction: 'EMP_LOCAL', code: 'BTN_DELETE', description: 'Eliminar Localidad', action: 'delete', active: true },
  
  // Acciones de Empleados
  { id: 28, transaction: 'EMPL_LIST', code: 'BTN_NEW', description: 'Nuevo Empleado', action: 'create', active: true },
  { id: 29, transaction: 'EMPL_LIST', code: 'BTN_EDIT', description: 'Editar Empleado', action: 'update', active: true },
  { id: 30, transaction: 'EMPL_LIST', code: 'BTN_DELETE', description: 'Eliminar Empleado', action: 'delete', active: true },
  { id: 31, transaction: 'EMPL_LIST', code: 'BTN_EXPORT', description: 'Exportar Empleados', action: 'export', active: true },
  { id: 32, transaction: 'EMPL_PLAN', code: 'BTN_ASSIGN', description: 'Asignar Turno', action: 'create', active: true },
  { id: 33, transaction: 'EMPL_AUSEN', code: 'BTN_NEW', description: 'Nueva Ausencia', action: 'create', active: true },
  { id: 34, transaction: 'EMPL_NOV', code: 'BTN_NEW', description: 'Nueva Novedad', action: 'create', active: true },
  { id: 35, transaction: 'EMPL_MARC', code: 'BTN_ADD', description: 'Agregar Marcación', action: 'create', active: true },
  { id: 36, transaction: 'EMPL_MARC', code: 'BTN_EDIT', description: 'Editar Marcación', action: 'update', active: true },
  
  // Acciones de Procesos
  { id: 37, transaction: 'PROC_SYNC', code: 'BTN_SYNC', description: 'Sincronizar', action: 'execute', active: true },
  { id: 38, transaction: 'PROC_SYNC', code: 'BTN_EXPORT', description: 'Exportar Marcaciones', action: 'export', active: true },
  { id: 39, transaction: 'PROC_IMP', code: 'BTN_IMPORT', description: 'Importar Datos', action: 'import', active: true },
  { id: 40, transaction: 'PROC_LIQ', code: 'BTN_GENERATE', description: 'Generar Liquidación', action: 'execute', active: true },
  { id: 41, transaction: 'PROC_LIQ', code: 'BTN_EXPORT', description: 'Exportar Liquidación', action: 'export', active: true },
  
  // Acciones de Seguridades
  { id: 42, transaction: 'SEG_TRANS', code: 'BTN_NEW', description: 'Nueva Transacción', action: 'create', active: true },
  { id: 43, transaction: 'SEG_TRANS', code: 'BTN_EDIT', description: 'Editar Transacción', action: 'update', active: true },
  { id: 44, transaction: 'SEG_OPC', code: 'BTN_NEW', description: 'Nueva Opción', action: 'create', active: true },
  { id: 45, transaction: 'SEG_OPC', code: 'BTN_EDIT', description: 'Editar Opción', action: 'update', active: true },
  
  // Acciones de Usuarios
  { id: 46, transaction: 'USR_LIST', code: 'BTN_NEW', description: 'Nuevo Usuario', action: 'create', active: true },
  { id: 47, transaction: 'USR_LIST', code: 'BTN_EDIT', description: 'Editar Usuario', action: 'update', active: true },
  { id: 48, transaction: 'USR_LIST', code: 'BTN_DELETE', description: 'Eliminar Usuario', action: 'delete', active: true },
];

// Mock data - Usuarios del sistema
const mockSystemUsers = [
  { id: 1, username: 'admin@titanium.com', name: 'Carlos Administrador', userType: 'admin', active: true, isModel: true, lastLogin: '2025-10-28 08:30' },
  { id: 2, username: 'supervisor@titanium.com', name: 'María Supervisora', userType: 'supervisor', active: true, isModel: false, lastLogin: '2025-10-28 09:15' },
  { id: 3, username: 'seguridades@titanium.com', name: 'José Seguridades', userType: 'seguridades', active: true, isModel: false, lastLogin: '2025-10-27 14:20' },
  { id: 4, username: 'operador01@titanium.com', name: 'Ana Operadora', userType: 'supervisor', active: false, isModel: false, lastLogin: '2025-10-26 16:45' },
];

// Mock data - Reportes del sistema
const mockReports = [
  { id: 1, code: 'RPT_ASIST_001', name: 'Reporte de Asistencia Diaria', category: 'Operacional', format: 'PDF', active: true },
  { id: 2, code: 'RPT_TURNOS_001', name: 'Reporte de Planificación de Turnos', category: 'Operacional', format: 'PDF', active: true },
  { id: 3, code: 'RPT_NOMINA_001', name: 'Reporte de Nómina Mensual', category: 'Financiero', format: 'PDF', active: true },
  { id: 4, code: 'RPT_HEXT_001', name: 'Reporte de Horas Extras', category: 'Financiero', format: 'PDF', active: true },
  { id: 5, code: 'RPT_AUSENC_001', name: 'Reporte de Ausencias', category: 'Operacional', format: 'PDF', active: true },
  { id: 6, code: 'RPT_ESTAD_001', name: 'Reporte Estadístico General', category: 'Analítico', format: 'PDF', active: true },
  { id: 7, code: 'RPT_MARC_001', name: 'Reporte de Marcaciones', category: 'Operacional', format: 'PDF', active: true },
  { id: 8, code: 'RPT_NOV_001', name: 'Reporte de Novedades', category: 'Financiero', format: 'PDF', active: false },
];

// Mock data - Criterios por Reportes
const mockReportCriteria = [
  { id: 1, reportCode: 'RPT_ASIST_001', criteriaName: 'Empresa', required: true, active: true },
  { id: 2, reportCode: 'RPT_ASIST_001', criteriaName: 'Localidad', required: true, active: true },
  { id: 3, reportCode: 'RPT_ASIST_001', criteriaName: 'Departamento', required: false, active: true },
  { id: 4, reportCode: 'RPT_ASIST_001', criteriaName: 'Área', required: false, active: true },
  { id: 5, reportCode: 'RPT_TURNOS_001', criteriaName: 'Empresa', required: true, active: true },
  { id: 6, reportCode: 'RPT_TURNOS_001', criteriaName: 'Rol de Pago', required: false, active: true },
  { id: 7, reportCode: 'RPT_TURNOS_001', criteriaName: 'Grupo', required: false, active: true },
  { id: 8, reportCode: 'RPT_NOMINA_001', criteriaName: 'Empresa', required: true, active: true },
  { id: 9, reportCode: 'RPT_NOMINA_001', criteriaName: 'Rol de Pago', required: true, active: true },
  { id: 10, reportCode: 'RPT_NOMINA_001', criteriaName: 'Departamento', required: false, active: true },
];

const ITEMS_PER_PAGE = 10;

export default function Seguridades({ activeTab: initialTab = 'elementos', title = 'Seguridades' }: { activeTab?: string; title?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Actualizar tab cuando cambie desde el menú
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editDialog, setEditDialog] = useState<{ open: boolean; type: string; item: any }>({ open: false, type: '', item: null });

  const openEditDialog = (type: string, item: any = null) => {
    setEditDialog({ open: true, type, item });
  };

  const closeEditDialog = () => {
    setEditDialog({ open: false, type: '', item: null });
  };

  // Función para filtrar y paginar
  const filterAndPaginate = (data: any[], searchField: string = 'description') => {
    let filtered = data.filter(item => {
      const matchesSearch = item[searchField]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && item.active) || 
        (statusFilter === 'inactive' && !item.active);
      
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

  const transactions = filterAndPaginate(mockTransactions);
  const options = filterAndPaginate(mockOptions);
  const systemUsers = filterAndPaginate(mockSystemUsers, 'name');
  const reports = filterAndPaginate(mockReports, 'name');
  const reportCriteria = filterAndPaginate(mockReportCriteria, 'criteriaName');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-1">Gestión de usuarios, transacciones, opciones y reportes del sistema</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1); setSearchTerm(''); setStatusFilter('all'); }}>
        {/* TabsList oculto ya que el menú lateral lo reemplaza */}
        <TabsList className="hidden">
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="transacciones">Transacciones</TabsTrigger>
          <TabsTrigger value="opciones">Opciones por Transacción</TabsTrigger>
          <TabsTrigger value="reportes">Reportes</TabsTrigger>
          <TabsTrigger value="criterios-reportes">Criterios por Reportes</TabsTrigger>
        </TabsList>

        {/* USUARIOS */}
        <TabsContent value="usuarios" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar usuarios por nombre y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-usuarios">Nombre / Usuario</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-usuarios"
                    placeholder="Buscar por nombre o usuario..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="status-usuarios">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-usuarios">
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
                  <Label htmlFor="export-usuarios">Exportar</Label>
                  <Button id="export-usuarios" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Usuarios del Sistema</CardTitle>
                  <CardDescription>Administración de usuarios y control de acceso</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('user', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Usuario
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo de Usuario</TableHead>
                    <TableHead>Usuario Modelo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemUsers.data.map((user: any) => (
                    <TableRow key={user.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{user.id}</TableCell>
                      <TableCell className="font-mono text-sm">{user.username}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            user.userType === 'admin' ? 'bg-sky-600 text-white' :
                            user.userType === 'supervisor' ? 'bg-purple-600 text-white' :
                            'bg-orange-600 text-white'
                          }
                        >
                          {user.userType === 'admin' ? 'Administrador' : 
                           user.userType === 'supervisor' ? 'Supervisor' : 'Seguridades'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isModel ? "default" : "outline"} className={user.isModel ? 'bg-blue-600' : ''}>
                          {user.isModel ? 'Sí' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={user.active ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                          {user.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-xs"
                          >
                            Resetear Contraseña
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openEditDialog('user', user)}
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
                                <AlertDialogTitle>¿Está seguro que desea eliminar?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El usuario será eliminado permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination totalPages={systemUsers.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRANSACCIONES */}
        <TabsContent value="transacciones" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar transacciones por descripción y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-transacciones">Descripción</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-transacciones"
                    placeholder="Buscar por descripción..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="status-transacciones">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-transacciones">
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
                  <Label htmlFor="export-transacciones">Exportar</Label>
                  <Button id="export-transacciones" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Transacciones del Sistema</CardTitle>
                  <CardDescription>Definición de módulos, menús y pestañas del sistema</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('transaction', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Transacción
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.data.map((trans: any) => (
                    <TableRow key={trans.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{trans.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{trans.module}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{trans.code}</TableCell>
                      <TableCell>{trans.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{trans.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={trans.active ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                          {trans.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openEditDialog('transaction', trans)}
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
                                <AlertDialogTitle>¿Está seguro que desea eliminar?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El registro será eliminado permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination totalPages={transactions.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* OPCIONES POR TRANSACCIÓN */}
        <TabsContent value="opciones" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar opciones por descripción y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-opciones">Descripción</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-opciones"
                    placeholder="Buscar por descripción..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="status-opciones">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-opciones">
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
                  <Label htmlFor="export-opciones">Exportar</Label>
                  <Button id="export-opciones" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Opciones de Transacciones</CardTitle>
                  <CardDescription>Definición de botones y acciones dentro de cada transacción</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('option', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Opción
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Transacción</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {options.data.map((opt: any) => (
                    <TableRow key={opt.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{opt.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{opt.transaction}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{opt.code}</TableCell>
                      <TableCell>{opt.description}</TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            opt.action === 'delete' ? 'bg-destructive' :
                            opt.action === 'create' ? 'bg-green-600' :
                            opt.action === 'update' ? 'bg-sky-500' :
                            'bg-info'
                          }
                        >
                          {opt.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={opt.active ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                          {opt.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openEditDialog('option', opt)}
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
                                <AlertDialogTitle>¿Está seguro que desea eliminar?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El registro será eliminado permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination totalPages={options.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* REPORTES */}
        <TabsContent value="reportes" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar reportes por nombre y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-reportes">Nombre / Código</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-reportes"
                    placeholder="Buscar por nombre o código..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="status-reportes">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-reportes">
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
                  <Label htmlFor="export-reportes">Exportar</Label>
                  <Button id="export-reportes" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Reportes Disponibles</CardTitle>
                  <CardDescription>Listado de reportes exportables a formato PDF</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('report', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Reporte
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre del Reporte</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Formato</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.data.map((report: any) => (
                    <TableRow key={report.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{report.id}</TableCell>
                      <TableCell className="font-mono text-sm">{report.code}</TableCell>
                      <TableCell>{report.name}</TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            report.category === 'Operacional' ? 'bg-blue-600 text-white' :
                            report.category === 'Financiero' ? 'bg-green-600 text-white' :
                            'bg-purple-600 text-white'
                          }
                        >
                          {report.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.format}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={report.active ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                          {report.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openEditDialog('report', report)}
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
                                <AlertDialogTitle>¿Está seguro que desea eliminar?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El reporte será eliminado permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination totalPages={reports.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* CRITERIOS POR REPORTES */}
        <TabsContent value="criterios-reportes" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar criterios por reporte y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-criterios">Nombre del Criterio</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-criterios"
                    placeholder="Buscar por criterio..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="status-criterios">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-criterios">
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
                  <Label htmlFor="export-criterios">Exportar</Label>
                  <Button id="export-criterios" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Criterios de Búsqueda por Reporte</CardTitle>
                  <CardDescription>Configuración de filtros disponibles para cada reporte (Empresa, Localidad, Departamento, Área, Rol de Pago, Grupo)</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('criteria', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Criterio
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Código Reporte</TableHead>
                    <TableHead>Criterio</TableHead>
                    <TableHead>Requerido</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportCriteria.data.map((criteria: any) => (
                    <TableRow key={criteria.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{criteria.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{criteria.reportCode}</Badge>
                      </TableCell>
                      <TableCell>{criteria.criteriaName}</TableCell>
                      <TableCell>
                        <Badge variant={criteria.required ? "default" : "secondary"} className={criteria.required ? 'bg-orange-600' : ''}>
                          {criteria.required ? 'Sí' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={criteria.active ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                          {criteria.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openEditDialog('criteria', criteria)}
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
                                <AlertDialogTitle>¿Está seguro que desea eliminar?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El criterio será eliminado permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination totalPages={reportCriteria.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editDialog.item ? 'Editar ' : 'Nuevo/a '}
              {editDialog.type === 'transaction' ? 'Transacción' : 
               editDialog.type === 'option' ? 'Opción' :
               editDialog.type === 'user' ? 'Usuario' :
               editDialog.type === 'report' ? 'Reporte' : 'Criterio'}
            </DialogTitle>
            <DialogDescription>
              Complete la información requerida
            </DialogDescription>
          </DialogHeader>
          
          <form className="space-y-4">
            {/* Transacciones */}
            {editDialog.type === 'transaction' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-id">ID *</Label>
                    <Input id="edit-id" defaultValue={editDialog.item?.id} placeholder="001" disabled={!!editDialog.item} />
                  </div>
                  <div>
                    <Label htmlFor="edit-module">Módulo *</Label>
                    <Select defaultValue={editDialog.item?.module || 'Mantenimiento'}>
                      <SelectTrigger id="edit-module">
                        <SelectValue placeholder="Seleccionar módulo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dashboard">Dashboard</SelectItem>
                        <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                        <SelectItem value="Configuración">Configuración</SelectItem>
                        <SelectItem value="Perfiles">Perfiles</SelectItem>
                        <SelectItem value="Empresa">Empresa</SelectItem>
                        <SelectItem value="Empleados">Empleados</SelectItem>
                        <SelectItem value="Procesos">Procesos</SelectItem>
                        <SelectItem value="Seguridades">Seguridades</SelectItem>
                        <SelectItem value="Usuarios">Usuarios</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-code">Código *</Label>
                    <Input id="edit-code" defaultValue={editDialog.item?.code} placeholder="MANT_FER" />
                  </div>
                  <div>
                    <Label htmlFor="edit-type">Tipo *</Label>
                    <Select defaultValue={editDialog.item?.type || 'tab'}>
                      <SelectTrigger id="edit-type">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="menu">Menu</SelectItem>
                        <SelectItem value="tab">Tab</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-desc">Descripción *</Label>
                  <Input id="edit-desc" defaultValue={editDialog.item?.description} placeholder="Descripción de la transacción" />
                </div>
              </>
            )}

            {/* Opciones */}
            {editDialog.type === 'option' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-id">ID *</Label>
                    <Input id="edit-id" defaultValue={editDialog.item?.id} placeholder="001" disabled={!!editDialog.item} />
                  </div>
                  <div>
                    <Label htmlFor="edit-transaction">Transacción *</Label>
                    <Select defaultValue={editDialog.item?.transaction || 'MANT_FER'}>
                      <SelectTrigger id="edit-transaction">
                        <SelectValue placeholder="Seleccionar transacción" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MANT_FER">MANT_FER - Feriados</SelectItem>
                        <SelectItem value="MANT_CAT">MANT_CAT - Catálogos</SelectItem>
                        <SelectItem value="CONF_ACC">CONF_ACC - Accesos</SelectItem>
                        <SelectItem value="EMP_EMPRESA">EMP_EMPRESA - Empresas</SelectItem>
                        <SelectItem value="EMPL_LIST">EMPL_LIST - Listado Empleados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-code">Código *</Label>
                    <Input id="edit-code" defaultValue={editDialog.item?.code} placeholder="BTN_NEW" />
                  </div>
                  <div>
                    <Label htmlFor="edit-action">Acción *</Label>
                    <Select defaultValue={editDialog.item?.action || 'create'}>
                      <SelectTrigger id="edit-action">
                        <SelectValue placeholder="Seleccionar acción" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="create">Create</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                        <SelectItem value="read">Read</SelectItem>
                        <SelectItem value="export">Export</SelectItem>
                        <SelectItem value="import">Import</SelectItem>
                        <SelectItem value="execute">Execute</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-desc">Descripción *</Label>
                  <Input id="edit-desc" defaultValue={editDialog.item?.description} placeholder="Descripción de la opción" />
                </div>
              </>
            )}

            {/* Usuarios */}
            {editDialog.type === 'user' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-id">ID *</Label>
                    <Input id="edit-id" defaultValue={editDialog.item?.id} placeholder="1" disabled={!!editDialog.item} />
                  </div>
                  <div>
                    <Label htmlFor="edit-username">Usuario *</Label>
                    <Input id="edit-username" defaultValue={editDialog.item?.username} placeholder="usuario@titanium.com" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-name">Nombre Completo *</Label>
                  <Input id="edit-name" defaultValue={editDialog.item?.name} placeholder="Juan Pérez" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-usertype">Tipo de Usuario *</Label>
                    <Select defaultValue={editDialog.item?.userType || 'supervisor'}>
                      <SelectTrigger id="edit-usertype">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="seguridades">Seguridades</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-8">
                    <Switch id="edit-ismodel" defaultChecked={editDialog.item?.isModel ?? false} />
                    <Label htmlFor="edit-ismodel">Usuario Modelo</Label>
                  </div>
                </div>
              </>
            )}

            {/* Reportes */}
            {editDialog.type === 'report' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-id">ID *</Label>
                    <Input id="edit-id" defaultValue={editDialog.item?.id} placeholder="1" disabled={!!editDialog.item} />
                  </div>
                  <div>
                    <Label htmlFor="edit-code">Código *</Label>
                    <Input id="edit-code" defaultValue={editDialog.item?.code} placeholder="RPT_ASIST_001" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-name">Nombre del Reporte *</Label>
                  <Input id="edit-name" defaultValue={editDialog.item?.name} placeholder="Reporte de Asistencia Diaria" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-category">Categoría *</Label>
                    <Select defaultValue={editDialog.item?.category || 'Operacional'}>
                      <SelectTrigger id="edit-category">
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Operacional">Operacional</SelectItem>
                        <SelectItem value="Financiero">Financiero</SelectItem>
                        <SelectItem value="Analítico">Analítico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-format">Formato *</Label>
                    <Select defaultValue={editDialog.item?.format || 'PDF'}>
                      <SelectTrigger id="edit-format">
                        <SelectValue placeholder="Seleccionar formato" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PDF">PDF</SelectItem>
                        <SelectItem value="Excel">Excel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Criterios */}
            {editDialog.type === 'criteria' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-id">ID *</Label>
                    <Input id="edit-id" defaultValue={editDialog.item?.id} placeholder="1" disabled={!!editDialog.item} />
                  </div>
                  <div>
                    <Label htmlFor="edit-reportcode">Código Reporte *</Label>
                    <Select defaultValue={editDialog.item?.reportCode || 'RPT_ASIST_001'}>
                      <SelectTrigger id="edit-reportcode">
                        <SelectValue placeholder="Seleccionar reporte" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockReports.map(report => (
                          <SelectItem key={report.id} value={report.code}>
                            {report.code} - {report.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-criterianame">Nombre del Criterio *</Label>
                    <Select defaultValue={editDialog.item?.criteriaName || 'Empresa'}>
                      <SelectTrigger id="edit-criterianame">
                        <SelectValue placeholder="Seleccionar criterio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Empresa">Empresa</SelectItem>
                        <SelectItem value="Localidad">Localidad</SelectItem>
                        <SelectItem value="Departamento">Departamento</SelectItem>
                        <SelectItem value="Área">Área</SelectItem>
                        <SelectItem value="Rol de Pago">Rol de Pago</SelectItem>
                        <SelectItem value="Grupo">Grupo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-8">
                    <Switch id="edit-required" defaultChecked={editDialog.item?.required ?? false} />
                    <Label htmlFor="edit-required">Criterio Requerido</Label>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <Switch id="edit-active" defaultChecked={editDialog.item?.active ?? true} />
              <Label htmlFor="edit-active">Activo</Label>
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>Cancelar</Button>
            <Button onClick={closeEditDialog}>Grabar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
