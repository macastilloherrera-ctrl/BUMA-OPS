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
  FormDescription,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Download,
  Building2,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  Repeat,
  ArrowRightLeft,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Building, Expense, UserProfile } from "@shared/schema";

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

const paymentStatusLabels: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  cancelled: "Cancelado",
};

const paymentStatusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  paid: "default",
  cancelled: "destructive",
};

const inclusionStatusLabels: Record<string, string> = {
  included: "Incluido",
  postponed: "Postergado",
};

const paymentMethodLabels: Record<string, string> = {
  transferencia: "Transferencia",
  pac: "PAC",
  pago_electronico: "Pago electrónico",
  cheque: "Cheque",
};

const sourceTypeLabels: Record<string, string> = {
  ticket: "Ticket",
  recurrent: "Gasto Común",
  project: "Proyecto",
  gasto_comun: "Gasto Común",
};

const expenseFormSchema = z.object({
  buildingId: z.string().min(1, "Seleccione un edificio"),
  description: z.string().min(1, "Ingrese la descripción"),
  amount: z.string().min(1, "Ingrese el monto").refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Monto debe ser mayor a 0"),
  category: z.string().optional(),
  vendorName: z.string().optional(),
  documentType: z.enum(["factura", "boleta", "otro", ""]).optional(),
  documentNumber: z.string().optional(),
  paymentDate: z.string().optional(),
  paymentMethod: z.enum(["transferencia", "pac", "pago_electronico", "cheque", ""]).optional(),
  paymentStatus: z.enum(["pending", "paid", "cancelled"]),
  inclusionStatus: z.enum(["included", "postponed"]),
  postponementReason: z.string().optional(),
  sourceType: z.enum(["ticket", "recurrent", "project", "gasto_comun"]),
  consumptionPeriodFrom: z.string().optional(),
  consumptionPeriodTo: z.string().optional(),
  chargeMonth: z.string().optional(),
  chargeYear: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.inclusionStatus === "postponed" && (!data.postponementReason || data.postponementReason.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Debe ingresar el motivo de postergación cuando el estado es Postergado",
  path: ["postponementReason"],
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export default function Egresos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedSourceType, setSelectedSourceType] = useState<string>("all");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>("all");
  const [exportFormat, setExportFormat] = useState<string>("edipro");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
  });
  const isConserjeria = userProfile?.role === "conserjeria";

  const { data: buildings, isLoading: buildingsLoading } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const queryParams = new URLSearchParams();
  if (selectedBuilding !== "all") queryParams.set("buildingId", selectedBuilding);
  if (selectedMonth) queryParams.set("month", selectedMonth);
  if (selectedYear) queryParams.set("year", selectedYear);
  if (selectedSourceType !== "all") queryParams.set("sourceType", selectedSourceType);
  if (selectedPaymentStatus !== "all") queryParams.set("paymentStatus", selectedPaymentStatus);

  const { data: expenses, isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses", selectedBuilding, selectedMonth, selectedYear, selectedSourceType, selectedPaymentStatus],
    queryFn: async () => {
      const res = await fetch(`/api/expenses?${queryParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar egresos");
      return res.json();
    },
  });

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      buildingId: "",
      description: "",
      amount: "",
      category: "",
      vendorName: "",
      documentType: "",
      documentNumber: "",
      paymentDate: "",
      paymentMethod: "",
      paymentStatus: "pending",
      inclusionStatus: "included",
      postponementReason: "",
      sourceType: "ticket",
      consumptionPeriodFrom: "",
      consumptionPeriodTo: "",
      chargeMonth: "",
      chargeYear: "",
      notes: "",
    },
  });

  function buildExpensePayload(data: ExpenseFormValues) {
    return {
      buildingId: data.buildingId,
      description: data.description,
      amount: data.amount,
      category: data.category || null,
      vendorName: data.vendorName || null,
      documentType: data.documentType || null,
      documentNumber: data.documentNumber || null,
      paymentDate: data.paymentDate ? new Date(data.paymentDate).toISOString() : null,
      paymentMethod: data.paymentMethod || null,
      paymentStatus: data.paymentStatus,
      inclusionStatus: data.inclusionStatus,
      postponementReason: data.inclusionStatus === "postponed" ? (data.postponementReason || null) : null,
      sourceType: data.sourceType,
      consumptionPeriodFrom: data.consumptionPeriodFrom ? new Date(data.consumptionPeriodFrom).toISOString() : null,
      consumptionPeriodTo: data.consumptionPeriodTo ? new Date(data.consumptionPeriodTo).toISOString() : null,
      chargeMonth: data.chargeMonth ? parseInt(data.chargeMonth) : null,
      chargeYear: data.chargeYear ? parseInt(data.chargeYear) : null,
      notes: data.notes || null,
    };
  }

  const createMutation = useMutation({
    mutationFn: async (data: ExpenseFormValues) => {
      await apiRequest("POST", "/api/expenses", {
        ...buildExpensePayload(data),
        createdBy: user?.id || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Egreso creado exitosamente" });
      closeDialog();
    },
    onError: (error: Error) => {
      const isDuplicate = error.message.includes("ya existe");
      toast({ title: isDuplicate ? "Documento duplicado" : "Error al crear egreso", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ExpenseFormValues }) => {
      await apiRequest("PATCH", `/api/expenses/${id}`, buildExpensePayload(data));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Egreso actualizado exitosamente" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error al actualizar egreso", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Egreso eliminado exitosamente" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error al eliminar egreso", description: error.message, variant: "destructive" });
    },
  });

  const generateFromTemplatesMutation = useMutation({
    mutationFn: async () => {
      const buildingId = selectedBuilding === "all" ? null : selectedBuilding;
      if (!buildingId) throw new Error("Seleccione un edificio específico");
      const res = await apiRequest("POST", "/api/expenses/generate-from-templates", {
        buildingId,
        chargeMonth: parseInt(selectedMonth),
        chargeYear: parseInt(selectedYear),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: `${data.created} gasto(s) recurrente(s) generado(s)`, description: data.skipped > 0 ? `${data.skipped} ya existían para este período` : undefined });
    },
    onError: (error: Error) => {
      toast({ title: "Error al generar gastos", description: error.message, variant: "destructive" });
    },
  });

  const { data: vendorList } = useQuery<{ id: string; name: string; rut: string | null }[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: maintainerList } = useQuery<{ id: string; companyName: string }[]>({
    queryKey: ["/api/maintainers"],
  });

  const { data: categoryList } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/maintainers/categories"],
  });

  const combinedProviders = (() => {
    const map = new Map<string, string>();
    maintainerList?.forEach(m => map.set(m.companyName.toUpperCase(), m.companyName));
    vendorList?.forEach(v => map.set(v.name.toUpperCase(), v.name));
    return Array.from(map.entries()).map(([key, name]) => ({ key, name })).sort((a, b) => a.name.localeCompare(b.name));
  })();

  const [vendorSearch, setVendorSearch] = useState("");
  const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);

  const defaultFormValues: ExpenseFormValues = {
    buildingId: "",
    description: "",
    amount: "",
    category: "",
    vendorName: "",
    documentType: "",
    documentNumber: "",
    paymentDate: "",
    paymentMethod: "",
    paymentStatus: "pending",
    inclusionStatus: "included",
    postponementReason: "",
    sourceType: "ticket",
    consumptionPeriodFrom: "",
    consumptionPeriodTo: "",
    chargeMonth: "",
    chargeYear: "",
    notes: "",
  };

  function closeDialog() {
    setDialogOpen(false);
    setEditingExpense(null);
    form.reset(defaultFormValues);
    setVendorSearch("");
    setShowVendorSuggestions(false);
  }

  function openCreate() {
    setEditingExpense(null);
    let conserjeriaBuilding = "";
    if (isConserjeria) {
      if ((userProfile as any)?.assignedBuildings?.length) {
        conserjeriaBuilding = (userProfile as any).assignedBuildings[0];
      } else if (buildings?.length) {
        const myBuilding = buildings.find((b: any) => b.conserjeriaUserId === user?.id);
        if (myBuilding) conserjeriaBuilding = myBuilding.id;
        else if (buildings.length === 1) conserjeriaBuilding = buildings[0].id;
      }
    }
    form.reset({
      ...defaultFormValues,
      sourceType: "gasto_comun",
      buildingId: isConserjeria ? conserjeriaBuilding : "",
      paymentStatus: isConserjeria ? "pending" : "pending",
      inclusionStatus: "included",
    });
    setDialogOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditingExpense(expense);
    const paymentDate = expense.paymentDate ? new Date(expense.paymentDate).toISOString().split("T")[0] : "";
    const consumptionFrom = (expense as any).consumptionPeriodFrom ? new Date((expense as any).consumptionPeriodFrom).toISOString().split("T")[0] : "";
    const consumptionTo = (expense as any).consumptionPeriodTo ? new Date((expense as any).consumptionPeriodTo).toISOString().split("T")[0] : "";
    form.reset({
      buildingId: expense.buildingId,
      description: expense.description,
      amount: String(expense.amount),
      category: expense.category || "",
      vendorName: expense.vendorName || "",
      documentType: (expense as any).documentType || "",
      documentNumber: expense.documentNumber || "",
      paymentDate,
      paymentMethod: (expense.paymentMethod as ExpenseFormValues["paymentMethod"]) || "",
      paymentStatus: expense.paymentStatus as "pending" | "paid" | "cancelled",
      inclusionStatus: expense.inclusionStatus as "included" | "postponed",
      postponementReason: expense.postponementReason || "",
      sourceType: expense.sourceType as "ticket" | "recurrent" | "project" | "gasto_comun",
      consumptionPeriodFrom: consumptionFrom,
      consumptionPeriodTo: consumptionTo,
      chargeMonth: (expense as any).chargeMonth ? String((expense as any).chargeMonth) : "",
      chargeYear: (expense as any).chargeYear ? String((expense as any).chargeYear) : "",
      notes: expense.notes || "",
    });
    setDialogOpen(true);
  }

  function onSubmit(values: ExpenseFormValues) {
    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  function handleExport(format: string) {
    const params = new URLSearchParams();
    if (selectedBuilding !== "all") params.set("buildingId", selectedBuilding);
    if (selectedMonth) params.set("month", selectedMonth);
    if (selectedYear) params.set("year", selectedYear);
    params.set("format", format);
    window.open(`/api/expenses/export?${params.toString()}`, "_blank");
  }

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(Number(amount));
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    const s = typeof date === "string" ? date : date.toISOString();
    const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return new Date(date).toLocaleDateString("es-CL");
  };

  const getBuildingName = (buildingId: string) => {
    return buildings?.find((b) => b.id === buildingId)?.name || buildingId;
  };

  const totalAmount = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const paidAmount = expenses?.filter((e) => e.paymentStatus === "paid").reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const pendingAmount = expenses?.filter((e) => e.paymentStatus === "pending").reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const isMutating = createMutation.isPending || updateMutation.isPending;

  const deferredExpenses = expenses?.filter((e: any) => e.deferredFromMonth && e.deferredFromYear) || [];
  const deferredCount = deferredExpenses.length;
  const deferredTotal = deferredExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

  const getMonthLabel = (month: number) => months.find(m => m.value === String(month))?.label || String(month);

  const deferMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await apiRequest("PATCH", `/api/expenses/${id}`, {
        inclusionStatus: "postponed",
        postponementReason: reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Gasto aplazado al mes siguiente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error al aplazar gasto", description: error.message, variant: "destructive" });
    },
  });

  const [deferDialogId, setDeferDialogId] = useState<string | null>(null);
  const [deferReason, setDeferReason] = useState("");

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-page-title">
              {isConserjeria ? "Cuentas de Servicios" : "Egresos"}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!isConserjeria && (
              <>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger className="w-[150px]" data-testid="select-export-format">
                    <SelectValue placeholder="Formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="edipro">Edipro</SelectItem>
                    <SelectItem value="comunidadfeliz">Comunidad Feliz</SelectItem>
                    <SelectItem value="kastor">Kastor</SelectItem>
                    <SelectItem value="generico">Genérico</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => handleExport(exportFormat)}
                  disabled={!expenses || expenses.length === 0}
                  data-testid="button-export"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Exportar
                </Button>
              </>
            )}
            {!isConserjeria && selectedBuilding !== "all" && (
              <Button
                variant="outline"
                onClick={() => generateFromTemplatesMutation.mutate()}
                disabled={generateFromTemplatesMutation.isPending}
                data-testid="button-generate-recurring"
              >
                <Repeat className="h-4 w-4 mr-1" />
                {generateFromTemplatesMutation.isPending ? "Generando..." : "Generar Recurrentes"}
              </Button>
            )}
            <Button onClick={openCreate} data-testid="button-create-expense">
              <Plus className="h-4 w-4 mr-1" />
              {isConserjeria ? "Registrar Cuenta" : "Nuevo Egreso"}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex gap-3 flex-wrap">
          {!isConserjeria && (
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
          )}

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

          {!isConserjeria && (
            <Select value={selectedSourceType} onValueChange={setSelectedSourceType}>
              <SelectTrigger className="w-[160px]" data-testid="select-source-type">
                <SelectValue placeholder="Tipo origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="gasto_comun">Gasto Común</SelectItem>
                <SelectItem value="ticket">Ticket</SelectItem>
                <SelectItem value="project">Proyecto</SelectItem>
              </SelectContent>
            </Select>
          )}

          {!isConserjeria && (
            <Select value={selectedPaymentStatus} onValueChange={setSelectedPaymentStatus}>
              <SelectTrigger className="w-[160px]" data-testid="select-payment-status">
                <SelectValue placeholder="Estado pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-20 md:pb-6 p-4 md:p-6">
        {buildingsLoading || expensesLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            {!isConserjeria && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Egresos
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-expenses">
                      {formatCurrency(totalAmount)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pagados
                    </CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600" data-testid="text-paid-expenses">
                      {formatCurrency(paidAmount)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pendientes
                    </CardTitle>
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600" data-testid="text-pending-expenses">
                      {formatCurrency(pendingAmount)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {!isConserjeria && deferredCount > 0 && (
              <div className="flex items-center gap-3 p-3 mb-4 rounded-md border border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800" data-testid="alert-deferred-expenses">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="font-medium text-orange-800 dark:text-orange-300">
                    {deferredCount} {deferredCount === 1 ? "gasto aplazado" : "gastos aplazados"} de meses anteriores
                  </span>
                  <span className="text-orange-700 dark:text-orange-400 ml-1">
                    por {formatCurrency(deferredTotal)}
                  </span>
                </div>
              </div>
            )}

            {expenses && expenses.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detalle de Egresos</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">N</TableHead>
                          {!isConserjeria && <TableHead>Edificio</TableHead>}
                          <TableHead className="max-w-[200px]">Descripción</TableHead>
                          <TableHead>Proveedor</TableHead>
                          <TableHead>Doc</TableHead>
                          {!isConserjeria && <TableHead className="text-right">Monto</TableHead>}
                          <TableHead>Fecha</TableHead>
                          {!isConserjeria && <TableHead>Estado Pago</TableHead>}
                          {!isConserjeria && <TableHead>Inclusión</TableHead>}
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((expense, index) => (
                          <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            {!isConserjeria && <TableCell>{getBuildingName(expense.buildingId)}</TableCell>}
                            <TableCell className="max-w-[200px] truncate">{expense.description}</TableCell>
                            <TableCell>{expense.vendorName || "-"}</TableCell>
                            <TableCell>
                              {(expense as any).documentType ? (
                                <span className="text-xs">
                                  {(expense as any).documentType === "factura" ? "F" : (expense as any).documentType === "boleta" ? "B" : "O"}
                                  {expense.documentNumber ? ` ${expense.documentNumber}` : ""}
                                </span>
                              ) : expense.documentNumber ? (
                                <span className="text-xs">{expense.documentNumber}</span>
                              ) : "-"}
                            </TableCell>
                            {!isConserjeria && (
                              <TableCell className="text-right font-medium">
                                {formatCurrency(expense.amount)}
                              </TableCell>
                            )}
                            <TableCell>{formatDate(expense.paymentDate)}</TableCell>
                            {!isConserjeria && (
                              <TableCell>
                                <Badge
                                  variant={paymentStatusVariants[expense.paymentStatus]}
                                  className={
                                    expense.paymentStatus === "pending"
                                      ? "border-yellow-500 text-yellow-700 dark:text-yellow-400"
                                      : expense.paymentStatus === "paid"
                                        ? "bg-green-600 text-white border-green-600"
                                        : ""
                                  }
                                  data-testid={`badge-payment-status-${expense.id}`}
                                >
                                  {paymentStatusLabels[expense.paymentStatus] || expense.paymentStatus}
                                </Badge>
                              </TableCell>
                            )}
                            {!isConserjeria && (
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  {(expense as any).deferredFromMonth && (expense as any).deferredFromYear ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge
                                          variant="outline"
                                          className="border-orange-500 text-orange-700 dark:text-orange-400 cursor-help"
                                          data-testid={`badge-deferred-${expense.id}`}
                                        >
                                          Aplazado
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-[300px]">
                                        <p className="text-xs font-medium">
                                          Viene de {getMonthLabel((expense as any).deferredFromMonth)} {(expense as any).deferredFromYear}
                                        </p>
                                        {expense.postponementReason && (
                                          <p className="text-xs mt-1">Motivo: {expense.postponementReason}</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="border-green-500 text-green-700 dark:text-green-400"
                                      data-testid={`badge-inclusion-status-${expense.id}`}
                                    >
                                      Incluido
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                            )}
                            <TableCell className="text-right">
                              {isConserjeria ? (
                                <Badge variant="outline" className="text-xs">
                                  Enviado
                                </Badge>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => { setDeferDialogId(expense.id); setDeferReason(""); }}
                                        data-testid={`button-defer-${expense.id}`}
                                      >
                                        <ArrowRightLeft className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Aplazar al mes siguiente</TooltipContent>
                                  </Tooltip>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => openEdit(expense)}
                                    data-testid={`button-edit-${expense.id}`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setDeleteId(expense.id)}
                                    data-testid={`button-delete-${expense.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
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
                    No hay egresos registrados para el periodo seleccionado
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Haga clic en "Nuevo Egreso" para agregar un registro
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {isConserjeria
                ? (editingExpense ? "Editar Cuenta" : "Registrar Cuenta de Servicio")
                : (editingExpense ? "Editar Egreso" : "Nuevo Egreso")}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {isConserjeria ? (
                <FormField
                  control={form.control}
                  name="buildingId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edificio</FormLabel>
                      <FormControl>
                        <Input
                          disabled
                          value={buildings?.find(b => b.id === field.value)?.name || "Mi edificio"}
                          data-testid="input-building-readonly"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
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
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Descripción del egreso"
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoryList?.map(cat => (
                            <SelectItem key={cat.id} value={cat.name} data-testid={`category-option-${cat.id}`}>
                              {cat.name}
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
                  name="vendorName"
                  render={({ field }) => (
                    <FormItem className="relative">
                      <FormLabel>Proveedor</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          if (val === "__manual__") {
                            field.onChange("");
                            setShowVendorSuggestions(true);
                          } else {
                            field.onChange(val);
                            setShowVendorSuggestions(false);
                          }
                        }}
                        value={showVendorSuggestions ? "__manual__" : (field.value || "")}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-vendor">
                            <SelectValue placeholder="Seleccionar proveedor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {combinedProviders.map(p => (
                            <SelectItem key={p.key} value={p.name} data-testid={`vendor-option-${p.key}`}>
                              {p.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="__manual__">Ingresar manualmente...</SelectItem>
                        </SelectContent>
                      </Select>
                      {showVendorSuggestions && (
                        <FormControl>
                          <Input
                            placeholder="Nombre del proveedor (MAYÚSCULAS)"
                            data-testid="input-vendor-name"
                            className="mt-2"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="documentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo Documento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-document-type">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="factura">Factura</SelectItem>
                          <SelectItem value="boleta">Boleta</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="documentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>N° Documento</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Número de documento"
                          data-testid="input-document-number"
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
              </div>

              {!isConserjeria && (
                <div className="border rounded-md p-4 space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">Período de consumo y mes de cargo</p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="consumptionPeriodFrom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Consumo desde</FormLabel>
                          <FormControl>
                            <Input type="date" data-testid="input-consumption-from" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="consumptionPeriodTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Consumo hasta</FormLabel>
                          <FormControl>
                            <Input type="date" data-testid="input-consumption-to" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="chargeMonth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mes de GC a pagar</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-charge-month">
                                <SelectValue placeholder="Mes" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {months.map((m) => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="chargeYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Año de GC a pagar</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-charge-year">
                                <SelectValue placeholder="Año" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {years.map((y) => (
                                <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {!isConserjeria && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forma de pago</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="input-payment-method">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="transferencia">Transferencia</SelectItem>
                            <SelectItem value="pac">PAC</SelectItem>
                            <SelectItem value="pago_electronico">Pago electrónico</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sourceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo origen</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="input-source-type">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="gasto_comun">Gasto Común</SelectItem>
                            <SelectItem value="ticket">Ticket</SelectItem>
                            <SelectItem value="project">Proyecto</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {!isConserjeria && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paymentStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado de pago</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="input-payment-status">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="paid">Pagado</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </div>
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observaciones adicionales"
                        data-testid="input-notes"
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
                  {isMutating ? "Guardando..." : editingExpense ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deferDialogId} onOpenChange={(open) => { if (!open) setDeferDialogId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-defer-title">Aplazar gasto al mes siguiente</AlertDialogTitle>
            <AlertDialogDescription>
              Este gasto se moverá al mes siguiente y quedará marcado como aplazado.
              Indique el motivo del aplazamiento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo del aplazamiento (ej: factura aún no recibida)"
            value={deferReason}
            onChange={(e) => setDeferReason(e.target.value)}
            data-testid="input-defer-reason"
          />
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-defer">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deferDialogId && deferReason.trim()) {
                  deferMutation.mutate({ id: deferDialogId, reason: deferReason.trim() });
                  setDeferDialogId(null);
                }
              }}
              disabled={!deferReason.trim() || deferMutation.isPending}
              data-testid="button-confirm-defer"
            >
              {deferMutation.isPending ? "Aplazando..." : "Aplazar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-title">Eliminar egreso</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar este egreso? Esta acción no se puede deshacer.
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
