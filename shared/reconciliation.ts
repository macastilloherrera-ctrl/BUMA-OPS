// Lógica compartida de conciliación Ingresos ↔ Cartola.
//
// Fuente única de verdad para el matching, para que los dos motores
// (tryLinkBankTxnToIncome y /api/bank-statements/import) usen exactamente
// los mismos criterios. Ver DISENO-conciliacion-unificada.md.

/**
 * Tolerancia ÚNICA de match de monto (CLP, "al peso").
 * Reemplaza el ±0.01 de tryLinkBankTxnToIncome y el ±1% del import: ahora
 * el desempate lo hace el RUT, no un margen de monto. 0.01 sólo cubre
 * artefactos de coma flotante sobre montos que en la práctica son enteros.
 */
export const AMOUNT_MATCH_TOLERANCE = 0.01;

/**
 * Normaliza un RUT chileno para comparación exacta entre el RUT del email
 * y el del movimiento de cartola, que pueden venir con formato distinto
 * (con/sin puntos, con/sin guion, K en may/min). Ej:
 *   "12.345.678-9" → "123456789"
 *   "12345678-k"   → "12345678K"
 * Devuelve "" para entradas vacías/espacios.
 */
export function normalizeRut(rut: string | null | undefined): string {
  if (!rut) return "";
  return rut.replace(/[.\s-]/g, "").toUpperCase();
}

/**
 * ¿Dos montos calzan dentro de la tolerancia unificada?
 */
export function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= AMOUNT_MATCH_TOLERANCE;
}

/**
 * Normaliza el N° de operación del email para comparar entre los dos correos
 * de un mismo pago (notificación del banco vs comprobante reenviado). Puede
 * venir con espacios o mayúsc/minúsc distintas; el número en sí es idéntico.
 * Devuelve "" para entradas vacías. Ver Fase 2, deduplicación de correos.
 */
export function normalizeOperationId(op: string | null | undefined): string {
  if (!op) return "";
  return op.replace(/\s+/g, "").toUpperCase();
}

/** Campos mínimos de un income para calcular congelamiento por duplicado. */
export interface DuplicateFreezable {
  id: string;
  possibleDuplicate?: boolean | null;
  duplicateOfIncomeId?: string | null;
}

/**
 * IDs de ingresos "congelados" por una revisión de posible duplicado sin
 * resolver. Congela AMBOS lados del par: el sospechoso (possibleDuplicate=true
 * con puntero) y su original (el id apuntado). Estos IDs quedan excluidos de la
 * conciliación en los dos motores hasta que un gerente resuelva — así el único
 * movimiento de la cartola no calza contra dos provisionales gemelos
 * (multi_match) y Cristina elige el registro "rico" antes de conciliar.
 * Ver DISENO-conciliacion-unificada.md (Fase 2).
 */
export function computeFrozenIncomeIds(incomes: DuplicateFreezable[]): Set<string> {
  const frozen = new Set<string>();
  for (const i of incomes) {
    if (i.possibleDuplicate && i.duplicateOfIncomeId) {
      frozen.add(i.id);
      frozen.add(i.duplicateOfIncomeId);
    }
  }
  return frozen;
}

/**
 * Motivo por el que un movimiento de cartola quedó en REVISIÓN MANUAL tras el
 * motor único de conciliación (Fase 3). Distingue explícitamente los casos que
 * el negocio pidió separar (ver DISENO-conciliacion-unificada.md):
 *   - no_rut:            el movimiento no trae RUT → no se puede matchear por
 *                        RUT+monto ni por RUT en la tabla maestra.
 *   - no_directory:      el edificio NO tiene tabla maestra (payer_directory).
 *   - directory_no_match: hay tabla maestra pero no identificó el pago.
 *   - multi_match:       varios provisionales del email calzan (mismo RUT+monto)
 *                        → ambiguo, requiere asignación manual.
 */
export type ReconciliationReviewReason =
  | "no_rut"
  | "no_directory"
  | "directory_no_match"
  | "multi_match";

/**
 * Clave canónica (string normalizado) para el hash de dedup de una fila de
 * cartola. Fuente ÚNICA del formato: el sha256 se calcula en el servidor sobre
 * esta clave (server/reconciliationEngine.ts). Determinística e independiente
 * del orden de fila (NO usa rowIndex): la MISMA fila deduplica sin importar
 * cuándo se importó. Ver Fase 3.
 */
export function bankRowHashKey(row: {
  buildingId: string;
  dateYMD: string;
  amount: number | string;
  description: string | null | undefined;
  payerRut: string | null | undefined;
  reference: string | null | undefined;
}): string {
  const amountFixed = Number(row.amount).toFixed(2);
  const normDesc = (row.description ?? "").trim().replace(/\s+/g, " ").toUpperCase();
  return [
    row.buildingId,
    row.dateYMD,
    amountFixed,
    normDesc,
    normalizeRut(row.payerRut),
    normalizeOperationId(row.reference),
  ].join("|");
}
