import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Trash2, GripVertical, CalendarCheck, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Building, User } from "@shared/schema";

const projectSchema = z.object({
  name: z.string().min(1, "Nombre es requerido"),
  description: z.string().optional(),
  buildingId: z.string().min(1, "Edificio es requerido"),
  startDate: z.string().min(1, "Fecha de inicio es requerida"),
  plannedEndDate: z.string().min(1, "Fecha de término es requerida"),
  approvedBudget: z.string().optional(),
  contractorName: z.string().optional(),
  contractorContact: z.string().optional(),
  contractorPhone: z.string().optional(),
  contractorEmail: z.string().email().optional().or(z.literal("")),
  awardType: z.enum(["asignacion_directa", "licitacion"]).optional(),
  awardJustification: z.string().optional(),
  quotesReceived: z.string().optional(),
  assignedExecutiveId: z.string().optional(),
  milestones: z.array(z.object({
    name: z.string().min(1, "Nombre del hito es requerido"),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    isReview: z.boolean().optional(),
  })),
});

type ProjectFormData = z.infer<typeof projectSchema>;

const defaultMilestones = [
  { name: "Aprobación del Comité", description: "Proyecto aprobado y presupuesto autorizado", dueDate: "", isReview: false },
  { name: "Contratación", description: "Selección y contrato con empresa contratista", dueDate: "", isReview: false },
  { name: "Inicio de Obras", description: "Comunicado a residentes y comienzo de trabajos", dueDate: "", isReview: false },
  { name: "Revisión Periódica 1", description: "Inspección de avance durante ejecución", dueDate: "", isReview: true },
  { name: "Revisión Periódica 2", description: "Inspección de avance durante ejecución", dueDate: "", isReview: true },
  { name: "Recepción Provisoria", description: "Obra terminada, período de prueba", dueDate: "", isReview: false },
  { name: "Recepción Definitiva", description: "Cierre del proyecto y documentación final", dueDate: "", isReview: false },
];

function getNextReviewNumber(milestones: { name: string; isReview?: boolean }[]): number {
  const reviewMilestones = milestones.filter(m => m.isReview);
  let maxNum = 0;
  reviewMilestones.forEach(m => {
    const match = m.name.match(/Revisión Periódica (\d+)/);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1]));
    }
  });
  return maxNum + 1;
}

export default function NewProject() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: buildings } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  const executives = users?.filter(u => u.role === "ejecutivo_operaciones" && u.isActive) || [];

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      buildingId: "",
      startDate: new Date().toISOString().split("T")[0],
      plannedEndDate: "",
      approvedBudget: "",
      contractorName: "",
      contractorContact: "",
      contractorPhone: "",
      contractorEmail: "",
      awardType: undefined,
      awardJustification: "",
      quotesReceived: "",
      assignedExecutiveId: "",
      milestones: defaultMilestones,
    },
  });

  const { fields, append, remove, insert } = useFieldArray({
    control: form.control,
    name: "milestones",
  });

  const watchedMilestones = form.watch("milestones");

  const addReviewMilestone = () => {
    const nextNum = getNextReviewNumber(watchedMilestones);
    const lastReviewIndex = watchedMilestones.reduce((lastIdx, m, i) => m.isReview ? i : lastIdx, -1);
    const insertIndex = lastReviewIndex >= 0 ? lastReviewIndex + 1 : watchedMilestones.length;
    insert(insertIndex, {
      name: `Revisión Periódica ${nextNum}`,
      description: "Inspección de avance durante ejecución",
      dueDate: "",
      isReview: true,
    });
  };

  const clearMilestone = (index: number) => {
    form.setValue(`milestones.${index}.name`, "");
    form.setValue(`milestones.${index}.description`, "");
    form.setValue(`milestones.${index}.dueDate`, "");
  };

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const payload = {
        ...data,
        startDate: new Date(data.startDate),
        plannedEndDate: new Date(data.plannedEndDate),
        approvedBudget: data.approvedBudget || undefined,
        quotesReceived: data.quotesReceived ? parseInt(data.quotesReceived) : undefined,
        assignedExecutiveId: data.assignedExecutiveId === "none" ? undefined : data.assignedExecutiveId,
        milestones: data.milestones.filter(m => m.name.trim() !== "").map((m, i) => ({
          ...m,
          dueDate: m.dueDate || undefined,
          orderIndex: i,
          isReview: m.isReview || false,
        })),
      };
      return apiRequest("POST", "/api/projects", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Proyecto creado exitosamente" });
      navigate("/proyectos");
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear proyecto",
        description: error.message || "Intente nuevamente",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    createProjectMutation.mutate(data);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/proyectos")} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Nuevo Proyecto</h1>
          <p className="text-muted-foreground">Crear un nuevo proyecto de obra o mejora</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Proyecto *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Mejora Sistema de Aguas Lluvia" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descripción detallada del proyecto..."
                        className="min-h-24"
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="buildingId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edificio *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-building">
                            <SelectValue placeholder="Seleccionar edificio" />
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
                  name="assignedExecutiveId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ejecutivo Asignado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-executive">
                            <SelectValue placeholder="Seleccionar ejecutivo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sin asignar</SelectItem>
                          {executives?.map((exec) => (
                            <SelectItem key={exec.id} value={exec.id}>
                              {exec.firstName} {exec.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Inicio *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plannedEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Término *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="approvedBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Presupuesto Aprobado</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} data-testid="input-budget" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Empresa Contratista</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contractorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Empresa</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Constructora ABC Ltda." {...field} data-testid="input-contractor-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contractorContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contacto</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del contacto" {...field} data-testid="input-contractor-contact" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contractorPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="+56 9 1234 5678" {...field} data-testid="input-contractor-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contractorEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contacto@empresa.cl" {...field} data-testid="input-contractor-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Adjudicación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="awardType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Adjudicación</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-award-type">
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="asignacion_directa">Asignación Directa</SelectItem>
                          <SelectItem value="licitacion">Licitación</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quotesReceived"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cotizaciones Recibidas</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} data-testid="input-quotes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="awardJustification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Justificación de Adjudicación</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Razones de la selección del contratista..."
                        {...field}
                        data-testid="input-justification"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle>Hitos del Proyecto</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addReviewMilestone}
                  data-testid="button-add-review"
                >
                  <CalendarCheck className="h-4 w-4 mr-2" />
                  Agregar Revisión
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: "", description: "", dueDate: "", isReview: false })}
                  data-testid="button-add-milestone"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Hito
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Para proyectos de larga duración, agregue varias revisiones periódicas. Cada revisión con fecha generará automáticamente una visita de inspección.
              </p>
              <div className="space-y-4">
                {fields.map((field, index) => {
                  const milestone = watchedMilestones[index];
                  const isReview = milestone?.isReview;
                  return (
                    <div 
                      key={field.id} 
                      className={`flex gap-4 items-start p-4 border rounded-lg ${isReview ? "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30" : ""}`}
                      data-testid={`milestone-${index}`}
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-move shrink-0" />
                      <div className="flex-1 space-y-3">
                        {isReview && (
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            <CalendarCheck className="h-3 w-3 mr-1" />
                            Revisión Periódica
                          </Badge>
                        )}
                        <div className="grid md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`milestones.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre *</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid={`input-milestone-name-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`milestones.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Descripción</FormLabel>
                                <FormControl>
                                  <Input {...field} data-testid={`input-milestone-desc-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`milestones.${index}.dueDate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Fecha Límite {isReview && <span className="text-blue-600">(genera visita)</span>}</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} data-testid={`input-milestone-date-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => clearMilestone(index)}
                          title="Limpiar datos del hito"
                          data-testid={`button-clear-milestone-${index}`}
                        >
                          <RotateCcw className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="text-destructive"
                          title="Eliminar hito"
                          data-testid={`button-remove-milestone-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/proyectos")}
              className="flex-1"
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createProjectMutation.isPending}
              data-testid="button-submit"
            >
              {createProjectMutation.isPending ? "Creando..." : "Crear Proyecto"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
