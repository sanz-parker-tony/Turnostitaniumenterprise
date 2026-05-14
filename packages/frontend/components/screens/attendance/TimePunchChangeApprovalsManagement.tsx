'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Paperclip, Search, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/backend/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LookupItem {
  id: string;
  lookup_key: string;
  lookup_label: string;
  sort_order?: number | null;
}

type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'ALL';

interface Row {
  id: string;
  company_name: string | null;
  employee_code: string | null;
  employee_name: string | null;
  employee_lastname: string | null;
  request_type_key: string | null;
  request_type_label: string | null;
  reason: string | null;
  current_values: Record<string, any> | null;
  requested_values: Record<string, any> | null;
  request_status_key: string | null;
  request_status_label: string | null;
  supervisor_notes: string | null;
  support_document_name: string | null;
  approved_by_display_name: string | null;
  approved_by_username: string | null;
  approved_at: string | null;
  created_at: string | null;
}

function normalizeStatus(statusKey: string | null | undefined): string {
  return String(statusKey || '').trim().toUpperCase();
}

function isPendingStatus(statusKey: string | null | undefined): boolean {
  const key = normalizeStatus(statusKey);
  return ['PENDING', 'PENDIENTE', 'IN_REVIEW', 'EN_REVISION', 'REQUESTED', 'SOLICITADO'].includes(key);
}

function statusBadgeClass(statusKey: string | null | undefined): string {
  const key = normalizeStatus(statusKey);
  if (['APPROVED', 'APROBADO'].includes(key)) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (['REJECTED', 'RECHAZADO', 'DENEGADO'].includes(key)) return 'bg-rose-100 text-rose-700 border-rose-200';
  if (['CANCELLED', 'CANCELED', 'CANCELADO'].includes(key)) return 'bg-slate-200 text-slate-700 border-slate-300';
  return 'bg-amber-100 text-amber-700 border-amber-200';
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return date.toLocaleString('es-EC');
}

export default function TimePunchChangeApprovalsManagement() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [punchKeys, setPunchKeys] = useState<LookupItem[]>([]);

  const request = async (path: string, init?: RequestInit) => {
    const api = createClient();
    const {
      data: { session },
    } = await api.auth.getSession();
    const token =
      session?.access_token ||
      localStorage.getItem('tt-access-token') ||
      localStorage.getItem('access_token');
    if (!token) throw new Error('No hay sesion activa');

    const response = await fetch(`http://localhost:3001/kiosk${path}`, {
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
    const payload = await request('/time-punch-requests/approvals/catalogs');
    setPunchKeys((payload?.punch_keys || []) as LookupItem[]);
  };

  const loadRows = async () => {
    const payload = await request(`/time-punch-requests/approvals?status=${status}`);
    const nextRows = (payload?.requests || []) as Row[];
    setRows(nextRows);
    setNotesById((prev) => {
      const copy = { ...prev };
      for (const row of nextRows) {
        if (copy[row.id] === undefined) copy[row.id] = row.supervisor_notes || '';
      }
      return copy;
    });
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadCatalogs(), loadRows()]);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cargar solicitudes de marcacion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading) return;
    void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadCatalogs(), loadRows()]);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo refrescar');
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const fullName = `${row.employee_name || ''} ${row.employee_lastname || ''}`.toLowerCase();
      return (
        fullName.includes(q) ||
        String(row.employee_code || '').toLowerCase().includes(q) ||
        String(row.company_name || '').toLowerCase().includes(q) ||
        String(row.reason || '').toLowerCase().includes(q) ||
        String(row.request_type_label || '').toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  const punchLabelByValue = useMemo(() => {
    const map = new Map<number, string>();
    for (const row of punchKeys) {
      if (!Number.isFinite(Number(row.sort_order))) continue;
      map.set(Math.trunc(Number(row.sort_order)), row.lookup_label || row.lookup_key);
    }
    return map;
  }, [punchKeys]);

  const openSupportDocument = async (row: Row) => {
    if (!row.support_document_name) return;
    try {
      const api = createClient();
      const {
        data: { session },
      } = await api.auth.getSession();
      const token =
        session?.access_token ||
        localStorage.getItem('tt-access-token') ||
        localStorage.getItem('access_token');
      if (!token) throw new Error('No hay sesion activa');

      const response = await fetch(`http://localhost:3001/kiosk/time-punch-requests/${row.id}/support-document`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const fileUrl = window.URL.createObjectURL(blob);
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(fileUrl), 60_000);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo abrir el adjunto');
    }
  };

  const decide = async (row: Row, decision: 'APPROVE' | 'REJECT') => {
    const inputNotes = (notesById[row.id] || '').trim();
    if (decision === 'REJECT' && !inputNotes) {
      toast.error('Para denegar debe registrar una observacion');
      return;
    }

    const supervisorNotes = inputNotes || (decision === 'APPROVE' ? 'Aprobada por supervisor' : 'Denegada por supervisor');

    setWorkingId(row.id);
    try {
      await request(`/time-punch-requests/${row.id}/decision`, {
        method: 'PATCH',
        body: JSON.stringify({
          decision,
          supervisor_notes: supervisorNotes,
        }),
      });
      toast.success(decision === 'APPROVE' ? 'Solicitud aprobada' : 'Solicitud denegada');
      await loadRows();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo registrar la decision');
    } finally {
      setWorkingId(null);
    }
  };

  const renderCurrentRequested = (row: Row) => {
    const current = row.current_values || {};
    const requested = row.requested_values || {};

    const currentMovement =
      current.punch_key !== undefined && current.punch_key !== null
        ? punchLabelByValue.get(Number(current.punch_key)) || `#${current.punch_key}`
        : '-';

    const requestedMovement =
      requested.punch_key !== undefined && requested.punch_key !== null
        ? punchLabelByValue.get(Number(requested.punch_key)) || `#${requested.punch_key}`
        : '-';

    return (
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-700">Actual</div>
          <div className="text-sm text-slate-700">
            <div><span className="font-medium">Fecha/Hora:</span> {formatDateTime(current.punch_datetime)}</div>
            <div><span className="font-medium">Movimiento:</span> {currentMovement}</div>
            <div><span className="font-medium">Activo:</span> {current.is_active === false ? 'No' : 'Si'}</div>
          </div>
        </div>
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-800">Solicitado</div>
          <div className="text-sm text-slate-700">
            <div><span className="font-medium">Fecha/Hora:</span> {formatDateTime(requested.punch_datetime)}</div>
            <div><span className="font-medium">Movimiento:</span> {requestedMovement}</div>
            <div><span className="font-medium">Activo:</span> {requested.is_active === false ? 'No' : 'Si'}</div>
            {requested.notes ? <div><span className="font-medium">Notas:</span> {String(requested.notes)}</div> : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Aprobar marcaciones</h1>
          <p className="text-sm text-slate-600">Revisa y decide solicitudes de alta, cambio y activacion/desactivacion de marcaciones.</p>
        </div>
        <Button variant="outline" onClick={() => void refresh()} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refrescar
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={status === 'PENDING' ? 'default' : 'outline'} onClick={() => setStatus('PENDING')}>Pendientes</Button>
        <Button size="sm" variant={status === 'APPROVED' ? 'default' : 'outline'} onClick={() => setStatus('APPROVED')}>Aprobadas</Button>
        <Button size="sm" variant={status === 'REJECTED' ? 'default' : 'outline'} onClick={() => setStatus('REJECTED')}>Denegadas</Button>
        <Button size="sm" variant={status === 'CANCELLED' ? 'default' : 'outline'} onClick={() => setStatus('CANCELLED')}>Canceladas</Button>
        <Button size="sm" variant={status === 'ALL' ? 'default' : 'outline'} onClick={() => setStatus('ALL')}>Todas</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por empleado, empresa o motivo..."
        />
      </div>

      {loading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-slate-600">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
          Cargando bandeja de aprobaciones...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-white p-6 text-slate-600">No hay solicitudes para el filtro actual.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const fullName = `${row.employee_name || ''} ${row.employee_lastname || ''}`.trim() || 'Empleado';
            const pending = isPendingStatus(row.request_status_key);
            return (
              <div key={row.id} className="rounded-lg border bg-white p-4">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {fullName}
                      {row.employee_code ? <span className="ml-2 text-xs text-slate-500">({row.employee_code})</span> : null}
                    </div>
                    <div className="text-xs text-slate-500">
                      {row.request_type_label || '-'} - {row.company_name || '-'} - Creada: {formatDateTime(row.created_at)}
                    </div>
                  </div>
                  <span className={`rounded border px-2 py-1 text-xs font-medium ${statusBadgeClass(row.request_status_key)}`}>
                    {row.request_status_label || '-'}
                  </span>
                </div>

                <div className="mb-3 text-sm text-slate-700">
                  <span className="font-medium text-slate-900">Motivo:</span> {row.reason || '-'}
                </div>

                <div className="mb-3">{renderCurrentRequested(row)}</div>

                <div className="mb-3 flex items-center gap-3 text-sm">
                  {row.support_document_name ? (
                    <button
                      type="button"
                      onClick={() => void openSupportDocument(row)}
                      className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700 hover:bg-blue-100"
                      title={row.support_document_name || ''}
                    >
                      <Paperclip className="h-3.5 w-3.5" /> Ver adjunto
                    </button>
                  ) : (
                    <span className="text-slate-500">Sin adjunto</span>
                  )}
                </div>

                {pending ? (
                  <>
                    <div className="mb-3">
                      <label className="mb-1 block text-sm font-medium text-slate-700">Observacion del aprobador</label>
                      <textarea
                        value={notesById[row.id] || ''}
                        onChange={(e) =>
                          setNotesById((prev) => ({
                            ...prev,
                            [row.id]: e.target.value,
                          }))
                        }
                        placeholder="Escriba una observacion para la decision..."
                        className="min-h-[72px] w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" disabled={workingId === row.id} onClick={() => void decide(row, 'APPROVE')}>
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Aprobar
                      </Button>
                      <Button size="sm" variant="outline" disabled={workingId === row.id} onClick={() => void decide(row, 'REJECT')}>
                        <XCircle className="mr-1 h-4 w-4" /> Denegar
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
                    <div className="font-medium text-slate-800">Trazabilidad del aprobador</div>
                    <div className="mt-1 text-slate-700">Aprobador: {row.approved_by_display_name || row.approved_by_username || '-'}</div>
                    <div className="text-slate-700">Fecha decision: {formatDateTime(row.approved_at)}</div>
                    <div className="text-slate-700">Observacion: {row.supervisor_notes || '-'}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
