import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { RefreshCw, Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

export default function Sincronizacion({ activeTab: initialTab = 'importacion-empleados', title = 'Sincronización' }: { activeTab?: string; title?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Actualizar tab cuando cambie desde el menú
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Estados para Importación de Empleados
  const [importEmpleadosData] = useState([
    { id: 1, cedula: '001-1234567-8', nombre: 'Juan Pérez', empresa: 'Titanium Corp', estado: 'Pendiente' },
    { id: 2, cedula: '001-2345678-9', nombre: 'María García', empresa: 'Titanium Corp', estado: 'Importado' },
    { id: 3, cedula: '001-3456789-0', nombre: 'Pedro Rodríguez', empresa: 'Titanium Corp', estado: 'Error' },
  ]);

  // Estados para Importación de Marcaciones
  const [importMarcacionesData] = useState([
    { id: 1, empleado: 'Juan Pérez', fecha: '2025-10-26', hora: '08:00', tipo: 'Entrada', dispositivo: 'Terminal 01' },
    { id: 2, empleado: 'María García', fecha: '2025-10-26', hora: '08:15', tipo: 'Entrada', dispositivo: 'Terminal 02' },
    { id: 3, empleado: 'Pedro Rodríguez', fecha: '2025-10-26', hora: '12:00', tipo: 'Salida Lunch', dispositivo: 'Terminal 01' },
  ]);

  // Estados para Exportación a Nómina
  const [exportNominaData] = useState([
    { id: 1, proceso: 'PROC-2025-001', tipo: 'Novedades', periodo: 'Octubre 2025', estado: 'Migrado', registros: 150 },
    { id: 2, proceso: 'PROC-2025-002', tipo: 'Liquidación', periodo: 'Octubre 2025', estado: 'Migrado', registros: 75 },
    { id: 3, proceso: 'PROC-2025-003', tipo: 'Novedades', periodo: 'Septiembre 2025', estado: 'Exportado', registros: 200 },
  ]);

  const handleImportarEmpleados = () => {
    console.log('Importando empleados...');
  };

  const handleImportarMarcaciones = () => {
    console.log('Importando marcaciones...');
  };

  const handleExportarNomina = (procesoId: number) => {
    console.log('Exportando proceso a nómina:', procesoId);
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl mb-1">{title}</h1>
        <p className="text-sm text-muted-foreground">Importación y exportación de datos del sistema</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* TabsList oculto ya que el menú lateral lo reemplaza */}
        <TabsList className="hidden">
          <TabsTrigger value="importacion-empleados">Importación Empleados</TabsTrigger>
          <TabsTrigger value="importacion-marcaciones">Importación Marcaciones</TabsTrigger>
          <TabsTrigger value="exportacion-nomina">Exportación a Nómina</TabsTrigger>
        </TabsList>

        {/* IMPORTACIÓN EMPLEADOS */}
        <TabsContent value="importacion-empleados" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Criterios de Búsqueda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="import-emp-empresa">Empresa</Label>
                  <Select>
                    <SelectTrigger id="import-emp-empresa">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="titanium">Titanium Corp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="import-emp-estado">Estado</Label>
                  <Select defaultValue="todos">
                    <SelectTrigger id="import-emp-estado">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="importado">Importado</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="import-emp-archivo">Archivo de Importación</Label>
                  <Input id="import-emp-archivo" type="file" accept=".xlsx,.xls,.csv" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleImportarEmpleados} className="flex-1">
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Empleados
                </Button>
                <Button variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Plantilla
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Resultados de Importación</CardTitle>
                <Badge variant="secondary">{importEmpleadosData.length} registros</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cédula/Pasaporte</TableHead>
                    <TableHead>Nombre Completo</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importEmpleadosData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.cedula}</TableCell>
                      <TableCell>{item.nombre}</TableCell>
                      <TableCell>{item.empresa}</TableCell>
                      <TableCell>
                        {item.estado === 'Importado' && (
                          <Badge variant="outline" className="border-green-500 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {item.estado}
                          </Badge>
                        )}
                        {item.estado === 'Pendiente' && (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                            {item.estado}
                          </Badge>
                        )}
                        {item.estado === 'Error' && (
                          <Badge variant="outline" className="border-red-500 text-red-700">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {item.estado}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IMPORTACIÓN MARCACIONES */}
        <TabsContent value="importacion-marcaciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Criterios de Búsqueda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="import-marc-dispositivo">Dispositivo</Label>
                  <Select>
                    <SelectTrigger id="import-marc-dispositivo">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="terminal01">Terminal 01</SelectItem>
                      <SelectItem value="terminal02">Terminal 02</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="import-marc-fecha-inicio">Fecha Inicio</Label>
                  <Input id="import-marc-fecha-inicio" type="date" />
                </div>
                <div>
                  <Label htmlFor="import-marc-fecha-fin">Fecha Fin</Label>
                  <Input id="import-marc-fecha-fin" type="date" />
                </div>
                <div>
                  <Label htmlFor="import-marc-archivo">Archivo de Importación</Label>
                  <Input id="import-marc-archivo" type="file" accept=".xlsx,.xls,.csv,.txt" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleImportarMarcaciones} className="flex-1">
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Marcaciones
                </Button>
                <Button variant="outline" className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sincronizar Dispositivos
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Marcaciones Importadas</CardTitle>
                <Badge variant="secondary">{importMarcacionesData.length} registros</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Dispositivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importMarcacionesData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.empleado}</TableCell>
                      <TableCell>{item.fecha}</TableCell>
                      <TableCell>{item.hora}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.tipo}</Badge>
                      </TableCell>
                      <TableCell>{item.dispositivo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPORTACIÓN A NÓMINA */}
        <TabsContent value="exportacion-nomina" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Criterios de Búsqueda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="export-nom-tipo">Tipo de Proceso</Label>
                  <Select defaultValue="todos">
                    <SelectTrigger id="export-nom-tipo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="novedades">Novedades</SelectItem>
                      <SelectItem value="liquidacion">Liquidación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="export-nom-estado">Estado</Label>
                  <Select defaultValue="migrado">
                    <SelectTrigger id="export-nom-estado">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="migrado">Migrado</SelectItem>
                      <SelectItem value="exportado">Exportado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="export-nom-periodo">Periodo</Label>
                  <Select>
                    <SelectTrigger id="export-nom-periodo">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="oct2025">Octubre 2025</SelectItem>
                      <SelectItem value="sep2025">Septiembre 2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Procesos Disponibles para Exportación</CardTitle>
                <Badge variant="secondary">{exportNominaData.length} procesos</Badge>
              </div>
              <CardDescription>
                Solo se pueden exportar procesos en estado "Migrado"
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código de Proceso</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportNominaData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.proceso}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.tipo}</Badge>
                      </TableCell>
                      <TableCell>{item.periodo}</TableCell>
                      <TableCell>{item.registros}</TableCell>
                      <TableCell>
                        {item.estado === 'Migrado' && (
                          <Badge variant="outline" className="border-blue-500 text-blue-700">
                            {item.estado}
                          </Badge>
                        )}
                        {item.estado === 'Exportado' && (
                          <Badge variant="outline" className="border-green-500 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {item.estado}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          disabled={item.estado !== 'Migrado'}
                          onClick={() => handleExportarNomina(item.id)}
                        >
                          <FileSpreadsheet className="w-4 h-4 mr-1" />
                          Exportar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}