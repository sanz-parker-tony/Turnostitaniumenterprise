'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Edit2,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Save,
  Search,
  X,
  Zap,
} from 'lucide-react';
import { publicApiToken } from '../../../utils/backend/info';
import GridActionIconButton from '@/components/shared/GridActionIconButton';
import HeaderInfoTips from '@/components/shared/HeaderInfoTips';
import HeaderRefreshButton from '@/components/shared/HeaderRefreshButton';
import SystemAdminPageHeader from '@/components/shared/SystemAdminPageHeader';

const API = 'http://localhost:3001/actions-management';
function getToken() {
  return localStorage.getItem('tt-access-token') || publicApiToken;
}

type ActionRow = {
  id: string;
  action_key: string;
  action_name: string;
  is_active: boolean;
  created_at: string;
};

const BADGE = {
  active: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800',
  inactive: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700',
};

export default function ActionsManagement() {
  const [rows, setRows] = useState<ActionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<'action_key' | 'action_name'>('action_key');
  const [sortAsc, setSortAsc] = useState(true);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<ActionRow | null>(null);
  const [form, setForm] = useState({ action_key: '', action_name: '', is_active: true });
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
      const res = await fetch(API, { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando acciones');
      setRows(data.actions || []);
    } catch (e: any) {
      setError(e.message || 'Error cargando acciones');
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
      list = list.filter((a) => a.action_key.toLowerCase().includes(s) || a.action_name.toLowerCase().includes(s));
    }
    if (statusFilter === 'active') list = list.filter((a) => a.is_active);
    if (statusFilter === 'inactive') list = list.filter((a) => !a.is_active);
    list.sort((a, b) => {
      const va = String(a[sortField] || '');
      const vb = String(b[sortField] || '');
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return list;
  }, [rows, search, statusFilter, sortField, sortAsc]);

  const sortBy = (field: 'action_key' | 'action_name') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
      return;
    }
    setSortField(field);
    setSortAsc(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ action_key: '', action_name: '', is_active: true });
    setPanelError(null);
    setPanelOpen(true);
  };

  const openEdit = (row: ActionRow) => {
    setEditing(row);
    setForm({ action_key: row.action_key, action_name: row.action_name, is_active: row.is_active });
    setPanelError(null);
    setPanelOpen(true);
  };

  const save = async () => {
    setPanelError(null);
    const payload = {
      action_key: String(form.action_key || '').trim().toUpperCase(),
      action_name: String(form.action_name || '').trim(),
      is_active: Boolean(form.is_active),
    };

    if (!payload.action_key || !payload.action_name) {
      setPanelError('Clave y nombre son obligatorios');
      return;
    }

    setSaving(true);
    try {
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

  const toggleStatus = async (row: ActionRow) => {
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

  const SortIcon = ({ field }: { field: 'action_key' | 'action_name' }) => {
    if (field !== sortField) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <SystemAdminPageHeader
        icon={Zap}
        title="Gestión de Acciones"
        subtitle="Catálogo de acciones disponibles en el sistema"
        rightSlot={
          <>
            <HeaderInfoTips
              items={[
                {
                  title: 'Tip de seguridad',
                  text: 'Define aquí acciones reutilizables para asignarlas por rol en las pantallas.',
                  variant: 'security',
                },
              ]}
            />
            <HeaderRefreshButton onClick={load} />
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#0074D9] text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              <Plus className="w-4 h-4" /> Nueva Acción
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
            placeholder="Buscar por clave o nombre..."
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
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
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th onClick={() => sortBy('action_key')} className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900">
                    Clave<SortIcon field="action_key" />
                  </th>
                  <th onClick={() => sortBy('action_name')} className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900">
                    Nombre<SortIcon field="action_name" />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Creado</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">
                      {search ? 'No hay resultados' : 'No hay acciones registradas'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{row.action_key}</span></td>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.action_name}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(row.created_at).toLocaleDateString('es')}</td>
                      <td className="px-4 py-3 text-center"><span className={row.is_active ? BADGE.active : BADGE.inactive}>{row.is_active ? 'Activa' : 'Inactiva'}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <GridActionIconButton
                            onClick={() => openEdit(row)}
                            icon={<Edit2 className="w-4 h-4" />}
                            label="Editar"
                            tone="blue"
                          />
                          <GridActionIconButton
                            onClick={() => toggleStatus(row)}
                            icon={row.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                            label={row.is_active ? 'Desactivar' : 'Activar'}
                            tone='amber'
                          />
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
                  <input value={form.action_key} onChange={(e) => setForm({ ...form, action_key: e.target.value.toUpperCase() })} disabled={!!editing}
                    placeholder="Ej: VIEW, CREATE, EXPORT" className="w-full px-3 py-2 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400" />
                  <p className="text-xs text-gray-400 mt-1">Solo mayúsculas, números y guión bajo.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                  <input value={form.action_name} onChange={(e) => setForm({ ...form, action_name: e.target.value })}
                    placeholder="Ej: Ver, Crear, Exportar" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="ac-active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
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

