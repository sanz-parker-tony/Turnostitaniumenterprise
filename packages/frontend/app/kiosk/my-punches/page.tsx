/**
 * KIOSK > My Punches
 * Historial de marcaciones del empleado
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/backend/client';
import { projectId, publicApiToken } from '@/utils/backend/info';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertCircle, CheckCircle, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface Punch {
  id: string;
  punch_datetime: string;
  punch_type_code: string;
  punch_type_name: string;
  source_code: string;
  source_name: string;
  is_anomaly: boolean;
  anomaly_reason?: string;
}

export default function MyPunchesPage() {
  const { user } = useAuth();
  const [punches, setPunches] = useState<Punch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('week');

  const BASE_URL = `http://localhost:3001/make-server-e19f2094`;

  useEffect(() => {
    loadPunches();
  }, [filter]);

  async function loadPunches() {
    setIsLoading(true);
    try {
      const ApiClient = createClient();
      const { data: { session } } = await ApiClient.auth.getSession();

      const params = new URLSearchParams();
      if (filter === 'today') params.set('days', '1');
      else if (filter === 'week') params.set('days', '7');
      else if (filter === 'month') params.set('days', '30');

      const response = await fetch(`${BASE_URL}/kiosk/my-punches?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session?.access_token || publicApiToken}`
        }
      });

      const result = await response.json();

      if (!result.ok || result.error) {
        toast.error(result.error || 'Error al cargar marcaciones');
        return;
      }

      setPunches(result.data || []);
    } catch (err: any) {
      console.error('[MY_PUNCHES] Error:', err);
      toast.error('Error de conexión. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  }

  const formatDateTime = (datetime: string) => {
    const date = new Date(datetime);
    return {
      date: date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      dayName: date.toLocaleDateString('es-ES', { weekday: 'long' })
    };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Mis Marcaciones</CardTitle>
              <CardDescription>Historial de marcaciones de asistencia</CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={filter === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('today')}
              >
                Hoy
              </Button>
              <Button
                variant={filter === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('week')}
              >
                Semana
              </Button>
              <Button
                variant={filter === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('month')}
              >
                Mes
              </Button>
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Todas
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Cargando marcaciones...</p>
            </div>
          ) : punches.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay marcaciones registradas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {punches.map((punch) => {
                const { date, time, dayName } = formatDateTime(punch.punch_datetime);
                
                return (
                  <div
                    key={punch.id}
                    className={`p-4 rounded-lg border ${
                      punch.is_anomaly
                        ? 'border-red-200 bg-red-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          punch.is_anomaly ? 'bg-red-100' : 'bg-green-100'
                        }`}>
                          {punch.is_anomaly ? (
                            <AlertCircle className="w-6 h-6 text-red-600" />
                          ) : (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              {punch.punch_type_name}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              {punch.source_name}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="capitalize">{dayName}</span>
                              <span>{date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="font-mono">{time}</span>
                            </div>
                          </div>
                          {punch.is_anomaly && punch.anomaly_reason && (
                            <p className="text-xs text-red-600 mt-1">
                              <AlertCircle className="w-3 h-3 inline mr-1" />
                              {punch.anomaly_reason}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Marcaciones</p>
              <p className="text-3xl font-bold text-gray-900">{punches.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Sin Anomalías</p>
              <p className="text-3xl font-bold text-green-600">
                {punches.filter(p => !p.is_anomaly).length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Con Anomalías</p>
              <p className="text-3xl font-bold text-red-600">
                {punches.filter(p => p.is_anomaly).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
