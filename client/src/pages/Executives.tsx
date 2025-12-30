import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Executive, ExecutiveDocument, Building, ExecutiveDocType } from "@shared/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  Plus,
  Search,
  Phone,
  Mail,
  Building2,
  User,
  Calendar,
  FileText,
  Trash2,
  Edit,
  ArrowLeft,
  UserX,
  UserCheck,
  Upload,
  Download,
  MapPin,
  IdCard,
  Briefcase,
  Users,
} from "lucide-react";

interface ExecutiveWithBuildings extends Executive {
  buildings: Building[];
  documents?: ExecutiveDocument[];
}

const executiveFormSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  rut: z.string().optional(),
  birthDate: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  commune: z.string().optional(),
  city: z.string().optional(),
  bumaEmail: z.string().email("Email invalido").optional().or(z.literal("")),
  personalEmail: z.string().email("Email invalido").optional().or(z.literal("")),
  phone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  position: z.string().default("Ejecutivo de Operaciones"),
  hireDate: z.string().optional(),
  notes: z.string().optional(),
  buildingIds: z.array(z.string()).default([]),
});

type ExecutiveFormData = z.infer<typeof executiveFormSchema>;

const documentTypeLabels: Record<ExecutiveDocType, string> = {
  cv: "Curriculum Vitae",
  certificado_estudios: "Certificado de Estudios",
  contrato: "Contrato",
  cedula_identidad: "Cedula de Identidad",
  certificado_afp: "Certificado AFP",
  certificado_salud: "Certificado de Salud",
  otro: "Otro",
};

export default function Executives() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("activos");
  const [selectedExecutive, setSelectedExecutive] = useState<ExecutiveWithBuildings | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [editingExecutive, setEditingExecutive] = useState<ExecutiveWithBuildings | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<ExecutiveDocType>("cv");

  const { data: activeExecutives, isLoading: activeLoading } = useQuery<ExecutiveWithBuildings[]>({
    queryKey: ["/api/executives", "activo"],
    queryFn: async () => {
      const res = await fetch("/api/executives?status=activo");
      if (!res.ok) throw new Error("Error fetching executives");
      return res.json();
    },
  });

  const { data: inactiveExecutives, isLoading: inactiveLoading } = useQuery<ExecutiveWithBuildings[]>({
    queryKey: ["/api/executives", "inactivo"],
    queryFn: async () => {
      const res = await fetch("/api/executives?status=inactivo");
      if (!res.ok) throw new Error("Error fetching executives");
      return res.json();
    },
  });

  const { data: buildings } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const form = useForm<ExecutiveFormData>({
    resolver: zodResolver(executiveFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      rut: "",
      nationality: "",
      address: "",
      commune: "",
      city: "",
      bumaEmail: "",
      personalEmail: "",
      phone: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      position: "Ejecutivo de Operaciones",
      notes: "",
      buildingIds: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ExecutiveFormData) => {
      const url = editingExecutive ? `/api/executives/${editingExecutive.id}` : "/api/executives";
      const method = editingExecutive ? "PATCH" : "POST";
      return apiRequest(method, url, {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate).toISOString() : undefined,
        hireDate: data.hireDate ? new Date(data.hireDate).toISOString() : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/executives"] });
      setIsFormDialogOpen(false);
      setEditingExecutive(null);
      form.reset();
      toast({ title: editingExecutive ? "Ejecutivo actualizado" : "Ejecutivo creado" });
    },
    onError: () => {
      toast({ title: "Error al guardar ejecutivo", variant: "destructive" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/executives/${id}/deactivate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/executives"] });
      setIsDeactivateDialogOpen(false);
      setSelectedExecutive(null);
      toast({ title: "Ejecutivo desactivado" });
    },
    onError: () => {
      toast({ title: "Error al desactivar ejecutivo", variant: "destructive" });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/executives/${id}/reactivate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/executives"] });
      toast({ title: "Ejecutivo reactivado" });
    },
    onError: () => {
      toast({ title: "Error al reactivar ejecutivo", variant: "destructive" });
    },
  });

  const updatePhotoMutation = useMutation({
    mutationFn: async ({ id, photoKey }: { id: string; photoKey: string }) => {
      return apiRequest("PATCH", `/api/executives/${id}`, { photoKey });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/executives"] });
      if (selectedExecutive) {
        refetchSelectedExecutive();
      }
      toast({ title: "Foto actualizada" });
    },
    onError: () => {
      toast({ title: "Error al actualizar foto", variant: "destructive" });
    },
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (data: { executiveId: string; documentType: ExecutiveDocType; name: string; fileKey: string }) => {
      return apiRequest("POST", `/api/executives/${data.executiveId}/documents`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/executives"] });
      if (selectedExecutive) {
        refetchSelectedExecutive();
      }
      toast({ title: "Documento subido" });
    },
    onError: () => {
      toast({ title: "Error al subir documento", variant: "destructive" });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async ({ executiveId, docId }: { executiveId: string; docId: string }) => {
      return apiRequest("DELETE", `/api/executives/${executiveId}/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/executives"] });
      if (selectedExecutive) {
        refetchSelectedExecutive();
      }
      toast({ title: "Documento eliminado" });
    },
    onError: () => {
      toast({ title: "Error al eliminar documento", variant: "destructive" });
    },
  });

  const refetchSelectedExecutive = async () => {
    if (!selectedExecutive) return;
    const res = await fetch(`/api/executives/${selectedExecutive.id}`);
    if (res.ok) {
      const data = await res.json();
      setSelectedExecutive(data);
    }
  };

  const handleEditExecutive = (exec: ExecutiveWithBuildings) => {
    setEditingExecutive(exec);
    form.reset({
      firstName: exec.firstName,
      lastName: exec.lastName,
      rut: exec.rut || "",
      birthDate: exec.birthDate ? format(new Date(exec.birthDate), "yyyy-MM-dd") : "",
      nationality: exec.nationality || "",
      address: exec.address || "",
      commune: exec.commune || "",
      city: exec.city || "",
      bumaEmail: exec.bumaEmail || "",
      personalEmail: exec.personalEmail || "",
      phone: exec.phone || "",
      emergencyContactName: exec.emergencyContactName || "",
      emergencyContactPhone: exec.emergencyContactPhone || "",
      position: exec.position,
      hireDate: exec.hireDate ? format(new Date(exec.hireDate), "yyyy-MM-dd") : "",
      notes: exec.notes || "",
      buildingIds: exec.buildings?.map(b => b.id) || [],
    });
    setIsFormDialogOpen(true);
  };

  const handleFormDialogClose = () => {
    setIsFormDialogOpen(false);
    setEditingExecutive(null);
    form.reset();
  };

  const handlePhotoUploadComplete = (fileKey: string) => {
    if (selectedExecutive) {
      updatePhotoMutation.mutate({ id: selectedExecutive.id, photoKey: fileKey });
    }
    setIsUploadingPhoto(false);
  };

  const handleDocumentUploadComplete = (fileKey: string) => {
    if (selectedExecutive) {
      createDocumentMutation.mutate({
        executiveId: selectedExecutive.id,
        documentType: selectedDocumentType,
        name: `${documentTypeLabels[selectedDocumentType]} - ${selectedExecutive.firstName} ${selectedExecutive.lastName}`,
        fileKey,
      });
    }
    setIsUploadingDocument(false);
  };

  const executives = activeTab === "activos" ? activeExecutives : inactiveExecutives;
  const isLoading = activeTab === "activos" ? activeLoading : inactiveLoading;

  const filteredExecutives = executives?.filter((e) =>
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.bumaEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.rut?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (exec: ExecutiveWithBuildings) => {
    return `${exec.firstName[0] || ""}${exec.lastName[0] || ""}`.toUpperCase();
  };

  const getPhotoUrl = (photoKey: string | null) => {
    if (!photoKey) return null;
    return `/api/object-storage/public/${photoKey}`;
  };

  if (selectedExecutive) {
    return (
      <ScrollArea className="h-full">
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedExecutive(null)}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold" data-testid="text-executive-name">
              {selectedExecutive.firstName} {selectedExecutive.lastName}
            </h1>
            <Badge variant={selectedExecutive.employmentStatus === "activo" ? "default" : "secondary"}>
              {selectedExecutive.employmentStatus === "activo" ? "Activo" : "Inactivo"}
            </Badge>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Foto de Perfil</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={getPhotoUrl(selectedExecutive.photoKey) || undefined} />
                  <AvatarFallback className="text-3xl">{getInitials(selectedExecutive)}</AvatarFallback>
                </Avatar>
                {isUploadingPhoto ? (
                  <div className="space-y-2">
                    <ObjectUploader
                      maxFileSize={5 * 1024 * 1024}
                      onGetUploadParameters={async (file) => {
                        const res = await fetch("/api/object-storage/presigned-url", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            fileName: file.name,
                            contentType: file.type,
                            prefix: `executives/photos/${selectedExecutive.id}`,
                          }),
                        });
                        const data = await res.json();
                        return { method: "PUT", url: data.signedUrl };
                      }}
                      onComplete={(result) => {
                        if (result.successful.length > 0) {
                          const uploadedFile = result.successful[0];
                          const key = `executives/photos/${selectedExecutive.id}/${uploadedFile.name}`;
                          handlePhotoUploadComplete(key);
                        }
                      }}
                    >
                      Seleccionar Foto
                    </ObjectUploader>
                    <Button variant="ghost" size="sm" onClick={() => setIsUploadingPhoto(false)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsUploadingPhoto(true)}
                    data-testid="button-upload-photo"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Cambiar Foto
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle className="text-lg">Informacion Personal</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditExecutive(selectedExecutive)}
                    data-testid="button-edit-executive"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  {selectedExecutive.employmentStatus === "activo" ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsDeactivateDialogOpen(true)}
                      data-testid="button-deactivate"
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Desactivar
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => reactivateMutation.mutate(selectedExecutive.id)}
                      data-testid="button-reactivate"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Reactivar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <IdCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">RUT:</span>
                      <span data-testid="text-rut">{selectedExecutive.rut || "No registrado"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Email BUMA:</span>
                      <span data-testid="text-buma-email">{selectedExecutive.bumaEmail || "No registrado"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Email Personal:</span>
                      <span data-testid="text-personal-email">{selectedExecutive.personalEmail || "No registrado"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Telefono:</span>
                      <span data-testid="text-phone">{selectedExecutive.phone || "No registrado"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Cargo:</span>
                      <span data-testid="text-position">{selectedExecutive.position}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Direccion:</span>
                      <span data-testid="text-address">{selectedExecutive.address || "No registrada"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Fecha Nacimiento:</span>
                      <span data-testid="text-birth-date">
                        {selectedExecutive.birthDate
                          ? format(new Date(selectedExecutive.birthDate), "dd/MM/yyyy", { locale: es })
                          : "No registrada"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Fecha Ingreso:</span>
                      <span data-testid="text-hire-date">
                        {selectedExecutive.hireDate
                          ? format(new Date(selectedExecutive.hireDate), "dd/MM/yyyy", { locale: es })
                          : "No registrada"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Contacto Emergencia:</span>
                      <span data-testid="text-emergency-contact">
                        {selectedExecutive.emergencyContactName || "No registrado"}
                        {selectedExecutive.emergencyContactPhone && ` (${selectedExecutive.emergencyContactPhone})`}
                      </span>
                    </div>
                  </div>
                </div>
                {selectedExecutive.notes && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">Notas: {selectedExecutive.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Edificios Asignados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedExecutive.buildings && selectedExecutive.buildings.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedExecutive.buildings.map((building) => (
                    <Badge key={building.id} variant="outline" className="text-sm py-1 px-3">
                      {building.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tiene edificios asignados</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos
              </CardTitle>
              {!isUploadingDocument && (
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedDocumentType}
                    onValueChange={(v) => setSelectedDocumentType(v as ExecutiveDocType)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Tipo de documento" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(documentTypeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsUploadingDocument(true)}
                    data-testid="button-upload-document"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Subir Documento
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isUploadingDocument && (
                <div className="mb-4 p-4 border rounded-md">
                  <p className="text-sm text-muted-foreground mb-2">
                    Subiendo: {documentTypeLabels[selectedDocumentType]}
                  </p>
                  <ObjectUploader
                    maxFileSize={10 * 1024 * 1024}
                    onGetUploadParameters={async (file) => {
                      const res = await fetch("/api/object-storage/presigned-url", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          fileName: file.name,
                          contentType: file.type,
                          prefix: `executives/documents/${selectedExecutive.id}/${selectedDocumentType}`,
                        }),
                      });
                      const data = await res.json();
                      return { method: "PUT", url: data.signedUrl };
                    }}
                    onComplete={(result) => {
                      if (result.successful.length > 0) {
                        const uploadedFile = result.successful[0];
                        const key = `executives/documents/${selectedExecutive.id}/${selectedDocumentType}/${uploadedFile.name}`;
                        handleDocumentUploadComplete(key);
                      }
                    }}
                  >
                    Seleccionar Archivo
                  </ObjectUploader>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsUploadingDocument(false)}
                    className="mt-2"
                  >
                    Cancelar
                  </Button>
                </div>
              )}
              {selectedExecutive.documents && selectedExecutive.documents.length > 0 ? (
                <div className="space-y-2">
                  {selectedExecutive.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {documentTypeLabels[doc.documentType as ExecutiveDocType]} - 
                            {doc.createdAt && format(new Date(doc.createdAt), " dd/MM/yyyy", { locale: es })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          data-testid={`button-download-doc-${doc.id}`}
                        >
                          <a href={`/api/object-storage/public/${doc.fileKey}`} target="_blank" rel="noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteDocumentMutation.mutate({
                            executiveId: selectedExecutive.id,
                            docId: doc.id,
                          })}
                          data-testid={`button-delete-doc-${doc.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay documentos registrados</p>
              )}
            </CardContent>
          </Card>
        </div>

        <AlertDialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desactivar Ejecutivo</AlertDialogTitle>
              <AlertDialogDescription>
                Esta accion desactivara al ejecutivo {selectedExecutive?.firstName} {selectedExecutive?.lastName}.
                Su ficha de antecedentes se mantendra en el sistema pero no aparecera en la lista de activos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedExecutive && deactivateMutation.mutate(selectedExecutive.id)}
              >
                Desactivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Users className="h-6 w-6" />
              Ejecutivos
            </h1>
            <p className="text-muted-foreground">Gestion del personal de operaciones</p>
          </div>
          <Button onClick={() => setIsFormDialogOpen(true)} data-testid="button-add-executive">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Ejecutivo
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email o RUT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="activos" data-testid="tab-activos">
                Activos ({activeExecutives?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="inactivos" data-testid="tab-inactivos">
                Inactivos ({inactiveExecutives?.length || 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredExecutives && filteredExecutives.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredExecutives.map((exec) => (
              <Card
                key={exec.id}
                className="cursor-pointer hover-elevate"
                onClick={() => setSelectedExecutive(exec)}
                data-testid={`card-executive-${exec.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={getPhotoUrl(exec.photoKey) || undefined} />
                      <AvatarFallback>{getInitials(exec)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate" data-testid={`text-name-${exec.id}`}>
                        {exec.firstName} {exec.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">{exec.position}</p>
                      {exec.bumaEmail && (
                        <p className="text-xs text-muted-foreground truncate">{exec.bumaEmail}</p>
                      )}
                      {exec.buildings && exec.buildings.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {exec.buildings.slice(0, 2).map((b) => (
                            <Badge key={b.id} variant="secondary" className="text-xs">
                              {b.name}
                            </Badge>
                          ))}
                          {exec.buildings.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{exec.buildings.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No se encontraron ejecutivos" : "No hay ejecutivos registrados"}
              </p>
            </CardContent>
          </Card>
        )}

        <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogClose}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingExecutive ? "Editar Ejecutivo" : "Agregar Ejecutivo"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-firstName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellido *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-lastName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="rut"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RUT</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="12.345.678-9" data-testid="input-rut" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-position" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />
                <h4 className="font-medium">Contacto</h4>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="bumaEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email BUMA</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="nombre@buma.cl" data-testid="input-bumaEmail" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="personalEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Personal</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" data-testid="input-personalEmail" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+56 9 1234 5678" data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />
                <h4 className="font-medium">Datos Personales</h4>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de Nacimiento</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-birthDate" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nationality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nacionalidad</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-nationality" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Direccion</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="commune"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comuna</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-commune" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciudad</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />
                <h4 className="font-medium">Contacto de Emergencia</h4>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="emergencyContactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Contacto</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-emergencyContactName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emergencyContactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefono Contacto</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-emergencyContactPhone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />
                <h4 className="font-medium">Empleo</h4>

                <FormField
                  control={form.control}
                  name="hireDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Ingreso</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-hireDate" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="buildingIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edificios Asignados</FormLabel>
                      <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                        {buildings?.map((building) => (
                          <div key={building.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`building-${building.id}`}
                              checked={field.value.includes(building.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, building.id]);
                                } else {
                                  field.onChange(field.value.filter(id => id !== building.id));
                                }
                              }}
                              data-testid={`checkbox-building-${building.id}`}
                            />
                            <label htmlFor={`building-${building.id}`} className="text-sm cursor-pointer">
                              {building.name}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} data-testid="input-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleFormDialogClose}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                    {createMutation.isPending ? "Guardando..." : editingExecutive ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}
