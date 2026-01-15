import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertTriangle, Users, Cog, CheckCircle, Settings, Search, Download, ChevronLeft, ChevronRight, Edit, Trash2, X, Save, Play, RotateCcw, Lock, Upload, FileDown } from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Checkbox } from './ui/checkbox';

const mockDepuracion = [
  { id: 1, empleado: 'Juan Pérez', cedula: '001-1234567-8', fecha: '2025-10-18', problema: 'Marcación impar', detalle: 'Entrada sin salida', marcaciones: 3 },
  { id: 2, empleado: 'María García', cedula: '001-9876543-2', fecha: '2025-10-18', problema: 'Marcaciones consecutivas', detalle: '2 entradas consecutivas', marcaciones: 5 },
  { id: 3, empleado: 'Carlos López', cedula: '001-5544332-1', fecha: '2025-10-17', problema: 'Marcación impar', detalle: 'Salida sin entrada', marcaciones: 1 },
];

const mockNovedadesAprobacion = [
  { id: 1, empleado: 'Juan Pérez', fecha: '2025-10-17', novedad: 'Sobretiempo 50%', horas: '2.5', requiereAprobacion: true, estado: 'Pendiente' },
  { id: 2, empleado: 'María García', fecha: '2025-10-16', novedad: 'Sobretiempo 100%', horas: '4.0', requiereAprobacion: true, estado: 'Pendiente' },
  { id: 3, empleado: 'Pedro Rodríguez', fecha: '2025-10-15', novedad: 'Jornada Nocturna', horas: '8.0', requiereAprobacion: true, estado: 'Aprobado' },
];

const mockProcesos = [
  { id: 1, codigo: 'PROC-2025-001', tipo: 'Novedades', periodo: 'Octubre 2025', rolPago: 'Quincenal', empleados: 145, registros: 423, estado: 'Generado', fechaCreacion: '2025-10-20' },
  { id: 2, codigo: 'PROC-2025-002', tipo: 'Liquidación', periodo: 'Octubre 2025', rolPago: 'Mensual', empleados: 5, registros: 38, estado: 'Cerrado', fechaCreacion: '2025-10-18' },
  { id: 3, codigo: 'PROC-2025-003', tipo: 'Novedades', periodo: 'Septiembre 2025', rolPago: 'Mensual', empleados: 142, registros: 398, estado: 'Migrado', fechaCreacion: '2025-10-01' },
  { id: 4, codigo: 'PROC-2025-004', tipo: 'Novedades', periodo: 'Agosto 2025', rolPago: 'Quincenal', empleados: 140, registros: 401, estado: 'Exportado', fechaCreacion: '2025-09-01' },
];

const mockEmpleadosLiquidar = [
  { id: 1, codigo: 'EMP001', nombre: 'Juan Pérez', cedula: '001-1234567-8', departamento: 'Producción', area: 'Ensamblaje', rolPago: 'Quincenal', fechaIngreso: '2020-01-15', selected: false },
  { id: 2, codigo: 'EMP002', nombre: 'María García', cedula: '001-9876543-2', departamento: 'Logística', area: 'Almacén', rolPago: 'Mensual', fechaIngreso: '2019-05-10', selected: false },
  { id: 3, codigo: 'EMP005', nombre: 'Pedro Rodríguez', cedula: '001-6677889-0', departamento: 'Producción', area: 'Ensamblaje', rolPago: 'Quincenal', fechaIngreso: '2021-03-20', selected: false },
];

const ITEMS_PER_PAGE = 10;

export default function Procesos() {
  const [activeTab, setActiveTab] = useState('depuracion');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editDialog, setEditDialog] = useState<{ open: boolean; type: string; item: any }>({ open: false, type: '', item: null });
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);

  const openEditDialog = (type: string, item: any = null) => {
    setEditDialog({ open: true, type, item });
  };

  const closeEditDialog = () => {
    setEditDialog({ open: false, type: '', item: null });
  };

  const toggleEmployee = (id: number) => {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
    );
  };

  const filterAndPaginate = (data: any[], searchField: string = 'empleado') => {
    let filtered = data.filter(item => {
      const matchesSearch = 
        item[searchField]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'pendiente' && item.estado === 'Pendiente') ||
        (statusFilter === 'aprobado' && item.estado === 'Aprobado') ||
        (statusFilter === 'generado' && item.estado === 'Generado') ||
        (statusFilter === 'cerrado' && item.estado === 'Cerrado') ||
        (statusFilter === 'migrado' && item.estado === 'Migrado') ||
        (statusFilter === 'exportado' && item.estado === 'Exportado');
      
      return matchesSearch && matchesStatus;
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

  const depuracion = filterAndPaginate(mockDepuracion);
  const novedades = filterAndPaginate(mockNovedadesAprobacion);
  const procesos = filterAndPaginate(mockProcesos, 'codigo');
  const empleados = filterAndPaginate(mockEmpleadosLiquidar, 'nombre');

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl mb-1">Procesos</h1>
        <p className="text-sm text-muted-foreground">Gestión de procesos de nómina y novedades</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1); setSearchTerm(''); setStatusFilter('all'); }}>
        <TabsList className="bg-muted w-full grid grid-cols-5">
          <TabsTrigger value="depuracion">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Depuración de Marcaciones
          </TabsTrigger>
          <TabsTrigger value="liquidacion">
            <Users className="w-4 h-4 mr-2" />
            Liquidación de Empleados
          </TabsTrigger>
          <TabsTrigger value="generacion">
            <Cog className="w-4 h-4 mr-2" />
            Generación de Novedades
          </TabsTrigger>
          <TabsTrigger value="aprobacion">
            <CheckCircle className="w-4 h-4 mr-2" />
            Aprobación de Novedades
          </TabsTrigger>
          <TabsTrigger value="administracion">
            <Settings className="w-4 h-4 mr-2" />
            Administración de Procesos
          </TabsTrigger>
        </TabsList>

        {/* DEPURACIÓN DE MARCACIONES */}
        <TabsContent value="depuracion" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Criterios de Búsqueda</CardTitle>
              <CardDescription>Detectar inconsistencias en las marcaciones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-dep">Empleado</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-dep"
                    placeholder="Buscar empleado..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="fecha-dep">Fecha</Label>
                  <Input id="fecha-dep" type="date" defaultValue="2025-10-18" />
                </div>
                <div>
                  <Label htmlFor="tipo-problema">Tipo de Problema</Label>
                  <Select defaultValue="all">
                    <SelectTrigger id="tipo-problema">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="impar">Marcación impar</SelectItem>
                      <SelectItem value="consecutivas">Marcaciones consecutivas</SelectItem>
                    </SelectContent>
                  </Select>
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
                <CardTitle className="text-base">Inconsistencias Detectadas</CardTitle>
                <Badge variant="destructive">{depuracion.total} problemas</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Cédula</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Problema</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead>Marcaciones</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {depuracion.data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.empleado}</TableCell>
                      <TableCell>{item.cedula}</TableCell>
                      <TableCell>{item.fecha}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{item.problema}</Badge>
                      </TableCell>
                      <TableCell>{item.detalle}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.marcaciones}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog('depurar', item)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Corregir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination totalPages={depuracion.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* LIQUIDACIÓN DE EMPLEADOS */}
        <TabsContent value="liquidacion" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Seleccionar Empleados a Liquidar</CardTitle>
              <CardDescription>Seleccione los empleados que serán liquidados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                <div className="relative">
                  <Label htmlFor="search-liq">Empleado</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-liq"
                    placeholder="Buscar empleado..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="dept-liq">Departamento</Label>
                  <Select>
                    <SelectTrigger id="dept-liq">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="prod">Producción</SelectItem>
                      <SelectItem value="log">Logística</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rol-liq">Rol de Pago</Label>
                  <Select>
                    <SelectTrigger id="rol-liq">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="quincenal">Quincenal</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button className="w-full" disabled={selectedEmployees.length === 0}>
                    <Play className="w-4 h-4 mr-2" />
                    Generar Liquidación
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Empleados Disponibles</CardTitle>
              <Badge variant="secondary" className="ml-2">{selectedEmployees.length} seleccionados</Badge>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox />
                    </TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Cédula</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Rol de Pago</TableHead>
                    <TableHead>Fecha Ingreso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empleados.data.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedEmployees.includes(emp.id)}
                          onCheckedChange={() => toggleEmployee(emp.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{emp.codigo}</Badge>
                      </TableCell>
                      <TableCell>{emp.nombre}</TableCell>
                      <TableCell>{emp.cedula}</TableCell>
                      <TableCell>{emp.departamento}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{emp.rolPago}</Badge>
                      </TableCell>
                      <TableCell>{emp.fechaIngreso}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination totalPages={empleados.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* GENERACIÓN DE NOVEDADES */}
        <TabsContent value="generacion" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parámetros de Generación</CardTitle>
              <CardDescription>Configure los parámetros para generar novedades</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="empresa-gen">Empresa</Label>
                  <Select>
                    <SelectTrigger id="empresa-gen">
                      <SelectValue placeholder="Seleccionar empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="titanium">Titanium Corp</SelectItem>
                      <SelectItem value="platinum">Platinum Industries</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="localidad-gen">Localidad</Label>
                  <Select>
                    <SelectTrigger id="localidad-gen">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="gye">Planta Guayaquil</SelectItem>
                      <SelectItem value="uio">Planta Quito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dept-gen">Departamento</Label>
                  <Select>
                    <SelectTrigger id="dept-gen">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="prod">Producción</SelectItem>
                      <SelectItem value="log">Logística</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="area-gen">Área</Label>
                  <Select>
                    <SelectTrigger id="area-gen">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="ens">Ensamblaje</SelectItem>
                      <SelectItem value="alm">Almacén</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rol-gen">Rol de Pago</Label>
                  <Select>
                    <SelectTrigger id="rol-gen">
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quincenal">Quincenal</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fecha-inicio-gen">Fecha Inicio</Label>
                  <Input id="fecha-inicio-gen" type="date" defaultValue="2025-10-01" />
                </div>
                <div>
                  <Label htmlFor="fecha-fin-gen">Fecha Fin</Label>
                  <Input id="fecha-fin-gen" type="date" defaultValue="2025-10-31" />
                </div>
              </div>
              <Button className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Generar Proceso de Novedades
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* APROBACIÓN DE NOVEDADES */}
        <TabsContent value="aprobacion" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Criterios de Búsqueda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                <div className="relative">
                  <Label htmlFor="search-apro">Empleado</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-apro"
                    placeholder="Buscar empleado..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="proceso-apro">Proceso</Label>
                  <Select>
                    <SelectTrigger id="proceso-apro">
                      <SelectValue placeholder="Seleccionar proceso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proc001">PROC-2025-001</SelectItem>
                      <SelectItem value="proc002">PROC-2025-002</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status-apro">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-apro">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="aprobado">Aprobado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
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
              <CardTitle className="text-base">Novedades que Requieren Aprobación</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Novedad</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {novedades.data.map((nov) => (
                    <TableRow key={nov.id}>
                      <TableCell>{nov.empleado}</TableCell>
                      <TableCell>{nov.fecha}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{nov.novedad}</Badge>
                      </TableCell>
                      <TableCell>{nov.horas}</TableCell>
                      <TableCell>
                        <Badge className={nov.estado === 'Aprobado' ? 'bg-green-600' : 'bg-yellow-600'}>
                          {nov.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" disabled={nov.estado === 'Aprobado'}>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Aprobar
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" disabled={nov.estado === 'Aprobado'}>
                            <X className="w-4 h-4 mr-1" />
                            Rechazar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination totalPages={novedades.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADMINISTRACIÓN DE PROCESOS */}
        <TabsContent value="administracion" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Criterios de Búsqueda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                <div className="relative">
                  <Label htmlFor="search-admin">Código de Proceso</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-admin"
                    placeholder="Buscar proceso..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="tipo-admin">Tipo</Label>
                  <Select>
                    <SelectTrigger id="tipo-admin">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="novedades">Novedades</SelectItem>
                      <SelectItem value="liquidacion">Liquidación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="estado-admin">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="estado-admin">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="generado">Generado</SelectItem>
                      <SelectItem value="cerrado">Cerrado</SelectItem>
                      <SelectItem value="migrado">Migrado</SelectItem>
                      <SelectItem value="exportado">Exportado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
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
              <CardTitle className="text-base">Procesos del Sistema</CardTitle>
              <CardDescription>
                Gestione el ciclo de vida de los procesos: Generado → Cerrado → Migrado → Exportado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Rol de Pago</TableHead>
                    <TableHead>Empleados</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {procesos.data.map((proc) => (
                    <TableRow key={proc.id}>
                      <TableCell>
                        <Badge variant="outline">{proc.codigo}</Badge>
                      </TableCell>
                      <TableCell>{proc.tipo}</TableCell>
                      <TableCell>{proc.periodo}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{proc.rolPago}</Badge>
                      </TableCell>
                      <TableCell>{proc.empleados}</TableCell>
                      <TableCell>{proc.registros}</TableCell>
                      <TableCell>
                        <Badge className={
                          proc.estado === 'Generado' ? 'bg-blue-600' :
                          proc.estado === 'Cerrado' ? 'bg-yellow-600' :
                          proc.estado === 'Migrado' ? 'bg-purple-600' :
                          'bg-green-600'
                        }>
                          {proc.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Cerrar"
                            disabled={proc.estado !== 'Generado'}
                          >
                            <Lock className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Migrar"
                            disabled={proc.estado !== 'Cerrado'}
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Reversar"
                            disabled={proc.estado !== 'Generado'}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Recuperar"
                            disabled={proc.estado === 'Generado'}
                          >
                            <FileDown className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination totalPages={procesos.totalPages} />
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="text-base">Ciclo de Vida de Procesos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-600">Generado</Badge>
                  <span className="text-muted-foreground">→ Proceso creado, se pueden hacer aprobaciones</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-600">Cerrado</Badge>
                  <span className="text-muted-foreground">→ Aprobaciones completadas, listo para migrar</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-600">Migrado</Badge>
                  <span className="text-muted-foreground">→ Datos consolidados, listo para exportar a nómina</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-600">Exportado</Badge>
                  <span className="text-muted-foreground">→ Proceso finalizado y enviado a nómina</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
