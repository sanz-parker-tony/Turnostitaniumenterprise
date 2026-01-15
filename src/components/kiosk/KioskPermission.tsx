/**
 * KIOSK_PERMISSION - Solicitar Permisos
 * Screen: KIOSK_PERMISSION
 * Route: /kiosk/permission
 * 
 * Permite al empleado solicitar permisos (horas libres, citas médicas, etc.)
 * Conecta con endpoints:
 * - POST /kiosk/request-permission
 * - GET /kiosk/my-permissions
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  ClipboardList, 
  Send, 
  Clock,
  Calendar,
  Loader2,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { projectId } from '@/utils/supabase/info';

interface Permission {
  id: string;
  permission_date: string;
  start_time: string;
  end_time: string;
  hours: number;
  reason: string;
  status: {
    code: string;
    value: string;
  };
  created_at: string;
}

export default function KioskPermission() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [permissionDate, setPermissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [reason, setReason] = useState('');

  const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094`;

  const getAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const response = await fetch(`${BASE_URL}/kiosk/my-permissions`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.ok) {
        setPermissions(data.data.permissions || []);
      }
    } catch (error) {
      console.error('Error cargando permisos:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateHours = () => {
    if (!startTime || !endTime) return 0;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const hours = (eh * 60 + em - (sh * 60 + sm)) / 60;
    return Math.max(0, hours);
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Debe proporcionar una justificación');
      return;
    }

    const hours = calculateHours();
    if (hours <= 0) {
      toast.error('La hora de fin debe ser posterior a la de inicio');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('No autenticado');
        return;
      }

      const response = await fetch(`${BASE_URL}/kiosk/request-permission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          permission_date: permissionDate,
          start_time: startTime,
          end_time: endTime,
          reason: reason.trim()
        })
      });

      const data = await response.json();

      if (!data.ok) {
        toast.error(data.error.message || 'Error al solicitar permiso');
        return;
      }

      toast.success('Solicitud de permiso enviada exitosamente');
      
      setReason('');
      setPermissionDate(new Date().toISOString().split('T')[0]);
      setStartTime('09:00');
      setEndTime('10:00');
      
      loadPermissions();
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
          <ClipboardList className="w-8 h-8 text-blue-600" />
          Solicitar Permisos
        </h1>
        <p className="text-gray-600 mt-2">
          Solicita permisos para ausentarte durante tu jornada laboral
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Nueva Solicitud de Permiso</CardTitle>
            <CardDescription>
              Completa los datos del permiso que necesitas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="permissionDate">Fecha</Label>
              <Input
                id="permissionDate"
                type="date"
                value={permissionDate}
                onChange={(e) => setPermissionDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Hora Inicio</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">Hora Fin</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                Duración: <span className="font-bold">{calculateHours().toFixed(2)} horas</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo *</Label>
              <Textarea
                id="reason"
                placeholder="Explica el motivo del permiso..."
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Mis Solicitudes de Permisos
            </CardTitle>
            <CardDescription>
              Historial de solicitudes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={loadPermissions}
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
            ) : permissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No has solicitado permisos</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {permissions.map((perm) => (
                  <div
                    key={perm.id}
                    className="p-4 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">
                          {formatDate(perm.permission_date)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {perm.start_time} - {perm.end_time} ({perm.hours.toFixed(2)}h)
                        </p>
                      </div>
                      {getStatusBadge(perm.status.code)}
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {perm.reason}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Solicitado: {formatDate(perm.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
