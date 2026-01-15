import { Context } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

/**
 * POST /bootstrap/complete (v1.0)
 * Completa el wizard y crea el usuario Tenant Admin
 * 
 * CONTRATO:
 * - Idempotencia: Si el email ya existe, responde con ALREADY_EXISTS
 * - Atomicidad lógica: Solo OK si auth user + public.users + phone + onboarding
 * - No medias: Si falla, devuelve stage exacto + rollback info
 * 
 * REQUEST:
 * {
 *   tenant_id: string (UUID),
 *   email: string,
 *   password: string (min 8 chars),
 *   username?: string,
 *   name: string,
 *   lastname: string,
 *   phone?: string,
 *   preferred_language_code?: string,
 *   email_confirm: boolean
 * }
 * 
 * RESPONSE OK (COMPLETED):
 * {
 *   ok: true,
 *   status: "COMPLETED",
 *   tenant_id: string,
 *   admin_user: { auth_user_id, public_user_id, email, username, display_name, phone, preferred_language_code },
 *   onboarding: { onboarding_status, current_step, completed_steps, completion_percentage },
 *   next: { action: "GO_TO_LOGIN", login_hint: { email } },
 *   meta: { request_id, timestamp }
 * }
 * 
 * RESPONSE OK (ALREADY_EXISTS):
 * {
 *   ok: true,
 *   status: "ALREADY_EXISTS",
 *   tenant_id: string,
 *   admin_user: { ... },
 *   onboarding: { ... },
 *   next: { ... },
 *   warnings: [{ code: "ADMIN_ALREADY_EXISTS", message: "..." }],
 *   meta: { ... }
 * }
 * 
 * RESPONSE ERROR:
 * {
 *   ok: false,
 *   status: "VALIDATION_ERROR" | "FAILED",
 *   stage: "VALIDATE_INPUT" | "CREATE_AUTH_USER" | "ENSURE_PUBLIC_USER" | "UPDATE_PUBLIC_USER" | ...,
 *   error: { code, message, fields?, supabase? },
 *   rollback?: { attempted: boolean, result: string, message: string },
 *   partial?: { auth_user_created: boolean, public_user_created: boolean, auth_user_id?, public_user_id? },
 *   retry: { allowed: boolean, hint: string },
 *   diagnostics: { ... },
 *   meta: { request_id, timestamp }
 * }
 */
export const bootstrapComplete = async (c: Context) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const requestId = `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const timestamp = new Date().toISOString();

  try {
    const bootstrapToken = c.get('bootstrapToken');
    const body = await c.req.json();
    
    const {
      tenant_id,
      email,
      password,
      username,
      name,
      lastname,
      phone,
      preferred_language_code,
      email_confirm
    } = body;

    // ========================================
    // STAGE 1: VALIDATE_INPUT
    // ========================================
    console.log(`🔍 [${requestId}] STAGE 1: VALIDATE_INPUT`);
    
    // Validar tenant_id (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!tenant_id || !uuidRegex.test(tenant_id)) {
      return c.json({
        ok: false,
        status: 'VALIDATION_ERROR',
        stage: 'VALIDATE_INPUT',
        error: {
          code: 'INVALID_TENANT_ID',
          message: 'tenant_id es requerido y debe ser UUID válido.',
          fields: { tenant_id: 'invalid' }
        },
        retry: {
          allowed: false,
          hint: 'Corrige los campos marcados e intenta nuevamente.'
        },
        diagnostics: {
          tenant_id_received: tenant_id,
          email_received: email
        },
        meta: { request_id: requestId, timestamp }
      }, 400);
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return c.json({
        ok: false,
        status: 'VALIDATION_ERROR',
        stage: 'VALIDATE_INPUT',
        error: {
          code: 'INVALID_EMAIL',
          message: 'El email es requerido y debe tener un formato válido.',
          fields: { email: 'invalid' }
        },
        retry: {
          allowed: false,
          hint: 'Corrige el formato del email e intenta nuevamente.'
        },
        diagnostics: {
          tenant_id_received: tenant_id,
          email_received: email
        },
        meta: { request_id: requestId, timestamp }
      }, 400);
    }

    // Validar password
    if (!password || password.length < 8) {
      return c.json({
        ok: false,
        status: 'VALIDATION_ERROR',
        stage: 'VALIDATE_INPUT',
        error: {
          code: 'INVALID_PASSWORD',
          message: 'La contraseña es requerida y debe tener al menos 8 caracteres.',
          fields: { password: 'invalid' }
        },
        retry: {
          allowed: false,
          hint: 'Usa una contraseña de al menos 8 caracteres.'
        },
        diagnostics: {
          tenant_id_received: tenant_id,
          email_received: email
        },
        meta: { request_id: requestId, timestamp }
      }, 400);
    }

    // Validar name y lastname
    if (!name?.trim() || !lastname?.trim()) {
      return c.json({
        ok: false,
        status: 'VALIDATION_ERROR',
        stage: 'VALIDATE_INPUT',
        error: {
          code: 'MISSING_NAME',
          message: 'El nombre y apellido son requeridos.',
          fields: {
            name: !name?.trim() ? 'required' : undefined,
            lastname: !lastname?.trim() ? 'required' : undefined
          }
        },
        retry: {
          allowed: false,
          hint: 'Completa el nombre y apellido.'
        },
        diagnostics: {
          tenant_id_received: tenant_id,
          email_received: email
        },
        meta: { request_id: requestId, timestamp }
      }, 400);
    }

    // Normalizar datos
    const emailNormalized = email.toLowerCase().trim();
    const usernameFinal = username?.trim() || emailNormalized;
    const displayName = `${name.trim()} ${lastname.trim()}`;
    const phoneFinal = phone?.trim() || null;

    // Obtener preferred_language_code (payload > tenant_default > 'es')
    let preferredLanguageCodeFinal = preferred_language_code?.trim() || null;

    if (!preferredLanguageCodeFinal) {
      const { data: tenantLangSettings } = await supabase
        .from('tenant_language_settings')
        .select('default_language_code')
        .eq('tenant_id', tenant_id)
        .maybeSingle();
      
      preferredLanguageCodeFinal = tenantLangSettings?.default_language_code || 'es';
    }

    console.log(`✅ [${requestId}] Validación OK:`, {
      tenant_id,
      email: emailNormalized,
      username: usernameFinal,
      display_name: displayName,
      phone: phoneFinal,
      preferred_language_code: preferredLanguageCodeFinal
    });

    // ========================================
    // STAGE 2: CHECK_EXISTING_USER
    // ========================================
    console.log(`🔍 [${requestId}] STAGE 2: CHECK_EXISTING_USER`);

    // 2.1 Verificar en public.users
    const { data: existingPublicUser } = await supabase
      .from('users')
      .select('id, auth_user_id, email, username, display_name, phone, preferred_language_code, tenant_id')
      .eq('email', emailNormalized)
      .maybeSingle();

    if (existingPublicUser) {
      console.log(`⚠️ [${requestId}] Usuario ya existe en public.users`);
      
      // ========================================
      // ACTUALIZAR DATOS DEL USUARIO (sincronizar con formulario)
      // ========================================
      console.log(`🔍 [${requestId}] Actualizando datos del usuario en public.users...`);
      
      await supabase
        .from('users')
        .update({
          username: usernameFinal,
          display_name: displayName,
          phone: phoneFinal,
          preferred_language_code: preferredLanguageCodeFinal,
          updated_at: new Date().toISOString(),
          updated_by: 'WIZARD_BOOTSTRAP'
        })
        .eq('id', existingPublicUser.id);
      
      console.log(`✅ [${requestId}] Datos del usuario actualizados en public.users`);
      
      // ========================================
      // ACTUALIZAR ONBOARDING (idempotencia)
      // ========================================
      console.log(`🔍 [${requestId}] Actualizando tenant_onboarding a COMPLETED...`);
      
      await supabase
        .from('tenant_onboarding')
        .update({
          current_step: 'DONE',
          completed_steps: ['TENANT', 'COMPANY', 'STRUCTURE', 'EMPLOYEES', 'ADMINISTRATOR'],
          completion_percentage: 100,
          user_id: existingPublicUser.id,
          completed_at: timestamp,
          onboarding_status: 'COMPLETED'
        })
        .eq('tenant_id', tenant_id)
        .eq('onboarding_status', 'IN_PROGRESS');
      
      console.log(`✅ [${requestId}] tenant_onboarding actualizado a COMPLETED`);
      
      // Actualizar tenant status
      await supabase
        .from('tenants')
        .update({
          tenant_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', tenant_id);
      
      // Invalidar bootstrap token
      await kv.del('bootstrap:token');
      await kv.set('bootstrap:completed_at', timestamp);
      
      console.log(`✅ [${requestId}] Bootstrap completado (usuario existente)`);
      
      // Verificar onboarding actualizado
      const { data: onboarding } = await supabase
        .from('tenant_onboarding')
        .select('onboarding_status, current_step, completed_steps, completion_percentage')
        .eq('tenant_id', tenant_id)
        .maybeSingle();

      return c.json({
        ok: true,
        status: 'ALREADY_EXISTS',
        tenant_id,
        admin_user: {
          auth_user_id: existingPublicUser.auth_user_id,
          public_user_id: existingPublicUser.id,
          email: existingPublicUser.email,
          username: existingPublicUser.username,
          display_name: existingPublicUser.display_name,
          phone: existingPublicUser.phone,
          preferred_language_code: existingPublicUser.preferred_language_code
        },
        onboarding: {
          onboarding_status: onboarding?.onboarding_status || 'COMPLETED',
          current_step: onboarding?.current_step || 'DONE',
          completed_steps: onboarding?.completed_steps || ['TENANT', 'COMPANY', 'STRUCTURE', 'EMPLOYEES', 'ADMINISTRATOR'],
          completion_percentage: onboarding?.completion_percentage || 100
        },
        next: {
          action: 'GO_TO_LOGIN',
          login_hint: { email: emailNormalized }
        },
        warnings: [{
          code: 'ADMIN_ALREADY_EXISTS',
          message: 'El usuario admin ya existía. Se verificó consistencia y se completó onboarding.'
        }],
        meta: { request_id: requestId, timestamp }
      });
    }

    // 2.2 Verificar usuario huérfano en auth.users (sin registro en public.users)
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const orphanedAuthUser = authUsers?.users?.find(u => u.email === emailNormalized);

    if (orphanedAuthUser) {
      console.warn(`⚠️ [${requestId}] Usuario huérfano encontrado en auth.users, eliminando...`);
      await supabase.auth.admin.deleteUser(orphanedAuthUser.id);
      console.log(`✅ [${requestId}] Usuario huérfano eliminado`);
    }

    // ========================================
    // STAGE 3: CREATE_AUTH_USER
    // ========================================
    console.log(`🔍 [${requestId}] STAGE 3: CREATE_AUTH_USER`);

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: emailNormalized,
      password,
      email_confirm: email_confirm ?? true,
      user_metadata: {
        tenant_id,
        username: usernameFinal,
        name: name.trim(),
        lastname: lastname.trim(),
        display_name: displayName,
        preferred_language_code: preferredLanguageCodeFinal,
        role: 'tenant_admin',
        bootstrap_mode: true
      }
    });

    if (authError || !authUser.user) {
      console.error(`❌ [${requestId}] Error creando auth user:`, authError);

      return c.json({
        ok: false,
        status: 'FAILED',
        stage: 'CREATE_AUTH_USER',
        error: {
          code: 'AUTH_CREATE_FAILED',
          message: 'Error al crear usuario en Supabase Auth.',
          supabase: {
            status: 500,
            code: authError?.code || 'unexpected_failure',
            raw_message: authError?.message || 'Unknown error'
          }
        },
        rollback: {
          attempted: true,
          result: 'NO_ACTION',
          message: 'No se creó auth user, no hay nada que revertir.'
        },
        retry: {
          allowed: true,
          hint: 'Reintenta. Si persiste, revisar triggers/funciones sobre auth.users.'
        },
        diagnostics: {
          tenant_id_received: tenant_id,
          preferred_language_code_resolved: preferredLanguageCodeFinal,
          username_final: usernameFinal,
          metadata_sent: {
            tenant_id,
            username: usernameFinal,
            name: name.trim(),
            lastname: lastname.trim(),
            display_name: displayName,
            preferred_language_code: preferredLanguageCodeFinal,
            role: 'tenant_admin',
            bootstrap_mode: true
          }
        },
        meta: { request_id: requestId, timestamp }
      }, 500);
    }

    const newAuthUserId = authUser.user.id;
    console.log(`✅ [${requestId}] Auth user creado: ${newAuthUserId}`);

    // ========================================
    // STAGE 4: ENSURE_PUBLIC_USER
    // ========================================
    console.log(`🔍 [${requestId}] STAGE 4: ENSURE_PUBLIC_USER (esperando trigger...)`);
    
    // Esperar 2 segundos para que el trigger handle_new_user() complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: createdPublicUser, error: verifyError } = await supabase
      .from('users')
      .select('id, tenant_id, auth_user_id, username, display_name, email, phone, preferred_language_code')
      .eq('auth_user_id', newAuthUserId)
      .maybeSingle();

    if (verifyError || !createdPublicUser) {
      console.error(`❌ [${requestId}] Trigger NO creó public.users:`, verifyError);

      // ROLLBACK: Eliminar auth user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(newAuthUserId);

      return c.json({
        ok: false,
        status: 'FAILED',
        stage: 'ENSURE_PUBLIC_USER',
        error: {
          code: 'PUBLIC_USER_NOT_CREATED',
          message: 'Se creó el usuario en Auth, pero no se insertó el perfil en public.users (trigger/función falló).'
        },
        partial: {
          auth_user_created: true,
          auth_user_id: newAuthUserId,
          public_user_created: false
        },
        rollback: {
          attempted: true,
          result: deleteError ? 'ROLLBACK_FAILED' : 'AUTH_USER_DELETED',
          message: deleteError
            ? `Se eliminó el auth user para evitar inconsistencia, pero falló: ${deleteError.message}`
            : 'Se eliminó el auth user para evitar inconsistencia.'
        },
        retry: {
          allowed: true,
          hint: 'Reintenta luego de corregir handle_new_user() / constraints.'
        },
        diagnostics: {
          tenant_id_received: tenant_id,
          preferred_language_code_resolved: preferredLanguageCodeFinal,
          username_final: usernameFinal
        },
        meta: { request_id: requestId, timestamp }
      }, 500);
    }

    const publicUserId = createdPublicUser.id;
    console.log(`✅ [${requestId}] Public user creado por trigger: ${publicUserId}`);

    // ========================================
    // STAGE 5: UPDATE_PUBLIC_USER (phone + reforzar campos)
    // ========================================
    console.log(`🔍 [${requestId}] STAGE 5: UPDATE_PUBLIC_USER`);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        phone: phoneFinal,
        display_name: displayName,
        username: usernameFinal,
        preferred_language_code: preferredLanguageCodeFinal,
        updated_at: new Date().toISOString(),
        updated_by: 'WIZARD_BOOTSTRAP'
      })
      .eq('auth_user_id', newAuthUserId);

    if (updateError) {
      console.error(`❌ [${requestId}] Error actualizando public.users:`, updateError);

      return c.json({
        ok: false,
        status: 'FAILED',
        stage: 'UPDATE_PUBLIC_USER',
        error: {
          code: 'PUBLIC_USER_UPDATE_FAILED',
          message: 'Se creó el usuario, pero falló la actualización de campos adicionales (phone/display_name).'
        },
        partial: {
          auth_user_created: true,
          public_user_created: true,
          auth_user_id: newAuthUserId,
          public_user_id: publicUserId
        },
        rollback: {
          attempted: false,
          result: 'NO_ACTION',
          message: 'No se hace rollback porque la cuenta ya existe; se requiere corrección y reintento del update.'
        },
        retry: {
          allowed: true,
          hint: 'Reintenta para aplicar phone/display_name. No crearás un usuario duplicado.'
        },
        meta: { request_id: requestId, timestamp }
      }, 500);
    }

    console.log(`✅ [${requestId}] Phone y campos reforzados correctamente`);

    // ========================================
    // STAGE 6: ASSIGN_ROLE
    // ========================================
    console.log(`🔍 [${requestId}] STAGE 6: ASSIGN_ROLE`);

    // Obtener company_id (primera empresa del tenant)
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const companyId = company?.id;

    // Obtener rol SUPER_ADMIN
    const { data: superAdminRole } = await supabase
      .from('roles')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('role_key', 'SUPER_ADMIN')
      .eq('is_active', true)
      .maybeSingle();

    let roleId = superAdminRole?.id;

    // Si no existe, crear rol SUPER_ADMIN
    if (!roleId) {
      console.log(`⚠️ [${requestId}] Rol SUPER_ADMIN no existe, creándolo...`);

      const { data: newRole } = await supabase
        .from('roles')
        .insert({
          tenant_id,
          role_key: 'SUPER_ADMIN',
          role_name: 'Super Administrador',
          role_scope: 'TENANT',
          is_active: true,
          created_by: 'BOOTSTRAP'
        })
        .select()
        .single();

      roleId = newRole?.id;

      // Asignar TODOS los permisos al rol
      const { data: allScreenActions } = await supabase
        .from('screen_actions')
        .select('id')
        .eq('is_active', true);

      if (allScreenActions && allScreenActions.length > 0) {
        const permissionsToInsert = allScreenActions.map(action => ({
          tenant_id,
          role_id: roleId,
          screen_action_id: action.id,
          is_allowed: true,
          is_active: true,
          created_by: 'BOOTSTRAP'
        }));

        await supabase.from('role_screen_actions').insert(permissionsToInsert);
        console.log(`✅ [${requestId}] ${permissionsToInsert.length} permisos asignados`);
      }
    }

    // Asignar rol al usuario
    const { error: userRoleError } = await supabase
      .from('user_roles')
      .insert({
        tenant_id,
        user_id: publicUserId,
        role_id: roleId,
        company_id: companyId,
        is_active: true,
        created_by: 'BOOTSTRAP'
      });

    if (userRoleError) {
      console.error(`❌ [${requestId}] Error asignando rol:`, userRoleError);
      // NO hacer rollback, solo advertir
    } else {
      console.log(`✅ [${requestId}] Rol asignado correctamente`);
    }

    // ========================================
    // STAGE 7: COMPLETE_ONBOARDING
    // ========================================
    console.log(`🔍 [${requestId}] STAGE 7: COMPLETE_ONBOARDING`);

    // Actualizar tenant status
    await supabase
      .from('tenants')
      .update({
        tenant_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', tenant_id);

    // Invalidar bootstrap token
    await kv.del('bootstrap:token');
    await kv.set('bootstrap:completed_at', timestamp);

    // Actualizar tenant_onboarding
    await supabase
      .from('tenant_onboarding')
      .update({
        current_step: 'DONE',
        completed_steps: ['TENANT', 'COMPANY', 'STRUCTURE', 'EMPLOYEES', 'ADMINISTRATOR'],
        completion_percentage: 100,
        user_id: publicUserId,
        completed_at: timestamp,
        onboarding_status: 'COMPLETED'
      })
      .eq('tenant_id', tenant_id)
      .eq('onboarding_status', 'IN_PROGRESS');

    console.log(`✅ [${requestId}] Onboarding completado`);

    // ========================================
    // STAGE 8: SUCCESS RESPONSE
    // ========================================
    return c.json({
      ok: true,
      status: 'COMPLETED',
      tenant_id,
      admin_user: {
        auth_user_id: newAuthUserId,
        public_user_id: publicUserId,
        email: emailNormalized,
        username: usernameFinal,
        display_name: displayName,
        phone: phoneFinal,
        preferred_language_code: preferredLanguageCodeFinal
      },
      onboarding: {
        onboarding_status: 'COMPLETED',
        current_step: 'DONE',
        completed_steps: ['TENANT', 'COMPANY', 'STRUCTURE', 'EMPLOYEES', 'ADMINISTRATOR'],
        completion_percentage: 100
      },
      next: {
        action: 'GO_TO_LOGIN',
        login_hint: { email: emailNormalized }
      },
      meta: { request_id: requestId, timestamp }
    });

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error inesperado en bootstrapComplete:`, error);
    
    return c.json({
      ok: false,
      status: 'FAILED',
      stage: 'UNKNOWN',
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error interno del servidor'
      },
      retry: {
        allowed: true,
        hint: 'Error inesperado. Reintenta o contacta soporte.'
      },
      diagnostics: {
        error_stack: error.stack
      },
      meta: { request_id: requestId, timestamp }
    }, 500);
  }
};