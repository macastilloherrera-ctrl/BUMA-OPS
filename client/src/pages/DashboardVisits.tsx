import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  ChevronLeft,
} from "lucide-react";
import type { Visit, Building, VisitStatus } from "@shared/schema";
import { format, differenceInDays, isToday, isBefore, startOfDay, compareAsc, addDays, startOfWeek, isSameDay, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { Link, useLocation } from "wouter";
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

const getStatusColor = (status: VisitStatus, scheduledDate?: Date | string | null) => {
  const today = startOfDay(new Date());
  const visitDate = scheduledDate ? startOfDay(new Date(scheduledDate)) : null;
  const isOverdue = visitDate && isBefore(visitDate, today) && status === "programada";
  
  switch (status) {
    case "realizada":
      return {
        bg: "bg-green-100 dark:bg-green-900/30",
        border: "border-green-500",
        text: "text-green-700 dark:text-green-300",
        label: "Ejecutada",
        isOverdue: false
      };
    case "programada":
      if (isOverdue) {
        return {
          bg: "bg-red-50 dark:bg-red-900/20",
          border: "border-red-300",
          text: "text-red-600 dark:text-red-300",
          label: "Atrasada",
          isOverdue: true
        };
      }
      return {
        bg: "bg-amber-100 dark:bg-amber-900/30",
        border: "border-amber-500",
        text: "text-amber-700 dark:text-amber-300",
        label: "Programada",
        isOverdue: false
      };
    case "atrasada":
      return {
        bg: "bg-red-50 dark:bg-red-900/20",
        border: "border-red-300",
        text: "text-red-600 dark:text-red-300",
        label: "Atrasada",
        isOverdue: true
      };
    case "no_realizada":
      return {
        bg: "bg-red-200 dark:bg-red-900/50",
        border: "border-red-600",
        text: "text-red-800 dark:text-red-200",
        label: "No Realizada",
        isOverdue: false
      };
    case "en_curso":
      return {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        border: "border-blue-500",
        text: "text-blue-700 dark:text-blue-300",
        label: "En Curso",
        isOverdue: false
      };
    default:
      return {
        bg: "bg-muted",
        border: "border-muted-foreground/20",
        text: "text-muted-foreground",
        label: status,
        isOverdue: false
      };
  }
};

export default function DashboardVisits() {
  const [, navigate] = useLocation();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showCoverageDialog, setShowCoverageDialog] = useState(false);
  const [showOverdueDialog, setShowOverdueDialog] = useState(false);
  const [showTeamDialog, setShowTeamDialog] = useState(false);
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
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // Atrasada: Es el día de la visita, la hora agendada ya pasó, y NO se ha iniciado
  const overdueVisits = visits?.filter((v) => {
    if (v.status === "en_curso" || v.status === "realizada" || v.status === "no_realizada" || v.status === "cancelada") return false;
    if (!v.scheduledDate) return false;
    const visitDate = new Date(v.scheduledDate);
    // Es hoy y la hora ya pasó
    return visitDate >= todayStart && visitDate < todayEnd && visitDate < now;
  }) || [];

  // No Efectuada: Pasó el día de la visita y NO se inició, O no tiene fecha
  const notEffectuatedVisits = visits?.filter((v) => {
    if (v.status === "en_curso" || v.status === "realizada" || v.status === "cancelada") return false;
    // Si ya está marcada como no_realizada, cuenta
    if (v.status === "no_realizada") return true;
    // Sin fecha programada y no iniciada
    if (!v.scheduledDate) return true;
    const visitDate = new Date(v.scheduledDate);
    // El día de la visita ya pasó (es un día anterior a hoy)
    return visitDate < todayStart;
  }) || [];

  const getStats = () => {
    if (!visits || !buildings) {
      return {
        totalBuildings: 0,
        visitedThisMonth: 0,
        overdueVisits: 0,
        completedVisits: 0,
        notCompletedVisits: 0,
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

    // Visitas efectuadas: realizadas en los últimos 30 días
    const completedVisits = visits.filter(
      (v) =>
        v.status === "realizada" &&
        v.completedAt &&
        new Date(v.completedAt) > thirtyDaysAgo
    ).length;

    // Visitas no efectuadas: basado en la lógica definida arriba, filtradas por últimos 30 días
    const notCompletedVisitsCount = notEffectuatedVisits.filter((v) => {
      if (!v.scheduledDate) return false; // Sin fecha no cuenta en el rango
      return new Date(v.scheduledDate) > thirtyDaysAgo;
    }).length;

    return {
      totalBuildings: buildings.length,
      visitedThisMonth: recentlyVisitedIds.size,
      overdueVisits: overdueVisits.length,
      completedVisits,
      notCompletedVisits: notCompletedVisitsCount,
    };
  };

  const stats = getStats();
  const coveragePercent = stats.totalBuildings > 0
    ? Math.round((stats.visitedThisMonth / stats.totalBuildings) * 100)
    : 0;

  const getExecutiveStats = () => {
    if (!visits) return { withVisitsToday: 0, inField: 0 };
    
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const executivesWithVisitsToday = new Set(
      visits
        .filter(v => {
          if (!v.scheduledDate) return false;
          const visitDate = new Date(v.scheduledDate);
          return visitDate >= today && visitDate < tomorrow && 
                 (v.status === "programada" || v.status === "en_curso");
        })
        .map(v => v.executiveId)
    );

    const executivesInField = new Set(
      visits
        .filter(v => v.status === "en_curso")
        .map(v => v.executiveId)
    );

    return {
      withVisitsToday: executivesWithVisitsToday.size,
      inField: executivesInField.size,
    };
  };

  const executiveStats = getExecutiveStats();

  const getTodaysVisitsByExecutive = () => {
    if (!visits || !executivesList) return [];
    
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysVisits = visits.filter(v => {
      if (!v.scheduledDate) return false;
      const visitDate = new Date(v.scheduledDate);
      return visitDate >= today && visitDate < tomorrow && 
             (v.status === "programada" || v.status === "en_curso");
    });

    const grouped: { [key: string]: { executive: ExecutiveInfo; visits: VisitWithBuilding[] } } = {};
    
    todaysVisits.forEach(visit => {
      const execId = visit.executiveId || "unknown";
      if (!grouped[execId]) {
        const exec = executivesList.find(e => e.userId === execId);
        grouped[execId] = {
          executive: exec || { userId: execId, displayName: execId },
          visits: []
        };
      }
      grouped[execId].visits.push(visit);
    });

    return Object.values(grouped).sort((a, b) => 
      a.executive.displayName.localeCompare(b.executive.displayName)
    );
  };

  const getInProgressVisits = () => {
    if (!visits) return [];
    return visits.filter(v => v.status === "en_curso");
  };

  const todaysVisitsByExecutive = getTodaysVisitsByExecutive();
  const inProgressVisits = getInProgressVisits();

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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

        <Card 
          className="hover-elevate cursor-pointer"
          onClick={() => navigate("/visitas?tab=efectuadas")}
          data-testid="card-completed-visits"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Visitas Efectuadas</p>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600" data-testid="stat-completed">
              {stats.completedVisits}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Ultimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card 
          className="hover-elevate cursor-pointer"
          onClick={() => navigate("/visitas?tab=no_efectuadas")}
          data-testid="card-not-completed-visits"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Visitas No Efectuadas</p>
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-red-600" data-testid="stat-not-completed">
              {stats.notCompletedVisits}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Ultimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card 
          className="hover-elevate cursor-pointer"
          onClick={() => setShowTeamDialog(true)}
          data-testid="card-team-field"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Equipo en Campo</p>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Con visitas hoy</span>
                <span className="text-xl font-bold" data-testid="stat-executives-today">
                  {executiveStats.withVisitsToday}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">En terreno ahora</span>
                <span className="text-xl font-bold" data-testid="stat-executives-field">
                  {executiveStats.inField > 0 ? (
                    <span className="text-green-600">{executiveStats.inField}</span>
                  ) : (
                    <span>{executiveStats.inField}</span>
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outlook-style Calendar View */}
      <Card data-testid="card-calendar-view">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
                data-testid="button-prev-week"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
                data-testid="button-next-week"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <CardTitle className="text-lg">
                {format(currentWeekStart, "d MMM", { locale: es })} - {format(addDays(currentWeekStart, 6), "d MMM yyyy", { locale: es })}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                data-testid="button-today"
              >
                Hoy
              </Button>
            </div>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t">
            <span className="text-xs text-muted-foreground">Leyenda:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-green-100 dark:bg-green-900/30 border border-green-500" />
              <span className="text-xs">Ejecutada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-amber-100 dark:bg-amber-900/30 border border-amber-500" />
              <span className="text-xs">Programada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-50 dark:bg-red-900/20 border border-red-300" />
              <span className="text-xs">Atrasada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-200 dark:bg-red-900/50 border border-red-600" />
              <span className="text-xs">No Realizada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-blue-100 dark:bg-blue-900/30 border border-blue-500" />
              <span className="text-xs">En Curso</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
            {visitsLoading ? (
              <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-[700px]">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <Skeleton key={i} className="h-32 w-full min-w-[90px]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-[700px]">
              {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
                const dayDate = addDays(currentWeekStart, dayOffset);
                const dayVisits = visits?.filter((v) => {
                  if (!v.scheduledDate) return false;
                  return isSameDay(new Date(v.scheduledDate), dayDate);
                }).sort((a, b) => {
                  const timeA = new Date(a.scheduledDate!).getTime();
                  const timeB = new Date(b.scheduledDate!).getTime();
                  return timeA - timeB;
                }) || [];
                
                const isDayToday = isToday(dayDate);
                const isPast = isBefore(dayDate, startOfDay(new Date()));

                return (
                  <div
                    key={dayOffset}
                    className={`min-h-32 rounded-md border p-1 sm:p-2 ${
                      isDayToday 
                        ? "bg-primary/5 border-primary/50" 
                        : isPast 
                          ? "bg-muted/30" 
                          : "bg-background"
                    }`}
                    data-testid={`calendar-day-${format(dayDate, "yyyy-MM-dd")}`}
                  >
                    {/* Day header */}
                    <div className={`text-center mb-1 sm:mb-2 pb-1 border-b ${isDayToday ? "border-primary/30" : ""}`}>
                      <div className="text-xs text-muted-foreground capitalize">
                        {format(dayDate, "EEE", { locale: es })}
                      </div>
                      <div className={`text-sm font-semibold ${isDayToday ? "text-primary" : ""}`}>
                        {format(dayDate, "d")}
                      </div>
                    </div>
                    
                    {/* Day visits */}
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {dayVisits.length === 0 && !isPast && (
                        <p className="text-xs text-muted-foreground text-center py-2">-</p>
                      )}
                      {dayVisits.map((visit) => {
                        const statusColors = getStatusColor(visit.status as VisitStatus, visit.scheduledDate);
                        const isNoRealizada = visit.status === "no_realizada";
                        
                        return (
                          <div
                            key={visit.id}
                            onClick={() => {
                              if (isNoRealizada) {
                                navigate(`/visitas/${visit.id}`);
                              } else {
                                navigate(`/visitas/${visit.id}`);
                              }
                            }}
                            className={`p-1.5 sm:p-2 rounded-md border-l-4 cursor-pointer hover-elevate ${statusColors.bg} ${statusColors.border}`}
                            data-testid={`calendar-visit-${visit.id}`}
                          >
                            <div className={`text-xs font-medium truncate ${statusColors.text}`}>
                              {visit.building?.name || "Edificio"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(visit.scheduledDate!), "HH:mm")}
                            </div>
                            {isNoRealizada && (
                              <Badge 
                                variant="destructive" 
                                className="text-xs mt-1 py-0"
                              >
                                Reprogramar
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Executive workload card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Carga por Ejecutivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!executives ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : executives.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay ejecutivos</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {executives.map((exec) => (
                <div
                  key={exec.id}
                  className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50"
                  data-testid={`exec-workload-${exec.id}`}
                >
                  <span className="truncate">{exec.name}</span>
                  <Badge variant="outline" className="text-xs ml-2">
                    {exec.pendingVisits} pend.
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
                <div className="p-3 rounded-md bg-destructive/5 border border-destructive/20">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    Sin visita este mes ({notVisitedThisMonth.length})
                  </h3>
                  <div className="space-y-2">
                    {notVisitedThisMonth.map((building) => {
                      const lastVisit = getBuildingVisitHistory(building.id)[0];
                      return (
                        <div
                          key={building.id}
                          className="flex items-center gap-3 p-3 rounded-md bg-background"
                          data-testid={`building-not-visited-${building.id}`}
                        >
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div 
                            className="flex-1 min-w-0 cursor-pointer hover-elevate rounded p-1 -m-1"
                            onClick={() => setSelectedBuilding(building)}
                          >
                            <p className="font-medium text-sm truncate">{building.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {lastVisit 
                                ? `Ultima: ${format(new Date(lastVisit.completedAt!), "dd MMM yyyy", { locale: es })}`
                                : "Nunca visitado"
                              }
                            </p>
                          </div>
                          <Link 
                            href={`/visitas/programar?buildingId=${building.id}`}
                            onClick={() => setShowCoverageDialog(false)}
                          >
                            <Button size="sm" data-testid={`button-schedule-${building.id}`}>
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Programar
                            </Button>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {visitedThisMonth.length > 0 && (
                <div className="p-3 rounded-md bg-green-500/5 border border-green-500/20">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Visitados este mes ({visitedThisMonth.length})
                  </h3>
                  <div className="space-y-2">
                    {visitedThisMonth.map((building) => {
                      const lastVisit = getBuildingVisitHistory(building.id)[0];
                      return (
                        <div
                          key={building.id}
                          className="flex items-center gap-3 p-3 rounded-md bg-background hover-elevate cursor-pointer"
                          onClick={() => setSelectedBuilding(building)}
                          data-testid={`building-visited-${building.id}`}
                        >
                          <Building2 className="h-4 w-4 text-green-600 flex-shrink-0" />
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

      <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Equipo en Campo
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Actividad de ejecutivos para hoy
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {inProgressVisits.length > 0 && (
              <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  En terreno ahora ({inProgressVisits.length})
                </h3>
                <div className="space-y-2">
                  {inProgressVisits.map((visit) => (
                    <Link 
                      key={visit.id} 
                      href={`/visitas/${visit.id}`}
                      onClick={() => setShowTeamDialog(false)}
                    >
                      <div
                        className="flex items-center gap-3 p-3 rounded-md bg-background hover-elevate cursor-pointer"
                        data-testid={`in-progress-visit-${visit.id}`}
                      >
                        <User className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{getExecutiveName(visit.executiveId)}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {visit.building?.name || "Edificio"}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-500/30">
                            En curso
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {todaysVisitsByExecutive.length > 0 ? (
              <div className="p-3 rounded-md bg-muted/30 border">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Visitas programadas hoy ({todaysVisitsByExecutive.reduce((acc, g) => acc + g.visits.length, 0)})
                </h3>
                <div className="space-y-4">
                  {todaysVisitsByExecutive.map((group) => (
                    <div key={group.executive.userId} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{group.executive.displayName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {group.visits.length} {group.visits.length === 1 ? 'visita' : 'visitas'}
                        </Badge>
                      </div>
                      <div className="pl-5 space-y-1">
                        {group.visits
                          .sort((a, b) => {
                            if (!a.scheduledDate || !b.scheduledDate) return 0;
                            return compareAsc(new Date(a.scheduledDate), new Date(b.scheduledDate));
                          })
                          .map((visit) => (
                            <Link 
                              key={visit.id} 
                              href={`/visitas/${visit.id}`}
                              onClick={() => setShowTeamDialog(false)}
                            >
                              <div 
                                className="flex items-center gap-3 p-2 rounded-md bg-background hover-elevate cursor-pointer"
                                data-testid={`today-visit-${visit.id}`}
                              >
                                <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm font-medium">
                                  {visit.scheduledDate && format(new Date(visit.scheduledDate), "HH:mm", { locale: es })}
                                </span>
                                <span className="text-sm text-muted-foreground truncate flex-1">
                                  {visit.building?.name || "Edificio"}
                                </span>
                                {visit.status === "en_curso" && (
                                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-500/30">
                                    En curso
                                  </Badge>
                                )}
                                {visit.type === "urgente" && (
                                  <Badge variant="destructive" className="text-xs">
                                    Urgente
                                  </Badge>
                                )}
                              </div>
                            </Link>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hay visitas programadas para hoy</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
