# Gastos Recurrentes — Documentación Técnica BUMA OPS

## 1. Descripción General

Los **Consumos Recurrentes** permiten definir plantillas de gastos fijos que se repiten mensualmente por edificio (agua, luz, gas, aseo, mantención, etc.). Cada mes, el equipo genera automáticamente los egresos correspondientes desde estas plantillas con un solo click, evitando el ingreso manual repetitivo.

---

## 2. Modelo de Datos

### Tabla: `recurring_expense_templates`
```sql
id               VARCHAR  PRIMARY KEY  DEFAULT gen_random_uuid()
building_id      VARCHAR  NOT NULL     -- Edificio al que pertenece
category         VARCHAR  NOT NULL     -- Categoría del gasto
description      TEXT                 -- Descripción opcional
vendor_id        VARCHAR              -- ID proveedor (referencia vendors)
vendor_name      VARCHAR(255)         -- Nombre del proveedor (texto libre)
estimated_amount DECIMAL(12,2)        -- Monto estimado (referencial)
frequency        ENUM('monthly')      -- Frecuencia (solo mensual por ahora)
is_active        BOOLEAN  DEFAULT true -- Si la plantilla está activa
created_by       VARCHAR  NOT NULL    -- Usuario que la creó
created_at       TIMESTAMP
updated_at       TIMESTAMP
```

### Relación con `expenses`
Los egresos generados desde plantillas llevan el campo `recurring_template_id` que apunta a la plantilla de origen. Esto permite saber qué egresos del mes fueron generados automáticamente y cuáles son manuales.

```
recurring_expense_templates (1) ──── (N) expenses
  id  ◄────────────────────────── recurring_template_id
```

### Esquema Drizzle ORM (`shared/schema.ts`)
```typescript
export const recurringExpenseTemplates = pgTable("recurring_expense_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildingId: varchar("building_id").notNull(),
  category: varchar("category", { length: 255 }).notNull(),
  description: text("description"),
  vendorId: varchar("vendor_id"),
  vendorName: varchar("vendor_name", { length: 255 }),
  estimatedAmount: decimal("estimated_amount", { precision: 12, scale: 2 }),
  frequency: recurringExpenseFrequencyEnum("frequency").notNull().default("monthly"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relaciones
export const recurringExpenseTemplatesRelations = relations(
  recurringExpenseTemplates, ({ one, many }) => ({
    building: one(buildings, {
      fields: [recurringExpenseTemplates.buildingId],
      references: [buildings.id],
    }),
    expenses: many(expenses),  // todos los egresos generados desde esta plantilla
  })
);

// Tipos de inserción y selección
export const insertRecurringExpenseTemplateSchema = createInsertSchema(
  recurringExpenseTemplates
).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertRecurringExpenseTemplate =
  z.infer<typeof insertRecurringExpenseTemplateSchema>;
export type RecurringExpenseTemplate =
  typeof recurringExpenseTemplates.$inferSelect;
```

---

## 3. Categorías Disponibles

| Valor interno | Etiqueta UI |
|---|---|
| `agua` | Agua |
| `luz` | Luz |
| `gas` | Gas |
| `internet` | Internet |
| `aseo` | Aseo |
| `materiales` | Materiales |
| `seguridad` | Seguridad |
| `jardines` | Jardines |
| `piscina` | Piscina |
| `administracion` | Administración |
| `otro` | Otro |

---

## 4. API Endpoints

### GET `/api/recurring-expense-templates`
Obtiene todas las plantillas. Acepta filtro `?buildingId=` para filtrar por edificio.
- **Permisos:** Cualquier rol con acceso financiero (`canAccessFinancial`)
- **Respuesta:** Array de `RecurringExpenseTemplate`

### POST `/api/recurring-expense-templates`
Crea una nueva plantilla.
- **Permisos:** Solo gerentes (`isManagerRole`)
- **Body:**
```json
{
  "buildingId": "uuid",
  "category": "agua",
  "description": "Agua potable mensual",
  "vendorName": "ESVAL S.A.",
  "estimatedAmount": "150000"
}
```

### PATCH `/api/recurring-expense-templates/:id`
Actualiza una plantilla existente (descripción, proveedor, monto estimado, activo/inactivo).
- **Permisos:** Solo gerentes
- **Body:** Cualquier subconjunto de campos de la plantilla, incluyendo `isActive`

### DELETE `/api/recurring-expense-templates/:id`
Elimina una plantilla permanentemente.
- **Permisos:** Solo gerentes
- **Nota:** No elimina los egresos ya generados desde esa plantilla

### POST `/api/expenses/generate-from-templates`
**Acción principal del flujo mensual.** Genera los egresos del mes desde las plantillas activas.
- **Permisos:** Solo gerentes
- **Body:**
```json
{
  "buildingId": "uuid",
  "chargeMonth": 3,
  "chargeYear": 2026
}
```
- **Respuesta:**
```json
{
  "created": 5,
  "skipped": 2,
  "expenses": [...]
}
```

---

## 5. Lógica de Generación (Backend)

```typescript
// server/routes.ts — POST /api/expenses/generate-from-templates
app.post("/api/expenses/generate-from-templates", isAuthenticated, async (req, res) => {
  const { buildingId, chargeMonth, chargeYear } = req.body;
  const month = parseInt(chargeMonth);
  const year = parseInt(chargeYear);

  // 1. Obtener solo plantillas ACTIVAS del edificio
  const templates = await storage.getRecurringExpenseTemplates({
    buildingId,
    isActive: true
  });

  // 2. Ver qué plantillas ya fueron generadas en este período (evita duplicados)
  const existingExpenses = await storage.getExpenses({ buildingId, month, year });
  const alreadyGenerated = existingExpenses.filter(e => e.recurringTemplateId != null);
  const alreadyGeneratedTemplateIds = new Set(
    alreadyGenerated.map(e => e.recurringTemplateId)
  );

  // 3. Solo generar las que aún no tienen egreso en este mes
  const toGenerate = templates.filter(t => !alreadyGeneratedTemplateIds.has(t.id));

  // 4. Crear cada egreso nuevo con estado PENDIENTE
  for (const template of toGenerate) {
    await storage.createExpense({
      buildingId: template.buildingId,
      sourceType: "recurrent",          // marca que vino de plantilla
      recurringTemplateId: template.id, // referencia a la plantilla
      description: template.description || template.category,
      amount: "0",                      // monto 0 hasta que se complete
      category: template.category,
      vendorName: template.vendorName,
      vendorId: template.vendorId,
      paymentStatus: "pending",         // siempre inicia como pendiente
      inclusionStatus: "included",
      chargeMonth: month,
      chargeYear: year,
      createdBy: req.user!.id,
    });
  }

  // Respuesta: cuántos se crearon y cuántos ya existían
  res.status(201).json({
    created: toGenerate.length,
    skipped: alreadyGeneratedTemplateIds.size,
    expenses: created
  });
});
```

**Reglas de negocio clave:**
- Si no hay plantillas activas → error 400
- Si ya se generaron todos para ese período → error 400
- Si algunas ya fueron generadas → se omiten (anti-duplicado), se crean solo las faltantes
- El monto inicial siempre es `0` — el equipo lo completa al ingresar la factura

---

## 6. Flujo Completo del Módulo

```
ADMIN (gerente)
  │
  ├─► Módulo "Consumos Recurrentes"
  │     ├── Crear plantillas (edificio, categoría, proveedor, monto estimado)
  │     ├── Activar/Desactivar plantillas según temporada
  │     └── Editar o eliminar plantillas existentes
  │
  └─► Módulo "Egresos" (cada mes)
        ├── Seleccionar edificio + mes/año
        ├── Click "Generar Recurrentes" ──► POST /api/expenses/generate-from-templates
        │     └── Crea egresos con:
        │           - sourceType = "recurrent"
        │           - paymentStatus = "pending"
        │           - amount = 0
        │           - recurringTemplateId = [id plantilla]
        │
        └── El equipo gestiona cada egreso generado:
              ├── Completar monto real al recibir la boleta/factura
              ├── Marcar como "Pagado" con fecha y método de pago
              ├── Aplazar al mes siguiente si corresponde
              └── Exportar a Edipro / Comunidad Feliz / Kastor
```

---

## 7. Seguimiento de Egresos Recurrentes

Para identificar qué egresos del mes vinieron de plantillas, se puede filtrar por `sourceType = "recurrent"` o `recurringTemplateId IS NOT NULL` en la tabla `expenses`.

### Campos clave en `expenses` para seguimiento:

| Campo | Descripción |
|---|---|
| `recurring_template_id` | ID de la plantilla que lo generó (NULL si es manual) |
| `source_type` | `"recurrent"` si viene de plantilla, `"ticket"` si viene de ticket, `"manual"` si es manual |
| `payment_status` | `pending` → `paid` |
| `inclusion_status` | `included`, `postponed` (postergado al mes sig.), `deferred` |
| `charge_month` / `charge_year` | Mes y año al que pertenece el egreso |
| `payment_date` | Fecha en que se pagó efectivamente |
| `amount` | Monto real (se completa al recibir la factura) |

### Query SQL de seguimiento:
```sql
-- Ver todos los egresos recurrentes de un período
SELECT
  e.description,
  e.category,
  e.vendor_name,
  e.amount,
  e.payment_status,
  e.inclusion_status,
  e.payment_date,
  r.description AS plantilla_descripcion
FROM expenses e
JOIN recurring_expense_templates r ON e.recurring_template_id = r.id
WHERE e.building_id = 'uuid-edificio'
  AND e.charge_month = 3
  AND e.charge_year = 2026
ORDER BY e.category;

-- Ver qué plantillas NO generaron egreso en un período (pendientes de generar)
SELECT r.*
FROM recurring_expense_templates r
WHERE r.building_id = 'uuid-edificio'
  AND r.is_active = true
  AND r.id NOT IN (
    SELECT e.recurring_template_id
    FROM expenses e
    WHERE e.building_id = 'uuid-edificio'
      AND e.charge_month = 3
      AND e.charge_year = 2026
      AND e.recurring_template_id IS NOT NULL
  );
```

---

## 8. Permisos de Acceso

| Acción | Roles permitidos |
|---|---|
| Ver plantillas | Todos los roles con acceso financiero |
| Crear / Editar / Eliminar plantillas | Solo Gerentes (General, Operaciones, Comercial, Finanzas) |
| Generar egresos del mes | Solo Gerentes |
| Ver egresos generados | Todos los roles con acceso financiero + Conserjería |

---

## 9. Interfaz de Usuario

**Módulo "Consumos Recurrentes"** (`/consumos-recurrentes`):
- Vista de tabla con todas las plantillas: edificio, categoría, descripción, proveedor, estado (Activo/Inactivo)
- Botón toggle para activar/desactivar cada plantilla
- Formulario de creación/edición via modal
- Estadísticas: total de plantillas y cuántas están activas

**Módulo "Egresos"** (`/egresos`):
- Botón **"Generar Recurrentes"** visible al seleccionar un edificio específico
- Una vez generados, los egresos aparecen en la lista con estado Pendiente
- El equipo los completa (monto, fecha de pago) y marca como pagados

---

*Documento generado desde el código fuente de BUMA OPS — Marzo 2026*
