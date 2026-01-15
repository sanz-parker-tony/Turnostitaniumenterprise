import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CreditCard, Package, Receipt, AlertCircle } from 'lucide-react';

interface SuscripcionesProps {
  activeTab?: string;
  title?: string;
}

export default function Suscripciones({ activeTab = 'planes', title }: SuscripcionesProps) {
  const [selectedTab, setSelectedTab] = useState(activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title || 'Suscripciones'}</h2>
          <p className="text-sm text-gray-600 mt-1">
            Gestión de planes y suscripciones
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-8">
          <TabsTrigger value="planes" className="gap-2">
            <Package className="w-4 h-4" />
            Planes
          </TabsTrigger>
          <TabsTrigger value="tenant-subs" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Suscripciones
          </TabsTrigger>
          <TabsTrigger value="transacciones" className="gap-2">
            <Receipt className="w-4 h-4" />
            Transacciones
          </TabsTrigger>
        </TabsList>

        {/* Planes */}
        <TabsContent value="planes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Planes de Suscripción
              </CardTitle>
              <CardDescription>
                Configura los planes disponibles para los tenants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Plan Básico */}
                <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Básico</h3>
                    <Badge variant="secondary">Activo</Badge>
                  </div>
                  <p className="text-3xl font-bold text-[#0074D9] mb-4">
                    $49<span className="text-sm font-normal text-gray-600">/mes</span>
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600 mb-6">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2ECC71]" />
                      Hasta 50 empleados
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2ECC71]" />
                      Control de asistencia básico
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2ECC71]" />
                      Reportes estándar
                    </li>
                  </ul>
                  <Button variant="outline" className="w-full">
                    Editar Plan
                  </Button>
                </div>

                {/* Plan Profesional */}
                <div className="border-2 border-[#0074D9] rounded-lg p-6 hover:shadow-md transition-shadow relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-[#0074D9]">Recomendado</Badge>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Profesional</h3>
                    <Badge variant="secondary">Activo</Badge>
                  </div>
                  <p className="text-3xl font-bold text-[#0074D9] mb-4">
                    $149<span className="text-sm font-normal text-gray-600">/mes</span>
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600 mb-6">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2ECC71]" />
                      Hasta 200 empleados
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2ECC71]" />
                      Todas las funcionalidades
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2ECC71]" />
                      Reportes avanzados
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2ECC71]" />
                      Soporte prioritario
                    </li>
                  </ul>
                  <Button className="w-full bg-[#0074D9]">
                    Editar Plan
                  </Button>
                </div>

                {/* Plan Enterprise */}
                <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Enterprise</h3>
                    <Badge variant="secondary">Activo</Badge>
                  </div>
                  <p className="text-3xl font-bold text-[#0074D9] mb-4">
                    Personalizado
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600 mb-6">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2ECC71]" />
                      Empleados ilimitados
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2ECC71]" />
                      Todas las funcionalidades
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2ECC71]" />
                      Soporte 24/7
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2ECC71]" />
                      Personalización
                    </li>
                  </ul>
                  <Button variant="outline" className="w-full">
                    Contactar Ventas
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suscripciones de Tenant */}
        <TabsContent value="tenant-subs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Suscripciones Activas
              </CardTitle>
              <CardDescription>
                Gestión de suscripciones por tenant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Suscripción Example */}
                <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-[#0074D9]/10 p-3 rounded-lg">
                      <Package className="w-6 h-6 text-[#0074D9]" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Titanium Demo - Plan Profesional</h4>
                      <p className="text-sm text-gray-600">Activa desde: 01/01/2025</p>
                      <p className="text-xs text-gray-500">Próxima renovación: 01/02/2025</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-[#2ECC71]">Activa</Badge>
                    <p className="text-sm font-semibold mt-2">$149/mes</p>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-orange-500/10 p-3 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Empresa ABC - Plan Básico</h4>
                      <p className="text-sm text-gray-600">Activa desde: 15/12/2024</p>
                      <p className="text-xs text-gray-500">Próxima renovación: 15/01/2025</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="border-orange-500 text-orange-500">
                      Por Vencer
                    </Badge>
                    <p className="text-sm font-semibold mt-2">$49/mes</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transacciones */}
        <TabsContent value="transacciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Historial de Transacciones
              </CardTitle>
              <CardDescription>
                Registro de pagos y facturación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { id: 'TXN-001', fecha: '01/01/2025', concepto: 'Plan Profesional - Enero', monto: '$149.00', estado: 'completado' },
                  { id: 'TXN-002', fecha: '01/12/2024', concepto: 'Plan Profesional - Diciembre', monto: '$149.00', estado: 'completado' },
                  { id: 'TXN-003', fecha: '15/12/2024', concepto: 'Plan Básico - Diciembre', monto: '$49.00', estado: 'completado' },
                  { id: 'TXN-004', fecha: '01/11/2024', concepto: 'Plan Profesional - Noviembre', monto: '$149.00', estado: 'completado' },
                ].map((txn) => (
                  <div key={txn.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-medium">{txn.concepto}</p>
                      <p className="text-sm text-gray-600">ID: {txn.id} • {txn.fecha}</p>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <p className="font-semibold">{txn.monto}</p>
                      <Badge className="bg-[#2ECC71]">
                        {txn.estado === 'completado' ? 'Completado' : 'Pendiente'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
