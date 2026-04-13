/**
 * Security > Gestión de Usuarios
 * Redirige al componente completo de UsersManagement (split-view con tabs: Info, Roles, Alcances)
 */

'use client';

import UsersManagement from '@/components/screens/maintenance/UsersManagement';

export default function TenantMembersPage() {
  return <UsersManagement />;
}
