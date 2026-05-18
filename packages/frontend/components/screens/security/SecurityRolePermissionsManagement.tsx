'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { publicApiToken } from '@/utils/backend/info';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

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

const API_BASE = 'http://localhost:3001/security-role-permissions';

export default function SecurityRolePermissionsManagement() {
  const { session } = useAuth();
  const token = session?.access_token || publicApiToken;

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [screenActions, setScreenActions] = useState<ScreenActionRow[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localPerms, setLocalPerms] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);

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

  const filteredActions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return screenActions;
    return screenActions.filter((row) => {
      const haystack = `${row.menu_group_name} ${row.screen_name} ${row.screen_key} ${row.action_name} ${row.action_key} ${row.ui_element_key || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [screenActions, search]);

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

  const selectedRole = roles.find((role) => role.id === selectedRoleId) || null;
  const allowedCount = filteredActions.filter((row) => localPerms[row.screen_action_id] ?? false).length;

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
    <div className="flex h-[calc(100vh-140px)] min-h-0 flex-col gap-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[280px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Rol objetivo</label>
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
          </div>
          <div className="min-w-[280px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">Buscar</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pantalla, accion o grupo" />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAllVisible(true)} disabled={isLoading || isSaving || filteredActions.length === 0}>
              Permitir visible
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAllVisible(false)} disabled={isLoading || isSaving || filteredActions.length === 0}>
              Denegar visible
            </Button>
            {dirty ? (
              <Button size="sm" onClick={() => void savePermissions()} disabled={isSaving || isLoading || !selectedRoleId}>
                {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar
              </Button>
            ) : null}
          </div>
        </div>

        {selectedRole ? (
          <div className="text-xs text-slate-500">
            Rol en gestion: <span className="font-medium text-slate-700">{selectedRole.role_name}</span> ({selectedRole.role_key}) ·
            {` ${allowedCount} acciones permitidas visibles de ${filteredActions.length}`}
          </div>
        ) : null}
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
              return (
                <div key={group.screen_id} className="rounded-md border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-slate-500" />
                      <div className="truncate text-sm font-semibold text-slate-800">
                        {group.menu_group_name} · {group.screen_name}
                      </div>
                      <div className="truncate text-xs text-slate-500">{group.screen_key}</div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {allowedInGroup}/{group.actions.length} permitidas
                    </div>
                  </div>
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
