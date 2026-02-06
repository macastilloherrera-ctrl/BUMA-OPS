import {
  users,
  type UpsertUser,
  userProfiles,
  buildings,
  buildingStaff,
  buildingFeatures,
  buildingFolders,
  buildingFiles,
  criticalAssets,
  maintenanceRecords,
  maintainerCategories,
  maintainers,
  maintainerCategoryLinks,
  visits,
  visitChecklistItems,
  visitPhotos,
  incidents,
  tickets,
  ticketQuotes,
  ticketPhotos,
  ticketWorkCycles,
  ticketCommunications,
  ticketAssignmentHistory,
  attachments,
  executives,
  executiveAssignments,
  executiveDocuments,
  notifications,
  systemConfig,
  projects,
  projectMilestones,
  projectDocuments,
  projectUpdates,
  type User,
  type UserProfile,
  type InsertUserProfile,
  type SystemConfig,
  type InsertSystemConfig,
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
  type MaintenanceRecord,
  type InsertMaintenanceRecord,
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
  type VisitPhoto,
  type InsertVisitPhoto,
  type Incident,
  type InsertIncident,
  type Ticket,
  type InsertTicket,
  type TicketQuote,
  type InsertTicketQuote,
  type TicketPhoto,
  type InsertTicketPhoto,
  type TicketWorkCycle,
  type InsertTicketWorkCycle,
  type TicketCommunication,
  type InsertTicketCommunication,
  type Attachment,
  type InsertAttachment,
  type Executive,
  type InsertExecutive,
  type ExecutiveAssignment,
  type InsertExecutiveAssignment,
  type ExecutiveDocument,
  type InsertExecutiveDocument,
  type Notification,
  type InsertNotification,
  type TicketAssignmentHistory,
  type InsertTicketAssignmentHistory,
  type Project,
  type InsertProject,
  type ProjectMilestone,
  type InsertProjectMilestone,
  type ProjectDocument,
  type InsertProjectDocument,
  type ProjectUpdate,
  type InsertProjectUpdate,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, lt, or, sql, ne } from "drizzle-orm";

export interface IStorage {
  // Users
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // User Profiles
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  getUserProfiles(): Promise<UserProfile[]>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;
  deleteUserProfile(userId: string): Promise<boolean>;
  getExecutives(): Promise<UserProfile[]>;

  // System Config
  getSystemConfig(): Promise<SystemConfig | undefined>;
  updateSystemConfig(data: Partial<InsertSystemConfig>): Promise<SystemConfig>;

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
  getCriticalEquipment(): Promise<CriticalAsset[]>;
  getCriticalAsset(id: string): Promise<CriticalAsset | undefined>;
  createCriticalAsset(asset: InsertCriticalAsset): Promise<CriticalAsset>;
  updateCriticalAsset(id: string, data: Partial<InsertCriticalAsset>): Promise<CriticalAsset | undefined>;
  deleteCriticalAsset(id: string): Promise<boolean>;

  // Maintenance Records
  getMaintenanceRecords(assetId: string): Promise<MaintenanceRecord[]>;
  createMaintenanceRecord(record: InsertMaintenanceRecord): Promise<MaintenanceRecord>;
  getAssetsWithOverdueMaintenance(): Promise<CriticalAsset[]>;

  // Visits
  getVisits(executiveId?: string): Promise<Visit[]>;
  getVisit(id: string): Promise<Visit | undefined>;
  getVisitsByGroupId(groupId: string): Promise<Visit[]>;
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
  getTickets(filters?: { buildingId?: string; executiveId?: string; status?: string; visitId?: string }): Promise<Ticket[]>;
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

  // Visit Photos
  getVisitPhotos(visitId: string): Promise<VisitPhoto[]>;
  createVisitPhoto(photo: InsertVisitPhoto): Promise<VisitPhoto>;
  deleteVisitPhoto(id: string): Promise<boolean>;

  // Ticket Work Cycles
  getTicketWorkCycles(ticketId: string): Promise<TicketWorkCycle[]>;
  createTicketWorkCycle(cycle: InsertTicketWorkCycle): Promise<TicketWorkCycle>;
  getLatestWorkCycle(ticketId: string): Promise<TicketWorkCycle | undefined>;

  // Ticket Communications
  getTicketCommunications(ticketId: string): Promise<TicketCommunication[]>;
  createTicketCommunication(comm: InsertTicketCommunication): Promise<TicketCommunication>;
  acknowledgeTicketCommunication(id: string, acknowledgedBy: string): Promise<TicketCommunication | undefined>;
  updateTicketCommunication(id: string, data: { subject: string; problemDescription: string; actionPlan: string }): Promise<TicketCommunication | undefined>;

  // Executives
  getExecutivesList(status?: string): Promise<Executive[]>;
  getExecutive(id: string): Promise<Executive | undefined>;
  getExecutiveWithDetails(id: string): Promise<(Executive & { buildings: Building[]; documents: ExecutiveDocument[] }) | undefined>;
  createExecutive(exec: InsertExecutive): Promise<Executive>;
  updateExecutive(id: string, data: Partial<InsertExecutive>): Promise<Executive | undefined>;
  deactivateExecutive(id: string, terminationDate?: Date): Promise<Executive | undefined>;

  // Executive Assignments
  getExecutiveAssignments(executiveId: string): Promise<ExecutiveAssignment[]>;
  getExecutivesByBuilding(buildingId: string): Promise<Executive[]>;
  createExecutiveAssignment(assignment: InsertExecutiveAssignment): Promise<ExecutiveAssignment>;
  deleteExecutiveAssignment(id: string): Promise<boolean>;
  replaceExecutiveAssignments(executiveId: string, buildingIds: string[], assignedBy?: string): Promise<ExecutiveAssignment[]>;

  // Executive Documents
  getExecutiveDocuments(executiveId: string): Promise<ExecutiveDocument[]>;
  getExecutiveDocument(id: string): Promise<ExecutiveDocument | undefined>;
  createExecutiveDocument(doc: InsertExecutiveDocument): Promise<ExecutiveDocument>;
  deleteExecutiveDocument(id: string): Promise<boolean>;

  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<void>;

  // Ticket Assignment History
  getTicketAssignmentHistory(ticketId: string): Promise<TicketAssignmentHistory[]>;
  createTicketAssignmentHistory(history: InsertTicketAssignmentHistory): Promise<TicketAssignmentHistory>;
  getTicketsDelegatedToUser(userId: string): Promise<Set<string>>;

  // Projects
  getProjects(filters?: { buildingId?: string; status?: string; executiveId?: string }): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // Project Milestones
  getProjectMilestones(projectId: string): Promise<ProjectMilestone[]>;
  getProjectMilestone(id: string): Promise<ProjectMilestone | undefined>;
  createProjectMilestone(milestone: InsertProjectMilestone): Promise<ProjectMilestone>;
  updateProjectMilestone(id: string, data: Partial<InsertProjectMilestone>): Promise<ProjectMilestone | undefined>;
  deleteProjectMilestone(id: string): Promise<boolean>;

  // Project Documents
  getProjectDocuments(projectId: string): Promise<ProjectDocument[]>;
  createProjectDocument(doc: InsertProjectDocument): Promise<ProjectDocument>;
  updateProjectDocument(id: string, data: Partial<InsertProjectDocument>): Promise<ProjectDocument>;
  deleteProjectDocument(id: string): Promise<boolean>;

  // Project Updates
  getProjectUpdates(projectId: string): Promise<ProjectUpdate[]>;
  createProjectUpdate(update: InsertProjectUpdate): Promise<ProjectUpdate>;
  updateProjectUpdate(id: string, data: Partial<InsertProjectUpdate>): Promise<ProjectUpdate | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(user: UpsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    await db.delete(userProfiles).where(eq(userProfiles.userId, id));
    await db.delete(users).where(eq(users.id, id));
    return true;
  }

  // User Profiles
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile || undefined;
  }

  async getUserProfiles(): Promise<UserProfile[]> {
    return db.select().from(userProfiles);
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

  async deleteUserProfile(userId: string): Promise<boolean> {
    await db.delete(userProfiles).where(eq(userProfiles.userId, userId));
    return true;
  }

  async getExecutives(): Promise<UserProfile[]> {
    return db.select().from(userProfiles).where(eq(userProfiles.role, "ejecutivo_operaciones"));
  }

  // System Config
  async getSystemConfig(): Promise<SystemConfig | undefined> {
    const [config] = await db.select().from(systemConfig).where(eq(systemConfig.id, "default"));
    return config || undefined;
  }

  async updateSystemConfig(data: Partial<InsertSystemConfig>): Promise<SystemConfig> {
    const existing = await this.getSystemConfig();
    
    if (existing) {
      const [updated] = await db
        .update(systemConfig)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(systemConfig.id, "default"))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(systemConfig)
        .values({
          id: "default",
          companyName: data.companyName || "BUMA OPS",
          logoUrl: data.logoUrl || null,
          primaryColor: data.primaryColor || "#2563eb",
          updatedBy: data.updatedBy || null,
        })
        .returning();
      return created;
    }
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

  async getCriticalEquipment(): Promise<CriticalAsset[]> {
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

  // Maintenance Records
  async getMaintenanceRecords(assetId: string): Promise<MaintenanceRecord[]> {
    return db.select().from(maintenanceRecords)
      .where(eq(maintenanceRecords.assetId, assetId))
      .orderBy(desc(maintenanceRecords.performedAt));
  }

  async createMaintenanceRecord(record: InsertMaintenanceRecord): Promise<MaintenanceRecord> {
    const [newRecord] = await db.insert(maintenanceRecords).values(record).returning();
    return newRecord;
  }

  async getAssetsWithOverdueMaintenance(): Promise<CriticalAsset[]> {
    const now = new Date();
    return db.select().from(criticalAssets)
      .where(
        and(
          eq(criticalAssets.status, "aprobado"),
          lt(criticalAssets.nextMaintenanceDate, now)
        )
      );
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

  async getVisitsByGroupId(groupId: string): Promise<Visit[]> {
    return db.select().from(visits)
      .where(or(eq(visits.visitGroupId, groupId), eq(visits.id, groupId)))
      .orderBy(desc(visits.scheduledDate));
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
  async getTickets(filters?: { buildingId?: string; executiveId?: string; status?: string; visitId?: string }): Promise<Ticket[]> {
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
    if (filters?.visitId) {
      conditions.push(eq(tickets.visitId, filters.visitId));
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

  // Visit Photos
  async getVisitPhotos(visitId: string): Promise<VisitPhoto[]> {
    return db.select().from(visitPhotos).where(eq(visitPhotos.visitId, visitId)).orderBy(desc(visitPhotos.createdAt));
  }

  async createVisitPhoto(photo: InsertVisitPhoto): Promise<VisitPhoto> {
    const [created] = await db.insert(visitPhotos).values(photo).returning();
    return created;
  }

  async deleteVisitPhoto(id: string): Promise<boolean> {
    await db.delete(visitPhotos).where(eq(visitPhotos.id, id));
    return true;
  }

  // Ticket Work Cycles
  async getTicketWorkCycles(ticketId: string): Promise<TicketWorkCycle[]> {
    return db.select().from(ticketWorkCycles).where(eq(ticketWorkCycles.ticketId, ticketId)).orderBy(ticketWorkCycles.cycleNumber);
  }

  async createTicketWorkCycle(cycle: InsertTicketWorkCycle): Promise<TicketWorkCycle> {
    const [created] = await db.insert(ticketWorkCycles).values(cycle).returning();
    return created;
  }

  async getLatestWorkCycle(ticketId: string): Promise<TicketWorkCycle | undefined> {
    const [cycle] = await db.select().from(ticketWorkCycles).where(eq(ticketWorkCycles.ticketId, ticketId)).orderBy(desc(ticketWorkCycles.cycleNumber)).limit(1);
    return cycle || undefined;
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

  async updateTicketCommunication(id: string, data: { subject: string; problemDescription: string; actionPlan: string }): Promise<TicketCommunication | undefined> {
    const [updated] = await db
      .update(ticketCommunications)
      .set(data)
      .where(eq(ticketCommunications.id, id))
      .returning();
    return updated || undefined;
  }

  // Executives
  async getExecutivesList(status?: string): Promise<Executive[]> {
    if (status) {
      return db.select().from(executives).where(eq(executives.employmentStatus, status as any)).orderBy(executives.lastName, executives.firstName);
    }
    return db.select().from(executives).orderBy(executives.lastName, executives.firstName);
  }

  async getExecutive(id: string): Promise<Executive | undefined> {
    const [exec] = await db.select().from(executives).where(eq(executives.id, id));
    return exec || undefined;
  }

  async getExecutiveWithDetails(id: string): Promise<(Executive & { buildings: Building[]; documents: ExecutiveDocument[] }) | undefined> {
    const [exec] = await db.select().from(executives).where(eq(executives.id, id));
    if (!exec) return undefined;
    
    const assignments = await db.select().from(executiveAssignments).where(eq(executiveAssignments.executiveId, id));
    const docs = await db.select().from(executiveDocuments).where(eq(executiveDocuments.executiveId, id)).orderBy(desc(executiveDocuments.createdAt));
    
    let buildingsData: Building[] = [];
    if (assignments.length > 0) {
      const buildingIds = assignments.map(a => a.buildingId);
      buildingsData = await db.select().from(buildings).where(
        sql`${buildings.id} IN (${sql.join(buildingIds.map(bid => sql`${bid}`), sql`, `)})`
      );
    }
    
    return { ...exec, buildings: buildingsData, documents: docs };
  }

  async createExecutive(exec: InsertExecutive): Promise<Executive> {
    const [created] = await db.insert(executives).values(exec).returning();
    return created;
  }

  async updateExecutive(id: string, data: Partial<InsertExecutive>): Promise<Executive | undefined> {
    const [updated] = await db
      .update(executives)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(executives.id, id))
      .returning();
    return updated || undefined;
  }

  async deactivateExecutive(id: string, terminationDate?: Date): Promise<Executive | undefined> {
    const [updated] = await db
      .update(executives)
      .set({ 
        employmentStatus: "inactivo", 
        terminationDate: terminationDate || new Date(),
        updatedAt: new Date() 
      })
      .where(eq(executives.id, id))
      .returning();
    return updated || undefined;
  }

  // Executive Assignments
  async getExecutiveAssignments(executiveId: string): Promise<ExecutiveAssignment[]> {
    return db.select().from(executiveAssignments).where(eq(executiveAssignments.executiveId, executiveId));
  }

  async getExecutivesByBuilding(buildingId: string): Promise<Executive[]> {
    const assignments = await db.select().from(executiveAssignments).where(eq(executiveAssignments.buildingId, buildingId));
    if (assignments.length === 0) return [];
    
    const executiveIds = assignments.map(a => a.executiveId);
    return db.select().from(executives).where(
      sql`${executives.id} IN (${sql.join(executiveIds.map(id => sql`${id}`), sql`, `)})`
    );
  }

  async createExecutiveAssignment(assignment: InsertExecutiveAssignment): Promise<ExecutiveAssignment> {
    const [created] = await db.insert(executiveAssignments).values(assignment).returning();
    return created;
  }

  async deleteExecutiveAssignment(id: string): Promise<boolean> {
    await db.delete(executiveAssignments).where(eq(executiveAssignments.id, id));
    return true;
  }

  async replaceExecutiveAssignments(executiveId: string, buildingIds: string[], assignedBy?: string): Promise<ExecutiveAssignment[]> {
    // Get current assignments to know which buildings to clear
    const currentAssignments = await db.select().from(executiveAssignments).where(eq(executiveAssignments.executiveId, executiveId));
    const currentBuildingIds = currentAssignments.map(a => a.buildingId);
    
    // Delete old assignments
    await db.delete(executiveAssignments).where(eq(executiveAssignments.executiveId, executiveId));
    
    // Get the executive's userId for building assignment
    const [executive] = await db.select().from(executives).where(eq(executives.id, executiveId));
    const userId = executive?.userProfileId;
    
    // Clear assignedExecutiveId from buildings that are no longer assigned
    for (const oldBuildingId of currentBuildingIds) {
      if (!buildingIds.includes(oldBuildingId)) {
        const [building] = await db.select().from(buildings).where(eq(buildings.id, oldBuildingId));
        if (building && building.assignedExecutiveId === userId) {
          await db.update(buildings)
            .set({ assignedExecutiveId: null, updatedAt: new Date() })
            .where(eq(buildings.id, oldBuildingId));
        }
      }
    }
    
    if (buildingIds.length === 0) return [];
    
    // Create new assignments and update building's assignedExecutiveId
    const assignments = buildingIds.map((buildingId, idx) => ({ 
      executiveId, 
      buildingId, 
      isPrimary: idx === 0,
      assignedBy 
    }));
    
    // Update each building's assignedExecutiveId to this executive's userId
    if (userId) {
      for (const buildingId of buildingIds) {
        await db.update(buildings)
          .set({ assignedExecutiveId: userId, updatedAt: new Date() })
          .where(eq(buildings.id, buildingId));
      }
    }
    
    return db.insert(executiveAssignments).values(assignments).returning();
  }

  // Executive Documents
  async getExecutiveDocuments(executiveId: string): Promise<ExecutiveDocument[]> {
    return db.select().from(executiveDocuments).where(eq(executiveDocuments.executiveId, executiveId)).orderBy(desc(executiveDocuments.createdAt));
  }

  async getExecutiveDocument(id: string): Promise<ExecutiveDocument | undefined> {
    const [doc] = await db.select().from(executiveDocuments).where(eq(executiveDocuments.id, id));
    return doc || undefined;
  }

  async createExecutiveDocument(doc: InsertExecutiveDocument): Promise<ExecutiveDocument> {
    const [created] = await db.insert(executiveDocuments).values(doc).returning();
    return created;
  }

  async deleteExecutiveDocument(id: string): Promise<boolean> {
    await db.delete(executiveDocuments).where(eq(executiveDocuments.id, id));
    return true;
  }

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return Number(result[0]?.count || 0);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const [updated] = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updated || undefined;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  // Ticket Assignment History
  async getTicketAssignmentHistory(ticketId: string): Promise<TicketAssignmentHistory[]> {
    return db.select()
      .from(ticketAssignmentHistory)
      .where(eq(ticketAssignmentHistory.ticketId, ticketId))
      .orderBy(desc(ticketAssignmentHistory.createdAt));
  }

  async createTicketAssignmentHistory(history: InsertTicketAssignmentHistory): Promise<TicketAssignmentHistory> {
    const [created] = await db.insert(ticketAssignmentHistory).values(history).returning();
    return created;
  }

  async getTicketsDelegatedToUser(userId: string): Promise<Set<string>> {
    // Get all assignment history entries where this user was assigned by someone else
    // (meaning they received a delegated ticket, not the original assignment)
    const delegations = await db.select({ ticketId: ticketAssignmentHistory.ticketId })
      .from(ticketAssignmentHistory)
      .where(
        and(
          eq(ticketAssignmentHistory.assignedToId, userId),
          ne(ticketAssignmentHistory.assignedById, userId)
        )
      );
    return new Set(delegations.map(d => d.ticketId));
  }

  // ============================================
  // PROJECTS
  // ============================================

  async getProjects(filters?: { buildingId?: string; status?: string; executiveId?: string }): Promise<Project[]> {
    const conditions = [];
    if (filters?.buildingId) {
      conditions.push(eq(projects.buildingId, filters.buildingId));
    }
    if (filters?.status) {
      conditions.push(eq(projects.status, filters.status as any));
    }
    if (filters?.executiveId) {
      conditions.push(eq(projects.assignedExecutiveId, filters.executiveId));
    }
    
    if (conditions.length > 0) {
      return db.select().from(projects).where(and(...conditions)).orderBy(desc(projects.createdAt));
    }
    return db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db.update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return true;
  }

  // Project Milestones
  async getProjectMilestones(projectId: string): Promise<ProjectMilestone[]> {
    return db.select().from(projectMilestones)
      .where(eq(projectMilestones.projectId, projectId))
      .orderBy(projectMilestones.orderIndex);
  }

  async getProjectMilestone(id: string): Promise<ProjectMilestone | undefined> {
    const [milestone] = await db.select().from(projectMilestones).where(eq(projectMilestones.id, id));
    return milestone || undefined;
  }

  async createProjectMilestone(milestone: InsertProjectMilestone): Promise<ProjectMilestone> {
    const [newMilestone] = await db.insert(projectMilestones).values(milestone).returning();
    return newMilestone;
  }

  async updateProjectMilestone(id: string, data: Partial<InsertProjectMilestone>): Promise<ProjectMilestone | undefined> {
    const [updated] = await db.update(projectMilestones)
      .set(data)
      .where(eq(projectMilestones.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProjectMilestone(id: string): Promise<boolean> {
    await db.delete(projectMilestones).where(eq(projectMilestones.id, id));
    return true;
  }

  // Project Documents
  async getProjectDocuments(projectId: string): Promise<ProjectDocument[]> {
    return db.select().from(projectDocuments)
      .where(eq(projectDocuments.projectId, projectId))
      .orderBy(desc(projectDocuments.createdAt));
  }

  async createProjectDocument(doc: InsertProjectDocument): Promise<ProjectDocument> {
    const [newDoc] = await db.insert(projectDocuments).values(doc).returning();
    return newDoc;
  }

  async updateProjectDocument(id: string, data: Partial<InsertProjectDocument>): Promise<ProjectDocument> {
    const [updated] = await db.update(projectDocuments).set(data).where(eq(projectDocuments.id, id)).returning();
    return updated;
  }

  async deleteProjectDocument(id: string): Promise<boolean> {
    await db.delete(projectDocuments).where(eq(projectDocuments.id, id));
    return true;
  }

  // Project Updates
  async getProjectUpdates(projectId: string): Promise<ProjectUpdate[]> {
    return db.select().from(projectUpdates)
      .where(eq(projectUpdates.projectId, projectId))
      .orderBy(desc(projectUpdates.createdAt));
  }

  async createProjectUpdate(update: InsertProjectUpdate): Promise<ProjectUpdate> {
    const [newUpdate] = await db.insert(projectUpdates).values(update).returning();
    return newUpdate;
  }

  async updateProjectUpdate(id: string, data: Partial<InsertProjectUpdate>): Promise<ProjectUpdate | undefined> {
    const [updated] = await db.update(projectUpdates)
      .set(data)
      .where(eq(projectUpdates.id, id))
      .returning();
    return updated || undefined;
  }
}

export const storage = new DatabaseStorage();
