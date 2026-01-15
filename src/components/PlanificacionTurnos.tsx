import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Calendar, 
  Settings, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  Flag,
  Sun,
  Sunset,
  Moon,
  Coffee,
  Umbrella,
  RefreshCcw,
  Filter
} from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { toast } from 'sonner@2.0.3';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
import { generarRangoFechas, obtenerDiaSemana, esFindeSemana, obtenerDiaDelMes, obtenerNombreMes } from './utils/dateUtils';

// Configuración de turnos 24/7
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
  L: { 
    name: 'Libre', 
    horario: '-', 
    color: '#9E9E9E', 
    bgColor: '#F5F5F5',
    icon: Coffee 
  },
  P: { 
    name: 'Permiso', 
    horario: '-', 
    color: '#FFA726', 
    bgColor: '#FFF8E1',
    icon: Umbrella 
  },
};

// Datos mock de empleados con clasificación
const EMPLEADOS_MOCK = [
  { id: 'E001', nombre: 'Juan Pérez', codigo: 'E001', area: 'Producción', grupo: 'Grupo A', tipoJornada: 'Rotativo' },
  { id: 'E002', nombre: 'María García', codigo: 'E002', area: 'Calidad', grupo: 'Grupo B', tipoJornada: 'Rotativo' },
  { id: 'E003', nombre: 'Carlos López', codigo: 'E003', area: 'Producción', grupo: 'Grupo A', tipoJornada: 'Rotativo' },
  { id: 'E004', nombre: 'Ana Martínez', codigo: 'E004', area: 'Producción', grupo: 'Grupo A', tipoJornada: 'Rotativo' },
  { id: 'E005', nombre: 'Pedro Rodríguez', codigo: 'E005', area: 'Producción', grupo: 'Grupo C', tipoJornada: 'Rotativo' },
  { id: 'E006', nombre: 'Laura Sánchez', codigo: 'E006', area: 'Mantenimiento', grupo: 'Grupo B', tipoJornada: 'Rotativo' },
  { id: 'E007', nombre: 'Diego Fernández', codigo: 'E007', area: 'Producción', grupo: 'Grupo A', tipoJornada: 'Rotativo' },
  { id: 'E008', nombre: 'Carmen Díaz', codigo: 'E008', area: 'Calidad', grupo: 'Grupo C', tipoJornada: 'Rotativo' },
  { id: 'E009', nombre: 'Roberto Silva', codigo: 'E009', area: 'Producción', grupo: 'Grupo B', tipoJornada: 'Rotativo' },
  { id: 'E010', nombre: 'Isabel Torres', codigo: 'E010', area: 'Logística', grupo: 'Grupo C', tipoJornada: 'Rotativo' },
  { id: 'E011', nombre: 'Luis Gómez', codigo: 'E011', area: 'Administración', grupo: null, tipoJornada: 'Fijo' },
  { id: 'E012', nombre: 'Patricia Ruiz', codigo: 'E012', area: 'RRHH', grupo: null, tipoJornada: 'Fijo' },
];

// Permisos programados mock
const PERMISOS_MOCK: {[key: string]: string[]} = {
  'E003': ['2025-12-10', '2025-12-11'],
  'E007': ['2025-12-15'],
};

// Feriados mock
const FERIADOS_MOCK = ['2025-12-25', '2026-01-01'];

// Sugerencias de IA mock
const SUGERENCIAS_MOCK = [
  {
    id: 1,
    tipo: 'fatiga',
    severidad: 'alta',
    empleado: 'E001',
    descripcion: 'Empleado E001 (Juan Pérez) tiene 5 días consecutivos de trabajo.',
    sugerencia: 'Cambiar turno del 12/12 a libre y reasignar a E008.',
    accion: { empleado: 'E001', fecha: '2025-12-12', cambio: 'L' }
  },
  {
    id: 2,
    tipo: 'descanso',
    severidad: 'media',
    empleado: 'E004',
    descripcion: 'Empleado E004 (Ana Martínez) no ha completado días libres consecutivos según esquema.',
    sugerencia: 'Convertir días 14/12 y 15/12 en libre.',
    accion: { empleado: 'E004', fecha: '2025-12-14', cambio: 'L' }
  },
  {
    id: 3,
    tipo: 'dotacion',
    severidad: 'alta',
    empleado: null,
    descripcion: 'Dotación incompleta en turno Noche del 10/12 (requiere 3, asignados 2).',
    sugerencia: 'Reasignar E005 o E006 al turno N.',
    accion: { empleado: 'E005', fecha: '2025-12-10', cambio: 'N' }
  },
];

// Alertas mock
const ALERTAS_MOCK = [
  { id: 1, tipo: 'dotacion', empleado: null, fecha: '2025-12-08', turno: 'N', mensaje: 'Falta 1 empleado en turno Noche' },
  { id: 2, tipo: 'fatiga', empleado: 'E002', fecha: '2025-12-13', turno: 'M', mensaje: 'Riesgo de superar días consecutivos configurados' },
  { id: 3, tipo: 'descanso', empleado: 'E009', fecha: null, turno: null, mensaje: 'Sin días libres consecutivos según esquema' },
];

export default function PlanificacionTurnosIA() {
  // Estados de configuración
  const [fechaInicio, setFechaInicio] = useState('2025-12-01');
  const [fechaFin, setFechaFin] = useState('2025-12-14');
  
  // Nueva configuración: Días trabajo / Días libres
  const [diasTrabajo, setDiasTrabajo] = useState(5);
  const [diasLibres, setDiasLibres] = useState(2);
  
  const [dotacionM, setDotacionM] = useState(3);
  const [dotacionT, setDotacionT] = useState(3);
  const [dotacionN, setDotacionN] = useState(3);
  
  // Filtros de empleados
  const [areaFiltro, setAreaFiltro] = useState('todas');
  const [grupoFiltro, setGrupoFiltro] = useState('todos');
  const [tipoJornadaFiltro, setTipoJornadaFiltro] = useState('Rotativo');
  
  // Reglas de IA
  const [evitarNaM, setEvitarNaM] = useState(true);
  const [priorizarEquidad, setPriorizarEquidad] = useState(true);
  const [equilibrarFeriados, setEquilibrarFeriados] = useState(true);
  const [permitirSwaps, setPermitirSwaps] = useState(true);
  
  // Estados de datos
  const [asignaciones, setAsignaciones] = useState<{[key: string]: {[key: string]: string}}>({});
  const [sugerencias] = useState(SUGERENCIAS_MOCK);
  const [alertas] = useState(ALERTAS_MOCK);
  const [vistaActual, setVistaActual] = useState<'empleados' | 'turnos'>('empleados');
  const [simulacionActiva, setSimulacionActiva] = useState(false);
  const [planificacionConfirmada, setPlanificacionConfirmada] = useState(false);

  const rangoFechas = generarRangoFechas(fechaInicio, fechaFin);

  // Filtrar empleados según criterios
  const empleadosFiltrados = EMPLEADOS_MOCK.filter(emp => {
    const matchArea = areaFiltro === 'todas' || emp.area === areaFiltro;
    const matchGrupo = grupoFiltro === 'todos' || emp.grupo === grupoFiltro;
    const matchTipo = emp.tipoJornada === tipoJornadaFiltro;
    return matchArea && matchGrupo && matchTipo;
  });

  // Obtener áreas y grupos únicos
  const areasUnicas = Array.from(new Set(EMPLEADOS_MOCK.filter(e => e.tipoJornada === 'Rotativo').map(e => e.area)));
  const gruposUnicos = Array.from(new Set(EMPLEADOS_MOCK.filter(e => e.tipoJornada === 'Rotativo' && e.grupo).map(e => e.grupo)));

  // Función para verificar si es feriado
  const esFeriado = (fecha: string) => {
    return FERIADOS_MOCK.includes(fecha);
  };

  // Función para simular planificación con IA - MEJORADA con esquema trabajo/libre
  const simularPlanificacion = () => {
    if (empleadosFiltrados.length === 0) {
      toast.error('No hay empleados para planificar', {
        description: 'Ajusta los filtros para incluir empleados.'
      });
      return;
    }

    const nuevasAsignaciones: {[key: string]: {[key: string]: string}} = {};
    
    // Inicializar asignaciones vacías
    empleadosFiltrados.forEach((emp) => {
      nuevasAsignaciones[emp.id] = {};
    });
    
    // Calcular distribución de turnos según días de trabajo
    // Objetivo: distribuir equitativamente entre M, T, N
    const calcularDistribucionTurnos = (diasTrabajo: number) => {
      const turnoPorDia = Math.floor(diasTrabajo / 3); // Días base por turno
      const diasExtra = diasTrabajo % 3; // Días sobrantes
      
      // Asignar en bloques de 2 días cuando sea posible
      const distribucion: ('M' | 'T' | 'N')[] = [];
      
      // Calcular cuántos días de cada turno
      let diasM = turnoPorDia;
      let diasT = turnoPorDia;
      let diasN = turnoPorDia;
      
      // Distribuir días extras equitativamente
      if (diasExtra >= 1) diasM++;
      if (diasExtra >= 2) diasT++;
      
      // Construir secuencia en bloques de 2 días
      // Patrón: M M T T N N (cuando hay 6 días)
      // Patrón: M M T T N (cuando hay 5 días)
      // Patrón: M M T T (cuando hay 4 días)
      
      while (diasM > 0) {
        distribucion.push('M');
        diasM--;
      }
      while (diasT > 0) {
        distribucion.push('T');
        diasT--;
      }
      while (diasN > 0) {
        distribucion.push('N');
        diasN--;
      }
      
      return distribucion;
    };
    
    // Generar patrón completo de ciclo (trabajo + libre)
    const generarPatronCiclo = () => {
      const patron: ('M' | 'T' | 'N' | 'L')[] = [];
      
      // Agregar días de trabajo
      const distribucionTrabajo = calcularDistribucionTurnos(diasTrabajo);
      patron.push(...distribucionTrabajo);
      
      // Agregar días libres
      for (let i = 0; i < diasLibres; i++) {
        patron.push('L');
      }
      
      return patron;
    };
    
    const patronCiclo = generarPatronCiclo();
    const longitudCiclo = patronCiclo.length;
    
    // Para cada empleado, aplicar el patrón con offset diferente para distribuir cobertura
    empleadosFiltrados.forEach((emp, empIdx) => {
      // Offset inicial para que no todos empiecen en el mismo turno
      // Distribuir empleados entre las diferentes fases del ciclo
      const offsetInicial = Math.floor((empIdx * longitudCiclo) / empleadosFiltrados.length);
      
      rangoFechas.forEach((fecha, idx) => {
        // Verificar permisos programados
        if (PERMISOS_MOCK[emp.id]?.includes(fecha)) {
          nuevasAsignaciones[emp.id][fecha] = 'P';
          return;
        }
        
        // Calcular posición en el ciclo
        const posicionEnCiclo = (idx + offsetInicial) % longitudCiclo;
        const turnoAsignado = patronCiclo[posicionEnCiclo];
        
        // Verificar regla N -> M (evitar si está activada)
        if (idx > 0 && evitarNaM) {
          const turnoAnterior = nuevasAsignaciones[emp.id][rangoFechas[idx - 1]];
          if (turnoAnterior === 'N' && turnoAsignado === 'M') {
            // Si viene de Noche y toca Mañana, forzar a Libre
            nuevasAsignaciones[emp.id][fecha] = 'L';
            return;
          }
        }
        
        nuevasAsignaciones[emp.id][fecha] = turnoAsignado;
      });
    });
    
    setAsignaciones(nuevasAsignaciones);
    setSimulacionActiva(true);
    
    // Calcular porcentajes para el mensaje
    const distribucionTrabajo = calcularDistribucionTurnos(diasTrabajo);
    const diasM = distribucionTrabajo.filter(t => t === 'M').length;
    const diasT = distribucionTrabajo.filter(t => t === 'T').length;
    const diasN = distribucionTrabajo.filter(t => t === 'N').length;
    
    toast.success('Simulación completada', {
      description: `Esquema ${diasTrabajo}/${diasLibres}: ${diasM}M + ${diasT}T + ${diasN}N + ${diasLibres}L para ${empleadosFiltrados.length} empleados.`
    });
  };

  // Función para confirmar planificación
  const confirmarPlanificacion = () => {
    setPlanificacionConfirmada(true);
    setSimulacionActiva(false);
    toast.success('Planificación confirmada', {
      description: 'La planificación ha sido guardada exitosamente.'
    });
  };

  // Función para reiniciar planificación
  const reiniciarPlanificacion = () => {
    setAsignaciones({});
    setSimulacionActiva(false);
    setPlanificacionConfirmada(false);
    toast.info('Planificación reiniciada');
  };

  // Función para cambiar asignación manual
  const cambiarAsignacion = (empleadoId: string, fecha: string, turno: string) => {
    if (planificacionConfirmada) {
      toast.warning('Planificación confirmada', {
        description: 'Debes reiniciar para hacer cambios.'
      });
      return;
    }
    
    setAsignaciones(prev => ({
      ...prev,
      [empleadoId]: {
        ...prev[empleadoId],
        [fecha]: turno
      }
    }));
  };

  // Función para aplicar sugerencia
  const aplicarSugerencia = (sugerencia: any) => {
    if (sugerencia.accion) {
      cambiarAsignacion(
        sugerencia.accion.empleado,
        sugerencia.accion.fecha,
        sugerencia.accion.cambio
      );
      toast.success('Sugerencia aplicada');
    }
  };

  // Calcular estadísticas
  const calcularEstadisticas = () => {
    let totalM = 0, totalT = 0, totalN = 0, totalL = 0, totalP = 0;
    
    Object.values(asignaciones).forEach(empAsignaciones => {
      Object.values(empAsignaciones).forEach(turno => {
        if (turno === 'M') totalM++;
        if (turno === 'T') totalT++;
        if (turno === 'N') totalN++;
        if (turno === 'L') totalL++;
        if (turno === 'P') totalP++;
      });
    });
    
    return [
      { name: 'Mañana', value: totalM, color: TURNOS_CONFIG.M.color },
      { name: 'Tarde', value: totalT, color: TURNOS_CONFIG.T.color },
      { name: 'Noche', value: totalN, color: TURNOS_CONFIG.N.color },
      { name: 'Libre', value: totalL, color: TURNOS_CONFIG.L.color },
      { name: 'Permiso', value: totalP, color: TURNOS_CONFIG.P.color },
    ];
  };

  // Calcular dotación por día y turno
  const calcularDotacionPorDia = () => {
    const dotacion: {[key: string]: {M: number, T: number, N: number}} = {};
    
    rangoFechas.forEach(fecha => {
      dotacion[fecha] = { M: 0, T: 0, N: 0 };
      
      empleadosFiltrados.forEach(emp => {
        const turno = asignaciones[emp.id]?.[fecha];
        if (turno === 'M' || turno === 'T' || turno === 'N') {
          dotacion[fecha][turno as 'M' | 'T' | 'N']++;
        }
      });
    });
    
    return dotacion;
  };

  const dotacionPorDia = calcularDotacionPorDia();

  // Verificar cumplimiento de esquema trabajo/libre para cada empleado
  const verificarEsquemaTrabajo = (empleadoId: string) => {
    const asignacionesEmp = asignaciones[empleadoId];
    if (!asignacionesEmp) return 'Pendiente';
    
    let diasConsecutivosTrabajo = 0;
    let diasConsecutivosLibre = 0;
    let cumpleEsquema = true;
    
    rangoFechas.forEach(fecha => {
      const turno = asignacionesEmp[fecha];
      if (turno === 'M' || turno === 'T' || turno === 'N') {
        diasConsecutivosTrabajo++;
        if (diasConsecutivosLibre > 0 && diasConsecutivosLibre < diasLibres) {
          cumpleEsquema = false;
        }
        diasConsecutivosLibre = 0;
        if (diasConsecutivosTrabajo > diasTrabajo) {
          cumpleEsquema = false;
        }
      } else if (turno === 'L') {
        diasConsecutivosLibre++;
        if (diasConsecutivosTrabajo > 0 && diasConsecutivosTrabajo < diasTrabajo) {
          cumpleEsquema = false;
        }
        diasConsecutivosTrabajo = 0;
        if (diasConsecutivosLibre > diasLibres) {
          cumpleEsquema = false;
        }
      } else {
        // Permiso - reinicia contadores
        diasConsecutivosTrabajo = 0;
        diasConsecutivosLibre = 0;
      }
    });
    
    return cumpleEsquema ? 'Cumple' : 'No cumple';
  };

  return (
    <TooltipProvider>
      <div className="h-[calc(100vh-16rem)] flex gap-4">
        {/* Columna Izquierda - Configuración */}
        <div className="w-80 flex-shrink-0">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4">
              {/* Filtros de Empleados */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Filter className="w-4 h-4" />
                    Filtros de Empleados
                  </CardTitle>
                  <CardDescription className="text-xs">Solo empleados de turnos rotativos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Área</Label>
                    <Select value={areaFiltro} onValueChange={setAreaFiltro} disabled={simulacionActiva || planificacionConfirmada}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas las áreas</SelectItem>
                        {areasUnicas.map(area => (
                          <SelectItem key={area} value={area}>{area}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Grupo de Trabajo</Label>
                    <Select value={grupoFiltro} onValueChange={setGrupoFiltro} disabled={simulacionActiva || planificacionConfirmada}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los grupos</SelectItem>
                        {gruposUnicos.map(grupo => (
                          <SelectItem key={grupo!} value={grupo!}>{grupo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-2 border-t text-xs">
                    <p className="text-muted-foreground">
                      Empleados seleccionados: <strong>{empleadosFiltrados.length}</strong>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Parámetros de Planificación */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Settings className="w-4 h-4" />
                    Parámetros
                  </CardTitle>
                  <CardDescription className="text-xs">Configuración de planificación</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fecha-inicio" className="text-xs">Fecha Inicio</Label>
                    <Input
                      id="fecha-inicio"
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      disabled={simulacionActiva || planificacionConfirmada}
                      className="h-8"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fecha-fin" className="text-xs">Fecha Fin</Label>
                    <Input
                      id="fecha-fin"
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      disabled={simulacionActiva || planificacionConfirmada}
                      className="h-8"
                    />
                  </div>
                  
                  <div className="pt-2 border-t">
                    <Label className="text-xs mb-2 block">Esquema Trabajo/Libre</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="dias-trabajo" className="text-[10px] text-muted-foreground">Días Trabajo</Label>
                        <Input
                          id="dias-trabajo"
                          type="number"
                          min="1"
                          max="10"
                          value={diasTrabajo}
                          onChange={(e) => setDiasTrabajo(parseInt(e.target.value))}
                          disabled={simulacionActiva || planificacionConfirmada}
                          className="h-8 text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="dias-libres" className="text-[10px] text-muted-foreground">Días Libres</Label>
                        <Input
                          id="dias-libres"
                          type="number"
                          min="1"
                          max="7"
                          value={diasLibres}
                          onChange={(e) => setDiasLibres(parseInt(e.target.value))}
                          disabled={simulacionActiva || planificacionConfirmada}
                          className="h-8 text-center"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Esquema actual: <strong>{diasTrabajo}/{diasLibres}</strong>
                    </p>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    size="sm"
                    onClick={() => {
                      setDiasTrabajo(5);
                      setDiasLibres(2);
                      setDotacionM(3);
                      setDotacionT(3);
                      setDotacionN(3);
                    }}
                  >
                    Restablecer por defecto (5/2)
                  </Button>
                </CardContent>
              </Card>

              {/* Dotación Requerida */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" />
                    Dotación Requerida
                  </CardTitle>
                  <CardDescription className="text-xs">Empleados por turno (mín. 1)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs">
                      <Sun className="w-3 h-3" style={{ color: TURNOS_CONFIG.M.color }} />
                      Turno Mañana
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={dotacionM}
                      onChange={(e) => setDotacionM(Math.max(1, parseInt(e.target.value)))}
                      disabled={simulacionActiva || planificacionConfirmada}
                      className="h-8"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs">
                      <Sunset className="w-3 h-3" style={{ color: TURNOS_CONFIG.T.color }} />
                      Turno Tarde
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={dotacionT}
                      onChange={(e) => setDotacionT(Math.max(1, parseInt(e.target.value)))}
                      disabled={simulacionActiva || planificacionConfirmada}
                      className="h-8"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs">
                      <Moon className="w-3 h-3" style={{ color: TURNOS_CONFIG.N.color }} />
                      Turno Noche
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={dotacionN}
                      onChange={(e) => setDotacionN(Math.max(1, parseInt(e.target.value)))}
                      disabled={simulacionActiva || planificacionConfirmada}
                      className="h-8"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Reglas de IA */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4" />
                    Reglas de IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="evitar-n-m" className="text-xs cursor-pointer">
                      Evitar turno N → M
                    </Label>
                    <Switch
                      id="evitar-n-m"
                      checked={evitarNaM}
                      onCheckedChange={setEvitarNaM}
                      disabled={simulacionActiva || planificacionConfirmada}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="equidad" className="text-xs cursor-pointer">
                      Priorizar equidad en horas
                    </Label>
                    <Switch
                      id="equidad"
                      checked={priorizarEquidad}
                      onCheckedChange={setPriorizarEquidad}
                      disabled={simulacionActiva || planificacionConfirmada}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="feriados" className="text-xs cursor-pointer">
                      Equilibrar feriados
                    </Label>
                    <Switch
                      id="feriados"
                      checked={equilibrarFeriados}
                      onCheckedChange={setEquilibrarFeriados}
                      disabled={simulacionActiva || planificacionConfirmada}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="swaps" className="text-xs cursor-pointer">
                      Permitir swaps
                    </Label>
                    <Switch
                      id="swaps"
                      checked={permitirSwaps}
                      onCheckedChange={setPermitirSwaps}
                      disabled={simulacionActiva || planificacionConfirmada}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Acciones */}
              <div className="space-y-2">
                {!simulacionActiva && !planificacionConfirmada && (
                  <Button 
                    className="w-full" 
                    onClick={simularPlanificacion}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Simular con IA
                  </Button>
                )}
                
                {simulacionActiva && !planificacionConfirmada && (
                  <>
                    <Button 
                      className="w-full bg-[#2ECC71] hover:bg-[#27AE60]" 
                      onClick={confirmarPlanificacion}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Confirmar Planificación
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={reiniciarPlanificacion}
                    >
                      <RefreshCcw className="w-4 h-4 mr-2" />
                      Reiniciar
                    </Button>
                  </>
                )}
                
                {planificacionConfirmada && (
                  <div className="space-y-2">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                      <p className="text-sm text-green-700">Planificación Confirmada</p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={reiniciarPlanificacion}
                    >
                      <RefreshCcw className="w-4 h-4 mr-2" />
                      Nueva Planificación
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Columna Central - Grid de Planificación */}
        <div className="flex-1 flex flex-col min-w-0">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="w-4 h-4" />
                    Planificación de Turnos 24/7
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {simulacionActiva && !planificacionConfirmada && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Simulación - No confirmada
                      </Badge>
                    )}
                    {planificacionConfirmada && (
                      <Badge className="mt-1 bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Confirmada
                      </Badge>
                    )}
                  </CardDescription>
                </div>
                
                <Tabs value={vistaActual} onValueChange={(v) => setVistaActual(v as any)}>
                  <TabsList>
                    <TabsTrigger value="empleados" className="text-xs">Empleado x Día</TabsTrigger>
                    <TabsTrigger value="turnos" className="text-xs">Turnos por Día</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-auto p-0">
              {vistaActual === 'empleados' ? (
                // Vista Empleado x Día con scroll horizontal
                <div className="p-2">
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-muted/50 sticky top-0 z-10">
                        <tr>
                          <th className="text-left py-1.5 px-2 border-r bg-background sticky left-0 z-20 min-w-[130px]">
                            <div className="text-[11px]">Empleado</div>
                            <div className="text-[9px] text-muted-foreground">Estado {diasTrabajo}/{diasLibres}</div>
                          </th>
                          {rangoFechas.map(fecha => (
                            <th key={fecha} className="text-center py-1 px-1 min-w-[65px] border-r">
                              <div className="text-[9px]">{obtenerDiaSemana(fecha)}</div>
                              <div className="text-[10px]">{obtenerDiaDelMes(fecha)}</div>
                              {esFeriado(fecha) && (
                                <Flag className="w-2.5 h-2.5 text-red-500 mx-auto" />
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {empleadosFiltrados.map((emp) => {
                          const estadoEsquema = verificarEsquemaTrabajo(emp.id);
                          return (
                            <tr key={emp.id} className="border-b hover:bg-muted/30">
                              <td className="py-1.5 px-2 border-r bg-background sticky left-0 z-10">
                                <div className="text-[11px] font-medium">{emp.codigo} - {emp.nombre}</div>
                                <Badge 
                                  variant={estadoEsquema === 'Cumple' ? 'default' : estadoEsquema === 'Pendiente' ? 'outline' : 'destructive'} 
                                  className="text-[8px] px-1 py-0 mt-0.5"
                                >
                                  {estadoEsquema}
                                </Badge>
                              </td>
                              {rangoFechas.map(fecha => {
                                const turno = asignaciones[emp.id]?.[fecha] || '';
                                const config = turno ? TURNOS_CONFIG[turno as keyof typeof TURNOS_CONFIG] : null;
                                const Icon = config?.icon;
                                
                                return (
                                  <td key={fecha} className="p-0.5 border-r">
                                    {Object.keys(asignaciones).length > 0 ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            className="w-full h-8 rounded flex items-center justify-center transition-colors hover:opacity-80"
                                            style={{
                                              backgroundColor: config?.bgColor || '#F9FAFB',
                                              color: config?.color || '#9CA3AF'
                                            }}
                                            onClick={() => {
                                              const opciones = ['M', 'T', 'N', 'L', 'P'];
                                              const indiceActual = opciones.indexOf(turno);
                                              const siguienteIndice = (indiceActual + 1) % opciones.length;
                                              cambiarAsignacion(emp.id, fecha, opciones[siguienteIndice]);
                                            }}
                                          >
                                            {Icon && <Icon className="w-3 h-3" />}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs">{config?.name || 'Sin asignar'}</p>
                                          <p className="text-[10px] text-muted-foreground">{config?.horario}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <div className="w-full h-8 rounded bg-gray-50"></div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Leyenda compacta */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(TURNOS_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <div key={key} className="flex items-center gap-1">
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center"
                            style={{ backgroundColor: config.bgColor, color: config.color }}
                          >
                            <Icon className="w-2.5 h-2.5" />
                          </div>
                          <span className="text-[10px]">{config.name} - {config.horario}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                // Vista Turnos por Día
                <div className="p-2">
                  <div className="border rounded-lg overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left py-2 px-2 border-r">Fecha</th>
                          <th className="text-center py-2 px-2 border-r">
                            <div className="flex items-center justify-center gap-1">
                              <Sun className="w-3 h-3" style={{ color: TURNOS_CONFIG.M.color }} />
                              <span className="text-[10px]">Mañana</span>
                            </div>
                          </th>
                          <th className="text-center py-2 px-2 border-r">
                            <div className="flex items-center justify-center gap-1">
                              <Sunset className="w-3 h-3" style={{ color: TURNOS_CONFIG.T.color }} />
                              <span className="text-[10px]">Tarde</span>
                            </div>
                          </th>
                          <th className="text-center py-2 px-2">
                            <div className="flex items-center justify-center gap-1">
                              <Moon className="w-3 h-3" style={{ color: TURNOS_CONFIG.N.color }} />
                              <span className="text-[10px]">Noche</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rangoFechas.map(fecha => {
                          const dotacion = dotacionPorDia[fecha];
                          
                          return (
                            <tr key={fecha} className="border-b hover:bg-muted/30">
                              <td className="py-1.5 px-2 border-r">
                                <div className="flex items-center gap-1">
                                  <div>
                                    <div className="text-[10px]">{obtenerDiaSemana(fecha)} {obtenerDiaDelMes(fecha)}</div>
                                    <div className="text-[9px] text-muted-foreground">
                                      {obtenerNombreMes(fecha)}
                                    </div>
                                  </div>
                                  {esFeriado(fecha) && <Flag className="w-3 h-3 text-red-500" />}
                                </div>
                              </td>
                              {['M', 'T', 'N'].map(turno => {
                                const asignados = dotacion?.[turno as 'M' | 'T' | 'N'] || 0;
                                const requeridos = turno === 'M' ? dotacionM : turno === 'T' ? dotacionT : dotacionN;
                                const completo = asignados >= requeridos;
                                const excedido = asignados > requeridos;
                                
                                const empAsignados = empleadosFiltrados
                                  .filter(emp => asignaciones[emp.id]?.[fecha] === turno)
                                  .map(emp => emp.codigo);
                                
                                return (
                                  <td key={turno} className="py-1.5 px-2 border-r text-center">
                                    <div className="flex flex-col items-center gap-0.5">
                                      <div className="flex items-center gap-1">
                                        <span className="text-sm">{asignados}</span>
                                        <span className="text-[9px] text-muted-foreground">/ {requeridos}</span>
                                        {completo && !excedido && (
                                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                                        )}
                                        {!completo && (
                                          <AlertTriangle className="w-3 h-3 text-orange-600" />
                                        )}
                                        {excedido && (
                                          <AlertCircle className="w-3 h-3 text-blue-600" />
                                        )}
                                      </div>
                                      {empAsignados.length > 0 && (
                                        <div className="text-[9px] text-muted-foreground">
                                          {empAsignados.join(', ')}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha - IA, Alertas y Resumen */}
        <div className="w-80 flex-shrink-0">
          <ScrollArea className="h-full pl-4">
            <div className="space-y-4">
              {/* Sugerencias de IA */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Lightbulb className="w-4 h-4" />
                    Sugerencias de IA
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {sugerencias.length} recomendaciones
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {simulacionActiva || planificacionConfirmada ? (
                    sugerencias.map(sug => (
                      <div
                        key={sug.id}
                        className={`p-2 rounded-lg border text-[10px] ${
                          sug.severidad === 'alta' 
                            ? 'bg-red-50 border-red-200' 
                            : sug.severidad === 'media'
                            ? 'bg-orange-50 border-orange-200'
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-start gap-1.5 mb-1.5">
                          {sug.tipo === 'fatiga' && <AlertTriangle className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" />}
                          {sug.tipo === 'descanso' && <Coffee className="w-3 h-3 text-orange-600 mt-0.5 flex-shrink-0" />}
                          {sug.tipo === 'dotacion' && <Users className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />}
                          <div className="flex-1">
                            <p className="mb-1">{sug.descripcion}</p>
                            <p className="text-muted-foreground mb-1.5">
                              <strong>Sugerencia:</strong> {sug.sugerencia}
                            </p>
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[9px] px-2"
                                onClick={() => aplicarSugerencia(sug)}
                                disabled={planificacionConfirmada}
                              >
                                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                                Aplicar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[9px] px-2"
                              >
                                <XCircle className="w-2.5 h-2.5 mr-0.5" />
                                Ignorar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-xs text-muted-foreground py-4">
                      Ejecuta una simulación para ver sugerencias
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Alertas de Planificación */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    Alertas
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {alertas.length} alertas activas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {simulacionActiva || planificacionConfirmada ? (
                    alertas.map(alerta => (
                      <div
                        key={alerta.id}
                        className="p-1.5 rounded-lg bg-yellow-50 border border-yellow-200 text-[10px]"
                      >
                        <div className="flex items-start gap-1.5">
                          <AlertTriangle className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p>{alerta.mensaje}</p>
                            {alerta.empleado && (
                              <p className="text-muted-foreground mt-0.5">
                                Empleado: {alerta.empleado}
                              </p>
                            )}
                            {alerta.fecha && (
                              <p className="text-muted-foreground">
                                Fecha: {new Date(alerta.fecha).toLocaleDateString('es-ES')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-xs text-muted-foreground py-4">
                      No hay alertas activas
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resumen del Periodo */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    Resumen del Periodo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {simulacionActiva || planificacionConfirmada ? (
                    <>
                      <div>
                        <p className="text-xs mb-2">Distribución de Turnos</p>
                        <ResponsiveContainer width="100%" height={130}>
                          <PieChart>
                            <Pie
                              data={calcularEstadisticas()}
                              cx="50%"
                              cy="50%"
                              innerRadius={25}
                              outerRadius={45}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {calcularEstadisticas().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Legend 
                              iconType="circle" 
                              iconSize={6}
                              formatter={(value) => <span className="text-[9px]">{value}</span>}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Esquema:</span>
                          <span>{diasTrabajo}/{diasLibres}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Total empleados:</span>
                          <span>{empleadosFiltrados.length}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Días planificados:</span>
                          <span>{rangoFechas.length}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Turnos asignados:</span>
                          <span>
                            {calcularEstadisticas().reduce((acc, curr) => acc + curr.value, 0)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-xs text-muted-foreground py-4">
                      Ejecuta una simulación para ver el resumen
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>
      </div>
    </TooltipProvider>
  );
}