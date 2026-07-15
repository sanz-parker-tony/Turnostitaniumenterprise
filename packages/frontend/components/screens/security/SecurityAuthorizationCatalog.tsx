'use client';

import { buildApiUrl } from '../../../utils/api-config';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  Check,
  ChevronRight,
  LayoutList,
  Monitor,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  X,
  Zap,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { publicApiToken } from '../../../utils/backend/info';
import HeaderInfoTips from '@/components/shared/HeaderInfoTips';
import HeaderRefreshButton from '@/components/shared/HeaderRefreshButton';
import SystemAdminPageHeader from '@/components/shared/SystemAdminPageHeader';
import { usePermissions } from '@/contexts/PermissionsContext';

const MENU_GROUPS_API = buildApiUrl('/menu-groups-management');
const SCREENS_API = buildApiUrl('/screens-management');
const ACTIONS_API = buildApiUrl('/actions-management');
const SCREEN_ACTIONS_API = buildApiUrl('/screen-actions-management');
const ROLE_SCREEN_ACTIONS_API = buildApiUrl('/role-screen-actions-management');

type TabKey = 'assignment' | 'maintenance';
type DrawerMode = 'create-screen' | 'move-screen' | 'link-action' | null;

type IconOption = {
  key: string;
  label: string;
  description: string;
  category: string;
};

const MENU_ICON_OPTIONS: IconOption[] = [
  // Seguridad y acceso
  { key: 'ShieldCheck', label: 'Seguridad de roles', description: 'Permisos, roles y controles de acceso', category: 'Seguridad' },
  { key: 'ShieldAlert', label: 'Alertas de seguridad', description: 'Riesgos, incidencias y eventos críticos', category: 'Seguridad' },
  { key: 'Shield', label: 'Políticas de seguridad', description: 'Configuraciones generales de seguridad', category: 'Seguridad' },
  { key: 'Lock', label: 'Bloqueos', description: 'Pantallas de bloqueo y restricciones', category: 'Seguridad' },
  { key: 'KeyRound', label: 'Credenciales', description: 'Llaves, tokens, contraseñas y autenticación', category: 'Seguridad' },
  { key: 'Fingerprint', label: 'Identidad', description: 'Validación de identidad y autenticación fuerte', category: 'Seguridad' },
  { key: 'UserCheck', label: 'Aprobación de acceso', description: 'Aprobaciones y validaciones de usuario', category: 'Seguridad' },
  { key: 'UserX', label: 'Revocación de acceso', description: 'Bloquear o retirar acceso', category: 'Seguridad' },

  // Organización y empresa
  { key: 'Building2', label: 'Empresas', description: 'Empresas, filiales o unidades organizacionales', category: 'Organización' },
  { key: 'Building', label: 'Sedes', description: 'Sucursales y sedes físicas', category: 'Organización' },
  { key: 'MapPin', label: 'Ubicaciones', description: 'Ubicaciones geográficas y centros', category: 'Organización' },
  { key: 'Network', label: 'Estructura organizacional', description: 'Jerarquías y relaciones organizativas', category: 'Organización' },
  { key: 'Briefcase', label: 'Cargos', description: 'Cargos y puestos de trabajo', category: 'Organización' },
  { key: 'Users', label: 'Colaboradores', description: 'Gestión de empleados y equipos', category: 'Organización' },
  { key: 'UserCog', label: 'Perfiles de usuario', description: 'Configuración de perfiles y atributos', category: 'Organización' },
  { key: 'UserPlus', label: 'Alta de usuarios', description: 'Registro e incorporación de personal', category: 'Organización' },

  // Operación y actividad
  { key: 'Clock3', label: 'Asistencia y marcaciones', description: 'Control de tiempo y asistencia', category: 'Operación' },
  { key: 'CalendarDays', label: 'Calendarios', description: 'Calendarios laborales y planificación', category: 'Operación' },
  { key: 'CalendarClock', label: 'Turnos', description: 'Planificación y control de turnos', category: 'Operación' },
  { key: 'AlarmClockCheck', label: 'Cumplimiento horario', description: 'Validación de puntualidad y reglas', category: 'Operación' },
  { key: 'ClipboardCheck', label: 'Aprobaciones', description: 'Flujos de aprobación operativa', category: 'Operación' },
  { key: 'FileCheck', label: 'Solicitudes', description: 'Gestión de solicitudes y permisos', category: 'Operación' },
  { key: 'Workflow', label: 'Flujos', description: 'Procesos y automatizaciones', category: 'Operación' },
  { key: 'Cog', label: 'Configuración operativa', description: 'Parámetros funcionales del negocio', category: 'Operación' },

  // Datos y reportes
  { key: 'BarChart3', label: 'Reportes', description: 'Reportes, métricas y analítica', category: 'Datos y Reportes' },
  { key: 'PieChart', label: 'Indicadores', description: 'KPI y paneles de control', category: 'Datos y Reportes' },
  { key: 'LineChart', label: 'Tendencias', description: 'Series de tiempo y evolución', category: 'Datos y Reportes' },
  { key: 'Table', label: 'Tablas de datos', description: 'Consultas tabulares y listados', category: 'Datos y Reportes' },
  { key: 'Database', label: 'Datos maestros', description: 'Catálogos y entidades maestras', category: 'Datos y Reportes' },
  { key: 'FileSpreadsheet', label: 'Exportaciones', description: 'Excel, CSV y salidas tabulares', category: 'Datos y Reportes' },
  { key: 'Search', label: 'Búsqueda', description: 'Exploración y consulta de información', category: 'Datos y Reportes' },
  { key: 'Filter', label: 'Filtros', description: 'Filtros y segmentación de datos', category: 'Datos y Reportes' },

  // Comunicación e idioma
  { key: 'Bell', label: 'Notificaciones', description: 'Alertas del sistema y avisos', category: 'Comunicación' },
  { key: 'Mail', label: 'Mensajería', description: 'Mensajes por correo y bandeja interna', category: 'Comunicación' },
  { key: 'MessageSquare', label: 'Mensajes', description: 'Plantillas y claves de mensajes', category: 'Comunicación' },
  { key: 'Languages', label: 'Idiomas', description: 'Gestión de idiomas y traducciones', category: 'Comunicación' },
  { key: 'Globe2', label: 'Multilenguaje', description: 'Contenido internacionalizado', category: 'Comunicación' },

  // Administración técnica
  { key: 'Settings', label: 'Configuración general', description: 'Ajustes globales del sistema', category: 'Administración técnica' },
  { key: 'Settings2', label: 'Parámetros avanzados', description: 'Configuraciones técnicas específicas', category: 'Administración técnica' },
  { key: 'Server', label: 'Servicios', description: 'Servicios backend e integraciones', category: 'Administración técnica' },
  { key: 'Cloud', label: 'Integraciones cloud', description: 'Conectores y servicios externos', category: 'Administración técnica' },
  { key: 'HardDrive', label: 'Almacenamiento', description: 'Rutas, archivos y repositorios', category: 'Administración técnica' },
  { key: 'Cpu', label: 'Procesamiento', description: 'Procesos y ejecución de tareas', category: 'Administración técnica' },
  { key: 'Wrench', label: 'Mantenimiento', description: 'Herramientas y tareas de soporte', category: 'Administración técnica' },
  { key: 'Bug', label: 'Diagnóstico', description: 'Depuración, trazas e incidencias', category: 'Administración técnica' },
];

function getToken() {
  return localStorage.getItem('tt-access-token') || localStorage.getItem('access_token') || publicApiToken;
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

interface Tenant {
  id: string;
  tenant_key: string;
  tenant_name: string;
}

interface Role {
  id: string;
  role_key: string;
  role_name: string;
  tenant_id: string;
}

interface MenuGroup {
  id: string;
  menu_group_key: string;
  menu_group_name: string;
  sort_order: number;
  is_active: boolean;
}

interface Screen {
  id: string;
  screen_key: string;
  screen_name: string;
  menu_label: string | null;
  route_path: string | null;
  icon_key: string | null;
  sort_order: number;
  menu_group_id: string;
  is_active: boolean;
}

interface ActionItem {
  id: string;
  action_key: string;
  action_name: string;
  is_active: boolean;
}

interface ScreenAction {
  id: string;
  screen_id: string;
  action_id: string;
  is_active: boolean;
  action_key?: string | null;
  action_name?: string | null;
  ui_element_key?: string | null;
}

interface RoleScreenAction {
  screen_action_id: string;
  is_allowed: boolean;
}

interface GroupStatus {
  groupId: string;
  allowed: number;
  total: number;
  assigned: boolean;
}

export default function SecurityAuthorizationCatalog() {
  const { getScreenByPath, reload: reloadPermissions } = usePermissions();
  const [currentPath, setCurrentPath] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('assignment');
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [actionsCatalog, setActionsCatalog] = useState<ActionItem[]>([]);
  const [allScreenActions, setAllScreenActions] = useState<ScreenAction[]>([]);

  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedMenuGroup, setSelectedMenuGroup] = useState('');
  const [selectedScreen, setSelectedScreen] = useState('');
  const [searchAction, setSearchAction] = useState('');

  const [localPerms, setLocalPerms] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState(false);
  const [reordering, setReordering] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [screenForm, setScreenForm] = useState({
    screen_key: '',
    screen_name: '',
    menu_label: '',
    menu_group_id: '',
    route_path: '',
    icon_key: '',
    sort_order: 0,
  });

  const [linkForm, setLinkForm] = useState({
    screen_id: '',
    action_id: '',
    ui_element_key: '',
  });
  const [moveGroupForm, setMoveGroupForm] = useState({
    screen_id: '',
    target_menu_group_id: '',
  });

  const iconOptionsByCategory = useMemo(() => {
    const map: Record<string, IconOption[]> = {};
    MENU_ICON_OPTIONS.forEach((icon) => {
      if (!map[icon.category]) map[icon.category] = [];
      map[icon.category].push(icon);
    });
    return map;
  }, []);
  const selectedIconMeta = useMemo(
    () => MENU_ICON_OPTIONS.find((icon) => icon.key === screenForm.icon_key) || null,
    [screenForm.icon_key]
  );
  const SelectedIconPreview = useMemo(() => {
    if (!screenForm.icon_key) return null;
    const Candidate = (LucideIcons as any)[screenForm.icon_key];
    return typeof Candidate === 'function' ? Candidate : null;
  }, [screenForm.icon_key]);
  const activeActionsCatalog = useMemo(() => actionsCatalog.filter((a) => a.is_active), [actionsCatalog]);
  const activeScreenActions = useMemo(() => allScreenActions.filter((sa) => sa.is_active), [allScreenActions]);
  const actionById = useMemo(() => {
    const map = new Map<string, ActionItem>();
    actionsCatalog.forEach((action) => map.set(action.id, action));
    return map;
  }, [actionsCatalog]);

  const getActionName = (sa: ScreenAction) => sa.action_name || actionById.get(sa.action_id)?.action_name || '-';
  const getActionKey = (sa: ScreenAction) => sa.action_key || actionById.get(sa.action_id)?.action_key || '-';

  const rolesForTenant = useMemo(
    () => roles.filter((r) => r.tenant_id === selectedTenant),
    [roles, selectedTenant]
  );

  const screensByGroup = useMemo(() => {
    const map: Record<string, Screen[]> = {};
    menuGroups.forEach((group) => {
      map[group.id] = [];
    });
    screens.forEach((screen) => {
      if (!map[screen.menu_group_id]) map[screen.menu_group_id] = [];
      map[screen.menu_group_id].push(screen);
    });
    Object.keys(map).forEach((key) => {
      map[key] = map[key].sort((a, b) => a.sort_order - b.sort_order || a.screen_name.localeCompare(b.screen_name));
    });
    return map;
  }, [menuGroups, screens]);

  const screenActionsByScreen = useMemo(() => {
    const map: Record<string, ScreenAction[]> = {};
    activeScreenActions.forEach((sa) => {
      if (!map[sa.screen_id]) map[sa.screen_id] = [];
      map[sa.screen_id].push(sa);
    });
    Object.keys(map).forEach((key) => {
      map[key] = map[key].sort((a, b) =>
        `${a.action_name || ''}`.localeCompare(`${b.action_name || ''}`)
      );
    });
    return map;
  }, [activeScreenActions]);

  const allScreenActionsByScreen = useMemo(() => {
    const map: Record<string, ScreenAction[]> = {};
    allScreenActions.forEach((sa) => {
      if (!map[sa.screen_id]) map[sa.screen_id] = [];
      map[sa.screen_id].push(sa);
    });
    Object.keys(map).forEach((key) => {
      map[key] = map[key].sort((a, b) =>
        `${a.action_name || ''}`.localeCompare(`${b.action_name || ''}`)
      );
    });
    return map;
  }, [allScreenActions]);

  const selectedScreenActions = useMemo(() => {
    const list = allScreenActionsByScreen[selectedScreen] || [];
    if (!searchAction.trim()) return list;
    const q = searchAction.toLowerCase();
    return list.filter((sa) =>
      `${sa.action_name || ''} ${sa.action_key || ''} ${sa.ui_element_key || ''}`.toLowerCase().includes(q)
    );
  }, [allScreenActionsByScreen, selectedScreen, searchAction]);

  const linkedActiveActionIds = useMemo(() => {
    return new Set((screenActionsByScreen[linkForm.screen_id] || []).map((sa) => sa.action_id));
  }, [screenActionsByScreen, linkForm.screen_id]);
  const linkScreenMeta = useMemo(
    () => screens.find((screen) => screen.id === linkForm.screen_id) || null,
    [screens, linkForm.screen_id]
  );

  const allowedCountForScreen = (screenId: string) => {
    const list = screenActionsByScreen[screenId] || [];
    if (!list.length) return { allowed: 0, total: 0 };
    const allowed = list.filter((sa) => localPerms[sa.id] ?? false).length;
    return { allowed, total: list.length };
  };

  const menuGroupStatus = useMemo(() => {
    const status: GroupStatus[] = menuGroups.map((group) => {
      const screensInGroup = screensByGroup[group.id] || [];
      let total = 0;
      let allowed = 0;

      screensInGroup.forEach((screen) => {
        const list = screenActionsByScreen[screen.id] || [];
        total += list.length;
        allowed += list.filter((sa) => localPerms[sa.id] ?? false).length;
      });

      return {
        groupId: group.id,
        total,
        allowed,
        assigned: allowed > 0,
      };
    });
    return status;
  }, [menuGroups, screensByGroup, screenActionsByScreen, localPerms]);

  const loadCatalogs = async (screenToKeep?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [tenantsRes, rolesRes, groupsRes, screensRes, actionsRes, screenActionsRes] = await Promise.all([
        fetch(`${ROLE_SCREEN_ACTIONS_API}/catalogs/tenants`, { headers: authHeaders() }),
        fetch(`${ROLE_SCREEN_ACTIONS_API}/catalogs/roles`, { headers: authHeaders() }),
        fetch(MENU_GROUPS_API, { headers: authHeaders() }),
        fetch(SCREENS_API, { headers: authHeaders() }),
        fetch(ACTIONS_API, { headers: authHeaders() }),
        fetch(SCREEN_ACTIONS_API, { headers: authHeaders() }),
      ]);

      const [tenantsData, rolesData, groupsData, screensData, actionsData, screenActionsData] = await Promise.all([
        tenantsRes.json(),
        rolesRes.json(),
        groupsRes.json(),
        screensRes.json(),
        actionsRes.json(),
        screenActionsRes.json(),
      ]);

      if (!tenantsRes.ok) throw new Error(tenantsData.error || 'Error cargando tenants');
      if (!rolesRes.ok) throw new Error(rolesData.error || 'Error cargando roles');
      if (!groupsRes.ok) throw new Error(groupsData.error || 'Error cargando grupos de menú');
      if (!screensRes.ok) throw new Error(screensData.error || 'Error cargando pantallas');
      if (!actionsRes.ok) throw new Error(actionsData.error || 'Error cargando acciones');
      if (!screenActionsRes.ok) throw new Error(screenActionsData.error || 'Error cargando relaciones pantalla-acción');

      const loadedTenants: Tenant[] = tenantsData.tenants || [];
      const loadedRoles: Role[] = rolesData.roles || [];
      const loadedGroups: MenuGroup[] = groupsData.menuGroups || [];
      const loadedScreens: Screen[] = screensData.screens || [];
      const loadedActions: ActionItem[] = actionsData.actions || [];
      const loadedScreenActions: ScreenAction[] = screenActionsData.screenActions || [];

      setTenants(loadedTenants);
      setRoles(loadedRoles);
      setMenuGroups(loadedGroups);
      setScreens(loadedScreens);
      setActionsCatalog(loadedActions);
      setAllScreenActions(loadedScreenActions);

      const preferredScreenId = screenToKeep || selectedScreen;
      const preferredScreen = loadedScreens.find((screen) => screen.id === preferredScreenId);
      if (preferredScreen) {
        setSelectedMenuGroup(preferredScreen.menu_group_id);
        setSelectedScreen(preferredScreen.id);
      }

      if (!selectedTenant && loadedTenants.length > 0) {
        setSelectedTenant(loadedTenants[0].id);
      }
    } catch (e: any) {
      setError(e.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const loadRolePermissions = async () => {
    if (!selectedTenant || !selectedRole) {
      setLocalPerms({});
      setDirty(false);
      return;
    }

    setLoadingPermissions(true);
    setError(null);
    try {
      const res = await fetch(
        `${ROLE_SCREEN_ACTIONS_API}?tenant_id=${selectedTenant}&role_id=${selectedRole}`,
        { headers: authHeaders() }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando permisos');

      const map: Record<string, boolean> = {};
      (data.permissions as RoleScreenAction[] || []).forEach((p) => {
        map[p.screen_action_id] = p.is_allowed;
      });
      setLocalPerms(map);
      setDirty(false);
    } catch (e: any) {
      setError(e.message || 'Error cargando permisos');
    } finally {
      setLoadingPermissions(false);
    }
  };

  useEffect(() => {
    loadCatalogs();
  }, []);

  useEffect(() => {
    if (!selectedTenant) {
      setSelectedRole('');
      return;
    }
    if (!rolesForTenant.some((r) => r.id === selectedRole)) {
      setSelectedRole(rolesForTenant[0]?.id || '');
    }
  }, [selectedTenant, selectedRole, rolesForTenant]);

  useEffect(() => {
    loadRolePermissions();
  }, [selectedTenant, selectedRole]);

  useEffect(() => {
    if (activeTab !== 'maintenance' || !selectedScreen) return;

    let cancelled = false;
    const loadSelectedScreenActions = async () => {
      try {
        const res = await fetch(`${SCREEN_ACTIONS_API}?screen_id=${encodeURIComponent(selectedScreen)}`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error cargando acciones de la pantalla');
        if (cancelled) return;

        const loadedRelations: ScreenAction[] = data.screenActions || [];
        setAllScreenActions((current) => [
          ...loadedRelations,
          ...current.filter((relation) => relation.screen_id !== selectedScreen),
        ]);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Error cargando acciones de la pantalla');
      }
    };

    loadSelectedScreenActions();
    return () => { cancelled = true; };
  }, [activeTab, selectedScreen]);

  useEffect(() => {
    const firstGroupWithScreens = menuGroups.find((group) => (screensByGroup[group.id] || []).length > 0);
    if (!selectedMenuGroup || !(screensByGroup[selectedMenuGroup] || []).length) {
      setSelectedMenuGroup(firstGroupWithScreens?.id || '');
      setSelectedScreen(firstGroupWithScreens ? screensByGroup[firstGroupWithScreens.id]?.[0]?.id || '' : '');
      return;
    }

    const groupScreens = screensByGroup[selectedMenuGroup] || [];
    if (!groupScreens.some((screen) => screen.id === selectedScreen)) {
      setSelectedScreen(groupScreens[0]?.id || '');
    }
  }, [menuGroups, screensByGroup, selectedMenuGroup, selectedScreen]);

  const setScreenPermissionBulk = (screenId: string, value: boolean) => {
    const list = screenActionsByScreen[screenId] || [];
    if (!list.length) return;
    setLocalPerms((prev) => {
      const next = { ...prev };
      list.forEach((sa) => {
        next[sa.id] = value;
      });
      return next;
    });
    setDirty(true);
    setSuccess(null);
  };

  const toggleActionPermission = (screenActionId: string) => {
    setLocalPerms((prev) => ({
      ...prev,
      [screenActionId]: !(prev[screenActionId] ?? false),
    }));
    setDirty(true);
    setSuccess(null);
  };

  const savePermissions = async () => {
    if (!selectedTenant || !selectedRole) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = activeScreenActions.map((sa) => ({
        screen_action_id: sa.id,
        is_allowed: localPerms[sa.id] ?? false,
      }));

      const res = await fetch(`${ROLE_SCREEN_ACTIONS_API}/bulk-upsert`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          tenant_id: selectedTenant,
          role_id: selectedRole,
          permissions: payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando permisos');

      setDirty(false);
      setSuccess(`Permisos guardados (${data.updated || 0} actualizados, ${data.created || 0} nuevos).`);
    } catch (e: any) {
      setError(e.message || 'Error guardando permisos');
    } finally {
      setSaving(false);
    }
  };

  const setMenuGroupStatus = async (group: MenuGroup, isActive: boolean) => {
    if (!isActive) {
      const confirmed = window.confirm(
        `Desactivar el grupo “${group.menu_group_name}” ocultará todas sus opciones del menú para los usuarios. ¿Desea continuar?`
      );
      if (!confirmed) return;
    }

    setWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${MENU_GROUPS_API}/${group.id}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ is_active: isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error actualizando el estado del grupo de menú');

      setMenuGroups((current) => current.map((item) => (
        item.id === group.id ? { ...item, is_active: isActive } : item
      )));
      await reloadPermissions();
      setSuccess(`Grupo “${group.menu_group_name}” ${isActive ? 'activado' : 'desactivado'}.`);
    } catch (e: any) {
      setError(e.message || 'Error actualizando el estado del grupo de menú');
    } finally {
      setWorking(false);
    }
  };

  const setScreenStatus = async (screen: Screen, isActive: boolean) => {
    if (!isActive) {
      const confirmed = window.confirm(
        `Desactivar “${screen.menu_label || screen.screen_name}” ocultará esta opción del menú para los usuarios. ¿Desea continuar?`
      );
      if (!confirmed) return;
    }

    setWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${SCREENS_API}/${screen.id}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ is_active: isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error actualizando el estado de la pantalla');

      setScreens((current) => current.map((item) => (
        item.id === screen.id ? { ...item, is_active: isActive } : item
      )));
      await reloadPermissions();
      setSuccess(`Ítem “${screen.menu_label || screen.screen_name}” ${isActive ? 'activado' : 'desactivado'}.`);
    } catch (e: any) {
      setError(e.message || 'Error actualizando el estado de la pantalla');
    } finally {
      setWorking(false);
    }
  };

  const moveMenuGroup = async (groupId: string, direction: -1 | 1) => {
    const currentIndex = menuGroups.findIndex((group) => group.id === groupId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= menuGroups.length || reordering) return;

    const reordered = [...menuGroups];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];

    setReordering(`group:${groupId}`);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${MENU_GROUPS_API}/reorder`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ ordered_ids: reordered.map((group) => group.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error actualizando el orden de los grupos');

      const persistedOrder = new Map<string, number>(
        (data.menuGroups || []).map((group: MenuGroup) => [group.id, Number(group.sort_order)])
      );
      setMenuGroups(reordered.map((group, index) => ({
        ...group,
        sort_order: persistedOrder.get(group.id) ?? (index + 1) * 10,
      })));
      await reloadPermissions();
      setSuccess('Orden de grupos de menú actualizado.');
    } catch (e: any) {
      setError(e.message || 'Error actualizando el orden de los grupos');
    } finally {
      setReordering(null);
    }
  };

  const reorderScreen = async (screenId: string, direction: -1 | 1) => {
    const groupScreens = screensByGroup[selectedMenuGroup] || [];
    const currentIndex = groupScreens.findIndex((screen) => screen.id === screenId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= groupScreens.length || reordering) return;

    const reordered = [...groupScreens];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];

    setReordering(`screen:${screenId}`);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${SCREENS_API}/reorder`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          menu_group_id: selectedMenuGroup,
          ordered_ids: reordered.map((screen) => screen.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error actualizando el orden de las pantallas');

      const persistedOrder = new Map<string, number>(
        (data.screens || []).map((screen: Screen) => [screen.id, Number(screen.sort_order)])
      );
      setScreens((current) => current.map((screen) => (
        persistedOrder.has(screen.id)
          ? { ...screen, sort_order: persistedOrder.get(screen.id)! }
          : screen
      )));
      await reloadPermissions();
      setSuccess('Orden de ítems del menú actualizado.');
    } catch (e: any) {
      setError(e.message || 'Error actualizando el orden de las pantallas');
    } finally {
      setReordering(null);
    }
  };

  const openMoveScreenDrawer = (screen: Screen) => {
    setSelectedMenuGroup(screen.menu_group_id);
    setSelectedScreen(screen.id);
    setMoveGroupForm({ screen_id: screen.id, target_menu_group_id: '' });
    setError(null);
    setSuccess(null);
    setDrawerMode('move-screen');
  };

  const moveScreenToMenuGroup = async () => {
    const screen = screens.find((item) => item.id === moveGroupForm.screen_id);
    const targetGroup = menuGroups.find((group) => group.id === moveGroupForm.target_menu_group_id);
    if (!screen || !targetGroup) {
      setError('Selecciona una pantalla y un grupo de menú destino.');
      return;
    }
    if (screen.menu_group_id === targetGroup.id) {
      setError('La pantalla ya pertenece a ese grupo de menú.');
      return;
    }

    const targetScreens = screensByGroup[targetGroup.id] || [];
    const nextSortOrder = targetScreens.reduce(
      (maximum, item) => Math.max(maximum, Number(item.sort_order || 0)),
      0
    ) + 10;

    setWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${SCREENS_API}/${screen.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          menu_group_id: targetGroup.id,
          sort_order: nextSortOrder,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cambiando el grupo de menú');

      await loadCatalogs(screen.id);
      await reloadPermissions();
      setSelectedMenuGroup(targetGroup.id);
      setSelectedScreen(screen.id);
      setSuccess(`“${screen.menu_label || screen.screen_name}” se movió a ${targetGroup.menu_group_name}.`);
      closeDrawer();
    } catch (e: any) {
      setError(e.message || 'Error cambiando el grupo de menú');
    } finally {
      setWorking(false);
    }
  };

  const openDrawer = (mode: DrawerMode) => {
    setDrawerMode(mode);
    setError(null);
    setSuccess(null);
    if (mode === 'create-screen') {
      setScreenForm((prev) => ({ ...prev, menu_group_id: selectedMenuGroup || prev.menu_group_id }));
    }
    if (mode === 'link-action') {
      setLinkForm({
        screen_id: selectedScreen || '',
        action_id: '',
        ui_element_key: '',
      });
    }
  };

  const closeDrawer = () => {
    setDrawerMode(null);
  };

  const createScreen = async () => {
    if (!screenForm.menu_group_id || !screenForm.screen_key.trim() || !screenForm.screen_name.trim()) {
      setError('menu_group_id, screen_key y screen_name son obligatorios.');
      return;
    }
    setWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        screen_key: screenForm.screen_key.trim().toUpperCase(),
        screen_name: screenForm.screen_name.trim(),
        menu_label: screenForm.menu_label.trim() || null,
        menu_group_id: screenForm.menu_group_id,
        route_path: screenForm.route_path.trim() || null,
        icon_key: screenForm.icon_key.trim() || null,
        sort_order: Number(screenForm.sort_order || 0),
        is_active: true,
      };
      const res = await fetch(SCREENS_API, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creando pantalla');
      setSuccess('Pantalla creada correctamente.');
      setScreenForm({
        screen_key: '',
        screen_name: '',
        menu_label: '',
        menu_group_id: screenForm.menu_group_id,
        route_path: '',
        icon_key: '',
        sort_order: 0,
      });
      await loadCatalogs();
      closeDrawer();
    } catch (e: any) {
      setError(e.message || 'Error creando pantalla');
    } finally {
      setWorking(false);
    }
  };

  const linkActionToScreen = async () => {
    if (!linkForm.screen_id || !linkForm.action_id) {
      setError('screen_id y action_id son obligatorios.');
      return;
    }
    setWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(SCREEN_ACTIONS_API, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          screen_id: linkForm.screen_id,
          action_id: linkForm.action_id,
          ui_element_key: linkForm.ui_element_key.trim() || null,
          is_active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error vinculando acción');

      const linkedAction = actionById.get(linkForm.action_id);
      const linkedScreen = screens.find((screen) => screen.id === linkForm.screen_id);
      const normalizedRelation: ScreenAction = {
        ...data.screenAction,
        screen_id: linkForm.screen_id,
        action_id: linkForm.action_id,
        is_active: true,
        action_key: linkedAction?.action_key || data.screenAction?.action_key || null,
        action_name: linkedAction?.action_name || data.screenAction?.action_name || null,
      };

      setAllScreenActions((current) => [
        normalizedRelation,
        ...current.filter((relation) =>
          relation.id !== normalizedRelation.id &&
          !(relation.screen_id === linkForm.screen_id && relation.action_id === linkForm.action_id)
        ),
      ]);
      if (linkedScreen) setSelectedMenuGroup(linkedScreen.menu_group_id);
      setSelectedScreen(linkForm.screen_id);
      setSuccess(data.message || 'Acción vinculada correctamente a la pantalla.');
      closeDrawer();
    } catch (e: any) {
      setError(e.message || 'Error vinculando acción');
    } finally {
      setWorking(false);
    }
  };

  const unlinkActionFromScreen = async (screenActionId: string) => {
    setWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${SCREEN_ACTIONS_API}/${screenActionId}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ is_active: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error quitando acción de pantalla');

      setLocalPerms((prev) => ({ ...prev, [screenActionId]: false }));
      setDirty(true);
      setSuccess('Acción quitada de la pantalla (relación desactivada, no eliminada).');
      await loadCatalogs(selectedScreen);
    } catch (e: any) {
      setError(e.message || 'Error quitando acción');
    } finally {
      setWorking(false);
    }
  };

  const setScreenActionStatus = async (screenActionId: string, isActive: boolean) => {
    setWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${SCREEN_ACTIONS_API}/${screenActionId}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ is_active: isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error actualizando estado de acción');

      if (!isActive) {
        setLocalPerms((prev) => ({ ...prev, [screenActionId]: false }));
        setDirty(true);
      }
      setSuccess(isActive ? 'Acción reactivada en la pantalla.' : 'Acción quitada de la pantalla.');
      await loadCatalogs(selectedScreen);
    } catch (e: any) {
      setError(e.message || 'Error actualizando acción');
    } finally {
      setWorking(false);
    }
  };

  const activeTenantName = tenants.find((t) => t.id === selectedTenant)?.tenant_name || '-';
  const activeRoleName = roles.find((r) => r.id === selectedRole)?.role_name || '-';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updatePath = () => setCurrentPath(window.location.pathname);
    updatePath();
    window.addEventListener('popstate', updatePath);
    return () => window.removeEventListener('popstate', updatePath);
  }, []);

  const currentMenuScreen = useMemo(() => getScreenByPath(currentPath), [getScreenByPath, currentPath]);
  const selectedScreenMeta = useMemo(
    () => screens.find((screen) => screen.id === selectedScreen) || null,
    [screens, selectedScreen]
  );
  const resolvedGroupName =
    currentMenuScreen?.menu_group_name ||
    (selectedScreenMeta
      ? menuGroups.find((group) => group.id === selectedScreenMeta.menu_group_id)?.menu_group_name
      : '') ||
    '';
  const resolvedMenuLabel = currentMenuScreen?.menu_label || selectedScreenMeta?.menu_label || '';
  const resolvedScreenName = currentMenuScreen?.screen_name || selectedScreenMeta?.screen_name || '';

  const renderDrawerContent = () => {
    if (!drawerMode) return null;

    if (drawerMode === 'create-screen') {
      return (
        <>
          <h3 className="text-base font-semibold text-gray-900 mb-3">Nueva Pantalla</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Grupo de menú</label>
              <select
                value={screenForm.menu_group_id}
                onChange={(e) => setScreenForm((prev) => ({ ...prev, menu_group_id: e.target.value }))}
                className="w-full px-3 py-2 text-sm border rounded-lg"
              >
                <option value="">Selecciona grupo</option>
                {menuGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.menu_group_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">screen_key</label>
              <input
                value={screenForm.screen_key}
                onChange={(e) => setScreenForm((prev) => ({ ...prev, screen_key: e.target.value.toUpperCase() }))}
                placeholder="SEC_REPORTS"
                className="w-full px-3 py-2 text-sm border rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">screen_name</label>
              <input
                value={screenForm.screen_name}
                onChange={(e) => setScreenForm((prev) => ({ ...prev, screen_name: e.target.value }))}
                placeholder="Reportes Seguridad"
                className="w-full px-3 py-2 text-sm border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">menu_label</label>
              <input
                value={screenForm.menu_label}
                onChange={(e) => setScreenForm((prev) => ({ ...prev, menu_label: e.target.value }))}
                placeholder="Reportes"
                className="w-full px-3 py-2 text-sm border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">route_path</label>
              <input
                value={screenForm.route_path}
                onChange={(e) => setScreenForm((prev) => ({ ...prev, route_path: e.target.value }))}
                placeholder="/dashboard/security/reports"
                className="w-full px-3 py-2 text-sm border rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">icon_key</label>
              <select
                value={screenForm.icon_key}
                onChange={(e) => setScreenForm((prev) => ({ ...prev, icon_key: e.target.value }))}
                className="w-full px-3 py-2 text-sm border rounded-lg"
              >
                <option value="">Sin icono</option>
                {Object.entries(iconOptionsByCategory).map(([category, options]) => (
                  <optgroup key={category} label={category}>
                    {options.map((icon) => (
                      <option key={icon.key} value={icon.key}>
                        {icon.key} - {icon.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  {SelectedIconPreview ? <SelectedIconPreview className="w-4 h-4 text-[#0074D9]" /> : <Monitor className="w-4 h-4 text-gray-400" />}
                  <span className="font-mono">{screenForm.icon_key || 'Sin icono'}</span>
                </div>
                <p className="mt-1">
                  {selectedIconMeta
                    ? `${selectedIconMeta.label}: ${selectedIconMeta.description}`
                    : 'Selecciona un icono orientado a seguridad, operación o administración.'}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">sort_order</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step={1}
                  value={screenForm.sort_order}
                  onChange={(e) => setScreenForm((prev) => ({ ...prev, sort_order: Number(e.target.value || 0) }))}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                />
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setScreenForm((prev) => ({ ...prev, sort_order: Number(prev.sort_order || 0) + 1 }))}
                    className="px-2 py-1 text-xs border rounded-md hover:bg-gray-50"
                    title="Incrementar"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => setScreenForm((prev) => ({ ...prev, sort_order: Number(prev.sort_order || 0) - 1 }))}
                    className="px-2 py-1 text-xs border rounded-md hover:bg-gray-50"
                    title="Decrementar"
                  >
                    ▼
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-5">
            <button onClick={closeDrawer} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={createScreen}
              disabled={working}
              className="px-3 py-2 text-sm text-white bg-[#0074D9] rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {working ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </>
      );
    }

    if (drawerMode === 'move-screen') {
      const screen = screens.find((item) => item.id === moveGroupForm.screen_id);
      const currentGroup = screen
        ? menuGroups.find((group) => group.id === screen.menu_group_id)
        : null;
      return (
        <>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Cambiar grupo de menú</h3>
          <p className="mb-4 text-xs text-gray-500">
            La pantalla conservará sus acciones y permisos. Se ubicará al final del grupo destino y luego podrás
            ajustar su posición con las flechas.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ítem del menú</label>
              <div className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {screen ? `${screen.menu_label || screen.screen_name} (${screen.screen_key})` : 'Pantalla no encontrada'}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Grupo actual</label>
              <div className="w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {currentGroup?.menu_group_name || '-'}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Grupo destino</label>
              <select
                value={moveGroupForm.target_menu_group_id}
                onChange={(event) => setMoveGroupForm((current) => ({
                  ...current,
                  target_menu_group_id: event.target.value,
                }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">Selecciona grupo destino</option>
                {menuGroups
                  .filter((group) => group.id !== screen?.menu_group_id)
                  .map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.menu_group_name} ({group.menu_group_key})
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-5">
            <button onClick={closeDrawer} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={moveScreenToMenuGroup}
              disabled={working || !moveGroupForm.target_menu_group_id}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0074D9] px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <ArrowRightLeft className="h-4 w-4" />
              {working ? 'Moviendo...' : 'Cambiar grupo'}
            </button>
          </div>
        </>
      );
    }

    return (
      <>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Vincular Acción a Pantalla</h3>
        <p className="mb-3 text-xs text-gray-500">
          Selecciona una acción del catálogo global <span className="font-mono">actions</span>.
          Las acciones ya vinculadas a la pantalla aparecen deshabilitadas.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Pantalla</label>
            <div className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 text-gray-700">
              {linkScreenMeta
                ? `${linkScreenMeta.screen_name} (${linkScreenMeta.screen_key})`
                : 'Selecciona primero una pantalla en el panel izquierdo'}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Acción</label>
            <select
              value={linkForm.action_id}
              onChange={(e) => setLinkForm((prev) => ({ ...prev, action_id: e.target.value }))}
              className="w-full px-3 py-2 text-sm border rounded-lg"
            >
              <option value="">Selecciona acción</option>
              {activeActionsCatalog.map((action) => {
                const alreadyLinked = linkedActiveActionIds.has(action.id);
                return (
                <option key={action.id} value={action.id} disabled={alreadyLinked}>
                  {action.action_name} ({action.action_key}){alreadyLinked ? ' — ya vinculada' : ''}
                </option>
                );
              })}
            </select>
            {linkForm.screen_id && activeActionsCatalog.length > 0 && linkedActiveActionIds.size >= activeActionsCatalog.length && (
              <p className="mt-1 text-xs text-amber-600">Todas las acciones activas ya están vinculadas a esta pantalla.</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">ui_element_key (opcional)</label>
            <input
              value={linkForm.ui_element_key}
              onChange={(e) => setLinkForm((prev) => ({ ...prev, ui_element_key: e.target.value }))}
              placeholder="BTN_EXPORT"
              className="w-full px-3 py-2 text-sm border rounded-lg font-mono"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={closeDrawer} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={linkActionToScreen}
            disabled={working}
            className="px-3 py-2 text-sm text-white bg-[#0074D9] rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {working ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="relative box-border flex h-[calc(100vh-10rem)] min-h-0 flex-col gap-3 overflow-hidden p-6">
      <div className="shrink-0">
        <SystemAdminPageHeader
          icon={ShieldCheck}
          title={resolvedScreenName || 'Cargando pantalla...'}
          subtitle={`Grupo: ${resolvedGroupName || '-'} · Menú: ${resolvedMenuLabel || '-'}`}
          rightSlot={
            <>
              <HeaderInfoTips
                items={[
                  {
                    title: 'Seguridad de accesos',
                    text: 'Esta pantalla controla asignación de permisos por rol y relaciones pantalla-acción.',
                    variant: 'security',
                  },
                  {
                    title: 'Tip de uso',
                    text: 'Guarda permisos después de ajustar tenant, rol y acciones para evitar perder cambios.',
                    variant: 'tip',
                  },
                ]}
              />
              <HeaderRefreshButton onClick={loadCatalogs} />
              <button
                onClick={savePermissions}
                disabled={!dirty || saving || !selectedTenant || !selectedRole}
                className="flex items-center gap-2 px-4 py-2 bg-[#2ECC71] text-white rounded-lg hover:bg-green-600 text-sm font-medium disabled:opacity-60"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Guardando...' : 'Guardar Permisos'}
              </button>
            </>
          }
        />
      </div>

      <div className="shrink-0 rounded-lg border bg-white p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tenant</label>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.tenant_name} ({tenant.tenant_key})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Rol</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {rolesForTenant.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.role_name} ({role.role_key})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          Contexto activo: <span className="font-medium text-gray-700">{activeTenantName}</span> →{' '}
          <span className="font-medium text-gray-700">{activeRoleName}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => setActiveTab('assignment')}
          className={`px-3 py-2 text-sm rounded-lg border ${
            activeTab === 'assignment'
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Asignación Rol-Screen-Action
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`px-3 py-2 text-sm rounded-lg border ${
            activeTab === 'maintenance'
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Mantenimiento Pantallas/Acciones
        </button>
      </div>

      {error && (
        <div className="flex shrink-0 items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex shrink-0 items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {activeTab === 'assignment' && (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-3">
          <div className="bg-white rounded-xl border overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2 text-sm font-medium text-gray-700">
              <LayoutList className="w-4 h-4" />
              Grupos de Menú
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-2 space-y-1">
              {menuGroups.map((group, groupIndex) => {
                const status = menuGroupStatus.find((item) => item.groupId === group.id);
                const assigned = status?.assigned || false;
                return (
                  <div
                    key={group.id}
                    className={`flex items-stretch gap-1 rounded-lg border p-1 ${
                      selectedMenuGroup === group.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedMenuGroup(group.id)}
                      className="min-w-0 flex-1 px-2 py-1 text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900">{group.menu_group_name}</p>
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded ${
                              group.is_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {group.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded ${
                              assigned ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {assigned ? 'Pertenece' : 'Disponible'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">{group.menu_group_key}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {status?.allowed || 0}/{status?.total || 0} acciones habilitadas
                      </p>
                    </button>
                    <div className="flex shrink-0 flex-col justify-center gap-1 border-l pl-1">
                      <button
                        type="button"
                        data-testid={`move-group-up-${group.menu_group_key}`}
                        aria-label={`Subir grupo ${group.menu_group_name}`}
                        title="Subir grupo"
                        onClick={() => moveMenuGroup(group.id, -1)}
                        disabled={groupIndex === 0 || Boolean(reordering)}
                        className="rounded border bg-white p-1 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        data-testid={`move-group-down-${group.menu_group_key}`}
                        aria-label={`Bajar grupo ${group.menu_group_name}`}
                        title="Bajar grupo"
                        onClick={() => moveMenuGroup(group.id, 1)}
                        disabled={groupIndex === menuGroups.length - 1 || Boolean(reordering)}
                        className="rounded border bg-white p-1 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        data-testid={`toggle-group-status-${group.menu_group_key}`}
                        onClick={() => setMenuGroupStatus(group, !group.is_active)}
                        disabled={working}
                        className={`rounded border px-1 py-0.5 text-[10px] disabled:cursor-not-allowed disabled:opacity-50 ${
                          group.is_active
                            ? 'border-red-200 text-red-700 hover:bg-red-50'
                            : 'border-green-200 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {group.is_active ? 'Inactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2 text-sm font-medium text-gray-700">
              <Monitor className="w-4 h-4" />
              Pantallas del Grupo
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-2 space-y-1">
              {(screensByGroup[selectedMenuGroup] || []).map((screen, screenIndex, groupScreens) => {
                const count = allowedCountForScreen(screen.id);
                const isAssigned = count.total > 0 && count.allowed === count.total;
                const isPartial = count.allowed > 0 && count.allowed < count.total;
                return (
                  <div
                    key={screen.id}
                    className={`px-3 py-2 rounded-lg border ${
                      selectedScreen === screen.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <button className="w-full text-left" onClick={() => setSelectedScreen(screen.id)}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900">{screen.screen_name}</p>
                        <span
                          className={`shrink-0 rounded px-2 py-0.5 text-[10px] ${
                            screen.is_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {screen.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{screen.menu_label || '-'}</p>
                      <p className="text-xs text-gray-500">{screen.screen_key}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {count.allowed}/{count.total} acciones
                      </p>
                    </button>
                    <div className="flex flex-wrap items-center gap-1 mt-2">
                      <button
                        onClick={() => setScreenPermissionBulk(screen.id, true)}
                        className="text-[11px] px-2 py-1 border rounded hover:bg-gray-100"
                      >
                        Asignar
                      </button>
                      <button
                        onClick={() => setScreenPermissionBulk(screen.id, false)}
                        className="text-[11px] px-2 py-1 border rounded hover:bg-gray-100"
                      >
                        Quitar
                      </button>
                      <button
                        type="button"
                        data-testid={`move-screen-group-${screen.screen_key}`}
                        onClick={() => openMoveScreenDrawer(screen)}
                        className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] hover:bg-gray-100"
                        title="Cambiar grupo de menú"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        Grupo
                      </button>
                      <div className="ml-1 flex items-center gap-1 border-l pl-2">
                        <button
                          type="button"
                          data-testid={`move-screen-up-${screen.screen_key}`}
                          aria-label={`Subir ${screen.menu_label || screen.screen_name}`}
                          title="Subir ítem"
                          onClick={() => reorderScreen(screen.id, -1)}
                          disabled={screenIndex === 0 || Boolean(reordering)}
                          className="rounded border bg-white p-1 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          data-testid={`move-screen-down-${screen.screen_key}`}
                          aria-label={`Bajar ${screen.menu_label || screen.screen_name}`}
                          title="Bajar ítem"
                          onClick={() => reorderScreen(screen.id, 1)}
                          disabled={screenIndex === groupScreens.length - 1 || Boolean(reordering)}
                          className="rounded border bg-white p-1 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        data-testid={`toggle-screen-status-${screen.screen_key}`}
                        onClick={() => setScreenStatus(screen, !screen.is_active)}
                        disabled={working}
                        className={`rounded border px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-50 ${
                          screen.is_active
                            ? 'border-red-200 text-red-700 hover:bg-red-50'
                            : 'border-green-200 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {screen.is_active ? 'Inactivar' : 'Activar'}
                      </button>
                      <span
                        className={`ml-auto text-[11px] px-2 py-0.5 rounded ${
                          isAssigned
                            ? 'bg-green-100 text-green-700'
                            : isPartial
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isAssigned ? 'Asignada' : isPartial ? 'Parcial' : 'No asignada'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {(screensByGroup[selectedMenuGroup] || []).length === 0 && (
                <div className="text-sm text-gray-400 p-4 text-center">Sin pantallas en este grupo.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-3 border-b bg-gray-50">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Zap className="w-4 h-4" />
                Acciones de la Pantalla
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={searchAction}
                  onChange={(e) => setSearchAction(e.target.value)}
                  placeholder="Filtrar acciones..."
                  className="w-full pl-7 pr-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto divide-y divide-gray-100">
              {selectedScreenActions.map((sa) => {
                const allowed = localPerms[sa.id] ?? false;
                const fallbackAction = actionById.get(sa.action_id);
                const actionName = sa.action_name || fallbackAction?.action_name || '-';
                const actionKey = sa.action_key || fallbackAction?.action_key || '-';
                return (
                  <div key={sa.id} className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{actionName}</p>
                      <p className="text-xs text-gray-500 truncate flex items-center gap-2">
                        {actionKey}
                        {sa.ui_element_key ? ` · ${sa.ui_element_key}` : ''}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            sa.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {sa.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </p>
                    </div>
                    {sa.is_active ? (
                      <button
                        onClick={() => toggleActionPermission(sa.id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          allowed
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {allowed ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        {allowed ? 'Permitido' : 'Denegado'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-500">No asignable</span>
                    )}
                  </div>
                );
              })}
              {selectedScreenActions.length === 0 && (
                <div className="text-sm text-gray-400 p-4 text-center">
                  {loadingPermissions ? 'Cargando permisos...' : 'Sin acciones para la pantalla seleccionada.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-2">
          <div className="bg-white rounded-xl border overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Monitor className="w-4 h-4" />
                Pantallas
              </div>
              <button
                onClick={() => openDrawer('create-screen')}
                className="text-xs px-2 py-1 rounded border hover:bg-gray-100"
              >
                + Nueva Pantalla
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-2 space-y-1">
              {screens.map((screen) => (
                <div
                  key={screen.id}
                  className={`flex items-center gap-2 rounded-lg border p-1 ${
                    selectedScreen === screen.id
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <button
                    onClick={() => {
                      setSelectedMenuGroup(screen.menu_group_id);
                      setSelectedScreen(screen.id);
                    }}
                    className="min-w-0 flex-1 px-2 py-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-gray-900">{screen.screen_name}</p>
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 text-[10px] ${
                          screen.is_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {screen.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{screen.screen_key}</p>
                    <p className="truncate text-xs text-gray-400">{screen.route_path || 'Sin ruta'}</p>
                  </button>
                  <button
                    type="button"
                    data-testid={`maintenance-toggle-screen-status-${screen.screen_key}`}
                    onClick={() => setScreenStatus(screen, !screen.is_active)}
                    disabled={working}
                    className={`shrink-0 rounded border px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-50 ${
                      screen.is_active
                        ? 'border-red-200 text-red-700 hover:bg-red-50'
                        : 'border-green-200 text-green-700 hover:bg-green-50'
                    }`}
                  >
                    {screen.is_active ? 'Inactivar' : 'Activar'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Settings className="w-4 h-4" />
                Acciones y Relaciones
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openDrawer('link-action')}
                  disabled={!selectedScreen}
                  className="text-xs px-2 py-1 rounded border hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + Vincular acción
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto divide-y divide-gray-100">
              {(allScreenActionsByScreen[selectedScreen] || []).map((sa) => (
                <div key={sa.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{getActionName(sa)}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {getActionKey(sa)}
                      {sa.ui_element_key ? ` · ${sa.ui_element_key}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        sa.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {sa.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                    {sa.is_active ? (
                      <button
                        onClick={() => unlinkActionFromScreen(sa.id)}
                        disabled={working}
                        className="text-xs px-2 py-1 rounded border hover:bg-gray-100 disabled:opacity-60"
                      >
                        Quitar
                      </button>
                    ) : (
                      <button
                        onClick={() => setScreenActionStatus(sa.id, true)}
                        disabled={working}
                        className="text-xs px-2 py-1 rounded border hover:bg-gray-100 disabled:opacity-60"
                      >
                        Reactivar
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {(allScreenActionsByScreen[selectedScreen] || []).length === 0 && (
                <div className="text-sm text-gray-400 p-4 text-center">
                  {selectedScreen
                    ? 'Esta pantalla todavía no tiene acciones vinculadas.'
                    : 'Selecciona una pantalla para ver sus acciones vinculadas.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {dirty && (
        <div className="absolute bottom-4 right-6 z-20 max-w-md rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 shadow-lg">
          Hay cambios sin guardar en permisos del rol seleccionado.
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-30">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {drawerMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border bg-white shadow-2xl">
            <div className="mb-0 flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <Settings className="size-4 text-[#0074D9]" />
                <p className="text-sm font-semibold text-gray-900">Mantenimiento</p>
              </div>
              <button
                onClick={closeDrawer}
                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                Cerrar <X className="size-3" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-56px)] p-4">
              {renderDrawerContent()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}



