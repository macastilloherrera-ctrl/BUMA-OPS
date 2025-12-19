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
import { Wrench, Plus, Building2, Check, X, Pencil, Trash2 } from "lucide-react";
import type { CriticalAsset, Building } from "@shared/schema";

const assetSchema = z.object({
  buildingId: z.string().min(1, "Selecciona un edificio"),
  name: z.string().min(1, "El nombre es requerido"),
  type: z.string().min(1, "El tipo es requerido"),
  description: z.string().optional(),
});

type AssetForm = z.infer<typeof assetSchema>;

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

export default function CriticalAssets() {
  const { toast } = useToast();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const buildingFilter = params.get("building") || "all";
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<CriticalAsset | null>(null);

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
    },
  });

  const createAssetMutation = useMutation({
    mutationFn: async (data: AssetForm) => {
      if (editingAsset) {
        return apiRequest("PATCH", `/api/critical-assets/${editingAsset.id}`, data);
      }
      return apiRequest("POST", "/api/critical-assets", { ...data, status: "pendiente" });
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
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingAsset(null);
    form.reset();
  };

  const filteredAssets = assets?.filter((a) =>
    buildingFilter === "all" || a.buildingId === buildingFilter
  );

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      aprobado: { label: "Aprobado", variant: "default" },
      pendiente: { label: "Pendiente", variant: "outline" },
      rechazado: { label: "Rechazado", variant: "secondary" },
    };
    const { label, variant } = config[status] || config.pendiente;
    return <Badge variant={variant}>{label}</Badge>;
  };

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
            <DialogContent>
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
        <div className="mt-3">
          <Select
            value={buildingFilter}
            onValueChange={(val) => {
              const url = val === "all" ? "/equipos" : `/equipos?building=${val}`;
              window.history.pushState({}, "", url);
            }}
          >
            <SelectTrigger data-testid="filter-building">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por edificio" />
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
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-20 md:pb-6 p-4 md:p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filteredAssets?.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay equipos registrados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAssets?.map((asset) => (
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
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{asset.type}</span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {asset.buildingName || "Edificio"}
                        </span>
                      </div>
                      {asset.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {asset.description}
                        </p>
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
