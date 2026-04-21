import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Copy, GitBranch, AlertTriangle, CheckCircle2, ArrowRight, Shield, FileText, Eye, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '../ui/alert';

interface Role {
  id: string;
  role_key: string;
  role_name: string;
  scope: 'TENANT' | 'COMPANY';
  description?: string;
  permissions_count: number;
}

interface CopyOptions {
  screenActions: boolean;
  reports: boolean;
  scopes: boolean;
}

interface CopyResult {
  success: boolean;
  newRoleId?: string;
  newRoleKey?: string;
  newRoleName?: string;
  sourceRoleId: string;
  targetRoleId?: string;
  strategy?: 'MERGE' | 'OVERWRITE';
  counts: {
    screenActions: number;
    reports: number;
    scopes: number;
  };
  auditId: string;
}

// Mock data - en producción vendrá de ApiClient
const mockRoles: Role[] = [
  { id: 'rol-1', role_key: 'ADMIN_FULL', role_name: 'Administrador Total', scope: 'TENANT', description: 'Acceso completo al sistema', permissions_count: 150 },
  { id: 'rol-2', role_key: 'SUPERVISOR', role_name: 'Supervisor de Operaciones', scope: 'COMPANY', description: 'Supervisión de empleados y turnos', permissions_count: 45 },
  { id: 'rol-3', role_key: 'PAYROLL_MANAGER', role_name: 'Gestor de Nómina', scope: 'COMPANY', description: 'Gestión de procesos de nómina', permissions_count: 32 },
  { id: 'rol-4', role_key: 'HR_ANALYST', role_name: 'Analista RRHH', scope: 'COMPANY', description: 'Análisis de recursos humanos', permissions_count: 28 },
  { id: 'rol-5', role_key: 'SECURITY_ADMIN', role_name: 'Administrador de Seguridad', scope: 'TENANT', description: 'Gestión de roles y permisos', permissions_count: 65 },
];

export default function CopiarPermisos() {
  const [activeMode, setActiveMode] = useState<'clone' | 'copy'>('clone');
  
  // MODO CLONAR
  const [sourceRoleClone, setSourceRoleClone] = useState<string>('');
  const [newRoleKey, setNewRoleKey] = useState<string>('');
  const [newRoleName, setNewRoleName] = useState<string>('');
  const [newRoleDescription, setNewRoleDescription] = useState<string>('');
  
  // MODO COPIAR
  const [sourceRoleCopy, setSourceRoleCopy] = useState<string>('');
  const [targetRole, setTargetRole] = useState<string>('');
  const [strategy, setStrategy] = useState<'MERGE' | 'OVERWRITE'>('MERGE');
  const [copyOptions, setCopyOptions] = useState<CopyOptions>({
    screenActions: true,
    reports: true,
    scopes: true,
  });
  
  // UI State
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [result, setResult] = useState<CopyResult | null>(null);

  // Handlers
  const handleSourceRoleCloneChange = (roleId: string) => {
    setSourceRoleClone(roleId);
    const role = mockRoles.find(r => r.id === roleId);
    if (role) {
      // Pre-poblar con sugerencias
      setNewRoleKey(`${role.role_key}_COPY`);
      setNewRoleName(`${role.role_name} (Copia)`);
      setNewRoleDescription(`Copia de ${role.role_name}`);
    }
  };

  const validateCloneForm = (): boolean => {
    if (!sourceRoleClone) {
      toast.error('Debes seleccionar un rol origen');
      return false;
    }
    if (!newRoleKey.trim()) {
      toast.error('Debes ingresar una clave para el nuevo rol');
      return false;
    }
    if (!newRoleName.trim()) {
      toast.error('Debes ingresar un nombre para el nuevo rol');
      return false;
    }
    // Validar que la clave no exista
    if (mockRoles.some(r => r.role_key === newRoleKey)) {
      toast.error('Ya existe un rol con esa clave');
      return false;
    }
    return true;
  };

  const validateCopyForm = (): boolean => {
    if (!sourceRoleCopy) {
      toast.error('Debes seleccionar un rol origen');
      return false;
    }
    if (!targetRole) {
      toast.error('Debes seleccionar un rol destino');
      return false;
    }
    if (sourceRoleCopy === targetRole) {
      toast.error('El rol origen y destino no pueden ser el mismo');
      return false;
    }
    if (!copyOptions.screenActions && !copyOptions.reports && !copyOptions.scopes) {
      toast.error('Debes seleccionar al menos un componente para copiar');
      return false;
    }
    return true;
  };

  const executeCloneRole = async () => {
    setIsProcessing(true);
    
    try {
      // Simular operación asíncrona
      await new Promise(resolve => setTimeout(resolve, 1500));

      // En producción, esto sería:
      // const { data, error } = await ApiClient.rpc('clone_role', {
      //   p_tenant_id: tenantId,
      //   p_source_role_id: sourceRoleClone,
      //   p_new_role_key: newRoleKey,
      //   p_new_role_name: newRoleName,
      //   p_new_role_description: newRoleDescription,
      //   p_created_by: userId
      // });

      const sourceRole = mockRoles.find(r => r.id === sourceRoleClone)!;
      
      const mockResult: CopyResult = {
        success: true,
        newRoleId: `rol-${Date.now()}`,
        newRoleKey: newRoleKey,
        newRoleName: newRoleName,
        sourceRoleId: sourceRoleClone,
        counts: {
          screenActions: Math.floor(sourceRole.permissions_count * 0.7),
          reports: Math.floor(sourceRole.permissions_count * 0.2),
          scopes: Math.floor(sourceRole.permissions_count * 0.1),
        },
        auditId: `audit-${Date.now()}`
      };

      setResult(mockResult);
      setShowConfirmDialog(false);
      setShowResultDialog(true);

      toast.success(
        `Rol "${newRoleName}" clonado exitosamente`,
        {
          description: `${mockResult.counts.screenActions} acciones, ${mockResult.counts.reports} reportes copiados`,
          duration: 5000
        }
      );

      // Resetear form
      setSourceRoleClone('');
      setNewRoleKey('');
      setNewRoleName('');
      setNewRoleDescription('');

    } catch (error) {
      console.error('Error clonando rol:', error);
      toast.error('Error al clonar rol', {
        description: 'La operación fue revertida. Intenta nuevamente.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const executeCopyPermissions = async () => {
    setIsProcessing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      // En producción:
      // const { data, error } = await ApiClient.rpc('copy_role_permissions', {
      //   p_tenant_id: tenantId,
      //   p_source_role_id: sourceRoleCopy,
      //   p_target_role_id: targetRole,
      //   p_strategy: strategy,
      //   p_copy_screen_actions: copyOptions.screenActions,
      //   p_copy_reports: copyOptions.reports,
      //   p_copy_scopes: copyOptions.scopes,
      //   p_updated_by: userId
      // });

      const sourceRole = mockRoles.find(r => r.id === sourceRoleCopy)!;
      
      const mockResult: CopyResult = {
        success: true,
        sourceRoleId: sourceRoleCopy,
        targetRoleId: targetRole,
        strategy: strategy,
        counts: {
          screenActions: copyOptions.screenActions ? Math.floor(sourceRole.permissions_count * 0.7) : 0,
          reports: copyOptions.reports ? Math.floor(sourceRole.permissions_count * 0.2) : 0,
          scopes: copyOptions.scopes ? Math.floor(sourceRole.permissions_count * 0.1) : 0,
        },
        auditId: `audit-${Date.now()}`
      };

      setResult(mockResult);
      setShowConfirmDialog(false);
      setShowResultDialog(true);

      const targetRoleName = mockRoles.find(r => r.id === targetRole)?.role_name;
      toast.success(
        `Permisos copiados a "${targetRoleName}"`,
        {
          description: `Estrategia: ${strategy}. Total: ${Object.values(mockResult.counts).reduce((a, b) => a + b, 0)} registros`,
          duration: 5000
        }
      );

      // Resetear form
      setSourceRoleCopy('');
      setTargetRole('');
      setStrategy('MERGE');

    } catch (error) {
      console.error('Error copiando permisos:', error);
      toast.error('Error al copiar permisos', {
        description: 'La operación fue revertida. Intenta nuevamente.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = () => {
    if (activeMode === 'clone') {
      if (validateCloneForm()) {
        setShowConfirmDialog(true);
      }
    } else {
      if (validateCopyForm()) {
        setShowConfirmDialog(true);
      }
    }
  };

  const handleOpenRoleEditor = () => {
    // En producción: navegar a la pantalla de edición del rol
    toast.info('Abriendo editor de rol...', {
      description: `Editando: ${result?.newRoleName}`
    });
    setShowResultDialog(false);
  };

  const getSourceRole = () => {
    const roleId = activeMode === 'clone' ? sourceRoleClone : sourceRoleCopy;
    return mockRoles.find(r => r.id === roleId);
  };

  const getTargetRoleInfo = () => {
    return mockRoles.find(r => r.id === targetRole);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl text-foreground mb-2">Copiar Permisos</h2>
        <p className="text-sm text-muted-foreground">
          Clona roles completos o copia permisos entre roles existentes
        </p>
      </div>

      {/* Main Card */}
      <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as 'clone' | 'copy')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="clone" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Clonar Rol
          </TabsTrigger>
          <TabsTrigger value="copy" className="flex items-center gap-2">
            <Copy className="w-4 h-4" />
            Copiar Permisos
          </TabsTrigger>
        </TabsList>

        {/* MODO 1: CLONAR ROL */}
        <TabsContent value="clone" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-primary" />
                Clonar Rol Completo
              </CardTitle>
              <CardDescription>
                Crea un nuevo rol copiando todos los permisos de un rol existente. No se copian los usuarios asignados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Seleccionar Rol Origen */}
              <div className="space-y-2">
                <Label htmlFor="source-role-clone">Rol Origen *</Label>
                <Select value={sourceRoleClone} onValueChange={handleSourceRoleCloneChange}>
                  <SelectTrigger id="source-role-clone">
                    <SelectValue placeholder="Selecciona el rol a clonar" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{role.role_name}</span>
                          <Badge variant="outline" className="ml-2">
                            {role.permissions_count} permisos
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sourceRoleClone && (
                  <p className="text-xs text-muted-foreground">
                    {mockRoles.find(r => r.id === sourceRoleClone)?.description}
                  </p>
                )}
              </div>

              {sourceRoleClone && (
                <>
                  <div className="h-px bg-border" />

                  {/* Información del Nuevo Rol */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-foreground">Información del Nuevo Rol</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-role-key">Clave del Rol *</Label>
                        <Input
                          id="new-role-key"
                          value={newRoleKey}
                          onChange={(e) => setNewRoleKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                          placeholder="NUEVO_ROL"
                          maxLength={50}
                        />
                        <p className="text-xs text-muted-foreground">
                          Solo letras mayúsculas, números y guiones bajos
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-role-name">Nombre del Rol *</Label>
                        <Input
                          id="new-role-name"
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value)}
                          placeholder="Nombre descriptivo"
                          maxLength={100}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-role-description">Descripción</Label>
                      <Input
                        id="new-role-description"
                        value={newRoleDescription}
                        onChange={(e) => setNewRoleDescription(e.target.value)}
                        placeholder="Descripción opcional del rol"
                        maxLength={500}
                      />
                    </div>
                  </div>

                  {/* Preview de lo que se copiará */}
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Se copiarán los siguientes elementos:</AlertTitle>
                    <AlertDescription>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Acciones de pantalla (role_screen_actions)
                        </li>
                        <li className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Permisos de reportes (report_permissions)
                        </li>
                        <li className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          Alcances y políticas (scopes/policies)
                        </li>
                      </ul>
                      <p className="mt-3 text-xs text-muted-foreground">
                        ⚠️ Los usuarios NO se copiarán. Deberás asignarlos manualmente.
                      </p>
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {sourceRoleClone && (
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSourceRoleClone('');
                  setNewRoleKey('');
                  setNewRoleName('');
                  setNewRoleDescription('');
                }}
              >
                Limpiar
              </Button>
              <Button onClick={handleSubmit} className="gap-2">
                <GitBranch className="w-4 h-4" />
                Clonar Rol
              </Button>
            </div>
          )}
        </TabsContent>

        {/* MODO 2: COPIAR PERMISOS */}
        <TabsContent value="copy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-primary" />
                Copiar Permisos Entre Roles
              </CardTitle>
              <CardDescription>
                Copia permisos seleccionados desde un rol origen hacia un rol destino existente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selección de Roles */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="source-role-copy">Rol Origen *</Label>
                  <Select value={sourceRoleCopy} onValueChange={setSourceRoleCopy}>
                    <SelectTrigger id="source-role-copy">
                      <SelectValue placeholder="Selecciona rol origen" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockRoles.filter(r => r.id !== targetRole).map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.role_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-role">Rol Destino *</Label>
                  <Select value={targetRole} onValueChange={setTargetRole}>
                    <SelectTrigger id="target-role">
                      <SelectValue placeholder="Selecciona rol destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockRoles.filter(r => r.id !== sourceRoleCopy).map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.role_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {sourceRoleCopy && targetRole && (
                <>
                  <div className="h-px bg-border" />

                  {/* Estrategia */}
                  <div className="space-y-3">
                    <Label>Estrategia de Copia *</Label>
                    <div className="space-y-3">
                      <div
                        onClick={() => setStrategy('MERGE')}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          strategy === 'MERGE'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                            strategy === 'MERGE' ? 'border-primary' : 'border-muted-foreground'
                          }`}>
                            {strategy === 'MERGE' && (
                              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">MERGE (Combinar)</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Agrega los permisos nuevos sin eliminar los existentes en el rol destino.
                              <span className="text-secondary font-medium"> Recomendado</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div
                        onClick={() => setStrategy('OVERWRITE')}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          strategy === 'OVERWRITE'
                            ? 'border-destructive bg-destructive/5'
                            : 'border-border hover:border-destructive/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                            strategy === 'OVERWRITE' ? 'border-destructive' : 'border-muted-foreground'
                          }`}>
                            {strategy === 'OVERWRITE' && (
                              <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">OVERWRITE (Sobrescribir)</p>
                              <AlertTriangle className="w-4 h-4 text-destructive" />
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              <span className="text-destructive font-medium">⚠️ PELIGRO:</span> Elimina TODOS los permisos existentes en el rol destino y los reemplaza con los del origen.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Componentes a Copiar */}
                  <div className="space-y-3">
                    <Label>Componentes a Copiar *</Label>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                        <Checkbox
                          id="copy-screen-actions"
                          checked={copyOptions.screenActions}
                          onCheckedChange={(checked) =>
                            setCopyOptions({ ...copyOptions, screenActions: checked as boolean })
                          }
                        />
                        <div className="flex-1">
                          <label htmlFor="copy-screen-actions" className="text-sm font-medium cursor-pointer">
                            Acciones de Pantallas
                          </label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Copiar role_screen_actions (permisos CRUD por pantalla)
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {getSourceRole()?.permissions_count ? Math.floor(getSourceRole()!.permissions_count * 0.7) : 0}
                        </Badge>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                        <Checkbox
                          id="copy-reports"
                          checked={copyOptions.reports}
                          onCheckedChange={(checked) =>
                            setCopyOptions({ ...copyOptions, reports: checked as boolean })
                          }
                        />
                        <div className="flex-1">
                          <label htmlFor="copy-reports" className="text-sm font-medium cursor-pointer">
                            Permisos de Reportes
                          </label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Copiar report_permissions (acceso a reportería)
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {getSourceRole()?.permissions_count ? Math.floor(getSourceRole()!.permissions_count * 0.2) : 0}
                        </Badge>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                        <Checkbox
                          id="copy-scopes"
                          checked={copyOptions.scopes}
                          onCheckedChange={(checked) =>
                            setCopyOptions({ ...copyOptions, scopes: checked as boolean })
                          }
                        />
                        <div className="flex-1">
                          <label htmlFor="copy-scopes" className="text-sm font-medium cursor-pointer">
                            Alcances y Políticas
                          </label>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Copiar scopes y políticas de seguridad
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {getSourceRole()?.permissions_count ? Math.floor(getSourceRole()!.permissions_count * 0.1) : 0}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Warning OVERWRITE */}
                  {strategy === 'OVERWRITE' && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>⚠️ ADVERTENCIA CRÍTICA</AlertTitle>
                      <AlertDescription>
                        <p className="font-medium">
                          Esta operación es IRREVERSIBLE y eliminará todos los permisos actuales del rol "{getTargetRoleInfo()?.role_name}".
                        </p>
                        <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
                          <li>Se perderán {getTargetRoleInfo()?.permissions_count || 0} permisos existentes</li>
                          <li>Los usuarios con este rol verán cambios inmediatos</li>
                          <li>Esta acción queda registrada en auditoría</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {sourceRoleCopy && targetRole && (
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSourceRoleCopy('');
                  setTargetRole('');
                  setStrategy('MERGE');
                  setCopyOptions({ screenActions: true, reports: true, scopes: true });
                }}
              >
                Limpiar
              </Button>
              <Button
                onClick={handleSubmit}
                className="gap-2"
                variant={strategy === 'OVERWRITE' ? 'destructive' : 'default'}
              >
                <Copy className="w-4 h-4" />
                {strategy === 'OVERWRITE' ? 'Sobrescribir Permisos' : 'Copiar Permisos'}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeMode === 'clone' ? (
                <GitBranch className="w-5 h-5" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
              Confirmar {activeMode === 'clone' ? 'Clonación' : 'Copia'} de Permisos
            </DialogTitle>
            <DialogDescription>
              {activeMode === 'clone' ? (
                <div className="space-y-3 pt-4">
                  <p>Estás por clonar el rol:</p>
                  <div className="bg-muted p-3 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Origen:</span>
                      <span className="font-medium">{getSourceRole()?.role_name}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 mx-auto text-muted-foreground" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Nuevo Rol:</span>
                      <span className="font-medium">{newRoleName}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Clave:</span>
                      <code className="bg-background px-2 py-0.5 rounded">{newRoleKey}</code>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Esta operación copiará todos los permisos pero NO los usuarios asignados.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-4">
                  <p>Estás por copiar permisos:</p>
                  <div className="bg-muted p-3 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Desde:</span>
                      <span className="font-medium">{getSourceRole()?.role_name}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 mx-auto text-muted-foreground" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Hacia:</span>
                      <span className="font-medium">{getTargetRoleInfo()?.role_name}</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Estrategia:</span>
                      <Badge variant={strategy === 'OVERWRITE' ? 'destructive' : 'secondary'}>
                        {strategy}
                      </Badge>
                    </div>
                  </div>
                  {strategy === 'OVERWRITE' && (
                    <Alert variant="destructive" className="mt-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        ⚠️ Esto ELIMINARÁ todos los permisos actuales del rol destino
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button
              onClick={activeMode === 'clone' ? executeCloneRole : executeCopyPermissions}
              disabled={isProcessing}
              variant={activeMode === 'copy' && strategy === 'OVERWRITE' ? 'destructive' : 'default'}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Procesando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Operación Completada
            </DialogTitle>
            <DialogDescription>
              {result && (
                <div className="space-y-4 pt-4">
                  {activeMode === 'clone' && (
                    <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="font-medium text-green-900 dark:text-green-100">
                        Rol "{result.newRoleName}" creado exitosamente
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Clave: <code className="bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded">{result.newRoleKey}</code>
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Resumen de Copia:</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold text-primary">{result.counts.screenActions}</p>
                        <p className="text-xs text-muted-foreground mt-1">Acciones</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold text-primary">{result.counts.reports}</p>
                        <p className="text-xs text-muted-foreground mt-1">Reportes</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold text-primary">{result.counts.scopes}</p>
                        <p className="text-xs text-muted-foreground mt-1">Scopes</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    <p>ID de Auditoría: <code className="bg-muted px-1 py-0.5 rounded">{result.auditId}</code></p>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResultDialog(false)}>
              Cerrar
            </Button>
            {activeMode === 'clone' && result?.newRoleId && (
              <Button onClick={handleOpenRoleEditor} className="gap-2">
                <Settings className="w-4 h-4" />
                Editar Nuevo Rol
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}