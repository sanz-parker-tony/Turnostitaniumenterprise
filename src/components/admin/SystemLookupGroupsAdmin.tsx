/**
 * SystemLookupGroupsAdmin.tsx - Turnos Titanium Enterprise
 * Administración de Grupos de Catálogos del Sistema y sus Traducciones
 * 
 * REGLAS CRÍTICAS:
 * - ❌ NO se pueden ELIMINAR grupos de catálogos (integridad arquitectónica)
 * - ✅ Solo edita etiquetas y traducciones
 * - ✅ NO modifica estructura técnica (lookup_group_key)
 * - ✅ Multiidioma desde system_languages
 * - ✅ Controla si permite items de tenant (allows_tenant_items)
 * - Solo Super Admin (is_super_admin = true)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Search, List, Edit, Save, X, Lock, Globe, AlertCircle, CheckCircle2, ShieldAlert, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SystemLanguage {
  code: string;
  language_name: string;
  is_active: boolean;
  is_default: boolean;
}

interface LookupGroupTranslation {
  id?: string;
  language_code: string;
  label: string;
  short_label: string;
  language_name?: string;
}

interface LookupGroup {
  id: string;
  lookup_group_key: string;
  lookup_group_label: string;
  lookup_group_short_label: string;
  allows_tenant_items: boolean;
  is_active: boolean;
  created_at: string;
  translations: LookupGroupTranslation[];
}

export default function SystemLookupGroupsAdmin() {
  const { profile } = useAuth();
  const [lookupGroups, setLookupGroups] = useState<LookupGroup[]>([]);
  const [languages, setLanguages] = useState<SystemLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialog, setEditDialog] = useState<{ 
    open: boolean; 
    item: LookupGroup | null; 
    isNew: boolean;
    mode: 'edit' | 'translate';
  }>({ 
    open: false, 
    item: null,
    isNew: false,
    mode: 'edit'
  });
  const [formData, setFormData] = useState({
    lookup_group_key: '',
    lookup_group_label: '',
    lookup_group_short_label: '',
    allows_tenant_items: false,
    is_active: true
  });
  const [translations, setTranslations] = useState<LookupGroupTranslation[]>([]);
  const [saving, setSaving] = useState(false);

  // ✅ Verificar si el usuario es Super Admin
  const isSuperAdmin = profile?.is_super_admin === true || profile?.role_scope === 'SYSTEM';
  
  console.log('[SYSTEM-LOOKUP-GROUPS] Validación Super Admin:', {
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
      loadLookupGroups()
    ]);
    setLoading(false);
  };

  const loadLanguages = async () => {
    try {
      console.log('🌐 Cargando idiomas del sistema...');
      
      const { data, error } = await supabase
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

  const loadLookupGroups = async () => {
    try {
      console.log('📋 Cargando grupos de catálogos...');
      
      const { data, error } = await supabase
        .from('lookup_groups')
        .select(`
          id,
          lookup_group_key,
          lookup_group_label,
          lookup_group_short_label,
          allows_tenant_items,
          is_active,
          created_at,
          lookup_group_translations (
            id,
            language_code,
            label,
            short_label
          )
        `)
        .order('lookup_group_key', { ascending: true });

      if (error) throw error;

      // Procesar datos
      const processed = data?.map((group: any) => ({
        id: group.id,
        lookup_group_key: group.lookup_group_key,
        lookup_group_label: group.lookup_group_label,
        lookup_group_short_label: group.lookup_group_short_label,
        allows_tenant_items: group.allows_tenant_items,
        is_active: group.is_active,
        created_at: group.created_at,
        translations: group.lookup_group_translations || []
      })) || [];

      console.log(`✅ ${processed.length} grupos de catálogos cargados`);
      setLookupGroups(processed);
    } catch (error: any) {
      console.error('❌ Error cargando grupos de catálogos:', error);
      toast.error('Error cargando grupos de catálogos');
    }
  };

  const handleNew = () => {
    setFormData({
      lookup_group_key: '',
      lookup_group_label: '',
      lookup_group_short_label: '',
      allows_tenant_items: false,
      is_active: true
    });
    setEditDialog({ open: true, item: null, isNew: true, mode: 'edit' });
  };

  const handleEdit = (group: LookupGroup) => {
    setFormData({
      lookup_group_key: group.lookup_group_key,
      lookup_group_label: group.lookup_group_label,
      lookup_group_short_label: group.lookup_group_short_label,
      allows_tenant_items: group.allows_tenant_items,
      is_active: group.is_active
    });
    setEditDialog({ open: true, item: group, isNew: false, mode: 'edit' });
  };

  const handleEditTranslations = (group: LookupGroup) => {
    console.log('✏️ Editando traducciones de:', group.lookup_group_key);
    
    // Inicializar traducciones con los idiomas disponibles
    const initialTranslations: LookupGroupTranslation[] = languages.map(lang => {
      const existing = group.translations.find(t => t.language_code === lang.code);
      return {
        id: existing?.id,
        language_code: lang.code,
        label: existing?.label || group.lookup_group_label,
        short_label: existing?.short_label || group.lookup_group_short_label,
        language_name: lang.language_name
      };
    });

    setTranslations(initialTranslations);
    setEditDialog({ open: true, item: group, isNew: false, mode: 'translate' });
  };

  const handleTranslationChange = (languageCode: string, field: 'label' | 'short_label', value: string) => {
    setTranslations(prev => prev.map(t => 
      t.language_code === languageCode 
        ? { ...t, [field]: value }
        : t
    ));
  };

  const handleSave = async () => {
    if (editDialog.mode === 'translate') {
      await handleSaveTranslations();
      return;
    }

    if (!formData.lookup_group_label.trim()) {
      toast.error('La etiqueta del grupo es requerida');
      return;
    }

    if (!formData.lookup_group_short_label.trim()) {
      toast.error('La etiqueta corta del grupo es requerida');
      return;
    }

    if (editDialog.isNew && !formData.lookup_group_key.trim()) {
      toast.error('El key del grupo es requerido');
      return;
    }

    if (editDialog.isNew && !/^[A-Z_]+$/.test(formData.lookup_group_key)) {
      toast.error('El key debe contener solo letras mayúsculas y guiones bajos');
      return;
    }

    setSaving(true);

    try {
      console.log('💾 Guardando grupo de catálogo...');

      if (editDialog.isNew) {
        // Crear nuevo
        const { error } = await supabase
          .from('lookup_groups')
          .insert({
            lookup_group_key: formData.lookup_group_key.toUpperCase(),
            lookup_group_label: formData.lookup_group_label.trim(),
            lookup_group_short_label: formData.lookup_group_short_label.trim(),
            allows_tenant_items: formData.allows_tenant_items,
            is_active: formData.is_active,
            created_by: profile?.email || 'SYSTEM_ADMIN'
          });

        if (error) throw error;
        toast.success('Grupo de catálogo creado exitosamente');
      } else {
        // Actualizar existente
        const { error } = await supabase
          .from('lookup_groups')
          .update({
            lookup_group_label: formData.lookup_group_label.trim(),
            lookup_group_short_label: formData.lookup_group_short_label.trim(),
            allows_tenant_items: formData.allows_tenant_items,
            is_active: formData.is_active,
            updated_by: profile?.email || 'SYSTEM_ADMIN',
            updated_at: new Date().toISOString()
          })
          .eq('id', editDialog.item!.id);

        if (error) throw error;
        toast.success('Grupo de catálogo actualizado exitosamente');
      }

      setEditDialog({ open: false, item: null, isNew: false, mode: 'edit' });
      loadLookupGroups();
    } catch (error: any) {
      console.error('❌ Error guardando grupo:', error);
      toast.error(error.message || 'Error al guardar el grupo de catálogo');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTranslations = async () => {
    if (!editDialog.item) return;

    setSaving(true);
    
    try {
      console.log('💾 Guardando traducciones del grupo...');

      // Preparar datos para insertar/actualizar
      const translationsToSave = translations.map(t => ({
        lookup_group_id: editDialog.item!.id,
        language_code: t.language_code,
        label: t.label.trim(),
        short_label: t.short_label.trim()
      }));

      console.log('📤 Traducciones a guardar:', translationsToSave);

      // Guardar traducciones (upsert)
      const { error } = await supabase
        .from('lookup_group_translations')
        .upsert(translationsToSave, {
          onConflict: 'lookup_group_id,language_code'
        });

      if (error) throw error;

      console.log('✅ Traducciones guardadas exitosamente');
      toast.success('Traducciones actualizadas correctamente');
      
      setEditDialog({ open: false, item: null, isNew: false, mode: 'edit' });
      loadLookupGroups();
    } catch (error: any) {
      console.error('❌ Error guardando traducciones:', error);
      toast.error('Error al guardar las traducciones');
    } finally {
      setSaving(false);
    }
  };

  // Filtrado
  const filteredGroups = lookupGroups.filter(group =>
    group.lookup_group_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.lookup_group_label.toLowerCase().includes(searchTerm.toLowerCase())
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
            Solo los Super Administradores pueden gestionar los grupos de catálogos del sistema.
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
          <p className="text-gray-600">Cargando grupos de catálogos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Advertencia de No Eliminación */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-1">⚠️ Política de Integridad del Sistema</p>
              <p className="text-amber-800">
                Los grupos de catálogos <strong>NO se pueden eliminar</strong> para mantener la integridad arquitectónica.
                Solo puedes editar etiquetas, traducciones y configuraciones.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <List className="size-6 text-[#0074D9]" />
                Grupos de Catálogos del Sistema
              </CardTitle>
              <CardDescription className="mt-2">
                Gestiona los grupos de catálogos que organizan los valores de lookup (estados, tipos, etc.).
              </CardDescription>
            </div>
            <Button
              onClick={handleNew}
              className="bg-[#0074D9] hover:bg-[#0062b8]"
            >
              <Plus className="size-4 mr-2" />
              Nuevo Grupo
            </Button>
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
                placeholder="Buscar por key o etiqueta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline" className="text-sm">
              {filteredGroups.length} grupos
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Lock className="size-4 text-gray-400" />
                      Key
                    </div>
                  </TableHead>
                  <TableHead>Etiqueta</TableHead>
                  <TableHead>Permite Items Tenant</TableHead>
                  <TableHead>Traducciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No se encontraron grupos de catálogos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGroups.map(group => (
                    <TableRow key={group.id}>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {group.lookup_group_key}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{group.lookup_group_label}</div>
                          <div className="text-sm text-gray-500">{group.lookup_group_short_label}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={group.allows_tenant_items ? "default" : "secondary"} className="text-xs">
                          {group.allows_tenant_items ? 'Sí' : 'No'}
                        </Badge>
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
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(group)}
                            className="text-[#0074D9] hover:text-[#0074D9] hover:bg-blue-50"
                          >
                            <Edit className="size-4 mr-2" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTranslations(group)}
                            className="text-[#2ECC71] hover:text-[#2ECC71] hover:bg-green-50"
                          >
                            <Globe className="size-4 mr-2" />
                            Traducir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Edición/Creación */}
      <Dialog open={editDialog.open && editDialog.mode === 'edit'} onOpenChange={(open) => !open && setEditDialog({ open: false, item: null, isNew: false, mode: 'edit' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="size-5 text-[#0074D9]" />
              {editDialog.isNew ? 'Nuevo Grupo de Catálogo' : 'Editar Grupo de Catálogo'}
            </DialogTitle>
            <DialogDescription>
              {editDialog.isNew 
                ? 'Crea un nuevo grupo de catálogo para organizar valores de lookup.'
                : 'Modifica las propiedades del grupo de catálogo.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Lookup Group Key *</Label>
              <Input
                value={formData.lookup_group_key}
                onChange={(e) => setFormData({ ...formData, lookup_group_key: e.target.value.toUpperCase() })}
                placeholder="GENDER, STATUS, DEPARTMENT..."
                disabled={!editDialog.isNew}
                className={!editDialog.isNew ? 'bg-gray-50' : ''}
              />
              {!editDialog.isNew && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Lock className="size-3" />
                  El key no se puede modificar
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Etiqueta *</Label>
              <Input
                value={formData.lookup_group_label}
                onChange={(e) => setFormData({ ...formData, lookup_group_label: e.target.value })}
                placeholder="Género, Estado, Departamento..."
              />
            </div>

            <div className="space-y-2">
              <Label>Etiqueta Corta *</Label>
              <Input
                value={formData.lookup_group_short_label}
                onChange={(e) => setFormData({ ...formData, lookup_group_short_label: e.target.value })}
                placeholder="Género, Estado, Depto..."
              />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3 bg-blue-50 border-blue-200">
              <div>
                <Label>Permite Items de Tenant</Label>
                <p className="text-xs text-gray-600 mt-1">
                  Si está activo, los tenants pueden agregar sus propios valores a este catálogo
                </p>
              </div>
              <Switch
                checked={formData.allows_tenant_items}
                onCheckedChange={(checked) => setFormData({ ...formData, allows_tenant_items: checked })}
              />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <Label>Estado Activo</Label>
                <p className="text-xs text-gray-500 mt-1">
                  Los grupos inactivos no estarán disponibles
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, item: null, isNew: false, mode: 'edit' })}
              disabled={saving}
            >
              <X className="size-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
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
                  Guardar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Traducciones */}
      <Dialog open={editDialog.open && editDialog.mode === 'translate'} onOpenChange={(open) => !open && setEditDialog({ open: false, item: null, isNew: false, mode: 'edit' })}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="size-5 text-[#0074D9]" />
              Traducciones: {editDialog.item?.lookup_group_label}
            </DialogTitle>
            <DialogDescription>
              Edita las traducciones del grupo en los diferentes idiomas disponibles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Info del Grupo */}
            <div className="bg-gray-50 border rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-600">Key Técnico</Label>
                  <div className="font-mono text-sm mt-1 flex items-center gap-2">
                    <Lock className="size-3 text-gray-400" />
                    {editDialog.item?.lookup_group_key}
                  </div>
                </div>
                <div>
                  <Label className="text-gray-600">Permite Items Tenant</Label>
                  <div className="text-sm mt-1">
                    <Badge variant={editDialog.item?.allows_tenant_items ? "default" : "secondary"}>
                      {editDialog.item?.allows_tenant_items ? 'Sí' : 'No'}
                    </Badge>
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
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm">Etiqueta</Label>
                        <Input
                          value={translation.label}
                          onChange={(e) => handleTranslationChange(translation.language_code, 'label', e.target.value)}
                          placeholder={`Etiqueta en ${translation.language_name}...`}
                          className="font-medium mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Etiqueta Corta</Label>
                        <Input
                          value={translation.short_label}
                          onChange={(e) => handleTranslationChange(translation.language_code, 'short_label', e.target.value)}
                          placeholder={`Etiqueta corta en ${translation.language_name}...`}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, item: null, isNew: false, mode: 'edit' })}
              disabled={saving}
            >
              <X className="size-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
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