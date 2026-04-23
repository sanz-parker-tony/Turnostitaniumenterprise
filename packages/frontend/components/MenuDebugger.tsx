/**
 * MenuDebugger - Herramienta de debugging para verificar menú dinámico
 * Solo visible en desarrollo o para SYSTEM_ADMIN
 * Reorganizado por menu_group_id y ordenado por roles
 */

'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Bug, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

// Orden de roles
const ROLE_ORDER = [
  'SYSTEM_ADMIN',
  'TENANT_ADMIN',
  'RRHH_ADMIN',
  'SUPERVISOR',
  'EMPLOYEE'
];

export function MenuDebugger() {
  const { profile } = useAuth();
  const { menuScreens, isLoading } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);

  // Solo mostrar para SYSTEM_ADMIN o en desarrollo
  const shouldShow = profile?.role_key === 'SYSTEM_ADMIN' || process.env.NODE_ENV === 'development';

  if (!shouldShow) return null;

  // Agrupar pantallas por menu_group_id Y role_key
  const screensByRoleAndGroup = menuScreens.reduce((acc: any, screen) => {
    const roleKey = screen.role_key;
    const groupKey = screen.menu_group_key;
    
    if (!acc[roleKey]) {
      acc[roleKey] = {
        role_name: screen.role_name,
        groups: {}
      };
    }
    
    if (!acc[roleKey].groups[groupKey]) {
      acc[roleKey].groups[groupKey] = {
        name: screen.menu_group_name,
        icon: screen.menu_group_icon,
        sort_order: screen.menu_group_sort_order || 999,
        screens: []
      };
    }
    
    acc[roleKey].groups[groupKey].screens.push(screen);
    return acc;
  }, {});

  // Ordenar roles según ROLE_ORDER
  const sortedRoles = Object.keys(screensByRoleAndGroup).sort((a, b) => {
    const indexA = ROLE_ORDER.indexOf(a);
    const indexB = ROLE_ORDER.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  // Obtener estadísticas
  const totalScreens = menuScreens.length;
  const totalGroups = [...new Set(menuScreens.map(s => s.menu_group_key))].length;
  const totalRoles = sortedRoles.length;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-2xl">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shadow-lg bg-white border-2 border-purple-500"
          >
            <Bug className="h-4 w-4 text-purple-600" />
            Menu Debug ({totalScreens} pantallas)
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2">
          <Card className="shadow-xl border-2 border-purple-200 max-h-[600px] overflow-y-auto">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bug className="h-4 w-4 text-purple-600" />
                Menú Dinámico - Debug
              </CardTitle>
              <CardDescription className="text-xs">
                Agrupado por menu_group_id, ordenado por roles
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4 text-xs">
              {/* Info del Usuario Actual */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="font-semibold mb-2 text-blue-900">👤 Usuario Actual</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-blue-600 font-medium">Email:</span>
                    <p className="text-blue-900">{profile?.email}</p>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Rol:</span>
                    <p className="text-blue-900">{profile?.role_name}</p>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Role Key:</span>
                    <p className="text-blue-900 font-mono">{profile?.role_key}</p>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Tenant:</span>
                    <p className="text-blue-900">{profile?.tenant_name}</p>
                  </div>
                </div>
              </div>

              {/* Estadísticas Rápidas */}
              <div className="flex gap-2">
                <Badge variant="default" className="flex-1 justify-center py-2">
                  {totalRoles} Roles
                </Badge>
                <Badge variant="secondary" className="flex-1 justify-center py-2">
                  {totalGroups} Grupos
                </Badge>
                <Badge variant="outline" className="flex-1 justify-center py-2">
                  {totalScreens} Pantallas
                </Badge>
              </div>

              {/* Estado de Carga */}
              {isLoading && (
                <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                  <p className="text-yellow-800 text-xs">⏳ Cargando menú...</p>
                </div>
              )}

              {/* Pantallas por Rol y Grupo */}
              <div>
                <p className="font-semibold mb-3 text-sm">📋 Estructura del Menú</p>
                <div className="space-y-4">
                  {sortedRoles.map((roleKey) => {
                    const roleData = screensByRoleAndGroup[roleKey];
                    const groups = roleData.groups;
                    
                    // Ordenar grupos por sort_order
                    const sortedGroups = Object.entries(groups).sort(
                      ([, a]: [string, any], [, b]: [string, any]) => a.sort_order - b.sort_order
                    );

                    return (
                      <div key={roleKey} className="border rounded-lg p-3 bg-gradient-to-r from-gray-50 to-white">
                        {/* Header del Rol */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={roleKey === profile?.role_key ? 'default' : 'secondary'}
                              className="font-mono text-xs"
                            >
                              {roleKey}
                            </Badge>
                            {roleKey === profile?.role_key && (
                              <span className="text-xs text-green-600 font-medium">← Tu rol actual</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {sortedGroups.length} grupos
                          </span>
                        </div>

                        {/* Grupos del Rol */}
                        <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                          {sortedGroups.map(([groupKey, groupData]: [string, any]) => (
                            <div key={groupKey} className="bg-white p-2 rounded border">
                              {/* Header del Grupo */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{groupData.icon}</span>
                                  <div>
                                    <p className="font-semibold text-xs">{groupData.name}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{groupKey}</p>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {groupData.screens.length} pantallas
                                </Badge>
                              </div>

                              {/* Pantallas del Grupo */}
                              <div className="pl-4 space-y-1">
                                {groupData.screens
                                  .sort((a: any, b: any) => (a.sort_order || 999) - (b.sort_order || 999))
                                  .map((screen: any) => (
                                    <div 
                                      key={screen.screen_key} 
                                      className="flex items-center justify-between text-xs py-1 hover:bg-gray-50 px-2 rounded"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-base">{screen.screen_icon}</span>
                                        <span className="font-medium">{screen.screen_name}</span>
                                      </div>
                                      <span className="text-xs text-gray-400 font-mono">{screen.route_path}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Raw Data */}
              <details className="text-xs">
                <summary className="font-semibold cursor-pointer hover:text-purple-600">
                  🔍 Ver datos raw (JSON)
                </summary>
                <pre className="bg-gray-900 text-gray-100 p-2 rounded mt-2 overflow-auto max-h-60 text-[10px] leading-tight">
                  {JSON.stringify(menuScreens, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
