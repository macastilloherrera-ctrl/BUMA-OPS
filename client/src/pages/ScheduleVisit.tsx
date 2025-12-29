import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { ArrowLeft, Calendar, AlertTriangle } from "lucide-react";
import type { Building, UserProfile } from "@shared/schema";
import { Link } from "wouter";
import { isManagerRole } from "@/lib/roleRoutes";

const scheduleVisitSchema = z.object({
  buildingId: z.string().min(1, "Selecciona un edificio"),
  type: z.enum(["rutina", "urgente"]),
  executiveId: z.string().optional(),
  scheduledDate: z.string().min(1, "Selecciona fecha y hora"),
  notes: z.string().optional(),
  urgentReason: z.string().optional(),
});

type ScheduleVisitForm = z.infer<typeof scheduleVisitSchema>;

export default function ScheduleVisit() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();

  const searchParams = new URLSearchParams(searchString);
  const preselectedBuildingId = searchParams.get("buildingId") || "";

  const { data: userProfile } = useQuery<{ role: string }>({
    queryKey: ["/api/me"],
  });

  const isManager = userProfile ? isManagerRole(userProfile.role as any) : false;

  const { data: buildings } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const { data: executives } = useQuery<Array<{ userId: string; displayName: string }>>({
    queryKey: ["/api/users/executives"],
    enabled: isManager,
  });

  const form = useForm<ScheduleVisitForm>({
    resolver: zodResolver(scheduleVisitSchema),
    defaultValues: {
      buildingId: preselectedBuildingId,
      type: "rutina",
      executiveId: "",
      scheduledDate: "",
      notes: "",
      urgentReason: "",
    },
  });

  useEffect(() => {
    if (preselectedBuildingId && buildings?.some(b => b.id === preselectedBuildingId)) {
      form.setValue("buildingId", preselectedBuildingId);
    }
  }, [preselectedBuildingId, buildings, form]);

  const visitType = form.watch("type");

  const createVisitMutation = useMutation({
    mutationFn: async (data: ScheduleVisitForm) => {
      const payload: any = {
        buildingId: data.buildingId,
        type: data.type,
        scheduledDate: new Date(data.scheduledDate).toISOString(),
        status: "programada",
        notes: data.notes || null,
      };
      
      if (data.type === "urgente" && data.urgentReason) {
        payload.urgentReason = data.urgentReason;
      }
      
      if (isManager && data.executiveId) {
        payload.executiveId = data.executiveId;
      }
      
      return apiRequest("POST", "/api/visits", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      toast({
        title: "Visita programada",
        description: "La visita ha sido agendada exitosamente",
      });
      setLocation("/visitas");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo programar la visita",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ScheduleVisitForm) => {
    createVisitMutation.mutate(data);
  };

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
            <h1 className="text-lg font-semibold">Programar Visita</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-20 md:pb-6 p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Detalles de la Visita
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="buildingId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edificio *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-building">
                            <SelectValue placeholder="Selecciona un edificio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {buildings?.map((building) => (
                            <SelectItem key={building.id} value={building.id}>
                              {building.name}
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
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Visita *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-visit-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="rutina">Rutina</SelectItem>
                          <SelectItem value="urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {visitType === "urgente" && (
                  <FormField
                    control={form.control}
                    name="urgentReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          Motivo de urgencia (opcional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: Falla en ascensor, corte de agua..."
                            {...field}
                            data-testid="input-urgent-reason"
                          />
                        </FormControl>
                        <FormDescription>
                          Breve descripcion del motivo de la visita urgente
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {isManager && (
                  <FormField
                    control={form.control}
                    name="executiveId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ejecutivo Asignado</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-executive">
                              <SelectValue placeholder="Selecciona un ejecutivo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {executives?.map((exec) => (
                              <SelectItem key={exec.userId} value={exec.userId}>
                                {exec.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Deja vacio para asignarte a ti mismo
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha y Hora *</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          data-testid="input-scheduled-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas (opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observaciones adicionales..."
                          className="min-h-20"
                          {...field}
                          data-testid="input-notes"
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
              disabled={createVisitMutation.isPending}
              data-testid="button-submit-visit"
            >
              {createVisitMutation.isPending ? "Programando..." : "Programar Visita"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
