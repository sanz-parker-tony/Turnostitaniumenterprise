/**
 * SystemSettingsManagement.tsx - Gestión de Parámetros del Sistema
 * Turnos Titanium Enterprise
 * 
 * Pantalla de mantenimiento para system_settings
 * Ubicación: Mantenimiento → Parámetros
 */

'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Plus, Edit2, Power, PowerOff, Search, Filter, Download, X } from 'lucide-react';
import { projectId, publicApiToken } from '@/utils/backend/info';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TIPOS
// ============================================================================

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_name: string;
  setting_short_key: string;
  value_type_id: string;
  default_value: string | null;
  description: string | null;
  allowed_lookup_group_id: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
  
  // Datos desnormalizados (joins)
  value_type_key?: string;
  value_type_label?: string;
  allowed_lookup_group_key?: string;
  allowed_lookup_group_name?: string;
}

interface LookupValue {
  id: string;
  lookup_key: string;
  lookup_label: string;
  is_active: boolean;
}

interface LookupGroup {
  id: string;
  group_key: string;
  group_name: string;
  is_active: boolean;
}

interface FormData {
  setting_key: string;
  setting_name: string;
  setting_short_key: string;
  value_type_id: string;
  default_value: string;
  description: string;
  allowed_lookup_group_id: string;
  is_active: boolean;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function SystemSettingsManagement() {
  const { profile } = useAuth();
  
  // Estados principales
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para catálogos
  const [valueTypes, setValueTypes] = useState<LookupValue[]>([]);
  const [lookupGroups, setLookupGroups] = useState<LookupGroup[]>([]);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [valueTypeFilter, setValueTypeFilter] = useState<string>('all');

  // Estados de modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    setting_key: '',
    setting_name: '',
    setting_short_key: '',
    value_type_id: '',
    default_value: '',
    description: '',
    allowed_lookup_group_id: '',
    is_active: true,
  });

  // Estados de validación
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // ============================================================================
  // CARGA INICIAL
  // ============================================================================

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadSettings(),
        loadValueTypes(),
        loadLookupGroups(),
      ]);
    } catch (err: any) {
      console.error('[SYSTEM-SETTINGS] Error en carga inicial:', err);
      setError(err.message || 'Error cargando datos iniciales');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // LLAMADAS A LA API
  // ============================================================================

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('tt-access-token');
      const response = await fetch(
        `http://localhost:3001/system-settings-management`,
        {
          headers: {
            'Authorization': `Bearer ${token || publicApiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.settings) {
        setSettings(data.settings);
      } else {
        throw new Error(data.error || 'Error cargando parámetros');
      }
    } catch (err: any) {
      console.error('[SYSTEM-SETTINGS] Error cargando parámetros:', err);
      throw err;
    }
  };

  const loadValueTypes = async () => {
    try {
      const token = localStorage.getItem('tt-access-token');
      const response = await fetch(
        `http://localhost:3001/system-settings-management/catalogs/value-types`,
        {
          headers: {
            'Authorization': `Bearer ${token || publicApiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.valueTypes) {
        setValueTypes(data.valueTypes);
      }
    } catch (err: any) {
      console.error('[SYSTEM-SETTINGS] Error cargando tipos de valor:', err);
    }
  };

  const loadLookupGroups = async () => {
    try {
      const token = localStorage.getItem('tt-access-token');
      const response = await fetch(
        `http://localhost:3001/system-settings-management/catalogs/lookup-groups`,
        {
          headers: {
            'Authorization': `Bearer ${token || publicApiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.lookupGroups) {
        setLookupGroups(data.lookupGroups);
      }
    } catch (err: any) {
      console.error('[SYSTEM-SETTINGS] Error cargando grupos de lookup:', err);
    }
  };

  // ============================================================================
  // GUARDAR PARÁMETRO (CREATE/UPDATE)
  // ============================================================================

  const handleSave = async () => {
    // Validaciones
    const errors: Record<string, string> = {};

    if (!formData.setting_key.trim()) {
      errors.setting_key = 'La clave es obligatoria';
    } else if (!/^[A-Z0-9_]+$/.test(formData.setting_key) || formData.setting_key.length < 2) {
      errors.setting_key = 'Debe contener solo A-Z, 0-9 y _ (mínimo 2 caracteres)';
    }

    if (!formData.setting_name.trim()) {
      errors.setting_name = 'El nombre es obligatorio';
    }

    if (!formData.setting_short_key.trim()) {
      errors.setting_short_key = 'El código corto es obligatorio';
    }

    if (!formData.value_type_id) {
      errors.value_type_id = 'El tipo de valor es obligatorio';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSubmitting(true);

    try {
      const token = localStorage.getItem('tt-access-token');
      const url = editingId
        ? `http://localhost:3001/system-settings-management/${editingId}`
        : `http://localhost:3001/system-settings-management`;
      
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token || publicApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar');
      }

      if (data.success) {
        await loadSettings();
        handleCloseModal();
        alert(data.message || 'Parámetro guardado exitosamente');
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err: any) {
      console.error('[SYSTEM-SETTINGS] Error guardando parámetro:', err);
      alert(err.message || 'Error al guardar el parámetro');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================================
  // TOGGLE ESTADO
  // ============================================================================

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    if (!confirm(`¿Confirma ${currentStatus ? 'desactivar' : 'activar'} este parámetro?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('tt-access-token');
      const response = await fetch(
        `http://localhost:3001/system-settings-management/${id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token || publicApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ is_active: !currentStatus }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cambiar estado');
      }

      if (data.success) {
        await loadSettings();
        alert(data.message || 'Estado actualizado');
      }
    } catch (err: any) {
      console.error('[SYSTEM-SETTINGS] Error cambiando estado:', err);
      alert(err.message || 'Error al cambiar el estado');
    }
  };

  // ============================================================================
  // MODAL HANDLERS
  // ============================================================================

  const handleOpenModal = (setting?: SystemSetting) => {
    if (setting) {
      setEditingId(setting.id);
      setFormData({
        setting_key: setting.setting_key,
        setting_name: setting.setting_name,
        setting_short_key: setting.setting_short_key,
        value_type_id: setting.value_type_id,
        default_value: setting.default_value || '',
        description: setting.description || '',
        allowed_lookup_group_id: setting.allowed_lookup_group_id || '',
        is_active: setting.is_active,
      });
    } else {
      setEditingId(null);
      setFormData({
        setting_key: '',
        setting_name: '',
        setting_short_key: '',
        value_type_id: '',
        default_value: '',
        description: '',
        allowed_lookup_group_id: '',
        is_active: true,
      });
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormErrors({});
  };

  // ============================================================================
  // FILTRADO
  // ============================================================================

  const filteredSettings = settings.filter(setting => {
    // Filtro de búsqueda
    const matchesSearch = 
      setting.setting_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      setting.setting_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      setting.setting_short_key.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro de estado
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && setting.is_active) ||
      (statusFilter === 'inactive' && !setting.is_active);

    // Filtro de tipo de valor
    const matchesValueType =
      valueTypeFilter === 'all' ||
      setting.value_type_id === valueTypeFilter;

    return matchesSearch && matchesStatus && matchesValueType;
  });

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading && settings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando parámetros del sistema...</p>
        </div>
      </div>
    );
  }

  if (error && settings.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-800 font-semibold mb-1">Error al cargar</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadInitialData}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parámetros del Sistema</h1>
          <p className="text-gray-600 mt-1">
            Gestión de configuraciones y parámetros del sistema
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nuevo Parámetro
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por clave, nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtro de Estado */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>

          {/* Filtro de Tipo de Valor */}
          <div>
            <select
              value={valueTypeFilter}
              onChange={(e) => setValueTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los tipos</option>
              {valueTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.lookup_label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Resultados */}
        <div className="mt-3 text-sm text-gray-600">
          Mostrando {filteredSettings.length} de {settings.length} parámetros
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clave / Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo de Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor por Defecto
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
              {filteredSettings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <Filter className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-lg">No se encontraron parámetros</p>
                      <p className="text-sm mt-1">Intenta ajustar los filtros de búsqueda</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSettings.map((setting) => (
                  <tr key={setting.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {setting.setting_key}
                        </div>
                        <div className="text-xs text-gray-500">
                          {setting.setting_short_key}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{setting.setting_name}</div>
                      {setting.description && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {setting.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {setting.value_type_label || setting.value_type_key || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {setting.default_value || (
                          <span className="text-gray-400 italic">Sin valor</span>
                        )}
                      </div>
                      {setting.allowed_lookup_group_name && (
                        <div className="text-xs text-gray-500 mt-1">
                          Grupo: {setting.allowed_lookup_group_name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          setting.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {setting.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(setting)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(setting.id, setting.is_active)}
                          className={`${
                            setting.is_active
                              ? 'text-red-600 hover:text-red-900'
                              : 'text-green-600 hover:text-green-900'
                          }`}
                          title={setting.is_active ? 'Desactivar' : 'Activar'}
                        >
                          {setting.is_active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Crear/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingId ? 'Editar Parámetro' : 'Nuevo Parámetro'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Body del Modal */}
            <div className="px-6 py-4 space-y-4">
              {/* Clave del Parámetro */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clave del Parámetro <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.setting_key}
                  onChange={(e) => setFormData({ ...formData, setting_key: e.target.value.toUpperCase() })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    formErrors.setting_key ? 'border-red-500' : 'border-gray-300'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="PARAM_EJEMPLO"
                />
                {formErrors.setting_key && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.setting_key}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Solo mayúsculas, números y guiones bajos (A-Z, 0-9, _)
                </p>
              </div>

              {/* Nombre del Parámetro */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Parámetro <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.setting_name}
                  onChange={(e) => setFormData({ ...formData, setting_name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    formErrors.setting_name ? 'border-red-500' : 'border-gray-300'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="Nombre descriptivo del parámetro"
                />
                {formErrors.setting_name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.setting_name}</p>
                )}
              </div>

              {/* Código Corto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código Corto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.setting_short_key}
                  onChange={(e) => setFormData({ ...formData, setting_short_key: e.target.value.toUpperCase() })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    formErrors.setting_short_key ? 'border-red-500' : 'border-gray-300'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="PEJE"
                />
                {formErrors.setting_short_key && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.setting_short_key}</p>
                )}
              </div>

              {/* Tipo de Valor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Valor <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.value_type_id}
                  onChange={(e) => setFormData({ ...formData, value_type_id: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    formErrors.value_type_id ? 'border-red-500' : 'border-gray-300'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                >
                  <option value="">Seleccione un tipo</option>
                  {valueTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.lookup_label}
                    </option>
                  ))}
                </select>
                {formErrors.value_type_id && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.value_type_id}</p>
                )}
              </div>

              {/* Valor por Defecto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor por Defecto
                </label>
                <input
                  type="text"
                  value={formData.default_value}
                  onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Valor por defecto (opcional)"
                />
              </div>

              {/* Grupo de Lookup Permitido */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grupo de Lookup Permitido
                </label>
                <select
                  value={formData.allowed_lookup_group_id}
                  onChange={(e) => setFormData({ ...formData, allowed_lookup_group_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Ninguno</option>
                  {lookupGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.group_name} ({group.group_key})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Si el tipo es LOOKUP, especifica el grupo permitido
                </p>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descripción del parámetro (opcional)"
                />
              </div>

              {/* Estado Activo */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Parámetro activo
                </label>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

