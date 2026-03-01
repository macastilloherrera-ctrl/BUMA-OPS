# BUMA OPS - Plataforma de Operaciones

## Overview
BUMA OPS is an internal operations platform designed to streamline and manage field visits, operational tickets, incidents, and critical equipment within administered buildings. The platform aims to enhance efficiency, provide comprehensive oversight, and improve financial management for BUMA's operations. Its core capabilities include task management for field executives, comprehensive dashboards for managers, robust user and project administration, and a sophisticated financial module for income, expense, and recurring cost management. The long-term vision is to become the central nervous system for BUMA's property management operations, enabling data-driven decision-making and optimizing resource allocation.

## User Preferences
The user prefers clear and concise information. The agent should prioritize high-level summaries and avoid overly technical jargon unless specifically requested. The user values a structured approach to development, focusing on distinct modules and functionalities. For any significant architectural or design changes, the agent should ask for confirmation before proceeding.

## System Architecture
The platform utilizes a modern web stack. The frontend is built with **React, TypeScript, Tailwind CSS, and Shadcn UI**, emphasizing a component-based design with a clean, responsive user interface. UI/UX decisions prioritize intuitive navigation and clear presentation of data, with managers' dashboards being desktop-first and executive tools optimized for mobile.

The backend is developed with **Express and Node.js**, providing a robust API layer for data interaction. A **PostgreSQL database (Neon)** is used for data persistence, managed through **Drizzle ORM** for type-safe database interactions.

Authentication is handled via a traditional email/password system, secured with **bcrypt** for password hashing, and is exclusive to `@buma.cl` email addresses. User roles (Super Admin, General Manager, Operations Manager, Commercial Manager, Finance Manager, Operations Executive, Concierge) define access levels and feature availability, ensuring a granular permission model.

Key architectural patterns include:
- **Modular Design**: The system is divided into distinct modules (Authentication, User Management, Field Operations, Project Management, Financials, Bank Reconciliation, Monthly Closing, Operational Inquiry, Concierge, Reporting), each with its own set of APIs and data structures.
- **Role-Based Access Control (RBAC)**: All API endpoints and UI features are secured based on the user's assigned role.
- **Data Validation**: Extensive backend validation is implemented for all data inputs, including duplicate document detection for financial entries and consistency checks for split transactions.
- **Semaforo System**: Visual indicators (green, yellow, red) are used across various modules (Projects, Monthly Closing) to quickly convey status and urgency.
- **Mobile-First for Executives, Desktop-First for Managers**: UI/UX design adapts to the primary use case of each user role.

## Recent Changes
- **Feb 2026 - Expense Deferral (Aplazamiento)**: Added ability to defer expenses to the next month:
  - "Aplazar" action button on each expense row in Egresos page (ArrowRightLeft icon)
  - Dialog requires a reason before confirming deferral
  - Backend auto-moves expense to next month (increments chargeMonth/chargeYear, handles Dec→Jan rollover)
  - Preserves original month in deferredFromMonth/deferredFromYear fields for traceability
  - Orange "Aplazado" badge on deferred expenses with tooltip showing origin month and reason
  - Alert banner at top of Egresos when deferred expenses from previous months exist, showing count and total
  - Re-deferral preserves original origin month (doesn't overwrite deferredFromMonth/Year)
  - Server-side validation requires postponementReason

- **Feb 2026 - Conserjería Username Simplification**: Shortened concierge usernames:
  - Helper function `generateConserjeriaUsername()` strips common prefixes ("Condominio Edificio", "Comunidad Edificio", etc.)
  - Format: `conserjeria_{short_name}` (e.g., `conserjeria_ottawa`, `conserjeria_kandinsky`)
  - All 9 production buildings created with simplified usernames


- **Feb 2026 - Bank Reconciliation Multi-Bank Parsers**: Enhanced the bank reconciliation import system with:
  - Bank-specific parsers for BCI, Banco de Chile, Santander, and Scotiabank (server/bankParsers.ts)
  - Auto-detection of bank format by scanning file metadata rows for signature strings
  - Generic fallback parser that auto-detects header rows and column mapping for unknown bank formats
  - New schema fields: payerName (varchar 255) and sourceBank (varchar 100) on bank_transactions table
  - Name-based matching in reconciliation engine (matches payerName against payer directory patterns)
  - UI shows Pagador, RUT, Detalle, Banco columns in transaction table; displays detected bank after upload
  - Each bank parser handles its specific format: metadata row skipping, amount normalization ($, thousands separators), date parsing (DD/MM/YYYY, DD-MM-YYYY HH:mm), and Santander-specific payer name extraction from description field

- **Feb 2026 - Project Expense Management**: Added comprehensive project expense management with:
  - Payment milestones on projects (isPaymentMilestone flag, payment amounts, invoice data fields)
  - Multi-vendor support via project_vendors junction table (contratista/ito/otro roles)
  - Vendor directory with search and auto-create functionality
  - Auto-expense generation: When a payment milestone is completed with invoice data (invoiceStatus=submitted), an expense is automatically created with full traceability (Project > Milestone > Invoice > Expense)
  - "Pagos" tab in ProjectDetail with financial summary, payment milestone management, and invoice registration
  - "Proveedores" section in ProjectDetail with vendor management and autocomplete
  - Expenses table extended with sourceType='project', sourceProjectId, sourceProjectMilestoneId for traceability

- **Feb 2026 - Income Categories**: Added category classification to income records:
  - New `income_category` enum: gasto_comun, multa, arriendo, interes_mora, fondo_reserva, otro
  - Category selector in income creation form, edit form, and split deposit dialog
  - Category column displayed in incomes table with Badge component
  - Export formats updated: Edipro uses category in "Fondo" column; ComunidadFeliz, Kastor, and Generic formats include new "Categoría" column
  - Default category is "gasto_comun" (Gasto Común) for backward compatibility
  - Added payerRut and payerName fields to incomes table for future payer tracking

- **Feb 2026 - Conserjería Username Login**: Changed concierge user authentication from email to username-based:
  - Added `username` field (varchar 100, unique) to users table
  - When a building is created, auto-generates conserjeria user with username format: `conserjeria_{building_slug}_{short_id}` (accent-stripped, lowercased)
  - Auto-generates 4-digit numeric PIN as password (not requiring change on first login)
  - Login endpoint accepts either username or email via single identifier field
  - Frontend login form updated: single "Usuario o correo electrónico" input field
  - BuildingDetail shows username instead of email for conserjeria credentials
  - AdminUsers displays username fallback when email is null
  - Password reset for conserjeria generates new 4-digit PIN

- **Feb 2026 - Expense Consumption Period & Recurring Generation**: Enhanced expense management with:
  - Added consumption period fields to expenses: consumptionPeriodFrom, consumptionPeriodTo (date range of actual consumption)
  - Added chargeMonth/chargeYear fields to determine which month's gasto común an expense belongs to (independent of payment date)
  - Expense listing and export now filter by chargeMonth/chargeYear when set, falling back to paymentDate for legacy expenses
  - "Generar Recurrentes" button in Egresos page: materializes active recurring expense templates into actual expense records for the selected building+month
  - Duplicate protection prevents generating the same template twice for the same period
  - Egresos form includes "Período de consumo y mes de cargo" section with consumption dates and charge month/year selectors

- **Feb 2026 - Export Duplicate Prevention**: Added tracking system to prevent duplicate exports to administration software:
  - Added `exportedAt` timestamp to both `bank_transactions` and `incomes` tables
  - Export endpoints (bank-transactions/export, incomes/export) now support `onlyNew=true` parameter to export only unexported records
  - After export, all included records are automatically marked with `exportedAt` timestamp
  - ConciliacionBancaria export step shows "Solo nuevos" / "Todos" toggle with counts of new vs already-exported transactions
  - Ingresos page has "Solo nuevos" / "Todos" toggle button for export mode
  - Both pages show "Exp." badge next to status for already-exported records
  - Export stats endpoint: GET /api/bank-transactions/export-stats returns new/exported/total counts
  - Workflow: conciliar diario/semanal → exportar solo nuevos → subir al SW sin duplicar

- **Mar 2026 - Verificación GGCC**: Added unit-level common expense verification tool for operations executives:
  - New page `/verificacion-ggcc` accessible to executives, managers, and finance roles
  - Select building + month/year to see all units and their payment status
  - Status per unit: Pagado (green), No pagado (red), Pago múltiple (orange), Sin historial (gray)
  - Anomaly detection: duplicate payments, unusual amounts (>2 std dev from mean), potential debtors (paid last month but not this)
  - Summary cards: total units, paid count, unpaid count, alerts, total collected
  - Warning banner when there are pending unidentified transactions for the period
  - Click any row to expand and see detailed payment info (date, payer, RUT, amount, bank, description)
  - Create ticket directly from flagged units for escalation to commercial area
  - Statistics footer: average payment, total collected, payment rate %, pending transactions
  - Sidebar: appears under "Pagos" for executives, under "Finanzas" for managers/finance
  - API endpoint: GET /api/verificacion-ggcc?buildingId=X&month=M&year=Y
  - Data source: identified bank_transactions (same as Historial de Pagos)

- **Mar 2026 - Gestión de Permisos (Dynamic Permission Management)**: Added configurable role-module permission system:
  - New page `/gestion-permisos` accessible to super_admin and gerente_general
  - Matrix UI: rows = 30 modules grouped by category, columns = editable roles (excludes super_admin)
  - Toggle switches per module/role to enable/disable access
  - General config per role: home route selector and building scope (all/assigned)
  - DB table `role_permissions_config` stores JSON modules, homeRoute, buildingScope per role
  - API: GET /api/role-permissions (all), GET /api/role-permissions/my (current user), PUT /api/role-permissions/:role
  - POST /api/role-permissions/seed initializes defaults from shared/modulePermissions.ts
  - Zod validation on PUT: validates role against ALL_ROLES, modules against MODULE_KEYS, buildingScope values
  - Insert schema + types defined (insertRolePermissionsConfigSchema, InsertRolePermissionsConfig)
  - Save/Discard/Reset-to-defaults functionality with unsaved changes indicator
  - Audit logging for permission changes
  - Sidebar: under "Panel Super Admin" for super_admin, under "Administración" for gerente_general
  - Note: Currently a configuration UI; dynamic enforcement of permissions in routing/sidebar is a planned next step

## External Dependencies
- **PostgreSQL (Neon)**: Primary database for all application data.
- **Replit Object Storage**: Used for storing image uploads, particularly from field visits.
- **Edipro**: Integration for exporting financial data (incomes, expenses) in a specific format.
- **Comunidad Feliz**: Integration for exporting financial data in a specific format.
- **Kastor**: Integration for exporting financial data in a specific format.