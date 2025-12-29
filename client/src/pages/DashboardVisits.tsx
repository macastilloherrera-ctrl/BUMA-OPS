import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  Calendar,
  AlertTriangle,
  Users,
  RefreshCw,
  Plus,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { Visit, Building } from "@shared/schema";
import { format, differenceInDays, isToday, isTomorrow, isBefore, startOfDay, compareAsc } from "date-fns";
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
  const [activeTab, setActiveTab] = useState("agenda");
  const [showBuildingsDialog, setShowBuildingsDialog] = useState(false);

  const { data: visits, isLoading: visitsLoading } = useQuery<VisitWithBuilding[]>({
    queryKey: ["/api/visits"],
  });

  const { data: buildings } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const { data: executives } = useQuery<ExecutiveWorkload[]>({
    queryKey: ["/api/executives/workload"],
  });

  const now = new Date();
  const todayStart = startOfDay(now);

  const overdueVisits = visits?.filter((v) => 
    v.status === "atrasada" || 
    (v.status === "programada" && v.scheduledDate && isBefore(new Date(v.scheduledDate), todayStart))
  ) || [];

  const upcomingVisits = visits?.filter((v) => 
    v.status === "programada" && v.scheduledDate && !isBefore(new Date(v.scheduledDate), todayStart)
  ).sort((a, b) => compareAsc(new Date(a.scheduledDate!), new Date(b.scheduledDate!))) || [];

  const groupVisitsByDate = (visitList: VisitWithBuilding[]) => {
    const groups: { [key: string]: VisitWithBuilding[] } = {};
    
    visitList.forEach((visit) => {
      if (!visit.scheduledDate) return;
      const date = new Date(visit.scheduledDate);
      let label: string;
      
      if (isToday(date)) {
        label = "Hoy";
      } else if (isTomorrow(date)) {
        label = "Manana";
      } else {
        label = format(date, "EEEE d 'de' MMMM", { locale: es });
      }
      
      if (!groups[label]) groups[label] = [];
      groups[label].push(visit);
    });
    
    return groups;
  };

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
      overdueVisits: overdueVisits.length,
      buildingsWithoutRecentVisit: buildings.length - recentlyVisitedIds.size,
    };
  };

  const stats = getStats();
  const coveragePercent = stats.totalBuildings > 0
    ? Math.round((stats.visitedBuildings / stats.totalBuildings) * 100)
    : 0;

  const groupedUpcoming = groupVisitsByDate(upcomingVisits);

  const getVisitedBuildingIds = () => {
    if (!visits) return new Set<string>();
    return new Set(
      visits
        .filter((v) => v.status === "realizada")
        .map((v) => v.buildingId)
    );
  };

  const visitedBuildingIds = getVisitedBuildingIds();
  const visitedBuildings = buildings?.filter(b => visitedBuildingIds.has(b.id)) || [];
  const notVisitedBuildings = buildings?.filter(b => !visitedBuildingIds.has(b.id)) || [];

  const renderVisitCard = (visit: VisitWithBuilding) => (
    <Link key={visit.id} href={`/visitas/${visit.id}`}>
      <Card className="hover-elevate cursor-pointer" data-testid={`card-visit-${visit.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-medium truncate">
                  {visit.building?.name || "Edificio"}
                </h3>
                {visit.type === "urgente" && (
                  <Badge variant="destructive" className="text-xs">Urgente</Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">
                  {visit.building?.address || "Direccion"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {visit.scheduledDate && format(new Date(visit.scheduledDate), "HH:mm", { locale: es })}
                  </span>
                </div>
                {visit.executiveName && (
                  <span className="text-muted-foreground">
                    {visit.executiveName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

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
        <Card 
          className="hover-elevate cursor-pointer" 
          onClick={() => setShowBuildingsDialog(true)}
          data-testid="card-buildings-visited"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Edificios Visitados</p>
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold" data-testid="stat-coverage">
                  {stats.visitedBuildings}/{stats.totalBuildings}
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="agenda" data-testid="tab-agenda">
            <Calendar className="h-4 w-4 mr-2" />
            Agenda
            {upcomingVisits.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {upcomingVisits.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="atrasadas" data-testid="tab-atrasadas">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Atrasadas
            {overdueVisits.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {overdueVisits.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {visitsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : upcomingVisits.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">No hay visitas programadas</p>
                    <Button asChild variant="outline">
                      <Link href="/visitas/programar">
                        <Plus className="h-4 w-4 mr-2" />
                        Programar primera visita
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedUpcoming).map(([dateLabel, dateVisits]) => (
                    <div key={dateLabel}>
                      <h2 className="text-sm font-medium text-muted-foreground mb-3 capitalize">
                        {dateLabel}
                      </h2>
                      <div className="space-y-3">
                        {dateVisits.map(renderVisitCard)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Carga por Ejecutivo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!executives ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : executives.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay ejecutivos registrados
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {executives.map((exec) => (
                        <div
                          key={exec.id}
                          className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                          data-testid={`exec-summary-${exec.id}`}
                        >
                          <div>
                            <p className="font-medium text-sm">{exec.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {exec.assignedBuildings} edificios
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {exec.pendingVisits > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {exec.pendingVisits} pend.
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="atrasadas" className="mt-4">
          {visitsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : overdueVisits.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hay visitas atrasadas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {overdueVisits.map((visit) => (
                <Link key={visit.id} href={`/visitas/${visit.id}`}>
                  <Card className="hover-elevate cursor-pointer border-destructive/50" data-testid={`card-visit-overdue-${visit.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-medium truncate">
                              {visit.building?.name || "Edificio"}
                            </h3>
                            <Badge variant="destructive" className="text-xs">
                              {visit.scheduledDate && differenceInDays(new Date(), new Date(visit.scheduledDate))} dias atrasada
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">
                              {visit.building?.address || "Direccion"}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm flex-wrap">
                            <div className="flex items-center gap-1 text-destructive">
                              <Clock className="h-3.5 w-3.5" />
                              <span>
                                {visit.scheduledDate && format(new Date(visit.scheduledDate), "dd MMM, HH:mm", { locale: es })}
                              </span>
                            </div>
                            {visit.executiveName && (
                              <span className="text-muted-foreground">
                                {visit.executiveName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showBuildingsDialog} onOpenChange={setShowBuildingsDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edificios Visitados</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {notVisitedBuildings.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Sin visita ({notVisitedBuildings.length})
                </h3>
                <div className="space-y-2">
                  {notVisitedBuildings.map((building) => (
                    <div
                      key={building.id}
                      className="flex items-center gap-3 p-2 rounded-md bg-muted/30"
                      data-testid={`building-not-visited-${building.id}`}
                    >
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{building.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{building.address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {visitedBuildings.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Con visita completada ({visitedBuildings.length})
                </h3>
                <div className="space-y-2">
                  {visitedBuildings.map((building) => (
                    <div
                      key={building.id}
                      className="flex items-center gap-3 p-2 rounded-md bg-muted/30"
                      data-testid={`building-visited-${building.id}`}
                    >
                      <Building2 className="h-4 w-4 text-green-600" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{building.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{building.address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {buildings?.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No hay edificios registrados
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
