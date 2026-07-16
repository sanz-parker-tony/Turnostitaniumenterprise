'use client';

import { buildApiUrl } from '../../../utils/api-config';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UsersRound } from 'lucide-react';
import SystemAdminPageHeader from '@/components/shared/SystemAdminPageHeader';
import HeaderInfoTips from '@/components/shared/HeaderInfoTips';

type TargetRoleKey = 'SUPERVISOR' | 'RRHH_ADMIN' | 'RHADMIN';

type Target = {
  user_role_id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  role_key: TargetRoleKey;
  role_name: string;
};

type EmployeeRow = {
  employee_id: string;
  employee_code: string | null;
  employee_name: string;
  employee_lastname: string;
  company_name?: string | null;
  work_location_name?: string | null;
  department_name?: string | null;
  area_name?: string | null;
  cost_center_name?: string | null;
  work_group_name?: string | null;
  authorization_source?: string;
};

type EmployeeAccessCapabilities = {
  can_authorize_one: boolean;
  can_authorize_all: boolean;
  can_revoke_one: boolean;
  can_revoke_all: boolean;
};

const API_BASE = buildApiUrl('/security-user-scopes');

type ScopeFilterKey =
  | 'company_id'
  | 'work_location_id'
  | 'department_id'
  | 'area_id'
  | 'cost_center_id'
  | 'work_group_id'
  | 'employee_profile_id';

type ScopeFilterOption = { id: string; name: string };

const SCOPE_FILTER_CONFIG: Array<{ key: ScopeFilterKey; label: string }> = [
  { key: 'company_id', label: 'Empresa' },
  { key: 'work_location_id', label: 'Localizacion' },
  { key: 'department_id', label: 'Departamento' },
  { key: 'area_id', label: 'Area' },
  { key: 'cost_center_id', label: 'Centro de costo' },
  { key: 'work_group_id', label: 'Grupo de trabajo' },
  { key: 'employee_profile_id', label: 'Perfil' },
];

const SCOPE_FILTER_DEFAULT_LABELS: Record<ScopeFilterKey, string> = {
  company_id: 'Seleccione empresa autorizada',
  work_location_id: 'Todas las localizaciones',
  department_id: 'Todos los departamentos',
  area_id: 'Todas las áreas',
  cost_center_id: 'Todos los centros de costo',
  work_group_id: 'Todos los grupos de trabajo',
  employee_profile_id: 'Todos los perfiles',
};

const EMPTY_FILTERS: Record<ScopeFilterKey, string> = {
  company_id: '',
  work_location_id: '',
  department_id: '',
  area_id: '',
  cost_center_id: '',
  work_group_id: '',
  employee_profile_id: '',
};

function employeeLabel(e: EmployeeRow): string {
  const full = `${e.employee_lastname || ''} ${e.employee_name || ''}`.trim();
  return `${full}${e.employee_code ? ` (${e.employee_code})` : ''}`;
}

export default function SecurityUserEmployeeAccessManagement() {
  const { session } = useAuth();
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedUserRoleId, setSelectedUserRoleId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [capabilities, setCapabilities] = useState<EmployeeAccessCapabilities>({
    can_authorize_one: false,
    can_authorize_all: false,
    can_revoke_one: false,
    can_revoke_all: false,
  });

  const [authorizedEmployees, setAuthorizedEmployees] = useState<EmployeeRow[]>([]);
  const [unauthorizedEmployees, setUnauthorizedEmployees] = useState<EmployeeRow[]>([]);

  const [selectedAuthorized, setSelectedAuthorized] = useState<Set<string>>(new Set());
  const [selectedUnauthorized, setSelectedUnauthorized] = useState<Set<string>>(new Set());

  const [scopeFilterOptions, setScopeFilterOptions] = useState<Record<ScopeFilterKey, ScopeFilterOption[]>>({
    company_id: [],
    work_location_id: [],
    department_id: [],
    area_id: [],
    cost_center_id: [],
    work_group_id: [],
    employee_profile_id: [],
  });
  const [activeFilters, setActiveFilters] = useState<Record<ScopeFilterKey, string>>(EMPTY_FILTERS);

  const token = session?.access_token || '';

  useEffect(() => {
    void loadTargets();
  }, [token]);

  useEffect(() => {
    if (!selectedUserRoleId) return;
    void bootstrapSelectedTarget(selectedUserRoleId);
  }, [selectedUserRoleId]);

  useEffect(() => {
    if (!selectedUserRoleId) return;
    const h = setTimeout(() => {
      if (!activeFilters.company_id) {
        setAuthorizedEmployees([]);
        setUnauthorizedEmployees([]);
        return;
      }
      void loadEmployeeAccessData(selectedUserRoleId, activeFilters).catch((error: any) => {
        toast.error(error?.message || 'Error cargando acceso de empleados');
      });
    }, 300);
    return () => clearTimeout(h);
  }, [activeFilters, selectedUserRoleId]);

  async function authorizedFetch(path: string, init?: RequestInit): Promise<Response> {
    if (!token) throw new Error('Sesión no disponible');
    return fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });
  }

  async function loadTargets() {
    if (!token) return;
    setIsLoading(true);
    try {
      const capsResponse = await authorizedFetch('/employee-access/capabilities');
      const capsPayload = await capsResponse.json();
      if (capsResponse.ok && capsPayload?.capabilities) {
        setCapabilities(capsPayload.capabilities as EmployeeAccessCapabilities);
      }

      const response = await authorizedFetch('/targets?capability=EMPLOYEE_ACCESS');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar usuarios objetivo');
      const list = (payload.targets || []) as Target[];
      setTargets(list);
      if (!selectedUserRoleId && list.length > 0) setSelectedUserRoleId(list[0].user_role_id);
    } catch (error: any) {
      toast.error(error?.message || 'Error cargando usuarios objetivo');
    } finally {
      setIsLoading(false);
    }
  }

  async function bootstrapSelectedTarget(userRoleId: string) {
    setIsLoading(true);
    try {
      setSelectedAuthorized(new Set());
      setSelectedUnauthorized(new Set());
      setActiveFilters(EMPTY_FILTERS);

      const options = await loadScopeFilterOptions(userRoleId, EMPTY_FILTERS);
      const firstCompanyId = options.company_id[0]?.id || '';
      if (!firstCompanyId) {
        setAuthorizedEmployees([]);
        setUnauthorizedEmployees([]);
        return;
      }
      setActiveFilters({ ...EMPTY_FILTERS, company_id: firstCompanyId });
    } catch (error: any) {
      toast.error(error?.message || 'Error inicializando acceso de empleados');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadScopeFilterOptions(userRoleId: string, filtersToUse: Record<ScopeFilterKey, string>) {
    const query = new URLSearchParams();
    for (const cfg of SCOPE_FILTER_CONFIG) {
      const value = filtersToUse[cfg.key];
      if (value) query.set(cfg.key, value);
    }

    const scopeResponse = await authorizedFetch(`/${userRoleId}/employee-access/filters?${query.toString()}`);
    const scopePayload = await scopeResponse.json();
    if (!scopeResponse.ok) throw new Error(scopePayload?.error || 'No se pudieron cargar filtros');

    const filters = scopePayload.filters || {};
    const nextOptions = {
      company_id: (filters.companies || []) as ScopeFilterOption[],
      work_location_id: (filters.work_locations || []) as ScopeFilterOption[],
      department_id: (filters.departments || []) as ScopeFilterOption[],
      area_id: (filters.areas || []) as ScopeFilterOption[],
      cost_center_id: (filters.cost_centers || []) as ScopeFilterOption[],
      work_group_id: (filters.work_groups || []) as ScopeFilterOption[],
      employee_profile_id: (filters.employee_profiles || []) as ScopeFilterOption[],
    };
    setScopeFilterOptions(nextOptions);
    return nextOptions;
  }

  async function loadEmployeeAccessData(userRoleId: string, filtersToUse: Record<ScopeFilterKey, string>) {
    await Promise.all([
      loadScopeFilterOptions(userRoleId, filtersToUse),
      loadEmployeeLists(userRoleId, filtersToUse),
    ]);
  }

  async function loadEmployeeLists(userRoleId: string, filtersToUse: Record<ScopeFilterKey, string>) {
    const query = new URLSearchParams();
    for (const cfg of SCOPE_FILTER_CONFIG) {
      const value = filtersToUse[cfg.key];
      if (value) query.set(cfg.key, value);
    }
    query.set('limit', '200');
    query.set('offset', '0');

    const [authorizedResponse, unauthorizedResponse] = await Promise.all([
      authorizedFetch(`/${userRoleId}/employee-access/authorized?${query.toString()}`),
      authorizedFetch(`/${userRoleId}/employee-access/unauthorized?${query.toString()}`),
    ]);

    const authorizedPayload = await authorizedResponse.json();
    const unauthorizedPayload = await unauthorizedResponse.json();

    if (!authorizedResponse.ok) throw new Error(authorizedPayload?.error || 'No se pudo cargar lista autorizada');
    if (!unauthorizedResponse.ok) throw new Error(unauthorizedPayload?.error || 'No se pudo cargar lista no autorizada');

    setAuthorizedEmployees((authorizedPayload.employees || []) as EmployeeRow[]);
    setUnauthorizedEmployees((unauthorizedPayload.employees || []) as EmployeeRow[]);
  }

  async function persistAssignments(operation: 'authorize' | 'revoke', employeeIds: string[]) {
    if (!selectedUserRoleId) return;
    if (employeeIds.length === 0) return;

    setIsSaving(true);
    try {
      const response = await authorizedFetch(`/${selectedUserRoleId}/employee-access/${operation}`, {
        method: 'POST',
        body: JSON.stringify({ employee_ids: employeeIds }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo guardar la actualización de accesos');
      await loadEmployeeLists(selectedUserRoleId, activeFilters);
      setSelectedAuthorized(new Set());
      setSelectedUnauthorized(new Set());
      toast.success('Accesos de empleados actualizados');
    } catch (error: any) {
      toast.error(error?.message || 'Error guardando acceso de empleados');
    } finally {
      setIsSaving(false);
    }
  }

  async function authorizeSelected() {
    await persistAssignments('authorize', Array.from(selectedUnauthorized));
  }

  async function authorizeAllVisible() {
    await persistAssignments('authorize', unauthorizedEmployees.map((row) => row.employee_id));
  }

  async function revokeSelected() {
    if (selectedAuthorized.size === 0) {
      toast.info('Selecciona empleados en la lista de autorizados.');
      return;
    }

    await persistAssignments('revoke', Array.from(selectedAuthorized));
  }

  async function revokeAllVisible() {
    if (authorizedEmployees.length === 0) {
      toast.info('No hay empleados autorizados visibles.');
      return;
    }

    await persistAssignments('revoke', authorizedEmployees.map((row) => row.employee_id));
  }

  function toggleInSet(current: Set<string>, id: string): Set<string> {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  function handleFilterChange(key: ScopeFilterKey, value: string) {
    setSelectedAuthorized(new Set());
    setSelectedUnauthorized(new Set());
    setActiveFilters((prev) => {
      if (key === 'company_id') {
        return { ...EMPTY_FILTERS, company_id: value };
      }
      if (key === 'work_location_id') {
        return {
          ...prev,
          work_location_id: value,
          department_id: '',
          area_id: '',
          cost_center_id: '',
          work_group_id: '',
          employee_profile_id: '',
        };
      }
      if (key === 'department_id') {
        return {
          ...prev,
          department_id: value,
          area_id: '',
          cost_center_id: '',
          work_group_id: '',
          employee_profile_id: '',
        };
      }
      if (key === 'area_id') {
        return {
          ...prev,
          area_id: value,
          cost_center_id: '',
          work_group_id: '',
          employee_profile_id: '',
        };
      }
      return { ...prev, [key]: value };
    });
  }

  return (
    <div className="p-6 max-w-full flex h-[calc(100vh-140px)] min-h-0 flex-col gap-4">
      <SystemAdminPageHeader
        icon={UsersRound}
        title="Autorización Empleados por Usuario"
        subtitle="Autoriza o revoca acceso explicito de empleados por supervisor o rol"
        rightSlot={
          <HeaderInfoTips
            items={[
              {
                title: 'Información',
                text: 'El usuario objetivo corresponde únicamente a supervisores y administradores de RRHH.',
                variant: 'info',
              },
              {
                title: 'Consejo',
                text: 'Los filtros muestran únicamente valores disponibles en los alcances guardados del usuario seleccionado.',
                variant: 'tip',
              },
              {
                title: 'Advertencia',
                text: 'Esta pantalla administra asignación explícita de empleados por supervisor/rol, independiente de la estructura de alcances.',
                variant: 'warning',
              },
            ]}
          />
        }
      />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3">
          <div>
            <select
              className="w-full rounded-md border border-slate-300 p-2 text-sm"
              value={selectedUserRoleId}
              onChange={(e) => setSelectedUserRoleId(e.target.value)}
              disabled={isLoading || isSaving}
            >
              {targets.length === 0 ? <option value="">Sin usuarios objetivo</option> : null}
              {targets.map((target) => (
                <option key={target.user_role_id} value={target.user_role_id}>
                  {(target.display_name?.trim() || target.username)} ({target.role_key})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {SCOPE_FILTER_CONFIG.map((cfg) => {
            const options = scopeFilterOptions[cfg.key];
            return (
              <div key={cfg.key}>
                <select
                  className="w-full rounded-md border border-slate-300 p-2 text-sm"
                  value={activeFilters[cfg.key]}
                  onChange={(e) => handleFilterChange(cfg.key, e.target.value)}
                  disabled={isLoading || isSaving || options.length === 0}
                >
                  <option value="">{SCOPE_FILTER_DEFAULT_LABELS[cfg.key]}</option>
                  {options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <div className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 text-sm font-semibold text-slate-800">No autorizados</div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {unauthorizedEmployees.map((employee) => (
              <label key={employee.employee_id} className="flex items-start gap-2 rounded-md border border-slate-100 p-2 text-sm hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={selectedUnauthorized.has(employee.employee_id)}
                  onChange={() => setSelectedUnauthorized((prev) => toggleInSet(prev, employee.employee_id))}
                />
                <span>
                  <span className="block font-medium text-slate-700">{employeeLabel(employee)}</span>
                  <span className="block text-xs text-slate-500">{employee.company_name || '-'} · {employee.department_name || '-'}</span>
                </span>
              </label>
            ))}
            {unauthorizedEmployees.length === 0 ? <div className="text-xs text-slate-500">Sin empleados no autorizados para el filtro actual.</div> : null}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => void authorizeAllVisible()}
            disabled={isLoading || isSaving || unauthorizedEmployees.length === 0 || !capabilities.can_authorize_all}
          >
            {'>>'}
          </Button>
          <Button
            variant="outline"
            onClick={() => void authorizeSelected()}
            disabled={isLoading || isSaving || selectedUnauthorized.size === 0 || !capabilities.can_authorize_one}
          >
            {'>'}
          </Button>
          <Button
            variant="outline"
            onClick={() => void revokeSelected()}
            disabled={isLoading || isSaving || selectedAuthorized.size === 0 || !capabilities.can_revoke_one}
          >
            {'<'}
          </Button>
          <Button
            variant="outline"
            onClick={() => void revokeAllVisible()}
            disabled={isLoading || isSaving || authorizedEmployees.length === 0 || !capabilities.can_revoke_all}
          >
            {'<<'}
          </Button>
        </div>

        <div className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 text-sm font-semibold text-slate-800">Autorizados</div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {authorizedEmployees.map((employee) => (
              <label key={employee.employee_id} className="flex items-start gap-2 rounded-md border border-slate-100 p-2 text-sm hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={selectedAuthorized.has(employee.employee_id)}
                  onChange={() => setSelectedAuthorized((prev) => toggleInSet(prev, employee.employee_id))}
                />
                <span>
                  <span className="block font-medium text-slate-700">{employeeLabel(employee)}</span>
                  <span className="block text-xs text-slate-500">
                    {employee.company_name || '-'} · {employee.department_name || '-'} · fuente: {employee.authorization_source || '-'}
                  </span>
                </span>
              </label>
            ))}
            {authorizedEmployees.length === 0 ? <div className="text-xs text-slate-500">Sin empleados autorizados para el filtro actual.</div> : null}
          </div>
        </div>
      </div>

    </div>
  );
}

