import { Request, Response } from 'express';
declare const router: import("express-serve-static-core").Router;
/**
 * GET /tenant/settings
 * Obtener datos del tenant único (SYSTEM)
 */
export declare function getSystemTenantSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PUT /tenant/settings
 * Actualizar nombre del tenant único (SYSTEM)
 */
export declare function updateSystemTenantSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /tenants/:id
 */
export declare function getTenant(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PUT /tenants/:id
 */
export declare function updateTenant(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /tenants/:id/settings
 * Obtiene los overrides de settings del tenant
 */
export declare function getTenantSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /tenants/:id/settings
 * Crea un override de tenant
 */
export declare function createTenantSetting(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PUT /tenants/:id/settings/:setting_id
 * Actualiza el valor de un override de tenant
 */
export declare function updateTenantSetting(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * DELETE /tenants/:id/settings/:setting_id
 * Elimina el override de tenant
 */
export declare function deleteTenantSetting(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /tenants/:id/members
 */
export declare function getTenantMembers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /lookup-values/data-types
 */
export declare function getDataTypes(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * GET /tenants/:id/languages
 */
export declare function getTenantLanguages(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * PUT /tenants/:id/languages
 */
export declare function updateTenantLanguages(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /bootstrap/ensure-main-tenant
 * Asegurar que existe el tenant SYSTEM y su onboarding
 */
export declare function ensureMainTenant(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export default router;
//# sourceMappingURL=tenant-routes.d.ts.map