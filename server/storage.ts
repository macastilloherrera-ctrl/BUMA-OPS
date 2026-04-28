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
  rolePermissionsConfig,
  type RolePermissionsConfigRow,
  chatConversations,
  chatMessages,
  knowledgeDocuments,
  type ChatConversation,
  type ChatMessage,
  type InsertChatConversation,
  type InsertChatMessage,
  incomes,
  expenses,
  recurringExpenseTemplates,
  bankTransactions,
  payerDirectory,
  projects,
  projectMilestones,
  projectDocuments,
  projectUpdates,
  projectVendors,
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
  type ProjectVendor,
  type InsertProjectVendor,
  type Income,
  type InsertIncome,
  type Expense,
  type InsertExpense,
  type RecurringExpenseTemplate,
  type InsertRecurringExpenseTemplate,
  type BankTransaction,
  type InsertBankTransaction,
  type PayerDirectoryEntry,
  type InsertPayerDirectory,
  vendors,
  type Vendor,
  type InsertVendor,
  monthlyClosingCycles,
  monthlyClosingChecklistItems,
  monthlyClosingStatusLogs,
  closingCycleGlobalConfig,
  closingCycleBuildingOverride,
  type MonthlyClosingCycle,
  type InsertMonthlyClosingCycle,
  type MonthlyClosingChecklistItem,
  type InsertMonthlyClosingChecklistItem,
  type MonthlyClosingStatusLog,
  type InsertMonthlyClosingStatusLog,
  type ClosingCycleGlobalConfig,
  type InsertClosingCycleGlobalConfig,
  type ClosingCycleBuildingOverride,
  type InsertClosingCycleBuildingOverride,
  type EffectiveClosingConfig,
  auditLogs,
  type AuditLog,
  type InsertAuditLog,
  complianceItems,
  type ComplianceItem,
  type InsertComplianceItem,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, lt, or, sql, ne, count, inArray } from "drizzle-orm";

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

  // Role Permissions
  getAllRolePermissions(): Promise<RolePermissionsConfigRow[]>;
  getRolePermissions(role: string): Promise<RolePermissionsConfigRow | undefined>;
  upsertRolePermissions(role: string, data: { modules: string; homeRoute: string; buildingScope: string; updatedBy?: string }): Promise<RolePermissionsConfigRow>;

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
  getProjectMilestoneByLinkedVisitId(visitId: string): Promise<ProjectMilestone | undefined>;
  createProjectMilestone(milestone: InsertProjectMilestone): Promise<ProjectMilestone>;
  updateProjectMilestone(id: string, data: Partial<InsertProjectMilestone>): Promise<ProjectMilestone | undefined>;
  deleteProjectMilestone(id: string): Promise<boolean>;

  // Project Vendors
  getProjectVendors(projectId: string): Promise<ProjectVendor[]>;
  createProjectVendor(vendor: InsertProjectVendor): Promise<ProjectVendor>;
  updateProjectVendor(id: string, data: Partial<InsertProjectVendor>): Promise<ProjectVendor | undefined>;
  deleteProjectVendor(id: string): Promise<boolean>;

  // Project Documents
  getProjectDocuments(projectId: string): Promise<ProjectDocument[]>;
  createProjectDocument(doc: InsertProjectDocument): Promise<ProjectDocument>;
  updateProjectDocument(id: string, data: Partial<InsertProjectDocument>): Promise<ProjectDocument>;
  deleteProjectDocument(id: string): Promise<boolean>;

  // Project Updates
  getProjectUpdates(projectId: string): Promise<ProjectUpdate[]>;
  createProjectUpdate(update: InsertProjectUpdate): Promise<ProjectUpdate>;
  updateProjectUpdate(id: string, data: Partial<InsertProjectUpdate>): Promise<ProjectUpdate | undefined>;

  // Incomes
  getIncomes(filters?: { buildingId?: string; status?: string; month?: number; year?: number }): Promise<Income[]>;
  getIncome(id: string): Promise<Income | undefined>;
  createIncome(income: InsertIncome): Promise<Income>;
  updateIncome(id: string, data: Partial<InsertIncome>): Promise<Income | undefined>;
  deleteIncome(id: string): Promise<boolean>;

  // Vendors
  getVendors(): Promise<Vendor[]>;
  getVendorByName(name: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  findOrCreateVendor(name: string): Promise<Vendor>;

  // Expenses
  getExpenses(filters?: { buildingId?: string; sourceType?: string; paymentStatus?: string; inclusionStatus?: string; month?: number; year?: number }): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, data: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;
  checkDuplicateDocument(documentType: string, documentNumber: string, vendorName: string, excludeId?: string, buildingId?: string): Promise<Expense | undefined>;

  // Recurring Expense Templates
  getRecurringExpenseTemplates(filters?: { buildingId?: string; isActive?: boolean }): Promise<RecurringExpenseTemplate[]>;
  getRecurringExpenseTemplate(id: string): Promise<RecurringExpenseTemplate | undefined>;
  createRecurringExpenseTemplate(template: InsertRecurringExpenseTemplate): Promise<RecurringExpenseTemplate>;
  updateRecurringExpenseTemplate(id: string, data: Partial<InsertRecurringExpenseTemplate>): Promise<RecurringExpenseTemplate | undefined>;
  deleteRecurringExpenseTemplate(id: string): Promise<boolean>;

  // Bank Transactions (Conciliación)
  getBankTransactions(filters?: { buildingId?: string; status?: string | string[]; month?: number; year?: number }): Promise<BankTransaction[]>;
  getBankTransaction(id: string): Promise<BankTransaction | undefined>;
  createBankTransaction(txn: InsertBankTransaction): Promise<BankTransaction>;
  updateBankTransaction(id: string, data: Partial<InsertBankTransaction>): Promise<BankTransaction | undefined>;
  deleteBankTransaction(id: string): Promise<boolean>;
  getBankTransactionByHash(rowHash: string, buildingId: string): Promise<BankTransaction | undefined>;

  // Payer Directory
  getPayerDirectory(buildingId: string): Promise<PayerDirectoryEntry[]>;
  createPayerDirectoryEntry(entry: InsertPayerDirectory): Promise<PayerDirectoryEntry>;
  updatePayerDirectoryEntry(id: string, data: Partial<InsertPayerDirectory>): Promise<PayerDirectoryEntry | undefined>;
  deletePayerDirectoryEntry(id: string): Promise<boolean>;

  // Monthly Closing Cycles
  getMonthlyClosingCycles(filters?: { buildingId?: string; month?: number; year?: number; status?: string }): Promise<MonthlyClosingCycle[]>;
  getMonthlyClosingCycle(id: string): Promise<MonthlyClosingCycle | undefined>;
  getMonthlyClosingCycleByBuildingAndPeriod(buildingId: string, month: number, year: number): Promise<MonthlyClosingCycle | undefined>;
  createMonthlyClosingCycle(cycle: InsertMonthlyClosingCycle): Promise<MonthlyClosingCycle>;
  updateMonthlyClosingCycle(id: string, data: Partial<InsertMonthlyClosingCycle>): Promise<MonthlyClosingCycle | undefined>;
  deleteMonthlyClosingCycle(id: string): Promise<boolean>;

  // Monthly Closing Checklist Items
  getMonthlyClosingChecklistItems(cycleId: string): Promise<MonthlyClosingChecklistItem[]>;
  createMonthlyClosingChecklistItem(item: InsertMonthlyClosingChecklistItem): Promise<MonthlyClosingChecklistItem>;
  updateMonthlyClosingChecklistItem(id: string, data: Partial<InsertMonthlyClosingChecklistItem>): Promise<MonthlyClosingChecklistItem | undefined>;
  deleteMonthlyClosingChecklistItem(id: string): Promise<boolean>;

  // Closing Cycle Global Config
  getGlobalClosingConfig(): Promise<ClosingCycleGlobalConfig | null>;
  upsertGlobalClosingConfig(data: Omit<InsertClosingCycleGlobalConfig, "createdBy" | "updatedBy">, userId: string): Promise<ClosingCycleGlobalConfig>;
  getBuildingOverride(buildingId: string, month: number, year: number): Promise<ClosingCycleBuildingOverride | null>;
  upsertBuildingOverride(data: InsertClosingCycleBuildingOverride): Promise<ClosingCycleBuildingOverride>;
  deleteBuildingOverride(id: string): Promise<boolean>;
  listBuildingOverrides(buildingId?: string): Promise<ClosingCycleBuildingOverride[]>;
  getEffectiveClosingConfig(buildingId: string, month: number, year: number): Promise<EffectiveClosingConfig | null>;
  applyGlobalConfigToNewCycle(buildingId: string, month: number, year: number): Promise<Partial<InsertMonthlyClosingCycle>>;
  checkClosingCycleAlerts(month: number, year: number): Promise<{ created: number; skipped: number }>;

  // Audit Logs
  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;
  listAuditLogs(filters: { buildingId?: string; userId?: string; action?: string; entityType?: string; limit?: number; offset?: number }): Promise<{ logs: AuditLog[]; total: number }>;
  getDiagnosticStats(buildingId?: string): Promise<any>;
  bulkDeleteBankTransactions(buildingId: string, periodMonth: number, periodYear: number): Promise<number>;
  clearExportFlags(buildingId: string, periodMonth: number, periodYear: number): Promise<number>;

  // Compliance Items
  getComplianceItems(buildingId?: string): Promise<ComplianceItem[]>;
  getComplianceItem(id: string): Promise<ComplianceItem | undefined>;
  createComplianceItem(data: InsertComplianceItem): Promise<ComplianceItem>;
  updateComplianceItem(id: string, data: Partial<InsertComplianceItem>): Promise<ComplianceItem | undefined>;
  deleteComplianceItem(id: string): Promise<boolean>;
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

  async getAllRolePermissions(): Promise<RolePermissionsConfigRow[]> {
    return db.select().from(rolePermissionsConfig);
  }

  async getRolePermissions(role: string): Promise<RolePermissionsConfigRow | undefined> {
    const [row] = await db.select().from(rolePermissionsConfig).where(eq(rolePermissionsConfig.role, role));
    return row || undefined;
  }

  async upsertRolePermissions(role: string, data: { modules: string; homeRoute: string; buildingScope: string; updatedBy?: string }): Promise<RolePermissionsConfigRow> {
    const existing = await this.getRolePermissions(role);
    if (existing) {
      const [updated] = await db
        .update(rolePermissionsConfig)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(rolePermissionsConfig.role, role))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(rolePermissionsConfig)
        .values({ role, ...data, updatedAt: new Date() })
        .returning();
      return created;
    }
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

  async getProjectMilestoneByLinkedVisitId(visitId: string): Promise<ProjectMilestone | undefined> {
    const [milestone] = await db.select().from(projectMilestones).where(eq(projectMilestones.linkedVisitId, visitId));
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

  // Project Vendors
  async getProjectVendors(projectId: string): Promise<ProjectVendor[]> {
    return db.select().from(projectVendors)
      .where(eq(projectVendors.projectId, projectId))
      .orderBy(projectVendors.createdAt);
  }

  async createProjectVendor(vendor: InsertProjectVendor): Promise<ProjectVendor> {
    const [newVendor] = await db.insert(projectVendors).values(vendor).returning();
    return newVendor;
  }

  async updateProjectVendor(id: string, data: Partial<InsertProjectVendor>): Promise<ProjectVendor | undefined> {
    const [updated] = await db.update(projectVendors)
      .set(data)
      .where(eq(projectVendors.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProjectVendor(id: string): Promise<boolean> {
    await db.delete(projectVendors).where(eq(projectVendors.id, id));
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

  // Incomes
  async getIncomes(filters?: { buildingId?: string; status?: string; month?: number; year?: number }): Promise<Income[]> {
    const conditions = [];
    if (filters?.buildingId) conditions.push(eq(incomes.buildingId, filters.buildingId));
    if (filters?.status) conditions.push(eq(incomes.status, filters.status as any));
    if (filters?.year && filters?.month) {
      const startDate = new Date(filters.year, filters.month - 1, 1);
      const endDate = new Date(filters.year, filters.month, 1);
      conditions.push(gte(incomes.paymentDate, startDate));
      conditions.push(lt(incomes.paymentDate, endDate));
    }
    return db.select().from(incomes)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(incomes.paymentDate));
  }

  async getIncome(id: string): Promise<Income | undefined> {
    const [income] = await db.select().from(incomes).where(eq(incomes.id, id));
    return income || undefined;
  }

  async createIncome(income: InsertIncome): Promise<Income> {
    const [newIncome] = await db.insert(incomes).values(income).returning();
    return newIncome;
  }

  async updateIncome(id: string, data: Partial<InsertIncome>): Promise<Income | undefined> {
    const [updated] = await db.update(incomes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(incomes.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteIncome(id: string): Promise<boolean> {
    await db.delete(incomes).where(eq(incomes.id, id));
    return true;
  }

  // Expenses
  async getExpenses(filters?: { buildingId?: string; sourceType?: string; paymentStatus?: string; inclusionStatus?: string; month?: number; year?: number }): Promise<Expense[]> {
    const conditions = [];
    if (filters?.buildingId) conditions.push(eq(expenses.buildingId, filters.buildingId));
    if (filters?.sourceType) conditions.push(eq(expenses.sourceType, filters.sourceType as any));
    if (filters?.paymentStatus) conditions.push(eq(expenses.paymentStatus, filters.paymentStatus as any));
    if (filters?.inclusionStatus) conditions.push(eq(expenses.inclusionStatus, filters.inclusionStatus as any));
    if (filters?.year && filters?.month) {
      const startDate = new Date(filters.year, filters.month - 1, 1);
      const endDate = new Date(filters.year, filters.month, 1);
      conditions.push(
        or(
          and(
            eq(expenses.chargeMonth, filters.month),
            eq(expenses.chargeYear, filters.year)
          ),
          and(
            sql`${expenses.chargeMonth} IS NULL AND ${expenses.chargeYear} IS NULL`,
            gte(expenses.paymentDate, startDate),
            lt(expenses.paymentDate, endDate)
          )
        )
      );
    }
    return db.select().from(expenses)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(expenses.paymentDate));
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense || undefined;
  }

  // Vendors
  async getVendors(): Promise<Vendor[]> {
    return db.select().from(vendors).where(eq(vendors.isActive, true)).orderBy(vendors.name);
  }

  async getVendorByName(name: string): Promise<Vendor | undefined> {
    const normalized = name.toUpperCase().trim();
    const [vendor] = await db.select().from(vendors).where(eq(vendors.name, normalized));
    return vendor || undefined;
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [newVendor] = await db.insert(vendors).values({
      ...vendor,
      name: vendor.name.toUpperCase().trim(),
    }).returning();
    return newVendor;
  }

  async findOrCreateVendor(name: string): Promise<Vendor> {
    const normalized = name.toUpperCase().trim();
    if (!normalized) throw new Error("Nombre de proveedor vacío");
    const existing = await this.getVendorByName(normalized);
    if (existing) return existing;
    return this.createVendor({ name: normalized, isActive: true });
  }

  async checkDuplicateDocument(documentType: string, documentNumber: string, vendorName: string, excludeId?: string, buildingId?: string): Promise<Expense | undefined> {
    const normalizedVendor = vendorName.toUpperCase().trim();
    const normalizedDocNum = documentNumber.trim();
    const conditions = [
      eq(expenses.documentType, documentType as any),
      eq(sql`UPPER(TRIM(${expenses.documentNumber}))`, normalizedDocNum.toUpperCase()),
      eq(sql`UPPER(TRIM(${expenses.vendorName}))`, normalizedVendor),
    ];
    if (excludeId) {
      conditions.push(ne(expenses.id, excludeId));
    }
    if (buildingId) {
      conditions.push(eq(expenses.buildingId, buildingId));
    }
    const [duplicate] = await db.select().from(expenses).where(and(...conditions));
    return duplicate || undefined;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async updateExpense(id: string, data: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [updated] = await db.update(expenses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteExpense(id: string): Promise<boolean> {
    await db.delete(expenses).where(eq(expenses.id, id));
    return true;
  }

  // Recurring Expense Templates
  async getRecurringExpenseTemplates(filters?: { buildingId?: string; isActive?: boolean }): Promise<RecurringExpenseTemplate[]> {
    const conditions = [];
    if (filters?.buildingId) conditions.push(eq(recurringExpenseTemplates.buildingId, filters.buildingId));
    if (filters?.isActive !== undefined) conditions.push(eq(recurringExpenseTemplates.isActive, filters.isActive));
    return db.select().from(recurringExpenseTemplates)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(recurringExpenseTemplates.category);
  }

  async getRecurringExpenseTemplate(id: string): Promise<RecurringExpenseTemplate | undefined> {
    const [template] = await db.select().from(recurringExpenseTemplates).where(eq(recurringExpenseTemplates.id, id));
    return template || undefined;
  }

  async createRecurringExpenseTemplate(template: InsertRecurringExpenseTemplate): Promise<RecurringExpenseTemplate> {
    const [newTemplate] = await db.insert(recurringExpenseTemplates).values(template).returning();
    return newTemplate;
  }

  async updateRecurringExpenseTemplate(id: string, data: Partial<InsertRecurringExpenseTemplate>): Promise<RecurringExpenseTemplate | undefined> {
    const [updated] = await db.update(recurringExpenseTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(recurringExpenseTemplates.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteRecurringExpenseTemplate(id: string): Promise<boolean> {
    await db.delete(recurringExpenseTemplates).where(eq(recurringExpenseTemplates.id, id));
    return true;
  }

  // Bank Transactions
  async getBankTransactions(filters?: { buildingId?: string; status?: string | string[]; month?: number; year?: number }): Promise<BankTransaction[]> {
    const conditions: any[] = [];
    if (filters?.buildingId) conditions.push(eq(bankTransactions.buildingId, filters.buildingId));
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(inArray(bankTransactions.status, filters.status as any[]));
      } else {
        conditions.push(eq(bankTransactions.status, filters.status as any));
      }
    }
    if (filters?.month) conditions.push(eq(bankTransactions.periodMonth, filters.month));
    if (filters?.year) conditions.push(eq(bankTransactions.periodYear, filters.year));
    if (conditions.length > 0) {
      return db.select().from(bankTransactions).where(and(...conditions)).orderBy(desc(bankTransactions.txnDate));
    }
    return db.select().from(bankTransactions).orderBy(desc(bankTransactions.txnDate));
  }

  async getBankTransaction(id: string): Promise<BankTransaction | undefined> {
    const [txn] = await db.select().from(bankTransactions).where(eq(bankTransactions.id, id));
    return txn || undefined;
  }

  async createBankTransaction(txn: InsertBankTransaction): Promise<BankTransaction> {
    const [newTxn] = await db.insert(bankTransactions).values(txn).returning();
    return newTxn;
  }

  async updateBankTransaction(id: string, data: Partial<InsertBankTransaction>): Promise<BankTransaction | undefined> {
    const [updated] = await db.update(bankTransactions)
      .set(data)
      .where(eq(bankTransactions.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteBankTransaction(id: string): Promise<boolean> {
    await db.delete(bankTransactions).where(eq(bankTransactions.id, id));
    return true;
  }

  async markBankTransactionsExported(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.update(bankTransactions)
      .set({ exportedAt: new Date() })
      .where(sql`${bankTransactions.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`);
  }

  async markIncomesExported(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.update(incomes)
      .set({ exportedAt: new Date() })
      .where(sql`${incomes.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`);
  }

  async markExpensesExported(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.update(expenses)
      .set({ exportedAt: new Date() })
      .where(sql`${expenses.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`);
  }

  async getBankTransactionByHash(rowHash: string, buildingId: string): Promise<BankTransaction | undefined> {
    const [txn] = await db.select().from(bankTransactions)
      .where(and(eq(bankTransactions.rowHash, rowHash), eq(bankTransactions.buildingId, buildingId)));
    return txn || undefined;
  }

  // Payer Directory
  async getPayerDirectory(buildingId: string): Promise<PayerDirectoryEntry[]> {
    return db.select().from(payerDirectory)
      .where(eq(payerDirectory.buildingId, buildingId))
      .orderBy(desc(payerDirectory.createdAt));
  }

  async createPayerDirectoryEntry(entry: InsertPayerDirectory): Promise<PayerDirectoryEntry> {
    const [newEntry] = await db.insert(payerDirectory).values(entry).returning();
    return newEntry;
  }

  async updatePayerDirectoryEntry(id: string, data: Partial<InsertPayerDirectory>): Promise<PayerDirectoryEntry | undefined> {
    const [updated] = await db.update(payerDirectory)
      .set(data)
      .where(eq(payerDirectory.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePayerDirectoryEntry(id: string): Promise<boolean> {
    await db.delete(payerDirectory).where(eq(payerDirectory.id, id));
    return true;
  }

  // Monthly Closing Cycles
  async getMonthlyClosingCycles(filters?: { buildingId?: string; month?: number; year?: number; status?: string }): Promise<MonthlyClosingCycle[]> {
    const conditions: any[] = [];
    if (filters?.buildingId) conditions.push(eq(monthlyClosingCycles.buildingId, filters.buildingId));
    if (filters?.month) conditions.push(eq(monthlyClosingCycles.month, filters.month));
    if (filters?.year) conditions.push(eq(monthlyClosingCycles.year, filters.year));
    if (filters?.status) conditions.push(eq(monthlyClosingCycles.status, filters.status as any));
    if (conditions.length > 0) {
      return db.select().from(monthlyClosingCycles).where(and(...conditions)).orderBy(desc(monthlyClosingCycles.year), desc(monthlyClosingCycles.month));
    }
    return db.select().from(monthlyClosingCycles).orderBy(desc(monthlyClosingCycles.year), desc(monthlyClosingCycles.month));
  }

  async getMonthlyClosingCycle(id: string): Promise<MonthlyClosingCycle | undefined> {
    const [cycle] = await db.select().from(monthlyClosingCycles).where(eq(monthlyClosingCycles.id, id));
    return cycle || undefined;
  }

  async getMonthlyClosingCycleByBuildingAndPeriod(buildingId: string, month: number, year: number): Promise<MonthlyClosingCycle | undefined> {
    const [cycle] = await db.select().from(monthlyClosingCycles)
      .where(and(
        eq(monthlyClosingCycles.buildingId, buildingId),
        eq(monthlyClosingCycles.month, month),
        eq(monthlyClosingCycles.year, year)
      ));
    return cycle || undefined;
  }

  async createMonthlyClosingCycle(cycle: InsertMonthlyClosingCycle): Promise<MonthlyClosingCycle> {
    const [newCycle] = await db.insert(monthlyClosingCycles).values(cycle).returning();
    return newCycle;
  }

  async updateMonthlyClosingCycle(id: string, data: Partial<InsertMonthlyClosingCycle>): Promise<MonthlyClosingCycle | undefined> {
    const [updated] = await db.update(monthlyClosingCycles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(monthlyClosingCycles.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMonthlyClosingCycle(id: string): Promise<boolean> {
    await db.delete(monthlyClosingChecklistItems).where(eq(monthlyClosingChecklistItems.cycleId, id));
    await db.delete(monthlyClosingCycles).where(eq(monthlyClosingCycles.id, id));
    return true;
  }

  // Monthly Closing Checklist Items
  async getMonthlyClosingChecklistItems(cycleId: string): Promise<MonthlyClosingChecklistItem[]> {
    return db.select().from(monthlyClosingChecklistItems)
      .where(eq(monthlyClosingChecklistItems.cycleId, cycleId))
      .orderBy(monthlyClosingChecklistItems.sortOrder);
  }

  async createMonthlyClosingChecklistItem(item: InsertMonthlyClosingChecklistItem): Promise<MonthlyClosingChecklistItem> {
    const [newItem] = await db.insert(monthlyClosingChecklistItems).values(item).returning();
    return newItem;
  }

  async updateMonthlyClosingChecklistItem(id: string, data: Partial<InsertMonthlyClosingChecklistItem>): Promise<MonthlyClosingChecklistItem | undefined> {
    const [updated] = await db.update(monthlyClosingChecklistItems)
      .set(data)
      .where(eq(monthlyClosingChecklistItems.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMonthlyClosingChecklistItem(id: string): Promise<boolean> {
    await db.delete(monthlyClosingChecklistItems).where(eq(monthlyClosingChecklistItems.id, id));
    return true;
  }

  async createMonthlyClosingStatusLog(log: InsertMonthlyClosingStatusLog): Promise<MonthlyClosingStatusLog> {
    const [created] = await db.insert(monthlyClosingStatusLogs).values(log).returning();
    return created;
  }

  async getMonthlyClosingStatusLogs(cycleId: string): Promise<MonthlyClosingStatusLog[]> {
    return db.select().from(monthlyClosingStatusLogs)
      .where(eq(monthlyClosingStatusLogs.cycleId, cycleId))
      .orderBy(desc(monthlyClosingStatusLogs.changedAt));
  }

  // ─── Closing Cycle Global Config ───────────────────────────────────────────

  async getGlobalClosingConfig(): Promise<ClosingCycleGlobalConfig | null> {
    const [row] = await db
      .select()
      .from(closingCycleGlobalConfig)
      .where(eq(closingCycleGlobalConfig.id, "singleton"));
    return row ?? null;
  }

  async upsertGlobalClosingConfig(
    data: Omit<InsertClosingCycleGlobalConfig, "createdBy" | "updatedBy">,
    userId: string,
  ): Promise<ClosingCycleGlobalConfig> {
    // ON CONFLICT DO UPDATE garantiza atomicidad: si dos requests llegan simultáneamente,
    // la PK 'singleton' impide insertar una segunda fila.
    const [result] = await db
      .insert(closingCycleGlobalConfig)
      .values({ id: "singleton", ...data, createdBy: userId, updatedBy: userId })
      .onConflictDoUpdate({
        target: closingCycleGlobalConfig.id,
        set: { ...data, updatedBy: userId, updatedAt: new Date() },
      })
      .returning();
    return result;
  }

  async getBuildingOverride(buildingId: string, month: number, year: number): Promise<ClosingCycleBuildingOverride | null> {
    const [row] = await db
      .select()
      .from(closingCycleBuildingOverride)
      .where(
        and(
          eq(closingCycleBuildingOverride.buildingId, buildingId),
          eq(closingCycleBuildingOverride.month, month),
          eq(closingCycleBuildingOverride.year, year),
        ),
      );
    return row ?? null;
  }

  async upsertBuildingOverride(data: InsertClosingCycleBuildingOverride): Promise<ClosingCycleBuildingOverride> {
    const existing = await this.getBuildingOverride(data.buildingId, data.month, data.year);
    if (existing) {
      const [updated] = await db
        .update(closingCycleBuildingOverride)
        .set(data)
        .where(eq(closingCycleBuildingOverride.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(closingCycleBuildingOverride).values(data).returning();
    return created;
  }

  async deleteBuildingOverride(id: string): Promise<boolean> {
    await db.delete(closingCycleBuildingOverride).where(eq(closingCycleBuildingOverride.id, id));
    return true;
  }

  async listBuildingOverrides(buildingId?: string): Promise<ClosingCycleBuildingOverride[]> {
    if (buildingId) {
      return db
        .select()
        .from(closingCycleBuildingOverride)
        .where(eq(closingCycleBuildingOverride.buildingId, buildingId))
        .orderBy(desc(closingCycleBuildingOverride.year), desc(closingCycleBuildingOverride.month));
    }
    return db
      .select()
      .from(closingCycleBuildingOverride)
      .orderBy(desc(closingCycleBuildingOverride.year), desc(closingCycleBuildingOverride.month));
  }

  async getEffectiveClosingConfig(buildingId: string, month: number, year: number): Promise<EffectiveClosingConfig | null> {
    const global = await this.getGlobalClosingConfig();
    if (!global) return null;

    const override = await this.getBuildingOverride(buildingId, month, year);

    return {
      emissionDay: override?.emissionDay ?? global.emissionDay,
      expenseCutoffDay: override?.expenseCutoffDay ?? global.expenseCutoffDay,
      incomeCutoffDay: override?.incomeCutoffDay ?? global.incomeCutoffDay,
      preStateDay: override?.preStateDay ?? global.preStateDay,
      finalEmissionDay: override?.finalEmissionDay ?? global.finalEmissionDay,
      alertDaysBeforeDeadline: global.alertDaysBeforeDeadline,
      alertOnMissingCycle: global.alertOnMissingCycle,
      hasOverride: !!override,
    };
  }

  async applyGlobalConfigToNewCycle(buildingId: string, month: number, year: number): Promise<Partial<InsertMonthlyClosingCycle>> {
    const config = await this.getEffectiveClosingConfig(buildingId, month, year);
    if (!config) return {};

    // Construye las fechas usando el día de cada etapa en el mes/año del ciclo
    function dayToDate(day: number): Date {
      // Si el día ya pasó en el mes actual, proyecta al mes del ciclo
      const d = new Date(year, month - 1, day);
      return d;
    }

    return {
      issueDay: config.emissionDay,
      cutoffExpensesDate: dayToDate(config.expenseCutoffDay),
      cutoffIncomesDate: dayToDate(config.incomeCutoffDay),
      preStatementDate: dayToDate(config.preStateDay),
      finalIssueDate: dayToDate(config.finalEmissionDay),
    };
  }

  async checkClosingCycleAlerts(month: number, year: number): Promise<{ created: number; skipped: number }> {
    const global = await this.getGlobalClosingConfig();

    // Obtener todos los gerentes activos que recibirán las alertas
    const managerProfiles = await db
      .select()
      .from(userProfiles)
      .where(
        and(
          inArray(userProfiles.role, ["gerente_general", "gerente_comercial"] as any[]),
          eq(userProfiles.isActive, true),
        ),
      );

    const recipientIds = managerProfiles.map(p => p.userId);

    if (recipientIds.length === 0) {
      console.warn("[checkClosingCycleAlerts] No hay gerentes activos (gerente_general o gerente_comercial). No se crearon notificaciones.");
      return { created: 0, skipped: 0 };
    }

    const activeBuildings = await db
      .select()
      .from(buildings)
      .where(eq(buildings.status, "activo" as any));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let created = 0;
    let skipped = 0;

    for (const building of activeBuildings) {
      const config = await this.getEffectiveClosingConfig(building.id, month, year);
      const cycle = await this.getMonthlyClosingCycleByBuildingAndPeriod(building.id, month, year);

      // Clave de deduplicación incluye userId para no bloquear al segundo gerente
      const notifKey = (userId: string, type: string, stage: string) =>
        `closing_alert:${userId}:${building.id}:${month}:${year}:${type}:${stage}`;

      const alreadyExists = async (refKey: string): Promise<boolean> => {
        const [existing] = await db
          .select()
          .from(notifications)
          .where(eq(notifications.ticketId, refKey))
          .limit(1);
        return !!existing;
      };

      // Envía la notificación a todos los gerentes activos; deduplica por usuario
      const pushNotifToAll = async (
        type: "warning" | "error" | "info",
        title: string,
        message: string,
        stageKey: string,
      ) => {
        for (const userId of recipientIds) {
          const refKey = notifKey(userId, type, stageKey);
          if (await alreadyExists(refKey)) { skipped++; continue; }
          await db.insert(notifications).values({
            userId,
            type: type as any,
            title,
            message,
            ticketId: refKey,
            isRead: false,
          });
          created++;
        }
      };

      if (!config) continue;

      // ALERTA D: edificio activo sin ciclo del mes actual
      if (!cycle && config.alertOnMissingCycle) {
        await pushNotifToAll(
          "info",
          `Sin ciclo de cierre — ${building.name}`,
          `El edificio ${building.name} no tiene ciclo de cierre para ${month}/${year}.`,
          "no_cycle",
        );
      }

      if (!cycle) continue;

      const checklistItems = await this.getMonthlyClosingChecklistItems(cycle.id);

      const stageChecklist: Record<string, boolean> = {
        expenses: checklistItems.find(i => i.sortOrder === 1)?.completed ?? false,
        incomes: checklistItems.find(i => i.sortOrder === 3)?.completed ?? false,
        preState: checklistItems.find(i => i.sortOrder === 5)?.completed ?? false,
        final: checklistItems.find(i => i.sortOrder === 7)?.completed ?? false,
      };

      const stages: Array<{ key: string; day: number; label: string; completed: boolean }> = [
        { key: "expenses", day: config.expenseCutoffDay, label: "Corte de egresos", completed: stageChecklist.expenses },
        { key: "incomes", day: config.incomeCutoffDay, label: "Corte de ingresos", completed: stageChecklist.incomes },
        { key: "preState", day: config.preStateDay, label: "Pre-estado al comité", completed: stageChecklist.preState },
        { key: "final", day: config.finalEmissionDay, label: "Emisión final", completed: stageChecklist.final },
      ];

      for (const stage of stages) {
        const stageDate = new Date(year, month - 1, stage.day);
        stageDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((stageDate.getTime() - today.getTime()) / 86400000);

        if (!stage.completed) {
          // ALERTA A: fecha vencida
          if (diffDays < 0) {
            await pushNotifToAll(
              "error",
              `Etapa vencida: ${stage.label} — ${building.name}`,
              `La etapa "${stage.label}" del cierre ${month}/${year} venció el ${stageDate.toLocaleDateString("es-CL")} y no está completada.`,
              `error_${stage.key}`,
            );
          }
          // ALERTA C: proximidad (alertDaysBeforeDeadline días antes)
          else if (diffDays <= config.alertDaysBeforeDeadline) {
            await pushNotifToAll(
              "warning",
              `Etapa próxima a vencer: ${stage.label} — ${building.name}`,
              `La etapa "${stage.label}" del cierre ${month}/${year} vence en ${diffDays} día${diffDays !== 1 ? "s" : ""} (${stageDate.toLocaleDateString("es-CL")}).`,
              `warning_${stage.key}`,
            );
          }
        }
      }

      // ALERTA B: hoy > emissionDay y ciclo sigue abierto
      const emissionDate = new Date(year, month - 1, config.emissionDay);
      emissionDate.setHours(0, 0, 0, 0);
      if (today > emissionDate && cycle.status === "open") {
        await pushNotifToAll(
          "error",
          `Emisión no iniciada — ${building.name}`,
          `El ciclo de cierre ${month}/${year} del edificio ${building.name} sigue abierto después del día de emisión (${config.emissionDay}).`,
          "emission_overdue",
        );
      }
    }

    return { created, skipped };
  }

  // Audit Logs
  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(data).returning();
    return created;
  }

  async listAuditLogs(filters: { buildingId?: string; userId?: string; action?: string; entityType?: string; limit?: number; offset?: number }): Promise<{ logs: AuditLog[]; total: number }> {
    const conditions: any[] = [];
    if (filters.buildingId) conditions.push(eq(auditLogs.buildingId, filters.buildingId));
    if (filters.userId) conditions.push(eq(auditLogs.userId, filters.userId));
    if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
    if (filters.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ value: count() }).from(auditLogs).where(whereClause);
    const total = totalResult?.value ?? 0;

    let query = db.select().from(auditLogs).where(whereClause).orderBy(desc(auditLogs.createdAt));
    if (filters.limit) query = query.limit(filters.limit) as any;
    if (filters.offset) query = query.offset(filters.offset) as any;

    const logs = await query;
    return { logs, total };
  }

  async getDiagnosticStats(buildingId?: string): Promise<any> {
    const buildingsData = buildingId
      ? [await this.getBuilding(buildingId)].filter(Boolean)
      : await this.getBuildings();

    const stats = [];
    for (const b of buildingsData) {
      if (!b) continue;
      const allTxns = await this.getBankTransactions({ buildingId: b.id });
      const identified = allTxns.filter(t => t.status === 'identified').length;
      const suggested = allTxns.filter(t => t.status === 'suggested').length;
      const pending = allTxns.filter(t => t.status === 'pending').length;

      const allIncomes = await db.select().from(incomes).where(eq(incomes.buildingId, b.id));
      const allExpenses = await db.select().from(expenses).where(eq(expenses.buildingId, b.id));

      stats.push({
        buildingId: b.id,
        buildingName: b.name,
        bankTransactions: { total: allTxns.length, identified, suggested, pending },
        incomes: allIncomes.length,
        expenses: allExpenses.length,
      });
    }
    return stats;
  }

  async bulkDeleteBankTransactions(buildingId: string, periodMonth: number, periodYear: number): Promise<number> {
    const deleted = await db.delete(bankTransactions)
      .where(and(
        eq(bankTransactions.buildingId, buildingId),
        eq(bankTransactions.periodMonth, periodMonth),
        eq(bankTransactions.periodYear, periodYear)
      ))
      .returning();
    return deleted.length;
  }

  async clearExportFlags(buildingId: string, periodMonth: number, periodYear: number): Promise<number> {
    const updated = await db.update(bankTransactions)
      .set({ exportedAt: null })
      .where(and(
        eq(bankTransactions.buildingId, buildingId),
        eq(bankTransactions.periodMonth, periodMonth),
        eq(bankTransactions.periodYear, periodYear)
      ))
      .returning();
    return updated.length;
  }

  async getChatConversations(userId: string): Promise<ChatConversation[]> {
    return db.select().from(chatConversations)
      .where(eq(chatConversations.userId, userId))
      .orderBy(desc(chatConversations.updatedAt));
  }

  async getChatConversation(id: number, userId: string): Promise<ChatConversation | undefined> {
    const rows = await db.select().from(chatConversations)
      .where(and(eq(chatConversations.id, id), eq(chatConversations.userId, userId)));
    return rows[0];
  }

  async createChatConversation(data: InsertChatConversation): Promise<ChatConversation> {
    const rows = await db.insert(chatConversations).values(data).returning();
    return rows[0];
  }

  async updateChatConversationTitle(id: number, title: string): Promise<void> {
    await db.update(chatConversations)
      .set({ title, updatedAt: new Date() })
      .where(eq(chatConversations.id, id));
  }

  async deleteChatConversation(id: number, userId: string): Promise<void> {
    await db.delete(chatMessages)
      .where(eq(chatMessages.conversationId, id));
    await db.delete(chatConversations)
      .where(and(eq(chatConversations.id, id), eq(chatConversations.userId, userId)));
  }

  async getChatMessages(conversationId: number): Promise<ChatMessage[]> {
    return db.select().from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);
  }

  async addChatMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const rows = await db.insert(chatMessages).values(data).returning();
    await db.update(chatConversations)
      .set({ updatedAt: new Date() })
      .where(eq(chatConversations.id, data.conversationId));
    return rows[0];
  }

  async getKnowledgeDocuments(buildingId?: string): Promise<any[]> {
    if (buildingId) {
      return db.select().from(knowledgeDocuments)
        .where(or(
          eq(knowledgeDocuments.buildingId, buildingId),
          sql`${knowledgeDocuments.buildingId} IS NULL`
        ));
    }
    return db.select().from(knowledgeDocuments);
  }

  // ─────────────────────────────────────────────
  // Compliance Items
  // ─────────────────────────────────────────────
  async getComplianceItems(buildingId?: string): Promise<ComplianceItem[]> {
    if (buildingId) {
      return db.select().from(complianceItems)
        .where(and(eq(complianceItems.buildingId, buildingId), eq(complianceItems.isActive, true)))
        .orderBy(complianceItems.expiryDate);
    }
    return db.select().from(complianceItems)
      .where(eq(complianceItems.isActive, true))
      .orderBy(complianceItems.expiryDate);
  }

  async getComplianceItem(id: string): Promise<ComplianceItem | undefined> {
    const [item] = await db.select().from(complianceItems).where(eq(complianceItems.id, id));
    return item || undefined;
  }

  async createComplianceItem(data: InsertComplianceItem): Promise<ComplianceItem> {
    const [item] = await db.insert(complianceItems).values(data).returning();
    return item;
  }

  async updateComplianceItem(id: string, data: Partial<InsertComplianceItem>): Promise<ComplianceItem | undefined> {
    const [item] = await db.update(complianceItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(complianceItems.id, id))
      .returning();
    return item || undefined;
  }

  async deleteComplianceItem(id: string): Promise<boolean> {
    const [item] = await db.update(complianceItems)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(complianceItems.id, id))
      .returning();
    return !!item;
  }
}

export const storage = new DatabaseStorage();
