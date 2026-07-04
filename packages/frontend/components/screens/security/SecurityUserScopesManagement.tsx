'use client';

import { buildApiUrl } from '../../../utils/api-config';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AlertTriangle, Plus, RefreshCw, Save, ShieldCheck, Trash2 } from 'lucide-react';
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

type ScopeRule = {
  id?: string;
  company_id: string;
  company_name?: string | null;
  work_location_id: string | null;
  work_location_name?: string | null;
  department_id: string | null;
  department_name?: string | null;
  area_id: string | null;
  area_name?: string | null;
  cost_center_id: string | null;
  cost_center_name?: string | null;
  work_group_id: string | null;
  work_group_name?: string | null;
  employee_profile_id: string | null;
  employee_profile_name?: string | null;
};

type ScopeRuleForm = {
  company_id: string;
  work_location_id: string;
  department_id: string;
  area_id: string;
  cost_center_id: string;
  work_group_id: string;
  employee_profile_id: string;
};

type ScopeRemovalConflict = {
  company_id: string;
  company_name: string | null;
  assigned_employee_count: number;
  employees: Array<{
    employee_id: string;
    employee_code: string | null;
    employee_name: string | null;
    employee_lastname: string | null;
  }>;
};

type PendingCascadeConfirmation = {
  rules: ScopeRuleForm[];
  message: string;
  conflicts: ScopeRemovalConflict[];
};

type PendingDraftRemovalConfirmation = {
  index: number;
  companyIds: string[];
  conflicts: ScopeRemovalConflict[];
};

const API_BASE = buildApiUrl('/security-user-scopes');

const emptyRuleForm: ScopeRuleForm = {
  company_id: '',
  work_location_id: '',
  department_id: '',
  area_id: '',
  cost_center_id: '',
  work_group_id: '',
  employee_profile_id: '',
};

function labelTarget(target: Target): string {
  const name = target.display_name?.trim() || target.username;
  return `${name} (${target.role_key})`;
}

function normalizeId(value: string | null | undefined): string {
  return String(value || '').trim();
}

function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  return Array.from(new Map(rows.filter((row) => row.id).map((row) => [row.id, row])).values());
}

function optionLabel(row: TreeLeafNode | null | undefined): string {
  return row?.name || row?.id || '-';
}

function toRulePayload(rule: ScopeRuleForm) {
  return {
    company_id: normalizeId(rule.company_id),
    work_location_id: normalizeId(rule.work_location_id) || null,
    department_id: normalizeId(rule.department_id) || null,
    area_id: normalizeId(rule.area_id) || null,
    cost_center_id: normalizeId(rule.cost_center_id) || null,
    work_group_id: normalizeId(rule.work_group_id) || null,
    employee_profile_id: normalizeId(rule.employee_profile_id) || null,
  };
}

function ruleKey(rule: ScopeRuleForm | ScopeRule): string {
  return [
    rule.company_id,
    rule.work_location_id || '',
    rule.department_id || '',
    rule.area_id || '',
    rule.cost_center_id || '',
    rule.work_group_id || '',
    rule.employee_profile_id || '',
  ].join('::');
}

function displayRule(rule: ScopeRule): string {
  const parts = [
    rule.company_name || 'Empresa',
    rule.work_location_name || 'Todas las localizaciones',
    rule.department_name || 'Todos los departamentos',
    rule.area_name || 'Todas las áreas',
  ];

  const extra = [
    rule.cost_center_name ? `CC: ${rule.cost_center_name}` : '',
    rule.work_group_name ? `GT: ${rule.work_group_name}` : '',
    rule.employee_profile_name ? `Perfil: ${rule.employee_profile_name}` : '',
  ].filter(Boolean);

  return extra.length > 0 ? `${parts.join(' > ')} · ${extra.join(' · ')}` : parts.join(' > ');
}

function employeeConflictLabel(employee: ScopeRemovalConflict['employees'][number]): string {
  const fullName = `${employee.employee_lastname || ''} ${employee.employee_name || ''}`.trim();
  return `${fullName || employee.employee_id}${employee.employee_code ? ` (${employee.employee_code})` : ''}`;
}

function findCompany(tree: TreeCompanyNode[], companyId: string): TreeCompanyNode | null {
  return tree.find((company) => company.id === companyId) || null;
}

function getWorkLocations(tree: TreeCompanyNode[], form: ScopeRuleForm): TreeWorkLocationNode[] {
  const company = findCompany(tree, form.company_id);
  return company?.work_locations || [];
}

function getDepartments(tree: TreeCompanyNode[], form: ScopeRuleForm): TreeDepartmentNode[] {
  const company = findCompany(tree, form.company_id);
  if (!company) return [];

  const workLocations = form.work_location_id
    ? company.work_locations.filter((workLocation) => workLocation.id === form.work_location_id)
    : company.work_locations;

  return uniqueById(workLocations.flatMap((workLocation) => workLocation.departments));
}

function getAreas(tree: TreeCompanyNode[], form: ScopeRuleForm): TreeAreaNode[] {
  const departments = getDepartments(tree, form).filter((department) =>
    form.department_id ? department.id === form.department_id : true
  );
  return uniqueById(departments.flatMap((department) => department.areas));
}

function getSelectedArea(tree: TreeCompanyNode[], form: ScopeRuleForm): TreeAreaNode | null {
  if (!form.area_id) return null;
  return getAreas(tree, form).find((area) => area.id === form.area_id) || null;
}

export default function SecurityUserScopesManagement() {
  const { session } = useAuth();
  const token = session?.access_token || '';

  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedUserRoleId, setSelectedUserRoleId] = useState('');
  const [tree, setTree] = useState<TreeCompanyNode[]>([]);
  const [rules, setRules] = useState<ScopeRule[]>([]);
  const [draftRules, setDraftRules] = useState<ScopeRuleForm[]>([]);
  const [form, setForm] = useState<ScopeRuleForm>(emptyRuleForm);
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingRemoval, setIsCheckingRemoval] = useState(false);
  const [pendingCascadeConfirmation, setPendingCascadeConfirmation] = useState<PendingCascadeConfirmation | null>(null);
  const [pendingDraftRemovalConfirmation, setPendingDraftRemovalConfirmation] = useState<PendingDraftRemovalConfirmation | null>(null);
  const [confirmedCascadeCompanyIds, setConfirmedCascadeCompanyIds] = useState<Set<string>>(new Set());

  const companies = tree;
  const workLocationOptions = useMemo(() => getWorkLocations(tree, form), [tree, form]);
  const departmentOptions = useMemo(() => getDepartments(tree, form), [tree, form]);
  const areaOptions = useMemo(() => getAreas(tree, form), [tree, form]);
  const selectedArea = useMemo(() => getSelectedArea(tree, form), [tree, form]);

  const costCenterOptions = selectedArea?.cost_centers || [];
  const workGroupOptions = selectedArea?.work_groups || [];
  const employeeProfileOptions = selectedArea?.employee_profiles || [];

  useEffect(() => {
    void loadTargets();
  }, [token]);

  useEffect(() => {
    if (!selectedUserRoleId) return;
    void loadScopeRulesData(selectedUserRoleId);
  }, [selectedUserRoleId]);

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

  async function loadScopeRulesData(userRoleId: string) {
    setIsLoadingData(true);
    try {
      const [treeResponse, rulesResponse] = await Promise.all([
        authorizedFetch('/catalogs/tree'),
        authorizedFetch(`/${userRoleId}/scope-rules`),
      ]);
      const treePayload = await treeResponse.json();
      const rulesPayload = await rulesResponse.json();
      if (!treeResponse.ok) throw new Error(treePayload?.error || 'No se pudo cargar estructura organizacional');
      if (!rulesResponse.ok) throw new Error(rulesPayload?.error || 'No se pudo cargar reglas de alcance');

      const nextTree = (treePayload.tree || []) as TreeCompanyNode[];
      const nextRules = (rulesPayload.rules || []) as ScopeRule[];
      setTree(nextTree);
      setRules(nextRules);
      setDraftRules(
        nextRules.map((rule) => ({
          company_id: rule.company_id,
          work_location_id: rule.work_location_id || '',
          department_id: rule.department_id || '',
          area_id: rule.area_id || '',
          cost_center_id: rule.cost_center_id || '',
          work_group_id: rule.work_group_id || '',
          employee_profile_id: rule.employee_profile_id || '',
        }))
      );
      setForm(emptyRuleForm);
      setPendingCascadeConfirmation(null);
      setPendingDraftRemovalConfirmation(null);
      setConfirmedCascadeCompanyIds(new Set());
    } catch (error: any) {
      toast.error(error?.message || 'Error cargando reglas de alcance');
    } finally {
      setIsLoadingData(false);
    }
  }

  function updateForm(patch: Partial<ScopeRuleForm>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function addDraftRule() {
    const payload = toRulePayload(form);
    if (!payload.company_id) {
      toast.error('Selecciona una empresa para crear la regla');
      return;
    }

    const nextRule: ScopeRuleForm = {
      company_id: payload.company_id,
      work_location_id: payload.work_location_id || '',
      department_id: payload.department_id || '',
      area_id: payload.area_id || '',
      cost_center_id: payload.cost_center_id || '',
      work_group_id: payload.work_group_id || '',
      employee_profile_id: payload.employee_profile_id || '',
    };

    if (draftRules.some((rule) => ruleKey(rule) === ruleKey(nextRule))) {
      toast.error('La regla ya existe en la lista');
      return;
    }

    setDraftRules((prev) => [...prev, nextRule]);
    setForm({ ...emptyRuleForm, company_id: form.company_id });
  }

  function removeDraftRuleAt(index: number) {
    setDraftRules((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }

  function isPersistedRule(rule: ScopeRuleForm): boolean {
    return rules.some((savedRule) => ruleKey(savedRule) === ruleKey(rule));
  }

  function wouldRemoveCompanyFromDraft(rule: ScopeRuleForm, index: number): boolean {
    return !draftRules.some((candidate, currentIndex) => (
      currentIndex !== index && candidate.company_id === rule.company_id
    ));
  }

  async function requestRemoveDraftRule(index: number) {
    const rule = draftRules[index];
    if (!rule) return;

    if (!selectedUserRoleId || !isPersistedRule(rule) || !wouldRemoveCompanyFromDraft(rule, index)) {
      removeDraftRuleAt(index);
      return;
    }

    setIsCheckingRemoval(true);
    try {
      const response = await authorizedFetch(`/${selectedUserRoleId}/scope-rules/removal-preview`, {
        method: 'POST',
        body: JSON.stringify({ company_ids: [rule.company_id] }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo validar la remoción del alcance');

      const conflicts = (payload?.conflicts || []) as ScopeRemovalConflict[];
      if (conflicts.length === 0) {
        removeDraftRuleAt(index);
        return;
      }

      setPendingDraftRemovalConfirmation({
        index,
        companyIds: conflicts.map((conflict) => conflict.company_id),
        conflicts,
      });
    } catch (error: any) {
      toast.error(error?.message || 'Error validando remoción del alcance');
    } finally {
      setIsCheckingRemoval(false);
    }
  }

  function confirmDraftRuleRemoval() {
    if (!pendingDraftRemovalConfirmation) return;
    removeDraftRuleAt(pendingDraftRemovalConfirmation.index);
    setConfirmedCascadeCompanyIds((prev) => {
      const next = new Set(prev);
      pendingDraftRemovalConfirmation.companyIds.forEach((companyId) => next.add(companyId));
      return next;
    });
    setPendingDraftRemovalConfirmation(null);
  }

  function findRuleDisplay(rule: ScopeRuleForm): ScopeRule {
    const company = findCompany(tree, rule.company_id);
    const workLocation = getWorkLocations(tree, rule).find((row) => row.id === rule.work_location_id) || null;
    const department = getDepartments(tree, rule).find((row) => row.id === rule.department_id) || null;
    const area = getAreas(tree, rule).find((row) => row.id === rule.area_id) || null;
    const costCenter = area?.cost_centers.find((row) => row.id === rule.cost_center_id) || null;
    const workGroup = area?.work_groups.find((row) => row.id === rule.work_group_id) || null;
    const employeeProfile = area?.employee_profiles.find((row) => row.id === rule.employee_profile_id) || null;

    return {
      company_id: rule.company_id,
      company_name: company?.name || null,
      work_location_id: rule.work_location_id || null,
      work_location_name: workLocation?.name || null,
      department_id: rule.department_id || null,
      department_name: department?.name || null,
      area_id: rule.area_id || null,
      area_name: area?.name || null,
      cost_center_id: rule.cost_center_id || null,
      cost_center_name: costCenter?.name || null,
      work_group_id: rule.work_group_id || null,
      work_group_name: workGroup?.name || null,
      employee_profile_id: rule.employee_profile_id || null,
      employee_profile_name: employeeProfile?.name || null,
    };
  }

  function getRemovedPersistedCompanyIds(rulesToSave: ScopeRuleForm[]): string[] {
    const currentCompanyIds = new Set(rules.map((rule) => rule.company_id).filter(Boolean));
    const nextCompanyIds = new Set(rulesToSave.map((rule) => rule.company_id).filter(Boolean));
    return Array.from(currentCompanyIds).filter((companyId) => !nextCompanyIds.has(companyId));
  }

  async function submitRules(options?: { cascadeCompanyIds?: string[]; rulesToSave?: ScopeRuleForm[] }) {
    if (!selectedUserRoleId) {
      toast.error('Selecciona un usuario objetivo');
      return;
    }

    const rulesToSave = options?.rulesToSave || draftRules;
    const removedPersistedCompanyIds = getRemovedPersistedCompanyIds(rulesToSave);
    const cascadeCompanyIds = options?.cascadeCompanyIds || Array.from(confirmedCascadeCompanyIds)
      .filter((companyId) => removedPersistedCompanyIds.includes(companyId));

    setIsSaving(true);
    try {
      const response = await authorizedFetch(`/${selectedUserRoleId}/scope-rules`, {
        method: 'PUT',
        body: JSON.stringify({
          rules: rulesToSave.map(toRulePayload),
          cascade_company_ids: cascadeCompanyIds,
        }),
      });
      const payload = await response.json();
      if (response.status === 409 && payload?.requires_confirmation) {
        setPendingCascadeConfirmation({
          rules: rulesToSave,
          message: payload?.message || 'Existen empleados asignados en empresas removidas.',
          conflicts: (payload?.conflicts || []) as ScopeRemovalConflict[],
        });
        return;
      }
      if (!response.ok) throw new Error(payload?.error || 'No se pudieron guardar las reglas');
      const revoked = Number(payload?.revoked_employee_assignments || 0);
      toast.success(
        revoked > 0
          ? `Reglas guardadas. Se removieron ${revoked} empleados asignados.`
          : 'Reglas de alcance guardadas correctamente'
      );
      setPendingCascadeConfirmation(null);
      await loadScopeRulesData(selectedUserRoleId);
    } catch (error: any) {
      toast.error(error?.message || 'Error guardando reglas de alcance');
    } finally {
      setIsSaving(false);
    }
  }

  async function saveRules() {
    await submitRules();
  }

  async function confirmCascadeRemoval() {
    if (!pendingCascadeConfirmation) return;
    await submitRules({
      cascadeCompanyIds: pendingCascadeConfirmation.conflicts.map((conflict) => conflict.company_id),
      rulesToSave: pendingCascadeConfirmation.rules,
    });
  }

  return (
    <div className="p-6 max-w-full space-y-5">
      {pendingCascadeConfirmation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <h3 className="text-base font-semibold text-amber-900">Confirmar remoción de empresa y empleados</h3>
                <p className="mt-1 text-sm text-amber-800">{pendingCascadeConfirmation.message}</p>
              </div>
            </div>
            <div className="max-h-[55vh] space-y-4 overflow-y-auto p-4">
              {pendingCascadeConfirmation.conflicts.map((conflict) => (
                <div key={conflict.company_id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-slate-800">{conflict.company_name || conflict.company_id}</div>
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                      {conflict.assigned_employee_count} empleado{conflict.assigned_employee_count === 1 ? '' : 's'} se removerán
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-slate-600 md:grid-cols-2">
                    {conflict.employees.slice(0, 40).map((employee) => (
                      <div key={employee.employee_id} className="truncate rounded bg-slate-50 px-2 py-1">
                        {employeeConflictLabel(employee)}
                      </div>
                    ))}
                  </div>
                  {conflict.employees.length > 40 ? (
                    <div className="mt-2 text-xs text-slate-500">
                      Y {conflict.employees.length - 40} empleado{conflict.employees.length - 40 === 1 ? '' : 's'} adicional{conflict.employees.length - 40 === 1 ? '' : 'es'}.
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t bg-slate-50 p-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingCascadeConfirmation(null)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => void confirmCascadeRemoval()}
                disabled={isSaving}
              >
                {isSaving ? 'Removiendo...' : 'Remover empresa y empleados'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDraftRemovalConfirmation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <h3 className="text-base font-semibold text-amber-900">Quitar alcance del borrador</h3>
                <p className="mt-1 text-sm text-amber-800">
                  Esta empresa ya tiene empleados autorizados. Si quitas el alcance y luego guardas, esos empleados también se removerán del usuario.
                </p>
              </div>
            </div>
            <div className="max-h-[55vh] space-y-4 overflow-y-auto p-4">
              {pendingDraftRemovalConfirmation.conflicts.map((conflict) => (
                <div key={conflict.company_id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-slate-800">{conflict.company_name || conflict.company_id}</div>
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                      {conflict.assigned_employee_count} empleado{conflict.assigned_employee_count === 1 ? '' : 's'} se removerán al guardar
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-1 text-xs text-slate-600 md:grid-cols-2">
                    {conflict.employees.slice(0, 40).map((employee) => (
                      <div key={employee.employee_id} className="truncate rounded bg-slate-50 px-2 py-1">
                        {employeeConflictLabel(employee)}
                      </div>
                    ))}
                  </div>
                  {conflict.employees.length > 40 ? (
                    <div className="mt-2 text-xs text-slate-500">
                      Y {conflict.employees.length - 40} empleado{conflict.employees.length - 40 === 1 ? '' : 's'} adicional{conflict.employees.length - 40 === 1 ? '' : 'es'}.
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t bg-slate-50 p-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingDraftRemovalConfirmation(null)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={confirmDraftRuleRemoval}
                disabled={isSaving}
              >
                Quitar de la lista
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <SystemAdminPageHeader
        icon={ShieldCheck}
        title="Alcances por Usuario"
        subtitle="Configura reglas explícitas de alcance sobre la estructura de employee_companies"
        rightSlot={
          <HeaderInfoTips
            items={[
              {
                title: 'Reglas de alcance',
                text: 'Cada fila define una combinación permitida. Los campos vacíos significan Todos dentro del nivel anterior.',
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
            onChange={(event) => setSelectedUserRoleId(event.target.value)}
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
              onClick={() => selectedUserRoleId && void loadScopeRulesData(selectedUserRoleId)}
              disabled={!selectedUserRoleId || isLoadingData || isSaving}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => void saveRules()}
              disabled={!selectedUserRoleId || isLoadingData || isSaving}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Guardando...' : 'Guardar Alcance'}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-slate-800">Nueva regla de alcance</h2>
          <p className="text-xs text-slate-500">
            Empresa es obligatoria. Los campos no seleccionados aplican como “Todos” dentro del nivel anterior.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SelectField
            label="Empresa *"
            value={form.company_id}
            onChange={(value) =>
              updateForm({
                company_id: value,
                work_location_id: '',
                department_id: '',
                area_id: '',
                cost_center_id: '',
                work_group_id: '',
                employee_profile_id: '',
              })
            }
            placeholder="-- Seleccionar empresa --"
            options={companies}
          />
          <SelectField
            label="Localización"
            value={form.work_location_id}
            onChange={(value) =>
              updateForm({
                work_location_id: value,
                department_id: '',
                area_id: '',
                cost_center_id: '',
                work_group_id: '',
                employee_profile_id: '',
              })
            }
            placeholder="Todas las localizaciones"
            options={workLocationOptions}
            disabled={!form.company_id}
          />
          <SelectField
            label="Departamento"
            value={form.department_id}
            onChange={(value) =>
              updateForm({
                department_id: value,
                area_id: '',
                cost_center_id: '',
                work_group_id: '',
                employee_profile_id: '',
              })
            }
            placeholder="Todos los departamentos"
            options={departmentOptions}
            disabled={!form.company_id}
          />
          <SelectField
            label="Área"
            value={form.area_id}
            onChange={(value) =>
              updateForm({
                area_id: value,
                cost_center_id: '',
                work_group_id: '',
                employee_profile_id: '',
              })
            }
            placeholder="Todas las áreas"
            options={areaOptions}
            disabled={!form.company_id}
          />
          <SelectField
            label="Centro de costo"
            value={form.cost_center_id}
            onChange={(value) => updateForm({ cost_center_id: value })}
            placeholder="Todos los centros"
            options={costCenterOptions}
            disabled={!selectedArea}
          />
          <SelectField
            label="Grupo de trabajo"
            value={form.work_group_id}
            onChange={(value) => updateForm({ work_group_id: value })}
            placeholder="Todos los grupos"
            options={workGroupOptions}
            disabled={!selectedArea}
          />
          <SelectField
            label="Perfil"
            value={form.employee_profile_id}
            onChange={(value) => updateForm({ employee_profile_id: value })}
            placeholder="Todos los perfiles"
            options={employeeProfileOptions}
            disabled={!selectedArea}
          />
          <div className="flex items-end">
            <Button
              type="button"
              className="w-full bg-sky-600 text-white hover:bg-sky-700"
              onClick={addDraftRule}
              disabled={isLoadingData}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar regla
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Reglas configuradas</h2>
            <p className="text-xs text-slate-500">
              {draftRules.length} regla{draftRules.length === 1 ? '' : 's'} pendiente{draftRules.length === 1 ? '' : 's'} de guardar.
            </p>
          </div>
          {rules.length > 0 ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              Guardadas actualmente: {rules.length}
            </span>
          ) : null}
        </div>

        <div className="overflow-auto rounded-md border">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Regla</th>
                <th className="w-[110px] px-3 py-2 text-center font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingData ? (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-slate-500">
                    Cargando reglas...
                  </td>
                </tr>
              ) : draftRules.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-slate-500">
                    No hay reglas configuradas para el usuario seleccionado.
                  </td>
                </tr>
              ) : (
                draftRules.map((rule, index) => {
                  const display = findRuleDisplay(rule);
                  return (
                    <tr key={`${ruleKey(rule)}-${index}`} className="border-t">
                      <td className="px-3 py-3 text-slate-700">{displayRule(display)}</td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          onClick={() => void requestRemoveDraftRule(index)}
                          disabled={isCheckingRemoval || isSaving}
                          title="Quitar regla"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  placeholder,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: TreeLeafNode[];
  disabled?: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
