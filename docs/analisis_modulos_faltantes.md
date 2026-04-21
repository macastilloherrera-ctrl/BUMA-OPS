# BUMA OPS — Análisis de Módulos Faltantes
## Comparativa vs. Competencia + Marco Legal Ley 21.442

**Fecha:** Abril 2026 | **Autor:** BUMA OPS Internal

---

## 1. Situación Actual — Módulos que BUMA OPS ya tiene

| Módulo | Estado | Observaciones |
|---|---|---|
| Dashboard operacional (tickets, visitas) | ✅ Completo | Semáforo, paneles por rol |
| Gestión de Tickets | ✅ Completo | Asignación, prioridad, estados |
| Agenda de Visitas | ✅ Completo | Programación, ejecución, reportes |
| Edificios y ficha de inmueble | ✅ Completo | Datos, staff, documentos, equipos |
| Equipos críticos | ✅ Completo | Inventario y seguimiento de mantención |
| Ingresos y Egresos | ✅ Completo | Con cierre mensual y exportación |
| Conciliación Bancaria | ✅ Completo | Parsers BCI/Chile/Santander/Scotia |
| Cierre Mensual | ✅ Completo | 7 estados, checklists, aprobación |
| Consumos Recurrentes | ✅ Completo | Plantillas → generación mensual |
| Exportación Edipro / ComunidadFeliz / Kastor | ✅ Completo | Formatos nativos de cada plataforma |
| Proyectos | ✅ Completo | Hitos, semáforo de plazos |
| Proveedores y Mantenedores | ✅ Completo | Directorio |
| Gestión de Usuarios y Roles (RBAC) | ✅ Completo | 7 roles con permisos granulares |
| Asistente IA (Gemini) | ✅ Completo | Con base de conocimiento de la ley |
| Monitoreo Chat IA | ✅ Completo | Solo para Gerente y Super Admin |
| Acceso Conserjería (PIN) | ✅ Completo | Login simplificado por edificio |
| Verificación GGCC | ✅ Completo | Por unidad, morosos, anomalías |

---

## 2. Competencia Chilena — Análisis por Plataforma

### 2.1 Edipro (edipro.cl)
Presente en Chile, Perú, México, Bolivia y Panamá. Fuerte en contabilidad y comunicación.

**Módulos diferenciadores:**
- Portal y App móvil para residentes (pago gastos comunes online, historial, notificaciones)
- App específica para Conserjes (digitalización de funciones del portero)
- WebPay integrado (pago de GC con tarjeta crédito/débito)
- Gestión multi-comunidad desde un único panel (Edipro Manager)
- Control de Accesos (registro de visitas, encomiendas, cámaras)
- Conciliación bancaria "con 1 clic"
- Soporte 18/7

### 2.2 Kastor (kastorsoftware.cl)
+3.000 comunidades en Chile. Nacieron como software contable, fuerte en automatizaciones.

**Módulos diferenciadores:**
- Conciliación bancaria automatizada via **Fintoc** (conexión directa a cuenta bancaria del condominio, reduce 70% el tiempo)
- Integración con el **SII** (tributación)
- Automatización de envío de boletas a residentes
- Gestión de proveedores y pago de facturas integrado
- Sistema de comunicación comité-copropietarios
- Portal residente

### 2.3 ComunidadFeliz + Swappi (comunidadfeliz.cl)
Plataforma más completa del mercado chileno. Swappi es su módulo operativo (antes independiente).

**Módulos diferenciadores:**
- **Módulo Medidores**: lectura de medidores individuales (agua, luz, gas) para cálculo de GC variable
- **Módulo Remuneraciones**: liquidaciones de sueldo del personal del condominio
- **Ingresos Extraordinarios**: gestión de cobros extra a residentes
- **WebPay OneClick**: pago de GC en 1 click desde boleta o portal
- Portal residente con historial de pagos, pagos en línea
- **Swappi — Gestión Operativa**:
  - Módulo Visitas en Terreno (checklist + fotos + firma digital en móvil)
  - Módulo Mantenciones y Certificaciones con alertas
  - Módulo Plan de Acción y Tareas
  - Planificación anual con carta Gantt
  - Reportes exportables en tiempo real

### 2.4 Edifito (edifito.com)
+6.000 condominios, +620.000 propietarios en Latinoamérica. Más de 20 años.

**Módulos diferenciadores:**
- **Conciliación bancaria con IA** (asignación automática de pagos a departamentos)
- **Control de Accesos con QR**: entrada de visitas via código QR
- **Registro de Correspondencia y Paquetería** con notificación automática al residente
- **Módulo de Remuneraciones** con Previred actualizado (cotizaciones previsionales)
- **20+ tipos de informes** contables y de gestión
- **Recordatorios automáticos de pago** (antes y después del vencimiento)
- Portal y App para residentes (Khipu, MercadoPago, transferencia, tarjetas)

---

## 3. Referentes Mundiales

### 3.1 Buildium (EE.UU.) — HOA y Multifamily
| Módulo | Capacidad |
|---|---|
| Leasing & Marketing | Publicación en Zillow, Trulia, Facebook |
| Tenant Screening | Crédito, historial criminal, desalojos |
| Online Leasing | Firma electrónica desde cualquier dispositivo |
| Rent Collection | Cobro automático con recordatorios |
| Maintenance Ticketing | Asignación a proveedores, tracking en tiempo real |
| Owner Portal | Portal para propietarios con reportes financieros |
| Tenant Portal | Portal para arrendatarios (pagos, solicitudes) |
| Property Inspection | Inspecciones móviles con integración HappyCo |
| Tax Management | 1099 e-Filing para gestión tributaria |
| Website Builder | Sitio web del condominio incluido |

### 3.2 AppFolio (EE.UU.)
- IA para ruteo de órdenes de mantención
- Leasing online end-to-end
- Owner/investor portal con analytics
- Communication Center (SMS, email, chat centralizado)

### 3.3 Yardi (EE.UU./Global)
- ERP completo para portfolios grandes
- Market analytics (precios de arriendo del mercado)
- Utility billing (cobro de servicios básicos)
- Energy management
- Compliance management

---

## 4. Módulos FALTANTES en BUMA OPS

### PRIORIDAD ALTA — Exigidos por Ley 21.442

---

#### 4.1 REGISTRO DE COPROPIETARIOS
**Obligatorio por:** Art. 5-7 Reglamento Ley 21.442 | Art. 9 Ley 21.442

El administrador debe mantener un registro actualizado con: nombre completo, RUT, email, domicilio, y calidad de ocupación (propietario/arrendatario/otro). Distinción entre ocupante permanente (≥30 días) y transitorio. Plazo de inscripción: 60 días desde adquisición.

**Qué falta en BUMA OPS:**
- Tabla de unidades (departamentos/oficinas/locales) por edificio
- Registro por unidad de: propietario, arrendatario, ocupante(s)
- Historial de cambios de titularidad
- Estado de habilitación (copropietario hábil = al día en GC)
- Export reglamentario

---

#### 4.2 LIBRO DE ACTAS
**Obligatorio por:** Art. 2.4 Reglamento | Art. 15 Ley 21.442

Las actas de asambleas ordinarias y extraordinarias deben registrarse en libro foliado (digital o papel). Firmadas dentro de 30 días. Quórum de constitución y votación deben constar.

**Qué falta en BUMA OPS:**
- Módulo de registro de asambleas
- Plantilla de actas con quórum automático
- Firma digital de miembros del comité
- Almacenamiento foliado y trazable

---

#### 4.3 LIBRO DE NOVEDADES (Libro de Reclamos)
**Obligatorio por:** Art. 2.5 Reglamento | Art. 30 Reglamento (plazo 20 días para responder)

Registro de reclamos, solicitudes y novedades de la administración. Respuesta obligatoria en ≤20 días hábiles.

**Qué falta en BUMA OPS:**
- Canal formal de reclamos por edificio
- Tracking de estado de respuesta
- Alerta automática al vencer 20 días sin respuesta
- Historial de solicitudes por unidad/residente

---

#### 4.4 GESTIÓN DE MOROSIDADES Y CONVENIOS DE PAGO
**Obligatorio por:** Art. 6 y 7 Ley 21.442 | Art. 9 Reglamento | Art. 27 Reglamento

El sistema debe controlar: deuda por unidad, intereses por mora (máximo 50% del interés bancario corriente), convenios de pago (acuerdo del comité), notificación previa de 5 días antes de suspender suministros.

**Qué falta en BUMA OPS:**
- Estado de deuda por unidad y período
- Cálculo de intereses por mora
- Registro de convenios de pago (cuotas, estado, cumplimiento)
- Notificaciones formales de morosidad (con 5 días de anticipación antes de suspensión)
- Reporte de morosos para asamblea

---

#### 4.5 PLAN DE EMERGENCIA Y EVACUACIÓN
**Obligatorio por:** Art. 40 Ley 21.442 | Art. 33-35 Reglamento

Plan elaborado por ingeniero en prevención de riesgos, actualizado anualmente. Debe entregarse a Carabineros y Bomberos. Constancia de recepción debe exhibirse en el condominio.

**Qué falta en BUMA OPS:**
- Campo de fecha de vigencia del plan de emergencia (ya existe en ficha de edificio parcialmente)
- Registro de entrega a Carabineros y Bomberos (con constancia)
- Alerta de vencimiento anual
- Archivo del documento firmado

---

#### 4.6 SEGUROS — GESTIÓN INTEGRAL
**Obligatorio por:** Art. 16 Ley 21.442 | Art. 37-40 Reglamento

Seguro colectivo de incendio obligatorio para todos los condominios, pagado como parte del gasto común. El administrador debe renovarlo antes del vencimiento.

**Qué falta en BUMA OPS:**
- Panel de seguros por edificio con: tipo, compañía, monto asegurado, vencimiento
- Alerta de renovación (30/60/90 días antes)
- Registro de pago de prima (integrado con egresos)
- Cobertura por unidad (individual vs colectivo)

*(Nota: ya existe algo de seguros en la ficha de edificio, pero no está integrado con finanzas ni tiene alertas sistemáticas)*

---

#### 4.7 RENDICIÓN DE CUENTAS FORMAL
**Obligatorio por:** Art. 14 Ley 21.442 | Art. 28-29 Reglamento

El administrador debe entregar balance de ingresos y egresos en cada asamblea ordinaria con: cartola bancaria, verificadores de cada gasto, respaldo de pagos de seguros y certificaciones. El comité lo recibe mensualmente.

**Qué falta en BUMA OPS:**
- Generación de balance mensual formal (con verificadores adjuntos)
- Envío automático al comité 24 horas antes de cada reunión
- Módulo de observaciones al balance y respuestas dentro de 15 días
- Registro histórico de balances presentados por asamblea

---

### PRIORIDAD MEDIA — Ventaja competitiva directa

---

#### 4.8 MÓDULO DE REMUNERACIONES
Todos los competidores lo tienen (Edifito, ComunidadFeliz). El personal de conserje/mantenimiento del condominio es empleado del condominio.

**Qué incluiría:**
- Liquidaciones de sueldo mensuales
- Integración con Previred (cotizaciones previsionales)
- Cálculo de finiquito y indemnizaciones
- Exportación al fondo común de reserva (para cubrir pasivos laborales)

---

#### 4.9 MÓDULO DE MEDIDORES
Necesario para GC con componente variable (agua, luz, gas individual).

**Qué incluiría:**
- Registro de lectura mensual por medidor
- Cálculo automático del consumo individual
- Cobro diferenciado en gastos comunes

---

#### 4.10 PORTAL / APP PARA RESIDENTES
El diferenciador más grande de todos los competidores. Permite escalar sin aumentar equipo humano.

**Qué incluiría:**
- Ver gastos comunes del mes (boleta digital)
- Historial de pagos y deuda
- Subir solicitudes al Libro de Novedades
- Ver actas publicadas y comunicados
- Ver estado de su reserva de espacios comunes
- Notificaciones push (mora, comunicados, visitas)
- *Fase 2:* pago online via WebPay/Khipu

---

#### 4.11 GESTIÓN DE ASAMBLEAS
Requerido por ley, diferenciador competitivo.

**Qué incluiría:**
- Programación de asamblea (ordinaria/extraordinaria)
- Convocatoria con envío a todos los copropietarios registrados
- Registro de asistencia y quórum
- Votación (presencial + virtual/telemática según Ley 21.508)
- Generación automática del Acta
- Almacenamiento en Libro de Actas digital

---

#### 4.12 CONTROL DE ACCESOS Y CORRESPONDENCIA
Diferenciador operativo para el conserje.

**Qué incluiría:**
- Registro digital de visitas (nombre, RUT, unidad a visitar, hora entrada/salida)
- Control de correspondencia y paquetería con notificación al residente
- QR de acceso por invitación
- Integración con interfono/cámaras (fase futura)

---

#### 4.13 GESTIÓN DE ESPACIOS COMUNES
Muy valorado por residentes. Común en todos los competidores.

**Qué incluiría:**
- Inventario de espacios (SUM, BBQ, piscina, canchas, sala de yoga, etc.)
- Agenda de reservas por unidad
- Límite de reservas por período
- Confirmación automática y recordatorio

---

### PRIORIDAD BAJA — Diferenciación avanzada

---

#### 4.14 INTEGRACIÓN CON FINTOC O OPEN BANKING
Kastor ya lo tiene. Elimina el proceso manual de importar cartolas bancarias.

**Qué incluiría:**
- Conexión directa a cuenta bancaria del condominio
- Importación automática de movimientos diarios
- Pre-reconciliación automática con IA

---

#### 4.15 APP MÓVIL NATIVA PARA EJECUTIVOS Y CONSERJES
Actualmente el sistema es responsive pero no es una app nativa.

**Qué incluiría:**
- App Android/iOS para ejecutivos (visitas en terreno, tickets offline)
- App para conserjes (registro de visitas, paquetería, incidentes)
- Firma digital en terreno

---

#### 4.16 INTEGRACIÓN CON SII
Kastor lo tiene. Relevante para condominio como empleador.

**Qué incluiría:**
- Emisión de boletas y facturas (condominio no es empresa, pero hay servicios)
- Declaración de IVA en caso de servicios comunes arrendados

---

#### 4.17 INFORMES EJECUTIVOS Y DASHBOARD FINANCIERO PÚBLICO
Edifito tiene +20 tipos de informe.

**Qué incluiría:**
- Balance mensual automático
- Flujo de caja proyectado
- Comparativo real vs presupuesto
- Dashboard para comité con gráficos

---

## 5. Resumen Priorizado — Roadmap Sugerido

### Fase 1 — Cumplimiento Legal (0-3 meses)
| # | Módulo | Marco Legal |
|---|---|---|
| 1 | Registro de Copropietarios | Art. 9 Ley 21.442 obligatorio |
| 2 | Libro de Novedades (Reclamos) | Art. 30 Reglamento, 20 días respuesta |
| 3 | Gestión de Morosidades y Convenios de Pago | Art. 6-7 Ley, Art. 9 Reglamento |
| 4 | Seguros — Panel integral con alertas | Art. 37-40 Reglamento |
| 5 | Plan de Emergencia — Seguimiento de entrega | Art. 33-35 Reglamento |

### Fase 2 — Competitividad (3-6 meses)
| # | Módulo | Competidores que lo tienen |
|---|---|---|
| 6 | Gestión de Asambleas + Libro de Actas | Todos |
| 7 | Rendición de Cuentas Formal (balances) | Todos |
| 8 | Control de Accesos y Correspondencia | Edifito, Edipro |
| 9 | Reserva de Espacios Comunes | Todos |
| 10 | Módulo de Medidores | ComunidadFeliz, Edifito |

### Fase 3 — Diferenciación (6-12 meses)
| # | Módulo | Impacto |
|---|---|---|
| 11 | Portal Web para Residentes | Alto — escala sin equipo humano |
| 12 | Módulo de Remuneraciones | Medio — elimina Excel del conserje |
| 13 | App Móvil nativa | Alto — experiencia ejecutivos/conserjes |
| 14 | Open Banking (Fintoc) | Medio — conciliación automática |
| 15 | Informes ejecutivos (+20 tipos) | Medio — presentación al comité |

---

## 6. Gap Analysis Visual

```
MÓDULO                          BUMA   EDIPRO  KASTOR  CF+SWAPPI  EDIFITO  LEY
Ingresos/Egresos                  ✅     ✅       ✅       ✅         ✅
Conciliación bancaria             ✅     ✅       ✅       ✅         ✅
Cierre mensual                    ✅     ✅       ✅       ✅         ✅
Registro de Copropietarios        ❌     ✅       ✅       ✅         ✅      OBLIGATORIO
Libro de Novedades                ❌     ✅       ✅       ✅         ✅      OBLIGATORIO
Libro de Actas / Asambleas        ❌     ✅       ✅       ✅         ✅      OBLIGATORIO
Gestión de Morosidades            ❌     ✅       ✅       ✅         ✅      OBLIGATORIO
Plan de Emergencia tracking       ⚠️     ✅       ✅       ✅         ✅      OBLIGATORIO
Seguros integral                  ⚠️     ✅       ✅       ✅         ✅      OBLIGATORIO
Rendición de Cuentas formal       ⚠️     ✅       ✅       ✅         ✅      OBLIGATORIO
Portal Residente                  ❌     ✅       ✅       ✅         ✅
Control de Accesos                ❌     ✅       ❌       ❌         ✅
Reserva Espacios Comunes          ❌     ✅       ✅       ✅         ✅
Módulo Medidores                  ❌     ❌       ❌       ✅         ✅
Remuneraciones / RRHH             ❌     ❌       ❌       ✅         ✅
App Móvil Nativa                  ❌     ✅       ✅       ✅         ✅
Integración Fintoc/Open Banking   ❌     ❌       ✅       ❌         ✅ (IA)
Integración SII                   ❌     ❌       ✅       ❌         ❌
Tickets Operacionales             ✅     ✅       ❌       ✅         ❌
IA Asistente Legal                ✅     ❌       ❌       ❌         ❌  ← EXCLUSIVO
Monitoreo Multibuilding           ✅     ✅       ✅       ✅         ✅
Exportación a 3 plataformas       ✅     ❌       ❌       ❌         ❌  ← EXCLUSIVO
```

*✅ = Completo | ⚠️ = Parcial | ❌ = Ausente*

---

## 7. Ventajas Únicas de BUMA OPS vs. la Competencia

BUMA OPS tiene ventajas que **ningún competidor chileno tiene:**

1. **Exportación simultánea a Edipro + ComunidadFeliz + Kastor** — permite cambiar de plataforma administradora sin perder datos
2. **Asistente IA con conocimiento de la Ley 21.442** — consultora legal disponible 24/7 para el equipo
3. **Monitoreo multi-edificio desde un panel unificado** — diseñado para empresa administradora (no para condominio individual)
4. **Rol de Conserjería con acceso PIN simplificado** — sin necesidad de email corporativo
5. **Cierre mensual con 7 estados y control de riesgo** — gestión de proceso sin paralelo en el mercado

Estas ventajas deben mantenerse y reforzarse mientras se completan los módulos faltantes.

---

*Fuentes: Ley 21.442 (D.O. 13-ABR-2022), Reglamento DS N°7 (D.O. 09-ENE-2025), edipro.cl, kastorsoftware.cl, comunidadfeliz.cl, edifito.com, buildium.com, appfolio.com, yardi.com*
