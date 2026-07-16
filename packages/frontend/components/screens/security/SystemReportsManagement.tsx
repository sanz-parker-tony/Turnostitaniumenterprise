'use client';

import { buildApiUrl } from '../../../utils/api-config';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Edit2,
  FileText,
  ListFilter,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { publicApiToken } from '../../../utils/backend/info';
import GridActionIconButton from '@/components/shared/GridActionIconButton';
import HeaderInfoTips from '@/components/shared/HeaderInfoTips';
import HeaderRefreshButton from '@/components/shared/HeaderRefreshButton';
import SystemAdminPageHeader from '@/components/shared/SystemAdminPageHeader';

const API = buildApiUrl('/system-reports');

type LookupItem = {
  id: string;
  lookup_key: string;
  lookup_label: string;
  lookup_short_label?: string | null;
};

type LookupGroupItem = {
  id: string;
  lookup_group_key: string;
  lookup_group_label: string;
  lookup_group_short_label?: string | null;
};

type SystemReport = {
  id: string;
  report_code: string;
  report_name: string;
  report_description: string;
  report_notes: string | null;
  handler_type_id: string;
  report_handler: string;
  application_module_id: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_by?: string | null;
  updated_at?: string | null;
  handler_type?: LookupItem | null;
  application_module?: LookupItem | null;
};

type ReportParameter = {
  id: string;
  system_report_id: string;
  parameter_key: string;
  parameter_label: string;
  parameter_description: string | null;
  data_type_id: string;
  ui_control_id: string;
  is_required: boolean;
  default_value: string | null;
  lookup_group_id: string | null;
  is_multi_value: boolean;
  sort_order: number;
  is_active: boolean;
  data_type?: LookupItem | null;
  ui_control?: LookupItem | null;
  lookup_group?: LookupGroupItem | null;
};

const EMPTY_REPORT_FORM = {
  report_code: '',
  report_name: '',
  report_description: '',
  report_notes: '',
  handler_type_id: '',
  report_handler: '',
  application_module_id: '',
  is_active: true,
};

const EMPTY_PARAMETER_FORM = {
  parameter_key: '',
  parameter_label: '',
  parameter_description: '',
  data_type_id: '',
  ui_control_id: '',
  is_required: false,
  default_value: '',
  lookup_group_id: '',
  is_multi_value: false,
  sort_order: 0,
  is_active: true,
};

const BADGE = {
  active: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800',
  inactive: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700',
};

function getToken() {
  return localStorage.getItem('tt-access-token') || localStorage.getItem('access_token') || publicApiToken;
}

function isLookupDataType(dataTypes: LookupItem[], dataTypeId: string) {
  const current = dataTypes.find((item) => item.id === dataTypeId);
  return String(current?.lookup_key || '').toUpperCase() === 'LOOKUP';
}

export default function SystemReportsManagement() {
  const [rows, setRows] = useState<SystemReport[]>([]);
  const [handlerTypes, setHandlerTypes] = useState<LookupItem[]>([]);
  const [applicationModules, setApplicationModules] = useState<LookupItem[]>([]);
  const [parameterDataTypes, setParameterDataTypes] = useState<LookupItem[]>([]);
  const [parameterUiControls, setParameterUiControls] = useState<LookupItem[]>([]);
  const [parameterLookupGroups, setParameterLookupGroups] = useState<LookupGroupItem[]>([]);

  const [selectedReportId, setSelectedReportId] = useState('');
  const [parameters, setParameters] = useState<ReportParameter[]>([]);

  const [loading, setLoading] = useState(true);
  const [parametersLoading, setParametersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parametersError, setParametersError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<'report_code' | 'report_name'>('report_code');
  const [sortAsc, setSortAsc] = useState(true);
  const [parameterSearch, setParameterSearch] = useState('');

  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<SystemReport | null>(null);
  const [form, setForm] = useState({ ...EMPTY_REPORT_FORM });
  const [saving, setSaving] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  const [parameterPanelOpen, setParameterPanelOpen] = useState(false);
  const [editingParameter, setEditingParameter] = useState<ReportParameter | null>(null);
  const [parameterForm, setParameterForm] = useState({ ...EMPTY_PARAMETER_FORM });
  const [parameterSaving, setParameterSaving] = useState(false);
  const [parameterPanelError, setParameterPanelError] = useState<string | null>(null);

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        reportsRes,
        handlersRes,
        modulesRes,
        dataTypesRes,
        uiControlsRes,
        lookupGroupsRes,
      ] = await Promise.all([
        fetch(API, { headers: headers() }),
        fetch(`${API}/catalogs/handler-types`, { headers: headers() }),
        fetch(`${API}/catalogs/application-modules`, { headers: headers() }),
        fetch(`${API}/catalogs/parameter-data-types`, { headers: headers() }),
        fetch(`${API}/catalogs/parameter-ui-controls`, { headers: headers() }),
        fetch(`${API}/catalogs/lookup-groups`, { headers: headers() }),
      ]);

      const [
        reportsData,
        handlersData,
        modulesData,
        dataTypesData,
        uiControlsData,
        lookupGroupsData,
      ] = await Promise.all([
        reportsRes.json(),
        handlersRes.json(),
        modulesRes.json(),
        dataTypesRes.json(),
        uiControlsRes.json(),
        lookupGroupsRes.json(),
      ]);

      if (!reportsRes.ok) throw new Error(reportsData.error || 'Error cargando reportes');
      if (!handlersRes.ok) throw new Error(handlersData.error || 'Error cargando tipos de handler');
      if (!modulesRes.ok) throw new Error(modulesData.error || 'Error cargando modulos');
      if (!dataTypesRes.ok) throw new Error(dataTypesData.error || 'Error cargando tipos de dato');
      if (!uiControlsRes.ok) throw new Error(uiControlsData.error || 'Error cargando controles UI');
      if (!lookupGroupsRes.ok) throw new Error(lookupGroupsData.error || 'Error cargando grupos de lookup');

      setRows(reportsData.reports || []);
      setHandlerTypes(handlersData.handlerTypes || []);
      setApplicationModules(modulesData.applicationModules || []);
      setParameterDataTypes(dataTypesData.dataTypes || []);
      setParameterUiControls(uiControlsData.uiControls || []);
      setParameterLookupGroups(lookupGroupsData.lookupGroups || []);
    } catch (e: any) {
      setError(e.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const loadParameters = async (reportId: string) => {
    if (!reportId) {
      setParameters([]);
      return;
    }
    setParametersLoading(true);
    setParametersError(null);
    try {
      const res = await fetch(`${API}/${reportId}/parameters`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando parametros');
      setParameters(data.parameters || []);
    } catch (e: any) {
      setParametersError(e.message || 'Error cargando parametros');
      setParameters([]);
    } finally {
      setParametersLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedReportId('');
      setParameters([]);
      return;
    }
    if (!rows.some((row) => row.id === selectedReportId)) {
      setSelectedReportId(rows[0].id);
    }
  }, [rows, selectedReportId]);

  useEffect(() => {
    if (!selectedReportId) return;
    void loadParameters(selectedReportId);
  }, [selectedReportId]);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter((row) => {
        const blob = `${row.report_code} ${row.report_name} ${row.report_description} ${row.report_handler}`.toLowerCase();
        return blob.includes(term);
      });
    }
    if (statusFilter === 'active') list = list.filter((row) => row.is_active);
    if (statusFilter === 'inactive') list = list.filter((row) => !row.is_active);

    list.sort((a, b) => {
      const va = String(a[sortField] || '');
      const vb = String(b[sortField] || '');
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return list;
  }, [rows, search, statusFilter, sortField, sortAsc]);

  const selectedReport = useMemo(
    () => rows.find((row) => row.id === selectedReportId) || null,
    [rows, selectedReportId]
  );

  const filteredParameters = useMemo(() => {
    if (!parameterSearch.trim()) return parameters;
    const term = parameterSearch.toLowerCase();
    return parameters.filter((row) => {
      const blob = `${row.parameter_key} ${row.parameter_label} ${row.parameter_description || ''}`.toLowerCase();
      return blob.includes(term);
    });
  }, [parameters, parameterSearch]);

  const sortBy = (field: 'report_code' | 'report_name') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
      return;
    }
    setSortField(field);
    setSortAsc(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_REPORT_FORM });
    setPanelError(null);
    setPanelOpen(true);
  };

  const openEdit = (row: SystemReport) => {
    setEditing(row);
    setForm({
      report_code: row.report_code,
      report_name: row.report_name,
      report_description: row.report_description,
      report_notes: row.report_notes || '',
      handler_type_id: row.handler_type_id,
      report_handler: row.report_handler,
      application_module_id: row.application_module_id || '',
      is_active: row.is_active,
    });
    setPanelError(null);
    setPanelOpen(true);
  };

  const save = async () => {
    setPanelError(null);
    const payload = {
      report_code: String(form.report_code || '').trim().toUpperCase(),
      report_name: String(form.report_name || '').trim(),
      report_description: String(form.report_description || '').trim(),
      report_notes: String(form.report_notes || '').trim(),
      handler_type_id: String(form.handler_type_id || '').trim(),
      report_handler: String(form.report_handler || '').trim(),
      application_module_id: String(form.application_module_id || '').trim(),
      is_active: Boolean(form.is_active),
    };

    if (!payload.report_code || !payload.report_name || !payload.report_description || !payload.handler_type_id || !payload.report_handler) {
      setPanelError('Campos obligatorios: codigo, nombre, descripcion, tipo handler y report_handler');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`${API}/${editing.id}`, {
          method: 'PUT',
          headers: headers(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error actualizando reporte');
      } else {
        const res = await fetch(API, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error creando reporte');
      }

      setPanelOpen(false);
      await load();
    } catch (e: any) {
      setPanelError(e.message || 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row: SystemReport) => {
    try {
      const res = await fetch(`${API}/${row.id}/status`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ is_active: !row.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cambiando estado');
      await load();
    } catch (e: any) {
      setError(e.message || 'Error cambiando estado');
    }
  };

  const remove = async (row: SystemReport) => {
    const ok = window.confirm(`Se eliminara el reporte "${row.report_code}". Desea continuar?`);
    if (!ok) return;

    try {
      const res = await fetch(`${API}/${row.id}`, {
        method: 'DELETE',
        headers: headers(),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.blockers) {
          const blockersTxt = Object.entries(data.blockers)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
          throw new Error(`${data.error}. ${blockersTxt}`);
        }
        throw new Error(data.error || 'Error eliminando reporte');
      }
      await load();
    } catch (e: any) {
      setError(e.message || 'Error eliminando reporte');
    }
  };

  const openCreateParameter = () => {
    if (!selectedReportId) return;
    setEditingParameter(null);
    setParameterForm({ ...EMPTY_PARAMETER_FORM });
    setParameterPanelError(null);
    setParameterPanelOpen(true);
  };

  const openEditParameter = (row: ReportParameter) => {
    setEditingParameter(row);
    setParameterForm({
      parameter_key: row.parameter_key,
      parameter_label: row.parameter_label,
      parameter_description: row.parameter_description || '',
      data_type_id: row.data_type_id,
      ui_control_id: row.ui_control_id,
      is_required: row.is_required,
      default_value: row.default_value || '',
      lookup_group_id: row.lookup_group_id || '',
      is_multi_value: row.is_multi_value,
      sort_order: row.sort_order || 0,
      is_active: row.is_active,
    });
    setParameterPanelError(null);
    setParameterPanelOpen(true);
  };

  const saveParameter = async () => {
    if (!selectedReportId) {
      setParameterPanelError('Debe seleccionar un reporte primero');
      return;
    }

    setParameterPanelError(null);
    const payload = {
      parameter_key: String(parameterForm.parameter_key || '').trim().toUpperCase(),
      parameter_label: String(parameterForm.parameter_label || '').trim(),
      parameter_description: String(parameterForm.parameter_description || '').trim(),
      data_type_id: String(parameterForm.data_type_id || '').trim(),
      ui_control_id: String(parameterForm.ui_control_id || '').trim(),
      is_required: Boolean(parameterForm.is_required),
      default_value: String(parameterForm.default_value || ''),
      lookup_group_id: String(parameterForm.lookup_group_id || '').trim(),
      is_multi_value: Boolean(parameterForm.is_multi_value),
      sort_order: Number(parameterForm.sort_order || 0),
      is_active: Boolean(parameterForm.is_active),
    };

    if (!payload.parameter_key || !payload.parameter_label || !payload.data_type_id || !payload.ui_control_id) {
      setParameterPanelError('Campos obligatorios: clave, etiqueta, tipo de dato y control UI');
      return;
    }

    if (isLookupDataType(parameterDataTypes, payload.data_type_id) && !payload.lookup_group_id) {
      setParameterPanelError('Para tipo de dato LOOKUP debe seleccionar un grupo de lookup');
      return;
    }

    setParameterSaving(true);
    try {
      if (editingParameter) {
        const res = await fetch(`${API}/${selectedReportId}/parameters/${editingParameter.id}`, {
          method: 'PUT',
          headers: headers(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error actualizando parametro');
      } else {
        const res = await fetch(`${API}/${selectedReportId}/parameters`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error creando parametro');
      }
      setParameterPanelOpen(false);
      await loadParameters(selectedReportId);
    } catch (e: any) {
      setParameterPanelError(e.message || 'Error guardando parametro');
    } finally {
      setParameterSaving(false);
    }
  };

  const toggleParameterStatus = async (row: ReportParameter) => {
    if (!selectedReportId) return;
    try {
      const res = await fetch(`${API}/${selectedReportId}/parameters/${row.id}/status`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ is_active: !row.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cambiando estado de parametro');
      await loadParameters(selectedReportId);
    } catch (e: any) {
      setParametersError(e.message || 'Error cambiando estado de parametro');
    }
  };

  const removeParameter = async (row: ReportParameter) => {
    if (!selectedReportId) return;
    const ok = window.confirm(`Se eliminara el parametro "${row.parameter_key}". Desea continuar?`);
    if (!ok) return;

    try {
      const res = await fetch(`${API}/${selectedReportId}/parameters/${row.id}`, {
        method: 'DELETE',
        headers: headers(),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.blockers) {
          const blockersTxt = Object.entries(data.blockers)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
          throw new Error(`${data.error}. ${blockersTxt}`);
        }
        throw new Error(data.error || 'Error eliminando parametro');
      }
      await loadParameters(selectedReportId);
    } catch (e: any) {
      setParametersError(e.message || 'Error eliminando parametro');
    }
  };

  const SortIcon = ({ field }: { field: 'report_code' | 'report_name' }) => {
    if (field !== sortField) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  const handlerLabel = (row: SystemReport) => row.handler_type?.lookup_label || '-';
  const moduleLabel = (row: SystemReport) => row.application_module?.lookup_label || '-';

  return (
    <div className="p-6 max-w-full flex flex-col h-full gap-4">
      <SystemAdminPageHeader
        icon={FileText}
        title="Reportes del Sistema"
        subtitle="Catalogo de reportes, clave tecnica y parametros de busqueda"
        rightSlot={(
          <div className="flex items-center gap-2">
            <HeaderInfoTips
              items={[
                {
                  title: 'Definición de reportes',
                  text: 'Configura código, handler y parámetros para asegurar ejecución y trazabilidad.',
                  variant: 'security',
                },
              ]}
            />
            <HeaderRefreshButton onClick={load} />
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#0074D9] text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              <Plus className="w-4 h-4" /> Nuevo Reporte
            </button>
          </div>
        )}
      />
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por codigo, nombre o handler..."
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
        <p className="mt-3 text-sm text-gray-600">
          Mostrando {filtered.length} de {rows.length} reportes
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th onClick={() => sortBy('report_code')} className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900">
                    Codigo<SortIcon field="report_code" />
                  </th>
                  <th onClick={() => sortBy('report_name')} className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900">
                    Nombre<SortIcon field="report_name" />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Modulo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo ejecucion</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Ejecutor</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      {search ? 'No hay resultados' : 'No hay reportes registrados'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-gray-50 ${selectedReportId === row.id ? 'bg-blue-50/60' : ''}`}
                      onClick={() => setSelectedReportId(row.id)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{row.report_code}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{row.report_name}</div>
                        <div className="text-xs text-gray-500">{row.report_description}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{moduleLabel(row)}</td>
                      <td className="px-4 py-3 text-gray-700">{handlerLabel(row)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.report_handler}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={row.is_active ? BADGE.active : BADGE.inactive}>{row.is_active ? 'Activo' : 'Inactivo'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <GridActionIconButton
                            onClick={() => openEdit(row)}
                            icon={<Edit2 className="w-4 h-4" />}
                            label="Editar"
                            tone="blue"
                          />
                          <GridActionIconButton
                            onClick={() => toggleStatus(row)}
                            icon={row.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                            label={row.is_active ? 'Desactivar' : 'Activar'}
                            tone='amber'
                          />
                          <GridActionIconButton
                            onClick={() => remove(row)}
                            icon={<Trash2 className="w-4 h-4" />}
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
        )}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden flex-1 min-h-[360px]">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-sm font-semibold text-gray-900">Parametros del Reporte</div>
              <div className="text-xs text-gray-500">
                {selectedReport ? `${selectedReport.report_code} - ${selectedReport.report_name}` : 'Seleccione un reporte'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative min-w-56">
              <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={parameterSearch}
                onChange={(e) => setParameterSearch(e.target.value)}
                placeholder="Buscar parametro..."
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={openCreateParameter}
              disabled={!selectedReportId}
              className="flex items-center gap-2 px-3 py-2 bg-[#0074D9] text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> Nuevo Parametro
            </button>
          </div>
        </div>

        {parametersError && (
          <div className="mx-4 mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {parametersError}
          </div>
        )}

        {parametersLoading ? (
          <div className="flex items-center justify-center h-52">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Clave</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Etiqueta</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Tipo de valor</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Control visual</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Valor por Defecto</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-600">Req.</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-600">Multi</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-600">Orden</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-600">Estado</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!selectedReportId ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-gray-400">Seleccione un reporte para ver sus parametros</td>
                  </tr>
                ) : filteredParameters.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-gray-400">No hay parametros registrados para este reporte</td>
                  </tr>
                ) : (
                  filteredParameters.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{row.parameter_key}</span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="font-medium text-gray-900">{row.parameter_label}</div>
                        <div className="text-xs text-gray-500">{row.parameter_description || ''}</div>
                      </td>
                      <td className="px-4 py-2 text-gray-700">{row.data_type?.lookup_label || '-'}</td>
                      <td className="px-4 py-2 text-gray-700">{row.ui_control?.lookup_label || '-'}</td>
                      <td className="px-4 py-2 text-gray-700 font-mono text-xs">{row.default_value ?? ''}</td>
                      <td className="px-4 py-2 text-center">{row.is_required ? 'Si' : 'No'}</td>
                      <td className="px-4 py-2 text-center">{row.is_multi_value ? 'Si' : 'No'}</td>
                      <td className="px-4 py-2 text-center">{row.sort_order}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={row.is_active ? BADGE.active : BADGE.inactive}>{row.is_active ? 'Activo' : 'Inactivo'}</span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <GridActionIconButton
                            onClick={() => openEditParameter(row)}
                            icon={<Edit2 className="w-4 h-4" />}
                            label="Editar parámetro"
                            tone="blue"
                          />
                          <GridActionIconButton
                            onClick={() => toggleParameterStatus(row)}
                            icon={row.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                            label={row.is_active ? 'Desactivar' : 'Activar'}
                            tone='amber'
                          />
                          <GridActionIconButton
                            onClick={() => removeParameter(row)}
                            icon={<Trash2 className="w-4 h-4" />}
                            label="Eliminar parámetro"
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
        )}
      </div>

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-xl border border-gray-200 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">{editing ? 'Editar Reporte' : 'Nuevo Reporte'}</h2>
              </div>
              <button onClick={() => setPanelOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {panelError && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {panelError}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Codigo *</label>
                  <input
                    value={form.report_code}
                    onChange={(e) => setForm({ ...form, report_code: e.target.value.toUpperCase() })}
                    placeholder="RPT_ATTENDANCE_SUMMARY"
                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    value={form.report_name}
                    onChange={(e) => setForm({ ...form, report_name: e.target.value })}
                    placeholder="Resumen de Asistencia"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion *</label>
                  <textarea
                    value={form.report_description}
                    onChange={(e) => setForm({ ...form, report_description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea
                    value={form.report_notes}
                    onChange={(e) => setForm({ ...form, report_notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de ejecucion *</label>
                    <select
                      value={form.handler_type_id}
                      onChange={(e) => setForm({ ...form, handler_type_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar</option>
                      {handlerTypes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.lookup_label} ({item.lookup_key})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modulo de aplicacion</label>
                    <select
                      value={form.application_module_id}
                      onChange={(e) => setForm({ ...form, application_module_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Ninguno</option>
                      {applicationModules.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.lookup_label} ({item.lookup_key})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clave tecnica del reporte *</label>
                  <input
                    value={form.report_handler}
                    onChange={(e) => setForm({ ...form, report_handler: e.target.value })}
                    placeholder="attendance.anomalies"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Esta clave conecta el reporte configurado en base con la logica que genera la informacion. Ejemplos: attendance.anomalies, overtime.detail, overtime.summary.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input id="report-active" type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                  <label htmlFor="report-active" className="text-sm text-gray-700">Activo</label>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={() => setPanelOpen(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-100">Cancelar</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#0074D9] text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {parameterPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-xl border border-gray-200 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">{editingParameter ? 'Editar Parametro' : 'Nuevo Parametro'}</h2>
              </div>
              <button onClick={() => setParameterPanelOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {parameterPanelError && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {parameterPanelError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clave interna *</label>
                  <input
                    value={parameterForm.parameter_key}
                    onChange={(e) => setParameterForm({ ...parameterForm, parameter_key: e.target.value.toUpperCase() })}
                    placeholder="DATE_FROM"
                    className="w-full px-3 py-2 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Etiqueta *</label>
                  <input
                    value={parameterForm.parameter_label}
                    onChange={(e) => setParameterForm({ ...parameterForm, parameter_label: e.target.value })}
                    placeholder="Fecha Desde"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
                  <textarea
                    value={parameterForm.parameter_description}
                    onChange={(e) => setParameterForm({ ...parameterForm, parameter_description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de valor *</label>
                  <select
                    value={parameterForm.data_type_id}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      const nextLookup = isLookupDataType(parameterDataTypes, nextId) ? parameterForm.lookup_group_id : '';
                      setParameterForm({ ...parameterForm, data_type_id: nextId, lookup_group_id: nextLookup });
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar</option>
                    {parameterDataTypes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.lookup_label} ({item.lookup_key})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Control visual *</label>
                  <select
                    value={parameterForm.ui_control_id}
                    onChange={(e) => setParameterForm({ ...parameterForm, ui_control_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar</option>
                    {parameterUiControls.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.lookup_label} ({item.lookup_key})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor por Defecto</label>
                  <input
                    value={parameterForm.default_value}
                    onChange={(e) => setParameterForm({ ...parameterForm, default_value: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
                  <input
                    type="number"
                    value={parameterForm.sort_order}
                    onChange={(e) => setParameterForm({ ...parameterForm, sort_order: Number(e.target.value || 0) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grupo lookup {isLookupDataType(parameterDataTypes, parameterForm.data_type_id) ? '*' : ''}
                  </label>
                  <select
                    value={parameterForm.lookup_group_id}
                    onChange={(e) => setParameterForm({ ...parameterForm, lookup_group_id: e.target.value })}
                    disabled={!isLookupDataType(parameterDataTypes, parameterForm.data_type_id)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">Ninguno</option>
                    {parameterLookupGroups.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.lookup_group_label} ({item.lookup_group_key})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Solo aplica para parametros que leen opciones desde lookup_groups. Los catalogos dinamicos como empleados, departamentos o areas se resolveran por la pantalla del reporte.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input id="parameter-required" type="checkbox" checked={parameterForm.is_required} onChange={(e) => setParameterForm({ ...parameterForm, is_required: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                  <label htmlFor="parameter-required" className="text-sm text-gray-700">Requerido</label>
                </div>
                <div className="flex items-center gap-3">
                  <input id="parameter-multi" type="checkbox" checked={parameterForm.is_multi_value} onChange={(e) => setParameterForm({ ...parameterForm, is_multi_value: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                  <label htmlFor="parameter-multi" className="text-sm text-gray-700">Multivalor</label>
                </div>
                <div className="flex items-center gap-3 md:col-span-2">
                  <input id="parameter-active" type="checkbox" checked={parameterForm.is_active} onChange={(e) => setParameterForm({ ...parameterForm, is_active: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                  <label htmlFor="parameter-active" className="text-sm text-gray-700">Activo</label>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={() => setParameterPanelOpen(false)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-100">Cancelar</button>
              <button onClick={saveParameter} disabled={parameterSaving} className="flex items-center gap-2 px-4 py-2 bg-[#0074D9] text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {parameterSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {parameterSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



