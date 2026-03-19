/**
 * SystemAdministration.tsx - Turnos Titanium Enterprise
 * Panel Unificado de Administración de Tablas SYSTEM
 * 
 * MÓDULOS:
 * - Idiomas del Sistema
 * - Grupos de Menú y Traducciones
 * - Pantallas y Traducciones
 * - Acciones y Traducciones
 * - Tipos de Alcance
 * - Grupos de Catálogos y Traducciones
 * - Valores del Sistema y Traducciones
 * 
 * Solo accesible para Super Admin (is_super_admin = true)
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Settings, Globe, LayoutGrid, Monitor, Zap, Target, List, Database, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import SystemLanguagesAdmin from './SystemLanguagesAdmin';
import SystemMenuGroupsAdmin from './SystemMenuGroupsAdmin';
import SystemScreensAdmin from './SystemScreensAdmin';
import SystemActionsAdmin from './SystemActionsAdmin';
import SystemScopeTypesAdmin from './SystemScopeTypesAdmin';
import SystemLookupGroupsAdmin from './SystemLookupGroupsAdmin';
import SystemLookupValuesAdmin from './SystemLookupValuesAdmin';

export default function SystemAdministration() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('languages');

  // ✅ Verificar si el usuario es Super Admin
  const isSuperAdmin = profile?.is_super_admin === true;
  
  console.log('[SYSTEM-ADMIN] Validación Super Admin:', {
    is_super_admin: profile?.is_super_admin,
    isSuperAdmin,
    profile
  });

  // ✅ Control de acceso
  if (!isSuperAdmin) {
    return (
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center">
        <Card className="border-red-200 bg-red-50 max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="size-5" />
              Acceso Restringido
            </CardTitle>
            <CardDescription className="text-red-600">
              Solo los Super Administradores (GOD) pueden acceder a la administración de tablas SYSTEM.
              <br /><br />
              Si necesitas acceso, contacta al administrador del sistema.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <Card className="border-[#0074D9]/20 bg-gradient-to-r from-[#0074D9]/5 to-transparent">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#0074D9] rounded-xl">
              <Settings className="size-8 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl text-[#0074D9]">
                Administración del Sistema
              </CardTitle>
              <CardDescription className="mt-2 text-base">
                Panel de configuración avanzada de tablas SYSTEM. Gestiona idiomas, menús, pantallas, acciones y módulos del sistema.
              </CardDescription>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg">
                  <div className="size-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">Super Admin</span>
                </div>
                <div className="text-gray-500">
                  Tenant ID: <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{profile?.tenant_id}</code>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs de Administración */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-2 bg-gray-100 p-1 h-auto">
              <TabsTrigger 
                value="languages" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#0074D9]"
              >
                <Globe className="size-4" />
                <span className="hidden sm:inline">Idiomas</span>
              </TabsTrigger>
              <TabsTrigger 
                value="menu-groups" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#0074D9]"
              >
                <LayoutGrid className="size-4" />
                <span className="hidden sm:inline">Grupos de Menú</span>
              </TabsTrigger>
              <TabsTrigger 
                value="screens" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#0074D9]"
              >
                <Monitor className="size-4" />
                <span className="hidden sm:inline">Pantallas</span>
              </TabsTrigger>
              <TabsTrigger 
                value="actions" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#0074D9]"
              >
                <Zap className="size-4" />
                <span className="hidden sm:inline">Acciones</span>
              </TabsTrigger>
              <TabsTrigger 
                value="modules" 
                disabled
                className="flex items-center gap-2 opacity-50"
              >
                <Target className="size-4" />
                <span className="hidden sm:inline">Módulos</span>
              </TabsTrigger>
              <TabsTrigger 
                value="scope-types" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#0074D9]"
              >
                <List className="size-4" />
                <span className="hidden sm:inline">Tipos de Alcance</span>
              </TabsTrigger>
              <TabsTrigger 
                value="lookup-groups" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#0074D9]"
              >
                <Database className="size-4" />
                <span className="hidden sm:inline">Grupos de Catálogos</span>
              </TabsTrigger>
              <TabsTrigger 
                value="lookup-values" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#0074D9]"
              >
                <Database className="size-4" />
                <span className="hidden sm:inline">Valores del Sistema</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab: Idiomas */}
            <TabsContent value="languages" className="mt-6">
              <SystemLanguagesAdmin />
            </TabsContent>

            {/* Tab: Grupos de Menú */}
            <TabsContent value="menu-groups" className="mt-6">
              <SystemMenuGroupsAdmin />
            </TabsContent>

            {/* Tab: Pantallas */}
            <TabsContent value="screens" className="mt-6">
              <SystemScreensAdmin />
            </TabsContent>

            {/* Tab: Acciones */}
            <TabsContent value="actions" className="mt-6">
              <SystemActionsAdmin />
            </TabsContent>

            {/* Tab: Módulos (Próximamente) */}
            <TabsContent value="modules" className="mt-6">
              <Card className="border-gray-200 bg-gray-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-600">
                    <Target className="size-5" />
                    Administración de Módulos
                  </CardTitle>
                  <CardDescription>
                    Módulo en construcción. Permitirá gestionar los módulos del sistema (system_modules) y sus traducciones.
                  </CardDescription>
                </CardHeader>
              </Card>
            </TabsContent>

            {/* Tab: Tipos de Alcance */}
            <TabsContent value="scope-types" className="mt-6">
              <SystemScopeTypesAdmin />
            </TabsContent>

            {/* Tab: Grupos de Catálogos */}
            <TabsContent value="lookup-groups" className="mt-6">
              <SystemLookupGroupsAdmin />
            </TabsContent>

            {/* Tab: Valores del Sistema */}
            <TabsContent value="lookup-values" className="mt-6">
              <SystemLookupValuesAdmin />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Info Footer */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">⚠️ Atención: Cambios Críticos</p>
              <p className="text-blue-800">
                Las tablas SYSTEM son la base arquitectónica de la aplicación. Cualquier modificación incorrecta puede afectar el funcionamiento del sistema completo. 
                <strong> Procede con precaución</strong> y realiza respaldos antes de realizar cambios importantes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}