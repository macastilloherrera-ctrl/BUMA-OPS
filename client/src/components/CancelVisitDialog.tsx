import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Calendar, Trash2 } from "lucide-react";
import type { Visit, Building } from "@shared/schema";

interface CancelVisitDialogProps {
  visit: Visit & { building?: Building };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "initial" | "reschedule_reason" | "delete_reason";

export function CancelVisitDialog({ visit, open, onOpenChange }: CancelVisitDialogProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("initial");
  const [cancellationReason, setCancellationReason] = useState("");

  const cancelMutation = useMutation({
    mutationFn: async (data: { cancellationType: "reagendada" | "eliminada"; cancellationReason?: string }) => {
      return apiRequest("PATCH", `/api/visits/${visit.id}/cancel`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      onOpenChange(false);
      setStep("initial");
      setCancellationReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al cancelar la visita",
        variant: "destructive",
      });
    },
  });

  const handleReschedule = async () => {
    if (!cancellationReason.trim()) {
      toast({
        title: "Error",
        description: "Debes escribir un motivo para reagendar la visita",
        variant: "destructive",
      });
      return;
    }
    await cancelMutation.mutateAsync({ 
      cancellationType: "reagendada",
      cancellationReason: cancellationReason.trim(),
    });
    toast({
      title: "Visita marcada para reagendar",
      description: "Ahora puedes programar una nueva visita",
    });
    const params = new URLSearchParams({
      buildingId: visit.buildingId,
      type: visit.type,
      fromVisitId: visit.id,
    });
    if (visit.notes) {
      params.set("notes", visit.notes);
    }
    if (visit.executiveId) {
      params.set("executiveId", visit.executiveId);
    }
    navigate(`/visitas/programar?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!cancellationReason.trim()) {
      toast({
        title: "Error",
        description: "Debes escribir un motivo para eliminar la visita",
        variant: "destructive",
      });
      return;
    }
    await cancelMutation.mutateAsync({
      cancellationType: "eliminada",
      cancellationReason: cancellationReason.trim(),
    });
    toast({
      title: "Visita eliminada",
      description: "La visita ha sido cancelada definitivamente",
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep("initial");
    setCancellationReason("");
  };

  const buildingName = visit.building?.name || "Edificio";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === "initial" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Cancelar Visita
              </DialogTitle>
              <DialogDescription>
                Vas a cancelar la visita a <strong>{buildingName}</strong>. Selecciona una opcion:
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-4">
              <Button
                onClick={() => { setStep("reschedule_reason"); setCancellationReason(""); }}
                className="justify-start gap-2"
                variant="outline"
                data-testid="button-reschedule-option"
              >
                <Calendar className="h-4 w-4" />
                Reagendar para otra fecha
              </Button>
              <Button
                onClick={() => { setStep("delete_reason"); setCancellationReason(""); }}
                className="justify-start gap-2"
                variant="outline"
                data-testid="button-delete-option"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar definitivamente
              </Button>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={handleClose} data-testid="button-cancel-dialog">
                Volver
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "reschedule_reason" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Reagendar Visita
              </DialogTitle>
              <DialogDescription>
                Escribe el motivo por el cual se reagenda esta visita. Luego seras llevado a programar la nueva fecha.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="reschedule-reason">Motivo del reagendamiento</Label>
              <Textarea
                id="reschedule-reason"
                placeholder="Ej: Lluvia intensa, ejecutivo con licencia, edificio cerrado..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="mt-2"
                rows={3}
                data-testid="input-reschedule-reason"
              />
            </div>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setStep("initial")} data-testid="button-back">
                Volver
              </Button>
              <Button 
                onClick={handleReschedule} 
                disabled={cancelMutation.isPending || !cancellationReason.trim()}
                data-testid="button-confirm-reschedule"
              >
                {cancelMutation.isPending ? "Procesando..." : "Confirmar y Reagendar"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "delete_reason" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                Eliminar Visita
              </DialogTitle>
              <DialogDescription>
                Escribe el motivo por el cual esta visita no se realizara. Esta informacion quedara registrada.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="cancellation-reason">Motivo de la eliminacion</Label>
              <Textarea
                id="cancellation-reason"
                placeholder="Escribe el motivo de la eliminacion..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="mt-2"
                rows={3}
                data-testid="input-cancellation-reason"
              />
            </div>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setStep("initial")} data-testid="button-back">
                Volver
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDelete} 
                disabled={cancelMutation.isPending || !cancellationReason.trim()}
                data-testid="button-confirm-delete"
              >
                {cancelMutation.isPending ? "Eliminando..." : "Eliminar Visita"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
