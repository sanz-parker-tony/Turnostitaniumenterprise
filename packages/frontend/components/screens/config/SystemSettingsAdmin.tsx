/**
 * SystemSettingsAdmin.tsx
 * Turnos Titanium Enterprise — Administración del Catálogo de Parámetros
 *
 * Pantalla principal del módulo CONF_PARAMS.
 * Tabs:
 *   1. Catálogo del Sistema   → CRUD de system_settings (solo SYSTEM_ADMIN)
 *   2. Overrides Tenant       → overrides del tenant SYSTEM
 *   3. (Extensible: Empresa / Perfil desde contexto específico)
 *
 * Jerarquía de resolución visible:
 *   PROFILE > COMPANY > TENANT > SYSTEM
 */

'use client';

import { buildApiUrl } from '../../../utils/api-config';
import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Plus, Pencil, Trash2, RotateCcw, Search,
  ChevronDown, ChevronUp, CheckCircle2, XCircle,
  AlertCircle, Info, Database, Building2, Users,
  Shield, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiClient } from '@/lib/api-client';

// ============================================================================
// TIPOS
// ============================================================================

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_name: string;
  setting_short_key: string;
  value_type_id: string | null;
  default_value: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
  value_type?: { id: string; lookup_key: string; lookup_label: string } | null;
}

interface DataType {
  id: string;
  lookup_key: string;
  lookup_label: string;
  lookup_short_label: string;
}

interface TenantOverride {
  id: string;
  tenant_id: string;
  system_setting_id: string;
  setting_value: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
  system_setting?: SystemSetting | null;
}

type SourceLevel = 'PROFILE' | 'COMPANY' | 'TENANT' | 'SYSTEM';

interface EffectiveSetting {
  system_setting_id: string;
  setting_key: string;
  setting_name: string;
  setting_short_key: string;
  value_type_id: string | null;
  value_type_key: string | null;
  default_value: string | null;
  effective_value: string | null;
  local_value: string | null;
  source_level: SourceLevel;
}

// ============================================================================
// HELPERS
// ============================================================================

const BASE_URL = buildApiUrl(`/make-server-e19f2094`);

function getAuthHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

const SOURCE_LEVEL_CONFIG: Record<SourceLevel, { label: string; color: string; bg: string; icon: any }> = {
  SYSTEM:  { label: 'Sistema',  color: 'text-gray-600',  bg: 'bg-gray-100',   icon: Database },
  TENANT:  { label: 'Tenant',   color: 'text-blue-600',  bg: 'bg-blue-100',   icon: Shield },
  COMPANY: { label: 'Empresa',  color: 'text-purple-600', bg: 'bg-purple-100', icon: Building2 },
  PROFILE: { label: 'Perfil',   color: 'text-green-600', bg: 'bg-green-100',  icon: Users },
};

function SourceBadge({ level }: { level: SourceLevel }) {
  const cfg = SOURCE_LEVEL_CONFIG[level];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <Icon className="size-3" />
      {cfg.label}
    </span>
  );
}

// ============================================================================
// MODAL — CREAR / EDITAR PARÁMETRO DEL CATÁLOGO
// ============================================================================

interface SettingModalProps {
  setting?: SystemSetting | null;
  dataTypes: DataType[];
  token: string;
  onSave: () => void;
  onClose: () => void;
}

function SettingModal({ setting, dataTypes, token, onSave, onClose }: SettingModalProps) {
  const isEdit = !!setting;
  const [form, setForm] = useState({
    setting_key:       setting?.setting_key       ?? '',
    setting_name:      setting?.setting_name      ?? '',
    setting_short_key: setting?.setting_short_key ?? '',
    value_type_id:     setting?.value_type_id     ?? '',
    default_value:     setting?.default_value     ?? '',
    is_active:         setting?.is_active         ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const url = isEdit
        ? `${BASE_URL}/system-settings/${setting!.id}`
        : `${BASE_URL}/system-settings`;
      const method = isEdit ? 'PUT' : 'POST';

      const resp = await fetch(url, {
        method,
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          ...form,
          setting_key:       form.setting_key.trim().toUpperCase(),
          setting_short_key: form.setting_short_key.trim().toUpperCase(),
          value_type_id:     form.value_type_id || null,
          default_value:     form.default_value || null,
          created_by:        'ADMIN',
          updated_by:        'ADMIN',
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error al guardar');

      toast.success(isEdit ? '✅ Parámetro actualizado' : '✅ Parámetro creado');
      onSave();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-lg border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#0074D9]/10 flex items-center justify-center">
              <Settings className="size-5 text-[#0074D9]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {isEdit ? 'Editar Parámetro' : 'Nuevo Parámetro'}
              </h2>
              <p className="text-xs text-muted-foreground">Catálogo maestro del sistema</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <XCircle className="size-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 flex gap-2 text-sm text-red-700">
              <AlertCircle className="size-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* setting_key (solo en creación) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Clave del Parámetro <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isEdit}
              value={form.setting_key}
              onChange={e => setForm(f => ({ ...f, setting_key: e.target.value.toUpperCase() }))}
              placeholder="Ej: ATTENDANCE_TIMEZONE"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-mono disabled:opacity-50 disabled:bg-muted"
            />
            {!isEdit && (
              <p className="text-xs text-muted-foreground">Solo mayúsculas, números y guiones bajos. Inmutable una vez creado.</p>
            )}
            {isEdit && (
              <p className="text-xs text-amber-600 flex items-center gap-1"><Info className="size-3" /> La clave no puede modificarse</p>
            )}
          </div>

          {/* setting_name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nombre <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={form.setting_name}
              onChange={e => setForm(f => ({ ...f, setting_name: e.target.value }))}
              placeholder="Ej: Zona Horaria de Asistencia"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            />
          </div>

          {/* setting_short_key */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Clave Corta <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={form.setting_short_key}
              onChange={e => setForm(f => ({ ...f, setting_short_key: e.target.value.toUpperCase() }))}
              placeholder="Ej: TIMEZONE"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* value_type_id */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo de Dato</label>
              <select
                value={form.value_type_id}
                onChange={e => setForm(f => ({ ...f, value_type_id: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">— Sin tipo —</option>
                {dataTypes.map(dt => (
                  <option key={dt.id} value={dt.id}>{dt.lookup_label}</option>
                ))}
              </select>
            </div>

            {/* is_active */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Estado</label>
              <div className="flex h-9 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.is_active ? 'bg-[#2ECC71]' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-muted-foreground">{form.is_active ? 'Activo' : 'Inactivo'}</span>
              </div>
            </div>
          </div>

          {/* default_value */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Valor por Defecto del Sistema</label>
            <input
              type="text"
              value={form.default_value}
              onChange={e => setForm(f => ({ ...f, default_value: e.target.value }))}
              placeholder="Valor base cuando no existe override"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            />
            <p className="text-xs text-muted-foreground">Los overrides de tenant/empresa/perfil tienen precedencia sobre este valor.</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded-md bg-[#0074D9] text-white hover:bg-[#0074D9]/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Parámetro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL — CREAR / EDITAR OVERRIDE DE TENANT
// ============================================================================

interface OverrideModalProps {
  setting: SystemSetting;
  currentValue?: string | null;
  tenantId: string;
  overrideId?: string | null;
  token: string;
  onSave: () => void;
  onClose: () => void;
}

function OverrideModal({ setting, currentValue, tenantId, overrideId, token, onSave, onClose }: OverrideModalProps) {
  const [value, setValue]   = useState(currentValue ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const resp = await fetch(`${BASE_URL}/tenants/${tenantId}/settings-overrides`, {
        method:  'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          system_setting_id: setting.id,
          setting_value: value,
          created_by: 'ADMIN',
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error al guardar override');
      toast.success('✅ Override guardado');
      onSave();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-md border">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-base font-semibold">Override de Tenant</h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{setting.setting_key}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <XCircle className="size-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 flex gap-2 text-sm text-red-700">
              <AlertCircle className="size-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Info del parámetro */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parámetro</span>
              <span className="font-medium">{setting.setting_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo</span>
              <span>{setting.value_type?.lookup_label ?? 'Sin tipo'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor del Sistema</span>
              <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                {setting.default_value ?? '—'}
              </span>
            </div>
          </div>

          {/* Valor override */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Valor Override para este Tenant
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={setting.default_value ?? 'Ingresar valor...'}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Tipo esperado: <strong>{setting.value_type?.lookup_label ?? 'Texto'}</strong>.
              Para heredar el valor del sistema, elimina este override.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-accent transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !value.trim()}
              className="px-4 py-2 text-sm rounded-md bg-[#0074D9] text-white hover:bg-[#0074D9]/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar Override'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB — CATÁLOGO DEL SISTEMA
// ============================================================================

function SystemSettingsCatalog({ token }: { token: string }) {
  const [settings, setSettings]     = useState<SystemSetting[]>([]);
  const [dataTypes, setDataTypes]   = useState<DataType[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [editSetting, setEditSetting]   = useState<SystemSetting | null | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<SystemSetting | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, dtRes] = await Promise.all([
        fetch(`${BASE_URL}/system-settings`, { headers: getAuthHeaders(token) }),
        fetch(`${BASE_URL}/lookup-values/setting-data-types`, { headers: getAuthHeaders(token) }),
      ]);
      const settingsData = await settingsRes.json();
      const dtData       = await dtRes.json();
      setSettings(settingsData.settings ?? []);
      setDataTypes(dtData.dataTypes ?? []);
    } catch (err: any) {
      toast.error(`Error cargando catálogo: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = settings.filter(s => {
    if (!showInactive && !s.is_active) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return s.setting_key.toLowerCase().includes(q) ||
           s.setting_name.toLowerCase().includes(q) ||
           (s.default_value ?? '').toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="size-8 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Cargando catálogo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar parámetro..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
            />
          </div>
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center gap-1.5 px-3 h-9 rounded-md border text-sm transition-colors ${
              showInactive ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-accent'
            }`}
          >
            {showInactive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            {showInactive ? 'Mostrar inactivos' : 'Ocultar inactivos'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAll}
            className="flex items-center gap-1.5 px-3 h-9 rounded-md border text-sm hover:bg-accent transition-colors"
          >
            <RefreshCw className="size-4" /> Refrescar
          </button>
          <button
            onClick={() => setEditSetting(null)}
            className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-[#0074D9] text-white text-sm hover:bg-[#0074D9]/90 transition-colors"
          >
            <Plus className="size-4" /> Nuevo Parámetro
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{settings.length} parámetros total</span>
        <span>·</span>
        <span>{settings.filter(s => s.is_active).length} activos</span>
        {filtered.length !== settings.length && (
          <>
            <span>·</span>
            <span>{filtered.length} mostrados</span>
          </>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Clave</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Valor Sistema</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Estado</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  {search ? 'Sin resultados para la búsqueda' : 'No hay parámetros definidos'}
                </td>
              </tr>
            ) : (
              filtered.map((s, i) => (
                <tr key={s.id} className={`border-b last:border-0 transition-colors hover:bg-muted/30 ${!s.is_active ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{s.setting_key}</code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.setting_name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{s.setting_short_key}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.value_type?.lookup_label ?? <span className="text-gray-400 italic">Sin tipo</span>}
                  </td>
                  <td className="px-4 py-3">
                    {s.default_value
                      ? <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{s.default_value}</code>
                      : <span className="text-gray-400 italic text-xs">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.is_active
                      ? <CheckCircle2 className="size-4 text-[#2ECC71] mx-auto" />
                      : <XCircle className="size-4 text-gray-400 mx-auto" />
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditSetting(s)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Editar"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {editSetting !== undefined && (
        <SettingModal
          setting={editSetting}
          dataTypes={dataTypes}
          token={token}
          onSave={() => { setEditSetting(undefined); fetchAll(); }}
          onClose={() => setEditSetting(undefined)}
        />
      )}
    </div>
  );
}

// ============================================================================
// TAB — OVERRIDES DE TENANT
// ============================================================================

function TenantOverridesPanel({
  token,
  tenantId,
}: {
  token: string;
  tenantId: string;
}) {
  const [effectiveSettings, setEffectiveSettings] = useState<EffectiveSetting[]>([]);
  const [overrideModal, setOverrideModal]         = useState<EffectiveSetting | null>(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterLevel, setFilterLevel] = useState<'ALL' | SourceLevel>('ALL');

  const fetchEffective = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(
        `${BASE_URL}/settings/all-effective?tenant_id=${tenantId}`,
        { headers: getAuthHeaders(token) }
      );
      const data = await resp.json();
      setEffectiveSettings(data.effective_settings ?? []);
    } catch (err: any) {
      toast.error(`Error cargando parámetros: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [token, tenantId]);

  useEffect(() => { fetchEffective(); }, [fetchEffective]);

  const handleRestoreInheritance = async (s: EffectiveSetting) => {
    // Obtener el override ID
    try {
      const resp = await fetch(
        `${BASE_URL}/tenants/${tenantId}/settings-overrides`,
        { headers: getAuthHeaders(token) }
      );
      const data = await resp.json();
      const override = data.overrides?.find((o: TenantOverride) => o.system_setting_id === s.system_setting_id);

      if (!override) {
        toast.error('No se encontró el override para eliminar');
        return;
      }

      const delResp = await fetch(
        `${BASE_URL}/tenants/${tenantId}/settings-overrides/${override.id}`,
        { method: 'DELETE', headers: getAuthHeaders(token) }
      );
      if (!delResp.ok) {
        const err = await delResp.json();
        throw new Error(err.error || 'Error al eliminar override');
      }

      toast.success(`✅ Herencia restaurada para "${s.setting_name}"`);
      fetchEffective();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const filtered = effectiveSettings.filter(s => {
    if (filterLevel !== 'ALL' && s.source_level !== filterLevel) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return s.setting_key.toLowerCase().includes(q) ||
           s.setting_name.toLowerCase().includes(q);
  });

  const overrideCount = effectiveSettings.filter(s => s.source_level === 'TENANT').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="size-8 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Calculando valores efectivos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 p-4 flex gap-3">
        <Info className="size-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-900 dark:text-blue-100">Overrides del Tenant</p>
          <p className="text-blue-700 dark:text-blue-300 mt-0.5">
            Los valores con origen <strong>Tenant</strong> anulan el valor del Sistema.
            Usa "Restablecer herencia" para volver al valor base del sistema.
            Jerarquía: <strong>Perfil &gt; Empresa &gt; Tenant &gt; Sistema</strong>
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {(['ALL', 'TENANT', 'SYSTEM'] as const).map(lvl => {
          const count = lvl === 'ALL'
            ? effectiveSettings.length
            : effectiveSettings.filter(s => s.source_level === lvl).length;
          const cfg = lvl !== 'ALL' ? SOURCE_LEVEL_CONFIG[lvl as SourceLevel] : null;
          return (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                filterLevel === lvl
                  ? 'border-[#0074D9] bg-[#0074D9]/10 text-[#0074D9]'
                  : 'hover:bg-accent'
              }`}
            >
              {cfg && <cfg.icon className={`size-4 ${cfg.color}`} />}
              <span>{lvl === 'ALL' ? 'Todos' : SOURCE_LEVEL_CONFIG[lvl as SourceLevel]?.label}</span>
              <span className="font-bold">{count}</span>
            </button>
          );
        })}
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar parámetro..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-sm"
          />
        </div>
        <button
          onClick={fetchEffective}
          className="flex items-center gap-1.5 px-3 h-9 rounded-md border text-sm hover:bg-accent transition-colors"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Parámetro</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Valor Sistema</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Valor Efectivo</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Origen</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  Sin parámetros para mostrar
                </td>
              </tr>
            ) : (
              filtered.map(s => (
                <tr key={s.system_setting_id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.setting_name}</div>
                    <code className="text-xs text-muted-foreground font-mono">{s.setting_key}</code>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                      {s.default_value ?? '—'}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <code className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      s.source_level !== 'SYSTEM'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {s.effective_value ?? '—'}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <SourceBadge level={s.source_level} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Editar / Crear override */}
                      <button
                        onClick={() => setOverrideModal(s)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title={s.source_level === 'TENANT' ? 'Editar override' : 'Crear override de tenant'}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      {/* Restablecer herencia (solo si tiene override de tenant) */}
                      {s.source_level === 'TENANT' && (
                        <button
                          onClick={() => handleRestoreInheritance(s)}
                          className="p-1.5 rounded-md hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                          title="Restablecer herencia (eliminar override)"
                        >
                          <RotateCcw className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Override Modal */}
      {overrideModal && (
        <OverrideModal
          setting={{
            id: overrideModal.system_setting_id,
            setting_key: overrideModal.setting_key,
            setting_name: overrideModal.setting_name,
            setting_short_key: overrideModal.setting_short_key,
            value_type_id: overrideModal.value_type_id,
            default_value: overrideModal.default_value,
            is_active: true,
            created_by: 'ADMIN',
            created_at: '',
            updated_by: null,
            updated_at: null,
            value_type: overrideModal.value_type_key
              ? { id: '', lookup_key: overrideModal.value_type_key, lookup_label: overrideModal.value_type_key }
              : null,
          }}
          currentValue={overrideModal.local_value}
          tenantId={tenantId}
          token={token}
          onSave={() => { setOverrideModal(null); fetchEffective(); }}
          onClose={() => setOverrideModal(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

interface SystemSettingsAdminProps {
  token?: string;
}

export function SystemSettingsAdmin({ token: propToken }: SystemSettingsAdminProps) {
  const [token, setToken]       = useState<string | null>(propToken ?? null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'tenant'>('catalog');
  const [loading, setLoading]   = useState(!propToken);

  // Obtener token de sesión si no se pasó como prop
  useEffect(() => {
    if (propToken) {
      setToken(propToken);
      return;
    }
    ApiClient.auth.getSession().then(({ data }) => {
      const accessToken = data?.session?.access_token;
      if (accessToken) setToken(accessToken);
      setLoading(false);
    });
  }, [propToken]);

  // Obtener tenant SYSTEM
  useEffect(() => {
    if (!token) return;
    fetch(`${BASE_URL}/tenant/settings`, {
      headers: getAuthHeaders(token),
    })
      .then(r => r.json())
      .then(data => { if (data.id) setTenantId(data.id); })
      .catch(() => {});
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="size-8 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="size-8 mx-auto mb-2 text-amber-500" />
          <p>Se requiere autenticación para acceder a este módulo.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'catalog' as const,  label: 'Catálogo del Sistema', icon: Database },
    { key: 'tenant'  as const,  label: 'Overrides Tenant',     icon: Shield   },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Settings className="size-8 text-[#0074D9]" />
          Parámetros de Configuración
        </h1>
        <p className="text-muted-foreground mt-1">
          Catálogo maestro de parámetros del sistema y gestión de overrides por nivel de jerarquía.
        </p>
      </div>

      {/* Jerarquía visual */}
      <div className="rounded-lg border bg-gradient-to-r from-green-50 via-blue-50 to-gray-50 dark:from-green-950/20 dark:via-blue-950/20 dark:to-gray-950/20 p-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Jerarquía de resolución (mayor prioridad → menor prioridad)</p>
        <div className="flex items-center gap-2 flex-wrap">
          {(['PROFILE', 'COMPANY', 'TENANT', 'SYSTEM'] as SourceLevel[]).map((lvl, i, arr) => {
            const cfg = SOURCE_LEVEL_CONFIG[lvl];
            const Icon = cfg.icon;
            return (
              <div key={lvl} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${cfg.bg} ${cfg.color} text-sm font-medium`}>
                  <Icon className="size-4" />
                  {cfg.label}
                </div>
                {i < arr.length - 1 && (
                  <ChevronDown className="size-4 text-muted-foreground rotate-[-90deg]" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#0074D9] text-[#0074D9]'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'catalog' && (
          <SystemSettingsCatalog token={token} />
        )}
        {activeTab === 'tenant' && tenantId && (
          <TenantOverridesPanel token={token} tenantId={tenantId} />
        )}
        {activeTab === 'tenant' && !tenantId && (
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="size-8 mx-auto mb-2 text-amber-500" />
            <p>No se pudo obtener el ID del tenant. Verifique la configuración.</p>
          </div>
        )}
      </div>
    </div>
  );
}

