'use client';

import { buildApiUrl } from '../../../utils/api-config';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BellRing,
  Briefcase,
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
import {
  generateShiftPlanning,
  ShiftPlanningGeneratePayload,
  ShiftPlanningGeneratedItem,
} from '@/lib/shift-planning-api';
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
  cost_center_id?: string | null;
  cost_center_name?: string | null;
  work_group_id?: string | null;
  work_group_name?: string | null;
  work_on_holidays?: boolean | null;
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
  employee_combinations?: EmployeeCombinationRow[];
  companies?: CompanyFilterRow[];
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
type ShiftDistributionMode = 'staggered' | 'same';

type EmployeeCombinationRow = {
  company_id: string | null;
  company_name: string | null;
  cost_center_id: string | null;
  cost_center_name: string | null;
  work_group_id: string | null;
  work_group_name: string | null;
};

type CompanyFilterRow = {
  id: string;
  company_name: string;
};

type WorkPatternShift = {
  shift_id: string;
  sequence_number: number;
  cycle_day_number: number;
  shift_name?: string | null;
  shift_short_name?: string | null;
};

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
  cycle_length_days: number;
  pattern_shifts: WorkPatternShift[];
  is_default?: boolean;
};

type WorkPatternApiRow = {
  id: string;
  pattern_name: string;
  cycle_length_days?: number;
  work_days_per_cycle: number;
  rest_days_per_cycle: number;
  is_active: boolean;
  pattern_shifts?: WorkPatternShift[];
};

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

const DEFAULT_WORK_PATTERNS: WorkPattern[] = [
  { id: 'p-5x2', name: 'Patrón 5x2', work_days: 5, free_days: 2, cycle_length_days: 7, pattern_shifts: [], is_default: true },
  { id: 'p-6x1', name: 'Patrón 6x1', work_days: 6, free_days: 1, cycle_length_days: 7, pattern_shifts: [] },
  { id: 'p-4x3', name: 'Patrón 4x3', work_days: 4, free_days: 3, cycle_length_days: 7, pattern_shifts: [] },
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

function normalizeLookupValue(value?: string | null): string {
  return String(value || '').trim().toUpperCase();
}

function normalizeShiftIconKey(value?: string | null): string | null {
  const raw = normalizeLookupValue(value);
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
  if (text.includes('NOCHE') || text.includes('NOC') || text.includes('NOCT') || text.includes('VELA') || text.includes('N ')) return 'N';
  if (text.includes('TARDE') || text.includes('VES') || text.includes('VESP') || text.includes('T ')) return 'T';
  if (text.includes('MANANA') || text.includes('MAÑANA') || text.includes('MAT') || text.includes('MATU') || text.includes('M ')) return 'M';
  return 'O';
}

function classifyShiftText(shiftName?: string | null, shiftShortName?: string | null): ShiftKind {
  const text = `${shiftShortName || ''} ${shiftName || ''}`.toUpperCase();
  if (text.includes('LIBRE') || text.includes('DESCANSO') || text.includes('OFF') || text.includes('REST')) return 'L';
  if (text.includes('NOCHE') || text.includes('NOC') || text.includes('NOCT') || text.includes('VELA') || text.includes('N ')) return 'N';
  if (text.includes('TARDE') || text.includes('VES') || text.includes('VESP') || text.includes('T ')) return 'T';
  if (text.includes('MANANA') || text.includes('MAÑANA') || text.includes('MAT') || text.includes('MATU') || text.includes('M ')) return 'M';
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
  const [employeeCombinations, setEmployeeCombinations] = useState<EmployeeCombinationRow[]>([]);
  const [filterCompanies, setFilterCompanies] = useState<CompanyFilterRow[]>([]);
  const [plans, setPlans] = useState<ShiftPlanRow[]>([]);
  const [changes, setChanges] = useState<Record<string, DayCellChange>>({});

  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [costCenterFilter, setCostCenterFilter] = useState('ALL');
  const [workGroupFilter, setWorkGroupFilter] = useState('ALL');
  const [diasTrabajo, setDiasTrabajo] = useState(5);
  const [diasLibres, setDiasLibres] = useState(2);
  const [requiredEmployeesPerShift, setRequiredEmployeesPerShift] = useState(1);
  const [shiftDistributionMode, setShiftDistributionMode] = useState<ShiftDistributionMode>('staggered');

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

  const shiftsByCode = useMemo(() => {
    const map = new Map<string, ShiftRow>();
    shifts.forEach((shift) => {
      const key = normalizeLookupValue(shift.shift_short_name);
      if (key && !map.has(key)) {
        map.set(key, shift);
      }
    });
    return map;
  }, [shifts]);

  const shiftsByName = useMemo(() => {
    const map = new Map<string, ShiftRow>();
    shifts.forEach((shift) => {
      const key = normalizeLookupValue(shift.shift_name);
      if (key && !map.has(key)) {
        map.set(key, shift);
      }
    });
    return map;
  }, [shifts]);

  const availableCostCenters = useMemo(() => {
    if (companyFilter === 'ALL') return [];
    const map = new Map<string, { id: string; cost_center_name: string }>();
    employeeCombinations.forEach((combo) => {
      if (combo.company_id !== companyFilter) return;
      if (!combo.cost_center_id) return;
      if (!map.has(combo.cost_center_id)) {
        map.set(combo.cost_center_id, {
          id: combo.cost_center_id,
          cost_center_name: combo.cost_center_name || 'Centro de Costo',
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.cost_center_name.localeCompare(b.cost_center_name));
  }, [employeeCombinations, companyFilter]);

  const availableWorkGroups = useMemo(() => {
    if (companyFilter === 'ALL' || costCenterFilter === 'ALL') return [];
    const map = new Map<string, { id: string; work_group_name: string }>();
    employeeCombinations.forEach((combo) => {
      if (combo.company_id !== companyFilter) return;
      if (combo.cost_center_id !== costCenterFilter) return;
      if (!combo.work_group_id) return;
      if (!map.has(combo.work_group_id)) {
        map.set(combo.work_group_id, {
          id: combo.work_group_id,
          work_group_name: combo.work_group_name || 'Grupo de Trabajo',
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.work_group_name.localeCompare(b.work_group_name));
  }, [employeeCombinations, companyFilter, costCenterFilter]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const companyOk = companyFilter === 'ALL' || employee.company_id === companyFilter;
      const costCenterOk = costCenterFilter === 'ALL' || employee.cost_center_id === costCenterFilter;
      const workGroupOk = workGroupFilter === 'ALL' || employee.work_group_id === workGroupFilter;
      return companyOk && costCenterOk && workGroupOk;
    });
  }, [employees, companyFilter, costCenterFilter, workGroupFilter]);

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

  const activePattern = useMemo(() => {
    return workPatterns.find((pattern) => pattern.id === activePatternId) || null;
  }, [workPatterns, activePatternId]);

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
    setEmployeeCombinations(payload.employee_combinations || []);
    setFilterCompanies(payload.companies || []);

    if (patternsResult.status === 'fulfilled') {
      const rows = ((patternsResult.value?.work_patterns || []) as WorkPatternApiRow[])
        .filter((item) => item.is_active)
        .map((item) => ({
          id: item.id,
          name: item.pattern_name,
          work_days: item.work_days_per_cycle,
          free_days: item.rest_days_per_cycle,
          cycle_length_days: Number(item.cycle_length_days || (item.work_days_per_cycle + item.rest_days_per_cycle) || 7),
          pattern_shifts: Array.isArray(item.pattern_shifts) ? item.pattern_shifts : [],
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

  useEffect(() => {
    setCostCenterFilter('ALL');
    setWorkGroupFilter('ALL');
  }, [companyFilter]);

  useEffect(() => {
    setWorkGroupFilter('ALL');
  }, [costCenterFilter]);

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

  const increaseRequiredEmployees = () => {
    setRequiredEmployeesPerShift((prev) => Math.min(99, Math.max(1, prev + 1)));
  };

  const decreaseRequiredEmployees = () => {
    setRequiredEmployeesPerShift((prev) => Math.max(1, prev - 1));
  };

  const activePatternShiftSequence = useMemo(() => {
    const rows = [...(activePattern?.pattern_shifts || [])]
      .filter((item) => String(item.shift_id || '').trim())
      .sort((a, b) => {
        const aSeq = Number(a.sequence_number || 0);
        const bSeq = Number(b.sequence_number || 0);
        if (aSeq !== bSeq) return aSeq - bSeq;
        return Number(a.cycle_day_number || 0) - Number(b.cycle_day_number || 0);
      });
    return rows;
  }, [activePattern]);

  const buildShiftPlanningPayload = (): ShiftPlanningGeneratePayload => {
    const uniquePatternShifts = Array.from(
      new Set(activePatternShiftSequence.map((item) => item.shift_id))
    )
      .map((shiftId) => shiftsById.get(shiftId))
      .filter((shift): shift is ShiftRow => Boolean(shift));

    const dotacionRequerida = uniquePatternShifts.map((shift) => {
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
        cantidadRequerida: Math.max(1, Math.trunc(Number(requiredEmployeesPerShift || 1))),
      };
    });

    return {
      filtrosEmpleados: {
        soloEmpleadosTurnosRotativos: true,
        areaId: costCenterFilter === 'ALL' ? null : costCenterFilter,
        grupoTrabajoId: workGroupFilter === 'ALL' ? null : workGroupFilter,
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
        modoDistribucionTurnos: shiftDistributionMode === 'staggered' ? 'ESCALONADOS' : 'IGUALES',
      },
      empleadosDisponibles: filteredEmployees.map((employee) => ({
        id: employee.id,
        codigo: employee.employee_code,
        nombres: employee.employee_name,
        apellidos: employee.employee_lastname,
        companyId: employee.company_id,
        companyName: employee.company_name,
      })),
      turnosDisponibles: uniquePatternShifts.map((shift) => {
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

  const resolveShiftFromGeneratedItem = (item: ShiftPlanningGeneratedItem): ShiftRow | null => {
    const shiftId = String(item.turnoId || '').trim();
    if (shiftId && shiftsById.has(shiftId)) {
      return shiftsById.get(shiftId) || null;
    }

    const codeKey = normalizeLookupValue(item.codigoTurno);
    if (codeKey && shiftsByCode.has(codeKey)) {
      return shiftsByCode.get(codeKey) || null;
    }

    const nameKey = normalizeLookupValue(item.nombreTurno);
    if (nameKey && shiftsByName.has(nameKey)) {
      return shiftsByName.get(nameKey) || null;
    }

    return null;
  };

  const applyGeneratedPlanningToTable = (planificacion: ShiftPlanningGeneratedItem[]) => {
    const employeesById = new Map(filteredEmployees.map((employee) => [employee.id, employee]));
    const validDates = new Set(rangeDays.map((day) => toIsoDate(day)));
    const generated: Record<string, DayCellChange> = {};
    let appliedCount = 0;

    planificacion.forEach((item) => {
      const employeeId = String(item.empleadoId || '').trim();
      const dateIso = String(item.fecha || '').trim().split('T')[0];
      const employee = employeesById.get(employeeId);
      if (!employee || !validDates.has(dateIso)) return;

      const resolvedShift = resolveShiftFromGeneratedItem(item);
      const resolvedKind = resolvedShift
        ? classifyShift(resolvedShift)
        : classifyShiftText(item.nombreTurno, item.codigoTurno);
      const isLibre = item.esLibre === true || resolvedKind === 'L';

      const shiftId = resolvedShift?.id || null;
      if (!shiftId && !isLibre) return;

      generated[keyOf(employee.id, dateIso)] = {
        employee_id: employee.id,
        shift_date: dateIso,
        shift_id: shiftId,
        shift_type_id: shiftId ? (shiftTypeIdByKind[resolvedKind] || null) : null,
        company_id: employee.company_id,
      };
      appliedCount += 1;
    });

    setChanges(generated);
    setPlans([]);
    setLegendShiftIds(Array.from(new Set(activePatternShiftSequence.map((item) => item.shift_id))));
    setHasAppliedParameters(true);
    setConfirmed(false);

    return appliedCount;
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

    if (activePatternShiftSequence.length === 0) {
      setError('El patrón seleccionado no tiene turnos configurados.');
      return;
    }

    if (Math.max(1, Math.trunc(Number(requiredEmployeesPerShift || 1))) < 1) {
      setError('La dotación mínima por turno debe ser mayor o igual a 1.');
      return;
    }

    setGeneratingPlanning(true);
    try {
      const payload = buildShiftPlanningPayload();
      console.log('Shift planning payload (/api/shift-planning/generate):', payload);
      const response = await generateShiftPlanning(payload);

      if (!response?.success) {
        setError(response?.message || 'No se pudo generar la planificación.');
        return;
      }

      const planificacion = Array.isArray(response?.planificacion) ? response.planificacion : [];
      const applied = applyGeneratedPlanningToTable(planificacion);
      setSuccess(
        response?.message || `Planificación aplicada en ${applied} celdas.`
      );
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

    if (filteredEmployees.length === 0) {
      setError('No hay empleados para los filtros seleccionados.');
      return;
    }

    const orderedPatternShifts = [...activePatternShiftSequence];
    if (orderedPatternShifts.length === 0) {
      setError('El patrón de trabajo seleccionado no tiene secuencia de turnos configurada.');
      return;
    }

    const patternCycleLength = Math.max(
      1,
      Number(activePattern?.cycle_length_days || 0),
      ...orderedPatternShifts.map((item) => Number(item.cycle_day_number || 0))
    );
    const shiftByCycleDay = new Map<number, string>();
    orderedPatternShifts.forEach((item) => {
      const day = Number(item.cycle_day_number || 0);
      const shiftId = String(item.shift_id || '').trim();
      if (day > 0 && shiftId) {
        shiftByCycleDay.set(day, shiftId);
      }
    });

    const fallbackSequence = orderedPatternShifts
      .map((item) => String(item.shift_id || '').trim())
      .filter(Boolean);
    if (fallbackSequence.length === 0) {
      setError('No se encontraron turnos válidos en el patrón seleccionado.');
      return;
    }
    const missingShifts = fallbackSequence.filter((shiftId) => !shiftsById.has(shiftId));
    if (missingShifts.length > 0) {
      setError('El patrón contiene turnos que no están activos/disponibles para este tenant.');
      return;
    }

    const requiredPerShift = Math.max(1, Math.trunc(Number(requiredEmployeesPerShift || 1)));
    const generated: Record<string, DayCellChange> = {};
    const employeeCount = filteredEmployees.length;
    const usePhaseOffset = shiftDistributionMode === 'staggered';

    // 1) Aplicar la secuencia del patrón con desfase opcional por empleado.
    filteredEmployees.forEach((employee, employeeIndex) => {
      const phaseOffset = usePhaseOffset
        ? Math.floor((employeeIndex * patternCycleLength) / Math.max(1, employeeCount)) % patternCycleLength
        : 0;

      rangeDays.forEach((day, dayIndex) => {
        const dateIso = toIsoDate(day);
        const cycleDay = ((dayIndex + phaseOffset) % patternCycleLength) + 1;
        const byCycle = shiftByCycleDay.get(cycleDay) || null;
        const fallbackId = fallbackSequence[(dayIndex + phaseOffset) % fallbackSequence.length];
        const shiftId = byCycle || fallbackId || null;
        const shift = shiftId ? shiftsById.get(shiftId) : null;
        const kind = shift ? classifyShift(shift) : 'O';
        const shiftTypeId = shift ? (shiftTypeIdByKind[kind] || null) : null;
        generated[keyOf(employee.id, dateIso)] = {
          employee_id: employee.id,
          shift_date: dateIso,
          shift_id: shiftId,
          shift_type_id: shiftTypeId,
          company_id: employee.company_id,
        };
      });
    });

    const shouldEnforceCoverage = shiftDistributionMode === 'staggered';
    let uncoveredGaps = 0;
    if (shouldEnforceCoverage) {
      // 2) Cobertura mínima diaria por turno productivo según dotación requerida.
      const productiveShiftIds = Array.from(
        new Set(
          fallbackSequence.filter((shiftId) => {
            const shift = shiftsById.get(shiftId);
            if (!shift) return false;
            return classifyShift(shift) !== 'L';
          })
        )
      );

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
          if ((dayCountByShift[targetShiftId] || 0) >= requiredPerShift) return;
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
                workOnHolidays: employee.work_on_holidays !== false,
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

          while ((dayCountByShift[targetShiftId] || 0) < requiredPerShift) {
            const fallbackAllowed = productiveShiftIds.length > employeeCount;
            const chosen = candidates.find((entry) => {
              if (entry.currentKind === 'L' || entry.currentKind === 'X') return true;
              if (entry.currentCount > 1) return true;
              return fallbackAllowed;
            });

            if (!chosen) {
              uncoveredGaps += 1;
              break;
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
            const idx = candidates.findIndex((entry) => entry.employee.id === chosen.employee.id);
            if (idx >= 0) {
              candidates.splice(idx, 1);
            }
          }
        });
      });
    }

    const orderedLegend = Array.from(new Set(fallbackSequence));
    setChanges(generated);
    setPlans([]);
    setLegendShiftIds(orderedLegend);
    setHasAppliedParameters(true);
    setConfirmed(false);
    setError(null);
    if (shouldEnforceCoverage && uncoveredGaps > 0) {
      setSuccess(`Secuencia aplicada con cobertura parcial: patrón ${activePattern?.name || ''} en ${rangeDays.length} días. Quedaron ${uncoveredGaps} huecos de cobertura por dotación insuficiente o restricciones de compañía.`);
      return;
    }
    if (!shouldEnforceCoverage) {
      setSuccess(`Parámetros aplicados: patrón ${activePattern?.name || ''} en ${rangeDays.length} días de planificación, con turnos iguales para todos los empleados.`);
      return;
    }
    setSuccess(`Parámetros aplicados: patrón ${activePattern?.name || ''} en ${rangeDays.length} días de planificación, con cobertura diaria mínima por turno.`);
  };

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

  const shiftsByDayGridRows = useMemo(() => {
    if (!hasAppliedParameters) return [] as ShiftRow[];

    const baseIds = legendShiftIds.length > 0
      ? legendShiftIds
      : Array.from(new Set(activePatternShiftSequence.map((item) => item.shift_id)));

    const baseIdSet = new Set(baseIds);
    const usedIdSet = new Set<string>();
    rangeDays.forEach((day) => {
      const dateIso = toIsoDate(day);
      Object.keys(countByDayAndShift[dateIso] || {}).forEach((shiftId) => {
        if ((countByDayAndShift[dateIso]?.[shiftId] || 0) > 0) {
          usedIdSet.add(shiftId);
        }
      });
    });

    const allIdsOrdered = [
      ...baseIds,
      ...Array.from(usedIdSet).filter((shiftId) => !baseIdSet.has(shiftId)),
    ];

    return allIdsOrdered
      .map((shiftId) => shiftsById.get(shiftId))
      .filter((shift): shift is ShiftRow => Boolean(shift));
  }, [hasAppliedParameters, legendShiftIds, activePatternShiftSequence, rangeDays, countByDayAndShift, shiftsById]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const list: Suggestion[] = [];
    const required = Math.max(1, Number(requiredEmployeesPerShift || 1));
    const productiveShiftIds = Array.from(
      new Set(
        activePatternShiftSequence
          .map((item) => String(item.shift_id || '').trim())
          .filter((shiftId) => {
            const shift = shiftsById.get(shiftId);
            return !!shift && classifyShift(shift) !== 'L';
          })
      )
    );

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
      productiveShiftIds.forEach((shiftId) => {
        const shift = shiftsById.get(shiftId);
        if (!shift) return;
        const current = countByDayAndShift[dateIso]?.[shiftId] || 0;
        if (current >= required) return;

        const candidate = filteredEmployees.find((employee) => {
          const kind = cellKind(employee, dateIso);
          return kind === 'L' || kind === 'X' || kind === 'O';
        });
        if (!candidate || !isShiftCompatibleWithEmployee(shift, candidate)) return;

        list.push({
          id: `dotacion-${shiftId}-${candidate.id}-${dateIso}`,
          kind: 'dotacion',
          severity: 'medium',
          text: `Dotación incompleta en ${shift.shift_name} del ${formatDayMonth(dateIso)} (objetivo ${required}).`,
          recommendation: `Reasignar ${candidate.employee_code} a ${shift.shift_name}.`,
          apply: () => setCellShift(candidate, dateIso, shiftId),
        });
      });
    });

    return list.filter((item) => !ignoredSuggestionIds[item.id]).slice(0, 6);
  }, [filteredEmployees, rangeDays, activePatternShiftSequence, requiredEmployeesPerShift, countByDayAndShift, ignoredSuggestionIds, shiftsById, plansByKey, changes]);

  const alerts = useMemo(() => {
    const issues: string[] = [];
    const required = Math.max(1, Number(requiredEmployeesPerShift || 1));
    const productiveShiftIds = Array.from(
      new Set(
        activePatternShiftSequence
          .map((item) => String(item.shift_id || '').trim())
          .filter((shiftId) => {
            const shift = shiftsById.get(shiftId);
            return !!shift && classifyShift(shift) !== 'L';
          })
      )
    );

    rangeDays.forEach((day) => {
      const dateIso = toIsoDate(day);
      productiveShiftIds.forEach((shiftId) => {
        const shift = shiftsById.get(shiftId);
        if (!shift) return;
        const current = countByDayAndShift[dateIso]?.[shiftId] || 0;
        if (current < required) issues.push(`Dotación baja en ${shift.shift_name} ${formatDayMonth(dateIso)}.`);
      });
    });
    return issues.slice(0, 5);
  }, [rangeDays, activePatternShiftSequence, requiredEmployeesPerShift, countByDayAndShift, shiftsById]);

  const pendingChanges = pendingPersistChanges.length;

  useEffect(() => {
    const pattern = workPatterns.find((item) => item.id === activePatternId);
    if (!pattern) return;
    setDiasTrabajo(pattern.work_days);
    setDiasLibres(pattern.free_days);
  }, [activePatternId, workPatterns]);

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
                      <th className="px-3 py-2 text-left min-w-[220px]">Turno Aplicado</th>
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
                    {shiftsByDayGridRows.length === 0 ? (
                      <tr>
                        <td colSpan={rangeDays.length + 1} className="px-3 py-8 text-center text-sm text-gray-500">
                          Aplique parámetros para visualizar el consolidado de turnos por día.
                        </td>
                      </tr>
                    ) : shiftsByDayGridRows.map((shift) => {
                      const kind = classifyShift(shift);
                      const meta = getShiftVisualMeta(shift, kind);
                      const Icon = meta.Icon;
                      const target = kind === 'L' ? 0 : Math.max(1, requiredEmployeesPerShift);
                      return (
                        <tr key={shift.id} className="border-t">
                          <td className="px-3 py-2 font-medium">
                            <span className="inline-flex items-center gap-2">
                              <Icon className="size-4" style={{ color: meta.color }} />
                              {shift.shift_name}
                            </span>
                            <div className="ml-6 text-[11px] text-gray-500">{shift.shift_short_name}</div>
                          </td>
                          {rangeDays.map((day) => {
                            const dateIso = toIsoDate(day);
                            const value = countByDayAndShift[dateIso]?.[shift.id] || 0;
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
            <p className="mb-3 text-sm text-gray-600">Filtros secuenciales por combinaciones reales de employee_companies</p>
            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Empresa</label>
                <select
                  value={companyFilter}
                  onChange={(event) => setCompanyFilter(event.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="ALL">Todas las empresas</option>
                  {filterCompanies.map((option) => (
                    <option key={option.id} value={option.id}>{option.company_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Centro de Costo</label>
                <select
                  value={costCenterFilter}
                  onChange={(event) => setCostCenterFilter(event.target.value)}
                  disabled={companyFilter === 'ALL'}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="ALL">Todos los centros</option>
                  {availableCostCenters.map((option) => (
                    <option key={option.id} value={option.id}>{option.cost_center_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Grupo de Trabajo</label>
                <select
                  value={workGroupFilter}
                  onChange={(event) => setWorkGroupFilter(event.target.value)}
                  disabled={companyFilter === 'ALL' || costCenterFilter === 'ALL'}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                >
                  <option value="ALL">Todos los grupos</option>
                  {availableWorkGroups.map((option) => (
                    <option key={option.id} value={option.id}>{option.work_group_name}</option>
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
            <div className="mb-2 text-lg font-semibold">Patrón de Trabajo</div>
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

              <div className="pt-1">
                <label className="mb-2 block text-sm font-medium">Distribución de Turnos</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShiftDistributionMode('staggered')}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      shiftDistributionMode === 'staggered'
                        ? 'border-[#0074D9] bg-blue-50 text-[#0058A3]'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Turnos escalonados
                  </button>
                  <button
                    type="button"
                    onClick={() => setShiftDistributionMode('same')}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      shiftDistributionMode === 'same'
                        ? 'border-[#0074D9] bg-blue-50 text-[#0058A3]'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Turnos iguales
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {shiftDistributionMode === 'staggered'
                    ? 'Cada empleado inicia el patrón con desfase para distribuir la carga.'
                    : 'Todos los empleados siguen el mismo turno por día (sin desfase).'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-lg font-semibold">
              <Users className="size-4" />
              Dotación Requerida
            </div>
            <p className="mb-3 text-sm text-gray-600">Cantidad mínima global de empleados por turno (default 1)</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={decreaseRequiredEmployees}
                className="inline-flex items-center justify-center rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
                title="Disminuir"
              >
                <Minus className="size-4" />
              </button>
              <input
                type="number"
                min={1}
                value={requiredEmployeesPerShift}
                onChange={(event) => setRequiredEmployeesPerShift(Math.max(1, Math.trunc(Number(event.target.value || 1))))}
                className="w-24 rounded-xl border px-2 py-2 text-center text-sm font-semibold"
              />
              <button
                type="button"
                onClick={increaseRequiredEmployees}
                className="inline-flex items-center justify-center rounded-md border border-emerald-200 p-2 text-emerald-700 hover:bg-emerald-50"
                title="Aumentar"
              >
                <Plus className="size-4" />
              </button>
              <span className="text-xs text-gray-500">empleados/turno</span>
            </div>
            {activePatternShiftSequence.length > 0 && (
              <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                Turnos del patrón: {Array.from(new Set(activePatternShiftSequence.map((item) => item.shift_name || item.shift_short_name || item.shift_id))).join(' · ')}
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="size-4" /> Reglas de IA
            </div>
            <div className="space-y-3 text-sm">
              <label className="flex items-center justify-between"><span>Evitar Amanecida → Mañana</span><input type="checkbox" checked={reglaEvitarNM} onChange={(e) => setReglaEvitarNM(e.target.checked)} /></label>
              <label className="flex items-center justify-between"><span>Priorizar equidad de horas</span><input type="checkbox" checked={reglaEquidad} onChange={(e) => setReglaEquidad(e.target.checked)} /></label>
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
