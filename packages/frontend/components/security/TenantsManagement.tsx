/**
 * TenantsManagement.tsx
 * Gestión del Tenant Único con 4 tabs:
 * 1. Información General (editar nombre)
 * 2. Configuración (CRUD de tenant_settings)
 * 3. Miembros (read-only de tenant_members)
 * 4. Lenguajes (configuración de tenant_language_settings)
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { 
  Building, 
  AlertTriangle, 
  Settings, 
  Users, 
  Info,
  Edit2,
  Plus,
  Trash2,
  Save,
  X,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicApiToken } from '../../utils/backend/info';
import { ApiClient, getValidSession } from '../../lib/api-client';
import { useAuth } from '../../contexts/AuthContext';

interface Tenant {
  id: string;
  tenant_key: string;
  tenant_name: string;
  is_active: boolean;
  created_at: string;
}

interface DataType {
  id: string;
  lookup_key: string;
  lookup_label: string;
  lookup_short_label: string;
}

interface TenantSetting {
  id: string;
  tenant_id: string;
  setting_key: string;
  setting_short_key: string;
  value_type_id: string;
  setting_value: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
  value_type?: {
    id: string;
    lookup_key: string;
    lookup_label: string;
  };
}

interface TenantMember {
  id: string;
  tenant_id: string;
  auth_user_id: string;
  member_role: string;
  created_at: string;
  user?: {
    id: string;
    email: string;
  };
}

interface SystemLanguage {
  code: string;
  language_name: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

interface TenantLanguageSettings {
  id: string;
  tenant_id: string;
  default_language_code: string;
  enabled_languages: string;
  created_at: string;
  updated_at: string | null;
}

export default function TenantsManagement() {
  const { profile, session } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [settings, setSettings] = useState<TenantSetting[]>([]);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [dataTypes, setDataTypes] = useState<DataType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  
  // Estados para lenguajes (TAB 4)
  const [systemLanguages, setSystemLanguages] = useState<SystemLanguage[]>([]);
  const [tenantLanguageSettings, setTenantLanguageSettings] = useState<TenantLanguageSettings | null>(null);
  const [enabledLanguages, setEnabledLanguages] = useState<string[]>([]);
  const [defaultLanguage, setDefaultLanguage] = useState<string>('');
  const [isSavingLanguages, setIsSavingLanguages] = useState(false);
  
  // Estados para edición
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  
  // Estados para modal de settings
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<TenantSetting | null>(null);
  const [settingForm, setSettingForm] = useState({
    setting_key: '',
    setting_short_key: '',
    value_type_id: '',
    setting_value: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      // Primero cargar tenant y data types
      await Promise.all([
        loadTenant(),
        loadDataTypes(),
        loadSystemLanguages()
      ]);
      // Luego cargar settings y members (necesitan tenant.id)
      // Se cargarán automáticamente en useEffect cuando tenant cambie
    } catch (error: any) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar información del tenant');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTenant = async () => {
    try {
      console.log('🔍 Cargando tenant único...');

      const { data, error } = await ApiClient
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        console.error('❌ Error en query del tenant:', error);
        throw error;
      }
      
      console.log('✅ Tenant cargado:', data);
      setTenant(data);
      setEditedName(data.tenant_name);
    } catch (error: any) {
      console.error('❌ Error cargando tenant:', error);
      toast.error('Error cargando tenant: ' + error.message);
    }
  };

  const loadDataTypes = async () => {
    try {
      // ✅ Obtener sesión actualizada y refrescar el token si es necesario
      const { data: { session }, error: sessionError } = await ApiClient.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.error('❌ No hay sesión válida:', sessionError);
        toast.error('Sesión expirada. Por favor inicia sesión nuevamente.');
        setSessionError(true);
        return;
      }

      const token = session.access_token;

      const response = await fetch(
        `http://localhost:3001/lookup-values/data-types`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        console.error('❌ Error HTTP cargando tipos de datos:', response.status, errorData);
        throw new Error(`Error cargando tipos de datos: ${errorData.error || response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Data types cargados:', result);
      setDataTypes(result.dataTypes || []);
    } catch (error: any) {
      console.error('Error cargando tipos de datos:', error);
    }
  };

  const loadSettings = async () => {
    if (!tenant?.id) return;

    try {
      // ✅ Obtener sesión actualizada y refrescar el token si es necesario
      const { data: { session }, error: sessionError } = await ApiClient.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.error('❌ No hay sesión válida:', sessionError);
        toast.error('Sesión expirada. Por favor inicia sesión nuevamente.');
        setSessionError(true);
        return;
      }

      const token = session.access_token;

      const response = await fetch(
        `http://localhost:3001/tenants/${tenant.id}/settings`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        console.error('❌ Error HTTP cargando settings:', response.status, errorData);
        
        // Error específico de migración no ejecutada
        if (errorData.error?.includes('system_settings') && errorData.error?.includes('lookup_values')) {
          toast.error('⚠️ Error: Migración 003 no ejecutada. Ver componente de diagnóstico arriba.', { duration: 10000 });
        }
        
        throw new Error(`Error cargando configuraciones: ${errorData.error || response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Settings cargados:', result);
      setSettings(result.settings || []);
    } catch (error: any) {
      console.error('Error cargando settings:', error);
    }
  };

  const loadMembers = async () => {
    if (!tenant?.id) return;

    try {
      // ✅ Obtener sesión actualizada y refrescar el token si es necesario
      const { data: { session }, error: sessionError } = await ApiClient.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.error('❌ No hay sesión válida:', sessionError);
        toast.error('Sesión expirada. Por favor inicia sesión nuevamente.');
        setSessionError(true);
        return;
      }

      const token = session.access_token;

      const response = await fetch(
        `http://localhost:3001/tenants/${tenant.id}/members`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        console.error('❌ Error HTTP cargando members:', response.status, errorData);
        throw new Error(`Error cargando miembros: ${errorData.error || response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Members cargados:', result);
      setMembers(result.members || []);
    } catch (error: any) {
      console.error('Error cargando members:', error);
    }
  };

  const loadSystemLanguages = async () => {
    try {
      const { data, error } = await ApiClient
        .from('system_languages')
        .select('*')
        .order('is_default', { ascending: false });

      if (error) throw error;
      setSystemLanguages(data);
    } catch (error: any) {
      console.error('Error cargando lenguajes del sistema:', error);
    }
  };

  const loadTenantLanguageSettings = async () => {
    if (!tenant?.id) return;

    try {
      const { data, error } = await ApiClient
        .from('tenant_language_settings')
        .select('*')
        .eq('tenant_id', tenant.id)
        .maybeSingle(); // Cambio: usar maybeSingle() en vez de single()

      if (error && error.code !== 'PGRST116') {
        // Ignorar error PGRST116 (no rows found)
        throw error;
      }

      if (data) {
        setTenantLanguageSettings(data);
        setEnabledLanguages(data.enabled_languages.split(','));
        setDefaultLanguage(data.default_language_code);
      } else {
        // No hay configuración, usar valores por defecto
        console.log('ℹ️ No hay configuración de lenguajes, usando valores por defecto');
        setTenantLanguageSettings(null);
        setEnabledLanguages(['es', 'en']); // Por defecto
        setDefaultLanguage('es'); // Por defecto
      }
    } catch (error: any) {
      console.error('Error cargando configuración de lenguajes del tenant:', error);
      // Establecer valores por defecto en caso de error
      setEnabledLanguages(['es', 'en']);
      setDefaultLanguage('es');
    }
  };

  const handleUpdateTenantName = async () => {
    if (!tenant || !editedName.trim()) return;

    try {
      const session = await ApiClient.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(
        `http://localhost:3001/tenants/${tenant.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ tenant_name: editedName.trim() })
        }
      );

      if (!response.ok) throw new Error('Error actualizando nombre del tenant');
      
      const result = await response.json();
      setTenant(result.tenant);
      setIsEditingName(false);
      toast.success('Nombre actualizado exitosamente');
    } catch (error: any) {
      console.error('Error actualizando tenant:', error);
      toast.error('Error al actualizar el nombre');
    }
  };

  const openSettingModal = (setting?: TenantSetting) => {
    if (setting) {
      setEditingSetting(setting);
      setSettingForm({
        setting_key: setting.setting_key,
        setting_short_key: setting.setting_short_key,
        value_type_id: setting.value_type_id,
        setting_value: setting.setting_value || '',
        is_active: setting.is_active
      });
    } else {
      setEditingSetting(null);
      setSettingForm({
        setting_key: '',
        setting_short_key: '',
        value_type_id: '',
        setting_value: '',
        is_active: true
      });
    }
    setIsSettingModalOpen(true);
  };

  const handleSaveSetting = async () => {
    if (!tenant || !settingForm.setting_key || !settingForm.setting_short_key || !settingForm.value_type_id) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      const session = await ApiClient.auth.getSession();
      const token = session.data.session?.access_token;

      const url = editingSetting
        ? `http://localhost:3001/tenants/${tenant.id}/settings/${editingSetting.id}`
        : `http://localhost:3001/tenants/${tenant.id}/settings`;

      const body = editingSetting
        ? { ...settingForm, updated_by: profile?.email || 'system.admin' }
        : { ...settingForm, created_by: profile?.email || 'system.admin' };

      const response = await fetch(url, {
        method: editingSetting ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error('Error guardando configuración');
      
      toast.success(editingSetting ? 'Configuración actualizada' : 'Configuración creada');
      setIsSettingModalOpen(false);
      await loadSettings();
    } catch (error: any) {
      console.error('Error guardando setting:', error);
      toast.error('Error al guardar la configuración');
    }
  };

  const handleDeleteSetting = async (setting: TenantSetting) => {
    if (!tenant || !confirm('¿Estás seguro de eliminar esta configuración?')) return;

    try {
      const session = await ApiClient.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(
        `http://localhost:3001/tenants/${tenant.id}/settings/${setting.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error('Error eliminando configuración');
      
      toast.success('Configuración eliminada');
      await loadSettings();
    } catch (error: any) {
      console.error('Error eliminando setting:', error);
      toast.error('Error al eliminar la configuración');
    }
  };

  const handleSaveLanguages = async () => {
    if (!tenant || !defaultLanguage || enabledLanguages.length === 0) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    // Validar que el lenguaje por defecto esté en la lista de habilitados
    if (!enabledLanguages.includes(defaultLanguage)) {
      toast.error('El lenguaje por defecto debe estar habilitado');
      return;
    }

    setIsSavingLanguages(true);

    try {
      const session = await ApiClient.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(
        `http://localhost:3001/tenants/${tenant.id}/languages`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            default_language_code: defaultLanguage,
            enabled_languages: enabledLanguages
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error guardando configuración de lenguajes');
      }
      
      toast.success('Configuración de lenguajes guardada exitosamente');
      await loadTenantLanguageSettings();
    } catch (error: any) {
      console.error('Error guardando configuración de lenguajes:', error);
      toast.error(error.message || 'Error al guardar la configuración de lenguajes');
    } finally {
      setIsSavingLanguages(false);
    }
  };

  // Cargar settings y members cuando el tenant esté disponible
  useEffect(() => {
    if (tenant?.id) {
      loadSettings();
      loadMembers();
      loadTenantLanguageSettings();
    }
  }, [tenant?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="size-8 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="space-y-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex gap-3 mb-4">
              <AlertTriangle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Tenant no encontrado</p>
                <p className="text-sm text-red-700 mt-1">
                  No se encontró el registro del tenant único del sistema. Verifica la consola del navegador (F12) para más detalles.
                </p>
              </div>
            </div>
            <Button 
              onClick={loadData}
              variant="outline"
              className="w-full"
            >
              🔄 Reintentar Carga
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Diagnóstico</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <p>La aplicación espera encontrar <strong>un único tenant</strong> en la base de datos.</p>
            <p className="text-muted-foreground">
              Verifica en la consola del navegador el log que dice:<br/>
              <code className="bg-gray-100 px-1">📊 Tenants en la base de datos: [...]</code>
            </p>
            <p className="text-muted-foreground">
              Si no existe ningún tenant, ejecuta el SEED completo para crear el tenant principal.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta de Sesión Expirada */}
      {sessionError && !session && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertTriangle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 mb-2">
                  🔒 Sesión Expirada
                </p>
                <p className="text-sm text-red-800 mb-4">
                  Tu sesión ha expirado. Por favor, actualiza la página o vuelve a iniciar sesión para continuar.
                </p>
                <Button
                  onClick={() => window.location.reload()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  size="sm"
                >
                  🔄 Actualizar Página
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión del Tenant</h1>
        <p className="text-muted-foreground mt-1">
          Configuración del tenant único del sistema
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Info className="size-4" />
            Información
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="size-4" />
            Configuración
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="size-4" />
            Miembros
          </TabsTrigger>
          <TabsTrigger value="languages" className="flex items-center gap-2">
            <Globe className="size-4" />
            Lenguajes
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Información General */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="size-5" />
                Información del Tenant
              </CardTitle>
              <CardDescription>
                Datos básicos del tenant único del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Nombre editable */}
              <div className="space-y-2">
                <Label htmlFor="tenant-name">Nombre de la Empresa</Label>
                {isEditingName ? (
                  <div className="flex gap-2">
                    <Input
                      id="tenant-name"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      size="sm" 
                      onClick={handleUpdateTenantName}
                      className="bg-[#2ECC71] hover:bg-[#27AE60]"
                    >
                      <Save className="size-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setIsEditingName(false);
                        setEditedName(tenant.tenant_name);
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                    <span className="font-medium">{tenant.tenant_name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingName(true)}
                    >
                      <Edit2 className="size-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Detalles read-only */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <span className="text-sm text-muted-foreground">Código</span>
                  <p className="font-mono text-sm mt-1">{tenant.tenant_key}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Estado</span>
                  <div className="mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      tenant.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      <span className={`size-1.5 rounded-full ${tenant.is_active ? 'bg-green-600' : 'bg-gray-600'}`} />
                      {tenant.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-sm text-muted-foreground">Fecha de Creación</span>
                  <p className="text-sm mt-1">{new Date(tenant.created_at).toLocaleString('es-ES')}</p>
                </div>
              </div>

              {/* Alerta */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                  <div className="flex gap-2">
                    <Info className="size-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-900">
                      Este es el <strong>único tenant</strong> del sistema. No se pueden crear, eliminar o modificar tenants adicionales en la versión Enterprise On-Premise.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Configuración */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="size-5" />
                    Parámetros de Configuración
                  </CardTitle>
                  <CardDescription>
                    Gestiona los parámetros personalizados del tenant
                  </CardDescription>
                </div>
                <Button
                  onClick={() => openSettingModal()}
                  className="bg-[#0074D9] hover:bg-[#0056A3]"
                >
                  <Plus className="size-4 mr-2" />
                  Agregar Parámetro
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {settings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Settings className="size-12 mx-auto mb-4 opacity-20" />
                  <p>No hay parámetros configurados</p>
                  <p className="text-sm mt-1">Haz clic en "Agregar Parámetro" para comenzar</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Parámetro</th>
                        <th className="text-left p-3 text-sm font-medium">Código</th>
                        <th className="text-left p-3 text-sm font-medium">Tipo</th>
                        <th className="text-left p-3 text-sm font-medium">Valor</th>
                        <th className="text-center p-3 text-sm font-medium">Activo</th>
                        <th className="text-left p-3 text-sm font-medium">Creado</th>
                        <th className="text-right p-3 text-sm font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settings.map((setting) => (
                        <tr key={setting.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 text-sm">{setting.setting_key}</td>
                          <td className="p-3 text-sm font-mono">{setting.setting_short_key}</td>
                          <td className="p-3 text-sm">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                              {setting.value_type?.lookup_label || 'N/A'}
                            </span>
                          </td>
                          <td className="p-3 text-sm font-mono text-muted-foreground">
                            {setting.setting_value || '-'}
                          </td>
                          <td className="p-3 text-center">
                            {setting.is_active ? (
                              <span className="text-green-600">✓</span>
                            ) : (
                              <span className="text-red-600">✗</span>
                            )}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            <div>{setting.created_by}</div>
                            <div className="text-xs">{new Date(setting.created_at).toLocaleDateString('es-ES')}</div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openSettingModal(setting)}
                              >
                                <Edit2 className="size-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteSetting(setting)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Miembros */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" />
                Miembros del Tenant
              </CardTitle>
              <CardDescription>
                Vista de solo lectura de usuarios asociados al tenant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Card className="border-blue-200 bg-blue-50 mb-4">
                <CardContent className="pt-4">
                  <div className="flex gap-2">
                    <Info className="size-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-900">
                      Los miembros se agregan automáticamente al crear usuarios en el sistema. Esta vista es solo de consulta.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {members.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="size-12 mx-auto mb-4 opacity-20" />
                  <p>No hay miembros registrados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Usuario</th>
                        <th className="text-left p-3 text-sm font-medium">Rol</th>
                        <th className="text-left p-3 text-sm font-medium">Fecha de Ingreso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member) => (
                        <tr key={member.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 text-sm">{member.user?.email || 'N/A'}</td>
                          <td className="p-3 text-sm">
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                              {member.member_role}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {new Date(member.created_at).toLocaleString('es-ES')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: Lenguajes */}
        <TabsContent value="languages" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="size-5" />
                    Configuración de Lenguajes
                  </CardTitle>
                  <CardDescription>
                    Selecciona los lenguajes disponibles para el tenant
                  </CardDescription>
                </div>
                <Button
                  onClick={handleSaveLanguages}
                  className="bg-[#0074D9] hover:bg-[#0056A3]"
                  disabled={isSavingLanguages}
                >
                  <Save className="size-4 mr-2" />
                  Guardar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                  <div className="flex gap-2">
                    <Info className="size-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">Reglas importantes:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Solo un lenguaje puede ser el predeterminado</li>
                        <li>El lenguaje por defecto debe estar habilitado</li>
                        <li>Al menos un lenguaje debe estar habilitado</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {systemLanguages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Globe className="size-12 mx-auto mb-4 opacity-20" />
                  <p>No hay lenguajes configurados en el sistema</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Código</th>
                        <th className="text-left p-3 text-sm font-medium">Lenguaje</th>
                        <th className="text-center p-3 text-sm font-medium">Habilitado</th>
                        <th className="text-center p-3 text-sm font-medium">Por Defecto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {systemLanguages.map((language) => {
                        const isEnabled = enabledLanguages.includes(language.code);
                        const isDefault = defaultLanguage === language.code;

                        return (
                          <tr key={language.code} className="border-b hover:bg-muted/30">
                            <td className="p-3 text-sm font-mono">{language.code}</td>
                            <td className="p-3 text-sm font-medium">{language.language_name}</td>
                            <td className="p-3 text-center">
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={isEnabled}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setEnabledLanguages([...enabledLanguages, language.code]);
                                    } else {
                                      if (isDefault) {
                                        toast.error('No puedes deshabilitar el lenguaje por defecto');
                                        return;
                                      }
                                      setEnabledLanguages(enabledLanguages.filter(code => code !== language.code));
                                    }
                                  }}
                                />
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={isDefault}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setDefaultLanguage(language.code);
                                      // Auto-habilitar si se marca como default
                                      if (!isEnabled) {
                                        setEnabledLanguages([...enabledLanguages, language.code]);
                                      }
                                    }
                                  }}
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
        </TabsContent>
      </Tabs>

      {/* Modal para Agregar/Editar Setting */}
      <Dialog open={isSettingModalOpen} onOpenChange={setIsSettingModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSetting ? 'Editar Parámetro' : 'Agregar Parámetro'}
            </DialogTitle>
            <DialogDescription>
              Configura los detalles del parámetro personalizado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="setting_key">Nombre del Parámetro *</Label>
              <Input
                id="setting_key"
                value={settingForm.setting_key}
                onChange={(e) => setSettingForm({ ...settingForm, setting_key: e.target.value })}
                placeholder="Ej: max_turnos_diarios"
              />
            </div>

            <div>
              <Label htmlFor="setting_short_key">Código Corto *</Label>
              <Input
                id="setting_short_key"
                value={settingForm.setting_short_key}
                onChange={(e) => setSettingForm({ ...settingForm, setting_short_key: e.target.value })}
                placeholder="Ej: max_turnos"
              />
            </div>

            <div>
              <Label htmlFor="value_type_id">Tipo de Dato *</Label>
              <Select
                value={settingForm.value_type_id}
                onValueChange={(value) => setSettingForm({ ...settingForm, value_type_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {dataTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.lookup_label} ({type.lookup_key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="setting_value">Valor</Label>
              <Input
                id="setting_value"
                value={settingForm.setting_value}
                onChange={(e) => setSettingForm({ ...settingForm, setting_value: e.target.value })}
                placeholder="Valor del parámetro"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={settingForm.is_active}
                onCheckedChange={(checked) => 
                  setSettingForm({ ...settingForm, is_active: checked as boolean })
                }
              />
              <label
                htmlFor="is_active"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Activo
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveSetting}
              className="bg-[#0074D9] hover:bg-[#0056A3]"
            >
              <Save className="size-4 mr-2" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
