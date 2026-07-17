// Fase 4 — Cola de revisión del módulo Ingresos. Dos sub-colas:
//   1) Provisionales sin confirmar: ingresos pending_email sin cartola que los
//      confirme (correos huérfanos). Antigüedad visible. Confirmar a mano /
//      rechazar. Nunca se auto-eliminan.
//   2) Posibles duplicados (Fase 2): ingresos possibleDuplicate=true mostrados
//      LADO A LADO con su original, porque el segundo correo puede ser el "más
//      rico". Ambos están congelados hasta resolver. Acciones: elegir cuál queda
//      (el otro a rejected) o liberar ambos.
//
// Es mayormente consulta + exposición de endpoints existentes (PATCH /incomes/:id,
// confirm-duplicate, dismiss-duplicate). Español en la UI.

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, AlertTriangle, Snowflake } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Income, Building } from "@shared/schema";

export interface DuplicatePair {
  dup: Income;
  original: Income | null;
}

interface Props {
  orphans: Income[];
  duplicatePairs: DuplicatePair[];
  buildings: Building[] | undefined;
}

const fmtCurrency = (amount: string | number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(Number(amount));

const fmtDate = (date: string | Date | null | undefined) => {
  if (!date) return "—";
  const s = typeof date === "string" ? date : new Date(date).toISOString();
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "—";
};

// Antigüedad en días desde createdAt (America/Santiago no cambia el conteo de días).
function daysSince(date: string | Date | null | undefined): number {
  if (!date) return 0;
  const then = new Date(date).getTime();
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

export default function ColaRevision({ orphans, duplicatePairs, buildings }: Props) {
  const { toast } = useToast();
  const buildingName = (id: string) => buildings?.find((b) => b.id === id)?.name ?? "—";
  // Diálogo de confirmación manual sin cartola (override auditado).
  const [confirmTarget, setConfirmTarget] = useState<Income | null>(null);
  const [confirmReason, setConfirmReason] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/incomes"] });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/incomes/${id}`, { status: "rejected" });
    },
    onSuccess: () => { invalidate(); toast({ title: "Ingreso rechazado" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Override consciente: confirma un provisional sin cartola que lo respalde.
  // Queda marcado (confirmed_without_bank) + evento de auditoría (quién/cuándo/motivo).
  const confirmWithoutBankMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await apiRequest("POST", `/api/incomes/${id}/confirm-without-bank`, { reason: reason || undefined });
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Confirmado a mano (sin cartola)", description: "Queda marcado «Sin cartola» y registrado en auditoría." });
      setConfirmTarget(null);
      setConfirmReason("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const confirmDuplicateMutation = useMutation({
    mutationFn: async ({ dupId, keepIncomeId }: { dupId: string; keepIncomeId: string }) => {
      await apiRequest("POST", `/api/incomes/${dupId}/confirm-duplicate`, { keepIncomeId });
    },
    onSuccess: () => { invalidate(); toast({ title: "Duplicado resuelto", description: "Se conservó el registro elegido; el otro quedó rechazado." }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const dismissDuplicateMutation = useMutation({
    mutationFn: async (dupId: string) => {
      await apiRequest("POST", `/api/incomes/${dupId}/dismiss-duplicate`, {});
    },
    onSuccess: () => { invalidate(); toast({ title: "No es duplicado", description: "Se liberaron ambos ingresos; vuelven a ser candidatos de conciliación." }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const busy = rejectMutation.isPending || confirmWithoutBankMutation.isPending || confirmDuplicateMutation.isPending || dismissDuplicateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* ── Cola 1: Provisionales sin confirmar ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Provisionales sin confirmar
            <Badge variant="secondary" data-testid="count-orphans">{orphans.length}</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Avisos de pago por email que la cartola nunca confirmó. Confirmalos a mano solo si estás segura (queda sin cartola), o rechazalos. Nunca se borran solos.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {orphans.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground" data-testid="empty-orphans">Sin provisionales pendientes 🎉</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Antigüedad</TableHead>
                    <TableHead>Edificio</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>RUT</TableHead>
                    <TableHead>Pagador</TableHead>
                    <TableHead>Recibido</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orphans.map((inc) => {
                    const age = daysSince(inc.createdAt);
                    const old = age >= 30;
                    return (
                      <TableRow key={inc.id} data-testid={`orphan-row-${inc.id}`}>
                        <TableCell>
                          <Badge variant="outline" className={old ? "border-red-400 text-red-700" : ""}>
                            {age === 0 ? "hoy" : `${age} d`}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate" title={buildingName(inc.buildingId)}>{buildingName(inc.buildingId)}</TableCell>
                        <TableCell>{inc.department}</TableCell>
                        <TableCell className="text-right font-mono">{fmtCurrency(inc.amount)}</TableCell>
                        <TableCell className="whitespace-nowrap">{inc.payerRut || "—"}</TableCell>
                        <TableCell className="max-w-[160px] truncate" title={inc.payerName || ""}>{inc.payerName || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtDate(inc.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="outline" disabled={busy} onClick={() => { setConfirmReason(""); setConfirmTarget(inc); }} data-testid={`orphan-confirm-${inc.id}`}>
                                  <Check className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Confirmar a mano (sin cartola)</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" disabled={busy} onClick={() => rejectMutation.mutate(inc.id)} data-testid={`orphan-reject-${inc.id}`}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Rechazar</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Cola 2: Posibles duplicados ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Posibles duplicados
            <Badge variant="secondary" data-testid="count-duplicates">{duplicatePairs.length}</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Snowflake className="h-3.5 w-3.5 text-blue-500" />
            Ambos registros están <strong>congelados</strong> (no concilian) hasta que resuelvas. Compará qué aporta cada correo antes de elegir.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {duplicatePairs.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground" data-testid="empty-duplicates">Sin posibles duplicados 🎉</div>
          ) : (
            duplicatePairs.map(({ dup, original }) => (
              <div key={dup.id} className="rounded-lg border p-4 space-y-3" data-testid={`dup-pair-${dup.id}`}>
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">{buildingName(dup.buildingId)}</span>
                  <span className="text-muted-foreground">· mismo pago detectado dos veces</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <IncomeCompareCard title="Original (1er correo)" inc={original} highlightAgainst={dup} />
                  <IncomeCompareCard title="Posible duplicado (2° correo)" inc={dup} highlightAgainst={original} />
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground mr-1">Sí es duplicado — quedarme con:</span>
                  <Button size="sm" variant="outline" disabled={busy || !original}
                    onClick={() => original && confirmDuplicateMutation.mutate({ dupId: dup.id, keepIncomeId: original.id })}
                    data-testid={`dup-keep-original-${dup.id}`}>
                    El original
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy}
                    onClick={() => confirmDuplicateMutation.mutate({ dupId: dup.id, keepIncomeId: dup.id })}
                    data-testid={`dup-keep-dup-${dup.id}`}>
                    El 2° (más rico)
                  </Button>
                  <span className="mx-1 text-muted-foreground">·</span>
                  <Button size="sm" variant="ghost" disabled={busy}
                    onClick={() => dismissDuplicateMutation.mutate(dup.id)}
                    data-testid={`dup-dismiss-${dup.id}`}>
                    No es duplicado (liberar ambos)
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Confirmar sin cartola — override auditado */}
      <Dialog open={!!confirmTarget} onOpenChange={(o) => { if (!o) { setConfirmTarget(null); setConfirmReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar a mano, sin cartola</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Vas a confirmar este ingreso <strong>sin un movimiento de cartola que lo respalde</strong>. Quedará marcado como <strong>«Sin cartola»</strong> (visible y filtrable en Ingresos) y registrado en auditoría con tu usuario y la fecha.
            </p>
            {confirmTarget && (
              <div className="rounded-md border p-2 text-xs bg-muted/30" data-testid="confirm-target-summary">
                {buildingName(confirmTarget.buildingId)} · {confirmTarget.department} · {fmtCurrency(confirmTarget.amount)} · {confirmTarget.payerRut || "sin RUT"}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium">Motivo (opcional)</label>
              <Textarea
                value={confirmReason}
                onChange={(e) => setConfirmReason(e.target.value)}
                placeholder="Ej: la cartola aún no llegó; pago verificado por comprobante de transferencia."
                data-testid="confirm-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmTarget(null); setConfirmReason(""); }}>Cancelar</Button>
            <Button
              disabled={confirmWithoutBankMutation.isPending}
              onClick={() => confirmTarget && confirmWithoutBankMutation.mutate({ id: confirmTarget.id, reason: confirmReason })}
              data-testid="confirm-without-bank-submit"
            >
              Confirmar sin cartola
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Tarjeta de comparación de un ingreso. Resalta los campos que este registro
// tiene y el otro NO (el "más rico"), para que la elección sea informada.
function IncomeCompareCard({ title, inc, highlightAgainst }: { title: string; inc: Income | null; highlightAgainst: Income | null }) {
  if (!inc) {
    return (
      <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground" data-testid="compare-missing">
        {title}: registro no disponible (¿fue eliminado?).
      </div>
    );
  }
  const richer = (field: keyof Income) => {
    const mine = inc[field];
    const theirs = highlightAgainst?.[field];
    return !!mine && !theirs;
  };
  const Row = ({ label, field, value }: { label: string; field: keyof Income; value: React.ReactNode }) => (
    <div className={`flex justify-between gap-2 ${richer(field) ? "bg-green-50 rounded px-1 -mx-1" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || "—"}{richer(field) && <Badge variant="outline" className="ml-1 text-[10px] border-green-400 text-green-700">aporta</Badge>}</span>
    </div>
  );
  return (
    <div className="rounded-md border p-3 text-sm space-y-1">
      <div className="font-medium mb-1">{title}</div>
      <Row label="Monto" field="amount" value={fmtCurrency(inc.amount)} />
      <Row label="Unidad" field="department" value={inc.department} />
      <Row label="RUT" field="payerRut" value={inc.payerRut} />
      <Row label="Pagador" field="payerName" value={inc.payerName} />
      <Row label="Banco" field="bank" value={inc.bank} />
      <Row label="N° operación" field="bankOperationId" value={inc.bankOperationId} />
      <Row label="Fecha pago" field="paymentDate" value={fmtDate(inc.paymentDate)} />
      <Row label="Notas" field="notes" value={inc.notes} />
      <div className="text-[11px] text-muted-foreground pt-1">Recibido {fmtDate(inc.createdAt)}</div>
    </div>
  );
}
