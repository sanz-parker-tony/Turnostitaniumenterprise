'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Clock3, Download, FileText, RefreshCw, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { buildApiUrl } from '../../../utils/api-config';
import { publicApiToken } from '../../../utils/backend/info';
import { formatClientDateTime } from '../../../utils/date-time';
import {
  defaultSystemReportConfig,
  fetchSystemReportConfig,
  getReportParameterLabel,
  getSystemReportName,
  isReportParameterEnabled,
  type SystemReportConfig,
} from '../../../utils/system-report-config';
import { StandardDateInput } from '../../ui/standard-date-input';
import ReportCompanyAsset from './ReportCompanyAsset';

const TIME_PUNCH_REPORT = {
  code: 'RPT_MARCACIONES_REALIZADAS',
  name: 'Marcaciones realizadas',
};

interface EmployeeOption {
  employee_id: string;
  employee_code: string | null;
  employee_name: string | null;
  employee_lastname: string | null;
  company_id: string | null;
  company_logo: string | null;
  company_banner: string | null;
}

interface FilterOption {
  id: string;
  label: string | null;
}

interface ReportFilters {
  payroll_groups: FilterOption[];
  cost_centers: FilterOption[];
  departments: FilterOption[];
  areas: FilterOption[];
  work_groups: FilterOption[];
}

interface TimePunchRow {
  id: string;
  employee_id: string;
  employee_code: string | null;
  employee_full_name: string;
  company_id: string | null;
  company_name: string | null;
  company_logo: string | null;
  company_banner: string | null;
  department_id: string | null;
  department_name: string | null;
  area_id: string | null;
  area_name: string | null;
  payroll_group_name: string | null;
  cost_center_id: string | null;
  cost_center_name: string | null;
  work_group_name: string | null;
  punch_datetime: string;
  punch_time_zone: string | null;
  punch_key: number;
  punch_label: string;
  punch_source_key: string | null;
  punch_source_label: string | null;
  punch_status_key: string | null;
  punch_status_label: string | null;
  origin_device: string;
  device_name: string | null;
  device_serial_number: string | null;
  device_model: string | null;
  device_type_label: string | null;
  punch_latitude: number | null;
  punch_longitude: number | null;
  location_accuracy_meters: number | null;
  device_latitude: number | null;
  device_longitude: number | null;
  client_ip: string | null;
  client_device_type: string | null;
  client_platform: string | null;
  has_assigned_shift: boolean;
  shift_name: string | null;
  shift_short_name: string | null;
  shift_start_time: string | null;
  shift_end_time: string | null;
  notes: string | null;
}

interface OrganizationLevel {
  key: string;
  title: string;
  label: string;
}

interface EmployeePunchGroup {
  key: string;
  employee: TimePunchRow;
  rows: TimePunchRow[];
  hierarchy: OrganizationLevel[];
}

interface HierarchySection {
  type: 'hierarchy';
  key: string;
  depth: number;
  title: string;
  label: string;
  employeeCount: number;
  punchCount: number;
}

interface EmployeeSection {
  type: 'employee';
  key: string;
  group: EmployeePunchGroup;
}

type ReportSection = HierarchySection | EmployeeSection;

const REPORT_COLUMN_COUNT = 11;

const ORGANIZATION_LEVELS = [
  { idKey: 'company_id', nameKey: 'company_name', title: 'Empresa', emptyLabel: 'Sin empresa' },
  { idKey: 'department_id', nameKey: 'department_name', title: 'Departamento', emptyLabel: 'Sin departamento' },
  { idKey: 'area_id', nameKey: 'area_name', title: 'Área', emptyLabel: 'Sin área' },
  { idKey: 'cost_center_id', nameKey: 'cost_center_name', title: 'Centro de costo', emptyLabel: 'Sin centro de costo' },
] as const;

const EXPORT_COLUMNS = [
  'Empleado', 'Código', 'Fecha y hora', 'Zona horaria', 'Marcación', 'Fuente', 'Estado',
  'Dispositivo', 'Serial dispositivo', 'Modelo dispositivo', 'Tipo dispositivo', 'Latitud', 'Longitud',
  'Precisión GPS (m)', 'Latitud dispositivo', 'Longitud dispositivo', 'Tiene turno', 'Turno',
  'Inicio turno', 'Fin turno', 'Empresa', 'Departamento', 'Área', 'Rol de pago', 'Centro de costo',
  'Grupo de trabajo', 'IP cliente', 'Tipo dispositivo cliente', 'Plataforma', 'Notas',
];

function getToken() {
  return localStorage.getItem('tt-access-token') || localStorage.getItem('access_token') || publicApiToken;
}

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function firstDayOfMonth(): string {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function employeeName(row: EmployeeOption): string {
  return `${row.employee_lastname || ''} ${row.employee_name || ''}`.trim() || row.employee_code || row.employee_id;
}

function formatCoordinate(value: number | null): string {
  const numeric = Number(value);
  return value === null || value === undefined || !Number.isFinite(numeric) ? '-' : numeric.toFixed(6);
}

function formatTime(value: string | null): string {
  return value ? value.slice(0, 5) : '-';
}

function statusBadgeClass(statusKey: string | null): string {
  switch (String(statusKey || '').toUpperCase()) {
    case 'VALID':
    case 'APPROVED':
      return 'bg-emerald-50 text-emerald-700';
    case 'INVALID':
    case 'NO_VALIDO_GEOFENCE':
      return 'bg-red-50 text-red-700';
    case 'PENDING':
      return 'bg-amber-50 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function compareText(left: unknown, right: unknown): number {
  return String(left || '').localeCompare(String(right || ''), 'es', { sensitivity: 'base', numeric: true });
}

function organizationHierarchy(row: TimePunchRow): OrganizationLevel[] {
  return ORGANIZATION_LEVELS.map((level) => {
    const id = row[level.idKey];
    const name = row[level.nameKey];
    return {
      key: `${level.title}:${id || name || '__EMPTY__'}`,
      title: level.title,
      label: String(name || level.emptyLabel),
    };
  });
}

function buildEmployeePunchGroups(rows: TimePunchRow[]): EmployeePunchGroup[] {
  const byEmployee = new Map<string, TimePunchRow[]>();
  rows.forEach((row) => {
    const key = `${row.company_id || '__NO_COMPANY__'}:${row.employee_id}`;
    const employeeRows = byEmployee.get(key) || [];
    employeeRows.push(row);
    byEmployee.set(key, employeeRows);
  });

  return Array.from(byEmployee.entries())
    .map(([key, employeeRows]) => ({
      key,
      employee: employeeRows[0],
      rows: [...employeeRows].sort((left, right) => String(left.punch_datetime).localeCompare(String(right.punch_datetime))),
      hierarchy: organizationHierarchy(employeeRows[0]),
    }))
    .sort((left, right) => {
      for (let index = 0; index < left.hierarchy.length; index += 1) {
        const hierarchyCompare = compareText(left.hierarchy[index].label, right.hierarchy[index].label);
        if (hierarchyCompare !== 0) return hierarchyCompare;
      }
      const nameCompare = compareText(left.employee.employee_full_name, right.employee.employee_full_name);
      return nameCompare !== 0 ? nameCompare : compareText(left.employee.employee_code, right.employee.employee_code);
    });
}

function buildReportSections(employeeGroups: EmployeePunchGroup[], includeHierarchy: boolean): ReportSection[] {
  if (!includeHierarchy) {
    return employeeGroups.map((group) => ({ type: 'employee', key: `employee:${group.key}`, group }));
  }

  const prefixStats = new Map<string, { employees: Set<string>; punches: number }>();
  employeeGroups.forEach((group) => {
    group.hierarchy.forEach((_level, depth) => {
      const prefix = group.hierarchy.slice(0, depth + 1).map((level) => level.key).join('|');
      const stats = prefixStats.get(prefix) || { employees: new Set<string>(), punches: 0 };
      stats.employees.add(group.key);
      stats.punches += group.rows.length;
      prefixStats.set(prefix, stats);
    });
  });

  const sections: ReportSection[] = [];
  let previousHierarchy: OrganizationLevel[] = [];
  employeeGroups.forEach((group) => {
    let changedAt = group.hierarchy.findIndex((level, index) => level.key !== previousHierarchy[index]?.key);
    if (changedAt < 0) changedAt = group.hierarchy.length;

    for (let depth = changedAt; depth < group.hierarchy.length; depth += 1) {
      const level = group.hierarchy[depth];
      const prefix = group.hierarchy.slice(0, depth + 1).map((item) => item.key).join('|');
      const stats = prefixStats.get(prefix);
      sections.push({
        type: 'hierarchy',
        key: `hierarchy:${prefix}`,
        depth,
        title: level.title,
        label: level.label,
        employeeCount: stats?.employees.size || 0,
        punchCount: stats?.punches || 0,
      });
    }

    sections.push({ type: 'employee', key: `employee:${group.key}`, group });
    previousHierarchy = group.hierarchy;
  });
  return sections;
}

function hierarchyRowClass(depth: number): string {
  const classes = [
    'bg-slate-800 text-white',
    'bg-blue-100 text-blue-950',
    'bg-indigo-50 text-indigo-950',
    'bg-violet-50 text-violet-950',
    'bg-cyan-50 text-cyan-950',
  ];
  return classes[Math.min(depth, classes.length - 1)];
}

function exportDetailValues(row: TimePunchRow): Array<string | number> {
  return [
    row.employee_full_name,
    row.employee_code || '',
    formatClientDateTime(row.punch_datetime, 'es-EC'),
    row.punch_time_zone || '',
    row.punch_label,
    row.punch_source_label || row.punch_source_key || '',
    row.punch_status_label || row.punch_status_key || '',
    row.origin_device,
    row.device_serial_number || '',
    row.device_model || '',
    row.device_type_label || '',
    row.punch_latitude ?? '',
    row.punch_longitude ?? '',
    row.location_accuracy_meters ?? '',
    row.device_latitude ?? '',
    row.device_longitude ?? '',
    row.has_assigned_shift ? 'Sí' : 'No',
    row.shift_short_name || row.shift_name || '',
    formatTime(row.shift_start_time),
    formatTime(row.shift_end_time),
    row.company_name || '',
    row.department_name || '',
    row.area_name || '',
    row.payroll_group_name || '',
    row.cost_center_name || '',
    row.work_group_name || '',
    row.client_ip || '',
    row.client_device_type || '',
    row.client_platform || '',
    row.notes || '',
  ];
}

function htmlEscape(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export default function EmployeeTimePunchReports() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth);
  const [dateTo, setDateTo] = useState(() => toIsoDate(new Date()));
  const [payrollGroupId, setPayrollGroupId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [workGroupId, setWorkGroupId] = useState('');
  const [shiftStatus, setShiftStatus] = useState('all');
  const [filters, setFilters] = useState<ReportFilters>({ payroll_groups: [], cost_centers: [], departments: [], areas: [], work_groups: [] });
  const [reportConfig, setReportConfig] = useState<SystemReportConfig>(() => defaultSystemReportConfig(TIME_PUNCH_REPORT));
  const [rows, setRows] = useState<TimePunchRow[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async (path: string) => {
    const response = await fetch(buildApiUrl(path), {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || `HTTP ${response.status}`);
    return payload;
  };

  const loadEmployees = async (nextSearch = searchTerm) => {
    setLoadingEmployees(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.set('report_code', TIME_PUNCH_REPORT.code);
      if (nextSearch.trim()) query.set('search', nextSearch.trim());
      const payload = await request(`/overtime-reports/employees?${query.toString()}`);
      setEmployees((payload?.employees || []) as EmployeeOption[]);
    } catch (requestError: any) {
      setEmployees([]);
      setError(requestError?.message || 'No se pudieron cargar empleados');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const loadFilters = async () => {
    try {
      const payload = await request(`/overtime-reports/filters?report_code=${encodeURIComponent(TIME_PUNCH_REPORT.code)}`);
      setFilters({
        payroll_groups: payload?.filters?.payroll_groups || [],
        cost_centers: payload?.filters?.cost_centers || [],
        departments: payload?.filters?.departments || [],
        areas: payload?.filters?.areas || [],
        work_groups: payload?.filters?.work_groups || [],
      });
    } catch (requestError: any) {
      setError(requestError?.message || 'No se pudieron cargar filtros');
    }
  };

  const loadReportMetadata = async () => {
    try {
      setReportConfig(await fetchSystemReportConfig(TIME_PUNCH_REPORT, getToken()));
    } catch {
      setReportConfig({ ...defaultSystemReportConfig(TIME_PUNCH_REPORT), loaded: true });
    }
  };

  const loadReport = async () => {
    if (dateFrom > dateTo) {
      setError('La fecha Desde no puede ser posterior a Hasta.');
      return;
    }
    setLoadingReport(true);
    setError(null);
    try {
      const query = new URLSearchParams({ date_from: dateFrom, date_to: dateTo, shift_status: shiftStatus });
      if (selectedEmployeeId) query.set('employee_id', selectedEmployeeId);
      if (payrollGroupId) query.set('payroll_group_id', payrollGroupId);
      if (costCenterId) query.set('cost_center_id', costCenterId);
      if (departmentId) query.set('department_id', departmentId);
      if (areaId) query.set('area_id', areaId);
      if (workGroupId) query.set('work_group_id', workGroupId);
      const payload = await request(`/overtime-reports/punches?${query.toString()}`);
      setRows((payload?.rows || []) as TimePunchRow[]);
    } catch (requestError: any) {
      setRows([]);
      setError(requestError?.message || 'No se pudieron cargar las marcaciones');
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    void loadEmployees('');
    void loadFilters();
    void loadReportMetadata();
    void loadReport();
  }, []);

  const reportName = getSystemReportName(reportConfig);
  const reportDescription = reportConfig.report?.report_description || 'Detalle jerarquizado de marcaciones por empleado y estructura organizacional, con dispositivo, coordenadas GPS y turno asignado.';
  const parameterLabel = (key: string, fallback: string) => getReportParameterLabel(reportConfig, key, fallback);
  const showParameter = (key: string) => isReportParameterEnabled(reportConfig, key);

  const metrics = useMemo(() => ({
    employees: new Set(rows.map((row) => row.employee_id)).size,
    withCoordinates: rows.filter((row) => row.punch_latitude !== null && row.punch_longitude !== null).length,
    withShift: rows.filter((row) => row.has_assigned_shift).length,
  }), [rows]);

  const employeeGroups = useMemo(() => buildEmployeePunchGroups(rows), [rows]);
  const isMassiveReport = employeeGroups.length > 1;
  const screenAssetSource =
    rows.find((row) => row.company_id && row.company_banner) ||
    rows.find((row) => row.company_id && row.company_logo) ||
    employees.find((row) => row.company_id && row.company_banner) ||
    employees.find((row) => row.company_id && row.company_logo);
  const reportSections = useMemo(
    () => buildReportSections(employeeGroups, isMassiveReport),
    [employeeGroups, isMassiveReport]
  );

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer la imagen del reporte'));
      reader.readAsDataURL(blob);
    });

  const fetchReportAssetDataUrl = async (): Promise<string> => {
    const bannerRow = rows.find((row) => row.company_id && row.company_banner);
    const logoRow = rows.find((row) => row.company_id && row.company_logo);
    const sourceRow = bannerRow || logoRow;
    if (!sourceRow?.company_id) return '';

    const assetType = bannerRow ? 'banner' : 'logo';
    try {
      const response = await fetch(buildApiUrl(`/organization/companies/${sourceRow.company_id}/asset/${assetType}`), {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) return '';
      const blob = await response.blob();
      if (!blob.size) return '';
      return await blobToDataUrl(blob);
    } catch {
      return '';
    }
  };

  const exportXlsx = () => {
    const sheetRows: Array<Array<string | number>> = [
      EXPORT_COLUMNS,
      ...rows.map(exportDetailValues),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
    worksheet['!cols'] = EXPORT_COLUMNS.map((column) => ({ wch: Math.min(34, Math.max(13, column.length + 3)) }));
    worksheet['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(EXPORT_COLUMNS.length - 1)}${sheetRows.length}` };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Marcaciones');
    XLSX.writeFile(workbook, `marcaciones_${dateFrom}_${dateTo}.xlsx`);
  };

  const exportPdf = async () => {
    const printWindow = window.open('', '_blank', 'width=1400,height=900');
    if (!printWindow) {
      setError('El navegador bloqueó la ventana de impresión PDF. Habilite las ventanas emergentes e intente nuevamente.');
      return;
    }
    printWindow.opener = null;
    const bannerDataUrl = await fetchReportAssetDataUrl();

    const sectionHtml = reportSections.map((section) => {
      if (section.type === 'hierarchy') {
        return `<tr class="hierarchy depth-${section.depth}"><td colspan="6"><strong>${htmlEscape(section.title)}:</strong> ${htmlEscape(section.label)} <span>${section.employeeCount} empleados · ${section.punchCount} marcaciones</span></td></tr>`;
      }
      const { group } = section;
      const detailRows = group.rows.map((row) => `
        <tr class="detail">
          <td>${htmlEscape(formatClientDateTime(row.punch_datetime, 'es-EC'))}</td>
          <td>${htmlEscape(row.punch_label || `Clave ${row.punch_key}`)}</td>
          <td>${htmlEscape(row.punch_source_label || row.punch_source_key || '-')}<br><small>${htmlEscape(row.punch_status_label || row.punch_status_key || 'Sin estado')}</small></td>
          <td>${htmlEscape(row.origin_device || '-')}<br><small>${htmlEscape([row.device_serial_number, row.device_model].filter(Boolean).join(' / ') || '-')}</small></td>
          <td>${htmlEscape(`${formatCoordinate(row.punch_latitude)}, ${formatCoordinate(row.punch_longitude)}`)}</td>
          <td>${row.has_assigned_shift ? 'Sí' : 'No'}<br><small>${htmlEscape(row.shift_short_name || row.shift_name || '-')} ${row.has_assigned_shift ? htmlEscape(`${formatTime(row.shift_start_time)}-${formatTime(row.shift_end_time)}`) : ''}</small></td>
        </tr>`).join('');
      return `
        <tr class="employee"><td colspan="6"><strong>${htmlEscape(group.employee.employee_full_name)}</strong> <span>${htmlEscape(group.employee.employee_code || '-')} · ${group.rows.length} marcaciones</span></td></tr>
        ${detailRows}`;
    }).join('');

    const selectedEmployee = selectedEmployeeId
      ? employees.find((employee) => employee.employee_id === selectedEmployeeId)
      : null;
    const employeeFilterLabel = selectedEmployee
      ? `${employeeName(selectedEmployee)}${selectedEmployee.employee_code ? ` (${selectedEmployee.employee_code})` : ''}`
      : 'Todos los empleados autorizados';

    printWindow.document.write(`<!doctype html>
      <html lang="es"><head><meta charset="utf-8"><title>${htmlEscape(reportName)}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        * { box-sizing: border-box; } body { font-family: Arial, sans-serif; color: #172033; margin: 0; font-size: 9px; }
        .banner { display: block; max-height: 72px; max-width: 100%; object-fit: contain; margin: 0 0 8px; }
        h1 { margin: 0 0 3px; font-size: 19px; } .subtitle { color: #526078; margin-bottom: 10px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 8px 0; }
        .metric { border: 1px solid #cfd8e6; border-radius: 5px; padding: 6px; } .metric strong { display: block; font-size: 14px; }
        .filters { border-collapse: collapse; margin-bottom: 9px; width: 100%; } .filters td { border: 1px solid #dbe2ed; padding: 4px 6px; }
        table.report { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .report th, .report td { border: 1px solid #dbe2ed; padding: 4px; vertical-align: top; overflow-wrap: anywhere; }
        .report th { background: #eef2f7; text-transform: uppercase; font-size: 8px; }
        .report th:nth-child(1) { width: 17%; } .report th:nth-child(2) { width: 11%; } .report th:nth-child(3) { width: 15%; }
        .report th:nth-child(4) { width: 22%; } .report th:nth-child(5) { width: 17%; } .report th:nth-child(6) { width: 18%; }
        .hierarchy td { font-size: 10px; padding: 5px 7px; } .hierarchy span, .employee span { float: right; font-weight: normal; }
        .depth-0 td { background: #1e293b; color: white; } .depth-1 td { background: #dbeafe; padding-left: 14px; }
        .depth-2 td { background: #eef2ff; padding-left: 22px; } .depth-3 td { background: #f5f3ff; padding-left: 30px; }
        .employee td { background: #f8fafc; padding-left: ${isMassiveReport ? '38px' : '7px'}; font-size: 10px; }
        small { color: #64748b; } tr { break-inside: avoid; } .footer { margin-top: 8px; color: #64748b; text-align: right; }
      </style></head><body>
      ${bannerDataUrl ? `<img class="banner" src="${bannerDataUrl}" alt="Banner empresa" />` : ''}
      <h1>${htmlEscape(reportName)}</h1><div class="subtitle">${htmlEscape(reportDescription)}</div>
      <table class="filters"><tr><td><strong>Período:</strong> ${htmlEscape(dateFrom)} a ${htmlEscape(dateTo)}</td><td><strong>Empleado:</strong> ${htmlEscape(employeeFilterLabel)}</td><td><strong>Agrupación:</strong> ${isMassiveReport ? 'Jerarquía organizacional' : 'Empleado'}</td></tr></table>
      <div class="summary"><div class="metric">Marcaciones<strong>${rows.length}</strong></div><div class="metric">Empleados<strong>${metrics.employees}</strong></div><div class="metric">Con coordenadas<strong>${metrics.withCoordinates}</strong></div><div class="metric">Con turno<strong>${metrics.withShift}</strong></div></div>
      <table class="report"><thead><tr><th>Fecha y hora</th><th>Marcación</th><th>Fuente / estado</th><th>Dispositivo</th><th>Latitud, longitud</th><th>Turno asignado</th></tr></thead><tbody>${sectionHtml}</tbody></table>
      <div class="footer">Titanium Labs Corp.&trade; 2026 &copy; | Generado ${htmlEscape(formatClientDateTime(new Date().toISOString(), 'es-EC'))}</div>
      <script>window.addEventListener('load',()=>{window.print();});<\/script></body></html>`);
    printWindow.document.close();
  };

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-0 flex-col gap-4 overflow-hidden">
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <ReportCompanyAsset
          companyId={screenAssetSource?.company_id}
          banner={screenAssetSource?.company_banner}
          logo={screenAssetSource?.company_logo}
          className="mb-4"
        />
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Clock3 className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{reportName}</h1>
              <p className="text-sm text-slate-600">{reportDescription}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <div className="rounded-lg border px-3 py-2">
              <p className="text-xs text-slate-500">Marcaciones</p>
              <p className="font-semibold">{rows.length}</p>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <p className="text-xs text-slate-500">Empleados</p>
              <p className="font-semibold">{metrics.employees}</p>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <p className="text-xs text-slate-500">Con coordenadas</p>
              <p className="font-semibold text-blue-700">{metrics.withCoordinates}</p>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <p className="text-xs text-slate-500">Con turno</p>
              <p className="font-semibold text-emerald-700">{metrics.withShift}</p>
            </div>
          </div>
        </div>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr_auto_auto_auto]">
          {(showParameter('EMPLOYEE_ID') || showParameter('EMPLOYEE_SEARCH')) ? <div>
            <label className="text-sm font-medium text-slate-700">{parameterLabel('EMPLOYEE_ID', 'Empleado')}</label>
            <div className="mt-1 flex gap-2">
              {showParameter('EMPLOYEE_ID') ? <select
                value={selectedEmployeeId}
                onChange={(event) => setSelectedEmployeeId(event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-md border px-3 text-sm"
                disabled={loadingEmployees}
              >
                <option value="">Todos los empleados autorizados</option>
                {employees.map((row) => (
                  <option key={row.employee_id} value={row.employee_id}>
                    {employeeName(row)}{row.employee_code ? ` (${row.employee_code})` : ''}
                  </option>
                ))}
              </select> : null}
              {showParameter('EMPLOYEE_SEARCH') ? <div className="relative w-44">
                <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') void loadEmployees(); }}
                  placeholder={parameterLabel('EMPLOYEE_SEARCH', 'Buscar')}
                  className="h-10 w-full rounded-md border py-2 pl-8 pr-2 text-sm"
                />
              </div> : null}
            </div>
          </div> : null}
          {showParameter('DATE_FROM') ? <div>
            <label className="text-sm font-medium text-slate-700">{parameterLabel('DATE_FROM', 'Desde')}</label>
            <StandardDateInput value={dateFrom} onValueChange={setDateFrom} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" />
          </div> : null}
          {showParameter('DATE_TO') ? <div>
            <label className="text-sm font-medium text-slate-700">{parameterLabel('DATE_TO', 'Hasta')}</label>
            <StandardDateInput value={dateTo} onValueChange={setDateTo} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" />
          </div> : null}
          <div className="flex items-end">
            <button type="button" onClick={() => void loadReport()} disabled={loadingReport} className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw className={`size-4 ${loadingReport ? 'animate-spin' : ''}`} />
              Consultar
            </button>
          </div>
          <div className="flex items-end">
            <button type="button" onClick={exportXlsx} disabled={loadingReport || rows.length === 0} className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm hover:bg-slate-50 disabled:opacity-50">
              <Download className="size-4" />
              XLS
            </button>
          </div>
          <div className="flex items-end">
            <button type="button" onClick={() => void exportPdf()} disabled={loadingReport || rows.length === 0} className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm hover:bg-slate-50 disabled:opacity-50">
              <FileText className="size-4" />
              PDF
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {showParameter('DEPARTMENT_ID') ? <FilterSelect label={parameterLabel('DEPARTMENT_ID', 'Departamento')} value={departmentId} onChange={setDepartmentId} options={filters.departments} allLabel="Todos" /> : null}
          {showParameter('AREA_ID') ? <FilterSelect label={parameterLabel('AREA_ID', 'Área')} value={areaId} onChange={setAreaId} options={filters.areas} allLabel="Todas" /> : null}
          {showParameter('PAYROLL_GROUP_ID') ? <FilterSelect label={parameterLabel('PAYROLL_GROUP_ID', 'Rol de pago')} value={payrollGroupId} onChange={setPayrollGroupId} options={filters.payroll_groups} allLabel="Todos" /> : null}
          {showParameter('COST_CENTER_ID') ? <FilterSelect label={parameterLabel('COST_CENTER_ID', 'Centro de costo')} value={costCenterId} onChange={setCostCenterId} options={filters.cost_centers} allLabel="Todos" /> : null}
          {showParameter('WORK_GROUP_ID') ? <FilterSelect label={parameterLabel('WORK_GROUP_ID', 'Grupo de trabajo')} value={workGroupId} onChange={setWorkGroupId} options={filters.work_groups} allLabel="Todos" /> : null}
          {showParameter('SHIFT_STATUS') ? <div>
            <label className="text-sm font-medium text-slate-700">{parameterLabel('SHIFT_STATUS', 'Turno asignado')}</label>
            <select value={shiftStatus} onChange={(event) => setShiftStatus(event.target.value)} className="mt-1 h-10 w-full rounded-md border px-3 text-sm">
              <option value="all">Todos</option>
              <option value="assigned">Con turno</option>
              <option value="unassigned">Sin turno</option>
            </select>
          </div> : null}
        </div>

        {rows.length > 0 ? (
          <div className={`mt-3 rounded-md border px-3 py-2 text-xs ${isMassiveReport ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
            {isMassiveReport
              ? `Consulta multiempleado: ${metrics.employees} empleados. Agrupada por empresa, departamento, área, centro de costo y empleado.`
              : 'Consulta individual agrupada por empleado.'}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[2050px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Fecha y hora</th>
              <th className="px-3 py-2">Marcación</th>
              <th className="px-3 py-2">Fuente / estado</th>
              <th className="px-3 py-2">Dispositivo</th>
              <th className="px-3 py-2">Latitud</th>
              <th className="px-3 py-2">Longitud</th>
              <th className="px-3 py-2">Precisión</th>
              <th className="px-3 py-2">Turno asignado</th>
              <th className="px-3 py-2">Empresa / organización</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Notas</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={REPORT_COLUMN_COUNT} className="px-3 py-10 text-center text-slate-500">{loadingReport ? 'Consultando marcaciones...' : 'Sin marcaciones para los filtros seleccionados.'}</td></tr>
            ) : reportSections.map((section) => {
              if (section.type === 'hierarchy') {
                return (
                  <tr key={section.key} className={`border-t ${hierarchyRowClass(section.depth)}`}>
                    <td colSpan={REPORT_COLUMN_COUNT} className="px-3 py-2" style={{ paddingLeft: `${12 + (section.depth * 18)}px` }}>
                      <span className="font-semibold">{section.title}: {section.label}</span>
                      <span className="ml-3 text-xs opacity-75">{section.employeeCount} empleados · {section.punchCount} marcaciones</span>
                    </td>
                  </tr>
                );
              }

              const { group } = section;
              return (
                <Fragment key={section.key}>
                  <tr className="border-t bg-indigo-50 text-indigo-950">
                    <td colSpan={REPORT_COLUMN_COUNT} className="px-3 py-2 font-semibold" style={{ paddingLeft: isMassiveReport ? '84px' : '12px' }}>
                      {group.employee.employee_full_name || '-'}
                      <span className="ml-2 text-xs font-normal text-indigo-700">
                        {group.employee.employee_code || '-'} · {group.rows.length} marcaciones
                        {!isMassiveReport ? ` · ${group.employee.company_name || '-'} · ${group.employee.department_name || '-'} / ${group.employee.area_name || '-'} / ${group.employee.cost_center_name || '-'}` : ''}
                      </span>
                    </td>
                  </tr>
                  {group.rows.map((row) => (
              <tr key={row.id} className="border-t align-top hover:bg-slate-50">
                <td className="whitespace-nowrap px-3 py-2">
                  <div>{formatClientDateTime(row.punch_datetime, 'es-EC')}</div>
                  <div className="text-xs text-slate-500">{row.punch_time_zone || '-'}</div>
                </td>
                <td className="px-3 py-2 font-medium">{row.punch_label || `Clave ${row.punch_key}`}</td>
                <td className="px-3 py-2">
                  <div>{row.punch_source_label || row.punch_source_key || '-'}</div>
                  <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.punch_status_key)}`}>
                    {row.punch_status_label || row.punch_status_key || 'Sin estado'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium">{row.origin_device || '-'}</div>
                  <div className="text-xs text-slate-500">{[row.device_serial_number, row.device_model, row.device_type_label].filter(Boolean).join(' · ') || '-'}</div>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{formatCoordinate(row.punch_latitude)}</td>
                <td className="px-3 py-2 font-mono text-xs">{formatCoordinate(row.punch_longitude)}</td>
                <td className="px-3 py-2">{row.location_accuracy_meters === null ? '-' : `${Number(row.location_accuracy_meters).toFixed(1)} m`}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${row.has_assigned_shift ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {row.has_assigned_shift ? 'Sí' : 'No'}
                  </span>
                  <div className="mt-1">{row.shift_short_name || row.shift_name || '-'}</div>
                  <div className="text-xs text-slate-500">{row.has_assigned_shift ? `${formatTime(row.shift_start_time)} - ${formatTime(row.shift_end_time)}` : '-'}</div>
                </td>
                <td className="px-3 py-2">
                  <div>{row.company_name || '-'}</div>
                  <div className="text-xs text-slate-500">{[row.department_name, row.area_name, row.work_group_name].filter(Boolean).join(' / ') || '-'}</div>
                </td>
                <td className="px-3 py-2">
                  <div>{[row.client_device_type, row.client_platform].filter(Boolean).join(' / ') || '-'}</div>
                  <div className="text-xs text-slate-500">IP: {row.client_ip || '-'}</div>
                </td>
                <td className="max-w-72 whitespace-normal px-3 py-2 text-slate-600">{row.notes || '-'}</td>
              </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  allLabel: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-md border px-3 text-sm">
        <option value="">{allLabel}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label || option.id}</option>)}
      </select>
    </div>
  );
}
