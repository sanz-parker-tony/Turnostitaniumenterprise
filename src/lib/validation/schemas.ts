/**
 * schemas.ts - Turnos Titanium Enterprise
 * Esquemas de validación con Zod para todos los formularios
 * 
 * REGLAS DE VALIDACIÓN:
 * ✅ Campos requeridos con mensajes personalizados
 * ✅ Longitud mínima/máxima
 * ✅ Formato de email
 * ✅ Formato de contraseña (8+ chars, mayúscula, número, especial)
 * ✅ URLs válidas
 * ✅ Números con rangos
 * ✅ Fechas válidas
 * ✅ Valores únicos (validación en submit)
 */

import { z } from 'zod';

// ============================================================================
// HELPERS DE VALIDACIÓN
// ============================================================================

/**
 * Validador de contraseña segura
 * Requiere: 8+ caracteres, mayúscula, minúscula, número, caracter especial
 */
export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
  .regex(/[a-z]/, 'Debe contener al menos una letra minúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un caracter especial (!@#$%^&*)');

/**
 * Validador de email
 */
export const emailSchema = z
  .string()
  .min(1, 'El email es requerido')
  .email('Debe ser un email válido')
  .toLowerCase()
  .trim();

/**
 * Validador de URL
 */
export const urlSchema = z
  .string()
  .url('Debe ser una URL válida')
  .trim();

/**
 * Validador de username (alfanumérico, guiones, puntos)
 */
export const usernameSchema = z
  .string()
  .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
  .max(50, 'El nombre de usuario no puede exceder 50 caracteres')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Solo se permiten letras, números, puntos, guiones y guiones bajos')
  .trim();

/**
 * Validador de key/código (UPPERCASE, snake_case)
 */
export const keySchema = z
  .string()
  .min(2, 'El código debe tener al menos 2 caracteres')
  .max(50, 'El código no puede exceder 50 caracteres')
  .regex(/^[A-Z0-9_]+$/, 'Solo se permiten letras mayúsculas, números y guiones bajos')
  .trim();

/**
 * Validador de texto requerido
 */
export const requiredTextSchema = (minLength = 1, maxLength = 255, fieldName = 'Este campo') =>
  z
    .string()
    .min(minLength, `${fieldName} debe tener al menos ${minLength} caracteres`)
    .max(maxLength, `${fieldName} no puede exceder ${maxLength} caracteres`)
    .trim();

/**
 * Validador de número entero positivo
 */
export const positiveIntSchema = (min = 1, max?: number, fieldName = 'Este campo') => {
  let schema = z
    .number({
      required_error: `${fieldName} es requerido`,
      invalid_type_error: `${fieldName} debe ser un número`,
    })
    .int(`${fieldName} debe ser un número entero`)
    .min(min, `${fieldName} debe ser mayor o igual a ${min}`);
  
  if (max !== undefined) {
    schema = schema.max(max, `${fieldName} debe ser menor o igual a ${max}`);
  }
  
  return schema;
};

/**
 * Validador de número decimal positivo
 */
export const positiveDecimalSchema = (min = 0, max?: number, decimals = 2, fieldName = 'Este campo') => {
  let schema = z
    .number({
      required_error: `${fieldName} es requerido`,
      invalid_type_error: `${fieldName} debe ser un número`,
    })
    .min(min, `${fieldName} debe ser mayor o igual a ${min}`)
    .refine(
      (val) => {
        const decimalPlaces = (val.toString().split('.')[1] || '').length;
        return decimalPlaces <= decimals;
      },
      `${fieldName} no puede tener más de ${decimals} decimales`
    );
  
  if (max !== undefined) {
    schema = schema.max(max, `${fieldName} debe ser menor o igual a ${max}`);
  }
  
  return schema;
};

/**
 * Validador de fecha
 */
export const dateSchema = (fieldName = 'La fecha') =>
  z
    .date({
      required_error: `${fieldName} es requerida`,
      invalid_type_error: `${fieldName} debe ser una fecha válida`,
    });

/**
 * Validador de boolean
 */
export const booleanSchema = z.boolean();

// ============================================================================
// SCHEMAS DE FORMULARIOS - SECURITY
// ============================================================================

/**
 * Schema: Crear/Editar Usuario
 */
export const userFormSchema = z.object({
  username: usernameSchema,
  display_name: requiredTextSchema(2, 100, 'El nombre completo'),
  email: emailSchema,
  password: z.union([
    passwordSchema,
    z.literal(''), // Permitir vacío en edición (no cambiar password)
  ]).optional(),
  is_active: booleanSchema,
});

export type UserFormData = z.infer<typeof userFormSchema>;

/**
 * Schema: Crear/Editar Rol
 */
export const roleFormSchema = z.object({
  role_key: keySchema,
  role_name: requiredTextSchema(3, 100, 'El nombre del rol'),
  role_scope: z.enum(['SYSTEM', 'TENANT', 'SCOPE'], {
    errorMap: () => ({ message: 'Debe seleccionar un alcance válido' }),
  }),
  data_scope: z.enum(['ALL', 'DIRECT_REPORTS', 'SELF'], {
    errorMap: () => ({ message: 'Debe seleccionar un alcance de datos válido' }),
  }),
  is_active: booleanSchema,
});

export type RoleFormData = z.infer<typeof roleFormSchema>;

/**
 * Schema: Crear/Editar Tenant
 */
export const tenantFormSchema = z.object({
  tenant_key: keySchema,
  tenant_name: requiredTextSchema(3, 100, 'El nombre del tenant'),
  is_active: booleanSchema,
});

export type TenantFormData = z.infer<typeof tenantFormSchema>;

/**
 * Schema: Crear/Editar Grupo de Menú
 */
export const menuGroupFormSchema = z.object({
  menu_group_key: keySchema,
  menu_group_name: requiredTextSchema(2, 50, 'El nombre del grupo'),
  menu_group_short_name: requiredTextSchema(2, 20, 'El nombre corto'),
  icon_key: requiredTextSchema(2, 50, 'El ícono'),
  sort_order: positiveIntSchema(1, 9999, 'El orden'),
  is_active: booleanSchema,
});

export type MenuGroupFormData = z.infer<typeof menuGroupFormSchema>;

/**
 * Schema: Crear/Editar Pantalla
 */
export const screenFormSchema = z.object({
  screen_key: keySchema,
  screen_name: requiredTextSchema(3, 100, 'El nombre de la pantalla'),
  menu_label: requiredTextSchema(2, 50, 'La etiqueta del menú'),
  route_path: z
    .string()
    .min(1, 'La ruta es requerida')
    .regex(/^\/[a-z0-9\/-]*$/, 'La ruta debe comenzar con / y usar solo minúsculas, números y guiones')
    .trim(),
  icon_key: requiredTextSchema(2, 50, 'El ícono'),
  sort_order: positiveIntSchema(1, 9999, 'El orden'),
  is_active: booleanSchema,
});

export type ScreenFormData = z.infer<typeof screenFormSchema>;

/**
 * Schema: Crear/Editar Acción
 */
export const actionFormSchema = z.object({
  action_key: keySchema,
  action_name: requiredTextSchema(2, 50, 'El nombre de la acción'),
  is_active: booleanSchema,
});

export type ActionFormData = z.infer<typeof actionFormSchema>;

/**
 * Schema: Crear/Editar Tipo de Alcance
 */
export const scopeTypeFormSchema = z.object({
  scope_type_key: keySchema,
  scope_type_name: requiredTextSchema(2, 50, 'El nombre del tipo de alcance'),
  is_active: booleanSchema,
});

export type ScopeTypeFormData = z.infer<typeof scopeTypeFormSchema>;

/**
 * Schema: Crear/Editar Idioma
 */
export const languageFormSchema = z.object({
  code: z
    .string()
    .length(2, 'El código debe tener exactamente 2 caracteres')
    .regex(/^[a-z]{2}$/, 'El código debe ser 2 letras minúsculas (ej: es, en)')
    .trim(),
  language_name: requiredTextSchema(2, 50, 'El nombre del idioma'),
  is_active: booleanSchema,
  is_default: booleanSchema,
});

export type LanguageFormData = z.infer<typeof languageFormSchema>;

/**
 * Schema: Crear/Editar Traducción de Grupo de Menú
 */
export const menuGroupTranslationFormSchema = z.object({
  language_code: z.string().min(2, 'El código de idioma es requerido'),
  menu_group_name: requiredTextSchema(2, 50, 'La traducción del nombre'),
});

export type MenuGroupTranslationFormData = z.infer<typeof menuGroupTranslationFormSchema>;

// ============================================================================
// SCHEMAS DE FORMULARIOS - MAINT (Mantenimiento)
// ============================================================================

/**
 * Schema: Crear/Editar Lookup Group (Catálogo)
 */
export const lookupGroupFormSchema = z.object({
  lookup_group_key: keySchema,
  lookup_group_label: requiredTextSchema(2, 100, 'La etiqueta del catálogo'),
  lookup_group_short_label: requiredTextSchema(2, 50, 'La etiqueta corta'),
  allows_tenant_items: booleanSchema,
  is_active: booleanSchema,
});

export type LookupGroupFormData = z.infer<typeof lookupGroupFormSchema>;

/**
 * Schema: Crear/Editar Lookup Value (Valor de Catálogo)
 */
export const lookupValueFormSchema = z.object({
  lookup_value_key: keySchema,
  lookup_value_label: requiredTextSchema(2, 100, 'La etiqueta del valor'),
  lookup_value_short_label: requiredTextSchema(2, 50, 'La etiqueta corta'),
  sort_order: positiveIntSchema(1, 9999, 'El orden'),
  is_active: booleanSchema,
  is_system: booleanSchema,
});

export type LookupValueFormData = z.infer<typeof lookupValueFormSchema>;

// ============================================================================
// SCHEMAS DE FORMULARIOS - CONFIG (Configuración)
// ============================================================================

/**
 * Schema: Crear/Editar Horario (Shift)
 */
export const shiftFormSchema = z.object({
  shift_code: keySchema,
  shift_name: requiredTextSchema(2, 100, 'El nombre del horario'),
  start_time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  end_time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  tolerance_minutes: positiveIntSchema(0, 120, 'La tolerancia'),
  is_active: booleanSchema,
});

export type ShiftFormData = z.infer<typeof shiftFormSchema>;

/**
 * Schema: Crear/Editar Dispositivo (Time Clock)
 */
export const deviceFormSchema = z.object({
  device_code: keySchema,
  device_name: requiredTextSchema(2, 100, 'El nombre del dispositivo'),
  device_type: requiredTextSchema(2, 50, 'El tipo de dispositivo'),
  ip_address: z
    .string()
    .regex(
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      'Dirección IP inválida'
    )
    .or(z.literal('')),
  is_active: booleanSchema,
});

export type DeviceFormData = z.infer<typeof deviceFormSchema>;

// ============================================================================
// SCHEMAS DE FORMULARIOS - ORG (Organización)
// ============================================================================

/**
 * Schema: Crear/Editar Empresa
 */
export const companyFormSchema = z.object({
  company_code: keySchema,
  company_name: requiredTextSchema(2, 100, 'El nombre de la empresa'),
  tax_id: z
    .string()
    .min(5, 'El RUC/NIT debe tener al menos 5 caracteres')
    .max(20, 'El RUC/NIT no puede exceder 20 caracteres')
    .trim(),
  is_active: booleanSchema,
});

export type CompanyFormData = z.infer<typeof companyFormSchema>;

/**
 * Schema: Crear/Editar Departamento
 */
export const departmentFormSchema = z.object({
  department_code: keySchema,
  department_name: requiredTextSchema(2, 100, 'El nombre del departamento'),
  is_active: booleanSchema,
});

export type DepartmentFormData = z.infer<typeof departmentFormSchema>;

// ============================================================================
// SCHEMAS DE FORMULARIOS - EMPLOYEE (Empleados)
// ============================================================================

/**
 * Schema: Crear/Editar Empleado
 */
export const employeeFormSchema = z.object({
  employee_number: z
    .string()
    .min(1, 'El número de empleado es requerido')
    .max(20, 'El número de empleado no puede exceder 20 caracteres')
    .regex(/^[A-Z0-9-]+$/, 'Solo se permiten letras mayúsculas, números y guiones')
    .trim(),
  first_name: requiredTextSchema(2, 50, 'El nombre'),
  last_name: requiredTextSchema(2, 50, 'El apellido'),
  email: emailSchema.optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^[+]?[0-9\s()-]{7,20}$/, 'Formato de teléfono inválido')
    .optional()
    .or(z.literal('')),
  hire_date: dateSchema('La fecha de contratación'),
  is_active: booleanSchema,
});

export type EmployeeFormData = z.infer<typeof employeeFormSchema>;

// ============================================================================
// EXPORT ALL
// ============================================================================

export const schemas = {
  // Security
  user: userFormSchema,
  role: roleFormSchema,
  tenant: tenantFormSchema,
  menuGroup: menuGroupFormSchema,
  screen: screenFormSchema,
  action: actionFormSchema,
  scopeType: scopeTypeFormSchema,
  language: languageFormSchema,
  menuGroupTranslation: menuGroupTranslationFormSchema,
  
  // Maintenance
  lookupGroup: lookupGroupFormSchema,
  lookupValue: lookupValueFormSchema,
  
  // Config
  shift: shiftFormSchema,
  device: deviceFormSchema,
  
  // Org
  company: companyFormSchema,
  department: departmentFormSchema,
  
  // Employee
  employee: employeeFormSchema,
};
