'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Pencil, RefreshCw, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/backend/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CatalogItem {
  id: string;
  justification_name?: string;
  attendance_event_id?: string | null;
  event_name?: string;
  lookup_label?: string;
  lookup_key?: string;
}

interface RequestRow {
  id: string;
  company_name: string | null;
  justification_type_id: string;
  justification_name: string | null;
  attendance_event_id: string;
  event_name: string | null;
  justify_method_id: string | null;
  justify_method_key: string | null;
  justify_method_label: string | null;
  start_datetime: string;
  end_datetime: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  request_status_id: string;
  request_status_key: string | null;
  request_status_label: string | null;
  approval_notes: string | null;
  approved_by: string | null;
  approved_by_display_name: string | null;
  approved_by_username: string | null;
  approved_at: string | null;
  is_active: boolean;
}

type EditState = {
  id: string;
  justification_type_id: string;
  attendance_event_id: string;
  justify_method_id: string;
  start_datetime: string;
  end_datetime: string;
  start_time: string;
  end_time: string;
  notes: string;
  is_active: boolean;
};

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function getDefaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

function isPendingStatus(statusKey: string | null | undefined, statusLabel: string | null | undefined): boolean {
  const key = String(statusKey || '').trim().toUpperCase();
  if (['PENDING', 'PENDIENTE', 'REQUESTED', 'SOLICITADO'].includes(key)) return true;
  const label = String(statusLabel || '').trim().toUpperCase();
  return label === 'PENDIENTE';
}

export default function KioskRequests() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [justifications, setJustifications] = useState<CatalogItem[]>([]);
  const [events, setEvents] = useState<CatalogItem[]>([]);
  const [statuses, setStatuses] = useState<CatalogItem[]>([]);
  const [discountMethods, setDiscountMethods] = useState<CatalogItem[]>([]);
  const [rows, setRows] = useState<RequestRow[]>([]);

  const [rangeFrom, setRangeFrom] = useState(getDefaultRange().from);
  const [rangeTo, setRangeTo] = useState(getDefaultRange().to);

  const [formJustificationId, setFormJustificationId] = useState('');
  const [formEventId, setFormEventId] = useState('');
  const [formDiscountMethodId, setFormDiscountMethodId] = useState('');
  const [formStartDateTime, setFormStartDateTime] = useState('');
  const [formEndDateTime, setFormEndDateTime] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const [edit, setEdit] = useState<EditState | null>(null);

  const request = async (path: string, init?: RequestInit) => {
    const api = createClient();
    const { data: { session } } = await api.auth.getSession();
    const token = session?.access_token || localStorage.getItem('tt-access-token');
    if (!token) throw new Error('No hay sesión activa');

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

  const loadCatalogs = async () => {
    const payload = await request('/kiosk/requests/catalogs');
    const nextJustifications = (payload?.justification_types || []) as CatalogItem[];
    const nextEvents = (payload?.attendance_events || []) as CatalogItem[];
    const nextStatuses = (payload?.request_statuses || []) as CatalogItem[];
    const nextDiscountMethods = (payload?.discount_methods || payload?.transaction_types || []) as CatalogItem[];

    setJustifications(nextJustifications);
    setEvents(nextEvents);
    setStatuses(nextStatuses);
    setDiscountMethods(nextDiscountMethods);

    if (!formJustificationId && nextJustifications[0]?.id) {
      setFormJustificationId(nextJustifications[0].id);
      setFormEventId(nextJustifications[0].attendance_event_id || nextEvents[0]?.id || '');
    }
    if (!formEventId && nextEvents[0]?.id) setFormEventId(nextEvents[0].id);
    if (!formDiscountMethodId && nextDiscountMethods[0]?.id) {
      setFormDiscountMethodId(nextDiscountMethods[0].id);
    }
  };

  const loadRows = async () => {
    const qs = new URLSearchParams();
    if (rangeFrom) qs.set('from', rangeFrom);
    if (rangeTo) qs.set('to', rangeTo);
    const payload = await request(`/kiosk/requests?${qs.toString()}`);
    setRows((payload?.requests || []) as RequestRow[]);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadCatalogs(), loadRows()]);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshRows = async () => {
    setRefreshing(true);
    try {
      await loadRows();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo refrescar solicitudes');
    } finally {
      setRefreshing(false);
    }
  };

  const statusLabelById = useMemo(() => {
    const map = new Map<string, string>();
    statuses.forEach((status) => {
      if (status.id) map.set(status.id, status.lookup_label || status.lookup_key || status.id);
    });
    return map;
  }, [statuses]);

  const discountMethodLabelById = useMemo(() => {
    const map = new Map<string, string>();
    discountMethods.forEach((item) => {
      if (item.id) map.set(item.id, item.lookup_label || item.lookup_key || item.id);
    });
    return map;
  }, [discountMethods]);

  const onChangeFormJustification = (value: string) => {
    setFormJustificationId(value);
    const just = justifications.find((item) => item.id === value);
    if (just?.attendance_event_id) setFormEventId(just.attendance_event_id);
  };

  const submitCreate = async () => {
    if (!formJustificationId) return toast.error('Selecciona tipo de justificación');
    if (!formEventId) return toast.error('Selecciona evento de asistencia');
    if (!formDiscountMethodId) return toast.error('Selecciona método de descuento');
    if (!formStartDateTime) return toast.error('Selecciona fecha/hora de inicio');
    if (!formEndDateTime) return toast.error('Selecciona fecha/hora de fin');

    setSaving(true);
    try {
      await request('/kiosk/requests', {
        method: 'POST',
        body: JSON.stringify({
          justification_type_id: formJustificationId,
          attendance_event_id: formEventId,
          justify_method_id: formDiscountMethodId,
          start_datetime: new Date(formStartDateTime).toISOString(),
          end_datetime: new Date(formEndDateTime).toISOString(),
          start_time: formStartTime || null,
          end_time: formEndTime || null,
          notes: formNotes || null,
        }),
      });
      toast.success('Solicitud registrada');
      setFormNotes('');
      await loadRows();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo crear la solicitud');
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (row: RequestRow) => {
    setEdit({
      id: row.id,
      justification_type_id: row.justification_type_id,
      attendance_event_id: row.attendance_event_id,
      justify_method_id: row.justify_method_id || '',
      start_datetime: toDateTimeLocal(row.start_datetime),
      end_datetime: toDateTimeLocal(row.end_datetime),
      start_time: row.start_time || '',
      end_time: row.end_time || '',
      notes: row.notes || '',
      is_active: row.is_active,
    });
  };

  const saveEdit = async () => {
    if (!edit) return;
    if (!edit.justify_method_id) return toast.error('Selecciona método de descuento');

    setSaving(true);
    try {
      await request(`/kiosk/requests/${edit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          justification_type_id: edit.justification_type_id,
          attendance_event_id: edit.attendance_event_id,
          justify_method_id: edit.justify_method_id,
          start_datetime: edit.start_datetime ? new Date(edit.start_datetime).toISOString() : null,
          end_datetime: edit.end_datetime ? new Date(edit.end_datetime).toISOString() : null,
          start_time: edit.start_time || null,
          end_time: edit.end_time || null,
          notes: edit.notes || null,
          is_active: edit.is_active,
        }),
      });
      toast.success('Solicitud actualizada');
      setEdit(null);
      await loadRows();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo actualizar la solicitud');
    } finally {
      setSaving(false);
    }
  };

  const cancelRequest = async (row: RequestRow) => {
    if (!window.confirm('¿Confirmas cancelar esta solicitud?')) return;
    setSaving(true);
    try {
      await request(`/kiosk/requests/${row.id}/cancel`, { method: 'PATCH' });
      toast.success('Solicitud cancelada');
      await loadRows();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cancelar la solicitud');
    } finally {
      setSaving(false);
    }
  };

  const deleteRequest = async (row: RequestRow) => {
    if (!window.confirm('¿Confirmas eliminar esta solicitud?')) return;
    setSaving(true);
    try {
      await request(`/kiosk/requests/${row.id}`, { method: 'DELETE' });
      toast.success('Solicitud eliminada');
      await loadRows();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo eliminar la solicitud');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Solicitudes</CardTitle>
          <CardDescription>
            Justifica ausencias parciales o totales por eventos específicos (atrasos, faltas, salidas anticipadas),
            indicando tipo de transacción: cargo a vacaciones, permiso con sueldo o permiso sin sueldo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <label className="text-sm space-y-1">
              <span className="block text-slate-700">Tipo de justificación</span>
              <select
                value={formJustificationId}
                onChange={(event) => onChangeFormJustification(event.target.value)}
                className="h-10 border rounded-md px-3 w-full"
              >
                <option value="">Seleccionar...</option>
                {justifications.map((item) => (
                  <option key={item.id} value={item.id}>{item.justification_name || item.id}</option>
                ))}
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="block text-slate-700">Evento de asistencia</span>
              <select
                value={formEventId}
                onChange={(event) => setFormEventId(event.target.value)}
                className="h-10 border rounded-md px-3 w-full"
              >
                <option value="">Seleccionar...</option>
                {events.map((item) => (
                  <option key={item.id} value={item.id}>{item.event_name || item.id}</option>
                ))}
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="block text-slate-700">Método de Descuento</span>
              <select
                value={formDiscountMethodId}
                onChange={(event) => setFormDiscountMethodId(event.target.value)}
                className="h-10 border rounded-md px-3 w-full"
              >
                <option value="">Seleccionar...</option>
                {discountMethods.map((item) => (
                  <option key={item.id} value={item.id}>{item.lookup_label || item.lookup_key || item.id}</option>
                ))}
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="block text-slate-700">Desde</span>
              <input
                type="datetime-local"
                value={formStartDateTime}
                onChange={(event) => setFormStartDateTime(event.target.value)}
                className="h-10 border rounded-md px-3 w-full"
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="block text-slate-700">Hasta</span>
              <input
                type="datetime-local"
                value={formEndDateTime}
                onChange={(event) => setFormEndDateTime(event.target.value)}
                className="h-10 border rounded-md px-3 w-full"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm space-y-1">
                <span className="block text-slate-700">Hora inicio</span>
                <input
                  type="time"
                  value={formStartTime}
                  onChange={(event) => setFormStartTime(event.target.value)}
                  className="h-10 border rounded-md px-3 w-full"
                />
              </label>
              <label className="text-sm space-y-1">
                <span className="block text-slate-700">Hora fin</span>
                <input
                  type="time"
                  value={formEndTime}
                  onChange={(event) => setFormEndTime(event.target.value)}
                  className="h-10 border rounded-md px-3 w-full"
                />
              </label>
            </div>
            <label className="text-sm space-y-1 md:col-span-2 lg:col-span-3">
              <span className="block text-slate-700">Notas</span>
              <textarea
                value={formNotes}
                onChange={(event) => setFormNotes(event.target.value)}
                className="border rounded-md px-3 py-2 w-full min-h-[80px]"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => void submitCreate()} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Crear Solicitud
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>Mis Solicitudes</CardTitle>
              <CardDescription>Consulta, edita o cancela solicitudes registradas.</CardDescription>
            </div>
            <div className="flex items-end gap-2">
              <label className="text-sm space-y-1">
                <span className="block text-slate-700">Desde</span>
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="h-10 border rounded-md px-3"
                />
              </label>
              <label className="text-sm space-y-1">
                <span className="block text-slate-700">Hasta</span>
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="h-10 border rounded-md px-3"
                />
              </label>
              <Button onClick={() => void refreshRows()} disabled={refreshing || saving}>
                {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Consultar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-14 flex justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-600 py-8 text-center">No hay solicitudes en el rango seleccionado.</p>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="text-left px-3 py-2">Desde</th>
                    <th className="text-left px-3 py-2">Hasta</th>
                    <th className="text-left px-3 py-2">Justificación</th>
                    <th className="text-left px-3 py-2">Evento</th>
                    <th className="text-left px-3 py-2">Método de descuento</th>
                    <th className="text-left px-3 py-2">Estado</th>
                    <th className="text-left px-3 py-2">Trazabilidad</th>
                    <th className="text-left px-3 py-2">Notas</th>
                    <th className="text-left px-3 py-2">Activo</th>
                    <th className="text-right px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isEditing = edit?.id === row.id;
                    const canModify = isPendingStatus(row.request_status_key, row.request_status_label);
                    return (
                      <tr key={row.id} className="border-t align-top">
                        <td className="px-3 py-2 min-w-[180px]">
                          {isEditing ? (
                            <input
                              type="datetime-local"
                              value={edit?.start_datetime || ''}
                              onChange={(e) => setEdit((prev) => (prev ? { ...prev, start_datetime: e.target.value } : prev))}
                              className="h-9 border rounded-md px-2 w-full"
                            />
                          ) : new Date(row.start_datetime).toLocaleString('es-EC')}
                        </td>
                        <td className="px-3 py-2 min-w-[180px]">
                          {isEditing ? (
                            <input
                              type="datetime-local"
                              value={edit?.end_datetime || ''}
                              onChange={(e) => setEdit((prev) => (prev ? { ...prev, end_datetime: e.target.value } : prev))}
                              className="h-9 border rounded-md px-2 w-full"
                            />
                          ) : new Date(row.end_datetime).toLocaleString('es-EC')}
                        </td>
                        <td className="px-3 py-2 min-w-[220px]">
                          {isEditing ? (
                            <select
                              value={edit?.justification_type_id || ''}
                              onChange={(e) => setEdit((prev) => (prev ? { ...prev, justification_type_id: e.target.value } : prev))}
                              className="h-9 border rounded-md px-2 w-full"
                            >
                              {justifications.map((item) => (
                                <option key={item.id} value={item.id}>{item.justification_name || item.id}</option>
                              ))}
                            </select>
                          ) : row.justification_name || '-'}
                        </td>
                        <td className="px-3 py-2 min-w-[220px]">
                          {isEditing ? (
                            <select
                              value={edit?.attendance_event_id || ''}
                              onChange={(e) => setEdit((prev) => (prev ? { ...prev, attendance_event_id: e.target.value } : prev))}
                              className="h-9 border rounded-md px-2 w-full"
                            >
                              {events.map((item) => (
                                <option key={item.id} value={item.id}>{item.event_name || item.id}</option>
                              ))}
                            </select>
                          ) : row.event_name || '-'}
                        </td>
                        <td className="px-3 py-2 min-w-[220px]">
                          {isEditing ? (
                            <select
                              value={edit?.justify_method_id || ''}
                              onChange={(e) => setEdit((prev) => (prev ? { ...prev, justify_method_id: e.target.value } : prev))}
                              className="h-9 border rounded-md px-2 w-full"
                            >
                              <option value="">Seleccionar...</option>
                              {discountMethods.map((item) => (
                                <option key={item.id} value={item.id}>{item.lookup_label || item.lookup_key || item.id}</option>
                              ))}
                            </select>
                          ) : (
                            row.justify_method_label ||
                            (row.justify_method_id ? discountMethodLabelById.get(row.justify_method_id) : null) ||
                            row.justify_method_key ||
                            '-'
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.request_status_label || statusLabelById.get(row.request_status_id) || row.request_status_key || '-'}
                        </td>
                        <td className="px-3 py-2 min-w-[260px] text-xs text-slate-600">
                          {row.approved_at ? (
                            <div className="space-y-1">
                              <div>
                                Revisado por:{' '}
                                <span className="font-medium text-slate-800">
                                  {row.approved_by_display_name || row.approved_by_username || row.approved_by || '-'}
                                </span>
                              </div>
                              <div>
                                Fecha: <span className="font-medium text-slate-800">{new Date(row.approved_at).toLocaleString('es-EC')}</span>
                              </div>
                              <div>
                                Observación: <span className="font-medium text-slate-800">{row.approval_notes || '-'}</span>
                              </div>
                            </div>
                          ) : (
                            <span>-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 min-w-[220px]">
                          {isEditing ? (
                            <input
                              value={edit?.notes || ''}
                              onChange={(e) => setEdit((prev) => (prev ? { ...prev, notes: e.target.value } : prev))}
                              className="h-9 border rounded-md px-2 w-full"
                            />
                          ) : row.notes || '-'}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <label className="inline-flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={Boolean(edit?.is_active)}
                                onChange={(e) => setEdit((prev) => (prev ? { ...prev, is_active: e.target.checked } : prev))}
                              />
                              Activo
                            </label>
                          ) : row.is_active ? 'Sí' : 'No'}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1">
                            {isEditing ? (
                              <>
                                <Button size="icon" variant="ghost" onClick={() => void saveEdit()} disabled={saving}>
                                  <Check className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => setEdit(null)} disabled={saving}>
                                  <X className="w-4 h-4 text-slate-600" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => beginEdit(row)}
                                disabled={saving || !canModify}
                                title={canModify ? 'Editar solicitud' : 'Solo solicitudes pendientes pueden editarse'}
                              >
                                <Pencil className="w-4 h-4 text-blue-600" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => void cancelRequest(row)}
                              disabled={saving || !canModify}
                              title={canModify ? 'Cancelar solicitud' : 'Solo solicitudes pendientes pueden cancelarse'}
                            >
                              <X className="w-4 h-4 text-amber-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => void deleteRequest(row)}
                              disabled={saving || !canModify}
                              title={canModify ? 'Eliminar solicitud' : 'Solo solicitudes pendientes pueden eliminarse'}
                            >
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
