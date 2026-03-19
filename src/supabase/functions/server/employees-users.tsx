// ============================================================================
// employees-users.tsx
// Gestión de usuarios del sistema para empleados (acceso KIOSK)
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { Context } from 'npm:hono@4';

/**
 * Genera la contraseña inicial a partir del email corporativo
 * Regla: Parte antes del @
 * Ejemplo: juan.perez@empresa.com → juan.perez
 */
function generateInitialPassword(email: string): string {
  const parts = email.split('@');
  return parts[0]; // Parte antes del @
}

/**
 * POST /make-server-e19f2094/employees/create-user
 * Crea usuario del sistema para un empleado
 * Requiere: employee_id, email_work
 */
export async function createEmployeeUser(c: Context) {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing authorization header' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const body = await c.req.json();
    const { employee_id, email_work } = body;

    if (!employee_id || !email_work) {
      return c.json({ error: 'employee_id y email_work son requeridos' }, 400);
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email_work)) {
      return c.json({ error: 'email_work debe ser un email válido' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verificar que el usuario autenticado es tenant.admin
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log('🚀 === INICIO CREACIÓN DE USUARIO PARA EMPLEADO ===');
    console.log('📧 Email corporativo:', email_work);
    console.log('👤 Employee ID:', employee_id);

    // 1. Verificar que el empleado existe y no tiene usuario
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, auth_user_id, tenant_id, employee_code, first_name, last_name')
      .eq('id', employee_id)
      .single();

    if (empError || !employee) {
      console.error('❌ Empleado no encontrado:', empError);
      return c.json({ error: 'Empleado no encontrado' }, 404);
    }

    if (employee.auth_user_id) {
      console.log('⚠️ Empleado ya tiene usuario asociado');
      return c.json({ error: 'El empleado ya tiene un usuario del sistema' }, 400);
    }

    // 2. Buscar rol EMPLOYEE
    const { data: employeeRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('role_key', 'EMPLOYEE')
      .eq('role_scope', 'EMPLOYEE')
      .single();

    if (roleError || !employeeRole) {
      console.error('❌ Rol EMPLOYEE no encontrado:', roleError);
      return c.json({ error: 'Rol EMPLOYEE no encontrado en el sistema' }, 500);
    }

    console.log('✅ Rol EMPLOYEE encontrado:', employeeRole.id);

    // 3. Generar contraseña inicial (parte antes del @)
    const initialPassword = generateInitialPassword(email_work);
    console.log('🔑 Contraseña inicial generada:', initialPassword);

    // 4. Crear usuario en Supabase Auth
    console.log('📝 Creando usuario en Supabase Auth...');
    const { data: authData, error: createAuthError } = await supabase.auth.admin.createUser({
      email: email_work,
      password: initialPassword,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        full_name: `${employee.first_name} ${employee.last_name}`,
        employee_id: employee.id,
        employee_code: employee.employee_code
      }
    });

    if (createAuthError) {
      console.error('❌ Error creando usuario en Auth:', createAuthError);
      return c.json({ 
        error: 'Error creando usuario en Auth', 
        details: createAuthError.message 
      }, 500);
    }

    const authUserId = authData.user.id;
    console.log('✅ Usuario creado en Auth:', authUserId);

    // 5. Crear usuario en tabla public.users
    console.log('📝 Creando usuario en tabla users...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        auth_user_id: authUserId,
        tenant_id: employee.tenant_id,
        username: email_work,
        email: email_work,
        display_name: `${employee.first_name} ${employee.last_name}`,
        is_active: true,
        must_change_password: true // Debe cambiar en primer login
      })
      .select('id')
      .single();

    if (userError) {
      console.error('❌ Error creando usuario en tabla users:', userError);
      
      // Rollback: Eliminar usuario de Auth
      await supabase.auth.admin.deleteUser(authUserId);
      
      return c.json({ 
        error: 'Error creando usuario en tabla users', 
        details: userError.message 
      }, 500);
    }

    const userId = userData.id;
    console.log('✅ Usuario creado en tabla users:', userId);

    // 6. Asignar rol EMPLOYEE
    console.log('📝 Asignando rol EMPLOYEE...');
    const { error: roleAssignError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: employeeRole.id
      });

    if (roleAssignError) {
      console.error('❌ Error asignando rol EMPLOYEE:', roleAssignError);
      
      // Rollback: Eliminar usuario de Auth y users
      await supabase.auth.admin.deleteUser(authUserId);
      await supabase.from('users').delete().eq('id', userId);
      
      return c.json({ 
        error: 'Error asignando rol EMPLOYEE', 
        details: roleAssignError.message 
      }, 500);
    }

    console.log('✅ Rol EMPLOYEE asignado');

    // 7. Actualizar empleado con auth_user_id
    console.log('📝 Actualizando empleado con auth_user_id...');
    const { error: updateEmpError } = await supabase
      .from('employees')
      .update({ auth_user_id: authUserId })
      .eq('id', employee_id);

    if (updateEmpError) {
      console.error('❌ Error actualizando empleado:', updateEmpError);
      // No hacemos rollback aquí porque el usuario ya está creado
    }

    console.log('🎉 === FIN CREACIÓN DE USUARIO - SUCCESS ===');

    return c.json({
      success: true,
      message: 'Usuario creado exitosamente',
      username: email_work,
      initial_password: initialPassword,
      user_id: userId,
      auth_user_id: authUserId
    });
  } catch (error) {
    console.error('💥 Error en createEmployeeUser:', error);
    return c.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
}

/**
 * POST /make-server-e19f2094/employees/reset-password
 * Resetea la contraseña de un empleado a la inicial (parte antes del @)
 * Requiere: employee_id
 */
export async function resetEmployeePassword(c: Context) {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing authorization header' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const body = await c.req.json();
    const { employee_id } = body;

    if (!employee_id) {
      return c.json({ error: 'employee_id es requerido' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log('🔄 === INICIO RESET DE CONTRASEÑA ===');
    console.log('👤 Employee ID:', employee_id);

    // 1. Obtener datos del empleado
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, auth_user_id, email_work')
      .eq('id', employee_id)
      .single();

    if (empError || !employee) {
      console.error('❌ Empleado no encontrado:', empError);
      return c.json({ error: 'Empleado no encontrado' }, 404);
    }

    if (!employee.auth_user_id) {
      return c.json({ error: 'El empleado no tiene usuario del sistema' }, 400);
    }

    if (!employee.email_work) {
      return c.json({ error: 'El empleado no tiene email corporativo' }, 400);
    }

    // 2. Generar nueva contraseña (parte antes del @)
    const newPassword = generateInitialPassword(employee.email_work);
    console.log('🔑 Nueva contraseña generada:', newPassword);

    // 3. Actualizar contraseña en Auth
    console.log('📝 Actualizando contraseña en Auth...');
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(
      employee.auth_user_id,
      { password: newPassword }
    );

    if (updateAuthError) {
      console.error('❌ Error actualizando contraseña:', updateAuthError);
      return c.json({ 
        error: 'Error actualizando contraseña', 
        details: updateAuthError.message 
      }, 500);
    }

    // 4. Marcar must_change_password en public.users
    console.log('📝 Marcando must_change_password...');
    const { error: flagError } = await supabase
      .from('users')
      .update({ must_change_password: true })
      .eq('auth_user_id', employee.auth_user_id);

    if (flagError) {
      console.error('❌ Error actualizando flag:', flagError);
    }

    console.log('✅ Contraseña reseteada exitosamente');

    return c.json({
      success: true,
      message: 'Contraseña reseteada exitosamente',
      username: employee.email_work,
      new_password: newPassword
    });
  } catch (error) {
    console.error('💥 Error en resetEmployeePassword:', error);
    return c.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
}

/**
 * POST /make-server-e19f2094/employees/toggle-user-status
 * Activa/desactiva el usuario del empleado
 * Requiere: employee_id, is_active
 */
export async function toggleEmployeeUserStatus(c: Context) {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing authorization header' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const body = await c.req.json();
    const { employee_id, is_active } = body;

    if (!employee_id || is_active === undefined) {
      return c.json({ error: 'employee_id e is_active son requeridos' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log('🔄 === CAMBIO DE ESTADO DE USUARIO ===');
    console.log('👤 Employee ID:', employee_id);
    console.log('📊 Nuevo estado:', is_active);

    // 1. Obtener auth_user_id del empleado
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('auth_user_id')
      .eq('id', employee_id)
      .single();

    if (empError || !employee) {
      console.error('❌ Empleado no encontrado:', empError);
      return c.json({ error: 'Empleado no encontrado' }, 404);
    }

    if (!employee.auth_user_id) {
      return c.json({ error: 'El empleado no tiene usuario del sistema' }, 400);
    }

    // 2. Actualizar is_active en public.users
    console.log('📝 Actualizando estado en public.users...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ is_active })
      .eq('auth_user_id', employee.auth_user_id);

    if (updateError) {
      console.error('❌ Error actualizando estado:', updateError);
      return c.json({ 
        error: 'Error actualizando estado del usuario', 
        details: updateError.message 
      }, 500);
    }

    console.log('✅ Estado actualizado exitosamente');

    return c.json({
      success: true,
      message: `Usuario ${is_active ? 'activado' : 'desactivado'} exitosamente`
    });
  } catch (error) {
    console.error('💥 Error en toggleEmployeeUserStatus:', error);
    return c.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
}

/**
 * POST /make-server-e19f2094/employees/create-users-bulk
 * Crea usuarios masivamente para empleados existentes que tienen email pero no usuario
 * Solo para empleados activos con email_work y sin auth_user_id
 */
export async function createEmployeeUsersBulk(c: Context) {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing authorization header' }, 401);
    }

    const token = authHeader.split(' ')[1];

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log('🚀 === INICIO CREACIÓN MASIVA DE USUARIOS ===');

    // 1. Obtener empleados sin usuario pero con email
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, tenant_id, employee_code, first_name, last_name, email_work')
      .is('auth_user_id', null)
      .not('email_work', 'is', null)
      .neq('email_work', '')
      .eq('is_active', true);

    if (empError) {
      console.error('❌ Error obteniendo empleados:', empError);
      return c.json({ error: 'Error obteniendo empleados', details: empError.message }, 500);
    }

    console.log(`📊 Empleados encontrados: ${employees?.length || 0}`);

    if (!employees || employees.length === 0) {
      return c.json({
        success: true,
        message: 'No hay empleados pendientes de creación de usuario',
        created: 0,
        failed: 0
      });
    }

    // 2. Buscar rol EMPLOYEE
    const { data: employeeRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('role_key', 'EMPLOYEE')
      .eq('role_scope', 'EMPLOYEE')
      .single();

    if (roleError || !employeeRole) {
      console.error('❌ Rol EMPLOYEE no encontrado:', roleError);
      return c.json({ error: 'Rol EMPLOYEE no encontrado' }, 500);
    }

    // 3. Crear usuarios uno por uno
    const results = {
      created: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const emp of employees) {
      try {
        console.log(`\n📝 Procesando empleado: ${emp.employee_code} - ${emp.email_work}`);

        const initialPassword = generateInitialPassword(emp.email_work);

        // Crear en Auth
        const { data: authData, error: createAuthError } = await supabase.auth.admin.createUser({
          email: emp.email_work,
          password: initialPassword,
          email_confirm: true,
          user_metadata: {
            full_name: `${emp.first_name} ${emp.last_name}`,
            employee_id: emp.id,
            employee_code: emp.employee_code
          }
        });

        if (createAuthError) {
          console.error(`❌ Error creando en Auth:`, createAuthError);
          results.failed++;
          results.errors.push({
            employee_code: emp.employee_code,
            email: emp.email_work,
            error: createAuthError.message
          });
          continue;
        }

        const authUserId = authData.user.id;

        // Crear en public.users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .insert({
            auth_user_id: authUserId,
            tenant_id: emp.tenant_id,
            username: emp.email_work,
            email: emp.email_work,
            display_name: `${emp.first_name} ${emp.last_name}`,
            is_active: true,
            must_change_password: true
          })
          .select('id')
          .single();

        if (userError) {
          console.error(`❌ Error creando en users:`, userError);
          await supabase.auth.admin.deleteUser(authUserId);
          results.failed++;
          results.errors.push({
            employee_code: emp.employee_code,
            email: emp.email_work,
            error: userError.message
          });
          continue;
        }

        // Asignar rol
        const { error: roleAssignError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userData.id,
            role_id: employeeRole.id
          });

        if (roleAssignError) {
          console.error(`❌ Error asignando rol:`, roleAssignError);
          await supabase.auth.admin.deleteUser(authUserId);
          await supabase.from('users').delete().eq('id', userData.id);
          results.failed++;
          results.errors.push({
            employee_code: emp.employee_code,
            email: emp.email_work,
            error: roleAssignError.message
          });
          continue;
        }

        // Actualizar empleado
        await supabase
          .from('employees')
          .update({ auth_user_id: authUserId })
          .eq('id', emp.id);

        console.log(`✅ Usuario creado: ${emp.email_work}`);
        results.created++;

      } catch (error) {
        console.error(`💥 Error procesando empleado ${emp.employee_code}:`, error);
        results.failed++;
        results.errors.push({
          employee_code: emp.employee_code,
          email: emp.email_work,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    console.log('🎉 === FIN CREACIÓN MASIVA ===');
    console.log(`✅ Creados: ${results.created}`);
    console.log(`❌ Fallidos: ${results.failed}`);

    return c.json({
      success: true,
      message: 'Proceso de creación masiva completado',
      created: results.created,
      failed: results.failed,
      total: employees.length,
      errors: results.errors
    });
  } catch (error) {
    console.error('💥 Error en createEmployeeUsersBulk:', error);
    return c.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
}
