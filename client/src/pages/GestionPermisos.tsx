import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Shield, Save, RotateCcw, Check, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  MODULE_KEYS,
  MODULE_DEFINITIONS,
  ROLE_LABELS,
  ALL_ROLES,
  DEFAULT_PERMISSIONS,
  type ModuleKey,
  type RolePermissionsConfig,
  type RoleModulePermissions,
} from "@shared/modulePermissions";

type PermissionsData = Record<string, RolePermissionsConfig>;

const MODULE_GROUPS = Array.from(new Set(MODULE_KEYS.map(k => MODULE_DEFINITIONS[k].group)));

export default function GestionPermisos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [localPermissions, setLocalPermissions] = useState<PermissionsData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [savingRole, setSavingRole] = useState<string | null>(null);

  const { data: serverPermissions, isLoading } = useQuery<PermissionsData>({
    queryKey: ["/api/role-permissions"],
  });

  useEffect(() => {
    if (serverPermissions && !localPermissions) {
      setLocalPermissions(JSON.parse(JSON.stringify(serverPermissions)));
    }
  }, [serverPermissions]);

  const saveMutation = useMutation({
    mutationFn: async ({ role, config }: { role: string; config: RolePermissionsConfig }) => {
      return apiRequest("PUT", `/api/role-permissions/${role}`, {
        modules: config.modules,
        homeRoute: config.homeRoute,
        buildingScope: config.buildingScope,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-permissions"] });
    },
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/role-permissions/seed"),
    onSuccess: async (res: any) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/role-permissions"] });
      setLocalPermissions(null);
      toast({ title: `Permisos inicializados: ${data.seeded} roles creados` });
    },
    onError: (error: Error) => {
      toast({ title: "Error al inicializar", description: error.message, variant: "destructive" });
    },
  });

  function toggleModule(role: string, moduleKey: ModuleKey) {
    if (!localPermissions) return;
    const updated = { ...localPermissions };
    updated[role] = {
      ...updated[role],
      modules: {
        ...updated[role].modules,
        [moduleKey]: !updated[role].modules[moduleKey],
      },
    };
    setLocalPermissions(updated);
    setHasChanges(true);
  }

  function updateHomeRoute(role: string, homeRoute: string) {
    if (!localPermissions) return;
    const updated = { ...localPermissions };
    updated[role] = { ...updated[role], homeRoute };
    setLocalPermissions(updated);
    setHasChanges(true);
  }

  function updateBuildingScope(role: string, buildingScope: string) {
    if (!localPermissions) return;
    const updated = { ...localPermissions };
    updated[role] = { ...updated[role], buildingScope: buildingScope as "all" | "assigned" };
    setLocalPermissions(updated);
    setHasChanges(true);
  }

  async function saveAll() {
    if (!localPermissions) return;
    let saved = 0;
    for (const role of ALL_ROLES) {
      const config = localPermissions[role];
      if (!config) continue;
      setSavingRole(role);
      try {
        await saveMutation.mutateAsync({ role, config });
        saved++;
      } catch (err: any) {
        toast({ title: `Error al guardar ${ROLE_LABELS[role]}`, description: err.message, variant: "destructive" });
        setSavingRole(null);
        return;
      }
    }
    setSavingRole(null);
    setHasChanges(false);
    toast({ title: `Permisos guardados para ${saved} roles` });
  }

  function resetToDefaults() {
    const defaults = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
    setLocalPermissions(defaults);
    setHasChanges(true);
  }

  function resetToServer() {
    if (serverPermissions) {
      setLocalPermissions(JSON.parse(JSON.stringify(serverPermissions)));
      setHasChanges(false);
    }
  }

  const editableRoles = ALL_ROLES.filter(r => r !== "super_admin");

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-50 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-page-title">
              Gestión de Permisos por Perfil
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <>
                <Button variant="outline" size="sm" onClick={resetToServer} data-testid="button-discard">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Descartar
                </Button>
                <Button size="sm" onClick={saveAll} disabled={saveMutation.isPending} data-testid="button-save-all">
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? `Guardando ${ROLE_LABELS[savingRole || ""] || ""}...` : "Guardar todo"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
        <div className="max-w-full mx-auto space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !localPermissions ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Shield className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4" data-testid="text-no-data">
                  No hay permisos configurados en la base de datos
                </p>
                <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} data-testid="button-seed">
                  Inicializar permisos por defecto
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base">Configuración General por Rol</CardTitle>
                    <Button variant="outline" size="sm" onClick={resetToDefaults} data-testid="button-reset-defaults">
                      Restaurar valores por defecto
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[180px]">Configuración</TableHead>
                          {editableRoles.map(role => (
                            <TableHead key={role} className="text-center min-w-[130px] text-xs">
                              {ROLE_LABELS[role]}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium text-sm">Página de inicio</TableCell>
                          {editableRoles.map(role => (
                            <TableCell key={role} className="text-center">
                              <Select
                                value={localPermissions[role]?.homeRoute || ""}
                                onValueChange={v => updateHomeRoute(role, v)}
                              >
                                <SelectTrigger className="h-8 text-xs" data-testid={`select-home-${role}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="/dashboard/overview">Dashboard Overview</SelectItem>
                                  <SelectItem value="/dashboard/tickets">Dashboard Tickets</SelectItem>
                                  <SelectItem value="/dashboard/visitas">Dashboard Visitas</SelectItem>
                                  <SelectItem value="/visitas?view=today">Agenda Visitas</SelectItem>
                                  <SelectItem value="/tickets">Tickets</SelectItem>
                                  <SelectItem value="/super-admin">Panel Super Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-sm">Alcance edificios</TableCell>
                          {editableRoles.map(role => (
                            <TableCell key={role} className="text-center">
                              <Select
                                value={localPermissions[role]?.buildingScope || "assigned"}
                                onValueChange={v => updateBuildingScope(role, v)}
                              >
                                <SelectTrigger className="h-8 text-xs" data-testid={`select-scope-${role}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todos</SelectItem>
                                  <SelectItem value="assigned">Solo asignados</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {MODULE_GROUPS.map(group => {
                const groupModules = MODULE_KEYS.filter(k => MODULE_DEFINITIONS[k].group === group);
                return (
                  <Card key={group}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        {group}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[220px]">Módulo</TableHead>
                              {editableRoles.map(role => (
                                <TableHead key={role} className="text-center min-w-[130px] text-xs">
                                  {ROLE_LABELS[role]}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groupModules.map(moduleKey => {
                              const def = MODULE_DEFINITIONS[moduleKey];
                              return (
                                <TableRow key={moduleKey} data-testid={`row-module-${moduleKey}`}>
                                  <TableCell className="text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{def.label}</span>
                                      {def.routes.length > 0 && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="text-xs">{def.routes.join(", ")}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                  </TableCell>
                                  {editableRoles.map(role => {
                                    const enabled = localPermissions[role]?.modules?.[moduleKey] ?? false;
                                    const serverEnabled = serverPermissions?.[role]?.modules?.[moduleKey as keyof typeof serverPermissions[typeof role]["modules"]] ?? false;
                                    const changed = enabled !== serverEnabled;
                                    return (
                                      <TableCell key={role} className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <Switch
                                            checked={enabled}
                                            onCheckedChange={() => toggleModule(role, moduleKey)}
                                            data-testid={`switch-${moduleKey}-${role}`}
                                          />
                                          {changed && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" title="Modificado" />
                                          )}
                                        </div>
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {hasChanges && (
                <div className="sticky bottom-4 flex justify-center">
                  <Card className="shadow-lg border-primary/20">
                    <CardContent className="py-3 px-6 flex items-center gap-4">
                      <span className="text-sm font-medium">Hay cambios sin guardar</span>
                      <Button variant="outline" size="sm" onClick={resetToServer} data-testid="button-discard-bottom">
                        Descartar
                      </Button>
                      <Button size="sm" onClick={saveAll} disabled={saveMutation.isPending} data-testid="button-save-bottom">
                        <Save className="h-4 w-4 mr-2" />
                        Guardar todo
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
