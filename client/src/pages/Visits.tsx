import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { CancelVisitDialog } from "@/components/CancelVisitDialog";
import { Plus, Calendar, MapPin, Clock, CheckCircle2, XCircle, AlertTriangle, MoreVertical, Trash2, User, FileText, PlayCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Visit, Building } from "@shared/schema";
import { format, isToday, isTomorrow, isBefore, startOfDay, parseISO, compareAsc } from "date-fns";
import { es } from "date-fns/locale";

interface VisitWithBuilding extends Visit {
  building?: Building;
  executiveName?: string | null;
}

export default function Visits() {
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const tabFromUrl = urlParams.get("tab");
  
  const [activeTab, setActiveTab] = useState(tabFromUrl || "agendadas");
  const [selectedVisit, setSelectedVisit] = useState<VisitWithBuilding | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  useEffect(() => {
    if (tabFromUrl && ["agendadas", "atrasadas", "no_efectuadas", "efectuadas", "en_curso"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleCancelClick = (e: React.MouseEvent, visit: VisitWithBuilding) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedVisit(visit);
    setShowCancelDialog(true);
  };

  const { data: visits, isLoading } = useQuery<VisitWithBuilding[]>({
    queryKey: ["/api/visits"],
  });

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // Agendadas: Visitas programadas para hoy (futuras) o días posteriores
  const scheduledVisits = visits?.filter((v) => {
    if (v.status !== "programada" && v.status !== "borrador") return false;
    if (!v.scheduledDate) return false;
    const visitDate = new Date(v.scheduledDate);
    // Es hoy pero la hora aún no ha pasado, o es en el futuro
    return visitDate >= now;
  }).sort((a, b) => compareAsc(new Date(a.scheduledDate!), new Date(b.scheduledDate!))) || [];

  // Atrasadas: Es el día de la visita, la hora agendada ya pasó, y NO se ha iniciado
  const overdueVisits = visits?.filter((v) => {
    if (v.status === "en_curso" || v.status === "realizada" || v.status === "no_realizada" || v.status === "cancelada") return false;
    if (!v.scheduledDate) return false;
    const visitDate = new Date(v.scheduledDate);
    // Es hoy y la hora ya pasó
    return visitDate >= todayStart && visitDate < todayEnd && visitDate < now;
  }) || [];

  // No Efectuadas: Pasó el día de la visita y NO se inició, O ya está marcada como no_realizada
  const notCompletedVisits = visits?.filter((v) => {
    if (v.status === "en_curso" || v.status === "realizada") return false;
    if (v.status === "cancelada") return true;
    if (v.status === "no_realizada") return true;
    if (!v.scheduledDate) return false;
    const visitDate = new Date(v.scheduledDate);
    return visitDate < todayStart;
  }).sort((a, b) => compareAsc(new Date(b.scheduledDate!), new Date(a.scheduledDate!))) || [];

  // En Curso: Visitas iniciadas pero no completadas
  const inProgressVisits = visits?.filter((v) => v.status === "en_curso")
    .sort((a, b) => {
      if (!a.startedAt || !b.startedAt) return 0;
      return compareAsc(new Date(b.startedAt), new Date(a.startedAt));
    }) || [];

  // Auto-switch: si hay visitas en curso y el usuario abrió /visitas sin tab, posicionar en "en_curso".
  // Solo dispara una vez por carga de página para no atrapar al usuario en la tab.
  const autoSwitchedRef = useRef(false);
  useEffect(() => {
    if (autoSwitchedRef.current) return;
    if (!tabFromUrl && inProgressVisits.length > 0) {
      autoSwitchedRef.current = true;
      setActiveTab("en_curso");
    } else if (visits !== undefined) {
      // Datos ya cargados y no había visitas en curso → no volver a auto-switchear
      autoSwitchedRef.current = true;
    }
  }, [inProgressVisits.length, tabFromUrl, visits]);

  // Efectuadas: Visitas completadas
  const completedVisits = visits?.filter((v) => v.status === "realizada")
    .sort((a, b) => {
      if (!a.completedAt || !b.completedAt) return 0;
      return compareAsc(new Date(b.completedAt), new Date(a.completedAt));
    }) || [];

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

  const renderVisitCard = (visit: VisitWithBuilding, showCancelButton = true) => (
    <Link key={visit.id} href={`/visitas/${visit.id}`}>
      <Card className="hover-elevate cursor-pointer" data-testid={`card-visit-${visit.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-medium truncate">
                  {visit.building?.name || "Edificio"}
                </h3>
                <StatusBadge status={visit.status} type="visit" />
                {visit.type === "urgente" ? (
                  <Badge variant="destructive" className="text-xs">Urgente</Badge>
                ) : visit.type === "revision_proyecto" ? (
                  <Badge variant="outline" className="text-xs">Rev. Proyecto</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Rutina</Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{visit.building?.address || "Direccion"}</span>
              </div>
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {visit.scheduledDate && format(new Date(visit.scheduledDate), "dd MMM, HH:mm", { locale: es })}
                  </span>
                </div>
                {visit.executiveName && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{visit.executiveName}</span>
                  </div>
                )}
              </div>
              {visit.notes && (
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1" data-testid={`text-visit-notes-${visit.id}`}>
                  {visit.notes}
                </p>
              )}
            </div>
            {showCancelButton && visit.status !== "realizada" && visit.status !== "no_realizada" && visit.status !== "cancelada" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                  <Button variant="ghost" size="icon" data-testid={`button-visit-menu-${visit.id}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={(e) => handleCancelClick(e, visit)}
                    className="text-destructive"
                    data-testid={`button-cancel-visit-${visit.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Cancelar visita
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  const groupedScheduled = groupVisitsByDate(scheduledVisits);

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Agenda de Visitas</h1>
          <Button asChild data-testid="button-schedule-visit">
            <Link href="/visitas/programar">
              <Plus className="h-4 w-4 mr-2" />
              Programar visita
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-20 md:pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="sticky top-0 bg-background px-4 pt-3 z-10">
            <TabsList className="w-full grid grid-cols-5 h-10">
              <TabsTrigger value="en_curso" data-testid="tab-en-curso" className="text-xs sm:text-sm">
                En Curso
                {inProgressVisits.length > 0 && (
                  <Badge className="ml-1 text-xs bg-blue-600">
                    {inProgressVisits.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="agendadas" data-testid="tab-agendadas" className="text-xs sm:text-sm">
                Agendadas
                {scheduledVisits.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {scheduledVisits.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="atrasadas" data-testid="tab-atrasadas" className="text-xs sm:text-sm">
                Atrasadas
                {overdueVisits.length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {overdueVisits.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="no_efectuadas" data-testid="tab-no-efectuadas" className="text-xs sm:text-sm">
                No Efect.
                {notCompletedVisits.length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {notCompletedVisits.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="efectuadas" data-testid="tab-efectuadas" className="text-xs sm:text-sm">
                Efectuadas
                {completedVisits.length > 0 && (
                  <Badge className="ml-1 text-xs bg-green-600">
                    {completedVisits.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="en_curso" className="px-4 mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : inProgressVisits.length === 0 ? (
              <div className="text-center py-12">
                <PlayCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hay visitas en curso</p>
                <p className="text-sm text-muted-foreground mt-1">Las visitas que inicies aparecerán aquí</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inProgressVisits.map((visit) => (
                  <Link key={visit.id} href={`/visitas/${visit.id}/en-curso`}>
                    <Card className="hover-elevate cursor-pointer border-blue-500/60" data-testid={`card-visit-in-progress-${visit.id}`}>
                      <CardContent className="p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-medium truncate">
                              {visit.building?.name || "Edificio"}
                            </h3>
                            <Badge className="text-xs bg-blue-600 animate-pulse">
                              En Curso
                            </Badge>
                            {visit.type === "urgente" ? (
                              <Badge variant="destructive" className="text-xs">Urgente</Badge>
                            ) : visit.type === "revision_proyecto" ? (
                              <Badge variant="outline" className="text-xs">Rev. Proyecto</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Rutina</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{visit.building?.address || "Direccion"}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm flex-wrap">
                            {visit.startedAt && (
                              <div className="flex items-center gap-1 text-blue-600">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                <span>
                                  Iniciada {format(new Date(visit.startedAt), "dd MMM, HH:mm", { locale: es })}
                                </span>
                              </div>
                            )}
                            {visit.executiveName && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <User className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{visit.executiveName}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm font-medium text-blue-600 mt-2">
                            Toca para continuar →
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="agendadas" className="px-4 mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : scheduledVisits.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No hay visitas agendadas</p>
                <Button asChild variant="outline">
                  <Link href="/visitas/programar">
                    <Plus className="h-4 w-4 mr-2" />
                    Programar primera visita
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedScheduled).map(([dateLabel, dateVisits]) => (
                  <div key={dateLabel}>
                    <h2 className="text-sm font-medium text-muted-foreground mb-3 capitalize">
                      {dateLabel}
                    </h2>
                    <div className="space-y-3">
                      {dateVisits.map((visit) => renderVisitCard(visit))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="atrasadas" className="px-4 mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : overdueVisits.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                <p className="text-muted-foreground">No hay visitas atrasadas</p>
                <p className="text-sm text-muted-foreground mt-1">Las visitas de hoy que pasen su hora aparecerán aquí</p>
              </div>
            ) : (
              <div className="space-y-3">
                {overdueVisits.map((visit) => (
                  <Link key={visit.id} href={`/visitas/${visit.id}`}>
                    <Card className="hover-elevate cursor-pointer border-amber-500/50" data-testid={`card-visit-overdue-${visit.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-medium truncate">
                                {visit.building?.name || "Edificio"}
                              </h3>
                              <Badge className="text-xs bg-amber-500">
                                Atrasada
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="truncate">
                                {visit.building?.address || "Dirección"}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm flex-wrap">
                              <div className="flex items-center gap-1 text-amber-600">
                                <Clock className="h-3.5 w-3.5" />
                                <span>
                                  {visit.scheduledDate && format(new Date(visit.scheduledDate), "HH:mm", { locale: es })}
                                </span>
                              </div>
                              {visit.type === "urgente" && (
                                <Badge variant="destructive" className="text-xs">
                                  Urgente
                                </Badge>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                              <Button variant="ghost" size="icon" data-testid={`button-visit-menu-overdue-${visit.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={(e) => handleCancelClick(e, visit)}
                                className="text-destructive"
                                data-testid={`button-cancel-visit-overdue-${visit.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Cancelar visita
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="no_efectuadas" className="px-4 mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : notCompletedVisits.length === 0 ? (
              <div className="text-center py-12">
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hay visitas no efectuadas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notCompletedVisits.map((visit) => (
                  <Link key={visit.id} href={`/visitas/${visit.id}`}>
                    <Card className="hover-elevate cursor-pointer border-destructive/50" data-testid={`card-visit-not-completed-${visit.id}`}>
                      <CardContent className="p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-medium truncate">
                              {visit.building?.name || "Edificio"}
                            </h3>
                            {visit.status === "cancelada" ? (
                              <Badge variant="destructive" className="text-xs">Cancelada</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">No Efectuada</Badge>
                            )}
                            {visit.cancellationType === "reagendada" && (
                              <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">Reagendada</Badge>
                            )}
                            {visit.cancellationType === "eliminada" && (
                              <Badge variant="outline" className="text-xs border-red-500 text-red-600">Eliminada</Badge>
                            )}
                            {visit.type === "urgente" ? (
                              <Badge variant="destructive" className="text-xs">Urgente</Badge>
                            ) : visit.type === "revision_proyecto" ? (
                              <Badge variant="outline" className="text-xs">Rev. Proyecto</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Rutina</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{visit.building?.address || "Direccion"}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm flex-wrap">
                            <div className="flex items-center gap-1 text-destructive">
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                {visit.scheduledDate && format(new Date(visit.scheduledDate), "dd MMM, HH:mm", { locale: es })}
                              </span>
                            </div>
                            {visit.executiveName && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <User className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{visit.executiveName}</span>
                              </div>
                            )}
                          </div>
                          {visit.cancellationReason && (
                            <p className="text-xs text-muted-foreground mt-1.5 italic" data-testid={`text-cancel-reason-${visit.id}`}>
                              Motivo: {visit.cancellationReason}
                            </p>
                          )}
                          {visit.completionObservations && !visit.cancellationReason && (
                            <p className="text-xs text-muted-foreground mt-1.5 italic" data-testid={`text-observations-${visit.id}`}>
                              {visit.completionObservations}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="efectuadas" className="px-4 mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : completedVisits.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hay visitas efectuadas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedVisits.map((visit) => (
                  <Link key={visit.id} href={`/visitas/${visit.id}`}>
                    <Card className="hover-elevate cursor-pointer border-green-500/50" data-testid={`card-visit-completed-${visit.id}`}>
                      <CardContent className="p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-medium truncate">
                              {visit.building?.name || "Edificio"}
                            </h3>
                            <Badge className="text-xs bg-green-600">Efectuada</Badge>
                            {visit.type === "urgente" ? (
                              <Badge variant="destructive" className="text-xs">Urgente</Badge>
                            ) : visit.type === "revision_proyecto" ? (
                              <Badge variant="outline" className="text-xs">Rev. Proyecto</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Rutina</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{visit.building?.address || "Direccion"}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm flex-wrap">
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                {visit.completedAt && format(new Date(visit.completedAt), "dd MMM, HH:mm", { locale: es })}
                              </span>
                            </div>
                            {visit.executiveName && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <User className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{visit.executiveName}</span>
                              </div>
                            )}
                          </div>
                          {visit.completionObservations && (
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1" data-testid={`text-observations-${visit.id}`}>
                              {visit.completionObservations}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedVisit && (
        <CancelVisitDialog
          visit={selectedVisit}
          open={showCancelDialog}
          onOpenChange={(open) => {
            setShowCancelDialog(open);
            if (!open) setSelectedVisit(null);
          }}
        />
      )}
    </div>
  );
}
