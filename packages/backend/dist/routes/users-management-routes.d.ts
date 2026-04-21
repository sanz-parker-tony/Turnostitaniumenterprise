/**
 * users-management-routes.ts
 * Turnos Titanium Enterprise
 *
 * CRUD para users, user_roles y user_role_scopes
 * Ubicación: Mantenimiento → Usuarios
 *
 * IMPORTANTE: Las rutas estáticas (/catalogs/*, /user-roles/*) van ANTES
 * de las rutas dinámicas (/:id, /:user_id/*) para que Express no capture
 * palabras como "catalogs" o "user-roles" como UUIDs.
 *
 * Política: NO se pueden eliminar registros.
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=users-management-routes.d.ts.map