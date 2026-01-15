import { Context } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';

// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================

interface SuccessResponse<T = any> {
  ok: true;
  data: T;
  meta: {
    request_id: string;
    server_time: string;
  };
}

interface ErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    request_id: string;
    server_time: string;
  };
}

type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// Códigos de error aprobados (SOLO 8)
const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TENANT_NOT_READY: 'TENANT_NOT_READY',
  KIOSK_DISABLED: 'KIOSK_DISABLED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATE_RANGE_TOO_LARGE: 'DATE_RANGE_TOO_LARGE',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// Constantes de validación
const MAX_DAYS_RANGE = 90;
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;
const THROTTLE_SECONDS = 30;
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MINUTES = 5;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Genera UUID v4 para request_id
 */
function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Obtiene la hora del servidor en ISO 8601
 */
function getServerTime(): string {
  return new Date().toISOString();
}

/**
 * Crea respuesta de éxito estandarizada
 */
function createSuccessResponse<T>(data: T): SuccessResponse<T> {
  return {
    ok: true,
    data,
    meta: {
      request_id: generateRequestId(),
      server_time: getServerTime(),
    },
  };
}

/**
 * Crea respuesta de error estandarizada
 */
function createErrorResponse(
  code: keyof typeof ERROR_CODES,
  message: string,
  details?: any
): ErrorResponse {
  return {
    ok: false,
    error: {
      code: ERROR_CODES[code],
      message,
      details,
    },
    meta: {
      request_id: generateRequestId(),
      server_time: getServerTime(),
    },
  };
}

/**
 * Cliente Supabase con SERVICE_ROLE_KEY
 */
function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

/**
 * Cliente Supabase con ANON_KEY (para validar tokens de usuario)
 */
function getSupabaseAnonClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );
}

// ============================================================================
// MIDDLEWARE: Autenticación y Autorización
// ============================================================================

/**
 * Middleware: Validar token JWT y obtener usuario
 */
export async function requireAuth(c: Context, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json(createErrorResponse('UNAUTHORIZED', 'Token de autenticación requerido'), 401);
  }

  const token = authHeader.split(' ')[1];
  const supabaseAnon = getSupabaseAnonClient();

  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);

  if (error || !user) {
    console.error('❌ Error validando token:', error);
    return c.json(createErrorResponse('UNAUTHORIZED', 'Token inválido o expirado'), 401);
  }

  // Almacenar usuario en contexto
  c.set('authUser', user);
  await next();
}

/**
 * Middleware: Validar que el usuario tenga rol EMPLOYEE
 */
export async function requireEmployee(c: Context, next: () => Promise<void>) {
  const authUser = c.get('authUser');
  
  if (!authUser) {
    return c.json(createErrorResponse('UNAUTHORIZED', 'Usuario no autenticado'), 401);
  }

  const supabase = getSupabaseClient();

  // Buscar usuario en tabla users
  const { data: userRecord, error: userError } = await supabase
    .from('users')
    .select('id, tenant_id, employee_id')
    .eq('auth_user_id', authUser.id)
    .single();

  if (userError || !userRecord) {
    console.error('❌ Usuario no encontrado en BD:', userError);
    return c.json(createErrorResponse('FORBIDDEN', 'Usuario no encontrado en el sistema'), 403);
  }

  // Verificar que tenga employee_id
  if (!userRecord.employee_id) {
    return c.json(createErrorResponse('FORBIDDEN', 'Usuario no es un empleado'), 403);
  }

  // Buscar roles del usuario
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select(`
      role_id,
      roles (
        role_key,
        role_name
      )
    `)
    .eq('user_id', userRecord.id);

  if (rolesError || !userRoles || userRoles.length === 0) {
    console.error('❌ Usuario sin roles:', rolesError);
    return c.json(createErrorResponse('FORBIDDEN', 'Usuario sin roles asignados'), 403);
  }

  // Verificar que tenga rol EMPLOYEE
  const hasEmployeeRole = userRoles.some((ur: any) => ur.roles?.role_key === 'EMPLOYEE');

  if (!hasEmployeeRole) {
    return c.json(createErrorResponse('FORBIDDEN', 'Acceso denegado. Solo empleados pueden usar KIOSK'), 403);
  }

  // Verificar estado del tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, is_active')
    .eq('id', userRecord.tenant_id)
    .single();

  if (tenantError || !tenant || !tenant.is_active) {
    return c.json(createErrorResponse('TENANT_NOT_READY', 'Tenant no activo o no encontrado'), 409);
  }

  // Verificar onboarding completado
  const { data: onboarding, error: onboardingError } = await supabase
    .from('tenant_onboarding')
    .select('onboarding_status')
    .eq('tenant_id', userRecord.tenant_id)
    .single();

  if (onboardingError || !onboarding || onboarding.onboarding_status !== 'COMPLETED') {
    return c.json(createErrorResponse('TENANT_NOT_READY', 'Onboarding no completado'), 409);
  }

  // Almacenar datos del usuario en contexto
  c.set('userRecord', userRecord);
  c.set('tenantId', userRecord.tenant_id);
  c.set('employeeId', userRecord.employee_id);

  await next();
}

// ============================================================================
// FASE 2A: CORE (4 ENDPOINTS)
// ============================================================================

/**
 * GET /kiosk/config
 * Obtener configuración del kiosk
 */
export async function getConfig(c: Context) {
  try {
    const tenantId = c.get('tenantId');
    const deviceId = c.req.query('device_id');
    const companyId = c.req.query('company_id');
    const authUser = c.get('authUser');

    const requestId = generateRequestId();
    console.log(`🔵 [KIOSK] GET /config | request_id: ${requestId} | user: ${authUser?.id || 'unknown'}`);

    const supabase = getSupabaseClient();

    // Buscar configuración
    let query = supabase
      .from('kiosk_configuration')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    // Filtrar por company_id si existe (NULL = todo el tenant)
    if (companyId) {
      query = query.eq('company_id', companyId);
    } else {
      query = query.is('company_id', null);
    }

    // Filtrar por device_id si existe (NULL = toda la empresa)
    if (deviceId) {
      query = query.eq('device_id', deviceId);
    } else {
      query = query.is('device_id', null);
    }

    const { data: config, error: configError } = await query.maybeSingle();

    if (configError) {
      console.error(`❌ [KIOSK] ERROR | code: INTERNAL_ERROR | request_id: ${requestId}`, configError);
      return c.json(createErrorResponse('INTERNAL_ERROR', 'Error obteniendo configuración'), 500);
    }

    if (!config) {
      console.log(`❌ [KIOSK] ERROR | code: VALIDATION_ERROR | reason: CONFIG_NOT_FOUND | request_id: ${requestId}`);
      return c.json(createErrorResponse('VALIDATION_ERROR', 'No se encontró configuración para este dispositivo/empresa', {
        reason: 'CONFIG_NOT_FOUND',
        device_id: deviceId,
        company_id: companyId,
      }), 404);
    }

    // Buscar información del dispositivo si existe device_id
    let deviceInfo = null;
    if (config.device_id) {
      const { data: device } = await supabase
        .from('biometric_devices')
        .select('id, device_name, device_code, location')
        .eq('id', config.device_id)
        .single();

      if (device) {
        deviceInfo = {
          id: device.id,
          name: device.device_name,
          code: device.device_code,
          location: device.location,
        };
      }
    }

    const response = {
      config: {
        allow_lunch_buttons: config.allow_lunch_buttons,
        allow_permission_buttons: config.allow_permission_buttons,
        contingency_enabled: config.contingency_enabled,
        contingency_expires_at: config.contingency_expires_at,
        contingency_reason: null,
        auto_reset_seconds: config.auto_reset_seconds,
        throttle_seconds: config.throttle_seconds,
      },
      device: deviceInfo,
    };

    // Agregar razón de contingencia si está activa
    if (config.contingency_enabled && config.contingency_reason_id) {
      const { data: reason } = await supabase
        .from('lookup_values')
        .select('id, code, value')
        .eq('id', config.contingency_reason_id)
        .single();

      if (reason) {
        response.config.contingency_reason = {
          id: reason.id,
          code: reason.code,
          value: reason.value,
        };
      }
    }

    return c.json(createSuccessResponse(response));
  } catch (error: any) {
    console.error('❌ Error en getConfig:', error);
    return c.json(createErrorResponse('INTERNAL_ERROR', 'Error interno del servidor'), 500);
  }
}

/**
 * POST /kiosk/identify
 * Validar PIN del empleado y retornar información + session token
 */
export async function identify(c: Context) {
  try {
    const requestId = generateRequestId();
    console.log(`🔵 [KIOSK] POST /identify | request_id: ${requestId} | anonymous`);

    const body = await c.req.json();
    const { pin, device_id } = body;

    if (!pin) {
      console.log(`❌ [KIOSK] ERROR | code: VALIDATION_ERROR | reason: MISSING_PIN | request_id: ${requestId}`);
      return c.json(createErrorResponse('VALIDATION_ERROR', 'PIN requerido', {
        reason: 'MISSING_PIN',
        field: 'pin',
      }), 422);
    }

    const supabase = getSupabaseClient();

    // TODO: Implementar lógica de throttling para PIN attempts
    // Por ahora, validar PIN directamente

    // Buscar empleado por PIN
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select(`
        id,
        employee_code,
        first_name,
        last_name,
        photo_url,
        is_active,
        tenant_id,
        company_id
      `)
      .eq('pin', pin)
      .eq('is_active', true)
      .maybeSingle();

    if (employeeError) {
      console.error('❌ Error buscando empleado:', employeeError);
      return c.json(createErrorResponse('INTERNAL_ERROR', 'Error buscando empleado'), 500);
    }

    if (!employee) {
      console.log(`❌ [KIOSK] ERROR | code: VALIDATION_ERROR | reason: INVALID_PIN | request_id: ${requestId}`);
      return c.json(createErrorResponse('VALIDATION_ERROR', 'PIN incorrecto o empleado inactivo', {
        reason: 'INVALID_PIN',
        field: 'pin',
        hint: 'Verifique su PIN de 4 dígitos',
      }), 401);
    }

    // Buscar nombre de la compañía principal del empleado
    let companyName = null;
    if (employee.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('company_name')
        .eq('id', employee.company_id)
        .maybeSingle();
      
      if (company) {
        companyName = company.company_name;
      }
    }

    // Buscar última marcación
    const { data: lastPunch } = await supabase
      .from('employee_time_punches')
      .select('punch_datetime, punch_type_id, request_source_id')
      .eq('employee_id', employee.id)
      .order('punch_datetime', { ascending: false })
      .limit(1)
      .maybeSingle();

    let lastPunchInfo = null;
    if (lastPunch) {
      // Obtener tipo de marcación
      const { data: punchType } = await supabase
        .from('lookup_values')
        .select('code, value')
        .eq('id', lastPunch.punch_type_id)
        .single();

      // Obtener fuente
      const { data: source } = await supabase
        .from('lookup_values')
        .select('code, value')
        .eq('id', lastPunch.request_source_id)
        .single();

      lastPunchInfo = {
        datetime: lastPunch.punch_datetime,
        type: punchType?.code || 'UNKNOWN',
        source: source?.code || 'UNKNOWN',
      };
    }

    // Buscar turno actual del empleado (por defecto o planificado)
    const today = new Date().toISOString().split('T')[0];
    
    // Primero buscar turno planificado
    const { data: plannedShift } = await supabase
      .from('employee_shift_planning')
      .select(`
        shift_id,
        shifts (
          id,
          shift_name,
          short_name,
          start_time,
          end_time
        )
      `)
      .eq('employee_id', employee.id)
      .eq('planning_date', today)
      .eq('is_active', true)
      .maybeSingle();

    let currentShift = null;
    if (plannedShift?.shifts) {
      currentShift = {
        id: plannedShift.shifts.id,
        name: plannedShift.shifts.shift_name,
        short_name: plannedShift.shifts.short_name,
        start_time: plannedShift.shifts.start_time,
        end_time: plannedShift.shifts.end_time,
      };
    } else {
      // Si no hay turno planificado, buscar turno por defecto
      const { data: defaultShift } = await supabase
        .from('employee_shift_assignments')
        .select(`
          shift_id,
          shifts (
            id,
            shift_name,
            short_name,
            start_time,
            end_time
          )
        `)
        .eq('employee_id', employee.id)
        .eq('is_active', true)
        .maybeSingle();

      if (defaultShift?.shifts) {
        currentShift = {
          id: defaultShift.shifts.id,
          name: defaultShift.shifts.shift_name,
          short_name: defaultShift.shifts.short_name,
          start_time: defaultShift.shifts.start_time,
          end_time: defaultShift.shifts.end_time,
        };
      }
    }

    // Generar session token (JWT temporal válido por 5 minutos)
    // Por ahora, generar un token simple (en producción usar JWT real)
    const sessionToken = crypto.randomUUID();

    // TODO: Almacenar session token en KV store con TTL de 5 minutos

    const response = {
      employee: {
        id: employee.id,
        code: employee.employee_code,
        full_name: `${employee.first_name} ${employee.last_name}`,
        photo_url: employee.photo_url,
        company: {
          id: employee.company_id,
          name: companyName,
        },
        current_shift: currentShift,
        last_punch: lastPunchInfo,
      },
      session_token: sessionToken,
    };

    return c.json(createSuccessResponse(response));
  } catch (error: any) {
    console.error('❌ Error en identify:', error);
    return c.json(createErrorResponse('INTERNAL_ERROR', 'Error interno del servidor'), 500);
  }
}

/**
 * POST /kiosk/punch
 * Registrar marcación de asistencia
 */
export async function punch(c: Context) {
  try {
    const authUser = c.get('authUser');
    const requestId = generateRequestId();
    console.log(`🔵 [KIOSK] POST /punch | request_id: ${requestId} | user: ${authUser?.id || 'unknown'}`);

    const body = await c.req.json();
    const { session_token, employee_id, punch_key, device_id, notes } = body;

    // Validaciones
    if (!employee_id) {
      console.log(`❌ [KIOSK] ERROR | code: VALIDATION_ERROR | reason: MISSING_EMPLOYEE_ID | request_id: ${requestId}`);
      return c.json(createErrorResponse('VALIDATION_ERROR', 'employee_id requerido', {
        reason: 'MISSING_EMPLOYEE_ID',
        field: 'employee_id',
      }), 422);
    }

    if (!punch_key) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'punch_key requerido', {
        reason: 'MISSING_PUNCH_KEY',
        field: 'punch_key',
      }), 422);
    }

    const supabase = getSupabaseClient();

    // Buscar lookup para punch_type según punch_key
    const punchTypeMapping: { [key: number]: string } = {
      1: 'IN',
      2: 'OUT',
      3: 'LUNCH_OUT',
      4: 'LUNCH_IN',
      5: 'PERMISSION_OUT',
      6: 'PERMISSION_IN',
    };

    const punchTypeCode = punchTypeMapping[punch_key];
    if (!punchTypeCode) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'punch_key inválido', {
        reason: 'INVALID_PUNCH_KEY',
        field: 'punch_key',
        hint: 'Valores permitidos: 1-6',
      }), 422);
    }

    // Obtener ID del lookup value
    const { data: punchType, error: punchTypeError } = await supabase
      .from('lookup_values')
      .select('id, code, value')
      .eq('code', punchTypeCode)
      .eq('lookup_group_id', (
        await supabase
          .from('lookup_groups')
          .select('id')
          .eq('code', 'PUNCH_TYPE')
          .single()
      ).data?.id)
      .single();

    if (punchTypeError || !punchType) {
      console.error('❌ Error obteniendo tipo de marcación:', punchTypeError);
      return c.json(createErrorResponse('INTERNAL_ERROR', 'Error obteniendo tipo de marcación'), 500);
    }

    // TODO: Validar session_token (por ahora omitimos validación)

    // TODO: Verificar throttling (30 segundos entre marcaciones)

    // Obtener última marcación para validar secuencia
    const { data: lastPunch } = await supabase
      .from('employee_time_punches')
      .select('punch_datetime, punch_type_id')
      .eq('employee_id', employee_id)
      .order('punch_datetime', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastPunch) {
      const { data: lastPunchType } = await supabase
        .from('lookup_values')
        .select('code')
        .eq('id', lastPunch.punch_type_id)
        .single();

      // Validar secuencia básica: no permitir OUT sin IN previo
      if (punchTypeCode === 'OUT' && lastPunchType?.code !== 'IN') {
        return c.json(createErrorResponse('VALIDATION_ERROR', 'No puede marcar salida sin haber marcado entrada', {
          reason: 'INVALID_SEQUENCE',
          last_punch_type: lastPunchType?.code,
          requested_type: punchTypeCode,
        }), 422);
      }

      // No permitir doble IN consecutivo
      if (punchTypeCode === 'IN' && lastPunchType?.code === 'IN') {
        console.log(`❌ [KIOSK] ERROR | code: VALIDATION_ERROR | reason: INVALID_SEQUENCE | request_id: ${requestId}`);
        return c.json(createErrorResponse('VALIDATION_ERROR', 'Ya tiene una marcación de entrada activa', {
          reason: 'INVALID_SEQUENCE',
          last_punch_type: lastPunchType?.code,
          requested_type: punchTypeCode,
        }), 422);
      }
    }

    // Obtener request_source_id para KIOSK
    const { data: requestSource } = await supabase
      .from('lookup_values')
      .select('id')
      .eq('code', 'KIOSK')
      .eq('lookup_group_id', (
        await supabase
          .from('lookup_groups')
          .select('id')
          .eq('code', 'REQUEST_SOURCE')
          .single()
      ).data?.id)
      .single();

    // Verificar si contingencia está activa
    const { data: config } = await supabase
      .from('kiosk_configuration')
      .select('contingency_enabled, contingency_reason_id, contingency_activated_by_user_id, contingency_activated_at')
      .eq('tenant_id', c.get('tenantId'))
      .eq('is_active', true)
      .maybeSingle();

    const isContingency = config?.contingency_enabled || false;

    // Crear marcación (usar HORA DEL SERVIDOR)
    const punchDatetime = new Date().toISOString();

    const { data: newPunch, error: punchError } = await supabase
      .from('employee_time_punches')
      .insert({
        tenant_id: c.get('tenantId'),
        employee_id,
        punch_datetime: punchDatetime,
        punch_type_id: punchType.id,
        request_source_id: requestSource?.id,
        biometric_device_id: device_id || null,
        notes,
        is_contingency: isContingency,
        contingency_reason_id: isContingency ? config?.contingency_reason_id : null,
        contingency_activated_by_user_id: isContingency ? config?.contingency_activated_by_user_id : null,
        contingency_activated_at: isContingency ? config?.contingency_activated_at : null,
      })
      .select()
      .single();

    if (punchError) {
      console.error('❌ Error creando marcación:', punchError);
      return c.json(createErrorResponse('INTERNAL_ERROR', 'Error registrando marcación'), 500);
    }

    // Buscar información del dispositivo
    let deviceInfo = null;
    if (device_id) {
      const { data: device } = await supabase
        .from('biometric_devices')
        .select('id, device_name')
        .eq('id', device_id)
        .single();

      if (device) {
        deviceInfo = {
          id: device.id,
          name: device.device_name,
        };
      }
    }

    // Determinar próxima marcación esperada
    const nextExpectedPunch = punchTypeCode === 'IN' ? 'OUT' : 'IN';

    const response = {
      punch: {
        id: newPunch.id,
        datetime: newPunch.punch_datetime,
        type: punchTypeCode,
        source: 'KIOSK',
        is_contingency: isContingency,
        device: deviceInfo,
      },
      message: punchTypeCode === 'IN' ? 'Entrada registrada' : 
               punchTypeCode === 'OUT' ? 'Salida registrada' :
               punchTypeCode === 'LUNCH_OUT' ? 'Salida a almuerzo registrada' :
               punchTypeCode === 'LUNCH_IN' ? 'Regreso de almuerzo registrado' :
               'Marcación registrada',
      next_expected_punch: nextExpectedPunch,
    };

    return c.json(createSuccessResponse(response), 200);
  } catch (error: any) {
    console.error('❌ Error en punch:', error);
    return c.json(createErrorResponse('INTERNAL_ERROR', 'Error interno del servidor'), 500);
  }
}

/**
 * GET /kiosk/my-punches
 * Obtener marcaciones del empleado (últimos 7 días por defecto)
 */
export async function getMyPunches(c: Context) {
  try {
    const employeeId = c.req.query('employee_id');
    const days = parseInt(c.req.query('days') || '7');

    if (!employeeId) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'employee_id requerido', {
        reason: 'MISSING_EMPLOYEE_ID',
        field: 'employee_id',
      }), 422);
    }

    if (days > 30) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'Máximo 30 días', {
        reason: 'DAYS_LIMIT_EXCEEDED',
        field: 'days',
        max: 30,
      }), 422);
    }

    const supabase = getSupabaseClient();

    // Calcular fecha desde
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromDateStr = fromDate.toISOString();

    // Obtener marcaciones
    const { data: punches, error: punchesError } = await supabase
      .from('employee_time_punches')
      .select(`
        id,
        punch_datetime,
        punch_type_id,
        request_source_id,
        biometric_device_id,
        is_contingency,
        notes
      `)
      .eq('employee_id', employeeId)
      .gte('punch_datetime', fromDateStr)
      .order('punch_datetime', { ascending: false });

    if (punchesError) {
      console.error('❌ Error obteniendo marcaciones:', punchesError);
      return c.json(createErrorResponse('INTERNAL_ERROR', 'Error obteniendo marcaciones'), 500);
    }

    // Enriquecer con información de lookups y dispositivos
    const enrichedPunches = await Promise.all(
      (punches || []).map(async (punch) => {
        // Obtener tipo de marcación
        const { data: punchType } = await supabase
          .from('lookup_values')
          .select('code, value')
          .eq('id', punch.punch_type_id)
          .single();

        // Obtener fuente
        const { data: source } = await supabase
          .from('lookup_values')
          .select('code, value')
          .eq('id', punch.request_source_id)
          .single();

        // Obtener dispositivo
        let deviceInfo = null;
        if (punch.biometric_device_id) {
          const { data: device } = await supabase
            .from('biometric_devices')
            .select('id, device_name')
            .eq('id', punch.biometric_device_id)
            .single();

          if (device) {
            deviceInfo = {
              id: device.id,
              name: device.device_name,
            };
          }
        }

        const punchDate = new Date(punch.punch_datetime);
        return {
          id: punch.id,
          date: punchDate.toISOString().split('T')[0],
          time: punchDate.toISOString().split('T')[1].split('.')[0],
          datetime: punch.punch_datetime,
          type: punchType?.code || 'UNKNOWN',
          source: source?.code || 'UNKNOWN',
          device: deviceInfo,
          is_contingency: punch.is_contingency,
          status: 'NORMAL', // TODO: Calcular status basado en anomalías
        };
      })
    );

    // TODO: Calcular anomalías para summary

    const response = {
      punches: enrichedPunches,
      summary: {
        total_punches: enrichedPunches.length,
        total_anomalies: 0, // TODO: Calcular
        last_punch: enrichedPunches.length > 0 ? {
          datetime: enrichedPunches[0].datetime,
          type: enrichedPunches[0].type,
        } : null,
      },
    };

    return c.json(createSuccessResponse(response));
  } catch (error: any) {
    console.error('❌ Error en getMyPunches:', error);
    return c.json(createErrorResponse('INTERNAL_ERROR', 'Error interno del servidor'), 500);
  }
}

// ============================================================================
// FASE 2B: CONSULTAS (6 ENDPOINTS)
// ============================================================================

/**
 * GET /kiosk/my-shifts
 * Obtener turnos asignados/planificados del empleado
 */
export async function getMyShifts(c: Context) {
  try {
    const employeeId = c.req.query('employee_id');
    const fromStr = c.req.query('from');
    const toStr = c.req.query('to');

    if (!employeeId) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'employee_id requerido', {
        reason: 'MISSING_EMPLOYEE_ID',
        field: 'employee_id',
      }), 422);
    }

    // Valores por defecto: desde hoy hasta +7 días
    const fromDate = fromStr ? new Date(fromStr) : new Date();
    const toDate = toStr ? new Date(toStr) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Validar rango
    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > MAX_DAYS_RANGE) {
      return c.json(createErrorResponse('DATE_RANGE_TOO_LARGE', `Rango de fechas inválido (máximo ${MAX_DAYS_RANGE} días)`), 422);
    }

    const supabase = getSupabaseClient();

    // Obtener turno por defecto
    const { data: defaultAssignment } = await supabase
      .from('employee_shift_assignments')
      .select(`
        shift_id,
        shifts (
          id,
          shift_name,
          short_name,
          shift_code,
          start_time,
          end_time,
          shift_type
        )
      `)
      .eq('employee_id', employeeId)
      .eq('is_active', true)
      .maybeSingle();

    // Obtener turnos planificados en el rango
    const { data: plannedShifts } = await supabase
      .from('employee_shift_planning')
      .select(`
        planning_date,
        shift_id,
        shifts (
          id,
          shift_name,
          short_name,
          shift_code,
          start_time,
          end_time,
          shift_type
        )
      `)
      .eq('employee_id', employeeId)
      .gte('planning_date', fromDate.toISOString().split('T')[0])
      .lte('planning_date', toDate.toISOString().split('T')[0])
      .eq('is_active', true);

    // Construir array de días
    const shifts = [];
    const plannedMap = new Map();
    
    (plannedShifts || []).forEach((ps) => {
      plannedMap.set(ps.planning_date, ps);
    });

    let currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const planned = plannedMap.get(dateStr);

      if (planned?.shifts) {
        shifts.push({
          date: dateStr,
          shift: {
            id: planned.shifts.id,
            name: planned.shifts.shift_name,
            short_name: planned.shifts.short_name,
            code: planned.shifts.shift_code,
            start_time: planned.shifts.start_time,
            end_time: planned.shifts.end_time,
            shift_type: planned.shifts.shift_type,
          },
          is_planned: true,
          source: 'PLANNED',
        });
      } else if (defaultAssignment?.shifts) {
        shifts.push({
          date: dateStr,
          shift: {
            id: defaultAssignment.shifts.id,
            name: defaultAssignment.shifts.shift_name,
            short_name: defaultAssignment.shifts.short_name,
            code: defaultAssignment.shifts.shift_code,
            start_time: defaultAssignment.shifts.start_time,
            end_time: defaultAssignment.shifts.end_time,
            shift_type: defaultAssignment.shifts.shift_type,
          },
          is_planned: false,
          source: 'DEFAULT',
        });
      } else {
        shifts.push({
          date: dateStr,
          shift: null,
          is_planned: false,
          source: 'NONE',
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    const totalShifts = shifts.filter(s => s.shift !== null).length;
    const totalFreeDays = shifts.filter(s => s.shift === null).length;

    const response = {
      shifts,
      summary: {
        total_days: shifts.length,
        total_shifts: totalShifts,
        total_free_days: totalFreeDays,
      },
    };

    return c.json(createSuccessResponse(response));
  } catch (error: any) {
    console.error('❌ Error en getMyShifts:', error);
    return c.json(createErrorResponse('INTERNAL_ERROR', 'Error interno del servidor'), 500);
  }
}

/**
 * GET /kiosk/my-anomalies
 * Obtener anomalías del empleado
 */
export async function getMyAnomalies(c: Context) {
  try {
    const employeeId = c.req.query('employee_id');
    const days = parseInt(c.req.query('days') || '7');

    if (!employeeId) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'employee_id requerido', {
        reason: 'MISSING_EMPLOYEE_ID',
        field: 'employee_id',
      }), 422);
    }

    if (days > 30) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'Máximo 30 días', {
        reason: 'DAYS_LIMIT_EXCEEDED',
        field: 'days',
        max: 30,
      }), 422);
    }

    // TODO: Implementar lógica real de anomalías
    // Por ahora retornar estructura vacía

    const response = {
      anomalies: [],
      summary: {
        total_anomalies: 0,
        pending_regularizations: 0,
      },
    };

    return c.json(createSuccessResponse(response));
  } catch (error: any) {
    console.error('❌ Error en getMyAnomalies:', error);
    return c.json(createErrorResponse('INTERNAL_ERROR', 'Error interno del servidor'), 500);
  }
}

/**
 * GET /kiosk/my-permissions
 * Obtener solicitudes de permisos del empleado (con paginación)
 */
export async function getMyPermissions(c: Context) {
  try {
    const employeeId = c.req.query('employee_id');
    const fromStr = c.req.query('from');
    const toStr = c.req.query('to');
    const statusFilter = c.req.query('status');
    const limit = Math.min(parseInt(c.req.query('limit') || String(DEFAULT_LIMIT)), MAX_LIMIT);
    const offset = parseInt(c.req.query('offset') || String(DEFAULT_OFFSET));

    if (!employeeId) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'employee_id requerido', {
        reason: 'MISSING_EMPLOYEE_ID',
        field: 'employee_id',
      }), 422);
    }

    const supabase = getSupabaseClient();

    let query = supabase
      .from('employee_absence_requests')
      .select(`
        id,
        tenant_id,
        employee_id,
        requested_by_user_id,
        request_source_id,
        request_status_id,
        justification_type_id,
        attendance_event_id,
        start_datetime,
        end_datetime,
        start_time,
        end_time,
        notes,
        approved_by_user_id,
        approved_at,
        rejection_reason,
        created_at,
        updated_at,
        is_active
      `, { count: 'exact' })
      .eq('employee_id', employeeId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtrar por fechas
    if (fromStr) {
      query = query.gte('start_datetime', fromStr);
    }
    if (toStr) {
      query = query.lte('end_datetime', toStr);
    }

    const { data: requests, error: requestsError, count } = await query;

    if (requestsError) {
      console.error('❌ Error obteniendo permisos:', requestsError);
      return c.json(createErrorResponse('INTERNAL_ERROR', 'Error obteniendo permisos'), 500);
    }

    // Enriquecer con lookups
    const enrichedItems = await Promise.all(
      (requests || []).map(async (req) => {
        // Obtener status
        const { data: status } = await supabase
          .from('lookup_values')
          .select('code, value')
          .eq('id', req.request_status_id)
          .single();

        // Filtrar por status si se solicitó
        if (statusFilter && status?.code !== statusFilter) {
          return null;
        }

        // Obtener tipo de justificación
        const { data: justType } = await supabase
          .from('lookup_values')
          .select('value')
          .eq('id', req.justification_type_id)
          .single();

        return {
          id: req.id,
          tenant_id: req.tenant_id,
          employee_id: req.employee_id,
          requested_by_user_id: req.requested_by_user_id,
          request_source_id: req.request_source_id,
          status_id: req.request_status_id,
          status_key: status?.code || 'UNKNOWN',
          status_label: status?.value || 'Desconocido',
          permission_type_id: req.justification_type_id,
          permission_type_label: justType?.value || 'Sin tipo',
          start_date: req.start_datetime?.split('T')[0] || null,
          end_date: req.end_datetime?.split('T')[0] || null,
          start_time: req.start_time,
          end_time: req.end_time,
          notes: req.notes,
          approved_by_user_id: req.approved_by_user_id,
          approved_at: req.approved_at,
          rejection_reason: req.rejection_reason,
          created_at: req.created_at,
          updated_at: req.updated_at,
          is_active: req.is_active,
        };
      })
    );

    const filteredItems = enrichedItems.filter(item => item !== null);

    const response = {
      items: filteredItems,
      page: {
        limit,
        offset,
        total: count || 0,
      },
    };

    return c.json(createSuccessResponse(response));
  } catch (error: any) {
    console.error('❌ Error en getMyPermissions:', error);
    return c.json(createErrorResponse('INTERNAL_ERROR', 'Error interno del servidor'), 500);
  }
}

/**
 * GET /kiosk/my-regularizations
 * Obtener solicitudes de regularización del empleado (con paginación)
 */
export async function getMyRegularizations(c: Context) {
  try {
    const employeeId = c.req.query('employee_id');
    const fromStr = c.req.query('from');
    const toStr = c.req.query('to');
    const statusFilter = c.req.query('status');
    const limit = Math.min(parseInt(c.req.query('limit') || String(DEFAULT_LIMIT)), MAX_LIMIT);
    const offset = parseInt(c.req.query('offset') || String(DEFAULT_OFFSET));

    if (!employeeId) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'employee_id requerido', {
        reason: 'MISSING_EMPLOYEE_ID',
        field: 'employee_id',
      }), 422);
    }

    const supabase = getSupabaseClient();

    let query = supabase
      .from('employee_regularization_requests')
      .select(`
        id,
        tenant_id,
        employee_id,
        requested_by_user_id,
        request_source_id,
        request_status_id,
        original_punch_id,
        requested_date,
        requested_time,
        requested_punch_key,
        regularization_reason_id,
        notes,
        approved_by_user_id,
        approved_at,
        rejection_reason,
        created_at,
        updated_at,
        is_active
      `, { count: 'exact' })
      .eq('employee_id', employeeId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtrar por fechas
    if (fromStr) {
      query = query.gte('requested_date', fromStr);
    }
    if (toStr) {
      query = query.lte('requested_date', toStr);
    }

    const { data: requests, error: requestsError, count } = await query;

    if (requestsError) {
      console.error('❌ Error obteniendo regularizaciones:', requestsError);
      return c.json(createErrorResponse('INTERNAL_ERROR', 'Error obteniendo regularizaciones'), 500);
    }

    // Enriquecer con lookups
    const enrichedItems = await Promise.all(
      (requests || []).map(async (req) => {
        // Obtener status
        const { data: status } = await supabase
          .from('lookup_values')
          .select('code, value')
          .eq('id', req.request_status_id)
          .single();

        // Filtrar por status si se solicitó
        if (statusFilter && status?.code !== statusFilter) {
          return null;
        }

        // Obtener razón
        const { data: reason } = await supabase
          .from('lookup_values')
          .select('value')
          .eq('id', req.regularization_reason_id)
          .single();

        // Mapear punch_key a código
        const punchTypeMapping: { [key: number]: string } = {
          1: 'IN', 2: 'OUT', 3: 'LUNCH_OUT', 4: 'LUNCH_IN',
        };
        const punchTypeKey = punchTypeMapping[req.requested_punch_key] || 'UNKNOWN';

        // Construir proposed_punch_at combinando date + time
        const proposedPunchAt = req.requested_date && req.requested_time
          ? `${req.requested_date}T${req.requested_time}:00Z`
          : null;

        return {
          id: req.id,
          tenant_id: req.tenant_id,
          employee_id: req.employee_id,
          requested_by_user_id: req.requested_by_user_id,
          request_source_id: req.request_source_id,
          status_id: req.request_status_id,
          status_key: status?.code || 'UNKNOWN',
          status_label: status?.value || 'Desconocido',
          target_punch_id: req.original_punch_id,
          proposed_punch_at: proposedPunchAt,
          punch_type_key: punchTypeKey,
          reason_id: req.regularization_reason_id,
          reason_label: reason?.value || 'Sin razón',
          comments: req.notes,
          approved_by_user_id: req.approved_by_user_id,
          approved_at: req.approved_at,
          rejection_reason: req.rejection_reason,
          created_at: req.created_at,
          updated_at: req.updated_at,
          is_active: req.is_active,
        };
      })
    );

    const filteredItems = enrichedItems.filter(item => item !== null);

    const response = {
      items: filteredItems,
      page: {
        limit,
        offset,
        total: count || 0,
      },
    };

    return c.json(createSuccessResponse(response));
  } catch (error: any) {
    console.error('❌ Error en getMyRegularizations:', error);
    return c.json(createErrorResponse('INTERNAL_ERROR', 'Error interno del servidor'), 500);
  }
}

/**
 * GET /kiosk/my-justifications
 * Obtener solicitudes de justificación del empleado (con paginación)
 */
export async function getMyJustifications(c: Context) {
  try {
    const employeeId = c.req.query('employee_id');
    const fromStr = c.req.query('from');
    const toStr = c.req.query('to');
    const statusFilter = c.req.query('status');
    const limit = Math.min(parseInt(c.req.query('limit') || String(DEFAULT_LIMIT)), MAX_LIMIT);
    const offset = parseInt(c.req.query('offset') || String(DEFAULT_OFFSET));

    if (!employeeId) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'employee_id requerido', {
        reason: 'MISSING_EMPLOYEE_ID',
        field: 'employee_id',
      }), 422);
    }

    // TODO: Implementar cuando se defina tabla de justificaciones de anomalías
    // Por ahora retornar estructura vacía con paginación

    const response = {
      items: [],
      page: {
        limit,
        offset,
        total: 0,
      },
    };

    return c.json(createSuccessResponse(response));
  } catch (error: any) {
    console.error('❌ Error en getMyJustifications:', error);
    return c.json(createErrorResponse('INTERNAL_ERROR', 'Error interno del servidor'), 500);
  }
}

/**
 * GET /kiosk/my-shift-changes
 * Obtener solicitudes de cambio de turno del empleado (con paginación)
 */
export async function getMyShiftChanges(c: Context) {
  try {
    const employeeId = c.req.query('employee_id');
    const fromStr = c.req.query('from');
    const toStr = c.req.query('to');
    const statusFilter = c.req.query('status');
    const limit = Math.min(parseInt(c.req.query('limit') || String(DEFAULT_LIMIT)), MAX_LIMIT);
    const offset = parseInt(c.req.query('offset') || String(DEFAULT_OFFSET));

    if (!employeeId) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'employee_id requerido', {
        reason: 'MISSING_EMPLOYEE_ID',
        field: 'employee_id',
      }), 422);
    }

    const supabase = getSupabaseClient();

    let query = supabase
      .from('employee_shift_change_requests')
      .select(`
        id,
        tenant_id,
        employee_id,
        requested_by_user_id,
        request_source_id,
        request_status_id,
        requested_date,
        current_shift_id,
        requested_shift_id,
        change_reason_id,
        notes,
        approved_by_user_id,
        approved_at,
        rejection_reason,
        created_at,
        updated_at,
        is_active
      `, { count: 'exact' })
      .eq('employee_id', employeeId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtrar por fechas
    if (fromStr) {
      query = query.gte('requested_date', fromStr);
    }
    if (toStr) {
      query = query.lte('requested_date', toStr);
    }

    const { data: requests, error: requestsError, count } = await query;

    if (requestsError) {
      console.error('❌ Error obteniendo cambios de turno:', requestsError);
      return c.json(createErrorResponse('INTERNAL_ERROR', 'Error obteniendo cambios de turno'), 500);
    }

    // Enriquecer con lookups y shifts
    const enrichedItems = await Promise.all(
      (requests || []).map(async (req) => {
        // Obtener status
        const { data: status } = await supabase
          .from('lookup_values')
          .select('code, value')
          .eq('id', req.request_status_id)
          .single();

        // Filtrar por status si se solicitó
        if (statusFilter && status?.code !== statusFilter) {
          return null;
        }

        // Obtener razón
        const { data: reason } = await supabase
          .from('lookup_values')
          .select('value')
          .eq('id', req.change_reason_id)
          .single();

        // Obtener turno actual
        const { data: currentShift } = await supabase
          .from('shifts')
          .select('start_time, end_time')
          .eq('id', req.current_shift_id)
          .single();

        // Obtener turno solicitado
        const { data: requestedShift } = await supabase
          .from('shifts')
          .select('start_time, end_time')
          .eq('id', req.requested_shift_id)
          .single();

        return {
          id: req.id,
          tenant_id: req.tenant_id,
          employee_id: req.employee_id,
          requested_by_user_id: req.requested_by_user_id,
          request_source_id: req.request_source_id,
          status_id: req.request_status_id,
          status_key: status?.code || 'UNKNOWN',
          status_label: status?.value || 'Desconocido',
          date_from: req.requested_date,
          date_to: req.requested_date, // Mismo día por ahora
          current_shift_id: req.current_shift_id,
          current_shift_label: currentShift ? `${currentShift.start_time}-${currentShift.end_time}` : 'N/A',
          requested_shift_id: req.requested_shift_id,
          requested_shift_label: requestedShift ? `${requestedShift.start_time}-${requestedShift.end_time}` : 'N/A',
          reason_id: req.change_reason_id,
          reason_label: reason?.value || 'Sin razón',
          comments: req.notes,
          approved_by_user_id: req.approved_by_user_id,
          approved_at: req.approved_at,
          rejection_reason: req.rejection_reason,
          created_at: req.created_at,
          updated_at: req.updated_at,
          is_active: req.is_active,
        };
      })
    );

    const filteredItems = enrichedItems.filter(item => item !== null);

    const response = {
      items: filteredItems,
      page: {
        limit,
        offset,
        total: count || 0,
      },
    };

    return c.json(createSuccessResponse(response));
  } catch (error: any) {
    console.error('❌ Error en getMyShiftChanges:', error);
    return c.json(createErrorResponse('INTERNAL_ERROR', 'Error interno del servidor'), 500);
  }
}

// ============================================================================
// FASE 2C: SOLICITUDES (4 ENDPOINTS)
// ============================================================================

/**
 * POST /kiosk/request-regularization
 * Solicitar regularización de marcación
 */
export async function requestRegularization(c: Context) {
  try {
    const body = await c.req.json();
    const {
      employee_id,
      requested_date,
      requested_time,
      requested_punch_key,
      regularization_reason_id,
      notes,
      original_punch_id,
    } = body;

    // Validaciones
    if (!employee_id || !requested_date || !requested_time || !requested_punch_key || !regularization_reason_id) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'Faltan campos requeridos', {
        reason: 'MISSING_FIELDS',
        required: ['employee_id', 'requested_date', 'requested_time', 'requested_punch_key', 'regularization_reason_id'],
      }), 422);
    }

    // Validar que no sea fecha futura
    const requestedDateTime = new Date(`${requested_date}T${requested_time}`);
    const now = new Date();
    if (requestedDateTime > now) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'No puede solicitar regularización para fechas futuras', {
        reason: 'FUTURE_DATE',
        field: 'requested_date',
        value: requested_date,
      }), 422);
    }

    const supabase = getSupabaseClient();
    const tenantId = c.get('tenantId');
    const userRecord = c.get('userRecord');

    // Obtener request_source_id para KIOSK
    const { data: requestSource } = await supabase
      .from('lookup_values')
      .select('id')
      .eq('code', 'KIOSK')
      .eq('lookup_group_id', (
        await supabase
          .from('lookup_groups')
          .select('id')
          .eq('code', 'REQUEST_SOURCE')
          .single()
      ).data?.id)
      .single();

    // Obtener request_status_id para PENDING
    const { data: statusPending } = await supabase
      .from('lookup_values')
      .select('id')
      .eq('code', 'PENDING')
      .eq('lookup_group_id', (
        await supabase
          .from('lookup_groups')
          .select('id')
          .eq('code', 'REQUEST_STATUS')
          .single()
      ).data?.id)
      .single();

    // Obtener employee para company_id
    const { data: employee } = await supabase
      .from('employees')
      .select('company_id')
      .eq('id', employee_id)
      .single();

    // Crear solicitud
    const { data: newRequest, error: insertError } = await supabase
      .from('employee_regularization_requests')
      .insert({
        tenant_id: tenantId,
        company_id: employee?.company_id,
        employee_id,
        requested_by_user_id: userRecord.id,
        request_source_id: requestSource?.id,
        request_status_id: statusPending?.id,
        original_punch_id,
        requested_date,
        requested_time,
        requested_punch_key,
        regularization_reason_id,
        notes,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creando solicitud:', insertError);
      return c.json(createErrorResponse('INTERNAL_ERROR', 'Error creando solicitud de regularización'), 500);
    }

    // Obtener información de la razón
    const { data: reason } = await supabase
      .from('lookup_values')
      .select('id, code, value')
      .eq('id', regularization_reason_id)
      .single();

    // Mapear punch_key a código
    const punchTypeMapping: { [key: number]: string } = {
      1: 'IN', 2: 'OUT', 3: 'LUNCH_OUT', 4: 'LUNCH_IN',
    };
    const punchTypeKey = punchTypeMapping[requested_punch_key] || 'UNKNOWN';

    const response = {
      request: {
        id: newRequest.id,
        requested_date,
        requested_time,
        punch_type: punchTypeKey,
        reason: {
          id: reason?.id,
          code: reason?.code,
          value: reason?.value,
        },
        status: {
          id: statusPending?.id,
          code: 'PENDING',
          value: 'Pendiente',
        },
        created_at: newRequest.created_at,
      },
      message: 'Solicitud de regularización creada. Pendiente de aprobación.',
    };

    return c.json(createSuccessResponse(response), 200);
  } catch (error: any) {
    console.error('❌ Error en requestRegularization:', error);
    return c.json(createErrorResponse('INTERNAL_ERROR', 'Error interno del servidor'), 500);
  }
}

/**
 * POST /kiosk/request-permission
 * Solicitar permiso/ausencia con rango de fechas
 */
export async function requestPermission(c: Context) {
  try {
    const body = await c.req.json();
    const {
      employee_id,
      justification_type_id,
      attendance_event_id,
      start_datetime,
      end_datetime,
      start_time,
      end_time,
      notes,
    } = body;

    // Validaciones
    if (!employee_id || !justification_type_id || !attendance_event_id || !start_datetime || !end_datetime) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'Faltan campos requeridos', {
        reason: 'MISSING_FIELDS',
        required: ['employee_id', 'justification_type_id', 'attendance_event_id', 'start_datetime', 'end_datetime'],
      }), 422);
    }

    // Validar orden de fechas
    const startDate = new Date(start_datetime);
    const endDate = new Date(end_datetime);
    if (startDate > endDate) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'La fecha de inicio debe ser anterior a la fecha de fin', {
        reason: 'INVALID_DATE_RANGE',
        start_datetime,
        end_datetime,
      }), 422);
    }

    const supabase = getSupabaseClient();
    const tenantId = c.get('tenantId');
    const userRecord = c.get('userRecord');

    // Obtener request_source_id para KIOSK
    const { data: requestSource } = await supabase
      .from('lookup_values')
      .select('id')
      .eq('code', 'KIOSK')
      .eq('lookup_group_id', (
        await supabase
          .from('lookup_groups')
          .select('id')
          .eq('code', 'REQUEST_SOURCE')
          .single()
      ).data?.id)
      .single();

    // Obtener request_status_id para PENDING
    const { data: statusPending } = await supabase
      .from('lookup_values')
      .select('id')
      .eq('code', 'PENDING')
      .eq('lookup_group_id', (
        await supabase
          .from('lookup_groups')
          .select('id')
          .eq('code', 'REQUEST_STATUS')
          .single()
      ).data?.id)
      .single();

    // Obtener employee para company_id
    const { data: employee } = await supabase
      .from('employees')
      .select('company_id')
      .eq('id', employee_id)
      .single();

    // Crear solicitud
    const { data: newRequest, error: insertError } = await supabase
      .from('employee_absence_requests')
      .insert({
        tenant_id: tenantId,
        company_id: employee?.company_id,
        employee_id,
        requested_by_user_id: userRecord.id,
        request_source_id: requestSource?.id,
        request_status_id: statusPending?.id,
        justification_type_id,
        attendance_event_id,
        start_datetime,
        end_datetime,
        start_time,
        end_time,
        notes,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creando solicitud:', insertError);
      return c.json(createErrorResponse('INTERNAL_ERROR', 'Error creando solicitud de permiso'), 500);
    }

    // Obtener información del tipo de justificación
    const { data: justType } = await supabase
      .from('lookup_values')
      .select('value')
      .eq('id', justification_type_id)
      .single();

    // Obtener información del evento
    const { data: event } = await supabase
      .from('attendance_events')
      .select('event_name')
      .eq('id', attendance_event_id)
      .single();

    const response = {
      request: {
        id: newRequest.id,
        start_datetime,
        end_datetime,
        justification_type: {
          id: justification_type_id,
          name: justType?.value || 'Sin tipo',
        },
        event: {
          id: attendance_event_id,
          name: event?.event_name || 'Sin evento',
        },
        status: {
          id: statusPending?.id,
          code: 'PENDING',
          value: 'Pendiente',
        },
        created_at: newRequest.created_at,
      },
      message: 'Solicitud de permiso creada. Pendiente de aprobación.',
    };

    return c.json(createSuccessResponse(response), 200);
  } catch (error: any) {
    console.error('❌ Error en requestPermission:', error);
    return c.json(createErrorResponse('INTERNAL_ERROR', 'Error interno del servidor'), 500);
  }
}

/**
 * POST /kiosk/request-justification
 * Justificar inasistencia (ALIAS de request-permission pero con validación de fecha pasada)
 */
export async function requestJustification(c: Context) {
  try {
    const body = await c.req.json();
    const {
      employee_id,
      justification_type_id,
      attendance_event_id,
      absence_date,
      notes,
    } = body;

    // Validaciones
    if (!employee_id || !justification_type_id || !attendance_event_id || !absence_date) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'Faltan campos requeridos', {
        reason: 'MISSING_FIELDS',
        required: ['employee_id', 'justification_type_id', 'attendance_event_id', 'absence_date'],
      }), 422);
    }

    // Validar que sea fecha pasada
    const absenceDateTime = new Date(absence_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (absenceDateTime >= today) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'Solo puede justificar inasistencias pasadas', {
        reason: 'FUTURE_DATE',
        field: 'absence_date',
        value: absence_date,
      }), 422);
    }

    const supabase = getSupabaseClient();
    const tenantId = c.get('tenantId');
    const userRecord = c.get('userRecord');

    // Obtener request_source_id para KIOSK
    const { data: requestSource } = await supabase
      .from('lookup_values')
      .select('id')
      .eq('code', 'KIOSK')
      .eq('lookup_group_id', (
        await supabase
          .from('lookup_groups')
          .select('id')
          .eq('code', 'REQUEST_SOURCE')
          .single()
      ).data?.id)
      .single();

    // Obtener request_status_id para PENDING
    const { data: statusPending } = await supabase
      .from('lookup_values')
      .select('id')
      .eq('code', 'PENDING')
      .eq('lookup_group_id', (
        await supabase
          .from('lookup_groups')
          .select('id')
          .eq('code', 'REQUEST_STATUS')
          .single()
      ).data?.id)
      .single();

    // Obtener employee para company_id
    const { data: employee } = await supabase
      .from('employees')
      .select('company_id')
      .eq('id', employee_id)
      .single();

    // Crear solicitud (usando tabla de absence_requests)
    const { data: newRequest, error: insertError } = await supabase
      .from('employee_absence_requests')
      .insert({
        tenant_id: tenantId,
        company_id: employee?.company_id,
        employee_id,
        requested_by_user_id: userRecord.id,
        request_source_id: requestSource?.id,
        request_status_id: statusPending?.id,
        justification_type_id,
        attendance_event_id,
        start_datetime: `${absence_date}T00:00:00Z`,
        end_datetime: `${absence_date}T23:59:59Z`,
        notes,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creando solicitud:', insertError);
      return c.json(createErrorResponse('INTERNAL_ERROR', 'Error creando solicitud de justificación'), 500);
    }

    // Obtener información del tipo de justificación
    const { data: justType } = await supabase
      .from('lookup_values')
      .select('value')
      .eq('id', justification_type_id)
      .single();

    // Obtener información del evento
    const { data: event } = await supabase
      .from('attendance_events')
      .select('event_name')
      .eq('id', attendance_event_id)
      .single();

    const response = {
      request: {
        id: newRequest.id,
        absence_date,
        justification_type: {
          id: justification_type_id,
          name: justType?.value || 'Sin tipo',
        },
        event: {
          id: attendance_event_id,
          name: event?.event_name || 'Sin evento',
        },
        status: {
          id: statusPending?.id,
          code: 'PENDING',
          value: 'Pendiente',
        },
        created_at: newRequest.created_at,
      },
      message: 'Solicitud de justificación creada. Pendiente de aprobación.',
    };

    return c.json(createSuccessResponse(response), 200);
  } catch (error: any) {
    console.error('❌ Error en requestJustification:', error);
    return c.json(createErrorResponse('INTERNAL_ERROR', 'Error interno del servidor'), 500);
  }
}

/**
 * POST /kiosk/request-shift-change
 * Solicitar cambio de turno para una fecha específica
 */
export async function requestShiftChange(c: Context) {
  try {
    const body = await c.req.json();
    const {
      employee_id,
      requested_date,
      current_shift_id,
      requested_shift_id,
      change_reason_id,
      notes,
    } = body;

    // Validaciones
    if (!employee_id || !requested_date || !current_shift_id || !requested_shift_id || !change_reason_id) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'Faltan campos requeridos', {
        reason: 'MISSING_FIELDS',
        required: ['employee_id', 'requested_date', 'current_shift_id', 'requested_shift_id', 'change_reason_id'],
      }), 422);
    }

    // Validar que no sea el mismo turno
    if (current_shift_id === requested_shift_id) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'El turno solicitado es el mismo que el turno actual', {
        reason: 'SAME_SHIFT',
        current_shift_id,
        requested_shift_id,
      }), 422);
    }

    const supabase = getSupabaseClient();
    const tenantId = c.get('tenantId');
    const userRecord = c.get('userRecord');

    // Obtener request_source_id para KIOSK
    const { data: requestSource } = await supabase
      .from('lookup_values')
      .select('id')
      .eq('code', 'KIOSK')
      .eq('lookup_group_id', (
        await supabase
          .from('lookup_groups')
          .select('id')
          .eq('code', 'REQUEST_SOURCE')
          .single()
      ).data?.id)
      .single();

    // Obtener request_status_id para PENDING
    const { data: statusPending } = await supabase
      .from('lookup_values')
      .select('id')
      .eq('code', 'PENDING')
      .eq('lookup_group_id', (
        await supabase
          .from('lookup_groups')
          .select('id')
          .eq('code', 'REQUEST_STATUS')
          .single()
      ).data?.id)
      .single();

    // Obtener employee para company_id
    const { data: employee } = await supabase
      .from('employees')
      .select('company_id')
      .eq('id', employee_id)
      .single();

    // Crear solicitud
    const { data: newRequest, error: insertError } = await supabase
      .from('employee_shift_change_requests')
      .insert({
        tenant_id: tenantId,
        company_id: employee?.company_id,
        employee_id,
        requested_by_user_id: userRecord.id,
        request_source_id: requestSource?.id,
        request_status_id: statusPending?.id,
        requested_date,
        current_shift_id,
        requested_shift_id,
        change_reason_id,
        notes,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creando solicitud:', insertError);
      return c.json(createErrorResponse('INTERNAL_ERROR', 'Error creando solicitud de cambio de turno'), 500);
    }

    // Obtener información de los turnos
    const { data: currentShift } = await supabase
      .from('shifts')
      .select('shift_name, start_time, end_time')
      .eq('id', current_shift_id)
      .single();

    const { data: requestedShift } = await supabase
      .from('shifts')
      .select('shift_name, start_time, end_time')
      .eq('id', requested_shift_id)
      .single();

    // Obtener información de la razón
    const { data: reason } = await supabase
      .from('lookup_values')
      .select('id, code, value')
      .eq('id', change_reason_id)
      .single();

    const response = {
      request: {
        id: newRequest.id,
        requested_date,
        current_shift: {
          id: current_shift_id,
          name: currentShift?.shift_name || 'N/A',
          start_time: currentShift?.start_time,
          end_time: currentShift?.end_time,
        },
        requested_shift: {
          id: requested_shift_id,
          name: requestedShift?.shift_name || 'N/A',
          start_time: requestedShift?.start_time,
          end_time: requestedShift?.end_time,
        },
        reason: {
          id: reason?.id,
          code: reason?.code,
          value: reason?.value,
        },
        status: {
          id: statusPending?.id,
          code: 'PENDING',
          value: 'Pendiente',
        },
        created_at: newRequest.created_at,
      },
      message: 'Solicitud de cambio de turno creada. Pendiente de aprobación.',
    };

    return c.json(createSuccessResponse(response), 200);
  } catch (error: any) {
    console.error('❌ Error en requestShiftChange:', error);
    return c.json(createErrorResponse('INTERNAL_ERROR', 'Error interno del servidor'), 500);
  }
}

// ============================================================================
// FASE 2D: CONTINGENCIA (2 ENDPOINTS - SOLO SYSTEM_ADMIN)
// ============================================================================

/**
 * Middleware: Validar que el usuario sea SYSTEM_ADMIN
 */
async function requireSystemAdmin(c: Context, next: () => Promise<void>) {
  const authUser = c.get('authUser');
  
  if (!authUser) {
    return c.json(createErrorResponse('UNAUTHORIZED', 'Usuario no autenticado'), 401);
  }

  const supabase = getSupabaseClient();

  // Buscar usuario en tabla users
  const { data: userRecord, error: userError } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('auth_user_id', authUser.id)
    .single();

  if (userError || !userRecord) {
    console.error('❌ Usuario no encontrado en BD:', userError);
    return c.json(createErrorResponse('FORBIDDEN', 'Usuario no encontrado en el sistema'), 403);
  }

  // Buscar roles del usuario
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select(`
      role_id,
      roles (
        role_key,
        role_scope
      )
    `)
    .eq('user_id', userRecord.id);

  if (rolesError || !userRoles || userRoles.length === 0) {
    console.error('❌ Usuario sin roles:', rolesError);
    return c.json(createErrorResponse('FORBIDDEN', 'Usuario sin roles asignados'), 403);
  }

  // Verificar que tenga rol SYSTEM_ADMIN
  const hasSystemAdminRole = userRoles.some(
    (ur: any) => ur.roles?.role_key === 'SYSTEM_ADMIN' && ur.roles?.role_scope === 'TENANT'
  );

  if (!hasSystemAdminRole) {
    return c.json(createErrorResponse('FORBIDDEN', 'Solo SYSTEM_ADMIN puede gestionar contingencia'), 403);
  }

  // Almacenar datos del usuario en contexto
  c.set('userRecord', userRecord);
  c.set('tenantId', userRecord.tenant_id);

  await next();
}

/**
 * POST /kiosk/contingency/activate
 * Activar modo contingencia (SOLO SYSTEM_ADMIN)
 */
export async function activateContingency(c: Context) {
  try {
    const body = await c.req.json();
    const {
      tenant_id,
      company_id,
      device_id,
      contingency_reason_id,
      expires_at,
    } = body;

    if (!tenant_id || !contingency_reason_id) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'Faltan campos requeridos', {
        reason: 'MISSING_FIELDS',
        required: ['tenant_id', 'contingency_reason_id'],
      }), 422);
    }

    const supabase = getSupabaseClient();
    const userRecord = c.get('userRecord');

    // Calcular expires_at si no se proporcionó (default: +24 horas)
    const expiresAt = expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Buscar o crear configuración
    const { data: existingConfig } = await supabase
      .from('kiosk_configuration')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('company_id', company_id || null)
      .eq('device_id', device_id || null)
      .maybeSingle();

    let configId: string;

    if (existingConfig) {
      // Actualizar configuración existente
      const { data: updatedConfig, error: updateError } = await supabase
        .from('kiosk_configuration')
        .update({
          contingency_enabled: true,
          contingency_expires_at: expiresAt,
          contingency_reason_id,
          contingency_activated_by_user_id: userRecord.id,
          contingency_activated_at: new Date().toISOString(),
          updated_by: userRecord.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConfig.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error actualizando configuración:', updateError);
        return c.json(createErrorResponse('INTERNAL_ERROR', 'Error activando contingencia'), 500);
      }

      configId = updatedConfig.id;
    } else {
      // Crear nueva configuración
      const { data: newConfig, error: insertError } = await supabase
        .from('kiosk_configuration')
        .insert({
          tenant_id,
          company_id: company_id || null,
          device_id: device_id || null,
          contingency_enabled: true,
          contingency_expires_at: expiresAt,
          contingency_reason_id,
          contingency_activated_by_user_id: userRecord.id,
          contingency_activated_at: new Date().toISOString(),
          created_by: userRecord.id,
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creando configuración:', insertError);
        return c.json(createErrorResponse('INTERNAL_ERROR', 'Error activando contingencia'), 500);
      }

      configId = newConfig.id;
    }

    // Obtener información del usuario activador
    const { data: activatedBy } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userRecord.id)
      .single();

    // Obtener información de la razón
    const { data: reason } = await supabase
      .from('lookup_values')
      .select('id, code, value')
      .eq('id', contingency_reason_id)
      .single();

    const response = {
      config: {
        id: configId,
        contingency_enabled: true,
        contingency_expires_at: expiresAt,
        contingency_reason: {
          id: reason?.id,
          code: reason?.code,
          value: reason?.value,
        },
        activated_by: {
          id: activatedBy?.id,
          email: activatedBy?.email,
        },
        activated_at: new Date().toISOString(),
      },
      message: `Modo contingencia activado hasta ${expiresAt}`,
    };

    return c.json(createSuccessResponse(response), 200);
  } catch (error: any) {
    console.error('❌ Error en activateContingency:', error);
    return c.json(createErrorResponse('INTERNAL_ERROR', 'Error interno del servidor'), 500);
  }
}

/**
 * POST /kiosk/contingency/deactivate
 * Desactivar modo contingencia (SOLO SYSTEM_ADMIN)
 */
export async function deactivateContingency(c: Context) {
  try {
    const body = await c.req.json();
    const {
      tenant_id,
      company_id,
      device_id,
    } = body;

    if (!tenant_id) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'tenant_id requerido', {
        reason: 'MISSING_TENANT_ID',
        field: 'tenant_id',
      }), 422);
    }

    const supabase = getSupabaseClient();
    const userRecord = c.get('userRecord');

    // Buscar configuración
    const { data: config, error: configError } = await supabase
      .from('kiosk_configuration')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('company_id', company_id || null)
      .eq('device_id', device_id || null)
      .maybeSingle();

    if (configError || !config) {
      return c.json(createErrorResponse('VALIDATION_ERROR', 'No se encontró configuración activa', {
        reason: 'CONFIG_NOT_FOUND',
      }), 404);
    }

    // Desactivar contingencia
    const { data: updatedConfig, error: updateError } = await supabase
      .from('kiosk_configuration')
      .update({
        contingency_enabled: false,
        contingency_expires_at: null,
        updated_by: userRecord.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error desactivando contingencia:', updateError);
      return c.json(createErrorResponse('INTERNAL_ERROR', 'Error desactivando contingencia'), 500);
    }

    // Obtener información del usuario desactivador
    const { data: deactivatedBy } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', userRecord.id)
      .single();

    const response = {
      config: {
        id: updatedConfig.id,
        contingency_enabled: false,
        contingency_expires_at: null,
        deactivated_by: {
          id: deactivatedBy?.id,
          email: deactivatedBy?.email,
        },
        deactivated_at: new Date().toISOString(),
      },
      message: 'Modo contingencia desactivado',
    };

    return c.json(createSuccessResponse(response), 200);
  } catch (error: any) {
    console.error('❌ Error en deactivateContingency:', error);
    return c.json(createErrorResponse('INTERNAL_ERROR', 'Error interno del servidor'), 500);
  }
}

// ============================================================================
// EXPORTS PARA REGISTRO EN index.tsx
// ============================================================================

export { requireSystemAdmin };
