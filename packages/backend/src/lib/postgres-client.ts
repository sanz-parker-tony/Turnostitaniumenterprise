import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'crypto';
import { pool } from './db.js';

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
}

type Filter =
  | { kind: 'eq'; column: string; value: any }
  | { kind: 'neq'; column: string; value: any }
  | { kind: 'is'; column: string; value: any }
  | { kind: 'in'; column: string; value: any[] }
  | { kind: 'raw'; sql: string; values?: any[] };

const jwtSecret = process.env.JWT_SECRET || 'turnos-titanium-dev-secret';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '12h';
let usersPasswordColumnCache: 'password' | 'pasword' | null | undefined;

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
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

function createAccessToken(user: AuthUser): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn as jwt.SignOptions['expiresIn'] }
  );
}

async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
    const userId = String(decoded.sub || '');
    if (!userId) return null;

    const { rows } = await pool.query(
      `
        SELECT id, auth_user_id, email, username, display_name, tenant_id, created_at
        FROM users
        WHERE (auth_user_id = $1 OR id = $1)
          AND is_active = TRUE
        LIMIT 1
      `,
      [userId]
    );

    if (!rows[0]) return null;
    const resolvedAuthUserId = rows[0].auth_user_id || rows[0].id;

    // Si no estaba vinculado, normalizamos auth_user_id para mantener consistencia.
    if (!rows[0].auth_user_id) {
      await pool.query(
        `
          UPDATE users
          SET auth_user_id = $1, updated_at = NOW()
          WHERE id = $2 AND auth_user_id IS NULL
        `,
        [resolvedAuthUserId, rows[0].id]
      );
    }

    return {
      id: resolvedAuthUserId,
      email: rows[0].email,
      created_at: rows[0].created_at,
      email_confirmed_at: null,
      user_metadata: {
        username: rows[0].username,
        display_name: rows[0].display_name,
        tenant_id: rows[0].tenant_id,
        user_id: rows[0].id,
      },
    };
  } catch {
    return null;
  }
}

async function signInWithPassword(email: string, password: string): Promise<CompatResult<{ session: any; user: AuthUser }>> {
  try {
    const passwordColumn = await getUsersPasswordColumn();
    if (!passwordColumn) {
      return {
        data: null,
        error: { message: 'No existe columna password/pasword en users', code: 'AUTH_PASSWORD_COLUMN_MISSING' },
      };
    }

    const passwordHash = sha256Hex(password);
    const { rows } = await pool.query(
      `
        SELECT id, auth_user_id, email, username, display_name, tenant_id, created_at
        FROM users
        WHERE (lower(email) = lower($1) OR lower(username) = lower($1))
          AND lower(${quoteIdent(passwordColumn)}) = lower($2)
          AND is_active = TRUE
        LIMIT 1
      `,
      [email, passwordHash]
    );

    if (!rows[0]) {
      return {
        data: null,
        error: { message: 'Invalid login credentials', code: 'AUTH_INVALID_CREDENTIALS' },
      };
    }

    const resolvedAuthUserId = rows[0].auth_user_id || rows[0].id;

    // Si auth_user_id viene vacío, lo vinculamos al id del usuario.
    if (!rows[0].auth_user_id) {
      await pool.query(
        `
          UPDATE users
          SET auth_user_id = $1, updated_at = NOW()
          WHERE id = $2 AND auth_user_id IS NULL
        `,
        [resolvedAuthUserId, rows[0].id]
      );
    }

    const user: AuthUser = {
      id: resolvedAuthUserId,
      email: rows[0].email,
      created_at: rows[0].created_at,
      email_confirmed_at: null,
      user_metadata: {
        username: rows[0].username,
        display_name: rows[0].display_name,
        tenant_id: rows[0].tenant_id,
        user_id: rows[0].id,
      },
    };

    const accessToken = createAccessToken(user);

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
    payload: { email?: string; password?: string }
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
        sets.push(`${quoteIdent(passwordColumn)} = $${i++}`);
        values.push(sha256Hex(payload.password));
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
          RETURNING id, auth_user_id, email, username, display_name, tenant_id, created_at
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
          SET is_active = FALSE, updated_at = NOW()
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
