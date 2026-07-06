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
