/**
 * ChangePasswordModal.tsx
 * Cambio de contraseña con verificación de la contraseña actual.
 */

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, X } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClient } from '../lib/api-client';
import { buildApiUrl } from '../utils/api-config';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordChanged?: () => void;
  mode?: 'authenticated' | 'login';
  initialLoginId?: string;
}

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggleVisibility: () => void;
  autoComplete: string;
  placeholder: string;
  disabled: boolean;
};

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggleVisibility,
  autoComplete,
  placeholder,
  disabled,
}: PasswordFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          disabled={disabled}
          autoComplete={autoComplete}
          className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          disabled={disabled}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
  onPasswordChanged,
  mode = 'authenticated',
  initialLoginId = '',
}: ChangePasswordModalProps) {
  const [loginId, setLoginId] = useState(initialLoginId);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoginId(initialLoginId.trim());
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsLoading(false);
    setError('');
  }, [initialLoginId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const normalizedLoginId = loginId.trim();
    if (mode === 'login' && !normalizedLoginId) {
      setError('Ingrese su usuario o correo.');
      return;
    }
    if (!currentPassword) {
      setError('Ingrese su contraseña actual.');
      return;
    }
    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }
    if (currentPassword === newPassword) {
      setError('La nueva contraseña debe ser diferente de la actual.');
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/change-password' : '/users/change-password';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (mode === 'authenticated') {
        const { data: sessionData } = await ApiClient.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) throw new Error('No hay una sesión activa. Inicie sesión nuevamente.');
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(buildApiUrl(endpoint), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...(mode === 'login' ? { loginId: normalizedLoginId } : {}),
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo cambiar la contraseña.');
      }

      toast.success('Contraseña actualizada correctamente.');
      onPasswordChanged?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'No se pudo cambiar la contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <KeyRound className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <h2 id="change-password-title" className="text-xl font-semibold text-gray-900">
                Cambiar contraseña
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Confirme su contraseña actual antes de definir una nueva.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed"
            aria-label="Cerrar cambio de contraseña"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {mode === 'login' && (
            <div>
              <label htmlFor="change-password-login-id" className="block text-sm font-medium text-gray-700 mb-2">
                Usuario o correo
              </label>
              <input
                id="change-password-login-id"
                type="text"
                value={loginId}
                onChange={(event) => setLoginId(event.target.value)}
                required
                disabled={isLoading}
                autoComplete="username"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="usuario@empresa.com o usuario.apellido"
              />
            </div>
          )}

          <PasswordField
            id="change-password-current"
            label="Contraseña actual"
            value={currentPassword}
            onChange={setCurrentPassword}
            visible={showCurrentPassword}
            onToggleVisibility={() => setShowCurrentPassword((value) => !value)}
            autoComplete="current-password"
            placeholder="Ingrese su contraseña actual"
            disabled={isLoading}
          />
          <PasswordField
            id="change-password-new"
            label="Nueva contraseña"
            value={newPassword}
            onChange={setNewPassword}
            visible={showNewPassword}
            onToggleVisibility={() => setShowNewPassword((value) => !value)}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            disabled={isLoading}
          />
          <PasswordField
            id="change-password-confirm"
            label="Confirmar nueva contraseña"
            value={confirmPassword}
            onChange={setConfirmPassword}
            visible={showConfirmPassword}
            onToggleVisibility={() => setShowConfirmPassword((value) => !value)}
            autoComplete="new-password"
            placeholder="Repita la nueva contraseña"
            disabled={isLoading}
          />

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`h-4 w-4 ${newPassword.length >= 8 ? 'text-green-600' : 'text-blue-400'}`} />
              Mínimo 8 caracteres
            </div>
            <div className="mt-1 flex items-center gap-2">
              <CheckCircle2 className={`h-4 w-4 ${newPassword && newPassword === confirmPassword ? 'text-green-600' : 'text-blue-400'}`} />
              La nueva contraseña y su confirmación coinciden
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {isLoading ? 'Actualizando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
