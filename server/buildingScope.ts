import { storage } from "./storage";
import { DEFAULT_PERMISSIONS } from "@shared/modulePermissions";
import type { UserProfile } from "@shared/schema";

export type BuildingScope = "all" | "assigned";

/**
 * Alcance de edificios efectivo de un usuario.
 *
 * La fuente de verdad es la configuración del rol (role_permissions_config),
 * que es lo que edita Gestión de Permisos y lo que el cliente ya consume en
 * use-permissions.ts. `user_profiles.building_scope` se conserva solo como
 * respaldo cuando el rol no tiene configuración.
 *
 * Antes la autorización leía directamente el perfil, que se escribe una única
 * vez al crear el usuario y nunca se actualiza cuando cambia el rol. Eso dejaba
 * al cliente y al servidor con dos respuestas distintas: la UI ofrecía todos
 * los edificios y la API rechazaba con 403 los que no estaban asignados.
 */
export async function getEffectiveBuildingScope(
  profile: UserProfile | null | undefined,
): Promise<BuildingScope> {
  if (!profile) return "assigned";

  try {
    const row = await storage.getRolePermissions(profile.role);
    if (row?.buildingScope === "all" || row?.buildingScope === "assigned") {
      return row.buildingScope;
    }
    const defaults = DEFAULT_PERMISSIONS[profile.role];
    if (defaults) return defaults.buildingScope;
  } catch (error) {
    console.error("Error resolviendo el buildingScope efectivo:", error);
  }

  return profile.buildingScope === "all" ? "all" : "assigned";
}

/** true si el usuario alcanza todos los edificios segun la config de su rol. */
export async function hasAllBuildingsScope(
  profile: UserProfile | null | undefined,
): Promise<boolean> {
  return (await getEffectiveBuildingScope(profile)) === "all";
}

/**
 * Edificios que un usuario tiene asignados cuando su alcance es "assigned".
 *
 * Un edificio se considera asignado por dos vias, y ambas cuentan:
 *  - `assigned_executive_id`: el ejecutivo (o conserje) responsable del edificio.
 *  - `conserjeria_user_id`: la cuenta de conserjeria vinculada al edificio.
 *
 * Antes cada llamador miraba una sola columna, asi que un conserje asignado por
 * la via de ejecutivo no tenia ningun edificio y un ejecutivo vinculado como
 * conserje tampoco. Devolver la union deja que un mismo usuario cubra varios
 * edificios sin duplicar cuentas.
 */
export async function getAssignedBuildingIds(userId: string): Promise<Set<string>> {
  const buildings = await storage.getBuildings();
  return new Set(
    buildings
      .filter((b) => b.assignedExecutiveId === userId || b.conserjeriaUserId === userId)
      .map((b) => b.id),
  );
}

/**
 * Resuelve si el usuario alcanza un edificio concreto, combinando el alcance
 * efectivo del rol con sus edificios asignados.
 */
export async function canUserReachBuilding(
  userId: string,
  profile: UserProfile | null | undefined,
  buildingId: string | null | undefined,
): Promise<boolean> {
  if (!buildingId) return false;
  if (await hasAllBuildingsScope(profile)) return true;
  const assigned = await getAssignedBuildingIds(userId);
  return assigned.has(buildingId);
}
