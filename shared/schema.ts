import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { users } from "./models/auth";
export * from "./models/auth";

// Enums
export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "gerente_general",
  "gerente_operaciones",
  "gerente_comercial",
  "gerente_finanzas",
  "ejecutivo_operaciones",
  "conserjeria"
]);

export const buildingStatusEnum = pgEnum("building_status", [
  "activo",
  "inactivo",
  "en_revision"
]);

export const visitTypeEnum = pgEnum("visit_type", [
  "rutina",
  "urgente",
  "revision_proyecto"
]);

export const visitStatusEnum = pgEnum("visit_status", [
  "borrador",
  "programada",
  "atrasada",
  "en_curso",
  "realizada",
  "no_realizada",
  "cancelada"
]);

export type VisitStatus = "borrador" | "programada" | "atrasada" | "en_curso" | "realizada" | "no_realizada" | "cancelada";

export const visitCancellationTypeEnum = pgEnum("visit_cancellation_type", [
  "reagendada",
  "eliminada"
]);

export type VisitCancellationType = "reagendada" | "eliminada";

export const incidentStatusEnum = pgEnum("incident_status", [
  "pendiente",
  "en_reparacion",
  "reparada",
  "reprogramada"
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "rojo",
  "amarillo",
  "verde"
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "pendiente",
  "en_curso",
  "trabajo_completado",
  "vencido",
  "resuelto",
  "reprogramado"
]);

export const ticketResponsibleTypeEnum = pgEnum("ticket_responsible_type", [
  "ejecutivo",
  "proveedor",
  "conserjeria",
  "comite"
]);

export const checklistTypeEnum = pgEnum("checklist_type", [
  "rutina",
  "emergencia"
]);

export const assetStatusEnum = pgEnum("asset_status", [
  "pendiente",
  "aprobado",
  "rechazado"
]);

export const buildingScopeEnum = pgEnum("building_scope", [
  "assigned",
  "all"
]);

// Ticket type enum (3 types)
export const ticketTypeEnum = pgEnum("ticket_type", [
  "urgencia",
  "planificado",
  "mantencion"
]);

// Receiver type enum (who receives the maintainer)
export const receiverTypeEnum = pgEnum("receiver_type", [
  "ejecutivo",
  "gerente_operaciones",
  "personal_edificio"
]);

// Quote status enum
export const quoteStatusEnum = pgEnum("quote_status", [
  "pendiente",
  "aceptada",
  "rechazada"
]);

// Invoice status enum (tracks invoice state in work completion)
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "none",      // No invoice - requires explanation
  "pending",   // Invoice pending - will be provided later
  "submitted"  // Invoice submitted with data
]);

// Communication audience enum
export const communicationAudienceEnum = pgEnum("communication_audience", [
  "comunidad",
  "conserjeria",
  "comite"
]);

// Notification type enum
export const notificationTypeEnum = pgEnum("notification_type", [
  "ticket_asignado",
  "ticket_derivado",
  "ticket_actualizado",
  "visita_vencida"
]);

// User profiles table (extends auth users with role info)
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  role: userRoleEnum("role").notNull().default("ejecutivo_operaciones"),
  buildingScope: buildingScopeEnum("building_scope").notNull().default("assigned"),
  phone: varchar("phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Buildings table
export const buildings = pgTable("buildings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  region: varchar("region", { length: 100 }),
  commune: varchar("commune", { length: 100 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  communityEmail: varchar("community_email", { length: 255 }),
  status: buildingStatusEnum("status").notNull().default("activo"),
  assignedExecutiveId: varchar("assigned_executive_id"),
  regulationDocumentUrl: text("regulation_document_url"),
  departmentCount: integer("department_count").default(0),
  elevatorCount: integer("elevator_count").default(0),
  gateCount: integer("gate_count").default(0),
  extinguisherCount: integer("extinguisher_count").default(0),
  visitorParkingCount: integer("visitor_parking_count").default(0),
  // Insurance policy fields
  insurancePolicyUrl: text("insurance_policy_url"),
  insuranceExpiryDate: timestamp("insurance_expiry_date"),
  insurerName: varchar("insurer_name", { length: 255 }),
  // Additional documents
  emergencyPlanUrl: text("emergency_plan_url"),
  bumaContractUrl: text("buma_contract_url"),
  adminSoftwareContractUrl: text("admin_software_contract_url"),
  bumaAdminPowersUrl: text("buma_admin_powers_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Building Staff table
export const buildingStaff = pgTable("building_staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildingId: varchar("building_id").notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }).notNull(),
  birthDate: timestamp("birth_date"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  deactivatedAt: timestamp("deactivated_at"),
  deactivatedBy: varchar("deactivated_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Building Features table (custom characteristics)
export const buildingFeatures = pgTable("building_features", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildingId: varchar("building_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  value: varchar("value", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Building Folders table (for document organization)
export const buildingFolders = pgTable("building_folders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildingId: varchar("building_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Building Files table (files within folders)
export const buildingFiles = pgTable("building_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  folderId: varchar("folder_id").notNull(),
  buildingId: varchar("building_id").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  objectStorageKey: text("object_storage_key").notNull(),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: integer("file_size"),
  uploadedBy: varchar("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Maintainer Categories table
export const maintainerCategories = pgTable("maintainer_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Maintainers table (companies)
export const maintainers = pgTable("maintainers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  phone2: varchar("phone_2", { length: 50 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  responseTimeHours: integer("response_time_hours"),
  notes: text("notes"),
  isPreferred: boolean("is_preferred").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Maintainer-Category links (many-to-many)
export const maintainerCategoryLinks = pgTable("maintainer_category_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  maintainerId: varchar("maintainer_id").notNull(),
  categoryId: varchar("category_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Maintenance frequency enum
export const maintenanceFrequencyEnum = pgEnum("maintenance_frequency", [
  "mensual",
  "bimestral",
  "trimestral",
  "semestral",
  "anual",
]);

// Critical Assets table
export const criticalAssets = pgTable("critical_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildingId: varchar("building_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  description: text("description"),
  status: assetStatusEnum("status").notNull().default("pendiente"),
  suggestedBy: varchar("suggested_by"),
  approvedBy: varchar("approved_by"),
  maintenanceFrequency: maintenanceFrequencyEnum("maintenance_frequency"),
  lastMaintenanceDate: timestamp("last_maintenance_date"),
  nextMaintenanceDate: timestamp("next_maintenance_date"),
  maintainerName: varchar("maintainer_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Maintenance Records table - Historial de mantenciones realizadas
export const maintenanceRecords = pgTable("maintenance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull(),
  performedAt: timestamp("performed_at").notNull(),
  performedBy: varchar("performed_by"), // userId del ejecutivo que registra
  maintainerName: varchar("maintainer_name", { length: 255 }), // Nombre del mantenedor externo
  observations: text("observations"),
  cost: decimal("cost", { precision: 12, scale: 2 }),
  ticketId: varchar("ticket_id"), // Si fue generado por un ticket automático
  createdAt: timestamp("created_at").defaultNow(),
});

// Visits table
export const visits = pgTable("visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildingId: varchar("building_id").notNull(),
  executiveId: varchar("executive_id").notNull(),
  type: visitTypeEnum("type").notNull().default("rutina"),
  status: visitStatusEnum("status").notNull().default("borrador"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  urgentReason: text("urgent_reason"),
  checklistType: checklistTypeEnum("checklist_type"),
  completionObservations: text("completion_observations"),
  visitGroupId: varchar("visit_group_id"),
  originalScheduledDate: timestamp("original_scheduled_date"),
  cancellationType: visitCancellationTypeEnum("cancellation_type"),
  cancellationReason: text("cancellation_reason"),
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: varchar("cancelled_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Visit Checklist Items table
export const visitChecklistItems = pgTable("visit_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  notes: text("notes"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Visit Photos table
export const visitPhotos = pgTable("visit_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  objectStorageKey: text("object_storage_key").notNull(),
  description: text("description"),
  uploadedBy: varchar("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Incidents table
export const incidents = pgTable("incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  buildingId: varchar("building_id").notNull(),
  criticalAssetId: varchar("critical_asset_id"),
  otherAssetDescription: varchar("other_asset_description", { length: 255 }),
  reason: text("reason").notNull(),
  failureType: varchar("failure_type", { length: 100 }).notNull(),
  occurredAt: timestamp("occurred_at").notNull(),
  providerCalled: varchar("provider_called", { length: 255 }),
  repairDate: timestamp("repair_date"),
  communityActions: text("community_actions"),
  status: incidentStatusEnum("status").notNull().default("pendiente"),
  cost: decimal("cost", { precision: 12, scale: 2 }),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tickets table (updated with full workflow support)
export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildingId: varchar("building_id").notNull(),
  ticketType: ticketTypeEnum("ticket_type").notNull().default("urgencia"),
  categoryId: varchar("category_id"),
  otherCategoryDescription: text("other_category_description"),
  maintainerId: varchar("maintainer_id"),
  visitId: varchar("visit_id"),
  description: text("description").notNull(),
  priority: ticketPriorityEnum("priority").notNull().default("verde"),
  status: ticketStatusEnum("status").notNull().default("pendiente"),
  assignedExecutiveId: varchar("assigned_executive_id"),
  requiresMaintainerVisit: boolean("requires_maintainer_visit").default(false),
  requiresExecutiveVisit: boolean("requires_executive_visit").default(false),
  requiresInvoice: boolean("requires_invoice").default(false),
  isEscalated: boolean("is_escalated").default(false),
  escalatedAt: timestamp("escalated_at"),
  escalatedBy: varchar("escalated_by"),
  scheduledDate: timestamp("scheduled_date"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  receiverType: receiverTypeEnum("receiver_type"),
  receiverId: varchar("receiver_id"),
  approvedQuoteId: varchar("approved_quote_id"),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  workStartedAt: timestamp("work_started_at"),
  workCompletedAt: timestamp("work_completed_at"),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  invoiceAmount: decimal("invoice_amount", { precision: 12, scale: 2 }),
  invoiceDocumentKey: text("invoice_document_key"),
  invoiceStatus: invoiceStatusEnum("invoice_status"),
  invoiceNote: text("invoice_note"),
  invoiceProvidedById: varchar("invoice_provided_by_id"),
  closedAt: timestamp("closed_at"),
  closedBy: varchar("closed_by"),
  committedCompletionAt: timestamp("committed_completion_at"),
  currentCycleNumber: integer("current_cycle_number").default(1),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ticket Quotes table
export const ticketQuotes = pgTable("ticket_quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull(),
  maintainerId: varchar("maintainer_id"),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  description: text("description"),
  amountNet: decimal("amount_net", { precision: 12, scale: 2 }).notNull(),
  ivaRate: decimal("iva_rate", { precision: 5, scale: 2 }).default("19"),
  amountTotal: decimal("amount_total", { precision: 12, scale: 2 }),
  durationHours: integer("duration_hours"),
  durationDays: integer("duration_days"),
  attachmentKey: text("attachment_key"),
  status: quoteStatusEnum("status").notNull().default("pendiente"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Ticket Photos table
export const ticketPhotos = pgTable("ticket_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull(),
  photoType: varchar("photo_type", { length: 50 }).notNull(),
  objectStorageKey: text("object_storage_key").notNull(),
  description: text("description"),
  uploadedBy: varchar("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Ticket Work Cycles table (tracks work history including restarts)
export const ticketWorkCycles = pgTable("ticket_work_cycles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull(),
  cycleNumber: integer("cycle_number").notNull().default(1),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  closedAt: timestamp("closed_at"),
  closedBy: varchar("closed_by"),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  invoiceAmount: decimal("invoice_amount", { precision: 12, scale: 2 }),
  invoiceStatus: invoiceStatusEnum("invoice_status"),
  invoiceNote: text("invoice_note"),
  invoiceProvidedById: varchar("invoice_provided_by_id"),
  approvedQuoteId: varchar("approved_quote_id"),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  restartReason: text("restart_reason"),
  committedCompletionAt: timestamp("committed_completion_at"),
  restartedBy: varchar("restarted_by"),
  restartedAt: timestamp("restarted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Ticket Assignment History table (for escalation tracking)
export const ticketAssignmentHistory = pgTable("ticket_assignment_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull(),
  assignedToId: varchar("assigned_to_id").notNull(),
  assignedById: varchar("assigned_by_id").notNull(),
  assignedToRole: userRoleEnum("assigned_to_role").notNull(),
  previousAssigneeId: varchar("previous_assignee_id"),
  reason: text("reason"),
  isEscalation: boolean("is_escalation").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTicketAssignmentHistorySchema = createInsertSchema(ticketAssignmentHistory).omit({
  id: true,
  createdAt: true,
});
export type InsertTicketAssignmentHistory = z.infer<typeof insertTicketAssignmentHistorySchema>;
export type TicketAssignmentHistory = typeof ticketAssignmentHistory.$inferSelect;

// Ticket Communications table (Avisos internos)
export const ticketCommunications = pgTable("ticket_communications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull(),
  audience: communicationAudienceEnum("audience").notNull(),
  communityName: varchar("community_name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  problemDescription: text("problem_description").notNull(),
  actionPlan: text("action_plan").notNull(),
  message: text("message"),
  sentBy: varchar("sent_by").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  acknowledgedBy: varchar("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at"),
});

// Attachments table
export const attachments = pgTable("attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: integer("file_size"),
  uploadedBy: varchar("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  assignedBuildings: many(buildings),
  visits: many(visits),
  tickets: many(tickets),
}));

export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  assignedExecutive: one(userProfiles, {
    fields: [buildings.assignedExecutiveId],
    references: [userProfiles.userId],
  }),
  criticalAssets: many(criticalAssets),
  visits: many(visits),
  tickets: many(tickets),
  incidents: many(incidents),
  staff: many(buildingStaff),
  features: many(buildingFeatures),
  folders: many(buildingFolders),
  files: many(buildingFiles),
}));

export const buildingStaffRelations = relations(buildingStaff, ({ one }) => ({
  building: one(buildings, {
    fields: [buildingStaff.buildingId],
    references: [buildings.id],
  }),
}));

export const buildingFeaturesRelations = relations(buildingFeatures, ({ one }) => ({
  building: one(buildings, {
    fields: [buildingFeatures.buildingId],
    references: [buildings.id],
  }),
}));

export const buildingFoldersRelations = relations(buildingFolders, ({ one, many }) => ({
  building: one(buildings, {
    fields: [buildingFolders.buildingId],
    references: [buildings.id],
  }),
  files: many(buildingFiles),
}));

export const buildingFilesRelations = relations(buildingFiles, ({ one }) => ({
  folder: one(buildingFolders, {
    fields: [buildingFiles.folderId],
    references: [buildingFolders.id],
  }),
  building: one(buildings, {
    fields: [buildingFiles.buildingId],
    references: [buildings.id],
  }),
}));

export const criticalAssetsRelations = relations(criticalAssets, ({ one, many }) => ({
  building: one(buildings, {
    fields: [criticalAssets.buildingId],
    references: [buildings.id],
  }),
  maintenanceRecords: many(maintenanceRecords),
}));

export const maintenanceRecordsRelations = relations(maintenanceRecords, ({ one }) => ({
  asset: one(criticalAssets, {
    fields: [maintenanceRecords.assetId],
    references: [criticalAssets.id],
  }),
  performedByUser: one(users, {
    fields: [maintenanceRecords.performedBy],
    references: [users.id],
  }),
  ticket: one(tickets, {
    fields: [maintenanceRecords.ticketId],
    references: [tickets.id],
  }),
}));

export const maintainerCategoriesRelations = relations(maintainerCategories, ({ many }) => ({
  maintainerLinks: many(maintainerCategoryLinks),
}));

export const maintainersRelations = relations(maintainers, ({ many }) => ({
  categoryLinks: many(maintainerCategoryLinks),
  tickets: many(tickets),
  quotes: many(ticketQuotes),
}));

export const maintainerCategoryLinksRelations = relations(maintainerCategoryLinks, ({ one }) => ({
  maintainer: one(maintainers, {
    fields: [maintainerCategoryLinks.maintainerId],
    references: [maintainers.id],
  }),
  category: one(maintainerCategories, {
    fields: [maintainerCategoryLinks.categoryId],
    references: [maintainerCategories.id],
  }),
}));

export const visitsRelations = relations(visits, ({ one, many }) => ({
  building: one(buildings, {
    fields: [visits.buildingId],
    references: [buildings.id],
  }),
  executive: one(userProfiles, {
    fields: [visits.executiveId],
    references: [userProfiles.userId],
  }),
  checklistItems: many(visitChecklistItems),
  photos: many(visitPhotos),
  incidents: many(incidents),
  tickets: many(tickets),
}));

export const visitChecklistItemsRelations = relations(visitChecklistItems, ({ one }) => ({
  visit: one(visits, {
    fields: [visitChecklistItems.visitId],
    references: [visits.id],
  }),
}));

export const visitPhotosRelations = relations(visitPhotos, ({ one }) => ({
  visit: one(visits, {
    fields: [visitPhotos.visitId],
    references: [visits.id],
  }),
}));

export const incidentsRelations = relations(incidents, ({ one }) => ({
  visit: one(visits, {
    fields: [incidents.visitId],
    references: [visits.id],
  }),
  building: one(buildings, {
    fields: [incidents.buildingId],
    references: [buildings.id],
  }),
  criticalAsset: one(criticalAssets, {
    fields: [incidents.criticalAssetId],
    references: [criticalAssets.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  building: one(buildings, {
    fields: [tickets.buildingId],
    references: [buildings.id],
  }),
  visit: one(visits, {
    fields: [tickets.visitId],
    references: [visits.id],
  }),
  assignedExecutive: one(userProfiles, {
    fields: [tickets.assignedExecutiveId],
    references: [userProfiles.userId],
  }),
  category: one(maintainerCategories, {
    fields: [tickets.categoryId],
    references: [maintainerCategories.id],
  }),
  maintainer: one(maintainers, {
    fields: [tickets.maintainerId],
    references: [maintainers.id],
  }),
  quotes: many(ticketQuotes),
  photos: many(ticketPhotos),
  communications: many(ticketCommunications),
}));

export const ticketQuotesRelations = relations(ticketQuotes, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketQuotes.ticketId],
    references: [tickets.id],
  }),
  maintainer: one(maintainers, {
    fields: [ticketQuotes.maintainerId],
    references: [maintainers.id],
  }),
}));

export const ticketPhotosRelations = relations(ticketPhotos, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketPhotos.ticketId],
    references: [tickets.id],
  }),
}));

export const ticketCommunicationsRelations = relations(ticketCommunications, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketCommunications.ticketId],
    references: [tickets.id],
  }),
}));

export const attachmentsRelations = relations(attachments, ({ }) => ({}));

// Insert schemas
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBuildingSchema = createInsertSchema(buildings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBuildingStaffSchema = createInsertSchema(buildingStaff).omit({
  id: true,
  createdAt: true,
});

export const insertBuildingFeatureSchema = createInsertSchema(buildingFeatures).omit({
  id: true,
  createdAt: true,
});

export const insertBuildingFolderSchema = createInsertSchema(buildingFolders).omit({
  id: true,
  createdAt: true,
});

export const insertBuildingFileSchema = createInsertSchema(buildingFiles).omit({
  id: true,
  createdAt: true,
});

export const insertCriticalAssetSchema = createInsertSchema(criticalAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaintenanceRecordSchema = createInsertSchema(maintenanceRecords).omit({
  id: true,
  createdAt: true,
});

export const insertMaintainerCategorySchema = createInsertSchema(maintainerCategories).omit({
  id: true,
  createdAt: true,
});

export const insertMaintainerSchema = createInsertSchema(maintainers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaintainerCategoryLinkSchema = createInsertSchema(maintainerCategoryLinks).omit({
  id: true,
  createdAt: true,
});

export const insertVisitSchema = createInsertSchema(visits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVisitChecklistItemSchema = createInsertSchema(visitChecklistItems).omit({
  id: true,
  createdAt: true,
});

export const insertVisitPhotoSchema = createInsertSchema(visitPhotos).omit({
  id: true,
  createdAt: true,
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAttachmentSchema = createInsertSchema(attachments).omit({
  id: true,
  createdAt: true,
});

export const insertTicketQuoteSchema = createInsertSchema(ticketQuotes).omit({
  id: true,
  createdAt: true,
});

export const insertTicketPhotoSchema = createInsertSchema(ticketPhotos).omit({
  id: true,
  createdAt: true,
});

export const insertTicketWorkCycleSchema = createInsertSchema(ticketWorkCycles).omit({
  id: true,
  createdAt: true,
});

export const insertTicketCommunicationSchema = createInsertSchema(ticketCommunications).omit({
  id: true,
  sentAt: true,
  acknowledgedBy: true,
  acknowledgedAt: true,
});

// Employment status enum
export const employmentStatusEnum = pgEnum("employment_status", [
  "activo",
  "inactivo",
  "licencia",
  "vacaciones"
]);

// Document type enum for executives
export const executiveDocTypeEnum = pgEnum("executive_doc_type", [
  "cv",
  "certificado_estudios",
  "contrato",
  "cedula_identidad",
  "certificado_afp",
  "certificado_salud",
  "otro"
]);

// Executives table (detailed personnel records)
export const executives = pgTable("executives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Link to userProfiles if they have system access
  userProfileId: varchar("user_profile_id"),
  // Personal information
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  rut: varchar("rut", { length: 20 }),
  birthDate: timestamp("birth_date"),
  nationality: varchar("nationality", { length: 100 }),
  address: text("address"),
  commune: varchar("commune", { length: 100 }),
  city: varchar("city", { length: 100 }),
  // Contact information
  bumaEmail: varchar("buma_email", { length: 255 }),
  personalEmail: varchar("personal_email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 50 }),
  // Employment information
  position: varchar("position", { length: 100 }).notNull().default("Ejecutivo de Operaciones"),
  hireDate: timestamp("hire_date"),
  terminationDate: timestamp("termination_date"),
  employmentStatus: employmentStatusEnum("employment_status").notNull().default("activo"),
  // Photo
  photoKey: varchar("photo_key", { length: 500 }),
  // Custom fields (JSON for extensibility)
  customFields: text("custom_fields"),
  // Notes
  notes: text("notes"),
  // Audit
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Executive building assignments (many-to-many)
export const executiveAssignments = pgTable("executive_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  executiveId: varchar("executive_id").notNull(),
  buildingId: varchar("building_id").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: varchar("assigned_by"),
});

// Executive documents (CV, certificates, etc.)
export const executiveDocuments = pgTable("executive_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  executiveId: varchar("executive_id").notNull(),
  documentType: executiveDocTypeEnum("document_type").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  fileKey: varchar("file_key", { length: 500 }).notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  uploadedBy: varchar("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  ticketId: varchar("ticket_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for executives
export const executivesRelations = relations(executives, ({ many, one }) => ({
  assignments: many(executiveAssignments),
  documents: many(executiveDocuments),
  userProfile: one(userProfiles, {
    fields: [executives.userProfileId],
    references: [userProfiles.id],
  }),
}));

export const executiveAssignmentsRelations = relations(executiveAssignments, ({ one }) => ({
  executive: one(executives, {
    fields: [executiveAssignments.executiveId],
    references: [executives.id],
  }),
  building: one(buildings, {
    fields: [executiveAssignments.buildingId],
    references: [buildings.id],
  }),
}));

export const executiveDocumentsRelations = relations(executiveDocuments, ({ one }) => ({
  executive: one(executives, {
    fields: [executiveDocuments.executiveId],
    references: [executives.id],
  }),
}));

// Insert schemas for executives
export const insertExecutiveSchema = createInsertSchema(executives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExecutiveAssignmentSchema = createInsertSchema(executiveAssignments).omit({
  id: true,
  assignedAt: true,
});

export const insertExecutiveDocumentSchema = createInsertSchema(executiveDocuments).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

export type InsertBuilding = z.infer<typeof insertBuildingSchema>;
export type Building = typeof buildings.$inferSelect;

export type InsertBuildingStaff = z.infer<typeof insertBuildingStaffSchema>;
export type BuildingStaff = typeof buildingStaff.$inferSelect;

export type InsertBuildingFeature = z.infer<typeof insertBuildingFeatureSchema>;
export type BuildingFeature = typeof buildingFeatures.$inferSelect;

export type InsertBuildingFolder = z.infer<typeof insertBuildingFolderSchema>;
export type BuildingFolder = typeof buildingFolders.$inferSelect;

export type InsertBuildingFile = z.infer<typeof insertBuildingFileSchema>;
export type BuildingFile = typeof buildingFiles.$inferSelect;

export type InsertCriticalAsset = z.infer<typeof insertCriticalAssetSchema>;
export type CriticalAsset = typeof criticalAssets.$inferSelect;

export type InsertMaintenanceRecord = z.infer<typeof insertMaintenanceRecordSchema>;
export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;

export type InsertMaintainerCategory = z.infer<typeof insertMaintainerCategorySchema>;
export type MaintainerCategory = typeof maintainerCategories.$inferSelect;

export type InsertMaintainer = z.infer<typeof insertMaintainerSchema>;
export type Maintainer = typeof maintainers.$inferSelect;

export type InsertMaintainerCategoryLink = z.infer<typeof insertMaintainerCategoryLinkSchema>;
export type MaintainerCategoryLink = typeof maintainerCategoryLinks.$inferSelect;

export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visits.$inferSelect;

export type InsertVisitChecklistItem = z.infer<typeof insertVisitChecklistItemSchema>;
export type VisitChecklistItem = typeof visitChecklistItems.$inferSelect;

export type InsertVisitPhoto = z.infer<typeof insertVisitPhotoSchema>;
export type VisitPhoto = typeof visitPhotos.$inferSelect;

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type Attachment = typeof attachments.$inferSelect;

export type InsertTicketQuote = z.infer<typeof insertTicketQuoteSchema>;
export type TicketQuote = typeof ticketQuotes.$inferSelect;

export type InsertTicketPhoto = z.infer<typeof insertTicketPhotoSchema>;
export type TicketPhoto = typeof ticketPhotos.$inferSelect;

export type InsertTicketWorkCycle = z.infer<typeof insertTicketWorkCycleSchema>;
export type TicketWorkCycle = typeof ticketWorkCycles.$inferSelect;

export type InsertTicketCommunication = z.infer<typeof insertTicketCommunicationSchema>;
export type TicketCommunication = typeof ticketCommunications.$inferSelect;

export type InsertExecutive = z.infer<typeof insertExecutiveSchema>;
export type Executive = typeof executives.$inferSelect;

export type InsertExecutiveAssignment = z.infer<typeof insertExecutiveAssignmentSchema>;
export type ExecutiveAssignment = typeof executiveAssignments.$inferSelect;

export type InsertExecutiveDocument = z.infer<typeof insertExecutiveDocumentSchema>;
export type ExecutiveDocument = typeof executiveDocuments.$inferSelect;

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// System Configuration table
export const systemConfig = pgTable("system_config", {
  id: text("id").primaryKey().default("default"),
  companyName: text("company_name").default("BUMA OPS"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#2563eb"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: text("updated_by"),
});

export const insertSystemConfigSchema = createInsertSchema(systemConfig).omit({ id: true, updatedAt: true });
export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;
export type SystemConfig = typeof systemConfig.$inferSelect;

// Helper types for frontend
export type UserRole = "super_admin" | "gerente_general" | "gerente_operaciones" | "gerente_comercial" | "gerente_finanzas" | "ejecutivo_operaciones" | "conserjeria";
export type VisitType = "rutina" | "urgente";
export type TicketPriority = "rojo" | "amarillo" | "verde";
export type TicketStatus = "pendiente" | "en_curso" | "trabajo_completado" | "vencido" | "resuelto" | "reprogramado";
export type TicketType = "urgencia" | "planificado" | "mantencion";
export type ReceiverType = "ejecutivo" | "gerente_operaciones" | "personal_edificio";
export type QuoteStatus = "pendiente" | "aceptada" | "rechazada";
export type CommunicationAudience = "comunidad" | "conserjeria" | "comite";
export type IncidentStatus = "pendiente" | "en_reparacion" | "reparada" | "reprogramada";
export type ChecklistType = "rutina" | "emergencia";
export type EmploymentStatus = "activo" | "inactivo" | "licencia" | "vacaciones";
export type ExecutiveDocType = "cv" | "certificado_estudios" | "contrato" | "cedula_identidad" | "certificado_afp" | "certificado_salud" | "otro";
export type NotificationType = "ticket_asignado" | "ticket_derivado" | "ticket_actualizado";

// ============================================
// MÓDULO FINANCIERO - INGRESOS Y EGRESOS
// ============================================

export const incomeStatusEnum = pgEnum("income_status", [
  "pending",
  "identified",
  "rejected"
]);

export const expenseSourceTypeEnum = pgEnum("expense_source_type", [
  "ticket",
  "recurrent"
]);

export const expensePaymentStatusEnum = pgEnum("expense_payment_status", [
  "pending",
  "paid",
  "cancelled"
]);

export const expenseInclusionStatusEnum = pgEnum("expense_inclusion_status", [
  "included",
  "postponed"
]);

export const expensePaymentMethodEnum = pgEnum("expense_payment_method", [
  "transferencia",
  "pac",
  "pago_electronico",
  "cheque"
]);

export const recurringExpenseFrequencyEnum = pgEnum("recurring_expense_frequency", [
  "monthly"
]);

export const incomes = pgTable("incomes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildingId: varchar("building_id").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  department: varchar("department", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }).default("abono"),
  paymentDate: timestamp("payment_date").notNull(),
  bank: varchar("bank", { length: 255 }),
  bankOperationId: varchar("bank_operation_id", { length: 255 }),
  status: incomeStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildingId: varchar("building_id").notNull(),
  sourceType: expenseSourceTypeEnum("source_type").notNull().default("ticket"),
  sourceTicketId: varchar("source_ticket_id"),
  recurringTemplateId: varchar("recurring_template_id"),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  category: varchar("category", { length: 255 }),
  vendorName: varchar("vendor_name", { length: 255 }),
  vendorId: varchar("vendor_id"),
  documentNumber: varchar("document_number", { length: 255 }),
  documentKey: text("document_key"),
  paymentDate: timestamp("payment_date"),
  paymentMethod: expensePaymentMethodEnum("payment_method").default("transferencia"),
  paymentStatus: expensePaymentStatusEnum("payment_status").notNull().default("pending"),
  inclusionStatus: expenseInclusionStatusEnum("inclusion_status").notNull().default("included"),
  operationallyValidated: boolean("operationally_validated").default(false),
  operationallyValidatedBy: varchar("operationally_validated_by"),
  operationallyValidatedAt: timestamp("operationally_validated_at"),
  financiallyValidated: boolean("financially_validated").default(false),
  financiallyValidatedBy: varchar("financially_validated_by"),
  financiallyValidatedAt: timestamp("financially_validated_at"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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

export const incomesRelations = relations(incomes, ({ one }) => ({
  building: one(buildings, {
    fields: [incomes.buildingId],
    references: [buildings.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  building: one(buildings, {
    fields: [expenses.buildingId],
    references: [buildings.id],
  }),
  ticket: one(tickets, {
    fields: [expenses.sourceTicketId],
    references: [tickets.id],
  }),
  template: one(recurringExpenseTemplates, {
    fields: [expenses.recurringTemplateId],
    references: [recurringExpenseTemplates.id],
  }),
}));

export const recurringExpenseTemplatesRelations = relations(recurringExpenseTemplates, ({ one, many }) => ({
  building: one(buildings, {
    fields: [recurringExpenseTemplates.buildingId],
    references: [buildings.id],
  }),
  expenses: many(expenses),
}));

export const insertIncomeSchema = createInsertSchema(incomes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIncome = z.infer<typeof insertIncomeSchema>;
export type Income = typeof incomes.$inferSelect;

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export const insertRecurringExpenseTemplateSchema = createInsertSchema(recurringExpenseTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRecurringExpenseTemplate = z.infer<typeof insertRecurringExpenseTemplateSchema>;
export type RecurringExpenseTemplate = typeof recurringExpenseTemplates.$inferSelect;

export type IncomeStatus = "pending" | "identified" | "rejected";
export type ExpenseSourceType = "ticket" | "recurrent";
export type ExpensePaymentStatus = "pending" | "paid" | "cancelled";
export type ExpenseInclusionStatus = "included" | "postponed";
export type ExpensePaymentMethod = "transferencia" | "pac" | "pago_electronico" | "cheque";

// ============================================
// MÓDULO DE PROYECTOS
// ============================================

// Project Enums
export const projectStatusEnum = pgEnum("project_status", [
  "planificado",
  "en_ejecucion",
  "pausado",
  "completado",
  "cancelado"
]);

export const projectAwardTypeEnum = pgEnum("project_award_type", [
  "asignacion_directa",
  "licitacion"
]);

export const milestoneStatusEnum = pgEnum("milestone_status", [
  "pendiente",
  "en_curso",
  "completado",
  "retrasado"
]);

export const projectDocumentTypeEnum = pgEnum("project_document_type", [
  "cotizacion",
  "adjudicacion",
  "contrato",
  "comunicado",
  "fiscalizacion",
  "acta",
  "cierre",
  "otro"
]);

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  buildingId: varchar("building_id").notNull(),
  status: projectStatusEnum("status").notNull().default("planificado"),
  
  // Fechas
  startDate: timestamp("start_date").notNull(),
  plannedEndDate: timestamp("planned_end_date").notNull(),
  actualEndDate: timestamp("actual_end_date"),
  
  // Presupuesto
  approvedBudget: decimal("approved_budget", { precision: 12, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 12, scale: 2 }),
  
  // Empresa contratista
  contractorName: varchar("contractor_name", { length: 255 }),
  contractorContact: varchar("contractor_contact", { length: 255 }),
  contractorPhone: varchar("contractor_phone", { length: 50 }),
  contractorEmail: varchar("contractor_email", { length: 255 }),
  
  // Adjudicación
  awardType: projectAwardTypeEnum("award_type"),
  awardJustification: text("award_justification"),
  quotesReceived: integer("quotes_received").default(0),
  
  // Responsables
  createdBy: varchar("created_by").notNull(),
  assignedExecutiveId: varchar("assigned_executive_id"),
  
  // Auditoría
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Milestones table (Hitos)
export const projectMilestones = pgTable("project_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  status: milestoneStatusEnum("status").notNull().default("pendiente"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by"),
  observations: text("observations"),
  linkedVisitId: varchar("linked_visit_id"),
  isReview: boolean("is_review").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project Documents table
export const projectDocuments = pgTable("project_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  documentType: projectDocumentTypeEnum("document_type").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  uploadedBy: varchar("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project Updates table (Fiscalizaciones y actualizaciones de avance)
export const projectUpdates = pgTable("project_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  updateType: varchar("update_type", { length: 50 }).notNull(), // fiscalizacion, cambio_solicitado, nota, reunion
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  photoUrls: text("photo_urls").array(),
  requiresCommitteeApproval: boolean("requires_committee_approval").default(false),
  committeeApproved: boolean("committee_approved"),
  committeeApprovedAt: timestamp("committee_approved_at"),
  committeeApprovedBy: varchar("committee_approved_by"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project Schemas
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectMilestoneSchema = createInsertSchema(projectMilestones).omit({ id: true, createdAt: true });
export const insertProjectDocumentSchema = createInsertSchema(projectDocuments).omit({ id: true, createdAt: true });
export const insertProjectUpdateSchema = createInsertSchema(projectUpdates).omit({ id: true, createdAt: true });

// Project Types
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertProjectMilestone = z.infer<typeof insertProjectMilestoneSchema>;
export type ProjectMilestone = typeof projectMilestones.$inferSelect;

export type InsertProjectDocument = z.infer<typeof insertProjectDocumentSchema>;
export type ProjectDocument = typeof projectDocuments.$inferSelect;

export type InsertProjectUpdate = z.infer<typeof insertProjectUpdateSchema>;
export type ProjectUpdate = typeof projectUpdates.$inferSelect;

export type ProjectStatus = "planificado" | "en_ejecucion" | "pausado" | "completado" | "cancelado";
export type ProjectAwardType = "asignacion_directa" | "licitacion";
export type MilestoneStatus = "pendiente" | "en_curso" | "completado" | "retrasado";
export type ProjectDocumentType = "cotizacion" | "adjudicacion" | "contrato" | "comunicado" | "fiscalizacion" | "acta" | "cierre" | "otro";
