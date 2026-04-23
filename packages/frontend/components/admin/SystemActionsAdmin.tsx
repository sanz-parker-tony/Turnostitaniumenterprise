/**
 * SystemActionsAdmin.tsx - Turnos Titanium Enterprise
 * Administración de Acciones del Sistema y sus Traducciones
 * 
 * REGLAS CRÍTICAS:
 * - ❌ NO se pueden ELIMINAR acciones (integridad arquitectónica)
 * - ✅ Solo edita nombres y traducciones
 * - ✅ NO modifica estructura técnica (action_key)
 * - ✅ Multiidioma desde system_languages
 * - Solo Super Admin (is_super_admin = true)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Search, Zap, Edit, Save, X, Lock, Globe, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClient } from '../../lib/api-client';
import { useAuth } from '../../contexts/AuthContext';

interface SystemLanguage {
  code: string;
  language_name: string;
  is_active: boolean;
  is_default: boolean;
}

interface ActionTranslation {
  id?: string;
  language_code: string;
  action_name: string;
  language_name?: string;
}

interface Action {
  id: string;
  action_key: string;
  action_name: string;
  is_active: boolean;
  created_at: string;
  translations: ActionTranslation[];
}

export default function SystemActionsAdmin() {
  const { profile } = useAuth();
  const [actions, setActions] = useState<Action[]>([]);
  const [languages, setLanguages] = useState<SystemLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialog, setEditDialog] = useState<{ open: boolean; item: Action | null }>({ 
    open: false, 
    item: null 
  });
  const [translations, setTranslations] = useState<ActionTranslation[]>([]);
  const [saving, setSaving] = useState(false);

  // ✅ Verificar si el usuario es Super Admin
  const isSuperAdmin = profile?.is_super_admin === true || profile?.role_scope === 'SYSTEM';
  
  console.log('[SYSTEM-ACTIONS] Validación Super Admin:', {
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
      loadActions()
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

  const loadActions = async () => {
    try {
      console.log('⚡ Cargando acciones del sistema...');
      
      const { data, error } = await ApiClient
        .from('actions')
        .select(`
          id,
          action_key,
          action_name,
          is_active,
          created_at,
          action_translations (
            id,
            language_code,
            action_name
          )
        `)
        .order('action_key', { ascending: true });

      if (error) throw error;

      // Procesar datos
      const processed = data?.map((action: any) => ({
        id: action.id,
        action_key: action.action_key,
        action_name: action.action_name,
        is_active: action.is_active,
        created_at: action.created_at,
        translations: action.action_translations || []
      })) || [];

      console.log(`✅ ${processed.length} acciones cargadas`);
      setActions(processed);
    } catch (error: any) {
      console.error('❌ Error cargando acciones:', error);
      toast.error('Error cargando acciones del sistema');
    }
  };

  const handleEditTranslations = (action: Action) => {
    console.log('✏️ Editando traducciones de:', action.action_key);
    
    // Inicializar traducciones con los idiomas disponibles
    const initialTranslations: ActionTranslation[] = languages.map(lang => {
      const existing = action.translations.find(t => t.language_code === lang.code);
      return {
        id: existing?.id,
        language_code: lang.code,
        action_name: existing?.action_name || action.action_name,
        language_name: lang.language_name
      };
    });

    setTranslations(initialTranslations);
    setEditDialog({ open: true, item: action });
  };

  const handleTranslationChange = (languageCode: string, value: string) => {
    setTranslations(prev => prev.map(t => 
      t.language_code === languageCode 
        ? { ...t, action_name: value }
        : t
    ));
  };

  const handleSaveTranslations = async () => {
    if (!editDialog.item) return;

    setSaving(true);
    
    try {
      console.log('💾 Guardando traducciones de acción...');

      // Preparar datos para insertar/actualizar
      const translationsToSave = translations.map(t => ({
        action_id: editDialog.item!.id,
        language_code: t.language_code,
        action_name: t.action_name.trim()
      }));

      console.log('📤 Traducciones a guardar:', translationsToSave);

      // Guardar traducciones (upsert)
      const { error } = await ApiClient
        .from('action_translations')
        .upsert(translationsToSave, {
          onConflict: 'action_id,language_code'
        });

      if (error) throw error;

      console.log('✅ Traducciones guardadas exitosamente');
      toast.success('Traducciones actualizadas correctamente');
      
      setEditDialog({ open: false, item: null });
      loadActions();
    } catch (error: any) {
      console.error('❌ Error guardando traducciones:', error);
      toast.error('Error al guardar las traducciones');
    } finally {
      setSaving(false);
    }
  };

  // Filtrado
  const filteredActions = actions.filter(action =>
    action.action_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    action.action_name.toLowerCase().includes(searchTerm.toLowerCase())
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
            Solo los Super Administradores pueden gestionar las acciones del sistema.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block size-8 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Cargando acciones...</p>
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
                Las acciones del sistema <strong>NO se pueden eliminar</strong> para mantener la integridad arquitectónica.
                Solo puedes <strong>editar traducciones</strong> y nombres de presentación.
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
                <Zap className="size-6 text-[#0074D9]" />
                Acciones del Sistema
              </CardTitle>
              <CardDescription className="mt-2">
                Gestiona las traducciones de las acciones en diferentes idiomas.
                Los datos técnicos (action_key) están protegidos.
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
                placeholder="Buscar por nombre o key..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline" className="text-sm">
              {filteredActions.length} acciones
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
                      Action Key
                    </div>
                  </TableHead>
                  <TableHead>Nombre de la Acción</TableHead>
                  <TableHead>Traducciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No se encontraron acciones
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredActions.map(action => (
                    <TableRow key={action.id}>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {action.action_key}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">
                        {action.action_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {action.translations.length} / {languages.length}
                          </Badge>
                          {action.translations.length === languages.length && (
                            <CheckCircle2 className="size-4 text-green-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={action.is_active ? "default" : "secondary"}>
                          {action.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(action.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTranslations(action)}
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
              <Zap className="size-5 text-[#0074D9]" />
              Traducciones: {editDialog.item?.action_name}
            </DialogTitle>
            <DialogDescription>
              Edita las traducciones de la acción en los diferentes idiomas disponibles.
              El action key <code className="bg-gray-100 px-1 rounded">{editDialog.item?.action_key}</code> no se puede modificar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Info de la Acción */}
            <div className="bg-gray-50 border rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-600">Action Key</Label>
                  <div className="font-mono text-sm mt-1 flex items-center gap-2">
                    <Lock className="size-3 text-gray-400" />
                    {editDialog.item?.action_key}
                  </div>
                </div>
                <div>
                  <Label className="text-gray-600">Estado</Label>
                  <div className="text-sm mt-1">
                    <Badge variant={editDialog.item?.is_active ? "default" : "secondary"}>
                      {editDialog.item?.is_active ? 'Activo' : 'Inactivo'}
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
                    <div>
                      <Label className="text-sm">Nombre de la Acción</Label>
                      <Input
                        value={translation.action_name}
                        onChange={(e) => handleTranslationChange(translation.language_code, e.target.value)}
                        placeholder={`Nombre en ${translation.language_name}...`}
                        className="font-medium mt-1"
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