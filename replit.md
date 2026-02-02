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
4. **Gerente Finanzas**: Solo lectura en dashboards
5. **Ejecutivo Operaciones**: Trabajo de campo, no ve costos

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

### Reportes (Todos los perfiles)
- **Cumplimiento Normativo**: Informe por edificio con scoring binario (0-100%)
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
