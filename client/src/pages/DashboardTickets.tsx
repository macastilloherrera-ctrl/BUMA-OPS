import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { Ticket, Building, UserProfile } from "@shared/schema";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

interface TicketWithBuilding extends Ticket {
  building?: Building;
  executiveName?: string;
}

interface DashboardStats {
  critical: number;
  warning: number;
  pending: number;
  ok: number;
  resolved: number;
}

export default function DashboardTickets() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [buildingFilter, setBuildingFilter] = useState<string>("all");
  const [classificationFilter, setClassificationFilter] = useState<string>("all");
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithBuilding | null>(null);
  const [selectedExecutive, setSelectedExecutive] = useState<string>("");
  const [newDueDate, setNewDueDate] = useState<string>("");

  const { data: tickets, isLoading } = useQuery<TicketWithBuilding[]>({
    queryKey: ["/api/tickets"],
  });

  const { data: buildings } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const { data: executives } = useQuery<(UserProfile & { name: string })[]>({
    queryKey: ["/api/users/executives"],
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Ticket> }) => {
      return apiRequest("PATCH", `/api/tickets/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "Accion completada",
        description: "El ticket ha sido actualizado exitosamente",
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

  const escalateTicketMutation = useMutation({
    mutationFn: async (ticket: TicketWithBuilding) => {
      return apiRequest("POST", `/api/tickets/${ticket.id}/escalate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "Ticket Escalado",
        description: "El ticket fue escalado al Gerente de Operaciones con prioridad CRITICA (roja).",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo escalar el ticket",
        variant: "destructive",
      });
    },
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

  const getStats = (): DashboardStats => {
    if (!tickets) return { critical: 0, warning: 0, pending: 0, ok: 0, resolved: 0 };
    
    const activeTickets = tickets.filter((t) => t.status !== "resuelto");
    
    return {
      critical: activeTickets.filter((t) => t.status === "vencido" || isOverdue(t)).length,
      warning: activeTickets.filter((t) => !isOverdue(t) && isDueSoon(t)).length,
      pending: activeTickets.filter((t) => !isOverdue(t) && !isDueSoon(t)).length,
      ok: 0,
      resolved: tickets.filter((t) => t.status === "resuelto").length,
    };
  };

  const filteredTickets = () => {
    if (!tickets) return [];
    
    return tickets.filter((t) => {
      if (buildingFilter !== "all" && t.buildingId !== buildingFilter) return false;
      if (t.status === "resuelto") return false;
      
      if (classificationFilter === "vencido") {
        return t.status === "vencido" || isOverdue(t);
      }
      if (classificationFilter === "por_vencer") {
        return !isOverdue(t) && isDueSoon(t);
      }
      if (classificationFilter === "pendiente") {
        return !isOverdue(t) && !isDueSoon(t);
      }
      return true;
    });
  };

  const getDaysOverdue = (committedDate: Date | string | null, endDate?: Date | string | null) => {
    const date = committedDate || endDate;
    if (!date) return 0;
    const days = differenceInDays(new Date(), new Date(date));
    return days > 0 ? days : 0;
  };

  const stats = getStats();

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

        <Card className="border-l-4 border-l-gray-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-4xl font-bold text-gray-500" data-testid="stat-pending">
                  {stats.pending}
                </p>
              </div>
              <Clock className="h-10 w-10 text-gray-500/30" />
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

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resueltos</p>
                <p className="text-4xl font-bold text-blue-500" data-testid="stat-resolved">
                  {stats.resolved}
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-blue-500/30" />
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
              <Select value={classificationFilter} onValueChange={setClassificationFilter}>
                <SelectTrigger className="w-36" data-testid="filter-classification">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="vencido">Vencidos</SelectItem>
                  <SelectItem value="por_vencer">Por Vencer</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
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
                    <TableHead>Ejecutivo Asignado</TableHead>
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
                        {getDaysOverdue(ticket.committedCompletionAt, ticket.endDate) > 0 ? (
                          <Badge variant="destructive">
                            {getDaysOverdue(ticket.committedCompletionAt, ticket.endDate)} dias
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate">{ticket.description}</p>
                      </TableCell>
                      <TableCell>
                        {ticket.executiveName || "Sin asignar"}
                      </TableCell>
                      <TableCell>
                        {ticket.committedCompletionAt 
                          ? format(new Date(ticket.committedCompletionAt), "dd MMM yyyy", { locale: es })
                          : ticket.endDate 
                            ? format(new Date(ticket.endDate), "dd MMM yyyy", { locale: es })
                            : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge 
                          status={ticket.status} 
                          type="ticket"
                          invoiceNumber={ticket.invoiceNumber}
                          invoiceAmount={ticket.invoiceAmount}
                          invoiceDocumentKey={ticket.invoiceDocumentKey}
                        />
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
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setSelectedExecutive(ticket.assignedExecutiveId || "");
                                setReassignDialogOpen(true);
                              }}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Reasignar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => escalateTicketMutation.mutate(ticket)}
                              disabled={ticket.priority === "rojo"}
                            >
                              <ArrowUpCircle className="h-4 w-4 mr-2" />
                              {ticket.priority === "rojo" ? "Ya Escalado" : "Escalar"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setLocation(`/visitas/programar?buildingId=${ticket.buildingId}&type=urgente&ticketId=${ticket.id}`)}
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              Crear Visita Urgente
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setNewDueDate(ticket.dueDate ? format(new Date(ticket.dueDate), "yyyy-MM-dd") : "");
                                setDateDialogOpen(true);
                              }}
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

      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reasignar Ticket</DialogTitle>
            <DialogDescription>
              Selecciona el ejecutivo al que deseas reasignar este ticket.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ejecutivo</Label>
              <Select value={selectedExecutive} onValueChange={setSelectedExecutive}>
                <SelectTrigger data-testid="select-executive">
                  <SelectValue placeholder="Seleccionar ejecutivo" />
                </SelectTrigger>
                <SelectContent>
                  {executives?.map((exec) => (
                    <SelectItem key={exec.userId} value={exec.userId}>
                      {exec.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedTicket && selectedExecutive) {
                  updateTicketMutation.mutate({
                    id: selectedTicket.id,
                    data: { assignedExecutiveId: selectedExecutive },
                  });
                  setReassignDialogOpen(false);
                }
              }}
              disabled={!selectedExecutive}
              data-testid="button-confirm-reassign"
            >
              Reasignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Fecha de Compromiso</DialogTitle>
            <DialogDescription>
              Ingresa la nueva fecha de compromiso para este ticket.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nueva Fecha</Label>
              <Input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                data-testid="input-new-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedTicket && newDueDate) {
                  updateTicketMutation.mutate({
                    id: selectedTicket.id,
                    data: {
                      dueDate: new Date(newDueDate),
                      status: "reprogramado",
                    },
                  });
                  setDateDialogOpen(false);
                }
              }}
              disabled={!newDueDate}
              data-testid="button-confirm-date"
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
