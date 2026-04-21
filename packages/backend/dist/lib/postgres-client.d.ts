type Json = string | number | boolean | null | {
    [key: string]: Json;
} | Json[];
interface CompatResult<T = any> {
    data: T | null;
    error: {
        message: string;
        code?: string;
    } | null;
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
declare class QueryBuilder<T = any> implements PromiseLike<CompatResult<T>> {
    private table;
    private action;
    private selectClause;
    private returningClause;
    private useReturning;
    private payload;
    private upsertOptions;
    private filters;
    private orders;
    private rowLimit;
    private expectSingle;
    private allowNoRows;
    constructor(table: string);
    select(columns?: string): QueryBuilder<T>;
    insert(values: Record<string, any> | Record<string, any>[]): QueryBuilder<T>;
    update(values: Record<string, any>): QueryBuilder<T>;
    upsert(values: Record<string, any> | Record<string, any>[], options?: UpsertOptions): QueryBuilder<T>;
    delete(): QueryBuilder<T>;
    eq(column: string, value: any): QueryBuilder<T>;
    neq(column: string, value: any): QueryBuilder<T>;
    is(column: string, value: any): QueryBuilder<T>;
    in(column: string, values: any[]): QueryBuilder<T>;
    not(column: string, operator: string, value: any): QueryBuilder<T>;
    order(column: string, options?: OrderOptions): QueryBuilder<T>;
    limit(limit: number): QueryBuilder<T>;
    single(): QueryBuilder<T>;
    maybeSingle(): QueryBuilder<T>;
    private buildWhere;
    private buildOrder;
    private buildLimit;
    private execute;
    private finalizeRows;
    then<TResult1 = CompatResult<T>, TResult2 = never>(onfulfilled?: ((value: CompatResult<T>) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null): Promise<TResult1 | TResult2>;
}
declare class AuthAdminCompat {
    listUsers(): Promise<CompatResult<{
        users: AuthUser[];
    }>>;
    createUser(payload: {
        email: string;
        password: string;
        email_confirm?: boolean;
        user_metadata?: Record<string, Json>;
    }): Promise<CompatResult<{
        user: AuthUser;
    }>>;
    updateUserById(userId: string, payload: {
        email?: string;
        password?: string;
    }): Promise<CompatResult<{
        user: AuthUser;
    }>>;
    deleteUser(userId: string): Promise<CompatResult<null>>;
}
declare class PostgresCompatClient {
    auth: {
        admin: AuthAdminCompat;
        getUser: (token: string) => Promise<{
            data: {
                user: AuthUser | null;
            };
            error: {
                message: string;
                code?: string;
            } | null;
        }>;
        signInWithPassword: (payload: {
            email: string;
            password: string;
        }) => Promise<CompatResult<{
            session: any;
            user: AuthUser;
        }>>;
    };
    from<T = any>(table: string): QueryBuilder<T>;
}
export declare function createDbClient(_url?: string, _key?: string, _options?: any): PostgresCompatClient;
export declare function authLogin(email: string, password: string): Promise<CompatResult<{
    session: any;
    user: AuthUser;
}>>;
export declare function authVerifyToken(token: string): Promise<AuthUser | null>;
export {};
//# sourceMappingURL=postgres-client.d.ts.map