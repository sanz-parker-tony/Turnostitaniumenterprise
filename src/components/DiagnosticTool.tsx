/**
 * DiagnosticTool.tsx
 * Herramienta de diagnóstico para verificar configuración del servidor
 */

import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export default function DiagnosticTool() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runDiagnostic = async () => {
    try {
      setLoading(true);
      setResult(null);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/diagnostic`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        error: true,
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-yellow-300 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-900">
          <AlertCircle className="w-5 h-5" />
          Diagnóstico del Servidor
        </CardTitle>
        <CardDescription>
          Verifica la configuración de las variables de entorno del servidor
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostic} 
          disabled={loading}
          variant="outline"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Ejecutar Diagnóstico
            </>
          )}
        </Button>

        {result && !result.error && (
          <div className="space-y-3">
            <div className="bg-white border border-yellow-200 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-sm">Variables de Entorno del Servidor:</h3>
              
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  {result.config?.hasSupabaseUrl ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="font-mono text-xs">SUPABASE_URL:</span>
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                    {result.config?.supabaseUrl}
                  </code>
                </div>

                <div className="flex items-center gap-2">
                  {result.config?.hasAnonKey ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="font-mono text-xs">SUPABASE_ANON_KEY:</span>
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                    {result.config?.anonKeyPreview}
                  </code>
                </div>

                <div className="flex items-center gap-2">
                  {result.config?.hasServiceKey ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY:</span>
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                    {result.config?.serviceKeyPreview}
                  </code>
                </div>
              </div>
            </div>

            <div className="bg-white border border-blue-200 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-sm text-blue-900">Frontend (esperado):</h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-mono text-xs">SUPABASE_URL:</span>
                  <code className="bg-blue-100 px-2 py-0.5 rounded text-xs ml-2">
                    https://{projectId}.supabase.co
                  </code>
                </div>
                <div>
                  <span className="font-mono text-xs">SUPABASE_ANON_KEY:</span>
                  <code className="bg-blue-100 px-2 py-0.5 rounded text-xs ml-2">
                    {publicAnonKey.substring(0, 50)}...
                  </code>
                </div>
              </div>
            </div>

            {(!result.config?.hasSupabaseUrl || !result.config?.hasAnonKey || !result.config?.hasServiceKey) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-sm text-red-900 mb-2">⚠️ Variables de entorno no configuradas</h3>
                <p className="text-sm text-red-800 mb-3">
                  El servidor Edge Function no tiene las variables de entorno configuradas correctamente. 
                  Esto causa el error "Invalid JWT".
                </p>
                <p className="text-sm text-red-800 font-semibold">
                  Solución:
                </p>
                <ol className="text-sm text-red-800 list-decimal list-inside space-y-1 ml-2">
                  <li>Ve al Dashboard de Supabase → Edge Functions</li>
                  <li>Haz clic en la función <code className="bg-red-100 px-1 rounded">make-server-e19f2094</code></li>
                  <li>Ve a la pestaña "Settings" o "Environment Variables"</li>
                  <li>Agrega las siguientes variables:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li><code className="bg-red-100 px-1 rounded">SUPABASE_URL</code> = https://{projectId}.supabase.co</li>
                      <li><code className="bg-red-100 px-1 rounded">SUPABASE_ANON_KEY</code> = {publicAnonKey.substring(0, 30)}...</li>
                      <li><code className="bg-red-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> = (tu service role key)</li>
                    </ul>
                  </li>
                  <li>Guarda y espera a que se redeploy la función (puede tardar 30-60 segundos)</li>
                  <li>Vuelve a ejecutar este diagnóstico</li>
                </ol>
              </div>
            )}

            {result.config?.hasSupabaseUrl && result.config?.hasAnonKey && result.config?.hasServiceKey && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-sm text-green-900 mb-2">✅ Configuración correcta</h3>
                <p className="text-sm text-green-800">
                  Todas las variables de entorno están configuradas. Si aún recibes errores "Invalid JWT", 
                  verifica que los valores coincidan exactamente con las credenciales de tu proyecto Supabase.
                </p>
              </div>
            )}
          </div>
        )}

        {result?.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-sm text-red-900 mb-2">❌ Error</h3>
            <p className="text-sm text-red-800">{result.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
