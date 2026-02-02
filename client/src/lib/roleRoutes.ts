import type { UserRole } from "@shared/schema";

export const roleHomeRoutes: Record<UserRole, string> = {
  super_admin: "/super-admin",
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
  super_admin: {
    allowedRoutes: [
      "/super-admin",
      "/super-admin/config",
      "/super-admin/users",
      "/super-admin/logs",
      "/proyectos",
      "/perfil",
    ],
    canViewCosts: true,
    canApproveAssets: true,
    buildingScope: "all",
  },
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
      "/proyectos",
      "/mantenedores",
      "/ejecutivos",
      "/reportes/egresos",
      "/reportes/cumplimiento",
      "/reportes/visitas",
      "/reportes/tickets",
      "/reportes/financiero",
      "/reportes/equipos",
      "/reportes/ejecutivos",
      "/admin/usuarios",
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
      "/proyectos",
      "/mantenedores",
      "/ejecutivos",
      "/reportes/cumplimiento",
      "/reportes/visitas",
      "/reportes/tickets",
      "/reportes/financiero",
      "/reportes/equipos",
      "/reportes/ejecutivos",
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
      "/proyectos",
      "/mantenedores",
      "/ejecutivos",
      "/reportes/egresos",
      "/reportes/cumplimiento",
      "/reportes/visitas",
      "/reportes/tickets",
      "/reportes/financiero",
      "/reportes/equipos",
      "/reportes/ejecutivos",
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
      "/reportes/cumplimiento",
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
      "/proyectos",
      "/reportes/cumplimiento",
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

export function isSuperAdmin(role: UserRole): boolean {
  return role === "super_admin";
}

export function isFinanceRole(role: UserRole): boolean {
  return role === "gerente_finanzas";
}

export function isExecutiveRole(role: UserRole): boolean {
  return role === "ejecutivo_operaciones";
}
