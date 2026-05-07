'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BellRing,
  Briefcase,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coffee,
  CheckCircle2,
  CircleX,
  Clock3,
  Filter,
  Flame,
  Lightbulb,
  Minus,
  Moon,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Sunset,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import { generateShiftPlanning, ShiftPlanningGeneratePayload } from '@/lib/shift-planning-api';
import { publicApiToken } from '../../../utils/backend/info';

type ShiftPlanRow = {
  id: string;
  employee_id: string;
  shift_id: string;
  shift_date: string;
  shift_type_id: string | null;
  company_id: string;
  shift_name?: string | null;
  shift_short_name?: string | null;
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
  start_time?: string | null;
  work_minutes?: number | null;
  shift_icon_key?: string | null;
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
type ShiftKind = 'M' | 'T' | 'N' | 'L' | 'O' | 'X';
type DistributionShift = { shift_id: string; required: number };

type Suggestion = {
  id: string;
  kind: 'fatiga' | 'descanso' | 'dotacion';
  severity: 'high' | 'medium';
  text: string;
  recommendation: string;
  apply: () => void;
};

type WorkPattern = {
  id: string;
  name: string;
  work_days: number;
  free_days: number;
  is_default?: boolean;
};

type WorkPatternApiRow = {
  id: string;
  pattern_name: string;
  work_days_per_cycle: number;
  rest_days_per_cycle: number;
  is_active: boolean;
};

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

const DEFAULT_WORK_PATTERNS: WorkPattern[] = [
  { id: 'p-5x2', name: 'Patrón 5x2', work_days: 5, free_days: 2, is_default: true },
  { id: 'p-6x1', name: 'Patrón 6x1', work_days: 6, free_days: 1 },
  { id: 'p-4x3', name: 'Patrón 4x3', work_days: 4, free_days: 3 },
];

const KIND_META: Record<ShiftKind, { label: string; color: string; bg: string; Icon: any }> = {
  M: { label: 'Turno Mañana', color: '#0074D9', bg: '#E3F2FD', Icon: Sun },
  T: { label: 'Turno Tarde', color: '#FF6B35', bg: '#FFF3E0', Icon: Sunset },
  N: { label: 'Turno Noche', color: '#5E35B1', bg: '#EDE7F6', Icon: Moon },
  L: { label: 'Libre', color: '#9CA3AF', bg: '#F3F4F6', Icon: Coffee },
  O: { label: 'Otro', color: '#6B7280', bg: '#F3F4F6', Icon: Briefcase },
  X: { label: 'Sin dato', color: '#EF4444', bg: '#FEF2F2', Icon: CircleX },
};

const SHIFT_ICON_META: Record<string, { color: string; bg: string; Icon: any }> = {
  Sun: { color: '#0074D9', bg: '#E3F2FD', Icon: Sun },
  Sunset: { color: '#FF6B35', bg: '#FFF3E0', Icon: Sunset },
  Moon: { color: '#5E35B1', bg: '#EDE7F6', Icon: Moon },
  Coffee: { color: '#9CA3AF', bg: '#F3F4F6', Icon: Coffee },
  Briefcase: { color: '#4B5563', bg: '#EEF2F7', Icon: Briefcase },
  BellRing: { color: '#DC2626', bg: '#FEE2E2', Icon: BellRing },
  Shield: { color: '#0E7490', bg: '#ECFEFF', Icon: Shield },
  Wrench: { color: '#0F766E', bg: '#ECFDF5', Icon: Wrench },
  Truck: { color: '#B45309', bg: '#FFFBEB', Icon: Truck },
  Flame: { color: '#C2410C', bg: '#FFF7ED', Icon: Flame },
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

function normalizeShiftIconKey(value?: string | null): string | null {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return null;
  if (raw === 'SUN' || raw === 'SOL' || raw === 'MANANA' || raw === 'MORNING') return 'Sun';
  if (raw === 'SUNSET' || raw === 'ATARDECER' || raw === 'AFTERNOON' || raw === 'TARDE') return 'Sunset';
  if (raw === 'MOON' || raw === 'NOCHE' || raw === 'NIGHT') return 'Moon';
  if (raw === 'COFFEE' || raw === 'LIBRE' || raw === 'DESCANSO' || raw === 'REST' || raw === 'OFF') return 'Coffee';
  if (raw === 'BRIEFCASE' || raw === 'OFICINA' || raw === 'OFFICE') return 'Briefcase';
  if (raw === 'BELLRING' || raw === 'SIRENA' || raw === 'EMERGENCIA') return 'BellRing';
  if (raw === 'SHIELD' || raw === 'SEGURIDAD') return 'Shield';
  if (raw === 'WRENCH' || raw === 'MANTENIMIENTO') return 'Wrench';
  if (raw === 'TRUCK' || raw === 'LOGISTICA' || raw === 'RUTA') return 'Truck';
  if (raw === 'FLAME' || raw === 'ALTADEMANDA') return 'Flame';
  return null;
}

function parseTimeToMinutes(value?: string | null): number | null {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function formatMinutesAsClock(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hh = Math.floor(normalized / 60);
  const mm = normalized % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function classifyShift(shift: ShiftRow): ShiftKind {
  const text = `${shift.shift_short_name} ${shift.shift_name}`.toUpperCase();
  if (text.includes('LIBRE') || text.includes('DESCANSO') || text.includes('OFF') || text.includes('REST')) return 'L';
  if (text.includes('NOCHE') || text.includes('NOC') || text.includes('N ')) return 'N';
  if (text.includes('TARDE') || text.includes('VES') || text.includes('T ')) return 'T';
  if (text.includes('MANANA') || text.includes('MAÑANA') || text.includes('MAT') || text.includes('M ')) return 'M';
  return 'O';
}

function classifyShiftText(shiftName?: string | null, shiftShortName?: string | null): ShiftKind {
  const text = `${shiftShortName || ''} ${shiftName || ''}`.toUpperCase();
  if (text.includes('LIBRE') || text.includes('DESCANSO') || text.includes('OFF') || text.includes('REST')) return 'L';
  if (text.includes('NOCHE') || text.includes('NOC') || text.includes('N ')) return 'N';
  if (text.includes('TARDE') || text.includes('VES') || text.includes('T ')) return 'T';
  if (text.includes('MANANA') || text.includes('MAÑANA') || text.includes('MAT') || text.includes('M ')) return 'M';
  return 'O';
}

function getShiftVisualMeta(shift: ShiftRow | null, kind: ShiftKind) {
  const iconKey = normalizeShiftIconKey(shift?.shift_icon_key);
  if (iconKey && SHIFT_ICON_META[iconKey]) {
    return SHIFT_ICON_META[iconKey];
  }
  return KIND_META[kind];
}

function getShiftTimeHint(shift: ShiftRow | null, kind: ShiftKind): string {
  const start = parseTimeToMinutes(shift?.start_time);
  const workMinutes = Number(shift?.work_minutes || 0);
  if (start !== null && workMinutes > 0) {
    const end = start + workMinutes;
    return `${formatMinutesAsClock(start)} - ${formatMinutesAsClock(end)}`;
  }
  if (kind === 'L') return 'Sin jornada';
  if (kind === 'X') return 'Sin turno planificado';
  return '-';
}

function isShiftCompatibleWithEmployee(shift: ShiftRow, employee: EmployeeRow): boolean {
  if (!employee.company_id) return true;
  return shift.company_id === employee.company_id;
}

export function EmployeeShiftPlanningManagement() {
  const initialStart = startOfWeek(new Date());
  const initialEnd = addDays(initialStart, 6);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingPlanning, setGeneratingPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftTypeRow[]>([]);
  const [plans, setPlans] = useState<ShiftPlanRow[]>([]);
  const [changes, setChanges] = useState<Record<string, DayCellChange>>({});

  const [distributionShifts, setDistributionShifts] = useState<DistributionShift[]>([]);
  const [newDistributionShiftId, setNewDistributionShiftId] = useState('');
  const [distributionComboOpen, setDistributionComboOpen] = useState(false);
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
  const [paramsPanelOpen, setParamsPanelOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [fechaInicio, setFechaInicio] = useState(() => toIsoDate(initialStart));
  const [fechaFin, setFechaFin] = useState(() => toIsoDate(initialEnd));
  const [workPatterns, setWorkPatterns] = useState<WorkPattern[]>(DEFAULT_WORK_PATTERNS);
  const [activePatternId, setActivePatternId] = useState('p-5x2');
  const [legendShiftIds, setLegendShiftIds] = useState<string[]>([]);
  const [hasAppliedParameters, setHasAppliedParameters] = useState(false);
  const distributionComboRef = useRef<HTMLDivElement | null>(null);

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

  const distributionShiftRows = useMemo(() => {
    return distributionShifts
      .map((item) => ({ item, shift: shiftsById.get(item.shift_id) || null }))
      .filter((entry) => !!entry.shift) as Array<{ item: DistributionShift; shift: ShiftRow }>;
  }, [distributionShifts, shiftsById]);

  const distributionShiftIds = useMemo(() => {
    return new Set(distributionShifts.map((item) => item.shift_id));
  }, [distributionShifts]);

  const selectableDistributionShifts = useMemo(() => {
    return shifts
      .sort((a, b) => a.shift_name.localeCompare(b.shift_name));
  }, [shifts]);

  const availableDistributionShifts = useMemo(() => {
    return selectableDistributionShifts.filter((shift) => !distributionShiftIds.has(shift.id));
  }, [selectableDistributionShifts, distributionShiftIds]);

  const selectedDistributionShift = useMemo(() => {
    return selectableDistributionShifts.find((shift) => shift.id === newDistributionShiftId) || null;
  }, [selectableDistributionShifts, newDistributionShiftId]);

  const activePattern = useMemo(() => {
    return workPatterns.find((pattern) => pattern.id === activePatternId) || null;
  }, [workPatterns, activePatternId]);

  const requiredByKind = useMemo(() => {
    const base: Record<ShiftKind, number> = { M: 0, T: 0, N: 0, L: 0, O: 0, X: 0 };
    distributionShiftRows.forEach(({ item, shift }) => {
      const kind = classifyShift(shift);
      base[kind] += Math.max(0, Number(item.required || 0));
    });
    return base;
  }, [distributionShiftRows]);

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

  const shiftLegendEntries = useMemo(() => {
    if (!hasAppliedParameters || legendShiftIds.length === 0) return [];
    const sourceShifts = shifts.filter((shift) => legendShiftIds.includes(shift.id));

    const ordered = [...sourceShifts].sort((a, b) => {
      const aKind = classifyShift(a);
      const bKind = classifyShift(b);
      return aKind.localeCompare(bKind) || a.shift_name.localeCompare(b.shift_name);
    });

    const entries = ordered.map((shift) => {
      const kind = classifyShift(shift);
      return {
        key: shift.id,
        label: shift.shift_name || shift.shift_short_name || 'Turno',
        hint: getShiftTimeHint(shift, kind),
        meta: getShiftVisualMeta(shift, kind),
      };
    });

    return entries;
  }, [shifts, legendShiftIds, hasAppliedParameters]);

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
    const [catalogsResult, patternsResult] = await Promise.allSettled([
      request('/employee-shift-planning/catalogs'),
      request('/work-patterns'),
    ]);

    if (catalogsResult.status !== 'fulfilled') {
      throw catalogsResult.reason;
    }

    const payload = catalogsResult.value as CatalogsResponse;
    setEmployees(payload.employees || []);
    setShifts(payload.shifts || []);
    setShiftTypes(payload.shift_types || []);

    if (patternsResult.status === 'fulfilled') {
      const rows = ((patternsResult.value?.work_patterns || []) as WorkPatternApiRow[])
        .filter((item) => item.is_active)
        .map((item) => ({
          id: item.id,
          name: item.pattern_name,
          work_days: item.work_days_per_cycle,
          free_days: item.rest_days_per_cycle,
        }));

      const nextPatterns = rows.length > 0 ? rows : DEFAULT_WORK_PATTERNS;
      setWorkPatterns(nextPatterns);
      if (!nextPatterns.some((item) => item.id === activePatternId)) {
        setActivePatternId(nextPatterns[0].id);
      }
    } else {
      setWorkPatterns(DEFAULT_WORK_PATTERNS);
      if (!DEFAULT_WORK_PATTERNS.some((item) => item.id === activePatternId)) {
        setActivePatternId(DEFAULT_WORK_PATTERNS[0].id);
      }
    }
  };

  const loadPlans = async () => {
    const payload = await request(`/employee-shift-planning/plans?date_from=${rangeFrom}&date_to=${rangeTo}`);
    const normalized = ((payload?.plans || []) as ShiftPlanRow[]).map((row) => ({
      ...row,
      shift_date: String(row.shift_date || '').split('T')[0],
    }));
    setPlans(normalized);
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
      setChanges({});
      setLegendShiftIds([]);
      setHasAppliedParameters(false);
      setError('Rango de fechas invalido. Ajuste Fecha Inicio y Fecha Fin.');
      return;
    }
    void loadAll();
  }, [rangeFrom, rangeTo, rangeDays.length]);

  const cellShiftId = (employee: EmployeeRow, dateIso: string): string | null => {
    const change = changes[keyOf(employee.id, dateIso)];
    if (change) return change.shift_id;
    const planShiftId = plansByKey.get(keyOf(employee.id, dateIso))?.shift_id || null;
    return planShiftId;
  };

  const cellShiftRow = (employee: EmployeeRow, dateIso: string): ShiftRow | null => {
    const shiftId = cellShiftId(employee, dateIso);
    if (!shiftId) return null;
    return shiftsById.get(shiftId) || null;
  };

  const cellKind = (employee: EmployeeRow, dateIso: string): ShiftKind => {
    const change = changes[keyOf(employee.id, dateIso)];
    if (change) {
      if (!change.shift_id) return 'L';
      const changedShift = shiftsById.get(change.shift_id);
      return changedShift ? classifyShift(changedShift) : 'O';
    }

    const plan = plansByKey.get(keyOf(employee.id, dateIso));
    if (!plan?.shift_id) return 'X';

    const shiftId = cellShiftId(employee, dateIso);
    if (!shiftId) return 'X';
    const shift = shiftsById.get(shiftId);
    if (!shift) {
      return classifyShiftText(plan.shift_name, plan.shift_short_name);
    }
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

  const addDistributionShift = () => {
    const nextId = String(newDistributionShiftId || '').trim();
    if (!nextId) return;
    if (distributionShiftIds.has(nextId)) return;
    const shift = shiftsById.get(nextId);
    if (!shift) return;
    const required = 1;
    setDistributionShifts((prev) => [...prev, { shift_id: nextId, required }]);
    setNewDistributionShiftId('');
    setDistributionComboOpen(false);
  };

  const removeDistributionShift = (shiftId: string) => {
    setDistributionShifts((prev) => prev.filter((item) => item.shift_id !== shiftId));
  };

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!distributionComboRef.current) return;
      if (distributionComboRef.current.contains(event.target as Node)) return;
      setDistributionComboOpen(false);
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, []);

  const updateDistributionRequired = (shiftId: string, required: number) => {
    const safe = Math.max(0, Math.trunc(required));
    setDistributionShifts((prev) =>
      prev.map((item) => (item.shift_id === shiftId ? { ...item, required: safe } : item))
    );
  };

  const buildShiftPlanningPayload = (): ShiftPlanningGeneratePayload => {
    const dotacionRequerida = distributionShiftRows.map(({ item, shift }) => {
      const startMinutes = parseTimeToMinutes(shift.start_time);
      const workMinutes = Math.max(0, Number(shift.work_minutes || 0));
      const horaFin = startMinutes !== null && workMinutes > 0
        ? formatMinutesAsClock(startMinutes + workMinutes)
        : null;

      return {
        turnoId: shift.id,
        nombreTurno: shift.shift_name,
        codigoTurno: shift.shift_short_name,
        horaInicio: shift.start_time || null,
        horaFin,
        cantidadRequerida: Math.max(0, Math.trunc(Number(item.required || 0))),
      };
    });

    return {
      filtrosEmpleados: {
        soloEmpleadosTurnosRotativos: true,
        areaId: areaFilter === 'ALL' ? null : areaFilter,
        grupoTrabajoId: groupFilter === 'ALL' ? null : groupFilter,
      },
      rangoFechas: {
        fechaInicio,
        fechaFin,
      },
      patronActivo: {
        patronId: activePatternId,
        nombrePatron: activePattern?.name || 'Patrón no seleccionado',
        esquemaActual: {
          diasTrabajo,
          diasLibres,
        },
      },
      dotacionRequerida,
      reglasIA: {
        evitarTurnoNocheManana: reglaEvitarNM,
        priorizarEquidadHoras: reglaEquidad,
        equilibrarFeriados: reglaFeriados,
        permitirSwaps: reglaSwaps,
      },
      empleadosDisponibles: filteredEmployees.map((employee) => ({
        id: employee.id,
        codigo: employee.employee_code,
        nombres: employee.employee_name,
        apellidos: employee.employee_lastname,
        companyId: employee.company_id,
        companyName: employee.company_name,
      })),
      turnosDisponibles: shifts.map((shift) => {
        const startMinutes = parseTimeToMinutes(shift.start_time);
        const workMinutes = Math.max(0, Number(shift.work_minutes || 0));
        const horaFin = startMinutes !== null && workMinutes > 0
          ? formatMinutesAsClock(startMinutes + workMinutes)
          : null;
        return {
          id: shift.id,
          nombreTurno: shift.shift_name,
          codigoTurno: shift.shift_short_name,
          horaInicio: shift.start_time || null,
          horaFin,
          duracionMinutos: shift.work_minutes ?? null,
          companyId: shift.company_id,
        };
      }),
    };
  };

  const handleGeneratePlanning = async () => {
    if (confirmed) return;
    setError(null);
    setSuccess(null);

    if (!fechaInicio) {
      setError('Debe seleccionar Fecha Inicio.');
      return;
    }
    if (!fechaFin) {
      setError('Debe seleccionar Fecha Fin.');
      return;
    }

    const startDate = parseIsoDate(fechaInicio);
    const endDate = parseIsoDate(fechaFin);
    if (!startDate || !endDate) {
      setError('Las fechas deben tener formato válido YYYY-MM-DD.');
      return;
    }
    if (startDate > endDate) {
      setError('Fecha Inicio no puede ser mayor que Fecha Fin.');
      return;
    }
    if (filteredEmployees.length === 0) {
      setError('No hay empleados disponibles con los filtros actuales.');
      return;
    }

    const hasRequiredCoverage = distributionShiftRows.some(({ item }) => Math.max(0, Number(item.required || 0)) >= 1);
    if (!hasRequiredCoverage) {
      setError('Debe configurar al menos un turno con cantidad requerida mayor o igual a 1.');
      return;
    }

    setGeneratingPlanning(true);
    try {
      const payload = buildShiftPlanningPayload();
      console.log('Shift planning payload (/api/shift-planning/generate):', payload);
      const response = await generateShiftPlanning(payload);
      setSuccess(response?.message || 'Planificación enviada correctamente al optimizador.');
    } catch (err: any) {
      setError(err?.message || 'Error preparando payload de planificación');
    } finally {
      setGeneratingPlanning(false);
    }
  };

  const pendingPersistChanges = useMemo<DayCellChange[]>(() => {
    const next: DayCellChange[] = [];

    filteredEmployees.forEach((employee) => {
      rangeDays.forEach((day) => {
        const dateIso = toIsoDate(day);
        const cellKey = keyOf(employee.id, dateIso);
        const explicitChange = changes[cellKey];
        const existingShiftId = plansByKey.get(keyOf(employee.id, dateIso))?.shift_id || null;
        const effectiveShiftId = cellShiftId(employee, dateIso);

        if (existingShiftId === effectiveShiftId && !explicitChange) return;
        if (!existingShiftId && !effectiveShiftId && !explicitChange) return;

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
          shift_type_id: explicitChange ? explicitChange.shift_type_id : shiftTypeId,
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

  const reloadGridFromDatabase = async () => {
    if (rangeDays.length === 0) {
      setError('Rango de fechas invalido. Ajuste Fecha Inicio y Fecha Fin.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    setChanges({});
    setConfirmed(false);
    try {
      await loadPlans();
      setSuccess('Grilla recargada desde la base de datos.');
    } catch (err: any) {
      setError(err?.message || 'Error recargando planificación');
    } finally {
      setLoading(false);
    }
  };

  const resetPlan = async () => {
    await reloadGridFromDatabase();
  };

  const applyParameters = async () => {
    if (rangeDays.length === 0) {
      setError('Rango de fechas invalido. Ajuste Fecha Inicio y Fecha Fin.');
      return;
    }

    const sequenceShiftIds = distributionShiftRows.flatMap(({ item, shift }) => {
      const amount = Math.max(0, Math.trunc(Number(item.required || 0)));
      return Array.from({ length: amount }, () => shift.id);
    });

    if (sequenceShiftIds.length === 0) {
      setError('Defina al menos 1 día en Dotación Requerida para construir la secuencia.');
      return;
    }

    const generated: Record<string, DayCellChange> = {};
    const sequenceLength = sequenceShiftIds.length;
    const employeeCount = Math.max(1, filteredEmployees.length);

    // 1) Aplicar la secuencia con desfase por empleado para evitar que todos caigan en el mismo turno/día libre.
    filteredEmployees.forEach((employee, employeeIndex) => {
      const phaseOffset = Math.floor((employeeIndex * sequenceLength) / employeeCount) % sequenceLength;
      rangeDays.forEach((day, dayIndex) => {
        const dateIso = toIsoDate(day);
        const sequenceShiftId = sequenceShiftIds[(dayIndex + phaseOffset) % sequenceLength];
        const shift = shiftsById.get(sequenceShiftId);
        const kind = shift ? classifyShift(shift) : 'O';
        const shiftTypeId = shift ? (shiftTypeIdByKind[kind] || null) : null;
        generated[keyOf(employee.id, dateIso)] = {
          employee_id: employee.id,
          shift_date: dateIso,
          shift_id: sequenceShiftId,
          shift_type_id: shiftTypeId,
          company_id: employee.company_id,
        };
      });
    });

    // 2) Garantizar cobertura mínima diaria por turno productivo (>=1) cuando sea factible con el personal disponible.
    const productiveShiftIds = Array.from(
      new Set(
        sequenceShiftIds.filter((shiftId) => {
          const shift = shiftsById.get(shiftId);
          if (!shift) return false;
          return classifyShift(shift) !== 'L';
        })
      )
    );

    let uncoveredGaps = 0;
    rangeDays.forEach((day, dayIndex) => {
      const dateIso = toIsoDate(day);
      const dayCountByShift: Record<string, number> = {};

      filteredEmployees.forEach((employee) => {
        const assignedShiftId = generated[keyOf(employee.id, dateIso)]?.shift_id || null;
        if (!assignedShiftId) return;
        dayCountByShift[assignedShiftId] = (dayCountByShift[assignedShiftId] || 0) + 1;
      });

      const orderedTargets = productiveShiftIds.map((_, idx) => productiveShiftIds[(idx + dayIndex) % productiveShiftIds.length]);
      orderedTargets.forEach((targetShiftId) => {
        if ((dayCountByShift[targetShiftId] || 0) > 0) return;
        const targetShift = shiftsById.get(targetShiftId);
        if (!targetShift) return;

        const candidates = filteredEmployees
          .map((employee) => {
            const cell = generated[keyOf(employee.id, dateIso)];
            const currentShiftId = cell?.shift_id || null;
            const currentShift = currentShiftId ? shiftsById.get(currentShiftId) || null : null;
            const currentKind = currentShift ? classifyShift(currentShift) : 'X';
            const currentCount = currentShiftId ? (dayCountByShift[currentShiftId] || 0) : 0;
            const compatible = isShiftCompatibleWithEmployee(targetShift, employee);
            return {
              employee,
              currentShiftId,
              currentKind,
              currentCount,
              compatible,
            };
          })
          .filter((entry) => entry.compatible && entry.currentShiftId !== targetShiftId)
          .sort((a, b) => {
            const score = (item: { currentKind: ShiftKind; currentCount: number }) => {
              if (item.currentKind === 'L' || item.currentKind === 'X') return 0;
              if (item.currentCount > 1) return 1;
              return 10;
            };
            return score(a) - score(b);
          });

        const fallbackAllowed = productiveShiftIds.length > employeeCount;
        const chosen = candidates.find((entry) => {
          if (entry.currentKind === 'L' || entry.currentKind === 'X') return true;
          if (entry.currentCount > 1) return true;
          return fallbackAllowed;
        });

        if (!chosen) {
          uncoveredGaps += 1;
          return;
        }

        const cellKey = keyOf(chosen.employee.id, dateIso);
        const previousShiftId = generated[cellKey]?.shift_id || null;
        const targetKind = classifyShift(targetShift);
        generated[cellKey] = {
          employee_id: chosen.employee.id,
          shift_date: dateIso,
          shift_id: targetShiftId,
          shift_type_id: shiftTypeIdByKind[targetKind] || null,
          company_id: chosen.employee.company_id,
        };

        if (previousShiftId) {
          dayCountByShift[previousShiftId] = Math.max(0, (dayCountByShift[previousShiftId] || 0) - 1);
        }
        dayCountByShift[targetShiftId] = (dayCountByShift[targetShiftId] || 0) + 1;
      });
    });

    const orderedLegend = Array.from(new Set(sequenceShiftIds));
    setChanges(generated);
    setPlans([]);
    setLegendShiftIds(orderedLegend);
    setHasAppliedParameters(true);
    setConfirmed(false);
    setError(null);
    if (uncoveredGaps > 0) {
      setSuccess(`Secuencia aplicada con cobertura parcial: ${sequenceShiftIds.length} días base repetidos en ${rangeDays.length} días. Quedaron ${uncoveredGaps} huecos de cobertura por dotación insuficiente o restricciones de compañía.`);
      return;
    }
    setSuccess(`Secuencia aplicada: ${sequenceShiftIds.length} días base repetidos en ${rangeDays.length} días de planificación, con cobertura diaria mínima en turnos productivos.`);
  };

  const totalsByKind = useMemo(() => {
    const totals: Record<ShiftKind, number> = { M: 0, T: 0, N: 0, L: 0, O: 0, X: 0 };
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
      result[dateIso] = { M: 0, T: 0, N: 0, L: 0, O: 0, X: 0 };
      filteredEmployees.forEach((employee) => {
        result[dateIso][cellKind(employee, dateIso)] += 1;
      });
    });
    return result;
  }, [rangeDays, filteredEmployees, plansByKey, changes, shiftsById]);

  const countByDayAndShift = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    rangeDays.forEach((day) => {
      const dateIso = toIsoDate(day);
      const byShift: Record<string, number> = {};
      filteredEmployees.forEach((employee) => {
        const shiftId = cellShiftId(employee, dateIso);
        if (!shiftId) return;
        byShift[shiftId] = (byShift[shiftId] || 0) + 1;
      });
      result[dateIso] = byShift;
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
      distributionShiftRows.forEach(({ item, shift }) => {
        const required = Math.max(0, Number(item.required || 0));
        if (required <= 0) return;
        const current = countByDayAndShift[dateIso]?.[shift.id] || 0;
        if (current >= required) return;

        const candidate = filteredEmployees.find((employee) => {
          const kind = cellKind(employee, dateIso);
          return kind === 'L' || kind === 'X' || kind === 'O';
        });
        if (!candidate || !isShiftCompatibleWithEmployee(shift, candidate)) return;

        list.push({
          id: `dotacion-${shift.id}-${candidate.id}-${dateIso}`,
          kind: 'dotacion',
          severity: 'medium',
          text: `Dotación incompleta en ${shift.shift_name} del ${formatDayMonth(dateIso)} (objetivo ${required}).`,
          recommendation: `Reasignar ${candidate.employee_code} a ${shift.shift_name}.`,
          apply: () => setCellShift(candidate, dateIso, shift.id),
        });
      });
    });

    return list.filter((item) => !ignoredSuggestionIds[item.id]).slice(0, 6);
  }, [filteredEmployees, rangeDays, distributionShiftRows, countByDayAndShift, ignoredSuggestionIds, shifts, plansByKey, changes]);

  const alerts = useMemo(() => {
    const issues: string[] = [];
    rangeDays.forEach((day) => {
      const dateIso = toIsoDate(day);
      distributionShiftRows.forEach(({ item, shift }) => {
        const required = Math.max(0, Number(item.required || 0));
        if (required <= 0) return;
        const current = countByDayAndShift[dateIso]?.[shift.id] || 0;
        if (current < required) issues.push(`Dotación baja en ${shift.shift_name} ${formatDayMonth(dateIso)}.`);
      });
    });
    return issues.slice(0, 5);
  }, [rangeDays, distributionShiftRows, countByDayAndShift]);

  const pendingChanges = pendingPersistChanges.length;

  useEffect(() => {
    const pattern = workPatterns.find((item) => item.id === activePatternId);
    if (!pattern) return;
    setDiasTrabajo(pattern.work_days);
    setDiasLibres(pattern.free_days);
  }, [activePatternId, workPatterns]);

  useEffect(() => {
    setDistributionShifts((prev) => {
      const cleaned = prev.filter((item) => shiftsById.has(item.shift_id));
      if (cleaned.length > 0) return cleaned;

      const defaults: DistributionShift[] = [];
      (['M', 'T', 'N', 'L'] as ShiftKind[]).forEach((kind) => {
        const found = selectableDistributionShifts.find((shift) => classifyShift(shift) === kind);
        if (found) defaults.push({ shift_id: found.id, required: 1 });
      });

      if (defaults.length > 0) return defaults;
      return (
        selectableDistributionShifts.slice(0, 3).map((shift) => ({
          shift_id: shift.id,
          required: 1,
        }))
      );
    });
  }, [selectableDistributionShifts, shiftsById]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[40px] font-semibold leading-none tracking-tight">Planificación 24/7 IA</h1>
        <p className="text-muted-foreground mt-2">Gestión de empleados, marcaciones y justificaciones</p>
      </div>

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>}

      <div className="relative">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">

        <div className="xl:col-span-12"> 
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
                          <div className="font-medium">{employee.employee_lastname} {employee.employee_name}</div>
                          <div className="mt-1 inline-flex rounded-full bg-blue-600 px-2 py-0.5 text-[10px] text-white">{pendingChanges > 0 ? 'No cumple' : 'Cumple'}</div>
                        </td>
                        {rangeDays.map((day) => {
                          const dateIso = toIsoDate(day);
                          const kind = cellKind(employee, dateIso);
                          const shift = cellShiftRow(employee, dateIso);
                          const meta = getShiftVisualMeta(shift, kind);
                          const Icon = meta.Icon;
                          const label = shift?.shift_name || KIND_META[kind].label;
                          const hint = getShiftTimeHint(shift, kind);
                          return (
                            <td key={dateIso} className="px-1 py-1">
                              <button
                                onClick={() => cycleCell(employee, dateIso)}
                                disabled={confirmed}
                                className="flex h-10 w-full items-center justify-center rounded-md border"
                                style={{ backgroundColor: meta.bg, borderColor: '#E5E7EB' }}
                                title={`${label} | ${hint}`}
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
                            const target = requiredByKind[kind] || 0;
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

          <div className="mt-4 rounded-2xl border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {shiftLegendEntries.map((entry) => {
                  const Icon = entry.meta.Icon;
                  return (
                    <span
                      key={`legend-${entry.key}`}
                      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1"
                      style={{ backgroundColor: entry.meta.bg, borderColor: '#E5E7EB', color: '#1F2937' }}
                    >
                      <Icon className="size-3.5" style={{ color: entry.meta.color }} />
                      <span className="font-medium">{entry.label}</span>
                      <span className="text-gray-600">{entry.hint}</span>
                    </span>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                onClick={() => void handleGeneratePlanning()}
                disabled={loading || saving || generatingPlanning || confirmed || filteredEmployees.length === 0 || rangeDays.length === 0}
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="size-4" />
                  {generatingPlanning ? 'Generando...' : 'Generar planificación'}
                </span>
              </button>
              <button
                onClick={() => void saveChanges()}
                disabled={saving || pendingChanges === 0}
                className="rounded-xl bg-[#2D7FF9] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1F6DE2] disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Save className="size-4" />
                  {saving ? 'Guardando...' : `Guardar cambios (${pendingChanges})`}
                </span>
              </button>

              <button
                onClick={() => void resetPlan()}
                className="rounded-xl border px-4 py-3 text-sm font-semibold hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-2"><RefreshCw className="size-4" /> Recargar</span>
              </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="fixed right-3 top-24 z-40 flex flex-col gap-2">
        <button
          onClick={() => {
            setParamsPanelOpen((prev) => !prev);
            setSidePanelOpen(false);
          }}
          className={`inline-flex size-11 items-center justify-center rounded-2xl border shadow-md transition ${
            paramsPanelOpen
              ? 'border-gray-300 bg-gray-100 text-gray-400'
              : 'border-emerald-200 bg-emerald-50 text-emerald-600'
          }`}
          title={paramsPanelOpen ? 'Parámetros (abierto)' : 'Parámetros'}
        >
          <Settings className="size-4" />
        </button>
        <button
          onClick={() => {
            setSidePanelOpen((prev) => !prev);
            setParamsPanelOpen(false);
          }}
          className={`inline-flex size-11 items-center justify-center rounded-2xl border shadow-md transition ${
            sidePanelOpen
              ? 'border-gray-300 bg-gray-100 text-gray-400'
              : 'border-amber-200 bg-amber-50 text-amber-600'
          }`}
          title={sidePanelOpen ? 'Sugerencias (abierto)' : 'Sugerencias'}
        >
          <Lightbulb className="size-4" />
        </button>
      </div>

      {(sidePanelOpen || paramsPanelOpen) && (
        <div
          className="fixed inset-0 z-40 bg-black/20 xl:bg-transparent"
          onClick={() => {
            setSidePanelOpen(false);
            setParamsPanelOpen(false);
          }}
        />
      )}

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-[420px] border-l bg-white p-4 shadow-2xl transition-transform duration-300 ${
          paramsPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <div className="inline-flex items-center gap-2 text-base font-semibold"><Settings className="size-4" /> Parámetros</div>
          <button
            onClick={() => setParamsPanelOpen(false)}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
          >
            Cerrar <ChevronRight className="size-3" />
          </button>
        </div>

        <div className="h-[calc(100vh-90px)] space-y-4 overflow-y-auto pb-8 pr-1">
          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-lg font-semibold">
              <Filter className="size-4" />
              Filtros de Empleados
            </div>
            <p className="mb-3 text-sm text-gray-600">Solo empleados de turnos rotativos</p>
            <div className="space-y-2">
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
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-lg font-semibold">
              <Settings className="size-4" />
              Rango de Fechas
            </div>
            <p className="mb-3 text-sm text-gray-600">Seleccione fecha de inicio y fecha fin</p>
            <div className="space-y-2">
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
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-2 text-lg font-semibold">Patrón activo</div>
            <div className="space-y-3">
              <select
                value={activePatternId}
                onChange={(event) => setActivePatternId(event.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
              >
                {workPatterns.map((pattern) => (
                  <option key={pattern.id} value={pattern.id}>
                    {pattern.name} ({pattern.work_days}/{pattern.free_days})
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-600">Esquema actual: {diasTrabajo}/{diasLibres}</div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-lg font-semibold">
              <Users className="size-4" />
              Dotación Requerida
            </div>
            <p className="mb-3 text-sm text-gray-600">Empleados por turno (mín. 1)</p>
            <div className="space-y-2">
              {distributionShiftRows.map(({ item, shift }) => {
                const kind = classifyShift(shift);
                const meta = getShiftVisualMeta(shift, kind);
                const Icon = meta.Icon;
                return (
                  <div key={shift.id} className="flex items-center gap-2">
                    <div className="flex min-w-[190px] items-center gap-2 text-sm font-medium">
                      <Icon className="size-4" style={{ color: meta.color }} />
                      <span className="truncate">{shift.shift_name}</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={item.required}
                      onChange={(event) => updateDistributionRequired(shift.id, Number(event.target.value || 0))}
                      className="w-20 rounded-xl border px-2 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeDistributionShift(shift.id)}
                      className="inline-flex items-center justify-center rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
                      title="Quitar turno"
                    >
                      <Minus className="size-4" />
                    </button>
                  </div>
                );
              })}

              <div className="mt-3 flex items-center gap-2">
                <div className="relative flex-1" ref={distributionComboRef}>
                  <button
                    type="button"
                    onClick={() => setDistributionComboOpen((prev) => !prev)}
                    className="w-full inline-flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
                  >
                    {selectedDistributionShift ? (
                      (() => {
                        const selectedKind = classifyShift(selectedDistributionShift);
                        const selectedMeta = getShiftVisualMeta(selectedDistributionShift, selectedKind);
                        const SelectedIcon = selectedMeta.Icon;
                        return (
                          <span className="inline-flex items-center gap-2">
                            <SelectedIcon className="size-4" style={{ color: selectedMeta.color }} />
                            <span>{selectedDistributionShift.shift_name}</span>
                          </span>
                        );
                      })()
                    ) : (
                      <span className="text-gray-500">Seleccionar turno...</span>
                    )}
                    <ChevronDown className="size-4 text-gray-500" />
                  </button>
                  {distributionComboOpen && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border bg-white p-1 shadow-lg">
                      {availableDistributionShifts.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-gray-500">No hay turnos disponibles.</div>
                      ) : (
                        availableDistributionShifts.map((shift) => {
                          const kind = classifyShift(shift);
                          const meta = getShiftVisualMeta(shift, kind);
                          const Icon = meta.Icon;
                          return (
                            <button
                              key={shift.id}
                              type="button"
                              onClick={() => {
                                setNewDistributionShiftId(shift.id);
                                setDistributionComboOpen(false);
                              }}
                              className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50"
                            >
                              <span className="inline-flex items-center gap-2">
                                <Icon className="size-4" style={{ color: meta.color }} />
                                <span>{shift.shift_name}</span>
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={addDistributionShift}
                  className="inline-flex items-center justify-center rounded-md border border-emerald-200 p-2 text-emerald-700 hover:bg-emerald-50"
                  title="Agregar turno"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="size-4" /> Reglas de IA
            </div>
            <div className="space-y-3 text-sm">
              <label className="flex items-center justify-between"><span>Evitar turno N → M</span><input type="checkbox" checked={reglaEvitarNM} onChange={(e) => setReglaEvitarNM(e.target.checked)} /></label>
              <label className="flex items-center justify-between"><span>Priorizar equidad en horas</span><input type="checkbox" checked={reglaEquidad} onChange={(e) => setReglaEquidad(e.target.checked)} /></label>
              <label className="flex items-center justify-between"><span>Equilibrar feriados</span><input type="checkbox" checked={reglaFeriados} onChange={(e) => setReglaFeriados(e.target.checked)} /></label>
              <label className="flex items-center justify-between"><span>Permitir swaps</span><input type="checkbox" checked={reglaSwaps} onChange={(e) => setReglaSwaps(e.target.checked)} /></label>
            </div>
            <button
              onClick={() => void applyParameters()}
              disabled={saving || loading || generatingPlanning}
              className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4" />
                {generatingPlanning || loading ? 'Aplicando...' : 'Aplicar Parámetros'}
              </span>
            </button>
          </div>
        </div>
      </aside>

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-[380px] border-l bg-white p-4 shadow-2xl transition-transform duration-300 ${
          sidePanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <div className="text-base font-semibold">Sugerencias y Alertas</div>
          <button
            onClick={() => setSidePanelOpen(false)}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
          >
            Cerrar <ChevronRight className="size-3" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto pb-8">
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
      </aside>
      </div>
    </div>
  );
}


