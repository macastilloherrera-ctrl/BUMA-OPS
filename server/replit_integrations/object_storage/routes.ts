import type { Express, Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { storage } from "../../storage";
import { db } from "../../db";
import {
  buildingFiles,
  visitPhotos,
  ticketPhotos,
  executiveDocuments,
} from "@shared/schema";

const MANAGER_ROLES = new Set([
  "super_admin",
  "gerente_general",
  "gerente_operaciones",
  "gerente_comercial",
  "gerente_finanzas",
]);

/**
 * Determina si un usuario no-gerente puede leer el objectPath solicitado.
 * Busca el archivo en building_files / visit_photos / ticket_photos /
 * executive_documents. Si está registrado en alguna, valida acceso al
 * edificio o al ejecutivo. Si no aparece en ninguna tabla, deniega.
 */
async function canNonManagerAccessObject(
  userId: string,
  profile: any,
  objectPath: string,
): Promise<boolean> {
  const buildingScopeAll = profile?.buildingScope === "all";

  const buildingsForUser = async (): Promise<Set<string>> => {
    const buildings = await storage.getBuildings();
    return new Set(
      buildings
        .filter((b) => b.assignedExecutiveId === userId || b.conserjeriaUserId === userId)
        .map((b) => b.id),
    );
  };

  const allowedForBuilding = async (buildingId: string): Promise<boolean> => {
    if (buildingScopeAll) return true;
    const allowed = await buildingsForUser();
    return allowed.has(buildingId);
  };

  // 1) building_files
  const [bf] = await db
    .select({ buildingId: buildingFiles.buildingId })
    .from(buildingFiles)
    .where(eq(buildingFiles.objectStorageKey, objectPath))
    .limit(1);
  if (bf) return await allowedForBuilding(bf.buildingId);

  // 2) visit_photos → resolver building via visitId
  const [vp] = await db
    .select({ visitId: visitPhotos.visitId })
    .from(visitPhotos)
    .where(eq(visitPhotos.objectStorageKey, objectPath))
    .limit(1);
  if (vp) {
    const visit = await storage.getVisit(vp.visitId);
    if (!visit) return false;
    return await allowedForBuilding(visit.buildingId);
  }

  // 3) ticket_photos → resolver building via ticketId
  const [tp] = await db
    .select({ ticketId: ticketPhotos.ticketId })
    .from(ticketPhotos)
    .where(eq(ticketPhotos.objectStorageKey, objectPath))
    .limit(1);
  if (tp) {
    const ticket = await storage.getTicket(tp.ticketId);
    if (!ticket) return false;
    return await allowedForBuilding(ticket.buildingId);
  }

  // 4) executive_documents → solo si el ejecutivo es el propio user.
  // Note: tabla usa fileKey, no objectStorageKey.
  const [ed] = await db
    .select({ executiveId: executiveDocuments.executiveId })
    .from(executiveDocuments)
    .where(eq(executiveDocuments.fileKey, objectPath))
    .limit(1);
  if (ed) {
    const exec = await storage.getExecutive(ed.executiveId);
    return !!(exec && profile?.id && exec.userProfileId === profile.id);
  }

  // No catalog match → denegar (no servir archivos huérfanos)
  return false;
}

function ensureAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  next();
}

/**
 * Register object storage routes for file uploads.
 *
 * This provides example routes for the presigned URL upload flow:
 * 1. POST /api/uploads/request-url - Get a presigned URL for uploading
 * 2. The client then uploads directly to the presigned URL
 *
 * IMPORTANT: These are example routes. Customize based on your use case:
 * - Add authentication middleware for protected uploads
 * - Add file metadata storage (save to database after upload)
 * - Add ACL policies for access control
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Request a presigned URL for file upload.
   *
   * Request body (JSON):
   * {
   *   "name": "filename.jpg",
   *   "size": 12345,
   *   "contentType": "image/jpeg"
   * }
   *
   * Response:
   * {
   *   "uploadURL": "https://storage.googleapis.com/...",
   *   "objectPath": "/objects/uploads/uuid"
   * }
   *
   * IMPORTANT: The client should NOT send the file to this endpoint.
   * Send JSON metadata only, then upload the file directly to uploadURL.
   */
  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();

      // Extract object path from the presigned URL for later reference
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        // Echo back the metadata for client convenience
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Serve uploaded objects.
   *
   * GET /objects/:objectPath(*)
   *
   * Requires authenticated session. Managers tienen acceso a todos los
   * archivos; el resto solo a archivos cuyo objectPath esté catalogado en
   * una tabla del edificio (o ejecutivo) al que tiene acceso.
   */
  app.get("/objects/:objectPath(*)", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const profile = await storage.getUserProfile(user.id);
      const role = profile?.role || "";
      const isManager = MANAGER_ROLES.has(role);

      if (!isManager) {
        const allowed = await canNonManagerAccessObject(user.id, profile, req.path);
        if (!allowed) {
          return res.status(403).json({ error: "Sin acceso a este recurso" });
        }
      }

      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}
