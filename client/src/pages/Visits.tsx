import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Calendar, MapPin, Clock } from "lucide-react";
import type { Visit, Building } from "@shared/schema";
import { format, isToday, isTomorrow, isBefore, startOfDay, parseISO, compareAsc } from "date-fns";
import { es } from "date-fns/locale";

interface VisitWithBuilding extends Visit {
  building?: Building;
}

export default function Visits() {
  const [activeTab, setActiveTab] = useState("agenda");

  const { data: visits, isLoading } = useQuery<VisitWithBuilding[]>({
    queryKey: ["/api/visits"],
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
                <StatusBadge status={visit.status} type="visit" />
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
                {visit.type === "urgente" ? (
                  <Badge variant="destructive" className="text-xs">
                    Urgente
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Rutina
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  const groupedUpcoming = groupVisitsByDate(upcomingVisits);

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
            <TabsList className="w-full grid grid-cols-2 h-10">
              <TabsTrigger value="agenda" data-testid="tab-agenda">
                Agenda
              </TabsTrigger>
              <TabsTrigger value="atrasadas" data-testid="tab-atrasadas">
                Atrasadas
                {overdueVisits.length > 0 && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {overdueVisits.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="agenda" className="px-4 mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : upcomingVisits.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No hay visitas programadas</p>
                <Button asChild variant="outline">
                  <Link href="/visitas/programar">
                    <Plus className="h-4 w-4 mr-2" />
                    Programar primera visita
                  </Link>
                </Button>
              </div>
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
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hay visitas atrasadas</p>
              </div>
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
                                Atrasada
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
                              {visit.type === "urgente" && (
                                <Badge variant="destructive" className="text-xs">
                                  Urgente
                                </Badge>
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
      </div>
    </div>
  );
}
