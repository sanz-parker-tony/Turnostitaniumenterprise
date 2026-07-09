'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, RefreshCw, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { buildApiUrl } from '../../../utils/api-config';
import { publicApiToken } from '../../../utils/backend/info';
import { formatClientDateTime } from '../../../utils/date-time';

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
  company_name: string | null;
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

function formatTime(value: string | null): string {
  if (!value) return '-';
  return formatClientDateTime(value, 'es-EC').split(',').pop()?.trim() || '-';
}

function formatTime24(value: string | null): string {
  if (!value) return '';
  const text = String(value);
  const match = text.match(/[T ](\d{2}:\d{2}:\d{2})/);
  return match?.[1] || formatTime(value);
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

  const reportHeaderRows = (columnCount: number) => [
    xlsRow([{ value: 'RPT_ANOMALIAS_ASISTENCIA', colspan: columnCount, className: 'title' }]),
    xlsRow([
      '',
      '',
      { value: 'Usuario :', className: 'label' },
      'Supervisor',
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

  const exportXls = () => {
    const columnCount = 13;
    const tableRows = reportHeaderRows(columnCount);
    tableRows.push(xlsRow([
      { value: 'Empleado', className: 'header' },
      { value: 'Departamento', className: 'header' },
      { value: 'Area', className: 'header' },
      { value: 'Rol pago', className: 'header' },
      { value: 'Centro costo', className: 'header' },
      { value: 'Grupo trabajo', className: 'header' },
      { value: 'Fecha', className: 'header' },
      { value: 'Anomalia', className: 'header' },
      { value: 'Detalle', className: 'header' },
      { value: 'Marcaciones', className: 'header' },
      { value: 'Primera marca', className: 'header' },
      { value: 'Ultima marca', className: 'header' },
      { value: 'Empresa', className: 'header' },
    ]));

    rows.forEach((row) => {
      tableRows.push(xlsRow([
        `${row.employee_code || row.employee_id} - ${row.employee_full_name}`,
        row.department_name || '-',
        row.area_name || '-',
        row.payroll_group_name || '-',
        row.cost_center_name || '-',
        row.work_group_name || '-',
        formatDate(row.issue_date),
        row.anomaly_label,
        row.anomaly_detail,
        row.punch_count,
        formatTime24(row.first_punch),
        formatTime24(row.last_punch),
        row.company_name || '-',
      ]));
    });

    tableRows.push(xlsRow([{ value: `Total anomalías: ${rows.length}`, colspan: columnCount, className: 'total' }]));
    downloadXls(`rpt_anomalias_asistencia_${dateFrom}_${dateTo}.xls`, 'RPT_ANOMALIAS_ASISTENCIA', tableRows);
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
        <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr_auto_auto]">
          <div>
            <label className="text-sm font-medium text-slate-700">Empleado</label>
            <div className="mt-1 flex gap-2">
              <select
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
              </select>
              <div className="relative w-48">
                <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void loadEmployees();
                  }}
                  placeholder="Buscar"
                  className="h-10 w-full rounded-md border py-2 pl-8 pr-2 text-sm"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border px-3 text-sm"
            />
          </div>
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
              onClick={exportXls}
              disabled={loadingReport || rows.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="size-4" />
              XLS
            </button>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="text-sm font-medium text-slate-700">Departamento</label>
            <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className="mt-1 h-10 w-full rounded-md border px-3 text-sm">
              <option value="">Todos</option>
              {filters.departments.map((option) => <option key={option.id} value={option.id}>{option.label || option.id}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Área</label>
            <select value={areaId} onChange={(event) => setAreaId(event.target.value)} className="mt-1 h-10 w-full rounded-md border px-3 text-sm">
              <option value="">Todas</option>
              {filters.areas.map((option) => <option key={option.id} value={option.id}>{option.label || option.id}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Rol de Pago</label>
            <select value={payrollGroupId} onChange={(event) => setPayrollGroupId(event.target.value)} className="mt-1 h-10 w-full rounded-md border px-3 text-sm">
              <option value="">Todos</option>
              {filters.payroll_groups.map((option) => <option key={option.id} value={option.id}>{option.label || option.id}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Centro de Costo</label>
            <select value={costCenterId} onChange={(event) => setCostCenterId(event.target.value)} className="mt-1 h-10 w-full rounded-md border px-3 text-sm">
              <option value="">Todos</option>
              {filters.cost_centers.map((option) => <option key={option.id} value={option.id}>{option.label || option.id}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Grupo de Trabajo</label>
            <select value={workGroupId} onChange={(event) => setWorkGroupId(event.target.value)} className="mt-1 h-10 w-full rounded-md border px-3 text-sm">
              <option value="">Todos</option>
              {filters.work_groups.map((option) => <option key={option.id} value={option.id}>{option.label || option.id}</option>)}
            </select>
          </div>
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
                <td className="px-3 py-2">{formatTime(row.first_punch)}</td>
                <td className="px-3 py-2">{formatTime(row.last_punch)}</td>
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
