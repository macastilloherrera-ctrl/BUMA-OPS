import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Play,
  Calendar,
  MapPin,
  Clock,
  User,
  AlertTriangle,
  Wrench,
  FileText,
  CheckCircle2,
} from "lucide-react";
import type { Visit, Building, CriticalAsset, Ticket } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "wouter";

interface VisitDetailData extends Visit {
  building?: Building;
  criticalAssets?: CriticalAsset[];
  relatedTickets?: Ticket[];
  lastVisit?: Visit;
}

export default function VisitDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: visit, isLoading } = useQuery<VisitDetailData>({
    queryKey: ["/api/visits", id],
  });

  const startVisitMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/visits/${id}/start`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      setLocation(`/visitas/${id}/en-curso`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo iniciar la visita",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="p-4 text-center py-12">
        <p className="text-muted-foreground">Visita no encontrada</p>
      </div>
    );
  }

  const canStart = visit.status === "programada" || visit.status === "atrasada";

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/visitas">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Detalle de Visita</h1>
          </div>
          <StatusBadge status={visit.status} type="visit" />
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-24 md:pb-6 p-4 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg">{visit.building?.name}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {visit.building?.address}
                </CardDescription>
              </div>
              <Badge variant={visit.type === "urgente" ? "destructive" : "outline"}>
                {visit.type === "urgente" ? "Urgente" : "Rutina"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {visit.scheduledDate && format(new Date(visit.scheduledDate), "EEEE, dd MMMM yyyy", { locale: es })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {visit.scheduledDate && format(new Date(visit.scheduledDate), "HH:mm", { locale: es })}
              </span>
            </div>
          </CardContent>
        </Card>

        {(visit.relatedTickets?.length ?? 0) > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Tickets del Edificio
              </CardTitle>
              <p className="text-xs text-muted-foreground">Pendientes de resolver en este edificio</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {visit.relatedTickets?.slice(0, 3).map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <span className="text-sm truncate">{ticket.description}</span>
                    <Badge
                      variant="outline"
                      className={
                        ticket.priority === "rojo"
                          ? "border-red-500 text-red-500"
                          : ticket.priority === "amarillo"
                          ? "border-amber-500 text-amber-500"
                          : "border-green-500 text-green-500"
                      }
                    >
                      {ticket.priority === "rojo" ? "Critico" : ticket.priority === "amarillo" ? "Por Vencer" : "Al Dia"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Equipos Criticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(visit.criticalAssets?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No hay equipos registrados</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {visit.criticalAssets?.map((asset) => (
                  <Badge key={asset.id} variant="secondary">
                    {asset.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {visit.lastVisit && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Ultima Visita
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <p className="font-medium">
                    {visit.lastVisit.completedAt && format(new Date(visit.lastVisit.completedAt), "dd MMM yyyy", { locale: es })}
                  </p>
                  <p className="text-muted-foreground">
                    {visit.lastVisit.type === "urgente" ? "Urgente" : "Rutina"}
                  </p>
                </div>
                <StatusBadge status={visit.lastVisit.status} type="visit" />
              </div>
            </CardContent>
          </Card>
        )}

        {visit.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{visit.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {canStart && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 p-4 bg-background border-t border-border md:relative">
          <Button
            className="w-full"
            size="lg"
            onClick={() => startVisitMutation.mutate()}
            disabled={startVisitMutation.isPending}
            data-testid="button-start-visit"
          >
            <Play className="h-5 w-5 mr-2" />
            {startVisitMutation.isPending ? "Iniciando..." : "Iniciar Visita"}
          </Button>
        </div>
      )}

      {visit.status === "realizada" && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 p-4 bg-background border-t border-border md:relative">
          <Button
            className="w-full"
            variant="outline"
            size="lg"
            asChild
            data-testid="button-view-report"
          >
            <Link href={`/visitas/${id}/informe`}>
              <FileText className="h-5 w-5 mr-2" />
              Ver Informe
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
