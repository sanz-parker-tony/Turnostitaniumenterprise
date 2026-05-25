'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
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

const MENU_GROUPS_API = 'http://localhost:3001/menu-groups-management';
const SCREENS_API = 'http://localhost:3001/screens-management';
const ACTIONS_API = 'http://localhost:3001/actions-management';
const SCREEN_ACTIONS_API = 'http://localhost:3001/screen-actions-management';
const ROLE_SCREEN_ACTIONS_API = 'http://localhost:3001/role-screen-actions-management';

type TabKey = 'assignment' | 'maintenance';
type DrawerMode = 'create-screen' | 'create-action' | 'link-action' | null;

type IconOption = {
  key: string;
  label: string;
  description: string;
  category: string;
};

const MENU_ICON_OPTIONS: IconOption[] = [
  // Seguridad y acceso
  { key: 'ShieldCheck', label: 'Seguridad de roles', description: 'Permisos, roles y controles de acceso', category: 'Seguridad' },
  { key: 'ShieldAlert', label: 'Alertas de seguridad', description: 'Riesgos, incidencias y eventos crÃƒÆ’Ã‚Â­ticos', category: 'Seguridad' },
  { key: 'Shield', label: 'PolÃƒÆ’Ã‚Â­ticas de seguridad', description: 'Configuraciones generales de seguridad', category: 'Seguridad' },
  { key: 'Lock', label: 'Bloqueos', description: 'Pantallas de bloqueo y restricciones', category: 'Seguridad' },
  { key: 'KeyRound', label: 'Credenciales', description: 'Llaves, tokens, contraseÃƒÆ’Ã‚Â±as y autenticaciÃƒÆ’Ã‚Â³n', category: 'Seguridad' },
  { key: 'Fingerprint', label: 'Identidad', description: 'ValidaciÃƒÆ’Ã‚Â³n de identidad y autenticaciÃƒÆ’Ã‚Â³n fuerte', category: 'Seguridad' },
  { key: 'UserCheck', label: 'AprobaciÃƒÆ’Ã‚Â³n de acceso', description: 'Aprobaciones y validaciones de usuario', category: 'Seguridad' },
  { key: 'UserX', label: 'RevocaciÃƒÆ’Ã‚Â³n de acceso', description: 'Bloquear o retirar acceso', category: 'Seguridad' },

  // OrganizaciÃƒÆ’Ã‚Â³n y empresa
  { key: 'Building2', label: 'Empresas', description: 'Empresas, filiales o unidades organizacionales', category: 'OrganizaciÃƒÆ’Ã‚Â³n' },
  { key: 'Building', label: 'Sedes', description: 'Sucursales y sedes fÃƒÆ’Ã‚Â­sicas', category: 'OrganizaciÃƒÆ’Ã‚Â³n' },
  { key: 'MapPin', label: 'Ubicaciones', description: 'Ubicaciones geogrÃƒÆ’Ã‚Â¡ficas y centros', category: 'OrganizaciÃƒÆ’Ã‚Â³n' },
  { key: 'Network', label: 'Estructura organizacional', description: 'JerarquÃƒÆ’Ã‚Â­as y relaciones organizativas', category: 'OrganizaciÃƒÆ’Ã‚Â³n' },
  { key: 'Briefcase', label: 'Cargos', description: 'Cargos y puestos de trabajo', category: 'OrganizaciÃƒÆ’Ã‚Â³n' },
  { key: 'Users', label: 'Colaboradores', description: 'GestiÃƒÆ’Ã‚Â³n de empleados y equipos', category: 'OrganizaciÃƒÆ’Ã‚Â³n' },
  { key: 'UserCog', label: 'Perfiles de usuario', description: 'ConfiguraciÃƒÆ’Ã‚Â³n de perfiles y atributos', category: 'OrganizaciÃƒÆ’Ã‚Â³n' },
  { key: 'UserPlus', label: 'Alta de usuarios', description: 'Registro e incorporaciÃƒÆ’Ã‚Â³n de personal', category: 'OrganizaciÃƒÆ’Ã‚Â³n' },

  // OperaciÃƒÆ’Ã‚Â³n y actividad
  { key: 'Clock3', label: 'Asistencia y marcaciones', description: 'Control de tiempo y asistencia', category: 'OperaciÃƒÆ’Ã‚Â³n' },
  { key: 'CalendarDays', label: 'Calendarios', description: 'Calendarios laborales y planificaciÃƒÆ’Ã‚Â³n', category: 'OperaciÃƒÆ’Ã‚Â³n' },
  { key: 'CalendarClock', label: 'Turnos', description: 'PlanificaciÃƒÆ’Ã‚Â³n y control de turnos', category: 'OperaciÃƒÆ’Ã‚Â³n' },
  { key: 'AlarmClockCheck', label: 'Cumplimiento horario', description: 'ValidaciÃƒÆ’Ã‚Â³n de puntualidad y reglas', category: 'OperaciÃƒÆ’Ã‚Â³n' },
  { key: 'ClipboardCheck', label: 'Aprobaciones', description: 'Flujos de aprobaciÃƒÆ’Ã‚Â³n operativa', category: 'OperaciÃƒÆ’Ã‚Â³n' },
  { key: 'FileCheck', label: 'Solicitudes', description: 'GestiÃƒÆ’Ã‚Â³n de solicitudes y permisos', category: 'OperaciÃƒÆ’Ã‚Â³n' },
  { key: 'Workflow', label: 'Flujos', description: 'Procesos y automatizaciones', category: 'OperaciÃƒÆ’Ã‚Â³n' },
  { key: 'Cog', label: 'ConfiguraciÃƒÆ’Ã‚Â³n operativa', description: 'ParÃƒÆ’Ã‚Â¡metros funcionales del negocio', category: 'OperaciÃƒÆ’Ã‚Â³n' },

  // Datos y reportes
  { key: 'BarChart3', label: 'Reportes', description: 'Reportes, mÃƒÆ’Ã‚Â©tricas y analÃƒÆ’Ã‚Â­tica', category: 'Datos y Reportes' },
  { key: 'PieChart', label: 'Indicadores', description: 'KPI y paneles de control', category: 'Datos y Reportes' },
  { key: 'LineChart', label: 'Tendencias', description: 'Series de tiempo y evoluciÃƒÆ’Ã‚Â³n', category: 'Datos y Reportes' },
  { key: 'Table', label: 'Tablas de datos', description: 'Consultas tabulares y listados', category: 'Datos y Reportes' },
  { key: 'Database', label: 'Datos maestros', description: 'CatÃƒÆ’Ã‚Â¡logos y entidades maestras', category: 'Datos y Reportes' },
  { key: 'FileSpreadsheet', label: 'Exportaciones', description: 'Excel, CSV y salidas tabulares', category: 'Datos y Reportes' },
  { key: 'Search', label: 'BÃƒÆ’Ã‚Âºsqueda', description: 'ExploraciÃƒÆ’Ã‚Â³n y consulta de informaciÃƒÆ’Ã‚Â³n', category: 'Datos y Reportes' },
  { key: 'Filter', label: 'Filtros', description: 'Filtros y segmentaciÃƒÆ’Ã‚Â³n de datos', category: 'Datos y Reportes' },

  // ComunicaciÃƒÆ’Ã‚Â³n e idioma
  { key: 'Bell', label: 'Notificaciones', description: 'Alertas del sistema y avisos', category: 'ComunicaciÃƒÆ’Ã‚Â³n' },
  { key: 'Mail', label: 'MensajerÃƒÆ’Ã‚Â­a', description: 'Mensajes por correo y bandeja interna', category: 'ComunicaciÃƒÆ’Ã‚Â³n' },
  { key: 'MessageSquare', label: 'Mensajes', description: 'Plantillas y claves de mensajes', category: 'ComunicaciÃƒÆ’Ã‚Â³n' },
  { key: 'Languages', label: 'Idiomas', description: 'GestiÃƒÆ’Ã‚Â³n de idiomas y traducciones', category: 'ComunicaciÃƒÆ’Ã‚Â³n' },
  { key: 'Globe2', label: 'Multilenguaje', description: 'Contenido internacionalizado', category: 'ComunicaciÃƒÆ’Ã‚Â³n' },

  // AdministraciÃƒÆ’Ã‚Â³n tÃƒÆ’Ã‚Â©cnica
  { key: 'Settings', label: 'ConfiguraciÃƒÆ’Ã‚Â³n general', description: 'Ajustes globales del sistema', category: 'AdministraciÃƒÆ’Ã‚Â³n tÃƒÆ’Ã‚Â©cnica' },
  { key: 'Settings2', label: 'ParÃƒÆ’Ã‚Â¡metros avanzados', description: 'Configuraciones tÃƒÆ’Ã‚Â©cnicas especÃƒÆ’Ã‚Â­ficas', category: 'AdministraciÃƒÆ’Ã‚Â³n tÃƒÆ’Ã‚Â©cnica' },
  { key: 'Server', label: 'Servicios', description: 'Servicios backend e integraciones', category: 'AdministraciÃƒÆ’Ã‚Â³n tÃƒÆ’Ã‚Â©cnica' },
  { key: 'Cloud', label: 'Integraciones cloud', description: 'Conectores y servicios externos', category: 'AdministraciÃƒÆ’Ã‚Â³n tÃƒÆ’Ã‚Â©cnica' },
  { key: 'HardDrive', label: 'Almacenamiento', description: 'Rutas, archivos y repositorios', category: 'AdministraciÃƒÆ’Ã‚Â³n tÃƒÆ’Ã‚Â©cnica' },
  { key: 'Cpu', label: 'Procesamiento', description: 'Procesos y ejecuciÃƒÆ’Ã‚Â³n de tareas', category: 'AdministraciÃƒÆ’Ã‚Â³n tÃƒÆ’Ã‚Â©cnica' },
  { key: 'Wrench', label: 'Mantenimiento', description: 'Herramientas y tareas de soporte', category: 'AdministraciÃƒÆ’Ã‚Â³n tÃƒÆ’Ã‚Â©cnica' },
  { key: 'Bug', label: 'DiagnÃƒÆ’Ã‚Â³stico', description: 'DepuraciÃƒÆ’Ã‚Â³n, trazas e incidencias', category: 'AdministraciÃƒÆ’Ã‚Â³n tÃƒÆ’Ã‚Â©cnica' },
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
  const { getScreenByPath } = usePermissions();
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

  const [actionForm, setActionForm] = useState({
    action_key: '',
    action_name: '',
  });

  const [linkForm, setLinkForm] = useState({
    screen_id: '',
    action_id: '',
    ui_element_key: '',
  });

  const activeScreens = useMemo(() => screens.filter((s) => s.is_active), [screens]);
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
    activeScreens.forEach((screen) => {
      if (!map[screen.menu_group_id]) map[screen.menu_group_id] = [];
      map[screen.menu_group_id].push(screen);
    });
    Object.keys(map).forEach((key) => {
      map[key] = map[key].sort((a, b) => a.sort_order - b.sort_order || a.screen_name.localeCompare(b.screen_name));
    });
    return map;
  }, [menuGroups, activeScreens]);

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

  const actionsNotLinkedToScreen = useMemo(() => {
    const linked = new Set((screenActionsByScreen[linkForm.screen_id] || []).map((sa) => sa.action_id));
    return activeActionsCatalog.filter((action) => !linked.has(action.id));
  }, [screenActionsByScreen, linkForm.screen_id, activeActionsCatalog]);

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

  const loadCatalogs = async () => {
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
      if (!groupsRes.ok) throw new Error(groupsData.error || 'Error cargando grupos de menÃƒÆ’Ã‚Âº');
      if (!screensRes.ok) throw new Error(screensData.error || 'Error cargando pantallas');
      if (!actionsRes.ok) throw new Error(actionsData.error || 'Error cargando acciones');
      if (!screenActionsRes.ok) throw new Error(screenActionsData.error || 'Error cargando relaciones pantalla-acciÃƒÆ’Ã‚Â³n');

      const loadedTenants: Tenant[] = tenantsData.tenants || [];
      const loadedRoles: Role[] = rolesData.roles || [];
      const loadedGroups: MenuGroup[] = (groupsData.menuGroups || []).filter((g: MenuGroup) => g.is_active);
      const loadedScreens: Screen[] = screensData.screens || [];
      const loadedActions: ActionItem[] = actionsData.actions || [];
      const loadedScreenActions: ScreenAction[] = screenActionsData.screenActions || [];

      setTenants(loadedTenants);
      setRoles(loadedRoles);
      setMenuGroups(loadedGroups);
      setScreens(loadedScreens);
      setActionsCatalog(loadedActions);
      setAllScreenActions(loadedScreenActions);

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

  const openDrawer = (mode: DrawerMode) => {
    setDrawerMode(mode);
    setError(null);
    setSuccess(null);
    if (mode === 'create-screen') {
      setScreenForm((prev) => ({ ...prev, menu_group_id: selectedMenuGroup || prev.menu_group_id }));
    }
    if (mode === 'link-action') {
      setLinkForm((prev) => ({ ...prev, screen_id: selectedScreen || prev.screen_id }));
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

  const createAction = async () => {
    if (!actionForm.action_key.trim() || !actionForm.action_name.trim()) {
      setError('action_key y action_name son obligatorios.');
      return;
    }
    setWorking(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        action_key: actionForm.action_key.trim().toUpperCase(),
        action_name: actionForm.action_name.trim(),
        is_active: true,
      };
      const res = await fetch(ACTIONS_API, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creando acciÃƒÆ’Ã‚Â³n');
      setSuccess('AcciÃƒÆ’Ã‚Â³n creada correctamente.');
      setActionForm({ action_key: '', action_name: '' });
      await loadCatalogs();
      closeDrawer();
    } catch (e: any) {
      setError(e.message || 'Error creando acciÃƒÆ’Ã‚Â³n');
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
      const existing = allScreenActions.find(
        (sa) => sa.screen_id === linkForm.screen_id && sa.action_id === linkForm.action_id
      );

      if (existing) {
        if (!existing.is_active) {
          const reactivate = await fetch(`${SCREEN_ACTIONS_API}/${existing.id}/status`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ is_active: true }),
          });
          const reactivateData = await reactivate.json();
          if (!reactivate.ok) throw new Error(reactivateData.error || 'Error reactivando relaciÃƒÆ’Ã‚Â³n');
          setSuccess('RelaciÃƒÆ’Ã‚Â³n pantalla-acciÃƒÆ’Ã‚Â³n reactivada.');
        } else {
          setSuccess('La relaciÃƒÆ’Ã‚Â³n pantalla-acciÃƒÆ’Ã‚Â³n ya existe.');
        }
      } else {
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
        if (!res.ok) throw new Error(data.error || 'Error vinculando acciÃƒÆ’Ã‚Â³n');
        setSuccess('AcciÃƒÆ’Ã‚Â³n vinculada correctamente a la pantalla.');
      }

      await loadCatalogs();
      closeDrawer();
    } catch (e: any) {
      setError(e.message || 'Error vinculando acciÃƒÆ’Ã‚Â³n');
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
      if (!res.ok) throw new Error(data.error || 'Error quitando acciÃƒÆ’Ã‚Â³n de pantalla');

      setLocalPerms((prev) => ({ ...prev, [screenActionId]: false }));
      setDirty(true);
      setSuccess('AcciÃƒÆ’Ã‚Â³n quitada de la pantalla (relaciÃƒÆ’Ã‚Â³n desactivada, no eliminada).');
      await loadCatalogs();
    } catch (e: any) {
      setError(e.message || 'Error quitando acciÃƒÆ’Ã‚Â³n');
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
      if (!res.ok) throw new Error(data.error || 'Error actualizando estado de acciÃƒÆ’Ã‚Â³n');

      if (!isActive) {
        setLocalPerms((prev) => ({ ...prev, [screenActionId]: false }));
        setDirty(true);
      }
      setSuccess(isActive ? 'AcciÃƒÆ’Ã‚Â³n reactivada en la pantalla.' : 'AcciÃƒÆ’Ã‚Â³n quitada de la pantalla.');
      await loadCatalogs();
    } catch (e: any) {
      setError(e.message || 'Error actualizando acciÃƒÆ’Ã‚Â³n');
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
    () => activeScreens.find((screen) => screen.id === selectedScreen) || null,
    [activeScreens, selectedScreen]
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
              <label className="block text-xs text-gray-500 mb-1">Grupo de menÃƒÆ’Ã‚Âº</label>
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

    if (drawerMode === 'create-action') {
      return (
        <>
          <h3 className="text-base font-semibold text-gray-900 mb-3">Nueva AcciÃƒÆ’Ã‚Â³n</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">action_key</label>
              <input
                value={actionForm.action_key}
                onChange={(e) => setActionForm((prev) => ({ ...prev, action_key: e.target.value.toUpperCase() }))}
                placeholder="EXPORT"
                className="w-full px-3 py-2 text-sm border rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">action_name</label>
              <input
                value={actionForm.action_name}
                onChange={(e) => setActionForm((prev) => ({ ...prev, action_name: e.target.value }))}
                placeholder="Exportar"
                className="w-full px-3 py-2 text-sm border rounded-lg"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-5">
            <button onClick={closeDrawer} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={createAction}
              disabled={working}
              className="px-3 py-2 text-sm text-white bg-[#0074D9] rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {working ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </>
      );
    }

    return (
      <>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Vincular AcciÃƒÆ’Ã‚Â³n a Pantalla</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Pantalla</label>
            <select
              value={linkForm.screen_id}
              onChange={(e) => setLinkForm((prev) => ({ ...prev, screen_id: e.target.value, action_id: '' }))}
              className="w-full px-3 py-2 text-sm border rounded-lg"
            >
              <option value="">Selecciona pantalla</option>
              {activeScreens.map((screen) => (
                <option key={screen.id} value={screen.id}>
                  {screen.screen_name} ({screen.screen_key})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">AcciÃƒÆ’Ã‚Â³n</label>
            <select
              value={linkForm.action_id}
              onChange={(e) => setLinkForm((prev) => ({ ...prev, action_id: e.target.value }))}
              className="w-full px-3 py-2 text-sm border rounded-lg"
            >
              <option value="">Selecciona acciÃƒÆ’Ã‚Â³n</option>
              {actionsNotLinkedToScreen.map((action) => (
                <option key={action.id} value={action.id}>
                  {action.action_name} ({action.action_key})
                </option>
              ))}
            </select>
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
    <div className="relative flex flex-col h-full gap-4 p-6">
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

      <div className="px-1 py-1">
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

      <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {activeTab === 'assignment' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
          <div className="bg-white rounded-xl border overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2 text-sm font-medium text-gray-700">
              <LayoutList className="w-4 h-4" />
              Grupos de Menú
            </div>
            <div className="overflow-auto p-2 space-y-1">
              {menuGroups.map((group) => {
                const status = menuGroupStatus.find((item) => item.groupId === group.id);
                const assigned = status?.assigned || false;
                return (
                  <button
                    key={group.id}
                    onClick={() => setSelectedMenuGroup(group.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border ${
                      selectedMenuGroup === group.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">{group.menu_group_name}</p>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded ${
                          assigned ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {assigned ? 'Pertenece' : 'Disponible'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{group.menu_group_key}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {status?.allowed || 0}/{status?.total || 0} acciones habilitadas
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-2 text-sm font-medium text-gray-700">
              <Monitor className="w-4 h-4" />
              Pantallas del Grupo
            </div>
            <div className="overflow-auto p-2 space-y-1">
              {(screensByGroup[selectedMenuGroup] || []).map((screen) => {
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
                      <p className="text-sm font-medium text-gray-900">{screen.screen_name}</p>
                      <p className="text-xs text-gray-600">{screen.menu_label || '-'}</p>
                      <p className="text-xs text-gray-500">{screen.screen_key}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {count.allowed}/{count.total} acciones
                      </p>
                    </button>
                    <div className="flex items-center gap-1 mt-2">
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
            <div className="overflow-auto divide-y divide-gray-100">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
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
            <div className="overflow-auto p-2 space-y-1">
              {activeScreens.map((screen) => (
                <button
                  key={screen.id}
                  onClick={() => {
                    setSelectedMenuGroup(screen.menu_group_id);
                    setSelectedScreen(screen.id);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg border ${
                    selectedScreen === screen.id
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">{screen.screen_name}</p>
                  <p className="text-xs text-gray-500">{screen.screen_key}</p>
                  <p className="text-xs text-gray-400">{screen.route_path || 'Sin ruta'}</p>
                </button>
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
                  onClick={() => openDrawer('create-action')}
                  className="text-xs px-2 py-1 rounded border hover:bg-gray-100"
                >
                  + AcciÃƒÆ’Ã‚Â³n
                </button>
                <button
                  onClick={() => openDrawer('link-action')}
                  className="text-xs px-2 py-1 rounded border hover:bg-gray-100"
                >
                  + Vincular
                </button>
              </div>
            </div>
            <div className="overflow-auto divide-y divide-gray-100">
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
                  Selecciona una pantalla para ver sus acciones vinculadas.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {dirty && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
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



