import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";

let regulationText: string | null = null;

async function loadRegulationText(): Promise<string> {
  if (regulationText) return regulationText;

  try {
    const pdfParse = (await import("pdf-parse")).default;
    const pdfPath = path.join(process.cwd(), "attached_assets", "Reglamento-de-la-ley-21442_1772404575947.pdf");

    if (fs.existsSync(pdfPath)) {
      const dataBuffer = fs.readFileSync(pdfPath);
      const data = await pdfParse(dataBuffer);
      regulationText = data.text;
      console.log(`[Gemini] Loaded regulation text: ${regulationText.length} chars`);
      return regulationText;
    }
  } catch (err) {
    console.error("[Gemini] Error loading PDF:", err);
  }

  const txtPath = path.join(process.cwd(), "server", "knowledge", "reglamento-ley-21442.txt");
  if (fs.existsSync(txtPath)) {
    regulationText = fs.readFileSync(txtPath, "utf-8");
    return regulationText;
  }

  regulationText = "";
  return regulationText;
}

const OPS_SYSTEM_KNOWLEDGE = `
## Conocimiento del Sistema BUMA OPS

BUMA OPS es una plataforma interna de operaciones para la administración de edificios en Chile. A continuación se describen los módulos y conceptos clave:

### Módulos Principales:

**1. Visitas de Terreno**
- Los ejecutivos de operaciones realizan visitas rutinarias o urgentes a los edificios.
- Cada visita tiene un checklist que se completa in situ con fotografías.
- Se generan informes automáticos con las observaciones y fotos.
- KPI clave: Tasa de cumplimiento de visitas (% de visitas completadas vs programadas).

**2. Tickets Operacionales**
- Sistema de gestión de incidencias y tareas para los edificios.
- Tres tipos: Urgencia (problemas críticos), Planificado (mejoras), Mantención (preventivo).
- Prioridad visual tipo semáforo: Rojo (crítico), Amarillo (medio), Verde (bajo).
- Los tickets pueden derivarse entre ejecutivos y gerentes.
- KPI clave: Tiempo promedio de resolución, tickets vencidos.

**3. Proyectos**
- Gestión de proyectos de mejora o reparación en edificios.
- Incluye hitos de pago, presupuestos y gestión de proveedores.
- Sistema de semáforo para estado de avance.
- Los hitos de pago pueden generar egresos automáticamente al completar facturas.

**4. Conciliación Bancaria**
- Importación de cartolas bancarias (BCI, Banco de Chile, Santander, Scotiabank).
- Auto-detección del formato bancario.
- Identificación de pagos por RUT contra directorio de pagadores.
- Los depósitos identificados se convierten en ingresos.
- KPI: Tasa de identificación automática, transacciones pendientes.

**5. Ingresos (Gastos Comunes)**
- Registro de pagos de gastos comunes por unidad.
- Categorías: Gasto Común, Multa, Arriendo, Interés Mora, Fondo Reserva.
- Exportación a software de administración: Edipro, ComunidadFeliz, Kastor.
- Sistema de prevención de duplicados en exportación.

**6. Egresos**
- Registro de gastos operacionales del edificio.
- Período de consumo y mes de cargo (independiente de fecha de pago).
- Gastos recurrentes: templates que se materializan mensualmente.
- Aplazamiento: diferir un egreso al mes siguiente con motivo.
- Exportación a software de administración.

**7. Verificación GGCC (Gastos Comunes)**
- Herramienta para verificar pagos de gastos comunes por unidad.
- Estados: Pagado (verde), No pagado (rojo), Pago múltiple (naranja), Sin historial (gris).
- Detección de anomalías: pagos duplicados, montos inusuales (>2σ), potenciales morosos.
- Permite crear tickets directamente desde unidades con problemas.

**8. Cierre Mensual**
- Proceso de cierre contable mensual por edificio.
- Revisa completitud de ingresos, egresos y conciliación.
- Sistema de semáforo para estado del cierre.

**9. Consulta Operacional**
- Vista consolidada de información operacional de los edificios.
- Incluye datos de activos críticos, personal, seguros y documentación.

**10. Conserjería**
- Portal simplificado para conserjes de cada edificio.
- Acceso mediante usuario y PIN de 4 dígitos.
- Pueden crear tickets y registrar novedades.

**11. Reportes**
- Informes de egresos, cumplimiento, visitas, tickets, financiero, equipos y ejecutivos.
- Filtros por edificio, período y tipo.

**12. Gestión de Permisos**
- Configuración de acceso a módulos por rol.
- 7 roles: Super Admin, Gerente General, Gerente Operaciones, Gerente Comercial, Ejecutivo de Apoyo, Ejecutivo Operaciones, Conserjería.

### Conceptos Clave:
- **Gasto Común**: Cuota mensual que pagan los copropietarios para mantener el edificio.
- **GGCC**: Abreviatura de Gastos Comunes.
- **Semáforo**: Sistema visual de prioridad/estado (verde=ok, amarillo=atención, rojo=crítico).
- **Conciliación**: Proceso de cruzar movimientos bancarios con pagos esperados.
- **Directorio de Pagadores**: Lista de copropietarios con su RUT para identificación automática de depósitos.
- **Edipro/ComunidadFeliz/Kastor**: Software externos de administración de edificios donde se exportan datos.
- **Mes de Cargo**: Mes al que corresponde un egreso, independiente de cuándo se paga.
- **Período de Consumo**: Rango de fechas del servicio consumido en un egreso.
`;

function buildSystemPrompt(regulationContent: string, buildingDocs: string[] = []): string {
  let prompt = `Eres un asistente experto en administración de edificios y copropiedad inmobiliaria en Chile, especializado en el sistema BUMA OPS. Tu nombre es "Asistente OPS".

Tu conocimiento abarca:
1. La Ley N° 21.442 de Copropiedad Inmobiliaria de Chile
2. El Reglamento de la Ley N° 21.442
3. Administración de edificios y condominios
4. El sistema BUMA OPS y todos sus módulos

Reglas importantes:
- Responde siempre en español de Chile.
- Sé conciso pero completo en tus respuestas.
- Cuando cites artículos de la ley o el reglamento, indica el número de artículo específico.
- Si te preguntan sobre funcionalidades del sistema OPS, explica paso a paso cómo usarlas.
- Si no estás seguro de algo, indícalo claramente en lugar de inventar información.
- Usa un tono profesional pero cercano.
- No inventes artículos de la ley que no existan en el texto proporcionado.

${OPS_SYSTEM_KNOWLEDGE}

## Reglamento de la Ley N° 21.442 de Copropiedad Inmobiliaria

A continuación tienes el texto completo del reglamento. Úsalo como referencia para responder consultas legales:

${regulationContent}
`;

  if (buildingDocs.length > 0) {
    prompt += "\n\n## Reglamentos de Copropiedad Específicos\n\n";
    for (const doc of buildingDocs) {
      prompt += doc + "\n\n---\n\n";
    }
  }

  return prompt;
}

export async function sendChatMessage(
  messages: Array<{ role: string; content: string }>,
  buildingDocs: string[] = []
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const regulation = await loadRegulationText();
  const truncatedRegulation = regulation.substring(0, 80000);
  const systemPrompt = buildSystemPrompt(truncatedRegulation, buildingDocs);

  const validHistory = messages.slice(0, -1).filter(msg => msg.content && msg.content.trim());

  const normalizedHistory: Array<{ role: string; content: string }> = [];
  for (const msg of validHistory) {
    const role = msg.role === "user" ? "user" : "model";
    if (normalizedHistory.length > 0 && normalizedHistory[normalizedHistory.length - 1].role === role) {
      normalizedHistory[normalizedHistory.length - 1].content += "\n" + msg.content;
    } else {
      normalizedHistory.push({ role, content: msg.content });
    }
  }

  if (normalizedHistory.length > 0 && normalizedHistory[0].role !== "user") {
    normalizedHistory.shift();
  }

  const chatHistory = normalizedHistory.map(msg => ({
    role: msg.role as "user" | "model",
    parts: [{ text: msg.content }],
  }));

  try {
    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: systemPrompt,
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;
    return response.text();
  } catch (error: any) {
    console.error("[Gemini] API Error:", error.message);
    if (error.message?.includes("429") || error.message?.includes("quota")) {
      throw new Error("RATE_LIMIT: Límite de uso de la API alcanzado. Intenta nuevamente en unos minutos.");
    }
    if (error.message?.includes("400")) {
      console.error("[Gemini] Bad Request - system prompt length:", systemPrompt.length, "history length:", chatHistory.length);
    }
    throw error;
  }
}

export async function generateConversationTitle(userMessage: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "Nueva conversación";

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(
      `Genera un título muy corto (máximo 6 palabras) en español para una conversación que empieza con este mensaje. Solo devuelve el título, sin comillas ni puntuación extra:\n\n"${userMessage.substring(0, 200)}"`
    );
    return result.response.text().trim().substring(0, 100);
  } catch {
    return userMessage.substring(0, 50) + "...";
  }
}
