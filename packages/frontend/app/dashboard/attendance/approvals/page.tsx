/**
 * Attendance > Approvals
 * Bandeja de aprobaciones para SUPERVISOR / RRHH_ADMIN / RHADMIN
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import ScreenPageShell from '@/components/ScreenPageShell';
import { createClient } from '@/utils/backend/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, CheckCircle, XCircle, Clock, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface CatalogItem {
  id: string;
  lookup_key?: string;
  lookup_label?: string;
}

interface ApprovalRequestRow {
  id: string;
  employee_id: string;
  employee_code: string | null;
  employee_name: string | null;
  employee_lastname: string | null;
  employee_user_display_name: string | null;
  employee_username: string | null;
  company_name: string | null;
  justification_name: string | null;
  event_name: string | null;
  justify_method_id: string | null;
  justify_method_label: string | null;
  start_datetime: string;
  end_datetime: string;
  notes: string | null;
  request_status_key: string | null;
  request_status_label: string | null;
  approval_notes: string | null;
  approved_by: string | null;
  approved_by_display_name: string | null;
  approved_by_username: string | null;
  approved_at: string | null;
  created_at: string;
}

type TabKey = 'pending' | 'approved' | 'rejected';

function getApiStatusFromTab(tab: TabKey): 'PENDING' | 'APPROVED' | 'REJECTED' {
  if (tab === 'approved') return 'APPROVED';
  if (tab === 'rejected') return 'REJECTED';
  return 'PENDING';
}

export default function ApprovalsPage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequestRow[]>([]);
  const [discountMethods, setDiscountMethods] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [draftById, setDraftById] = useState<Record<string, { justify_method_id: string; approval_notes: string }>>({});
  const roleKey = String(profile?.role_key || '').trim().toUpperCase();
  const canUseApprovals = roleKey === 'SUPERVISOR' || roleKey === 'RRHH_ADMIN' || roleKey === 'RHADMIN';

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

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const status = getApiStatusFromTab(activeTab);
      const payload = await request(`/kiosk/requests/approvals?status=${status}`);
      setRequests((payload?.requests || []) as ApprovalRequestRow[]);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cargar la bandeja de aprobaciones');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCatalogs = async () => {
    try {
      const payload = await request('/kiosk/requests/approvals/catalogs');
      setDiscountMethods((payload?.discount_methods || []) as CatalogItem[]);
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo cargar catálogo de métodos de descuento');
    }
  };

  useEffect(() => {
    if (!canUseApprovals) return;
    void loadRequests();
    void loadCatalogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, canUseApprovals]);

  const openEditor = (row: ApprovalRequestRow) => {
    setDraftById((prev) => ({
      ...prev,
      [row.id]: {
        justify_method_id: row.justify_method_id || '',
        approval_notes: row.approval_notes || '',
      },
    }));
    setEditingRowId(row.id);
  };

  const saveReviewFields = async (row: ApprovalRequestRow) => {
    const draft = draftById[row.id];
    if (!draft) return;
    setProcessingId(row.id);
    try {
      await request(`/kiosk/requests/${row.id}/review-fields`, {
        method: 'PATCH',
        body: JSON.stringify({
          justify_method_id: draft.justify_method_id || null,
          approval_notes: draft.approval_notes || null,
        }),
      });
      toast.success('Revisión actualizada');
      setEditingRowId(null);
      await loadRequests();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo actualizar la revisión');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = async (row: ApprovalRequestRow) => {
    if (!window.confirm(`¿Aprobar la solicitud de ${row.employee_name || row.employee_username || 'empleado'}?`)) {
      return;
    }

    const draft = draftById[row.id];
    const approvalNote = draft?.approval_notes ?? row.approval_notes ?? '';
    const justifyMethodId = draft?.justify_method_id ?? row.justify_method_id ?? null;

    setProcessingId(row.id);
    try {
      await request(`/kiosk/requests/${row.id}/decision`, {
        method: 'PATCH',
        body: JSON.stringify({
          decision: 'APPROVE',
          approval_notes: approvalNote || null,
          justify_method_id: justifyMethodId || null,
        }),
      });
      toast.success('Solicitud aprobada');
      setEditingRowId(null);
      await loadRequests();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo aprobar la solicitud');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (row: ApprovalRequestRow) => {
    if (!window.confirm(`¿Denegar la solicitud de ${row.employee_name || row.employee_username || 'empleado'}?`)) {
      return;
    }

    const draft = draftById[row.id];
    const approvalNote = (draft?.approval_notes ?? row.approval_notes ?? '').trim();
    const justifyMethodId = draft?.justify_method_id ?? row.justify_method_id ?? null;
    if (!approvalNote) {
      toast.error('Debe registrar observación para denegar la solicitud');
      openEditor(row);
      return;
    }

    setProcessingId(row.id);
    try {
      await request(`/kiosk/requests/${row.id}/decision`, {
        method: 'PATCH',
        body: JSON.stringify({
          decision: 'REJECT',
          approval_notes: approvalNote,
          justify_method_id: justifyMethodId || null,
        }),
      });
      toast.success('Solicitud denegada');
      setEditingRowId(null);
      await loadRequests();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo denegar la solicitud');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return requests;
    return requests.filter((row) => {
      const employeeFullName = `${row.employee_name || ''} ${row.employee_lastname || ''}`.trim().toLowerCase();
      return (
        employeeFullName.includes(query) ||
        String(row.employee_code || '').toLowerCase().includes(query) ||
        String(row.employee_username || '').toLowerCase().includes(query) ||
        String(row.justification_name || '').toLowerCase().includes(query) ||
        String(row.event_name || '').toLowerCase().includes(query)
      );
    });
  }, [requests, searchTerm]);

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (!canUseApprovals) {
    return (
      <ScreenPageShell
        screenKey="REQUESTS_MANAGEMENT"
        title="Bandeja de Aprobaciones"
        description="Revisión y decisión de solicitudes de justificación"
      >
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          Esta pantalla está habilitada solo para los roles SUPERVISOR, RRHH_ADMIN y RHADMIN.
        </div>
      </ScreenPageShell>
    );
  }

  return (
    <ScreenPageShell
      screenKey="REQUESTS_MANAGEMENT"
      title="Bandeja de Aprobaciones"
      description="Revisión y decisión de solicitudes de justificación"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por empleado, código, justificación o evento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Clock className="w-4 h-4 mr-2" />
            {requests.length} en bandeja
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
          <TabsList>
            <TabsTrigger value="pending">Pendientes</TabsTrigger>
            <TabsTrigger value="approved">Aprobadas</TabsTrigger>
            <TabsTrigger value="rejected">Denegadas</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600">Cargando solicitudes...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {activeTab === 'pending'
                    ? 'No hay solicitudes pendientes'
                    : activeTab === 'approved'
                    ? 'No hay solicitudes aprobadas'
                    : 'No hay solicitudes denegadas'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((row) => {
                  const employeeFullName =
                    `${row.employee_name || ''} ${row.employee_lastname || ''}`.trim() ||
                    row.employee_user_display_name ||
                    row.employee_username ||
                    'Empleado';

                  return (
                    <div
                      key={row.id}
                      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <Badge className="bg-purple-100 text-purple-800">Justificación</Badge>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <User className="w-4 h-4" />
                              <span className="font-medium">{employeeFullName}</span>
                              {row.employee_code ? (
                                <span className="font-mono text-xs">({row.employee_code})</span>
                              ) : null}
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span>Desde: <strong>{formatDateTime(row.start_datetime)}</strong></span>
                              <span>·</span>
                              <span>Hasta: <strong>{formatDateTime(row.end_datetime)}</strong></span>
                            </div>
                            <div className="text-gray-700">
                              Justificación: <strong>{row.justification_name || '-'}</strong>
                            </div>
                            <div className="text-gray-700">
                              Evento: <strong>{row.event_name || '-'}</strong>
                            </div>
                            <div className="text-gray-700">
                              Método de descuento: <strong>{row.justify_method_label || '-'}</strong>
                            </div>
                            <div className="text-gray-700">
                              Empresa: <strong>{row.company_name || '-'}</strong>
                            </div>
                            <div className="text-gray-700">
                              Estado: <strong>{row.request_status_label || row.request_status_key || '-'}</strong>
                            </div>
                            {row.approved_at ? (
                              <>
                                <div className="text-gray-700">
                                  Revisado por:{' '}
                                  <strong>{row.approved_by_display_name || row.approved_by_username || row.approved_by || '-'}</strong>
                                </div>
                                <div className="text-gray-700">
                                  Fecha de revisión: <strong>{formatDateTime(row.approved_at)}</strong>
                                </div>
                                <div className="text-gray-700">
                                  Observación revisión: <strong>{row.approval_notes || '-'}</strong>
                                </div>
                              </>
                            ) : null}
                            {row.notes ? (
                              <div className="text-gray-700">
                                Notas empleado: <strong>{row.notes}</strong>
                              </div>
                            ) : null}
                            <div className="text-xs text-gray-500 pt-2">
                              Solicitado el {formatDateTime(row.created_at)}
                            </div>
                          </div>

                          {activeTab === 'pending' ? (
                            <div className="mt-4 p-3 rounded border border-gray-200 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-gray-700">Edición de revisión (Supervisor)</p>
                                {editingRowId !== row.id ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEditor(row)}
                                    disabled={processingId === row.id}
                                  >
                                    Editar revisión
                                  </Button>
                                ) : null}
                              </div>
                              {editingRowId === row.id ? (
                                <div className="space-y-2">
                                  <label className="block text-xs text-gray-700">Método de descuento</label>
                                  <select
                                    value={draftById[row.id]?.justify_method_id || ''}
                                    onChange={(e) =>
                                      setDraftById((prev) => ({
                                        ...prev,
                                        [row.id]: {
                                          justify_method_id: e.target.value,
                                          approval_notes: prev[row.id]?.approval_notes || '',
                                        },
                                      }))
                                    }
                                    className="h-9 w-full rounded border px-2 text-sm"
                                  >
                                    <option value="">Seleccionar...</option>
                                    {discountMethods.map((method) => (
                                      <option key={method.id} value={method.id}>
                                        {method.lookup_label || method.lookup_key || method.id}
                                      </option>
                                    ))}
                                  </select>
                                  <label className="block text-xs text-gray-700">Observación de revisión</label>
                                  <textarea
                                    value={draftById[row.id]?.approval_notes || ''}
                                    onChange={(e) =>
                                      setDraftById((prev) => ({
                                        ...prev,
                                        [row.id]: {
                                          justify_method_id: prev[row.id]?.justify_method_id || '',
                                          approval_notes: e.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full min-h-[70px] rounded border px-2 py-1 text-sm"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingRowId(null)}
                                      disabled={processingId === row.id}
                                    >
                                      Cerrar
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => void saveReviewFields(row)}
                                      disabled={processingId === row.id}
                                    >
                                      Guardar revisión
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-600">
                                  Usa “Editar revisión” para ajustar método de descuento y observación antes de decidir.
                                </p>
                              )}
                            </div>
                          ) : null}
                        </div>

                        {activeTab === 'pending' ? (
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              onClick={() => void handleApprove(row)}
                              disabled={processingId === row.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Aprobar
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => void handleReject(row)}
                              disabled={processingId === row.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Denegar
                            </Button>
                          </div>
                        ) : activeTab === 'approved' ? (
                          <Badge className="bg-green-100 text-green-800 ml-4">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Aprobada
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 ml-4">
                            <XCircle className="w-3 h-3 mr-1" />
                            Denegada
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ScreenPageShell>
  );
}
