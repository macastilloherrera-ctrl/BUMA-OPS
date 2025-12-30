import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Ticket,
  User,
  AlertTriangle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { Visit, Building, VisitChecklistItem, Ticket as TicketType, Incident } from "@shared/schema";

interface VisitReportData extends Visit {
  building?: Building;
  checklistItems?: VisitChecklistItem[];
}

export default function VisitReport() {
  const { id } = useParams<{ id: string }>();

  const { data: visit, isLoading } = useQuery<VisitReportData>({
    queryKey: ["/api/visits", id],
  });

  const { data: tickets } = useQuery<TicketType[]>({
    queryKey: ["/api/tickets", { visitId: id }],
    enabled: !!id,
  });

  const { data: incidents } = useQuery<Incident[]>({
    queryKey: ["/api/incidents", { visitId: id }],
    enabled: !!id,
  });

  const visitTickets = tickets?.filter((t) => t.visitId === id) || [];
  const visitIncident = incidents?.find((i) => i.visitId === id);

  const formatDate = (date: string | Date | null) => {
    if (!date) return "No especificada";
    try {
      const d = typeof date === "string" ? parseISO(date) : date;
      return format(d, "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return "Fecha invalida";
    }
  };

  const formatTime = (date: string | Date | null) => {
    if (!date) return "--:--";
    try {
      const d = typeof date === "string" ? parseISO(date) : date;
      return format(d, "HH:mm", { locale: es });
    } catch {
      return "--:--";
    }
  };

  const calculateDuration = (start: string | Date | null, end: string | Date | null) => {
    if (!start || !end) return "No disponible";
    try {
      const startDate = typeof start === "string" ? parseISO(start) : start;
      const endDate = typeof end === "string" ? parseISO(end) : end;
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffMins = Math.round(diffMs / (1000 * 60));
      if (diffMins < 60) {
        return `${diffMins} minutos`;
      }
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}h ${mins}min`;
    } catch {
      return "No disponible";
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="p-4 text-center py-12">
        <p className="text-muted-foreground">Visita no encontrada</p>
        <Button asChild className="mt-4">
          <Link href="/visitas">Volver a visitas</Link>
        </Button>
      </div>
    );
  }

  const checklistItems = visit.checklistItems || [];
  const completedItems = checklistItems.filter((item) => item.isCompleted).length;
  const totalItems = checklistItems.length;
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const priorityColors = {
    verde: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    amarillo: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    rojo: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild data-testid="button-back">
            <Link href="/visitas">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-report-title">
              Informe de Visita
            </h1>
            <p className="text-muted-foreground">
              {visit.building?.name || "Edificio"}
            </p>
          </div>
        </div>

        <Card data-testid="card-visit-summary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resumen de la Visita
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Edificio:</span>{" "}
                  <span className="font-medium">{visit.building?.name || "No especificado"}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Ejecutivo:</span>{" "}
                  <span className="font-medium">{visit.executiveId || "No asignado"}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Fecha:</span>{" "}
                  <span className="font-medium">{formatDate(visit.scheduledDate)}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Duracion:</span>{" "}
                  <span className="font-medium">
                    {calculateDuration(visit.startedAt, visit.completedAt)}
                  </span>
                </span>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Inicio:</span>{" "}
                <span className="font-medium">{formatTime(visit.startedAt)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Fin:</span>{" "}
                <span className="font-medium">{formatTime(visit.completedAt)}</span>
              </div>
            </div>

            <Badge
              variant="outline"
              className={
                visit.status === "realizada"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              }
            >
              {visit.status === "realizada" ? "Completada" : visit.status}
            </Badge>
          </CardContent>
        </Card>

        <Card data-testid="card-checklist-summary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Checklist
              </span>
              <Badge variant="secondary">
                {completedItems}/{totalItems} ({completionPercentage}%)
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {checklistItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2 border-b last:border-b-0"
                  data-testid={`checklist-item-${item.id}`}
                >
                  {item.isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className={item.isCompleted ? "" : "text-muted-foreground"}>
                    {item.itemName}
                  </span>
                </div>
              ))}
              {checklistItems.length === 0 && (
                <p className="text-muted-foreground text-sm">No hay items en el checklist</p>
              )}
            </div>
          </CardContent>
        </Card>

        {visitTickets.length > 0 && (
          <Card data-testid="card-tickets-summary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Tickets Generados ({visitTickets.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {visitTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-start justify-between p-3 border rounded-md"
                    data-testid={`ticket-summary-${ticket.id}`}
                  >
                    <div className="space-y-1">
                      <p className="font-medium line-clamp-2">{ticket.description}</p>
                      <p className="text-sm text-muted-foreground">{ticket.otherCategoryDescription || "Sin categoria"}</p>
                    </div>
                    <Badge className={priorityColors[ticket.priority as keyof typeof priorityColors]}>
                      {ticket.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {visitIncident && (
          <Card data-testid="card-incident-summary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Incidente Registrado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{visitIncident.reason}</p>
                <p className="text-sm text-muted-foreground">
                  Estado: {visitIncident.status}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {visit.notes && (
          <Card data-testid="card-notes">
            <CardHeader>
              <CardTitle>Notas del Ejecutivo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{visit.notes}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3 justify-end pb-8">
          <Button variant="outline" asChild data-testid="button-back-visits">
            <Link href="/visitas">Volver a Visitas</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
