import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import * as fs from "fs";
import * as path from "path";
import * as bcrypt from "bcryptjs";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { registerDevAuthRoutes, isDevMode } from "./devAuth";
import { db } from "./db";
import { eq, or } from "drizzle-orm";
import { users as usersTable } from "@shared/schema";
import {
  insertBuildingSchema,
  insertBuildingStaffSchema,
  insertBuildingFeatureSchema,
  insertBuildingFolderSchema,
  insertBuildingFileSchema,
  insertCriticalAssetSchema,
  insertMaintainerCategorySchema,
  insertMaintainerSchema,
  insertVisitSchema,
  insertVisitChecklistItemSchema,
  insertVisitPhotoSchema,
  insertIncidentSchema,
  insertTicketSchema,
  insertTicketQuoteSchema,
  insertTicketPhotoSchema,
  insertTicketCommunicationSchema,
  insertAttachmentSchema,
  userProfiles,
  type UserRole,
  type UserProfile,
} from "@shared/schema";
import { z } from "zod";

// Middleware to check authentication
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }
  next();
}

// Middleware to check if user is a manager (can see costs)
async function isManager(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "No autenticado" });
  }
  
  const profile = await storage.getUserProfile(req.user.id);
  if (!profile || !["gerente_general", "gerente_operaciones"].includes(profile.role)) {
    return res.status(403).json({ error: "Acceso denegado" });
  }
  next();
}

// Helper to strip cost fields for non-managers
function stripCostFields<T extends { cost?: string | null }>(items: T[], canSeeCosts: boolean): T[] {
  if (canSeeCosts) return items;
  return items.map((item) => ({ ...item, cost: null }));
}

// Helper to check if user is a manager role
function isManagerRole(profile: UserProfile | null): boolean {
  return !!profile && ["gerente_general", "gerente_operaciones", "gerente_comercial"].includes(profile.role);
}

// Helper to check if user can access a building (based on buildingScope)
async function canAccessBuilding(userId: string, buildingId: string, profile: UserProfile | null): Promise<boolean> {
  if (isManagerRole(profile)) return true;
  if (profile?.buildingScope === "all") return true;
  
  const building = await storage.getBuilding(buildingId);
  return building?.assignedExecutiveId === userId;
}

// Helper to check if user can view/edit entity based on assignment
async function canAccessEntity(
  userId: string,
  profile: UserProfile | null,
  entity: { 
    executiveId?: string; 
    assignedExecutiveId?: string | null; 
    createdBy?: string;
    buildingId: string;
  }
): Promise<boolean> {
  if (isManagerRole(profile)) return true;
  
  // User with "all" scope can access any entity
  if (profile?.buildingScope === "all") return true;
  
  // User is directly assigned to the entity
  if (entity.executiveId === userId) return true;
  if (entity.assignedExecutiveId === userId) return true;
  if (entity.createdBy === userId) return true;
  
  // User is assigned to the building
  const building = await storage.getBuilding(entity.buildingId);
  if (building?.assignedExecutiveId === userId) return true;
  
  return false;
}

// Helper to remove cost fields from request body for non-managers
function sanitizeCostFields(body: any, isManager: boolean): any {
  if (isManager) return body;
  const sanitized = { ...body };
  delete sanitized.cost;
  delete sanitized.price;
  return sanitized;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup Replit Auth (must be first!)
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Setup Dev Auth (only in development)
  registerDevAuthRoutes(app);
  
  // Setup Object Storage routes
  registerObjectStorageRoutes(app);
  
  // Serve documentation files for download
  app.get("/api/docs", (req, res) => {
    const docsDir = path.join(process.cwd(), "docs");
    
    if (!fs.existsSync(docsDir)) {
      return res.json({ files: [] });
    }
    
    const files = fs.readdirSync(docsDir)
      .filter((f: string) => f.endsWith(".docx"))
      .map((f: string) => ({
        name: f,
        url: `/api/docs/download/${encodeURIComponent(f)}`,
      }));
    
    res.json({ files });
  });
  
  app.get("/api/docs/download/:filename", (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), "docs", filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Archivo no encontrado" });
    }
    
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.sendFile(filePath);
  });
  
  // Get current user info with role (combined endpoint)
  app.get("/api/me", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userId = user.claims?.sub || user.id;
      const profile = await storage.getUserProfile(userId);
      
      res.json({
        id: userId,
        email: user.claims?.email || null,
        firstName: user.claims?.first_name || null,
        lastName: user.claims?.last_name || null,
        role: profile?.role || "ejecutivo_operaciones",
        buildingScope: profile?.buildingScope || "assigned",
      });
    } catch (error) {
      console.error("Error getting user info:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  
  // Get current user's profile
  app.get("/api/user/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      let profile = await storage.getUserProfile(userId);
      
      // Auto-create profile if doesn't exist
      if (!profile) {
        profile = await storage.createUserProfile({
          userId,
          role: "ejecutivo_operaciones",
          isActive: true,
        });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error getting user profile:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Get all executives (managers only)
  app.get("/api/users/executives", isAuthenticated, isManager, async (req, res) => {
    try {
      const executives = await storage.getExecutives();
      
      // Map to include displayName from dev users or userId fallback
      const { DEV_USERS } = await import("./devAuth");
      const executivesWithNames = executives.map((exec) => {
        const devUser = DEV_USERS.find((u) => u.id === exec.userId);
        return {
          userId: exec.userId,
          displayName: devUser 
            ? `${devUser.firstName} ${devUser.lastName}` 
            : exec.userId.split("@")[0] || exec.userId,
        };
      });
      
      res.json(executivesWithNames);
    } catch (error) {
      console.error("Error getting executives:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Get all assignable users (executives and managers) for reassignment
  app.get("/api/users/assignable", isAuthenticated, async (req, res) => {
    try {
      const allProfiles = await db.select().from(userProfiles);
      
      const { DEV_USERS } = await import("./devAuth");
      const usersWithNames = allProfiles.map((profile) => {
        const devUser = DEV_USERS.find((u) => u.id === profile.userId);
        return {
          id: profile.userId,
          firstName: devUser?.firstName || profile.userId.split("-")[0] || "Usuario",
          lastName: devUser?.lastName || "",
          role: profile.role,
        };
      });
      
      res.json(usersWithNames);
    } catch (error) {
      console.error("Error getting assignable users:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Get managers for escalation dialog
  app.get("/api/users/managers", isAuthenticated, async (req, res) => {
    try {
      const allProfiles = await db.select().from(userProfiles)
        .where(or(
          eq(userProfiles.role, "gerente_general"),
          eq(userProfiles.role, "gerente_operaciones"),
          eq(userProfiles.role, "gerente_comercial")
        ));
      
      const { DEV_USERS } = await import("./devAuth");
      const roleLabels: Record<string, string> = {
        gerente_general: "Gerente General",
        gerente_operaciones: "Gerente de Operaciones",
        gerente_comercial: "Gerente Comercial",
      };
      const managersWithNames = allProfiles.map((profile) => {
        const devUser = DEV_USERS.find((u) => u.id === profile.userId);
        return {
          userId: profile.userId,
          role: profile.role,
          displayName: devUser 
            ? `${devUser.firstName} ${devUser.lastName}` 
            : profile.userId.split("@")[0] || profile.userId,
          roleName: roleLabels[profile.role] || profile.role,
        };
      });
      
      res.json(managersWithNames);
    } catch (error) {
      console.error("Error getting managers:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Get executives workload for dashboard (managers only)
  app.get("/api/executives/workload", isAuthenticated, isManager, async (req, res) => {
    try {
      const executives = await storage.getExecutives();
      const buildings = await storage.getBuildings();
      const visits = await storage.getVisits();
      
      const workload = executives.map((exec) => {
        const assignedBuildings = buildings.filter((b) => b.assignedExecutiveId === exec.userId);
        const execVisits = visits.filter((v) => v.executiveId === exec.userId);
        const pendingVisits = execVisits.filter((v) => ["programada", "atrasada"].includes(v.status));
        const completedThisMonth = execVisits.filter((v) => {
          if (v.status !== "realizada" || !v.completedAt) return false;
          const completed = new Date(v.completedAt);
          const now = new Date();
          return completed.getMonth() === now.getMonth() && completed.getFullYear() === now.getFullYear();
        });
        
        return {
          id: exec.id,
          name: exec.userId,
          assignedBuildings: assignedBuildings.length,
          pendingVisits: pendingVisits.length,
          completedThisMonth: completedThisMonth.length,
        };
      });
      
      res.json(workload);
    } catch (error) {
      console.error("Error getting workload:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // === Buildings ===
  app.get("/api/buildings", isAuthenticated, async (req, res) => {
    try {
      const buildings = await storage.getBuildings();
      
      const profile = await storage.getUserProfile(req.user!.id);
      const isManagerUser = profile && ["gerente_general", "gerente_operaciones"].includes(profile.role);
      
      // For non-managers, only show their assigned buildings or strip assignedExecutiveId
      if (!isManagerUser) {
        res.json(buildings.map((b) => ({
          ...b,
          assignedExecutiveId: b.assignedExecutiveId === req.user!.id ? b.assignedExecutiveId : null,
        })));
      } else {
        res.json(buildings);
      }
    } catch (error) {
      console.error("Error getting buildings:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.get("/api/buildings/:id", isAuthenticated, async (req, res) => {
    try {
      const building = await storage.getBuilding(req.params.id);
      if (!building) {
        return res.status(404).json({ error: "Edificio no encontrado" });
      }
      
      const profile = await storage.getUserProfile(req.user!.id);
      const isManagerUser = profile && ["gerente_general", "gerente_operaciones"].includes(profile.role);
      
      // For non-managers, strip other executives' assignment info
      if (!isManagerUser) {
        res.json({
          ...building,
          assignedExecutiveId: building.assignedExecutiveId === req.user!.id ? building.assignedExecutiveId : null,
        });
      } else {
        res.json(building);
      }
    } catch (error) {
      console.error("Error getting building:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/buildings", isAuthenticated, isManager, async (req, res) => {
    try {
      const data = insertBuildingSchema.parse(req.body);
      const building = await storage.createBuilding(data);
      res.status(201).json(building);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error creating building:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.patch("/api/buildings/:id", isAuthenticated, isManager, async (req, res) => {
    try {
      const data = insertBuildingSchema.partial().parse(req.body);
      const building = await storage.updateBuilding(req.params.id, data);
      if (!building) {
        return res.status(404).json({ error: "Edificio no encontrado" });
      }
      res.json(building);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error updating building:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // === Building Staff ===
  app.get("/api/buildings/:id/staff", isAuthenticated, async (req, res) => {
    try {
      const staff = await storage.getBuildingStaff(req.params.id);
      res.json(staff);
    } catch (error) {
      console.error("Error getting building staff:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.put("/api/buildings/:id/staff", isAuthenticated, isManager, async (req, res) => {
    try {
      const staffArray = z.array(insertBuildingStaffSchema.omit({ buildingId: true })).parse(req.body);
      const staffWithBuildingId = staffArray.map(s => ({ ...s, buildingId: req.params.id }));
      const staff = await storage.replaceBuildingStaff(req.params.id, staffWithBuildingId);
      res.json(staff);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error updating building staff:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/buildings/:buildingId/staff", isAuthenticated, isManager, async (req, res) => {
    try {
      const data = insertBuildingStaffSchema.omit({ buildingId: true }).parse(req.body);
      const staff = await storage.createBuildingStaff({ ...data, buildingId: req.params.buildingId });
      res.status(201).json(staff);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error creating building staff:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.patch("/api/building-staff/:id", isAuthenticated, isManager, async (req, res) => {
    try {
      const data = insertBuildingStaffSchema.partial().parse(req.body);
      const staff = await storage.updateBuildingStaff(req.params.id, data);
      if (!staff) {
        return res.status(404).json({ error: "Personal no encontrado" });
      }
      res.json(staff);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error updating building staff:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // === Building Features ===
  app.get("/api/buildings/:id/features", isAuthenticated, async (req, res) => {
    try {
      const features = await storage.getBuildingFeatures(req.params.id);
      res.json(features);
    } catch (error) {
      console.error("Error getting building features:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.put("/api/buildings/:id/features", isAuthenticated, isManager, async (req, res) => {
    try {
      const featuresArray = z.array(insertBuildingFeatureSchema.omit({ buildingId: true })).parse(req.body);
      const featuresWithBuildingId = featuresArray.map(f => ({ ...f, buildingId: req.params.id }));
      const features = await storage.replaceBuildingFeatures(req.params.id, featuresWithBuildingId);
      res.json(features);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error updating building features:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // === Building Folders (Manager only) ===
  app.get("/api/buildings/:id/folders", isAuthenticated, isManager, async (req, res) => {
    try {
      const folders = await storage.getBuildingFolders(req.params.id);
      res.json(folders);
    } catch (error) {
      console.error("Error getting building folders:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/buildings/:id/folders", isAuthenticated, isManager, async (req, res) => {
    try {
      const data = insertBuildingFolderSchema.omit({ buildingId: true, createdBy: true }).parse(req.body);
      const folder = await storage.createBuildingFolder({
        ...data,
        buildingId: req.params.id,
        createdBy: req.user!.id,
      });
      res.status(201).json(folder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error creating building folder:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.delete("/api/building-folders/:id", isAuthenticated, isManager, async (req, res) => {
    try {
      const folder = await storage.getBuildingFolder(req.params.id);
      if (!folder) {
        return res.status(404).json({ error: "Carpeta no encontrada" });
      }
      if (folder.isDefault) {
        return res.status(400).json({ error: "No se puede eliminar carpeta predeterminada" });
      }
      await storage.deleteBuildingFolder(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting building folder:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // === Building Files (Manager only) ===
  app.get("/api/building-folders/:id/files", isAuthenticated, isManager, async (req, res) => {
    try {
      const files = await storage.getBuildingFiles(req.params.id);
      res.json(files);
    } catch (error) {
      console.error("Error getting building files:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/building-folders/:id/files", isAuthenticated, isManager, async (req, res) => {
    try {
      const folder = await storage.getBuildingFolder(req.params.id);
      if (!folder) {
        return res.status(404).json({ error: "Carpeta no encontrada" });
      }
      const data = insertBuildingFileSchema.omit({ folderId: true, buildingId: true, uploadedBy: true }).parse(req.body);
      const file = await storage.createBuildingFile({
        ...data,
        folderId: req.params.id,
        buildingId: folder.buildingId,
        uploadedBy: req.user!.id,
      });
      res.status(201).json(file);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error creating building file:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.delete("/api/building-files/:id", isAuthenticated, isManager, async (req, res) => {
    try {
      const file = await storage.getBuildingFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "Archivo no encontrado" });
      }
      await storage.deleteBuildingFile(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting building file:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // === Critical Assets ===
  app.get("/api/critical-assets", isAuthenticated, async (req, res) => {
    try {
      const buildingId = req.query.buildingId as string | undefined;
      const assets = await storage.getCriticalAssets(buildingId);
      
      // Add building names
      const buildings = await storage.getBuildings();
      const buildingsMap = new Map(buildings.map((b) => [b.id, b.name]));
      
      const assetsWithBuilding = assets.map((a) => ({
        ...a,
        buildingName: buildingsMap.get(a.buildingId) || "Desconocido",
      }));
      
      res.json(assetsWithBuilding);
    } catch (error) {
      console.error("Error getting critical assets:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/critical-assets", isAuthenticated, async (req, res) => {
    try {
      const data = insertCriticalAssetSchema.parse({
        ...req.body,
        suggestedBy: req.user!.id,
      });
      const asset = await storage.createCriticalAsset(data);
      res.status(201).json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error creating critical asset:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.patch("/api/critical-assets/:id", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.user!.id);
      const isManagerUser = profile && ["gerente_general", "gerente_operaciones"].includes(profile.role);
      
      const data = insertCriticalAssetSchema.partial().parse(req.body);
      
      // Status changes require manager role
      if (data.status !== undefined) {
        if (!isManagerUser) {
          return res.status(403).json({ error: "Solo gerentes pueden cambiar el estado de equipos" });
        }
        if (data.status === "aprobado") {
          (data as any).approvedBy = req.user!.id;
        }
      }
      
      // Non-managers can only update name, type, description of their own suggestions
      if (!isManagerUser) {
        const existingAsset = await storage.getCriticalAsset(req.params.id);
        if (!existingAsset) {
          return res.status(404).json({ error: "Equipo no encontrado" });
        }
        if (existingAsset.suggestedBy !== req.user!.id) {
          return res.status(403).json({ error: "Solo puedes editar tus propias sugerencias" });
        }
        if (existingAsset.status !== "pendiente") {
          return res.status(403).json({ error: "Solo puedes editar equipos pendientes de aprobacion" });
        }
        // Remove status from data if non-manager tries to change it
        delete (data as any).status;
      }
      
      const asset = await storage.updateCriticalAsset(req.params.id, data);
      if (!asset) {
        return res.status(404).json({ error: "Equipo no encontrado" });
      }
      res.json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error updating critical asset:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Dedicated approval endpoint for managers
  app.post("/api/critical-assets/:id/approve", isAuthenticated, isManager, async (req, res) => {
    try {
      const asset = await storage.updateCriticalAsset(req.params.id, {
        status: "aprobado",
        approvedBy: req.user!.id,
      });
      if (!asset) {
        return res.status(404).json({ error: "Equipo no encontrado" });
      }
      res.json(asset);
    } catch (error) {
      console.error("Error approving critical asset:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Dedicated rejection endpoint for managers
  app.post("/api/critical-assets/:id/reject", isAuthenticated, isManager, async (req, res) => {
    try {
      const asset = await storage.updateCriticalAsset(req.params.id, {
        status: "rechazado",
      });
      if (!asset) {
        return res.status(404).json({ error: "Equipo no encontrado" });
      }
      res.json(asset);
    } catch (error) {
      console.error("Error rejecting critical asset:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.delete("/api/critical-assets/:id", isAuthenticated, isManager, async (req, res) => {
    try {
      await storage.deleteCriticalAsset(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting critical asset:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // === Maintenance Records ===
  // Get maintenance history for an asset
  app.get("/api/critical-assets/:id/maintenance-records", isAuthenticated, async (req, res) => {
    try {
      const records = await storage.getMaintenanceRecords(req.params.id);
      res.json(records);
    } catch (error) {
      console.error("Error getting maintenance records:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Register a new maintenance record
  app.post("/api/critical-assets/:id/maintenance-records", isAuthenticated, async (req, res) => {
    try {
      const asset = await storage.getCriticalAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ error: "Equipo no encontrado" });
      }

      const { performedAt, maintainerName, observations, cost } = req.body;
      
      // Create the maintenance record
      const record = await storage.createMaintenanceRecord({
        assetId: req.params.id,
        performedAt: new Date(performedAt),
        performedBy: req.user!.id,
        maintainerName,
        observations,
        cost: cost ? String(cost) : null,
      });

      // Calculate next maintenance date based on frequency
      let nextDate: Date | null = null;
      if (asset.maintenanceFrequency) {
        const baseDate = new Date(performedAt);
        const frequencyMonths: Record<string, number> = {
          mensual: 1,
          bimestral: 2,
          trimestral: 3,
          semestral: 6,
          anual: 12,
        };
        const months = frequencyMonths[asset.maintenanceFrequency] || 1;
        nextDate = new Date(baseDate);
        nextDate.setMonth(nextDate.getMonth() + months);
      }

      // Update asset with new maintenance dates
      await storage.updateCriticalAsset(req.params.id, {
        lastMaintenanceDate: new Date(performedAt),
        nextMaintenanceDate: nextDate,
        maintainerName: maintainerName || asset.maintainerName,
      });

      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating maintenance record:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Check for overdue maintenance and create tickets
  app.post("/api/maintenance/check-overdue", isAuthenticated, isManager, async (req, res) => {
    try {
      const overdueAssets = await storage.getAssetsWithOverdueMaintenance();
      const createdTickets: any[] = [];

      for (const asset of overdueAssets) {
        // Get the building to find the assigned executive
        const building = await storage.getBuilding(asset.buildingId);
        if (!building || !building.assignedExecutiveId) continue;

        // Check if there's already an open maintenance ticket for this asset
        const existingTickets = await storage.getTickets();
        const hasOpenTicket = existingTickets.some(
          (t) =>
            t.type === "mantencion" &&
            t.buildingId === asset.buildingId &&
            t.title.includes(asset.name) &&
            !["resuelto", "vencido"].includes(t.status)
        );

        if (hasOpenTicket) continue;

        // Calculate days overdue
        const daysOverdue = Math.floor(
          (new Date().getTime() - new Date(asset.nextMaintenanceDate!).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        // Create maintenance ticket
        const ticket = await storage.createTicket({
          buildingId: asset.buildingId,
          title: `Mantención vencida: ${asset.name}`,
          description: `La mantención del equipo "${asset.name}" (${asset.type}) está vencida hace ${daysOverdue} días. Frecuencia requerida: ${asset.maintenanceFrequency || "No especificada"}.`,
          type: "mantencion",
          priority: daysOverdue > 30 ? "rojo" : daysOverdue > 14 ? "amarillo" : "verde",
          status: "pendiente",
          assignedTo: building.assignedExecutiveId,
          createdBy: req.user!.id,
        });

        createdTickets.push({
          ticketId: ticket.id,
          assetName: asset.name,
          buildingId: asset.buildingId,
          daysOverdue,
        });
      }

      res.json({
        message: `Se revisaron ${overdueAssets.length} equipos con mantención vencida`,
        ticketsCreated: createdTickets.length,
        tickets: createdTickets,
      });
    } catch (error) {
      console.error("Error checking overdue maintenance:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // === Visits ===
  app.get("/api/visits", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.user!.id);
      const isManager = isManagerRole(profile);
      
      // Get all visits for managers, or filter for executives
      let visits = await storage.getVisits();
      
      // For non-managers with "assigned" scope, filter by assignment
      if (!isManager && profile?.buildingScope !== "all") {
        // Executives see visits they created OR visits for their assigned buildings
        const buildings = await storage.getBuildings();
        const userBuildingIds = new Set(
          buildings.filter((b) => b.assignedExecutiveId === req.user!.id).map((b) => b.id)
        );
        
        visits = visits.filter((v) =>
          v.executiveId === req.user!.id ||
          userBuildingIds.has(v.buildingId)
        );
      }
      
      // Add building info
      const buildings = await storage.getBuildings();
      const buildingsMap = new Map(buildings.map((b) => [b.id, b]));
      
      const visitsWithBuilding = visits.map((v) => ({
        ...v,
        building: buildingsMap.get(v.buildingId),
      }));
      
      res.json(visitsWithBuilding);
    } catch (error) {
      console.error("Error getting visits:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.get("/api/visits/:id", isAuthenticated, async (req, res) => {
    try {
      const visit = await storage.getVisit(req.params.id);
      if (!visit) {
        return res.status(404).json({ error: "Visita no encontrada" });
      }
      
      const profile = await storage.getUserProfile(req.user!.id);
      const isManager = isManagerRole(profile);
      
      // Check access: user is assigned to visit OR is assigned to the building
      if (!isManager) {
        const hasAccess = await canAccessEntity(req.user!.id, profile, visit);
        if (!hasAccess) {
          return res.status(403).json({ error: "No tienes permiso para ver esta visita" });
        }
      }
      
      const building = await storage.getBuilding(visit.buildingId);
      const checklistItems = await storage.getVisitChecklistItems(visit.id);
      const criticalAssets = await storage.getCriticalAssets(visit.buildingId);
      
      // Get executive name from DEV_USERS
      const { DEV_USERS } = await import("./devAuth");
      const getExecutiveName = (executiveId: string | null | undefined): string | null => {
        if (!executiveId) return null;
        const devUser = DEV_USERS.find((u) => u.id === executiveId);
        if (devUser) {
          return `${devUser.firstName} ${devUser.lastName}`.trim();
        }
        // Fallback: try to extract a readable name from the ID
        return executiveId.includes("-") ? executiveId.split("-").slice(-1)[0] : executiveId;
      };
      
      // Get related tickets with proper role-based filtering
      let relatedTickets = await storage.getTickets({ buildingId: visit.buildingId });
      relatedTickets = relatedTickets.filter((t) => ["pendiente", "en_curso", "vencido"].includes(t.status));
      
      // Filter tickets by access for non-managers with "assigned" scope and strip cost
      if (!isManager) {
        if (profile?.buildingScope !== "all") {
          const buildings = await storage.getBuildings();
          const userBuildingIds = new Set(
            buildings.filter((b) => b.assignedExecutiveId === req.user!.id).map((b) => b.id)
          );
          
          relatedTickets = relatedTickets.filter((t) =>
            t.createdBy === req.user!.id ||
            t.assignedExecutiveId === req.user!.id ||
            userBuildingIds.has(t.buildingId)
          );
        }
        relatedTickets = relatedTickets.map((t) => ({ ...t, cost: null }));
      }
      
      res.json({
        ...visit,
        building,
        checklistItems,
        criticalAssets,
        relatedTickets,
        executiveName: getExecutiveName(visit.executiveId),
      });
    } catch (error) {
      console.error("Error getting visit:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/visits", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.user!.id);
      const userIsManager = isManagerRole(profile);
      
      // Enforce building scope for non-managers
      if (!userIsManager) {
        const canAccess = await canAccessBuilding(req.user!.id, req.body.buildingId, profile);
        if (!canAccess) {
          return res.status(403).json({ error: "No tienes permiso para crear visitas en este edificio" });
        }
      }
      
      // Managers can assign to other executives, otherwise use current user
      const executiveId = (userIsManager && req.body.executiveId) 
        ? req.body.executiveId 
        : req.user!.id;
      
      const visitData = {
        ...req.body,
        executiveId,
        scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined,
      };
      const data = insertVisitSchema.parse(visitData);
      const visit = await storage.createVisit(data);
      
      // Create default checklist items
      const defaultChecklistItems = data.type === "urgente"
        ? [
            "Verificar estado del equipo afectado",
            "Documentar situacion actual",
            "Contactar proveedor si aplica",
            "Tomar fotos del incidente",
            "Registrar incidente",
          ]
        : [
            "Recorrer areas comunes",
            "Verificar iluminacion",
            "Revisar estado de aseo",
            "Inspeccionar equipos criticos",
            "Consultar novedades con conserjeria",
            "Revisar libro de novedades",
            "Atencion de residentes",
          ];
      
      for (let i = 0; i < defaultChecklistItems.length; i++) {
        await storage.createVisitChecklistItem({
          visitId: visit.id,
          itemName: defaultChecklistItems[i],
          isCompleted: false,
          order: i + 1,
        });
      }
      
      res.status(201).json(visit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error creating visit:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.patch("/api/visits/:id/start", isAuthenticated, async (req, res) => {
    try {
      const existingVisit = await storage.getVisit(req.params.id);
      if (!existingVisit) {
        return res.status(404).json({ error: "Visita no encontrada" });
      }
      
      // Check access using canAccessEntity (handles managers and buildingScope "all")
      const profile = await storage.getUserProfile(req.user!.id);
      const hasAccess = await canAccessEntity(req.user!.id, profile, existingVisit);
      if (!hasAccess) {
        return res.status(403).json({ error: "No tienes permiso para iniciar esta visita" });
      }
      
      // Validate status transition
      if (!["programada", "atrasada"].includes(existingVisit.status)) {
        return res.status(400).json({ error: "Solo se pueden iniciar visitas programadas o atrasadas" });
      }
      
      const visit = await storage.updateVisit(req.params.id, {
        status: "en_curso",
        startedAt: new Date(),
        checklistType: req.body.checklistType || "rutina",
      });
      res.json(visit);
    } catch (error) {
      console.error("Error starting visit:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  const updateNotesSchema = z.object({
    notes: z.string().transform((v) => v.trim()).pipe(z.string().min(1, "Notas requeridas")),
  });

  app.patch("/api/visits/:id/notes", isAuthenticated, async (req, res) => {
    try {
      const parseResult = updateNotesSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Notas requeridas", details: parseResult.error.errors });
      }
      const { notes } = parseResult.data;

      const existingVisit = await storage.getVisit(req.params.id);
      if (!existingVisit) {
        return res.status(404).json({ error: "Visita no encontrada" });
      }
      
      const profile = await storage.getUserProfile(req.user!.id);
      const hasAccess = await canAccessEntity(req.user!.id, profile, existingVisit);
      if (!hasAccess) {
        return res.status(403).json({ error: "No tienes permiso para modificar esta visita" });
      }
      
      if (existingVisit.status !== "en_curso") {
        return res.status(400).json({ error: "Solo se pueden actualizar notas de visitas en curso" });
      }
      
      const visit = await storage.updateVisitNotes(req.params.id, notes);
      res.json(visit);
    } catch (error) {
      console.error("Error updating visit notes:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  const completeVisitSchema = z.object({
    notes: z.string().optional().transform((v) => v?.trim() || ""),
    completionObservations: z.string().optional().transform((v) => v?.trim() || null),
  });

  app.patch("/api/visits/:id/complete", isAuthenticated, async (req, res) => {
    try {
      const parseResult = completeVisitSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos inválidos" });
      }
      const { notes, completionObservations } = parseResult.data;

      const existingVisit = await storage.getVisit(req.params.id);
      if (!existingVisit) {
        return res.status(404).json({ error: "Visita no encontrada" });
      }
      
      // Check access using canAccessEntity (handles managers and buildingScope "all")
      const profile = await storage.getUserProfile(req.user!.id);
      const hasAccess = await canAccessEntity(req.user!.id, profile, existingVisit);
      if (!hasAccess) {
        return res.status(403).json({ error: "No tienes permiso para completar esta visita" });
      }
      
      // Validate status - must be in progress
      if (existingVisit.status !== "en_curso") {
        return res.status(400).json({ error: "Solo se pueden completar visitas en curso" });
      }
      
      // Check if all required checklist items are completed
      const checklistItems = await storage.getVisitChecklistItems(req.params.id);
      const incompleteItems = checklistItems.filter((item) => !item.isCompleted);
      if (incompleteItems.length > 0) {
        return res.status(400).json({
          error: "Debes completar todos los items del checklist",
          incompleteCount: incompleteItems.length,
        });
      }
      
      // For urgent visits, require at least one incident
      if (existingVisit.type === "urgente") {
        const incidents = await storage.getIncidents(req.params.id);
        if (incidents.length === 0) {
          return res.status(400).json({
            error: "Las visitas urgentes requieren registrar un incidente antes de cerrar",
          });
        }
      }
      
      const visit = await storage.updateVisit(req.params.id, {
        status: "realizada",
        completedAt: new Date(),
        notes,
        completionObservations,
      });
      res.json(visit);
    } catch (error) {
      console.error("Error completing visit:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  const cancelVisitSchema = z.object({
    cancellationType: z.enum(["reagendada", "eliminada"]),
    cancellationReason: z.string().optional().transform((v) => v?.trim() || null),
  });

  app.patch("/api/visits/:id/cancel", isAuthenticated, async (req, res) => {
    try {
      const parseResult = cancelVisitSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos invalidos" });
      }
      const { cancellationType, cancellationReason } = parseResult.data;

      if (cancellationType === "eliminada" && !cancellationReason) {
        return res.status(400).json({ error: "Debe proporcionar un motivo para eliminar la visita" });
      }

      const existingVisit = await storage.getVisit(req.params.id);
      if (!existingVisit) {
        return res.status(404).json({ error: "Visita no encontrada" });
      }

      const profile = await storage.getUserProfile(req.user!.id);
      const hasAccess = await canAccessEntity(req.user!.id, profile, existingVisit);
      if (!hasAccess) {
        return res.status(403).json({ error: "No tienes permiso para cancelar esta visita" });
      }

      if (existingVisit.status === "realizada") {
        return res.status(400).json({ error: "No se pueden cancelar visitas ya realizadas" });
      }

      const updateData: any = {
        status: "no_realizada",
        cancellationType,
        cancellationReason,
        cancelledAt: new Date(),
        cancelledBy: req.user!.id,
      };

      if (cancellationType === "reagendada" && !existingVisit.visitGroupId) {
        updateData.visitGroupId = existingVisit.id;
        if (!existingVisit.originalScheduledDate) {
          updateData.originalScheduledDate = existingVisit.scheduledDate;
        }
      }

      const visit = await storage.updateVisit(req.params.id, updateData);
      res.json(visit);
    } catch (error) {
      console.error("Error cancelling visit:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  const rescheduleVisitSchema = z.object({
    newScheduledDate: z.string(),
    cancellationReason: z.string().optional().transform((v) => v?.trim() || null),
  });

  app.post("/api/visits/:id/reschedule", isAuthenticated, async (req, res) => {
    try {
      const parseResult = rescheduleVisitSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Datos invalidos" });
      }
      const { newScheduledDate, cancellationReason } = parseResult.data;

      const existingVisit = await storage.getVisit(req.params.id);
      if (!existingVisit) {
        return res.status(404).json({ error: "Visita no encontrada" });
      }

      const profile = await storage.getUserProfile(req.user!.id);
      const hasAccess = await canAccessEntity(req.user!.id, profile, existingVisit);
      if (!hasAccess) {
        return res.status(403).json({ error: "No tienes permiso para reagendar esta visita" });
      }

      if (existingVisit.status === "realizada") {
        return res.status(400).json({ error: "No se pueden reagendar visitas ya realizadas" });
      }

      const visitGroupId = existingVisit.visitGroupId || existingVisit.id;
      const originalScheduledDate = existingVisit.originalScheduledDate || existingVisit.scheduledDate;

      await storage.updateVisit(req.params.id, {
        status: "no_realizada",
        cancellationType: "reagendada",
        cancellationReason,
        cancelledAt: new Date(),
        cancelledBy: req.user!.id,
        visitGroupId,
        originalScheduledDate,
      });

      const newVisitData = {
        buildingId: existingVisit.buildingId,
        executiveId: existingVisit.executiveId,
        type: existingVisit.type,
        status: "programada" as const,
        scheduledDate: new Date(newScheduledDate),
        urgentReason: existingVisit.urgentReason,
        checklistType: existingVisit.checklistType,
        visitGroupId,
        originalScheduledDate,
      };

      const newVisit = await storage.createVisit(newVisitData);

      const oldChecklistItems = await storage.getVisitChecklistItems(req.params.id);
      for (const item of oldChecklistItems) {
        await storage.createVisitChecklistItem({
          visitId: newVisit.id,
          itemName: item.itemName,
          isCompleted: false,
          order: item.order,
        });
      }

      res.status(201).json(newVisit);
    } catch (error) {
      console.error("Error rescheduling visit:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.get("/api/visits/group/:groupId", isAuthenticated, async (req, res) => {
    try {
      const visits = await storage.getVisitsByGroupId(req.params.groupId);
      const buildings = await storage.getBuildings();
      const buildingsMap = new Map(buildings.map((b) => [b.id, b]));
      
      const visitsWithBuilding = visits.map((v) => ({
        ...v,
        building: buildingsMap.get(v.buildingId),
      }));
      
      res.json(visitsWithBuilding);
    } catch (error) {
      console.error("Error getting visit group:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.patch("/api/visits/:id/checklist/:itemId", isAuthenticated, async (req, res) => {
    try {
      // Verify visit exists
      const visit = await storage.getVisit(req.params.id);
      if (!visit) {
        return res.status(404).json({ error: "Visita no encontrada" });
      }
      
      // Check access using canAccessEntity (handles managers and buildingScope "all")
      const profile = await storage.getUserProfile(req.user!.id);
      const hasAccess = await canAccessEntity(req.user!.id, profile, visit);
      if (!hasAccess) {
        return res.status(403).json({ error: "No tienes permiso para modificar esta visita" });
      }
      
      // Verify visit is in progress
      if (visit.status !== "en_curso") {
        return res.status(400).json({ error: "Solo se pueden actualizar checklists de visitas en curso" });
      }
      
      const item = await storage.updateVisitChecklistItem(req.params.itemId, {
        isCompleted: req.body.isCompleted,
        notes: req.body.notes,
      });
      if (!item) {
        return res.status(404).json({ error: "Item no encontrado" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating checklist item:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Visit Photos
  app.get("/api/visits/:id/photos", isAuthenticated, async (req, res) => {
    try {
      const photos = await storage.getVisitPhotos(req.params.id);
      res.json(photos);
    } catch (error) {
      console.error("Error getting visit photos:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/visits/:id/photos", isAuthenticated, async (req, res) => {
    try {
      const data = insertVisitPhotoSchema.parse({
        ...req.body,
        visitId: req.params.id,
        uploadedBy: req.user!.id,
      });
      const photo = await storage.createVisitPhoto(data);
      res.json(photo);
    } catch (error) {
      console.error("Error creating visit photo:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.delete("/api/visits/:id/photos/:photoId", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteVisitPhoto(req.params.photoId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting visit photo:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // === Tickets ===
  app.get("/api/tickets", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.user!.id);
      const isManager = isManagerRole(profile);
      
      const filters: { buildingId?: string; status?: string; visitId?: string } = {};
      
      if (req.query.buildingId) filters.buildingId = req.query.buildingId as string;
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.visitId) filters.visitId = req.query.visitId as string;
      
      let tickets = await storage.getTickets(filters);
      
      // For non-managers with "assigned" scope: show tickets where user is assigned, created by, or building is assigned to user
      if (!isManager && profile?.buildingScope !== "all") {
        const buildings = await storage.getBuildings();
        const userBuildingIds = new Set(
          buildings.filter((b) => b.assignedExecutiveId === req.user!.id).map((b) => b.id)
        );
        
        tickets = tickets.filter((t) =>
          t.createdBy === req.user!.id ||
          t.assignedExecutiveId === req.user!.id ||
          userBuildingIds.has(t.buildingId)
        );
      }
      
      // Add building names and executive info
      const buildings = await storage.getBuildings();
      const buildingsMap = new Map(buildings.map((b) => [b.id, b]));
      
      // Get tickets delegated to current user
      const delegatedTicketIds = await storage.getTicketsDelegatedToUser(req.user!.id);
      
      // Get user names from DEV_USERS (includes executives AND managers)
      const { DEV_USERS } = await import("./devAuth");
      
      const getUserDisplayName = (userId: string | null | undefined): string | null => {
        if (!userId) return null;
        const devUser = DEV_USERS.find((u) => u.id === userId);
        if (devUser) {
          return `${devUser.firstName} ${devUser.lastName}`.trim();
        }
        // Fallback: try to get from executives HR table
        return userId.split("-")[0] || null;
      };
      
      const ticketsWithBuilding = tickets.map((t) => ({
        ...t,
        building: buildingsMap.get(t.buildingId),
        executiveName: getUserDisplayName(t.assignedExecutiveId),
        cost: isManager ? t.cost : null,
        isDelegatedToMe: delegatedTicketIds.has(t.id),
      }));
      
      res.json(ticketsWithBuilding);
    } catch (error) {
      console.error("Error getting tickets:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Get tickets delegated to the current user (for sidebar badge)
  app.get("/api/tickets/delegated-to-me", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const profile = await storage.getUserProfile(userId);
      
      if (!profile) {
        return res.json([]);
      }
      
      if (!isManagerRole(profile)) {
        return res.json([]);
      }
      
      // Use profile.userId since that's what the assignment history uses
      const delegatedTicketIds = await storage.getTicketsDelegatedToUser(profile.userId);
      
      if (delegatedTicketIds.size === 0) {
        return res.json([]);
      }
      
      // Get only pending/active delegated tickets (not resolved)
      const allTickets = await storage.getTickets();
      const delegatedTickets = allTickets.filter(t => 
        delegatedTicketIds.has(t.id) && t.status !== "resuelto"
      );
      console.log(`[delegated-to-me] Returning ${delegatedTickets.length} active delegated tickets`);
      
      res.json(delegatedTickets);
    } catch (error) {
      console.error("Error getting delegated tickets:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.get("/api/tickets/:id", isAuthenticated, async (req, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket no encontrado" });
      }
      
      const profile = await storage.getUserProfile(req.user!.id);
      const isManager = isManagerRole(profile);
      
      // Check access: user created it, is assigned to it, or is assigned to the building
      if (!isManager) {
        const hasAccess = await canAccessEntity(req.user!.id, profile, ticket);
        if (!hasAccess) {
          return res.status(403).json({ error: "No tienes permiso para ver este ticket" });
        }
      }
      
      const building = await storage.getBuilding(ticket.buildingId);
      
      // Get creator name
      let createdByName = null;
      if (ticket.createdBy) {
        const creator = await storage.getUser(ticket.createdBy);
        createdByName = creator ? `${creator.firstName || ""} ${creator.lastName || ""}`.trim() || creator.email : null;
      }
      
      res.json({
        ...ticket,
        building,
        createdByName,
        cost: isManager ? ticket.cost : null,
      });
    } catch (error) {
      console.error("Error getting ticket:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/tickets", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.user!.id);
      const isManager = isManagerRole(profile);
      
      // Enforce building scope for non-managers
      if (!isManager) {
        const canAccess = await canAccessBuilding(req.user!.id, req.body.buildingId, profile);
        if (!canAccess) {
          return res.status(403).json({ error: "No tienes permiso para crear tickets en este edificio" });
        }
      }
      
      // Sanitize cost fields for non-managers
      const sanitizedBody = sanitizeCostFields(req.body, isManager);
      
      // Determine assigned executive
      // If manager creates ticket and no assignee specified, assign to building's executive
      // If executive creates ticket, they are the assignee
      let assignedExecutiveId = req.body.assignedExecutiveId;
      if (!assignedExecutiveId) {
        if (isManager) {
          // Manager creating ticket - assign to building's executive
          const building = await storage.getBuilding(req.body.buildingId);
          assignedExecutiveId = building?.assignedExecutiveId || req.user!.id;
        } else {
          // Executive creating ticket - they are the assignee
          assignedExecutiveId = req.user!.id;
        }
      }
      
      // Convert date strings to Date objects
      const processedBody = {
        ...sanitizedBody,
        createdBy: req.user!.id,
        assignedExecutiveId,
      };
      if (processedBody.scheduledDate && typeof processedBody.scheduledDate === 'string') {
        processedBody.scheduledDate = new Date(processedBody.scheduledDate);
      }
      if (processedBody.startDate && typeof processedBody.startDate === 'string') {
        processedBody.startDate = new Date(processedBody.startDate);
      }
      if (processedBody.endDate && typeof processedBody.endDate === 'string') {
        processedBody.endDate = new Date(processedBody.endDate);
      }
      
      const data = insertTicketSchema.parse(processedBody);
      
      // Ensure cost is null for non-managers
      if (!isManager) {
        (data as any).cost = null;
      }
      
      const ticket = await storage.createTicket(data);
      
      // If requiresExecutiveVisit is true, automatically create a supervision visit
      if (ticket.requiresExecutiveVisit && ticket.assignedExecutiveId && ticket.startDate) {
        try {
          await storage.createVisit({
            buildingId: ticket.buildingId,
            executiveId: ticket.assignedExecutiveId,
            type: "urgente",
            status: "programada",
            scheduledDate: ticket.startDate,
            notes: `Visita de supervisión para ticket: ${ticket.description?.substring(0, 100) || "Sin descripción"}`,
            checklistType: "emergencia",
          });
        } catch (visitError) {
          console.error("Error creating supervision visit:", visitError);
          // Don't fail ticket creation if visit creation fails
        }
      }
      
      // Record initial assignment in history
      if (ticket.assignedExecutiveId) {
        const assigneeProfile = await storage.getUserProfile(ticket.assignedExecutiveId);
        await storage.createTicketAssignmentHistory({
          ticketId: ticket.id,
          assignedToId: ticket.assignedExecutiveId,
          assignedById: req.user!.id,
          assignedToRole: assigneeProfile?.role || "ejecutivo_operaciones",
          previousAssigneeId: null,
          reason: isManager ? "Asignacion automatica al ejecutivo del edificio" : "Asignacion automatica al creador",
          isEscalation: false,
        });
      }
      
      // Create notification for assigned executive (if different from creator)
      if (ticket.assignedExecutiveId && ticket.assignedExecutiveId !== req.user!.id) {
        const building = await storage.getBuilding(ticket.buildingId);
        await storage.createNotification({
          userId: ticket.assignedExecutiveId,
          type: "ticket_asignado",
          title: "Nuevo ticket asignado",
          message: `Te han asignado el ticket "${ticket.description?.substring(0, 50)}..." en ${building?.name || "edificio"}`,
          ticketId: ticket.id,
          isRead: false,
        });
      }
      
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error creating ticket:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.patch("/api/tickets/:id", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.user!.id);
      const isManagerUser = profile && ["gerente_general", "gerente_operaciones"].includes(profile.role);
      
      // Check ownership for non-managers
      const existingTicket = await storage.getTicket(req.params.id);
      if (!existingTicket) {
        return res.status(404).json({ error: "Ticket no encontrado" });
      }
      
      if (!isManagerUser) {
        // Executives can only modify tickets they created or are assigned to
        if (existingTicket.createdBy !== req.user!.id && existingTicket.assignedExecutiveId !== req.user!.id) {
          return res.status(403).json({ error: "No tienes permiso para modificar este ticket" });
        }
      }
      
      // Convert date strings to Date objects
      const patchBody = { ...req.body };
      if (patchBody.scheduledDate && typeof patchBody.scheduledDate === 'string') {
        patchBody.scheduledDate = new Date(patchBody.scheduledDate);
      }
      if (patchBody.startDate && typeof patchBody.startDate === 'string') {
        patchBody.startDate = new Date(patchBody.startDate);
      }
      if (patchBody.endDate && typeof patchBody.endDate === 'string') {
        patchBody.endDate = new Date(patchBody.endDate);
      }
      if (patchBody.workStartedAt && typeof patchBody.workStartedAt === 'string') {
        patchBody.workStartedAt = new Date(patchBody.workStartedAt);
      }
      if (patchBody.workCompletedAt && typeof patchBody.workCompletedAt === 'string') {
        patchBody.workCompletedAt = new Date(patchBody.workCompletedAt);
      }
      if (patchBody.closedAt && typeof patchBody.closedAt === 'string') {
        patchBody.closedAt = new Date(patchBody.closedAt);
      }
      if (patchBody.approvedAt && typeof patchBody.approvedAt === 'string') {
        patchBody.approvedAt = new Date(patchBody.approvedAt);
      }
      
      const data = insertTicketSchema.partial().parse(patchBody);
      
      // Only managers can update cost and priority
      if (!isManagerUser) {
        delete (data as any).cost;
        // Executives cannot escalate priority to red
        if (data.priority === "rojo") {
          delete (data as any).priority;
        }
      }
      
      const ticket = await storage.updateTicket(req.params.id, data);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket no encontrado" });
      }
      
      // Create notification if assigned executive changed
      if (data.assignedExecutiveId && 
          data.assignedExecutiveId !== existingTicket.assignedExecutiveId &&
          data.assignedExecutiveId !== req.user!.id) {
        const building = await storage.getBuilding(ticket.buildingId);
        await storage.createNotification({
          userId: data.assignedExecutiveId,
          type: "ticket_derivado",
          title: "Ticket derivado",
          message: `Te han derivado el ticket "${ticket.description?.substring(0, 50)}..." en ${building?.name || "edificio"}`,
          ticketId: ticket.id,
          isRead: false,
        });
      }
      
      res.json({
        ...ticket,
        cost: isManagerUser ? ticket.cost : null,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error updating ticket:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Escalate ticket to a manager (user can choose who)
  app.post("/api/tickets/:id/escalate", isAuthenticated, async (req, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket no encontrado" });
      }
      
      const { reason, targetUserId } = req.body;
      
      let targetProfile;
      
      if (targetUserId) {
        targetProfile = await storage.getUserProfile(targetUserId);
        if (!targetProfile) {
          return res.status(404).json({ error: "Usuario destino no encontrado" });
        }
        if (targetProfile.role !== "gerente_general" && targetProfile.role !== "gerente_operaciones" && targetProfile.role !== "gerente_comercial") {
          return res.status(400).json({ error: "Solo se puede escalar a gerentes" });
        }
      } else {
        const allProfiles = await db.select().from(userProfiles).where(eq(userProfiles.role, "gerente_operaciones"));
        targetProfile = allProfiles[0];
        if (!targetProfile) {
          return res.status(404).json({ error: "No se encontro Gerente de Operaciones en el sistema" });
        }
      }
      
      const previousAssigneeId = ticket.assignedExecutiveId;
      
      const updatedTicket = await storage.updateTicket(req.params.id, {
        priority: "rojo",
        assignedExecutiveId: targetProfile.userId,
        isEscalated: true,
        escalatedAt: new Date(),
        escalatedBy: req.user!.id,
      });
      
      await storage.createTicketAssignmentHistory({
        ticketId: ticket.id,
        assignedToId: targetProfile.userId,
        assignedById: req.user!.id,
        assignedToRole: targetProfile.role,
        previousAssigneeId,
        reason: reason || `Escalado a ${targetProfile.role === "gerente_general" ? "Gerente General" : targetProfile.role === "gerente_comercial" ? "Gerente Comercial" : "Gerente de Operaciones"}`,
        isEscalation: true,
      });
      
      if (targetProfile.userId !== req.user!.id) {
        const building = await storage.getBuilding(ticket.buildingId);
        await storage.createNotification({
          userId: targetProfile.userId,
          type: "ticket_derivado",
          title: "Ticket escalado",
          message: `Se ha escalado el ticket "${ticket.description?.substring(0, 50)}..." en ${building?.name || "edificio"} a prioridad roja`,
          ticketId: ticket.id,
          isRead: false,
        });
      }
      
      res.json({
        ticket: updatedTicket,
        escalatedTo: {
          userId: targetProfile.userId,
          role: targetProfile.role,
        },
      });
    } catch (error) {
      console.error("Error escalating ticket:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Reassign ticket to another executive (with history tracking)
  app.post("/api/tickets/:id/reassign", isAuthenticated, async (req, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket no encontrado" });
      }
      
      const { assigneeId, reason } = req.body;
      
      if (!assigneeId) {
        return res.status(400).json({ error: "Debe especificar un responsable" });
      }
      
      const assigneeProfile = await storage.getUserProfile(assigneeId);
      if (!assigneeProfile) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      
      const previousAssigneeId = ticket.assignedExecutiveId;
      
      // Update ticket assignment
      const updatedTicket = await storage.updateTicket(req.params.id, {
        assignedExecutiveId: assigneeId,
      });
      
      // Record in assignment history
      await storage.createTicketAssignmentHistory({
        ticketId: ticket.id,
        assignedToId: assigneeId,
        assignedById: req.user!.id,
        assignedToRole: assigneeProfile.role,
        previousAssigneeId,
        reason: reason || "Reasignacion manual",
        isEscalation: false,
      });
      
      // Create notification for new assignee
      if (assigneeId !== req.user!.id) {
        const building = await storage.getBuilding(ticket.buildingId);
        await storage.createNotification({
          userId: assigneeId,
          type: "ticket_derivado",
          title: "Ticket reasignado",
          message: `Te han reasignado el ticket "${ticket.description?.substring(0, 50)}..." en ${building?.name || "edificio"}`,
          ticketId: ticket.id,
          isRead: false,
        });
      }
      
      res.json(updatedTicket);
    } catch (error) {
      console.error("Error reassigning ticket:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Get ticket assignment history
  app.get("/api/tickets/:id/assignment-history", isAuthenticated, async (req, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket no encontrado" });
      }
      
      const history = await storage.getTicketAssignmentHistory(req.params.id);
      
      // Get user names from DEV_USERS
      const { DEV_USERS } = await import("./devAuth");
      
      const getUserName = (userId: string): string => {
        const devUser = DEV_USERS.find((u) => u.id === userId);
        if (devUser) {
          return `${devUser.firstName} ${devUser.lastName}`.trim();
        }
        return userId.split("-")[0] || "Usuario";
      };
      
      // Enrich with user names
      const enrichedHistory = await Promise.all(history.map(async (entry) => {
        const assignedTo = await storage.getUserProfile(entry.assignedToId);
        const assignedBy = await storage.getUserProfile(entry.assignedById);
        
        return {
          ...entry,
          assignedToName: getUserName(entry.assignedToId),
          assignedByName: getUserName(entry.assignedById),
          previousAssigneeName: entry.previousAssigneeId ? getUserName(entry.previousAssigneeId) : null,
          assignedToRole: assignedTo?.role || entry.assignedToRole,
        };
      }));
      
      res.json(enrichedHistory);
    } catch (error) {
      console.error("Error fetching assignment history:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Get ticket work history
  app.get("/api/tickets/:id/work-history", isAuthenticated, async (req, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket no encontrado" });
      }
      
      const profile = await storage.getUserProfile(req.user!.id);
      const hasAccess = await canAccessEntity(req.user!.id, profile, ticket);
      if (!hasAccess) {
        return res.status(403).json({ error: "No tienes acceso a este ticket" });
      }
      
      const cycles = await storage.getTicketWorkCycles(req.params.id);
      res.json(cycles);
    } catch (error) {
      console.error("Error fetching work history:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Restart work on a resolved ticket
  app.post("/api/tickets/:id/restart-work", isAuthenticated, isManager, async (req, res) => {
    try {
      const existingTicket = await storage.getTicket(req.params.id);
      if (!existingTicket) {
        return res.status(404).json({ error: "Ticket no encontrado" });
      }
      
      if (existingTicket.status !== "resuelto") {
        return res.status(400).json({ error: "Solo se puede reiniciar trabajo en tickets resueltos" });
      }
      
      const { reason, committedCompletionAt } = req.body;
      if (!reason || !committedCompletionAt) {
        return res.status(400).json({ error: "Se requiere razon y fecha comprometida" });
      }
      
      // Get current cycle number
      const existingCycles = await storage.getTicketWorkCycles(req.params.id);
      const lastCycleNumber = existingCycles.length > 0 
        ? Math.max(...existingCycles.map(c => c.cycleNumber)) 
        : 0;
      
      // Save the completed cycle before restart
      await storage.createTicketWorkCycle({
        ticketId: req.params.id,
        cycleNumber: lastCycleNumber + 1,
        startedAt: existingTicket.workStartedAt,
        completedAt: existingTicket.workCompletedAt,
        closedAt: existingTicket.closedAt,
        closedBy: existingTicket.closedBy,
        invoiceNumber: existingTicket.invoiceNumber,
        invoiceAmount: existingTicket.invoiceAmount,
        approvedQuoteId: existingTicket.approvedQuoteId,
        approvedBy: existingTicket.approvedBy,
        approvedAt: existingTicket.approvedAt,
        restartReason: reason,
        committedCompletionAt: new Date(committedCompletionAt),
        restartedBy: req.user!.id,
        restartedAt: new Date(),
      });
      
      // Reset all workflow fields including approvals
      const newCycleNumber = lastCycleNumber + 2; // +1 for archived cycle, +1 for new cycle
      const ticket = await storage.updateTicket(req.params.id, {
        status: "pendiente",
        workStartedAt: null,
        workCompletedAt: null,
        closedAt: null,
        closedBy: null,
        invoiceNumber: null,
        invoiceAmount: null,
        approvedQuoteId: null,
        approvedBy: null,
        approvedAt: null,
        committedCompletionAt: new Date(committedCompletionAt),
        currentCycleNumber: newCycleNumber,
        endDate: new Date(committedCompletionAt),
      } as any);
      
      // Reset any approved quotes back to pending
      const quotes = await storage.getTicketQuotes(req.params.id);
      for (const quote of quotes) {
        if (quote.status === "aceptada") {
          await storage.updateTicketQuote(quote.id, { status: "pendiente" });
        }
      }
      
      res.json(ticket);
    } catch (error) {
      console.error("Error restarting ticket work:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // === Incidents ===
  app.get("/api/incidents", isAuthenticated, async (req, res) => {
    try {
      const visitId = req.query.visitId as string | undefined;
      const profile = await storage.getUserProfile(req.user!.id);
      const isManager = isManagerRole(profile);
      
      // If visitId provided, verify ownership for non-managers
      if (visitId && !isManager) {
        const visit = await storage.getVisit(visitId);
        if (!visit) {
          return res.status(404).json({ error: "Visita no encontrada" });
        }
        const hasAccess = await canAccessEntity(req.user!.id, profile, visit);
        if (!hasAccess) {
          return res.status(403).json({ error: "No tienes permiso para ver estos incidentes" });
        }
      }
      
      let incidents = await storage.getIncidents(visitId);
      
      // For non-managers with "assigned" scope without visitId filter, show incidents they created or from their assigned buildings
      if (!isManager && profile?.buildingScope !== "all" && !visitId) {
        const buildings = await storage.getBuildings();
        const userBuildingIds = new Set(
          buildings.filter((b) => b.assignedExecutiveId === req.user!.id).map((b) => b.id)
        );
        
        incidents = incidents.filter((i) =>
          i.createdBy === req.user!.id ||
          userBuildingIds.has(i.buildingId)
        );
      }
      
      res.json(stripCostFields(incidents, isManager));
    } catch (error) {
      console.error("Error getting incidents:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/incidents", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.user!.id);
      const isManager = isManagerRole(profile);
      
      // Enforce building scope for non-managers
      if (!isManager) {
        const canAccess = await canAccessBuilding(req.user!.id, req.body.buildingId, profile);
        if (!canAccess) {
          return res.status(403).json({ error: "No tienes permiso para crear incidentes en este edificio" });
        }
      }
      
      // Sanitize cost fields for non-managers
      const sanitizedBody = sanitizeCostFields(req.body, isManager);
      
      // Convert date strings to Date objects
      const bodyWithDates = {
        ...sanitizedBody,
        createdBy: req.user!.id,
        occurredAt: sanitizedBody.occurredAt ? new Date(sanitizedBody.occurredAt) : undefined,
        repairDate: sanitizedBody.repairDate ? new Date(sanitizedBody.repairDate) : null,
      };
      
      const data = insertIncidentSchema.parse(bodyWithDates);
      
      // Ensure cost is null for non-managers
      if (!isManager) {
        (data as any).cost = null;
      }
      
      const incident = await storage.createIncident(data);
      res.status(201).json(incident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error creating incident:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.patch("/api/incidents/:id", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.user!.id);
      const isManagerUser = profile && ["gerente_general", "gerente_operaciones"].includes(profile.role);
      
      // Check ownership for non-managers
      const existingIncident = await storage.getIncident(req.params.id);
      if (!existingIncident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }
      
      if (!isManagerUser && existingIncident.createdBy !== req.user!.id) {
        return res.status(403).json({ error: "No tienes permiso para modificar este incidente" });
      }
      
      // Convert date strings to Date objects if present
      const bodyWithDates = {
        ...req.body,
        occurredAt: req.body.occurredAt ? new Date(req.body.occurredAt) : undefined,
        repairDate: req.body.repairDate !== undefined ? (req.body.repairDate ? new Date(req.body.repairDate) : null) : undefined,
      };
      
      const data = insertIncidentSchema.partial().parse(bodyWithDates);
      
      // Only managers can update cost
      if (!isManagerUser) {
        delete (data as any).cost;
      }
      
      const incident = await storage.updateIncident(req.params.id, data);
      if (!incident) {
        return res.status(404).json({ error: "Incidente no encontrado" });
      }
      res.json({
        ...incident,
        cost: isManagerUser ? incident.cost : null,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error updating incident:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // === Attachments ===
  // Helper to check access to parent entity for attachments
  async function canAccessAttachmentEntity(
    userId: string,
    profile: UserProfile | null,
    entityType: string,
    entityId: string
  ): Promise<boolean> {
    if (isManagerRole(profile)) return true;
    
    switch (entityType) {
      case "visit": {
        const visit = await storage.getVisit(entityId);
        if (!visit) return false;
        return canAccessEntity(userId, profile, visit);
      }
      case "ticket": {
        const ticket = await storage.getTicket(entityId);
        if (!ticket) return false;
        return canAccessEntity(userId, profile, ticket);
      }
      case "incident": {
        const incident = await storage.getIncident(entityId);
        if (!incident) return false;
        return canAccessEntity(userId, profile, incident);
      }
      case "checklistItem": {
        // Need to get the parent visit
        const item = await storage.getVisitChecklistItem(entityId);
        if (!item) return false;
        const visit = await storage.getVisit(item.visitId);
        if (!visit) return false;
        return canAccessEntity(userId, profile, visit);
      }
      default:
        return false;
    }
  }

  app.get("/api/attachments/:entityType/:entityId", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.user!.id);
      
      // Check access to parent entity
      const hasAccess = await canAccessAttachmentEntity(
        req.user!.id,
        profile,
        req.params.entityType,
        req.params.entityId
      );
      if (!hasAccess) {
        return res.status(403).json({ error: "No tienes permiso para ver estos archivos" });
      }
      
      const attachments = await storage.getAttachments(req.params.entityType, req.params.entityId);
      res.json(attachments);
    } catch (error) {
      console.error("Error getting attachments:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/attachments", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.user!.id);
      
      // Check access to parent entity
      const hasAccess = await canAccessAttachmentEntity(
        req.user!.id,
        profile,
        req.body.entityType,
        req.body.entityId
      );
      if (!hasAccess) {
        return res.status(403).json({ error: "No tienes permiso para agregar archivos" });
      }
      
      const data = insertAttachmentSchema.parse({
        ...req.body,
        uploadedBy: req.user!.id,
      });
      const attachment = await storage.createAttachment(data);
      res.status(201).json(attachment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error creating attachment:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.delete("/api/attachments/:id", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.user!.id);
      const isManager = isManagerRole(profile);
      
      // Get the attachment to check ownership
      const attachment = await storage.getAttachment(req.params.id);
      if (!attachment) {
        return res.status(404).json({ error: "Archivo no encontrado" });
      }
      
      // Only uploader or managers can delete
      if (!isManager && attachment.uploadedBy !== req.user!.id) {
        return res.status(403).json({ error: "No tienes permiso para eliminar este archivo" });
      }
      
      await storage.deleteAttachment(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting attachment:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // ========== MAINTAINER CATEGORIES ROUTES ==========
  
  app.get("/api/maintainers/categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getMaintainerCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching maintainer categories:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/maintainers/categories", isAuthenticated, isManager, async (req, res) => {
    try {
      const data = insertMaintainerCategorySchema.parse({
        ...req.body,
        createdBy: req.user!.id,
      });
      const category = await storage.createMaintainerCategory(data);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error creating maintainer category:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.delete("/api/maintainers/categories/:id", isAuthenticated, isManager, async (req, res) => {
    try {
      const category = await storage.getMaintainerCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ error: "Categoria no encontrada" });
      }
      if (category.isDefault) {
        return res.status(400).json({ error: "No se puede eliminar una categoria por defecto" });
      }
      await storage.deleteMaintainerCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting maintainer category:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // ========== MAINTAINERS ROUTES ==========

  app.get("/api/maintainers", isAuthenticated, async (req, res) => {
    try {
      const maintainersList = await storage.getMaintainers();
      
      // For each maintainer, get their category links
      const maintainersWithCategories = await Promise.all(
        maintainersList.map(async (m) => {
          const links = await storage.getMaintainerCategoryLinks(m.id);
          const categoryIds = links.map(l => l.categoryId);
          return { ...m, categoryIds };
        })
      );
      
      res.json(maintainersWithCategories);
    } catch (error) {
      console.error("Error fetching maintainers:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.get("/api/maintainers/by-category/:categoryId", isAuthenticated, async (req, res) => {
    try {
      const maintainersList = await storage.getMaintainersByCategory(req.params.categoryId);
      res.json(maintainersList);
    } catch (error) {
      console.error("Error fetching maintainers by category:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.get("/api/maintainers/:id", isAuthenticated, async (req, res) => {
    try {
      const maintainer = await storage.getMaintainer(req.params.id);
      if (!maintainer) {
        return res.status(404).json({ error: "Mantenedor no encontrado" });
      }
      
      const links = await storage.getMaintainerCategoryLinks(maintainer.id);
      const categoryIds = links.map(l => l.categoryId);
      
      res.json({ ...maintainer, categoryIds });
    } catch (error) {
      console.error("Error fetching maintainer:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/maintainers", isAuthenticated, isManager, async (req, res) => {
    try {
      const { categoryIds, ...maintainerData } = req.body;
      
      const data = insertMaintainerSchema.parse({
        ...maintainerData,
        createdBy: req.user!.id,
      });
      
      const maintainer = await storage.createMaintainer(data);
      
      // Link categories if provided
      if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
        await storage.replaceMaintainerCategories(maintainer.id, categoryIds);
      }
      
      const links = await storage.getMaintainerCategoryLinks(maintainer.id);
      res.status(201).json({ ...maintainer, categoryIds: links.map(l => l.categoryId) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error creating maintainer:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.patch("/api/maintainers/:id", isAuthenticated, isManager, async (req, res) => {
    try {
      const { categoryIds, ...maintainerData } = req.body;
      
      const maintainer = await storage.updateMaintainer(req.params.id, maintainerData);
      if (!maintainer) {
        return res.status(404).json({ error: "Mantenedor no encontrado" });
      }
      
      // Update categories if provided
      if (categoryIds && Array.isArray(categoryIds)) {
        await storage.replaceMaintainerCategories(maintainer.id, categoryIds);
      }
      
      const links = await storage.getMaintainerCategoryLinks(maintainer.id);
      res.json({ ...maintainer, categoryIds: links.map(l => l.categoryId) });
    } catch (error) {
      console.error("Error updating maintainer:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.delete("/api/maintainers/:id", isAuthenticated, isManager, async (req, res) => {
    try {
      const maintainer = await storage.getMaintainer(req.params.id);
      if (!maintainer) {
        return res.status(404).json({ error: "Mantenedor no encontrado" });
      }
      await storage.deleteMaintainer(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting maintainer:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // ========== TICKET QUOTES ROUTES ==========

  app.get("/api/tickets/:ticketId/quotes", isAuthenticated, async (req, res) => {
    try {
      const ticket = await storage.getTicket(req.params.ticketId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket no encontrado" });
      }
      
      const profile = await storage.getUserProfile(req.user!.id);
      const hasAccess = await canAccessEntity(req.user!.id, profile, ticket);
      if (!hasAccess) {
        return res.status(403).json({ error: "No tienes acceso a este ticket" });
      }
      
      const quotes = await storage.getTicketQuotes(req.params.ticketId);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching ticket quotes:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/tickets/:ticketId/quotes", isAuthenticated, async (req, res) => {
    try {
      const ticket = await storage.getTicket(req.params.ticketId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket no encontrado" });
      }
      
      const profile = await storage.getUserProfile(req.user!.id);
      const hasAccess = await canAccessEntity(req.user!.id, profile, ticket);
      if (!hasAccess) {
        return res.status(403).json({ error: "No tienes acceso a este ticket" });
      }
      
      const data = insertTicketQuoteSchema.parse({
        ...req.body,
        ticketId: req.params.ticketId,
        createdBy: req.user!.id,
      });
      
      const quote = await storage.createTicketQuote(data);
      res.status(201).json(quote);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error creating ticket quote:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.patch("/api/tickets/:ticketId/quotes/:quoteId", isAuthenticated, isManager, async (req, res) => {
    try {
      const quote = await storage.updateTicketQuote(req.params.quoteId, req.body);
      if (!quote) {
        return res.status(404).json({ error: "Cotizacion no encontrada" });
      }
      res.json(quote);
    } catch (error) {
      console.error("Error updating ticket quote:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.delete("/api/tickets/:ticketId/quotes/:quoteId", isAuthenticated, isManager, async (req, res) => {
    try {
      await storage.deleteTicketQuote(req.params.quoteId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting ticket quote:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // ========== TICKET PHOTOS ROUTES ==========

  app.get("/api/tickets/:ticketId/photos", isAuthenticated, async (req, res) => {
    try {
      const photos = await storage.getTicketPhotos(req.params.ticketId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching ticket photos:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/tickets/:ticketId/photos", isAuthenticated, async (req, res) => {
    try {
      const data = insertTicketPhotoSchema.parse({
        ...req.body,
        ticketId: req.params.ticketId,
        uploadedBy: req.user!.id,
      });
      const photo = await storage.createTicketPhoto(data);
      res.status(201).json(photo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error creating ticket photo:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.delete("/api/tickets/:ticketId/photos/:photoId", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTicketPhoto(req.params.photoId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting ticket photo:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // ========== TICKET COMMUNICATIONS ROUTES ==========

  app.get("/api/tickets/:ticketId/communications", isAuthenticated, async (req, res) => {
    try {
      const communications = await storage.getTicketCommunications(req.params.ticketId);
      res.json(communications);
    } catch (error) {
      console.error("Error fetching ticket communications:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/tickets/:ticketId/communications", isAuthenticated, async (req, res) => {
    try {
      const data = insertTicketCommunicationSchema.parse({
        ...req.body,
        ticketId: req.params.ticketId,
        sentBy: req.user!.id,
      });
      const communication = await storage.createTicketCommunication(data);
      res.status(201).json(communication);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error creating ticket communication:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.patch("/api/tickets/:ticketId/communications/:commId/acknowledge", isAuthenticated, async (req, res) => {
    try {
      const communication = await storage.acknowledgeTicketCommunication(req.params.commId, req.user!.id);
      if (!communication) {
        return res.status(404).json({ error: "Comunicado no encontrado" });
      }
      res.json(communication);
    } catch (error) {
      console.error("Error acknowledging communication:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.patch("/api/tickets/:ticketId/communications/:commId", isAuthenticated, async (req, res) => {
    try {
      const { subject, problemDescription, actionPlan } = req.body;
      const communication = await storage.updateTicketCommunication(req.params.commId, {
        subject,
        problemDescription,
        actionPlan,
      });
      if (!communication) {
        return res.status(404).json({ error: "Aviso no encontrado" });
      }
      res.json(communication);
    } catch (error) {
      console.error("Error updating communication:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // ========== EXECUTIVES ROUTES ==========

  // Get all executives (with optional status filter)
  app.get("/api/executives", isAuthenticated, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const execs = await storage.getExecutivesList(status);
      
      // For each executive, get their building assignments
      const execsWithAssignments = await Promise.all(execs.map(async (exec) => {
        const assignments = await storage.getExecutiveAssignments(exec.id);
        const buildingIds = assignments.map(a => a.buildingId);
        const assignedBuildings = await Promise.all(
          buildingIds.map(id => storage.getBuilding(id))
        );
        return {
          ...exec,
          assignments,
          buildings: assignedBuildings.filter(Boolean),
        };
      }));
      
      res.json(execsWithAssignments);
    } catch (error) {
      console.error("Error fetching executives:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Get single executive with full details
  app.get("/api/executives/:id", isAuthenticated, async (req, res) => {
    try {
      const exec = await storage.getExecutive(req.params.id);
      if (!exec) {
        return res.status(404).json({ error: "Ejecutivo no encontrado" });
      }
      
      const assignments = await storage.getExecutiveAssignments(exec.id);
      const documents = await storage.getExecutiveDocuments(exec.id);
      const buildingIds = assignments.map(a => a.buildingId);
      const assignedBuildings = await Promise.all(
        buildingIds.map(id => storage.getBuilding(id))
      );
      
      res.json({
        ...exec,
        assignments,
        documents,
        buildings: assignedBuildings.filter(Boolean),
      });
    } catch (error) {
      console.error("Error fetching executive:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Create new executive
  app.post("/api/executives", isAuthenticated, async (req, res) => {
    try {
      const { buildingIds, ...execData } = req.body;
      const insertExecutiveSchema = (await import("@shared/schema")).insertExecutiveSchema;
      const data = insertExecutiveSchema.parse({
        ...execData,
        createdBy: (req.user as any).id,
      });
      
      const exec = await storage.createExecutive(data);
      
      // Assign buildings if provided
      if (buildingIds && Array.isArray(buildingIds) && buildingIds.length > 0) {
        await storage.replaceExecutiveAssignments(exec.id, buildingIds, (req.user as any).id);
      }
      
      res.status(201).json(exec);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error creating executive:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Update executive
  app.patch("/api/executives/:id", isAuthenticated, async (req, res) => {
    try {
      const { buildingIds, ...updateData } = req.body;
      
      const exec = await storage.updateExecutive(req.params.id, updateData);
      if (!exec) {
        return res.status(404).json({ error: "Ejecutivo no encontrado" });
      }
      
      // Update building assignments if provided
      if (buildingIds && Array.isArray(buildingIds)) {
        await storage.replaceExecutiveAssignments(exec.id, buildingIds, (req.user as any).id);
      }
      
      res.json(exec);
    } catch (error) {
      console.error("Error updating executive:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Deactivate executive (soft delete)
  app.post("/api/executives/:id/deactivate", isAuthenticated, async (req, res) => {
    try {
      const { terminationDate } = req.body;
      const exec = await storage.deactivateExecutive(
        req.params.id, 
        terminationDate ? new Date(terminationDate) : undefined
      );
      if (!exec) {
        return res.status(404).json({ error: "Ejecutivo no encontrado" });
      }
      res.json(exec);
    } catch (error) {
      console.error("Error deactivating executive:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Reactivate executive
  app.post("/api/executives/:id/reactivate", isAuthenticated, async (req, res) => {
    try {
      const exec = await storage.updateExecutive(req.params.id, { 
        employmentStatus: "activo",
        terminationDate: null,
      });
      if (!exec) {
        return res.status(404).json({ error: "Ejecutivo no encontrado" });
      }
      res.json(exec);
    } catch (error) {
      console.error("Error reactivating executive:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // ========== EXECUTIVE DOCUMENTS ROUTES ==========

  // Get executive documents
  app.get("/api/executives/:id/documents", isAuthenticated, async (req, res) => {
    try {
      const documents = await storage.getExecutiveDocuments(req.params.id);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching executive documents:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Create executive document
  app.post("/api/executives/:id/documents", isAuthenticated, async (req, res) => {
    try {
      const insertExecutiveDocumentSchema = (await import("@shared/schema")).insertExecutiveDocumentSchema;
      const data = insertExecutiveDocumentSchema.parse({
        ...req.body,
        executiveId: req.params.id,
        uploadedBy: (req.user as any).id,
      });
      
      const doc = await storage.createExecutiveDocument(data);
      res.status(201).json(doc);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Datos invalidos", details: error.errors });
      }
      console.error("Error creating executive document:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Delete executive document
  app.delete("/api/executives/:id/documents/:docId", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteExecutiveDocument(req.params.docId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting executive document:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // ========== EXECUTIVE ASSIGNMENTS ROUTES ==========

  // Get executive assignments
  app.get("/api/executives/:id/assignments", isAuthenticated, async (req, res) => {
    try {
      const assignments = await storage.getExecutiveAssignments(req.params.id);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching executive assignments:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Replace executive assignments
  app.put("/api/executives/:id/assignments", isAuthenticated, async (req, res) => {
    try {
      const { buildingIds } = req.body;
      if (!Array.isArray(buildingIds)) {
        return res.status(400).json({ error: "buildingIds debe ser un array" });
      }
      
      const assignments = await storage.replaceExecutiveAssignments(
        req.params.id, 
        buildingIds, 
        (req.user as any).id
      );
      res.json(assignments);
    } catch (error) {
      console.error("Error replacing executive assignments:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // ========== NOTIFICATIONS ROUTES ==========

  // Get user notifications
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getNotifications(req.user!.id);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/unread-count", isAuthenticated, async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.user!.id);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const notification = await storage.markNotificationAsRead(req.params.id);
      if (!notification) {
        return res.status(404).json({ error: "Notificacion no encontrada" });
      }
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Mark all notifications as read
  app.patch("/api/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      await storage.markAllNotificationsAsRead(req.user!.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all as read:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // ========== REPORTS ROUTES ==========

  // Get expense data for export (gerente_general and gerente_comercial only)
  app.get("/api/reports/expenses", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !["gerente_general", "gerente_comercial"].includes(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const { buildingId, month, year } = req.query;
      
      // Get closed tickets with invoice info
      const allTickets = await storage.getTickets();
      
      let filteredTickets = allTickets.filter(t => 
        t.status === "resuelto" && 
        t.invoiceAmount && 
        parseFloat(t.invoiceAmount) > 0
      );

      // Filter by building if specified
      if (buildingId && buildingId !== "all") {
        filteredTickets = filteredTickets.filter(t => t.buildingId === buildingId);
      }

      // Filter by month and year if specified
      if (month && year) {
        const monthNum = parseInt(month as string);
        const yearNum = parseInt(year as string);
        filteredTickets = filteredTickets.filter(t => {
          if (!t.closedAt) return false;
          const closedDate = new Date(t.closedAt);
          return closedDate.getMonth() + 1 === monthNum && closedDate.getFullYear() === yearNum;
        });
      }

      // Get buildings and maintainers for names
      const buildings = await storage.getBuildings();
      const maintainers = await storage.getMaintainers();
      const categories = await storage.getMaintainerCategories();

      const buildingMap = new Map(buildings.map(b => [b.id, b.name]));
      const maintainerMap = new Map(maintainers.map(m => [m.id, m.companyName]));
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));

      // Map tickets to expense report format
      const expenses = filteredTickets.map((t, index) => ({
        numero: index + 1,
        edificio: buildingMap.get(t.buildingId) || "Desconocido",
        fondo: "Gasto Común",
        subfondo: t.categoryId ? (categoryMap.get(t.categoryId) || "Otros") : "Otros",
        descripcion: t.description,
        monto: parseFloat(t.invoiceAmount || "0"),
        documento: t.invoiceNumber || "",
        fechaEgreso: t.closedAt ? new Date(t.closedAt).toLocaleDateString("es-CL") : "",
        proveedor: t.maintainerId ? (maintainerMap.get(t.maintainerId) || "") : "",
        formaPago: "transferencia",
      }));

      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Generate Excel file for expenses
  app.get("/api/reports/expenses/excel", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !["gerente_general", "gerente_comercial"].includes(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const { buildingId, month, year } = req.query;
      const XLSX = await import("xlsx");
      
      // Get closed tickets with invoice info
      const allTickets = await storage.getTickets();
      
      let filteredTickets = allTickets.filter(t => 
        t.status === "resuelto" && 
        t.invoiceAmount && 
        parseFloat(t.invoiceAmount) > 0
      );

      // Filter by building if specified
      if (buildingId && buildingId !== "all") {
        filteredTickets = filteredTickets.filter(t => t.buildingId === buildingId);
      }

      // Filter by month and year if specified
      if (month && year) {
        const monthNum = parseInt(month as string);
        const yearNum = parseInt(year as string);
        filteredTickets = filteredTickets.filter(t => {
          if (!t.closedAt) return false;
          const closedDate = new Date(t.closedAt);
          return closedDate.getMonth() + 1 === monthNum && closedDate.getFullYear() === yearNum;
        });
      }

      // Get buildings and maintainers for names
      const buildings = await storage.getBuildings();
      const maintainers = await storage.getMaintainers();
      const categories = await storage.getMaintainerCategories();

      const buildingMap = new Map(buildings.map(b => [b.id, b.name]));
      const maintainerMap = new Map(maintainers.map(m => [m.id, m.companyName]));
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));

      // Create worksheet data in Edipro format
      const wsData = [
        ["numero", "fondo", "subfondo", "descripcion", "monto", "documento", "fecha egreso", "fecha banco", "anulado", "Proveedor", "numero respaldo", "forma de pago", "fecha cheque"],
      ];

      filteredTickets.forEach((t, index) => {
        wsData.push([
          String(index + 1),
          "Gasto Común",
          t.categoryId ? (categoryMap.get(t.categoryId) || "Otros") : "Otros",
          t.description,
          t.invoiceAmount || "0",
          t.invoiceNumber || "",
          t.closedAt ? new Date(t.closedAt).toLocaleDateString("es-CL") : "",
          "",
          "no",
          t.maintainerId ? (maintainerMap.get(t.maintainerId) || "") : "",
          "",
          "transferencia",
          "",
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Egresos");

      // Generate buffer
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      // Build filename
      const building = buildingId && buildingId !== "all" ? buildingMap.get(buildingId as string) : "todos";
      const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
      const monthName = month ? monthNames[parseInt(month as string) - 1] : "todos";
      const filename = `egresos_${building}_${monthName}_${year || "todos"}.xlsx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buf);
    } catch (error) {
      console.error("Error generating Excel:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Regulatory Compliance Report - accessible to all authenticated users
  app.get("/api/reports/regulatory-compliance", isAuthenticated, async (req, res) => {
    try {
      const { buildingId } = req.query;
      
      const allBuildings = await storage.getBuildings();
      const allEquipment = await storage.getCriticalEquipment();
      const allVisits = await storage.getVisits();
      const allTickets = await storage.getTickets();
      
      // Filter buildings if specific one requested
      const buildings = buildingId && buildingId !== "all" 
        ? allBuildings.filter(b => b.id === buildingId)
        : allBuildings.filter(b => b.status === "activo");
      
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const complianceData = buildings.map(building => {
        // Check regulation document
        const hasRegulationDocument = !!building.regulationDocumentUrl;
        
        // Get building equipment
        const buildingEquipment = allEquipment.filter(e => e.buildingId === building.id);
        const totalEquipment = buildingEquipment.length;
        const equipmentWithMaintenance = buildingEquipment.filter(e => e.lastMaintenanceDate).length;
        const equipmentOverdue = buildingEquipment.filter(e => {
          if (!e.nextMaintenanceDate) return false;
          return new Date(e.nextMaintenanceDate) < now;
        }).length;
        
        // Get building visits in last 30 days
        const buildingVisits = allVisits.filter(v => 
          v.buildingId === building.id && 
          v.status === "realizada" &&
          v.completedAt && new Date(v.completedAt) >= thirtyDaysAgo
        );
        const recentVisitsCount = buildingVisits.length;
        
        // Get open tickets for building
        const buildingTickets = allTickets.filter(t => t.buildingId === building.id);
        const openTickets = buildingTickets.filter(t => 
          !["resuelto", "cancelado"].includes(t.status)
        ).length;
        const urgentTickets = buildingTickets.filter(t => 
          t.priority === "rojo" && !["resuelto", "cancelado"].includes(t.status)
        ).length;
        
        // Calculate compliance score (0-100) - Binary scoring: each criterion is all or nothing
        let score = 0;
        
        // Regulation document (25 points) - Must have document uploaded
        if (hasRegulationDocument) score += 25;
        
        // Equipment maintenance (25 points) - No equipment overdue OR no equipment at all
        if (equipmentOverdue === 0) score += 25;
        
        // Recent visits (25 points) - At least 4 visits in last 30 days (1 per week)
        if (recentVisitsCount >= 4) score += 25;
        
        // No urgent tickets (25 points) - Zero urgent tickets pending
        if (urgentTickets === 0) score += 25;
        
        const compliancePercent = score; // Score is already 0-100 (4 criteria x 25 points each)
        
        // Determine status
        let complianceStatus: "cumple" | "parcial" | "no_cumple";
        if (compliancePercent >= 80) complianceStatus = "cumple";
        else if (compliancePercent >= 50) complianceStatus = "parcial";
        else complianceStatus = "no_cumple";
        
        return {
          buildingId: building.id,
          buildingName: building.name,
          buildingAddress: building.address,
          hasRegulationDocument,
          regulationDocumentUrl: building.regulationDocumentUrl,
          totalEquipment,
          equipmentWithMaintenance,
          equipmentOverdue,
          recentVisitsCount,
          openTickets,
          urgentTickets,
          compliancePercent,
          complianceStatus,
        };
      });
      
      // Summary statistics
      const summary = {
        totalBuildings: complianceData.length,
        compliant: complianceData.filter(c => c.complianceStatus === "cumple").length,
        partial: complianceData.filter(c => c.complianceStatus === "parcial").length,
        nonCompliant: complianceData.filter(c => c.complianceStatus === "no_cumple").length,
        withRegulation: complianceData.filter(c => c.hasRegulationDocument).length,
        withOverdueEquipment: complianceData.filter(c => c.equipmentOverdue > 0).length,
        averageCompliance: complianceData.length > 0 
          ? Math.round(complianceData.reduce((sum, c) => sum + c.compliancePercent, 0) / complianceData.length)
          : 0,
      };
      
      res.json({ buildings: complianceData, summary });
    } catch (error) {
      console.error("Error fetching regulatory compliance:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Helper function to check if user is a manager
  const isManagerRole = (role: string) => {
    return ["gerente_general", "gerente_operaciones", "gerente_comercial"].includes(role);
  };

  // Visits Report - for managers only (with analytical metrics)
  app.get("/api/reports/visits", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !isManagerRole(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const { buildingId, startDate, endDate } = req.query;
      
      let visits = await storage.getVisits();
      const allBuildings = await storage.getBuildings();
      const activeBuildings = allBuildings.filter(b => b.status === "activo");
      
      if (buildingId && buildingId !== "all") {
        visits = visits.filter(v => v.buildingId === buildingId);
      }
      
      if (startDate) {
        const start = new Date(startDate as string);
        visits = visits.filter(v => new Date(v.scheduledDate) >= start);
      }
      
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        visits = visits.filter(v => new Date(v.scheduledDate) <= end);
      }
      
      const buildingMap = new Map(allBuildings.map(b => [b.id, b.name]));
      const users = await storage.getUsers();
      const userMap = new Map(users.map(u => [u.id, `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email]));
      
      // Calculate coverage: % of buildings with at least one visit
      const visitedBuildingIds = new Set(visits.map(v => v.buildingId));
      const coveragePercent = activeBuildings.length > 0 
        ? Math.round((visitedBuildingIds.size / activeBuildings.length) * 100)
        : 0;
      
      // Calculate punctuality: completed visits within scheduled date (same day)
      const completedVisits = visits.filter(v => v.status === "realizada" && v.completedAt);
      let punctualVisits = 0;
      let lateVisits = 0;
      completedVisits.forEach(v => {
        const scheduled = new Date(v.scheduledDate);
        const completed = new Date(v.completedAt!);
        scheduled.setHours(0,0,0,0);
        completed.setHours(0,0,0,0);
        if (completed <= scheduled) {
          punctualVisits++;
        } else {
          lateVisits++;
        }
      });
      const punctualityPercent = completedVisits.length > 0
        ? Math.round((punctualVisits / completedVisits.length) * 100)
        : 0;
      
      // Calculate productivity by executive
      const executiveProductivity: Record<string, { name: string, total: number, completed: number, cancelled: number }> = {};
      visits.forEach(v => {
        const execName = userMap.get(v.executiveId) || v.executiveId;
        if (!executiveProductivity[v.executiveId]) {
          executiveProductivity[v.executiveId] = { name: execName, total: 0, completed: 0, cancelled: 0 };
        }
        executiveProductivity[v.executiveId].total++;
        if (v.status === "realizada") executiveProductivity[v.executiveId].completed++;
        if (v.status === "cancelada") executiveProductivity[v.executiveId].cancelled++;
      });
      
      // Calculate average time in field (for completed visits with start/end times)
      const visitsWithDuration = completedVisits.filter(v => v.startedAt && v.completedAt);
      let totalMinutes = 0;
      const durationByType: Record<string, { count: number, totalMinutes: number }> = {};
      visitsWithDuration.forEach(v => {
        const start = new Date(v.startedAt!);
        const end = new Date(v.completedAt!);
        const minutes = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60));
        totalMinutes += minutes;
        
        if (!durationByType[v.type]) {
          durationByType[v.type] = { count: 0, totalMinutes: 0 };
        }
        durationByType[v.type].count++;
        durationByType[v.type].totalMinutes += minutes;
      });
      const avgDurationMinutes = visitsWithDuration.length > 0
        ? Math.round(totalMinutes / visitsWithDuration.length)
        : 0;
      
      // Cancellation patterns
      const cancelledVisits = visits.filter(v => v.status === "cancelada");
      const cancellationReasons: Record<string, number> = {};
      cancelledVisits.forEach(v => {
        const reason = (v as any).cancellationType || "sin_especificar";
        cancellationReasons[reason] = (cancellationReasons[reason] || 0) + 1;
      });
      
      const data = visits.map(v => ({
        id: v.id,
        buildingId: v.buildingId,
        executiveId: v.executiveId,
        edificio: buildingMap.get(v.buildingId) || v.buildingId,
        ejecutivo: userMap.get(v.executiveId) || v.executiveId,
        tipo: v.type === "rutina" ? "Rutina" : v.type === "urgente" ? "Urgente" : "Seguimiento",
        estado: v.status === "realizada" ? "Realizada" : v.status === "programada" ? "Programada" : v.status === "cancelada" ? "Cancelada" : v.status,
        fechaProgramada: v.scheduledDate,
        fechaInicio: v.startedAt,
        fechaFin: v.completedAt,
        notas: v.notes || "",
        observaciones: v.completionObservations || "",
        duracionMinutos: v.startedAt && v.completedAt 
          ? Math.round((new Date(v.completedAt).getTime() - new Date(v.startedAt).getTime()) / (1000 * 60))
          : null,
      }));
      
      const summary = {
        total: data.length,
        realizadas: data.filter(v => v.estado === "Realizada").length,
        programadas: data.filter(v => v.estado === "Programada").length,
        canceladas: data.filter(v => v.estado === "Cancelada").length,
      };
      
      const analytics = {
        coverage: {
          totalBuildings: activeBuildings.length,
          visitedBuildings: visitedBuildingIds.size,
          coveragePercent,
        },
        punctuality: {
          totalCompleted: completedVisits.length,
          punctual: punctualVisits,
          late: lateVisits,
          punctualityPercent,
        },
        productivity: Object.values(executiveProductivity).map(e => ({
          ...e,
          completionRate: e.total > 0 ? Math.round((e.completed / e.total) * 100) : 0,
        })),
        duration: {
          avgMinutes: avgDurationMinutes,
          byType: Object.entries(durationByType).map(([type, d]) => ({
            type: type === "rutina" ? "Rutina" : type === "urgente" ? "Urgente" : "Seguimiento",
            avgMinutes: d.count > 0 ? Math.round(d.totalMinutes / d.count) : 0,
            count: d.count,
          })),
        },
        cancellations: {
          total: cancelledVisits.length,
          byReason: Object.entries(cancellationReasons).map(([reason, count]) => ({ reason, count })),
        },
      };
      
      res.json({ data, summary, analytics });
    } catch (error) {
      console.error("Error fetching visits report:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Tickets Report - for managers only (with analytical metrics)
  app.get("/api/reports/tickets", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !isManagerRole(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const { buildingId, startDate, endDate, status, priority } = req.query;
      
      let tickets = await storage.getTickets();
      const allTickets = [...tickets]; // Keep all for analytics
      
      if (buildingId && buildingId !== "all") {
        tickets = tickets.filter(t => t.buildingId === buildingId);
      }
      
      if (startDate) {
        const start = new Date(startDate as string);
        tickets = tickets.filter(t => new Date(t.createdAt) >= start);
      }
      
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        tickets = tickets.filter(t => new Date(t.createdAt) <= end);
      }
      
      if (status && status !== "all") {
        tickets = tickets.filter(t => t.status === status);
      }
      
      if (priority && priority !== "all") {
        tickets = tickets.filter(t => t.priority === priority);
      }
      
      const buildings = await storage.getBuildings();
      const buildingMap = new Map(buildings.map(b => [b.id, b.name]));
      const users = await storage.getUsers();
      const userMap = new Map(users.map(u => [u.id, `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email]));
      
      // Semáforo General - tickets by priority and status
      const semaforo = {
        rojo: { total: 0, abiertos: 0, enProgreso: 0, resueltos: 0 },
        amarillo: { total: 0, abiertos: 0, enProgreso: 0, resueltos: 0 },
        verde: { total: 0, abiertos: 0, enProgreso: 0, resueltos: 0 },
      };
      tickets.forEach(t => {
        const pri = t.priority as keyof typeof semaforo;
        if (semaforo[pri]) {
          semaforo[pri].total++;
          if (t.status === "pendiente") semaforo[pri].abiertos++;
          else if (t.status === "en_curso" || t.status === "trabajo_completado") semaforo[pri].enProgreso++;
          else if (t.status === "resuelto") semaforo[pri].resueltos++;
        }
      });
      
      // Tickets vencidos - overdue analysis
      const now = new Date();
      const overdueTickets = tickets.filter(t => {
        if (t.status === "resuelto") return false;
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < now;
      });
      
      // Resolution time by ticket type
      const resolvedTickets = tickets.filter(t => t.status === "resuelto" && t.createdAt && t.resolvedAt);
      const resolutionByType: Record<string, { count: number, totalDays: number }> = {};
      resolvedTickets.forEach(t => {
        const type = t.ticketType || "otro";
        if (!resolutionByType[type]) {
          resolutionByType[type] = { count: 0, totalDays: 0 };
        }
        const created = new Date(t.createdAt);
        const resolved = new Date(t.resolvedAt!);
        const days = Math.max(0, (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        resolutionByType[type].count++;
        resolutionByType[type].totalDays += days;
      });
      
      // Cost by building
      const costByBuilding: Record<string, { name: string, total: number, count: number }> = {};
      tickets.filter(t => t.invoiceAmount && parseFloat(t.invoiceAmount) > 0).forEach(t => {
        const bName = buildingMap.get(t.buildingId) || t.buildingId;
        if (!costByBuilding[t.buildingId]) {
          costByBuilding[t.buildingId] = { name: bName, total: 0, count: 0 };
        }
        costByBuilding[t.buildingId].total += parseFloat(t.invoiceAmount!);
        costByBuilding[t.buildingId].count++;
      });
      
      // Escalations analysis
      const escalatedTickets = tickets.filter(t => t.escalatedTo);
      const escalationReasons: Record<string, number> = {};
      escalatedTickets.forEach(t => {
        const reason = t.escalationReason || "sin_motivo";
        escalationReasons[reason] = (escalationReasons[reason] || 0) + 1;
      });
      
      // Assignment history (derivations)
      const ticketsWithHistory = tickets.filter(t => t.assignmentHistory && Array.isArray(t.assignmentHistory) && t.assignmentHistory.length > 1);
      const derivationsCount = ticketsWithHistory.reduce((sum, t) => {
        const history = t.assignmentHistory as any[];
        return sum + (history.length - 1); // Number of reassignments
      }, 0);
      
      const data = tickets.map(t => {
        const history = (t.assignmentHistory as any[]) || [];
        return {
          id: t.id,
          edificio: buildingMap.get(t.buildingId) || t.buildingId,
          tipo: t.ticketType === "urgencia" ? "Urgencia" : t.ticketType === "mantencion" ? "Mantención" : "Planificado",
          descripcion: t.description,
          prioridad: t.priority === "rojo" ? "Alta" : t.priority === "amarillo" ? "Media" : "Baja",
          estado: t.status === "resuelto" ? "Resuelto" : t.status === "pendiente" ? "Pendiente" : t.status === "en_curso" ? "En Curso" : t.status === "trabajo_completado" ? "Trabajo Completado" : t.status,
          asignado: userMap.get(t.assignedExecutiveId || "") || "-",
          fechaCreacion: t.createdAt,
          fechaVencimiento: t.dueDate,
          fechaCierre: t.closedAt,
          montoFactura: t.invoiceAmount ? parseFloat(t.invoiceAmount) : null,
          escaladoA: t.escalatedTo ? userMap.get(t.escalatedTo) || "-" : null,
          derivaciones: history.length > 1 ? history.length - 1 : 0,
          diasResolucion: t.resolvedAt && t.createdAt 
            ? Math.round((new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            : null,
        };
      });
      
      const summary = {
        total: data.length,
        abiertos: tickets.filter(t => t.status === "pendiente").length,
        enProgreso: tickets.filter(t => t.status === "en_curso" || t.status === "trabajo_completado").length,
        resueltos: tickets.filter(t => t.status === "resuelto").length,
        prioridadAlta: tickets.filter(t => t.priority === "rojo").length,
        prioridadMedia: tickets.filter(t => t.priority === "amarillo").length,
        prioridadBaja: tickets.filter(t => t.priority === "verde").length,
      };
      
      const analytics = {
        semaforo,
        overdue: {
          total: overdueTickets.length,
          byPriority: {
            rojo: overdueTickets.filter(t => t.priority === "rojo").length,
            amarillo: overdueTickets.filter(t => t.priority === "amarillo").length,
            verde: overdueTickets.filter(t => t.priority === "verde").length,
          },
        },
        resolution: {
          avgDays: resolvedTickets.length > 0 
            ? Math.round(Object.values(resolutionByType).reduce((s, r) => s + r.totalDays, 0) / resolvedTickets.length * 10) / 10
            : 0,
          byType: Object.entries(resolutionByType).map(([type, data]) => ({
            type: type === "urgencia" ? "Urgencia" : type === "mantencion" ? "Mantención" : "Planificado",
            avgDays: data.count > 0 ? Math.round((data.totalDays / data.count) * 10) / 10 : 0,
            count: data.count,
          })),
        },
        costByBuilding: Object.values(costByBuilding).sort((a, b) => b.total - a.total).slice(0, 10),
        totalCost: Object.values(costByBuilding).reduce((sum, b) => sum + b.total, 0),
        escalations: {
          total: escalatedTickets.length,
          byReason: Object.entries(escalationReasons).map(([reason, count]) => ({ reason, count })),
        },
        derivations: {
          ticketsWithDerivations: ticketsWithHistory.length,
          totalDerivations: derivationsCount,
        },
      };
      
      res.json({ data, summary, analytics });
    } catch (error) {
      console.error("Error fetching tickets report:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Financial Report - for managers only (with analytics)
  app.get("/api/reports/financial", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !isManagerRole(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const { buildingId, startDate, endDate } = req.query;
      
      let allTickets = await storage.getTickets();
      
      // Paid tickets (resuelto with invoice)
      let paidTickets = allTickets.filter(t => t.status === "resuelto" && t.invoiceAmount && parseFloat(t.invoiceAmount) > 0);
      
      // Pending invoices - work completed but not resolved (before filtering)
      let pendingInvoices = allTickets.filter(t => 
        t.status === "trabajo_completado" && 
        (!t.invoiceStatus || t.invoiceStatus !== "pagada")
      );
      
      // Apply same filters to both paid and pending invoices
      if (buildingId && buildingId !== "all") {
        paidTickets = paidTickets.filter(t => t.buildingId === buildingId);
        pendingInvoices = pendingInvoices.filter(t => t.buildingId === buildingId);
      }
      
      if (startDate) {
        const start = new Date(startDate as string);
        paidTickets = paidTickets.filter(t => t.closedAt && new Date(t.closedAt) >= start);
        pendingInvoices = pendingInvoices.filter(t => new Date(t.createdAt) >= start);
      }
      
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        paidTickets = paidTickets.filter(t => t.closedAt && new Date(t.closedAt) <= end);
        pendingInvoices = pendingInvoices.filter(t => new Date(t.createdAt) <= end);
      }
      
      const buildings = await storage.getBuildings();
      const buildingMap = new Map(buildings.map(b => [b.id, b.name]));
      const maintainers = await storage.getMaintainers();
      const maintainerMap = new Map(maintainers.map(m => [m.id, m.companyName]));
      
      const data = paidTickets.map(t => ({
        id: t.id,
        edificio: buildingMap.get(t.buildingId) || t.buildingId,
        descripcion: t.description,
        tipo: t.ticketType === "urgencia" ? "Urgencia" : t.ticketType === "mantencion" ? "Mantención" : "Planificado",
        proveedor: t.maintainerId ? maintainerMap.get(t.maintainerId) || "-" : "-",
        numeroFactura: t.invoiceNumber || "-",
        monto: parseFloat(t.invoiceAmount || "0"),
        fechaEgreso: t.closedAt,
      }));
      
      // Group by building
      const byBuilding: Record<string, { total: number; count: number }> = {};
      data.forEach(item => {
        if (!byBuilding[item.edificio]) {
          byBuilding[item.edificio] = { total: 0, count: 0 };
        }
        byBuilding[item.edificio].total += item.monto;
        byBuilding[item.edificio].count++;
      });
      
      // Group by ticket type
      const byType: Record<string, { total: number; count: number }> = {};
      data.forEach(item => {
        if (!byType[item.tipo]) {
          byType[item.tipo] = { total: 0, count: 0 };
        }
        byType[item.tipo].total += item.monto;
        byType[item.tipo].count++;
      });
      
      // Group by month
      const byMonth: Record<string, { total: number; count: number }> = {};
      data.forEach(item => {
        if (item.fechaEgreso) {
          const date = new Date(item.fechaEgreso);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!byMonth[monthKey]) {
            byMonth[monthKey] = { total: 0, count: 0 };
          }
          byMonth[monthKey].total += item.monto;
          byMonth[monthKey].count++;
        }
      });
      
      const summary = {
        totalMonto: data.reduce((sum, t) => sum + t.monto, 0),
        totalFacturas: data.length,
        promedioFactura: data.length > 0 ? Math.round(data.reduce((sum, t) => sum + t.monto, 0) / data.length) : 0,
        porEdificio: Object.entries(byBuilding).map(([edificio, stats]) => ({
          edificio,
          total: stats.total,
          count: stats.count,
        })).sort((a, b) => b.total - a.total),
      };
      
      const analytics = {
        pendingInvoices: {
          count: pendingInvoices.length,
          estimatedAmount: pendingInvoices.reduce((sum, t) => sum + parseFloat(t.invoiceAmount || "0"), 0),
        },
        byType: Object.entries(byType).map(([type, stats]) => ({
          type,
          total: stats.total,
          count: stats.count,
          avgPerTicket: stats.count > 0 ? Math.round(stats.total / stats.count) : 0,
        })).sort((a, b) => b.total - a.total),
        byMonth: Object.entries(byMonth).map(([month, stats]) => ({
          month,
          total: stats.total,
          count: stats.count,
        })).sort((a, b) => a.month.localeCompare(b.month)),
        topBuildings: Object.entries(byBuilding).map(([name, stats]) => ({
          name,
          total: stats.total,
          count: stats.count,
        })).sort((a, b) => b.total - a.total).slice(0, 5),
      };
      
      res.json({ data, summary, analytics });
    } catch (error) {
      console.error("Error fetching financial report:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Critical Equipment Report - for managers only (with analytics)
  app.get("/api/reports/equipment", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !isManagerRole(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const { buildingId, maintenanceStatus } = req.query;
      
      let allEquipment = await storage.getCriticalEquipment();
      let equipment = [...allEquipment];
      
      if (buildingId && buildingId !== "all") {
        equipment = equipment.filter(e => e.buildingId === buildingId);
      }
      
      const now = new Date();
      
      if (maintenanceStatus === "overdue") {
        equipment = equipment.filter(e => e.nextMaintenanceDate && new Date(e.nextMaintenanceDate) < now);
      } else if (maintenanceStatus === "upcoming") {
        const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        equipment = equipment.filter(e => e.nextMaintenanceDate && new Date(e.nextMaintenanceDate) >= now && new Date(e.nextMaintenanceDate) <= thirtyDays);
      } else if (maintenanceStatus === "ok") {
        const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        equipment = equipment.filter(e => !e.nextMaintenanceDate || new Date(e.nextMaintenanceDate) > thirtyDays);
      }
      
      const buildings = await storage.getBuildings();
      const buildingMap = new Map(buildings.map(b => [b.id, b.name]));
      const maintainers = await storage.getMaintainers();
      const maintainerMap = new Map(maintainers.map(m => [m.id, m.companyName]));
      
      const data = equipment.map(e => {
        const isOverdue = e.nextMaintenanceDate && new Date(e.nextMaintenanceDate) < now;
        const isUpcoming = e.nextMaintenanceDate && new Date(e.nextMaintenanceDate) >= now && new Date(e.nextMaintenanceDate) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        return {
          id: e.id,
          buildingId: e.buildingId,
          edificio: buildingMap.get(e.buildingId) || e.buildingId,
          nombre: e.name,
          tipo: e.type,
          marca: e.brand || "-",
          modelo: e.model || "-",
          estado: e.status === "operativo" ? "Operativo" : e.status === "en_mantencion" ? "En Mantención" : e.status === "fuera_servicio" ? "Fuera de Servicio" : e.status === "por_aprobar" ? "Por Aprobar" : e.status,
          mantenedor: e.assignedMaintainerId ? maintainerMap.get(e.assignedMaintainerId) || "-" : "-",
          ultimaMantencion: e.lastMaintenanceDate,
          proximaMantencion: e.nextMaintenanceDate,
          estadoMantencion: isOverdue ? "Vencida" : isUpcoming ? "Próxima" : "Al día",
          costo: e.cost ? parseFloat(e.cost) : 0,
        };
      });
      
      // Equipment pending approval (all equipment, not filtered)
      const pendingApproval = allEquipment.filter(e => e.status === "por_aprobar");
      
      // Investment by building
      const investmentByBuilding: Record<string, { name: string, total: number, count: number }> = {};
      data.forEach(e => {
        if (!investmentByBuilding[e.buildingId]) {
          investmentByBuilding[e.buildingId] = { name: e.edificio, total: 0, count: 0 };
        }
        investmentByBuilding[e.buildingId].total += e.costo;
        investmentByBuilding[e.buildingId].count++;
      });
      
      // Investment by type
      const investmentByType: Record<string, { total: number, count: number }> = {};
      data.forEach(e => {
        if (!investmentByType[e.tipo]) {
          investmentByType[e.tipo] = { total: 0, count: 0 };
        }
        investmentByType[e.tipo].total += e.costo;
        investmentByType[e.tipo].count++;
      });
      
      const summary = {
        total: data.length,
        operativos: data.filter(e => e.estado === "Operativo").length,
        enMantencion: data.filter(e => e.estado === "En Mantención").length,
        fueraServicio: data.filter(e => e.estado === "Fuera de Servicio").length,
        porAprobar: data.filter(e => e.estado === "Por Aprobar").length,
        mantencionVencida: data.filter(e => e.estadoMantencion === "Vencida").length,
        mantencionProxima: data.filter(e => e.estadoMantencion === "Próxima").length,
      };
      
      const analytics = {
        pendingApproval: {
          total: pendingApproval.length,
          items: pendingApproval.slice(0, 10).map(e => ({
            id: e.id,
            nombre: e.name,
            edificio: buildingMap.get(e.buildingId) || e.buildingId,
            tipo: e.type,
            costo: e.cost ? parseFloat(e.cost) : 0,
          })),
        },
        investmentByBuilding: Object.values(investmentByBuilding).sort((a, b) => b.total - a.total),
        investmentByType: Object.entries(investmentByType).map(([type, data]) => ({
          type,
          total: data.total,
          count: data.count,
        })).sort((a, b) => b.total - a.total),
        totalInvestment: data.reduce((sum, e) => sum + e.costo, 0),
        overdueRisk: {
          total: allEquipment.filter(e => e.nextMaintenanceDate && new Date(e.nextMaintenanceDate) < now).length,
          critical: allEquipment.filter(e => {
            if (!e.nextMaintenanceDate) return false;
            const daysPast = (now.getTime() - new Date(e.nextMaintenanceDate).getTime()) / (1000 * 60 * 60 * 24);
            return daysPast > 30;
          }).length,
        },
      };
      
      res.json({ data, summary, analytics });
    } catch (error) {
      console.error("Error fetching equipment report:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Executive Performance Report - for managers only (with analytics)
  app.get("/api/reports/executives", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !isManagerRole(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const { startDate, endDate } = req.query;
      
      const profiles = await storage.getUserProfiles();
      const executiveProfiles = profiles.filter(p => p.role === "ejecutivo_operaciones");
      const users = await storage.getUsers();
      const userMap = new Map(users.map(u => [u.id, u]));
      
      let visits = await storage.getVisits();
      let tickets = await storage.getTickets();
      
      if (startDate) {
        const start = new Date(startDate as string);
        visits = visits.filter(v => new Date(v.scheduledDate) >= start);
        tickets = tickets.filter(t => new Date(t.createdAt) >= start);
      }
      
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        visits = visits.filter(v => new Date(v.scheduledDate) <= end);
        tickets = tickets.filter(t => new Date(t.createdAt) <= end);
      }
      
      const buildings = await storage.getBuildings();
      
      const data = executiveProfiles.map(ep => {
        const user = userMap.get(ep.userId);
        const execVisits = visits.filter(v => v.executiveId === ep.userId);
        const execTickets = tickets.filter(t => t.assignedExecutiveId === ep.userId);
        const assignedBuildings = buildings.filter(b => b.assignedExecutiveId === ep.userId);
        
        // Tickets created from visits (findings)
        const findingsDetected = tickets.filter(t => t.createdBy === ep.userId && t.visitId).length;
        
        return {
          ejecutivoId: ep.userId,
          nombre: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : ep.userId,
          email: user?.email || "-",
          edificiosAsignados: assignedBuildings.length,
          visitasTotales: execVisits.length,
          visitasRealizadas: execVisits.filter(v => v.status === "realizada").length,
          visitasProgramadas: execVisits.filter(v => v.status === "programada").length,
          visitasCanceladas: execVisits.filter(v => v.status === "cancelada").length,
          ticketsAsignados: execTickets.length,
          ticketsResueltos: execTickets.filter(t => t.status === "resuelto").length,
          ticketsPendientes: execTickets.filter(t => !["resuelto", "cancelado"].includes(t.status)).length,
          hallazgosDetectados: findingsDetected,
          tasaCumplimiento: execVisits.length > 0 
            ? Math.round((execVisits.filter(v => v.status === "realizada").length / execVisits.length) * 100) 
            : 0,
        };
      });
      
      // Workload analysis
      const avgBuildingsPerExec = data.length > 0 
        ? Math.round(data.reduce((sum, e) => sum + e.edificiosAsignados, 0) / data.length * 10) / 10
        : 0;
      const avgTicketsPerExec = data.length > 0
        ? Math.round(data.reduce((sum, e) => sum + e.ticketsAsignados, 0) / data.length * 10) / 10
        : 0;
      
      // Identify overloaded executives (above average)
      const overloadedExecs = data.filter(e => 
        e.edificiosAsignados > avgBuildingsPerExec * 1.5 || 
        e.ticketsAsignados > avgTicketsPerExec * 1.5
      );
      
      // Top performers by findings
      const topFinders = [...data].sort((a, b) => b.hallazgosDetectados - a.hallazgosDetectados).slice(0, 5);
      
      const summary = {
        totalEjecutivos: data.length,
        totalVisitas: data.reduce((sum, e) => sum + e.visitasTotales, 0),
        totalVisitasRealizadas: data.reduce((sum, e) => sum + e.visitasRealizadas, 0),
        totalTickets: data.reduce((sum, e) => sum + e.ticketsAsignados, 0),
        totalTicketsResueltos: data.reduce((sum, e) => sum + e.ticketsResueltos, 0),
        promedioCumplimiento: data.length > 0 
          ? Math.round(data.reduce((sum, e) => sum + e.tasaCumplimiento, 0) / data.length) 
          : 0,
      };
      
      const analytics = {
        workload: {
          avgBuildingsPerExec,
          avgTicketsPerExec,
          overloadedCount: overloadedExecs.length,
          overloadedExecs: overloadedExecs.map(e => ({
            nombre: e.nombre,
            edificios: e.edificiosAsignados,
            tickets: e.ticketsAsignados,
          })),
        },
        findings: {
          totalFindings: data.reduce((sum, e) => sum + e.hallazgosDetectados, 0),
          avgFindingsPerExec: data.length > 0 
            ? Math.round(data.reduce((sum, e) => sum + e.hallazgosDetectados, 0) / data.length * 10) / 10
            : 0,
          topFinders: topFinders.map(e => ({
            nombre: e.nombre,
            hallazgos: e.hallazgosDetectados,
            visitas: e.visitasRealizadas,
            proactividadRate: e.visitasRealizadas > 0 
              ? Math.round((e.hallazgosDetectados / e.visitasRealizadas) * 100)
              : 0,
          })),
        },
        performance: {
          topPerformers: [...data].sort((a, b) => b.tasaCumplimiento - a.tasaCumplimiento).slice(0, 5).map(e => ({
            nombre: e.nombre,
            cumplimiento: e.tasaCumplimiento,
          })),
          lowPerformers: [...data].filter(e => e.tasaCumplimiento < 70).map(e => ({
            nombre: e.nombre,
            cumplimiento: e.tasaCumplimiento,
          })),
        },
      };
      
      res.json({ data, summary, analytics });
    } catch (error) {
      console.error("Error fetching executives report:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Excel download endpoints for each report
  app.get("/api/reports/visits/excel", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !isManagerRole(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const { buildingId, startDate, endDate } = req.query;
      const XLSX = await import("xlsx");
      
      let visits = await storage.getVisits();
      
      if (buildingId && buildingId !== "all") {
        visits = visits.filter(v => v.buildingId === buildingId);
      }
      if (startDate) {
        visits = visits.filter(v => new Date(v.scheduledDate) >= new Date(startDate as string));
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        visits = visits.filter(v => new Date(v.scheduledDate) <= end);
      }
      
      const buildings = await storage.getBuildings();
      const buildingMap = new Map(buildings.map(b => [b.id, b.name]));
      const users = await storage.getUsers();
      const userMap = new Map(users.map(u => [u.id, `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email]));
      
      const wsData = [
        ["Edificio", "Ejecutivo", "Tipo", "Estado", "Fecha Programada", "Fecha Inicio", "Fecha Fin", "Notas", "Observaciones"],
      ];
      
      visits.forEach(v => {
        wsData.push([
          buildingMap.get(v.buildingId) || v.buildingId,
          userMap.get(v.executiveId) || v.executiveId,
          v.type === "rutina" ? "Rutina" : v.type === "urgente" ? "Urgente" : "Seguimiento",
          v.status === "realizada" ? "Realizada" : v.status === "programada" ? "Programada" : "Cancelada",
          v.scheduledDate ? new Date(v.scheduledDate).toLocaleDateString("es-CL") : "",
          v.startedAt ? new Date(v.startedAt).toLocaleString("es-CL") : "",
          v.completedAt ? new Date(v.completedAt).toLocaleString("es-CL") : "",
          v.notes || "",
          v.completionObservations || "",
        ]);
      });
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Visitas");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="informe_visitas_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buf);
    } catch (error) {
      console.error("Error generating visits Excel:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.get("/api/reports/tickets/excel", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !isManagerRole(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const { buildingId, startDate, endDate, status, priority } = req.query;
      const XLSX = await import("xlsx");
      
      let tickets = await storage.getTickets();
      
      if (buildingId && buildingId !== "all") tickets = tickets.filter(t => t.buildingId === buildingId);
      if (startDate) tickets = tickets.filter(t => new Date(t.createdAt) >= new Date(startDate as string));
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        tickets = tickets.filter(t => new Date(t.createdAt) <= end);
      }
      if (status && status !== "all") tickets = tickets.filter(t => t.status === status);
      if (priority && priority !== "all") tickets = tickets.filter(t => t.priority === priority);
      
      const buildings = await storage.getBuildings();
      const buildingMap = new Map(buildings.map(b => [b.id, b.name]));
      const users = await storage.getUsers();
      const userMap = new Map(users.map(u => [u.id, `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email]));
      
      const wsData = [
        ["Edificio", "Tipo", "Descripción", "Prioridad", "Estado", "Asignado", "Fecha Creación", "Fecha Cierre", "Monto Factura"],
      ];
      
      tickets.forEach(t => {
        wsData.push([
          buildingMap.get(t.buildingId) || t.buildingId,
          t.ticketType === "urgencia" ? "Urgencia" : t.ticketType === "mantencion" ? "Mantención" : "Planificado",
          t.description,
          t.priority === "rojo" ? "Alta" : t.priority === "amarillo" ? "Media" : "Baja",
          t.status === "resuelto" ? "Resuelto" : t.status === "abierto" ? "Abierto" : t.status === "en_progreso" ? "En Progreso" : t.status,
          userMap.get(t.assignedExecutiveId || "") || "-",
          t.createdAt ? new Date(t.createdAt).toLocaleDateString("es-CL") : "",
          t.closedAt ? new Date(t.closedAt).toLocaleDateString("es-CL") : "",
          t.invoiceAmount ? `$${parseFloat(t.invoiceAmount).toLocaleString("es-CL")}` : "",
        ]);
      });
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tickets");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="informe_tickets_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buf);
    } catch (error) {
      console.error("Error generating tickets Excel:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.get("/api/reports/financial/excel", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !isManagerRole(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const { buildingId, startDate, endDate } = req.query;
      const XLSX = await import("xlsx");
      
      let tickets = await storage.getTickets();
      tickets = tickets.filter(t => t.status === "resuelto" && t.invoiceAmount && parseFloat(t.invoiceAmount) > 0);
      
      if (buildingId && buildingId !== "all") tickets = tickets.filter(t => t.buildingId === buildingId);
      if (startDate) tickets = tickets.filter(t => t.closedAt && new Date(t.closedAt) >= new Date(startDate as string));
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        tickets = tickets.filter(t => t.closedAt && new Date(t.closedAt) <= end);
      }
      
      const buildings = await storage.getBuildings();
      const buildingMap = new Map(buildings.map(b => [b.id, b.name]));
      const maintainers = await storage.getMaintainers();
      const maintainerMap = new Map(maintainers.map(m => [m.id, m.companyName]));
      
      const wsData = [
        ["Edificio", "Descripción", "Tipo", "Proveedor", "N° Factura", "Monto", "Fecha Egreso"],
      ];
      
      tickets.forEach(t => {
        wsData.push([
          buildingMap.get(t.buildingId) || t.buildingId,
          t.description,
          t.ticketType === "urgencia" ? "Urgencia" : t.ticketType === "mantencion" ? "Mantención" : "Planificado",
          t.maintainerId ? maintainerMap.get(t.maintainerId) || "-" : "-",
          t.invoiceNumber || "-",
          parseFloat(t.invoiceAmount || "0"),
          t.closedAt ? new Date(t.closedAt).toLocaleDateString("es-CL") : "",
        ]);
      });
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Financiero");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="informe_financiero_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buf);
    } catch (error) {
      console.error("Error generating financial Excel:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.get("/api/reports/equipment/excel", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !isManagerRole(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const { buildingId, maintenanceStatus } = req.query;
      const XLSX = await import("xlsx");
      
      let equipment = await storage.getCriticalEquipment();
      const now = new Date();
      
      if (buildingId && buildingId !== "all") equipment = equipment.filter(e => e.buildingId === buildingId);
      if (maintenanceStatus === "overdue") {
        equipment = equipment.filter(e => e.nextMaintenanceDate && new Date(e.nextMaintenanceDate) < now);
      } else if (maintenanceStatus === "upcoming") {
        const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        equipment = equipment.filter(e => e.nextMaintenanceDate && new Date(e.nextMaintenanceDate) >= now && new Date(e.nextMaintenanceDate) <= thirtyDays);
      }
      
      const buildings = await storage.getBuildings();
      const buildingMap = new Map(buildings.map(b => [b.id, b.name]));
      const maintainers = await storage.getMaintainers();
      const maintainerMap = new Map(maintainers.map(m => [m.id, m.companyName]));
      
      const wsData = [
        ["Edificio", "Nombre", "Tipo", "Marca", "Modelo", "Estado", "Mantenedor", "Última Mantención", "Próxima Mantención", "Estado Mantención"],
      ];
      
      equipment.forEach(e => {
        const isOverdue = e.nextMaintenanceDate && new Date(e.nextMaintenanceDate) < now;
        const isUpcoming = e.nextMaintenanceDate && new Date(e.nextMaintenanceDate) >= now && new Date(e.nextMaintenanceDate) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        wsData.push([
          buildingMap.get(e.buildingId) || e.buildingId,
          e.name,
          e.type,
          e.brand || "-",
          e.model || "-",
          e.status === "operativo" ? "Operativo" : e.status === "en_mantencion" ? "En Mantención" : "Fuera de Servicio",
          e.assignedMaintainerId ? maintainerMap.get(e.assignedMaintainerId) || "-" : "-",
          e.lastMaintenanceDate ? new Date(e.lastMaintenanceDate).toLocaleDateString("es-CL") : "-",
          e.nextMaintenanceDate ? new Date(e.nextMaintenanceDate).toLocaleDateString("es-CL") : "-",
          isOverdue ? "Vencida" : isUpcoming ? "Próxima" : "Al día",
        ]);
      });
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Equipos");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="informe_equipos_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buf);
    } catch (error) {
      console.error("Error generating equipment Excel:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.get("/api/reports/executives/excel", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !isManagerRole(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const { startDate, endDate } = req.query;
      const XLSX = await import("xlsx");
      
      const profiles = await storage.getUserProfiles();
      const executiveProfiles = profiles.filter(p => p.role === "ejecutivo_operaciones");
      const users = await storage.getUsers();
      const userMap = new Map(users.map(u => [u.id, u]));
      
      let visits = await storage.getVisits();
      let tickets = await storage.getTickets();
      
      if (startDate) {
        const start = new Date(startDate as string);
        visits = visits.filter(v => new Date(v.scheduledDate) >= start);
        tickets = tickets.filter(t => new Date(t.createdAt) >= start);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        visits = visits.filter(v => new Date(v.scheduledDate) <= end);
        tickets = tickets.filter(t => new Date(t.createdAt) <= end);
      }
      
      const buildings = await storage.getBuildings();
      
      const wsData = [
        ["Ejecutivo", "Email", "Edificios Asignados", "Visitas Totales", "Visitas Realizadas", "Visitas Pendientes", "Tickets Asignados", "Tickets Resueltos", "Tickets Pendientes", "% Cumplimiento"],
      ];
      
      executiveProfiles.forEach(ep => {
        const user = userMap.get(ep.userId);
        const execVisits = visits.filter(v => v.executiveId === ep.userId);
        const execTickets = tickets.filter(t => t.assignedExecutiveId === ep.userId);
        const assignedBuildings = buildings.filter(b => b.assignedExecutiveId === ep.userId);
        
        wsData.push([
          user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : ep.userId,
          user?.email || "-",
          String(assignedBuildings.length),
          String(execVisits.length),
          String(execVisits.filter(v => v.status === "realizada").length),
          String(execVisits.filter(v => v.status === "programada").length),
          String(execTickets.length),
          String(execTickets.filter(t => t.status === "resuelto").length),
          String(execTickets.filter(t => !["resuelto", "cancelado"].includes(t.status)).length),
          `${execVisits.length > 0 ? Math.round((execVisits.filter(v => v.status === "realizada").length / execVisits.length) * 100) : 0}%`,
        ]);
      });
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ejecutivos");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="informe_ejecutivos_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buf);
    } catch (error) {
      console.error("Error generating executives Excel:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // ==================== ADMIN USER MANAGEMENT ENDPOINTS ====================
  
  // Helper to check if user has admin privileges (only gerente_general)
  const isAdminRole = (role: string): boolean => {
    return role === "gerente_general";
  };

  // List all users with their profiles
  app.get("/api/admin/users", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !isAdminRole(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado. Se requieren privilegios de administrador." });
      }

      const allUsers = await storage.getUsers();
      const allProfiles = await storage.getUserProfiles();
      const buildings = await storage.getBuildings();
      
      const profileMap = new Map(allProfiles.map(p => [p.userId, p]));
      
      const usersWithProfiles = allUsers.map(user => {
        const userProfile = profileMap.get(user.id);
        const assignedBuildings = buildings.filter(b => b.assignedExecutiveId === user.id);
        
        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          profile: userProfile ? {
            id: userProfile.id,
            role: userProfile.role,
            buildingScope: userProfile.buildingScope,
            phone: userProfile.phone,
            isActive: userProfile.isActive,
          } : null,
          assignedBuildings: assignedBuildings.map(b => ({ id: b.id, name: b.name })),
        };
      });
      
      res.json(usersWithProfiles);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Get single user with profile
  app.get("/api/admin/users/:id", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !isAdminRole(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      
      const userProfile = await storage.getUserProfile(user.id);
      const buildings = await storage.getBuildings();
      const assignedBuildings = buildings.filter(b => b.assignedExecutiveId === user.id);
      
      res.json({
        ...user,
        profile: userProfile || null,
        assignedBuildings: assignedBuildings.map(b => ({ id: b.id, name: b.name })),
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Create new user with profile
  app.post("/api/admin/users", isAuthenticated, async (req, res) => {
    try {
      const adminProfile = await storage.getUserProfile((req.user as any).id);
      if (!adminProfile || !isAdminRole(adminProfile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const { email, firstName, lastName, role, buildingScope, phone, isActive } = req.body;
      
      if (!email || !role) {
        return res.status(400).json({ error: "Email y rol son requeridos" });
      }
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Ya existe un usuario con este email" });
      }
      
      // Create user
      const newUser = await storage.createUser({
        email,
        firstName: firstName || null,
        lastName: lastName || null,
      });
      
      // Create profile
      const newProfile = await storage.createUserProfile({
        userId: newUser.id,
        role,
        buildingScope: buildingScope || (role === "ejecutivo_operaciones" ? "assigned" : "all"),
        phone: phone || null,
        isActive: isActive !== false,
      });
      
      res.status(201).json({
        ...newUser,
        profile: newProfile,
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Update user and profile
  app.patch("/api/admin/users/:id", isAuthenticated, async (req, res) => {
    try {
      const adminProfile = await storage.getUserProfile((req.user as any).id);
      if (!adminProfile || !isAdminRole(adminProfile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const userId = req.params.id;
      const { email, firstName, lastName, role, buildingScope, phone, isActive } = req.body;
      
      // Update user
      const userUpdates: any = {};
      if (email !== undefined) userUpdates.email = email;
      if (firstName !== undefined) userUpdates.firstName = firstName;
      if (lastName !== undefined) userUpdates.lastName = lastName;
      
      let updatedUser = await storage.getUser(userId);
      if (!updatedUser) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      
      if (Object.keys(userUpdates).length > 0) {
        updatedUser = await storage.updateUser(userId, userUpdates);
      }
      
      // Update or create profile
      const profileUpdates: any = {};
      if (role !== undefined) profileUpdates.role = role;
      if (buildingScope !== undefined) profileUpdates.buildingScope = buildingScope;
      if (phone !== undefined) profileUpdates.phone = phone;
      if (isActive !== undefined) profileUpdates.isActive = isActive;
      
      let userProfile = await storage.getUserProfile(userId);
      if (Object.keys(profileUpdates).length > 0) {
        if (userProfile) {
          userProfile = await storage.updateUserProfile(userId, profileUpdates);
        } else {
          userProfile = await storage.createUserProfile({
            userId,
            role: role || "ejecutivo_operaciones",
            buildingScope: buildingScope || "assigned",
            phone: phone || null,
            isActive: isActive !== false,
          });
        }
      }
      
      res.json({
        ...updatedUser,
        profile: userProfile,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Delete user (and profile)
  app.delete("/api/admin/users/:id", isAuthenticated, async (req, res) => {
    try {
      const adminProfile = await storage.getUserProfile((req.user as any).id);
      if (!adminProfile || !isAdminRole(adminProfile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const userId = req.params.id;
      
      // Prevent deleting yourself
      if (userId === (req.user as any).id) {
        return res.status(400).json({ error: "No puedes eliminar tu propio usuario" });
      }
      
      // Unassign from buildings first
      const buildings = await storage.getBuildings();
      for (const building of buildings) {
        if (building.assignedExecutiveId === userId) {
          await storage.updateBuilding(building.id, { assignedExecutiveId: null });
        }
      }
      
      await storage.deleteUser(userId);
      
      res.json({ success: true, message: "Usuario eliminado correctamente" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Toggle user active status
  app.patch("/api/admin/users/:id/toggle-active", isAuthenticated, async (req, res) => {
    try {
      const adminProfile = await storage.getUserProfile((req.user as any).id);
      if (!adminProfile || !isAdminRole(adminProfile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const userId = req.params.id;
      
      const userProfile = await storage.getUserProfile(userId);
      if (!userProfile) {
        return res.status(404).json({ error: "Perfil de usuario no encontrado" });
      }
      
      const updatedProfile = await storage.updateUserProfile(userId, {
        isActive: !userProfile.isActive,
      });
      
      res.json({
        userId,
        isActive: updatedProfile?.isActive,
        message: updatedProfile?.isActive ? "Usuario activado" : "Usuario desactivado",
      });
    } catch (error) {
      console.error("Error toggling user status:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Assign buildings to executive
  app.patch("/api/admin/users/:id/buildings", isAuthenticated, async (req, res) => {
    try {
      const adminProfile = await storage.getUserProfile((req.user as any).id);
      if (!adminProfile || !isAdminRole(adminProfile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const userId = req.params.id;
      const { buildingIds } = req.body;
      
      if (!Array.isArray(buildingIds)) {
        return res.status(400).json({ error: "buildingIds debe ser un array" });
      }
      
      const userProfile = await storage.getUserProfile(userId);
      if (!userProfile) {
        return res.status(404).json({ error: "Perfil de usuario no encontrado" });
      }
      
      // First, unassign all buildings from this user
      const allBuildings = await storage.getBuildings();
      for (const building of allBuildings) {
        if (building.assignedExecutiveId === userId) {
          await storage.updateBuilding(building.id, { assignedExecutiveId: null });
        }
      }
      
      // Then assign the new buildings
      for (const buildingId of buildingIds) {
        await storage.updateBuilding(buildingId, { assignedExecutiveId: userId });
      }
      
      // Return updated assignments
      const updatedBuildings = await storage.getBuildings();
      const assignedBuildings = updatedBuildings.filter(b => b.assignedExecutiveId === userId);
      
      res.json({
        userId,
        assignedBuildings: assignedBuildings.map(b => ({ id: b.id, name: b.name })),
      });
    } catch (error) {
      console.error("Error assigning buildings:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Get available roles
  app.get("/api/admin/roles", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !isAdminRole(profile.role) && profile.role !== "super_admin") {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const roles = [
        { value: "super_admin", label: "Super Admin", description: "Configuración del sistema" },
        { value: "gerente_general", label: "Gerente General", description: "Acceso total a la plataforma" },
        { value: "gerente_operaciones", label: "Gerente de Operaciones", description: "Gestiona visitas, tickets y equipos" },
        { value: "gerente_comercial", label: "Gerente Comercial", description: "Acceso a reportes financieros" },
        { value: "gerente_finanzas", label: "Gerente de Finanzas", description: "Solo lectura en dashboards" },
        { value: "ejecutivo_operaciones", label: "Ejecutivo de Operaciones", description: "Trabajo de campo, sin acceso a costos" },
      ];
      
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // ==================== SUPER ADMIN ENDPOINTS ====================
  
  const isSuperAdminRole = (role: string): boolean => {
    return role === "super_admin";
  };

  // Get system configuration
  app.get("/api/super-admin/config", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !isSuperAdminRole(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado. Se requieren privilegios de Super Admin." });
      }

      const config = await storage.getSystemConfig();
      res.json(config || {
        id: "default",
        companyName: "BUMA OPS",
        logoUrl: null,
        primaryColor: "#2563eb",
        updatedAt: new Date().toISOString(),
        updatedBy: null,
      });
    } catch (error) {
      console.error("Error fetching system config:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Update system configuration
  app.patch("/api/super-admin/config", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !isSuperAdminRole(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const { companyName, logoUrl, primaryColor } = req.body;
      const userId = (req.user as any).id;
      
      const updatedConfig = await storage.updateSystemConfig({
        companyName,
        logoUrl,
        primaryColor,
        updatedBy: userId,
      });
      
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating system config:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Super Admin: List all users
  app.get("/api/super-admin/users", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !isSuperAdminRole(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const allUsers = await storage.getUsers();
      const allProfiles = await storage.getUserProfiles();
      const buildings = await storage.getBuildings();
      
      const profileMap = new Map(allProfiles.map(p => [p.userId, p]));
      
      const usersWithProfiles = allUsers.map(user => {
        const userProfile = profileMap.get(user.id);
        const assignedBuildings = buildings.filter(b => b.assignedExecutiveId === user.id);
        
        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          profile: userProfile ? {
            id: userProfile.id,
            role: userProfile.role,
            buildingScope: userProfile.buildingScope,
            phone: userProfile.phone,
            isActive: userProfile.isActive,
          } : null,
          assignedBuildings: assignedBuildings.map(b => ({ id: b.id, name: b.name })),
        };
      });
      
      res.json(usersWithProfiles);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Super Admin: Create user
  app.post("/api/super-admin/users", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !isSuperAdminRole(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const { email, firstName, lastName, role, phone, password, isActive } = req.body;
      
      const userId = `user-${Date.now()}`;
      
      // Hash password if provided
      let passwordHash = null;
      if (password && password.trim() !== "") {
        passwordHash = await bcrypt.hash(password, 10);
      }
      
      const newUser = await storage.upsertUser({
        id: userId,
        email,
        firstName,
        lastName,
        passwordHash,
        mustChangePassword: true,
      });

      const buildingScope = role === "ejecutivo_operaciones" ? "assigned" : "all";
      await storage.createUserProfile({
        userId: newUser.id,
        role: role || "ejecutivo_operaciones",
        buildingScope,
        phone: phone || null,
        isActive: isActive ?? true,
      });
      
      console.log(`[super-admin] User created: ${newUser.id} with password: ${password ? "yes" : "no"}`);

      res.status(201).json({ id: newUser.id, email: newUser.email });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Super Admin: Update user
  app.patch("/api/super-admin/users/:id", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !isSuperAdminRole(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const { id } = req.params;
      const { email, firstName, lastName, role, phone, isActive } = req.body;
      
      await storage.upsertUser({
        id,
        email,
        firstName,
        lastName,
      });

      const existingProfile = await storage.getUserProfile(id);
      if (existingProfile) {
        const buildingScope = role === "ejecutivo_operaciones" ? "assigned" : "all";
        await storage.updateUserProfile(id, {
          role,
          buildingScope,
          phone,
          isActive,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Super Admin: Toggle user active status
  app.patch("/api/super-admin/users/:id/toggle-active", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !isSuperAdminRole(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const { id } = req.params;
      const userProfile = await storage.getUserProfile(id);
      
      if (!userProfile) {
        return res.status(404).json({ error: "Perfil de usuario no encontrado" });
      }

      await storage.updateUserProfile(id, { isActive: !userProfile.isActive });
      res.json({ success: true, isActive: !userProfile.isActive });
    } catch (error) {
      console.error("Error toggling user status:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Super Admin: Reset user password
  app.post("/api/super-admin/users/:id/reset-password", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !isSuperAdminRole(profile.role)) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      const { id } = req.params;
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.trim() === "") {
        return res.status(400).json({ error: "Debe proporcionar una nueva contraseña" });
      }
      
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await db.update(usersTable).set({ 
        passwordHash, 
        mustChangePassword: true,
        updatedAt: new Date()
      }).where(eq(usersTable.id, id));
      
      res.json({ success: true, message: "Contraseña reseteada exitosamente" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // ========================
  // PROJECTS MODULE
  // ========================

  // Check if user can manage projects (Gerente General, Operaciones, Comercial)
  const canManageProjects = (role: string) => {
    return ["super_admin", "gerente_general", "gerente_operaciones", "gerente_comercial"].includes(role);
  };

  // Get all projects
  app.get("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile) {
        return res.status(403).json({ error: "Perfil no encontrado" });
      }

      const filters: { buildingId?: string; status?: string; executiveId?: string } = {};
      
      if (req.query.buildingId) filters.buildingId = req.query.buildingId as string;
      if (req.query.status) filters.status = req.query.status as string;
      
      // Ejecutivos solo ven proyectos de sus edificios asignados
      if (profile.role === "ejecutivo_operaciones") {
        filters.executiveId = (req.user as any).id;
      }
      
      const projects = await storage.getProjects(filters);
      
      // Enrich with building info
      const buildings = await storage.getBuildings();
      const buildingMap = new Map(buildings.map(b => [b.id, b]));
      
      const enrichedProjects = projects.map(project => ({
        ...project,
        building: buildingMap.get(project.buildingId),
      }));
      
      res.json(enrichedProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Get single project with milestones, documents, and updates
  app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Proyecto no encontrado" });
      }
      
      const [milestones, documents, updates, building] = await Promise.all([
        storage.getProjectMilestones(project.id),
        storage.getProjectDocuments(project.id),
        storage.getProjectUpdates(project.id),
        storage.getBuilding(project.buildingId),
      ]);
      
      res.json({
        ...project,
        building,
        milestones,
        documents,
        updates,
      });
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Create project (only managers)
  app.post("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !canManageProjects(profile.role)) {
        return res.status(403).json({ error: "No tiene permisos para crear proyectos" });
      }
      
      const projectData = {
        ...req.body,
        createdBy: (req.user as any).id,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        plannedEndDate: req.body.plannedEndDate ? new Date(req.body.plannedEndDate) : undefined,
        actualEndDate: req.body.actualEndDate ? new Date(req.body.actualEndDate) : undefined,
      };
      
      const project = await storage.createProject(projectData);
      
      // Create default milestones if provided
      if (req.body.milestones && Array.isArray(req.body.milestones)) {
        for (let i = 0; i < req.body.milestones.length; i++) {
          const m = req.body.milestones[i];
          await storage.createProjectMilestone({
            projectId: project.id,
            name: m.name,
            description: m.description,
            orderIndex: i,
            dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
          });
        }
      }
      
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Update project
  app.patch("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !canManageProjects(profile.role)) {
        return res.status(403).json({ error: "No tiene permisos para editar proyectos" });
      }
      
      const updated = await storage.updateProject(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Proyecto no encontrado" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Delete project
  app.delete("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !canManageProjects(profile.role)) {
        return res.status(403).json({ error: "No tiene permisos para eliminar proyectos" });
      }
      
      await storage.deleteProject(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // === Project Milestones ===

  // Get project milestones
  app.get("/api/projects/:projectId/milestones", isAuthenticated, async (req, res) => {
    try {
      const milestones = await storage.getProjectMilestones(req.params.projectId);
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Create milestone
  app.post("/api/projects/:projectId/milestones", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !canManageProjects(profile.role)) {
        return res.status(403).json({ error: "No tiene permisos" });
      }
      
      const milestone = await storage.createProjectMilestone({
        ...req.body,
        projectId: req.params.projectId,
      });
      
      res.status(201).json(milestone);
    } catch (error) {
      console.error("Error creating milestone:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Update milestone
  app.patch("/api/projects/:projectId/milestones/:id", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      const isManager = profile && canManageProjects(profile.role);
      const isExecutive = profile?.role === "ejecutivo_operaciones";
      
      // Ejecutivos solo pueden cambiar status y observaciones
      if (!isManager && !isExecutive) {
        return res.status(403).json({ error: "No tiene permisos" });
      }
      
      const updateData: any = {};
      
      if (isManager) {
        // Managers can update everything
        Object.assign(updateData, req.body);
      } else {
        // Executives can only update status and observations
        if (req.body.status) updateData.status = req.body.status;
        if (req.body.observations) updateData.observations = req.body.observations;
      }
      
      // If completing, set completedAt and completedBy
      if (updateData.status === "completado") {
        updateData.completedAt = new Date();
        updateData.completedBy = (req.user as any).id;
      }
      
      const updated = await storage.updateProjectMilestone(req.params.id, updateData);
      if (!updated) {
        return res.status(404).json({ error: "Hito no encontrado" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating milestone:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Delete milestone
  app.delete("/api/projects/:projectId/milestones/:id", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !canManageProjects(profile.role)) {
        return res.status(403).json({ error: "No tiene permisos" });
      }
      
      await storage.deleteProjectMilestone(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting milestone:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // === Project Documents ===

  // Get project documents
  app.get("/api/projects/:projectId/documents", isAuthenticated, async (req, res) => {
    try {
      const documents = await storage.getProjectDocuments(req.params.projectId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Upload project document
  app.post("/api/projects/:projectId/documents", isAuthenticated, async (req, res) => {
    try {
      const document = await storage.createProjectDocument({
        ...req.body,
        projectId: req.params.projectId,
        uploadedBy: (req.user as any).id,
      });
      
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Delete project document
  app.delete("/api/projects/:projectId/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !canManageProjects(profile.role)) {
        return res.status(403).json({ error: "No tiene permisos" });
      }
      
      await storage.deleteProjectDocument(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // === Project Updates (Fiscalizaciones) ===

  // Get project updates
  app.get("/api/projects/:projectId/updates", isAuthenticated, async (req, res) => {
    try {
      const updates = await storage.getProjectUpdates(req.params.projectId);
      res.json(updates);
    } catch (error) {
      console.error("Error fetching updates:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Create project update (fiscalización)
  app.post("/api/projects/:projectId/updates", isAuthenticated, async (req, res) => {
    try {
      const update = await storage.createProjectUpdate({
        ...req.body,
        projectId: req.params.projectId,
        createdBy: (req.user as any).id,
      });
      
      res.status(201).json(update);
    } catch (error) {
      console.error("Error creating update:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Approve committee request in update
  app.patch("/api/projects/:projectId/updates/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile((req.user as any).id);
      if (!profile || !canManageProjects(profile.role)) {
        return res.status(403).json({ error: "No tiene permisos para aprobar" });
      }
      
      const updated = await storage.updateProjectUpdate(req.params.id, {
        committeeApproved: true,
        committeeApprovedAt: new Date(),
        committeeApprovedBy: (req.user as any).id,
      });
      
      if (!updated) {
        return res.status(404).json({ error: "Actualización no encontrada" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error approving update:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // ========================
  // TRADITIONAL AUTH ROUTES
  // ========================

  // Login with email and password
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email y contraseña son requeridos" });
      }
      
      // Find user by email
      const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
      
      if (!user) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }
      
      // Check if user has password
      if (!user.passwordHash) {
        return res.status(401).json({ error: "Usuario no tiene contraseña configurada. Contacte al administrador." });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }
      
      // Check if user profile is active
      const userProfile = await storage.getUserProfile(user.id);
      if (!userProfile || !userProfile.isActive) {
        return res.status(401).json({ error: "Usuario inactivo. Contacte al administrador." });
      }
      
      // Update last login
      await db.update(usersTable).set({ 
        lastLoginAt: new Date(),
        updatedAt: new Date()
      }).where(eq(usersTable.id, user.id));
      
      // Create session object in the format expected by Passport
      const now = Math.floor(Date.now() / 1000);
      const sessionUser = {
        id: user.id,
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
        },
        expires_at: now + 86400 * 7, // 7 days
        access_token: "password-auth-token",
        refresh_token: "password-auth-refresh",
      };
      
      // Login the user using Passport
      req.login(sessionUser, (err) => {
        if (err) {
          console.error("Error logging in:", err);
          return res.status(500).json({ error: "Error al iniciar sesión" });
        }
        
        res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          mustChangePassword: user.mustChangePassword,
          role: userProfile.role,
        });
      });
    } catch (error) {
      console.error("Error in login:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Change password (for first login or user-initiated)
  app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { currentPassword, newPassword } = req.body;
      
      if (!newPassword || newPassword.trim().length < 6) {
        return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres" });
      }
      
      // Get user
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      
      // If user is changing password (not first login), verify current password
      if (!user.mustChangePassword && user.passwordHash) {
        if (!currentPassword) {
          return res.status(400).json({ error: "Contraseña actual es requerida" });
        }
        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) {
          return res.status(401).json({ error: "Contraseña actual incorrecta" });
        }
      }
      
      // Hash new password and update
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await db.update(usersTable).set({ 
        passwordHash, 
        mustChangePassword: false,
        updatedAt: new Date()
      }).where(eq(usersTable.id, userId));
      
      res.json({ success: true, message: "Contraseña actualizada exitosamente" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Error logging out:", err);
        return res.status(500).json({ error: "Error al cerrar sesión" });
      }
      res.json({ success: true });
    });
  });

  // ==========================================
  // Insurance Policy Expiry Check & Auto-Ticket Generation
  // ==========================================
  
  // Guard to prevent multiple scheduler registrations during hot reloads
  const INSURANCE_CHECK_INITIALIZED = (global as any).__INSURANCE_CHECK_INITIALIZED__;
  
  // Check insurance policies and generate tickets for expiring ones
  app.post("/api/system/check-insurance-policies", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getProfileByUserId(req.user!.id);
      // Only super_admin or gerente_general can trigger this manually
      if (!profile || !["super_admin", "gerente_general"].includes(profile.role)) {
        return res.status(403).json({ error: "No autorizado" });
      }

      const result = await checkAndCreateInsuranceTickets();
      res.json(result);
    } catch (error) {
      console.error("Error checking insurance policies:", error);
      res.status(500).json({ error: "Error al verificar pólizas" });
    }
  });

  // Closed statuses that indicate ticket is resolved/done
  const CLOSED_STATUSES = ["resuelto"];

  // Function to check insurance policies and create tickets
  async function checkAndCreateInsuranceTickets(): Promise<{ created: number; skipped: number; errors: number }> {
    const buildings = await storage.getBuildings();
    // Load all tickets ONCE before iterating (avoid N+1 queries)
    const allTickets = await storage.getTickets();
    const now = new Date();
    const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const building of buildings) {
      try {
        // Skip buildings without insurance expiry date
        if (!building.insuranceExpiryDate) {
          continue;
        }

        const expiryDate = new Date(building.insuranceExpiryDate);
        const expiryStart = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
        const daysRemaining = Math.floor((expiryStart.getTime() - nowStart.getTime()) / (1000 * 60 * 60 * 24));

        // Only process if policy is expiring within 30 days or already expired
        if (daysRemaining > 30) {
          continue;
        }

        // Check if there's already an open insurance ticket for this building
        const hasOpenInsuranceTicket = allTickets.some(ticket => 
          ticket.buildingId === building.id &&
          ticket.description.startsWith("[PÓLIZA DE SEGURO]") &&
          !CLOSED_STATUSES.includes(ticket.status)
        );

        if (hasOpenInsuranceTicket) {
          skipped++;
          continue;
        }

        // Determine priority based on days remaining
        let priority: "rojo" | "amarillo" | "verde";
        let urgencyText: string;
        
        if (daysRemaining < 0) {
          priority = "rojo";
          urgencyText = `VENCIDA hace ${Math.abs(daysRemaining)} días`;
        } else if (daysRemaining < 15) {
          priority = "rojo";
          urgencyText = `Vence en ${daysRemaining} días`;
        } else {
          priority = "amarillo";
          urgencyText = `Vence en ${daysRemaining} días`;
        }

        // Create the ticket - use building's executive as creator, or first super_admin
        let creatorId = building.assignedExecutiveId;
        if (!creatorId) {
          // Fallback: use a gerente_general or super_admin
          const profiles = await storage.getUserProfiles();
          const adminProfile = profiles.find(p => 
            p.role === "gerente_general" || p.role === "super_admin"
          );
          creatorId = adminProfile?.userId || "SYSTEM";
        }

        const description = `[PÓLIZA DE SEGURO] ${urgencyText}\n\nEdificio: ${building.name}\nAseguradora: ${building.insurerName || "No especificada"}\nFecha vencimiento: ${expiryDate.toLocaleDateString("es-CL")}\n\nSe requiere gestionar la renovación de la póliza de seguro del edificio.`;

        await storage.createTicket({
          buildingId: building.id,
          ticketType: "planificado",
          description,
          priority,
          status: "pendiente",
          assignedExecutiveId: building.assignedExecutiveId || null,
          requiresMaintainerVisit: false,
          requiresExecutiveVisit: true,
          requiresInvoice: true,
          createdBy: creatorId,
          endDate: expiryDate,
        });

        created++;
        console.log(`[Insurance Check] Created ticket for building ${building.name} - ${urgencyText}`);
      } catch (error) {
        console.error(`[Insurance Check] Error processing building ${building.id}:`, error);
        errors++;
      }
    }

    console.log(`[Insurance Check] Complete: ${created} created, ${skipped} skipped, ${errors} errors`);
    return { created, skipped, errors };
  }

  // Run insurance check on server startup and schedule daily (with guard for hot reloads)
  if (!INSURANCE_CHECK_INITIALIZED) {
    (global as any).__INSURANCE_CHECK_INITIALIZED__ = true;
    
    // Initial check 10 seconds after startup
    setTimeout(async () => {
      console.log("[Insurance Check] Running initial insurance policy check...");
      await checkAndCreateInsuranceTickets();
    }, 10000);

    // Schedule daily check at 8:00 AM
    const scheduleDaily = () => {
      const now = new Date();
      const next8AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0, 0);
      if (now >= next8AM) {
        next8AM.setDate(next8AM.getDate() + 1);
      }
      const msUntilNext8AM = next8AM.getTime() - now.getTime();
      
      setTimeout(async () => {
        console.log("[Insurance Check] Running scheduled daily insurance policy check...");
        await checkAndCreateInsuranceTickets();
        // Schedule subsequent checks every 24 hours
        setInterval(async () => {
          console.log("[Insurance Check] Running scheduled daily insurance policy check...");
          await checkAndCreateInsuranceTickets();
        }, 24 * 60 * 60 * 1000);
      }, msUntilNext8AM);
      
      console.log(`[Insurance Check] Next scheduled check at ${next8AM.toLocaleString()}`);
    };
    scheduleDaily();
  } else {
    console.log("[Insurance Check] Scheduler already initialized, skipping...");
  }

  return httpServer;
}
