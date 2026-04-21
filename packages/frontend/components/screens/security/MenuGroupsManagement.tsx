'use client';
/**
 * MenuGroupsManagement - Gestión de Grupos de Menú
 * Turnos Titanium Enterprise — Seguridad → Grupos de Menú
 */

import { useState, useEffect, useMemo } from 'react';
import {
  LayoutList, Plus, Edit2, Power, PowerOff, Search, X,
  RefreshCw, ChevronUp, ChevronDown, Languages, Save, AlertCircle, Monitor,
} from 'lucide-react';
import { projectId, publicApiToken } from '../../../utils/backend/info';

const API = `http://localhost:3001/make-server-e19f2094/menu-groups-management`;

function getToken() {
  return localStorage.getItem('tt-access-token') || publicApiToken;
}

interface MenuGroup {
  id: string;
  menu_group_key: string;
  menu_group_name: string;
  menu_group_short_name: string | null;
  icon_key: string | null;
  sort_order: number;
  permission_level: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string | null;
  translations: Translation[];
}

interface Translation {
  id?: string;
  menu_group_id?: string;
  language_code: string;
  menu_group_name: string;
  menu_group_short_name: string | null;
}

interface Language { code: string; language_name: string; }

interface GroupScreen {
  id: string; screen_key: string; screen_name: string;
  menu_label: string | null; route_path: string | null;
  icon_key: string | null; sort_order: number; is_active: boolean;
  menu_group_id: string;
}

const EMPTY_FORM = {
  menu_group_key: '',
  menu_group_name: '',
  menu_group_short_name: '',
  icon_key: '',
  sort_order: 0,
  permission_level: '',
  is_active: true,
};

const BADGE = {
  active: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800',
  inactive: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600',
};

export function MenuGroupsManagement() {
  const [groups, setGroups] = useState<MenuGroup[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<'sort_order' | 'menu_group_key' | 'menu_group_name'>('sort_order');
  const [sortAsc, setSortAsc] = useState(true);

  // Panel lateral
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<MenuGroup | null>(null);
  const [activeTab, setActiveTab] = useState<'main' | 'translations' | 'screens'>('main');
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [translations, setTranslations] = useState<Record<string, { name: string; short: string }>>({});
  const [groupScreens, setGroupScreens] = useState<GroupScreen[]>([]);
  const [loadingScreens, setLoadingScreens] = useState(false);
  const [saving, setSaving] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  const headers = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [gRes, lRes] = await Promise.all([
        fetch(API, { headers: headers() }),
        fetch(`${API}/catalogs/languages`, { headers: headers() }),
      ]);
      const gData = await gRes.json();
      const lData = await lRes.json();
      if (!gRes.ok) throw new Error(gData.error || 'Error cargando grupos');
      setGroups(gData.menuGroups || []);
      setLanguages(lData.languages || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = [...groups];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(g =>
        g.menu_group_key.toLowerCase().includes(s) ||
        g.menu_group_name.toLowerCase().includes(s) ||
        (g.menu_group_short_name || '').toLowerCase().includes(s)
      );
    }
    if (statusFilter === 'active') list = list.filter(g => g.is_active);
    if (statusFilter === 'inactive') list = list.filter(g => !g.is_active);
    list.sort((a, b) => {
      const va = String(a[sortField] ?? '');
      const vb = String(b[sortField] ?? '');
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return list;
  }, [groups, search, statusFilter, sortField, sortAsc]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setTranslations({});
    setGroupScreens([]);
    setActiveTab('main');
    setPanelError(null);
    setPanelOpen(true);
  };

  const openEdit = (g: MenuGroup) => {
    setEditing(g);
    setForm({
      menu_group_key: g.menu_group_key,
      menu_group_name: g.menu_group_name,
      menu_group_short_name: g.menu_group_short_name || '',
      icon_key: g.icon_key || '',
      sort_order: g.sort_order,
      permission_level: g.permission_level || '',
      is_active: g.is_active,
    });
    const tMap: Record<string, { name: string; short: string }> = {};
    (g.translations || []).forEach(t => {
      tMap[t.language_code] = { name: t.menu_group_name, short: t.menu_group_short_name || '' };
    });
    setTranslations(tMap);
    setGroupScreens([]);
    setActiveTab('main');
    setPanelError(null);
    setPanelOpen(true);
  };

  const loadGroupScreens = async (groupId: string) => {
    setLoadingScreens(true);
    try {
      const res = await fetch(
        `http://localhost:3001/make-server-e19f2094/screens-management`,
        { headers: headers() }
      );
      const data = await res.json();
      const all: GroupScreen[] = (data.screens || []).filter((s: GroupScreen) => s.menu_group_id === groupId);
      setGroupScreens(all.sort((a, b) => a.sort_order - b.sort_order));
    } catch {
      setGroupScreens([]);
    } finally {
      setLoadingScreens(false);
    }
  };

  const save = async () => {
    setPanelError(null);
    if (!form.menu_group_key || !form.menu_group_name) {
      setPanelError('Clave y nombre son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        menu_group_short_name: form.menu_group_short_name || null,
        icon_key: form.icon_key || null,
        permission_level: form.permission_level || null,
      };

      let id: string;
      if (editing) {
        const res = await fetch(`${API}/${editing.id}`, {
          method: 'PUT', headers: headers(), body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error actualizando');
        id = editing.id;
      } else {
        const res = await fetch(API, {
          method: 'POST', headers: headers(), body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error creando');
        id = data.menuGroup.id;
      }

      for (const [lang, vals] of Object.entries(translations)) {
        if (!vals.name) continue;
        await fetch(`${API}/${id}/translations`, {
          method: 'POST', headers: headers(),
          body: JSON.stringify({ language_code: lang, menu_group_name: vals.name, menu_group_short_name: vals.short || null }),
        });
      }

      setPanelOpen(false);
      await load();
    } catch (e: any) {
      setPanelError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (g: MenuGroup) => {
    try {
      await fetch(`${API}/${g.id}/status`, {
        method: 'PATCH', headers: headers(),
        body: JSON.stringify({ is_active: !g.is_active }),
      });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const sortBy = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const SortIcon = ({ field }: { field: string }) =>
    field === sortField
      ? (sortAsc ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />)
      : null;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0074D9] flex items-center justify-center">
            <LayoutList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Grupos de Menú</h1>
            <p className="text-sm text-gray-500">Gestión de grupos de navegación del sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[#0074D9] text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Nuevo Grupo
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por clave o nombre..."
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
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
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl border overflow-hidden flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {[
                    { label: 'Clave', field: 'menu_group_key' },
                    { label: 'Nombre', field: 'menu_group_name' },
                  ].map(col => (
                    <th key={col.field}
                      onClick={() => sortBy(col.field as any)}
                      className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap">
                      {col.label}<SortIcon field={col.field} />
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Abrev.</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Ícono</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                    onClick={() => sortBy('sort_order')}>
                    Orden<SortIcon field="sort_order" />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nivel</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      {search ? 'No hay resultados para esta búsqueda' : 'No hay grupos de menú registrados'}
                    </td>
                  </tr>
                ) : filtered.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{g.menu_group_key}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{g.menu_group_name}</td>
                    <td className="px-4 py-3 text-gray-500">{g.menu_group_short_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{g.icon_key || '—'}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{g.sort_order}</td>
                    <td className="px-4 py-3">
                      {g.permission_level
                        ? <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{g.permission_level}</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={g.is_active ? BADGE.active : BADGE.inactive}>
                        {g.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(g)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleStatus(g)}
                          className={`p-1.5 rounded-lg ${g.is_active ? 'text-gray-500 hover:text-orange-600 hover:bg-orange-50' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}
                          title={g.is_active ? 'Desactivar' : 'Activar'}>
                          {g.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
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
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <LayoutList className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">{editing ? 'Editar Grupo de Menú' : 'Nuevo Grupo de Menú'}</h2>
              </div>
              <button onClick={() => setPanelOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              {[
                { key: 'main', label: 'Datos Principales' },
                { key: 'translations', label: 'Traducciones' },
                { key: 'screens', label: 'Pantallas del Grupo' },
              ].map(t => (
                <button key={t.key}
                  onClick={() => {
                    setActiveTab(t.key as any);
                    if (t.key === 'screens' && editing && groupScreens.length === 0 && !loadingScreens) {
                      loadGroupScreens(editing.id);
                    }
                  }}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  {t.key === 'translations' && <Languages className="w-3.5 h-3.5 inline mr-1" />}
                  {t.key === 'screens' && <Monitor className="w-3.5 h-3.5 inline mr-1" />}
                  {t.label}
                </button>
              ))}
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto p-6">
              {panelError && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {panelError}
                </div>
              )}

              {/* ── Tab: Datos ── */}
              {activeTab === 'main' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clave del Grupo <span className="text-red-500">*</span></label>
                    <input value={form.menu_group_key}
                      onChange={e => setForm({ ...form, menu_group_key: e.target.value.toUpperCase() })}
                      disabled={!!editing}
                      placeholder="Ej: MAINT, SECURITY, CONFIG"
                      className="w-full px-3 py-2 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400" />
                    <p className="text-xs text-gray-400 mt-1">Solo mayúsculas, números y guión bajo. No modificable una vez creado.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                    <input value={form.menu_group_name}
                      onChange={e => setForm({ ...form, menu_group_name: e.target.value })}
                      placeholder="Ej: Mantenimiento"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Corto</label>
                    <input value={form.menu_group_short_name}
                      onChange={e => setForm({ ...form, menu_group_short_name: e.target.value })}
                      placeholder="Ej: Mant."
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ícono (Lucide)</label>
                      <input value={form.icon_key}
                        onChange={e => setForm({ ...form, icon_key: e.target.value })}
                        placeholder="Ej: Settings, Shield"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
                      <input type="number" value={form.sort_order}
                        onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de Permiso</label>
                    <select value={form.permission_level}
                      onChange={e => setForm({ ...form, permission_level: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">— Sin restricción —</option>
                      <option value="SYSTEM">SYSTEM</option>
                      <option value="TENANT">TENANT</option>
                      <option value="PUBLIC">PUBLIC</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="mg-active" checked={form.is_active}
                      onChange={e => setForm({ ...form, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                    <label htmlFor="mg-active" className="text-sm text-gray-700">Activo</label>
                  </div>
                </div>
              )}

              {/* ── Tab: Traducciones ── */}
              {activeTab === 'translations' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">Configure el nombre del grupo en cada idioma disponible.</p>
                  {languages.length === 0
                    ? <p className="text-sm text-gray-400">No hay idiomas configurados.</p>
                    : languages.map(lang => (
                      <div key={lang.code} className="border rounded-lg p-4">
                        <p className="font-medium text-sm text-gray-700 mb-3">
                          {lang.language_name} <span className="text-gray-400 font-mono text-xs">({lang.code})</span>
                        </p>
                        <div className="space-y-2">
                          <input
                            placeholder="Nombre traducido"
                            value={translations[lang.code]?.name || ''}
                            onChange={e => setTranslations(prev => ({
                              ...prev,
                              [lang.code]: { ...prev[lang.code], name: e.target.value, short: prev[lang.code]?.short || '' }
                            }))}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <input
                            placeholder="Nombre corto traducido (opcional)"
                            value={translations[lang.code]?.short || ''}
                            onChange={e => setTranslations(prev => ({
                              ...prev,
                              [lang.code]: { ...prev[lang.code], short: e.target.value, name: prev[lang.code]?.name || '' }
                            }))}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* ── Tab: Pantallas del Grupo ── */}
              {activeTab === 'screens' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Pantallas asignadas a este grupo de menú.</p>
                  {!editing ? (
                    <p className="text-sm text-gray-400">Guarda el grupo primero para ver sus pantallas.</p>
                  ) : loadingScreens ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : groupScreens.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Monitor className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Sin pantallas asignadas a este grupo</p>
                      <p className="text-xs mt-1">Crea pantallas en <strong>Seguridad → Pantallas</strong> y asígnalas a este grupo.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {groupScreens.map(sc => (
                        <div key={sc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{sc.screen_name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-xs text-gray-400">{sc.screen_key}</span>
                                {sc.route_path && <span className="text-xs text-gray-400">· {sc.route_path}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-xs text-gray-400">Orden: {sc.sort_order}</span>
                            {sc.menu_label && <p className="text-xs text-gray-500">{sc.menu_label}</p>}
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-gray-400 text-right pt-1">
                        {groupScreens.length} pantalla{groupScreens.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={() => setPanelOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-100">
                Cancelar
              </button>
              {activeTab !== 'screens' && (
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

export default MenuGroupsManagement;

