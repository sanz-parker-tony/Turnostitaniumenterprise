'use client';

import { buildApiUrl } from '../../../utils/api-config';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, Save, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { publicApiToken } from '@/utils/backend/info';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import SystemAdminPageHeader from '@/components/shared/SystemAdminPageHeader';
import HeaderInfoTips from '@/components/shared/HeaderInfoTips';

type RoleRow = {
  id: string;
  role_key: string;
  role_name: string;
  role_scope: string;
};

type ScreenActionRow = {
  screen_action_id: string;
  ui_element_key: string | null;
  screen_id: string;
  screen_key: string;
  screen_name: string;
  screen_sort_order: number;
  menu_label: string;
  menu_group_key: string;
  menu_group_name: string;
  menu_group_sort_order: number;
  action_id: string;
  action_key: string;
  action_name: string;
};

type PermissionRow = {
  id: string;
  screen_action_id: string;
  is_allowed: boolean;
  is_active: boolean;
};

type GroupedScreen = {
  screen_id: string;
  screen_key: string;
  screen_name: string;
  screen_sort_order: number;
  menu_group_key: string;
  menu_group_name: string;
  menu_group_sort_order: number;
  actions: ScreenActionRow[];
};

const API_BASE = buildApiUrl('/security-role-permissions');

export default function SecurityRolePermissionsManagement() {
  const { session } = useAuth();
  const token = session?.access_token || publicApiToken;

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [screenActions, setScreenActions] = useState<ScreenActionRow[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [search, setSearch] = useState('');
  const [filterMenuGroupKey, setFilterMenuGroupKey] = useState('');
  const [filterScreenId, setFilterScreenId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localPerms, setLocalPerms] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);
  const [expandedScreens, setExpandedScreens] = useState<Set<string>>(new Set());
  const [selectedUnauthorizedScreens, setSelectedUnauthorizedScreens] = useState<Set<string>>(new Set());
  const [selectedAuthorizedScreens, setSelectedAuthorizedScreens] = useState<Set<string>>(new Set());

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  async function authFetch(path: string, init?: RequestInit): Promise<Response> {
    if (!token) throw new Error('Sesion no disponible');
    return fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...authHeaders(),
        ...(init?.headers || {}),
      },
    });
  }

  async function loadCatalogs() {
    setIsLoading(true);
    try {
      const [rolesRes, saRes] = await Promise.all([
        authFetch('/catalogs/roles'),
        authFetch('/catalogs/screen-actions'),
      ]);

      const [rolesPayload, saPayload] = await Promise.all([rolesRes.json(), saRes.json()]);
      if (!rolesRes.ok) throw new Error(rolesPayload?.error || 'No se pudo cargar roles');
      if (!saRes.ok) throw new Error(saPayload?.error || 'No se pudo cargar acciones de pantalla');

      const loadedRoles = (rolesPayload.roles || []) as RoleRow[];
      const loadedScreenActions = (saPayload.screen_actions || []) as ScreenActionRow[];

      setRoles(loadedRoles);
      setScreenActions(loadedScreenActions);
      if (!selectedRoleId && loadedRoles.length > 0) setSelectedRoleId(loadedRoles[0].id);
    } catch (error: any) {
      toast.error(error?.message || 'Error cargando catalogos');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPermissions(roleId: string) {
    if (!roleId) {
      setLocalPerms({});
      setDirty(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await authFetch(`/${roleId}/permissions`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar permisos');

      const map: Record<string, boolean> = {};
      ((payload.permissions || []) as PermissionRow[]).forEach((permission) => {
        map[permission.screen_action_id] = permission.is_allowed;
      });
      setLocalPerms(map);
      setDirty(false);
      setSelectedAuthorizedScreens(new Set());
      setSelectedUnauthorizedScreens(new Set());
    } catch (error: any) {
      toast.error(error?.message || 'Error cargando permisos');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCatalogs();
  }, [token]);

  useEffect(() => {
    if (!selectedRoleId) return;
    void loadPermissions(selectedRoleId);
  }, [selectedRoleId]);

  const menuGroupOptions = useMemo(() => {
    const seen = new Map<string, { key: string; name: string; sort: number }>();
    for (const row of screenActions) {
      if (!seen.has(row.menu_group_key)) {
        seen.set(row.menu_group_key, {
          key: row.menu_group_key,
          name: row.menu_group_name,
          sort: row.menu_group_sort_order,
        });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  }, [screenActions]);

  const screenOptions = useMemo(() => {
    const base = filterMenuGroupKey ? screenActions.filter((row) => row.menu_group_key === filterMenuGroupKey) : screenActions;
    const seen = new Map<string, { id: string; name: string; sort: number }>();
    for (const row of base) {
      if (!seen.has(row.screen_id)) {
        seen.set(row.screen_id, {
          id: row.screen_id,
          name: row.screen_name,
          sort: row.screen_sort_order,
        });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  }, [screenActions, filterMenuGroupKey]);

  const groupedScreens = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, GroupedScreen>();

    for (const row of screenActions) {
      if (filterMenuGroupKey && row.menu_group_key !== filterMenuGroupKey) continue;
      if (filterScreenId && row.screen_id !== filterScreenId) continue;
      if (q) {
        const haystack = `${row.menu_group_name} ${row.screen_name} ${row.screen_key} ${row.action_name} ${row.action_key} ${row.ui_element_key || ''}`.toLowerCase();
        if (!haystack.includes(q)) continue;
      }

      if (!map.has(row.screen_id)) {
        map.set(row.screen_id, {
          screen_id: row.screen_id,
          screen_key: row.screen_key,
          screen_name: row.screen_name,
          screen_sort_order: row.screen_sort_order,
          menu_group_key: row.menu_group_key,
          menu_group_name: row.menu_group_name,
          menu_group_sort_order: row.menu_group_sort_order,
          actions: [],
        });
      }
      map.get(row.screen_id)!.actions.push(row);
    }

    const groups = Array.from(map.values());
    groups.forEach((group) => group.actions.sort((a, b) => a.action_name.localeCompare(b.action_name) || a.action_key.localeCompare(b.action_key)));
    groups.sort((a, b) => {
      if (a.menu_group_sort_order !== b.menu_group_sort_order) return a.menu_group_sort_order - b.menu_group_sort_order;
      if (a.screen_sort_order !== b.screen_sort_order) return a.screen_sort_order - b.screen_sort_order;
      return a.screen_name.localeCompare(b.screen_name);
    });

    return groups;
  }, [screenActions, search, filterMenuGroupKey, filterScreenId]);

  function screenHasPermission(screen: GroupedScreen): boolean {
    return screen.actions.some((action) => localPerms[action.screen_action_id] ?? false);
  }

  const unauthorizedScreens = useMemo(() => groupedScreens.filter((screen) => !screenHasPermission(screen)), [groupedScreens, localPerms]);
  const authorizedScreens = useMemo(() => groupedScreens.filter((screen) => screenHasPermission(screen)), [groupedScreens, localPerms]);
  const allowedActionCount = screenActions.filter((row) => localPerms[row.screen_action_id] ?? false).length;

  useEffect(() => {
    setSelectedUnauthorizedScreens((prev) => {
      const validIds = new Set(unauthorizedScreens.map((screen) => screen.screen_id));
      return new Set(Array.from(prev).filter((id) => validIds.has(id)));
    });
    setSelectedAuthorizedScreens((prev) => {
      const validIds = new Set(authorizedScreens.map((screen) => screen.screen_id));
      return new Set(Array.from(prev).filter((id) => validIds.has(id)));
    });
  }, [authorizedScreens, unauthorizedScreens]);

  useEffect(() => {
    setExpandedScreens((prev) => {
      const validIds = new Set(authorizedScreens.map((screen) => screen.screen_id));
      const next = new Set(Array.from(prev).filter((id) => validIds.has(id)));
      if (next.size === 0 && authorizedScreens.length > 0) next.add(authorizedScreens[0].screen_id);
      return next;
    });
  }, [authorizedScreens]);

  useEffect(() => {
    if (filterScreenId && !screenOptions.some((option) => option.id === filterScreenId)) {
      setFilterScreenId('');
    }
  }, [filterScreenId, screenOptions]);

  function toggleScreenSelection(setter: (value: Set<string>) => void, current: Set<string>, screenId: string) {
    const next = new Set(current);
    if (next.has(screenId)) next.delete(screenId);
    else next.add(screenId);
    setter(next);
  }

  function setScreensAuthorization(screenIds: string[], value: boolean) {
    if (screenIds.length === 0) return;
    const targetIds = new Set(screenIds);
    const updates: Record<string, boolean> = {};
    for (const row of screenActions) {
      if (targetIds.has(row.screen_id)) updates[row.screen_action_id] = value;
    }
    setLocalPerms((prev) => ({ ...prev, ...updates }));
    setDirty(true);
  }

  function authorizeSelectedScreens() {
    setScreensAuthorization(Array.from(selectedUnauthorizedScreens), true);
    setSelectedUnauthorizedScreens(new Set());
  }

  function authorizeAllVisibleScreens() {
    setScreensAuthorization(unauthorizedScreens.map((screen) => screen.screen_id), true);
    setSelectedUnauthorizedScreens(new Set());
  }

  function revokeSelectedScreens() {
    setScreensAuthorization(Array.from(selectedAuthorizedScreens), false);
    setSelectedAuthorizedScreens(new Set());
  }

  function revokeAllVisibleScreens() {
    setScreensAuthorization(authorizedScreens.map((screen) => screen.screen_id), false);
    setSelectedAuthorizedScreens(new Set());
  }

  function togglePermission(screenActionId: string) {
    setLocalPerms((prev) => ({ ...prev, [screenActionId]: !(prev[screenActionId] ?? false) }));
    setDirty(true);
  }

  function toggleScreenAccordion(screenId: string) {
    setExpandedScreens((prev) => {
      const next = new Set(prev);
      if (next.has(screenId)) next.delete(screenId);
      else next.add(screenId);
      return next;
    });
  }

  async function savePermissions() {
    if (!selectedRoleId) return;
    setIsSaving(true);
    try {
      const permissions = screenActions.map((row) => ({
        screen_action_id: row.screen_action_id,
        is_allowed: localPerms[row.screen_action_id] ?? false,
      }));

      const response = await authFetch(`/${selectedRoleId}/permissions/bulk-upsert`, {
        method: 'POST',
        body: JSON.stringify({ permissions }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'No se pudo guardar permisos');

      toast.success(payload?.message || 'Cambios guardados');
      setDirty(false);
      await loadPermissions(selectedRoleId);
    } catch (error: any) {
      toast.error(error?.message || 'Error guardando permisos');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-full flex h-[calc(100vh-140px)] min-h-0 flex-col gap-4">
      <SystemAdminPageHeader
        icon={ShieldCheck}
        title="Autorización por Rol"
        subtitle="Administra pantallas autorizadas y acciones permitidas por rol"
        rightSlot={
          <HeaderInfoTips
            items={[
              {
                title: 'Información',
                text: 'La izquierda muestra pantallas no autorizadas. La derecha muestra pantallas autorizadas y sus acciones.',
                variant: 'info',
              },
              {
                title: 'Consejo',
                text: 'Al pasar una pantalla a autorizadas se habilitan todas sus acciones; luego puedes ajustar acciones individuales.',
                variant: 'tip',
              },
              {
                title: 'Advertencia',
                text: 'Los cambios quedan pendientes hasta presionar Guardar cambios.',
                variant: 'warning',
              },
            ]}
          />
        }
      />

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar pantalla, acción o grupo" />
          </div>
          <select
            className="w-full rounded-md border border-slate-300 p-2 text-sm"
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            disabled={isLoading || isSaving}
          >
            {roles.length === 0 ? <option value="">Sin roles</option> : null}
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.role_name} ({role.role_key})
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 xl:justify-end">
            <Button variant="outline" size="sm" onClick={() => selectedRoleId && void loadPermissions(selectedRoleId)} disabled={isLoading || isSaving || !selectedRoleId}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Recargar
            </Button>
            <Button size="sm" onClick={() => void savePermissions()} disabled={isSaving || isLoading || !selectedRoleId || !dirty}>
              {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar cambios
            </Button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <select
            className="w-full rounded-md border border-slate-300 p-2 text-sm"
            value={filterMenuGroupKey}
            onChange={(e) => {
              setFilterMenuGroupKey(e.target.value);
              setFilterScreenId('');
            }}
            disabled={isLoading || isSaving || menuGroupOptions.length === 0}
          >
            <option value="">Todos los grupos</option>
            {menuGroupOptions.map((group) => (
              <option key={group.key} value={group.key}>
                {group.name}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-md border border-slate-300 p-2 text-sm"
            value={filterScreenId}
            onChange={(e) => setFilterScreenId(e.target.value)}
            disabled={isLoading || isSaving || screenOptions.length === 0}
          >
            <option value="">Todas las pantallas</option>
            {screenOptions.map((screen) => (
              <option key={screen.id} value={screen.id}>
                {screen.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          {`${authorizedScreens.length} pantallas autorizadas · ${unauthorizedScreens.length} no autorizadas · ${allowedActionCount} acciones permitidas`}
          {dirty ? <span className="ml-2 font-semibold text-amber-700">Cambios pendientes</span> : null}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <ScreenList
          title="Pantallas no autorizadas"
          emptyText="No hay pantallas no autorizadas para el filtro actual."
          screens={unauthorizedScreens}
          selected={selectedUnauthorizedScreens}
          onToggle={(screenId) => toggleScreenSelection(setSelectedUnauthorizedScreens, selectedUnauthorizedScreens, screenId)}
          showActions={false}
          localPerms={localPerms}
          expandedScreens={expandedScreens}
          onToggleExpanded={toggleScreenAccordion}
          onToggleAction={togglePermission}
          disabled={isLoading || isSaving}
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <Button variant="outline" onClick={authorizeAllVisibleScreens} disabled={isLoading || isSaving || unauthorizedScreens.length === 0}>{'>>'}</Button>
          <Button variant="outline" onClick={authorizeSelectedScreens} disabled={isLoading || isSaving || selectedUnauthorizedScreens.size === 0}>{'>'}</Button>
          <Button variant="outline" onClick={revokeSelectedScreens} disabled={isLoading || isSaving || selectedAuthorizedScreens.size === 0}>{'<'}</Button>
          <Button variant="outline" onClick={revokeAllVisibleScreens} disabled={isLoading || isSaving || authorizedScreens.length === 0}>{'<<'}</Button>
        </div>

        <ScreenList
          title="Pantallas autorizadas"
          emptyText="No hay pantallas autorizadas para el filtro actual."
          screens={authorizedScreens}
          selected={selectedAuthorizedScreens}
          onToggle={(screenId) => toggleScreenSelection(setSelectedAuthorizedScreens, selectedAuthorizedScreens, screenId)}
          showActions
          localPerms={localPerms}
          expandedScreens={expandedScreens}
          onToggleExpanded={toggleScreenAccordion}
          onToggleAction={togglePermission}
          disabled={isLoading || isSaving}
        />
      </div>
    </div>
  );
}

type ScreenListProps = {
  title: string;
  emptyText: string;
  screens: GroupedScreen[];
  selected: Set<string>;
  onToggle: (screenId: string) => void;
  showActions: boolean;
  localPerms: Record<string, boolean>;
  expandedScreens: Set<string>;
  onToggleExpanded: (screenId: string) => void;
  onToggleAction: (screenActionId: string) => void;
  disabled: boolean;
};

function ScreenList({
  title,
  emptyText,
  screens,
  selected,
  onToggle,
  showActions,
  localPerms,
  expandedScreens,
  onToggleExpanded,
  onToggleAction,
  disabled,
}: ScreenListProps) {
  return (
    <div className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-800">
        <span>{title}</span>
        <span className="text-xs font-normal text-slate-500">{screens.length}</span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {screens.map((screen) => {
          const isOpen = expandedScreens.has(screen.screen_id);
          const allowedInScreen = screen.actions.filter((action) => localPerms[action.screen_action_id] ?? false).length;
          return (
            <div key={screen.screen_id} className="rounded-md border border-slate-200 bg-white">
              <div className="flex items-start gap-2 px-3 py-2">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={selected.has(screen.screen_id)}
                  onChange={() => onToggle(screen.screen_id)}
                  disabled={disabled}
                />
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => showActions && onToggleExpanded(screen.screen_id)}>
                  <div className="flex min-w-0 items-center gap-2">
                    {showActions ? (isOpen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />) : null}
                    <span className="truncate text-sm font-semibold text-slate-800">{screen.menu_group_name} · {screen.screen_name}</span>
                  </div>
                  <div className="mt-1 truncate text-xs text-slate-500">{screen.screen_key}</div>
                </button>
                {showActions ? <span className="text-xs text-slate-500">{allowedInScreen}/{screen.actions.length}</span> : null}
              </div>

              {showActions && isOpen ? (
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {screen.actions.map((action) => {
                    const allowed = localPerms[action.screen_action_id] ?? false;
                    return (
                      <label key={action.screen_action_id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={allowed}
                          onChange={() => onToggleAction(action.screen_action_id)}
                          disabled={disabled}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-700">{action.action_name}</span>
                          <span className="block truncate text-xs text-slate-500">
                            {action.action_key}
                            {action.ui_element_key ? ` · ${action.ui_element_key}` : ''}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
        {screens.length === 0 ? <div className="rounded-md border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">{emptyText}</div> : null}
      </div>
    </div>
  );
}
