'use client';

import { buildApiUrl } from '../../../utils/api-config';
import { MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Ambulance,
  BellRing,
  Briefcase,
  ChevronDown,
  Clock3,
  Coffee,
  Edit2,
  Flame,
  Moon,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  Power,
  PowerOff,
  Siren,
  Trash2,
  Truck,
  Sun,
  Sunset,
  Wrench,
  X,
} from 'lucide-react';
import { publicApiToken } from '../../../utils/backend/info';
import GridActionIconButton from '@/components/shared/GridActionIconButton';
import HeaderInfoTips from '@/components/shared/HeaderInfoTips';
import HeaderRefreshButton from '@/components/shared/HeaderRefreshButton';
import SystemAdminPageHeader from '@/components/shared/SystemAdminPageHeader';

type ShiftBlockType = 'ORDINARIA' | 'NOCTURNA' | 'EXTRA_50' | 'EXTRA_100' | 'LUNCH' | 'BREAK';

interface ShiftCatalogItem {
  id: string;
  shift_name: string;
  shift_short_name: string;
  shift_icon_key?: string | null;
  shift_bg_color?: string | null;
  shift_text_color?: string | null;
  work_minutes: number;
  lunch_minutes: number;
  is_active: boolean;
  constructor?: {
    id: string;
    constructor_name: string;
    total_work_minutes: number;
    total_break_minutes: number;
    updated_at: string | null;
  } | null;
}

interface ShiftDetailResponse {
  shift: ShiftCatalogItem;
  constructor: {
    id: string;
    constructor_name: string;
    total_work_minutes: number;
    total_break_minutes: number;
  } | null;
  blocks: ShiftBlockRow[];
}

interface ShiftBlockRow {
  id?: string;
  block_type: ShiftBlockType;
  block_label: string | null;
  start_minutes: number;
  end_minutes: number;
  surcharge_pct: number;
  is_break: boolean;
  sort_order: number;
  is_active?: boolean;
}

interface BlockTypeMeta {
  label: string;
  color: string;
  defaultSurcharge: number;
  isBreak: boolean;
  hint: string;
}

interface BlockFormState {
  index: number | null;
  block_type: ShiftBlockType;
  block_label: string;
  start_minutes: string;
  end_minutes: string;
  surcharge_pct: string;
  sort_order: string;
}

interface DragState {
  index: number;
  mode: 'move' | 'resize-start' | 'resize-end';
  originX: number;
  originalStart: number;
  originalEnd: number;
  minutesPerPixel: number;
}

interface DragPreview {
  index: number;
  start_minutes: number;
  end_minutes: number;
}

interface ShiftIconOption {
  key: string;
  label: string;
  Icon: any;
  color: string;
  bg: string;
}

const MINUTES_IN_48H = 2880;
const INTERVAL_MINUTES = 15;
const MIN_BLOCK_MINUTES = 15;
const PAGE_SIZE = 10;

const SHIFT_ICON_OPTIONS: ShiftIconOption[] = [
  { key: 'Sun', label: 'Sol (Mañana)', Icon: Sun, color: '#0074D9', bg: '#E3F2FD' },
  { key: 'Sunset', label: 'Atardecer', Icon: Sunset, color: '#FF6B35', bg: '#FFF3E0' },
  { key: 'Moon', label: 'Cuarto de luna (Noche)', Icon: Moon, color: '#5E35B1', bg: '#EDE7F6' },
  { key: 'Briefcase', label: 'Maletín (Oficina)', Icon: Briefcase, color: '#374151', bg: '#EEF2F7' },
  { key: 'Coffee', label: 'Taza caliente (Libre)', Icon: Coffee, color: '#6B7280', bg: '#F3F4F6' },
  { key: 'BellRing', label: 'Sirena de emergencia', Icon: BellRing, color: '#DC2626', bg: '#FEE2E2' },
  { key: 'Siren', label: 'Sirena de ambulancia', Icon: Siren, color: '#DC2626', bg: '#FEE2E2' },
  { key: 'Ambulance', label: 'Ambulancia', Icon: Ambulance, color: '#1D4ED8', bg: '#EFF6FF' },
  { key: 'Shield', label: 'Seguridad', Icon: Shield, color: '#0E7490', bg: '#ECFEFF' },
  { key: 'Wrench', label: 'Mantenimiento técnico', Icon: Wrench, color: '#0F766E', bg: '#ECFDF5' },
  { key: 'Truck', label: 'Logística / Ruta', Icon: Truck, color: '#B45309', bg: '#FFFBEB' },
  { key: 'Flame', label: 'Alta demanda', Icon: Flame, color: '#C2410C', bg: '#FFF7ED' },
];

const SHIFT_ICON_MAP = Object.fromEntries(SHIFT_ICON_OPTIONS.map((item) => [item.key, item])) as Record<string, ShiftIconOption>;

const BLOCK_TYPES: Record<ShiftBlockType, BlockTypeMeta> = {
  ORDINARIA: {
    label: 'Jornada Ordinaria',
    color: '#3B82F6',
    defaultSurcharge: 0,
    isBreak: false,
    hint: '07:00 - 18:59 | 0% recargo',
  },
  NOCTURNA: {
    label: 'Jornada Nocturna',
    color: '#9B59B6',
    defaultSurcharge: 25,
    isBreak: false,
    hint: '19:00 - 06:59 | 25% recargo',
  },
  EXTRA_50: {
    label: 'Horas Extras 50%',
    color: '#F59E0B',
    defaultSurcharge: 50,
    isBreak: false,
    hint: '07:00 - 23:59 | 50% recargo',
  },
  EXTRA_100: {
    label: 'Horas Extras 100%',
    color: '#EF4444',
    defaultSurcharge: 100,
    isBreak: false,
    hint: '00:00 - 06:59 | 100% recargo',
  },
  LUNCH: {
    label: 'Intervalo de Lunch',
    color: '#F59E0B',
    defaultSurcharge: 0,
    isBreak: true,
    hint: 'Descanso',
  },
  BREAK: {
    label: 'Break',
    color: '#14B8A6',
    defaultSurcharge: 0,
    isBreak: true,
    hint: 'Descanso',
  },
};

const BLOCK_TYPE_OPTIONS = Object.keys(BLOCK_TYPES) as ShiftBlockType[];
const WORK_TYPES = new Set<ShiftBlockType>(['ORDINARIA', 'NOCTURNA', 'EXTRA_50', 'EXTRA_100']);

function getToken() {
  return localStorage.getItem('tt-access-token') || publicApiToken;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function minutesToClock(minutes: number): string {
  const safe = Math.max(0, Math.min(MINUTES_IN_48H, Math.trunc(minutes)));
  const day = Math.floor(safe / 1440) + 1;
  const rem = safe % 1440;
  const hh = Math.floor(rem / 60);
  const mm = rem % 60;
  return `${pad2(hh)}:${pad2(mm)} (D${day})`;
}

function clockToMinutes(value: string): number | null {
  const trimmed = String(value || '').trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 48 || mm < 0 || mm > 59) return null;
  if (hh === 48 && mm !== 0) return null;
  return hh * 60 + mm;
}

function toHour48(minutes: number): string {
  const safe = Math.max(0, Math.min(MINUTES_IN_48H, Math.trunc(minutes)));
  const hh = Math.floor(safe / 60);
  const mm = safe % 60;
  return `${pad2(hh)}:${pad2(mm)}`;
}

function percentOfTimeline(minutes: number): number {
  return (Math.max(0, Math.min(MINUTES_IN_48H, minutes)) / MINUTES_IN_48H) * 100;
}

function snapToInterval(minutes: number): number {
  return Math.round(minutes / INTERVAL_MINUTES) * INTERVAL_MINUTES;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getReadableTextColor(bgHex?: string | null): string {
  const raw = String(bgHex || '').trim();
  const match = raw.match(/^#([0-9a-fA-F]{6})$/);
  if (!match) return '#0F172A';
  const r = parseInt(match[1].slice(0, 2), 16);
  const g = parseInt(match[1].slice(2, 4), 16);
  const b = parseInt(match[1].slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#0F172A' : '#FFFFFF';
}

function generateShiftShortName(name: string): string {
  const cleaned = String(name || '').trim().toUpperCase();
  if (!cleaned) return 'TRN';
  const words = cleaned
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'TRN';
  if (words.length === 1) return words[0].slice(0, 3).padEnd(3, 'X');
  return words.map((word) => word[0]).join('').slice(0, 6);
}

function normalizeBlocks(items: ShiftBlockRow[]): ShiftBlockRow[] {
  return [...items]
    .map((row, index) => ({
      ...row,
      block_label: row.block_label || null,
      sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : (index + 1) * 10,
      surcharge_pct: Number.isFinite(Number(row.surcharge_pct)) ? Number(row.surcharge_pct) : BLOCK_TYPES[row.block_type].defaultSurcharge,
      is_break: row.is_break ?? BLOCK_TYPES[row.block_type].isBreak,
      is_active: row.is_active !== false,
    }))
    .sort((a, b) => a.sort_order - b.sort_order || a.start_minutes - b.start_minutes);
}

function getDefaultDurationByType(blockType: ShiftBlockType): number {
  if (blockType === 'ORDINARIA' || blockType === 'NOCTURNA') return 8 * 60;
  if (blockType === 'EXTRA_50' || blockType === 'EXTRA_100') return 2 * 60;
  return 60;
}

function makeNewBlockFormState(nextSortOrder: number, blockType: ShiftBlockType = 'ORDINARIA'): BlockFormState {
  const start = 420; // 07:00
  const end = Math.min(start + getDefaultDurationByType(blockType), MINUTES_IN_48H);
  return {
    index: null,
    block_type: blockType,
    block_label: '',
    start_minutes: toHour48(start),
    end_minutes: toHour48(end),
    surcharge_pct: String(BLOCK_TYPES[blockType].defaultSurcharge),
    sort_order: String(nextSortOrder),
  };
}

function validateBlocks(blocks: ShiftBlockRow[]): string | null {
  if (blocks.length === 0) {
    return 'Debe existir al menos un bloque en el constructor.';
  }

  const workTypes = new Set<string>();
  const workBlocks: ShiftBlockRow[] = [];
  const breakBlocks: ShiftBlockRow[] = [];

  for (const block of blocks) {
    const meta = BLOCK_TYPES[block.block_type];
    if (!meta) return `Tipo de bloque invalido: ${block.block_type}`;

    if (block.start_minutes < 0 || block.end_minutes > MINUTES_IN_48H || block.end_minutes <= block.start_minutes) {
      return 'Cada bloque debe cumplir 0 <= inicio < fin <= 48:00';
    }

    if (block.start_minutes % INTERVAL_MINUTES !== 0 || block.end_minutes % INTERVAL_MINUTES !== 0) {
      return 'Todos los bloques deben estar alineados en intervalos de 15 minutos.';
    }

    if (WORK_TYPES.has(block.block_type)) {
      if (workTypes.has(block.block_type)) {
        return `El tipo ${BLOCK_TYPES[block.block_type].label} solo puede agregarse una vez.`;
      }
      workTypes.add(block.block_type);
      workBlocks.push(block);
    } else {
      breakBlocks.push(block);
    }
  }

  const overlaps = (arr: ShiftBlockRow[]): boolean => {
    const sorted = [...arr].sort((a, b) => a.start_minutes - b.start_minutes);
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].start_minutes < sorted[i - 1].end_minutes) return true;
    }
    return false;
  };

  if (overlaps(workBlocks)) return 'Los bloques laborales no pueden solaparse entre si.';
  if (overlaps(breakBlocks)) return 'Los bloques de descanso no pueden solaparse entre si.';

  return null;
}

export function ShiftConstructorManagement() {
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [blockModalError, setBlockModalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [shifts, setShifts] = useState<ShiftCatalogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);

  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderMode, setBuilderMode] = useState<'create' | 'edit'>('create');
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [shiftName, setShiftName] = useState('');
  const [shiftShortName, setShiftShortName] = useState('');
  const [shiftIconKey, setShiftIconKey] = useState('Sun');
  const [shiftBgColor, setShiftBgColor] = useState(SHIFT_ICON_MAP.Sun.bg);
  const [shiftTextColor, setShiftTextColor] = useState(SHIFT_ICON_MAP.Sun.color);
  const [iconComboOpen, setIconComboOpen] = useState(false);
  const [constructorName, setConstructorName] = useState('');
  const [blocks, setBlocks] = useState<ShiftBlockRow[]>([]);

  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockForm, setBlockForm] = useState<BlockFormState>(makeNewBlockFormState(10));
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const iconComboRef = useRef<HTMLDivElement | null>(null);

  const sortedBlocks = useMemo(() => normalizeBlocks(blocks), [blocks]);
  const workBlocks = useMemo(() => sortedBlocks.filter((block) => !block.is_break), [sortedBlocks]);
  const breakBlocks = useMemo(() => sortedBlocks.filter((block) => block.is_break), [sortedBlocks]);

  const totals = useMemo(() => {
    const work = workBlocks.reduce((sum, block) => sum + (block.end_minutes - block.start_minutes), 0);
    const pause = breakBlocks.reduce((sum, block) => sum + (block.end_minutes - block.start_minutes), 0);
    return { work, pause };
  }, [workBlocks, breakBlocks]);

  const filteredShifts = useMemo(() => {
    return shifts.filter((shift) => {
      const matchesSearch =
        !searchTerm.trim() ||
        shift.shift_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shift.shift_short_name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && shift.is_active) ||
        (statusFilter === 'inactive' && !shift.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [shifts, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredShifts.length / PAGE_SIZE));
  const pagedShifts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredShifts.slice(start, start + PAGE_SIZE);
  }, [filteredShifts, page]);

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
    if (!response.ok) {
      throw new Error(payload?.error || `HTTP ${response.status}`);
    }
    return payload;
  };

  const loadCatalogs = async () => {
    setLoadingCatalogs(true);
    setError(null);
    try {
      const payload = await request('/shift-constructor/catalogs');
      const nextShifts = (payload?.shifts || []) as ShiftCatalogItem[];
      setShifts(nextShifts);
    } catch (err: any) {
      setError(err?.message || 'Error cargando turnos');
    } finally {
      setLoadingCatalogs(false);
    }
  };

  const loadShiftDetail = async (shiftId: string) => {
    setLoadingDetail(true);
    setError(null);
    try {
      const payload = (await request(`/shift-constructor/shift/${shiftId}`)) as ShiftDetailResponse;
      const nextShiftName = payload.shift?.shift_name || '';
      const nextShortName = payload.shift?.shift_short_name || generateShiftShortName(nextShiftName);

      setShiftName(nextShiftName);
      setShiftShortName(nextShortName);
      setShiftIconKey(payload.shift?.shift_icon_key || 'Sun');
      setShiftBgColor(payload.shift?.shift_bg_color || SHIFT_ICON_MAP[payload.shift?.shift_icon_key || 'Sun']?.bg || SHIFT_ICON_MAP.Sun.bg);
      setShiftTextColor(payload.shift?.shift_text_color || SHIFT_ICON_MAP[payload.shift?.shift_icon_key || 'Sun']?.color || SHIFT_ICON_MAP.Sun.color);
      setConstructorName(payload.constructor?.constructor_name || `Constructor ${nextShiftName}`);
      setBlocks(normalizeBlocks(payload.blocks || []));
    } catch (err: any) {
      setError(err?.message || 'Error cargando constructor de turno');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    void loadCatalogs();
  }, []);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (selectedBlockIndex !== null && selectedBlockIndex >= sortedBlocks.length) {
      setSelectedBlockIndex(null);
    }
  }, [selectedBlockIndex, sortedBlocks.length]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!iconComboRef.current) return;
      if (iconComboRef.current.contains(event.target as Node)) return;
      setIconComboOpen(false);
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, []);

  const openCreateShiftBuilder = () => {
    setBuilderMode('create');
    setActiveShiftId(null);
    setShiftName('');
    setShiftShortName('');
    setShiftIconKey('Sun');
    setShiftBgColor(SHIFT_ICON_MAP.Sun.bg);
    setShiftTextColor(SHIFT_ICON_MAP.Sun.color);
    setConstructorName('');
    setBlocks([]);
    setSelectedBlockIndex(null);
    setDragPreview(null);
    setShowBlockModal(false);
    setBuilderError(null);
    setBlockModalError(null);
    setBuilderOpen(true);
  };

  const openEditShiftBuilder = async (shift: ShiftCatalogItem) => {
    setBuilderMode('edit');
    setActiveShiftId(shift.id);
    setShiftName(shift.shift_name);
    setShiftShortName(shift.shift_short_name || generateShiftShortName(shift.shift_name));
    setShiftIconKey(shift.shift_icon_key || 'Sun');
    setShiftBgColor(shift.shift_bg_color || SHIFT_ICON_MAP[shift.shift_icon_key || 'Sun']?.bg || SHIFT_ICON_MAP.Sun.bg);
    setShiftTextColor(shift.shift_text_color || SHIFT_ICON_MAP[shift.shift_icon_key || 'Sun']?.color || SHIFT_ICON_MAP.Sun.color);
    setConstructorName(shift.constructor?.constructor_name || `Constructor ${shift.shift_name}`);
    setBlocks([]);
    setSelectedBlockIndex(null);
    setDragPreview(null);
    setShowBlockModal(false);
    setBuilderError(null);
    setBlockModalError(null);
    setBuilderOpen(true);
    await loadShiftDetail(shift.id);
  };

  const closeShiftBuilder = () => {
    setBuilderOpen(false);
    setShowBlockModal(false);
    setSelectedBlockIndex(null);
    setDragPreview(null);
    setIconComboOpen(false);
    dragStateRef.current = null;
    setSaving(false);
    setBuilderError(null);
    setBlockModalError(null);
  };

  const removeShift = async (shift: ShiftCatalogItem) => {
    if (!window.confirm(`Desea eliminar el turno "${shift.shift_name}"?`)) return;
    setError(null);
    setSuccessMessage(null);
    try {
      await request(`/organization/shifts/${shift.id}`, { method: 'DELETE' });
      setSuccessMessage('Turno eliminado correctamente.');
      await loadCatalogs();
    } catch (err: any) {
      setError(err?.message || 'Error eliminando turno');
    }
  };

  const toggleShiftStatus = async (shift: ShiftCatalogItem) => {
    setError(null);
    setSuccessMessage(null);
    try {
      await request(`/organization/shifts/${shift.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !shift.is_active }),
      });
      setSuccessMessage(`Turno ${shift.is_active ? 'desactivado' : 'activado'} correctamente.`);
      await loadCatalogs();
    } catch (err: any) {
      setError(err?.message || 'Error actualizando estado del turno');
    }
  };

  const openNewBlockModal = (type?: ShiftBlockType) => {
    const nextSort = sortedBlocks.length > 0 ? sortedBlocks[sortedBlocks.length - 1].sort_order + 10 : 10;
    setBlockForm(makeNewBlockFormState(nextSort, type || 'ORDINARIA'));
    setBlockModalError(null);
    setShowBlockModal(true);
  };

  const openEditBlockModal = (index: number) => {
    const row = sortedBlocks[index];
    if (!row) return;
    setBlockForm({
      index,
      block_type: row.block_type,
      block_label: row.block_label || '',
      start_minutes: toHour48(row.start_minutes),
      end_minutes: toHour48(row.end_minutes),
      surcharge_pct: String(row.surcharge_pct),
      sort_order: String(row.sort_order),
    });
    setBlockModalError(null);
    setShowBlockModal(true);
  };

  const quickAddBlock = (blockType: ShiftBlockType) => {
    const nextSort = sortedBlocks.length > 0 ? sortedBlocks[sortedBlocks.length - 1].sort_order + 10 : 10;
    const workAlreadyExists = WORK_TYPES.has(blockType) && sortedBlocks.some((block) => block.block_type === blockType);
    if (workAlreadyExists) {
      setBuilderError(`El bloque ${BLOCK_TYPES[blockType].label} ya existe.`);
      return;
    }

    const candidateStart = sortedBlocks.length > 0
      ? sortedBlocks[sortedBlocks.length - 1].end_minutes
      : 420;
    const duration = getDefaultDurationByType(blockType);
    const start = Math.max(0, Math.min(candidateStart, MINUTES_IN_48H - duration));
    const end = Math.min(start + duration, MINUTES_IN_48H);

    const nextBlocks = normalizeBlocks([
      ...sortedBlocks,
      {
        block_type: blockType,
        block_label: null,
        start_minutes: start,
        end_minutes: end,
        surcharge_pct: BLOCK_TYPES[blockType].defaultSurcharge,
        is_break: BLOCK_TYPES[blockType].isBreak,
        sort_order: nextSort,
        is_active: true,
      },
    ]);

    const validationError = validateBlocks(nextBlocks);
    if (validationError) {
      setBuilderError(validationError);
      return;
    }

    setBlocks(nextBlocks);
    setBuilderError(null);
  };

  const removeBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, current) => current !== index));
    setDragPreview((prev) => (prev?.index === index ? null : prev));
    setSelectedBlockIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const saveBlock = () => {
    const startMinutes = clockToMinutes(blockForm.start_minutes);
    const endMinutes = clockToMinutes(blockForm.end_minutes);

    if (startMinutes === null || endMinutes === null) {
      setBlockModalError('Formato de hora invalido. Use HH:MM en escala 00:00..48:00');
      return;
    }

    const nextRow: ShiftBlockRow = {
      block_type: blockForm.block_type,
      block_label: blockForm.block_label.trim() || null,
      start_minutes: startMinutes,
      end_minutes: endMinutes,
      surcharge_pct: Number(blockForm.surcharge_pct || 0),
      is_break: BLOCK_TYPES[blockForm.block_type].isBreak,
      sort_order: Number(blockForm.sort_order || 10),
      is_active: true,
    };

    const nextList = [...sortedBlocks];
    if (blockForm.index === null) {
      nextList.push(nextRow);
    } else {
      nextList[blockForm.index] = {
        ...nextList[blockForm.index],
        ...nextRow,
      };
    }

    const validationError = validateBlocks(nextList);
    if (validationError) {
      setBlockModalError(validationError);
      return;
    }

    setBlocks(normalizeBlocks(nextList));
    setBlockModalError(null);
    setShowBlockModal(false);
  };

  const applyDefaultTemplate = () => {
    const template: ShiftBlockRow[] = [
      {
        block_type: 'ORDINARIA',
        block_label: 'Ordinaria día 1',
        start_minutes: 420,
        end_minutes: 1140,
        surcharge_pct: 0,
        is_break: false,
        sort_order: 10,
        is_active: true,
      },
      {
        block_type: 'NOCTURNA',
        block_label: 'Nocturna día 1',
        start_minutes: 1140,
        end_minutes: 1435,
        surcharge_pct: 25,
        is_break: false,
        sort_order: 20,
        is_active: true,
      },
      {
        block_type: 'EXTRA_100',
        block_label: 'Extra 100 madrugada',
        start_minutes: 1440,
        end_minutes: 1830,
        surcharge_pct: 100,
        is_break: false,
        sort_order: 30,
        is_active: true,
      },
      {
        block_type: 'EXTRA_50',
        block_label: 'Extra 50 cierre',
        start_minutes: 1830,
        end_minutes: 1920,
        surcharge_pct: 50,
        is_break: false,
        sort_order: 40,
        is_active: true,
      },
      {
        block_type: 'LUNCH',
        block_label: 'Lunch',
        start_minutes: 720,
        end_minutes: 780,
        surcharge_pct: 0,
        is_break: true,
        sort_order: 50,
        is_active: true,
      },
    ];

    setBlocks(normalizeBlocks(template));
    setBuilderError(null);
  };

  const saveShiftAndConstructor = async () => {
    const trimmedName = shiftName.trim();
    const finalShortName = (shiftShortName.trim() || generateShiftShortName(trimmedName)).toUpperCase();
    const finalConstructorName = constructorName.trim() || `Constructor ${trimmedName}`;

    if (!trimmedName) {
      setBuilderError('Debe ingresar el nombre del turno.');
      return;
    }

    const validationError = validateBlocks(sortedBlocks);
    if (validationError) {
      setBuilderError(validationError);
      return;
    }

    setSaving(true);
    setBuilderError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        shift_name: trimmedName,
        shift_short_name: finalShortName,
        shift_icon_key: shiftIconKey,
        shift_bg_color: shiftBgColor,
        shift_text_color: shiftTextColor,
        constructor_name: finalConstructorName,
        blocks: sortedBlocks,
      };

      if (builderMode === 'edit' && activeShiftId) {
        await request(`/shift-constructor/shift/${activeShiftId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await request('/shift-constructor/shift', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setSuccessMessage('Turno guardado correctamente.');
      closeShiftBuilder();
      await loadCatalogs();
    } catch (err: any) {
      setBuilderError(err?.message || 'Error guardando turno');
    } finally {
      setSaving(false);
    }
  };

  const applyDraggedBlock = (drag: DragState, clientX: number) => {
    const deltaMinutes = snapToInterval((clientX - drag.originX) * drag.minutesPerPixel);
    const candidate = [...sortedBlocks];
    const current = candidate[drag.index];
    if (!current) return;

    let startMinutes = drag.originalStart;
    let endMinutes = drag.originalEnd;
    const duration = drag.originalEnd - drag.originalStart;

    const siblings = candidate
      .map((row, index) => ({ row, index }))
      .filter((entry) => entry.index !== drag.index && entry.row.is_break === current.is_break)
      .sort((a, b) => a.row.start_minutes - b.row.start_minutes);

    let previousEnd = 0;
    let nextStart = MINUTES_IN_48H;
    for (const sibling of siblings) {
      if (sibling.row.end_minutes <= current.start_minutes) {
        previousEnd = Math.max(previousEnd, sibling.row.end_minutes);
        continue;
      }
      if (sibling.row.start_minutes >= current.end_minutes) {
        nextStart = Math.min(nextStart, sibling.row.start_minutes);
        break;
      }
    }

    if (drag.mode === 'move') {
      const minStart = previousEnd;
      const maxStart = Math.max(minStart, nextStart - duration);
      startMinutes = clamp(drag.originalStart + deltaMinutes, minStart, maxStart);
      endMinutes = startMinutes + duration;
    } else if (drag.mode === 'resize-start') {
      const minStart = previousEnd;
      const maxStart = drag.originalEnd - MIN_BLOCK_MINUTES;
      startMinutes = clamp(drag.originalStart + deltaMinutes, minStart, maxStart);
      endMinutes = drag.originalEnd;
    } else {
      const minEnd = drag.originalStart + MIN_BLOCK_MINUTES;
      const maxEnd = nextStart;
      endMinutes = clamp(drag.originalEnd + deltaMinutes, minEnd, maxEnd);
      startMinutes = drag.originalStart;
    }

    startMinutes = snapToInterval(startMinutes);
    endMinutes = snapToInterval(endMinutes);
    if (endMinutes <= startMinutes) return;

    candidate[drag.index] = {
      ...current,
      start_minutes: startMinutes,
      end_minutes: endMinutes,
    };

    const validationError = validateBlocks(candidate);
    if (validationError) return;

    setDragPreview({
      index: drag.index,
      start_minutes: startMinutes,
      end_minutes: endMinutes,
    });
    setBlocks(normalizeBlocks(candidate));
    setBuilderError(null);
  };

  const startDrag = (
    event: ReactMouseEvent<HTMLDivElement>,
    index: number,
    mode: DragState['mode']
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget.closest('[data-track-root]') as HTMLDivElement | null;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0) return;

    const row = sortedBlocks[index];
    if (!row) return;

    dragStateRef.current = {
      index,
      mode,
      originX: event.clientX,
      originalStart: row.start_minutes,
      originalEnd: row.end_minutes,
      minutesPerPixel: MINUTES_IN_48H / rect.width,
    };
    setDragPreview({
      index,
      start_minutes: row.start_minutes,
      end_minutes: row.end_minutes,
    });
    setSelectedBlockIndex(index);
  };

  const removeSelectedBlock = () => {
    if (selectedBlockIndex === null) return;
    removeBlock(selectedBlockIndex);
  };

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      applyDraggedBlock(drag, event.clientX);
    };

    const onMouseUp = () => {
      if (!dragStateRef.current) return;
      dragStateRef.current = null;
      setDragPreview(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [sortedBlocks]);

  return (
    <div className="p-6 max-w-full space-y-6">
      <SystemAdminPageHeader
        icon={Clock3}
        title="Constructor de Turnos"
        subtitle="Gestión de horarios y turnos laborales"
        rightSlot={(
          <>
            <HeaderInfoTips
              items={[
                {
                  title: 'Seguridad',
                  text: 'Solo usuarios con permisos de configuración pueden crear o modificar turnos.',
                  variant: 'security',
                },
                {
                  title: 'Tip de configuración',
                  text: 'Define turnos por bloques horarios y luego asigna esos turnos a patrones y calendarios.',
                  variant: 'tip',
                },
              ]}
            />
            <HeaderRefreshButton onClick={() => void loadCatalogs()} />
            <button
              onClick={openCreateShiftBuilder}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0074D9] text-white text-sm font-medium hover:bg-[#0066C0]"
            >
              <Plus className="size-4" />
              Nuevo Turno
            </button>
          </>
        )}
      />

      {error && !builderOpen && !showBlockModal && (
        <div className="rounded-md border border-red-300 bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>
      )}
      {successMessage && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 text-sm px-3 py-2">{successMessage}</div>
      )}

      <div className="rounded-lg border bg-white p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                className="w-full border rounded-md pl-9 pr-3 py-2 text-sm"
                placeholder="Buscar por descripción..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | 'active' | 'inactive');
                setPage(1);
              }}
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>

          <div>
            <button className="w-full border rounded-md px-3 py-2 text-sm text-gray-500 bg-gray-50" disabled>
              Exportar
            </button>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          Mostrando {pagedShifts.length} de {filteredShifts.length} turnos
        </div>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-center py-2 px-2">ID</th>
                <th className="text-center py-2 px-2">Nombre</th>
                <th className="text-center py-2 px-2">Código</th>
                <th className="text-center py-2 px-2">Ícono</th>
                <th className="text-center py-2 px-2">Color fondo</th>
                <th className="text-center py-2 px-2">Horas Totales</th>
                <th className="text-center py-2 px-2">Horas Lunch</th>
                <th className="text-center py-2 px-2">Estado</th>
                <th className="text-center py-2 px-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loadingCatalogs ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-gray-500">Cargando turnos...</td>
                </tr>
              ) : pagedShifts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-gray-500">No existen turnos</td>
                </tr>
              ) : (
                pagedShifts.map((shift, index) => (
                  <tr
                    key={shift.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => void openEditShiftBuilder(shift)}
                  >
                    <td className="py-3 px-2 text-center text-gray-600">{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="py-3 px-2 text-center">{shift.shift_name}</td>
                    <td className="py-3 px-2 text-center">
                      <span className="px-2 py-0.5 rounded-full border text-xs">{shift.shift_short_name}</span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {(() => {
                        const iconMeta = SHIFT_ICON_MAP[shift.shift_icon_key || ''] || SHIFT_ICON_MAP.Sun;
                        const IconPreview = iconMeta.Icon;
                        return (
                          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-slate-700 bg-white">
                            <IconPreview className="size-3.5" />
                            {iconMeta.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-0 px-2 text-center">
                      {(() => {
                        const bgColor = shift.shift_bg_color || SHIFT_ICON_MAP[shift.shift_icon_key || '']?.bg || '#F1F5F9';
                        const textColor = getReadableTextColor(bgColor);
                        return (
                          <div
                            className="w-full h-full min-h-[44px] flex items-center justify-center rounded-sm border text-xs font-mono font-semibold"
                            style={{ backgroundColor: bgColor, color: textColor }}
                            aria-label={`Color ${bgColor}`}
                          >
                            {bgColor.toUpperCase()}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-2 text-center">{(shift.work_minutes / 60).toFixed(shift.work_minutes % 60 === 0 ? 0 : 1)}h</td>
                    <td className="py-3 px-2 text-center">{(shift.lunch_minutes / 60).toFixed(shift.lunch_minutes % 60 === 0 ? 0 : 1)}h</td>
                    <td className="py-3 px-2 text-center">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                          shift.is_active ? 'border-green-300 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-700'
                        }`}
                      >
                        {shift.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-center gap-2">
                        <GridActionIconButton
                          onClick={(event) => {
                            event.stopPropagation();
                            void openEditShiftBuilder(shift);
                          }}
                          icon={<Edit2 className="size-4" />}
                          label="Editar"
                          tone="blue"
                        />
                        <GridActionIconButton
                          onClick={(event) => {
                            event.stopPropagation();
                            void toggleShiftStatus(shift);
                          }}
                          icon={shift.is_active ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                          label={shift.is_active ? 'Desactivar' : 'Activar'}
                          tone={shift.is_active ? 'red' : 'green'}
                        />
                        <GridActionIconButton
                          onClick={(event) => {
                            event.stopPropagation();
                            void removeShift(shift);
                          }}
                          icon={<Trash2 className="size-4" />}
                          label="Eliminar"
                          tone="red"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>Página {page} de {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded border disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Anterior
            </button>
            <button
              className="px-3 py-1.5 rounded border disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {builderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/40" onClick={closeShiftBuilder} />
          <div className="relative w-full max-w-[1280px] max-h-[95vh] overflow-y-auto rounded-xl border bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b bg-white">
              <div className="flex items-center gap-2">
                <Clock3 className="size-4 text-blue-700" />
                <h3 className="text-lg font-semibold">Constructor de Turnos Laborales</h3>
              </div>
              <button onClick={closeShiftBuilder} className="p-1.5 rounded hover:bg-gray-100">
                <X className="size-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {builderError && (
                <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {builderError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Nombre del Turno</label>
                  <input
                    value={shiftName}
                    onChange={(event) => setShiftName(event.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                    placeholder="turno nocturno"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Código</label>
                  <input
                    value={shiftShortName}
                    onChange={(event) => setShiftShortName(event.target.value.toUpperCase())}
                    className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                    placeholder="NOC"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Ícono</label>
                  <div className="relative mt-1" ref={iconComboRef}>
                    {(() => {
                      const selected = SHIFT_ICON_MAP[shiftIconKey] || SHIFT_ICON_MAP.Sun;
                      const SelectedIcon = selected.Icon;
                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => setIconComboOpen((prev) => !prev)}
                            className="w-full inline-flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                          >
                            <span
                              className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs"
                              style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
                            >
                              <SelectedIcon className="size-3.5" />
                              {selected.label}
                            </span>
                            <ChevronDown className="size-4 text-gray-500" />
                          </button>
                          {iconComboOpen && (
                            <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-white p-1 shadow-lg">
                              {SHIFT_ICON_OPTIONS.map((item) => {
                                const OptionIcon = item.Icon;
                                const isSelected = item.key === shiftIconKey;
                                return (
                                  <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => {
                                      setShiftIconKey(item.key);
                                      setShiftBgColor(item.bg);
                                      setShiftTextColor(item.color);
                                      setIconComboOpen(false);
                                    }}
                                    className={`w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                                  >
                                    <span
                                      className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs"
                                      style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
                                    >
                                      <OptionIcon className="size-3.5" />
                                      {item.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Color fondo</label>
                  <input
                    type="color"
                    value={shiftBgColor}
                    onChange={(event) => setShiftBgColor(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border px-1 py-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Color texto</label>
                  <input
                    type="color"
                    value={shiftTextColor}
                    onChange={(event) => setShiftTextColor(event.target.value)}
                    className="mt-1 h-10 w-full rounded-md border px-1 py-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Tipos de Bloques</h4>
                  <p className="text-xs text-gray-500">Cada tipo de jornada se agrega una sola vez.</p>

                  {BLOCK_TYPE_OPTIONS.map((blockType) => (
                    <button
                      key={blockType}
                      onClick={() => quickAddBlock(blockType)}
                      className="w-full inline-flex items-center justify-between px-3 py-2 border rounded-md text-sm hover:bg-gray-50"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: BLOCK_TYPES[blockType].color }} />
                        {BLOCK_TYPES[blockType].label}
                      </span>
                      <Plus className="size-4" />
                    </button>
                  ))}

                  <button
                    onClick={() => openNewBlockModal()}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-gray-50"
                  >
                    <Plus className="size-4" />
                    Nuevo Bloque
                  </button>

                  <button
                    onClick={applyDefaultTemplate}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-gray-50"
                  >
                    <Activity className="size-4" />
                    Plantilla Base
                  </button>
                </div>

                <div className="lg:col-span-3 space-y-4">
                  <div className="rounded-lg border bg-white p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold">Bloques de Jornada</h4>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-600">Ajuste cada 15 minutos | Turno extendido (48h)</span>
                        <button
                          onClick={removeSelectedBlock}
                          disabled={selectedBlockIndex === null}
                          className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="size-3" />
                          Eliminar seleccionado
                        </button>
                      </div>
                    </div>
                    <div className="mb-2 flex justify-between text-[11px] text-gray-500">
                      {Array.from({ length: 9 }).map((_, index) => (
                        <span key={index}>{pad2(index * 6)}:00</span>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-xs font-medium text-gray-700 mb-1">Jornada</div>
                        <div data-track-root className="relative h-14 rounded border bg-gray-50 overflow-hidden">
                          {Array.from({ length: 9 }).map((_, index) => (
                            <div
                              key={`work-grid-${index}`}
                              className="absolute top-0 bottom-0 w-px bg-gray-200"
                              style={{ left: `${(index / 8) * 100}%` }}
                            />
                          ))}
                          {sortedBlocks.map((block, index) => {
                            if (block.is_break) return null;
                            const isSelected = selectedBlockIndex === index;
                            const preview = dragPreview?.index === index ? dragPreview : null;
                            const startMinutes = preview?.start_minutes ?? block.start_minutes;
                            const endMinutes = preview?.end_minutes ?? block.end_minutes;
                            return (
                              <div
                                key={`work-${index}-${block.block_type}-${block.start_minutes}`}
                                onMouseDown={(event) => startDrag(event, index, 'move')}
                                onClick={() => setSelectedBlockIndex(index)}
                                className={`absolute top-2 bottom-2 rounded px-4 text-[10px] text-white cursor-move ${isSelected ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                                style={{
                                  left: `${percentOfTimeline(startMinutes)}%`,
                                  width: `${Math.max(1, percentOfTimeline(endMinutes - startMinutes))}%`,
                                  background: BLOCK_TYPES[block.block_type].color,
                                }}
                                title={`${BLOCK_TYPES[block.block_type].label}: ${minutesToClock(startMinutes)} - ${minutesToClock(endMinutes)}`}
                              >
                                <div
                                  className="absolute left-0 top-0 h-full w-2 cursor-ew-resize"
                                  onMouseDown={(event) => startDrag(event, index, 'resize-start')}
                                />
                                <div
                                  className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
                                  onMouseDown={(event) => startDrag(event, index, 'resize-end')}
                                />
                                <div className="truncate leading-tight">
                                  <div>{BLOCK_TYPES[block.block_type].label}</div>
                                  <div className="opacity-90">{toHour48(startMinutes)} - {toHour48(endMinutes)}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-gray-700 mb-1">Descansos</div>
                        <div data-track-root className="relative h-12 rounded border bg-gray-50 overflow-hidden">
                          {Array.from({ length: 9 }).map((_, index) => (
                            <div
                              key={`break-grid-${index}`}
                              className="absolute top-0 bottom-0 w-px bg-gray-200"
                              style={{ left: `${(index / 8) * 100}%` }}
                            />
                          ))}
                          {sortedBlocks.map((block, index) => {
                            if (!block.is_break) return null;
                            const isSelected = selectedBlockIndex === index;
                            const preview = dragPreview?.index === index ? dragPreview : null;
                            const startMinutes = preview?.start_minutes ?? block.start_minutes;
                            const endMinutes = preview?.end_minutes ?? block.end_minutes;
                            return (
                              <div
                                key={`break-${index}-${block.block_type}-${block.start_minutes}`}
                                onMouseDown={(event) => startDrag(event, index, 'move')}
                                onClick={() => setSelectedBlockIndex(index)}
                                className={`absolute top-2 bottom-2 rounded px-4 text-[10px] text-white cursor-move ${isSelected ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                                style={{
                                  left: `${percentOfTimeline(startMinutes)}%`,
                                  width: `${Math.max(1, percentOfTimeline(endMinutes - startMinutes))}%`,
                                  background: BLOCK_TYPES[block.block_type].color,
                                }}
                                title={`${BLOCK_TYPES[block.block_type].label}: ${minutesToClock(startMinutes)} - ${minutesToClock(endMinutes)}`}
                              >
                                <div
                                  className="absolute left-0 top-0 h-full w-2 cursor-ew-resize"
                                  onMouseDown={(event) => startDrag(event, index, 'resize-start')}
                                />
                                <div
                                  className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
                                  onMouseDown={(event) => startDrag(event, index, 'resize-end')}
                                />
                                <div className="truncate leading-tight">
                                  <div>{BLOCK_TYPES[block.block_type].label}</div>
                                  <div className="opacity-90">{toHour48(startMinutes)} - {toHour48(endMinutes)}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-auto border rounded-md">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 border-b font-semibold text-gray-700">Tipo</th>
                          <th className="text-left px-3 py-2 border-b font-semibold text-gray-700">Inicio</th>
                          <th className="text-left px-3 py-2 border-b font-semibold text-gray-700">Fin</th>
                          <th className="text-left px-3 py-2 border-b font-semibold text-gray-700">Duración (min)</th>
                          <th className="text-left px-3 py-2 border-b font-semibold text-gray-700">Recargo %</th>
                          <th className="text-left px-3 py-2 border-b font-semibold text-gray-700">Track</th>
                          <th className="text-left px-3 py-2 border-b font-semibold text-gray-700">Orden</th>
                          <th className="text-left px-3 py-2 border-b font-semibold text-gray-700">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingDetail ? (
                          <tr>
                            <td colSpan={8} className="px-3 py-6 text-center text-gray-500">Cargando definición...</td>
                          </tr>
                        ) : sortedBlocks.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-3 py-6 text-center text-gray-500">Sin bloques en el constructor</td>
                          </tr>
                        ) : (
                          sortedBlocks.map((row, index) => (
                            <tr
                              key={`${row.block_type}-${row.start_minutes}-${index}`}
                              className={`hover:bg-gray-50 cursor-pointer ${selectedBlockIndex === index ? 'bg-blue-50' : ''}`}
                              onClick={() => setSelectedBlockIndex(index)}
                            >
                              <td className="px-3 py-2 border-b text-gray-700">
                                <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded text-xs text-white" style={{ backgroundColor: BLOCK_TYPES[row.block_type].color }}>
                                  {BLOCK_TYPES[row.block_type].label}
                                </span>
                              </td>
                              <td className="px-3 py-2 border-b text-gray-700">{minutesToClock(row.start_minutes)}</td>
                              <td className="px-3 py-2 border-b text-gray-700">{minutesToClock(row.end_minutes)}</td>
                              <td className="px-3 py-2 border-b text-gray-700">{row.end_minutes - row.start_minutes}</td>
                              <td className="px-3 py-2 border-b text-gray-700">{row.surcharge_pct}</td>
                              <td className="px-3 py-2 border-b text-gray-700">{row.is_break ? 'Descanso' : 'Trabajo'}</td>
                              <td className="px-3 py-2 border-b text-gray-700">{row.sort_order}</td>
                              <td className="px-3 py-2 border-b">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openEditBlockModal(index);
                                    }}
                                    className="inline-flex items-center justify-center p-1.5 rounded border text-xs hover:bg-gray-100"
                                    title="Editar bloque"
                                  >
                                    <Edit2 className="size-3" />
                                  </button>
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      removeBlock(index);
                                    }}
                                    className="inline-flex items-center justify-center p-1.5 rounded border text-xs text-red-700 border-red-200 hover:bg-red-50"
                                    title="Eliminar bloque"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-md border bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    Trabajo: <strong>{totals.work} min</strong> | Descansos: <strong>{totals.pause} min</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 px-5 py-3 border-t bg-white">
              <button onClick={closeShiftBuilder} className="px-4 py-2 rounded-md border text-sm hover:bg-gray-50">Cancelar</button>
              <button
                onClick={() => void saveShiftAndConstructor()}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#0074D9] text-white text-sm hover:bg-[#0066C0] disabled:opacity-50"
              >
                <Save className="size-4" />
                {saving ? 'Guardando...' : 'Guardar Turno'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBlockModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowBlockModal(false);
              setBlockModalError(null);
            }}
          />
          <div className="relative w-full max-w-2xl rounded-lg border bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <Clock3 className="size-4 text-blue-700" />
                <h3 className="text-base font-semibold">{blockForm.index === null ? 'Nuevo bloque' : 'Editar bloque'}</h3>
              </div>
              <button
                onClick={() => {
                  setShowBlockModal(false);
                  setBlockModalError(null);
                }}
                className="p-1.5 rounded hover:bg-gray-200"
                title="Cerrar"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-4 bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-3">
              {blockModalError && (
                <div className="md:col-span-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {blockModalError}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Tipo de bloque</label>
                <select
                  value={blockForm.block_type}
                  onChange={(event) => {
                    const nextType = event.target.value as ShiftBlockType;
                    setBlockForm((prev) => {
                      const start = clockToMinutes(prev.start_minutes) ?? 420;
                      const end = Math.min(start + getDefaultDurationByType(nextType), MINUTES_IN_48H);
                      return {
                        ...prev,
                        block_type: nextType,
                        end_minutes: toHour48(end),
                        surcharge_pct: String(BLOCK_TYPES[nextType].defaultSurcharge),
                      };
                    });
                  }}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  {BLOCK_TYPE_OPTIONS.map((value) => (
                    <option key={value} value={value}>{BLOCK_TYPES[value].label}</option>
                  ))}
                </select>
                <div className="text-[11px] text-gray-500">{BLOCK_TYPES[blockForm.block_type].hint}</div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Etiqueta</label>
                <input
                  value={blockForm.block_label}
                  onChange={(event) => setBlockForm((prev) => ({ ...prev, block_label: event.target.value }))}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  placeholder="Opcional"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Inicio (HH:MM 0..48)</label>
                <input
                  value={blockForm.start_minutes}
                  onChange={(event) => setBlockForm((prev) => ({ ...prev, start_minutes: event.target.value }))}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  placeholder="07:00"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Fin (HH:MM 0..48)</label>
                <input
                  value={blockForm.end_minutes}
                  onChange={(event) => setBlockForm((prev) => ({ ...prev, end_minutes: event.target.value }))}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  placeholder="15:00"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Recargo %</label>
                <input
                  type="number"
                  value={blockForm.surcharge_pct}
                  onChange={(event) => setBlockForm((prev) => ({ ...prev, surcharge_pct: event.target.value }))}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Orden</label>
                <input
                  type="number"
                  value={blockForm.sort_order}
                  onChange={(event) => setBlockForm((prev) => ({ ...prev, sort_order: event.target.value }))}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-white">
              <button
                onClick={() => {
                  setShowBlockModal(false);
                  setBlockModalError(null);
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-gray-100"
              >
                <X className="size-4" />
                Cancelar
              </button>
              <button onClick={saveBlock} className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700">
                <Save className="size-4" />
                Guardar Bloque
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
