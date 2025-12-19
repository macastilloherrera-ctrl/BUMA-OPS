import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  MoreVertical,
  AlertTriangle,
  Clock,
  CheckCircle,
  UserPlus,
  ArrowUpCircle,
  Calendar,
  RefreshCw,
} from "lucide-react";
import type { Ticket, Building } from "@shared/schema";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

interface TicketWithBuilding extends Ticket {
  building?: Building;
  executiveName?: string;
}

interface DashboardStats {
  critical: number;
  warning: number;
  ok: number;
}

export default function DashboardTickets() {
  const { toast } = useToast();
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const { data: tickets, isLoading } = useQuery<TicketWithBuilding[]>({
    queryKey: ["/api/tickets"],
  });

  const { data: buildings } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Ticket> }) => {
      return apiRequest("PATCH", `/api/tickets/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "Ticket actualizado",
        description: "Los cambios han sido guardados",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el ticket",
        variant: "destructive",
      });
    },
  });

  const getStats = (): DashboardStats => {
    if (!tickets) return { critical: 0, warning: 0, ok: 0 };
    
    return {
      critical: tickets.filter((t) => t.priority === "rojo" || t.status === "vencido").length,
      warning: tickets.filter((t) => t.priority === "amarillo" && t.status !== "resuelto").length,
      ok: tickets.filter((t) => t.priority === "verde" && t.status !== "vencido").length,
    };
  };

  const filteredTickets = () => {
    if (!tickets) return [];
    
    return tickets.filter((t) => {
      if (buildingFilter !== "all" && t.buildingId !== buildingFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      return t.status !== "resuelto";
    });
  };

  const getDaysOverdue = (dueDate: Date | null) => {
    if (!dueDate) return 0;
    const days = differenceInDays(new Date(), new Date(dueDate));
    return days > 0 ? days : 0;
  };

  const stats = getStats();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">Panel de Tickets</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/tickets"] })}
          data-testid="button-refresh"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vencidos / Criticos</p>
                <p className="text-4xl font-bold text-red-500" data-testid="stat-critical">
                  {stats.critical}
                </p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-500/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Por Vencer</p>
                <p className="text-4xl font-bold text-amber-500" data-testid="stat-warning">
                  {stats.warning}
                </p>
              </div>
              <Clock className="h-10 w-10 text-amber-500/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Al Dia</p>
                <p className="text-4xl font-bold text-green-500" data-testid="stat-ok">
                  {stats.ok}
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle>Listado de Tickets</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                <SelectTrigger className="w-40" data-testid="filter-building">
                  <SelectValue placeholder="Edificio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {buildings?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32" data-testid="filter-priority">
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="rojo">Critico</SelectItem>
                  <SelectItem value="amarillo">Por Vencer</SelectItem>
                  <SelectItem value="verde">Al Dia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTickets().length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No hay tickets que mostrar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Edificio</TableHead>
                    <TableHead>Dias Atraso</TableHead>
                    <TableHead className="max-w-xs">Descripcion</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Ejecutivo</TableHead>
                    <TableHead>Fecha Compromiso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets().map((ticket) => (
                    <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                      <TableCell>
                        <PriorityBadge priority={ticket.priority} />
                      </TableCell>
                      <TableCell className="font-medium">
                        {ticket.building?.name || "—"}
                      </TableCell>
                      <TableCell>
                        {getDaysOverdue(ticket.dueDate) > 0 ? (
                          <Badge variant="destructive">
                            {getDaysOverdue(ticket.dueDate)} dias
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate">{ticket.description}</p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{ticket.responsibleName || "—"}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {ticket.responsibleType}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {ticket.executiveName || "—"}
                      </TableCell>
                      <TableCell>
                        {ticket.dueDate && format(new Date(ticket.dueDate), "dd MMM yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={ticket.status} type="ticket" />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`menu-ticket-${ticket.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => updateTicketMutation.mutate({
                                id: ticket.id,
                                data: { status: "en_curso" },
                              })}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Reasignar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateTicketMutation.mutate({
                                id: ticket.id,
                                data: { priority: "rojo" },
                              })}
                            >
                              <ArrowUpCircle className="h-4 w-4 mr-2" />
                              Escalar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Calendar className="h-4 w-4 mr-2" />
                              Crear Visita Urgente
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateTicketMutation.mutate({
                                id: ticket.id,
                                data: { status: "reprogramado" },
                              })}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Cambiar Fecha
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
