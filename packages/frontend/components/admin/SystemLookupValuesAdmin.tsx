/**
 * SystemLookupValuesAdmin.tsx - Turnos Titanium Enterprise
 * Administración de Valores de Catálogos del Sistema y sus Traducciones
 * 
 * REGLAS CRÍTICAS:
 * - ❌ NO se pueden ELIMINAR valores del sistema (integridad arquitectónica)
 * - ✅ Solo muestra valores con tenant_id IS NULL (valores del sistema)
 * - ✅ SYSTEM_ADMIN puede crear valores con tenant_id = NULL
 * - ✅ TENANT_ADMIN puede crear valores con tenant_id = su_tenant_id (otra pantalla)
 * - ✅ Multiidioma desde system_languages
 * - Solo Super Admin (is_super_admin = true)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Search, Database, Edit, Save, X, Lock, Globe, AlertCircle, CheckCircle2, ShieldAlert, Plus, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClient } from '../../lib/api-client';
import { useAuth } from '../../contexts/AuthContext';

interface SystemLanguage {
  code: string;
  language_name: string;
  is_active: boolean;
  is_default: boolean;
}

interface LookupGroup {
  id: string;
  lookup_group_key: string;
  lookup_group_label: string;
}

interface LookupValueTranslation {
  id?: string;
  language_code: string;
  label: string;
  short_label: string;
  language_name?: string;
}

interface LookupValue {
  id: string;
  lookup_group_id: string;
  lookup_key: string;
  lookup_label: string;
  lookup_short_label: string;
  lookup_scope: 'SYSTEM' | 'TENANT';
  sort_order: number;
  is_active: boolean;
  created_at: string;
  lookup_group?: {
    lookup_group_key: string;
    lookup_group_label: string;
  };
  translations: LookupValueTranslation[];
}

export default function SystemLookupValuesAdmin() {
  const { profile } = useAuth();
  const [lookupValues, setLookupValues] = useState<LookupValue[]>([]);
  const [lookupGroups, setLookupGroups] = useState<LookupGroup[]>([]);
  const [languages, setLanguages] = useState<SystemLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('ALL');
  const [editDialog, setEditDialog] = useState<{ 
    open: boolean; 
    item: LookupValue | null; 
    isNew: boolean;
    mode: 'edit' | 'translate';
  }>({ 
    open: false, 
    item: null,
    isNew: false,
    mode: 'edit'
  });
  const [formData, setFormData] = useState({
    lookup_group_id: '',
    lookup_key: '',
    lookup_label: '',
    lookup_short_label: '',
    sort_order: 0,
    is_active: true
  });
  const [translations, setTranslations] = useState<LookupValueTranslation[]>([]);
  const [saving, setSaving] = useState(false);

  // ✅ Verificar si el usuario es Super Admin
  const isSuperAdmin = profile?.is_super_admin === true || profile?.role_scope === 'SYSTEM';
  
  console.log('[SYSTEM-LOOKUP-VALUES] Validación Super Admin:', {
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
      loadLookupGroups(),
      loadLookupValues()
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

  const loadLookupGroups = async () => {
    try {
      console.log('📋 Cargando grupos de catálogos...');
      
      const { data, error } = await ApiClient
        .from('lookup_groups')
        .select('id, lookup_group_key, lookup_group_label')
        .eq('is_active', true)
        .order('lookup_group_label', { ascending: true });

      if (error) throw error;

      console.log(`✅ ${data?.length || 0} grupos de catálogos cargados`);
      setLookupGroups(data || []);
    } catch (error: any) {
      console.error('❌ Error cargando grupos:', error);
      toast.error('Error cargando grupos de catálogos');
    }
  };

  const loadLookupValues = async () => {
    try {
      console.log('💾 Cargando valores del sistema (tenant_id IS NULL)...');
      
      const { data, error } = await ApiClient
        .from('lookup_values')
        .select(`
          id,
          lookup_group_id,
          lookup_key,
          lookup_label,
          lookup_short_label,
          lookup_scope,
          sort_order,
          is_active,
          created_at,
          lookup_groups!lookup_values_lookup_group_id_fkey (
            lookup_group_key,
            lookup_group_label
          ),
          lookup_value_translations (
            id,
            language_code,
            label,
            short_label
          )
        `)
        .is('tenant_id', null)  // ✅ CRÍTICO: Solo valores del sistema
        .order('lookup_group_id', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Procesar datos
      const processed = data?.map((value: any) => ({
        id: value.id,
        lookup_group_id: value.lookup_group_id,
        lookup_key: value.lookup_key,
        lookup_label: value.lookup_label,
        lookup_short_label: value.lookup_short_label,
        lookup_scope: value.lookup_scope,
        sort_order: value.sort_order,
        is_active: value.is_active,
        created_at: value.created_at,
        lookup_group: value.lookup_groups,
        translations: value.lookup_value_translations || []
      })) || [];

      console.log(`✅ ${processed.length} valores del sistema cargados`);
      setLookupValues(processed);
    } catch (error: any) {
      console.error('❌ Error cargando valores:', error);
      toast.error('Error cargando valores del sistema');
    }
  };

  const handleNew = () => {
    setFormData({
      lookup_group_id: '',
      lookup_key: '',
      lookup_label: '',
      lookup_short_label: '',
      sort_order: 0,
      is_active: true
    });
    setEditDialog({ open: true, item: null, isNew: true, mode: 'edit' });
  };

  const handleEdit = (value: LookupValue) => {
    setFormData({
      lookup_group_id: value.lookup_group_id,
      lookup_key: value.lookup_key,
      lookup_label: value.lookup_label,
      lookup_short_label: value.lookup_short_label,
      sort_order: value.sort_order,
      is_active: value.is_active
    });
    setEditDialog({ open: true, item: value, isNew: false, mode: 'edit' });
  };

  const handleEditTranslations = (value: LookupValue) => {
    console.log('✏️ Editando traducciones de:', value.lookup_key);
    
    // Inicializar traducciones con los idiomas disponibles
    const initialTranslations: LookupValueTranslation[] = languages.map(lang => {
      const existing = value.translations.find(t => t.language_code === lang.code);
      return {
        id: existing?.id,
        language_code: lang.code,
        label: existing?.label || value.lookup_label,
        short_label: existing?.short_label || value.lookup_short_label,
        language_name: lang.language_name
      };
    });

    setTranslations(initialTranslations);
    setEditDialog({ open: true, item: value, isNew: false, mode: 'translate' });
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

    if (!formData.lookup_group_id) {
      toast.error('Debes seleccionar un grupo de catálogo');
      return;
    }

    if (!formData.lookup_label.trim()) {
      toast.error('La etiqueta del valor es requerida');
      return;
    }

    if (!formData.lookup_short_label.trim()) {
      toast.error('La etiqueta corta del valor es requerida');
      return;
    }

    if (editDialog.isNew && !formData.lookup_key.trim()) {
      toast.error('El key del valor es requerido');
      return;
    }

    if (editDialog.isNew && !/^[A-Z_0-9]+$/.test(formData.lookup_key)) {
      toast.error('El key debe contener solo letras mayúsculas, números y guiones bajos');
      return;
    }

    setSaving(true);

    try {
      console.log('💾 Guardando valor del sistema...');

      if (editDialog.isNew) {
        // Crear nuevo - ✅ CRÍTICO: tenant_id = NULL para valores del sistema
        const { error } = await ApiClient
          .from('lookup_values')
          .insert({
            tenant_id: null,  // ✅ NULL = valor del sistema
            lookup_group_id: formData.lookup_group_id,
            lookup_key: formData.lookup_key.toUpperCase(),
            lookup_label: formData.lookup_label.trim(),
            lookup_short_label: formData.lookup_short_label.trim(),
            lookup_scope: 'SYSTEM',
            sort_order: formData.sort_order,
            is_active: formData.is_active,
            created_by: profile?.email || 'SYSTEM_ADMIN'
          });

        if (error) throw error;
        toast.success('Valor del sistema creado exitosamente');
      } else {
        // Actualizar existente
        const { error } = await ApiClient
          .from('lookup_values')
          .update({
            lookup_label: formData.lookup_label.trim(),
            lookup_short_label: formData.lookup_short_label.trim(),
            sort_order: formData.sort_order,
            is_active: formData.is_active,
            updated_by: profile?.email || 'SYSTEM_ADMIN',
            updated_at: new Date().toISOString()
          })
          .eq('id', editDialog.item!.id);

        if (error) throw error;
        toast.success('Valor del sistema actualizado exitosamente');
      }

      setEditDialog({ open: false, item: null, isNew: false, mode: 'edit' });
      loadLookupValues();
    } catch (error: any) {
      console.error('❌ Error guardando valor:', error);
      toast.error(error.message || 'Error al guardar el valor');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTranslations = async () => {
    if (!editDialog.item) return;

    setSaving(true);
    
    try {
      console.log('💾 Guardando traducciones del valor...');

      // Preparar datos para insertar/actualizar
      const translationsToSave = translations.map(t => ({
        lookup_value_id: editDialog.item!.id,
        language_code: t.language_code,
        label: t.label.trim(),
        short_label: t.short_label.trim()
      }));

      console.log('📤 Traducciones a guardar:', translationsToSave);

      // Guardar traducciones (upsert)
      const { error } = await ApiClient
        .from('lookup_value_translations')
        .upsert(translationsToSave, {
          onConflict: 'lookup_value_id,language_code'
        });

      if (error) throw error;

      console.log('✅ Traducciones guardadas exitosamente');
      toast.success('Traducciones actualizadas correctamente');
      
      setEditDialog({ open: false, item: null, isNew: false, mode: 'edit' });
      loadLookupValues();
    } catch (error: any) {
      console.error('❌ Error guardando traducciones:', error);
      toast.error('Error al guardar las traducciones');
    } finally {
      setSaving(false);
    }
  };

  // Filtrado
  const filteredValues = lookupValues.filter(value => {
    const matchesSearch = 
      value.lookup_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      value.lookup_label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      value.lookup_group?.lookup_group_label.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGroup = filterGroup === 'ALL' || value.lookup_group_id === filterGroup;
    
    return matchesSearch && matchesGroup;
  });

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
            Solo los Super Administradores pueden gestionar los valores del sistema.
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
          <p className="text-gray-600">Cargando valores del sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Advertencia Crítica */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-1">⚠️ Valores del Sistema (tenant_id = NULL)</p>
              <p className="text-amber-800">
                Esta pantalla muestra <strong>SOLO valores del sistema</strong> (tenant_id = NULL). 
                Los valores con tenant_id son gestionados por TENANT_ADMIN en otra pantalla.
                <strong className="block mt-1">NO se pueden eliminar</strong> para mantener integridad arquitectónica.
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
                <Database className="size-6 text-[#0074D9]" />
                Valores del Sistema
              </CardTitle>
              <CardDescription className="mt-2">
                Gestiona los valores de catálogos del sistema (estados, tipos, géneros, etc.) con tenant_id = NULL.
              </CardDescription>
            </div>
            <Button
              onClick={handleNew}
              className="bg-[#0074D9] hover:bg-[#0062b8]"
            >
              <Plus className="size-4 mr-2" />
              Nuevo Valor
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Buscar por clave, etiqueta o grupo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-gray-400" />
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los grupos</SelectItem>
                  {lookupGroups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.lookup_group_label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="text-sm">
                {filteredValues.length} valores
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="pt-6">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Grupo</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Lock className="size-4 text-gray-400" />
                      Clave
                    </div>
                  </TableHead>
                  <TableHead>Etiqueta</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Traducciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredValues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No se encontraron valores del sistema
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredValues.map(value => (
                    <TableRow key={value.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {value.lookup_group?.lookup_group_label || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {value.lookup_key}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{value.lookup_label}</div>
                          <div className="text-sm text-gray-500">{value.lookup_short_label}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {value.sort_order}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {value.translations.length} / {languages.length}
                          </Badge>
                          {value.translations.length === languages.length && (
                            <CheckCircle2 className="size-4 text-green-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={value.is_active ? "default" : "secondary"}>
                          {value.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(value)}
                            className="text-[#0074D9] hover:text-[#0074D9] hover:bg-blue-50"
                          >
                            <Edit className="size-4 mr-2" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTranslations(value)}
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
              <Database className="size-5 text-[#0074D9]" />
              {editDialog.isNew ? 'Nuevo Valor del Sistema' : 'Editar Valor del Sistema'}
            </DialogTitle>
            <DialogDescription>
              {editDialog.isNew 
                ? 'Crea un nuevo valor del sistema (tenant_id = NULL).'
                : 'Modifica las propiedades del valor del sistema.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Grupo de Catálogo *</Label>
              <Select 
                value={formData.lookup_group_id} 
                onValueChange={(value) => setFormData({ ...formData, lookup_group_id: value })}
                disabled={!editDialog.isNew}
              >
                <SelectTrigger className={!editDialog.isNew ? 'bg-gray-50' : ''}>
                  <SelectValue placeholder="Selecciona un grupo..." />
                </SelectTrigger>
                <SelectContent>
                  {lookupGroups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.lookup_group_label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!editDialog.isNew && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Lock className="size-3" />
                  El grupo no se puede cambiar
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Clave de catálogo *</Label>
              <Input
                value={formData.lookup_key}
                onChange={(e) => setFormData({ ...formData, lookup_key: e.target.value.toUpperCase() })}
                placeholder="MALE, ACTIVE, PENDING..."
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
                value={formData.lookup_label}
                onChange={(e) => setFormData({ ...formData, lookup_label: e.target.value })}
                placeholder="Masculino, Activo, Pendiente..."
              />
            </div>

            <div className="space-y-2">
              <Label>Etiqueta Corta *</Label>
              <Input
                value={formData.lookup_short_label}
                onChange={(e) => setFormData({ ...formData, lookup_short_label: e.target.value })}
                placeholder="M, Act, Pend..."
              />
            </div>

            <div className="space-y-2">
              <Label>Orden de Visualización</Label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <Label>Estado Activo</Label>
                <p className="text-xs text-gray-500 mt-1">
                  Los valores inactivos no estarán disponibles
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
              Traducciones: {editDialog.item?.lookup_label}
            </DialogTitle>
            <DialogDescription>
              Edita las traducciones del valor en los diferentes idiomas disponibles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Info del Valor */}
            <div className="bg-gray-50 border rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-600">Clave técnica</Label>
                  <div className="font-mono text-sm mt-1 flex items-center gap-2">
                    <Lock className="size-3 text-gray-400" />
                    {editDialog.item?.lookup_key}
                  </div>
                </div>
                <div>
                  <Label className="text-gray-600">Grupo</Label>
                  <div className="text-sm mt-1">
                    <Badge variant="outline">
                      {editDialog.item?.lookup_group?.lookup_group_label}
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
