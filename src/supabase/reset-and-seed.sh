#!/bin/bash

# ============================================================================
# reset-and-seed.sh - Script de Reset Completo + Seed
# Turnos Titanium Enterprise
# ============================================================================
# Descripción:
#   1. Ejecuta 001_FACTORY_RESET.sql (limpia toda la base de datos)
#   2. Ejecuta 002_SEED_COMPLETE.sql (inserta datos base + usuario bootstrap)
#
# Uso:
#   bash supabase/reset-and-seed.sh
#
# Prerrequisitos:
#   - Supabase CLI instalado
#   - Proyecto linkeado (supabase link)
#   - Credenciales configuradas
# ============================================================================

set -e  # Salir si hay errores

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}🔄 FACTORY RESET + SEED COMPLETO${NC}"
echo -e "${BLUE}   Turnos Titanium Enterprise${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# ============================================================================
# PASO 1: Verificar archivos de migración
# ============================================================================

echo -e "${YELLOW}📂 Verificando archivos de migración...${NC}"

if [ ! -f "supabase/migrations/001_FACTORY_RESET.sql" ]; then
    echo -e "${RED}❌ ERROR: No se encontró 001_FACTORY_RESET.sql${NC}"
    exit 1
fi

if [ ! -f "supabase/migrations/002_SEED_COMPLETE.sql" ]; then
    echo -e "${RED}❌ ERROR: No se encontró 002_SEED_COMPLETE.sql${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Archivos de migración encontrados${NC}"
echo ""

# ============================================================================
# PASO 2: Confirmar acción (es destructivo)
# ============================================================================

echo -e "${YELLOW}⚠️  ADVERTENCIA: Este proceso es DESTRUCTIVO${NC}"
echo -e "${YELLOW}   - Se eliminarán TODOS los datos existentes${NC}"
echo -e "${YELLOW}   - Se ejecutará el FACTORY RESET completo${NC}"
echo -e "${YELLOW}   - Se insertarán los datos base del sistema${NC}"
echo ""
read -p "¿Deseas continuar? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}❌ Operación cancelada por el usuario${NC}"
    exit 0
fi

# ============================================================================
# PASO 3: Ejecutar FACTORY RESET
# ============================================================================

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}🗑️  PASO 1/2: Ejecutando FACTORY RESET...${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

supabase db reset --db-url "$(supabase status --output json | jq -r '.DB_URL')" \
    --migration supabase/migrations/001_FACTORY_RESET.sql || {
    echo -e "${RED}❌ Error ejecutando FACTORY RESET${NC}"
    echo -e "${YELLOW}ℹ️  Intentando método alternativo con psql...${NC}"
    
    # Método alternativo usando psql directamente
    DB_URL=$(supabase status --output json | jq -r '.DB_URL')
    psql "$DB_URL" -f supabase/migrations/001_FACTORY_RESET.sql
}

echo ""
echo -e "${GREEN}✅ FACTORY RESET ejecutado exitosamente${NC}"

# ============================================================================
# PASO 4: Ejecutar SEED COMPLETO
# ============================================================================

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}🌱 PASO 2/2: Ejecutando SEED COMPLETO...${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

supabase db reset --db-url "$(supabase status --output json | jq -r '.DB_URL')" \
    --migration supabase/migrations/002_SEED_COMPLETE.sql || {
    echo -e "${RED}❌ Error ejecutando SEED${NC}"
    echo -e "${YELLOW}ℹ️  Intentando método alternativo con psql...${NC}"
    
    # Método alternativo usando psql directamente
    DB_URL=$(supabase status --output json | jq -r '.DB_URL')
    psql "$DB_URL" -f supabase/migrations/002_SEED_COMPLETE.sql
}

echo ""
echo -e "${GREEN}✅ SEED COMPLETO ejecutado exitosamente${NC}"

# ============================================================================
# PASO 5: Verificación
# ============================================================================

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}🔍 VERIFICACIÓN FINAL${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

DB_URL=$(supabase status --output json | jq -r '.DB_URL')

# Query de verificación
VERIFICATION_QUERY="
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
"

echo -e "${YELLOW}Conteo de registros:${NC}"
psql "$DB_URL" -c "$VERIFICATION_QUERY" -t || {
    echo -e "${YELLOW}⚠️  No se pudo ejecutar verificación automática${NC}"
}

# ============================================================================
# FINALIZACIÓN
# ============================================================================

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${GREEN}✅ PROCESO COMPLETADO EXITOSAMENTE${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "${GREEN}🔐 CREDENCIALES DE ACCESO INICIAL:${NC}"
echo -e "   ${YELLOW}Email:${NC}    system.admin@titanium-labs.com"
echo -e "   ${YELLOW}Password:${NC} Titanium2026!"
echo ""
echo -e "${YELLOW}📝 Próximos pasos:${NC}"
echo -e "   1. Login con las credenciales iniciales"
echo -e "   2. Cambiar la contraseña (obligatorio)"
echo -e "   3. Completar wizard de configuración inicial"
echo ""
echo -e "${BLUE}============================================================${NC}"
echo ""
