/**
 * users-management-routes.tsx
 * Turnos Titanium Enterprise
 *
 * CRUD para users, user_roles y user_role_scopes
 * Ubicación: Mantenimiento → Usuarios
 *
 * IMPORTANTE: Las rutas estáticas (/catalogs/*, /user-roles/*) van ANTES
 * de las rutas dinámicas (/:id, /:user_id/*) para que Hono no capture
 * palabras como "catalogs" o "user-roles" como UUIDs.
 *
 * Política: NO se pueden eliminar registros.
 */

import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const app = new Hono();

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

// ============================================================================
// CATÁLOGOS — deben ir ANTES de /:id para que Hono no los capture como UUID
// ============================================================================

// GET /catalogs/tenants - Tenants disponibles
app.get('/catalogs/tenants', async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('tenants')
      .select('id, tenant_key, tenant_name')
      .order('tenant_name');

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, tenants: data || [] });
  } catch (err: any) {
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// GET /catalogs/roles - Roles disponibles (para selector)
app.get('/catalogs/roles', async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('roles')
      .select('id, role_key, role_name, role_scope, tenant_id, is_active')
      .eq('is_active', true)
      .order('role_name');

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, roles: data || [] });
  } catch (err: any) {
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// GET /catalogs/scope-types - Tipos de alcance disponibles (para selector)
app.get('/catalogs/scope-types', async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('scope_types')
      .select('id, scope_type_key, scope_type_name, is_active')
      .eq('is_active', true)
      .order('scope_type_name');

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, scopeTypes: data || [] });
  } catch (err: any) {
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// GET /catalogs/companies - Empresas disponibles (para selector de user_roles)
app.get('/catalogs/companies', async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('companies')
      .select('id, company_name, tenant_id')
      .eq('is_active', true)
      .order('company_name');

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, companies: data || [] });
  } catch (err: any) {
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// GET /catalogs/languages - Idiomas disponibles
app.get('/catalogs/languages', async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('system_languages')
      .select('code, language_name')
      .eq('is_active', true)
      .order('language_name');

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, languages: data || [] });
  } catch (err: any) {
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// ============================================================================
// USER-ROLES (sub-recursos estáticos) — ANTES de /:user_id/*
// ============================================================================

// PUT /user-roles/:user_role_id - Actualizar asignación de rol
app.put('/user-roles/:user_role_id', async (c) => {
  try {
    const userRoleId = c.req.param('user_role_id');
    const body = await c.req.json();
    const { valid_from, valid_to, is_active } = body;

    const supabase = getSupabase();

    const updateData: any = { updated_by: 'system', updated_at: new Date().toISOString() };
    if (valid_from !== undefined) updateData.valid_from = valid_from || null;
    if (valid_to !== undefined) updateData.valid_to = valid_to || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedUserRole, error } = await supabase
      .from('user_roles')
      .update(updateData)
      .eq('id', userRoleId)
      .select()
      .single();

    if (error) {
      console.error('[USERS-MGMT] Error actualizando user_role:', error);
      return c.json({ error: error.message }, 500);
    }

    if (!updatedUserRole) {
      return c.json({ error: 'Asignación de rol no encontrada' }, 404);
    }

    return c.json({ success: true, userRole: updatedUserRole, message: 'Asignación actualizada exitosamente' });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en PUT /user-roles/:id:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// PATCH /user-roles/:user_role_id/status - Activar/Desactivar user_role
app.patch('/user-roles/:user_role_id/status', async (c) => {
  try {
    const userRoleId = c.req.param('user_role_id');
    const body = await c.req.json();
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return c.json({ error: 'El campo is_active debe ser booleano' }, 400);
    }

    const supabase = getSupabase();

    const { data: updatedUserRole, error } = await supabase
      .from('user_roles')
      .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', userRoleId)
      .select()
      .single();

    if (error) return c.json({ error: error.message }, 500);
    if (!updatedUserRole) return c.json({ error: 'Asignación de rol no encontrada' }, 404);

    return c.json({
      success: true,
      userRole: updatedUserRole,
      message: `Asignación de rol ${is_active ? 'activada' : 'desactivada'} exitosamente`,
    });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en PATCH /user-roles/:id/status:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// GET /user-roles/:user_role_id/scopes - Listar alcances de una asignación
app.get('/user-roles/:user_role_id/scopes', async (c) => {
  try {
    const userRoleId = c.req.param('user_role_id');
    const supabase = getSupabase();

    const { data: scopes, error } = await supabase
      .from('user_role_scopes')
      .select(`
        *,
        scope_type:scope_types!user_role_scopes_scope_type_id_fkey(scope_type_key, scope_type_name)
      `)
      .eq('user_role_id', userRoleId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[USERS-MGMT] Error cargando user_role_scopes:', error);
      return c.json({ error: error.message }, 500);
    }

    const scopesWithLabels = (scopes || []).map(s => ({
      ...s,
      scope_type_key: s.scope_type?.scope_type_key || null,
      scope_type_name: s.scope_type?.scope_type_name || null,
    }));

    return c.json({ success: true, scopes: scopesWithLabels, count: scopesWithLabels.length });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en GET /user-roles/:id/scopes:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// POST /user-roles/:user_role_id/scopes - Agregar alcance a una asignación
app.post('/user-roles/:user_role_id/scopes', async (c) => {
  try {
    const userRoleId = c.req.param('user_role_id');
    const body = await c.req.json();
    const { tenant_id, scope_type_id, scope_entity_id, is_active = true } = body;

    if (!tenant_id || !scope_type_id || !scope_entity_id) {
      return c.json({ error: 'Campos obligatorios: tenant_id, scope_type_id, scope_entity_id' }, 400);
    }

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('user_role_scopes')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('user_role_id', userRoleId)
      .eq('scope_type_id', scope_type_id)
      .eq('scope_entity_id', scope_entity_id)
      .maybeSingle();

    if (existing) {
      return c.json({ error: 'Ya existe ese alcance para esta asignación de rol' }, 409);
    }

    const { data: newScope, error } = await supabase
      .from('user_role_scopes')
      .insert({
        tenant_id,
        user_role_id: userRoleId,
        scope_type_id,
        scope_entity_id,
        is_active,
        created_by: 'system',
      })
      .select()
      .single();

    if (error) {
      console.error('[USERS-MGMT] Error creando user_role_scope:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, scope: newScope, message: 'Alcance asignado exitosamente' }, 201);
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en POST /user-roles/:id/scopes:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// PATCH /scopes/:scope_id/status - Activar/Desactivar alcance
app.patch('/scopes/:scope_id/status', async (c) => {
  try {
    const scopeId = c.req.param('scope_id');
    const body = await c.req.json();
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return c.json({ error: 'El campo is_active debe ser booleano' }, 400);
    }

    const supabase = getSupabase();

    const { data: updatedScope, error } = await supabase
      .from('user_role_scopes')
      .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', scopeId)
      .select()
      .single();

    if (error) return c.json({ error: error.message }, 500);
    if (!updatedScope) return c.json({ error: 'Alcance no encontrado' }, 404);

    return c.json({
      success: true,
      scope: updatedScope,
      message: `Alcance ${is_active ? 'activado' : 'desactivado'} exitosamente`,
    });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en PATCH /scopes/:id/status:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// ============================================================================
// USERS — rutas dinámicas van AL FINAL
// ============================================================================

// GET / - Listar usuarios
app.get('/', async (c) => {
  try {
    const supabase = getSupabase();

    const { data: users, error } = await supabase
      .from('users')
      .select(`
        *,
        tenant:tenants!users_tenant_id_fkey(tenant_key, tenant_name),
        language:system_languages!users_preferred_language_code_fkey(language_name)
      `)
      .order('username', { ascending: true });

    if (error) {
      console.error('[USERS-MGMT] Error cargando usuarios:', error);
      return c.json({ error: error.message }, 500);
    }

    const usersWithLabels = (users || []).map(u => ({
      ...u,
      tenant_key: u.tenant?.tenant_key || null,
      tenant_name: u.tenant?.tenant_name || null,
      language_name: u.language?.language_name || null,
    }));

    return c.json({ success: true, users: usersWithLabels, count: usersWithLabels.length });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en GET /:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// GET /:id - Obtener usuario específico
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getSupabase();

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        *,
        tenant:tenants!users_tenant_id_fkey(tenant_key, tenant_name),
        language:system_languages!users_preferred_language_code_fkey(language_name)
      `)
      .eq('id', id)
      .single();

    if (error || !user) {
      return c.json({ error: 'Usuario no encontrado' }, 404);
    }

    return c.json({
      success: true,
      user: {
        ...user,
        tenant_key: user.tenant?.tenant_key || null,
        tenant_name: user.tenant?.tenant_name || null,
        language_name: user.language?.language_name || null,
      },
    });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en GET /:id:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// POST / - Crear usuario (crea auth.users + public.users)
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const {
      tenant_id,
      username,
      display_name,
      email,
      phone,
      preferred_language_code,
      password,
      is_active = true,
    } = body;

    if (!tenant_id || !username || !email || !password) {
      return c.json({ error: 'Campos obligatorios: tenant_id, username, email, password' }, 400);
    }

    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
      return c.json({ error: 'El formato del email no es válido' }, 400);
    }

    if (password.length < 8) {
      return c.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400);
    }

    const supabase = getSupabase();

    const { data: existingUsername } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('username', username)
      .maybeSingle();

    if (existingUsername) {
      return c.json({ error: 'Ya existe un usuario con ese nombre de usuario en este tenant' }, 409);
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: display_name || username },
    });

    if (authError || !authData.user) {
      console.error('[USERS-MGMT] Error creando auth user:', authError);
      return c.json({ error: 'Error al crear usuario de autenticación', details: authError?.message }, 500);
    }

    const authUserId = authData.user.id;

    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        tenant_id,
        auth_user_id: authUserId,
        username,
        display_name: display_name || null,
        email,
        phone: phone || null,
        preferred_language_code: preferred_language_code || null,
        is_active,
        created_by: 'system',
      })
      .select()
      .single();

    if (userError) {
      console.error('[USERS-MGMT] Error creando public user:', userError);
      await supabase.auth.admin.deleteUser(authUserId);
      return c.json({ error: 'Error al crear perfil de usuario', details: userError.message }, 500);
    }

    return c.json({ success: true, user: newUser, message: 'Usuario creado exitosamente' }, 201);
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en POST /:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// PUT /:id - Actualizar usuario
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { username, display_name, email, phone, preferred_language_code, is_active } = body;

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('users')
      .select('username, email, tenant_id, auth_user_id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return c.json({ error: 'Usuario no encontrado' }, 404);
    }

    if (email && email !== existing.email) {
      if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
        return c.json({ error: 'El formato del email no es válido' }, 400);
      }
    }

    if (username && username !== existing.username) {
      const { data: dup } = await supabase
        .from('users')
        .select('id')
        .eq('tenant_id', existing.tenant_id)
        .eq('username', username)
        .neq('id', id)
        .maybeSingle();

      if (dup) {
        return c.json({ error: 'Ya existe un usuario con ese nombre de usuario en este tenant' }, 409);
      }
    }

    const updateData: any = { updated_by: 'system', updated_at: new Date().toISOString() };
    if (username !== undefined) updateData.username = username;
    if (display_name !== undefined) updateData.display_name = display_name || null;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || null;
    if (preferred_language_code !== undefined) updateData.preferred_language_code = preferred_language_code || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[USERS-MGMT] Error actualizando usuario:', error);
      return c.json({ error: error.message }, 500);
    }

    if (email && email !== existing.email) {
      await supabase.auth.admin.updateUserById(existing.auth_user_id, { email });
    }

    return c.json({ success: true, user: updatedUser, message: 'Usuario actualizado exitosamente' });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en PUT /:id:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// PATCH /:id/status - Activar/Desactivar usuario
app.patch('/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return c.json({ error: 'El campo is_active debe ser booleano' }, 400);
    }

    const supabase = getSupabase();

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return c.json({ error: error.message }, 500);
    if (!updatedUser) return c.json({ error: 'Usuario no encontrado' }, 404);

    return c.json({
      success: true,
      user: updatedUser,
      message: `Usuario ${is_active ? 'activado' : 'desactivado'} exitosamente`,
    });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en PATCH /:id/status:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// PATCH /:id/reset-password - Resetear contraseña de usuario
app.patch('/:id/reset-password', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { new_password } = body;

    if (!new_password || new_password.length < 8) {
      return c.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400);
    }

    const supabase = getSupabase();

    const { data: user } = await supabase
      .from('users')
      .select('auth_user_id')
      .eq('id', id)
      .maybeSingle();

    if (!user) {
      return c.json({ error: 'Usuario no encontrado' }, 404);
    }

    const { error: pwError } = await supabase.auth.admin.updateUserById(user.auth_user_id, {
      password: new_password,
    });

    if (pwError) {
      return c.json({ error: 'Error al resetear contraseña', details: pwError.message }, 500);
    }

    return c.json({ success: true, message: 'Contraseña reseteada exitosamente' });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en PATCH /:id/reset-password:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// GET /:user_id/roles - Listar roles de un usuario
app.get('/:user_id/roles', async (c) => {
  try {
    const userId = c.req.param('user_id');
    const supabase = getSupabase();

    const { data: userRoles, error } = await supabase
      .from('user_roles')
      .select(`
        *,
        role:roles!user_roles_role_id_fkey(role_key, role_name, role_scope, data_scope),
        company:companies!user_roles_company_id_fkey(id, company_name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[USERS-MGMT] Error cargando user_roles:', error);
      return c.json({ error: error.message }, 500);
    }

    const rolesWithLabels = (userRoles || []).map(ur => ({
      ...ur,
      role_key: ur.role?.role_key || null,
      role_name: ur.role?.role_name || null,
      role_scope: ur.role?.role_scope || null,
      data_scope: ur.role?.data_scope || null,
      company_name: ur.company?.company_name || null,
    }));

    return c.json({ success: true, userRoles: rolesWithLabels, count: rolesWithLabels.length });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en GET /:user_id/roles:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// POST /:user_id/roles - Asignar rol a usuario
app.post('/:user_id/roles', async (c) => {
  try {
    const userId = c.req.param('user_id');
    const body = await c.req.json();
    const { tenant_id, role_id, company_id, valid_from, valid_to, is_active = true } = body;

    if (!tenant_id || !role_id) {
      return c.json({ error: 'Campos obligatorios: tenant_id, role_id' }, 400);
    }

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('user_roles')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('user_id', userId)
      .eq('role_id', role_id)
      .is('company_id', company_id || null)
      .maybeSingle();

    if (existing) {
      return c.json({ error: 'El usuario ya tiene asignado ese rol en esa empresa' }, 409);
    }

    const { data: newUserRole, error } = await supabase
      .from('user_roles')
      .insert({
        tenant_id,
        user_id: userId,
        role_id,
        company_id: company_id || null,
        is_active,
        valid_from: valid_from || null,
        valid_to: valid_to || null,
        created_by: 'system',
      })
      .select()
      .single();

    if (error) {
      console.error('[USERS-MGMT] Error creando user_role:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, userRole: newUserRole, message: 'Rol asignado exitosamente' }, 201);
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en POST /:user_id/roles:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

export default app;
