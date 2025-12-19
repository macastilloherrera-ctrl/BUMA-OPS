import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, MapPin, User, Search, Pencil } from "lucide-react";
import type { Building, UserProfile } from "@shared/schema";
import { Link } from "wouter";

const buildingSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  address: z.string().min(1, "La direccion es requerida"),
  status: z.enum(["activo", "inactivo", "en_revision"]),
  assignedExecutiveId: z.string().optional(),
});

type BuildingForm = z.infer<typeof buildingSchema>;

interface BuildingWithExecutive extends Building {
  executiveName?: string;
}

export default function Buildings() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);

  const { data: buildings, isLoading } = useQuery<BuildingWithExecutive[]>({
    queryKey: ["/api/buildings"],
  });

  const { data: executives } = useQuery<UserProfile[]>({
    queryKey: ["/api/users/executives"],
  });

  const form = useForm<BuildingForm>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      name: "",
      address: "",
      status: "activo",
      assignedExecutiveId: "",
    },
  });

  const createBuildingMutation = useMutation({
    mutationFn: async (data: BuildingForm) => {
      if (editingBuilding) {
        return apiRequest("PATCH", `/api/buildings/${editingBuilding.id}`, data);
      }
      return apiRequest("POST", "/api/buildings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings"] });
      toast({
        title: editingBuilding ? "Edificio actualizado" : "Edificio creado",
        description: "Los cambios han sido guardados",
      });
      setIsDialogOpen(false);
      setEditingBuilding(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar el edificio",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BuildingForm) => {
    createBuildingMutation.mutate(data);
  };

  const handleEdit = (building: Building) => {
    setEditingBuilding(building);
    form.reset({
      name: building.name,
      address: building.address,
      status: building.status,
      assignedExecutiveId: building.assignedExecutiveId || "",
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingBuilding(null);
    form.reset();
  };

  const filteredBuildings = buildings?.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      activo: { label: "Activo", variant: "default" },
      inactivo: { label: "Inactivo", variant: "secondary" },
      en_revision: { label: "En Revision", variant: "outline" },
    };
    const { label, variant } = config[status] || config.activo;
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-xl md:text-2xl font-semibold">Edificios</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-building">
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingBuilding ? "Editar Edificio" : "Nuevo Edificio"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nombre del edificio"
                            {...field}
                            data-testid="input-building-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Direccion *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Direccion completa"
                            {...field}
                            data-testid="input-building-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="activo">Activo</SelectItem>
                            <SelectItem value="inactivo">Inactivo</SelectItem>
                            <SelectItem value="en_revision">En Revision</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="assignedExecutiveId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ejecutivo Asignado</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-executive">
                              <SelectValue placeholder="Seleccionar ejecutivo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {executives?.map((exec) => (
                              <SelectItem key={exec.id} value={exec.userId}>
                                {exec.userId}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      disabled={createBuildingMutation.isPending}
                      data-testid="button-save-building"
                    >
                      {createBuildingMutation.isPending ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar edificios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-buildings"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-20 md:pb-6 p-4 md:p-6">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : filteredBuildings?.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay edificios registrados</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredBuildings?.map((building) => (
              <Card
                key={building.id}
                className="hover-elevate"
                data-testid={`card-building-${building.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{building.name}</CardTitle>
                    {getStatusBadge(building.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{building.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4 flex-shrink-0" />
                    <span>{building.executiveName || "Sin asignar"}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(building)}
                      data-testid={`button-edit-${building.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/equipos?building=${building.id}`}>
                        Ver Equipos
                      </Link>
                    </Button>
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
