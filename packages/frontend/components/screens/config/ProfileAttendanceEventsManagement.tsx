'use client';

import { buildApiUrl } from '../../../utils/api-config';
import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Plus, Save, Search, Trash2 } from 'lucide-react';
import { publicApiToken } from '../../../utils/backend/info';
import SystemAdminPageHeader from '../../shared/SystemAdminPageHeader';
import HeaderInfoTips from '../../shared/HeaderInfoTips';
import HeaderRefreshButton from '../../shared/HeaderRefreshButton';
import GridActionIconButton from '../../shared/GridActionIconButton';

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

  const request = async (path: string, init?: RequestInit) => {
    const response = await fetch(buildApiUrl(`${path}`), {
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
        requires_approval: false,
        export_to_payroll: false,
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
    <div className="p-6 max-w-full space-y-6">
      <SystemAdminPageHeader
        icon={CalendarCheck}
        title="Novedades por Perfil"
        subtitle="Asigne eventos de asistencia al perfil con reglas de aprobación y exportación a nómina."
        rightSlot={(
          <>
            <HeaderInfoTips
              items={[
                {
                  title: 'Tip',
                  text: 'Agregue la novedad al perfil y marque en la grilla si requiere aprobación o exportación a nómina.',
                  variant: 'tip',
                },
              ]}
            />
            <HeaderRefreshButton
              onClick={() => {
                void loadCatalogs();
                if (selectedProfileId) void loadProfileRows(selectedProfileId);
              }}
            />
          </>
        )}
      />

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

      <div className="rounded-lg border bg-white p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_2fr_auto]">
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
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

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <select
              value={newEventId}
              onChange={(event) => setNewEventId(event.target.value)}
              className="w-full rounded-md border py-2 pl-9 pr-3 text-sm"
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

          <button
            type="button"
            onClick={addEventRow}
            disabled={!newEventId}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0074D9] px-3 py-2 text-sm font-medium text-white hover:bg-[#0066C0] disabled:cursor-not-allowed disabled:opacity-50"
            title="Agregar novedad"
          >
            <Plus className="size-4" />
            Agregar
          </button>
        </div>
        <div className="mt-3 text-sm text-gray-600">Mostrando {rows.length} de {rows.length} novedades</div>
      </div>

      <div className="rounded-lg border bg-white p-5 space-y-4">
        <div className="overflow-auto rounded-md border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="px-3 py-2 text-left">Novedad</th>
                <th className="px-3 py-2 text-center">Requiere aprobación</th>
                <th className="px-3 py-2 text-center">Se exporta a nómina</th>
                <th className="px-3 py-2 text-center">Acciones</th>
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
                      <td className="px-3 py-2 text-center">
                        <label className="inline-flex items-center justify-center gap-2">
                          <input
                            type="checkbox"
                            checked={row.requires_approval}
                            onChange={(event) => toggleRequiresApproval(index, event.target.checked)}
                          />
                        </label>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <label className="inline-flex items-center justify-center gap-2">
                          <input
                            type="checkbox"
                            checked={row.export_to_payroll}
                            onChange={(event) => toggleExportToPayroll(index, event.target.checked)}
                          />
                        </label>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center">
                          <GridActionIconButton
                            type="button"
                            onClick={() => removeEventRow(index)}
                            icon={<Trash2 className="size-4" />}
                            label="Eliminar"
                            title="Eliminar novedad"
                            tone="red"
                          />
                        </div>
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
            className="inline-flex items-center gap-2 rounded-md bg-[#2ECC71] px-4 py-2 text-sm font-medium text-white hover:bg-[#29B765] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="size-4" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

