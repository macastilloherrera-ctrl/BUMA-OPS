import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Wrench, Plus, Building2, Check, X, Pencil, Trash2, Calendar, AlertTriangle, Clock, History, ClipboardCheck } from "lucide-react";
import type { CriticalAsset, Building, MaintenanceRecord } from "@shared/schema";

const assetSchema = z.object({
  buildingId: z.string().min(1, "Selecciona un edificio"),
  name: z.string().min(1, "El nombre es requerido"),
  type: z.string().min(1, "El tipo es requerido"),
  description: z.string().optional(),
  maintenanceFrequency: z.string().optional(),
  lastMaintenanceDate: z.string().optional(),
  nextMaintenanceDate: z.string().optional(),
  maintainerName: z.string().optional(),
});

type AssetForm = z.infer<typeof assetSchema>;

const maintenanceRecordSchema = z.object({
  performedAt: z.string().min(1, "La fecha es requerida"),
  maintainerName: z.string().optional(),
  observations: z.string().optional(),
  cost: z.string().optional(),
});

type MaintenanceRecordForm = z.infer<typeof maintenanceRecordSchema>;

interface AssetWithBuilding extends CriticalAsset {
  buildingName?: string;
}

const assetTypes = [
  "Ascensor",
  "Bomba de agua",
  "Bomba de incendio",
  "Porton electrico",
  "CCTV",
  "Citofono",
  "Tablero electrico",
  "Grupo electrogeno",
  "Sistema de incendio",
  "Otro",
];

const maintenanceFrequencies = [
  { value: "mensual", label: "Mensual" },
  { value: "bimestral", label: "Bimestral" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

function getMaintenanceStatus(nextMaintenanceDate: string | Date | null | undefined) {
  if (!nextMaintenanceDate) return null;
  
  const now = new Date();
  const nextDate = new Date(nextMaintenanceDate);
  
  if (isNaN(nextDate.getTime())) return null;
  
  const diffDays = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { status: "vencida", label: "Vencida", variant: "destructive" as const, days: Math.abs(diffDays) };
  } else if (diffDays <= 7) {
    return { status: "proxima", label: "Proxima", variant: "secondary" as const, days: diffDays };
  } else if (diffDays <= 30) {
    return { status: "cercana", label: "En 30 dias", variant: "outline" as const, days: diffDays };
  }
  return { status: "ok", label: "Al dia", variant: "default" as const, days: diffDays };
}

function formatDate(date: string | Date | null | undefined) {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CriticalAssets() {
  const { toast } = useToast();
  const search = useSearch();
  const params = new URLSearchParams(search);
  
  const [buildingFilter, setBuildingFilter] = useState(params.get("building") || "all");
  const [maintenanceFilter, setMaintenanceFilter] = useState(params.get("maintenance") || "all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<CriticalAsset | null>(null);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [selectedAssetForMaintenance, setSelectedAssetForMaintenance] = useState<CriticalAsset | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<CriticalAsset | null>(null);

  const { data: assets, isLoading } = useQuery<AssetWithBuilding[]>({
    queryKey: ["/api/critical-assets"],
  });

  const { data: buildings } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const form = useForm<AssetForm>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      buildingId: buildingFilter !== "all" ? buildingFilter : "",
      name: "",
      type: "",
      description: "",
      maintenanceFrequency: "",
      lastMaintenanceDate: "",
      nextMaintenanceDate: "",
      maintainerName: "",
    },
  });

  const createAssetMutation = useMutation({
    mutationFn: async (data: AssetForm) => {
      const payload = {
        ...data,
        lastMaintenanceDate: data.lastMaintenanceDate ? new Date(data.lastMaintenanceDate).toISOString() : null,
        nextMaintenanceDate: data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate).toISOString() : null,
        maintenanceFrequency: data.maintenanceFrequency || null,
        maintainerName: data.maintainerName || null,
      };
      if (editingAsset) {
        return apiRequest("PATCH", `/api/critical-assets/${editingAsset.id}`, payload);
      }
      return apiRequest("POST", "/api/critical-assets", { ...payload, status: "pendiente" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/critical-assets"] });
      toast({
        title: editingAsset ? "Equipo actualizado" : "Equipo sugerido",
        description: editingAsset
          ? "Los cambios han sido guardados"
          : "El equipo ha sido enviado para aprobacion",
      });
      setIsDialogOpen(false);
      setEditingAsset(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar el equipo",
        variant: "destructive",
      });
    },
  });

  const approveAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/critical-assets/${id}`, { status: "aprobado" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/critical-assets"] });
      toast({
        title: "Equipo aprobado",
        description: "El equipo ha sido agregado al catalogo",
      });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/critical-assets/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/critical-assets"] });
      toast({
        title: "Equipo eliminado",
        description: "El equipo ha sido removido del catalogo",
      });
    },
  });

  const { data: maintenanceHistory, isLoading: historyLoading } = useQuery<MaintenanceRecord[]>({
    queryKey: ["/api/critical-assets", selectedAssetForHistory?.id, "maintenance-records"],
    enabled: !!selectedAssetForHistory,
  });

  const maintenanceForm = useForm<MaintenanceRecordForm>({
    resolver: zodResolver(maintenanceRecordSchema),
    defaultValues: {
      performedAt: new Date().toISOString().split("T")[0],
      maintainerName: "",
      observations: "",
      cost: "",
    },
  });

  const createMaintenanceRecordMutation = useMutation({
    mutationFn: async (data: MaintenanceRecordForm & { assetId: string }) => {
      return apiRequest("POST", `/api/critical-assets/${data.assetId}/maintenance-records`, {
        performedAt: data.performedAt,
        maintainerName: data.maintainerName,
        observations: data.observations,
        cost: data.cost ? parseFloat(data.cost) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/critical-assets"] });
      toast({
        title: "Mantencion registrada",
        description: "La mantencion ha sido registrada y la proxima fecha actualizada",
      });
      setMaintenanceDialogOpen(false);
      setSelectedAssetForMaintenance(null);
      maintenanceForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo registrar la mantencion",
        variant: "destructive",
      });
    },
  });

  const onSubmitMaintenance = (data: MaintenanceRecordForm) => {
    if (selectedAssetForMaintenance) {
      createMaintenanceRecordMutation.mutate({
        ...data,
        assetId: selectedAssetForMaintenance.id,
      });
    }
  };

  const onSubmit = (data: AssetForm) => {
    createAssetMutation.mutate(data);
  };

  const handleEdit = (asset: CriticalAsset) => {
    setEditingAsset(asset);
    form.reset({
      buildingId: asset.buildingId,
      name: asset.name,
      type: asset.type,
      description: asset.description || "",
      maintenanceFrequency: asset.maintenanceFrequency || "",
      lastMaintenanceDate: asset.lastMaintenanceDate ? new Date(asset.lastMaintenanceDate).toISOString().split("T")[0] : "",
      nextMaintenanceDate: asset.nextMaintenanceDate ? new Date(asset.nextMaintenanceDate).toISOString().split("T")[0] : "",
      maintainerName: asset.maintainerName || "",
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingAsset(null);
    form.reset();
  };

  const filteredAssets = assets?.filter((a) => {
    if (buildingFilter !== "all" && a.buildingId !== buildingFilter) return false;
    
    if (maintenanceFilter !== "all") {
      const status = getMaintenanceStatus(a.nextMaintenanceDate);
      if (maintenanceFilter === "vencida" && status?.status !== "vencida") return false;
      if (maintenanceFilter === "proxima" && !["vencida", "proxima"].includes(status?.status || "")) return false;
      if (maintenanceFilter === "sin_fecha" && a.nextMaintenanceDate) return false;
    }
    
    return true;
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      aprobado: { label: "Aprobado", variant: "default" },
      pendiente: { label: "Pendiente", variant: "outline" },
      rechazado: { label: "Rechazado", variant: "secondary" },
    };
    const { label, variant } = config[status] || config.pendiente;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const overdueCount = assets?.filter(a => {
    const status = getMaintenanceStatus(a.nextMaintenanceDate);
    return status?.status === "vencida";
  }).length || 0;

  const upcomingCount = assets?.filter(a => {
    const status = getMaintenanceStatus(a.nextMaintenanceDate);
    return status?.status === "proxima";
  }).length || 0;

  const noDateCount = assets?.filter(a => !a.nextMaintenanceDate && a.status === "aprobado").length || 0;

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-xl md:text-2xl font-semibold">Equipos Criticos</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-asset">
                <Plus className="h-4 w-4 mr-1" />
                Sugerir Equipo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingAsset ? "Editar Equipo" : "Sugerir Equipo Critico"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                            {buildings?.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name}
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
                        <FormLabel>Tipo de Equipo *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-type">
                              <SelectValue placeholder="Selecciona tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {assetTypes.map((type) => (
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
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre / Identificador *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: Ascensor Torre A"
                            {...field}
                            data-testid="input-asset-name"
                          />
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
                        <FormLabel>Descripcion (opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Detalles adicionales..."
                            className="min-h-20"
                            {...field}
                            data-testid="input-asset-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium text-sm mb-3">Informacion de Mantencion</h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="maintenanceFrequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Frecuencia</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-frequency">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {maintenanceFrequencies.map((freq) => (
                                  <SelectItem key={freq.value} value={freq.value}>
                                    {freq.label}
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
                        name="maintainerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Proveedor</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Nombre proveedor"
                                {...field}
                                data-testid="input-maintainer"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <FormField
                        control={form.control}
                        name="lastMaintenanceDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ultima Mantencion</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                data-testid="input-last-maintenance"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="nextMaintenanceDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Proxima Mantencion</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                data-testid="input-next-maintenance"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDialogClose}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={createAssetMutation.isPending}
                      data-testid="button-save-asset"
                    >
                      {createAssetMutation.isPending ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex gap-2 mt-3 flex-wrap">
          {overdueCount > 0 && (
            <Badge variant="destructive" className="gap-1" data-testid="badge-overdue-count">
              <AlertTriangle className="h-3 w-3" />
              {overdueCount} vencidas
            </Badge>
          )}
          {upcomingCount > 0 && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-upcoming-count">
              <Clock className="h-3 w-3" />
              {upcomingCount} proximas
            </Badge>
          )}
          {noDateCount > 0 && (
            <Badge variant="outline" className="gap-1" data-testid="badge-no-date-count">
              <Calendar className="h-3 w-3" />
              {noDateCount} sin fecha
            </Badge>
          )}
        </div>
        
        <div className="flex gap-2 mt-3">
          <Select
            value={buildingFilter}
            onValueChange={(val) => setBuildingFilter(val)}
          >
            <SelectTrigger className="w-[180px]" data-testid="filter-building">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Edificio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los edificios</SelectItem>
              {buildings?.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={maintenanceFilter}
            onValueChange={(val) => setMaintenanceFilter(val)}
          >
            <SelectTrigger className="w-[180px]" data-testid="filter-maintenance">
              <Wrench className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Estado mantencion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las mantenciones</SelectItem>
              <SelectItem value="vencida">Vencidas</SelectItem>
              <SelectItem value="proxima">Proximas (7 dias)</SelectItem>
              <SelectItem value="sin_fecha">Sin fecha programada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-20 md:pb-6 p-4 md:p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredAssets?.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay equipos registrados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAssets?.map((asset) => {
              const maintenanceStatus = getMaintenanceStatus(asset.nextMaintenanceDate);
              return (
                <Card
                  key={asset.id}
                  className="hover-elevate"
                  data-testid={`card-asset-${asset.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-medium">{asset.name}</h3>
                          {getStatusBadge(asset.status)}
                          {maintenanceStatus && maintenanceStatus.status === "vencida" && (
                            <Badge variant="destructive" className="gap-1" data-testid={`badge-overdue-${asset.id}`}>
                              <AlertTriangle className="h-3 w-3" />
                              Vencida hace {maintenanceStatus.days} dias
                            </Badge>
                          )}
                          {maintenanceStatus && maintenanceStatus.status === "proxima" && (
                            <Badge variant="secondary" className="gap-1" data-testid={`badge-upcoming-${asset.id}`}>
                              <Clock className="h-3 w-3" />
                              En {maintenanceStatus.days} dias
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <span>{asset.type}</span>
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {asset.buildingName || "Edificio"}
                          </span>
                          {asset.maintainerName && (
                            <span className="flex items-center gap-1">
                              <Wrench className="h-3.5 w-3.5" />
                              {asset.maintainerName}
                            </span>
                          )}
                        </div>
                        {asset.description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {asset.description}
                          </p>
                        )}
                        
                        {(asset.lastMaintenanceDate || asset.nextMaintenanceDate || asset.maintenanceFrequency) && (
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 pt-2 border-t flex-wrap" data-testid={`maintenance-info-${asset.id}`}>
                            {asset.maintenanceFrequency && (
                              <span data-testid={`text-frequency-${asset.id}`}>Frecuencia: {maintenanceFrequencies.find(f => f.value === asset.maintenanceFrequency)?.label || asset.maintenanceFrequency}</span>
                            )}
                            {asset.lastMaintenanceDate && (
                              <span data-testid={`text-last-maintenance-${asset.id}`}>Ultima: {formatDate(asset.lastMaintenanceDate)}</span>
                            )}
                            {asset.nextMaintenanceDate && (
                              <span data-testid={`text-next-maintenance-${asset.id}`}>Proxima: {formatDate(asset.nextMaintenanceDate)}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {asset.status === "pendiente" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => approveAssetMutation.mutate(asset.id)}
                              data-testid={`button-approve-${asset.id}`}
                            >
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteAssetMutation.mutate(asset.id)}
                              data-testid={`button-reject-${asset.id}`}
                            >
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(asset)}
                          data-testid={`button-edit-${asset.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {asset.status === "aprobado" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedAssetForMaintenance(asset);
                                maintenanceForm.reset({
                                  performedAt: new Date().toISOString().split("T")[0],
                                  maintainerName: asset.maintainerName || "",
                                  observations: "",
                                  cost: "",
                                });
                                setMaintenanceDialogOpen(true);
                              }}
                              data-testid={`button-register-maintenance-${asset.id}`}
                              title="Registrar mantencion"
                            >
                              <ClipboardCheck className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedAssetForHistory(asset);
                                setHistoryDialogOpen(true);
                              }}
                              data-testid={`button-history-${asset.id}`}
                              title="Ver historial"
                            >
                              <History className="h-4 w-4 text-blue-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal para registrar mantencion */}
      <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Mantencion</DialogTitle>
          </DialogHeader>
          {selectedAssetForMaintenance && (
            <div className="mb-4 p-3 bg-muted rounded-md">
              <p className="font-medium">{selectedAssetForMaintenance.name}</p>
              <p className="text-sm text-muted-foreground">{selectedAssetForMaintenance.type}</p>
              {selectedAssetForMaintenance.maintenanceFrequency && (
                <p className="text-sm text-muted-foreground">
                  Frecuencia: {maintenanceFrequencies.find(f => f.value === selectedAssetForMaintenance.maintenanceFrequency)?.label}
                </p>
              )}
            </div>
          )}
          <Form {...maintenanceForm}>
            <form onSubmit={maintenanceForm.handleSubmit(onSubmitMaintenance)} className="space-y-4">
              <FormField
                control={maintenanceForm.control}
                name="performedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de mantencion</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-maintenance-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={maintenanceForm.control}
                name="maintainerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Realizada por</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del mantenedor o empresa" {...field} data-testid="input-maintainer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={maintenanceForm.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo (opcional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} data-testid="input-maintenance-cost" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={maintenanceForm.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observaciones</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Detalles de la mantencion realizada..." {...field} data-testid="input-maintenance-observations" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMaintenanceDialogOpen(false)}
                  className="flex-1"
                  data-testid="button-cancel-maintenance"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createMaintenanceRecordMutation.isPending}
                  data-testid="button-submit-maintenance"
                >
                  {createMaintenanceRecordMutation.isPending ? "Guardando..." : "Registrar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal para ver historial de mantenciones */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historial de Mantenciones</DialogTitle>
          </DialogHeader>
          {selectedAssetForHistory && (
            <div className="mb-4 p-3 bg-muted rounded-md">
              <p className="font-medium">{selectedAssetForHistory.name}</p>
              <p className="text-sm text-muted-foreground">{selectedAssetForHistory.type}</p>
            </div>
          )}
          {historyLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : maintenanceHistory && maintenanceHistory.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {maintenanceHistory.map((record) => (
                <Card key={record.id} data-testid={`maintenance-record-${record.id}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {formatDate(record.performedAt)}
                        </p>
                        {record.maintainerName && (
                          <p className="text-sm text-muted-foreground">
                            Realizada por: {record.maintainerName}
                          </p>
                        )}
                        {record.observations && (
                          <p className="text-sm mt-1">{record.observations}</p>
                        )}
                      </div>
                      {record.cost && (
                        <Badge variant="secondary">
                          ${parseFloat(record.cost).toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay registros de mantenciones</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
