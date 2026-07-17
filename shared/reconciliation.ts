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
