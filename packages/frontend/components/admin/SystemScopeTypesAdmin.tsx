/**
 * SystemScopeTypesAdmin.tsx - Turnos Titanium Enterprise
 * Administración de Tipos de Alcance del Sistema
 * 
 * REGLAS CRÍTICAS:
 * - ❌ NO se pueden ELIMINAR tipos de alcance (integridad arquitectónica)
 * - ✅ Solo edita nombres de presentación
 * - ✅ NO modifica estructura técnica (scope_type_key)
 * - Ejemplos: SYSTEM, TENANT, ORGANIZATION, LOCATION, DEPARTMENT
 * - Solo Super Admin (is_super_admin = true)
 */

import { useState, useEffect } from 'react';
import { formatStandardDate } from '@/utils/date-time';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Search, Target, Edit, Save, X, Lock, AlertCircle, ShieldAlert, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClient } from '../../lib/api-client';
import { useAuth } from '../../contexts/AuthContext';
import { Switch } from '../ui/switch';

interface ScopeType {
  id: string;
  scope_type_key: string;
  scope_type_name: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
}

export default function SystemScopeTypesAdmin() {
  const { profile } = useAuth();
  const [scopeTypes, setScopeTypes] = useState<ScopeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialog, setEditDialog] = useState<{ open: boolean; item: ScopeType | null; isNew: boolean }>({ 
    open: false, 
    item: null,
    isNew: false
  });
  const [formData, setFormData] = useState({
    scope_type_key: '',
    scope_type_name: '',
    is_active: true
  });
  const [saving, setSaving] = useState(false);

  // ✅ Verificar si el usuario es Super Admin
  const isSuperAdmin = profile?.is_super_admin === true || profile?.role_scope === 'SYSTEM';
  
  console.log('[SYSTEM-SCOPE-TYPES] Validación Super Admin:', {
    is_super_admin: profile?.is_super_admin,
    role_scope: profile?.role_scope,
    isSuperAdmin,
    profile
  });

  useEffect(() => {
    if (isSuperAdmin) {
      loadScopeTypes();
    }
  }, [isSuperAdmin]);

  const loadScopeTypes = async () => {
    try {
      setLoading(true);
      console.log('🎯 Cargando tipos de alcance...');
      
      const { data, error } = await ApiClient
        .from('scope_types')
        .select('*')
        .order('scope_type_key', { ascending: true });

      if (error) throw error;

      console.log(`✅ ${data?.length || 0} tipos de alcance cargados`);
      setScopeTypes(data || []);
    } catch (error: any) {
      console.error('❌ Error cargando tipos de alcance:', error);
      toast.error('Error cargando tipos de alcance del sistema');
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setFormData({
      scope_type_key: '',
      scope_type_name: '',
      is_active: true
    });
    setEditDialog({ open: true, item: null, isNew: true });
  };

  const handleEdit = (scopeType: ScopeType) => {
    setFormData({
      scope_type_key: scopeType.scope_type_key,
      scope_type_name: scopeType.scope_type_name,
      is_active: scopeType.is_active
    });
    setEditDialog({ open: true, item: scopeType, isNew: false });
  };

  const handleSave = async () => {
    if (!formData.scope_type_name.trim()) {
      toast.error('El nombre del tipo de alcance es requerido');
      return;
    }

    if (editDialog.isNew && !formData.scope_type_key.trim()) {
      toast.error('El key del tipo de alcance es requerido');
      return;
    }

    if (editDialog.isNew && !/^[A-Z_]+$/.test(formData.scope_type_key)) {
      toast.error('El key debe contener solo letras mayúsculas y guiones bajos (ej: SYSTEM, TENANT, ORGANIZATION)');
      return;
    }

    setSaving(true);

    try {
      console.log('💾 Guardando tipo de alcance...');

      if (editDialog.isNew) {
        // Crear nuevo
        const { error } = await ApiClient
          .from('scope_types')
          .insert({
            scope_type_key: formData.scope_type_key.toUpperCase(),
            scope_type_name: formData.scope_type_name.trim(),
            is_active: formData.is_active,
            created_by: profile?.email || 'SYSTEM_ADMIN'
          });

        if (error) throw error;
        toast.success('Tipo de alcance creado exitosamente');
      } else {
        // Actualizar existente
        const { error } = await ApiClient
          .from('scope_types')
          .update({
            scope_type_name: formData.scope_type_name.trim(),
            is_active: formData.is_active,
            updated_by: profile?.email || 'SYSTEM_ADMIN',
            updated_at: new Date().toISOString()
          })
          .eq('id', editDialog.item!.id);

        if (error) throw error;
        toast.success('Tipo de alcance actualizado exitosamente');
      }

      setEditDialog({ open: false, item: null, isNew: false });
      loadScopeTypes();
    } catch (error: any) {
      console.error('❌ Error guardando tipo de alcance:', error);
      toast.error(error.message || 'Error al guardar el tipo de alcance');
    } finally {
      setSaving(false);
    }
  };

  // Filtrado
  const filteredScopeTypes = scopeTypes.filter(st =>
    st.scope_type_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    st.scope_type_name.toLowerCase().includes(searchTerm.toLowerCase())
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
            Solo los Super Administradores pueden gestionar los tipos de alcance del sistema.
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
          <p className="text-gray-600">Cargando tipos de alcance...</p>
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
                Los tipos de alcance del sistema <strong>NO se pueden eliminar</strong> para mantener la integridad arquitectónica.
                Solo puedes <strong>desactivar</strong> tipos que no utilices o editar sus nombres de presentación.
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
                <Target className="size-6 text-[#0074D9]" />
                Tipos de Alcance del Sistema
              </CardTitle>
              <CardDescription className="mt-2">
                Define los niveles de alcance para permisos y seguridad (SYSTEM, TENANT, ORGANIZATION, etc.).
              </CardDescription>
            </div>
            <Button
              onClick={handleNew}
              className="bg-[#0074D9] hover:bg-[#0062b8]"
            >
              <Plus className="size-4 mr-2" />
              Nuevo Tipo
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
                placeholder="Buscar por clave o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline" className="text-sm">
              {filteredScopeTypes.length} tipos
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
                      Clave del tipo de alcance
                    </div>
                  </TableHead>
                  <TableHead>Nombre del Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead>Creado Por</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScopeTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No se encontraron tipos de alcance
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredScopeTypes.map(st => (
                    <TableRow key={st.id}>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono font-semibold">
                          {st.scope_type_key}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">
                        {st.scope_type_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.is_active ? "default" : "secondary"}>
                          {st.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatStandardDate(st.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {st.created_by}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(st)}
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
              <Target className="size-5 text-[#0074D9]" />
              {editDialog.isNew ? 'Nuevo Tipo de Alcance' : 'Editar Tipo de Alcance'}
            </DialogTitle>
            <DialogDescription>
              {editDialog.isNew 
                ? 'Crea un nuevo tipo de alcance para el sistema. El key no podrá modificarse después.'
                : 'Modifica el nombre del tipo de alcance. El key no se puede cambiar.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Clave del tipo de alcance *</Label>
              <Input
                value={formData.scope_type_key}
                onChange={(e) => setFormData({ ...formData, scope_type_key: e.target.value.toUpperCase() })}
                placeholder="SYSTEM, TENANT, ORGANIZATION..."
                disabled={!editDialog.isNew}
                className={!editDialog.isNew ? 'bg-gray-50' : ''}
              />
              {!editDialog.isNew && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Lock className="size-3" />
                  El key no se puede modificar
                </div>
              )}
              {editDialog.isNew && (
                <div className="text-xs text-gray-500">
                  Solo letras mayúsculas y guiones bajos. Ej: SYSTEM, TENANT, DEPARTMENT
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Nombre del Tipo *</Label>
              <Input
                value={formData.scope_type_name}
                onChange={(e) => setFormData({ ...formData, scope_type_name: e.target.value })}
                placeholder="Sistema, Tenant, Organización..."
              />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <Label>Estado Activo</Label>
                <p className="text-xs text-gray-500 mt-1">
                  Los tipos inactivos no estarán disponibles para asignación
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
              onClick={() => setEditDialog({ open: false, item: null, isNew: false })}
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
