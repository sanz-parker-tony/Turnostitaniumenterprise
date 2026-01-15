import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, Edit, Trash2, Calendar, Tag, FileText, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

// Mock data ampliado
const mockHolidays = [
  { id: 1, company: 'Titanium Corp', date: '2025-01-01', description: 'Año Nuevo', location: 'Nacional', active: true },
  { id: 2, company: 'Titanium Corp', date: '2025-05-01', description: 'Día del Trabajo', location: 'Nacional', active: true },
  { id: 3, company: 'Titanium Corp', date: '2025-12-25', description: 'Navidad', location: 'Nacional', active: true },
  { id: 4, company: 'Titanium Corp', date: '2025-08-10', description: 'Feriado Local Guayaquil', location: 'Guayaquil', active: true },
  { id: 5, company: 'Titanium Corp', date: '2025-10-09', description: 'Independencia de Guayaquil', location: 'Guayaquil', active: true },
];

const mockCatalogs = [
  { id: 1, table: 'TIPO_CONTRATO', parent: 0, value: 'INDEFINIDO', description: 'Contrato Indefinido', active: true },
  { id: 2, table: 'TIPO_CONTRATO', parent: 0, value: 'PLAZO_FIJO', description: 'Contrato a Plazo Fijo', active: true },
  { id: 3, table: 'TIPO_CONTRATO', parent: 0, value: 'EVENTUAL', description: 'Contrato Eventual', active: true },
  { id: 4, table: 'TIPO_PERMISO', parent: 0, value: 'CON_SUELDO', description: 'Permiso con Sueldo', active: true },
  { id: 5, table: 'TIPO_PERMISO', parent: 0, value: 'SIN_SUELDO', description: 'Permiso sin Sueldo', active: true },
  { id: 6, table: 'TIPO_PERMISO', parent: 0, value: 'VACACIONES', description: 'Vacaciones', active: true },
];

const mockJustifications = [
  { id: 1, description: 'Incapacidad Médica', abbreviation: 'INCAP', active: true },
  { id: 2, description: 'Permiso Personal', abbreviation: 'PERM', active: true },
  { id: 3, description: 'Cita Médica', abbreviation: 'CITA', active: true },
  { id: 4, description: 'Calamidad Doméstica', abbreviation: 'CALAM', active: true },
  { id: 5, description: 'Licencia Paternidad', abbreviation: 'LPAT', active: true },
];

const ITEMS_PER_PAGE = 10;

export default function Mantenimiento({ activeTab: initialTab = 'feriados', title = 'Mantenimiento' }: { activeTab?: string; title?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editDialog, setEditDialog] = useState<{ open: boolean; type: string; item: any }>({ open: false, type: '', item: null });

  // Actualizar tab cuando cambie desde el menú
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const openEditDialog = (type: string, item: any = null) => {
    setEditDialog({ open: true, type, item });
  };

  const closeEditDialog = () => {
    setEditDialog({ open: false, type: '', item: null });
  };

  // Función para filtrar y paginar
  const filterAndPaginate = (data: any[], searchField: string = 'description') => {
    let filtered = data.filter(item => {
      const matchesSearch = item[searchField]?.toLowerCase().includes(searchTerm.toLowerCase());
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

  const holidays = filterAndPaginate(mockHolidays);
  const catalogs = filterAndPaginate(mockCatalogs);
  const justifications = filterAndPaginate(mockJustifications);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-1">Gestión de feriados, catálogos y motivos de justificación</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1); setSearchTerm(''); setStatusFilter('all'); }}>
        {/* TabsList oculto ya que el menú lateral lo reemplaza */}
        <TabsList className="hidden">
          <TabsTrigger value="feriados">Feriados</TabsTrigger>
          <TabsTrigger value="ausencias">Catálogos</TabsTrigger>
          <TabsTrigger value="sobretiempo">Motivos de Justificación</TabsTrigger>
        </TabsList>

        {/* FERIADOS */}
        <TabsContent value="feriados" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar feriados por descripción y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-feriados">Descripción</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-feriados"
                    placeholder="Buscar por descripción..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="status-feriados">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-feriados">
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
                  <Label htmlFor="export-feriados">Exportar</Label>
                  <Button id="export-feriados" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Feriados</CardTitle>
                  <CardDescription>Gestión de días feriados y no laborables</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('holiday', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Feriado
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Localidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.data.map((holiday: any) => (
                    <TableRow key={holiday.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{holiday.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{holiday.company}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{holiday.date}</TableCell>
                      <TableCell>{holiday.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{holiday.location}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-600 text-white">Activo</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openEditDialog('holiday', holiday)}
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
              <Pagination totalPages={holidays.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* CATÁLOGOS */}
        <TabsContent value="catalogos" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar catálogos por descripción y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-catalogos">Descripción</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-catalogos"
                    placeholder="Buscar por descripción..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="status-catalogos">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-catalogos">
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
                  <Label htmlFor="export-catalogos">Exportar</Label>
                  <Button id="export-catalogos" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Catálogos</CardTitle>
                  <CardDescription>Gestión de tablas de catálogos del sistema</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('catalog', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Catálogo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Tabla</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalogs.data.map((catalog: any) => (
                    <TableRow key={catalog.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{catalog.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{catalog.table}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{catalog.value}</TableCell>
                      <TableCell>{catalog.description}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-600 text-white">Activo</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openEditDialog('catalog', catalog)}
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
              <Pagination totalPages={catalogs.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* MOTIVOS DE JUSTIFICACIÓN */}
        <TabsContent value="justificaciones" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar motivos de justificación por descripción y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-justificaciones">Descripción</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-justificaciones"
                    placeholder="Buscar por descripción..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="status-justificaciones">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-justificaciones">
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
                  <Label htmlFor="export-justificaciones">Exportar</Label>
                  <Button id="export-justificaciones" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Motivos de Justificación</CardTitle>
                  <CardDescription>Gestión de motivos de ausencias y justificaciones</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('justification', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Motivo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Abreviatura</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {justifications.data.map((just: any) => (
                    <TableRow key={just.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{just.id}</TableCell>
                      <TableCell>{just.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{just.abbreviation}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-600 text-white">Activo</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openEditDialog('justification', just)}
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
              <Pagination totalPages={justifications.totalPages} />
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
              {editDialog.type === 'holiday' ? 'Feriado' : editDialog.type === 'catalog' ? 'Catálogo' : 'Motivo de Justificación'}
            </DialogTitle>
            <DialogDescription>
              Complete la información requerida
            </DialogDescription>
          </DialogHeader>
          
          <form className="space-y-4">
            {/* Feriados */}
            {editDialog.type === 'holiday' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-date">Fecha *</Label>
                    <Input 
                      id="edit-date" 
                      type="date" 
                      defaultValue={editDialog.item?.date} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-type">Tipo *</Label>
                    <Select defaultValue={editDialog.item?.type || 'Nacional'}>
                      <SelectTrigger id="edit-type">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nacional">Nacional</SelectItem>
                        <SelectItem value="Regional">Regional</SelectItem>
                        <SelectItem value="Local">Local</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-desc">Descripción *</Label>
                  <Input id="edit-desc" defaultValue={editDialog.item?.description} placeholder="Descripción del feriado" />
                </div>
              </>
            )}

            {/* Catálogos */}
            {editDialog.type === 'catalog' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-id">ID *</Label>
                    <Input id="edit-id" defaultValue={editDialog.item?.id} placeholder="001" disabled={!!editDialog.item} />
                  </div>
                  <div>
                    <Label htmlFor="edit-code">Código *</Label>
                    <Input id="edit-code" defaultValue={editDialog.item?.code} placeholder="CAT_001" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-desc">Descripción *</Label>
                  <Input id="edit-desc" defaultValue={editDialog.item?.description} placeholder="Descripción del catálogo" />
                </div>
                <div>
                  <Label htmlFor="edit-category">Categoría *</Label>
                  <Select defaultValue={editDialog.item?.category || 'Sistema'}>
                    <SelectTrigger id="edit-category">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sistema">Sistema</SelectItem>
                      <SelectItem value="Configuración">Configuración</SelectItem>
                      <SelectItem value="Operaciones">Operaciones</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Motivos de Justificación */}
            {editDialog.type === 'justification' && (
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
                  <Label htmlFor="edit-desc">Descripción *</Label>
                  <Input id="edit-desc" defaultValue={editDialog.item?.description} placeholder="Descripción del motivo" />
                </div>
                <div>
                  <Label htmlFor="edit-affects">Afecta Nómina *</Label>
                  <Select defaultValue={editDialog.item?.affectsPayroll || 'No'}>
                    <SelectTrigger id="edit-affects">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sí">Sí</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
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