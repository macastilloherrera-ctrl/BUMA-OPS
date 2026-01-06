import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertTriangle,
  CalendarClock,
  Wrench,
  MapPin,
  Clock,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import type { Building, Visit } from "@shared/schema";

interface TicketWithDetails {
  id: string;
  buildingId: string;
  ticketType: "urgencia" | "planificado" | "mantencion";
  description: string;
  priority: "rojo" | "amarillo" | "verde";
  status: "pendiente" | "en_curso" | "vencido" | "resuelto" | "reprogramado";
  scheduledDate?: string | null;
  building?: Building;
}

interface VisitWithDetails extends Visit {
  building?: Building;
}

const ticketTypeIcons: Record<string, typeof AlertTriangle> = {
  urgencia: AlertTriangle,
  planificado: CalendarClock,
  mantencion: Wrench,
};

export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: tickets, isLoading: ticketsLoading } = useQuery<TicketWithDetails[]>({
    queryKey: ["/api/tickets"],
  });

  const { data: visits, isLoading: visitsLoading } = useQuery<VisitWithDetails[]>({
    queryKey: ["/api/visits"],
  });

  const isLoading = ticketsLoading || visitsLoading;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: es });
  const calendarEnd = endOfWeek(monthEnd, { locale: es });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getTicketsForDay = (day: Date) => {
    if (!tickets) return [];
    return tickets.filter((ticket) => {
      if (!ticket.scheduledDate) return false;
      return isSameDay(new Date(ticket.scheduledDate), day);
    });
  };

  const getVisitsForDay = (day: Date) => {
    if (!visits) return [];
    return visits.filter((visit) => {
      if (!visit.scheduledDate) return false;
      // Excluir visitas canceladas (reagendadas o eliminadas)
      if (visit.cancellationType === "reagendada" || visit.cancellationType === "eliminada") return false;
      return isSameDay(new Date(visit.scheduledDate), day);
    });
  };

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const weekDays = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Calendario</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-24 md:pb-6">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousMonth}
                data-testid="button-prev-month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextMonth}
                data-testid="button-next-month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-medium capitalize ml-2">
                {format(currentMonth, "MMMM yyyy", { locale: es })}
              </h2>
            </div>
            <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-today">
              Hoy
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <div className="grid grid-cols-7 bg-muted">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="px-2 py-2 text-center text-sm font-medium text-muted-foreground border-b"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day, index) => {
                  const dayTickets = getTicketsForDay(day);
                  const dayVisits = getVisitsForDay(day);
                  const totalItems = dayTickets.length + dayVisits.length;
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isCurrentDay = isToday(day);

                  return (
                    <div
                      key={index}
                      className={`min-h-[100px] border-b border-r p-1 ${
                        !isCurrentMonth ? "bg-muted/30" : ""
                      } ${isCurrentDay ? "bg-primary/5" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-sm font-medium ${
                            !isCurrentMonth
                              ? "text-muted-foreground"
                              : isCurrentDay
                              ? "text-primary font-bold"
                              : ""
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                        {totalItems > 0 && (
                          <Badge variant="secondary" className="text-xs px-1">
                            {totalItems}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 overflow-auto max-h-[70px]">
                        {dayVisits.slice(0, 2).map((visit) => (
                          <Link key={visit.id} href={`/visitas/${visit.id}`}>
                            <div
                              className={`flex items-center gap-1 p-1 rounded text-xs cursor-pointer hover-elevate ${
                                visit.type === "urgente"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                              }`}
                              data-testid={`calendar-visit-${visit.id}`}
                            >
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">
                                {visit.building?.name || "Visita"}
                              </span>
                            </div>
                          </Link>
                        ))}
                        {dayTickets.slice(0, 2).map((ticket) => {
                          const TypeIcon = ticketTypeIcons[ticket.ticketType] || AlertTriangle;
                          return (
                            <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
                              <div
                                className={`flex items-center gap-1 p-1 rounded text-xs cursor-pointer hover-elevate ${
                                  ticket.priority === "rojo"
                                    ? "bg-destructive/10 text-destructive"
                                    : ticket.priority === "amarillo"
                                    ? "bg-accent text-accent-foreground"
                                    : "bg-muted text-muted-foreground"
                                }`}
                                data-testid={`calendar-ticket-${ticket.id}`}
                              >
                                <TypeIcon className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{ticket.description.slice(0, 20)}</span>
                              </div>
                            </Link>
                          );
                        })}
                        {totalItems > 4 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{totalItems - 4} mas
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6">
            <h3 className="font-medium mb-3">Leyenda</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2" data-testid="legend-visit-rutina">
                <div className="w-4 h-4 bg-blue-500/10 rounded" />
                <span>Visita Rutina</span>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-visit-urgente">
                <div className="w-4 h-4 bg-primary/10 rounded" />
                <span>Visita Urgente</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm mt-3">
              <div className="flex items-center gap-2" data-testid="legend-priority-rojo">
                <div className="w-4 h-4 bg-destructive/10 rounded" />
                <span>Ticket Alta (Rojo)</span>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-priority-amarillo">
                <div className="w-4 h-4 bg-accent rounded" />
                <span>Ticket Media (Amarillo)</span>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-priority-verde">
                <div className="w-4 h-4 bg-muted rounded" />
                <span>Ticket Baja (Verde)</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm mt-3">
              <div className="flex items-center gap-2" data-testid="legend-type-visita">
                <MapPin className="h-4 w-4" />
                <span>Visita</span>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-type-urgencia">
                <AlertTriangle className="h-4 w-4" />
                <span>Urgencia</span>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-type-planificado">
                <CalendarClock className="h-4 w-4" />
                <span>Planificado</span>
              </div>
              <div className="flex items-center gap-2" data-testid="legend-type-mantencion">
                <Wrench className="h-4 w-4" />
                <span>Mantencion</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
