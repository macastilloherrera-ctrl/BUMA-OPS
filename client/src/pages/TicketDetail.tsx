import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, useSearch } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Building, MaintainerCategory, UserProfile, TicketQuote, TicketPhoto, TicketWorkCycle, TicketCommunication } from "@shared/schema";
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
  DialogDescription,
  DialogFooter,
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
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import {
  ArrowLeft,
  ArrowRightLeft,
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
  CheckCircle,
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
  Send,
  Users,
  UserCheck,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const DEV_USERS_MAP: Record<string, string> = {
  "dev-gerente-general": "Carlos Mendoza",
  "dev-gerente-operaciones": "Roberto Silva",
  "dev-gerente-finanzas": "Ana Torres",
  "dev-ejecutivo-1": "Juan Pérez",
  "dev-ejecutivo-2": "María García",
  "dev-ejecutivo-3": "Pedro Rodríguez",
};

const getUserName = (userId: string | null | undefined): string => {
  if (!userId) return "Desconocido";
  return DEV_USERS_MAP[userId] || userId;
};

interface TicketWithDetails {
  id: string;
  buildingId: string;
  ticketType: "urgencia" | "planificado" | "mantencion";
  categoryId?: string | null;
  maintainerId?: string | null;
  description: string;
  priority: "rojo" | "amarillo" | "verde";
  status: "pendiente" | "en_curso" | "trabajo_completado" | "vencido" | "resuelto" | "reprogramado";
  assignedExecutiveId?: string | null;
  assignedExecutiveName?: string | null;
  requiresMaintainerVisit?: boolean;
  requiresExecutiveVisit?: boolean;
  requiresInvoice?: boolean;
  scheduledDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  approvedQuoteId?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  workStartedAt?: string | null;
  workCompletedAt?: string | null;
  invoiceNumber?: string | null;
  invoiceAmount?: string | null;
  invoiceDocumentKey?: string | null;
  invoiceStatus?: "none" | "pending" | "submitted" | null;
  invoiceNote?: string | null;
  invoiceProvidedById?: string | null;
  closedAt?: string | null;
  closedBy?: string | null;
  createdAt?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  maintainerName?: string | null;
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
  durationDays: z.coerce.number().min(0).optional(),
});

type QuoteForm = z.infer<typeof quoteSchema>;

const closureSchema = z.object({
  invoiceNumber: z.string().optional(),
  invoiceAmount: z.coerce.number().min(0).optional(),
});

type ClosureForm = z.infer<typeof closureSchema>;

const workCompletionSchema = z.object({
  invoiceStatus: z.enum(["submitted", "pending", "none"]),
  invoiceNumber: z.string().optional(),
  invoiceAmount: z.coerce.number().min(0).optional(),
  invoiceNote: z.string().optional(),
}).refine((data) => {
  if (data.invoiceStatus === "none" && (!data.invoiceNote || data.invoiceNote.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Debe indicar por qué no se paga por este trabajo",
  path: ["invoiceNote"],
}).refine((data) => {
  if (data.invoiceStatus === "submitted" && (!data.invoiceNumber || data.invoiceNumber.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "El número de factura es requerido",
  path: ["invoiceNumber"],
}).refine((data) => {
  if (data.invoiceStatus === "submitted" && (!data.invoiceAmount || data.invoiceAmount <= 0)) {
    return false;
  }
  return true;
}, {
  message: "El monto de la factura debe ser mayor a 0",
  path: ["invoiceAmount"],
});

type WorkCompletionForm = z.infer<typeof workCompletionSchema>;

const restartSchema = z.object({
  reason: z.string().min(1, "La razon del reinicio es requerida"),
  committedCompletionAt: z.string().min(1, "La fecha comprometida es requerida"),
});

type RestartForm = z.infer<typeof restartSchema>;

const reassignSchema = z.object({
  assigneeId: z.string().min(1, "Debe seleccionar un responsable"),
  reason: z.string().optional(),
});

type ReassignForm = z.infer<typeof reassignSchema>;

const ticketTypeLabels: Record<string, { label: string; icon: typeof AlertTriangle; color: string }> = {
  urgencia: { label: "Urgencia", icon: AlertTriangle, color: "text-red-500" },
  planificado: { label: "Planificado", icon: CalendarClock, color: "text-blue-500" },
  mantencion: { label: "Mantención", icon: Wrench, color: "text-green-500" },
};

export default function TicketDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  
  const params = new URLSearchParams(searchString);
  const fromDashboard = params.get("from") === "dashboard";
  const backUrl = fromDashboard ? "/dashboard/tickets" : "/tickets";
  
  const [activeTab, setActiveTab] = useState("detalles");
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [isClosureDialogOpen, setIsClosureDialogOpen] = useState(false);
  const [closeWithInvoice, setCloseWithInvoice] = useState(false);
  const [isRestartDialogOpen, setIsRestartDialogOpen] = useState(false);
  const [isWorkCompletionDialogOpen, setIsWorkCompletionDialogOpen] = useState(false);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [workCompletionInvoiceKey, setWorkCompletionInvoiceKey] = useState<string | null>(null);
  const [workCompletionInvoiceName, setWorkCompletionInvoiceName] = useState<string | null>(null);
  const pendingWorkCompletionKeyRef = useRef<{ key: string; name: string } | null>(null);
  const [quoteAttachmentKey, setQuoteAttachmentKey] = useState<string | null>(null);
  const [quoteAttachmentName, setQuoteAttachmentName] = useState<string | null>(null);
  const [invoiceDocumentKey, setInvoiceDocumentKey] = useState<string | null>(null);
  const [invoiceDocumentName, setInvoiceDocumentName] = useState<string | null>(null);
  const pendingInvoiceKeyRef = useRef<{ key: string; name: string } | null>(null);

  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
  });

  const isManager = userProfile?.role ? ["gerente_general", "gerente_operaciones", "gerente_comercial", "gerente_finanzas"].includes(userProfile.role) : false;
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

  interface AssignmentHistoryEntry {
    id: string;
    ticketId: string;
    assignedToId: string;
    assignedById: string;
    assignedToRole: string;
    previousAssigneeId: string | null;
    reason: string | null;
    isEscalation: boolean;
    createdAt: string;
    assignedToName: string;
    assignedByName: string;
    previousAssigneeName: string | null;
  }

  const { data: assignmentHistory } = useQuery<AssignmentHistoryEntry[]>({
    queryKey: ["/api/tickets", id, "assignment-history"],
    enabled: !!id,
  });

  const { data: communications, isLoading: communicationsLoading } = useQuery<TicketCommunication[]>({
    queryKey: ["/api/tickets", id, "communications"],
    enabled: !!id,
  });

  interface AssignableUser {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  }

  const { data: assignableUsers } = useQuery<AssignableUser[]>({
    queryKey: ["/api/users/assignable"],
  });

  const [avisoAudience, setAvisoAudience] = useState<"comunidad" | "conserjeria" | "comite">("comunidad");
  const [avisoSubject, setAvisoSubject] = useState("");
  const [avisoProblemDescription, setAvisoProblemDescription] = useState("");
  const [avisoActionPlan, setAvisoActionPlan] = useState("");
  const [editingAvisoId, setEditingAvisoId] = useState<string | null>(null);
  const [showAvisoForm, setShowAvisoForm] = useState(false);

  const createAvisoMutation = useMutation({
    mutationFn: async (data: { audience: string; communityName: string; subject: string; problemDescription: string; actionPlan: string }) => {
      return apiRequest("POST", `/api/tickets/${id}/communications`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id, "communications"] });
      resetAvisoForm();
      toast({ title: "Aviso creado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear aviso", variant: "destructive" });
    },
  });

  const updateAvisoMutation = useMutation({
    mutationFn: async ({ commId, data }: { commId: string; data: { subject: string; problemDescription: string; actionPlan: string } }) => {
      return apiRequest("PATCH", `/api/tickets/${id}/communications/${commId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id, "communications"] });
      resetAvisoForm();
      toast({ title: "Aviso actualizado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar aviso", variant: "destructive" });
    },
  });

  const resetAvisoForm = () => {
    setAvisoSubject("");
    setAvisoProblemDescription("");
    setAvisoActionPlan("");
    setEditingAvisoId(null);
    setShowAvisoForm(false);
  };

  const handleDownloadAviso = (comm: TicketCommunication) => {
    const content = `
=====================================
        AVISO A LA ${comm.audience.toUpperCase()}
=====================================

Comunidad: ${comm.communityName}

Fecha: ${comm.sentAt ? format(new Date(comm.sentAt), "dd 'de' MMMM 'de' yyyy", { locale: es }) : ""}

ASUNTO: ${comm.subject}

DESCRIPCION DEL PROBLEMA:
${comm.problemDescription}

ACCIONES A TOMAR:
${comm.actionPlan}

-------------------------------------
Atentamente,
Equipo BUMA Property Management
=====================================
    `.trim();

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aviso_${comm.audience}_${format(new Date(), "yyyyMMdd_HHmm")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleEditAviso = (comm: TicketCommunication) => {
    setAvisoAudience(comm.audience);
    setAvisoSubject(comm.subject);
    setAvisoProblemDescription(comm.problemDescription);
    setAvisoActionPlan(comm.actionPlan);
    setEditingAvisoId(comm.id);
    setShowAvisoForm(true);
  };

  const restartForm = useForm<RestartForm>({
    resolver: zodResolver(restartSchema),
    defaultValues: {
      reason: "",
      committedCompletionAt: "",
    },
  });

  const reassignForm = useForm<ReassignForm>({
    resolver: zodResolver(reassignSchema),
    defaultValues: {
      assigneeId: "",
      reason: "",
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

  const workCompletionForm = useForm<WorkCompletionForm>({
    resolver: zodResolver(workCompletionSchema),
    defaultValues: {
      invoiceStatus: "submitted",
      invoiceNumber: "",
      invoiceAmount: 0,
      invoiceNote: "",
    },
  });

  const createQuoteMutation = useMutation({
    mutationFn: async (data: QuoteForm) => {
      const payload: Record<string, unknown> = {
        companyName: data.companyName,
        amountNet: data.amountNet,
        attachmentKey: quoteAttachmentKey,
      };
      if (data.maintainerId && data.maintainerId.trim() !== "") {
        payload.maintainerId = data.maintainerId;
      }
      if (data.description && data.description.trim() !== "") {
        payload.description = data.description;
      }
      if (data.durationDays && data.durationDays > 0) {
        payload.durationDays = data.durationDays;
      }
      return apiRequest("POST", `/api/tickets/${id}/quotes`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id, "quotes"] });
      setIsQuoteDialogOpen(false);
      quoteForm.reset();
      setQuoteAttachmentKey(null);
      setQuoteAttachmentName(null);
      toast({ title: "Cotización agregada" });
    },
    onError: () => {
      toast({ title: "Error al agregar cotización", variant: "destructive" });
    },
  });

  const approveQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return apiRequest("PATCH", `/api/tickets/${id}/quotes/${quoteId}`, { status: "aceptada" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id, "quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id] });
      toast({ title: "Cotización aprobada" });
    },
    onError: () => {
      toast({ title: "Error al aprobar cotización", variant: "destructive" });
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
    mutationFn: async (invoiceData: WorkCompletionForm & { invoiceDocumentKey?: string }) => {
      const payload: Record<string, unknown> = {
        status: "trabajo_completado",
        workCompletedAt: new Date().toISOString(),
        invoiceStatus: invoiceData.invoiceStatus,
        invoiceProvidedById: userProfile?.userId,
      };
      
      if (invoiceData.invoiceStatus === "submitted") {
        if (invoiceData.invoiceNumber) {
          payload.invoiceNumber = invoiceData.invoiceNumber;
        }
        if (invoiceData.invoiceAmount && invoiceData.invoiceAmount > 0) {
          payload.invoiceAmount = String(invoiceData.invoiceAmount);
        }
        if (invoiceData.invoiceDocumentKey) {
          payload.invoiceDocumentKey = invoiceData.invoiceDocumentKey;
        }
      } else if (invoiceData.invoiceStatus === "none") {
        payload.invoiceNote = invoiceData.invoiceNote;
      }
      
      return apiRequest("PATCH", `/api/tickets/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setIsWorkCompletionDialogOpen(false);
      workCompletionForm.reset();
      setWorkCompletionInvoiceKey(null);
      setWorkCompletionInvoiceName(null);
      toast({ title: "Trabajo completado" });
    },
    onError: () => {
      toast({ title: "Error al completar trabajo", variant: "destructive" });
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: async (data: ClosureForm) => {
      const payload: Record<string, unknown> = {
        status: "resuelto",
        closedAt: new Date().toISOString(),
        closedBy: userProfile?.userId,
      };
      
      if (closeWithInvoice) {
        payload.invoiceNumber = data.invoiceNumber || null;
        payload.invoiceAmount = data.invoiceAmount ? String(data.invoiceAmount) : null;
        payload.invoiceDocumentKey = invoiceDocumentKey || null;
      }
      
      return apiRequest("PATCH", `/api/tickets/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setIsClosureDialogOpen(false);
      setCloseWithInvoice(false);
      closureForm.reset();
      setInvoiceDocumentKey(null);
      setInvoiceDocumentName(null);
      toast({ title: "Ticket cerrado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al cerrar ticket", variant: "destructive" });
    },
  });

  const updateInvoiceDocMutation = useMutation({
    mutationFn: async (data: { invoiceDocumentKey: string | null }) => {
      return apiRequest("PATCH", `/api/tickets/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Documento de factura actualizado" });
    },
    onError: () => {
      toast({ title: "Error al actualizar documento", variant: "destructive" });
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

  const reassignMutation = useMutation({
    mutationFn: async (data: ReassignForm) => {
      return apiRequest("POST", `/api/tickets/${id}/reassign`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", id, "assignment-history"] });
      setIsReassignDialogOpen(false);
      reassignForm.reset();
      toast({ title: "Ticket derivado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al derivar ticket", variant: "destructive" });
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
        <Button variant="outline" className="mt-4" onClick={() => navigate(backUrl)}>
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
          <Button variant="ghost" size="icon" onClick={() => navigate(backUrl)}>
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
            <StatusBadge 
              status={ticket.status} 
              type="ticket"
              invoiceNumber={ticket.invoiceNumber}
              invoiceAmount={ticket.invoiceAmount}
              invoiceDocumentKey={ticket.invoiceDocumentKey}
            />
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
            {/* Derivation Banner - show when ticket was recently derived */}
            {assignmentHistory && assignmentHistory.length > 1 && (() => {
              const lastDerivation = assignmentHistory[0];
              const isRecentDerivation = lastDerivation && !lastDerivation.isEscalation && lastDerivation.previousAssigneeId;
              if (!isRecentDerivation) return null;
              return (
                <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-full">
                        <ArrowRightLeft className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-amber-800 dark:text-amber-200">Ticket Derivado</span>
                          <Badge variant="secondary" className="text-xs">
                            {lastDerivation.previousAssigneeName} → {lastDerivation.assignedToName}
                          </Badge>
                        </div>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          <span className="font-medium">Motivo: </span>
                          {lastDerivation.reason}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Derivado por {lastDerivation.assignedByName} el {format(new Date(lastDerivation.createdAt), "dd MMM yyyy - HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Información del Ticket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Descripción</p>
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
                        Categoría
                      </p>
                      <p className="text-sm font-medium">{getCategoryName(ticket.categoryId)}</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      Ejecutivo Asignado
                    </p>
                    <p className="text-sm font-medium" data-testid="text-assigned-executive">
                      {ticket.assignedExecutiveName || getUserName(ticket.assignedExecutiveId) || "Sin asignar"}
                    </p>
                  </div>

                  {ticket.requiresMaintainerVisit && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        Proveedor Asignado
                      </p>
                      <p className="text-sm font-medium" data-testid="text-assigned-maintainer">
                        {ticket.maintainerName || (ticket.maintainerId ? maintainers?.find(m => m.id === ticket.maintainerId)?.companyName || "No identificado" : "Sin asignar")}
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

                  {ticket.createdByName && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Creado por</p>
                      <p className="text-sm font-medium">{ticket.createdByName}</p>
                    </div>
                  )}

                  {ticket.endDate && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Fecha Vencimiento
                      </p>
                      <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                        {(() => {
                          const dateStr = ticket.endDate.split('T')[0];
                          const [year, month, day] = dateStr.split('-').map(Number);
                          return format(new Date(year, month - 1, day), "dd MMM yyyy", { locale: es });
                        })()}
                      </p>
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
                      <UserCheck className="h-3 w-3 mr-1" />
                      Requiere supervisión ejecutivo
                    </Badge>
                  )}
                  {ticket.requiresInvoice && (
                    <Badge variant="outline" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      Requiere factura
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Closure Summary Section - shows when ticket is closed or work completed */}
            {(ticket.status === "resuelto" || ticket.status === "trabajo_completado") && (
              <Card className="border-green-200 bg-green-50/30 dark:bg-green-950/20 dark:border-green-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    Resumen de Cierre
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    {ticket.closedBy && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Cerrado por</p>
                        <p className="text-sm font-medium">{getUserName(ticket.closedBy)}</p>
                      </div>
                    )}
                    {ticket.closedAt && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Fecha de Cierre</p>
                        <p className="text-sm font-medium">
                          {format(new Date(ticket.closedAt), "dd MMM yyyy HH:mm", { locale: es })}
                        </p>
                      </div>
                    )}
                    {ticket.workCompletedAt && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Trabajo Completado</p>
                        <p className="text-sm font-medium">
                          {format(new Date(ticket.workCompletedAt), "dd MMM yyyy HH:mm", { locale: es })}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Show closure reason when no invoice */}
                  {ticket.invoiceStatus === "none" && ticket.invoiceNote && (
                    <div className="pt-3 border-t border-green-200 dark:border-green-800">
                      <p className="text-sm text-muted-foreground mb-1">Motivo (sin factura)</p>
                      <p className="text-sm bg-white dark:bg-background p-2 rounded border">
                        {ticket.invoiceNote}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Invoice Information Section - only show when there's invoice data */}
            {(ticket.invoiceStatus === "submitted" || ticket.invoiceStatus === "pending") && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Facturación
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ticket.invoiceStatus === "submitted" && (ticket.invoiceNumber || ticket.invoiceAmount) ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Con Factura
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {ticket.invoiceNumber && (
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">N° Factura</p>
                            <p className="text-sm font-medium">{ticket.invoiceNumber}</p>
                          </div>
                        )}
                        {ticket.invoiceAmount && (
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Monto</p>
                            <p className="text-sm font-medium">{formatCurrency(ticket.invoiceAmount)}</p>
                          </div>
                        )}
                      </div>
                      {ticket.invoiceDocumentKey && (
                        <div className="pt-2 border-t">
                          <a
                            href={`/objects/${ticket.invoiceDocumentKey}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                            data-testid="link-download-invoice"
                          >
                            <Download className="h-4 w-4" />
                            Descargar Factura
                          </a>
                        </div>
                      )}
                    </div>
                  ) : ticket.invoiceStatus === "pending" ? (
                    <div className="space-y-2">
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        Factura Pendiente
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        La factura será proporcionada más adelante.
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}

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
                    {(ticket.status === "pendiente" || ticket.status === "en_curso") && (
                      <Dialog open={isReassignDialogOpen} onOpenChange={setIsReassignDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid="button-reassign"
                          >
                            <Users className="h-4 w-4 mr-1" />
                            Derivar
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Derivar Ticket</DialogTitle>
                            <DialogDescription>
                              Asigna este ticket a otro ejecutivo o gerente.
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...reassignForm}>
                            <form
                              onSubmit={reassignForm.handleSubmit((data) => reassignMutation.mutate(data))}
                              className="space-y-4"
                            >
                              <FormField
                                control={reassignForm.control}
                                name="assigneeId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nuevo Responsable</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-reassign-user">
                                          <SelectValue placeholder="Seleccionar usuario..." />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {assignableUsers?.filter((u) => u.id !== userProfile?.userId).map((user) => (
                                          <SelectItem key={user.id} value={user.id} data-testid={`option-reassign-${user.id}`}>
                                            {user.firstName} {user.lastName} ({user.role === "gerente_general" ? "Gerente General" : user.role === "gerente_operaciones" ? "Gerente Operaciones" : "Ejecutivo"})
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={reassignForm.control}
                                name="reason"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Motivo (opcional)</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        placeholder="Describe el motivo de la derivación..."
                                        {...field}
                                        data-testid="textarea-reassign-reason"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <DialogFooter>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setIsReassignDialogOpen(false)}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={reassignMutation.isPending}
                                  data-testid="button-confirm-reassign"
                                >
                                  Derivar
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    )}
                    {ticket.workStartedAt && !ticket.workCompletedAt && (
                      <Dialog open={isWorkCompletionDialogOpen} onOpenChange={setIsWorkCompletionDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="secondary"
                            data-testid="button-complete-work"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Marcar Completado
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Completar Trabajo</DialogTitle>
                            <DialogDescription>
                              Indica el estado de la facturación para este trabajo.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2 rounded-md bg-muted p-3">
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Ticket:</span>
                              <span className="text-sm font-medium" data-testid="text-completion-ticket-id">{ticket.id.substring(0, 8).toUpperCase()}</span>
                            </div>
                            {(ticket.maintainerName || ticket.maintainerId) && (
                              <div className="flex items-center gap-2">
                                <Wrench className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Proveedor:</span>
                                <span className="text-sm font-medium" data-testid="text-completion-vendor">
                                  {ticket.maintainerName || maintainers?.find(m => m.id === ticket.maintainerId)?.companyName || "No identificado"}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Edificio:</span>
                              <span className="text-sm font-medium" data-testid="text-completion-building">{ticket.building?.name || "—"}</span>
                            </div>
                          </div>
                          <Form {...workCompletionForm}>
                            <form
                              onSubmit={workCompletionForm.handleSubmit((data) => 
                                completeWorkMutation.mutate({ ...data, invoiceDocumentKey: workCompletionInvoiceKey || undefined })
                              )}
                              className="space-y-4"
                            >
                              <FormField
                                control={workCompletionForm.control}
                                name="invoiceStatus"
                                render={({ field }) => (
                                  <FormItem className="space-y-3">
                                    <FormLabel>Estado de Factura</FormLabel>
                                    <FormControl>
                                      <RadioGroup
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        className="flex flex-col space-y-2"
                                      >
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="submitted" id="invoice-submitted" />
                                          <Label htmlFor="invoice-submitted" className="font-normal cursor-pointer">
                                            Con factura (tengo los datos)
                                          </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="pending" id="invoice-pending" />
                                          <Label htmlFor="invoice-pending" className="font-normal cursor-pointer">
                                            Factura pendiente (se proporcionará después)
                                          </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="none" id="invoice-none" />
                                          <Label htmlFor="invoice-none" className="font-normal cursor-pointer">
                                            Sin factura
                                          </Label>
                                        </div>
                                      </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {workCompletionForm.watch("invoiceStatus") === "submitted" && (
                                <>
                                  <FormField
                                    control={workCompletionForm.control}
                                    name="invoiceNumber"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Número de Factura</FormLabel>
                                        <FormControl>
                                          <Input {...field} data-testid="input-work-invoice-number" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={workCompletionForm.control}
                                    name="invoiceAmount"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Monto Factura ($)</FormLabel>
                                        <FormControl>
                                          <Input type="number" {...field} data-testid="input-work-invoice-amount" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <div className="space-y-2">
                                    <Label>Documento de Factura (opcional)</Label>
                                    {!workCompletionInvoiceKey ? (
                                      <ObjectUploader
                                        onGetUploadParameters={async (file) => {
                                          const response = await fetch("/api/uploads/request-url", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                              name: file.name,
                                              contentType: file.type,
                                            }),
                                          });
                                          const data = await response.json();
                                          const objectKey = data.objectPath?.replace("/objects/", "") || data.objectKey;
                                          pendingWorkCompletionKeyRef.current = { key: objectKey, name: file.name || "documento" };
                                          return { method: "PUT" as const, url: data.uploadURL };
                                        }}
                                        onComplete={(result) => {
                                          if (result.successful && result.successful.length > 0 && pendingWorkCompletionKeyRef.current) {
                                            setWorkCompletionInvoiceKey(pendingWorkCompletionKeyRef.current.key);
                                            setWorkCompletionInvoiceName(pendingWorkCompletionKeyRef.current.name);
                                            pendingWorkCompletionKeyRef.current = null;
                                          }
                                        }}
                                      >
                                        Adjuntar Factura
                                      </ObjectUploader>
                                    ) : (
                                      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                        <FileText className="h-4 w-4" />
                                        <span className="text-sm flex-1 truncate">{workCompletionInvoiceName}</span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setWorkCompletionInvoiceKey(null);
                                            setWorkCompletionInvoiceName(null);
                                          }}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}

                              {workCompletionForm.watch("invoiceStatus") === "none" && (
                                <FormField
                                  control={workCompletionForm.control}
                                  name="invoiceNote"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Observación (¿Por qué no se paga por este trabajo?)</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Ej: Trabajo realizado en garantía, servicio gratuito, etc."
                                          {...field}
                                          data-testid="input-invoice-note"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}

                              <DialogFooter>
                                <Button
                                  type="submit"
                                  disabled={completeWorkMutation.isPending}
                                  data-testid="button-submit-work-completion"
                                >
                                  {completeWorkMutation.isPending ? "Completando..." : "Completar Trabajo"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    )}
                    {isManager && (ticket.status === "trabajo_completado" || ticket.workCompletedAt) && (
                      <Dialog open={isClosureDialogOpen} onOpenChange={(open) => {
                        setIsClosureDialogOpen(open);
                        if (!open) {
                          setCloseWithInvoice(false);
                          closureForm.reset();
                        }
                      }}>
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
                          
                          {/* Show invoice info from executive if available */}
                          {ticket.invoiceStatus === "submitted" && (ticket.invoiceNumber || ticket.invoiceAmount) && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-md space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                  Con Factura
                                </Badge>
                                <span className="text-sm text-muted-foreground">Datos proporcionados por ejecutivo</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {ticket.invoiceNumber && (
                                  <div>
                                    <span className="text-muted-foreground">N° Factura: </span>
                                    <span className="font-medium">{ticket.invoiceNumber}</span>
                                  </div>
                                )}
                                {ticket.invoiceAmount && (
                                  <div>
                                    <span className="text-muted-foreground">Monto: </span>
                                    <span className="font-medium">{formatCurrency(ticket.invoiceAmount)}</span>
                                  </div>
                                )}
                              </div>
                              {ticket.invoiceDocumentKey && (
                                <a
                                  href={`/objects/${ticket.invoiceDocumentKey}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                  <Download className="h-3 w-3" />
                                  Descargar Factura
                                </a>
                              )}
                            </div>
                          )}

                          {ticket.invoiceStatus === "pending" && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                                  Factura Pendiente
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                El ejecutivo indicó que la factura será proporcionada más adelante.
                                Al cerrar sin factura, el ticket quedará como "resuelto sin factura asociada".
                              </p>
                            </div>
                          )}

                          {ticket.invoiceStatus === "none" && ticket.invoiceNote && (
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-muted-foreground">
                                  Sin Factura
                                </Badge>
                              </div>
                              <p className="text-sm mt-2">
                                <span className="text-muted-foreground">Observación: </span>
                                <span>{ticket.invoiceNote}</span>
                              </p>
                            </div>
                          )}

                          <Form {...closureForm}>
                            <form
                              onSubmit={closureForm.handleSubmit((data) => closeTicketMutation.mutate(data))}
                              className="space-y-4"
                            >
                              {/* Only show invoice form if executive didn't submit invoice data */}
                              {ticket.invoiceStatus !== "submitted" && (
                                <>
                                  <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                                    <div className="space-y-0.5">
                                      <Label className="text-base">Agregar factura ahora</Label>
                                      <p className="text-sm text-muted-foreground">
                                        Incluir datos de facturación al cerrar
                                      </p>
                                    </div>
                                    <Switch
                                      checked={closeWithInvoice}
                                      onCheckedChange={(checked) => {
                                        setCloseWithInvoice(checked);
                                        if (!checked) {
                                          closureForm.setValue("invoiceNumber", "");
                                          closureForm.setValue("invoiceAmount", 0);
                                          setInvoiceDocumentKey(null);
                                          setInvoiceDocumentName(null);
                                        }
                                      }}
                                      data-testid="switch-close-with-invoice"
                                    />
                                  </div>
                                  
                                  {closeWithInvoice && (
                                    <>
                                      <FormField
                                        control={closureForm.control}
                                        name="invoiceNumber"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Número de Factura</FormLabel>
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
                                            <FormLabel>Monto Factura ($)</FormLabel>
                                            <FormControl>
                                              <Input type="number" {...field} data-testid="input-invoice-amount" />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <div className="space-y-2">
                                        <Label>Documento de Factura (opcional)</Label>
                                        {!invoiceDocumentKey ? (
                                          <ObjectUploader
                                            onGetUploadParameters={async (file) => {
                                              const response = await fetch("/api/uploads/request-url", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                  name: file.name,
                                                  contentType: file.type,
                                                }),
                                              });
                                              const data = await response.json();
                                              const objectKey = data.objectPath?.replace("/objects/", "") || data.objectKey;
                                              pendingInvoiceKeyRef.current = { key: objectKey, name: file.name || "documento" };
                                              return { method: "PUT" as const, url: data.uploadURL };
                                            }}
                                            onComplete={(result) => {
                                              if (result.successful && result.successful.length > 0 && pendingInvoiceKeyRef.current) {
                                                setInvoiceDocumentKey(pendingInvoiceKeyRef.current.key);
                                                setInvoiceDocumentName(pendingInvoiceKeyRef.current.name);
                                                pendingInvoiceKeyRef.current = null;
                                              }
                                            }}
                                          >
                                            Adjuntar Factura
                                          </ObjectUploader>
                                        ) : (
                                          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                            <FileIcon className="h-4 w-4" />
                                            <span className="text-sm flex-1 truncate">{invoiceDocumentName}</span>
                                            <Button
                                              type="button"
                                              size="icon"
                                              variant="ghost"
                                              onClick={() => {
                                                setInvoiceDocumentKey(null);
                                                setInvoiceDocumentName(null);
                                              }}
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
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
                  {canSeeCosts && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Documento de Factura</Label>
                      {ticket.invoiceDocumentKey ? (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <Paperclip className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm flex-1 truncate">Factura adjunta</span>
                          <a
                            href={`/objects/${ticket.invoiceDocumentKey}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid="button-download-invoice"
                          >
                            <Button size="icon" variant="ghost" type="button">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                          {isManager && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm("¿Eliminar el documento de factura?")) {
                                  updateInvoiceDocMutation.mutate({ invoiceDocumentKey: null });
                                }
                              }}
                              disabled={updateInvoiceDocMutation.isPending}
                              data-testid="button-delete-invoice"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ) : isManager ? (
                        <ObjectUploader
                          onGetUploadParameters={async (file) => {
                            const response = await fetch("/api/uploads/request-url", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                name: file.name,
                                contentType: file.type,
                              }),
                            });
                            const data = await response.json();
                            const objectKey = data.objectPath?.replace("/objects/", "") || data.objectKey;
                            pendingInvoiceKeyRef.current = { key: objectKey, name: file.name || "documento" };
                            return { method: "PUT" as const, url: data.uploadURL };
                          }}
                          onComplete={(result) => {
                            if (result.successful && result.successful.length > 0 && pendingInvoiceKeyRef.current) {
                              updateInvoiceDocMutation.mutate({ invoiceDocumentKey: pendingInvoiceKeyRef.current.key });
                              pendingInvoiceKeyRef.current = null;
                            }
                          }}
                        >
                          Adjuntar Factura
                        </ObjectUploader>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin documento adjunto</p>
                      )}
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
                    <RotateCcw className="h-4 w-4" />
                    Intentos Anteriores ({workHistory.length})
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Este ticket fue reiniciado. A continuacion se muestran los trabajos anteriores que no fueron satisfactorios.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {workHistory.map((cycle, index) => (
                    <div key={cycle.id} className="border rounded-md p-3 space-y-3 bg-muted/30" data-testid={`work-cycle-${cycle.cycleNumber}`}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <Badge variant="secondary">Intento {cycle.cycleNumber}</Badge>
                        <Badge variant="outline" className="text-destructive border-destructive/50">
                          Requirio Reinicio
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="font-medium">Trabajo realizado:</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground pl-2">
                          {cycle.startedAt && (
                            <div>Inicio: {format(new Date(cycle.startedAt), "dd/MM/yy HH:mm", { locale: es })}</div>
                          )}
                          {cycle.completedAt && (
                            <div>Completado: {format(new Date(cycle.completedAt), "dd/MM/yy HH:mm", { locale: es })}</div>
                          )}
                          {cycle.closedAt && (
                            <div>Cerrado: {format(new Date(cycle.closedAt), "dd/MM/yy HH:mm", { locale: es })}</div>
                          )}
                          {canSeeCosts && cycle.invoiceAmount && Number(cycle.invoiceAmount) > 0 && (
                            <div>Monto facturado: {formatCurrency(cycle.invoiceAmount)}</div>
                          )}
                        </div>
                      </div>
                      
                      {cycle.restartedAt && (
                        <div className="border-t pt-3 space-y-2">
                          <div className="font-medium text-sm flex items-center gap-2">
                            <RotateCcw className="h-3 w-3" />
                            Reiniciado el {format(new Date(cycle.restartedAt), "dd MMM yyyy", { locale: es })}
                          </div>
                          
                          {cycle.restartReason && (
                            <div className="text-sm bg-destructive/10 border border-destructive/20 p-2 rounded">
                              <span className="font-medium">Motivo del reinicio: </span>
                              <span>{cycle.restartReason}</span>
                            </div>
                          )}
                          
                          {cycle.committedCompletionAt && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Nueva fecha comprometida: </span>
                              <span className="font-medium">{format(new Date(cycle.committedCompletionAt), "dd MMM yyyy", { locale: es })}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Assignment History */}
            {assignmentHistory && assignmentHistory.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Historial de Derivaciones ({assignmentHistory.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {assignmentHistory.slice().reverse().map((entry, index) => (
                      <div key={entry.id} className={`p-3 rounded-lg border ${entry.isEscalation ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/30'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {entry.isEscalation ? (
                              <Badge variant="destructive" className="text-xs">Escalamiento</Badge>
                            ) : index === assignmentHistory.length - 1 ? (
                              <Badge variant="outline" className="text-xs">Asignación Inicial</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Derivación</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.createdAt), "dd MMM yyyy - HH:mm", { locale: es })}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          {entry.previousAssigneeName ? (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">De:</span>
                              <span className="font-medium">{entry.previousAssigneeName}</span>
                              <span className="text-muted-foreground mx-1">→</span>
                              <span className="text-muted-foreground">A:</span>
                              <span className="font-medium text-primary">{entry.assignedToName}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Asignado a:</span>
                              <span className="font-medium text-primary">{entry.assignedToName}</span>
                            </div>
                          )}
                          
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <UserCheck className="h-3 w-3" />
                            Realizado por: {entry.assignedByName}
                          </div>
                          
                          {entry.reason && (
                            <div className="mt-2 p-2 bg-background rounded border text-sm">
                              <span className="text-muted-foreground font-medium">Motivo: </span>
                              <span>{entry.reason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
                    <DialogTitle>Nueva Cotización</DialogTitle>
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
                            <FormLabel>Monto Total (CLP) *</FormLabel>
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
                            <FormLabel>Duración estimada (días)</FormLabel>
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
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                              <Textarea {...field} data-testid="textarea-quote-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2">
                        <Label>Documento de Cotización (opcional)</Label>
                        {quoteAttachmentKey ? (
                          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                            <FileIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm flex-1 truncate">{quoteAttachmentName || "Documento adjunto"}</span>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setQuoteAttachmentKey(null);
                                setQuoteAttachmentName(null);
                              }}
                              data-testid="button-remove-quote-attachment"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <ObjectUploader
                            maxNumberOfFiles={1}
                            maxFileSize={20971520}
                            buttonClassName="w-full"
                            onGetUploadParameters={async (file) => {
                              const res = await fetch("/api/object-storage/presigned-url", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                credentials: "include",
                                body: JSON.stringify({
                                  fileName: file.name,
                                  contentType: file.type,
                                }),
                              });
                              const { uploadURL, objectPath } = await res.json();
                              (file.meta as Record<string, unknown>).objectPath = objectPath;
                              (file.meta as Record<string, unknown>).fileName = file.name;
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
                                const fileName = (uploaded[0].meta as Record<string, unknown>).fileName as string;
                                if (objectPath) {
                                  setQuoteAttachmentKey(objectPath);
                                  setQuoteAttachmentName(fileName);
                                  toast({ title: "Documento subido exitosamente" });
                                }
                              }
                            }}
                          >
                            <Paperclip className="h-4 w-4 mr-2" />
                            Adjuntar Documento
                          </ObjectUploader>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setIsQuoteDialogOpen(false);
                            setQuoteAttachmentKey(null);
                            setQuoteAttachmentName(null);
                          }}
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
                {photos.map((photo) => {
                  const photoUrl = photo.objectStorageKey.startsWith('/objects/') 
                    ? photo.objectStorageKey 
                    : `/objects/${photo.objectStorageKey}`;
                  return (
                    <div
                      key={photo.id}
                      className="relative group rounded-md overflow-hidden border"
                      data-testid={`photo-${photo.id}`}
                    >
                      <img
                        src={photoUrl}
                        alt={photo.description || "Foto del ticket"}
                        className="aspect-square object-cover w-full"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={async () => {
                            try {
                              const response = await fetch(photoUrl);
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = photo.description || 'foto.jpg';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                            } catch (error) {
                              console.error('Error downloading photo:', error);
                            }
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
                  );
                })}
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

          <TabsContent value="comunicacion" className="px-4 mt-4 space-y-4">
            {showAvisoForm ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{editingAvisoId ? "Editar Aviso" : "Crear Aviso"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Dirigido a</Label>
                    <Select 
                      value={avisoAudience} 
                      onValueChange={(v) => setAvisoAudience(v as "comunidad" | "conserjeria" | "comite")}
                      disabled={!!editingAvisoId}
                    >
                      <SelectTrigger data-testid="select-audience">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comunidad">Comunidad</SelectItem>
                        <SelectItem value="conserjeria">Conserjería</SelectItem>
                        <SelectItem value="comite">Comité</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Comunidad</Label>
                    <Input value={ticket?.building?.name || ""} disabled data-testid="input-community-name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Asunto</Label>
                    <Input
                      placeholder="Ej: Corte de agua programado"
                      value={avisoSubject}
                      onChange={(e) => setAvisoSubject(e.target.value)}
                      data-testid="input-aviso-subject"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción del Problema</Label>
                    <Textarea
                      placeholder="Describa el problema o situación..."
                      value={avisoProblemDescription}
                      onChange={(e) => setAvisoProblemDescription(e.target.value)}
                      rows={3}
                      data-testid="input-aviso-problem"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Acciones a Tomar</Label>
                    <Textarea
                      placeholder="Describa las acciones que se tomaran..."
                      value={avisoActionPlan}
                      onChange={(e) => setAvisoActionPlan(e.target.value)}
                      rows={3}
                      data-testid="input-aviso-actions"
                    />
                  </div>
                  <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                    Atentamente,<br />
                    <strong>Equipo BUMA Property Management</strong>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={resetAvisoForm}
                      className="flex-1"
                      data-testid="button-cancel-aviso"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => {
                        if (avisoSubject.trim() && avisoProblemDescription.trim() && avisoActionPlan.trim()) {
                          if (editingAvisoId) {
                            updateAvisoMutation.mutate({
                              commId: editingAvisoId,
                              data: {
                                subject: avisoSubject.trim(),
                                problemDescription: avisoProblemDescription.trim(),
                                actionPlan: avisoActionPlan.trim(),
                              },
                            });
                          } else {
                            createAvisoMutation.mutate({
                              audience: avisoAudience,
                              communityName: ticket?.building?.name || "",
                              subject: avisoSubject.trim(),
                              problemDescription: avisoProblemDescription.trim(),
                              actionPlan: avisoActionPlan.trim(),
                            });
                          }
                        }
                      }}
                      disabled={!avisoSubject.trim() || !avisoProblemDescription.trim() || !avisoActionPlan.trim() || createAvisoMutation.isPending || updateAvisoMutation.isPending}
                      className="flex-1"
                      data-testid="button-save-aviso"
                    >
                      {createAvisoMutation.isPending || updateAvisoMutation.isPending ? "Guardando..." : "Guardar Aviso"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button
                onClick={() => setShowAvisoForm(true)}
                className="w-full"
                data-testid="button-new-aviso"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Nuevo Aviso
              </Button>
            )}

            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground">Avisos Guardados</h3>
              {communicationsLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : communications && communications.length > 0 ? (
                <div className="space-y-3">
                  {communications.map((comm) => (
                    <Card key={comm.id} data-testid={`card-aviso-${comm.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <Badge variant="outline" className="capitalize mb-1">
                              {comm.audience}
                            </Badge>
                            <p className="font-medium text-sm">{comm.subject}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {comm.sentAt && format(new Date(comm.sentAt), "dd MMM yyyy", { locale: es })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{comm.problemDescription}</p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditAviso(comm)}
                            data-testid={`button-edit-aviso-${comm.id}`}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadAviso(comm)}
                            data-testid={`button-download-aviso-${comm.id}`}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Descargar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No hay avisos</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crea avisos para la comunidad, conserjeria o comite
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
