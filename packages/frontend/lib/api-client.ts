/**
 * Backend API compatibility layer.
 * Keeps a small subset of the old ApiClient API shape used by the frontend,
 * but all operations now go to local backend endpoints.
 */

type AuthUser = {
  id: string;
  email: string;
};

type AuthSession = {
  access_token: string;
  token_type?: string;
  user: AuthUser;
};

type QueryFilter =
  | { type: 'eq'; column: string; value: any }
  | { type: 'neq'; column: string; value: any }
  | { type: 'is'; column: string; value: any }
  | { type: 'in'; column: string; value: any[] }
  | { type: 'not'; column: string; operator: string; value: any };

type QueryOrder = {
  column: string;
  ascending?: boolean;
};

const TOKEN_KEY = 'tt-access-token';
const USER_KEY = 'tt-auth-user';

function getStoredSession(): AuthSession | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  if (!token || !rawUser) return null;

  try {
    const user = JSON.parse(rawUser) as AuthUser;
    return {
      access_token: token,
      token_type: 'bearer',
      user,
    };
  } catch {
    return null;
  }
}

function storeSession(session: AuthSession | null): void {
  if (!session) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // Keep old key cleanup for compatibility with legacy components
    localStorage.removeItem('tt-access-token');
    return;
  }

  localStorage.setItem(TOKEN_KEY, session.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  // Keep old key name so untouched components keep working
  localStorage.setItem('tt-access-token', session.access_token);
}

async function callBackend<T = any>(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {}
): Promise<{ data: T | null; error: any | null; status: number }> {
  const session = getStoredSession();
  const headers = new Headers(init.headers || {});

  headers.set('Content-Type', 'application/json');

  if (!init.skipAuth && session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  const response = await fetch(`http://localhost:3001${path}`, {
    ...init,
    headers,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      data: null,
      error: payload?.error || payload || { message: `HTTP ${response.status}` },
      status: response.status,
    };
  }

  return {
    data: (payload?.data ?? payload) as T,
    error: null,
    status: response.status,
  };
}

class QueryBuilder implements PromiseLike<{ data: any; error: any }> {
  private table: string;
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private selectClause: string = '*';
  private filters: QueryFilter[] = [];
  private orderBy: QueryOrder[] = [];
  private rowLimit: number | null = null;
  private payload: any = null;
  private upsertOptions: any = null;
  private asSingle = false;
  private asMaybeSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = '*') {
    this.selectClause = columns;
    return this;
  }

  insert(payload: any) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: any) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  upsert(payload: any, options?: any) {
    this.action = 'upsert';
    this.payload = payload;
    this.upsertOptions = options || null;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ type: 'neq', column, value });
    return this;
  }

  is(column: string, value: any) {
    this.filters.push({ type: 'is', column, value });
    return this;
  }

  in(column: string, value: any[]) {
    this.filters.push({ type: 'in', column, value });
    return this;
  }

  not(column: string, operator: string, value: any) {
    this.filters.push({ type: 'not', column, operator, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(value: number) {
    this.rowLimit = value;
    return this;
  }

  single() {
    this.asSingle = true;
    return this;
  }

  maybeSingle() {
    this.asMaybeSingle = true;
    return this;
  }

  private async execute(): Promise<{ data: any; error: any }> {
    const { data, error } = await callBackend('/db/query', {
      method: 'POST',
      body: JSON.stringify({
        table: this.table,
        action: this.action,
        select: this.selectClause,
        filters: this.filters,
        order: this.orderBy,
        limit: this.rowLimit,
        payload: this.payload,
        upsertOptions: this.upsertOptions,
        single: this.asSingle,
        maybeSingle: this.asMaybeSingle,
      }),
    });

    return { data, error };
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected as any);
  }
}

type AuthListener = (event: string, session: AuthSession | null) => void;
const listeners = new Set<AuthListener>();

function emit(event: string, session: AuthSession | null) {
  for (const listener of listeners) {
    listener(event, session);
  }
}

export const ApiClient = {
  auth: {
    async signInWithPassword(payload: { email: string; password: string }) {
      const { data, error } = await callBackend<{
        session: AuthSession;
        user: AuthUser;
      }>('/auth/login', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify(payload),
      });

      if (error || !data?.session) {
        return {
          data: { session: null, user: null },
          error: { message: error?.message || 'Invalid login credentials' },
        };
      }

      storeSession(data.session);
      emit('SIGNED_IN', data.session);
      return {
        data: {
          session: data.session,
          user: data.user,
        },
        error: null,
      };
    },

    async getSession() {
      return {
        data: { session: getStoredSession() },
        error: null,
      };
    },

    async refreshSession() {
      return {
        data: { session: getStoredSession() },
        error: null,
      };
    },

    async getUser(token?: string) {
      const current = getStoredSession();
      const accessToken = token || current?.access_token;
      if (!accessToken) {
        return { data: { user: null }, error: { message: 'No session' } };
      }

      const response = await fetch('http://localhost:3001/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return { data: { user: null }, error: { message: 'Unauthorized' } };
      }

      const payload = await response.json().catch(() => ({}));
      const user = payload?.user ?? null;
      return { data: { user }, error: null };
    },

    async signOut() {
      storeSession(null);
      emit('SIGNED_OUT', null);
      return { error: null };
    },

    onAuthStateChange(callback: AuthListener) {
      listeners.add(callback);
      const session = getStoredSession();
      callback('INITIAL_SESSION', session);

      return {
        data: {
          subscription: {
            unsubscribe: () => listeners.delete(callback),
          },
        },
      };
    },
  },

  from(table: string) {
    return new QueryBuilder(table);
  },

  async rpc() {
    return { data: null, error: { message: 'rpc is not implemented in backend compatibility mode' } };
  },
};

export const getSession = async () => ApiClient.auth.getSession();
export const getValidSession = async () => ApiClient.auth.getSession();

export const getUser = async () => {
  const { data, error } = await ApiClient.auth.getUser();
  return { user: data.user, error };
};

export const getCurrentUserProfile = async () => {
  const { data, error } = await callBackend('/users/profile');
  if (error) {
    return { profile: null, error };
  }
  return { profile: (data as any)?.profile || null, error: null };
};

