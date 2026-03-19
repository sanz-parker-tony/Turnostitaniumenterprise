# ============================================================================
# reset-and-seed.ps1 - Script de Reset Completo + Seed (Windows)
# Turnos Titanium Enterprise
# ============================================================================
# Descripción:
#   1. Ejecuta 001_FACTORY_RESET.sql (limpia toda la base de datos)
#   2. Ejecuta 002_SEED_COMPLETE.sql (inserta datos base + usuario bootstrap)
#
# Uso:
#   .\supabase\reset-and-seed.ps1
#
# Prerrequisitos:
#   - Supabase CLI instalado
#   - Proyecto linkeado (supabase link)
#   - Credenciales configuradas
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Blue
Write-Host "🔄 FACTORY RESET + SEED COMPLETO" -ForegroundColor Blue
Write-Host "   Turnos Titanium Enterprise" -ForegroundColor Blue
Write-Host "============================================================" -ForegroundColor Blue
Write-Host ""

# ============================================================================
# PASO 1: Verificar archivos de migración
# ============================================================================

Write-Host "📂 Verificando archivos de migración..." -ForegroundColor Yellow

if (-not (Test-Path "supabase/migrations/001_FACTORY_RESET.sql")) {
    Write-Host "❌ ERROR: No se encontró 001_FACTORY_RESET.sql" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "supabase/migrations/002_SEED_COMPLETE.sql")) {
    Write-Host "❌ ERROR: No se encontró 002_SEED_COMPLETE.sql" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Archivos de migración encontrados" -ForegroundColor Green
Write-Host ""

# ============================================================================
# PASO 2: Confirmar acción (es destructivo)
# ============================================================================

Write-Host "⚠️  ADVERTENCIA: Este proceso es DESTRUCTIVO" -ForegroundColor Yellow
Write-Host "   - Se eliminarán TODOS los datos existentes" -ForegroundColor Yellow
Write-Host "   - Se ejecutará el FACTORY RESET completo" -ForegroundColor Yellow
Write-Host "   - Se insertarán los datos base del sistema" -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "¿Deseas continuar? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "❌ Operación cancelada por el usuario" -ForegroundColor Yellow
    exit 0
}

# ============================================================================
# PASO 3: Obtener URL de la base de datos
# ============================================================================

Write-Host ""
Write-Host "🔗 Obteniendo URL de la base de datos..." -ForegroundColor Yellow

try {
    $statusJson = supabase status --output json | ConvertFrom-Json
    $dbUrl = $statusJson.DB_URL
    Write-Host "✅ Conexión a base de datos configurada" -ForegroundColor Green
} catch {
    Write-Host "❌ Error obteniendo URL de la base de datos" -ForegroundColor Red
    Write-Host "   Asegúrate de que el proyecto esté linkeado con 'supabase link'" -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# PASO 4: Ejecutar FACTORY RESET
# ============================================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Blue
Write-Host "🗑️  PASO 1/2: Ejecutando FACTORY RESET..." -ForegroundColor Blue
Write-Host "============================================================" -ForegroundColor Blue
Write-Host ""

try {
    # Leer el contenido del archivo SQL
    $resetSql = Get-Content "supabase/migrations/001_FACTORY_RESET.sql" -Raw
    
    # Ejecutar usando psql
    $env:PGPASSWORD = $dbUrl.Split('@')[0].Split(':')[-1]
    $resetSql | psql $dbUrl
    
    Write-Host ""
    Write-Host "✅ FACTORY RESET ejecutado exitosamente" -ForegroundColor Green
} catch {
    Write-Host "❌ Error ejecutando FACTORY RESET" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# ============================================================================
# PASO 5: Ejecutar SEED COMPLETO
# ============================================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Blue
Write-Host "🌱 PASO 2/2: Ejecutando SEED COMPLETO..." -ForegroundColor Blue
Write-Host "============================================================" -ForegroundColor Blue
Write-Host ""

try {
    # Leer el contenido del archivo SQL
    $seedSql = Get-Content "supabase/migrations/002_SEED_COMPLETE.sql" -Raw
    
    # Ejecutar usando psql
    $seedSql | psql $dbUrl
    
    Write-Host ""
    Write-Host "✅ SEED COMPLETO ejecutado exitosamente" -ForegroundColor Green
} catch {
    Write-Host "❌ Error ejecutando SEED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# ============================================================================
# PASO 6: Crear usuario system.admin vía Admin API
# ============================================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Blue
Write-Host "👤 PASO 3/3: Creando usuario system.admin..." -ForegroundColor Blue
Write-Host "============================================================" -ForegroundColor Blue
Write-Host ""

try {
    # Llamar al endpoint de creación de usuario
    $createUserUrl = "https://qvjyqjypuyjaremqjtra.supabase.co/functions/v1/make-server-e19f2094/auth/create-system-admin"
    
    Write-Host "🔧 Creando usuario system.admin vía Admin API..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri $createUserUrl -Method POST -ContentType "application/json"
    
    if ($response.success) {
        Write-Host ""
        Write-Host "✅ Usuario system.admin creado exitosamente" -ForegroundColor Green
        Write-Host "   Email:    $($response.credentials.email)" -ForegroundColor White
        Write-Host "   Password: $($response.credentials.password)" -ForegroundColor White
    } else {
        Write-Host "⚠️  El usuario ya existía o hubo un error menor" -ForegroundColor Yellow
        Write-Host "   Detalles: $($response.message)" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  No se pudo crear el usuario vía API" -ForegroundColor Yellow
    Write-Host "   Esto puede ser normal si el usuario ya existe" -ForegroundColor Gray
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}

# ============================================================================
# PASO 7: Verificación
# ============================================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Blue
Write-Host "🔍 VERIFICACIÓN FINAL" -ForegroundColor Blue
Write-Host "============================================================" -ForegroundColor Blue
Write-Host ""

$verificationQuery = @"
SELECT 
  'Tenants' AS tabla, COUNT(*)::text AS cantidad FROM public.tenants
UNION ALL
SELECT 'Roles Base', COUNT(*)::text FROM public.roles WHERE is_system_role = true
UNION ALL
SELECT 'Usuarios Bootstrap', COUNT(*)::text FROM public.users
UNION ALL
SELECT 'Menu Groups', COUNT(*)::text FROM public.system_menu_groups
UNION ALL
SELECT 'Pantallas', COUNT(*)::text FROM public.screens
UNION ALL
SELECT 'Acciones', COUNT(*)::text FROM public.actions
UNION ALL
SELECT 'Screen Actions', COUNT(*)::text FROM public.screen_actions
UNION ALL
SELECT 'Role Permissions', COUNT(*)::text FROM public.role_screen_actions;
"@

try {
    Write-Host "Conteo de registros:" -ForegroundColor Yellow
    $verificationQuery | psql $dbUrl -t
} catch {
    Write-Host "⚠️  No se pudo ejecutar verificación automática" -ForegroundColor Yellow
}

# ============================================================================
# FINALIZACIÓN
# ============================================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Blue
Write-Host "✅ PROCESO COMPLETADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Blue
Write-Host ""
Write-Host "📝 Próximos pasos:" -ForegroundColor Yellow
Write-Host "   1. Login con las credenciales iniciales"
Write-Host "   2. Cambiar la contraseña (obligatorio)"
Write-Host "   3. Completar wizard de configuración inicial"
Write-Host ""
Write-Host "============================================================" -ForegroundColor Blue
Write-Host ""