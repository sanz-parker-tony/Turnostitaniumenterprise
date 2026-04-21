import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'crypto';
import { pool } from './db.js';
const jwtSecret = process.env.JWT_SECRET || 'turnos-titanium-dev-secret';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '12h';
let usersPasswordColumnCache;
function sha256Hex(value) {
    return createHash('sha256').update(value, 'utf8').digest('hex');
}
async function getUsersPasswordColumn() {
    if (usersPasswordColumnCache !== undefined) {
        return usersPasswordColumnCache;
    }
    const { rows } = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name IN ('password', 'pasword')
    `);
    const columnNames = rows.map((r) => String(r.column_name));
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
function quoteIdent(identifier) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
        throw new Error(`Invalid SQL identifier: ${identifier}`);
    }
    return `"${identifier}"`;
}
function quoteTablePath(path) {
    const parts = path.split('.');
    return parts.map(quoteIdent).join('.');
}
function normalizeSelectColumns(columns) {
    if (!columns || columns.trim() === '*' || columns.trim() === '')
        return '*';
    // Postgres relational select syntax is not SQL; fallback to all columns.
    if (/[!:()]/.test(columns))
        return '*';
    const parts = columns
        .split(',')
        .map(p => p.trim())
        .filter(Boolean);
    if (parts.length === 0)
        return '*';
    if (parts.some(p => p.includes(' ') || p.includes('->')))
        return '*';
    return parts
        .map(p => {
        if (p === '*')
            return '*';
        return quoteIdent(p);
    })
        .join(', ');
}
function asError(error) {
    if (error && typeof error === 'object' && 'message' in error) {
        const e = error;
        return { message: String(e.message), code: e.code ? String(e.code) : undefined };
    }
    return { message: String(error) };
}
class QueryBuilder {
    constructor(table) {
        this.action = 'select';
        this.selectClause = '*';
        this.returningClause = '*';
        this.useReturning = false;
        this.payload = null;
        this.upsertOptions = {};
        this.filters = [];
        this.orders = [];
        this.rowLimit = null;
        this.expectSingle = false;
        this.allowNoRows = false;
        this.table = table;
    }
    select(columns = '*') {
        if (this.action === 'insert' || this.action === 'update' || this.action === 'upsert' || this.action === 'delete') {
            this.useReturning = true;
            this.returningClause = normalizeSelectColumns(columns);
            return this;
        }
        this.action = 'select';
        this.selectClause = normalizeSelectColumns(columns);
        return this;
    }
    insert(values) {
        this.action = 'insert';
        this.payload = values;
        return this;
    }
    update(values) {
        this.action = 'update';
        this.payload = values;
        return this;
    }
    upsert(values, options) {
        this.action = 'upsert';
        this.payload = values;
        this.upsertOptions = options || {};
        return this;
    }
    delete() {
        this.action = 'delete';
        return this;
    }
    eq(column, value) {
        this.filters.push({ kind: 'eq', column, value });
        return this;
    }
    neq(column, value) {
        this.filters.push({ kind: 'neq', column, value });
        return this;
    }
    is(column, value) {
        this.filters.push({ kind: 'is', column, value });
        return this;
    }
    in(column, values) {
        this.filters.push({ kind: 'in', column, value: values });
        return this;
    }
    not(column, operator, value) {
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
    order(column, options) {
        this.orders.push({ column, ascending: options?.ascending !== false });
        return this;
    }
    limit(limit) {
        this.rowLimit = limit;
        return this;
    }
    single() {
        this.expectSingle = true;
        this.allowNoRows = false;
        this.rowLimit = 1;
        return this;
    }
    maybeSingle() {
        this.expectSingle = true;
        this.allowNoRows = true;
        this.rowLimit = 1;
        return this;
    }
    buildWhere(startIndex = 1) {
        const clauses = [];
        const values = [];
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
                }
                else if (typeof filter.value === 'boolean') {
                    clauses.push(`${quoteIdent(filter.column)} IS ${filter.value ? 'TRUE' : 'FALSE'}`);
                }
                else {
                    clauses.push(`${quoteIdent(filter.column)} IS $${i++}`);
                    values.push(filter.value);
                }
                continue;
            }
            if (filter.kind === 'in') {
                const arr = filter.value || [];
                if (!Array.isArray(arr) || arr.length === 0) {
                    clauses.push('1=0');
                }
                else {
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
    buildOrder() {
        if (this.orders.length === 0)
            return '';
        const orderSql = this.orders
            .map(o => `${quoteIdent(o.column)} ${o.ascending ? 'ASC' : 'DESC'}`)
            .join(', ');
        return ` ORDER BY ${orderSql}`;
    }
    buildLimit() {
        if (this.rowLimit == null)
            return '';
        return ` LIMIT ${Math.max(0, this.rowLimit)}`;
    }
    async execute() {
        try {
            const tableSql = quoteTablePath(this.table);
            if (this.action === 'select') {
                const where = this.buildWhere();
                const sql = `SELECT ${this.selectClause} FROM ${tableSql}${where.sql}${this.buildOrder()}${this.buildLimit()}`;
                const { rows } = await pool.query(sql, where.values);
                return this.finalizeRows(rows);
            }
            if (this.action === 'insert' || this.action === 'upsert') {
                if (!this.payload)
                    throw new Error('Missing payload for insert/upsert');
                const rowsPayload = Array.isArray(this.payload) ? this.payload : [this.payload];
                if (rowsPayload.length === 0) {
                    return this.finalizeRows([]);
                }
                const columns = Object.keys(rowsPayload[0]);
                if (columns.length === 0)
                    throw new Error('Insert payload must include columns');
                const quotedColumns = columns.map(quoteIdent).join(', ');
                let paramIndex = 1;
                const values = [];
                const valuesSql = rowsPayload
                    .map(row => {
                    const placeholders = columns.map(col => {
                        values.push(row[col] ?? null);
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
                        }
                        else {
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
                if (!this.payload || Array.isArray(this.payload))
                    throw new Error('Invalid update payload');
                const payload = this.payload;
                const keys = Object.keys(payload);
                if (keys.length === 0)
                    throw new Error('Update payload must include columns');
                const setValues = [];
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
        }
        catch (error) {
            return {
                data: null,
                error: asError(error),
            };
        }
    }
    finalizeRows(rows) {
        if (!this.expectSingle) {
            return { data: rows, error: null };
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
        return { data: rows[0], error: null };
    }
    then(onfulfilled, onrejected) {
        return this.execute().then(onfulfilled, onrejected);
    }
}
function createAccessToken(user) {
    return jwt.sign({
        sub: user.id,
        email: user.email,
    }, jwtSecret, { expiresIn: jwtExpiresIn });
}
async function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, jwtSecret);
        const userId = String(decoded.sub || '');
        if (!userId)
            return null;
        const { rows } = await pool.query(`
        SELECT id, auth_user_id, email, username, display_name, tenant_id, created_at
        FROM users
        WHERE (auth_user_id = $1 OR id = $1)
          AND is_active = TRUE
        LIMIT 1
      `, [userId]);
        if (!rows[0])
            return null;
        const resolvedAuthUserId = rows[0].auth_user_id || rows[0].id;
        // Si no estaba vinculado, normalizamos auth_user_id para mantener consistencia.
        if (!rows[0].auth_user_id) {
            await pool.query(`
          UPDATE users
          SET auth_user_id = $1, updated_at = NOW()
          WHERE id = $2 AND auth_user_id IS NULL
        `, [resolvedAuthUserId, rows[0].id]);
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
    }
    catch {
        return null;
    }
}
async function signInWithPassword(email, password) {
    try {
        const passwordColumn = await getUsersPasswordColumn();
        if (!passwordColumn) {
            return {
                data: null,
                error: { message: 'No existe columna password/pasword en users', code: 'AUTH_PASSWORD_COLUMN_MISSING' },
            };
        }
        const passwordHash = sha256Hex(password);
        const { rows } = await pool.query(`
        SELECT id, auth_user_id, email, username, display_name, tenant_id, created_at
        FROM users
        WHERE (lower(email) = lower($1) OR lower(username) = lower($1))
          AND lower(${quoteIdent(passwordColumn)}) = lower($2)
          AND is_active = TRUE
        LIMIT 1
      `, [email, passwordHash]);
        if (!rows[0]) {
            return {
                data: null,
                error: { message: 'Invalid login credentials', code: 'AUTH_INVALID_CREDENTIALS' },
            };
        }
        const resolvedAuthUserId = rows[0].auth_user_id || rows[0].id;
        // Si auth_user_id viene vacío, lo vinculamos al id del usuario.
        if (!rows[0].auth_user_id) {
            await pool.query(`
          UPDATE users
          SET auth_user_id = $1, updated_at = NOW()
          WHERE id = $2 AND auth_user_id IS NULL
        `, [resolvedAuthUserId, rows[0].id]);
        }
        const user = {
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
    }
    catch (error) {
        return { data: null, error: asError(error) };
    }
}
class AuthAdminCompat {
    async listUsers() {
        try {
            const { rows } = await pool.query(`
          SELECT id, auth_user_id, email, username, display_name, tenant_id, created_at
          FROM users
          WHERE is_active = TRUE
          ORDER BY created_at DESC
        `);
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
        }
        catch (error) {
            return { data: null, error: asError(error) };
        }
    }
    async createUser(payload) {
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
        }
        catch (error) {
            return { data: null, error: asError(error) };
        }
    }
    async updateUserById(userId, payload) {
        try {
            const passwordColumn = await getUsersPasswordColumn();
            const sets = [];
            const values = [];
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
            const { rows } = await pool.query(`
          UPDATE users
          SET ${sets.join(', ')}
          WHERE auth_user_id = $${i}
          RETURNING id, auth_user_id, email, username, display_name, tenant_id, created_at
        `, values);
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
        }
        catch (error) {
            return { data: null, error: asError(error) };
        }
    }
    async deleteUser(userId) {
        try {
            await pool.query(`
          UPDATE users
          SET is_active = FALSE, updated_at = NOW()
          WHERE auth_user_id = $1
        `, [userId]);
            return { data: null, error: null };
        }
        catch (error) {
            return { data: null, error: asError(error) };
        }
    }
}
class PostgresCompatClient {
    constructor() {
        this.auth = {
            admin: new AuthAdminCompat(),
            getUser: async (token) => {
                const user = await verifyToken(token);
                if (!user) {
                    return {
                        data: { user: null },
                        error: { message: 'Unauthorized', code: 'AUTH_INVALID_TOKEN' },
                    };
                }
                return { data: { user }, error: null };
            },
            signInWithPassword: async (payload) => {
                return signInWithPassword(payload.email, payload.password);
            },
        };
    }
    from(table) {
        return new QueryBuilder(table);
    }
}
export function createDbClient(_url, _key, _options) {
    return new PostgresCompatClient();
}
export async function authLogin(email, password) {
    return signInWithPassword(email, password);
}
export async function authVerifyToken(token) {
    return verifyToken(token);
}
//# sourceMappingURL=postgres-client.js.map