'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { publicApiToken } from '../../../utils/backend/info';

interface ProfileRow {
  id: string;
  profile_name: string;
  profile_short_name: string;
  employee_profile_code: string;
}

interface EventRow {
  id: string;
  event_name: string;
  event_short_name: string;
}

interface ProfileEventRow {
  id?: string;
  attendance_event_id: string;
  event_name?: string;
  event_short_name?: string;
  requires_approval: boolean;
  export_to_payroll: boolean;
  is_active?: boolean;
}

function getToken() {
  return localStorage.getItem('tt-access-token') || publicApiToken;
}

export function ProfileAttendanceEventsManagement() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);

  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [rows, setRows] = useState<ProfileEventRow[]>([]);

  const [newEventId, setNewEventId] = useState('');
  const [newRequiresApproval, setNewRequiresApproval] = useState(true);
  const [newExportToPayroll, setNewExportToPayroll] = useState(true);

  const request = async (path: string, init?: RequestInit) => {
    const response = await fetch(`http://localhost:3001${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
        ...(init?.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
    return payload;
  };

  const eventsById = useMemo(() => {
    const map = new Map<string, EventRow>();
    events.forEach((event) => map.set(event.id, event));
    return map;
  }, [events]);

  const availableEvents = useMemo(() => {
    const linked = new Set(rows.map((row) => row.attendance_event_id));
    return events.filter((event) => !linked.has(event.id));
  }, [events, rows]);

  const loadCatalogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await request('/profile-attendance-events/catalogs');
      const nextProfiles = (payload?.employee_profiles || []) as ProfileRow[];
      const nextEvents = (payload?.attendance_events || []) as EventRow[];

      setProfiles(nextProfiles);
      setEvents(nextEvents);

      if (!selectedProfileId && nextProfiles.length > 0) {
        setSelectedProfileId(nextProfiles[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Error cargando catálogos');
    } finally {
      setLoading(false);
    }
  };

  const loadProfileRows = async (profileId: string) => {
    if (!profileId) {
      setRows([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = await request(`/profile-attendance-events/profile/${profileId}`);
      setRows((payload?.items || []) as ProfileEventRow[]);
    } catch (err: any) {
      setError(err?.message || 'Error cargando novedades del perfil');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCatalogs();
  }, []);

  useEffect(() => {
    if (!selectedProfileId) return;
    void loadProfileRows(selectedProfileId);
  }, [selectedProfileId]);

  useEffect(() => {
    if (!newEventId && availableEvents.length > 0) {
      setNewEventId(availableEvents[0].id);
    }
    if (availableEvents.length === 0) {
      setNewEventId('');
    }
  }, [availableEvents, newEventId]);

  const addEventRow = () => {
    if (!newEventId) return;
    const event = eventsById.get(newEventId);
    if (!event) return;

    setRows((prev) => [
      ...prev,
      {
        attendance_event_id: event.id,
        event_name: event.event_name,
        event_short_name: event.event_short_name,
        requires_approval: newRequiresApproval,
        export_to_payroll: newExportToPayroll,
        is_active: true,
      },
    ]);
  };

  const removeEventRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleRequiresApproval = (index: number, value: boolean) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, requires_approval: value } : row))
    );
  };

  const toggleExportToPayroll = (index: number, value: boolean) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, export_to_payroll: value } : row))
    );
  };

  const saveChanges = async () => {
    if (!selectedProfileId) {
      setError('Debe seleccionar un perfil.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        items: rows.map((row) => ({
          attendance_event_id: row.attendance_event_id,
          requires_approval: row.requires_approval,
          export_to_payroll: row.export_to_payroll,
          is_active: true,
        })),
      };

      await request(`/profile-attendance-events/profile/${selectedProfileId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setSuccess('Cambios guardados correctamente.');
      await loadProfileRows(selectedProfileId);
    } catch (err: any) {
      setError(err?.message || 'Error guardando novedades por perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novedades por Perfil</h1>
          <p className="text-muted-foreground mt-1">
            Asigne eventos de asistencia al perfil con reglas de aprobación y exportación a nómina.
          </p>
        </div>
        <button
          onClick={() => {
            void loadCatalogs();
            if (selectedProfileId) void loadProfileRows(selectedProfileId);
          }}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
        >
          <RefreshCw className="size-4" />
          Recargar
        </button>
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

      <div className="rounded-lg border bg-white p-5">
        <label className="text-sm font-medium">Perfil de Empleado</label>
        <select
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm md:max-w-xl"
          value={selectedProfileId}
          onChange={(event) => {
            setSelectedProfileId(event.target.value);
            setSuccess(null);
          }}
        >
          <option value="">Seleccione un perfil...</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.profile_name} ({profile.profile_short_name || profile.employee_profile_code})
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border bg-white p-5 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Novedades del Perfil</h2>
          <p className="text-sm text-gray-600">Agregue o quite novedades con los botones de acción.</p>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[2fr_auto_auto_auto] md:items-end">
          <div>
            <label className="text-sm font-medium">Novedad (attendance_events)</label>
            <select
              value={newEventId}
              onChange={(event) => setNewEventId(event.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              disabled={availableEvents.length === 0}
            >
              <option value="">Seleccione novedad...</option>
              {availableEvents.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.event_name} ({event.event_short_name})
                </option>
              ))}
            </select>
          </div>

          <label className="inline-flex items-center gap-2 text-sm md:mb-2">
            <input
              type="checkbox"
              checked={newRequiresApproval}
              onChange={(event) => setNewRequiresApproval(event.target.checked)}
            />
            Requiere aprobación
          </label>

          <label className="inline-flex items-center gap-2 text-sm md:mb-2">
            <input
              type="checkbox"
              checked={newExportToPayroll}
              onChange={(event) => setNewExportToPayroll(event.target.checked)}
            />
            Se Exporta a Nómina?
          </label>

          <button
            type="button"
            onClick={addEventRow}
            disabled={!newEventId}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-emerald-200 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            title="Agregar novedad"
          >
            Agregar
          </button>
        </div>

        <div className="overflow-auto rounded-md border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="px-3 py-2 text-left">Novedad</th>
                <th className="px-3 py-2 text-left">Requiere aprobación</th>
                <th className="px-3 py-2 text-left">Se Exporta a Nómina?</th>
                <th className="px-3 py-2 text-left">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-500">Cargando...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-500">Sin novedades asignadas al perfil.</td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const event = eventsById.get(row.attendance_event_id);
                  return (
                    <tr key={`${row.attendance_event_id}-${index}`} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        <div className="font-medium">{event?.event_name || row.event_name || row.attendance_event_id}</div>
                        <div className="text-xs text-gray-500">{event?.event_short_name || row.event_short_name || '-'}</div>
                      </td>
                      <td className="px-3 py-2">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={row.requires_approval}
                            onChange={(event) => toggleRequiresApproval(index, event.target.checked)}
                          />
                          <span>{row.requires_approval ? 'Sí' : 'No'}</span>
                        </label>
                      </td>
                      <td className="px-3 py-2">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={row.export_to_payroll}
                            onChange={(event) => toggleExportToPayroll(index, event.target.checked)}
                          />
                          <span>{row.export_to_payroll ? 'Sí' : 'No'}</span>
                        </label>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeEventRow(index)}
                          className="inline-flex items-center justify-center gap-1 rounded border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50"
                          title="Quitar novedad"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => void saveChanges()}
            disabled={saving || !selectedProfileId}
            className="inline-flex items-center gap-2 rounded-md bg-[#0074D9] px-4 py-2 text-sm text-white hover:bg-[#0066C0] disabled:opacity-50"
          >
            <Save className="size-4" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
