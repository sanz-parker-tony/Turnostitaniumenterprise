'use client';

import { buildApiUrl } from '../../../utils/api-config';
import { useEffect, useMemo, useState } from 'react';
import { Globe, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { ApiClient } from '../../../lib/api-client';
import SystemAdminPageHeader from '../../shared/SystemAdminPageHeader';

type Tenant = {
  id: string;
  tenant_key: string;
  tenant_name: string;
};

type SystemLanguage = {
  code: string;
  language_name: string;
  is_active: boolean;
  is_default: boolean;
};

type TenantLanguage = {
  id: string;
  language_code: string;
  is_default: boolean;
};

function getAccessToken(): string | null {
  return localStorage.getItem('tt-access-token');
}

export function SecurityLanguagesManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [systemLanguages, setSystemLanguages] = useState<SystemLanguage[]>([]);

  const [enabledLanguages, setEnabledLanguages] = useState<string[]>([]);
  const [defaultLanguage, setDefaultLanguage] = useState('');

  const activeSystemLanguages = useMemo(
    () => systemLanguages.filter((lang) => lang.is_active),
    [systemLanguages]
  );

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: tenantData, error: tenantError } = await ApiClient
        .from('tenants')
        .select('id, tenant_key, tenant_name')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (tenantError || !tenantData?.id) {
        throw new Error('No se pudo cargar el tenant principal');
      }

      const tenantRow = tenantData as Tenant;
      setTenant(tenantRow);

      const { data: languagesData, error: languagesError } = await ApiClient
        .from('system_languages')
        .select('code, language_name, is_active, is_default')
        .order('is_default', { ascending: false })
        .order('language_name', { ascending: true });

      if (languagesError) {
        throw new Error(languagesError.message || 'No se pudieron cargar los idiomas del sistema');
      }

      const systemRows = (languagesData || []) as SystemLanguage[];
      setSystemLanguages(systemRows);

      await loadTenantLanguages(tenantRow.id, systemRows);
    } catch (error: any) {
      console.error('Error cargando gestion de idiomas:', error);
      toast.error(error?.message || 'Error al cargar idiomas');
    } finally {
      setLoading(false);
    }
  };

  const loadTenantLanguages = async (tenantId: string, systemRows: SystemLanguage[]) => {
    const token = getAccessToken();
    if (!token) {
      throw new Error('Sesion expirada. Inicia sesion nuevamente.');
    }

    const response = await fetch(buildApiUrl(`/tenants/${tenantId}/languages`), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || 'No se pudo cargar la configuracion de idiomas del tenant');
    }

    const payload = await response.json();
    const tenantLanguages = (payload.languages || []) as TenantLanguage[];

    if (tenantLanguages.length > 0) {
      const enabled = tenantLanguages.map((row) => row.language_code);
      const selectedDefault = tenantLanguages.find((row) => row.is_default)?.language_code || enabled[0] || '';
      setEnabledLanguages(enabled);
      setDefaultLanguage(selectedDefault);
      return;
    }

    // Sin configuracion previa: usar defaults del sistema
    const fallbackDefault =
      systemRows.find((lang) => lang.is_default && lang.is_active)?.code ||
      systemRows.find((lang) => lang.code.toLowerCase() === 'es' && lang.is_active)?.code ||
      systemRows.find((lang) => lang.is_active)?.code ||
      '';

    const fallbackEnabled = fallbackDefault ? [fallbackDefault] : [];
    setEnabledLanguages(fallbackEnabled);
    setDefaultLanguage(fallbackDefault);
  };

  const toggleEnabled = (languageCode: string, checked: boolean) => {
    if (checked) {
      const next = Array.from(new Set([...enabledLanguages, languageCode]));
      setEnabledLanguages(next);
      if (!defaultLanguage) {
        setDefaultLanguage(languageCode);
      }
      return;
    }

    const next = enabledLanguages.filter((code) => code !== languageCode);
    if (next.length === 0) {
      toast.error('Debe quedar al menos un idioma habilitado');
      return;
    }

    setEnabledLanguages(next);
    if (defaultLanguage === languageCode) {
      setDefaultLanguage(next[0]);
    }
  };

  const setAsDefault = (languageCode: string, checked: boolean) => {
    if (!checked) {
      return;
    }

    if (!enabledLanguages.includes(languageCode)) {
      setEnabledLanguages((prev) => Array.from(new Set([...prev, languageCode])));
    }

    setDefaultLanguage(languageCode);
  };

  const handleSave = async () => {
    if (!tenant?.id) {
      toast.error('Tenant no disponible');
      return;
    }

    if (enabledLanguages.length === 0) {
      toast.error('Debe quedar al menos un idioma habilitado');
      return;
    }

    let safeDefault = defaultLanguage;
    if (!safeDefault || !enabledLanguages.includes(safeDefault)) {
      safeDefault = enabledLanguages[0];
    }

    const payloadLanguages = enabledLanguages.map((code) => ({
      language_code: code,
      is_default: code === safeDefault,
    }));

    try {
      setSaving(true);
      const token = getAccessToken();
      if (!token) {
        throw new Error('Sesion expirada. Inicia sesion nuevamente.');
      }

      const response = await fetch(buildApiUrl(`/tenants/${tenant.id}/languages`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ languages: payloadLanguages }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo guardar la configuracion de idiomas');
      }

      setDefaultLanguage(safeDefault);
      toast.success('Configuracion de idiomas guardada');
    } catch (error: any) {
      console.error('Error guardando idiomas:', error);
      toast.error(error?.message || 'Error guardando configuracion de idiomas');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <div className="text-center">
          <div className="inline-block size-8 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm text-muted-foreground">Cargando idiomas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full space-y-6">
      <SystemAdminPageHeader
        icon={Globe}
        title="Gestion de Idiomas"
        subtitle="Selecciona los idiomas disponibles para el tenant y define el idioma por defecto"
        rightSlot={(
          <Button onClick={handleSave} disabled={saving || !tenant} className="bg-[#0074D9] hover:bg-[#0056A3]">
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        )}
      />

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Info className="size-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium">Reglas importantes</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Solo un idioma puede ser el predeterminado.</li>
                <li>El idioma por defecto debe estar habilitado.</li>
                <li>Debe quedar al menos un idioma habilitado.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-5" />
            Configuracion de Lenguajes
          </CardTitle>
          <CardDescription>
            Tenant: {tenant?.tenant_name || 'N/A'} ({tenant?.tenant_key || 'N/A'})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeSystemLanguages.length === 0 ? (
            <div className="text-sm text-muted-foreground">No hay idiomas activos en el sistema.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Codigo</th>
                    <th className="text-left p-3 text-sm font-medium">Lenguaje</th>
                    <th className="text-center p-3 text-sm font-medium">Habilitado</th>
                    <th className="text-center p-3 text-sm font-medium">Por Defecto</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSystemLanguages.map((language) => {
                    const isEnabled = enabledLanguages.includes(language.code);
                    const isDefault = defaultLanguage === language.code;

                    return (
                      <tr key={language.code} className="border-b hover:bg-muted/20">
                        <td className="p-3 text-sm font-mono">{language.code}</td>
                        <td className="p-3 text-sm">{language.language_name}</td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={isEnabled}
                              onCheckedChange={(checked) => toggleEnabled(language.code, Boolean(checked))}
                            />
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={isDefault}
                              onCheckedChange={(checked) => setAsDefault(language.code, Boolean(checked))}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SecurityLanguagesManagement;
