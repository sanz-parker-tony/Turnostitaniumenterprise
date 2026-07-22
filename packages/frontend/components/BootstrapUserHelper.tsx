/**
 * BootstrapUserHelper.tsx
 * Componente que auto-crea el usuario system.admin en el primer arranque
 * ⚠️ CRÍTICO: Este componente NO crea tenants, solo usuarios
 */

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { createSystemAdmin, buildApiUrl } from '../utils/api-config';

export default function BootstrapUserHelper() {
  const [isWorking, setIsWorking] = useState(true);
  const [status, setStatus] = useState<'checking' | 'creating' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('Inicializando sistema...');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Auto-ejecutar al montar
  useEffect(() => {
    ensureSystemAdmin();
  }, []);

  const ensureSystemAdmin = async () => {
    try {
      setIsWorking(true);
      setStatus('checking');
      setMessage('Verificando servidor...');
      setError(null);
      setDebugInfo(null);

      console.log('🚀 [BOOTSTRAP] Iniciando verificación...');

      // PASO 1: Verificar conectividad con endpoint /ping
      console.log('🏓 [BOOTSTRAP] PASO 1: Verificando conectividad...');
      
      const pingUrl = buildApiUrl(`/bootstrap/ping`);
      console.log('🏓 [BOOTSTRAP] URL:', pingUrl);
      
      try {
        const pingResponse = await fetch(pingUrl, {
          method: 'GET',
        });

        if (!pingResponse.ok) {
          throw new Error(`Ping failed: HTTP ${pingResponse.status}`);
        }

        const pingData = await pingResponse.json();
        console.log('✅ [BOOTSTRAP] Ping exitoso:', pingData);
      } catch (pingError: any) {
        console.error('❌ [BOOTSTRAP] Ping falló:', pingError);
        throw new Error(`Servidor no disponible: ${pingError.message}`);
      }

      // PASO 2: Crear usuario system.admin
      setStatus('creating');
      setMessage('Creando usuario system.admin...');
      
      console.log('🔧 [BOOTSTRAP] PASO 2: Creando usuario...');

      const { data, error } = await createSystemAdmin();

      console.log('📦 [BOOTSTRAP] Response:', { data, error });

      if (error) {
        setDebugInfo({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        
        throw new Error(error.message || 'Error desconocido al crear usuario');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Error desconocido al crear usuario');
      }

      // ÉXITO
      console.log('✅ [BOOTSTRAP] Usuario system.admin listo');
      setStatus('success');
      setMessage(data.message || 'Sistema inicializado correctamente');
      
      // Auto-ocultar después de 5 segundos
      setTimeout(() => {
        setIsWorking(false);
      }, 5000);

    } catch (err: any) {
      console.error('❌ [BOOTSTRAP] Error:', err);
      setStatus('error');
      setError(err.message || 'Error desconocido');
      setMessage('Error al inicializar sistema');
    }
  };

  // No mostrar nada si ya terminó exitosamente
  if (!isWorking && status === 'success') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-white border-2 border-gray-200 rounded-lg shadow-xl p-4 z-50 animate-in slide-in-from-bottom-5">
      <div className="flex items-start gap-3">
        {/* Icono dinámico */}
        {status === 'checking' || status === 'creating' ? (
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
        ) : status === 'error' ? (
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        ) : (
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        )}

        <div className="flex-1 min-w-0">
          {/* Título */}
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {status === 'checking' && '🔍 Verificando configuración'}
            {status === 'creating' && '🔧 Inicializando sistema'}
            {status === 'success' && '✅ ¡Sistema listo!'}
            {status === 'error' && '❌ Error de configuración'}
          </h3>

          {/* Mensaje */}
          <p className="text-xs text-gray-600 mb-2">
            {message}
          </p>

          {/* Contenido según el estado */}
          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded p-2 space-y-1">
              <div className="text-xs font-mono text-green-900">
                Las credenciales son las configuradas de forma segura durante la instalación.
              </div>
              <p className="text-xs text-orange-700 mt-2 pt-2 border-t border-green-200">
                ⚠️ Cambia la contraseña después del primer login
              </p>
            </div>
          )}

          {status === 'error' && error && (
            <div className="space-y-2">
              <div className="bg-red-50 border border-red-200 rounded p-2">
                <p className="text-xs text-red-700 font-mono">{error}</p>
                
                {debugInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer hover:text-red-700">
                      Ver detalles técnicos
                    </summary>
                    <pre className="text-xs text-red-800 mt-1 overflow-x-auto">
                      {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
              <button
                onClick={ensureSystemAdmin}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Reintentar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

