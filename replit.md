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

## External Dependencies
- **PostgreSQL (Neon)**: Primary database for all application data.
- **Replit Object Storage**: Used for storing image uploads, particularly from field visits.
- **Edipro**: Integration for exporting financial data (incomes, expenses) in a specific format.
- **Comunidad Feliz**: Integration for exporting financial data in a specific format.
- **Kastor**: Integration for exporting financial data in a specific format.