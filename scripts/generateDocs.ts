import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  PageBreak,
} from "docx";
import * as fs from "fs";

const PRIMARY_COLOR = "2563eb";

function createTitle(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 48,
        color: PRIMARY_COLOR,
      }),
    ],
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  });
}

function createHeading1(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 32,
        color: PRIMARY_COLOR,
      }),
    ],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
  });
}

function createHeading2(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 26,
      }),
    ],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  });
}

function createParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 24 })],
    spacing: { after: 150 },
  });
}

function createBullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 24 })],
    bullet: { level: 0 },
    spacing: { after: 100 },
  });
}

function createTable(headers: string[], rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(
          (h) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: h, bold: true, size: 22 })],
                }),
              ],
              shading: { fill: "e5e7eb" },
            })
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: cell, size: 22 })],
                    }),
                  ],
                })
            ),
          })
      ),
    ],
  });
}

function generateUserManual(): Document {
  return new Document({
    sections: [
      {
        children: [
          createTitle("BUMA OPS"),
          new Paragraph({
            children: [
              new TextRun({
                text: "Manual de Usuario",
                size: 36,
                color: "666666",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Plataforma de Operaciones",
                size: 28,
                italics: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),
          new Paragraph({
            children: [new PageBreak()],
          }),

          createHeading1("1. Introduccion"),
          createParagraph(
            "BUMA OPS es una plataforma interna de operaciones diseñada para gestionar visitas a terreno, tickets operativos, incidentes y equipos criticos en edificios administrados."
          ),
          createParagraph(
            "Este manual proporciona instrucciones detalladas sobre como utilizar cada funcionalidad del sistema segun su rol de usuario."
          ),

          createHeading1("2. Roles de Usuario"),
          createHeading2("2.1 Super Admin"),
          createBullet("Configuracion del sistema y branding"),
          createBullet("Gestion avanzada de usuarios"),
          createBullet("Acceso al panel de administracion del sistema"),

          createHeading2("2.2 Gerente General"),
          createBullet("Acceso total a todas las funcionalidades"),
          createBullet("Visualizacion de costos y reportes financieros"),
          createBullet("Aprobacion de equipos criticos"),
          createBullet("Administracion de usuarios del sistema"),

          createHeading2("2.3 Gerente de Operaciones"),
          createBullet("Gestion de visitas y tickets"),
          createBullet("Visualizacion de costos"),
          createBullet("Aprobacion de equipos criticos"),

          createHeading2("2.4 Gerente Comercial"),
          createBullet("Acceso a dashboards y reportes"),
          createBullet("Visualizacion de informes de egresos"),

          createHeading2("2.5 Gerente de Finanzas"),
          createBullet("Solo lectura en dashboards"),
          createBullet("Acceso a reportes de cumplimiento"),

          createHeading2("2.6 Ejecutivo de Operaciones"),
          createBullet("Trabajo de campo (mobile-first)"),
          createBullet("Programar y ejecutar visitas con checklist"),
          createBullet("Crear tickets desde hallazgos"),
          createBullet("Capturar fotos en visitas"),
          createBullet("No visualiza costos"),

          new Paragraph({ children: [new PageBreak()] }),

          createHeading1("3. Funcionalidades Principales"),

          createHeading2("3.1 Gestion de Visitas"),
          createParagraph("Las visitas son inspecciones programadas a los edificios administrados."),
          createParagraph("Tipos de visitas:"),
          createBullet("Rutina: Visitas programadas regularmente"),
          createBullet("Urgencia: Visitas no planificadas por situaciones criticas"),
          createParagraph("Estados de una visita:"),
          createBullet("Programada: Visita agendada pendiente de realizarse"),
          createBullet("En curso: Ejecutivo realizando la visita"),
          createBullet("Realizada: Visita completada con checklist"),
          createBullet("Cancelada: Visita que no se realizo"),

          createHeading2("3.2 Gestion de Tickets"),
          createParagraph("Los tickets representan tareas operativas o incidentes que requieren atencion."),
          createParagraph("Tipos de tickets:"),
          createBullet("Urgencia: Situaciones criticas que requieren atencion inmediata"),
          createBullet("Mantencion: Tareas de mantenimiento preventivo o correctivo"),
          createBullet("Planificado: Trabajos programados con anticipacion"),
          createParagraph("Prioridades (Semaforo):"),
          createBullet("Rojo: Alta prioridad - atencion urgente"),
          createBullet("Amarillo: Prioridad media"),
          createBullet("Verde: Baja prioridad"),

          createHeading2("3.3 Sistema de Facturas"),
          createParagraph("Al cerrar un ticket se debe indicar si hubo factura asociada:"),
          createBullet("Con factura: Ingresar numero, monto y documento"),
          createBullet("Sin factura: Indicar motivo (ej: solo fue gestion)"),
          createBullet("Factura pendiente: El proveedor enviara despues"),

          createHeading2("3.4 Edificios y Equipos Criticos"),
          createParagraph("Cada edificio tiene asociado:"),
          createBullet("Informacion de contacto y ubicacion"),
          createBullet("Ejecutivo asignado"),
          createBullet("Equipos criticos con fechas de mantencion"),
          createBullet("Carpeta de documentos"),

          new Paragraph({ children: [new PageBreak()] }),

          createHeading1("4. Reportes Disponibles"),
          createTable(
            ["Reporte", "Descripcion", "Roles con Acceso"],
            [
              ["Informe de Visitas", "Resumen de visitas realizadas", "Gerentes"],
              ["Informe de Tickets", "Estado y resolucion de tickets", "Gerentes"],
              ["Informe Financiero", "Analisis de costos", "Gerente General, Comercial"],
              ["Informe de Equipos", "Estado de equipos criticos", "Gerentes"],
              ["Informe de Ejecutivos", "Desempeno de ejecutivos", "Gerentes"],
              ["Informe de Egresos", "Formato Edipro", "Gerente General, Comercial"],
              ["Cumplimiento Normativo", "Scoring de edificios", "Todos"],
            ]
          ),

          createHeading1("5. Cumplimiento Normativo"),
          createParagraph("El sistema calcula un puntaje de cumplimiento (0-100%) basado en:"),
          createBullet("Reglamento de copropiedad cargado (25%)"),
          createBullet("Equipos sin mantenciones vencidas (25%)"),
          createBullet("Minimo 4 visitas en ultimos 30 dias (25%)"),
          createBullet("Sin tickets urgentes pendientes (25%)"),

          new Paragraph({ children: [new PageBreak()] }),

          createHeading1("6. Notificaciones"),
          createParagraph("El sistema envia notificaciones internas para:"),
          createBullet("Tickets asignados o derivados"),
          createBullet("Visitas programadas"),
          createBullet("Cambios de estado en tickets"),
          createBullet("Alertas de mantencion vencida"),

          createHeading1("7. Soporte"),
          createParagraph("Para soporte tecnico o consultas sobre el sistema, contacte al administrador del sistema."),
        ],
      },
    ],
  });
}

function generateAdminGuide(): Document {
  return new Document({
    sections: [
      {
        children: [
          createTitle("BUMA OPS"),
          new Paragraph({
            children: [
              new TextRun({
                text: "Guia de Administracion",
                size: 36,
                color: "666666",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),
          new Paragraph({ children: [new PageBreak()] }),

          createHeading1("1. Panel Super Admin"),
          createParagraph("El panel de Super Admin permite configurar aspectos globales del sistema."),

          createHeading2("1.1 Configuracion de Branding"),
          createBullet("Logo de la empresa: Subir imagen PNG o JPG"),
          createBullet("Nombre de la empresa: Texto que aparece en el sistema"),
          createBullet("Color primario: Color corporativo para la interfaz"),

          createHeading2("1.2 Gestion de Usuarios (Super Admin)"),
          createParagraph("Desde el panel Super Admin se pueden crear usuarios iniciales:"),
          createBullet("Email del usuario"),
          createBullet("Nombre y apellido"),
          createBullet("Rol asignado"),
          createBullet("Nota de acceso (referencia interna)"),
          createParagraph("Nota: Los usuarios inician sesion con su cuenta de Replit."),

          createHeading1("2. Administracion de Usuarios"),
          createParagraph("El Gerente General tiene acceso completo a la administracion de usuarios."),

          createHeading2("2.1 Crear Usuario"),
          createBullet("Ir a Administracion > Usuarios"),
          createBullet("Clic en Nuevo Usuario"),
          createBullet("Completar formulario con datos del usuario"),
          createBullet("Asignar rol apropiado"),
          createBullet("Para ejecutivos, asignar edificios"),

          createHeading2("2.2 Editar Usuario"),
          createBullet("Buscar usuario en la lista"),
          createBullet("Clic en icono de edicion"),
          createBullet("Modificar campos necesarios"),
          createBullet("Guardar cambios"),

          createHeading2("2.3 Desactivar Usuario"),
          createBullet("No se eliminan usuarios, solo se desactivan"),
          createBullet("Usuario desactivado no puede iniciar sesion"),
          createBullet("Se mantiene historial de acciones"),

          createHeading2("2.4 Asignar Edificios"),
          createBullet("Solo aplica a ejecutivos de operaciones"),
          createBullet("Clic en icono de edificios"),
          createBullet("Seleccionar edificios asignados"),
          createBullet("El ejecutivo solo ve sus edificios asignados"),

          new Paragraph({ children: [new PageBreak()] }),

          createHeading1("3. Gestion de Edificios"),

          createHeading2("3.1 Crear Edificio"),
          createBullet("Ir a Gestion > Edificios"),
          createBullet("Clic en Nuevo Edificio"),
          createBullet("Completar informacion basica"),
          createBullet("Asignar ejecutivo responsable"),

          createHeading2("3.2 Informacion del Edificio"),
          createBullet("Nombre y direccion"),
          createBullet("Region y comuna"),
          createBullet("Telefono de contacto"),
          createBullet("Email de la comunidad"),
          createBullet("Conteo de departamentos, ascensores, portones, extintores"),

          createHeading2("3.3 Documentos del Edificio"),
          createBullet("Reglamento de copropiedad"),
          createBullet("Otros documentos relevantes"),
          createBullet("Los documentos se almacenan en Object Storage"),

          createHeading1("4. Equipos Criticos"),
          createParagraph("Los equipos criticos son instalaciones que requieren mantencion periodica."),

          createHeading2("4.1 Registro de Equipos"),
          createBullet("Tipo de equipo (ascensor, bomba, grupo electrogeno, etc.)"),
          createBullet("Marca y modelo"),
          createBullet("Fecha de instalacion"),
          createBullet("Frecuencia de mantencion (meses)"),
          createBullet("Fecha de ultima mantencion"),

          createHeading2("4.2 Alertas de Mantencion"),
          createBullet("El sistema calcula automaticamente la proxima mantencion"),
          createBullet("Equipos vencidos aparecen en rojo"),
          createBullet("Afecta el score de cumplimiento normativo"),

          new Paragraph({ children: [new PageBreak()] }),

          createHeading1("5. Mantenedores"),
          createParagraph("Los mantenedores son empresas o personas que realizan servicios."),
          createBullet("Nombre de la empresa o persona"),
          createBullet("Tipo de servicio (ascensores, jardineria, etc.)"),
          createBullet("Telefono y email de contacto"),
          createBullet("Se pueden asociar a tickets"),

          createHeading1("6. Respaldos y Recuperacion"),
          createParagraph("El sistema cuenta con:"),
          createBullet("Base de datos PostgreSQL con respaldos automaticos"),
          createBullet("Checkpoints de codigo para rollback"),
          createBullet("Object Storage para archivos y documentos"),
          createParagraph("Para recuperar datos, contacte al administrador tecnico."),
        ],
      },
    ],
  });
}

function generateTechnicalDoc(): Document {
  return new Document({
    sections: [
      {
        children: [
          createTitle("BUMA OPS"),
          new Paragraph({
            children: [
              new TextRun({
                text: "Documentacion Tecnica",
                size: 36,
                color: "666666",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),
          new Paragraph({ children: [new PageBreak()] }),

          createHeading1("1. Arquitectura del Sistema"),

          createHeading2("1.1 Stack Tecnologico"),
          createTable(
            ["Componente", "Tecnologia"],
            [
              ["Frontend", "React + TypeScript + Tailwind CSS + Shadcn UI"],
              ["Backend", "Express + Node.js"],
              ["Base de Datos", "PostgreSQL (Neon) con Drizzle ORM"],
              ["Autenticacion", "Replit Auth (OpenID Connect)"],
              ["Almacenamiento", "Replit Object Storage"],
            ]
          ),

          createHeading2("1.2 Estructura del Proyecto"),
          createParagraph("client/ - Frontend React"),
          createBullet("src/components/ - Componentes reutilizables"),
          createBullet("src/pages/ - Paginas de la aplicacion"),
          createBullet("src/hooks/ - Custom hooks"),
          createBullet("src/lib/ - Utilidades"),
          createParagraph("server/ - Backend Express"),
          createBullet("routes.ts - API endpoints"),
          createBullet("storage.ts - Capa de acceso a datos"),
          createBullet("db.ts - Conexion a base de datos"),
          createParagraph("shared/ - Codigo compartido"),
          createBullet("schema.ts - Modelos y tipos TypeScript"),

          new Paragraph({ children: [new PageBreak()] }),

          createHeading1("2. Modelo de Datos"),

          createHeading2("2.1 Tablas Principales"),
          createTable(
            ["Tabla", "Descripcion"],
            [
              ["users", "Usuarios del sistema"],
              ["user_profiles", "Perfiles y roles de usuarios"],
              ["buildings", "Edificios administrados"],
              ["visits", "Visitas a terreno"],
              ["tickets", "Tickets operativos"],
              ["critical_assets", "Equipos criticos"],
              ["maintainers", "Proveedores de servicios"],
              ["notifications", "Notificaciones internas"],
              ["ticket_history", "Historial de cambios en tickets"],
              ["visit_photos", "Fotos de visitas"],
              ["system_config", "Configuracion del sistema"],
            ]
          ),

          createHeading2("2.2 Relaciones"),
          createBullet("Un edificio tiene muchas visitas"),
          createBullet("Un edificio tiene muchos tickets"),
          createBullet("Un edificio tiene muchos equipos criticos"),
          createBullet("Un usuario tiene un perfil"),
          createBullet("Un ejecutivo puede tener muchos edificios asignados"),
          createBullet("Un ticket tiene historial de cambios"),
          createBullet("Una visita puede generar tickets"),

          new Paragraph({ children: [new PageBreak()] }),

          createHeading1("3. APIs Principales"),

          createHeading2("3.1 Autenticacion"),
          createTable(
            ["Endpoint", "Metodo", "Descripcion"],
            [
              ["/api/auth/user", "GET", "Obtener usuario actual"],
              ["/api/user/profile", "GET", "Obtener perfil del usuario"],
              ["/api/logout", "GET", "Cerrar sesion"],
            ]
          ),

          createHeading2("3.2 Visitas"),
          createTable(
            ["Endpoint", "Metodo", "Descripcion"],
            [
              ["/api/visits", "GET", "Listar visitas"],
              ["/api/visits", "POST", "Crear visita"],
              ["/api/visits/:id", "GET", "Detalle de visita"],
              ["/api/visits/:id", "PATCH", "Actualizar visita"],
              ["/api/visits/:id/start", "POST", "Iniciar visita"],
              ["/api/visits/:id/complete", "POST", "Completar visita"],
            ]
          ),

          createHeading2("3.3 Tickets"),
          createTable(
            ["Endpoint", "Metodo", "Descripcion"],
            [
              ["/api/tickets", "GET", "Listar tickets"],
              ["/api/tickets", "POST", "Crear ticket"],
              ["/api/tickets/:id", "GET", "Detalle de ticket"],
              ["/api/tickets/:id", "PATCH", "Actualizar ticket"],
              ["/api/tickets/:id/close", "POST", "Cerrar ticket"],
              ["/api/tickets/:id/delegate", "POST", "Derivar ticket"],
            ]
          ),

          createHeading2("3.4 Edificios"),
          createTable(
            ["Endpoint", "Metodo", "Descripcion"],
            [
              ["/api/buildings", "GET", "Listar edificios"],
              ["/api/buildings", "POST", "Crear edificio"],
              ["/api/buildings/:id", "GET", "Detalle de edificio"],
              ["/api/buildings/:id", "PATCH", "Actualizar edificio"],
            ]
          ),

          new Paragraph({ children: [new PageBreak()] }),

          createHeading1("4. Variables de Entorno"),
          createTable(
            ["Variable", "Descripcion"],
            [
              ["DATABASE_URL", "URL de conexion a PostgreSQL"],
              ["SESSION_SECRET", "Secreto para sesiones"],
              ["REPL_ID", "ID del repl (auto-configurado)"],
              ["DEFAULT_OBJECT_STORAGE_BUCKET_ID", "ID del bucket de almacenamiento"],
            ]
          ),

          createHeading1("5. Comandos de Desarrollo"),
          createTable(
            ["Comando", "Descripcion"],
            [
              ["npm run dev", "Iniciar servidor de desarrollo"],
              ["npm run db:push", "Sincronizar esquema de base de datos"],
              ["npm run db:studio", "Abrir Drizzle Studio"],
            ]
          ),

          createHeading1("6. Seguridad"),
          createBullet("Autenticacion via Replit Auth (OpenID Connect)"),
          createBullet("Sesiones seguras con cookies httpOnly"),
          createBullet("Validacion de roles en cada endpoint"),
          createBullet("Secretos almacenados en variables de entorno"),
          createBullet("HTTPS obligatorio en produccion"),
        ],
      },
    ],
  });
}

async function main() {
  const docsDir = "./docs";
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  console.log("Generando documentacion...");

  const userManual = generateUserManual();
  const userManualBuffer = await Packer.toBuffer(userManual);
  fs.writeFileSync(`${docsDir}/Manual_Usuario_BUMA_OPS.docx`, userManualBuffer);
  console.log("✓ Manual de Usuario generado");

  const adminGuide = generateAdminGuide();
  const adminGuideBuffer = await Packer.toBuffer(adminGuide);
  fs.writeFileSync(`${docsDir}/Guia_Administracion_BUMA_OPS.docx`, adminGuideBuffer);
  console.log("✓ Guia de Administracion generada");

  const technicalDoc = generateTechnicalDoc();
  const technicalDocBuffer = await Packer.toBuffer(technicalDoc);
  fs.writeFileSync(`${docsDir}/Documentacion_Tecnica_BUMA_OPS.docx`, technicalDocBuffer);
  console.log("✓ Documentacion Tecnica generada");

  console.log("\n¡Documentacion generada exitosamente en la carpeta 'docs'!");
}

main().catch(console.error);
