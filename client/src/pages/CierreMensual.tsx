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
import type { Building, MonthlyClosingCycle, MonthlyClosingChecklistItem, UserProfile } from "@shared/schema";
import { Building2, Plus, Calendar, AlertCircle, CheckCircle, Clock, Trash2 } from "lucide-react";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const STATUS_LABELS: Record<string, string> = {
  open: "Abierto",
  preparation: "En Preparación",
  pending_info: "Pendiente Información",
  pre_ready: "Pre-Listo",
  under_review: "En Revisión",
  approved: "Aprobado",
  issued: "Emitido",
};

const STATUS_ORDER: string[] = [
  "open", "preparation", "pending_info", "pre_ready", "under_review", "approved", "issued",
];

const RISK_LABELS: Record<string, string> = {
  low: "LOW",
  medium: "MED",
  high: "HIGH",
};

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
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

function getDaysRemaining(finalIssueDate: string | Date | null | undefined): string {
  if (!finalIssueDate) return "—";
  const now = new Date();
  const target = new Date(finalIssueDate);
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d vencido`;
  if (diff === 0) return "Hoy";
  return `${diff}d restantes`;
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear + 2 - i);

export default function CierreMensual() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
  });
  const canModify = userProfile && ["gerente_general", "gerente_comercial"].includes(userProfile.role);
  const canEditChecklist = userProfile && ["gerente_general", "gerente_comercial", "gerente_finanzas"].includes(userProfile.role);

  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  const { data: buildings } = useQuery<Building[]>({ queryKey: ["/api/buildings"] });

  const { data: cycles, isLoading } = useQuery<MonthlyClosingCycle[]>({
    queryKey: [`/api/monthly-closing-cycles/dashboard?year=${selectedYear}`],
  });

  const { data: cycleDetail, isLoading: detailLoading } = useQuery<{ cycle: MonthlyClosingCycle; checklistItems: MonthlyClosingChecklistItem[] }>({
    queryKey: ["/api/monthly-closing-cycles", selectedCycleId],
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
      toast({ title: "Ciclo actualizado exitosamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error al actualizar ciclo", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/monthly-closing-cycles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-closing-cycles/dashboard"] });
      toast({ title: "Ciclo eliminado exitosamente" });
      setDetailDialogOpen(false);
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
    setDetailDialogOpen(true);
  }

  function handleAdvanceStatus() {
    if (!cycleDetail?.cycle) return;
    const currentIdx = STATUS_ORDER.indexOf(cycleDetail.cycle.status);
    if (currentIdx < STATUS_ORDER.length - 1) {
      updateMutation.mutate({ id: cycleDetail.cycle.id, data: { status: STATUS_ORDER[currentIdx + 1] } });
    }
  }

  function handleSaveDetail() {
    if (!cycleDetail?.cycle) return;
    updateMutation.mutate({ id: cycleDetail.cycle.id, data: { risk: editRisk, notes: editNotes } });
  }

  function handleChecklistToggle(item: MonthlyClosingChecklistItem) {
    if (!selectedCycleId) return;
    checklistMutation.mutate({
      cycleId: selectedCycleId,
      itemId: item.id,
      data: { completed: !item.completed },
    });
  }

  function formatDate(d: string | Date | null | undefined): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-CL");
  }

  function getCycleForBuilding(buildingId: string): MonthlyClosingCycle | undefined {
    return cycles?.find(c => c.buildingId === buildingId && c.month === Number(selectedMonth));
  }

  return (
    <div className="p-4 space-y-4" data-testid="page-cierre-mensual">
      <div className="flex flex-wrap items-center gap-3">
        <Building2 className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-xl font-semibold" data-testid="text-page-title">Cierre Mensual de Gastos Comunes</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]" data-testid="select-month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buildings?.map(building => {
            const cycle = getCycleForBuilding(building.id);
            return (
              <Card
                key={building.id}
                className={cycle ? "cursor-pointer hover-elevate" : ""}
                onClick={() => cycle && openDetail(cycle.id, cycle)}
                data-testid={`card-building-${building.id}`}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium truncate" data-testid={`text-building-name-${building.id}`}>
                    {building.name}
                  </CardTitle>
                  {getStatusBadge(cycle?.status)}
                </CardHeader>
                <CardContent>
                  {cycle ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className={`${RISK_COLORS[cycle.risk]} no-default-hover-elevate no-default-active-elevate`} data-testid={`badge-risk-${building.id}`}>
                        {RISK_LABELS[cycle.risk]}
                      </Badge>
                      <span className="flex items-center gap-1" data-testid={`text-days-${building.id}`}>
                        <Clock className="h-3 w-3" />
                        {getDaysRemaining(cycle.finalIssueDate)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground" data-testid={`text-no-cycle-${building.id}`}>
                      Sin ciclo para {MONTHS[Number(selectedMonth) - 1]} {selectedYear}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={detailDialogOpen} onOpenChange={(open) => { setDetailDialogOpen(open); if (!open) setSelectedCycleId(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-detail-title">Detalle del Ciclo</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : cycleDetail?.cycle ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Corte Egresos</span>
                  <p data-testid="text-cutoff-expenses">{formatDate(cycleDetail.cycle.cutoffExpensesDate)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Corte Ingresos</span>
                  <p data-testid="text-cutoff-incomes">{formatDate(cycleDetail.cycle.cutoffIncomesDate)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Pre-Estado</span>
                  <p data-testid="text-pre-statement">{formatDate(cycleDetail.cycle.preStatementDate)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Emisión Final</span>
                  <p data-testid="text-final-issue">{formatDate(cycleDetail.cycle.finalIssueDate)}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">Estado:</span>
                {getStatusBadge(cycleDetail.cycle.status)}
                {canModify && cycleDetail.cycle.status !== "issued" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAdvanceStatus}
                    disabled={updateMutation.isPending}
                    data-testid="button-advance-status"
                  >
                    Avanzar Estado
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Nivel de Riesgo</Label>
                <Select value={editRisk} onValueChange={setEditRisk} disabled={!canModify}>
                  <SelectTrigger data-testid="select-risk">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Bajo (LOW)</SelectItem>
                    <SelectItem value="medium">Medio (MED)</SelectItem>
                    <SelectItem value="high">Alto (HIGH)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Notas</Label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  disabled={!canModify}
                  data-testid="textarea-notes"
                />
              </div>

              {canModify && (
                <Button
                  onClick={handleSaveDetail}
                  disabled={updateMutation.isPending}
                  data-testid="button-save-detail"
                >
                  Guardar Cambios
                </Button>
              )}

              {cycleDetail.checklistItems && cycleDetail.checklistItems.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Checklist</h3>
                  {cycleDetail.checklistItems
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map(item => (
                      <div key={item.id} className="flex flex-wrap items-center gap-2 text-sm" data-testid={`checklist-item-${item.id}`}>
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => handleChecklistToggle(item)}
                          disabled={!canEditChecklist}
                          data-testid={`checkbox-checklist-${item.id}`}
                        />
                        <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                          {item.label}
                        </span>
                        {item.completed && item.completedAt && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {item.completedBy ? `por ${item.completedBy}` : ""} {formatDate(item.completedAt)}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              )}

              {canModify && (
                <div className="pt-2 border-t">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate(cycleDetail.cycle.id)}
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete-cycle"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar Ciclo
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No se encontró el ciclo.</p>
          )}
        </DialogContent>
      </Dialog>

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
