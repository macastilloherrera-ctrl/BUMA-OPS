# BUMA OPS - Plataforma de Operaciones

## Overview
BUMA OPS is an internal operations platform designed to streamline and manage field visits, operational tickets, incidents, and critical equipment within administered buildings. It aims to enhance efficiency, provide comprehensive oversight, and improve financial management for BUMA's operations. Key capabilities include task management for field executives, comprehensive dashboards for managers, robust user and project administration, and a sophisticated financial module for income, expense, and recurring cost management. The platform's vision is to become the central nervous system for BUMA's property management operations, enabling data-driven decision-making and optimizing resource allocation.

## User Preferences
The user prefers clear and concise information. The agent should prioritize high-level summaries and avoid overly technical jargon unless specifically requested. The user values a structured approach to development, focusing on distinct modules and functionalities. For any significant architectural or design changes, the agent should ask for confirmation before proceeding.

## System Architecture
The platform utilizes a modern web stack. The frontend is built with React, TypeScript, Tailwind CSS, and Shadcn UI, emphasizing a component-based design with a clean, responsive user interface. UI/UX decisions prioritize intuitive navigation and clear presentation of data, with managers' dashboards being desktop-first and executive tools optimized for mobile.

The backend is developed with Express and Node.js, providing a robust API layer for data interaction. A PostgreSQL database (Neon) is used for data persistence, managed through Drizzle ORM for type-safe database interactions.

Authentication is handled via a traditional email/password system, secured with bcrypt for password hashing, and is exclusive to `@buma.cl` email addresses. User roles (Super Admin, General Manager, Operations Manager, Commercial Manager, Finance Manager, Operations Executive, Concierge) define access levels and feature availability, ensuring a granular permission model. Concierge users can log in via a simplified username and PIN system.

Key architectural patterns include:
- **Modular Design**: The system is divided into distinct modules (e.g., Authentication, User Management, Field Operations, Project Management, Financials), each with its own set of APIs and data structures.
- **Role-Based Access Control (RBAC)**: All API endpoints and UI features are secured based on the user's assigned role, with dynamic permission management configurable via an admin interface.
- **Data Validation**: Extensive backend validation is implemented for all data inputs, including duplicate document detection for financial entries and consistency checks for split transactions.
- **Semaforo System**: Visual indicators (green, yellow, red) are used across various modules to quickly convey status and urgency.
- **Mobile-First for Executives, Desktop-First for Managers**: UI/UX design adapts to the primary use case of each user role.
- **Automated Expense Management**: Features include expense deferral, recurring expense generation based on templates, and automatic expense creation from project payment milestones.
- **Financial Export Management**: Includes mechanisms for preventing duplicate exports of bank transactions and incomes to external administration software.
- **Unit-level Payment Verification**: A tool for operations executives to verify common expense payments per unit, including anomaly detection and detailed payment history.
- **AI-powered Chat Assistant**: An integrated chat assistant (Asistente OPS) provides legal and operational guidance based on a knowledge base, including Chilean copropiedad law and system context.
- **Chat IA Monitoring**: Super Admin and Gerente General can monitor all users' AI chat conversations via `/monitoreo-chat`, with filtering by user, message viewing, and conversation deletion. Module key: `monitoreo_chat_ia`.

## External Dependencies
- **PostgreSQL (Neon)**: Primary database for all application data.
- **Replit Object Storage**: Used for storing image uploads.
- **Edipro**: Integration for exporting financial data.
- **Comunidad Feliz**: Integration for exporting financial data.
- **Kastor**: Integration for exporting financial data.
- **Google Gemini API**: Powers the Chat IA (Asistente OPS) feature.