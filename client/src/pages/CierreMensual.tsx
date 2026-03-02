import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Building, MonthlyClosingCycle, MonthlyClosingChecklistItem, MonthlyClosingStatusLog, UserProfile } from "@shared/schema";
import {
  Building2, Plus, Calendar, AlertCircle, CheckCircle, Clock, Trash2,
  ChevronRight, ArrowLeft, FileCheck, AlertTriangle, CircleDot, X, History
} from "lucide-react";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const STATUS_LABELS: Record<string, string> = {
  open: "Abierto",
  preparation: "En Preparación",
  pending_info: "Pendiente Info",
  pre_ready: "Pre-Listo",
  under_review: "En Revisión",
  approved: "Aprobado",
  issued: "Emitido",
};

const STATUS_ORDER: string[] = [
  "open", "preparation", "pending_info", "pre_ready", "under_review", "approved", "issued",
];

const RISK_LABELS: Record<string, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

function getStatusBadge(status: string | undefined) {
  if (!status) {
    return <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-status-none">Sin ciclo</Badge>;
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

function getDateStatus(date: string | Date | null | undefined): "ok" | "warning" | "overdue" | "none" {
  if (!date) return "none";
  const now = new Date();
  const target = new Date(date);
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "overdue";
  if (diff <= 3) return "warning";
  return "ok";
}

function getDateStatusColor(status: "ok" | "warning" | "overdue" | "none") {
  switch (status) {
    case "overdue": return "text-red-600 dark:text-red-400";
    case "warning": return "text-yellow-600 dark:text-yellow-400";
    case "ok": return "text-green-600 dark:text-green-400";
    default: return "text-muted-foreground";
  }
}

function getDateDotColor(status: "ok" | "warning" | "overdue" | "none") {
  switch (status) {
    case "overdue": return "bg-red-500";
    case "warning": return "bg-yellow-500";
    case "ok": return "bg-green-500";
    default: return "bg-muted-foreground/30";
  }
}

function getDaysText(date: string | Date | null | undefined): string {
  if (!date) return "";
  const now = new Date();
  const target = new Date(date);
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d vencido`;
  if (diff === 0) return "Hoy";
  return `${diff}d`;
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const s = typeof d === "string" ? d : d.toISOString();
  const mt = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (mt) return `${mt[3]}-${mt[2]}-${mt[1]}`;
  return new Date(d).toLocaleDateString("es-CL");
}

function getSemaphoreColor(cycle: MonthlyClosingCycle | undefined): "green" | "yellow" | "red" | "gray" {
  if (!cycle) return "gray";
  if (cycle.status === "approved" || cycle.status === "issued") return "green";
  if (cycle.status === "preparation" || cycle.status === "pre_ready" || cycle.status === "under_review") return "yellow";
  return "red";
}

function getSemaphoreBorder(color: "green" | "yellow" | "red" | "gray") {
  switch (color) {
    case "green": return "border-l-green-500 dark:border-l-green-600";
    case "yellow": return "border-l-yellow-500 dark:border-l-yellow-600";
    case "red": return "border-l-red-500 dark:border-l-red-600";
    default: return "border-l-muted-foreground/30";
  }
}

function getRiskBadge(risk: string) {
  const colors: Record<string, string> = {
    low: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
    high: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  };
  return (
    <Badge variant="outline" className={`${colors[risk] || ""} no-default-hover-elevate no-default-active-elevate`}>
      {RISK_LABELS[risk] || risk}
    </Badge>
  );
}

interface CycleWithChecklist extends MonthlyClosingCycle {
  checklistItems?: MonthlyClosingChecklistItem[];
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear + 2 - i);

export default function CierreMensual() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
  });
  const canModify = userProfile && ["gerente_general", "gerente_comercial", "gerente_finanzas"].includes(userProfile.role);
  const canEditChecklist = userProfile && ["gerente_general", "gerente_comercial", "gerente_finanzas"].includes(userProfile.role);

  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  const { data: buildings } = useQuery<Building[]>({ queryKey: ["/api/buildings"] });

  const { data: cycles, isLoading } = useQuery<MonthlyClosingCycle[]>({
    queryKey: ["/api/monthly-closing-cycles/dashboard", selectedYear],
    queryFn: () =>
      fetch(`/api/monthly-closing-cycles/dashboard?year=${selectedYear}`, { credentials: "include" })
        .then(r => { if (!r.ok) throw new Error("Error al cargar ciclos"); return r.json(); }),
  });

  const { data: cycleDetail, isLoading: detailLoading } = useQuery<CycleWithChecklist>({
    queryKey: ["/api/monthly-closing-cycles", selectedCycleId],
    enabled: !!selectedCycleId,
  });

  const { data: statusLogs } = useQuery<MonthlyClosingStatusLog[]>({
    queryKey: [`/api/monthly-closing-cycles/${selectedCycleId}/status-logs`],
    enabled: !!selectedCycleId,
  });

  const [createBuildingId, setCreateBuildingId] = useState("");
  const [createMonth, setCreateMonth] = useState(String(new Date().getMonth() + 1));
  const [createYear, setCreateYear] = useState(String(currentYear));
  const [createIssueDay, setCreateIssueDay] = useState("10");
  const [createCutoffExpenses, setCreateCutoffExpenses] = useState("");
  const [createCutoffIncomes, setCreateCutoffIncomes] = useState("");
  const [createPreStatement, setCreatePreStatement] = useState("");
  const [createFinalIssue, setCreateFinalIssue] = useState("");
  const [createNotes, setCreateNotes] = useState("");

  const [editRisk, setEditRisk] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/monthly-closing-cycles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-closing-cycles/dashboard"] });
      toast({ title: "Ciclo creado exitosamente" });
      setCreateDialogOpen(false);
      resetCreateForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error al crear ciclo", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/monthly-closing-cycles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-closing-cycles/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-closing-cycles", selectedCycleId] });
      toast({ title: "Ciclo actualizado" });
    },
    onError: (error: Error) => {
      toast({ title: "Error al actualizar ciclo", description: error.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/monthly-closing-cycles/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-closing-cycles/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-closing-cycles", selectedCycleId] });
      queryClient.invalidateQueries({ queryKey: [`/api/monthly-closing-cycles/${selectedCycleId}/status-logs`] });
      toast({ title: "Estado actualizado" });
    },
    onError: (error: Error) => {
      toast({ title: "Error al cambiar estado", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/monthly-closing-cycles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-closing-cycles/dashboard"] });
      toast({ title: "Ciclo eliminado exitosamente" });
      setSelectedCycleId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error al eliminar ciclo", description: error.message, variant: "destructive" });
    },
  });

  const checklistMutation = useMutation({
    mutationFn: ({ cycleId, itemId, data }: { cycleId: string; itemId: string; data: any }) =>
      apiRequest("PATCH", `/api/monthly-closing-cycles/${cycleId}/checklist/${itemId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-closing-cycles", selectedCycleId] });
    },
    onError: (error: Error) => {
      toast({ title: "Error al actualizar checklist", description: error.message, variant: "destructive" });
    },
  });

  function resetCreateForm() {
    setCreateBuildingId("");
    setCreateMonth(String(new Date().getMonth() + 1));
    setCreateYear(String(currentYear));
    setCreateIssueDay("10");
    setCreateCutoffExpenses("");
    setCreateCutoffIncomes("");
    setCreatePreStatement("");
    setCreateFinalIssue("");
    setCreateNotes("");
  }

  function handleCreate() {
    createMutation.mutate({
      buildingId: createBuildingId,
      month: Number(createMonth),
      year: Number(createYear),
      issueDay: Number(createIssueDay),
      cutoffExpensesDate: createCutoffExpenses || null,
      cutoffIncomesDate: createCutoffIncomes || null,
      preStatementDate: createPreStatement || null,
      finalIssueDate: createFinalIssue || null,
      notes: createNotes || null,
      createdBy: user?.id || "",
    });
  }

  function openDetail(cycleId: string, cycle: MonthlyClosingCycle) {
    setSelectedCycleId(cycleId);
    setEditRisk(cycle.risk);
    setEditNotes(cycle.notes || "");
  }

  function handleAdvanceStatus() {
    if (!cycleDetail) return;
    const currentIdx = STATUS_ORDER.indexOf(cycleDetail.status);
    if (currentIdx < STATUS_ORDER.length - 1) {
      statusMutation.mutate({ id: cycleDetail.id, status: STATUS_ORDER[currentIdx + 1] });
    }
  }

  function handleRegressStatus() {
    if (!cycleDetail) return;
    const currentIdx = STATUS_ORDER.indexOf(cycleDetail.status);
    if (currentIdx > 0) {
      statusMutation.mutate({ id: cycleDetail.id, status: STATUS_ORDER[currentIdx - 1] });
    }
  }

  function handleSaveDetail() {
    if (!cycleDetail) return;
    updateMutation.mutate({ id: cycleDetail.id, data: { risk: editRisk, notes: editNotes } });
  }

  function handleChecklistToggle(item: MonthlyClosingChecklistItem) {
    if (!selectedCycleId) return;
    checklistMutation.mutate({
      cycleId: selectedCycleId,
      itemId: item.id,
      data: { completed: !item.completed },
    });
  }

  function getCycleForBuilding(buildingId: string): MonthlyClosingCycle | undefined {
    return cycles?.find(c => c.buildingId === buildingId && c.month === Number(selectedMonth));
  }

  const filteredBuildings = buildings || [];
  const cyclesThisMonth = filteredBuildings.map(b => getCycleForBuilding(b.id));
  const totalBuildings = filteredBuildings.length;
  const withCycle = cyclesThisMonth.filter(Boolean).length;
  const approved = cyclesThisMonth.filter(c => c?.status === "approved" || c?.status === "issued").length;
  const overdue = cyclesThisMonth.filter(c => {
    if (!c || c.status === "approved" || c.status === "issued") return false;
    const ds = getDateStatus(c.finalIssueDate);
    return ds === "overdue";
  }).length;
  const inProgress = withCycle - approved;

  const selectedBuilding = selectedCycleId
    ? buildings?.find(b => getCycleForBuilding(b.id)?.id === selectedCycleId)
    : null;

  return (
    <div className="p-4 space-y-4" data-testid="page-cierre-mensual">
      <div className="flex flex-wrap items-center gap-3">
        <FileCheck className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-xl font-semibold" data-testid="text-page-title">Cierre Mensual de Gastos Comunes</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); setSelectedCycleId(null); }}>
            <SelectTrigger className="w-[140px]" data-testid="select-month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); setSelectedCycleId(null); }}>
            <SelectTrigger className="w-[100px]" data-testid="select-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canModify && (
            <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-cycle">
              <Plus className="h-4 w-4 mr-1" />
              Nuevo Ciclo
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold" data-testid="stat-total">{totalBuildings}</div>
            <p className="text-xs text-muted-foreground">Edificios</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="stat-approved">{approved}</div>
            <p className="text-xs text-muted-foreground">Aprobados / Emitidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="stat-in-progress">{inProgress}</div>
            <p className="text-xs text-muted-foreground">En Proceso</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="stat-overdue">{overdue}</div>
            <p className="text-xs text-muted-foreground">Vencidos</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className={`space-y-2 ${selectedCycleId ? "lg:w-1/2 xl:w-2/5" : "w-full"} transition-all`}>
          <h2 className="text-sm font-medium text-muted-foreground px-1">
            {MONTHS[Number(selectedMonth) - 1]} {selectedYear} &mdash; {withCycle} de {totalBuildings} con ciclo
          </h2>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="py-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBuildings.map(building => {
                const cycle = getCycleForBuilding(building.id);
                const semColor = getSemaphoreColor(cycle);
                const isSelected = cycle?.id === selectedCycleId;
                return (
                  <Card
                    key={building.id}
                    className={`border-l-4 rounded-none ${getSemaphoreBorder(semColor)} ${cycle ? "cursor-pointer hover-elevate" : ""} ${isSelected ? "ring-2 ring-primary" : ""}`}
                    onClick={() => cycle && openDetail(cycle.id, cycle)}
                    data-testid={`card-building-${building.id}`}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-sm truncate" data-testid={`text-building-name-${building.id}`}>
                            {building.name}
                          </span>
                          {getStatusBadge(cycle?.status)}
                          {cycle && getRiskBadge(cycle.risk)}
                        </div>
                        {cycle && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </div>

                      {cycle ? (
                        <div className="mt-2 space-y-1.5">
                          {getDateStatus(cycle.finalIssueDate) === "overdue" && cycle.status !== "approved" && cycle.status !== "issued" && (
                            <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span data-testid={`text-overdue-${building.id}`}>
                                Emisión vencida hace {Math.abs(Math.ceil((new Date(cycle.finalIssueDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} días
                              </span>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                            <DateIndicator label="Corte Eg." date={cycle.cutoffExpensesDate} />
                            <DateIndicator label="Corte Ing." date={cycle.cutoffIncomesDate} />
                            <DateIndicator label="Pre-Estado" date={cycle.preStatementDate} />
                            <DateIndicator label="Emisión" date={cycle.finalIssueDate} />
                          </div>
                          {isSelected && cycleDetail?.checklistItems && (
                            <div className="mt-1">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Checklist: {cycleDetail.checklistItems.filter(i => i.completed).length}/{cycleDetail.checklistItems.length}</span>
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-green-500 dark:bg-green-600 rounded-full transition-all"
                                    style={{ width: `${cycleDetail.checklistItems.length > 0 ? (cycleDetail.checklistItems.filter(i => i.completed).length / cycleDetail.checklistItems.length) * 100 : 0}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1" data-testid={`text-no-cycle-${building.id}`}>
                          Sin ciclo para {MONTHS[Number(selectedMonth) - 1]} {selectedYear}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {selectedCycleId && (
          <div className="lg:w-1/2 xl:w-3/5">
            <Card className="sticky top-4">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setSelectedCycleId(null)}
                    className="lg:hidden"
                    data-testid="button-close-detail"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-base truncate" data-testid="text-detail-building">
                    {selectedBuilding?.name || "Detalle del Ciclo"}
                  </CardTitle>
                  {cycleDetail && getStatusBadge(cycleDetail.status)}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setSelectedCycleId(null)}
                  className="hidden lg:flex"
                  data-testid="button-close-detail-desktop"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-5">
                {detailLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : cycleDetail ? (
                  <>
                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        Fechas Clave
                      </h3>
                      <div className="space-y-2">
                        <DateRow label="Corte Egresos" date={cycleDetail.cutoffExpensesDate} testId="detail-cutoff-expenses" />
                        <DateRow label="Corte Ingresos" date={cycleDetail.cutoffIncomesDate} testId="detail-cutoff-incomes" />
                        <DateRow label="Pre-Estado de Cuenta" date={cycleDetail.preStatementDate} testId="detail-pre-statement" />
                        <DateRow label="Emisión Final" date={cycleDetail.finalIssueDate} testId="detail-final-issue" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2">Estado del Ciclo</h3>
                      {statusLogs && statusLogs.length > 0 && (
                        <p className="text-xs text-muted-foreground mb-2" data-testid="text-last-status-change">
                          Último cambio por <span className="font-medium">{statusLogs[0].changedByName || "—"}</span>
                          {statusLogs[0].changedAt && (
                            <span> el {(() => { const mt = String(statusLogs[0].changedAt).match(/(\d{4})-(\d{2})-(\d{2})/); return mt ? `${parseInt(mt[3])}-${["ene","feb","mar","abr","may","jun","jul","ago","sept","oct","nov","dic"][parseInt(mt[2])-1]}-${mt[1]}` : new Date(statusLogs[0].changedAt).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }); })()}</span>
                          )}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        {STATUS_ORDER.map((s, i) => {
                          const currentIdx = STATUS_ORDER.indexOf(cycleDetail.status);
                          const isPast = i < currentIdx;
                          const isCurrent = i === currentIdx;
                          return (
                            <div key={s} className="flex items-center gap-1">
                              {i > 0 && <div className={`w-3 h-0.5 ${isPast || isCurrent ? "bg-primary" : "bg-muted"}`} />}
                              <div
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
                                  isCurrent
                                    ? "border-primary bg-primary/10 text-primary font-medium"
                                    : isPast
                                    ? "border-primary/30 bg-primary/5 text-primary/70"
                                    : "border-muted text-muted-foreground"
                                }`}
                                data-testid={`status-step-${s}`}
                              >
                                {isPast && <CheckCircle className="h-3 w-3" />}
                                {isCurrent && <CircleDot className="h-3 w-3" />}
                                <span className="hidden sm:inline">{STATUS_LABELS[s]}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {canModify && cycleDetail.status !== "issued" && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {STATUS_ORDER.indexOf(cycleDetail.status) > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleRegressStatus}
                              disabled={statusMutation.isPending}
                              data-testid="button-regress-status"
                            >
                              Retroceder Estado
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={handleAdvanceStatus}
                            disabled={statusMutation.isPending}
                            data-testid="button-advance-status"
                          >
                            Avanzar Estado
                          </Button>
                        </div>
                      )}
                    </div>

                    {statusLogs && statusLogs.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                          <History className="h-4 w-4 text-muted-foreground" />
                          Historial de Cambios
                        </h3>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {statusLogs.map(log => (
                            <div
                              key={log.id}
                              className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted/30"
                              data-testid={`status-log-${log.id}`}
                            >
                              <span className="text-muted-foreground whitespace-nowrap">
                                {log.changedAt ? (() => { const mt = String(log.changedAt).match(/(\d{4})-(\d{2})-(\d{2})T?(\d{2})?:?(\d{2})?/); return mt ? `${parseInt(mt[3])}-${["ene","feb","mar","abr","may","jun","jul","ago","sept","oct","nov","dic"][parseInt(mt[2])-1]}${mt[4] ? ` ${mt[4]}:${mt[5]}` : ""}` : new Date(log.changedAt).toLocaleDateString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); })() : ""}
                              </span>
                              <span className="text-muted-foreground">
                                {log.previousStatus ? STATUS_LABELS[log.previousStatus] || log.previousStatus : "—"}
                              </span>
                              <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="font-medium">
                                {STATUS_LABELS[log.newStatus] || log.newStatus}
                              </span>
                              <span className="ml-auto text-muted-foreground truncate max-w-[120px]" title={log.changedByName || ""}>
                                {log.changedByName || "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        Checklist ({cycleDetail.checklistItems?.filter(i => i.completed).length || 0}/{cycleDetail.checklistItems?.length || 0})
                      </h3>
                      {cycleDetail.checklistItems && cycleDetail.checklistItems.length > 0 ? (
                        <div className="space-y-1.5">
                          {cycleDetail.checklistItems
                            .sort((a, b) => a.sortOrder - b.sortOrder)
                            .map(item => (
                              <div
                                key={item.id}
                                className={`flex items-center gap-2 text-sm p-2 rounded-md ${
                                  item.completed ? "bg-green-50 dark:bg-green-950/20" : "bg-muted/30"
                                }`}
                                data-testid={`checklist-item-${item.id}`}
                              >
                                <Checkbox
                                  checked={item.completed}
                                  onCheckedChange={() => handleChecklistToggle(item)}
                                  disabled={!canEditChecklist}
                                  data-testid={`checkbox-checklist-${item.id}`}
                                />
                                <span className={`flex-1 ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                                  {item.label}
                                </span>
                                {item.completed && item.completedAt && (
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {formatDate(item.completedAt)}
                                  </span>
                                )}
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin items de checklist</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Nivel de Riesgo</Label>
                        <Select value={editRisk} onValueChange={setEditRisk} disabled={!canModify}>
                          <SelectTrigger data-testid="select-risk">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Bajo</SelectItem>
                            <SelectItem value="medium">Medio</SelectItem>
                            <SelectItem value="high">Alto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Notas</Label>
                        <Textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          disabled={!canModify}
                          rows={2}
                          data-testid="textarea-notes"
                        />
                      </div>
                    </div>

                    {canModify && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                        <Button
                          onClick={handleSaveDetail}
                          disabled={updateMutation.isPending}
                          size="sm"
                          data-testid="button-save-detail"
                        >
                          Guardar Cambios
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm("¿Estás seguro de eliminar este ciclo?")) {
                              deleteMutation.mutate(cycleDetail.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          data-testid="button-delete-cycle"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <AlertCircle className="h-4 w-4" />
                    <span>No se pudo cargar el detalle del ciclo.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-create-title">Crear Nuevo Ciclo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm">Edificio</Label>
              <Select value={createBuildingId} onValueChange={setCreateBuildingId}>
                <SelectTrigger data-testid="select-create-building">
                  <SelectValue placeholder="Seleccionar edificio" />
                </SelectTrigger>
                <SelectContent>
                  {buildings?.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Mes</Label>
                <Select value={createMonth} onValueChange={setCreateMonth}>
                  <SelectTrigger data-testid="select-create-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Año</Label>
                <Select value={createYear} onValueChange={setCreateYear}>
                  <SelectTrigger data-testid="select-create-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Día de Emisión</Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={createIssueDay}
                onChange={e => setCreateIssueDay(e.target.value)}
                data-testid="input-create-issue-day"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Corte Egresos</Label>
                <Input
                  type="date"
                  value={createCutoffExpenses}
                  onChange={e => setCreateCutoffExpenses(e.target.value)}
                  data-testid="input-create-cutoff-expenses"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Corte Ingresos</Label>
                <Input
                  type="date"
                  value={createCutoffIncomes}
                  onChange={e => setCreateCutoffIncomes(e.target.value)}
                  data-testid="input-create-cutoff-incomes"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Pre-Estado</Label>
                <Input
                  type="date"
                  value={createPreStatement}
                  onChange={e => setCreatePreStatement(e.target.value)}
                  data-testid="input-create-pre-statement"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Emisión Final</Label>
                <Input
                  type="date"
                  value={createFinalIssue}
                  onChange={e => setCreateFinalIssue(e.target.value)}
                  data-testid="input-create-final-issue"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Notas</Label>
              <Textarea
                value={createNotes}
                onChange={e => setCreateNotes(e.target.value)}
                data-testid="textarea-create-notes"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={!createBuildingId || createMutation.isPending}
              data-testid="button-submit-create"
            >
              {createMutation.isPending ? "Creando..." : "Crear Ciclo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DateIndicator({ label, date }: { label: string; date: string | Date | null | undefined }) {
  const status = getDateStatus(date);
  const daysText = getDaysText(date);
  return (
    <span className={`flex items-center gap-1 ${getDateStatusColor(status)}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${getDateDotColor(status)}`} />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{formatDate(date)}</span>
      {daysText && <span className="text-[10px]">({daysText})</span>}
    </span>
  );
}

function DateRow({ label, date, testId }: { label: string; date: string | Date | null | undefined; testId: string }) {
  const status = getDateStatus(date);
  const daysText = getDaysText(date);
  return (
    <div className={`flex items-center justify-between gap-2 text-sm p-2 rounded-md ${
      status === "overdue" ? "bg-red-50 dark:bg-red-950/20" :
      status === "warning" ? "bg-yellow-50 dark:bg-yellow-950/20" :
      status === "ok" ? "bg-green-50 dark:bg-green-950/20" :
      "bg-muted/30"
    }`} data-testid={testId}>
      <div className="flex items-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${getDateDotColor(status)}`} />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium">{formatDate(date)}</span>
        {daysText && (
          <span className={`text-xs font-medium ${getDateStatusColor(status)}`}>
            {status === "overdue" && <AlertTriangle className="inline h-3 w-3 mr-0.5" />}
            {daysText}
          </span>
        )}
      </div>
    </div>
  );
}
