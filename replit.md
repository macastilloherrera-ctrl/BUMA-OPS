# BUMA OPS - Plataforma de Operaciones

## Descripcion
Plataforma interna de operaciones para gestionar visitas a terreno, tickets operativos, incidentes y equipos criticos en edificios administrados.

## Stack Tecnologico
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI
- **Backend**: Express + Node.js
- **Base de Datos**: PostgreSQL (Neon) con Drizzle ORM
- **Autenticacion**: Replit Auth (OpenID Connect)
- **Almacenamiento**: Replit Object Storage para fotos

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
1. **Gerente General**: Acceso total, ve costos, aprueba equipos
2. **Gerente Operaciones**: Gestiona visitas/tickets, ve costos, aprueba equipos
3. **Gerente Finanzas**: Solo lectura en dashboards
4. **Ejecutivo Operaciones**: Trabajo de campo, no ve costos

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

### Administracion de Usuarios (Solo Gerente General y Gerente Operaciones)
- CRUD completo de usuarios con perfiles
- Asignacion de roles y edificios
- Activacion/desactivacion de usuarios
- Vista tabular con filtros y busqueda
- Gestion de edificios asignados para ejecutivos
- API: `/api/admin/users`, `/api/admin/roles`

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
