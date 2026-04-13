/**
 * RolesManagement.tsx - Gestión de Roles
 * Turnos Titanium Enterprise
 *
 * Pantalla de mantenimiento para la tabla roles
 * Ubicación: Mantenimiento → Roles
 */

'use client';

import { useState, useEffect } from 'react';
import {
  AlertCircle, Plus, Edit2, Power, PowerOff, Search, X,
  Shield, Lock, ShieldCheck, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TIPOS
// ============================================================================

interface Role {
  id: string;
  tenant_id: string;
  role_key: string;
  role_name: string;
  role_scope: 'SYSTEM' | 'TENANT' | 'SCOPE' | 'SELF';
  base_role_id: string | null;
  role_version: number;
  is_active: boolean;
  is_system_role: boolean;
  is_locked: boolean;
  data_scope: 'ALL' | 'DIRECT_REPORTS' | 'SELF';
  locked_by: string | null;
  locked_at: string | null;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
  // joins
  base_role_key?: string | null;
  base_role_name?: string | null;
  tenant_key?: string | null;
  tenant_name?: string | null;
}

interface Tenant {
  id: string;
  tenant_key: string;
  tenant_name: string;
}

interface FormData {
  tenant_id: string;
  role_key: string;
  role_name: string;
  role_scope: string;
  base_role_id: string;
  data_scope: string;
  is_active: boolean;
}

const EMPTY_FORM: FormData = {
  tenant_id: '',
  role_key: '',
  role_name: '',
  role_scope: 'TENANT',
  base_role_id: '',
  data_scope: 'ALL',
  is_active: true,
};

const SCOPE_LABELS: Record<string, string> = {
  SYSTEM: 'Sistema',
  TENANT: 'Tenant',
  SCOPE: 'Alcance',
  SELF: 'Propio',
};

const DATA_SCOPE_LABELS: Record<string, string> = {
  ALL: 'Todos',
  DIRECT_REPORTS: 'Reportes Directos',
  SELF: 'Solo Propio',
};

const SCOPE_COLORS: Record<string, string> = {
  SYSTEM: 'bg-purple-100 text-purple-800',
  TENANT: 'bg-blue-100 text-blue-800',
  SCOPE: 'bg-green-100 text-green-800',
  SELF: 'bg-gray-100 text-gray-700',
};

function getToken(): string {
  return localStorage.getItem('sb-access-token') || publicAnonKey;
}

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/roles-management`;

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function RolesManagement() {
  const { profile } = useAuth();

  const [roles, setRoles] = useState<Role[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof Role>('role_key');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadRoles(), loadTenants()]);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    const res = await fetch(`${API_BASE}`, {
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`Error ${res.status} cargando roles`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Error cargando roles');
    setRoles(data.roles || []);
  };

  const loadTenants = async () => {
    const res = await fetch(`${API_BASE}/catalogs/tenants`, {
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) return;
    const data = await res.json();
    setTenants(data.tenants || []);
  };

  // ============================================================================
  // FILTRADO Y ORDENAMIENTO
  // ============================================================================

  const filteredRoles = roles
    .filter(r => {
      const matchSearch =
        !searchTerm ||
        r.role_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.role_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.tenant_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus =
        statusFilter === 'all' || (statusFilter === 'active' ? r.is_active : !r.is_active);
      const matchScope = scopeFilter === 'all' || r.role_scope === scopeFilter;
      return matchSearch && matchStatus && matchScope;
    })
    .sort((a, b) => {
      const valA = String(a[sortField] || '');
      const valB = String(b[sortField] || '');
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

  const toggleSort = (field: keyof Role) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // ============================================================================
  // MODAL CRUD
  // ============================================================================

  const openCreate = () => {
    setEditingRole(null);
    setFormData({ ...EMPTY_FORM, tenant_id: tenants[0]?.id || '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (role: Role) => {
    if (role.is_locked) return;
    setEditingRole(role);
    setFormData({
      tenant_id: role.tenant_id,
      role_key: role.role_key,
      role_name: role.role_name,
      role_scope: role.role_scope,
      base_role_id: role.base_role_id || '',
      data_scope: role.data_scope,
      is_active: role.is_active,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.tenant_id) errors.tenant_id = 'El tenant es obligatorio';
    if (!formData.role_key.trim()) {
      errors.role_key = 'La clave es obligatoria';
    } else if (!/^[A-Z0-9_]+$/.test(formData.role_key) || formData.role_key.length < 2) {
      errors.role_key = 'Solo mayúsculas, números y _ (mínimo 2 caracteres)';
    }
    if (!formData.role_name.trim()) errors.role_name = 'El nombre es obligatorio';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const url = editingRole ? `${API_BASE}/${editingRole.id}` : API_BASE;
      const method = editingRole ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      await loadRoles();
      closeModal();
    } catch (err: any) {
      setFormErrors({ general: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (role: Role) => {
    if (role.is_locked) return;
    setTogglingId(role.id);
    try {
      const res = await fetch(`${API_BASE}/${role.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !role.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar estado');
      await loadRoles();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#0074D9]/10 rounded-lg">
            <Shield className="w-6 h-6 text-[#0074D9]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Inter, sans-serif' }}>
              Gestión de Roles
            </h1>
            <p className="text-sm text-gray-500">
              {filteredRoles.length} de {roles.length} roles · Los roles de sistema no se pueden eliminar
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#0074D9] text-white rounded-lg text-sm font-medium hover:bg-[#005bb5] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Rol
          </button>
        </div>
      </div>

      {/* Error global */}
      {error && (
        <div className="flex items-center gap-2 p-4 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por clave, nombre o tenant..."
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
        <select
          value={scopeFilter}
          onChange={e => setScopeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="all">Todos los alcances</option>
          {Object.entries(SCOPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-[#0074D9] border-t-transparent rounded-full" />
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No se encontraron roles</p>
          <p className="text-sm mt-1">Intenta cambiar los filtros o crea uno nuevo</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  { key: 'role_key', label: 'Clave' },
                  { key: 'role_name', label: 'Nombre' },
                  { key: 'role_scope', label: 'Alcance' },
                  { key: 'data_scope', label: 'Datos' },
                  { key: 'tenant_name', label: 'Tenant' },
                ].map(col => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => toggleSort(col.key as keyof Role)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortField === col.key ? (
                        sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      ) : (
                        <span className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Flags</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Estado</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRoles.map(role => (
                <tr key={role.id} className={`hover:bg-gray-50 transition-colors ${!role.is_active ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-700">
                      {role.role_key}
                    </code>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{role.role_name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SCOPE_COLORS[role.role_scope]}`}>
                      {SCOPE_LABELS[role.role_scope] || role.role_scope}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {DATA_SCOPE_LABELS[role.data_scope] || role.data_scope}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {role.tenant_name || role.tenant_key || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {role.is_system_role && (
                        <span title="Rol de Sistema" className="text-purple-500">
                          <ShieldCheck className="w-4 h-4" />
                        </span>
                      )}
                      {role.is_locked && (
                        <span title="Bloqueado" className="text-amber-500">
                          <Lock className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      role.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${role.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                      {role.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(role)}
                        disabled={role.is_locked}
                        title={role.is_locked ? 'Rol bloqueado' : 'Editar'}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(role)}
                        disabled={role.is_locked || togglingId === role.id}
                        title={role.is_active ? 'Desactivar' : 'Activar'}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-yellow-50 hover:text-yellow-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        {role.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Inter, sans-serif' }}>
                {editingRole ? 'Editar Rol' : 'Nuevo Rol'}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {formErrors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {formErrors.general}
                </div>
              )}

              {/* Tenant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tenant <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.tenant_id}
                  onChange={e => setFormData(f => ({ ...f, tenant_id: e.target.value }))}
                  disabled={!!editingRole}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0074D9]/30 ${
                    formErrors.tenant_id ? 'border-red-400' : 'border-gray-300'
                  } ${editingRole ? 'bg-gray-50 opacity-70 cursor-not-allowed' : ''}`}
                >
                  <option value="">Seleccionar tenant...</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.tenant_name} ({t.tenant_key})</option>
                  ))}
                </select>
                {formErrors.tenant_id && <p className="text-xs text-red-500 mt-1">{formErrors.tenant_id}</p>}
              </div>

              {/* Role Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clave del Rol <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.role_key}
                  onChange={e => setFormData(f => ({ ...f, role_key: e.target.value.toUpperCase() }))}
                  disabled={editingRole?.is_system_role}
                  placeholder="Ej: SUPERVISOR_RRHH"
                  className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0074D9]/30 ${
                    formErrors.role_key ? 'border-red-400' : 'border-gray-300'
                  } ${editingRole?.is_system_role ? 'bg-gray-50 opacity-70 cursor-not-allowed' : ''}`}
                />
                {formErrors.role_key ? (
                  <p className="text-xs text-red-500 mt-1">{formErrors.role_key}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Solo A-Z, 0-9 y guión bajo. Mínimo 2 caracteres.</p>
                )}
              </div>

              {/* Role Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Rol <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.role_name}
                  onChange={e => setFormData(f => ({ ...f, role_name: e.target.value }))}
                  disabled={editingRole?.is_system_role}
                  placeholder="Ej: Supervisor de Recursos Humanos"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0074D9]/30 ${
                    formErrors.role_name ? 'border-red-400' : 'border-gray-300'
                  } ${editingRole?.is_system_role ? 'bg-gray-50 opacity-70 cursor-not-allowed' : ''}`}
                />
                {formErrors.role_name && <p className="text-xs text-red-500 mt-1">{formErrors.role_name}</p>}
              </div>

              {/* Row: Role Scope + Data Scope */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alcance del Rol</label>
                  <select
                    value={formData.role_scope}
                    onChange={e => setFormData(f => ({ ...f, role_scope: e.target.value }))}
                    disabled={editingRole?.is_system_role}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0074D9]/30 ${
                      editingRole?.is_system_role ? 'bg-gray-50 opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {Object.entries(SCOPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alcance de Datos</label>
                  <select
                    value={formData.data_scope}
                    onChange={e => setFormData(f => ({ ...f, data_scope: e.target.value }))}
                    disabled={editingRole?.is_system_role}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0074D9]/30 ${
                      editingRole?.is_system_role ? 'bg-gray-50 opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {Object.entries(DATA_SCOPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rol Base */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol Base (heredar de)</label>
                <select
                  value={formData.base_role_id}
                  onChange={e => setFormData(f => ({ ...f, base_role_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0074D9]/30"
                >
                  <option value="">Sin rol base</option>
                  {roles
                    .filter(r => r.id !== editingRole?.id && r.is_active)
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        {r.role_name} ({r.role_key})
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Opcional. Para herencia de permisos.</p>
              </div>

              {/* Estado */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Estado</label>
                <button
                  type="button"
                  onClick={() => setFormData(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.is_active ? 'bg-[#2ECC71]' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    formData.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
                <span className="text-sm text-gray-600">{formData.is_active ? 'Activo' : 'Inactivo'}</span>
              </div>

              {editingRole?.is_system_role && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                  <p className="text-xs text-purple-700">
                    Este es un rol de sistema. Solo se puede cambiar su estado activo/inactivo.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm bg-[#0074D9] text-white rounded-lg font-medium hover:bg-[#005bb5] disabled:opacity-60 transition-colors flex items-center gap-2"
              >
                {saving && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                {saving ? 'Guardando...' : editingRole ? 'Actualizar' : 'Crear Rol'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
