import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Plus, Upload, FileText, AlertTriangle, CheckCircle2,
  Clock, Building2, X, Pencil, Trash2, Calendar, Search,
  ShieldAlert, ShieldCheck, Filter, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { Building, ComplianceItemWithStatus } from "@shared/schema";

// ─── Helpers ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  certificacion_gas: "Certificación Gas",
  certificacion_ascensores: "Certificación Ascensores",
  certificacion_electrica: "Certificación Eléctrica",
  certificacion_hvac: "Certificación HVAC / Clima",
  revision_extintores: "Revisión Extintores",
  poliza_incendio: "Póliza de Incendio",
  poliza_responsabilidad_civil: "Póliza RC",
  plan_emergencia: "Plan de Emergencia",
  contrato_administracion: "Contrato Administración",
  contrato_mantencion: "Contrato Mantención",
  permiso_edificacion: "Permiso de Edificación",
  inspeccion_tecnica: "Inspección Técnica",
  otro: "Otro",
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

function getStatusConfig(status: string) {
  switch (status) {
    case "vencido":
      return {
        label: "Vencido",
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        icon: AlertTriangle,
        dot: "bg-red-500",
      };
    case "por_vencer":
      return {
        label: "Por Vencer",
        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        icon: Clock,
        dot: "bg-yellow-500",
      };
    case "vigente":
      return {
        label: "Vigente",
        color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        icon: CheckCircle2,
        dot: "bg-green-500",
      };
    default:
      return {
        label: "Sin Fecha",
        color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
        icon: Calendar,
        dot: "bg-gray-400",
      };
  }
}

function formatDays(days: number | null): string {
  if (days === null) return "—";
  if (days < 0) return `Vencido hace ${Math.abs(days)} días`;
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `${days} días`;
}

// ─── Form Schema ─────────────────────────────────────────────────────────────

const formSchema = z.object({
  buildingId: z.string().min(1, "Selecciona un edificio"),
  category: z.string().min(1, "Selecciona una categoría"),
  name: z.string().min(1, "Nombre requerido").max(255),
  description: z.string().optional(),
  expiryDate: z.string().optional(),
  reminderDays: z.coerce.number().int().min(1).max(365).default(30),
  notes: z.string().optional(),
  documentUrl: z.string().optional(),
  documentName: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CumplimientoLegal() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ComplianceItemWithStatus | null>(null);
  const [activeTab, setActiveTab] = useState("todos");

  const { data: buildings = [] } = useQuery<Building[]>({ queryKey: ["/api/buildings"] });
  const { data: items = [], isLoading } = useQuery<ComplianceItemWithStatus[]>({
    queryKey: ["/api/compliance-items"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { reminderDays: 30 },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => apiRequest("POST", "/api/compliance-items", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-items"] });
      toast({ title: "Ítem creado", description: "El ítem de cumplimiento fue registrado." });
      setDialogOpen(false);
      form.reset({ reminderDays: 30 });
    },
    onError: () => toast({ title: "Error", description: "No se pudo crear el ítem.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FormValues> }) =>
      apiRequest("PATCH", `/api/compliance-items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-items"] });
      toast({ title: "Ítem actualizado" });
      setDialogOpen(false);
      setEditingItem(null);
      form.reset({ reminderDays: 30 });
    },
    onError: () => toast({ title: "Error", description: "No se pudo actualizar el ítem.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/compliance-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-items"] });
      toast({ title: "Ítem eliminado" });
    },
    onError: () => toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" }),
  });

  function openCreate() {
    setEditingItem(null);
    form.reset({ reminderDays: 30 });
    setDialogOpen(true);
  }

  function openEdit(item: ComplianceItemWithStatus) {
    setEditingItem(item);
    form.reset({
      buildingId: item.buildingId,
      category: item.category,
      name: item.name,
      description: item.description || "",
      expiryDate: item.expiryDate ? format(new Date(item.expiryDate), "yyyy-MM-dd") : "",
      reminderDays: item.reminderDays,
      notes: item.notes || "",
      documentUrl: item.documentUrl || "",
      documentName: item.documentName || "",
    });
    setDialogOpen(true);
  }

  function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      expiryDate: values.expiryDate ? values.expiryDate : undefined,
    };
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  // ── Filter logic ──
  const filtered = items.filter((item) => {
    const matchSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.buildingName || "").toLowerCase().includes(search.toLowerCase()) ||
      CATEGORY_LABELS[item.category]?.toLowerCase().includes(search.toLowerCase());
    const matchBuilding = filterBuilding === "all" || item.buildingId === filterBuilding;
    const matchStatus = filterStatus === "all" || item.status === filterStatus;
    const matchCategory = filterCategory === "all" || item.category === filterCategory;
    const matchTab =
      activeTab === "todos" ||
      (activeTab === "vencido" && item.status === "vencido") ||
      (activeTab === "por_vencer" && item.status === "por_vencer") ||
      (activeTab === "vigente" && item.status === "vigente") ||
      (activeTab === "sin_fecha" && item.status === "sin_fecha");
    return matchSearch && matchBuilding && matchStatus && matchCategory && matchTab;
  });

  // ── Summary counters ──
  const counters = {
    vencido: items.filter((i) => i.status === "vencido").length,
    por_vencer: items.filter((i) => i.status === "por_vencer").length,
    vigente: items.filter((i) => i.status === "vigente").length,
    sin_fecha: items.filter((i) => i.status === "sin_fecha").length,
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            Cumplimiento Legal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Seguimiento de certificaciones, pólizas, contratos y documentos regulatorios de todos los edificios
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-nuevo-item" className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo ítem
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: "vencido", label: "Vencidos", icon: AlertTriangle, cardClass: "border-red-200 dark:border-red-800", iconClass: "text-red-500", countClass: "text-red-600 dark:text-red-400" },
          { key: "por_vencer", label: "Por Vencer", icon: Clock, cardClass: "border-yellow-200 dark:border-yellow-800", iconClass: "text-yellow-500", countClass: "text-yellow-600 dark:text-yellow-400" },
          { key: "vigente", label: "Vigentes", icon: CheckCircle2, cardClass: "border-green-200 dark:border-green-800", iconClass: "text-green-500", countClass: "text-green-600 dark:text-green-400" },
          { key: "sin_fecha", label: "Sin Fecha", icon: Calendar, cardClass: "border-gray-200 dark:border-gray-700", iconClass: "text-gray-400", countClass: "text-gray-500" },
        ].map(({ key, label, icon: Icon, cardClass, iconClass, countClass }) => (
          <Card
            key={key}
            className={`cursor-pointer border ${cardClass} hover:shadow-md transition-shadow`}
            onClick={() => setActiveTab(key)}
            data-testid={`card-summary-${key}`}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-8 w-8 ${iconClass}`} />
              <div>
                <p className={`text-2xl font-bold ${countClass}`}>{counters[key as keyof typeof counters]}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, edificio o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={filterBuilding} onValueChange={setFilterBuilding}>
          <SelectTrigger className="w-[200px]" data-testid="select-filter-building">
            <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Todos los edificios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los edificios</SelectItem>
            {buildings.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]" data-testid="select-filter-category">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {CATEGORY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs + Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="todos">Todos ({items.length})</TabsTrigger>
          <TabsTrigger value="vencido" className="text-red-600 dark:text-red-400">
            Vencidos ({counters.vencido})
          </TabsTrigger>
          <TabsTrigger value="por_vencer" className="text-yellow-600 dark:text-yellow-400">
            Por Vencer ({counters.por_vencer})
          </TabsTrigger>
          <TabsTrigger value="vigente">Vigentes ({counters.vigente})</TabsTrigger>
          <TabsTrigger value="sin_fecha">Sin Fecha ({counters.sin_fecha})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hay ítems en esta categoría</p>
              <p className="text-sm mt-1">
                {activeTab === "todos" ? "Haz clic en «Nuevo ítem» para registrar el primero." : "No hay elementos con este estado."}
              </p>
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estado</TableHead>
                    <TableHead>Nombre / Categoría</TableHead>
                    <TableHead>Edificio</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Tiempo restante</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const sc = getStatusConfig(item.status);
                    const Icon = sc.icon;
                    return (
                      <TableRow key={item.id} data-testid={`row-compliance-${item.id}`}>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                            {sc.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[item.category] || item.category}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {item.buildingName || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.expiryDate
                            ? format(new Date(item.expiryDate), "dd MMM yyyy", { locale: es })
                            : <span className="text-muted-foreground">Sin fecha</span>}
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm font-medium ${
                            item.status === "vencido" ? "text-red-600 dark:text-red-400"
                            : item.status === "por_vencer" ? "text-yellow-600 dark:text-yellow-400"
                            : item.status === "vigente" ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground"
                          }`}>
                            {formatDays(item.daysUntilExpiry)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {item.documentUrl ? (
                            <a
                              href={item.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              data-testid={`link-doc-${item.id}`}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {item.documentName || "Ver"}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin adjunto</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(item)}
                              data-testid={`button-edit-${item.id}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm(`¿Eliminar "${item.name}"?`)) {
                                  deleteMutation.mutate(item.id);
                                }
                              }}
                              data-testid={`button-delete-${item.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditingItem(null); form.reset({ reminderDays: 30 }); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar ítem de cumplimiento" : "Nuevo ítem de cumplimiento"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="buildingId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edificio *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-building">
                            <SelectValue placeholder="Seleccionar edificio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {buildings.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría *</FormLabel>
                      <Select value={field.value} onValueChange={(v) => {
                        field.onChange(v);
                        if (!form.getValues("name")) {
                          form.setValue("name", CATEGORY_LABELS[v] || "");
                        }
                      }}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Certificación Gas Anual 2026" data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de vencimiento</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-expiry-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reminderDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alerta (días antes del vencimiento)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={1} max={365} data-testid="input-reminder-days" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Detalles del ítem..." rows={2} data-testid="textarea-description" />
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
                    <FormLabel>Notas internas</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Observaciones, proveedor, contacto..." rows={2} data-testid="textarea-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Document upload */}
              <div className="space-y-2">
                <FormLabel>Documento adjunto (PDF, imagen)</FormLabel>
                {form.watch("documentUrl") ? (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm flex-1 truncate">{form.watch("documentName") || "Documento adjunto"}</span>
                    <a href={`/objects${form.watch("documentUrl")}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" type="button" className="h-7 w-7">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="h-7 w-7 text-destructive"
                      onClick={() => { form.setValue("documentUrl", ""); form.setValue("documentName", ""); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={20 * 1024 * 1024}
                    onGetUploadParameters={async (file) => {
                      const res = await fetch("/api/uploads/request-url", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
                      });
                      if (!res.ok) throw new Error("Failed to get upload URL");
                      const { uploadURL, objectPath } = await res.json();
                      (file.meta as Record<string, unknown>).objectPath = objectPath;
                      (file.meta as Record<string, unknown>).fileName = file.name;
                      return { method: "PUT" as const, url: uploadURL, headers: { "Content-Type": file.type || "application/octet-stream" } };
                    }}
                    onComplete={(result) => {
                      const file = result.successful?.[0];
                      if (file?.meta?.objectPath) {
                        form.setValue("documentUrl", file.meta.objectPath as string);
                        form.setValue("documentName", (file.meta.fileName as string) || file.name || "Documento");
                      }
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Subir documento
                  </ObjectUploader>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save"
                >
                  {editingItem ? "Guardar cambios" : "Crear ítem"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
