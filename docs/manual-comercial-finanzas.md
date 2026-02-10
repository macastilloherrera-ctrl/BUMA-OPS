# Manual Comercial y Finanzas - BUMA OPS

## Roles con Acceso Financiero
- **Gerente General**: Acceso completo a finanzas, puede crear/editar/eliminar ciclos de cierre
- **Gerente Comercial**: Acceso completo a finanzas, puede crear/editar/eliminar ciclos de cierre
- **Gerente Finanzas**: Acceso a visualizacion de finanzas, puede marcar items del checklist pero no puede cambiar estados del ciclo

## Modulos Disponibles

### 1. Cierre Mensual de Gastos Comunes
Gestion del ciclo mensual de emision de gastos comunes por edificio.

**Ruta:** `/cierre-mensual`

**Funcionalidades:**
- Dashboard con semaforo por edificio (verde/amarillo/rojo)
- Crear ciclos de cierre por edificio y periodo (mes/ano)
- Configurar fechas clave: corte de egresos, corte de ingresos, pre-estado, emision final
- Avanzar estados del ciclo: Abierto → En Preparacion → Pendiente Info → Pre-Listo → En Revision → Aprobado → Emitido
- Checklist de 7 items obligatorios por ciclo
- Indicador de riesgo (bajo/medio/alto)

**Checklist del ciclo:**
1. Egresos recibidos completos
2. Egresos validados por comercial
3. Ingresos conciliados completos
4. Export listo
5. Pre-gasto comun enviado a comite
6. Ajustes solicitados por comite
7. Emision final confirmada

### 2. Conciliacion Bancaria
Importacion de cartolas bancarias y matching automatico de depositos.

**Ruta:** `/conciliacion-bancaria`

**Funcionalidades:**
- Importar cartola CSV/XLSX
- Motor de matching automatico (4 reglas)
- Asignar unidades manualmente
- Dividir depositos en multiples unidades
- Exportar en 4 formatos: Edipro, Comunidad Feliz, Kastor, Generico
- Directorio de pagadores por edificio

### 3. Ingresos
Gestion de ingresos por edificio.

**Ruta:** `/ingresos`

**Funcionalidades:**
- Crear, editar y eliminar ingresos
- Filtrar por edificio, mes y ano
- Division de depositos en N departamentos
- Exportar en 4 formatos

### 4. Egresos
Gestion de egresos por edificio.

**Ruta:** `/egresos`

**Funcionalidades:**
- Crear, editar y eliminar egresos
- Doble validacion: operativa y financiera
- Postergar egresos con motivo
- Exportar en 4 formatos (egresos postergados no se exportan)

### 5. Consumos Recurrentes
Templates de gastos fijos mensuales por edificio.

**Ruta:** `/consumos-recurrentes`

**Funcionalidades:**
- Crear templates por categoria (Agua, Luz, Gas, etc.)
- Activar/desactivar templates

## Formatos de Exportacion
- **Edipro**: Formato estandar para sistema Edipro (10 columnas ingresos, 13 columnas egresos)
- **Comunidad Feliz**: Formato para plataforma Comunidad Feliz (5 columnas)
- **Kastor**: Formato para sistema Kastor (5 columnas)
- **Generico**: Formato universal con todas las columnas relevantes

## Permisos Importantes
- Solo Gerente General y Gerente Comercial pueden cambiar estados del ciclo de cierre
- Gerente Finanzas puede marcar checklist pero no cambiar estados
- Gerente Operaciones NO tiene acceso a modulos financieros
- Ejecutivos y Conserjeria NO tienen acceso a modulos financieros
