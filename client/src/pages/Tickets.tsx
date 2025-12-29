import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { Plus, Ticket, Building2, Calendar, ChevronRight } from "lucide-react";
import type { Ticket as TicketType, Building } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TicketWithBuilding extends TicketType {
  building?: Building;
}

export default function Tickets() {
  const [activeTab, setActiveTab] = useState("vencidos");

  const { data: tickets, isLoading } = useQuery<TicketWithBuilding[]>({
    queryKey: ["/api/tickets"],
  });

  const filterTickets = (filter: string) => {
    if (!tickets) return [];
    
    switch (filter) {
      case "vencidos":
        return tickets.filter((t) => t.status === "vencido" || t.priority === "rojo");
      case "por_vencer":
        return tickets.filter((t) => t.priority === "amarillo" && t.status !== "resuelto");
      case "pendientes":
        return tickets.filter((t) => t.status === "pendiente" || t.status === "en_curso");
      default:
        return tickets;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Mis Tickets</h1>
          <Button asChild size="sm" data-testid="button-create-ticket">
            <Link href="/tickets/nuevo">
              <Plus className="h-4 w-4 mr-1" />
              Crear
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-20 md:pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="sticky top-0 bg-background px-4 pt-3">
            <TabsList className="w-full grid grid-cols-4 h-10">
              <TabsTrigger value="vencidos" data-testid="tab-vencidos">
                Vencidos
              </TabsTrigger>
              <TabsTrigger value="por_vencer" data-testid="tab-por-vencer">
                Por Vencer
              </TabsTrigger>
              <TabsTrigger value="pendientes" data-testid="tab-pendientes">
                Pendientes
              </TabsTrigger>
              <TabsTrigger value="todos" data-testid="tab-todos">
                Todos
              </TabsTrigger>
            </TabsList>
          </div>

          {["vencidos", "por_vencer", "pendientes", "todos"].map((tab) => (
            <TabsContent key={tab} value={tab} className="px-4 mt-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-28 w-full" />
                  ))}
                </div>
              ) : filterTickets(tab).length === 0 ? (
                <div className="text-center py-12">
                  <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No hay tickets en esta categoria</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filterTickets(tab).map((ticket) => (
                    <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
                      <Card
                        className="hover-elevate cursor-pointer"
                        data-testid={`card-ticket-${ticket.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                                ticket.priority === "rojo"
                                  ? "bg-red-500"
                                  : ticket.priority === "amarillo"
                                  ? "bg-amber-500"
                                  : "bg-green-500"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <PriorityBadge priority={ticket.priority} />
                                <StatusBadge status={ticket.status} type="ticket" />
                              </div>
                              <p className="text-sm font-medium line-clamp-2 mb-2">
                                {ticket.description}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  <span className="truncate">
                                    {ticket.building?.name || "Edificio"}
                                  </span>
                                </div>
                                {ticket.scheduledDate && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      {format(new Date(ticket.scheduledDate), "dd MMM", { locale: es })}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 self-center" />
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
