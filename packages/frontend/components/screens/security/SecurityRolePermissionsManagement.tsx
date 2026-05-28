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
  const [filterActionKey, setFilterActionKey] = useState('');
  const [filterPermissionState, setFilterPermissionState] = useState<'all' | 'allowed' | 'denied'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localPerms, setLocalPerms] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);
  const [expandedScreens, setExpandedScreens] = useState<Set<string>>(new Set());

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
      if (!saRes.ok) throw new Error(saPayload?.error || 'No se pudo cargar screen_actions');

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

  const actionOptions = useMemo(() => {
    const base = screenActions.filter((row) => {
      if (filterMenuGroupKey && row.menu_group_key !== filterMenuGroupKey) return false;
      if (filterScreenId && row.screen_id !== filterScreenId) return false;
      return true;
    });
    const seen = new Map<string, string>();
    for (const row of base) {
      if (!seen.has(row.action_key)) seen.set(row.action_key, row.action_name);
    }
    return Array.from(seen.entries())
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [screenActions, filterMenuGroupKey, filterScreenId]);

  const filteredActions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return screenActions.filter((row) => {
      if (filterMenuGroupKey && row.menu_group_key !== filterMenuGroupKey) return false;
      if (filterScreenId && row.screen_id !== filterScreenId) return false;
      if (filterActionKey && row.action_key !== filterActionKey) return false;
      if (filterPermissionState === 'allowed' && !(localPerms[row.screen_action_id] ?? false)) return false;
      if (filterPermissionState === 'denied' && (localPerms[row.screen_action_id] ?? false)) return false;
      if (!q) return true;
      const haystack = `${row.menu_group_name} ${row.screen_name} ${row.screen_key} ${row.action_name} ${row.action_key} ${row.ui_element_key || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [screenActions, search, filterMenuGroupKey, filterScreenId, filterActionKey, filterPermissionState, localPerms]);

  const groupedScreens = useMemo(() => {
    const map = new Map<string, GroupedScreen>();

    for (const row of filteredActions) {
      const key = row.screen_id;
      if (!map.has(key)) {
        map.set(key, {
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
      map.get(key)!.actions.push(row);
    }

    const groups = Array.from(map.values());
    groups.forEach((group) => {
      group.actions.sort((a, b) => a.action_key.localeCompare(b.action_key));
    });

    groups.sort((a, b) => {
      if (a.menu_group_sort_order !== b.menu_group_sort_order) {
        return a.menu_group_sort_order - b.menu_group_sort_order;
      }
      if (a.screen_sort_order !== b.screen_sort_order) {
        return a.screen_sort_order - b.screen_sort_order;
      }
      return a.screen_name.localeCompare(b.screen_name);
    });

    return groups;
  }, [filteredActions]);

  const allowedCount = filteredActions.filter((row) => localPerms[row.screen_action_id] ?? false).length;

  useEffect(() => {
    setExpandedScreens((prev) => {
      const validIds = new Set(groupedScreens.map((group) => group.screen_id));
      const next = new Set(Array.from(prev).filter((id) => validIds.has(id)));
      if (next.size === 0 && groupedScreens.length > 0) {
        next.add(groupedScreens[0].screen_id);
      }
      return next;
    });
  }, [groupedScreens]);

  useEffect(() => {
    if (filterScreenId && !screenOptions.some((option) => option.id === filterScreenId)) {
      setFilterScreenId('');
    }
  }, [filterScreenId, screenOptions]);

  useEffect(() => {
    if (filterActionKey && !actionOptions.some((option) => option.key === filterActionKey)) {
      setFilterActionKey('');
    }
  }, [filterActionKey, actionOptions]);

  function togglePermission(screenActionId: string) {
    setLocalPerms((prev) => ({ ...prev, [screenActionId]: !(prev[screenActionId] ?? false) }));
    setDirty(true);
  }

  function setAllVisible(value: boolean) {
    const updates: Record<string, boolean> = {};
    filteredActions.forEach((row) => {
      updates[row.screen_action_id] = value;
    });
    setLocalPerms((prev) => ({ ...prev, ...updates }));
    setDirty(true);
  }

  function toggleScreenAccordion(screenId: string) {
    setExpandedScreens((prev) => {
      const next = new Set(prev);
      if (next.has(screenId)) {
        next.delete(screenId);
      } else {
        next.add(screenId);
      }
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

      toast.success(payload?.message || 'Permisos actualizados');
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
        title="Permisos de Rol"
        subtitle="Administracion de permisos por accion de pantalla para cada rol"
        rightSlot={
          <HeaderInfoTips
            items={[
              {
                title: 'Información',
                text: 'Selecciona un rol objetivo para administrar visibilidad y permisos por pantalla y acción.',
                variant: 'info',
              },
              {
                title: 'Tip',
                text: 'Usa los filtros de grupo, pantalla, acción y estado para reducir el volumen y administrar más rápido.',
                variant: 'tip',
              },
              {
                title: 'Advertencia',
                text: 'Los cambios no se aplican hasta presionar Guardar.',
                variant: 'warning',
              },
            ]}
          />
        }
      />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.3fr_1.05fr_0.7fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pantalla, accion o grupo" />
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
            <select
              className="w-full rounded-md border border-slate-300 p-2 text-sm"
              value={filterPermissionState}
              onChange={(e) => setFilterPermissionState(e.target.value as 'all' | 'allowed' | 'denied')}
              disabled={isLoading || isSaving}
            >
              <option value="all">Todos</option>
              <option value="allowed">Permitidos</option>
              <option value="denied">Denegados</option>
            </select>
            <div className="flex items-center gap-2 xl:justify-end">
              <Button variant="outline" size="sm" onClick={() => setAllVisible(true)} disabled={isLoading || isSaving || filteredActions.length === 0}>
                Permitir
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAllVisible(false)} disabled={isLoading || isSaving || filteredActions.length === 0}>
                Denegar
              </Button>
              {dirty ? (
                <Button size="sm" onClick={() => void savePermissions()} disabled={isSaving || isLoading || !selectedRoleId}>
                  {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <select
              className="w-full rounded-md border border-slate-300 p-2 text-sm"
              value={filterMenuGroupKey}
              onChange={(e) => {
                setFilterMenuGroupKey(e.target.value);
                setFilterScreenId('');
                setFilterActionKey('');
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
              onChange={(e) => {
                setFilterScreenId(e.target.value);
                setFilterActionKey('');
              }}
              disabled={isLoading || isSaving || screenOptions.length === 0}
            >
              <option value="">Todas las pantallas</option>
              {screenOptions.map((screen) => (
                <option key={screen.id} value={screen.id}>
                  {screen.name}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-md border border-slate-300 p-2 text-sm"
              value={filterActionKey}
              onChange={(e) => setFilterActionKey(e.target.value)}
              disabled={isLoading || isSaving || actionOptions.length === 0}
            >
              <option value="">Todas las acciones</option>
              {actionOptions.map((action) => (
                <option key={action.key} value={action.key}>
                  {action.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          {`${allowedCount} acciones permitidas visibles de ${filteredActions.length}`}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white p-3">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <RefreshCw className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        ) : groupedScreens.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">Sin resultados para el filtro actual.</div>
        ) : (
          <div className="space-y-3">
            {groupedScreens.map((group) => {
              const allowedInGroup = group.actions.filter((action) => localPerms[action.screen_action_id] ?? false).length;
              const isOpen = expandedScreens.has(group.screen_id);
              return (
                <div key={group.screen_id} className="rounded-md border border-slate-200">
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between bg-slate-50 px-3 py-2 text-left ${isOpen ? 'border-b border-slate-200' : ''}`}
                    onClick={() => toggleScreenAccordion(group.screen_id)}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {isOpen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                      <ShieldCheck className="h-4 w-4 text-slate-500" />
                      <div className="truncate text-sm font-semibold text-slate-800">
                        {group.menu_group_name} · {group.screen_name}
                      </div>
                      <div className="truncate text-xs text-slate-500">{group.screen_key}</div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {allowedInGroup}/{group.actions.length} permitidas
                    </div>
                  </button>
                  {isOpen ? (
                    <div className="divide-y divide-slate-100">
                      {group.actions.map((action) => {
                        const allowed = localPerms[action.screen_action_id] ?? false;
                        return (
                          <label key={action.screen_action_id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={allowed}
                              onChange={() => togglePermission(action.screen_action_id)}
                              disabled={isSaving}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-slate-700">{action.action_name}</div>
                              <div className="text-xs text-slate-500">
                                {action.action_key}
                                {action.ui_element_key ? ` · ${action.ui_element_key}` : ''}
                              </div>
                            </div>
                          </label>
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
  );
}

