/**
 * CatalogManagement.tsx
 * Turnos Titanium Enterprise
 * 
 * Pantalla de gestión de Catálogos (lookup_groups y lookup_values)
 * Sistema maestro-detalle con CRUD completo y traducciones
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Languages,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

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
  lookup_key: string;
  lookup_label: string;
  lookup_short_label: string;
  lookup_scope: 'SYSTEM' | 'TENANT';
  sort_order: number;
  is_active: boolean;
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
    is_active: true,
  });

  const [groupTranslations, setGroupTranslations] = useState<LookupGroupTranslation[]>([
    { language_code: 'en', label: '', short_label: '' }
  ]);

  const [valueTranslations, setValueTranslations] = useState<LookupValueTranslation[]>([
    { language_code: 'en', label: '', short_label: '' }
  ]);

  // ============================================================================
  // API CALLS
  // ============================================================================

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('access_token');
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/lookup-groups`,
        {
          headers: {
            'Authorization': `Bearer ${token || publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!res.ok) {
        throw new Error('Error al cargar grupos de catálogo');
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
      const token = localStorage.getItem('access_token');
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/lookup-values-crud?group_id=${groupId}`,
        {
          headers: {
            'Authorization': `Bearer ${token || publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!res.ok) {
        throw new Error('Error al cargar valores del catálogo');
      }

      const data = await res.json();
      setValues(data.values || []);
    } catch (err: any) {
      console.error('[CATALOG] Error cargando valores:', err);
      alert('Error al cargar valores del catálogo');
    }
  };

  const saveGroup = async () => {
    try {
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

      const token = localStorage.getItem('access_token');
      const url = editingGroup
        ? `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/lookup-groups/${editingGroup.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/lookup-groups`;

      const method = editingGroup ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token || publicAnonKey}`,
          'Content-Type': 'application/json'
        },
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

      const token = localStorage.getItem('access_token');
      const url = editingValue
        ? `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/lookup-values-crud/${editingValue.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/lookup-values-crud`;

      const method = editingValue ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token || publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...valueForm,
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
      const token = localStorage.getItem('access_token');
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/lookup-values-crud/${value.id}/toggle`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token || publicAnonKey}`,
            'Content-Type': 'application/json'
          }
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

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const openGroupModal = (group?: LookupGroup) => {
    if (group) {
      setEditingGroup(group);
      setGroupForm({
        lookup_group_key: group.lookup_group_key,
        lookup_group_label: group.lookup_group_label,
        lookup_group_short_label: group.lookup_group_short_label,
        allows_tenant_items: group.allows_tenant_items,
        is_active: group.is_active,
      });
      setGroupTranslations(
        group.lookup_group_translations && group.lookup_group_translations.length > 0
          ? group.lookup_group_translations
          : [{ language_code: 'en', label: '', short_label: '' }]
      );
    } else {
      setEditingGroup(null);
      setGroupForm({
        lookup_group_key: '',
        lookup_group_label: '',
        lookup_group_short_label: '',
        allows_tenant_items: false,
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

  const openValueModal = (value?: LookupValue) => {
    if (!selectedGroup) {
      alert('Debe seleccionar un grupo primero');
      return;
    }

    if (value) {
      setEditingValue(value);
      setValueForm({
        lookup_key: value.lookup_key,
        lookup_label: value.lookup_label,
        lookup_short_label: value.lookup_short_label,
        lookup_scope: value.lookup_scope,
        sort_order: value.sort_order,
        is_active: value.is_active,
      });
      setValueTranslations(
        value.lookup_value_translations && value.lookup_value_translations.length > 0
          ? value.lookup_value_translations
          : [{ language_code: 'en', label: '', short_label: '' }]
      );
    } else {
      setEditingValue(null);
      const maxOrder = values.length > 0 ? Math.max(...values.map(v => v.sort_order)) : 0;
      setValueForm({
        lookup_key: '',
        lookup_label: '',
        lookup_short_label: '',
        lookup_scope: 'SYSTEM',
        sort_order: maxOrder + 10,
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
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando catálogos...</p>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Catálogos</h1>
          <p className="text-muted-foreground mt-1">
            Administra los grupos de catálogo y sus valores
          </p>
        </div>
        <button
          onClick={() => openGroupModal()}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#0074D9] text-white hover:bg-[#0074D9]/90 h-10 px-4 py-2 gap-2"
        >
          <Plus className="size-4" />
          Nuevo Grupo
        </button>
      </div>

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
      </div>

      {/* Groups List (continuará...) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel izquierdo: Grupos */}
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h2 className="font-semibold">Grupos de Catálogo</h2>
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
                        {group.allows_tenant_items && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 mt-2">
                            Permite ítems de tenant
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openGroupModal(group);
                      }}
                      className="p-2 hover:bg-accent rounded-md transition-colors"
                    >
                      <Edit className="size-4 text-muted-foreground" />
                    </button>
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
              <button
                onClick={() => openValueModal()}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-2"
              >
                <Plus className="size-4" />
                Nuevo Valor
              </button>
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
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleValueStatus(value)}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          value.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {value.is_active ? 'Activo' : 'Inactivo'}
                      </button>
                      <button
                        onClick={() => openValueModal(value)}
                        className="p-2 hover:bg-accent rounded-md transition-colors"
                      >
                        <Edit className="size-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Grupo (continuará en siguiente mensaje por límite de tokens) */}
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
            <div className="p-6 space-y-4">
              <div>
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
                  Solo letras mayúsculas, números y guiones bajos
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Etiqueta *</label>
                <input
                  type="text"
                  value={groupForm.lookup_group_label}
                  onChange={(e) => setGroupForm({ ...groupForm, lookup_group_label: e.target.value })}
                  placeholder="Categoría de Ejemplo"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Etiqueta Corta *</label>
                <input
                  type="text"
                  value={groupForm.lookup_group_short_label}
                  onChange={(e) => setGroupForm({ ...groupForm, lookup_group_short_label: e.target.value })}
                  placeholder="Categoría"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allows_tenant"
                  checked={groupForm.allows_tenant_items}
                  onChange={(e) => setGroupForm({ ...groupForm, allows_tenant_items: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="allows_tenant" className="text-sm">
                  Permitir ítems de tenant
                </label>
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

              {/* Traducciones */}
              <div className="border-t pt-4">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <Languages className="size-4" />
                  Traducciones (Inglés)
                </h4>
                {groupTranslations.map((trans, idx) => (
                  <div key={idx} className="space-y-3 bg-gray-50 p-4 rounded-md">
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
            <div className="p-6 space-y-4">
              <div>
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
                  Mínimo 2 caracteres, solo letras mayúsculas, números y guiones bajos
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-2"
                >
                  <option value="SYSTEM">SYSTEM</option>
                  <option value="TENANT">TENANT</option>
                </select>
              </div>

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

              {/* Traducciones */}
              <div className="border-t pt-4">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <Languages className="size-4" />
                  Traducciones (Inglés)
                </h4>
                {valueTranslations.map((trans, idx) => (
                  <div key={idx} className="space-y-3 bg-gray-50 p-4 rounded-md">
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
                        placeholder="Example Value"
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
                        placeholder="Value"
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