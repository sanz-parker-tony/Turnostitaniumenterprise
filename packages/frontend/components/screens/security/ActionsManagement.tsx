'use client';
/**
 * ActionsManagement - Gestión de Acciones del Sistema
 * Turnos Titanium Enterprise — Seguridad → Acciones
 */

import { useState, useEffect, useMemo } from 'react';
import { Zap, Plus, Edit2, Power, PowerOff, Search, X, RefreshCw, ChevronUp, ChevronDown, Save, AlertCircle } from 'lucide-react';
import { projectId, publicApiToken } from '../../../utils/backend/info';

const API = `http://localhost:3001/actions-management`;
function getToken() { return localStorage.getItem('tt-access-token') || publicApiToken; }

interface Action { id: string; action_key: string; action_name: string; is_active: boolean; created_by: string; created_at: string; updated_at: string | null; }

const BADGE = {
  active: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800',
  inactive: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500',
};

export function ActionsManagement() {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<'action_key' | 'action_name'>('action_key');
  const [sortAsc, setSortAsc] = useState(true);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Action | null>(null);
  const [form, setForm] = useState({ action_key: '', action_name: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` });

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(API, { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando acciones');
      setActions(data.actions || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = [...actions];
    if (search) { const s = search.toLowerCase(); list = list.filter(a => a.action_key.toLowerCase().includes(s) || a.action_name.toLowerCase().includes(s)); }
    if (statusFilter === 'active') list = list.filter(a => a.is_active);
    if (statusFilter === 'inactive') list = list.filter(a => !a.is_active);
    list.sort((a, b) => { const va = a[sortField], vb = b[sortField]; return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va); });
    return list;
  }, [actions, search, statusFilter, sortField, sortAsc]);

  const openCreate = () => { setEditing(null); setForm({ action_key: '', action_name: '', is_active: true }); setPanelError(null); setPanelOpen(true); };
  const openEdit = (a: Action) => { setEditing(a); setForm({ action_key: a.action_key, action_name: a.action_name, is_active: a.is_active }); setPanelError(null); setPanelOpen(true); };

  const save = async () => {
    setPanelError(null);
    if (!form.action_key || !form.action_name) { setPanelError('Clave y nombre son obligatorios'); return; }
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`${API}/${editing.id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(form) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error actualizando');
      } else {
        const res = await fetch(API, { method: 'POST', headers: headers(), body: JSON.stringify(form) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error creando');
      }
      setPanelOpen(false); await load();
    } catch (e: any) { setPanelError(e.message); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (a: Action) => {
    try {
      await fetch(`${API}/${a.id}/status`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ is_active: !a.is_active }) });
      await load();
    } catch (e: any) { setError(e.message); }
  };

  const sortBy = (f: typeof sortField) => { if (sortField === f) setSortAsc(!sortAsc); else { setSortField(f); setSortAsc(true); } };
  const SortIcon = ({ field }: { field: string }) => field === sortField ? (sortAsc ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />) : null;

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0074D9] flex items-center justify-center"><Zap className="w-5 h-5 text-white" /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Acciones</h1>
            <p className="text-sm text-gray-500">Catálogo de acciones disponibles en el sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#0074D9] text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Nueva Acción
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por clave o nombre..."
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
          className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option>
        </select>
        <span className="text-sm text-gray-500">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}

      <div className="bg-white rounded-xl border overflow-hidden flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {[{ label: 'Clave', f: 'action_key' }, { label: 'Nombre', f: 'action_name' }].map(col => (
                    <th key={col.f} onClick={() => sortBy(col.f as any)} className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900">
                      {col.label}<SortIcon field={col.f} />
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Creado</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">{search ? 'No hay resultados' : 'No hay acciones registradas'}</td></tr>
                ) : filtered.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{a.action_key}</span></td>
                    <td className="px-4 py-3 font-medium text-gray-900">{a.action_name}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(a.created_at).toLocaleDateString('es')}</td>
                    <td className="px-4 py-3 text-center"><span className={a.is_active ? BADGE.active : BADGE.inactive}>{a.is_active ? 'Activa' : 'Inactiva'}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(a)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => toggleStatus(a)} className={`p-1.5 rounded-lg ${a.is_active ? 'text-gray-500 hover:text-orange-600 hover:bg-orange-50' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}>
                          {a.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
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

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setPanelOpen(false)} />
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center gap-2"><Zap className="w-5 h-5 text-blue-600" /><h2 className="font-semibold text-gray-900">{editing ? 'Editar Acción' : 'Nueva Acción'}</h2></div>
              <button onClick={() => setPanelOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {panelError && <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" />{panelError}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clave <span className="text-red-500">*</span></label>
                  <input value={form.action_key} onChange={e => setForm({ ...form, action_key: e.target.value.toUpperCase() })} disabled={!!editing}
                    placeholder="Ej: VIEW, CREATE, EXPORT" className="w-full px-3 py-2 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400" />
                  <p className="text-xs text-gray-400 mt-1">Solo mayúsculas, números y guión bajo.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                  <input value={form.action_name} onChange={e => setForm({ ...form, action_name: e.target.value })}
                    placeholder="Ej: Ver, Crear, Exportar" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="ac-active" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                  <label htmlFor="ac-active" className="text-sm text-gray-700">Activa</label>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={() => setPanelOpen(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-100">Cancelar</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#0074D9] text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActionsManagement;

