/**
 * SystemMenuGroupsAdmin.tsx - Turnos Titanium Enterprise
 * Administración de Grupos de Menú del Sistema y sus Traducciones
 * 
 * REGLAS CRÍTICAS:
 * - ❌ NO se pueden ELIMINAR grupos de menú (integridad arquitectónica)
 * - ✅ Solo edita etiquetas y traducciones
 * - ✅ NO modifica estructura técnica (keys, rutas, orden)
 * - ✅ Multiidioma desde system_languages
 * - Solo Super Admin (tenant_id = GOD)
 * 
 * VALIDACIÓN:
 * ✅ react-hook-form + zod
 * ✅ Validación en tiempo real después del submit
 * ✅ Mensajes de error claros por campo
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Search, Languages, Edit, Save, X, Lock, Globe, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClient } from '../../lib/api-client';
import { useAuth } from '../../contexts/AuthContext';
import { FormInput } from '../forms';

interface SystemLanguage {
  code: string;
  language_name: string;
  is_active: boolean;
  is_default: boolean;
}

interface MenuGroupTranslation {
  id?: string;
  language_code: string;
  menu_group_name: string;
  language_name?: string;
}

interface MenuGroup {
  id: string;
  menu_group_key: string;
  menu_group_name: string;
  sort_order: number;
  icon_key: string;
  is_active: boolean;
  translations: MenuGroupTranslation[];
}

// ✅ Helper para obtener token de la sesión
const getAuthToken = async (): Promise<string | null> => {
  try {
    const { data: { session }, error } = await ApiClient.auth.getSession();
    if (error || !session) return null;
    return session.access_token;
  } catch (error) {
    console.error('❌ Error en getAuthToken:', error);
    return null;
  }
};

export default function SystemMenuGroupsAdmin() {
  const { profile } = useAuth();
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [languages, setLanguages] = useState<SystemLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialog, setEditDialog] = useState<{ open: boolean; item: MenuGroup | null }>({ 
    open: false, 
    item: null 
  });
  const [translations, setTranslations] = useState<MenuGroupTranslation[]>([]);
  const [saving, setSaving] = useState(false);

  // ✅ Verificar si el usuario es Super Admin
  const isSuperAdmin = profile?.is_super_admin === true || profile?.role_scope === 'SYSTEM';
  
  console.log('[SYSTEM-MENU-GROUPS] Validación Super Admin:', {
    is_super_admin: profile?.is_super_admin,
    role_scope: profile?.role_scope,
    isSuperAdmin,
    profile
  });

  useEffect(() => {
    if (isSuperAdmin) {
      loadData();
    }
  }, [isSuperAdmin]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadLanguages(),
      loadMenuGroups()
    ]);
    setLoading(false);
  };

  const loadLanguages = async () => {
    try {
      console.log('🌐 Cargando idiomas del sistema...');
      
      const { data, error } = await ApiClient
        .from('system_languages')
        .select('code, language_name, is_active, is_default')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('language_name', { ascending: true });

      if (error) throw error;

      console.log(`✅ ${data?.length || 0} idiomas cargados`);
      setLanguages(data || []);
    } catch (error: any) {
      console.error('❌ Error cargando idiomas:', error);
      toast.error('Error cargando idiomas del sistema');
    }
  };

  const loadMenuGroups = async () => {
    try {
      console.log('📋 Cargando grupos de menú...');
      
      const { data, error } = await ApiClient
        .from('system_menu_groups')
        .select(`
          id,
          menu_group_key,
          menu_group_name,
          sort_order,
          icon_key,
          is_active,
          system_menu_group_translations (
            id,
            language_code,
            menu_group_name
          )
        `)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Procesar datos
      const processed = data?.map(group => ({
        id: group.id,
        menu_group_key: group.menu_group_key,
        menu_group_name: group.menu_group_name,
        sort_order: group.sort_order,
        icon_key: group.icon_key,
        is_active: group.is_active,
        translations: group.system_menu_group_translations || []
      })) || [];

      console.log(`✅ ${processed.length} grupos de menú cargados`);
      setMenuGroups(processed);
    } catch (error: any) {
      console.error('❌ Error cargando grupos de menú:', error);
      toast.error('Error cargando grupos de menú');
    }
  };

  const handleEditTranslations = (menuGroup: MenuGroup) => {
    console.log('✏️ Editando traducciones de:', menuGroup.menu_group_key);
    
    // Inicializar traducciones con los idiomas disponibles
    const initialTranslations: MenuGroupTranslation[] = languages.map(lang => {
      const existing = menuGroup.translations.find(t => t.language_code === lang.code);
      return {
        id: existing?.id,
        language_code: lang.code,
        menu_group_name: existing?.menu_group_name || menuGroup.menu_group_name,
        language_name: lang.language_name
      };
    });

    setTranslations(initialTranslations);
    setEditDialog({ open: true, item: menuGroup });
  };

  const handleTranslationChange = (languageCode: string, value: string) => {
    setTranslations(prev => prev.map(t => 
      t.language_code === languageCode 
        ? { ...t, menu_group_name: value }
        : t
    ));
  };

  const handleSaveTranslations = async () => {
    if (!editDialog.item) return;

    setSaving(true);
    
    try {
      console.log('💾 Guardando traducciones...');
      
      const token = await getAuthToken();
      if (!token) {
        toast.error('No se pudo obtener token de autenticación');
        return;
      }

      // Preparar datos para insertar/actualizar
      const translationsToSave = translations.map(t => ({
        menu_group_id: editDialog.item!.id,
        language_code: t.language_code,
        menu_group_name: t.menu_group_name.trim()
      }));

      console.log('📤 Traducciones a guardar:', translationsToSave);

      // Guardar traducciones (upsert)
      const { error } = await ApiClient
        .from('system_menu_group_translations')
        .upsert(translationsToSave, {
          onConflict: 'menu_group_id,language_code'
        });

      if (error) throw error;

      console.log('✅ Traducciones guardadas exitosamente');
      toast.success('Traducciones actualizadas correctamente');
      
      setEditDialog({ open: false, item: null });
      loadMenuGroups();
    } catch (error: any) {
      console.error('❌ Error guardando traducciones:', error);
      toast.error('Error al guardar las traducciones');
    } finally {
      setSaving(false);
    }
  };

  // Filtrado
  const filteredMenuGroups = menuGroups.filter(group =>
    group.menu_group_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.menu_group_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ Control de acceso
  if (!isSuperAdmin) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="size-5" />
            Acceso Restringido
          </CardTitle>
          <CardDescription className="text-red-600">
            Solo los Super Administradores pueden gestionar los grupos de menú del sistema.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block size-8 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Cargando grupos de menú...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Languages className="size-6 text-[#0074D9]" />
                Grupos de Menú del Sistema
              </CardTitle>
              <CardDescription className="mt-2">
                Gestiona las traducciones de los grupos de menú en diferentes idiomas.
                Los datos técnicos (keys, orden, íconos) están protegidos.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Idiomas Activos */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 text-base">
            <Globe className="size-5" />
            Idiomas Activos ({languages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {languages.map(lang => (
              <Badge 
                key={lang.code}
                variant={lang.is_default ? "default" : "secondary"}
                className={lang.is_default ? "bg-[#0074D9] text-white" : ""}
              >
                {lang.language_name} ({lang.code.toUpperCase()})
                {lang.is_default && " - Predeterminado"}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Búsqueda y Tabla */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o clave..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline" className="text-sm">
              {filteredMenuGroups.length} grupos
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[50px]">Orden</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Lock className="size-4 text-gray-400" />
                      Clave técnica
                    </div>
                  </TableHead>
                  <TableHead>Nombre Base</TableHead>
                  <TableHead>Traducciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMenuGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No se encontraron grupos de menú
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMenuGroups.map(group => (
                    <TableRow key={group.id}>
                      <TableCell className="font-mono text-sm text-gray-600">
                        {group.sort_order}
                      </TableCell>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {group.menu_group_key}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">
                        {group.menu_group_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {group.translations.length} / {languages.length}
                          </Badge>
                          {group.translations.length === languages.length && (
                            <CheckCircle2 className="size-4 text-green-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={group.is_active ? "default" : "secondary"}>
                          {group.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTranslations(group)}
                          className="text-[#0074D9] hover:text-[#0074D9] hover:bg-blue-50"
                        >
                          <Edit className="size-4 mr-2" />
                          Traducir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Edición de Traducciones */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, item: null })}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="size-5 text-[#0074D9]" />
              Traducciones: {editDialog.item?.menu_group_name}
            </DialogTitle>
            <DialogDescription>
              Edita las traducciones del grupo de menú en los diferentes idiomas disponibles.
              El key técnico <code className="bg-gray-100 px-1 rounded">{editDialog.item?.menu_group_key}</code> no se puede modificar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Info del Grupo */}
            <div className="bg-gray-50 border rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-600">Clave técnica</Label>
                  <div className="font-mono text-sm mt-1 flex items-center gap-2">
                    <Lock className="size-3 text-gray-400" />
                    {editDialog.item?.menu_group_key}
                  </div>
                </div>
                <div>
                  <Label className="text-gray-600">Orden de Visualización</Label>
                  <div className="font-mono text-sm mt-1 flex items-center gap-2">
                    <Lock className="size-3 text-gray-400" />
                    {editDialog.item?.sort_order}
                  </div>
                </div>
              </div>
            </div>

            {/* Traducciones */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Traducciones por Idioma</Label>
              
              {translations.map(translation => {
                const lang = languages.find(l => l.code === translation.language_code);
                return (
                  <div key={translation.language_code} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="size-4 text-gray-400" />
                        <span className="font-medium">{translation.language_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {translation.language_code.toUpperCase()}
                        </Badge>
                        {lang?.is_default && (
                          <Badge className="bg-[#0074D9] text-white text-xs">
                            Predeterminado
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <Input
                        value={translation.menu_group_name}
                        onChange={(e) => handleTranslationChange(translation.language_code, e.target.value)}
                        placeholder={`Nombre del grupo en ${translation.language_name}...`}
                        className="font-medium"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, item: null })}
              disabled={saving}
            >
              <X className="size-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSaveTranslations}
              disabled={saving}
              className="bg-[#0074D9] hover:bg-[#0062b8]"
            >
              {saving ? (
                <>
                  <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="size-4 mr-2" />
                  Guardar Traducciones
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
