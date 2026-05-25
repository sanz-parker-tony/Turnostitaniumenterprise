'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Edit2,
  Globe,
  Lock,
  Plus,
  Save,
  Search,
  Star,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiClient } from '../../lib/api-client';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import GridActionIconButton from '../shared/GridActionIconButton';
import HeaderInfoTips from '../shared/HeaderInfoTips';
import HeaderRefreshButton from '../shared/HeaderRefreshButton';
import SystemAdminPageHeader from '../shared/SystemAdminPageHeader';

type SystemLanguage = {
  code: string;
  language_name: string;
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
};

type EditDialogState = {
  open: boolean;
  item: SystemLanguage | null;
  isNew: boolean;
};

const INITIAL_FORM = {
  code: '',
  language_name: '',
  is_active: true,
  is_default: false,
};

export default function SystemLanguagesAdmin() {
  const { profile } = useAuth();

  const [languages, setLanguages] = useState<SystemLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [editDialog, setEditDialog] = useState<EditDialogState>({
    open: false,
    item: null,
    isNew: false,
  });

  const [formData, setFormData] = useState(INITIAL_FORM);

  const isSuperAdmin = profile?.is_super_admin === true || profile?.role_scope === 'SYSTEM';

  const filteredLanguages = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return languages.filter((lang) => {
      return lang.code.toLowerCase().includes(term) || lang.language_name.toLowerCase().includes(term);
    });
  }, [languages, searchTerm]);

  useEffect(() => {
    if (isSuperAdmin) {
      void loadLanguages();
    }
  }, [isSuperAdmin]);

  const loadLanguages = async () => {
    try {
      setLoading(true);
      const { data, error } = await ApiClient
        .from('system_languages')
        .select('*')
        .order('is_default', { ascending: false })
        .order('language_name', { ascending: true });

      if (error) throw error;
      setLanguages((data || []) as SystemLanguage[]);
    } catch (error: any) {
      console.error('Error cargando idiomas:', error);
      toast.error(error?.message || 'Error cargando idiomas del sistema');
    } finally {
      setLoading(false);
    }
  };

  const openNewDialog = () => {
    setFormData(INITIAL_FORM);
    setEditDialog({ open: true, item: null, isNew: true });
  };

  const openEditDialog = (language: SystemLanguage) => {
    setFormData({
      code: language.code,
      language_name: language.language_name,
      is_active: language.is_active,
      is_default: language.is_default,
    });
    setEditDialog({ open: true, item: language, isNew: false });
  };

  const closeDialog = () => {
    if (saving) return;
    setEditDialog({ open: false, item: null, isNew: false });
    setFormData(INITIAL_FORM);
  };

  const handleSave = async () => {
    const normalizedCode = formData.code.trim().toLowerCase();
    const normalizedName = formData.language_name.trim();

    if (!normalizedName) {
      toast.error('El nombre del idioma es requerido');
      return;
    }

    if (editDialog.isNew && !normalizedCode) {
      toast.error('El código ISO es requerido');
      return;
    }

    if (editDialog.isNew && normalizedCode.length !== 2) {
      toast.error('El código ISO debe tener exactamente 2 caracteres');
      return;
    }

    if (editDialog.isNew && !/^[a-z]{2}$/.test(normalizedCode)) {
      toast.error('El código ISO debe contener solo letras (ej: es, en, pt)');
      return;
    }

    setSaving(true);

    try {
      if (formData.is_default) {
        const currentCode = editDialog.isNew ? normalizedCode : editDialog.item?.code;
        const { error: clearDefaultError } = await ApiClient
          .from('system_languages')
          .update({ is_default: false })
          .neq('code', currentCode || '');

        if (clearDefaultError) throw clearDefaultError;
      }

      if (editDialog.isNew) {
        const { error } = await ApiClient
          .from('system_languages')
          .insert({
            code: normalizedCode,
            language_name: normalizedName,
            is_active: formData.is_active,
            is_default: formData.is_default,
          });

        if (error) throw error;
        toast.success('Idioma creado correctamente');
      } else {
        const currentCode = editDialog.item?.code;
        if (!currentCode) throw new Error('No se encontró el idioma a editar');

        const { error } = await ApiClient
          .from('system_languages')
          .update({
            language_name: normalizedName,
            is_active: formData.is_active,
            is_default: formData.is_default,
          })
          .eq('code', currentCode);

        if (error) throw error;
        toast.success('Idioma actualizado correctamente');
      }

      closeDialog();
      await loadLanguages();
    } catch (error: any) {
      console.error('Error guardando idioma:', error);
      toast.error(error?.message || 'Error al guardar el idioma');
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="size-5" />
            Acceso restringido
          </CardTitle>
          <CardDescription className="text-red-600">
            Solo SYSTEM_ADMIN puede gestionar idiomas del sistema.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block size-8 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Cargando idiomas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full space-y-6">
      <SystemAdminPageHeader
        icon={Globe}
        title="Gestión de Idiomas"
        subtitle="Gestiona los idiomas disponibles. Solo puede existir un idioma predeterminado."
        rightSlot={(
          <>
            <HeaderInfoTips
              items={[
                {
                  title: 'Política de integridad',
                  text: 'Los idiomas del sistema no se eliminan. Solo deben desactivarse para mantener integridad.',
                  variant: 'warning',
                },
              ]}
            />
            <HeaderRefreshButton onClick={loadLanguages} />
            <Button onClick={openNewDialog} className="bg-[#0074D9] hover:bg-[#0062b8]">
              <Plus className="size-4 mr-2" />
              Nuevo Idioma
            </Button>
          </>
        )}
      />

      <div className="rounded-lg border bg-white p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Buscar por código o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <p className="mt-3 text-sm text-gray-600">
          Mostrando {filteredLanguages.length} de {languages.length} idiomas
        </p>
      </div>

      <Card>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[120px]">Código ISO</TableHead>
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
                      No se encontraron idiomas.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLanguages.map((lang) => (
                    <TableRow key={lang.code}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono font-semibold">
                            {lang.code}
                          </code>
                          {lang.is_default && <Star className="size-4 text-yellow-500 fill-yellow-500" />}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{lang.language_name}</TableCell>
                      <TableCell>
                        <Badge variant={lang.is_active ? 'default' : 'secondary'}>
                          {lang.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lang.is_default ? (
                          <Badge className="bg-[#0074D9] text-white">Predeterminado</Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {lang.created_at ? new Date(lang.created_at).toLocaleDateString('es-EC') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <GridActionIconButton
                          onClick={() => openEditDialog(lang)}
                          icon={<Edit2 className="size-4" />}
                          label="Editar"
                          tone="blue"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialog.open} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="size-5 text-[#0074D9]" />
              {editDialog.isNew ? 'Nuevo Idioma' : 'Editar Idioma'}
            </DialogTitle>
            <DialogDescription>
              {editDialog.isNew
                ? 'Agrega un nuevo idioma. El código ISO no se podrá modificar luego.'
                : 'Actualiza el idioma. El código ISO no se puede modificar.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Código ISO 639-1 *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toLowerCase() }))}
                placeholder="es, en, pt, fr..."
                maxLength={2}
                disabled={!editDialog.isNew}
                className={!editDialog.isNew ? 'bg-gray-50' : ''}
              />
              {!editDialog.isNew && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Lock className="size-3" />
                  El código ISO no se puede modificar.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Nombre del Idioma *</Label>
              <Input
                value={formData.language_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, language_name: e.target.value }))}
                placeholder="Español, English, Português..."
              />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <Label>Estado Activo</Label>
                <p className="text-xs text-gray-500 mt-1">Los idiomas inactivos no aparecerán en la aplicación.</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
              />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3 bg-blue-50 border-blue-200">
              <div>
                <Label>Idioma Predeterminado</Label>
                <p className="text-xs text-gray-600 mt-1">Solo puede haber un idioma predeterminado.</p>
              </div>
              <Switch
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_default: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              <X className="size-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#0074D9] hover:bg-[#0062b8]">
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


