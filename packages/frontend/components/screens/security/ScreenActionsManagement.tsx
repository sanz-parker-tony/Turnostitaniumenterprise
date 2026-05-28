'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Edit2,
  Link2,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Save,
  Search,
  X,
} from 'lucide-react';
import { publicApiToken } from '../../../utils/backend/info';
import GridActionIconButton from '@/components/shared/GridActionIconButton';
import HeaderInfoTips from '@/components/shared/HeaderInfoTips';
import HeaderRefreshButton from '@/components/shared/HeaderRefreshButton';
import SystemAdminPageHeader from '@/components/shared/SystemAdminPageHeader';

const API = 'http://localhost:3001/screen-actions-management';
function getToken() {
  return localStorage.getItem('tt-access-token') || publicApiToken;
}

type ScreenAction = {
  id: string;
  screen_id: string;
  action_id: string;
  ui_element_key: string | null;
  is_active: boolean;
  screen_key?: string | null;
  screen_name?: string | null;
  action_key?: string | null;
  action_name?: string | null;
};

type ScreenCatalog = {
  id: string;
  screen_key: string;
  screen_name: string;
};

type ActionCatalog = {
  id: string;
  action_key: string;
  action_name: string;
};

const BADGE = {
  active: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800',
  inactive: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700',
};

export function ScreenActionsManagement() {
  const [rows, setRows] = useState<ScreenAction[]>([]);
  const [screens, setScreens] = useState<ScreenCatalog[]>([]);
  const [actions, setActions] = useState<ActionCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [screenFilter, setScreenFilter] = useState('all');

  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<ScreenAction | null>(null);
  const [form, setForm] = useState({ screen_id: '', action_id: '', ui_element_key: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [saRes, scRes, acRes] = await Promise.all([
        fetch(API, { headers: headers() }),
        fetch(`${API}/catalogs/screens`, { headers: headers() }),
        fetch(`${API}/catalogs/actions`, { headers: headers() }),
      ]);
      const [saData, scData, acData] = await Promise.all([saRes.json(), scRes.json(), acRes.json()]);
      if (!saRes.ok) throw new Error(saData.error || 'Error cargando relaciones pantalla-acción');
      setRows(saData.screenActions || []);
      setScreens(scData.screens || []);
      setActions(acData.actions || []);
    } catch (e: any) {
      setError(e.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (sa) =>
          String(sa.screen_name || '').toLowerCase().includes(s) ||
          String(sa.action_name || '').toLowerCase().includes(s) ||
          String(sa.ui_element_key || '').toLowerCase().includes(s)
      );
    }
    if (statusFilter === 'active') list = list.filter((sa) => sa.is_active);
    if (statusFilter === 'inactive') list = list.filter((sa) => !sa.is_active);
    if (screenFilter !== 'all') list = list.filter((sa) => sa.screen_id === screenFilter);
    return list;
  }, [rows, search, statusFilter, screenFilter]);

  const uniqueScreens = useMemo(() => {
    const seen = new Set<string>();
    return rows.filter((sa) => {
      if (seen.has(sa.screen_id)) return false;
      seen.add(sa.screen_id);
      return true;
    });
  }, [rows]);

  const openCreate = () => {
    setEditing(null);
    setForm({ screen_id: '', action_id: '', ui_element_key: '', is_active: true });
    setPanelError(null);
    setPanelOpen(true);
  };

  const openEdit = (row: ScreenAction) => {
    setEditing(row);
    setForm({
      screen_id: row.screen_id,
      action_id: row.action_id,
      ui_element_key: row.ui_element_key || '',
      is_active: row.is_active,
    });
    setPanelError(null);
    setPanelOpen(true);
  };

  const save = async () => {
    setPanelError(null);
    if (!form.screen_id || !form.action_id) {
      setPanelError('Pantalla y acción son obligatorios');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, ui_element_key: form.ui_element_key || null };
      if (editing) {
        const res = await fetch(`${API}/${editing.id}`, {
          method: 'PUT',
          headers: headers(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error actualizando');
      } else {
        const res = await fetch(API, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error creando');
      }
      setPanelOpen(false);
      await load();
    } catch (e: any) {
      setPanelError(e.message || 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row: ScreenAction) => {
    try {
      const res = await fetch(`${API}/${row.id}/status`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ is_active: !row.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cambiando estado');
      await load();
    } catch (e: any) {
      setError(e.message || 'Error cambiando estado');
    }
  };

  return (
    <div className="p-6 max-w-full flex flex-col h-full gap-4">
      <SystemAdminPageHeader
        icon={Link2}
        title="Gestión de Acciones de Pantalla"
        subtitle="Relación de acciones disponibles por pantalla del sistema"
        rightSlot={
          <>
            <HeaderInfoTips
              items={[
                {
                  title: 'Tip funcional',
                  text: 'Cada relación define qué acción puede ejecutarse dentro de una pantalla específica.',
                  variant: 'tip',
                },
              ]}
            />
            <HeaderRefreshButton onClick={load} />
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#0074D9] text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              <Plus className="w-4 h-4" /> Nueva Relación
            </button>
          </>
        }
      />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por pantalla o acción..."
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select value={screenFilter} onChange={(e) => setScreenFilter(e.target.value)} className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">Todas las pantallas</option>
          {uniqueScreens.map((sa) => (
            <option key={sa.screen_id} value={sa.screen_id}>{sa.screen_name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')} className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
        <span className="text-sm text-gray-500">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border overflow-hidden flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Pantalla</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Acción</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Elemento UI</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">{search ? 'No hay resultados' : 'No hay relaciones registradas'}</td></tr>
                ) : filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><p className="font-medium text-gray-900">{row.screen_name || '-'}</p><p className="text-xs text-gray-400 font-mono">{row.screen_key}</p></td>
                    <td className="px-4 py-3"><p className="font-medium text-gray-900">{row.action_name || '-'}</p><p className="text-xs text-gray-400 font-mono">{row.action_key}</p></td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{row.ui_element_key || '-'}</td>
                    <td className="px-4 py-3 text-center"><span className={row.is_active ? BADGE.active : BADGE.inactive}>{row.is_active ? 'Activo' : 'Inactivo'}</span></td>
                    <td className="px-4 py-3"><div className="flex items-center justify-center gap-1">
                      <GridActionIconButton onClick={() => openEdit(row)} icon={<Edit2 className="w-4 h-4" />} label="Editar" tone="blue" />
                      <GridActionIconButton
                        onClick={() => toggleStatus(row)}
                        icon={row.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        label={row.is_active ? 'Desactivar' : 'Activar'}
                        tone='amber'
                      />
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-xl border border-gray-200 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center gap-2"><Link2 className="w-5 h-5 text-blue-600" /><h2 className="font-semibold text-gray-900">{editing ? 'Editar Relación' : 'Nueva Relación Pantalla-Acción'}</h2></div>
              <button onClick={() => setPanelOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {panelError && <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" />{panelError}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pantalla <span className="text-red-500">*</span></label>
                  <select value={form.screen_id} onChange={(e) => setForm({ ...form, screen_id: e.target.value })} disabled={!!editing}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400">
                    <option value="">- Seleccionar pantalla -</option>
                    {screens.map((s) => <option key={s.id} value={s.id}>{s.screen_name} ({s.screen_key})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Acción <span className="text-red-500">*</span></label>
                  <select value={form.action_id} onChange={(e) => setForm({ ...form, action_id: e.target.value })} disabled={!!editing}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400">
                    <option value="">- Seleccionar acción -</option>
                    {actions.map((a) => <option key={a.id} value={a.id}>{a.action_name} ({a.action_key})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clave de Elemento UI</label>
                  <input value={form.ui_element_key} onChange={(e) => setForm({ ...form, ui_element_key: e.target.value })}
                    placeholder="Ej: btn-create, menu-export" className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="sa-active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                  <label htmlFor="sa-active" className="text-sm text-gray-700">Activo</label>
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

export default ScreenActionsManagement;

