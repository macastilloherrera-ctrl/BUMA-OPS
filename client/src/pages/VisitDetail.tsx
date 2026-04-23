import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Pencil,
  History,
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
  executiveName?: string;
}

export default function VisitDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    scheduledDate: "",
    type: "",
    executiveId: "",
    notes: "",
  });

  const params = new URLSearchParams(searchString);
  const fromDashboard = params.get("from") === "dashboard";
  const backUrl = fromDashboard ? "/dashboard/visitas" : "/visitas";

  const { data: visit, isLoading } = useQuery<VisitDetailData>({
    queryKey: ["/api/visits", id],
  });

  const { data: userProfile } = useQuery<{ role: string; id: string }>({
    queryKey: ["/api/me"],
  });

  const isManager = userProfile
    ? ["gerente_general", "gerente_operaciones", "gerente_comercial", "gerente_finanzas", "super_admin"].includes(userProfile.role)
    : false;

  const isExecutive = userProfile?.role === "ejecutivo_operaciones";

  const { data: executives } = useQuery<Array<{ userId: string; displayName: string }>>({
    queryKey: ["/api/users/executives"],
    enabled: isManager,
  });

  const { data: history = [] } = useQuery<any[]>({
    queryKey: ["/api/visits", id, "history"],
    queryFn: async () => {
      const res = await fetch(`/api/visits/${id}/history`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const getExecutiveName = (): string => {
    if (visit?.executiveName) return visit.executiveName;
    if (visit?.executiveId) return visit.executiveId;
    return "Sin asignar";
  };

  const startVisitMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/visits/${id}/start`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      setLocation(`/visitas/${id}/en-curso${fromDashboard ? '?from=dashboard' : ''}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo iniciar la visita",
        variant: "destructive",
      });
    },
  });

  const editVisitMutation = useMutation({
    mutationFn: (data: typeof editForm) =>
      apiRequest("PATCH", `/api/visits/${id}`, {
        scheduledDate: data.scheduledDate,
        type: data.type || undefined,
        executiveId: data.executiveId || undefined,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", id, "history"] });
      setShowEditDialog(false);
      toast({ title: "Visita actualizada correctamente" });
    },
    onError: (error: any) => {
      toast({ title: "Error al actualizar", description: error.message, variant: "destructive" });
    },
  });

  const openEditDialog = () => {
    if (!visit) return;
    const dateStr = visit.scheduledDate
      ? new Date(visit.scheduledDate).toISOString().slice(0, 16)
      : "";
    setEditForm({
      scheduledDate: dateStr,
      type: visit.type || "rutina",
      executiveId: visit.executiveId || "",
      notes: visit.notes || "",
    });
    setShowEditDialog(true);
  };

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
  const isEditableStatus = visit.status === "programada" || visit.status === "atrasada";
  const isOwnVisit = visit.executiveId === userProfile?.id;
  const canEdit = isEditableStatus && (isManager || (isExecutive && isOwnVisit));

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={backUrl}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Detalle de Visita</h1>
          </div>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={openEditDialog} data-testid="button-edit-visit">
              <Pencil className="h-4 w-4 mr-1.5" />
              Editar
            </Button>
          )}
          {visit.cancellationType === "eliminada" ? (
            <Badge variant="destructive">Eliminada</Badge>
          ) : visit.cancellationType === "reagendada" ? (
            <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950">Reagendada</Badge>
          ) : (
            <StatusBadge status={visit.status} type="visit" />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-24 md:pb-6 p-4 space-y-4">
        {(visit.cancellationType === "eliminada" || visit.cancellationType === "reagendada") && (
          <Card className={visit.cancellationType === "eliminada" ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/20" : "border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20"}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${visit.cancellationType === "eliminada" ? "bg-red-100 dark:bg-red-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
                  <AlertTriangle className={`h-4 w-4 ${visit.cancellationType === "eliminada" ? "text-red-600" : "text-blue-600"}`} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-medium ${visit.cancellationType === "eliminada" ? "text-red-700 dark:text-red-400" : "text-blue-700 dark:text-blue-400"}`}>
                    Visita {visit.cancellationType === "eliminada" ? "Eliminada" : "Reagendada"}
                  </h3>
                  {visit.cancellationReason && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium">Motivo:</span> {visit.cancellationReason}
                    </p>
                  )}
                  {visit.cancelledAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(visit.cancelledAt), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                {visit.type === "urgente" ? "Urgente" : visit.type === "revision_proyecto" ? "Revisión Proyecto" : "Rutina"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                <span className="text-muted-foreground">Programada:</span>{" "}
                {visit.scheduledDate && format(new Date(visit.scheduledDate), "EEEE, dd MMMM yyyy", { locale: es })}
              </span>
            </div>
            {visit.completedAt && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>
                  <span className="text-muted-foreground">Realizada:</span>{" "}
                  {format(new Date(visit.completedAt), "EEEE, dd MMMM yyyy 'a las' HH:mm", { locale: es })}
                </span>
              </div>
            )}
            {!visit.completedAt && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {visit.scheduledDate && format(new Date(visit.scheduledDate), "HH:mm", { locale: es })}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>
                <span className="text-muted-foreground">Ejecutivo:</span> {getExecutiveName()}
              </span>
            </div>
          </CardContent>
        </Card>

        {visit.status === "no_realizada" && visit.completionObservations && (
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                Motivo No Realizada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{visit.completionObservations}</p>
            </CardContent>
          </Card>
        )}

        {visit.status === "realizada" && visit.completionObservations && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Observaciones de Cierre
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{visit.completionObservations}</p>
            </CardContent>
          </Card>
        )}

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
                      {ticket.priority === "rojo" ? "Crítico" : ticket.priority === "amarillo" ? "Por Vencer" : "Al Día"}
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
                    {visit.lastVisit.type === "urgente" ? "Urgente" : visit.lastVisit.type === "revision_proyecto" ? "Revisión Proyecto" : "Rutina"}
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

        {history.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                Historial de cambios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.map((entry: any) => {
                  let parsed: any = {};
                  try { parsed = JSON.parse(entry.metadata || "{}"); } catch {}
                  const changes = parsed.changes || {};
                  const fieldLabels: Record<string, string> = {
                    scheduledDate: "Fecha/hora",
                    type: "Tipo",
                    notes: "Notas",
                    executiveId: "Ejecutivo",
                  };
                  const typeLabels: Record<string, string> = {
                    rutina: "Rutina",
                    urgente: "Urgente",
                    revision_proyecto: "Revisión Proyecto",
                  };
                  return (
                    <div key={entry.id} className="text-sm border-l-2 border-muted pl-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{entry.userName}</span>
                        <span className="text-xs text-muted-foreground">
                          {entry.createdAt && format(new Date(entry.createdAt), "dd MMM yyyy HH:mm", { locale: es })}
                        </span>
                      </div>
                      <div className="text-muted-foreground space-y-0.5">
                        {Object.entries(changes).map(([field, change]: [string, any]) => (
                          <div key={field}>
                            <span className="font-medium text-foreground/80">{fieldLabels[field] || field}: </span>
                            {field === "scheduledDate" ? (
                              <>
                                {change.from ? format(new Date(change.from), "dd MMM yyyy HH:mm", { locale: es }) : "—"}
                                {" → "}
                                {change.to ? format(new Date(change.to), "dd MMM yyyy HH:mm", { locale: es }) : "—"}
                              </>
                            ) : field === "type" ? (
                              <>{typeLabels[change.from] || change.from || "—"} → {typeLabels[change.to] || change.to || "—"}</>
                            ) : (
                              <>{String(change.from ?? "—")} → {String(change.to ?? "—")}</>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
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
            <Link href={`/visitas/${id}/informe${fromDashboard ? '?from=dashboard' : ''}`}>
              <FileText className="h-5 w-5 mr-2" />
              Ver Informe
            </Link>
          </Button>
        </div>
      )}

      {/* Edit Visit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Visita</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fecha y hora</label>
              <Input
                type="datetime-local"
                value={editForm.scheduledDate}
                onChange={(e) => setEditForm(f => ({ ...f, scheduledDate: e.target.value }))}
                data-testid="input-edit-visit-date"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={editForm.type} onValueChange={(v) => setEditForm(f => ({ ...f, type: v }))}>
                <SelectTrigger data-testid="select-edit-visit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rutina">Rutina</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isManager && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Ejecutivo asignado</label>
                <Select value={editForm.executiveId} onValueChange={(v) => setEditForm(f => ({ ...f, executiveId: v }))}>
                  <SelectTrigger data-testid="select-edit-visit-executive">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin asignar</SelectItem>
                    {executives?.map((exec) => (
                      <SelectItem key={exec.userId} value={exec.userId}>
                        {exec.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notas</label>
              <Textarea
                placeholder="Notas opcionales..."
                value={editForm.notes}
                onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                data-testid="textarea-edit-visit-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => editVisitMutation.mutate(editForm)}
              disabled={editVisitMutation.isPending || !editForm.scheduledDate}
              data-testid="button-save-visit-edit"
            >
              {editVisitMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
