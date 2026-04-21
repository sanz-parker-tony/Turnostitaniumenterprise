/**
 * API Configuration Helper
 * Centraliza las URLs del backend local y permite fácil cambio
 * 
 * Cuando uses el backend local, las llamadas irán a http://localhost:3001
 * En producción, se puede cambiar a URLs de ApiClient o cualquier otro servidor
 */

export const API_CONFIG = {
  // Backend local (desarrollo)
  BASE_URL: 'http://localhost:3001',
  
  // O usa vite proxy: http://localhost:3001 redirige a http://localhost:3001
  // BASE_URL: 'http://localhost:3001',
  
  endpoints: {
    auth: {
      createSystemAdmin: '/auth/create-system-admin',
      login: '/auth/login',
      logout: '/auth/logout',
      getBootstrapToken: '/auth/bootstrap-token',
    },
    bootstrap: {
      getWizardState: '/bootstrap/wizard-state',
      getSystemLanguages: '/bootstrap/system-languages',
      step1Tenant: '/bootstrap/step-1',
      step2Admin: '/bootstrap/step-2',
      catalogs: '/bootstrap/catalogs',
    },
    kiosk: {
      identify: '/kiosk/identify',
      checkIn: '/kiosk/check-in',
      checkOut: '/kiosk/check-out',
    },
    users: {
      profile: '/users/profile',
      list: '/users',
      getById: (id: string) => `/users/${id}`,
    },
    tenants: {
      list: '/tenants',
      getById: (id: string) => `/tenants/${id}`,
      settings: (id: string) => `/tenants/${id}/settings`,
    },
    settings: {
      system: '/settings/system',
      getEffective: '/settings/effective',
      getAllEffective: '/settings/all-effective',
    },
    maintenance: {
      roles: '/maintenance/roles',
      users: '/maintenance/users',
      screens: '/maintenance/screens',
      actions: '/maintenance/actions',
      menuGroups: '/maintenance/menu-groups',
      lookups: '/maintenance/lookups',
    },
  },
} as const;

/**
 * Construye una URL completa del endpoint
 * @param endpoint - Endpoint relativo (ej: '/auth/login')
 * @returns URL completa (ej: 'http://localhost:3001/auth/login')
 */
export function buildURL(endpoint: string): string {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}

/**
 * Realiza un fetch con manejo de errores común
 */
export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit & {
    token?: string;
  } = {}
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { token, ...fetchOptions } = options;
    const headers = new Headers(fetchOptions.headers || {});
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(buildURL(endpoint), {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Función específica para crear el Admin del Sistema
 */
export async function createSystemAdmin(): Promise<{ data: any | null; error: Error | null }> {
  return apiCall(API_CONFIG.endpoints.auth.createSystemAdmin, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/**
 * Función específica para obtener wizard state del bootstrap
 */
export async function getWizardState(): Promise<{ data: any | null; error: Error | null }> {
  return apiCall(API_CONFIG.endpoints.bootstrap.getWizardState);
}

/**
 * Función específica para identificar en kiosk
 */
export async function kioskIdentify(
  pin: string,
  anonKey?: string
): Promise<{ data: any | null; error: Error | null }> {
  return apiCall(API_CONFIG.endpoints.kiosk.identify, {
    method: 'POST',
    body: JSON.stringify({ pin }),
    token: anonKey,
  });
}
