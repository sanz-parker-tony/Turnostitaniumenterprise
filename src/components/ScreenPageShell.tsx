/**
 * Screen Page Shell - Template Component
 * Componente reutilizable para páginas de screens con validación de permisos
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import LayoutNew from '@/components/LayoutNewAppRouter';
import { Shield, AlertCircle } from 'lucide-react';

interface ScreenPageShellProps {
  screenKey: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export default function ScreenPageShell({
  screenKey,
  title,
  description,
  children,
}: ScreenPageShellProps) {
  const { user, profile, isLoading: authLoading } = useAuth();
  const { menuScreens, isLoading: permsLoading } = usePermissions();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    // Redirect si no hay sesión
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    // Validar acceso a la pantalla
    if (!permsLoading && menuScreens && profile) {
      // ✅ Super Admin tiene acceso TOTAL
      const isSuperAdmin = profile?.is_super_admin === true || profile?.role_scope === 'SYSTEM';
      
      // ✅ O tiene la pantalla en su menú
      const screenAllowed = menuScreens.some(s => s.screen_key === screenKey);
      
      const hasPermission = isSuperAdmin || screenAllowed;
      
      console.log(`[SCREEN-SHELL] Validando acceso a ${screenKey}:`, {
        isSuperAdmin,
        screenAllowed,
        hasPermission,
        profile: {
          is_super_admin: profile?.is_super_admin,
          role_scope: profile?.role_scope,
          role_key: profile?.role_key
        }
      });
      
      setHasAccess(hasPermission);

      if (!hasPermission) {
        console.warn(`[SCREEN-SHELL] Acceso denegado a ${screenKey}, redirigiendo...`);
        // Opcional: redirigir a dashboard o mostrar error
        // router.push('/dashboard');
      }
    }
  }, [user, profile, authLoading, menuScreens, permsLoading, screenKey, router]);

  // Loading state
  if (authLoading || permsLoading || hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block size-12 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!hasAccess) {
    return (
      <LayoutNew>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 flex flex-col items-center justify-center min-h-[400px]">
            <Shield className="size-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-semibold text-red-900 mb-2">Acceso Denegado</h2>
            <p className="text-red-700 text-center mb-4">
              No tienes permisos para acceder a esta pantalla.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-[#0074D9] text-white rounded-lg hover:bg-[#0056A3] transition-colors"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      </LayoutNew>
    );
  }

  // Authorized - Render content
  return (
    <LayoutNew>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-gray-900">{title}</h1>
          {description && (
            <p className="text-gray-600 mt-2">{description}</p>
          )}
        </div>

        {/* Content */}
        {children || (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center text-gray-500">
              <AlertCircle className="size-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">🚧 Módulo en Construcción</p>
              <p className="text-sm">Esta funcionalidad estará disponible próximamente</p>
            </div>
          </div>
        )}
      </div>
    </LayoutNew>
  );
}