import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ChevronLeft, 
  ChevronRight,
  Plus,
  FolderKanban,
  Calendar,
  Flag,
  PlayCircle,
  StopCircle,
  CalendarCheck
} from "lucide-react";
import type { Project, Building, ProjectMilestone } from "@shared/schema";

type ProjectWithBuilding = Project & { 
  building?: Building;
  milestones?: ProjectMilestone[];
};

interface CalendarEvent {
  id: string;
  date: Date;
  type: "start" | "end" | "milestone" | "review";
  title: string;
  projectId: string;
  projectName: string;
  color: "blue" | "red" | "green" | "yellow" | "purple";
  milestoneId?: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function ProjectsCalendar() {
  const [, navigate] = useLocation();
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const { data: projects, isLoading } = useQuery<ProjectWithBuilding[]>({
    queryKey: ["/api/projects?includeMilestones=true"],
  });

  const { data: buildings } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const filteredProjects = useMemo(() => {
    return projects?.filter((project) => {
      return buildingFilter === "all" || project.buildingId === buildingFilter;
    }) || [];
  }, [projects, buildingFilter]);

  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    
    filteredProjects.forEach((project) => {
      if (project.startDate) {
        events.push({
          id: `start-${project.id}`,
          date: new Date(project.startDate),
          type: "start",
          title: `Inicio: ${project.name}`,
          projectId: project.id,
          projectName: project.name,
          color: "blue",
        });
      }
      
      if (project.plannedEndDate) {
        events.push({
          id: `end-${project.id}`,
          date: new Date(project.plannedEndDate),
          type: "end",
          title: `Término: ${project.name}`,
          projectId: project.id,
          projectName: project.name,
          color: "red",
        });
      }

      if (project.milestones) {
        project.milestones.forEach((milestone) => {
          if (milestone.dueDate) {
            const isReview = (milestone as any).isReview;
            events.push({
              id: `milestone-${milestone.id}`,
              date: new Date(milestone.dueDate),
              type: isReview ? "review" : "milestone",
              title: `${milestone.name} - ${project.name}`,
              projectId: project.id,
              projectName: project.name,
              color: isReview ? "purple" : "green",
              milestoneId: milestone.id,
            });
          }
        });
      }
    });
    
    return events;
  }, [filteredProjects]);

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return calendarEvents.filter(event => isSameDay(event.date, date));
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
  const today = new Date();

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const getEventDotColor = (type: string) => {
    switch (type) {
      case "start": return "bg-blue-500";
      case "end": return "bg-red-500";
      case "review": return "bg-purple-500";
      case "milestone": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getEventIconBg = (type: string) => {
    switch (type) {
      case "start": return "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400";
      case "end": return "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400";
      case "review": return "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400";
      case "milestone": return "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "start": return <PlayCircle className="h-4 w-4" />;
      case "end": return <StopCircle className="h-4 w-4" />;
      case "review": return <CalendarCheck className="h-4 w-4" />;
      case "milestone": return <Flag className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case "start": return "Inicio";
      case "end": return "Término";
      case "review": return "Revisión";
      case "milestone": return "Hito";
      default: return "Evento";
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Calendario de Proyectos</h1>
          <p className="text-muted-foreground">Fechas importantes de proyectos e hitos</p>
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
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-lg">
                {monthNames[currentMonth]} {currentYear}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Hoy
                </Button>
                <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {dayNames.map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
                
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                
                {daysInMonth.map((date) => {
                  const events = getEventsForDate(date);
                  const isToday = isSameDay(date, today);
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(date)}
                      className={`
                        aspect-square p-1 rounded-lg text-sm relative
                        hover-elevate cursor-pointer
                        ${isToday ? "bg-primary/10 font-bold" : ""}
                        ${isSelected ? "ring-2 ring-primary" : ""}
                      `}
                      data-testid={`calendar-day-${date.getDate()}`}
                    >
                      <span className={isToday ? "text-primary" : ""}>
                        {date.getDate()}
                      </span>
                      {events.length > 0 && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {events.slice(0, 4).map((event, i) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${getEventDotColor(event.type)}`}
                            />
                          ))}
                          {events.length > 4 && (
                            <span className="text-[8px] text-muted-foreground">+{events.length - 4}</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span>Inicio</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>Término</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Hito</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span>Revisión</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {selectedDate ? formatDate(selectedDate) : "Selecciona una fecha"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Haz clic en un día del calendario para ver los eventos
                </p>
              ) : selectedDateEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay eventos para esta fecha
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.map((event) => (
                    <Link key={event.id} href={`/proyectos/${event.projectId}`}>
                      <Card className="hover-elevate cursor-pointer">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg shrink-0 ${getEventIconBg(event.type)}`}>
                              {getEventIcon(event.type)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm line-clamp-1">
                                {event.title}
                              </p>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {getEventLabel(event.type)}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {filteredProjects.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay proyectos</h3>
            <p className="text-muted-foreground mb-4">
              Crea un proyecto para ver sus fechas en el calendario.
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
