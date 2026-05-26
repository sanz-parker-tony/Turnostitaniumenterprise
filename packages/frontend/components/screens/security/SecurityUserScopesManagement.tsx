'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RefreshCw, Save, ShieldCheck } from 'lucide-react';
import SystemAdminPageHeader from '@/components/shared/SystemAdminPageHeader';
import HeaderInfoTips from '@/components/shared/HeaderInfoTips';

type TargetRoleKey = 'SUPERVISOR' | 'RRHH_ADMIN' | 'RHADMIN';

type Target = {
  user_role_id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  role_id: string;
  role_key: TargetRoleKey;
  role_name: string;
};

type ScopeTypeKey = 'COMPANY' | 'WORK_LOCATION' | 'DEPARTMENT' | 'AREA' | 'COST_CENTER' | 'WORK_GROUP' | 'EMPLOYEE_PROFILE';

type ScopeRow = {
  id: string;
  user_role_id: string;
  scope_type_key: ScopeTypeKey;
  scope_entity_id: string;
};

type TreeLeafNode = { id: string; name: string };
type TreeAreaNode = {
  id: string;
  name: string;
  cost_centers: TreeLeafNode[];
  work_groups: TreeLeafNode[];
  employee_profiles: TreeLeafNode[];
};
type TreeDepartmentNode = { id: string; name: string; areas: TreeAreaNode[] };
type TreeWorkLocationNode = { id: string; name: string; departments: TreeDepartmentNode[] };
type TreeCompanyNode = { id: string; name: string; work_locations: TreeWorkLocationNode[] };

type AreaContext = {
  company_id: string;
  company_name: string;
  work_location_id: string;
  work_location_name: string;
  department_id: string;
  department_name: string;
  area_id: string;
  area_name: string;
  cost_centers: TreeLeafNode[];
  work_groups: TreeLeafNode[];
  employee_profiles: TreeLeafNode[];
};

const API_BASE = 'http://localhost:3001/security-user-scopes';

function labelTarget(t: Target): string {
  const name = t.display_name?.trim() || t.username;
  return `${name} (${t.role_key})`;
}

function keyOf(type: ScopeTypeKey, id: string): string {
  return `${type}:${id}`;
}

export default function SecurityUserScopesManagement() {
  const { session } = useAuth();

  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedUserRoleId, setSelectedUserRoleId] = useState('');

  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [tree, setTree] = useState<TreeCompanyNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedArea, setSelectedArea] = useState<AreaContext | null>(null);

  const [selection, setSelection] = useState<Record<ScopeTypeKey, Set<string>>>({
    COMPANY: new Set<string>(),
    WORK_LOCATION: new Set<string>(),
    DEPARTMENT: new Set<string>(),
    AREA: new Set<string>(),
    COST_CENTER: new Set<string>(),
    WORK_GROUP: new Set<string>(),
    EMPLOYEE_PROFILE: new Set<string>(),
  });

  const token = session?.access_token || '';

  useEffect(() => {
    void loadTargets();
  }, [token]);

  useEffect(() => {
    if (!selectedUserRoleId) return;
    void Promise.all([loadScopes(selectedUserRoleId), loadTree()]);
  }, [selectedUserRoleId]);

  async function authorizedFetch(path: string, init?: RequestInit): Promise<Response> {
    if (!token) throw new Error('Sesion no disponible');
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
    setIsLoadingTargets(true);
    try {
      const response = await authorizedFetch('/targets');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar usuarios objetivo');
      const nextTargets = (payload.targets || []) as Target[];
      setTargets(nextTargets);
      if (!selectedUserRoleId && nextTargets.length > 0) {
        setSelectedUserRoleId(nextTargets[0].user_role_id);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Error cargando usuarios objetivo');
    } finally {
      setIsLoadingTargets(false);
    }
  }

  async function loadTree() {
    setIsLoadingTree(true);
    try {
      const response = await authorizedFetch('/catalogs/tree');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar arbol organizacional');

      const nextTree = (payload.tree || []) as TreeCompanyNode[];
      setTree(nextTree);

      const nextExpanded = new Set<string>();
      for (const company of nextTree) {
        nextExpanded.add(keyOf('COMPANY', company.id));
      }
      setExpanded(nextExpanded);
    } catch (error: any) {
      toast.error(error?.message || 'Error cargando arbol organizacional');
    } finally {
      setIsLoadingTree(false);
    }
  }

  async function loadScopes(userRoleId: string) {
    try {
      const response = await authorizedFetch(`/${userRoleId}/scopes`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar scopes');

      const rows = (payload.scopes || []) as ScopeRow[];
      const next: Record<ScopeTypeKey, Set<string>> = {
        COMPANY: new Set<string>(),
        WORK_LOCATION: new Set<string>(),
        DEPARTMENT: new Set<string>(),
        AREA: new Set<string>(),
        COST_CENTER: new Set<string>(),
        WORK_GROUP: new Set<string>(),
        EMPLOYEE_PROFILE: new Set<string>(),
      };

      for (const row of rows) {
        if (row.scope_type_key in next) {
          next[row.scope_type_key].add(row.scope_entity_id);
        }
      }

      setSelection(next);
      setSelectedArea(null);
    } catch (error: any) {
      toast.error(error?.message || 'Error cargando scopes actuales');
    }
  }

  function toggleExpanded(type: ScopeTypeKey, id: string) {
    const key = keyOf(type, id);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelection(type: ScopeTypeKey, id: string, checked: boolean) {
    setSelection((prev) => {
      const next = new Set(prev[type]);
      if (checked) next.add(id);
      else next.delete(id);
      return { ...prev, [type]: next };
    });
  }

  function setAllSelection(type: ScopeTypeKey, ids: string[], checked: boolean) {
    setSelection((prev) => {
      const next = new Set(prev[type]);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return { ...prev, [type]: next };
    });
  }

  function selectAreaContext(
    company: TreeCompanyNode,
    workLocation: TreeWorkLocationNode,
    department: TreeDepartmentNode,
    area: TreeAreaNode
  ) {
    setSelectedArea({
      company_id: company.id,
      company_name: company.name,
      work_location_id: workLocation.id,
      work_location_name: workLocation.name,
      department_id: department.id,
      department_name: department.name,
      area_id: area.id,
      area_name: area.name,
      cost_centers: area.cost_centers,
      work_groups: area.work_groups,
      employee_profiles: area.employee_profiles,
    });
  }

  async function saveScopes() {
    if (!selectedUserRoleId) {
      toast.error('Selecciona un usuario objetivo');
      return;
    }

    const scopes = [
      ...Array.from(selection.COMPANY).map((id) => ({ scope_type_key: 'COMPANY', scope_entity_id: id })),
      ...Array.from(selection.WORK_LOCATION).map((id) => ({ scope_type_key: 'WORK_LOCATION', scope_entity_id: id })),
      ...Array.from(selection.DEPARTMENT).map((id) => ({ scope_type_key: 'DEPARTMENT', scope_entity_id: id })),
      ...Array.from(selection.AREA).map((id) => ({ scope_type_key: 'AREA', scope_entity_id: id })),
      ...Array.from(selection.COST_CENTER).map((id) => ({ scope_type_key: 'COST_CENTER', scope_entity_id: id })),
      ...Array.from(selection.WORK_GROUP).map((id) => ({ scope_type_key: 'WORK_GROUP', scope_entity_id: id })),
      ...Array.from(selection.EMPLOYEE_PROFILE).map((id) => ({ scope_type_key: 'EMPLOYEE_PROFILE', scope_entity_id: id })),
    ];

    setIsSaving(true);
    try {
      const response = await authorizedFetch(`/${selectedUserRoleId}/scopes`, {
        method: 'PUT',
        body: JSON.stringify({ scopes }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudieron guardar los alcances');
      toast.success('Alcances guardados correctamente');
      await loadScopes(selectedUserRoleId);
    } catch (error: any) {
      toast.error(error?.message || 'Error guardando alcances');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-full flex h-[calc(100vh-140px)] min-h-0 flex-col gap-4">
      <SystemAdminPageHeader
        icon={ShieldCheck}
        title="Alcances por Usuario"
        subtitle="Configura alcances organizacionales para usuarios objetivo"
        rightSlot={
          <HeaderInfoTips
            items={[
              {
                title: 'Usuario objetivo',
                text: 'Solo se listan usuarios con rol Supervisor o Administrador de RRHH.',
                variant: 'info',
              },
            ]}
          />
        }
      />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <select
            className="w-full rounded-md border border-slate-300 p-2 text-sm"
            value={selectedUserRoleId}
            onChange={(e) => setSelectedUserRoleId(e.target.value)}
            disabled={isLoadingTargets || targets.length === 0}
          >
            {targets.length === 0 ? <option value="">Sin usuarios objetivo</option> : null}
            {targets.map((target) => (
              <option key={target.user_role_id} value={target.user_role_id}>
                {labelTarget(target)}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 lg:shrink-0">
            <Button
              variant="outline"
              className="border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800"
              onClick={() => selectedUserRoleId && void loadScopes(selectedUserRoleId)}
              disabled={!selectedUserRoleId || isLoadingTree || isSaving}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => void saveScopes()}
              disabled={!selectedUserRoleId || isLoadingTree || isSaving}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Guardando...' : 'Guardar Alcance'}
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid min-h-full grid-cols-1 items-stretch gap-4 xl:grid-cols-[1.35fr_1fr]">
          <div className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-slate-800">Arbol organizacional de alcances</div>
          <div className="mb-3 text-xs text-slate-500">
            Estructura: Empresa {'>'} Localizacion {'>'} Departamento {'>'} Area. Selecciona nodos segun el alcance requerido.
          </div>

          <div className="min-h-0 flex-1 pr-1">
            <div className="h-full min-h-0 overflow-auto">
              {tree.length === 0 ? (
                <div className="text-xs text-slate-500">No hay estructura organizacional disponible.</div>
              ) : (
                <div className="h-full space-y-2">
                  {tree.map((company) => {
                    const companyExpanded = expanded.has(keyOf('COMPANY', company.id));
                    return (
                      <div key={company.id} className="p-1">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <button type="button" className="w-5 text-left text-slate-500" onClick={() => toggleExpanded('COMPANY', company.id)}>
                            {companyExpanded ? '-' : '+'}
                          </button>
                          <input
                            type="checkbox"
                            checked={selection.COMPANY.has(company.id)}
                            onChange={(e) => toggleSelection('COMPANY', company.id, e.target.checked)}
                          />
                          <span className="font-medium">{company.name}</span>
                        </div>

                        {companyExpanded ? (
                          <div className="ml-6 mt-1 space-y-1">
                            {company.work_locations.map((workLocation, workLocationIndex) => {
                              const workLocationExpanded = expanded.has(keyOf('WORK_LOCATION', workLocation.id));
                              const workLocationConnector = workLocationIndex === company.work_locations.length - 1 ? '└─' : '├─';
                              return (
                                <div key={workLocation.id}>
                                  <div className="flex items-center gap-2 text-sm text-slate-700">
                                    <span className="w-5 text-slate-400">{workLocationConnector}</span>
                                    <button
                                      type="button"
                                      className="w-5 text-left text-slate-500"
                                      onClick={() => toggleExpanded('WORK_LOCATION', workLocation.id)}
                                    >
                                      {workLocationExpanded ? '-' : '+'}
                                    </button>
                                    <input
                                      type="checkbox"
                                      checked={selection.WORK_LOCATION.has(workLocation.id)}
                                      onChange={(e) => toggleSelection('WORK_LOCATION', workLocation.id, e.target.checked)}
                                    />
                                    <span>{workLocation.name}</span>
                                  </div>

                                  {workLocationExpanded ? (
                                    <div className="ml-8 mt-1 space-y-1">
                                      {workLocation.departments.map((department, departmentIndex) => {
                                        const departmentExpanded = expanded.has(keyOf('DEPARTMENT', department.id));
                                        const departmentConnector = departmentIndex === workLocation.departments.length - 1 ? '└─' : '├─';
                                        return (
                                          <div key={department.id}>
                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                              <span className="w-5 text-slate-400">{departmentConnector}</span>
                                              <button
                                                type="button"
                                                className="w-5 text-left text-slate-500"
                                                onClick={() => toggleExpanded('DEPARTMENT', department.id)}
                                              >
                                                {departmentExpanded ? '-' : '+'}
                                              </button>
                                              <input
                                                type="checkbox"
                                                checked={selection.DEPARTMENT.has(department.id)}
                                                onChange={(e) => toggleSelection('DEPARTMENT', department.id, e.target.checked)}
                                              />
                                              <span>{department.name}</span>
                                            </div>

                                            {departmentExpanded ? (
                                              <div className="ml-8 mt-1 space-y-1">
                                                {department.areas.map((area, areaIndex) => {
                                                  const areaSelected = selectedArea?.area_id === area.id;
                                                  const areaConnector = areaIndex === department.areas.length - 1 ? '└─' : '├─';
                                                  return (
                                                    <div key={area.id} className={`rounded-md p-1 ${areaSelected ? 'bg-sky-50' : ''}`}>
                                                      <div className="flex items-center gap-2 text-sm text-slate-700">
                                                        <span className="w-5 text-slate-400">{areaConnector}</span>
                                                        <input
                                                          type="checkbox"
                                                          checked={selection.AREA.has(area.id)}
                                                          onChange={(e) => toggleSelection('AREA', area.id, e.target.checked)}
                                                        />
                                                        <button
                                                          type="button"
                                                          className={`text-left hover:underline ${areaSelected ? 'font-medium text-sky-700' : ''}`}
                                                          onClick={() => selectAreaContext(company, workLocation, department, area)}
                                                        >
                                                          {area.name}
                                                        </button>
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            ) : null}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm font-semibold text-slate-800">Contexto seleccionado</div>
            {!selectedArea ? (
              <div className="text-xs text-slate-500">Selecciona un Area del arbol para gestionar centros de costo y grupos de trabajo.</div>
            ) : (
              <div className="text-xs text-slate-600">
                <div>Empresa: <span className="font-medium text-slate-800">{selectedArea.company_name}</span></div>
                <div>Localizacion: <span className="font-medium text-slate-800">{selectedArea.work_location_name}</span></div>
                <div>Departamento: <span className="font-medium text-slate-800">{selectedArea.department_name}</span></div>
                <div>Area: <span className="font-medium text-slate-800">{selectedArea.area_name}</span></div>
              </div>
            )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">Centros de costo</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs text-sky-700 hover:underline disabled:text-slate-400"
                  disabled={!selectedArea || selectedArea.cost_centers.length === 0}
                  onClick={() => selectedArea && setAllSelection('COST_CENTER', selectedArea.cost_centers.map((x) => x.id), true)}
                >
                  Marcar todos
                </button>
                <button
                  type="button"
                  className="text-xs text-sky-700 hover:underline disabled:text-slate-400"
                  disabled={!selectedArea || selectedArea.cost_centers.length === 0}
                  onClick={() => selectedArea && setAllSelection('COST_CENTER', selectedArea.cost_centers.map((x) => x.id), false)}
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
              {!selectedArea ? (
                <div className="text-xs text-slate-500">Sin contexto seleccionado.</div>
              ) : selectedArea.cost_centers.length === 0 ? (
                <div className="text-xs text-slate-500">No hay centros de costo para el area actual.</div>
              ) : (
                selectedArea.cost_centers.map((row) => (
                  <label key={row.id} className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selection.COST_CENTER.has(row.id)}
                      onChange={(e) => toggleSelection('COST_CENTER', row.id, e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>{row.name}</span>
                  </label>
                ))
              )}
            </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">Grupos de trabajo</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs text-sky-700 hover:underline disabled:text-slate-400"
                  disabled={!selectedArea || selectedArea.work_groups.length === 0}
                  onClick={() => selectedArea && setAllSelection('WORK_GROUP', selectedArea.work_groups.map((x) => x.id), true)}
                >
                  Marcar todos
                </button>
                <button
                  type="button"
                  className="text-xs text-sky-700 hover:underline disabled:text-slate-400"
                  disabled={!selectedArea || selectedArea.work_groups.length === 0}
                  onClick={() => selectedArea && setAllSelection('WORK_GROUP', selectedArea.work_groups.map((x) => x.id), false)}
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
              {!selectedArea ? (
                <div className="text-xs text-slate-500">Sin contexto seleccionado.</div>
              ) : selectedArea.work_groups.length === 0 ? (
                <div className="text-xs text-slate-500">No hay grupos de trabajo para el area actual.</div>
              ) : (
                selectedArea.work_groups.map((row) => (
                  <label key={row.id} className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selection.WORK_GROUP.has(row.id)}
                      onChange={(e) => toggleSelection('WORK_GROUP', row.id, e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>{row.name}</span>
                  </label>
                ))
              )}
            </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">Perfiles</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs text-sky-700 hover:underline disabled:text-slate-400"
                  disabled={!selectedArea || selectedArea.employee_profiles.length === 0}
                  onClick={() => selectedArea && setAllSelection('EMPLOYEE_PROFILE', selectedArea.employee_profiles.map((x) => x.id), true)}
                >
                  Marcar todos
                </button>
                <button
                  type="button"
                  className="text-xs text-sky-700 hover:underline disabled:text-slate-400"
                  disabled={!selectedArea || selectedArea.employee_profiles.length === 0}
                  onClick={() => selectedArea && setAllSelection('EMPLOYEE_PROFILE', selectedArea.employee_profiles.map((x) => x.id), false)}
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
              {!selectedArea ? (
                <div className="text-xs text-slate-500">Sin contexto seleccionado.</div>
              ) : selectedArea.employee_profiles.length === 0 ? (
                <div className="text-xs text-slate-500">No hay perfiles para el area actual.</div>
              ) : (
                selectedArea.employee_profiles.map((row) => (
                  <label key={row.id} className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selection.EMPLOYEE_PROFILE.has(row.id)}
                      onChange={(e) => toggleSelection('EMPLOYEE_PROFILE', row.id, e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>{row.name}</span>
                  </label>
                ))
              )}
            </div>
            </div>
          </div>
        </div>
      </div>

      {isLoadingTree ? <div className="text-xs text-slate-500">Actualizando arbol...</div> : null}
    </div>
  );
}

