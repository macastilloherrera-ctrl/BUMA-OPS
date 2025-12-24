import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, Calendar, MapPin, Clock, ChevronRight } from "lucide-react";
import type { Visit, Building } from "@shared/schema";
import { format, isToday, isThisWeek, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

interface VisitWithBuilding extends Visit {
  building?: Building;
}

export default function Visits() {
  const [activeTab, setActiveTab] = useState("hoy");

  const { data: visits, isLoading } = useQuery<VisitWithBuilding[]>({
    queryKey: ["/api/visits"],
  });

  const filterVisits = (filter: string) => {
    if (!visits) return [];
    const now = new Date();
    
    switch (filter) {
      case "hoy":
        return visits.filter((v) => 
          v.scheduledDate && isToday(new Date(v.scheduledDate))
        );
      case "semana":
        return visits.filter((v) => 
          v.scheduledDate && isThisWeek(new Date(v.scheduledDate), { locale: es })
        );
      case "atrasadas":
        return visits.filter((v) => 
          v.status === "atrasada" || 
          (v.status === "programada" && v.scheduledDate && isBefore(new Date(v.scheduledDate), startOfDay(now)))
        );
      default:
        return visits;
    }
  };

  const getVisitTypeLabel = (type: string) => {
    return type === "urgente" ? "Urgente" : "Rutina";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Mis Visitas</h1>
          <Button asChild size="sm" data-testid="button-schedule-visit">
            <Link href="/visitas/programar">
              <Plus className="h-4 w-4 mr-1" />
              Programar
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-20 md:pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="sticky top-0 bg-background px-4 pt-3">
            <TabsList className="w-full grid grid-cols-4 h-10">
              <TabsTrigger value="hoy" data-testid="tab-hoy">Hoy</TabsTrigger>
              <TabsTrigger value="semana" data-testid="tab-semana">Semana</TabsTrigger>
              <TabsTrigger value="atrasadas" data-testid="tab-atrasadas">Atrasadas</TabsTrigger>
              <TabsTrigger value="todas" data-testid="tab-todas">Todas</TabsTrigger>
            </TabsList>
          </div>

          {["hoy", "semana", "atrasadas", "todas"].map((tab) => (
            <TabsContent key={tab} value={tab} className="px-4 mt-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : filterVisits(tab).length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No hay visitas {tab === "atrasadas" ? "atrasadas" : "programadas"}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filterVisits(tab).map((visit) => (
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
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>
                                    {visit.scheduledDate && format(new Date(visit.scheduledDate), "dd MMM, HH:mm", { locale: es })}
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
                                {(visit.status === "atrasada" || 
                                  (visit.status === "programada" && visit.scheduledDate && isBefore(new Date(visit.scheduledDate), startOfDay(new Date())))) && (
                                  <Badge variant="destructive" className="text-xs">
                                    Atrasada
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
