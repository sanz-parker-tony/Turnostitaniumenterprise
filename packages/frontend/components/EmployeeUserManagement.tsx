import { useState } from 'react';
import { ApiClient } from '../lib/api-client';
import { toast } from 'sonner';

interface EmployeeUserManagementProps {
  employeeId: string;
  employeeEmail: string;
  onUserCreated?: () => void;
}

async function getToken(): Promise<string> {
  const { data } = await ApiClient.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('No hay sesión activa');
  return token;
}

export default function EmployeeUserManagement({
  employeeId,
  employeeEmail,
  onUserCreated,
}: EmployeeUserManagementProps) {
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);

  const runAction = async (path: string, body: Record<string, any>) => {
    setBusy(true);
    try {
      const token = await getToken();
      const res = await fetch(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Operación fallida');
      return payload;
    } finally {
      setBusy(false);
    }
  };

  const createUser = async () => {
    try {
      if (!employeeEmail) throw new Error('El empleado no tiene email corporativo');
      const data = await runAction('http://localhost:3001/make-server-e19f2094/employees/create-user', {
        employee_id: employeeId,
        email_work: employeeEmail,
      });
      setCredentials({
        username: data.username,
        password: data.initial_password,
      });
      toast.success('Usuario de empleado creado');
      onUserCreated?.();
    } catch (e: any) {
      toast.error(e.message || 'No se pudo crear el usuario');
    }
  };

  const resetPassword = async () => {
    try {
      const data = await runAction('http://localhost:3001/make-server-e19f2094/employees/reset-password', {
        employee_id: employeeId,
      });
      setCredentials({
        username: data.username,
        password: data.new_password,
      });
      toast.success('Contraseña reseteada');
    } catch (e: any) {
      toast.error(e.message || 'No se pudo resetear');
    }
  };

  const activate = async (isActive: boolean) => {
    try {
      await runAction('http://localhost:3001/make-server-e19f2094/employees/toggle-user-status', {
        employee_id: employeeId,
        is_active: isActive,
      });
      toast.success(`Usuario ${isActive ? 'activado' : 'desactivado'}`);
    } catch (e: any) {
      toast.error(e.message || 'No se pudo cambiar estado');
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <h3 className="font-semibold text-gray-900">Acceso al Sistema</h3>
      <p className="text-sm text-gray-600">
        Usuario base: <strong>{employeeEmail || 'sin email'}</strong>
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !employeeEmail}
          onClick={createUser}
          className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
        >
          Crear Usuario
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={resetPassword}
          className="px-3 py-2 rounded bg-amber-600 text-white text-sm disabled:opacity-50"
        >
          Resetear Contraseña
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => activate(true)}
          className="px-3 py-2 rounded bg-green-600 text-white text-sm disabled:opacity-50"
        >
          Activar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => activate(false)}
          className="px-3 py-2 rounded bg-red-600 text-white text-sm disabled:opacity-50"
        >
          Desactivar
        </button>
      </div>

      {credentials && (
        <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm">
          <p><strong>Usuario:</strong> {credentials.username}</p>
          <p><strong>Contraseña temporal:</strong> {credentials.password}</p>
        </div>
      )}
    </div>
  );
}

