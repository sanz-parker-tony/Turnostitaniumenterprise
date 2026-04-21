/**
 * Attendance > Approvals
 * Bandeja de aprobaciones para RRHH_ADMIN / SUPERVISOR
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/backend/client';
import ScreenPageShell from '@/components/ScreenPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, CheckCircle, XCircle, Clock, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface PendingRequest {
  id: string;
  request_type: 'PERMISSION' | 'REGULARIZATION' | 'JUSTIFICATION' | 'SHIFT_CHANGE';
  employee_id: string;
  employee_name: string;
  employee_code: string;
  request_date: string;
  request_reason: string;
  requested_data: any;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, [activeTab]);

  async function loadRequests() {
    setIsLoading(true);
    const ApiClient = createClient();

    try {
      // TODO: Reemplazar con query real cuando existan las tablas
      // Por ahora mock data
      const mockRequests: PendingRequest[] = [
        {
          id: '1',
          request_type: 'PERMISSION',
          employee_id: 'emp1',
          employee_name: 'Juan Pérez',
          employee_code: 'EMP001',
          request_date: '2026-01-15',
          request_reason: 'Cita médica',
          requested_data: { hours: 2, start_time: '14:00' },
          status: 'PENDING',
          created_at: '2026-01-12T10:30:00Z'
        },
        {
          id: '2',
          request_type: 'REGULARIZATION',
          employee_id: 'emp2',
          employee_name: 'María González',
          employee_code: 'EMP002',
          request_date: '2026-01-13',
          request_reason: 'Olvidé marcar salida',
          requested_data: { punch_type: 'EXIT', time: '17:00' },
          status: 'PENDING',
          created_at: '2026-01-13T18:00:00Z'
        },
        {
          id: '3',
          request_type: 'JUSTIFICATION',
          employee_id: 'emp3',
          employee_name: 'Carlos Ramírez',
          employee_code: 'EMP003',
          request_date: '2026-01-12',
          request_reason: 'Enfermedad',
          requested_data: { document_url: 'cert_medico.pdf' },
          status: 'PENDING',
          created_at: '2026-01-13T09:00:00Z'
        }
      ];

      // Filtrar por status
      const filtered = mockRequests.filter(r => r.status === activeTab.toUpperCase());
      setRequests(filtered);

    } catch (err: any) {
      console.error('[APPROVALS] Error:', err);
      toast.error('Error al cargar solicitudes: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprove(request: PendingRequest) {
    if (!confirm(`¿Aprobar la solicitud de ${request.employee_name}?`)) {
      return;
    }

    setProcessingId(request.id);
    try {
      // TODO: POST al endpoint de aprobación
      const ApiClient = createClient();
      
      // Simular llamada
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Solicitud aprobada exitosamente');
      loadRequests();
    } catch (err: any) {
      console.error('[APPROVALS] Error aprobando:', err);
      toast.error('Error al aprobar solicitud');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(request: PendingRequest) {
    const reason = prompt('Motivo del rechazo (opcional):');
    
    if (reason === null) return; // Canceló

    setProcessingId(request.id);
    try {
      // TODO: POST al endpoint de rechazo
      const ApiClient = createClient();
      
      // Simular llamada
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Solicitud rechazada');
      loadRequests();
    } catch (err: any) {
      console.error('[APPROVALS] Error rechazando:', err);
      toast.error('Error al rechazar solicitud');
    } finally {
      setProcessingId(null);
    }
  }

  const filteredRequests = requests.filter(r =>
    r.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.request_reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRequestTypeColor = (type: string) => {
    switch (type) {
      case 'PERMISSION': return 'bg-blue-100 text-blue-800';
      case 'REGULARIZATION': return 'bg-amber-100 text-amber-800';
      case 'JUSTIFICATION': return 'bg-purple-100 text-purple-800';
      case 'SHIFT_CHANGE': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'PERMISSION': return 'Permiso';
      case 'REGULARIZATION': return 'Regularización';
      case 'JUSTIFICATION': return 'Justificación';
      case 'SHIFT_CHANGE': return 'Cambio de Turno';
      default: return type;
    }
  };

  const formatDateTime = (datetime: string) => {
    return new Date(datetime).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ScreenPageShell
      screenKey="ATT_APPROVALS"
      title="Bandeja de Aprobaciones"
      description="Gestión de solicitudes pendientes de aprobación"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por empleado, código o razón..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Clock className="w-4 h-4 mr-2" />
            {requests.length} pendientes
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="pending">Pendientes</TabsTrigger>
            <TabsTrigger value="approved">Aprobadas</TabsTrigger>
            <TabsTrigger value="rejected">Rechazadas</TabsTrigger>
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
                    : `No hay solicitudes ${activeTab === 'approved' ? 'aprobadas' : 'rechazadas'}`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge className={getRequestTypeColor(request.request_type)}>
                            {getRequestTypeLabel(request.request_type)}
                          </Badge>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="w-4 h-4" />
                            <span className="font-medium">{request.employee_name}</span>
                            <span className="font-mono text-xs">({request.employee_code})</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700">
                              Fecha solicitada: <strong>{request.request_date}</strong>
                            </span>
                          </div>

                          <div className="text-sm">
                            <span className="text-gray-700">Razón: </span>
                            <span className="text-gray-900 font-medium">{request.request_reason}</span>
                          </div>

                          {request.requested_data && (
                            <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                              <p className="text-xs text-gray-600 mb-1">Detalles:</p>
                              <pre className="text-xs text-gray-900">
                                {JSON.stringify(request.requested_data, null, 2)}
                              </pre>
                            </div>
                          )}

                          <div className="text-xs text-gray-500 mt-3">
                            Solicitado el {formatDateTime(request.created_at)}
                          </div>
                        </div>
                      </div>

                      {activeTab === 'pending' && (
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            onClick={() => handleApprove(request)}
                            disabled={processingId === request.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Aprobar
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleReject(request)}
                            disabled={processingId === request.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Rechazar
                          </Button>
                        </div>
                      )}

                      {activeTab === 'approved' && (
                        <Badge className="bg-green-100 text-green-800 ml-4">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Aprobada
                        </Badge>
                      )}

                      {activeTab === 'rejected' && (
                        <Badge className="bg-red-100 text-red-800 ml-4">
                          <XCircle className="w-3 h-3 mr-1" />
                          Rechazada
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Total Solicitudes</p>
            <p className="text-2xl font-bold text-gray-900">15</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Pendientes</p>
            <p className="text-2xl font-bold text-amber-600">3</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Aprobadas</p>
            <p className="text-2xl font-bold text-green-600">10</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Rechazadas</p>
            <p className="text-2xl font-bold text-red-600">2</p>
          </div>
        </div>
      </div>
    </ScreenPageShell>
  );
}