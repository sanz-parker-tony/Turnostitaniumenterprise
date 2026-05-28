/**
 * KIOSK_JUSTIFICATION - Justificar Inasistencias
 * Screen: KIOSK_JUSTIFICATION  
 * Route: /kiosk/justification
 * 
 * Permite al empleado justificar ausencias completas
 * Conecta con endpoints:
 * - POST /kiosk/request-justification
 * - GET /kiosk/my-justifications
 */

import { buildApiUrl } from '../../utils/api-config';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Calendar, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClient } from '@/lib/api-client';
import { projectId } from '@/utils/backend/info';

interface Justification {
  id: string;
  absence_date: string;
  reason: string;
  status: {
    code: string;
    value: string;
  };
  created_at: string;
}

export default function KioskJustification() {
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [absenceDate, setAbsenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');

  const BASE_URL = buildApiUrl(`/make-server-e19f2094`);

  const getAccessToken = async () => {
    const { data: { session } } = await ApiClient.auth.getSession();
    return session?.access_token;
  };

  useEffect(() => {
    loadJustifications();
  }, []);

  const loadJustifications = async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const response = await fetch(`${BASE_URL}/kiosk/my-justifications`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.ok) {
        setJustifications(data.data.justifications || []);
      }
    } catch (error) {
      console.error('Error cargando justificaciones:', error);
    } finally {
      setLoading(false);
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

      const response = await fetch(`${BASE_URL}/kiosk/request-justification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          absence_date: absenceDate,
          reason: reason.trim()
        })
      });

      const data = await response.json();

      if (!data.ok) {
        toast.error(data.error.message || 'Error al solicitar justificación');
        return;
      }

      toast.success('Justificación enviada exitosamente');
      
      setReason('');
      setAbsenceDate(new Date().toISOString().split('T')[0]);
      
      loadJustifications();
    } catch (error: any) {
      toast.error('Error al enviar justificación');
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
      APPROVED: { variant: 'default', label: 'Aprobada' },
      REJECTED: { variant: 'destructive', label: 'Rechazada' }
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
          <MessageSquare className="w-8 h-8 text-blue-600" />
          Justificar Inasistencias
        </h1>
        <p className="text-gray-600 mt-2">
          Justifica tus ausencias laborales
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Nueva Justificación</CardTitle>
            <CardDescription>
              Completa los datos de la inasistencia que deseas justificar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="absenceDate">Fecha de Ausencia</Label>
              <Input
                id="absenceDate"
                type="date"
                value={absenceDate}
                onChange={(e) => setAbsenceDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo de la Ausencia *</Label>
              <Textarea
                id="reason"
                placeholder="Explica el motivo de tu ausencia..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={6}
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 text-right">
                {reason.length}/1000 caracteres
              </p>
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Nota:</strong> La justificación será revisada por tu supervisor.
                Asegúrate de proporcionar información completa y verídica.
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
                  Enviar Justificación
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Mis Justificaciones
            </CardTitle>
            <CardDescription>
              Historial de justificaciones enviadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={loadJustifications}
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
            ) : justifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No has enviado justificaciones</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {justifications.map((just) => (
                  <div
                    key={just.id}
                    className="p-4 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">
                          {formatDate(just.absence_date)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Enviada: {formatDate(just.created_at)}
                        </p>
                      </div>
                      {getStatusBadge(just.status.code)}
                    </div>
                    <p className="text-sm text-gray-700 mt-2 line-clamp-3">
                      {just.reason}
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

