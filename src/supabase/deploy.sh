#!/bin/bash

# ============================================================================
# deploy.sh - Script de Despliegue Automático del Edge Function
# Turnos Titanium Enterprise
# ============================================================================

set -e  # Salir si hay errores

echo "🚀 =============================================="
echo "🚀  Turnos Titanium Enterprise"
echo "🚀  Despliegue del Edge Function"
echo "🚀 =============================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
PROJECT_REF="qvjyqjypuyjaremqjtra"
FUNCTION_NAME="make-server-e19f2094"
FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/${FUNCTION_NAME}"

# ============================================================================
# 1. Verificar que Supabase CLI está instalado
# ============================================================================

echo -e "${BLUE}📋 Verificando Supabase CLI...${NC}"

if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI no está instalado${NC}"
    echo ""
    echo "Para instalar, ejecuta:"
    echo ""
    echo "  macOS/Linux:"
    echo "    brew install supabase/tap/supabase"
    echo ""
    echo "  Windows:"
    echo "    scoop bucket add supabase https://github.com/supabase/scoop-bucket.git"
    echo "    scoop install supabase"
    echo ""
    echo "Más info: https://supabase.com/docs/guides/cli/getting-started"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI instalado${NC}"
supabase --version
echo ""

# ============================================================================
# 2. Verificar que estamos en el directorio correcto
# ============================================================================

echo -e "${BLUE}📋 Verificando estructura del proyecto...${NC}"

if [ ! -d "supabase/functions/server" ]; then
    echo -e "${RED}❌ No se encontró el directorio supabase/functions/server${NC}"
    echo "Asegúrate de ejecutar este script desde la raíz del proyecto"
    exit 1
fi

echo -e "${GREEN}✅ Estructura del proyecto correcta${NC}"
echo ""

# ============================================================================
# 3. Vincular con el proyecto (si no está vinculado)
# ============================================================================

echo -e "${BLUE}📋 Verificando vinculación con Supabase...${NC}"

if [ ! -f ".supabase/config.toml" ]; then
    echo -e "${YELLOW}⚠️  Proyecto no vinculado. Vinculando...${NC}"
    echo ""
    supabase link --project-ref ${PROJECT_REF}
    echo ""
fi

echo -e "${GREEN}✅ Proyecto vinculado${NC}"
echo ""

# ============================================================================
# 4. Verificar variables de entorno
# ============================================================================

echo -e "${BLUE}📋 Verificando variables de entorno...${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Asegúrate de que estas variables estén configuradas en Supabase Dashboard:${NC}"
echo ""
echo "  1. Ve a: Settings → Edge Functions"
echo "  2. Configura:"
echo "     - SUPABASE_URL"
echo "     - SUPABASE_SERVICE_ROLE_KEY"
echo "     - SUPABASE_ANON_KEY"
echo ""

read -p "¿Las variables de entorno están configuradas? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Configuración cancelada${NC}"
    echo ""
    echo "Ve a: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/functions"
    echo "Configura las variables y vuelve a ejecutar este script"
    exit 0
fi

echo ""

# ============================================================================
# 5. Desplegar el Edge Function
# ============================================================================

echo -e "${BLUE}🚀 Desplegando Edge Function...${NC}"
echo ""

# Crear el directorio de funciones si no existe
mkdir -p supabase/functions/${FUNCTION_NAME}

# Copiar archivos del servidor al directorio de funciones
cp -r supabase/functions/server/* supabase/functions/${FUNCTION_NAME}/

# Renombrar index.tsx a index.ts (Supabase espera .ts)
if [ -f "supabase/functions/${FUNCTION_NAME}/index.tsx" ]; then
    mv supabase/functions/${FUNCTION_NAME}/index.tsx supabase/functions/${FUNCTION_NAME}/index.ts
fi

# Desplegar
supabase functions deploy ${FUNCTION_NAME} --no-verify-jwt

echo ""
echo -e "${GREEN}✅ Edge Function desplegado exitosamente${NC}"
echo ""

# ============================================================================
# 6. Verificar el despliegue
# ============================================================================

echo -e "${BLUE}🔍 Verificando despliegue...${NC}"
echo ""

# Test 1: Health check
echo "Test 1: Health check..."
HEALTH_RESPONSE=$(curl -s "${FUNCTION_URL}/health")

if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✅ Health check: OK${NC}"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}❌ Health check: FAILED${NC}"
    echo "   Response: $HEALTH_RESPONSE"
fi

echo ""

# ============================================================================
# 7. Instrucciones finales
# ============================================================================

echo -e "${GREEN}🎉 =============================================="
echo -e "🎉  Despliegue completado exitosamente"
echo -e "🎉 ==============================================${NC}"
echo ""
echo -e "${BLUE}📋 Próximos pasos:${NC}"
echo ""
echo "  1. Abre la aplicación en el navegador"
echo "  2. Haz login con: system.admin@titanium-labs.com / Titanium2026!"
echo "  3. Cambia la contraseña en el primer login"
echo "  4. Completa el wizard de configuración"
echo ""
echo -e "${BLUE}🔗 URLs importantes:${NC}"
echo ""
echo "  Dashboard: https://supabase.com/dashboard/project/${PROJECT_REF}"
echo "  Logs:      https://supabase.com/dashboard/project/${PROJECT_REF}/logs/edge-functions"
echo "  Health:    ${FUNCTION_URL}/health"
echo ""
echo -e "${BLUE}📝 Para ver los logs en tiempo real:${NC}"
echo ""
echo "  supabase functions logs ${FUNCTION_NAME} --follow"
echo ""
echo "¡Listo! 🚀"
echo ""
