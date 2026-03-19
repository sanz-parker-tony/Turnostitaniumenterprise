/**
 * UnderConstructionFallback - Componente fallback para pantallas sin implementar
 * Se muestra cuando una ruta existe en el menú pero no tiene componente
 */

import { Construction, ArrowLeft } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface UnderConstructionFallbackProps {
  screenName?: string;
  screenKey?: string;
}

export function UnderConstructionFallback({ 
  screenName = 'Esta pantalla',
  screenKey 
}: UnderConstructionFallbackProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
              <Construction className="w-16 h-16 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <CardTitle className="text-2xl">Pantalla en Construcción</CardTitle>
          <CardDescription className="text-base mt-2">
            {screenName} está en desarrollo y estará disponible próximamente
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {screenKey && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Información técnica:</p>
              <p className="text-sm font-mono">
                <span className="font-semibold">Screen Key:</span> {screenKey}
              </p>
              <p className="text-sm font-mono">
                <span className="font-semibold">Ruta:</span> {pathname}
              </p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Regresar
            </Button>
            <Button
              onClick={() => router.push('/dashboard')}
              className="flex-1"
            >
              Ir al Dashboard
            </Button>
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-xs text-center text-muted-foreground">
              Esta pantalla tiene permisos configurados correctamente.
              <br />
              El componente de interfaz se implementará en futuras versiones.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default UnderConstructionFallback;
