import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, Edit, Trash2, UserCog, Settings, Clock, AlertCircle, Search, Download, Filter } from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

// Mock data
const mockProfiles = [
  { id: 1, name: 'Operador de Producción', abbreviation: 'OP', department: 'Producción', employees: 45, active: true },
  { id: 2, name: 'Supervisor de Turno', abbreviation: 'SUP', department: 'Producción', employees: 12, active: true },
  { id: 3, name: 'Técnico de Mantenimiento', abbreviation: 'TEC', department: 'Mantenimiento', employees: 8, active: true },
  { id: 4, name: 'Analista Administrativo', abbreviation: 'ADM', department: 'Administración', employees: 15, active: true },
];

const mockProfileParameters = [
  { id: 1, profile: 'Operador de Producción', parameter: 'Tolerancia Ingreso', value: '10', unit: 'minutos', active: true },
  { id: 2, profile: 'Operador de Producción', parameter: 'Requiere Aprobación ST', value: 'true', unit: 'boolean', active: true },
  { id: 3, profile: 'Supervisor de Turno', parameter: 'Tolerancia Ingreso', value: '15', unit: 'minutos', active: true },
  { id: 4, profile: 'Supervisor de Turno', parameter: 'Puede Aprobar Novedades', value: 'true', unit: 'boolean', active: true },
];

const mockProfileShifts = [
  { id: 1, profile: 'Operador de Producción', shift: 'Diurno General', rotation: 'Fijo', priority: 1, active: true },
  { id: 2, profile: 'Operador de Producción', shift: 'Nocturno General', rotation: 'Rotativo', priority: 2, active: true },
  { id: 3, profile: 'Supervisor de Turno', shift: 'Diurno General', rotation: 'Fijo', priority: 1, active: true },
  { id: 4, profile: 'Técnico de Mantenimiento', shift: 'Rotativo 24/7', rotation: 'Rotativo', priority: 1, active: true },
];

const mockProfileNovelties = [
  { id: 1, profile: 'Operador de Producción', novelty: 'ST50 - Sobretiempo 50%', enabled: true, requiresApproval: true, active: true },
  { id: 2, profile: 'Operador de Producción', novelty: 'ST100 - Sobretiempo 100%', enabled: true, requiresApproval: true, active: true },
  { id: 3, profile: 'Operador de Producción', novelty: 'JN - Jornada Nocturna', enabled: true, requiresApproval: false, active: true },
  { id: 4, profile: 'Supervisor de Turno', novelty: 'ST50 - Sobretiempo 50%', enabled: true, requiresApproval: false, active: true },
];

export default function Perfiles({ activeTab: initialTab = 'listado', title = 'Perfiles' }: { activeTab?: string; title?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; type: string; item: any }>({ open: false, type: '', item: null });

  // Actualizar tab cuando cambie desde el menú
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  
  // Filtros por perfil en cada pestaña
  const [selectedProfileForParams, setSelectedProfileForParams] = useState('all');
  const [selectedProfileForShifts, setSelectedProfileForShifts] = useState('all');
  const [selectedProfileForNovelties, setSelectedProfileForNovelties] = useState('all');

  const openEditDialog = (type: string, item: any = null) => {
    setEditDialog({ open: true, type, item });
  };

  const closeEditDialog = () => {
    setEditDialog({ open: false, type: '', item: null });
  };

  // Filtrar datos según perfil seleccionado
  const filteredProfileParameters = mockProfileParameters.filter(param => 
    selectedProfileForParams === 'all' || param.profile === mockProfiles.find(p => p.id.toString() === selectedProfileForParams)?.name
  );

  const filteredProfileShifts = mockProfileShifts.filter(shift => 
    selectedProfileForShifts === 'all' || shift.profile === mockProfiles.find(p => p.id.toString() === selectedProfileForShifts)?.name
  );

  const filteredProfileNovelties = mockProfileNovelties.filter(nov => 
    selectedProfileForNovelties === 'all' || nov.profile === mockProfiles.find(p => p.id.toString() === selectedProfileForNovelties)?.name
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-1">Gestión de perfiles laborales y configuraciones específicas</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* TabsList oculto ya que el menú lateral lo reemplaza */}
        <TabsList className="hidden">
          <TabsTrigger value="listado">Listado</TabsTrigger>
          <TabsTrigger value="parametros">Parámetros x Perfil</TabsTrigger>
          <TabsTrigger value="turnos">Turnos x Perfil</TabsTrigger>
          <TabsTrigger value="novedades">Novedades x Perfil</TabsTrigger>
        </TabsList>

        {/* LISTADO */}
        <TabsContent value="listado" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar perfiles por descripción, departamento y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Label htmlFor="search-perfiles">Descripción</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-perfiles"
                    placeholder="Buscar perfiles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="filtros-perfiles">Filtros</Label>
                  <Button 
                    id="filtros-perfiles"
                    variant="outline" 
                    onClick={() => setShowFilters(!showFilters)}
                    className={showFilters ? 'bg-accent' : ''}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filtros
                  </Button>
                </div>
                <div>
                  <Label htmlFor="export-perfiles">Exportar</Label>
                  <Button id="export-perfiles" variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>

              {showFilters && (
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
                  <div>
                    <Label htmlFor="departamento-perfiles">Departamento</Label>
                    <Select>
                      <SelectTrigger id="departamento-perfiles">
                        <SelectValue placeholder="Departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="prod">Producción</SelectItem>
                        <SelectItem value="mnt">Mantenimiento</SelectItem>
                        <SelectItem value="adm">Administración</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="estado-perfiles">Estado</Label>
                    <Select>
                      <SelectTrigger id="estado-perfiles">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Activos</SelectItem>
                        <SelectItem value="inactive">Inactivos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Perfiles Registrados</CardTitle>
                  <CardDescription>Listado de perfiles laborales con configuraciones personalizadas</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('profile', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Perfil
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre del Perfil</TableHead>
                    <TableHead>Abreviatura</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>N° Empleados</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockProfiles.map((profile) => (
                    <TableRow key={profile.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{profile.id}</TableCell>
                      <TableCell className="font-medium">{profile.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{profile.abbreviation}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{profile.department}</Badge>
                      </TableCell>
                      <TableCell>{profile.employees}</TableCell>
                      <TableCell>
                        <Badge className={profile.active ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                          {profile.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openEditDialog('profile', profile)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PARAMETROS X PERFIL */}
        <TabsContent value="parametros" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar parámetros por perfil</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="perfil-parametros">Perfil</Label>
                  <Select value={selectedProfileForParams} onValueChange={setSelectedProfileForParams}>
                    <SelectTrigger id="perfil-parametros">
                      <SelectValue placeholder="Seleccionar Perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {mockProfiles.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="export-parametros-perfil">Exportar</Label>
                  <Button id="export-parametros-perfil" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Parámetros por Perfil</CardTitle>
                  <CardDescription>Configuración específica de parámetros para cada perfil laboral</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('profileParameter', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Asignar Parámetro
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Parámetro</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfileParameters.map((param) => (
                    <TableRow key={param.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{param.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{param.profile}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{param.parameter}</TableCell>
                      <TableCell className="font-mono text-sm">{param.value}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{param.unit}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={param.active ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                          {param.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openEditDialog('profileParameter', param)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TURNOS X PERFIL */}
        <TabsContent value="turnos" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar turnos por perfil</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="perfil-turnos">Perfil</Label>
                  <Select value={selectedProfileForShifts} onValueChange={setSelectedProfileForShifts}>
                    <SelectTrigger id="perfil-turnos">
                      <SelectValue placeholder="Seleccionar Perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {mockProfiles.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="export-turnos-perfil">Exportar</Label>
                  <Button id="export-turnos-perfil" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Turnos por Perfil</CardTitle>
                  <CardDescription>Asignación de turnos de trabajo para cada perfil laboral</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('profileShift', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Asignar Turno
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Tipo Rotación</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfileShifts.map((shift) => (
                    <TableRow key={shift.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{shift.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{shift.profile}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{shift.shift}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{shift.rotation}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-sky-400">{shift.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={shift.active ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                          {shift.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openEditDialog('profileShift', shift)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOVEDADES X PERFIL */}
        <TabsContent value="novedades" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar novedades por perfil</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="perfil-novedades">Perfil</Label>
                  <Select value={selectedProfileForNovelties} onValueChange={setSelectedProfileForNovelties}>
                    <SelectTrigger id="perfil-novedades">
                      <SelectValue placeholder="Seleccionar Perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {mockProfiles.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="export-novedades-perfil">Exportar</Label>
                  <Button id="export-novedades-perfil" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Novedades por Perfil</CardTitle>
                  <CardDescription>Configuración de novedades aplicables para cada perfil</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('profileNovelty', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Asignar Novedad
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Novedad</TableHead>
                    <TableHead>Habilitada</TableHead>
                    <TableHead>Requiere Aprobación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfileNovelties.map((nov) => (
                    <TableRow key={nov.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{nov.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{nov.profile}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{nov.novelty}</TableCell>
                      <TableCell>
                        <Badge className={nov.enabled ? 'bg-green-600' : 'bg-muted'}>
                          {nov.enabled ? 'Sí' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={nov.requiresApproval ? 'bg-yellow-500' : 'bg-sky-500'}>
                          {nov.requiresApproval ? 'Sí' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={nov.active ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                          {nov.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openEditDialog('profileNovelty', nov)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editDialog.item ? 'Editar Registro' : 'Nuevo Registro'}
            </DialogTitle>
            <DialogDescription>
              Complete la información requerida
            </DialogDescription>
          </DialogHeader>
          
          <form className="space-y-4">
            {editDialog.type === 'profile' && (
              <>
                <div>
                  <Label htmlFor="edit-name">Nombre del Perfil *</Label>
                  <Input id="edit-name" defaultValue={editDialog.item?.name} placeholder="Operador de Producción" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-abbr">Abreviatura *</Label>
                    <Input id="edit-abbr" defaultValue={editDialog.item?.abbreviation} placeholder="OP" maxLength={10} />
                  </div>
                  <div>
                    <Label htmlFor="edit-dept">Departamento *</Label>
                    <Select defaultValue={editDialog.item?.department}>
                      <SelectTrigger id="edit-dept">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Producción">Producción</SelectItem>
                        <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                        <SelectItem value="Administración">Administración</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="edit-active" defaultChecked={editDialog.item?.active ?? true} />
                  <Label htmlFor="edit-active">Activo</Label>
                </div>
              </>
            )}

            {(editDialog.type === 'profileParameter' || editDialog.type === 'profileShift' || editDialog.type === 'profileNovelty') && (
              <>
                <div>
                  <Label htmlFor="edit-profile">Perfil *</Label>
                  <Select defaultValue={editDialog.item?.profile}>
                    <SelectTrigger id="edit-profile">
                      <SelectValue placeholder="Seleccionar perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockProfiles.map(p => (
                        <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {editDialog.type === 'profileParameter' && (
                  <>
                    <div>
                      <Label htmlFor="edit-param">Parámetro *</Label>
                      <Input id="edit-param" defaultValue={editDialog.item?.parameter} placeholder="Nombre del parámetro" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-value">Valor *</Label>
                        <Input id="edit-value" defaultValue={editDialog.item?.value} placeholder="Valor" />
                      </div>
                      <div>
                        <Label htmlFor="edit-unit">Unidad *</Label>
                        <Input id="edit-unit" defaultValue={editDialog.item?.unit} placeholder="minutos, boolean" />
                      </div>
                    </div>
                  </>
                )}

                {editDialog.type === 'profileShift' && (
                  <>
                    <div>
                      <Label htmlFor="edit-shift">Turno *</Label>
                      <Input id="edit-shift" defaultValue={editDialog.item?.shift} placeholder="Diurno General" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-rotation">Tipo de Rotación *</Label>
                        <Select defaultValue={editDialog.item?.rotation}>
                          <SelectTrigger id="edit-rotation">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Fijo">Fijo</SelectItem>
                            <SelectItem value="Rotativo">Rotativo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="edit-priority">Prioridad *</Label>
                        <Input id="edit-priority" type="number" defaultValue={editDialog.item?.priority} placeholder="1" />
                      </div>
                    </div>
                  </>
                )}

                {editDialog.type === 'profileNovelty' && (
                  <>
                    <div>
                      <Label htmlFor="edit-novelty">Novedad *</Label>
                      <Input id="edit-novelty" defaultValue={editDialog.item?.novelty} placeholder="ST50 - Sobretiempo 50%" />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <Switch id="edit-enabled" defaultChecked={editDialog.item?.enabled ?? true} />
                        <Label htmlFor="edit-enabled">Habilitada</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch id="edit-approval" defaultChecked={editDialog.item?.requiresApproval ?? false} />
                        <Label htmlFor="edit-approval">Requiere Aprobación</Label>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2">
                  <Switch id="edit-active" defaultChecked={editDialog.item?.active ?? true} />
                  <Label htmlFor="edit-active">Activo</Label>
                </div>
              </>
            )}
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>Cancelar</Button>
            <Button onClick={closeEditDialog}>
              {editDialog.item ? 'Guardar Cambios' : 'Crear Registro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}