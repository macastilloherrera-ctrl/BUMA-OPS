import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Landmark,
  Upload,
  Download,
  Check,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  Plus,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  RefreshCw,
  FileSpreadsheet,
  Users,
  X,
  AlertCircle,
  Split,
  History,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Building, BankTransaction, PayerDirectoryEntry } from "@shared/schema";

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

const years = [
  { value: "2024", label: "2024" },
  { value: "2025", label: "2025" },
  { value: "2026", label: "2026" },
  { value: "2027", label: "2027" },
];

const exportFormats = [
  { value: "edipro", label: "Edipro" },
  { value: "comunidadfeliz", label: "Comunidad Feliz" },
  { value: "kastor", label: "Kastor" },
  { value: "generico", label: "Genérico" },
];

type TabFilter = "all" | "identified" | "suggested" | "pending" | "multi" | "ignored";

const tabFilters: { value: TabFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "identified", label: "Identificados" },
  { value: "suggested", label: "Sugeridos" },
  { value: "pending", label: "Pendientes" },
  { value: "multi", label: "Múltiples" },
  { value: "ignored", label: "Ignorados" },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  identified: { label: "Identificado", variant: "default", className: "bg-green-600 text-white no-default-hover-elevate" },
  suggested: { label: "Sugerido", variant: "secondary", className: "bg-yellow-500 text-white no-default-hover-elevate" },
  pending: { label: "Pendiente", variant: "outline", className: "" },
  multi: { label: "Múltiple", variant: "secondary", className: "bg-orange-500 text-white no-default-hover-elevate" },
  ignored: { label: "Ignorado", variant: "destructive", className: "" },
};

const stepLabels = [
  "Selección",
  "Carga",
  "Conciliación",
  "Exportación",
  "Historial",
];

const formatCurrency = (amount: string | number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(Number(amount));

const formatDate = (date: string | Date) => {
  const s = typeof date === "string" ? date : date.toISOString();
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return new Date(date).toLocaleDateString("es-CL");
};

export default function ConciliacionBancaria() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [buildingId, setBuildingId] = useState("");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{ imported: number; duplicates: number; detectedBank?: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [ignoreDialogOpen, setIgnoreDialogOpen] = useState(false);
  const [payerDirDialogOpen, setPayerDirDialogOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<BankTransaction | null>(null);

  const [assignUnit, setAssignUnit] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [ignoreReason, setIgnoreReason] = useState("");
  const [splitRows, setSplitRows] = useState<Array<{ unit: string; amount: string; description: string }>>([
    { unit: "", amount: "", description: "" },
  ]);

  const [exportFormat, setExportFormat] = useState("edipro");
  const [exportOnlyNew, setExportOnlyNew] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [newPayerRut, setNewPayerRut] = useState("");
  const [newPayerPattern, setNewPayerPattern] = useState("");
  const [newPayerUnit, setNewPayerUnit] = useState("");
  const [newPayerConfidence, setNewPayerConfidence] = useState("80");

  const { data: buildings, isLoading: buildingsLoading } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const { data: transactions, isLoading: txnLoading } = useQuery<BankTransaction[]>({
    queryKey: ["/api/bank-transactions", buildingId, month, year],
    queryFn: async () => {
      if (!buildingId) return [];
      const res = await fetch(`/api/bank-transactions?buildingId=${buildingId}&month=${month}&year=${year}`, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar transacciones");
      return res.json();
    },
    enabled: !!buildingId,
  });

  const { data: payerDirectory, isLoading: payerLoading } = useQuery<PayerDirectoryEntry[]>({
    queryKey: ["/api/payer-directory", buildingId],
    queryFn: async () => {
      if (!buildingId) return [];
      const res = await fetch(`/api/payer-directory?buildingId=${buildingId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar directorio");
      return res.json();
    },
    enabled: !!buildingId && payerDirDialogOpen,
  });

  const { data: exportStats } = useQuery<{ total: number; new: number; exported: number }>({
    queryKey: ["/api/bank-transactions/export-stats", buildingId, month, year],
    queryFn: async () => {
      if (!buildingId) return { total: 0, new: 0, exported: 0 };
      const res = await fetch(`/api/bank-transactions/export-stats?buildingId=${buildingId}&month=${month}&year=${year}`, { credentials: "include" });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    enabled: !!buildingId,
  });

  type ReconciliationHistoryEntry = {
    periodMonth: number;
    periodYear: number;
    dateFrom: string | null;
    dateTo: string | null;
    total: number;
    identified: number;
    suggested: number;
    pending: number;
    ignored: number;
    multi: number;
    totalAmount: number;
    lastImport: string | null;
  };

  const { data: reconciliationHistory, isLoading: historyLoading } = useQuery<ReconciliationHistoryEntry[]>({
    queryKey: ["/api/bank-transactions/reconciliation-history", buildingId],
    queryFn: async () => {
      if (!buildingId) return [];
      const res = await fetch(`/api/bank-transactions/reconciliation-history?buildingId=${buildingId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar historial");
      return res.json();
    },
    enabled: !!buildingId && step === 5,
  });

  const filteredTransactions = transactions?.filter((t) =>
    activeTab === "all" ? true : t.status === activeTab
  ) || [];

  const statusCounts = {
    all: transactions?.length || 0,
    identified: transactions?.filter((t) => t.status === "identified").length || 0,
    suggested: transactions?.filter((t) => t.status === "suggested").length || 0,
    pending: transactions?.filter((t) => t.status === "pending").length || 0,
    multi: transactions?.filter((t) => t.status === "multi").length || 0,
    ignored: transactions?.filter((t) => t.status === "ignored").length || 0,
  };

  const identifiedAmount = transactions
    ?.filter((t) => t.status === "identified")
    .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  const reconcileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bank-transactions/reconcile", {
        buildingId,
        periodMonth: Number(month),
        periodYear: Number(year),
      });
      return res.json() as Promise<{ identified: number; suggested: number; pending: number; multi: number; totalProcessed: number; directorySize: number }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transactions", buildingId, month, year] });
      const total = data.identified + data.suggested + data.pending + data.multi;
      if (total === 0) {
        toast({
          title: "Sin transacciones pendientes",
          description: "No hay transacciones pendientes para conciliar en este período. Verifique que la cartola fue cargada para este edificio y mes.",
          variant: "destructive",
        });
      } else if (data.identified === 0 && data.suggested === 0) {
        const reasons: string[] = [];
        if (data.directorySize === 0) reasons.push("El directorio de pagadores está vacío. Agregue pagadores con RUT y unidad para mejorar la conciliación.");
        else reasons.push(`Se buscó en ${data.directorySize} registros del directorio sin coincidencias.`);
        reasons.push(`${data.pending} transacciones quedaron pendientes de asignación manual.`);
        toast({
          title: "Conciliación sin coincidencias automáticas",
          description: reasons.join(" "),
        });
      } else {
        toast({
          title: "Conciliación ejecutada",
          description: `${data.identified} identificadas, ${data.suggested} sugeridas, ${data.pending} pendientes`,
        });
      }
      setStep(3);
    },
    onError: (error: Error) => {
      toast({ title: "Error al conciliar", description: error.message, variant: "destructive" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ id, unit, notes }: { id: string; unit: string; notes?: string }) => {
      await apiRequest("PATCH", `/api/bank-transactions/${id}/assign`, { unit, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transactions", buildingId, month, year] });
      toast({ title: "Transacción asignada" });
      closeAssignDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error al asignar", description: error.message, variant: "destructive" });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/bank-transactions/${id}/reactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transactions", buildingId, month, year] });
      toast({ title: "Transacción reactivada" });
    },
    onError: (error: Error) => {
      toast({ title: "Error al reactivar", description: error.message, variant: "destructive" });
    },
  });

  const splitMutation = useMutation({
    mutationFn: async ({ id, splits }: { id: string; splits: Array<{ unit: string; amount: number; description: string }> }) => {
      await apiRequest("POST", `/api/bank-transactions/${id}/split`, { splits });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transactions", buildingId, month, year] });
      toast({ title: "Transacción dividida" });
      closeSplitDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error al dividir", description: error.message, variant: "destructive" });
    },
  });

  const ignoreMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await apiRequest("PATCH", `/api/bank-transactions/${id}/ignore`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transactions", buildingId, month, year] });
      toast({ title: "Transacción ignorada" });
      closeIgnoreDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error al ignorar", description: error.message, variant: "destructive" });
    },
  });

  const addPayerMutation = useMutation({
    mutationFn: async (data: { buildingId: string; rut: string; pattern: string; unit: string; confidence: number; createdBy: string }) => {
      await apiRequest("POST", "/api/payer-directory", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payer-directory", buildingId] });
      toast({ title: "Pagador agregado" });
      setNewPayerRut("");
      setNewPayerPattern("");
      setNewPayerUnit("");
      setNewPayerConfidence("80");
    },
    onError: (error: Error) => {
      toast({ title: "Error al agregar pagador", description: error.message, variant: "destructive" });
    },
  });

  const confirmAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bank-transactions/confirm-all-suggested", {
        buildingId,
        periodMonth: Number(month),
        periodYear: Number(year),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transactions", buildingId, month, year] });
      toast({ title: `${data.confirmed || 0} transacciones confirmadas` });
    },
    onError: (error: Error) => {
      toast({ title: "Error al confirmar", description: error.message, variant: "destructive" });
    },
  });

  const deletePayerMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/payer-directory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payer-directory", buildingId] });
      toast({ title: "Pagador eliminado" });
    },
    onError: (error: Error) => {
      toast({ title: "Error al eliminar pagador", description: error.message, variant: "destructive" });
    },
  });

  async function handleFileUpload() {
    if (!selectedFile || !buildingId) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("buildingId", buildingId);
      formData.append("periodMonth", month);
      formData.append("periodYear", year);

      const res = await fetch("/api/bank-transactions/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error al importar");
      }
      const result = await res.json();
      setUploadResult({ imported: result.imported || 0, duplicates: result.duplicates || 0, detectedBank: result.detectedBank || "" });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transactions", buildingId, month, year] });
      toast({ title: `${result.imported || 0} transacciones importadas` });
    } catch (error: any) {
      toast({ title: "Error al importar cartola", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const url = `/api/bank-transactions/export?buildingId=${buildingId}&month=${month}&year=${year}&format=${exportFormat}&onlyNew=${exportOnlyNew}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Error al exportar" }));
        throw new Error(err.error || "Error al exportar");
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const suffix = exportOnlyNew ? "_nuevos" : "";
      a.download = `conciliacion_${exportFormat}_${year}-${month}${suffix}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transactions/export-stats", buildingId, month, year] });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-transactions", buildingId, month, year] });
      toast({ title: "Archivo exportado exitosamente", description: exportOnlyNew ? "Las transacciones exportadas fueron marcadas" : "Todas las transacciones fueron marcadas como exportadas" });
    } catch (error: any) {
      toast({ title: "Error al exportar", description: error.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }

  function openAssignDialog(txn: BankTransaction) {
    setSelectedTxn(txn);
    setAssignUnit(txn.assignedUnit || "");
    setAssignNotes("");
    setAssignDialogOpen(true);
  }

  function closeAssignDialog() {
    setAssignDialogOpen(false);
    setSelectedTxn(null);
    setAssignUnit("");
    setAssignNotes("");
  }

  function openSplitDialog(txn: BankTransaction) {
    setSelectedTxn(txn);
    setSplitRows([{ unit: "", amount: "", description: "" }]);
    setSplitDialogOpen(true);
  }

  function closeSplitDialog() {
    setSplitDialogOpen(false);
    setSelectedTxn(null);
    setSplitRows([{ unit: "", amount: "", description: "" }]);
  }

  function openIgnoreDialog(txn: BankTransaction) {
    setSelectedTxn(txn);
    setIgnoreReason("");
    setIgnoreDialogOpen(true);
  }

  function closeIgnoreDialog() {
    setIgnoreDialogOpen(false);
    setSelectedTxn(null);
    setIgnoreReason("");
  }

  function handleConfirmSuggested(txn: BankTransaction) {
    assignMutation.mutate({ id: txn.id, unit: txn.assignedUnit || "" });
  }

  function handleReactivate(txn: BankTransaction) {
    reactivateMutation.mutate(txn.id);
  }

  const splitSum = splitRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const splitTotal = selectedTxn ? Number(selectedTxn.amount) : 0;
  const splitDiff = splitTotal - splitSum;
  const splitValid = splitRows.length > 0 &&
    splitRows.every((r) => r.unit && Number(r.amount) > 0) &&
    Math.abs(splitDiff) < 1;

  function getBuildingName(id: string) {
    return buildings?.find((b) => b.id === id)?.name || id;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-background border-b border-border z-50 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Landmark className="h-6 w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-page-title">
              Conciliación Bancaria
            </h1>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 overflow-x-auto" data-testid="step-indicators">
          {stepLabels.map((label, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isCompleted = step > stepNum;
            return (
              <button
                key={stepNum}
                onClick={() => {
                  if (stepNum < step || (stepNum === 5 && buildingId)) setStep(stepNum);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                    ? "bg-muted text-foreground cursor-pointer"
                    : stepNum === 5 && buildingId
                    ? "bg-muted text-foreground cursor-pointer"
                    : "bg-muted/50 text-muted-foreground cursor-default"
                }`}
                disabled={stepNum > step && !(stepNum === 5 && buildingId)}
                data-testid={`step-indicator-${stepNum}`}
              >
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <span className="flex items-center justify-center h-5 w-5 rounded-full border text-xs">
                    {stepNum}
                  </span>
                )}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {step === 1 && <Step1 />}
          {step === 2 && <Step2 />}
          {step === 3 && <Step3 />}
          {step === 4 && <Step4 />}
          {step === 5 && <Step5 />}
        </div>
      </div>

      {assignDialogOpen && selectedTxn && (
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-assign">
            <DialogHeader>
              <DialogTitle>Asignar Unidad</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Card className="bg-muted/50">
                <CardContent className="pt-4 pb-4 space-y-1">
                  <p className="text-sm"><strong>Fecha:</strong> {formatDate(selectedTxn.txnDate)}</p>
                  <p className="text-sm"><strong>Monto:</strong> {formatCurrency(selectedTxn.amount)}</p>
                  <p className="text-sm"><strong>Glosa:</strong> {selectedTxn.description || "-"}</p>
                  {selectedTxn.payerName && <p className="text-sm"><strong>Pagador:</strong> {selectedTxn.payerName}</p>}
                  {selectedTxn.payerRut && <p className="text-sm"><strong>RUT:</strong> {selectedTxn.payerRut}</p>}
                </CardContent>
              </Card>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unidad / Departamento</label>
                <Input
                  value={assignUnit}
                  onChange={(e) => setAssignUnit(e.target.value)}
                  placeholder="Ej: 301, 1806, Local 1..."
                  data-testid="input-assign-unit"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notas (opcional)</label>
                <Textarea
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Notas adicionales..."
                  data-testid="input-assign-notes"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeAssignDialog} data-testid="button-cancel-assign">
                  Cancelar
                </Button>
                <Button
                  onClick={() => assignMutation.mutate({ id: selectedTxn.id, unit: assignUnit, notes: assignNotes })}
                  disabled={!assignUnit.trim() || assignMutation.isPending}
                  data-testid="button-submit-assign"
                >
                  {assignMutation.isPending ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Asignar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <SplitDialog />

      {ignoreDialogOpen && selectedTxn && (
        <Dialog open={ignoreDialogOpen} onOpenChange={setIgnoreDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-ignore">
            <DialogHeader>
              <DialogTitle>Ignorar Transacción</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Card className="bg-muted/50">
                <CardContent className="pt-4 pb-4 space-y-1">
                  <p className="text-sm"><strong>Fecha:</strong> {formatDate(selectedTxn.txnDate)}</p>
                  <p className="text-sm"><strong>Monto:</strong> {formatCurrency(selectedTxn.amount)}</p>
                  <p className="text-sm"><strong>Glosa:</strong> {selectedTxn.description || "-"}</p>
                </CardContent>
              </Card>
              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo (requerido)</label>
                <Textarea
                  value={ignoreReason}
                  onChange={(e) => setIgnoreReason(e.target.value)}
                  placeholder="Ingrese el motivo para ignorar esta transacción..."
                  data-testid="input-ignore-reason"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeIgnoreDialog} data-testid="button-cancel-ignore">
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => ignoreMutation.mutate({ id: selectedTxn.id, reason: ignoreReason })}
                  disabled={!ignoreReason.trim() || ignoreMutation.isPending}
                  data-testid="button-submit-ignore"
                >
                  {ignoreMutation.isPending ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Ignorar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <PayerDirectoryDialog />
    </div>
  );

  function Step1() {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle data-testid="text-step1-title">Selección de Edificio y Periodo de Conciliación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Mes de Gasto Común</label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger data-testid="select-month">
                    <SelectValue placeholder="Mes de Gasto Común" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Año</label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger data-testid="select-year">
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y.value} value={y.value}>
                        {y.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {buildingId && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4 pb-4">
                  {txnLoading ? (
                    <Skeleton className="h-5 w-64" />
                  ) : (
                    <p className="text-sm" data-testid="text-transaction-count">
                      <FileSpreadsheet className="inline h-4 w-4 mr-1 text-muted-foreground" />
                      <strong>{transactions?.length || 0}</strong> transacciones cargadas para este período
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!buildingId}
                data-testid="button-continue-step1"
              >
                Continuar
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  function Step2() {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle data-testid="text-step2-title">Cargar Cartola Bancaria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Edificio: <strong>{getBuildingName(buildingId)}</strong> — Período:{" "}
              <strong>{months.find((m) => m.value === month)?.label} {year}</strong>
            </p>

            <div className="border-2 border-dashed rounded-md p-6 text-center space-y-3">
              <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                Cargar Archivo .csv, .xlsx o .xls
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  setSelectedFile(e.target.files?.[0] || null);
                  setUploadResult(null);
                }}
                data-testid="input-file-upload"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-select-file"
              >
                Seleccionar archivo
              </Button>
              {selectedFile && (
                <p className="text-sm" data-testid="text-selected-file">
                  {selectedFile.name}
                </p>
              )}
            </div>

            {selectedFile && !uploadResult && (
              <Button
                onClick={handleFileUpload}
                disabled={isUploading}
                data-testid="button-upload-file"
              >
                {isUploading ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                {isUploading ? "Importando..." : "Importar Cartola"}
              </Button>
            )}

            {uploadResult && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4 pb-4 space-y-1">
                  <p className="text-sm" data-testid="text-upload-result">
                    <CheckCircle className="inline h-4 w-4 mr-1 text-green-600" />
                    <strong>{uploadResult.imported}</strong> importadas, <strong>{uploadResult.duplicates}</strong> duplicadas
                  </p>
                  {uploadResult.detectedBank && (
                    <p className="text-sm text-muted-foreground" data-testid="text-detected-bank">
                      <Landmark className="inline h-4 w-4 mr-1" />
                      Banco detectado: <strong>{uploadResult.detectedBank}</strong>
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setStep(1)} data-testid="button-back-step2">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Volver
              </Button>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => setStep(3)}
                  data-testid="button-skip-step2"
                >
                  <SkipForward className="h-4 w-4 mr-1" />
                  Omitir
                </Button>
                <Button
                  onClick={() => reconcileMutation.mutate()}
                  disabled={reconcileMutation.isPending}
                  data-testid="button-reconcile"
                >
                  {reconcileMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Conciliar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  function Step3() {
    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Total transacciones</p>
              <p className="text-lg font-semibold" data-testid="text-total-count">{statusCounts.all}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Identificadas</p>
              <p className="text-lg font-semibold text-green-600" data-testid="text-identified-count">{statusCounts.identified}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Sugeridas</p>
              <p className="text-lg font-semibold text-yellow-600" data-testid="text-suggested-count">{statusCounts.suggested}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Pendientes</p>
              <p className="text-lg font-semibold" data-testid="text-pending-count">{statusCounts.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Monto identificado</p>
              <p className="text-lg font-semibold text-green-600" data-testid="text-identified-amount">{formatCurrency(identifiedAmount)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 overflow-x-auto flex-wrap">
            {tabFilters.map((tab) => (
              <Button
                key={tab.value}
                variant={activeTab === tab.value ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tab.value)}
                data-testid={`tab-filter-${tab.value}`}
              >
                {tab.label}
                <Badge variant="secondary" className="ml-1">{statusCounts[tab.value]}</Badge>
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => reconcileMutation.mutate()}
              disabled={reconcileMutation.isPending}
              data-testid="button-re-reconcile"
            >
              {reconcileMutation.isPending ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Re-conciliar
            </Button>
            {statusCounts.suggested > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => confirmAllMutation.mutate()}
                disabled={confirmAllMutation.isPending}
                data-testid="button-confirm-all"
              >
                {confirmAllMutation.isPending ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Confirmar todos ({statusCounts.suggested})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPayerDirDialogOpen(true)}
              data-testid="button-payer-directory"
            >
              <Users className="h-4 w-4 mr-1" />
              Directorio
            </Button>
            <Button
              size="sm"
              onClick={() => setStep(4)}
              data-testid="button-go-export"
            >
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {txnLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground" data-testid="text-no-transactions">
                No hay transacciones para mostrar
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Pagador</TableHead>
                      <TableHead>RUT</TableHead>
                      <TableHead>Detalle</TableHead>
                      <TableHead>Banco</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((txn) => (
                      <TableRow key={txn.id} data-testid={`row-transaction-${txn.id}`}>
                        <TableCell className="whitespace-nowrap" data-testid={`text-date-${txn.id}`}>
                          {formatDate(txn.txnDate)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap font-mono" data-testid={`text-amount-${txn.id}`}>
                          {formatCurrency(txn.amount)}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate" title={(txn as any).payerName || ""} data-testid={`text-payer-name-${txn.id}`}>
                          {(txn as any).payerName || "-"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap" data-testid={`text-rut-${txn.id}`}>{txn.payerRut || "-"}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={txn.description || ""} data-testid={`text-description-${txn.id}`}>
                          {txn.description || "-"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap" data-testid={`text-source-bank-${txn.id}`}>
                          {(txn as any).sourceBank || txn.bankName || "-"}
                        </TableCell>
                        <TableCell data-testid={`text-unit-${txn.id}`}>{txn.assignedUnit || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            <StatusBadge status={txn.status} />
                            {txn.exportedAt && (
                              <Badge variant="outline" className="text-xs" data-testid={`badge-exported-${txn.id}`}>
                                Exp.
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <TransactionActions txn={txn} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setStep(2)} data-testid="button-back-step3">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Volver a carga
          </Button>
        </div>
      </>
    );
  }

  function Step4() {
    const newCount = exportStats?.new || 0;
    const exportedCount = exportStats?.exported || 0;
    const totalCount = exportStats?.total || 0;

    return (
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-step4-title">Exportar Conciliación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Edificio: <strong>{getBuildingName(buildingId)}</strong> — Período:{" "}
            <strong>{months.find((m) => m.value === month)?.label} {year}</strong>
          </p>

          <Card className="bg-muted/50">
            <CardContent className="pt-4 pb-4 space-y-2">
              <p className="text-sm" data-testid="text-export-summary">
                <CheckCircle className="inline h-4 w-4 mr-1 text-green-600" />
                <strong>{totalCount}</strong> transacciones identificadas en total
              </p>
              {newCount > 0 && (
                <p className="text-sm" data-testid="text-export-new-count">
                  <FileSpreadsheet className="inline h-4 w-4 mr-1 text-blue-500" />
                  <strong>{newCount}</strong> nuevas (sin exportar)
                </p>
              )}
              {exportedCount > 0 && (
                <p className="text-sm text-muted-foreground" data-testid="text-export-exported-count">
                  <Check className="inline h-4 w-4 mr-1 text-muted-foreground" />
                  <strong>{exportedCount}</strong> ya exportadas anteriormente
                </p>
              )}
              <p className="text-sm text-muted-foreground" data-testid="text-export-note">
                Los ingresos manuales identificados del mismo período se incluyen automáticamente.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Modo de exportación</label>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={exportOnlyNew ? "default" : "outline"}
                size="sm"
                onClick={() => setExportOnlyNew(true)}
                data-testid="button-export-only-new"
                className="toggle-elevate"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Solo nuevos ({newCount})
              </Button>
              <Button
                variant={!exportOnlyNew ? "default" : "outline"}
                size="sm"
                onClick={() => setExportOnlyNew(false)}
                data-testid="button-export-all"
                className="toggle-elevate"
              >
                <Download className="h-4 w-4 mr-1" />
                Todos ({totalCount})
              </Button>
            </div>
            {exportOnlyNew && newCount === 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                No hay transacciones nuevas. Todas ya fueron exportadas. Puede usar "Todos" para re-exportar.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Formato de exportación</label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="w-full max-w-xs" data-testid="select-export-format">
                <SelectValue placeholder="Formato" />
              </SelectTrigger>
              <SelectContent>
                {exportFormats.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setStep(3)} data-testid="button-back-step4">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Volver a conciliación
            </Button>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleExport}
                disabled={isExporting || (exportOnlyNew ? newCount === 0 : totalCount === 0)}
                data-testid="button-export"
              >
                {isExporting ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1" />
                )}
                Exportar {exportOnlyNew ? "nuevos" : "todos"}
              </Button>
              <Button variant="outline" onClick={() => setStep(5)} data-testid="button-go-history">
                Historial
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function Step5() {
    const buildingName = getBuildingName(buildingId);

    const openReconciliation = (entry: ReconciliationHistoryEntry) => {
      setMonth(String(entry.periodMonth));
      setYear(String(entry.periodYear));
      setStep(3);
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-step5-title">Conciliaciones Realizadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Edificio: <strong>{buildingName}</strong>
          </p>

          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !reconciliationHistory || reconciliationHistory.length === 0 ? (
            <Card className="bg-muted/50">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-sm text-muted-foreground" data-testid="text-no-history">
                  No hay conciliaciones registradas para este edificio.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Rango de Fechas</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Identificadas</TableHead>
                    <TableHead className="text-right">Pendientes</TableHead>
                    <TableHead className="text-right">Monto Total</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciliationHistory.map((entry) => {
                    const monthLabel = months.find((m) => m.value === String(entry.periodMonth))?.label || "";
                    const dateFrom = entry.dateFrom ? formatDate(entry.dateFrom) : "-";
                    const dateTo = entry.dateTo ? formatDate(entry.dateTo) : "-";
                    const completionPct = entry.total > 0 ? Math.round((entry.identified / entry.total) * 100) : 0;
                    const hasPending = entry.pending > 0 || entry.suggested > 0;
                    return (
                      <TableRow key={`${entry.periodYear}-${entry.periodMonth}`} data-testid={`row-history-${entry.periodYear}-${entry.periodMonth}`}>
                        <TableCell>
                          <span className="font-medium">{monthLabel} {entry.periodYear}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {dateFrom} — {dateTo}
                        </TableCell>
                        <TableCell className="text-right">{entry.total}</TableCell>
                        <TableCell className="text-right">
                          <span className="text-green-600 dark:text-green-400">{entry.identified}</span>
                          <span className="text-muted-foreground text-xs ml-1">({completionPct}%)</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {hasPending ? (
                            <span className="text-amber-600 dark:text-amber-400">{entry.pending + entry.suggested}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.totalAmount)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReconciliation(entry)}
                            data-testid={`button-open-history-${entry.periodYear}-${entry.periodMonth}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {hasPending ? "Trabajar" : "Revisar"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setStep(4)} data-testid="button-back-step5">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Volver a exportación
            </Button>
            <Button variant="outline" onClick={() => setStep(1)} data-testid="button-new-reconciliation">
              Nueva conciliación
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  function StatusBadge({ status }: { status: string }) {
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className={config.className} data-testid={`badge-status-${status}`}>
        {config.label}
      </Badge>
    );
  }

  function TransactionActions({ txn }: { txn: BankTransaction }) {
    switch (txn.status) {
      case "pending":
        return (
          <div className="flex items-center gap-1 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => openAssignDialog(txn)} data-testid={`button-assign-${txn.id}`}>
              Asignar
            </Button>
            <Button size="sm" variant="outline" onClick={() => openSplitDialog(txn)} data-testid={`button-split-${txn.id}`}>
              Dividir
            </Button>
            <Button size="sm" variant="outline" onClick={() => openIgnoreDialog(txn)} data-testid={`button-ignore-${txn.id}`}>
              Ignorar
            </Button>
          </div>
        );
      case "suggested":
        return (
          <div className="flex items-center gap-1 flex-wrap">
            <Button size="sm" onClick={() => handleConfirmSuggested(txn)} data-testid={`button-confirm-${txn.id}`}>
              Confirmar
            </Button>
            <Button size="sm" variant="outline" onClick={() => openAssignDialog(txn)} data-testid={`button-change-${txn.id}`}>
              Cambiar
            </Button>
            <Button size="sm" variant="outline" onClick={() => openSplitDialog(txn)} data-testid={`button-split-${txn.id}`}>
              Dividir
            </Button>
            <Button size="sm" variant="outline" onClick={() => openIgnoreDialog(txn)} data-testid={`button-ignore-${txn.id}`}>
              Ignorar
            </Button>
          </div>
        );
      case "multi":
        return (
          <div className="flex items-center gap-1 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => openSplitDialog(txn)} data-testid={`button-split-${txn.id}`}>
              Dividir
            </Button>
            <Button size="sm" variant="outline" onClick={() => openAssignDialog(txn)} data-testid={`button-assign-${txn.id}`}>
              Asignar
            </Button>
          </div>
        );
      case "identified":
        return (
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">{txn.assignedUnit}</span>
            <Button size="icon" variant="ghost" onClick={() => openAssignDialog(txn)} data-testid={`button-edit-${txn.id}`}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => openSplitDialog(txn)} data-testid={`button-split-${txn.id}`}>
              <Split className="h-3 w-3" />
            </Button>
          </div>
        );
      case "ignored":
        return (
          <div className="flex items-center gap-1">
            {txn.ignoreReason && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" data-testid={`button-reason-${txn.id}`}>
                    <AlertCircle className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{txn.ignoreReason}</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Button size="sm" variant="outline" onClick={() => handleReactivate(txn)} disabled={reactivateMutation.isPending} data-testid={`button-reactivate-${txn.id}`}>
              {reactivateMutation.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : null}
              Reactivar
            </Button>
          </div>
        );
      default:
        return null;
    }
  }


  function SplitDialog() {
    return (
      <Dialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl" data-testid="dialog-split">
          <DialogHeader>
            <DialogTitle>Dividir Transacción</DialogTitle>
          </DialogHeader>
          {selectedTxn && (
            <div className="space-y-4">
              <Card className="bg-muted/50">
                <CardContent className="pt-4 pb-4 space-y-1">
                  <p className="text-sm"><strong>Fecha:</strong> {formatDate(selectedTxn.txnDate)}</p>
                  <p className="text-sm"><strong>Monto total:</strong> {formatCurrency(selectedTxn.amount)}</p>
                  <p className="text-sm"><strong>Glosa:</strong> {selectedTxn.description || "-"}</p>
                </CardContent>
              </Card>

              <div className="space-y-3">
                {splitRows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2 flex-wrap" data-testid={`split-row-${i}`}>
                    <Input
                      value={row.unit}
                      onChange={(e) => {
                        const updated = [...splitRows];
                        updated[i] = { ...updated[i], unit: e.target.value };
                        setSplitRows(updated);
                      }}
                      placeholder="Unidad"
                      className="flex-1 min-w-[100px]"
                      data-testid={`input-split-unit-${i}`}
                    />
                    <Input
                      type="number"
                      value={row.amount}
                      onChange={(e) => {
                        const updated = [...splitRows];
                        updated[i] = { ...updated[i], amount: e.target.value };
                        setSplitRows(updated);
                      }}
                      placeholder="Monto"
                      className="w-32"
                      data-testid={`input-split-amount-${i}`}
                    />
                    <Input
                      value={row.description}
                      onChange={(e) => {
                        const updated = [...splitRows];
                        updated[i] = { ...updated[i], description: e.target.value };
                        setSplitRows(updated);
                      }}
                      placeholder="Descripción"
                      className="flex-1 min-w-[100px]"
                      data-testid={`input-split-description-${i}`}
                    />
                    {splitRows.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setSplitRows(splitRows.filter((_, idx) => idx !== i))}
                        data-testid={`button-remove-split-${i}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSplitRows([...splitRows, { unit: "", amount: "", description: "" }])}
                data-testid="button-add-split-row"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar Unidad
              </Button>

              <Card className={`bg-muted/50 ${Math.abs(splitDiff) > 0.5 ? "border-destructive" : ""}`}>
                <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="text-sm">
                    <span>Suma: <strong>{formatCurrency(splitSum)}</strong></span>
                    <span className="mx-2">|</span>
                    <span>Total: <strong>{formatCurrency(splitTotal)}</strong></span>
                  </div>
                  <div className="text-sm">
                    Diferencia:{" "}
                    <strong className={Math.abs(splitDiff) > 0.5 ? "text-destructive" : "text-green-600"}>
                      {formatCurrency(splitDiff)}
                    </strong>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeSplitDialog} data-testid="button-cancel-split">
                  Cancelar
                </Button>
                <Button
                  onClick={() =>
                    splitMutation.mutate({
                      id: selectedTxn.id,
                      splits: splitRows.map((r) => ({
                        unit: r.unit,
                        amount: Number(r.amount),
                        description: r.description,
                      })),
                    })
                  }
                  disabled={!splitValid || splitMutation.isPending}
                  data-testid="button-submit-split"
                >
                  {splitMutation.isPending ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Dividir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }


  function PayerDirectoryDialog() {
    return (
      <Dialog open={payerDirDialogOpen} onOpenChange={setPayerDirDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-3xl" data-testid="dialog-payer-directory">
          <DialogHeader>
            <DialogTitle>Directorio de Pagadores</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-end gap-2 flex-wrap">
              <div className="space-y-1">
                <label className="text-xs font-medium">RUT</label>
                <Input
                  value={newPayerRut}
                  onChange={(e) => setNewPayerRut(e.target.value)}
                  placeholder="12.345.678-9"
                  className="w-36"
                  data-testid="input-payer-rut"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Patrón</label>
                <Input
                  value={newPayerPattern}
                  onChange={(e) => setNewPayerPattern(e.target.value)}
                  placeholder="Patrón de texto"
                  className="w-36"
                  data-testid="input-payer-pattern"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Unidad</label>
                <Input
                  value={newPayerUnit}
                  onChange={(e) => setNewPayerUnit(e.target.value)}
                  placeholder="Ej: 101"
                  className="w-24"
                  data-testid="input-payer-unit"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Confianza</label>
                <Input
                  type="number"
                  value={newPayerConfidence}
                  onChange={(e) => setNewPayerConfidence(e.target.value)}
                  className="w-20"
                  data-testid="input-payer-confidence"
                />
              </div>
              <Button
                size="sm"
                onClick={() =>
                  addPayerMutation.mutate({
                    buildingId,
                    rut: newPayerRut,
                    pattern: newPayerPattern,
                    unit: newPayerUnit,
                    confidence: Number(newPayerConfidence) || 80,
                    createdBy: user?.id || "",
                  })
                }
                disabled={!newPayerUnit || addPayerMutation.isPending}
                data-testid="button-add-payer"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>

            {payerLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : !payerDirectory || payerDirectory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-payers">
                No hay pagadores registrados
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>RUT</TableHead>
                      <TableHead>Patrón</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Confianza</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payerDirectory.map((entry) => (
                      <TableRow key={entry.id} data-testid={`row-payer-${entry.id}`}>
                        <TableCell data-testid={`text-payer-rut-${entry.id}`}>{entry.rut || "-"}</TableCell>
                        <TableCell data-testid={`text-payer-pattern-${entry.id}`}>{entry.pattern || "-"}</TableCell>
                        <TableCell data-testid={`text-payer-unit-${entry.id}`}>{entry.unit}</TableCell>
                        <TableCell data-testid={`text-payer-confidence-${entry.id}`}>{entry.confidence}%</TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deletePayerMutation.mutate(entry.id)}
                            disabled={deletePayerMutation.isPending}
                            data-testid={`button-delete-payer-${entry.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }
}
