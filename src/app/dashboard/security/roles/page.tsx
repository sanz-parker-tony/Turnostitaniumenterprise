/**
 * Security > Roles
 * CRUD completo de roles del sistema
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import ScreenPageShell from '@/components/ScreenPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, CheckCircle, XCircle, Shield } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Role {
  id: string;
  tenant_id: string;
  role_key: string;
  role_name: string;
  role_scope: 'SYSTEM' | 'TENANT';
  base_role_id: string | null;
  role_version: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
}

export default function RolesPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    role_key: '',
    role_name: '',
    role_scope: 'TENANT' as 'SYSTEM' | 'TENANT',
    is_active: true,
  });

  useEffect(() => {
    loadRoles();
  }, []);

  async function loadRoles() {
    setIsLoading(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRoles(data || []);
    } catch (err: any) {
      console.error('[ROLES] Error cargando roles:', err);
      toast.error('Error al cargar roles: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateModal() {
    setEditingRole(null);
    setFormData({
      role_key: '',
      role_name: '',
      role_scope: 'TENANT',
      is_active: true,
    });
    setIsModalOpen(true);
  }

  function openEditModal(role: Role) {
    setEditingRole(role);
    setFormData({
      role_key: role.role_key,
      role_name: role.role_name,
      role_scope: role.role_scope,
      is_active: role.is_active,
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    try {
      if (editingRole) {
        // UPDATE
        const { error } = await supabase
          .from('roles')
          .update({
            role_name: formData.role_name,
            role_scope: formData.role_scope,
            is_active: formData.is_active,
            updated_by: user?.email || 'system',
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRole.id);

        if (error) throw error;
        toast.success('Rol actualizado exitosamente');
      } else {
        // CREATE
        const { error } = await supabase
          .from('roles')
          .insert({
            role_key: formData.role_key,
            role_name: formData.role_name,
            role_scope: formData.role_scope,
            is_active: formData.is_active,
            created_by: user?.email || 'system',
          });

        if (error) throw error;
        toast.success('Rol creado exitosamente');
      }

      setIsModalOpen(false);
      loadRoles();
    } catch (err: any) {
      console.error('[ROLES] Error guardando rol:', err);
      toast.error('Error al guardar rol: ' + err.message);
    }
  }

  async function handleDelete(role: Role) {
    if (!confirm(`¿Está seguro de desactivar el rol "${role.role_name}"?`)) {
      return;
    }

    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('roles')
        .update({
          is_active: false,
          updated_by: user?.email || 'system',
          updated_at: new Date().toISOString(),
        })
        .eq('id', role.id);

      if (error) throw error;

      toast.success('Rol desactivado exitosamente');
      loadRoles();
    } catch (err: any) {
      console.error('[ROLES] Error desactivando rol:', err);
      toast.error('Error al desactivar rol: ' + err.message);
    }
  }

  const filteredRoles = roles.filter(role =>
    role.role_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.role_key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ScreenPageShell
      screenKey="SEC_ROLES"
      title="Gestión de Roles"
      description="Administración de roles del sistema"
    >
      <div className="space-y-6">
        {/* Header con búsqueda y botón crear */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre o clave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button onClick={openCreateModal} className="bg-[#0074D9] hover:bg-[#0056A3]">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Rol
          </Button>
        </div>

        {/* Tabla de roles */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clave
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alcance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Versión
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
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="inline-block w-8 h-8 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin"></div>
                      <p className="mt-2">Cargando roles...</p>
                    </td>
                  </tr>
                ) : filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <Shield className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No se encontraron roles</p>
                    </td>
                  </tr>
                ) : (
                  filteredRoles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono font-medium text-gray-900">
                          {role.role_key}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{role.role_name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={role.role_scope === 'SYSTEM' ? 'default' : 'secondary'}
                          className={
                            role.role_scope === 'SYSTEM'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }
                        >
                          {role.role_scope}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">v{role.role_version}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {role.is_active ? (
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
                            onClick={() => openEditModal(role)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(role)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={!role.is_active}
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
            <p className="text-sm text-gray-600">Total Roles</p>
            <p className="text-2xl font-bold text-gray-900">{roles.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Roles Activos</p>
            <p className="text-2xl font-bold text-green-600">
              {roles.filter(r => r.is_active).length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Roles Sistema</p>
            <p className="text-2xl font-bold text-purple-600">
              {roles.filter(r => r.role_scope === 'SYSTEM').length}
            </p>
          </div>
        </div>
      </div>

      {/* Modal Crear/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingRole ? 'Editar Rol' : 'Nuevo Rol'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clave del Rol *
                </label>
                <Input
                  value={formData.role_key}
                  onChange={(e) => setFormData({ ...formData, role_key: e.target.value.toUpperCase() })}
                  placeholder="ADMIN, SUPERVISOR, etc."
                  required
                  disabled={!!editingRole}
                  className="uppercase font-mono"
                />
                {editingRole && (
                  <p className="text-xs text-gray-500 mt-1">La clave no puede modificarse</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Rol *
                </label>
                <Input
                  value={formData.role_name}
                  onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                  placeholder="Administrador del Sistema"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alcance *
                </label>
                <select
                  value={formData.role_scope}
                  onChange={(e) => setFormData({ ...formData, role_scope: e.target.value as 'SYSTEM' | 'TENANT' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9]"
                  required
                >
                  <option value="TENANT">Tenant</option>
                  <option value="SYSTEM">Sistema</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  SYSTEM: Roles globales | TENANT: Roles por organización
                </p>
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
                  Rol activo
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
                  {editingRole ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ScreenPageShell>
  );
}
