# BUMA OPS - Plataforma de Operaciones

## Descripcion
Plataforma interna de operaciones para gestionar visitas a terreno, tickets operativos, incidentes y equipos criticos en edificios administrados.

## Stack Tecnologico
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI
- **Backend**: Express + Node.js
- **Base de Datos**: PostgreSQL (Neon) con Drizzle ORM
- **Autenticacion**: Email/contraseña tradicional con bcrypt (para emails @buma.cl)
- **Almacenamiento**: Replit Object Storage para fotos

## Sistema de Autenticacion
El sistema usa autenticacion tradicional con email y contraseña diseñado para empleados BUMA con correos @buma.cl.

### Flujo de Autenticacion
1. Super Admin crea usuario con contraseña temporal
2. Usuario inicia sesion con email y contraseña
3. En primer ingreso, se obliga a cambiar contraseña
4. Sistema valida usuario activo antes de permitir acceso
5. Saludo de voz con nombre del usuario al ingresar

### Rutas de API
- `POST /api/auth/login` - Iniciar sesion
- `POST /api/auth/logout` - Cerrar sesion  
- `POST /api/auth/change-password` - Cambiar contraseña
- `POST /api/super-admin/users/:id/reset-password` - Reset contraseña (Super Admin)

### Campos de Usuario para Auth
- `passwordHash` - Hash bcrypt de la contraseña
- `mustChangePassword` - Flag para forzar cambio en primer login
- `lastLoginAt` - Timestamp del ultimo login

## Estructura del Proyecto
```
├── client/                 # Frontend React
│   └── src/
│       ├── components/     # Componentes reutilizables
│       ├── pages/          # Paginas de la aplicacion
│       ├── hooks/          # Custom hooks (use-auth, use-toast)
│       └── lib/            # Utilidades (queryClient)
├── server/                 # Backend Express
│   ├── routes.ts           # API endpoints
│   ├── storage.ts          # Capa de acceso a datos
│   └── db.ts               # Conexion a base de datos
├── shared/                 # Codigo compartido
│   └── schema.ts           # Modelos y tipos TypeScript
├── DECISIONS.md            # Decisiones de arquitectura
└── design_guidelines.md    # Guias de diseno UI
```

## Roles de Usuario
1. **Super Admin**: Configuracion del sistema, branding, gestion avanzada de usuarios
2. **Gerente General**: Acceso total, ve costos, aprueba equipos, administra usuarios
3. **Gerente Operaciones**: Gestiona visitas/tickets, ve costos, aprueba equipos
4. **Gerente Comercial**: Acceso similar a Gerente Operaciones con reportes de egresos
5. **Gerente Finanzas**: Acceso a modulo financiero (ingresos/egresos/consumos), dashboards y reportes
6. **Ejecutivo Operaciones**: Trabajo de campo, no ve costos ni finanzas
7. **Conserjeria**: Solo ve tickets de su edificio (receiverType=personal_edificio), puede subir evidencia y notas, sin acceso a costos/reportes/finanzas

## Funcionalidades Principales

### Ejecutivos (Mobile-First)
- Programar y ejecutar visitas con checklist
- Crear tickets desde hallazgos
- Sugerir equipos criticos
- Capturar fotos en visitas
- Derivar tickets a otros ejecutivos/gerentes con historial completo

### Gerentes (Desktop-First)
- Dashboard semaforo de tickets (rojo/amarillo/verde)
- Panel de visitas con cobertura de edificios
- Gestion de edificios y equipos criticos
- Visibilidad de costos

### Administracion de Usuarios (Solo Gerente General)
- CRUD completo de usuarios con perfiles
- Asignacion de roles y edificios
- Activacion/desactivacion de usuarios
- Vista tabular con filtros y busqueda
- Gestion de edificios asignados para ejecutivos
- API: `/api/admin/users`, `/api/admin/roles`

### Proyectos (Obras y Mejoras)
Modulo para gestionar obras y mejoras a largo plazo en edificios.

**Permisos:**
- Gerentes (General, Operaciones, Comercial): Crear, editar, eliminar proyectos
- Ejecutivos: Ver proyectos, actualizar estado/observaciones de hitos

**Tablas de BD:**
- `projects`: Proyecto principal (nombre, edificio, fechas, presupuesto, contratista)
- `projectMilestones`: Hitos del proyecto con estado (pendiente/en_progreso/completado)
- `projectDocuments`: Documentos asociados (cotizaciones, contratos, actas)
- `projectUpdates`: Fiscalizaciones y actualizaciones de avance

**Sistema Semaforo:**
- Verde: >15 dias hasta fecha de termino
- Amarillo: 5-15 dias hasta fecha de termino
- Rojo: <5 dias o vencido

**Rutas de API:**
- `GET/POST /api/projects` - Listar/crear proyectos
- `GET/PATCH/DELETE /api/projects/:id` - Ver/editar/eliminar proyecto
- `POST/PATCH/DELETE /api/projects/:id/milestones/:id` - Gestion de hitos
- `POST/DELETE /api/projects/:id/documents/:id` - Gestion de documentos
- `POST /api/projects/:id/updates` - Crear fiscalizacion
- `PATCH /api/projects/:id/updates/:id/approve` - Aprobar fiscalizacion

### Modulo Financiero (Fase 1)
Gestion de ingresos, egresos y consumos recurrentes con exportacion Edipro.

**Permisos de acceso (backend 403):**
- Solo gerente_general, gerente_comercial y gerente_finanzas pueden acceder
- gerente_operaciones NO tiene acceso a modulos financieros (usa Consulta Operacional en su lugar)
- Ejecutivo y conserjeria reciben 403 en TODOS los endpoints financieros (GET/POST/PATCH/DELETE)
- Export Edipro tambien protegido con canExportFinancial()

**Tablas de BD:**
- `incomes`: Ingresos por edificio (monto, unidad/depto, fecha, banco, estado)
- `expenses`: Egresos con campos Edipro (fondo, subfondo, proveedor, forma de pago, validacion)
- `recurring_expense_templates`: Templates mensuales (solo plantillas en Fase 1, sin instancias automaticas)

**Campos especiales de expenses:**
- `inclusionStatus`: "included" | "postponed" - los POSTPONED NO se exportan a Edipro
- `postponementReason`: Motivo de postergacion (obligatorio si postponed)
- `vendorEdipro`: Nombre estandarizado del proveedor para Edipro (si vacio, se usa vendorName)
- `operationallyValidated` / `financiallyValidated`: Doble validacion operativa y financiera

**Exportacion multi-formato (Edipro, Comunidad Feliz, Kastor, Generico):**
- Ingresos formato Edipro: 10 columnas [Numero, Monto, Unidad, Descripcion("abono"), Anulado("NO"), Fecha ingreso(dd-mm-yyyy), Fondo("Gasto comun"), Forma de pago("Transferencia"), Banco, Numero comprobante]
- Egresos formato Edipro: 13 columnas [Numero, Fondo("Gasto comun"), Subfondo(category), Descripcion, Monto, Documento, Fecha egreso(dd-mm-yyyy), Fecha banco(""), Anulado("NO"), Proveedor(vendorEdipro||vendorName), Numero respaldo(""), Forma de pago, Fecha cheque("")]
- Solo exporta ingresos con status="identified" y egresos con paymentStatus="paid" AND inclusionStatus!="postponed"
- Formato: .xlsx UTF-8, fechas en formato es-CL (dd-mm-yyyy)
- La exportacion de conciliacion bancaria fusiona transacciones de cartola + ingresos manuales del mismo periodo

**Division de depositos:**
- POST /api/incomes/split: Divide 1 deposito en N departamentos
- Valida que suma de partes == total del deposito (tolerancia 0.01)
- UI con filas dinamicas y validacion en tiempo real

**Consumos recurrentes (Fase 1):**
- Solo templates/plantillas (no genera instancias automaticas por mes)
- Categorias predefinidas: Agua, Luz, Gas, Internet, Aseo, Materiales, Seguridad, Jardines, Piscina, Administracion, Otro
- Activacion/desactivacion de templates
- Fase 2 prevista: Generacion automatica de instancias mensuales desde templates

**Directorio de Proveedores:**
- Tabla `vendors`: id, name (MAYUSCULAS), rut, isActive
- Auto-creacion: al ingresar un egreso, si el proveedor no existe se crea automaticamente
- Normalizacion: todos los nombres se guardan en MAYUSCULAS para evitar duplicados
- Autocompletado: el formulario de egresos sugiere proveedores existentes mientras se escribe
- API: `GET /api/vendors` - Lista todos los proveedores activos

**Prevencion de duplicados de documentos:**
- Campo `documentType` en egresos: factura, boleta, otro
- Validacion: no se permite ingresar dos facturas/boletas con el mismo numero y proveedor
- Backend retorna 409 si detecta duplicado con mensaje descriptivo
- Aplica en creacion (POST) y edicion (PATCH) de egresos

**Rutas de API:**
- `GET /api/vendors` - Listar proveedores activos
- `GET/POST /api/incomes` - Listar/crear ingresos
- `PATCH/DELETE /api/incomes/:id` - Editar/eliminar ingreso
- `POST /api/incomes/split` - Dividir deposito en N departamentos
- `GET /api/incomes/export` - Exportar ingresos (formato: edipro/comunidadfeliz/kastor/generico)
- `GET/POST /api/expenses` - Listar/crear egresos (con deteccion de duplicados)
- `PATCH/DELETE /api/expenses/:id` - Editar/eliminar egreso (con deteccion de duplicados)
- `GET /api/expenses/export` - Exportar egresos (formato: edipro/comunidadfeliz/kastor/generico)
- `GET/POST /api/recurring-expense-templates` - Listar/crear templates
- `PATCH/DELETE /api/recurring-expense-templates/:id` - Editar/eliminar template

### Conciliacion Bancaria
Importacion de cartolas bancarias, matching automatico y exportacion multi-formato.

**Tablas de BD:**
- `bank_transactions`: Transacciones bancarias importadas (fecha, monto, glosa, RUT, estado, unidad asignada)
- `payer_directory`: Directorio de pagadores por edificio (RUT, patron, unidad, confianza)

**Estados de transaccion:** pending, identified, suggested, multi, ignored

**Motor de matching (4 reglas):**
1. Directorio de pagadores por RUT (confianza >= 80% → identificado)
2. Directorio de pagadores por patron de texto
3. Patrones en glosa (regex: dpto/local/oficina/bodega + numero)
4. Historial de transacciones previas identificadas

**Formatos de exportacion:** Edipro (10 col), Comunidad Feliz (5 col), Kastor (5 col), Generico (7 col)

**Deduplicacion:** Hash SHA-256 de {fecha, monto, descripcion, referencia}

**Rutas de API:**
- `GET /api/bank-transactions` - Listar transacciones (filtros: buildingId, status, month, year)
- `POST /api/bank-transactions/import` - Importar cartola CSV/XLSX
- `POST /api/bank-transactions/reconcile` - Ejecutar motor de matching
- `PATCH /api/bank-transactions/:id/assign` - Asignar unidad manualmente
- `PATCH /api/bank-transactions/:id/confirm` - Confirmar sugerencia
- `PATCH /api/bank-transactions/:id/ignore` - Ignorar transaccion
- `POST /api/bank-transactions/:id/split` - Dividir deposito en N unidades
- `GET /api/bank-transactions/export` - Exportar (formato: edipro/comunidadfeliz/kastor/generico)
- `GET/POST/DELETE /api/payer-directory` - CRUD directorio de pagadores

### Cierre Mensual de Gastos Comunes
Gestion del ciclo mensual de emision de gastos comunes por edificio.

**Permisos:**
- Gerente General y Gerente Comercial: Crear, editar, eliminar ciclos y cambiar estados
- Gerente Finanzas: Ver ciclos y marcar checklist (no puede cambiar estados)
- Gerente Operaciones: Solo puede consultar estado via Consulta Operacional

**Tablas de BD:**
- `monthly_closing_cycles`: Ciclo de cierre (edificio, periodo, estado, fechas clave, riesgo)
- `monthly_closing_checklist`: Items del checklist por ciclo (7 items default)

**Estados del ciclo:** open, preparation, pending_info, pre_ready, under_review, approved, issued

**Semaforo:**
- Verde: approved/issued
- Amarillo: preparation/pre_ready/under_review
- Rojo: open/pending_info
- Gris: sin ciclo

**Checklist default (7 items):**
1. Egresos recibidos completos
2. Egresos validados por comercial
3. Ingresos conciliados completos
4. Export listo
5. Pre-gasto comun enviado a comite
6. Ajustes solicitados por comite
7. Emision final confirmada

**Rutas de API:**
- `GET/POST /api/monthly-closing-cycles` - Listar/crear ciclos
- `GET/PATCH/DELETE /api/monthly-closing-cycles/:id` - Ver/editar/eliminar ciclo
- `PATCH /api/monthly-closing-cycles/:id/status` - Cambiar estado del ciclo
- `GET /api/monthly-closing-cycles/:id/checklist` - Ver checklist
- `PATCH /api/monthly-closing-cycles/:id/checklist/:itemId` - Marcar item del checklist

### Consulta Operacional
Vista de solo lectura para roles de Operaciones (gerente_operaciones, ejecutivo_operaciones).

**Ruta:** `/consulta-operacional`

**Muestra datos agregados sin montos:**
- Estado del ciclo de cierre por edificio
- Cantidad de depositos conciliados vs pendientes
- Cantidad de egresos recibidos vs validados
- Cantidad de egresos postergados
- Fecha del ultimo deposito conciliado

**Rutas de API:**
- `GET /api/consulta-operacional` - Datos agregados por edificio y periodo

### Conserjeria
- Solo ve tickets asignados a su edificio con receiverType="personal_edificio"
- Puede subir evidencia (documentKey) y agregar notas en tickets
- Upload de fotos auditado con campo uploadedBy y timestamp
- No puede cerrar tickets, cambiar estado, ni ver costos
- Sin acceso a finanzas, reportes, edificios, equipos ni administracion

### Reportes (Todos los perfiles)
- **Estado Documental y Operativo**: Informe por edificio con scoring binario (0-100%)
  - Reglamento de copropiedad cargado (25%)
  - Equipos sin mantenciones vencidas (25%)
  - Minimo 4 visitas en ultimos 30 dias - 1 por semana (25%)
  - Sin tickets urgentes pendientes (25%)
- **Informe de Egresos**: Solo gerente_general y gerente_comercial, formato Edipro

## Comandos de Desarrollo
```bash
npm run dev          # Iniciar servidor de desarrollo
npm run db:push      # Sincronizar esquema de base de datos
npm run db:studio    # Abrir Drizzle Studio
```

## Variables de Entorno
- `DATABASE_URL`: URL de conexion a PostgreSQL
- `SESSION_SECRET`: Secreto para sesiones
- `REPL_ID`: ID del repl (auto-configurado)

## Decisiones Tecnicas
Ver archivo `DECISIONS.md` para documentacion completa de decisiones arquitectonicas y suposiciones del sistema.
