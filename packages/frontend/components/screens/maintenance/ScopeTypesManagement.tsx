/**
 * ScopeTypesManagement.tsx - Gestión de Tipos de Alcance
 * Turnos Titanium Enterprise
 *
 * Pantalla de mantenimiento para la tabla scope_types
 * Ubicación: Mantenimiento → Alcances
 */

'use client';

import { useState, useEffect } from 'react';
import {
  AlertCircle, Plus, Edit2, Power, PowerOff, Search, X,
  Layers, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { projectId, publicApiToken } from '@/utils/backend/info';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TIPOS
// ============================================================================

interface ScopeType {
  id: string;
  scope_type_key: string;
  scope_type_name: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
}

interface FormData {
  scope_type_key: string;
  scope_type_name: string;
  is_active: boolean;
}

const EMPTY_FORM: FormData = {
  scope_type_key: '',
  scope_type_name: '',
  is_active: true,
};

function getToken(): string {
  return localStorage.getItem('tt-access-token') || publicApiToken;
}

const API_BASE = `http://localhost:3001/scope-types-management`;

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function ScopeTypesManagement() {
  const { profile } = useAuth();

  const [scopeTypes, setScopeTypes] = useState<ScopeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<keyof ScopeType>('scope_type_key');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ============================================================================
  // CARGA
  // ============================================================================

  useEffect(() => {
    loadScopeTypes();
  }, []);

  const loadScopeTypes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_BASE, {
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Error cargando datos');
      setScopeTypes(data.scopeTypes || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // FILTRADO
  // ============================================================================

  const filtered = scopeTypes
    .filter(st => {
      const matchSearch =
        !searchTerm ||
        st.scope_type_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.scope_type_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus =
        statusFilter === 'all' || (statusFilter === 'active' ? st.is_active : !st.is_active);
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      const valA = String(a[sortField] || '');
      const valB = String(b[sortField] || '');
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

  const toggleSort = (field: keyof ScopeType) => {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  // ============================================================================
  // MODAL CRUD
  // ============================================================================

  const openCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (st: ScopeType) => {
    setEditingId(st.id);
    setFormData({ scope_type_key: st.scope_type_key, scope_type_name: st.scope_type_name, is_active: st.is_active });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.scope_type_key.trim()) {
      errors.scope_type_key = 'La clave es obligatoria';
    } else if (formData.scope_type_key.length > 80) {
      errors.scope_type_key = 'Máximo 80 caracteres';
    }
    if (!formData.scope_type_name.trim()) errors.scope_type_name = 'El nombre es obligatorio';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const url = editingId ? `${API_BASE}/${editingId}` : API_BASE;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, scope_type_key: formData.scope_type_key.toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      await loadScopeTypes();
      closeModal();
    } catch (err: any) {
      setFormErrors({ general: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (st: ScopeType) => {
    setTogglingId(st.id);
    try {
      const res = await fetch(`${API_BASE}/${st.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !st.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar estado');
      await loadScopeTypes();
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
          <div className="p-2 bg-[#2ECC71]/10 rounded-lg">
            <Layers className="w-6 h-6 text-[#2ECC71]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Inter, sans-serif' }}>
              Tipos de Alcance
            </h1>
            <p className="text-sm text-gray-500">
              {filtered.length} de {scopeTypes.length} tipos de alcance · Define la estructura organizacional del sistema
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadScopeTypes}
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
            Nuevo Tipo
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

      {/* Info box */}
      <div className="p-4 mb-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>¿Qué son los Tipos de Alcance?</strong> Definen las dimensiones organizacionales
          a las que se pueden restringir los roles de usuario. Por ejemplo: por empresa, por sucursal,
          por departamento, etc. Cada tipo de alcance se asocia a una entidad del sistema.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por clave o nombre..."
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

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-4 border-[#0074D9] border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No se encontraron tipos de alcance</p>
          <p className="text-sm mt-1">Intenta cambiar los filtros o crea uno nuevo</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  { key: 'scope_type_key', label: 'Clave' },
                  { key: 'scope_type_name', label: 'Nombre' },
                  { key: 'created_at', label: 'Creado' },
                  { key: 'updated_at', label: 'Modificado' },
                ].map(col => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => toggleSort(col.key as keyof ScopeType)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortField === col.key ? (
                        sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      ) : <span className="w-3 h-3" />}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Estado</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(st => (
                <tr key={st.id} className={`hover:bg-gray-50 transition-colors ${!st.is_active ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-700">
                      {st.scope_type_key}
                    </code>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{st.scope_type_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(st.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {st.updated_at
                      ? new Date(st.updated_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      st.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                      {st.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(st)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(st)}
                        disabled={togglingId === st.id}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-yellow-50 hover:text-yellow-600 disabled:opacity-50 transition-colors"
                        title={st.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {st.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Inter, sans-serif' }}>
                {editingId ? 'Editar Tipo de Alcance' : 'Nuevo Tipo de Alcance'}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {formErrors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {formErrors.general}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clave <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.scope_type_key}
                  onChange={e => setFormData(f => ({ ...f, scope_type_key: e.target.value.toUpperCase() }))}
                  placeholder="Ej: COMPANY, BRANCH, DEPARTMENT"
                  maxLength={80}
                  className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0074D9]/30 ${
                    formErrors.scope_type_key ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                {formErrors.scope_type_key && <p className="text-xs text-red-500 mt-1">{formErrors.scope_type_key}</p>}
                <p className="text-xs text-gray-400 mt-1">Identificador único, máximo 80 caracteres.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.scope_type_name}
                  onChange={e => setFormData(f => ({ ...f, scope_type_name: e.target.value }))}
                  placeholder="Ej: Por Empresa, Por Sucursal"
                  maxLength={120}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0074D9]/30 ${
                    formErrors.scope_type_name ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                {formErrors.scope_type_name && <p className="text-xs text-red-500 mt-1">{formErrors.scope_type_name}</p>}
              </div>

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
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button onClick={closeModal} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm bg-[#0074D9] text-white rounded-lg font-medium hover:bg-[#005bb5] disabled:opacity-60 transition-colors flex items-center gap-2"
              >
                {saving && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

