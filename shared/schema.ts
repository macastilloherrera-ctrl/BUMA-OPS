import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

// Enums
export const userRoleEnum = pgEnum("user_role", [
  "gerente_general",
  "gerente_operaciones",
  "gerente_finanzas",
  "ejecutivo_operaciones"
]);

export const buildingStatusEnum = pgEnum("building_status", [
  "activo",
  "inactivo",
  "en_revision"
]);

export const visitTypeEnum = pgEnum("visit_type", [
  "rutina",
  "urgente"
]);

export const visitStatusEnum = pgEnum("visit_status", [
  "borrador",
  "programada",
  "atrasada",
  "en_curso",
  "realizada",
  "cancelada"
]);

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
  status: buildingStatusEnum("status").notNull().default("activo"),
  assignedExecutiveId: varchar("assigned_executive_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Incidents table
export const incidents = pgTable("incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull(),
  buildingId: varchar("building_id").notNull(),
  criticalAssetId: varchar("critical_asset_id"),
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

// Tickets table
export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buildingId: varchar("building_id").notNull(),
  visitId: varchar("visit_id"),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  priority: ticketPriorityEnum("priority").notNull().default("verde"),
  responsibleType: ticketResponsibleTypeEnum("responsible_type").notNull(),
  responsibleName: varchar("responsible_name", { length: 255 }),
  assignedExecutiveId: varchar("assigned_executive_id"),
  dueDate: timestamp("due_date").notNull(),
  status: ticketStatusEnum("status").notNull().default("pendiente"),
  cost: decimal("cost", { precision: 12, scale: 2 }),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
}));

export const criticalAssetsRelations = relations(criticalAssets, ({ one }) => ({
  building: one(buildings, {
    fields: [criticalAssets.buildingId],
    references: [buildings.id],
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
  incidents: many(incidents),
  tickets: many(tickets),
}));

export const visitChecklistItemsRelations = relations(visitChecklistItems, ({ one }) => ({
  visit: one(visits, {
    fields: [visitChecklistItems.visitId],
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

export const ticketsRelations = relations(tickets, ({ one }) => ({
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

export const insertCriticalAssetSchema = createInsertSchema(criticalAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

// Types
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

export type InsertBuilding = z.infer<typeof insertBuildingSchema>;
export type Building = typeof buildings.$inferSelect;

export type InsertCriticalAsset = z.infer<typeof insertCriticalAssetSchema>;
export type CriticalAsset = typeof criticalAssets.$inferSelect;

export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visits.$inferSelect;

export type InsertVisitChecklistItem = z.infer<typeof insertVisitChecklistItemSchema>;
export type VisitChecklistItem = typeof visitChecklistItems.$inferSelect;

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type Attachment = typeof attachments.$inferSelect;

// Helper types for frontend
export type UserRole = "gerente_general" | "gerente_operaciones" | "gerente_finanzas" | "ejecutivo_operaciones";
export type VisitStatus = "borrador" | "programada" | "atrasada" | "en_curso" | "realizada" | "cancelada";
export type VisitType = "rutina" | "urgente";
export type TicketPriority = "rojo" | "amarillo" | "verde";
export type TicketStatus = "pendiente" | "en_curso" | "vencido" | "resuelto" | "reprogramado";
export type IncidentStatus = "pendiente" | "en_reparacion" | "reparada" | "reprogramada";
export type ChecklistType = "rutina" | "emergencia";
