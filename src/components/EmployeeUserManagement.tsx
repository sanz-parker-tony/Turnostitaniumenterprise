/**
 * EmployeeUserManagement.tsx
 * Componente para gestionar el acceso al sistema de un empleado
 * Muestra información del usuario y permite resetear contraseña, activar/desactivar
 */

import { useState, useEffect } from 'react';
import { User, Lock, Mail, Phone, CheckCircle2, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';

interface EmployeeUserManagementProps {
  employeeId: string;
  employeeEmail: string; // email_work del empleado
  onUserCreated?: () => void;
}

export default function EmployeeUserManagement({ 
  employeeId, 
  employeeEmail,
  onUserCreated 
}: EmployeeUserManagementProps) {
  const [hasUser, setHasUser] = useState(false);
  const [userStatus, setUserStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetCredentials, setResetCredentials] = useState<{ username: string; password: string } | null>(null);

  useEffect(() => {
    checkUserStatus();
  }, [employeeId]);

  const checkUserStatus = async () => {
    // Aquí verificaríamos si el empleado tiene usuario
    // Por ahora, simulamos basándonos en si tiene email
    setIsLoading(false);
    setHasUser(false); // Lo dejamos en false para que se pueda crear
  };

  const handleCreateUser = async () => {
    if (!employeeEmail) {
      toast.error('El empleado necesita un email corporativo para crear acceso al sistema');
      return;
    }

    setIsCreating(true);

    try {
      // Obtener el token de Supabase
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/employees/create-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            employee_id: employeeId,
            email_work: employeeEmail
          })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error creando usuario');
      }

      const data = await response.json();
      
      // Mostrar credenciales
      setResetCredentials({
        username: data.username,
        password: data.initial_password
      });
      setShowResetModal(true);
      setHasUser(true);
      
      toast.success('Usuario creado exitosamente');
      onUserCreated?.();
    } catch (error: any) {
      console.error('Error creando usuario:', error);
      toast.error(error.message || 'Error creando usuario');
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetPassword = async () => {
    setIsResetting(true);

    try {
      // Obtener el token de Supabase
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/employees/reset-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            employee_id: employeeId
          })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error reseteando contraseña');
      }

      const data = await response.json();
      
      // Mostrar credenciales
      setResetCredentials({
        username: data.username,
        password: data.new_password
      });
      setShowResetModal(true);
      
      toast.success('Contraseña reseteada exitosamente');
    } catch (error: any) {
      console.error('Error reseteando contraseña:', error);
      toast.error(error.message || 'Error reseteando contraseña');
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleStatus = async (newStatus: boolean) => {
    setIsToggling(true);

    try {
      // Obtener el token de Supabase
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/employees/toggle-user-status`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            employee_id: employeeId,
            is_active: newStatus
          })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error cambiando estado');
      }

      setUserStatus({ ...userStatus, is_active: newStatus });
      toast.success(`Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`);
    } catch (error: any) {
      console.error('Error cambiando estado:', error);
      toast.error(error.message || 'Error cambiando estado');
    } finally {
      setIsToggling(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Acceso al Sistema</h3>
        </div>
        <p className="text-sm text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!hasUser) {
    return (
      <>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                El empleado no tiene acceso al sistema
              </h3>
              <p className="text-sm text-blue-700 mb-4">
                {employeeEmail 
                  ? 'Puedes crear un usuario para que pueda acceder al módulo KIOSK.'
                  : 'Primero agrega un email corporativo en los datos del empleado para poder crear acceso al sistema.'}
              </p>
              {employeeEmail && (
                <button
                  type="button"
                  onClick={handleCreateUser}
                  disabled={isCreating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creando usuario...</span>
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4" />
                      <span>Crear acceso al sistema</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal de credenciales */}
        {showResetModal && resetCredentials && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Usuario creado</h3>
                <p className="text-gray-600 mt-2">
                  Comparte estas credenciales con el empleado
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Usuario</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded border border-gray-200 text-sm">
                      {resetCredentials.username}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(resetCredentials.username)}
                      className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                    >
                      Copiar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Contraseña temporal
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded border border-gray-200 text-sm">
                      {resetCredentials.password}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(resetCredentials.password)}
                      className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                <p className="text-xs text-yellow-800">
                  <strong>Importante:</strong> El empleado deberá cambiar su contraseña en el primer inicio de sesión.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetCredentials(null);
                }}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Acceso al Sistema</h3>
          </div>
          {userStatus?.is_active ? (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Activo
            </span>
          ) : (
            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              Inactivo
            </span>
          )}
        </div>

        <div className="space-y-4">
          {/* Usuario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={employeeEmail}
                disabled
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">El usuario no se puede modificar</p>
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value="••••••••"
                  disabled
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isResetting}
                className="px-4 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isResetting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">Resetear</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Resetear volverá la contraseña a la inicial (parte antes del @)
            </p>
          </div>

          {/* Email y Teléfono (solo informativos, se editan en los datos del empleado) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={employeeEmail || ''}
                  disabled
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  value={userStatus?.phone || '-'}
                  disabled
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Botón de activar/desactivar */}
          <div className="pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => handleToggleStatus(!userStatus?.is_active)}
              disabled={isToggling}
              className={`w-full px-4 py-2.5 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                userStatus?.is_active 
                  ? 'bg-red-100 hover:bg-red-200 text-red-700' 
                  : 'bg-green-100 hover:bg-green-200 text-green-700'
              }`}
            >
              {isToggling ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : userStatus?.is_active ? (
                <>
                  <XCircle className="w-5 h-5" />
                  <span>Desactivar acceso al sistema</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Activar acceso al sistema</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de credenciales después de reset */}
      {showResetModal && resetCredentials && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Contraseña reseteada</h3>
              <p className="text-gray-600 mt-2">
                Comparte estas credenciales con el empleado
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Usuario</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border border-gray-200 text-sm">
                    {resetCredentials.username}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(resetCredentials.username)}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Contraseña temporal
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border border-gray-200 text-sm">
                    {resetCredentials.password}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(resetCredentials.password)}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <p className="text-xs text-yellow-800">
                <strong>Importante:</strong> El empleado deberá cambiar su contraseña en el primer inicio de sesión.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowResetModal(false);
                setResetCredentials(null);
              }}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}