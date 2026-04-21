# BUMA OPS — Análisis Financiero Completo
## Alícuotas, Gasto Común, Cobranza y Módulos Financieros Faltantes

**Fecha:** Abril 2026 | Versión 2 — Investigación Ampliada

---

## PARTE 1 — FUNDAMENTOS LEGALES Y TÉCNICOS

---

### 1.1 Qué es una Alícuota (Coeficiente de Copropiedad)

La **alícuota** (también llamada coeficiente de copropiedad o prorrateo) es el porcentaje de participación que tiene cada unidad (departamento, bodega, estacionamiento) en los bienes comunes del condominio. Es la base matemática de todo cobro de gastos comunes.

**Marco legal:** Art. 3° y 6° Ley 21.442

> "El derecho que corresponda a cada propietario sobre los bienes de dominio común se determinará en el reglamento de copropiedad, **atendiéndose para su fijación al avalúo fiscal** de la respectiva unidad."

**Fórmulas:**

```
Alícuota_i (%) = (Avalúo Fiscal Unidad_i / Σ Avalúo Fiscal TODAS las unidades) × 100

Gasto_i = Gasto Total Comunidad × (Alícuota_i / 100)
```

Ejemplo práctico:
```
Condominio con 4 departamentos y gasto total $2.000.000:
  Dto A: avalúo $50M  → alícuota 10% → GC = $200.000
  Dto B: avalúo $100M → alícuota 20% → GC = $400.000
  Dto C: avalúo $150M → alícuota 30% → GC = $600.000
  Dto D: avalúo $200M → alícuota 40% → GC = $800.000
  Total: $500M        → 100%         → $2.000.000 ✓
```

**Importante:** La suma de todas las alícuotas siempre debe ser exactamente **100%** (o 1.0000 en base decimal). La tabla de alícuotas la determina la inmobiliaria, queda inscrita en el Conservador de Bienes Raíces, y rara vez cambia (solo por ampliaciones o nuevas unidades).

**En la práctica chilena:** Muchos condominios usan m² construidos en lugar del avalúo fiscal como base de cálculo (están directamente correlacionados), y el reglamento puede establecer otras formas de contribución.

---

### 1.2 Tipos de Cálculo de Gasto Común

Los principales softwares chilenos manejan **4 tipos de cálculo** de gasto común:

| Tipo | Cómo funciona | Cuándo usar |
|---|---|---|
| **Variable** | GC = Σ egresos reales del mes × alícuota | Comunidades con gastos fluctuantes; el monto varía mes a mes |
| **Fijo** | Se define un monto fijo por unidad (todos pagan igual) | Condominios con gastos muy estables y unidades similares |
| **Fijo Presupuesto** | Se define un presupuesto anual dividido en 12; se cobra ese monto mensual independiente de los egresos reales | Permite planificación anual con monto mensual predecible |
| **Fijo por Unidad** | Monto diferente predefinido para cada unidad (no por alícuota) | Casos especiales donde el reglamento establece montos fijos distintos |

---

### 1.3 Composición de una Boleta de Gasto Común

Una boleta completa incluye:

```
BOLETA DE GASTOS COMUNES — Edificio X — Unidad 304 — Marzo 2026
═══════════════════════════════════════════════════════════════════
GASTOS ORDINARIOS
  Administración (remuneraciones, honorarios)     $180.000
  Mantención (ascensores, limpieza, jardines)     $120.000
  Reparaciones (pintura pasillo, bomba agua)       $30.000
  Consumos comunes (luz, agua, gas áreas)          $70.000
                                       Subtotal:  $400.000
                                                   ×10% alícuota
                             Gasto Común base:     $40.000

FONDOS Y SEGUROS
  Fondo Común de Reserva (5% del GC base)          $2.000
  Seguro de Incendio (prorrateo)                   $3.500
                             Fondos y seguros:      $5.500

CARGOS INDIVIDUALES (solo esta unidad)
  Arriendo quincho 15-mar                          $15.000
  Multa infracción reglamento (reunión 10-mar)      $5.000
                             Cargos individuales:  $20.000

DEUDA ANTERIOR Y MORA
  Saldo deuda Febrero 2026                         $45.000
  Intereses mora (18 días × tasa diaria)            $1.350
                             Deuda anterior:       $46.350

═══════════════════════════════════════════════════════════════════
TOTAL A PAGAR (vence 10 de Abril)                 $111.850
═══════════════════════════════════════════════════════════════════
```

---

### 1.4 Fondo Común de Reserva (obligatorio por ley)

**Marco legal:** Art. 39 Ley 21.442 | Art. 11 definición

El fondo es obligatorio. Se financia con un porcentaje de recargo sobre los gastos comunes ordinarios (mínimo **5%**, fijado por asamblea extraordinaria). Sus usos permitidos son:
- Reparaciones urgentes de bienes comunes
- Certificaciones periódicas (gas, ascensores)
- Gastos imprevistos
- Indemnizaciones del personal (pasivos laborales)

**Restricción clave:** No puede usarse para cubrir gastos comunes ordinarios ni reducirlos.

---

### 1.5 Intereses por Mora

**Marco legal:** Art. 7 Ley 21.442

Plazo de pago: **10 días** desde emisión del aviso de cobro. Al vencer, se generan intereses.

**Fórmula:**
```
Tasa diaria = (Tasa interés corriente bancario × 50%) / 365
Interés = Monto deuda × Tasa diaria × Días de retraso
```

El interés no puede superar el **50% del interés corriente bancario** (publicado por la CMF/SBIF).

---

### 1.6 Gastos Extraordinarios y Cargos Particulares

| Tipo | Definición | ¿Requiere asamblea? |
|---|---|---|
| **GC Extraordinario** | Obras, reparaciones mayores no previstas, nuevas instalaciones | ✅ Sí (mayoría absoluta o reforzada según monto) |
| **Cargo Particular** | Cobro a una unidad específica: multa, arriendo quincho, daño bien común | No |
| **Ingreso Extraordinario** | Arriendo sala de eventos, publicidad en edificio, antenas | No, beneficia al condominio |
| **Cuota Extraordinaria** | Cobro adicional a TODAS las unidades para financiar gasto extraordinario | ✅ Sí |

---

## PARTE 2 — PROCESO COMPLETO DE GENERACIÓN DE GASTO COMÚN

El proceso estándar en los mejores softwares del mercado tiene **6 pasos**:

### Paso 1 — CONFIGURACIÓN (una sola vez)
- Definir unidades del edificio con su alícuota (% o decimal)
- Definir tipo de cálculo (variable/fijo/fijo presupuesto/fijo unidad)
- Definir porcentaje del fondo de reserva (mínimo 5%)
- Configurar tasa de interés por mora
- Ingresar datos de seguros (prima mensual prorrateada)

### Paso 2 — INGRESO DE EGRESOS DEL MES
- Registrar todos los egresos del período (ya existe en BUMA OPS)
- Marcar cuáles son incluibles en el GC
- Clasificar por categoría (administración / mantención / reparación / consumo)

### Paso 3 — CÁLCULO Y CIERRE
- El sistema calcula el total de egresos incluibles
- Aplica alícuota por unidad → gasto base individual
- Agrega fondo de reserva, seguros, cargos particulares
- Agrega deuda anterior + intereses de mora
- Genera boleta preview ("boleta prueba" para revisar antes de emitir)

### Paso 4 — EMISIÓN
- Se emite la boleta definitiva (no modificable)
- Se asigna fecha de vencimiento (10 días desde emisión, por ley)
- Se genera PDF individual por unidad

### Paso 5 — COBRANZA
- Envío masivo por email con PDF adjunto
- Recordatorio automático 3 días antes del vencimiento
- Recordatorio automático al vencer
- Hasta 6 notificaciones configurables (3 antes + 3 después)

### Paso 6 — RECAUDACIÓN Y CONCILIACIÓN
- Registro de pagos (manual, importación cartola o conexión bancaria directa)
- Conciliación automática (pago → unidad)
- Actualización de saldo de deuda por unidad

---

## PARTE 3 — LO QUE BUMA OPS NO TIENE (Análisis Detallado)

---

### 3.1 MÓDULO DE UNIDADES Y ALÍCUOTAS
**Prioridad: CRÍTICA**

Actualmente BUMA OPS no tiene tabla de unidades (departamentos, bodegas, estacionamientos) por edificio, ni alícuotas asignadas. Sin esto, es imposible calcular el gasto común.

**Qué necesita:**
```
Tabla: units
  id, building_id, unit_number (ej: "304"), floor, type (depto/bodega/estac.)
  area_m2, avaluo_fiscal, alicuota (decimal 0.0000-1.0000)
  owner_name, owner_rut, owner_email
  renter_name, renter_rut, renter_email
  is_active, notes
```

**Validaciones necesarias:**
- Σ alícuotas = 1.0000 exactamente (con tolerancia 0.0001)
- Alícuotas deben venir del reglamento de copropiedad
- Campos para múltiples "tipos" de alícuota si el reglamento diferencia (ej: alícuota administración vs. alícuota uso)

**¿Tienen esto?**
- Edipro: ✅ | Kastor: ✅ | ComunidadFeliz: ✅ | Edifito: ✅

---

### 3.2 GENERACIÓN DE GASTO COMÚN (GC)
**Prioridad: CRÍTICA**

El núcleo del negocio de administración de condominios. Sin este módulo, BUMA OPS no puede reemplazar a Edipro/Kastor/CF sino solo exportarles datos.

**Flujo completo que falta:**

```
[Configurar período] → [Seleccionar egresos incluibles] → [Calcular prorrateo]
→ [Agregar fondos y seguros] → [Agregar cargos particulares]
→ [Agregar deuda anterior + intereses] → [Vista previa (Boleta Prueba)]
→ [Confirmar y emitir] → [Generar PDFs] → [Enviar por email]
```

**Tipos de GC a soportar:**
1. **Variable** (el más común): GC = Σ egresos del mes × alícuota por unidad
2. **Fijo Presupuesto**: monto fijo mensual basado en presupuesto anual aprobado
3. **Fijo por Unidad**: monto diferente por cada unidad (configurado manualmente)
4. **Mixto**: parte fija + parte variable (más complejo)

**¿Tienen esto?**
- Edipro: ✅ (4 tipos) | Kastor: ✅ | ComunidadFeliz: ✅ | Edifito: ✅

---

### 3.3 BOLETA DIGITAL PDF POR UNIDAD
**Prioridad: CRÍTICA**

Documento legal que debe emitirse mensualmente. Debe incluir:
- Datos del copropietario y su unidad
- Detalle de gastos (desglosado por categoría)
- Porcentaje de alícuota aplicado
- Fondos (reserva, seguro)
- Cargos particulares (si aplica)
- Deuda anterior y período(s) adeudado(s)
- Intereses por mora calculados
- Total a pagar
- Fecha de emisión y vencimiento
- Datos de transferencia bancaria del condominio
- QR o link de pago online (si aplica)

**¿Tienen esto?**
- Edipro: ✅ | Kastor: ✅ | ComunidadFeliz: ✅ | Edifito: ✅

---

### 3.4 GESTIÓN DE DEUDA Y ESTADO DE CUENTA POR UNIDAD
**Prioridad: ALTA**

Actualmente BUMA OPS tiene "Verificación GGCC" pero es un proceso de validación, no un sistema de deuda estructurado.

**Qué necesita:**
- Saldo de deuda por unidad en tiempo real
- Historial de períodos adeudados
- Cálculo automático de intereses acumulados (tasa diaria × días mora)
- Estado: "Al día", "Moroso X meses", "Convenio de pago activo"
- Reporte de morosos para asamblea (lista de unidades con deuda + monto)
- Notificaciones automáticas de cobranza (email, WhatsApp futuro)
- Aviso formal previo de 5 días antes de suspensión de servicios básicos (art. 27 Reglamento)

**Tabla necesaria:**
```
unit_balances:
  unit_id, period_month, period_year
  gc_base, fondos, seguros, cargos_particulares
  deuda_anterior, intereses_mora
  total_cobrado, total_pagado, saldo_pendiente
  status (pendiente/pagado/mora/convenio)
  fecha_emision, fecha_vencimiento, fecha_pago
```

**¿Tienen esto?**
- Edipro: ✅ | Kastor: ✅ | ComunidadFeliz: ✅ | Edifito: ✅

---

### 3.5 ENVÍO MASIVO DE BOLETAS Y COBRANZA AUTOMÁTICA
**Prioridad: ALTA**

**Qué necesita:**
- Envío masivo de PDFs por email (un email por unidad)
- Recordatorios automáticos configurables:
  - Pre-vencimiento: D-5, D-3, D-1
  - Post-vencimiento: D+1, D+7, D+15
  - Notificación de mora con monto de intereses
- Log de envíos (quién recibió, cuándo, si fue leído)
- Plantillas de email configurables por administrador

**¿Tienen esto?**
- Edipro: ✅ | Kastor: ✅ | ComunidadFeliz: ✅ | Edifito: ✅ (hasta 6 fechas de notificación)

---

### 3.6 PAGO EN LÍNEA (WebPay / Khipu / Transferencia)
**Prioridad: MEDIA-ALTA**

El mayor diferenciador de cara a los residentes. Reduce trabajo manual y mejora recaudación.

**Opciones del mercado:**
- **WebPay Plus**: tarjeta crédito/débito (Transbank)
- **WebPay OneClick**: pago automático con tarjeta guardada
- **Khipu**: transferencia directa desde banco
- **MercadoPago**: tarjeta + cuotas

**¿Tienen esto?**
- ComunidadFeliz: ✅ WebPay OneClick + automático
- Edifito: ✅ Khipu + MercadoPago + WebPay + transferencia
- Edipro: ✅ WebPay
- Kastor: ✅

---

### 3.7 PRESUPUESTO ANUAL
**Prioridad: MEDIA**

Proyección de ingresos y egresos para el año. La asamblea ordinaria lo aprueba. Base para el cálculo del GC tipo "Fijo Presupuesto".

**Qué necesita:**
- Ingreso de presupuesto por categoría (remuneraciones, mantención, reparaciones, consumos)
- Comparativo mensual real vs. presupuesto
- Alerta cuando se supera el presupuesto en una categoría
- Presentación para asamblea anual

**¿Lo tiene BUMA OPS?** ⚠️ Parcial — el cierre mensual controla egresos pero no hay un presupuesto anual como módulo formal.

**¿Tienen esto?**
- ComunidadFeliz: ✅ | Edifito: ✅ | Edipro: ✅ | Kastor: ✅

---

### 3.8 FONDO COMÚN DE RESERVA — GESTIÓN CONTABLE
**Prioridad: MEDIA**

Actualmente en BUMA OPS se menciona el fondo de reserva en el contexto de egresos, pero no hay un tracking formal del fondo.

**Qué necesita:**
- Saldo actual del Fondo de Reserva
- Movimientos: ingresos (% mensual del GC), egresos (uso aprobado por asamblea)
- Historial de usos y aprobaciones
- Proyección del fondo a 12 meses
- Separación contable del fondo vs. cuenta operacional

**¿Tienen esto?**
- ComunidadFeliz: ✅ | Edifito: ✅ | Edipro: ✅ | Kastor: ✅

---

### 3.9 CARGOS PARTICULARES / MULTAS POR UNIDAD
**Prioridad: MEDIA**

Cobros a unidades específicas que se suman en la siguiente boleta.

**Tipos:**
- Multa por infracción al reglamento (ruidos, mascotas, etc.)
- Arriendo quincho/SUM/piscina
- Daño a bienes comunes
- Cobro de servicios individuales (ej: calefacción central medida por unidad)
- Cargo por gestión de cobranza judicial

**Qué necesita:**
- Creación de cargo particular para unidad específica
- Vincular a boleta del próximo período
- Log de cargos por unidad
- Aprobación del comité para multas

---

### 3.10 INGRESOS EXTRAORDINARIOS DEL CONDOMINIO
**Prioridad: BAJA-MEDIA**

Ingresos que el condominio genera y que pueden reducir el GC del mes o ir al fondo de reserva.

**Tipos:**
- Arriendo de terraza/azotea (antenas celulares)
- Arriendo sala de eventos o quincho
- Publicidad en fachada o ascensores
- Intereses bancarios de fondos

**Qué necesita:**
- Registro de ingresos con tipo y destino (reduce GC / va a fondo / va a cuenta corriente)
- Impacto en la boleta del mes (refleja en boleta como "descuento por ingresos extraordinarios")

---

### 3.11 GESTIÓN DE MEDIDORES (CONSUMOS INDIVIDUALES)
**Prioridad: MEDIA**

Edificios con calefacción central, agua caliente centralizada o gas por red necesitan distribuir el consumo por unidad.

**Qué necesita:**
- Registro de medidores por unidad (agua, gas, calefacción, electricidad individual)
- Ingreso de lectura mensual (inicio y fin de período)
- Cálculo de consumo = (Lectura fin - Lectura inicio) × tarifa
- Integración con boleta de GC (aparece como cobro individual)
- Historial de consumos por unidad (gráfico de tendencia)

**¿Tienen esto?**
- ComunidadFeliz: ✅ Módulo Medidores completo
- Edifito: ✅
- Edipro: ✅ parcial
- Kastor: ❌

---

### 3.12 PLAN DE CUENTAS CONTABLE
**Prioridad: BAJA-MEDIA**

Los softwares más maduros (Edifito, ComunidadFeliz) tienen un plan de cuentas estructurado para llevar contabilidad formal del condominio.

**Qué incluye:**
- Plan de cuentas configurable (activos, pasivos, ingresos, egresos)
- Asientos contables automáticos desde operaciones
- Estado de resultados mensual y anual
- Balance general del condominio
- Libro mayor por cuenta

**¿Lo tiene BUMA OPS?** ❌ No — BUMA OPS maneja ingresos/egresos operacionales pero no contabilidad formal.

---

### 3.13 COBRANZA JUDICIAL / GESTIÓN DE MOROSIDAD AVANZADA
**Prioridad: BAJA**

Para morosos con más de 3 meses de deuda.

**Qué incluye:**
- Carta de cobranza formal (con datos legales requeridos)
- Registro de notificaciones enviadas
- Derivación a cobro ejecutivo (Art. 6 Ley 21.442 — juicio ejecutivo)
- Convenio de pago digital (firma electrónica)
- Estado "en cobranza judicial" visible en panel de morosos

---

### 3.14 REPORTES FINANCIEROS PARA ASAMBLEA Y COMITÉ
**Prioridad: MEDIA**

**Marco legal:** Art. 14 Ley 21.442 y Art. 28-29 Reglamento — envío 24 horas antes de reunión

**Reportes que deben generarse:**
1. Balance de ingresos y egresos del período
2. Flujo de caja real vs. presupuesto
3. Estado del Fondo Común de Reserva
4. Listado de morosos con monto y antigüedad
5. Detalle de egresos con verificadores (documentos adjuntos)
6. Copia informada de todas las cuentas bancarias (cartolas)
7. Respaldo de pagos de certificaciones y seguros
8. Informe de rendición de cuentas anual

**Edifito:** +20 tipos de informe automáticos | **ComunidadFeliz:** Reportes en tiempo real

---

## PARTE 4 — COMPETIDORES ADICIONALES IDENTIFICADOS

Además de Edipro, Kastor, ComunidadFeliz y Edifito, existen:

| Software | País | Enfoque | Diferenciador |
|---|---|---|---|
| **GastoComunChile** | Chile | 10-1000 unidades | Planes anuales económicos |
| **ADMEDIF** | Chile | Pyme | Funciona offline (base local) |
| **ComunIA** | Chile (nuevo) | IA integrada | Proyección financiera, alertas IA |
| **Edificia** | Latam | Multi-país | Control de acceso + contabilidad |
| **CondoClick** | Latam | Cloud | Reservas de espacios + contabilidad |
| **MiEdificio** | Latam | Multi-país | Gestión de reuniones + contabilidad |

---

## PARTE 5 — ANÁLISIS GAP FINANCIERO COMPLETO

```
FUNCIÓN FINANCIERA               BUMA   EDIPRO  KASTOR  CF     EDIFITO
─────────────────────────────────────────────────────────────────────────
Tabla de Unidades (depto/bodega)   ❌     ✅       ✅      ✅      ✅
Alícuotas por unidad               ❌     ✅       ✅      ✅      ✅
GC Variable (por egresos reales)   ❌     ✅       ✅      ✅      ✅
GC Fijo (monto fijo mensual)       ❌     ✅       ✅      ✅      ✅
GC Fijo Presupuesto (anual)        ❌     ✅       ✅      ✅      ✅
GC Fijo por Unidad                 ❌     ✅       ❌      ✅      ✅
Boleta PDF individual              ❌     ✅       ✅      ✅      ✅
Envío masivo de boletas por email  ❌     ✅       ✅      ✅      ✅
Recordatorios automáticos de pago  ❌     ✅       ✅      ✅      ✅(6 fechas)
Pago online (WebPay/Khipu)         ❌     ✅       ✅      ✅      ✅
Pago automático (OneClick)         ❌     ❌       ❌      ✅      ❌
Deuda y saldo por unidad           ⚠️     ✅       ✅      ✅      ✅
Intereses por mora automáticos     ❌     ✅       ✅      ✅      ✅
Convenios de pago (cuotas)         ❌     ✅       ✅      ✅      ✅
Fondo Común de Reserva tracking    ❌     ✅       ✅      ✅      ✅
Presupuesto anual                  ❌     ✅       ✅      ✅      ✅
Cargos particulares / multas       ❌     ✅       ✅      ✅      ✅
Ingresos extraordinarios           ❌     ✅       ✅      ✅      ✅
Módulo de Medidores                ❌     ⚠️       ❌      ✅      ✅
Remuneraciones / RRHH              ❌     ❌       ❌      ✅      ✅
Plan de cuentas contable           ❌     ✅       ✅      ✅      ✅
Reportes para asamblea (+20 tipos) ⚠️     ✅       ✅      ✅      ✅
Cobranza judicial                  ❌     ✅       ⚠️      ✅      ✅
─────────────────────────────────────────────────────────────────────────
Registro de copropietarios         ❌     ✅       ✅      ✅      ✅
Gestión de Asambleas + Actas       ❌     ✅       ✅      ✅      ✅
─────────────────────────────────────────────────────────────────────────
Ingresos/Egresos operacionales     ✅     ✅       ✅      ✅      ✅
Conciliación bancaria              ✅     ✅       ✅      ✅      ✅
Exportación a 3 plataformas        ✅     ❌       ❌      ❌      ❌   EXCLUSIVO
Asistente IA con Ley 21.442        ✅     ❌       ❌      ❌      ❌   EXCLUSIVO
Cierre mensual estructurado        ✅     ⚠️       ⚠️      ⚠️      ❌   EXCLUSIVO
```

*✅ = Completo | ⚠️ = Parcial | ❌ = Ausente*

---

## PARTE 6 — ROADMAP FINANCIERO SUGERIDO PARA BUMA OPS

### Módulo 1: UNIDADES Y ALÍCUOTAS (base de todo)
*Prerequisito para todo lo demás*

```
Schema:
  units (id, building_id, unit_number, type, area_m2, avaluo_fiscal, alicuota)
  unit_contacts (unit_id, contact_type: owner/renter/occupant, name, rut, email, phone)

UI:
  Gestión de unidades por edificio (tabla editable)
  Validación: Σ alícuotas = 100% exacto
  Importación desde Excel (para onboarding inicial)
```

### Módulo 2: GENERACIÓN DE GASTO COMÚN
*El corazón del negocio de administración*

```
Proceso:
  1. Selección período (mes/año) + edificio
  2. Listado de egresos del mes + toggle "incluir en GC"
  3. Cálculo automático por alícuota
  4. Agregar fondo de reserva, seguros, cargos particulares
  5. Vista previa boleta (con deuda anterior e intereses)
  6. Emisión definitiva → genera PDF por unidad

Schema:
  gc_periods (id, building_id, month, year, total_expenses, status, emitted_at)
  gc_unit_charges (id, gc_period_id, unit_id, gc_base, fondos, seguros,
                   cargos_part, deuda_ant, intereses, total, paid_amount,
                   balance, status, due_date, paid_at)
```

### Módulo 3: DEUDA Y COBRANZA
*Impacto directo en la recaudación del condominio*

```
Funciones:
  - Dashboard de morosos por edificio (% de morosidad, $ total adeudado)
  - Envío masivo de boletas por email (PDF adjunto)
  - Recordatorios configurables (D-3, D+1, D+7, D+15)
  - Convenios de pago: cuotas, seguimiento de cumplimiento
  - Cálculo automático de intereses diarios
  - Reporte para asamblea: listado morosos
```

### Módulo 4: FONDOS Y PRESUPUESTO
*Transparencia financiera y cumplimiento legal*

```
Funciones:
  - Saldo del Fondo de Reserva en tiempo real
  - Presupuesto anual por categoría
  - Comparativo real vs. presupuesto
  - Proyección financiera 12 meses
  - Balance mensual para comité (auto-generado)
  - Balance anual para asamblea (con verificadores)
```

### Módulo 5: MEDIDORES (diferenciador técnico)
*Para edificios con consumos centralizados*

```
Funciones:
  - Registro de medidores por unidad
  - Ingreso de lecturas mensuales
  - Cálculo automático → integrado en boleta GC
```

---

## PARTE 7 — CONCLUSIÓN ESTRATÉGICA

### BUMA OPS como herramienta de apoyo vs. sistema completo

**Situación actual:** BUMA OPS es una excelente herramienta de gestión **interna** (operaciones, tickets, visitas, conciliación bancaria, cierre financiero), pero depende de Edipro/Kastor/ComunidadFeliz para la función **más crítica**: la generación y cobranza del gasto común.

**Oportunidad:** Si BUMA OPS implementa los módulos de Unidades + Gasto Común + Cobranza, puede convertirse en la plataforma **principal** de los edificios que administra, sin necesidad de exportar a terceros para los procesos core.

**Riesgo de no hacerlo:** Los edificios seguirán pagando 2 sistemas (Edipro/Kastor/CF + BUMA OPS), y si deben elegir uno, elegirán el que genera el gasto común.

**Ventaja diferenciadora a mantener:** Los 3 exclusivos de BUMA OPS (exportación multi-plataforma, IA legal, cierre mensual estructurado) deben mantenerse aunque se implementen los módulos faltantes.

---

*Fuentes: Ley 21.442 (D.O. 13-ABR-2022), Reglamento DS N°7 (D.O. 09-ENE-2025), edipro.cl, kastorsoftware.cl, comunidadfeliz.cl, edifito.com, comparasoftware.cl, comoadministrarcondominios.cl*
