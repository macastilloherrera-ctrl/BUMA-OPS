import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import {
  History,
  Search,
  Building2,
  Ticket,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Building } from "@shared/schema";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("es-CL");

interface PaymentRecord {
  month: number;
  year: number;
  amount: number;
  date: string;
  payerName: string;
  payerRut: string;
  sourceBank: string;
  description: string;
}

interface UnitPayments {
  unit: string;
  totalPayments: number;
  totalAmount: number;
  payments: PaymentRecord[];
  months: number;
}

interface PaymentHistoryResponse {
  units: UnitPayments[];
  totalUnits: number;
}

interface FlatPayment {
  unit: string;
  date: string;
  amount: number;
  payerName: string;
  payerRut: string;
  sourceBank: string;
  description: string;
}

type SortField = "date" | "unit" | "amount" | "payerName" | "payerRut";
type SortDir = "asc" | "desc";

export default function HistorialPagos() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [buildingId, setBuildingId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketUnit, setTicketUnit] = useState("");
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");

  const { data: buildings, isLoading: buildingsLoading } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const { data: paymentHistory, isLoading: historyLoading } = useQuery<PaymentHistoryResponse>({
    queryKey: ["/api/bank-transactions/payment-history", buildingId],
    queryFn: async () => {
      if (!buildingId) return { units: [], totalUnits: 0 };
      const res = await fetch(`/api/bank-transactions/payment-history?buildingId=${buildingId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar historial");
      return res.json();
    },
    enabled: !!buildingId,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: { buildingId: string; title: string; description: string; category: string; priority: string }) => {
      await apiRequest("POST", "/api/tickets", data);
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

  const flatPayments = useMemo<FlatPayment[]>(() => {
    if (!paymentHistory?.units) return [];
    const all: FlatPayment[] = [];
    for (const u of paymentHistory.units) {
      for (const p of u.payments) {
        all.push({
          unit: u.unit,
          date: p.date,
          amount: p.amount,
          payerName: p.payerName,
          payerRut: p.payerRut,
          sourceBank: p.sourceBank,
          description: p.description,
        });
      }
    }
    return all;
  }, [paymentHistory]);

  const filteredPayments = useMemo(() => {
    let result = flatPayments;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.unit.toLowerCase().includes(term) ||
          p.payerName.toLowerCase().includes(term) ||
          p.payerRut.toLowerCase().includes(term)
      );
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "unit":
          cmp = a.unit.localeCompare(b.unit, "es", { numeric: true });
          break;
        case "amount":
          cmp = a.amount - b.amount;
          break;
        case "payerName":
          cmp = (a.payerName || "").localeCompare(b.payerName || "", "es");
          break;
        case "payerRut":
          cmp = (a.payerRut || "").localeCompare(b.payerRut || "", "es");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [flatPayments, searchTerm, sortField, sortDir]);

  const totalFilteredAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const uniqueUnits = new Set(filteredPayments.map((p) => p.unit)).size;

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "date" ? "desc" : "asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  }

  function openTicketDialog(unit: string) {
    setTicketUnit(unit);
    const buildingName = buildings?.find((b) => b.id === buildingId)?.name || "";
    setTicketTitle(`Problema de pago GGCC - ${buildingName} - Unidad ${unit}`);
    setTicketDescription(`Se detecta irregularidad en los pagos de gastos comunes de la unidad ${unit} del edificio ${buildingName}. Se requiere revisión por parte del área comercial.\n\nDetalle del historial de pagos adjunto en el sistema.`);
    setTicketDialogOpen(true);
  }

  function getBuildingName(id: string) {
    return buildings?.find((b) => b.id === id)?.name || id;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-50 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-page-title">
              Historial de Pagos
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        {buildings?.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Buscar unidad, nombre o RUT</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por unidad, nombre de pagador o RUT..."
                      className="pl-9"
                      data-testid="input-search"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {buildingId && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Unidades con pagos</p>
                    <p className="text-lg font-semibold" data-testid="text-total-units">{uniqueUnits}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Transacciones</p>
                    <p className="text-lg font-semibold" data-testid="text-total-transactions">{filteredPayments.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Total identificado</p>
                    <p className="text-lg font-semibold text-green-600" data-testid="text-total-amount">{formatCurrency(totalFilteredAmount)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-0">
                  {historyLoading ? (
                    <div className="p-6 space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : filteredPayments.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground" data-testid="text-no-data">
                      {paymentHistory?.totalUnits === 0
                        ? "No hay pagos identificados para este edificio. Importe y concilie cartolas bancarias primero."
                        : "No se encontraron resultados para la búsqueda."}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <button
                                className="flex items-center text-xs font-medium"
                                onClick={() => toggleSort("date")}
                                data-testid="sort-date"
                              >
                                Fecha
                                <SortIcon field="date" />
                              </button>
                            </TableHead>
                            <TableHead>
                              <button
                                className="flex items-center text-xs font-medium"
                                onClick={() => toggleSort("unit")}
                                data-testid="sort-unit"
                              >
                                Unidad
                                <SortIcon field="unit" />
                              </button>
                            </TableHead>
                            <TableHead>
                              <button
                                className="flex items-center text-xs font-medium"
                                onClick={() => toggleSort("payerName")}
                                data-testid="sort-name"
                              >
                                Nombre
                                <SortIcon field="payerName" />
                              </button>
                            </TableHead>
                            <TableHead>
                              <button
                                className="flex items-center text-xs font-medium"
                                onClick={() => toggleSort("payerRut")}
                                data-testid="sort-rut"
                              >
                                RUT
                                <SortIcon field="payerRut" />
                              </button>
                            </TableHead>
                            <TableHead className="text-right">
                              <button
                                className="flex items-center text-xs font-medium ml-auto"
                                onClick={() => toggleSort("amount")}
                                data-testid="sort-amount"
                              >
                                Monto Pagado
                                <SortIcon field="amount" />
                              </button>
                            </TableHead>
                            <TableHead>Banco</TableHead>
                            <TableHead className="w-20"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPayments.map((payment, idx) => (
                            <TableRow key={`${payment.unit}-${payment.date}-${idx}`} data-testid={`row-payment-${idx}`}>
                              <TableCell className="text-sm whitespace-nowrap" data-testid={`text-date-${idx}`}>
                                {formatDate(payment.date)}
                              </TableCell>
                              <TableCell className="font-medium" data-testid={`text-unit-${idx}`}>
                                {payment.unit}
                              </TableCell>
                              <TableCell className="text-sm" data-testid={`text-name-${idx}`}>
                                <span className="truncate block max-w-[200px]" title={payment.payerName}>
                                  {payment.payerName || "-"}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm font-mono" data-testid={`text-rut-${idx}`}>
                                {payment.payerRut || "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono whitespace-nowrap" data-testid={`text-amount-${idx}`}>
                                {formatCurrency(payment.amount)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground" data-testid={`text-bank-${idx}`}>
                                {payment.sourceBank || "-"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openTicketDialog(payment.unit)}
                                  title="Crear ticket"
                                  data-testid={`button-ticket-${idx}`}
                                >
                                  <Ticket className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-create-ticket">
          <DialogHeader>
            <DialogTitle>Crear Ticket - Problema de Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="bg-muted/50">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm">
                  <Building2 className="inline h-4 w-4 mr-1" />
                  {getBuildingName(buildingId)} - Unidad <strong>{ticketUnit}</strong>
                </p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <label className="text-sm font-medium">Título</label>
              <Input
                value={ticketTitle}
                onChange={(e) => setTicketTitle(e.target.value)}
                data-testid="input-ticket-title"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
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
