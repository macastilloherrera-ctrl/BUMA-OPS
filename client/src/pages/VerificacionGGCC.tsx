import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Building2,
  Ticket,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ClipboardCheck,
  TrendingUp,
  Users,
  Clock,
  Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Building } from "@shared/schema";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const years = Array.from({ length: 3 }, (_, i) => String(currentYear - i));

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(amount);

const formatDate = (date: string) => {
  if (!date) return "—";
  const m = date.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return new Date(date).toLocaleDateString("es-CL");
};

interface UnitPayment {
  amount: number;
  date: string;
  payerName: string;
  payerRut: string;
  sourceBank: string;
  description: string;
  transactionId: string;
}

interface UnitAlert {
  type: string;
  message: string;
}

interface UnitData {
  unit: string;
  status: "paid" | "unpaid" | "multiple" | "no_history";
  payments: UnitPayment[];
  totalPaid: number;
  paymentCount: number;
  historicMonths: number;
  alerts: UnitAlert[];
}

interface VerificacionResponse {
  units: UnitData[];
  summary: {
    totalUnits: number;
    paid: number;
    unpaid: number;
    noHistory: number;
    multiple: number;
    totalCollected: number;
    averagePayment: number;
    alertCount: number;
    pendingTransactions: number;
  };
}

type StatusFilter = "all" | "paid" | "unpaid" | "multiple" | "alerts";
type SortField = "unit" | "status" | "totalPaid" | "paymentCount" | "alerts";
type SortDir = "asc" | "desc";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline"; icon: typeof CheckCircle; className?: string }> = {
  paid: { label: "Pagado", variant: "default", icon: CheckCircle, className: "bg-green-600 dark:bg-green-700" },
  unpaid: { label: "No pagado", variant: "destructive", icon: XCircle },
  multiple: { label: "Pago múltiple", variant: "default", icon: AlertTriangle, className: "bg-orange-500 dark:bg-orange-600" },
  no_history: { label: "Sin historial", variant: "secondary", icon: Clock },
};

export default function VerificacionGGCC() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [buildingId, setBuildingId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("unit");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketUnit, setTicketUnit] = useState("");
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");

  const { data: buildings, isLoading: buildingsLoading } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const { data, isLoading } = useQuery<VerificacionResponse>({
    queryKey: ['/api/verificacion-ggcc', buildingId, selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/verificacion-ggcc?buildingId=${buildingId}&month=${selectedMonth}&year=${selectedYear}`, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar verificación");
      return res.json();
    },
    enabled: !!buildingId && !!selectedMonth && !!selectedYear,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: { buildingId: string; title: string; description: string; category: string; priority: string }) => {
      await apiRequest("POST", "/api/tickets", ticketData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Ticket creado exitosamente" });
      setTicketDialogOpen(false);
      setTicketTitle("");
      setTicketDescription("");
      setTicketUnit("");
    },
    onError: (error: Error) => {
      toast({ title: "Error al crear ticket", description: error.message, variant: "destructive" });
    },
  });

  const filteredUnits = useMemo(() => {
    if (!data?.units) return [];
    let result = data.units;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(u =>
        u.unit.toLowerCase().includes(term) ||
        u.payments.some(p =>
          p.payerName.toLowerCase().includes(term) ||
          p.payerRut.toLowerCase().includes(term)
        )
      );
    }

    if (statusFilter !== "all") {
      if (statusFilter === "alerts") {
        result = result.filter(u => u.alerts.length > 0);
      } else {
        result = result.filter(u => u.status === statusFilter);
      }
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "unit":
          cmp = a.unit.localeCompare(b.unit, "es", { numeric: true });
          break;
        case "status": {
          const order = { unpaid: 0, multiple: 1, paid: 2, no_history: 3 };
          cmp = (order[a.status] ?? 4) - (order[b.status] ?? 4);
          break;
        }
        case "totalPaid":
          cmp = a.totalPaid - b.totalPaid;
          break;
        case "paymentCount":
          cmp = a.paymentCount - b.paymentCount;
          break;
        case "alerts":
          cmp = a.alerts.length - b.alerts.length;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [data, searchTerm, statusFilter, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "unit" ? "asc" : "desc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  }

  function openTicketDialog(unit: string, alertMsg?: string) {
    setTicketUnit(unit);
    const buildingName = buildings?.find(b => b.id === buildingId)?.name || "";
    const monthLabel = MONTHS[Number(selectedMonth) - 1] || "";
    setTicketTitle(`Irregularidad GGCC - ${buildingName} - Unidad ${unit}`);
    setTicketDescription(
      `Se detecta irregularidad en los pagos de gastos comunes de la unidad ${unit} del edificio ${buildingName} para el período ${monthLabel} ${selectedYear}.\n\n${alertMsg ? `Detalle: ${alertMsg}\n\n` : ""}Se requiere revisión por parte del área comercial.`
    );
    setTicketDialogOpen(true);
  }

  const monthLabel = MONTHS[Number(selectedMonth) - 1] || "";

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-50 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-page-title">
              Verificación Gastos Comunes
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Edificio</label>
                  {buildingsLoading ? (
                    <Skeleton className="h-9 w-full" />
                  ) : (
                    <Select value={buildingId} onValueChange={setBuildingId}>
                      <SelectTrigger data-testid="select-building">
                        <SelectValue placeholder="Seleccionar edificio" />
                      </SelectTrigger>
                      <SelectContent>
                        {buildings?.map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Mes</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger data-testid="select-month">
                      <SelectValue placeholder="Mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Año</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger data-testid="select-year">
                      <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Unidad, nombre o RUT..."
                      className="pl-9"
                      data-testid="input-search"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {buildingId && data && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card
                  className={`cursor-pointer transition-colors ${statusFilter === "all" ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setStatusFilter("all")}
                  data-testid="filter-all"
                >
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <p className="text-xl font-bold mt-1" data-testid="text-total-units">{data.summary.totalUnits}</p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-colors ${statusFilter === "paid" ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setStatusFilter(statusFilter === "paid" ? "all" : "paid")}
                  data-testid="filter-paid"
                >
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <p className="text-xs text-muted-foreground">Pagados</p>
                    </div>
                    <p className="text-xl font-bold mt-1 text-green-600" data-testid="text-paid-count">{data.summary.paid}</p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-colors ${statusFilter === "unpaid" ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setStatusFilter(statusFilter === "unpaid" ? "all" : "unpaid")}
                  data-testid="filter-unpaid"
                >
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <p className="text-xs text-muted-foreground">No pagados</p>
                    </div>
                    <p className="text-xl font-bold mt-1 text-red-600" data-testid="text-unpaid-count">{data.summary.unpaid}</p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer transition-colors ${statusFilter === "alerts" ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setStatusFilter(statusFilter === "alerts" ? "all" : "alerts")}
                  data-testid="filter-alerts"
                >
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <p className="text-xs text-muted-foreground">Con alertas</p>
                    </div>
                    <p className="text-xl font-bold mt-1 text-orange-500" data-testid="text-alert-count">{data.summary.alertCount}</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-total-collected">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <p className="text-xs text-muted-foreground">Recaudado</p>
                    </div>
                    <p className="text-lg font-bold mt-1" data-testid="text-total-collected">{formatCurrency(data.summary.totalCollected)}</p>
                  </CardContent>
                </Card>
              </div>

              {data.summary.pendingTransactions > 0 && (
                <Card className="border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30" data-testid="card-pending-warning">
                  <CardContent className="pt-3 pb-3 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                    <p className="text-sm" data-testid="text-pending-warning">
                      Hay <strong>{data.summary.pendingTransactions}</strong> transacciones pendientes de identificar para {monthLabel} {selectedYear}.
                      Los datos mostrados pueden estar incompletos.
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base" data-testid="text-table-title">
                      Detalle por Unidad — {monthLabel} {selectedYear}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground" data-testid="text-showing-count">
                        {filteredUnits.length} de {data.summary.totalUnits} unidades
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-6 space-y-3">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : filteredUnits.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground" data-testid="text-no-data">
                      {data.summary.totalUnits === 0
                        ? "No hay pagos registrados para este período. Importe y concilie cartolas bancarias primero."
                        : "No se encontraron unidades con los filtros seleccionados."}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">
                              <button className="flex items-center text-xs font-medium" onClick={() => toggleSort("unit")} data-testid="sort-unit">
                                Unidad <SortIcon field="unit" />
                              </button>
                            </TableHead>
                            <TableHead>
                              <button className="flex items-center text-xs font-medium" onClick={() => toggleSort("status")} data-testid="sort-status">
                                Estado <SortIcon field="status" />
                              </button>
                            </TableHead>
                            <TableHead className="text-right">
                              <button className="flex items-center text-xs font-medium ml-auto" onClick={() => toggleSort("totalPaid")} data-testid="sort-amount">
                                Monto Pagado <SortIcon field="totalPaid" />
                              </button>
                            </TableHead>
                            <TableHead>
                              <button className="flex items-center text-xs font-medium" onClick={() => toggleSort("paymentCount")} data-testid="sort-payments">
                                Pagos <SortIcon field="paymentCount" />
                              </button>
                            </TableHead>
                            <TableHead>Pagador</TableHead>
                            <TableHead>
                              <button className="flex items-center text-xs font-medium" onClick={() => toggleSort("alerts")} data-testid="sort-alerts">
                                Alertas <SortIcon field="alerts" />
                              </button>
                            </TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUnits.map((unit, idx) => {
                            const config = STATUS_CONFIG[unit.status];
                            const StatusIcon = config.icon;
                            const isExpanded = expandedUnit === unit.unit;

                            return (
                              <>
                                <TableRow
                                  key={unit.unit}
                                  className={`cursor-pointer ${isExpanded ? "bg-muted/50" : ""}`}
                                  onClick={() => setExpandedUnit(isExpanded ? null : unit.unit)}
                                  data-testid={`row-unit-${idx}`}
                                >
                                  <TableCell className="font-medium" data-testid={`text-unit-${idx}`}>
                                    {unit.unit}
                                  </TableCell>
                                  <TableCell data-testid={`text-status-${idx}`}>
                                    <Badge variant={config.variant} className={`no-default-hover-elevate no-default-active-elevate ${config.className || ""}`}>
                                      <StatusIcon className="h-3 w-3 mr-1" />
                                      {config.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-mono whitespace-nowrap" data-testid={`text-amount-${idx}`}>
                                    {unit.totalPaid > 0 ? formatCurrency(unit.totalPaid) : "—"}
                                  </TableCell>
                                  <TableCell data-testid={`text-payment-count-${idx}`}>
                                    {unit.paymentCount > 0 ? unit.paymentCount : "—"}
                                  </TableCell>
                                  <TableCell className="text-sm max-w-[200px]" data-testid={`text-payer-${idx}`}>
                                    {unit.payments.length > 0 ? (
                                      <span className="truncate block" title={unit.payments[0].payerName}>
                                        {unit.payments[0].payerName || "—"}
                                      </span>
                                    ) : "—"}
                                  </TableCell>
                                  <TableCell data-testid={`text-alerts-${idx}`}>
                                    {unit.alerts.length > 0 ? (
                                      <div className="flex flex-col gap-1">
                                        {unit.alerts.map((alert, ai) => (
                                          <Tooltip key={ai}>
                                            <TooltipTrigger asChild>
                                              <Badge
                                                variant={alert.type === "duplicate" ? "destructive" : "outline"}
                                                className="text-xs whitespace-nowrap no-default-hover-elevate no-default-active-elevate"
                                                data-testid={`badge-alert-${idx}-${ai}`}
                                              >
                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                                {alert.type === "duplicate" ? "Duplicado" :
                                                 alert.type === "amount_deviation" ? "Monto inusual" :
                                                 alert.type === "debtor" ? "Posible morosidad" : alert.type}
                                              </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p className="max-w-xs">{alert.message}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {unit.alerts.length > 0 && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={e => {
                                          e.stopPropagation();
                                          openTicketDialog(unit.unit, unit.alerts.map(a => a.message).join("; "));
                                        }}
                                        title="Crear ticket"
                                        data-testid={`button-ticket-${idx}`}
                                      >
                                        <Ticket className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>

                                {isExpanded && unit.payments.length > 0 && (
                                  <TableRow key={`${unit.unit}-detail`} className="bg-muted/30">
                                    <TableCell colSpan={7} className="p-0">
                                      <div className="px-6 py-3 space-y-2" data-testid={`detail-unit-${idx}`}>
                                        <p className="text-xs font-medium text-muted-foreground mb-2">
                                          Detalle de pagos — Unidad {unit.unit}
                                        </p>
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="text-xs">Fecha</TableHead>
                                              <TableHead className="text-xs">Pagador</TableHead>
                                              <TableHead className="text-xs">RUT</TableHead>
                                              <TableHead className="text-xs text-right">Monto</TableHead>
                                              <TableHead className="text-xs">Banco</TableHead>
                                              <TableHead className="text-xs">Descripción</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {unit.payments.map((p, pi) => (
                                              <TableRow key={pi}>
                                                <TableCell className="text-xs whitespace-nowrap" data-testid={`detail-date-${idx}-${pi}`}>
                                                  {formatDate(p.date)}
                                                </TableCell>
                                                <TableCell className="text-xs" data-testid={`detail-payer-${idx}-${pi}`}>
                                                  {p.payerName || "—"}
                                                </TableCell>
                                                <TableCell className="text-xs font-mono" data-testid={`detail-rut-${idx}-${pi}`}>
                                                  {p.payerRut || "—"}
                                                </TableCell>
                                                <TableCell className="text-xs text-right font-mono" data-testid={`detail-amount-${idx}-${pi}`}>
                                                  {formatCurrency(p.amount)}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground" data-testid={`detail-bank-${idx}-${pi}`}>
                                                  {p.sourceBank || "—"}
                                                </TableCell>
                                                <TableCell className="text-xs max-w-[200px]" data-testid={`detail-desc-${idx}-${pi}`}>
                                                  <span className="truncate block" title={p.description}>
                                                    {p.description || "—"}
                                                  </span>
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {data.summary.averagePayment > 0 && (
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground mb-1">Estadísticas del período</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Pago promedio</p>
                        <p className="font-semibold" data-testid="text-avg-payment">{formatCurrency(data.summary.averagePayment)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Total recaudado</p>
                        <p className="font-semibold" data-testid="text-summary-collected">{formatCurrency(data.summary.totalCollected)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Tasa de pago</p>
                        <p className="font-semibold" data-testid="text-payment-rate">
                          {data.summary.totalUnits > 0 ? `${Math.round((data.summary.paid / data.summary.totalUnits) * 100)}%` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Txns pendientes</p>
                        <p className="font-semibold" data-testid="text-pending-count">{data.summary.pendingTransactions}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {buildingId && isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          )}

          {!buildingId && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground" data-testid="text-empty-state">
                Seleccione un edificio para verificar pagos de gastos comunes
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Compare pagos por unidad, detecte irregularidades y gestione deudas
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-create-ticket">
          <DialogHeader>
            <DialogTitle>Crear Ticket - Irregularidad GGCC</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="bg-muted/50">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm">
                  <Building2 className="inline h-4 w-4 mr-1" />
                  {buildings?.find(b => b.id === buildingId)?.name || ""} — Unidad <strong>{ticketUnit}</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Período: {monthLabel} {selectedYear}
                </p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <label className="text-sm font-medium">Título</label>
              <Input
                value={ticketTitle}
                onChange={e => setTicketTitle(e.target.value)}
                data-testid="input-ticket-title"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                value={ticketDescription}
                onChange={e => setTicketDescription(e.target.value)}
                rows={5}
                data-testid="input-ticket-description"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTicketDialogOpen(false)} data-testid="button-cancel-ticket">
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  createTicketMutation.mutate({
                    buildingId,
                    title: ticketTitle,
                    description: ticketDescription,
                    category: "pago_ggcc",
                    priority: "media",
                  })
                }
                disabled={!ticketTitle.trim() || createTicketMutation.isPending}
                data-testid="button-submit-ticket"
              >
                Crear Ticket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
