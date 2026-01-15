import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, Edit, Trash2, Building2, MapPin, Network, Layers, Briefcase, DollarSign, BarChart3, Users, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { toast } from 'sonner@2.0.3';
import { demoCompanies, demoLocations, demoDepartments, demoAreas } from './DemoData';

// Usar datos de demostración centralizados
const mockCompanies = demoCompanies.map(c => ({
  id: c.id,
  name: c.name,
  abbreviation: c.code,
  ruc: c.ruc,
  sector: c.sector,
  active: c.active
}));

const mockLocations = demoLocations.map(l => ({
  id: l.id,
  company: l.company,
  name: l.name,
  abbreviation: l.code,
  address: l.address,
  city: l.city,
  active: l.active
}));

const mockDepartments = demoDepartments.map(d => ({
  id: d.id,
  company: d.company,
  location: d.location,
  name: d.name,
  abbreviation: d.code,
  manager: d.manager,
  active: d.active
}));

const mockAreas = demoAreas.map(a => ({
  id: a.id,
  department: a.department,
  name: a.name,
  abbreviation: a.code,
  supervisor: a.supervisor,
  active: a.active
}));

const mockPositions = [
  { id: 1, name: 'Operador de Producción', abbreviation: 'OP', active: true },
  { id: 2, name: 'Técnico de Mantenimiento', abbreviation: 'TEC', active: true },
  { id: 3, name: 'Supervisor de Turno', abbreviation: 'SUP', active: false },
  { id: 4, name: 'Jefe de Producción', abbreviation: 'JEFE', active: true },
];

const mockPayrollRoles = [
  { id: 1, name: 'Mensual', abbreviation: 'MEN', active: true },
  { id: 2, name: 'Quincenal', abbreviation: 'QUI', active: true },
  { id: 3, name: 'Semanal', abbreviation: 'SEM', active: false },
];

const mockCostCenters = [
  { id: 1, name: 'Producción Planta 1', abbreviation: 'CC-P1', active: true },
  { id: 2, name: 'Administración General', abbreviation: 'CC-ADM', active: true },
  { id: 3, name: 'Ventas y Marketing', abbreviation: 'CC-VEN', active: false },
];

const mockGroups = [
  { id: 1, name: 'Grupo Rotativo A', abbreviation: 'GRA', active: true },
  { id: 2, name: 'Grupo Rotativo B', abbreviation: 'GRB', active: true },
  { id: 3, name: 'Grupo Rotativo C', abbreviation: 'GRC', active: false },
];

const ITEMS_PER_PAGE = 10;

export default function Empresas({ activeTab: initialTab = 'empresas', title = 'Empresa' }: { activeTab?: string; title?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Actualizar tab cuando cambie desde el menú
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [currentPage, setCurrentPage] = useState(1);
  const [editDialog, setEditDialog] = useState<{ open: boolean; type: string; item: any }>({ open: false, type: '', item: null });

  const openEditDialog = (type: string, item: any = null) => {
    setEditDialog({ open: true, type, item });
  };

  const closeEditDialog = () => {
    setEditDialog({ open: false, type: '', item: null });
  };

  const handleSave = () => {
    const typeNames: Record<string, string> = {
      'company': 'Empresa',
      'location': 'Localidad',
      'department': 'Departamento',
      'area': 'Área',
      'position': 'Cargo',
      'payroll': 'Rol de Pago',
      'costcenter': 'Centro de Costo',
      'group': 'Grupo'
    };
    
    const typeName = typeNames[editDialog.type] || 'Registro';
    const action = editDialog.item ? 'actualizado' : 'creado';
    
    toast.success(`${typeName} ${action} exitosamente`, {
      description: `Los cambios han sido guardados correctamente`
    });
    closeEditDialog();
  };

  const handleDelete = (type: string) => {
    const typeNames: Record<string, string> = {
      'company': 'Empresa',
      'location': 'Localidad',
      'department': 'Departamento',
      'area': 'Área',
      'position': 'Cargo',
      'payroll': 'Rol de Pago',
      'costcenter': 'Centro de Costo',
      'group': 'Grupo'
    };
    
    toast.success(`${typeNames[type]} eliminada exitosamente`, {
      description: 'El registro ha sido eliminado del sistema'
    });
  };

  // Función para filtrar y paginar
  const filterAndPaginate = (data: any[], searchField: string = 'name') => {
    let filtered = data.filter(item => {
      const matchesSearch = item[searchField]?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && item.active) || 
        (statusFilter === 'inactive' && !item.active);
      const matchesCompany = companyFilter === 'all' || item.company === companyFilter;
      const matchesDepartment = departmentFilter === 'all' || item.department === departmentFilter;
      
      return matchesSearch && matchesStatus && matchesCompany && matchesDepartment;
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

  const companies = filterAndPaginate(mockCompanies);
  const locations = filterAndPaginate(mockLocations);
  const departments = filterAndPaginate(mockDepartments);
  const areas = filterAndPaginate(mockAreas);
  const positions = filterAndPaginate(mockPositions);
  const payrollRoles = filterAndPaginate(mockPayrollRoles);
  const costCenters = filterAndPaginate(mockCostCenters);
  const groups = filterAndPaginate(mockGroups);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-1">Gestión de empresas, localidades y jerarquía organizacional</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1); setSearchTerm(''); setStatusFilter('all'); }}>
        {/* TabsList oculto ya que el menú lateral lo reemplaza */}
        <TabsList className="hidden">
          <TabsTrigger value="empresas">Listado</TabsTrigger>
          <TabsTrigger value="localidades">Localidades</TabsTrigger>
          <TabsTrigger value="departamentos">Departamentos</TabsTrigger>
          <TabsTrigger value="areas">Áreas</TabsTrigger>
          <TabsTrigger value="cargos">Cargos</TabsTrigger>
          <TabsTrigger value="roles">Roles de Pago</TabsTrigger>
          <TabsTrigger value="centros">Centros de Costo</TabsTrigger>
          <TabsTrigger value="grupos">Grupos</TabsTrigger>
        </TabsList>

        {/* EMPRESAS */}
        <TabsContent value="empresas" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar empresas por descripción y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-empresas">Descripción</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-empresas"
                    placeholder="Buscar por descripción..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="status-empresas">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-empresas">
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
                  <Label htmlFor="export-empresas">Exportar</Label>
                  <Button id="export-empresas" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Empresas Registradas</CardTitle>
                  <CardDescription>Gestión de empresas del grupo</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('company', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Empresa
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Abreviatura</TableHead>
                    <TableHead>RUC</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.data.map((company: any) => (
                    <TableRow key={company.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{company.id}</TableCell>
                      <TableCell>{company.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{company.abbreviation}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{company.ruc}</TableCell>
                      <TableCell>
                        <Badge className={company.active ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                          {company.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openEditDialog('company', company)}
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
              <Pagination totalPages={companies.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOCALIDADES */}
        <TabsContent value="localidades" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar localidades por descripción, empresa y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                <div className="relative">
                  <Label htmlFor="search-localidades">Descripción</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-localidades"
                    placeholder="Buscar por descripción..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="company-localidades">Empresa</Label>
                  <Select value={companyFilter} onValueChange={(v) => { setCompanyFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="company-localidades">
                      <SelectValue placeholder="Empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="Titanium Corp">Titanium Corp</SelectItem>
                      <SelectItem value="Platinum Industries">Platinum Industries</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status-localidades">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-localidades">
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
                  <Label htmlFor="export-localidades">Exportar</Label>
                  <Button id="export-localidades" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Localidades</CardTitle>
                  <CardDescription>Gestión de sucursales y ubicaciones</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('location', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Localidad
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Abreviatura</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.data.map((location: any) => (
                    <TableRow key={location.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{location.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{location.company}</Badge>
                      </TableCell>
                      <TableCell>{location.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{location.abbreviation}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={location.active ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                          {location.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openEditDialog('location', location)}
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
              <Pagination totalPages={locations.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* DEPARTAMENTOS */}
        <TabsContent value="departamentos" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar departamentos por descripción, empresa y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                <div className="relative">
                  <Label htmlFor="search-departamentos">Descripción</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-departamentos"
                    placeholder="Buscar por descripción..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="company-departamentos">Empresa</Label>
                  <Select value={companyFilter} onValueChange={(v) => { setCompanyFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="company-departamentos">
                      <SelectValue placeholder="Empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="Titanium Corp">Titanium Corp</SelectItem>
                      <SelectItem value="Platinum Industries">Platinum Industries</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status-departamentos">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-departamentos">
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
                  <Label htmlFor="export-departamentos">Exportar</Label>
                  <Button id="export-departamentos" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Departamentos</CardTitle>
                  <CardDescription>Gestión de departamentos organizacionales</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('department', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Departamento
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Abreviatura</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.data.map((dept: any) => (
                    <TableRow key={dept.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{dept.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{dept.company}</Badge>
                      </TableCell>
                      <TableCell>{dept.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{dept.abbreviation}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={dept.active ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                          {dept.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openEditDialog('department', dept)}
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
              <Pagination totalPages={departments.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* AREAS */}
        <TabsContent value="areas" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar áreas por descripción, departamento y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                <div className="relative">
                  <Label htmlFor="search-areas">Descripción</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-areas"
                    placeholder="Buscar por descripción..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="department-areas">Departamento</Label>
                  <Select value={departmentFilter} onValueChange={(v) => { setDepartmentFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="department-areas">
                      <SelectValue placeholder="Departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Producción">Producción</SelectItem>
                      <SelectItem value="Logística">Logística</SelectItem>
                      <SelectItem value="Administración">Administración</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status-areas">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-areas">
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
                  <Label htmlFor="export-areas">Exportar</Label>
                  <Button id="export-areas" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Áreas</CardTitle>
                  <CardDescription>Gestión de áreas dentro de departamentos</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('area', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Área
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Abreviatura</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {areas.data.map((area: any) => (
                    <TableRow key={area.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{area.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{area.department}</Badge>
                      </TableCell>
                      <TableCell>{area.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{area.abbreviation}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={area.active ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                          {area.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openEditDialog('area', area)}
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
              <Pagination totalPages={areas.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* CARGOS - Similar structure */}
        <TabsContent value="cargos" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar cargos por descripción y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-cargos">Descripción</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-cargos"
                    placeholder="Buscar por descripción..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="status-cargos">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-cargos">
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
                  <Label htmlFor="export-cargos">Exportar</Label>
                  <Button id="export-cargos" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Cargos</CardTitle>
                  <CardDescription>Gestión de cargos y posiciones</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('position', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Cargo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Abreviatura</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.data.map((position: any) => (
                    <TableRow key={position.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{position.id}</TableCell>
                      <TableCell>{position.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{position.abbreviation}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={position.active ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                          {position.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openEditDialog('position', position)}
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
              <Pagination totalPages={positions.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROLES DE PAGO */}
        <TabsContent value="roles" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar roles de pago por descripción y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-roles">Descripción</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-roles"
                    placeholder="Buscar por descripción..."
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
                  <Label htmlFor="export-roles">Exportar</Label>
                  <Button id="export-roles" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Roles de Pago</CardTitle>
                  <CardDescription>Periodicidad de ejecución de generación de novedades</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('payrollRole', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Rol de Pago
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Abreviatura</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRoles.data.map((role: any) => (
                    <TableRow key={role.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{role.id}</TableCell>
                      <TableCell>{role.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{role.abbreviation}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={role.active ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                          {role.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openEditDialog('payrollRole', role)}
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
              <Pagination totalPages={payrollRoles.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* CENTROS DE COSTO */}
        <TabsContent value="centros" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar centros de costo por descripción y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-centros">Descripción</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-centros"
                    placeholder="Buscar por descripción..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="status-centros">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-centros">
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
                  <Label htmlFor="export-centros">Exportar</Label>
                  <Button id="export-centros" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Centros de Costo</CardTitle>
                  <CardDescription>Cuentas contables para asociar empleados y generar información</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('costCenter', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Centro de Costo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Abreviatura</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costCenters.data.map((center: any) => (
                    <TableRow key={center.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{center.id}</TableCell>
                      <TableCell>{center.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{center.abbreviation}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={center.active ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                          {center.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openEditDialog('costCenter', center)}
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
              <Pagination totalPages={costCenters.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* GRUPOS */}
        <TabsContent value="grupos" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar grupos por descripción y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-grupos">Descripción</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-grupos"
                    placeholder="Buscar por descripción..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="status-grupos">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-grupos">
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
                  <Label htmlFor="export-grupos">Exportar</Label>
                  <Button id="export-grupos" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Grupos</CardTitle>
                  <CardDescription>Clasificación de empleados para asignación dinámica de turnos de trabajo</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('group', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Grupo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Abreviatura</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.data.map((group: any) => (
                    <TableRow key={group.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{group.id}</TableCell>
                      <TableCell>{group.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{group.abbreviation}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={group.active ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                          {group.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openEditDialog('group', group)}
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
              <Pagination totalPages={groups.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editDialog.item ? 'Editar ' : 'Nuevo '}
              {editDialog.type === 'company' ? 'Empresa' : 
               editDialog.type === 'location' ? 'Localidad' : 
               editDialog.type === 'department' ? 'Departamento' : 
               editDialog.type === 'area' ? 'Área' : 
               editDialog.type === 'position' ? 'Cargo' : 
               editDialog.type === 'payrollRole' ? 'Rol de Pago' : 
               editDialog.type === 'costCenter' ? 'Centro de Costo' : 'Grupo'}
            </DialogTitle>
            <DialogDescription>
              Complete la información requerida
            </DialogDescription>
          </DialogHeader>
          
          <form className="space-y-4">
            {/* Empresas */}
            {editDialog.type === 'company' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-id">ID *</Label>
                    <Input id="edit-id" defaultValue={editDialog.item?.id} placeholder="001" disabled={!!editDialog.item} />
                  </div>
                  <div>
                    <Label htmlFor="edit-ruc">RUC *</Label>
                    <Input id="edit-ruc" defaultValue={editDialog.item?.ruc} placeholder="1234567890001" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-name">Nombre *</Label>
                  <Input id="edit-name" defaultValue={editDialog.item?.name} placeholder="Nombre de la empresa" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-abbr">Abreviatura *</Label>
                    <Input id="edit-abbr" defaultValue={editDialog.item?.abbreviation} placeholder="ABC" maxLength={10} />
                  </div>
                  <div>
                    <Label htmlFor="edit-locations">Localidades</Label>
                    <Input id="edit-locations" defaultValue={editDialog.item?.locations} placeholder="3" type="number" disabled />
                  </div>
                </div>
              </>
            )}

            {/* Localidades */}
            {editDialog.type === 'location' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-id">ID *</Label>
                    <Input id="edit-id" defaultValue={editDialog.item?.id} placeholder="001" disabled={!!editDialog.item} />
                  </div>
                  <div>
                    <Label htmlFor="edit-company">Empresa *</Label>
                    <Select defaultValue={editDialog.item?.company || 'Titanium Corp'}>
                      <SelectTrigger id="edit-company">
                        <SelectValue placeholder="Seleccionar empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Titanium Corp">Titanium Corp</SelectItem>
                        <SelectItem value="Platinum Industries">Platinum Industries</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-name">Nombre *</Label>
                  <Input id="edit-name" defaultValue={editDialog.item?.name} placeholder="Nombre de la localidad" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-abbr">Abreviatura *</Label>
                    <Input id="edit-abbr" defaultValue={editDialog.item?.abbreviation} placeholder="ABC" maxLength={10} />
                  </div>
                  <div>
                    <Label htmlFor="edit-city">Ciudad *</Label>
                    <Select defaultValue={editDialog.item?.city || 'Guayaquil'}>
                      <SelectTrigger id="edit-city">
                        <SelectValue placeholder="Seleccionar ciudad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Guayaquil">Guayaquil</SelectItem>
                        <SelectItem value="Quito">Quito</SelectItem>
                        <SelectItem value="Cuenca">Cuenca</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Departamentos */}
            {editDialog.type === 'department' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-id">ID *</Label>
                    <Input id="edit-id" defaultValue={editDialog.item?.id} placeholder="001" disabled={!!editDialog.item} />
                  </div>
                  <div>
                    <Label htmlFor="edit-company">Empresa *</Label>
                    <Select defaultValue={editDialog.item?.company || 'Titanium Corp'}>
                      <SelectTrigger id="edit-company">
                        <SelectValue placeholder="Seleccionar empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Titanium Corp">Titanium Corp</SelectItem>
                        <SelectItem value="Platinum Industries">Platinum Industries</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-name">Nombre *</Label>
                  <Input id="edit-name" defaultValue={editDialog.item?.name} placeholder="Nombre del departamento" />
                </div>
                <div>
                  <Label htmlFor="edit-abbr">Abreviatura *</Label>
                  <Input id="edit-abbr" defaultValue={editDialog.item?.abbreviation} placeholder="ABC" maxLength={10} />
                </div>
              </>
            )}

            {/* Áreas */}
            {editDialog.type === 'area' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-id">ID *</Label>
                    <Input id="edit-id" defaultValue={editDialog.item?.id} placeholder="001" disabled={!!editDialog.item} />
                  </div>
                  <div>
                    <Label htmlFor="edit-department">Departamento *</Label>
                    <Select defaultValue={editDialog.item?.department || 'Producción'}>
                      <SelectTrigger id="edit-department">
                        <SelectValue placeholder="Seleccionar departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Producción">Producción</SelectItem>
                        <SelectItem value="Logística">Logística</SelectItem>
                        <SelectItem value="Administración">Administración</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-name">Nombre *</Label>
                  <Input id="edit-name" defaultValue={editDialog.item?.name} placeholder="Nombre del área" />
                </div>
                <div>
                  <Label htmlFor="edit-abbr">Abreviatura *</Label>
                  <Input id="edit-abbr" defaultValue={editDialog.item?.abbreviation} placeholder="ABC" maxLength={10} />
                </div>
              </>
            )}

            {/* Cargos, Roles de Pago, Centros de Costo, Grupos (todos comparten estructura similar) */}
            {['position', 'payrollRole', 'costCenter', 'group'].includes(editDialog.type) && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-id">ID *</Label>
                    <Input id="edit-id" defaultValue={editDialog.item?.id} placeholder="001" disabled={!!editDialog.item} />
                  </div>
                  <div>
                    <Label htmlFor="edit-abbr">Abreviatura *</Label>
                    <Input id="edit-abbr" defaultValue={editDialog.item?.abbreviation} placeholder="ABC" maxLength={10} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-name">Nombre *</Label>
                  <Input id="edit-name" defaultValue={editDialog.item?.name} placeholder="Nombre" />
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
            <Button onClick={handleSave}>Grabar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
