'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, RefreshCw, Plus, Save, X, Pencil, Power } from 'lucide-react';
import { publicApiToken } from '../../../utils/backend/info';

type EntityKey =
  | 'companies'
  | 'work-locations'
  | 'departments'
  | 'areas'
  | 'cost-centers'
  | 'payroll-groups'
  | 'employee-profiles'
  | 'job-titles'
  | 'work-groups'
  | 'employee-companies';

interface OrgMaintenanceProps {
  initialEntity?: EntityKey;
  hideEntityTabs?: boolean;
  pageTitle?: string;
  pageDescription?: string;
}

type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'select';

interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  optionsKey?: string;
}

interface EntityConfig {
  key: EntityKey;
  title: string;
  description: string;
  fields: FieldConfig[];
  tableColumns: string[];
}

function getToken() {
  return localStorage.getItem('tt-access-token') || publicApiToken;
}

const ENTITY_CONFIGS: EntityConfig[] = [
  {
    key: 'companies',
    title: 'Companies',
    description: 'Gestión de empresas del tenant',
    fields: [
      { key: 'company_name', label: 'Nombre', type: 'text', required: true },
      { key: 'company_short_name', label: 'Nombre corto', type: 'text', required: true },
      { key: 'company_code', label: 'Código', type: 'text', required: true },
      { key: 'company_address_line1', label: 'Dirección 1', type: 'text' },
      { key: 'company_address_line2', label: 'Dirección 2', type: 'text' },
      { key: 'company_country_id', label: 'País', type: 'select', optionsKey: 'countries' },
      { key: 'company_state_id', label: 'Provincia/Estado', type: 'select', optionsKey: 'states' },
      { key: 'company_city_id', label: 'Ciudad', type: 'select', optionsKey: 'cities' },
      { key: 'company_postal_code', label: 'Código postal', type: 'text' },
      { key: 'company_phone', label: 'Teléfono', type: 'text' },
      { key: 'is_active', label: 'Activo', type: 'boolean' },
    ],
    tableColumns: ['company_code', 'company_name', 'company_short_name', 'company_phone', 'is_active'],
  },
  {
    key: 'work-locations',
    title: 'Work Locations',
    description: 'Gestión de localizaciones de trabajo',
    fields: [
      { key: 'company_id', label: 'Empresa', type: 'select', required: true, optionsKey: 'companies' },
      { key: 'work_location_name', label: 'Nombre', type: 'text', required: true },
      { key: 'work_location_short_name', label: 'Nombre corto', type: 'text', required: true },
      { key: 'work_location_code', label: 'Código', type: 'text', required: true },
      { key: 'address_line1', label: 'Dirección', type: 'text' },
      { key: 'latitude', label: 'Latitud', type: 'number' },
      { key: 'longitude', label: 'Longitud', type: 'number' },
      { key: 'is_active', label: 'Activo', type: 'boolean' },
    ],
    tableColumns: ['work_location_code', 'work_location_name', 'company_id', 'latitude', 'longitude', 'is_active'],
  },
  {
    key: 'departments',
    title: 'Departments',
    description: 'Primer nivel de jerarquía',
    fields: [
      { key: 'department_name', label: 'Nombre', type: 'text', required: true },
      { key: 'department_short_name', label: 'Nombre corto', type: 'text', required: true },
      { key: 'department_code', label: 'Código', type: 'text', required: true },
      { key: 'is_active', label: 'Activo', type: 'boolean' },
    ],
    tableColumns: ['department_code', 'department_name', 'department_short_name', 'is_active'],
  },
  {
    key: 'areas',
    title: 'Areas',
    description: 'Segundo nivel de jerarquía',
    fields: [
      { key: 'area_name', label: 'Nombre', type: 'text', required: true },
      { key: 'area_short_name', label: 'Nombre corto', type: 'text', required: true },
      { key: 'area_code', label: 'Código', type: 'text', required: true },
      { key: 'payroll_group_id', label: 'Grupo de nómina', type: 'select', optionsKey: 'payroll_groups' },
      { key: 'is_active', label: 'Activo', type: 'boolean' },
    ],
    tableColumns: ['area_code', 'area_name', 'area_short_name', 'payroll_group_id', 'is_active'],
  },
  {
    key: 'cost-centers',
    title: 'Cost Centers',
    description: 'Centros de costo',
    fields: [
      { key: 'cost_center_name', label: 'Nombre', type: 'text', required: true },
      { key: 'cost_center_short_name', label: 'Nombre corto', type: 'text', required: true },
      { key: 'cost_center_code', label: 'Código', type: 'text', required: true },
      { key: 'homologation_code', label: 'Código homologación', type: 'text' },
      { key: 'gl_account_code', label: 'Cuenta GL', type: 'text' },
      { key: 'is_active', label: 'Activo', type: 'boolean' },
    ],
    tableColumns: ['cost_center_code', 'cost_center_name', 'homologation_code', 'gl_account_code', 'is_active'],
  },
  {
    key: 'payroll-groups',
    title: 'Payroll Groups',
    description: 'Grupos de nómina',
    fields: [
      { key: 'payroll_group_name', label: 'Nombre', type: 'text', required: true },
      { key: 'payroll_group_short_name', label: 'Nombre corto', type: 'text', required: true },
      { key: 'payroll_group_code', label: 'Código', type: 'text', required: true },
      { key: 'is_active', label: 'Activo', type: 'boolean' },
    ],
    tableColumns: ['payroll_group_code', 'payroll_group_name', 'payroll_group_short_name', 'is_active'],
  },
  {
    key: 'employee-profiles',
    title: 'Employee Profiles',
    description: 'Perfiles de empleado',
    fields: [
      { key: 'profile_name', label: 'Nombre', type: 'text', required: true },
      { key: 'profile_short_name', label: 'Nombre corto', type: 'text', required: true },
      { key: 'employee_profile_code', label: 'Código', type: 'text', required: true },
      { key: 'is_active', label: 'Activo', type: 'boolean' },
    ],
    tableColumns: ['employee_profile_code', 'profile_name', 'profile_short_name', 'is_active'],
  },
  {
    key: 'job-titles',
    title: 'Job Titles',
    description: 'Cargos organizacionales',
    fields: [
      { key: 'job_title_name', label: 'Nombre', type: 'text', required: true },
      { key: 'job_title_short_name', label: 'Nombre corto', type: 'text', required: true },
      { key: 'job_title_code', label: 'Código', type: 'text', required: true },
      { key: 'is_active', label: 'Activo', type: 'boolean' },
    ],
    tableColumns: ['job_title_code', 'job_title_name', 'job_title_short_name', 'is_active'],
  },
  {
    key: 'work-groups',
    title: 'Work Groups',
    description: 'Grupos de trabajo',
    fields: [
      { key: 'work_group_name', label: 'Nombre', type: 'text', required: true },
      { key: 'work_group_short_name', label: 'Nombre corto', type: 'text', required: true },
      { key: 'work_group_code', label: 'Código', type: 'text', required: true },
      { key: 'payroll_group_id', label: 'Grupo de nómina', type: 'select', optionsKey: 'payroll_groups' },
      { key: 'is_active', label: 'Activo', type: 'boolean' },
    ],
    tableColumns: ['work_group_code', 'work_group_name', 'work_group_short_name', 'payroll_group_id', 'is_active'],
  },
  {
    key: 'employee-companies',
    title: 'Employee Companies',
    description: 'Asignaciones laborales por compañía',
    fields: [
      { key: 'employee_id', label: 'Empleado', type: 'select', required: true, optionsKey: 'employees' },
      { key: 'company_id', label: 'Empresa', type: 'select', required: true, optionsKey: 'companies' },
      { key: 'employee_profile_id', label: 'Perfil', type: 'select', optionsKey: 'employee_profiles' },
      { key: 'work_group_id', label: 'Grupo trabajo', type: 'select', optionsKey: 'work_groups' },
      { key: 'work_location_id', label: 'Localización', type: 'select', optionsKey: 'work_locations' },
      { key: 'department_id', label: 'Departamento', type: 'select', optionsKey: 'departments' },
      { key: 'area_id', label: 'Área', type: 'select', optionsKey: 'areas' },
      { key: 'cost_center_id', label: 'Centro costo', type: 'select', optionsKey: 'cost_centers' },
      { key: 'payroll_group_id', label: 'Grupo nómina', type: 'select', optionsKey: 'payroll_groups' },
      { key: 'contract_type_id', label: 'Tipo contrato', type: 'select', optionsKey: 'contract_types' },
      { key: 'salary_amount', label: 'Salario', type: 'number' },
      { key: 'hire_date', label: 'Fecha ingreso', type: 'date' },
      { key: 'termination_date', label: 'Fecha salida', type: 'date' },
      { key: 'work_on_holidays', label: 'Trabaja feriados', type: 'boolean' },
      { key: 'is_active', label: 'Activo', type: 'boolean' },
    ],
    tableColumns: ['employee_id', 'company_id', 'department_id', 'area_id', 'payroll_group_id', 'employee_profile_id', 'is_active'],
  },
];

export function OrgMaintenance({
  initialEntity = 'companies',
  hideEntityTabs = false,
  pageTitle,
  pageDescription,
}: OrgMaintenanceProps) {
  const [entity, setEntity] = useState<EntityKey>(initialEntity);
  const [items, setItems] = useState<any[]>([]);
  const [catalogs, setCatalogs] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  const config = useMemo(
    () => ENTITY_CONFIGS.find((entry) => entry.key === entity) || ENTITY_CONFIGS[0],
    [entity]
  );

  useEffect(() => {
    setEntity(initialEntity);
  }, [initialEntity]);

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
    if (!response.ok) {
      throw new Error(payload?.error || `HTTP ${response.status}`);
    }

    return payload;
  };

  const loadCatalogs = async () => {
    try {
      const payload = await request('/organization/catalogs');
      setCatalogs(payload.catalogs || {});
    } catch (err: any) {
      console.error('Error cargando catálogos ORG:', err);
    }
  };

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await request(`/organization/${entity}`);
      setItems(payload.items || []);
    } catch (err: any) {
      setError(err.message || 'Error cargando registros');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogs();
  }, []);

  useEffect(() => {
    loadItems();
    setShowForm(false);
    setEditingId(null);
    setFormData({});
  }, [entity]);

  const openCreate = () => {
    const initial: Record<string, any> = {};
    config.fields.forEach((field) => {
      if (field.type === 'boolean') {
        initial[field.key] = true;
      } else {
        initial[field.key] = '';
      }
    });

    setFormData(initial);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    const initial: Record<string, any> = {};
    config.fields.forEach((field) => {
      const value = item[field.key];
      initial[field.key] = value === null || value === undefined ? '' : value;
    });

    setFormData(initial);
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      for (const field of config.fields) {
        if (field.required) {
          const value = formData[field.key];
          if (value === undefined || value === null || String(value).trim() === '') {
            throw new Error(`Campo obligatorio: ${field.label}`);
          }
        }
      }

      const payload = { ...formData };
      config.fields.forEach((field) => {
        if (field.type === 'number' && payload[field.key] !== '' && payload[field.key] !== null) {
          payload[field.key] = Number(payload[field.key]);
        }
        if (field.type === 'boolean') {
          payload[field.key] = payload[field.key] === true || payload[field.key] === 'true';
        }
      });

      if (editingId) {
        await request(`/organization/${entity}/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await request(`/organization/${entity}`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({});
      await Promise.all([loadItems(), loadCatalogs()]);
    } catch (err: any) {
      setError(err.message || 'Error guardando registro');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: any) => {
    setError(null);
    try {
      await request(`/organization/${entity}/${item.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      await loadItems();
    } catch (err: any) {
      setError(err.message || 'Error actualizando estado');
    }
  };

  const getSelectOptions = (key?: string) => {
    if (!key) return [];
    return catalogs[key] || [];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pageTitle || config.title}</h1>
          <p className="text-muted-foreground mt-1">
            {pageDescription || config.description}
          </p>
        </div>
        <button
          onClick={loadItems}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-gray-50"
        >
          <RefreshCw className="size-4" />
          Recargar
        </button>
      </div>

      {!hideEntityTabs && (
        <div className="flex flex-wrap gap-2">
          {ENTITY_CONFIGS.map((entry) => (
            <button
              key={entry.key}
              onClick={() => setEntity(entry.key)}
              className={`px-3 py-1.5 rounded-md text-sm border ${
                entity === entry.key
                  ? 'bg-[#0074D9] text-white border-[#0074D9]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {entry.title}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-lg border bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{config.title}</h2>
            <p className="text-sm text-gray-500">{config.description}</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-[#0074D9] text-white text-sm hover:bg-[#0066C0]"
          >
            <Plus className="size-4" />
            Nuevo
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 text-red-700 text-sm px-3 py-2">
            {error}
          </div>
        )}

        {showForm && (
          <div className="rounded-md border bg-gray-50 p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {config.fields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    {field.label} {field.required && '*'}
                  </label>

                  {field.type === 'select' ? (
                    <select
                      value={formData[field.key] ?? ''}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, [field.key]: event.target.value }))
                      }
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    >
                      <option value="">-- Seleccionar --</option>
                      {getSelectOptions(field.optionsKey).map((option: any) => (
                        <option key={option.id} value={option.id}>
                          {option.lookup_label || option.company_name || option.department_name || option.area_name || option.cost_center_name || option.payroll_group_name || option.profile_name || option.work_group_name || option.work_location_name || (option.employee_code ? `${option.employee_code} - ${option.employee_lastname || ''} ${option.employee_name || ''}`.trim() : null) || option.lookup_key || option.id}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'boolean' ? (
                    <select
                      value={String(formData[field.key] ?? true)}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, [field.key]: event.target.value === 'true' }))
                      }
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      value={formData[field.key] ?? ''}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, [field.key]: event.target.value }))
                      }
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                <Save className="size-4" />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-gray-100"
              >
                <X className="size-4" />
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="overflow-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {config.tableColumns.map((column) => (
                  <th key={column} className="text-left px-3 py-2 border-b font-semibold text-gray-700">
                    {column}
                  </th>
                ))}
                <th className="text-left px-3 py-2 border-b font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={config.tableColumns.length + 1} className="px-3 py-6 text-center text-gray-500">
                    Cargando...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={config.tableColumns.length + 1} className="px-3 py-6 text-center text-gray-500">
                    Sin registros
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {config.tableColumns.map((column) => (
                      <td key={column} className="px-3 py-2 border-b text-gray-700">
                        {String(item[column] ?? '')}
                      </td>
                    ))}
                    <td className="px-3 py-2 border-b">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border text-xs hover:bg-gray-100"
                        >
                          <Pencil className="size-3" />
                          Editar
                        </button>
                        {'is_active' in item && (
                          <button
                            onClick={() => handleToggleStatus(item)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border text-xs hover:bg-gray-100"
                          >
                            <Power className="size-3" />
                            {item.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
