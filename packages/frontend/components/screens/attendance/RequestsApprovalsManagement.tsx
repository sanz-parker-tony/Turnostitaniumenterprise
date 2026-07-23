'use client';

import { buildApiUrl } from '../../../utils/api-config';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/backend/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Paperclip, RefreshCw, Search, ShieldAlert } from 'lucide-react';
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
  planning_risk_accepted_by: string | null;
  planning_risk_accepted_by_display_name: string | null;
  planning_risk_accepted_by_username: string | null;
  planning_risk_accepted_at: string | null;
};

type PlanningImpact = {
  request_id: string;
  policy_key: string | null;
  policy_label: string | null;
  assessment_key: 'NO_IMPACT' | 'SAFE' | 'CONDITIONAL' | 'NOT_FEASIBLE' | 'CONFIGURATION_REQUIRED' | 'RISK_ACCEPTANCE_REQUIRED';
  approval_control: string | null;
  risk_acceptance_required: boolean;
  message: string;
  affected_plan_count: number;
  date_from: string;
  date_to: string;
  assessment_token: string;
  days: Array<{
    date: string;
    shift_name: string;
    shift_short_name: string;
    required_staff: number | null;
    planned_staff: number;
    remaining_staff: number;
    deficit_staff: number | null;
    replacement_candidates: Array<{
      employee_id: string;
      employee_code: string | null;
      employee_name: string;
    }>;
  }>;
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
  const [planningImpacts, setPlanningImpacts] = useState<Record<string, PlanningImpact>>({});
  const [planningImpactLoading, setPlanningImpactLoading] = useState<Record<string, boolean>>({});
  const [planningRiskAcceptances, setPlanningRiskAcceptances] = useState<Record<string, boolean>>({});

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
      const pendingRows = nextRows.filter(isPending);
      setPlanningImpactLoading((prev) => ({
        ...prev,
        ...Object.fromEntries(pendingRows.map((row) => [row.id, true])),
      }));
      const impactEntries = await Promise.all(
        pendingRows.map(async (row) => {
          try {
            const impactPayload = await request(`/kiosk/requests/${row.id}/planning-impact`);
            return [row.id, impactPayload?.planning_impact as PlanningImpact] as const;
          } catch {
            return [row.id, null] as const;
          }
        })
      );
      setPlanningImpacts((prev) => {
        const copy = { ...prev };
        impactEntries.forEach(([id, impact]) => {
          if (impact) copy[id] = impact;
        });
        return copy;
      });
      setPlanningImpactLoading((prev) => {
        const copy = { ...prev };
        pendingRows.forEach((row) => { copy[row.id] = false; });
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

  const refreshPlanningImpact = async (requestId: string) => {
    setPlanningImpactLoading((prev) => ({ ...prev, [requestId]: true }));
    try {
      const payload = await request(`/kiosk/requests/${requestId}/planning-impact`);
      setPlanningImpacts((prev) => ({ ...prev, [requestId]: payload?.planning_impact as PlanningImpact }));
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo evaluar la cobertura');
    } finally {
      setPlanningImpactLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const decide = async (row: Row, decision: 'APPROVE' | 'REJECT') => {
    const approvalNotes = (reviewNotes[row.id] || '').trim();
    const resolvedApprovalNotes =
      approvalNotes || (decision === 'APPROVE' ? 'Aprobada por supervisor' : 'Denegada por supervisor');

    setWorkingId(row.id);
    try {
      const impact = planningImpacts[row.id];
      await request(`/kiosk/requests/${row.id}/decision`, {
        method: 'PATCH',
        body: JSON.stringify({
          decision,
          approval_notes: resolvedApprovalNotes,
          planning_resolution:
            decision === 'APPROVE' && impact?.assessment_key === 'CONDITIONAL' ? 'REPLAN' : 'NONE',
          assessment_token: decision === 'APPROVE' ? impact?.assessment_token || null : null,
          planning_risk_accepted:
            decision === 'APPROVE'
            && impact?.assessment_key === 'RISK_ACCEPTANCE_REQUIRED'
            && planningRiskAcceptances[row.id] === true,
        }),
      });
      setPlanningRiskAcceptances((prev) => ({ ...prev, [row.id]: false }));
      toast.success(decision === 'APPROVE' ? 'Solicitud aprobada' : 'Solicitud denegada');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo actualizar la solicitud');
      if (decision === 'APPROVE') await refreshPlanningImpact(row.id);
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
            const planningImpact = planningImpacts[r.id];
            const planningBlocked = planningImpact?.assessment_key === 'NOT_FEASIBLE'
              || planningImpact?.assessment_key === 'CONFIGURATION_REQUIRED';
            const riskAcceptanceRequired = planningImpact?.assessment_key === 'RISK_ACCEPTANCE_REQUIRED'
              && planningImpact?.risk_acceptance_required === true;
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
                  <div className={`mb-3 rounded-lg border p-3 ${
                    planningImpact?.assessment_key === 'SAFE' || planningImpact?.assessment_key === 'NO_IMPACT'
                      ? 'border-green-200 bg-green-50'
                      : planningImpact?.assessment_key === 'CONDITIONAL'
                        || planningImpact?.assessment_key === 'RISK_ACCEPTANCE_REQUIRED'
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-red-200 bg-red-50'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        {planningImpact?.assessment_key === 'SAFE' || planningImpact?.assessment_key === 'NO_IMPACT' ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-700" />
                        ) : planningImpact?.assessment_key === 'CONDITIONAL'
                          || planningImpact?.assessment_key === 'RISK_ACCEPTANCE_REQUIRED' ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
                        ) : (
                          <ShieldAlert className="mt-0.5 h-4 w-4 text-red-700" />
                        )}
                        <div>
                          <div className="font-semibold text-slate-900">Impacto sobre la planificación</div>
                          {planningImpactLoading[r.id] ? (
                            <div className="mt-1 text-sm text-slate-600">Evaluando turnos y cobertura...</div>
                          ) : planningImpact ? (
                            <>
                              <div className="mt-1 text-sm text-slate-700">
                                {planningImpact.policy_label || planningImpact.policy_key || 'Política no configurada'} · {planningImpact.message}
                              </div>
                              {riskAcceptanceRequired ? (
                                <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-md border border-amber-300 bg-white p-3 text-sm text-amber-950">
                                  <input
                                    type="checkbox"
                                    checked={planningRiskAcceptances[r.id] === true}
                                    onChange={(event) => setPlanningRiskAcceptances((prev) => ({
                                      ...prev,
                                      [r.id]: event.target.checked,
                                    }))}
                                    className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-700 focus:ring-amber-500"
                                  />
                                  <span>
                                    Confirmo que revisé la solicitud y acepto aprobarla bajo mi riesgo y responsabilidad como supervisor, aun cuando este tipo de justificación no ha sido clasificado.
                                  </span>
                                </label>
                              ) : null}
                              {planningImpact.days.length > 0 ? (
                                <div className="mt-3 overflow-x-auto rounded border border-slate-200 bg-white">
                                  <table className="w-full min-w-[680px] text-left text-xs">
                                    <thead className="bg-slate-100 text-slate-700">
                                      <tr>
                                        <th className="px-2 py-2">Fecha</th>
                                        <th className="px-2 py-2">Turno</th>
                                        <th className="px-2 py-2 text-center">Requeridos</th>
                                        <th className="px-2 py-2 text-center">Planificados</th>
                                        <th className="px-2 py-2 text-center">Después del permiso</th>
                                        <th className="px-2 py-2 text-center">Déficit</th>
                                        <th className="px-2 py-2">Reemplazos libres</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {planningImpact.days.map((day) => (
                                        <tr key={`${r.id}-${day.date}-${day.shift_short_name}`} className="border-t border-slate-100">
                                          <td className="px-2 py-2">{day.date}</td>
                                          <td className="px-2 py-2">{day.shift_short_name || day.shift_name}</td>
                                          <td className="px-2 py-2 text-center">{day.required_staff ?? 'Sin configurar'}</td>
                                          <td className="px-2 py-2 text-center">{day.planned_staff}</td>
                                          <td className="px-2 py-2 text-center">{day.remaining_staff}</td>
                                          <td className={`px-2 py-2 text-center font-semibold ${Number(day.deficit_staff || 0) > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                            {day.deficit_staff ?? '-'}
                                          </td>
                                          <td className="px-2 py-2">
                                            {day.replacement_candidates.length > 0
                                              ? day.replacement_candidates.map((candidate) => candidate.employee_name).join(', ')
                                              : 'Ninguno identificado'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <div className="mt-1 text-sm text-red-700">No se pudo obtener la evaluación de cobertura.</div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
                        onClick={() => void refreshPlanningImpact(r.id)}
                        disabled={planningImpactLoading[r.id]}
                        title="Recalcular impacto"
                      >
                        <RefreshCw className={`h-4 w-4 ${planningImpactLoading[r.id] ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                ) : null}

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
                      <Button
                        size="sm"
                        disabled={
                          workingId === r.id
                          || planningImpactLoading[r.id]
                          || !planningImpact
                          || planningBlocked
                          || (riskAcceptanceRequired && planningRiskAcceptances[r.id] !== true)
                        }
                        onClick={() => decide(r, 'APPROVE')}
                      >
                        {planningImpact?.assessment_key === 'CONDITIONAL' ? 'Aprobar y replanificar' : 'Aprobar'}
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
                    {r.planning_risk_accepted_at ? (
                      <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-amber-900">
                        <div className="font-medium">Aprobada bajo aceptación expresa de riesgo</div>
                        <div>
                          Responsable: {r.planning_risk_accepted_by_display_name || r.planning_risk_accepted_by_username || '-'}
                        </div>
                        <div>Fecha de aceptación: {formatClientDateTime(r.planning_risk_accepted_at)}</div>
                      </div>
                    ) : null}
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
