/**
 * KIOSK > Identify
 * Página standalone para identificación de empleados
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { kioskIdentify, API_CONFIG } from '@/utils/api-config';
import { publicApiToken } from '@/utils/backend/info';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, CheckCircle2, Loader2, Camera } from 'lucide-react';
import { toast } from 'sonner';

interface Employee {
  employee_id: string;
  employee_code: string;
  full_name: string;
  photo_url?: string;
  company_name: string;
}

export default function IdentifyPage() {
  const router = useRouter();
  const [method, setMethod] = useState<'pin' | 'qr' | 'photo'>('pin');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleIdentifyByPin = async () => {
    if (!pin || pin.length !== 4) {
      toast.error('PIN debe tener 4 dígitos');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await kioskIdentify(pin, publicApiToken);

      if (error) {
        toast.error(error.message || 'Error al identificar empleado');
        return;
      }

      if (!data?.ok || data?.error) {
        toast.error(data?.error || 'Error al identificar empleado');
        return;
      }

      toast.success(`Identificado: ${data.data?.full_name || 'Usuario'}`);
      
      // Redirigir al punch
      router.push('/kiosk/punch');
    } catch (err: any) {
      console.error('[IDENTIFY] Error:', err);
      toast.error('Error de conexión. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleIdentifyByQR = async () => {
    toast.info('Función de QR en desarrollo');
    // TODO: Implementar scanner QR
  };

  const handleIdentifyByPhoto = async () => {
    toast.info('Función de reconocimiento facial en desarrollo');
    // TODO: Implementar captura de foto + facial recognition
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-2xl space-y-6">
        {/* Selector de método */}
        <div className="grid grid-cols-3 gap-4">
          <Card 
            className={`cursor-pointer transition-all ${
              method === 'pin' 
                ? 'ring-2 ring-[#0074D9] bg-blue-50' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => setMethod('pin')}
          >
            <CardContent className="pt-6 text-center">
              <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${
                method === 'pin' ? 'bg-[#0074D9]' : 'bg-gray-200'
              }`}>
                <User className={`w-8 h-8 ${
                  method === 'pin' ? 'text-white' : 'text-gray-600'
                }`} />
              </div>
              <h3 className="font-semibold">PIN</h3>
              <p className="text-xs text-gray-600 mt-1">4 dígitos</p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${
              method === 'qr' 
                ? 'ring-2 ring-[#0074D9] bg-blue-50' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => setMethod('qr')}
          >
            <CardContent className="pt-6 text-center">
              <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${
                method === 'qr' ? 'bg-[#0074D9]' : 'bg-gray-200'
              }`}>
                <Camera className={`w-8 h-8 ${
                  method === 'qr' ? 'text-white' : 'text-gray-600'
                }`} />
              </div>
              <h3 className="font-semibold">QR Code</h3>
              <p className="text-xs text-gray-600 mt-1">Escanear</p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${
              method === 'photo' 
                ? 'ring-2 ring-[#0074D9] bg-blue-50' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => setMethod('photo')}
          >
            <CardContent className="pt-6 text-center">
              <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${
                method === 'photo' ? 'bg-[#0074D9]' : 'bg-gray-200'
              }`}>
                <Camera className={`w-8 h-8 ${
                  method === 'photo' ? 'text-white' : 'text-gray-600'
                }`} />
              </div>
              <h3 className="font-semibold">Foto</h3>
              <p className="text-xs text-gray-600 mt-1">Facial</p>
            </CardContent>
          </Card>
        </div>

        {/* Método PIN */}
        {method === 'pin' && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Ingrese su PIN</CardTitle>
              <CardDescription>Código de 4 dígitos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
                className="text-center text-3xl tracking-widest font-mono h-16"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pin.length === 4) {
                    handleIdentifyByPin();
                  }
                }}
                autoFocus
              />

              <Button
                onClick={handleIdentifyByPin}
                disabled={pin.length !== 4 || loading}
                className="w-full bg-[#0074D9] hover:bg-[#0056A3] h-14 text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Identificando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Identificar
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Método QR */}
        {method === 'qr' && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Escanear QR</CardTitle>
              <CardDescription>Acerque su código QR a la cámara</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Cámara QR</p>
                  <p className="text-sm text-gray-500 mt-2">Función en desarrollo</p>
                </div>
              </div>

              <Button
                onClick={handleIdentifyByQR}
                className="w-full bg-[#0074D9] hover:bg-[#0056A3] h-14 text-lg mt-4"
              >
                Probar Scanner
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Método Foto */}
        {method === 'photo' && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Reconocimiento Facial</CardTitle>
              <CardDescription>Ubíquese frente a la cámara</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Vista de cámara</p>
                  <p className="text-sm text-gray-500 mt-2">Función en desarrollo</p>
                </div>
              </div>

              <Button
                onClick={handleIdentifyByPhoto}
                className="w-full bg-[#0074D9] hover:bg-[#0056A3] h-14 text-lg mt-4"
              >
                Capturar Foto
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-center text-gray-500">
          Si tiene problemas, contacte a RRHH
        </p>
      </div>
    </div>
  );
}