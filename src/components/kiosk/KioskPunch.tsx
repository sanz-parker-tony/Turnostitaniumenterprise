/**
 * KIOSK_PUNCH - Marcación de Asistencia
 * Screen: KIOSK_PUNCH
 * Route: /kiosk/punch
 * 
 * Permite al empleado realizar marcaciones de entrada/salida
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  LogIn, 
  LogOut, 
  Coffee, 
  Clock, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

interface Employee {
  employee_id: string;
  employee_code: string;
  full_name: string;
  photo_url?: string;
  company_name: string;
  current_shift_name?: string;
  last_punch_type?: string;
  last_punch_datetime?: string;
}

interface Punch {
  id: string;
  punch_datetime: string;
  punch_type_code: string;
  punch_type_name: string;
  source_code: string;
  is_anomaly: boolean;
}

export default function KioskPunch() {
  const [step, setStep] = useState<'identify' | 'punch'>('identify');
  const [pin, setPin] = useState('');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [recentPunches, setRecentPunches] = useState<Punch[]>([]);
  const [loading, setLoading] = useState(false);
  const [punchingType, setPunchingType] = useState<string | null>(null);

  const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094`;

  // Identificar empleado por PIN
  const handleIdentify = async () => {
    if (!pin || pin.length !== 4) {
      toast.error('PIN debe tener 4 dígitos');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/kiosk/identify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ pin })
      });

      const result = await response.json();

      if (!result.ok || result.error) {
        toast.error(result.error || 'Error al identificar empleado');
        return;
      }

      setEmployee(result.data);
      setStep('punch');
      toast.success(`Bienvenido, ${result.data.full_name}`);

      // Cargar marcaciones recientes
      loadRecentPunches();
    } catch (err: any) {
      console.error('[KIOSK] Error identificando:', err);
      toast.error('Error de conexión. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar marcaciones recientes
  const loadRecentPunches = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${BASE_URL}/kiosk/my-punches?limit=5`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session?.access_token || publicAnonKey}`
        }
      });

      const result = await response.json();

      if (result.ok && result.data) {
        setRecentPunches(result.data);
      }
    } catch (err) {
      console.error('[KIOSK] Error cargando punches:', err);
    }
  };

  // Realizar marcación
  const handlePunch = async (punchType: string) => {
    if (!employee) return;

    setPunchingType(punchType);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${BASE_URL}/kiosk/punch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || publicAnonKey}`
        },
        body: JSON.stringify({
          employee_id: employee.employee_id,
          punch_type: punchType,
          source: 'KIOSK_WEB'
        })
      });

      const result = await response.json();

      if (!result.ok || result.error) {
        toast.error(result.error || 'Error al registrar marcación');
        return;
      }

      toast.success('Marcación registrada exitosamente');
      
      // Recargar datos
      await loadRecentPunches();
      
      // Volver a identificar después de 2 segundos
      setTimeout(() => {
        setEmployee(null);
        setPin('');
        setStep('identify');
        setPunchingType(null);
      }, 2000);
    } catch (err: any) {
      console.error('[KIOSK] Error en marcación:', err);
      toast.error('Error de conexión. Intente nuevamente.');
    } finally {
      setPunchingType(null);
    }
  };

  // Logout
  const handleLogout = () => {
    setEmployee(null);
    setPin('');
    setStep('identify');
    setRecentPunches([]);
  };

  // Formatear fecha/hora
  const formatDateTime = (datetime: string) => {
    const date = new Date(datetime);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ============================================================================
  // RENDER: IDENTIFICACIÓN
  // ============================================================================

  if (step === 'identify') {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-[#0074D9] rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl">Identificación</CardTitle>
            <CardDescription>Ingrese su PIN de 4 dígitos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
                className="text-center text-2xl tracking-widest"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pin.length === 4) {
                    handleIdentify();
                  }
                }}
                autoFocus
              />
            </div>

            <Button
              onClick={handleIdentify}
              disabled={pin.length !== 4 || loading}
              className="w-full bg-[#0074D9] hover:bg-[#0056A3] h-12 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Identificando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Continuar
                </>
              )}
            </Button>

            <p className="text-xs text-center text-gray-500 mt-4">
              Si no recuerda su PIN, contacte a RRHH
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // RENDER: MARCACIÓN
  // ============================================================================

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header del empleado */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#0074D9] rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{employee?.full_name}</h2>
                <p className="text-sm text-gray-600">{employee?.employee_code}</p>
                <p className="text-sm text-gray-600">{employee?.company_name}</p>
              </div>
            </div>

            <Button variant="outline" onClick={handleLogout}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>

          {employee?.current_shift_name && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Turno actual: <strong>{employee.current_shift_name}</strong></span>
            </div>
          )}

          {employee?.last_punch_datetime && (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>
                Última marcación: <strong>{employee.last_punch_type}</strong> - {formatDateTime(employee.last_punch_datetime)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botones de marcación */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <Button
              onClick={() => handlePunch('ENTRY')}
              disabled={!!punchingType}
              className="w-full h-32 flex flex-col items-center justify-center bg-green-600 hover:bg-green-700 text-white text-lg"
            >
              {punchingType === 'ENTRY' ? (
                <Loader2 className="w-12 h-12 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-12 h-12 mb-2" />
                  Entrada
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <Button
              onClick={() => handlePunch('LUNCH_START')}
              disabled={!!punchingType}
              className="w-full h-32 flex flex-col items-center justify-center bg-amber-600 hover:bg-amber-700 text-white text-lg"
            >
              {punchingType === 'LUNCH_START' ? (
                <Loader2 className="w-12 h-12 animate-spin" />
              ) : (
                <>
                  <Coffee className="w-12 h-12 mb-2" />
                  Inicio Almuerzo
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <Button
              onClick={() => handlePunch('EXIT')}
              disabled={!!punchingType}
              className="w-full h-32 flex flex-col items-center justify-center bg-red-600 hover:bg-red-700 text-white text-lg"
            >
              {punchingType === 'EXIT' ? (
                <Loader2 className="w-12 h-12 animate-spin" />
              ) : (
                <>
                  <LogOut className="w-12 h-12 mb-2" />
                  Salida
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Marcaciones recientes */}
      {recentPunches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Marcaciones Recientes</CardTitle>
            <CardDescription>Últimas 5 marcaciones registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPunches.map((punch) => (
                <div
                  key={punch.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      punch.is_anomaly ? 'bg-red-500' : 'bg-green-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">{punch.punch_type_name}</p>
                      <p className="text-sm text-gray-600">{formatDateTime(punch.punch_datetime)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{punch.source_code}</Badge>
                    {punch.is_anomaly && (
                      <Badge variant="destructive">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Anomalía
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}