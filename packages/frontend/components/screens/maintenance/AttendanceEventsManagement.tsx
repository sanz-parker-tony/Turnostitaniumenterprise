/**
 * AttendanceEventsManagement.tsx - Gestión de Eventos de Asistencia
 * Turnos Titanium Enterprise
 * 
 * Pantalla de mantenimiento para attendance_events
 * Ubicación: Mantenimiento → Eventos
 */

'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Plus, Edit2, Power, PowerOff, Search, Filter, Download, X } from 'lucide-react';
import { projectId, publicApiToken } from '@/utils/backend/info';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TIPOS
// ============================================================================

interface AttendanceEvent {
  id: string;
  tenant_id: string;
  event_name: string;
  event_short_name: string;
  tolerance_minutes: number;
  weight_value: number;
  transaction_direction_id: string;
  event_type_id: string;
  movement_id: string;
  calculation_method_id: string;
  external_mapping: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
  
  // Datos desnormalizados (joins)
  transaction_direction_key?: string;
  transaction_direction_label?: string;
  event_type_key?: string;
  event_type_label?: string;
  movement_code?: string;
  calculation_method_label?: string;
}

interface LookupValue {
  id: string;
  lookup_key: string;
  lookup_label: string;
  is_active: boolean;
}

interface AttendanceMovement {
  id: string;
  movement_short_name: string;
  movement_name: string;
  is_active: boolean;
}

interface FormData {
  event_name: string;
  event_short_name: string;
  tolerance_minutes: number;
  weight_value: number;
  transaction_direction_id: string;
  event_type_id: string;
  movement_id: string;
  calculation_method_id: string;
  external_mapping: string;
  is_active: boolean;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function AttendanceEventsManagement() {
  const { profile } = useAuth();
  
  // Estados principales
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para catálogos
  const [transactionDirections, setTransactionDirections] = useState<LookupValue[]>([]);
  const [eventTypes, setEventTypes] = useState<LookupValue[]>([]);
  const [calculationMethods, setCalculationMethods] = useState<LookupValue[]>([]);
  const [movements, setMovements] = useState<AttendanceMovement[]>([]);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [movementFilter, setMovementFilter] = useState<string>('all');
  const [transactionDirectionFilter, setTransactionDirectionFilter] = useState<string>('all');

  // Estados de modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AttendanceEvent | null>(null);
  const [formData, setFormData] = useState<FormData>({
    event_name: '',
    event_short_name: '',
    tolerance_minutes: 0,
    weight_value: 100,
    transaction_direction_id: '',
    event_type_id: '',
    movement_id: '',
    calculation_method_id: '',
    external_mapping: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // ============================================================================
  // EFECTOS
  // ============================================================================

  useEffect(() => {
    loadData();
  }, []);

  // ============================================================================
  // FUNCIONES DE CARGA
  // ============================================================================

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadEvents(),
        loadCatalogs(),
      ]);
    } catch (err) {
      console.error('[ATTENDANCE-EVENTS] Error cargando datos:', err);
      setError('Error al cargar los datos. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const response = await fetch(
        `http://localhost:3001/attendance-events`,
        {
          headers: {
            'Authorization': `Bearer ${publicApiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('[ATTENDANCE-EVENTS] Error cargando eventos:', err);
      throw err;
    }
  };

  const loadCatalogs = async () => {
    try {
      // Cargar Transaction Directions
      const trxRes = await fetch(
        `http://localhost:3001/lookup-values?group=TRANSACTION_DIRECTION`,
        {
          headers: {
            'Authorization': `Bearer ${publicApiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!trxRes.ok) {
        const errorText = await trxRes.text();
        console.error('[ATTENDANCE-EVENTS] Error response from lookup-values (TRX):', errorText);
        throw new Error(`Error cargando Transaction Directions: ${trxRes.status}`);
      }
      
      const trxText = await trxRes.text();
      console.log('[ATTENDANCE-EVENTS] TRX Response:', trxText);
      const trxData = JSON.parse(trxText);
      setTransactionDirections(trxData.values || []);

      // Cargar Event Types
      const evtRes = await fetch(
        `http://localhost:3001/lookup-values?group=EVENT_TYPE`,
        {
          headers: {
            'Authorization': `Bearer ${publicApiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!evtRes.ok) {
        const errorText = await evtRes.text();
        console.error('[ATTENDANCE-EVENTS] Error response from lookup-values (EVT):', errorText);
        throw new Error(`Error cargando Event Types: ${evtRes.status}`);
      }
      
      const evtText = await evtRes.text();
      console.log('[ATTENDANCE-EVENTS] EVT Response:', evtText);
      const evtData = JSON.parse(evtText);
      setEventTypes(evtData.values || []);

      // Cargar Calculation Methods
      const calcRes = await fetch(
        `http://localhost:3001/lookup-values?group=CALCULATION_METHOD`,
        {
          headers: {
            'Authorization': `Bearer ${publicApiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!calcRes.ok) {
        const errorText = await calcRes.text();
        console.error('[ATTENDANCE-EVENTS] Error response from lookup-values (CALC):', errorText);
        throw new Error(`Error cargando Calculation Methods: ${calcRes.status}`);
      }
      
      const calcText = await calcRes.text();
      console.log('[ATTENDANCE-EVENTS] CALC Response:', calcText);
      const calcData = JSON.parse(calcText);
      setCalculationMethods(calcData.values || []);

      // Cargar Movements
      const movRes = await fetch(
        `http://localhost:3001/attendance-events/catalogs/movements`,
        {
          headers: {
            'Authorization': `Bearer ${publicApiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!movRes.ok) {
        const errorText = await movRes.text();
        console.error('[ATTENDANCE-EVENTS] Error response from attendance-movements:', errorText);
        throw new Error(`Error cargando Movements: ${movRes.status}`);
      }
      
      const movText = await movRes.text();
      console.log('[ATTENDANCE-EVENTS] MOV Response:', movText);
      const movData = JSON.parse(movText);
      setMovements(movData.movements || []);

    } catch (err) {
      console.error('[ATTENDANCE-EVENTS] Error cargando catálogos:', err);
      throw err;
    }
  };

  // ============================================================================
  // FUNCIONES DE FILTRADO
  // ============================================================================

  const filteredEvents = events.filter(event => {
    // Filtro de búsqueda
    const matchesSearch = searchTerm === '' || 
      event.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.event_short_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.external_mapping && event.external_mapping.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filtro de estado
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && event.is_active) ||
      (statusFilter === 'inactive' && !event.is_active);

    // Filtro de tipo de evento
    const matchesEventType = 
      eventTypeFilter === 'all' ||
      event.event_type_id === eventTypeFilter;

    // Filtro de movimiento
    const matchesMovement = 
      movementFilter === 'all' ||
      event.movement_id === movementFilter;

    // Filtro de dirección de transacción
    const matchesTransactionDirection =
      transactionDirectionFilter === 'all' ||
      event.transaction_direction_id === transactionDirectionFilter;

    return matchesSearch && matchesStatus && matchesEventType && matchesMovement && matchesTransactionDirection;
  });

  // ============================================================================
  // HANDLERS DE MODAL
  // ============================================================================

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormData({
      event_name: '',
      event_short_name: '',
      tolerance_minutes: 0,
      weight_value: 100,
      transaction_direction_id: '',
      event_type_id: '',
      movement_id: '',
      calculation_method_id: '',
      external_mapping: '',
      is_active: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (event: AttendanceEvent) => {
    setEditingEvent(event);
    setFormData({
      event_name: event.event_name,
      event_short_name: event.event_short_name,
      tolerance_minutes: event.tolerance_minutes,
      weight_value: event.weight_value,
      transaction_direction_id: event.transaction_direction_id,
      event_type_id: event.event_type_id,
      movement_id: event.movement_id,
      calculation_method_id: event.calculation_method_id,
      external_mapping: event.external_mapping || '',
      is_active: event.is_active,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setFormData({
      event_name: '',
      event_short_name: '',
      tolerance_minutes: 0,
      weight_value: 100,
      transaction_direction_id: '',
      event_type_id: '',
      movement_id: '',
      calculation_method_id: '',
      external_mapping: '',
      is_active: true,
    });
    setFormErrors({});
  };

  // ============================================================================
  // VALIDACIONES
  // ============================================================================

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Campos obligatorios
    if (!formData.event_name.trim()) {
      errors.event_name = 'El nombre es obligatorio';
    } else if (formData.event_name.length > 60) {
      errors.event_name = 'El nombre no puede exceder 60 caracteres';
    }

    if (!formData.event_short_name.trim()) {
      errors.event_short_name = 'El código es obligatorio';
    } else if (formData.event_short_name.length > 20) {
      errors.event_short_name = 'El código no puede exceder 20 caracteres';
    }

    if (!formData.transaction_direction_id) {
      errors.transaction_direction_id = 'La dirección de transacción es obligatoria';
    }

    if (!formData.event_type_id) {
      errors.event_type_id = 'El tipo de evento es obligatorio';
    }

    if (!formData.movement_id) {
      errors.movement_id = 'El movimiento es obligatorio';
    }

    if (!formData.calculation_method_id) {
      errors.calculation_method_id = 'El método de cálculo es obligatorio';
    }

    // Validaciones numéricas
    if (formData.tolerance_minutes < 0) {
      errors.tolerance_minutes = 'La tolerancia debe ser >= 0';
    }

    if (formData.weight_value < 0) {
      errors.weight_value = 'El peso debe ser >= 0';
    }

    // Validación de external_mapping
    if (formData.external_mapping && formData.external_mapping.length > 60) {
      errors.external_mapping = 'La homologación no puede exceder 60 caracteres';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================================================
  // HANDLERS DE FORMULARIO
  // ============================================================================

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!profile?.tenant_id) {
      alert('Error: No se pudo obtener el tenant_id');
      return;
    }

    setSaving(true);

    try {
      const url = editingEvent
        ? `http://localhost:3001/attendance-events/${editingEvent.id}`
        : `http://localhost:3001/attendance-events`;

      const method = editingEvent ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        event_short_name: formData.event_short_name.toUpperCase(),
        tolerance_minutes: Number(formData.tolerance_minutes),
        weight_value: Number(formData.weight_value),
        external_mapping: formData.external_mapping.trim() || null,
        ...(editingEvent ? {} : { tenant_id: profile.tenant_id }),
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${publicApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setFormErrors({ event_short_name: 'Ya existe un evento con ese código' });
          return;
        }
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      await loadEvents();
      closeModal();

      alert(editingEvent ? 'Evento actualizado exitosamente' : 'Evento creado exitosamente');

    } catch (err) {
      console.error('[ATTENDANCE-EVENTS] Error guardando evento:', err);
      alert('Error al guardar el evento. Por favor, intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleToggleStatus = async (event: AttendanceEvent) => {
    try {
      const response = await fetch(
        `http://localhost:3001/attendance-events/${event.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${publicApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ is_active: !event.is_active }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await loadEvents();
    } catch (err) {
      console.error('[ATTENDANCE-EVENTS] Error actualizando estado:', err);
      alert('Error al actualizar el estado del evento');
    }
  };

  const handleExport = () => {
    // TODO: Implementar exportación a Excel/CSV
    alert('Exportación en desarrollo');
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando eventos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          <p className="font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Eventos de Asistencia</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los eventos de asistencia del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 gap-2"
          >
            <Download className="size-4" />
            Exportar
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#0074D9] text-white hover:bg-[#0074D9]/90 h-10 px-4 py-2 gap-2"
          >
            <Plus className="size-4" />
            Nuevo Evento
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-lg border bg-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Búsqueda */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nombre, código o homologación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {/* Filtro de Estado */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>

          {/* Filtro de Tipo */}
          <div>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">Todos los tipos</option>
              {eventTypes.map(type => (
                <option key={type.id} value={type.id}>{type.lookup_label}</option>
              ))}
            </select>
          </div>

          {/* Filtro de Movimiento */}
          <div>
            <select
              value={movementFilter}
              onChange={(e) => setMovementFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">Todos los movimientos</option>
              {movements.map(mov => (
                <option key={mov.id} value={mov.id}>{mov.movement_short_name} - {mov.movement_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Segunda fila de filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
          <div>
            <select
              value={transactionDirectionFilter}
              onChange={(e) => setTransactionDirectionFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">Todas las direcciones</option>
              {transactionDirections.map(dir => (
                <option key={dir.id} value={dir.id}>{dir.lookup_label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Código</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nombre</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tolerancia</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Peso</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Dir. Trx</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tipo</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Movimiento</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Homologación</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="h-24 text-center text-muted-foreground">
                    No se encontraron eventos
                  </td>
                </tr>
              ) : (
                filteredEvents.map(event => (
                  <tr key={event.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-4 align-middle">
                      <span className="font-mono font-semibold text-sm">{event.event_short_name}</span>
                    </td>
                    <td className="p-4 align-middle">{event.event_name}</td>
                    <td className="p-4 align-middle text-center">{event.tolerance_minutes} min</td>
                    <td className="p-4 align-middle text-center">{event.weight_value}</td>
                    <td className="p-4 align-middle">
                      <span className="font-mono text-xs font-semibold">{event.transaction_direction_key || '-'}</span>
                    </td>
                    <td className="p-4 align-middle">
                      <span className="font-mono text-xs font-semibold">{event.event_type_key || '-'}</span>
                    </td>
                    <td className="p-4 align-middle">
                      <span className="font-mono text-xs">{event.movement_code || '-'}</span>
                    </td>
                    <td className="p-4 align-middle">
                      <span className="text-xs text-muted-foreground">{event.external_mapping || '-'}</span>
                    </td>
                    <td className="p-4 align-middle">
                      {event.is_active ? (
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-700">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(event)}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8"
                          title="Editar"
                        >
                          <Edit2 className="size-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(event)}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8"
                          title={event.is_active ? 'Desactivar' : 'Activar'}
                        >
                          {event.is_active ? (
                            <PowerOff className="size-4 text-orange-600" />
                          ) : (
                            <Power className="size-4 text-green-600" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">Total Eventos</div>
          <div className="text-2xl font-bold mt-1">{events.length}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">Eventos Activos</div>
          <div className="text-2xl font-bold mt-1 text-green-600">
            {events.filter(e => e.is_active).length}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">Eventos Inactivos</div>
          <div className="text-2xl font-bold mt-1 text-gray-600">
            {events.filter(e => !e.is_active).length}
          </div>
        </div>
      </div>

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingEvent ? 'Editar Evento' : 'Nuevo Evento'}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-md p-2 hover:bg-accent transition-colors"
                disabled={saving}
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Información básica */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Información Básica</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nombre del evento */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      Nombre del Evento <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.event_name}
                      onChange={(e) => handleInputChange('event_name', e.target.value)}
                      maxLength={60}
                      className={`flex h-10 w-full rounded-md border ${formErrors.event_name ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                      placeholder="Ej: JORNADA LABORAL"
                    />
                    {formErrors.event_name && (
                      <p className="text-sm text-destructive mt-1">{formErrors.event_name}</p>
                    )}
                  </div>

                  {/* Código corto */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Código Corto <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.event_short_name}
                      onChange={(e) => handleInputChange('event_short_name', e.target.value.toUpperCase())}
                      maxLength={20}
                      className={`flex h-10 w-full rounded-md border ${formErrors.event_short_name ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono`}
                      placeholder="Ej: JOR"
                    />
                    {formErrors.event_short_name && (
                      <p className="text-sm text-destructive mt-1">{formErrors.event_short_name}</p>
                    )}
                  </div>

                  {/* Homologación externa */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Homologación Externa
                    </label>
                    <input
                      type="text"
                      value={formData.external_mapping}
                      onChange={(e) => handleInputChange('external_mapping', e.target.value)}
                      maxLength={60}
                      className={`flex h-10 w-full rounded-md border ${formErrors.external_mapping ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                      placeholder="Ej: ONC"
                    />
                    {formErrors.external_mapping && (
                      <p className="text-sm text-destructive mt-1">{formErrors.external_mapping}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Parámetros numéricos */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Parámetros</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tolerancia */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Tolerancia (minutos) <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.tolerance_minutes}
                      onChange={(e) => handleInputChange('tolerance_minutes', parseInt(e.target.value) || 0)}
                      className={`flex h-10 w-full rounded-md border ${formErrors.tolerance_minutes ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                    />
                    {formErrors.tolerance_minutes && (
                      <p className="text-sm text-destructive mt-1">{formErrors.tolerance_minutes}</p>
                    )}
                  </div>

                  {/* Peso */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Peso (%) <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.weight_value}
                      onChange={(e) => handleInputChange('weight_value', parseInt(e.target.value) || 0)}
                      className={`flex h-10 w-full rounded-md border ${formErrors.weight_value ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                    />
                    {formErrors.weight_value && (
                      <p className="text-sm text-destructive mt-1">{formErrors.weight_value}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Catálogos */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Clasificación</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Dirección de transacción */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Dirección de Transacción <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={formData.transaction_direction_id}
                      onChange={(e) => handleInputChange('transaction_direction_id', e.target.value)}
                      className={`flex h-10 w-full rounded-md border ${formErrors.transaction_direction_id ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <option value="">Seleccione...</option>
                      {transactionDirections.filter(d => d.is_active).map(dir => (
                        <option key={dir.id} value={dir.id}>{dir.lookup_label}</option>
                      ))}
                    </select>
                    {formErrors.transaction_direction_id && (
                      <p className="text-sm text-destructive mt-1">{formErrors.transaction_direction_id}</p>
                    )}
                  </div>

                  {/* Tipo de evento */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Tipo de Evento <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={formData.event_type_id}
                      onChange={(e) => handleInputChange('event_type_id', e.target.value)}
                      className={`flex h-10 w-full rounded-md border ${formErrors.event_type_id ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <option value="">Seleccione...</option>
                      {eventTypes.filter(t => t.is_active).map(type => (
                        <option key={type.id} value={type.id}>{type.lookup_label}</option>
                      ))}
                    </select>
                    {formErrors.event_type_id && (
                      <p className="text-sm text-destructive mt-1">{formErrors.event_type_id}</p>
                    )}
                  </div>

                  {/* Movimiento */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Movimiento <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={formData.movement_id}
                      onChange={(e) => handleInputChange('movement_id', e.target.value)}
                      className={`flex h-10 w-full rounded-md border ${formErrors.movement_id ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <option value="">Seleccione...</option>
                      {movements.filter(m => m.is_active).map(mov => (
                        <option key={mov.id} value={mov.id}>{mov.movement_short_name} - {mov.movement_name}</option>
                      ))}
                    </select>
                    {formErrors.movement_id && (
                      <p className="text-sm text-destructive mt-1">{formErrors.movement_id}</p>
                    )}
                  </div>

                  {/* Método de cálculo */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Método de Cálculo <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={formData.calculation_method_id}
                      onChange={(e) => handleInputChange('calculation_method_id', e.target.value)}
                      className={`flex h-10 w-full rounded-md border ${formErrors.calculation_method_id ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <option value="">Seleccione...</option>
                      {calculationMethods.filter(c => c.is_active).map(method => (
                        <option key={method.id} value={method.id}>{method.lookup_label}</option>
                      ))}
                    </select>
                    {formErrors.calculation_method_id && (
                      <p className="text-sm text-destructive mt-1">{formErrors.calculation_method_id}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Estado */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Estado</h3>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="w-4 h-4 text-primary bg-background border-input rounded focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
                    Evento activo
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#0074D9] text-white hover:bg-[#0074D9]/90 h-10 px-4 py-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Guardando...
                    </>
                  ) : (
                    editingEvent ? 'Actualizar Evento' : 'Crear Evento'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
