/**
 * Employees > Profile Settings
 * Configuración de overrides por perfil de empleado
 */

'use client';

import { buildApiUrl, API_BASE_URL } from '../../../../utils/api-config';
import { useState, useEffect, useCallback } from 'react';
import ScreenPageShell from '@/components/ScreenPageShell';
import { Users, Search, Pencil, RotateCcw, RefreshCw, AlertCircle, Info, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicApiToken } from '@/utils/backend/info';
import { ApiClient } from '@/lib/api-client';

const BASE_URL = buildApiUrl(`/make-server-e19f2094`);

interface EmployeeProfile {
  id: string;
  profile_name: string;
  profile_short_name: string;
  employee_profile_code: string;
  is_active: boolean;
}

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
  source_level: 'PROFILE' | 'COMPANY' | 'TENANT' | 'SYSTEM';
}

const LEVEL_COLORS = {
  SYSTEM:  'text-gray-600 bg-gray-100',
  TENANT:  'text-blue-600 bg-blue-100',
  COMPANY: 'text-purple-600 bg-purple-100',
  PROFILE: 'text-green-600 bg-green-100',
};

const LEVEL_LABELS = {
  SYSTEM: 'Sistema', TENANT: 'Tenant', COMPANY: 'Empresa', PROFILE: 'Perfil',
};

function OverrideEditModal({
  setting, profileId, tenantId, token, onSave, onClose,
}: {
  setting: EffectiveSetting;
  profileId: string;
  tenantId: string;
  token: string;
  onSave: () => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(setting.local_value ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const resp = await fetch(`${BASE_URL}/employee-profiles/${profileId}/settings-overrides`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_setting_id: setting.system_setting_id,
          setting_value: value,
          tenant_id: tenantId,
          created_by: 'ADMIN',
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error al guardar');
      toast.success('✅ Override de perfil guardado');
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
            <h2 className="text-base font-semibold">Override de Perfil</h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{setting.setting_key}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 flex gap-2 text-sm text-red-700">
              <AlertCircle className="size-4 flex-shrink-0 mt-0.5" />{error}
            </div>
          )}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parámetro</span>
              <span className="font-medium">{setting.setting_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor efectivo actual</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_COLORS[setting.source_level]}`}>
                {setting.effective_value ?? '—'} · {LEVEL_LABELS[setting.source_level]}
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Valor Override del Perfil <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={setting.effective_value ?? 'Ingresar valor...'}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Este valor tendrá la máxima prioridad (PERFIL &gt; EMPRESA &gt; TENANT &gt; SISTEMA)</p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border hover:bg-accent transition-colors">Cancelar</button>
            <button
              onClick={handleSave}
              disabled={saving || !value.trim()}
              className="px-4 py-2 text-sm rounded-md bg-[#2ECC71] text-white hover:bg-[#2ECC71]/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar Override'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSettingsContent() {
  const [token, setToken] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<EmployeeProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<EmployeeProfile | null>(null);
  const [effectiveSettings, setEffectiveSettings] = useState<EffectiveSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [search, setSearch] = useState('');
  const [editSetting, setEditSetting] = useState<EffectiveSetting | null>(null);

  // Auth
  useEffect(() => {
    const ApiClient = createClient(API_BASE_URL, publicApiToken);
    ApiClient.auth.getSession().then(({ data }) => {
      const t = data?.session?.access_token;
      if (t) setToken(t);
      setLoading(false);
    });
  }, []);

  // Obtener tenant y perfiles
  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    Promise.all([
      fetch(`${BASE_URL}/tenant/settings`, { headers }).then(r => r.json()),
      fetch(`${BASE_URL}/system-settings`, { headers }).then(r => r.json()), // solo para forzar init
    ]).then(([tenantData]) => {
      if (tenantData.id) setTenantId(tenantData.id);
    }).catch(() => {});

    // Obtener perfiles de empleado via ApiClient directo
    const ApiClient = createClient(API_BASE_URL, publicApiToken);
    ApiClient.from('employee_profiles').select('*').eq('is_active', true).order('profile_name')
      .then(({ data }) => { if (data) setProfiles(data); });
  }, [token]);

  // Obtener effective settings para el perfil seleccionado
  const loadProfileSettings = useCallback(async (profile: EmployeeProfile) => {
    if (!token || !tenantId) return;
    setLoadingSettings(true);
    try {
      const resp = await fetch(
        `${BASE_URL}/settings/all-effective?tenant_id=${tenantId}&profile_id=${profile.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await resp.json();
      setEffectiveSettings(data.effective_settings ?? []);
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoadingSettings(false);
    }
  }, [token, tenantId]);

  useEffect(() => {
    if (selectedProfile) loadProfileSettings(selectedProfile);
  }, [selectedProfile, loadProfileSettings]);

  const handleRestoreInheritance = async (s: EffectiveSetting) => {
    if (!token || !selectedProfile || !tenantId) return;
    try {
      // Obtener el override ID
      const resp = await fetch(
        `${BASE_URL}/employee-profiles/${selectedProfile.id}/settings-overrides?tenant_id=${tenantId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await resp.json();
      const override = data.overrides?.find((o: any) => o.system_setting_id === s.system_setting_id);
      if (!override) { toast.error('Override no encontrado'); return; }

      const delResp = await fetch(
        `${BASE_URL}/employee-profiles/${selectedProfile.id}/settings-overrides/${override.id}?tenant_id=${tenantId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );
      if (!delResp.ok) throw new Error('Error al eliminar override');
      toast.success(`✅ Herencia restaurada para "${s.setting_name}"`);
      loadProfileSettings(selectedProfile);
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const filtered = effectiveSettings.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.setting_key.toLowerCase().includes(q) || s.setting_name.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="size-8 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const profileOverrideCount = effectiveSettings.filter(s => s.source_level === 'PROFILE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Users className="size-8 text-[#0074D9]" />
          Configuración de Perfiles
        </h1>
        <p className="text-muted-foreground mt-1">
          Gestión de overrides de parámetros por perfil de empleado. Prioridad máxima en la jerarquía.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panel izquierdo: lista de perfiles */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground px-1">Perfiles de Empleado</p>
          {profiles.length === 0 ? (
            <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
              No hay perfiles configurados
            </div>
          ) : (
            profiles.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProfile(p)}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                  selectedProfile?.id === p.id
                    ? 'border-[#0074D9] bg-[#0074D9]/10 text-[#0074D9]'
                    : 'hover:bg-accent hover:border-transparent'
                }`}
              >
                <div className="font-medium">{p.profile_name}</div>
                <div className="text-xs text-muted-foreground font-mono">{p.employee_profile_code}</div>
              </button>
            ))
          )}
        </div>

        {/* Panel derecho: overrides del perfil seleccionado */}
        <div className="lg:col-span-3">
          {!selectedProfile ? (
            <div className="flex items-center justify-center h-64 rounded-lg border border-dashed">
              <div className="text-center text-muted-foreground">
                <Users className="size-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Selecciona un perfil para ver sus parámetros</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Profile header */}
              <div className="rounded-lg border bg-card p-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{selectedProfile.profile_name}</h2>
                  <p className="text-xs text-muted-foreground font-mono">{selectedProfile.employee_profile_code}</p>
                </div>
                {profileOverrideCount > 0 && (
                  <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                    {profileOverrideCount} override(s) de perfil
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-3 flex gap-2">
                <Info className="size-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-700 dark:text-green-300">
                  Los overrides de Perfil tienen la <strong>máxima prioridad</strong>.
                  Anularán los valores de Empresa, Tenant y Sistema para este perfil.
                </p>
              </div>

              {/* Search + Refresh */}
              <div className="flex gap-3">
                <div className="relative flex-1">
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
                  onClick={() => loadProfileSettings(selectedProfile)}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-md border text-sm hover:bg-accent transition-colors"
                >
                  <RefreshCw className="size-4" />
                </button>
              </div>

              {/* Table */}
              {loadingSettings ? (
                <div className="flex items-center justify-center h-40">
                  <div className="size-6 border-3 border-[#0074D9] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Parámetro</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Valor Efectivo</th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">Origen</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
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
                              <code className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                s.source_level === 'PROFILE'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-gray-100 dark:bg-gray-800'
                              }`}>
                                {s.effective_value ?? '—'}
                              </code>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLORS[s.source_level]}`}>
                                {LEVEL_LABELS[s.source_level]}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setEditSetting(s)}
                                  className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                  title="Configurar override de perfil"
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                                {s.source_level === 'PROFILE' && (
                                  <button
                                    onClick={() => handleRestoreInheritance(s)}
                                    className="p-1.5 rounded-md hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                                    title="Restablecer herencia"
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
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editSetting && selectedProfile && token && tenantId && (
        <OverrideEditModal
          setting={editSetting}
          profileId={selectedProfile.id}
          tenantId={tenantId}
          token={token}
          onSave={() => { setEditSetting(null); loadProfileSettings(selectedProfile); }}
          onClose={() => setEditSetting(null)}
        />
      )}
    </div>
  );
}

export default function EmployeesProfileSettingsPage() {
  return (
    <ScreenPageShell
      screenKey="EMPL_PROFILE_SETTINGS"
      title="Configuración de Perfiles"
      description="Overrides de parámetros por perfil de empleado"
    >
      <ProfileSettingsContent />
    </ScreenPageShell>
  );
}


