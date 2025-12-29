import {
  users,
  userProfiles,
  buildings,
  buildingStaff,
  buildingFeatures,
  buildingFolders,
  buildingFiles,
  criticalAssets,
  maintainerCategories,
  maintainers,
  maintainerCategoryLinks,
  visits,
  visitChecklistItems,
  incidents,
  tickets,
  ticketQuotes,
  ticketPhotos,
  ticketCommunications,
  attachments,
  type User,
  type UserProfile,
  type InsertUserProfile,
  type Building,
  type InsertBuilding,
  type BuildingStaff,
  type InsertBuildingStaff,
  type BuildingFeature,
  type InsertBuildingFeature,
  type BuildingFolder,
  type InsertBuildingFolder,
  type BuildingFile,
  type InsertBuildingFile,
  type CriticalAsset,
  type InsertCriticalAsset,
  type MaintainerCategory,
  type InsertMaintainerCategory,
  type Maintainer,
  type InsertMaintainer,
  type MaintainerCategoryLink,
  type InsertMaintainerCategoryLink,
  type Visit,
  type InsertVisit,
  type VisitChecklistItem,
  type InsertVisitChecklistItem,
  type Incident,
  type InsertIncident,
  type Ticket,
  type InsertTicket,
  type TicketQuote,
  type InsertTicketQuote,
  type TicketPhoto,
  type InsertTicketPhoto,
  type TicketCommunication,
  type InsertTicketCommunication,
  type Attachment,
  type InsertAttachment,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, or, sql } from "drizzle-orm";

export interface IStorage {
  // User Profiles
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;
  getExecutives(): Promise<UserProfile[]>;

  // Buildings
  getBuildings(): Promise<Building[]>;
  getBuilding(id: string): Promise<Building | undefined>;
  createBuilding(building: InsertBuilding): Promise<Building>;
  updateBuilding(id: string, data: Partial<InsertBuilding>): Promise<Building | undefined>;
  deleteBuilding(id: string): Promise<boolean>;

  // Building Staff
  getBuildingStaff(buildingId: string): Promise<BuildingStaff[]>;
  createBuildingStaff(staff: InsertBuildingStaff): Promise<BuildingStaff>;
  updateBuildingStaff(id: string, data: Partial<InsertBuildingStaff>): Promise<BuildingStaff | undefined>;
  deleteBuildingStaff(id: string): Promise<boolean>;
  replaceBuildingStaff(buildingId: string, staff: InsertBuildingStaff[]): Promise<BuildingStaff[]>;

  // Building Features
  getBuildingFeatures(buildingId: string): Promise<BuildingFeature[]>;
  createBuildingFeature(feature: InsertBuildingFeature): Promise<BuildingFeature>;
  deleteBuildingFeature(id: string): Promise<boolean>;
  replaceBuildingFeatures(buildingId: string, features: InsertBuildingFeature[]): Promise<BuildingFeature[]>;

  // Building Folders
  getBuildingFolders(buildingId: string): Promise<BuildingFolder[]>;
  getBuildingFolder(id: string): Promise<BuildingFolder | undefined>;
  createBuildingFolder(folder: InsertBuildingFolder): Promise<BuildingFolder>;
  deleteBuildingFolder(id: string): Promise<boolean>;

  // Building Files
  getBuildingFiles(folderId: string): Promise<BuildingFile[]>;
  getBuildingFile(id: string): Promise<BuildingFile | undefined>;
  createBuildingFile(file: InsertBuildingFile): Promise<BuildingFile>;
  deleteBuildingFile(id: string): Promise<boolean>;

  // Critical Assets
  getCriticalAssets(buildingId?: string): Promise<CriticalAsset[]>;
  getCriticalAsset(id: string): Promise<CriticalAsset | undefined>;
  createCriticalAsset(asset: InsertCriticalAsset): Promise<CriticalAsset>;
  updateCriticalAsset(id: string, data: Partial<InsertCriticalAsset>): Promise<CriticalAsset | undefined>;
  deleteCriticalAsset(id: string): Promise<boolean>;

  // Visits
  getVisits(executiveId?: string): Promise<Visit[]>;
  getVisit(id: string): Promise<Visit | undefined>;
  createVisit(visit: InsertVisit): Promise<Visit>;
  updateVisit(id: string, data: Partial<InsertVisit>): Promise<Visit | undefined>;
  updateVisitNotes(id: string, notes: string): Promise<Visit | undefined>;

  // Visit Checklist Items
  getVisitChecklistItems(visitId: string): Promise<VisitChecklistItem[]>;
  getVisitChecklistItem(id: string): Promise<VisitChecklistItem | undefined>;
  createVisitChecklistItem(item: InsertVisitChecklistItem): Promise<VisitChecklistItem>;
  updateVisitChecklistItem(id: string, data: Partial<InsertVisitChecklistItem>): Promise<VisitChecklistItem | undefined>;

  // Incidents
  getIncidents(visitId?: string): Promise<Incident[]>;
  getIncident(id: string): Promise<Incident | undefined>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  updateIncident(id: string, data: Partial<InsertIncident>): Promise<Incident | undefined>;

  // Tickets
  getTickets(filters?: { buildingId?: string; executiveId?: string; status?: string }): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, data: Partial<InsertTicket>): Promise<Ticket | undefined>;

  // Attachments
  getAttachments(entityType: string, entityId: string): Promise<Attachment[]>;
  getAttachment(id: string): Promise<Attachment | undefined>;
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  deleteAttachment(id: string): Promise<boolean>;

  // Maintainer Categories
  getMaintainerCategories(): Promise<MaintainerCategory[]>;
  getMaintainerCategory(id: string): Promise<MaintainerCategory | undefined>;
  createMaintainerCategory(category: InsertMaintainerCategory): Promise<MaintainerCategory>;
  deleteMaintainerCategory(id: string): Promise<boolean>;

  // Maintainers
  getMaintainers(): Promise<Maintainer[]>;
  getMaintainer(id: string): Promise<Maintainer | undefined>;
  createMaintainer(maintainer: InsertMaintainer): Promise<Maintainer>;
  updateMaintainer(id: string, data: Partial<InsertMaintainer>): Promise<Maintainer | undefined>;
  deleteMaintainer(id: string): Promise<boolean>;

  // Maintainer Category Links
  getMaintainerCategoryLinks(maintainerId: string): Promise<MaintainerCategoryLink[]>;
  getMaintainersByCategory(categoryId: string): Promise<Maintainer[]>;
  linkMaintainerToCategory(maintainerId: string, categoryId: string): Promise<MaintainerCategoryLink>;
  unlinkMaintainerFromCategory(maintainerId: string, categoryId: string): Promise<boolean>;
  replaceMaintainerCategories(maintainerId: string, categoryIds: string[]): Promise<MaintainerCategoryLink[]>;

  // Ticket Quotes
  getTicketQuotes(ticketId: string): Promise<TicketQuote[]>;
  getTicketQuote(id: string): Promise<TicketQuote | undefined>;
  createTicketQuote(quote: InsertTicketQuote): Promise<TicketQuote>;
  updateTicketQuote(id: string, data: Partial<InsertTicketQuote>): Promise<TicketQuote | undefined>;
  deleteTicketQuote(id: string): Promise<boolean>;

  // Ticket Photos
  getTicketPhotos(ticketId: string): Promise<TicketPhoto[]>;
  createTicketPhoto(photo: InsertTicketPhoto): Promise<TicketPhoto>;
  deleteTicketPhoto(id: string): Promise<boolean>;

  // Ticket Communications
  getTicketCommunications(ticketId: string): Promise<TicketCommunication[]>;
  createTicketCommunication(comm: InsertTicketCommunication): Promise<TicketCommunication>;
  acknowledgeTicketCommunication(id: string, acknowledgedBy: string): Promise<TicketCommunication | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User Profiles
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile || undefined;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [created] = await db.insert(userProfiles).values(profile).returning();
    return created;
  }

  async updateUserProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const [updated] = await db
      .update(userProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updated || undefined;
  }

  async getExecutives(): Promise<UserProfile[]> {
    return db.select().from(userProfiles).where(eq(userProfiles.role, "ejecutivo_operaciones"));
  }

  // Buildings
  async getBuildings(): Promise<Building[]> {
    return db.select().from(buildings).orderBy(buildings.name);
  }

  async getBuilding(id: string): Promise<Building | undefined> {
    const [building] = await db.select().from(buildings).where(eq(buildings.id, id));
    return building || undefined;
  }

  async createBuilding(building: InsertBuilding): Promise<Building> {
    const [created] = await db.insert(buildings).values(building).returning();
    return created;
  }

  async updateBuilding(id: string, data: Partial<InsertBuilding>): Promise<Building | undefined> {
    const [updated] = await db
      .update(buildings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(buildings.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteBuilding(id: string): Promise<boolean> {
    const result = await db.delete(buildings).where(eq(buildings.id, id));
    return true;
  }

  // Building Staff
  async getBuildingStaff(buildingId: string): Promise<BuildingStaff[]> {
    return db.select().from(buildingStaff).where(eq(buildingStaff.buildingId, buildingId));
  }

  async createBuildingStaff(staff: InsertBuildingStaff): Promise<BuildingStaff> {
    const [created] = await db.insert(buildingStaff).values(staff).returning();
    return created;
  }

  async updateBuildingStaff(id: string, data: Partial<InsertBuildingStaff>): Promise<BuildingStaff | undefined> {
    const [updated] = await db
      .update(buildingStaff)
      .set(data)
      .where(eq(buildingStaff.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteBuildingStaff(id: string): Promise<boolean> {
    await db.delete(buildingStaff).where(eq(buildingStaff.id, id));
    return true;
  }

  async replaceBuildingStaff(buildingId: string, staffList: InsertBuildingStaff[]): Promise<BuildingStaff[]> {
    await db.delete(buildingStaff).where(eq(buildingStaff.buildingId, buildingId));
    if (staffList.length === 0) return [];
    const created = await db.insert(buildingStaff).values(staffList).returning();
    return created;
  }

  // Building Features
  async getBuildingFeatures(buildingId: string): Promise<BuildingFeature[]> {
    return db.select().from(buildingFeatures).where(eq(buildingFeatures.buildingId, buildingId));
  }

  async createBuildingFeature(feature: InsertBuildingFeature): Promise<BuildingFeature> {
    const [created] = await db.insert(buildingFeatures).values(feature).returning();
    return created;
  }

  async deleteBuildingFeature(id: string): Promise<boolean> {
    await db.delete(buildingFeatures).where(eq(buildingFeatures.id, id));
    return true;
  }

  async replaceBuildingFeatures(buildingId: string, featuresList: InsertBuildingFeature[]): Promise<BuildingFeature[]> {
    await db.delete(buildingFeatures).where(eq(buildingFeatures.buildingId, buildingId));
    if (featuresList.length === 0) return [];
    const created = await db.insert(buildingFeatures).values(featuresList).returning();
    return created;
  }

  // Building Folders
  async getBuildingFolders(buildingId: string): Promise<BuildingFolder[]> {
    return db.select().from(buildingFolders).where(eq(buildingFolders.buildingId, buildingId)).orderBy(buildingFolders.name);
  }

  async getBuildingFolder(id: string): Promise<BuildingFolder | undefined> {
    const [folder] = await db.select().from(buildingFolders).where(eq(buildingFolders.id, id));
    return folder || undefined;
  }

  async createBuildingFolder(folder: InsertBuildingFolder): Promise<BuildingFolder> {
    const [created] = await db.insert(buildingFolders).values(folder).returning();
    return created;
  }

  async deleteBuildingFolder(id: string): Promise<boolean> {
    await db.delete(buildingFiles).where(eq(buildingFiles.folderId, id));
    await db.delete(buildingFolders).where(eq(buildingFolders.id, id));
    return true;
  }

  // Building Files
  async getBuildingFiles(folderId: string): Promise<BuildingFile[]> {
    return db.select().from(buildingFiles).where(eq(buildingFiles.folderId, folderId)).orderBy(desc(buildingFiles.createdAt));
  }

  async getBuildingFile(id: string): Promise<BuildingFile | undefined> {
    const [file] = await db.select().from(buildingFiles).where(eq(buildingFiles.id, id));
    return file || undefined;
  }

  async createBuildingFile(file: InsertBuildingFile): Promise<BuildingFile> {
    const [created] = await db.insert(buildingFiles).values(file).returning();
    return created;
  }

  async deleteBuildingFile(id: string): Promise<boolean> {
    await db.delete(buildingFiles).where(eq(buildingFiles.id, id));
    return true;
  }

  // Critical Assets
  async getCriticalAssets(buildingId?: string): Promise<CriticalAsset[]> {
    if (buildingId) {
      return db.select().from(criticalAssets).where(eq(criticalAssets.buildingId, buildingId)).orderBy(criticalAssets.name);
    }
    return db.select().from(criticalAssets).orderBy(criticalAssets.name);
  }

  async getCriticalAsset(id: string): Promise<CriticalAsset | undefined> {
    const [asset] = await db.select().from(criticalAssets).where(eq(criticalAssets.id, id));
    return asset || undefined;
  }

  async createCriticalAsset(asset: InsertCriticalAsset): Promise<CriticalAsset> {
    const [created] = await db.insert(criticalAssets).values(asset).returning();
    return created;
  }

  async updateCriticalAsset(id: string, data: Partial<InsertCriticalAsset>): Promise<CriticalAsset | undefined> {
    const [updated] = await db
      .update(criticalAssets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(criticalAssets.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCriticalAsset(id: string): Promise<boolean> {
    await db.delete(criticalAssets).where(eq(criticalAssets.id, id));
    return true;
  }

  // Visits
  async getVisits(executiveId?: string): Promise<Visit[]> {
    if (executiveId) {
      return db.select().from(visits).where(eq(visits.executiveId, executiveId)).orderBy(desc(visits.scheduledDate));
    }
    return db.select().from(visits).orderBy(desc(visits.scheduledDate));
  }

  async getVisit(id: string): Promise<Visit | undefined> {
    const [visit] = await db.select().from(visits).where(eq(visits.id, id));
    return visit || undefined;
  }

  async createVisit(visit: InsertVisit): Promise<Visit> {
    const [created] = await db.insert(visits).values(visit).returning();
    return created;
  }

  async updateVisit(id: string, data: Partial<InsertVisit>): Promise<Visit | undefined> {
    const [updated] = await db
      .update(visits)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(visits.id, id))
      .returning();
    return updated || undefined;
  }

  async updateVisitNotes(id: string, notes: string): Promise<Visit | undefined> {
    const [updated] = await db
      .update(visits)
      .set({ notes, updatedAt: new Date() })
      .where(eq(visits.id, id))
      .returning();
    return updated || undefined;
  }

  // Visit Checklist Items
  async getVisitChecklistItems(visitId: string): Promise<VisitChecklistItem[]> {
    return db.select().from(visitChecklistItems).where(eq(visitChecklistItems.visitId, visitId)).orderBy(visitChecklistItems.order);
  }

  async getVisitChecklistItem(id: string): Promise<VisitChecklistItem | undefined> {
    const [item] = await db.select().from(visitChecklistItems).where(eq(visitChecklistItems.id, id));
    return item || undefined;
  }

  async createVisitChecklistItem(item: InsertVisitChecklistItem): Promise<VisitChecklistItem> {
    const [created] = await db.insert(visitChecklistItems).values(item).returning();
    return created;
  }

  async updateVisitChecklistItem(id: string, data: Partial<InsertVisitChecklistItem>): Promise<VisitChecklistItem | undefined> {
    const [updated] = await db
      .update(visitChecklistItems)
      .set(data)
      .where(eq(visitChecklistItems.id, id))
      .returning();
    return updated || undefined;
  }

  // Incidents
  async getIncidents(visitId?: string): Promise<Incident[]> {
    if (visitId) {
      return db.select().from(incidents).where(eq(incidents.visitId, visitId)).orderBy(desc(incidents.createdAt));
    }
    return db.select().from(incidents).orderBy(desc(incidents.createdAt));
  }

  async getIncident(id: string): Promise<Incident | undefined> {
    const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
    return incident || undefined;
  }

  async createIncident(incident: InsertIncident): Promise<Incident> {
    const [created] = await db.insert(incidents).values(incident).returning();
    return created;
  }

  async updateIncident(id: string, data: Partial<InsertIncident>): Promise<Incident | undefined> {
    const [updated] = await db
      .update(incidents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(incidents.id, id))
      .returning();
    return updated || undefined;
  }

  // Tickets
  async getTickets(filters?: { buildingId?: string; executiveId?: string; status?: string }): Promise<Ticket[]> {
    const conditions: any[] = [];
    
    if (filters?.buildingId) {
      conditions.push(eq(tickets.buildingId, filters.buildingId));
    }
    if (filters?.executiveId) {
      conditions.push(
        or(
          eq(tickets.assignedExecutiveId, filters.executiveId),
          eq(tickets.createdBy, filters.executiveId)
        )
      );
    }
    if (filters?.status) {
      conditions.push(eq(tickets.status, filters.status as any));
    }
    
    if (conditions.length > 0) {
      return db.select().from(tickets).where(and(...conditions)).orderBy(desc(tickets.createdAt));
    }
    
    return db.select().from(tickets).orderBy(desc(tickets.createdAt));
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket || undefined;
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const [created] = await db.insert(tickets).values(ticket).returning();
    return created;
  }

  async updateTicket(id: string, data: Partial<InsertTicket>): Promise<Ticket | undefined> {
    const [updated] = await db
      .update(tickets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();
    return updated || undefined;
  }

  // Attachments
  async getAttachments(entityType: string, entityId: string): Promise<Attachment[]> {
    return db
      .select()
      .from(attachments)
      .where(and(eq(attachments.entityType, entityType), eq(attachments.entityId, entityId)))
      .orderBy(desc(attachments.createdAt));
  }

  async getAttachment(id: string): Promise<Attachment | undefined> {
    const [attachment] = await db.select().from(attachments).where(eq(attachments.id, id));
    return attachment || undefined;
  }

  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    const [created] = await db.insert(attachments).values(attachment).returning();
    return created;
  }

  async deleteAttachment(id: string): Promise<boolean> {
    await db.delete(attachments).where(eq(attachments.id, id));
    return true;
  }

  // Maintainer Categories
  async getMaintainerCategories(): Promise<MaintainerCategory[]> {
    return db.select().from(maintainerCategories).orderBy(maintainerCategories.name);
  }

  async getMaintainerCategory(id: string): Promise<MaintainerCategory | undefined> {
    const [category] = await db.select().from(maintainerCategories).where(eq(maintainerCategories.id, id));
    return category || undefined;
  }

  async createMaintainerCategory(category: InsertMaintainerCategory): Promise<MaintainerCategory> {
    const [created] = await db.insert(maintainerCategories).values(category).returning();
    return created;
  }

  async deleteMaintainerCategory(id: string): Promise<boolean> {
    await db.delete(maintainerCategories).where(eq(maintainerCategories.id, id));
    return true;
  }

  // Maintainers
  async getMaintainers(): Promise<Maintainer[]> {
    return db.select().from(maintainers).orderBy(maintainers.companyName);
  }

  async getMaintainer(id: string): Promise<Maintainer | undefined> {
    const [maintainer] = await db.select().from(maintainers).where(eq(maintainers.id, id));
    return maintainer || undefined;
  }

  async createMaintainer(maintainer: InsertMaintainer): Promise<Maintainer> {
    const [created] = await db.insert(maintainers).values(maintainer).returning();
    return created;
  }

  async updateMaintainer(id: string, data: Partial<InsertMaintainer>): Promise<Maintainer | undefined> {
    const [updated] = await db
      .update(maintainers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(maintainers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMaintainer(id: string): Promise<boolean> {
    await db.delete(maintainerCategoryLinks).where(eq(maintainerCategoryLinks.maintainerId, id));
    await db.delete(maintainers).where(eq(maintainers.id, id));
    return true;
  }

  // Maintainer Category Links
  async getMaintainerCategoryLinks(maintainerId: string): Promise<MaintainerCategoryLink[]> {
    return db.select().from(maintainerCategoryLinks).where(eq(maintainerCategoryLinks.maintainerId, maintainerId));
  }

  async getMaintainersByCategory(categoryId: string): Promise<Maintainer[]> {
    const links = await db.select().from(maintainerCategoryLinks).where(eq(maintainerCategoryLinks.categoryId, categoryId));
    if (links.length === 0) return [];
    
    const maintainerIds = links.map(l => l.maintainerId);
    return db.select().from(maintainers).where(
      sql`${maintainers.id} IN (${sql.join(maintainerIds.map(id => sql`${id}`), sql`, `)})`
    );
  }

  async linkMaintainerToCategory(maintainerId: string, categoryId: string): Promise<MaintainerCategoryLink> {
    const [created] = await db.insert(maintainerCategoryLinks).values({ maintainerId, categoryId }).returning();
    return created;
  }

  async unlinkMaintainerFromCategory(maintainerId: string, categoryId: string): Promise<boolean> {
    await db.delete(maintainerCategoryLinks).where(
      and(
        eq(maintainerCategoryLinks.maintainerId, maintainerId),
        eq(maintainerCategoryLinks.categoryId, categoryId)
      )
    );
    return true;
  }

  async replaceMaintainerCategories(maintainerId: string, categoryIds: string[]): Promise<MaintainerCategoryLink[]> {
    await db.delete(maintainerCategoryLinks).where(eq(maintainerCategoryLinks.maintainerId, maintainerId));
    
    if (categoryIds.length === 0) return [];
    
    const links = categoryIds.map(categoryId => ({ maintainerId, categoryId }));
    return db.insert(maintainerCategoryLinks).values(links).returning();
  }

  // Ticket Quotes
  async getTicketQuotes(ticketId: string): Promise<TicketQuote[]> {
    return db.select().from(ticketQuotes).where(eq(ticketQuotes.ticketId, ticketId)).orderBy(ticketQuotes.amountNet);
  }

  async getTicketQuote(id: string): Promise<TicketQuote | undefined> {
    const [quote] = await db.select().from(ticketQuotes).where(eq(ticketQuotes.id, id));
    return quote || undefined;
  }

  async createTicketQuote(quote: InsertTicketQuote): Promise<TicketQuote> {
    const amountTotal = Number(quote.amountNet) * (1 + Number(quote.ivaRate || 19) / 100);
    const [created] = await db.insert(ticketQuotes).values({ ...quote, amountTotal: amountTotal.toString() }).returning();
    return created;
  }

  async updateTicketQuote(id: string, data: Partial<InsertTicketQuote>): Promise<TicketQuote | undefined> {
    const updateData: any = { ...data };
    if (data.amountNet || data.ivaRate) {
      const existing = await this.getTicketQuote(id);
      if (existing) {
        const net = Number(data.amountNet || existing.amountNet);
        const iva = Number(data.ivaRate || existing.ivaRate || 19);
        updateData.amountTotal = (net * (1 + iva / 100)).toString();
      }
    }
    const [updated] = await db.update(ticketQuotes).set(updateData).where(eq(ticketQuotes.id, id)).returning();
    return updated || undefined;
  }

  async deleteTicketQuote(id: string): Promise<boolean> {
    await db.delete(ticketQuotes).where(eq(ticketQuotes.id, id));
    return true;
  }

  // Ticket Photos
  async getTicketPhotos(ticketId: string): Promise<TicketPhoto[]> {
    return db.select().from(ticketPhotos).where(eq(ticketPhotos.ticketId, ticketId)).orderBy(desc(ticketPhotos.createdAt));
  }

  async createTicketPhoto(photo: InsertTicketPhoto): Promise<TicketPhoto> {
    const [created] = await db.insert(ticketPhotos).values(photo).returning();
    return created;
  }

  async deleteTicketPhoto(id: string): Promise<boolean> {
    await db.delete(ticketPhotos).where(eq(ticketPhotos.id, id));
    return true;
  }

  // Ticket Communications
  async getTicketCommunications(ticketId: string): Promise<TicketCommunication[]> {
    return db.select().from(ticketCommunications).where(eq(ticketCommunications.ticketId, ticketId)).orderBy(desc(ticketCommunications.sentAt));
  }

  async createTicketCommunication(comm: InsertTicketCommunication): Promise<TicketCommunication> {
    const [created] = await db.insert(ticketCommunications).values(comm).returning();
    return created;
  }

  async acknowledgeTicketCommunication(id: string, acknowledgedBy: string): Promise<TicketCommunication | undefined> {
    const [updated] = await db
      .update(ticketCommunications)
      .set({ acknowledgedBy, acknowledgedAt: new Date() })
      .where(eq(ticketCommunications.id, id))
      .returning();
    return updated || undefined;
  }
}

export const storage = new DatabaseStorage();
