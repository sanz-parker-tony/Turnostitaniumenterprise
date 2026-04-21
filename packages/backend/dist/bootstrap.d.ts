import { Request, Response } from 'express';
declare const router: import("express-serve-static-core").Router;
export declare function ensureSystemAdmin(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getWizardState(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getBootstrapToken(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getSystemLanguages(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function bootstrapStep1Tenant(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function bootstrapStep2Admin(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export default router;
//# sourceMappingURL=bootstrap.d.ts.map