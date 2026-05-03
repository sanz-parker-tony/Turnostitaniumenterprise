'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, RefreshCw, Plus, Save, X, Pencil, Power, Search, Trash2 } from 'lucide-react';
import { publicApiToken } from '../../../utils/backend/info';

type EntityKey =
  | 'companies'
  | 'work-locations'
  | 'departments'
  | 'areas'
  | 'cost-centers'
  | 'payroll-groups'
  | 'employees'
  | 'employee-profiles'
  | 'job-titles'
  | 'work-groups'
  | 'shifts'
  | 'employee-companies';

interface OrgMaintenanceProps {
  initialEntity?: EntityKey;
  hideEntityTabs?: boolean;
  hideTopHeader?: boolean;
  pageTitle?: string;
  pageDescription?: string;
}

type FieldType = 'text' | 'number' | 'date' | 'time' | 'boolean' | 'select';

interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  optionsKey?: string;
  defaultValue?: any;
}

interface EntityConfig {
  key: EntityKey;
  title: string;
  description: string;
  fields: FieldConfig[];
  tableColumns: string[];
}

interface EmployeePhotoStorageInfo {
  configured_value: string;
  source: 'TENANT' | 'SYSTEM' | 'FALLBACK';
  absolute_path: string;
  validation_rules?: EmployeePhotoValidationRules;
  validation_sources?: Record<string, 'TENANT' | 'SYSTEM' | 'FALLBACK'>;
}

interface EmployeePhotoValidationRules {
  max_file_size_bytes: number;
  min_width: number;
  min_height: number;
  max_width: number;
  max_height: number;
  min_aspect_ratio: number;
  max_aspect_ratio: number;
}

type ApiErrorWithMeta = Error & { code?: string; details?: string };

const SHIFT_ICON_OPTIONS = [
  { id: 'Sun', label: 'Sol (Manana)' },
  { id: 'Sunset', label: 'Atardecer' },
  { id: 'Moon', label: 'Cuarto de luna' },
  { id: 'Coffee', label: 'Taza caliente' },
  { id: 'Briefcase', label: 'Maletin / Oficina' },
];

const STATIC_CATALOGS: Record<string, any[]> = {
  shift_icons: SHIFT_ICON_OPTIONS,
};

const FALLBACK_EMPLOYEE_PHOTO_RULES: EmployeePhotoValidationRules = {
  max_file_size_bytes: 5 * 1024 * 1024,
  min_width: 450,
  min_height: 600,
  max_width: 2000,
  max_height: 2600,
  min_aspect_ratio: 0.68,
  max_aspect_ratio: 0.82,
};

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
    key: 'employees',
    title: 'Employees',
    description: 'Datos personales de empleados',
    fields: [
      { key: 'employee_code', label: 'Codigo empleado', type: 'text', required: true },
      { key: 'employee_lastname', label: 'Apellidos', type: 'text', required: true },
      { key: 'employee_name', label: 'Nombres', type: 'text', required: true },
      { key: 'employee_birthday', label: 'Fecha nacimiento', type: 'date' },
      { key: 'employee_gender_id', label: 'Genero', type: 'select', optionsKey: 'genders' },
      { key: 'employee_is_model', label: 'Empleado modelo', type: 'boolean', defaultValue: false },
      { key: 'employee_observations', label: 'Observaciones', type: 'text' },
      { key: 'employee_photo_path', label: 'Ruta foto', type: 'text' },
      { key: 'is_active', label: 'Activo', type: 'boolean', defaultValue: true },
    ],
    tableColumns: ['employee_code', 'employee_lastname', 'employee_name', 'employee_birthday', 'employee_gender_id', 'employee_is_model', 'is_active'],
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
    key: 'shifts',
    title: 'Horarios',
    description: 'Gestion de horarios y turnos de trabajo',
    fields: [
      { key: 'company_id', label: 'Empresa', type: 'select', required: true, optionsKey: 'companies' },
      { key: 'payroll_group_id', label: 'Grupo de nomina', type: 'select', optionsKey: 'payroll_groups' },
      { key: 'shift_name', label: 'Nombre del horario', type: 'text', required: true },
      { key: 'shift_short_name', label: 'Nombre corto', type: 'text', required: true },
      { key: 'shift_icon_key', label: 'Icono', type: 'select', optionsKey: 'shift_icons', required: true, defaultValue: 'Sun' },
      { key: 'start_time', label: 'Hora inicio', type: 'time', required: true },
      { key: 'work_minutes', label: 'Minutos trabajo', type: 'number', required: true },
      { key: 'lunch_minutes', label: 'Minutos almuerzo', type: 'number', required: true, defaultValue: 0 },
      { key: 'entry_grace_minutes', label: 'Tolerancia entrada (min)', type: 'number', required: true, defaultValue: 0 },
      { key: 'exit_grace_minutes', label: 'Tolerancia salida (min)', type: 'number', required: true, defaultValue: 0 },
      { key: 'is_active', label: 'Activo', type: 'boolean', defaultValue: true },
    ],
    tableColumns: ['shift_short_name', 'shift_name', 'shift_icon_key', 'company_id', 'start_time', 'work_minutes', 'lunch_minutes', 'entry_grace_minutes', 'exit_grace_minutes', 'is_active'],
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
  hideTopHeader = false,
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
  const [searchTerm, setSearchTerm] = useState('');
  const [photoRules, setPhotoRules] = useState<EmployeePhotoValidationRules>(FALLBACK_EMPLOYEE_PHOTO_RULES);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);

  const config = useMemo(
    () => ENTITY_CONFIGS.find((entry) => entry.key === entity) || ENTITY_CONFIGS[0],
    [entity]
  );

  useEffect(() => {
    setEntity(initialEntity);
  }, [initialEntity]);

  const request = async (path: string, init?: RequestInit) => {
    let response: Response;
    try {
      response = await fetch(`http://localhost:3001${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
          ...(init?.headers || {}),
        },
      });
    } catch (networkErr: any) {
      const err = new Error(
        'Error de conexion con backend (Failed to fetch). Verifique que el backend este activo y que el payload no exceda el limite configurado.'
      ) as ApiErrorWithMeta;
      err.code = 'NETWORK_FETCH_ERROR';
      err.details = networkErr?.message || null;
      throw err;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const apiError = new Error(payload?.error || `HTTP ${response.status}`) as ApiErrorWithMeta;
      apiError.code = payload?.error_code;
      apiError.details = payload?.details;
      throw apiError;
    }

    return payload;
  };

  const createPhotoValidationError = (message: string): ApiErrorWithMeta => {
    const err = new Error(message) as ApiErrorWithMeta;
    err.code = 'PHOTO_DIMENSIONS_INVALID';
    return err;
  };

  const formatPhotoUploadError = (rawError: any): string => {
    const err = rawError as ApiErrorWithMeta;
    const code = String(err?.code || '').toUpperCase();

    if (code === 'PHOTO_TOO_LARGE') return `Error por peso: ${err.message}`;
    if (code === 'PHOTO_DIMENSIONS_INVALID') return err.message || 'Error por tamano de imagen.';
    if (code === 'PHOTO_PERMISSION_DENIED') {
      return `Error por permiso de carpeta destino: ${err.message}${
        err.details ? ` Detalle: ${err.details}` : ''
      }`;
    }
    if (code === 'PHOTO_INVALID_FORMAT') return 'Error de formato: use JPG, PNG o WEBP.';
    if (code === 'NETWORK_FETCH_ERROR') return `${err.message}${err.details ? ` Detalle: ${err.details}` : ''}`;
    if (code === 'PHOTO_STORAGE_ERROR') {
      return `Error de almacenamiento en carpeta destino: ${err.message}${
        err.details ? ` Detalle: ${err.details}` : ''
      }`;
    }
    return err?.message || 'Error cargando la foto';
  };

  const setPhotoPreview = (nextUrl: string) => {
    setPhotoPreviewUrl((prev) => {
      if (prev && prev.startsWith('blob:') && prev !== nextUrl) {
        URL.revokeObjectURL(prev);
      }
      return nextUrl;
    });
  };

  const clearPhotoPreview = () => {
    setPhotoPreview('');
  };

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsDataURL(file);
    });

  const normalizeDateInputValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().slice(0, 10);
  };

  const getImageDimensions = (file: File) =>
    new Promise<{ width: number; height: number }>((resolve, reject) => {
      const localUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const width = image.naturalWidth;
        const height = image.naturalHeight;
        URL.revokeObjectURL(localUrl);
        resolve({ width, height });
      };
      image.onerror = () => {
        URL.revokeObjectURL(localUrl);
        reject(new Error('No se pudo leer la resolución de la imagen'));
      };
      image.src = localUrl;
    });

  const loadEmployeePhotoPreview = async (employeeId: string, photoPath?: string) => {
    if (!employeeId || !photoPath) {
      clearPhotoPreview();
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/organization/employees/${employeeId}/photo`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        clearPhotoPreview();
        return;
      }

      const imageBlob = await response.blob();
      if (!imageBlob.size) {
        clearPhotoPreview();
        return;
      }

      const objectUrl = URL.createObjectURL(imageBlob);
      setPhotoPreview(objectUrl);
    } catch (err) {
      console.error('Error cargando preview de foto del empleado:', err);
      clearPhotoPreview();
    }
  };

  const CATALOG_ENTITY_PATHS: Record<string, string> = {
    companies: 'companies',
    departments: 'departments',
    areas: 'areas',
    cost_centers: 'cost-centers',
    payroll_groups: 'payroll-groups',
    employees: 'employees',
    employee_profiles: 'employee-profiles',
    work_groups: 'work-groups',
    work_locations: 'work-locations',
    job_titles: 'job-titles',
  };

  const LOOKUP_GROUP_BY_OPTIONS_KEY: Record<string, string> = {
    contract_types: 'CONTRACT_TYPE',
    genders: 'GENDER',
    countries: 'COUNTRY',
    states: 'STATE',
    cities: 'CITY',
  };

  const getRequiredCatalogKeys = () => {
    return Array.from(
      new Set(
        config.fields
          .filter((field) => field.type === 'select' && field.optionsKey)
          .map((field) => field.optionsKey as string)
      )
    );
  };

  const loadCatalogsByEntityFallback = async () => {
    const keys = getRequiredCatalogKeys();
    const entityKeys = keys.filter((key) => key in CATALOG_ENTITY_PATHS);
    const lookupKeys = keys.filter((key) => key in LOOKUP_GROUP_BY_OPTIONS_KEY);

    if (entityKeys.length === 0 && lookupKeys.length === 0) return;

    const entityResults = await Promise.all(
      entityKeys.map(async (key) => {
        const entityPath = CATALOG_ENTITY_PATHS[key];
        const payload = await request(`/organization/${entityPath}?active_only=true`);
        return [key, payload.items || []] as const;
      })
    );

    const lookupResults = await Promise.all(
      lookupKeys.map(async (key) => {
        const groupKey = LOOKUP_GROUP_BY_OPTIONS_KEY[key];
        const payload = await request(`/lookup-values?group=${groupKey}`);
        const values = (payload.values || []).filter((value: any) => value?.is_active !== false);
        return [key, values] as const;
      })
    );

    const catalogsByKey = {
      ...Object.fromEntries([...entityResults, ...lookupResults]),
      ...STATIC_CATALOGS,
    };
    setCatalogs((prev) => ({
      ...prev,
      ...catalogsByKey,
    }));

    if (entity === 'shifts') {
      try {
        const payload = await request('/organization/employee-companies?active_only=true');
        const employeeCompanies = payload.items || [];
        const companies = (catalogsByKey.companies || []) as any[];
        const payrollGroups = (catalogsByKey.payroll_groups || []) as any[];

        const companyById = new Map<string, any>();
        companies.forEach((company: any) => {
          if (company?.id) companyById.set(company.id, company);
        });

        const payrollGroupById = new Map<string, any>();
        payrollGroups.forEach((group: any) => {
          if (group?.id) payrollGroupById.set(group.id, group);
        });

        const combinationsMap = new Map<string, any>();
        employeeCompanies.forEach((row: any) => {
          if (!row?.company_id) return;
          const company = companyById.get(row.company_id);
          if (!company?.id) return;

          const payrollGroup = row.payroll_group_id ? payrollGroupById.get(row.payroll_group_id) : null;
          const comboKey = `${company.id}::${payrollGroup?.id || 'NULL'}`;
          if (!combinationsMap.has(comboKey)) {
            combinationsMap.set(comboKey, {
              company_id: company.id,
              company_code: company.company_code || null,
              company_name: company.company_name || null,
              payroll_group_id: payrollGroup?.id || null,
              payroll_group_code: payrollGroup?.payroll_group_code || null,
              payroll_group_name: payrollGroup?.payroll_group_name || null,
            });
          }
        });

        setCatalogs((prev) => ({
          ...prev,
          employee_company_combinations: Array.from(combinationsMap.values()),
        }));
      } catch (comboFallbackErr) {
        console.error('Error construyendo combinaciones employee_companies en fallback:', comboFallbackErr);
      }
    }
  };

  const loadCatalogs = async () => {
    try {
      const payload = await request('/organization/catalogs');
      const catalogs = {
        ...(payload.catalogs || {}),
        ...STATIC_CATALOGS,
      };
      setCatalogs(catalogs);

      const requiredKeys = getRequiredCatalogKeys();
      const missingRequired = requiredKeys.some((key) => !(key in catalogs));
      if (missingRequired) {
        await loadCatalogsByEntityFallback();
      }
    } catch (err: any) {
      console.error('Error cargando catálogos ORG:', err);
      try {
        await loadCatalogsByEntityFallback();
      } catch (fallbackErr) {
        console.error('Error cargando catálogos por fallback:', fallbackErr);
      }
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
  }, [entity]);

  const loadEmployeePhotoRules = async () => {
    if (entity !== 'employees') return;
    try {
      const payload = (await request('/organization/employees/photo-storage')) as EmployeePhotoStorageInfo;
      const effectiveRules: EmployeePhotoValidationRules = {
        ...FALLBACK_EMPLOYEE_PHOTO_RULES,
        ...(payload.validation_rules || {}),
      };
      setPhotoRules(effectiveRules);
    } catch (err) {
      console.error('Error cargando reglas de fotos:', err);
    }
  };

  const validateEmployeePhotoFile = async (file: File) => {
    if (file.size > photoRules.max_file_size_bytes) {
      const err = new Error(
        `Error por peso: la foto supera ${Math.round(photoRules.max_file_size_bytes / (1024 * 1024))} MB.`
      ) as ApiErrorWithMeta;
      err.code = 'PHOTO_TOO_LARGE';
      throw err;
    }

    const { width, height } = await getImageDimensions(file);
    const enforcedMinWidth = Math.min(photoRules.min_width, 450);
    const enforcedMinHeight = Math.min(photoRules.min_height, 600);
    if (width < enforcedMinWidth || height < enforcedMinHeight) {
      throw createPhotoValidationError(
        `Error por tamano (resolucion minima): requerido ${enforcedMinWidth}x${enforcedMinHeight}px, actual ${width}x${height}px.`
      );
    }

    if (width > photoRules.max_width || height > photoRules.max_height) {
      throw createPhotoValidationError(
        `Error por tamano (resolucion maxima): permitido ${photoRules.max_width}x${photoRules.max_height}px.`
      );
    }

    if (height <= width) {
      throw createPhotoValidationError('Error por tamano (orientacion): la foto debe ser vertical tipo carnet.');
    }

    const ratio = width / height;
    if (ratio < photoRules.min_aspect_ratio || ratio > photoRules.max_aspect_ratio) {
      throw createPhotoValidationError(
        'Error por tamano (proporcion): la foto debe tener proporcion tipo carnet (aprox. 3:4).',
      );
    }
  };

  const uploadEmployeePhotoFile = async (file: File): Promise<string> => {
    await validateEmployeePhotoFile(file);
    const fileBase64 = await toBase64(file);
    const payload = await request('/organization/employees/upload-photo', {
      method: 'POST',
      body: JSON.stringify({
        file_name: file.name,
        mime_type: file.type,
        file_base64: fileBase64,
      }),
    });

    return String(payload.photo_path || '');
  };

  useEffect(() => {
    loadItems();
    setShowForm(false);
    setEditingId(null);
    setFormData({});
    setSearchTerm('');
    setSelectedPhotoFile(null);
    clearPhotoPreview();
    if (entity === 'employees') {
      loadEmployeePhotoRules();
    }
  }, [entity]);

  useEffect(() => {
    return () => {
      clearPhotoPreview();
    };
  }, []);

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) =>
      config.tableColumns.some((column) =>
        String(item[column] ?? '').toLowerCase().includes(q)
      )
    );
  }, [items, config.tableColumns, searchTerm]);

  const openCreate = () => {
    const initial: Record<string, any> = {};
    config.fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        initial[field.key] = field.defaultValue;
      } else if (field.type === 'boolean') {
        initial[field.key] = true;
      } else {
        initial[field.key] = '';
      }
    });

    setFormData(initial);
    setEditingId(null);
    setShowForm(true);
    setSelectedPhotoFile(null);
    clearPhotoPreview();
  };

  const openEdit = (item: any) => {
    const initial: Record<string, any> = {};
    config.fields.forEach((field) => {
      const value = item[field.key];
      if (field.type === 'date') {
        initial[field.key] = normalizeDateInputValue(value);
      } else {
        initial[field.key] = value === null || value === undefined ? '' : value;
      }
    });

    setFormData(initial);
    setEditingId(item.id);
    setShowForm(true);
    setSelectedPhotoFile(null);
    if (entity === 'employees') {
      void loadEmployeePhotoPreview(item.id, item.employee_photo_path);
    } else {
      clearPhotoPreview();
    }
  };

  const handleUploadEmployeePhoto = async () => {
    if (!selectedPhotoFile) {
      setError('Seleccione una foto antes de subirla');
      return;
    }

    setPhotoUploading(true);
    setError(null);
    try {
      const uploadedPath = await uploadEmployeePhotoFile(selectedPhotoFile);
      setFormData((prev) => ({
        ...prev,
        employee_photo_path: uploadedPath,
      }));
      setSelectedPhotoFile(null);
    } catch (err: any) {
      setError(formatPhotoUploadError(err));
    } finally {
      setPhotoUploading(false);
    }
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

      if (entity === 'employees' && selectedPhotoFile) {
        setPhotoUploading(true);
        try {
          const uploadedPath = await uploadEmployeePhotoFile(selectedPhotoFile);
          payload.employee_photo_path = uploadedPath;
          setFormData((prev) => ({ ...prev, employee_photo_path: uploadedPath }));
          setSelectedPhotoFile(null);
        } finally {
          setPhotoUploading(false);
        }
      }

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
      setError(formatPhotoUploadError(err));
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

  const handleDelete = async (item: any) => {
    setError(null);
    const confirmed = window.confirm('Esta accion eliminara el registro de forma permanente. Deseas continuar?');
    if (!confirmed) return;

    try {
      await request(`/organization/${entity}/${item.id}`, {
        method: 'DELETE',
      });
      await loadItems();
    } catch (err: any) {
      setError(err.message || 'Error eliminando registro');
    }
  };

  const getShiftCombinations = () => {
    return catalogs.employee_company_combinations || [];
  };

  const getShiftCompanyOptions = () => {
    const companies = (catalogs.companies || []) as any[];
    const baseOptions = [...companies].sort((a, b) =>
      String(a.company_name || '').localeCompare(String(b.company_name || ''))
    );
    if (baseOptions.length === 0) return baseOptions;

    return [
      { id: '0', company_code: '0', company_name: '[TODAS LAS EMPRESAS]' },
      ...baseOptions,
    ];
  };

  const getShiftPayrollGroupOptions = () => {
    const combinations = getShiftCombinations();
    const selectedCompanyId = formData.company_id;
    const filtered = selectedCompanyId && selectedCompanyId !== '0'
      ? combinations.filter((combo: any) => combo.company_id === selectedCompanyId)
      : combinations;

    const map = new Map<string, any>();
    filtered.forEach((combo: any) => {
      if (!combo?.payroll_group_id) return;
      if (!map.has(combo.payroll_group_id)) {
        map.set(combo.payroll_group_id, {
          id: combo.payroll_group_id,
          payroll_group_code: combo.payroll_group_code,
          payroll_group_name: combo.payroll_group_name,
        });
      }
    });

    const baseOptions = Array.from(map.values()).sort((a, b) =>
      String(a.payroll_group_name || '').localeCompare(String(b.payroll_group_name || ''))
    );
    if (baseOptions.length === 0) return baseOptions;

    return [
      { id: '0', payroll_group_code: '0', payroll_group_name: '[TODOS LOS GRUPOS DE NOMINA]' },
      ...baseOptions,
    ];
  };

  const getSelectOptions = (key?: string) => {
    if (!key) return [];

    if (entity === 'shifts' && key === 'companies') {
      return getShiftCompanyOptions();
    }

    if (entity === 'shifts' && key === 'payroll_groups') {
      return getShiftPayrollGroupOptions();
    }

    return catalogs[key] || [];
  };

  const getFieldByKey = (fieldKey: string) => {
    return config.fields.find((field) => field.key === fieldKey);
  };

  const getOptionLabel = (option: any) => {
    return (
      option.label ||
      option.lookup_label ||
      option.company_name ||
      option.department_name ||
      option.area_name ||
      option.cost_center_name ||
      option.payroll_group_name ||
      option.profile_name ||
      option.work_group_name ||
      option.work_location_name ||
      option.job_title_name ||
      (option.employee_code
        ? `${option.employee_code} - ${option.employee_lastname || ''} ${option.employee_name || ''}`.trim()
        : null) ||
      option.lookup_key ||
      option.id
    );
  };

  const formatCellValue = (column: string, rawValue: any) => {
    const field = getFieldByKey(column);

    if (!field) {
      return String(rawValue ?? '');
    }

    if (field.type === 'boolean') {
      return rawValue === true ? 'Activo' : 'Inactivo';
    }

    if (field.type === 'select') {
      if (!rawValue) return '';
      const options = getSelectOptions(field.optionsKey);
      const selected = options.find((option: any) => option.id === rawValue);
      return selected ? String(getOptionLabel(selected)) : String(rawValue);
    }

    return String(rawValue ?? '');
  };

  return (
    <div className="space-y-6">
      {!hideTopHeader && (
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
      )}

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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                clearPhotoPreview();
              }}
            />
            <div className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-lg border bg-white shadow-2xl flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                <h3 className="text-base font-semibold text-gray-900">
                  {editingId ? `Editar ${config.title}` : `Nuevo ${config.title}`}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    clearPhotoPreview();
                  }}
                  className="p-1.5 rounded hover:bg-gray-200"
                  title="Cerrar"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {config.fields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    {field.label} {field.required && '*'}
                  </label>

                  {entity === 'employees' && field.key === 'employee_photo_path' ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={formData[field.key] ?? ''}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, [field.key]: event.target.value }))
                        }
                        placeholder="Ruta relativa de la foto"
                        className="w-full border rounded px-2 py-1.5 text-sm bg-white"
                      />
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          setSelectedPhotoFile(file);
                          if (file) {
                            const localUrl = URL.createObjectURL(file);
                            setPhotoPreview(localUrl);
                          } else {
                            clearPhotoPreview();
                          }
                        }}
                        className="w-full border rounded px-2 py-1.5 text-sm bg-white"
                      />
                      <p className="text-xs text-gray-600">
                        Formato carnet recomendado: vertical 3:4, resolución entre {photoRules.min_width}x{photoRules.min_height} y {photoRules.max_width}x{photoRules.max_height} px, máximo {Math.round(photoRules.max_file_size_bytes / (1024 * 1024))} MB.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleUploadEmployeePhoto}
                          disabled={photoUploading}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs bg-white hover:bg-gray-100 disabled:opacity-50"
                        >
                          {photoUploading ? 'Subiendo...' : 'Subir Foto'}
                        </button>
                        {selectedPhotoFile ? (
                          <span className="text-xs text-gray-600">{selectedPhotoFile.name}</span>
                        ) : formData[field.key] ? (
                          <span className="text-xs text-gray-600">{String(formData[field.key])}</span>
                        ) : null}
                      </div>
                      {photoPreviewUrl && (
                        <img
                          src={photoPreviewUrl}
                          alt="Preview"
                          className="h-20 w-20 object-cover rounded border"
                        />
                      )}
                    </div>
                  ) : field.type === 'select' ? (

                    <select
                      value={formData[field.key] ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (entity === 'shifts' && field.key === 'company_id') {
                          setFormData((prev) => ({
                            ...prev,
                            company_id: value,
                            payroll_group_id: '',
                          }));
                          return;
                        }
                        setFormData((prev) => ({ ...prev, [field.key]: value }));
                      }}
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    >
                      <option value="">-- Seleccionar --</option>
                      {getSelectOptions(field.optionsKey).map((option: any) => (
                        <option key={option.id} value={option.id}>
                          {getOptionLabel(option)}
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
                      type={
                        field.type === 'number'
                          ? 'number'
                          : field.type === 'date'
                            ? 'date'
                            : field.type === 'time'
                              ? 'time'
                              : 'text'
                      }
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
                  clearPhotoPreview();
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-gray-100"
              >
                <X className="size-4" />
                Cancelar
              </button>
            </div>
          </div>
          </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar..."
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-sm text-gray-500">
            {filteredItems.length} de {items.length}
          </span>
        </div>

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
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={config.tableColumns.length + 1} className="px-3 py-6 text-center text-gray-500">
                    {searchTerm ? 'No hay resultados' : 'Sin registros'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {config.tableColumns.map((column) => (
                      <td key={column} className="px-3 py-2 border-b text-gray-700">
                        {formatCellValue(column, item[column])}
                      </td>
                    ))}
                    <td className="px-3 py-2 border-b">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="inline-flex items-center justify-center p-1.5 rounded border text-xs hover:bg-gray-100"
                          title="Editar"
                        >
                          <Pencil className="size-3" />
                        </button>
                        {'is_active' in item && (
                          <button
                            onClick={() => handleToggleStatus(item)}
                            className="inline-flex items-center justify-center p-1.5 rounded border text-xs hover:bg-gray-100"
                            title={item.is_active ? 'Desactivar' : 'Activar'}
                          >
                            <Power className="size-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item)}
                          className="inline-flex items-center justify-center p-1.5 rounded border text-xs text-red-700 border-red-200 hover:bg-red-50"
                          title="Eliminar"
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
      </div>
    </div>
  );
}

