/**
 * Parser de cartolas bancarias para 5 bancos chilenos (Banco Chile, BCI,
 * Itaú, Santander, Scotiabank). Soporta múltiples formatos por banco
 * cuando aplica (Banco Chile tiene 2: cuenta corriente y TEF Empresa).
 *
 * Salida: lista de abonos (movimientos positivos) ya normalizados —
 * fecha (timezone America/Santiago), nombre del pagador, RUT en formato
 * XX.XXX.XXX-X y monto entero positivo. Cargos/giros se ignoran.
 *
 * Usa xlsx (SheetJS) porque ya está como dependencia del proyecto. NO
 * se introduce exceljs para evitar duplicar libs equivalentes.
 */

import * as XLSX from "xlsx";

export interface ParsedBankMovement {
  fecha: Date;
  descripcion: string;
  monto: number;
  numeroDocumento: string | null;
  nombrePagador: string | null;
  rutPagador: string | null;
  banco: string;
  raw: string;
}

export interface ParseBankStatementResult {
  banco: string;
  edificioDetectado: string | null;
  periodo: { desde: Date; hasta: Date } | null;
  movimientos: ParsedBankMovement[];
  errores: string[];
}

// ============================================================================
// Helpers
// ============================================================================

// Normaliza un RUT chileno a XX.XXX.XXX-X. Acepta entradas con/sin puntos,
// con/sin guion. Devuelve null si no parece válido sintácticamente (no
// valida DV calculado — para eso necesitamos lógica MOD-11, lo dejamos
// fuera del scope).
export function normalizeRut(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toUpperCase().replace(/[.\s]/g, "");
  const m = /^(\d{1,8})-?([\dK])$/.exec(s);
  if (!m) return null;
  const body = m[1];
  const dv = m[2];
  let formatted = "";
  let n = body;
  while (n.length > 3) {
    formatted = "." + n.slice(-3) + formatted;
    n = n.slice(0, -3);
  }
  formatted = n + formatted;
  return `${formatted}-${dv}`;
}

// Parsea un monto que puede venir como number o string "$130.401" / "130,401".
// Devuelve 0 si no se puede parsear. Asume CLP (sin decimales).
function parseAmount(v: any): number {
  if (typeof v === "number") return Math.round(v);
  if (typeof v !== "string") return 0;
  const cleaned = v.replace(/[$\s]/g, "").replace(/\./g, "").replace(/,/g, ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : Math.round(n);
}

// Construye un Date interpretando la fecha en America/Santiago. Usamos
// 16:00 UTC (~mediodía Chile) para que el día no cambie con DST.
function dateChile(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 16, 0, 0));
}

// Parsea fechas comunes en cartolas chilenas:
//   "DD/MM/YYYY", "DD-MM-YYYY", "DD/MM/YY HH:MM", "DD-MM-YYYY HH:MM"
// También acepta number (serial de Excel) y Date.
function parseDateChile(v: any, fallbackYear?: number): Date | null {
  if (v instanceof Date) return dateChile(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate());
  if (typeof v === "number") {
    // Excel serial: días desde 1899-12-30 (sistema 1900 con bug Lotus).
    const epoch = Date.UTC(1899, 11, 30);
    const d = new Date(epoch + v * 86400000);
    return dateChile(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  if (typeof v !== "string") return null;
  const s = v.trim();
  // DD/MM/YYYY o DD-MM-YYYY (con o sin hora opcional)
  let m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(s);
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    return dateChile(y, mo, d);
  }
  // DD/MM sin año — usar fallbackYear (caso Itaú)
  m = /^(\d{1,2})[\/\-](\d{1,2})$/.exec(s);
  if (m && fallbackYear) {
    return dateChile(fallbackYear, parseInt(m[2], 10), parseInt(m[1], 10));
  }
  return null;
}

// Lee todas las filas de la primera hoja útil como matriz.
function rowsFromSheet(sheet: XLSX.WorkSheet): any[][] {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true }) as any[][];
}

function findHeaderRow(rows: any[][], required: string[]): number {
  for (let i = 0; i < rows.length; i++) {
    const cells = (rows[i] || []).map((c) => (c == null ? "" : String(c).toLowerCase()));
    if (required.every((r) => cells.some((c) => c.includes(r.toLowerCase())))) return i;
  }
  return -1;
}

function colIndex(headerRow: any[], aliases: string[]): number {
  for (let i = 0; i < headerRow.length; i++) {
    const cell = (headerRow[i] == null ? "" : String(headerRow[i])).toLowerCase().trim();
    if (aliases.some((a) => cell === a.toLowerCase() || cell.includes(a.toLowerCase()))) return i;
  }
  return -1;
}

// Extrae nombre y RUT de una descripción según patrones comunes.
// Cada banco tiene su propio formato; cubrimos los más comunes y dejamos
// nulls cuando la línea es genérica (p.ej. ABN CRD DB TRAN TRANSBANK).
function extractPayerInfo(desc: string): { nombre: string | null; rut: string | null } {
  const text = desc || "";
  // Chile cuenta corriente: "Traspaso De: NOMBRE APELLIDO"
  let m = /Traspaso\s+De:\s*(.+?)(?:\s+\d|$)/i.exec(text);
  if (m) return { nombre: m[1].trim(), rut: null };
  // Itaú: "Transferencia De NOMBRE"
  m = /Transferencia\s+De\s+(.+?)(?:\s+\d|$)/i.exec(text);
  if (m) return { nombre: m[1].trim(), rut: null };
  // Santander con RUT explícito: "NNNNNNNN-D Transf. NOMBRE"
  m = /(\d{7,8}-[\dkK])\s+Transf\.?\s+(.+)$/i.exec(text);
  if (m) return { nombre: m[2].trim(), rut: normalizeRut(m[1]) };
  // Santander con N° cuenta origen (NO es RUT): "NNNNNNNNNN Transf. NOMBRE"
  // El primer número de 9-12 dígitos sin guion no es un RUT chileno.
  m = /^\d{9,12}\s+Transf\.?\s+(.+)$/i.exec(text);
  if (m) return { nombre: m[1].trim(), rut: null };
  // Scotiabank: "TEF RUT-DV NOMBRE"
  m = /TEF\s+(\d{7,8}-?[\dkK])\s+(.+)$/i.exec(text);
  if (m) return { nombre: m[2].trim(), rut: normalizeRut(m[1]) };
  return { nombre: null, rut: null };
}

// ============================================================================
// Detección de banco
// ============================================================================

type BancoKey = "banco_chile_cc" | "banco_chile_tef" | "bci" | "itau" | "santander" | "scotiabank";

function detectBanco(workbook: XLSX.WorkBook, filename?: string): BancoKey | null {
  const sheetNames = workbook.SheetNames;
  const lowerSheets = sheetNames.map((s) => s.toLowerCase());
  const fn = (filename || "").toLowerCase();

  // Santander: sheet "Movimientos CtaCte" o filename con santander
  if (lowerSheets.some((s) => s.includes("movimientos ctacte")) || fn.includes("santander")) {
    return "santander";
  }
  // Scotiabank: sheet "Data" + columna "Abono" sin coma, o filename
  if (fn.includes("scotia")) return "scotiabank";
  // Itau: sheet Sheet1 + "Movimientos" + columna "Depósitos o abonos"
  if (fn.includes("itau") || fn.includes("itaú")) return "itau";
  // BCI: filename o columna "Abono ($)"
  if (fn.includes("bci")) return "bci";
  // Banco Chile TEF: sheet "TEF Empresa"
  if (lowerSheets.some((s) => s.includes("tef empresa"))) return "banco_chile_tef";
  // Banco Chile cuenta corriente: sheet "Hoja1" + "Abonos (CLP)"
  if (fn.includes("chile") || fn.includes("bco_chile") || fn.includes("banco_chile")) {
    return "banco_chile_cc";
  }

  // Sniffing por contenido: revisamos primera hoja
  const firstSheet = workbook.Sheets[sheetNames[0]];
  const rows = rowsFromSheet(firstSheet);
  for (const row of rows.slice(0, 30)) {
    const txt = (row || []).map((c) => String(c || "").toLowerCase()).join(" | ");
    if (txt.includes("abonos (clp)") && txt.includes("cargos (clp)")) return "banco_chile_cc";
    if (txt.includes("depósitos o abonos") || txt.includes("depositos o abonos")) return "itau";
    if (txt.includes("abono ($)") && txt.includes("cargo ($)")) return "bci";
    if (txt.includes("cargo/abono") && txt.includes("descripción movimiento")) return "santander";
    if (txt.includes("abono") && txt.includes("saldo diario") && !txt.includes("depósitos")) return "scotiabank";
  }
  return null;
}

// ============================================================================
// Parsers individuales
// ============================================================================

interface ParserContext {
  workbook: XLSX.WorkBook;
  errores: string[];
}

function parseBancoChileCuentaCorriente(ctx: ParserContext): ParseBankStatementResult {
  const result: ParseBankStatementResult = {
    banco: "Banco de Chile",
    edificioDetectado: null,
    periodo: null,
    movimientos: [],
    errores: ctx.errores,
  };
  const sheetName = ctx.workbook.SheetNames.find((s) => s.toLowerCase().includes("hoja1")) || ctx.workbook.SheetNames[0];
  const sheet = ctx.workbook.Sheets[sheetName];
  if (!sheet) { result.errores.push("No se encontró la hoja del archivo"); return result; }
  const rows = rowsFromSheet(sheet);
  const headerIdx = findHeaderRow(rows, ["fecha", "abonos"]);
  if (headerIdx < 0) {
    result.errores.push("No se encontró fila de encabezado (Fecha, Abonos CLP)");
    return result;
  }
  const header = rows[headerIdx];
  const cFecha = colIndex(header, ["fecha"]);
  const cDesc = colIndex(header, ["descripción", "descripcion"]);
  const cDoc = colIndex(header, ["nro. docto", "nro docto", "nro. doc"]);
  const cAbono = colIndex(header, ["abonos (clp)", "abonos"]);
  if (cFecha < 0 || cDesc < 0 || cAbono < 0) {
    result.errores.push(`Columnas requeridas no encontradas (fecha=${cFecha}, desc=${cDesc}, abono=${cAbono})`);
    return result;
  }
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const fecha = parseDateChile(row[cFecha]);
    const monto = parseAmount(row[cAbono]);
    if (!fecha || monto <= 0) continue;
    const descripcion = String(row[cDesc] || "").trim();
    const numeroDocumento = row[cDoc] != null ? String(row[cDoc]).trim() : null;
    const { nombre, rut } = extractPayerInfo(descripcion);
    result.movimientos.push({
      fecha, descripcion, monto, numeroDocumento,
      nombrePagador: nombre, rutPagador: rut,
      banco: "Banco de Chile",
      raw: JSON.stringify(row),
    });
  }
  return result;
}

function parseBancoChileTefEmpresa(ctx: ParserContext): ParseBankStatementResult {
  const result: ParseBankStatementResult = {
    banco: "Banco de Chile (TEF Empresa)",
    edificioDetectado: null,
    periodo: null,
    movimientos: [],
    errores: ctx.errores,
  };
  const sheet = ctx.workbook.Sheets[ctx.workbook.SheetNames.find((s) => s.toLowerCase().includes("tef")) || ctx.workbook.SheetNames[0]];
  const rows = rowsFromSheet(sheet);
  // Edificio: buscar "Razón Social" en filas iniciales
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i] || [];
    for (let j = 0; j < row.length; j++) {
      if (String(row[j] || "").toLowerCase().includes("razón social")) {
        for (let k = j + 1; k < row.length; k++) {
          if (row[k]) { result.edificioDetectado = String(row[k]).trim(); break; }
        }
      }
    }
    if (result.edificioDetectado) break;
  }
  const headerIdx = findHeaderRow(rows, ["fecha y hora", "monto", "rut origen"]);
  if (headerIdx < 0) { result.errores.push("No se encontró header TEF Empresa"); return result; }
  const header = rows[headerIdx];
  const cFecha = colIndex(header, ["fecha y hora", "fecha"]);
  const cNombre = colIndex(header, ["nombre o razón", "nombre"]);
  const cRut = colIndex(header, ["rut origen", "rut"]);
  const cMonto = colIndex(header, ["monto"]);
  const cId = colIndex(header, ["id transacción", "id"]);
  const cComment = colIndex(header, ["comentario"]);
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const fecha = parseDateChile(row[cFecha]);
    const monto = parseAmount(row[cMonto]);
    if (!fecha || monto <= 0) continue;
    const nombre = row[cNombre] ? String(row[cNombre]).trim() : null;
    const rut = normalizeRut(row[cRut]);
    const descripcion = cComment >= 0 && row[cComment] ? String(row[cComment]).trim() : (nombre || "");
    result.movimientos.push({
      fecha, descripcion, monto,
      numeroDocumento: cId >= 0 && row[cId] ? String(row[cId]).trim() : null,
      nombrePagador: nombre,
      rutPagador: rut,
      banco: "Banco de Chile",
      raw: JSON.stringify(row),
    });
  }
  return result;
}

function parseBCI(ctx: ParserContext): ParseBankStatementResult {
  const result: ParseBankStatementResult = {
    banco: "BCI",
    edificioDetectado: null,
    periodo: null,
    movimientos: [],
    errores: ctx.errores,
  };
  // Buscar la hoja que tenga movimientos (header con "Abono ($)")
  let chosenSheet: XLSX.WorkSheet | null = null;
  for (const name of ctx.workbook.SheetNames) {
    const sh = ctx.workbook.Sheets[name];
    const rows = rowsFromSheet(sh);
    if (findHeaderRow(rows, ["fecha", "abono"]) >= 0) { chosenSheet = sh; break; }
  }
  if (!chosenSheet) { result.errores.push("BCI: ninguna hoja contiene movimientos"); return result; }
  const rows = rowsFromSheet(chosenSheet);
  const headerIdx = findHeaderRow(rows, ["fecha", "abono"]);
  const header = rows[headerIdx];
  const cFecha = colIndex(header, ["fecha"]);
  const cDesc = colIndex(header, ["descripción", "descripcion"]);
  const cSerial = colIndex(header, ["serial documento", "serial"]);
  const cAbono = colIndex(header, ["abono ($)", "abono"]);
  if (cFecha < 0 || cAbono < 0) {
    result.errores.push("BCI: columnas fecha/abono no encontradas");
    return result;
  }
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const fecha = parseDateChile(row[cFecha]);
    const monto = parseAmount(row[cAbono]);
    if (!fecha || monto <= 0) continue;
    const descripcion = String(row[cDesc] || "").trim();
    const { nombre, rut } = extractPayerInfo(descripcion);
    result.movimientos.push({
      fecha, descripcion, monto,
      numeroDocumento: cSerial >= 0 && row[cSerial] != null ? String(row[cSerial]).trim() : null,
      nombrePagador: nombre,
      rutPagador: rut,
      banco: "BCI",
      raw: JSON.stringify(row),
    });
  }
  return result;
}

function parseItau(ctx: ParserContext): ParseBankStatementResult {
  const result: ParseBankStatementResult = {
    banco: "Itaú",
    edificioDetectado: null,
    periodo: null,
    movimientos: [],
    errores: ctx.errores,
  };
  const sheet = ctx.workbook.Sheets[ctx.workbook.SheetNames.find((s) => /sheet1/i.test(s)) || ctx.workbook.SheetNames[0]];
  const rows = rowsFromSheet(sheet);
  const headerIdx = findHeaderRow(rows, ["fecha", "depósitos o abonos"]);
  if (headerIdx < 0) {
    // Variante sin tilde
    const alt = findHeaderRow(rows, ["fecha", "depositos o abonos"]);
    if (alt < 0) { result.errores.push("Itaú: no se encontró fila de encabezado Movimientos"); return result; }
  }
  const idx = headerIdx >= 0 ? headerIdx : findHeaderRow(rows, ["fecha", "depositos o abonos"]);
  const header = rows[idx];
  const cFecha = colIndex(header, ["fecha"]);
  const cNumOp = colIndex(header, ["número de operación", "numero de operacion"]);
  const cDesc = colIndex(header, ["descripción", "descripcion"]);
  const cAbono = colIndex(header, ["depósitos o abonos", "depositos o abonos"]);
  // Inferir año del periodo si está en el archivo
  let fallbackYear = new Date().getUTCFullYear();
  for (let i = 0; i < Math.min(rows.length, idx); i++) {
    const txt = (rows[i] || []).map((c) => String(c || "")).join(" ");
    const m = /\b(20\d{2})\b/.exec(txt);
    if (m) { fallbackYear = parseInt(m[1], 10); break; }
  }
  for (let i = idx + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const fecha = parseDateChile(row[cFecha], fallbackYear);
    const monto = parseAmount(row[cAbono]);
    if (!fecha || monto <= 0) continue;
    const descripcion = String(row[cDesc] || "").trim();
    const { nombre, rut } = extractPayerInfo(descripcion);
    result.movimientos.push({
      fecha, descripcion, monto,
      numeroDocumento: cNumOp >= 0 && row[cNumOp] != null ? String(row[cNumOp]).trim() : null,
      nombrePagador: nombre,
      rutPagador: rut,
      banco: "Itaú",
      raw: JSON.stringify(row),
    });
  }
  return result;
}

function parseSantander(ctx: ParserContext): ParseBankStatementResult {
  const result: ParseBankStatementResult = {
    banco: "Santander",
    edificioDetectado: null,
    periodo: null,
    movimientos: [],
    errores: ctx.errores,
  };
  const sheetName = ctx.workbook.SheetNames.find((s) => s.toLowerCase().includes("movimientos")) || ctx.workbook.SheetNames[0];
  const sheet = ctx.workbook.Sheets[sheetName];
  const rows = rowsFromSheet(sheet);
  // Edificio: "Empresa: X"
  for (let i = 0; i < Math.min(rows.length, 12); i++) {
    const row = rows[i] || [];
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || "");
      if (cell.toLowerCase().startsWith("empresa")) {
        const next = row[j + 1];
        if (next) { result.edificioDetectado = String(next).trim(); break; }
      }
    }
    if (result.edificioDetectado) break;
  }
  // Período: "Fecha desde: DD/MM/YYYY" + "Fecha hasta: DD/MM/YYYY"
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i] || [];
    let desde: Date | null = null, hasta: Date | null = null;
    for (const cell of row) {
      const s = String(cell || "");
      const md = /fecha desde:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i.exec(s);
      const mh = /fecha hasta:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i.exec(s);
      if (md) desde = parseDateChile(md[1]);
      if (mh) hasta = parseDateChile(mh[1]);
    }
    if (desde && hasta) { result.periodo = { desde, hasta }; break; }
  }
  const headerIdx = findHeaderRow(rows, ["monto", "descripción movimiento", "cargo/abono"]);
  if (headerIdx < 0) { result.errores.push("Santander: header no encontrado"); return result; }
  const header = rows[headerIdx];
  const cMonto = colIndex(header, ["monto"]);
  const cDesc = colIndex(header, ["descripción movimiento", "descripcion movimiento"]);
  const cFecha = colIndex(header, ["fecha"]);
  const cDoc = colIndex(header, ["n° documento", "no documento", "n documento"]);
  const cCa = colIndex(header, ["cargo/abono"]);
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const ca = String(row[cCa] || "").trim().toUpperCase();
    if (ca !== "A") continue;
    const fecha = parseDateChile(row[cFecha]);
    const monto = parseAmount(row[cMonto]);
    if (!fecha || monto <= 0) continue;
    const descripcion = String(row[cDesc] || "").trim();
    const numeroDocumento = cDoc >= 0 && row[cDoc] != null ? String(row[cDoc]).trim() : null;
    const { nombre, rut } = extractPayerInfo(descripcion);
    result.movimientos.push({
      fecha, descripcion, monto, numeroDocumento,
      nombrePagador: nombre, rutPagador: rut,
      banco: "Santander",
      raw: JSON.stringify(row),
    });
  }
  return result;
}

function parseScotiabank(ctx: ParserContext): ParseBankStatementResult {
  const result: ParseBankStatementResult = {
    banco: "Scotiabank",
    edificioDetectado: null,
    periodo: null,
    movimientos: [],
    errores: ctx.errores,
  };
  const sheetName = ctx.workbook.SheetNames.find((s) => s.toLowerCase() === "data") || ctx.workbook.SheetNames[0];
  const sheet = ctx.workbook.Sheets[sheetName];
  const rows = rowsFromSheet(sheet);
  const headerIdx = findHeaderRow(rows, ["fecha", "abono", "saldo diario"]);
  if (headerIdx < 0) { result.errores.push("Scotiabank: header no encontrado"); return result; }
  const header = rows[headerIdx];
  const cFecha = colIndex(header, ["fecha"]);
  const cDesc = colIndex(header, ["descripción", "descripcion"]);
  const cDoc = colIndex(header, ["numero documento", "número documento"]);
  const cCargo = colIndex(header, ["cargo"]);
  const cAbono = colIndex(header, ["abono"]);
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    // Solo abonos: cargo vacío y abono > 0
    const cargo = parseAmount(row[cCargo]);
    if (cargo > 0) continue;
    const fecha = parseDateChile(row[cFecha]);
    const monto = parseAmount(row[cAbono]);
    if (!fecha || monto <= 0) continue;
    const descripcion = String(row[cDesc] || "").trim();
    const { nombre, rut } = extractPayerInfo(descripcion);
    result.movimientos.push({
      fecha, descripcion, monto,
      numeroDocumento: cDoc >= 0 && row[cDoc] != null ? String(row[cDoc]).trim() : null,
      nombrePagador: nombre,
      rutPagador: rut,
      banco: "Scotiabank",
      raw: JSON.stringify(row),
    });
  }
  return result;
}

// ============================================================================
// Entry point
// ============================================================================

export async function parseBankStatement(buffer: Buffer, filename?: string): Promise<ParseBankStatementResult> {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ctx: ParserContext = { workbook, errores: [] };
  const banco = detectBanco(workbook, filename);
  if (!banco) {
    return {
      banco: "Desconocido",
      edificioDetectado: null,
      periodo: null,
      movimientos: [],
      errores: ["No se pudo detectar el banco. Verifica que la cartola sea de Banco Chile, BCI, Itaú, Santander o Scotiabank."],
    };
  }
  switch (banco) {
    case "banco_chile_cc":  return parseBancoChileCuentaCorriente(ctx);
    case "banco_chile_tef": return parseBancoChileTefEmpresa(ctx);
    case "bci":             return parseBCI(ctx);
    case "itau":            return parseItau(ctx);
    case "santander":       return parseSantander(ctx);
    case "scotiabank":      return parseScotiabank(ctx);
  }
}
