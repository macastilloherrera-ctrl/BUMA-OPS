# BUMA OPS — Visión: Sistema Completo para Empresa Administradora
## Funciones innovadoras que ningún competidor chileno tiene

**Fecha:** Abril 2026 | **Versión:** 1.0

---

## EL ÁNGULO CORRECTO

Edifito, Edipro, Kastor y ComunidadFeliz son sistemas **para el edificio** — los usa el condominio.

BUMA OPS debería ser el sistema **para la empresa que administra múltiples edificios** — lo usa el equipo de BUMA para gestionar todo su portafolio con eficiencia y visibilidad total.

Esa diferencia de foco es enorme y está desatendida en el mercado chileno. Internacionalmente, las plataformas como AppFolio, Yardi o Buildium empiezan a cubrirla — pero en Chile no existe nada así.

---

## PARTE 1 — LO QUE HOY HACE BUMA OPS BIEN (base sólida)

| Módulo | Para quién | Estado |
|---|---|---|
| Tickets operacionales | Equipo BUMA | ✅ |
| Agenda de visitas en terreno | Ejecutivos | ✅ |
| Conciliación bancaria | Finanzas BUMA | ✅ |
| Cierre mensual por edificio | Finanzas BUMA | ✅ |
| Ingresos/egresos por edificio | Finanzas BUMA | ✅ |
| Exportación a Edipro/CF/Kastor | Finanzas BUMA | ✅ |
| Asistente IA (Ley 21.442) | Todo el equipo | ✅ |
| Dashboard operacional | Gerencia BUMA | ✅ |

---

## PARTE 2 — MÓDULOS QUE FALTAN PARA SER UN SISTEMA COMPLETO DE EMPRESA ADMINISTRADORA

---

### 2.1 INTELIGENCIA DE NEGOCIO — DASHBOARD DE PORTAFOLIO
**Categoría: Innovador en Chile | Disponible en: AppFolio, Yardi, Buildium**

Hoy BUMA ve los edificios uno por uno. Lo que falta es la **visión consolidada del portafolio completo** con KPIs que le permitan tomar decisiones como empresa.

**KPIs que deberían estar en el dashboard de Gerencia:**

```
PORTAFOLIO BUMA — Vista Gerencial
────────────────────────────────────────────────────────────
  9 edificios activos | 847 unidades | 4 ejecutivos

FINANCIERO (empresa BUMA):
  Ingresos mensuales:          $4.200.000 CLP
  Costos operacionales:        $2.100.000 CLP
  Margen bruto:                50%
  Rentabilidad por edificio:   ver detalle →

OPERACIONAL (calidad del servicio):
  Tasa resolución tickets:     87% (meta: 90%)
  Tiempo prom. resolución:     2.4 días (meta: 2 días)
  Visitas completadas / mes:   34 / 38 programadas (89%)
  Certificaciones vencidas:    ⚠️ 2 edificios

RIESGO LEGAL:
  Edificios con cumplimiento completo:   6/9
  Edificios con alertas pendientes:      ⚠️ 3
  Próximos vencimientos (30 días):       Gas Edificio A, Ascensor Ed. C
```

**Qué falta construir:**
- KPI de rentabilidad por edificio (ingresos de BUMA por edificio vs. costo de atenderlo)
- Índice de satisfacción del comité (NPS por edificio)
- Tasa de resolución de tickets en plazo
- Heatmap de edificios por nivel de riesgo
- Tendencias mensuales y anuales por indicador

---

### 2.2 RENTABILIDAD POR EDIFICIO (P&L del cliente)
**Categoría: Innovador en Chile | Disponible en: AppFolio, Buildium**

En el mundo de la administración de propiedades, los márgenes van del 30-50% bruto. Pero no todos los edificios son igual de rentables. Hoy BUMA no sabe cuánto le cuesta atender cada edificio vs. cuánto le factura.

**Qué permite este módulo:**
- Registrar la tarifa mensual que paga cada edificio a BUMA (honorarios de administración)
- Registrar el costo de atención: horas ejecutivo × tarifa + visitas + materiales
- Calcular margen por edificio mes a mes
- Detectar edificios con margen negativo (están costando más de lo que pagan)
- Simular impacto de subir la tarifa a un edificio específico

**Modelo de datos:**
```
buildings_contract:
  building_id, monthly_fee, fee_type (fijo/porcentaje), contract_start, contract_end
  
buildings_cost:
  building_id, month, year
  executive_hours, hourly_rate, visits_cost, materials_cost, overhead_allocation
  total_cost, revenue, margin, margin_pct
```

**Por qué es importante para BUMA:** Un edificio con muchos tickets y pocos GC puede estar destruyendo margen. Este módulo lo hace visible y permite tomar decisiones objetivas sobre pricing o renegociación.

---

### 2.3 CRM — PIPELINE DE NUEVOS EDIFICIOS
**Categoría: Innovador en Chile | Internacional: LeadSimple, HubSpot para PM**

Toda empresa administradora crece captando nuevos edificios. Hoy ese proceso vive en emails y WhatsApp. Un CRM especializado permite gestionarlo profesionalmente.

**Flujo del pipeline:**
```
Prospecto → Contacto inicial → Visita diagnóstico → Propuesta enviada
→ Negociación → Contrato firmado → Onboarding → Cliente activo
```

**Qué incluye:**
- Registro de oportunidades (edificio nombre, dirección, # unidades, administradora actual)
- Historial de contactos con el comité del edificio prospecto
- Adjuntar propuesta comercial generada por el sistema
- Simulador de rentabilidad antes de firmar (proyección de margen del edificio)
- Notificaciones automáticas de seguimiento ("han pasado 7 días sin respuesta")
- Tasa de conversión por ejecutivo comercial
- Dashboard de pipeline: cuántos prospectos en cada etapa, ingresos potenciales

**Por qué es innovador:** Ningún software chileno de administración tiene esto. El onboarding de un nuevo edificio es un proceso crítico y hoy se maneja con Excel y WhatsApp.

---

### 2.4 GESTIÓN DE CONTRATOS (Empresa BUMA + Proveedores)
**Categoría: Necesario y ausente en Chile**

Existen dos tipos de contratos críticos para BUMA:

**a) Contratos con edificios (clientes de BUMA):**
- Contrato de administración con cada edificio (fecha inicio, duración, renovación, tarifa, cláusulas de salida)
- Alerta de vencimiento con 60/30/10 días de anticipación
- Estado de firma: pendiente / vigente / en renegociación / terminado
- Adjuntar PDF del contrato firmado

**b) Contratos con proveedores de servicio:**
- Contratos de mantención (ascensores, HVAC, bombas, jardines)
- Fecha de inicio y vencimiento
- SLA comprometido (tiempo de respuesta, tiempo de resolución)
- Edificios cubiertos por cada contrato
- Historial de renovaciones y cambios de tarifa
- Alerta de vencimiento
- Rating de cumplimiento de SLA del proveedor

**Qué falta hoy:** BUMA tiene registro de proveedores pero no gestión de contratos ni SLAs medibles.

---

### 2.5 REPOSITORIO DOCUMENTAL CENTRALIZADO
**Categoría: Fundamental | Internacional: mercado proyectado $8.3B → $24B en 2032**

Cada edificio genera decenas de documentos críticos al año. Hoy están dispersos en emails, carpetas compartidas y Dropbox. Un repositorio centralizado en BUMA OPS cambia todo.

**Tipos de documentos a gestionar:**

| Categoría | Documentos | Vence |
|---|---|---|
| **Certificaciones legales** | Gas (anual), Ascensores (anual), HVAC (anual), Instalación eléctrica | ✅ |
| **Seguros** | Póliza incendio, RC, robo | ✅ |
| **Contratos** | Administración, mantención, arriendo espacios | ✅ |
| **Legal edificio** | Reglamento copropiedad, Planos, Escritura | No |
| **Personal** | Contratos conserje, liquidaciones, certificados AFP/isapre | Parcial |
| **Operacional** | Manuales equipos, planes de emergencia | Parcial |
| **Financiero** | Balances mensuales, actas de asamblea, presupuestos | No |

**Funciones críticas:**
- Upload de documentos con metadatos (edificio, tipo, fecha emisión, fecha vencimiento)
- Búsqueda full-text en todos los documentos
- Alertas automáticas por vencimiento (90/30/7 días)
- Versioning (historial de versiones de cada documento)
- Permisos de acceso (qué puede ver cada rol)

---

### 2.6 CALENDARIO DE CUMPLIMIENTO LEGAL
**Categoría: Obligatorio por Ley 21.442 + diferenciador operativo**

Una empresa que administra 9 edificios tiene decenas de plazos legales vigentes en simultáneo. Perder uno puede significar una multa o una responsabilidad legal para BUMA.

**Vista consolidada de todos los vencimientos:**

```
CALENDARIO CUMPLIMIENTO — Próximos 90 días
══════════════════════════════════════════════════════════════
⚠️  MAY 15 | Edificio Las Rosas     | Cert. ascensores vencida
⚠️  MAY 22 | Edificio Parque Norte  | Póliza incendio vence
✅  JUN 03 | Edificio Centro        | Revisión gas — programada
🔴  JUN 10 | Edificio Las Rosas     | Plan emergencia no actualizado
✅  JUN 15 | Edificio Sur           | Mantención anual bombas — OK
🔴  JUN 20 | Edificio Alameda       | Cert. calderas — sin documento
══════════════════════════════════════════════════════════════
  3 edificios en riesgo legal  |  2 certificaciones críticas
```

**Reglas automáticas configurables:**
- Certif. gas: vence cada 12 meses → alerta 60/30/7 días antes
- Certif. ascensor: vence según norma → alerta automática
- Póliza incendio: fecha de vencimiento de la póliza → alerta 90/30/7
- Plan de emergencia: renovación anual → alerta cada año
- Contrato de administración: alerta 60 días antes del vencimiento

**Por qué es innovador:** Ningún software chileno tiene esto. El administrador maneja estas fechas manualmente con Excel o las olvida.

---

### 2.7 GESTIÓN DE CARGA DE TRABAJO POR EJECUTIVO
**Categoría: Gestión interna | Internacional: MRI, OctopusPro**

BUMA tiene ejecutivos de operaciones que atienden múltiples edificios. Hoy la distribución del trabajo no es visible en tiempo real.

**Qué permite este módulo:**
- Ver la carga de trabajo actual de cada ejecutivo: tickets abiertos, visitas programadas, cierres pendientes
- Detectar sobrecarga (ejecutivo con >X tareas abiertas simultáneas)
- Redistribuir tareas con drag & drop
- Medir productividad: tickets cerrados / semana, visitas completadas vs. programadas, tiempo promedio por edificio
- Historial de carga por ejecutivo → base para decisiones de contratación
- Alertar cuando un edificio lleva >N días sin visita

**Dashboard de equipo:**
```
CARGA EJECUTIVOS — Semana 17 / 2026
─────────────────────────────────────────────────────────────
  Carla M.   ████████░░  8 tickets | 4 visitas | 2 cierres → OK
  Pedro L.   ██████████  12 tickets | 6 visitas | 3 cierres → ⚠️ sobrecarga
  Ana R.     ████░░░░░░  4 tickets | 2 visitas | 1 cierre  → disponible
  Luis T.    ██████░░░░  6 tickets | 3 visitas | 0 cierres → OK
```

---

### 2.8 EVALUACIÓN Y RANKING DE PROVEEDORES
**Categoría: Diferenciador operativo | Internacional: AppFolio, Buildium**

BUMA trabaja con los mismos proveedores en múltiples edificios. Actualmente no hay una evaluación sistemática de su desempeño.

**Qué incluye:**
- Rating automático por proveedor basado en: tiempo de respuesta, cumplimiento del SLA, reclamaciones, costo vs. presupuesto
- Historial de trabajos por proveedor (todos los edificios)
- Comparativa de costos entre proveedores del mismo rubro
- Blacklist: proveedores vetados con motivo documentado
- Recomendación de proveedor al abrir un ticket (basada en historial y disponibilidad)
- Evaluación post-servicio (el ejecutivo califica al terminar el ticket)

**Por qué es valioso para BUMA:** Con 9 edificios, BUMA tiene poder de negociación con proveedores. Datos de performance consolidan ese poder.

---

### 2.9 PORTAL PARA EL COMITÉ DE ADMINISTRACIÓN
**Categoría: Diferenciador de retención de clientes | Internacional: AppFolio Owner Portal**

El comité de cada edificio es el "cliente" de BUMA. Hoy deben llamar o escribir para saber qué está pasando en su edificio. Un portal propio cambia la relación.

**Qué ve el comité de cada edificio (sin tener acceso a los otros):**
- Estado financiero del mes (ingresos, egresos, saldo)
- Tickets abiertos y su estado
- Próximas visitas programadas de BUMA
- Alertas de cumplimiento legal (certif. vencidas, etc.)
- Documentos de su edificio (actas, balances, contratos)
- Mensajería directa con su ejecutivo asignado

**Por qué es innovador en Chile:** Ninguna empresa administradora chilena ofrece esto. Mejora la percepción de transparencia, reduce llamadas y emails, y es un argumento de venta diferenciador frente a la competencia.

---

### 2.10 PLANIFICACIÓN ANUAL POR EDIFICIO (Plan de Mantención)
**Categoría: Obligatorio + diferenciador | Swappi/ComunidadFeliz tiene algo similar**

Cada edificio debería tener un plan anual de mantenciones programadas. Hoy esto se maneja ad-hoc.

**Qué incluye:**
- Plantilla de plan anual: mantenciones mensuales + anuales por tipo de equipo
- Carta Gantt visual (semanas del año)
- Asignación de proveedor y presupuesto estimado por ítem
- Seguimiento de ejecución (completado / atrasado / cancelado)
- Generación de tickets desde el plan cuando llega la fecha
- Informe de cumplimiento del plan anual para presentar al comité

---

### 2.11 MÓDULO DE ONBOARDING DE NUEVOS EDIFICIOS
**Categoría: Eficiencia operacional | No existe en Chile**

Cuando BUMA gana un nuevo edificio, hay un proceso de toma de control complejo: levantar información, revisar documentos, transferir contratos, hacer inventario de equipos. Hoy es caótico.

**Proceso estructurado de onboarding:**
```
Etapa 1 — Diagnóstico inicial (semana 1)
  □ Visita de levantamiento con checklist estándar
  □ Fotografía de equipos críticos
  □ Recolección de documentos obligatorios
  □ Registro de proveedores actuales
  □ Censo de unidades y copropietarios

Etapa 2 — Setup en sistema (semana 2)
  □ Crear edificio en BUMA OPS
  □ Cargar unidades y alícuotas
  □ Cargar documentos al repositorio
  □ Configurar alertas de cumplimiento
  □ Configurar exportación a Edipro/CF/Kastor

Etapa 3 — Primer ciclo operacional (mes 1)
  □ Primera visita programada
  □ Primera conciliación bancaria
  □ Primer cierre mensual
  □ Presentación al comité del primer informe BUMA
```

---

### 2.12 ANÁLISIS PREDICTIVO E IA OPERACIONAL
**Categoría: Innovador mundial | AppFolio Realm-X, Morgan Stanley: $34B en eficiencias**

El mercado mundial está adoptando IA no solo como chatbot sino como motor de operaciones. BUMA OPS ya tiene IA legal — puede ser pionero en IA operacional en Chile.

**Casos de uso de IA operacional:**

```
🤖 ALERTAS INTELIGENTES (basadas en patrones históricos)
   "El ascensor del Edificio A tuvo 3 fallas en 6 meses —
    la probabilidad de falla mayor antes de agosto es 74%"
   Acción sugerida: Programar revisión preventiva →

🤖 OPTIMIZACIÓN DE AGENDA
   "Pedro tiene 6 visitas la próxima semana pero 3 están en
    el mismo sector — reorganizar reduce traslados 40%"

🤖 DETECCIÓN DE ANOMALÍAS FINANCIERAS
   "Los egresos de Edificio Norte subieron 34% vs. promedio
    histórico — categoría: mantención. Revisar facturas."

🤖 PREDICCIÓN DE MOROSIDAD
   "Basado en el historial, el Edificio Centro tiene patrón
    de alta morosidad en enero/febrero — anticipar cobranza"

🤖 BENCHMARK AUTOMÁTICO
   "El costo de ascensores en Edificio Sur es 2.3× el
    promedio de tu portafolio — posible oportunidad de
    renegociar contrato con proveedor actual"
```

---

### 2.13 MÓDULO DE PROPUESTAS COMERCIALES
**Categoría: Diferenciador de ventas | No existe en Chile**

Cuando BUMA visita un edificio para ofrecerle sus servicios, presenta una propuesta. Hoy esa propuesta es un Word/PDF manual.

**Qué incluye:**
- Plantilla de propuesta con marca BUMA
- Completar datos del edificio (# unidades, # pisos, equipos)
- Proyección automática de honorarios y margen esperado
- Inclusión de servicios diferenciadores (IA, dashboard comité, conciliación bancaria, exportación multi-plataforma)
- Generación de PDF profesional en 1 clic
- Registro en CRM como propuesta enviada
- Seguimiento: abierta / vista / en evaluación / rechazada / aceptada

---

### 2.14 FACTURACIÓN A CLIENTES (BUMA → Edificios)
**Categoría: Operacional crítico | No está en BUMA OPS hoy**

BUMA cobra honorarios a cada edificio que administra. Hoy ese proceso de facturación es manual.

**Qué incluye:**
- Generación automática de cobro mensual por edificio (según contrato)
- Registro de pagos recibidos
- Alerta de edificios con honorarios atrasados
- Reporte de ingresos BUMA por mes (base para el P&L de la empresa)
- Exportación para contabilidad interna

---

## PARTE 3 — MAPA DE INNOVACIÓN

### ¿Qué existe en Chile hoy?

```
FUNCIÓN                              CHILE HOY         MUNDO HOY
────────────────────────────────────────────────────────────────
GC / cobranza edificio                Edipro, CF          ✅ Sólido
Portal residente                      Edifito, CF         ✅ Sólido
Conciliación bancaria                 Todos               ✅ Sólido
────────────────────────────────────────────────────────────────
KPIs de portafolio empresa adm.       ❌ NADIE            AppFolio ✅
P&L por edificio (rentabilidad)       ❌ NADIE            Buildium ✅
CRM nuevos edificios                  ❌ NADIE            LeadSimple ✅
Ranking y evaluación de proveedores   ❌ NADIE            AppFolio ✅
Portal comité (owner portal)          ❌ NADIE            AppFolio ✅
Calendario cumplimiento legal         ❌ NADIE            Re-Leased ✅
Repositorio documental                ❌ NADIE            Yardi ✅
Carga de trabajo por ejecutivo        ❌ NADIE            MRI ✅
Onboarding estructurado              ❌ NADIE            Buildium ✅
Propuestas comerciales                ❌ NADIE            LeadSimple ✅
IA operacional (no solo chatbot)      ❌ NADIE            AppFolio Realm-X ✅
Facturación empresa adm.              ❌ NADIE            Todos ✅
```

**Conclusión: Todo lo de la columna central es territorio inexplorado en Chile.**

---

## PARTE 4 — ROADMAP SUGERIDO

### Fase A — Visibilidad del negocio (0-2 meses)
Módulos que dan ROI inmediato a BUMA como empresa:
1. **P&L por edificio** — saber qué edificios son rentables
2. **Calendario de cumplimiento** — eliminar riesgo legal hoy
3. **Repositorio documental** — orden inmediato

### Fase B — Eficiencia operacional (2-4 meses)
Módulos que reducen trabajo manual del equipo:
4. **Carga de trabajo ejecutivos** — evitar cuellos de botella
5. **Evaluación de proveedores** — negociar con datos
6. **Onboarding estructurado** — escalar sin caos

### Fase C — Diferenciación comercial (4-8 meses)
Módulos que diferencian a BUMA frente a la competencia:
7. **Portal comité** — retención de clientes
8. **CRM nuevos edificios** — crecimiento del portafolio
9. **Propuestas comerciales** — profesionalización del proceso de ventas
10. **IA operacional** — predicciones, alertas, benchmarks

---

## PARTE 5 — EL POSICIONAMIENTO ÚNICO DE BUMA OPS

Si se implementan estos módulos, BUMA OPS se convierte en algo que no existe en Chile:

> **El sistema operativo de una empresa administradora de propiedades — no el software del edificio, sino el cerebro de la empresa que administra múltiples edificios.**

La propuesta de valor sería:
- **Para el equipo de BUMA:** Visibilidad total del portafolio, menos trabajo manual, decisiones basadas en datos
- **Para la gerencia:** KPIs del negocio, rentabilidad por cliente, herramientas para crecer
- **Para los comités:** Transparencia en tiempo real, portal propio, mejor comunicación
- **Para el cumplimiento legal:** Cero vencimientos olvidados, todo documentado y trazable

Esto no compite con Edipro, Kastor o ComunidadFeliz — es una capa superior que los complementa o eventualmente los reemplaza.

---

*Fuentes: AppFolio Realm-X (2025), Buildium Product Suite (2025), Yardi Voyager, MRI Software, LeadSimple (property mgmt CRM), Re-Leased (compliance), OctopusPro (field ops), Morgan Stanley AI Real Estate Report (2024), NAA Apartmentalize 2025*
