import { Request, Response, NextFunction } from 'express';
declare const router: import("express-serve-static-core").Router;
export declare const requireAuth: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export default router;
//# sourceMappingURL=index.d.ts.map