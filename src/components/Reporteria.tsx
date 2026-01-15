import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { FileText, TrendingUp, Clock, Users, Download, Filter, Calendar, Search, AlertCircle, BarChart3, PieChart, FileSpreadsheet } from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

// Mock data
const mockReports = [
  { id: 1, name: 'Novedades de Asistencia Detallado', category: 'Asistencia', description: 'Detalle de marcaciones y novedades por día y empleado', filters: 'Fecha, Empresa, Departamento', lastRun: '2025-10-18 09:15' },
  { id: 2, name: 'Novedades de Asistencia Resumido', category: 'Novedades', description: 'Consolidado de novedades por empleado en el período', filters: 'Fecha, Empleado, Tipo Novedad', lastRun: '2025-10-17 14:30' },
  { id: 3, name: 'Reporte de Sobretiempos Detallado', category: 'Novedades', description: 'Detalle de horas trabajadas con valorización monetaria por día', filters: 'Fecha, Empresa, Tipo HE', lastRun: '2025-10-16 11:20' },
  { id: 4, name: 'Reporte de Sobretiempo Resumido', category: 'Novedades', description: 'Consolidado de horas y sobretiempos con valorización monetaria por empleado', filters: 'Fecha, Empresa, Departamento', lastRun: '2025-10-15 08:45' },
  { id: 5, name: 'Reporte de Turnos Trabajados', category: 'Turnos', description: 'Matriz de asistencia diaria con indicadores visuales por empleado', filters: 'Fecha, Departamento, Empleado', lastRun: '2025-10-14 16:10' },
  { id: 6, name: 'Reporte de Justificaciones', category: 'Asistencia', description: 'Permisos y justificaciones aprobadas', filters: 'Fecha, Tipo Justificación', lastRun: '2025-10-13 10:30' },
];

const mockAttendanceData = [
  { employee: 'Juan Pérez', department: 'Producción', date: '2025-10-18', checkIn: '07:05', checkOut: '15:12', hours: '8.12', status: 'Completo', novelties: 'Atraso 5min' },
  { employee: 'María García', department: 'Logística', date: '2025-10-18', checkIn: '06:58', checkOut: '15:05', hours: '8.12', status: 'Completo', novelties: '-' },
  { employee: 'Carlos López', department: 'Mantenimiento', date: '2025-10-18', checkIn: '07:02', checkOut: '17:30', hours: '10.47', status: 'Completo', novelties: 'ST50 2.5hrs' },
  { employee: 'Ana Martínez', department: 'Administración', date: '2025-10-18', checkIn: '08:00', checkOut: '17:00', hours: '9.00', status: 'Completo', novelties: '-' },
  { employee: 'Pedro Rodríguez', department: 'Producción', date: '2025-10-18', checkIn: '22:03', checkOut: '06:10', hours: '8.12', status: 'Completo', novelties: 'JN 8hrs' },
];

const mockNoveltyData = [
  { employee: 'Juan Pérez', code: 'EMP001', novelty: 'ST50 - Sobretiempo 50%', date: '2025-10-17', value: '2.5 hrs', amount: '$15.50', status: 'Aprobado' },
  { employee: 'María García', code: 'EMP002', novelty: 'ATR - Atraso', date: '2025-10-16', value: '15 min', amount: '-$2.30', status: 'Aprobado' },
  { employee: 'Carlos López', code: 'EMP003', novelty: 'JN - Jornada Nocturna', date: '2025-10-17', value: '8 hrs', amount: '$25.00', status: 'Aprobado' },
  { employee: 'Pedro Rodríguez', code: 'EMP005', novelty: 'ST100 - Sobretiempo 100%', date: '2025-10-15', value: '4 hrs', amount: '$32.00', status: 'Pendiente' },
];

// Mock data estructurado jerárquicamente para Reportes de Asistencia (Detallado y Resumido)
const mockAsistenciaJerarquica = {
  departamentos: [
    {
      nombre: 'Producción',
      areas: [
        {
          nombre: 'Fabricación',
          centrosCosto: [
            {
              codigo: 'CC-001',
              nombre: 'Línea 1',
              empleados: [
                {
                  codigo: 'EMP001',
                  nombre: 'Juan Pérez',
                  documento: '123456789',
                  cargo: 'Operario',
                  dias: [
                    { fecha: '2025-10-31', horaEntradaTurno: '07:00', horaSalidaTurno: '15:00', marcacionEntrada: '07:05', marcacionSalida: '15:02', asistencia: 'Sí', falta: '', atraso: '5 min', salidaAnticipada: '' },
                    { fecha: '2025-10-30', horaEntradaTurno: '07:00', horaSalidaTurno: '15:00', marcacionEntrada: '06:58', marcacionSalida: '15:05', asistencia: 'Sí', falta: '', atraso: '', salidaAnticipada: '' },
                    { fecha: '2025-10-29', horaEntradaTurno: '07:00', horaSalidaTurno: '15:00', marcacionEntrada: '07:00', marcacionSalida: '15:00', asistencia: 'Sí', falta: '', atraso: '', salidaAnticipada: '' },
                    { fecha: '2025-10-28', horaEntradaTurno: '07:00', horaSalidaTurno: '15:00', marcacionEntrada: '-', marcacionSalida: '-', asistencia: '', falta: 'Sí', atraso: '', salidaAnticipada: '' },
                    { fecha: '2025-10-27', horaEntradaTurno: 'LIBRE', horaSalidaTurno: 'LIBRE', marcacionEntrada: '-', marcacionSalida: '-', asistencia: 'N/A', falta: '', atraso: '', salidaAnticipada: '' },
                  ]
                },
                {
                  codigo: 'EMP002',
                  nombre: 'María García',
                  documento: '987654321',
                  cargo: 'Operaria',
                  dias: [
                    { fecha: '2025-10-31', horaEntradaTurno: '07:00', horaSalidaTurno: '15:00', marcacionEntrada: '06:55', marcacionSalida: '15:00', asistencia: 'Sí', falta: '', atraso: '', salidaAnticipada: '' },
                    { fecha: '2025-10-30', horaEntradaTurno: '07:00', horaSalidaTurno: '15:00', marcacionEntrada: '07:00', marcacionSalida: '15:10', asistencia: 'Sí', falta: '', atraso: '', salidaAnticipada: '' },
                    { fecha: '2025-10-29', horaEntradaTurno: '07:00', horaSalidaTurno: '15:00', marcacionEntrada: '07:03', marcacionSalida: '15:05', asistencia: 'Sí', falta: '', atraso: '3 min', salidaAnticipada: '' },
                    { fecha: '2025-10-28', horaEntradaTurno: '07:00', horaSalidaTurno: '15:00', marcacionEntrada: '07:02', marcacionSalida: '14:45', asistencia: 'Sí', falta: '', atraso: '2 min', salidaAnticipada: '15 min' },
                    { fecha: '2025-10-27', horaEntradaTurno: 'LIBRE', horaSalidaTurno: 'LIBRE', marcacionEntrada: '-', marcacionSalida: '-', asistencia: 'N/A', falta: '', atraso: '', salidaAnticipada: '' },
                  ]
                }
              ]
            },
            {
              codigo: 'CC-002',
              nombre: 'Línea 2',
              empleados: [
                {
                  codigo: 'EMP003',
                  nombre: 'Carlos López',
                  documento: '555666777',
                  cargo: 'Supervisor',
                  dias: [
                    { fecha: '2025-10-31', horaEntradaTurno: '07:00', horaSalidaTurno: '15:00', marcacionEntrada: '07:00', marcacionSalida: '15:00', asistencia: 'Sí', falta: '', atraso: '', salidaAnticipada: '' },
                    { fecha: '2025-10-30', horaEntradaTurno: '07:00', horaSalidaTurno: '15:00', marcacionEntrada: '06:58', marcacionSalida: '15:02', asistencia: 'Sí', falta: '', atraso: '', salidaAnticipada: '' },
                    { fecha: '2025-10-29', horaEntradaTurno: '07:00', horaSalidaTurno: '15:00', marcacionEntrada: '07:00', marcacionSalida: '17:30', asistencia: 'Sí', falta: '', atraso: '', salidaAnticipada: '' },
                    { fecha: '2025-10-28', horaEntradaTurno: '07:00', horaSalidaTurno: '15:00', marcacionEntrada: '07:01', marcacionSalida: '15:05', asistencia: 'Sí', falta: '', atraso: '1 min', salidaAnticipada: '' },
                    { fecha: '2025-10-27', horaEntradaTurno: 'LIBRE', horaSalidaTurno: 'LIBRE', marcacionEntrada: '-', marcacionSalida: '-', asistencia: 'N/A', falta: '', atraso: '', salidaAnticipada: '' },
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      nombre: 'Logística',
      areas: [
        {
          nombre: 'Almacén',
          centrosCosto: [
            {
              codigo: 'CC-010',
              nombre: 'Despachos',
              empleados: [
                {
                  codigo: 'EMP010',
                  nombre: 'Ana Martínez',
                  documento: '111222333',
                  cargo: 'Auxiliar de Almacén',
                  dias: [
                    { fecha: '2025-10-31', horaEntradaTurno: '08:00', horaSalidaTurno: '17:00', marcacionEntrada: '08:00', marcacionSalida: '17:00', asistencia: 'Sí', falta: '', atraso: '', salidaAnticipada: '' },
                    { fecha: '2025-10-30', horaEntradaTurno: '08:00', horaSalidaTurno: '17:00', marcacionEntrada: '08:05', marcacionSalida: '17:02', asistencia: 'Sí', falta: '', atraso: '5 min', salidaAnticipada: '' },
                    { fecha: '2025-10-29', horaEntradaTurno: '08:00', horaSalidaTurno: '17:00', marcacionEntrada: '07:58', marcacionSalida: '17:00', asistencia: 'Sí', falta: '', atraso: '', salidaAnticipada: '' },
                    { fecha: '2025-10-28', horaEntradaTurno: '08:00', horaSalidaTurno: '17:00', marcacionEntrada: '08:00', marcacionSalida: '17:00', asistencia: 'Sí', falta: '', atraso: '', salidaAnticipada: '' },
                    { fecha: '2025-10-27', horaEntradaTurno: 'LIBRE', horaSalidaTurno: 'LIBRE', marcacionEntrada: '-', marcacionSalida: '-', asistencia: 'N/A', falta: '', atraso: '', salidaAnticipada: '' },
                  ]
                },
                {
                  codigo: 'EMP011',
                  nombre: 'Pedro Rodríguez',
                  documento: '444555666',
                  cargo: 'Jefe de Almacén',
                  dias: [
                    { fecha: '2025-10-31', horaEntradaTurno: '08:00', horaSalidaTurno: '17:00', marcacionEntrada: '07:55', marcacionSalida: '17:05', asistencia: 'Sí', falta: '', atraso: '', salidaAnticipada: '' },
                    { fecha: '2025-10-30', horaEntradaTurno: '08:00', horaSalidaTurno: '17:00', marcacionEntrada: '08:00', marcacionSalida: '17:00', asistencia: 'Sí', falta: '', atraso: '', salidaAnticipada: '' },
                    { fecha: '2025-10-29', horaEntradaTurno: '08:00', horaSalidaTurno: '17:00', marcacionEntrada: '08:10', marcacionSalida: '17:00', asistencia: 'Sí', falta: '', atraso: '10 min', salidaAnticipada: '' },
                    { fecha: '2025-10-28', horaEntradaTurno: '08:00', horaSalidaTurno: '17:00', marcacionEntrada: '-', marcacionSalida: '-', asistencia: '', falta: 'Sí', atraso: '', salidaAnticipada: '' },
                    { fecha: '2025-10-27', horaEntradaTurno: 'LIBRE', horaSalidaTurno: 'LIBRE', marcacionEntrada: '-', marcacionSalida: '-', asistencia: 'N/A', falta: '', atraso: '', salidaAnticipada: '' },
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// Mock data para Reporte de Sobretiempos Detallado con valorización
const mockSobretiemposJerarquica = {
  departamentos: [
    {
      nombre: 'Producción',
      areas: [
        {
          nombre: 'Fabricación',
          centrosCosto: [
            {
              codigo: 'CC-001',
              nombre: 'Línea 1',
              empleados: [
                {
                  codigo: 'EMP001',
                  nombre: 'Juan Pérez',
                  documento: '123456789',
                  cargo: 'Operario',
                  valorHoraOrdinaria: 5.25,
                  dias: [
                    { fecha: '2025-10-31', hrsOrdinarias: 8.0, hrsNocturnas: 0, st50: 1.5, st100Jornada: 0, st100Libre: 0 },
                    { fecha: '2025-10-30', hrsOrdinarias: 8.0, hrsNocturnas: 0, st50: 2.0, st100Jornada: 0, st100Libre: 0 },
                    { fecha: '2025-10-29', hrsOrdinarias: 8.0, hrsNocturnas: 0, st50: 0, st100Jornada: 0, st100Libre: 0 },
                    { fecha: '2025-10-28', hrsOrdinarias: 0, hrsNocturnas: 0, st50: 0, st100Jornada: 0, st100Libre: 0 },
                    { fecha: '2025-10-27', hrsOrdinarias: 0, hrsNocturnas: 0, st50: 0, st100Jornada: 0, st100Libre: 4.0 },
                  ]
                },
                {
                  codigo: 'EMP002',
                  nombre: 'María García',
                  documento: '987654321',
                  cargo: 'Operaria',
                  valorHoraOrdinaria: 5.25,
                  dias: [
                    { fecha: '2025-10-31', hrsOrdinarias: 8.0, hrsNocturnas: 0, st50: 0, st100Jornada: 0, st100Libre: 0 },
                    { fecha: '2025-10-30', hrsOrdinarias: 8.0, hrsNocturnas: 0, st50: 0.5, st100Jornada: 0, st100Libre: 0 },
                    { fecha: '2025-10-29', hrsOrdinarias: 8.0, hrsNocturnas: 0, st50: 0, st100Jornada: 0, st100Libre: 0 },
                    { fecha: '2025-10-28', hrsOrdinarias: 8.0, hrsNocturnas: 0, st50: 0, st100Jornada: 0, st100Libre: 0 },
                    { fecha: '2025-10-27', hrsOrdinarias: 0, hrsNocturnas: 0, st50: 0, st100Jornada: 0, st100Libre: 0 },
                  ]
                }
              ]
            },
            {
              codigo: 'CC-002',
              nombre: 'Línea 2',
              empleados: [
                {
                  codigo: 'EMP003',
                  nombre: 'Carlos López',
                  documento: '555666777',
                  cargo: 'Supervisor',
                  valorHoraOrdinaria: 7.50,
                  dias: [
                    { fecha: '2025-10-31', hrsOrdinarias: 8.0, hrsNocturnas: 0, st50: 2.5, st100Jornada: 0, st100Libre: 0 },
                    { fecha: '2025-10-30', hrsOrdinarias: 8.0, hrsNocturnas: 0, st50: 0, st100Jornada: 0, st100Libre: 0 },
                    { fecha: '2025-10-29', hrsOrdinarias: 8.0, hrsNocturnas: 0, st50: 0, st100Jornada: 2.5, st100Libre: 0 },
                    { fecha: '2025-10-28', hrsOrdinarias: 8.0, hrsNocturnas: 0, st50: 0, st100Jornada: 0, st100Libre: 0 },
                    { fecha: '2025-10-27', hrsOrdinarias: 0, hrsNocturnas: 0, st50: 0, st100Jornada: 0, st100Libre: 0 },
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      nombre: 'Logística',
      areas: [
        {
          nombre: 'Almacén',
          centrosCosto: [
            {
              codigo: 'CC-010',
              nombre: 'Despachos',
              empleados: [
                {
                  codigo: 'EMP010',
                  nombre: 'Ana Martínez',
                  documento: '111222333',
                  cargo: 'Auxiliar de Almacén',
                  valorHoraOrdinaria: 5.00,
                  dias: [
                    { fecha: '2025-10-31', hrsOrdinarias: 9.0, hrsNocturnas: 0, st50: 1.0, st100Jornada: 0, st100Libre: 0 },
                    { fecha: '2025-10-30', hrsOrdinarias: 9.0, hrsNocturnas: 0, st50: 1.0, st100Jornada: 0, st100Libre: 0 },
                    { fecha: '2025-10-29', hrsOrdinarias: 9.0, hrsNocturnas: 0, st50: 1.0, st100Jornada: 0, st100Libre: 0 },
                    { fecha: '2025-10-28', hrsOrdinarias: 9.0, hrsNocturnas: 0, st50: 1.0, st100Jornada: 0, st100Libre: 0 },
                    { fecha: '2025-10-27', hrsOrdinarias: 0, hrsNocturnas: 0, st50: 0, st100Jornada: 0, st100Libre: 0 },
                  ]
                },
                {
                  codigo: 'EMP011',
                  nombre: 'Pedro Rodríguez',
                  documento: '444555666',
                  cargo: 'Jefe de Almacén',
                  valorHoraOrdinaria: 8.00,
                  dias: [
                    { fecha: '2025-10-31', hrsOrdinarias: 9.0, hrsNocturnas: 0, st50: 1.0, st100Jornada: 0, st100Libre: 0 },
                    { fecha: '2025-10-30', hrsOrdinarias: 9.0, hrsNocturnas: 0, st50: 1.0, st100Jornada: 0, st100Libre: 0 },
                    { fecha: '2025-10-29', hrsOrdinarias: 0, hrsNocturnas: 8.0, st50: 0, st100Jornada: 1.0, st100Libre: 0 },
                    { fecha: '2025-10-28', hrsOrdinarias: 0, hrsNocturnas: 0, st50: 0, st100Jornada: 0, st100Libre: 0 },
                    { fecha: '2025-10-27', hrsOrdinarias: 0, hrsNocturnas: 0, st50: 0, st100Jornada: 0, st100Libre: 0 },
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

export default function Reporteria({ activeTab: initialTab = 'disponibles', title = 'Reportes' }: { activeTab?: string; title?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Actualizar tab cuando cambie desde el menú
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  
  // Estados para filtros de Reportes Disponibles
  const [empresa, setEmpresa] = useState('all');
  const [localidad, setLocalidad] = useState('all');
  const [departamento, setDepartamento] = useState('all');
  const [area, setArea] = useState('all');
  const [centroCostos, setCentroCostos] = useState('all');
  const [rolPago, setRolPago] = useState('all');
  const [grupo, setGrupo] = useState('all');
  const [fechaInicio, setFechaInicio] = useState('2025-10-01');
  const [fechaFin, setFechaFin] = useState('2025-10-31');

  const filteredReports = mockReports.filter(report => {
    const matchesCategory = selectedCategory === 'all' || report.category === selectedCategory;
    const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ['Asistencia', 'Novedades', 'Turnos', 'Analítico'];

  // Función para generar el Reporte de Asistencia General en PDF
  const generarReporteAsistenciaGeneral = () => {
    toast.info('Generando reporte...', { description: 'Por favor espere' });

    // Obtener nombres de filtros para cabecera
    const getEmpresaName = () => empresa === 'all' ? 'Todas' : 'Titanium Corp';
    const getLocalidadName = () => localidad === 'all' ? 'Todas' : localidad === 'bogota' ? 'Bogotá' : 'Medellín';
    const getDepartamentoName = () => departamento === 'all' ? 'Todos' : departamento === 'prod' ? 'Producción' : 'Logística';
    const getAreaName = () => area === 'all' ? 'Todas' : area === 'fabricacion' ? 'Fabricación' : 'Almacén';
    const getCCName = () => centroCostos === 'all' ? 'Todos' : centroCostos;
    
    // Crear instancia de jsPDF
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // CABECERA DEL REPORTE
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 116, 217);
    doc.text('NOVEDADES DE ASISTENCIA DETALLADO', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 116, 217);
    doc.text(getEmpresaName(), pageWidth / 2, 25, { align: 'center' });
    
    // CRITERIOS DE BÚSQUEDA - Mejor distribuidos
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Criterios de Búsqueda', 15, 40);
    
    // Línea divisoria
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 42, pageWidth - 15, 42);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    // Primera fila de criterios (distribución horizontal mejor)
    const col1 = 20;
    const col2 = 90;
    const col3 = 160;
    const col4 = 230;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Empresa:', col1, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(getEmpresaName(), col1 + 20, 50);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Localidad:', col2, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(getLocalidadName(), col2 + 22, 50);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Departamento:', col3, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(getDepartamentoName(), col3 + 28, 50);
    
    // Segunda fila de criterios
    doc.setFont('helvetica', 'bold');
    doc.text('Área:', col1, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(getAreaName(), col1 + 12, 56);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Centro de Costos:', col2, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(getCCName(), col2 + 35, 56);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Rol de Pago:', col3, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(rolPago === 'all' ? 'Todos' : rolPago, col3 + 25, 56);
    
    // Tercera fila de criterios
    doc.setFont('helvetica', 'bold');
    doc.text('Grupo:', col1, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(grupo === 'all' ? 'Todos' : grupo, col1 + 15, 62);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Período:', col2, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(`${fechaInicio} a ${fechaFin}`, col2 + 18, 62);
    
    // CONTENIDO JERÁRQUICO
    let y = 75;
    mockAsistenciaJerarquica.departamentos.forEach((dept, deptIndex) => {
      // QUIEBRE DE DEPARTAMENTO
      if (deptIndex > 0) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 116, 217);
      doc.setFillColor(232, 244, 255);
      doc.rect(15, y - 5, pageWidth - 30, 8, 'F');
      doc.text(`DEPARTAMENTO: ${dept.nombre}`, 20, y);
      y += 12;
      
      dept.areas.forEach((area) => {
        // QUIEBRE DE ÁREA
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 91, 161);
        doc.setFillColor(240, 248, 255);
        doc.rect(15, y - 5, pageWidth - 30, 7, 'F');
        doc.text(`ÁREA: ${area.nombre}`, 20, y);
        y += 10;
        
        area.centrosCosto.forEach((cc) => {
          // QUIEBRE DE CENTRO DE COSTO
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bolditalic');
          doc.setTextColor(51, 51, 51);
          doc.text(`CENTRO DE COSTOS: ${cc.codigo} - ${cc.nombre}`, 20, y);
          y += 8;
          
          // EMPLEADOS
          cc.empleados.forEach((empleado) => {
            // Verificar si necesitamos nueva página
            if (y > 180) {
              doc.addPage();
              y = 20;
            }
            
            // DATOS DEL EMPLEADO - Mejor distribuidos horizontalmente
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            
            const empCol1 = 25;
            const empCol2 = 95;
            const empCol3 = 165;
            const empCol4 = 235;
            
            doc.text('Código:', empCol1, y);
            doc.setFont('helvetica', 'normal');
            doc.text(empleado.codigo, empCol1 + 15, y);
            
            doc.setFont('helvetica', 'bold');
            doc.text('Nombre:', empCol2, y);
            doc.setFont('helvetica', 'normal');
            doc.text(empleado.nombre, empCol2 + 16, y);
            
            doc.setFont('helvetica', 'bold');
            doc.text('Documento:', empCol3, y);
            doc.setFont('helvetica', 'normal');
            doc.text(empleado.documento, empCol3 + 23, y);
            
            doc.setFont('helvetica', 'bold');
            doc.text('Cargo:', empCol4, y);
            doc.setFont('helvetica', 'normal');
            doc.text(empleado.cargo, empCol4 + 13, y);
            
            y += 6;
            
            // TABLA DE DÍAS
            const tableBody: any[] = [];
            
            // Encabezado de tabla
            tableBody.push([
              { content: 'Fecha', styles: { fontSize: 8, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: 'H. Entrada\nTurno', styles: { fontSize: 8, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: 'H. Salida\nTurno', styles: { fontSize: 8, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: 'Marcación\nEntrada', styles: { fontSize: 8, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: 'Marcación\nSalida', styles: { fontSize: 8, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: 'Asistencia', styles: { fontSize: 8, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: 'Falta', styles: { fontSize: 8, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: 'Atraso', styles: { fontSize: 8, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: 'Salida\nAnticipada', styles: { fontSize: 8, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } }
            ]);
            
            // Filas de días (ordenadas descendentemente por fecha)
            empleado.dias.forEach((dia) => {
              tableBody.push([
                { content: dia.fecha, styles: { fontSize: 8 } },
                { content: dia.horaEntradaTurno, styles: { fontSize: 8, halign: 'center' } },
                { content: dia.horaSalidaTurno, styles: { fontSize: 8, halign: 'center' } },
                { content: dia.marcacionEntrada, styles: { fontSize: 8, halign: 'center' } },
                { content: dia.marcacionSalida, styles: { fontSize: 8, halign: 'center' } },
                { content: dia.asistencia, styles: { fontSize: 8, halign: 'center', textColor: dia.asistencia === 'Sí' ? 'green' : 'black' } },
                { content: dia.falta, styles: { fontSize: 8, halign: 'center', textColor: dia.falta === 'Sí' ? 'red' : 'black' } },
                { content: dia.atraso, styles: { fontSize: 8, halign: 'center', textColor: dia.atraso ? 'orange' : 'black' } },
                { content: dia.salidaAnticipada, styles: { fontSize: 8, halign: 'center', textColor: dia.salidaAnticipada ? 'orange' : 'black' } }
              ]);
            });
            
            // Generar tabla
            autoTable(doc, {
              head: [tableBody[0]],
              body: tableBody.slice(1),
              startY: y,
              theme: 'grid',
              headStyles: { fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' },
              bodyStyles: { fillColor: '#f0f0f0' },
              alternateRowStyles: { fillColor: '#ffffff' },
              columnStyles: {
                0: { halign: 'left' },
                1: { halign: 'center' },
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'center' },
                5: { halign: 'center' },
                6: { halign: 'center' },
                7: { halign: 'center' },
                8: { halign: 'center' }
              },
              margin: { top: 5, bottom: 5 },
              didDrawPage: function (data) {
                // Footer
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor('#000000');
                doc.text(`Página ${data.pageNumber} de ${data.pageCount} - Generado el ${new Date().toLocaleDateString('es-ES', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}`, data.settings.margin.left, data.settings.margin.top - 10);
              }
            });
            
            // Actualizar posición y
            y = doc.lastAutoTable.finalY + 10;
          });
        });
      });
    });
    
    // Generar y descargar el PDF
    doc.save(`Novedades_Asistencia_Detallado_${fechaInicio}_${fechaFin}.pdf`);
    
    toast.success('Reporte generado exitosamente', {
      description: 'El archivo PDF se ha descargado'
    });
  };

  // Función para generar el Reporte de Novedades de Asistencia Resumido en PDF
  const generarReporteAsistenciaResumido = () => {
    toast.info('Generando reporte...', { description: 'Por favor espere' });

    // Obtener nombres de filtros para cabecera
    const getEmpresaName = () => empresa === 'all' ? 'Todas' : 'Titanium Corp';
    const getLocalidadName = () => localidad === 'all' ? 'Todas' : localidad === 'bogota' ? 'Bogotá' : 'Medellín';
    const getDepartamentoName = () => departamento === 'all' ? 'Todos' : departamento === 'prod' ? 'Producción' : 'Logística';
    const getAreaName = () => area === 'all' ? 'Todas' : area === 'fabricacion' ? 'Fabricación' : 'Almacén';
    const getCCName = () => centroCostos === 'all' ? 'Todos' : centroCostos;
    
    // Crear instancia de jsPDF
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // CABECERA DEL REPORTE
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 116, 217);
    doc.text('NOVEDADES DE ASISTENCIA RESUMIDO', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 116, 217);
    doc.text(getEmpresaName(), pageWidth / 2, 25, { align: 'center' });
    
    // CRITERIOS DE BÚSQUEDA - Mejor distribuidos
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Criterios de Búsqueda', 15, 40);
    
    // Línea divisoria
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 42, pageWidth - 15, 42);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    // Primera fila de criterios (distribución horizontal mejor)
    const col1 = 20;
    const col2 = 90;
    const col3 = 160;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Empresa:', col1, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(getEmpresaName(), col1 + 20, 50);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Localidad:', col2, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(getLocalidadName(), col2 + 22, 50);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Departamento:', col3, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(getDepartamentoName(), col3 + 28, 50);
    
    // Segunda fila de criterios
    doc.setFont('helvetica', 'bold');
    doc.text('Área:', col1, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(getAreaName(), col1 + 12, 56);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Centro de Costos:', col2, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(getCCName(), col2 + 35, 56);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Rol de Pago:', col3, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(rolPago === 'all' ? 'Todos' : rolPago, col3 + 25, 56);
    
    // Tercera fila de criterios
    doc.setFont('helvetica', 'bold');
    doc.text('Grupo:', col1, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(grupo === 'all' ? 'Todos' : grupo, col1 + 15, 62);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Período:', col2, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(`${fechaInicio} a ${fechaFin}`, col2 + 18, 62);
    
    // CONTENIDO JERÁRQUICO RESUMIDO
    let y = 75;
    mockAsistenciaJerarquica.departamentos.forEach((dept, deptIndex) => {
      // QUIEBRE DE DEPARTAMENTO
      if (deptIndex > 0) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 116, 217);
      doc.setFillColor(232, 244, 255);
      doc.rect(15, y - 5, pageWidth - 30, 8, 'F');
      doc.text(`DEPARTAMENTO: ${dept.nombre}`, 20, y);
      y += 12;
      
      dept.areas.forEach((area) => {
        // QUIEBRE DE ÁREA
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 91, 161);
        doc.setFillColor(240, 248, 255);
        doc.rect(15, y - 5, pageWidth - 30, 7, 'F');
        doc.text(`ÁREA: ${area.nombre}`, 20, y);
        y += 10;
        
        area.centrosCosto.forEach((cc) => {
          // QUIEBRE DE CENTRO DE COSTO
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bolditalic');
          doc.setTextColor(51, 51, 51);
          doc.text(`CENTRO DE COSTOS: ${cc.codigo} - ${cc.nombre}`, 20, y);
          y += 8;
          
          // Verificar si necesitamos nueva página
          if (y > 160) {
            doc.addPage();
            y = 20;
          }
          
          // TABLA RESUMIDA DE EMPLEADOS
          const tableBody: any[] = [];
          
          // Encabezado de tabla - Columnas bien distribuidas
          tableBody.push([
            { content: 'Código', styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'Nombre', styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'Cargo', styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'Asist.', styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'Faltas', styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'Atrasos', styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'Sal.\nAnt.', styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'H.\nOrd.', styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'H.\nNoct.', styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'HE\n50%', styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'HE 100%\nJornada', styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'HE 100%\nDía Libre', styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } }
          ]);
          
          // Filas de empleados con datos consolidados
          cc.empleados.forEach((empleado) => {
            // Calcular totales del período
            let totalAsistencias = 0;
            let totalFaltas = 0;
            let totalAtrasos = 0;
            let totalSalidasAnticipadas = 0;
            
            empleado.dias.forEach((dia) => {
              if (dia.asistencia === 'Sí') totalAsistencias++;
              if (dia.falta === 'Sí') totalFaltas++;
              if (dia.atraso) totalAtrasos++;
              if (dia.salidaAnticipada) totalSalidasAnticipadas++;
            });
            
            // Horas simuladas (en producción vienen de cálculos reales)
            const horasOrdinarias = totalAsistencias * 8;
            const horasNocturnas = empleado.codigo === 'EMP005' ? 32 : 0;
            const he50 = empleado.codigo === 'EMP001' ? 2.5 : empleado.codigo === 'EMP003' ? 5.0 : 0;
            const he100Jornada = empleado.codigo === 'EMP003' ? 4.0 : 0;
            const he100DiaLibre = 0;
            
            tableBody.push([
              { content: empleado.codigo, styles: { fontSize: 7 } },
              { content: empleado.nombre, styles: { fontSize: 7 } },
              { content: empleado.cargo, styles: { fontSize: 7 } },
              { content: totalAsistencias.toString(), styles: { fontSize: 7, halign: 'center', textColor: totalAsistencias > 0 ? 'green' : 'black' } },
              { content: totalFaltas.toString(), styles: { fontSize: 7, halign: 'center', textColor: totalFaltas > 0 ? 'red' : 'black' } },
              { content: totalAtrasos.toString(), styles: { fontSize: 7, halign: 'center', textColor: totalAtrasos > 0 ? 'orange' : 'black' } },
              { content: totalSalidasAnticipadas.toString(), styles: { fontSize: 7, halign: 'center', textColor: totalSalidasAnticipadas > 0 ? 'orange' : 'black' } },
              { content: horasOrdinarias.toFixed(1), styles: { fontSize: 7, halign: 'center' } },
              { content: horasNocturnas.toFixed(1), styles: { fontSize: 7, halign: 'center' } },
              { content: he50.toFixed(1), styles: { fontSize: 7, halign: 'center' } },
              { content: he100Jornada.toFixed(1), styles: { fontSize: 7, halign: 'center' } },
              { content: he100DiaLibre.toFixed(1), styles: { fontSize: 7, halign: 'center' } }
            ]);
          });
          
          // Generar tabla
          autoTable(doc, {
            head: [tableBody[0]],
            body: tableBody.slice(1),
            startY: y,
            theme: 'grid',
            headStyles: { fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' },
            bodyStyles: { fillColor: '#f0f0f0' },
            alternateRowStyles: { fillColor: '#ffffff' },
            columnStyles: {
              0: { cellWidth: 18 },
              1: { cellWidth: 40 },
              2: { cellWidth: 35 },
              3: { cellWidth: 15, halign: 'center' },
              4: { cellWidth: 15, halign: 'center' },
              5: { cellWidth: 17, halign: 'center' },
              6: { cellWidth: 15, halign: 'center' },
              7: { cellWidth: 15, halign: 'center' },
              8: { cellWidth: 15, halign: 'center' },
              9: { cellWidth: 15, halign: 'center' },
              10: { cellWidth: 22, halign: 'center' },
              11: { cellWidth: 22, halign: 'center' }
            },
            margin: { left: 15, right: 15 },
            didDrawPage: function (data) {
              // Footer
              doc.setFontSize(8);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(0, 0, 0);
              const pageNum = doc.internal.pages.length - 1;
              doc.text(`Página ${pageNum} - Generado el ${new Date().toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}`, 15, doc.internal.pageSize.getHeight() - 10);
            }
          });
          
          // Actualizar posición y
          y = (doc as any).lastAutoTable.finalY + 10;
        });
      });
    });
    
    // Generar y descargar el PDF
    doc.save(`Novedades_Asistencia_Resumido_${fechaInicio}_${fechaFin}.pdf`);
    
    toast.success('Reporte generado exitosamente', {
      description: 'El archivo PDF se ha descargado'
    });
  };

  // Función para generar el Reporte de Sobretiempos Detallado en PDF
  const generarReporteSobretiemposDetallado = () => {
    toast.info('Generando reporte...', { description: 'Por favor espere' });

    // Obtener nombres de filtros para cabecera
    const getEmpresaName = () => empresa === 'all' ? 'Todas' : 'Titanium Corp';
    const getLocalidadName = () => localidad === 'all' ? 'Todas' : localidad === 'bogota' ? 'Bogotá' : 'Medellín';
    const getDepartamentoName = () => departamento === 'all' ? 'Todos' : departamento === 'prod' ? 'Producción' : 'Logística';
    const getAreaName = () => area === 'all' ? 'Todas' : area === 'fabricacion' ? 'Fabricación' : 'Almacén';
    const getCCName = () => centroCostos === 'all' ? 'Todos' : centroCostos;
    
    // Crear instancia de jsPDF
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // CABECERA DEL REPORTE
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 116, 217);
    doc.text('REPORTE DE SOBRETIEMPOS DETALLADO', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 116, 217);
    doc.text(getEmpresaName(), pageWidth / 2, 25, { align: 'center' });
    
    // CRITERIOS DE BÚSQUEDA
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Criterios de Búsqueda', 15, 40);
    
    // Línea divisoria
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 42, pageWidth - 15, 42);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    // Distribución horizontal de criterios
    const col1 = 20;
    const col2 = 90;
    const col3 = 160;
    const col4 = 230;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Empresa:', col1, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(getEmpresaName(), col1 + 20, 50);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Localidad:', col2, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(getLocalidadName(), col2 + 22, 50);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Departamento:', col3, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(getDepartamentoName(), col3 + 28, 50);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Período:', col4, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`${fechaInicio} - ${fechaFin}`, col4 + 18, 50);
    
    // Segunda fila
    doc.setFont('helvetica', 'bold');
    doc.text('Área:', col1, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(getAreaName(), col1 + 12, 56);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Centro de Costos:', col2, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(getCCName(), col2 + 35, 56);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Rol de Pago:', col3, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(rolPago === 'all' ? 'Todos' : rolPago, col3 + 25, 56);
    
    // Tercera fila
    doc.setFont('helvetica', 'bold');
    doc.text('Grupo:', col1, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(grupo === 'all' ? 'Todos' : grupo, col1 + 15, 62);
    
    // CONTENIDO JERÁRQUICO
    let y = 75;
    mockSobretiemposJerarquica.departamentos.forEach((dept, deptIndex) => {
      // QUIEBRE DE DEPARTAMENTO
      if (deptIndex > 0) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 116, 217);
      doc.setFillColor(232, 244, 255);
      doc.rect(15, y - 5, pageWidth - 30, 8, 'F');
      doc.text(`DEPARTAMENTO: ${dept.nombre}`, 20, y);
      y += 12;
      
      dept.areas.forEach((area) => {
        // QUIEBRE DE ÁREA
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 91, 161);
        doc.setFillColor(240, 248, 255);
        doc.rect(15, y - 5, pageWidth - 30, 7, 'F');
        doc.text(`ÁREA: ${area.nombre}`, 20, y);
        y += 10;
        
        area.centrosCosto.forEach((cc) => {
          // QUIEBRE DE CENTRO DE COSTO
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bolditalic');
          doc.setTextColor(51, 51, 51);
          doc.text(`CENTRO DE COSTOS: ${cc.codigo} - ${cc.nombre}`, 20, y);
          y += 8;
          
          cc.empleados.forEach((empleado) => {
            // Verificar si necesitamos nueva página
            if (y > 160) {
              doc.addPage();
              y = 20;
            }
            
            // Datos del empleado
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.setFillColor(250, 250, 250);
            doc.rect(15, y - 4, pageWidth - 30, 10, 'F');
            
            const empCol1 = 20;
            const empCol2 = 90;
            const empCol3 = 160;
            const empCol4 = 230;
            
            doc.text(`Código: ${empleado.codigo}`, empCol1, y);
            doc.text(`Nombre: ${empleado.nombre}`, empCol2, y);
            doc.text(`Documento: ${empleado.documento}`, empCol3, y);
            doc.text(`Cargo: ${empleado.cargo}`, empCol4, y);
            
            y += 10;
            
            // TABLA DE DÍAS CON HORAS Y VALORES SEPARADOS
            const tableBody: any[] = [];
            
            // Encabezado de tabla con dos filas: títulos principales y subcolumnas
            const headerRow1 = [
              { content: 'Fecha', rowSpan: 2, styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center', valign: 'middle' } },
              { content: 'H. Ord.', colSpan: 2, styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: 'H. Noct.', colSpan: 2, styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: 'ST 50%', colSpan: 2, styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: 'ST 100% Jorn.', colSpan: 2, styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: 'ST 100% Libre', colSpan: 2, styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: 'TOTAL', colSpan: 2, styles: { fontSize: 7, fillColor: '#2ECC71', textColor: '#ffffff', halign: 'center', fontStyle: 'bold' } }
            ];
            
            const headerRow2 = [
              { content: 'Hrs', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: '$', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: 'Hrs', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: '$', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: 'Hrs', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: '$', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: 'Hrs', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: '$', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: 'Hrs', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: '$', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
              { content: 'Hrs', styles: { fontSize: 6, fillColor: '#2ECC71', textColor: '#ffffff', halign: 'center', fontStyle: 'bold' } },
              { content: '$', styles: { fontSize: 6, fillColor: '#2ECC71', textColor: '#ffffff', halign: 'center', fontStyle: 'bold' } }
            ];
            
            // Variables para totales
            let totalHrsOrdinarias = 0;
            let totalHrsNocturnas = 0;
            let totalSt50 = 0;
            let totalSt100Jornada = 0;
            let totalSt100Libre = 0;
            let totalValorOrdinarias = 0;
            let totalValorNocturnas = 0;
            let totalValorSt50 = 0;
            let totalValorSt100Jornada = 0;
            let totalValorSt100Libre = 0;
            
            // Filas de días
            empleado.dias.forEach((dia) => {
              // Cálculos monetarios
              const valorOrdinarias = dia.hrsOrdinarias * empleado.valorHoraOrdinaria;
              const valorNocturnas = dia.hrsNocturnas * empleado.valorHoraOrdinaria * 1.35; // Recargo 35%
              const valorSt50 = dia.st50 * empleado.valorHoraOrdinaria * 1.5;
              const valorSt100Jornada = dia.st100Jornada * empleado.valorHoraOrdinaria * 2.0;
              const valorSt100Libre = dia.st100Libre * empleado.valorHoraOrdinaria * 2.0;
              
              // Totales del día
              const totalHrsDia = dia.hrsOrdinarias + dia.hrsNocturnas + dia.st50 + dia.st100Jornada + dia.st100Libre;
              const totalValorDia = valorOrdinarias + valorNocturnas + valorSt50 + valorSt100Jornada + valorSt100Libre;
              
              // Acumular totales
              totalHrsOrdinarias += dia.hrsOrdinarias;
              totalHrsNocturnas += dia.hrsNocturnas;
              totalSt50 += dia.st50;
              totalSt100Jornada += dia.st100Jornada;
              totalSt100Libre += dia.st100Libre;
              totalValorOrdinarias += valorOrdinarias;
              totalValorNocturnas += valorNocturnas;
              totalValorSt50 += valorSt50;
              totalValorSt100Jornada += valorSt100Jornada;
              totalValorSt100Libre += valorSt100Libre;
              
              tableBody.push([
                { content: dia.fecha, styles: { fontSize: 6 } },
                { content: dia.hrsOrdinarias > 0 ? dia.hrsOrdinarias.toFixed(1) : '-', styles: { fontSize: 6, halign: 'center' } },
                { content: dia.hrsOrdinarias > 0 ? `$${valorOrdinarias.toFixed(2)}` : '-', styles: { fontSize: 6, halign: 'right' } },
                { content: dia.hrsNocturnas > 0 ? dia.hrsNocturnas.toFixed(1) : '-', styles: { fontSize: 6, halign: 'center' } },
                { content: dia.hrsNocturnas > 0 ? `$${valorNocturnas.toFixed(2)}` : '-', styles: { fontSize: 6, halign: 'right' } },
                { content: dia.st50 > 0 ? dia.st50.toFixed(1) : '-', styles: { fontSize: 6, halign: 'center' } },
                { content: dia.st50 > 0 ? `$${valorSt50.toFixed(2)}` : '-', styles: { fontSize: 6, halign: 'right' } },
                { content: dia.st100Jornada > 0 ? dia.st100Jornada.toFixed(1) : '-', styles: { fontSize: 6, halign: 'center' } },
                { content: dia.st100Jornada > 0 ? `$${valorSt100Jornada.toFixed(2)}` : '-', styles: { fontSize: 6, halign: 'right' } },
                { content: dia.st100Libre > 0 ? dia.st100Libre.toFixed(1) : '-', styles: { fontSize: 6, halign: 'center' } },
                { content: dia.st100Libre > 0 ? `$${valorSt100Libre.toFixed(2)}` : '-', styles: { fontSize: 6, halign: 'right' } },
                { content: totalHrsDia.toFixed(1), styles: { fontSize: 6, halign: 'center', fontStyle: 'bold', fillColor: '#E8F5E9' } },
                { content: `$${totalValorDia.toFixed(2)}`, styles: { fontSize: 6, halign: 'right', fontStyle: 'bold', fillColor: '#E8F5E9' } }
              ]);
            });
            
            // Calcular totales generales
            const totalHrsEmpleado = totalHrsOrdinarias + totalHrsNocturnas + totalSt50 + totalSt100Jornada + totalSt100Libre;
            const totalValorEmpleado = totalValorOrdinarias + totalValorNocturnas + totalValorSt50 + totalValorSt100Jornada + totalValorSt100Libre;
            
            // Fila de totales
            tableBody.push([
              { content: 'TOTALES', styles: { fontSize: 7, fillColor: '#2ECC71', textColor: '#ffffff', fontStyle: 'bold', halign: 'center' } },
              { content: totalHrsOrdinarias > 0 ? totalHrsOrdinarias.toFixed(1) : '-', styles: { fontSize: 7, fillColor: '#2ECC71', textColor: '#ffffff', fontStyle: 'bold', halign: 'center' } },
              { content: totalHrsOrdinarias > 0 ? `$${totalValorOrdinarias.toFixed(2)}` : '-', styles: { fontSize: 7, fillColor: '#2ECC71', textColor: '#ffffff', fontStyle: 'bold', halign: 'right' } },
              { content: totalHrsNocturnas > 0 ? totalHrsNocturnas.toFixed(1) : '-', styles: { fontSize: 7, fillColor: '#2ECC71', textColor: '#ffffff', fontStyle: 'bold', halign: 'center' } },
              { content: totalHrsNocturnas > 0 ? `$${totalValorNocturnas.toFixed(2)}` : '-', styles: { fontSize: 7, fillColor: '#2ECC71', textColor: '#ffffff', fontStyle: 'bold', halign: 'right' } },
              { content: totalSt50 > 0 ? totalSt50.toFixed(1) : '-', styles: { fontSize: 7, fillColor: '#2ECC71', textColor: '#ffffff', fontStyle: 'bold', halign: 'center' } },
              { content: totalSt50 > 0 ? `$${totalValorSt50.toFixed(2)}` : '-', styles: { fontSize: 7, fillColor: '#2ECC71', textColor: '#ffffff', fontStyle: 'bold', halign: 'right' } },
              { content: totalSt100Jornada > 0 ? totalSt100Jornada.toFixed(1) : '-', styles: { fontSize: 7, fillColor: '#2ECC71', textColor: '#ffffff', fontStyle: 'bold', halign: 'center' } },
              { content: totalSt100Jornada > 0 ? `$${totalValorSt100Jornada.toFixed(2)}` : '-', styles: { fontSize: 7, fillColor: '#2ECC71', textColor: '#ffffff', fontStyle: 'bold', halign: 'right' } },
              { content: totalSt100Libre > 0 ? totalSt100Libre.toFixed(1) : '-', styles: { fontSize: 7, fillColor: '#2ECC71', textColor: '#ffffff', fontStyle: 'bold', halign: 'center' } },
              { content: totalSt100Libre > 0 ? `$${totalValorSt100Libre.toFixed(2)}` : '-', styles: { fontSize: 7, fillColor: '#2ECC71', textColor: '#ffffff', fontStyle: 'bold', halign: 'right' } },
              { content: totalHrsEmpleado.toFixed(1), styles: { fontSize: 7, fillColor: '#1B5E20', textColor: '#ffffff', fontStyle: 'bold', halign: 'center' } },
              { content: `$${totalValorEmpleado.toFixed(2)}`, styles: { fontSize: 7, fillColor: '#1B5E20', textColor: '#ffffff', fontStyle: 'bold', halign: 'right' } }
            ]);
            
            // Generar tabla con encabezado de dos filas
            autoTable(doc, {
              head: [headerRow1, headerRow2],
              body: tableBody,
              startY: y,
              theme: 'grid',
              headStyles: { fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' },
              bodyStyles: { fillColor: '#f0f0f0' },
              alternateRowStyles: { fillColor: '#ffffff' },
              columnStyles: {
                0: { cellWidth: 18, halign: 'left' },
                1: { cellWidth: 12, halign: 'center' },
                2: { cellWidth: 15, halign: 'right' },
                3: { cellWidth: 12, halign: 'center' },
                4: { cellWidth: 15, halign: 'right' },
                5: { cellWidth: 12, halign: 'center' },
                6: { cellWidth: 15, halign: 'right' },
                7: { cellWidth: 12, halign: 'center' },
                8: { cellWidth: 15, halign: 'right' },
                9: { cellWidth: 12, halign: 'center' },
                10: { cellWidth: 15, halign: 'right' },
                11: { cellWidth: 13, halign: 'center' },
                12: { cellWidth: 16, halign: 'right' }
              },
              margin: { top: 5, bottom: 5 },
              didDrawPage: function (data) {
                // Footer
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);
                const pageNum = doc.internal.pages.length - 1;
                doc.text(`Página ${pageNum} - Generado el ${new Date().toLocaleDateString('es-ES', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}`, 15, doc.internal.pageSize.getHeight() - 10);
              }
            });
            
            // Actualizar posición y
            y = (doc as any).lastAutoTable.finalY + 10;
          });
        });
      });
    });
    
    // Generar y descargar el PDF
    doc.save(`Reporte_Sobretiempos_Detallado_${fechaInicio}_${fechaFin}.pdf`);
    
    toast.success('Reporte generado exitosamente', {
      description: 'El archivo PDF se ha descargado'
    });
  };

  // Función para generar el Reporte de Sobretiempo Resumido en PDF
  const generarReporteSobretiempoResumido = () => {
    toast.info('Generando reporte...', { description: 'Por favor espere' });

    const getEmpresaName = () => empresa === 'all' ? 'Todas' : 'Titanium Corp';
    const getLocalidadName = () => localidad === 'all' ? 'Todas' : localidad === 'bogota' ? 'Bogotá' : 'Medellín';
    const getDepartamentoName = () => departamento === 'all' ? 'Todos' : departamento === 'prod' ? 'Producción' : 'Logística';
    const getAreaName = () => area === 'all' ? 'Todas' : area === 'fabricacion' ? 'Fabricación' : 'Almacén';
    const getCCName = () => centroCostos === 'all' ? 'Todos' : centroCostos;
    
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 116, 217);
    doc.text('REPORTE DE SOBRETIEMPO RESUMIDO', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(getEmpresaName(), pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Criterios de B��squeda', 15, 40);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 42, pageWidth - 15, 42);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const col1 = 20;
    const col2 = 90;
    const col3 = 160;
    const col4 = 230;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Empresa:', col1, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(getEmpresaName(), col1 + 20, 50);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Localidad:', col2, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(getLocalidadName(), col2 + 22, 50);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Departamento:', col3, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(getDepartamentoName(), col3 + 28, 50);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Período:', col4, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`${fechaInicio} - ${fechaFin}`, col4 + 18, 50);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Área:', col1, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(getAreaName(), col1 + 12, 56);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Centro de Costos:', col2, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(getCCName(), col2 + 35, 56);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Rol de Pago:', col3, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(rolPago === 'all' ? 'Todos' : rolPago, col3 + 25, 56);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Grupo:', col1, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(grupo === 'all' ? 'Todos' : grupo, col1 + 15, 62);
    
    let y = 75;
    mockSobretiemposJerarquica.departamentos.forEach((dept, deptIndex) => {
      if (deptIndex > 0) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 116, 217);
      doc.setFillColor(232, 244, 255);
      doc.rect(15, y - 5, pageWidth - 30, 8, 'F');
      doc.text(`DEPARTAMENTO: ${dept.nombre}`, 20, y);
      y += 12;
      
      dept.areas.forEach((area) => {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 91, 161);
        doc.setFillColor(240, 248, 255);
        doc.rect(15, y - 5, pageWidth - 30, 7, 'F');
        doc.text(`ÁREA: ${area.nombre}`, 20, y);
        y += 10;
        
        area.centrosCosto.forEach((cc) => {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bolditalic');
          doc.setTextColor(51, 51, 51);
          doc.text(`CENTRO DE COSTOS: ${cc.codigo} - ${cc.nombre}`, 20, y);
          y += 8;
          
          if (y > 160) {
            doc.addPage();
            y = 20;
          }
          
          const tableBody: any[] = [];
          
          const headerRow1 = [
            { content: 'Código', rowSpan: 2, styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center', valign: 'middle' } },
            { content: 'Nombre', rowSpan: 2, styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center', valign: 'middle' } },
            { content: 'Documento', rowSpan: 2, styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center', valign: 'middle' } },
            { content: 'Cargo', rowSpan: 2, styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center', valign: 'middle' } },
            { content: 'H. Ord.', colSpan: 2, styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'H. Noct.', colSpan: 2, styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'ST 50%', colSpan: 2, styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'ST 100% Jorn.', colSpan: 2, styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'ST 100% Libre', colSpan: 2, styles: { fontSize: 7, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'TOTAL', colSpan: 2, styles: { fontSize: 7, fillColor: '#2ECC71', textColor: '#ffffff', halign: 'center', fontStyle: 'bold' } }
          ];
          
          const headerRow2 = [
            { content: 'Hrs', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: '$', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'Hrs', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: '$', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'Hrs', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: '$', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'Hrs', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: '$', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'Hrs', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: '$', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' } },
            { content: 'Hrs', styles: { fontSize: 6, fillColor: '#2ECC71', textColor: '#ffffff', halign: 'center', fontStyle: 'bold' } },
            { content: '$', styles: { fontSize: 6, fillColor: '#2ECC71', textColor: '#ffffff', halign: 'center', fontStyle: 'bold' } }
          ];
          
          cc.empleados.forEach((empleado) => {
            let totalHrsOrdinarias = 0;
            let totalHrsNocturnas = 0;
            let totalSt50 = 0;
            let totalSt100Jornada = 0;
            let totalSt100Libre = 0;
            
            empleado.dias.forEach((dia) => {
              totalHrsOrdinarias += dia.hrsOrdinarias;
              totalHrsNocturnas += dia.hrsNocturnas;
              totalSt50 += dia.st50;
              totalSt100Jornada += dia.st100Jornada;
              totalSt100Libre += dia.st100Libre;
            });
            
            const valorOrdinarias = totalHrsOrdinarias * empleado.valorHoraOrdinaria;
            const valorNocturnas = totalHrsNocturnas * empleado.valorHoraOrdinaria * 1.35;
            const valorSt50 = totalSt50 * empleado.valorHoraOrdinaria * 1.5;
            const valorSt100Jornada = totalSt100Jornada * empleado.valorHoraOrdinaria * 2.0;
            const valorSt100Libre = totalSt100Libre * empleado.valorHoraOrdinaria * 2.0;
            
            const totalHrs = totalHrsOrdinarias + totalHrsNocturnas + totalSt50 + totalSt100Jornada + totalSt100Libre;
            const totalValor = valorOrdinarias + valorNocturnas + valorSt50 + valorSt100Jornada + valorSt100Libre;
            
            tableBody.push([
              { content: empleado.codigo, styles: { fontSize: 7, halign: 'left' } },
              { content: empleado.nombre, styles: { fontSize: 7, halign: 'left' } },
              { content: empleado.documento, styles: { fontSize: 7, halign: 'center' } },
              { content: empleado.cargo, styles: { fontSize: 7, halign: 'left' } },
              { content: totalHrsOrdinarias > 0 ? totalHrsOrdinarias.toFixed(1) : '-', styles: { fontSize: 7, halign: 'center' } },
              { content: totalHrsOrdinarias > 0 ? `$${valorOrdinarias.toFixed(2)}` : '-', styles: { fontSize: 7, halign: 'right' } },
              { content: totalHrsNocturnas > 0 ? totalHrsNocturnas.toFixed(1) : '-', styles: { fontSize: 7, halign: 'center' } },
              { content: totalHrsNocturnas > 0 ? `$${valorNocturnas.toFixed(2)}` : '-', styles: { fontSize: 7, halign: 'right' } },
              { content: totalSt50 > 0 ? totalSt50.toFixed(1) : '-', styles: { fontSize: 7, halign: 'center' } },
              { content: totalSt50 > 0 ? `$${valorSt50.toFixed(2)}` : '-', styles: { fontSize: 7, halign: 'right' } },
              { content: totalSt100Jornada > 0 ? totalSt100Jornada.toFixed(1) : '-', styles: { fontSize: 7, halign: 'center' } },
              { content: totalSt100Jornada > 0 ? `$${valorSt100Jornada.toFixed(2)}` : '-', styles: { fontSize: 7, halign: 'right' } },
              { content: totalSt100Libre > 0 ? totalSt100Libre.toFixed(1) : '-', styles: { fontSize: 7, halign: 'center' } },
              { content: totalSt100Libre > 0 ? `$${valorSt100Libre.toFixed(2)}` : '-', styles: { fontSize: 7, halign: 'right' } },
              { content: totalHrs.toFixed(1), styles: { fontSize: 7, fillColor: '#2ECC71', textColor: '#ffffff', fontStyle: 'bold', halign: 'center' } },
              { content: `$${totalValor.toFixed(2)}`, styles: { fontSize: 7, fillColor: '#2ECC71', textColor: '#ffffff', fontStyle: 'bold', halign: 'right' } }
            ]);
          });
          
          autoTable(doc, {
            head: [headerRow1, headerRow2],
            body: tableBody,
            startY: y,
            theme: 'grid',
            headStyles: { fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' },
            bodyStyles: { fillColor: '#f0f0f0' },
            alternateRowStyles: { fillColor: '#ffffff' },
            columnStyles: {
              0: { cellWidth: 16, halign: 'left' },
              1: { cellWidth: 35, halign: 'left' },
              2: { cellWidth: 20, halign: 'center' },
              3: { cellWidth: 30, halign: 'left' },
              4: { cellWidth: 12, halign: 'center' },
              5: { cellWidth: 15, halign: 'right' },
              6: { cellWidth: 12, halign: 'center' },
              7: { cellWidth: 15, halign: 'right' },
              8: { cellWidth: 12, halign: 'center' },
              9: { cellWidth: 15, halign: 'right' },
              10: { cellWidth: 12, halign: 'center' },
              11: { cellWidth: 15, halign: 'right' },
              12: { cellWidth: 12, halign: 'center' },
              13: { cellWidth: 15, halign: 'right' },
              14: { cellWidth: 13, halign: 'center' },
              15: { cellWidth: 16, halign: 'right' }
            },
            margin: { top: 5, bottom: 5 },
            didDrawPage: function (data) {
              doc.setFontSize(8);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(0, 0, 0);
              const pageNum = doc.internal.pages.length - 1;
              doc.text(`Página ${pageNum} - Generado el ${new Date().toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
            }
          });
          
          y = (doc as any).lastAutoTable.finalY + 10;
        });
      });
    });
    
    doc.save(`Reporte_Sobretiempo_Resumido_${fechaInicio}_${fechaFin}.pdf`);
    
    toast.success('Reporte generado exitosamente', {
      description: 'El archivo PDF se ha descargado'
    });
  };

  // Función para generar el Reporte de Turnos Trabajados (Matriz de Asistencia)
  const generarReporteTurnosTrabajados = () => {
    toast.info('Generando reporte...', { description: 'Por favor espere' });

    const getEmpresaName = () => empresa === 'all' ? 'Todas' : 'Titanium Corp';
    const getDepartamentoName = () => departamento === 'all' ? 'Todos' : departamento === 'prod' ? 'Producción' : 'Logística';
    
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // CABECERA DEL REPORTE
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 116, 217);
    doc.text('REPORTE DE TURNOS TRABAJADOS', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(getEmpresaName(), pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Criterios de Búsqueda', 15, 35);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 37, pageWidth - 15, 37);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    doc.setFont('helvetica', 'bold');
    doc.text('Empresa:', 20, 43);
    doc.setFont('helvetica', 'normal');
    doc.text(getEmpresaName(), 40, 43);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Departamento:', 90, 43);
    doc.setFont('helvetica', 'normal');
    doc.text(getDepartamentoName(), 125, 43);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Período:', 180, 43);
    doc.setFont('helvetica', 'normal');
    doc.text(`${fechaInicio} - ${fechaFin}`, 198, 43);
    
    // Generar array de fechas del rango
    const startDate = new Date(fechaInicio);
    const endDate = new Date(fechaFin);
    const dateArray: string[] = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dateArray.push(d.toISOString().split('T')[0]);
    }
    
    // Datos mock de empleados con asistencia
    const empleados = [
      { codigo: 'EMP001', nombre: 'Juan Pérez', departamento: 'Producción', cargo: 'Operario' },
      { codigo: 'EMP002', nombre: 'María García', departamento: 'Producción', cargo: 'Supervisora' },
      { codigo: 'EMP003', nombre: 'Carlos López', departamento: 'Producción', cargo: 'Técnico' },
      { codigo: 'EMP004', nombre: 'Ana Rodríguez', departamento: 'Producción', cargo: 'Operaria' },
      { codigo: 'EMP005', nombre: 'Luis Martínez', departamento: 'Producción', cargo: 'Operario Nocturno' },
      { codigo: 'EMP010', nombre: 'Ana Martínez', departamento: 'Logística', cargo: 'Auxiliar' },
      { codigo: 'EMP011', nombre: 'Pedro Rodríguez', departamento: 'Logística', cargo: 'Jefe de Almacén' }
    ];
    
    // Generar estados de asistencia aleatoriamente
    const estadosAsistencia: { [empleado: string]: { [fecha: string]: string } } = {};
    
    empleados.forEach(emp => {
      estadosAsistencia[emp.codigo] = {};
      dateArray.forEach((fecha, idx) => {
        const rand = Math.random();
        // 70% asistencia normal, 15% día libre, 5% falta, 5% atraso, 5% salida anticipada
        if (rand < 0.70) {
          estadosAsistencia[emp.codigo][fecha] = 'presente';
        } else if (rand < 0.85) {
          estadosAsistencia[emp.codigo][fecha] = 'libre';
        } else if (rand < 0.90) {
          estadosAsistencia[emp.codigo][fecha] = 'falta';
        } else if (rand < 0.95) {
          estadosAsistencia[emp.codigo][fecha] = 'atraso';
        } else {
          estadosAsistencia[emp.codigo][fecha] = 'salida_anticipada';
        }
      });
    });
    
    let y = 55;
    
    // TABLA MATRICIAL
    const tableBody: any[] = [];
    
    // Encabezado: Primera fila con fechas
    const headerRow: any[] = [
      { content: 'Código', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center', valign: 'middle' } },
      { content: 'Nombre', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center', valign: 'middle' } },
      { content: 'Cargo', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center', valign: 'middle' } }
    ];
    
    // Agregar columnas de fechas
    dateArray.forEach(fecha => {
      const day = new Date(fecha).getDate();
      headerRow.push({
        content: day.toString(),
        styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' }
      });
    });
    
    // Filas de empleados
    empleados.forEach(emp => {
      const row: any[] = [
        { content: emp.codigo, styles: { fontSize: 6, halign: 'left' } },
        { content: emp.nombre, styles: { fontSize: 6, halign: 'left' } },
        { content: emp.cargo, styles: { fontSize: 6, halign: 'left' } }
      ];
      
      // Agregar símbolos por cada fecha
      dateArray.forEach(fecha => {
        const estado = estadosAsistencia[emp.codigo][fecha];
        let simbolo = '';
        let color = '#000000';
        
        switch (estado) {
          case 'presente':
            simbolo = 'P';
            color = '#2ECC71'; // Verde
            break;
          case 'falta':
            simbolo = 'F';
            color = '#E74C3C'; // Rojo
            break;
          case 'atraso':
            simbolo = 'A';
            color = '#F39C12'; // Amarillo/Naranja
            break;
          case 'salida_anticipada':
            simbolo = 'S';
            color = '#F39C12'; // Amarillo/Naranja
            break;
          case 'libre':
            simbolo = 'L';
            color = '#8E44AD'; // Morado
            break;
          default:
            simbolo = '-';
            color = '#BDC3C7'; // Gris
            break;
        }
        
        row.push({
          content: simbolo,
          styles: { 
            fontSize: 7, 
            halign: 'center', 
            textColor: color,
            fontStyle: 'bold'
          }
        });
      });
      
      tableBody.push(row);
    });
    
    // Calcular ancho de columnas dinámicamente
    const margins = 20; // Total de márgenes (10 left + 10 right) - REDUCIDO
    const fixedColsWidth = 12 + 30 + 22; // Código + Nombre + Cargo (más reducidos)
    const availableWidth = pageWidth - margins - fixedColsWidth; // Espacio disponible para fechas
    const dateColWidth = Math.max(4.5, Math.min(6, availableWidth / dateArray.length)); // Entre 4.5mm y 6mm por fecha
    
    const columnStyles: any = {
      0: { cellWidth: 12, halign: 'left' },
      1: { cellWidth: 30, halign: 'left' },
      2: { cellWidth: 22, halign: 'left' }
    };
    
    // Agregar estilos para columnas de fechas
    dateArray.forEach((_, idx) => {
      columnStyles[3 + idx] = { cellWidth: dateColWidth, halign: 'center' };
    });
    
    // Generar tabla
    autoTable(doc, {
      head: [headerRow],
      body: tableBody,
      startY: y,
      theme: 'grid',
      headStyles: { fillColor: '#0074D9', textColor: '#ffffff', halign: 'center', fontSize: 6 },
      bodyStyles: { fillColor: '#f9f9f9', fontSize: 6 },
      alternateRowStyles: { fillColor: '#ffffff' },
      columnStyles: columnStyles,
      margin: { left: 10, right: 10, top: 5, bottom: 25 },
      didDrawPage: function (data) {
        // Footer con página
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const pageNum = doc.internal.pages.length - 1;
        doc.text(`Página ${pageNum}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' });
      }
    });
    
    // NOMENCLATURA al final de la tabla
    const finalY = (doc as any).lastAutoTable.finalY + 5;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Nomenclatura:', 15, finalY);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    // Símbolo P Verde - Presente
    doc.setTextColor(46, 204, 113); // Verde
    doc.setFont('helvetica', 'bold');
    doc.text('P', 15, finalY + 7);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text('= Presente', 20, finalY + 7);
    
    // Símbolo F Rojo - Falta
    doc.setTextColor(231, 76, 60); // Rojo
    doc.setFont('helvetica', 'bold');
    doc.text('F', 50, finalY + 7);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text('= Falta', 55, finalY + 7);
    
    // Símbolo A Amarillo - Atraso
    doc.setTextColor(243, 156, 18); // Amarillo/Naranja
    doc.setFont('helvetica', 'bold');
    doc.text('A', 85, finalY + 7);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text('= Atraso', 90, finalY + 7);
    
    // Símbolo S Amarillo - Salida Anticipada
    doc.setTextColor(243, 156, 18); // Amarillo/Naranja
    doc.setFont('helvetica', 'bold');
    doc.text('S', 125, finalY + 7);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text('= Salida Anticipada', 130, finalY + 7);
    
    // Símbolo L Morado - Día Libre
    doc.setTextColor(142, 68, 173); // Morado
    doc.setFont('helvetica', 'bold');
    doc.text('L', 190, finalY + 7);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text('= Día Libre', 195, finalY + 7);
    
    doc.save(`Reporte_Turnos_Trabajados_${fechaInicio}_${fechaFin}.pdf`);
    
    toast.success('Reporte generado exitosamente', {
      description: 'El archivo PDF se ha descargado'
    });
  };

  // Función para generar el Reporte de Justificaciones (Matriz de Novedades con Estado de Justificación)
  const generarReporteJustificaciones = () => {
    toast.info('Generando reporte...', { description: 'Por favor espere' });

    const getEmpresaName = () => empresa === 'all' ? 'Todas' : 'Titanium Corp';
    const getDepartamentoName = () => departamento === 'all' ? 'Todos' : departamento === 'prod' ? 'Producción' : 'Logística';
    
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // CABECERA DEL REPORTE
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 116, 217);
    doc.text('REPORTE DE JUSTIFICACIONES', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(getEmpresaName(), pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Criterios de Búsqueda', 15, 35);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 37, pageWidth - 15, 37);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    doc.setFont('helvetica', 'bold');
    doc.text('Período:', 15, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(`${fechaInicio} al ${fechaFin}`, 35, 42);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Departamento:', 100, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(getDepartamentoName(), 130, 42);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Empleado:', 180, 42);
    doc.setFont('helvetica', 'normal');
    doc.text('Todos', 205, 42);
    
    doc.line(15, 46, pageWidth - 15, 46);
    
    // Datos de ejemplo
    const empleados = [
      { codigo: 'E001', nombre: 'García M.', cargo: 'Operario' },
      { codigo: 'E002', nombre: 'López S.', cargo: 'Supervisor' },
      { codigo: 'E003', nombre: 'Martínez P.', cargo: 'Técnico' },
      { codigo: 'E004', nombre: 'Rodríguez L.', cargo: 'Operario' },
      { codigo: 'E005', nombre: 'Fernández J.', cargo: 'Auxiliar' },
      { codigo: 'E006', nombre: 'Gómez A.', cargo: 'Operario' },
      { codigo: 'E007', nombre: 'Sánchez R.', cargo: 'Técnico' },
      { codigo: 'E008', nombre: 'Pérez C.', cargo: 'Supervisor' }
    ];
    
    // Generar array de fechas
    const dateArray = [];
    const start = new Date(fechaInicio);
    const end = new Date(fechaFin);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dateArray.push(new Date(d).toISOString().split('T')[0]);
    }
    
    // Generar novedades aleatorias con estado de justificación
    // Tipos: falta (F), atraso (A), salida_anticipada (S), inconsistencia (I)
    const novedadesPorEmpleado: any = {};
    
    empleados.forEach(emp => {
      novedadesPorEmpleado[emp.codigo] = {};
      dateArray.forEach(fecha => {
        const random = Math.random();
        
        if (random < 0.15) { // 15% Falta
          novedadesPorEmpleado[emp.codigo][fecha] = {
            tipo: 'falta',
            justificado: Math.random() > 0.4 // 60% justificadas
          };
        } else if (random < 0.30) { // 15% Atraso
          novedadesPorEmpleado[emp.codigo][fecha] = {
            tipo: 'atraso',
            justificado: Math.random() > 0.3 // 70% justificadas
          };
        } else if (random < 0.40) { // 10% Salida Anticipada
          novedadesPorEmpleado[emp.codigo][fecha] = {
            tipo: 'salida_anticipada',
            justificado: Math.random() > 0.5 // 50% justificadas
          };
        } else if (random < 0.45) { // 5% Inconsistencia
          novedadesPorEmpleado[emp.codigo][fecha] = {
            tipo: 'inconsistencia',
            justificado: Math.random() > 0.6 // 40% justificadas
          };
        } else {
          // Sin novedad (normal)
          novedadesPorEmpleado[emp.codigo][fecha] = null;
        }
      });
    });
    
    let y = 55;
    
    // TABLA MATRICIAL
    const tableBody: any[] = [];
    
    // Encabezado: Primera fila con fechas
    const headerRow: any[] = [
      { content: 'Código', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center', valign: 'middle' } },
      { content: 'Nombre', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center', valign: 'middle' } },
      { content: 'Cargo', styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center', valign: 'middle' } }
    ];
    
    // Agregar columnas de fechas
    dateArray.forEach(fecha => {
      const day = new Date(fecha).getDate();
      headerRow.push({
        content: day.toString(),
        styles: { fontSize: 6, fillColor: '#0074D9', textColor: '#ffffff', halign: 'center' }
      });
    });
    
    // Filas de empleados
    empleados.forEach(emp => {
      const row: any[] = [
        { content: emp.codigo, styles: { fontSize: 6, halign: 'left' } },
        { content: emp.nombre, styles: { fontSize: 6, halign: 'left' } },
        { content: emp.cargo, styles: { fontSize: 6, halign: 'left' } }
      ];
      
      // Agregar símbolos por cada fecha (solo si hay novedad)
      dateArray.forEach(fecha => {
        const novedad = novedadesPorEmpleado[emp.codigo][fecha];
        let simbolo = '-';
        let color = '#BDC3C7'; // Gris por defecto (sin novedad)
        
        if (novedad) {
          // Determinar símbolo según tipo
          switch (novedad.tipo) {
            case 'falta':
              simbolo = 'F';
              break;
            case 'atraso':
              simbolo = 'A';
              break;
            case 'salida_anticipada':
              simbolo = 'S';
              break;
            case 'inconsistencia':
              simbolo = 'I';
              break;
          }
          
          // Color según estado de justificación
          color = novedad.justificado ? '#2ECC71' : '#E74C3C'; // Verde justificado, Rojo no justificado
        }
        
        row.push({
          content: simbolo,
          styles: { 
            fontSize: 7, 
            halign: 'center', 
            textColor: color,
            fontStyle: 'bold'
          }
        });
      });
      
      tableBody.push(row);
    });
    
    // Calcular ancho de columnas dinámicamente
    const margins = 20; // Total de márgenes (10 left + 10 right)
    const fixedColsWidth = 12 + 30 + 22; // Código + Nombre + Cargo
    const availableWidth = pageWidth - margins - fixedColsWidth; // Espacio disponible para fechas
    const dateColWidth = Math.max(4.5, Math.min(6, availableWidth / dateArray.length)); // Entre 4.5mm y 6mm por fecha
    
    const columnStyles: any = {
      0: { cellWidth: 12, halign: 'left' },
      1: { cellWidth: 30, halign: 'left' },
      2: { cellWidth: 22, halign: 'left' }
    };
    
    // Agregar estilos para columnas de fechas
    dateArray.forEach((_, idx) => {
      columnStyles[3 + idx] = { cellWidth: dateColWidth, halign: 'center' };
    });
    
    // Generar tabla
    autoTable(doc, {
      head: [headerRow],
      body: tableBody,
      startY: y,
      theme: 'grid',
      headStyles: { fillColor: '#0074D9', textColor: '#ffffff', halign: 'center', fontSize: 6 },
      bodyStyles: { fillColor: '#f9f9f9', fontSize: 6 },
      alternateRowStyles: { fillColor: '#ffffff' },
      columnStyles: columnStyles,
      margin: { left: 10, right: 10, top: 5, bottom: 25 },
      didDrawPage: function (data) {
        // Footer con página
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const pageNum = doc.internal.pages.length - 1;
        doc.text(`Página ${pageNum}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' });
      }
    });
    
    // NOMENCLATURA
    const finalY = (doc as any).lastAutoTable.finalY;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Nomenclatura:', 15, finalY + 5);
    
    // Símbolos de Novedades
    doc.setFontSize(8);
    
    // F - Falta
    doc.setFont('helvetica', 'bold');
    doc.text('F', 15, finalY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text('= Falta', 20, finalY + 10);
    
    // A - Atraso
    doc.setFont('helvetica', 'bold');
    doc.text('A', 50, finalY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text('= Atraso', 55, finalY + 10);
    
    // S - Salida Anticipada
    doc.setFont('helvetica', 'bold');
    doc.text('S', 90, finalY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text('= Salida Anticipada', 95, finalY + 10);
    
    // I - Inconsistencia
    doc.setFont('helvetica', 'bold');
    doc.text('I', 155, finalY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text('= Inconsistencia (Marcación Impar)', 160, finalY + 10);
    
    // Estados de Justificación
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Estados:', 15, finalY + 17);
    
    doc.setFontSize(8);
    
    // Verde - Justificado
    doc.setTextColor(46, 204, 113); // Verde
    doc.setFont('helvetica', 'bold');
    doc.text('Verde', 15, finalY + 22);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text('= Novedad Justificada', 30, finalY + 22);
    
    // Rojo - No Justificado
    doc.setTextColor(231, 76, 60); // Rojo
    doc.setFont('helvetica', 'bold');
    doc.text('Rojo', 100, finalY + 22);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text('= Novedad Sin Justificar', 115, finalY + 22);
    
    doc.save(`Reporte_Justificaciones_${fechaInicio}_${fechaFin}.pdf`);
    
    toast.success('Reporte generado exitosamente', {
      description: 'El archivo PDF se ha descargado'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-1">Consultas, reportes y análisis de asistencia</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* TabsList oculto ya que el menú lateral lo reemplaza */}
        <TabsList className="hidden">
          <TabsTrigger value="disponibles">Reportes Disponibles</TabsTrigger>
          <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
          <TabsTrigger value="novedades">Novedades</TabsTrigger>
          <TabsTrigger value="analiticos">Analíticos</TabsTrigger>
        </TabsList>

        {/* REPORTES DISPONIBLES */}
        <TabsContent value="disponibles" className="mt-6 space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar reportes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowFilters(!showFilters)}
                  className={showFilters ? 'bg-accent' : ''}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros Avanzados
                </Button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-5 gap-3 mt-4 pt-4 border-t border-border">
                  <div>
                    <Label htmlFor="rep-empresa">Empresa</Label>
                    <Select value={empresa} onValueChange={setEmpresa}>
                      <SelectTrigger id="rep-empresa">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="titanium">Titanium Corp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rep-localidad">Localidad</Label>
                    <Select value={localidad} onValueChange={setLocalidad}>
                      <SelectTrigger id="rep-localidad">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="bogota">Bogotá</SelectItem>
                        <SelectItem value="medellin">Medellín</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rep-dept">Departamento</Label>
                    <Select value={departamento} onValueChange={setDepartamento}>
                      <SelectTrigger id="rep-dept">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="prod">Producción</SelectItem>
                        <SelectItem value="log">Logística</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rep-area">Área</Label>
                    <Select value={area} onValueChange={setArea}>
                      <SelectTrigger id="rep-area">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="fabricacion">Fabricación</SelectItem>
                        <SelectItem value="almacen">Almacén</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rep-cc">Centro de Costos</Label>
                    <Select value={centroCostos} onValueChange={setCentroCostos}>
                      <SelectTrigger id="rep-cc">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="cc1">CC1 - Producción</SelectItem>
                        <SelectItem value="cc2">CC2 - Logística</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rep-rol">Rol de Pago</Label>
                    <Select value={rolPago} onValueChange={setRolPago}>
                      <SelectTrigger id="rep-rol">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="rol1">Rol 1 - Producción</SelectItem>
                        <SelectItem value="rol2">Rol 2 - Logística</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rep-grupo">Grupo</Label>
                    <Select value={grupo} onValueChange={setGrupo}>
                      <SelectTrigger id="rep-grupo">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="grupo1">Grupo 1 - Producción</SelectItem>
                        <SelectItem value="grupo2">Grupo 2 - Logística</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rep-start">Fecha Inicio</Label>
                    <Input id="rep-start" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="rep-end">Fecha Fin</Label>
                    <Input id="rep-end" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <CardTitle className="text-base">{report.name}</CardTitle>
                      </div>
                      <CardDescription className="text-sm">{report.description}</CardDescription>
                    </div>
                    <Badge variant="outline" className="ml-2">{report.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Filter className="w-3 h-3" />
                      <span>Filtros: {report.filters}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Última ejecución: {report.lastRun}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        if (report.id === 1) {
                          generarReporteAsistenciaGeneral();
                        } else if (report.id === 2) {
                          generarReporteAsistenciaResumido();
                        } else if (report.id === 3) {
                          generarReporteSobretiemposDetallado();
                        } else if (report.id === 4) {
                          generarReporteSobretiempoResumido();
                        } else if (report.id === 5) {
                          generarReporteTurnosTrabajados();
                        } else if (report.id === 6) {
                          generarReporteJustificaciones();
                        } else {
                          toast.info('Reporte en desarrollo', {
                            description: 'Este reporte estará disponible próximamente'
                          });
                        }
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Generar
                    </Button>
                    <Button variant="outline" size="sm">
                      Configurar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ASISTENCIA */}
        <TabsContent value="asistencia" className="mt-6 space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowFilters(!showFilters)}
                  className={showFilters ? 'bg-accent' : ''}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                </Button>
                <div className="flex-1" />
                <Button variant="outline">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Exportar Excel
                </Button>
                <Button variant="outline" onClick={generarReporteAsistenciaGeneral}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
                  <div>
                    <Label htmlFor="att-company">Empresa</Label>
                    <Select>
                      <SelectTrigger id="att-company">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="titanium">Titanium Corp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="att-dept">Departamento</Label>
                    <Select>
                      <SelectTrigger id="att-dept">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="prod">Producción</SelectItem>
                        <SelectItem value="log">Logística</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="att-start">Fecha Inicio</Label>
                    <Input id="att-start" type="date" defaultValue="2025-10-18" />
                  </div>
                  <div>
                    <Label htmlFor="att-end">Fecha Fin</Label>
                    <Input id="att-end" type="date" defaultValue="2025-10-18" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertTitle>Guardrails de Consulta</AlertTitle>
            <AlertDescription>
              El rango máximo permitido es de 90 días. Para consultas mayores, contacte al administrador del sistema.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Reporte de Asistencia</CardTitle>
                  <CardDescription>Marcaciones y horas trabajadas por empleado</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Registros</p>
                  <p className="text-2xl">{mockAttendanceData.length}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>Empleado</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Salida</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Novedades</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockAttendanceData.map((record, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{record.employee}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{record.department}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {record.date}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{record.checkIn}</TableCell>
                      <TableCell className="font-mono text-sm">{record.checkOut}</TableCell>
                      <TableCell className="font-mono text-sm">{record.hours}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-600">{record.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{record.novelties}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOVEDADES */}
        <TabsContent value="novedades" className="mt-6 space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowFilters(!showFilters)}
                  className={showFilters ? 'bg-accent' : ''}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                </Button>
                <div className="flex-1" />
                <Button variant="outline">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Exportar Excel
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-5 gap-3 mt-4 pt-4 border-t border-border">
                  <div>
                    <Label htmlFor="nov-company">Empresa</Label>
                    <Select>
                      <SelectTrigger id="nov-company">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="titanium">Titanium Corp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="nov-type">Tipo Novedad</Label>
                    <Select>
                      <SelectTrigger id="nov-type">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="st50">Sobretiempo 50%</SelectItem>
                        <SelectItem value="st100">Sobretiempo 100%</SelectItem>
                        <SelectItem value="atraso">Atrasos</SelectItem>
                        <SelectItem value="jn">Jornada Nocturna</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="nov-status">Estado</Label>
                    <Select>
                      <SelectTrigger id="nov-status">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="approved">Aprobados</SelectItem>
                        <SelectItem value="pending">Pendientes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="nov-start">Fecha Inicio</Label>
                    <Input id="nov-start" type="date" defaultValue="2025-10-01" />
                  </div>
                  <div>
                    <Label htmlFor="nov-end">Fecha Fin</Label>
                    <Input id="nov-end" type="date" defaultValue="2025-10-31" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Novedades</CardDescription>
                <CardTitle className="text-2xl">423</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Período actual</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Sobretiempos</CardDescription>
                <CardTitle className="text-2xl text-info">185</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">HE50 y HE100</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Jornadas Nocturnas</CardDescription>
                <CardTitle className="text-2xl text-warning">98</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Turno nocturno</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Atrasos</CardDescription>
                <CardTitle className="text-2xl text-destructive">42</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Pendientes de acción</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Detalle de Novedades</CardTitle>
                  <CardDescription>Listado completo de novedades por empleado</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl text-success">$70.20</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead>Empleado</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Novedad</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockNoveltyData.map((record, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{record.employee}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{record.code}</Badge>
                      </TableCell>
                      <TableCell>{record.novelty}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {record.date}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{record.value}</TableCell>
                      <TableCell className={`font-mono text-sm ${
                        record.amount.startsWith('-') ? 'text-destructive' : 'text-success'
                      }`}>
                        {record.amount}
                      </TableCell>
                      <TableCell>
                        <Badge className={record.status === 'Aprobado' ? 'bg-green-600' : 'bg-sky-500'}>
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALITICOS */}
        <TabsContent value="analiticos" className="mt-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Tasa de Asistencia</CardDescription>
                <CardTitle className="text-3xl text-success">96.5%</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">+2.3% vs mes anterior</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Tasa de Atrasos</CardDescription>
                <CardTitle className="text-3xl text-warning">8.2%</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">-1.5% vs mes anterior</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Horas Extra Promedio</CardDescription>
                <CardTitle className="text-3xl text-info">12.3</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">hrs/empleado/mes</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top 5 Departamentos - Cumplimiento</CardTitle>
                <CardDescription>Mejor tasa de asistencia</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-600 w-2 h-8 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Administración</p>
                        <p className="text-xs text-muted-foreground">25 empleados</p>
                      </div>
                    </div>
                    <Badge className="bg-green-600">98.5%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-600 w-2 h-8 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Logística</p>
                        <p className="text-xs text-muted-foreground">32 empleados</p>
                      </div>
                    </div>
                    <Badge className="bg-green-600">97.2%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-600 w-2 h-8 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Producción</p>
                        <p className="text-xs text-muted-foreground">68 empleados</p>
                      </div>
                    </div>
                    <Badge className="bg-green-600">96.8%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-warning w-2 h-8 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Mantenimiento</p>
                        <p className="text-xs text-muted-foreground">15 empleados</p>
                      </div>
                    </div>
                    <Badge className="bg-warning">94.5%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-warning w-2 h-8 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">Seguridad</p>
                        <p className="text-xs text-muted-foreground">12 empleados</p>
                      </div>
                    </div>
                    <Badge className="bg-warning">93.8%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribución de Novedades</CardTitle>
                <CardDescription>Por tipo de novedad (Octubre 2025)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <PieChart className="w-4 h-4 text-info" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Sobretiempo 50%</p>
                        <div className="bg-muted h-2 rounded-full mt-1">
                          <div className="bg-info h-2 rounded-full" style={{ width: '43.7%' }}></div>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-3">185</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <PieChart className="w-4 h-4 text-warning" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Jornada Nocturna</p>
                        <div className="bg-muted h-2 rounded-full mt-1">
                          <div className="bg-warning h-2 rounded-full" style={{ width: '23.2%' }}></div>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-3">98</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <PieChart className="w-4 h-4 text-success" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Sobretiempo 100%</p>
                        <div className="bg-muted h-2 rounded-full mt-1">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: '18.4%' }}></div>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-3">78</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <PieChart className="w-4 h-4 text-destructive" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Atrasos</p>
                        <div className="bg-muted h-2 rounded-full mt-1">
                          <div className="bg-destructive h-2 rounded-full" style={{ width: '9.9%' }}></div>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-3">42</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <PieChart className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Otros</p>
                        <div className="bg-muted h-2 rounded-full mt-1">
                          <div className="bg-muted-foreground h-2 rounded-full" style={{ width: '4.7%' }}></div>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-3">20</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Análisis de Tendencias</CardTitle>
                  <CardDescription>Evolución de indicadores clave (últimos 6 meses)</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Dashboard
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 border border-border rounded-lg p-8 text-center">
                <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Vista gráfica de tendencias disponible en próxima actualización
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Incluirá gráficos de líneas y barras con evolución temporal de KPIs
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}