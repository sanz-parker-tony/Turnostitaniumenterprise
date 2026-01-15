import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Search, FileText, CheckCircle, XCircle, ChevronLeft, ChevronRight, Calendar, Clock, AlertCircle, Download } from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { toast } from 'sonner';
import { demoPermisosProgra, demoJustificacionesReq, demoCambiosTurno, demoCorreccionesMarcacion } from './DemoData';

const ITEMS_PER_PAGE = 10;

export default function Solicitudes({ activeTab: initialTab = 'permisos', title = 'Solicitudes' }: { activeTab?: string; title?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionDialog, setActionDialog] = useState<{ open: boolean; action: 'approve' | 'reject' | null; item: any; type: string }>({ 
    open: false, 
    action: null, 
    item: null,
    type: ''
  });

  // Estados locales para manejar aprobaciones/rechazos
  const [permisos, setPermisos] = useState(demoPermisosProgra);
  const [justificaciones, setJustificaciones] = useState(demoJustificacionesReq);
  const [cambiosTurno, setCambiosTurno] = useState(demoCambiosTurno);
  const [correcciones, setCorrecciones] = useState(demoCorreccionesMarcacion);

  // Actualizar tab cuando cambie desde el menú
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleAction = (action: 'approve' | 'reject', item: any, type: string) => {
    setActionDialog({ open: true, action, item, type });
  };

  const confirmAction = () => {
    if (!actionDialog.action || !actionDialog.item) return;

    const newEstado = actionDialog.action === 'approve' ? 'Aprobado' : 'Rechazado';
    const actionText = actionDialog.action === 'approve' ? 'aprobado' : 'rechazado';

    // Actualizar el estado según el tipo
    switch (actionDialog.type) {
      case 'permisos':
        setPermisos(permisos.map(p => 
          p.id === actionDialog.item.id ? { ...p, estado: newEstado } : p
        ));
        break;
      case 'justificaciones':
        setJustificaciones(justificaciones.map(j => 
          j.id === actionDialog.item.id ? { ...j, estado: newEstado } : j
        ));
        break;
      case 'cambios':
        setCambiosTurno(cambiosTurno.map(c => 
          c.id === actionDialog.item.id ? { ...c, estado: newEstado } : c
        ));
        break;
      case 'correcciones':
        setCorrecciones(correcciones.map(c => 
          c.id === actionDialog.item.id ? { ...c, estado: newEstado } : c
        ));
        break;
    }

    toast.success(`Solicitud ${actionText} exitosamente`, {
      description: `La solicitud de ${actionDialog.item.empleado} ha sido ${actionText}.`
    });

    setActionDialog({ open: false, action: null, item: null, type: '' });
  };

  const getEstadoBadge = (estado: string) => {
    const badgeClass = 
      estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
      estado === 'Aprobado' ? 'bg-green-100 text-green-800 border-green-300' :
      'bg-red-100 text-red-800 border-red-300';
    
    const Icon = 
      estado === 'Pendiente' ? AlertCircle :
      estado === 'Aprobado' ? CheckCircle :
      XCircle;

    return (
      <Badge className={`${badgeClass} border`}>
        <Icon className="w-3 h-3 mr-1" />
        {estado}
      </Badge>
    );
  };

  // Función de filtrado genérica
  const filterData = (data: any[]) => {
    return data.filter(item => {
      const matchesSearch = 
        item.empleado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.cedula?.includes(searchTerm) ||
        item.motivo?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? item.estado === 'Pendiente' :
        item.estado !== 'Pendiente';

      return matchesSearch && matchesStatus;
    });
  };

  const renderPagination = (totalItems: number) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    
    return (
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Mostrando {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalItems)} - {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} de {totalItems} registros
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  const getPaginatedData = (data: any[]) => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl mb-2 text-foreground">{title}</h1>
        <p className="text-muted-foreground">Revisión y aprobación de solicitudes enviadas desde la app móvil</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setCurrentPage(1); }} className="space-y-6">
        {/* TabsList oculto ya que el menú lateral lo reemplaza */}
        <TabsList className="hidden">
          <TabsTrigger value="permisos">
            <Calendar className="w-4 h-4 mr-2" />
            Programación de Permisos
          </TabsTrigger>
          <TabsTrigger value="justificaciones-sol">
            <FileText className="w-4 h-4 mr-2" />
            Ingreso de Justificación
          </TabsTrigger>
          <TabsTrigger value="cambios">
            <Clock className="w-4 h-4 mr-2" />
            Cambio de Turno
          </TabsTrigger>
          <TabsTrigger value="regularizacion">
            <CheckCircle className="w-4 h-4 mr-2" />
            Corrección de Marcación
          </TabsTrigger>
        </TabsList>

        {/* PESTAÑA 1: PROGRAMACIÓN DE PERMISOS */}
        <TabsContent value="permisos" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Solicitudes de Permisos Planificados</CardTitle>
                  <CardDescription>Vacaciones, maternidad, paternidad, permisos médicos y duelo</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por empleado, cédula o motivo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Pendientes</SelectItem>
                    <SelectItem value="inactive">Procesados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tabla */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Empleado</TableHead>
                      <TableHead>Cédula</TableHead>
                      <TableHead>Tipo Permiso</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Días</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Fecha Solicitud</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPaginatedData(filterData(permisos)).map((permiso) => (
                      <TableRow key={permiso.id}>
                        <TableCell>{permiso.empleado}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{permiso.cedula}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{permiso.tipoPermiso}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {permiso.fechaDesde} al {permiso.fechaHasta}
                        </TableCell>
                        <TableCell className="text-center">{permiso.dias}</TableCell>
                        <TableCell className="max-w-xs truncate text-sm">{permiso.motivo}</TableCell>
                        <TableCell>
                          {permiso.documento !== 'N/A' ? (
                            <Button variant="ghost" size="sm" className="h-7">
                              <Download className="w-3 h-3 mr-1" />
                              Ver
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin archivo</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{permiso.fechaSolicitud}</TableCell>
                        <TableCell>{getEstadoBadge(permiso.estado)}</TableCell>
                        <TableCell className="text-right">
                          {permiso.estado === 'Pendiente' ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-[#2ECC71] hover:bg-[#27AE60]"
                                onClick={() => handleAction('approve', permiso, 'permisos')}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAction('reject', permiso, 'permisos')}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Rechazar
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Procesado</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {renderPagination(filterData(permisos).length)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PESTAÑA 2: JUSTIFICACIONES */}
        <TabsContent value="justificaciones-sol" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Justificaciones por Incidentes</CardTitle>
                  <CardDescription>Atrasos, salidas anticipadas y faltas imprevistas</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por empleado, cédula o motivo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Pendientes</SelectItem>
                    <SelectItem value="inactive">Procesados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tabla */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Empleado</TableHead>
                      <TableHead>Cédula</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo Incidente</TableHead>
                      <TableHead>Hora Real</TableHead>
                      <TableHead>Hora Esperada</TableHead>
                      <TableHead>Diferencia (min)</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPaginatedData(filterData(justificaciones)).map((just) => (
                      <TableRow key={just.id}>
                        <TableCell>{just.empleado}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{just.cedula}</TableCell>
                        <TableCell className="text-sm">{just.fecha}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={
                              just.tipoIncidente === 'Atraso' ? 'border-yellow-500 text-yellow-700' :
                              just.tipoIncidente === 'Salida Anticipada' ? 'border-orange-500 text-orange-700' :
                              'border-red-500 text-red-700'
                            }
                          >
                            {just.tipoIncidente}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{just.horaLlegada || just.horaSalida || 'N/A'}</TableCell>
                        <TableCell className="text-sm">{just.horaEsperada}</TableCell>
                        <TableCell className="text-center text-sm font-medium">{just.minutos}</TableCell>
                        <TableCell className="max-w-xs truncate text-sm">{just.motivo}</TableCell>
                        <TableCell>
                          {just.documento !== 'N/A' ? (
                            <Button variant="ghost" size="sm" className="h-7">
                              <Download className="w-3 h-3 mr-1" />
                              Ver
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin archivo</span>
                          )}
                        </TableCell>
                        <TableCell>{getEstadoBadge(just.estado)}</TableCell>
                        <TableCell className="text-right">
                          {just.estado === 'Pendiente' ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-[#2ECC71] hover:bg-[#27AE60]"
                                onClick={() => handleAction('approve', just, 'justificaciones')}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAction('reject', just, 'justificaciones')}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Rechazar
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Procesado</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {renderPagination(filterData(justificaciones).length)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PESTAÑA 3: CAMBIOS DE TURNO */}
        <TabsContent value="cambios" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Solicitudes de Cambio de Turno</CardTitle>
                  <CardDescription>Cambios de horario o solicitud de día libre</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por empleado, cédula o motivo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Pendientes</SelectItem>
                    <SelectItem value="inactive">Procesados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tabla */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Empleado</TableHead>
                      <TableHead>Cédula</TableHead>
                      <TableHead>Fecha Cambio</TableHead>
                      <TableHead>Turno Actual</TableHead>
                      <TableHead>Turno Solicitado</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Fecha Solicitud</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPaginatedData(filterData(cambiosTurno)).map((cambio) => (
                      <TableRow key={cambio.id}>
                        <TableCell>{cambio.empleado}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{cambio.cedula}</TableCell>
                        <TableCell className="text-sm">{cambio.fecha}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50">{cambio.turnoActual}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cambio.turnoSolicitado === 'Día Libre' ? 'bg-purple-50' : 'bg-green-50'}
                          >
                            {cambio.turnoSolicitado}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm">{cambio.motivo}</TableCell>
                        <TableCell className="text-sm">{cambio.fechaSolicitud}</TableCell>
                        <TableCell>{getEstadoBadge(cambio.estado)}</TableCell>
                        <TableCell className="text-right">
                          {cambio.estado === 'Pendiente' ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-[#2ECC71] hover:bg-[#27AE60]"
                                onClick={() => handleAction('approve', cambio, 'cambios')}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAction('reject', cambio, 'cambios')}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Rechazar
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Procesado</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {renderPagination(filterData(cambiosTurno).length)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PESTAÑA 4: CORRECCIONES DE MARCACIÓN */}
        <TabsContent value="regularizacion" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Solicitudes de Corrección de Marcación</CardTitle>
                  <CardDescription>Marcaciones olvidadas o movimientos registrados incorrectamente</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por empleado, cédula o motivo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Pendientes</SelectItem>
                    <SelectItem value="inactive">Procesados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tabla */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Empleado</TableHead>
                      <TableHead>Cédula</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo Error</TableHead>
                      <TableHead>Hora Real</TableHead>
                      <TableHead>Movimiento Real</TableHead>
                      <TableHead>Movimiento Registrado</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Testigo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPaginatedData(filterData(correcciones)).map((corr) => (
                      <TableRow key={corr.id}>
                        <TableCell>{corr.empleado}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{corr.cedula}</TableCell>
                        <TableCell className="text-sm">{corr.fecha}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={
                              corr.tipoError === 'Marcación Olvidada' ? 'border-purple-500 text-purple-700' :
                              'border-orange-500 text-orange-700'
                            }
                          >
                            {corr.tipoError}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{corr.horaReal}</TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-[#2ECC71]">{corr.movimientoReal}</Badge>
                        </TableCell>
                        <TableCell>
                          {corr.movimientoRegistrado !== 'N/A' ? (
                            <Badge variant="destructive">{corr.movimientoRegistrado}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin registro</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm">{corr.motivo}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{corr.testigo}</TableCell>
                        <TableCell>{getEstadoBadge(corr.estado)}</TableCell>
                        <TableCell className="text-right">
                          {corr.estado === 'Pendiente' ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-[#2ECC71] hover:bg-[#27AE60]"
                                onClick={() => handleAction('approve', corr, 'correcciones')}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAction('reject', corr, 'correcciones')}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Rechazar
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Procesado</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {renderPagination(filterData(correcciones).length)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo de Confirmación */}
      <AlertDialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, action: null, item: null, type: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog.action === 'approve' ? '¿Aprobar solicitud?' : '¿Rechazar solicitud?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.action === 'approve' 
                ? `Está a punto de aprobar la solicitud de ${actionDialog.item?.empleado}. Esta acción creará los registros correspondientes en el sistema.`
                : `Está a punto de rechazar la solicitud de ${actionDialog.item?.empleado}. El empleado será notificado del rechazo.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={actionDialog.action === 'approve' ? 'bg-[#2ECC71] hover:bg-[#27AE60]' : 'bg-destructive hover:bg-destructive/90'}
            >
              {actionDialog.action === 'approve' ? 'Aprobar' : 'Rechazar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}