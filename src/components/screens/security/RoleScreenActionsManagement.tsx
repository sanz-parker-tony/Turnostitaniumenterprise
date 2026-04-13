'use client';
/**
 * RoleScreenActionsManagement - Permisos de Acciones por Rol
 * Turnos Titanium Enterprise — Seguridad → Permisos por Rol
 *
 * Vista matricial: selecciona tenant + rol y muestra todas las screen_actions
 * con toggle de is_allowed + botón de guardar bulk.
 */

import { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, RefreshCw, Save, AlertCircle, Filter, Search, Check, X, ChevronDown } from 'lucide-react';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/role-screen-actions-management`;
function getToken() { return localStorage.getItem('sb-access-token') || publicAnonKey; }

interface Permission {
  id: string; tenant_id: string; role_id: string; screen_action_id: string;
  is_allowed: boolean; is_active: boolean; valid_from: string | null; valid_to: string | null;
  tenant_key?: string | null; tenant_name?: string | null;
  role_key?: string | null; role_name?: string | null;
  screen_key?: string | null; screen_name?: string | null;
  action_key?: string | null; action_name?: string | null;
  ui_element_key?: string | null;
}
interface ScreenActionCatalog {
  id: string; screen_key: string; screen_name: string; action_key: string; action_name: string; ui_element_key: string | null; label: string;
}
interface Tenant { id: string; tenant_key: string; tenant_name: string; }
interface Role { id: string; role_key: string; role_name: string; role_scope: string; tenant_id: string; }

export function RoleScreenActionsManagement() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [screenActions, setScreenActions] = useState<ScreenActionCatalog[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [search, setSearch] = useState('');

  // Estado local de permisos editables: screen_action_id → is_allowed
  const [localPerms, setLocalPerms] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);

  const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` });

  // Carga catálogos al montar
  useEffect(() => {
    const loadCatalogs = async () => {
      setCatalogLoading(true);
      try {
        const [tRes, rRes, saRes] = await Promise.all([
          fetch(`${API}/catalogs/tenants`, { headers: headers() }),
          fetch(`${API}/catalogs/roles`, { headers: headers() }),
          fetch(`${API}/catalogs/screen-actions`, { headers: headers() }),
        ]);
        const [tData, rData, saData] = await Promise.all([tRes.json(), rRes.json(), saRes.json()]);
        setTenants(tData.tenants || []);
        setRoles(rData.roles || []);
        setScreenActions(saData.screenActions || []);
      } catch (e: any) { setError(e.message); }
      finally { setCatalogLoading(false); }
    };
    loadCatalogs();
  }, []);

  // Roles filtrados por tenant seleccionado
  const filteredRoles = useMemo(() =>
    selectedTenant ? roles.filter(r => r.tenant_id === selectedTenant) : roles,
    [roles, selectedTenant]);

  // Carga permisos cuando cambia tenant+rol
  useEffect(() => {
    if (!selectedTenant || !selectedRole) { setPermissions([]); setLocalPerms({}); return; }
    const loadPerms = async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`${API}?tenant_id=${selectedTenant}&role_id=${selectedRole}`, { headers: headers() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error cargando permisos');
        setPermissions(data.permissions || []);

        // Construir mapa de permisos actuales
        const map: Record<string, boolean> = {};
        (data.permissions || []).forEach((p: Permission) => { map[p.screen_action_id] = p.is_allowed; });
        // Completar con false para las screen_actions sin permiso aún
        setLocalPerms(map);
        setDirty(false);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    };
    loadPerms();
  }, [selectedTenant, selectedRole]);

  const toggle = (saId: string) => {
    setLocalPerms(prev => ({ ...prev, [saId]: !prev[saId] }));
    setDirty(true);
  };

  const toggleAll = (value: boolean) => {
    const updated: Record<string, boolean> = {};
    screenActions.forEach(sa => { updated[sa.id] = value; });
    setLocalPerms(updated);
    setDirty(true);
  };

  const savePerms = async () => {
    if (!selectedTenant || !selectedRole) return;
    setSaving(true); setSaveMsg(null); setError(null);
    try {
      const permsPayload = screenActions.map(sa => ({
        screen_action_id: sa.id,
        is_allowed: localPerms[sa.id] ?? false,
      }));

      const res = await fetch(`${API}/bulk-upsert`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ tenant_id: selectedTenant, role_id: selectedRole, permissions: permsPayload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando permisos');
      setSaveMsg(`✅ Guardado: ${data.updated} actualizados, ${data.created} nuevos`);
      setDirty(false);
      setTimeout(() => setSaveMsg(null), 4000);

      // Recargar permisos
      const rRes = await fetch(`${API}?tenant_id=${selectedTenant}&role_id=${selectedRole}`, { headers: headers() });
      const rData = await rRes.json();
      setPermissions(rData.permissions || []);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const selectedTenantObj = tenants.find(t => t.id === selectedTenant);
  const selectedRoleObj = roles.find(r => r.id === selectedRole);

  // Filtrado de screen_actions por búsqueda
  const filteredSA = useMemo(() => {
    if (!search) return screenActions;
    const s = search.toLowerCase();
    return screenActions.filter(sa =>
      sa.screen_name.toLowerCase().includes(s) ||
      sa.action_name.toLowerCase().includes(s) ||
      sa.screen_key.toLowerCase().includes(s) ||
      sa.action_key.toLowerCase().includes(s)
    );
  }, [screenActions, search]);

  // Agrupar por pantalla
  const grouped = useMemo(() => {
    const map: Record<string, { screen_name: string; screen_key: string; items: ScreenActionCatalog[] }> = {};
    filteredSA.forEach(sa => {
      if (!map[sa.screen_key]) map[sa.screen_key] = { screen_name: sa.screen_name, screen_key: sa.screen_key, items: [] };
      map[sa.screen_key].items.push(sa);
    });
    return Object.values(map).sort((a, b) => a.screen_name.localeCompare(b.screen_name));
  }, [filteredSA]);

  const allowedCount = Object.values(localPerms).filter(Boolean).length;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0074D9] flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-white" /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Permisos por Rol</h1>
            <p className="text-sm text-gray-500">Asigna qué acciones puede ejecutar cada rol en cada pantalla</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button onClick={savePerms} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#2ECC71] text-white rounded-lg hover:bg-green-600 text-sm font-medium disabled:opacity-60">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          )}
        </div>
      </div>

      {/* Filtros de contexto */}
      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">Tenant</label>
            <select value={selectedTenant} onChange={e => { setSelectedTenant(e.target.value); setSelectedRole(''); }}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={catalogLoading}>
              <option value="">— Seleccionar tenant —</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.tenant_name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">Rol</label>
            <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedTenant || catalogLoading}>
              <option value="">— Seleccionar rol —</option>
              {filteredRoles.map(r => <option key={r.id} value={r.id}>{r.role_name} ({r.role_key})</option>)}
            </select>
          </div>
          {selectedTenant && selectedRole && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-500">{allowedCount} de {screenActions.length} acciones permitidas</span>
              <button onClick={() => toggleAll(true)} className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-gray-600">Permitir todo</button>
              <button onClick={() => toggleAll(false)} className="text-xs px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-gray-600">Denegar todo</button>
            </div>
          )}
        </div>
      </div>

      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
      {saveMsg && <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{saveMsg}</div>}

      {!selectedTenant || !selectedRole ? (
        <div className="flex-1 flex items-center justify-center bg-white rounded-xl border">
          <div className="text-center py-16">
            <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Selecciona un tenant y un rol</p>
            <p className="text-gray-400 text-sm mt-1">para ver y editar sus permisos de acciones</p>
          </div>
        </div>
      ) : loading || catalogLoading ? (
        <div className="flex-1 flex items-center justify-center bg-white rounded-xl border">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-3 flex-1">
          {/* Search dentro de la matriz */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrar acciones por pantalla o nombre..."
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>

          {/* Contexto seleccionado */}
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">{selectedTenantObj?.tenant_name}</span>
            <span className="text-gray-400">→</span>
            <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full font-medium">{selectedRoleObj?.role_name}</span>
            {dirty && <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs">Cambios sin guardar</span>}
          </div>

          {/* Matriz agrupada por pantalla */}
          <div className="flex-1 overflow-auto space-y-3">
            {grouped.length === 0 ? (
              <div className="flex items-center justify-center py-12 bg-white rounded-xl border">
                <p className="text-gray-400">{search ? 'No hay resultados para esta búsqueda' : 'No hay acciones de pantalla configuradas'}</p>
              </div>
            ) : grouped.map(group => (
              <div key={group.screen_key} className="bg-white rounded-xl border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                  <div>
                    <span className="font-medium text-gray-900">{group.screen_name}</span>
                    <span className="ml-2 font-mono text-xs text-gray-400">{group.screen_key}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {group.items.filter(sa => localPerms[sa.id]).length}/{group.items.length} permitidas
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {group.items.map(sa => {
                    const allowed = localPerms[sa.id] ?? false;
                    return (
                      <div key={sa.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{sa.action_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-xs text-gray-400">{sa.action_key}</span>
                              {sa.ui_element_key && <span className="text-xs text-gray-400">· {sa.ui_element_key}</span>}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => toggle(sa.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            allowed
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}>
                          {allowed ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          {allowed ? 'Permitido' : 'Denegado'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer fijo con botón guardar si hay cambios */}
          {dirty && (
            <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-sm text-amber-700 font-medium">Tienes cambios sin guardar</span>
              <button onClick={savePerms} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#2ECC71] text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-60">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RoleScreenActionsManagement;
