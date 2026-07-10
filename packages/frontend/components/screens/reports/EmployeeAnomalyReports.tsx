'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, FileText, RefreshCw, Search } from 'lucide-react';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { buildApiUrl } from '../../../utils/api-config';
import { publicApiToken } from '../../../utils/backend/info';
import { useAuth } from '../../../contexts/AuthContext';
import { formatClientDateTime, formatClientTime24 } from '../../../utils/date-time';
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

interface OvertimeAnomalyRow {
  employee_id: string;
  employee_code: string | null;
  employee_full_name: string;
  company_id: string | null;
  company_name: string | null;
  company_logo: string | null;
  company_banner: string | null;
  department_name: string | null;
  area_name: string | null;
  payroll_group_name: string | null;
  cost_center_name: string | null;
  work_group_name: string | null;
  issue_date: string;
  anomaly_key: string;
  anomaly_label: string;
  anomaly_detail: string;
  punch_count: number;
  first_punch: string | null;
  last_punch: string | null;
}

const ATTENDANCE_ANOMALIES_REPORT = {
  code: 'RPT_ANOMALIAS_ASISTENCIA',
  name: 'Anomalías de asistencia',
};

interface XlsCellOptions {
  value: unknown;
  colspan?: number;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

type XlsCell = unknown | XlsCellOptions;

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

function formatDate(value: string | null): string {
  if (!value) return '-';
  const [date] = String(value).split('T');
  const [year, month, day] = date.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatDateShort(value: string | null): string {
  if (!value) return '-';
  const [date] = String(value).split('T');
  const [year, month, day] = date.split('-');
  return year && month && day ? `${Number(day)}/${Number(month)}/${year}` : value;
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
    worksheet['!cols'] = Array.from({ length: 13 }, () => ({ wch: 18 }));
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

export default function EmployeeAnomalyReports() {
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
  const [filters, setFilters] = useState<ReportFilters>({ payroll_groups: [], cost_centers: [], departments: [], areas: [], work_groups: [] });
  const [rows, setRows] = useState<OvertimeAnomalyRow[]>([]);
  const [reportConfig, setReportConfig] = useState<SystemReportConfig>(() => defaultSystemReportConfig(ATTENDANCE_ANOMALIES_REPORT));
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
      setReportConfig(await fetchSystemReportConfig(ATTENDANCE_ANOMALIES_REPORT, getToken()));
    } catch {
      setReportConfig(defaultSystemReportConfig(ATTENDANCE_ANOMALIES_REPORT));
    }
  };

  const reportName = getSystemReportName(reportConfig);
  const parameterLabel = (key: string, fallback: string) => getReportParameterLabel(reportConfig, key, fallback);
  const showParameter = (key: string) => isReportParameterEnabled(reportConfig, key);

  const buildQuery = () => {
    const query = new URLSearchParams();
    query.set('date_from', dateFrom);
    query.set('date_to', dateTo);
    if (selectedEmployeeId) query.set('employee_id', selectedEmployeeId);
    if (payrollGroupId) query.set('payroll_group_id', payrollGroupId);
    if (costCenterId) query.set('cost_center_id', costCenterId);
    if (departmentId) query.set('department_id', departmentId);
    if (areaId) query.set('area_id', areaId);
    if (workGroupId) query.set('work_group_id', workGroupId);
    return query;
  };

  const loadReport = async () => {
    setLoadingReport(true);
    setError(null);
    try {
      const payload = await request(`/overtime-reports/anomalies?${buildQuery().toString()}`);
      setRows((payload?.rows || []) as OvertimeAnomalyRow[]);
    } catch (requestError: any) {
      setRows([]);
      setError(requestError?.message || 'No se pudo cargar el reporte de anomalías');
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
    void loadReport();
  }, []);

  const anomaliesByType = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((row) => counts.set(row.anomaly_label, (counts.get(row.anomaly_label) || 0) + 1));
    return Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);
  }, [rows]);

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

  const styleHeaderRow = (row: ExcelJS.Row) => {
    row.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    });
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

  const reportHeaderRows = (columnCount: number) => [
    xlsRow([{ value: 'RPT_ANOMALIAS_ASISTENCIA', colspan: columnCount, className: 'title' }]),
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

  const exportXls = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('RPT_ANOMALIAS_ASISTENCIA');
    worksheet.columns = [32, 16, 16, 16, 16, 16, 14, 46, 60, 14, 16, 16, 24].map((width) => ({ width }));
    applyReportHeader(worksheet, 'RPT_ANOMALIAS_ASISTENCIA');

    worksheet.getRow(7).values = [
      'Empleado',
      'Departamento',
      'Área',
      'Rol pago',
      'Centro costo',
      'Grupo trabajo',
      'Fecha',
      'Anomalía',
      'Detalle',
      'Marcaciones',
      'Primera marca',
      'Última marca',
      'Empresa',
    ];
    styleHeaderRow(worksheet.getRow(7));

    let rowNumber = 8;
    rows.forEach((row) => {
      worksheet.getRow(rowNumber).values = [
        `${row.employee_code || row.employee_id} - ${row.employee_full_name}`,
        row.department_name || '-',
        row.area_name || '-',
        row.payroll_group_name || '-',
        row.cost_center_name || '-',
        row.work_group_name || '-',
        formatDateShort(row.issue_date),
        row.anomaly_label,
        row.anomaly_detail,
        row.punch_count,
        formatTime24(row.first_punch),
        formatTime24(row.last_punch),
        row.company_name || '-',
      ];
      worksheet.getRow(rowNumber).getCell(10).alignment = { horizontal: 'center' };
      rowNumber += 1;
    });

    worksheet.getCell(`A${rowNumber}`).value = `Total anomalías: ${rows.length}`;
    worksheet.getCell(`A${rowNumber}`).font = { bold: true };
    await writeXlsxWorkbook(workbook, `rpt_anomalias_asistencia_${dateFrom}_${dateTo}.xlsx`);
  };

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

  const criteriaHtml = () => `
    <table class="criteria">
      <tr><td class="label">Usuario :</td><td>${htmlEscape(reportUserName)}</td><td class="label">Fecha :</td><td>${htmlEscape(formatClientDateTime(new Date().toISOString(), 'es-EC'))}</td></tr>
      <tr><td class="label">${htmlEscape(parameterLabel('DATE_FROM', 'Fecha Inic'))} :</td><td>${htmlEscape(formatDateShort(dateFrom))}</td><td class="label">${htmlEscape(parameterLabel('DATE_TO', 'Fecha Final'))} :</td><td>${htmlEscape(formatDateShort(dateTo))}</td></tr>
      <tr><td class="label">${htmlEscape(parameterLabel('DEPARTMENT_ID', 'Departamento'))} :</td><td>${htmlEscape(getFilterLabel(filters.departments, departmentId))}</td><td class="label">${htmlEscape(parameterLabel('AREA_ID', 'Área'))} :</td><td>${htmlEscape(getFilterLabel(filters.areas, areaId))}</td></tr>
      <tr><td class="label">${htmlEscape(parameterLabel('PAYROLL_GROUP_ID', 'Rol Pago'))} :</td><td>${htmlEscape(getFilterLabel(filters.payroll_groups, payrollGroupId))}</td><td class="label">${htmlEscape(parameterLabel('COST_CENTER_ID', 'C.Costo'))} :</td><td>${htmlEscape(getFilterLabel(filters.cost_centers, costCenterId))}</td></tr>
      <tr><td class="label">${htmlEscape(parameterLabel('WORK_GROUP_ID', 'Grupo Trabajo'))} :</td><td>${htmlEscape(getFilterLabel(filters.work_groups, workGroupId))}</td><td class="label">${htmlEscape(parameterLabel('EMPLOYEE_ID', 'Empleado'))} :</td><td>${htmlEscape(selectedEmployeeLabel())}</td></tr>
    </table>
  `;

  const printableDocument = (bannerDataUrl: string, tableHtml: string) => `
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
          .label, .total { font-weight: 700; }
          .total { background: #d9d9d9; }
          .number { text-align: center; }
          .nowrap { white-space: nowrap; }
        </style>
      </head>
      <body>
        ${bannerDataUrl ? `<img class="banner" src="${bannerDataUrl}" alt="Banner empresa" />` : ''}
        <h1>${htmlEscape(reportName)}</h1>
        <p class="report-code">${htmlEscape(ATTENDANCE_ANOMALIES_REPORT.code)}</p>
        ${criteriaHtml()}
        ${tableHtml}
        <script>window.onload = () => { window.focus(); window.print(); };</script>
      </body>
    </html>
  `;

  const exportPdf = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('El navegador bloqueó la ventana de impresión PDF.');
      return;
    }
    const headers = ['Empleado', 'Departamento', 'Área', 'Rol pago', 'Centro costo', 'Grupo trabajo', 'Fecha', 'Anomalía', 'Detalle', 'Marcaciones', 'Primera marca', 'Última marca', 'Empresa'];
    const bodyRows = rows.map((row) => `
      <tr>
        <td>${htmlEscape(`${row.employee_code || row.employee_id} - ${row.employee_full_name}`)}</td>
        <td>${htmlEscape(row.department_name || '-')}</td>
        <td>${htmlEscape(row.area_name || '-')}</td>
        <td>${htmlEscape(row.payroll_group_name || '-')}</td>
        <td>${htmlEscape(row.cost_center_name || '-')}</td>
        <td>${htmlEscape(row.work_group_name || '-')}</td>
        <td class="nowrap">${htmlEscape(formatDateShort(row.issue_date))}</td>
        <td>${htmlEscape(row.anomaly_label)}</td>
        <td>${htmlEscape(row.anomaly_detail)}</td>
        <td class="number">${htmlEscape(row.punch_count)}</td>
        <td class="nowrap">${htmlEscape(formatTime24(row.first_punch))}</td>
        <td class="nowrap">${htmlEscape(formatTime24(row.last_punch))}</td>
        <td>${htmlEscape(row.company_name || '-')}</td>
      </tr>
    `).join('');
    const tableHtml = `<table><tr>${headers.map((header) => `<th>${htmlEscape(header)}</th>`).join('')}</tr>${bodyRows}<tr class="total"><td colspan="13">Total anomalías: ${rows.length}</td></tr></table>`;
    const bannerDataUrl = await fetchReportAssetDataUrl();
    printWindow.document.open();
    printWindow.document.write(printableDocument(bannerDataUrl, tableHtml));
    printWindow.document.close();
  };
  return (
    <div className="flex h-[calc(100vh-120px)] min-h-0 flex-col gap-4 overflow-hidden">
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <AlertTriangle className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Anomalías de asistencia</h1>
              <p className="text-sm text-slate-600">Marcaciones incompletas, turnos no asignados y solicitudes no aprobadas.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
            <div className="rounded-lg border px-3 py-2">
              <p className="text-xs text-slate-500">Total</p>
              <p className="font-semibold text-amber-700">{rows.length}</p>
            </div>
            {anomaliesByType.slice(0, 2).map(([label, count]) => (
              <div key={label} className="rounded-lg border px-3 py-2">
                <p className="truncate text-xs text-slate-500" title={label}>{label}</p>
                <p className="font-semibold">{count}</p>
              </div>
            ))}
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
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            />
          </div> : null}
          {showParameter('DATE_TO') ? <div>
            <label className="text-sm font-medium text-slate-700">{parameterLabel('DATE_TO', 'Hasta')}</label>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            />
          </div> : null}
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void loadReport()}
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
              onClick={() => void exportXls()}
              disabled={loadingReport || rows.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="size-4" />
              XLS
            </button>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void exportPdf()}
              disabled={loadingReport || rows.length === 0}
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
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-[1300px] w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Empleado</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Anomalía</th>
              <th className="px-3 py-2">Detalle</th>
              <th className="px-3 py-2">Organización</th>
              <th className="px-3 py-2 text-right">Marc.</th>
              <th className="px-3 py-2">Primera marca</th>
              <th className="px-3 py-2">Última marca</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">Sin anomalías para el periodo seleccionado.</td>
              </tr>
            ) : rows.map((row, index) => (
              <tr key={`${row.employee_id}-${row.issue_date}-${row.anomaly_key}-${index}`} className="border-t hover:bg-slate-50">
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-900">{row.employee_full_name}</div>
                  <div className="text-xs text-slate-500">{row.employee_code || '-'} · {row.company_name || '-'}</div>
                </td>
                <td className="px-3 py-2">{formatDate(row.issue_date)}</td>
                <td className="px-3 py-2 font-medium text-amber-700">{row.anomaly_label}</td>
                <td className="px-3 py-2 text-slate-600">{row.anomaly_detail}</td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  {[row.department_name, row.area_name, row.payroll_group_name, row.cost_center_name, row.work_group_name].filter(Boolean).join(' / ') || '-'}
                </td>
                <td className="px-3 py-2 text-right">{row.punch_count || 0}</td>
                <td className="px-3 py-2">{formatTime24(row.first_punch)}</td>
                <td className="px-3 py-2">{formatTime24(row.last_punch)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="shrink-0 text-center text-sm text-slate-500">
        Titanium Labs Corp.&trade; 2026 &copy; | Todos los derechos reservados
      </footer>
    </div>
  );
}
