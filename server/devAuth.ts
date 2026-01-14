import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { authStorage } from "./replit_integrations/auth/storage";

export const DEV_USERS = [
  {
    id: "dev-super-admin",
    email: "superadmin@buma.local",
    firstName: "Super",
    lastName: "Admin",
    profileImageUrl: null,
    role: "super_admin" as const,
    label: "Super Admin",
  },
  {
    id: "dev-gerente-general",
    email: "gg@buma.local",
    firstName: "Gerente",
    lastName: "General",
    profileImageUrl: null,
    role: "gerente_general" as const,
    label: "Gerente General",
  },
  {
    id: "dev-gerente-operaciones",
    email: "ops@buma.local",
    firstName: "Gerente",
    lastName: "Operaciones",
    profileImageUrl: null,
    role: "gerente_operaciones" as const,
    label: "Gerente Operaciones",
  },
  {
    id: "dev-gerente-comercial",
    email: "comercial@buma.local",
    firstName: "Gerente",
    lastName: "Comercial",
    profileImageUrl: null,
    role: "gerente_comercial" as const,
    label: "Gerente Comercial",
  },
  {
    id: "exec-a-001",
    email: "execa@buma.local",
    firstName: "Ejecutivo",
    lastName: "A",
    profileImageUrl: null,
    role: "ejecutivo_operaciones" as const,
    label: "Ejecutivo A",
  },
  {
    id: "exec-b-001",
    email: "execb@buma.local",
    firstName: "Ejecutivo",
    lastName: "B",
    profileImageUrl: null,
    role: "ejecutivo_operaciones" as const,
    label: "Ejecutivo B",
  },
];

export function isDevMode(): boolean {
  return process.env.NODE_ENV === "development" || process.env.DEV_AUTH === "true";
}

function getRedirectForRole(role: string): string {
  switch (role) {
    case "super_admin":
      return "/super-admin";
    case "gerente_general":
      return "/dashboard/overview";
    case "gerente_operaciones":
    case "gerente_comercial":
      return "/dashboard/tickets";
    case "gerente_finanzas":
      return "/dashboard/tickets";
    case "ejecutivo_operaciones":
    default:
      return "/visitas?view=today";
  }
}

export function registerDevAuthRoutes(app: Express): void {
  if (!isDevMode()) {
    console.log("[dev-auth] Dev auth disabled (production mode)");
    return;
  }

  console.log("[dev-auth] Dev auth enabled - /api/dev-auth routes available");

  app.get("/api/dev-auth/users", (_req: Request, res: Response) => {
    res.json(
      DEV_USERS.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        label: u.label,
      }))
    );
  });

  app.post("/api/dev-auth/login", async (req: Request, res: Response) => {
    const { userId } = req.body;

    const devUser = DEV_USERS.find((u) => u.id === userId);
    if (!devUser) {
      return res.status(400).json({ error: "Usuario no encontrado" });
    }

    try {
      await authStorage.upsertUser({
        id: devUser.id,
        email: devUser.email,
        firstName: devUser.firstName,
        lastName: devUser.lastName,
        profileImageUrl: devUser.profileImageUrl,
      });

      const existingProfile = await storage.getUserProfile(devUser.id);
      if (!existingProfile) {
        await storage.createUserProfile({
          userId: devUser.id,
          role: devUser.role,
          isActive: true,
          buildingScope: devUser.role.includes("gerente") ? "all" : "assigned",
        });
      }

      const now = Math.floor(Date.now() / 1000);
      const sessionUser = {
        id: devUser.id,
        claims: {
          sub: devUser.id,
          email: devUser.email,
          first_name: devUser.firstName,
          last_name: devUser.lastName,
          profile_image_url: devUser.profileImageUrl,
        },
        expires_at: now + 86400 * 7,
        access_token: "dev-token",
        refresh_token: "dev-refresh-token",
      };

      req.login(sessionUser, (err) => {
        if (err) {
          console.error("[dev-auth] Login error:", err);
          return res.status(500).json({ error: "Error al iniciar sesion" });
        }
        
        const profile = existingProfile || {
          role: devUser.role,
          buildingScope: devUser.role.includes("gerente") ? "all" : "assigned",
        };
        
        res.json({ 
          success: true, 
          user: sessionUser,
          profile,
          redirectTo: getRedirectForRole(devUser.role),
        });
      });
    } catch (error) {
      console.error("[dev-auth] Error:", error);
      res.status(500).json({ error: "Error interno" });
    }
  });

  app.get("/api/dev-auth/status", (_req: Request, res: Response) => {
    res.json({ enabled: true, mode: "development" });
  });

  app.get("/api/dev-auth/logout", (req: Request, res: Response) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}
