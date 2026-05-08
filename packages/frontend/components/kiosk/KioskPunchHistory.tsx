'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Pencil, Power, PowerOff, RefreshCw, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/backend/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LookupOption {
  id: string;
  lookup_label?: string;
  punch_key_value?: number;
  company_id?: string | null;
  device_name?: string | null;
  device_serial_number?: string | null;
}

interface HistoryRow {
  id: string;
  company_id: string | null;
  company_name: string | null;
  time_clock_device_id: string | null;
  device_name: string | null;
  device_serial_number: string | null;
  punch_datetime: string;
  punch_key: number;
  punch_key_lookup_id: string | null;
  movement_label: string | null;
  punch_source_id: string | null;
  punch_source_label: string | null;
  time_punch_status_id: string | null;
  time_punch_status_label: string | null;
  notes: string | null;
  is_active: boolean;
}

interface ContextPayload {
  employee: {
    company_id: string | null;
  };
  devices: LookupOption[];
  punch_keys: LookupOption[];
  punch_sources: LookupOption[];
  punch_statuses: LookupOption[];
}

type EditState = {
  rowId: string;
  notes: string;
  punch_key_lookup_id: string;
  punch_source_id: string;
  time_punch_status_id: string;
  time_clock_device_id: string;
};

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 6);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

export default function KioskPunchHistory() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [context, setContext] = useState<ContextPayload | null>(null);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [rangeFrom, setRangeFrom] = useState(getDefaultRange().from);
  const [rangeTo, setRangeTo] = useState(getDefaultRange().to);
  const [edit, setEdit] = useState<EditState | null>(null);

  const request = async (path: string, init?: RequestInit) => {
    const api = createClient();
    const { data: { session } } = await api.auth.getSession();
    const token = session?.access_token || localStorage.getItem('tt-access-token');
    if (!token) throw new Error('No hay sesion activa');

    const response = await fetch(`http://localhost:3001${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
    return payload;
  };

  const loadContext = async () => {
    const payload = (await request('/kiosk/mark/context')) as ContextPayload;
    setContext(payload);
  };

  const loadHistory = async () => {
    const qs = new URLSearchParams();
    if (rangeFrom) qs.set('from', rangeFrom);
    if (rangeTo) qs.set('to', rangeTo);
    const payload = await request(`/kiosk/mark/history?${qs.toString()}`);
    setRows((payload?.punches || []) as HistoryRow[]);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadContext(), loadHistory()]);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cargar historial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const devicesForEdit = useMemo(() => {
    if (!context || !edit) return [];
    const row = rows.find((item) => item.id === edit.rowId);
    if (!row?.company_id) return context.devices;
    return context.devices.filter((d) => !d.company_id || d.company_id === row.company_id);
  }, [context, edit, rows]);

  const movementOptions = useMemo(() => {
    const items = context?.punch_keys || [];
    return [...items]
      .filter((item) => Number.isFinite(Number(item.punch_key_value)))
      .sort((a, b) => Number(a.punch_key_value) - Number(b.punch_key_value));
  }, [context]);

  const beginEdit = (row: HistoryRow) => {
    setEdit({
      rowId: row.id,
      notes: row.notes || '',
      punch_key_lookup_id:
        row.punch_key_lookup_id ||
        movementOptions.find((item) => Number(item.punch_key_value) === Number(row.punch_key))?.id ||
        '',
      punch_source_id: row.punch_source_id || '',
      time_punch_status_id: row.time_punch_status_id || '',
      time_clock_device_id: row.time_clock_device_id || '',
    });
  };

  const cancelEdit = () => setEdit(null);

  const saveEdit = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      await request(`/kiosk/mark/history/${edit.rowId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          notes: edit.notes || null,
          punch_key_lookup_id: edit.punch_key_lookup_id || null,
          punch_source_id: edit.punch_source_id || null,
          time_punch_status_id: edit.time_punch_status_id || null,
          time_clock_device_id: edit.time_clock_device_id || null,
        }),
      });
      toast.success('Marcacion actualizada');
      setEdit(null);
      await loadHistory();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: HistoryRow) => {
    setSaving(true);
    try {
      await request(`/kiosk/mark/history/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !row.is_active }),
      });
      toast.success(`Marcacion ${row.is_active ? 'desactivada' : 'activada'}`);
      await loadHistory();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cambiar estado');
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (row: HistoryRow) => {
    if (!window.confirm('Confirma eliminar esta marcacion?')) return;
    setSaving(true);
    try {
      await request(`/kiosk/mark/history/${row.id}`, { method: 'DELETE' });
      toast.success('Marcacion eliminada');
      await loadHistory();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo eliminar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3 items-end justify-between">
            <div>
              <CardTitle className="text-2xl">Asistencia</CardTitle>
              <CardDescription>Historial personal de marcaciones (intervalo desde/hasta).</CardDescription>
            </div>
            <div className="flex items-end gap-2">
              <label className="text-sm space-y-1">
                <span className="block text-slate-700">Desde</span>
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(event) => setRangeFrom(event.target.value)}
                  className="h-10 border rounded-md px-3"
                />
              </label>
              <label className="text-sm space-y-1">
                <span className="block text-slate-700">Hasta</span>
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(event) => setRangeTo(event.target.value)}
                  className="h-10 border rounded-md px-3"
                />
              </label>
              <Button onClick={() => void loadHistory()} disabled={loading || saving}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Consultar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-600 py-8 text-center">No existen marcaciones para el rango seleccionado.</p>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="text-left px-3 py-2">Fecha/Hora</th>
                    <th className="text-left px-3 py-2">Empresa</th>
                    <th className="text-left px-3 py-2">Dispositivo</th>
                    <th className="text-left px-3 py-2">Movimiento</th>
                    <th className="text-left px-3 py-2">Fuente</th>
                    <th className="text-left px-3 py-2">Estado</th>
                    <th className="text-left px-3 py-2">Notas</th>
                    <th className="text-left px-3 py-2">Activo</th>
                    <th className="text-right px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isEditing = edit?.rowId === row.id;
                    return (
                      <tr key={row.id} className="border-t align-top">
                        <td className="px-3 py-2 whitespace-nowrap">{new Date(row.punch_datetime).toLocaleString('es-EC')}</td>
                        <td className="px-3 py-2">{row.company_name || '-'}</td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <select
                              value={edit?.time_clock_device_id || ''}
                              onChange={(event) => setEdit((prev) => (prev ? { ...prev, time_clock_device_id: event.target.value } : prev))}
                              className="h-9 border rounded-md px-2 min-w-[180px]"
                            >
                              <option value="">Sin dispositivo</option>
                              {devicesForEdit.map((device) => (
                                <option key={device.id} value={device.id}>
                                  {device.device_name || 'Dispositivo'} {device.device_serial_number ? `(${device.device_serial_number})` : ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span>{row.device_name || '-'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <select
                              value={edit?.punch_key_lookup_id || ''}
                              onChange={(event) => setEdit((prev) => (prev ? { ...prev, punch_key_lookup_id: event.target.value } : prev))}
                              className="h-9 border rounded-md px-2 min-w-[180px]"
                            >
                              <option value="">Seleccionar movimiento...</option>
                              {movementOptions.map((movement) => (
                                <option key={movement.id} value={movement.id}>
                                  {movement.lookup_label || movement.id} {typeof movement.punch_key_value === 'number' ? `(#${movement.punch_key_value})` : ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span>{row.movement_label || `#${row.punch_key}`}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <select
                              value={edit?.punch_source_id || ''}
                              onChange={(event) => setEdit((prev) => (prev ? { ...prev, punch_source_id: event.target.value } : prev))}
                              className="h-9 border rounded-md px-2 min-w-[160px]"
                            >
                              <option value="">Sin fuente</option>
                              {context?.punch_sources.map((source) => (
                                <option key={source.id} value={source.id}>
                                  {source.lookup_label || source.id}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span>{row.punch_source_label || '-'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <select
                              value={edit?.time_punch_status_id || ''}
                              onChange={(event) => setEdit((prev) => (prev ? { ...prev, time_punch_status_id: event.target.value } : prev))}
                              className="h-9 border rounded-md px-2 min-w-[160px]"
                            >
                              <option value="">Sin estado</option>
                              {context?.punch_statuses.map((status) => (
                                <option key={status.id} value={status.id}>
                                  {status.lookup_label || status.id}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span>{row.time_punch_status_label || '-'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 min-w-[200px]">
                          {isEditing ? (
                            <input
                              value={edit?.notes || ''}
                              onChange={(event) => setEdit((prev) => (prev ? { ...prev, notes: event.target.value } : prev))}
                              className="w-full h-9 border rounded-md px-2"
                              placeholder="Notas"
                            />
                          ) : (
                            <span>{row.notes || '-'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{row.is_active ? 'Si' : 'No'}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1">
                            {isEditing ? (
                              <>
                                <Button size="icon" variant="ghost" onClick={() => void saveEdit()} disabled={saving}>
                                  <Check className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={cancelEdit} disabled={saving}>
                                  <X className="w-4 h-4 text-slate-600" />
                                </Button>
                              </>
                            ) : (
                              <Button size="icon" variant="ghost" onClick={() => beginEdit(row)} disabled={saving}>
                                <Pencil className="w-4 h-4 text-blue-600" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" onClick={() => void toggleActive(row)} disabled={saving}>
                              {row.is_active ? (
                                <PowerOff className="w-4 h-4 text-amber-600" />
                              ) : (
                                <Power className="w-4 h-4 text-green-600" />
                              )}
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => void deleteRow(row)} disabled={saving}>
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
