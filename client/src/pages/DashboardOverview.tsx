import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { 
  Building2, 
  Ticket, 
  Calendar, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight
} from "lucide-react";
import type { Building, Ticket as TicketType, Visit } from "@shared/schema";

export default function DashboardOverview() {
  const { data: tickets, isLoading: ticketsLoading } = useQuery<TicketType[]>({
    queryKey: ["/api/tickets"],
  });

  const { data: visits, isLoading: visitsLoading } = useQuery<Visit[]>({
    queryKey: ["/api/visits"],
  });

  const { data: buildings, isLoading: buildingsLoading } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const isLoading = ticketsLoading || visitsLoading || buildingsLoading;

  const ticketStats = {
    critical: tickets?.filter((t) => t.status !== "resuelto" && (t.priority === "rojo" || t.status === "vencido")).length || 0,
    warning: tickets?.filter((t) => t.priority === "amarillo" && t.status !== "resuelto").length || 0,
    pending: tickets?.filter((t) => (t.status === "pendiente" || t.status === "en_curso" || t.status === "trabajo_completado") && t.priority === "verde").length || 0,
    ok: tickets?.filter((t) => t.priority === "verde" && t.status !== "vencido" && t.status !== "resuelto").length || 0,
    resolved: tickets?.filter((t) => t.status === "resuelto").length || 0,
  };

  const visitStats = {
    today: visits?.filter((v) => {
      const visitDate = new Date(v.scheduledDate);
      const today = new Date();
      return visitDate.toDateString() === today.toDateString() && v.status !== "cancelada";
    }).length || 0,
    pending: visits?.filter((v) => v.status === "programada").length || 0,
    completed: visits?.filter((v) => v.status === "realizada").length || 0,
    overdue: visits?.filter((v) => v.status === "atrasada").length || 0,
  };

  const activeBuildings = buildings?.filter((b) => b.status === "activo").length || 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">
          Panel General
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tickets Criticos
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-tickets-critical">
              {ticketStats.critical}
            </div>
            <p className="text-xs text-muted-foreground">
              Prioridad roja activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Visitas Hoy
            </CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-visits-today">
              {visitStats.today}
            </div>
            <p className="text-xs text-muted-foreground">
              Programadas para hoy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Edificios Activos
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-buildings-active">
              {activeBuildings}
            </div>
            <p className="text-xs text-muted-foreground">
              En operacion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tickets Resueltos
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-tickets-resolved">
              {ticketStats.resolved}
            </div>
            <p className="text-xs text-muted-foreground">
              Total resueltos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Resumen de Tickets</CardTitle>
            <Link href="/dashboard/tickets">
              <Button variant="ghost" size="sm" data-testid="link-view-tickets">
                Ver todos <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">Rojo</Badge>
                <span className="text-sm">Criticos</span>
              </div>
              <span className="font-semibold" data-testid="count-tickets-red">
                {ticketStats.critical}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-yellow-500 text-black">Amarillo</Badge>
                <span className="text-sm">Advertencia</span>
              </div>
              <span className="font-semibold" data-testid="count-tickets-yellow">
                {ticketStats.warning}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-600 text-white">Verde</Badge>
                <span className="text-sm">Normal</span>
              </div>
              <span className="font-semibold" data-testid="count-tickets-green">
                {ticketStats.ok}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Resumen de Visitas</CardTitle>
            <Link href="/dashboard/visitas">
              <Button variant="ghost" size="sm" data-testid="link-view-visits">
                Ver todas <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Pendientes</span>
              </div>
              <span className="font-semibold" data-testid="count-visits-pending">
                {visitStats.pending}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm">Completadas</span>
              </div>
              <span className="font-semibold" data-testid="count-visits-completed">
                {visitStats.completed}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm">Atrasadas</span>
              </div>
              <span className="font-semibold" data-testid="count-visits-overdue">
                {visitStats.overdue}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
