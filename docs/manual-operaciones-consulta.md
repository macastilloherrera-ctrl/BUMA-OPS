# Manual de Consulta Operacional - BUMA OPS

## Roles con Acceso
- **Gerente Operaciones**: Acceso completo a consulta operacional
- **Ejecutivo Operaciones**: Acceso completo a consulta operacional

## Consulta Operacional

### Descripcion
Vista de solo lectura que permite a los roles de Operaciones consultar el estado del cierre mensual de gastos comunes por edificio, sin acceder a montos ni datos financieros detallados.

**Ruta:** `/consulta-operacional`

### Que Muestra
Para cada edificio y periodo seleccionado (mes/ano):

1. **Estado de cierre**: En que fase se encuentra el ciclo de cierre del edificio
   - Abierto, En Preparacion, Pendiente Info, Pre-Listo, En Revision, Aprobado, Emitido
   - "Sin ciclo" si aun no se ha creado el ciclo para ese periodo

2. **Depositos**: Cantidad conciliados vs pendientes (sin montos)
   - Ejemplo: "5 conciliados / 3 pendientes"

3. **Fecha ultimo deposito conciliado**: Cuando fue la ultima conciliacion

4. **Egresos**: Cantidad recibidos vs validados (sin montos)
   - Ejemplo: "12 recibidos / 8 validados"

5. **Egresos postergados**: Cantidad de egresos postergados (sin montos)

### Semaforo de Estado
- **Verde**: Ciclo aprobado o emitido
- **Amarillo**: Ciclo en preparacion, pre-listo o en revision
- **Rojo**: Ciclo abierto o pendiente de informacion
- **Gris**: Sin ciclo creado

### Para Que Sirve
Permite que el equipo de Operaciones pueda responder consultas de comite de residentes o directivos sobre el estado del cierre mensual, sin necesidad de acceder a los modulos financieros ni ver montos.

### Que NO Puede Hacer Operaciones
- Ver montos de ingresos o egresos
- Marcar egresos como pagados
- Postergar egresos
- Exportar datos financieros
- Acceder a conciliacion bancaria
- Modificar estados del ciclo de cierre

### Que SI Puede Hacer Operaciones
- Subir documentos de facturas/boletas como evidencia
- Asociar documentos a tickets o consumos esperados
- Ver el estado general del cierre por edificio
- Consultar cantidades (sin montos) de depositos y egresos
