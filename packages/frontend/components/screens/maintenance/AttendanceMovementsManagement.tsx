'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Edit2, Plus, RefreshCw, Save, Search, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { buildApiUrl } from '../../../utils/api-config';

type PunchKey = {
  id: string;
  lookup_key: string;
  lookup_label: string;
  device_code: number;
};

type Movement = {
  id: string;
  movement_name: string;
  movement_short_name: string;
  start_punch_key_id: string;
  end_punch_key_id: string;
  start_lookup_key: string;
  start_lookup_label: string;
  end_lookup_key: string;
  end_lookup_label: string;
  start_key: number;
  end_key: number;
  is_active: boolean;
};

const EMPTY_FORM = {
  movement_name: '',
  movement_short_name: '',
  start_punch_key_id: '',
  end_punch_key_id: '',
  is_active: true,
};

export function AttendanceMovementsManagement() {
  const { session } = useAuth();
  const [rows, setRows] = useState<Movement[]>([]);
  const [punchKeys, setPunchKeys] = useState<PunchKey[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Movement | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || ''}`,
  });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [movementsResponse, keysResponse] = await Promise.all([
        fetch(buildApiUrl('/attendance-events/movements'), { headers: headers() }),
        fetch(buildApiUrl('/attendance-events/catalogs/punch-keys'), { headers: headers() }),
      ]);
      const [movementsPayload, keysPayload] = await Promise.all([
        movementsResponse.json(),
        keysResponse.json(),
      ]);
      if (!movementsResponse.ok) throw new Error(movementsPayload?.error || 'No se pudieron cargar los movimientos');
      if (!keysResponse.ok) throw new Error(keysPayload?.error || 'No se pudo cargar PUNCH_KEY');
      setRows(movementsPayload.movements || []);
      setPunchKeys(keysPayload.punch_keys || []);
    } catch (loadError: any) {
      setError(loadError?.message || 'Error cargando movimientos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session?.access_token) void load();
  }, [session?.access_token]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      `${row.movement_name} ${row.movement_short_name} ${row.start_lookup_label} ${row.end_lookup_label}`
        .toLowerCase()
        .includes(term)
    );
  }, [rows, search]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      start_punch_key_id: punchKeys[0]?.id || '',
      end_punch_key_id: punchKeys[1]?.id || '',
    });
    setError('');
    setPanelOpen(true);
  }

  function openEdit(row: Movement) {
    setEditing(row);
    setForm({
      movement_name: row.movement_name,
      movement_short_name: row.movement_short_name,
      start_punch_key_id: row.start_punch_key_id,
      end_punch_key_id: row.end_punch_key_id,
      is_active: row.is_active,
    });
    setError('');
    setPanelOpen(true);
  }

  async function save() {
    if (!form.movement_name.trim() || !form.movement_short_name.trim()) {
      setError('Nombre y código son obligatorios');
      return;
    }
    if (!form.start_punch_key_id || !form.end_punch_key_id) {
      setError('Debe seleccionar ambas teclas');
      return;
    }
    if (form.start_punch_key_id === form.end_punch_key_id) {
      setError('La tecla inicial y final deben ser diferentes');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await fetch(
        buildApiUrl(editing ? `/attendance-events/movements/${editing.id}` : '/attendance-events/movements'),
        {
          method: editing ? 'PUT' : 'POST',
          headers: headers(),
          body: JSON.stringify(form),
        }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo guardar el movimiento');
      setPanelOpen(false);
      await load();
    } catch (saveError: any) {
      setError(saveError?.message || 'Error guardando movimiento');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(row: Movement) {
    setError('');
    try {
      const response = await fetch(buildApiUrl(`/attendance-events/movements/${row.id}/status`), {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ is_active: !row.is_active }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo cambiar el estado');
      await load();
    } catch (statusError: any) {
      setError(statusError?.message || 'Error cambiando estado');
    }
  }

  return (
    <div className="space-y-4 p-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Movimientos de asistencia</h1>
            <p className="mt-1 text-sm text-slate-600">
              Define qué par de teclas PUNCH_KEY abre y cierra cada movimiento de marcación.
            </p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Nuevo movimiento
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar movimiento o tecla" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" />
          </div>
          <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
        </div>

        {error && !panelOpen && <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Movimiento</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Tecla inicial</th>
                <th className="px-4 py-3">Tecla final</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{row.movement_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-700">{row.movement_short_name}</td>
                  <td className="px-4 py-3">{row.start_lookup_label} <span className="text-slate-400">({row.start_lookup_key})</span></td>
                  <td className="px-4 py-3">{row.end_lookup_label} <span className="text-slate-400">({row.end_lookup_key})</span></td>
                  <td className="px-4 py-3">
                    <button onClick={() => void toggleStatus(row)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {row.is_active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(row)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
                      <Edit2 className="h-3.5 w-3.5" /> Editar
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No existen movimientos para los criterios indicados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-bold">{editing ? 'Editar movimiento' : 'Nuevo movimiento'}</h2>
              <button onClick={() => setPanelOpen(false)} className="rounded-md p-1 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-5">
              {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
              <label className="block text-sm font-medium">Nombre
                <input value={form.movement_name} onChange={(event) => setForm({ ...form, movement_name: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium">Código
                <input value={form.movement_short_name} onChange={(event) => setForm({ ...form, movement_short_name: event.target.value.toUpperCase() })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono" maxLength={20} />
              </label>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                <label className="block text-sm font-medium">Tecla inicial
                  <select value={form.start_punch_key_id} onChange={(event) => setForm({ ...form, start_punch_key_id: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                    {punchKeys.map((key) => <option key={key.id} value={key.id}>{key.device_code} · {key.lookup_label}</option>)}
                  </select>
                </label>
                <ArrowRight className="mb-2 hidden h-5 w-5 text-slate-400 sm:block" />
                <label className="block text-sm font-medium">Tecla final
                  <select value={form.end_punch_key_id} onChange={(event) => setForm({ ...form, end_punch_key_id: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                    {punchKeys.map((key) => <option key={key.id} value={key.id}>{key.device_code} · {key.lookup_label}</option>)}
                  </select>
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Activo
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button onClick={() => setPanelOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancelar</button>
              <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

