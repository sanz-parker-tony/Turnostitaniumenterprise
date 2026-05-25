/**
 * SystemSettingsManagement.tsx - Gestion de Parametros del Sistema
 *
 * Modo por rol:
 * - SYSTEM_ADMIN: catalogo maestro (crear/editar/activar-desactivar system_settings)
 * - Roles inferiores (ej. TENANT_ADMIN): solo valores efectivos + origen,
 *   con capacidad de guardar override propio del tenant.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Plus, Edit2, Check, Power, PowerOff, Search, Filter, X } from 'lucide-react';
import { publicApiToken } from '@/utils/backend/info';
import { useAuth } from '@/contexts/AuthContext';
import GridActionIconButton from '@/components/shared/GridActionIconButton';
import HeaderInfoTips from '@/components/shared/HeaderInfoTips';
import SystemAdminPageHeader from '@/components/shared/SystemAdminPageHeader';

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
  value_type_key?: string;
  value_type_label?: string;
  allowed_lookup_group_key?: string;
  allowed_lookup_group_name?: string;
}

interface LookupValue {
  id: string;
  lookup_key: string;
  lookup_label: string;
  is_active?: boolean;
}

interface LookupGroup {
  id: string;
  group_key: string;
  group_name: string;
  is_active: boolean;
}

interface LookupItemPreview {
  id: string;
  lookup_key: string;
  lookup_label: string;
  is_active?: boolean;
}

type SourceLevel = 'PROFILE' | 'COMPANY' | 'TENANT' | 'SYSTEM';

interface EffectiveSetting {
  system_setting_id: string;
  setting_key: string;
  setting_name: string;
  setting_short_key: string;
  value_type_id: string | null;
  value_type_key: string | null;
  allowed_lookup_group_id?: string | null;
  allowed_lookup_group_key?: string | null;
  allowed_lookup_group_name?: string | null;
  default_value: string | null;
  effective_value: string | null;
  local_value: string | null;
  source_level: SourceLevel;
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

const DATA_TYPE_GROUP_ID = 'c4563361-5cf8-4333-c7d1-0868f75e6c2d';

export function SystemSettingsManagement() {
  const { profile } = useAuth();
  const isSystemAdmin = String(profile?.role_key || '').trim().toUpperCase() === 'SYSTEM_ADMIN';
  const tenantId = String(profile?.tenant_id || '').trim();

  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [effectiveSettings, setEffectiveSettings] = useState<EffectiveSetting[]>([]);
  const [valueTypes, setValueTypes] = useState<LookupValue[]>([]);
  const [lookupGroups, setLookupGroups] = useState<LookupGroup[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [valueTypeFilter, setValueTypeFilter] = useState<string>('all');

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

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineValue, setInlineValue] = useState('');
  const [inlineSaving, setInlineSaving] = useState(false);
  const [inlineLookupOptions, setInlineLookupOptions] = useState<LookupItemPreview[]>([]);
  const [inlineLookupLoading, setInlineLookupLoading] = useState(false);
  const [lookupGroupOptions, setLookupGroupOptions] = useState<LookupItemPreview[]>([]);
  const [lookupPreviewValues, setLookupPreviewValues] = useState<LookupItemPreview[]>([]);
  const [lookupPreviewLoading, setLookupPreviewLoading] = useState(false);
  const [lookupPreviewError, setLookupPreviewError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.tenant_id, profile?.role_key]);

  const authHeaders = () => {
    const token = localStorage.getItem('tt-access-token');
    return {
      Authorization: `Bearer ${token || publicApiToken}`,
      'Content-Type': 'application/json',
    };
  };

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSystemAdmin) {
        await Promise.all([loadSettings(), loadValueTypes(), loadLookupGroups()]);
      } else {
        await Promise.all([loadEffectiveSettings(), loadValueTypes()]);
      }
    } catch (err: any) {
      console.error('[SYSTEM-SETTINGS] Error en carga inicial:', err);
      setError(err.message || 'Error cargando datos iniciales');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    const response = await fetch('http://localhost:3001/system-settings-management', {
      headers: authHeaders(),
    });

    if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
    const data = await response.json();

    if (data.success && Array.isArray(data.settings)) {
      setSettings(data.settings);
      return;
    }
    throw new Error(data.error || 'Error cargando parametros');
  };

  const loadEffectiveSettings = async () => {
    if (!tenantId) throw new Error('No se pudo identificar el tenant del usuario');

    const response = await fetch(`http://localhost:3001/settings/all-effective?tenant_id=${tenantId}`, {
      headers: authHeaders(),
    });

    if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
    const data = await response.json();
    setEffectiveSettings(Array.isArray(data.effective_settings) ? data.effective_settings : []);
  };

  const loadValueTypes = async () => {
    const response = await fetch(
      `http://localhost:3001/settings/lookup-values/setting-data-types?lookup_group_id=${DATA_TYPE_GROUP_ID}`,
      { headers: authHeaders() }
    );

    if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
    const data = await response.json();

    if (Array.isArray(data.dataTypes)) {
      setValueTypes(data.dataTypes);
    } else {
      setValueTypes([]);
    }
  };

  const loadLookupGroups = async () => {
    try {
      const response = await fetch('http://localhost:3001/lookup-groups?active_only=true', {
        headers: authHeaders(),
      });
      if (!response.ok) return;
      const data = await response.json();

      const rawGroups = Array.isArray(data.groups)
        ? data.groups
        : Array.isArray(data.lookup_groups)
          ? data.lookup_groups
          : Array.isArray(data.lookupGroups)
            ? data.lookupGroups
            : [];

      const normalizedGroups: LookupGroup[] = rawGroups
        .map((group: any) => ({
          id: String(group.id),
          group_key: String(group.group_key ?? group.lookup_group_key ?? ''),
          group_name: String(group.group_name ?? group.lookup_group_label ?? ''),
          is_active: group.is_active !== false,
        }))
        .filter((group: LookupGroup) => !!group.id && !!group.group_key && !!group.group_name && group.is_active);

      setLookupGroups(normalizedGroups);
    } catch (err) {
      console.error('[SYSTEM-SETTINGS] Error cargando grupos lookup:', err);
    }
  };

  const handleSave = async () => {
    const errors: Record<string, string> = {};

    if (!formData.setting_key.trim()) {
      errors.setting_key = 'La clave es obligatoria';
    } else if (!/^[A-Z0-9_]+$/.test(formData.setting_key) || formData.setting_key.length < 2) {
      errors.setting_key = 'Debe contener solo A-Z, 0-9 y _ (minimo 2 caracteres)';
    }

    if (!formData.setting_name.trim()) errors.setting_name = 'El nombre es obligatorio';
    if (!formData.setting_short_key.trim()) errors.setting_short_key = 'El codigo corto es obligatorio';
    if (!formData.value_type_id) errors.value_type_id = 'El tipo de dato es obligatorio';

    const selectedTypeKey = valueTypeById.get(formData.value_type_id)?.lookup_key || null;
    if (isLookupType(selectedTypeKey) && !formData.allowed_lookup_group_id) {
      errors.allowed_lookup_group_id = 'Debe seleccionar un grupo de lookup para tipo Catalogo';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSubmitting(true);

    try {
      const url = editingId
        ? `http://localhost:3001/system-settings-management/${editingId}`
        : 'http://localhost:3001/system-settings-management';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al guardar');

      await loadSettings();
      handleCloseModal();
      alert(data.message || 'Parametro guardado');
    } catch (err: any) {
      console.error('[SYSTEM-SETTINGS] Error guardando parametro:', err);
      alert(err.message || 'Error al guardar el parametro');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    if (!confirm(`Confirma ${currentStatus ? 'desactivar' : 'activar'} este parametro?`)) return;

    try {
      const response = await fetch(`http://localhost:3001/system-settings-management/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al cambiar estado');

      await loadSettings();
      alert(data.message || 'Estado actualizado');
    } catch (err: any) {
      console.error('[SYSTEM-SETTINGS] Error cambiando estado:', err);
      alert(err.message || 'Error al cambiar el estado');
    }
  };

  const validateByType = (rawValue: string, typeKey: string | null): string | null => {
    if (!typeKey) return null;
    const value = String(rawValue ?? '').trim();
    const normalized = typeKey.toUpperCase();

    switch (normalized) {
      case 'NUMBER':
      case 'INT':
      case 'INTEGER':
      case 'DECIMAL':
      case 'FLOAT':
        return Number.isNaN(Number(value)) ? `El valor '${value}' no es numerico valido` : null;
      case 'BOOLEAN': {
        const b = value.toLowerCase();
        return ['true', 'false', '1', '0', 'yes', 'no'].includes(b)
          ? null
          : `El valor '${value}' no es booleano valido`;
      }
      case 'DATE':
      case 'DATETIME':
        return Number.isNaN(Date.parse(value)) ? `El valor '${value}' no es fecha valida` : null;
      case 'JSON':
        try {
          JSON.parse(value);
          return null;
        } catch {
          return 'El valor no es JSON valido';
        }
      case 'LOOKUP':
        return value ? null : 'Debe seleccionar un valor del catalogo';
      default:
        return null;
    }
  };

  const isLookupType = (typeKey: string | null) => String(typeKey || '').trim().toUpperCase() === 'LOOKUP';
  const resolveEffectiveTypeKey = (setting: EffectiveSetting): string | null =>
    valueTypeById.get(setting.value_type_id || '')?.lookup_key || setting.value_type_key || null;

  const loadInlineLookupOptions = async (groupId: string) => {
    setInlineLookupLoading(true);
    try {
      const resp = await fetch(`http://localhost:3001/lookup-values?group_id=${groupId}`, { headers: authHeaders() });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error cargando opciones de catalogo');
      const values = Array.isArray(data.values) ? data.values : [];
      setInlineLookupOptions(values.map((v: any) => ({
        id: String(v.id),
        lookup_key: String(v.lookup_key),
        lookup_label: String(v.lookup_label),
      })));
    } catch (err: any) {
      setInlineLookupOptions([]);
      alert(err.message || 'No se pudo cargar opciones del catalogo');
    } finally {
      setInlineLookupLoading(false);
    }
  };

  const startInlineEdit = async (s: EffectiveSetting) => {
    const typeKey = resolveEffectiveTypeKey(s);
    setInlineEditingId(s.system_setting_id);
    setInlineValue((s.source_level === 'TENANT' ? s.local_value : s.effective_value) ?? '');
    if (isLookupType(typeKey) && s.allowed_lookup_group_id) {
      await loadInlineLookupOptions(String(s.allowed_lookup_group_id));
    } else {
      setInlineLookupOptions([]);
      setInlineLookupLoading(false);
    }
  };

  const saveInlineEdit = async (s: EffectiveSetting) => {
    if (!tenantId) {
      alert('No se pudo identificar el tenant');
      return;
    }

    const nextValue = String(inlineValue || '').trim();
    if (!nextValue) {
      alert('El valor no puede ser vacio. Para heredar, elimina el override existente.');
      return;
    }

    const inferredTypeKey = resolveEffectiveTypeKey(s);
    const typeError = validateByType(nextValue, inferredTypeKey);
    if (typeError) {
      alert(typeError);
      return;
    }

    setInlineSaving(true);
    try {
      const response = await fetch(`http://localhost:3001/settings/tenants/${tenantId}/settings-overrides`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          system_setting_id: s.system_setting_id,
          setting_value: nextValue,
          created_by: profile?.email || profile?.username || 'ADMIN',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al guardar override');

      await loadEffectiveSettings();
      setInlineEditingId(null);
      setInlineValue('');
      setInlineLookupOptions([]);
    } catch (err: any) {
      console.error('[SYSTEM-SETTINGS] Error guardando override tenant:', err);
      alert(err.message || 'Error guardando override tenant');
    } finally {
      setInlineSaving(false);
    }
  };

  const sourceLabel = (source: SourceLevel) => {
    switch (source) {
      case 'PROFILE': return 'employee_profile';
      case 'COMPANY': return 'company';
      case 'TENANT': return 'tenant';
      default: return 'system';
    }
  };

  const openModalForSetting = (setting?: SystemSetting) => {
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

  const valueTypeById = useMemo(() => {
    const map = new Map<string, LookupValue>();
    valueTypes.forEach(v => map.set(v.id, v));
    return map;
  }, [valueTypes]);
  const selectedValueTypeKey = valueTypeById.get(formData.value_type_id)?.lookup_key || null;
  const isModalLookupType = isLookupType(selectedValueTypeKey);


  useEffect(() => {
    const loadPreview = async () => {
      if (!isSystemAdmin || !isModalOpen || !isModalLookupType || !formData.allowed_lookup_group_id) {
        setLookupGroupOptions([]);
        setLookupPreviewValues([]);
        setLookupPreviewError(null);
        setLookupPreviewLoading(false);
        return;
      }
      setLookupPreviewLoading(true);
      setLookupPreviewError(null);
      try {
        const resp = await fetch(
          `http://localhost:3001/lookup-values?group_id=${formData.allowed_lookup_group_id}`,
          { headers: authHeaders() }
        );
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Error cargando valores del grupo');
        const values = Array.isArray(data.values) ? data.values : [];
        const activeValues: LookupItemPreview[] = values
          .filter((value: any) => value.is_active !== false)
          .map((value: any) => ({
            id: String(value.id),
            lookup_key: String(value.lookup_key),
            lookup_label: String(value.lookup_label),
            is_active: value.is_active !== false,
          }));
        setLookupGroupOptions(activeValues);
        setLookupPreviewValues(activeValues.slice(0, 8));
      } catch (err: any) {
        setLookupGroupOptions([]);
        setLookupPreviewValues([]);
        setLookupPreviewError(err.message || 'No se pudo cargar vista previa');
      } finally {
        setLookupPreviewLoading(false);
      }
    };
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSystemAdmin, isModalOpen, isModalLookupType, formData.allowed_lookup_group_id]);

  const filteredSettings = useMemo(() => settings.filter((setting) => {
    const matchesSearch =
      setting.setting_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      setting.setting_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      setting.setting_short_key.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && setting.is_active) ||
      (statusFilter === 'inactive' && !setting.is_active);

    const matchesValueType =
      valueTypeFilter === 'all' ||
      setting.value_type_id === valueTypeFilter;

    return matchesSearch && matchesStatus && matchesValueType;
  }), [settings, searchTerm, statusFilter, valueTypeFilter]);

  const filteredEffective = useMemo(() => effectiveSettings.filter((setting) => {
    const matchesSearch =
      setting.setting_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      setting.setting_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      setting.setting_short_key.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesValueType =
      valueTypeFilter === 'all' ||
      setting.value_type_id === valueTypeFilter;

    return matchesSearch && matchesValueType;
  }), [effectiveSettings, searchTerm, valueTypeFilter]);

  if (loading && settings.length === 0 && effectiveSettings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando parametros del sistema...</p>
        </div>
      </div>
    );
  }

  if (error && settings.length === 0 && effectiveSettings.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-800 font-semibold mb-1">Error al cargar</h3>
            <p className="text-red-700">{error}</p>
            <button onClick={loadInitialData} className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const listCount = isSystemAdmin ? filteredSettings.length : filteredEffective.length;
  const totalCount = isSystemAdmin ? settings.length : effectiveSettings.length;

  return (
    <div className="p-6 max-w-full space-y-6">
      <SystemAdminPageHeader
        icon={Edit2}
        title="Parametros del Sistema"
        subtitle="Gestion de configuraciones y parametros del sistema"
        rightSlot={isSystemAdmin ? (
          <>
            <HeaderInfoTips
              items={[
                {
                  title: 'Herencia de valores',
                  text: 'La prioridad de valores es: system -> tenant -> company -> employee_profile.',
                },
                {
                  title: 'Catalogos',
                  text: 'Si el tipo de dato es Catalogo, selecciona un Grupo de Lookup para restringir los valores permitidos.',
                },
              ]}
            />
            <button
              onClick={() => openModalForSetting()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Nuevo Parametro
            </button>
          </>
        ) : null}
      />

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por clave, nombre o codigo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              disabled={!isSystemAdmin}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>

          <div>
            <select
              value={valueTypeFilter}
              onChange={(e) => setValueTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los tipos</option>
              {valueTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.lookup_label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-600">Mostrando {listCount} de {totalCount} parametros</div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clave / Codigo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Valor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isSystemAdmin ? 'Valor por Defecto' : 'Valor Efectivo'}
                </th>
                {!isSystemAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {isSystemAdmin ? 'Estado' : 'Valor System'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {listCount === 0 ? (
                <tr>
                  <td colSpan={isSystemAdmin ? 6 : 7} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <Filter className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-lg">No se encontraron parametros</p>
                      <p className="text-sm mt-1">Intenta ajustar los filtros de busqueda</p>
                    </div>
                  </td>
                </tr>
              ) : isSystemAdmin ? (
                filteredSettings.map((setting) => (
                  <tr key={setting.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{setting.setting_key}</div>
                        <div className="text-xs text-gray-500">{setting.setting_short_key}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{setting.setting_name}</div>
                      {setting.description && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{setting.description}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {setting.value_type_label || setting.value_type_key || valueTypeById.get(setting.value_type_id)?.lookup_label || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{setting.default_value || <span className="text-gray-400 italic">Sin valor</span>}</div>
                      {setting.allowed_lookup_group_name && <div className="text-xs text-gray-500 mt-1">Grupo: {setting.allowed_lookup_group_name}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${setting.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {setting.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <GridActionIconButton
                          onClick={() => openModalForSetting(setting)}
                          icon={<Edit2 className="h-4 w-4" />}
                          label="Editar"
                          tone="blue"
                        />
                        <GridActionIconButton
                          onClick={() => handleToggleStatus(setting.id, setting.is_active)}
                          icon={setting.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                          label={setting.is_active ? 'Desactivar' : 'Activar'}
                          tone='amber'
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                filteredEffective.map((s) => (
                  <tr key={s.system_setting_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{s.setting_key}</div>
                        <div className="text-xs text-gray-500">{s.setting_short_key}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{s.setting_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {valueTypeById.get(s.value_type_id || '')?.lookup_label || s.value_type_key || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {inlineEditingId === s.system_setting_id ? (
                        isLookupType(resolveEffectiveTypeKey(s)) ? (
                          <select
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                            disabled={inlineLookupLoading}
                          >
                            <option value="">
                              {inlineLookupLoading ? 'Cargando opciones...' : 'Seleccione valor'}
                            </option>
                            {inlineLookupOptions.map((opt) => (
                              <option key={opt.id} value={opt.lookup_key}>
                                {opt.lookup_label} ({opt.lookup_key})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                          />
                        )
                      ) : (
                        <div className="text-sm text-gray-900">{s.effective_value ?? '—'}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {sourceLabel(s.source_level)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{s.default_value ?? '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <GridActionIconButton
                        onClick={() => inlineEditingId === s.system_setting_id ? saveInlineEdit(s) : startInlineEdit(s)}
                        icon={inlineEditingId === s.system_setting_id ? <Check className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                        label={inlineEditingId === s.system_setting_id ? 'Grabar valor' : 'Editar valor del tenant'}
                        disabled={inlineSaving}
                        tone={inlineEditingId === s.system_setting_id ? 'green' : 'blue'}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isSystemAdmin && isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{editingId ? 'Editar Parametro' : 'Nuevo Parametro'}</h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clave del Parametro <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.setting_key}
                  onChange={(e) => setFormData({ ...formData, setting_key: e.target.value.toUpperCase() })}
                  className={`w-full px-3 py-2 border rounded-lg ${formErrors.setting_key ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="PARAM_EJEMPLO"
                />
                {formErrors.setting_key && <p className="mt-1 text-sm text-red-600">{formErrors.setting_key}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Parametro <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.setting_name}
                  onChange={(e) => setFormData({ ...formData, setting_name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${formErrors.setting_name ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                {formErrors.setting_name && <p className="mt-1 text-sm text-red-600">{formErrors.setting_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Codigo Corto <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.setting_short_key}
                  onChange={(e) => setFormData({ ...formData, setting_short_key: e.target.value.toUpperCase() })}
                  className={`w-full px-3 py-2 border rounded-lg ${formErrors.setting_short_key ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                {formErrors.setting_short_key && <p className="mt-1 text-sm text-red-600">{formErrors.setting_short_key}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Datos <span className="text-red-500">*</span></label>
                <select
                  value={formData.value_type_id}
                  onChange={(e) => {
                    const nextTypeId = e.target.value;
                    const nextTypeKey = valueTypeById.get(nextTypeId)?.lookup_key || null;
                    const keepLookupGroup = isLookupType(nextTypeKey);
                    setFormData({
                      ...formData,
                      value_type_id: nextTypeId,
                      allowed_lookup_group_id: keepLookupGroup ? formData.allowed_lookup_group_id : '',
                      default_value: keepLookupGroup ? formData.default_value : '',
                    });
                  }}
                  className={`w-full px-3 py-2 border rounded-lg ${formErrors.value_type_id ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                >
                  <option value="">Seleccione un tipo</option>
                  {valueTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.lookup_label}</option>
                  ))}
                </select>
                {formErrors.value_type_id && <p className="mt-1 text-sm text-red-600">{formErrors.value_type_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor por Defecto</label>
                {isModalLookupType ? (
                  <select
                    value={formData.default_value}
                    onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!formData.allowed_lookup_group_id || lookupPreviewLoading}
                  >
                    <option value="">
                      {!formData.allowed_lookup_group_id
                        ? 'Seleccione primero un Grupo de Lookup'
                        : lookupPreviewLoading
                          ? 'Cargando valores...'
                          : 'Seleccione un valor del catalogo'}
                    </option>
                    {lookupGroupOptions.map((item) => (
                      <option key={item.id} value={item.lookup_key}>
                        {item.lookup_label} ({item.lookup_key})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.default_value}
                    onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grupo de Lookup Permitido
                </label>
                <select
                  value={formData.allowed_lookup_group_id}
                  onChange={(e) => setFormData({ ...formData, allowed_lookup_group_id: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formErrors.allowed_lookup_group_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Ninguno</option>
                  {lookupGroups.map((group) => (
                    <option key={group.id} value={group.id}>{group.group_name} ({group.group_key})</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Use este campo cuando el parametro deba tomar su valor desde un catalogo.
                  En ese caso, el sistema restringe los valores al grupo elegido.
                </p>
                {formData.allowed_lookup_group_id && (
                  <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                    <div className="text-xs font-medium text-slate-700 mb-1">Vista previa de valores del grupo</div>
                    {lookupPreviewLoading && (
                      <div className="text-xs text-slate-500">Cargando valores...</div>
                    )}
                    {!lookupPreviewLoading && lookupPreviewError && (
                      <div className="text-xs text-red-600">{lookupPreviewError}</div>
                    )}
                    {!lookupPreviewLoading && !lookupPreviewError && lookupPreviewValues.length === 0 && (
                      <div className="text-xs text-slate-500">El grupo no tiene valores activos.</div>
                    )}
                    {!lookupPreviewLoading && !lookupPreviewError && lookupPreviewValues.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {lookupPreviewValues.map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center rounded-full bg-white border border-slate-200 px-2 py-0.5 text-xs text-slate-700"
                          >
                            {item.lookup_label} ({item.lookup_key})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Parametro activo</label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
              <button onClick={handleCloseModal} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100" disabled={submitting}>
                Cancelar
              </button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={submitting}>
                {submitting ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


