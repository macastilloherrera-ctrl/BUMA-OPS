# Manual de Conciliación Bancaria - BUMA OPS

## Descripción General

El módulo de Conciliación Bancaria permite importar cartolas bancarias (archivos CSV o XLSX), identificar automáticamente los pagos de copropietarios mediante un motor de reglas inteligente, y exportar los datos conciliados en múltiples formatos compatibles con sistemas de administración.

## Acceso

- **Roles autorizados**: Gerente General, Gerente de Operaciones, Gerente Comercial, Gerente de Finanzas
- **Ubicación**: Menú lateral → Finanzas → Conciliación Bancaria
- **Ejecutivos y Conserjería**: No tienen acceso a este módulo (error 403)

## Flujo de Trabajo (4 Pasos)

### Paso 1: Seleccionar Edificio y Período

1. Seleccione el edificio a conciliar
2. Seleccione el mes y año del período
3. El sistema muestra cuántas transacciones ya existen para ese período
4. Haga clic en "Continuar"

### Paso 2: Cargar Cartola Bancaria

1. Haga clic en "Seleccionar archivo" o arrastre un archivo CSV/XLSX
2. Formatos compatibles: .csv, .xlsx, .xls
3. El sistema detecta automáticamente las columnas del banco chileno:
   - Fecha, Descripción/Glosa, Cargo, Abono, Monto, N° Operación, Referencia, RUT
4. Solo se importan depósitos (montos positivos/abonos)
5. Deduplicación automática: si un registro ya fue importado (mismo hash SHA-256), no se duplica
6. Se muestra resultado: "X importadas, Y duplicadas"
7. Opciones:
   - **Conciliar**: Ejecuta el motor de matching automático
   - **Omitir**: Pasa directo a la vista de conciliación (útil si ya cargó la cartola antes)

### Paso 3: Conciliación (Vista Principal)

#### Panel de Resumen
- Total de transacciones del período
- Transacciones identificadas (asignadas a unidad)
- Transacciones sugeridas (match parcial, requiere confirmación)
- Transacciones pendientes (sin match)
- Monto total identificado

#### Filtros por Estado
- **Todos**: Todas las transacciones
- **Identificados** (verde): Pagos ya asignados a una unidad
- **Sugeridos** (amarillo): El sistema sugiere una unidad, requiere confirmación
- **Pendientes** (gris): Sin coincidencia, requiere asignación manual
- **Múltiples** (naranja): Depósitos que cubren varias unidades
- **Ignorados** (rojo): Transacciones excluidas de la conciliación

#### Acciones por Transacción

**Transacciones Pendientes:**
- **Asignar**: Asignar manualmente a una unidad/departamento
- **Dividir**: Dividir el monto entre varias unidades
- **Ignorar**: Excluir de la conciliación (requiere motivo)

**Transacciones Sugeridas:**
- **Confirmar**: Aceptar la sugerencia del sistema
- **Cambiar**: Asignar a una unidad diferente
- **Ignorar**: Excluir de la conciliación

**Transacciones Identificadas:**
- Solo visualización (ya están asignadas)

**Transacciones Ignoradas:**
- **Reactivar**: Volver a estado pendiente

#### Motor de Matching Automático

El sistema utiliza 4 reglas de coincidencia en orden de prioridad:

1. **Directorio de Pagadores por RUT**: Si la transacción tiene RUT, busca en el directorio de pagadores. Con confianza >= 80%, se identifica automáticamente.
2. **Directorio de Pagadores por patrón**: Busca coincidencias de texto en la descripción/glosa con patrones del directorio.
3. **Patrones en la glosa**: Detecta referencias a unidades con regex (ej: "dpto 101", "local 3", "oficina 4", "bodega 2").
4. **Historial**: Busca transacciones anteriores identificadas con descripción o RUT similar.

#### Directorio de Pagadores

Botón "Directorio de Pagadores" en la vista de conciliación:
- Lista de pagadores conocidos por edificio
- Cada entrada tiene: RUT, Patrón de texto, Unidad asignada, Nivel de confianza
- Agregar nuevos pagadores manualmente
- Eliminar pagadores obsoletos
- El sistema auto-agrega pagadores cuando se asigna una transacción con RUT

### Paso 4: Exportar

1. Seleccione el formato de exportación:
   - **Edipro**: Formato estándar de 10 columnas para Edipro
   - **Comunidad Feliz**: 5 columnas (Fecha, Unidad, Monto, Descripción, Referencia)
   - **Kastor**: 5 columnas (Fecha, Departamento, Monto, Glosa, Comprobante)
   - **Genérico**: 7 columnas con todos los datos disponibles
2. Solo se exportan transacciones con estado "Identificado"
3. Haga clic en "Exportar" para descargar el archivo XLSX
4. Puede volver a la vista de conciliación para ajustar asignaciones

## División de Depósitos

Para depósitos que cubren varias unidades:
1. Haga clic en "Dividir" en la transacción
2. Agregue filas para cada unidad
3. Ingrese la unidad, monto y descripción opcional
4. El sistema valida que la suma de las partes sea igual al total (tolerancia de $0.01)
5. Se crean registros de ingreso separados por cada unidad

## Deduplicación

El sistema previene la importación duplicada mediante un hash SHA-256 calculado con:
- Fecha de la transacción
- Monto
- Descripción/Glosa
- Referencia/N° Operación

Si el hash ya existe para el mismo edificio, la transacción se omite.

## Integración con Ingresos

Cada transacción bancaria identificada genera automáticamente un registro en la tabla de ingresos, manteniendo compatibilidad con el módulo de Ingresos existente y la exportación Edipro.
