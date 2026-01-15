/* ================================================================================================
 Turnos Titanium — FIX para DDL v2
 Fecha: 2025-01-03
 Problema: Constraint UNIQUE con COALESCE no es válida en PostgreSQL
 Solución: Reemplazar con índice único con expresión
================================================================================================ */

-- Este script NO hace nada, solo documenta el fix que debes aplicar manualmente
-- al DDL v2 ANTES de ejecutarlo.

-- BUSCAR en tu DDL v2 (línea 433 aprox):
-- constraint uq_time_clock_devices unique (tenant_id, company_id, coalesce(device_serial_number,''))

-- REEMPLAZAR con:
-- constraint uq_time_clock_devices_base unique (tenant_id, company_id, device_serial_number)

-- Y DESPUÉS de la creación de la tabla time_clock_devices, AGREGAR:
-- create unique index if not exists uq_time_clock_devices_serial
--   on public.time_clock_devices (tenant_id, company_id, coalesce(device_serial_number, ''));

-- NOTA: Esto permite device_serial_number NULL pero garantiza que combinaciones
-- de (tenant_id, company_id, serial) sean únicas, tratando NULL como ''.

/* ================================================================================================
   INSTRUCCIONES:
   
   1. ABRE tu archivo DDL v2 en un editor de texto
   
   2. BUSCA la tabla time_clock_devices (línea 433 aprox)
   
   3. CAMBIA esta línea:
      constraint uq_time_clock_devices unique (tenant_id, company_id, coalesce(device_serial_number,''))
   
   4. POR esta línea:
      -- Unicidad base sin el serial (permite múltiples NULL si es necesario)
   
   5. DESPUÉS del cierre de la tabla (después del );), AGREGA:
      
      -- Índice único que maneja NULL en device_serial_number
      create unique index if not exists uq_time_clock_devices_serial
        on public.time_clock_devices (tenant_id, company_id, coalesce(device_serial_number, ''))
        where device_serial_number is not null;
      
      -- O si quieres que NULL también sea único:
      create unique index if not exists uq_time_clock_devices_serial
        on public.time_clock_devices (tenant_id, company_id, 
          coalesce(device_serial_number, '00000000-0000-0000-0000-000000000000'::text));
   
   6. GUARDA el archivo
   
   7. EJECUTA el DDL corregido en Supabase
================================================================================================ */
