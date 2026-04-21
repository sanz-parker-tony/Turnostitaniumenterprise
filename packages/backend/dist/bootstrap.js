// ============================================================================
// bootstrap.ts
// Turnos Titanium Enterprise - Bootstrap del Sistema
// Convertido de Deno/Hono a Node.js/Express
// ============================================================================
import { Router } from 'express';
import { createDbClient } from './lib/postgres-client.js';
const router = Router();
const SYSTEM_ADMIN_EMAIL = 'system.admin@titanium-labs.com';
const SYSTEM_ADMIN_PASSWORD = 'Titanium2026!';
const TENANT_KEY = 'SYSTEM';
const ROLE_KEY = 'SYSTEM_ADMIN';
function getPostgresClient() {
    return createDbClient(process.env.Postgres_URL ?? '', process.env.Postgres_SERVICE_ROLE_KEY ?? '');
}
function getPostgresAnonClient() {
    return createDbClient(process.env.Postgres_URL ?? '', process.env.Postgres_ANON_KEY ?? '');
}
// ============================================================================
// POST /make-server-e19f2094/bootstrap/ensure-system-admin
// ============================================================================
export async function ensureSystemAdmin(req, res) {
    try {
        console.log('🔧 [BOOTSTRAP] Iniciando ensure-system-admin...');
        const PostgresUrl = process.env.Postgres_URL;
        const PostgresServiceKey = process.env.Postgres_SERVICE_ROLE_KEY;
        if (!PostgresUrl || !PostgresServiceKey) {
            console.error('❌ [BOOTSTRAP] Variables de entorno faltantes');
            return res.status(500).json({
                success: false,
                error: 'Missing required environment variables',
                details: 'Postgres_URL and Postgres_SERVICE_ROLE_KEY must be set',
            });
        }
        const Postgres = createDbClient(PostgresUrl, PostgresServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
        // ========================================================================
        // 1. VERIFICAR/CREAR USUARIO EN AUTH
        // ========================================================================
        let authUserId = null;
        let isNewUser = false;
        console.log(`🔍 [BOOTSTRAP] Verificando usuario Auth: ${SYSTEM_ADMIN_EMAIL}`);
        const { data: listData, error: listError } = await Postgres.auth.admin.listUsers();
        const existingUser = listData?.users?.find(u => u.email === SYSTEM_ADMIN_EMAIL);
        if (existingUser) {
            console.log('✅ [BOOTSTRAP] Usuario Auth ya existe:', existingUser.id);
            authUserId = existingUser.id;
        }
        else {
            console.log('🆕 [BOOTSTRAP] Creando usuario Auth...');
            const { data: newAuthUser, error: createUserError } = await Postgres.auth.admin.createUser({
                email: SYSTEM_ADMIN_EMAIL,
                password: SYSTEM_ADMIN_PASSWORD,
                email_confirm: true,
                user_metadata: {
                    display_name: 'System Administrator',
                    is_system_admin: true,
                },
            });
            if (createUserError || !newAuthUser?.user) {
                console.error('❌ [BOOTSTRAP] Error creando usuario Auth:', createUserError);
                return res.status(500).json({
                    success: false,
                    error: 'Error creando usuario Auth',
                    details: createUserError,
                });
            }
            authUserId = newAuthUser.user.id;
            isNewUser = true;
            console.log('✅ [BOOTSTRAP] Usuario Auth creado:', authUserId);
        }
        // ========================================================================
        // 2. UPSERT TENANT SYSTEM
        // ========================================================================
        console.log(`🔍 [BOOTSTRAP] Verificando tenant: ${TENANT_KEY}`);
        const { data: tenantData, error: tenantError } = await Postgres
            .from('tenants')
            .upsert({
            tenant_key: TENANT_KEY,
            tenant_name: 'Sistema Titanium',
            is_active: true,
        }, { onConflict: 'tenant_key' })
            .select('id')
            .single();
        if (tenantError || !tenantData) {
            console.error('❌ [BOOTSTRAP] Error creando/obteniendo tenant:', tenantError);
            return res.status(500).json({
                success: false,
                error: 'Error creando tenant SYSTEM',
                details: tenantError,
            });
        }
        const tenantId = tenantData.id;
        console.log('✅ [BOOTSTRAP] Tenant SYSTEM OK:', tenantId);
        // ========================================================================
        // 3. UPSERT ROL SYSTEM_ADMIN
        // ========================================================================
        console.log(`🔍 [BOOTSTRAP] Verificando rol: ${ROLE_KEY}`);
        const { data: roleData, error: roleError } = await Postgres
            .from('roles')
            .upsert({
            tenant_id: tenantId,
            role_key: ROLE_KEY,
            role_name: 'System Administrator',
            role_scope: 'SYSTEM',
            is_active: true,
            created_by: 'SYSTEM',
        }, { onConflict: 'tenant_id,role_key' })
            .select('id')
            .single();
        if (roleError || !roleData) {
            console.error('❌ [BOOTSTRAP] Error creando/obteniendo rol:', roleError);
            return res.status(500).json({
                success: false,
                error: 'Error creando rol SYSTEM_ADMIN',
                details: roleError,
            });
        }
        const roleId = roleData.id;
        console.log('✅ [BOOTSTRAP] Rol SYSTEM_ADMIN OK:', roleId);
        // ========================================================================
        // 4. CREAR USUARIO EN PUBLIC.USERS
        // ========================================================================
        console.log(`🔍 [BOOTSTRAP] Verificando usuario en public.users`);
        const { data: userData, error: userError } = await Postgres
            .from('users')
            .upsert({
            auth_user_id: authUserId,
            tenant_id: tenantId,
            username: 'system.admin',
            email: SYSTEM_ADMIN_EMAIL,
            display_name: 'System Administrator',
            is_active: true,
            created_by: 'SYSTEM',
        }, { onConflict: 'auth_user_id' })
            .select('id')
            .single();
        if (userError || !userData) {
            console.error('❌ [BOOTSTRAP] Error creando/actualizando public.users:', userError);
            return res.status(500).json({
                success: false,
                error: 'Error creando usuario en public.users',
                details: userError,
            });
        }
        const { error: syncPasswordError } = await Postgres.auth.admin.updateUserById(authUserId, {
            password: SYSTEM_ADMIN_PASSWORD,
        });
        if (syncPasswordError) {
            return res.status(500).json({
                success: false,
                error: 'Error sincronizando password en public.users',
                details: syncPasswordError,
            });
        }
        const userId = userData.id;
        console.log('✅ [BOOTSTRAP] Usuario en public.users OK:', userId);
        // ========================================================================
        // 5. UPSERT USER_ROLES
        // ========================================================================
        console.log(`🔍 [BOOTSTRAP] Asignando rol SYSTEM_ADMIN al usuario`);
        const { data: existingRole } = await Postgres
            .from('user_roles')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('user_id', userId)
            .eq('role_id', roleId)
            .maybeSingle();
        if (!existingRole) {
            const { error: userRoleError } = await Postgres
                .from('user_roles')
                .insert({
                tenant_id: tenantId,
                user_id: userId,
                role_id: roleId,
                is_active: true,
                created_by: 'SYSTEM',
            });
            if (userRoleError) {
                console.error('❌ [BOOTSTRAP] Error asignando rol:', userRoleError);
                return res.status(500).json({
                    success: false,
                    error: 'Error asignando rol al usuario',
                    details: userRoleError,
                });
            }
            console.log('✅ [BOOTSTRAP] Rol SYSTEM_ADMIN asignado correctamente');
        }
        else {
            console.log('✅ [BOOTSTRAP] Rol SYSTEM_ADMIN ya estaba asignado');
        }
        // ========================================================================
        // 6. UPSERT TENANT_ONBOARDING
        // ========================================================================
        console.log(`🔍 [BOOTSTRAP] Verificando tenant_onboarding`);
        const { error: onboardingError } = await Postgres.from('tenant_onboarding').upsert({
            tenant_id: tenantId,
            user_id: userId,
            onboarding_status: 'NOT_STARTED',
            current_step: 'tenant_setup',
            completion_percentage: 0,
        }, { onConflict: 'tenant_id' });
        if (onboardingError) {
            console.error('❌ [BOOTSTRAP] Error creando tenant_onboarding:', onboardingError);
            return res.status(500).json({
                success: false,
                error: 'Error creando tenant_onboarding',
                details: onboardingError,
            });
        }
        console.log('✅ [BOOTSTRAP] Tenant onboarding OK');
        // ========================================================================
        // 7. RESPUESTA EXITOSA
        // ========================================================================
        console.log('🎉 [BOOTSTRAP] Bootstrap completado exitosamente');
        const mustChangePassword = SYSTEM_ADMIN_EMAIL === 'system.admin@titanium-labs.com';
        return res.json({
            success: true,
            message: 'System admin ready',
            data: {
                authUserId,
                tenantId,
                roleId,
                userId,
                mustChangePassword,
                isNewUser,
            },
        });
    }
    catch (error) {
        console.error('💥 [BOOTSTRAP] Error inesperado:', error);
        return res.status(500).json({
            success: false,
            error: 'Error inesperado en bootstrap',
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
// ============================================================================
// GET /bootstrap/wizard-state
// ============================================================================
export async function getWizardState(req, res) {
    try {
        const Postgres = createDbClient(process.env.Postgres_URL ?? '', process.env.Postgres_SERVICE_ROLE_KEY ?? '');
        const { data: completedOnboarding } = await Postgres
            .from('tenant_onboarding')
            .select('onboarding_status, tenant_id')
            .eq('onboarding_status', 'COMPLETED')
            .limit(1)
            .maybeSingle();
        if (completedOnboarding) {
            console.log('✅ [WIZARD_STATE] Onboarding completado encontrado:', completedOnboarding);
            return res.json({ onboardingStatus: 'COMPLETED' });
        }
        const { data: inProgressOnboarding } = await Postgres
            .from('tenant_onboarding')
            .select('onboarding_status')
            .eq('onboarding_status', 'IN_PROGRESS')
            .limit(1)
            .maybeSingle();
        if (inProgressOnboarding) {
            console.log('⚠️ [WIZARD_STATE] Onboarding en progreso');
            return res.json({ onboardingStatus: 'IN_PROGRESS' });
        }
        console.log('📋 [WIZARD_STATE] No hay onboarding completado ni en progreso');
        return res.json({ onboardingStatus: 'NOT_STARTED' });
    }
    catch (error) {
        console.error('Error en getWizardState:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
// ============================================================================
// GET /bootstrap/token
// ============================================================================
export async function getBootstrapToken(req, res) {
    return res.json({
        token: process.env.Postgres_ANON_KEY ?? '',
    });
}
// ============================================================================
// GET /bootstrap/languages
// ============================================================================
export async function getSystemLanguages(req, res) {
    try {
        const Postgres = createDbClient(process.env.Postgres_URL ?? '', process.env.Postgres_SERVICE_ROLE_KEY ?? '');
        const { data, error } = await Postgres
            .from('system_languages')
            .select('*')
            .eq('is_active', true)
            .order('language_name');
        if (error) {
            console.error('Error obteniendo idiomas:', error);
            return res.status(500).json({ error: 'Error obteniendo idiomas' });
        }
        return res.json({ languages: data || [] });
    }
    catch (error) {
        console.error('Error en getSystemLanguages:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
// ============================================================================
// POST /bootstrap/step1-tenant
// ============================================================================
export async function bootstrapStep1Tenant(req, res) {
    try {
        const body = req.body;
        const { tenant_key, tenant_name, default_language } = body;
        console.log('📝 [STEP1] Recibido body:', { tenant_key, tenant_name, default_language });
        if (!tenant_key || !tenant_name) {
            console.error('❌ [STEP1] Campos requeridos faltantes');
            return res.status(400).json({
                success: false,
                error: 'Campos requeridos faltantes',
                details: {
                    tenant_key: tenant_key || 'faltante',
                    tenant_name: tenant_name || 'faltante',
                },
            });
        }
        const PostgresUrl = process.env.Postgres_URL;
        const PostgresServiceKey = process.env.Postgres_SERVICE_ROLE_KEY;
        if (!PostgresUrl || !PostgresServiceKey) {
            console.error('❌ [STEP1] Variables de entorno faltantes');
            return res.status(500).json({
                success: false,
                error: 'Error de configuración del servidor',
                details: 'Variables de entorno Postgres_URL o Postgres_SERVICE_ROLE_KEY no configuradas',
            });
        }
        const Postgres = createDbClient(PostgresUrl, PostgresServiceKey);
        console.log('📝 [STEP1] Guardando tenant:', tenant_key);
        console.log('🛡️ [STEP1] VALIDACIÓN: Verificando cantidad de tenants...');
        const { data: allTenants, error: countError } = await Postgres
            .from('tenants')
            .select('id, tenant_key, tenant_name');
        if (countError) {
            console.error('❌ [STEP1] Error al contar tenants:', countError);
            return res.status(500).json({
                error: 'Error validando integridad del sistema',
                details: countError.message,
            });
        }
        const tenantCount = allTenants?.length || 0;
        console.log(`📊 [STEP1] Tenants encontrados: ${tenantCount}`);
        if (tenantCount === 0) {
            console.error('❌ [STEP1] CRÍTICO: No existe ningún tenant. Ejecutar 002_SEED_COMPLETE.sql primero.');
            return res.status(500).json({
                error: 'Sistema no inicializado',
                details: 'No existe ningún tenant. Ejecuta 002_SEED_COMPLETE.sql primero.',
            });
        }
        if (tenantCount > 1) {
            console.error(`❌ [STEP1] CRÍTICO: Existen ${tenantCount} tenants pero solo debe haber UNO.`);
            return res.status(500).json({
                error: 'Integridad comprometida: múltiples tenants detectados',
                details: `Se encontraron ${tenantCount} tenants cuando solo debe existir UNO.`,
                tenants: allTenants,
            });
        }
        console.log('✅ [STEP1] Validación exitosa: Existe exactamente 1 tenant');
        console.log('🔍 [STEP1] Buscando tenant SYSTEM...');
        const { data: systemTenant, error: systemTenantError } = await Postgres
            .from('tenants')
            .select('id, tenant_key, tenant_name')
            .eq('tenant_key', 'SYSTEM')
            .single();
        if (systemTenantError || !systemTenant) {
            console.error('❌ [STEP1] Tenant SYSTEM no encontrado.', systemTenantError);
            return res.status(500).json({
                error: 'Tenant SYSTEM no encontrado',
                details: 'Ejecutar las migraciones SQL primero (002_SEED_COMPLETE.sql)',
            });
        }
        console.log('✅ [STEP1] Tenant SYSTEM encontrado:', systemTenant.id);
        console.log('📝 [STEP1] Actualizando configuración del tenant SYSTEM...');
        const { data: updatedTenant, error: updateError } = await Postgres
            .from('tenants')
            .update({
            tenant_name,
            is_active: true,
        })
            .eq('id', systemTenant.id)
            .select('id')
            .single();
        if (updateError) {
            console.error('❌ [STEP1] Error actualizando tenant SYSTEM:', updateError);
            return res.status(500).json({ error: 'Error actualizando tenant', details: updateError });
        }
        const tenantData = updatedTenant;
        console.log('✅ [STEP1] Tenant SYSTEM actualizado:', tenantData.id);
        const { error: onboardingError } = await Postgres
            .from('tenant_onboarding')
            .upsert({
            tenant_id: tenantData.id,
            onboarding_status: 'IN_PROGRESS',
            current_step: 'admin_setup',
            completion_percentage: 50,
        }, { onConflict: 'tenant_id' });
        if (onboardingError) {
            console.error('❌ [STEP1] Error actualizando onboarding:', onboardingError);
            return res.status(500).json({
                error: 'Error actualizando onboarding',
                details: onboardingError,
            });
        }
        console.log('✅ [STEP1] Tenant guardado exitosamente:', tenantData.id);
        return res.json({
            success: true,
            tenant_id: tenantData.id,
        });
    }
    catch (error) {
        console.error('💥 [STEP1] Error inesperado en bootstrapStep1Tenant:', error);
        return res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
// ============================================================================
// POST /bootstrap/step2-admin
// ============================================================================
export async function bootstrapStep2Admin(req, res) {
    try {
        const body = req.body;
        const { username, email, display_name, password } = body;
        console.log('📝 [STEP2] Iniciando creación de usuario tenant.admin');
        if (!username || !email || !display_name || !password) {
            console.error('❌ [STEP2] Campos faltantes:');
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }
        const Postgres = createDbClient(process.env.Postgres_URL ?? '', process.env.Postgres_SERVICE_ROLE_KEY ?? '');
        console.log('📝 [STEP2] Creando usuario tenant.admin:', email);
        console.log('🔍 [STEP2] Buscando tenant SYSTEM...');
        const { data: mainTenant, error: tenantFetchError } = await Postgres
            .from('tenants')
            .select('id, tenant_key, tenant_name')
            .eq('tenant_key', 'SYSTEM')
            .single();
        if (tenantFetchError || !mainTenant) {
            console.error('❌ [STEP2] Tenant SYSTEM no encontrado.', tenantFetchError);
            return res.status(500).json({
                error: 'Tenant principal no encontrado',
                details: 'Ejecutar las migraciones SQL primero (002_SEED_COMPLETE.sql)',
            });
        }
        const tenantId = mainTenant.id;
        console.log('✅ [STEP2] Tenant SYSTEM encontrado:', tenantId);
        // Buscar rol TENANT_ADMIN
        console.log('📝 [STEP2] Buscando rol TENANT_ADMIN en tenant SYSTEM...');
        const { data: roleWithScope, error: roleError } = await Postgres
            .from('roles')
            .select('id, role_key, role_scope')
            .eq('role_key', 'TENANT_ADMIN')
            .eq('role_scope', 'TENANT')
            .maybeSingle();
        let role = roleWithScope;
        if (!role) {
            const { data: roleNoScope } = await Postgres
                .from('roles')
                .select('id, role_key, role_scope')
                .eq('role_key', 'TENANT_ADMIN')
                .maybeSingle();
            role = roleNoScope;
            if (!role) {
                console.error('❌ [STEP2] Rol TENANT_ADMIN no encontrado');
                return res.status(500).json({
                    error: 'Rol TENANT_ADMIN no encontrado en el sistema.',
                });
            }
        }
        console.log('✅ [STEP2] Rol TENANT_ADMIN encontrado:', role.id);
        // Verificar si el email ya existe en Auth
        console.log('📝 [STEP2] Verificando si el email ya existe en Auth...');
        const { data: listData } = await Postgres.auth.admin.listUsers();
        const existingAuthUser = listData?.users?.find(u => u.email === email);
        let authUserId;
        if (existingAuthUser) {
            console.log('⚠️ [STEP2] Usuario ya existe en Auth:', existingAuthUser.id);
            authUserId = existingAuthUser.id;
            await Postgres.auth.admin.updateUserById(authUserId, { password });
        }
        else {
            console.log('📝 [STEP2] Creando usuario en Auth...');
            const { data: authData, error: authError } = await Postgres.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: display_name },
            });
            if (authError) {
                console.error('❌ [STEP2] Error creando usuario en Auth:', authError);
                return res.status(500).json({
                    error: 'Error creando usuario en Auth.',
                    details: authError.message,
                });
            }
            authUserId = authData.user.id;
            console.log('✅ [STEP2] Usuario creado en Auth:', authUserId);
        }
        // Crear usuario en public.users
        console.log('📝 [STEP2] Creando usuario en public.users...');
        const { data: userData, error: userError } = await Postgres
            .from('users')
            .upsert({
            auth_user_id: authUserId,
            tenant_id: tenantId,
            username,
            email,
            display_name,
            is_active: true,
            created_by: 'BOOTSTRAP',
        }, { onConflict: 'auth_user_id' })
            .select('id')
            .single();
        if (userError || !userData) {
            console.error('❌ [STEP2] Error creando usuario en users:', userError);
            if (!existingAuthUser) {
                await Postgres.auth.admin.deleteUser(authUserId);
            }
            return res.status(500).json({
                error: 'Error creando usuario en public.users',
                details: userError?.message,
            });
        }
        const { error: syncPasswordError } = await Postgres.auth.admin.updateUserById(authUserId, {
            password,
        });
        if (syncPasswordError) {
            return res.status(500).json({
                error: 'Error sincronizando contraseña en public.users',
                details: syncPasswordError.message,
            });
        }
        const userId = userData.id;
        console.log('✅ [STEP2] Usuario creado en public.users:', userId);
        // Asignar rol
        console.log('📝 [STEP2] Asignando rol TENANT_ADMIN...');
        const { error: roleAssignError } = await Postgres
            .from('user_roles')
            .insert({
            tenant_id: tenantId,
            user_id: userId,
            role_id: role.id,
            is_active: true,
            created_by: 'BOOTSTRAP',
        });
        if (roleAssignError) {
            console.error('❌ [STEP2] Error asignando rol:', roleAssignError);
            return res.status(500).json({
                error: 'Error asignando rol',
                details: roleAssignError.message,
            });
        }
        console.log('✅ [STEP2] Rol TENANT_ADMIN asignado');
        // Actualizar onboarding
        const { error: onboardingError } = await Postgres
            .from('tenant_onboarding')
            .upsert({
            tenant_id: tenantId,
            user_id: userId,
            onboarding_status: 'COMPLETED',
            current_step: 'complete',
            completion_percentage: 100,
        }, { onConflict: 'tenant_id' });
        if (onboardingError) {
            console.error('⚠️ [STEP2] Error actualizando onboarding:', onboardingError);
        }
        console.log('🎉 [STEP2] Usuario tenant.admin creado exitosamente');
        return res.json({
            success: true,
            message: 'Usuario tenant.admin creado exitosamente',
            user: {
                id: userId,
                email: email,
                created_at: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        console.error('💥 [STEP2] Error inesperado:', error);
        return res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
export default router;
//# sourceMappingURL=bootstrap.js.map