'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AlertTriangle, CheckCircle, XCircle, Database, RefreshCw } from 'lucide-react';
import { ApiClient } from '../../lib/api-client';

interface TableCheck {
  name: string;
  exists: boolean;
  error?: string;
}

export function MigrationDiagnostic() {
  const [checks, setChecks] = useState<TableCheck[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const runDiagnostic = async () => {
    setIsChecking(true);
    const results: TableCheck[] = [];

    // Lista de tablas críticas que deben existir después de la migración 003
    const criticalTables = [
      'system_settings',
      'employee_settings',
      'tenant_settings',
      'company_settings',
      'employee_profile_settings',
      'lookup_groups',
      'lookup_values',
      'tenants',
      'tenant_members'
    ];

    for (const tableName of criticalTables) {
      try {
        const { data, error } = await ApiClient
          .from(tableName)
          .select('*')
          .limit(1);

        results.push({
          name: tableName,
          exists: !error,
          error: error?.message
        });
      } catch (err: any) {
        results.push({
          name: tableName,
          exists: false,
          error: err.message
        });
      }
    }

    setChecks(results);
    setIsChecking(false);
  };

  const allTablesExist = checks.length > 0 && checks.every(c => c.exists);
  const criticalMissing = checks.filter(c => !c.exists && 
    (c.name === 'system_settings' || c.name === 'employee_settings')
  );

  return (
    <Card className={criticalMissing.length > 0 ? 'border-red-300 bg-red-50' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="size-5" />
          Diagnóstico de Migraciones
        </CardTitle>
        <CardDescription>
          Verificación del estado de las tablas requeridas en la base de datos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostic}
          disabled={isChecking}
          className="w-full"
        >
          {isChecking ? (
            <>
              <RefreshCw className="size-4 mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <Database className="size-4 mr-2" />
              Ejecutar Diagnóstico
            </>
          )}
        </Button>

        {checks.length > 0 && (
          <div className="space-y-2">
            {/* Resumen */}
            <div className={`p-4 rounded-lg border ${
              allTablesExist 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {allTablesExist ? (
                  <CheckCircle className="size-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${allTablesExist ? 'text-green-900' : 'text-red-900'}`}>
                    {allTablesExist 
                      ? '✅ Todas las tablas existen correctamente'
                      : `⚠️ Faltan ${checks.filter(c => !c.exists).length} tabla(s)`
                    }
                  </p>
                  {!allTablesExist && criticalMissing.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm text-red-800 font-medium">
                        🔥 Tablas críticas faltantes:
                      </p>
                      <ul className="text-sm text-red-700 space-y-1">
                        {criticalMissing.map(check => (
                          <li key={check.name} className="font-mono">
                            • {check.name}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 p-3 bg-white rounded border border-red-300">
                        <p className="text-sm font-medium text-red-900 mb-2">
                          📋 Acción Requerida - DEBES EJECUTAR LA MIGRACIÓN:
                        </p>
                        <ol className="text-xs text-red-800 space-y-2 list-decimal list-inside">
                          <li>Ve a tu <strong>ApiClient Dashboard</strong></li>
                          <li>Navega a <strong>SQL Editor</strong> → <strong>New Query</strong></li>
                          <li>Copia <strong>TODO</strong> el contenido del archivo:<br/>
                            <code className="bg-red-100 px-1.5 py-0.5 rounded block mt-1 text-xs">
                            ../api-client/migrations/003_SETTINGS_REFACTOR.sql
                            </code>
                          </li>
                          <li>Pégalo en el editor SQL de ApiClient</li>
                          <li>Haz clic en <strong>"Run"</strong></li>
                          <li>Espera el mensaje: <code className="bg-green-100 text-green-800 px-1 py-0.5 rounded">Success. No rows returned</code></li>
                          <li>Vuelve aquí y haz clic en <strong>"Ejecutar Diagnóstico"</strong> de nuevo</li>
                        </ol>
                        <p className="text-xs text-red-800 mt-3 font-medium">
                          ⚠️ Hasta que no ejecutes la migración, la aplicación NO funcionará correctamente.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detalles de cada tabla */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground mb-2">Detalles por tabla:</p>
              {checks.map((check) => (
                <div 
                  key={check.name}
                  className={`flex items-center justify-between p-2 rounded text-sm ${
                    check.exists 
                      ? 'bg-green-50 text-green-900' 
                      : 'bg-red-50 text-red-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {check.exists ? (
                      <CheckCircle className="size-4 text-green-600" />
                    ) : (
                      <XCircle className="size-4 text-red-600" />
                    )}
                    <code className="font-mono text-xs">{check.name}</code>
                  </div>
                  <span className="text-xs">
                    {check.exists ? 'Existe' : 'No encontrada'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {checks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="size-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm">Haz clic en el botón para verificar el estado de las tablas</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}