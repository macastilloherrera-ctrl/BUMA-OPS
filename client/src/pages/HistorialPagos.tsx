import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  ChevronDown,
  ChevronRight,
  Ticket,
  CalendarDays,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Building } from "@shared/schema";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("es-CL");

const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

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

export default function HistorialPagos() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [buildingId, setBuildingId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
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

  const filteredUnits = paymentHistory?.units.filter((u) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.unit.toLowerCase().includes(term) ||
      u.payments.some(
        (p) =>
          p.payerName.toLowerCase().includes(term) ||
          p.payerRut.toLowerCase().includes(term)
      )
    );
  }) || [];

  const totalIdentifiedAmount = filteredUnits.reduce((sum, u) => sum + u.totalAmount, 0);

  const allMonthYears = new Set<string>();
  paymentHistory?.units.forEach((u) => {
    u.payments.forEach((p) => {
      allMonthYears.add(`${p.year}-${String(p.month).padStart(2, "0")}`);
    });
  });
  const sortedMonthYears = [...allMonthYears].sort().reverse();

  function toggleUnit(unit: string) {
    setExpandedUnit(expandedUnit === unit ? null : unit);
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
        <div className="max-w-6xl mx-auto space-y-4">
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
                    <p className="text-lg font-semibold" data-testid="text-total-units">{filteredUnits.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Meses con datos</p>
                    <p className="text-lg font-semibold" data-testid="text-total-months">{sortedMonthYears.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Total identificado</p>
                    <p className="text-lg font-semibold text-green-600" data-testid="text-total-amount">{formatCurrency(totalIdentifiedAmount)}</p>
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
                  ) : filteredUnits.length === 0 ? (
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
                            <TableHead className="w-8"></TableHead>
                            <TableHead>Unidad</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-center">Pagos</TableHead>
                            <TableHead className="text-center">Meses</TableHead>
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUnits.map((unitData) => (
                            <UnitRow key={unitData.unit} unitData={unitData} />
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

  function UnitRow({ unitData }: { unitData: UnitPayments }) {
    const isExpanded = expandedUnit === unitData.unit;
    const paymentsByMonth: Record<string, PaymentRecord[]> = {};
    unitData.payments.forEach((p) => {
      const key = `${p.year}-${String(p.month).padStart(2, "0")}`;
      if (!paymentsByMonth[key]) paymentsByMonth[key] = [];
      paymentsByMonth[key].push(p);
    });

    return (
      <>
        <TableRow
          className="cursor-pointer hover-elevate"
          onClick={() => toggleUnit(unitData.unit)}
          data-testid={`row-unit-${unitData.unit}`}
        >
          <TableCell>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </TableCell>
          <TableCell className="font-medium" data-testid={`text-unit-name-${unitData.unit}`}>
            {unitData.unit}
          </TableCell>
          <TableCell className="text-right font-mono" data-testid={`text-unit-total-${unitData.unit}`}>
            {formatCurrency(unitData.totalAmount)}
          </TableCell>
          <TableCell className="text-center" data-testid={`text-unit-payments-${unitData.unit}`}>
            <Badge variant="secondary">{unitData.totalPayments}</Badge>
          </TableCell>
          <TableCell className="text-center" data-testid={`text-unit-months-${unitData.unit}`}>
            <Badge variant="outline">{unitData.months}</Badge>
          </TableCell>
          <TableCell>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                openTicketDialog(unitData.unit);
              }}
              data-testid={`button-ticket-${unitData.unit}`}
            >
              <Ticket className="h-3 w-3 mr-1" />
              Ticket
            </Button>
          </TableCell>
        </TableRow>

        {isExpanded && (
          <>
            {Object.entries(paymentsByMonth)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([monthKey, payments]) => {
                const [yr, mo] = monthKey.split("-");
                const monthLabel = `${monthNames[parseInt(mo) - 1]} ${yr}`;
                const monthTotal = payments.reduce((sum, p) => sum + p.amount, 0);

                return payments.map((payment, idx) => (
                  <TableRow
                    key={`${monthKey}-${idx}`}
                    className="bg-muted/30"
                    data-testid={`row-payment-${unitData.unit}-${monthKey}-${idx}`}
                  >
                    <TableCell></TableCell>
                    <TableCell className="text-sm text-muted-foreground pl-8">
                      <CalendarDays className="inline h-3 w-3 mr-1" />
                      {monthLabel}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground" colSpan={2}>
                      <div className="space-y-0.5">
                        {payment.payerName && (
                          <p className="truncate max-w-[200px]" title={payment.payerName}>
                            {payment.payerName}
                          </p>
                        )}
                        {payment.payerRut && (
                          <p className="text-xs">{payment.payerRut}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="space-y-0.5">
                        <p>{formatDate(payment.date)}</p>
                        {payment.sourceBank && (
                          <p className="text-xs">{payment.sourceBank}</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ));
              })}
          </>
        )}
      </>
    );
  }
}
