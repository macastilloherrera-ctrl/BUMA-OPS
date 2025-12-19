import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Camera,
  Plus,
  CheckCircle2,
  AlertCircle,
  Save,
  X,
} from "lucide-react";
import type { Visit, Building, VisitChecklistItem } from "@shared/schema";
import { Link } from "wouter";

interface VisitInProgressData extends Visit {
  building?: Building;
  checklistItems?: VisitChecklistItem[];
}

export default function VisitInProgress() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [showTicketForm, setShowTicketForm] = useState(false);

  const { data: visit, isLoading } = useQuery<VisitInProgressData>({
    queryKey: ["/api/visits", id],
  });

  const updateChecklistMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest("PATCH", `/api/visits/${id}/checklist/${itemId}`, {
        isCompleted: !checklist[itemId],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", id] });
    },
  });

  const completeVisitMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/visits/${id}/complete`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      toast({
        title: "Visita completada",
        description: "El informe ha sido generado",
      });
      setLocation(`/visitas/${id}/informe`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo completar la visita",
        variant: "destructive",
      });
    },
  });

  const toggleChecklistItem = (itemId: string) => {
    setChecklist((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
    updateChecklistMutation.mutate(itemId);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!visit || visit.status !== "en_curso") {
    return (
      <div className="p-4 text-center py-12">
        <p className="text-muted-foreground">Visita no disponible</p>
        <Button asChild className="mt-4">
          <Link href="/visitas">Volver a visitas</Link>
        </Button>
      </div>
    );
  }

  const completedItems = Object.values(checklist).filter(Boolean).length;
  const totalItems = visit.checklistItems?.length || 0;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/visitas/${id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Visita en Curso</h1>
            <p className="text-sm text-muted-foreground">{visit.building?.name}</p>
          </div>
          <Badge variant={visit.type === "urgente" ? "destructive" : "outline"}>
            {visit.type === "urgente" ? "Urgente" : "Rutina"}
          </Badge>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progreso del checklist</span>
            <span className="font-medium">{completedItems} / {totalItems}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-32 md:pb-24 p-4 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Checklist {visit.checklistType === "emergencia" ? "Emergencia" : "Rutina"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(visit.checklistItems?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No hay items en el checklist</p>
            ) : (
              <div className="space-y-3">
                {visit.checklistItems?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-md bg-muted/30 hover-elevate cursor-pointer"
                    onClick={() => toggleChecklistItem(item.id)}
                    data-testid={`checklist-item-${item.id}`}
                  >
                    <Checkbox
                      checked={checklist[item.id] || item.isCompleted}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className={`text-sm ${checklist[item.id] || item.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                        {item.itemName}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Fotos y Evidencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" data-testid="button-add-photo">
              <Camera className="h-4 w-4 mr-2" />
              Agregar Foto
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Hallazgos / Tickets
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTicketForm(!showTicketForm)}
                data-testid="button-add-finding"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showTicketForm ? (
              <div className="space-y-3">
                <Textarea
                  placeholder="Describe el hallazgo..."
                  className="min-h-20"
                  data-testid="input-finding-description"
                />
                <div className="flex gap-2">
                  <Button size="sm" data-testid="button-save-finding">
                    <Save className="h-4 w-4 mr-1" />
                    Guardar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTicketForm(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay hallazgos registrados. Toca + para agregar.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notas de la Visita</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Observaciones generales, comentarios, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-24"
              data-testid="input-visit-notes"
            />
          </CardContent>
        </Card>

        {visit.type === "urgente" && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-600 dark:text-amber-500">
                <AlertCircle className="h-4 w-4" />
                Incidente / Falla
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Las visitas urgentes requieren registrar el incidente o falla.
              </p>
              <Button variant="outline" asChild data-testid="button-register-incident">
                <Link href={`/visitas/${id}/incidente`}>
                  Registrar Incidente
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <Button
          className="w-full"
          size="lg"
          onClick={() => completeVisitMutation.mutate()}
          disabled={completeVisitMutation.isPending}
          data-testid="button-complete-visit"
        >
          <CheckCircle2 className="h-5 w-5 mr-2" />
          {completeVisitMutation.isPending ? "Finalizando..." : "Cerrar y Generar Informe"}
        </Button>
      </div>
    </div>
  );
}
