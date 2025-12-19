import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertBuildingSchema,
  insertCriticalAssetSchema,
  insertVisitSchema,
  insertVisitChecklistItemSchema,
  insertIncidentSchema,
  insertTicketSchema,
  insertAttachmentSchema,
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
  return !!profile && ["gerente_general", "gerente_operaciones"].includes(profile.role);
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
      res.json(executives);
    } catch (error) {
      console.error("Error getting executives:", error);
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
      });
    } catch (error) {
      console.error("Error getting visit:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  app.post("/api/visits", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.user!.id);
      
      // Enforce building scope for non-managers
      if (!isManagerRole(profile)) {
        const canAccess = await canAccessBuilding(req.user!.id, req.body.buildingId, profile);
        if (!canAccess) {
          return res.status(403).json({ error: "No tienes permiso para crear visitas en este edificio" });
        }
      }
      
      const data = insertVisitSchema.parse({
        ...req.body,
        executiveId: req.user!.id,
      });
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

  app.patch("/api/visits/:id/complete", isAuthenticated, async (req, res) => {
    try {
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
        notes: req.body.notes,
      });
      res.json(visit);
    } catch (error) {
      console.error("Error completing visit:", error);
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

  // === Tickets ===
  app.get("/api/tickets", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.user!.id);
      const isManager = isManagerRole(profile);
      
      const filters: { buildingId?: string; status?: string } = {};
      
      if (req.query.buildingId) filters.buildingId = req.query.buildingId as string;
      if (req.query.status) filters.status = req.query.status as string;
      
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
      
      // Add building names
      const buildings = await storage.getBuildings();
      const buildingsMap = new Map(buildings.map((b) => [b.id, b]));
      
      const ticketsWithBuilding = tickets.map((t) => ({
        ...t,
        building: buildingsMap.get(t.buildingId),
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
      
      const data = insertTicketSchema.parse({
        ...sanitizedBody,
        createdBy: req.user!.id,
        assignedExecutiveId: req.body.assignedExecutiveId || req.user!.id,
      });
      
      // Ensure cost is null for non-managers
      if (!isManager) {
        (data as any).cost = null;
      }
      
      const ticket = await storage.createTicket(data);
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
      
      const data = insertTicketSchema.partial().parse(req.body);
      
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
      
      const data = insertIncidentSchema.parse({
        ...sanitizedBody,
        createdBy: req.user!.id,
      });
      
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
      
      const data = insertIncidentSchema.partial().parse(req.body);
      
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

  return httpServer;
}
