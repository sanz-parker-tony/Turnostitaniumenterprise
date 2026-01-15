# 📋 Lookups GENDER y CONTRACT_TYPE - Instrucciones

## 🎯 Propósito

Este script agrega los valores faltantes en `lookup_values` para los grupos **GENDER** (Géneros) y **CONTRACT_TYPE** (Tipos de Contrato) que son requeridos para la carga de empleados.

---

## 📦 Valores Incluidos

### **GENDER (Géneros)**
| lookup_key | lookup_label | lookup_short_label |
|------------|--------------|-------------------|
| MASCULINO  | Masculino    | M                 |
| FEMENINO   | Femenino     | F                 |
| OTRO       | Otro         | X                 |

### **CONTRACT_TYPE (Tipos de Contrato)**
| lookup_key      | lookup_label                          | lookup_short_label |
|-----------------|--------------------------------------|-------------------|
| INDEFINIDO      | Contrato Indefinido                  | Indefinido        |
| PLAZO_FIJO      | Contrato a Plazo Fijo                | Plazo Fijo        |
| TEMPORAL        | Contrato Temporal                    | Temporal          |
| OBRA_SERVICIO   | Contrato por Obra o Servicio         | Obra/Servicio     |
| EVENTUAL        | Contrato Eventual                    | Eventual          |
| PRACTICAS       | Contrato de Prácticas                | Prácticas         |
| FORMACION       | Contrato de Formación                | Formación         |
| HONORARIOS      | Servicios Profesionales (Honorarios) | Honorarios        |

---

## 🚀 Cómo Ejecutar

### **Opción 1: Desde Supabase SQL Editor**
1. Abre tu proyecto en Supabase
2. Ve a **SQL Editor**
3. Copia y pega el contenido de `04_seed_lookup_gender_contract.sql`
4. Haz clic en **RUN** o presiona `Ctrl+Enter`

### **Opción 2: Desde línea de comandos**
```bash
psql -h your-db-host -U postgres -d postgres -f database/04_seed_lookup_gender_contract.sql
```

---

## ✅ Verificación

Después de ejecutar el script, deberías ver:

```
NOTICE:  ✅ Valores de GENDER insertados correctamente
NOTICE:  ✅ Valores de CONTRACT_TYPE insertados correctamente
NOTICE:  ========================================
NOTICE:  📊 RESUMEN DE LOOKUPS INSERTADOS
NOTICE:  ========================================
NOTICE:     GENDER: 3 valores
NOTICE:     CONTRACT_TYPE: 8 valores
NOTICE:  ========================================
```

---

## 🔍 Consultas de Verificación

### Ver todos los géneros
```sql
SELECT lv.lookup_key, lv.lookup_label, lv.lookup_short_label
FROM public.lookup_values lv
INNER JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
WHERE lg.lookup_group_key = 'GENDER'
ORDER BY lv.sort_order;
```

### Ver todos los tipos de contrato
```sql
SELECT lv.lookup_key, lv.lookup_label, lv.lookup_short_label
FROM public.lookup_values lv
INNER JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
WHERE lg.lookup_group_key = 'CONTRACT_TYPE'
ORDER BY lv.sort_order;
```

---

## 📝 Notas Importantes

1. **Idempotencia**: El script usa `ON CONFLICT ... DO NOTHING`, por lo que es seguro ejecutarlo múltiples veces
2. **Prerequisitos**: Debe haberse ejecutado primero `03_seed_data.sql` para que existan los lookup_groups
3. **Scope**: Todos los valores son de tipo `SYSTEM` (tenant_id = NULL)
4. **Validación en Excel**: Los códigos en la plantilla de empleados deben usar exactamente estos valores (ej: `MASCULINO`, no `Masculino`)

---

## 🔗 Uso en el Sistema

Estos valores se usan durante la **carga masiva de empleados** en el Wizard de Bootstrap:

- **Columna "Género"**: Debe contener uno de: `MASCULINO`, `FEMENINO`, `OTRO`
- **Columna "Tipo de Contrato"**: Debe contener uno de: `INDEFINIDO`, `PLAZO_FIJO`, `TEMPORAL`, `OBRA_SERVICIO`, `EVENTUAL`, `PRACTICAS`, `FORMACION`, `HONORARIOS`

Si se usa un valor no existente, el sistema retornará un error de validación.

---

## 🛠️ Personalización

Si necesitas agregar más valores (ej: género "NO_BINARIO" o tipo de contrato "FREELANCE"), puedes ejecutar:

```sql
DO $$
DECLARE
  v_gender_group_id uuid;
BEGIN
  SELECT id INTO v_gender_group_id FROM public.lookup_groups WHERE lookup_group_key = 'GENDER';
  
  INSERT INTO public.lookup_values (
    tenant_id, lookup_group_id, lookup_key, lookup_label, 
    lookup_short_label, lookup_scope, sort_order, is_active, created_by
  ) VALUES
  (null, v_gender_group_id, 'NO_BINARIO', 'No Binario', 'NB', 'SYSTEM', 4, true, 'SYSTEM')
  ON CONFLICT (lookup_group_id, tenant_id, lookup_key) DO NOTHING;
END $$;
```

---

## 🆘 Troubleshooting

### Error: "Lookup group GENDER no existe"
**Solución**: Ejecuta primero `03_seed_data.sql` para crear los lookup_groups.

### Error: "duplicate key value violates unique constraint"
**Explicación**: Los valores ya existen. Esto es normal y no es un error crítico.

### Los empleados no validan correctamente
**Verificación**: Asegúrate de usar los códigos en **MAYÚSCULAS** exactamente como aparecen en las tablas.
