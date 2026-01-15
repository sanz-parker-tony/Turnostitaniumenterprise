import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, Lock, FileCheck, Printer, Download, ChevronRight, ChevronDown, Copy } from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

// Mock data - Usuarios
const mockUsers = [
  { id: 1, username: 'admin@titanium.com', name: 'Carlos Administrador', role: 'Administrador', active: true },
  { id: 2, username: 'supervisor@titanium.com', name: 'María Supervisora', role: 'Supervisor', active: true },
  { id: 3, username: 'operador@titanium.com', name: 'José Operador', role: 'Operador', active: false },
];

// Estructura inicial de permisos - COMPLETA con todos los módulos y pestañas
const initialPermissions = [
  {
    module: 'Dashboard',
    enabled: true,
    expanded: false,
    transactions: [
      { code: 'DASH_MAIN', name: 'Dashboard Principal', enabled: true, expanded: false, options: [] }
    ]
  },
  {
    module: 'Mantenimiento',
    enabled: true,
    expanded: false,
    transactions: [
      { 
        code: 'MANT_FER', 
        name: 'Feriados', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: true },
          { code: 'BTN_EXPORT', name: 'Exportar', enabled: true }
        ]
      },
      { 
        code: 'MANT_CAT', 
        name: 'Catálogos', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: false },
          { code: 'BTN_EXPORT', name: 'Exportar', enabled: true }
        ]
      },
      { 
        code: 'MANT_JUST', 
        name: 'Motivos de Justificación', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: false },
          { code: 'BTN_EXPORT', name: 'Exportar', enabled: true }
        ]
      }
    ]
  },
  {
    module: 'Configuración',
    enabled: true,
    expanded: false,
    transactions: [
      { 
        code: 'CONF_DISP', 
        name: 'Dispositivos', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: true }
        ]
      },
      { 
        code: 'CONF_MOV', 
        name: 'Movimientos', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: true }
        ]
      },
      { 
        code: 'CONF_TURN', 
        name: 'Turnos', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_BUILD', name: 'Constructor', enabled: true }
        ]
      },
      { 
        code: 'CONF_PARAM', 
        name: 'Parámetros Generales', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true }
        ]
      },
      { 
        code: 'CONF_NOV', 
        name: 'Novedades', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: true }
        ]
      }
    ]
  },
  {
    module: 'Perfiles',
    enabled: true,
    expanded: false,
    transactions: [
      { 
        code: 'PERF_LIST', 
        name: 'Listado', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: true },
          { code: 'BTN_EXPORT', name: 'Exportar', enabled: true }
        ]
      },
      { 
        code: 'PERF_PARAM', 
        name: 'Parámetros x Perfil', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_ASSIGN', name: 'Asignar', enabled: true }
        ]
      },
      { 
        code: 'PERF_TURN', 
        name: 'Turnos x Perfil', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_ASSIGN', name: 'Asignar', enabled: true }
        ]
      },
      { 
        code: 'PERF_NOV', 
        name: 'Novedades x Perfil', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_ASSIGN', name: 'Asignar', enabled: true }
        ]
      }
    ]
  },
  {
    module: 'Empresas',
    enabled: true,
    expanded: false,
    transactions: [
      { 
        code: 'EMP_EMPRESA', 
        name: 'Empresas', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: true },
          { code: 'BTN_EXPORT', name: 'Exportar', enabled: true }
        ]
      },
      { 
        code: 'EMP_LOCAL', 
        name: 'Localidades', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: false }
        ]
      },
      { 
        code: 'EMP_DEPTO', 
        name: 'Departamentos', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: true }
        ]
      },
      { 
        code: 'EMP_AREA', 
        name: 'Áreas', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: true }
        ]
      },
      { 
        code: 'EMP_CARGO', 
        name: 'Cargos', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: true }
        ]
      },
      { 
        code: 'EMP_ROL', 
        name: 'Roles de Pago', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: true }
        ]
      },
      { 
        code: 'EMP_CENTRO', 
        name: 'Centros de Costo', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: true }
        ]
      },
      { 
        code: 'EMP_GRUPO', 
        name: 'Grupos', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: true }
        ]
      }
    ]
  },
  {
    module: 'Empleados',
    enabled: true,
    expanded: false,
    transactions: [
      { 
        code: 'EMPL_LIST', 
        name: 'Listado de Empleados', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: false },
          { code: 'BTN_EXPORT', name: 'Exportar', enabled: true }
        ]
      },
      { 
        code: 'EMPL_PLAN', 
        name: 'Planificación de Turnos', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_ASSIGN', name: 'Asignar', enabled: true },
          { code: 'BTN_GENERATE', name: 'Generar', enabled: true },
          { code: 'BTN_SAVE', name: 'Guardar', enabled: true }
        ]
      },
      { 
        code: 'EMPL_AUSEN', 
        name: 'Ausencias', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: true }
        ]
      },
      { 
        code: 'EMPL_NOV', 
        name: 'Novedades', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: true }
        ]
      },
      { 
        code: 'EMPL_MARC', 
        name: 'Revisión de Marcaciones', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_ADD', name: 'Agregar', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: true }
        ]
      }
    ]
  },
  {
    module: 'Procesos',
    enabled: true,
    expanded: false,
    transactions: [
      { 
        code: 'PROC_SYNC', 
        name: 'Sincronización de Marcaciones', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_SYNC', name: 'Sincronizar', enabled: true },
          { code: 'BTN_EXPORT', name: 'Exportar', enabled: true }
        ]
      },
      { 
        code: 'PROC_IMP', 
        name: 'Importación de Datos', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_IMPORT', name: 'Importar', enabled: true }
        ]
      },
      { 
        code: 'PROC_LIQ', 
        name: 'Liquidación de Novedades', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_GENERATE', name: 'Generar', enabled: true },
          { code: 'BTN_EXPORT', name: 'Exportar', enabled: true }
        ]
      }
    ]
  },
  {
    module: 'Seguridades',
    enabled: true,
    expanded: false,
    transactions: [
      { 
        code: 'SEG_USUARIOS', 
        name: 'Usuarios', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: true },
          { code: 'BTN_RESET', name: 'Resetear Contraseña', enabled: true }
        ]
      },
      { 
        code: 'SEG_TRANS', 
        name: 'Transacciones', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: true }
        ]
      },
      { 
        code: 'SEG_OPC', 
        name: 'Opciones por Transacción', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: true }
        ]
      },
      { 
        code: 'SEG_REP', 
        name: 'Reportes', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: true }
        ]
      },
      { 
        code: 'SEG_CRIT', 
        name: 'Criterios por Reportes', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_NEW', name: 'Crear', enabled: true },
          { code: 'BTN_EDIT', name: 'Modificar', enabled: true },
          { code: 'BTN_DELETE', name: 'Eliminar', enabled: true }
        ]
      }
    ]
  },
  {
    module: 'Usuarios',
    enabled: true,
    expanded: false,
    transactions: [
      { 
        code: 'USR_COPY', 
        name: 'Copiar Permisos', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_COPY', name: 'Copiar', enabled: true }
        ]
      },
      { 
        code: 'USR_PERM_ACC', 
        name: 'Permiso de Acciones', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_SAVE', name: 'Guardar', enabled: true }
        ]
      },
      { 
        code: 'USR_PERM_INFO', 
        name: 'Permisos a la Información', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_SAVE', name: 'Guardar', enabled: true }
        ]
      },
      { 
        code: 'USR_PERM_IMP', 
        name: 'Permisos de Impresión', 
        enabled: true,
        expanded: false,
        options: [
          { code: 'BTN_SAVE', name: 'Guardar', enabled: true }
        ]
      }
    ]
  }
];

// Mock data - Permisos a la Información
const initialDataAccess = {
  empresas: { name: 'Empresas', expanded: false, items: [
    { id: 1, name: 'Titanium Corp', selected: true },
    { id: 2, name: 'Platinum Industries', selected: false }
  ]},
  localidades: { name: 'Localidades', expanded: false, items: [
    { id: 1, name: 'Planta Guayaquil', company: 'Titanium Corp', selected: true },
    { id: 2, name: 'Planta Quito', company: 'Titanium Corp', selected: false },
    { id: 3, name: 'Bodega Cuenca', company: 'Platinum Industries', selected: false }
  ]},
  departamentos: { name: 'Departamentos', expanded: false, items: [
    { id: 1, name: 'Producción', selected: true },
    { id: 2, name: 'Logística', selected: true },
    { id: 3, name: 'Administración', selected: false }
  ]},
  areas: { name: 'Áreas', expanded: false, items: [
    { id: 1, name: 'Ensamblaje', department: 'Producción', selected: true },
    { id: 2, name: 'Control de Calidad', department: 'Producción', selected: false },
    { id: 3, name: 'Almacén', department: 'Logística', selected: true }
  ]},
  rolesPago: { name: 'Roles de Pago', expanded: false, items: [
    { id: 1, name: 'Mensual', selected: true },
    { id: 2, name: 'Quincenal', selected: true },
    { id: 3, name: 'Semanal', selected: false }
  ]},
  centrosCosto: { name: 'Centros de Costo', expanded: false, items: [
    { id: 1, name: 'Producción Planta 1', selected: true },
    { id: 2, name: 'Administración General', selected: false }
  ]},
  grupos: { name: 'Grupos', expanded: false, items: [
    { id: 1, name: 'Grupo Rotativo A', selected: true },
    { id: 2, name: 'Grupo Rotativo B', selected: false }
  ]},
  empleados: { name: 'Empleados', expanded: false, items: [
    { id: 1, name: 'Juan Pérez - OP001', department: 'Producción', selected: true },
    { id: 2, name: 'María García - OP002', department: 'Producción', selected: true },
    { id: 3, name: 'Pedro López - ADM001', department: 'Administración', selected: false },
    { id: 4, name: 'Ana Martínez - LOG001', department: 'Logística', selected: true }
  ]}
};

// Mock data - Permisos de Impresión agrupados
const initialReportPermissions = [
  {
    category: 'Operacionales',
    expanded: false,
    reports: [
      { id: 1, code: 'RPT_ASIST', name: 'Reporte de Asistencias', selected: true },
      { id: 2, code: 'RPT_TURNOS', name: 'Reporte de Turnos', selected: true },
      { id: 5, code: 'RPT_AUSENCIAS', name: 'Reporte de Ausencias', selected: true },
      { id: 7, code: 'RPT_MARCACIONES', name: 'Reporte de Marcaciones', selected: true }
    ]
  },
  {
    category: 'Financieros',
    expanded: false,
    reports: [
      { id: 3, code: 'RPT_NOMINA', name: 'Reporte de Nómina', selected: false },
      { id: 4, code: 'RPT_HEXT', name: 'Reporte de Horas Extras', selected: true },
      { id: 8, code: 'RPT_NOVEDADES', name: 'Reporte de Novedades', selected: true }
    ]
  },
  {
    category: 'Analíticos',
    expanded: false,
    reports: [
      { id: 6, code: 'RPT_ESTADIST', name: 'Reportes Estadísticos', selected: false }
    ]
  }
];

export default function Usuarios({ activeTab: initialTab = 'usuarios', title = 'Usuarios' }: { activeTab?: string; title?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Actualizar tab cuando cambie desde el menú
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [selectedUser, setSelectedUser] = useState('admin@titanium.com');
  const [permissions, setPermissions] = useState(initialPermissions);
  const [dataAccess, setDataAccess] = useState(initialDataAccess);
  const [reportPermissions, setReportPermissions] = useState(initialReportPermissions);
  
  // Estados para Copiar Permisos
  const [modelUser, setModelUser] = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [copyMode, setCopyMode] = useState('replace');
  const [copyActions, setCopyActions] = useState(true);
  const [copyInfo, setCopyInfo] = useState(true);
  const [copyReports, setCopyReports] = useState(true);

  // Toggle expand/collapse
  const toggleModuleExpand = (moduleIdx: number) => {
    setPermissions(prev => prev.map((mod, idx) => 
      idx === moduleIdx ? { ...mod, expanded: !mod.expanded } : mod
    ));
  };

  const toggleTransactionExpand = (moduleIdx: number, transIdx: number) => {
    setPermissions(prev => prev.map((mod, mIdx) => 
      mIdx === moduleIdx ? {
        ...mod,
        transactions: mod.transactions.map((trans, tIdx) => 
          tIdx === transIdx ? { ...trans, expanded: !trans.expanded } : trans
        )
      } : mod
    ));
  };

  // Toggle enable/disable para permisos de acciones
  const toggleModuleEnabled = (moduleIdx: number) => {
    setPermissions(prev => prev.map((mod, idx) => 
      idx === moduleIdx ? { ...mod, enabled: !mod.enabled } : mod
    ));
  };

  const toggleTransactionEnabled = (moduleIdx: number, transIdx: number) => {
    setPermissions(prev => prev.map((mod, mIdx) => 
      mIdx === moduleIdx ? {
        ...mod,
        transactions: mod.transactions.map((trans, tIdx) => 
          tIdx === transIdx ? { ...trans, enabled: !trans.enabled } : trans
        )
      } : mod
    ));
  };

  const toggleOptionEnabled = (moduleIdx: number, transIdx: number, optIdx: number) => {
    setPermissions(prev => prev.map((mod, mIdx) => 
      mIdx === moduleIdx ? {
        ...mod,
        transactions: mod.transactions.map((trans, tIdx) => 
          tIdx === transIdx ? {
            ...trans,
            options: trans.options.map((opt, oIdx) => 
              oIdx === optIdx ? { ...opt, enabled: !opt.enabled } : opt
            )
          } : trans
        )
      } : mod
    ));
  };

  // Toggle para permisos de información
  const toggleDataCategory = (category: string) => {
    setDataAccess(prev => ({
      ...prev,
      [category]: { ...prev[category], expanded: !prev[category].expanded }
    }));
  };

  const toggleDataItem = (category: string, itemId: number) => {
    setDataAccess(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        items: prev[category].items.map(item => 
          item.id === itemId ? { ...item, selected: !item.selected } : item
        )
      }
    }));
  };

  // Toggle para permisos de impresión
  const toggleReportCategory = (categoryIdx: number) => {
    setReportPermissions(prev => prev.map((cat, idx) => 
      idx === categoryIdx ? { ...cat, expanded: !cat.expanded } : cat
    ));
  };

  const toggleReport = (categoryIdx: number, reportId: number) => {
    setReportPermissions(prev => prev.map((cat, cIdx) => 
      cIdx === categoryIdx ? {
        ...cat,
        reports: cat.reports.map(rep => 
          rep.id === reportId ? { ...rep, selected: !rep.selected } : rep
        )
      } : cat
    ));
  };

  // Función para seleccionar/deseleccionar todos los registros de una categoría
  const toggleAllDataItems = (category: string, selectAll: boolean) => {
    setDataAccess(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        items: prev[category].items.map(item => ({ ...item, selected: selectAll }))
      }
    }));
  };

  // Función para copiar permisos
  const handleCopyPermissions = () => {
    if (!modelUser || !targetUser) {
      alert('Por favor seleccione un usuario modelo y un usuario destino');
      return;
    }
    
    const mode = copyMode === 'replace' ? 'reemplazados' : 'agregados';
    const types = [];
    if (copyActions) types.push('Acciones');
    if (copyInfo) types.push('Información');
    if (copyReports) types.push('Impresión');
    
    alert(`Permisos ${mode} exitosamente:\n- Tipos: ${types.join(', ')}\n- De: ${modelUser}\n- Hacia: ${targetUser}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-1">Gestión de usuarios y asignación de permisos</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* TabsList oculto ya que el menú lateral lo reemplaza */}
        <TabsList className="hidden">
          <TabsTrigger value="copiar-permisos">Copiar Permisos</TabsTrigger>
          <TabsTrigger value="acciones">Permiso de Acciones</TabsTrigger>
          <TabsTrigger value="informacion">Permisos a la Información</TabsTrigger>
          <TabsTrigger value="impresion">Permisos de Impresión</TabsTrigger>
        </TabsList>

        {/* COPIAR PERMISOS */}
        <TabsContent value="copiar-permisos" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Copiar Permisos entre Usuarios</CardTitle>
              <CardDescription>Seleccione un usuario modelo y copie sus permisos a otro usuario</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selección de usuarios */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="model-user">Usuario Modelo (Origen) *</Label>
                  <Select value={modelUser} onValueChange={setModelUser}>
                    <SelectTrigger id="model-user">
                      <SelectValue placeholder="Seleccionar usuario modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockUsers.filter(u => u.active).map(user => (
                        <SelectItem key={user.id} value={user.username}>
                          {user.name} ({user.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Usuario cuyos permisos serán copiados
                  </p>
                </div>
                <div>
                  <Label htmlFor="target-user">Usuario Destino *</Label>
                  <Select value={targetUser} onValueChange={setTargetUser}>
                    <SelectTrigger id="target-user">
                      <SelectValue placeholder="Seleccionar usuario destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockUsers.filter(u => u.active && u.username !== modelUser).map(user => (
                        <SelectItem key={user.id} value={user.username}>
                          {user.name} ({user.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Usuario que recibirá los permisos
                  </p>
                </div>
              </div>

              {/* Modo de copia */}
              <div>
                <Label className="mb-3 block">Modo de Copia</Label>
                <RadioGroup value={copyMode} onValueChange={setCopyMode}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="replace" id="replace" />
                    <Label htmlFor="replace" className="cursor-pointer">
                      Reemplazar - Eliminar permisos existentes del usuario destino y copiar todos los permisos del usuario modelo
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="add" id="add" />
                    <Label htmlFor="add" className="cursor-pointer">
                      Agregar - Mantener permisos existentes y agregar los permisos del usuario modelo
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Opciones de copia */}
              <div>
                <Label className="mb-3 block">Opciones de Copia</Label>
                <div className="space-y-3 border border-border rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="copy-actions" 
                      checked={copyActions}
                      onCheckedChange={(checked) => setCopyActions(checked as boolean)}
                    />
                    <Label htmlFor="copy-actions" className="cursor-pointer flex-1">
                      Permisos de Acciones
                    </Label>
                    <Badge variant="secondary" className="text-xs">Transacciones y opciones</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="copy-info" 
                      checked={copyInfo}
                      onCheckedChange={(checked) => setCopyInfo(checked as boolean)}
                    />
                    <Label htmlFor="copy-info" className="cursor-pointer flex-1">
                      Permisos de Información
                    </Label>
                    <Badge variant="secondary" className="text-xs">Acceso a datos</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="copy-reports" 
                      checked={copyReports}
                      onCheckedChange={(checked) => setCopyReports(checked as boolean)}
                    />
                    <Label htmlFor="copy-reports" className="cursor-pointer flex-1">
                      Permisos de Impresión (Reportes)
                    </Label>
                    <Badge variant="secondary" className="text-xs">Reportes autorizados</Badge>
                  </div>
                </div>
              </div>

              {/* Botón de acción */}
              <div className="flex justify-center pt-4">
                <Button 
                  size="lg" 
                  className="w-full max-w-md"
                  onClick={handleCopyPermissions}
                  disabled={!modelUser || !targetUser || (!copyActions && !copyInfo && !copyReports)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Permisos
                </Button>
              </div>

              {/* Información adicional */}
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <div className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                    i
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2">
                      <strong>Importante:</strong> Esta operación copiará los permisos seleccionados del usuario modelo al usuario destino.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Modo <strong>Reemplazar</strong>: Elimina todos los permisos actuales del usuario destino antes de copiar</li>
                      <li>Modo <strong>Agregar</strong>: Mantiene los permisos existentes y agrega los nuevos</li>
                      <li>Solo se copiarán las categorías seleccionadas en "Opciones de Copia"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PERMISO DE ACCIONES */}
        <TabsContent value="acciones" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Seleccionar usuario para asignar permisos de acciones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="usuario-acciones">Usuario</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger id="usuario-acciones">
                      <SelectValue placeholder="Seleccionar Usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockUsers.map(user => (
                        <SelectItem key={user.id} value={user.username}>
                          {user.name} ({user.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="export-acciones">Exportar</Label>
                  <Button id="export-acciones" variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Permisos de Transacciones y Opciones</CardTitle>
                  <CardDescription>Usuario: {mockUsers.find(u => u.username === selectedUser)?.name}</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {permissions.map((module, mIdx) => (
                  <div key={mIdx} className="mb-4 border border-border rounded-lg">
                    {/* Módulo */}
                    <div 
                      className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 cursor-pointer rounded-t-lg"
                      onClick={() => toggleModuleExpand(mIdx)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {module.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <Checkbox 
                          checked={module.enabled}
                          onCheckedChange={() => toggleModuleEnabled(mIdx)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="font-semibold">{module.module}</span>
                      </div>
                      <Badge variant={module.enabled ? "default" : "secondary"} className={module.enabled ? 'bg-green-600' : ''}>
                        {module.enabled ? 'Habilitado' : 'Deshabilitado'}
                      </Badge>
                    </div>

                    {/* Transacciones */}
                    {module.expanded && (
                      <div className="p-3 space-y-2">
                        {module.transactions.map((trans, tIdx) => (
                          <div key={tIdx} className="ml-4 border-l-2 border-border pl-3">
                            <div 
                              className="flex items-center justify-between p-2 bg-accent/20 hover:bg-accent/30 rounded cursor-pointer"
                              onClick={() => toggleTransactionExpand(mIdx, tIdx)}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                {trans.options && trans.options.length > 0 && (
                                  trans.expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                                )}
                                {(!trans.options || trans.options.length === 0) && <div className="w-3" />}
                                <Checkbox 
                                  checked={trans.enabled}
                                  onCheckedChange={() => toggleTransactionEnabled(mIdx, tIdx)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div>
                                  <span className="text-sm font-medium">{trans.name}</span>
                                  <span className="text-xs text-muted-foreground ml-2">({trans.code})</span>
                                </div>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={trans.enabled ? 'bg-green-50 text-green-700 border-green-200' : ''}
                              >
                                {trans.enabled ? 'Habilitado' : 'Deshabilitado'}
                              </Badge>
                            </div>

                            {/* Opciones */}
                            {trans.expanded && trans.options && trans.options.length > 0 && (
                              <div className="ml-6 mt-2 space-y-1">
                                {trans.options.map((opt, oIdx) => (
                                  <div key={oIdx} className="flex items-center justify-between p-2 hover:bg-accent/10 rounded">
                                    <div className="flex items-center gap-3">
                                      <Checkbox 
                                        checked={opt.enabled}
                                        onCheckedChange={() => toggleOptionEnabled(mIdx, tIdx, oIdx)}
                                      />
                                      <span className="text-sm">{opt.name}</span>
                                      <span className="text-xs text-muted-foreground">({opt.code})</span>
                                    </div>
                                    <Badge 
                                      variant="outline" 
                                      className={opt.enabled ? 'bg-green-50 text-green-600 border-green-200' : 'text-muted-foreground'}
                                    >
                                      {opt.enabled ? 'Habilitado' : 'Deshabilitado'}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PERMISOS A LA INFORMACIÓN */}
        <TabsContent value="informacion" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Seleccionar usuario para asignar permisos a la información</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="usuario-info">Usuario</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger id="usuario-info">
                      <SelectValue placeholder="Seleccionar Usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockUsers.map(user => (
                        <SelectItem key={user.id} value={user.username}>
                          {user.name} ({user.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="export-info">Exportar</Label>
                  <Button id="export-info" variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Permisos de Acceso a Datos</CardTitle>
                  <CardDescription>Usuario: {mockUsers.find(u => u.username === selectedUser)?.name}</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {Object.entries(dataAccess).map(([key, category]) => (
                  <div key={key} className="mb-3 border border-border rounded-lg">
                    <div 
                      className="flex items-center gap-3 p-3 bg-sky-50 hover:bg-sky-100 cursor-pointer rounded-t-lg"
                      onClick={() => toggleDataCategory(key)}
                    >
                      {category.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <h3 className="font-semibold text-sky-900">{category.name}</h3>
                      <Badge variant="secondary" className="ml-auto">
                        {category.items.filter(i => i.selected).length} / {category.items.length}
                      </Badge>
                    </div>
                    {category.expanded && (
                      <div className="p-3 space-y-2">
                        {/* Botones para seleccionar/deseleccionar todos */}
                        <div className="flex gap-2 pb-2 border-b border-border">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAllDataItems(key, true);
                            }}
                          >
                            Seleccionar Todos
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAllDataItems(key, false);
                            }}
                          >
                            Deseleccionar Todos
                          </Button>
                        </div>
                        {category.items.map(item => (
                          <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-accent/10 rounded">
                            <Checkbox 
                              checked={item.selected}
                              onCheckedChange={() => toggleDataItem(key, item.id)}
                            />
                            <Label className="cursor-pointer flex-1">
                              {item.name}
                              {(item as any).company && <span className="text-xs text-muted-foreground ml-2">({(item as any).company})</span>}
                              {(item as any).department && <span className="text-xs text-muted-foreground ml-2">({(item as any).department})</span>}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PERMISOS DE IMPRESIÓN */}
        <TabsContent value="impresion" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criterios de Búsqueda</CardTitle>
              <CardDescription>Seleccionar usuario para asignar permisos de impresión</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="usuario-impresion">Usuario</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger id="usuario-impresion">
                      <SelectValue placeholder="Seleccionar Usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockUsers.map(user => (
                        <SelectItem key={user.id} value={user.username}>
                          {user.name} ({user.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="export-impresion">Exportar</Label>
                  <Button id="export-impresion" variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Permisos de Reportes</CardTitle>
                  <CardDescription>Usuario: {mockUsers.find(u => u.username === selectedUser)?.name} - Los reportes mostrarán únicamente la información autorizada</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {reportPermissions.map((category, cIdx) => (
                  <div key={cIdx} className="mb-3 border border-border rounded-lg">
                    <div 
                      className="flex items-center gap-3 p-3 bg-muted/30 hover:bg-muted/50 cursor-pointer rounded-t-lg"
                      onClick={() => toggleReportCategory(cIdx)}
                    >
                      {category.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <h3 className="font-semibold">{category.category}</h3>
                      <Badge variant="secondary" className="ml-auto">
                        {category.reports.filter(r => r.selected).length} / {category.reports.length}
                      </Badge>
                    </div>
                    {category.expanded && (
                      <div className="p-3 space-y-2">
                        {category.reports.map(report => (
                          <div key={report.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/10">
                            <div className="flex items-center gap-3 flex-1">
                              <Checkbox 
                                checked={report.selected}
                                onCheckedChange={() => toggleReport(cIdx, report.id)}
                              />
                              <div>
                                <div className="font-medium">{report.name}</div>
                                <div className="text-xs text-muted-foreground">Código: {report.code}</div>
                              </div>
                            </div>
                            <Badge 
                              variant={report.selected ? "default" : "outline"}
                              className={report.selected ? 'bg-green-600' : ''}
                            >
                              {report.selected ? 'Autorizado' : 'No Autorizado'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}