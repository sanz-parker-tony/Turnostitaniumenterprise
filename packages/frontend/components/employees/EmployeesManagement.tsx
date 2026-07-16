'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApiClient } from '../../lib/api-client';
import EmployeeUserManagement from '../EmployeeUserManagement';

interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email_work?: string | null;
  is_active: boolean;
}

export default function EmployeesManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEmployees = async () => {
    setLoading(true);
    const { data, error } = await ApiClient
      .from('employees')
      .select('id, employee_code, first_name, last_name, email_work, is_active')
      .order('employee_code');

    if (error) {
      toast.error(error.message || 'No se pudieron cargar empleados');
      setLoading(false);
      return;
    }

    setEmployees((data || []) as Employee[]);
    setLoading(false);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  if (loading) {
    return <div className="p-6 text-sm text-gray-600">Cargando empleados...</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Empleados</h2>

      <div className="rounded border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Código</th>
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">Correo electrónico</th>
              <th className="text-left p-3">Estado</th>
              <th className="text-left p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3 font-mono">{e.employee_code}</td>
                <td className="p-3">{e.first_name} {e.last_name}</td>
                <td className="p-3">{e.email_work || '-'}</td>
                <td className="p-3">{e.is_active ? 'Activo' : 'Inactivo'}</td>
                <td className="p-3">
                  <button
                    onClick={() => setSelected(e)}
                    className="px-2 py-1 rounded bg-blue-600 text-white text-xs"
                  >
                    Gestionar Usuario
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <EmployeeUserManagement
          employeeId={selected.id}
          employeeEmail={selected.email_work || ''}
          onUserCreated={loadEmployees}
        />
      )}
    </div>
  );
}

