import * as XLSX from "xlsx";

export interface ParsedTransaction {
  txnDate: Date;
  amount: number;
  description: string;
  reference: string;
  payerRut: string;
  payerName: string;
  sourceBank: string;
  bankName: string;
  rawRowJson: string;
  rowIndex?: number;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  detectedBank: string;
  totalRowsScanned: number;
  debugRows?: any[];
}

type RawRow = any[];

function readSheetAsArray(buffer: Buffer, originalName: string): RawRow[] {
  let workbook: XLSX.WorkBook;
  if (originalName.toLowerCase().endsWith(".csv")) {
    const csvText = buffer.toString("utf-8");
    workbook = XLSX.read(csvText, { type: "string" });
  } else {
    workbook = XLSX.read(buffer, { type: "buffer" });
  }
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as RawRow[];
}

function normalizeAmount(raw: any): number {
  if (typeof raw === "number") return raw;
  const str = String(raw).replace(/\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(str) || 0;
}

function parseDate(raw: any): Date {
  if (!raw) return new Date();
  const str = String(raw).trim();

  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyy) {
    return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;
  return new Date();
}

function normalizeRut(raw: any): string {
  if (!raw) return "";
  return String(raw).trim();
}

function detectBank(rows: RawRow[]): string {
  const top20 = rows.slice(0, 20).map(r => r.join(" ").toLowerCase());
  const joined = top20.join(" ");

  if (joined.includes("transferencias de su cuenta")) return "bci";
  if (joined.includes("consulta de movimientos de cuentas corrientes")) return "santander";
  if (joined.includes("razón social:") || joined.includes("razon social:") || joined.includes("consulta transferencias recibidas")) return "chile";

  const row0 = rows[0] || [];
  const row0Lower = row0.map((c: any) => String(c).toLowerCase());
  if (row0Lower.includes("empresa") && row0Lower.includes("mes") && row0Lower.includes("año")) return "scotiabank";

  return "generico";
}

function parseBCI(rows: RawRow[]): ParsedTransaction[] {
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i].map((c: any) => String(c).toLowerCase());
    if (row.some((c: string) => c.includes("fecha")) && row.some((c: string) => c.includes("monto"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return [];

  const headers = rows[headerIdx].map((c: any) => String(c));
  const colFecha = headers.findIndex((h: string) => h.toLowerCase().includes("fecha"));
  const colMonto = headers.findIndex((h: string) => h.toLowerCase().includes("monto"));
  const colRut = headers.findIndex((h: string) => h.toLowerCase().includes("rut"));
  const colNombre = headers.findIndex((h: string) => h.toLowerCase().includes("nombre"));
  const colBanco = headers.findIndex((h: string) => h.toLowerCase().includes("banco"));
  const colMensaje = headers.findIndex((h: string) => h.toLowerCase().includes("mensaje"));
  const colRef = headers.findIndex((h: string) => h.toLowerCase().includes("id transferencia") || h.toLowerCase().includes("id trans"));
  const colEstado = headers.findIndex((h: string) => h.toLowerCase().includes("estado"));

  const results: ParsedTransaction[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c: any) => c === "")) continue;

    if (colEstado >= 0) {
      const estado = String(row[colEstado] || "").toLowerCase();
      if (estado && estado !== "recibidas") continue;
    }

    const amount = colMonto >= 0 ? normalizeAmount(row[colMonto]) : 0;
    if (amount <= 0) continue;

    results.push({
      txnDate: parseDate(colFecha >= 0 ? row[colFecha] : ""),
      amount,
      description: colMensaje >= 0 ? String(row[colMensaje] || "") : "",
      reference: colRef >= 0 ? String(row[colRef] || "") : "",
      payerRut: normalizeRut(colRut >= 0 ? row[colRut] : ""),
      payerName: colNombre >= 0 ? String(row[colNombre] || "").trim() : "",
      sourceBank: "BCI",
      bankName: colBanco >= 0 ? String(row[colBanco] || "") : "BCI",
      rawRowJson: JSON.stringify(row),
    });
  }
  return results;
}

function parseChile(rows: RawRow[]): ParsedTransaction[] {
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i].map((c: any) => String(c).toLowerCase());
    if (row.some((c: string) => c.includes("fecha")) && row.some((c: string) => c.includes("monto"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return [];

  const headers = rows[headerIdx].map((c: any) => String(c));
  const colFecha = headers.findIndex((h: string) => h.toLowerCase().includes("fecha"));
  const colNombre = headers.findIndex((h: string) => h.toLowerCase().includes("nombre") || h.toLowerCase().includes("razón social origen") || h.toLowerCase().includes("razon social origen"));
  const colRut = headers.findIndex((h: string) => h.toLowerCase().includes("rut origen") || h.toLowerCase().includes("rut"));
  const colBanco = headers.findIndex((h: string) => h.toLowerCase().includes("banco origen") || h.toLowerCase().includes("banco"));
  const colMonto = headers.findIndex((h: string) => h.toLowerCase().includes("monto"));
  const colRef = headers.findIndex((h: string) => h.toLowerCase().includes("id transacción") || h.toLowerCase().includes("id transaccion") || h.toLowerCase().includes("transacc"));
  const colComentario = headers.findIndex((h: string) => h.toLowerCase().includes("comentario"));

  const results: ParsedTransaction[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c: any) => c === "")) continue;

    const amount = colMonto >= 0 ? normalizeAmount(row[colMonto]) : 0;
    if (amount <= 0) continue;

    results.push({
      txnDate: parseDate(colFecha >= 0 ? row[colFecha] : ""),
      amount,
      description: colComentario >= 0 ? String(row[colComentario] || "") : "",
      reference: colRef >= 0 ? String(row[colRef] || "") : "",
      payerRut: normalizeRut(colRut >= 0 ? row[colRut] : ""),
      payerName: colNombre >= 0 ? String(row[colNombre] || "").trim() : "",
      sourceBank: "Banco de Chile",
      bankName: colBanco >= 0 ? String(row[colBanco] || "") : "Banco de Chile",
      rawRowJson: JSON.stringify(row),
    });
  }
  return results;
}

function parseSantander(rows: RawRow[]): ParsedTransaction[] {
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i].map((c: any) => String(c).toUpperCase());
    if (row.some((c: string) => c.includes("MONTO")) && row.some((c: string) => c.includes("FECHA"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return [];

  const headers = rows[headerIdx].map((c: any) => String(c).toUpperCase());
  const colMonto = headers.findIndex((h: string) => h.includes("MONTO"));
  const colDesc = headers.findIndex((h: string) => h.includes("DESCRIPCIÓN") || h.includes("DESCRIPCION"));
  const colFecha = headers.findIndex((h: string) => h.includes("FECHA"));
  const colCargoAbono = headers.findIndex((h: string) => h.includes("CARGO") || h.includes("ABONO"));
  const colDoc = headers.findIndex((h: string) => h.includes("DOCUMENTO"));
  const colSucursal = headers.findIndex((h: string) => h.includes("SUCURSAL"));

  const results: ParsedTransaction[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c: any) => c === "")) continue;

    if (colCargoAbono >= 0) {
      const tipo = String(row[colCargoAbono] || "").toUpperCase().trim();
      if (tipo !== "A") continue;
    }

    const amount = colMonto >= 0 ? normalizeAmount(row[colMonto]) : 0;
    if (amount <= 0) continue;

    const rawDesc = colDesc >= 0 ? String(row[colDesc] || "") : "";
    let payerName = "";
    let payerRut = "";

    const descMatch = rawDesc.match(/^0*(\d{1,9}[0-9Kk])\s+Transf[\.\s]+(?:de\s+)?(.+)/i);
    if (descMatch) {
      const rawRut = descMatch[1];
      payerName = descMatch[2].trim();
      const dv = rawRut.slice(-1).toUpperCase();
      const body = rawRut.slice(0, -1);
      payerRut = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
    } else {
      const transfMatch = rawDesc.match(/Transf[\.\s]+(?:de\s+)?(.+)/i);
      if (transfMatch) {
        payerName = transfMatch[1].trim();
      }
    }

    results.push({
      txnDate: parseDate(colFecha >= 0 ? row[colFecha] : ""),
      amount,
      description: rawDesc,
      reference: colDoc >= 0 ? String(row[colDoc] || "") : "",
      payerRut,
      payerName,
      sourceBank: "Santander",
      bankName: "Santander",
      rawRowJson: JSON.stringify(row),
    });
  }
  return results;
}

function parseScotiabank(rows: RawRow[]): ParsedTransaction[] {
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i].map((c: any) => String(c).toLowerCase());
    if (row.some((c: string) => c.includes("fecha")) && row.some((c: string) => c.includes("monto"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return [];

  const headers = rows[headerIdx].map((c: any) => String(c));
  const colFecha = headers.findIndex((h: string) => h.toLowerCase().includes("fecha"));
  const colMonto = headers.findIndex((h: string) => h.toLowerCase().includes("monto"));
  const colRut = headers.findIndex((h: string) => h.toLowerCase().includes("rut"));
  const colNombre = headers.findIndex((h: string) => h.toLowerCase().includes("nombre"));
  const colBanco = headers.findIndex((h: string) => h.toLowerCase().includes("banco"));
  const colTipo = headers.findIndex((h: string) => h.toLowerCase().includes("tipo"));

  const results: ParsedTransaction[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c: any) => c === "")) continue;

    const amount = colMonto >= 0 ? normalizeAmount(row[colMonto]) : 0;
    if (amount <= 0) continue;

    results.push({
      txnDate: parseDate(colFecha >= 0 ? row[colFecha] : ""),
      amount,
      description: colTipo >= 0 ? String(row[colTipo] || "") : "",
      reference: "",
      payerRut: normalizeRut(colRut >= 0 ? row[colRut] : ""),
      payerName: colNombre >= 0 ? String(row[colNombre] || "").trim() : "",
      sourceBank: "Scotiabank",
      bankName: colBanco >= 0 ? String(row[colBanco] || "") : "Scotiabank",
      rawRowJson: JSON.stringify(row),
    });
  }
  return results;
}

function parseGeneric(rows: RawRow[]): ParsedTransaction[] {
  let headerIdx = -1;
  const headerKeywords = ["fecha", "monto", "amount", "abono", "date"];

  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i].map((c: any) => String(c).toLowerCase());
    const matches = row.filter((c: string) => headerKeywords.some(k => c.includes(k))).length;
    if (matches >= 2) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return [];

  const headers = rows[headerIdx].map((c: any) => String(c));
  const find = (patterns: string[]) => headers.findIndex((h: string) => patterns.some(p => h.toLowerCase().includes(p.toLowerCase())));

  const colFecha = find(["fecha", "date"]);
  const colMonto = find(["monto", "amount", "abono"]);
  const colDesc = find(["descripción", "descripcion", "glosa", "description", "comentario", "mensaje"]);
  const colRut = find(["rut"]);
  const colNombre = find(["nombre", "name", "razón social", "razon social"]);
  const colRef = find(["referencia", "reference", "operación", "operacion", "comprobante", "id trans", "documento"]);
  const colBanco = find(["banco", "bank"]);

  const results: ParsedTransaction[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c: any) => c === "")) continue;

    const amount = colMonto >= 0 ? normalizeAmount(row[colMonto]) : 0;
    if (amount <= 0) continue;

    results.push({
      txnDate: parseDate(colFecha >= 0 ? row[colFecha] : ""),
      amount,
      description: colDesc >= 0 ? String(row[colDesc] || "") : "",
      reference: colRef >= 0 ? String(row[colRef] || "") : "",
      payerRut: normalizeRut(colRut >= 0 ? row[colRut] : ""),
      payerName: colNombre >= 0 ? String(row[colNombre] || "").trim() : "",
      sourceBank: "Desconocido",
      bankName: colBanco >= 0 ? String(row[colBanco] || "") : "",
      rawRowJson: JSON.stringify(row),
    });
  }
  return results;
}

const bankLabels: Record<string, string> = {
  bci: "BCI",
  chile: "Banco de Chile",
  santander: "Santander",
  scotiabank: "Scotiabank",
  generico: "Genérico (auto-detectado)",
};

export function parseBankFile(buffer: Buffer, originalName: string): ParseResult {
  const rows = readSheetAsArray(buffer, originalName);
  if (rows.length === 0) {
    return { transactions: [], detectedBank: "desconocido", totalRowsScanned: 0 };
  }

  const debugRows = rows.slice(0, 10).map((r, i) => ({ row: i, data: r }));

  const detectedBank = detectBank(rows);
  let transactions: ParsedTransaction[];

  switch (detectedBank) {
    case "bci":
      transactions = parseBCI(rows);
      break;
    case "chile":
      transactions = parseChile(rows);
      break;
    case "santander":
      transactions = parseSantander(rows);
      break;
    case "scotiabank":
      transactions = parseScotiabank(rows);
      break;
    default:
      transactions = parseGeneric(rows);
      break;
  }

  transactions = transactions.map((t, idx) => ({ ...t, rowIndex: idx }));

  return {
    transactions,
    detectedBank: bankLabels[detectedBank] || detectedBank,
    totalRowsScanned: rows.length,
    debugRows,
  };
}
