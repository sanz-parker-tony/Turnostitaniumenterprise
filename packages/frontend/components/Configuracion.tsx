import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, Edit, Trash2, Clock, Settings, Bell, Search, Download, ChevronLeft, ChevronRight, Save, X, GripVertical, Monitor, Activity } from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { ScrollArea } from './ui/scroll-area';
import { formatClientTime24 } from '../utils/date-time';

// Mock data
const mockAccesses = [
  { id: 1, name: 'Control Biométrico Principal', type: 'Biométrico', location: 'Planta Guayaquil', active: true },
  { id: 2, name: 'Control RFID Entrada', type: 'RFID', location: 'Planta Quito', active: true },
  { id: 3, name: 'Control Facial Administrativo', type: 'Facial', location: 'Oficinas Centrales', active: true },
  { id: 4, name: 'Control Manual Bodega', type: 'Manual', location: 'Bodega Cuenca', active: true },
];

const mockShifts = [
  { id: 1, name: 'Turno Matutino', code: 'MAT', totalHours: 8, lunchHours: 1, active: true },
  { id: 2, name: 'Turno Nocturno', code: 'NOC', totalHours: 8, lunchHours: 0.5, active: true },
  { id: 3, name: 'Turno Vespertino', code: 'VES', totalHours: 8, lunchHours: 1, active: true },
];

const mockParameters = [
  { id: 1, name: 'Tolerancia Entrada', value: '15', unit: 'minutos', active: true },
  { id: 2, name: 'Tolerancia Salida', value: '10', unit: 'minutos', active: true },
  { id: 3, name: 'Horas Extras Tope Diario', value: '4', unit: 'horas', active: true },
  { id: 4, name: 'Días Retroactivos Máximo', value: '30', unit: 'días', active: true },
];

const mockNovelties = [
  { id: 1, name: 'Hora Extra 50%', code: 'HE50', type: 'Pago', requiresApproval: true, active: true },
  { id: 2, name: 'Hora Extra 100%', code: 'HE100', type: 'Pago', requiresApproval: true, active: true },
  { id: 3, name: 'Atraso', code: 'ATR', type: 'Descuento', requiresApproval: false, active: true },
  { id: 4, name: 'Falta Injustificada', code: 'FALTA', type: 'Descuento', requiresApproval: true, active: true },
];

// Definición de teclas funcionales para Movimientos
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

// Mock data para Movimientos
const mockMovimientos = [
  { id: 1, name: 'Jornada Laboral', abbreviation: 'JL', startKey: '1', endKey: '4', active: true },
  { id: 2, name: 'Almuerzo', abbreviation: 'ALM', startKey: '2', endKey: '3', active: true },
  { id: 3, name: 'Desayuno', abbreviation: 'DES', startKey: '22', endKey: '32', active: true },
  { id: 4, name: 'Merienda', abbreviation: 'MER', startKey: '23', endKey: '33', active: true },
  { id: 5, name: 'Cena', abbreviation: 'CEN', startKey: '24', endKey: '34', active: true },
  { id: 6, name: 'Refrigerio', abbreviation: 'REF', startKey: '25', endKey: '35', active: true },
  { id: 7, name: 'Permisos', abbreviation: 'PER', startKey: '1', endKey: '4', active: false },
];

const ITEMS_PER_PAGE = 10;
const TIMELINE_WIDTH = 800;
const TIMELINE_HEIGHT = 60;
const MINUTES_IN_48H = 2880;
const INTERVAL_MINUTES = 15;

// Tipos de bloques de jornada
const BLOCK_TYPES = {
  ORDINARIA: { 
    id: 'ordinaria', 
    name: 'Jornada Ordinaria', 
    color: '#3B82F6', 
    surcharge: 0,
    description: '07:00 - 18:59 | 0% recargo'
  },
  NOCTURNA: { 
    id: 'nocturna', 
    name: 'Jornada Nocturna', 
    color: '#9B59B6', 
    surcharge: 25,
    description: '19:00 - 06:59 | 25% recargo'
  },
  EXTRA_50: { 
    id: 'extra_50', 
    name: 'Horas Extras 50%', 
    color: '#F59E0B', 
    surcharge: 50,
    description: '07:00 - 23:59 | 50% recargo'
  },
  EXTRA_100: { 
    id: 'extra_100', 
    name: 'Horas Extras 100%', 
    color: '#EF4444', 
    surcharge: 100,
    description: '00:00 - 06:59 | 100% recargo'
  }
};

interface TimeBlock {
  id: string;
  type: keyof typeof BLOCK_TYPES;
  startMinutes: number;
  endMinutes: number;
  isLunch?: boolean;
}

export default function Configuracion({ activeTab: initialTab = 'dispositivos', title = 'Configuración' }: { activeTab?: string; title?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editDialog, setEditDialog] = useState<{ open: boolean; type: string; item: any }>({ open: false, type: '', item: null });

  // Actualizar tab cuando cambie desde el menú
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Estados para el constructor de turnos
  const [shiftBuilderOpen, setShiftBuilderOpen] = useState(false);
  const [shiftName, setShiftName] = useState('');
  const [workBlocks, setWorkBlocks] = useState<TimeBlock[]>([]);
  const [lunchBlocks, setLunchBlocks] = useState<TimeBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [dragInfo, setDragInfo] = useState<{ blockId: string; edge: 'start' | 'end' | 'move'; initialX: number; initialStart: number; initialEnd: number } | null>(null);
  const [usedBlockTypes, setUsedBlockTypes] = useState<Set<string>>(new Set());

  // Estados para Movimientos
  const [movimientosEditDialog, setMovimientosEditDialog] = useState<{ open: boolean; item: any }>({ open: false, item: null });
  const [movimientosDeleteDialog, setMovimientosDeleteDialog] = useState<{ open: boolean; item: any }>({ open: false, item: null });
  const [movimientosFormData, setMovimientosFormData] = useState({
    name: '',
    abbreviation: '',
    startKey: '',
    endKey: '',
    active: true,
  });

  const timelineRef = useRef<HTMLDivElement>(null);

  const openEditDialog = (type: string, item: any = null) => {
    setEditDialog({ open: true, type, item });
  };

  const closeEditDialog = () => {
    setEditDialog({ open: false, type: '', item: null });
  };

  const openShiftBuilder = (shift?: any) => {
    if (shift) {
      setShiftName(shift.name);
      // Cargar bloques existentes si es edición
    } else {
      setShiftName('');
      setWorkBlocks([]);
      setLunchBlocks([]);
      setUsedBlockTypes(new Set());
    }
    setShiftBuilderOpen(true);
  };

  const closeShiftBuilder = () => {
    setShiftBuilderOpen(false);
    setShiftName('');
    setWorkBlocks([]);
    setLunchBlocks([]);
    setSelectedBlock(null);
    setUsedBlockTypes(new Set());
  };

  // Funciones para Movimientos
  const openMovimientosEditDialog = (item: any = null) => {
    if (item) {
      setMovimientosFormData({
        name: item.name,
        abbreviation: item.abbreviation,
        startKey: item.startKey,
        endKey: item.endKey,
        active: item.active,
      });
    } else {
      setMovimientosFormData({
        name: '',
        abbreviation: '',
        startKey: '',
        endKey: '',
        active: true,
      });
    }
    setMovimientosEditDialog({ open: true, item });
  };

  const closeMovimientosEditDialog = () => {
    setMovimientosEditDialog({ open: false, item: null });
  };

  const handleMovimientosSave = () => {
    console.log('Guardando movimiento:', movimientosFormData);
    closeMovimientosEditDialog();
  };

  const handleMovimientosDelete = () => {
    console.log('Eliminando movimiento:', movimientosDeleteDialog.item);
    setMovimientosDeleteDialog({ open: false, item: null });
  };

  const getKeyLabel = (keyValue: string) => {
    const key = keyOptions.find(k => k.value === keyValue);
    return key ? key.label : keyValue;
  };

  // Convertir minutos a formato HH:MM
  const minutesToTime = (minutes: number): string => {
    const day = Math.floor(minutes / 1440);
    const totalMins = minutes % 1440;
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const dayLabel = day > 0 ? ` (D${day + 1})` : '';
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}${dayLabel}`;
  };

  // Redondear a intervalo de 15 minutos
  const roundTo15 = (minutes: number): number => {
    return Math.round(minutes / INTERVAL_MINUTES) * INTERVAL_MINUTES;
  };

  // Convertir posición X a minutos
  const xToMinutes = (x: number): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const relativeX = Math.max(0, Math.min(x - rect.left, rect.width));
    const minutes = (relativeX / rect.width) * MINUTES_IN_48H;
    return roundTo15(Math.max(0, Math.min(minutes, MINUTES_IN_48H)));
  };

  // Convertir minutos a posición X
  const minutesToX = (minutes: number): number => {
    return (minutes / MINUTES_IN_48H) * 100;
  };

  // Verificar solapamiento
  const hasOverlap = (start: number, end: number, excludeId: string, isLunch: boolean): boolean => {
    const blocks = isLunch ? lunchBlocks : workBlocks;
    return blocks.some(block => {
      if (block.id === excludeId) return false;
      return !(end <= block.startMinutes || start >= block.endMinutes);
    });
  };

  // Agregar bloque de jornada
  const addWorkBlock = (type: keyof typeof BLOCK_TYPES) => {
    if (usedBlockTypes.has(type)) {
      alert('Este tipo de bloque ya ha sido agregado');
      return;
    }

    const newId = `work-${Date.now()}`;
    const lastBlock = workBlocks.length > 0 
      ? workBlocks.reduce((max, b) => b.endMinutes > max.endMinutes ? b : max)
      : null;
    
    const startMinutes = lastBlock ? lastBlock.endMinutes : 420; // 07:00 por defecto
    const endMinutes = Math.min(startMinutes + 480, MINUTES_IN_48H); // 8 horas

    setWorkBlocks([...workBlocks, {
      id: newId,
      type,
      startMinutes,
      endMinutes,
      isLunch: false
    }]);
    setUsedBlockTypes(new Set([...usedBlockTypes, type]));
  };

  // Agregar bloque de lunch
  const addLunchBlock = () => {
    const newId = `lunch-${Date.now()}`;
    setLunchBlocks([...lunchBlocks, {
      id: newId,
      type: 'ORDINARIA', // No importa el tipo para lunch
      startMinutes: 720, // 12:00
      endMinutes: 780, // 13:00
      isLunch: true
    }]);
  };

  // Eliminar bloque
  const removeBlock = (blockId: string, isLunch: boolean) => {
    if (isLunch) {
      setLunchBlocks(lunchBlocks.filter(b => b.id !== blockId));
    } else {
      const block = workBlocks.find(b => b.id === blockId);
      if (block) {
        setWorkBlocks(workBlocks.filter(b => b.id !== blockId));
        const newUsed = new Set(usedBlockTypes);
        newUsed.delete(block.type);
        setUsedBlockTypes(newUsed);
      }
    }
    setSelectedBlock(null);
  };

  // Manejar inicio de arrastre
  const handleMouseDown = (e: React.MouseEvent, blockId: string, edge: 'start' | 'end' | 'move', isLunch: boolean) => {
    e.preventDefault();
    const blocks = isLunch ? lunchBlocks : workBlocks;
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    setDragInfo({
      blockId,
      edge,
      initialX: e.clientX,
      initialStart: block.startMinutes,
      initialEnd: block.endMinutes
    });
  };

  // Manejar arrastre
  useEffect(() => {
    if (!dragInfo) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      const deltaX = e.clientX - dragInfo.initialX;
      const rect = timelineRef.current.getBoundingClientRect();
      const deltaMinutes = roundTo15((deltaX / rect.width) * MINUTES_IN_48H);

      const block = [...workBlocks, ...lunchBlocks].find(b => b.id === dragInfo.blockId);
      if (!block) return;

      let newStart = dragInfo.initialStart;
      let newEnd = dragInfo.initialEnd;

      if (dragInfo.edge === 'start') {
        newStart = Math.max(0, Math.min(dragInfo.initialStart + deltaMinutes, dragInfo.initialEnd - INTERVAL_MINUTES));
      } else if (dragInfo.edge === 'end') {
        newEnd = Math.max(dragInfo.initialStart + INTERVAL_MINUTES, Math.min(dragInfo.initialEnd + deltaMinutes, MINUTES_IN_48H));
      } else if (dragInfo.edge === 'move') {
        const duration = dragInfo.initialEnd - dragInfo.initialStart;
        newStart = Math.max(0, Math.min(dragInfo.initialStart + deltaMinutes, MINUTES_IN_48H - duration));
        newEnd = newStart + duration;
      }

      // Verificar solapamiento
      if (hasOverlap(newStart, newEnd, dragInfo.blockId, block.isLunch || false)) {
        return;
      }

      // Actualizar bloque
      if (block.isLunch) {
        setLunchBlocks(lunchBlocks.map(b =>
          b.id === dragInfo.blockId ? { ...b, startMinutes: newStart, endMinutes: newEnd } : b
        ));
      } else {
        setWorkBlocks(workBlocks.map(b =>
          b.id === dragInfo.blockId ? { ...b, startMinutes: newStart, endMinutes: newEnd } : b
        ));
      }
    };

    const handleMouseUp = () => {
      setDragInfo(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragInfo, workBlocks, lunchBlocks]);

  // Guardar turno
  const saveShift = () => {
    if (!shiftName.trim()) {
      alert('Ingrese un nombre para el turno');
      return;
    }

    console.log('Guardando turno:', {
      name: shiftName,
      workBlocks,
      lunchBlocks
    });

    alert('Turno guardado exitosamente');
    closeShiftBuilder();
  };

  // Calcular resumen
  const getShiftSummary = () => {
    const summary: { [key: string]: number } = {};
    
    workBlocks.forEach(block => {
      const duration = (block.endMinutes - block.startMinutes) / 60;
      const key = block.type;
      summary[key] = (summary[key] || 0) + duration;
    });

    return summary;
  };

  // Función para filtrar y paginar
  const filterAndPaginate = (data: any[], searchField: string = 'name') => {
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

  // Función para filtrar movimientos
  const filterMovimientos = () => {
    return mockMovimientos.filter(mov => {
      const matchesSearch = mov.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           mov.abbreviation.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && mov.active) ||
                           (statusFilter === 'inactive' && !mov.active);
      return matchesSearch && matchesStatus;
    });
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

  const accesses = filterAndPaginate(mockAccesses);
  const shifts = filterAndPaginate(mockShifts);
  const parameters = filterAndPaginate(mockParameters);
  const novelties = filterAndPaginate(mockNovelties);
  const filteredMovimientos = filterMovimientos();
  const summary = getShiftSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-1">Configuración de dispositivos, turnos, parámetros, novedades y movimientos</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1); setSearchTerm(''); setStatusFilter('all'); }}>
        {/* TabsList oculto ya que el menú lateral lo reemplaza */}
        <TabsList className="hidden">
          <TabsTrigger value="dispositivos">Dispositivos</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="turnos">Turnos</TabsTrigger>
          <TabsTrigger value="parametros">Parámetros Generales</TabsTrigger>
          <TabsTrigger value="novedades">Novedades</TabsTrigger>
        </TabsList>

        {/* DISPOSITIVOS */}
        <TabsContent value="dispositivos" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar dispositivos por descripción y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-dispositivos">Descripción</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-dispositivos"
                    placeholder="Buscar por descripción..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="status-dispositivos">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-dispositivos">
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
                  <Label htmlFor="export-dispositivos">Exportar</Label>
                  <Button id="export-dispositivos" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Controles de Acceso</CardTitle>
                  <CardDescription>Gestión de dispositivos y sistemas de control de acceso</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('access', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Dispositivo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accesses.data.map((access: any) => (
                    <TableRow key={access.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{access.id}</TableCell>
                      <TableCell>{access.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{access.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{access.location}</Badge>
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
                            onClick={() => openEditDialog('access', access)}
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
              <Pagination totalPages={accesses.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TURNOS - GRILLA */}
        <TabsContent value="turnos" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar turnos por descripción y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-turnos">Descripción</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-turnos"
                    placeholder="Buscar por descripción..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="status-turnos">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-turnos">
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
                  <Label htmlFor="export-turnos">Exportar</Label>
                  <Button id="export-turnos" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Turnos de Trabajo</CardTitle>
                  <CardDescription>Configuración de horarios y turnos laborales</CardDescription>
                </div>
                <Button size="sm" onClick={() => openShiftBuilder()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Turno
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Horas Totales</TableHead>
                    <TableHead>Horas de almuerzo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.data.map((shift: any) => (
                    <TableRow key={shift.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{shift.id}</TableCell>
                      <TableCell>{shift.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{shift.code}</Badge>
                      </TableCell>
                      <TableCell>{shift.totalHours}h</TableCell>
                      <TableCell>{shift.lunchHours}h</TableCell>
                      <TableCell>
                        <Badge className="bg-green-600 text-white">Activo</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent"
                            onClick={() => openShiftBuilder(shift)}
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
              <Pagination totalPages={shifts.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* PARÁMETROS GENERALES */}
        <TabsContent value="parametros" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar parámetros por descripción y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-parametros">Descripción</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-parametros"
                    placeholder="Buscar por descripción..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="status-parametros">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-parametros">
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
                  <Label htmlFor="export-parametros">Exportar</Label>
                  <Button id="export-parametros" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Parámetros del Sistema</CardTitle>
                  <CardDescription>Configuración de parámetros globales de operación</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('parameter', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Parámetro
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Parámetro</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parameters.data.map((param: any) => (
                    <TableRow key={param.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{param.id}</TableCell>
                      <TableCell>{param.name}</TableCell>
                      <TableCell className="font-mono text-sm">{param.value}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{param.unit}</Badge>
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
                            onClick={() => openEditDialog('parameter', param)}
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
              <Pagination totalPages={parameters.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOVEDADES */}
        <TabsContent value="novedades" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Filtrar novedades por descripción y estado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="relative">
                  <Label htmlFor="search-novedades">Descripción</Label>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-novedades"
                    placeholder="Buscar por descripción..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <div>
                  <Label htmlFor="status-novedades">Estado</Label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger id="status-novedades">
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
                  <Label htmlFor="export-novedades">Exportar</Label>
                  <Button id="export-novedades" variant="outline" className="w-full">
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
                  <CardTitle className="text-lg">Novedades</CardTitle>
                  <CardDescription>Configuración de tipos de novedades y eventos laborales</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEditDialog('novelty', null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Novedad
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Requiere Aprobación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {novelties.data.map((novelty: any) => (
                    <TableRow key={novelty.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{novelty.id}</TableCell>
                      <TableCell>{novelty.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{novelty.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={novelty.type === 'Pago' ? 'bg-green-600' : 'bg-yellow-500'}>
                          {novelty.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={novelty.requiresApproval ? 'default' : 'secondary'}>
                          {novelty.requiresApproval ? 'Sí' : 'No'}
                        </Badge>
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
                            onClick={() => openEditDialog('novelty', novelty)}
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
              <Pagination totalPages={novelties.totalPages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* MOVIMIENTOS */}
        <TabsContent value="movimientos" className="mt-6 space-y-4">
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

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Movimientos Registrados</CardTitle>
                  <CardDescription>Listado de movimientos de marcación configurados</CardDescription>
                </div>
                <Button size="sm" onClick={() => openMovimientosEditDialog()}>
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
                            onClick={() => openMovimientosEditDialog(movimiento)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setMovimientosDeleteDialog({ open: true, item: movimiento })}
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
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editDialog.item ? 'Editar ' : 'Nuevo '}
              {editDialog.type === 'access' ? 'Dispositivo' : 
               editDialog.type === 'shift' ? 'Turno' : 
               editDialog.type === 'parameter' ? 'Parámetro General' : 'Novedad'}
            </DialogTitle>
            <DialogDescription>
              Complete la información requerida
            </DialogDescription>
          </DialogHeader>
          
          <form className="space-y-4">
            {/* Dispositivos */}
            {editDialog.type === 'access' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-id">ID *</Label>
                    <Input id="edit-id" defaultValue={editDialog.item?.id} placeholder="001" disabled={!!editDialog.item} />
                  </div>
                  <div>
                    <Label htmlFor="edit-device">Dispositivo *</Label>
                    <Input id="edit-device" defaultValue={editDialog.item?.device} placeholder="DEV001" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-location">Ubicación *</Label>
                  <Select defaultValue={editDialog.item?.location || 'Entrada Principal'}>
                    <SelectTrigger id="edit-location">
                      <SelectValue placeholder="Seleccionar ubicación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Entrada Principal">Entrada Principal</SelectItem>
                      <SelectItem value="Planta Producción">Planta Producción</SelectItem>
                      <SelectItem value="Oficinas Administrativas">Oficinas Administrativas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-ip">Dirección IP *</Label>
                  <Input id="edit-ip" defaultValue={editDialog.item?.ipAddress} placeholder="192.168.1.10" />
                </div>
              </>
            )}

            {/* Turnos */}
            {editDialog.type === 'shift' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-id">ID *</Label>
                    <Input id="edit-id" defaultValue={editDialog.item?.id} placeholder="001" disabled={!!editDialog.item} />
                  </div>
                  <div>
                    <Label htmlFor="edit-code">Código *</Label>
                    <Input id="edit-code" defaultValue={editDialog.item?.code} placeholder="T01" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-name">Nombre *</Label>
                  <Input id="edit-name" defaultValue={editDialog.item?.name} placeholder="Nombre del turno" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-start">Hora Inicio *</Label>
                    <Input id="edit-start" type="text" inputMode="numeric" placeholder="HH:MI:SS" defaultValue={formatClientTime24(editDialog.item?.startTime)} />
                  </div>
                  <div>
                    <Label htmlFor="edit-end">Hora Fin *</Label>
                    <Input id="edit-end" type="text" inputMode="numeric" placeholder="HH:MI:SS" defaultValue={formatClientTime24(editDialog.item?.endTime)} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-hours">Total Horas *</Label>
                  <Input id="edit-hours" defaultValue={editDialog.item?.totalHours} placeholder="8.00" />
                </div>
              </>
            )}

            {/* Parámetros Generales */}
            {editDialog.type === 'parameter' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-id">ID *</Label>
                    <Input id="edit-id" defaultValue={editDialog.item?.id} placeholder="001" disabled={!!editDialog.item} />
                  </div>
                  <div>
                    <Label htmlFor="edit-code">Código *</Label>
                    <Input id="edit-code" defaultValue={editDialog.item?.code} placeholder="PARAM_001" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-desc">Descripción *</Label>
                  <Input id="edit-desc" defaultValue={editDialog.item?.description} placeholder="Descripción del parámetro" />
                </div>
                <div>
                  <Label htmlFor="edit-value">Valor *</Label>
                  <Input id="edit-value" defaultValue={editDialog.item?.value} placeholder="Valor" />
                </div>
                <div>
                  <Label htmlFor="edit-category">Categoría *</Label>
                  <Select defaultValue={editDialog.item?.category || 'Sistema'}>
                    <SelectTrigger id="edit-category">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sistema">Sistema</SelectItem>
                      <SelectItem value="Turnos">Turnos</SelectItem>
                      <SelectItem value="Nómina">Nómina</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Novedades */}
            {editDialog.type === 'novelty' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-id">ID *</Label>
                    <Input id="edit-id" defaultValue={editDialog.item?.id} placeholder="001" disabled={!!editDialog.item} />
                  </div>
                  <div>
                    <Label htmlFor="edit-code">Código *</Label>
                    <Input id="edit-code" defaultValue={editDialog.item?.code} placeholder="NOV_001" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-name">Nombre *</Label>
                  <Input id="edit-name" defaultValue={editDialog.item?.name} placeholder="Nombre de la novedad" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-type">Tipo *</Label>
                    <Select defaultValue={editDialog.item?.type || 'Pago'}>
                      <SelectTrigger id="edit-type">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pago">Pago</SelectItem>
                        <SelectItem value="Descuento">Descuento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-approval">Requiere Aprobación *</Label>
                    <Select defaultValue={editDialog.item?.requiresApproval ? 'Sí' : 'No'}>
                      <SelectTrigger id="edit-approval">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sí">Sí</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
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

      {/* Movimientos Edit Dialog */}
      <Dialog open={movimientosEditDialog.open} onOpenChange={(open) => !open && closeMovimientosEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movimientosEditDialog.item ? 'Editar Movimiento' : 'Nuevo Movimiento'}
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
                value={movimientosFormData.name}
                onChange={(e) => setMovimientosFormData({ ...movimientosFormData, name: e.target.value })}
                placeholder="Ej: Jornada Laboral, Almuerzo, Desayuno"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-abbr">Abreviatura *</Label>
                <Input
                  id="edit-abbr"
                  value={movimientosFormData.abbreviation}
                  onChange={(e) => setMovimientosFormData({ ...movimientosFormData, abbreviation: e.target.value })}
                  placeholder="Ej: JL, ALM, DES"
                  maxLength={10}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-start-key">Tecla de Inicio *</Label>
                <Select
                  value={movimientosFormData.startKey}
                  onValueChange={(value) => setMovimientosFormData({ ...movimientosFormData, startKey: value })}
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
                  value={movimientosFormData.endKey}
                  onValueChange={(value) => setMovimientosFormData({ ...movimientosFormData, endKey: value })}
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
                checked={movimientosFormData.active}
                onCheckedChange={(checked) => setMovimientosFormData({ ...movimientosFormData, active: checked })}
              />
              <Label htmlFor="edit-active">Activo</Label>
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={closeMovimientosEditDialog}>
              Cancelar
            </Button>
            <Button onClick={handleMovimientosSave}>
              Grabar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movimientos Delete Dialog */}
      <AlertDialog open={movimientosDeleteDialog.open} onOpenChange={(open) => !open && setMovimientosDeleteDialog({ open: false, item: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El movimiento "{movimientosDeleteDialog.item?.name}" será eliminado permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMovimientosDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CONSTRUCTOR DE TURNOS - DIÁLOGO */}
      <Dialog open={shiftBuilderOpen} onOpenChange={setShiftBuilderOpen}>
        <DialogContent className="!max-w-[1400px] w-[96vw] max-h-[90vh] overflow-hidden p-0">
          <div className="p-6 pb-4 border-b">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <DialogTitle className="text-base">Constructor de Turnos Laborales</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Configure turnos con bloques de jornada ordinaria, nocturna y horas extras
            </DialogDescription>
            <div className="space-y-2">
              <Label htmlFor="shift-name" className="text-xs text-muted-foreground">Nombre del Turno</Label>
              <Input id="shift-name" value={shiftName} onChange={(e) => setShiftName(e.target.value)} placeholder="turno nocturno" className="h-9"/>
            </div>
          </div>

          <ScrollArea className="h-[calc(90vh-180px)] px-6">
            <div className="grid grid-cols-[1fr_4fr] gap-6 py-6 pr-4">
              {/* PANEL IZQUIERDO */}
              <div className="space-y-4">
                {/* Configuración */}
                <div>
                  <h3 className="text-sm mb-3">Configuración</h3>                  
                </div>

                {/* Tipos de Bloques */}
                <div>
                  <h3 className="text-sm mb-2">Tipos de Bloques</h3>
                  <p className="text-[11px] text-muted-foreground mb-3">Cada tipo solo se puede agregar una vez</p>
                  <div className="space-y-2">
                    {Object.entries(BLOCK_TYPES).map(([key, type]) => (
                      <button
                        key={key}
                        onClick={() => addWorkBlock(key as keyof typeof BLOCK_TYPES)}
                        disabled={usedBlockTypes.has(key)}
                        className={`w-full p-2 rounded-md border text-left text-xs transition-colors flex items-center gap-2 ${
                          usedBlockTypes.has(key) 
                            ? 'bg-muted/50 text-muted-foreground cursor-not-allowed border-border' 
                            : 'hover:bg-accent cursor-pointer border-border bg-card'
                        }`}
                      >
                        <div 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: type.color }}
                        />
                        <span className="flex-1 truncate">{type.name}</span>
                        {!usedBlockTypes.has(key) && (
                          <Plus className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </button>
                    ))}

                    <button
                      onClick={addLunchBlock}
                      className="w-full p-2 rounded-md border text-left text-xs hover:bg-accent cursor-pointer border-border bg-card flex items-center gap-2"
                    >
                      <div className="w-3 h-3 rounded-full bg-[#F59E0B] shrink-0" />
                      <span className="flex-1">Intervalo de Lunch</span>
                      <Plus className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Información */}
                <div>
                  <h3 className="text-sm mb-3">Información</h3>
                  <div className="space-y-2.5 text-xs">
                    {Object.entries(BLOCK_TYPES).map(([key, type]) => (
                      <div key={key} className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full shrink-0" 
                            style={{ backgroundColor: type.color }}
                          />
                          <span>{type.name}:</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground ml-4 leading-tight">{type.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* PANEL DERECHO - TIMELINES Y RESUMEN */}
              <div className="space-y-5">
                {/* Bloques de Jornada */}
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm mb-1">Bloques de Jornada</h3>
                      <p className="text-[11px] text-muted-foreground">
                        {workBlocks.length > 0 ? (
                          <>
                            {workBlocks.map(b => BLOCK_TYPES[b.type].name).join(' • ')} | {minutesToTime(workBlocks[0]?.startMinutes || 0)} - {minutesToTime(workBlocks[workBlocks.length - 1]?.endMinutes || 0)} ({Math.round((workBlocks.reduce((sum, b) => sum + (b.endMinutes - b.startMinutes), 0)) / 60)}h)
                          </>
                        ) : (
                          'Jornada Ordinaria + Jornada Nocturna + Horas Extras 100% + Horas Extras 50% (19h - 07h0 +00h) (48H)'
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground">Ajuste cada 15 minutos | Turno extendido (48h)</span>
                      <span className="text-xs">{workBlocks.length} Bloques</span>
                      {selectedBlock && workBlocks.find(b => b.id === selectedBlock) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBlock(selectedBlock, false)}
                          className="h-7 -mt-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-card">
                    {/* Marcadores de tiempo */}
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-2 px-1">
                      {Array.from({ length: 9 }).map((_, i) => {
                        const hours = i * 6;
                        const day = Math.floor(hours / 24) + 1;
                        const hour = hours % 24;
                        return (
                          <span key={i} className="text-center" style={{ width: '12.5%' }}>
                            {hour.toString().padStart(2, '0')}:00 (D{day})
                          </span>
                        );
                      })}
                    </div>

                    {/* Timeline */}
                    <div 
                      ref={timelineRef}
                      className="relative h-16 bg-muted/20 rounded-md cursor-crosshair"
                      style={{ width: '100%' }}
                    >
                      {/* Líneas de tiempo cada 6 horas */}
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 w-px bg-border/50"
                          style={{ left: `${(i / 8) * 100}%` }}
                        />
                      ))}

                      {/* Bloques */}
                      {workBlocks.map((block) => (
                        <div
                          key={block.id}
                          className={`absolute top-2 bottom-2 rounded-full cursor-move transition-all shadow-sm ${
                            selectedBlock === block.id ? 'ring-2 ring-white ring-offset-2 ring-offset-background' : ''
                          }`}
                          style={{
                            left: `${minutesToX(block.startMinutes)}%`,
                            width: `${minutesToX(block.endMinutes - block.startMinutes)}%`,
                            backgroundColor: BLOCK_TYPES[block.type].color
                          }}
                          onClick={() => setSelectedBlock(block.id)}
                          onMouseDown={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const edge = clickX < 10 ? 'start' : clickX > rect.width - 10 ? 'end' : 'move';
                            handleMouseDown(e, block.id, edge, false);
                          }}
                        >
                          {/* Handles de redimensión */}
                          <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-l-full" />
                          <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-r-full" />
                          
                          {/* Etiqueta */}
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-semibold pointer-events-none">
                            +{BLOCK_TYPES[block.type].surcharge}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Intervalo de Lunch */}
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                      <h3 className="text-sm">Intervalo de Lunch</h3>
                    </div>
                    {selectedBlock && lunchBlocks.find(b => b.id === selectedBlock) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBlock(selectedBlock, true)}
                        className="h-7 -mt-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-3">
                    {lunchBlocks.length > 0 ? (
                      <>
                        {lunchBlocks.map(b => `${minutesToTime(b.startMinutes)} - ${minutesToTime(b.endMinutes)}`).join(', ')} ({Math.round((lunchBlocks.reduce((sum, b) => sum + (b.endMinutes - b.startMinutes), 0)) / 60 * 10) / 10}h)
                      </>
                    ) : (
                      ' 07:00 - 21:45, 00:00-06:30 (1h)'
                    )}
                  </p>

                  <div className="border rounded-lg p-4 bg-card">
                    {/* Marcadores de tiempo */}
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-2 px-1">
                      {Array.from({ length: 9 }).map((_, i) => {
                        const hours = i * 6;
                        const day = Math.floor(hours / 24) + 1;
                        const hour = hours % 24;
                        return (
                          <span key={i} className="text-center" style={{ width: '12.5%' }}>
                            {hour.toString().padStart(2, '0')}:00 (D{day})
                          </span>
                        );
                      })}
                    </div>

                    {/* Timeline */}
                    <div className="relative h-12 bg-muted/20 rounded-md">
                      {/* Líneas de tiempo */}
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 w-px bg-border/50"
                          style={{ left: `${(i / 8) * 100}%` }}
                        />
                      ))}

                      {/* Bloques de Lunch */}
                      {lunchBlocks.map((block) => (
                        <div
                          key={block.id}
                          className={`absolute top-2 bottom-2 rounded-full cursor-move bg-[#F59E0B] transition-all shadow-sm ${
                            selectedBlock === block.id ? 'ring-2 ring-white ring-offset-2 ring-offset-background' : ''
                          }`}
                          style={{
                            left: `${minutesToX(block.startMinutes)}%`,
                            width: `${minutesToX(block.endMinutes - block.startMinutes)}%`
                          }}
                          onClick={() => setSelectedBlock(block.id)}
                          onMouseDown={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const edge = clickX < 10 ? 'start' : clickX > rect.width - 10 ? 'end' : 'move';
                            handleMouseDown(e, block.id, edge, true);
                          }}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-l-full" />
                          <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-r-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RESUMEN DEL TURNO */}
                <div>
                  <h3 className="text-sm mb-3">Resumen de Turno</h3>
                  <div className="border rounded-lg p-4 bg-card">
                    <div className="grid grid-cols-2 gap-2.5">
                      {Object.entries(summary).map(([type, hours]) => {
                        const blockType = BLOCK_TYPES[type as keyof typeof BLOCK_TYPES];
                        return (
                          <div 
                            key={type} 
                            className="flex items-center justify-between p-2.5 rounded-md border"
                          >
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2.5 h-2.5 rounded-full" 
                                style={{ backgroundColor: blockType.color }}
                              />
                              <span className="text-xs">{blockType.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs">{hours}h</span>
                              <Badge 
                                className="text-white text-[10px] h-5 px-2"
                                style={{ backgroundColor: blockType.color }}
                              >
                                +{blockType.surcharge}%
                              </Badge>
                            </div>
                          </div>
                        );
                      })}

                      {lunchBlocks.length > 0 && (
                        <div className="flex items-center justify-between p-2.5 rounded-md border">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                            <span className="text-xs">Lunch</span>
                          </div>
                          <span className="text-xs">
                            {Math.round((lunchBlocks.reduce((sum, b) => sum + (b.endMinutes - b.startMinutes), 0)) / 60 * 10) / 10}h
                          </span>
                        </div>
                      )}

                      {Object.keys(summary).length === 0 && lunchBlocks.length === 0 && (
                        <div className="col-span-2 text-center py-6 text-xs text-muted-foreground">
                          Agregue bloques para ver el resumen
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end justify-end mt-4 space-x-2" >
                    <Button variant="outline" onClick={closeShiftBuilder}>Cancelar</Button>
                    <Button onClick={saveShift} disabled={!shiftName.trim() || workBlocks.length === 0}>
                    Guardar Turno
                    </Button>
                  </div>            
                </div>
              </div>            
            </div>           
          </ScrollArea>
          
        </DialogContent>
          
      </Dialog>
    </div>
  );
}
