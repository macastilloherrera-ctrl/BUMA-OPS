import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Building, MaintainerCategory, UserProfile, TicketQuote, TicketPhoto, TicketWorkCycle } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Tag,
  Wrench,
  AlertTriangle,
  CalendarClock,
  FileText,
  Image,
  MessageSquare,
  Plus,
  Check,
  X,
  DollarSign,
  Clock,
  Star,
  Camera,
  Trash2,
  Download,
  RotateCcw,
  Paperclip,
  FileText as FileIcon,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TicketWithDetails {
  id: string;
  buildingId: string;
  ticketType: "urgencia" | "planificado" | "mantencion";
  categoryId?: string | null;
  maintainerId?: string | null;
  description: string;
  priority: "rojo" | "amarillo" | "verde";
  status: "pendiente" | "en_curso" | "vencido" | "resuelto" | "reprogramado";
  requiresMaintainerVisit?: boolean;
  requiresExecutiveVisit?: boolean;
  scheduledDate?: string | null;
  approvedQuoteId?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  workStartedAt?: string | null;
  workCompletedAt?: string | null;
  invoiceNumber?: string | null;
  invoiceAmount?: string | null;
  closedAt?: string | null;
  closedBy?: string | null;
  createdAt?: string | null;
  building?: Building;
  cost?: string | null;
}

interface MaintainerWithCategories {
  id: string;
  companyName: string;
  categoryIds: string[];
  isPreferred: boolean;
}

const quoteSchema = z.object({
  maintainerId: z.string().optional(),
  companyName: z.string().min(1, "El nombre de la empresa es requerido"),
  description: z.string().optional(),
  amountNet: z.coerce.number().min(1, "El monto es requerido"),
  durationDays: z.coerce.number().min(1).optional(),
});

type QuoteForm = z.infer<typeof quoteSchema>;

const closureSchema = z.object({
  invoiceNumber: z.string().optional(),
  invoiceAmount: z.coerce.number().min(0).optional(),
});

type ClosureForm = z.infer<typeof closureSchema>;

const restartSchema = z.object({
  reason: z.string().min(1, "La razon del reinicio es requerida"),
  committedCompletionAt: z.string().min(1, "La fecha comprometida es requerida"),
});

type RestartForm = z.infer<typeof restartSchema>;

const ticketTypeLabels: Record<string, { label: string; icon: typeof AlertTriangle; color: string }> = {
  urgencia: { label: "Urgencia", icon: AlertTriangle, color: "text-red-500" },
  planificado: { label: "Planificado", icon: CalendarClock, color: "text-blue-500" },
  mantencion: { label: "Mantencion", icon: Wrench, color: "text-green-500" },
};

export default function TicketDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("detalles");
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [isClosureDialogOpen, setIsClosureDialogOpen] = useState(false);
  const [isRestartDialogOpen, setIsRestartDialogOpen] = useState(false);

  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
  });

  const isManager = userProfile?.role === "gerente_general" || userProfile?.role === "gerente_operaciones";
  const canSeeCosts = userProfile?.role !== "ejecutivo_operaciones";

  const { data: ticket, isLoading } = useQuery<TicketWithDetails>({
    queryKey: ["/api/tickets", id],
  });

  const { data: categories } = useQuery<MaintainerCategory[]>({
    queryKey: ["/api/maintainers/categories"],
  });

  const { data: maintainers } = useQuery<MaintainerWithCategories[]>({
    queryKey: ["/api/maintainers"],
  });

  const { data: quotes, isLoading: quotesLoading } = useQuery<TicketQuote[]>({
    queryKey: ["/api/tickets", id, "quotes"],
    enabled: !!id,
  });

  const { data: photos, isLoading: photosLoading } = useQuery<TicketPhoto[]>({
    queryKey: ["/api/tickets", id, "photos"],
    enabled: !!id,
  });

  const { data: workHistory } = useQuery<TicketWorkCycle[]>({
    queryKey: ["/api/tickets", id, "work-history"],
    enabled: !!id,
  });

  const restartForm = useForm<RestartForm>({
    resolver: zodResolver(restartSchema),
    defaultValues: {
      reason: "",
      committedCompletionAt: "",
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (data: { objectPath: string; description: string; photoType: string }) => {
      return apiRequest("POST", `/api/tickets/${id}/photos`, {
        objectStorageKey: data.objectPath,
        description: data.description,
        photoType: data.photoType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id, "photos"] });
      toast({ title: "Foto subida exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al subir foto", variant: "destructive" });
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      return apiRequest("DELETE", `/api/tickets/${id}/photos/${photoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id, "photos"] });
      toast({ title: "Foto eliminada" });
    },
    onError: () => {
      toast({ title: "Error al eliminar foto", variant: "destructive" });
    },
  });

  const quoteForm = useForm<QuoteForm>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      maintainerId: "",
      companyName: "",
      description: "",
      amountNet: 0,
      durationDays: undefined,
    },
  });

  const closureForm = useForm<ClosureForm>({
    resolver: zodResolver(closureSchema),
    defaultValues: {
      invoiceNumber: "",
      invoiceAmount: 0,
    },
  });

  const createQuoteMutation = useMutation({
    mutationFn: async (data: QuoteForm) => {
      return apiRequest("POST", `/api/tickets/${id}/quotes`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id, "quotes"] });
      setIsQuoteDialogOpen(false);
      quoteForm.reset();
      toast({ title: "Cotizacion agregada" });
    },
    onError: () => {
      toast({ title: "Error al agregar cotizacion", variant: "destructive" });
    },
  });

  const approveQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return apiRequest("PATCH", `/api/tickets/${id}/quotes/${quoteId}`, { status: "aceptada" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id, "quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id] });
      toast({ title: "Cotizacion aprobada" });
    },
    onError: () => {
      toast({ title: "Error al aprobar cotizacion", variant: "destructive" });
    },
  });

  const updateQuoteAttachmentMutation = useMutation({
    mutationFn: async ({ quoteId, attachmentKey }: { quoteId: string; attachmentKey: string | null }) => {
      return apiRequest("PATCH", `/api/tickets/${id}/quotes/${quoteId}`, { attachmentKey });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id, "quotes"] });
      toast({ title: variables.attachmentKey ? "Documento adjuntado" : "Documento eliminado" });
    },
    onError: () => {
      toast({ title: "Error al actualizar documento", variant: "destructive" });
    },
  });

  const startWorkMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/tickets/${id}`, {
        status: "en_curso",
        workStartedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Trabajo iniciado" });
    },
    onError: () => {
      toast({ title: "Error al iniciar trabajo", variant: "destructive" });
    },
  });

  const completeWorkMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/tickets/${id}`, {
        workCompletedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Trabajo completado" });
    },
    onError: () => {
      toast({ title: "Error al completar trabajo", variant: "destructive" });
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: async (data: ClosureForm) => {
      return apiRequest("PATCH", `/api/tickets/${id}`, {
        status: "resuelto",
        invoiceNumber: data.invoiceNumber || null,
        invoiceAmount: data.invoiceAmount ? String(data.invoiceAmount) : null,
        closedAt: new Date().toISOString(),
        closedBy: userProfile?.userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setIsClosureDialogOpen(false);
      closureForm.reset();
      toast({ title: "Ticket cerrado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al cerrar ticket", variant: "destructive" });
    },
  });

  const restartWorkMutation = useMutation({
    mutationFn: async (data: RestartForm) => {
      return apiRequest("POST", `/api/tickets/${id}/restart-work`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id, "quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id, "work-history"] });
      setIsRestartDialogOpen(false);
      restartForm.reset();
      toast({ title: "Trabajo reiniciado - ticket listo para nuevo ciclo" });
    },
    onError: () => {
      toast({ title: "Error al reiniciar trabajo", variant: "destructive" });
    },
  });

  const getMaintainersForCategory = (categoryId: string | null | undefined) => {
    if (!categoryId || !maintainers) return maintainers || [];
    return maintainers.filter((m) => m.categoryIds.includes(categoryId));
  };

  const handleMaintainerSelect = (maintainerId: string) => {
    const maintainer = maintainers?.find((m) => m.id === maintainerId);
    if (maintainer) {
      quoteForm.setValue("companyName", maintainer.companyName);
      quoteForm.setValue("maintainerId", maintainerId);
    }
  };

  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return null;
    return categories?.find((c) => c.id === categoryId)?.name;
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(num);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <p className="text-muted-foreground">Ticket no encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/tickets")}>
          Volver a tickets
        </Button>
      </div>
    );
  }

  const typeInfo = ticketTypeLabels[ticket.ticketType];
  const TypeIcon = typeInfo?.icon || AlertTriangle;
  const availableMaintainers = getMaintainersForCategory(ticket.categoryId);
  const sortedQuotes = quotes?.slice().sort((a, b) => parseFloat(a.amountNet) - parseFloat(b.amountNet));
  const hasApprovedQuote = quotes?.some((q) => q.status === "aceptada");

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tickets")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <TypeIcon className={`h-5 w-5 ${typeInfo?.color}`} />
              <h1 className="text-lg font-semibold">{typeInfo?.label}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} type="ticket" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-24 md:pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="sticky top-0 bg-background px-4 pt-3 border-b">
            <TabsList className="w-full grid grid-cols-4 h-10">
              <TabsTrigger value="detalles" data-testid="tab-detalles">
                <FileText className="h-4 w-4 md:mr-1" />
                <span className="hidden md:inline">Detalles</span>
              </TabsTrigger>
              <TabsTrigger value="cotizaciones" data-testid="tab-cotizaciones">
                <DollarSign className="h-4 w-4 md:mr-1" />
                <span className="hidden md:inline">Cotizaciones</span>
              </TabsTrigger>
              <TabsTrigger value="fotos" data-testid="tab-fotos">
                <Image className="h-4 w-4 md:mr-1" />
                <span className="hidden md:inline">Fotos</span>
              </TabsTrigger>
              <TabsTrigger value="comunicacion" data-testid="tab-comunicacion">
                <MessageSquare className="h-4 w-4 md:mr-1" />
                <span className="hidden md:inline">Avisos</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="detalles" className="px-4 mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Informacion del Ticket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Descripcion</p>
                  <p className="text-sm">{ticket.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Edificio
                    </p>
                    <p className="text-sm font-medium">{ticket.building?.name || "N/A"}</p>
                  </div>

                  {getCategoryName(ticket.categoryId) && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        Categoria
                      </p>
                      <p className="text-sm font-medium">{getCategoryName(ticket.categoryId)}</p>
                    </div>
                  )}

                  {ticket.scheduledDate && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Fecha Programada
                      </p>
                      <p className="text-sm font-medium">
                        {format(new Date(ticket.scheduledDate), "dd MMM yyyy", { locale: es })}
                      </p>
                    </div>
                  )}

                  {ticket.createdAt && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Creado</p>
                      <p className="text-sm font-medium">
                        {format(new Date(ticket.createdAt), "dd MMM yyyy", { locale: es })}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {ticket.requiresMaintainerVisit && (
                    <Badge variant="outline" className="text-xs">
                      <Wrench className="h-3 w-3 mr-1" />
                      Requiere proveedor
                    </Badge>
                  )}
                  {ticket.requiresExecutiveVisit && (
                    <Badge variant="outline" className="text-xs">
                      Requiere supervision
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {ticket.status !== "resuelto" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Flujo de Trabajo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-3 h-3 rounded-full ${ticket.workStartedAt ? "bg-green-500" : "bg-muted"}`} />
                    <span className={ticket.workStartedAt ? "font-medium" : "text-muted-foreground"}>
                      Trabajo iniciado
                    </span>
                    {ticket.workStartedAt && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(ticket.workStartedAt), "dd MMM HH:mm", { locale: es })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-3 h-3 rounded-full ${ticket.workCompletedAt ? "bg-green-500" : "bg-muted"}`} />
                    <span className={ticket.workCompletedAt ? "font-medium" : "text-muted-foreground"}>
                      Trabajo completado
                    </span>
                    {ticket.workCompletedAt && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(ticket.workCompletedAt), "dd MMM HH:mm", { locale: es })}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap pt-2 border-t">
                    {ticket.status === "pendiente" && !ticket.workStartedAt && (
                      <Button
                        size="sm"
                        onClick={() => startWorkMutation.mutate()}
                        disabled={startWorkMutation.isPending}
                        data-testid="button-start-work"
                      >
                        Iniciar Trabajo
                      </Button>
                    )}
                    {ticket.workStartedAt && !ticket.workCompletedAt && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => completeWorkMutation.mutate()}
                        disabled={completeWorkMutation.isPending}
                        data-testid="button-complete-work"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Marcar Completado
                      </Button>
                    )}
                    {isManager && ticket.workCompletedAt && (hasApprovedQuote || ticket.ticketType === "urgencia") && (
                      <Dialog open={isClosureDialogOpen} onOpenChange={setIsClosureDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" data-testid="button-close-ticket">
                            <Check className="h-4 w-4 mr-1" />
                            Cerrar Ticket
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Cerrar Ticket</DialogTitle>
                          </DialogHeader>
                          <Form {...closureForm}>
                            <form
                              onSubmit={closureForm.handleSubmit((data) => closeTicketMutation.mutate(data))}
                              className="space-y-4"
                            >
                              <FormField
                                control={closureForm.control}
                                name="invoiceNumber"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Numero de Factura (opcional)</FormLabel>
                                    <FormControl>
                                      <Input {...field} data-testid="input-invoice-number" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={closureForm.control}
                                name="invoiceAmount"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Monto Factura (opcional)</FormLabel>
                                    <FormControl>
                                      <Input type="number" {...field} data-testid="input-invoice-amount" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => setIsClosureDialogOpen(false)}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  type="submit"
                                  className="flex-1"
                                  disabled={closeTicketMutation.isPending}
                                  data-testid="button-confirm-close"
                                >
                                  {closeTicketMutation.isPending ? "Cerrando..." : "Cerrar Ticket"}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {ticket.status === "resuelto" && ticket.closedAt && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ticket Cerrado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Cerrado el {format(new Date(ticket.closedAt), "dd MMM yyyy HH:mm", { locale: es })}</span>
                  </div>
                  {canSeeCosts && ticket.invoiceNumber && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Factura: </span>
                      <span className="font-medium">{ticket.invoiceNumber}</span>
                    </div>
                  )}
                  {canSeeCosts && ticket.invoiceAmount && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Monto: </span>
                      <span className="font-medium">{formatCurrency(ticket.invoiceAmount)}</span>
                    </div>
                  )}
                  {isManager && (
                    <div className="pt-2 border-t">
                      <Dialog open={isRestartDialogOpen} onOpenChange={setIsRestartDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid="button-restart-work"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reiniciar Trabajo
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Reiniciar Trabajo</DialogTitle>
                          </DialogHeader>
                          <Form {...restartForm}>
                            <form
                              onSubmit={restartForm.handleSubmit((data) => restartWorkMutation.mutate(data))}
                              className="space-y-4"
                            >
                              <FormField
                                control={restartForm.control}
                                name="reason"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Razon del Reinicio</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        placeholder="Describa por que se debe reiniciar el trabajo..."
                                        {...field}
                                        data-testid="input-restart-reason"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={restartForm.control}
                                name="committedCompletionAt"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nueva Fecha Comprometida</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="date"
                                        {...field}
                                        data-testid="input-restart-date"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setIsRestartDialogOpen(false)}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={restartWorkMutation.isPending}
                                  data-testid="button-confirm-restart"
                                >
                                  {restartWorkMutation.isPending ? "Reiniciando..." : "Confirmar Reinicio"}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Work History Timeline */}
            {workHistory && workHistory.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Historial de Trabajo ({workHistory.length} ciclo{workHistory.length > 1 ? "s" : ""})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {workHistory.map((cycle, index) => (
                    <div key={cycle.id} className="border-l-2 border-border pl-4 py-2 space-y-2" data-testid={`work-cycle-${cycle.cycleNumber}`}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Ciclo {cycle.cycleNumber}</Badge>
                        {cycle.restartedAt && (
                          <span className="text-xs text-muted-foreground">
                            Reiniciado el {format(new Date(cycle.restartedAt), "dd MMM yyyy", { locale: es })}
                          </span>
                        )}
                      </div>
                      
                      {cycle.restartReason && (
                        <div className="text-sm bg-muted/50 p-2 rounded">
                          <span className="text-muted-foreground">Razon: </span>
                          <span>{cycle.restartReason}</span>
                        </div>
                      )}
                      
                      {cycle.committedCompletionAt && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Fecha comprometida: </span>
                          <span>{format(new Date(cycle.committedCompletionAt), "dd MMM yyyy", { locale: es })}</span>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        {cycle.startedAt && (
                          <div>Inicio: {format(new Date(cycle.startedAt), "dd/MM/yy HH:mm", { locale: es })}</div>
                        )}
                        {cycle.completedAt && (
                          <div>Completado: {format(new Date(cycle.completedAt), "dd/MM/yy HH:mm", { locale: es })}</div>
                        )}
                        {cycle.closedAt && (
                          <div>Cerrado: {format(new Date(cycle.closedAt), "dd/MM/yy HH:mm", { locale: es })}</div>
                        )}
                        {canSeeCosts && cycle.invoiceAmount && (
                          <div>Monto: {formatCurrency(cycle.invoiceAmount)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="cotizaciones" className="px-4 mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {quotes?.length || 0} cotizacion(es)
              </p>
              <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-quote">
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Nueva Cotizacion</DialogTitle>
                  </DialogHeader>
                  <Form {...quoteForm}>
                    <form
                      onSubmit={quoteForm.handleSubmit((data) => createQuoteMutation.mutate(data))}
                      className="space-y-4"
                    >
                      {availableMaintainers.length > 0 && (
                        <div className="space-y-2">
                          <Label>Seleccionar Proveedor (opcional)</Label>
                          <Select onValueChange={handleMaintainerSelect}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar proveedor..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableMaintainers.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.companyName}
                                  {m.isPreferred && " (Preferido)"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <FormField
                        control={quoteForm.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre Empresa *</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-quote-company" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={quoteForm.control}
                        name="amountNet"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Monto Neto (CLP) *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                data-testid="input-quote-amount"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={quoteForm.control}
                        name="durationDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duracion (dias)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                data-testid="input-quote-duration"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={quoteForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descripcion</FormLabel>
                            <FormControl>
                              <Textarea {...field} data-testid="textarea-quote-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setIsQuoteDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1"
                          disabled={createQuoteMutation.isPending}
                          data-testid="button-save-quote"
                        >
                          {createQuoteMutation.isPending ? "Guardando..." : "Guardar"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {quotesLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : quotes?.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hay cotizaciones</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Agrega cotizaciones para comparar precios
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedQuotes?.map((quote, index) => {
                  const ivaRate = parseFloat(quote.ivaRate || "19");
                  const amountNet = parseFloat(quote.amountNet);
                  const amountTotal = amountNet * (1 + ivaRate / 100);
                  const isApproved = quote.status === "aceptada";
                  const isCheapest = index === 0;

                  return (
                    <Card
                      key={quote.id}
                      className={`${isApproved ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : ""}`}
                      data-testid={`card-quote-${quote.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{quote.companyName}</p>
                              {isCheapest && !isApproved && (
                                <Badge variant="secondary" className="text-xs">
                                  <Star className="h-3 w-3 mr-1" />
                                  Mas economica
                                </Badge>
                              )}
                              {isApproved && (
                                <Badge className="bg-green-500 text-white text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  Aprobada
                                </Badge>
                              )}
                            </div>
                            {quote.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {quote.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm">
                              {canSeeCosts && (
                                <>
                                  <div>
                                    <span className="text-muted-foreground">Neto: </span>
                                    <span className="font-medium">{formatCurrency(amountNet)}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Total: </span>
                                    <span className="font-semibold">{formatCurrency(amountTotal)}</span>
                                  </div>
                                </>
                              )}
                              {quote.durationDays && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {quote.durationDays} dias
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                              {quote.attachmentKey ? (
                                <>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground flex-1">
                                    <FileIcon className="h-4 w-4" />
                                    <span>Documento adjunto</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = quote.attachmentKey!;
                                      link.download = 'cotizacion';
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }}
                                    data-testid={`button-download-quote-doc-${quote.id}`}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => updateQuoteAttachmentMutation.mutate({ quoteId: quote.id, attachmentKey: null })}
                                    disabled={updateQuoteAttachmentMutation.isPending}
                                    data-testid={`button-delete-quote-doc-${quote.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <ObjectUploader
                                  maxNumberOfFiles={1}
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
                                    const uploaded = result.successful || [];
                                    if (uploaded.length > 0) {
                                      const objectPath = (uploaded[0].meta as Record<string, unknown>).objectPath as string;
                                      if (objectPath) {
                                        updateQuoteAttachmentMutation.mutate({ quoteId: quote.id, attachmentKey: objectPath });
                                      }
                                    }
                                  }}
                                >
                                  <Paperclip className="h-4 w-4 mr-1" />
                                  Adjuntar Documento
                                </ObjectUploader>
                              )}
                            </div>
                          </div>
                          {isManager && !isApproved && !hasApprovedQuote && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveQuoteMutation.mutate(quote.id)}
                              disabled={approveQuoteMutation.isPending}
                              data-testid={`button-approve-quote-${quote.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Aprobar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="fotos" className="px-4 mt-4 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-medium">Fotos del Ticket</h3>
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
                  const uploaded = result.successful || [];
                  for (const file of uploaded) {
                    const objectPath = (file.meta as Record<string, unknown>).objectPath as string;
                    if (objectPath) {
                      uploadPhotoMutation.mutate({
                        objectPath,
                        description: file.name,
                        photoType: "trabajo",
                      });
                    }
                  }
                }}
              >
                <Camera className="h-4 w-4 mr-2" />
                Subir Fotos
              </ObjectUploader>
            </div>

            {photosLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="aspect-square rounded-md" />
                ))}
              </div>
            ) : photos && photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative group rounded-md overflow-hidden border"
                    data-testid={`photo-${photo.id}`}
                  >
                    <img
                      src={photo.objectStorageKey}
                      alt={photo.description || "Foto del ticket"}
                      className="aspect-square object-cover w-full"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = photo.objectStorageKey;
                          link.download = photo.description || 'foto';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        data-testid={`download-photo-${photo.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => deletePhotoMutation.mutate(photo.id)}
                        disabled={deletePhotoMutation.isPending}
                        data-testid={`delete-photo-${photo.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {photo.description && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                        {photo.description}
                      </div>
                    )}
                    <Badge
                      variant="secondary"
                      className="absolute top-1 left-1 text-xs"
                    >
                      {photo.photoType === "inicial" ? "Inicial" : 
                       photo.photoType === "trabajo" ? "Trabajo" : 
                       photo.photoType === "final" ? "Final" : photo.photoType}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Image className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hay fotos</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sube fotos del trabajo realizado
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="comunicacion" className="px-4 mt-4">
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Comunicaciones</p>
              <p className="text-sm text-muted-foreground mt-1">
                Funcionalidad de avisos en desarrollo
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
