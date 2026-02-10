# Formatos de Exportación - Conciliación Bancaria

## Formato Edipro (10 columnas)

| Columna | Descripción | Valor/Formato |
|---------|-------------|---------------|
| Número | Número correlativo | Auto-incremento |
| Monto | Monto del depósito | Numérico |
| Unidad | Unidad/Departamento asignado | Texto |
| Descripción | Tipo de movimiento | "abono" |
| Anulado | Indicador de anulación | "NO" |
| Fecha ingreso | Fecha del depósito | dd-mm-yyyy |
| Fondo | Fondo contable | "Gasto común" |
| Forma de pago | Medio de pago | "Transferencia" |
| Banco | Nombre del banco | Texto |
| Número comprobante | Referencia bancaria | Texto |

**Filtros de exportación:**
- Solo transacciones con estado "identified" (identificado)

## Formato Comunidad Feliz (5 columnas)

| Columna | Descripción |
|---------|-------------|
| Fecha | Fecha de la transacción (dd-mm-yyyy) |
| Unidad | Unidad/Departamento asignado |
| Monto | Monto del depósito |
| Descripción | Glosa/Descripción bancaria |
| Referencia | N° de operación o referencia |

## Formato Kastor (5 columnas)

| Columna | Descripción |
|---------|-------------|
| Fecha | Fecha de la transacción (dd-mm-yyyy) |
| Departamento | Unidad/Departamento asignado |
| Monto | Monto del depósito |
| Glosa | Descripción bancaria |
| Comprobante | Referencia bancaria |

## Formato Genérico (7 columnas)

| Columna | Descripción |
|---------|-------------|
| Fecha | Fecha de la transacción (dd-mm-yyyy) |
| Unidad | Unidad/Departamento asignado |
| Monto | Monto del depósito |
| Descripción | Glosa/Descripción bancaria |
| Banco | Nombre del banco |
| Referencia | N° de operación |
| RUT Pagador | RUT del pagador (si disponible) |

## Notas Generales

- Todos los archivos se exportan en formato **XLSX** (Excel)
- Las fechas se formatean en formato chileno: **dd-mm-yyyy**
- Solo se exportan transacciones con estado **"Identificado"**
- Las transacciones con estado "Ignorado", "Pendiente" o "Sugerido" no se incluyen
- El archivo descargado se nombra: `conciliacion_{formato}_{año}-{mes}.xlsx`
