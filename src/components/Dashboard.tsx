import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Users, Clock, AlertTriangle, CheckCircle, TrendingUp, Calendar, ArrowUp, ArrowDown, Activity, Bell, LogIn, FileText } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { demoPermisosProgra, demoJustificacionesReq, demoCambiosTurno } from './DemoData';

const attendanceData = [
  { day: 'Lun', presentes: 145, ausentes: 5, atrasos: 8 },
  { day: 'Mar', presentes: 148, ausentes: 2, atrasos: 5 },
  { day: 'Mié', presentes: 142, ausentes: 8, atrasos: 12 },
  { day: 'Jue', presentes: 147, ausentes: 3, atrasos: 6 },
  { day: 'Vie', presentes: 140, ausentes: 10, atrasos: 15 },
];

const shiftData = [
  { name: 'Diurno', value: 85, color: '#0074D9' },
  { name: 'Nocturno', value: 45, color: '#3498DB' },
  { name: 'Rotativo', value: 20, color: '#2ECC71' },
];

const overtimeData = [
  { department: 'Producción', hours: 120 },
  { department: 'Logística', hours: 85 },
  { department: 'Mantenimiento', hours: 95 },
  { department: 'Calidad', hours: 45 },
  { department: 'Administración', hours: 30 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'administrador';
  const isSupervisor = user?.role === 'supervisor';
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [liveEmployees, setLiveEmployees] = useState(isAdmin ? 150 : 32);
  const [liveAttendance, setLiveAttendance] = useState(isAdmin ? 94 : 97);

  // Simulación de tiempo en vivo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulación de datos en tiempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveEmployees(prev => prev + Math.floor(Math.random() * 3 - 1));
      setLiveAttendance(prev => {
        const change = Math.random() * 2 - 1;
        return Math.min(100, Math.max(90, prev + change));
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const recentNotifications = [
    { id: 1, type: 'success', message: 'Planificación semanal completada', time: 'Hace 2 horas', timestamp: '2025-11-09 16:30:00' },
    { id: 2, type: 'warning', message: '5 empleados pendientes de confirmación', time: 'Hace 3 horas', timestamp: '2025-11-09 15:30:00' },
    { id: 3, type: 'info', message: 'Nuevo turno nocturno configurado', time: 'Hace 5 horas', timestamp: '2025-11-09 13:30:00' },
    { id: 4, type: 'success', message: 'Reporte mensual generado', time: 'Ayer', timestamp: '2025-11-08 10:00:00' },
    { id: 5, type: 'warning', message: '3 solicitudes de permiso pendientes', time: 'Ayer', timestamp: '2025-11-08 09:15:00' },
    { id: 6, type: 'info', message: 'Sincronización con nómina completada', time: 'Hace 2 días', timestamp: '2025-11-07 18:00:00' },
  ];

  const recentClockings = [
    { id: 1, employee: 'Juan Pérez', cedula: '0912345678', type: 'Entrada', time: '07:58', date: '09/11/2025', location: 'Planta Guayaquil', status: 'A tiempo' },
    { id: 2, employee: 'María García', cedula: '0923456789', type: 'Salida', time: '17:05', date: '09/11/2025', location: 'Planta Guayaquil', status: 'Normal' },
    { id: 3, employee: 'Pedro López', cedula: '0934567890', type: 'Entrada', time: '08:15', date: '09/11/2025', location: 'Planta Quito', status: 'Atraso' },
    { id: 4, employee: 'Ana Martínez', cedula: '0945678901', type: 'Salida', time: '17:00', date: '09/11/2025', location: 'Oficina Central', status: 'Normal' },
    { id: 5, employee: 'Carlos Rodríguez', cedula: '0956789012', type: 'Entrada', time: '07:55', date: '09/11/2025', location: 'Planta Guayaquil', status: 'A tiempo' },
    { id: 6, employee: 'Sofía Ramírez', cedula: '0967890123', type: 'Entrada', time: '08:02', date: '09/11/2025', location: 'Planta Quito', status: 'A tiempo' },
    { id: 7, employee: 'Luis Torres', cedula: '0978901234', type: 'Salida', time: '16:50', date: '09/11/2025', location: 'Planta Guayaquil', status: 'Normal' },
    { id: 8, employee: 'Carmen Flores', cedula: '0989012345', type: 'Entrada', time: '08:20', date: '09/11/2025', location: 'Oficina Central', status: 'Atraso' },
  ];

  // Combinar todas las solicitudes recientes
  const allRequests = [
    ...demoPermisosProgra.slice(0, 3).map(p => ({ 
      ...p, 
      tipo: 'Permiso',
      fechaSolicitud: p.fechaSolicitud || '08/11/2025'
    })),
    ...demoJustificacionesReq.slice(0, 2).map(j => ({ 
      ...j, 
      tipo: 'Justificación',
      empleado: j.empleado,
      estado: j.estado,
      fechaSolicitud: j.fecha
    })),
    ...demoCambiosTurno.slice(0, 2).map(c => ({ 
      ...c, 
      tipo: 'Cambio de Turno',
      empleado: c.empleado,
      estado: c.estado,
      fechaSolicitud: c.fechaSolicitud || '07/11/2025'
    }))
  ].sort((a, b) => {
    // Ordenar por fecha más reciente
    const dateA = new Date(a.fechaSolicitud.split('/').reverse().join('-'));
    const dateB = new Date(b.fechaSolicitud.split('/').reverse().join('-'));
    return dateB.getTime() - dateA.getTime();
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-foreground">
            {user?.name?.split(' ')[0] || 'Usuario'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin 
              ? `Vista general de ${user?.company}` 
              : `Área de ${user?.area} - ${user?.company}`}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          <p className="capitalize">{formatDate(currentTime)}</p>
          <p className="text-right mt-1 flex items-center gap-2">
            <Activity className="w-4 h-4 text-success animate-pulse" />
            {formatTime(currentTime)}
          </p>
        </div>
      </div>

      {/* KPI Cards - Primera Fila - 4 Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary hover:shadow-lg transition-all duration-200">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardDescription className="text-xs">Horas Extra</CardDescription>
            <CardTitle className="text-3xl mt-1 text-foreground">{isAdmin ? '12' : '4'}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center gap-1 text-xs">
              <ArrowDown className="w-3 h-3 text-destructive" />
              <span className="text-destructive">9%</span>
              <span className="text-muted-foreground">vs mes anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive hover:shadow-lg transition-all duration-200">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardDescription className="text-xs">Ausencias</CardDescription>
            <CardTitle className="text-3xl mt-1 text-foreground">{isAdmin ? '0' : '0'}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center gap-1 text-xs">
              <ArrowDown className="w-3 h-3 text-success" />
              <span className="text-success">12%</span>
              <span className="text-muted-foreground">vs mes anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#9B59B6] hover:shadow-lg transition-all duration-200">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardDescription className="text-xs">Permisos</CardDescription>
            <CardTitle className="text-3xl mt-1 text-foreground">{isAdmin ? '2' : '1'}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center gap-1 text-xs">
              <ArrowUp className="w-3 h-3 text-success" />
              <span className="text-success">3%</span>
              <span className="text-muted-foreground">vs mes anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#E67E22] hover:shadow-lg transition-all duration-200">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardDescription className="text-xs">Atrasos</CardDescription>
            <CardTitle className="text-3xl mt-1 text-foreground">{isAdmin ? '3' : '1'}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center gap-1 text-xs">
              <ArrowUp className="w-3 h-3 text-destructive" />
              <span className="text-destructive">5%</span>
              <span className="text-muted-foreground">vs mes anterior</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segunda Fila - Gráficos y Actividad Reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencia de Asistencia */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tendencia de Asistencia</CardTitle>
            <CardDescription>Últimos 5 días</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Bar dataKey="presentes" fill="#0074D9" name="Presentes" />
                <Bar dataKey="ausentes" fill="#E74C3C" name="Ausentes" />
                <Bar dataKey="atrasos" fill="#F39C12" name="Atrasos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Actividad Reciente */}
        <Card className="border-l-4 border-l-info hover:shadow-lg transition-all duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-info" />
              <div>
                <CardTitle className="text-lg">Actividad Reciente</CardTitle>
                <CardDescription>Notificaciones y marcaciones en tiempo real</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="marcaciones" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-3">
                <TabsTrigger value="marcaciones" className="data-[state=active]:bg-[#0074D9] data-[state=active]:text-white text-xs">
                  Últimas Marcaciones
                </TabsTrigger>
                <TabsTrigger value="notificaciones" className="data-[state=active]:bg-[#0074D9] data-[state=active]:text-white text-xs">
                  Últimas Notificaciones
                </TabsTrigger>
                <TabsTrigger value="solicitudes" className="data-[state=active]:bg-[#0074D9] data-[state=active]:text-white text-xs">
                  Últimas Solicitudes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="marcaciones" className="space-y-2 h-[280px] overflow-y-auto">
                {recentClockings.slice(0, 8).map((clocking) => (
                  <div key={clocking.id} className="flex items-start gap-2 pb-2 border-b last:border-0">
                    <LogIn className={`w-4 h-4 mt-1 flex-shrink-0 ${
                      clocking.type === 'Entrada' ? 'text-success' : 'text-info'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{clocking.employee}</span>
                        <span className="text-muted-foreground"> - {clocking.type}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {clocking.time} - {clocking.location}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`flex-shrink-0 text-xs ${
                        clocking.status === 'A tiempo' ? 'bg-success/10 text-success border-success' :
                        clocking.status === 'Atraso' ? 'bg-warning/10 text-warning border-warning' :
                        'bg-info/10 text-info border-info'
                      }`}
                    >
                      {clocking.status}
                    </Badge>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="notificaciones" className="space-y-2 h-[280px] overflow-y-auto">
                {recentNotifications.slice(0, 8).map((notification) => (
                  <div key={notification.id} className="flex items-start gap-2 pb-2 border-b last:border-0">
                    <Bell className={`w-4 h-4 mt-1 flex-shrink-0 ${
                      notification.type === 'success' ? 'text-success' :
                      notification.type === 'warning' ? 'text-warning' : 'text-info'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                    </div>
                    <Badge variant="outline" className={`flex-shrink-0 text-xs ${
                      notification.type === 'success' ? 'bg-success/10 text-success border-success' :
                      notification.type === 'warning' ? 'bg-warning/10 text-warning border-warning' :
                      'bg-info/10 text-info border-info'
                    }`}>
                      {notification.type === 'warning' ? 'Atención' :
                       notification.type === 'success' ? 'Completado' : 'Info'}
                    </Badge>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="solicitudes" className="space-y-2 h-[280px] overflow-y-auto">
                {allRequests.slice(0, 8).map((request, index) => (
                  <div key={`${request.tipo}-${request.id || index}`} className="flex items-start gap-2 pb-2 border-b last:border-0">
                    <FileText className="w-4 h-4 mt-1 flex-shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{request.empleado}</span>
                        <span className="text-muted-foreground"> - {request.tipo}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {request.fechaSolicitud}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`flex-shrink-0 text-xs ${
                        request.estado === 'Aprobado' ? 'bg-success/10 text-success border-success' :
                        request.estado === 'Rechazado' ? 'bg-destructive/10 text-destructive border-destructive' :
                        'bg-warning/10 text-warning border-warning'
                      }`}
                    >
                      {request.estado}
                    </Badge>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Tercera Fila - Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shift Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribución de Turnos</CardTitle>
            <CardDescription>Personal por turno</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={shiftData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {shiftData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Overtime by Department */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Horas Extra por Departamento</CardTitle>
            <CardDescription>Mes actual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={overtimeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="department" type="category" className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="hours" fill="#2ECC71" name="Horas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}