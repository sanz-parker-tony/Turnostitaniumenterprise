/**
 * SystemLanguagesAdmin.tsx - Turnos Titanium Enterprise
 * Administración de Idiomas del Sistema
 * 
 * REGLAS CRÍTICAS:
 * - Gestiona idiomas disponibles en la aplicación
 * - Solo puede haber UN idioma por defecto
 * - Los códigos ISO 639-1 no se pueden modificar una vez creados
 * - ❌ NO SE PUEDEN ELIMINAR idiomas del sistema (integridad arquitectónica)
 * - ✅ Solo se pueden DESACTIVAR idiomas no utilizados
 * - Solo Super Admin (tenant_id = GOD)
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
import { Search, Plus, Edit, Save, X, Globe, Lock, AlertCircle, Star, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SystemLanguage {
  id: string;
  code: string;
  language_name: string;
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function SystemLanguagesAdmin() {
  const { profile } = useAuth();
  const [languages, setLanguages] = useState<SystemLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialog, setEditDialog] = useState<{ open: boolean; item: SystemLanguage | null; isNew: boolean }>({ 
    open: false, 
    item: null,
    isNew: false
  });
  const [formData, setFormData] = useState({
    code: '',
    language_name: '',
    is_active: true,
    is_default: false
  });
  const [saving, setSaving] = useState(false);

  // ✅ Verificar si el usuario es Super Admin
  const isSuperAdmin = profile?.is_super_admin === true || profile?.role_scope === 'SYSTEM';
  
  console.log('[SYSTEM-LANGUAGES] Validación Super Admin:', {
    is_super_admin: profile?.is_super_admin,
    role_scope: profile?.role_scope,
    isSuperAdmin,
    profile
  });

  useEffect(() => {
    if (isSuperAdmin) {
      loadLanguages();
    }
  }, [isSuperAdmin]);

  const loadLanguages = async () => {
    try {
      setLoading(true);
      console.log('🌐 Cargando idiomas del sistema...');
      
      const { data, error } = await supabase
        .from('system_languages')
        .select('*')
        .order('is_default', { ascending: false })
        .order('language_name', { ascending: true });

      if (error) throw error;

      console.log(`✅ ${data?.length || 0} idiomas cargados`);
      setLanguages(data || []);
    } catch (error: any) {
      console.error('❌ Error cargando idiomas:', error);
      toast.error('Error cargando idiomas del sistema');
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setFormData({
      code: '',
      language_name: '',
      is_active: true,
      is_default: false
    });
    setEditDialog({ open: true, item: null, isNew: true });
  };

  const handleEdit = (language: SystemLanguage) => {
    setFormData({
      code: language.code,
      language_name: language.language_name,
      is_active: language.is_active,
      is_default: language.is_default
    });
    setEditDialog({ open: true, item: language, isNew: false });
  };

  const handleSave = async () => {
    if (!formData.language_name.trim()) {
      toast.error('El nombre del idioma es requerido');
      return;
    }

    if (editDialog.isNew && !formData.code.trim()) {
      toast.error('El código ISO es requerido');
      return;
    }

    if (editDialog.isNew && formData.code.length !== 2) {
      toast.error('El código ISO debe tener exactamente 2 caracteres (ej: ES, EN, PT)');
      return;
    }

    setSaving(true);

    try {
      console.log('💾 Guardando idioma...');

      // Si se marca como predeterminado, desmarcar los demás primero
      if (formData.is_default) {
        const { error: updateError } = await supabase
          .from('system_languages')
          .update({ is_default: false })
          .neq('code', editDialog.isNew ? formData.code : editDialog.item!.code);

        if (updateError) throw updateError;
      }

      if (editDialog.isNew) {
        // Crear nuevo
        const { error } = await supabase
          .from('system_languages')
          .insert({
            code: formData.code.toUpperCase(),
            language_name: formData.language_name.trim(),
            is_active: formData.is_active,
            is_default: formData.is_default
          });

        if (error) throw error;
        toast.success('Idioma creado exitosamente');
      } else {
        // Actualizar existente
        const { error } = await supabase
          .from('system_languages')
          .update({
            language_name: formData.language_name.trim(),
            is_active: formData.is_active,
            is_default: formData.is_default,
            updated_at: new Date().toISOString()
          })
          .eq('id', editDialog.item!.id);

        if (error) throw error;
        toast.success('Idioma actualizado exitosamente');
      }

      setEditDialog({ open: false, item: null, isNew: false });
      loadLanguages();
    } catch (error: any) {
      console.error('❌ Error guardando idioma:', error);
      toast.error(error.message || 'Error al guardar el idioma');
    } finally {
      setSaving(false);
    }
  };

  // Filtrado
  const filteredLanguages = languages.filter(lang =>
    lang.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lang.language_name.toLowerCase().includes(searchTerm.toLowerCase())
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
            Solo los Super Administradores pueden gestionar los idiomas del sistema.
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
          <p className="text-gray-600">Cargando idiomas...</p>
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
                Los idiomas del sistema <strong>NO se pueden eliminar</strong> para mantener la integridad arquitectónica.
                Solo puedes <strong>desactivar</strong> idiomas que no utilices marcándolos como "Inactivo".
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
                <Globe className="size-6 text-[#0074D9]" />
                Idiomas del Sistema
              </CardTitle>
              <CardDescription className="mt-2">
                Gestiona los idiomas disponibles en la aplicación. Solo puede haber un idioma predeterminado.
              </CardDescription>
            </div>
            <Button
              onClick={handleNew}
              className="bg-[#0074D9] hover:bg-[#0062b8]"
            >
              <Plus className="size-4 mr-2" />
              Nuevo Idioma
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Búsqueda y Tabla */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Buscar por código o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline" className="text-sm">
              {filteredLanguages.length} idiomas
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[100px]">Código ISO</TableHead>
                  <TableHead>Nombre del Idioma</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Predeterminado</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLanguages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No se encontraron idiomas
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLanguages.map(lang => (
                    <TableRow key={lang.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono font-semibold">
                            {lang.code}
                          </code>
                          {lang.is_default && (
                            <Star className="size-4 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {lang.language_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={lang.is_active ? "default" : "secondary"}>
                          {lang.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lang.is_default ? (
                          <Badge className="bg-[#0074D9] text-white">
                            Predeterminado
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {lang.created_at ? new Date(lang.created_at).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(lang)}
                          className="text-[#0074D9] hover:text-[#0074D9] hover:bg-blue-50"
                        >
                          <Edit className="size-4 mr-2" />
                          Editar
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

      {/* Dialog de Edición/Creación */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, item: null, isNew: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="size-5 text-[#0074D9]" />
              {editDialog.isNew ? 'Nuevo Idioma' : 'Editar Idioma'}
            </DialogTitle>
            <DialogDescription>
              {editDialog.isNew 
                ? 'Agrega un nuevo idioma al sistema. El código ISO no podrá modificarse después.'
                : 'Modifica la información del idioma. El código ISO no se puede cambiar.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Código ISO 639-1 *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="ES, EN, PT, FR..."
                maxLength={2}
                disabled={!editDialog.isNew}
                className={!editDialog.isNew ? 'bg-gray-50' : ''}
              />
              {!editDialog.isNew && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Lock className="size-3" />
                  El código ISO no se puede modificar
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Nombre del Idioma *</Label>
              <Input
                value={formData.language_name}
                onChange={(e) => setFormData({ ...formData, language_name: e.target.value })}
                placeholder="Español, English, Português..."
              />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <Label>Estado Activo</Label>
                <p className="text-xs text-gray-500 mt-1">
                  Los idiomas inactivos no aparecerán en la aplicación
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3 bg-blue-50 border-blue-200">
              <div>
                <Label>Idioma Predeterminado</Label>
                <p className="text-xs text-gray-600 mt-1">
                  Solo puede haber un idioma predeterminado en el sistema
                </p>
              </div>
              <Switch
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open, item: null, isNew: false })}
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
    </div>
  );
}