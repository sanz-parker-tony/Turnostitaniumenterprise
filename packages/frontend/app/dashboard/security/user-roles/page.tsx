/**
 * Security > User Roles
 * CRUD completo de asignación de roles a usuarios
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/backend/client';
import ScreenPageShell from '@/components/ScreenPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, CheckCircle, XCircle, UserCog } from 'lucide-react';
import { toast } from 'sonner';

interface UserRole {
  id: string;
  tenant_id: string;
  user_id: string;
  role_id: string;
  company_id: string | null;
  is_active: boolean;
  valid_from: string | null;
  valid_to: string | null;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
  // Joins
  users?: { username: string; display_name: string | null; email: string | null };
  roles?: { role_key: string; role_name: string; role_scope: string };
  companies?: { company_name: string } | null;
}

interface User {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
}

interface Role {
  id: string;
  role_key: string;
  role_name: string;
  role_scope: string;
  is_active: boolean;
}

interface Company {
  id: string;
  company_name: string;
}

export default function UserRolesPage() {
  const { user } = useAuth();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserRole, setEditingUserRole] = useState<UserRole | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    user_id: '',
    role_id: '',
    company_id: '',
    is_active: true,
    valid_from: '',
    valid_to: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    const ApiClient = createClient();

    try {
      // Load user roles con joins
      const { data: userRolesData, error: urError } = await ApiClient
        .from('user_roles')
        .select(`
          *,
          users!inner (username, display_name, email),
          roles!inner (role_key, role_name, role_scope),
          companies (company_name)
        `)
        .order('created_at', { ascending: false });

      if (urError) throw urError;

      // Load users para dropdown
      const { data: usersData, error: usersError } = await ApiClient
        .from('users')
        .select('id, username, display_name, email')
        .eq('is_active', true)
        .order('username');

      if (usersError) throw usersError;

      // Load roles para dropdown
      const { data: rolesData, error: rolesError } = await ApiClient
        .from('roles')
        .select('id, role_key, role_name, role_scope, is_active')
        .eq('is_active', true)
        .order('role_name');

      if (rolesError) throw rolesError;

      // Load companies para dropdown
      const { data: companiesData, error: companiesError } = await ApiClient
        .from('companies')
        .select('id, company_name')
        .eq('is_active', true)
        .order('company_name');

      if (companiesError) {
        console.warn('[USER_ROLES] Companies not available:', companiesError);
      }

      setUserRoles(userRolesData || []);
      setUsers(usersData || []);
      setRoles(rolesData || []);
      setCompanies(companiesData || []);
    } catch (err: any) {
      console.error('[USER_ROLES] Error cargando datos:', err);
      toast.error('Error al cargar datos: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateModal() {
    setEditingUserRole(null);
    setFormData({
      user_id: '',
      role_id: '',
      company_id: '',
      is_active: true,
      valid_from: '',
      valid_to: '',
    });
    setIsModalOpen(true);
  }

  function openEditModal(userRole: UserRole) {
    setEditingUserRole(userRole);
    setFormData({
      user_id: userRole.user_id,
      role_id: userRole.role_id,
      company_id: userRole.company_id || '',
      is_active: userRole.is_active,
      valid_from: userRole.valid_from ? userRole.valid_from.split('T')[0] : '',
      valid_to: userRole.valid_to ? userRole.valid_to.split('T')[0] : '',
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ApiClient = createClient();

    try {
      const payload = {
        user_id: formData.user_id,
        role_id: formData.role_id,
        company_id: formData.company_id || null,
        is_active: formData.is_active,
        valid_from: formData.valid_from || null,
        valid_to: formData.valid_to || null,
      };

      if (editingUserRole) {
        // UPDATE
        const { error } = await ApiClient
          .from('user_roles')
          .update({
            ...payload,
            updated_by: user?.email || 'system',
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingUserRole.id);

        if (error) throw error;
        toast.success('Asignación actualizada exitosamente');
      } else {
        // CREATE
        const { error } = await ApiClient
          .from('user_roles')
          .insert({
            ...payload,
            created_by: user?.email || 'system',
          });

        if (error) throw error;
        toast.success('Rol asignado exitosamente');
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error('[USER_ROLES] Error guardando asignación:', err);
      toast.error('Error al guardar asignación: ' + err.message);
    }
  }

  async function handleDelete(userRole: UserRole) {
    const userName = userRole.users?.display_name || userRole.users?.username;
    const roleName = userRole.roles?.role_name;
    
    if (!confirm(`¿Está seguro de desactivar la asignación de "${roleName}" a "${userName}"?`)) {
      return;
    }

    const ApiClient = createClient();

    try {
      const { error } = await ApiClient
        .from('user_roles')
        .update({
          is_active: false,
          updated_by: user?.email || 'system',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userRole.id);

      if (error) throw error;

      toast.success('Asignación desactivada exitosamente');
      loadData();
    } catch (err: any) {
      console.error('[USER_ROLES] Error desactivando asignación:', err);
      toast.error('Error al desactivar asignación: ' + err.message);
    }
  }

  const filteredUserRoles = userRoles.filter(ur => {
    const userName = ur.users?.display_name || ur.users?.username || '';
    const roleName = ur.roles?.role_name || '';
    const search = searchTerm.toLowerCase();
    return userName.toLowerCase().includes(search) || roleName.toLowerCase().includes(search);
  });

  return (
    <ScreenPageShell
      screenKey="SEC_USER_ROLES"
      title="Asignación de Roles"
      description="Gestión de roles asignados a usuarios"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por usuario o rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button onClick={openCreateModal} className="bg-[#0074D9] hover:bg-[#0056A3]">
            <Plus className="w-4 h-4 mr-2" />
            Asignar Rol
          </Button>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alcance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vigencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <div className="inline-block w-8 h-8 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin"></div>
                      <p className="mt-2">Cargando asignaciones...</p>
                    </td>
                  </tr>
                ) : filteredUserRoles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <UserCog className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No se encontraron asignaciones de roles</p>
                    </td>
                  </tr>
                ) : (
                  filteredUserRoles.map((ur) => (
                    <tr key={ur.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {ur.users?.display_name || ur.users?.username}
                          </div>
                          <div className="text-xs text-gray-500">{ur.users?.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {ur.roles?.role_name}
                          </div>
                          <div className="text-xs font-mono text-gray-500">{ur.roles?.role_key}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={ur.roles?.role_scope === 'SYSTEM' ? 'default' : 'secondary'}
                          className={
                            ur.roles?.role_scope === 'SYSTEM'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }
                        >
                          {ur.roles?.role_scope}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {ur.companies?.company_name || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-600">
                          {ur.valid_from && (
                            <div>Desde: {new Date(ur.valid_from).toLocaleDateString()}</div>
                          )}
                          {ur.valid_to && (
                            <div>Hasta: {new Date(ur.valid_to).toLocaleDateString()}</div>
                          )}
                          {!ur.valid_from && !ur.valid_to && '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ur.is_active ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactivo
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(ur)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(ur)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={!ur.is_active}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Total Asignaciones</p>
            <p className="text-2xl font-bold text-gray-900">{userRoles.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Asignaciones Activas</p>
            <p className="text-2xl font-bold text-green-600">
              {userRoles.filter(ur => ur.is_active).length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Usuarios con Roles</p>
            <p className="text-2xl font-bold text-blue-600">
              {new Set(userRoles.filter(ur => ur.is_active).map(ur => ur.user_id)).size}
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingUserRole ? 'Editar Asignación de Rol' : 'Nueva Asignación de Rol'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuario *
                </label>
                <select
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9]"
                  required
                  disabled={!!editingUserRole}
                >
                  <option value="">Seleccione un usuario...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.display_name || u.username} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol *
                </label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9]"
                  required
                  disabled={!!editingUserRole}
                >
                  <option value="">Seleccione un rol...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.role_name} ({r.role_key}) - {r.role_scope}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa (Opcional)
                </label>
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9]"
                >
                  <option value="">Sin empresa específica</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Restringe el rol a una empresa específica
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Válido Desde
                  </label>
                  <Input
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Válido Hasta
                  </label>
                  <Input
                    type="date"
                    value={formData.valid_to}
                    onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-[#0074D9] focus:ring-[#0074D9]"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Asignación activa
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#0074D9] hover:bg-[#0056A3]"
                >
                  {editingUserRole ? 'Actualizar' : 'Asignar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ScreenPageShell>
  );
}