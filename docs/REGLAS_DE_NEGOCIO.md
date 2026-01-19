# BUMA OPS - Reglas de Negocio

## Documento de Especificaciones Funcionales
**Versión:** 1.0  
**Fecha:** Enero 2026

---

## 1. VISITAS

### 1.1 Estados de Visitas

| Estado | Descripción | Color |
|--------|-------------|-------|
| **Borrador** | Visita creada pero no confirmada | Gris |
| **Programada** | Visita confirmada con fecha asignada | Azul |
| **Atrasada** | Fecha programada ya pasó y no se ha iniciado | Rojo |
| **En Curso** | Ejecutivo inició la visita | Amarillo |
| **Realizada** | Visita completada exitosamente | Verde |
| **Cancelada** | Visita cancelada (con motivo) | Gris oscuro |

### 1.2 Tipos de Visita

- **Rutina**: Visita programada regular de inspección
- **Urgente**: Visita de emergencia por incidente reportado

### 1.3 Flujo de Visita

1. **Programación**: El ejecutivo programa una visita para un edificio en una fecha específica
2. **Inicio**: El día de la visita, el ejecutivo presiona "Iniciar Visita" (se registra `startedAt`)
3. **Checklist**: El ejecutivo completa el checklist de inspección
4. **Hallazgos**: Si encuentra problemas, puede crear tickets directamente
5. **Fotos**: Puede adjuntar fotos como evidencia
6. **Finalización**: Al completar, presiona "Finalizar" (se registra `completedAt`)

### 1.4 Cálculo de Atrasos

Una visita se considera **ATRASADA** cuando:
- La fecha programada (`scheduledDate`) es anterior a la fecha actual
- El estado sigue siendo "programada" (no se ha iniciado)

### 1.5 Fechas Importantes

- **Fecha Programada** (`scheduledDate`): Cuándo debía realizarse la visita
- **Fecha de Inicio** (`startedAt`): Cuándo el ejecutivo inició la visita
- **Fecha de Realización** (`completedAt`): Cuándo se completó efectivamente la visita

> **Ejemplo**: Si una visita estaba programada para el 14 de enero pero se realizó el 19 de enero, se mostrará:
> - Programada: martes, 14 enero 2026
> - Realizada: domingo, 19 enero 2026 a las 15:30

### 1.6 Cobertura de Edificios

El sistema calcula automáticamente la cobertura de visitas por edificio:
- Se considera "cubierto" un edificio que ha tenido al menos 4 visitas en los últimos 30 días
- El indicador de cumplimiento normativo usa este criterio (25% del score)

---

## 2. TICKETS

### 2.1 Estados de Tickets

| Estado | Descripción | Color |
|--------|-------------|-------|
| **Pendiente** | Ticket abierto sin trabajo iniciado | Azul |
| **En Progreso** | Trabajo en curso | Amarillo |
| **Trabajo Completado** | Trabajo terminado, pendiente cierre | Naranja |
| **Resuelto** | Ticket cerrado completamente | Verde/Gris |
| **Vencido** | Fecha de vencimiento pasada sin resolver | Rojo |

### 2.2 Prioridades (Semáforo)

| Prioridad | Descripción | Color |
|-----------|-------------|-------|
| **Crítico** | Requiere atención inmediata | Rojo |
| **Por Vencer** | Próximo a vencer (7 días) | Amarillo |
| **Al Día** | Sin urgencia | Verde |

### 2.3 Tipos de Ticket

- **Urgencia**: Problema que requiere atención inmediata
- **Mantención**: Trabajo de mantenimiento programado
- **Planificado**: Mejora o proyecto planificado

### 2.4 Flujo de Cierre de Ticket

1. **Trabajo Completado**: El ejecutivo marca el trabajo como terminado
2. **Revisión de Factura**: El sistema pregunta si hay factura asociada
3. **Opciones de Cierre**:
   - **CON Factura**: Se ingresa número y monto de factura → Badge verde "Resuelto"
   - **SIN Factura**: Se indica que solo fue gestión → Badge gris "Resuelto"
   - **Factura Pendiente**: Proveedor enviará después → Badge naranja "Resuelto - Factura pendiente"

### 2.5 Colores de Badge "Resuelto"

| Color | Significado |
|-------|-------------|
| **Verde** | Resuelto CON factura adjunta |
| **Gris** | Resuelto SIN factura (no la requería) |
| **Naranja** | Resuelto pero factura PENDIENTE |

### 2.6 Derivación/Escalamiento

Los tickets pueden ser derivados (escalados) a gerentes:
- **Gerente General**: Puede recibir tickets escalados de cualquier área
- **Gerente de Operaciones**: Recibe tickets operativos escalados
- **Gerente Comercial**: Recibe tickets relacionados con cobros o temas comerciales

Cuando un ticket es derivado:
- Se registra en el historial de asignaciones
- El ticket aparece con indicador violeta en "Mis Tickets" del destinatario
- El contador de "Derivados a Mi" se actualiza en el dashboard

### 2.7 Historial de Asignaciones

Cada cambio de asignación registra:
- Quién asignó el ticket
- A quién fue asignado
- Fecha y hora
- Motivo de la derivación
- Si fue escalamiento a gerencia

---

## 3. ROLES Y PERMISOS

### 3.1 Roles del Sistema

| Rol | Descripción |
|-----|-------------|
| **Super Admin** | Configuración del sistema, branding, gestión avanzada |
| **Gerente General** | Acceso total, aprueba equipos, administra usuarios |
| **Gerente de Operaciones** | Gestiona visitas/tickets, ve costos, aprueba equipos |
| **Gerente Comercial** | Similar a Gerente de Operaciones, enfocado en temas comerciales |
| **Gerente de Finanzas** | Solo lectura en dashboards |
| **Ejecutivo de Operaciones** | Trabajo de campo, no ve costos |

### 3.2 Visibilidad de Costos

Solo los siguientes roles pueden ver costos:
- Gerente General
- Gerente de Operaciones
- Gerente Comercial

Los ejecutivos **NO** ven información de costos ni facturas.

### 3.3 Vista "Todos" vs "Míos"

Los gerentes tienen acceso a:
- **Todos los Tickets**: Ve todos los tickets del sistema
- **Mis Tickets**: Solo los tickets asignados directamente a ellos

Los ejecutivos solo ven sus propios tickets asignados.

---

## 4. EQUIPOS CRÍTICOS

### 4.1 Flujo de Aprobación

1. El ejecutivo sugiere un nuevo equipo crítico (estado: **pendiente**)
2. El gerente revisa y puede:
   - **Aprobar**: El equipo queda registrado oficialmente
   - **Rechazar**: Se registra el motivo del rechazo

### 4.2 Tipos de Equipos

- Ascensores
- Bombas de agua
- Portones eléctricos
- Sistema CCTV
- Sistemas de incendio
- Otros

---

## 5. CUMPLIMIENTO NORMATIVO

### 5.1 Cálculo de Score (0-100%)

Cada edificio tiene un score de cumplimiento basado en 4 criterios:

| Criterio | Peso | Descripción |
|----------|------|-------------|
| Reglamento de Copropiedad | 25% | Documento cargado en el sistema |
| Mantenciones al día | 25% | Equipos sin mantenciones vencidas |
| Cobertura de visitas | 25% | Mínimo 4 visitas en últimos 30 días |
| Sin tickets urgentes | 25% | Sin tickets críticos pendientes |

### 5.2 Interpretación

- **100%**: Edificio en cumplimiento total
- **75%**: Un criterio no cumplido
- **50%**: Dos criterios no cumplidos
- **25%**: Tres criterios no cumplidos
- **0%**: Ningún criterio cumplido

---

## 6. NOTIFICACIONES

### 6.1 Tipos de Notificaciones Internas

- Ticket asignado/derivado a usuario
- Visita próxima a vencer
- Equipo crítico aprobado/rechazado
- Comentario en ticket asignado

### 6.2 Indicadores Visuales

- Badge rojo en campana de notificaciones (contador de no leídas)
- Badge violeta en "Mis Tickets" cuando hay tickets derivados
- Resaltado de filas con tickets delegados

---

## 7. REPORTES

### 7.1 Informe de Cumplimiento Normativo
Muestra el score de cada edificio con detalle de criterios cumplidos.

### 7.2 Informe de Egresos (Formato Edipro)
Solo accesible para Gerente General y Gerente Comercial.
Incluye facturas de tickets cerrados con totales por período.

---

*Documento generado automáticamente por BUMA OPS*
