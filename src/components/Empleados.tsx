import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, Edit, Trash2, Search, User, Calendar, Clock, FileText, Download, ChevronLeft, ChevronRight, X, Save, PlayCircle, Fingerprint, UserCircle, Wand2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Avatar, AvatarFallback } from './ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import PlanificacionTurnosManual from './PlanificacionTurnosManual';
import PlanificacionTurnosIA from './PlanificacionTurnosIA';

const mockEmployees = [
  { 
    id: 1, 
    code: 'EMP001', 
    nombres: 'Juan Carlos', 
    apellidos: 'Pérez González',
    name: 'Juan Pérez', 
    document: '001-1234567-8', 
    fechaNacimiento: '1985-06-15',
    sexo: 'M',
    company: 'Titanium Corp', 
    localidad: 'Planta Guayaquil',
    department: 'Producción',
    area: 'Ensamblaje', 
    perfil: 'Operador de Producción',
    cargo: 'Operador Senior',
    rolPago: 'Quincenal',
    centroCosto: 'CC-P1',
    grupo: 'Grupo A',
    trabajaFeriado: 'Sí',
    tipoContrato: 'Indefinido',
    fechaIngreso: '2020-01-15',
    fechaSalida: null,
    shift: 'Diurno', 
    active: true 
  },
  { 
    id: 2, 
    code: 'EMP002', 
    nombres: 'María Teresa', 
    apellidos: 'García Mendoza',
    name: 'María García', 
    document: '001-9876543-2', 
    fechaNacimiento: '1990-03-22',
    sexo: 'F',
    company: 'Titanium Corp', 
    localidad: 'Planta Quito',
    department: 'Logística',
    area: 'Almacén', 
    perfil: 'Supervisor',
    cargo: 'Supervisor de Turno',
    rolPago: 'Mensual',
    centroCosto: 'CC-ADM',
    grupo: 'Grupo B',
    trabajaFeriado: 'No',
    tipoContrato: 'Indefinido',
    fechaIngreso: '2019-05-10',
    fechaSalida: null,
    shift: 'Nocturno', 
    active: true 
  },
];

const mockAttendances = [
  { id: 1, empleado: 'Juan Pérez', cedula: '001-1234567-8', fecha: '2025-10-18', hora: '08:00:00', tecla: 'Entrada Trabajo', dispositivo: 'Terminal 01' },
  { id: 2, empleado: 'Juan Pérez', cedula: '001-1234567-8', fecha: '2025-10-18', hora: '12:00:00', tecla: 'Inicio Almuerzo', dispositivo: 'Terminal 01' },
  { id: 3, empleado: 'Juan Pérez', cedula: '001-1234567-8', fecha: '2025-10-18', hora: '13:00:00', tecla: 'Fin Almuerzo', dispositivo: 'Terminal 01' },
  { id: 4, empleado: 'Juan Pérez', cedula: '001-1234567-8', fecha: '2025-10-18', hora: '17:00:00', tecla: 'Salida Trabajo', dispositivo: 'Terminal 01' },
  { id: 5, empleado: 'María García', cedula: '001-9876543-2', fecha: '2025-10-18', hora: '08:15:00', tecla: 'Entrada Trabajo', dispositivo: 'Terminal 02' },
];

const mockJustificaciones = [
  { id: 1, empleado: 'Juan Pérez', fecha: '2025-10-15', tipoJustificacion: 'Incapacidad Médica', motivo: 'Gripe', documento: 'MED-001.pdf', estado: 'Pendiente' },
  { id: 2, empleado: 'María García', fecha: '2025-10-16', tipoJustificacion: 'Permiso Personal', motivo: 'Asunto familiar', documento: 'N/A', estado: 'Aprobado' },
  { id: 3, empleado: 'Juan Pérez', fecha: '2025-10-17', tipoJustificacion: 'Cita Médica', motivo: 'Control médico', documento: 'MED-002.pdf', estado: 'Rechazado' },
];

const ITEMS_PER_PAGE = 10;

export default function Empleados({ activeTab: initialTab = 'listado', title = 'Empleados' }: { activeTab?: string; title?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [employeeDialogTab, setEmployeeDialogTab] = useState('personales');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editDialog, setEditDialog] = useState<{open: boolean, type: string, item: any}>({ open: false, type: '', item: null });

  // Actualizar tab cuando cambie desde el menú
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const openEditDialog = (type: string, item: any = null) => {
    setEditDialog({ open: true, type, item });
    if (type === 'employee') {
      setEmployeeDialogTab('personales');
    }
  };

  const closeEditDialog = () => {
    setEditDialog({ open: false, type: '', item: null });
  };

  const filterAndPaginate = (data: any[], searchField: string = 'name') => {
    let filtered = data.filter(item => {
      const matchesSearch = 
        item[searchField]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.empleado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && item.active) || 
        (statusFilter === 'inactive' && !item.active) ||
        (statusFilter === 'pendiente' && item.estado === 'Pendiente') ||
        (statusFilter === 'aprobado' && item.estado === 'Aprobado') ||
        (statusFilter === 'rechazado' && item.estado === 'Rechazado');
      const matchesCompany = companyFilter === 'all' || item.company === companyFilter;
      
      return matchesSearch && matchesStatus && matchesCompany;
    });

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedData = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return { data: paginatedData, total: filtered.length, totalPages };
  };

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

  const employees = filterAndPaginate(mockEmployees);
  const attendances = filterAndPaginate(mockAttendances, 'empleado');
  const justificaciones = filterAndPaginate(mockJustificaciones, 'empleado');

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl mb-1">{title}</h1>
        <p className="text-sm text-muted-foreground">Gestión de empleados, marcaciones y justificaciones</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1); setSearchTerm(''); setStatusFilter('all'); setCompanyFilter('all'); }}>
        {/* TabsList oculto ya que el menú lateral lo reemplaza */}
        <TabsList className="hidden">
          <TabsTrigger value="listado">Datos de Empleados</TabsTrigger>
          <TabsTrigger value="marcaciones">Revisión de Marcaciones</TabsTrigger>
          <TabsTrigger value="justificaciones">Registro de Justificaciones</TabsTrigger>
          <TabsTrigger value="horarios">Planificación Manual</TabsTrigger>
          <TabsTrigger value="planificacion-ia">Planificación 24/7 IA</TabsTrigger>
        </TabsList>

        {/* DATOS DE EMPLEADOS */}
        <TabsContent value="listado" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Criterios de Búsqueda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                <div className="relative">
                  <Label htmlFor="search">Nombre de empleado</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="company">Empresa</Label>
                  <Select value={companyFilter} onValueChange={(v) => { setCompanyFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="company">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="Titanium Corp">Titanium Corp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="inactive">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={() => openEditDialog('employee', null)} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Empleado
                  </Button>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Empleados Registrados</CardTitle>
                <Badge variant="secondary">{employees.total} empleados</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre Completo</TableHead>
                    <TableHead>Cédula/Pasaporte</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.data.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <Badge variant="outline">{emp.code}</Badge>
                      </TableCell>
                      <TableCell>{emp.name}</TableCell>
                      <TableCell>{emp.document}</TableCell>
                      <TableCell>{emp.company}</TableCell>
                      <TableCell>{emp.department}</TableCell>
                      <TableCell>
                        <Badge className={emp.active ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>
                          {emp.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog('employee', emp)}
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
                                  Esta acción no se puede deshacer.
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
              <Pagination totalPages={employees.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* REVISIÓN DE MARCACIONES */}
        <TabsContent value="marcaciones" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Criterios de Búsqueda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                <div className="relative">
                  <Label htmlFor="search-marc">Empleado</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-marc"
                    placeholder="Buscar empleado..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="fecha-inicio">Fecha Inicio</Label>
                  <Input id="fecha-inicio" type="date" defaultValue="2025-10-18" />
                </div>
                <div>
                  <Label htmlFor="fecha-fin">Fecha Fin</Label>
                  <Input id="fecha-fin" type="date" defaultValue="2025-10-18" />
                </div>
                <div className="flex items-end">
                  <Button onClick={() => openEditDialog('marcacion', null)} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Marcación
                  </Button>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Marcaciones Registradas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Cédula</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Tecla</TableHead>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendances.data.map((att) => (
                    <TableRow key={att.id}>
                      <TableCell>{att.empleado}</TableCell>
                      <TableCell>{att.cedula}</TableCell>
                      <TableCell>{att.fecha}</TableCell>
                      <TableCell className="font-mono">{att.hora}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{att.tecla}</Badge>
                      </TableCell>
                      <TableCell>{att.dispositivo}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog('marcacion', att)}
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
                                  Esta acción no se puede deshacer.
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
              <Pagination totalPages={attendances.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* REGISTRO DE JUSTIFICACIONES */}
        <TabsContent value="justificaciones" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Criterios de Búsqueda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                <div className="relative">
                  <Label htmlFor="search-just">Empleado</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-just"
                    placeholder="Buscar empleado..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="fecha-just">Fecha</Label>
                  <Input id="fecha-just" type="date" />
                </div>
                <div>
                  <Label htmlFor="status-just">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-just">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="aprobado">Aprobado</SelectItem>
                      <SelectItem value="rechazado">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={() => openEditDialog('justificacion', null)} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Justificación
                  </Button>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Justificaciones Registradas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {justificaciones.data.map((just) => (
                    <TableRow key={just.id}>
                      <TableCell>{just.empleado}</TableCell>
                      <TableCell>{just.fecha}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{just.tipoJustificacion}</Badge>
                      </TableCell>
                      <TableCell>{just.motivo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{just.documento}</TableCell>
                      <TableCell>
                        <Badge className={
                          just.estado === 'Aprobado' ? 'bg-green-600 text-white' :
                          just.estado === 'Rechazado' ? 'bg-red-600 text-white' :
                          'bg-yellow-600 text-white'
                        }>
                          {just.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog('justificacion', just)}
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
                                  Esta acción no se puede deshacer.
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
              <Pagination totalPages={justificaciones.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* PLANIFICACIÓN MANUAL DE TURNOS */}
        <TabsContent value="horarios" className="mt-6">
          <PlanificacionTurnosManual />
        </TabsContent>

        {/* PLANIFICACIÓN 24/7 IA */}
        <TabsContent value="planificacion-ia" className="mt-6">
          <PlanificacionTurnosIA />
        </TabsContent>
      </Tabs>

      {/* DIALOG EMPLEADO CON DOS PESTAÑAS */}
      <Dialog open={editDialog.open && editDialog.type === 'employee'} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editDialog.item ? 'Editar Empleado' : 'Nuevo Empleado'}</DialogTitle>
            <DialogDescription>
              {editDialog.item ? 'Modificar la información del empleado' : 'Ingresar los datos del nuevo empleado'}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={employeeDialogTab} onValueChange={setEmployeeDialogTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personales" className="data-[state=active]:bg-[#0074D9] data-[state=active]:text-white">
                <UserCircle className="w-4 h-4 mr-2" />
                Datos Personales
              </TabsTrigger>
              <TabsTrigger value="organizacional" className="data-[state=active]:bg-[#0074D9] data-[state=active]:text-white">
                <User className="w-4 h-4 mr-2" />
                Posición Organizacional
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personales" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombres">Nombres</Label>
                  <Input id="nombres" defaultValue={editDialog.item?.nombres} placeholder="Juan Carlos" />
                </div>
                <div>
                  <Label htmlFor="apellidos">Apellidos</Label>
                  <Input id="apellidos" defaultValue={editDialog.item?.apellidos} placeholder="Pérez González" />
                </div>
                <div>
                  <Label htmlFor="cedula">Cédula/Pasaporte</Label>
                  <Input id="cedula" defaultValue={editDialog.item?.document} placeholder="001-1234567-8" />
                </div>
                <div>
                  <Label htmlFor="fechaNac">Fecha de Nacimiento</Label>
                  <Input id="fechaNac" type="date" defaultValue={editDialog.item?.fechaNacimiento} />
                </div>
                <div>
                  <Label htmlFor="sexo">Sexo</Label>
                  <Select defaultValue={editDialog.item?.sexo || 'M'}>
                    <SelectTrigger id="sexo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Femenino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="foto">Foto</Label>
                  <Input id="foto" type="file" accept="image/*" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="estado-personal">Estado</Label>
                  <Select defaultValue={editDialog.item?.active ? 'active' : 'inactive'}>
                    <SelectTrigger id="estado-personal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="organizacional" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="empresa">Empresa</Label>
                  <Select defaultValue={editDialog.item?.company}>
                    <SelectTrigger id="empresa">
                      <SelectValue placeholder="Seleccionar empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Titanium Corp">Titanium Corp</SelectItem>
                      <SelectItem value="Platinum Industries">Platinum Industries</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="localidad">Localidad</Label>
                  <Select defaultValue={editDialog.item?.localidad}>
                    <SelectTrigger id="localidad">
                      <SelectValue placeholder="Seleccionar localidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Planta Guayaquil">Planta Guayaquil</SelectItem>
                      <SelectItem value="Planta Quito">Planta Quito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="departamento">Departamento</Label>
                  <Select defaultValue={editDialog.item?.department}>
                    <SelectTrigger id="departamento">
                      <SelectValue placeholder="Seleccionar departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Producción">Producción</SelectItem>
                      <SelectItem value="Logística">Logística</SelectItem>
                      <SelectItem value="Administración">Administración</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="area">Área</Label>
                  <Select defaultValue={editDialog.item?.area}>
                    <SelectTrigger id="area">
                      <SelectValue placeholder="Seleccionar área" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ensamblaje">Ensamblaje</SelectItem>
                      <SelectItem value="Almacén">Almacén</SelectItem>
                      <SelectItem value="Recursos Humanos">Recursos Humanos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="centroCosto">Centro de Costo</Label>
                  <Select defaultValue={editDialog.item?.centroCosto}>
                    <SelectTrigger id="centroCosto">
                      <SelectValue placeholder="Seleccionar centro de costo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CC-P1">CC-P1</SelectItem>
                      <SelectItem value="CC-ADM">CC-ADM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="perfil">Perfil</Label>
                  <Select defaultValue={editDialog.item?.perfil}>
                    <SelectTrigger id="perfil">
                      <SelectValue placeholder="Seleccionar perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Operador de Producción">Operador de Producción</SelectItem>
                      <SelectItem value="Supervisor">Supervisor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input id="cargo" defaultValue={editDialog.item?.cargo} placeholder="Operador Senior" />
                </div>
                <div>
                  <Label htmlFor="rolPago">Rol de Pago</Label>
                  <Select defaultValue={editDialog.item?.rolPago}>
                    <SelectTrigger id="rolPago">
                      <SelectValue placeholder="Seleccionar rol de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Quincenal">Quincenal</SelectItem>
                      <SelectItem value="Mensual">Mensual</SelectItem>
                      <SelectItem value="Semanal">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="grupo">Grupo</Label>
                  <Select defaultValue={editDialog.item?.grupo}>
                    <SelectTrigger id="grupo">
                      <SelectValue placeholder="Seleccionar grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Grupo A">Grupo A</SelectItem>
                      <SelectItem value="Grupo B">Grupo B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="trabajaFeriado">Trabaja en Feriado</Label>
                  <Select defaultValue={editDialog.item?.trabajaFeriado || 'No'}>
                    <SelectTrigger id="trabajaFeriado">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sí">Sí</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tipoContrato">Tipo de Contrato</Label>
                  <Select defaultValue={editDialog.item?.tipoContrato}>
                    <SelectTrigger id="tipoContrato">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Indefinido">Indefinido</SelectItem>
                      <SelectItem value="Temporal">Temporal</SelectItem>
                      <SelectItem value="Por Obra">Por Obra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fechaIngreso">Fecha de Ingreso</Label>
                  <Input id="fechaIngreso" type="date" defaultValue={editDialog.item?.fechaIngreso} />
                </div>
                <div>
                  <Label htmlFor="fechaSalida">Fecha de Salida</Label>
                  <Input id="fechaSalida" type="date" defaultValue={editDialog.item?.fechaSalida || ''} />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="estado-org">Estado</Label>
                  <Select defaultValue={editDialog.item?.active ? 'active' : 'inactive'}>
                    <SelectTrigger id="estado-org">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={closeEditDialog}>
              <Save className="w-4 h-4 mr-2" />
              Grabar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG MARCACIÓN */}
      <Dialog open={editDialog.open && editDialog.type === 'marcacion'} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editDialog.item ? 'Editar Marcación' : 'Nueva Marcación'}</DialogTitle>
            <DialogDescription>
              Registre o modifique la información de la marcación biométrica
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="emp-marc">Empleado</Label>
              <Input id="emp-marc" defaultValue={editDialog.item?.empleado} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fecha-marc">Fecha</Label>
                <Input id="fecha-marc" type="date" defaultValue={editDialog.item?.fecha} />
              </div>
              <div>
                <Label htmlFor="hora-marc">Hora</Label>
                <Input id="hora-marc" type="time" defaultValue={editDialog.item?.hora} />
              </div>
            </div>
            <div>
              <Label htmlFor="tecla-marc">Tecla</Label>
              <Select defaultValue={editDialog.item?.tecla}>
                <SelectTrigger id="tecla-marc">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entrada Trabajo">Entrada Trabajo</SelectItem>
                  <SelectItem value="Salida Trabajo">Salida Trabajo</SelectItem>
                  <SelectItem value="Inicio Almuerzo">Inicio Almuerzo</SelectItem>
                  <SelectItem value="Fin Almuerzo">Fin Almuerzo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="disp-marc">Dispositivo</Label>
              <Input id="disp-marc" defaultValue={editDialog.item?.dispositivo || 'Manual'} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={closeEditDialog}>
              <Save className="w-4 h-4 mr-2" />
              Grabar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG JUSTIFICACIÓN */}
      <Dialog open={editDialog.open && editDialog.type === 'justificacion'} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editDialog.item ? 'Editar Justificación' : 'Nueva Justificación'}</DialogTitle>
            <DialogDescription>
              Registre o modifique la justificación de ausencia del empleado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="emp-just">Empleado</Label>
              <Input id="emp-just" defaultValue={editDialog.item?.empleado} />
            </div>
            <div>
              <Label htmlFor="fecha-just-dlg">Fecha</Label>
              <Input id="fecha-just-dlg" type="date" defaultValue={editDialog.item?.fecha} />
            </div>
            <div>
              <Label htmlFor="tipo-just">Tipo de Justificación</Label>
              <Select defaultValue={editDialog.item?.tipoJustificacion}>
                <SelectTrigger id="tipo-just">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Incapacidad Médica">Incapacidad Médica</SelectItem>
                  <SelectItem value="Permiso Personal">Permiso Personal</SelectItem>
                  <SelectItem value="Cita Médica">Cita Médica</SelectItem>
                  <SelectItem value="Permiso Legal">Permiso Legal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="motivo-just">Motivo</Label>
              <Textarea id="motivo-just" defaultValue={editDialog.item?.motivo} rows={3} />
            </div>
            <div>
              <Label htmlFor="doc-just">Documento Adjunto</Label>
              <Input id="doc-just" type="file" />
            </div>
            <div>
              <Label htmlFor="estado-just-dlg">Estado</Label>
              <Select defaultValue={editDialog.item?.estado || 'Pendiente'}>
                <SelectTrigger id="estado-just-dlg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="Aprobado">Aprobado</SelectItem>
                  <SelectItem value="Rechazado">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={closeEditDialog}>
              <Save className="w-4 h-4 mr-2" />
              Grabar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}