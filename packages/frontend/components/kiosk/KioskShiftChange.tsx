/**
 * KIOSK_SHIFT_CHANGE - Solicitar Cambio de Turno
 * Screen: KIOSK_SHIFT_CHANGE
 * Route: /kiosk/shift-change
 * 
 * Permite al empleado solicitar cambios de turno
 * Conecta con endpoints:
 * - POST /kiosk/request-shift-change
 * - GET /kiosk/my-shift-changes
 * - GET /kiosk/my-shifts
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeftRight, 
  Send, 
  Calendar, 
  Clock,
  Loader2, 
  RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiClient } from '@/lib/api-client';
import { projectId } from '@/utils/backend/info';

interface Shift {
  planning_date: string;
  shift: {
    id: string;
    name: string;
    short_name: string;
    start_time: string;
    end_time: string;
  };
}

interface ShiftChange {
  id: string;
  request_date: string;
  current_shift: {
    id: string;
    name: string;
  };
  requested_shift?: {
    id: string;
    name: string;
  };
  reason: string;
  status: {
    code: string;
    value: string;
  };
  created_at: string;
}

export default function KioskShiftChange() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftChanges, setShiftChanges] = useState<ShiftChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [requestedShiftId, setRequestedShiftId] = useState('');
  const [reason, setReason] = useState('');

  const BASE_URL = `http://localhost:3001/make-server-e19f2094`;

  const getAccessToken = async () => {
    const { data: { session } } = await ApiClient.auth.getSession();
    return session?.access_token;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadShifts(), loadShiftChanges()]);
    } finally {
      setLoading(false);
    }
  };

  const loadShifts = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      const startDate = new Date().toISOString().split('T')[0];

      const response = await fetch(
        `${BASE_URL}/kiosk/my-shifts?start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      if (data.ok) {
        setShifts(data.data.shifts || []);
      }
    } catch (error) {
      console.error('Error cargando turnos:', error);
    }
  };

  const loadShiftChanges = async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      const response = await fetch(`${BASE_URL}/kiosk/my-shift-changes`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.ok) {
        setShiftChanges(data.data.shift_changes || []);
      }
    } catch (error) {
      console.error('Error cargando cambios de turno:', error);
    }
  };

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

      const payload: any = {
        request_date: requestDate,
        reason: reason.trim()
      };

      if (requestedShiftId) {
        payload.requested_shift_id = requestedShiftId;
      }

      const response = await fetch(`${BASE_URL}/kiosk/request-shift-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!data.ok) {
        toast.error(data.error.message || 'Error al solicitar cambio de turno');
        return;
      }

      toast.success('Solicitud de cambio de turno enviada exitosamente');
      
      setReason('');
      setRequestDate(new Date().toISOString().split('T')[0]);
      setRequestedShiftId('');
      
      loadShiftChanges();
    } catch (error: any) {
      toast.error('Error al enviar solicitud');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (statusCode: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      PENDING: { variant: 'default', label: 'Pendiente' },
      APPROVED: { variant: 'default', label: 'Aprobado' },
      REJECTED: { variant: 'destructive', label: 'Rechazado' }
    };
    
    const config = variants[statusCode] || { variant: 'secondary', label: statusCode };
    return (
      <Badge variant={config.variant} className={statusCode === 'APPROVED' ? 'bg-green-600' : ''}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <ArrowLeftRight className="w-8 h-8 text-blue-600" />
          Solicitar Cambio de Turno
        </h1>
        <p className="text-gray-600 mt-2">
          Solicita cambios en tu turno de trabajo
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Formulario */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Nueva Solicitud de Cambio</CardTitle>
            <CardDescription>
              Completa los datos del cambio que deseas solicitar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="requestDate">Fecha del Cambio</Label>
              <Input
                id="requestDate"
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requestedShift">Turno Solicitado (Opcional)</Label>
              <select
                id="requestedShift"
                value={requestedShiftId}
                onChange={(e) => setRequestedShiftId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"
              >
                <option value="">-- Sin turno específico --</option>
                {shifts
                  .filter(s => s.planning_date === requestDate)
                  .map((shift) => (
                    <option key={shift.shift.id} value={shift.shift.id}>
                      {shift.shift.name} ({shift.shift.start_time} - {shift.shift.end_time})
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500">
                Deja vacío si solo solicitas liberación del turno actual
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo del Cambio *</Label>
              <Textarea
                id="reason"
                placeholder="Explica el motivo del cambio de turno..."
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

        {/* Mis turnos próximos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Mis Turnos
            </CardTitle>
            <CardDescription>Próximos 30 días</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={loadShifts}
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
            ) : shifts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Sin turnos planificados</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {shifts.slice(0, 10).map((shift, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 rounded-lg border"
                  >
                    <p className="text-xs text-gray-600 mb-1">
                      {formatDate(shift.planning_date)}
                    </p>
                    <p className="font-medium text-sm">
                      {shift.shift.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {shift.shift.start_time} - {shift.shift.end_time}
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
            <ArrowLeftRight className="w-5 h-5" />
            Mis Solicitudes de Cambio
          </CardTitle>
          <CardDescription>
            Historial de solicitudes de cambio de turno
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
            </div>
          ) : shiftChanges.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No has solicitado cambios de turno</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Fecha Solicitada</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Turno Actual</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Turno Nuevo</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Motivo</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Enviada</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftChanges.map((change) => (
                    <tr key={change.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {formatDate(change.request_date)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">
                          {change.current_shift.name}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {change.requested_shift ? (
                          <Badge variant="outline">
                            {change.requested_shift.name}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-500">Sin turno</span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate">
                        {change.reason}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(change.status.code)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(change.created_at)}
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

