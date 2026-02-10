# Guia de Cierre Mensual - Gasto Comun

## Introduccion

Esta guia describe el proceso paso a paso para realizar el cierre mensual de gastos comunes de un edificio, desde la verificacion de datos en BUMA OPS hasta la carga de archivos en Edipro.

**Dirigido a:** Gerente General, Gerente de Operaciones, Gerente Comercial, Gerente de Finanzas.

---

## 1. Calendario Sugerido

| Dia del mes | Actividad |
|---|---|
| 1 al 5 | Recepcion y registro de facturas del mes anterior |
| 1 al 5 | Registro de depositos e ingresos recibidos |
| 5 al 10 | Revision y conciliacion de ingresos con cartolas bancarias |
| 10 al 15 | Verificacion de egresos: documentos, proveedores, formas de pago |
| 15 al 18 | Doble validacion de egresos (operativa y financiera) |
| 18 al 20 | Revision de postergaciones: decidir que se incluye y que se posterga |
| 20 al 22 | Estandarizacion de nombres de proveedores para Edipro |
| 22 al 25 | Exportacion Edipro y revision de archivos generados |
| 25 al 28 | Carga en Edipro y verificacion final |

*Estas fechas son sugeridas y pueden ajustarse segun las necesidades de cada edificio o periodo.*

---

## 2. Checklist de Cierre Mensual

### Fase 1: Preparacion de Ingresos

- [ ] Ingresar todos los depositos recibidos del mes en la seccion Ingresos
- [ ] Dividir los depositos que correspondan a multiples departamentos usando "Dividir Deposito"
- [ ] Verificar que cada ingreso tenga:
  - Edificio correcto
  - Monto correcto
  - Departamento/unidad asignado
  - Banco y numero de operacion
- [ ] Cambiar el estado de los ingresos verificados a **"Identificado"**
- [ ] Dejar en estado "Pendiente" los depositos que aun no se pueden identificar
- [ ] Marcar como "Rechazado" los depositos erroneos o duplicados

### Fase 2: Preparacion de Egresos

- [ ] Ingresar todos los gastos del mes en la seccion Egresos
- [ ] Verificar que cada egreso tenga:
  - Edificio correcto
  - Descripcion clara del gasto
  - Monto correcto
  - Categoria asignada
  - Nombre del proveedor
  - Numero de documento (factura/boleta)
  - Fecha de pago
  - Forma de pago
- [ ] Cambiar el estado de pago a **"Pagado"** para los gastos efectivamente pagados
- [ ] Revisar los egresos que deben postergarse:
  - Cambiar "Inclusion" a **"Postergado"**
  - Escribir el **motivo de postergacion** (campo obligatorio)
- [ ] Verificar que no queden egresos pagados sin documento o proveedor

### Fase 3: Estandarizacion para Edipro

- [ ] Revisar la columna "Proveedor" en la tabla de egresos
- [ ] Para proveedores con nombres inconsistentes, abrir el egreso y completar el campo **"Nombre Proveedor Edipro"**
  - Ejemplo: Si aparece "Serv. Limpiezas Santiago" y "Servicios de Limpieza Santiago Ltda.", definir un nombre estandar como "SERVICIOS LIMPIEZA SANTIAGO" en el campo Edipro
- [ ] Usar nombres en MAYUSCULAS y sin abreviaciones para Edipro

### Fase 4: Validacion (proceso interno del equipo)

- [ ] Confirmar con el responsable de operaciones que cada egreso tiene respaldo (factura, orden de trabajo, ticket). Registrar en las notas del egreso quien valido
- [ ] Confirmar con el responsable de finanzas que cada egreso esta aprobado. Registrar en las notas
- [ ] Revisar los consumos recurrentes: verificar que todos los gastos fijos del mes esten registrados como egresos

### Fase 5: Exportacion

- [ ] Ir a la seccion **Ingresos**
- [ ] Seleccionar el edificio, mes y ano correctos
- [ ] Presionar **"Exportar Edipro"**
- [ ] Guardar el archivo Excel descargado
- [ ] Ir a la seccion **Egresos**
- [ ] Seleccionar el mismo edificio, mes y ano
- [ ] Presionar **"Exportar Edipro"**
- [ ] Guardar el archivo Excel descargado

### Fase 6: Verificacion de archivos

- [ ] Abrir el archivo de ingresos en Excel y verificar:
  - Que la cantidad de filas coincida con los ingresos identificados del mes
  - Que los montos sean correctos
  - Que las fechas esten en formato dd-mm-aaaa
  - Que los departamentos esten correctos
- [ ] Abrir el archivo de egresos en Excel y verificar:
  - Que solo aparezcan egresos pagados (no pendientes ni cancelados)
  - Que no aparezcan egresos postergados
  - Que los nombres de proveedores sean los estandarizados
  - Que las categorias (subfondos) esten correctas
  - Que los montos y fechas sean correctos

### Fase 7: Carga en Edipro

- [ ] Acceder al sistema Edipro
- [ ] Cargar el archivo de ingresos en el modulo correspondiente
- [ ] Cargar el archivo de egresos en el modulo correspondiente
- [ ] Verificar que los totales en Edipro coincidan con los totales de BUMA OPS

---

## 3. Datos que Exporta Edipro

### Ingresos (10 columnas)
| Columna | Contenido |
|---|---|
| Numero | Correlativo automatico |
| Monto | Valor del ingreso |
| Unidad | Departamento o unidad |
| Descripcion | Siempre dice "abono" |
| Anulado | Siempre dice "NO" |
| Fecha ingreso | Formato dd-mm-aaaa |
| Fondo | Siempre dice "Gasto comun" |
| Forma de pago | Siempre dice "Transferencia" |
| Banco | Banco de origen |
| Numero comprobante | N. de operacion bancaria |

**Filtro de exportacion:** Solo ingresos con estado = "Identificado"

### Egresos (13 columnas)
| Columna | Contenido |
|---|---|
| Numero | Correlativo automatico |
| Fondo | Siempre dice "Gasto comun" |
| Subfondo | Categoria del gasto |
| Descripcion | Descripcion del egreso |
| Monto | Valor del egreso |
| Documento | Numero de documento |
| Fecha egreso | Formato dd-mm-aaaa |
| Fecha banco | Vacio |
| Anulado | Siempre dice "NO" |
| Proveedor | Nombre Edipro (o nombre normal si no hay Edipro) |
| Numero respaldo | Vacio |
| Forma de pago | Transferencia, Cheque, etc. |
| Fecha cheque | Vacio |

**Filtro de exportacion:** Solo egresos con estado de pago = "Pagado" y que NO esten postergados

---

## 4. Errores Comunes y Como Evitarlos

| Error | Causa | Solucion |
|---|---|---|
| Faltan ingresos en el archivo Edipro | Ingresos quedaron en estado "Pendiente" | Cambiar estado a "Identificado" antes de exportar |
| Faltan egresos en el archivo Edipro | Egresos quedaron en estado "Pendiente" o estan "Postergados" | Cambiar estado de pago a "Pagado" y verificar que no esten postergados |
| Proveedor aparece con nombre distinto en Edipro | No se uso el campo "Nombre Proveedor Edipro" | Editar el egreso y completar el campo Nombre Proveedor Edipro |
| Monto total no coincide | Hay egresos pagados que deberian estar postergados | Revisar los egresos y postergar los que no correspondan al mes |
| Deposito aparece sin departamento | Se ingreso el deposito sin dividir | Usar la funcion "Dividir Deposito" para separar por departamento |
| Archivo Excel con caracteres extranos | Problema de codificacion | El sistema genera archivos UTF-8 compatibles. Si persiste, abrir desde Excel con importacion de datos |

---

## 5. Recomendaciones

- **Hacer el cierre edificio por edificio.** No intentar procesar todos los edificios a la vez.
- **Exportar primero un edificio de prueba** para verificar que los datos estan correctos antes de hacer la carga masiva.
- **Guardar los archivos exportados** con un nombre descriptivo, por ejemplo: `ingresos_edificio-central_enero-2026.xlsx`
- **Revisar los consumos recurrentes** al inicio de cada mes para verificar que las plantillas esten actualizadas.
- **Usar el campo Notas** en ingresos y egresos para dejar registro de cualquier situacion especial.
- **No postergar egresos sin motivo.** El campo de motivo es obligatorio y ayuda a mantener el historial claro.
