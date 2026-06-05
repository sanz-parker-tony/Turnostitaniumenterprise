/**
 * Login.tsx
 * Pantalla de inicio de sesion para Turnos Titanium Enterprise.
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import logoTurnos from 'figma:asset/17ccf6801f7c83b8bea74fbd52400e5b6ac4d64a.png';
import AdminPasswordReset from './AdminPasswordReset';

export default function Login() {
  const { signIn, authStatusMessage } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedLoginId = loginId.trim();
    if (!normalizedLoginId || !password) {
      const message = 'Ingrese usuario/correo y contrasena.';
      setError(message);
      toast.error(message, { duration: 5000, position: 'top-center' });
      return;
    }

    setIsLoading(true);

    try {
      console.log('[LOGIN] Intentando login con:', normalizedLoginId);
      await signIn(normalizedLoginId, password);
      console.log('[LOGIN] Login exitoso');
    } catch (err: any) {
      console.error('[LOGIN] Error al iniciar sesion:', err);

      const rawMessage = String(err?.message || err || '').trim();
      let errorMessage = 'Error al iniciar sesion. Por favor, intenta nuevamente.';

      if (rawMessage.includes('Invalid login credentials')) {
        errorMessage = 'Credenciales invalidas. Use el usuario/correo correcto y la contrasena asignada.';
      } else if (rawMessage.includes('Failed to fetch') || rawMessage.includes('NetworkError')) {
        errorMessage = 'No se pudo conectar con el backend de autenticacion. Verifique la URL del API o la conexion.';
      } else if (rawMessage.includes('Email not confirmed')) {
        errorMessage = 'Por favor confirme el correo antes de iniciar sesion.';
      } else if (rawMessage) {
        errorMessage = rawMessage;
      }

      setError(errorMessage);
      toast.error(errorMessage, { duration: 6000, position: 'top-center' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={logoTurnos} alt="Turnos Titanium" className="h-16 w-16" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Turnos Titanium</h1>
          <p className="text-gray-600">Plataforma Empresarial de Control de Asistencias y Turnos</p>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Modalidad: On-Premise</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Iniciar sesion</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Error de autenticacion</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {isLoading && authStatusMessage && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
              <div>
                <p className="text-sm font-medium text-blue-900">Estado del login</p>
                <p className="text-sm text-blue-700 mt-1">{authStatusMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="login-id" className="block text-sm font-medium text-gray-700 mb-2">
                Usuario o correo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="login-id"
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="usuario@empresa.com o usuario.apellido"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contrasena
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="********"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Iniciando sesion...</span>
                </>
              ) : (
                <span>Iniciar sesion</span>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <AdminPasswordReset />
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Turnos Titanium Enterprise v2.5.1 - Instalacion On-Premise</p>
          <p className="mt-1">2025 Titanium Labs Corp. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}
