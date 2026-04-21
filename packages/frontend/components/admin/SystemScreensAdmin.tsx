/**
 * SystemScreensAdmin.tsx - Turnos Titanium Enterprise
 * Administración de Pantallas del Sistema y sus Traducciones
 * 
 * REGLAS CRÍTICAS:
 * - ❌ NO se pueden ELIMINAR pantallas (integridad arquitectónica)
 * - ✅ Solo edita etiquetas, nombres y traducciones
 * - ✅ NO modifica estructura técnica (keys, rutas, módulos)
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
import { Search, Monitor, Edit, Save, X, Lock, Globe, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClient } from '../../lib/api-client';
import { useAuth } from '../../contexts/AuthContext';

interface SystemLanguage {
  code: string;
  language_name: string;
  is_active: boolean;
  is_default: boolean;
}

interface ScreenTranslation {
  id?: string;
  language_code: string;
  screen_name: string;
  menu_label?: string;
  language_name?: string;
}

interface Screen {
  id: string;
  screen_key: string;
  screen_name: string;
  menu_label: string | null;
  route_path: string | null;
  icon_key: string | null;
  sort_order: number;
  is_active: boolean;
  menu_group_name?: string;
  translations: ScreenTranslation[];
}

export default function SystemScreensAdmin() {
  const { profile } = useAuth();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [languages, setLanguages] = useState<SystemLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialog, setEditDialog] = useState<{ open: boolean; item: Screen | null }>({ 
    open: false, 
    item: null 
  });
  const [translations, setTranslations] = useState<ScreenTranslation[]>([]);
  const [saving, setSaving] = useState(false);

  // ✅ Verificar si el usuario es Super Admin
  const isSuperAdmin = profile?.is_super_admin === true || profile?.role_scope === 'SYSTEM';
  
  console.log('[SYSTEM-SCREENS] Validación Super Admin:', {
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
      loadScreens()
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

  const loadScreens = async () => {
    try {
      console.log('🖥️ Cargando pantallas del sistema...');
      
      const { data, error } = await ApiClient
        .from('screens')
        .select(`
          id,
          screen_key,
          screen_name,
          menu_label,
          route_path,
          icon_key,
          sort_order,
          is_active,
          menu_group_id,
          system_menu_groups!screens_menu_group_id_fkey (
            menu_group_name
          ),
          screen_translations (
            id,
            language_code,
            screen_name,
            menu_label
          )
        `)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Procesar datos
      const processed = data?.map((screen: any) => ({
        id: screen.id,
        screen_key: screen.screen_key,
        screen_name: screen.screen_name,
        menu_label: screen.menu_label,
        route_path: screen.route_path,
        icon_key: screen.icon_key,
        sort_order: screen.sort_order,
        is_active: screen.is_active,
        menu_group_name: screen.system_menu_groups?.menu_group_name || 'Sin grupo',
        translations: screen.screen_translations || []
      })) || [];

      console.log(`✅ ${processed.length} pantallas cargadas`);
      setScreens(processed);
    } catch (error: any) {
      console.error('❌ Error cargando pantallas:', error);
      toast.error('Error cargando pantallas del sistema');
    }
  };

  const handleEditTranslations = (screen: Screen) => {
    console.log('✏️ Editando traducciones de:', screen.screen_key);
    
    // Inicializar traducciones con los idiomas disponibles
    const initialTranslations: ScreenTranslation[] = languages.map(lang => {
      const existing = screen.translations.find(t => t.language_code === lang.code);
      return {
        id: existing?.id,
        language_code: lang.code,
        screen_name: existing?.screen_name || screen.screen_name,
        menu_label: existing?.menu_label || screen.menu_label || '',
        language_name: lang.language_name
      };
    });

    setTranslations(initialTranslations);
    setEditDialog({ open: true, item: screen });
  };

  const handleTranslationChange = (languageCode: string, field: 'screen_name' | 'menu_label', value: string) => {
    setTranslations(prev => prev.map(t => 
      t.language_code === languageCode 
        ? { ...t, [field]: value }
        : t
    ));
  };

  const handleSaveTranslations = async () => {
    if (!editDialog.item) return;

    setSaving(true);
    
    try {
      console.log('💾 Guardando traducciones de pantalla...');

      // Preparar datos para insertar/actualizar
      const translationsToSave = translations.map(t => ({
        screen_id: editDialog.item!.id,
        language_code: t.language_code,
        screen_name: t.screen_name.trim(),
        menu_label: t.menu_label?.trim() || null
      }));

      console.log('📤 Traducciones a guardar:', translationsToSave);

      // Guardar traducciones (upsert)
      const { error } = await ApiClient
        .from('screen_translations')
        .upsert(translationsToSave, {
          onConflict: 'screen_id,language_code'
        });

      if (error) throw error;

      console.log('✅ Traducciones guardadas exitosamente');
      toast.success('Traducciones actualizadas correctamente');
      
      setEditDialog({ open: false, item: null });
      loadScreens();
    } catch (error: any) {
      console.error('❌ Error guardando traducciones:', error);
      toast.error('Error al guardar las traducciones');
    } finally {
      setSaving(false);
    }
  };

  // Filtrado
  const filteredScreens = screens.filter(screen =>
    screen.screen_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    screen.screen_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    screen.menu_label?.toLowerCase().includes(searchTerm.toLowerCase())
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
            Solo los Super Administradores pueden gestionar las pantallas del sistema.
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
          <p className="text-gray-600">Cargando pantallas...</p>
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
                Las pantallas del sistema <strong>NO se pueden eliminar</strong> para mantener la integridad arquitectónica.
                Solo puedes <strong>editar traducciones</strong> y etiquetas de presentación.
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
                <Monitor className="size-6 text-[#0074D9]" />
                Pantallas del Sistema
              </CardTitle>
              <CardDescription className="mt-2">
                Gestiona las traducciones de las pantallas en diferentes idiomas.
                Los datos técnicos (keys, rutas, módulos) están protegidos.
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
                placeholder="Buscar por nombre, key o etiqueta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline" className="text-sm">
              {filteredScreens.length} pantallas
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
                      Key Técnico
                    </div>
                  </TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Grupo de Menú</TableHead>
                  <TableHead>Traducciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScreens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No se encontraron pantallas
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredScreens.map(screen => (
                    <TableRow key={screen.id}>
                      <TableCell className="font-mono text-sm text-gray-600">
                        {screen.sort_order}
                      </TableCell>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {screen.screen_key}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{screen.screen_name}</div>
                          {screen.menu_label && (
                            <div className="text-sm text-gray-500">{screen.menu_label}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {screen.menu_group_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {screen.translations.length} / {languages.length}
                          </Badge>
                          {screen.translations.length === languages.length && (
                            <CheckCircle2 className="size-4 text-green-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={screen.is_active ? "default" : "secondary"}>
                          {screen.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTranslations(screen)}
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
              <Monitor className="size-5 text-[#0074D9]" />
              Traducciones: {editDialog.item?.screen_name}
            </DialogTitle>
            <DialogDescription>
              Edita las traducciones de la pantalla en los diferentes idiomas disponibles.
              El key técnico <code className="bg-gray-100 px-1 rounded">{editDialog.item?.screen_key}</code> no se puede modificar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Info de la Pantalla */}
            <div className="bg-gray-50 border rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-600">Key Técnico</Label>
                  <div className="font-mono text-sm mt-1 flex items-center gap-2">
                    <Lock className="size-3 text-gray-400" />
                    {editDialog.item?.screen_key}
                  </div>
                </div>
                <div>
                  <Label className="text-gray-600">Ruta</Label>
                  <div className="font-mono text-sm mt-1 flex items-center gap-2">
                    <Lock className="size-3 text-gray-400" />
                    {editDialog.item?.route_path || 'N/A'}
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
                        <Label className="text-sm">Nombre de la Pantalla</Label>
                        <Input
                          value={translation.screen_name}
                          onChange={(e) => handleTranslationChange(translation.language_code, 'screen_name', e.target.value)}
                          placeholder={`Nombre en ${translation.language_name}...`}
                          className="font-medium mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Etiqueta de Menú (opcional)</Label>
                        <Input
                          value={translation.menu_label || ''}
                          onChange={(e) => handleTranslationChange(translation.language_code, 'menu_label', e.target.value)}
                          placeholder={`Etiqueta de menú en ${translation.language_name}...`}
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