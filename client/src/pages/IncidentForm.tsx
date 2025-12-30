import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, AlertTriangle, Save } from "lucide-react";
import { Link } from "wouter";
import type { Visit, Building, CriticalAsset, Incident } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

const FAILURE_TYPES = [
  "Falla electrica",
  "Falla mecanica",
  "Falla hidraulica",
  "Falla de seguridad",
  "Falla de comunicacion",
  "Vandalismo",
  "Desgaste natural",
  "Accidente",
  "Otro",
];

const INCIDENT_STATUSES = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_reparacion", label: "En reparacion" },
  { value: "reparada", label: "Reparada" },
  { value: "reprogramada", label: "Reprogramada" },
];

const createIncidentFormSchema = (isUrgentVisit: boolean) => z.object({
  reason: z.string().min(1, "Ingresa el motivo del incidente"),
  failureType: z.string().min(1, "Selecciona el tipo de falla"),
  occurredAt: z.string().min(1, "Ingresa la fecha y hora"),
  criticalAssetId: isUrgentVisit 
    ? z.string().min(1, "Selecciona el equipo critico afectado (obligatorio para visitas urgentes)")
    : z.string().optional(),
  otherAssetDescription: z.string().optional(),
  providerCalled: z.string().optional(),
  communityActions: z.string().optional(),
  status: z.enum(["pendiente", "en_reparacion", "reparada", "reprogramada"]),
  repairDate: z.string().optional(),
}).refine((data) => {
  if (data.criticalAssetId === "otro" && isUrgentVisit) {
    return !!data.otherAssetDescription && data.otherAssetDescription.length > 0;
  }
  return true;
}, {
  message: "Describe el equipo afectado",
  path: ["otherAssetDescription"],
});

type IncidentFormData = z.infer<ReturnType<typeof createIncidentFormSchema>>;

interface VisitData extends Visit {
  building?: Building;
}

export default function IncidentForm() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: visit, isLoading: visitLoading } = useQuery<VisitData>({
    queryKey: ["/api/visits", id],
  });

  const { data: existingIncidents } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
    select: (data) => data.filter((i) => i.visitId === id),
  });

  const { data: assets } = useQuery<CriticalAsset[]>({
    queryKey: ["/api/critical-assets"],
    enabled: !!visit?.buildingId,
    select: (data) => data.filter((a) => a.buildingId === visit?.buildingId && a.status === "aprobado"),
  });

  const existingIncident = existingIncidents?.[0];
  const isUrgentVisit = visit?.type === "urgente";

  const form = useForm<IncidentFormData>({
    resolver: zodResolver(createIncidentFormSchema(isUrgentVisit)),
    defaultValues: {
      reason: existingIncident?.reason || "",
      failureType: existingIncident?.failureType || "",
      occurredAt: existingIncident?.occurredAt 
        ? new Date(existingIncident.occurredAt).toISOString().slice(0, 16) 
        : new Date().toISOString().slice(0, 16),
      criticalAssetId: existingIncident?.criticalAssetId || "",
      otherAssetDescription: (existingIncident as any)?.otherAssetDescription || "",
      providerCalled: existingIncident?.providerCalled || "",
      communityActions: existingIncident?.communityActions || "",
      status: (existingIncident?.status as any) || "pendiente",
      repairDate: existingIncident?.repairDate 
        ? new Date(existingIncident.repairDate).toISOString().slice(0, 16) 
        : "",
    },
  });
  
  const selectedAssetId = form.watch("criticalAssetId");

  const createMutation = useMutation({
    mutationFn: async (data: IncidentFormData) => {
      const payload = {
        ...data,
        visitId: id,
        buildingId: visit?.buildingId,
        occurredAt: new Date(data.occurredAt).toISOString(),
        repairDate: data.repairDate ? new Date(data.repairDate).toISOString() : null,
        criticalAssetId: data.criticalAssetId === "otro" ? null : (data.criticalAssetId || null),
        otherAssetDescription: data.criticalAssetId === "otro" ? data.otherAssetDescription : null,
      };
      return apiRequest("POST", "/api/incidents", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", id] });
      toast({
        title: "Incidente registrado",
        description: "El incidente ha sido guardado exitosamente",
      });
      setLocation(`/visitas/${id}/en-curso`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar el incidente",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: IncidentFormData) => {
      const payload = {
        ...data,
        occurredAt: new Date(data.occurredAt).toISOString(),
        repairDate: data.repairDate ? new Date(data.repairDate).toISOString() : null,
        criticalAssetId: data.criticalAssetId === "otro" ? null : (data.criticalAssetId || null),
        otherAssetDescription: data.criticalAssetId === "otro" ? data.otherAssetDescription : null,
      };
      return apiRequest("PATCH", `/api/incidents/${existingIncident!.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/visits", id] });
      toast({
        title: "Incidente actualizado",
        description: "Los cambios han sido guardados",
      });
      setLocation(`/visitas/${id}/en-curso`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el incidente",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: IncidentFormData) => {
    if (existingIncident) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (visitLoading) {
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

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="sticky top-0 bg-background border-b border-border z-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/visitas/${id}/en-curso`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {existingIncident ? "Editar Incidente" : "Registrar Incidente"}
            </h1>
            <p className="text-sm text-muted-foreground">{visit.building?.name}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-24 p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Detalles del Incidente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo / Descripcion *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe el incidente o falla..."
                          className="min-h-24"
                          {...field}
                          data-testid="input-incident-reason"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="failureType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Falla *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-failure-type">
                            <SelectValue placeholder="Selecciona tipo de falla" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FAILURE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="occurredAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha y Hora del Incidente *</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          data-testid="input-occurred-at"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="criticalAssetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Equipo Critico Afectado {isUrgentVisit && <span className="text-destructive">* (obligatorio)</span>}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-critical-asset">
                            <SelectValue placeholder={isUrgentVisit ? "Selecciona equipo (obligatorio)" : "Selecciona equipo (opcional)"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {!isUrgentVisit && <SelectItem value="">Ninguno</SelectItem>}
                          {assets?.map((asset) => (
                            <SelectItem key={asset.id} value={asset.id}>
                              {asset.name} ({asset.type})
                            </SelectItem>
                          ))}
                          <SelectItem value="otro">Otro (especificar)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedAssetId === "otro" && (
                  <FormField
                    control={form.control}
                    name="otherAssetDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripcion del Equipo Afectado *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: Porton electrico entrada principal"
                            {...field}
                            data-testid="input-other-asset-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Acciones Tomadas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="providerCalled"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proveedor Contactado</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nombre del proveedor o tecnico..."
                          {...field}
                          data-testid="input-provider-called"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="communityActions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Acciones a la Comunidad</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Comunicacion enviada, medidas tomadas..."
                          className="min-h-20"
                          {...field}
                          data-testid="input-community-actions"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-incident-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INCIDENT_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="repairDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha/Hora Reparacion (si aplica)</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          data-testid="input-repair-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isPending}
              data-testid="button-save-incident"
            >
              <Save className="h-5 w-5 mr-2" />
              {isPending ? "Guardando..." : existingIncident ? "Actualizar Incidente" : "Guardar Incidente"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
