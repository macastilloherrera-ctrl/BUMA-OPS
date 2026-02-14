import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Repeat,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Building2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Building } from "@shared/schema";

interface RecurringExpenseTemplate {
  id: string;
  buildingId: string;
  category: string;
  description: string | null;
  vendorId: string | null;
  vendorName: string | null;
  frequency: "monthly";
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const categories = [
  { value: "agua", label: "Agua" },
  { value: "luz", label: "Luz" },
  { value: "gas", label: "Gas" },
  { value: "internet", label: "Internet" },
  { value: "aseo", label: "Aseo" },
  { value: "materiales", label: "Materiales" },
  { value: "seguridad", label: "Seguridad" },
  { value: "jardines", label: "Jardines" },
  { value: "piscina", label: "Piscina" },
  { value: "administracion", label: "Administración" },
  { value: "otro", label: "Otro" },
];

const categoryLabels: Record<string, string> = Object.fromEntries(
  categories.map((c) => [c.value, c.label])
);

const templateFormSchema = z.object({
  buildingId: z.string().min(1, "Seleccione un edificio"),
  category: z.string().min(1, "Seleccione una categoría"),
  description: z.string().optional(),
  vendorName: z.string().optional(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

export default function RecurringExpenses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<RecurringExpenseTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: buildings, isLoading: buildingsLoading } = useQuery<Building[]>(
    {
      queryKey: ["/api/buildings"],
    }
  );

  const queryParams = new URLSearchParams();
  if (selectedBuilding !== "all")
    queryParams.set("buildingId", selectedBuilding);

  const { data: templates, isLoading: templatesLoading } = useQuery<
    RecurringExpenseTemplate[]
  >({
    queryKey: ["/api/recurring-expense-templates", selectedBuilding],
    queryFn: async () => {
      const res = await fetch(
        `/api/recurring-expense-templates?${queryParams.toString()}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Error al cargar consumos recurrentes");
      return res.json();
    },
  });

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      buildingId: "",
      category: "",
      description: "",
      vendorName: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      await apiRequest("POST", "/api/recurring-expense-templates", {
        ...data,
        description: data.description || null,
        vendorName: data.vendorName || null,
        createdBy: user?.id || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/recurring-expense-templates"],
      });
      toast({ title: "Consumo recurrente creado exitosamente" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear consumo recurrente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<TemplateFormValues & { isActive: boolean }>;
    }) => {
      await apiRequest(
        "PATCH",
        `/api/recurring-expense-templates/${id}`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/recurring-expense-templates"],
      });
      toast({ title: "Consumo recurrente actualizado exitosamente" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar consumo recurrente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/recurring-expense-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/recurring-expense-templates"],
      });
      toast({ title: "Consumo recurrente eliminado exitosamente" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar consumo recurrente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingTemplate(null);
    form.reset({
      buildingId: "",
      category: "",
      description: "",
      vendorName: "",
    });
  }

  function openCreate() {
    setEditingTemplate(null);
    form.reset({
      buildingId: "",
      category: "",
      description: "",
      vendorName: "",
    });
    setDialogOpen(true);
  }

  function openEdit(template: RecurringExpenseTemplate) {
    setEditingTemplate(template);
    form.reset({
      buildingId: template.buildingId,
      category: template.category,
      description: template.description || "",
      vendorName: template.vendorName || "",
    });
    setDialogOpen(true);
  }

  function onSubmit(values: TemplateFormValues) {
    if (editingTemplate) {
      updateMutation.mutate({
        id: editingTemplate.id,
        data: {
          ...values,
          description: values.description || null,
          vendorName: values.vendorName || null,
        } as any,
      });
    } else {
      createMutation.mutate(values);
    }
  }

  function handleToggleActive(template: RecurringExpenseTemplate) {
    updateMutation.mutate({
      id: template.id,
      data: { isActive: !template.isActive },
    });
  }

  const getBuildingName = (buildingId: string) => {
    return buildings?.find((b) => b.id === buildingId)?.name || buildingId;
  };

  const activeTemplates =
    templates?.filter((t) => t.isActive) || [];
  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Repeat className="h-6 w-6 text-primary" />
            <h1
              className="text-xl md:text-2xl font-semibold"
              data-testid="text-page-title"
            >
              Consumos Recurrentes
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={openCreate} data-testid="button-create-template">
              <Plus className="h-4 w-4 mr-1" />
              Nuevo Consumo Recurrente
            </Button>
          </div>
        </div>

        <div className="mt-4 flex gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select
              value={selectedBuilding}
              onValueChange={setSelectedBuilding}
            >
              <SelectTrigger
                className="w-[200px]"
                data-testid="select-building-filter"
              >
                <SelectValue placeholder="Seleccionar edificio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los edificios</SelectItem>
                {buildings?.map((building) => (
                  <SelectItem key={building.id} value={building.id}>
                    {building.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-20 md:pb-6 p-4 md:p-6">
        {buildingsLoading || templatesLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Plantillas Activas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="text-2xl font-bold"
                    data-testid="text-active-count"
                  >
                    {activeTemplates.length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Plantillas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="text-2xl font-bold"
                    data-testid="text-total-count"
                  >
                    {templates?.length || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {templates && templates.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Detalle de Consumos Recurrentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Edificio</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Proveedor</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">
                            Acciones
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {templates.map((template) => (
                          <TableRow
                            key={template.id}
                            data-testid={`row-template-${template.id}`}
                          >
                            <TableCell>
                              {getBuildingName(template.buildingId)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {categoryLabels[template.category] ||
                                  template.category}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {template.description || "-"}
                            </TableCell>
                            <TableCell>
                              {template.vendorName || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  template.isActive ? "default" : "outline"
                                }
                                data-testid={`badge-status-${template.id}`}
                              >
                                {template.isActive ? "Activo" : "Inactivo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    handleToggleActive(template)
                                  }
                                  data-testid={`button-toggle-${template.id}`}
                                  title={
                                    template.isActive
                                      ? "Desactivar"
                                      : "Activar"
                                  }
                                >
                                  {template.isActive ? (
                                    <ToggleRight className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openEdit(template)}
                                  data-testid={`button-edit-${template.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setDeleteId(template.id)}
                                  data-testid={`button-delete-${template.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Repeat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p
                    className="text-muted-foreground"
                    data-testid="text-empty-state"
                  >
                    No hay consumos recurrentes registrados
                  </p>
                  <Button
                    className="mt-4"
                    onClick={openCreate}
                    data-testid="button-create-template-empty"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Crear primer consumo recurrente
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingTemplate
                ? "Editar Consumo Recurrente"
                : "Nuevo Consumo Recurrente"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              data-testid="form-template"
            >
              <FormField
                control={form.control}
                name="buildingId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Edificio</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-building">
                          <SelectValue placeholder="Seleccionar edificio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {buildings?.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.name}
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descripción opcional del consumo"
                        data-testid="input-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nombre del proveedor"
                        data-testid="input-vendor-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isMutating}
                  data-testid="button-submit"
                >
                  {isMutating
                    ? "Guardando..."
                    : editingTemplate
                    ? "Actualizar"
                    : "Crear"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Consumo Recurrente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El consumo recurrente será
              eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
