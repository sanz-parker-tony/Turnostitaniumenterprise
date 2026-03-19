import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

export function ForcePasswordChange() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      // 1. Actualizar password en Supabase Auth
      console.log('🔐 Actualizando contraseña en Supabase Auth...');
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (authError) {
        console.error('❌ Error actualizando password:', authError);
        setError(`Error actualizando contraseña: ${authError.message}`);
        setLoading(false);
        return;
      }

      console.log('✅ Contraseña actualizada en Auth');

      // 2. Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('No se pudo obtener información del usuario');
        setLoading(false);
        return;
      }

      // 3. Actualizar flag must_change_password en public.users
      console.log('🔐 Actualizando flag must_change_password...');
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/users/update-password-flag`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            auth_user_id: user.id,
            must_change_password: false,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error actualizando flag:', errorData);
        setError('Error actualizando estado de usuario');
        setLoading(false);
        return;
      }

      console.log('✅ Flag must_change_password actualizado');

      // 4. Redirigir al dashboard
      alert('Contraseña actualizada exitosamente. Ahora puedes usar el sistema.');
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('❌ Error inesperado:', err);
      setError('Error inesperado al cambiar contraseña');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Cambio de Contraseña Obligatorio
          </h1>
          <p className="text-sm text-gray-600">
            Por seguridad, debes cambiar tu contraseña temporal antes de continuar
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nueva Contraseña */}
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nueva Contraseña
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Mínimo 8 caracteres"
              required
              disabled={loading}
            />
          </div>

          {/* Confirmar Contraseña */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Confirmar Contraseña
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Repite la contraseña"
              required
              disabled={loading}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
          </button>

          {/* Requisitos */}
          <div className="bg-gray-50 rounded-lg p-4 mt-6">
            <p className="text-xs font-medium text-gray-700 mb-2">
              Requisitos de la contraseña:
            </p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className="flex items-center">
                <svg
                  className="w-4 h-4 text-green-500 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Mínimo 8 caracteres
              </li>
              <li className="flex items-center">
                <svg
                  className="w-4 h-4 text-green-500 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Ambas contraseñas deben coincidir
              </li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
}