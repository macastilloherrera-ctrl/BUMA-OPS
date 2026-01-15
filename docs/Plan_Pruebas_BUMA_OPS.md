# Plan de Pruebas Completo - BUMA OPS

## 1. Resumen de Perfiles de Usuario

| Perfil | Descripcion | Ve Costos | Aprueba Equipos | Alcance Edificios |
|--------|-------------|-----------|-----------------|-------------------|
| Super Admin | Configuracion del sistema | Si | Si | Todos |
| Gerente General | Acceso total a la plataforma | Si | Si | Todos |
| Gerente Operaciones | Gestion operativa | Si | Si | Todos |
| Gerente Comercial | Reportes financieros | Si | Si | Todos |
| Gerente Finanzas | Solo lectura dashboards | Si | No | Todos |
| Ejecutivo Operaciones | Trabajo de campo | No | No | Asignados |

---

## 2. Pruebas por Perfil

### 2.1 Super Admin

#### Acceso y Navegacion
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| SA-01 | Login como Super Admin | 1. Ir a /dev-login 2. Seleccionar Super Admin 3. Click Login | Redirige a /super-admin |
| SA-02 | Acceso al Panel Super Admin | 1. Navegar a /super-admin | Panel visible con 4 pestanas: Configuracion, Usuarios, Logs, Documentacion |
| SA-03 | Cambiar nombre de empresa | 1. Ir a Configuracion 2. Modificar "Nombre de la Empresa" 3. Click Guardar | Nombre actualizado, visible en sidebar |
| SA-04 | Cambiar color primario | 1. Ir a Configuracion 2. Seleccionar nuevo color 3. Click Guardar | Color aplicado en toda la interfaz |
| SA-05 | Subir logo | 1. Ir a Configuracion 2. Click "Subir Logo" 3. Seleccionar imagen 3. Guardar | Logo visible en sidebar |
| SA-06 | Ver lista de usuarios | 1. Click pestana Usuarios | Lista de todos los usuarios del sistema |
| SA-07 | Crear nuevo usuario | 1. Click "Nuevo Usuario" 2. Completar formulario 3. Guardar | Usuario creado y visible en lista |
| SA-08 | Editar usuario existente | 1. Click icono editar en usuario 2. Modificar datos 3. Guardar | Datos actualizados |
| SA-09 | Desactivar usuario | 1. Click icono toggle en usuario activo | Usuario marcado como inactivo |
| SA-10 | Asignar edificios a ejecutivo | 1. Editar ejecutivo 2. Seleccionar edificios 3. Guardar | Edificios asignados correctamente |
| SA-11 | Descargar documentacion | 1. Click pestana Documentacion 2. Click cualquier documento | Archivo .docx descargado |
| SA-12 | No puede acceder a modulos operativos | 1. Intentar navegar a /visitas | Redirige a /super-admin |

#### Restricciones
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| SA-R01 | No ve dashboard operativo | Navegar a /dashboard/overview | Acceso denegado o redireccion |
| SA-R02 | No ve tickets | Navegar a /tickets | Acceso denegado o redireccion |
| SA-R03 | No ve visitas | Navegar a /visitas | Acceso denegado o redireccion |

---

### 2.2 Gerente General

#### Acceso y Navegacion
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| GG-01 | Login como Gerente General | 1. Ir a /dev-login 2. Seleccionar Gerente General | Redirige a /dashboard/overview |
| GG-02 | Ver Dashboard Overview | 1. Navegar a /dashboard/overview | Dashboard con metricas globales visible |
| GG-03 | Ver Dashboard Tickets | 1. Navegar a /dashboard/tickets | Semaforo de tickets (rojo/amarillo/verde) |
| GG-04 | Ver Dashboard Visitas | 1. Navegar a /dashboard/visitas | Panel de cobertura de visitas |
| GG-05 | Ver todos los edificios | 1. Navegar a /edificios | Lista completa de edificios (no solo asignados) |
| GG-06 | Crear edificio | 1. Click "Nuevo Edificio" 2. Completar datos 3. Guardar | Edificio creado |
| GG-07 | Editar edificio | 1. Click en edificio 2. Modificar datos 3. Guardar | Datos actualizados |
| GG-08 | Ver todos los tickets | 1. Navegar a /tickets | Lista de todos los tickets del sistema |
| GG-09 | Ver costos en tickets | 1. Abrir detalle de ticket con costo | Campo "Costo" visible con valor |
| GG-10 | Aprobar equipo critico | 1. Ir a /equipos 2. Ver equipo pendiente 3. Click Aprobar | Equipo aprobado |
| GG-11 | Ver todas las visitas | 1. Navegar a /visitas | Lista de todas las visitas |
| GG-12 | Programar visita | 1. Click "Programar Visita" 2. Seleccionar edificio/fecha 3. Guardar | Visita creada |
| GG-13 | Acceso a admin usuarios | 1. Navegar a /admin/usuarios | Panel de administracion de usuarios |
| GG-14 | Ver reporte cumplimiento | 1. Navegar a /reportes/cumplimiento | Informe con scoring por edificio |
| GG-15 | Ver reporte egresos | 1. Navegar a /reportes/egresos | Informe financiero formato Edipro |
| GG-16 | Ver reporte equipos | 1. Navegar a /reportes/equipos | Estadisticas de equipos criticos |
| GG-17 | Ver reporte ejecutivos | 1. Navegar a /reportes/ejecutivos | Metricas de rendimiento |
| GG-18 | Ver perfil propio | 1. Navegar a /perfil | Datos del usuario logueado |

---

### 2.3 Gerente Operaciones

#### Acceso y Navegacion
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| GO-01 | Login como Gerente Operaciones | 1. Ir a /dev-login 2. Seleccionar Gerente Operaciones | Redirige a /dashboard/tickets |
| GO-02 | Ver Dashboard Tickets | 1. Navegar a /dashboard/tickets | Semaforo de tickets visible |
| GO-03 | Ver Dashboard Visitas | 1. Navegar a /dashboard/visitas | Panel de cobertura |
| GO-04 | Gestionar tickets | 1. Ver lista 2. Abrir ticket 3. Cambiar estado | Ticket actualizado |
| GO-05 | Ver costos en tickets | 1. Abrir ticket con costo | Campo costo visible |
| GO-06 | Aprobar equipo critico | 1. Ir a /equipos 2. Aprobar equipo sugerido | Estado cambia a aprobado |
| GO-07 | Derivar ticket | 1. Abrir ticket 2. Click Derivar 3. Seleccionar destinatario | Ticket derivado, historial actualizado |
| GO-08 | Ver mantenedores | 1. Navegar a /mantenedores | Lista de proveedores |
| GO-09 | Ver ejecutivos | 1. Navegar a /ejecutivos | Lista de ejecutivos |
| GO-10 | Ver reportes operativos | 1. Navegar a /reportes/cumplimiento | Informe visible |

#### Restricciones
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| GO-R01 | No accede a admin usuarios | Navegar a /admin/usuarios | Acceso denegado |
| GO-R02 | No accede a Super Admin | Navegar a /super-admin | Acceso denegado |
| GO-R03 | No ve Dashboard Overview | Navegar a /dashboard/overview | Acceso denegado (exclusivo GG) |

---

### 2.4 Gerente Comercial

#### Acceso y Navegacion
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| GC-01 | Login como Gerente Comercial | 1. Ir a /dev-login 2. Seleccionar Gerente Comercial | Redirige a /dashboard/tickets |
| GC-02 | Ver Dashboard Tickets | 1. Navegar a /dashboard/tickets | Semaforo visible |
| GC-03 | Ver costos | 1. Abrir ticket con costo | Campo costo visible |
| GC-04 | Ver reporte egresos | 1. Navegar a /reportes/egresos | Informe financiero visible |
| GC-05 | Ver reporte cumplimiento | 1. Navegar a /reportes/cumplimiento | Informe visible |

#### Restricciones
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| GC-R01 | No accede a admin usuarios | Navegar a /admin/usuarios | Acceso denegado |
| GC-R02 | No accede a Super Admin | Navegar a /super-admin | Acceso denegado |

---

### 2.5 Gerente Finanzas

#### Acceso y Navegacion
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| GF-01 | Login como Gerente Finanzas | 1. Ir a /dev-login 2. Seleccionar Gerente Finanzas | Redirige a /dashboard/tickets |
| GF-02 | Ver Dashboard Tickets | 1. Navegar a /dashboard/tickets | Semaforo visible (solo lectura) |
| GF-03 | Ver tickets | 1. Navegar a /tickets | Lista de tickets (solo lectura) |
| GF-04 | Ver costos | 1. Abrir ticket con costo | Campo costo visible |
| GF-05 | Ver reporte cumplimiento | 1. Navegar a /reportes/cumplimiento | Informe visible |

#### Restricciones
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| GF-R01 | No puede aprobar equipos | Intentar aprobar equipo | Boton no disponible o error |
| GF-R02 | No puede crear tickets | Intentar crear ticket | Opcion no disponible |
| GF-R03 | No accede a visitas | Navegar a /visitas | Acceso denegado |
| GF-R04 | No accede a edificios | Navegar a /edificios | Acceso denegado |

---

### 2.6 Ejecutivo Operaciones

#### Acceso y Navegacion
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| EO-01 | Login como Ejecutivo | 1. Ir a /dev-login 2. Seleccionar Ejecutivo A | Redirige a /visitas |
| EO-02 | Ver solo edificios asignados | 1. Navegar a /edificios | Solo edificios donde esta asignado |
| EO-03 | Ver calendario | 1. Navegar a /calendario | Calendario con visitas propias |
| EO-04 | Ver mis visitas | 1. Navegar a /visitas | Solo visitas asignadas a mi |
| EO-05 | Iniciar visita | 1. Seleccionar visita programada 2. Click "Iniciar" | Estado cambia a "en_progreso" |
| EO-06 | Completar checklist | 1. Durante visita 2. Marcar items 3. Agregar observaciones | Checklist guardado |
| EO-07 | Capturar fotos | 1. Durante visita 2. Subir fotos | Fotos asociadas a visita |
| EO-08 | Finalizar visita | 1. Completar checklist 2. Click "Finalizar" | Estado cambia a "realizada" |
| EO-09 | Crear ticket desde hallazgo | 1. Durante visita 2. Click "Crear Ticket" 3. Completar datos | Ticket creado y vinculado |
| EO-10 | Ver mis tickets | 1. Navegar a /tickets | Solo tickets donde estoy asignado |
| EO-11 | Sugerir equipo critico | 1. Ir a /equipos 2. Click "Sugerir Equipo" 3. Completar datos | Equipo en estado "pendiente" |
| EO-12 | Ver reporte cumplimiento | 1. Navegar a /reportes/cumplimiento | Solo edificios asignados |

#### Restricciones
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| EO-R01 | No ve costos | 1. Abrir ticket con costo | Campo costo NO visible o vacio |
| EO-R02 | No puede aprobar equipos | Intentar aprobar equipo | Opcion no disponible |
| EO-R03 | No ve edificios no asignados | 1. Ir a /edificios | Solo edificios propios |
| EO-R04 | No accede a dashboards | Navegar a /dashboard | Acceso denegado |
| EO-R05 | No ve visitas de otros | 1. Ir a /visitas | Solo sus visitas |
| EO-R06 | No accede a admin | Navegar a /admin/usuarios | Acceso denegado |

---

## 3. Pruebas de Intercambio de Informacion Entre Perfiles

### 3.1 Flujo de Tickets

| ID | Caso de Prueba | Actores | Pasos | Resultado Esperado |
|----|----------------|---------|-------|-------------------|
| INT-T01 | Ejecutivo crea ticket, Gerente ve | Ejecutivo A, Gerente Ops | 1. Ejecutivo crea ticket 2. Gerente revisa lista | Gerente ve el ticket creado |
| INT-T02 | Derivacion de ticket | Gerente Ops, Ejecutivo B | 1. Gerente abre ticket 2. Deriva a Ejecutivo B 3. Ejecutivo B revisa | Ejecutivo B ve ticket en su lista |
| INT-T03 | Historial de derivacion | Ejecutivo A, Gerente, Ejecutivo B | 1. Crear ticket 2. Derivar 2 veces | Historial muestra todas las derivaciones |
| INT-T04 | Ticket con factura | Gerente Ops | 1. Abrir ticket 2. Registrar factura 3. Cerrar ticket | Factura registrada, ticket cerrado |
| INT-T05 | Costo visible para gerentes | Gerente General, Ejecutivo | 1. Gerente agrega costo 2. Ejecutivo ve ticket | Gerente ve costo, Ejecutivo NO lo ve |

### 3.2 Flujo de Visitas

| ID | Caso de Prueba | Actores | Pasos | Resultado Esperado |
|----|----------------|---------|-------|-------------------|
| INT-V01 | Gerente programa visita | Gerente Ops, Ejecutivo | 1. Gerente programa visita 2. Ejecutivo revisa calendario | Ejecutivo ve visita programada |
| INT-V02 | Ejecutivo completa visita | Ejecutivo, Gerente | 1. Ejecutivo completa visita 2. Gerente revisa dashboard | Dashboard actualizado con visita realizada |
| INT-V03 | Visita genera ticket | Ejecutivo, Gerente | 1. Ejecutivo crea ticket en visita 2. Gerente ve tickets | Ticket visible con referencia a visita |
| INT-V04 | Fotos de visita | Ejecutivo, Gerente | 1. Ejecutivo sube fotos 2. Gerente abre visita | Gerente ve fotos subidas |

### 3.3 Flujo de Equipos Criticos

| ID | Caso de Prueba | Actores | Pasos | Resultado Esperado |
|----|----------------|---------|-------|-------------------|
| INT-E01 | Ejecutivo sugiere, Gerente aprueba | Ejecutivo, Gerente Ops | 1. Ejecutivo sugiere equipo 2. Gerente aprueba | Equipo cambia a estado "aprobado" |
| INT-E02 | Equipo rechazado | Ejecutivo, Gerente | 1. Ejecutivo sugiere 2. Gerente rechaza | Equipo en estado "rechazado" |
| INT-E03 | Mantencion vencida genera alerta | Sistema, Gerente | 1. Mantencion vence 2. Gerente revisa dashboard | Alerta visible en dashboard |

### 3.4 Flujo de Usuarios

| ID | Caso de Prueba | Actores | Pasos | Resultado Esperado |
|----|----------------|---------|-------|-------------------|
| INT-U01 | Super Admin crea usuario | Super Admin, Nuevo Usuario | 1. SA crea usuario con rol 2. Usuario intenta login | Usuario puede acceder con permisos correctos |
| INT-U02 | GG asigna edificio a ejecutivo | Gerente General, Ejecutivo | 1. GG asigna edificio 2. Ejecutivo revisa | Ejecutivo ve nuevo edificio asignado |
| INT-U03 | Desactivar usuario | Super Admin, Usuario | 1. SA desactiva usuario 2. Usuario intenta acceder | Acceso denegado |

### 3.5 Flujo de Notificaciones

| ID | Caso de Prueba | Actores | Pasos | Resultado Esperado |
|----|----------------|---------|-------|-------------------|
| INT-N01 | Notificacion de ticket derivado | Usuario A, Usuario B | 1. A deriva ticket a B | B recibe notificacion |
| INT-N02 | Notificacion de visita asignada | Gerente, Ejecutivo | 1. Gerente asigna visita | Ejecutivo recibe notificacion |
| INT-N03 | Notificacion de equipo aprobado | Ejecutivo, Gerente | 1. Ejecutivo sugiere 2. Gerente aprueba | Ejecutivo recibe notificacion de aprobacion |

---

## 4. Pruebas de Reportes

| ID | Caso de Prueba | Perfil | Pasos | Resultado Esperado |
|----|----------------|--------|-------|-------------------|
| REP-01 | Reporte Cumplimiento - Todos los edificios | Gerente General | 1. Ir a /reportes/cumplimiento | Muestra todos los edificios con scoring |
| REP-02 | Reporte Cumplimiento - Solo asignados | Ejecutivo | 1. Ir a /reportes/cumplimiento | Solo edificios asignados |
| REP-03 | Reporte Egresos | Gerente General | 1. Ir a /reportes/egresos | Formato Edipro con costos |
| REP-04 | Reporte Egresos - No accesible | Ejecutivo | 1. Intentar acceder | Acceso denegado |
| REP-05 | Reporte Equipos | Gerente Ops | 1. Ir a /reportes/equipos | Estadisticas de equipos |
| REP-06 | Reporte Ejecutivos | Gerente General | 1. Ir a /reportes/ejecutivos | Metricas por ejecutivo |

---

## 5. Pruebas de Seguridad

| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| SEC-01 | Acceso sin autenticacion | 1. Cerrar sesion 2. Navegar a /tickets | Redirige a login |
| SEC-02 | API sin token | 1. Llamar GET /api/tickets sin cookie de sesion | 401 No autenticado |
| SEC-03 | Ejecutivo accede a otro edificio | 1. Login como Ejecutivo A 2. GET /api/buildings/bldg-no-asignado | 403 Acceso denegado |
| SEC-04 | Ejecutivo intenta ver costos via API | 1. Login como Ejecutivo 2. GET /api/tickets/123 | Campo cost no presente en respuesta |
| SEC-05 | Ejecutivo intenta aprobar equipo | 1. POST /api/equipment/123/approve | 403 Acceso denegado |
| SEC-06 | Usuario desactivado | 1. Super Admin desactiva usuario 2. Usuario intenta navegar | Sesion terminada, redirige a login |

---

## 6. Matriz de Acceso Resumida

| Funcionalidad | Super Admin | G. General | G. Ops | G. Comercial | G. Finanzas | Ejecutivo |
|---------------|-------------|------------|--------|--------------|-------------|-----------|
| Panel Super Admin | Si | No | No | No | No | No |
| Dashboard Overview | No | Si | No | No | No | No |
| Dashboard Tickets | No | Si | Si | Si | Si | No |
| Dashboard Visitas | No | Si | Si | Si | No | No |
| Gestionar Visitas | No | Si | Si | Si | No | Si* |
| Gestionar Tickets | No | Si | Si | Si | No* | Si* |
| Ver Costos | No | Si | Si | Si | Si | No |
| Aprobar Equipos | No | Si | Si | Si | No | No |
| Admin Usuarios | Si | Si | No | No | No | No |
| Reporte Egresos | No | Si | No | Si | No | No |
| Todos los Edificios | Si | Si | Si | Si | Si | No |

*Solo los asignados / Solo lectura

---

## 7. Ejecucion de Pruebas

### Ambiente de Pruebas
- URL: Usar /dev-login para cambiar entre perfiles
- Usuarios de prueba disponibles:
  - Super Admin
  - Gerente General
  - Gerente Operaciones  
  - Gerente Comercial
  - Gerente Finanzas
  - Ejecutivo A (edificios asignados: Edificio Asignado A)
  - Ejecutivo B (edificios asignados: Edificio Asignado B)

### Criterios de Exito
- 100% de casos de acceso correctos
- 100% de restricciones funcionando
- Intercambio de datos entre perfiles sin errores
- Costos ocultos para ejecutivos
- Notificaciones entregadas correctamente

---

**Documento generado automaticamente por BUMA OPS**
**Version: 1.0**
**Fecha: Enero 2026**
