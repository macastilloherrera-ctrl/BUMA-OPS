import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Building2,
  Calendar,
  AlertTriangle,
  Users,
  RefreshCw,
  Plus,
} from "lucide-react";
import type { Visit, Building, UserProfile } from "@shared/schema";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";

interface VisitWithBuilding extends Visit {
  building?: Building;
  executiveName?: string;
}

interface DashboardStats {
  totalBuildings: number;
  visitedBuildings: number;
  overdueVisits: number;
  buildingsWithoutRecentVisit: number;
}

interface ExecutiveWorkload {
  id: string;
  name: string;
  assignedBuildings: number;
  pendingVisits: number;
  completedThisMonth: number;
}

export default function DashboardVisits() {
  const { data: visits, isLoading: visitsLoading } = useQuery<VisitWithBuilding[]>({
    queryKey: ["/api/visits"],
  });

  const { data: buildings } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const { data: executives } = useQuery<ExecutiveWorkload[]>({
    queryKey: ["/api/executives/workload"],
  });

  const getStats = (): DashboardStats => {
    if (!visits || !buildings) {
      return {
        totalBuildings: 0,
        visitedBuildings: 0,
        overdueVisits: 0,
        buildingsWithoutRecentVisit: 0,
      };
    }

    const visitedBuildingIds = new Set(
      visits
        .filter((v) => v.status === "realizada")
        .map((v) => v.buildingId)
    );

    const overdueVisits = visits.filter((v) => v.status === "atrasada").length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentlyVisitedIds = new Set(
      visits
        .filter(
          (v) =>
            v.status === "realizada" &&
            v.completedAt &&
            new Date(v.completedAt) > thirtyDaysAgo
        )
        .map((v) => v.buildingId)
    );

    return {
      totalBuildings: buildings.length,
      visitedBuildings: visitedBuildingIds.size,
      overdueVisits,
      buildingsWithoutRecentVisit: buildings.length - recentlyVisitedIds.size,
    };
  };

  const getOverdueVisits = () => {
    if (!visits) return [];
    return visits.filter((v) => v.status === "atrasada");
  };

  const stats = getStats();
  const coveragePercent = stats.totalBuildings > 0
    ? Math.round((stats.visitedBuildings / stats.totalBuildings) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">Panel de Visitas</h1>
        <div className="flex items-center gap-2">
          <Button asChild data-testid="button-schedule-visit">
            <Link href="/visitas/programar">
              <Plus className="h-4 w-4 mr-2" />
              Programar visita
            </Link>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/visits"] })}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Cobertura Edificios</p>
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold" data-testid="stat-coverage">
                  {coveragePercent}%
                </span>
                <span className="text-sm text-muted-foreground mb-1">
                  ({stats.visitedBuildings}/{stats.totalBuildings})
                </span>
              </div>
              <Progress value={coveragePercent} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Visitas Atrasadas</p>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold" data-testid="stat-overdue">
              {stats.overdueVisits}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Requieren atencion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Sin Visita Reciente</p>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold" data-testid="stat-no-recent">
              {stats.buildingsWithoutRecentVisit}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Ultimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Ejecutivos Activos</p>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold" data-testid="stat-executives">
              {executives?.length || 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              En operacion
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Visitas Atrasadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {visitsLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : getOverdueVisits().length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No hay visitas atrasadas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {getOverdueVisits().slice(0, 5).map((visit) => (
                  <div
                    key={visit.id}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/30"
                    data-testid={`overdue-visit-${visit.id}`}
                  >
                    <div>
                      <p className="font-medium">{visit.building?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {visit.executiveName} - {visit.scheduledDate && format(new Date(visit.scheduledDate), "dd MMM", { locale: es })}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      {visit.scheduledDate && differenceInDays(new Date(), new Date(visit.scheduledDate))} dias
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-4 w-4" />
              Carga por Ejecutivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!executives ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : executives.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No hay ejecutivos registrados</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ejecutivo</TableHead>
                    <TableHead className="text-center">Edificios</TableHead>
                    <TableHead className="text-center">Pendientes</TableHead>
                    <TableHead className="text-center">Completadas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executives.map((exec) => (
                    <TableRow key={exec.id} data-testid={`exec-row-${exec.id}`}>
                      <TableCell className="font-medium">{exec.name}</TableCell>
                      <TableCell className="text-center">{exec.assignedBuildings}</TableCell>
                      <TableCell className="text-center">
                        {exec.pendingVisits > 0 ? (
                          <Badge variant="outline">{exec.pendingVisits}</Badge>
                        ) : (
                          "0"
                        )}
                      </TableCell>
                      <TableCell className="text-center">{exec.completedThisMonth}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
