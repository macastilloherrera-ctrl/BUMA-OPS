import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { AlertCircle, Info, Plus, Save, Settings, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Building, ClosingCycleGlobalConfig, ClosingCycleBuildingOverride } from "@shared/schema";

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
const years = [currentYear - 1, currentYear, currentYear + 1].map(String);

type OverrideForm = {
  buildingId: string;
  month: string;
  year: string;
  emissionDay: string;
  expenseCutoffDay: string;
  incomeCutoffDay: string;
  preStateDay: string;
  finalEmissionDay: string;
  reason: string;
};

const emptyOverrideForm = (): OverrideForm => ({
  buildingId: "",
  month: String(new Date().getMonth() + 1),
  year: String(currentYear),
  emissionDay: "",
  expenseCutoffDay: "",
  incomeCutoffDay: "",
  preStateDay: "",
  finalEmissionDay: "",
  reason: "",
});

export default function ClosingCycleConfig() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [overrideForm, setOverrideForm] = useState<OverrideForm>(emptyOverrideForm());

  const { data: profile } = useQuery({
    queryKey: ["/api/user/profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const canWrite = profile?.role === "gerente_general" || profile?.role === "gerente_comercial";

  const { data: globalConfig, isLoading: configLoading } = useQuery<ClosingCycleGlobalConfig | null>({
    queryKey: ["/api/closing-config/global"],
    queryFn: async () => {
      const res = await fetch("/api/closing-config/global", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: overrides, isLoading: overridesLoading } = useQuery<ClosingCycleBuildingOverride[]>({
    queryKey: ["/api/closing-config/overrides"],
    queryFn: async () => {
      const res = await fetch("/api/closing-config/overrides", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: buildings } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const buildingMap = new Map(buildings?.map(b => [b.id, b]) ?? []);

  // ─── Formulario config global ────────────────────────────────────────
  const [globalForm, setGlobalForm] = useState({
    emissionDay: String(globalConfig?.emissionDay ?? 25),
    expenseCutoffDay: String(globalConfig?.expenseCutoffDay ?? 18),
    incomeCutoffDay: String(globalConfig?.incomeCutoffDay ?? 20),
    preStateDay: String(globalConfig?.preStateDay ?? 22),
    finalEmissionDay: String(globalConfig?.finalEmissionDay ?? 25),
    alertDaysBeforeDeadline: String(globalConfig?.alertDaysBeforeDeadline ?? 2),
    alertOnMissingCycle: globalConfig?.alertOnMissingCycle ?? true,
  });

  // Sincroniza el formulario cuando llegan datos del servidor
  const syncedGlobalForm = globalConfig
    ? {
        emissionDay: String(globalConfig.emissionDay),
        expenseCutoffDay: String(globalConfig.expenseCutoffDay),
        incomeCutoffDay: String(globalConfig.incomeCutoffDay),
        preStateDay: String(globalConfig.preStateDay),
        finalEmissionDay: String(globalConfig.finalEmissionDay),
        alertDaysBeforeDeadline: String(globalConfig.alertDaysBeforeDeadline),
        alertOnMissingCycle: globalConfig.alertOnMissingCycle,
      }
    : globalForm;

  const [formState, setFormState] = useState(syncedGlobalForm);

  const updateField = (key: keyof typeof formState, value: string | boolean) =>
    setFormState(prev => ({ ...prev, [key]: value }));

  const saveGlobalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/closing-config/global", {
        emissionDay: parseInt(formState.emissionDay),
        expenseCutoffDay: parseInt(formState.expenseCutoffDay),
        incomeCutoffDay: parseInt(formState.incomeCutoffDay),
        preStateDay: parseInt(formState.preStateDay),
        finalEmissionDay: parseInt(formState.finalEmissionDay),
        alertDaysBeforeDeadline: parseInt(formState.alertDaysBeforeDeadline),
        alertOnMissingCycle: formState.alertOnMissingCycle,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/closing-config/global"] });
      toast({ title: "Configuración global guardada" });
    },
    onError: (e: Error) => toast({ title: "Error al guardar", description: e.message, variant: "destructive" }),
  });

  const saveOverrideMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        buildingId: overrideForm.buildingId,
        month: parseInt(overrideForm.month),
        year: parseInt(overrideForm.year),
        reason: overrideForm.reason,
      };
      if (overrideForm.emissionDay) payload.emissionDay = parseInt(overrideForm.emissionDay);
      if (overrideForm.expenseCutoffDay) payload.expenseCutoffDay = parseInt(overrideForm.expenseCutoffDay);
      if (overrideForm.incomeCutoffDay) payload.incomeCutoffDay = parseInt(overrideForm.incomeCutoffDay);
      if (overrideForm.preStateDay) payload.preStateDay = parseInt(overrideForm.preStateDay);
      if (overrideForm.finalEmissionDay) payload.finalEmissionDay = parseInt(overrideForm.finalEmissionDay);
      const res = await apiRequest("POST", "/api/closing-config/override", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/closing-config/overrides"] });
      setOverrideDialogOpen(false);
      setOverrideForm(emptyOverrideForm());
      toast({ title: "Override guardado" });
    },
    onError: (e: Error) => toast({ title: "Error al guardar override", description: e.message, variant: "destructive" }),
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/closing-config/override/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/closing-config/overrides"] });
      toast({ title: "Override eliminado" });
    },
    onError: (e: Error) => toast({ title: "Error al eliminar", description: e.message, variant: "destructive" }),
  });

  const overrideField = (key: keyof OverrideForm, value: string) =>
    setOverrideForm(prev => ({ ...prev, [key]: value }));

  const dayField = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder?: string,
    disabled?: boolean,
  ) => (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-sm">{label}</Label>
      <Input
        id={id}
        type="number"
        min={1}
        max={31}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? "Día (1-31)"}
        disabled={disabled}
        className="w-full"
      />
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Configuración Global de Ciclo</h1>
      </div>

      {/* ── Sección A: Config Global ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuración Global</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Esta configuración se aplica a todos los edificios para ciclos futuros.
              Los ciclos ya creados no se modifican.
            </span>
          </div>

          {configLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {dayField("emissionDay", "Día de emisión", formState.emissionDay, v => updateField("emissionDay", v))}
                {dayField("expenseCutoffDay", "Corte de egresos", formState.expenseCutoffDay, v => updateField("expenseCutoffDay", v))}
                {dayField("incomeCutoffDay", "Corte de ingresos", formState.incomeCutoffDay, v => updateField("incomeCutoffDay", v))}
                {dayField("preStateDay", "Envío pre-estado", formState.preStateDay, v => updateField("preStateDay", v))}
                {dayField("finalEmissionDay", "Emisión definitiva", formState.finalEmissionDay, v => updateField("finalEmissionDay", v))}
                {dayField("alertDaysBeforeDeadline", "Días de anticipación para alertar", formState.alertDaysBeforeDeadline, v => updateField("alertDaysBeforeDeadline", v))}
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="alertOnMissingCycle"
                  checked={formState.alertOnMissingCycle as boolean}
                  onCheckedChange={v => updateField("alertOnMissingCycle", v)}
                  disabled={!canWrite}
                />
                <Label htmlFor="alertOnMissingCycle">
                  Alertar si un edificio activo no tiene ciclo del mes en curso
                </Label>
              </div>

              {globalConfig?.updatedBy && (
                <p className="text-xs text-muted-foreground">
                  Última modificación: {new Date(globalConfig.updatedAt!).toLocaleDateString("es-CL")}
                  {" · "}por usuario {globalConfig.updatedBy}
                </p>
              )}

              {canWrite && (
                <Button onClick={() => saveGlobalMutation.mutate()} disabled={saveGlobalMutation.isPending}>
                  <Save className="h-4 w-4 mr-1" />
                  {saveGlobalMutation.isPending ? "Guardando…" : "Guardar configuración global"}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Sección B: Overrides por Edificio ───────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Overrides por Edificio</CardTitle>
          {canWrite && (
            <Button size="sm" onClick={() => { setOverrideForm(emptyOverrideForm()); setOverrideDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar Override
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {overridesLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : !overrides?.length ? (
            <p className="text-sm text-muted-foreground">No hay overrides configurados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Edificio</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Campos modificados</TableHead>
                  <TableHead>Motivo</TableHead>
                  {canWrite && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map(ov => {
                  const modified = [
                    ov.emissionDay !== null && "Emisión",
                    ov.expenseCutoffDay !== null && "Corte egresos",
                    ov.incomeCutoffDay !== null && "Corte ingresos",
                    ov.preStateDay !== null && "Pre-estado",
                    ov.finalEmissionDay !== null && "Emisión final",
                  ].filter(Boolean) as string[];

                  return (
                    <TableRow key={ov.id}>
                      <TableCell className="font-medium">
                        {buildingMap.get(ov.buildingId)?.name ?? ov.buildingId}
                      </TableCell>
                      <TableCell>{months.find(m => m.value === String(ov.month))?.label} {ov.year}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {modified.map(f => (
                            <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{ov.reason}</TableCell>
                      {canWrite && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteOverrideMutation.mutate(ov.id)}
                            disabled={deleteOverrideMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog: Agregar Override ─────────────────────────────────── */}
      {overrideDialogOpen && (
        <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Agregar Override de Edificio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Edificio</Label>
                <Select value={overrideForm.buildingId} onValueChange={v => overrideField("buildingId", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar edificio" /></SelectTrigger>
                  <SelectContent>
                    {buildings?.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Mes</Label>
                  <Select value={overrideForm.month} onValueChange={v => overrideField("month", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Año</Label>
                  <Select value={overrideForm.year} onValueChange={v => overrideField("year", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="text-xs text-muted-foreground flex gap-1 items-center">
                <AlertCircle className="h-3 w-3" />
                Deja en blanco los campos que no difieren del global.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {dayField("ov-emissionDay", "Día de emisión", overrideForm.emissionDay, v => overrideField("emissionDay", v),
                  globalConfig ? `Global: ${globalConfig.emissionDay}` : undefined)}
                {dayField("ov-expenseCutoffDay", "Corte de egresos", overrideForm.expenseCutoffDay, v => overrideField("expenseCutoffDay", v),
                  globalConfig ? `Global: ${globalConfig.expenseCutoffDay}` : undefined)}
                {dayField("ov-incomeCutoffDay", "Corte de ingresos", overrideForm.incomeCutoffDay, v => overrideField("incomeCutoffDay", v),
                  globalConfig ? `Global: ${globalConfig.incomeCutoffDay}` : undefined)}
                {dayField("ov-preStateDay", "Pre-estado al comité", overrideForm.preStateDay, v => overrideField("preStateDay", v),
                  globalConfig ? `Global: ${globalConfig.preStateDay}` : undefined)}
                {dayField("ov-finalEmissionDay", "Emisión definitiva", overrideForm.finalEmissionDay, v => overrideField("finalEmissionDay", v),
                  globalConfig ? `Global: ${globalConfig.finalEmissionDay}` : undefined)}
              </div>

              <div className="space-y-1">
                <Label>Motivo <span className="text-destructive">*</span></Label>
                <Textarea
                  value={overrideForm.reason}
                  onChange={e => overrideField("reason", e.target.value)}
                  placeholder="Ej: Feriado en la semana de cierre habitual"
                  rows={2}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setOverrideDialogOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => saveOverrideMutation.mutate()}
                  disabled={
                    saveOverrideMutation.isPending ||
                    !overrideForm.buildingId ||
                    !overrideForm.reason.trim()
                  }
                >
                  {saveOverrideMutation.isPending ? "Guardando…" : "Guardar override"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
