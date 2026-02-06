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
  Download
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { 
  Project, 
  ProjectMilestone, 
  ProjectDocument, 
  ProjectUpdate, 
  Building 
} from "@shared/schema";

type ProjectWithDetails = Project & {
  building?: Building;
  milestones: ProjectMilestone[];
  documents: ProjectDocument[];
  updates: ProjectUpdate[];
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
  
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    updateType: "fiscalizacion",
    title: "",
    description: "",
    requiresCommitteeApproval: false,
  });

  const { data: project, isLoading } = useQuery<ProjectWithDetails>({
    queryKey: ["/api/projects", id],
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

  const createUpdateMutation = useMutation({
    mutationFn: async (data: typeof updateForm) => {
      return apiRequest("POST", `/api/projects/${id}/updates`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      setUpdateDialogOpen(false);
      setUpdateForm({ updateType: "fiscalizacion", title: "", description: "", requiresCommitteeApproval: false });
      toast({ title: "Fiscalización registrada" });
    },
  });

  const approveUpdateMutation = useMutation({
    mutationFn: async (updateId: string) => {
      return apiRequest("PATCH", `/api/projects/${id}/updates/${updateId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id] });
      toast({ title: "Solicitud aprobada" });
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

  const isManager = (user as any)?.role && ["super_admin", "gerente_general", "gerente_operaciones", "gerente_comercial"].includes((user as any).role);

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

      <Tabs defaultValue="milestones">
        <TabsList>
          <TabsTrigger value="milestones" data-testid="tab-milestones">
            Hitos ({project.milestones.length})
          </TabsTrigger>
          <TabsTrigger value="updates" data-testid="tab-updates">
            Fiscalizaciones ({project.updates.length})
          </TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">
            Cotizaciones y Documentos ({project.documents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="milestones" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle>Hitos del Proyecto</CardTitle>
              {isManager && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const nextNum = getNextReviewNumber();
                    addReviewMilestoneMutation.mutate({
                      name: `Revisión Periódica ${nextNum}`,
                      description: "Inspección de avance durante ejecución",
                      isReview: true,
                    });
                  }}
                  disabled={addReviewMilestoneMutation.isPending}
                  data-testid="button-add-review-detail"
                >
                  <CalendarCheck className="h-4 w-4 mr-2" />
                  Agregar Revisión
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {project.milestones.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No hay hitos definidos</p>
              ) : (
                <div className="space-y-4">
                  {project.milestones.map((milestone, index) => {
                    const milestoneIsReview = (milestone as any).isReview;
                    return (
                      <div 
                        key={milestone.id} 
                        className={`flex items-start gap-4 p-4 border rounded-lg ${milestoneIsReview ? "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30" : ""}`}
                        data-testid={`milestone-${milestone.id}`}
                      >
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium shrink-0 ${milestoneIsReview ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : "bg-muted"}`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-medium">{milestone.name}</h4>
                            {milestoneIsReview && (
                              <Badge variant="outline" className="text-blue-600 border-blue-300">
                                <CalendarCheck className="h-3 w-3 mr-1" />
                                Revisión
                              </Badge>
                            )}
                            <Badge 
                              variant={milestone.status === "completado" ? "default" : "outline"}
                              className={
                                milestone.status === "retrasado" ? "bg-red-100 text-red-800 border-red-300" :
                                milestone.status === "en_curso" ? "bg-blue-100 text-blue-800 border-blue-300" :
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
                              <span>Límite: {formatDate(milestone.dueDate)}</span>
                            )}
                            {milestone.completedAt && (
                              <span>Completado: {formatDate(milestone.completedAt)}</span>
                            )}
                            {(milestone as any).linkedVisitId && (
                              <a href={`/visitas/${(milestone as any).linkedVisitId}`} className="text-blue-600 flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" />
                                Ver visita asociada
                              </a>
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
                              title="Reiniciar hito (limpiar datos para volver a ingresar)"
                              data-testid={`button-reset-milestone-${milestone.id}`}
                            >
                              <RotateCcw className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="updates" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Fiscalizaciones y Actualizaciones</CardTitle>
              <Button onClick={() => setUpdateDialogOpen(true)} data-testid="button-add-update">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Fiscalización
              </Button>
            </CardHeader>
            <CardContent>
              {project.updates.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No hay fiscalizaciones registradas</p>
              ) : (
                <div className="space-y-4">
                  {project.updates.map((update) => (
                    <div 
                      key={update.id} 
                      className="p-4 border rounded-lg"
                      data-testid={`update-${update.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{update.updateType}</Badge>
                            <h4 className="font-medium">{update.title}</h4>
                          </div>
                          {update.description && (
                            <p className="text-sm text-muted-foreground mt-1">{update.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDate(update.createdAt)}
                          </p>
                        </div>
                        {update.requiresCommitteeApproval && (
                          <div>
                            {update.committeeApproved ? (
                              <Badge className="bg-green-100 text-green-800">Aprobado</Badge>
                            ) : (
                              <>
                                <Badge variant="outline" className="text-yellow-600">Pendiente Aprobación</Badge>
                                {isManager && (
                                  <Button 
                                    size="sm" 
                                    className="ml-2"
                                    onClick={() => approveUpdateMutation.mutate(update.id)}
                                    data-testid={`button-approve-${update.id}`}
                                  >
                                    Aprobar
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
      </Tabs>

      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Fiscalización</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Select 
                value={updateForm.updateType} 
                onValueChange={(v) => setUpdateForm({ ...updateForm, updateType: v })}
              >
                <SelectTrigger data-testid="select-update-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fiscalizacion">Fiscalización</SelectItem>
                  <SelectItem value="cambio_solicitado">Cambio Solicitado</SelectItem>
                  <SelectItem value="reunion">Reunión</SelectItem>
                  <SelectItem value="nota">Nota</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input
                value={updateForm.title}
                onChange={(e) => setUpdateForm({ ...updateForm, title: e.target.value })}
                placeholder="Título de la actualización"
                data-testid="input-update-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                value={updateForm.description}
                onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })}
                placeholder="Detalles de la fiscalización..."
                data-testid="input-update-description"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requiresApproval"
                checked={updateForm.requiresCommitteeApproval}
                onChange={(e) => setUpdateForm({ ...updateForm, requiresCommitteeApproval: e.target.checked })}
              />
              <label htmlFor="requiresApproval" className="text-sm">
                Requiere aprobación del comité
              </label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setUpdateDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => createUpdateMutation.mutate(updateForm)}
                disabled={!updateForm.title || createUpdateMutation.isPending}
                className="flex-1"
                data-testid="button-submit-update"
              >
                {createUpdateMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
