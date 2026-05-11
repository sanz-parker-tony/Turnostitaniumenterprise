'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Pencil, RefreshCw, X } from 'lucide-react';
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
  punch_key_lookup_id: string;
  time_punch_status_id: string;
  notes: string;
  is_active: boolean;
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
    const token =
      session?.access_token ||
      localStorage.getItem('tt-access-token') ||
      localStorage.getItem('access_token');
    if (!token) throw new Error('No hay sesion activa');

    const doFetch = async (bearer: string) => {
      const response = await fetch(`http://localhost:3001${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearer}`,
          ...(init?.headers || {}),
        },
      });
      const payload = await response.json().catch(() => ({}));
      return { response, payload };
    };

    let { response, payload } = await doFetch(token);
    if (response.status === 401 && session?.access_token && token !== session.access_token) {
      const retry = await doFetch(session.access_token);
      response = retry.response;
      payload = retry.payload;
    }
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

  const movementOptions = useMemo(() => {
    const items = context?.punch_keys || [];
    return [...items]
      .filter((item) => Number.isFinite(Number(item.punch_key_value)))
      .sort((a, b) => Number(a.punch_key_value) - Number(b.punch_key_value));
  }, [context]);

  const beginEdit = (row: HistoryRow) => {
    setEdit({
      rowId: row.id,
      punch_key_lookup_id:
        row.punch_key_lookup_id ||
        movementOptions.find((item) => Number(item.punch_key_value) === Number(row.punch_key))?.id ||
        '',
      time_punch_status_id: row.time_punch_status_id || '',
      notes: row.notes || '',
      is_active: Boolean(row.is_active),
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
          punch_key_lookup_id: edit.punch_key_lookup_id || null,
          time_punch_status_id: edit.time_punch_status_id || null,
          notes: edit.notes || null,
          is_active: edit.is_active,
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

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3 items-end justify-between">
            <div>
              <CardTitle className="text-2xl">Corregir marcación</CardTitle>
              <CardDescription>
                Puedes corregir únicamente el movimiento y el estado de la marcación; además puedes desactivarla.
              </CardDescription>
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
            <div className="overflow-hidden border rounded-lg">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="text-left px-2 py-2 w-[13%]">Fecha/Hora</th>
                    <th className="text-left px-2 py-2 w-[12%]">Empresa</th>
                    <th className="text-left px-2 py-2 w-[11%]">Dispositivo</th>
                    <th className="text-left px-2 py-2 w-[13%]">Movimiento</th>
                    <th className="text-left px-2 py-2 w-[8%]">Fuente</th>
                    <th className="text-left px-2 py-2 w-[11%]">Estado</th>
                    <th className="text-left px-2 py-2 w-[18%]">Notas</th>
                    <th className="text-center px-2 py-2 w-[3%]">Activo</th>
                    <th className="text-right px-2 py-2 w-[10%]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isEditing = edit?.rowId === row.id;
                    return (
                      <tr key={row.id} className="border-t align-top">
                        <td className="px-2 py-2 whitespace-nowrap text-xs">{new Date(row.punch_datetime).toLocaleString('es-EC')}</td>
                        <td className="px-2 py-2 truncate" title={row.company_name || '-'}>
                          {row.company_name || '-'}
                        </td>
                        <td className="px-2 py-2 truncate" title={row.device_name || '-'}>
                          {row.device_name || '-'}
                        </td>
                        <td className={`px-2 py-2 ${isEditing ? 'bg-amber-50' : ''}`}>
                          {isEditing ? (
                            <select
                              value={edit?.punch_key_lookup_id || ''}
                              onChange={(event) => setEdit((prev) => (prev ? { ...prev, punch_key_lookup_id: event.target.value } : prev))}
                              className="h-9 border rounded-md px-2 w-full bg-white"
                            >
                              <option value="">Seleccionar movimiento...</option>
                              {movementOptions.map((movement) => (
                                <option key={movement.id} value={movement.id}>
                                  {movement.lookup_label || movement.id} {typeof movement.punch_key_value === 'number' ? `(#${movement.punch_key_value})` : ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="truncate block" title={row.movement_label || `#${row.punch_key}`}>{row.movement_label || `#${row.punch_key}`}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <span className="truncate block" title={row.punch_source_label || '-'}>{row.punch_source_label || '-'}</span>
                        </td>
                        <td className={`px-2 py-2 ${isEditing ? 'bg-amber-50' : ''}`}>
                          {isEditing ? (
                            <select
                              value={edit?.time_punch_status_id || ''}
                              onChange={(event) => setEdit((prev) => (prev ? { ...prev, time_punch_status_id: event.target.value } : prev))}
                              className="h-9 border rounded-md px-2 w-full text-xs bg-white"
                            >
                              <option value="">Sin estado</option>
                              {context?.punch_statuses.map((status) => (
                                <option key={status.id} value={status.id}>
                                  {status.lookup_label || status.id}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="truncate block" title={row.time_punch_status_label || '-'}>{row.time_punch_status_label || '-'}</span>
                          )}
                        </td>
                        <td className={`px-2 py-2 ${isEditing ? 'bg-amber-50' : ''}`}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={edit?.notes || ''}
                              onChange={(event) =>
                                setEdit((prev) => (prev ? { ...prev, notes: event.target.value } : prev))
                              }
                              className="h-9 border rounded-md px-2 w-full bg-white"
                              placeholder="Notas"
                            />
                          ) : (
                            <span className="line-clamp-2 break-words" title={row.notes || '-'}>{row.notes || '-'}</span>
                          )}
                        </td>
                        <td className={`px-2 py-2 text-center ${isEditing ? 'bg-amber-50' : ''}`}>
                          {isEditing ? (
                            <label className="inline-flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={Boolean(edit?.is_active)}
                                onChange={(event) =>
                                  setEdit((prev) => (prev ? { ...prev, is_active: event.target.checked } : prev))
                                }
                                disabled={saving}
                              />
                            </label>
                          ) : row.is_active ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <X className="w-4 h-4 text-rose-600" />
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex justify-end gap-0.5 whitespace-nowrap">
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
