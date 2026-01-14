import type { UserRole } from "@shared/schema";

export const roleHomeRoutes: Record<UserRole, string> = {
  ejecutivo_operaciones: "/visitas?view=today",
  gerente_operaciones: "/dashboard/tickets",
  gerente_comercial: "/dashboard/tickets",
  gerente_finanzas: "/dashboard/tickets",
  gerente_general: "/dashboard/overview",
};

export function getRoleHome(role: UserRole): string {
  return roleHomeRoutes[role] || "/visitas";
}

export const rolePermissions: Record<UserRole, {
  allowedRoutes: string[];
  canViewCosts: boolean;
  canApproveAssets: boolean;
  buildingScope: "assigned" | "all";
}> = {
  gerente_general: {
    allowedRoutes: [
      "/dashboard/overview",
      "/dashboard/tickets",
      "/dashboard/visitas",
      "/visitas",
      "/visitas/programar",
      "/tickets",
      "/tickets/nuevo",
      "/calendario",
      "/edificios",
      "/equipos",
      "/mantenedores",
      "/ejecutivos",
      "/reportes/egresos",
      "/perfil",
    ],
    canViewCosts: true,
    canApproveAssets: true,
    buildingScope: "all",
  },
  gerente_operaciones: {
    allowedRoutes: [
      "/dashboard/tickets",
      "/dashboard/visitas",
      "/visitas",
      "/visitas/programar",
      "/tickets",
      "/tickets/nuevo",
      "/calendario",
      "/edificios",
      "/equipos",
      "/mantenedores",
      "/ejecutivos",
      "/perfil",
    ],
    canViewCosts: true,
    canApproveAssets: true,
    buildingScope: "all",
  },
  gerente_comercial: {
    allowedRoutes: [
      "/dashboard/tickets",
      "/dashboard/visitas",
      "/visitas",
      "/visitas/programar",
      "/tickets",
      "/tickets/nuevo",
      "/calendario",
      "/edificios",
      "/equipos",
      "/mantenedores",
      "/ejecutivos",
      "/reportes/egresos",
      "/perfil",
    ],
    canViewCosts: true,
    canApproveAssets: true,
    buildingScope: "all",
  },
  gerente_finanzas: {
    allowedRoutes: [
      "/dashboard/tickets",
      "/tickets",
      "/tickets/nuevo",
      "/perfil",
    ],
    canViewCosts: true,
    canApproveAssets: false,
    buildingScope: "all",
  },
  ejecutivo_operaciones: {
    allowedRoutes: [
      "/visitas",
      "/visitas/programar",
      "/tickets",
      "/tickets/nuevo",
      "/calendario",
      "/edificios",
      "/equipos",
      "/perfil",
    ],
    canViewCosts: false,
    canApproveAssets: false,
    buildingScope: "assigned",
  },
};

export function canAccessRoute(role: UserRole, path: string): boolean {
  const permissions = rolePermissions[role];
  if (!permissions) return false;
  
  const basePath = path.split("?")[0];
  
  if (basePath.startsWith("/visitas/") && basePath !== "/visitas/programar") {
    return permissions.allowedRoutes.includes("/visitas");
  }
  
  return permissions.allowedRoutes.some((allowed) => basePath.startsWith(allowed));
}

export function isManagerRole(role: UserRole): boolean {
  return role === "gerente_general" || role === "gerente_operaciones" || role === "gerente_comercial";
}

export function isFinanceRole(role: UserRole): boolean {
  return role === "gerente_finanzas";
}

export function isExecutiveRole(role: UserRole): boolean {
  return role === "ejecutivo_operaciones";
}
