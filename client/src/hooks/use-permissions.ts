import { useQuery } from "@tanstack/react-query";
import type { UserRole } from "@shared/schema";
import { MODULE_DEFINITIONS, DEFAULT_PERMISSIONS, type RolePermissionsConfig, type ModuleKey } from "@shared/modulePermissions";

export interface UserPermissions {
  modules: Record<ModuleKey, boolean>;
  homeRoute: string;
  buildingScope: "all" | "assigned";
  allowedRoutes: string[];
  canViewCosts: boolean;
  canApproveAssets: boolean;
  isLoading: boolean;
}

function buildAllowedRoutes(modules: Record<ModuleKey, boolean>): string[] {
  const routes: string[] = ["/perfil"];
  for (const [key, enabled] of Object.entries(modules)) {
    if (enabled) {
      const def = MODULE_DEFINITIONS[key as ModuleKey];
      if (def) {
        routes.push(...def.routes);
      }
    }
  }
  if (modules.panel_super_admin) {
    routes.push("/super-admin", "/super-admin/config", "/super-admin/logs");
  }
  if (modules.admin_usuarios) {
    routes.push("/admin/usuarios");
  }
  if (modules.panel_super_admin || modules.admin_usuarios) {
    routes.push("/gestion-permisos");
  }
  return Array.from(new Set(routes));
}

export function usePermissions(userRole: UserRole): UserPermissions {
  const { data, isLoading } = useQuery<RolePermissionsConfig>({
    queryKey: ["/api/role-permissions/my"],
    staleTime: 5 * 60 * 1000,
  });

  const fallback = DEFAULT_PERMISSIONS[userRole];

  const config = data || fallback;

  if (!config) {
    return {
      modules: {} as Record<ModuleKey, boolean>,
      homeRoute: "/perfil",
      buildingScope: "assigned",
      allowedRoutes: ["/perfil"],
      canViewCosts: false,
      canApproveAssets: false,
      isLoading,
    };
  }

  const modules = config.modules;
  const allowedRoutes = buildAllowedRoutes(modules);

  return {
    modules,
    homeRoute: config.homeRoute,
    buildingScope: config.buildingScope,
    allowedRoutes,
    canViewCosts: !!modules.ver_costos,
    canApproveAssets: !!modules.aprobar_equipos,
    isLoading,
  };
}

export function canAccessRouteDynamic(allowedRoutes: string[], path: string): boolean {
  const basePath = path.split("?")[0];

  if (basePath === "/perfil" || basePath === "/change-password" || basePath === "/chat-ia") return true;

  if (basePath.startsWith("/visitas/") && basePath !== "/visitas/programar") {
    return allowedRoutes.includes("/visitas");
  }

  if (basePath.startsWith("/tickets/") && basePath !== "/tickets/nuevo") {
    return allowedRoutes.includes("/tickets");
  }

  if (basePath.startsWith("/edificios/")) {
    return allowedRoutes.includes("/edificios");
  }

  if (basePath.startsWith("/proyectos/") && 
      basePath !== "/proyectos/semaforo" && 
      basePath !== "/proyectos/calendario" && 
      basePath !== "/proyectos/nuevo") {
    return allowedRoutes.includes("/proyectos");
  }

  if (basePath === "/proyectos/nuevo") {
    return allowedRoutes.includes("/proyectos");
  }

  return allowedRoutes.some((allowed) => basePath.startsWith(allowed));
}
