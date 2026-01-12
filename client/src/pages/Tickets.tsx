import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { Plus, Ticket, Building2, Calendar, ChevronRight, Filter } from "lucide-react";
import type { Ticket as TicketType, Building, UserProfile } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TicketWithBuilding extends TicketType {
  building?: Building;
}

export default function Tickets() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const showMine = params.get("mine") === "true";
  
  // For "Mios" view, default to "todos" tab to show all assigned tickets regardless of status
  const [activeTab, setActiveTab] = useState(showMine ? "todos" : "vencidos");

  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
  });

  const isManager = userProfile?.role === "gerente_general" || userProfile?.role === "gerente_operaciones";

  const { data: tickets, isLoading } = useQuery<TicketWithBuilding[]>({
    queryKey: ["/api/tickets"],
  });

  const isOverdue = (ticket: TicketWithBuilding): boolean => {
    if (ticket.status === "resuelto") return false;
    const dueDate = ticket.committedCompletionAt || ticket.endDate;
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const isDueSoon = (ticket: TicketWithBuilding, days: number = 7): boolean => {
    if (ticket.status === "resuelto") return false;
    const dueDate = ticket.committedCompletionAt || ticket.endDate;
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const now = new Date();
    const futureLimit = new Date();
    futureLimit.setDate(now.getDate() + days);
    return due >= now && due <= futureLimit;
  };

  const filterTickets = (filter: string) => {
    if (!tickets) return [];
    
    // For managers with "mine" filter, only show tickets assigned to them
    let filteredTickets = tickets;
    if (isManager && showMine && userProfile) {
      filteredTickets = tickets.filter((t) => t.assignedExecutiveId === userProfile.userId);
    }
    
    switch (filter) {
      case "vencidos":
        return filteredTickets.filter((t) => t.status === "vencido" || isOverdue(t));
      case "por_vencer":
        return filteredTickets.filter((t) => t.status !== "resuelto" && !isOverdue(t) && isDueSoon(t));
      case "pendientes":
        return filteredTickets.filter((t) => t.status !== "resuelto" && !isOverdue(t) && !isDueSoon(t));
      case "resueltos":
        return filteredTickets.filter((t) => t.status === "resuelto");
      default:
        return filteredTickets;
    }
  };

  const pageTitle = isManager ? (showMine ? "Mis Tickets Asignados" : "Todos los Tickets") : "Mis Tickets";

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">{pageTitle}</h1>
          <div className="flex items-center gap-2">
            {isManager && (
              <div className="flex items-center gap-1 rounded-lg border p-1">
                <Button
                  asChild
                  size="sm"
                  variant={!showMine ? "secondary" : "ghost"}
                  data-testid="button-all-tickets"
                >
                  <Link href="/tickets">Todos</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant={showMine ? "secondary" : "ghost"}
                  data-testid="button-my-tickets"
                >
                  <Link href="/tickets?mine=true">Mios</Link>
                </Button>
              </div>
            )}
            <Button asChild size="sm" data-testid="button-create-ticket">
              <Link href="/tickets/nuevo">
                <Plus className="h-4 w-4 mr-1" />
                Crear
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-20 md:pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="sticky top-0 bg-background px-4 pt-3">
            <TabsList className="w-full grid grid-cols-5 h-10">
              <TabsTrigger value="vencidos" data-testid="tab-vencidos">
                Vencidos
              </TabsTrigger>
              <TabsTrigger value="por_vencer" data-testid="tab-por-vencer">
                Por Vencer
              </TabsTrigger>
              <TabsTrigger value="pendientes" data-testid="tab-pendientes">
                Pendientes
              </TabsTrigger>
              <TabsTrigger value="resueltos" data-testid="tab-resueltos">
                Resueltos
              </TabsTrigger>
              <TabsTrigger value="todos" data-testid="tab-todos">
                Todos
              </TabsTrigger>
            </TabsList>
          </div>

          {["vencidos", "por_vencer", "pendientes", "resueltos", "todos"].map((tab) => (
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
                                <StatusBadge 
                                  status={ticket.status} 
                                  type="ticket"
                                  invoiceNumber={ticket.invoiceNumber}
                                  invoiceAmount={ticket.invoiceAmount}
                                  invoiceDocumentKey={ticket.invoiceDocumentKey}
                                  invoiceStatus={ticket.invoiceStatus}
                                />
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
