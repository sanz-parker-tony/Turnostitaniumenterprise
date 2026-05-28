/**
 * AuthDiagnostics - Herramienta de diagnóstico de ApiClient Auth
 * Muestra información sobre la configuración y estado del sistema
 */

import { buildApiUrl } from '../utils/api-config';
import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { projectId, publicApiToken } from '../utils/backend/info';

export function AuthDiagnostics() {
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    setError('');

    try {
      const url = buildApiUrl(`/auth/diagnostics`);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicApiToken}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener diagnósticos');
      }

      setDiagnostics(data);
    } catch (err: any) {
      console.error('Error en diagnósticos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-lg">Ejecutando diagnósticos...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            🔍 Diagnóstico de ApiClient Auth
          </h1>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {diagnostics && (
            <>
              {/* Resumen */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 font-medium">Auth Users</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {diagnostics.summary?.authUsersCount || 0}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium">Public Users</p>
                  <p className="text-2xl font-bold text-green-900">
                    {diagnostics.summary?.publicUsersCount || 0}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-600 font-medium">System Admin</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {diagnostics.summary?.systemAdminExists ? '✓' : '✗'}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm text-orange-600 font-medium">In Public</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {diagnostics.summary?.systemAdminInPublic ? '✓' : '✗'}
                  </p>
                </div>
              </div>

              {/* Instrucciones */}
              {diagnostics.instructions && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">
                        {diagnostics.instructions.message}
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        {diagnostics.instructions.solution}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Auth Users */}
              {diagnostics.authUsers && diagnostics.authUsers.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Usuarios en auth.users
                  </h3>
                  <div className="space-y-2">
                    {diagnostics.authUsers.map((user: any) => (
                      <div
                        key={user.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-800">{user.email}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              ID: {user.id}
                            </p>
                            <p className="text-xs text-gray-500">
                              Creado: {new Date(user.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            {user.email_confirmed_at ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Public Users */}
              {diagnostics.publicUsers && diagnostics.publicUsers.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Usuarios en public.users
                  </h3>
                  <div className="space-y-2">
                    {diagnostics.publicUsers.map((user: any) => (
                      <div
                        key={user.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-800">
                              {user.username} ({user.email})
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              ID: {user.id}
                            </p>
                            <p className="text-xs text-gray-500">
                              Auth ID: {user.auth_user_id || 'NO VINCULADO'}
                            </p>
                          </div>
                          <div>
                            {user.is_active ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* System Admin Details */}
              {diagnostics.systemAdmin && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">
                    ✓ System Admin Encontrado
                  </h3>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>Email: {diagnostics.systemAdmin.email}</p>
                    <p>ID: {diagnostics.systemAdmin.id}</p>
                    <p>Confirmado: {diagnostics.systemAdmin.confirmed ? 'Sí' : 'No'}</p>
                    <p>Creado: {new Date(diagnostics.systemAdmin.created_at).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={runDiagnostics}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🔄 Actualizar
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  ← Volver
                </button>
              </div>
            </>
          )}
        </div>

        {/* Guía rápida */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            📋 Solución al error "Database error creating new user"
          </h2>
          
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Opción 1: Desactivar confirmaciones de email</h3>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Ve a <strong>ApiClient Dashboard → Authentication → Email Auth</strong></li>
                <li>Desactiva <strong>"Enable email confirmations"</strong></li>
                <li>Guarda cambios</li>
                <li>Reintenta crear el usuario</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Opción 2: Crear usuario manualmente</h3>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Ve a <strong>ApiClient Dashboard → Authentication → Users</strong></li>
                <li>Click <strong>"Add user" → "Create new user"</strong></li>
                <li>Email: <code className="bg-gray-100 px-1 rounded">system.admin@titanium-labs.com</code></li>
                <li>Password: <code className="bg-gray-100 px-1 rounded">(tu contraseña)</code></li>
                <li>Activa <strong>"Auto Confirm User"</strong> ✓</li>
                <li>Click "Create user"</li>
                <li>Refresca esta página</li>
                <li>Inicia sesión con el email/password que creaste</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

