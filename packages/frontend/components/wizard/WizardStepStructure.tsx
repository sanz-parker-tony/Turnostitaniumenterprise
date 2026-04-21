/**
 * WizardStepStructure.tsx
 * Paso 3: Estructura Organizacional (Carga Masiva)
 */

import { useState, useEffect } from 'react';
import { Building2, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Download, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicApiToken } from '../../utils/backend/info';
import { 
  generateWorkLocationsTemplate, 
  parseWorkLocationsFile,
  generateDepartmentsTemplate,
  parseDepartmentsFile,
  generateAreasTemplate,
  parseAreasFile,
  generateCostCentersTemplate,
  parseCostCentersFile,
  generateJobTitlesTemplate,
  parseJobTitlesFile,
  generatePayrollGroupsTemplate,
  parsePayrollGroupsFile,
  generateWorkGroupsTemplate,
  parseWorkGroupsFile,
  generateEmployeeProfilesTemplate,
  parseEmployeeProfilesFile,
  downloadTemplate,
  ValidationError
} from '../../utils/excel-templates';

interface WizardStepStructureProps {
  onComplete: (data: any) => void;
  // ELIMINADO: onCompleteLater - el wizard es BLOQUEANTE
  onGoBack?: () => void;
}

type EntityType = 'workLocations' | 'departments' | 'areas' | 'costCenters' | 'positions' | 'payRoles' | 'groups' | 'employeeProfiles';

interface EntityStatus {
  uploaded: boolean;
  fileName: string;
  recordCount: number;
  errors: string[];
}

interface UploadProgress {
  isUploading: boolean;
  current: number;
  total: number;
  entityName: string;
}

export default function WizardStepStructure({ onComplete, onGoBack }: WizardStepStructureProps) {
  const [entityStatus, setEntityStatus] = useState<Record<EntityType, EntityStatus>>({
    workLocations: { uploaded: false, fileName: '', recordCount: 0, errors: [] },
    employeeProfiles: { uploaded: false, fileName: '', recordCount: 0, errors: [] },
    departments: { uploaded: false, fileName: '', recordCount: 0, errors: [] },
    areas: { uploaded: false, fileName: '', recordCount: 0, errors: [] },
    costCenters: { uploaded: false, fileName: '', recordCount: 0, errors: [] },
    positions: { uploaded: false, fileName: '', recordCount: 0, errors: [] },
    payRoles: { uploaded: false, fileName: '', recordCount: 0, errors: [] },
    groups: { uploaded: false, fileName: '', recordCount: 0, errors: [] }
  });
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    isUploading: false,
    current: 0,
    total: 0,
    entityName: ''
  });
  const [bootstrapToken, setBootstrapToken] = useState<string>('');
  const [loadingToken, setLoadingToken] = useState(true);

  // Cargar bootstrap token al montar
  useEffect(() => {
    loadBootstrapToken();
  }, []);

  const loadBootstrapToken = async () => {
    setLoadingToken(true);
    try {
      console.log('🔐 [Step3] Cargando bootstrap token...');
      
      const urlDirect = `http://localhost:3001/make-server-e19f2094/bootstrap/token-direct`;
      
      let response = await fetch(urlDirect, {
        headers: {
          'Authorization': `Bearer ${publicApiToken}`
        }
      });

      if (!response.ok) {
        console.log('⚠️ [Step3] Endpoint directo falló, intentando con módulo bootstrap...');
        const urlModule = `http://localhost:3001/make-server-e19f2094/bootstrap/token`;
        response = await fetch(urlModule, {
          headers: {
            'Authorization': `Bearer ${publicApiToken}`
          }
        });
      }

      if (!response.ok) {
        throw new Error('No se pudo obtener el bootstrap token');
      }

      const data = await response.json();
      console.log('✅ [Step3] Bootstrap token obtenido');
      setBootstrapToken(data.bootstrapToken);
    } catch (error: any) {
      console.error('❌ [Step3] Error cargando bootstrap token:', error);
      toast.error('Error de autenticación del sistema');
    } finally {
      setLoadingToken(false);
    }
  };

  const entities = [
    { 
      key: 'payRoles' as EntityType, 
      name: 'Roles de Pago', 
      required: false,
      description: 'Grupos de nómina o categorías salariales (Ejecutivos, Administrativos, Operarios, etc.)',
      hasAdvancedOptions: false
    },
    { 
      key: 'workLocations' as EntityType, 
      name: 'Ubicaciones de Trabajo', 
      required: false,
      description: 'Sucursales, plantas o sedes físicas de la empresa',
      icon: MapPin,
      hasAdvancedOptions: true
    },
    { 
      key: 'departments' as EntityType, 
      name: 'Departamentos', 
      required: true,
      description: 'Divisiones principales de la organización'
    },
    { 
      key: 'areas' as EntityType, 
      name: 'Áreas', 
      required: false,
      description: 'Subdivisiones dentro de departamentos, pueden asociarse a un Rol de Pago'
    },
    { 
      key: 'costCenters' as EntityType, 
      name: 'Centros de Costo', 
      required: false,
      description: 'Unidades de negocio para control de costos y presupuestos'
    },
    { 
      key: 'positions' as EntityType, 
      name: 'Cargos', 
      required: true,
      description: 'Posiciones o puestos de trabajo disponibles en la empresa'
    },
    { 
      key: 'groups' as EntityType, 
      name: 'Grupos', 
      required: false,
      description: 'Agrupaciones personalizadas de empleados, pueden asociarse a un Rol de Pago'
    },
    { 
      key: 'employeeProfiles' as EntityType, 
      name: 'Perfiles de Empleado', 
      required: false,
      description: 'Tipos de empleado según naturaleza laboral (Obrero, Administrativo, Técnico, etc.) para control de turnos y asistencias'
    }
  ];

  const handleDownloadTemplate = async (entityKey: EntityType) => {
    try {
      console.log(`📥 [Step3] Descargando plantilla para: ${entityKey}`);
      
      if (!bootstrapToken) {
        toast.error('Error de autenticación del sistema');
        return;
      }

      // Obtener tenant_id (y company_id si es necesario)
      const response = await fetch(
        `http://localhost:3001/make-server-e19f2094/bootstrap/tenant-info`,
        {
          headers: {
            'Authorization': `Bearer ${publicApiToken}`,
            'X-Bootstrap-Token': bootstrapToken
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error obteniendo información del tenant');
      }

      const { tenant_id, company_id } = await response.json();
      
      let blob: Blob;
      let filename: string;

      switch (entityKey) {
        case 'workLocations':
          blob = generateWorkLocationsTemplate(tenant_id, company_id);
          filename = 'Plantilla_Ubicaciones_de_Trabajo.xlsx';
          break;
        
        case 'departments':
          blob = generateDepartmentsTemplate(tenant_id);
          filename = 'Plantilla_Departamentos.xlsx';
          break;
        
        case 'payRoles':
          blob = generatePayrollGroupsTemplate(tenant_id);
          filename = 'Plantilla_Roles_de_Pago.xlsx';
          break;
        
        case 'areas':
          blob = generateAreasTemplate(tenant_id);
          filename = 'Plantilla_Areas.xlsx';
          break;
        
        case 'costCenters':
          blob = generateCostCentersTemplate(tenant_id);
          filename = 'Plantilla_Centros_de_Costo.xlsx';
          break;
        
        case 'positions':
          blob = generateJobTitlesTemplate(tenant_id);
          filename = 'Plantilla_Cargos.xlsx';
          break;
        
        case 'groups':
          blob = generateWorkGroupsTemplate(tenant_id);
          filename = 'Plantilla_Grupos.xlsx';
          break;
        
        case 'employeeProfiles':
          blob = generateEmployeeProfilesTemplate(tenant_id);
          filename = 'Plantilla_Perfiles_de_Empleados.xlsx';
          break;
        
        default:
          toast.info(`Plantilla de ${entityKey} no implementada`);
          return;
      }

      downloadTemplate(blob, filename);
      toast.success('Plantilla descargada correctamente');
      
    } catch (error: any) {
      console.error('❌ [Step3] Error descargando plantilla:', error);
      toast.error(error.message || 'Error descargando plantilla');
    }
  };

  const handleFileUpload = async (entityKey: EntityType, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log(`📤 Cargando archivo para: ${entityKey}`, file.name);

    switch (entityKey) {
      case 'workLocations':
        await handleWorkLocationsUpload(file);
        break;
      case 'departments':
        await handleEntityUpload(file, 'departments', parseDepartmentsFile, 'bootstrap/step3-structure/departments', 'departamentos');
        break;
      case 'payRoles':
        await handleEntityUpload(file, 'payRoles', parsePayrollGroupsFile, 'bootstrap/step3-structure/payroll-groups', 'roles de pago');
        break;
      case 'areas':
        await handleEntityUpload(file, 'areas', parseAreasFile, 'bootstrap/step3-structure/areas', 'áreas');
        break;
      case 'costCenters':
        await handleEntityUpload(file, 'costCenters', parseCostCentersFile, 'bootstrap/step3-structure/cost-centers', 'centros de costo');
        break;
      case 'positions':
        await handleEntityUpload(file, 'positions', parseJobTitlesFile, 'bootstrap/step3-structure/job-titles', 'cargos');
        break;
      case 'groups':
        await handleEntityUpload(file, 'groups', parseWorkGroupsFile, 'bootstrap/step3-structure/work-groups', 'grupos');
        break;
      case 'employeeProfiles':
        await handleEntityUpload(file, 'employeeProfiles', parseEmployeeProfilesFile, 'bootstrap/step3-structure/employee-profiles', 'perfiles de empleados');
        break;
      default:
        toast.error(`Tipo de entidad no soportado: ${entityKey}`);
    }
    
    // Limpiar el input para permitir recargar el mismo archivo
    event.target.value = '';
  };

  // Función genérica para cargar entidades (reutilizable)
  const handleEntityUpload = async (
    file: File,
    entityKey: EntityType,
    parseFunction: (file: File) => Promise<any>,
    endpoint: string,
    entityNameSpanish: string
  ) => {
    try {
      toast.info('Procesando archivo...');
      
      // Parsear y validar
      const result = await parseFunction(file);
      
      if (!result.success) {
        // Formatear errores
        const errorMessages = result.errors.map(err => 
          err.row === 0 
            ? err.message 
            : `Fila ${err.row}, ${err.column}: ${err.message}`
        );
        
        setEntityStatus(prev => ({
          ...prev,
          [entityKey]: {
            uploaded: false,
            fileName: file.name,
            recordCount: result.rowCount,
            errors: errorMessages
          }
        }));
        
        toast.error(`Se encontraron ${result.errors.length} error(es) en el archivo`);
        return;
      }
      
      console.log(`📤 [Step3] Enviando ${entityNameSpanish} al servidor:`, result.data);
      
      // Iniciar progreso
      setUploadProgress({
        isUploading: true,
        current: 0,
        total: result.data.length,
        entityName: entityNameSpanish
      });
      
      // Determinar el nombre de la propiedad del payload según la entidad
      const payloadKey = {
        departments: 'departments',
        payRoles: 'payrollGroups',
        areas: 'areas',
        costCenters: 'costCenters',
        positions: 'jobTitles',
        groups: 'workGroups',
        employeeProfiles: 'employeeProfiles'
      }[entityKey];
      
      // Enviar al servidor
      const response = await fetch(
        `http://localhost:3001/make-server-e19f2094/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicApiToken}`,
            'X-Bootstrap-Token': bootstrapToken
          },
          body: JSON.stringify({
            [payloadKey]: result.data
          })
        }
      );
      
      const responseData = await response.json();
      
      // Finalizar progreso
      setUploadProgress({
        isUploading: false,
        current: 0,
        total: 0,
        entityName: ''
      });
      
      if (!response.ok) {
        console.error(`❌ [Step3] Error del servidor (${entityNameSpanish}):`, responseData);
        
        // Si hay errores parciales (207 Multi-Status)
        if (response.status === 207 && responseData.errors) {
          const errorMessages = responseData.errors.map((err: any) => 
            `Fila ${err.row}: ${err.error}`
          );
          
          const totalProcessed = (responseData.inserted_count || 0) + (responseData.updated_count || 0);
          
          setEntityStatus(prev => ({
            ...prev,
            [entityKey]: {
              uploaded: totalProcessed > 0,
              fileName: file.name,
              recordCount: totalProcessed,
              errors: errorMessages
            }
          }));
          
          const successMsg = totalProcessed > 0 
            ? `${totalProcessed} ${entityNameSpanish} procesados (${responseData.inserted_count || 0} nuevos, ${responseData.updated_count || 0} actualizados). `
            : '';
          
          toast.warning(`${successMsg}${responseData.error_count} con errores.`);
          return;
        }
        
        throw new Error(responseData.error || 'Error guardando en el servidor');
      }
      
      console.log(`✅ [Step3] ${entityNameSpanish} guardados en el servidor:`, responseData);
      
      const totalProcessed = (responseData.inserted_count || 0) + (responseData.updated_count || 0);
      
      setEntityStatus(prev => ({
        ...prev,
        [entityKey]: {
          uploaded: true,
          fileName: file.name,
          recordCount: totalProcessed,
          errors: []
        }
      }));
      
      // Mensaje diferenciado según si hubo actualizaciones
      if (responseData.updated_count > 0) {
        toast.success(
          `${totalProcessed} ${entityNameSpanish} procesados: ${responseData.inserted_count} nuevos, ${responseData.updated_count} actualizados`
        );
      } else {
        toast.success(`${totalProcessed} ${entityNameSpanish} cargados correctamente`);
      }
      
    } catch (error: any) {
      console.error(`❌ [Step3] Error procesando archivo (${entityNameSpanish}):`, error);
      
      setUploadProgress({
        isUploading: false,
        current: 0,
        total: 0,
        entityName: ''
      });
      
      toast.error(error.message || 'Error procesando archivo');
      
      setEntityStatus(prev => ({
        ...prev,
        [entityKey]: {
          uploaded: false,
          fileName: file.name,
          recordCount: 0,
          errors: [error.message || 'Error inesperado procesando el archivo']
        }
      }));
    }
  };

  const handleWorkLocationsUpload = async (file: File) => {
    try {
      toast.info('Procesando archivo...');
      
      // Parsear y validar
      const result = await parseWorkLocationsFile(file);
      
      if (!result.success) {
        // Formatear errores
        const errorMessages = result.errors.map(err => 
          err.row === 0 
            ? err.message 
            : `Fila ${err.row}, ${err.column}: ${err.message}`
        );
        
        setEntityStatus(prev => ({
          ...prev,
          workLocations: {
            uploaded: false,
            fileName: file.name,
            recordCount: result.rowCount,
            errors: errorMessages
          }
        }));
        
        toast.error(`Se encontraron ${result.errors.length} error(es) en el archivo`);
        return;
      }
      
      console.log('📤 [Step3] Enviando ubicaciones al servidor:', result.data);
      
      // Iniciar progreso
      setUploadProgress({
        isUploading: true,
        current: 0,
        total: result.data.length,
        entityName: 'ubicaciones'
      });
      
      // Enviar al servidor
      const response = await fetch(
        `http://localhost:3001/make-server-e19f2094/bootstrap/step3-structure/work-locations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicApiToken}`,
            'X-Bootstrap-Token': bootstrapToken
          },
          body: JSON.stringify({
            workLocations: result.data
          })
        }
      );
      
      const responseData = await response.json();
      
      // Finalizar progreso
      setUploadProgress({
        isUploading: false,
        current: 0,
        total: 0,
        entityName: ''
      });
      
      if (!response.ok) {
        console.error('❌ [Step3] Error del servidor:', responseData);
        
        // Si hay errores parciales (207 Multi-Status)
        if (response.status === 207 && responseData.errors) {
          const errorMessages = responseData.errors.map((err: any) => 
            `Fila ${err.row}: ${err.error}`
          );
          
          const totalProcessed = (responseData.inserted_count || 0) + (responseData.updated_count || 0);
          
          setEntityStatus(prev => ({
            ...prev,
            workLocations: {
              uploaded: totalProcessed > 0,
              fileName: file.name,
              recordCount: totalProcessed,
              errors: errorMessages
            }
          }));
          
          const successMsg = totalProcessed > 0 
            ? `${totalProcessed} ubicaciones procesadas (${responseData.inserted_count || 0} nuevas, ${responseData.updated_count || 0} actualizadas). `
            : '';
          
          toast.warning(`${successMsg}${responseData.error_count} con errores.`);
          return;
        }
        
        throw new Error(responseData.error || 'Error guardando en el servidor');
      }
      
      console.log('✅ [Step3] Ubicaciones guardadas en el servidor:', responseData);
      
      const totalProcessed = (responseData.inserted_count || 0) + (responseData.updated_count || 0);
      
      setEntityStatus(prev => ({
        ...prev,
        workLocations: {
          uploaded: true,
          fileName: file.name,
          recordCount: totalProcessed,
          errors: []
        }
      }));
      
      // Mensaje diferenciado según si hubo actualizaciones
      if (responseData.updated_count > 0) {
        toast.success(
          `${totalProcessed} ubicaciones procesadas: ${responseData.inserted_count} nuevas, ${responseData.updated_count} actualizadas`
        );
      } else {
        toast.success(`${totalProcessed} ubicaciones cargadas correctamente`);
      }
      
    } catch (error: any) {
      console.error('❌ [Step3] Error procesando archivo:', error);
      
      setUploadProgress({
        isUploading: false,
        current: 0,
        total: 0,
        entityName: ''
      });
      
      toast.error(error.message || 'Error procesando archivo');
      
      setEntityStatus(prev => ({
        ...prev,
        workLocations: {
          uploaded: false,
          fileName: file.name,
          recordCount: 0,
          errors: [error.message || 'Error inesperado procesando el archivo']
        }
      }));
    }
  };

  const handleContinue = () => {
    // Validar que entidades requeridas estén cargadas
    const requiredEntities = entities.filter(e => e.required);
    const missingRequired = requiredEntities.some(e => !entityStatus[e.key].uploaded);

    if (missingRequired) {
      alert('Debe cargar al menos las entidades obligatorias: Departamentos y Cargos');
      return;
    }

    onComplete({ entityStatus });
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Modal de Progreso */}
      {uploadProgress.isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-6 h-6 text-[#0074D9] animate-spin" />
              <h3 className="text-lg font-semibold text-gray-900">
                Cargando {uploadProgress.entityName}...
              </h3>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Procesando registros</span>
                <span className="font-medium text-[#0074D9]">
                  {uploadProgress.total} de {uploadProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-[#0074D9] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            
            <p className="text-sm text-gray-500 text-center">
              Por favor espere mientras se guardan los datos...
            </p>
          </div>
        </div>
      )}

      {/* Título */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#0074D9] rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Estructura Organizacional
          </h2>
        </div>
        <p className="text-gray-600 leading-relaxed">
          Cargue la estructura organizacional de su empresa mediante archivos Excel. 
          Descargue las plantillas, complete la información y cargue los archivos.
        </p>
      </div>

      {/* Instrucciones */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <FileSpreadsheet className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <strong className="font-semibold">Proceso de carga:</strong>
            <ol className="mt-2 space-y-1 ml-4 list-decimal">
              <li>Descargue la plantilla Excel de cada entidad</li>
              <li>Complete la información requerida</li>
              <li>Cargue el archivo completo</li>
              <li>Verifique que no haya errores de validación</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Lista de entidades para carga */}
      <div className="space-y-3 mb-8">
        {entities.map((entity) => {
          const status = entityStatus[entity.key];
          const isUploaded = status.uploaded;

          return (
            <div
              key={entity.key}
              className={`border-2 rounded-lg p-4 transition-all ${
                isUploaded 
                  ? 'border-green-500 bg-green-50' 
                  : entity.required 
                  ? 'border-gray-300 bg-white' 
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {isUploaded ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      entity.required ? 'border-[#0074D9]' : 'border-gray-300'
                    }`} />
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{entity.name}</span>
                      {entity.required && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                          Obligatorio
                        </span>
                      )}
                      {entity.hasAdvancedOptions && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          Opciones avanzadas
                        </span>
                      )}
                    </div>
                    
                    {entity.description && !isUploaded && (
                      <p className="text-xs text-gray-500 mt-1">
                        {entity.description}
                      </p>
                    )}
                    
                    {isUploaded && (
                      <div className="text-sm text-gray-600 mt-1">
                        {status.fileName} • {status.recordCount} registros
                      </div>
                    )}
                    
                    {/* Hint específico para workLocations */}
                    {entity.key === 'workLocations' && !isUploaded && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-blue-700 bg-blue-50 px-2 py-1.5 rounded border border-blue-200">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>
                          Incluye campos opcionales: <strong>Dirección, Latitud, Longitud</strong>. 
                          Estos datos habilitan mapas y funciones de geocerca.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate(entity.key)}
                    className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Plantilla
                  </button>

                  <label className="px-3 py-1.5 text-sm bg-[#0074D9] text-white rounded hover:bg-[#0066C0] transition-colors cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    {isUploaded ? 'Reemplazar' : 'Cargar'}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => handleFileUpload(entity.key, e)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {status.errors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-red-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-red-700">
                      <strong className="font-semibold">Errores encontrados:</strong>
                      <ul className="mt-1 space-y-0.5 ml-4 list-disc">
                        {status.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Nota adicional */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-700">
          <strong className="font-semibold">Nota:</strong> Las entidades marcadas como opcionales 
          pueden cargarse posteriormente desde el módulo de Configuración del sistema.
        </p>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3 pt-6 border-t border-gray-200">
        {onGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver
          </button>
        )}
        <button
          type="button"
          onClick={handleContinue}
          className="flex-1 bg-[#0074D9] text-white px-6 py-2.5 rounded-lg hover:bg-[#0066C0] transition-colors font-medium flex items-center justify-center gap-2"
        >
          Continuar
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
