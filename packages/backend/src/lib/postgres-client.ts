import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { pool } from './db.js';
import { hashPassword, passwordHashNeedsUpgrade, verifyPassword } from './password-security.js';
import { loadAuthenticationPolicy } from './authentication-policy.js';

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

interface CompatResult<T = any> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

interface OrderOptions {
  ascending?: boolean;
}

interface UpsertOptions {
  onConflict?: string;
  ignoreDuplicates?: boolean;
}

interface AuthUser {
  id: string;
  email: string;
  created_at?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, any>;
  auth_version?: number;
}

type Filter =
  | { kind: 'eq'; column: string; value: any }
  | { kind: 'neq'; column: string; value: any }
  | { kind: 'gte'; column: string; value: any }
  | { kind: 'is'; column: string; value: any }
  | { kind: 'in'; column: string; value: any[] }
  | { kind: 'raw'; sql: string; values?: any[] };

let usersPasswordColumnCache: 'password' | 'pasword' | null | undefined;

function requiredAuthEnvironment(name: string, minLength = 1): string {
  const value = String(process.env[name] || '').trim();
  if (value.length < minLength) {
    throw new Error(`${name} debe estar configurado${minLength > 1 ? ` con al menos ${minLength} caracteres` : ''}`);
  }
  return value;
}

export function assertAuthConfiguration(): void {
  requiredAuthEnvironment('JWT_SECRET', 32);
  requiredAuthEnvironment('JWT_ISSUER');
  requiredAuthEnvironment('JWT_AUDIENCE');
}

async function getUsersPasswordColumn(): Promise<'password' | 'pasword' | null> {
  if (usersPasswordColumnCache !== undefined) {
    return usersPasswordColumnCache;
  }

  const { rows } = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name IN ('password', 'pasword')
    `
  );

  const columnNames = rows.map((r: any) => String(r.column_name));
  if (columnNames.includes('password')) {
    usersPasswordColumnCache = 'password';
    return usersPasswordColumnCache;
  }
  if (columnNames.includes('pasword')) {
    usersPasswordColumnCache = 'pasword';
    return usersPasswordColumnCache;
  }

  usersPasswordColumnCache = null;
  return usersPasswordColumnCache;
}

function quoteIdent(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function quoteTablePath(path: string): string {
  const parts = path.split('.');
  return parts.map(quoteIdent).join('.');
}

function normalizeSelectColumns(columns: string | null | undefined): string {
  if (!columns || columns.trim() === '*' || columns.trim() === '') return '*';
  // Postgres relational select syntax is not SQL; fallback to all columns.
  if (/[!:()]/.test(columns)) return '*';

  const parts = columns
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return '*';
  if (parts.some(p => p.includes(' ') || p.includes('->'))) return '*';

  return parts
    .map(p => {
      if (p === '*') return '*';
      return quoteIdent(p);
    })
    .join(', ');
}

function asError(error: unknown): { message: string; code?: string } {
  if (error && typeof error === 'object' && 'message' in error) {
    const e = error as any;
    return { message: String(e.message), code: e.code ? String(e.code) : undefined };
  }
  return { message: String(error) };
}

class QueryBuilder<T = any> implements PromiseLike<CompatResult<T>> {
  private table: string;
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private selectClause = '*';
  private returningClause = '*';
  private useReturning = false;
  private payload: Record<string, any> | Record<string, any>[] | null = null;
  private upsertOptions: UpsertOptions = {};
  private filters: Filter[] = [];
  private orders: Array<{ column: string; ascending: boolean }> = [];
  private rowLimit: number | null = null;
  private expectSingle = false;
  private allowNoRows = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = '*'): QueryBuilder<T> {
    if (this.action === 'insert' || this.action === 'update' || this.action === 'upsert' || this.action === 'delete') {
      this.useReturning = true;
      this.returningClause = normalizeSelectColumns(columns);
      return this;
    }

    this.action = 'select';
    this.selectClause = normalizeSelectColumns(columns);
    return this;
  }

  insert(values: Record<string, any> | Record<string, any>[]): QueryBuilder<T> {
    this.action = 'insert';
    this.payload = values;
    return this;
  }

  update(values: Record<string, any>): QueryBuilder<T> {
    this.action = 'update';
    this.payload = values;
    return this;
  }

  upsert(values: Record<string, any> | Record<string, any>[], options?: UpsertOptions): QueryBuilder<T> {
    this.action = 'upsert';
    this.payload = values;
    this.upsertOptions = options || {};
    return this;
  }

  delete(): QueryBuilder<T> {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ kind: 'eq', column, value });
    return this;
  }

  neq(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ kind: 'neq', column, value });
    return this;
  }

  gte(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ kind: 'gte', column, value });
    return this;
  }

  is(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ kind: 'is', column, value });
    return this;
  }

  in(column: string, values: any[]): QueryBuilder<T> {
    this.filters.push({ kind: 'in', column, value: values });
    return this;
  }

  not(column: string, operator: string, value: any): QueryBuilder<T> {
    if (operator.toLowerCase() === 'is') {
      this.filters.push({
        kind: 'raw',
        sql: `${quoteIdent(column)} IS NOT NULL`,
      });
      return this;
    }
    if (operator.toLowerCase() === 'eq') {
      this.filters.push({
        kind: 'raw',
        sql: `${quoteIdent(column)} <> $1`,
        values: [value],
      });
      return this;
    }
    throw new Error(`Operator not supported in .not(): ${operator}`);
  }

  order(column: string, options?: OrderOptions): QueryBuilder<T> {
    this.orders.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(limit: number): QueryBuilder<T> {
    this.rowLimit = limit;
    return this;
  }

  single(): QueryBuilder<T> {
    this.expectSingle = true;
    this.allowNoRows = false;
    this.rowLimit = 1;
    return this;
  }

  maybeSingle(): QueryBuilder<T> {
    this.expectSingle = true;
    this.allowNoRows = true;
    this.rowLimit = 1;
    return this;
  }

  private buildWhere(startIndex = 1): { sql: string; values: any[]; nextIndex: number } {
    const clauses: string[] = [];
    const values: any[] = [];
    let i = startIndex;

    for (const filter of this.filters) {
      if (filter.kind === 'eq') {
        clauses.push(`${quoteIdent(filter.column)} = $${i++}`);
        values.push(filter.value);
        continue;
      }
      if (filter.kind === 'neq') {
        clauses.push(`${quoteIdent(filter.column)} <> $${i++}`);
        values.push(filter.value);
        continue;
      }
      if (filter.kind === 'gte') {
        clauses.push(`${quoteIdent(filter.column)} >= $${i++}`);
        values.push(filter.value);
        continue;
      }
      if (filter.kind === 'is') {
        if (filter.value === null) {
          clauses.push(`${quoteIdent(filter.column)} IS NULL`);
        } else if (typeof filter.value === 'boolean') {
          clauses.push(`${quoteIdent(filter.column)} IS ${filter.value ? 'TRUE' : 'FALSE'}`);
        } else {
          clauses.push(`${quoteIdent(filter.column)} IS $${i++}`);
          values.push(filter.value);
        }
        continue;
      }
      if (filter.kind === 'in') {
        const arr = filter.value || [];
        if (!Array.isArray(arr) || arr.length === 0) {
          clauses.push('1=0');
        } else {
          const placeholders = arr.map(() => `$${i++}`).join(', ');
          clauses.push(`${quoteIdent(filter.column)} IN (${placeholders})`);
          values.push(...arr);
        }
        continue;
      }
      if (filter.kind === 'raw') {
        let sql = filter.sql;
        if (filter.values && filter.values.length > 0) {
          for (const v of filter.values) {
            sql = sql.replace('$1', `$${i++}`);
            values.push(v);
          }
        }
        clauses.push(sql);
      }
    }

    return {
      sql: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '',
      values,
      nextIndex: i,
    };
  }

  private buildOrder(): string {
    if (this.orders.length === 0) return '';
    const orderSql = this.orders
      .map(o => `${quoteIdent(o.column)} ${o.ascending ? 'ASC' : 'DESC'}`)
      .join(', ');
    return ` ORDER BY ${orderSql}`;
  }

  private buildLimit(): string {
    if (this.rowLimit == null) return '';
    return ` LIMIT ${Math.max(0, this.rowLimit)}`;
  }

  private async execute(): Promise<CompatResult<T>> {
    try {
      const tableSql = quoteTablePath(this.table);

      if (this.action === 'select') {
        const where = this.buildWhere();
        const sql = `SELECT ${this.selectClause} FROM ${tableSql}${where.sql}${this.buildOrder()}${this.buildLimit()}`;
        const { rows } = await pool.query(sql, where.values);
        return this.finalizeRows(rows);
      }

      if (this.action === 'insert' || this.action === 'upsert') {
        if (!this.payload) throw new Error('Missing payload for insert/upsert');
        const rowsPayload = Array.isArray(this.payload) ? this.payload : [this.payload];
        if (rowsPayload.length === 0) {
          return this.finalizeRows([]);
        }

        const columns = Object.keys(rowsPayload[0]);
        if (columns.length === 0) throw new Error('Insert payload must include columns');
        const quotedColumns = columns.map(quoteIdent).join(', ');

        let paramIndex = 1;
        const values: any[] = [];
        const valuesSql = rowsPayload
          .map(row => {
            const placeholders = columns.map(col => {
              values.push((row as any)[col] ?? null);
              return `$${paramIndex++}`;
            });
            return `(${placeholders.join(', ')})`;
          })
          .join(', ');

        let sql = `INSERT INTO ${tableSql} (${quotedColumns}) VALUES ${valuesSql}`;

        if (this.action === 'upsert') {
          const conflictColumn = this.upsertOptions.onConflict;
          if (conflictColumn) {
            const conflictCols = conflictColumn.split(',').map(c => quoteIdent(c.trim())).join(', ');
            if (this.upsertOptions.ignoreDuplicates) {
              sql += ` ON CONFLICT (${conflictCols}) DO NOTHING`;
            } else {
              const updateCols = columns
                .filter(c => !conflictColumn.split(',').map(x => x.trim()).includes(c))
                .map(c => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`)
                .join(', ');
              sql += updateCols
                ? ` ON CONFLICT (${conflictCols}) DO UPDATE SET ${updateCols}`
                : ` ON CONFLICT (${conflictCols}) DO NOTHING`;
            }
          }
        }

        if (this.useReturning) {
          sql += ` RETURNING ${this.returningClause}`;
        }

        const { rows } = await pool.query(sql, values);
        return this.finalizeRows(rows);
      }

      if (this.action === 'update') {
        if (!this.payload || Array.isArray(this.payload)) throw new Error('Invalid update payload');
        const payload = this.payload as Record<string, any>;
        const keys = Object.keys(payload);
        if (keys.length === 0) throw new Error('Update payload must include columns');

        const setValues: any[] = [];
        const setSql = keys
          .map((k, idx) => {
            setValues.push(payload[k] ?? null);
            return `${quoteIdent(k)} = $${idx + 1}`;
          })
          .join(', ');

        const where = this.buildWhere(keys.length + 1);
        let sql = `UPDATE ${tableSql} SET ${setSql}${where.sql}`;
        if (this.useReturning) {
          sql += ` RETURNING ${this.returningClause}`;
        }

        const { rows } = await pool.query(sql, [...setValues, ...where.values]);
        return this.finalizeRows(rows);
      }

      if (this.action === 'delete') {
        const where = this.buildWhere();
        let sql = `DELETE FROM ${tableSql}${where.sql}`;
        if (this.useReturning) {
          sql += ` RETURNING ${this.returningClause}`;
        }
        const { rows } = await pool.query(sql, where.values);
        return this.finalizeRows(rows);
      }

      throw new Error(`Unsupported action: ${this.action}`);
    } catch (error) {
      return {
        data: null,
        error: asError(error),
      };
    }
  }

  private finalizeRows(rows: any[]): CompatResult<T> {
    if (!this.expectSingle) {
      return { data: rows as any, error: null };
    }

    if (rows.length === 0) {
      if (this.allowNoRows) {
        return { data: null, error: null };
      }
      return {
        data: null,
        error: { message: 'No rows found', code: 'PGRST116' },
      };
    }

    return { data: rows[0] as any, error: null };
  }

  then<TResult1 = CompatResult<T>, TResult2 = never>(
    onfulfilled?: ((value: CompatResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected as any);
  }
}

async function createAccessToken(user: AuthUser): Promise<string> {
  const jwtSecret = requiredAuthEnvironment('JWT_SECRET', 32);
  const jwtIssuer = requiredAuthEnvironment('JWT_ISSUER');
  const jwtAudience = requiredAuthEnvironment('JWT_AUDIENCE');
  const policy = await loadAuthenticationPolicy(pool);
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      av: Number(user.auth_version || 1),
    },
    jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: `${policy.sessionTimeoutMinutes}m`,
      issuer: jwtIssuer,
      audience: jwtAudience,
      jwtid: randomUUID(),
    }
  );
}

async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const decoded = jwt.verify(token, requiredAuthEnvironment('JWT_SECRET', 32), {
      algorithms: ['HS256'],
      issuer: requiredAuthEnvironment('JWT_ISSUER'),
      audience: requiredAuthEnvironment('JWT_AUDIENCE'),
      clockTolerance: 5,
    }) as jwt.JwtPayload;
    const userId = String(decoded.sub || '');
    const tokenAuthVersion = Number(decoded.av);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) return null;
    if (!Number.isInteger(tokenAuthVersion) || tokenAuthVersion < 1) return null;

    const { rows } = await pool.query(
      `
        SELECT user_row.id, user_row.auth_user_id, user_row.email, user_row.username,
               user_row.display_name, user_row.tenant_id, user_row.created_at,
               user_row.auth_version, user_row.must_change_password
        FROM public.users user_row
        JOIN public.tenants tenant
          ON tenant.id = user_row.tenant_id
         AND tenant.is_active = true
        WHERE user_row.auth_user_id = $1::uuid
          AND user_row.is_active = true
        LIMIT 1
      `,
      [userId]
    );

    if (!rows[0]) return null;
    if (Number(rows[0].auth_version || 1) !== tokenAuthVersion) return null;

    return {
      id: rows[0].auth_user_id,
      email: rows[0].email,
      created_at: rows[0].created_at,
      email_confirmed_at: null,
      auth_version: Number(rows[0].auth_version || 1),
      user_metadata: {
        username: rows[0].username,
        display_name: rows[0].display_name,
        tenant_id: rows[0].tenant_id,
        user_id: rows[0].id,
        must_change_password: Boolean(rows[0].must_change_password),
      },
    };
  } catch {
    return null;
  }
}

async function signInWithPassword(email: string, password: string): Promise<CompatResult<{ session: any; user: AuthUser }>> {
  try {
    const policy = await loadAuthenticationPolicy(pool);
    const passwordColumn = await getUsersPasswordColumn();
    if (!passwordColumn) {
      return {
        data: null,
        error: { message: 'No existe columna password/pasword en users', code: 'AUTH_PASSWORD_COLUMN_MISSING' },
      };
    }

    const { rows } = await pool.query(
      `
        SELECT user_row.id, user_row.auth_user_id, user_row.email, user_row.username,
               user_row.display_name, user_row.tenant_id, user_row.created_at,
               user_row.auth_version,
               user_row.must_change_password,
               user_row.failed_login_attempts,
               user_row.locked_until,
               user_row.${quoteIdent(passwordColumn)} AS password_hash
        FROM public.users user_row
        JOIN public.tenants tenant
          ON tenant.id = user_row.tenant_id
         AND tenant.is_active = true
        WHERE (lower(user_row.email) = lower($1) OR lower(user_row.username) = lower($1))
          AND user_row.is_active = true
        LIMIT 2
      `,
      [email]
    );

    const candidate = rows.length === 1 ? rows[0] : null;
    if (candidate?.locked_until && new Date(candidate.locked_until).getTime() > Date.now()) {
      return {
        data: null,
        error: { message: 'Invalid login credentials', code: 'AUTH_INVALID_CREDENTIALS' },
      };
    }

    if (candidate?.locked_until) {
      await pool.query(
        `UPDATE public.users
         SET failed_login_attempts = 0, locked_until = NULL, updated_at = now()
         WHERE id = $1::uuid AND locked_until <= now()`,
        [candidate.id]
      );
      candidate.failed_login_attempts = 0;
      candidate.locked_until = null;
    }

    if (!candidate || !(await verifyPassword(password, candidate.password_hash))) {
      if (candidate) {
        await pool.query(
          `
            UPDATE public.users
            SET failed_login_attempts = failed_login_attempts + 1,
                locked_until = CASE
                  WHEN failed_login_attempts + 1 >= $2::integer
                    THEN now() + make_interval(mins => $3::integer)
                  ELSE NULL
                END,
                updated_at = now()
            WHERE id = $1::uuid
          `,
          [candidate.id, policy.maxLoginAttempts, policy.loginLockoutMinutes]
        );
      }
      return {
        data: null,
        error: { message: 'Invalid login credentials', code: 'AUTH_INVALID_CREDENTIALS' },
      };
    }

    if (passwordHashNeedsUpgrade(candidate.password_hash)) {
      await pool.query(
        `
          UPDATE public.users
          SET ${quoteIdent(passwordColumn)} = $1, updated_at = now()
          WHERE id = $2::uuid
        `,
        [await hashPassword(password), candidate.id]
      );
    }
    await pool.query(
      `UPDATE public.users
       SET last_login_at = now(), failed_login_attempts = 0, locked_until = NULL, updated_at = now()
       WHERE id = $1::uuid`,
      [candidate.id]
    );

    const user: AuthUser = {
      id: candidate.auth_user_id,
      email: candidate.email,
      created_at: candidate.created_at,
      email_confirmed_at: null,
      auth_version: Number(candidate.auth_version || 1),
      user_metadata: {
        username: candidate.username,
        display_name: candidate.display_name,
        tenant_id: candidate.tenant_id,
        user_id: candidate.id,
        must_change_password: Boolean(candidate.must_change_password),
      },
    };

    const accessToken = await createAccessToken(user);

    return {
      data: {
        user,
        session: {
          access_token: accessToken,
          token_type: 'bearer',
          user,
        },
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: asError(error) };
  }
}

class AuthAdminCompat {
  async listUsers(): Promise<CompatResult<{ users: AuthUser[] }>> {
    try {
      const { rows } = await pool.query(
        `
          SELECT id, auth_user_id, email, username, display_name, tenant_id, created_at
          FROM users
          WHERE is_active = TRUE
          ORDER BY created_at DESC
        `
      );
      return {
        data: {
          users: rows.map(r => ({
            id: r.auth_user_id || r.id,
            email: r.email,
            created_at: r.created_at,
            email_confirmed_at: null,
            user_metadata: {
              username: r.username,
              display_name: r.display_name,
              tenant_id: r.tenant_id,
              user_id: r.id,
            },
          })),
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: asError(error) };
    }
  }

  async createUser(payload: {
    email: string;
    password: string;
    email_confirm?: boolean;
    user_metadata?: Record<string, Json>;
  }): Promise<CompatResult<{ user: AuthUser }>> {
    try {
      const newAuthUserId = randomUUID();
      const nowIso = new Date().toISOString();
      return {
        data: {
          user: {
            id: newAuthUserId,
            email: payload.email,
            created_at: nowIso,
            email_confirmed_at: payload.email_confirm ? nowIso : null,
            user_metadata: payload.user_metadata || {},
            auth_version: 1,
          },
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: asError(error) };
    }
  }

  async updateUserById(
    userId: string,
    payload: { email?: string; password?: string; must_change_password?: boolean }
  ): Promise<CompatResult<{ user: AuthUser }>> {
    try {
      const passwordColumn = await getUsersPasswordColumn();
      const sets: string[] = [];
      const values: any[] = [];
      let i = 1;

      if (payload.email != null) {
        sets.push(`email = $${i++}`);
        values.push(payload.email);
      }
      if (payload.password != null) {
        if (!passwordColumn) {
          return { data: null, error: { message: 'No existe columna password/pasword en users' } };
        }
        const policy = await loadAuthenticationPolicy(pool);
        if (payload.password.length < policy.passwordMinLength) {
          return {
            data: null,
            error: {
              message: `La contrasena debe tener al menos ${policy.passwordMinLength} caracteres`,
              code: 'AUTH_PASSWORD_POLICY',
            },
          };
        }
        sets.push(`${quoteIdent(passwordColumn)} = $${i++}`);
        values.push(await hashPassword(payload.password));
        sets.push('auth_version = auth_version + 1');
      }
      if (payload.must_change_password != null) {
        sets.push(`must_change_password = $${i++}`);
        values.push(Boolean(payload.must_change_password));
      }
      sets.push(`updated_at = NOW()`);

      if (sets.length === 1) {
        return { data: null, error: { message: 'No changes provided' } };
      }

      values.push(userId);
      const { rows } = await pool.query(
        `
          UPDATE users
          SET ${sets.join(', ')}
          WHERE auth_user_id = $${i}
          RETURNING id, auth_user_id, email, username, display_name, tenant_id, created_at, auth_version
        `,
        values
      );

      if (!rows[0]) {
        return { data: null, error: { message: 'User not found', code: 'AUTH_USER_NOT_FOUND' } };
      }

      return {
        data: {
          user: {
            id: rows[0].auth_user_id || rows[0].id,
            email: rows[0].email,
            created_at: rows[0].created_at,
            email_confirmed_at: null,
            auth_version: Number(rows[0].auth_version || 1),
            user_metadata: {
              username: rows[0].username,
              display_name: rows[0].display_name,
              tenant_id: rows[0].tenant_id,
              user_id: rows[0].id,
            },
          },
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: asError(error) };
    }
  }

  async deleteUser(userId: string): Promise<CompatResult<null>> {
    try {
      await pool.query(
        `
          UPDATE users
          SET is_active = FALSE, auth_version = auth_version + 1, updated_at = NOW()
          WHERE auth_user_id = $1
        `,
        [userId]
      );
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: asError(error) };
    }
  }
}

class PostgresCompatClient {
  auth = {
    admin: new AuthAdminCompat(),
    getUser: async (
      token: string
    ): Promise<{ data: { user: AuthUser | null }; error: { message: string; code?: string } | null }> => {
      const user = await verifyToken(token);
      if (!user) {
        return {
          data: { user: null },
          error: { message: 'Unauthorized', code: 'AUTH_INVALID_TOKEN' },
        };
      }
      return { data: { user }, error: null };
    },
    signInWithPassword: async (payload: { email: string; password: string }) => {
      return signInWithPassword(payload.email, payload.password);
    },
  };

  from<T = any>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(table);
  }
}

export function createDbClient(_url?: string, _key?: string, _options?: any): PostgresCompatClient {
  return new PostgresCompatClient();
}

export async function authLogin(email: string, password: string) {
  return signInWithPassword(email, password);
}

export async function authVerifyToken(token: string) {
  return verifyToken(token);
}
