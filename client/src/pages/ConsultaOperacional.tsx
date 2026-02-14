import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  ArrowDownCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

const STATUS_LABELS: Record<string, string> = {
  open: "Abierto",
  preparation: "En Preparación",
  pending_info: "Pendiente Información",
  pre_ready: "Pre-Listo",
  under_review: "En Revisión",
  approved: "Aprobado",
  issued: "Emitido",
};

interface OperationalData {
  buildingId: string;
  buildingName: string;
  closingCycleStatus: string | null;
  depositsReconciled: number;
  depositsPending: number;
  lastReconciliationDate: string | null;
  expensesReceived: number;
  expensesValidated: number;
  expensesPostponed: number;
}

function getStatusBadge(status: string | null) {
  if (!status) {
    return (
      <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-status-none">
        Sin ciclo
      </Badge>
    );
  }
  if (status === "approved" || status === "issued") {
    return (
      <Badge variant="default" className="bg-green-600 dark:bg-green-700 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-status-${status}`}>
        {STATUS_LABELS[status]}
      </Badge>
    );
  }
  if (status === "preparation" || status === "pre_ready" || status === "under_review") {
    return (
      <Badge variant="default" className="bg-yellow-500 text-yellow-950 dark:bg-yellow-600 dark:text-yellow-100 no-default-hover-elevate no-default-active-elevate" data-testid={`badge-status-${status}`}>
        {STATUS_LABELS[status]}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="no-default-hover-elevate no-default-active-elevate" data-testid={`badge-status-${status}`}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}

function getTrafficLight(status: string | null) {
  if (!status) return "bg-muted-foreground/30";
  if (status === "approved" || status === "issued") return "bg-green-500";
  if (status === "preparation" || status === "pre_ready" || status === "under_review") return "bg-yellow-500";
  return "bg-red-500";
}

function formatDate(date: string | null) {
  if (!date) return "—";
  const mt = date.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (mt) return `${mt[3]}-${mt[2]}-${mt[1]}`;
  return new Date(date).toLocaleDateString("es-CL");
}

export default function ConsultaOperacional() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));

  const { data, isLoading } = useQuery<OperationalData[]>({
    queryKey: [`/api/consulta-operacional?month=${selectedMonth}&year=${selectedYear}`],
    enabled: !!selectedMonth && !!selectedYear,
  });

  const monthLabel = MONTHS[Number(selectedMonth) - 1] || "";

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-50 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Building2 className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-page-title">
              Consulta Operacional
            </h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[150px]" data-testid="select-month">
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
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px]" data-testid="select-year">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2" data-testid="text-period-label">
          Período: {monthLabel} {selectedYear}
        </p>
      </div>

      <div className="flex-1 overflow-auto pb-20 md:pb-6 p-4 md:p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" data-testid={`skeleton-card-${i}`} />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground" data-testid="text-empty-state">
              No hay datos operacionales para {monthLabel} {selectedYear}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Seleccione otro período para consultar
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.map((item) => (
              <Card key={item.buildingId} data-testid={`card-building-${item.buildingId}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
                  <CardTitle className="text-base font-semibold truncate" data-testid={`text-building-name-${item.buildingId}`}>
                    {item.buildingName}
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <div
                      className={`h-3 w-3 rounded-full ${getTrafficLight(item.closingCycleStatus)}`}
                      title={item.closingCycleStatus ? STATUS_LABELS[item.closingCycleStatus] || item.closingCycleStatus : "Sin ciclo"}
                      data-testid={`indicator-traffic-light-${item.buildingId}`}
                    />
                    {getStatusBadge(item.closingCycleStatus)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Depósitos</p>
                        <p className="text-sm font-medium" data-testid={`text-deposits-${item.buildingId}`}>
                          {item.depositsReconciled} conciliados / {item.depositsPending} pendientes
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Último depósito conciliado</p>
                        <p className="text-sm font-medium" data-testid={`text-last-reconciliation-${item.buildingId}`}>
                          {formatDate(item.lastReconciliationDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Egresos</p>
                        <p className="text-sm font-medium" data-testid={`text-expenses-${item.buildingId}`}>
                          {item.expensesReceived} recibidos / {item.expensesValidated} validados
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Egresos postergados</p>
                        <p className="text-sm font-medium" data-testid={`text-expenses-postponed-${item.buildingId}`}>
                          {item.expensesPostponed}
                        </p>
                      </div>
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
