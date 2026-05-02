'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Coffee,
  CheckCircle2,
  CircleX,
  Clock3,
  Filter,
  Lightbulb,
  Moon,
  RefreshCw,
  Save,
  Settings,
  Sparkles,
  Sun,
  Sunset,
  Users,
} from 'lucide-react';
import { publicApiToken } from '../../../utils/backend/info';

type ShiftPlanRow = {
  id: string;
  employee_id: string;
  shift_id: string;
  shift_date: string;
  shift_type_id: string | null;
  company_id: string;
};

type EmployeeRow = {
  id: string;
  employee_code: string;
  employee_name: string;
  employee_lastname: string;
  company_id: string | null;
  company_name: string | null;
};

type ShiftRow = {
  id: string;
  company_id: string;
  shift_name: string;
  shift_short_name: string;
};

type ShiftTypeRow = {
  id: string;
  lookup_key: string;
  lookup_label: string;
};

type CatalogsResponse = {
  employees: EmployeeRow[];
  shifts: ShiftRow[];
  shift_types: ShiftTypeRow[];
};

type DayCellChange = {
  employee_id: string;
  shift_date: string;
  shift_id: string | null;
  shift_type_id: string | null;
  company_id: string | null;
};

type ViewMode = 'employees' | 'shifts';
type ShiftKind = 'M' | 'T' | 'N' | 'L' | 'O';

type Suggestion = {
  id: string;
  kind: 'fatiga' | 'descanso' | 'dotacion';
  severity: 'high' | 'medium';
  text: string;
  recommendation: string;
  apply: () => void;
};

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

const KIND_META: Record<ShiftKind, { label: string; color: string; bg: string; Icon: any }> = {
  M: { label: 'Turno Mañana', color: '#0074D9', bg: '#E3F2FD', Icon: Sun },
  T: { label: 'Turno Tarde', color: '#FF6B35', bg: '#FFF3E0', Icon: Sunset },
  N: { label: 'Turno Noche', color: '#5E35B1', bg: '#EDE7F6', Icon: Moon },
  L: { label: 'Libre', color: '#9CA3AF', bg: '#F3F4F6', Icon: Coffee },
  O: { label: 'Otro', color: '#6B7280', bg: '#F3F4F6', Icon: Clock3 },
};

function getToken() {
  return localStorage.getItem('tt-access-token') || publicApiToken;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date): Date {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDayMonth(dateIso: string): string {
  const [year, month, day] = dateIso.split('-');
  return `${day}/${month}`;
}

function parseIsoDate(value: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function diffDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / 86400000);
}

function keyOf(employeeId: string, dateIso: string): string {
  return `${employeeId}::${dateIso}`;
}

function classifyShift(shift: ShiftRow): ShiftKind {
  const text = `${shift.shift_short_name} ${shift.shift_name}`.toUpperCase();
  if (text.includes('LIBRE') || text.includes('DESCANSO') || text.includes('OFF') || text.includes('REST')) return 'L';
  if (text.includes('NOCHE') || text.includes('NOC') || text.includes('N ')) return 'N';
  if (text.includes('TARDE') || text.includes('VES') || text.includes('T ')) return 'T';
  if (text.includes('MANANA') || text.includes('MAÑANA') || text.includes('MAT') || text.includes('M ')) return 'M';
  return 'O';
}

export function EmployeeShiftPlanningManagement() {
  const initialStart = startOfWeek(new Date());
  const initialEnd = addDays(initialStart, 6);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftTypeRow[]>([]);
  const [plans, setPlans] = useState<ShiftPlanRow[]>([]);
  const [changes, setChanges] = useState<Record<string, DayCellChange>>({});

  const [dotacionM, setDotacionM] = useState(3);
  const [dotacionT, setDotacionT] = useState(3);
  const [dotacionN, setDotacionN] = useState(3);
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [diasTrabajo, setDiasTrabajo] = useState(5);
  const [diasLibres, setDiasLibres] = useState(2);

  const [reglaEvitarNM, setReglaEvitarNM] = useState(true);
  const [reglaEquidad, setReglaEquidad] = useState(true);
  const [reglaFeriados, setReglaFeriados] = useState(true);
  const [reglaSwaps, setReglaSwaps] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>('employees');
  const [ignoredSuggestionIds, setIgnoredSuggestionIds] = useState<Record<string, true>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [fechaInicio, setFechaInicio] = useState(() => toIsoDate(initialStart));
  const [fechaFin, setFechaFin] = useState(() => toIsoDate(initialEnd));

  const rangeDays = useMemo(() => {
    const start = parseIsoDate(fechaInicio);
    const end = parseIsoDate(fechaFin);
    if (!start || !end || end < start) return [];

    const days: Date[] = [];
    const total = Math.min(62, diffDays(start, end) + 1);
    for (let i = 0; i < total; i += 1) {
      days.push(addDays(start, i));
    }
    return days;
  }, [fechaInicio, fechaFin]);

  const rangeFrom = rangeDays[0] ? toIsoDate(rangeDays[0]) : fechaInicio;
  const rangeTo = rangeDays[rangeDays.length - 1] ? toIsoDate(rangeDays[rangeDays.length - 1]) : fechaFin;

  const plansByKey = useMemo(() => {
    const map = new Map<string, ShiftPlanRow>();
    plans.forEach((plan) => map.set(keyOf(plan.employee_id, plan.shift_date), plan));
    return map;
  }, [plans]);

  const shiftsById = useMemo(() => {
    const map = new Map<string, ShiftRow>();
    shifts.forEach((shift) => map.set(shift.id, shift));
    return map;
  }, [shifts]);

  const areaOptions = useMemo(() => {
    return Array.from(new Set(employees.map((item) => item.company_name || '').filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const workGroupOptions = useMemo(() => areaOptions, [areaOptions]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const areaOk = areaFilter === 'ALL' || employee.company_name === areaFilter;
      const groupOk = groupFilter === 'ALL' || employee.company_name === groupFilter;
      return areaOk && groupOk;
    });
  }, [employees, areaFilter, groupFilter]);

  const shiftOptionsByCompany = useMemo(() => {
    const map = new Map<string, ShiftRow[]>();
    shifts.forEach((shift) => {
      const key = shift.company_id || 'GLOBAL';
      const list = map.get(key) || [];
      list.push(shift);
      map.set(key, list);
    });
    map.forEach((list) => list.sort((a, b) => classifyShift(a).localeCompare(classifyShift(b)) || a.shift_name.localeCompare(b.shift_name)));
    return map;
  }, [shifts]);

  const shiftIdByCompanyAndKind = useMemo(() => {
    const map = new Map<string, Partial<Record<ShiftKind, string>>>();
    shifts.forEach((shift) => {
      const companyKey = shift.company_id || 'GLOBAL';
      const current = map.get(companyKey) || {};
      const kind = classifyShift(shift);
      if (!current[kind]) current[kind] = shift.id;
      map.set(companyKey, current);
    });
    return map;
  }, [shifts]);

  const shiftTypeIdByKind = useMemo(() => {
    const map: Partial<Record<ShiftKind, string>> = {};
    shiftTypes.forEach((item) => {
      const key = item.lookup_key.toUpperCase();
      if (key === 'MORNING') map.M = item.id;
      if (key === 'AFTERNOON') map.T = item.id;
      if (key === 'NIGHT') map.N = item.id;
    });
    return map;
  }, [shiftTypes]);

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

  const loadCatalogs = async () => {
    const payload = (await request('/employee-shift-planning/catalogs')) as CatalogsResponse;
    setEmployees(payload.employees || []);
    setShifts(payload.shifts || []);
    setShiftTypes(payload.shift_types || []);
  };

  const loadPlans = async () => {
    const payload = await request(`/employee-shift-planning/plans?date_from=${rangeFrom}&date_to=${rangeTo}`);
    setPlans(payload.plans || []);
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadCatalogs(), loadPlans()]);
    } catch (err: any) {
      setError(err?.message || 'Error cargando Planificación');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (rangeDays.length === 0) {
      setPlans([]);
      setError('Rango de fechas invalido. Ajuste Fecha Inicio y Fecha Fin.');
      return;
    }
    void loadAll();
  }, [rangeFrom, rangeTo, rangeDays.length]);

  const getPatternKind = (employee: EmployeeRow, dateIso: string): ShiftKind => {
    const start = parseIsoDate(fechaInicio);
    const current = parseIsoDate(dateIso);
    if (!start || !current) return 'L';

    const workDays = Math.max(1, diasTrabajo);
    const freeDays = Math.max(0, diasLibres);
    const cycleLength = workDays + freeDays;
    if (cycleLength <= 0) return 'L';

    const employeeIndex = filteredEmployees.findIndex((item) => item.id === employee.id);
    const shiftOffset = employeeIndex >= 0 ? employeeIndex : 0;
    const dayOffset = diffDays(start, current);
    const cyclePosition = ((dayOffset + shiftOffset) % cycleLength + cycleLength) % cycleLength;

    if (cyclePosition >= workDays) return 'L';
    const workStep = (dayOffset + shiftOffset) % 3;
    return (['M', 'T', 'N'] as ShiftKind[])[(workStep + 3) % 3];
  };

  const getShiftIdByKind = (employee: EmployeeRow, kind: ShiftKind): string | null => {
    const companyKey = employee.company_id || 'GLOBAL';
    const byCompany = shiftIdByCompanyAndKind.get(companyKey);
    const byGlobal = shiftIdByCompanyAndKind.get('GLOBAL');
    return byCompany?.[kind] || byGlobal?.[kind] || null;
  };

  const cellShiftId = (employee: EmployeeRow, dateIso: string): string | null => {
    const change = changes[keyOf(employee.id, dateIso)];
    if (change) return change.shift_id;
    const planShiftId = plansByKey.get(keyOf(employee.id, dateIso))?.shift_id || null;
    if (planShiftId) return planShiftId;

    const patternKind = getPatternKind(employee, dateIso);
    return getShiftIdByKind(employee, patternKind);
  };

  const cellKind = (employee: EmployeeRow, dateIso: string): ShiftKind => {
    const shiftId = cellShiftId(employee, dateIso);
    if (!shiftId) return 'L';
    const shift = shiftsById.get(shiftId);
    if (!shift) return 'L';
    return classifyShift(shift);
  };

  const buildCycleOptions = (employee: EmployeeRow): (string | null)[] => {
    const options = employee.company_id
      ? (shiftOptionsByCompany.get(employee.company_id) || shifts)
      : shifts;

    const sortedByKind = [...options].sort((a, b) => {
      const aKind = classifyShift(a);
      const bKind = classifyShift(b);
      return aKind.localeCompare(bKind) || a.shift_name.localeCompare(b.shift_name);
    });

    return [null, ...sortedByKind.map((item) => item.id)];
  };

  const setCellShift = (employee: EmployeeRow, dateIso: string, shiftId: string | null) => {
    if (confirmed) return;

    const plan = plansByKey.get(keyOf(employee.id, dateIso));
    const originalShiftId = plan?.shift_id || null;

    if (originalShiftId === shiftId) {
      setChanges((prev) => {
        const copy = { ...prev };
        delete copy[keyOf(employee.id, dateIso)];
        return copy;
      });
      return;
    }

    let shiftTypeId: string | null = null;
    if (shiftId) {
      const shift = shiftsById.get(shiftId);
      if (shift) {
        const kind = classifyShift(shift);
        shiftTypeId = shiftTypeIdByKind[kind] || null;
      }
    }

    setChanges((prev) => ({
      ...prev,
      [keyOf(employee.id, dateIso)]: {
        employee_id: employee.id,
        shift_date: dateIso,
        shift_id: shiftId,
        shift_type_id: shiftTypeId,
        company_id: employee.company_id,
      },
    }));
  };

  const cycleCell = (employee: EmployeeRow, dateIso: string) => {
    const options = buildCycleOptions(employee);
    const current = cellShiftId(employee, dateIso);
    const index = options.findIndex((value) => value === current);
    const next = options[(index + 1) % options.length];
    setCellShift(employee, dateIso, next || null);
  };

  const pendingPersistChanges = useMemo<DayCellChange[]>(() => {
    const next: DayCellChange[] = [];

    filteredEmployees.forEach((employee) => {
      rangeDays.forEach((day) => {
        const dateIso = toIsoDate(day);
        const existingShiftId = plansByKey.get(keyOf(employee.id, dateIso))?.shift_id || null;
        const effectiveShiftId = cellShiftId(employee, dateIso);

        if (existingShiftId === effectiveShiftId) return;
        if (!existingShiftId && !effectiveShiftId) return;

        let shiftTypeId: string | null = null;
        if (effectiveShiftId) {
          const shift = shiftsById.get(effectiveShiftId);
          if (shift) {
            shiftTypeId = shiftTypeIdByKind[classifyShift(shift)] || null;
          }
        }

        next.push({
          employee_id: employee.id,
          shift_date: dateIso,
          shift_id: effectiveShiftId,
          shift_type_id: shiftTypeId,
          company_id: employee.company_id,
        });
      });
    });

    return next;
  }, [filteredEmployees, rangeDays, plansByKey, changes, shiftsById, shiftTypeIdByKind, fechaInicio, diasTrabajo, diasLibres]);

  const saveChanges = async () => {
    const pending = pendingPersistChanges;
    if (pending.length === 0) {
      setSuccess('No hay cambios por guardar.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await request('/employee-shift-planning/plans/bulk', {
        method: 'POST',
        body: JSON.stringify({ changes: pending }),
      });
      setChanges({});
      setSuccess('Planificación guardada correctamente.');
      await loadPlans();
    } catch (err: any) {
      setError(err?.message || 'Error guardando Planificación');
    } finally {
      setSaving(false);
    }
  };

  const resetPlan = async () => {
    setChanges({});
    setConfirmed(false);
    setSuccess(null);
    setError(null);
    await loadPlans();
  };

  const confirmPlan = async () => {
    await saveChanges();
    setConfirmed(true);
  };

  const totalsByKind = useMemo(() => {
    const totals: Record<ShiftKind, number> = { M: 0, T: 0, N: 0, L: 0, O: 0 };
    filteredEmployees.forEach((employee) => {
      rangeDays.forEach((day) => {
        totals[cellKind(employee, toIsoDate(day))] += 1;
      });
    });
    return totals;
  }, [filteredEmployees, rangeDays, plansByKey, changes, shiftsById]);

  const countByDayAndKind = useMemo(() => {
    const result: Record<string, Record<ShiftKind, number>> = {};
    rangeDays.forEach((day) => {
      const dateIso = toIsoDate(day);
      result[dateIso] = { M: 0, T: 0, N: 0, L: 0, O: 0 };
      filteredEmployees.forEach((employee) => {
        result[dateIso][cellKind(employee, dateIso)] += 1;
      });
    });
    return result;
  }, [rangeDays, filteredEmployees, plansByKey, changes, shiftsById]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const list: Suggestion[] = [];

    filteredEmployees.forEach((employee) => {
      let consecutive = 0;
      for (const day of rangeDays) {
        const dateIso = toIsoDate(day);
        const kind = cellKind(employee, dateIso);
        if (kind === 'M' || kind === 'T' || kind === 'N' || kind === 'O') {
          consecutive += 1;
        } else {
          consecutive = 0;
        }

        if (consecutive >= 5) {
          const id = `fatiga-${employee.id}-${dateIso}`;
          list.push({
            id,
            kind: 'fatiga',
            severity: 'high',
            text: `Empleado ${employee.employee_code} tiene ${consecutive} dias consecutivos de trabajo.`,
            recommendation: `Convertir ${formatDayMonth(dateIso)} en libre para reducir fatiga.`,
            apply: () => setCellShift(employee, dateIso, null),
          });
          break;
        }
      }
    });

    rangeDays.forEach((day) => {
      const dateIso = toIsoDate(day);
      if (countByDayAndKind[dateIso].N < dotacionN) {
        const candidate = filteredEmployees.find((employee) => cellKind(employee, dateIso) === 'L');
        if (candidate) {
          const nightShift = shifts.find((shift) => classifyShift(shift) === 'N' && (!candidate.company_id || shift.company_id === candidate.company_id));
          if (nightShift) {
            list.push({
              id: `dotacion-n-${candidate.id}-${dateIso}`,
              kind: 'dotacion',
              severity: 'medium',
              text: `Dotación incompleta en turno Noche del ${formatDayMonth(dateIso)} (objetivo ${dotacionN}).`,
              recommendation: `Reasignar ${candidate.employee_code} a turno Noche.`,
              apply: () => setCellShift(candidate, dateIso, nightShift.id),
            });
          }
        }
      }
    });

    return list.filter((item) => !ignoredSuggestionIds[item.id]).slice(0, 6);
  }, [filteredEmployees, rangeDays, dotacionN, countByDayAndKind, ignoredSuggestionIds, shifts, plansByKey, changes]);

  const alerts = useMemo(() => {
    const issues: string[] = [];
    rangeDays.forEach((day) => {
      const dateIso = toIsoDate(day);
      if (countByDayAndKind[dateIso].M < dotacionM) issues.push(`Dotación baja en Mañana ${formatDayMonth(dateIso)}.`);
      if (countByDayAndKind[dateIso].T < dotacionT) issues.push(`Dotación baja en Tarde ${formatDayMonth(dateIso)}.`);
      if (countByDayAndKind[dateIso].N < dotacionN) issues.push(`Dotación baja en Noche ${formatDayMonth(dateIso)}.`);
    });
    return issues.slice(0, 5);
  }, [rangeDays, countByDayAndKind, dotacionM, dotacionT, dotacionN]);

  const pendingChanges = pendingPersistChanges.length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[40px] font-semibold leading-none tracking-tight">Planificación 24/7 IA</h1>
        <p className="text-muted-foreground mt-2">Gestión de empleados, marcaciones y justificaciones</p>
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

      <div className="grid grid-cols-12 gap-4">        <div className="col-span-12 xl:col-span-3 space-y-4">
          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-xl font-semibold">
              <Filter className="size-4" />
              Filtros de Empleados
            </div>
            <div className="mb-4 text-sm text-gray-600">Solo empleados de turnos rotativos</div>

            <div className="space-y-3 border-b pb-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Área</label>
                <select
                  value={areaFilter}
                  onChange={(event) => setAreaFilter(event.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="ALL">Todas las áreas</option>
                  {areaOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Grupo de Trabajo</label>
                <select
                  value={groupFilter}
                  onChange={(event) => setGroupFilter(event.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="ALL">Todos los grupos</option>
                  {workGroupOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between text-sm">
              <span className="text-gray-600">Empleados seleccionados:</span>
              <span className="font-semibold text-gray-900">{filteredEmployees.length}</span>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-xl font-semibold">
              <Settings className="size-4" />
              Parámetros
            </div>
            <div className="mb-4 text-sm text-gray-600">Configuración de planificación</div>

            <div className="space-y-2 border-b pb-3">
              <div className="flex items-center gap-3">
                <label className="w-24 text-sm font-medium">Fecha Inicio</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(event) => {
                    const value = event.target.value;
                    setFechaInicio(value);
                    if (fechaFin && value && value > fechaFin) {
                      setFechaFin(value);
                    }
                  }}
                  className="flex-1 rounded-xl border px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="w-24 text-sm font-medium">Fecha Fin</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (fechaInicio && value && value < fechaInicio) {
                      setFechaInicio(value);
                    }
                    setFechaFin(value);
                  }}
                  className="flex-1 rounded-xl border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Esquema Trabajo/Libre</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">Días Trabajo</label>
                    <input
                      type="number"
                      min={1}
                      value={diasTrabajo}
                      onChange={(event) => setDiasTrabajo(Math.max(1, Number(event.target.value || 1)))}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-600">Días Libres</label>
                    <input
                      type="number"
                      min={0}
                      value={diasLibres}
                      onChange={(event) => setDiasLibres(Math.max(0, Number(event.target.value || 0)))}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600">Esquema actual: {diasTrabajo}/{diasLibres}</div>
              </div>
            </div>

            <button
              onClick={() => {
                setDiasTrabajo(5);
                setDiasLibres(2);
              }}
              className="mt-3 w-full rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Restablecer por defecto (5/2)
            </button>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-xl font-semibold">
              <Users className="size-4" />
              Dotación Requerida
            </div>
            <div className="mb-3 text-sm text-gray-600">Empleados por turno (mín. 1)</div>
            <div className="space-y-2">
              {(['M', 'T', 'N'] as ShiftKind[]).map((kind) => {
                const meta = KIND_META[kind];
                const value = kind === 'M' ? dotacionM : kind === 'T' ? dotacionT : dotacionN;
                const setValue = kind === 'M' ? setDotacionM : kind === 'T' ? setDotacionT : setDotacionN;
                const Icon = meta.Icon;
                return (
                  <div key={kind} className="flex items-center gap-3">
                    <div className="flex min-w-[130px] items-center gap-2 text-sm font-medium">
                      <Icon className="size-4" style={{ color: meta.color }} />
                      {meta.label}
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={value}
                      onChange={(event) => setValue(Math.max(0, Number(event.target.value || 0)))}
                      className="flex-1 rounded-xl border px-3 py-2 text-sm"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-xl font-semibold">
              <Sparkles className="size-4" /> Reglas de IA
            </div>
            <div className="space-y-3 text-sm">
              <label className="flex items-center justify-between"><span>Evitar turno N → M</span><input type="checkbox" checked={reglaEvitarNM} onChange={(e) => setReglaEvitarNM(e.target.checked)} /></label>
              <label className="flex items-center justify-between"><span>Priorizar equidad en horas</span><input type="checkbox" checked={reglaEquidad} onChange={(e) => setReglaEquidad(e.target.checked)} /></label>
              <label className="flex items-center justify-between"><span>Equilibrar feriados</span><input type="checkbox" checked={reglaFeriados} onChange={(e) => setReglaFeriados(e.target.checked)} /></label>
              <label className="flex items-center justify-between"><span>Permitir swaps</span><input type="checkbox" checked={reglaSwaps} onChange={(e) => setReglaSwaps(e.target.checked)} /></label>
            </div>
          </div>

          <button
            onClick={() => void saveChanges()}
            disabled={saving || pendingChanges === 0}
            className="w-full rounded-xl bg-[#2D7FF9] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1F6DE2] disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2">
              <Save className="size-4" />
              {saving ? 'Guardando...' : `Guardar cambios (${pendingChanges})`}
            </span>
          </button>

          <button
            onClick={() => void confirmPlan()}
            disabled={saving || pendingChanges === 0}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              {saving ? 'Guardando...' : 'Confirmar planificación'}
            </span>
          </button>

          <button
            onClick={() => void resetPlan()}
            className="w-full rounded-xl border px-4 py-3 text-sm font-semibold hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2"><RefreshCw className="size-4" /> Reiniciar</span>
          </button>
        </div>

        <div className="col-span-12 xl:col-span-6"> 
          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-2xl font-semibold">Planificación de Turnos 24/7</div>
                <div className="mt-1 inline-flex items-center gap-2 rounded-full border bg-gray-50 px-3 py-1 text-sm">
                  <Clock3 className="size-4" />
                  {confirmed ? 'Confirmada' : 'Simulación - No confirmada'}
                </div>
              </div>
              <div className="rounded-full bg-gray-100 p-1 text-sm">
                <button
                  className={`rounded-full px-3 py-1 ${viewMode === 'employees' ? 'bg-white shadow' : ''}`}
                  onClick={() => setViewMode('employees')}
                >Empleado x Dia</button>
                <button
                  className={`rounded-full px-3 py-1 ${viewMode === 'shifts' ? 'bg-white shadow' : ''}`}
                  onClick={() => setViewMode('shifts')}
                >Turnos por Dia</button>
              </div>
            </div>

            <div className="overflow-auto rounded-xl border">
              {loading ? (
                <div className="px-4 py-10 text-center text-sm text-gray-500">Cargando Planificación...</div>
              ) : viewMode === 'employees' ? (
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left min-w-[220px]">Empleado</th>
                      {rangeDays.map((day) => {
                        const dateIso = toIsoDate(day);
                        return (
                          <th key={dateIso} className="px-2 py-2 text-center min-w-[86px]">
                            <div className="font-semibold">{DAY_NAMES[day.getDay()]}</div>
                            <div className="text-xs text-gray-500">{formatDayMonth(dateIso)}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((employee) => (
                      <tr key={employee.id} className="border-t">
                        <td className="px-3 py-2 align-top">
                          <div className="font-medium">{employee.employee_code} - {employee.employee_lastname} {employee.employee_name}</div>
                          <div className="mt-1 inline-flex rounded-full bg-blue-600 px-2 py-0.5 text-[10px] text-white">{pendingChanges > 0 ? 'No cumple' : 'Cumple'}</div>
                        </td>
                        {rangeDays.map((day) => {
                          const dateIso = toIsoDate(day);
                          const kind = cellKind(employee, dateIso);
                          const meta = KIND_META[kind];
                          const Icon = meta.Icon;
                          return (
                            <td key={dateIso} className="px-1 py-1">
                              <button
                                onClick={() => cycleCell(employee, dateIso)}
                                disabled={confirmed}
                                className="flex h-10 w-full items-center justify-center rounded-md border"
                                style={{ backgroundColor: meta.bg, borderColor: '#E5E7EB' }}
                                title={meta.label}
                              >
                                <Icon className="size-4" style={{ color: meta.color }} />
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left min-w-[180px]">Turno</th>
                      {rangeDays.map((day) => {
                        const dateIso = toIsoDate(day);
                        return (
                          <th key={dateIso} className="px-2 py-2 text-center min-w-[86px]">
                            <div className="font-semibold">{DAY_NAMES[day.getDay()]}</div>
                            <div className="text-xs text-gray-500">{formatDayMonth(dateIso)}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {(['M', 'T', 'N', 'L'] as ShiftKind[]).map((kind) => {
                      const meta = KIND_META[kind];
                      const Icon = meta.Icon;
                      return (
                        <tr key={kind} className="border-t">
                          <td className="px-3 py-2 font-medium">
                            <span className="inline-flex items-center gap-2"><Icon className="size-4" style={{ color: meta.color }} /> {meta.label}</span>
                          </td>
                          {rangeDays.map((day) => {
                            const dateIso = toIsoDate(day);
                            const value = countByDayAndKind[dateIso][kind];
                            const target = kind === 'M' ? dotacionM : kind === 'T' ? dotacionT : kind === 'N' ? dotacionN : 0;
                            const warn = target > 0 && value < target;
                            return (
                              <td key={dateIso} className="px-2 py-2 text-center">
                                <span className={`inline-flex min-w-10 justify-center rounded-md px-2 py-1 text-xs ${warn ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                  {value}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-3 text-xs text-gray-600">
              Pendiente por guardar: <strong>{pendingChanges}</strong>
            </div>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-3 space-y-4">
          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-1 flex items-center gap-2 text-xl font-semibold"><Lightbulb className="size-5" /> Sugerencias de IA</div>
            <div className="mb-3 text-sm text-gray-600">{suggestions.length} recomendaciones</div>

            <div className="space-y-3">
              {suggestions.length === 0 ? (
                <div className="rounded-xl border bg-gray-50 px-3 py-2 text-sm text-gray-600">Sin sugerencias activas.</div>
              ) : suggestions.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 ${
                    item.kind === 'dotacion'
                      ? 'border-blue-200 bg-blue-50'
                      : item.severity === 'high'
                        ? 'border-red-200 bg-red-50'
                        : 'border-amber-200 bg-amber-50'
                  }`}
                >
                  <div className="mb-2 flex items-start gap-2 text-sm">
                    {item.kind === 'dotacion' ? (
                      <Users className="mt-0.5 size-4 text-blue-600" />
                    ) : (
                      <AlertTriangle className={`mt-0.5 size-4 ${item.severity === 'high' ? 'text-red-600' : 'text-amber-600'}`} />
                    )}
                    <span>{item.text}</span>
                  </div>
                  <div className="mb-3 text-xs text-gray-600"><strong>Sugerencia:</strong> {item.recommendation}</div>
                  <div className="flex items-center gap-2">
                    <button
                      className="inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1 text-xs hover:bg-gray-50"
                      onClick={item.apply}
                    >
                      <CheckCircle2 className="size-3" /> Aplicar
                    </button>
                    <button
                      className="inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1 text-xs hover:bg-gray-50"
                      onClick={() => setIgnoredSuggestionIds((prev) => ({ ...prev, [item.id]: true }))}
                    >
                      <CircleX className="size-3" /> Ignorar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-lg font-semibold"><AlertCircle className="size-4" /> Alertas</div>
            <div className="space-y-2 text-sm">
              {alerts.length === 0 ? (
                <div className="rounded-md bg-gray-50 px-2 py-1 text-gray-600">Sin alertas.</div>
              ) : alerts.map((alert, idx) => (
                <div key={`${alert}-${idx}`} className="flex items-center gap-2 rounded-md bg-gray-50 px-2 py-1">
                  <AlertCircle className="size-3 text-gray-500" />
                  <span>{alert}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


