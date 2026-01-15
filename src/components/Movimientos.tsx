import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Plus, Edit, Trash2, Clock, Search, Download, Filter } from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

// Definición de teclas funcionales
const keyOptions = [
  { value: '1', label: '1 - Inicio de Jornada' },
  { value: '2', label: '2 - Salida a Almorzar' },
  { value: '3', label: '3 - Retorno de Almorzar' },
  { value: '4', label: '4 - Fin de Jornada' },
  { value: '22', label: '22 - Salida a Desayunar' },
  { value: '32', label: '32 - Retorno de Desayunar' },
  { value: '23', label: '23 - Salida a Merendar' },
  { value: '33', label: '33 - Retorno de Merendar' },
  { value: '24', label: '24 - Salida a Cenar' },
  { value: '34', label: '34 - Retorno de Cenar' },
  { value: '25', label: '25 - Salida a Refrigerio' },
  { value: '35', label: '35 - Retorno de Refrigerio' },
];

// Mock data
const mockMovimientos = [
  { id: 1, name: 'Jornada Laboral', abbreviation: 'JL', startKey: '1', endKey: '4', active: true },
  { id: 2, name: 'Almuerzo', abbreviation: 'ALM', startKey: '2', endKey: '3', active: true },
  { id: 3, name: 'Desayuno', abbreviation: 'DES', startKey: '22', endKey: '32', active: true },
  { id: 4, name: 'Merienda', abbreviation: 'MER', startKey: '23', endKey: '33', active: true },
  { id: 5, name: 'Cena', abbreviation: 'CEN', startKey: '24', endKey: '34', active: true },
  { id: 6, name: 'Refrigerio', abbreviation: 'REF', startKey: '25', endKey: '35', active: true },
  { id: 7, name: 'Permisos', abbreviation: 'PER', startKey: '1', endKey: '4', active: false },
];

export default function Movimientos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editDialog, setEditDialog] = useState<{ open: boolean; item: any }>({ open: false, item: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; item: any }>({ open: false, item: null });
  const [formData, setFormData] = useState({
    name: '',
    abbreviation: '',
    startKey: '',
    endKey: '',
    active: true,
  });

  const filteredMovimientos = mockMovimientos.filter(mov => {
    const matchesSearch = mov.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mov.abbreviation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && mov.active) ||
                         (statusFilter === 'inactive' && !mov.active);
    return matchesSearch && matchesStatus;
  });

  const openEditDialog = (item: any = null) => {
    if (item) {
      setFormData({
        name: item.name,
        abbreviation: item.abbreviation,
        startKey: item.startKey,
        endKey: item.endKey,
        active: item.active,
      });
    } else {
      setFormData({
        name: '',
        abbreviation: '',
        startKey: '',
        endKey: '',
        active: true,
      });
    }
    setEditDialog({ open: true, item });
  };

  const closeEditDialog = () => {
    setEditDialog({ open: false, item: null });
  };

  const handleSave = () => {
    console.log('Guardando movimiento:', formData);
    closeEditDialog();
  };

  const handleDelete = () => {
    console.log('Eliminando movimiento:', deleteDialog.item);
    setDeleteDialog({ open: false, item: null });
  };

  const getKeyLabel = (keyValue: string) => {
    const key = keyOptions.find(k => k.value === keyValue);
    return key ? key.label : keyValue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-foreground">Movimientos</h1>
        <p className="text-muted-foreground mt-1">Gestión de movimientos de marcación y jornada laboral</p>
      </div>

      {/* Criterios de Búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
          <CardDescription>Filtrar movimientos por descripción y estado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <Label htmlFor="search-movimientos">Descripción</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search-movimientos"
                  placeholder="Buscar movimientos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="estado-movimientos">Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="estado-movimientos">
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
              <Label htmlFor="export-movimientos">Exportar</Label>
              <Button id="export-movimientos" variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Movimientos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Movimientos Registrados</CardTitle>
              <CardDescription>Listado de movimientos de marcación configurados</CardDescription>
            </div>
            <Button size="sm" onClick={() => openEditDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Movimiento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead>ID</TableHead>
                <TableHead>Nombre del Movimiento</TableHead>
                <TableHead>Abreviatura</TableHead>
                <TableHead>Tecla Inicio</TableHead>
                <TableHead>Tecla Fin</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovimientos.map((movimiento) => (
                <TableRow key={movimiento.id} className="hover:bg-muted/50">
                  <TableCell className="text-muted-foreground">{movimiento.id}</TableCell>
                  <TableCell className="font-medium">{movimiento.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">{movimiento.abbreviation}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {getKeyLabel(movimiento.startKey)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {getKeyLabel(movimiento.endKey)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={movimiento.active ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                      {movimiento.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-accent"
                        onClick={() => openEditDialog(movimiento)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteDialog({ open: true, item: movimiento })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredMovimientos.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron movimientos con los criterios especificados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editDialog.item ? 'Editar Movimiento' : 'Nuevo Movimiento'}
            </DialogTitle>
            <DialogDescription>
              Configure las teclas de inicio y fin del movimiento
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nombre del Movimiento *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Jornada Laboral, Almuerzo, Desayuno"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-abbr">Abreviatura *</Label>
                <Input
                  id="edit-abbr"
                  value={formData.abbreviation}
                  onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                  placeholder="Ej: JL, ALM, DES"
                  maxLength={10}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-start-key">Tecla de Inicio *</Label>
                <Select
                  value={formData.startKey}
                  onValueChange={(value) => setFormData({ ...formData, startKey: value })}
                >
                  <SelectTrigger id="edit-start-key">
                    <SelectValue placeholder="Seleccionar tecla" />
                  </SelectTrigger>
                  <SelectContent>
                    {keyOptions.map((key) => (
                      <SelectItem key={key.value} value={key.value}>
                        {key.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-end-key">Tecla de Fin *</Label>
                <Select
                  value={formData.endKey}
                  onValueChange={(value) => setFormData({ ...formData, endKey: value })}
                >
                  <SelectTrigger id="edit-end-key">
                    <SelectValue placeholder="Seleccionar tecla" />
                  </SelectTrigger>
                  <SelectContent>
                    {keyOptions.map((key) => (
                      <SelectItem key={key.value} value={key.value}>
                        {key.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="edit-active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="edit-active">Activo</Label>
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Grabar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, item: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El movimiento "{deleteDialog.item?.name}" será eliminado permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
