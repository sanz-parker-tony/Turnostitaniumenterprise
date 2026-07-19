/**
 * SystemStatusDashboard.tsx - Turnos Titanium Enterprise
 * Pantalla de bienvenida On-Premise: Estado de configuración del sistema
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { formatClientTime24, formatStandardDate } from '@/utils/date-time';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  Building2, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Circle,
  ChevronRight,
  Database,
  Settings,
  FileText,
  Calendar,
  Shield,
  Activity
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface ConfigItem {
  id: string;
  label: string;
  status: 'complete' | 'pending' | 'critical';
  description: string;
  action: string;
  route?: string;
}

interface RecommendedAction {
  id: string;
  title: string;
  description: string;
  icon: any;
  route?: string;
  priority: 'high' | 'medium' | 'low';
}

export default function SystemStatusDashboard() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Simulación del estado de configuración
  // TODO: Reemplazar con datos reales del backend
  const configurationItems: ConfigItem[] = [
    {
      id: 'empresa',
      label: 'Empresa configurada',
      status: 'complete',
      description: 'Datos fiscales y corporativos completos',
      action: 'Revisar',
      route: '/configuracion/empresa'
    },
    {
      id: 'estructura',
      label: 'Estructura organizacional básica',
      status: 'complete',
      description: '3 localidades, 8 departamentos, 12 áreas',
      action: 'Gestionar',
      route: '/estructura'
    },
    {
      id: 'usuarios',
      label: 'Usuarios administradores',
      status: 'pending',
      description: '2 de 5 usuarios recomendados',
      action: 'Configurar',
      route: '/usuarios'
    },
    {
      id: 'empleados',
      label: 'Empleados cargados',
      status: 'critical',
      description: 'Sin datos. Requerido para operación',
      action: 'Cargar',
      route: '/empleados'
    },
    {
      id: 'turnos',
      label: 'Turnos definidos',
      status: 'pending',
      description: '1 turno configurado',
      action: 'Definir',
      route: '/turnos'
    },
    {
      id: 'dispositivos',
      label: 'Dispositivos registrados',
      status: 'pending',
      description: '0 dispositivos de marcación',
      action: 'Registrar',
      route: '/dispositivos'
    }
  ];

  const recommendedActions: RecommendedAction[] = [
    {
      id: 'import-employees',
      title: 'Cargar empleados desde archivo',
      description: 'Importar datos de nómina (CSV/XLSX)',
      icon: FileText,
      route: '/empleados/importar',
      priority: 'high'
    },
    {
      id: 'define-shifts',
      title: 'Definir turnos base',
      description: 'Configurar horarios de trabajo estándar',
      icon: Clock,
      route: '/turnos/nuevo',
      priority: 'high'
    },
    {
      id: 'configure-holidays',
      title: 'Configurar feriados',
      description: 'Calendario de días no laborables',
      icon: Calendar,
      route: '/configuracion/feriados',
      priority: 'medium'
    },
    {
      id: 'register-devices',
      title: 'Registrar dispositivos de marcación',
      description: 'Relojes biométricos o terminales',
      icon: Settings,
      route: '/dispositivos/nuevo',
      priority: 'medium'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return formatClientTime24(date);
  };

  const formatDate = (date: Date) => {
    return formatStandardDate(date);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'pending':
        return <Circle className="w-5 h-5 text-warning" />;
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge variant="outline" className="bg-success/10 text-success border-success">Completo</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning">Pendiente</Badge>;
      case 'critical':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive">Crítico</Badge>;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-destructive';
      case 'medium':
        return 'border-l-warning';
      case 'low':
        return 'border-l-primary';
      default:
        return 'border-l-muted';
    }
  };

  const completeCount = configurationItems.filter(item => item.status === 'complete').length;
  const totalCount = configurationItems.length;
  const completionPercentage = Math.round((completeCount / totalCount) * 100);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Sobrio y Corporativo */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Turnos Titanium
              </h1>
              <p className="text-sm text-muted-foreground">
                Plataforma de gestión de asistencia y turnos
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span>{user?.company || 'Sistema'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>On-Premise</span>
            </div>
          </div>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p className="capitalize">{formatDate(currentTime)}</p>
          <p className="flex items-center gap-2 mt-1 justify-end font-mono text-base">
            <Activity className="w-4 h-4 text-success" />
            {formatTime(currentTime)}
          </p>
        </div>
      </div>

      {/* Bloque Central: Estado de Configuración del Sistema */}
      <Card className="border-2">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">Estado de configuración del sistema</CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {completeCount} de {totalCount} completados
              </span>
              <Badge variant="outline" className="font-mono">
                {completionPercentage}%
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {configurationItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(item.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">
                      {item.label}
                    </p>
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0 text-primary hover:text-primary"
                >
                  {item.action}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bloque Secundario: Acciones Recomendadas */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg font-medium">Acciones recomendadas para comenzar</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <Card
                  key={action.id}
                  className={`border-l-4 ${getPriorityColor(action.priority)} hover:shadow-md transition-all cursor-pointer`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <IconComponent className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground mb-1">
                          {action.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Información del Sistema (Footer Discreto) */}
      <div className="pt-4 border-t">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Versión 2.5.1</span>
            <span>•</span>
            <span>Instalación: PROD-001</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-success" />
              Sistema operativo
            </span>
          </div>
          <div>
            Última sincronización: {formatTime(currentTime)}
          </div>
        </div>
      </div>
    </div>
  );
}
