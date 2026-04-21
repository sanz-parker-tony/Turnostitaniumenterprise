/**
 * bootstrap-screens.ts
 * Turnos Titanium Enterprise - Bootstrap de Pantallas
 *
 * Descripción:
 *   Auto-crea pantallas del sistema que deben existir (ej: Parámetros)
 *   Idempotente: puede ejecutarse N veces sin duplicar datos
 */
import { Request, Response } from 'express';
/**
 * POST /bootstrap/ensure-system-settings-screen
 */
export declare function ensureSystemSettingsScreen(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /bootstrap/ensure-maintenance-screens
 * Crea pantallas de Roles, Alcances y Usuarios en el menú MAINT
 */
export declare function ensureMaintenanceManagementScreens(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * POST /bootstrap/ensure-security-screens
 * Crea las pantallas de Seguridad: Menús, Pantallas, Acciones, etc.
 */
export declare function ensureSecurityManagementScreens(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=bootstrap-screens.d.ts.map