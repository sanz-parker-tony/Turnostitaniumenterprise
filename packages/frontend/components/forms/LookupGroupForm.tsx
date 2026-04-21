/**
 * LookupGroupForm.tsx - Turnos Titanium Enterprise
 * Formulario de Crear/Editar Lookup Group con validación completa
 * 
 * EJEMPLO DE REFERENCIA para todos los formularios del sistema
 * 
 * CARACTERÍSTICAS:
 * ✅ react-hook-form@7.55.0 + zod
 * ✅ Validación al submit, luego en tiempo real (mode: onChange después de submit)
 * ✅ Validación de valores únicos (lookup_group_key)
 * ✅ Mensajes de error claros por campo
 * ✅ Borde rojo + icono de alerta
 * ✅ Bloqueo de submit si hay errores
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form@7.55.0';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { FormInput, FormCheckbox } from './index';
import { Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClient } from '../../lib/api-client';

// ============================================================================
// SCHEMA DE VALIDACIÓN
// ============================================================================

const lookupGroupFormSchema = z.object({
  lookup_group_key: z
    .string()
    .min(2, 'El código debe tener al menos 2 caracteres')
    .max(50, 'El código no puede exceder 50 caracteres')
    .regex(/^[A-Z0-9_]+$/, 'Solo se permiten letras mayúsculas, números y guiones bajos')
    .trim(),
  lookup_group_label: z
    .string()
    .min(2, 'La etiqueta debe tener al menos 2 caracteres')
    .max(100, 'La etiqueta no puede exceder 100 caracteres')
    .trim(),
  lookup_group_short_label: z
    .string()
    .min(2, 'La etiqueta corta debe tener al menos 2 caracteres')
    .max(50, 'La etiqueta corta no puede exceder 50 caracteres')
    .trim(),
  allows_tenant_items: z.boolean(),
  is_active: z.boolean(),
});

type LookupGroupFormData = z.infer<typeof lookupGroupFormSchema>;

// ============================================================================
// INTERFACES
// ============================================================================

interface LookupGroupFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editItem?: {
    id: string;
    lookup_group_key: string;
    lookup_group_label: string;
    lookup_group_short_label: string;
    allows_tenant_items: boolean;
    is_active: boolean;
  } | null;
}

// ============================================================================
// COMPONENTE
// ============================================================================

export function LookupGroupForm({
  open,
  onClose,
  onSuccess,
  editItem = null,
}: LookupGroupFormProps) {
  const isEditing = !!editItem;

  // ✅ Configurar react-hook-form con validación Zod
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<LookupGroupFormData>({
    resolver: zodResolver(lookupGroupFormSchema),
    // ✅ Validar al submit primero, luego en tiempo real
    mode: isSubmitted ? 'onChange' : 'onSubmit',
    defaultValues: {
      lookup_group_key: editItem?.lookup_group_key || '',
      lookup_group_label: editItem?.lookup_group_label || '',
      lookup_group_short_label: editItem?.lookup_group_short_label || '',
      allows_tenant_items: editItem?.allows_tenant_items || false,
      is_active: editItem?.is_active ?? true,
    },
  });

  // ✅ Resetear formulario cuando se abre/cierra o cambia el item
  useEffect(() => {
    if (open) {
      reset({
        lookup_group_key: editItem?.lookup_group_key || '',
        lookup_group_label: editItem?.lookup_group_label || '',
        lookup_group_short_label: editItem?.lookup_group_short_label || '',
        allows_tenant_items: editItem?.allows_tenant_items || false,
        is_active: editItem?.is_active ?? true,
      });
    }
  }, [open, editItem, reset]);

  // ============================================================================
  // VALIDACIÓN ASÍNCRONA: Verificar si lookup_group_key ya existe
  // ============================================================================

  const validateUniqueKey = async (key: string): Promise<boolean> => {
    if (!key || !key.trim()) return true;

    try {
      let query = ApiClient
        .from('lookup_groups')
        .select('id')
        .eq('lookup_group_key', key.trim());

      // En modo edición, excluir el registro actual
      if (isEditing && editItem?.id) {
        query = query.neq('id', editItem.id);
      }

      const { data, error } = await query.limit(1).single();

      // Si no encuentra registro (error PGRST116), es único
      if (error?.code === 'PGRST116') {
        return true;
      }

      // Si encuentra un registro, NO es único
      return !data;
    } catch (error) {
      console.error('Error validando unicidad de lookup_group_key:', error);
      return true; // En caso de error, permitir continuar
    }
  };

  // ============================================================================
  // SUBMIT DEL FORMULARIO
  // ============================================================================

  const onSubmit = async (data: LookupGroupFormData) => {
    try {
      console.log('📝 Datos del formulario:', data);

      // ✅ PASO 1: Validar unicidad del lookup_group_key
      const isUnique = await validateUniqueKey(data.lookup_group_key);
      if (!isUnique) {
        setError('lookup_group_key', {
          type: 'manual',
          message: 'Este código ya está en uso. Por favor elige otro.',
        });
        toast.error('El código del catálogo ya existe');
        return;
      }

      // ✅ PASO 2: Preparar datos para guardar
      const dataToSave = {
        lookup_group_key: data.lookup_group_key.trim().toUpperCase(),
        lookup_group_label: data.lookup_group_label.trim(),
        lookup_group_short_label: data.lookup_group_short_label.trim(),
        allows_tenant_items: data.allows_tenant_items,
        is_active: data.is_active,
        updated_at: new Date().toISOString(),
        updated_by: 'CURRENT_USER', // TODO: Obtener usuario actual
      };

      // ✅ PASO 3: Insertar o actualizar en la BD
      if (isEditing && editItem?.id) {
        // ACTUALIZAR
        const { error } = await ApiClient
          .from('lookup_groups')
          .update(dataToSave)
          .eq('id', editItem.id);

        if (error) throw error;

        console.log('✅ Lookup Group actualizado exitosamente');
        toast.success('Catálogo actualizado correctamente');
      } else {
        // CREAR
        const { error } = await ApiClient
          .from('lookup_groups')
          .insert({
            ...dataToSave,
            created_at: new Date().toISOString(),
            created_by: 'CURRENT_USER', // TODO: Obtener usuario actual
          });

        if (error) throw error;

        console.log('✅ Lookup Group creado exitosamente');
        toast.success('Catálogo creado correctamente');
      }

      // ✅ PASO 4: Cerrar modal y refrescar datos
      reset();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('❌ Error guardando lookup group:', error);
      toast.error(
        error.message || 'Error al guardar el catálogo. Inténtalo de nuevo.'
      );
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className=\"max-w-2xl\">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Catálogo' : 'Nuevo Catálogo'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos del catálogo. Los campos marcados con * son obligatorios.'
              : 'Completa los datos del nuevo catálogo. Los campos marcados con * son obligatorios.'}
          </DialogDescription>
        </DialogHeader>

        {/* ✅ FORMULARIO CON VALIDACIÓN */}
        <form onSubmit={handleSubmit(onSubmit)} className=\"space-y-6 py-4\">
          {/* Código del Catálogo */}
          <FormInput
            name=\"lookup_group_key\"
            label=\"Código del Catálogo\"
            register={register}
            error={errors.lookup_group_key}
            required
            placeholder=\"GENDER, CONTRACT_TYPE, etc.\"
            helperText=\"Código único en mayúsculas (ej: GENDER, SHIFT_TYPE)\"
            disabled={isEditing} // No permitir cambiar el key en modo edición
          />

          {/* Etiqueta del Catálogo */}
          <FormInput
            name=\"lookup_group_label\"
            label=\"Etiqueta del Catálogo\"
            register={register}
            error={errors.lookup_group_label}
            required
            placeholder=\"Géneros\"
            helperText=\"Nombre descriptivo del catálogo\"
          />

          {/* Etiqueta Corta */}
          <FormInput
            name=\"lookup_group_short_label\"
            label=\"Etiqueta Corta\"
            register={register}
            error={errors.lookup_group_short_label}
            required
            placeholder=\"Género\"
            helperText=\"Versión abreviada para espacios reducidos\"
          />

          {/* Permite Valores por Tenant */}
          <FormCheckbox
            name=\"allows_tenant_items\"
            label=\"Permitir que los tenants agreguen valores personalizados\"
            register={register}
            error={errors.allows_tenant_items}
            helperText=\"Si está activado, cada tenant puede agregar sus propios valores al catálogo\"
          />

          {/* Estado Activo */}
          <FormCheckbox
            name=\"is_active\"
            label=\"Catálogo activo\"
            register={register}
            error={errors.is_active}
            helperText=\"Si está desactivado, el catálogo no será visible en el sistema\"
          />

          {/* Botones */}
          <DialogFooter className=\"gap-2\">
            <Button
              type=\"button\"
              variant=\"outline\"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <X className=\"size-4 mr-2\" />
              Cancelar
            </Button>
            <Button
              type=\"submit\"
              disabled={isSubmitting}
              className=\"bg-[#0074D9] hover:bg-[#0062b8]\"
            >
              {isSubmitting ? (
                <>
                  <div className=\"size-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2\" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className=\"size-4 mr-2\" />
                  {isEditing ? 'Actualizar' : 'Crear'} Catálogo
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}