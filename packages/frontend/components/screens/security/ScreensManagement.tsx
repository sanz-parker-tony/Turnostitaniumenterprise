'use client';
/**
 * ScreensManagement - Gestión de Pantallas
 * Turnos Titanium Enterprise — Seguridad → Pantallas
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Monitor, Plus, Edit2, Power, PowerOff, Search, X,
  RefreshCw, ChevronUp, ChevronDown, Save, AlertCircle, Languages, Link2,
} from 'lucide-react';
import { projectId, publicApiToken } from '../../../utils/backend/info';

const API = `http://localhost:3001/make-server-e19f2094/screens-management`;
const SA_API = `http://localhost:3001/make-server-e19f2094/screen-actions-management`;

function getToken() { return localStorage.getItem('tt-access-token') || publicApiToken; }

interface Screen {
  id: string; screen_key: string; screen_name: string;
  menu_label: string | null; menu_group_id: string; module_id: string | null;
  route_path: string | null; icon_key: string | null; sort_order: number;
  is_active: boolean; created_by: string; created_at: string; updated_at: string | null;
  menu_group_key?: string | null; menu_group_name?: string | null; translations: any[];
}
interface MenuGroup { id: string; menu_group_key: string; menu_group_name: string; }
interface Language { code: string; language_name: string; }
interface ScreenAction {
  id: string; screen_id: string; action_id: string;
  ui_element_key: string | null; is_active: boolean;
  action_key?: string | null; action_name?: string | null;
}
interface ActionCatalog { id: string; action_key: string; action_name: string; }

const EMPTY_FORM = {
  screen_key: '', screen_name: '', menu_label: '',
  menu_group_id: '', route_path: '', icon_key: '',
  sort_order: 0, is_active: true,
};

const BADGE = {
  active: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800',
  inactive: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500',
};

export function ScreensManagement() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [sortField, setSortField] = useState<'sort_order' | 'screen_key' | 'screen_name'>('sort_order');
  const [sortAsc, setSortAsc] = useState(true);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Screen | null>(null);
  const [activeTab, setActiveTab] = useState<'main' | 'translations' | 'actions'>('main');
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [translations, setTranslations] = useState<Record<string, { name: string; label: string }>>({});
  // Screen actions tab
  const [screenActions, setScreenActions] = useState<ScreenAction[]>([]);
  const [actionsCatalog, setActionsCatalog] = useState<ActionCatalog[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [newActionId, setNewActionId] = useState('');
  const [newUiKey, setNewUiKey] = useState('');
  const [addingAction, setAddingAction] = useState(false);
  const [saving, setSaving] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` });

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [sRes, mgRes, lRes] = await Promise.all([
        fetch(API, { headers: headers() }),
        fetch(`${API}/catalogs/menu-groups`, { headers: headers() }),
        fetch(`${API}/catalogs/languages`, { headers: headers() }),
      ]);
      const [sData, mgData, lData] = await Promise.all([sRes.json(), mgRes.json(), lRes.json()]);
      if (!sRes.ok) throw new Error(sData.error || 'Error cargando pantallas');
      setScreens(sData.screens || []);
      setMenuGroups(mgData.menuGroups || []);
      setLanguages(lData.languages || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = [...screens];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(sc =>
        sc.screen_key.toLowerCase().includes(s) ||
        sc.screen_name.toLowerCase().includes(s) ||
        (sc.route_path || '').toLowerCase().includes(s)
      );
    }
    if (statusFilter === 'active') list = list.filter(sc => sc.is_active);
    if (statusFilter === 'inactive') list = list.filter(sc => !sc.is_active);
    if (groupFilter !== 'all') list = list.filter(sc => sc.menu_group_id === groupFilter);
    list.sort((a, b) => {
      const va = String(a[sortField] ?? ''), vb = String(b[sortField] ?? '');
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return list;
  }, [screens, search, statusFilter, groupFilter, sortField, sortAsc]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setTranslations({});
    setScreenActions([]);
    setNewActionId(''); setNewUiKey('');
    setActiveTab('main');
    setPanelError(null);
    setPanelOpen(true);
  };

  const openEdit = (sc: Screen) => {
    setEditing(sc);
    setForm({
      screen_key: sc.screen_key, screen_name: sc.screen_name,
      menu_label: sc.menu_label || '', menu_group_id: sc.menu_group_id,
      route_path: sc.route_path || '', icon_key: sc.icon_key || '',
      sort_order: sc.sort_order, is_active: sc.is_active,
    });
    const tMap: Record<string, { name: string; label: string }> = {};
    (sc.translations || []).forEach(t => { tMap[t.language_code] = { name: t.screen_name, label: t.menu_label || '' }; });
    setTranslations(tMap);
    setScreenActions([]);
    setNewActionId(''); setNewUiKey('');
    setActiveTab('main');
    setPanelError(null);
    setPanelOpen(true);
  };

  const loadScreenActions = async (screenId: string) => {
    setLoadingActions(true);
    try {
      const [saRes, acRes] = await Promise.all([
        fetch(SA_API, { headers: headers() }),
        fetch(`${SA_API}/catalogs/actions`, { headers: headers() }),
      ]);
      const [saData, acData] = await Promise.all([saRes.json(), acRes.json()]);
      const all: ScreenAction[] = (saData.screenActions || []).filter((sa: any) => sa.screen_id === screenId);
      setScreenActions(all);
      setActionsCatalog(acData.actions || []);
    } catch {
      setScreenActions([]);
    } finally {
      setLoadingActions(false);
    }
  };

  const addScreenAction = async () => {
    if (!editing || !newActionId) return;
    setAddingAction(true);
    try {
      const res = await fetch(SA_API, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ screen_id: editing.id, action_id: newActionId, ui_element_key: newUiKey || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creando');
      setNewActionId(''); setNewUiKey('');
      await loadScreenActions(editing.id);
    } catch (e: any) {
      setPanelError(e.message);
    } finally {
      setAddingAction(false);
    }
  };

  const toggleScreenActionStatus = async (sa: ScreenAction) => {
    try {
      await fetch(`${SA_API}/${sa.id}/status`, {
        method: 'PATCH', headers: headers(),
        body: JSON.stringify({ is_active: !sa.is_active }),
      });
      if (editing) await loadScreenActions(editing.id);
    } catch (e: any) {
      setPanelError(e.message);
    }
  };

  const save = async () => {
    setPanelError(null);
    if (!form.screen_key || !form.screen_name || !form.menu_group_id) {
      setPanelError('Clave, nombre y grupo de menú son obligatorios'); return;
    }
    setSaving(true);
    try {
      const payload = { ...form, menu_label: form.menu_label || null, route_path: form.route_path || null, icon_key: form.icon_key || null };
      let id: string;
      if (editing) {
        const res = await fetch(`${API}/${editing.id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error actualizando');
        id = editing.id;
      } else {
        const res = await fetch(API, { method: 'POST', headers: headers(), body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error creando');
        id = data.screen.id;
      }
      for (const [lang, vals] of Object.entries(translations)) {
        if (!vals.name) continue;
        await fetch(`${API}/${id}/translations`, {
          method: 'POST', headers: headers(),
          body: JSON.stringify({ language_code: lang, screen_name: vals.name, menu_label: vals.label || null })
        });
      }
      setPanelOpen(false); await load();
    } catch (e: any) { setPanelError(e.message); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (sc: Screen) => {
    try {
      await fetch(`${API}/${sc.id}/status`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ is_active: !sc.is_active }) });
      await load();
    } catch (e: any) { setError(e.message); }
  };

  const sortBy = (f: typeof sortField) => { if (sortField === f) setSortAsc(!sortAsc); else { setSortField(f); setSortAsc(true); } };
  const SortIcon = ({ field }: { field: string }) =>
    field === sortField ? (sortAsc ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />) : null;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0074D9] flex items-center justify-center">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pantallas</h1>
            <p className="text-sm text-gray-500">Gestión de pantallas del sistema y sus rutas de navegación</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#0074D9] text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Nueva Pantalla
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por clave, nombre o ruta..."
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
          className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">Todos los grupos</option>
          {menuGroups.map(mg => <option key={mg.id} value={mg.id}>{mg.menu_group_name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
          className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
        <span className="text-sm text-gray-500">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl border overflow-hidden flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {[{ label: 'Clave', f: 'screen_key' }, { label: 'Nombre', f: 'screen_name' }].map(col => (
                    <th key={col.f} onClick={() => sortBy(col.f as any)} className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap">
                      {col.label}<SortIcon field={col.f} />
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Etiqueta Menú</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Grupo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Ruta</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 cursor-pointer" onClick={() => sortBy('sort_order')}>Orden<SortIcon field="sort_order" /></th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400">{search ? 'No hay resultados' : 'No hay pantallas registradas'}</td></tr>
                ) : filtered.map(sc => (
                  <tr key={sc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{sc.screen_key}</span></td>
                    <td className="px-4 py-3 font-medium text-gray-900">{sc.screen_name}</td>
                    <td className="px-4 py-3 text-gray-500">{sc.menu_label || '—'}</td>
                    <td className="px-4 py-3">
                      {sc.menu_group_name
                        ? <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{sc.menu_group_name}</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{sc.route_path || '—'}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{sc.sort_order}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={sc.is_active ? BADGE.active : BADGE.inactive}>{sc.is_active ? 'Activa' : 'Inactiva'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(sc)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => toggleStatus(sc)} className={`p-1.5 rounded-lg ${sc.is_active ? 'text-gray-500 hover:text-orange-600 hover:bg-orange-50' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}>
                          {sc.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Panel lateral */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setPanelOpen(false)} />
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">{editing ? 'Editar Pantalla' : 'Nueva Pantalla'}</h2>
              </div>
              <button onClick={() => setPanelOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X className="w-5 h-5" /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b overflow-x-auto">
              {[
                { key: 'main', label: 'Datos Principales' },
                { key: 'translations', label: 'Traducciones' },
                { key: 'actions', label: 'Acciones' },
              ].map(t => (
                <button key={t.key}
                  onClick={() => {
                    setActiveTab(t.key as any);
                    if (t.key === 'actions' && editing && screenActions.length === 0 && !loadingActions) {
                      loadScreenActions(editing.id);
                    }
                  }}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  {t.key === 'translations' && <Languages className="w-3.5 h-3.5 inline mr-1" />}
                  {t.key === 'actions' && <Link2 className="w-3.5 h-3.5 inline mr-1" />}
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {panelError && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{panelError}
                </div>
              )}

              {/* ── Tab: Datos ── */}
              {activeTab === 'main' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clave <span className="text-red-500">*</span></label>
                    <input value={form.screen_key} onChange={e => setForm({ ...form, screen_key: e.target.value.toUpperCase() })} disabled={!!editing}
                      placeholder="Ej: ROLES_MANAGEMENT"
                      className="w-full px-3 py-2 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                    <input value={form.screen_name} onChange={e => setForm({ ...form, screen_name: e.target.value })}
                      placeholder="Ej: Gestión de Roles"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Etiqueta en Menú</label>
                    <input value={form.menu_label} onChange={e => setForm({ ...form, menu_label: e.target.value })}
                      placeholder="Ej: Roles"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grupo de Menú <span className="text-red-500">*</span></label>
                    <select value={form.menu_group_id} onChange={e => setForm({ ...form, menu_group_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">— Seleccionar —</option>
                      {menuGroups.map(mg => <option key={mg.id} value={mg.id}>{mg.menu_group_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ruta</label>
                    <input value={form.route_path} onChange={e => setForm({ ...form, route_path: e.target.value })}
                      placeholder="/dashboard/maintenance/roles"
                      className="w-full px-3 py-2 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <p className="text-xs text-gray-400 mt-1">Debe comenzar con / y usar solo minúsculas.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ícono (Lucide)</label>
                      <input value={form.icon_key} onChange={e => setForm({ ...form, icon_key: e.target.value })}
                        placeholder="Ej: Shield"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
                      <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="sc-active" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                    <label htmlFor="sc-active" className="text-sm text-gray-700">Activa</label>
                  </div>
                </div>
              )}

              {/* ── Tab: Traducciones ── */}
              {activeTab === 'translations' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">Configure el nombre de la pantalla en cada idioma.</p>
                  {languages.length === 0
                    ? <p className="text-sm text-gray-400">No hay idiomas configurados.</p>
                    : languages.map(lang => (
                      <div key={lang.code} className="border rounded-lg p-4">
                        <p className="font-medium text-sm text-gray-700 mb-3">
                          {lang.language_name} <span className="text-gray-400 font-mono text-xs">({lang.code})</span>
                        </p>
                        <div className="space-y-2">
                          <input placeholder="Nombre traducido" value={translations[lang.code]?.name || ''}
                            onChange={e => setTranslations(prev => ({
                              ...prev,
                              [lang.code]: { ...prev[lang.code], name: e.target.value, label: prev[lang.code]?.label || '' }
                            }))}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <input placeholder="Etiqueta de menú traducida (opcional)" value={translations[lang.code]?.label || ''}
                            onChange={e => setTranslations(prev => ({
                              ...prev,
                              [lang.code]: { ...prev[lang.code], label: e.target.value, name: prev[lang.code]?.name || '' }
                            }))}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* ── Tab: Acciones de Pantalla ── */}
              {activeTab === 'actions' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Acciones disponibles para esta pantalla (<code className="text-xs bg-gray-100 px-1 rounded">screen_actions</code>).
                  </p>
                  {!editing ? (
                    <p className="text-sm text-gray-400">Guarda la pantalla primero para configurar sus acciones.</p>
                  ) : loadingActions ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* Lista de acciones existentes */}
                      <div className="space-y-2">
                        {screenActions.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4 border rounded-lg bg-gray-50">
                            Sin acciones asignadas. Agrega una abajo.
                          </p>
                        ) : screenActions.map(sa => (
                          <div key={sa.id} className={`flex items-center justify-between p-3 rounded-lg border ${sa.is_active ? 'bg-gray-50' : 'bg-gray-100 opacity-60'}`}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sa.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                              <div>
                                <span className="text-sm font-medium text-gray-900">{sa.action_name}</span>
                                <span className="ml-2 font-mono text-xs text-gray-400">{sa.action_key}</span>
                                {sa.ui_element_key && <span className="ml-2 text-xs text-gray-400">· {sa.ui_element_key}</span>}
                              </div>
                            </div>
                            <button onClick={() => toggleScreenActionStatus(sa)}
                              className={`p-1.5 rounded-lg ${sa.is_active ? 'text-orange-500 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                              title={sa.is_active ? 'Desactivar' : 'Activar'}>
                              {sa.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Agregar nueva acción */}
                      <div className="border-t pt-4">
                        <p className="text-xs font-medium text-gray-600 mb-2">Agregar acción a esta pantalla</p>
                        <div className="flex gap-2">
                          <select value={newActionId} onChange={e => setNewActionId(e.target.value)}
                            className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">— Seleccionar acción —</option>
                            {actionsCatalog
                              .filter(a => !screenActions.some(sa => sa.action_id === a.id))
                              .map(a => <option key={a.id} value={a.id}>{a.action_name} ({a.action_key})</option>)}
                          </select>
                          <input value={newUiKey} onChange={e => setNewUiKey(e.target.value)}
                            placeholder="UI key (opc.)"
                            className="w-28 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <button onClick={addScreenAction} disabled={!newActionId || addingAction}
                            className="px-3 py-2 bg-[#0074D9] text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                            {addingAction ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={() => setPanelOpen(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-100">Cancelar</button>
              {activeTab !== 'actions' && (
                <button onClick={save} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0074D9] text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60">
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScreensManagement;

