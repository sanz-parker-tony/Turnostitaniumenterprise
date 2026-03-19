/**
 * Security > Tenant Members
 * CRUD completo de usuarios del tenant
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import ScreenPageShell from '@/components/ScreenPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, CheckCircle, XCircle, Users, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  tenant_id: string;
  auth_user_id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  preferred_language_code: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
}

interface Language {
  code: string;
  name: string;
}

export default function TenantMembersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    email: '',
    phone: '',
    preferred_language_code: 'es',
    is_active: true,
    password: '',
  });

  useEffect(() => {
    loadUsers();
    loadLanguages();
  }, []);

  async function loadLanguages() {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('system_languages')
        .select('code, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setLanguages(data || []);
    } catch (err: any) {
      console.error('[USERS] Error cargando idiomas:', err);
    }
  }

  async function loadUsers() {
    setIsLoading(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (err: any) {
      console.error('[USERS] Error cargando usuarios:', err);
      toast.error('Error al cargar usuarios: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateModal() {
    setEditingUser(null);
    setFormData({
      username: '',
      display_name: '',
      email: '',
      phone: '',
      preferred_language_code: 'es',
      is_active: true,
      password: '',
    });
    setIsModalOpen(true);
  }

  function openEditModal(user: User) {
    setEditingUser(user);
    setFormData({
      username: user.username,
      display_name: user.display_name || '',
      email: user.email || '',
      phone: user.phone || '',
      preferred_language_code: user.preferred_language_code || 'es',
      is_active: user.is_active,
      password: '',
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    try {
      if (editingUser) {
        // UPDATE - Solo actualiza tabla users
        const { error } = await supabase
          .from('users')
          .update({
            display_name: formData.display_name || null,
            email: formData.email || null,
            phone: formData.phone || null,
            preferred_language_code: formData.preferred_language_code || null,
            is_active: formData.is_active,
            updated_by: user?.email || 'system',
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingUser.id);

        if (error) throw error;
        toast.success('Usuario actualizado exitosamente');
      } else {
        // CREATE - Necesita crear en auth.users primero
        if (!formData.email || !formData.password) {
          toast.error('Email y contraseña son requeridos para crear usuario');
          return;
        }

        // 1. Crear usuario en auth.users
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              display_name: formData.display_name,
            }
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('No se pudo crear el usuario en auth');

        // 2. Crear usuario en public.users
        const { error: userError } = await supabase
          .from('users')
          .insert({
            auth_user_id: authData.user.id,
            username: formData.username,
            display_name: formData.display_name || null,
            email: formData.email,
            phone: formData.phone || null,
            preferred_language_code: formData.preferred_language_code || 'es',
            is_active: formData.is_active,
            created_by: user?.email || 'system',
          });

        if (userError) throw userError;
        toast.success('Usuario creado exitosamente');
      }

      setIsModalOpen(false);
      loadUsers();
    } catch (err: any) {
      console.error('[USERS] Error guardando usuario:', err);
      toast.error('Error al guardar usuario: ' + err.message);
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`¿Está seguro de desactivar el usuario "${user.display_name || user.username}"?`)) {
      return;
    }

    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_active: false,
          updated_by: user?.email || 'system',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Usuario desactivado exitosamente');
      loadUsers();
    } catch (err: any) {
      console.error('[USERS] Error desactivando usuario:', err);
      toast.error('Error al desactivar usuario: ' + err.message);
    }
  }

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ScreenPageShell
      screenKey="SEC_TENANT_MEMBERS"
      title="Usuarios del Tenant"
      description="Administración de usuarios y miembros del tenant"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, usuario o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button onClick={openCreateModal} className="bg-[#0074D9] hover:bg-[#0056A3]">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Usuario
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
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Idioma
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
                      <p className="mt-2">Cargando usuarios...</p>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No se encontraron usuarios</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono font-medium text-gray-900">
                          {u.username}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{u.display_name || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4" />
                          {u.email || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          {u.phone || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary" className="uppercase">
                          {u.preferred_language_code || 'es'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.is_active ? (
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
                            onClick={() => openEditModal(u)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(u)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={!u.is_active}
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
            <p className="text-sm text-gray-600">Total Usuarios</p>
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Usuarios Activos</p>
            <p className="text-2xl font-bold text-green-600">
              {users.filter(u => u.is_active).length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Últimos 7 días</p>
            <p className="text-2xl font-bold text-blue-600">
              {users.filter(u => {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                return new Date(u.created_at) > sevenDaysAgo;
              }).length}
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 my-8">
            <h2 className="text-xl font-bold mb-4">
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usuario * <span className="text-xs text-gray-500">(username)</span>
                  </label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="jdoe"
                    required
                    disabled={!!editingUser}
                    className="font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Completo
                  </label>
                  <Input
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email * {!editingUser && <span className="text-xs text-gray-500">(requerido para crear)</span>}
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  required={!editingUser}
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña *
                  </label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Mínimo 6 caracteres. El usuario podrá cambiarla después.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Idioma Preferido
                  </label>
                  <select
                    value={formData.preferred_language_code}
                    onChange={(e) => setFormData({ ...formData, preferred_language_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9]"
                  >
                    {languages.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
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
                  Usuario activo
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
                  {editingUser ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ScreenPageShell>
  );
}