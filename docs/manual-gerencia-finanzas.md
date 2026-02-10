# Manual de Gerencia - Modulo Financiero

## Introduccion

Este manual describe como usar el modulo financiero de BUMA OPS para gestionar los ingresos, egresos y consumos recurrentes de los edificios administrados. Incluye instrucciones para la exportacion de datos al formato Edipro.

**Roles con acceso:** Gerente General, Gerente de Operaciones, Gerente Comercial, Gerente de Finanzas.

---

## 1. Ingresos

### Acceso
Menu lateral: **Finanzas > Ingresos** (ruta /ingresos)

### Pantalla principal
Al ingresar se muestra:
- **Filtros superiores:** Edificio, Mes, Ano, Estado
- **Tarjetas resumen:** Total ingresos, Monto identificado, Monto pendiente
- **Tabla de ingresos** con columnas: ID, Edificio, Depto/Unidad, Monto, Fecha, Banco, N. Operacion, Estado, Notas, Acciones

### Crear un ingreso
1. Presionar el boton **"Nuevo Ingreso"**
2. Completar los campos del formulario:
   - **Edificio** (obligatorio): Seleccionar el edificio correspondiente
   - **Monto** (obligatorio): Valor del deposito o pago recibido
   - **Depto/Unidad:** Numero de departamento o unidad que realiza el pago
   - **Fecha de Pago:** Fecha en que se recibio el deposito
   - **Banco:** Entidad bancaria de origen
   - **N. Operacion:** Numero de comprobante bancario
   - **Estado:** Pendiente, Identificado o Rechazado
   - **Notas:** Observaciones adicionales
3. Presionar **"Guardar"**

### Editar o eliminar un ingreso
- Hacer clic en el icono de lapiz para editar
- Hacer clic en el icono de papelera para eliminar (se pedira confirmacion)

### Dividir un deposito

Cuando un solo deposito bancario corresponde a pagos de multiples departamentos:

1. Presionar el boton **"Dividir Deposito"**
2. Completar los datos generales:
   - **Edificio** (obligatorio)
   - **Monto Total** (obligatorio): El monto exacto del deposito bancario
   - **Fecha de Pago**
   - **Banco**
   - **N. Operacion**
   - **Estado**
   - **Notas**
3. En la seccion de divisiones, completar cada fila:
   - **Depto/Unidad:** El departamento que paga
   - **Monto:** La porcion que corresponde a ese departamento
   - **Descripcion:** Detalle opcional
4. Usar **"Agregar Unidad"** para anadir mas filas
5. Verificar que la **suma de las partes sea igual al monto total** (el sistema valida esto automaticamente con tolerancia de $0.01)
6. Presionar **"Dividir Deposito"** para confirmar

El sistema creara un registro de ingreso individual por cada departamento.

---

## 2. Egresos

### Acceso
Menu lateral: **Finanzas > Egresos** (ruta /egresos)

### Pantalla principal
Al ingresar se muestra:
- **Filtros superiores:** Edificio, Mes, Ano, Tipo de Origen, Estado de Pago
- **Tarjetas resumen:** Total egresos, Monto pagado, Monto pendiente
- **Tabla de egresos** con detalle de cada gasto

### Crear un egreso
1. Presionar el boton **"Nuevo Egreso"**
2. Completar los campos:
   - **Edificio** (obligatorio)
   - **Descripcion** (obligatorio): Detalle del gasto
   - **Monto** (obligatorio)
   - **Categoria:** Clasificacion del gasto (Agua, Luz, Gas, Internet, Aseo, Materiales, Seguridad, Jardines, Piscina, Administracion, Otro)
   - **Nombre Proveedor:** Razon social o nombre del proveedor
   - **Nombre Proveedor Edipro:** Nombre estandarizado para la exportacion Edipro. Si se deja vacio, se usara el nombre del proveedor normal
   - **N. Documento:** Numero de factura, boleta u otro documento de respaldo
   - **Fecha de Pago:** Cuando se realizo o se realizara el pago
   - **Forma de Pago:** Transferencia, Cheque, Efectivo, Tarjeta u Otro
   - **Estado de Pago:** Pendiente, Pagado o Cancelado
   - **Inclusion:** Incluido o Postergado (ver seccion de postergacion)
   - **Tipo de Origen:** Ticket, Equipo, Proyecto u Otro
   - **Notas:** Observaciones adicionales
3. Presionar **"Guardar"**

### Postergacion de egresos

Cuando un gasto no debe incluirse en el cierre mensual actual:

1. Al crear o editar un egreso, cambiar el campo **"Inclusion"** a **"Postergado"**
2. Aparecera un campo obligatorio: **"Motivo de Postergacion"**
3. Escribir la razon por la que se posterga (ejemplo: "Esperando aprobacion de presupuesto", "Factura en revision")
4. Los egresos postergados **NO se incluyen** en la exportacion Edipro

**Importante:** Un egreso postergado no desaparece del sistema. Sigue visible en la tabla de egresos y puede cambiarse nuevamente a "Incluido" cuando corresponda.

### Validacion operativa y financiera (proceso organizacional)
Como buena practica, cada egreso deberia pasar por una doble validacion antes de ser exportado:
- **Validacion operativa:** El responsable de operaciones confirma que el gasto tiene respaldo (factura, orden de trabajo, ticket asociado)
- **Validacion financiera:** El responsable de finanzas confirma que el gasto esta aprobado y corresponde al presupuesto

Estas validaciones son un proceso interno del equipo. Use el campo **Notas** del egreso para registrar quien valido y cuando.

---

## 3. Consumos Recurrentes

### Acceso
Menu lateral: **Finanzas > Consumos Recurrentes** (ruta /consumos-recurrentes)

### Que son los consumos recurrentes
Son plantillas de gastos que se repiten todos los meses en un edificio (agua, luz, gas, seguridad, etc.). En esta fase del sistema, funcionan como **plantillas de referencia** para llevar control de los gastos fijos esperados.

### Pantalla principal
- **Filtro:** Edificio
- **Tarjetas resumen:** Templates activos, Costo mensual estimado total
- **Tabla** con: Edificio, Categoria, Descripcion, Proveedor, Monto Estimado, Estado (Activo/Inactivo), Acciones

### Crear una plantilla
1. Presionar **"Nuevo Consumo Recurrente"**
2. Completar:
   - **Edificio** (obligatorio)
   - **Categoria** (obligatorio): Agua, Luz, Gas, Internet, Aseo, Materiales, Seguridad, Jardines, Piscina, Administracion u Otro
   - **Descripcion:** Detalle del servicio
   - **Proveedor:** Nombre de la empresa proveedora
   - **Monto Estimado:** Valor mensual aproximado
3. Presionar **"Guardar"**

### Activar o desactivar
- Usar el boton de activar/desactivar en la columna Acciones
- Las plantillas desactivadas no se consideran en el total mensual estimado

---

## 4. Exportacion Edipro

### Que es Edipro
Edipro es el sistema de contabilidad utilizado para la gestion financiera de los edificios. La exportacion genera archivos Excel (.xlsx) compatibles con el formato de carga de Edipro.

### Exportar ingresos
1. Ir a **Ingresos**
2. Seleccionar el **Edificio**, **Mes** y **Ano** deseados
3. Presionar **"Exportar Edipro"**
4. Se descargara un archivo Excel con las siguientes columnas:
   - Numero (correlativo)
   - Monto
   - Unidad (departamento)
   - Descripcion (siempre "abono")
   - Anulado (siempre "NO")
   - Fecha ingreso (formato dd-mm-aaaa)
   - Fondo (siempre "Gasto comun")
   - Forma de pago (siempre "Transferencia")
   - Banco
   - Numero comprobante

**Solo se exportan los ingresos con estado "Identificado".**

### Exportar egresos
1. Ir a **Egresos**
2. Seleccionar el **Edificio**, **Mes** y **Ano** deseados
3. Presionar **"Exportar Edipro"**
4. Se descargara un archivo Excel con las siguientes columnas:
   - Numero (correlativo)
   - Fondo (siempre "Gasto comun")
   - Subfondo (categoria del egreso)
   - Descripcion
   - Monto
   - Documento (numero de documento)
   - Fecha egreso (formato dd-mm-aaaa)
   - Fecha banco (vacio)
   - Anulado (siempre "NO")
   - Proveedor (usa el Nombre Proveedor Edipro si existe, si no, usa el Nombre Proveedor)
   - Numero respaldo (vacio)
   - Forma de pago
   - Fecha cheque (vacio)

**Solo se exportan los egresos con estado de pago "Pagado" y que NO esten postergados.**

### Recomendaciones para exportacion
- Asegurarse de que todos los ingresos relevantes esten en estado "Identificado" antes de exportar
- Verificar que todos los egresos pagados tengan la informacion completa (proveedor, documento, forma de pago)
- Usar el campo "Nombre Proveedor Edipro" para estandarizar nombres de proveedores que aparecen de distintas formas
- Revisar que no haya egresos postergados sin motivo registrado

---

## 5. Preguntas Frecuentes

**P: Un ingreso quedo con estado incorrecto, puedo cambiarlo?**
R: Si, hacer clic en el icono de edicion y cambiar el estado.

**P: Posterge un egreso por error, como lo vuelvo a incluir?**
R: Editar el egreso, cambiar "Inclusion" a "Incluido". El motivo de postergacion se limpiara automaticamente.

**P: La suma de la division de deposito no coincide, que hago?**
R: El sistema no permite confirmar si la suma no coincide con el monto total (con tolerancia de $0.01). Verificar los montos ingresados en cada fila.

**P: Que pasa con los consumos recurrentes?**
R: Actualmente funcionan como plantillas de referencia. Los egresos reales deben crearse manualmente en la seccion de Egresos. En una futura version, el sistema generara automaticamente los egresos mensuales a partir de las plantillas.

**P: Quien puede ver el modulo financiero?**
R: Solo los gerentes (General, Operaciones, Comercial) y el Gerente de Finanzas. Los ejecutivos de operaciones y conserjeria no tienen acceso.
