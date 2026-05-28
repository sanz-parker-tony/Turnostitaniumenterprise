/**
 * AdminPasswordReset.tsx
 * Utilidad de emergencia para resetear la contraseña del system.admin
 * Solo visible en pantalla de login
 */

import { buildApiUrl } from '../utils/api-config';
import { useState } from 'react';
import { KeyRound, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPasswordReset() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleReset = async () => {
    setIsLoading(true);
    try {
      console.log('🔐 Reseteando contraseña del administrador...');
      
      const response = await fetch(
        buildApiUrl(`/auth/reset-system-admin-password`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error reseteando contraseña');
      }

      const result = await response.json();
      console.log('✅ Contraseña reseteada:', result);

      setCredentials(result.credentials);
      toast.success('Contraseña reseteada exitosamente');
    } catch (err: any) {
      console.error('❌ Error:', err);
      toast.error(err.message || 'Error reseteando contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs text-gray-500 hover:text-blue-600 underline mt-4"
      >
        ¿Olvidaste la contraseña del administrador?
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Resetear Contraseña</h3>
            <p className="text-sm text-gray-600">Usuario system.admin</p>
          </div>
        </div>

        {!credentials ? (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">⚠️ Acción de Emergencia</p>
                  <p>Esta acción reseteará la contraseña del administrador del sistema a la contraseña por defecto.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReset}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Reseteando...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Resetear Contraseña</span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">✅ Contraseña Reseteada</p>
                  <p>Usa estas credenciales para iniciar sesión:</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Correo Electrónico
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 font-mono">
                  {credentials.email}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 font-mono pr-10">
                    {showPassword ? credentials.password : '••••••••••••'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800">
                💡 <strong>Importante:</strong> Cambia esta contraseña después de iniciar sesión por primera vez.
              </p>
            </div>

            <button
              onClick={() => {
                setIsOpen(false);
                setCredentials(null);
                setShowPassword(false);
              }}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

