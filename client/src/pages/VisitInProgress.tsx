import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Camera,
  Plus,
  CheckCircle2,
  AlertCircle,
  Save,
  X,
  Ticket,
  ImagePlus,
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Visit, Building, VisitChecklistItem, Incident, VisitPhoto } from "@shared/schema";
import { Link } from "wouter";

interface VisitInProgressData extends Visit {
  building?: Building;
  checklistItems?: VisitChecklistItem[];
  incidents?: Incident[];
}

export default function VisitInProgress() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [notes, setNotes] = useState("");
  const [completionObservations, setCompletionObservations] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [createTicket, setCreateTicket] = useState(false);
  const [findingDescription, setFindingDescription] = useState("");
  const [ticketCategory, setTicketCategory] = useState("");
  const [ticketPriority, setTicketPriority] = useState<"verde" | "amarillo" | "rojo">("verde");
  const [ticketResponsible, setTicketResponsible] = useState<"ejecutivo" | "proveedor" | "conserjeria" | "comite">("ejecutivo");
  const [ticketResponsibleName, setTicketResponsibleName] = useState("");
  const [ticketDueDate, setTicketDueDate] = useState("");
  const [ticketImages, setTicketImages] = useState<{ name: string; objectPath: string }[]>([]);

  const getCurrentUserName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.email || "Ejecutivo";
  };

  const { data: visit, isLoading } = useQuery<VisitInProgressData>({
    queryKey: ["/api/visits", id],
  });

  const { data: incidents } = useQuery<Incident[]>({
    queryKey: ["/api/incidents", { visitId: id }],
    enabled: !!id,
  });

  const { data: visitPhotos = [] } = useQuery<VisitPhoto[]>({
    queryKey: ["/api/visits", id, "photos"],
    enabled: !!id,
  });

  const visitIncident = incidents?.find((i) => i.visitId === id);

  const uploadVisitPhotoMutation = useMutation({
    mutationFn: async (photo: { objectStorageKey: string; description: string }) => {
      return apiRequest("POST", `/api/visits/${id}/photos`, photo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", id, "photos"] });
      toast({ title: "Foto subida exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al subir foto", variant: "destructive" });
    },
  });

  // Initialize checklist state from server data
  useEffect(() => {
    if (visit?.checklistItems && Object.keys(checklist).length === 0) {
      const initialChecklist: Record<string, boolean> = {};
      visit.checklistItems.forEach((item) => {
        initialChecklist[item.id] = item.isCompleted;
      });
      setChecklist(initialChecklist);
    }
  }, [visit?.checklistItems]);

  const updateChecklistMutation = useMutation({
    mutationFn: async ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) => {
      return apiRequest("PATCH", `/api/visits/${id}/checklist/${itemId}`, {
        isCompleted,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", id] });
    },
  });

  const completeVisitMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/visits/${id}/complete`, { notes, completionObservations });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      toast({
        title: "Visita completada exitosamente",
        description: "El informe ha sido generado. Redirigiendo...",
      });
      setTimeout(() => {
        setLocation(`/visitas/${id}/informe`);
      }, 500);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo completar la visita",
        variant: "destructive",
      });
    },
  });

  const saveNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      return apiRequest("PATCH", `/api/visits/${id}/notes`, { notes: newNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", id] });
    },
  });

  const isTicketFormValid = (): boolean => {
    const description = findingDescription.trim();
    const category = ticketCategory;
    const dueDate = ticketDueDate;
    const responsibleName = ticketResponsibleName.trim();
    
    if (!description || description.length === 0) return false;
    if (!category) return false;
    if (!dueDate) return false;
    if (ticketResponsible !== "ejecutivo" && (!responsibleName || responsibleName.length === 0)) return false;
    return true;
  };

  const handleResponsibleTypeChange = (value: "ejecutivo" | "proveedor" | "conserjeria" | "comite") => {
    setTicketResponsible(value);
    if (value === "ejecutivo") {
      setTicketResponsibleName("");
    }
  };

  const createTicketMutation = useMutation({
    mutationFn: async () => {
      if (!visit?.buildingId) {
        throw new Error("Building ID not available");
      }
      if (!isTicketFormValid()) {
        throw new Error("Complete todos los campos requeridos");
      }
      const responsibleName = ticketResponsible === "ejecutivo" 
        ? getCurrentUserName() 
        : ticketResponsibleName.trim();
      const response = await apiRequest("POST", "/api/tickets", {
        buildingId: visit.buildingId,
        visitId: id,
        description: findingDescription.trim(),
        category: ticketCategory,
        priority: ticketPriority,
        responsibleType: ticketResponsible,
        responsibleName,
        dueDate: ticketDueDate,
      });
      const ticket = await response.json();
      
      if (ticketImages.length > 0 && ticket?.id) {
        for (const img of ticketImages) {
          await apiRequest("POST", "/api/ticket-photos", {
            ticketId: ticket.id,
            objectPath: img.objectPath,
            description: img.name,
          });
        }
      }
      
      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "Ticket creado",
        description: ticketImages.length > 0 
          ? `El hallazgo ha sido registrado con ${ticketImages.length} foto(s)`
          : "El hallazgo ha sido registrado como ticket",
      });
      setShowTicketForm(false);
      setCreateTicket(false);
      setFindingDescription("");
      setTicketCategory("");
      setTicketPriority("verde");
      setTicketResponsible("ejecutivo");
      setTicketResponsibleName("");
      setTicketDueDate("");
      setTicketImages([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el ticket",
        variant: "destructive",
      });
    },
  });

  const toggleChecklistItem = (itemId: string) => {
    const newValue = !checklist[itemId];
    setChecklist((prev) => ({
      ...prev,
      [itemId]: newValue,
    }));
    updateChecklistMutation.mutate({ itemId, isCompleted: newValue });
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
              Fotos y Evidencias ({visitPhotos.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visitPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {visitPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-md overflow-hidden bg-muted"
                  >
                    <img
                      src={`/objects/${photo.objectStorageKey}`}
                      alt={photo.description || "Foto de visita"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
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
                const { uploadURL, objectPath } = await res.json();
                (file.meta as Record<string, unknown>).objectPath = objectPath;
                return {
                  method: "PUT",
                  url: uploadURL,
                  headers: { "Content-Type": file.type },
                };
              }}
              onComplete={(result) => {
                (result.successful || []).forEach((file) => {
                  const objectPath = (file.meta as Record<string, unknown>).objectPath as string;
                  if (objectPath) {
                    const cleanPath = objectPath.replace(/^\/objects\//, "");
                    uploadVisitPhotoMutation.mutate({
                      objectStorageKey: cleanPath,
                      description: file.name,
                    });
                  }
                });
              }}
              buttonClassName="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              Agregar Foto
            </ObjectUploader>
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
                onClick={() => {
                  if (!showTicketForm) {
                    const isUrgent = visit?.type === "urgente";
                    setTicketPriority(isUrgent ? "rojo" : "amarillo");
                    setTicketResponsible("ejecutivo");
                    setTicketResponsibleName("");
                    const suggestedDate = new Date();
                    suggestedDate.setDate(suggestedDate.getDate() + (isUrgent ? 1 : 3));
                    setTicketDueDate(suggestedDate.toISOString().split("T")[0]);
                  }
                  setShowTicketForm(!showTicketForm);
                }}
                data-testid="button-add-finding"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showTicketForm ? (
              <div className="space-y-4">
                <Textarea
                  placeholder="Describe el hallazgo..."
                  className="min-h-20"
                  value={findingDescription}
                  onChange={(e) => setFindingDescription(e.target.value)}
                  data-testid="input-finding-description"
                />

                <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                  <Switch
                    checked={createTicket}
                    onCheckedChange={setCreateTicket}
                    data-testid="switch-create-ticket"
                  />
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <Ticket className="h-4 w-4" />
                    Crear ticket de seguimiento
                  </Label>
                </div>

                {createTicket && (
                  <div className="space-y-3 p-3 border rounded-md">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Categoria</Label>
                        <Select value={ticketCategory} onValueChange={setTicketCategory}>
                          <SelectTrigger data-testid="select-ticket-category">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mantencion">Mantencion</SelectItem>
                            <SelectItem value="reparacion">Reparacion</SelectItem>
                            <SelectItem value="seguridad">Seguridad</SelectItem>
                            <SelectItem value="limpieza">Limpieza</SelectItem>
                            <SelectItem value="otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Prioridad</Label>
                        <Select value={ticketPriority} onValueChange={(v) => setTicketPriority(v as "verde" | "amarillo" | "rojo")}>
                          <SelectTrigger data-testid="select-ticket-priority">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="verde">Verde - Normal</SelectItem>
                            <SelectItem value="amarillo">Amarillo - Urgente</SelectItem>
                            <SelectItem value="rojo">Rojo - Critico</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Responsable</Label>
                        <Select value={ticketResponsible} onValueChange={(v) => handleResponsibleTypeChange(v as "ejecutivo" | "proveedor" | "conserjeria" | "comite")}>
                          <SelectTrigger data-testid="select-ticket-responsible">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ejecutivo">Ejecutivo</SelectItem>
                            <SelectItem value="proveedor">Proveedor</SelectItem>
                            <SelectItem value="conserjeria">Conserjeria</SelectItem>
                            <SelectItem value="comite">Comite</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Fecha compromiso</Label>
                        <Input
                          type="date"
                          value={ticketDueDate}
                          onChange={(e) => setTicketDueDate(e.target.value)}
                          data-testid="input-ticket-due-date"
                        />
                      </div>
                    </div>
                    {ticketResponsible !== "ejecutivo" && (
                      <div className="space-y-1">
                        <Label className="text-xs">Nombre del responsable</Label>
                        <Input
                          placeholder="Nombre o empresa"
                          value={ticketResponsibleName}
                          onChange={(e) => setTicketResponsibleName(e.target.value)}
                          data-testid="input-ticket-responsible-name"
                        />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1">
                        <ImagePlus className="h-3 w-3" />
                        Fotos de evidencia (opcional)
                      </Label>
                      {ticketImages.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {ticketImages.map((img, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs"
                              data-testid={`ticket-image-${idx}`}
                            >
                              <span className="truncate max-w-[100px]">{img.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4"
                                onClick={() => setTicketImages((prev) => prev.filter((_, i) => i !== idx))}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
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
                          const { uploadURL, objectPath } = await res.json();
                          (file.meta as Record<string, unknown>).objectPath = objectPath;
                          return {
                            method: "PUT",
                            url: uploadURL,
                            headers: { "Content-Type": file.type },
                          };
                        }}
                        onComplete={(result) => {
                          const newImages = (result.successful || []).map((file) => ({
                            name: file.name,
                            objectPath: (file.meta as Record<string, unknown>).objectPath as string || file.name,
                          }));
                          if (newImages.length > 0) {
                            setTicketImages((prev) => [...prev, ...newImages]);
                            toast({ title: `${newImages.length} foto(s) subida(s)` });
                          }
                        }}
                      >
                        <Camera className="h-3 w-3 mr-1" />
                        Subir Fotos
                      </ObjectUploader>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {createTicket ? (
                    <Button
                      size="sm"
                      onClick={() => createTicketMutation.mutate()}
                      disabled={!isTicketFormValid() || !visit?.buildingId || createTicketMutation.isPending}
                      data-testid="button-save-finding"
                    >
                      <Ticket className="h-4 w-4 mr-1" />
                      {createTicketMutation.isPending ? "Creando..." : "Crear Ticket"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newNotes = notes ? `${notes}\n\nHallazgo: ${findingDescription}` : `Hallazgo: ${findingDescription}`;
                        setNotes(newNotes);
                        saveNotesMutation.mutate(newNotes, {
                          onSuccess: () => {
                            toast({
                              title: "Hallazgo registrado",
                              description: "El hallazgo queda guardado en las notas de la visita",
                            });
                            setShowTicketForm(false);
                            setFindingDescription("");
                          },
                        });
                      }}
                      disabled={!findingDescription || saveNotesMutation.isPending}
                      data-testid="button-save-finding"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {saveNotesMutation.isPending ? "Guardando..." : "Guardar en Notas"}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowTicketForm(false);
                      setCreateTicket(false);
                      setFindingDescription("");
                      setTicketImages([]);
                    }}
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Observaciones Finales</CardTitle>
            <p className="text-xs text-muted-foreground">
              Ingresa tus observaciones para el cierre de la visita (se incluiran en el informe)
            </p>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Resumen del trabajo realizado, pendientes, recomendaciones..."
              value={completionObservations}
              onChange={(e) => setCompletionObservations(e.target.value)}
              className="min-h-24"
              data-testid="input-completion-observations"
            />
          </CardContent>
        </Card>

        {visit.type === "urgente" && (
          <Card className={visitIncident ? "border-green-500/50 bg-green-500/5" : "border-amber-500/50 bg-amber-500/5"}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-base flex items-center gap-2 ${visitIncident ? "text-green-600 dark:text-green-500" : "text-amber-600 dark:text-amber-500"}`}>
                <AlertCircle className="h-4 w-4" />
                Incidente / Falla {visitIncident ? "(Registrado)" : "(Requerido)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {visitIncident ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{visitIncident.failureType}</p>
                  <p className="text-sm text-muted-foreground">{visitIncident.reason}</p>
                  <Badge variant={
                    visitIncident.status === "reparada" ? "default" :
                    visitIncident.status === "en_reparacion" ? "secondary" :
                    "outline"
                  }>
                    {visitIncident.status === "pendiente" ? "Pendiente" :
                     visitIncident.status === "en_reparacion" ? "En reparacion" :
                     visitIncident.status === "reparada" ? "Reparada" : "Reprogramada"}
                  </Badge>
                  <Button variant="outline" size="sm" asChild className="mt-2" data-testid="button-edit-incident">
                    <Link href={`/visitas/${id}/incidente`}>
                      Editar Incidente
                    </Link>
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    Las visitas urgentes requieren registrar el incidente o falla antes de cerrar.
                  </p>
                  <Button variant="default" asChild data-testid="button-register-incident">
                    <Link href={`/visitas/${id}/incidente`}>
                      Registrar Incidente
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        {visit.type === "urgente" && !visitIncident ? (
          <Button
            className="w-full"
            size="lg"
            variant="secondary"
            asChild
            data-testid="button-complete-visit-blocked"
          >
            <Link href={`/visitas/${id}/incidente`}>
              <AlertCircle className="h-5 w-5 mr-2" />
              Registrar Incidente para Cerrar
            </Link>
          </Button>
        ) : (
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
        )}
      </div>
    </div>
  );
}
