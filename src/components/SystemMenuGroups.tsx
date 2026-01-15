import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Search, Plus, Edit, Trash2, Save, X, LayoutGrid, AlertCircle, ShieldAlert, Lock } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import DiagnosticTool from './DiagnosticTool';
import { IconPicker, DynamicIcon } from './IconPicker';
import { useAuth } from '../contexts/AuthContext';
import SuperAdminOnly from './security/SuperAdminOnly';

interface MenuGroup {
  id: string;
  name: string;
  display_name: string;
  display_order: number;
  icon_name: string;
  is_active: boolean;
  translation_id: string;
  created_at?: string;
  updated_at?: string;
}

// ✅ Helper para obtener token de la sesión (SIEMPRE FRESCO)
const getAuthToken = async (): Promise<string | null> => {
  try {
    // ✅ Usar getSession() en lugar de refreshSession() para evitar re-renders
    console.log('🔄 Obteniendo token de sesión actual...');
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Error obteniendo sesión:', error);
      return null;
    }
    
    if (!session) {
      console.error('❌ No hay sesión activa');
      return null;
    }
    
    console.log('✅ Token obtenido de sesión:', {
      hasToken: !!session.access_token,
      tokenPreview: session.access_token?.substring(0, 50) + '...',
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A',
      user: session.user?.email,
      userId: session.user?.id
    });
    
    return session.access_token;
  } catch (error) {
    console.error('❌ Error en getAuthToken:', error);
    return null;
  }
};

export default function SystemMenuGroups() {
  const { profile, isLoading: isAuthLoading } = useAuth();
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialog, setEditDialog] = useState<{ open: boolean; item: MenuGroup | null }>({ open: false, item: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; item: MenuGroup | null }>({ open: false, item: null });
  
  // ✅ Verificar si el usuario es Super Admin usando role_scope
  const isSuperAdmin = profile?.is_super_admin === true || profile?.role_scope === 'SYSTEM';

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    display_order: 999,
    icon_name: 'CircleDot',
    is_active: true
  });

  useEffect(() => {
    if (!isAuthLoading && isSuperAdmin) {
      loadMenuGroups();
    }
  }, [isAuthLoading, isSuperAdmin]);

  const loadMenuGroups = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Iniciando carga de menu groups...');
      
      // ✅ Obtener token de la sesión activa de Supabase
      const token = await getAuthToken();
      
      console.log('🔑 Token obtenido?', !!token);
      
      if (!token) {
        console.error('❌ No se pudo obtener token de autenticación');
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        return;
      }

      console.log('📡 Realizando fetch a endpoint...');
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/system/menu-groups?language=ES`;
      console.log('📡 URL:', url);
      console.log('📡 Headers:', {
        'Authorization': `Bearer ${token.substring(0, 50)}...`,
        'Content-Type': 'application/json'
      });
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error del servidor:', errorData);
        console.error('❌ Status:', response.status);
        throw new Error(errorData.error || 'Error al cargar grupos de menú');
      }

      const data = await response.json();
      console.log('✅ Datos recibidos:', data);
      setMenuGroups(data.menu_groups || []);
    } catch (error) {
      console.error('Error cargando grupos de menú:', error);
      toast.error('Error al cargar los grupos de menú');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      display_name: '',
      display_order: 999,
      icon_name: 'CircleDot',
      is_active: true
    });
    setEditDialog({ open: true, item: null });
  };

  const handleEdit = (item: MenuGroup) => {
    setFormData({
      name: item.name,
      display_name: item.display_name,
      display_order: item.display_order,
      icon_name: item.icon_name,
      is_active: item.is_active
    });
    setEditDialog({ open: true, item });
  };

  const handleSave = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        return;
      }

      const isEditing = editDialog.item !== null;

      const url = isEditing
        ? `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/system/menu-groups/${editDialog.item.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/system/menu-groups`;

      const body = isEditing
        ? {
            ...formData,
            translation_id: editDialog.item.translation_id
          }
        : formData;

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar');
      }

      const result = await response.json();
      
      toast.success(result.message || (isEditing ? 'Grupo actualizado' : 'Grupo creado'));
      setEditDialog({ open: false, item: null });
      loadMenuGroups();
    } catch (error: any) {
      console.error('Error guardando grupo de menú:', error);
      toast.error(error.message || 'Error al guardar el grupo de menú');
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.item) return;

    try {
      const token = await getAuthToken();
      if (!token) {
        toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/system/menu-groups/${deleteDialog.item.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar');
      }

      const result = await response.json();
      
      toast.success(result.message || 'Grupo eliminado');
      setDeleteDialog({ open: false, item: null });
      loadMenuGroups();
    } catch (error: any) {
      console.error('Error eliminando grupo de menú:', error);
      toast.error(error.message || 'Error al eliminar el grupo de menú');
    }
  };

  const filteredGroups = menuGroups.filter(group => {
    const matchesSearch = 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.display_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // ✅ PANTALLA DE CARGA MIENTRAS VALIDA AUTH
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // ✅ PANTALLA DE ACCESO DENEGADO SI NO ES SUPER ADMIN
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <SuperAdminOnly
          userEmail={profile?.email}
          tenantName={profile?.tenant_name}
          feature="Gestión de Grupos de Menú del Sistema"
          description="Esta pantalla permite modificar la estructura fundamental del sistema y solo puede ser accedida por el Super Admin."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-primary mb-2">Grupos de Menú del Sistema</h1>
        <p className="text-muted-foreground">
          Gestiona los grupos de menú que organizan las pantallas del sistema. 
          Los cambios aquí se reflejan en el menú lateral de todos los usuarios.
        </p>
      </div>

      {/* 🔧 Herramienta de Diagnóstico */}
      <DiagnosticTool />

      {/* Actions Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por nombre técnico o etiqueta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Grupo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm text-blue-900">
                <strong>Base para Multiidioma:</strong> Actualmente trabajamos en español, pero la estructura está lista para agregar traducciones en otros idiomas.
              </p>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                <li><strong>Nombre Técnico:</strong> Identificador interno del grupo (ej: MANTENIMIENTO)</li>
                <li><strong>Etiqueta Visible:</strong> Lo que ve el usuario en el menú (ej: Mantenimiento)</li>
                <li><strong>Orden:</strong> Posición en el menú (menor número = más arriba)</li>
                <li><strong>Icono:</strong> Nombre del icono de lucide-react (ej: Settings, Users, Building)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5" />
            Grupos de Menú ({filteredGroups.length})
          </CardTitle>
          <CardDescription>
            Listado de todos los grupos que organizan el menú del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Cargando grupos de menú...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <LayoutGrid className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No se encontraron grupos de menú</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>Nombre Técnico</TableHead>
                    <TableHead>Etiqueta Visible (ES)</TableHead>
                    <TableHead>Icono</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {group.display_order}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {group.name}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">
                        {group.display_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DynamicIcon name={group.icon_name} className="w-5 h-5 text-primary" />
                          <code className="text-xs text-muted-foreground">
                            {group.icon_name}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell>
                        {group.is_active ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Inactivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(group)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteDialog({ open: true, item: group })}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, item: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editDialog.item ? 'Editar Grupo de Menú' : 'Nuevo Grupo de Menú'}
            </DialogTitle>
            <DialogDescription>
              {editDialog.item 
                ? 'Modifica la información del grupo de menú. Los cambios se reflejarán en el menú de todos los usuarios.'
                : 'Crea un nuevo grupo para organizar las pantallas del sistema.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nombre Técnico <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="MANTENIMIENTO"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                  className="font-mono"
                  disabled={editDialog.item !== null}
                />
                <p className="text-xs text-muted-foreground">
                  {editDialog.item 
                    ? '🔒 No se puede modificar en grupos existentes'
                    : 'Identificador interno en mayúsculas'
                  }
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_name">
                  Etiqueta Visible (Español) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="display_name"
                  placeholder="Mantenimiento"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Lo que verá el usuario en el menú
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display_order">Orden de Visualización</Label>
                <Input
                  id="display_order"
                  type="number"
                  min="1"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 999 })}
                  disabled={editDialog.item !== null}
                />
                <p className="text-xs text-muted-foreground">
                  {editDialog.item 
                    ? '🔒 No se puede modificar en grupos existentes'
                    : 'Menor número = más arriba en el menú'
                  }
                </p>
              </div>

              <div className="space-y-2">
                <IconPicker
                  value={formData.icon_name}
                  onChange={(value) => setFormData({ ...formData, icon_name: value })}
                  label="Icono (lucide-react)"
                  description="Selecciona un ícono de la lista"
                />
              </div>
            </div>

            <div className={`flex items-center justify-between p-4 border rounded-lg ${editDialog.item !== null ? 'bg-muted/30' : ''}`}>
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Estado del Grupo</Label>
                <p className="text-sm text-muted-foreground">
                  {editDialog.item 
                    ? '🔒 No se puede modificar en grupos existentes'
                    : 'Los grupos inactivos no se muestran en el menú'
                  }
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                disabled={editDialog.item !== null}
              />
            </div>

            {editDialog.item ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <p className="text-sm text-amber-900">
                  <strong>🔒 Restricción de Edición:</strong>
                </p>
                <p className="text-sm text-amber-800">
                  Por seguridad del sistema, solo puedes modificar la <strong>Etiqueta Visible</strong> y el <strong>Icono</strong>. 
                  El nombre técnico, orden y estado están bloqueados para mantener la integridad del sistema.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <p className="text-sm text-blue-900">
                  <strong>💡 Preparado para Multiidioma:</strong>
                </p>
                <p className="text-sm text-blue-800">
                  Cuando agregues soporte para inglés u otros idiomas, solo necesitarás insertar 
                  registros adicionales en <code className="bg-blue-100 px-1 rounded">system_menu_group_translations</code> 
                  con el mismo <code className="bg-blue-100 px-1 rounded">menu_group_id</code> pero 
                  diferente <code className="bg-blue-100 px-1 rounded">language_code</code>.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, item: null })}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90"
              disabled={!formData.name || !formData.display_name}
            >
              <Save className="w-4 h-4 mr-2" />
              {editDialog.item ? 'Guardar Cambios' : 'Crear Grupo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, item: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar grupo de menú?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar el grupo <strong>"{deleteDialog.item?.display_name}"</strong>.
              <br /><br />
              Esta acción solo es posible si el grupo no tiene pantallas asociadas.
              Si tiene pantallas, primero deberás reasignarlas a otro grupo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}