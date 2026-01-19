import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from "docx";
import * as fs from "fs";

async function generateDoc() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: "BUMA OPS - Reglas de Negocio",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Documento de Especificaciones Funcionales", bold: true }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Version: 1.0 | Fecha: Enero 2026" }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        new Paragraph({ text: "1. VISITAS", heading: HeadingLevel.HEADING_1 }),
        
        new Paragraph({ text: "1.1 Estados de Visitas", heading: HeadingLevel.HEADING_2 }),
        createTable([
          ["Estado", "Descripcion", "Color"],
          ["Borrador", "Visita creada pero no confirmada", "Gris"],
          ["Programada", "Visita confirmada con fecha asignada", "Azul"],
          ["Atrasada", "Fecha programada ya paso y no se ha iniciado", "Rojo"],
          ["En Curso", "Ejecutivo inicio la visita", "Amarillo"],
          ["Realizada", "Visita completada exitosamente", "Verde"],
          ["Cancelada", "Visita cancelada (con motivo)", "Gris oscuro"],
        ]),

        new Paragraph({ text: "1.2 Tipos de Visita", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Rutina: Visita programada regular de inspeccion", bullet: { level: 0 } }),
        new Paragraph({ text: "Urgente: Visita de emergencia por incidente reportado", bullet: { level: 0 } }),

        new Paragraph({ text: "1.3 Flujo de Visita", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "1. Programacion: El ejecutivo programa una visita para un edificio en una fecha especifica" }),
        new Paragraph({ text: "2. Inicio: El dia de la visita, el ejecutivo presiona 'Iniciar Visita' (se registra startedAt)" }),
        new Paragraph({ text: "3. Checklist: El ejecutivo completa el checklist de inspeccion" }),
        new Paragraph({ text: "4. Hallazgos: Si encuentra problemas, puede crear tickets directamente" }),
        new Paragraph({ text: "5. Fotos: Puede adjuntar fotos como evidencia" }),
        new Paragraph({ text: "6. Finalizacion: Al completar, presiona 'Finalizar' (se registra completedAt)" }),

        new Paragraph({ text: "1.4 Calculo de Atrasos", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Una visita se considera ATRASADA cuando:" }),
        new Paragraph({ text: "La fecha programada (scheduledDate) es anterior a la fecha actual", bullet: { level: 0 } }),
        new Paragraph({ text: "El estado sigue siendo 'programada' (no se ha iniciado)", bullet: { level: 0 } }),

        new Paragraph({ text: "1.5 Fechas Importantes", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Fecha Programada (scheduledDate): Cuando debia realizarse la visita", bullet: { level: 0 } }),
        new Paragraph({ text: "Fecha de Inicio (startedAt): Cuando el ejecutivo inicio la visita", bullet: { level: 0 } }),
        new Paragraph({ text: "Fecha de Realizacion (completedAt): Cuando se completo efectivamente la visita", bullet: { level: 0 } }),

        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({ text: "2. TICKETS", heading: HeadingLevel.HEADING_1 }),

        new Paragraph({ text: "2.1 Estados de Tickets", heading: HeadingLevel.HEADING_2 }),
        createTable([
          ["Estado", "Descripcion", "Color"],
          ["Pendiente", "Ticket abierto sin trabajo iniciado", "Azul"],
          ["En Progreso", "Trabajo en curso", "Amarillo"],
          ["Trabajo Completado", "Trabajo terminado, pendiente cierre", "Naranja"],
          ["Resuelto", "Ticket cerrado completamente", "Verde/Gris"],
          ["Vencido", "Fecha de vencimiento pasada sin resolver", "Rojo"],
        ]),

        new Paragraph({ text: "2.2 Prioridades (Semaforo)", heading: HeadingLevel.HEADING_2 }),
        createTable([
          ["Prioridad", "Descripcion", "Color"],
          ["Critico", "Requiere atencion inmediata", "Rojo"],
          ["Por Vencer", "Proximo a vencer (7 dias)", "Amarillo"],
          ["Al Dia", "Sin urgencia", "Verde"],
        ]),

        new Paragraph({ text: "2.3 Tipos de Ticket", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Urgencia: Problema que requiere atencion inmediata", bullet: { level: 0 } }),
        new Paragraph({ text: "Mantencion: Trabajo de mantenimiento programado", bullet: { level: 0 } }),
        new Paragraph({ text: "Planificado: Mejora o proyecto planificado", bullet: { level: 0 } }),

        new Paragraph({ text: "2.4 Flujo de Cierre de Ticket", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "1. Trabajo Completado: El ejecutivo marca el trabajo como terminado" }),
        new Paragraph({ text: "2. Revision de Factura: El sistema pregunta si hay factura asociada" }),
        new Paragraph({ text: "3. Opciones de Cierre:" }),
        new Paragraph({ text: "CON Factura: Se ingresa numero y monto de factura - Badge verde 'Resuelto'", bullet: { level: 1 } }),
        new Paragraph({ text: "SIN Factura: Se indica que solo fue gestion - Badge gris 'Resuelto'", bullet: { level: 1 } }),
        new Paragraph({ text: "Factura Pendiente: Proveedor enviara despues - Badge naranja 'Resuelto - Factura pendiente'", bullet: { level: 1 } }),

        new Paragraph({ text: "2.5 Colores de Badge 'Resuelto'", heading: HeadingLevel.HEADING_2 }),
        createTable([
          ["Color", "Significado"],
          ["Verde", "Resuelto CON factura adjunta"],
          ["Gris", "Resuelto SIN factura (no la requeria)"],
          ["Naranja", "Resuelto pero factura PENDIENTE"],
        ]),

        new Paragraph({ text: "2.6 Derivacion/Escalamiento", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Los tickets pueden ser derivados (escalados) a gerentes:" }),
        new Paragraph({ text: "Gerente General: Puede recibir tickets escalados de cualquier area", bullet: { level: 0 } }),
        new Paragraph({ text: "Gerente de Operaciones: Recibe tickets operativos escalados", bullet: { level: 0 } }),
        new Paragraph({ text: "Gerente Comercial: Recibe tickets relacionados con cobros o temas comerciales", bullet: { level: 0 } }),
        new Paragraph({ text: "" }),
        new Paragraph({ text: "Cuando un ticket es derivado:" }),
        new Paragraph({ text: "Se registra en el historial de asignaciones", bullet: { level: 0 } }),
        new Paragraph({ text: "El ticket aparece con indicador violeta en 'Mis Tickets' del destinatario", bullet: { level: 0 } }),
        new Paragraph({ text: "El contador de 'Derivados a Mi' se actualiza en el dashboard", bullet: { level: 0 } }),

        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({ text: "3. ROLES Y PERMISOS", heading: HeadingLevel.HEADING_1 }),

        new Paragraph({ text: "3.1 Roles del Sistema", heading: HeadingLevel.HEADING_2 }),
        createTable([
          ["Rol", "Descripcion"],
          ["Super Admin", "Configuracion del sistema, branding, gestion avanzada"],
          ["Gerente General", "Acceso total, aprueba equipos, administra usuarios"],
          ["Gerente de Operaciones", "Gestiona visitas/tickets, ve costos, aprueba equipos"],
          ["Gerente Comercial", "Similar a Gerente de Operaciones, enfocado en temas comerciales"],
          ["Gerente de Finanzas", "Solo lectura en dashboards"],
          ["Ejecutivo de Operaciones", "Trabajo de campo, no ve costos"],
        ]),

        new Paragraph({ text: "3.2 Visibilidad de Costos", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Solo los siguientes roles pueden ver costos:" }),
        new Paragraph({ text: "Gerente General", bullet: { level: 0 } }),
        new Paragraph({ text: "Gerente de Operaciones", bullet: { level: 0 } }),
        new Paragraph({ text: "Gerente Comercial", bullet: { level: 0 } }),
        new Paragraph({ children: [new TextRun({ text: "Los ejecutivos NO ven informacion de costos ni facturas.", bold: true })] }),

        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({ text: "4. EQUIPOS CRITICOS", heading: HeadingLevel.HEADING_1 }),

        new Paragraph({ text: "4.1 Flujo de Aprobacion", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "1. El ejecutivo sugiere un nuevo equipo critico (estado: pendiente)" }),
        new Paragraph({ text: "2. El gerente revisa y puede:" }),
        new Paragraph({ text: "Aprobar: El equipo queda registrado oficialmente", bullet: { level: 1 } }),
        new Paragraph({ text: "Rechazar: Se registra el motivo del rechazo", bullet: { level: 1 } }),

        new Paragraph({ text: "4.2 Tipos de Equipos", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Ascensores", bullet: { level: 0 } }),
        new Paragraph({ text: "Bombas de agua", bullet: { level: 0 } }),
        new Paragraph({ text: "Portones electricos", bullet: { level: 0 } }),
        new Paragraph({ text: "Sistema CCTV", bullet: { level: 0 } }),
        new Paragraph({ text: "Sistemas de incendio", bullet: { level: 0 } }),
        new Paragraph({ text: "Otros", bullet: { level: 0 } }),

        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({ text: "5. CUMPLIMIENTO NORMATIVO", heading: HeadingLevel.HEADING_1 }),

        new Paragraph({ text: "5.1 Calculo de Score (0-100%)", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Cada edificio tiene un score de cumplimiento basado en 4 criterios:" }),
        createTable([
          ["Criterio", "Peso", "Descripcion"],
          ["Reglamento de Copropiedad", "25%", "Documento cargado en el sistema"],
          ["Mantenciones al dia", "25%", "Equipos sin mantenciones vencidas"],
          ["Cobertura de visitas", "25%", "Minimo 4 visitas en ultimos 30 dias"],
          ["Sin tickets urgentes", "25%", "Sin tickets criticos pendientes"],
        ]),

        new Paragraph({ text: "5.2 Interpretacion", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "100%: Edificio en cumplimiento total", bullet: { level: 0 } }),
        new Paragraph({ text: "75%: Un criterio no cumplido", bullet: { level: 0 } }),
        new Paragraph({ text: "50%: Dos criterios no cumplidos", bullet: { level: 0 } }),
        new Paragraph({ text: "25%: Tres criterios no cumplidos", bullet: { level: 0 } }),
        new Paragraph({ text: "0%: Ningun criterio cumplido", bullet: { level: 0 } }),

        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({ text: "6. NOTIFICACIONES", heading: HeadingLevel.HEADING_1 }),

        new Paragraph({ text: "6.1 Tipos de Notificaciones Internas", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Ticket asignado/derivado a usuario", bullet: { level: 0 } }),
        new Paragraph({ text: "Visita proxima a vencer", bullet: { level: 0 } }),
        new Paragraph({ text: "Equipo critico aprobado/rechazado", bullet: { level: 0 } }),
        new Paragraph({ text: "Comentario en ticket asignado", bullet: { level: 0 } }),

        new Paragraph({ text: "6.2 Indicadores Visuales", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Badge rojo en campana de notificaciones (contador de no leidas)", bullet: { level: 0 } }),
        new Paragraph({ text: "Badge violeta en 'Mis Tickets' cuando hay tickets derivados", bullet: { level: 0 } }),
        new Paragraph({ text: "Resaltado de filas con tickets delegados", bullet: { level: 0 } }),

        new Paragraph({ text: "", spacing: { after: 200 } }),

        new Paragraph({ text: "7. REPORTES", heading: HeadingLevel.HEADING_1 }),

        new Paragraph({ text: "7.1 Informe de Cumplimiento Normativo", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Muestra el score de cada edificio con detalle de criterios cumplidos." }),

        new Paragraph({ text: "7.2 Informe de Egresos (Formato Edipro)", heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: "Solo accesible para Gerente General y Gerente Comercial." }),
        new Paragraph({ text: "Incluye facturas de tickets cerrados con totales por periodo." }),

        new Paragraph({ text: "", spacing: { after: 400 } }),
        new Paragraph({
          children: [new TextRun({ text: "Documento generado automaticamente por BUMA OPS - Enero 2026", italics: true })],
          alignment: AlignmentType.CENTER,
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("docs/Reglas_de_Negocio_BUMA_OPS.docx", buffer);
  console.log("Documento Word generado: docs/Reglas_de_Negocio_BUMA_OPS.docx");
}

function createTable(data: string[][]): Table {
  const rows = data.map((row, index) => {
    const cells = row.map(cell => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: cell, bold: index === 0 })],
      })],
      width: { size: 100 / row.length, type: WidthType.PERCENTAGE },
    }));
    return new TableRow({ children: cells });
  });
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

generateDoc().catch(console.error);
