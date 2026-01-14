import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { registerDevAuthRoutes, isDevMode } from "./devAuth";
import { db } from "./db";
import { eq, or } from "drizzle-orm";
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
          eq(userProfiles.role, "gerente_operaciones")
        ));
      
      const { DEV_USERS } = await import("./devAuth");
      const managersWithNames = allProfiles.map((profile) => {
        const devUser = DEV_USERS.find((u) => u.id === profile.userId);
        return {
          userId: profile.userId,
          role: profile.role,
          displayName: devUser 
            ? `${devUser.firstName} ${devUser.lastName}` 
            : profile.userId.split("@")[0] || profile.userId,
          roleName: profile.role === "gerente_general" ? "Gerente General" : "Gerente de Operaciones",
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
      }));
      
      res.json(ticketsWithBuilding);
    } catch (error) {
      console.error("Error getting tickets:", error);
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
      
      res.json({
        ...ticket,
        building,
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
        if (targetProfile.role !== "gerente_general" && targetProfile.role !== "gerente_operaciones") {
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
        reason: reason || `Escalado a ${targetProfile.role === "gerente_general" ? "Gerente General" : "Gerente de Operaciones"}`,
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

  return httpServer;
}
