import { buildApiUrl } from '../utils/api-config';
import { useState } from 'react';
import { ApiClient } from '../lib/api-client';

export function ForcePasswordChange() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      const { data: sessionData } = await ApiClient.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('No hay sesión activa');

      const updateResponse = await fetch(buildApiUrl('/users/change-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });

      if (!updateResponse.ok) {
        const payload = await updateResponse.json().catch(() => ({}));
        throw new Error(payload.error || 'Error actualizando contraseña');
      }

      const { data: userData } = await ApiClient.auth.getUser();
      const user = userData?.user;

      if (user?.id) {
        await fetch(buildApiUrl('/users/update-password-flag'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            auth_user_id: user.id,
            must_change_password: false,
          }),
        });
      }

      alert('Contraseña actualizada exitosamente. Ahora puedes usar el sistema.');
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err?.message || 'Error inesperado al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Cambio de Contraseña Obligatorio</h1>
        <p className="text-sm text-gray-600 mb-6">
          Por seguridad, debes cambiar tu contraseña temporal antes de continuar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Nueva Contraseña
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Contraseña
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}

