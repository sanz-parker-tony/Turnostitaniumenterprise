# 🎯 Turnos Titanium - Sistema de Control de Asistencias

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-demo-green.svg)
![React](https://img.shields.io/badge/React-18-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-38B2AC.svg)

**Sistema SaaS Profesional para Gestión de Asistencias y Turnos Laborales**

Diseñado y desarrollado por **Titanium-Labs Corp.** © 2025

</div>

---

## 📋 Descripción

**Turnos Titanium** es una aplicación SaaS moderna y completa para la gestión integral de asistencias, turnos de trabajo, planificación de empleados y sincronización con sistemas de nómina. Esta versión DEMO incluye todas las funcionalidades listas para presentar a clientes potenciales.

### ✨ Características Principales

- ✅ **Dashboard en Tiempo Real** con KPIs dinámicos y gráficos interactivos
- ✅ **Gestión Completa de Empleados** con fichas personales, marcaciones y justificaciones
- ✅ **Estructura Organizacional** multi-empresa y multi-sede
- ✅ **Constructor de Turnos** visual e intuitivo
- ✅ **Procesos Automáticos** de cálculo y validación
- ✅ **Reportería Avanzada** con exportación Excel/PDF
- ✅ **Sistema de Roles y Permisos** granular
- ✅ **Sincronización con Nómina** automática
- ✅ **Diseño Responsive** para desktop, tablet y móvil

---

## 🚀 Demo Rápido

### Credenciales de Acceso

#### 👨‍💼 Administrador (Vista Completa)
```
Email: admin@titanium.com
Contraseña: demo
```
**Acceso a:** Mantenimiento, Configuración, Perfiles, Empresas, Seguridades, Usuarios

#### 👷 Supervisor (Vista Operativa)
```
Email: supervisor@titanium.com
Contraseña: demo
```
**Acceso a:** Dashboard, Empleados, Procesos, Sincronización, Reportes

#### 🔒 Seguridades (Vista Restringida)
```
Email: seguridades@titanium.com
Contraseña: demo
```
**Acceso a:** Seguridades, Usuarios

---

## 🎨 Diseño y UX

### Paleta de Colores Corporativa

```css
Primario:    #0074D9  /* Azul Corporativo */
Secundario:  #2ECC71  /* Verde Éxito */
Advertencia: #F39C12  /* Amarillo */
Error:       #E74C3C  /* Rojo */
Información: #3498DB  /* Azul Claro */
```

### Tipografía
- **Fuente Principal:** Inter (Google Fonts)
- **Sistema Tipográfico:** Predefinido en `styles/globals.css`

---

## 📚 Estructura del Proyecto

```
/
├── App.tsx                          # Componente principal y routing
├── components/
│   ├── Dashboard.tsx                # Dashboard con KPIs en tiempo real
│   ├── Layout.tsx                   # Layout principal con navegación
│   ├── Login.tsx                    # Pantalla de autenticación
│   ├── LandingPage.tsx              # Página de aterrizaje profesional
│   ├── DemoData.tsx                 # Datos centralizados de demostración
│   │
│   ├── Mantenimiento.tsx            # Feriados, catálogos, justificaciones
│   ├── Configuracion.tsx            # Turnos, dispositivos, parámetros
│   ├── Perfiles.tsx                 # Perfiles de puestos
│   ├── Empresas.tsx                 # Estructura organizacional completa
│   ├── Empleados.tsx                # Gestión integral de empleados
│   ├── Procesos.tsx                 # Procesos automáticos
│   ├── Sincronizacion.tsx           # Sincronización con nómina
│   ├── Reporteria.tsx               # Reportes y exportaciones
│   ├── Seguridades.tsx              # Transacciones y permisos
│   └── Usuarios.tsx                 # Gestión de usuarios
│   │
│   └── ui/                          # Componentes Shadcn/ui
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── table.tsx
│       └── ... (40+ componentes)
│
├── styles/
│   └── globals.css                  # Estilos globales y tokens CSS
│
├── DEMO_INSTRUCTIONS.md             # Guía completa de demostración
└── README.md                        # Este archivo
```

---

## 🎯 Módulos Principales

### 1. Dashboard 📊
- KPIs en tiempo real actualizados cada 5 segundos
- Gráficos interactivos (Recharts):
  - Tendencia de asistencia semanal (Barras)
  - Distribución de turnos (Pie)
  - Horas extra por departamento (Barras horizontales)
- Actividad reciente y notificaciones
- Reloj en vivo
- Vistas personalizadas por rol

### 2. Empleados 👥
- **Listado completo** con búsqueda y filtros avanzados
- **Ficha del empleado** con 5 pestañas:
  - Datos Personales
  - Información Organizacional
  - Marcaciones biométricas
  - Justificaciones y ausencias
  - Planificación de turnos
- Acciones CRUD completas
- Paginación de registros
- Exportación de datos

### 3. Configuración ⚙️
- **Turnos y Horarios**
  - Constructor visual de turnos
  - Bloques de jornada ordinaria/nocturna
  - Configuración de horas extras
- **Dispositivos Biométricos**
  - Registro de terminales
  - Configuración de teclas
- **Parámetros Generales**
  - Configuración del sistema
- **Movimientos/Teclas**
  - Definición de teclas de marcación

### 4. Estructura Organizacional 🏢
- **Empresas:** Gestión multi-empresa
- **Localidades:** Multi-sede
- **Departamentos:** Estructura por departamentos
- **Áreas:** Subdivisiones por área
- **Cargos:** Definición de posiciones
- **Roles de Pago:** Períodos de pago
- **Centros de Costo:** Control de costos
- **Grupos:** Agrupaciones personalizadas

### 5. Mantenimiento 🔧
- **Feriados:** Nacionales y locales
- **Catálogos:** Sistema de catálogos parametrizable
- **Justificaciones:** Motivos de ausencia con códigos

### 6. Procesos 🔄
- Depuración de marcaciones
- Procesamiento de ausencias
- Generación de horas extra
- Cálculo automático de tiempos
- Validación de reglas de negocio

### 7. Reportería 📈
- Reportes de asistencia
- Horas extra mensuales
- Ausencias por departamento
- Nómina procesada
- Exportación Excel/PDF

### 8. Seguridades 🔒
- Transacciones del sistema
- Opciones y permisos
- Criterios de acceso
- Roles y usuarios
- Reportes de seguridad
- Auditoría completa

### 9. Sincronización 🔄
- Importación de empleados
- Exportación a nómina
- Validación de datos
- Formatos estándares
- Log de operaciones

---

## 💻 Tecnologías Utilizadas

### Frontend
- **React 18** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **Tailwind CSS 4.0** - Framework de estilos
- **Shadcn/ui** - Componentes de UI de alta calidad
- **Recharts** - Gráficos y visualizaciones
- **Lucide React** - Iconos modernos
- **Sonner** - Notificaciones toast
- **Motion/React** - Animaciones fluidas

### Componentes y Utilidades
- **date-fns** - Manejo de fechas
- **clsx** - Utilidad para clases CSS
- **React Hook Form** - Gestión de formularios
- **Radix UI** - Componentes primitivos accesibles

---

## 🎬 Flujo de Demostración Recomendado

### 📍 Paso 1: Landing Page (5 min)
1. Mostrar diseño profesional y moderno
2. Destacar características principales
3. Revisar planes (SaaS vs On-Premise)
4. Click en "Comenzar Ahora"

### 🔐 Paso 2: Login (2 min)
1. Mostrar pantalla de login profesional
2. Explicar sistema de roles
3. Demostrar con usuario `supervisor@titanium.com`

### 📊 Paso 3: Dashboard (5 min)
1. Reloj en tiempo real
2. KPIs que se actualizan
3. Gráficos interactivos
4. Actividad reciente

### 👥 Paso 4: Gestión de Empleados (10 min)
1. **Listado:** Búsqueda, filtros, paginación
2. **Ficha:** Recorrer las 5 pestañas
3. **Acciones:** Crear, Editar, Eliminar
4. **Marcaciones:** Vista de registros biométricos
5. **Planificación:** Asignación de turnos

### ⚙️ Paso 5: Configuración (8 min)
1. **Mantenimiento:** Feriados y catálogos
2. **Configuración:** Constructor de turnos
3. **Estructura:** Empresas, localidades, departamentos

### 📈 Paso 6: Procesos y Reportes (5 min)
1. Procesamiento automático
2. Generación de reportes
3. Exportación de datos

### 🔄 Paso 7: Cambio de Rol (3 min)
1. Logout
2. Login como `admin@titanium.com`
3. Mostrar módulos adicionales

---

## 💡 Puntos Clave de Venta

### ✅ Beneficios para el Cliente

1. **Reducción del 50%** en tiempo de procesos de RRHH
2. **Eliminación de errores** en cálculo de nómina
3. **Visibilidad en tiempo real** de la fuerza laboral
4. **Cumplimiento normativo** automático
5. **Integración perfecta** con sistemas existentes
6. **ROI medible** desde el primer mes

### ✅ Ventajas Competitivas

- **Interfaz moderna e intuitiva** - Curva de aprendizaje mínima
- **Multi-empresa y multi-sede** - Escalable para grupos empresariales
- **Constructor visual de turnos** - No requiere conocimientos técnicos
- **Reportería personalizable** - Informes a medida
- **Sincronización automática** - Integración con cualquier sistema de nómina
- **Diseño responsive** - Acceso desde cualquier dispositivo

---

## 📱 Características Técnicas

### Performance
- ⚡ Carga inicial < 2 segundos
- ⚡ Navegación instantánea
- ⚡ Actualización en tiempo real
- ⚡ Optimización de renders

### Accesibilidad
- ♿ WCAG 2.1 Level AA compliant
- ♿ Navegación por teclado completa
- ♿ Lectores de pantalla compatibles
- ♿ Alto contraste y textos escalables

### Seguridad
- 🔒 Autenticación robusta
- 🔒 Control de acceso por roles
- 🔒 Auditoría completa
- 🔒 Validación de datos
- 🔒 Protección contra inyección

### Responsive Design
- 📱 Mobile First
- 💻 Tablet optimizado
- 🖥️ Desktop completo
- 📺 Pantallas grandes

---

## 🎓 Guía de Uso Rápido

### Para Supervisores
1. Login con `supervisor@titanium.com`
2. Ver Dashboard con métricas de su área
3. Gestionar empleados a cargo
4. Revisar marcaciones del día
5. Aprobar justificaciones
6. Generar reportes

### Para Administradores
1. Login con `admin@titanium.com`
2. Configurar estructura organizacional
3. Definir turnos y horarios
4. Gestionar catálogos del sistema
5. Configurar dispositivos biométricos
6. Ejecutar procesos masivos

### Para Seguridades
1. Login con `seguridades@titanium.com`
2. Revisar log de transacciones
3. Gestionar permisos de usuarios
4. Configurar roles y accesos
5. Auditar actividad del sistema

---

## 📞 Contacto y Soporte

### Titanium-Labs Corp.
- **Email:** info@titanium-labs.com
- **Teléfono:** +593 (9) 9999-9999
- **Web:** www.titanium-labs.com
- **Soporte:** soporte@titanium-labs.com

### Horario de Atención
- Lunes a Viernes: 8:00 AM - 6:00 PM
- Sábados: 9:00 AM - 1:00 PM
- Soporte 24/7 disponible para clientes Premium

---

## 📄 Licencia y Propiedad

**Copyright © 2025 Titanium-Labs Corp. Todos los derechos reservados.**

Este software es propiedad exclusiva de Titanium-Labs Corp. El uso, distribución o modificación sin autorización expresa está estrictamente prohibido.

### Versión Demo
Esta es una versión de demostración con fines de presentación comercial. Los datos mostrados son ficticios y de ejemplo. No debe utilizarse para procesos productivos.

---

## 🚀 Próximos Pasos

### Para Adquirir el Sistema

1. **Solicitar Demo Personalizada**
   - Contactar a nuestro equipo comercial
   - Agendar presentación con casos de uso específicos

2. **Evaluación y Cotización**
   - Análisis de requerimientos
   - Propuesta comercial personalizada
   - ROI proyectado

3. **Prueba Piloto** (Opcional)
   - 30 días de prueba sin costo
   - Hasta 50 empleados
   - Soporte técnico incluido

4. **Implementación**
   - SaaS: 1-2 semanas
   - On-Premise: 4-6 semanas
   - Capacitación incluida

5. **Go Live y Soporte**
   - Puesta en marcha asistida
   - Soporte técnico 24/7
   - Actualizaciones continuas

---

## 🎉 ¡Gracias por su Interés!

**Turnos Titanium** - La solución completa para la gestión moderna de asistencias y turnos laborales.

Designed by **Titanium-Labs Corp.** © 2025

---

<div align="center">

**¿Listo para transformar la gestión de RRHH en su empresa?**

[Solicitar Demo](mailto:info@titanium-labs.com) | [Ver Planes](https://titanium-labs.com/planes) | [Contactar Ventas](https://titanium-labs.com/contacto)

</div>
