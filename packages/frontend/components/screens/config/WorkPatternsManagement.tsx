'use client';

import { useEffect, useMemo, useState } from 'react';
import { Edit, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
import { publicApiToken } from '../../../utils/backend/info';

interface WorkPatternRow {
  id: string;
  pattern_name: string;
  pattern_short_name: string;
  cycle_length_days: number;
  work_days_per_cycle: number;
  rest_days_per_cycle: number;
  daily_work_minutes: number;
  weekly_work_minutes_target: number;
  is_flexible: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

interface WorkPatternFormState {
  id: string | null;
  pattern_name: string;
  pattern_short_name: string;
  cycle_length_days: string;
  work_days_per_cycle: string;
  rest_days_per_cycle: string;
  daily_work_minutes: string;
  weekly_work_minutes_target: string;
  is_flexible: boolean;
  is_active: boolean;
}

const PAGE_SIZE = 10;

function getToken() {
  return localStorage.getItem('tt-access-token') || publicApiToken;
}

function makeEmptyForm(): WorkPatternFormState {
  return {
    id: null,
    pattern_name: '',
    pattern_short_name: '',
    cycle_length_days: '7',
    work_days_per_cycle: '5',
    rest_days_per_cycle: '2',
    daily_work_minutes: '480',
    weekly_work_minutes_target: '2400',
    is_flexible: true,
    is_active: true,
  };
}

function toInt(value: string, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function WorkPatternsManagement() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [patterns, setPatterns] = useState<WorkPatternRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<WorkPatternFormState>(makeEmptyForm());

  const request = async (path: string, init?: RequestInit) => {
    const response = await fetch(`http://localhost:3001${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
        ...(init?.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || `HTTP ${response.status}`);
    }
    return payload;
  };

  const loadPatterns = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await request('/work-patterns?include_inactive=true');
      setPatterns((payload?.work_patterns || []) as WorkPatternRow[]);
    } catch (err: any) {
      setError(err?.message || 'Error cargando patrones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPatterns();
  }, []);

  const filtered = useMemo(() => {
    return patterns.filter((row) => {
      const text = `${row.pattern_name} ${row.pattern_short_name}`.toLowerCase();
      const searchOk = !searchTerm.trim() || text.includes(searchTerm.toLowerCase());
      const statusOk =
        statusFilter === 'all' ||
        (statusFilter === 'active' && row.is_active) ||
        (statusFilter === 'inactive' && !row.is_active);
      return searchOk && statusOk;
    });
  }, [patterns, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const openCreate = () => {
    setForm(makeEmptyForm());
    setModalOpen(true);
    setModalError(null);
  };

  const openEdit = (row: WorkPatternRow) => {
    setForm({
      id: row.id,
      pattern_name: row.pattern_name,
      pattern_short_name: row.pattern_short_name,
      cycle_length_days: String(row.cycle_length_days),
      work_days_per_cycle: String(row.work_days_per_cycle),
      rest_days_per_cycle: String(row.rest_days_per_cycle),
      daily_work_minutes: String(row.daily_work_minutes),
      weekly_work_minutes_target: String(row.weekly_work_minutes_target),
      is_flexible: row.is_flexible,
      is_active: row.is_active,
    });
    setModalOpen(true);
    setModalError(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSaving(false);
    setModalError(null);
  };

  const removePattern = async (row: WorkPatternRow) => {
    if (!window.confirm(`¿Desea eliminar el patrón "${row.pattern_name}"?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await request(`/work-patterns/${row.id}`, { method: 'DELETE' });
      setSuccess('Patrón eliminado correctamente.');
      await loadPatterns();
    } catch (err: any) {
      setError(err?.message || 'Error eliminando patrón');
    }
  };

  const savePattern = async () => {
    const payload = {
      pattern_name: form.pattern_name.trim(),
      pattern_short_name: form.pattern_short_name.trim().toUpperCase(),
      cycle_length_days: toInt(form.cycle_length_days),
      work_days_per_cycle: toInt(form.work_days_per_cycle),
      rest_days_per_cycle: toInt(form.rest_days_per_cycle),
      daily_work_minutes: toInt(form.daily_work_minutes),
      weekly_work_minutes_target: toInt(form.weekly_work_minutes_target),
      is_flexible: form.is_flexible,
      is_active: form.is_active,
    };

    if (!payload.pattern_name || !payload.pattern_short_name) {
      setModalError('Debe ingresar nombre y código del patrón.');
      return;
    }

    if (payload.cycle_length_days !== payload.work_days_per_cycle + payload.rest_days_per_cycle) {
      setModalError('Ciclo debe ser igual a días trabajo + días descanso.');
      return;
    }

    setSaving(true);
    setModalError(null);
    setSuccess(null);

    try {
      if (form.id) {
        await request(`/work-patterns/${form.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await request('/work-patterns', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setSuccess('Patrón guardado correctamente.');
      closeModal();
      await loadPatterns();
    } catch (err: any) {
      setModalError(err?.message || 'Error guardando patrón');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patrones de Trabajo</h1>
          <p className="text-muted-foreground mt-1">Administración de ciclos de trabajo y descanso</p>
        </div>
        <button
          onClick={() => void loadPatterns()}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
        >
          <RefreshCw className="size-4" />
          Recargar
        </button>
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

      <div className="rounded-lg border bg-white p-5">
        <h2 className="mb-1 text-2xl font-semibold">Criterios de Búsqueda</h2>
        <p className="text-muted-foreground mb-4">Filtrar patrones por nombre, código y estado</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Descripción</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full rounded-md border py-2 pl-9 pr-3 text-sm"
                placeholder="Buscar patrón..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Estado</label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | 'active' | 'inactive');
                setPage(1);
              }}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={openCreate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0074D9] px-4 py-2 text-sm text-white hover:bg-[#0066C0]"
            >
              <Plus className="size-4" />
              Nuevo Patrón
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h2 className="mb-4 text-2xl font-semibold">Listado de Patrones</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3 text-left">Nombre</th>
                <th className="py-2 pr-3 text-left">Código</th>
                <th className="py-2 pr-3 text-left">Ciclo</th>
                <th className="py-2 pr-3 text-left">Trabajo/Descanso</th>
                <th className="py-2 pr-3 text-left">Min Día</th>
                <th className="py-2 pr-3 text-left">Meta Semanal</th>
                <th className="py-2 pr-3 text-left">Flexible</th>
                <th className="py-2 pr-3 text-left">Estado</th>
                <th className="py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-gray-500">Cargando patrones...</td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-gray-500">No existen patrones</td>
                </tr>
              ) : (
                paged.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 pr-3">{row.pattern_name}</td>
                    <td className="py-3 pr-3"><span className="rounded-full border px-2 py-0.5 text-xs">{row.pattern_short_name}</span></td>
                    <td className="py-3 pr-3">{row.cycle_length_days} días</td>
                    <td className="py-3 pr-3">{row.work_days_per_cycle}/{row.rest_days_per_cycle}</td>
                    <td className="py-3 pr-3">{row.daily_work_minutes}</td>
                    <td className="py-3 pr-3">{row.weekly_work_minutes_target}</td>
                    <td className="py-3 pr-3">{row.is_flexible ? 'Sí' : 'No'}</td>
                    <td className="py-3 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs text-white ${row.is_active ? 'bg-green-600' : 'bg-gray-500'}`}>
                        {row.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(row)}
                          className="inline-flex items-center justify-center rounded border p-1.5 hover:bg-gray-100"
                          title="Editar"
                        >
                          <Edit className="size-4" />
                        </button>
                        <button
                          onClick={() => void removePattern(row)}
                          className="inline-flex items-center justify-center rounded border border-red-200 p-1.5 text-red-700 hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>Página {page} de {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              className="rounded border px-3 py-1.5 disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Anterior
            </button>
            <button
              className="rounded border px-3 py-1.5 disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative w-full max-w-3xl rounded-xl border bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h3 className="text-lg font-semibold">{form.id ? 'Editar Patrón' : 'Nuevo Patrón'}</h3>
              <button onClick={closeModal} className="rounded p-1.5 hover:bg-gray-100">
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2">
              {modalError && (
                <div className="md:col-span-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {modalError}
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Nombre del patrón</label>
                <input
                  value={form.pattern_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, pattern_name: event.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Código</label>
                <input
                  value={form.pattern_short_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, pattern_short_name: event.target.value.toUpperCase() }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Longitud del ciclo (días)</label>
                <input
                  type="number"
                  min={1}
                  value={form.cycle_length_days}
                  onChange={(event) => setForm((prev) => ({ ...prev, cycle_length_days: event.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Días trabajo por ciclo</label>
                <input
                  type="number"
                  min={0}
                  value={form.work_days_per_cycle}
                  onChange={(event) => setForm((prev) => ({ ...prev, work_days_per_cycle: event.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Días descanso por ciclo</label>
                <input
                  type="number"
                  min={0}
                  value={form.rest_days_per_cycle}
                  onChange={(event) => setForm((prev) => ({ ...prev, rest_days_per_cycle: event.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Minutos trabajo por día</label>
                <input
                  type="number"
                  min={0}
                  value={form.daily_work_minutes}
                  onChange={(event) => setForm((prev) => ({ ...prev, daily_work_minutes: event.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Meta semanal (minutos)</label>
                <input
                  type="number"
                  min={0}
                  value={form.weekly_work_minutes_target}
                  onChange={(event) => setForm((prev) => ({ ...prev, weekly_work_minutes_target: event.target.value }))}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_flexible}
                    onChange={(event) => setForm((prev) => ({ ...prev, is_flexible: event.target.checked }))}
                  />
                  Flexible
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                  />
                  Activo
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
              <button onClick={closeModal} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
              <button
                onClick={() => void savePattern()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-[#0074D9] px-4 py-2 text-sm text-white hover:bg-[#0066C0] disabled:opacity-50"
              >
                <Save className="size-4" />
                {saving ? 'Guardando...' : 'Guardar Patrón'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
