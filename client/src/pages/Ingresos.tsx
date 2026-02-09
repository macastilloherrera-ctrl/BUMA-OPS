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
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Download,
  Building2,
  FileSpreadsheet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Building, Income } from "@shared/schema";

const months = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i),
}));

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  identified: "Identificado",
  rejected: "Rechazado",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  identified: "default",
  rejected: "destructive",
};

const incomeFormSchema = z.object({
  buildingId: z.string().min(1, "Seleccione un edificio"),
  amount: z.string().min(1, "Ingrese el monto").refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Monto debe ser mayor a 0"),
  department: z.string().min(1, "Ingrese la unidad/departamento"),
  paymentDate: z.string().min(1, "Seleccione la fecha de pago"),
  bank: z.string().optional(),
  bankOperationId: z.string().optional(),
  status: z.enum(["pending", "identified", "rejected"]),
  notes: z.string().optional(),
});

type IncomeFormValues = z.infer<typeof incomeFormSchema>;

export default function Ingresos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: buildings, isLoading: buildingsLoading } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const queryParams = new URLSearchParams();
  if (selectedBuilding !== "all") queryParams.set("buildingId", selectedBuilding);
  if (selectedMonth) queryParams.set("month", selectedMonth);
  if (selectedYear) queryParams.set("year", selectedYear);
  if (selectedStatus !== "all") queryParams.set("status", selectedStatus);

  const { data: incomes, isLoading: incomesLoading } = useQuery<Income[]>({
    queryKey: ["/api/incomes", selectedBuilding, selectedMonth, selectedYear, selectedStatus],
    queryFn: async () => {
      const res = await fetch(`/api/incomes?${queryParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar ingresos");
      return res.json();
    },
  });

  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: {
      buildingId: "",
      amount: "",
      department: "",
      paymentDate: "",
      bank: "",
      bankOperationId: "",
      status: "pending",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: IncomeFormValues) => {
      await apiRequest("POST", "/api/incomes", {
        ...data,
        amount: data.amount,
        paymentDate: new Date(data.paymentDate).toISOString(),
        bank: data.bank || null,
        bankOperationId: data.bankOperationId || null,
        notes: data.notes || null,
        createdBy: user?.id || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incomes"] });
      toast({ title: "Ingreso creado exitosamente" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error al crear ingreso", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: IncomeFormValues }) => {
      await apiRequest("PATCH", `/api/incomes/${id}`, {
        ...data,
        amount: data.amount,
        paymentDate: new Date(data.paymentDate).toISOString(),
        bank: data.bank || null,
        bankOperationId: data.bankOperationId || null,
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incomes"] });
      toast({ title: "Ingreso actualizado exitosamente" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error al actualizar ingreso", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/incomes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incomes"] });
      toast({ title: "Ingreso eliminado exitosamente" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error al eliminar ingreso", description: error.message, variant: "destructive" });
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingIncome(null);
    form.reset({
      buildingId: "",
      amount: "",
      department: "",
      paymentDate: "",
      bank: "",
      bankOperationId: "",
      status: "pending",
      notes: "",
    });
  }

  function openCreate() {
    setEditingIncome(null);
    form.reset({
      buildingId: "",
      amount: "",
      department: "",
      paymentDate: "",
      bank: "",
      bankOperationId: "",
      status: "pending",
      notes: "",
    });
    setDialogOpen(true);
  }

  function openEdit(income: Income) {
    setEditingIncome(income);
    const paymentDate = income.paymentDate ? new Date(income.paymentDate).toISOString().split("T")[0] : "";
    form.reset({
      buildingId: income.buildingId,
      amount: String(income.amount),
      department: income.department,
      paymentDate,
      bank: income.bank || "",
      bankOperationId: income.bankOperationId || "",
      status: income.status as "pending" | "identified" | "rejected",
      notes: income.notes || "",
    });
    setDialogOpen(true);
  }

  function onSubmit(values: IncomeFormValues) {
    if (editingIncome) {
      updateMutation.mutate({ id: editingIncome.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  function handleExportEdipro() {
    const params = new URLSearchParams();
    if (selectedBuilding !== "all") params.set("buildingId", selectedBuilding);
    if (selectedMonth) params.set("month", selectedMonth);
    if (selectedYear) params.set("year", selectedYear);
    window.open(`/api/incomes/export/edipro?${params.toString()}`, "_blank");
  }

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(Number(amount));
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("es-CL");
  };

  const getBuildingName = (buildingId: string) => {
    return buildings?.find((b) => b.id === buildingId)?.name || buildingId;
  };

  const totalAmount = incomes?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;
  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-page-title">Ingresos</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleExportEdipro}
              disabled={!incomes || incomes.length === 0}
              data-testid="button-export-edipro"
            >
              <Download className="h-4 w-4 mr-1" />
              Exportar Edipro
            </Button>
            <Button onClick={openCreate} data-testid="button-create-income">
              <Plus className="h-4 w-4 mr-1" />
              Nuevo Ingreso
            </Button>
          </div>
        </div>

        <div className="mt-4 flex gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
              <SelectTrigger className="w-[200px]" data-testid="select-building">
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

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[150px]" data-testid="select-month">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px]" data-testid="select-year">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year.value} value={year.value}>
                  {year.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[160px]" data-testid="select-status">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="identified">Identificado</SelectItem>
              <SelectItem value="rejected">Rechazado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-20 md:pb-6 p-4 md:p-6">
        {buildingsLoading || incomesLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Ingresos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-amount">
                    {formatCurrency(totalAmount)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Cantidad de Registros
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-record-count">
                    {incomes?.length || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Periodo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-period">
                    {months.find((m) => m.value === selectedMonth)?.label} {selectedYear}
                  </div>
                </CardContent>
              </Card>
            </div>

            {incomes && incomes.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detalle de Ingresos</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">N</TableHead>
                          <TableHead>Edificio</TableHead>
                          <TableHead>Unidad</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Banco</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incomes.map((income, index) => (
                          <TableRow key={income.id} data-testid={`row-income-${income.id}`}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>{getBuildingName(income.buildingId)}</TableCell>
                            <TableCell>{income.department}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(income.amount)}
                            </TableCell>
                            <TableCell>{formatDate(income.paymentDate)}</TableCell>
                            <TableCell>{income.bank || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={statusVariants[income.status]}
                                className={
                                  income.status === "pending"
                                    ? "border-yellow-500 text-yellow-700 dark:text-yellow-400"
                                    : income.status === "identified"
                                      ? "bg-green-600 text-white border-green-600"
                                      : ""
                                }
                                data-testid={`badge-status-${income.id}`}
                              >
                                {statusLabels[income.status] || income.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openEdit(income)}
                                  data-testid={`button-edit-${income.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => setDeleteId(income.id)}
                                  data-testid={`button-delete-${income.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
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
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No hay ingresos registrados para el periodo seleccionado
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Haga clic en "Nuevo Ingreso" para agregar un registro
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingIncome ? "Editar Ingreso" : "Nuevo Ingreso"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="buildingId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Edificio</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="input-building">
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        placeholder="0"
                        data-testid="input-amount"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad/Departamento</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: 101, Local 3"
                        data-testid="input-department"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de pago</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        data-testid="input-payment-date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banco</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nombre del banco"
                        data-testid="input-bank"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankOperationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>N Comprobante</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Número de operación"
                        data-testid="input-bank-operation"
                        {...field}
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
                        <SelectTrigger data-testid="input-status">
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="identified">Identificado</SelectItem>
                        <SelectItem value="rejected">Rechazado</SelectItem>
                      </SelectContent>
                    </Select>
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
                      <Textarea
                        placeholder="Notas adicionales..."
                        data-testid="input-notes"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isMutating} data-testid="button-submit">
                  {isMutating ? "Guardando..." : editingIncome ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar este ingreso? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
