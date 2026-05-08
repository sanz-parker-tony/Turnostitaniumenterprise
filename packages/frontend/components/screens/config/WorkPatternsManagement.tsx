'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Edit, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
import { publicApiToken } from '../../../utils/backend/info';

interface WorkPatternShiftRow {
  id?: string;
  shift_id: string;
  sequence_number: number;
  cycle_day_number: number;
  shift_name?: string;
  shift_short_name?: string;
  is_active?: boolean;
}

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
  pattern_shifts?: WorkPatternShiftRow[];
}

interface ShiftCatalogRow {
  id: string;
  shift_name: string;
  shift_short_name: string;
  is_active: boolean;
}

interface WorkPatternShiftFormRow {
  shift_id: string;
  cycle_day_number: string;
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
  pattern_shifts: WorkPatternShiftFormRow[];
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
    pattern_shifts: [],
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
  const [shiftCatalog, setShiftCatalog] = useState<ShiftCatalogRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<WorkPatternFormState>(makeEmptyForm());
  const [newShiftId, setNewShiftId] = useState('');

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
      setShiftCatalog((payload?.shift_catalog || []) as ShiftCatalogRow[]);
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

  const shiftById = useMemo(() => {
    const map = new Map<string, ShiftCatalogRow>();
    shiftCatalog.forEach((shift) => map.set(shift.id, shift));
    return map;
  }, [shiftCatalog]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const availableShifts = useMemo(() => {
    return shiftCatalog;
  }, [shiftCatalog]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const openCreate = () => {
    setForm(makeEmptyForm());
    setNewShiftId('');
    setModalOpen(true);
    setModalError(null);
  };

  const openEdit = (row: WorkPatternRow) => {
    const sortedShifts = [...(row.pattern_shifts || [])]
      .sort((a, b) => (a.sequence_number || 0) - (b.sequence_number || 0))
      .map((item, index) => ({
        shift_id: item.shift_id,
        cycle_day_number: String(item.cycle_day_number || index + 1),
      }));

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
      pattern_shifts: sortedShifts,
    });
    setNewShiftId('');
    setModalOpen(true);
    setModalError(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSaving(false);
    setModalError(null);
  };

  const addShiftSequence = () => {
    const shiftId = String(newShiftId || '').trim();
    if (!shiftId) return;

    setForm((prev) => ({
      ...prev,
      pattern_shifts: [
        ...prev.pattern_shifts,
        {
          shift_id: shiftId,
          cycle_day_number: String(prev.pattern_shifts.length + 1),
        },
      ],
    }));
    setNewShiftId('');
  };

  const removeShiftSequence = (index: number) => {
    setForm((prev) => ({
      ...prev,
      pattern_shifts: prev.pattern_shifts.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const moveShiftSequence = (index: number, direction: 'up' | 'down') => {
    setForm((prev) => {
      const list = [...prev.pattern_shifts];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const current = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = current;
      return { ...prev, pattern_shifts: list };
    });
  };

  const updateShiftCycleDay = (index: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      pattern_shifts: prev.pattern_shifts.map((item, currentIndex) =>
        currentIndex === index ? { ...item, cycle_day_number: value } : item
      ),
    }));
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
    const cycleLength = toInt(form.cycle_length_days);
    const workDays = toInt(form.work_days_per_cycle);
    const restDays = toInt(form.rest_days_per_cycle);

    const sequencePayload = form.pattern_shifts.map((item, index) => ({
      shift_id: item.shift_id,
      sequence_number: index + 1,
      cycle_day_number: toInt(item.cycle_day_number),
      is_active: true,
    }));

    const payload = {
      pattern_name: form.pattern_name.trim(),
      pattern_short_name: form.pattern_short_name.trim().toUpperCase(),
      cycle_length_days: cycleLength,
      work_days_per_cycle: workDays,
      rest_days_per_cycle: restDays,
      daily_work_minutes: toInt(form.daily_work_minutes),
      weekly_work_minutes_target: toInt(form.weekly_work_minutes_target),
      is_flexible: form.is_flexible,
      is_active: form.is_active,
      pattern_shifts: sequencePayload,
    };

    if (!payload.pattern_name || !payload.pattern_short_name) {
      setModalError('Debe ingresar nombre y código del patrón.');
      return;
    }

    if (payload.cycle_length_days !== payload.work_days_per_cycle + payload.rest_days_per_cycle) {
      setModalError('Ciclo debe ser igual a días trabajo + días descanso.');
      return;
    }

    if (payload.pattern_shifts.length === 0) {
      setModalError('Debe agregar al menos un turno a la secuencia del patrón.');
      return;
    }

    const usedCycleDays = new Set<number>();
    for (let index = 0; index < payload.pattern_shifts.length; index += 1) {
      const row = payload.pattern_shifts[index];
      if (!row.shift_id) {
        setModalError(`Debe seleccionar turno en la secuencia #${index + 1}.`);
        return;
      }
      if (row.cycle_day_number <= 0) {
        setModalError(`El día de ciclo en la secuencia #${index + 1} debe ser mayor a 0.`);
        return;
      }
      if (row.cycle_day_number > payload.cycle_length_days) {
        setModalError(`El día de ciclo ${row.cycle_day_number} excede la longitud del ciclo (${payload.cycle_length_days}).`);
        return;
      }
      if (usedCycleDays.has(row.cycle_day_number)) {
        setModalError(`El día de ciclo ${row.cycle_day_number} está repetido.`);
        return;
      }
      usedCycleDays.add(row.cycle_day_number);
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
                <th className="py-2 pr-3 text-left">Secuencia</th>
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
                  <td colSpan={10} className="py-6 text-center text-gray-500">Cargando patrones...</td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-gray-500">No existen patrones</td>
                </tr>
              ) : (
                paged.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 pr-3">{row.pattern_name}</td>
                    <td className="py-3 pr-3"><span className="rounded-full border px-2 py-0.5 text-xs">{row.pattern_short_name}</span></td>
                    <td className="py-3 pr-3">{row.cycle_length_days} días</td>
                    <td className="py-3 pr-3">{row.work_days_per_cycle}/{row.rest_days_per_cycle}</td>
                    <td className="py-3 pr-3">{row.pattern_shifts?.length || 0} turnos</td>
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
          <div className="relative max-h-[92vh] w-full max-w-5xl overflow-auto rounded-xl border bg-white shadow-2xl">
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

              <div className="md:col-span-2 rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-semibold">Secuencia de turnos</h4>
                    <p className="text-xs text-gray-600">Relación padre-hijo del patrón con los turnos del ciclo.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {form.pattern_shifts.length === 0 ? (
                    <div className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-gray-500">
                      No hay turnos agregados en la secuencia.
                    </div>
                  ) : (
                    form.pattern_shifts.map((item, index) => {
                      const shift = shiftById.get(item.shift_id);
                      const label = shift ? `${shift.shift_name} (${shift.shift_short_name})` : item.shift_id;
                      return (
                        <div key={`${item.shift_id}-${index}`} className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">#{index + 1}</span>
                          <div className="min-w-[260px] flex-1 text-sm">{label}</div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">Día ciclo</label>
                            <input
                              type="number"
                              min={1}
                              className="w-20 rounded-md border px-2 py-1.5 text-sm"
                              value={item.cycle_day_number}
                              onChange={(event) => updateShiftCycleDay(index, event.target.value)}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => moveShiftSequence(index, 'up')}
                            disabled={index === 0}
                            className="inline-flex items-center justify-center rounded border p-1.5 text-gray-600 disabled:opacity-40"
                            title="Mover arriba"
                          >
                            <ArrowUp className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveShiftSequence(index, 'down')}
                            disabled={index === form.pattern_shifts.length - 1}
                            className="inline-flex items-center justify-center rounded border p-1.5 text-gray-600 disabled:opacity-40"
                            title="Mover abajo"
                          >
                            <ArrowDown className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeShiftSequence(index)}
                            className="inline-flex items-center justify-center rounded border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                            title="Quitar turno"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={newShiftId}
                    onChange={(event) => setNewShiftId(event.target.value)}
                    className="min-w-[280px] flex-1 rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar turno...</option>
                    {availableShifts.map((shift) => (
                      <option key={shift.id} value={shift.id}>
                        {shift.shift_name} ({shift.shift_short_name})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addShiftSequence}
                    disabled={!newShiftId}
                    className="inline-flex items-center gap-2 rounded-md border border-green-200 px-3 py-2 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
                  >
                    <Plus className="size-4" />
                    Agregar turno
                  </button>
                </div>
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
