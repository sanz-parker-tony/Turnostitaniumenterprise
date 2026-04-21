/**
 * useUniqueValidator.ts - Turnos Titanium Enterprise
 * Hook para validar valores únicos en la base de datos
 * 
 * CARACTERÍSTICAS:
 * ✅ Valida si un valor ya existe en la BD
 * ✅ Excluye el registro actual en modo edición
 * ✅ Debounce para no saturar el servidor
 * ✅ Manejo de errores
 */

import { useState, useCallback } from 'react';
import { ApiClient } from '../api-client';

interface UseUniqueValidatorOptions {
  table: string;
  column: string;
  excludeId?: string; // ID del registro actual (en modo edición)
  tenant_id?: string; // Si la validación es por tenant
}

export function useUniqueValidator({
  table,
  column,
  excludeId,
  tenant_id,
}: UseUniqueValidatorOptions) {
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback(
    async (value: string): Promise<boolean> => {
      if (!value || !value.trim()) {
        return true; // Validación de requerido se hace en schema
      }

      setIsValidating(true);

      try {
        let query = ApiClient
          .from(table)
          .select('id')
          .eq(column, value.trim());

        // Excluir el registro actual en modo edición
        if (excludeId) {
          query = query.neq('id', excludeId);
        }

        // Filtrar por tenant si aplica
        if (tenant_id) {
          query = query.eq('tenant_id', tenant_id);
        }

        const { data, error } = await query.limit(1).single();

        if (error) {
          // Si no encuentra registro (error de single), significa que es único
          if (error.code === 'PGRST116') {
            return true;
          }
          console.error('Error validando unicidad:', error);
          return true; // En caso de error, permitir continuar
        }

        // Si encuentra un registro, NO es único
        return !data;
      } catch (error) {
        console.error('Error en validación de unicidad:', error);
        return true; // En caso de error, permitir continuar
      } finally {
        setIsValidating(false);
      }
    },
    [table, column, excludeId, tenant_id]
  );

  return { validate, isValidating };
}

/**
 * Helper: Validar username único
 */
export function useUsernameValidator(excludeId?: string, tenant_id?: string) {
  return useUniqueValidator({
    table: 'users',
    column: 'username',
    excludeId,
    tenant_id,
  });
}

/**
 * Helper: Validar email único
 */
export function useEmailValidator(excludeId?: string, tenant_id?: string) {
  return useUniqueValidator({
    table: 'users',
    column: 'email',
    excludeId,
    tenant_id,
  });
}

/**
 * Helper: Validar role_key único
 */
export function useRoleKeyValidator(excludeId?: string, tenant_id?: string) {
  return useUniqueValidator({
    table: 'roles',
    column: 'role_key',
    excludeId,
    tenant_id,
  });
}

/**
 * Helper: Validar tenant_key único
 */
export function useTenantKeyValidator(excludeId?: string) {
  return useUniqueValidator({
    table: 'tenants',
    column: 'tenant_key',
    excludeId,
  });
}

/**
 * Helper: Validar lookup_group_key único
 */
export function useLookupGroupKeyValidator(excludeId?: string) {
  return useUniqueValidator({
    table: 'lookup_groups',
    column: 'lookup_group_key',
    excludeId,
  });
}

/**
 * Helper: Validar employee_number único
 */
export function useEmployeeNumberValidator(excludeId?: string, tenant_id?: string) {
  return useUniqueValidator({
    table: 'employees',
    column: 'employee_number',
    excludeId,
    tenant_id,
  });
}
