# ============================================================================
# deploy.ps1 - Script de Despliegue Automático del Edge Function (Windows)
# Turnos Titanium Enterprise
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=============================================="
Write-Host "  Turnos Titanium Enterprise"
Write-Host "  Despliegue del Edge Function"
Write-Host "=============================================="
Write-Host ""

# Variables
$PROJECT_REF = "qvjyqjypuyjaremqjtra"
$FUNCTION_NAME = "make-server-e19f2094"
$FUNCTION_URL = "https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME"

# ============================================================================
# 1. Verificar que Supabase CLI está instalado
# ============================================================================

Write-Host "Verificando Supabase CLI..." -ForegroundColor Blue

try {
    $version = supabase --version
    Write-Host "Supabase CLI instalado: $version" -ForegroundColor Green
} catch {
    Write-Host "Supabase CLI no está instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para instalar en Windows:"
    Write-Host "  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git"
    Write-Host "  scoop install supabase"
    Write-Host ""
    Write-Host "Más info: https://supabase.com/docs/guides/cli/getting-started"
    exit 1
}

Write-Host ""

# ============================================================================
# 2. Verificar que estamos en el directorio correcto
# ============================================================================

Write-Host "Verificando estructura del proyecto..." -ForegroundColor Blue

if (-Not (Test-Path "supabase\functions\server")) {
    Write-Host "No se encontró el directorio supabase\functions\server" -ForegroundColor Red
    Write-Host "Asegúrate de ejecutar este script desde la raíz del proyecto"
    exit 1
}

Write-Host "Estructura del proyecto correcta" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 3. Vincular con el proyecto (si no está vinculado)
# ============================================================================

Write-Host "Verificando vinculación con Supabase..." -ForegroundColor Blue

if (-Not (Test-Path ".supabase\config.toml")) {
    Write-Host "Proyecto no vinculado. Vinculando..." -ForegroundColor Yellow
    Write-Host ""
    supabase link --project-ref $PROJECT_REF
    Write-Host ""
}

Write-Host "Proyecto vinculado" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 4. Verificar variables de entorno
# ============================================================================

Write-Host "Verificando variables de entorno..." -ForegroundColor Blue
Write-Host ""
Write-Host "IMPORTANTE: Asegúrate de que estas variables estén configuradas en Supabase Dashboard:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Ve a: Settings -> Edge Functions"
Write-Host "  2. Configura:"
Write-Host "     - SUPABASE_URL"
Write-Host "     - SUPABASE_SERVICE_ROLE_KEY"
Write-Host "     - SUPABASE_ANON_KEY"
Write-Host ""

$response = Read-Host "Las variables de entorno están configuradas? (y/n)"

if ($response -ne "y" -and $response -ne "Y") {
    Write-Host "Configuración cancelada" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ve a: https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"
    Write-Host "Configura las variables y vuelve a ejecutar este script"
    exit 0
}

Write-Host ""

# ============================================================================
# 5. Desplegar el Edge Function
# ============================================================================

Write-Host "Desplegando Edge Function..." -ForegroundColor Blue
Write-Host ""

# Crear el directorio de funciones si no existe
New-Item -ItemType Directory -Force -Path "supabase\functions\$FUNCTION_NAME" | Out-Null

# Copiar archivos del servidor al directorio de funciones
Copy-Item -Path "supabase\functions\server\*" -Destination "supabase\functions\$FUNCTION_NAME\" -Recurse -Force

# Renombrar index.tsx a index.ts (Supabase espera .ts)
if (Test-Path "supabase\functions\$FUNCTION_NAME\index.tsx") {
    Move-Item -Path "supabase\functions\$FUNCTION_NAME\index.tsx" -Destination "supabase\functions\$FUNCTION_NAME\index.ts" -Force
}

# Desplegar
supabase functions deploy $FUNCTION_NAME --no-verify-jwt

Write-Host ""
Write-Host "Edge Function desplegado exitosamente" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 6. Verificar el despliegue
# ============================================================================

Write-Host "Verificando despliegue..." -ForegroundColor Blue
Write-Host ""

# Test 1: Health check
Write-Host "Test 1: Health check..."
try {
    $healthResponse = Invoke-RestMethod -Uri "$FUNCTION_URL/health" -Method Get
    
    if ($healthResponse.status -eq "ok") {
        Write-Host "Health check: OK" -ForegroundColor Green
        Write-Host "   Response: $($healthResponse | ConvertTo-Json -Compress)"
    } else {
        Write-Host "Health check: FAILED" -ForegroundColor Red
        Write-Host "   Response: $($healthResponse | ConvertTo-Json -Compress)"
    }
} catch {
    Write-Host "Health check: ERROR" -ForegroundColor Red
    Write-Host "   Error: $_"
}

Write-Host ""

# ============================================================================
# 7. Instrucciones finales
# ============================================================================

Write-Host "=============================================="
Write-Host "  Despliegue completado exitosamente"
Write-Host "=============================================="
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Blue
Write-Host ""
Write-Host "  1. Abre la aplicación en el navegador"
Write-Host "  2. Haz login con: system.admin@titanium-labs.com / Titanium2026!"
Write-Host "  3. Cambia la contraseña en el primer login"
Write-Host "  4. Completa el wizard de configuración"
Write-Host ""
Write-Host "URLs importantes:" -ForegroundColor Blue
Write-Host ""
Write-Host "  Dashboard: https://supabase.com/dashboard/project/$PROJECT_REF"
Write-Host "  Logs:      https://supabase.com/dashboard/project/$PROJECT_REF/logs/edge-functions"
Write-Host "  Health:    $FUNCTION_URL/health"
Write-Host ""
Write-Host "Para ver los logs en tiempo real:" -ForegroundColor Blue
Write-Host ""
Write-Host "  supabase functions logs $FUNCTION_NAME --follow"
Write-Host ""
Write-Host "Listo!" -ForegroundColor Green
Write-Host ""
