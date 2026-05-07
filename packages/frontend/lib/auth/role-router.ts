/**
 * Role Router - Turnos Titanium Enterprise
 * Fuente de verdad única para decidir destino post-login
 * 
 * REGLAS:
 * 1. Sin sesión → /login
 * 2. Si roles incluye EMPLOYEE → /kiosk/punch
 * 3. Caso contrario → /dashboard (con home específico por rol)
 * 4. Si roles vacíos → /login con warning
 */

// ============================================================================
// MAPEO DE ROLES A HOME SCREEN
// ============================================================================

/**
 * ESTÁNDAR DEFINITIVO:
 * - TODOS los roles van a /dashboard (incluye EMPLOYEE)
 * - El contenido de /dashboard varía según rol
 * - EMPLOYEE ve tarjetas + CTAs a /kiosk/*
 */
export const ROLE_HOME_ROUTES = {
  TENANT_ADMIN: '/dashboard',
  SYSTEM_ADMIN: '/dashboard',
  RRHH_ADMIN: '/dashboard',
  SUPERVISOR: '/dashboard',
  EMPLOYEE: '/dashboard',  // ✅ También va a dashboard, NO a /kiosk/punch
} as const;

// Fallback si el rol no está en el mapeo
export const DEFAULT_DASHBOARD_HOME = '/dashboard';

// ============================================================================
// MAPEO AUTOMÁTICO: SCREEN_KEY → ROUTE_PATH
// ============================================================================

/**
 * Convención de mapeo automático:
 * 
 * DASH_*  → /dashboard/...
 * SEC_*   → /dashboard/security/...
 * CONF_*  → /dashboard/config/...
 * MAINT_* → /dashboard/maintenance/...
 * ORG_*   → /dashboard/org/...
 * EMPL_*  → /dashboard/employees/...
 * ATT_*   → /dashboard/attendance/...
 * RPT_*   → /dashboard/reports/...
 * KIOSK_* → /kiosk/...
 */
export const SCREEN_ROUTE_MAP: Record<string, string> = {
  // ========== DASHBOARD ==========
  'DASH_MAIN': '/dashboard',
  'DASH_ALERTS': '/dashboard/alerts',
  'DASH_TRENDS': '/dashboard/trends',

  // ========== SECURITY ==========
  'SEC_MENU_GROUPS': '/dashboard/security/menu-groups',
  'SEC_SCREENS': '/dashboard/security/screens',
  'SEC_ACTIONS': '/dashboard/security/actions',
  'SEC_SCREEN_ACTIONS': '/dashboard/security/screen-actions',
  'SEC_ROLES': '/dashboard/security/roles',
  'SEC_ROLE_PERMS': '/dashboard/security/role-permissions',
  'SEC_USER_ROLES': '/dashboard/security/user-roles',
  'SEC_SCOPES': '/dashboard/security/scopes',
  'SEC_COPY_PERMS': '/dashboard/security/copy-permissions',
  'SEC_AUDIT': '/dashboard/security/audit',
  'SEC_TENANT_MEMBERS': '/dashboard/security/tenant-members',
  'SEC_LOGIN_SESSIONS': '/dashboard/security/login-sessions',
  'SEC_SUBSCRIPTION_PLANS': '/dashboard/security/subscription-plans',
  'SUBSCRIPTION_PLAN_MANAGEMENT': '/dashboard/security/subscription-plans',

  // ========== MAINTENANCE ==========
  'MAINT_CATALOGS': '/dashboard/maintenance/catalogs',
  'PARAMETERS_MANAGEMENT': '/dashboard/maintenance/parameters',
  'CATALOG_MANAGEMENT': '/dashboard/maintenance/catalogs',
  'ATTENDANCE_EVENTS_MANAGEMENT': '/dashboard/maintenance/attendance-events',
  'MAINT_HOLIDAYS': '/dashboard/maintenance/holidays',
  'MAINT_ATT_MOVEMENTS': '/dashboard/maintenance/attendance-movements',
  'MAINT_ATT_EVENTS': '/dashboard/maintenance/attendance-events',
  'MAINT_JUSTIFICATIONS': '/dashboard/maintenance/justification-types',
  'MAINT_MESSAGES': '/dashboard/maintenance/messages',

  // ========== CONFIGURATION ==========
  'CONF_PARAMS': '/dashboard/config/parameters',
  'CONF_SHIFTS': '/dashboard/config/shift-constructor',
  'CONF_SHIFT_CONSTRUCTOR': '/dashboard/config/shift-constructor',
  'CONF_WORK_PATTERNS': '/dashboard/config/work-patterns',
  'CONF_SURCHARGES': '/dashboard/config/surcharges',
  'CONF_DEVICES': '/dashboard/config/devices',
  'CONF_ATT_PROCESS': '/dashboard/config/attendance-processes',
  'CONF_TENANT_SETTINGS': '/dashboard/config/tenant-settings',
  'SHIFT_CONSTRUCTOR_MANAGEMENT': '/dashboard/config/shift-constructor',

  // ========== ORGANIZATION ==========
  'ORG_STRUCTURE': '/dashboard/org/structure',
  'ORG_COMPANIES': '/dashboard/org/companies',
  'ORG_WORK_LOCATIONS': '/dashboard/org/work-locations',
  'ORG_DEPARTMENTS': '/dashboard/org/departments',
  'ORG_AREAS': '/dashboard/org/areas',
  'ORG_WORK_GROUPS': '/dashboard/org/work-groups',
  'ORG_PAYROLL_GROUPS': '/dashboard/org/payroll-groups',
  'ORG_JOB_TITLES': '/dashboard/org/job-titles',
  'ORG_COST_CENTERS': '/dashboard/org/cost-centers',
  'ORG_EMPLOYEE_PROFILES': '/dashboard/org/employee-profiles',
  'EMPLOYEE_PROFILES': '/dashboard/org/employee-profiles',
  'ORG_EMPLOYEE_COMPANIES': '/dashboard/org/employee-companies',

  // ========== EMPLOYEES ==========
  'EMPL_LIST': '/dashboard/employees',
  'EMPL_ASSIGN_COMPANY': '/dashboard/employees/assign-company',
  'EMPL_PROFILES': '/dashboard/employees/profiles',
  'EMPL_PROFILE_SETTINGS': '/dashboard/employees/profile-settings',
  'EMPL_ABSENCE_REQUESTS': '/dashboard/employees/absence-requests',
  'EMPL_DOCUMENTS': '/dashboard/employees/documents',
  'EMPL_SHIFT_PLANNING': '/dashboard/employees/shift-planning',
  'EMPLOYEE_SHIFT_PLANNING': '/dashboard/employees/shift-planning',

  // ========== ATTENDANCE ==========
  'ATT_TIME_PUNCHES': '/dashboard/attendance/time-punches',
  'ATT_SHIFT_PLANS': '/dashboard/attendance/shift-plans',
  'ATT_PROCESS_RUNS': '/dashboard/attendance/process-runs',
  'ATT_CALC_RESULTS': '/dashboard/attendance/calc-results',
  'ATT_APPROVALS': '/dashboard/attendance/approvals',
  'ATT_ANOMALIES': '/dashboard/attendance/anomalies',

  // ========== REPORTS ==========
  'RPT_CATALOG': '/dashboard/reports/catalog',
  'RPT_PARAMETERS': '/dashboard/reports/parameters',
  'RPT_PERMISSIONS': '/dashboard/reports/permissions',
  'RPT_EXECUTIONS': '/dashboard/reports/executions',

  // ========== KIOSK (fuera de dashboard) ==========
  'KIOSK_PUNCH': '/kiosk/punch',
  'KIOSK_REGULARIZATION': '/kiosk/regularization',
  'KIOSK_SHIFT_CHANGE': '/kiosk/shift-change',
  'KIOSK_PERMISSION': '/kiosk/permission',
  'KIOSK_JUSTIFICATION': '/kiosk/justification',
  'KIOSK_REQUESTS': '/kiosk/requests',
};

// ============================================================================
// FUNCIÓN: Obtener ruta home por roles del usuario
// ============================================================================

/**
 * Devuelve la ruta home según los roles del usuario
 * 
 * ESTÁNDAR DEFINITIVO:
 * - TODOS los roles van a /dashboard (incluye EMPLOYEE)
 * - El dashboard renderiza contenido diferente según rol
 * - EMPLOYEE ve dashboard con CTAs a /kiosk/*
 * 
 * @param roles - Array de role_key del usuario
 * @returns Ruta de destino (siempre /dashboard)
 */
export function getHomeRouteByRoles(roles: string[]): string {
  // Validación: roles vacíos → login
  if (!roles || roles.length === 0) {
    console.warn('[ROLE-ROUTER] Roles vacíos, redirigiendo a /login');
    return '/login';
  }

  // TODOS los roles van a /dashboard
  console.log('[ROLE-ROUTER] Redirigiendo a /dashboard (roles:', roles.join(', ') + ')');
  return '/dashboard';
}

// ============================================================================
// FUNCIÓN: Determinar si un usuario debe ir a KIOSK
// ============================================================================

/**
 * Determina si un usuario debe ser redirigido a KIOSK
 * 
 * @param roles - Array de role_key del usuario
 * @returns true si el usuario es EMPLOYEE
 */
export function isKioskUser(roles: string[]): boolean {
  return roles.includes('EMPLOYEE');
}

// ============================================================================
// FUNCIÓN: Obtener primera pantalla permitida para un rol
// ============================================================================

/**
 * Obtiene la primera pantalla permitida del menú para un rol específico
 * Útil para generar rutas dinámicas basadas en permisos reales
 * 
 * @param menuScreens - Array de pantallas permitidas del usuario
 * @param preferredGroup - Grupo de menú preferido (opcional)
 * @returns Ruta de la primera pantalla encontrada o fallback
 */
export function getFirstAllowedScreen(
  menuScreens: Array<{ screen_key: string; route_path: string; menu_group_key: string }>,
  preferredGroup?: string
): string {
  if (!menuScreens || menuScreens.length === 0) {
    console.warn('[ROLE-ROUTER] Sin pantallas permitidas, usando fallback');
    return DEFAULT_DASHBOARD_HOME;
  }

  // Si hay grupo preferido, buscar primera pantalla de ese grupo
  if (preferredGroup) {
    const screenInGroup = menuScreens.find(s => s.menu_group_key === preferredGroup);
    if (screenInGroup) {
      console.log(`[ROLE-ROUTER] Primera pantalla en grupo ${preferredGroup}: ${screenInGroup.route_path}`);
      return screenInGroup.route_path;
    }
  }

  // Caso contrario, retornar primera pantalla disponible
  const firstScreen = menuScreens[0];
  console.log(`[ROLE-ROUTER] Primera pantalla disponible: ${firstScreen.route_path}`);
  return firstScreen.route_path;
}
