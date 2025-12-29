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
  User,
  ChevronRight,
  ArrowLeft,
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


interface ExecutiveWorkload {
  id: string;
  name: string;
  assignedBuildings: number;
  pendingVisits: number;
  completedThisMonth: number;
}

interface ExecutiveInfo {
  userId: string;
  displayName: string;
}

export default function DashboardVisits() {
  const [activeTab, setActiveTab] = useState("agenda");
  const [showCoverageDialog, setShowCoverageDialog] = useState(false);
  const [showOverdueDialog, setShowOverdueDialog] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  const { data: visits, isLoading: visitsLoading } = useQuery<VisitWithBuilding[]>({
    queryKey: ["/api/visits"],
  });

  const { data: buildings } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const { data: executives } = useQuery<ExecutiveWorkload[]>({
    queryKey: ["/api/executives/workload"],
  });

  const { data: executivesList } = useQuery<ExecutiveInfo[]>({
    queryKey: ["/api/users/executives"],
  });

  const getExecutiveName = (executiveId: string | null | undefined): string => {
    if (!executiveId || !executivesList) return "Sin asignar";
    const exec = executivesList.find(e => e.userId === executiveId);
    return exec?.displayName || executiveId;
  };

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

  const getStats = () => {
    if (!visits || !buildings) {
      return {
        totalBuildings: 0,
        visitedThisMonth: 0,
        overdueVisits: 0,
      };
    }

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
      visitedThisMonth: recentlyVisitedIds.size,
      overdueVisits: overdueVisits.length,
    };
  };

  const stats = getStats();
  const coveragePercent = stats.totalBuildings > 0
    ? Math.round((stats.visitedThisMonth / stats.totalBuildings) * 100)
    : 0;

  const groupedUpcoming = groupVisitsByDate(upcomingVisits);

  const getMonthlyVisitedBuildingIds = () => {
    if (!visits) return new Set<string>();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Set(
      visits
        .filter((v) => v.status === "realizada" && v.completedAt && new Date(v.completedAt) > thirtyDaysAgo)
        .map((v) => v.buildingId)
    );
  };

  const monthlyVisitedIds = getMonthlyVisitedBuildingIds();
  const visitedThisMonth = buildings?.filter(b => monthlyVisitedIds.has(b.id)) || [];
  const notVisitedThisMonth = buildings?.filter(b => !monthlyVisitedIds.has(b.id)) || [];

  const getBuildingVisitHistory = (buildingId: string) => {
    return visits?.filter(v => v.buildingId === buildingId && v.status === "realizada")
      .sort((a, b) => {
        if (!a.completedAt || !b.completedAt) return 0;
        return compareAsc(new Date(b.completedAt), new Date(a.completedAt));
      }) || [];
  };

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="hover-elevate cursor-pointer" 
          onClick={() => setShowCoverageDialog(true)}
          data-testid="card-monthly-coverage"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Cobertura Mensual</p>
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold" data-testid="stat-coverage">
                  {stats.visitedThisMonth}/{stats.totalBuildings}
                </span>
                <span className="text-sm text-muted-foreground mb-1">
                  edificios
                </span>
              </div>
              <Progress value={coveragePercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Ultimos 30 dias
              </p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="hover-elevate cursor-pointer"
          onClick={() => setShowOverdueDialog(true)}
          data-testid="card-overdue-visits"
        >
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

      <Dialog open={showCoverageDialog} onOpenChange={(open) => {
        setShowCoverageDialog(open);
        if (!open) setSelectedBuilding(null);
      }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedBuilding && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 mr-1"
                  onClick={() => setSelectedBuilding(null)}
                  data-testid="button-back-to-list"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              {selectedBuilding ? selectedBuilding.name : "Cobertura Mensual"}
            </DialogTitle>
            {!selectedBuilding && (
              <p className="text-sm text-muted-foreground">
                Edificios visitados en los ultimos 30 dias
              </p>
            )}
          </DialogHeader>

          {selectedBuilding ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedBuilding.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Ejecutivo asignado:</span>
                  <span>{getExecutiveName(selectedBuilding.assignedExecutiveId)}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-3">Visitas pendientes/atrasadas</h3>
                {(() => {
                  const buildingVisits = visits?.filter(
                    v => v.buildingId === selectedBuilding.id && 
                    (v.status === "programada" || v.status === "atrasada")
                  ).sort((a, b) => {
                    if (!a.scheduledDate || !b.scheduledDate) return 0;
                    return compareAsc(new Date(a.scheduledDate), new Date(b.scheduledDate));
                  }) || [];

                  if (buildingVisits.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No hay visitas pendientes para este edificio
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {buildingVisits.map((visit) => {
                        const isOverdue = visit.status === "atrasada" || 
                          (visit.scheduledDate && isBefore(new Date(visit.scheduledDate), todayStart));
                        return (
                          <Link key={visit.id} href={`/visitas/${visit.id}`} onClick={() => setShowCoverageDialog(false)}>
                            <div
                              className={`flex items-center justify-between p-3 rounded-md hover-elevate cursor-pointer ${isOverdue ? 'bg-destructive/10' : 'bg-muted/30'}`}
                              data-testid={`building-visit-${visit.id}`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className={`h-3.5 w-3.5 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`} />
                                  <span className={`text-sm font-medium ${isOverdue ? 'text-destructive' : ''}`}>
                                    {visit.scheduledDate && format(new Date(visit.scheduledDate), "dd MMM yyyy, HH:mm", { locale: es })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  <span>{getExecutiveName(visit.executiveId)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isOverdue && (
                                  <Badge variant="destructive" className="text-xs">
                                    Atrasada
                                  </Badge>
                                )}
                                {visit.type === "urgente" && (
                                  <Badge variant="destructive" className="text-xs">
                                    Urgente
                                  </Badge>
                                )}
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <div>
                <h3 className="text-sm font-medium mb-3">Historico de visitas</h3>
                {(() => {
                  const history = getBuildingVisitHistory(selectedBuilding.id);

                  if (history.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground py-2">
                        Este edificio nunca ha sido visitado
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {history.map((visit) => (
                        <div 
                          key={visit.id} 
                          className="flex items-center gap-3 p-3 rounded-md bg-muted/30"
                          data-testid={`history-visit-${visit.id}`}
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium">
                              {visit.completedAt && format(new Date(visit.completedAt), "dd MMM yyyy", { locale: es })}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{getExecutiveName(visit.executiveId)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {notVisitedThisMonth.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    Sin visita este mes ({notVisitedThisMonth.length})
                  </h3>
                  <div className="space-y-2">
                    {notVisitedThisMonth.map((building) => {
                      const lastVisit = getBuildingVisitHistory(building.id)[0];
                      return (
                        <div
                          key={building.id}
                          className="flex items-center gap-3 p-2 rounded-md bg-muted/30 hover-elevate cursor-pointer"
                          onClick={() => setSelectedBuilding(building)}
                          data-testid={`building-not-visited-${building.id}`}
                        >
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{building.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {lastVisit 
                                ? `Ultima visita: ${format(new Date(lastVisit.completedAt!), "dd MMM yyyy", { locale: es })}`
                                : "Nunca visitado"
                              }
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {visitedThisMonth.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Visitados este mes ({visitedThisMonth.length})
                  </h3>
                  <div className="space-y-2">
                    {visitedThisMonth.map((building) => {
                      const lastVisit = getBuildingVisitHistory(building.id)[0];
                      return (
                        <div
                          key={building.id}
                          className="flex items-center gap-3 p-2 rounded-md bg-muted/30 hover-elevate cursor-pointer"
                          onClick={() => setSelectedBuilding(building)}
                          data-testid={`building-visited-${building.id}`}
                        >
                          <Building2 className="h-4 w-4 text-green-600" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{building.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {lastVisit && `Ultima: ${format(new Date(lastVisit.completedAt!), "dd MMM yyyy", { locale: es })} - ${getExecutiveName(lastVisit.executiveId)}`}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {buildings?.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No hay edificios registrados
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showOverdueDialog} onOpenChange={setShowOverdueDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Visitas Atrasadas ({overdueVisits.length})
            </DialogTitle>
          </DialogHeader>

          {overdueVisits.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <p className="text-muted-foreground">No hay visitas atrasadas</p>
              <p className="text-sm text-muted-foreground mt-1">Todas las visitas estan al dia</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overdueVisits
                .sort((a, b) => {
                  if (!a.scheduledDate || !b.scheduledDate) return 0;
                  return compareAsc(new Date(a.scheduledDate), new Date(b.scheduledDate));
                })
                .map((visit) => {
                  const daysOverdue = visit.scheduledDate 
                    ? differenceInDays(new Date(), new Date(visit.scheduledDate))
                    : 0;
                  
                  return (
                    <Link 
                      key={visit.id} 
                      href={`/visitas/${visit.id}`}
                      onClick={() => setShowOverdueDialog(false)}
                    >
                      <div
                        className="flex items-start justify-between p-3 rounded-md bg-destructive/10 hover-elevate cursor-pointer"
                        data-testid={`overdue-visit-detail-${visit.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-medium text-sm">
                              {visit.building?.name || "Edificio"}
                            </h3>
                            <Badge variant="destructive" className="text-xs">
                              {daysOverdue} {daysOverdue === 1 ? 'dia' : 'dias'} atrasada
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">
                              {visit.building?.address || "Direccion"}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs flex-wrap">
                            <div className="flex items-center gap-1 text-destructive">
                              <Clock className="h-3 w-3" />
                              <span>
                                {visit.scheduledDate && format(new Date(visit.scheduledDate), "dd MMM yyyy, HH:mm", { locale: es })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{getExecutiveName(visit.executiveId)}</span>
                            </div>
                          </div>
                          {visit.type === "urgente" && (
                            <Badge variant="destructive" className="text-xs mt-2">
                              Urgente
                            </Badge>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                      </div>
                    </Link>
                  );
                })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
