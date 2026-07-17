// Motor ÚNICO de conciliación cartola ↔ ingresos (Fase 3).
//
// La cartola bancaria es la fuente de verdad del pago. Por CADA movimiento
// importado, este motor corre la cascada:
//   1) match de un aviso de pago (email) por RUT + monto exacto (freeze-aware
//      Fase 2) → confirma el ingreso provisional.
//   2) tabla maestra payer_directory (RUT → nombre → glosa → regex → histórico).
//      Si identifica con confianza ≥80 → la cartola CREA el ingreso con su unidad.
//   3) si no → REVISIÓN MANUAL con motivo explícito (no_rut / no_directory /
//      directory_no_match / multi_match).
//
// Este es el único lugar donde vive la lógica de conciliación: lo usan tanto el
// import de cartola como el re-reconcile y los confirmar/asignar manuales.
// Ver DISENO-conciliacion-unificada.md (Fase 3).

import crypto from "crypto";
import { storage } from "./storage";
import {
  AMOUNT_MATCH_TOLERANCE,
  normalizeRut,
  computeFrozenIncomeIds,
  bankRowHashKey,
  type ReconciliationReviewReason,
} from "@shared/reconciliation";
import type { BankTransaction, Income, PayerDirectoryEntry, InsertIncome } from "@shared/schema";

// Forma mínima de una fila parseada de cartola (subset de ParsedTransaction de
// ./bankParsers) que necesita el dedup. Evita acoplar el engine al parser.
export interface ParsedTransactionLike {
  txnDate: Date;
  amount: number;
  description: string | null;
  reference: string | null;
  payerRut: string | null;
  rowIndex?: number;
}

// ── Hashes de dedup ─────────────────────────────────────────────────────────

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

/** Hash canónico de dedup (de contenido, sin rowIndex). Ver bankRowHashKey. */
export function computeBankRowHash(row: {
  buildingId: string;
  dateYMD: string;
  amount: number | string;
  description: string | null | undefined;
  payerRut: string | null | undefined;
  reference: string | null | undefined;
}): string {
  return sha256(bankRowHashKey(row));
}

/**
 * Hashes históricos (formatos previos a Fase 3) para dedup sin migrar datos.
 * Se consultan además del canónico al importar, así una fila ya importada por
 * cualquiera de los dos pipelines viejos no se re-inserta. Best-effort para el
 * pipeline de Ingresos (parser distinto); exacto para el de Conciliación.
 */
export function legacyBankRowHashes(row: {
  buildingId: string;
  dateYMD: string;
  amount: number;
  description: string | null;
  reference: string | null;
  payerRut: string | null;
  rowIndex?: number;
}): string[] {
  const bWithRowIndex = sha256(JSON.stringify({
    date: row.dateYMD, amount: row.amount, description: row.description,
    reference: row.reference, payerRut: row.payerRut, rowIndex: row.rowIndex,
  }));
  const bLegacy = sha256(JSON.stringify({
    date: row.dateYMD, amount: row.amount, description: row.description,
    reference: row.reference, payerRut: row.payerRut,
  }));
  const aIngresos = sha256(JSON.stringify({
    buildingId: row.buildingId, fecha: row.dateYMD, monto: row.amount,
    desc: row.description, ref: row.reference,
  }));
  return [bWithRowIndex, bLegacy, aIngresos];
}

/**
 * ¿La fila ya existe (por hash canónico o legacy)? Devuelve la txn existente o
 * undefined. No migra datos: solo consulta los formatos conocidos.
 */
export async function findExistingBankTxn(
  parsed: ParsedTransactionLike,
  buildingId: string,
  canonicalHash: string,
): Promise<BankTransaction | undefined> {
  const dateYMD = parsed.txnDate.toISOString().slice(0, 10);
  const hashes = [
    canonicalHash,
    ...legacyBankRowHashes({
      buildingId,
      dateYMD,
      amount: parsed.amount,
      description: parsed.description ?? null,
      reference: parsed.reference ?? null,
      payerRut: parsed.payerRut ?? null,
      rowIndex: parsed.rowIndex,
    }),
  ];
  for (const h of hashes) {
    const existing = await storage.getBankTransactionByHash(h, buildingId);
    if (existing) return existing;
  }
  return undefined;
}

// ── Match de ingresos provisionales (email) ─────────────────────────────────

/**
 * Ingresos provisionales que calzan con un movimiento por RUT + monto exacto,
 * excluyendo enlazados y congelados por posible duplicado (Fase 2). Fuente
 * única del criterio de match ingreso↔movimiento (Fase 1).
 */
export function matchIncomeCandidates(candidates: Income[], txnRut: string, txnAmount: number): Income[] {
  const frozen = computeFrozenIncomeIds(candidates);
  return candidates.filter(
    (i) =>
      !i.bankTransactionId &&
      !frozen.has(i.id) &&
      normalizeRut(i.payerRut) === txnRut &&
      Math.abs(parseFloat(i.amount) - txnAmount) <= AMOUNT_MATCH_TOLERANCE,
  );
}

/**
 * Enlaza un movimiento identificado con su ingreso provisional del email cuando
 * hay un único match (RUT + monto, freeze-aware). Promueve el ingreso a
 * "identified" y registra audit. NO crea ingreso si no hay match (para eso está
 * ensureIncomeForIdentifiedTxn). Migrado desde routes.ts en Fase 3.
 */
export async function tryLinkBankTxnToIncome(
  txn: {
    id: string;
    buildingId: string;
    amount: string;
    periodMonth: number;
    periodYear: number;
    assignedUnitsSplit?: string | null;
    payerRut?: string | null;
  },
  actorUserId?: string,
): Promise<void> {
  if (txn.assignedUnitsSplit) return;
  const txnRut = normalizeRut(txn.payerRut);
  if (!txnRut) return;
  try {
    const candidates = await storage.getIncomes({
      buildingId: txn.buildingId,
      month: txn.periodMonth,
      year: txn.periodYear,
    });
    const matches = matchIncomeCandidates(candidates, txnRut, parseFloat(txn.amount));
    if (matches.length === 1) {
      const matched = matches[0];
      const updated = await storage.updateIncome(matched.id, {
        bankTransactionId: txn.id,
        status: "identified",
      });
      try {
        const actor = actorUserId ? await storage.getUser(actorUserId) : undefined;
        const actorName = actor ? `${actor.firstName || ""} ${actor.lastName || ""}`.trim() : "sistema";
        await storage.createAuditLog({
          userId: actorUserId || "system",
          userName: actorName || "sistema",
          action: "income_auto_identified",
          entityType: "income",
          entityId: matched.id,
          buildingId: matched.buildingId,
          metadata: JSON.stringify({
            bankTransactionId: txn.id,
            amount: updated?.amount ?? matched.amount,
            previousStatus: matched.status,
            newStatus: "identified",
          }),
        });
      } catch (auditErr) {
        console.error("[bank-link] audit log error:", auditErr);
      }
    }
  } catch (e) {
    console.error("[bank-link] error linking bank txn to income:", e);
  }
}

// ── Creación de ingreso desde la cartola ────────────────────────────────────

/**
 * Garantiza que exista un ingreso identificado y enlazado a un movimiento que la
 * cartola identificó (por tabla maestra o asignación manual). Idempotente: si ya
 * hay un ingreso enlazado a esta txn, no crea otro. Cumple "basta subir la
 * cartola para conocer los ingresos del edificio".
 */
export async function ensureIncomeForIdentifiedTxn(
  txn: BankTransaction,
  unit: string,
  ctx: { actorUserId: string; periodMonth: number; periodYear: number },
): Promise<Income | undefined> {
  const existing = await storage.getIncomeByBankTransactionId(txn.id);
  if (existing) return existing;
  const incomeData: InsertIncome = {
    buildingId: txn.buildingId,
    amount: txn.amount,
    department: unit,
    description: "abono",
    category: "gasto_comun",
    paymentDate: txn.txnDate,
    chargeMonth: ctx.periodMonth,
    chargeYear: ctx.periodYear,
    bank: txn.sourceBank ?? txn.bankName ?? null,
    bankOperationId: txn.reference ?? null,
    bankTransactionId: txn.id,
    payerRut: txn.payerRut ?? null,
    payerName: txn.payerName ?? null,
    status: "identified",
    possibleDuplicate: false,
    duplicateOfIncomeId: null,
    notes: "Creado desde cartola (Conciliación)",
    createdBy: ctx.actorUserId,
  };
  const income = await storage.createIncome(incomeData);
  try {
    await storage.createAuditLog({
      userId: ctx.actorUserId,
      userName: "sistema",
      action: "income_created_from_bank",
      entityType: "income",
      entityId: income.id,
      buildingId: txn.buildingId,
      metadata: JSON.stringify({ bankTransactionId: txn.id, unit, amount: txn.amount }),
    });
  } catch (e) {
    console.error("[bank-create-income] audit error:", e);
  }
  return income;
}

/**
 * En los flujos manuales (confirmar sugerido / asignar unidad): primero intenta
 * enlazar un provisional del email; si no hay, crea el ingreso desde la cartola.
 */
export async function linkOrCreateIncomeForTxn(
  txn: BankTransaction,
  unit: string | null | undefined,
  actorUserId: string,
): Promise<void> {
  await tryLinkBankTxnToIncome(txn, actorUserId);
  const resolvedUnit = unit ?? txn.assignedUnit;
  if (resolvedUnit) {
    await ensureIncomeForIdentifiedTxn(txn, resolvedUnit, {
      actorUserId,
      periodMonth: txn.periodMonth,
      periodYear: txn.periodYear,
    });
  }
}

// ── Cascada de tabla maestra ────────────────────────────────────────────────

const UNIT_REGEX = /(?:dep(?:to|artamento)?\.?\s*|local\s*|of(?:icina)?\.?\s*|bodega\s*|unidad\s*)?(\d{1,4}[a-zA-Z]?)/i;

interface DirectoryMatch { unit: string; confidence: number; reason: string; }

function matchDirectory(
  txn: BankTransaction,
  directory: PayerDirectoryEntry[],
  history: BankTransaction[],
): DirectoryMatch | null {
  if (txn.payerRut) {
    const e = directory.find((d) => d.rut && d.rut === txn.payerRut);
    if (e) return { unit: e.unit, confidence: e.confidence, reason: `RUT ${txn.payerRut} encontrado en directorio de pagadores` };
  }
  if (txn.payerName) {
    const payerName = txn.payerName;
    const e = directory.find((d) => d.pattern && payerName.toLowerCase().includes(d.pattern.toLowerCase()));
    if (e) return { unit: e.unit, confidence: e.confidence, reason: `Patrón "${e.pattern}" encontrado en nombre pagador "${payerName}"` };
  }
  if (txn.description) {
    const description = txn.description;
    const e = directory.find((d) => d.pattern && description.toLowerCase().includes(d.pattern.toLowerCase()));
    if (e) return { unit: e.unit, confidence: e.confidence, reason: `Patrón "${e.pattern}" encontrado en descripción` };
  }
  if (txn.description) {
    const m = txn.description.match(UNIT_REGEX);
    if (m && m[1]) return { unit: m[1], confidence: 60, reason: `Unidad "${m[1]}" detectada en glosa` };
  }
  const h = history.find((x) => {
    if (txn.payerRut && x.payerRut && txn.payerRut === x.payerRut) return true;
    if (txn.description && x.description && txn.description.toLowerCase() === x.description.toLowerCase()) return true;
    return false;
  });
  if (h && h.assignedUnit) return { unit: h.assignedUnit, confidence: 50, reason: "Coincidencia histórica con transacción anterior" };
  return null;
}

// ── Motor: cascada por movimiento ───────────────────────────────────────────

export type ReconcileOutcome =
  | "email_confirmed"
  | "directory_identified"
  | "directory_suggested"
  | "manual";

export interface ReconcileCtx {
  actorUserId: string;
  periodMonth: number;
  periodYear: number;
  // Precargables para evitar N queries en el loop de import (read-only).
  directory?: PayerDirectoryEntry[];
  identifiedHistory?: BankTransaction[];
}

export interface ReconcileResult {
  outcome: ReconcileOutcome;
  reviewReason?: ReconciliationReviewReason;
  unit?: string;
}

/**
 * Corre la cascada completa sobre un movimiento ya persistido. Mutación:
 * actualiza la txn (status/assignedUnit/reviewReason) y, según el caso, enlaza
 * o crea el ingreso. Idempotente para status ya resueltos.
 */
export async function reconcileBankTransaction(txn: BankTransaction, ctx: ReconcileCtx): Promise<ReconcileResult> {
  if (txn.status === "identified" || txn.status === "ignored") {
    return { outcome: txn.status === "identified" ? "directory_identified" : "manual" };
  }
  const txnRut = normalizeRut(txn.payerRut);
  const txnAmount = parseFloat(txn.amount);

  // Paso 1: match de aviso de pago (email) por RUT + monto (freeze-aware).
  if (txnRut) {
    const candidates = await storage.getIncomes({ buildingId: txn.buildingId, month: ctx.periodMonth, year: ctx.periodYear });
    const matches = matchIncomeCandidates(candidates, txnRut, txnAmount);
    if (matches.length === 1) {
      const inc = matches[0];
      await storage.updateIncome(inc.id, { bankTransactionId: txn.id, status: "identified" });
      await storage.updateBankTransaction(txn.id, {
        status: "identified", assignedUnit: inc.department, identifiedBy: ctx.actorUserId,
        identifiedAt: new Date(), matchScore: 100,
        matchReason: "Confirmado por aviso de pago (email)", reviewReason: null,
      });
      try {
        await storage.createAuditLog({
          userId: ctx.actorUserId, userName: "sistema", action: "income_auto_identified",
          entityType: "income", entityId: inc.id, buildingId: inc.buildingId,
          metadata: JSON.stringify({ bankTransactionId: txn.id, via: "email_match", amount: inc.amount }),
        });
      } catch (e) { console.error("[reconcile] audit error:", e); }
      return { outcome: "email_confirmed", unit: inc.department };
    }
    if (matches.length > 1) {
      await storage.updateBankTransaction(txn.id, {
        status: "pending", reviewReason: "multi_match",
        matchReason: `${matches.length} avisos de pago calzan (mismo RUT+monto) — asignación manual`,
      });
      return { outcome: "manual", reviewReason: "multi_match" };
    }
  }

  // Paso 2: tabla maestra payer_directory.
  const directory = ctx.directory ?? await storage.getPayerDirectory(txn.buildingId);
  if (directory.length === 0) {
    await storage.updateBankTransaction(txn.id, {
      status: "pending", reviewReason: "no_directory",
      matchReason: "Edificio sin tabla maestra de pagadores — revisión manual",
    });
    return { outcome: "manual", reviewReason: "no_directory" };
  }
  const history = ctx.identifiedHistory
    ?? (await storage.getBankTransactions({ buildingId: txn.buildingId })).filter((t) => t.status === "identified");
  const dir = matchDirectory(txn, directory, history);
  if (dir) {
    if (dir.confidence >= 80) {
      await storage.updateBankTransaction(txn.id, {
        status: "identified", assignedUnit: dir.unit, matchScore: dir.confidence,
        matchReason: dir.reason, identifiedBy: ctx.actorUserId, identifiedAt: new Date(), reviewReason: null,
      });
      await ensureIncomeForIdentifiedTxn(txn, dir.unit, ctx);
      return { outcome: "directory_identified", unit: dir.unit };
    }
    await storage.updateBankTransaction(txn.id, {
      status: "suggested", assignedUnit: dir.unit, matchScore: dir.confidence,
      matchReason: dir.reason, reviewReason: null,
    });
    return { outcome: "directory_suggested", unit: dir.unit };
  }

  // Paso 3: revisión manual, con motivo distinguible.
  const reviewReason: ReconciliationReviewReason = txnRut ? "directory_no_match" : "no_rut";
  await storage.updateBankTransaction(txn.id, {
    status: "pending", reviewReason,
    matchReason: reviewReason === "no_rut"
      ? "Movimiento sin RUT — no auto-concilia; revisión manual"
      : "Tabla maestra no identificó el pago — revisión manual",
  });
  return { outcome: "manual", reviewReason };
}
