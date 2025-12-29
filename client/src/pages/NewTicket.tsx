import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Building, MaintainerCategory, UserProfile } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  AlertTriangle,
  CalendarClock,
  Wrench,
  Building2,
  Tag,
  ImagePlus,
  X,
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";

interface MaintainerWithCategories {
  id: string;
  companyName: string;
  categoryIds: string[];
  isPreferred: boolean;
}

const ticketSchema = z.object({
  buildingId: z.string().min(1, "Selecciona un edificio"),
  ticketType: z.enum(["urgencia", "planificado", "mantencion"]),
  categoryId: z.string().optional(),
  otherCategoryDescription: z.string().optional(),
  description: z.string().min(10, "La descripcion debe tener al menos 10 caracteres"),
  priority: z.enum(["rojo", "amarillo", "verde"]),
  requiresMaintainerVisit: z.boolean().default(false),
  requiresExecutiveVisit: z.boolean().default(false),
  startDate: z.string().min(1, "La fecha de inicio es obligatoria"),
  scheduledDate: z.string().optional(),
});

type TicketForm = z.infer<typeof ticketSchema>;

const ticketTypes = [
  {
    value: "urgencia",
    label: "Urgencia",
    description: "Problema que requiere atencion inmediata",
    icon: AlertTriangle,
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-900",
  },
  {
    value: "planificado",
    label: "Planificado",
    description: "Trabajo programado con fecha especifica",
    icon: CalendarClock,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-900",
  },
  {
    value: "mantencion",
    label: "Mantencion",
    description: "Accion rapida de mantenimiento menor",
    icon: Wrench,
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-900",
  },
];

const priorities = [
  { value: "rojo", label: "Alta", description: "Atencion inmediata", color: "bg-red-500" },
  { value: "amarillo", label: "Media", description: "Proximo a vencer", color: "bg-amber-500" },
  { value: "verde", label: "Normal", description: "Sin urgencia", color: "bg-green-500" },
];

interface UploadedImage {
  name: string;
  objectPath: string;
}

export default function NewTicket() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"type" | "details">("type");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
  });

  const { data: buildings, isLoading: buildingsLoading } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const { data: categories } = useQuery<MaintainerCategory[]>({
    queryKey: ["/api/maintainers/categories"],
  });

  const { data: maintainers } = useQuery<MaintainerWithCategories[]>({
    queryKey: ["/api/maintainers"],
  });

  const form = useForm<TicketForm>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      buildingId: "",
      ticketType: "urgencia",
      categoryId: "",
      otherCategoryDescription: "",
      description: "",
      priority: "verde",
      requiresMaintainerVisit: false,
      requiresExecutiveVisit: false,
      startDate: new Date().toISOString().split("T")[0],
      scheduledDate: "",
    },
  });

  const selectedType = form.watch("ticketType");
  const selectedCategoryId = form.watch("categoryId");

  const getMaintainersForCategory = (categoryId: string) => {
    if (!categoryId || !maintainers) return [];
    return maintainers.filter((m) => m.categoryIds.includes(categoryId));
  };

  const createMutation = useMutation({
    mutationFn: async (data: TicketForm) => {
      const payload: Record<string, unknown> = {
        buildingId: data.buildingId,
        ticketType: data.ticketType,
        description: data.description,
        priority: data.priority,
        requiresMaintainerVisit: data.requiresMaintainerVisit,
        requiresExecutiveVisit: data.requiresExecutiveVisit,
        startDate: new Date(data.startDate).toISOString(),
      };
      if (data.categoryId && data.categoryId !== "otro") {
        payload.categoryId = data.categoryId;
      }
      if (data.categoryId === "otro" && data.otherCategoryDescription) {
        payload.otherCategoryDescription = data.otherCategoryDescription;
      }
      if (data.scheduledDate) payload.scheduledDate = new Date(data.scheduledDate).toISOString();
      
      const ticketResponse = await apiRequest("POST", "/api/tickets", payload);
      const ticketData = await ticketResponse.json();
      
      if (uploadedImages.length > 0 && ticketData.id) {
        for (const img of uploadedImages) {
          await apiRequest("POST", "/api/ticket-photos", {
            ticketId: ticketData.id,
            photoType: "inicial",
            objectStorageKey: img.objectPath,
            description: img.name,
          });
        }
      }
      
      return ticketData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Ticket creado exitosamente" });
      navigate("/tickets");
    },
    onError: () => {
      toast({ title: "Error al crear el ticket", variant: "destructive" });
    },
  });

  const handleTypeSelect = (type: string) => {
    form.setValue("ticketType", type as "urgencia" | "planificado" | "mantencion");
    if (type === "urgencia") {
      form.setValue("priority", "rojo");
    } else if (type === "planificado") {
      form.setValue("priority", "amarillo");
    } else {
      form.setValue("priority", "verde");
    }
    setStep("details");
  };

  const handleSubmit = (data: TicketForm) => {
    createMutation.mutate(data);
  };

  const selectedTypeInfo = ticketTypes.find((t) => t.value === selectedType);

  if (step === "type") {
    return (
      <div className="flex flex-col h-full">
        <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/tickets")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Nuevo Ticket</h1>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto">
            <p className="text-muted-foreground mb-6">
              Selecciona el tipo de ticket que necesitas crear
            </p>

            <div className="grid gap-4">
              {ticketTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Card
                    key={type.value}
                    className={`cursor-pointer hover-elevate border-2 ${type.borderColor} ${type.bgColor}`}
                    onClick={() => handleTypeSelect(type.value)}
                    data-testid={`card-ticket-type-${type.value}`}
                  >
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className={`p-3 rounded-full ${type.bgColor}`}>
                        <Icon className={`h-6 w-6 ${type.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{type.label}</h3>
                        <p className="text-muted-foreground text-sm">{type.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setStep("type")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            {selectedTypeInfo && (
              <>
                <selectedTypeInfo.icon className={`h-5 w-5 ${selectedTypeInfo.color}`} />
                <h1 className="text-xl font-semibold">Nuevo: {selectedTypeInfo.label}</h1>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
        <div className="max-w-2xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="buildingId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Edificio *
                    </FormLabel>
                    {buildingsLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
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
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Categoria de Servicio
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Selecciona una categoria (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {selectedCategoryId && selectedCategoryId !== "otro" && getMaintainersForCategory(selectedCategoryId).length > 0 && (
                      <div className="mt-2 p-3 bg-muted/50 rounded-md">
                        <p className="text-xs text-muted-foreground mb-1">Proveedores disponibles:</p>
                        <div className="flex flex-wrap gap-1">
                          {getMaintainersForCategory(selectedCategoryId).map((m) => (
                            <span key={m.id} className="text-xs bg-background px-2 py-1 rounded">
                              {m.companyName}
                              {m.isPreferred && " (Preferido)"}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </FormItem>
                )}
              />

              {selectedCategoryId === "otro" && (
                <FormField
                  control={form.control}
                  name="otherCategoryDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Especifica la categoria</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Describe el tipo de servicio..."
                          {...field}
                          data-testid="input-other-category"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripcion del Problema *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe el problema o trabajo requerido..."
                        className="min-h-[120px]"
                        {...field}
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridad</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-4"
                      >
                        {priorities.map((p) => (
                          <div key={p.value} className="flex items-center space-x-2">
                            <RadioGroupItem
                              value={p.value}
                              id={`priority-${p.value}`}
                              data-testid={`radio-priority-${p.value}`}
                            />
                            <Label
                              htmlFor={`priority-${p.value}`}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <span className={`w-3 h-3 rounded-full ${p.color}`} />
                              {p.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Inicio *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-start-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedType === "planificado" && (
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha Programada</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-scheduled-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="space-y-3 p-4 bg-muted/30 rounded-md">
                <p className="text-sm font-medium">Tipo de Atencion</p>
                <FormField
                  control={form.control}
                  name="requiresMaintainerVisit"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-requires-maintainer"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Requiere visita de proveedor</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="requiresExecutiveVisit"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-requires-executive"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Requiere supervision de ejecutivo</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <ImagePlus className="h-4 w-4" />
                  Imagenes (opcional)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {uploadedImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-muted px-3 py-2 rounded-md text-sm"
                      data-testid={`uploaded-image-${idx}`}
                    >
                      <span className="truncate max-w-[150px]">{img.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => setUploadedImages((prev) => prev.filter((_, i) => i !== idx))}
                        data-testid={`button-remove-image-${idx}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <ObjectUploader
                  maxNumberOfFiles={5}
                  maxFileSize={10485760}
                  onGetUploadParameters={async (file) => {
                    const res = await fetch("/api/uploads/request-url", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: file.name,
                        size: file.size,
                        contentType: file.type,
                      }),
                    });
                    const { uploadURL } = await res.json();
                    return {
                      method: "PUT",
                      url: uploadURL,
                      headers: { "Content-Type": file.type },
                    };
                  }}
                  onComplete={(result) => {
                    const newImages = (result.successful || []).map((file) => ({
                      name: file.name,
                      objectPath: file.response?.body?.objectPath as string || file.name,
                    }));
                    if (newImages.length > 0) {
                      setUploadedImages((prev) => [...prev, ...newImages]);
                      toast({ title: `${newImages.length} imagen(es) subida(s)` });
                    }
                  }}
                >
                  <ImagePlus className="h-4 w-4 mr-2" />
                  Subir Imagenes
                </ObjectUploader>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("type")}
                  className="flex-1"
                >
                  Volver
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-ticket"
                >
                  {createMutation.isPending ? "Creando..." : "Crear Ticket"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
