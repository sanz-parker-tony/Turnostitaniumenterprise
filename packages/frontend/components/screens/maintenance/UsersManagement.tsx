/**
 * UsersManagement.tsx - Gestión de Usuarios
 * Turnos Titanium Enterprise
 *
 * Pantalla de mantenimiento para users, user_roles y user_role_scopes
 * Ubicación: Mantenimiento → Usuarios
 *
 * Tabs:
 *  1. Usuarios: CRUD de la tabla users
 *  2. (panel lateral al seleccionar usuario) Roles y Alcances del usuario
 */

'use client';

import { useState, useEffect } from 'react';
import {
  AlertCircle, Plus, Edit2, Power, PowerOff, Search, X,
  Users, User, Shield,
  Key, Clock, ChevronRight, Trash2,
  Mail, Phone, Globe, Building,
} from 'lucide-react';
import { projectId, publicApiToken } from '@/utils/backend/info';
import { useAuth } from '@/contexts/AuthContext';
import SystemAdminPageHeader from '@/components/shared/SystemAdminPageHeader';
import HeaderRefreshButton from '@/components/shared/HeaderRefreshButton';

// ============================================================================
// TIPOS
// ============================================================================

interface AppUser {
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
  // joins
  tenant_key?: string | null;
  tenant_name?: string | null;
  language_name?: string | null;
}

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
  updated_at: string | null;
  // joins
  role_key?: string | null;
  role_name?: string | null;
  role_scope?: string | null;
  data_scope?: string | null;
  company_name?: string | null;
}

interface UserRoleScope {
  id: string;
  tenant_id: string;
  user_role_id: string;
  scope_type_id: string;
  scope_entity_id: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  // joins
  scope_type_key?: string | null;
  scope_type_name?: string | null;
}

interface UserRoleSummary {
  user_id: string;
  primary_role_name: string | null;
  primary_role_key: string | null;
  role_count: number;
}

interface Tenant { id: string; tenant_key: string; tenant_name: string; }
interface Role { id: string; role_key: string; role_name: string; role_scope: string; tenant_id: string; }
interface ScopeType { id: string; scope_type_key: string; scope_type_name: string; }
interface Company { id: string; company_name: string; tenant_id: string; }
interface Language { code: string; language_name: string; }

type MainTab = 'users' | 'all-roles' | 'all-scopes';
type UserDetailTab = 'info' | 'roles';

function getToken(): string {
  return localStorage.getItem('tt-access-token') || publicApiToken;
}

const API_BASE = `http://localhost:3001/users-management`;

const SCOPE_COLORS: Record<string, string> = {
  SYSTEM: 'bg-purple-100 text-purple-700',
  TENANT: 'bg-blue-100 text-blue-700',
  SCOPE: 'bg-green-100 text-green-700',
  SELF: 'bg-gray-100 text-gray-600',
};

const ROLE_SCOPE_LABELS: Record<string, string> = {
  SYSTEM: 'Sistema',
  TENANT: 'Tenant',
  SCOPE: 'Alcance',
  SELF: 'Propio',
};

const DATA_SCOPE_LABELS: Record<string, string> = {
  ALL: 'Todos los datos',
  DIRECT_REPORTS: 'Reportes directos',
  SELF: 'Solo propio',
};

function shortId(value?: string | null): string {
  if (!value) return '-';
  const s = String(value);
  return s.length <= 12 ? s : `${s.slice(0, 8)}...${s.slice(-4)}`;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function UsersManagement() {
  const { profile } = useAuth();

  // Datos principales
  const [users, setUsers] = useState<AppUser[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [scopeTypes, setScopeTypes] = useState<ScopeType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [userRoleSummaries, setUserRoleSummaries] = useState<Record<string, UserRoleSummary>>({});

  // Estado del usuario seleccionado y sus sub-datos
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [selectedUserRole, setSelectedUserRole] = useState<UserRole | null>(null);
  const [roleScopesByUserRoleId, setRoleScopesByUserRoleId] = useState<Record<string, UserRoleScope[]>>({});

  // UI state
  const [mainTab, setMainTab] = useState<MainTab>('users');
  const [userDetailTab, setUserDetailTab] = useState<UserDetailTab>('info');
  const [loading, setLoading] = useState(true);
  const [userRolesLoading, setUserRolesLoading] = useState(false);
  const [scopeLoadingByRoleId, setScopeLoadingByRoleId] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<keyof AppUser>('username');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modales
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userForm, setUserForm] = useState({
    tenant_id: '', username: '', display_name: '', email: '',
    phone: '', preferred_language_code: '', password: '', confirm_password: '', is_active: true,
  });
  const [userFormErrors, setUserFormErrors] = useState<Record<string, string>>({});
  const [userSaving, setUserSaving] = useState(false);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingUserRole, setEditingUserRole] = useState<UserRole | null>(null);
  const [roleForm, setRoleForm] = useState({
    tenant_id: '', role_id: '', company_id: '', valid_from: '', valid_to: '', is_active: true,
  });
  const [roleFormErrors, setRoleFormErrors] = useState<Record<string, string>>({});
  const [roleSaving, setRoleSaving] = useState(false);

  const [isScopeModalOpen, setIsScopeModalOpen] = useState(false);
  const [editingScope, setEditingScope] = useState<UserRoleScope | null>(null);
  const [scopeTargetUserRoleId, setScopeTargetUserRoleId] = useState<string>('');
  const [scopeForm, setScopeForm] = useState({ tenant_id: '', scope_type_id: '', scope_entity_id: '', is_active: true });
  const [scopeFormErrors, setScopeFormErrors] = useState<Record<string, string>>({});
  const [scopeSaving, setScopeSaving] = useState(false);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const tenantsById = new Map(tenants.map((t) => [t.id, t.tenant_name]));
  const companiesById = new Map(companies.map((c) => [c.id, c.company_name]));
  const scopeTypesById = new Map(scopeTypes.map((st) => [st.id, st]));

  const resolveScopeEntityLabel = (scope: UserRoleScope): string => {
    const key = String(scope.scope_type_key || '').toUpperCase();
    const entityId = scope.scope_entity_id;
    if (!entityId) return 'Entidad no definida';

    if (key.includes('TENANT')) {
      const name = tenantsById.get(entityId);
      return name ? `Tenant: ${name}` : `Tenant ID: ${shortId(entityId)}`;
    }
    if (key.includes('COMPANY') || key.includes('EMPRESA')) {
      const name = companiesById.get(entityId);
      return name ? `Empresa: ${name}` : `Empresa ID: ${shortId(entityId)}`;
    }

    const scopeType = scope.scope_type_name || scope.scope_type_key || 'Entidad';
    return `${scopeType}: ${shortId(entityId)}`;
  };

  const resolveScopeTypeLabel = (scope: UserRoleScope): string => {
    const byJoin = scope.scope_type_name || scope.scope_type_key;
    if (byJoin) return byJoin;
    const fromCatalog = scopeTypesById.get(scope.scope_type_id);
    if (fromCatalog) {
      return `${fromCatalog.scope_type_name} (${fromCatalog.scope_type_key})`;
    }
    return `Scope ID: ${shortId(scope.scope_type_id)}`;
  };

  const getUserRoleLabel = (userId: string): string => {
    const summary = userRoleSummaries[userId];
    if (!summary) return 'Sin rol asignado';
    const roleName = summary.primary_role_name || summary.primary_role_key || 'Rol sin nombre';
    return summary.role_count > 1 ? `${roleName} +${summary.role_count - 1}` : roleName;
  };

  // ============================================================================
  // CARGA INICIAL
  // ============================================================================

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadUsers(), loadTenants(), loadRoles(),
        loadScopeTypes(), loadCompanies(), loadLanguages(), loadUserRoleSummaries(),
      ]);
    } catch (err: any) {
      setError(err.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    const res = await fetch(API_BASE, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error(`Error ${res.status} cargando usuarios`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Error cargando usuarios');
    setUsers(data.users || []);
  };

  const loadTenants = async () => {
    const res = await fetch(`${API_BASE}/catalogs/tenants`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) return;
    const data = await res.json();
    setTenants(data.tenants || []);
  };

  const loadRoles = async () => {
    const res = await fetch(`${API_BASE}/catalogs/roles`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) return;
    const data = await res.json();
    setRoles(data.roles || []);
  };

  const loadScopeTypes = async () => {
    const res = await fetch(`${API_BASE}/catalogs/scope-types`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) return;
    const data = await res.json();
    setScopeTypes(data.scopeTypes || []);
  };

  const loadCompanies = async () => {
    const res = await fetch(`${API_BASE}/catalogs/companies`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) return;
    const data = await res.json();
    setCompanies(data.companies || []);
  };

  const loadLanguages = async () => {
    const res = await fetch(`${API_BASE}/catalogs/languages`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) return;
    const data = await res.json();
    setLanguages(data.languages || []);
  };

  const loadUserRoleSummaries = async () => {
    const res = await fetch(`${API_BASE}/catalogs/user-role-summaries`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) return;
    const data = await res.json();
    const summaries = Array.isArray(data.summaries) ? data.summaries : [];
    const byUser: Record<string, UserRoleSummary> = {};
    for (const summary of summaries) {
      if (summary?.user_id) byUser[summary.user_id] = summary;
    }
    setUserRoleSummaries(byUser);
  };

  const loadUserRoles = async (userId: string) => {
    setUserRolesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${userId}/roles`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const rolesData: UserRole[] = data.userRoles || [];
      setUserRoles(rolesData);
      setRoleScopesByUserRoleId({});
      await Promise.all(rolesData.map((role) => loadRoleScopes(role.id)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUserRolesLoading(false);
    }
  };

  const loadRoleScopes = async (userRoleId: string) => {
    setScopeLoadingByRoleId((prev) => ({ ...prev, [userRoleId]: true }));
    try {
      const res = await fetch(`${API_BASE}/user-roles/${userRoleId}/scopes`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setRoleScopesByUserRoleId((prev) => ({ ...prev, [userRoleId]: data.scopes || [] }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setScopeLoadingByRoleId((prev) => ({ ...prev, [userRoleId]: false }));
    }
  };

  // ============================================================================
  // SELECCIÓN DE USUARIO
  // ============================================================================

  const selectUser = async (user: AppUser) => {
    setSelectedUser(user);
    setSelectedUserRole(null);
    setRoleScopesByUserRoleId({});
    setScopeLoadingByRoleId({});
    setUserDetailTab('info');
    await loadUserRoles(user.id);
  };

  const selectUserRole = async (ur: UserRole) => {
    setSelectedUserRole(ur);
    setUserDetailTab('roles');
    await loadRoleScopes(ur.id);
  };

  // ============================================================================
  // FILTRADO USUARIOS
  // ============================================================================

  const filteredUsers = users
    .filter(u => {
      const matchSearch = !searchTerm ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.display_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.tenant_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? u.is_active : !u.is_active);
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      const va = String(a[sortField] || ''); const vb = String(b[sortField] || '');
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  const totalRoleScopes = Object.values(roleScopesByUserRoleId).reduce((acc, scopes) => acc + scopes.length, 0);
  const availableRolesForForm: Role[] = (() => {
    if (!editingUserRole) return roles;
    const exists = roles.some((r) => r.id === editingUserRole.role_id);
    if (exists) return roles;
    return [{
      id: editingUserRole.role_id,
      role_key: editingUserRole.role_key || `ROLE_${shortId(editingUserRole.role_id)}`,
      role_name: editingUserRole.role_name || `Rol ${shortId(editingUserRole.role_id)}`,
      role_scope: editingUserRole.role_scope || 'TENANT',
      tenant_id: editingUserRole.tenant_id,
    }, ...roles];
  })();
  const selectedRoleInForm = availableRolesForForm.find((r) => r.id === roleForm.role_id);

  const toggleSort = (field: keyof AppUser) => {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  // ============================================================================
  // CRUD USUARIOS
  // ============================================================================

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({
      tenant_id: tenants[0]?.id || '', username: '', display_name: '', email: '',
      phone: '', preferred_language_code: '', password: '', confirm_password: '', is_active: true,
    });
    setUserFormErrors({});
    setIsUserModalOpen(true);
  };

  const openEditUser = (user: AppUser) => {
    setEditingUser(user);
    setUserForm({
      tenant_id: user.tenant_id, username: user.username, display_name: user.display_name || '',
      email: user.email || '', phone: user.phone || '',
      preferred_language_code: user.preferred_language_code || '',
      password: '', confirm_password: '', is_active: user.is_active,
    });
    setUserFormErrors({});
    setIsUserModalOpen(true);
  };

  const validateUserForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!userForm.tenant_id) errors.tenant_id = 'El tenant es obligatorio';
    if (!userForm.username.trim()) errors.username = 'El nombre de usuario es obligatorio';
    if (!userForm.email.trim()) {
      errors.email = 'El email es obligatorio';
    } else if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(userForm.email)) {
      errors.email = 'El formato del email no es válido';
    }
    if (!editingUser) {
      if (!userForm.password) errors.password = 'La contraseña es obligatoria';
      else if (userForm.password.length < 8) errors.password = 'Mínimo 8 caracteres';
      else if (userForm.password !== userForm.confirm_password) errors.confirm_password = 'Las contraseñas no coinciden';
    }
    setUserFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveUser = async () => {
    if (!validateUserForm()) return;
    setUserSaving(true);
    try {
      const url = editingUser ? `${API_BASE}/${editingUser.id}` : API_BASE;
      const method = editingUser ? 'PUT' : 'POST';
      const body: any = {
        tenant_id: userForm.tenant_id, username: userForm.username,
        display_name: userForm.display_name || null, email: userForm.email,
        phone: userForm.phone || null, preferred_language_code: userForm.preferred_language_code || null,
        is_active: userForm.is_active,
      };
      if (!editingUser) body.password = userForm.password;

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      await loadUsers();
      await loadUserRoleSummaries();
      setIsUserModalOpen(false);
      if (selectedUser?.id === editingUser?.id) {
        const updated = users.find(u => u.id === editingUser?.id);
        if (updated) setSelectedUser(updated);
      }
    } catch (err: any) {
      setUserFormErrors({ general: err.message });
    } finally {
      setUserSaving(false);
    }
  };

  const handleToggleUserStatus = async (user: AppUser) => {
    setTogglingId(user.id);
    try {
      const res = await fetch(`${API_BASE}/${user.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar estado');
      await loadUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  // ============================================================================
  // CRUD USER_ROLES
  // ============================================================================

  const openCreateRole = () => {
    setEditingUserRole(null);
    setRoleForm({
      tenant_id: selectedUser?.tenant_id || '',
      role_id: '', company_id: '', valid_from: '', valid_to: '', is_active: true,
    });
    setRoleFormErrors({});
    setIsRoleModalOpen(true);
  };

  const openEditUserRole = (ur: UserRole) => {
    setEditingUserRole(ur);
    setRoleForm({
      tenant_id: ur.tenant_id, role_id: ur.role_id,
      company_id: ur.company_id || '',
      valid_from: ur.valid_from ? ur.valid_from.split('T')[0] : '',
      valid_to: ur.valid_to ? ur.valid_to.split('T')[0] : '',
      is_active: ur.is_active,
    });
    setRoleFormErrors({});
    setIsRoleModalOpen(true);
  };

  const handleSaveUserRole = async () => {
    const errors: Record<string, string> = {};
    if (!roleForm.tenant_id) errors.tenant_id = 'Tenant obligatorio';
    if (!roleForm.role_id) errors.role_id = 'Rol obligatorio';
    if (Object.keys(errors).length > 0) { setRoleFormErrors(errors); return; }

    setRoleSaving(true);
    try {
      let res: Response;
      if (editingUserRole) {
        res = await fetch(`${API_BASE}/user-roles/${editingUserRole.id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_id: roleForm.tenant_id,
            role_id: roleForm.role_id,
            company_id: roleForm.company_id || null,
            valid_from: roleForm.valid_from || null,
            valid_to: roleForm.valid_to || null,
            is_active: roleForm.is_active,
          }),
        });
      } else {
        res = await fetch(`${API_BASE}/${selectedUser!.id}/roles`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_id: roleForm.tenant_id,
            role_id: roleForm.role_id,
            company_id: roleForm.company_id || null,
            valid_from: roleForm.valid_from || null,
            valid_to: roleForm.valid_to || null,
            is_active: roleForm.is_active,
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      await loadUserRoles(selectedUser!.id);
      await loadUserRoleSummaries();
      setIsRoleModalOpen(false);
    } catch (err: any) {
      setRoleFormErrors({ general: err.message });
    } finally {
      setRoleSaving(false);
    }
  };

  const handleToggleUserRoleStatus = async (ur: UserRole) => {
    setTogglingId(ur.id);
    try {
      const res = await fetch(`${API_BASE}/user-roles/${ur.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !ur.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar estado');
      await loadUserRoles(selectedUser!.id);
      await loadUserRoleSummaries();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteUserRole = async (ur: UserRole) => {
    const roleLabel = ur.role_name || ur.role_key || shortId(ur.role_id);
    const confirmed = window.confirm(`¿Desasignar el rol "${roleLabel}" de este usuario?`);
    if (!confirmed) return;

    setTogglingId(ur.id);
    try {
      const res = await fetch(`${API_BASE}/user-roles/${ur.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al desasignar rol');

      await loadUserRoles(selectedUser!.id);
      await loadUserRoleSummaries();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  // ============================================================================
  // CRUD USER_ROLE_SCOPES
  // ============================================================================

  const openCreateScope = (ur?: UserRole) => {
    if (ur) setSelectedUserRole(ur);
    setEditingScope(null);
    setScopeTargetUserRoleId(ur?.id || selectedUserRole?.id || '');
    setScopeForm({ tenant_id: selectedUser?.tenant_id || '', scope_type_id: '', scope_entity_id: '', is_active: true });
    setScopeFormErrors({});
    setIsScopeModalOpen(true);
  };

  const openEditScope = (scope: UserRoleScope, ur: UserRole) => {
    setSelectedUserRole(ur);
    setEditingScope(scope);
    setScopeTargetUserRoleId(scope.user_role_id);
    setScopeForm({
      tenant_id: scope.tenant_id,
      scope_type_id: scope.scope_type_id,
      scope_entity_id: scope.scope_entity_id,
      is_active: scope.is_active,
    });
    setScopeFormErrors({});
    setIsScopeModalOpen(true);
  };

  const handleSaveScope = async () => {
    const errors: Record<string, string> = {};
    if (!scopeForm.tenant_id) errors.tenant_id = 'Tenant obligatorio';
    if (!scopeForm.scope_type_id) errors.scope_type_id = 'Tipo de alcance obligatorio';
    if (!scopeForm.scope_entity_id.trim()) errors.scope_entity_id = 'ID de entidad obligatorio';
    if (Object.keys(errors).length > 0) { setScopeFormErrors(errors); return; }

    setScopeSaving(true);
    try {
      if (!scopeTargetUserRoleId) throw new Error('No se encontró el rol objetivo para el alcance');

      const endpoint = editingScope
        ? `${API_BASE}/scopes/${editingScope.id}`
        : `${API_BASE}/user-roles/${scopeTargetUserRoleId}/scopes`;
      const method = editingScope ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editingScope
          ? { ...scopeForm, user_role_id: scopeTargetUserRoleId }
          : scopeForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      await loadRoleScopes(scopeTargetUserRoleId);
      if (editingScope && selectedUserRole?.id !== scopeTargetUserRoleId) {
        await loadRoleScopes(selectedUserRole?.id || scopeTargetUserRoleId);
      }
      setEditingScope(null);
      setScopeTargetUserRoleId('');
      setIsScopeModalOpen(false);
    } catch (err: any) {
      setScopeFormErrors({ general: err.message });
    } finally {
      setScopeSaving(false);
    }
  };

  const handleToggleScopeStatus = async (scope: UserRoleScope) => {
    setTogglingId(scope.id);
    try {
      const res = await fetch(`${API_BASE}/scopes/${scope.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !scope.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      await loadRoleScopes(scope.user_role_id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  // ============================================================================
  // PASSWORD RESET
  // ============================================================================

  const openPasswordReset = (user: AppUser) => {
    setPasswordTarget(user);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setIsPasswordModalOpen(true);
  };

  const handlePasswordReset = async () => {
    if (!newPassword || newPassword.length < 8) { setPasswordError('Mínimo 8 caracteres'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Las contraseñas no coinciden'); return; }
    setPasswordSaving(true);
    setPasswordError('');
    try {
      const res = await fetch(`${API_BASE}/${passwordTarget!.id}/reset-password`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al resetear contraseña');
      setIsPasswordModalOpen(false);
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="p-6 max-w-full flex flex-col h-full min-h-screen bg-gray-50 gap-4">
      <SystemAdminPageHeader
        icon={Users}
        title="Gestion de Usuarios"
        subtitle="Mantenimiento de usuarios, roles y alcances del sistema"
        rightSlot={
          <div className="flex gap-2">
            <HeaderRefreshButton onClick={loadAll} />
            <button
              onClick={openCreateUser}
              className="flex items-center gap-2 px-4 py-2 bg-[#0074D9] text-white rounded-lg text-sm font-medium hover:bg-[#005bb5]"
            >
              <Plus className="w-4 h-4" />
              Nuevo Usuario
            </button>
          </div>
        }
      />
      <div className="flex flex-1 min-h-0 bg-gray-50">
      {/* Panel izquierdo: lista de usuarios */}
      <div className={`${selectedUser ? 'w-1/2' : 'w-full'} flex flex-col transition-all duration-300`}>
        <div className="px-3 pb-3">
          <div className="rounded-lg border bg-white p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar usuario..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0074D9]/30"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Mostrando {filteredUsers.length} de {users.length} usuarios
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Lista de usuarios */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-8 h-8 border-4 border-[#0074D9] border-t-transparent rounded-full" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-600">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredUsers.map(user => (
              <div
                key={user.id}
                onClick={() => selectUser(user)}
                className={`bg-white border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedUser?.id === user.id
                    ? 'border-[#0074D9] ring-1 ring-[#0074D9]/30 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!user.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      user.is_active ? 'bg-[#0074D9]/10' : 'bg-gray-100'
                    }`}>
                      <User className={`w-5 h-5 ${user.is_active ? 'text-[#0074D9]' : 'text-gray-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {user.display_name || user.username}
                      </p>
                      <p className="text-xs text-gray-500 truncate">Usuario: @{user.username}</p>
                      <p className="text-xs text-gray-500 truncate">Rol: {getUserRoleLabel(user.id)}</p>
                      {user.email && (
                        <p className="text-xs text-gray-400 truncate flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />Email: {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                {user.tenant_name && (
                  <div className="mt-2 flex items-center gap-1">
                    <Building className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">Tenant: {user.tenant_name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Panel derecho: detalle del usuario */}
      {selectedUser && (
        <div className="w-1/2 border-l border-gray-200 bg-white flex flex-col">
          {/* Header del panel */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#0074D9]/10 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-[#0074D9]" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{selectedUser.display_name || selectedUser.username}</p>
                <p className="text-xs text-gray-500">@{selectedUser.username} · Rol: {getUserRoleLabel(selectedUser.id)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openEditUser(selectedUser)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                title="Editar"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => openPasswordReset(selectedUser)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-amber-50 hover:text-amber-600"
                title="Resetear contraseña"
              >
                <Key className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleToggleUserStatus(selectedUser)}
                disabled={togglingId === selectedUser.id}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-yellow-50 hover:text-yellow-600 disabled:opacity-50"
                title={selectedUser.is_active ? 'Desactivar' : 'Activar'}
              >
                {selectedUser.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { setSelectedUser(null); setUserRoles([]); setSelectedUserRole(null); setRoleScopesByUserRoleId({}); setScopeLoadingByRoleId({}); }}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs del detalle */}
          <div className="flex border-b border-gray-200 bg-white">
            {[
              { key: 'info', label: 'Información', icon: User },
              { key: 'roles', label: `Roles y Alcances (${userRoles.length}/${totalRoleScopes})`, icon: Shield },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setUserDetailTab(tab.key as UserDetailTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  userDetailTab === tab.key
                    ? 'border-[#0074D9] text-[#0074D9]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Contenido de tabs */}
          <div className="flex-1 overflow-y-auto">
            {/* Tab: Información */}
            {userDetailTab === 'info' && (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <InfoField icon={User} label="Usuario" value={selectedUser.username} mono />
                  <InfoField icon={User} label="Nombre" value={selectedUser.display_name || '-'} />
                  <InfoField icon={Mail} label="Email" value={selectedUser.email || '-'} />
                  <InfoField icon={Phone} label="Teléfono" value={selectedUser.phone || '-'} />
                  <InfoField icon={Globe} label="Idioma" value={selectedUser.language_name || selectedUser.preferred_language_code || '-'} />
                  <InfoField icon={Building} label="Tenant" value={selectedUser.tenant_name || '-'} />
                  <InfoField
                    icon={Clock}
                    label="Último Login"
                    value={selectedUser.last_login_at
                      ? new Date(selectedUser.last_login_at).toLocaleString('es-ES')
                      : 'Nunca'}
                  />
                  <InfoField
                    icon={Clock}
                    label="Creado"
                    value={new Date(selectedUser.created_at).toLocaleDateString('es-ES')}
                  />
                </div>
              </div>
            )}

            {/* Tab: Roles y Alcances */}
            {userDetailTab === 'roles' && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">Roles y Alcances Asignados</p>
                  <button
                    onClick={openCreateRole}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#0074D9] text-white rounded-lg hover:bg-[#005bb5]"
                  >
                    <Plus className="w-3 h-3" />
                    Asignar Rol
                  </button>
                </div>

                {userRolesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-3 border-[#0074D9] border-t-transparent rounded-full" />
                  </div>
                ) : userRoles.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Sin roles asignados</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userRoles.map((ur) => {
                      const roleScopes = roleScopesByUserRoleId[ur.id] || [];
                      const isScopeLoading = !!scopeLoadingByRoleId[ur.id];
                      return (
                        <div
                          key={ur.id}
                          className={`border rounded-lg p-3 transition-all hover:shadow-sm ${
                            selectedUserRole?.id === ur.id
                              ? 'border-[#2ECC71] bg-green-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          } ${!ur.is_active ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 cursor-pointer" onClick={() => selectUserRole(ur)}>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900">{ur.role_name || ur.role_key || `Rol sin nombre (${shortId(ur.role_id)})`}</p>
                                {ur.role_scope && (
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${SCOPE_COLORS[ur.role_scope] || 'bg-gray-100 text-gray-600'}`}>
                                    Scope: {ROLE_SCOPE_LABELS[ur.role_scope] || ur.role_scope}
                                  </span>
                                )}
                                {ur.data_scope && (
                                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                                    Datos: {DATA_SCOPE_LABELS[ur.data_scope] || ur.data_scope}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Clave de rol: <span className="font-mono">{ur.role_key || shortId(ur.role_id)}</span>
                              </p>
                              {ur.company_name && (
                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                  <Building className="w-3 h-3" />Empresa: {ur.company_name}
                                </p>
                              )}
                              {(ur.valid_from || ur.valid_to) && (
                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                  <Clock className="w-3 h-3" />
                                  {ur.valid_from ? new Date(ur.valid_from).toLocaleDateString('es-ES') : '...'} →{' '}
                                  {ur.valid_to ? new Date(ur.valid_to).toLocaleDateString('es-ES') : '...'}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 ml-2 shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); openEditUserRole(ur); }}
                                className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                title="Editar"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleToggleUserRoleStatus(ur); }}
                                disabled={togglingId === ur.id}
                                className="p-1 rounded text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 disabled:opacity-50"
                                title={ur.is_active ? 'Desactivar' : 'Activar'}
                              >
                                {ur.is_active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openCreateScope(ur);
                                }}
                                className="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-green-50"
                                title="Agregar alcance"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteUserRole(ur); }}
                                disabled={togglingId === ur.id}
                                className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                                title="Desasignar rol"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium text-gray-600">Alcances del rol</p>
                              <button
                                onClick={() => loadRoleScopes(ur.id)}
                                className="text-xs text-[#0074D9] hover:underline"
                              >
                                Recargar
                              </button>
                            </div>
                            {isScopeLoading ? (
                              <div className="py-2 text-xs text-gray-500">Cargando alcances...</div>
                            ) : roleScopes.length === 0 ? (
                              <div className="py-2 text-xs text-gray-400">Sin alcances configurados (aplica sin restricción).</div>
                            ) : (
                              <div className="space-y-2">
                                {roleScopes.map((scope) => (
                                  <div key={scope.id} className={`border rounded-lg p-2 bg-white ${!scope.is_active ? 'opacity-60' : ''}`}>
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                                            {resolveScopeTypeLabel(scope)}
                                          </span>
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                            scope.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                                          }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${scope.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                                            {scope.is_active ? 'Activo' : 'Inactivo'}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                          Scope seleccionado: <span className="font-medium">{resolveScopeTypeLabel(scope)}</span>
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">{resolveScopeEntityLabel(scope)}</p>
                                        <p className="text-xs text-gray-400 font-mono mt-0.5">ID: {scope.scope_entity_id}</p>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => openEditScope(scope, ur)}
                                          className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                          title="Editar alcance"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleToggleScopeStatus(scope)}
                                          disabled={togglingId === scope.id}
                                          className="p-1 rounded text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 disabled:opacity-50"
                                          title={scope.is_active ? 'Desactivar' : 'Activar'}
                                        >
                                          {scope.is_active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* ================================================================ */}
      {/* MODAL: Crear/Editar Usuario */}
      {/* ================================================================ */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button onClick={() => setIsUserModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {userFormErrors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{userFormErrors.general}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tenant <span className="text-red-500">*</span></label>
                  <select
                    value={userForm.tenant_id}
                    onChange={e => setUserForm(f => ({ ...f, tenant_id: e.target.value }))}
                    disabled={!!editingUser}
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${userFormErrors.tenant_id ? 'border-red-400' : 'border-gray-300'} ${editingUser ? 'bg-gray-50' : ''}`}
                  >
                    <option value="">Seleccionar...</option>
                    {tenants.map(t => <option key={t.id} value={t.id}>{t.tenant_name}</option>)}
                  </select>
                  {userFormErrors.tenant_id && <p className="text-xs text-red-500 mt-1">{userFormErrors.tenant_id}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuario <span className="text-red-500">*</span></label>
                  <input type="text" value={userForm.username} onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="nombre.apellido" className={`w-full px-3 py-2 border rounded-lg text-sm ${userFormErrors.username ? 'border-red-400' : 'border-gray-300'}`} />
                  {userFormErrors.username && <p className="text-xs text-red-500 mt-1">{userFormErrors.username}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                  <input type="text" value={userForm.display_name} onChange={e => setUserForm(f => ({ ...f, display_name: e.target.value }))}
                    placeholder="Juan Pérez" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="usuario@empresa.com" className={`w-full px-3 py-2 border rounded-lg text-sm ${userFormErrors.email ? 'border-red-400' : 'border-gray-300'}`} />
                  {userFormErrors.email && <p className="text-xs text-red-500 mt-1">{userFormErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input type="tel" value={userForm.phone} onChange={e => setUserForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+56 9 1234 5678" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
                  <select value={userForm.preferred_language_code} onChange={e => setUserForm(f => ({ ...f, preferred_language_code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Sin preferencia</option>
                    {languages.map(l => <option key={l.code} value={l.code}>{l.language_name}</option>)}
                  </select>
                </div>
                {!editingUser && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña <span className="text-red-500">*</span></label>
                      <input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="Mínimo 8 caracteres" className={`w-full px-3 py-2 border rounded-lg text-sm ${userFormErrors.password ? 'border-red-400' : 'border-gray-300'}`} />
                      {userFormErrors.password && <p className="text-xs text-red-500 mt-1">{userFormErrors.password}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña <span className="text-red-500">*</span></label>
                      <input type="password" value={userForm.confirm_password} onChange={e => setUserForm(f => ({ ...f, confirm_password: e.target.value }))}
                        placeholder="Repetir contraseña" className={`w-full px-3 py-2 border rounded-lg text-sm ${userFormErrors.confirm_password ? 'border-red-400' : 'border-gray-300'}`} />
                      {userFormErrors.confirm_password && <p className="text-xs text-red-500 mt-1">{userFormErrors.confirm_password}</p>}
                    </div>
                  </>
                )}
                <div className="col-span-2 flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">Estado</label>
                  <button type="button" onClick={() => setUserForm(f => ({ ...f, is_active: !f.is_active }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${userForm.is_active ? 'bg-[#2ECC71]' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${userForm.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-sm text-gray-600">{userForm.is_active ? 'Activo' : 'Inactivo'}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">Cancelar</button>
              <button onClick={handleSaveUser} disabled={userSaving} className="px-5 py-2 text-sm bg-[#0074D9] text-white rounded-lg font-medium hover:bg-[#005bb5] disabled:opacity-60 flex items-center gap-2">
                {userSaving && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                {userSaving ? 'Guardando...' : editingUser ? 'Actualizar' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: Asignar/Editar Rol de Usuario */}
      {/* ================================================================ */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingUserRole ? 'Editar Asignación de Rol' : 'Asignar Rol a Usuario'}
              </h2>
              <button onClick={() => setIsRoleModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {roleFormErrors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{roleFormErrors.general}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol <span className="text-red-500">*</span></label>
                <select value={roleForm.role_id} onChange={e => setRoleForm(f => ({ ...f, role_id: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${roleFormErrors.role_id ? 'border-red-400' : 'border-gray-300'}`}>
                  <option value="">Seleccionar rol...</option>
                  {availableRolesForForm.map(r => <option key={r.id} value={r.id}>{r.role_name} ({r.role_key})</option>)}
                </select>
                {roleFormErrors.role_id && <p className="text-xs text-red-500 mt-1">{roleFormErrors.role_id}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa (opcional)</label>
                <select value={roleForm.company_id} onChange={e => setRoleForm(f => ({ ...f, company_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">Sin restricción de empresa</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              {selectedRoleInForm && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 space-y-1">
                  <p><strong>Rol:</strong> {selectedRoleInForm.role_name} ({selectedRoleInForm.role_key})</p>
                  <p><strong>Scope:</strong> {ROLE_SCOPE_LABELS[selectedRoleInForm.role_scope] || selectedRoleInForm.role_scope}</p>
                  <p className="text-blue-600">El alcance específico se configura en “Agregar alcance” dentro de la tarjeta del rol.</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Válido desde</label>
                  <input type="date" value={roleForm.valid_from} onChange={e => setRoleForm(f => ({ ...f, valid_from: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Válido hasta</label>
                  <input type="date" value={roleForm.valid_to} onChange={e => setRoleForm(f => ({ ...f, valid_to: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Estado</label>
                <button type="button" onClick={() => setRoleForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${roleForm.is_active ? 'bg-[#2ECC71]' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${roleForm.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-600">{roleForm.is_active ? 'Activo' : 'Inactivo'}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button onClick={() => setIsRoleModalOpen(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">Cancelar</button>
              <button onClick={handleSaveUserRole} disabled={roleSaving} className="px-5 py-2 text-sm bg-[#0074D9] text-white rounded-lg font-medium hover:bg-[#005bb5] disabled:opacity-60 flex items-center gap-2">
                {roleSaving && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                {roleSaving ? 'Guardando...' : editingUserRole ? 'Actualizar' : 'Asignar Rol'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: Agregar/Editar Alcance */}
      {/* ================================================================ */}
      {isScopeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{editingScope ? 'Editar Alcance de Rol' : 'Agregar Alcance de Rol'}</h2>
              <button onClick={() => { setIsScopeModalOpen(false); setEditingScope(null); setScopeTargetUserRoleId(''); }} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {scopeFormErrors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{scopeFormErrors.general}</div>
              )}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                Definiendo alcance para el rol: <strong>{selectedUserRole?.role_name || selectedUserRole?.role_key || 'Sin rol seleccionado'}</strong>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Alcance <span className="text-red-500">*</span></label>
                <select value={scopeForm.scope_type_id} onChange={e => setScopeForm(f => ({ ...f, scope_type_id: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${scopeFormErrors.scope_type_id ? 'border-red-400' : 'border-gray-300'}`}>
                  <option value="">Seleccionar tipo de alcance...</option>
                  {scopeTypes.map(st => <option key={st.id} value={st.id}>{st.scope_type_name} ({st.scope_type_key})</option>)}
                </select>
                {scopeFormErrors.scope_type_id && <p className="text-xs text-red-500 mt-1">{scopeFormErrors.scope_type_id}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID de Entidad <span className="text-red-500">*</span></label>
                <input type="text" value={scopeForm.scope_entity_id} onChange={e => setScopeForm(f => ({ ...f, scope_entity_id: e.target.value }))}
                  placeholder="UUID de la entidad (empresa, sucursal, etc.)"
                  className={`w-full px-3 py-2 border rounded-lg text-sm font-mono ${scopeFormErrors.scope_entity_id ? 'border-red-400' : 'border-gray-300'}`} />
                {scopeFormErrors.scope_entity_id && <p className="text-xs text-red-500 mt-1">{scopeFormErrors.scope_entity_id}</p>}
                <p className="text-xs text-gray-400 mt-1">UUID del registro en la entidad correspondiente al tipo de alcance.</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Estado</label>
                <button type="button" onClick={() => setScopeForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${scopeForm.is_active ? 'bg-[#2ECC71]' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${scopeForm.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-600">{scopeForm.is_active ? 'Activo' : 'Inactivo'}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button onClick={() => { setIsScopeModalOpen(false); setEditingScope(null); setScopeTargetUserRoleId(''); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">Cancelar</button>
              <button onClick={handleSaveScope} disabled={scopeSaving} className="px-5 py-2 text-sm bg-[#0074D9] text-white rounded-lg font-medium hover:bg-[#005bb5] disabled:opacity-60 flex items-center gap-2">
                {scopeSaving && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                {scopeSaving ? 'Guardando...' : editingScope ? 'Actualizar Alcance' : 'Agregar Alcance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: Resetear Contraseña */}
      {/* ================================================================ */}
      {isPasswordModalOpen && passwordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Resetear Contraseña</h2>
              <button onClick={() => setIsPasswordModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">
                Nueva contraseña para <strong>{passwordTarget.display_name || passwordTarget.username}</strong>
              </p>
              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{passwordError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repetir contraseña" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button onClick={() => setIsPasswordModalOpen(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">Cancelar</button>
              <button onClick={handlePasswordReset} disabled={passwordSaving} className="px-5 py-2 text-sm bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-60 flex items-center gap-2">
                {passwordSaving && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                {passwordSaving ? 'Actualizando...' : 'Resetear Contraseña'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE AUXILIAR: Campo de información
// ============================================================================

function InfoField({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className={`text-sm font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}



