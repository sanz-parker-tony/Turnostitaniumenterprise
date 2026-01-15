import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar, Plus, Trash2, Play, Save, Sun, Sunset, Moon, Coffee, Umbrella } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';

// Configuración de turnos
const TURNOS_CONFIG = {
  M: { 
    name: 'Mañana', 
    horario: '07h00 - 15h00', 
    color: '#0074D9', 
    bgColor: '#E3F2FD',
    icon: Sun 
  },
  T: { 
    name: 'Tarde', 
    horario: '15h00 - 23h00', 
    color: '#FF6B35', 
    bgColor: '#FFF3E0',
    icon: Sunset 
  },
  N: { 
    name: 'Noche', 
    horario: '23h00 - 07h00', 
    color: '#5E35B1', 
    bgColor: '#EDE7F6',
    icon: Moon 
  },
  P: { 
    name: 'Permiso', 
    horario: '-', 
    color: '#FFA726', 
    bgColor: '#FFF8E1',
    icon: Umbrella 
  },
  L: { 
    name: 'Libre', 
    horario: '-', 
    color: '#9E9E9E', 
    bgColor: '#F5F5F5',
    icon: Coffee 
  },
};

const ORDEN_TURNOS = ['M', 'T', 'N', 'P', 'L'];

// Mock data para empleados
const EMPLEADOS_MOCK = [
  { id: 'E001', nombre: 'Juan Pérez', cargo: 'Operador', area: 'Producción', grupo: 'Grupo A', localidad: 'Guayaquil', departamento: 'Producción' },
  { id: 'E002', nombre: 'María García', cargo: 'Supervisor', area: 'Calidad', grupo: 'Grupo B', localidad: 'Guayaquil', departamento: 'Calidad' },
  { id: 'E003', nombre: 'Carlos López', cargo: 'Operador', area: 'Producción', grupo: 'Grupo A', localidad: 'Guayaquil', departamento: 'Producción' },
  { id: 'E004', nombre: 'Pedro Rodríguez', cargo: 'Operador', area: 'Producción', grupo: 'Grupo A', localidad: 'Quito', departamento: 'Producción' },
  { id: 'E005', nombre: 'Laura Sánchez', cargo: 'Supervisor', area: 'Producción', grupo: 'Grupo B', localidad: 'Guayaquil', departamento: 'Producción' },
  { id: 'E006', nombre: 'Diego Fernández', cargo: 'Operador', area: 'Producción', grupo: 'Grupo A', localidad: 'Quito', departamento: 'Producción' },
  { id: 'E007', nombre: 'Carmen Díaz', cargo: 'Técnico', area: 'Calidad', grupo: 'Grupo C', localidad: 'Guayaquil', departamento: 'Calidad' },
  { id: 'E008', nombre: 'Roberto Silva', cargo: 'Operador', area: 'Producción', grupo: 'Grupo B', localidad: 'Quito', departamento: 'Producción' },
];

// Tipo para secuencia de turno
type SecuenciaTurno = {
  id: string;
  turnoId: keyof typeof TURNOS_CONFIG;
  diasAplicacion: number;
};

export default function PlanificacionTurnosManual() {
  const [fechaInicio, setFechaInicio] = useState('2025-10-27');
  const [fechaFin, setFechaFin] = useState('2025-11-02');
  const [empresa, setEmpresa] = useState('titanium');
  const [localidad, setLocalidad] = useState('todas');
  const [departamento, setDepartamento] = useState('todos');
  const [area, setArea] = useState('todas');
  const [centroCostos, setCentroCostos] = useState('todos');
  const [rolPago, setRolPago] = useState('todos');
  const [grupo, setGrupo] = useState('todos');

  // Estado de secuencias de turnos
  const [secuencias, setSecuencias] = useState<SecuenciaTurno[]>([
    { id: '1', turnoId: 'M', diasAplicacion: 3 },
    { id: '2', turnoId: 'N', diasAplicacion: 2 },
    { id: '3', turnoId: 'L', diasAplicacion: 2 },
  ]);

  // Estado de búsqueda y asignaciones
  const [empleadosFiltrados, setEmpleadosFiltrados] = useState<typeof EMPLEADOS_MOCK>([]);
  const [grillaMostrada, setGrillaMostrada] = useState(false);
  const [asignaciones, setAsignaciones] = useState<{[key: string]: {[key: string]: keyof typeof TURNOS_CONFIG}}>({});

  // Generar rango de fechas
  const generarRangoFechas = () => {
    const fechas = [];
    const [anioInicio, mesInicio, diaInicio] = fechaInicio.split('-').map(Number);
    const [anioFin, mesFin, diaFin] = fechaFin.split('-').map(Number);
    
    const inicio = new Date(anioInicio, mesInicio - 1, diaInicio);
    const fin = new Date(anioFin, mesFin - 1, diaFin);
    const actual = new Date(inicio);
    
    while (actual <= fin) {
      const year = actual.getFullYear();
      const month = String(actual.getMonth() + 1).padStart(2, '0');
      const day = String(actual.getDate()).padStart(2, '0');
      fechas.push(`${year}-${month}-${day}`);
      actual.setDate(actual.getDate() + 1);
    }
    return fechas;
  };

  const rangoFechas = generarRangoFechas();

  // Obtener día de la semana abreviado
  const obtenerDiaSemana = (fecha: string) => {
    const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const d = new Date(anio, mes - 1, dia);
    return dias[d.getDay()];
  };

  // Buscar empleados
  const buscarEmpleados = () => {
    let filtrados = [...EMPLEADOS_MOCK];

    // Aplicar filtros
    if (localidad !== 'todas') {
      filtrados = filtrados.filter(e => e.localidad.toLowerCase() === localidad.toLowerCase());
    }
    if (departamento !== 'todos') {
      filtrados = filtrados.filter(e => e.departamento.toLowerCase() === departamento.toLowerCase());
    }
    if (area !== 'todas') {
      filtrados = filtrados.filter(e => e.area.toLowerCase() === area.toLowerCase());
    }
    if (grupo !== 'todos') {
      filtrados = filtrados.filter(e => e.grupo.toLowerCase() === grupo.toLowerCase());
    }

    setEmpleadosFiltrados(filtrados);
    setGrillaMostrada(true);
    
    // Limpiar asignaciones previas
    setAsignaciones({});

    toast.success('Búsqueda completada', {
      description: `Se encontraron ${filtrados.length} empleado(s).`
    });
  };

  // Agregar nueva secuencia
  const agregarSecuencia = () => {
    const nuevaSecuencia: SecuenciaTurno = {
      id: Date.now().toString(),
      turnoId: 'M',
      diasAplicacion: 1
    };
    setSecuencias([...secuencias, nuevaSecuencia]);
  };

  // Eliminar secuencia
  const eliminarSecuencia = (id: string) => {
    if (secuencias.length <= 1) {
      toast.error('Debe haber al menos una secuencia');
      return;
    }
    setSecuencias(secuencias.filter(s => s.id !== id));
  };

  // Actualizar secuencia
  const actualizarSecuencia = (id: string, campo: 'turnoId' | 'diasAplicacion', valor: string | number) => {
    setSecuencias(secuencias.map(s => {
      if (s.id === id) {
        return { ...s, [campo]: valor };
      }
      return s;
    }));
  };

  // Generar planificación aplicando la secuencia
  const generarPlanificacion = () => {
    if (!grillaMostrada || empleadosFiltrados.length === 0) {
      toast.error('Primero debe buscar empleados', {
        description: 'Use el botón "Buscar" para cargar empleados.'
      });
      return;
    }

    if (secuencias.length === 0) {
      toast.error('No hay secuencias definidas', {
        description: 'Agrega al menos una secuencia de turno.'
      });
      return;
    }

    const nuevasAsignaciones: {[key: string]: {[key: string]: keyof typeof TURNOS_CONFIG}} = {};

    // Para cada empleado filtrado
    empleadosFiltrados.forEach(empleado => {
      nuevasAsignaciones[empleado.id] = {};

      let indiceFecha = 0;
      let indiceSecuencia = 0;
      let diasRestantesEnSecuencia = secuencias[0].diasAplicacion;

      // Recorrer todas las fechas del rango
      while (indiceFecha < rangoFechas.length) {
        const fecha = rangoFechas[indiceFecha];
        const secuenciaActual = secuencias[indiceSecuencia];

        // Asignar turno de la secuencia actual
        nuevasAsignaciones[empleado.id][fecha] = secuenciaActual.turnoId;

        diasRestantesEnSecuencia--;
        indiceFecha++;

        // Si se completaron los días de esta secuencia, pasar a la siguiente
        if (diasRestantesEnSecuencia === 0) {
          indiceSecuencia = (indiceSecuencia + 1) % secuencias.length;
          diasRestantesEnSecuencia = secuencias[indiceSecuencia].diasAplicacion;
        }
      }
    });

    setAsignaciones(nuevasAsignaciones);
    toast.success('Planificación generada', {
      description: `Se asignaron turnos a ${empleadosFiltrados.length} empleado(s).`
    });
  };

  // Guardar planificación
  const guardarPlanificacion = () => {
    toast.success('Planificación guardada', {
      description: 'Los turnos han sido guardados exitosamente.'
    });
  };

  // Ciclar turno al hacer clic en la celda
  const ciclarTurno = (empleadoId: string, fecha: string) => {
    const turnoActual = asignaciones[empleadoId]?.[fecha];
    const indiceActual = turnoActual ? ORDEN_TURNOS.indexOf(turnoActual) : -1;
    const nuevoIndice = (indiceActual + 1) % ORDEN_TURNOS.length;
    const nuevoTurno = ORDEN_TURNOS[nuevoIndice] as keyof typeof TURNOS_CONFIG;

    setAsignaciones(prev => ({
      ...prev,
      [empleadoId]: {
        ...(prev[empleadoId] || {}),
        [fecha]: nuevoTurno
      }
    }));
  };

  // Obtener turno asignado
  const obtenerTurno = (empleadoId: string, fecha: string) => {
    return asignaciones[empleadoId]?.[fecha] || null;
  };

  // Calcular total de días por secuencia
  const totalDiasSecuencia = secuencias.reduce((sum, s) => sum + s.diasAplicacion, 0);

  return (
    <div className="space-y-6">
      {/* Sección Superior: Criterios y Secuencia */}
      <div className="grid grid-cols-2 gap-6">
        {/* Criterios de Búsqueda */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Criterios de Búsqueda</CardTitle>
            <CardDescription>Seleccione los filtros para buscar empleados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Empresa</Label>
                  <Select value={empresa} onValueChange={setEmpresa}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="titanium">Titanium Corp</SelectItem>
                      <SelectItem value="otras">Otras</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Localidad</Label>
                  <Select value={localidad} onValueChange={setLocalidad}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="guayaquil">Guayaquil</SelectItem>
                      <SelectItem value="quito">Quito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Departamento</Label>
                  <Select value={departamento} onValueChange={setDepartamento}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="produccion">Producción</SelectItem>
                      <SelectItem value="calidad">Calidad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Área</Label>
                  <Select value={area} onValueChange={setArea}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="produccion">Producción</SelectItem>
                      <SelectItem value="calidad">Calidad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Centro de Costos</Label>
                  <Select value={centroCostos} onValueChange={setCentroCostos}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="cc1">CC-001</SelectItem>
                      <SelectItem value="cc2">CC-002</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Rol de Pago</Label>
                  <Select value={rolPago} onValueChange={setRolPago}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="quincenal">Quincenal</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Grupo</Label>
                  <Select value={grupo} onValueChange={setGrupo}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="grupo a">Grupo A</SelectItem>
                      <SelectItem value="grupo b">Grupo B</SelectItem>
                      <SelectItem value="grupo c">Grupo C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Fecha Inicio</Label>
                  <Input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Fecha Fin</Label>
                  <Input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              <Button className="w-full bg-[#0074D9] hover:bg-[#0056A0]" onClick={buscarEmpleados}>
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Secuencia de Planificación */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Secuencia de Planificación</CardTitle>
            <CardDescription>Configure la secuencia de turnos a aplicar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Lista de secuencias */}
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {secuencias.map((secuencia, index) => {
                  const IconoTurno = TURNOS_CONFIG[secuencia.turnoId].icon;
                  return (
                    <div key={secuencia.id} className="flex items-center gap-3 p-2 border rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2 flex-1">
                        <div 
                          className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" 
                          style={{ 
                            backgroundColor: TURNOS_CONFIG[secuencia.turnoId].bgColor
                          }}
                        >
                          <IconoTurno 
                            className="w-4 h-4" 
                            style={{ color: TURNOS_CONFIG[secuencia.turnoId].color }}
                          />
                        </div>
                        <Select
                          value={secuencia.turnoId}
                          onValueChange={(value) => actualizarSecuencia(secuencia.id, 'turnoId', value)}
                        >
                          <SelectTrigger className="h-8 flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(TURNOS_CONFIG).map(([key, config]) => {
                              const IconoConfig = config.icon;
                              return (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-center gap-2">
                                    <IconoConfig className="w-4 h-4" style={{ color: config.color }} />
                                    {config.name}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <Input
                        type="number"
                        min="1"
                        value={secuencia.diasAplicacion}
                        onChange={(e) => actualizarSecuencia(
                          secuencia.id, 
                          'diasAplicacion', 
                          Math.max(1, parseInt(e.target.value) || 1)
                        )}
                        className="h-8 w-16 text-center"
                      />

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => eliminarSecuencia(secuencia.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={agregarSecuencia}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Turno
              </Button>

              <Button
                className="w-full bg-[#0074D9] hover:bg-[#0056A0]"
                onClick={generarPlanificacion}
                disabled={!grillaMostrada}
              >
                <Play className="w-4 h-4 mr-2" />
                Generar Planificación
              </Button>

              <div className="pt-2 border-t text-xs text-muted-foreground">
                <p>Ciclo: {totalDiasSecuencia} días</p>
                <p>Periodo: {rangoFechas.length} días</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grilla de Planificación de Turnos */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Grilla de Planificación de Turnos
              </CardTitle>
              <CardDescription>Asignación de turnos por empleado y fecha (clic en celda para cambiar turno)</CardDescription>
            </div>
            {grillaMostrada && Object.keys(asignaciones).length > 0 && (
              <Button className="bg-[#0074D9] hover:bg-[#0056A0]" onClick={guardarPlanificacion}>
                <Save className="w-4 h-4 mr-2" />
                Guardar Planificación
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!grillaMostrada ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay empleados cargados</p>
              <p className="text-xs mt-1">Configure los filtros y haga clic en "Buscar"</p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left py-2 px-3 border-r font-medium min-w-[140px] sticky left-0 bg-muted/50 z-10">
                        Empleado
                      </th>
                      <th className="text-left py-2 px-3 border-r font-medium min-w-[80px]">
                        Grupo
                      </th>
                      {rangoFechas.map(fecha => (
                        <th key={fecha} className="text-center py-2 px-2 min-w-[70px] border-r font-medium">
                          <div className="text-[10px]">{obtenerDiaSemana(fecha)}</div>
                          <div className="text-xs">{new Date(fecha + 'T00:00:00').getDate()}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {empleadosFiltrados.map((empleado) => (
                      <tr key={empleado.id} className="border-b hover:bg-muted/20">
                        <td className="py-2 px-3 border-r text-xs font-medium sticky left-0 bg-background z-10">
                          {empleado.nombre}
                        </td>
                        <td className="py-2 px-3 border-r text-xs text-muted-foreground">
                          {empleado.grupo}
                        </td>
                        {rangoFechas.map(fecha => {
                          const turnoAsignado = obtenerTurno(empleado.id, fecha);
                          const configTurno = turnoAsignado ? TURNOS_CONFIG[turnoAsignado] : null;
                          const IconoTurno = configTurno?.icon;
                          
                          return (
                            <td key={fecha} className="p-1 border-r">
                              <button
                                className="w-full h-10 rounded flex items-center justify-center transition-all hover:opacity-80 cursor-pointer"
                                style={{
                                  backgroundColor: configTurno?.bgColor || '#F9FAFB',
                                }}
                                onClick={() => ciclarTurno(empleado.id, fecha)}
                                title={configTurno ? `${configTurno.name} - Clic para cambiar` : 'Clic para asignar turno'}
                              >
                                {IconoTurno ? (
                                  <IconoTurno 
                                    className="w-5 h-5" 
                                    style={{ color: configTurno.color }}
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Leyenda de Turnos */}
              <div className="mt-4 flex items-center gap-6 text-xs flex-wrap">
                <span className="font-medium">Leyenda de Turnos:</span>
                {Object.entries(TURNOS_CONFIG).map(([key, config]) => {
                  const IconoConfig = config.icon;
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: config.bgColor }}
                      >
                        <IconoConfig className="w-4 h-4" style={{ color: config.color }} />
                      </div>
                      <span>{config.name} - {config.horario}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
