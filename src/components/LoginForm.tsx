/**
 * LoginForm - Client Component
 * Formulario de login (interacción del usuario)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock, Mail, Lock, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Login con Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        // Manejar errores específicos
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Email o contraseña incorrectos');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Por favor, confirma tu email antes de iniciar sesión');
        } else {
          setError(signInError.message);
        }
        setIsLoading(false);
        return;
      }

      if (!data.session) {
        setError('No se pudo crear la sesión');
        setIsLoading(false);
        return;
      }

      // Login exitoso - refresh para que el server component detecte la sesión
      router.refresh();
    } catch (error: any) {
      console.error('Error en login:', error);
      setError('Error inesperado al iniciar sesión. Intenta nuevamente.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0074D9] to-[#0056A3] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 bg-white rounded-full mb-4">
            <Clock className="size-8 text-[#0074D9]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Turnos Titanium</h1>
          <p className="text-blue-100">Control de Asistencias</p>
        </div>

        {/* Card de login */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Iniciar Sesión</h2>

          {/* Error message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                  placeholder="admin@titanium.com"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 text-[#0074D9] border-gray-300 rounded focus:ring-[#0074D9]"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-600">Recordarme</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-[#0074D9] hover:underline"
                tabIndex={isLoading ? -1 : 0}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0074D9] text-white py-3 rounded-lg hover:bg-[#0056A3] transition-colors font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">¿Nuevo en Turnos Titanium?</span>
            </div>
          </div>

          {/* Sign up link */}
          <Link
            href="/signup"
            className="block w-full text-center py-3 border-2 border-[#0074D9] text-[#0074D9] rounded-lg hover:bg-blue-50 transition-colors font-semibold"
            tabIndex={isLoading ? -1 : 0}
          >
            Crear Cuenta
          </Link>
        </div>

        {/* Back to landing */}
        <div className="text-center mt-6">
          <Link href="/landing" className="text-white hover:underline text-sm">
            ← Volver a inicio
          </Link>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-lg p-4 text-white text-sm">
          <p className="font-semibold mb-2">🔐 Credenciales de prueba:</p>
          <p>
            Email: <span className="font-mono">admin@titanium.com</span>
          </p>
          <p>
            Password: <span className="font-mono">Admin123!</span>
          </p>
          <p className="text-xs text-blue-100 mt-2">
            ⚠️ Debes crear este usuario en Supabase Dashboard primero
          </p>
        </div>

        {/* IT System Setup Link - Solo en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-center">
            <Link 
              href="/system/setup" 
              className="text-xs text-white/70 hover:text-white hover:underline"
            >
              🔧 IT: Configuración Inicial del Sistema
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}