'use client';

import { buildApiUrl } from '../../../utils/api-config';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/backend/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Paperclip, Search } from 'lucide-react';
import { toast } from 'sonner';
import { formatClientDateTime } from '@/utils/date-time';

type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

type Row = {
  id: string;
  employee_name: string | null;
  employee_lastname: string | null;
  employee_code: string | null;
  justification_name: string | null;
  event_name: string | null;
  start_datetime: string;
  end_datetime: string;
  notes: string | null;
  support_document_name: string | null;
  support_document_mime: string | null;
  request_status_key: string | null;
  request_status_label: string | null;
  approval_notes: string | null;
  approved_by_display_name: string | null;
  approved_by_username: string | null;
  approved_at: string | null;
};

function normalizeStatusKey(statusKey: string | null | undefined, statusLabel: string | null | undefined): string {
  return String(statusKey || statusLabel || '').trim().toUpperCase();
}

function approvalStatusBadgeClass(statusKey: string | null | undefined, statusLabel: string | null | undefined): string {
  const key = normalizeStatusKey(statusKey, statusLabel);
  if (['APPROVED', 'APROBADO', 'APROBADA'].includes(key)) {
    return 'border-green-200 bg-green-100 text-green-800';
  }
  if (['REJECTED', 'DENEGADO', 'DENEGADA', 'RECHAZADO', 'RECHAZADA'].includes(key)) {
    return 'border-red-200 bg-red-100 text-red-800';
  }
  if (['PENDING', 'PENDIENTE', 'REQUESTED', 'SOLICITADO', 'IN_REVIEW', 'EN_REVISION', 'EN REVISIÓN'].includes(key)) {
    return 'border-yellow-300 bg-yellow-100 text-yellow-900';
  }
  return 'border-slate-200 bg-slate-100 text-slate-700';
}

export default function RequestsApprovalsManagement() {
  const linkedRequestId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('request_id') || ''
    : '';
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>(() => linkedRequestId ? 'ALL' : 'PENDING');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const request = async (path: string, init?: RequestInit) => {
    const api = createClient();
    const {
      data: { session },
    } = await api.auth.getSession();
    const token = session?.access_token || localStorage.getItem('tt-access-token');
    if (!token) throw new Error('No hay sesion activa');

    const response = await fetch(buildApiUrl(`${path}`), {
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

  const openSupportDocument = async (row: Row) => {
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

      const response = await fetch(buildApiUrl(`/kiosk/requests/${row.id}/support-document`), {
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

  const load = async () => {

    setLoading(true);
    try {
      const payload = await request(`/kiosk/requests/approvals?status=${status}`);
      const nextRows = (payload?.requests || []) as Row[];
      setRows(nextRows);
      setReviewNotes((prev) => {
        const copy = { ...prev };
        for (const row of nextRows) {
          if (copy[row.id] === undefined) {
            copy[row.id] = row.approval_notes || '';
          }
        }
        return copy;
      });
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const filtered = useMemo(() => {
    if (linkedRequestId) return rows.filter((row) => row.id === linkedRequestId);
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const full = `${r.employee_name || ''} ${r.employee_lastname || ''}`.toLowerCase();
      return (
        full.includes(q) ||
        String(r.employee_code || '').toLowerCase().includes(q) ||
        String(r.justification_name || '').toLowerCase().includes(q) ||
        String(r.event_name || '').toLowerCase().includes(q) ||
        String(r.notes || '').toLowerCase().includes(q)
      );
    });
  }, [rows, query, linkedRequestId]);

  const isPending = (row: Row) => {
    const key = String(row.request_status_key || '').trim().toUpperCase();
    return ['PENDING', 'PENDIENTE', 'REQUESTED', 'SOLICITADO', 'IN_REVIEW', 'EN_REVISION'].includes(key);
  };

  const decide = async (row: Row, decision: 'APPROVE' | 'REJECT') => {
    const approvalNotes = (reviewNotes[row.id] || '').trim();
    const resolvedApprovalNotes =
      approvalNotes || (decision === 'APPROVE' ? 'Aprobada por supervisor' : 'Denegada por supervisor');

    setWorkingId(row.id);
    try {
      await request(`/kiosk/requests/${row.id}/decision`, {
        method: 'PATCH',
        body: JSON.stringify({
          decision,
          approval_notes: resolvedApprovalNotes,
        }),
      });
      toast.success(decision === 'APPROVE' ? 'Solicitud aprobada' : 'Solicitud denegada');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo actualizar la solicitud');
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Aprobar Justificaciones</h1>
        <p className="text-sm text-gray-600">Revision, observacion y decision de solicitudes de justificacion.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={status === 'PENDING' ? 'default' : 'outline'} onClick={() => setStatus('PENDING')}>Pendientes</Button>
        <Button size="sm" variant={status === 'APPROVED' ? 'default' : 'outline'} onClick={() => setStatus('APPROVED')}>Aprobadas</Button>
        <Button size="sm" variant={status === 'REJECTED' ? 'default' : 'outline'} onClick={() => setStatus('REJECTED')}>Denegadas</Button>
        <Button size="sm" variant={status === 'ALL' ? 'default' : 'outline'} onClick={() => setStatus('ALL')}>Todas</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input className="pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar solicitud..." />
      </div>

      {loading ? (
        <div className="rounded-lg border bg-white p-6 text-gray-600">Cargando solicitudes...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-white p-6 text-gray-600">No hay solicitudes para el filtro actual.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const fullName = `${r.employee_name || ''} ${r.employee_lastname || ''}`.trim() || 'Empleado';
            const pending = isPending(r);
            return (
              <div key={r.id} className={`rounded-lg border bg-white p-4 ${r.id === linkedRequestId ? 'border-blue-500 ring-2 ring-blue-100' : ''}`}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {fullName} {r.employee_code ? <span className="text-xs text-gray-500">({r.employee_code})</span> : null}
                    </div>
                    <div className="text-sm text-gray-600">{r.justification_name || '-'} · {r.event_name || '-'}</div>
                  </div>
                  <Badge variant="outline" className={approvalStatusBadgeClass(r.request_status_key, r.request_status_label)}>
                    {r.request_status_label || '-'}
                  </Badge>
                </div>

                <div className="mb-2 text-sm text-gray-600">
                  Desde: {formatClientDateTime(r.start_datetime)} · Hasta: {formatClientDateTime(r.end_datetime)}
                </div>

                <div className="mb-2 text-sm">
                  <span className="font-medium text-gray-800">Motivo de la justificacion:</span>{' '}
                  <span className="text-gray-700">{r.notes || '-'}</span>
                </div>

                <div className="mb-3 flex items-center gap-3 text-sm">
                  {r.support_document_name ? (
                    <button
                      type="button"
                      onClick={() => void openSupportDocument(r)}
                      className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700 hover:bg-blue-100"
                      title={r.support_document_name}
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      Ver adjunto
                    </button>
                  ) : (
                    <span className="text-gray-500">Sin adjunto</span>
                  )}
                </div>

                {pending ? (
                  <>
                    <div className="mb-3">
                      <label className="mb-1 block text-sm font-medium text-gray-700">Observacion del aprobador</label>
                      <textarea
                        value={reviewNotes[r.id] || ''}
                        onChange={(e) =>
                          setReviewNotes((prev) => ({
                            ...prev,
                            [r.id]: e.target.value,
                          }))
                        }
                        placeholder="Escriba la observacion para trazabilidad..."
                        className="min-h-[72px] w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" disabled={workingId === r.id} onClick={() => decide(r, 'APPROVE')}>
                        Aprobar
                      </Button>
                      <Button size="sm" variant="outline" disabled={workingId === r.id} onClick={() => decide(r, 'REJECT')}>
                        Denegar
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="mb-3 rounded border border-slate-200 bg-slate-50 p-3 text-sm">
                    <div className="font-medium text-slate-800">Trazabilidad del aprobador</div>
                    <div className="mt-1 text-slate-700">
                      Aprobador: {r.approved_by_display_name || r.approved_by_username || '-'}
                    </div>
                    <div className="text-slate-700">
                      Fecha decision: {r.approved_at ? formatClientDateTime(r.approved_at) : '-'}
                    </div>
                    <div className="text-slate-700">
                      Observacion aprobador: {r.approval_notes || '-'}
                    </div>
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
