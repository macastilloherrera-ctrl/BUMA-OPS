# BUMA OPS - Decisiones de Arquitectura y Suposiciones

## Modulo 1: Decisiones Tecnicas

### 1. Arquitectura General
- **Stack**: React + Express + PostgreSQL + TypeScript
- **Autenticacion**: Replit Auth (OpenID Connect) - permite login con Google, GitHub, etc.
- **Almacenamiento de archivos**: Replit Object Storage para fotos de visitas

### 2. Modelo de Datos

#### Usuarios y Roles
- Los usuarios se autentican via Replit Auth, que crea un registro en la tabla `users`
- La tabla `user_profiles` extiende los datos de auth con el rol del sistema
- **Roles implementados**:
  - `gerente_general`: Acceso total, ve costos
  - `gerente_operaciones`: Gestiona visitas/tickets, ve costos, aprueba equipos
  - `gerente_finanzas`: Solo lectura en dashboards
  - `ejecutivo_operaciones`: Trabajo de campo, no ve costos

#### Visitas
- Estados: borrador, programada, atrasada, en_curso, realizada, cancelada
- El estado "atrasada" se calcula automaticamente cuando `scheduledDate < now()` y status = programada
- Tipos de checklist: rutina (estandar) y emergencia (requiere incidente)

#### Tickets
- Prioridad semaforo: rojo (critico), amarillo (por vencer), verde (al dia)
- El campo `cost` solo es visible/editable por gerencias (backend valida rol)
- Responsables: ejecutivo, proveedor, conserjeria, comite

#### Equipos Criticos
- Flujo de aprobacion: ejecutivos sugieren (status=pendiente), gerente aprueba/rechaza
- Tipos predefinidos: ascensor, bombas, porton, CCTV, etc.

### 3. Decisiones de UX

#### Mobile-First para Ejecutivos
- Navegacion inferior con 4 tabs principales
- Cards grandes con areas de toque amplias (44x44 min)
- Checklist de visita ocupa toda la pantalla
- Fotos capturadas directamente desde el dispositivo

#### Desktop-First para Gerentes
- Sidebar de navegacion con grupos colapsables
- Dashboards con tablas y filtros avanzados
- Acciones en dropdown menus por fila

### 4. Seguridad

#### Matriz de Autorizacion (Roles vs Scopes)

| Rol | buildingScope | Visibilidad | Puede Modificar | Ve Costos |
|-----|---------------|-------------|-----------------|-----------|
| gerente_general | N/A | Todo | Todo | Si |
| gerente_operaciones | N/A | Todo | Todo | Si |
| gerente_finanzas | N/A | Todo (solo lectura) | Nada | Si |
| ejecutivo_operaciones | assigned | Solo edificios asignados | Solo sus entidades | No |
| ejecutivo_operaciones | all | Todos los edificios | Todas las entidades | No |

#### Control de Acceso por Entidad

El sistema usa la funcion `canAccessEntity` para verificar acceso a visitas, tickets e incidentes:
1. **Managers** (gerente_general, gerente_operaciones): Acceso total
2. **buildingScope "all"**: Acceso global sin restriccion de edificio
3. **Propietario**: Si el usuario es el ejecutivo asignado a la entidad
4. **Edificio asignado**: Si el edificio de la entidad esta asignado al usuario

#### Restriccion de Costos
- Los campos `cost` en tickets e incidentes solo son retornados por el API si el usuario tiene rol gerente_general o gerente_operaciones
- `sanitizeCostFields`: Elimina campos de costo del request body para non-managers
- `stripCostFields`: Elimina campos de costo de respuestas para non-managers
- El frontend nunca muestra campos de costo para ejecutivos

#### Validacion de Permisos
- Middleware `isAuthenticated` protege todas las rutas /api
- Validacion de rol en endpoints especificos (ej: aprobar equipo)
- `canAccessBuilding`: Valida acceso a edificio antes de crear entidades
- `canAccessEntity`: Valida acceso a entidades antes de leer/modificar

### 5. Suposiciones

1. **Checklists predefinidos**: Se asume un checklist estandar para visitas de rutina y otro para emergencias. Los items son fijos por ahora.

2. **Calculo de atrasos**: Una visita se considera atrasada si su fecha programada ya paso y no ha sido iniciada/completada.

3. **Tickets vencidos**: Un ticket esta vencido si `dueDate < now()` y `status != resuelto`.

4. **Sin notificaciones push**: El sistema no envia notificaciones activas. Los dashboards muestran el estado actual.

5. **Informes simples**: Los informes post-visita son HTML/PDF basicos con resumen de checklist, fotos y tickets creados.

6. **Sin integracion externa**: No hay conexion con Edipro, ComunidadFeliz ni otros sistemas externos.

7. **Zona horaria**: Se asume zona horaria de Chile (America/Santiago) para todas las fechas.

### 6. Limitaciones Conocidas

1. **Generacion PDF**: Implementacion basica, puede requerir mejoras de formato
2. **Busqueda**: No hay busqueda full-text, solo filtros basicos
3. **Historico**: No se mantiene historial de cambios de estado
4. **Offline**: No hay soporte offline para ejecutivos en terreno

### 7. Proximos Pasos (Modulo 2+)

- Mantenciones programadas preventivas
- Historial y auditoria de cambios
- Notificaciones internas
- Integracion con proveedores
- Reportes ejecutivos avanzados
