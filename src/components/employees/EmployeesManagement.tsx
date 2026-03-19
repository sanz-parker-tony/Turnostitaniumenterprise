/**
 * EmployeesManagement.tsx
 * Pantalla completa de gestión de empleados
 * Incluye: Lista, Formulario, Gestión de usuarios, Carga masiva
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Download, 
  Upload,
  UserPlus,
  Shield,
  Mail,
  Phone,
  Building,
  FileText,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import EmployeeUserManagement from '../EmployeeUserManagement';

interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email_work?: string;
  phone?: string;
  is_active: boolean;
  auth_user_id?: string;
  company_name?: string;
  department_name?: string;
  job_title_name?: string;
}

export default function EmployeesManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isCreatingBulk, setIsCreatingBulk] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);

  const supabase = createClient(
    `https://${projectId}.supabase.co`,
    publicAnonKey
  );

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    // Filtrar empleados
    if (searchQuery.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = employees.filter(emp => 
        emp.employee_code.toLowerCase().includes(query) ||
        emp.first_name.toLowerCase().includes(query) ||
        emp.last_name.toLowerCase().includes(query) ||
        emp.email_work?.toLowerCase().includes(query)
      );
      setFilteredEmployees(filtered);
    }
  }, [searchQuery, employees]);

  const loadEmployees = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          employee_code,
          first_name,
          last_name,
          email_work,
          phone,
          is_active,
          auth_user_id,
          companies (company_name),
          departments (department_name),
          job_titles (job_title_name)
        `)
        .order('employee_code');

      if (error) throw error;

      const formatted = data?.map((emp: any) => ({
        id: emp.id,
        employee_code: emp.employee_code,
        first_name: emp.first_name,
        last_name: emp.last_name,
        email_work: emp.email_work,
        phone: emp.phone,
        is_active: emp.is_active,
        auth_user_id: emp.auth_user_id,
        company_name: emp.companies?.company_name,
        department_name: emp.departments?.department_name,
        job_title_name: emp.job_titles?.job_title_name
      })) || [];

      setEmployees(formatted);
      setFilteredEmployees(formatted);
    } catch (error: any) {
      console.error('Error cargando empleados:', error);
      toast.error('Error cargando empleados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBulkUsers = async () => {
    setIsCreatingBulk(true);

    try {
      // Obtener el token de Supabase
      const token_supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );
      
      const { data: { session } } = await token_supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('No se pudo obtener el token de autenticación');
      }
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/employees/create-users-bulk`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error creando usuarios');
      }

      const result = await response.json();
      setBulkResult(result);
      setShowBulkModal(true);
      
      if (result.created > 0) {
        toast.success(`${result.created} usuarios creados exitosamente`);
        loadEmployees(); // Recargar empleados
      }

      if (result.failed > 0) {
        toast.warning(`${result.failed} empleados no pudieron ser procesados`);
      }

      if (result.created === 0 && result.failed === 0) {
        toast.info('No hay empleados pendientes de creación de usuario');
      }
    } catch (error: any) {
      console.error('Error en carga masiva:', error);
      toast.error(error.message || 'Error creando usuarios masivamente');
    } finally {
      setIsCreatingBulk(false);
    }
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowForm(true);
  };

  const handleNew = () => {
    setSelectedEmployee(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedEmployee(null);
  };

  const handleSaveEmployee = async () => {
    await loadEmployees();
    handleCloseForm();
  };

  // Contar empleados sin usuario
  const employeesWithoutUser = employees.filter(
    emp => emp.email_work && !emp.auth_user_id && emp.is_active
  ).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando empleados...</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <EmployeeForm
        employee={selectedEmployee}
        onClose={handleCloseForm}
        onSave={handleSaveEmployee}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por código, nombre o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {/* Botón de carga masiva de usuarios */}
            {employeesWithoutUser > 0 && (
              <button
                onClick={handleCreateBulkUsers}
                disabled={isCreatingBulk}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingBulk ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creando usuarios...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    <span>Crear usuarios masivamente ({employeesWithoutUser})</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleNew}
              className="px-4 py-2.5 bg-[#0074D9] hover:bg-[#0056A3] text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Nuevo empleado</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {employees.filter(e => e.is_active).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Con acceso</p>
              <p className="text-2xl font-bold text-gray-900">
                {employees.filter(e => e.auth_user_id).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Sin acceso</p>
              <p className="text-2xl font-bold text-gray-900">
                {employeesWithoutUser}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cargo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acceso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchQuery ? 'No se encontraron empleados' : 'No hay empleados registrados'}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {employee.employee_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {employee.first_name} {employee.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {employee.email_work ? (
                          <>
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{employee.email_work}</span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {employee.job_title_name || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {employee.auth_user_id ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1 w-fit">
                          <Shield className="w-3 h-3" />
                          Con acceso
                        </span>
                      ) : employee.email_work ? (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full flex items-center gap-1 w-fit">
                          <AlertCircle className="w-3 h-3" />
                          Pendiente
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full w-fit">
                          Sin email
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {employee.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Activo
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleEdit(employee)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de resultado de carga masiva */}
      {showBulkModal && bulkResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Resultado de creación masiva</h3>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-blue-600 mb-1">Total procesados</p>
                  <p className="text-3xl font-bold text-blue-900">{bulkResult.total}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-green-600 mb-1">Creados</p>
                  <p className="text-3xl font-bold text-green-900">{bulkResult.created}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-red-600 mb-1">Fallidos</p>
                  <p className="text-3xl font-bold text-red-900">{bulkResult.failed}</p>
                </div>
              </div>

              {/* Errores */}
              {bulkResult.errors && bulkResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-red-900 mb-3">
                    Empleados con errores:
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {bulkResult.errors.map((err: any, idx: number) => (
                      <div key={idx} className="bg-white rounded p-3 text-sm">
                        <p className="font-medium text-gray-900">{err.employee_code}</p>
                        <p className="text-gray-600">{err.email}</p>
                        <p className="text-red-600 text-xs mt-1">{err.error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowBulkModal(false)}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EMPLOYEE FORM COMPONENT
// ============================================================================

interface EmployeeFormProps {
  employee: Employee | null;
  onClose: () => void;
  onSave: () => void;
}

function EmployeeForm({ employee, onClose, onSave }: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    employee_code: employee?.employee_code || '',
    first_name: employee?.first_name || '',
    last_name: employee?.last_name || '',
    email_work: employee?.email_work || '',
    phone: employee?.phone || '',
    is_active: employee?.is_active ?? true
  });
  const [isSaving, setIsSaving] = useState(false);

  const supabase = createClient(
    `https://${projectId}.supabase.co`,
    publicAnonKey
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (employee) {
        // Actualizar
        const { error } = await supabase
          .from('employees')
          .update(formData)
          .eq('id', employee.id);

        if (error) throw error;
        toast.success('Empleado actualizado exitosamente');
      } else {
        // Crear
        const { error } = await supabase
          .from('employees')
          .insert(formData);

        if (error) throw error;
        toast.success('Empleado creado exitosamente');
      }

      onSave();
    } catch (error: any) {
      console.error('Error guardando empleado:', error);
      toast.error(error.message || 'Error guardando empleado');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {employee ? 'Editar empleado' : 'Nuevo empleado'}
          </h1>
          <p className="text-gray-600">
            {employee ? `Código: ${employee.employee_code}` : 'Completa los datos del empleado'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos básicos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos básicos</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de empleado *
              </label>
              <input
                type="text"
                value={formData.employee_code}
                onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                value={formData.is_active ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9]"
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apellido *
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email corporativo
              </label>
              <input
                type="email"
                value={formData.email_work}
                onChange={(e) => setFormData({ ...formData, email_work: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Necesario para crear acceso al sistema
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9]"
              />
            </div>
          </div>
        </div>

        {/* Gestión de usuario (solo en edición) */}
        {employee && (
          <EmployeeUserManagement
            employeeId={employee.id}
            employeeEmail={formData.email_work}
            onUserCreated={() => {
              // Opcionalmente recargar datos
            }}
          />
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-[#0074D9] hover:bg-[#0056A3] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Guardando...</span>
              </>
            ) : (
              <span>{employee ? 'Actualizar' : 'Crear'} empleado</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}