/**
 * KIOSK_REGULARIZATION - Regularizar Marcaciones
 * Screen: KIOSK_REGULARIZATION
 * Route: /kiosk/regularization
 * 
 * Permite al empleado solicitar regularización de marcaciones faltantes o incorrectas
 * Conecta con endpoints:
 * - POST /kiosk/request-regularization
 * - GET /kiosk/my-regularizations
 * - GET /kiosk/my-anomalies
 */

import { buildApiUrl } from '../../utils/api-config';
import { formatClientTime24 } from '../../utils/date-time';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  FileEdit, 
  AlertTriangle, 
  Send, 
  CheckCircle2,
  Clock,
  Calendar,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiClient } from '@/lib/api-client';
import { projectId } from '@/utils/backend/info';

interface Anomaly {
  id: string;
  anomaly_date: string;
  anomaly_type: {
    code: string;
    value: string;
  };
  description: string;
  severity: string;
}

interface Regularization {
  id: string;
  requested_date: string;
  requested_punch_datetime: string;
  punch_type: {
    code: string;
    value: string;
  };
  reason: string;
  status: {
    code: string;
    value: string;
  };
  created_at: string;
}

export default function KioskRegularization() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [regularizations, setRegularizations] = useState<Regularization[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [punchType, setPunchType] = useState('ENTRY');
  const [reason, setReason] = useState('');

  const BASE_URL = buildApiUrl(`/make-server-e19f2094`);

  // Obtener token de autenticación
  const getAccessToken = async () => {
    const { data: { session } } = await ApiClient.auth.getSession();
    return session?.access_token;
  };

  // Cargar datos al montar
  useEffect(() => {
    loadData();
  }, []);

  // Cargar anomalías y regularizaciones
  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadAnomalies(), loadRegularizations()]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar anomalías
  const loadAnomalies = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const response = await fetch(
        `${BASE_URL}/kiosk/my-anomalies?start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      if (data.ok) {
        setAnomalies(data.data.anomalies || []);
      }
    } catch (error) {
      console.error('Error cargando anomalías:', error);
    }
  };

  // Cargar regularizaciones
  const loadRegularizations = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      const response = await fetch(
        `${BASE_URL}/kiosk/my-regularizations`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      if (data.ok) {
        setRegularizations(data.data.regularizations || []);
      }
    } catch (error) {
      console.error('Error cargando regularizaciones:', error);
    }
  };

  // Solicitar regularización
  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Debe proporcionar una justificación');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('No autenticado');
        return;
      }

      const requestedDatetime = `${selectedDate}T${selectedTime}:00`;

      const response = await fetch(`${BASE_URL}/kiosk/request-regularization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          requested_date: selectedDate,
          requested_punch_datetime: requestedDatetime,
          punch_type_code: punchType,
          reason: reason.trim()
        })
      });

      const data = await response.json();

      if (!data.ok) {
        toast.error(data.error.message || 'Error al solicitar regularización');
        return;
      }

      toast.success('Solicitud de regularización enviada exitosamente');
      
      // Limpiar formulario
      setReason('');
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setSelectedTime('09:00');
      setPunchType('ENTRY');
      
      // Recargar datos
      loadRegularizations();
    } catch (error: any) {
      toast.error('Error al enviar solicitud');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Formatear hora
  const formatTime = (datetime: string) => formatClientTime24(datetime, 'es-EC');

  // Badge de estado
  const getStatusBadge = (statusCode: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      PENDING: { variant: 'default', label: 'Pendiente' },
      APPROVED: { variant: 'default', label: 'Aprobada' },
      REJECTED: { variant: 'destructive', label: 'Rechazada' }
    };
    
    const config = variants[statusCode] || { variant: 'secondary', label: statusCode };
    return (
      <Badge variant={config.variant} className={
        statusCode === 'APPROVED' ? 'bg-green-600' : ''
      }>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FileEdit className="w-8 h-8 text-blue-600" />
          Regularización de Marcaciones
        </h1>
        <p className="text-gray-600 mt-2">
          Solicita la corrección de marcaciones faltantes o incorrectas
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Formulario de solicitud */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Nueva Solicitud de Regularización</CardTitle>
            <CardDescription>
              Completa los datos de la marcación que deseas regularizar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Hora</Label>
                <Input
                  id="time"
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="punchType">Tipo de Marcación</Label>
              <select
                id="punchType"
                value={punchType}
                onChange={(e) => setPunchType(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"
              >
                <option value="ENTRY">Entrada</option>
                <option value="EXIT">Salida</option>
                <option value="LUNCH_OUT">Salida a Lunch</option>
                <option value="LUNCH_IN">Entrada de Lunch</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Justificación *</Label>
              <Textarea
                id="reason"
                placeholder="Explica el motivo de la regularización..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 text-right">
                {reason.length}/500 caracteres
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || !reason.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Solicitud
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Panel de anomalías */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Anomalías Detectadas
            </CardTitle>
            <CardDescription>Últimos 30 días</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={loadAnomalies}
              variant="outline"
              size="sm"
              className="w-full mb-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>

            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
              </div>
            ) : anomalies.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                <p className="text-sm">Sin anomalías</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {anomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-sm">
                        {anomaly.anomaly_type.value}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {anomaly.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">
                      {formatDate(anomaly.anomaly_date)}
                    </p>
                    <p className="text-xs text-gray-700">
                      {anomaly.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historial de solicitudes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Mis Solicitudes de Regularización
          </CardTitle>
          <CardDescription>
            Historial de solicitudes enviadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
            </div>
          ) : regularizations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileEdit className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No has enviado solicitudes de regularización</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Fecha Solicitada</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Hora</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Tipo</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Justificación</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Enviada</th>
                  </tr>
                </thead>
                <tbody>
                  {regularizations.map((reg) => (
                    <tr key={reg.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {formatDate(reg.requested_date)}
                      </td>
                      <td className="py-3 px-4">
                        {formatTime(reg.requested_punch_datetime)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">
                          {reg.punch_type.value}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate">
                        {reg.reason}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(reg.status.code)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(reg.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

