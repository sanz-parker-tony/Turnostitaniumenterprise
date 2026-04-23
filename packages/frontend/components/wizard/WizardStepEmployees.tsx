/**
 * WizardStepEmployees.tsx
 * Paso 4: Empleados (Carga Masiva)
 */

import { useState, useEffect } from 'react';
import { Users, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Download, Loader2 } from 'lucide-react';
import { projectId, publicApiToken } from '../../utils/backend/info';
import { downloadTemplate } from '../../utils/excel-templates';
import { generateEmployeesExcelWithDropdowns, type BootstrapCatalogs } from '../../utils/excel-dropdowns';

interface WizardStepEmployeesProps {
  onComplete: (data: any) => void;
  // ELIMINADO: onCompleteLater - el wizard es BLOQUEANTE
  onGoBack?: () => void;
}

export default function WizardStepEmployees({ onComplete, onGoBack }: WizardStepEmployeesProps) {
  const [catalogs, setCatalogs] = useState<BootstrapCatalogs | null>(null);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [tenantInfo, setTenantInfo] = useState<{ tenantName: string; companyName: string } | null>(null);
  
  const [uploadStatus, setUploadStatus] = useState<{
    uploaded: boolean;
    fileName: string;
    recordCount: number;
    insertedCount: number;
    updatedCount: number;
    errors: string[];
    warnings: string[];
  }>({
    uploaded: false,
    fileName: '',
    recordCount: 0,
    insertedCount: 0,
    updatedCount: 0,
    errors: [],
    warnings: []
  });

  // ========================================
  // EFECTO: Cargar catálogos al montar componente
  // ========================================
  useEffect(() => {
    loadCatalogsAndTenantInfo();
  }, []);

  const loadCatalogsAndTenantInfo = async () => {
    try {
      console.log('📊 Cargando catálogos organizacionales...');
      setLoadingCatalogs(true);

      // ✅ VERIFICAR TOKEN EN LOCALSTORAGE
      let bootstrapToken = localStorage.getItem('bootstrapToken') || '';
      
      // Si no hay token en localStorage, intentar obtenerlo del backend
      if (!bootstrapToken) {
        console.log('⚠️ No hay token en localStorage, intentando obtenerlo...');
        
        try {
          const tokenResponse = await fetch(
            `http://localhost:3001/bootstrap/token-direct`,
            {
              headers: {
                'Authorization': `Bearer ${publicApiToken}`
              }
            }
          );
          
          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            if (tokenData.bootstrapToken) {
              bootstrapToken = tokenData.bootstrapToken;
              localStorage.setItem('bootstrapToken', bootstrapToken);
              console.log('✅ Token obtenido y guardado en localStorage');
            }
          } else {
            console.error('❌ No se pudo obtener el token:', tokenResponse.status);
          }
        } catch (tokenError) {
          console.error('❌ Error obteniendo token:', tokenError);
        }
      }

      // Llamada paralela a ambos endpoints
      const [catalogsResponse, tenantInfoResponse] = await Promise.all([
        fetch(
          `http://localhost:3001/bootstrap/catalogs`,
          {
            headers: {
              'Authorization': `Bearer ${publicApiToken}`,
              'X-Bootstrap-Token': bootstrapToken
            }
          }
        ),
        fetch(
          `http://localhost:3001/bootstrap/tenant-info`,
          {
            headers: {
              'Authorization': `Bearer ${publicApiToken}`,
              'X-Bootstrap-Token': bootstrapToken
            }
          }
        )
      ]);

      // Verificar respuesta de catálogos
      if (!catalogsResponse.ok) {
        const errorText = await catalogsResponse.text();
        console.error('❌ Error HTTP en catalogs:', catalogsResponse.status, errorText);
        throw new Error(`Error HTTP ${catalogsResponse.status}: ${errorText}`);
      }

      // Verificar respuesta de tenant info
      if (!tenantInfoResponse.ok) {
        const errorText = await tenantInfoResponse.text();
        console.error('❌ Error HTTP en tenant-info:', tenantInfoResponse.status, errorText);
        throw new Error(`Error HTTP ${tenantInfoResponse.status}: ${errorText}`);
      }

      const catalogsData = await catalogsResponse.json();
      const tenantInfoData = await tenantInfoResponse.json();

      // Verificar que catalogsData tenga la estructura correcta
      if (!catalogsData.ok || !catalogsData.catalogs) {
        console.error('❌ Respuesta inválida de catálogos:', catalogsData);
        throw new Error(catalogsData.error || 'Respuesta de catálogos inválida');
      }

      console.log('✅ Catálogos cargados:', catalogsData.catalogs);
      console.log('✅ Tenant info:', tenantInfoData);

      setCatalogs(catalogsData.catalogs);
      setTenantInfo({
        tenantName: tenantInfoData.tenant_name || 'Mi Empresa',
        companyName: tenantInfoData.company_name || 'Empresa Principal'
      });
    } catch (error: any) {
      console.error('❌ Error cargando catálogos:', error);
      
      // Mensaje de error más descriptivo
      const errorMessage = error.message || 'Error desconocido';
      console.error('❌ Detalles del error:', {
        message: errorMessage,
        stack: error.stack
      });
      
      // Mostrar alerta con instrucciones
      alert(
        `Error al cargar catálogos:\n\n${errorMessage}\n\n` +
        `Posibles causas:\n` +
        `1. Aún no ha completado el Paso 3 (Estructura Organizacional)\n` +
        `2. No hay departamentos o cargos creados\n` +
        `3. Problema de conexión con el servidor\n\n` +
        `Por favor, verifique la consola del navegador para más detalles.`
      );
    } finally {
      setLoadingCatalogs(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      if (!catalogs) {
        alert('⚠️ Los catálogos aún no se han cargado. Por favor, espere un momento.');
        return;
      }
      
      // 🔍 DEBUG: Verificar catálogos antes de generar Excel
      console.log('📊 DEBUG - Catálogos al generar plantilla:');
      console.log('   - Departamentos:', catalogs.departments.length);
      console.log('   - Cargos:', catalogs.job_titles.length);
      console.log('   - Áreas:', catalogs.areas.length);
      console.log('   - Centros de Costo:', catalogs.cost_centers.length);
      console.log('   - Ubicaciones:', catalogs.work_locations.length);
      console.log('   - Grupos:', catalogs.work_groups.length);
      console.log('   - Roles de Pago:', catalogs.payroll_groups.length);
      console.log('   - ⭐ PERFILES:', catalogs.employee_profiles.length);
      console.log('   - Géneros:', catalogs.genders.length);
      console.log('   - Tipos de Contrato:', catalogs.contract_types.length);
      
      // Mostrar primeros 3 perfiles para debug
      if (catalogs.employee_profiles.length > 0) {
        console.log('   - 🔍 Primeros perfiles:', catalogs.employee_profiles.slice(0, 3));
      }
      
      // Verificar que existan departamentos y cargos (OBLIGATORIOS)
      if (catalogs.departments.length === 0 || catalogs.job_titles.length === 0) {
        alert(
          '⚠️ No hay suficientes catálogos para generar la plantilla.\\n\\n' +
          `Catálogos actuales:\\n` +
          `• Departamentos: ${catalogs.departments.length}\\n` +
          `• Cargos: ${catalogs.job_titles.length}\\n\\n` +
          'Se requiere al menos:\\n' +
          '• 1 Departamento\\n' +
          '• 1 Cargo\\n\\n' +
          'Por favor, vuelva al Paso 3 y cree estos registros.'
        );
        return;
      }
      
      console.log('🎯 Generando Excel con dropdowns usando ExcelJS...');
      const blob = await generateEmployeesExcelWithDropdowns(catalogs, undefined, tenantInfo || undefined);
      
      // ✅ AGREGAR TIMESTAMP para forzar descarga nueva (evitar caché)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `Plantilla_Empleados_${tenantInfo?.tenantName.replace(/\s+/g, '_') || 'Sistema'}_${timestamp}.xlsx`;
      
      downloadTemplate(blob, filename);
      console.log('✅ Plantilla con dropdowns descargada correctamente:', filename);
    } catch (error: any) {
      console.error('❌ Error generando plantilla:', error);
      alert('Error al generar plantilla: ' + (error.message || 'Error desconocido'));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      console.log('📤 Procesando archivo:', file.name);
      setUploadStatus({
        uploaded: false,
        fileName: file.name,
        recordCount: 0,
        insertedCount: 0,
        updatedCount: 0,
        errors: [],
        warnings: []
      });

      // ✅ 1. PARSEAR ARCHIVO EXCEL
      const { parseEmployeesFile } = await import('../../utils/excel-templates');
      const parseResult = await parseEmployeesFile(file);

      console.log('📊 Resultado del parsing:', parseResult);

      if (!parseResult.success) {
        console.error('❌ Errores de validación:', parseResult.errors);
        setUploadStatus({
          uploaded: false,
          fileName: file.name,
          recordCount: 0,
          insertedCount: 0,
          updatedCount: 0,
          errors: parseResult.errors.map(e => `Fila ${e.row}, ${e.column}: ${e.message}`),
          warnings: []
        });
        return;
      }

      if (parseResult.data.length === 0) {
        alert('⚠️ El archivo no contiene empleados válidos para importar.');
        return;
      }

      console.log(`✅ ${parseResult.data.length} empleados válidos encontrados`);

      // ✅ 2. ENVIAR AL BACKEND PARA RESOLUCIÓN DE CÓDIGOS + INSERCIÓN
      const bootstrapToken = localStorage.getItem('bootstrapToken') || '';
      
      const response = await fetch(
        `http://localhost:3001/bootstrap/employees`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicApiToken}`,
            'X-Bootstrap-Token': bootstrapToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            employees: parseResult.data
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error del servidor:', errorText);
        throw new Error(`Error HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (!result.ok) {
        console.error('❌ Error en la respuesta:', result);
        setUploadStatus({
          uploaded: false,
          fileName: file.name,
          recordCount: parseResult.data.length,
          insertedCount: 0,
          updatedCount: 0,
          errors: result.errors || [result.error || 'Error desconocido al insertar empleados'],
          warnings: result.warnings || []
        });
        return;
      }

      // ✅ 3. MOSTRAR RESULTADO EXITOSO
      console.log('✅ Empleados procesados correctamente:', result);
      setUploadStatus({
        uploaded: true,
        fileName: file.name,
        recordCount: result.inserted_count || parseResult.data.length,
        insertedCount: result.inserted_count || 0,
        updatedCount: result.updated_count || 0,
        errors: [],
        warnings: result.warnings || []
      });

      // ✅ ARCHIVO SUBIDO EXITOSAMENTE
      // El botón "Siguiente >" se habilitará automáticamente porque uploadStatus.uploaded = true

    } catch (error: any) {
      console.error('❌ Error procesando archivo:', error);
      setUploadStatus({
        uploaded: false,
        fileName: file.name,
        recordCount: 0,
        insertedCount: 0,
        updatedCount: 0,
        errors: [`Error procesando archivo: ${error.message}`],
        warnings: []
      });
    }
  };

  const handleContinue = async () => {
    try {
      console.log('➡️ Usuario hizo clic en "Siguiente >", actualizando tenant_onboarding...');

      const bootstrapToken = localStorage.getItem('bootstrapToken') || '';

      // ✅ ACTUALIZAR tenant_onboarding: Paso 4 completado
      const response = await fetch(
        `http://localhost:3001/bootstrap/update-step`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicApiToken}`,
            'X-Bootstrap-Token': bootstrapToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            current_step: 'ADMINISTRATOR', // ✅ CORREGIDO: Era 'ADMIN', debe ser 'ADMINISTRATOR'
            completed_steps: ['TENANT', 'COMPANY', 'STRUCTURE', 'EMPLOYEES'],
            completion_percentage: 80
          })
        }
      );

      if (!response.ok) {
        console.error('⚠️ Error actualizando tenant_onboarding:', await response.text());
        // No bloquear el flujo, solo registrar el error
      } else {
        console.log('✅ tenant_onboarding actualizado: current_step → ADMINISTRATOR, 80% completado');
      }

      // ✅ AVANZAR AL SIGUIENTE PASO
      onComplete({ uploadStatus });

    } catch (error: any) {
      console.error('❌ Error en handleContinue:', error);
      // No bloquear el flujo, permitir avanzar
      onComplete({ uploadStatus });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Título */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#0074D9] rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Empleados
          </h2>
        </div>
        <p className="text-gray-600 leading-relaxed">
          Registre los empleados iniciales de su empresa mediante carga masiva de archivo Excel.
        </p>
      </div>

      {/* Instrucciones */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <FileSpreadsheet className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <strong className="font-semibold">Plantilla Excel Inteligente:</strong>
            <ul className="mt-2 space-y-1 ml-4 list-disc">
              <li><strong>Dropdowns dinámicos</strong> - Seleccione departamentos, cargos, áreas, etc. desde listas desplegables</li>
              <li><strong>Validación automática</strong> - Solo valores existentes en su organización</li>
              <li><strong>Campos obligatorios</strong> - Código de empleado, apellido, nombre, departamento y cargo</li>
              <li><strong>Campos opcionales</strong> - Género, perfiles, ubicaciones, grupos, tipos de contrato, etc.</li>
            </ul>
            {loadingCatalogs && (
              <div className="mt-3 flex items-center gap-2 text-blue-700">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cargando catálogos desde la base de datos...</span>
              </div>
            )}
            {catalogs && !loadingCatalogs && (
              <div className="mt-3 text-green-700 font-medium">
                ✓ Catálogos cargados - {catalogs.departments.length} departamentos, {catalogs.job_titles.length} cargos disponibles
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Área de carga */}
      <div className={`border-2 rounded-lg p-6 transition-all ${
        uploadStatus.uploaded 
          ? 'border-green-500 bg-green-50' 
          : 'border-gray-300 bg-white'
      }`}>
        
        {!uploadStatus.uploaded ? (
          // Estado inicial: sin archivo
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Cargar archivo de empleados
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Descargue primero la plantilla, complete la información y luego cargue el archivo
            </p>
            
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Descargar plantilla
              </button>

              <label className="px-4 py-2 bg-[#0074D9] text-white rounded-lg hover:bg-[#0066C0] transition-colors cursor-pointer flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Seleccionar archivo
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        ) : (
          // Estado: archivo cargado
          <div>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Archivo cargado exitosamente</div>
                <div className="text-sm text-gray-600">
                  {uploadStatus.fileName}
                  {uploadStatus.insertedCount > 0 && uploadStatus.updatedCount > 0 ? (
                    <> • {uploadStatus.insertedCount} nuevos, {uploadStatus.updatedCount} actualizados</>
                  ) : uploadStatus.insertedCount > 0 ? (
                    <> • {uploadStatus.insertedCount} empleados nuevos</>
                  ) : uploadStatus.updatedCount > 0 ? (
                    <> • {uploadStatus.updatedCount} empleados actualizados</>
                  ) : (
                    <> • {uploadStatus.recordCount} empleados</>
                  )}
                </div>
              </div>
              <label className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors cursor-pointer">
                Reemplazar
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Errores */}
            {uploadStatus.errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-700">
                    <strong className="font-semibold">Errores encontrados:</strong>
                    <ul className="mt-1 space-y-0.5 ml-4 list-disc">
                      {uploadStatus.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Advertencias */}
            {uploadStatus.warnings.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <strong className="font-semibold">Advertencias:</strong>
                    <ul className="mt-1 space-y-0.5 ml-4 list-disc">
                      {uploadStatus.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nota informativa */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong className="font-semibold">Nota:</strong> La carga de empleados es opcional en este momento. 
          Puede completar este paso más tarde desde el módulo de Personal del sistema.
        </p>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
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
