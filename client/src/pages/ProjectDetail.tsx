import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { 
  ArrowLeft, 
  Building2, 
  Calendar, 
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  Pause,
  XCircle,
  AlertCircle,
  FileText,
  Plus,
  Upload,
  Camera,
  Pencil,
  Trash2,
  CalendarCheck,
  RotateCcw,
  ExternalLink,
  Award,
  Download,
  Eye,
  CircleDot,
  ClipboardList,
  MapPin,
  Play
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { 
  Project, 
  ProjectMilestone, 
  ProjectDocument, 
  ProjectUpdate, 
  ProjectVendor,
  Vendor,
  Building,
  UserProfile
} from "@shared/schema";

type ProjectWithDetails = Project & {
  building?: Building;
  milestones: ProjectMilestone[];
  documents: ProjectDocument[];
  updates: ProjectUpdate[];
  vendors: ProjectVendor[];
};

const statusLabels: Record<string, string> = {
  planificado: "Planificado",
  en_ejecucion: "En Ejecución",
  pausado: "Pausado",
  completado: "Completado",
  cancelado: "Cancelado",
};

const milestoneStatusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  en_curso: "En Curso",
  completado: "Completado",
  retrasado: "Retrasado",
};

const documentTypeLabels: Record<string, string> = {
  cotizacion: "Cotización",
  adjudicacion: "Adjudicación",
  contrato: "Contrato",
  comunicado: "Comunicado",
  fiscalizacion: "Fiscalización",
  acta: "Acta",
  cierre: "Cierre",
  otro: "Otro",
};

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(value: string | number | null | undefined): string {
  if (!value) return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  return `$${num.toLocaleString("es-CL")}`;
}

function getTrafficLight(project: Project): "verde" | "amarillo" | "rojo" {
  if (project.status === "completado" || project.status === "cancelado") {
    return "verde";
  }
  const endDate = project.plannedEndDate ? new Date(project.plannedEndDate) : null;
  if (!endDate) return "verde";
  const now = new Date();
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysRemaining < 0) return "rojo";
  if (daysRemaining <= 5) return "rojo";
  if (daysRemaining <= 15) return "amarillo";
  return "verde";
}

function TrafficLightBadge({ color }: { color: "verde" | "amarillo" | "rojo" }) {
  const colors = { verde: "bg-green-500", amarillo: "bg-yellow-500", rojo: "bg-red-500" };
  return <div className={`w-4 h-4 rounded-full ${colors[color]}`} />;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
  });
  
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewDialogType, setReviewDialogType] = useState<"complete" | "not-done" | "ticket">("complete");
  const [selectedReviewMilestone, setSelectedReviewMilestone] = useState<ProjectMilestone | null>(null);
  const [reviewObservations, setReviewObservations] = useState("");
  const [ticketForm, setTicketForm] = useState({
    description: "",
    priority: "amarillo",
    ticketType: "planificado",
  });
  const [addReviewDateDialogOpen, setAddReviewDateDialogOpen] = useState(false);
  const [newReviewDate, setNewReviewDate] = useState("");
  const [startingVisitId, setStartingVisitId] = useState<string | null>(null);

  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState({ vendorName: "", role: "contratista", approvedAmount: "", contactName: "", contactPhone: "", contactEmail: "" });
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [deleteVendorId, setDeleteVendorId] = useState<string | null>(null);

  const [paymentMilestoneDialogOpen, setPaymentMilestoneDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ name: "", paymentPercentage: "", paymentAmount: "", dueDate: "", invoiceVendorId: "", invoiceVendorName: "" });

  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedPaymentMilestone, setSelectedPaymentMilestone] = useState<ProjectMilestone | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({ invoiceStatus: "submitted" as string, invoiceNumber: "", invoiceAmount: "", invoiceDocumentKey: "", invoiceVendorName: "" });

  const { data: project, isLoading } = useQuery<ProjectWithDetails>({
    queryKey: ["/api/projects", id],
  });

  const { data: allVendors } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      return apiRequest("PATCH", `/api/projects/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({ title: "Proyecto actualizado" });
    },
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, data }: { milestoneId: string; data: Partial<ProjectMilestone> }) => {
      return apiRequest("PATCH", `/api/projects/${id}/milestones/${milestoneId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({ title: "Hito actualizado" });
    },
  });

  const startVisitFromProjectMutation = useMutation({
    mutationFn: async (visitId: string) => {
      setStartingVisitId(visitId);
      return apiRequest("PATCH", `/api/visits/${visitId}/start`, {});
    },
    onSuccess: (_, visitId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      setStartingVisitId(null);
      navigate(`/visitas/${visitId}/en-curso`);
    },
    onError: () => {
      setStartingVisitId(null);
      toast({ title: "Error al iniciar visita", variant: "destructive" });
    },
  });

  const addReviewMilestoneMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; dueDate?: string; isReview: boolean }) => {
      const milestoneCount = project?.milestones?.length || 0;
      return apiRequest("POST", `/api/projects/${id}/milestones`, {
        ...data,
        projectId: id,
        orderIndex: milestoneCount,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({ title: "Revisión periódica agregada" });
    },
    onError: () => {
      toast({ title: "Error al agregar revisión", variant: "destructive" });
    },
  });

  const resetMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      return apiRequest("PATCH", `/api/projects/${id}/milestones/${milestoneId}`, {
        status: "pendiente",
        completedAt: null,
        completedBy: null,
        observations: null,
        linkedVisitId: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({ title: "Hito reiniciado" });
    },
  });

  const completeReviewMutation = useMutation({
    mutationFn: async ({ milestoneId, observations }: { milestoneId: string; observations: string }) => {
      return apiRequest("PATCH", `/api/projects/${id}/milestones/${milestoneId}/complete-review`, { observations });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      setReviewDialogOpen(false);
      setSelectedReviewMilestone(null);
      setReviewObservations("");
      toast({ title: "Revisión marcada como realizada" });
    },
    onError: () => {
      toast({ title: "Error al completar revisión", variant: "destructive" });
    },
  });

  const markNotDoneMutation = useMutation({
    mutationFn: async ({ milestoneId, observations }: { milestoneId: string; observations: string }) => {
      return apiRequest("PATCH", `/api/projects/${id}/milestones/${milestoneId}/mark-not-done`, { observations });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      setReviewDialogOpen(false);
      setSelectedReviewMilestone(null);
      setReviewObservations("");
      toast({ title: "Revisión marcada como no realizada" });
    },
    onError: () => {
      toast({ title: "Error al marcar revisión", variant: "destructive" });
    },
  });

  const createTicketFromReviewMutation = useMutation({
    mutationFn: async ({ milestoneId, data }: { milestoneId: string; data: typeof ticketForm }) => {
      return apiRequest("POST", `/api/projects/${id}/milestones/${milestoneId}/create-ticket`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      setReviewDialogOpen(false);
      setSelectedReviewMilestone(null);
      setTicketForm({ description: "", priority: "amarillo", ticketType: "planificado" });
      toast({ title: "Ticket creado desde la revisión" });
    },
    onError: () => {
      toast({ title: "Error al crear ticket", variant: "destructive" });
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (data: { name: string; documentType: string; fileUrl: string; description?: string }) => {
      return apiRequest("POST", `/api/projects/${id}/documents`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({ title: "Documento subido exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al registrar documento", variant: "destructive" });
    },
  });

  const setAdjudicadaMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return apiRequest("PATCH", `/api/projects/${id}/documents/${documentId}/set-adjudicada`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({ title: "Cotización marcada como adjudicada" });
    },
    onError: () => {
      toast({ title: "Error al marcar cotización", variant: "destructive" });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return apiRequest("DELETE", `/api/projects/${id}/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({ title: "Documento eliminado" });
    },
    onError: () => {
      toast({ title: "Error al eliminar documento", variant: "destructive" });
    },
  });

  const addVendorMutation = useMutation({
    mutationFn: async (data: typeof vendorForm) => {
      return apiRequest("POST", `/api/projects/${id}/vendors`, {
        ...data,
        approvedAmount: data.approvedAmount ? parseFloat(data.approvedAmount) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      setVendorDialogOpen(false);
      setVendorForm({ vendorName: "", role: "contratista", approvedAmount: "", contactName: "", contactPhone: "", contactEmail: "" });
      toast({ title: "Proveedor agregado" });
    },
    onError: () => {
      toast({ title: "Error al agregar proveedor", variant: "destructive" });
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      return apiRequest("DELETE", `/api/projects/${id}/vendors/${vendorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      setDeleteVendorId(null);
      toast({ title: "Proveedor eliminado" });
    },
    onError: () => {
      toast({ title: "Error al eliminar proveedor", variant: "destructive" });
    },
  });

  const addPaymentMilestoneMutation = useMutation({
    mutationFn: async (data: typeof paymentForm) => {
      const milestoneCount = project?.milestones?.length || 0;
      return apiRequest("POST", `/api/projects/${id}/milestones`, {
        projectId: id,
        name: data.name,
        isPaymentMilestone: true,
        paymentPercentage: data.paymentPercentage ? parseFloat(data.paymentPercentage) : undefined,
        paymentAmount: data.paymentAmount ? parseFloat(data.paymentAmount) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        invoiceVendorId: data.invoiceVendorId || undefined,
        invoiceVendorName: data.invoiceVendorName || undefined,
        orderIndex: milestoneCount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      setPaymentMilestoneDialogOpen(false);
      setPaymentForm({ name: "", paymentPercentage: "", paymentAmount: "", dueDate: "", invoiceVendorId: "", invoiceVendorName: "" });
      toast({ title: "Hito de pago agregado" });
    },
    onError: () => {
      toast({ title: "Error al agregar hito de pago", variant: "destructive" });
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ milestoneId, data }: { milestoneId: string; data: typeof invoiceForm }) => {
      const payload: Record<string, any> = {
        invoiceStatus: data.invoiceStatus,
        invoiceNumber: data.invoiceNumber || undefined,
        invoiceAmount: data.invoiceAmount ? parseFloat(data.invoiceAmount) : undefined,
        invoiceDocumentKey: data.invoiceDocumentKey || undefined,
        invoiceVendorName: data.invoiceVendorName || undefined,
      };
      if (data.invoiceStatus === "submitted") {
        payload.status = "completado";
      }
      return apiRequest("PATCH", `/api/projects/${id}/milestones/${milestoneId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      setInvoiceDialogOpen(false);
      setSelectedPaymentMilestone(null);
      setInvoiceForm({ invoiceStatus: "submitted", invoiceNumber: "", invoiceAmount: "", invoiceDocumentKey: "", invoiceVendorName: "" });
      toast({ title: "Factura registrada exitosamente" });
    },
    onError: (error: any) => {
      const message = error?.message || "Error al registrar factura";
      toast({ title: message, variant: "destructive" });
    },
  });

  const handleDownloadDocument = async (doc: ProjectDocument) => {
    try {
      const objectPath = doc.fileUrl.startsWith("/objects/") ? doc.fileUrl : `/objects/${doc.fileUrl}`;
      const response = await fetch(objectPath);
      if (!response.ok) throw new Error("Error al descargar");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Error al descargar archivo", variant: "destructive" });
    }
  };

  const isManager = userProfile?.role && ["super_admin", "gerente_general", "gerente_operaciones", "gerente_comercial"].includes(userProfile.role);

  const getNextReviewNumber = () => {
    if (!project) return 1;
    const reviewMilestones = project.milestones.filter(m => (m as any).isReview);
    let maxNum = 0;
    reviewMilestones.forEach(m => {
      const match = m.name.match(/Revisión Periódica (\d+)/);
      if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
    });
    return maxNum + 1;
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Proyecto no encontrado</h3>
            <Button onClick={() => navigate("/proyectos")} className="mt-4">
              Volver a Proyectos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const trafficLight = getTrafficLight(project);
  const completedMilestones = project.milestones.filter(m => m.status === "completado").length;
  const progress = project.milestones.length > 0 
    ? Math.round((completedMilestones / project.milestones.length) * 100) 
    : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/proyectos")} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <TrafficLightBadge color={trafficLight} />
            <h1 className="text-2xl font-bold" data-testid="text-project-name">{project.name}</h1>
            <Badge variant="outline">{statusLabels[project.status]}</Badge>
          </div>
          <p className="text-muted-foreground">{project.building?.name}</p>
        </div>
        {isManager && (
          <Select
            value={project.status}
            onValueChange={(value) => updateProjectMutation.mutate({ status: value as any })}
          >
            <SelectTrigger className="w-48" data-testid="select-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planificado">Planificado</SelectItem>
              <SelectItem value="en_ejecucion">En Ejecución</SelectItem>
              <SelectItem value="pausado">Pausado</SelectItem>
              <SelectItem value="completado">Completado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Fechas</p>
                <p className="font-medium">{formatDate(project.startDate)}</p>
                <p className="text-sm">al {formatDate(project.plannedEndDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Presupuesto</p>
                <p className="font-medium">{formatCurrency(project.approvedBudget)}</p>
                {project.actualCost && (
                  <p className="text-sm">Real: {formatCurrency(project.actualCost)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Contratista</p>
                <p className="font-medium">{project.contractorName || "-"}</p>
                {project.contractorPhone && (
                  <p className="text-sm">{project.contractorPhone}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Avance</p>
                <p className="font-medium">{progress}%</p>
                <p className="text-sm">{completedMilestones}/{project.milestones.length} hitos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {project.description && (
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground">{project.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle>Proveedores del Proyecto</CardTitle>
          {isManager && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setVendorForm({ vendorName: "", role: "contratista", approvedAmount: "", contactName: "", contactPhone: "", contactEmail: "" });
                setVendorSearch("");
                setVendorDialogOpen(true);
              }}
              data-testid="button-add-vendor"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Proveedor
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {(!project.vendors || project.vendors.length === 0) ? (
            <p className="text-muted-foreground text-center py-6">No hay proveedores asignados</p>
          ) : (
            <div className="space-y-3">
              {project.vendors.map((v) => (
                <div key={v.id} className="flex items-center gap-4 p-3 border rounded-lg" data-testid={`vendor-${v.id}`}>
                  <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium" data-testid={`text-vendor-name-${v.id}`}>{v.vendorName}</p>
                      <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
                        {v.role === "contratista" ? "Contratista" : v.role === "ito" ? "ITO" : "Otro"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                      {v.approvedAmount && (
                        <span data-testid={`text-vendor-amount-${v.id}`}>{formatCurrency(v.approvedAmount)}</span>
                      )}
                      {v.contactName && <span>{v.contactName}</span>}
                      {v.contactPhone && <span>{v.contactPhone}</span>}
                    </div>
                  </div>
                  {isManager && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive shrink-0"
                      onClick={() => setDeleteVendorId(v.id)}
                      data-testid={`button-delete-vendor-${v.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="milestones">
        <TabsList>
          <TabsTrigger value="milestones" data-testid="tab-milestones">
            Hitos y Revisiones ({project.milestones.length})
          </TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">
            Cotizaciones y Documentos ({project.documents.length})
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">
            Pagos ({project.milestones.filter(m => m.isPaymentMilestone).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="milestones" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle>Hitos del Proyecto</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setNewReviewDate("");
                  setAddReviewDateDialogOpen(true);
                }}
                data-testid="button-add-review-detail"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Revisión
              </Button>
            </CardHeader>
            <CardContent>
              {project.milestones.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No hay hitos definidos</p>
              ) : (
                (() => {
                  const regularMilestones = project.milestones.filter(m => !(m as any).isReview);
                  const reviewMilestones = project.milestones
                    .filter(m => (m as any).isReview)
                    .sort((a, b) => {
                      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
                      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
                      return dateA - dateB;
                    });

                  const inicioObrasIndex = regularMilestones.findIndex(m =>
                    m.name.toLowerCase().includes("inicio de obras") || m.name.toLowerCase().includes("inicio obra")
                  );
                  const beforeReviews = inicioObrasIndex >= 0 ? regularMilestones.slice(0, inicioObrasIndex + 1) : regularMilestones;
                  const afterReviews = inicioObrasIndex >= 0 ? regularMilestones.slice(inicioObrasIndex + 1) : [];

                  const renderRegularMilestone = (milestone: ProjectMilestone) => (
                    <div 
                      key={milestone.id} 
                      className="flex items-start gap-4 p-4 border rounded-lg"
                      data-testid={`milestone-${milestone.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-medium">{milestone.name}</h4>
                          <Badge 
                            variant={milestone.status === "completado" ? "default" : "outline"}
                            className={
                              milestone.status === "retrasado" ? "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800" :
                              milestone.status === "en_curso" ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800" :
                              ""
                            }
                          >
                            {milestoneStatusLabels[milestone.status]}
                          </Badge>
                        </div>
                        {milestone.description && (
                          <p className="text-sm text-muted-foreground">{milestone.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                          {milestone.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Límite: {formatDate(milestone.dueDate)}
                            </span>
                          )}
                          {milestone.completedAt && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Completado: {formatDate(milestone.completedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={milestone.status}
                          onValueChange={(value) => 
                            updateMilestoneMutation.mutate({ 
                              milestoneId: milestone.id, 
                              data: { status: value as any } 
                            })
                          }
                        >
                          <SelectTrigger className="w-36" data-testid={`select-milestone-status-${milestone.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="en_curso">En Curso</SelectItem>
                            <SelectItem value="completado">Completado</SelectItem>
                            <SelectItem value="retrasado">Retrasado</SelectItem>
                          </SelectContent>
                        </Select>
                        {milestone.status !== "pendiente" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => resetMilestoneMutation.mutate(milestone.id)}
                            title="Reiniciar hito"
                            data-testid={`button-reset-milestone-${milestone.id}`}
                          >
                            <RotateCcw className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );

                  const renderReviewMilestone = (milestone: ProjectMilestone, index: number) => {
                    const isCompleted = milestone.status === "completado";
                    const isDelayed = milestone.status === "retrasado";
                    const isPending = milestone.status === "pendiente" || milestone.status === "en_curso";
                    const dueDate = milestone.dueDate ? new Date(milestone.dueDate) : null;
                    const isPastDue = dueDate && dueDate < new Date() && !isCompleted;

                    return (
                      <div 
                        key={milestone.id} 
                        className={`p-4 border rounded-lg ${
                          isCompleted 
                            ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30" 
                            : isDelayed
                            ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30"
                            : isPastDue
                            ? "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/30"
                            : "border-purple-200 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/30"
                        }`}
                        data-testid={`review-milestone-${milestone.id}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium shrink-0 ${
                            isCompleted ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                            isDelayed ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
                            "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : isDelayed ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <MapPin className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-medium">{milestone.name}</h4>
                              {isCompleted && (
                                <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700 no-default-hover-elevate no-default-active-elevate">
                                  Realizada
                                </Badge>
                              )}
                              {isDelayed && (
                                <Badge className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700 no-default-hover-elevate no-default-active-elevate">
                                  No Realizada
                                </Badge>
                              )}
                              {isPending && isPastDue && (
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700 no-default-hover-elevate no-default-active-elevate">
                                  Vencida
                                </Badge>
                              )}
                              {isPending && !isPastDue && (
                                <Badge variant="outline" className="text-purple-600 border-purple-300 dark:text-purple-400 dark:border-purple-700">
                                  Programada
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                              {milestone.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(milestone.dueDate)}
                                </span>
                              )}
                              {milestone.completedAt && (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Completada: {formatDate(milestone.completedAt)}
                                </span>
                              )}
                              {(milestone as any).linkedVisitId && isCompleted && (
                                <a 
                                  href={`/visitas/${(milestone as any).linkedVisitId}`} 
                                  className="text-blue-600 dark:text-blue-400 flex items-center gap-1"
                                  data-testid={`link-visit-${milestone.id}`}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Ver visita
                                </a>
                              )}
                            </div>
                            {milestone.observations && (
                              <p className="text-sm mt-2 p-2 rounded-md bg-muted/50">
                                {milestone.observations}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0 flex-wrap">
                            {isPending && (milestone as any).linkedVisitId && (
                              <Button
                                size="sm"
                                onClick={() => startVisitFromProjectMutation.mutate((milestone as any).linkedVisitId)}
                                disabled={startingVisitId === (milestone as any).linkedVisitId}
                                data-testid={`button-start-review-visit-${milestone.id}`}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                {startingVisitId === (milestone as any).linkedVisitId ? "Iniciando..." : "Iniciar Visita"}
                              </Button>
                            )}
                            {isPending && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-300 dark:text-green-400 dark:border-green-700"
                                  onClick={() => {
                                    setSelectedReviewMilestone(milestone);
                                    setReviewDialogType("complete");
                                    setReviewObservations("");
                                    setReviewDialogOpen(true);
                                  }}
                                  data-testid={`button-complete-review-${milestone.id}`}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Realizada
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-300 dark:text-red-400 dark:border-red-700"
                                  onClick={() => {
                                    setSelectedReviewMilestone(milestone);
                                    setReviewDialogType("not-done");
                                    setReviewObservations("");
                                    setReviewDialogOpen(true);
                                  }}
                                  data-testid={`button-not-done-review-${milestone.id}`}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  No Realizada
                                </Button>
                              </>
                            )}
                            {isCompleted && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedReviewMilestone(milestone);
                                  setReviewDialogType("ticket");
                                  setTicketForm({ description: "", priority: "amarillo", ticketType: "planificado" });
                                  setReviewDialogOpen(true);
                                }}
                                data-testid={`button-create-ticket-review-${milestone.id}`}
                              >
                                <ClipboardList className="h-4 w-4 mr-1" />
                                Generar Ticket
                              </Button>
                            )}
                            {(isCompleted || isDelayed) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => resetMilestoneMutation.mutate(milestone.id)}
                                title="Reiniciar revisión"
                                data-testid={`button-reset-review-${milestone.id}`}
                              >
                                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-3">
                      {beforeReviews.map(renderRegularMilestone)}

                      {reviewMilestones.length > 0 && (
                        <div className="space-y-3 ml-4 pl-4 border-l-2 border-purple-300 dark:border-purple-700">
                          <div className="flex items-center gap-2 py-1">
                            <MapPin className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                              Revisiones de Terreno ({reviewMilestones.length})
                            </span>
                          </div>
                          {reviewMilestones.map((m, i) => renderReviewMilestone(m, i))}
                        </div>
                      )}

                      {afterReviews.map(renderRegularMilestone)}
                    </div>
                  );
                })()
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle>Cotizaciones</CardTitle>
              {isManager && (
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={20 * 1024 * 1024}
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
                    if (!res.ok) throw new Error("Failed to get upload URL");
                    const { uploadURL, objectPath } = await res.json();
                    (file.meta as Record<string, unknown>).objectPath = objectPath;
                    (file.meta as Record<string, unknown>).fileName = file.name;
                    return {
                      method: "PUT" as const,
                      url: uploadURL,
                      headers: { "Content-Type": file.type || "application/octet-stream" },
                    };
                  }}
                  onComplete={(result) => {
                    const file = result.successful?.[0];
                    if (file?.meta?.objectPath) {
                      uploadDocumentMutation.mutate({
                        name: (file.meta.fileName as string) || "Cotización",
                        documentType: "cotizacion",
                        fileUrl: file.meta.objectPath as string,
                      });
                    }
                  }}
                  buttonClassName=""
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Cotización
                </ObjectUploader>
              )}
            </CardHeader>
            <CardContent>
              {(() => {
                const quoteDocuments = project.documents.filter(d => d.documentType === "cotizacion" || d.documentType === "adjudicacion");
                const adjudicadaDoc = quoteDocuments.find(d => d.documentType === "adjudicacion");
                const regularQuotes = quoteDocuments.filter(d => d.documentType === "cotizacion");

                if (quoteDocuments.length === 0) {
                  return (
                    <div className="text-center py-6">
                      <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No hay cotizaciones cargadas</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {project.quotesReceived ? `Se indicaron ${project.quotesReceived} cotizaciones recibidas` : "Suba las cotizaciones recibidas para este proyecto"}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {adjudicadaDoc && (
                      <div className="p-4 border-2 border-green-300 dark:border-green-800 rounded-lg bg-green-50/50 dark:bg-green-950/30" data-testid={`quote-adjudicada-${adjudicadaDoc.id}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="h-5 w-5 text-green-600" />
                          <span className="font-semibold text-green-700 dark:text-green-400">Cotización Adjudicada</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{adjudicadaDoc.name}</p>
                            <p className="text-sm text-muted-foreground">{formatDate(adjudicadaDoc.createdAt)}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" onClick={() => handleDownloadDocument(adjudicadaDoc)} title="Descargar" data-testid={`button-download-${adjudicadaDoc.id}`}>
                              <Download className="h-4 w-4" />
                            </Button>
                            {isManager && (
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDocumentMutation.mutate(adjudicadaDoc.id)} title="Eliminar" data-testid={`button-delete-doc-${adjudicadaDoc.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {regularQuotes.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Otras cotizaciones ({regularQuotes.length})
                        </p>
                        {regularQuotes.map((doc) => (
                          <div key={doc.id} className="flex items-center gap-4 p-3 border rounded-lg" data-testid={`quote-${doc.id}`}>
                            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{doc.name}</p>
                              <p className="text-sm text-muted-foreground">{formatDate(doc.createdAt)}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isManager && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setAdjudicadaMutation.mutate(doc.id)}
                                  disabled={setAdjudicadaMutation.isPending}
                                  data-testid={`button-set-adjudicada-${doc.id}`}
                                >
                                  <Award className="h-3 w-3 mr-1" />
                                  Adjudicar
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => handleDownloadDocument(doc)} title="Descargar" data-testid={`button-download-${doc.id}`}>
                                <Download className="h-4 w-4" />
                              </Button>
                              {isManager && (
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDocumentMutation.mutate(doc.id)} title="Eliminar" data-testid={`button-delete-doc-${doc.id}`}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {project.quotesReceived && quoteDocuments.length < project.quotesReceived && (
                      <p className="text-sm text-muted-foreground">
                        Se indicaron {project.quotesReceived} cotizaciones recibidas, faltan {project.quotesReceived - quoteDocuments.length} por subir.
                      </p>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle>Otros Documentos</CardTitle>
              {isManager && (
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={20 * 1024 * 1024}
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
                    if (!res.ok) throw new Error("Failed to get upload URL");
                    const { uploadURL, objectPath } = await res.json();
                    (file.meta as Record<string, unknown>).objectPath = objectPath;
                    (file.meta as Record<string, unknown>).fileName = file.name;
                    return {
                      method: "PUT" as const,
                      url: uploadURL,
                      headers: { "Content-Type": file.type || "application/octet-stream" },
                    };
                  }}
                  onComplete={(result) => {
                    const file = result.successful?.[0];
                    if (file?.meta?.objectPath) {
                      uploadDocumentMutation.mutate({
                        name: (file.meta.fileName as string) || "Documento",
                        documentType: "otro",
                        fileUrl: file.meta.objectPath as string,
                      });
                    }
                  }}
                  buttonClassName=""
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Documento
                </ObjectUploader>
              )}
            </CardHeader>
            <CardContent>
              {(() => {
                const otherDocs = project.documents.filter(d => d.documentType !== "cotizacion" && d.documentType !== "adjudicacion");
                if (otherDocs.length === 0) {
                  return <p className="text-muted-foreground text-center py-6">No hay otros documentos cargados</p>;
                }
                return (
                  <div className="space-y-2">
                    {otherDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-4 p-3 border rounded-lg" data-testid={`document-${doc.id}`}>
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {documentTypeLabels[doc.documentType]} {"\u2022"} {formatDate(doc.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadDocument(doc)} title="Descargar" data-testid={`button-download-${doc.id}`}>
                            <Download className="h-4 w-4" />
                          </Button>
                          {isManager && (
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteDocumentMutation.mutate(doc.id)} title="Eliminar" data-testid={`button-delete-doc-${doc.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="payments" className="mt-4 space-y-4">
          {(() => {
            const paymentMilestones = project.milestones.filter(m => m.isPaymentMilestone);
            const totalBudget = project.approvedBudget ? parseFloat(project.approvedBudget as string) : 0;
            const totalInvoiced = paymentMilestones
              .filter(m => m.invoiceStatus === "submitted" && m.invoiceAmount)
              .reduce((sum, m) => sum + parseFloat(m.invoiceAmount as string), 0);
            const pendingBalance = totalBudget - totalInvoiced;

            return (
              <>
                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Presupuesto Aprobado</p>
                      <p className="text-xl font-bold" data-testid="text-total-budget">{formatCurrency(totalBudget)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Total Facturado</p>
                      <p className="text-xl font-bold" data-testid="text-total-invoiced">{formatCurrency(totalInvoiced)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Saldo Pendiente</p>
                      <p className="text-xl font-bold" data-testid="text-pending-balance">{formatCurrency(pendingBalance)}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                    <CardTitle>Hitos de Pago</CardTitle>
                    {isManager && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPaymentForm({ name: "", paymentPercentage: "", paymentAmount: "", dueDate: "", invoiceVendorId: "", invoiceVendorName: "" });
                          setPaymentMilestoneDialogOpen(true);
                        }}
                        data-testid="button-add-payment-milestone"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Hito de Pago
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {paymentMilestones.length === 0 ? (
                      <div className="text-center py-6">
                        <DollarSign className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No hay hitos de pago definidos</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {paymentMilestones.map((pm) => (
                          <div key={pm.id} className="flex items-start gap-4 p-4 border rounded-lg" data-testid={`payment-milestone-${pm.id}`}>
                            <DollarSign className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-medium" data-testid={`text-payment-name-${pm.id}`}>{pm.name}</h4>
                                <Badge
                                  variant={pm.invoiceStatus === "submitted" ? "default" : "outline"}
                                  className={`no-default-hover-elevate no-default-active-elevate ${
                                    pm.invoiceStatus === "submitted" ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700" :
                                    pm.invoiceStatus === "pending" ? "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700" :
                                    ""
                                  }`}
                                >
                                  {pm.invoiceStatus === "submitted" ? "Facturado" : pm.invoiceStatus === "pending" ? "Factura Pendiente" : milestoneStatusLabels[pm.status] || "Pendiente"}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                                {pm.paymentAmount && (
                                  <span data-testid={`text-payment-amount-${pm.id}`}>Monto: {formatCurrency(pm.paymentAmount)}</span>
                                )}
                                {pm.paymentPercentage && (
                                  <span>({pm.paymentPercentage}%)</span>
                                )}
                                {pm.invoiceVendorName && (
                                  <span>Proveedor: {pm.invoiceVendorName}</span>
                                )}
                                {pm.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(pm.dueDate)}
                                  </span>
                                )}
                              </div>
                              {pm.invoiceStatus === "submitted" && pm.invoiceNumber && (
                                <p className="text-sm mt-1 text-muted-foreground">
                                  Factura #{pm.invoiceNumber} - {formatCurrency(pm.invoiceAmount)}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {pm.invoiceStatus !== "submitted" && isManager && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedPaymentMilestone(pm);
                                    setInvoiceForm({
                                      invoiceStatus: "submitted",
                                      invoiceNumber: "",
                                      invoiceAmount: pm.paymentAmount ? String(pm.paymentAmount) : "",
                                      invoiceDocumentKey: "",
                                      invoiceVendorName: pm.invoiceVendorName || "",
                                    });
                                    setInvoiceDialogOpen(true);
                                  }}
                                  data-testid={`button-register-invoice-${pm.id}`}
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  Registrar Factura
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>
      </Tabs>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialogType === "complete" && "Marcar Revisión como Realizada"}
              {reviewDialogType === "not-done" && "Marcar Revisión como No Realizada"}
              {reviewDialogType === "ticket" && "Generar Ticket desde Revisión"}
            </DialogTitle>
          </DialogHeader>
          {selectedReviewMilestone && (
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-muted/50">
                <p className="text-sm font-medium">{selectedReviewMilestone.name}</p>
                {selectedReviewMilestone.dueDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Fecha: {formatDate(selectedReviewMilestone.dueDate)}
                  </p>
                )}
              </div>

              {reviewDialogType === "complete" && (
                <>
                  <div>
                    <label className="text-sm font-medium">Observaciones (opcional)</label>
                    <Textarea
                      value={reviewObservations}
                      onChange={(e) => setReviewObservations(e.target.value)}
                      placeholder="Notas sobre la revisión realizada..."
                      data-testid="input-review-observations"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={() => setReviewDialogOpen(false)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => completeReviewMutation.mutate({ milestoneId: selectedReviewMilestone.id, observations: reviewObservations })}
                      disabled={completeReviewMutation.isPending}
                      className="flex-1"
                      data-testid="button-confirm-complete-review"
                    >
                      {completeReviewMutation.isPending ? "Guardando..." : "Marcar Realizada"}
                    </Button>
                  </div>
                </>
              )}

              {reviewDialogType === "not-done" && (
                <>
                  <div>
                    <label className="text-sm font-medium">Motivo (opcional)</label>
                    <Textarea
                      value={reviewObservations}
                      onChange={(e) => setReviewObservations(e.target.value)}
                      placeholder="Razón por la que no se realizó..."
                      data-testid="input-review-not-done-reason"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={() => setReviewDialogOpen(false)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => markNotDoneMutation.mutate({ milestoneId: selectedReviewMilestone.id, observations: reviewObservations })}
                      disabled={markNotDoneMutation.isPending}
                      className="flex-1"
                      data-testid="button-confirm-not-done"
                    >
                      {markNotDoneMutation.isPending ? "Guardando..." : "Marcar No Realizada"}
                    </Button>
                  </div>
                </>
              )}

              {reviewDialogType === "ticket" && (
                <>
                  <div>
                    <label className="text-sm font-medium">Descripción del hallazgo</label>
                    <Textarea
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                      placeholder="Describa el problema encontrado en la revisión..."
                      data-testid="input-ticket-description"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Prioridad</label>
                    <Select
                      value={ticketForm.priority}
                      onValueChange={(v) => setTicketForm({ ...ticketForm, priority: v })}
                    >
                      <SelectTrigger data-testid="select-ticket-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="verde">Verde (baja)</SelectItem>
                        <SelectItem value="amarillo">Amarillo (media)</SelectItem>
                        <SelectItem value="rojo">Rojo (alta)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tipo de ticket</label>
                    <Select
                      value={ticketForm.ticketType}
                      onValueChange={(v) => setTicketForm({ ...ticketForm, ticketType: v })}
                    >
                      <SelectTrigger data-testid="select-ticket-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planificado">Planificado</SelectItem>
                        <SelectItem value="correctivo">Correctivo</SelectItem>
                        <SelectItem value="preventivo">Preventivo</SelectItem>
                        <SelectItem value="mejora">Mejora</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={() => setReviewDialogOpen(false)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => createTicketFromReviewMutation.mutate({ milestoneId: selectedReviewMilestone.id, data: ticketForm })}
                      disabled={!ticketForm.description || createTicketFromReviewMutation.isPending}
                      className="flex-1"
                      data-testid="button-confirm-create-ticket"
                    >
                      {createTicketFromReviewMutation.isPending ? "Creando..." : "Crear Ticket"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addReviewDateDialogOpen} onOpenChange={setAddReviewDateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Revisión de Terreno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Fecha de la revisión</label>
              <Input
                type="date"
                value={newReviewDate}
                onChange={(e) => setNewReviewDate(e.target.value)}
                data-testid="input-new-review-date"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddReviewDateDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  const nextNum = getNextReviewNumber();
                  addReviewMilestoneMutation.mutate({
                    name: `Revisión Periódica ${nextNum}`,
                    description: "Inspección de avance durante ejecución",
                    isReview: true,
                    dueDate: newReviewDate || undefined,
                  });
                  setAddReviewDateDialogOpen(false);
                }}
                disabled={!newReviewDate || addReviewMilestoneMutation.isPending}
                className="flex-1"
                data-testid="button-confirm-add-review"
              >
                {addReviewMilestoneMutation.isPending ? "Agregando..." : "Agregar Revisión"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Proveedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <label className="text-sm font-medium">Nombre del Proveedor</label>
              <Input
                value={vendorForm.vendorName}
                onChange={(e) => {
                  const val = e.target.value;
                  setVendorForm({ ...vendorForm, vendorName: val });
                  setVendorSearch(val);
                  setVendorDropdownOpen(val.length > 0);
                }}
                onFocus={() => {
                  if (vendorForm.vendorName.length > 0) setVendorDropdownOpen(true);
                }}
                onBlur={() => {
                  setTimeout(() => setVendorDropdownOpen(false), 200);
                }}
                placeholder="Buscar o crear proveedor..."
                data-testid="input-vendor-name"
              />
              {vendorDropdownOpen && allVendors && (() => {
                const filtered = allVendors.filter(v => v.name.toLowerCase().includes(vendorSearch.toLowerCase()));
                if (filtered.length === 0) return null;
                return (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto">
                    {filtered.map((v) => (
                      <div
                        key={v.id}
                        className="px-3 py-2 text-sm cursor-pointer hover-elevate"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setVendorForm({ ...vendorForm, vendorName: v.name });
                          setVendorDropdownOpen(false);
                        }}
                        data-testid={`vendor-option-${v.id}`}
                      >
                        {v.name}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div>
              <label className="text-sm font-medium">Rol</label>
              <Select
                value={vendorForm.role}
                onValueChange={(v) => setVendorForm({ ...vendorForm, role: v })}
              >
                <SelectTrigger data-testid="select-vendor-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contratista">Contratista</SelectItem>
                  <SelectItem value="ito">ITO</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Monto Aprobado</label>
              <Input
                type="number"
                value={vendorForm.approvedAmount}
                onChange={(e) => setVendorForm({ ...vendorForm, approvedAmount: e.target.value })}
                placeholder="0"
                data-testid="input-vendor-amount"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nombre de Contacto (opcional)</label>
              <Input
                value={vendorForm.contactName}
                onChange={(e) => setVendorForm({ ...vendorForm, contactName: e.target.value })}
                placeholder="Nombre del contacto"
                data-testid="input-vendor-contact-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Teléfono de Contacto (opcional)</label>
              <Input
                value={vendorForm.contactPhone}
                onChange={(e) => setVendorForm({ ...vendorForm, contactPhone: e.target.value })}
                placeholder="Teléfono"
                data-testid="input-vendor-contact-phone"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email de Contacto (opcional)</label>
              <Input
                type="email"
                value={vendorForm.contactEmail}
                onChange={(e) => setVendorForm({ ...vendorForm, contactEmail: e.target.value })}
                placeholder="Email"
                data-testid="input-vendor-contact-email"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setVendorDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={() => addVendorMutation.mutate(vendorForm)}
                disabled={!vendorForm.vendorName || addVendorMutation.isPending}
                className="flex-1"
                data-testid="button-confirm-add-vendor"
              >
                {addVendorMutation.isPending ? "Agregando..." : "Agregar Proveedor"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteVendorId} onOpenChange={(open) => { if (!open) setDeleteVendorId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              ¿Está seguro de que desea eliminar este proveedor del proyecto?
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleteVendorId(null)} className="flex-1">
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteVendorId) deleteVendorMutation.mutate(deleteVendorId);
                }}
                disabled={deleteVendorMutation.isPending}
                className="flex-1"
                data-testid="button-confirm-delete-vendor"
              >
                {deleteVendorMutation.isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentMilestoneDialogOpen} onOpenChange={setPaymentMilestoneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Hito de Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={paymentForm.name}
                onChange={(e) => setPaymentForm({ ...paymentForm, name: e.target.value })}
                placeholder='Ej: "Anticipo 30%", "Avance 40%"'
                data-testid="input-payment-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Porcentaje (%)</label>
              <Input
                type="number"
                value={paymentForm.paymentPercentage}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentPercentage: e.target.value })}
                placeholder="Opcional"
                data-testid="input-payment-percentage"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Monto</label>
              <Input
                type="number"
                value={paymentForm.paymentAmount}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentAmount: e.target.value })}
                placeholder="0"
                data-testid="input-payment-amount"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Fecha de Vencimiento</label>
              <Input
                type="date"
                value={paymentForm.dueDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, dueDate: e.target.value })}
                data-testid="input-payment-due-date"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Proveedor</label>
              <Select
                value={paymentForm.invoiceVendorId || "_none"}
                onValueChange={(v) => {
                  if (v === "_none") {
                    setPaymentForm({ ...paymentForm, invoiceVendorId: "", invoiceVendorName: "" });
                  } else {
                    const vendor = project.vendors?.find(pv => pv.id === v);
                    setPaymentForm({ ...paymentForm, invoiceVendorId: v, invoiceVendorName: vendor?.vendorName || "" });
                  }
                }}
              >
                <SelectTrigger data-testid="select-payment-vendor">
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sin proveedor</SelectItem>
                  {(project.vendors || []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.vendorName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setPaymentMilestoneDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={() => addPaymentMilestoneMutation.mutate(paymentForm)}
                disabled={!paymentForm.name || addPaymentMilestoneMutation.isPending}
                className="flex-1"
                data-testid="button-confirm-add-payment"
              >
                {addPaymentMilestoneMutation.isPending ? "Agregando..." : "Agregar Hito"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Factura</DialogTitle>
          </DialogHeader>
          {selectedPaymentMilestone && (
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-muted/50">
                <p className="text-sm font-medium">{selectedPaymentMilestone.name}</p>
                {selectedPaymentMilestone.paymentAmount && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Monto esperado: {formatCurrency(selectedPaymentMilestone.paymentAmount)}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Estado de Factura</label>
                <RadioGroup
                  value={invoiceForm.invoiceStatus}
                  onValueChange={(v) => setInvoiceForm({ ...invoiceForm, invoiceStatus: v })}
                  className="mt-2"
                  data-testid="radio-invoice-status"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="submitted" id="invoice-submitted" />
                    <Label htmlFor="invoice-submitted">Factura Emitida</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="pending" id="invoice-pending" />
                    <Label htmlFor="invoice-pending">Factura Pendiente</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="none" id="invoice-none" />
                    <Label htmlFor="invoice-none">Sin Factura</Label>
                  </div>
                </RadioGroup>
              </div>
              {invoiceForm.invoiceStatus === "submitted" && (
                <>
                  <div>
                    <label className="text-sm font-medium">Número de Factura</label>
                    <Input
                      value={invoiceForm.invoiceNumber}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                      placeholder="Ej: FAC-001"
                      data-testid="input-invoice-number"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Monto Factura</label>
                    <Input
                      type="number"
                      value={invoiceForm.invoiceAmount}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceAmount: e.target.value })}
                      placeholder="0"
                      data-testid="input-invoice-amount"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Documento Factura</label>
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={20 * 1024 * 1024}
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
                        if (!res.ok) throw new Error("Failed to get upload URL");
                        const { uploadURL, objectPath } = await res.json();
                        (file.meta as Record<string, unknown>).objectPath = objectPath;
                        return {
                          method: "PUT" as const,
                          url: uploadURL,
                          headers: { "Content-Type": file.type || "application/octet-stream" },
                        };
                      }}
                      onComplete={(result) => {
                        const file = result.successful?.[0];
                        if (file?.meta?.objectPath) {
                          setInvoiceForm({ ...invoiceForm, invoiceDocumentKey: file.meta.objectPath as string });
                        }
                      }}
                      buttonClassName=""
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {invoiceForm.invoiceDocumentKey ? "Archivo Subido" : "Subir Factura"}
                    </ObjectUploader>
                    {invoiceForm.invoiceDocumentKey && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">Archivo cargado correctamente</p>
                    )}
                  </div>
                </>
              )}
              <div>
                <label className="text-sm font-medium">Proveedor</label>
                <Input
                  value={invoiceForm.invoiceVendorName}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceVendorName: e.target.value })}
                  placeholder="Nombre del proveedor"
                  data-testid="input-invoice-vendor-name"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={() => updateInvoiceMutation.mutate({ milestoneId: selectedPaymentMilestone.id, data: invoiceForm })}
                  disabled={updateInvoiceMutation.isPending}
                  className="flex-1"
                  data-testid="button-confirm-invoice"
                >
                  {updateInvoiceMutation.isPending ? "Guardando..." : "Registrar Factura"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
