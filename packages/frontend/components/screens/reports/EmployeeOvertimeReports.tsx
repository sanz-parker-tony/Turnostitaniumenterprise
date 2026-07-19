'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, FileText, RefreshCw, Search } from 'lucide-react';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { buildApiUrl } from '../../../utils/api-config';
import { publicApiToken } from '../../../utils/backend/info';
import { useAuth } from '../../../contexts/AuthContext';
import { formatClientDateTime, formatClientTime24, formatStandardDate } from '../../../utils/date-time';
import { StandardDateInput } from '../../ui/standard-date-input';
import {
  defaultSystemReportConfig,
  fetchSystemReportConfig,
  getReportParameterLabel,
  getSystemReportName,
  isReportParameterEnabled,
  type SystemReportConfig,
} from '../../../utils/system-report-config';

interface EmployeeOption {
  employee_id: string;
  employee_code: string | null;
  employee_name: string | null;
  employee_lastname: string | null;
  company_name: string | null;
}

interface ReportFilterOption {
  id: string;
  label: string | null;
}

interface ReportFilters {
  payroll_groups: ReportFilterOption[];
  cost_centers: ReportFilterOption[];
  departments: ReportFilterOption[];
  areas: ReportFilterOption[];
  work_groups: ReportFilterOption[];
}

interface OvertimeDetailRow {
  employee_id: string;
  employee_code: string | null;
  employee_full_name: string;
  company_id: string | null;
  company_name: string | null;
  company_logo: string | null;
  company_banner: string | null;
  work_location_name: string | null;
  cost_center_name: string | null;
  payroll_group_name: string | null;
  work_group_name: string | null;
  department_name: string | null;
  area_name: string | null;
  shift_date: string;
  shift_name: string | null;
  shift_short_name: string | null;
  shift_work_start: string | null;
  shift_work_end: string | null;
  first_entry: string | null;
  last_exit: string | null;
  worked_minutes: number;
  ordinary_minutes: number;
  night_25_minutes: number;
  extra_50_minutes: number;
  extra_100_minutes: number;
  non_working_100_minutes: number;
  late_minutes: number;
  early_departure_minutes: number;
  absence_minutes: number;
  lunch_excess_minutes: number;
  unjustified_incident_minutes: number;
  unpaid_leave_minutes: number;
}

interface OvertimeSummaryRow {
  employee_id: string;
  employee_code: string | null;
  employee_full_name: string;
  company_id: string | null;
  company_name: string | null;
  company_logo: string | null;
  company_banner: string | null;
  work_location_name: string | null;
  cost_center_name: string | null;
  payroll_group_name: string | null;
  work_group_name: string | null;
  department_name: string | null;
  area_name: string | null;
  planned_days: number;
  worked_days: number;
  worked_minutes: number;
  ordinary_minutes: number;
  night_25_minutes: number;
  extra_50_minutes: number;
  extra_100_minutes: number;
  non_working_100_minutes: number;
  late_minutes: number;
  early_departure_minutes: number;
  absence_minutes: number;
  lunch_excess_minutes: number;
  unjustified_incident_minutes: number;
  unpaid_leave_minutes: number;
  discount_minutes: number;
  net_extra_100_minutes: number;
}

type ReportTab = 'detail' | 'summary';

const OVERTIME_DETAIL_REPORT = {
  code: 'RPT_HORA_EXTRA_DETA',
  name: 'Horas y sobretiempos detallado',
};

const OVERTIME_SUMMARY_REPORT = {
  code: 'RPT_HORA_EXTRA_RESU',
  name: 'Horas y sobretiempos resumido',
};

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

function fullEmployeeName(employee: EmployeeOption | null | undefined): string {
  if (!employee) return '';
  const name = `${employee.employee_lastname || ''} ${employee.employee_name || ''}`.trim();
  return name || employee.employee_code || employee.employee_id;
}

function asNumber(value: unknown): number {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatHours(minutes: unknown): string {
  return (asNumber(minutes) / 60).toLocaleString('es-EC', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string | null): string {
  return formatStandardDate(value);
}

function formatDateShort(value: string | null): string {
  return formatStandardDate(value);
}

function formatTime24(value: string | null): string {
  return formatClientTime24(value, 'es-EC');
}

function htmlEscape(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface XlsCellOptions {
  value: unknown;
  colspan?: number;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

type XlsCell = unknown | XlsCellOptions;

function xlsCell(cell: XlsCell): string {
  if (cell && typeof cell === 'object' && 'value' in cell) {
    const options = cell as XlsCellOptions;
    const colspan = options.colspan ? ` colspan="${options.colspan}"` : '';
    const className = options.className ? ` class="${options.className}"` : '';
    const align = options.align ? ` style="text-align:${options.align};"` : '';
    return `<td${colspan}${className}${align}>${htmlEscape(options.value)}</td>`;
  }
  return `<td>${htmlEscape(cell)}</td>`;
}

function xlsRow(cells: XlsCell[]): string {
  return `<tr>${cells.map(xlsCell).join('')}</tr>`;
}

function downloadXls(filename: string, worksheetName: string, tableRows: string[]) {
  const table = document.createElement('table');
  table.innerHTML = tableRows.join('');
  const workbook = XLSX.utils.table_to_book(table, { sheet: worksheetName });
  const worksheet = workbook.Sheets[worksheetName];
  if (worksheet) {
    worksheet['!cols'] = Array.from({ length: 18 }, () => ({ wch: 14 }));
  }
  const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.replace(/\.xls$/i, '.xlsx');
  link.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<unknown>>) {
  downloadXls(
    filename.replace(/\.csv$/i, '.xls'),
    'Reporte',
    [xlsRow(headers.map((header) => ({ value: header, className: 'header' }))), ...rows.map((row) => xlsRow(row))]
  );
}

function sumMinutes<T>(rows: T[], selector: (row: T) => unknown): number {
  return rows.reduce((total, row) => total + asNumber(selector(row)), 0);
}

function decimalHours(minutes: unknown): number {
  return Number((asNumber(minutes) / 60).toFixed(2));
}

function hasDailyDetailShape(row: Record<string, unknown>): boolean {
  return Boolean(
    row.shift_date ||
    row.shift_name ||
    row.shift_short_name ||
    row.shift_work_start ||
    row.shift_work_end ||
    row.first_entry ||
    row.last_exit
  );
}

function aggregateRowsByEmployee(rows: Array<OvertimeSummaryRow & Record<string, unknown>>): OvertimeSummaryRow[] {
  const byEmployee = new Map<string, OvertimeSummaryRow>();
  const numericKeys: Array<keyof Pick<
    OvertimeSummaryRow,
    | 'planned_days'
    | 'worked_days'
    | 'worked_minutes'
    | 'ordinary_minutes'
    | 'night_25_minutes'
    | 'extra_50_minutes'
    | 'extra_100_minutes'
    | 'non_working_100_minutes'
    | 'late_minutes'
    | 'early_departure_minutes'
    | 'absence_minutes'
    | 'lunch_excess_minutes'
    | 'unjustified_incident_minutes'
    | 'unpaid_leave_minutes'
    | 'discount_minutes'
    | 'net_extra_100_minutes'
  >> = [
    'planned_days',
    'worked_days',
    'worked_minutes',
    'ordinary_minutes',
    'night_25_minutes',
    'extra_50_minutes',
    'extra_100_minutes',
    'non_working_100_minutes',
    'late_minutes',
    'early_departure_minutes',
    'absence_minutes',
    'lunch_excess_minutes',
    'unjustified_incident_minutes',
    'unpaid_leave_minutes',
    'discount_minutes',
    'net_extra_100_minutes',
  ];

  rows.forEach((row) => {
    const existing = byEmployee.get(row.employee_id);
    if (!existing) {
      byEmployee.set(row.employee_id, { ...row });
      return;
    }

    numericKeys.forEach((key) => {
      existing[key] = asNumber(existing[key]) + asNumber(row[key]) as never;
    });
  });

  return Array.from(byEmployee.values());
}

function consolidateDetailRows(rows: OvertimeDetailRow[]): OvertimeDetailRow[] {
  const byEmployeeDate = new Map<string, OvertimeDetailRow>();

  rows.forEach((row) => {
    const key = `${row.employee_id}-${row.shift_date}`;
    const existing = byEmployeeDate.get(key);
    if (!existing) {
      byEmployeeDate.set(key, { ...row });
      return;
    }

    existing.first_entry = existing.first_entry || row.first_entry;
    existing.last_exit = existing.last_exit || row.last_exit;
    existing.worked_minutes = Math.max(asNumber(existing.worked_minutes), asNumber(row.worked_minutes));
    existing.ordinary_minutes = Math.max(asNumber(existing.ordinary_minutes), asNumber(row.ordinary_minutes));
    existing.night_25_minutes = Math.max(asNumber(existing.night_25_minutes), asNumber(row.night_25_minutes));
    existing.extra_50_minutes = Math.max(asNumber(existing.extra_50_minutes), asNumber(row.extra_50_minutes));
    existing.extra_100_minutes = Math.max(asNumber(existing.extra_100_minutes), asNumber(row.extra_100_minutes));
    existing.non_working_100_minutes = Math.max(asNumber(existing.non_working_100_minutes), asNumber(row.non_working_100_minutes));
    existing.late_minutes = Math.max(asNumber(existing.late_minutes), asNumber(row.late_minutes));
    existing.early_departure_minutes = Math.max(asNumber(existing.early_departure_minutes), asNumber(row.early_departure_minutes));
    existing.absence_minutes = Math.max(asNumber(existing.absence_minutes), asNumber(row.absence_minutes));
    existing.lunch_excess_minutes = Math.max(asNumber(existing.lunch_excess_minutes), asNumber(row.lunch_excess_minutes));
    existing.unjustified_incident_minutes = Math.max(asNumber(existing.unjustified_incident_minutes), asNumber(row.unjustified_incident_minutes));
    existing.unpaid_leave_minutes = Math.max(asNumber(existing.unpaid_leave_minutes), asNumber(row.unpaid_leave_minutes));
  });

  return Array.from(byEmployeeDate.values());
}

export default function EmployeeOvertimeReports() {
  const { profile } = useAuth();
  const reportUserName = profile?.display_name || profile?.email || 'Usuario';
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
  const [activeTab, setActiveTab] = useState<ReportTab>('detail');
  const [filters, setFilters] = useState<ReportFilters>({ payroll_groups: [], cost_centers: [], departments: [], areas: [], work_groups: [] });
  const [detailRows, setDetailRows] = useState<OvertimeDetailRow[]>([]);
  const [summaryRows, setSummaryRows] = useState<OvertimeSummaryRow[]>([]);
  const [detailReportConfig, setDetailReportConfig] = useState<SystemReportConfig>(() => defaultSystemReportConfig(OVERTIME_DETAIL_REPORT));
  const [summaryReportConfig, setSummaryReportConfig] = useState<SystemReportConfig>(() => defaultSystemReportConfig(OVERTIME_SUMMARY_REPORT));
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
      const payload = await request('/overtime-reports/filters');
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
      const [detailConfig, summaryConfig] = await Promise.all([
        fetchSystemReportConfig(OVERTIME_DETAIL_REPORT, getToken()),
        fetchSystemReportConfig(OVERTIME_SUMMARY_REPORT, getToken()),
      ]);
      setDetailReportConfig(detailConfig);
      setSummaryReportConfig(summaryConfig);
    } catch {
      setDetailReportConfig(defaultSystemReportConfig(OVERTIME_DETAIL_REPORT));
      setSummaryReportConfig(defaultSystemReportConfig(OVERTIME_SUMMARY_REPORT));
    }
  };

  const activeReportConfig = activeTab === 'summary' ? summaryReportConfig : detailReportConfig;
  const detailReportName = getSystemReportName(detailReportConfig);
  const summaryReportName = getSystemReportName(summaryReportConfig);
  const parameterLabel = (key: string, fallback: string) => getReportParameterLabel(activeReportConfig, key, fallback);
  const showParameter = (key: string) => isReportParameterEnabled(activeReportConfig, key);

  const loadReports = async () => {
    setLoadingReport(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      query.set('date_from', dateFrom);
      query.set('date_to', dateTo);
      if (selectedEmployeeId) query.set('employee_id', selectedEmployeeId);
      if (payrollGroupId) query.set('payroll_group_id', payrollGroupId);
      if (costCenterId) query.set('cost_center_id', costCenterId);
      if (departmentId) query.set('department_id', departmentId);
      if (areaId) query.set('area_id', areaId);
      if (workGroupId) query.set('work_group_id', workGroupId);

      const [detailPayload, summaryPayload] = await Promise.all([
        request(`/overtime-reports/detail?${query.toString()}`),
        request(`/overtime-reports/summary?${query.toString()}`),
      ]);
      setDetailRows(consolidateDetailRows((detailPayload?.rows || []) as OvertimeDetailRow[]));
      setSummaryRows(((summaryPayload?.rows || []) as Array<OvertimeSummaryRow & { shift_date?: unknown }>).filter((row) => !row.shift_date));
    } catch (requestError: any) {
      setDetailRows([]);
      setSummaryRows([]);
      setError(requestError?.message || 'No se pudieron cargar reportes');
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    void loadEmployees('');
    void loadFilters();
    void loadReportMetadata();
  }, []);

  useEffect(() => {
    void loadReports();
  }, []);

  const summaryDisplayRows = useMemo(() => {
    const rows = summaryRows as Array<OvertimeSummaryRow & Record<string, unknown>>;
    const consolidatedRows = rows.filter((row) => !hasDailyDetailShape(row));
    return consolidatedRows.length > 0 ? consolidatedRows : aggregateRowsByEmployee(rows);
  }, [summaryRows]);

  const detailGroups = useMemo(() => {
    const byEmployee = new Map<string, OvertimeDetailRow[]>();
    detailRows.forEach((row) => {
      const employeeRows = byEmployee.get(row.employee_id) || [];
      employeeRows.push(row);
      byEmployee.set(row.employee_id, employeeRows);
    });

    return Array.from(byEmployee.values())
      .map((rows) => ({
        employee: rows[0],
        rows: [...rows].sort((left, right) => String(left.shift_date || '').localeCompare(String(right.shift_date || ''))),
      }))
      .sort((left, right) => {
        const nameCompare = String(left.employee.employee_full_name || '').localeCompare(String(right.employee.employee_full_name || ''), 'es');
        if (nameCompare !== 0) return nameCompare;
        return String(left.employee.employee_code || '').localeCompare(String(right.employee.employee_code || ''), 'es');
      });
  }, [detailRows]);

  const totals = useMemo(() => {
    return summaryDisplayRows.reduce(
      (acc, row) => {
        acc.worked += asNumber(row.worked_minutes);
        acc.night25 += asNumber(row.night_25_minutes);
        acc.extra50 += asNumber(row.extra_50_minutes);
        acc.extra100 += asNumber(row.extra_100_minutes);
        acc.discounts += asNumber(row.discount_minutes);
        return acc;
      },
      { worked: 0, night25: 0, extra50: 0, extra100: 0, discounts: 0 }
    );
  }, [summaryDisplayRows]);

  const getFilterLabel = (options: ReportFilterOption[], selectedId: string, emptyLabel = 'Todos') => {
    if (!selectedId) return emptyLabel;
    return options.find((option) => option.id === selectedId)?.label || selectedId;
  };

  const selectedEmployeeLabel = () => {
    if (!selectedEmployeeId) return 'Todos';
    const selectedEmployee = employees.find((employee) => employee.employee_id === selectedEmployeeId);
    return selectedEmployee ? fullEmployeeName(selectedEmployee) : selectedEmployeeId;
  };

  const applyReportHeader = (worksheet: ExcelJS.Worksheet, title: string) => {
    worksheet.getCell('A1').value = title;
    worksheet.getCell('C2').value = 'Usuario :';
    worksheet.getCell('D2').value = reportUserName;
    worksheet.getCell('F2').value = 'Fecha :';
    worksheet.getCell('G2').value = formatClientDateTime(new Date().toISOString(), 'es-EC');
    worksheet.getCell('C3').value = 'Fecha Inic :';
    worksheet.getCell('D3').value = formatDateShort(dateFrom);
    worksheet.getCell('F3').value = 'Fecha Final :';
    worksheet.getCell('G3').value = formatDateShort(dateTo);
    worksheet.getCell('A4').value = 'Departamento :';
    worksheet.getCell('B4').value = getFilterLabel(filters.departments, departmentId);
    worksheet.getCell('C4').value = 'Área :';
    worksheet.getCell('D4').value = getFilterLabel(filters.areas, areaId);
    worksheet.getCell('E4').value = 'Rol Pago :';
    worksheet.getCell('F4').value = getFilterLabel(filters.payroll_groups, payrollGroupId);
    worksheet.getCell('G4').value = 'C.Costo :';
    worksheet.getCell('H4').value = getFilterLabel(filters.cost_centers, costCenterId);
    worksheet.getCell('I4').value = 'Grupo Trabajo :';
    worksheet.getCell('J4').value = getFilterLabel(filters.work_groups, workGroupId);
    worksheet.getCell('A5').value = 'Empleado :';
    worksheet.getCell('B5').value = selectedEmployeeLabel();

    ['A1', 'C2', 'F2', 'C3', 'F3', 'A4', 'C4', 'E4', 'G4', 'I4', 'A5'].forEach((address) => {
      worksheet.getCell(address).font = { bold: true };
    });
  };

  const setSheetColumns = (worksheet: ExcelJS.Worksheet, widths: number[]) => {
    worksheet.columns = widths.map((width) => ({ width }));
  };

  const styleHeaderRow = (row: ExcelJS.Row) => {
    row.height = 30;
    row.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });
  };

  const styleGroupRow = (worksheet: ExcelJS.Worksheet, rowNumber: number, columnCount: number) => {
    worksheet.mergeCells(rowNumber, 1, rowNumber, columnCount);
    const row = worksheet.getRow(rowNumber);
    row.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    });
  };

  const styleTotalRow = (row: ExcelJS.Row) => {
    row.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    });
  };

  const setNumberCells = (row: ExcelJS.Row, startColumn: number, endColumn: number) => {
    for (let columnIndex = startColumn; columnIndex <= endColumn; columnIndex += 1) {
      const cell = row.getCell(columnIndex);
      cell.numFmt = '0.00';
      cell.alignment = { horizontal: 'right' };
    }
  };

  const writeXlsxWorkbook = async (workbook: ExcelJS.Workbook, filename: string) => {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace(/\.xls$/i, '.xlsx');
    link.click();
    URL.revokeObjectURL(url);
  };

  const reportHeaderRows = (title: string, columnCount: number) => [
    xlsRow([{ value: title, colspan: columnCount, className: 'title' }]),
    xlsRow([
      '',
      '',
      { value: 'Usuario :', className: 'label' },
      reportUserName,
      '',
      { value: 'Fecha :', className: 'label' },
      formatClientDateTime(new Date().toISOString(), 'es-EC'),
    ]),
    xlsRow([
      '',
      '',
      { value: 'Fecha Inic :', className: 'label' },
      formatDate(dateFrom),
      '',
      { value: 'Fecha Final :', className: 'label' },
      formatDate(dateTo),
    ]),
    xlsRow([
      { value: 'Departamento :', className: 'label' },
      getFilterLabel(filters.departments, departmentId),
      { value: 'Área :', className: 'label' },
      getFilterLabel(filters.areas, areaId),
      { value: 'Rol Pago :', className: 'label' },
      getFilterLabel(filters.payroll_groups, payrollGroupId),
      { value: 'C.Costo :', className: 'label' },
      getFilterLabel(filters.cost_centers, costCenterId),
      { value: 'Grupo Trabajo :', className: 'label' },
      getFilterLabel(filters.work_groups, workGroupId),
    ]),
    xlsRow([
      { value: 'Empleado :', className: 'label' },
      { value: selectedEmployeeLabel(), colspan: columnCount - 1 },
    ]),
    xlsRow(Array.from({ length: columnCount }, () => '')),
  ];

  const detailEmployeeLabel = (row: OvertimeDetailRow) => `${row.employee_code || row.employee_id} - ${row.employee_full_name}`;
  const summaryEmployeeLabel = (row: OvertimeSummaryRow) => `${row.employee_code || row.employee_id} - ${row.employee_full_name}`;
  const discountMinutes = (row: Pick<OvertimeDetailRow | OvertimeSummaryRow, 'late_minutes' | 'early_departure_minutes' | 'absence_minutes'>) =>
    asNumber(row.late_minutes) + asNumber(row.early_departure_minutes) + asNumber(row.absence_minutes);
  const positionCells = (row: Pick<OvertimeSummaryRow, 'department_name' | 'area_name' | 'payroll_group_name' | 'cost_center_name' | 'work_group_name'>) => [
    row.department_name || '-',
    row.area_name || '-',
    row.payroll_group_name || '-',
    row.cost_center_name || '-',
    row.work_group_name || '-',
  ];
  const valueHeaderCells = [
    { value: 'Trab.', className: 'header' },
    { value: '0%', className: 'header' },
    { value: '25%', className: 'header' },
    { value: '50%', className: 'header' },
    { value: '100%', className: 'header' },
    { value: '100%\nNo Laboral', className: 'header' },
    { value: 'Atraso', className: 'header' },
    { value: 'SAnt.', className: 'header' },
    { value: 'Falta', className: 'header' },
    { value: 'Todos los\ndescuentos', className: 'header' },
  ];
  const headersFromValueCells = () => valueHeaderCells.map((cell) => String(cell.value));
  const valueCells = (row: OvertimeDetailRow | OvertimeSummaryRow, className = 'number') => [
    { value: formatHours(row.worked_minutes), className },
    { value: formatHours(row.ordinary_minutes), className },
    { value: formatHours(row.night_25_minutes), className },
    { value: formatHours(row.extra_50_minutes), className },
    { value: formatHours(row.extra_100_minutes), className },
    { value: formatHours(row.non_working_100_minutes), className },
    { value: formatHours(row.late_minutes), className },
    { value: formatHours(row.early_departure_minutes), className },
    { value: formatHours(row.absence_minutes), className },
    { value: formatHours(discountMinutes(row)), className },
  ];
  const totalValueCells = (rows: Array<OvertimeDetailRow | OvertimeSummaryRow>) => [
    { value: formatHours(sumMinutes(rows, (row) => row.worked_minutes)), className: 'number total' },
    { value: formatHours(sumMinutes(rows, (row) => row.ordinary_minutes)), className: 'number total' },
    { value: formatHours(sumMinutes(rows, (row) => row.night_25_minutes)), className: 'number total' },
    { value: formatHours(sumMinutes(rows, (row) => row.extra_50_minutes)), className: 'number total' },
    { value: formatHours(sumMinutes(rows, (row) => row.extra_100_minutes)), className: 'number total' },
    { value: formatHours(sumMinutes(rows, (row) => row.non_working_100_minutes)), className: 'number total' },
    { value: formatHours(sumMinutes(rows, (row) => row.late_minutes)), className: 'number total' },
    { value: formatHours(sumMinutes(rows, (row) => row.early_departure_minutes)), className: 'number total' },
    { value: formatHours(sumMinutes(rows, (row) => row.absence_minutes)), className: 'number total' },
    { value: formatHours(sumMinutes(rows, discountMinutes)), className: 'number total' },
  ];

  const exportDetailXls = () => {
    const columnCount = 18;
    const tableRows = reportHeaderRows('RPT_HORA_EXTRA_DETA', columnCount);
    const rowsByEmployee = new Map<string, OvertimeDetailRow[]>();

    detailRows.forEach((row) => {
      const employeeRows = rowsByEmployee.get(row.employee_id) || [];
      employeeRows.push(row);
      rowsByEmployee.set(row.employee_id, employeeRows);
    });

    rowsByEmployee.forEach((employeeRows) => {
      const firstRow = employeeRows[0];
      tableRows.push(xlsRow([{ value: `Localidad : ${firstRow.work_location_name || '-'}`, colspan: columnCount, className: 'group' }]));
      tableRows.push(xlsRow([{ value: ` : ${firstRow.company_name || '-'}`, colspan: columnCount, className: 'group' }]));
      tableRows.push(xlsRow([{ value: ` : ${firstRow.department_name || '-'}`, colspan: columnCount, className: 'group' }]));
      tableRows.push(xlsRow([{ value: ` : ${firstRow.area_name || '-'}`, colspan: columnCount, className: 'group' }]));
      tableRows.push(xlsRow([{ value: ` : ${firstRow.work_group_name || '-'}`, colspan: columnCount, className: 'group' }]));
      tableRows.push(xlsRow([{ value: `Empleado : ${detailEmployeeLabel(firstRow)}`, colspan: columnCount, className: 'group' }]));
      tableRows.push(xlsRow([
        '',
        '',
        { value: 'Marcación', colspan: 2, className: 'header' },
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        { value: 'Sobretiempo', colspan: 3, className: 'header' },
        { value: 'Referencial', colspan: 2, className: 'header' },
        '',
      ]));
      tableRows.push(xlsRow([
        { value: 'Fecha', className: 'header' },
        { value: 'Turno', className: 'header' },
        { value: 'Entrada', className: 'header' },
        { value: 'Salida', className: 'header' },
        { value: 'Falta', className: 'header' },
        { value: 'SPI', className: 'header' },
        { value: 'Atraso', className: 'header' },
        { value: 'SAnt.', className: 'header' },
        { value: 'Just.', className: 'header' },
        { value: 'Inc.', className: 'header' },
        { value: 'ExLun', className: 'header' },
        { value: 'H.Trab.', className: 'header' },
        { value: '25%', className: 'header' },
        { value: '50%', className: 'header' },
        { value: '100%', className: 'header' },
        { value: 'Suple', className: 'header' },
        { value: 'Extra', className: 'header' },
        { value: '', className: 'header' },
      ]));

      employeeRows.forEach((row) => {
        tableRows.push(xlsRow([
          row.shift_date,
          row.shift_short_name || row.shift_name || '',
          formatTime24(row.first_entry),
          formatTime24(row.last_exit),
          { value: formatHours(row.absence_minutes), className: 'number' },
          { value: formatHours(row.unpaid_leave_minutes), className: 'number' },
          { value: formatHours(row.late_minutes), className: 'number' },
          { value: formatHours(row.early_departure_minutes), className: 'number' },
          { value: '0,00', className: 'number' },
          { value: formatHours(row.unjustified_incident_minutes), className: 'number' },
          { value: formatHours(row.lunch_excess_minutes), className: 'number' },
          { value: formatHours(row.worked_minutes), className: 'number' },
          { value: formatHours(row.night_25_minutes), className: 'number' },
          { value: formatHours(row.extra_50_minutes), className: 'number' },
          { value: formatHours(row.extra_100_minutes), className: 'number' },
          { value: '0,00', className: 'number' },
          { value: formatHours(row.extra_100_minutes), className: 'number' },
          '',
        ]));
      });

      tableRows.push(xlsRow(Array.from({ length: columnCount }, () => '')));
      tableRows.push(xlsRow([
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        { value: 'Total Horas Trabajadas:', colspan: 2, className: 'total' },
        { value: formatHours(sumMinutes(employeeRows, (row) => row.worked_minutes)), className: 'number total' },
        '',
        '',
        { value: 'SPI en días:', colspan: 2, className: 'total' },
        { value: '0,00', className: 'number total' },
      ]));
      tableRows.push(xlsRow([
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        { value: 'Total Horas 25%:', colspan: 2, className: 'total' },
        { value: formatHours(sumMinutes(employeeRows, (row) => row.night_25_minutes)), className: 'number total' },
        '',
        '',
        { value: 'Atrasos:', colspan: 2, className: 'total' },
        { value: formatHours(sumMinutes(employeeRows, (row) => row.late_minutes)), className: 'number total' },
      ]));
      tableRows.push(xlsRow([
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        { value: 'Total Horas 50%:', colspan: 2, className: 'total' },
        { value: formatHours(sumMinutes(employeeRows, (row) => row.extra_50_minutes)), className: 'number total' },
        '',
        '',
        { value: 'Salidas Anticipadas:', colspan: 2, className: 'total' },
        { value: formatHours(sumMinutes(employeeRows, (row) => row.early_departure_minutes)), className: 'number total' },
      ]));
      tableRows.push(xlsRow([
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        { value: 'Total Horas 100%:', colspan: 2, className: 'total' },
        { value: formatHours(sumMinutes(employeeRows, (row) => row.extra_100_minutes)), className: 'number total' },
        '',
        '',
        { value: 'Faltas en Horas:', colspan: 2, className: 'total' },
        { value: formatHours(sumMinutes(employeeRows, (row) => row.absence_minutes)), className: 'number total' },
      ]));
      tableRows.push(xlsRow([
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        { value: 'Extraordinarias 100%:', colspan: 2, className: 'total' },
        { value: formatHours(sumMinutes(employeeRows, (row) => row.extra_100_minutes)), className: 'number total' },
        '',
        '',
        { value: 'Total Descuentos:', colspan: 2, className: 'total' },
        { value: formatHours(sumMinutes(employeeRows, (row) => row.late_minutes) + sumMinutes(employeeRows, (row) => row.early_departure_minutes) + sumMinutes(employeeRows, (row) => row.absence_minutes)), className: 'number total' },
      ]));
      tableRows.push(xlsRow(Array.from({ length: columnCount }, () => '')));
    });

    downloadXls(`rpt_hora_extra_deta_${dateFrom}_${dateTo}.xls`, 'RPT_HORA_EXTRA_DETA', tableRows);
  };

  const exportSummaryXls = () => {
    const columnCount = 13;
    const tableRows = reportHeaderRows('RPT_HORA_EXTRA_RESU', columnCount);
    tableRows.push(xlsRow([
      { value: 'Empleado', className: 'header' },
      { value: 'Atra.', className: 'header' },
      { value: 'SPI-A', className: 'header' },
      { value: 'SAN', className: 'header' },
      { value: 'SPI-S', className: 'header' },
      { value: 'Faltas', className: 'header' },
      { value: 'SPI-F', className: 'header' },
      { value: 'Trab.', className: 'header' },
      { value: '25%', className: 'header' },
      { value: '50%', className: 'header' },
      { value: '100%', className: 'header' },
      { value: 'Supl.', className: 'header' },
      { value: 'Extr.', className: 'header' },
    ]));

    summaryRows.forEach((row) => {
      const supplemental100 = Math.max(0, asNumber(row.extra_100_minutes) - asNumber(row.net_extra_100_minutes));
      tableRows.push(xlsRow([
        summaryEmployeeLabel(row),
        { value: formatHours(row.late_minutes), className: 'number' },
        { value: '0,00', className: 'number' },
        { value: formatHours(row.early_departure_minutes), className: 'number' },
        { value: '0,00', className: 'number' },
        { value: formatHours(row.absence_minutes), className: 'number' },
        { value: formatHours(row.unpaid_leave_minutes), className: 'number' },
        { value: formatHours(row.worked_minutes), className: 'number' },
        { value: formatHours(row.night_25_minutes), className: 'number' },
        { value: formatHours(row.extra_50_minutes), className: 'number' },
        { value: formatHours(row.extra_100_minutes), className: 'number' },
        { value: formatHours(supplemental100), className: 'number' },
        { value: formatHours(row.net_extra_100_minutes), className: 'number' },
      ]));
    });

    tableRows.push(xlsRow([
      { value: 'Total', className: 'total' },
      { value: formatHours(sumMinutes(summaryRows, (row) => row.late_minutes)), className: 'number total' },
      { value: '0,00', className: 'number total' },
      { value: formatHours(sumMinutes(summaryRows, (row) => row.early_departure_minutes)), className: 'number total' },
      { value: '0,00', className: 'number total' },
      { value: formatHours(sumMinutes(summaryRows, (row) => row.absence_minutes)), className: 'number total' },
      { value: formatHours(sumMinutes(summaryRows, (row) => row.unpaid_leave_minutes)), className: 'number total' },
      { value: formatHours(sumMinutes(summaryRows, (row) => row.worked_minutes)), className: 'number total' },
      { value: formatHours(sumMinutes(summaryRows, (row) => row.night_25_minutes)), className: 'number total' },
      { value: formatHours(sumMinutes(summaryRows, (row) => row.extra_50_minutes)), className: 'number total' },
      { value: formatHours(sumMinutes(summaryRows, (row) => row.extra_100_minutes)), className: 'number total' },
      { value: formatHours(sumMinutes(summaryRows, (row) => Math.max(0, asNumber(row.extra_100_minutes) - asNumber(row.net_extra_100_minutes)))), className: 'number total' },
      { value: formatHours(sumMinutes(summaryRows, (row) => row.net_extra_100_minutes)), className: 'number total' },
    ]));

    downloadXls(`rpt_hora_extra_resu_${dateFrom}_${dateTo}.xls`, 'RPT_HORA_EXTRA_RESU', tableRows);
  };

  const exportDetailXlsV2 = async () => {
    const columnCount = 16;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('RPT_HORA_EXTRA_DETA');
    setSheetColumns(worksheet, [14, 13, 14, 14, 14, 14, 12, 12, 12, 12, 12, 14, 12, 12, 12, 16]);
    applyReportHeader(worksheet, 'RPT_HORA_EXTRA_DETA');
    const rowsByEmployee = new Map<string, OvertimeDetailRow[]>();

    detailRows.forEach((row) => {
      const employeeRows = rowsByEmployee.get(row.employee_id) || [];
      employeeRows.push(row);
      rowsByEmployee.set(row.employee_id, employeeRows);
    });

    let rowNumber = 7;
    const headers = ['Fecha', 'Turno', 'Inicio turno', 'Fin turno', 'Entrada', 'Salida', 'Trab.', '0%', '25%', '50%', '100%', '100%\nNo Laboral', 'Atraso', 'SAnt.', 'Falta', 'Todos los\ndescuentos'];

    rowsByEmployee.forEach((employeeRows) => {
      const firstRow = employeeRows[0];
      worksheet.getRow(rowNumber).values = [
        `Empleado : ${detailEmployeeLabel(firstRow)} | ${firstRow.department_name || '-'} / ${firstRow.area_name || '-'} / ${firstRow.payroll_group_name || '-'} / ${firstRow.cost_center_name || '-'} / ${firstRow.work_group_name || '-'}`,
      ];
      styleGroupRow(worksheet, rowNumber, columnCount);
      rowNumber += 1;

      worksheet.getRow(rowNumber).values = headers;
      styleHeaderRow(worksheet.getRow(rowNumber));
      rowNumber += 1;

      employeeRows.forEach((row) => {
        const excelRow = worksheet.getRow(rowNumber);
        excelRow.values = [
          formatDateShort(row.shift_date),
          row.shift_short_name || row.shift_name || '',
          formatTime24(row.shift_work_start),
          formatTime24(row.shift_work_end),
          formatTime24(row.first_entry),
          formatTime24(row.last_exit),
          decimalHours(row.worked_minutes),
          decimalHours(row.ordinary_minutes),
          decimalHours(row.night_25_minutes),
          decimalHours(row.extra_50_minutes),
          decimalHours(row.extra_100_minutes),
          decimalHours(row.non_working_100_minutes),
          decimalHours(row.late_minutes),
          decimalHours(row.early_departure_minutes),
          decimalHours(row.absence_minutes),
          decimalHours(discountMinutes(row)),
        ];
        setNumberCells(excelRow, 7, 16);
        rowNumber += 1;
      });

      const subtotalRow = worksheet.getRow(rowNumber);
      subtotalRow.values = [
        'Subtotal empleado',
        '',
        '',
        '',
        '',
        '',
        decimalHours(sumMinutes(employeeRows, (row) => row.worked_minutes)),
        decimalHours(sumMinutes(employeeRows, (row) => row.ordinary_minutes)),
        decimalHours(sumMinutes(employeeRows, (row) => row.night_25_minutes)),
        decimalHours(sumMinutes(employeeRows, (row) => row.extra_50_minutes)),
        decimalHours(sumMinutes(employeeRows, (row) => row.extra_100_minutes)),
        decimalHours(sumMinutes(employeeRows, (row) => row.non_working_100_minutes)),
        decimalHours(sumMinutes(employeeRows, (row) => row.late_minutes)),
        decimalHours(sumMinutes(employeeRows, (row) => row.early_departure_minutes)),
        decimalHours(sumMinutes(employeeRows, (row) => row.absence_minutes)),
        decimalHours(sumMinutes(employeeRows, discountMinutes)),
      ];
      worksheet.mergeCells(rowNumber, 1, rowNumber, 6);
      styleTotalRow(subtotalRow);
      setNumberCells(subtotalRow, 7, 16);
      rowNumber += 2;
    });

    const totalRow = worksheet.getRow(rowNumber);
    totalRow.values = [
      'Total global',
      '',
      '',
      '',
      '',
      '',
      decimalHours(sumMinutes(detailRows, (row) => row.worked_minutes)),
      decimalHours(sumMinutes(detailRows, (row) => row.ordinary_minutes)),
      decimalHours(sumMinutes(detailRows, (row) => row.night_25_minutes)),
      decimalHours(sumMinutes(detailRows, (row) => row.extra_50_minutes)),
      decimalHours(sumMinutes(detailRows, (row) => row.extra_100_minutes)),
      decimalHours(sumMinutes(detailRows, (row) => row.non_working_100_minutes)),
      decimalHours(sumMinutes(detailRows, (row) => row.late_minutes)),
      decimalHours(sumMinutes(detailRows, (row) => row.early_departure_minutes)),
      decimalHours(sumMinutes(detailRows, (row) => row.absence_minutes)),
      decimalHours(sumMinutes(detailRows, discountMinutes)),
    ];
    worksheet.mergeCells(rowNumber, 1, rowNumber, 6);
    styleTotalRow(totalRow);
    setNumberCells(totalRow, 7, 16);

    await writeXlsxWorkbook(workbook, `rpt_hora_extra_deta_${dateFrom}_${dateTo}.xlsx`);
  };

  const exportSummaryXlsV2 = async () => {
    const columnCount = 16;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('RPT_HORA_EXTRA_RESU');
    setSheetColumns(worksheet, [36, 16, 16, 16, 16, 16, 12, 12, 12, 12, 12, 14, 12, 12, 12, 16]);
    applyReportHeader(worksheet, 'RPT_HORA_EXTRA_RESU');
    worksheet.getRow(7).values = ['Empleado', 'Departamento', 'Área', 'Rol pago', 'Centro costo', 'Grupo trabajo', ...headersFromValueCells()];
    styleHeaderRow(worksheet.getRow(7));

    let rowNumber = 8;
    summaryDisplayRows.forEach((row) => {
      const excelRow = worksheet.getRow(rowNumber);
      excelRow.values = [
        summaryEmployeeLabel(row),
        ...positionCells(row),
        decimalHours(row.worked_minutes),
        decimalHours(row.ordinary_minutes),
        decimalHours(row.night_25_minutes),
        decimalHours(row.extra_50_minutes),
        decimalHours(row.extra_100_minutes),
        decimalHours(row.non_working_100_minutes),
        decimalHours(row.late_minutes),
        decimalHours(row.early_departure_minutes),
        decimalHours(row.absence_minutes),
        decimalHours(discountMinutes(row)),
      ];
      setNumberCells(excelRow, 7, 16);
      rowNumber += 1;
    });

    const totalRow = worksheet.getRow(rowNumber);
    totalRow.values = [
      'Total global',
      '',
      '',
      '',
      '',
      '',
      decimalHours(sumMinutes(summaryDisplayRows, (row) => row.worked_minutes)),
      decimalHours(sumMinutes(summaryDisplayRows, (row) => row.ordinary_minutes)),
      decimalHours(sumMinutes(summaryDisplayRows, (row) => row.night_25_minutes)),
      decimalHours(sumMinutes(summaryDisplayRows, (row) => row.extra_50_minutes)),
      decimalHours(sumMinutes(summaryDisplayRows, (row) => row.extra_100_minutes)),
      decimalHours(sumMinutes(summaryDisplayRows, (row) => row.non_working_100_minutes)),
      decimalHours(sumMinutes(summaryDisplayRows, (row) => row.late_minutes)),
      decimalHours(sumMinutes(summaryDisplayRows, (row) => row.early_departure_minutes)),
      decimalHours(sumMinutes(summaryDisplayRows, (row) => row.absence_minutes)),
      decimalHours(sumMinutes(summaryDisplayRows, discountMinutes)),
    ];
    worksheet.mergeCells(rowNumber, 1, rowNumber, 6);
    styleTotalRow(totalRow);
    setNumberCells(totalRow, 7, 16);

    await writeXlsxWorkbook(workbook, `rpt_hora_extra_resu_${dateFrom}_${dateTo}.xlsx`);
  };

  const exportCurrentTab = () => {
    if (activeTab === 'detail') {
      void exportDetailXlsV2();
      return;
    }
    void exportSummaryXlsV2();
    return;

    if (activeTab === 'detail') {
      downloadCsv(
        `sobretiempo_detallado_${dateFrom}_${dateTo}.csv`,
        ['Empleado', 'Código', 'Fecha', 'Turno', 'Entrada', 'Salida', 'H.Trab.', '25%', '50%', '100%', 'Atraso', 'SAnt', 'Falta'],
        detailRows.map((row) => [
          row.employee_full_name,
          row.employee_code,
          formatDate(row.shift_date),
          row.shift_short_name || row.shift_name || '',
          formatTime24(row.first_entry),
          formatTime24(row.last_exit),
          formatHours(row.worked_minutes),
          formatHours(row.night_25_minutes),
          formatHours(row.extra_50_minutes),
          formatHours(row.extra_100_minutes),
          formatHours(row.late_minutes),
          formatHours(row.early_departure_minutes),
          formatHours(row.absence_minutes),
        ])
      );
      return;
    }

    downloadCsv(
      `sobretiempo_resumido_${dateFrom}_${dateTo}.csv`,
      ['Empleado', 'Código', 'Trab.', '25%', '50%', '100%', 'Descuentos', 'Neto 100%', 'Días planificados', 'Días trabajados'],
      summaryRows.map((row) => [
        row.employee_full_name,
        row.employee_code,
        formatHours(row.worked_minutes),
        formatHours(row.night_25_minutes),
        formatHours(row.extra_50_minutes),
        formatHours(row.extra_100_minutes),
        formatHours(row.discount_minutes),
        formatHours(row.net_extra_100_minutes),
        row.planned_days,
        row.worked_days,
      ])
    );
  };

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer la imagen del reporte'));
      reader.readAsDataURL(blob);
    });

  const fetchReportAssetDataUrl = async (rows: Array<OvertimeDetailRow | OvertimeSummaryRow>): Promise<string> => {
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

  const criteriaHtml = () => `
    <table class="criteria">
      <tr><td class="label">Usuario :</td><td>${htmlEscape(reportUserName)}</td><td class="label">Fecha :</td><td>${htmlEscape(formatClientDateTime(new Date().toISOString(), 'es-EC'))}</td></tr>
      <tr><td class="label">${htmlEscape(parameterLabel('DATE_FROM', 'Fecha Inic'))} :</td><td>${htmlEscape(formatDateShort(dateFrom))}</td><td class="label">${htmlEscape(parameterLabel('DATE_TO', 'Fecha Final'))} :</td><td>${htmlEscape(formatDateShort(dateTo))}</td></tr>
      <tr><td class="label">${htmlEscape(parameterLabel('DEPARTMENT_ID', 'Departamento'))} :</td><td>${htmlEscape(getFilterLabel(filters.departments, departmentId))}</td><td class="label">${htmlEscape(parameterLabel('AREA_ID', 'Área'))} :</td><td>${htmlEscape(getFilterLabel(filters.areas, areaId))}</td></tr>
      <tr><td class="label">${htmlEscape(parameterLabel('PAYROLL_GROUP_ID', 'Rol Pago'))} :</td><td>${htmlEscape(getFilterLabel(filters.payroll_groups, payrollGroupId))}</td><td class="label">${htmlEscape(parameterLabel('COST_CENTER_ID', 'C.Costo'))} :</td><td>${htmlEscape(getFilterLabel(filters.cost_centers, costCenterId))}</td></tr>
      <tr><td class="label">${htmlEscape(parameterLabel('WORK_GROUP_ID', 'Grupo Trabajo'))} :</td><td>${htmlEscape(getFilterLabel(filters.work_groups, workGroupId))}</td><td class="label">${htmlEscape(parameterLabel('EMPLOYEE_ID', 'Empleado'))} :</td><td>${htmlEscape(selectedEmployeeLabel())}</td></tr>
    </table>
  `;

  const printableDocument = (reportName: string, reportCode: string, bannerDataUrl: string, bodyHtml: string) => `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${htmlEscape(reportName)}</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          body { font-family: Arial, sans-serif; font-size: 10px; color: #111827; }
          .banner { max-height: 72px; max-width: 100%; object-fit: contain; margin-bottom: 8px; }
          h1 { font-size: 14px; margin: 0 0 2px; }
          .report-code { font-size: 10px; font-weight: 700; margin: 0 0 8px; }
          table { width: 100%; border-collapse: collapse; }
          td, th { border: 1px solid #d1d5db; padding: 3px 4px; vertical-align: middle; }
          th { background: #d9d9d9; font-weight: 700; text-align: center; }
          .criteria { margin-bottom: 12px; }
          .criteria td { border: 0; padding: 2px 5px; }
          .label { font-weight: 700; }
          .group, .subtotal, .total { background: #d9d9d9; font-weight: 700; }
          .number { text-align: right; }
          .nowrap { white-space: nowrap; }
        </style>
      </head>
      <body>
        ${bannerDataUrl ? `<img class="banner" src="${bannerDataUrl}" alt="Banner empresa" />` : ''}
        <h1>${htmlEscape(reportName)}</h1>
        <p class="report-code">${htmlEscape(reportCode)}</p>
        ${criteriaHtml()}
        ${bodyHtml}
        <script>window.onload = () => { window.focus(); window.print(); };</script>
      </body>
    </html>
  `;

  const openPrintablePdf = async (reportName: string, reportCode: string, rows: Array<OvertimeDetailRow | OvertimeSummaryRow>, bodyHtml: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('El navegador bloqueó la ventana de impresión PDF.');
      return;
    }
    const bannerDataUrl = await fetchReportAssetDataUrl(rows);
    printWindow.document.open();
    printWindow.document.write(printableDocument(reportName, reportCode, bannerDataUrl, bodyHtml));
    printWindow.document.close();
  };

  const pdfHeaderText = (header: string) => htmlEscape(header).replace(/\n/g, '<br/>');

  const exportDetailPdf = async () => {
    const headers = ['Fecha', 'Turno', 'Inicio turno', 'Fin turno', 'Entrada', 'Salida', ...headersFromValueCells()];
    const rowsHtml = detailGroups.map((group) => {
      const groupRows = group.rows.map((row) => `
        <tr>
          <td class="nowrap">${htmlEscape(formatDateShort(row.shift_date))}</td>
          <td>${htmlEscape(row.shift_short_name || row.shift_name || '')}</td>
          <td class="nowrap">${htmlEscape(formatTime24(row.shift_work_start))}</td>
          <td class="nowrap">${htmlEscape(formatTime24(row.shift_work_end))}</td>
          <td class="nowrap">${htmlEscape(formatTime24(row.first_entry))}</td>
          <td class="nowrap">${htmlEscape(formatTime24(row.last_exit))}</td>
          ${valueCells(row).map((cell) => `<td class="number">${htmlEscape((cell as XlsCellOptions).value)}</td>`).join('')}
        </tr>
      `).join('');
      const subtotalCells = totalValueCells(group.rows).map((cell) => `<td class="number">${htmlEscape(cell.value)}</td>`).join('');
      return `
        <tr><td class="group" colspan="16">Empleado : ${htmlEscape(detailEmployeeLabel(group.employee))} | ${htmlEscape(positionCells(group.employee).join(' / '))}</td></tr>
        <tr>${headers.map((header) => `<th>${pdfHeaderText(header)}</th>`).join('')}</tr>
        ${groupRows}
        <tr class="subtotal"><td colspan="6">Subtotal empleado</td>${subtotalCells}</tr>
      `;
    }).join('');
    const totalCells = totalValueCells(detailRows).map((cell) => `<td class="number">${htmlEscape(cell.value)}</td>`).join('');
    await openPrintablePdf(detailReportName, OVERTIME_DETAIL_REPORT.code, detailRows, `<table>${rowsHtml}<tr class="total"><td colspan="6">Total global</td>${totalCells}</tr></table>`);
  };

  const exportSummaryPdf = async () => {
    const headers = ['Empleado', 'Departamento', 'Área', 'Rol pago', 'Centro costo', 'Grupo trabajo', ...headersFromValueCells()];
    const rowsHtml = summaryDisplayRows.map((row) => `
      <tr>
        <td>${htmlEscape(summaryEmployeeLabel(row))}</td>
        ${positionCells(row).map((cell) => `<td>${htmlEscape(cell)}</td>`).join('')}
        ${valueCells(row).map((cell) => `<td class="number">${htmlEscape((cell as XlsCellOptions).value)}</td>`).join('')}
      </tr>
    `).join('');
    const totalCells = totalValueCells(summaryDisplayRows).map((cell) => `<td class="number">${htmlEscape(cell.value)}</td>`).join('');
    await openPrintablePdf(
      summaryReportName,
      OVERTIME_SUMMARY_REPORT.code,
      summaryDisplayRows,
      `<table><tr>${headers.map((header) => `<th>${pdfHeaderText(header)}</th>`).join('')}</tr>${rowsHtml}<tr class="total"><td colspan="6">Total global</td>${totalCells}</tr></table>`
    );
  };

  const exportCurrentPdf = () => {
    if (activeTab === 'detail') {
      void exportDetailPdf();
      return;
    }
    void exportSummaryPdf();
  };
  return (
    <div className="flex h-[calc(100vh-120px)] min-h-0 flex-col gap-4 overflow-hidden">
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <BarChart3 className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Horas y sobretiempos</h1>
              <p className="text-sm text-slate-600">Reportes detallado por empleado/fecha y resumido por empleado para el periodo.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
            <div className="rounded-lg border px-3 py-2">
              <p className="text-xs text-slate-500">Trab.</p>
              <p className="font-semibold">{formatHours(totals.worked)}</p>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <p className="text-xs text-slate-500">25%</p>
              <p className="font-semibold">{formatHours(totals.night25)}</p>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <p className="text-xs text-slate-500">50%</p>
              <p className="font-semibold text-blue-700">{formatHours(totals.extra50)}</p>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <p className="text-xs text-slate-500">100%</p>
              <p className="font-semibold text-purple-700">{formatHours(totals.extra100)}</p>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <p className="text-xs text-slate-500">Descuentos</p>
              <p className="font-semibold text-red-700">{formatHours(totals.discounts)}</p>
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
                    {fullEmployeeName(row)}{row.employee_code ? ` (${row.employee_code})` : ''}
                  </option>
                ))}
              </select> : null}
              {showParameter('EMPLOYEE_SEARCH') ? <div className="relative w-48">
                <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void loadEmployees();
                  }}
                  placeholder={parameterLabel('EMPLOYEE_SEARCH', 'Buscar')}
                  className="h-10 w-full rounded-md border py-2 pl-8 pr-2 text-sm"
                />
              </div> : null}
            </div>
          </div> : null}
          {showParameter('DATE_FROM') ? <div>
            <label className="text-sm font-medium text-slate-700">{parameterLabel('DATE_FROM', 'Desde')}</label>
            <StandardDateInput
              value={dateFrom}
              onValueChange={setDateFrom}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            />
          </div> : null}
          {showParameter('DATE_TO') ? <div>
            <label className="text-sm font-medium text-slate-700">{parameterLabel('DATE_TO', 'Hasta')}</label>
            <StandardDateInput
              value={dateTo}
              onValueChange={setDateTo}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            />
          </div> : null}
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void loadReports()}
              disabled={loadingReport}
              className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${loadingReport ? 'animate-spin' : ''}`} />
              Consultar
            </button>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={exportCurrentTab}
              disabled={loadingReport || (activeTab === 'detail' ? detailRows.length === 0 : summaryDisplayRows.length === 0)}
              className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="size-4" />
              XLS
            </button>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={exportCurrentPdf}
              disabled={loadingReport || (activeTab === 'detail' ? detailRows.length === 0 : summaryDisplayRows.length === 0)}
              className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <FileText className="size-4" />
              PDF
            </button>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {showParameter('DEPARTMENT_ID') ? <div>
            <label className="text-sm font-medium text-slate-700">{parameterLabel('DEPARTMENT_ID', 'Departamento')}</label>
            <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className="mt-1 h-10 w-full rounded-md border px-3 text-sm">
              <option value="">Todos</option>
              {filters.departments.map((option) => <option key={option.id} value={option.id}>{option.label || option.id}</option>)}
            </select>
          </div> : null}
          {showParameter('AREA_ID') ? <div>
            <label className="text-sm font-medium text-slate-700">{parameterLabel('AREA_ID', 'Área')}</label>
            <select value={areaId} onChange={(event) => setAreaId(event.target.value)} className="mt-1 h-10 w-full rounded-md border px-3 text-sm">
              <option value="">Todas</option>
              {filters.areas.map((option) => <option key={option.id} value={option.id}>{option.label || option.id}</option>)}
            </select>
          </div> : null}
          {showParameter('PAYROLL_GROUP_ID') ? <div>
            <label className="text-sm font-medium text-slate-700">{parameterLabel('PAYROLL_GROUP_ID', 'Rol de Pago')}</label>
            <select value={payrollGroupId} onChange={(event) => setPayrollGroupId(event.target.value)} className="mt-1 h-10 w-full rounded-md border px-3 text-sm">
              <option value="">Todos</option>
              {filters.payroll_groups.map((option) => <option key={option.id} value={option.id}>{option.label || option.id}</option>)}
            </select>
          </div> : null}
          {showParameter('COST_CENTER_ID') ? <div>
            <label className="text-sm font-medium text-slate-700">{parameterLabel('COST_CENTER_ID', 'Centro de Costo')}</label>
            <select value={costCenterId} onChange={(event) => setCostCenterId(event.target.value)} className="mt-1 h-10 w-full rounded-md border px-3 text-sm">
              <option value="">Todos</option>
              {filters.cost_centers.map((option) => <option key={option.id} value={option.id}>{option.label || option.id}</option>)}
            </select>
          </div> : null}
          {showParameter('WORK_GROUP_ID') ? <div>
            <label className="text-sm font-medium text-slate-700">{parameterLabel('WORK_GROUP_ID', 'Grupo de Trabajo')}</label>
            <select value={workGroupId} onChange={(event) => setWorkGroupId(event.target.value)} className="mt-1 h-10 w-full rounded-md border px-3 text-sm">
              <option value="">Todos</option>
              {filters.work_groups.map((option) => <option key={option.id} value={option.id}>{option.label || option.id}</option>)}
            </select>
          </div> : null}
        </div>
        <div className="hidden">
          <div>
            <label className="text-sm font-medium text-slate-700">Rol de Pago</label>
            <select
              value={payrollGroupId}
              onChange={(event) => setPayrollGroupId(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Todos</option>
              {filters.payroll_groups.map((option) => (
                <option key={option.id} value={option.id}>{option.label || option.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Área</label>
            <select
              value={areaId}
              onChange={(event) => setAreaId(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Todas</option>
              {filters.areas.map((option) => (
                <option key={option.id} value={option.id}>{option.label || option.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Departamento</label>
            <select
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Todos</option>
              {filters.departments.map((option) => (
                <option key={option.id} value={option.id}>{option.label || option.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Área</label>
            <select
              value={areaId}
              onChange={(event) => setAreaId(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Todas</option>
              {filters.areas.map((option) => (
                <option key={option.id} value={option.id}>{option.label || option.id}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-xl border bg-white shadow-sm">
        <div className="flex shrink-0 gap-2 border-b px-4 py-3">
          <button
            type="button"
            onClick={() => setActiveTab('detail')}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${activeTab === 'detail' ? 'bg-indigo-600 text-white' : 'border text-slate-700 hover:bg-slate-50'}`}
          >
            Detallado por empleado y fecha
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${activeTab === 'summary' ? 'bg-indigo-600 text-white' : 'border text-slate-700 hover:bg-slate-50'}`}
          >
            Resumido por empleado
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {activeTab === 'detail' ? (
            <table className="min-w-[1500px] w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Empleado</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Turno</th>
                  <th className="px-3 py-2">Inicio turno</th>
                  <th className="px-3 py-2">Fin turno</th>
                  <th className="px-3 py-2">Entrada</th>
                  <th className="px-3 py-2">Salida</th>
                  <th className="px-3 py-2 text-right">H.Trab.</th>
                  <th className="px-3 py-2 text-right">0%</th>
                  <th className="px-3 py-2 text-right">25%</th>
                  <th className="px-3 py-2 text-right">50%</th>
                  <th className="px-3 py-2 text-right">100%</th>
                  <th className="px-3 py-2 text-right leading-tight">
                    <span className="block">100% No</span>
                    <span className="block">Laboral</span>
                  </th>
                  <th className="px-3 py-2 text-right">Atraso</th>
                  <th className="px-3 py-2 text-right">SAnt</th>
                  <th className="px-3 py-2 text-right">Falta</th>
                  <th className="px-3 py-2 text-right leading-tight">
                    <span className="block">Todos los</span>
                    <span className="block">descuentos</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {detailGroups.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="px-3 py-8 text-center text-slate-500">Sin datos para el periodo seleccionado.</td>
                  </tr>
                ) : (
                  <>
                    {detailGroups.map((group) => (
                      <Fragment key={group.employee.employee_id}>
                        <tr className="border-t bg-indigo-50">
                          <td colSpan={17} className="px-3 py-2 font-semibold text-indigo-900">
                            {group.employee.employee_full_name}
                            <span className="ml-2 text-xs font-normal text-indigo-700">
                              {group.employee.employee_code || '-'} · {group.employee.company_name || '-'} · {group.employee.department_name || '-'} / {group.employee.area_name || '-'} / {group.employee.work_group_name || '-'}
                            </span>
                          </td>
                        </tr>
                        {group.rows.map((row, index) => (
                          <tr key={`${row.employee_id}-${row.shift_date}-${index}`} className="border-t hover:bg-slate-50">
                            <td className="px-3 py-2">
                              <div className="font-medium text-slate-900">{row.employee_full_name}</div>
                              <div className="text-xs text-slate-500">{row.employee_code || '-'} · {row.company_name || '-'}</div>
                            </td>
                            <td className="px-3 py-2">{formatDate(row.shift_date)}</td>
                            <td className="px-3 py-2">{row.shift_short_name || row.shift_name || '-'}</td>
                            <td className="px-3 py-2">{formatTime24(row.shift_work_start)}</td>
                            <td className="px-3 py-2">{formatTime24(row.shift_work_end)}</td>
                            <td className="px-3 py-2">{formatTime24(row.first_entry)}</td>
                            <td className="px-3 py-2">{formatTime24(row.last_exit)}</td>
                            <td className="px-3 py-2 text-right font-semibold">{formatHours(row.worked_minutes)}</td>
                            <td className="px-3 py-2 text-right">{formatHours(row.ordinary_minutes)}</td>
                            <td className="px-3 py-2 text-right">{formatHours(row.night_25_minutes)}</td>
                            <td className="px-3 py-2 text-right">{formatHours(row.extra_50_minutes)}</td>
                            <td className="px-3 py-2 text-right">{formatHours(row.extra_100_minutes)}</td>
                            <td className="px-3 py-2 text-right">{formatHours(row.non_working_100_minutes)}</td>
                            <td className="px-3 py-2 text-right">{formatHours(row.late_minutes)}</td>
                            <td className="px-3 py-2 text-right">{formatHours(row.early_departure_minutes)}</td>
                            <td className="px-3 py-2 text-right">{formatHours(row.absence_minutes)}</td>
                            <td className="px-3 py-2 text-right text-red-700">{formatHours(discountMinutes(row))}</td>
                          </tr>
                        ))}
                        <tr className="border-t bg-slate-50 font-semibold">
                          <td colSpan={7} className="px-3 py-2">Subtotal empleado</td>
                          {totalValueCells(group.rows).map((cell, index) => (
                            <td key={index} className="px-3 py-2 text-right">{cell.value}</td>
                          ))}
                        </tr>
                      </Fragment>
                    ))}
                    <tr className="border-t bg-slate-100 font-semibold">
                      <td colSpan={7} className="px-3 py-2">Total general</td>
                      {totalValueCells(detailRows).map((cell, index) => (
                        <td key={index} className="px-3 py-2 text-right">{cell.value}</td>
                      ))}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          ) : (
            <table className="min-w-[1500px] w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Empleado</th>
                  <th className="px-3 py-2">Departamento</th>
                  <th className="px-3 py-2">Área</th>
                  <th className="px-3 py-2">Rol de pago</th>
                  <th className="px-3 py-2">Centro de costo</th>
                  <th className="px-3 py-2">Grupo de trabajo</th>
                  <th className="px-3 py-2 text-right">Trab.</th>
                  <th className="px-3 py-2 text-right">0%</th>
                  <th className="px-3 py-2 text-right">25%</th>
                  <th className="px-3 py-2 text-right">50%</th>
                  <th className="px-3 py-2 text-right">100%</th>
                  <th className="px-3 py-2 text-right leading-tight">
                    <span className="block">100% No</span>
                    <span className="block">Laboral</span>
                  </th>
                  <th className="px-3 py-2 text-right">Atraso</th>
                  <th className="px-3 py-2 text-right">SAnt</th>
                  <th className="px-3 py-2 text-right">Falta</th>
                  <th className="px-3 py-2 text-right leading-tight">
                    <span className="block">Todos los</span>
                    <span className="block">descuentos</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {summaryDisplayRows.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="px-3 py-8 text-center text-slate-500">Sin datos para el periodo seleccionado.</td>
                  </tr>
                ) : summaryDisplayRows.map((row) => (
                  <tr key={row.employee_id} className="border-t hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{row.employee_full_name}</div>
                      <div className="text-xs text-slate-500">{row.employee_code || '-'} · {row.company_name || '-'}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{row.department_name || '-'}</td>
                    <td className="px-3 py-2 text-slate-600">{row.area_name || '-'}</td>
                    <td className="px-3 py-2 text-slate-600">{row.payroll_group_name || '-'}</td>
                    <td className="px-3 py-2 text-slate-600">{row.cost_center_name || '-'}</td>
                    <td className="px-3 py-2 text-slate-600">{row.work_group_name || '-'}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatHours(row.worked_minutes)}</td>
                    <td className="px-3 py-2 text-right">{formatHours(row.ordinary_minutes)}</td>
                    <td className="px-3 py-2 text-right">{formatHours(row.night_25_minutes)}</td>
                    <td className="px-3 py-2 text-right">{formatHours(row.extra_50_minutes)}</td>
                    <td className="px-3 py-2 text-right">{formatHours(row.extra_100_minutes)}</td>
                    <td className="px-3 py-2 text-right">{formatHours(row.non_working_100_minutes)}</td>
                    <td className="px-3 py-2 text-right">{formatHours(row.late_minutes)}</td>
                    <td className="px-3 py-2 text-right">{formatHours(row.early_departure_minutes)}</td>
                    <td className="px-3 py-2 text-right">{formatHours(row.absence_minutes)}</td>
                    <td className="px-3 py-2 text-right text-red-700">{formatHours(discountMinutes(row))}</td>
                  </tr>
                ))}
                {summaryDisplayRows.length > 0 ? (
                  <tr className="border-t bg-slate-50 font-semibold">
                    <td colSpan={6} className="px-3 py-2">Total global</td>
                    {totalValueCells(summaryDisplayRows).map((cell, index) => (
                      <td key={index} className="px-3 py-2 text-right">{cell.value}</td>
                    ))}
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <footer className="shrink-0 text-center text-sm text-slate-500">
        Titanium Labs Corp.&trade; 2026 &copy; | Todos los derechos reservados
      </footer>
    </div>
  );
}
