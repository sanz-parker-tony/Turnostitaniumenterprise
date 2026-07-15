const DEFAULT_DEV_API_URL = 'http://localhost:3001';
const DEFAULT_PROD_API_URL = 'https://turnostitaniumenterprise-production.up.railway.app';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function resolveApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) return normalizeBaseUrl(envUrl);
  return import.meta.env.PROD ? DEFAULT_PROD_API_URL : DEFAULT_DEV_API_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
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

export function buildApiUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${normalizedEndpoint}`;
}

export const buildURL = buildApiUrl;

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

    const response = await fetch(buildApiUrl(endpoint), {
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

export async function createSystemAdmin(): Promise<{ data: any | null; error: Error | null }> {
  return apiCall(API_CONFIG.endpoints.auth.createSystemAdmin, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function getWizardState(): Promise<{ data: any | null; error: Error | null }> {
  return apiCall(API_CONFIG.endpoints.bootstrap.getWizardState);
}

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
