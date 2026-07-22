/**
 * CatalogManagement.tsx
 * Turnos Titanium Enterprise
 * 
 * Pantalla de gestion de catalogos (lookup_groups y lookup_values)
 * Sistema maestro-detalle con CRUD completo y traducciones
 */

import { buildApiUrl } from '../../../utils/api-config';
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Languages,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { projectId, publicApiToken } from '../../../utils/backend/info';
import { useAuth } from '../../../contexts/AuthContext';
import SystemAdminPageHeader from '../../shared/SystemAdminPageHeader';
import HeaderInfoTips from '../../shared/HeaderInfoTips';
import GridActionIconButton from '../../shared/GridActionIconButton';

// ============================================================================
// INTERFACES
// ============================================================================

interface LookupGroup {
  id: string;
  lookup_group_key: string;
  lookup_group_label: string;
  lookup_group_short_label: string;
  allows_tenant_items: boolean;
  is_active: boolean;
  created_at: string;
  created_by?: string | null;
  owner_tenant_id?: string | null;
  is_tenant_catalog?: boolean;
  can_edit_for_current_user?: boolean;
  management_policy?: {
    value_scope?: 'SYSTEM' | 'TENANT' | 'INHERIT';
    value_permissions?: Partial<Record<'create' | 'update' | 'delete', string[]>>;
    required_metadata?: Record<string, { type?: string; label?: string; unique_within_group?: boolean }>;
  };
  lookup_group_translations?: LookupGroupTranslation[];
}

interface LookupGroupTranslation {
  id?: string;
  language_code: string;
  label: string;
  short_label: string;
}

interface LookupValue {
  id: string;
  lookup_group_id: string;
  tenant_id?: string | null;
  lookup_key: string;
  lookup_label: string;
  lookup_short_label: string;
  lookup_scope: 'SYSTEM' | 'TENANT';
  sort_order: number;
  is_active: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  lookup_value_translations?: LookupValueTranslation[];
}

interface LookupValueTranslation {
  id?: string;
  language_code: string;
  label: string;
  short_label: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function CatalogManagement() {
  const { profile, session } = useAuth();
  const roleKey = String(profile?.role_key || '').trim().toUpperCase();
  const currentTenantId = String(profile?.tenant_id || '').trim();
  const isSystemAdmin = roleKey === 'SYSTEM_ADMIN';
  const isTenantAdmin = roleKey === 'TENANT_ADMIN';
  const canManageCatalogs = isSystemAdmin || isTenantAdmin;

  const getToken = () =>
    session?.access_token ||
    localStorage.getItem('tt-access-token') ||
    localStorage.getItem('access_token') ||
    publicApiToken;

  const authHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  });

  // Estados
  const [groups, setGroups] = useState<LookupGroup[]>([]);
  const [values, setValues] = useState<LookupValue[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<LookupGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showValueModal, setShowValueModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<LookupGroup | null>(null);
  const [editingValue, setEditingValue] = useState<LookupValue | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Form states
  const [groupForm, setGroupForm] = useState({
    lookup_group_key: '',
    lookup_group_label: '',
    lookup_group_short_label: '',
    allows_tenant_items: false,
    is_active: true,
  });

  const [valueForm, setValueForm] = useState({
    lookup_key: '',
    lookup_label: '',
    lookup_short_label: '',
    lookup_scope: 'SYSTEM' as 'SYSTEM' | 'TENANT',
    sort_order: 0,
    metadata: {} as Record<string, unknown>,
    is_active: true,
  });

  const [groupTranslations, setGroupTranslations] = useState<LookupGroupTranslation[]>([
    { language_code: 'en', label: '', short_label: '' }
  ]);

  const [valueTranslations, setValueTranslations] = useState<LookupValueTranslation[]>([
    { language_code: 'en', label: '', short_label: '' }
  ]);

  const isTenantOwnedGroup = (group: LookupGroup | null) => {
    if (!group) return false;
    if (group.owner_tenant_id) return group.owner_tenant_id === currentTenantId;
    if (group.is_tenant_catalog === true) return true;
    const createdBy = String(group.created_by || '');
    return createdBy === `TENANT_ADMIN:${currentTenantId}`;
  };

  const canEditGroup = (group: LookupGroup | null) => {
    if (!group) return false;
    if (isSystemAdmin) return true;
    if (!isTenantAdmin) return false;
    if (typeof group.can_edit_for_current_user === 'boolean') {
      return group.can_edit_for_current_user;
    }
    return isTenantOwnedGroup(group);
  };

  const canCreateValueInGroup = (group: LookupGroup | null) => {
    if (!group) return false;
    const configuredRoles = group.management_policy?.value_permissions?.create;
    if (Array.isArray(configuredRoles) && configuredRoles.length > 0) {
      return configuredRoles.some((role) => String(role).trim().toUpperCase() === roleKey);
    }
    if (isSystemAdmin) return true;
    if (isTenantAdmin) return !!group.allows_tenant_items;
    return false;
  };

  const canEditValue = (value: LookupValue, group: LookupGroup | null) => {
    const configuredRoles = group?.management_policy?.value_permissions?.update;
    if (Array.isArray(configuredRoles) && configuredRoles.length > 0) {
      return configuredRoles.some((role) => String(role).trim().toUpperCase() === roleKey);
    }
    if (isSystemAdmin) return true;
    if (!isTenantAdmin) return false;
    if (String(value.lookup_scope || '').toUpperCase() === 'SYSTEM' || !value.tenant_id) {
      return false;
    }
    if (isTenantOwnedGroup(group)) {
      return value.tenant_id === currentTenantId;
    }
    return value.tenant_id === currentTenantId;
  };

  const hasPartialTranslation = <T extends { label: string; short_label: string }>(arr: T[]) =>
    arr.some(t => {
      const label = String(t.label || '').trim();
      const shortLabel = String(t.short_label || '').trim();
      return (label && !shortLabel) || (!label && shortLabel);
    });

  // ============================================================================
  // API CALLS
  // ============================================================================

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        buildApiUrl(`/lookup-groups`),
        {
          headers: authHeaders()
        }
      );

      if (!res.ok) {
        throw new Error('Error al cargar grupos de catalogo');
      }

      const data = await res.json();
      setGroups(data.groups || []);
    } catch (err: any) {
      console.error('[CATALOG] Error cargando grupos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadValues = async (groupId: string) => {
    try {
      const res = await fetch(
        buildApiUrl(`/lookup-values?group_id=${groupId}`),
        {
          headers: authHeaders()
        }
      );

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Error al cargar valores del catalogo');
      }

      const data = await res.json();
      setValues(data.values || []);
    } catch (err: any) {
      console.error('[CATALOG] Error cargando valores:', err);
      alert(err?.message || 'Error al cargar valores del catalogo');
    }
  };

  const loadGroupById = async (groupId: string): Promise<LookupGroup | null> => {
    const res = await fetch(buildApiUrl(`/lookup-groups/${groupId}`), { headers: authHeaders() });
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      throw new Error(payload?.error || 'No se pudo cargar el grupo');
    }
    const data = await res.json();
    return (data?.group || null) as LookupGroup | null;
  };

  const loadValueById = async (valueId: string): Promise<LookupValue | null> => {
    const res = await fetch(buildApiUrl(`/lookup-values/${valueId}`), { headers: authHeaders() });
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      throw new Error(payload?.error || 'No se pudo cargar el valor');
    }
    const data = await res.json();
    return (data?.value || null) as LookupValue | null;
  };

  const saveGroup = async () => {
    try {
      if (!canManageCatalogs) {
        alert('No autorizado para crear o editar grupos de catalogo');
        return;
      }

      if (editingGroup && !canEditGroup(editingGroup)) {
        alert('TENANT_ADMIN solo puede editar grupos creados por su tenant');
        return;
      }

      if (!groupForm.lookup_group_key.trim()) {
        alert('La clave del grupo es obligatoria');
        return;
      }

      if (!groupForm.lookup_group_label.trim()) {
        alert('La etiqueta del grupo es obligatoria');
        return;
      }

      if (!groupForm.lookup_group_short_label.trim()) {
        alert('La etiqueta corta del grupo es obligatoria');
        return;
      }

      if (hasPartialTranslation(groupTranslations)) {
        alert('En traducciones de grupo, complete Etiqueta y Etiqueta Corta o deje ambas vacias.');
        return;
      }

      const url = editingGroup
        ? buildApiUrl(`/lookup-groups/${editingGroup.id}`)
        : buildApiUrl(`/lookup-groups`);

      const method = editingGroup ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify({
          ...groupForm,
          translations: groupTranslations.filter(t => t.label.trim() && t.short_label.trim())
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al guardar el grupo');
      }

      await loadGroups();
      closeGroupModal();
      alert(editingGroup ? 'Grupo actualizado exitosamente' : 'Grupo creado exitosamente');
    } catch (err: any) {
      console.error('[CATALOG] Error guardando grupo:', err);
      alert(err.message);
    }
  };

  const saveValue = async () => {
    try {
      if (!selectedGroup) {
        alert('Debe seleccionar un grupo primero');
        return;
      }

      if (!canCreateValueInGroup(selectedGroup) && !editingValue) {
        alert('Este catalogo no permite agregar items de tenant');
        return;
      }

      if (editingValue && !canEditValue(editingValue, selectedGroup)) {
        alert('No puede editar este item de catalogo');
        return;
      }

      if (!valueForm.lookup_key.trim()) {
        alert('La clave es obligatoria');
        return;
      }

      if (!valueForm.lookup_label.trim()) {
        alert('La etiqueta es obligatoria');
        return;
      }

      if (!valueForm.lookup_short_label.trim()) {
        alert('La etiqueta corta es obligatoria');
        return;
      }

      if (hasPartialTranslation(valueTranslations)) {
        alert('En traducciones del valor, complete Etiqueta y Etiqueta Corta o deje ambas vacias.');
        return;
      }

      const url = editingValue
        ? buildApiUrl(`/lookup-values/${editingValue.id}`)
        : buildApiUrl(`/lookup-values`);

      const method = editingValue ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify({
          ...valueForm,
          tenant_id: isTenantAdmin ? currentTenantId : undefined,
          lookup_scope: isTenantAdmin ? 'TENANT' : valueForm.lookup_scope,
          lookup_group_id: selectedGroup.id,
          translations: valueTranslations.filter(t => t.label.trim() && t.short_label.trim())
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al guardar el valor');
      }

      await loadValues(selectedGroup.id);
      closeValueModal();
      alert(editingValue ? 'Valor actualizado exitosamente' : 'Valor creado exitosamente');
    } catch (err: any) {
      console.error('[CATALOG] Error guardando valor:', err);
      alert(err.message);
    }
  };

  const toggleValueStatus = async (value: LookupValue) => {
    try {
      if (!canEditValue(value, selectedGroup)) {
        alert('No puede modificar este item');
        return;
      }

      const res = await fetch(
        buildApiUrl(`/lookup-values/${value.id}`),
        {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({
            lookup_label: value.lookup_label,
            lookup_short_label: value.lookup_short_label,
            lookup_scope: isTenantAdmin ? 'TENANT' : value.lookup_scope,
            sort_order: value.sort_order,
            metadata: value.metadata || {},
            is_active: !value.is_active,
            translations: value.lookup_value_translations || []
          })
        }
      );

      if (!res.ok) {
        throw new Error('Error al cambiar estado');
      }

      if (selectedGroup) {
        await loadValues(selectedGroup.id);
      }
    } catch (err: any) {
      console.error('[CATALOG] Error cambiando estado:', err);
      alert('Error al cambiar el estado del valor');
    }
  };

  const removeGroup = async (group: LookupGroup) => {
    try {
      if (!canEditGroup(group)) {
        alert('No autorizado para eliminar este grupo');
        return;
      }

      // Validacion de negocio: un grupo con valores asociados no se puede eliminar.
      const valuesRes = await fetch(
        buildApiUrl(`/lookup-values?group_id=${group.id}`),
        { headers: authHeaders() }
      );
      if (!valuesRes.ok) {
        const payload = await valuesRes.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo validar si el grupo tiene valores asociados');
      }
      const valuesPayload = await valuesRes.json().catch(() => ({}));
      const relatedValues = Array.isArray(valuesPayload?.values) ? valuesPayload.values.length : 0;
      if (relatedValues > 0) {
        alert(
          `No se puede eliminar el grupo "${group.lookup_group_key}" porque tiene ${relatedValues} valor(es) asociado(s). ` +
          'Primero elimina o reasigna esos valores.'
        );
        return;
      }

      const ok = window.confirm(`¿Eliminar el grupo ${group.lookup_group_key}?`);
      if (!ok) return;

      const res = await fetch(buildApiUrl(`/lookup-groups/${group.id}`), {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Error eliminando grupo');

      if (selectedGroup?.id === group.id) {
        setSelectedGroup(null);
        setValues([]);
      }
      await loadGroups();
    } catch (err: any) {
      console.error('[CATALOG] Error eliminando grupo:', err);
      alert(err?.message || 'Error eliminando grupo');
    }
  };

  const removeValue = async (value: LookupValue) => {
    try {
      if (!canEditValue(value, selectedGroup)) {
        alert('No autorizado para eliminar este valor');
        return;
      }
      const ok = window.confirm(`¿Eliminar el valor ${value.lookup_key}?`);
      if (!ok) return;

      const res = await fetch(buildApiUrl(`/lookup-values/${value.id}`), {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'Error eliminando valor');

      if (selectedGroup) await loadValues(selectedGroup.id);
    } catch (err: any) {
      console.error('[CATALOG] Error eliminando valor:', err);
      alert(err?.message || 'Error eliminando valor');
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const openGroupModal = async (group?: LookupGroup) => {
    if (group && !canEditGroup(group)) {
      alert('TENANT_ADMIN solo puede editar grupos creados por su tenant');
      return;
    }

    if (group) {
      let sourceGroup = group;
      try {
        const fresh = await loadGroupById(group.id);
        if (fresh) {
          if (
            (!Array.isArray(fresh.lookup_group_translations) || fresh.lookup_group_translations.length === 0) &&
            Array.isArray(group.lookup_group_translations) &&
            group.lookup_group_translations.length > 0
          ) {
            fresh.lookup_group_translations = group.lookup_group_translations;
          }
          sourceGroup = fresh;
        }
      } catch (err: any) {
        console.warn('[CATALOG] No se pudo refrescar grupo por id, usando datos de lista:', err?.message || err);
      }

      setEditingGroup(sourceGroup);
      setGroupForm({
        lookup_group_key: sourceGroup.lookup_group_key,
        lookup_group_label: sourceGroup.lookup_group_label,
        lookup_group_short_label: sourceGroup.lookup_group_short_label,
        allows_tenant_items: sourceGroup.allows_tenant_items,
        is_active: sourceGroup.is_active,
      });
      setGroupTranslations(
        sourceGroup.lookup_group_translations && sourceGroup.lookup_group_translations.length > 0
          ? sourceGroup.lookup_group_translations
          : [{ language_code: 'en', label: '', short_label: '' }]
      );
    } else {
      setEditingGroup(null);
      setGroupForm({
        lookup_group_key: '',
        lookup_group_label: '',
        lookup_group_short_label: '',
        allows_tenant_items: isTenantAdmin ? true : false,
        is_active: true,
      });
      setGroupTranslations([{ language_code: 'en', label: '', short_label: '' }]);
    }
    setShowGroupModal(true);
  };

  const closeGroupModal = () => {
    setShowGroupModal(false);
    setEditingGroup(null);
  };

  const openValueModal = async (value?: LookupValue) => {
    if (!selectedGroup) {
      alert('Debe seleccionar un grupo primero');
      return;
    }

    if (!value && !canCreateValueInGroup(selectedGroup)) {
      alert('Este catalogo no permite agregar items de tenant');
      return;
    }

    if (value && !canEditValue(value, selectedGroup)) {
      alert('No puede editar este item de catalogo');
      return;
    }

    if (value) {
      let sourceValue = value;
      try {
        const fresh = await loadValueById(value.id);
        if (fresh) {
          if (
            (!Array.isArray(fresh.lookup_value_translations) || fresh.lookup_value_translations.length === 0) &&
            Array.isArray(value.lookup_value_translations) &&
            value.lookup_value_translations.length > 0
          ) {
            fresh.lookup_value_translations = value.lookup_value_translations;
          }
          sourceValue = fresh;
        }
      } catch (err: any) {
        console.warn('[CATALOG] No se pudo refrescar valor por id, usando datos de lista:', err?.message || err);
      }

      setEditingValue(sourceValue);
      setValueForm({
        lookup_key: sourceValue.lookup_key,
        lookup_label: sourceValue.lookup_label,
        lookup_short_label: sourceValue.lookup_short_label,
        lookup_scope: isTenantAdmin ? 'TENANT' : sourceValue.lookup_scope,
        sort_order: sourceValue.sort_order,
        metadata: sourceValue.metadata || {},
        is_active: sourceValue.is_active,
      });
      setValueTranslations(
        sourceValue.lookup_value_translations && sourceValue.lookup_value_translations.length > 0
          ? sourceValue.lookup_value_translations
          : [{ language_code: 'en', label: '', short_label: '' }]
      );
    } else {
      setEditingValue(null);
      const maxOrder = values.length > 0 ? Math.max(...values.map(v => v.sort_order)) : 0;
      setValueForm({
        lookup_key: '',
        lookup_label: '',
        lookup_short_label: '',
        lookup_scope: isTenantAdmin ? 'TENANT' : 'SYSTEM',
        sort_order: maxOrder + 10,
        metadata: {},
        is_active: true,
      });
      setValueTranslations([{ language_code: 'en', label: '', short_label: '' }]);
    }
    setShowValueModal(true);
  };

  const closeValueModal = () => {
    setShowValueModal(false);
    setEditingValue(null);
  };

  const handleSelectGroup = async (group: LookupGroup) => {
    setSelectedGroup(group);
    setExpandedGroup(group.id === expandedGroup ? null : group.id);
    if (group.id !== expandedGroup) {
      await loadValues(group.id);
    }
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    loadGroups();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenantId, roleKey]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando catalogos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          <p className="font-medium">{error}</p>
        </div>
      </div>
    );
  }

  const filteredGroups = groups.filter(g =>
    g.lookup_group_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.lookup_group_label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.lookup_group_short_label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-full space-y-6">
      <SystemAdminPageHeader
        icon={Languages}
        title="Gestion de Catalogos"
        subtitle="Administra los grupos de catalogo y sus valores"
        rightSlot={(
          <HeaderInfoTips
            items={[
              {
                title: 'Catálogos del tenant',
                text: 'TENANT_ADMIN puede crear y administrar grupos/valores propios del tenant.',
                variant: 'security',
              },
              {
                title: 'Consejo',
                text: 'Solo grupos con "Permite items de tenant" aceptan nuevos valores desde TENANT_ADMIN.',
                variant: 'tip',
              },
              {
                title: 'Validación de eliminación',
                text: 'Un grupo solo puede eliminarse cuando no tiene valores asociados.',
                variant: 'warning',
              },
            ]}
          />
        )}
      />

      {/* Search */}
      <div className="rounded-lg border bg-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar grupos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div className="mt-3 text-sm text-gray-600">
          Mostrando {filteredGroups.length} de {groups.length} grupos de catalogo
        </div>
      </div>

      {/* Groups List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel izquierdo: Grupos */}
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Grupos de Catalogo</h2>
            <button
              onClick={() => openGroupModal()}
              disabled={!canManageCatalogs}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#0074D9] text-white hover:bg-[#0074D9]/90 h-9 px-3 gap-2"
            >
              <Plus className="size-4" />
              Nuevo Grupo
            </button>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No se encontraron grupos
              </div>
            ) : (
              filteredGroups.map(group => (
                <div
                  key={group.id}
                  className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                    selectedGroup?.id === group.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleSelectGroup(group)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {expandedGroup === group.id ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-sm">{group.lookup_group_key}</span>
                          {!group.is_active && (
                            <span className="text-xs text-muted-foreground">(Inactivo)</span>
                          )}
                        </div>
                        <p className="text-sm mt-1">{group.lookup_group_label}</p>
                        <p className="text-xs text-muted-foreground">{group.lookup_group_short_label}</p>
                        {isTenantOwnedGroup(group) && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-violet-100 text-violet-700 mt-2 ml-2">
                            Catalogo del tenant
                          </span>
                        )}
                        {group.allows_tenant_items && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 mt-2">
                            Permite items de tenant
                          </span>
                        )}
                        {(() => {
                          const trEn = (group.lookup_group_translations || []).find(
                            (t) => String(t.language_code || '').toLowerCase() === 'en'
                          );
                          if (!trEn) return null;
                          return (
                            <p className="text-xs text-muted-foreground mt-1">
                              EN: {trEn.label} / {trEn.short_label}
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                    {canEditGroup(group) && (
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GridActionIconButton
                          onClick={() => openGroupModal(group)}
                          icon={<Edit2 className="size-4" />}
                          label="Editar"
                          tone="blue"
                        />
                        <GridActionIconButton
                          onClick={() => void removeGroup(group)}
                          icon={<Trash2 className="size-4" />}
                          label="Eliminar"
                          tone="red"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel derecho: Valores */}
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4 flex items-center justify-between">
            <h2 className="font-semibold">
              {selectedGroup ? `Valores de ${selectedGroup.lookup_group_label}` : 'Valores'}
            </h2>
            {selectedGroup && (
              canCreateValueInGroup(selectedGroup) ? (
                <button
                  onClick={() => openValueModal()}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-[#0074D9] text-white hover:bg-[#0074D9]/90 h-9 px-3 gap-2"
                >
                  <Plus className="size-4" />
                  Nuevo Valor
                </button>
              ) : null
            )}
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {!selectedGroup ? (
              <div className="p-8 text-center text-muted-foreground">
                Selecciona un grupo para ver sus valores
              </div>
            ) : values.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Este grupo no tiene valores
              </div>
            ) : (
              values.map(value => (
                <div key={value.id} className="p-4 hover:bg-accent transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-sm">{value.lookup_key}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {value.lookup_scope}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Orden: {value.sort_order}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{value.lookup_label}</p>
                      <p className="text-xs text-muted-foreground">{value.lookup_short_label}</p>
                      {Object.keys(selectedGroup.management_policy?.required_metadata || {}).map((metadataKey) => (
                        <p key={metadataKey} className="text-xs text-muted-foreground">
                          {selectedGroup.management_policy?.required_metadata?.[metadataKey]?.label || metadataKey}: {String(value.metadata?.[metadataKey] ?? '-')}
                        </p>
                      ))}
                      {(() => {
                        const trEn = (value.lookup_value_translations || []).find(
                          (t) => String(t.language_code || '').toLowerCase() === 'en'
                        );
                        if (!trEn) return null;
                        return (
                          <p className="text-xs text-muted-foreground mt-1">
                            EN: {trEn.label} / {trEn.short_label}
                          </p>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      {canEditValue(value, selectedGroup) ? (
                        <>
                          <button
                            onClick={() => toggleValueStatus(value)}
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                              value.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {value.is_active ? 'Activo' : 'Inactivo'}
                          </button>
                          <GridActionIconButton
                            onClick={() => openValueModal(value)}
                            icon={<Edit2 className="size-4" />}
                            label="Editar"
                            tone="blue"
                          />
                          <GridActionIconButton
                            onClick={() => void removeValue(value)}
                            icon={<Trash2 className="size-4" />}
                            label="Eliminar"
                            tone="red"
                          />
                        </>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                            value.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {value.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Grupo */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="border-b p-4 flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                {editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'}
              </h3>
              <button onClick={closeGroupModal} className="p-2 hover:bg-accent rounded-md">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                <label className="text-sm font-medium">Clave del Grupo *</label>
                <input
                  type="text"
                  value={groupForm.lookup_group_key}
                  onChange={(e) => setGroupForm({ ...groupForm, lookup_group_key: e.target.value.toUpperCase() })}
                  disabled={!!editingGroup}
                  placeholder="CATEGORIA_EJEMPLO"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Solo letras mayusculas, numeros y guiones bajos
                </p>
                </div>

                <div>
                <label className="text-sm font-medium">Etiqueta *</label>
                <input
                  type="text"
                  value={groupForm.lookup_group_label}
                  onChange={(e) => setGroupForm({ ...groupForm, lookup_group_label: e.target.value })}
                  placeholder="Categoria de Ejemplo"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2"
                />
                </div>

                <div>
                <label className="text-sm font-medium">Etiqueta Corta *</label>
                <input
                  type="text"
                  value={groupForm.lookup_group_short_label}
                  onChange={(e) => setGroupForm({ ...groupForm, lookup_group_short_label: e.target.value })}
                  placeholder="Categoria"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2"
                />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allows_tenant"
                      checked={groupForm.allows_tenant_items}
                      onChange={(e) => setGroupForm({ ...groupForm, allows_tenant_items: e.target.checked })}
                      disabled={isTenantAdmin}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="allows_tenant" className="text-sm">
                      Permitir items de tenant
                    </label>
                  </div>
                  {isTenantAdmin && (
                    <p className="text-xs text-violet-700 mt-1">Se registrara como catalogo del tenant.</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active_group"
                    checked={groupForm.is_active}
                    onChange={(e) => setGroupForm({ ...groupForm, is_active: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="is_active_group" className="text-sm">
                    Activo
                  </label>
                </div>
              </div>

              {/* Traducciones */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <Languages className="size-4" />
                  Traducciones (Ingles)
                </h4>
                {groupTranslations.map((trans, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-md">
                    <div>
                      <label className="text-sm font-medium">Etiqueta (EN)</label>
                      <input
                        type="text"
                        value={trans.label}
                        onChange={(e) => {
                          const updated = [...groupTranslations];
                          updated[idx].label = e.target.value;
                          setGroupTranslations(updated);
                        }}
                        placeholder="Example Category"
                        className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Etiqueta Corta (EN)</label>
                      <input
                        type="text"
                        value={trans.short_label}
                        onChange={(e) => {
                          const updated = [...groupTranslations];
                          updated[idx].short_label = e.target.value;
                          setGroupTranslations(updated);
                        }}
                        placeholder="Category"
                        className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t p-4 flex justify-end gap-2">
              <button
                onClick={closeGroupModal}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              >
                Cancelar
              </button>
              <button
                onClick={saveGroup}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-[#0074D9] text-white hover:bg-[#0074D9]/90 h-10 px-4 py-2"
              >
                {editingGroup ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Valor */}
      {showValueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="border-b p-4 flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                {editingValue ? 'Editar Valor' : 'Nuevo Valor'}
              </h3>
              <button onClick={closeValueModal} className="p-2 hover:bg-accent rounded-md">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                <label className="text-sm font-medium">Clave *</label>
                <input
                  type="text"
                  value={valueForm.lookup_key}
                  onChange={(e) => setValueForm({ ...valueForm, lookup_key: e.target.value.toUpperCase() })}
                  disabled={!!editingValue}
                  placeholder="VALOR_01"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimo 2 caracteres, solo letras mayusculas, numeros y guiones bajos
                </p>
                </div>

                <div>
                <label className="text-sm font-medium">Etiqueta *</label>
                <input
                  type="text"
                  value={valueForm.lookup_label}
                  onChange={(e) => setValueForm({ ...valueForm, lookup_label: e.target.value })}
                  placeholder="Valor de Ejemplo"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2"
                />
                </div>

                <div>
                <label className="text-sm font-medium">Etiqueta Corta *</label>
                <input
                  type="text"
                  value={valueForm.lookup_short_label}
                  onChange={(e) => setValueForm({ ...valueForm, lookup_short_label: e.target.value })}
                  placeholder="Valor"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2"
                />
                </div>

                <div>
                <label className="text-sm font-medium">Alcance *</label>
                <select
                  value={valueForm.lookup_scope}
                  onChange={(e) => setValueForm({ ...valueForm, lookup_scope: e.target.value as 'SYSTEM' | 'TENANT' })}
                  disabled={isTenantAdmin || !!selectedGroup?.management_policy?.value_scope && selectedGroup.management_policy.value_scope !== 'INHERIT'}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2"
                >
                  <option value="SYSTEM">SYSTEM</option>
                  <option value="TENANT">TENANT</option>
                </select>
                {isTenantAdmin && (
                  <p className="text-xs text-muted-foreground mt-1">TENANT_ADMIN registra items con alcance TENANT.</p>
                )}
                </div>

                {Object.entries(selectedGroup?.management_policy?.required_metadata || {}).map(([metadataKey, rule]) => (
                  <div key={metadataKey}>
                    <label className="text-sm font-medium">{rule.label || metadataKey} *</label>
                    <input
                      type={rule.type === 'positive_integer' ? 'number' : 'text'}
                      min={rule.type === 'positive_integer' ? 1 : undefined}
                      step={rule.type === 'positive_integer' ? 1 : undefined}
                      value={String(valueForm.metadata?.[metadataKey] ?? '')}
                      onChange={(e) => setValueForm({
                        ...valueForm,
                        metadata: {
                          ...valueForm.metadata,
                          [metadataKey]: rule.type === 'positive_integer'
                            ? (e.target.value === '' ? '' : Number(e.target.value))
                            : e.target.value
                        }
                      })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2"
                    />
                    {rule.unique_within_group && (
                      <p className="text-xs text-muted-foreground mt-1">Debe ser único dentro del catálogo.</p>
                    )}
                  </div>
                ))}

                <div>
                <label className="text-sm font-medium">Orden</label>
                <input
                  type="number"
                  value={valueForm.sort_order}
                  onChange={(e) => setValueForm({ ...valueForm, sort_order: parseInt(e.target.value) || 0 })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2"
                />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active_value"
                    checked={valueForm.is_active}
                    onChange={(e) => setValueForm({ ...valueForm, is_active: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="is_active_value" className="text-sm">
                    Activo
                  </label>
                </div>
              </div>

              {/* Traducciones */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <Languages className="size-4" />
                  Traducciones (Ingles)
                </h4>
                {valueTranslations.map((trans, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-md">
                    <div>
                      <label className="text-sm font-medium">Etiqueta (EN)</label>
                      <input
                        type="text"
                        value={trans.label}
                        onChange={(e) => {
                          const updated = [...valueTranslations];
                          updated[idx].label = e.target.value;
                          setValueTranslations(updated);
                        }}
                        placeholder="Valor de ejemplo"
                        className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Etiqueta Corta (EN)</label>
                      <input
                        type="text"
                        value={trans.short_label}
                        onChange={(e) => {
                          const updated = [...valueTranslations];
                          updated[idx].short_label = e.target.value;
                          setValueTranslations(updated);
                        }}
                        placeholder="Valor"
                        className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t p-4 flex justify-end gap-2">
              <button
                onClick={closeValueModal}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              >
                Cancelar
              </button>
              <button
                onClick={saveValue}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-[#0074D9] text-white hover:bg-[#0074D9]/90 h-10 px-4 py-2"
              >
                {editingValue ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
