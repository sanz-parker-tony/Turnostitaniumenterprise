'use client';

import { buildApiUrl } from '../../../utils/api-config';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, CalendarDays, Paperclip, Search } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/backend/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

type Row = {
  id: string;
  company_name: string | null;
  employee_code: string | null;
  employee_name: string | null;
  employee_lastname: string | null;
  shift_date: string;
  current_shift_name: string | null;
  current_shift_short_name: string | null;
  current_shift_start_time: string | null;
  current_shift_bg_color: string | null;
  current_shift_text_color: string | null;
  requested_shift_name: string | null;
  requested_shift_short_name: string | null;
  requested_shift_start_time: string | null;
  requested_shift_bg_color: string | null;
  requested_shift_text_color: string | null;
  reason: string | null;
  support_document_name: string | null;
  support_document_mime: string | null;
  request_status_key: string | null;
  request_status_label: string | null;
  supervisor_notes: string | null;
  approved_by_display_name: string | null;
  approved_by_username: string | null;
  approved_at: string | null;
  created_at: string | null;
};

function formatShiftTitle(name: string | null, shortName: string | null): string {
  if (!name && !shortName) return '-';
  return shortName ? `${name || '-'} (${shortName})` : (name || '-');
}

function formatTime(time: string | null): string {
  if (!time) return '--:--';
  return String(time).slice(0, 5);
}

function formatDate(value: string): string {
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleDateString('es-EC', { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' });
}

function isPendingStatus(statusKey: string | null | undefined): boolean {
  const key = String(statusKey || '').trim().toUpperCase();
  return ['PENDING', 'PENDIENTE', 'REQUESTED', 'SOLICITADO', 'IN_REVIEW', 'EN_REVISION', 'EN_REVISIÓN'].includes(key);
}

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

export default function ShiftChangeApprovalsManagement() {
  const { profile } = useAuth();
  const roleKey = String(profile?.role_key || '').trim().toUpperCase();
  const canUse = roleKey === 'SUPERVISOR' || roleKey === 'RRHH_ADMIN' || roleKey === 'RHADMIN';

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});

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

  const load = async () => {
    if (!canUse) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const payload = await request(`/kiosk/request-shift-change/approvals?status=${status}`);
      const nextRows = (payload?.requests || []) as Row[];
      setRows(nextRows);
      setNotesById((prev) => {
        const copy = { ...prev };
        for (const row of nextRows) {
          if (copy[row.id] === undefined) {
            copy[row.id] = row.supervisor_notes || '';
          }
        }
        return copy;
      });
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cargar la bandeja de cambios de turno');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUse, status]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const fullName = `${row.employee_name || ''} ${row.employee_lastname || ''}`.toLowerCase();
      return (
        fullName.includes(q) ||
        String(row.employee_code || '').toLowerCase().includes(q) ||
        String(row.company_name || '').toLowerCase().includes(q) ||
        String(row.current_shift_name || '').toLowerCase().includes(q) ||
        String(row.requested_shift_name || '').toLowerCase().includes(q) ||
        String(row.reason || '').toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

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

      const response = await fetch(buildApiUrl(`/kiosk/request-shift-change/${row.id}/support-document`), {
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
    const defaultNotes = decision === 'APPROVE' ? 'Aprobado por supervisor' : 'Denegado por supervisor';
    const supervisorNotes = inputNotes || defaultNotes;

    if (decision === 'REJECT' && !inputNotes) {
      toast.error('Para denegar debes registrar una observacion');
      return;
    }

    setWorkingId(row.id);
    try {
      await request(`/kiosk/request-shift-change/${row.id}/decision`, {
        method: 'PATCH',
        body: JSON.stringify({
          decision,
          supervisor_notes: supervisorNotes,
        }),
      });
      toast.success(decision === 'APPROVE' ? 'Cambio de turno aprobado' : 'Cambio de turno denegado');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo registrar la decision');
    } finally {
      setWorkingId(null);
    }
  };

  if (!canUse) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
        Esta pantalla esta habilitada solo para los roles SUPERVISOR, RRHH_ADMIN y RHADMIN.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Aprobar Cambio de turnos</h1>
        <p className="text-sm text-gray-600">Revision de turno actual y turno solicitado segun la fecha requerida.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={status === 'PENDING' ? 'default' : 'outline'} onClick={() => setStatus('PENDING')}>Pendientes</Button>
        <Button size="sm" variant={status === 'APPROVED' ? 'default' : 'outline'} onClick={() => setStatus('APPROVED')}>Aprobadas</Button>
        <Button size="sm" variant={status === 'REJECTED' ? 'default' : 'outline'} onClick={() => setStatus('REJECTED')}>Denegadas</Button>
        <Button size="sm" variant={status === 'ALL' ? 'default' : 'outline'} onClick={() => setStatus('ALL')}>Todas</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por empleado, turno, empresa o motivo..."
        />
      </div>

      {loading ? (
        <div className="rounded-lg border bg-white p-6 text-gray-600">Cargando solicitudes de cambio...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-white p-6 text-gray-600">No hay solicitudes para el filtro actual.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const fullName = `${row.employee_name || ''} ${row.employee_lastname || ''}`.trim() || 'Empleado';
            const pending = isPendingStatus(row.request_status_key);
            return (
              <div key={row.id} className="rounded-lg border bg-white p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {fullName} {row.employee_code ? <span className="text-xs text-gray-500">({row.employee_code})</span> : null}
                    </div>
                    <div className="mt-1 inline-flex items-center gap-2 text-sm text-gray-600">
                      <CalendarDays className="h-4 w-4" />
                      <span>{formatDate(row.shift_date)}</span>
                      <span>·</span>
                      <span>{row.company_name || '-'}</span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={approvalStatusBadgeClass(row.request_status_key, row.request_status_label)}
                  >
                    {row.request_status_label || '-'}
                  </Badge>
                </div>

                <div className="mb-3 grid gap-3 md:grid-cols-[1fr_auto_1fr]">
                  <div
                    className="rounded-lg border px-3 py-2"
                    style={{
                      backgroundColor: row.current_shift_bg_color || '#EEF2FF',
                      color: row.current_shift_text_color || '#1E293B',
                    }}
                  >
                    <div className="text-xs uppercase tracking-wide opacity-80">Turno original</div>
                    <div className="font-semibold">{formatShiftTitle(row.current_shift_name, row.current_shift_short_name)}</div>
                    <div className="text-xs opacity-90">Inicio: {formatTime(row.current_shift_start_time)}</div>
                  </div>

                  <div className="flex items-center justify-center text-slate-400">
                    <ArrowRightLeft className="h-5 w-5" />
                  </div>

                  <div
                    className="rounded-lg border px-3 py-2"
                    style={{
                      backgroundColor: row.requested_shift_bg_color || '#DCFCE7',
                      color: row.requested_shift_text_color || '#14532D',
                    }}
                  >
                    <div className="text-xs uppercase tracking-wide opacity-80">Nuevo turno</div>
                    <div className="font-semibold">{formatShiftTitle(row.requested_shift_name, row.requested_shift_short_name)}</div>
                    <div className="text-xs opacity-90">Inicio: {formatTime(row.requested_shift_start_time)}</div>
                  </div>
                </div>

                <div className="mb-3 text-sm text-gray-700">
                  <span className="font-medium text-gray-800">Motivo:</span> {row.reason || '-'}
                </div>

                <div className="mb-3 flex items-center gap-3 text-sm">
                  {row.support_document_name ? (
                    <button
                      type="button"
                      onClick={() => void openSupportDocument(row)}
                      className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700 hover:bg-blue-100"
                      title={row.support_document_name}
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
                        value={notesById[row.id] || ''}
                        onChange={(e) =>
                          setNotesById((prev) => ({
                            ...prev,
                            [row.id]: e.target.value,
                          }))
                        }
                        placeholder="Escriba una observacion para la decision..."
                        className="min-h-[72px] w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" disabled={workingId === row.id} onClick={() => decide(row, 'APPROVE')}>
                        Aprobar
                      </Button>
                      <Button size="sm" variant="outline" disabled={workingId === row.id} onClick={() => decide(row, 'REJECT')}>
                        Denegar
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
                    <div className="font-medium text-slate-800">Trazabilidad del aprobador</div>
                    <div className="mt-1 text-slate-700">
                      Aprobador: {row.approved_by_display_name || row.approved_by_username || '-'}
                    </div>
                    <div className="text-slate-700">
                      Fecha decision: {row.approved_at ? new Date(row.approved_at).toLocaleString('es-EC') : '-'}
                    </div>
                    <div className="text-slate-700">
                      Observacion aprobador: {row.supervisor_notes || '-'}
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
