import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Building2, 
  Calendar, 
  DollarSign,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  Pause,
  XCircle,
  FolderKanban,
  ArrowRight
} from "lucide-react";
import type { Project, Building } from "@shared/schema";

type ProjectWithBuilding = Project & { building?: Building };

const statusLabels: Record<string, string> = {
  planificado: "Planificado",
  en_ejecucion: "En Ejecución",
  pausado: "Pausado",
  completado: "Completado",
  cancelado: "Cancelado",
};

const statusIcons: Record<string, typeof Clock> = {
  planificado: Clock,
  en_ejecucion: AlertCircle,
  pausado: Pause,
  completado: CheckCircle2,
  cancelado: XCircle,
};

function getTrafficLight(project: Project): "verde" | "amarillo" | "rojo" {
  if (project.status === "completado" || project.status === "cancelado") {
    return "verde";
  }
  
  const endDate = project.plannedEndDate ? new Date(project.plannedEndDate) : null;
  if (!endDate) return "verde";
  
  const now = new Date();
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining < 0) return "rojo";
  if (daysRemaining <= 5) return "rojo";
  if (daysRemaining <= 15) return "amarillo";
  return "verde";
}

function getDaysRemaining(project: Project): number | null {
  const endDate = project.plannedEndDate ? new Date(project.plannedEndDate) : null;
  if (!endDate) return null;
  
  const now = new Date();
  return Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const s = typeof date === "string" ? date : date.toISOString();
  const mt = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (mt) {
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
    return `${mt[3]} ${months[parseInt(mt[2]) - 1]} ${mt[1]}`;
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(value: string | number | null | undefined): string {
  if (!value) return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  return `$${num.toLocaleString("es-CL")}`;
}

export default function ProjectsSemaforo() {
  const [, navigate] = useLocation();
  const [buildingFilter, setBuildingFilter] = useState<string>("all");

  const { data: projects, isLoading } = useQuery<ProjectWithBuilding[]>({
    queryKey: ["/api/projects"],
  });

  const { data: buildings } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const activeProjects = projects?.filter(p => 
    p.status !== "completado" && p.status !== "cancelado"
  ) || [];

  const filteredProjects = activeProjects.filter((project) => {
    return buildingFilter === "all" || project.buildingId === buildingFilter;
  });

  const groupedProjects = {
    rojo: filteredProjects.filter(p => getTrafficLight(p) === "rojo"),
    amarillo: filteredProjects.filter(p => getTrafficLight(p) === "amarillo"),
    verde: filteredProjects.filter(p => getTrafficLight(p) === "verde"),
  };

  const renderProjectCard = (project: ProjectWithBuilding) => {
    const trafficLight = getTrafficLight(project);
    const daysRemaining = getDaysRemaining(project);
    const StatusIcon = statusIcons[project.status] || Clock;
    
    return (
      <Link key={project.id} href={`/proyectos/${project.id}`}>
        <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-project-${project.id}`}>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold line-clamp-2" data-testid={`text-project-name-${project.id}`}>
                  {project.name}
                </h3>
                <Badge variant="outline" className="shrink-0 flex items-center gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {statusLabels[project.status]}
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate">{project.building?.name || "Sin edificio"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Término: {formatDate(project.plannedEndDate)}</span>
                </div>
                {project.contractorName && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span className="truncate">{project.contractorName}</span>
                  </div>
                )}
                {project.approvedBudget && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>{formatCurrency(project.approvedBudget)}</span>
                  </div>
                )}
              </div>
              
              {daysRemaining !== null && (
                <div className={`text-sm font-medium ${
                  trafficLight === "rojo" ? "text-red-600" :
                  trafficLight === "amarillo" ? "text-yellow-600" :
                  "text-green-600"
                }`}>
                  {daysRemaining < 0 
                    ? `Vencido hace ${Math.abs(daysRemaining)} días`
                    : daysRemaining === 0
                    ? "Vence hoy"
                    : `${daysRemaining} días restantes`
                  }
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Proyectos Semáforo</h1>
          <p className="text-muted-foreground">Vista de urgencia de proyectos activos</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={buildingFilter} onValueChange={setBuildingFilter}>
            <SelectTrigger className="w-48" data-testid="select-building">
              <SelectValue placeholder="Edificio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los edificios</SelectItem>
              {buildings?.map((building) => (
                <SelectItem key={building.id} value={building.id}>
                  {building.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => navigate("/proyectos/nuevo")} data-testid="button-new-project">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Proyecto
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-t-4 border-t-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-red-600">
                <div className="w-4 h-4 rounded-full bg-red-500" />
                Crítico ({groupedProjects.rojo.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">Menos de 5 días o vencido</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {groupedProjects.rojo.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin proyectos críticos
                </p>
              ) : (
                groupedProjects.rojo.map(renderProjectCard)
              )}
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-yellow-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <div className="w-4 h-4 rounded-full bg-yellow-500" />
                Atención ({groupedProjects.amarillo.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">Entre 5 y 15 días</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {groupedProjects.amarillo.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin proyectos en alerta
                </p>
              ) : (
                groupedProjects.amarillo.map(renderProjectCard)
              )}
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-green-600">
                <div className="w-4 h-4 rounded-full bg-green-500" />
                En Tiempo ({groupedProjects.verde.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">Más de 15 días</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {groupedProjects.verde.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin proyectos en tiempo
                </p>
              ) : (
                groupedProjects.verde.map(renderProjectCard)
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {filteredProjects.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay proyectos activos</h3>
            <p className="text-muted-foreground mb-4">
              Crea un nuevo proyecto para verlo en el semáforo.
            </p>
            <Button onClick={() => navigate("/proyectos/nuevo")}>
              <Plus className="h-4 w-4 mr-2" />
              Crear proyecto
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
